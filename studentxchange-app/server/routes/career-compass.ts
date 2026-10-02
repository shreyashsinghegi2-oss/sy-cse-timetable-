import { Router, Request, Response, NextFunction } from "express";
import Anthropic from "@anthropic-ai/sdk";
import { getFirebaseAdmin, admin } from "../firebase-admin";
import { CAREER_COMPASS_PREMIUM_ACCESS_EMAILS, PLATFORM_ADMIN_EMAIL } from "../config/constants";
import { generateHash, verifyReverseHash, verifyPaymentWithPayU } from "../payu";
import { aiGate, refundQuota, releaseConcurrencySlot, recordAISuccess, recordAIFailure, withAITimeout, AI_TIMEOUT_MS } from "../utils/ai-guard";
import { ClaudeResponseError, isClaudeResponseError, parseClaudeJson } from "../utils/ai-response";
import { rateLimitMiddleware } from "../middleware/rate-limiter";
import { CAREER_TAXONOMY_VERSION, buildCareerSelectionContext, findCareerGoal } from "../../shared/career-data";
import {
  careerAiEngine, createCareerAiContext, publishedInstitutionalRoadmap,
  cachedCareerRoadmap, generateCareerHybrid, persistStudentRoadmap, recordCareerCacheHit,
} from "../utils/career-ai-flow";
import { putCachedRoadmap, getAiUsageSummary, recordAiUsage } from "../utils/career-ai-store";
import { CAREER_COMPASS_PREMIUM_PRICE as PREMIUM_PRICE, getCareerCompassPricing } from "../config/career-compass-pricing";
import {
  CAREER_PAYMENTS_COLLECTION as PAYMENTS_COLLECTION,
  CAREER_SUBSCRIPTIONS_COLLECTION as SUBSCRIPTIONS_COLLECTION,
  createCareerPremiumPayUForm, settleCareerPremiumPayment, recordCareerPremiumFailure,
} from "../utils/career-compass-payment";

const router = Router();
const ADMIN_EMAIL = PLATFORM_ADMIN_EMAIL;

// ─── Career Compass Premium subscription ─────────────────────────────────────

type SubscriptionStatus = {
  isPremium: boolean;
  isAdmin: boolean;
  subscriptionType: "FREE" | "PREMIUM";
  paymentStatus: string;
  expiryDate: string | null;
  purchaseDate: string | null;
  expired: boolean; // true only when a previously-active premium just lapsed
};

function tsToIso(v: any): string | null {
  if (!v) return null;
  if (typeof v?.toDate === "function") return v.toDate().toISOString();
  if (v instanceof Date) return v.toISOString();
  if (typeof v === "string") return v;
  return null;
}

// Authoritative subscription state. Admin always premium. Handles expiry:
// when an active PREMIUM has passed its expiry, it is reverted to FREE in
// Firestore and flagged `expired` so the client can re-show the plan popup.
export async function getSubscriptionStatus(uid: string, email?: string | null): Promise<SubscriptionStatus> {
  const isAdmin = !!email && email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
  if (isAdmin) {
    return {
      isPremium: true, isAdmin: true, subscriptionType: "PREMIUM",
      paymentStatus: "admin", expiryDate: null, purchaseDate: null, expired: false,
    };
  }
  const hasGrantedAccess = !!email && CAREER_COMPASS_PREMIUM_ACCESS_EMAILS
    .some((allowedEmail) => allowedEmail.toLowerCase() === email.toLowerCase());
  if (hasGrantedAccess) {
    return {
      isPremium: true, isAdmin: false, subscriptionType: "PREMIUM",
      paymentStatus: "granted", expiryDate: null, purchaseDate: null, expired: false,
    };
  }
  const free: SubscriptionStatus = {
    isPremium: false, isAdmin: false, subscriptionType: "FREE",
    paymentStatus: "none", expiryDate: null, purchaseDate: null, expired: false,
  };
  if (!getFirebaseAdmin()) return free;

  const ref = admin.firestore().collection(SUBSCRIPTIONS_COLLECTION).doc(uid);
  const snap = await ref.get();
  if (!snap.exists) return free;

  const data = snap.data() || {};
  const expiryIso = tsToIso(data.expiryDate);
  const isActive = data.isPremium === true
    && data.subscriptionType === "PREMIUM"
    && !!expiryIso
    && new Date(expiryIso).getTime() > Date.now();

  if (isActive) {
    return {
      isPremium: true, isAdmin: false, subscriptionType: "PREMIUM",
      paymentStatus: data.paymentStatus || "success",
      expiryDate: expiryIso, purchaseDate: tsToIso(data.purchaseDate), expired: false,
    };
  }

  // Was premium but now lapsed → revert to FREE and flag expiry once.
  const wasPremium = data.subscriptionType === "PREMIUM" && data.isPremium === true;
  if (wasPremium) {
    await ref.set({
      subscriptionType: "FREE",
      isPremium: false,
      paymentStatus: "expired",
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true }).catch(() => {});
    return { ...free, paymentStatus: "expired", expiryDate: expiryIso, expired: true };
  }
  return free;
}

// Middleware: only admins or active-premium students may pass.
export async function requireCareerPremium(req: Request, res: Response, next: NextFunction) {
  const user = await verifyUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });
  try {
    const status = await getSubscriptionStatus(user.uid, user.email);
    if (!status.isPremium) {
      return res.status(403).json({ error: "premium_required", message: "Career Compass Premium subscription required." });
    }
    (req as any).careerUser = user;
    next();
  } catch (err: any) {
    console.error("[CAREER COMPASS] premium check:", err?.message);
    return res.status(500).json({ error: "Subscription check failed" });
  }
}

// Public, non-sensitive plan configuration. Checkout and UI use this same price.
router.get("/api/career-compass/pricing", (_req: Request, res: Response) => {
  res.set("Cache-Control", "no-store");
  res.json(getCareerCompassPricing());
});

// GET current subscription status (authoritative, client-safe)
router.get("/api/career-compass/subscription", async (req: Request, res: Response) => {
  try {
    const user = await verifyUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    const status = await getSubscriptionStatus(user.uid, user.email);
    res.json(status);
  } catch (err: any) {
    console.error("[CAREER COMPASS] subscription status:", err?.message);
    res.status(500).json({ error: "Failed to load subscription" });
  }
});

// Initiate PayU payment using the authoritative current annual-plan price.
router.post("/api/career-compass/subscription/initiate", async (req: Request, res: Response) => {
  try {
    const user = await verifyUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const { PAYU_MERCHANT_KEY, PAYU_SALT, PAYU_BASE_URL } = process.env;
    if (!PAYU_MERCHANT_KEY || !PAYU_SALT || !PAYU_BASE_URL) {
      return res.status(500).json({ error: "Payment gateway not configured." });
    }
    if (!getFirebaseAdmin()) {
      return res.status(503).json({ error: "Storage temporarily unavailable. Please try again." });
    }

    // Admins never need to pay.
    const status = await getSubscriptionStatus(user.uid, user.email);
    if (status.isPremium) {
      return res.status(400).json({ error: "already_premium", message: "You already have Premium access." });
    }

    const email = (user.email || "").trim();
    if (!email) return res.status(400).json({ error: "Your account has no email on file." });
    const firstname = ((req.body?.firstname as string) || email.split("@")[0] || "Student").slice(0, 60);
    const phone = ((req.body?.phone as string) || "").slice(0, 15);
    const returnTrack = (req.body?.returnTrack as string) === "institutional" ? "institutional" : "personal";
    const txnid = `ccsub_${Date.now()}_${user.uid.slice(0, 8)}`;
    const protocol = (req.headers["x-forwarded-proto"] as string) || req.protocol || "https";
    const host = req.get("host");
    const baseUrl = host ? `${protocol}://${host}` : "https://localhost:5000";
    const formData = createCareerPremiumPayUForm({
      key: PAYU_MERCHANT_KEY, salt: PAYU_SALT, txnid, firstname, email, phone, callbackBaseUrl: baseUrl,
    }, generateHash);

    // Persist a pending payment lookup (txnid -> uid) and a pending subscription.
    const db = admin.firestore();
    await db.collection(PAYMENTS_COLLECTION).doc(txnid).set({
      txnid, uid: user.uid, email, amount: formData.amount,
      returnTrack,
      status: "initiated",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    await db.collection(SUBSCRIPTIONS_COLLECTION).doc(user.uid).set({
      uid: user.uid, email,
      pendingTxnid: txnid,
      paymentGateway: "PayU",
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    // ── Structured log for monitoring ──────────────────────────────────────
    console.log(`[CC PAY] INITIATED ${new Date().toISOString()} txnid=${txnid} amount=${PREMIUM_PRICE}`);
    res.json({ success: true, formData, payuBaseUrl: PAYU_BASE_URL, txnid });
  } catch (err: any) {
    console.error("[CAREER COMPASS] subscription initiate:", err?.message);
    res.status(500).json({ error: "Failed to start payment" });
  }
});

// PayU success callback (surl). PayU POSTs form-encoded data here — no user
// session/token is present, so the user is resolved via txnid. We re-verify the
// reverse hash and the amount before granting premium.
router.post("/api/career-compass/subscription/payu-callback", async (req: Request, res: Response) => {
  const redirect = (q: string) => res.redirect(`/lancing/career-compass?premium=${q}`);
  try {
    const { PAYU_MERCHANT_KEY, PAYU_SALT } = process.env;
    const { txnid, mihpayid, status, hash, amount, productinfo, firstname, email, additionalCharges } = req.body || {};

    if (!PAYU_SALT || !PAYU_MERCHANT_KEY) return redirect("failed");
    if (!txnid || !hash) return redirect("failed");

    let verifiedAmount = String(amount);
    let verifiedMihpayid = mihpayid;

    const valid = verifyReverseHash(
      PAYU_SALT, status, email, firstname, productinfo, amount, txnid, PAYU_MERCHANT_KEY, additionalCharges || "", hash,
    );
    if (valid) {
      if (String(status).toLowerCase() !== "success") return redirect("failed");
    } else {
      // Reverse hash mismatched (PayU hash formats vary with udf/additionalCharges).
      // Fall back to the authoritative server-to-server verify_payment API — this
      // asks PayU directly whether the txnid succeeded, so a forged callback
      // cannot pass it.
      console.error("[CAREER COMPASS] PayU reverse-hash FAILED for txnid:", txnid, "— falling back to verify_payment API");
      const apiCheck = await verifyPaymentWithPayU(String(txnid));
      if (!apiCheck.verified) {
        console.error("[CAREER COMPASS] verify_payment API also did not confirm txnid:", txnid, "status:", apiCheck.status);
        return redirect("failed");
      }
      console.log("[CAREER COMPASS] verify_payment API CONFIRMED txnid:", txnid);
      // If the callback hash failed, only PayU's verified amount is trustworthy.
      verifiedAmount = String(apiCheck.amount ?? "");
      verifiedMihpayid = apiCheck.mihpayid || mihpayid;
    }

    if (!getFirebaseAdmin()) return redirect("failed");
    const db = admin.firestore();

    // Idempotent, one-time settlement. A PayU callback payload must only grant
    // premium once: we transition the payment doc initiated/pending -> success
    // inside a transaction. Replaying a settled txnid performs no writes, so
    // a valid callback cannot be reused to extend premium for free.
    const settlement = await settleCareerPremiumPayment(db, {
      txnid: String(txnid), verifiedAmount, mihpayid: verifiedMihpayid,
    }, {
      timestamp: (date) => admin.firestore.Timestamp.fromDate(date),
      serverTimestamp: () => admin.firestore.FieldValue.serverTimestamp(),
      deleteField: () => admin.firestore.FieldValue.delete(),
    });

    if (!settlement.ok) {
      console.error("[CAREER COMPASS] PayU callback rejected for txnid:", txnid, settlement.reason);
      return redirect("failed");
    }

    // settlement.ok is guaranteed true here (early return above when false)
    const outcome = (settlement as any).alreadySettled ? "already_settled" : "success";
    console.log(`[CC PAY] CALLBACK ${new Date().toISOString()} txnid=${txnid} outcome=${outcome} uid=${(settlement as any).uid ?? "n/a"}`);
    // Restore the track the user came from so they land back on the right view
    const settledTrack = (settlement as any).returnTrack || "personal";
    const successUrl = `/lancing/career-compass?premium=success${settledTrack === "institutional" ? "&t=institutional" : ""}`;
    return res.redirect(successUrl);
  } catch (err: any) {
    console.error("[CAREER COMPASS] PayU callback:", err?.message);
    return redirect("failed");
  }
});

// PayU failure callback (furl).
router.post("/api/career-compass/subscription/payu-failure", async (req: Request, res: Response) => {
  try {
    const { txnid } = req.body || {};
    if (txnid && getFirebaseAdmin()) {
      await recordCareerPremiumFailure(
        admin.firestore(), txnid, () => admin.firestore.FieldValue.serverTimestamp(),
      );
    }
  } catch { /* ignore */ }
  res.redirect("/lancing/career-compass?premium=failed");
});

// ─── Compact prompt with structural output limits ─────────────────────────────
// The token budget is intentionally larger than the prompt's target size: a
// complete 4-year roadmap needs headroom, while the structural caps prevent
// Claude from expanding the response until it hits max_tokens.
export const ROADMAP_MAX_OUTPUT_TOKENS = 5000;
export const COMPRESSED_SYSTEM_PROMPT = `You are a career roadmap AI for Indian university students. Given degree, year, and career goals, generate a concise year-by-year roadmap. Be specific to Indian job market.
Return JSON only (no markdown, no code fences): { "years": [{ "year_number": 1, "label": "Year 1 — Foundation", "semester_label": "Sem 1 & 2", "skills": [{ "name": string, "priority": "high"|"medium"|"low", "category": "technical"|"soft"|"domain"|"tools", "by_when": string, "estimated_hours": number, "credit_points": 2|3|4, "why_it_matters": string, "learning_resources": [{ "type": "NPTEL"|"YouTube"|"Platform"|"Coursera"|"Udemy", "title": string, "url": string, "duration": string, "credit_eligible": boolean, "free": boolean }] }], "targets": [string], "studentlancing_fit": { "type": "Micro Task"|"Internship"|"Job"|"Sure Shot Jobs", "description": string } }], "overall_summary": string, "top_3_immediate_actions": [string] }
Rules: generate exactly 3 skills per year and exactly 2 resources per skill. Keep each skill name <= 8 words, why_it_matters <= 15 words, each resource title <= 10 words, resource duration <= 6 words, each target <= 10 words, each fit description <= 20 words, overall_summary <= 40 words, and each immediate action <= 10 words. Generate only the years needed for the degree. Prefer Indian platforms (NPTEL, Internshala, Unstop). Include at least 1 NPTEL or credit-eligible resource per year. Use real, working URLs.`;

// ─── In-memory roadmap cache (common degree+aspiration combos) ────────────────
const ROADMAP_CACHE = new Map<string, { roadmap: any; cachedAt: number }>();
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function roadmapCacheKey(
  degree: string,
  aspirations: string[],
  year = "",
  commitment = "",
  hours = "",
  university = "",
): string {
  const aspirationKeys = aspirations
    .map((value) => findCareerGoal(value)?.id || value.toLowerCase().trim())
    .sort()
    .join(",");
  return [
    CAREER_TAXONOMY_VERSION,
    degree,
    aspirationKeys,
    year,
    commitment,
    hours,
    university,
  ].map(value => value.toLowerCase().trim()).join("_");
}

// ─── Module-level JSON extractor (shared between endpoints) ───────────────────
export function extractJson(src: string): string | null {
  const start = src.indexOf("{");
  if (start === -1) return null;
  let depth = 0, inStr = false, escape = false;
  for (let i = start; i < src.length; i++) {
    const c = src[i];
    if (escape) { escape = false; continue; }
    if (c === "\\" && inStr) { escape = true; continue; }
    if (c === '"') { inStr = !inStr; continue; }
    if (inStr) continue;
    if (c === "{") depth++;
    else if (c === "}") { depth--; if (depth === 0) return src.slice(start, i + 1); }
  }
  return src.slice(start);
}

let _client: Anthropic | null = null;
export function getClient(): Anthropic {
  if (!_client) {
    if (!process.env.CLAUDE_API_KEY && !process.env.ANTHROPIC_API_KEY) throw new Error("Claude API key not set");
    _client = new Anthropic({ apiKey: process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY });
  }
  return _client;
}

export async function verifyUser(req: Request): Promise<{ uid: string; email?: string } | null> {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) return null;
  try {
    if (!getFirebaseAdmin()) return null;
    const decoded = await admin.auth().verifyIdToken(auth.replace("Bearer ", ""));
    return { uid: decoded.uid, email: decoded.email };
  } catch {
    return null;
  }
}

const SYSTEM_PROMPT = `You are an AI Academic Advisor for Indian university students.
Given a student's degree, year of study, career aspirations, and commitment level,
generate a SEMESTER-WISE, prioritised career roadmap with concrete learning resources
and credit weights — for self-paced study (NO testing, NO MCQs).

Return ONLY valid JSON in this exact schema (no markdown, no backticks):
{
  "years": [
    {
      "year_number": 1,
      "label": "Year 1 — Foundation",
      "semester_label": "Semester 1 & 2",
      "skills": [
        {
          "name": "Python for Data Science",
          "priority": "high",
          "category": "technical",
          "by_when": "End of Sem 2",
          "estimated_hours": 40,
          "credit_points": 3,
          "why_it_matters": "Core language for every data role; most placement tests assume working Python.",
          "learning_resources": [
            {
              "type": "NPTEL",
              "title": "Programming in Python — IIT Madras",
              "url": "https://nptel.ac.in/courses/106/106/106106182/",
              "duration": "12 weeks",
              "credit_eligible": true,
              "free": true
            },
            {
              "type": "YouTube",
              "title": "Python Full Course — freeCodeCamp",
              "url": "https://www.youtube.com/watch?v=rfscVS0vtbw",
              "duration": "4 hours",
              "free": true
            },
            {
              "type": "Platform",
              "title": "Kaggle Python Course",
              "url": "https://www.kaggle.com/learn/python",
              "duration": "5 hours",
              "free": true
            }
          ]
        }
      ],
      "targets": ["Complete 1 personal project on GitHub", "Earn first ₹500 from a micro task"],
      "studentlancing_fit": { "type": "Micro Task", "description": "Start with beginner design/writing micro tasks to earn while learning" }
    }
  ],
  "overall_summary": "Two-sentence summary of the roadmap.",
  "top_3_immediate_actions": ["Action 1", "Action 2", "Action 3"]
}

Rules:
- Be specific to Indian education system; use INR; prefer Indian platforms (NPTEL, Internshala, Unstop, Coursera India).
- Each year MUST have a semester_label (e.g. "Semester 5 & 6", "Semester 1 & 2"). For PG, "PG Sem 1 & 2".
- Each year: 4-6 skills. Each skill MUST include estimated_hours (10-80), credit_points (2-4), priority (high|medium|low), category (technical|soft|domain|tools), and 2-4 learning_resources.
- Every skill MUST have at least one NPTEL or other credit_eligible:true resource so the student can earn academic credits.
- Each learning_resource: type ∈ {NPTEL, YouTube, Platform, Coursera, Udemy, Book}, real title, real working URL, duration, free (boolean), credit_eligible (boolean — only true for NPTEL/SWAYAM/UGC-approved courses).
- 2-3 targets per year, 1 studentlancing_fit per year.
- studentlancing_fit.type ∈ {Micro Task, Internship, Job, Sure Shot Jobs, AI Match}.
- Generate years from Year 1 through the final year of the degree (B.Tech = 4 years, MBA = 2 years, etc.). For PG students, start from PG Year 1.
- Higher-priority skills first within each year. Tie credit_points to skill weight (foundational = 2, applied = 3, advanced/specialisation = 4).
- DO NOT generate any test/MCQ content. The student self-marks completion; credits are validated later by the COE office.`;

// ─── URL & schema sanitisation ───────────────────────────────────────────────
// AI-generated URLs are untrusted — strip anything that isn't http(s).
function safeUrl(raw: any): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    const u = new URL(trimmed);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u.toString();
  } catch {
    return null;
  }
}

function asString(v: any, max = 500): string {
  return typeof v === "string" ? v.slice(0, max) : "";
}

/**
 * Keeps the model grounded in the canonical taxonomy without sending the
 * complete (and very large) taxonomy on every request.
 */
function careerTaxonomyContext(aspirations: unknown[]): string {
  return JSON.stringify(buildCareerSelectionContext(aspirations));
}

export function sanitizeRoadmap(r: any): any {
  if (!r || typeof r !== "object") return { years: [], overall_summary: "", top_3_immediate_actions: [] };
  const years = Array.isArray(r.years) ? r.years.map((yr: any) => {
    const skills = Array.isArray(yr?.skills) ? yr.skills.map((s: any) => {
      const resources = Array.isArray(s?.learning_resources)
        ? s.learning_resources
            .map((res: any) => {
              const url = safeUrl(res?.url);
              if (!url) return null;
              return {
                type: asString(res?.type, 30) || "Platform",
                title: asString(res?.title, 200),
                url,
                duration: asString(res?.duration, 50),
                credit_eligible: !!res?.credit_eligible,
                free: !!res?.free,
              };
            })
            .filter(Boolean)
        : [];
      return {
        name: asString(s?.name, 120),
        priority: ["high", "medium", "low"].includes(s?.priority) ? s.priority : "medium",
        category: ["technical", "soft", "domain", "tools"].includes(s?.category) ? s.category : "technical",
        by_when: asString(s?.by_when, 80),
        estimated_hours: typeof s?.estimated_hours === "number" ? Math.max(0, Math.min(500, s.estimated_hours)) : undefined,
        credit_points: typeof s?.credit_points === "number" ? Math.max(1, Math.min(6, s.credit_points)) : 2,
        why_it_matters: asString(s?.why_it_matters, 300),
        learning_resources: resources,
      };
    }) : [];
    const courses = Array.isArray(yr?.courses) ? yr.courses
      .map((c: any) => {
        const url = safeUrl(c?.url);
        if (!url) return null;
        return { name: asString(c?.name, 200), platform: asString(c?.platform, 80), url, free: !!c?.free };
      })
      .filter(Boolean) : undefined;
    const fitType = asString(yr?.studentlancing_fit?.type, 30) || "Internship";
    return {
      year_number: typeof yr?.year_number === "number" ? yr.year_number : 1,
      label: asString(yr?.label, 120),
      semester_label: asString(yr?.semester_label, 80) || undefined,
      skills,
      courses,
      targets: Array.isArray(yr?.targets) ? yr.targets.slice(0, 10).map((t: any) => asString(t, 200)).filter(Boolean) : [],
      studentlancing_fit: {
        type: fitType,
        description: asString(yr?.studentlancing_fit?.description, 300),
      },
    };
  }) : [];
  // ─── career_map ───────────────────────────────────────────────────────────
  let career_map: any = undefined;
  if (r?.career_map && typeof r.career_map === "object") {
    const cm = r.career_map;
    const sanitizeMilestones = (arr: any) =>
      Array.isArray(arr)
        ? arr.slice(0, 6).map((m: any) => ({
            milestone: asString(m?.milestone, 200),
            why_it_matters: asString(m?.why_it_matters, 200),
          })).filter(m => m.milestone)
        : [];
    career_map = {
      primary_path: asString(cm?.primary_path, 300),
      alternate_paths: Array.isArray(cm?.alternate_paths) ? cm.alternate_paths.slice(0, 4).map((p: any) => asString(p, 150)).filter(Boolean) : [],
      next_12_months: sanitizeMilestones(cm?.next_12_months),
      next_24_months: sanitizeMilestones(cm?.next_24_months),
      skill_gaps: Array.isArray(cm?.skill_gaps) ? cm.skill_gaps.slice(0, 8).map((s: any) => asString(s, 150)).filter(Boolean) : [],
      recommended_certifications: Array.isArray(cm?.recommended_certifications) ? cm.recommended_certifications.slice(0, 6).map((c: any) => asString(c, 150)).filter(Boolean) : [],
      education_guidance: Array.isArray(cm?.education_guidance) ? cm.education_guidance.slice(0, 4).map((v: any) => asString(v, 160)).filter(Boolean) : [],
      recommended_tools: Array.isArray(cm?.recommended_tools) ? cm.recommended_tools.slice(0, 6).map((v: any) => asString(v, 100)).filter(Boolean) : [],
      internship_targets: Array.isArray(cm?.internship_targets) ? cm.internship_targets.slice(0, 4).map((v: any) => asString(v, 160)).filter(Boolean) : [],
      role_progression: cm?.role_progression && typeof cm.role_progression === "object" ? {
        entry_level: Array.isArray(cm.role_progression.entry_level) ? cm.role_progression.entry_level.slice(0, 3).map((v: any) => asString(v, 120)).filter(Boolean) : [],
        mid_level: Array.isArray(cm.role_progression.mid_level) ? cm.role_progression.mid_level.slice(0, 3).map((v: any) => asString(v, 120)).filter(Boolean) : [],
        senior_level: Array.isArray(cm.role_progression.senior_level) ? cm.role_progression.senior_level.slice(0, 3).map((v: any) => asString(v, 120)).filter(Boolean) : [],
      } : undefined,
      higher_studies: Array.isArray(cm?.higher_studies) ? cm.higher_studies.slice(0, 3).map((v: any) => asString(v, 160)).filter(Boolean) : [],
      entrepreneurship: Array.isArray(cm?.entrepreneurship) ? cm.entrepreneurship.slice(0, 3).map((v: any) => asString(v, 160)).filter(Boolean) : [],
      employment_guidance: asString(cm?.employment_guidance, 300),
    };
  }

  // ─── project_suggestions ──────────────────────────────────────────────────
  let project_suggestions: any[] | undefined = undefined;
  if (Array.isArray(r?.project_suggestions)) {
    project_suggestions = r.project_suggestions.slice(0, 6).map((p: any) => ({
      project_title: asString(p?.project_title, 200),
      relevance: asString(p?.relevance, 300),
      difficulty: ["Beginner", "Intermediate", "Advanced"].includes(p?.difficulty) ? p.difficulty : "Beginner",
      estimated_duration: asString(p?.estimated_duration, 60),
      tools_required: Array.isArray(p?.tools_required) ? p.tools_required.slice(0, 6).map((t: any) => asString(t, 80)).filter(Boolean) : [],
      learning_outcomes: Array.isArray(p?.learning_outcomes) ? p.learning_outcomes.slice(0, 3).map((o: any) => asString(o, 150)).filter(Boolean) : [],
      portfolio_value: asString(p?.portfolio_value, 200),
      can_be_paired_with_studentlancing: !!p?.can_be_paired_with_studentlancing,
    })).filter((p: any) => p.project_title);
  }

  // ─── track_specific_output ────────────────────────────────────────────────
  let track_specific_output: any = undefined;
  if (r?.track_specific_output && typeof r.track_specific_output === "object") {
    const tso = r.track_specific_output;
    track_specific_output = {
      personal_notes: asString(tso?.personal_notes, 600),
      timeline_flexibility: asString(tso?.timeline_flexibility, 300),
      institutional_alignment: asString(tso?.institutional_alignment, 600),
      faculty_mentor_suggestion: asString(tso?.faculty_mentor_suggestion, 300),
      cohort_potential: !!tso?.cohort_potential,
    };
  }

  return {
    years,
    overall_summary: asString(r?.overall_summary, 500),
    top_3_immediate_actions: Array.isArray(r?.top_3_immediate_actions)
      ? r.top_3_immediate_actions.slice(0, 5).map((a: any) => asString(a, 200)).filter(Boolean)
      : [],
    ...(career_map ? { career_map } : {}),
    ...(project_suggestions ? { project_suggestions } : {}),
    ...(track_specific_output ? { track_specific_output } : {}),
  };
}

export function roadmapCompletenessError(roadmap: any): string | null {
  if (!Array.isArray(roadmap?.years) || roadmap.years.length === 0) return "missing year plans";
  for (const year of roadmap.years) {
    if (!year?.label || !Array.isArray(year?.skills) || year.skills.length !== 3) {
      return `year ${year?.year_number ?? "unknown"} does not contain exactly 3 skills`;
    }
    if (!Array.isArray(year?.targets) || year.targets.length === 0) {
      return `year ${year?.year_number ?? "unknown"} has no targets`;
    }
    for (const skill of year.skills) {
      if (!skill?.name || !Array.isArray(skill?.learning_resources) || skill.learning_resources.length !== 2) {
        return `skill "${skill?.name || "unknown"}" does not contain exactly 2 valid resources`;
      }
    }
  }
  if (!roadmap?.overall_summary) return "missing overall summary";
  if (!Array.isArray(roadmap?.top_3_immediate_actions) || roadmap.top_3_immediate_actions.length !== 3) {
    return "missing immediate actions";
  }
  if (!roadmap?.career_map?.primary_path) return "missing Career Map";
  if (!Array.isArray(roadmap?.project_suggestions) || roadmap.project_suggestions.length !== 4) {
    return "missing project suggestions";
  }
  return null;
}

async function handleHybridRoadmap(
  res: Response,
  user: { uid: string; email?: string },
  input: {
    degree: string; year: string; aspirations: string[]; commitment?: string;
    hours?: string; university?: string; fieldOfInterest?: string;
    track: "personal" | "institutional"; customGoal?: boolean; step?: number;
  },
  stream: boolean,
): Promise<void> {
  const route = stream ? "/api/career-compass/stream" : "/api/career-compass/roadmap";
  let slot = false;
  let charged = false;
  let generated: any = null;
  let heartbeat: ReturnType<typeof setInterval> | null = null;
  let clientDisconnected = false;
  const operation = stream ? "stream" : "roadmap";
  const send = (event: Record<string, unknown>) => {
    if (stream && !res.writableEnded && !clientDisconnected) {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    }
  };
  try {
    const { context, key } = await createCareerAiContext(user, input);
    // Published plans are immutable student-facing content and always precede AI/cache.
    const published = await publishedInstitutionalRoadmap(context);
    // The clients intentionally support JSON responses for published/cache
    // short-circuits as well as SSE for generated plans.
    if (published) { res.json({ roadmap: published, saved: true, source: "published" }); return; }

    const cached = await cachedCareerRoadmap(key, user.uid, roadmapCompletenessError);
    if (cached) {
      let saved = false;
      let saveError: string | undefined;
      try {
        await persistStudentRoadmap(user, input, cached);
        saved = true;
      } catch {
        console.warn("[CAREER COMPASS] cached roadmap could not be restored to student storage");
        saveError = "The cached roadmap is available, but could not be saved to your account. Please retry saving it.";
      }
      void recordCareerCacheHit(route);
      res.json({ roadmap: cached, saved, source: "cache", ...(saveError ? { saveError } : {}) });
      return;
    }
    if (!process.env.GEMINI_API_KEY) {
      res.status(503).json({
        error: "gemini_not_configured",
        message: "Career Compass Gemini is not configured. Add GEMINI_API_KEY to workspace secrets or use the legacy engine.",
      });
      return;
    }

    const bypassQuota = user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();
    const gate = await aiGate(user.uid, operation, { bypassQuota });
    if (gate) { res.status(gate.status).json(gate.body); return; }
    slot = true;
    charged = !bypassQuota;
    if (stream) {
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.setHeader("X-Accel-Buffering", "no");
      res.flushHeaders();
      send({ stage: "preparing", progress: "preparing" });
      heartbeat = setInterval(() => send({ progress: "building_roadmap" }), CAREER_ROADMAP_HEARTBEAT_MS);
      res.on("close", () => { if (!res.writableEnded) clientDisconnected = true; });
    }
    const result = await generateCareerHybrid({
      user, context, key, route,
      systemPrompt: DUAL_TRACK_SYSTEM_PROMPT,
      sanitize: sanitizeRoadmap,
      validate: roadmapCompletenessError,
      extractJson,
      getClaudeClient: getClient,
      cache: false,
      onStage: (stage) => send({
        stage: stage === "claude_review" ? "reviewing"
          : ["validating", "gemini_critique", "gemini_repair"].includes(stage) ? "validating"
          : stage === "finalizing" ? "finalizing" : "generating",
        progress: stage === "claude_review" ? "reviewing"
          : ["validating", "gemini_critique", "gemini_repair"].includes(stage) ? "validating"
          : stage === "finalizing" ? "finalizing"
          : stage === "gemini_retry" ? "retrying_for_complete_roadmap"
          : "generating",
      }),
    });
    generated = result.roadmap;
    recordAISuccess();

    let saved = false;
    let saveError: string | undefined;
    try {
      await persistStudentRoadmap(user, input, generated);
      saved = true;
      try {
        await putCachedRoadmap({ key, uid: user.uid, roadmap: generated, metadata: { reviewTriggered: result.reviewed } });
      } catch {
        console.warn("[CAREER COMPASS] persistent cache write unavailable");
      }
    } catch {
      console.error("[CAREER COMPASS] generated roadmap could not be saved to student storage");
      saveError = "The roadmap was generated but could not be saved to your account. It is still available for this session; please retry saving it.";
    }
    const response = {
      roadmap: generated, saved, source: result.fallback ? "claude_fallback" : "gemini",
      ...(saveError ? { saveError } : {}),
    };
    void recordAiUsage({
      provider: result.fallback ? "claude" : "gemini", model: "roadmap",
      operation: "roadmap_completed", attempt: 0, tokens: 0, cacheTokens: 0,
      success: saved, latency: 0, reviewTriggered: result.reviewed,
      fallback: result.fallback, route,
    });
    if (stream) {
      send({ done: true, ...response });
      if (!res.writableEnded) res.end();
    } else {
      res.json(response);
    }
  } catch (err: any) {
    if (slot && !generated) {
      recordAIFailure();
      if (charged) void refundQuota(user.uid, operation);
    }
    const missing = err?.code === "GEMINI_NOT_CONFIGURED";
    const message = missing
      ? "Career Compass Gemini is not configured."
      : "Could not generate a complete Career Map. Please try again.";
    console.error("[CAREER COMPASS] hybrid generation failed:", err?.code || "application_error");
    if (stream && res.headersSent) {
      send({ error: message, code: missing ? "gemini_not_configured" : "roadmap_generation_failed" });
      if (!res.writableEnded) res.end();
    } else if (!res.headersSent) {
      res.status(503).json({ error: missing ? "gemini_not_configured" : "roadmap_generation_failed", message });
    }
  } finally {
    if (heartbeat) clearInterval(heartbeat);
    if (slot) releaseConcurrencySlot(user.uid, operation);
  }
}

router.post("/api/career-compass/roadmap", rateLimitMiddleware.sensitive, async (req: Request, res: Response) => {
  let roadmapUser: { uid: string; email?: string } | null = null;
  let roadmapSlotAcquired = false;
  let roadmapQuotaCharged = false;
  let roadmapQuotaRefunded = false;
  const refundRoadmapQuota = () => {
    if (!roadmapQuotaCharged || roadmapQuotaRefunded || !roadmapUser) return;
    roadmapQuotaRefunded = true;
    void refundQuota(roadmapUser.uid, "roadmap");
  };
  try {
    const user = await verifyUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    roadmapUser = user;
    const isAdminTester = user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();

    const { degree, year, aspirations, commitment, hours, university } = req.body || {};
    if (!degree || !year || !Array.isArray(aspirations) || aspirations.length === 0) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    if (careerAiEngine() === "hybrid" && !aspirations.some((goal: unknown) => typeof goal === "string" && goal.trim())) {
      return res.status(400).json({ error: "At least one career goal must be text" });
    }
    if (careerAiEngine() === "hybrid") {
      return await handleHybridRoadmap(res, user, {
        degree, year, aspirations, commitment, hours, university,
        fieldOfInterest: req.body?.fieldOfInterest,
        track: req.body?.track === "institutional" ? "institutional" : "personal",
        customGoal: req.body?.customGoal === true,
        step: Number.isInteger(req.body?.step) ? req.body.step : 4,
      }, false);
    }

    // AI guard: circuit breaker + per-user concurrency + daily quota (Firestore-persisted)
    const gate = await aiGate(user.uid, "roadmap", { bypassQuota: isAdminTester });
    if (gate) return res.status(gate.status).json(gate.body);
    roadmapSlotAcquired = true;
    roadmapQuotaCharged = !isAdminTester;

    const taxonomyContext = careerTaxonomyContext(aspirations);
    const userMsg = `Student Profile:
- Degree / Branch: ${degree}
- Current Year: ${year}
- University: ${university || "Indian University"}
- Career Aspirations: ${aspirations.join(", ")}
- Commitment Level: ${commitment || "Actively applying"}
- Available Hours/Week: ${hours || "5–10 hrs"}
- Structured selected-role context (authoritative; custom values intentionally have no taxonomy metadata): ${taxonomyContext}

Generate the full year-by-year career roadmap for this student. Follow the structured selected-role context. Return ONLY valid JSON matching the schema.`;

    // Check in-memory cache first (common degree+aspiration combos)
    const ck = roadmapCacheKey(degree, aspirations, year, commitment, hours, university);
    const cached = ROADMAP_CACHE.get(ck);
    if (!isAdminTester && cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
      return res.json({ roadmap: cached.roadmap });
    }

    let response: any;
    try {
      response = await withAITimeout(() => getClient().messages.create({
        model: "claude-haiku-4-5",
        max_tokens: DUAL_TRACK_MAX_OUTPUT_TOKENS,
        system: DUAL_TRACK_SYSTEM_PROMPT,
        messages: [{ role: "user", content: userMsg }],
      }), CAREER_ROADMAP_TIMEOUT_MS);
      recordAISuccess();
    } catch (aiErr: any) {
      recordAIFailure();
      refundRoadmapQuota();
      if (aiErr?.message === "AI_TIMEOUT") {
        return res.status(503).json({ error: "Roadmap generation timed out. Please try again in a moment." });
      }
      return res.status(503).json({
        error: "ai_unavailable",
        message: "Roadmap AI is temporarily unavailable. Please try again.",
      });
    }

    let roadmap: any;
    try {
      roadmap = parseClaudeJson(response, extractJson);
    } catch (parseErr: any) {
      recordAIFailure();
      refundRoadmapQuota();
      if (isClaudeResponseError(parseErr)) {
        const truncated = parseErr.code === "AI_RESPONSE_TRUNCATED";
        return res.status(502).json({
          error: truncated ? "ai_response_incomplete" : "ai_response_invalid",
          message: truncated
            ? "Roadmap AI reached its response limit. Please retry."
            : "Roadmap AI returned an invalid response. Please retry.",
        });
      }
      throw parseErr;
    }

    roadmap = sanitizeRoadmap(roadmap);
    const completenessError = roadmapCompletenessError(roadmap);
    if (completenessError) {
      recordAIFailure();
      refundRoadmapQuota();
      console.error(`[CAREER COMPASS] roadmap incomplete: ${completenessError}`);
      return res.status(502).json({
        error: "ai_response_invalid",
        message: "Roadmap AI returned an incomplete Career Map. Please retry; this attempt was not counted.",
      });
    }
    ROADMAP_CACHE.set(ck, { roadmap, cachedAt: Date.now() });

    // Persist profile to Firestore for placement dashboard
    if (getFirebaseAdmin()) {
      admin.firestore().collection("career_compass_profiles").doc(user.uid).set({
        uid: user.uid,
        email: user.email || null,
        degree, year,
        aspirations,
        commitment: commitment || "",
        hours: hours || "",
        university: university || "Unknown",
        profileScore: 20,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true }).catch((e: any) => console.error("[CAREER COMPASS] Firestore write:", e?.message));
    }

    res.json({ roadmap });
  } catch (err: any) {
    if (isClaudeResponseError(err)) {
      recordAIFailure();
      refundRoadmapQuota();
      return res.status(502).json({
        error: err.code === "AI_RESPONSE_TRUNCATED" ? "ai_response_incomplete" : "ai_response_invalid",
        message: "Roadmap AI could not complete a valid response. Please retry.",
      });
    }
    console.error("[CAREER COMPASS] roadmap error:", err?.message || err);
    res.status(500).json({ error: "Failed to generate roadmap" });
  } finally {
    if (roadmapSlotAcquired && roadmapUser) releaseConcurrencySlot(roadmapUser.uid, "roadmap");
  }
});

// Update skill status (called when student ticks a skill)
router.post("/api/career-compass/skill-update", async (req: Request, res: Response) => {
  try {
    const user = await verifyUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const { skillName, status, profileScore } = req.body || {};
    if (!skillName || !status) return res.status(400).json({ error: "Missing fields" });

    if (getFirebaseAdmin()) {
      await admin.firestore().collection("career_compass_profiles").doc(user.uid).set({
        [`skills.${skillName.replace(/[^a-z0-9]/gi, "_")}`]: status,
        profileScore: profileScore ?? 20,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
    }
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: "Failed" });
  }
});

// Admin: placement cell stats
router.get("/api/career-compass/placement-stats", async (req: Request, res: Response) => {
  try {
    const user = await verifyUser(req);
    if (!user || user.email?.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
      return res.status(403).json({ error: "Forbidden" });
    }

    if (!getFirebaseAdmin()) return res.json({ total: 0, profiles: [], topBranches: [], avgScore: 0, readyForPlacement: 0 });

    const snap = await admin.firestore().collection("career_compass_profiles").get();
    const profiles: any[] = [];
    snap.forEach((doc) => profiles.push({ id: doc.id, ...doc.data() }));

    const total = profiles.length;
    const branchMap: Record<string, number> = {};
    profiles.forEach((p) => {
      if (p.degree) branchMap[p.degree] = (branchMap[p.degree] || 0) + 1;
    });
    const topBranches = Object.entries(branchMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, count]) => ({ name, count }));

    const avgScore = total
      ? Math.round(profiles.reduce((sum, p) => sum + (p.profileScore || 20), 0) / total)
      : 0;
    const readyForPlacement = profiles.filter((p) => (p.profileScore || 20) >= 70).length;

    res.json({
      total,
      avgScore,
      readyForPlacement,
      topBranches,
      profiles: profiles.map((p) => ({
        uid: p.uid,
        email: p.email || "—",
        degree: p.degree || "—",
        year: p.year || "—",
        aspirations: Array.isArray(p.aspirations) ? p.aspirations.join(", ") : "—",
        university: p.university || "—",
        profileScore: p.profileScore || 20,
        lastSaved: p.lastSaved?.toDate?.()?.toISOString() || null,
        roadmapGenerated: p.roadmapGenerated || false,
        skillsCompleted: p.skillsCompleted || 0,
        placementPhase: p.placementPhase || "entry",
        placementTargetRole: p.placementTargetRole || "—",
      })),
    });
  } catch (err: any) {
    console.error("[CAREER COMPASS] stats error:", err?.message);
    res.status(500).json({ error: "Failed" });
  }
});

router.get("/api/career-compass/admin/ai-usage", async (req: Request, res: Response) => {
  const user = await verifyUser(req);
  if (!user || user.email?.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
    return res.status(403).json({ error: "Forbidden" });
  }
  return res.json(await getAiUsageSummary(Number(req.query.days) || 30));
});

// Explicit, admin-only quality comparison. Never enabled for student traffic
// and never stores a comparison candidate in the student's roadmap collection.
router.post("/api/career-compass/admin/ai-compare", rateLimitMiddleware.sensitive, async (req: Request, res: Response) => {
  const user = await verifyUser(req);
  if (!user || user.email?.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
    return res.status(403).json({ error: "Forbidden" });
  }
  if (process.env.CAREER_COMPASS_AI_COMPARE !== "1") {
    return res.status(404).json({ error: "Comparison mode is disabled" });
  }
  const { degree, year, aspirations, university, track } = req.body || {};
  if (!degree || !year || !Array.isArray(aspirations) || !aspirations.length) {
    return res.status(400).json({ error: "Missing degree, year or career goals" });
  }
  if (!process.env.GEMINI_API_KEY) return res.status(503).json({ error: "Gemini is not configured" });
  const gate = await aiGate(user.uid, "roadmap", { bypassQuota: true });
  if (gate) return res.status(gate.status).json(gate.body);
  try {
    const { context, key } = await createCareerAiContext(user, {
      degree, year, aspirations, university,
      track: track === "institutional" ? "institutional" : "personal",
      customGoal: req.body?.customGoal === true,
    });
    const hybridStarted = Date.now();
    const hybrid = await generateCareerHybrid({
      user, context, key, route: "/api/career-compass/admin/ai-compare",
      systemPrompt: DUAL_TRACK_SYSTEM_PROMPT,
      sanitize: sanitizeRoadmap, validate: roadmapCompletenessError,
      extractJson, getClaudeClient: getClient, cache: false,
    });
    const gemini = {
      roadmap: hybrid.roadmap,
      provider: hybrid.fallback ? "claude_fallback" : "gemini",
      reviewed: hybrid.reviewed,
      validation: roadmapCompletenessError(hybrid.roadmap),
      latencyMs: Date.now() - hybridStarted,
    };
    let claude: Record<string, unknown>;
    const legacyStarted = Date.now();
    try {
      const response = await getClient().messages.create({
        model: process.env.CLAUDE_MODEL || "claude-haiku-4-5",
        max_tokens: DUAL_TRACK_MAX_OUTPUT_TOKENS,
        system: DUAL_TRACK_SYSTEM_PROMPT,
        messages: [{ role: "user", content: JSON.stringify({ context }) }],
      });
      const raw = (response.content || []).filter((item: any) => item.type === "text")
        .map((item: any) => item.text).join("");
      if (response.stop_reason === "max_tokens") throw new Error("Response truncated");
      const value = sanitizeRoadmap(JSON.parse(extractJson(raw) || raw));
      const validation = roadmapCompletenessError(value);
      claude = { roadmap: value, validation, latencyMs: Date.now() - legacyStarted };
      void recordAiUsage({
        provider: "claude", model: process.env.CLAUDE_MODEL || "claude-haiku-4-5",
        operation: "comparison", attempt: 1,
        tokens: { input: response.usage?.input_tokens || 0, output: response.usage?.output_tokens || 0 },
        cacheTokens: 0, success: !validation, latency: Date.now() - legacyStarted,
        reviewTriggered: false, route: "/api/career-compass/admin/ai-compare",
      });
    } catch {
      claude = { error: "Claude comparison is unavailable or incomplete.", latencyMs: Date.now() - legacyStarted };
    }
    return res.json({ gemini, claude, persisted: false });
  } catch (err: any) {
    console.error("[CAREER COMPASS] comparison failed:", err?.code || "application_error");
    return res.status(503).json({ error: "Comparison failed to produce a valid roadmap" });
  } finally {
    releaseConcurrencySlot(user.uid, "roadmap");
  }
});

// ─── Save session (career compass + placement readiness) ─────────────────────
router.post("/api/career-compass/save-session", async (req: Request, res: Response) => {
  try {
    const user = await verifyUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const {
      degree, year, aspirations, commitment, hours, university, step,
      skillStatus,
      placementPhase, placementDegree, placementTargetRole,
      placementCgpa, placementSelectedSkills, placementProgress,
    } = req.body || {};

    const skillStatusMap: Record<string, string> = (skillStatus && typeof skillStatus === "object") ? skillStatus : {};
    const doneCount = Object.values(skillStatusMap).filter((v: any) => v === "done").length;
    const totalCount = Object.keys(skillStatusMap).length;
    const profileScore = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 20;

    if (!getFirebaseAdmin()) {
      // Hard fail instead of silent ok — user thinks save worked but it didn't.
      return res.status(503).json({ error: "Storage temporarily unavailable. Please try again." });
    }
    const data: Record<string, any> = {
      uid: user.uid,
      email: user.email || null,
      lastSaved: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    if (degree !== undefined) data.degree = degree;
    if (year !== undefined) data.year = year;
    if (aspirations !== undefined) data.aspirations = aspirations;
    if (commitment !== undefined) data.commitment = commitment;
    if (hours !== undefined) data.hours = hours;
    if (university !== undefined) data.university = university;
    if (step !== undefined) data.step = step;
    if (skillStatus !== undefined) {
      data.skillStatus = skillStatus;
      data.skillsCompleted = doneCount;
      data.profileScore = profileScore;
      data.roadmapGenerated = true;
    }
    if (placementPhase !== undefined) data.placementPhase = placementPhase;
    if (placementDegree !== undefined) data.placementDegree = placementDegree;
    if (placementTargetRole !== undefined) data.placementTargetRole = placementTargetRole;
    if (placementCgpa !== undefined) data.placementCgpa = placementCgpa;
    if (placementSelectedSkills !== undefined) data.placementSelectedSkills = placementSelectedSkills;
    if (placementProgress !== undefined) data.placementProgress = placementProgress;
    await admin.firestore().collection("career_compass_profiles").doc(user.uid).set(data, { merge: true });
    res.json({ ok: true, profileScore });
  } catch (err: any) {
    console.error("[CAREER COMPASS] save-session:", err?.message);
    res.status(500).json({ error: "Failed to save" });
  }
});

// ─── Save roadmap separately (large payload) ──────────────────────────────────
router.post("/api/career-compass/save-roadmap", async (req: Request, res: Response) => {
  try {
    const user = await verifyUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    const { roadmap } = req.body || {};
    if (!roadmap) return res.status(400).json({ error: "No roadmap" });
    if (!getFirebaseAdmin()) return res.status(503).json({ error: "Storage unavailable" });
    if (getFirebaseAdmin()) {
      await admin.firestore().collection("career_compass_roadmaps").doc(user.uid).set({
        uid: user.uid, roadmap, savedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      await admin.firestore().collection("career_compass_profiles").doc(user.uid).set({
        roadmapGenerated: true, updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
    }
    res.json({ ok: true });
  } catch (err: any) {
    console.error("[CAREER COMPASS] save-roadmap:", err?.message);
    res.status(500).json({ error: "Failed to save roadmap" });
  }
});

// ─── Load session ─────────────────────────────────────────────────────────────
router.get("/api/career-compass/load-session", async (req: Request, res: Response) => {
  try {
    const user = await verifyUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    if (!getFirebaseAdmin()) return res.json({ session: null });
    const [profileSnap, roadmapSnap] = await Promise.all([
      admin.firestore().collection("career_compass_profiles").doc(user.uid).get(),
      admin.firestore().collection("career_compass_roadmaps").doc(user.uid).get(),
    ]);
    if (!profileSnap.exists) return res.json({ session: null });
    const p = profileSnap.data()!;
    const rm = roadmapSnap.exists ? roadmapSnap.data() : null;
    res.json({
      session: {
        degree: p.degree || "",
        year: p.year || "",
        aspirations: p.aspirations || [],
        commitment: p.commitment || "",
        hours: p.hours || "",
        university: p.university || "",
        step: p.step || 1,
        roadmap: rm?.roadmap || null,
        skillStatus: p.skillStatus || {},
        placementPhase: p.placementPhase || "entry",
        placementDegree: p.placementDegree || "",
        placementTargetRole: p.placementTargetRole || "",
        placementCgpa: p.placementCgpa || "",
        placementSelectedSkills: p.placementSelectedSkills || [],
        placementProgress: p.placementProgress || {},
        lastSaved: p.lastSaved?.toDate?.()?.toISOString() || null,
      }
    });
  } catch (err: any) {
    console.error("[CAREER COMPASS] load-session:", err?.message);
    res.status(500).json({ error: "Failed to load session" });
  }
});

// ─── SSE Streaming Roadmap ────────────────────────────────────────────────────
// ─── New dual-track Career Compass system prompt ──────────────────────────────
export const DUAL_TRACK_SYSTEM_PROMPT = `You are the AI engine for StudentXchange's "Career Compass" — a dual-track career mapping system for Indian university students. Generate personalized career pathways AND actionable project suggestions based on the student's degree, field of study, and career interests.

Return ONLY valid JSON — no markdown, no code fences, no preamble:
{
  "years": [
    {
      "year_number": 1,
      "label": "Year 1 — Foundation",
      "semester_label": "Sem 1 & 2",
      "skills": [{ "name": string, "priority": "high"|"medium"|"low", "category": "technical"|"soft"|"domain"|"tools", "by_when": string, "estimated_hours": number, "credit_points": 2|3|4, "why_it_matters": string, "learning_resources": [{ "type": "NPTEL"|"YouTube"|"Platform"|"Coursera"|"Udemy", "title": string, "url": string, "duration": string, "credit_eligible": boolean, "free": boolean }] }],
      "targets": [string],
      "studentlancing_fit": { "type": "Micro Task"|"Internship"|"Job"|"Sure Shot Jobs", "description": string }
    }
  ],
  "overall_summary": string,
  "top_3_immediate_actions": [string],
  "career_map": {
    "primary_path": string,
    "alternate_paths": [string],
    "next_12_months": [{ "milestone": string, "why_it_matters": string }],
    "next_24_months": [{ "milestone": string, "why_it_matters": string }],
    "skill_gaps": [string],
    "recommended_certifications": [string],
    "education_guidance": [string],
    "recommended_tools": [string],
    "internship_targets": [string],
    "role_progression": { "entry_level": [string], "mid_level": [string], "senior_level": [string] },
    "higher_studies": [string],
    "entrepreneurship": [string],
    "employment_guidance": string
  },
  "project_suggestions": [
    {
      "project_title": string,
      "relevance": string,
      "difficulty": "Beginner"|"Intermediate"|"Advanced",
      "estimated_duration": string,
      "tools_required": [string],
      "learning_outcomes": [string],
      "portfolio_value": string,
      "can_be_paired_with_studentlancing": boolean
    }
  ],
  "track_specific_output": {
    "personal_notes": string,
    "timeline_flexibility": string,
    "institutional_alignment": string,
    "faculty_mentor_suggestion": string,
    "cohort_potential": boolean
  }
}

Rules (STRICT — brevity is critical, response MUST be complete JSON):
- Generate years from Year 1 through final year of the degree (B.Tech = 4 years, MBA = 2 years, etc.). EXACTLY 3 skills per year, EXACTLY 2 learning_resources per skill.
- Keep ALL strings SHORT: why_it_matters max 15 words, relevance max 15 words, portfolio_value max 12 words, descriptions max 20 words, overall_summary max 40 words.
- targets: max 3 short items per year. top_3_immediate_actions: exactly 3 short items.
- career_map: max 2 alternate_paths, max 3 milestones each in next_12_months/next_24_months, max 4 skill_gaps, max 3 recommended_certifications.
- career_map: education_guidance max 3, recommended_tools max 4, internship_targets max 3, each role_progression level max 2, higher_studies and entrepreneurship max 2. employment_guidance max 25 words; never invent salary figures—say compensation varies by location and experience where relevant.
- EXACTLY 4 project_suggestions: max 3 tools_required, max 2 learning_outcomes each.
- Each skill: estimated_hours (10-80), credit_points (2-4), priority, category.
- Indian education system; INR; prefer NPTEL, Internshala, Unstop, Coursera India. At least 1 NPTEL per year. Real URLs only.
- Projects must be specific to degree + field_of_interest (name exact tools); difficulty realistic for current year.
- The structured selected-role context in the user message is authoritative. Follow canonical role metadata for courses, skills, tools, certifications, role progression, internships, higher studies, entrepreneurship, and alternatives. For multiple goals, use shared foundations and distinct goal branches; do not blend unrelated roles into one generic path. Keep recommendations feasible for the student's stated degree and current year. Custom values have no taxonomy metadata: acknowledge only their supplied text and do not fabricate sector facts.
- If track is "Personal": fill personal_notes (max 30 words) + timeline_flexibility (max 20 words); institutional fields empty string / false. If "Institutional": reverse.
- Cross-reference StudentLancing: if a project type has freelance/gig equivalents, set can_be_paired_with_studentlancing to true.
- Output raw JSON only. It MUST be complete and parseable. Do not add any fields beyond the schema.`;

export const DUAL_TRACK_MAX_OUTPUT_TOKENS = 6500;
// A complete multi-year roadmap is substantially larger than ordinary AI
// responses. Keep the global AI timeout conservative for other endpoints, but
// give Career Compass enough time to finish and validate the full JSON.
const CAREER_ROADMAP_TIMEOUT_MS = Math.max(
  AI_TIMEOUT_MS,
  parseInt(process.env.CAREER_ROADMAP_TIMEOUT_MS ?? "90000", 10),
);
const CAREER_ROADMAP_HEARTBEAT_MS = 10_000;

function roadmapCacheKeyFull(
  degree: string,
  aspirations: string[],
  fieldOfInterest: string,
  track: string,
  year = "",
  commitment = "",
  hours = "",
  university = "",
): string {
  return [
    roadmapCacheKey(degree, aspirations, year, commitment, hours, university),
    fieldOfInterest,
    track,
  ].map(value => value.toLowerCase().trim()).join("_");
}

router.post("/api/career-compass/stream", rateLimitMiddleware.sensitive, async (req: Request, res: Response) => {
  let streamUser: { uid: string; email?: string } | null = null;
  let streamQuotaCharged = false;
  let streamQuotaRefunded = false;
  const refundStreamQuota = () => {
    if (!streamQuotaCharged || streamQuotaRefunded || !streamUser) return;
    streamQuotaRefunded = true;
    void refundQuota(streamUser.uid, "stream");
  };
  try {
    const user = await verifyUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    streamUser = user;
    const isAdminTester = user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();

    const { degree, year, aspirations, commitment, hours, university, fieldOfInterest, track } = req.body || {};
    if (!degree || !year || !Array.isArray(aspirations) || aspirations.length === 0) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    if (careerAiEngine() === "hybrid" && !aspirations.some((goal: unknown) => typeof goal === "string" && goal.trim())) {
      return res.status(400).json({ error: "At least one career goal must be text" });
    }

    const trackValue = (track === "personal" || track === "institutional") ? track : "personal";
    if (careerAiEngine() === "hybrid") {
      return await handleHybridRoadmap(res, user, {
        degree, year, aspirations, commitment, hours, university, fieldOfInterest,
        track: trackValue, customGoal: req.body?.customGoal === true,
        step: Number.isInteger(req.body?.step) ? req.body.step : 4,
      }, true);
    }
    const fieldValue = typeof fieldOfInterest === "string" && fieldOfInterest.trim() ? fieldOfInterest.trim() : "";
    const taxonomyContext = careerTaxonomyContext(aspirations);

    // In-memory cache check — before acquiring AI slot so cache hits are free
    // Track must always be part of the key: identical form answers can produce
    // different personal vs institutional notes and placement context.
    const ck = roadmapCacheKeyFull(degree, aspirations, fieldValue, trackValue, year, commitment, hours, university);
    const cached = ROADMAP_CACHE.get(ck);
    if (!isAdminTester && cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
      let saved = false;
      let saveError: string | undefined;
      try {
        await persistStudentRoadmap(user, {
          degree, year, aspirations, commitment, hours, university,
          track: trackValue,
        }, cached.roadmap);
        saved = true;
      } catch (persistErr: any) {
        console.error("[CAREER COMPASS] cached legacy roadmap could not be saved:", persistErr?.message || persistErr);
        saveError = "The cached roadmap is available, but could not be saved to your account. Please retry saving it.";
      }
      return res.json({ roadmap: cached.roadmap, saved, ...(saveError ? { saveError } : {}) });
    }

    // AI guard: circuit breaker + per-user concurrency + daily quota (Firestore-persisted)
    const gate = await aiGate(user.uid, "stream", { bypassQuota: isAdminTester });
    if (gate) return res.status(gate.status).json(gate.body);
    streamQuotaCharged = !isAdminTester;

    // Setup SSE
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();

    const userMsg = `{
  "track": "${trackValue}",
  "student_degree": "${degree}",
  "current_year": "${year}",
  "field_of_interest": "${fieldValue || "General / most common specialization for this degree"}",
  "career_goal": "${(aspirations as string[]).join(", ")}",
  "selected_role_taxonomy": ${taxonomyContext},
  "skills_current": [],
  "institution_context": "${trackValue === "institutional" ? `${university || "Indian University"} — placement cell focus` : ""}"
}

Generate the full career map, project roadmap, and project suggestions. Follow selected_role_taxonomy as authoritative. Return ONLY valid JSON matching the schema.`;

    let accumulated = "";
    let stopReason = "";
    let clientDisconnected = false;
    let slotReleased = false;
    let anthropicStream: any = null;
    const releaseStreamSlot = () => {
      if (slotReleased) return;
      slotReleased = true;
      releaseConcurrencySlot(user.uid, "stream");
    };

    // Proxies can close a quiet SSE connection while Claude is preparing its
    // first token. Heartbeats keep the request alive without pretending that a
    // partial JSON document is already usable.
    const heartbeatTimer = setInterval(() => {
      if (!res.writableEnded) {
        try {
          res.write(`data: ${JSON.stringify({ progress: "building_roadmap" })}\n\n`);
        } catch {}
      }
    }, CAREER_ROADMAP_HEARTBEAT_MS);

    res.on("close", () => {
      if (res.writableEnded) return;
      clientDisconnected = true;
      clearInterval(heartbeatTimer);
      try { anthropicStream?.abort?.(); } catch {}
      releaseStreamSlot();
    });

    // Do not impose an application-level deadline on a full Career Map. Keep
    // the SSE request alive and retry once transparently if Claude returns a
    // provider error, truncated JSON, or an incomplete roadmap.
    let roadmap: any = null;
    let lastFailure = "unknown";
    for (let attempt = 1; attempt <= 2 && !clientDisconnected; attempt++) {
      accumulated = "";
      stopReason = "";
      try {
        anthropicStream = getClient().messages.stream({
          model: "claude-haiku-4-5",
          max_tokens: DUAL_TRACK_MAX_OUTPUT_TOKENS,
          system: DUAL_TRACK_SYSTEM_PROMPT,
          messages: [{ role: "user", content: userMsg }],
        });

        for await (const event of anthropicStream as any) {
          if (clientDisconnected || res.writableEnded) break;
          if (event.type === "content_block_delta" && event.delta?.type === "text_delta") {
            const chunk: string = event.delta.text;
            accumulated += chunk;
            res.write(`data: ${JSON.stringify({ t: chunk })}\n\n`);
          }
          if (event.type === "message_delta" && typeof event.delta?.stop_reason === "string") {
            stopReason = event.delta.stop_reason;
          }
        }

        if (clientDisconnected || res.writableEnded) break;
        if (stopReason === "max_tokens") {
          lastFailure = "response reached max_tokens";
        } else {
          try {
            const candidate = sanitizeRoadmap(parseClaudeJson(
              { stop_reason: stopReason || "end_turn", content: [{ type: "text", text: accumulated }] },
              extractJson,
            ));
            const completenessError = roadmapCompletenessError(candidate);
            if (!completenessError) {
              roadmap = candidate;
              break;
            }
            lastFailure = completenessError;
          } catch (parseErr: any) {
            lastFailure = parseErr?.message || "invalid JSON";
          }
        }
      } catch (aiErr: any) {
        if (clientDisconnected) break;
        lastFailure = aiErr?.message || "provider stream failed";
      }

      if (attempt < 2 && !clientDisconnected && !res.writableEnded) {
        console.warn(`[CAREER COMPASS] retrying roadmap after attempt ${attempt}: ${lastFailure}`);
        try {
          res.write(`data: ${JSON.stringify({ progress: "retrying_for_complete_roadmap", reset: true })}\n\n`);
        } catch {}
      }
    }

    clearInterval(heartbeatTimer);
    releaseStreamSlot();

    if (clientDisconnected || res.writableEnded) return;
    if (!roadmap) {
      recordAIFailure();
      refundStreamQuota();
      console.error(`[CAREER COMPASS] roadmap failed after automatic retry: ${lastFailure}`);
      if (!res.writableEnded) {
        res.write(`data: ${JSON.stringify({
          error: "We could not complete the Career Map after retrying automatically. This attempt was not counted; please generate again.",
          code: "roadmap_generation_failed",
        })}\n\n`);
        res.end();
      }
      return;
    }
    recordAISuccess();

    let saved = false;
    let saveError: string | undefined;
    try {
      await persistStudentRoadmap(user, {
        degree, year, aspirations, commitment, hours, university,
        track: trackValue,
      }, roadmap);
      saved = true;
      // Do not poison the legacy in-memory cache when the durable student save
      // failed. A later request can retry generation and persistence safely.
      ROADMAP_CACHE.set(ck, { roadmap, cachedAt: Date.now() });
    } catch (persistErr: any) {
      console.error("[CAREER COMPASS] legacy stream roadmap persistence failed:", persistErr?.message || persistErr);
      saveError = "The roadmap was generated but could not be saved to your account. It is still available for this session; please retry saving it.";
    }

    if (!res.writableEnded) {
      res.write(`data: ${JSON.stringify({
        done: true, roadmap, saved,
        ...(saveError ? { saveError } : {}),
      })}\n\n`);
      res.end();
    }
  } catch (err: any) {
    if (streamUser) releaseConcurrencySlot(streamUser.uid, "stream");
    refundStreamQuota();
    console.error("[CAREER COMPASS] stream error:", err?.message || err);
    if (!res.writableEnded) {
      try { res.write(`data: ${JSON.stringify({ error: "Failed to generate roadmap" })}\n\n`); res.end(); } catch {}
    }
  }
});

// ─── Save SPCR onboarding profile ─────────────────────────────────────────────
router.post("/api/career-compass/save-onboarding", async (req: Request, res: Response) => {
  try {
    const user = await verifyUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const {
      fullName, phone, gender, dob, address, city, state,
      parentPhone,
      universityName, degree, yearOfStudy, urn, division, admissionYear,
      board10, pct10, passingYear10,
      prevType, board12, pct12, passingYear12,
      diplomaStream, diplomaPct, diplomaPassingYear, currentCgpa,
      certifications, careerGoal, skillsKnown,
      linkedin, github, foreignLanguages,
    } = req.body || {};

    if (!fullName || !phone || !universityName || !degree || !yearOfStudy) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Normalize foreignLanguages — accept array OR comma-separated string
    let foreignLanguagesArr: string[] = [];
    if (Array.isArray(foreignLanguages)) {
      foreignLanguagesArr = foreignLanguages.map(s => String(s).trim()).filter(Boolean);
    } else if (typeof foreignLanguages === "string") {
      foreignLanguagesArr = foreignLanguages.split(",").map(s => s.trim()).filter(Boolean);
    }

    if (getFirebaseAdmin()) {
      const data = {
        uid: user.uid, email: user.email || null,
        fullName, phone, gender: gender || "", dob: dob || "", address: address || "",
        city: city || "", state: state || "",
        parentPhone: parentPhone || "",
        universityName, degree, yearOfStudy,
        urn: urn || "", division: division || "", admissionYear: admissionYear || "",
        board10: board10 || "", pct10: pct10 || "", passingYear10: passingYear10 || "",
        prevType: prevType || "12th", board12: board12 || "", pct12: pct12 || "", passingYear12: passingYear12 || "",
        diplomaStream: diplomaStream || "", diplomaPct: diplomaPct || "", diplomaPassingYear: diplomaPassingYear || "",
        currentCgpa: currentCgpa || "",
        certifications: certifications || "", careerGoal: careerGoal || "",
        skillsKnown: Array.isArray(skillsKnown) ? skillsKnown : [],
        linkedin: linkedin || "", github: github || "",
        foreignLanguages: foreignLanguagesArr,
        onboarded: true,
        onboarded_at: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };
      await admin.firestore().collection("career_compass_onboarding").doc(user.uid).set(data, { merge: true });
      // Also save to spcr_students collection indexed by university
      const uniKey = (universityName || "unknown").toLowerCase().replace(/[^a-z0-9]/g, "_").slice(0, 40);
      await admin.firestore().collection("spcr_students").doc(`${uniKey}_${user.uid}`).set({
        ...data, uniKey, createdAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
    }
    res.json({ ok: true });
  } catch (err: any) {
    console.error("[CAREER COMPASS] save-onboarding:", err?.message);
    res.status(500).json({ error: "Failed to save" });
  }
});

// ─── Load student's own onboarding profile ────────────────────────────────────
router.get("/api/career-compass/load-profile", async (req: Request, res: Response) => {
  try {
    const user = await verifyUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    if (!getFirebaseAdmin()) return res.json({ profile: null });
    const [snap, userSnap] = await Promise.all([
      admin.firestore().collection("career_compass_onboarding").doc(user.uid).get(),
      admin.firestore().collection("users").doc(user.uid).get(),
    ]);
    if (!snap.exists) return res.json({ profile: null });
    const d = snap.data()!;
    const photoUrl = userSnap.exists ? (userSnap.data()?.career_compass_profile?.documents?.profile_photo || null) : null;
    res.json({ profile: {
      fullName: d.fullName || "", phone: d.phone || "", gender: d.gender || "",
      dob: d.dob || "", address: d.address || "", city: d.city || "", state: d.state || "",
      parentPhone: d.parentPhone || "",
      universityName: d.universityName || "", degree: d.degree || "",
      yearOfStudy: d.yearOfStudy || "", urn: d.urn || "", division: d.division || "",
      admissionYear: d.admissionYear || "",
      board10: d.board10 || "", pct10: d.pct10 || "", passingYear10: d.passingYear10 || "",
      prevType: d.prevType || "12th", board12: d.board12 || "", pct12: d.pct12 || "", passingYear12: d.passingYear12 || "",
      diplomaStream: d.diplomaStream || "", diplomaPct: d.diplomaPct || "", diplomaPassingYear: d.diplomaPassingYear || "",
      currentCgpa: d.currentCgpa || "",
      certifications: d.certifications || "", careerGoal: d.careerGoal || "",
      skillsKnown: Array.isArray(d.skillsKnown) ? d.skillsKnown : [],
      linkedin: d.linkedin || "", github: d.github || "",
      foreignLanguages: Array.isArray(d.foreignLanguages) ? d.foreignLanguages : [],
      photoUrl: photoUrl || null,
      onboarded_at: d.onboarded_at?.toDate?.()?.toISOString() || null,
    }});
  } catch (err: any) {
    res.status(500).json({ error: "Failed" });
  }
});

// ─── Check if user has completed onboarding ───────────────────────────────────
router.get("/api/career-compass/check-onboarded", async (req: Request, res: Response) => {
  try {
    const user = await verifyUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    if (!getFirebaseAdmin()) return res.json({ onboarded: false });
    const snap = await admin.firestore().collection("career_compass_onboarding").doc(user.uid).get();
    const docData = snap.data();
    res.json({
      onboarded: snap.exists && docData?.onboarded === true,
      onboarded_at: docData?.onboarded_at?.toDate?.()?.toISOString() || null,
    });
  } catch (err: any) {
    res.status(500).json({ error: "Failed" });
  }
});

// ─── Admin: list all SPCR-onboarded students (enriched with status + docs) ───
router.get("/api/career-compass/spcr-students", async (req: Request, res: Response) => {
  try {
    const user = await verifyUser(req);
    if (!user || user.email?.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
      return res.status(403).json({ error: "Forbidden" });
    }
    if (!getFirebaseAdmin()) return res.json({ students: [] });

    const db = admin.firestore();
    const { university } = req.query as Record<string, string>;
    let q: admin.firestore.Query = db.collection("career_compass_onboarding");
    if (university) q = q.where("universityName", "==", university);

    const snap = await q.orderBy("onboarded_at", "desc").limit(500).get();

    // Fetch every student's hierarchical documents doc + flat-collection approval status in parallel
    const enriched = await Promise.all(
      snap.docs.map(async (docSnap) => {
        const d: any = docSnap.data();
        const uniName: string = d.universityName || "";
        const uniKey = (uniName || "unknown").toLowerCase().replace(/[^a-z0-9]/g, "_").slice(0, 40);

        // Parallel: documents doc + flat spcr_students doc + users/{uid} mirror
        const [docsSnap, flatSnap, userSnap] = await Promise.all([
          uniName ? db.doc(`spcr_students/${uniName}/${d.uid}/documents`).get().catch(() => null) : Promise.resolve(null),
          db.collection("spcr_students").doc(`${uniKey}_${d.uid}`).get().catch(() => null),
          db.collection("users").doc(d.uid).get().catch(() => null),
        ]);

        const documents = (docsSnap?.exists ? docsSnap.data() : null) || {};
        const flatData = (flatSnap?.exists ? flatSnap.data() : null) || {};
        const userData: any = (userSnap?.exists ? userSnap.data() : null) || {};
        const ccProfile = userData.career_compass_profile || {};

        const spcrApproval =
          flatData.spcr_approval_status || ccProfile.spcr_status || "pending";
        const spcrRejectionReason =
          flatData.spcr_rejection_reason || ccProfile.spcr_rejection_reason || "";
        const coeApproval = flatData.coe_approval_status || ccProfile.coe_status || "pending";
        const placementScore = ccProfile.placementScore ?? flatData.placement_score ?? null;
        const photoUrl =
          documents.profile_photo || ccProfile.photoUrl || userData.photoURL || "";

        return {
          uid: d.uid,
          email: d.email || "",
          fullName: d.fullName || "",
          phone: d.phone || "",
          gender: d.gender || "",
          dob: d.dob || "",
          state: d.state || "",
          city: d.city || "",
          address: d.address || "",
          // university aliased both ways for backward-compat
          university: d.universityName || "",
          universityName: d.universityName || "",
          degree: d.degree || "",
          branch: d.degree || "",
          yearOfStudy: d.yearOfStudy || "",
          urn: d.urn || "",
          division: d.division || "",
          admissionYear: d.admissionYear || "",
          // Academic marks — map canonical → display
          board10: d.board10 || "",
          marks10: d.pct10 || "",
          pct10: d.pct10 || "",
          prevType: d.prevType || "",
          board12: d.board12 || "",
          marks12: d.pct12 || d.diplomaPct || "",
          pct12: d.pct12 || "",
          diplomaStream: d.diplomaStream || "",
          diplomaPct: d.diplomaPct || "",
          cgpa: d.currentCgpa || "",
          currentCgpa: d.currentCgpa || "",
          // Skills / career
          careerGoal: d.careerGoal || "",
          skillsKnown: Array.isArray(d.skillsKnown) ? d.skillsKnown : [],
          certifications: d.certifications || "",
          linkedin: d.linkedin || "",
          github: d.github || "",
          // Enriched fields
          photoUrl,
          documents,
          spcrApproval,
          spcr_rejection_reason: spcrRejectionReason,
          coeApproval,
          placementScore,
          onboarded_at: d.onboarded_at?.toDate?.()?.toISOString() || null,
        };
      })
    );

    res.json({ students: enriched, total: enriched.length });
  } catch (err: any) {
    console.error("[CAREER COMPASS] spcr-students:", err?.message);
    res.status(500).json({ error: "Failed" });
  }
});

// ─── Admin: approve / reject SPCR student (atomic, bypasses client rules) ────
router.post("/api/career-compass/spcr-approve", async (req: Request, res: Response) => {
  try {
    const user = await verifyUser(req);
    if (!user || user.email?.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
      return res.status(403).json({ error: "Forbidden" });
    }
    if (!getFirebaseAdmin()) return res.status(500).json({ error: "Admin SDK unavailable" });

    const { uid, university } = req.body || {};
    if (!uid) return res.status(400).json({ error: "uid required" });

    const db = admin.firestore();
    const uniName: string = university || "";
    const uniKey = (uniName || "unknown").toLowerCase().replace(/[^a-z0-9]/g, "_").slice(0, 40);
    const now = admin.firestore.FieldValue.serverTimestamp();

    const batch = db.batch();
    // Flat doc (read by the listing API)
    batch.set(db.collection("spcr_students").doc(`${uniKey}_${uid}`), {
      spcr_approval_status: "approved",
      spcr_approved_at: now,
      spcr_approved_by: user.email || "",
      spcr_rejection_reason: admin.firestore.FieldValue.delete(),
    }, { merge: true });
    // Hierarchical status doc (read by profile board)
    if (uniName) {
      batch.set(db.doc(`spcr_students/${uniName}/${uid}/status`), {
        spcr_approval_status: "approved",
        spcr_approved_at: now,
        spcr_approved_by: user.email || "",
      }, { merge: true });
    }
    // Mirror onto user profile so profile board Section E updates instantly
    batch.set(db.collection("users").doc(uid), {
      career_compass_profile: {
        spcr_status: "approved",
        spcrEligible: true,
        spcr_approved_at: now,
      },
    }, { merge: true });
    await batch.commit();
    res.json({ ok: true });
  } catch (err: any) {
    console.error("[CAREER COMPASS] spcr-approve:", err?.message);
    res.status(500).json({ error: err?.message || "Failed to approve" });
  }
});

router.post("/api/career-compass/spcr-reject", async (req: Request, res: Response) => {
  try {
    const user = await verifyUser(req);
    if (!user || user.email?.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
      return res.status(403).json({ error: "Forbidden" });
    }
    if (!getFirebaseAdmin()) return res.status(500).json({ error: "Admin SDK unavailable" });

    const { uid, university, reason } = req.body || {};
    if (!uid) return res.status(400).json({ error: "uid required" });

    const db = admin.firestore();
    const uniName: string = university || "";
    const uniKey = (uniName || "unknown").toLowerCase().replace(/[^a-z0-9]/g, "_").slice(0, 40);
    const now = admin.firestore.FieldValue.serverTimestamp();
    const rejectionReason = (reason || "").toString().slice(0, 500);

    const batch = db.batch();
    batch.set(db.collection("spcr_students").doc(`${uniKey}_${uid}`), {
      spcr_approval_status: "rejected",
      spcr_rejected_at: now,
      spcr_rejection_reason: rejectionReason,
    }, { merge: true });
    if (uniName) {
      batch.set(db.doc(`spcr_students/${uniName}/${uid}/status`), {
        spcr_approval_status: "rejected",
        spcr_rejected_at: now,
        spcr_rejection_reason: rejectionReason,
      }, { merge: true });
    }
    batch.set(db.collection("users").doc(uid), {
      career_compass_profile: {
        spcr_status: "rejected",
        spcrEligible: false,
        spcr_rejection_reason: rejectionReason,
      },
    }, { merge: true });
    await batch.commit();
    res.json({ ok: true });
  } catch (err: any) {
    console.error("[CAREER COMPASS] spcr-reject:", err?.message);
    res.status(500).json({ error: err?.message || "Failed to reject" });
  }
});

// ─── Admin: remove / reset an SPCR student (lets them reapply from scratch) ───
router.post("/api/career-compass/spcr-remove", async (req: Request, res: Response) => {
  try {
    const user = await verifyUser(req);
    if (!user || user.email?.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
      return res.status(403).json({ error: "Forbidden" });
    }
    if (!getFirebaseAdmin()) return res.status(500).json({ error: "Admin SDK unavailable" });

    const { uid, university } = req.body || {};
    if (!uid) return res.status(400).json({ error: "uid required" });

    const db = admin.firestore();
    const uniName: string = university || "";
    const uniKey = (uniName || "unknown").toLowerCase().replace(/[^a-z0-9]/g, "_").slice(0, 40);

    const batch = db.batch();

    // Delete flat spcr_students doc (used by the listing API)
    batch.delete(db.collection("spcr_students").doc(`${uniKey}_${uid}`));

    // Delete career_compass_onboarding doc so they can re-onboard
    batch.delete(db.collection("career_compass_onboarding").doc(uid));

    // Reset SPCR fields on user profile
    batch.set(db.collection("users").doc(uid), {
      career_compass_profile: {
        spcr_status: admin.firestore.FieldValue.delete(),
        spcrEligible: admin.firestore.FieldValue.delete(),
        spcr_approved_at: admin.firestore.FieldValue.delete(),
        spcr_rejected_at: admin.firestore.FieldValue.delete(),
        spcr_rejection_reason: admin.firestore.FieldValue.delete(),
      },
    }, { merge: true });

    // Also delete hierarchical status doc if university known
    if (uniName) {
      batch.delete(db.doc(`spcr_students/${uniName}/${uid}/status`));
    }

    await batch.commit();
    res.json({ ok: true });
  } catch (err: any) {
    console.error("[CAREER COMPASS] spcr-remove:", err?.message);
    res.status(500).json({ error: err?.message || "Failed to remove" });
  }
});

export default router;
