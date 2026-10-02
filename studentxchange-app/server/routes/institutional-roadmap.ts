import { Router, Request, Response } from "express";
import { getFirebaseAdmin, admin } from "../firebase-admin";
import { LANCING_ADMIN_EMAIL } from "../config/constants";
import { degreeKey, yearKey, instRoadmapDocId } from "@shared/career-keys";
import {
  verifyUser, sanitizeRoadmap, extractJson, getClient, DUAL_TRACK_SYSTEM_PROMPT, DUAL_TRACK_MAX_OUTPUT_TOKENS, roadmapCompletenessError,
} from "./career-compass";
import { aiGate, refundQuota, releaseConcurrencySlot, recordAIFailure, recordAISuccess, withAITimeout, AI_TIMEOUT_MS } from "../utils/ai-guard";
import { isClaudeResponseError, parseClaudeJson } from "../utils/ai-response";
import { buildCareerSelectionContext } from "@shared/career-data";
import { careerAiEngine, createCareerAiContext, generateCareerHybrid } from "../utils/career-ai-flow";
import { recordAiUsage } from "../utils/career-ai-store";

const router = Router();
const ADMIN_EMAIL = LANCING_ADMIN_EMAIL;

// ─── Admin auth middleware (same contract as lancing-admin) ───────────────────
async function verifyLancingAdmin(req: Request, res: Response, next: Function) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const token = authHeader.split("Bearer ")[1];
    if (!getFirebaseAdmin()) return res.status(500).json({ error: "Firebase not configured" });
    const decoded = await admin.auth().verifyIdToken(token);
    if (decoded.email?.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
      return res.status(403).json({ error: "Access denied. Admin only." });
    }
    (req as any).user = decoded;
    next();
  } catch (error: any) {
    console.error("[INST ROADMAP] Auth error:", error?.message);
    return res.status(401).json({ error: "Invalid token" });
  }
}

const ROADMAPS = "institutionalRoadmaps";

function scoreFromSkillStatus(skillStatus: any): { done: number; total: number; score: number } {
  const map: Record<string, string> = (skillStatus && typeof skillStatus === "object") ? skillStatus : {};
  const total = Object.keys(map).length;
  const done = Object.values(map).filter((v) => v === "done").length;
  return { done, total, score: total > 0 ? Math.round((done / total) * 100) : 0 };
}

function scoreForRoadmap(roadmap: any, status: Record<string, string>): { done: number; total: number; score: number } {
  const skills: string[] = Array.isArray(roadmap?.years)
    ? roadmap.years.flatMap((year: any) => Array.isArray(year?.skills) ? year.skills.map((skill: any) => String(skill?.name || "")).filter(Boolean) : [])
    : [];
  const done = skills.filter((name) => status[name] === "done").length;
  return { done, total: skills.length, score: skills.length ? Math.round(done / skills.length * 100) : 0 };
}

function asRecord(value: unknown): Record<string, any> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, any> : {};
}

/**
 * Merge against the latest progress document (inside the Firestore transaction).
 * This keeps independently saved skill toggles and year-specific plans intact.
 */
export function mergeStudentInstitutionalProgress(
  existing: Record<string, any>,
  incomingSkillStatus: unknown,
  year?: string,
  generatedRoadmap?: unknown,
): Record<string, any> {
  const skillStatus = { ...asRecord(existing.skillStatus), ...asRecord(incomingSkillStatus) };
  const { done, score } = scoreFromSkillStatus(skillStatus);
  const merged: Record<string, any> = {
    skillStatus,
    completedSkills: done,
    progressScore: score,
  };

  if (generatedRoadmap && typeof generatedRoadmap === "object" && !Array.isArray(generatedRoadmap)) {
    merged.generatedRoadmap = generatedRoadmap;
    if (year) {
      const roadmapYearKey = year.slice(0, 30).replace(/[^a-zA-Z0-9_-]/g, "_");
      merged.generatedRoadmapYear = year;
      merged.generatedRoadmapsByYear = {
        ...asRecord(existing.generatedRoadmapsByYear),
        [roadmapYearKey]: generatedRoadmap,
      };
    }
  }
  return merged;
}

// ══════════════════════════════════════════════════════════════════════════════
// ADMIN ENDPOINTS
// ══════════════════════════════════════════════════════════════════════════════

// Load a single institutional roadmap (any status) for editing
router.get("/api/institutional-roadmap/admin/get", verifyLancingAdmin, async (req: Request, res: Response) => {
  try {
    const degree = String(req.query.degree || "");
    const year = String(req.query.year || "");
    if (!degree || !year) return res.status(400).json({ error: "Missing degree or year" });
    if (!getFirebaseAdmin()) return res.status(503).json({ error: "Storage unavailable" });

    const docId = instRoadmapDocId(degree, year);
    const snap = await admin.firestore().collection(ROADMAPS).doc(docId).get();
    if (!snap.exists) return res.json({ exists: false, roadmap: null });
    const d = snap.data()!;
    res.json({
      exists: true,
      roadmap: d.roadmap || null,
      status: d.status || "draft",
      generatedBy: d.generatedBy || "manual",
      degree: d.degree || degree,
      year: d.year || year,
      lastUpdated: d.lastUpdated?.toDate?.()?.toISOString() || null,
    });
  } catch (err: any) {
    console.error("[INST ROADMAP] admin get:", err?.message);
    res.status(500).json({ error: "Failed to load roadmap" });
  }
});

// AI-generate an institutional roadmap (NOT saved — admin reviews then saves)
router.post("/api/institutional-roadmap/admin/generate", verifyLancingAdmin, async (req: Request, res: Response) => {
  const adminUser = (req as any).user as { uid?: string } | undefined;
  let slotAcquired = false;
  let quotaRefunded = false;
  const refundOnFailure = () => {
    if (!slotAcquired || !adminUser?.uid || quotaRefunded) return;
    quotaRefunded = true;
    void refundQuota(adminUser.uid, "roadmap");
  };
  try {
    const { degree, year, institution, focusAreas, targetCompanies, context } = req.body || {};
    if (!degree || !year) return res.status(400).json({ error: "Missing degree or year" });
    if (!adminUser?.uid) return res.status(401).json({ error: "Unauthorized" });
    if (careerAiEngine() === "hybrid" && !process.env.GEMINI_API_KEY) {
      return res.status(503).json({ error: "gemini_not_configured", message: "Gemini is not configured for Career Compass." });
    }

    const gate = await aiGate(adminUser.uid, "roadmap");
    if (gate) return res.status(gate.status).json(gate.body);
    slotAcquired = true;

    const goals = Array.isArray(focusAreas) ? focusAreas : (typeof focusAreas === "string" ? focusAreas.split(",") : []);
    if (careerAiEngine() === "hybrid") {
      try {
        const { context: aiContext, key } = await createCareerAiContext(
          { uid: adminUser.uid },
          {
            degree, year, aspirations: goals.length ? goals : ["Degree-relevant career readiness"],
            university: institution || "Indian University",
            fieldOfInterest: goals.join(", "),
            track: "institutional",
            institutionContext: {
              audience: "One institution-curated plan for the specified degree and year, not an individual plan",
              focusAreas: goals,
              targetCompanies: targetCompanies || [],
              additionalContext: context || "",
            },
          },
        );
        const result = await generateCareerHybrid({
          user: { uid: adminUser.uid }, context: aiContext, key,
          route: "/api/institutional-roadmap/admin/generate",
          systemPrompt: DUAL_TRACK_SYSTEM_PROMPT,
          sanitize: sanitizeRoadmap, validate: roadmapCompletenessError,
          extractJson, getClaudeClient: getClient,
          cache: false, // The admin must explicitly review and save the draft.
        });
        recordAISuccess();
        void recordAiUsage({
          provider: result.fallback ? "claude" : "gemini", model: "roadmap",
          operation: "roadmap_completed", attempt: 0, tokens: 0, cacheTokens: 0,
          success: true, latency: 0, reviewTriggered: result.reviewed,
          fallback: result.fallback, route: "/api/institutional-roadmap/admin/generate",
        });
        return res.json({ roadmap: result.roadmap });
      } catch (err: any) {
        recordAIFailure();
        refundOnFailure();
        console.error("[INST ROADMAP] hybrid draft failed:", err?.code || "application_error");
        return res.status(503).json({
          error: "ai_unavailable",
          message: "Could not generate a complete institutional draft. Please retry.",
        });
      }
    }
    const userMsg = `Generate the SAME complete Career Compass roadmap schema students see, including the Career Map, exactly four projects, and institutional track notes. This is one institution-curated plan for students of the specified degree and year, not an individual personal plan.
${JSON.stringify({
  track: "institutional",
  student_degree: degree,
  current_year: year,
  field_of_interest: goals.join(", ") || "General employability",
  career_goal: goals.join(", ") || "Degree-relevant career readiness",
  selected_role_taxonomy: buildCareerSelectionContext(goals),
  skills_current: [],
  institution_context: {
    institution: institution || "Indian University",
    focus_areas: goals,
    target_companies: targetCompanies || [],
    additional_context: context || "",
    placement_owner: "Institution",
  },
})}
Return only complete JSON matching the shared schema.`;

    let response: any;
    try {
      response = await withAITimeout(() => getClient().messages.create({
        model: "claude-sonnet-4-5",
        max_tokens: DUAL_TRACK_MAX_OUTPUT_TOKENS,
        system: DUAL_TRACK_SYSTEM_PROMPT,
        messages: [{ role: "user", content: userMsg }],
      }), Math.max(AI_TIMEOUT_MS, 90_000));
    } catch (aiErr: any) {
      recordAIFailure();
      refundOnFailure();
      const timedOut = aiErr?.message === "AI_TIMEOUT";
      return res.status(timedOut ? 504 : 503).json({
        error: timedOut ? "ai_timeout" : "ai_unavailable",
        message: timedOut
          ? "Institutional roadmap generation timed out. Please retry."
          : "Institutional roadmap AI is temporarily unavailable. Please retry.",
      });
    }

    let roadmap: any;
    try {
      roadmap = sanitizeRoadmap(parseClaudeJson(response, extractJson));
    } catch (parseErr: any) {
      recordAIFailure();
      refundOnFailure();
      const truncated = isClaudeResponseError(parseErr) && parseErr.code === "AI_RESPONSE_TRUNCATED";
      return res.status(502).json({
        error: truncated ? "ai_response_incomplete" : "ai_response_invalid",
        message: truncated
          ? "Institutional roadmap AI reached its response limit. Please retry."
          : "Institutional roadmap AI returned an invalid response. Please retry.",
      });
    }
    const incomplete = roadmapCompletenessError(roadmap);
    if (incomplete) {
      recordAIFailure();
      refundOnFailure();
      console.error(`[INST ROADMAP] incomplete admin draft: ${incomplete}`);
      return res.status(502).json({
        error: "ai_response_invalid",
        message: "Institutional roadmap AI returned an incomplete Career Map. Please retry.",
      });
    }

    recordAISuccess();
    res.json({ roadmap });
  } catch (err: any) {
    refundOnFailure();
    console.error("[INST ROADMAP] admin generate:", err?.message);
    res.status(500).json({ error: "Failed to generate roadmap" });
  } finally {
    if (slotAcquired && adminUser?.uid) releaseConcurrencySlot(adminUser.uid, "roadmap");
  }
});

// Save (create/update) an institutional roadmap with status
router.post("/api/institutional-roadmap/admin/save", verifyLancingAdmin, async (req: Request, res: Response) => {
  try {
    const { degree, year, roadmap, status, generatedBy } = req.body || {};
    if (!degree || !year || !roadmap) return res.status(400).json({ error: "Missing degree, year or roadmap" });
    if (!getFirebaseAdmin()) return res.status(503).json({ error: "Storage unavailable" });

    const safe = sanitizeRoadmap(roadmap);
    if (!safe.years?.length) return res.status(400).json({ error: "Roadmap has no valid years" });

    const docId = instRoadmapDocId(degree, year);
    const admin_email = (req as any).user?.email || null;
    await admin.firestore().collection(ROADMAPS).doc(docId).set({
      degree,
      year,
      degreeKey: degreeKey(degree),
      yearKey: yearKey(year),
      roadmap: safe,
      status: status === "published" ? "published" : "draft",
      generatedBy: generatedBy === "ai" ? "ai" : "manual",
      updatedBy: admin_email,
      lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    res.json({ ok: true, docId });
  } catch (err: any) {
    console.error("[INST ROADMAP] admin save:", err?.message);
    res.status(500).json({ error: "Failed to save roadmap" });
  }
});

// Toggle published / draft
router.post("/api/institutional-roadmap/admin/status", verifyLancingAdmin, async (req: Request, res: Response) => {
  try {
    const { degree, year, status } = req.body || {};
    if (!degree || !year) return res.status(400).json({ error: "Missing degree or year" });
    if (!getFirebaseAdmin()) return res.status(503).json({ error: "Storage unavailable" });

    const docId = instRoadmapDocId(degree, year);
    const ref = admin.firestore().collection(ROADMAPS).doc(docId);
    const snap = await ref.get();
    if (!snap.exists) return res.status(404).json({ error: "Roadmap not found" });

    await ref.set({
      status: status === "published" ? "published" : "draft",
      lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    res.json({ ok: true, status: status === "published" ? "published" : "draft" });
  } catch (err: any) {
    console.error("[INST ROADMAP] admin status:", err?.message);
    res.status(500).json({ error: "Failed to update status" });
  }
});

// List students for a degree+year with personal & institutional progress
router.get("/api/institutional-roadmap/admin/student-progress", verifyLancingAdmin, async (req: Request, res: Response) => {
  try {
    const degree = String(req.query.degree || "");
    const year = String(req.query.year || "");
    if (!getFirebaseAdmin()) return res.status(503).json({ error: "Storage unavailable" });

    const db = admin.firestore();
    let q = db.collection("career_compass_profiles").limit(500) as any;
    if (degree) q = q.where("degree", "==", degree);
    if (year) q = q.where("year", "==", year);
    const [snap, onboardingSnap] = await Promise.all([
      q.get(),
      (degree
        ? db.collection("career_compass_onboarding").where("degree", "==", degree)
        : year
          ? db.collection("career_compass_onboarding").where("yearOfStudy", "==", year)
          : db.collection("career_compass_onboarding")).limit(500).get(),
    ]);
    // Institutional-only students need not have a personal-track profile.
    // Merge onboarding identities for the admin list without writing to, or
    // treating institutional work as, a personal session.
    const rows = new Map<string, any>();
    for (const doc of snap.docs) rows.set(doc.id, doc.data());
    for (const doc of onboardingSnap.docs) {
      const data = doc.data();
      if (degree && data.degree !== degree) continue;
      if (year && data.yearOfStudy !== year) continue;
      const existing = rows.get(doc.id) || {};
      rows.set(doc.id, {
        ...data,
        ...existing,
        degree: degree || existing.degree || data.degree || "",
        year: year || existing.year || data.yearOfStudy || "",
        fullName: existing.fullName || data.fullName,
        email: existing.email || data.email,
      });
    }

    const dk = degree ? degreeKey(degree) : null;

    // Batch-load premium subscription status for all listed students.
    const premiumByUid = new Map<string, boolean>();
    try {
      const uids: string[] = Array.from(rows.keys());
      const refs = uids.map((u) => db.collection("career_compass_subscriptions").doc(u));
      for (let i = 0; i < refs.length; i += 300) {
        const chunk = refs.slice(i, i + 300);
        const subs = await db.getAll(...chunk);
        for (const s of subs) {
          if (!s.exists) continue;
          const d = s.data() || {};
          const expiry = d.expiryDate?.toDate ? d.expiryDate.toDate() : (d.expiryDate ? new Date(d.expiryDate) : null);
          const active = !!d.isPremium && (!expiry || expiry.getTime() > Date.now());
          if (active) premiumByUid.set(s.id, true);
        }
      }
    } catch (e: any) {
      console.error("[INST ROADMAP] premium lookup failed:", e?.message);
    }

    const students = await Promise.all(Array.from(rows.entries()).map(async ([uid, p]) => {
      // Current personal sessions save skillStatus by name; older profiles used
      // sanitized keys in the skills map. Never use the initial profileScore (20)
      // as a substitute for actual completed roadmap skills.
      const personalStatus = p.skillStatus && Object.keys(p.skillStatus).length ? p.skillStatus : p.skills;
      const personal = scoreFromSkillStatus(personalStatus);
      let institutionalScore = 0;
      let institutionalDone = 0;
      let institutionalTotal = 0;
      try {
        const progKey = dk || degreeKey(p.degree);
        const progSnap = await db.collection("users").doc(uid).collection("institutionalProgress").doc(progKey).get();
        if (progSnap.exists) {
          const pr = progSnap.data()!;
          const s = scoreFromSkillStatus(pr.skillStatus);
          institutionalScore = s.score;
          institutionalDone = s.done;
          institutionalTotal = s.total;
        }
      } catch {}
      return {
        uid,
        email: p.email || null,
        name: p.fullName || p.name || (p.email ? p.email.split("@")[0] : "Student"),
        degree: p.degree || "",
        year: p.year || "",
        personalScore: personal.score,
        personalDone: personal.done,
        personalTotal: personal.total,
        institutionalScore,
        institutionalDone,
        institutionalTotal,
        isPremium: premiumByUid.get(uid) === true,
      };
    }));

    res.json({ students });
  } catch (err: any) {
    console.error("[INST ROADMAP] admin student-progress:", err?.message);
    res.status(500).json({ error: "Failed to load student progress" });
  }
});

// Per-student detail: both roadmaps + both skillStatus maps
router.get("/api/institutional-roadmap/admin/student-detail", verifyLancingAdmin, async (req: Request, res: Response) => {
  try {
    const uid = String(req.query.uid || "");
    const degree = String(req.query.degree || "");
    const year = String(req.query.year || "");
    if (!uid) return res.status(400).json({ error: "Missing uid" });
    if (!getFirebaseAdmin()) return res.status(503).json({ error: "Storage unavailable" });

    const db = admin.firestore();
    const [profileSnap, personalRoadmapSnap] = await Promise.all([
      db.collection("career_compass_profiles").doc(uid).get(),
      db.collection("career_compass_roadmaps").doc(uid).get(),
    ]);
    const p = profileSnap.exists ? profileSnap.data()! : {};
    const effDegree = degree || p.degree || "";
    const effYear = year || p.year || "";
    const dk = degreeKey(effDegree);

    const [instSnap, progSnap] = await Promise.all([
      effDegree && effYear ? db.collection(ROADMAPS).doc(instRoadmapDocId(effDegree, effYear)).get() : Promise.resolve(null as any),
      db.collection("users").doc(uid).collection("institutionalProgress").doc(dk).get(),
    ]);

    // Current personal progress is keyed by skill name in skillStatus. Remap
    // legacy sanitized skill keys only if the newer map has no entries.
    const personalRoadmap = personalRoadmapSnap.exists ? personalRoadmapSnap.data()!.roadmap : null;
    const modernStatus: Record<string, string> = p.skillStatus && typeof p.skillStatus === "object" ? p.skillStatus : {};
    const legacySkills: Record<string, string> = p.skills && typeof p.skills === "object" ? p.skills : {};
    const personalSkillStatus: Record<string, string> = Object.keys(modernStatus).length ? modernStatus : {};
    if (!Object.keys(modernStatus).length && personalRoadmap && Array.isArray(personalRoadmap.years)) {
      for (const yr of personalRoadmap.years) {
        for (const sk of (Array.isArray(yr?.skills) ? yr.skills : [])) {
          const key = String(sk?.name || "").replace(/[^a-z0-9]/gi, "_");
          if (legacySkills[key]) personalSkillStatus[sk.name] = legacySkills[key];
        }
      }
    }
    const instData = instSnap?.exists ? instSnap.data()! : null;
    const publishedRoadmap = instData?.status === "published" ? instData.roadmap : null;
    const progressData = progSnap.exists ? progSnap.data()! : null;
    const studentGeneratedRoadmap = progressData?.generatedRoadmap || null;

    res.json({
      degree: effDegree,
      year: effYear,
      personal: {
        roadmap: personalRoadmap,
        skillStatus: personalSkillStatus,
        score: scoreForRoadmap(personalRoadmap, personalSkillStatus).score,
      },
      institutional: {
        roadmap: publishedRoadmap || studentGeneratedRoadmap,
        source: publishedRoadmap ? "published" : studentGeneratedRoadmap ? "student_generated" : "none",
        status: instData?.status || "none",
        skillStatus: progressData?.skillStatus || {},
        score: scoreForRoadmap(publishedRoadmap || studentGeneratedRoadmap, progressData?.skillStatus || {}).score,
      },
    });
  } catch (err: any) {
    console.error("[INST ROADMAP] admin student-detail:", err?.message);
    res.status(500).json({ error: "Failed to load student detail" });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// STUDENT ENDPOINTS
// ══════════════════════════════════════════════════════════════════════════════

// Read the PUBLISHED institutional roadmap for a degree+year (published-only)
router.get("/api/institutional-roadmap/student", async (req: Request, res: Response) => {
  try {
    const user = await verifyUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const degree = String(req.query.degree || "");
    const year = String(req.query.year || "");
    if (!degree || !year) return res.status(400).json({ error: "Missing degree or year" });
    if (!getFirebaseAdmin()) return res.json({ roadmap: null, status: "none" });

    const docId = instRoadmapDocId(degree, year);
    const snap = await admin.firestore().collection(ROADMAPS).doc(docId).get();
    if (!snap.exists) return res.json({ roadmap: null, status: "none" });
    const d = snap.data()!;
    // Enforce published-only at the server boundary.
    if (d.status !== "published") return res.json({ roadmap: null, status: "none" });

    res.json({
      roadmap: d.roadmap || null,
      status: "published",
      lastUpdated: d.lastUpdated?.toDate?.()?.toISOString() || null,
    });
  } catch (err: any) {
    console.error("[INST ROADMAP] student get:", err?.message);
    res.status(500).json({ error: "Failed to load roadmap" });
  }
});

// Read the student's own institutional progress (per degree)
router.get("/api/institutional-roadmap/progress", async (req: Request, res: Response) => {
  try {
    const user = await verifyUser(req);
    if (!user?.uid || typeof user.uid !== "string") return res.status(401).json({ error: "Unauthorized" });
    const degree = String(req.query.degree || "");
    const year = String(req.query.year || "");
    if (!degree) return res.status(400).json({ error: "Missing degree" });
    if (!getFirebaseAdmin()) return res.json({ skillStatus: {}, progressScore: 0, generatedRoadmap: null });

    const dk = degreeKey(degree);
    const snap = await admin.firestore().collection("users").doc(user.uid).collection("institutionalProgress").doc(dk).get();
    if (!snap.exists) return res.json({ skillStatus: {}, progressScore: 0, generatedRoadmap: null });
    const d = snap.data()!;
    const yearKey = year.slice(0, 30).replace(/[^a-zA-Z0-9_-]/g, "_");
    const roadmapForYear = year
      ? d.generatedRoadmapsByYear?.[yearKey] || (!d.generatedRoadmapYear || d.generatedRoadmapYear === year ? d.generatedRoadmap : null)
      : d.generatedRoadmap;
    res.json({
      skillStatus: d.skillStatus || {},
      progressScore: d.progressScore || 0,
      generatedRoadmap: roadmapForYear || null,
    });
  } catch (err: any) {
    console.error("[INST ROADMAP] progress get:", err?.message);
    res.status(500).json({ error: "Failed to load progress" });
  }
});

// Save the student's own institutional progress (per degree)
router.post("/api/institutional-roadmap/progress", async (req: Request, res: Response) => {
  try {
    const user = await verifyUser(req);
    if (!user?.uid || typeof user.uid !== "string") return res.status(401).json({ error: "Unauthorized" });
    const { degree, year, skillStatus, generatedRoadmap } = req.body || {};
    if (!degree) return res.status(400).json({ error: "Missing degree" });
    if (!getFirebaseAdmin()) return res.status(503).json({ error: "Storage unavailable" });

    const dk = degreeKey(degree);
    const db = admin.firestore();
    const progressRef = db.collection("users").doc(user.uid).collection("institutionalProgress").doc(dk);
    const yearValue = year ? String(year) : "";
    const publishedRef = yearValue
      ? db.collection(ROADMAPS).doc(instRoadmapDocId(degree, yearValue))
      : null;
    const result = await db.runTransaction(async (transaction) => {
      // Read both records in the transaction so concurrent progress changes retry
      // against the latest state, and a published plan takes precedence over a
      // student-generated plan being saved at the same time.
      const existingSnap = await transaction.get(progressRef);
      const publishedSnap = publishedRef ? await transaction.get(publishedRef) : null;
      const existing = existingSnap.exists ? existingSnap.data() || {} : {};
      const publishedTakesPriority = publishedSnap?.exists && publishedSnap.data()?.status === "published";
      const updates = mergeStudentInstitutionalProgress(
        existing,
        skillStatus,
        yearValue,
        publishedTakesPriority ? undefined : generatedRoadmap,
      );
      const payload = {
        ...updates,
        uid: user.uid,
        email: user.email || null,
        degree,
        degreeKey: dk,
        lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
      };
      transaction.set(progressRef, payload, { merge: true });
      return updates.progressScore;
    });
    res.json({ ok: true, progressScore: result });
  } catch (err: any) {
    console.error("[INST ROADMAP] progress save:", err?.message);
    res.status(500).json({ error: "Failed to save progress" });
  }
});

export default router;
