import { Router, Request, Response } from "express";
import { GoogleGenAI } from "@google/genai";
import { getFirebaseAdmin, admin } from "../firebase-admin";
import { findBank, shuffle, MCQ } from "../data/question-bank";
import { degreeKey } from "@shared/career-keys";
import { requireCareerPremium } from "./career-compass";
import { PLATFORM_ADMIN_EMAIL } from "../config/constants";
import crypto from "crypto";
import { rateLimitMiddleware } from "../middleware/rate-limiter";
import {
  aiGate, withAITimeout, releaseConcurrencySlot,
  recordAISuccess, recordAIFailure,
} from "../utils/ai-guard";

const router = Router();

// ─── Auth helpers ─────────────────────────────────────────────────────────────
async function verifyUser(req: Request): Promise<{ uid: string; email?: string } | null> {
  const hdr = req.headers.authorization;
  if (!hdr?.startsWith("Bearer ")) return null;
  try {
    if (!getFirebaseAdmin()) return null;
    const decoded = await admin.auth().verifyIdToken(hdr.replace("Bearer ", ""));
    return { uid: decoded.uid, email: decoded.email };
  } catch { return null; }
}

// COE staff allow-list: ADMIN_EMAIL plus optional comma-separated COE_EMAILS
function getCoeStaffEmails(): Set<string> {
  const set = new Set<string>();
  if (process.env.ADMIN_EMAIL) set.add(process.env.ADMIN_EMAIL.toLowerCase());
  if (process.env.COE_EMAILS) {
    process.env.COE_EMAILS.split(",").map(e => e.trim().toLowerCase()).filter(Boolean).forEach(e => set.add(e));
  }
  return set;
}

async function verifyCoeStaff(req: Request): Promise<{ uid: string; email: string } | null> {
  const user = await verifyUser(req);
  if (!user || !user.email) return null;
  const allowed = getCoeStaffEmails();
  if (allowed.size === 0) {
    console.warn("[PLACEMENT] COE staff allow-list empty (set ADMIN_EMAIL or COE_EMAILS) — blocking all COE actions.");
    return null;
  }
  if (!allowed.has(user.email.toLowerCase())) return null;
  return { uid: user.uid, email: user.email };
}

function skillKey(skill: string) {
  return skill.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 60);
}

// ─── Server-side skill credit catalog (source of truth) ──────────────────────
// Mirrors client SKILL_META — server NEVER trusts client-supplied credit values.
const SERVER_SKILL_META: Record<string, number> = {
  "Data Structures & Algorithms": 4, "OOPs Concepts": 3, "Computer Networks": 3,
  "Operating Systems": 3, "DBMS": 3,
  "Python": 3, "SQL & Databases": 3, "React / JavaScript": 3,
  "Machine Learning Basics": 4, "System Design": 4,
  "Statistics & Probability": 3, "Data Visualisation": 2,
  "Digital Electronics": 3, "Signal Processing": 3, "Embedded Systems": 3,
  "Communication Systems": 3, "VLSI Design": 3, "Microprocessors": 3,
  "Engineering Drawing": 2, "Thermodynamics": 3, "CAD/CAM": 3,
  "Manufacturing Processes": 3, "Fluid Mechanics": 3, "Strength of Materials": 3,
  "Structural Analysis": 3, "Surveying": 2, "Concrete Technology": 2,
  "AutoCAD": 2, "Environmental Engineering": 3,
  "Marketing Fundamentals": 3, "Financial Accounting": 3, "Business Communication": 2,
  "Excel & Data Analysis": 2, "Digital Marketing": 3, "HR Management": 3,
  "Operations Management": 3, "Business Strategy": 3, "Presentation Skills": 2,
  "Taxation Basics": 3, "Tally & Accounting Software": 2, "Business Law": 3,
  "Cost Accounting": 3, "Excel for Finance": 2, "Auditing Basics": 3,
  "Figma": 2, "Visual Design Principles": 3, "Typography": 2,
  "Prototyping & Wireframing": 3, "User Research Basics": 2,
  "Adobe Illustrator": 2, "Color Theory": 2,
  "Aptitude & Logical Reasoning": 2, "Communication Skills": 2,
};

function lookupCredits(skill: string): number {
  if (SERVER_SKILL_META[skill] != null) return SERVER_SKILL_META[skill];
  const lower = skill.toLowerCase();
  for (const [k, v] of Object.entries(SERVER_SKILL_META)) {
    if (lower.includes(k.toLowerCase()) || k.toLowerCase().includes(lower)) return v;
  }
  return 2; // safe default
}

// ─── Skill Assessment Engine (Section 3) ─────────────────────────────────────
// Three-level MCQ assessment per skill with anti-cheat, attempt limits, cooldowns.
// L1: foundational MCQ. L2: applied MCQ. L3: scenario MCQ + written submission (COE-reviewed).

const MAX_ATTEMPTS_PER_LEVEL = 2;     // per skill per semester
const COOLDOWN_DAYS_ON_FAIL = 3;
const SEMESTER_WINDOW_MS = 1000 * 60 * 60 * 24 * 120; // 4 months

interface ServerAttempt {
  attempt_id: string;
  uid: string;
  skill: string;
  level: 1 | 2 | 3;
  question_ids: string[];          // order shown to student
  correct_map: Record<string, number>;  // q_id → correct option index
  submission_ids: string[];
  pass_pct: number;
  credits_on_pass: number;
  time_limit_sec: number;
  started_at: number;              // ms epoch
  submitted_at?: number;
  score_pct?: number;
  passed?: boolean;
}

// ─── Firestore-backed attempt store (replaces in-memory Map) ─────────────────
// Collection: active_skill_attempts / {attempt_id}
// Each document holds a ServerAttempt + expires_at (ms epoch, server-computed).
// Using Firestore means:
//  • Instance A starts attempt → Instance B can submit it (shared storage)
//  • Duplicate submissions prevented by runTransaction (atomic mark)
//  • Abandoned attempts auto-cleaned by the interval below

// Periodic cleanup of expired attempt docs (idempotent — safe to run on every instance)
setInterval(async () => {
  if (!getFirebaseAdmin()) return;
  try {
    const snap = await admin.firestore()
      .collection("active_skill_attempts")
      .where("expires_at", "<", Date.now())
      .limit(50)
      .get();
    if (snap.empty) return;
    const batch = admin.firestore().batch();
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  } catch { /* ignore — will retry next interval */ }
}, 10 * 60 * 1000);

async function getLevelHistory(uid: string, skill: string, level: number) {
  if (!getFirebaseAdmin()) throw new Error("Firebase unavailable");
  const db = admin.firestore();
  const sk = skillKey(skill);
  const snap = await db.collection("skill_attempts").doc(uid).collection("attempts")
    .where("skill_key", "==", sk).where("level", "==", level)
    .get();
  const cutoff = Date.now() - SEMESTER_WINDOW_MS;
  const list: any[] = [];
  snap.forEach(d => {
    const data = d.data();
    if ((data.submitted_at_ms || 0) >= cutoff) list.push({ id: d.id, ...data });
  });
  list.sort((a, b) => (b.submitted_at_ms || 0) - (a.submitted_at_ms || 0));
  return list;
}

async function isLevelPassed(uid: string, skill: string, level: number): Promise<boolean> {
  const hist = await getLevelHistory(uid, skill, level);
  return hist.some(h => h.passed);
}

// POST /api/placement/start-attempt — pick random questions, store correct answers server-side
router.post("/api/placement/start-attempt", requireCareerPremium, async (req: Request, res: Response) => {
  try {
    const user = await verifyUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    const { skill, level } = req.body || {};
    if (!skill || ![1, 2, 3].includes(level)) return res.status(400).json({ error: "Invalid skill or level" });

    const bank = findBank(skill);
    if (!bank) return res.status(404).json({ error: `No question bank available for "${skill}" yet.` });

    const lvl = bank.levels[level as 1 | 2 | 3];

    // Level gating: L2 needs L1 pass; L3 needs L2 pass
    if (level === 2 && !(await isLevelPassed(user.uid, skill, 1))) {
      return res.status(403).json({ error: "Pass Level 1 before attempting Level 2." });
    }
    if (level === 3 && !(await isLevelPassed(user.uid, skill, 2))) {
      return res.status(403).json({ error: "Pass Level 2 before attempting Level 3." });
    }

    // Attempt-limit + cooldown check
    const history = await getLevelHistory(user.uid, skill, level);
    if (history.some(h => h.passed)) {
      return res.status(403).json({ error: `You have already passed Level ${level} this semester.` });
    }
    if (history.length >= MAX_ATTEMPTS_PER_LEVEL) {
      return res.status(403).json({ error: `Maximum ${MAX_ATTEMPTS_PER_LEVEL} attempts reached for Level ${level} this semester.` });
    }
    const lastFail = history.find(h => !h.passed);
    if (lastFail) {
      const cooldownEnd = (lastFail.submitted_at_ms || 0) + COOLDOWN_DAYS_ON_FAIL * 24 * 60 * 60 * 1000;
      if (Date.now() < cooldownEnd) {
        return res.status(429).json({ error: `Cooldown active. Try again after ${new Date(cooldownEnd).toLocaleString()}.`, cooldown_until: new Date(cooldownEnd).toISOString() });
      }
    }

    // Sample questions
    const sampled = shuffle(lvl.pool).slice(0, Math.min(lvl.mcq_count, lvl.pool.length));
    const subSampled = lvl.submission_pool ? shuffle(lvl.submission_pool).slice(0, 1) : [];

    const attempt_id = crypto.randomBytes(16).toString("hex");
    const correct_map: Record<string, number> = {};
    sampled.forEach(q => { correct_map[q.id] = q.correct; });

    const stored: ServerAttempt = {
      attempt_id, uid: user.uid, skill, level: level as 1 | 2 | 3,
      question_ids: sampled.map(q => q.id),
      correct_map,
      submission_ids: subSampled.map(s => s.id),
      pass_pct: lvl.pass_pct,
      credits_on_pass: lvl.credits,
      time_limit_sec: lvl.time_sec,
      started_at: Date.now(),
    };

    // Persist attempt to Firestore — shared across all server instances.
    // expires_at is server-computed so the client cannot extend the window.
    if (!getFirebaseAdmin()) return res.status(503).json({ error: "Firebase unavailable" });
    const expiresAt = Date.now() + lvl.time_sec * 2 * 1000;
    await admin.firestore().collection("active_skill_attempts").doc(attempt_id).set({
      ...stored,
      expires_at: expiresAt,
    });

    // Return question payload WITHOUT correct answers
    res.json({
      attempt_id,
      level, skill: bank.name,
      time_limit_sec: lvl.time_sec,
      pass_pct: lvl.pass_pct,
      credits_on_pass: lvl.credits,
      questions: sampled.map(q => ({ id: q.id, q: q.q, opts: q.opts })),
      submissions: subSampled,
    });
  } catch (err: any) {
    console.error("[PLACEMENT] start-attempt:", err?.message);
    res.status(500).json({ error: "Failed to start attempt" });
  }
});

// POST /api/placement/submit-attempt — grade server-side, award credits, persist
router.post("/api/placement/submit-attempt", requireCareerPremium, async (req: Request, res: Response) => {
  try {
    const user = await verifyUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    const { attempt_id, answers, submissions, integrity_signals } = req.body || {};
    if (!attempt_id || typeof answers !== "object") return res.status(400).json({ error: "Missing attempt_id or answers" });
    if (!getFirebaseAdmin()) return res.status(503).json({ error: "Firebase unavailable" });

    const db = admin.firestore();
    const attemptRef = db.collection("active_skill_attempts").doc(attempt_id);

    // Atomically load the attempt and mark it as submitted in one Firestore transaction.
    // This guarantees:
    //  • Instance A starts attempt → Instance B can submit it (shared Firestore doc)
    //  • Two concurrent requests from the same user cannot both succeed (only one wins)
    //  • An expired attempt is rejected even if it still exists in Firestore
    let stored: ServerAttempt;
    try {
      stored = await db.runTransaction(async (tx) => {
        const doc = await tx.get(attemptRef);
        if (!doc.exists) throw Object.assign(new Error("not_found"), { code: "not_found" });
        const data = doc.data() as ServerAttempt & { expires_at?: number };
        if (data.uid !== user.uid) throw Object.assign(new Error("forbidden"), { code: "forbidden" });
        if (data.submitted_at) throw Object.assign(new Error("already_submitted"), { code: "already_submitted" });
        if ((data.expires_at ?? Infinity) < Date.now()) throw Object.assign(new Error("expired"), { code: "expired" });
        // Mark submitted atomically — concurrent requests will see submitted_at set and fail
        tx.update(attemptRef, { submitted_at: Date.now() });
        return data as ServerAttempt;
      });
    } catch (txErr: any) {
      const code: string = txErr?.code ?? "";
      if (code === "not_found" || code === "expired") {
        return res.status(404).json({ error: "Attempt not found or expired. Please restart." });
      }
      if (code === "forbidden") return res.status(403).json({ error: "Not your attempt" });
      if (code === "already_submitted") return res.status(400).json({ error: "Attempt already submitted" });
      throw txErr; // unexpected — propagate to outer catch
    }

    const bank = findBank(stored.skill);
    if (!bank) return res.status(500).json({ error: "Question bank missing" });
    const lvl = bank.levels[stored.level];

    // Grade MCQs
    const breakdown: { q_id: string; correct: number; chosen: number | null; explanation: string }[] = [];
    let correctCount = 0;
    for (const qid of stored.question_ids) {
      const correct = stored.correct_map[qid];
      const chosen = typeof answers[qid] === "number" ? answers[qid] : null;
      if (chosen != null && chosen === correct) correctCount++;
      const explainText = lvl.pool.find(p => p.id === qid)?.explain || "";
      breakdown.push({ q_id: qid, correct, chosen, explanation: explainText });
    }
    const totalCount = stored.question_ids.length;
    const scorePct = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;
    const passed = scorePct >= stored.pass_pct;

    // Integrity flags
    const tabSwitches = Math.max(0, Number(integrity_signals?.tab_switches) || 0);
    const totalTimeMs = Math.max(0, Number(integrity_signals?.total_time_ms) || 0);
    const tooFast = totalTimeMs < (stored.question_ids.length * 5 * 1000); // <5s/question average
    const integrityFlagged = tabSwitches >= 3 || tooFast;
    const flagReasons: string[] = [];
    if (tabSwitches >= 3) flagReasons.push(`${tabSwitches} tab switches`);
    if (tooFast) flagReasons.push(`unrealistically fast completion (${Math.round(totalTimeMs/1000)}s)`);

    // Credits awarded only if passed AND not flagged (flagged = pending COE review)
    const creditsAwarded = (passed && !integrityFlagged) ? stored.credits_on_pass : 0;

    // L3 has a written submission that must be COE-reviewed even on a "pass"
    const hasSubmission = stored.submission_ids.length > 0;
    const submissionTexts: Record<string, string> = {};
    if (hasSubmission && submissions && typeof submissions === "object") {
      for (const sid of stored.submission_ids) {
        const txt = (submissions[sid] || "").toString().slice(0, 5000);
        if (txt.trim().length > 10) submissionTexts[sid] = txt;
      }
    }
    const needsCoeReview = integrityFlagged || (stored.level === 3 && Object.keys(submissionTexts).length > 0);

    // Persist the attempt (db already declared above from the transaction block)
    const sk = skillKey(stored.skill);
    const submittedAt = Date.now();

    await db.collection("skill_attempts").doc(user.uid).collection("attempts").doc(attempt_id).set({
      uid: user.uid, attempt_id,
      skill: stored.skill, skill_key: sk, level: stored.level,
      score_pct: scorePct, correct_count: correctCount, total_count: totalCount,
      passed, credits_awarded: creditsAwarded,
      pass_pct: stored.pass_pct,
      integrity_flagged: integrityFlagged, flag_reasons: flagReasons,
      tab_switches: tabSwitches, total_time_ms: totalTimeMs,
      submission_texts: submissionTexts,
      needs_coe_review: needsCoeReview,
      coe_status: needsCoeReview ? "pending" : "auto_approved",
      started_at_ms: stored.started_at, submitted_at_ms: submittedAt,
      submitted_at: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Update skill_progress.levels.{l1|l2|l3} if passed and not flagged
    if (passed && !integrityFlagged) {
      const skillRef = db.collection("skill_progress").doc(user.uid).collection("skills").doc(sk);
      const lkey = `level_${stored.level}`;
      const existing = await skillRef.get();
      const existingLevels = existing.data()?.levels || {};
      // Only overwrite a previous pass if the new score is higher
      const prev = existingLevels[lkey];
      if (!prev?.passed || (prev.passed && scorePct > (prev.score_pct || 0))) {
        existingLevels[lkey] = {
          passed: true, score_pct: scorePct, credits: stored.credits_on_pass,
          attempt_id, passed_at_ms: submittedAt,
        };
      }
      // Also bump self_completed status (so credits flow into placement readiness math) if not already verified
      const existingStatus = existing.data()?.status;
      const update: any = { skill: stored.skill, levels: existingLevels, updated_at: admin.firestore.FieldValue.serverTimestamp() };
      if (existingStatus !== "coe_verified") {
        update.status = "self_completed";
        update.credits = lookupCredits(stored.skill);
        update.completed_at = admin.firestore.FieldValue.serverTimestamp();
      }
      await skillRef.set(update, { merge: true });
    }

    // Compute cooldown_until on fail
    let cooldownUntil: string | undefined;
    if (!passed) {
      cooldownUntil = new Date(submittedAt + COOLDOWN_DAYS_ON_FAIL * 24 * 60 * 60 * 1000).toISOString();
    }

    // Attempt already marked submitted via transaction above — clean up the doc.
    // Fire-and-forget: failure is harmless (periodic cleanup job handles stragglers).
    attemptRef.delete().catch(() => {});

    // Check if next level is unlocked
    const nextLevelUnlocked = passed && stored.level < 3;

    res.json({
      passed, score_pct: scorePct,
      correct_count: correctCount, total_count: totalCount,
      credits_awarded: creditsAwarded,
      cooldown_until: cooldownUntil,
      integrity_flagged: integrityFlagged,
      flag_reasons: flagReasons,
      breakdown,
      next_level_unlocked: nextLevelUnlocked,
    });
  } catch (err: any) {
    console.error("[PLACEMENT] submit-attempt:", err?.message);
    res.status(500).json({ error: "Failed to submit attempt" });
  }
});

// GET /api/placement/attempts/:skill — student's attempt history for a skill
router.get("/api/placement/attempts/:skill", requireCareerPremium, async (req: Request, res: Response) => {
  try {
    const user = await verifyUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    const skill = decodeURIComponent(req.params.skill || "");
    if (!skill) return res.status(400).json({ error: "Missing skill" });
    if (!getFirebaseAdmin()) return res.status(500).json({ error: "Firebase unavailable" });

    const db = admin.firestore();
    const sk = skillKey(skill);
    const snap = await db.collection("skill_attempts").doc(user.uid).collection("attempts")
      .where("skill_key", "==", sk).get();
    const attempts: any[] = [];
    snap.forEach(d => {
      const data: any = d.data();
      // Strip server-only fields
      delete data.submission_texts;
      attempts.push({ id: d.id, ...data });
    });
    attempts.sort((a, b) => (b.submitted_at_ms || 0) - (a.submitted_at_ms || 0));

    // Summary by level
    const summary = { level_1: { passed: false, best: 0, attempts: 0 }, level_2: { passed: false, best: 0, attempts: 0 }, level_3: { passed: false, best: 0, attempts: 0 } };
    for (const a of attempts) {
      const k = `level_${a.level}` as keyof typeof summary;
      if (summary[k]) {
        summary[k].attempts++;
        summary[k].passed = summary[k].passed || a.passed;
        summary[k].best = Math.max(summary[k].best, a.score_pct || 0);
      }
    }
    res.json({ skill, attempts, summary });
  } catch (err: any) {
    console.error("[PLACEMENT] attempts:", err?.message);
    res.status(500).json({ error: "Failed to fetch attempts" });
  }
});

// GET /api/placement/skill-progress — fetch all skill_progress docs for current user
router.get("/api/placement/skill-progress", requireCareerPremium, async (req: Request, res: Response) => {
  try {
    const user = await verifyUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    if (!getFirebaseAdmin()) return res.status(500).json({ error: "Firebase unavailable" });
    const db = admin.firestore();
    const snap = await db.collection("skill_progress").doc(user.uid).collection("skills").get();
    const progress: Record<string, any> = {};
    snap.forEach(d => { progress[d.id] = d.data(); });
    res.json({ progress });
  } catch (err: any) {
    console.error("[PLACEMENT] skill-progress:", err?.message);
    res.status(500).json({ error: "Failed to fetch skill progress" });
  }
});

// Legacy endpoints — return helpful errors so old clients fail loudly
router.post("/api/placement/generate-questions", (_req, res) => {
  res.status(410).json({ error: "Use /api/placement/start-attempt with {skill, level}." });
});
router.post("/api/placement/score", (_req, res) => {
  res.status(410).json({ error: "Use /api/placement/submit-attempt with {attempt_id, answers}." });
});
router.post("/api/placement/log-violation", (_req, res) => {
  res.json({ ok: true, deprecated: true });
});

// ─── POST /api/placement/save-profile ────────────────────────────────────────
router.post("/api/placement/save-profile", requireCareerPremium, async (req: Request, res: Response) => {
  try {
    const user = await verifyUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const { degree, target_role, self_reported_cgpa, skills_selected, university = "ADYPU", batch = "2025" } = req.body || {};
    if (!degree || !Array.isArray(skills_selected) || !skills_selected.length) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    if (!getFirebaseAdmin()) return res.status(500).json({ error: "Firebase unavailable" });

    const db = admin.firestore();
    const now = admin.firestore.FieldValue.serverTimestamp();
    const cgpaNum = parseFloat(self_reported_cgpa) || 0;

    // Legacy schema (kept for older readers)
    await db.collection("placement_assessments").doc(user.uid).collection("profile").doc("data").set({
      uid: user.uid, email: user.email || null,
      degree, target_role,
      self_reported_cgpa: cgpaNum,
      skills_selected, university, batch,
      started_at: now,
    }, { merge: true });

    // T005: Unified profile doc readers (readiness-score, funnel-stats, transcript) consume.
    await db.collection("placement_profiles").doc(user.uid).set({
      uid: user.uid,
      email: user.email || null,
      degree,
      target_role,
      year: req.body?.year || null,
      self_reported_cgpa: cgpaNum,
      selected_skills: skills_selected,
      university,
      batch,
      last_updated: now,
    }, { merge: true });

    res.json({ ok: true });
  } catch (err: any) {
    console.error("[PLACEMENT] save-profile:", err?.message);
    res.status(500).json({ error: "Failed to save profile" });
  }
});

// ─── POST /api/placement/update-skill-status ─────────────────────────────────
// Student marks a skill as learning / self_completed / not_started.
// Server validates status & looks up credits from the trusted catalog (ignores client value).
router.post("/api/placement/update-skill-status", requireCareerPremium, async (req: Request, res: Response) => {
  try {
    const user = await verifyUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const { skill, status } = req.body || {};
    if (!skill || !status) return res.status(400).json({ error: "Missing skill or status" });

    const allowed = ["not_started", "learning", "self_completed"];
    if (!allowed.includes(status)) {
      return res.status(400).json({ error: "Invalid status. coe_verified can only be set by the COE office." });
    }
    if (!getFirebaseAdmin()) return res.status(500).json({ error: "Firebase unavailable" });

    const db = admin.firestore();
    const sk = skillKey(skill);
    const ref = db.collection("skill_progress").doc(user.uid).collection("skills").doc(sk);

    // Preserve a coe_verified status — students cannot un-verify themselves.
    const existing = await ref.get();
    if (existing.exists && existing.data()?.status === "coe_verified") {
      return res.status(403).json({ error: "Skill already COE-verified — cannot be modified by the student." });
    }

    const credits = lookupCredits(skill); // SERVER-side lookup — never trust client
    const update: any = {
      skill, status, credits,
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
    };
    if (status === "learning") update.started_at = admin.firestore.FieldValue.serverTimestamp();
    if (status === "self_completed") update.completed_at = admin.firestore.FieldValue.serverTimestamp();

    await ref.set(update, { merge: true });
    res.json({ ok: true, credits });
  } catch (err: any) {
    console.error("[PLACEMENT] update-skill-status:", err?.message);
    res.status(500).json({ error: "Failed to update skill status" });
  }
});

// ─── POST /api/placement/save-result — submit profile to placement cell ──────
// Server RECOMPUTES credits from skill_progress (never trusts client overall_score)
router.post("/api/placement/save-result", requireCareerPremium, async (req: Request, res: Response) => {
  try {
    const user = await verifyUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const {
      degree, target_role, self_reported_cgpa, name,
      university = "ADYPU", batch = "2025",
    } = req.body || {};
    if (!getFirebaseAdmin()) return res.status(500).json({ error: "Firebase unavailable" });

    const db = admin.firestore();

    // Load profile to get the student's selected-skills set (the credit denominator).
    const profileSnap = await db.collection("placement_assessments").doc(user.uid).collection("profile").doc("data").get();
    if (!profileSnap.exists) return res.status(400).json({ error: "Profile not found. Set up your placement track first." });
    const profile = profileSnap.data()!;
    const skillsSelected: string[] = Array.isArray(profile.skills_selected) ? profile.skills_selected : [];
    if (skillsSelected.length === 0) return res.status(400).json({ error: "No skills selected on your profile." });

    // Load all skill_progress docs and recompute credits server-side.
    const progressSnap = await db.collection("skill_progress").doc(user.uid).collection("skills").get();
    const progressByKey: Record<string, any> = {};
    progressSnap.forEach(d => { progressByKey[d.id] = d.data(); });

    const skillsSummary: Record<string, any> = {};
    let creditsTotal = 0, creditsEarned = 0, creditsVerified = 0;
    for (const s of skillsSelected) {
      const credits = lookupCredits(s);
      const p = progressByKey[skillKey(s)];
      const status = p?.status || "not_started";
      const earned = (status === "self_completed" || status === "coe_verified") ? credits : 0;
      const verified = status === "coe_verified" ? credits : 0;
      creditsTotal += credits;
      creditsEarned += earned;
      creditsVerified += verified;
      skillsSummary[s] = { status, credits_earned: earned, credits_total: credits };
    }
    // Coding Arena readiness (0-100) — counts 10% of the submitted score so
    // coding practice reflects in the COE/admin shortlist, mirroring the 10%
    // coding weight in the student-facing readiness score.
    let codingScore = 0;
    try {
      const codingSnap = await db.collection("coding_user_progress").doc(user.uid).get();
      if (codingSnap.exists) {
        const cp = codingSnap.data() as any;
        const raw = typeof cp?.codingReadinessScore === "number" ? cp.codingReadinessScore : 0;
        codingScore = Math.round(Math.max(0, Math.min(100, raw)));
      }
    } catch { /* best-effort — never block submission */ }

    const creditScore = creditsTotal > 0 ? Math.round((creditsEarned / creditsTotal) * 100) : 0;
    // Coding is a boost, never a penalty: blend at 10% weight but never let
    // the blended score fall below the pure credit score, so students who
    // already qualify on credits are not disqualified by low coding activity.
    const overallScore = Math.max(creditScore, Math.round(creditScore * 0.9 + codingScore * 0.1));
    const placementEligible = overallScore >= 70;

    if (!placementEligible) {
      return res.status(400).json({
        error: `Not eligible — readiness ${overallScore}% (need 70%). Credits: ${creditsEarned}/${creditsTotal}, coding: ${codingScore}%.`,
        credits_earned: creditsEarned, credits_total: creditsTotal,
      });
    }

    await db.collection("placement_assessments").doc(user.uid).collection("result").doc("data").set({
      overall_score: overallScore, placement_eligible: true, skills_summary: skillsSummary,
      credits_earned: creditsEarned, credits_total: creditsTotal, credits_verified: creditsVerified,
      coding_score: codingScore,
      submitted_at: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    const displayName = name || user.email?.split("@")[0] || "Student";
    await db.collection("placement_shortlist").doc(university).collection(batch).doc(user.uid).set({
      uid: user.uid, email: user.email || null, name: displayName,
      branch: degree || profile.degree, target_role: target_role || profile.target_role,
      overall_score: overallScore, skills_summary: skillsSummary,
      credits_earned: creditsEarned, credits_total: creditsTotal, credits_verified: creditsVerified,
      coding_score: codingScore,
      cgpa_self_reported: parseFloat(self_reported_cgpa) || profile.self_reported_cgpa || 0,
      coe_status: "pending_coe", flag_count: 0, placement_final: false,
      submitted_at: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    res.json({ ok: true, placement_eligible: true, credits_earned: creditsEarned, credits_total: creditsTotal });
  } catch (err: any) {
    console.error("[PLACEMENT] save-result:", err?.message);
    res.status(500).json({ error: "Failed to save result" });
  }
});

// ─── GET /api/placement/shortlist — COE-staff only ──────────────────────────
router.get("/api/placement/shortlist", async (req: Request, res: Response) => {
  try {
    const staff = await verifyCoeStaff(req);
    if (!staff) return res.status(403).json({ error: "COE staff access required" });

    const university = (req.query.university as string) || "ADYPU";
    const batch = (req.query.batch as string) || "2025";
    if (!getFirebaseAdmin()) return res.status(500).json({ error: "Firebase unavailable" });

    const db = admin.firestore();
    const snap = await db.collection("placement_shortlist").doc(university).collection(batch).get();
    const students: any[] = [];
    snap.forEach(doc => students.push({ id: doc.id, ...doc.data() }));
    res.json({ students });
  } catch (err: any) {
    console.error("[PLACEMENT] shortlist:", err?.message);
    res.status(500).json({ error: "Failed to fetch shortlist" });
  }
});

// ─── POST /api/placement/coe-action — COE-staff only ────────────────────────
router.post("/api/placement/coe-action", async (req: Request, res: Response) => {
  try {
    const staff = await verifyCoeStaff(req);
    if (!staff) return res.status(403).json({ error: "COE staff access required" });

    const {
      studentUid, action, verified_cgpa, verified_skills,
      university = "ADYPU", batch = "2025",
    } = req.body || {};
    if (!studentUid || !action) return res.status(400).json({ error: "Missing fields" });
    if (!getFirebaseAdmin()) return res.status(500).json({ error: "Firebase unavailable" });

    const db = admin.firestore();
    const ref = db.collection("placement_shortlist").doc(university).collection(batch).doc(studentUid);
    const update: any = { updated_at: admin.firestore.FieldValue.serverTimestamp(), updated_by: staff.uid };

    if (action === "approve") {
      update.coe_status = "approved";
      update.placement_final = true;
      if (verified_cgpa != null) update.verified_cgpa = parseFloat(verified_cgpa);

      if (Array.isArray(verified_skills) && verified_skills.length > 0) {
        const batchOp = db.batch();
        let creditsVerified = 0;
        for (const s of verified_skills) {
          const skillName = typeof s === "object" ? s.skill : s;
          if (!skillName) continue;
          const credits = lookupCredits(skillName); // server-side lookup
          creditsVerified += credits;
          const skillRef = db.collection("skill_progress").doc(studentUid).collection("skills").doc(skillKey(skillName));
          batchOp.set(skillRef, {
            status: "coe_verified", credits,
            verified_at: admin.firestore.FieldValue.serverTimestamp(),
            verified_by: staff.uid,
          }, { merge: true });
        }
        await batchOp.commit();
        update.credits_verified = creditsVerified;
      }
    } else if (action === "flag") {
      update.coe_status = "flagged";
      update.flag_count = admin.firestore.FieldValue.increment(1);
    } else if (action === "request_proof") {
      update.coe_status = "proof_requested";
    } else if (action === "retake") {
      update.coe_status = "retake_required";
    } else {
      return res.status(400).json({ error: `Unknown action: ${action}` });
    }

    await ref.set(update, { merge: true });
    res.json({ ok: true });
  } catch (err: any) {
    console.error("[PLACEMENT] coe-action:", err?.message);
    res.status(500).json({ error: "Failed to update COE status" });
  }
});

// ─── T003: POST /api/placement/learning-path — AI-generated week-by-week plan ─
const PATH_SYSTEM_PROMPT = `You are an expert academic mentor for Indian engineering students.
Given a single skill, generate a week-by-week learning plan (4-12 weeks based on complexity).
Return ONLY valid JSON in this exact schema (no markdown, no backticks):
{
  "skill": "<skill name>",
  "total_weeks": <int 4-12>,
  "weeks": [
    {
      "week": 1,
      "title": "Foundations",
      "hours": 8,
      "daily_tasks": ["1-2 line task per day, 5-7 entries"],
      "resources": [{"title": "Course/video name", "type": "NPTEL|YouTube|Book|Platform|Article", "url": "https://..."}],
      "checkpoint": "Self-assessable test you must pass to mark this week done.",
      "milestone": "Optional capstone after this week (skip if none)"
    }
  ],
  "outcomes": ["3-5 sentences on what the student can do at the end"]
}

Rules:
- Be specific and Indian-context aware (NPTEL, GeeksforGeeks, Striver, freeCodeCamp, etc.)
- Real URLs only (or omit url field).
- Daily tasks must be actionable (e.g., "Solve 2 array problems on LeetCode", not "Practice arrays").
- Checkpoint must be measurable.`;

const LEARNING_PATH_RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    skill: { type: "STRING" },
    total_weeks: { type: "INTEGER" },
    weeks: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          week: { type: "INTEGER" },
          title: { type: "STRING" },
          hours: { type: "NUMBER" },
          daily_tasks: { type: "ARRAY", items: { type: "STRING" } },
          resources: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                title: { type: "STRING" },
                type: { type: "STRING", enum: ["NPTEL", "YouTube", "Book", "Platform", "Article"] },
                url: { type: "STRING" },
              },
              required: ["title", "type"],
            },
          },
          checkpoint: { type: "STRING" },
          milestone: { type: "STRING" },
        },
        required: ["week", "title", "hours", "daily_tasks", "resources", "checkpoint"],
      },
    },
    outcomes: { type: "ARRAY", items: { type: "STRING" } },
  },
  required: ["skill", "total_weeks", "weeks", "outcomes"],
};

function isLearningPath(value: any): boolean {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  if (typeof value.skill !== "string" || !Number.isInteger(value.total_weeks) ||
      value.total_weeks < 4 || value.total_weeks > 12 ||
      !Array.isArray(value.weeks) || value.weeks.length !== value.total_weeks ||
      !Array.isArray(value.outcomes) || value.outcomes.length < 3 || value.outcomes.length > 5 ||
      !value.outcomes.every((outcome: unknown) => typeof outcome === "string")) return false;
  return value.weeks.every((week: any, index: number) =>
    week && typeof week === "object" && !Array.isArray(week) &&
    week.week === index + 1 && typeof week.title === "string" &&
    typeof week.hours === "number" && Number.isFinite(week.hours) &&
    Array.isArray(week.daily_tasks) && week.daily_tasks.length >= 5 && week.daily_tasks.length <= 7 &&
    week.daily_tasks.every((task: unknown) => typeof task === "string") &&
    Array.isArray(week.resources) && week.resources.every((resource: any) =>
      resource && typeof resource.title === "string" &&
      ["NPTEL", "YouTube", "Book", "Platform", "Article"].includes(resource.type) &&
      (resource.url === undefined || typeof resource.url === "string")) &&
    typeof week.checkpoint === "string" &&
    (week.milestone === undefined || typeof week.milestone === "string"));
}

router.post("/api/placement/learning-path", requireCareerPremium, rateLimitMiddleware.sensitive, async (req: Request, res: Response) => {
  // Track user for concurrency-slot release in catch block
  let lpUser: { uid: string; email?: string } | null = null;
  try {
    const user = await verifyUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    lpUser = user;

    const { skill } = req.body || {};
    if (!skill || typeof skill !== "string" || skill.length > 100) {
      return res.status(400).json({ error: "skill required (max 100 chars)" });
    }

    // 30-day Firestore cache — most requests return here without hitting Gemini
    if (getFirebaseAdmin()) {
      const db = admin.firestore();
      const cacheRef = db.collection("learning_paths").doc(skillKey(skill));
      const cached = await cacheRef.get();
      if (cached.exists) {
        const data = cached.data();
        const ageMs = Date.now() - (data?.cached_at?.toMillis?.() || 0);
        if (ageMs < 30 * 24 * 60 * 60 * 1000) {
          return res.json({ path: data?.path, cached: true });
        }
      }
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(503).json({ error: "AI service unavailable", detail: "GEMINI_API_KEY not configured" });
    }

    // AI guard — only reached on cache miss (≈once per skill per month per user)
    // Uses "default" quota (5/day). Legitimate students rarely exceed this since
    // the 30-day cache means each skill only needs one real Gemini call per month.
    const gate = await aiGate(user.uid, "default");
    if (gate) return res.status(gate.status).json(gate.body);

    let response: any;
    try {
      const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      response = await withAITimeout(() => client.models.generateContent({
        model: process.env.GEMINI_MODEL || "gemini-3.5-flash-lite",
        contents: `Generate a focused week-by-week learning plan for the skill: "${skill}". Target audience: Indian engineering undergraduate (year 2-4) preparing for placements.`,
        config: {
          systemInstruction: PATH_SYSTEM_PROMPT,
          responseMimeType: "application/json",
          responseSchema: LEARNING_PATH_RESPONSE_SCHEMA,
          maxOutputTokens: 4000,
        },
      }));
      recordAISuccess();
    } catch (aiErr: any) {
      recordAIFailure();
      releaseConcurrencySlot(user.uid, "default");
      const isTimeout = aiErr?.message === "AI_TIMEOUT";
      return res.status(isTimeout ? 504 : 503).json({
        error: isTimeout ? "AI timed out. Please try again." : "AI service unavailable",
        detail: aiErr?.message,
      });
    }
    releaseConcurrencySlot(user.uid, "default");

    let parsed: any;
    try {
      const text = response?.text;
      if (typeof text !== "string" || !text.trim()) throw new Error("Gemini returned no usable text");
      parsed = JSON.parse(text);
      if (!isLearningPath(parsed)) throw new Error("Gemini response did not match the learning-path schema");
    } catch {
      recordAIFailure();
      return res.status(502).json({
        error: "ai_response_invalid",
        message: "The learning-path AI returned an invalid response. Please retry.",
      });
    }

    if (getFirebaseAdmin()) {
      const db = admin.firestore();
      await db.collection("learning_paths").doc(skillKey(skill)).set({
        skill, path: parsed,
        cached_at: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    res.json({ path: parsed, cached: false });
  } catch (err: any) {
    if (lpUser) releaseConcurrencySlot(lpUser.uid, "default");
    console.error("[PLACEMENT] learning-path:", err?.message);
    res.status(500).json({ error: "Failed to generate learning path", detail: err?.message });
  }
});

// ─── T005: GET /api/placement/readiness-score — weighted gating score ────────
// Skills 35% + COE Credits 20% + Portal Activity 25% + Profile 10% + CGPA 10%
router.get("/api/placement/readiness-score", requireCareerPremium, async (req: Request, res: Response) => {
  try {
    const user = await verifyUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    if (!getFirebaseAdmin()) return res.status(503).json({ error: "Firebase unavailable" });

    const db = admin.firestore();
    const breakdown = {
      skills: { score: 0, weight: 30, max: 30 },
      coe_credits: { score: 0, weight: 20, max: 20 },
      portal_activity: { score: 0, weight: 20, max: 20 },
      profile: { score: 0, weight: 10, max: 10 },
      cgpa: { score: 0, weight: 10, max: 10 },
      coding: { score: 0, weight: 10, max: 10 },
    };
    const gaps: string[] = [];

    // Skills (35%) — % of selected skills with status learning+ or above
    const profileSnap = await db.collection("placement_profiles").doc(user.uid).get();
    const profile = profileSnap.exists ? profileSnap.data() : null;
    const selectedSkills: string[] = profile?.selected_skills || [];

    const skillSnap = await db.collection("skill_progress").doc(user.uid).collection("skills").get();
    const skillsByKey: Record<string, any> = {};
    skillSnap.forEach(d => { skillsByKey[d.id] = d.data(); });

    let totalCreditsAvailable = 0;
    let totalCreditsEarned = 0;
    let totalCreditsVerified = 0;
    let testsPassed = 0;
    for (const sk of selectedSkills) {
      const credits = lookupCredits(sk);
      totalCreditsAvailable += credits;
      const p = skillsByKey[skillKey(sk)] || {};
      if (p.status === "self_completed" || p.status === "coe_verified") totalCreditsEarned += credits;
      if (p.status === "coe_verified") totalCreditsVerified += credits;
      const lvls = p.levels || {};
      if (lvls.level_1?.passed) testsPassed++;
      if (lvls.level_2?.passed) testsPassed++;
      if (lvls.level_3?.passed) testsPassed++;
    }
    if (totalCreditsAvailable > 0) {
      breakdown.skills.score = Math.min(30, Math.round((totalCreditsEarned / totalCreditsAvailable) * 30));
    }
    if (breakdown.skills.score < 21) {
      gaps.push(`Complete more selected skills (${totalCreditsEarned}/${totalCreditsAvailable} credits earned).`);
    }

    // COE Credits (20%) — % of total credits that are COE-verified
    if (totalCreditsAvailable > 0) {
      breakdown.coe_credits.score = Math.min(20, Math.round((totalCreditsVerified / totalCreditsAvailable) * 20));
    }
    if (breakdown.coe_credits.score < 10) {
      gaps.push("Submit completed skills to COE for verification (boosts your score significantly).");
    }

    // Portal Activity (25%) — test attempts, profile updates, and the student's
    // progress on their institution's published roadmap (ties institutional
    // progress into placement readiness).
    const attemptsSnap = await db.collection("skill_attempts").doc(user.uid).collection("attempts").get();
    const totalAttempts = attemptsSnap.size;

    // Institutional roadmap progress (0-100) for the student's degree.
    let institutionalProgress = 0;
    try {
      const dk = degreeKey(profile?.degree);
      if (dk) {
        const instSnap = await db.collection("users").doc(user.uid).collection("institutionalProgress").doc(dk).get();
        if (instSnap.exists) {
          const ip = instSnap.data() as any;
          const raw = typeof ip?.progressScore === "number" ? ip.progressScore : 0;
          institutionalProgress = Math.max(0, Math.min(100, raw));
        }
      }
    } catch { /* best-effort — never block scoring */ }

    let activityRaw = 0;
    activityRaw += Math.min(6, totalAttempts);
    activityRaw += Math.min(6, testsPassed * 2);
    activityRaw += profile?.last_updated ? 3 : 0;
    activityRaw += Math.round((institutionalProgress / 100) * 5); // up to +5 from institutional roadmap
    breakdown.portal_activity.score = Math.min(20, activityRaw);
    if (breakdown.portal_activity.score < 12) {
      gaps.push("Engage more — take assessments, update profile, complete weekly checkpoints.");
    }
    if (institutionalProgress > 0 && institutionalProgress < 60) {
      gaps.push(`Advance your institutional roadmap — currently ${institutionalProgress}% complete. It feeds your placement readiness.`);
    }

    // Profile (10%) — degree + year + target_role + selected_skills set
    let profileScore = 0;
    if (profile?.degree) profileScore += 2.5;
    if (profile?.target_role) profileScore += 2.5;
    if (selectedSkills.length >= 3) profileScore += 2.5;
    if (profile?.year) profileScore += 2.5;
    breakdown.profile.score = Math.round(profileScore);
    if (breakdown.profile.score < 7) {
      gaps.push("Fill out your full placement profile (degree, year, target role, ≥3 skills).");
    }

    // CGPA (10%) — proportional to verified or self-reported CGPA
    const cgpa = profile?.verified_cgpa || profile?.self_reported_cgpa || 0;
    breakdown.cgpa.score = Math.min(10, Math.round((cgpa / 10) * 10));
    if (breakdown.cgpa.score < 6) {
      gaps.push(`Improve CGPA — currently ${cgpa || "not reported"}. Aim for 7.0+ to unlock more roles.`);
    }

    // Coding (10%) — Coding Arena readiness score (0-100 → 0-10)
    try {
      const codingSnap = await db.collection("coding_user_progress").doc(user.uid).get();
      if (codingSnap.exists) {
        const cp = codingSnap.data() as any;
        const cScore = typeof cp?.codingReadinessScore === "number" ? cp.codingReadinessScore : 0;
        breakdown.coding.score = Math.min(10, Math.round((Math.max(0, Math.min(100, cScore)) / 100) * 10));
      }
    } catch { /* best-effort — never block scoring */ }
    if (breakdown.coding.score < 5) {
      gaps.push("Practice in the Coding Arena — solving roadmap-aligned problems boosts your readiness.");
    }

    const total = Object.values(breakdown).reduce((s, b) => s + b.score, 0);
    const threshold = 70;
    // Platform admin tester bypass: always eligible (real breakdown still shown).
    const isPlatformAdmin = !!user.email && user.email.toLowerCase() === PLATFORM_ADMIN_EMAIL.toLowerCase();
    res.json({ total, threshold, eligible: isPlatformAdmin || total >= threshold, breakdown, gaps });
  } catch (err: any) {
    console.error("[PLACEMENT] readiness-score:", err?.message);
    res.status(500).json({ error: "Failed to compute readiness", detail: err?.message });
  }
});

// ─── T006/T007: GET /api/placement/funnel-stats — SPCR readiness funnel ──────
router.get("/api/placement/funnel-stats", async (req: Request, res: Response) => {
  try {
    const staff = await verifyCoeStaff(req);
    if (!staff) return res.status(403).json({ error: "COE staff access required" });
    if (!getFirebaseAdmin()) return res.status(503).json({ error: "Firebase unavailable" });
    const db = admin.firestore();

    const profilesSnap = await db.collection("placement_profiles").get();
    const enrolled = profilesSnap.size;

    let started = 0, l1 = 0, l2 = 0, l3 = 0;
    for (const p of profilesSnap.docs) {
      const skillsSnap = await db.collection("skill_progress").doc(p.id).collection("skills").get();
      let hasAny = false, hasL1 = false, hasL2 = false, hasL3 = false;
      skillsSnap.forEach(d => {
        const data = d.data();
        if (data.status && data.status !== "not_started") hasAny = true;
        if (data.levels?.level_1?.passed) hasL1 = true;
        if (data.levels?.level_2?.passed) hasL2 = true;
        if (data.levels?.level_3?.passed) hasL3 = true;
      });
      if (hasAny) started++;
      if (hasL1) l1++;
      if (hasL2) l2++;
      if (hasL3) l3++;
    }

    const eligibleSnap = await db.collectionGroup("2025").where("placement_final", "==", true).get();
    res.json({ enrolled, started, l1_passed: l1, l2_passed: l2, l3_passed: l3, eligible: eligibleSnap.size });
  } catch (err: any) {
    console.error("[PLACEMENT] funnel-stats:", err?.message);
    res.status(500).json({ error: "Failed to compute funnel" });
  }
});

// ─── T007: POST /api/placement/coe-bulk-action — bulk approve/flag ──────────
router.post("/api/placement/coe-bulk-action", async (req: Request, res: Response) => {
  try {
    const staff = await verifyCoeStaff(req);
    if (!staff) return res.status(403).json({ error: "COE staff access required" });
    const { studentUids, action, reason, university = "ADYPU", batch = "2025" } = req.body || {};
    if (!Array.isArray(studentUids) || studentUids.length === 0) return res.status(400).json({ error: "studentUids[] required" });
    if (!["approve", "flag", "request_proof"].includes(action)) return res.status(400).json({ error: "Invalid action" });
    if (!getFirebaseAdmin()) return res.status(503).json({ error: "Firebase unavailable" });

    const db = admin.firestore();
    const batchOp = db.batch();
    const now = admin.firestore.FieldValue.serverTimestamp();

    for (const uid of studentUids) {
      const ref = db.collection("placement_shortlist").doc(university).collection(batch).doc(uid);
      const update: any = { updated_at: now, updated_by: staff.uid };
      if (action === "approve") {
        update.coe_status = "approved";
        update.placement_final = true;
      } else if (action === "flag") {
        update.coe_status = "flagged";
        update.flag_count = admin.firestore.FieldValue.increment(1);
        if (reason) update.flag_reason = reason;
      } else if (action === "request_proof") {
        update.coe_status = "proof_requested";
        if (reason) update.proof_reason = reason;
      }
      batchOp.set(ref, update, { merge: true });

      // Notify student via skill_progress notifications
      if (action === "request_proof" || action === "flag") {
        const notifRef = db.collection("placement_notifications").doc(uid).collection("items").doc();
        batchOp.set(notifRef, {
          type: action === "flag" ? "flagged" : "proof_requested",
          message: reason || (action === "flag" ? "Your submission has been flagged for review." : "Please submit supporting documents."),
          created_at: now, read: false, from_uid: staff.uid,
        });
      }
    }
    await batchOp.commit();
    res.json({ ok: true, count: studentUids.length });
  } catch (err: any) {
    console.error("[PLACEMENT] coe-bulk-action:", err?.message);
    res.status(500).json({ error: "Bulk action failed" });
  }
});

// ─── T007: GET /api/placement/transcript/:uid — credit ledger transcript ─────
router.get("/api/placement/transcript/:uid", async (req: Request, res: Response) => {
  try {
    const requester = await verifyUser(req);
    if (!requester) return res.status(401).json({ error: "Unauthorized" });
    const targetUid = req.params.uid;

    // Self-access OR COE staff
    const staff = await verifyCoeStaff(req);
    if (requester.uid !== targetUid && !staff) return res.status(403).json({ error: "Forbidden" });
    if (!getFirebaseAdmin()) return res.status(503).json({ error: "Firebase unavailable" });

    const db = admin.firestore();
    const profileSnap = await db.collection("placement_profiles").doc(targetUid).get();
    const profile = profileSnap.exists ? profileSnap.data() : null;
    const skillsSnap = await db.collection("skill_progress").doc(targetUid).collection("skills").get();
    const attemptsSnap = await db.collection("skill_attempts").doc(targetUid).collection("attempts").orderBy("submitted_at", "desc").get();

    const skills: any[] = [];
    skillsSnap.forEach(d => skills.push({ skill_key: d.id, ...d.data() }));
    const attempts: any[] = [];
    attemptsSnap.forEach(d => attempts.push({ id: d.id, ...d.data() }));

    res.json({
      uid: targetUid,
      profile,
      skills,
      attempts,
      generated_at: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error("[PLACEMENT] transcript:", err?.message);
    res.status(500).json({ error: "Failed to build transcript" });
  }
});

// ─── T007: GET /api/placement/flagged-attempts ────────────────────────────────
router.get("/api/placement/flagged-attempts", async (req: Request, res: Response) => {
  try {
    const staff = await verifyCoeStaff(req);
    if (!staff) return res.status(403).json({ error: "COE staff only" });
    if (!getFirebaseAdmin()) return res.status(503).json({ error: "Firebase unavailable" });
    const db = admin.firestore();
    const snap = await db.collectionGroup("attempts")
      .where("needs_coe_review", "==", true)
      .limit(200).get();
    const attempts: any[] = [];
    snap.forEach(d => {
      const raw = d.data();
      const out: any = { doc_id: d.id };
      for (const [k, v] of Object.entries(raw)) {
        out[k] = (v && typeof (v as any).toDate === "function") ? (v as any).toDate().toISOString() : v;
      }
      attempts.push(out);
    });
    attempts.sort((a, b) => (b.submitted_at || "").localeCompare(a.submitted_at || ""));
    res.json({ attempts });
  } catch (err: any) {
    console.error("[PLACEMENT] flagged-attempts:", err?.message);
    res.json({ attempts: [], _warn: err?.message });
  }
});

// ─── T007: POST /api/placement/resolve-flagged-attempt ───────────────────────
router.post("/api/placement/resolve-flagged-attempt", async (req: Request, res: Response) => {
  try {
    const staff = await verifyCoeStaff(req);
    if (!staff) return res.status(403).json({ error: "COE staff only" });
    if (!getFirebaseAdmin()) return res.status(503).json({ error: "Firebase unavailable" });
    const { uid, attemptId, action } = req.body;
    if (!uid || !attemptId || !["approve_credits", "dismiss"].includes(action)) {
      return res.status(400).json({ error: "uid, attemptId and valid action required" });
    }
    const db = admin.firestore();
    const attemptRef = db.collection("skill_attempts").doc(uid).collection("attempts").doc(attemptId);
    const snap = await attemptRef.get();
    if (!snap.exists) return res.status(404).json({ error: "Attempt not found" });
    const attempt = snap.data()!;
    const now = admin.firestore.FieldValue.serverTimestamp();
    if (action === "approve_credits") {
      const skey = skillKey(attempt.skill || "unknown");
      const skillRef = db.collection("skill_progress").doc(uid).collection("skills").doc(skey);
      const lvl = `l${attempt.level}`;
      await skillRef.set({
        [`levels.${lvl}.passed`]: true,
        [`levels.${lvl}.credits_earned`]: attempt.credits_on_pass || 0,
        coe_approved: true,
      }, { merge: true });
      await attemptRef.update({ needs_coe_review: false, coe_approved: true, approved_by: staff.uid });
      await db.collection("placement_notifications").doc(uid).collection("items").doc().set({
        type: "credits_approved",
        message: `Your ${attempt.skill} Level ${attempt.level} assessment has been approved by COE. Credits awarded!`,
        created_at: now, read: false, from_uid: staff.uid,
      });
    } else {
      await attemptRef.update({ needs_coe_review: false, dismissed_by: staff.uid });
      await db.collection("placement_notifications").doc(uid).collection("items").doc().set({
        type: "review_dismissed",
        message: `Your ${attempt.skill} Level ${attempt.level} assessment review has been closed. Credits were not awarded for this attempt.`,
        created_at: now, read: false, from_uid: staff.uid,
      });
    }
    res.json({ ok: true });
  } catch (err: any) {
    console.error("[PLACEMENT] resolve-flagged:", err?.message);
    res.status(500).json({ error: "Failed" });
  }
});

// ─── T006: GET /api/placement/drives ─────────────────────────────────────────
router.get("/api/placement/drives", async (req: Request, res: Response) => {
  try {
    const staff = await verifyCoeStaff(req);
    if (!staff) return res.status(403).json({ error: "COE staff only" });
    if (!getFirebaseAdmin()) return res.status(503).json({ error: "Firebase unavailable" });
    const db = admin.firestore();
    const university = (req.query.university as string) || "ADYPU";
    const batch = (req.query.batch as string) || "2025";
    const snap = await db.collection("placement_drives").doc(university).collection(batch)
      .orderBy("created_at", "desc").limit(50).get();
    const drives: any[] = [];
    snap.forEach(d => {
      const raw = d.data();
      const out: any = { id: d.id };
      for (const [k, v] of Object.entries(raw)) {
        out[k] = (v && typeof (v as any).toDate === "function") ? (v as any).toDate().toISOString() : v;
      }
      drives.push(out);
    });
    res.json({ drives });
  } catch (err: any) {
    console.error("[PLACEMENT] drives list:", err?.message);
    res.status(500).json({ error: "Failed" });
  }
});

// ─── T006: POST /api/placement/drives — create + auto-shortlist ───────────────
router.post("/api/placement/drives", async (req: Request, res: Response) => {
  try {
    const staff = await verifyCoeStaff(req);
    if (!staff) return res.status(403).json({ error: "COE staff only" });
    if (!getFirebaseAdmin()) return res.status(503).json({ error: "Firebase unavailable" });
    const { title, company, date, min_score = 0, min_cgpa = 0, branch_filter = "", university = "ADYPU", batch = "2025" } = req.body;
    if (!title?.trim() || !company?.trim()) return res.status(400).json({ error: "title and company required" });
    const db = admin.firestore();
    const allSnap = await db.collection("placement_shortlist").doc(university).collection(batch)
      .where("coe_status", "==", "approved").get();
    const shortlisted: string[] = [];
    allSnap.forEach((d: any) => {
      const s = d.data();
      if ((s.overall_score || 0) < parseFloat(min_score)) return;
      if ((s.cgpa_self_reported || 0) < parseFloat(min_cgpa)) return;
      if (branch_filter && !(s.branch || "").toLowerCase().includes(branch_filter.toLowerCase())) return;
      shortlisted.push(d.id);
    });
    const driveRef = db.collection("placement_drives").doc(university).collection(batch).doc();
    await driveRef.set({
      title: title.trim(), company: company.trim(), date: date || null,
      min_score: parseFloat(min_score), min_cgpa: parseFloat(min_cgpa), branch_filter,
      shortlisted_uids: shortlisted, shortlisted_count: shortlisted.length,
      invited_count: 0, status: "draft",
      created_by: staff.uid, created_at: admin.firestore.FieldValue.serverTimestamp(),
    });
    res.json({ ok: true, drive_id: driveRef.id, shortlisted_count: shortlisted.length });
  } catch (err: any) {
    console.error("[PLACEMENT] create drive:", err?.message);
    res.status(500).json({ error: "Failed to create drive" });
  }
});

// ─── T006: POST /api/placement/drives/:driveId/invite ────────────────────────
router.post("/api/placement/drives/:driveId/invite", async (req: Request, res: Response) => {
  try {
    const staff = await verifyCoeStaff(req);
    if (!staff) return res.status(403).json({ error: "COE staff only" });
    if (!getFirebaseAdmin()) return res.status(503).json({ error: "Firebase unavailable" });
    const { driveId } = req.params;
    const { university = "ADYPU", batch = "2025" } = req.body;
    const db = admin.firestore();
    const driveSnap = await db.collection("placement_drives").doc(university).collection(batch).doc(driveId).get();
    if (!driveSnap.exists) return res.status(404).json({ error: "Drive not found" });
    const drive = driveSnap.data()!;
    const uids: string[] = drive.shortlisted_uids || [];
    if (uids.length === 0) return res.json({ ok: true, invited: 0 });
    const batchOp = db.batch();
    const now = admin.firestore.FieldValue.serverTimestamp();
    for (const uid of uids) {
      const notifRef = db.collection("placement_notifications").doc(uid).collection("items").doc();
      batchOp.set(notifRef, {
        type: "drive_invite",
        message: `You have been shortlisted for "${drive.title}" at ${drive.company}. Log in to the placement portal to confirm your participation.`,
        drive_id: driveId, company: drive.company, date: drive.date || null,
        created_at: now, read: false, from_uid: staff.uid,
      });
    }
    await batchOp.commit();
    await driveSnap.ref.update({ invited_count: uids.length, status: "invited", invited_at: now });
    res.json({ ok: true, invited: uids.length });
  } catch (err: any) {
    console.error("[PLACEMENT] drive invite:", err?.message);
    res.status(500).json({ error: "Failed" });
  }
});

export default router;
