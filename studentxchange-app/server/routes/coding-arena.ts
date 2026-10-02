// ─── Coding Arena ─────────────────────────────────────────────────────────────
// Placement-prep coding module inside Career Compass Placement Readiness.
// Judge: Judge0 CE via RapidAPI (server-side only — key & hidden tests never
// reach the client). AI Coach: Gemini.
// Premium gating mirrors Career Compass: server is the sole authority.

import { Router, Request, Response } from "express";
import { GoogleGenAI } from "@google/genai";
import { getFirebaseAdmin, admin } from "../firebase-admin";
import { verifyUser, getSubscriptionStatus } from "./career-compass";
import { isCircuitOpen, recordAIFailure, recordAISuccess, withAITimeout } from "../utils/ai-guard";

const router = Router();

const PROBLEMS = "coding_problems";
const SUBMISSIONS = "coding_submissions";
const PROGRESS = "coding_user_progress";
const FEEDBACK = "coding_ai_feedback";

const JUDGE0_URL = "https://judge0-ce.p.rapidapi.com";
// Host and key are read from env at call time — never sent to the client.
function getJudgeCredentials() {
  const key  = process.env.RAPIDAPI_KEY  || process.env.JUDGE0_RAPIDAPI_KEY;
  const host = process.env.RAPIDAPI_HOST || "judge0-ce.p.rapidapi.com";
  if (!key) throw new Error("Judge service not configured (RAPIDAPI_KEY missing)");
  return { key, host };
}

// Judge0 CE language IDs — never sent to the client.
const LANG_IDS: Record<string, number> = {
  python:     71,  // Python 3.8.1
  javascript: 63,  // Node.js 12.14.0
  java:       62,  // OpenJDK 13.0.1
  c:          50,  // C GCC 9.2.0
  cpp:        54,  // C++ GCC 9.2.0
  csharp:     51,  // C# Mono 6.6.0
  go:         60,  // Go 1.13.5
  kotlin:     78,  // Kotlin 1.3.70
  rust:       73,  // Rust 1.40.0
  sql:        82,  // SQLite 3.27.2
};

// Human-readable labels (also used server-side for error messages)
const LANG_LABEL: Record<string, string> = {
  python: "Python", javascript: "JavaScript", java: "Java",
  c: "C", cpp: "C++", csharp: "C#", go: "Go", kotlin: "Kotlin", rust: "Rust", sql: "SQL",
};

// Judge0 status IDs
const J0_IN_QUEUE   = 1;
const J0_PROCESSING = 2;
const J0_ACCEPTED   = 3;
const J0_WA         = 4;  // Wrong Answer (we compare output ourselves; treat as mismatch)
const J0_TLE        = 5;
const J0_CE         = 6;  // Compilation Error
// 7-12 = Runtime Errors (SIGSEGV, SIGXFSZ, SIGFPE, SIGABRT, NZEC, Other)
// 13 = Internal Error, 14 = Exec Format Error

const FREE_DAILY_LIMIT = 3;

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";

// ─── In-memory submit rate limit: 1 submission per 5s per user ───────────────
const lastSubmitAt = new Map<string, number>();
function rateLimited(uid: string): boolean {
  const now = Date.now();
  const last = lastSubmitAt.get(uid) || 0;
  if (now - last < 5000) return true;
  lastSubmitAt.set(uid, now);
  return false;
}

// ─── Output normalization for comparison ─────────────────────────────────────
function normalizeOutput(s: string | null | undefined): string {
  if (!s) return "";
  return s
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((l) => l.replace(/\s+$/g, ""))
    .join("\n")
    .replace(/\n+$/g, "");
}

// ─── Judge0 single test run (async polling — API key never leaves server) ────
// 1. POST /submissions (no wait=true) → token
// 2. Poll GET /submissions/{token} every 600ms until status.id >= 3 (max 35s)
async function runTestCase(
  sourceCode: string,
  language: string,
  testInput: string,
  timeLimitMs: number,
  memoryLimitMb: number,
): Promise<{ stdout: string; statusId: number; statusDesc: string; timeMs: number; memoryKb: number; stderr: string; compileOutput: string }> {
  const { key, host } = getJudgeCredentials();

  const langId = LANG_IDS[language];
  if (!langId) throw new Error(`Unsupported language: ${LANG_LABEL[language] || language}`);

  // SQL: setup SQL is prepended to the user query; no stdin needed.
  const isSql = language === "sql";
  const source = isSql ? `${testInput}\n${sourceCode}` : sourceCode;
  const stdin  = isSql ? "" : testInput;

  // ── Step 1: Submit ─────────────────────────────────────────────────────────
  const submitResp = await fetch(`${JUDGE0_URL}/submissions?base64_encoded=true`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-RapidAPI-Key": key,
      "X-RapidAPI-Host": host,
    },
    body: JSON.stringify({
      source_code:    Buffer.from(source, "utf8").toString("base64"),
      language_id:    langId,
      stdin:          Buffer.from(stdin,  "utf8").toString("base64"),
      cpu_time_limit: Math.min(15, Math.max(1, Math.ceil(timeLimitMs / 1000))),
      memory_limit:   Math.min(512000, memoryLimitMb * 1024),
    }),
  });
  if (!submitResp.ok) {
    const txt = await submitResp.text().catch(() => "");
    throw new Error(`Judge submit ${submitResp.status}: ${txt.slice(0, 200)}`);
  }
  const submitted: any = await submitResp.json();
  const token: string  = submitted.token;
  if (!token) throw new Error("Judge returned no submission token");

  // ── Step 2: Poll until done (max 35 s @ 600 ms intervals) ─────────────────
  const MAX_POLLS     = 58;
  const POLL_MS       = 600;
  const b64 = (v: string | null | undefined) => (v ? Buffer.from(v, "base64").toString("utf8") : "");

  for (let i = 0; i < MAX_POLLS; i++) {
    await new Promise((r) => setTimeout(r, POLL_MS));
    let pollData: any;
    try {
      const pr = await fetch(`${JUDGE0_URL}/submissions/${token}?base64_encoded=true`, {
        headers: { "X-RapidAPI-Key": key, "X-RapidAPI-Host": host },
      });
      if (!pr.ok) continue; // transient HTTP error — retry
      pollData = await pr.json();
    } catch {
      continue; // network hiccup — retry
    }
    const sid: number = pollData.status?.id ?? 0;
    if (sid === J0_IN_QUEUE || sid === J0_PROCESSING) continue; // still running

    return {
      stdout:        b64(pollData.stdout),
      statusId:      sid,
      statusDesc:    pollData.status?.description ?? "Unknown",
      timeMs:        pollData.time ? Math.round(parseFloat(pollData.time) * 1000) : 0,
      memoryKb:      pollData.memory || 0,
      stderr:        b64(pollData.stderr),
      compileOutput: b64(pollData.compile_output),
    };
  }
  throw new Error("Judge timed out — submission exceeded 35 seconds");
}

type TestResult = {
  passed: boolean;
  isHidden: boolean;
  input?: string;
  expectedOutput?: string;
  actualOutput?: string;
  statusDesc: string;
  timeMs: number;
  memoryKb: number;
  error?: string;
};

async function judgeAll(
  problem: any,
  code: string,
  language: string,
  testCases: any[],
): Promise<{ results: TestResult[]; status: string; passed: number; total: number; maxTimeMs: number; maxMemoryKb: number }> {
  const results: TestResult[] = [];
  let status = "accepted";
  let maxTimeMs = 0;
  let maxMemoryKb = 0;

  for (const tc of testCases) {
    let r;
    try {
      r = await runTestCase(code, language, tc.input, problem.timeLimitMs || 2000, problem.memoryLimitMb || 128);
    } catch (e: any) {
      results.push({ passed: false, isHidden: !!tc.isHidden, statusDesc: "Judge Error", timeMs: 0, memoryKb: 0, error: e?.message });
      status = "runtime_error";
      break;
    }
    maxTimeMs = Math.max(maxTimeMs, r.timeMs);
    maxMemoryKb = Math.max(maxMemoryKb, r.memoryKb);

    // Determine per-case outcome from Judge0 status id.
    // J0_ACCEPTED (3) or J0_WA (4): compare stdout ourselves.
    // J0_TLE (5): time limit exceeded.
    // J0_CE (6): compilation error — fail fast, no further cases needed.
    // 7-12: runtime errors (SIGSEGV / SIGXFSZ / SIGFPE / SIGABRT / NZEC / Other).
    // 13-14: internal / exec-format error.
    let passed      = false;
    let caseStatus  = "";
    let errorOutput = "";

    if (r.statusId === J0_TLE) {
      caseStatus = "tle";
    } else if (r.statusId === J0_CE) {
      caseStatus  = "compile_error";
      errorOutput = r.compileOutput.trim().slice(0, 2000);
    } else if (r.statusId >= 7 && r.statusId <= 12) {
      caseStatus  = "runtime_error";
      // Include both stderr and compile_output (nzec / other can populate either)
      errorOutput = [r.stderr, r.compileOutput].filter(Boolean).join("\n").trim().slice(0, 2000);
    } else if (r.statusId === 13 || r.statusId === 14) {
      caseStatus  = "runtime_error";
      errorOutput = r.statusDesc; // "Internal Error" / "Exec Format Error"
    } else {
      // 3 (Accepted) or 4 (Judge WA — we compare ourselves)
      passed = normalizeOutput(r.stdout) === normalizeOutput(tc.expectedOutput);
    }

    results.push({
      passed,
      isHidden: !!tc.isHidden,
      ...(tc.isHidden
        ? {}
        : {
            input:          tc.input,
            expectedOutput: tc.expectedOutput,
            actualOutput:   r.stdout.slice(0, 2000),
          }),
      statusDesc: r.statusDesc,
      timeMs:     r.timeMs,
      memoryKb:   r.memoryKb,
      ...(errorOutput && !tc.isHidden ? { error: errorOutput } : {}),
    });

    if (!passed && status === "accepted") {
      status = caseStatus || "wrong_answer";
      // Fail fast on compile errors — remaining cases would all fail identically.
      if (caseStatus === "compile_error") break;
    }
  }

  const passed = results.filter((r) => r.passed).length;
  return { results, status, passed, total: testCases.length, maxTimeMs, maxMemoryKb };
}

// ─── Roadmap → unlocked skill tags ────────────────────────────────────────────
// Works for BOTH personal and institutional tracks: we match keywords against
// the student's roadmap JSON, placement profile skills, and institutional
// roadmap content for their degree.
const TAG_KEYWORDS: Record<string, string[]> = {
  "Programming Fundamentals": ["programming", "python", "java", "c++", "javascript", "coding", "fundamentals", "basics"],
  Arrays: ["array", "data structure", "dsa", "algorithm", "problem solving", "competitive"],
  Strings: ["string", "data structure", "dsa", "algorithm", "text processing"],
  "Data Structures": ["data structure", "dsa", "stack", "queue", "hash", "linked list"],
  Trees: ["tree", "binary tree", "bst", "dsa", "advanced data structure"],
  Graphs: ["graph", "network", "dsa", "advanced algorithm"],
  "Dynamic Programming": ["dynamic programming", "dp", "optimization", "advanced algorithm"],
  Recursion: ["recursion", "backtracking", "dsa", "algorithm"],
  "Problem Solving": ["problem solving", "dsa", "algorithm", "competitive", "aptitude", "logic"],
  SQL: ["sql", "database", "dbms", "mysql", "postgres", "data analy", "backend"],
  Databases: ["database", "dbms", "sql", "backend", "data engineer"],
};
const BASELINE_TAGS = ["Programming Fundamentals", "Arrays", "Strings"];

async function computeUnlockedTags(uid: string): Promise<{ unlockedSkillTags: string[]; currentFocusTag: string }> {
  const db = admin.firestore();
  const [roadmapSnap, placementSnap, profileSnap] = await Promise.all([
    db.collection("career_compass_roadmaps").doc(uid).get(),
    db.collection("placement_profiles").doc(uid).get(),
    db.collection("career_compass_profiles").doc(uid).get(),
  ]);

  let haystack = "";
  if (roadmapSnap.exists) haystack += JSON.stringify(roadmapSnap.data()?.roadmap || "");
  if (placementSnap.exists) {
    const p = placementSnap.data() as any;
    haystack += " " + (p?.selected_skills || []).join(" ") + " " + (p?.target_role || "");
  }
  if (profileSnap.exists) {
    const p = profileSnap.data() as any;
    haystack += " " + (p?.aspirations || []).join(" ") + " " + Object.keys(p?.skillStatus || {}).join(" ");
    haystack += " " + (p?.placementSelectedSkills || []).join(" ");
  }
  const hay = haystack.toLowerCase();

  const unlocked = new Set<string>(BASELINE_TAGS);
  for (const [tag, kws] of Object.entries(TAG_KEYWORDS)) {
    if (kws.some((k) => hay.includes(k))) unlocked.add(tag);
  }

  // Focus tag: first non-baseline unlocked tag, else Arrays.
  const focus =
    Array.from(unlocked).find((t) => !BASELINE_TAGS.includes(t)) ||
    "Arrays";

  return { unlockedSkillTags: Array.from(unlocked), currentFocusTag: focus };
}

// ─── Coding readiness score (0-100), computed server-side after submissions ──
function computeCodingScore(progress: any, totalUnlockedProblems: number): number {
  const solved: string[] = progress.solvedProblemIds || [];
  const bySkill = progress.bySkillTag || {};

  // 55% — share of unlocked-skill problems solved
  const pctSolved = totalUnlockedProblems > 0 ? Math.min(1, solved.length / totalUnlockedProblems) : 0;

  // 15% — recency (solved within last 7 days = full, decay to 0 at 30 days)
  let recency = 0;
  const lastIso = progress.lastSolvedAt;
  if (lastIso) {
    const days = (Date.now() - new Date(lastIso).getTime()) / 86400000;
    recency = days <= 7 ? 1 : days >= 30 ? 0 : 1 - (days - 7) / 23;
  }

  // 15% — attempts efficiency (avg attempts-to-solve; 1 = perfect, 5+ = 0)
  let attemptTotal = 0;
  let attemptCount = 0;
  for (const t of Object.values<any>(bySkill)) {
    if (t.solved > 0 && t.avgAttempts) {
      attemptTotal += t.avgAttempts;
      attemptCount++;
    }
  }
  const avgAttempts = attemptCount > 0 ? attemptTotal / attemptCount : 0;
  const efficiency = avgAttempts <= 0 ? 0 : Math.max(0, Math.min(1, (5 - avgAttempts) / 4));

  // 15% — difficulty mix (Medium/Hard solved bonus)
  const mediumSolved = progress.mediumSolved || 0;
  const hardSolved = progress.hardSolved || 0;
  const diffMix = Math.min(1, (mediumSolved * 0.15 + hardSolved * 0.3));

  return Math.round(Math.max(0, Math.min(100, 55 * pctSolved + 15 * recency + 15 * efficiency + 15 * diffMix)));
}

// ─── AI Coach (async, post-submission) ────────────────────────────────────────
async function runAiCoach(opts: {
  submissionId: string;
  uid: string;
  problem: any;
  code: string;
  language: string;
  status: string;
  passed: number;
  total: number;
  isPremium: boolean;
}) {
  const { submissionId, uid, problem, code, language, status, passed, total, isPremium } = opts;
  const db = admin.firestore();
  try {
    if (isCircuitOpen()) return;
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      recordAIFailure();
      console.error("[CODING ARENA] AI coach unavailable: GEMINI_API_KEY is required");
      return;
    }
    const gemini = new GoogleGenAI({ apiKey, httpOptions: { timeout: 45_000 } });

    let response: any;
    try {
      response = await withAITimeout(() => gemini.models.generateContent({
        model: GEMINI_MODEL,
        contents: `You are a placement-prep coding coach, not an interview coach.
Analyze this submission and respond with ONLY valid JSON, no markdown fences, no preamble.

Problem: ${problem.title}
Difficulty: ${problem.difficulty}
Tags: ${(problem.tags || []).join(", ")}
Optimal complexity: ${problem.optimalComplexity?.time} time, ${problem.optimalComplexity?.space} space
Student's code (${language}):
${code.slice(0, 6000)}
Test result: ${status}, ${passed}/${total} passed

Return JSON with exactly this shape:
{
  "timeComplexity": "O(...)",
  "spaceComplexity": "O(...)",
  "betterApproach": { "complexity": "O(...)", "hint": "one sentence, no full solution" },
  "weakAreaTag": "one of the problem's tags that this submission reveals weakness in, or null if solution was optimal",
  "explanation": "2-3 sentences, encouraging but honest"
}`,
        config: {
          responseMimeType: "application/json",
          maxOutputTokens: 800,
        },
      }));
    } catch (aiErr: any) {
      recordAIFailure();
      console.error("[CODING ARENA] Gemini AI coach request failed:", aiErr?.message);
      return;
    }

    const raw = typeof response?.text === "string" ? response.text : "";
    if (!raw.trim()) {
      recordAIFailure();
      console.error("[CODING ARENA] Gemini AI coach returned no usable output");
      return;
    }
    let parsed: any = {};
    try {
      parsed = JSON.parse(raw.replace(/^```(json)?/m, "").replace(/```\s*$/m, "").trim());
    } catch {
      recordAIFailure();
      console.error("[CODING ARENA] Gemini AI coach returned unparseable JSON");
      return;
    }
    recordAISuccess();

    // Recommended problems: only from a real candidate list — Gemini never invents IDs.
    let recommendedProblemIds: string[] = [];
    const weakTag = parsed.weakAreaTag && typeof parsed.weakAreaTag === "string" ? parsed.weakAreaTag : null;
    if (isPremium && weakTag) {
      const progSnap = await db.collection(PROGRESS).doc(uid).get();
      const solvedIds: string[] = progSnap.exists ? progSnap.data()?.solvedProblemIds || [] : [];
      const candSnap = await db
        .collection(PROBLEMS)
        .where("isActive", "==", true)
        .where("tags", "array-contains", weakTag)
        .limit(25)
        .get();
      const targetDiffs =
        problem.difficulty === "Hard" ? ["Medium", "Hard"] : problem.difficulty === "Medium" ? ["Easy", "Medium"] : ["Easy"];
      recommendedProblemIds = candSnap.docs
        .filter((d) => d.id !== problem.slug && !solvedIds.includes(d.id) && targetDiffs.includes(d.data().difficulty))
        .slice(0, 5)
        .map((d) => d.id);
    }

    const feedback: any = {
      submissionId,
      userId: uid,
      problemId: problem.slug,
      timeComplexity: parsed.timeComplexity || null,
      spaceComplexity: parsed.spaceComplexity || null,
      explanation: parsed.explanation || null,
      generatedAt: admin.firestore.FieldValue.serverTimestamp(),
      tier: isPremium ? "premium" : "free",
    };
    // Free tier: stripped feedback — complexity only, no weak-area/recommendations.
    if (isPremium) {
      feedback.betterApproach = parsed.betterApproach || null;
      feedback.weakAreaTag = weakTag;
      feedback.recommendedProblemIds = recommendedProblemIds;
    }
    await db.collection(FEEDBACK).doc(submissionId).set(feedback);

    // Update weak areas on progress doc (premium only feeds weak-area analytics).
    if (isPremium && weakTag) {
      await db.collection(PROGRESS).doc(uid).set(
        { weakAreas: admin.firestore.FieldValue.arrayUnion(weakTag) },
        { merge: true },
      );
    }
  } catch (e: any) {
    console.error("[CODING ARENA] AI coach failed:", e?.message);
  }
}

// ─── GET /api/coding-arena/problems — list (never includes test cases) ───────
router.get("/api/coding-arena/problems", async (req: Request, res: Response) => {
  try {
    const user = await verifyUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    if (!getFirebaseAdmin()) return res.status(503).json({ error: "Firebase unavailable" });
    const db = admin.firestore();

    const [snap, progSnap, status, tags] = await Promise.all([
      db.collection(PROBLEMS).where("isActive", "==", true).get(),
      db.collection(PROGRESS).doc(user.uid).get(),
      getSubscriptionStatus(user.uid, user.email),
      computeUnlockedTags(user.uid),
    ]);

    // Coding Arena is Premium-only — no free access at all.
    if (!status.isPremium) {
      return res.status(403).json({ error: "premium_required", message: "Coding Arena requires Career Compass Premium." });
    }

    const prog = progSnap.exists ? progSnap.data() || {} : {};
    const solved: string[] = prog.solvedProblemIds || [];
    const attempted: string[] = prog.attemptedProblemIds || [];

    const problems = snap.docs.map((d) => {
      const p = d.data();
      return {
        id: d.id,
        title: p.title,
        difficulty: p.difficulty,
        tags: p.tags || [],
        roadmapSkillTags: p.roadmapSkillTags || [],
        languages: p.languages || [],
        solved: solved.includes(d.id),
        attempted: attempted.includes(d.id),
      };
    });

    // Persist codingArena block on the profile (roadmap → arena sync)
    db.collection("career_compass_profiles")
      .doc(user.uid)
      .set(
        {
          codingArena: {
            unlockedSkillTags: tags.unlockedSkillTags,
            currentFocusTag: tags.currentFocusTag,
            lastSyncedAt: new Date().toISOString(),
          },
        },
        { merge: true },
      )
      .catch(() => {});

    res.json({
      problems,
      isPremium: status.isPremium,
      unlockedSkillTags: tags.unlockedSkillTags,
      currentFocusTag: tags.currentFocusTag,
      freeDailyLimit: FREE_DAILY_LIMIT,
      dailyUsed: sameDay(prog.daily?.date) ? prog.daily?.count || 0 : 0,
    });
  } catch (err: any) {
    console.error("[CODING ARENA] problems:", err?.message);
    res.status(500).json({ error: "Failed to load problems" });
  }
});

function sameDay(dateStr?: string): boolean {
  return dateStr === new Date().toISOString().slice(0, 10);
}

// ─── GET /api/coding-arena/problems/:id — detail (public tests only) ─────────
router.get("/api/coding-arena/problems/:id", async (req: Request, res: Response) => {
  try {
    const user = await verifyUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    if (!getFirebaseAdmin()) return res.status(503).json({ error: "Firebase unavailable" });
    const db = admin.firestore();

    const snap = await db.collection(PROBLEMS).doc(req.params.id).get();
    if (!snap.exists || snap.data()?.isActive === false) return res.status(404).json({ error: "Problem not found" });
    const p = snap.data()!;

    const status = await getSubscriptionStatus(user.uid, user.email);
    if (!status.isPremium) {
      return res.status(403).json({ error: "premium_required", message: "Coding Arena requires Career Compass Premium." });
    }

    res.json({
      id: snap.id,
      title: p.title,
      difficulty: p.difficulty,
      tags: p.tags || [],
      languages: p.languages || [],
      statement: p.statement,
      constraints: p.constraints,
      examples: p.examples || [],
      starterCode: p.starterCode || {},
      publicTestCases: (p.testCases || []).filter((t: any) => !t.isHidden).map((t: any) => ({ input: t.input, expectedOutput: t.expectedOutput })),
      hiddenTestCount: (p.testCases || []).filter((t: any) => t.isHidden).length,
      timeLimitMs: p.timeLimitMs,
      memoryLimitMb: p.memoryLimitMb,
      hint: p.hint || null,
      isPremium: status.isPremium,
    });
  } catch (err: any) {
    console.error("[CODING ARENA] problem detail:", err?.message);
    res.status(500).json({ error: "Failed to load problem" });
  }
});

// ─── POST /api/coding-arena/run — public tests only, nothing persisted ───────
router.post("/api/coding-arena/run", async (req: Request, res: Response) => {
  try {
    const user = await verifyUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    if (rateLimited(user.uid)) return res.status(429).json({ error: "Please wait a few seconds between runs." });
    if (!getFirebaseAdmin()) return res.status(503).json({ error: "Firebase unavailable" });

    const { problemId, language, code } = req.body || {};
    if (!problemId || !language || typeof code !== "string" || !code.trim()) {
      return res.status(400).json({ error: "problemId, language and code are required" });
    }
    if (code.length > 60000) return res.status(400).json({ error: "Code too long" });

    const db = admin.firestore();
    const snap = await db.collection(PROBLEMS).doc(problemId).get();
    if (!snap.exists || snap.data()?.isActive === false) return res.status(404).json({ error: "Problem not found" });
    const p = snap.data()!;
    if (!(p.languages || []).includes(language)) return res.status(400).json({ error: "Language not supported for this problem" });

    const status = await getSubscriptionStatus(user.uid, user.email);
    if (!status.isPremium) {
      return res.status(403).json({ error: "premium_required", message: "Coding Arena requires Career Compass Premium." });
    }

    const publicTests = (p.testCases || []).filter((t: any) => !t.isHidden);
    const out = await judgeAll(p, code, language, publicTests);
    res.json({ status: out.status, passed: out.passed, total: out.total, results: out.results });
  } catch (err: any) {
    console.error("[CODING ARENA] run:", err?.message);
    res.status(500).json({ error: "Run failed", detail: err?.message });
  }
});

// ─── POST /api/coding-arena/submit — all tests, persisted, triggers coach ────
router.post("/api/coding-arena/submit", async (req: Request, res: Response) => {
  try {
    const user = await verifyUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    if (rateLimited(user.uid)) return res.status(429).json({ error: "Please wait a few seconds between submissions." });
    if (!getFirebaseAdmin()) return res.status(503).json({ error: "Firebase unavailable" });

    const { problemId, language, code } = req.body || {};
    if (!problemId || !language || typeof code !== "string" || !code.trim()) {
      return res.status(400).json({ error: "problemId, language and code are required" });
    }
    if (code.length > 60000) return res.status(400).json({ error: "Code too long" });

    const db = admin.firestore();
    const snap = await db.collection(PROBLEMS).doc(problemId).get();
    if (!snap.exists || snap.data()?.isActive === false) return res.status(404).json({ error: "Problem not found" });
    const p = snap.data()!;
    if (!(p.languages || []).includes(language)) return res.status(400).json({ error: "Language not supported for this problem" });

    // Coding Arena is Premium-only (server-authoritative)
    const status = await getSubscriptionStatus(user.uid, user.email);
    if (!status.isPremium) {
      return res.status(403).json({ error: "premium_required", message: "Coding Arena requires Career Compass Premium." });
    }

    const progRef = db.collection(PROGRESS).doc(user.uid);
    const today = new Date().toISOString().slice(0, 10);

    // Judge against ALL test cases (hidden ones never leave the server)
    let out;
    try {
      out = await judgeAll(p, code, language, p.testCases || []);
    } catch (judgeErr) {
      throw judgeErr;
    }
    const accepted = out.status === "accepted";

    // Persist submission
    const subRef = db.collection(SUBMISSIONS).doc();
    await subRef.set({
      userId: user.uid,
      problemId,
      language,
      code,
      status: out.status,
      passedTestCases: out.passed,
      totalTestCases: out.total,
      runtimeMs: out.maxTimeMs,
      memoryKb: out.maxMemoryKb,
      submittedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // ── Update progress (atomic — concurrent submits can't clobber each other) ──
    // Precompute unlock scope outside the transaction (reads of other collections).
    const tags = await computeUnlockedTags(user.uid);
    const unlockedProblemsSnap = await db.collection(PROBLEMS).where("isActive", "==", true).get();
    const totalUnlocked = unlockedProblemsSnap.docs.filter((d) =>
      (d.data().roadmapSkillTags || []).some((t: string) => tags.unlockedSkillTags.includes(t)),
    ).length;

    const { attemptsOnProblem, codingReadinessScore, dailyUsed } = await db.runTransaction(async (tx) => {
      const s = await tx.get(progRef);
      const prog: any = s.exists ? s.data() || {} : {};

      const solvedIds: string[] = prog.solvedProblemIds || [];
      const attemptedIds: string[] = prog.attemptedProblemIds || [];
      const bySkill: Record<string, any> = prog.bySkillTag || {};
      const firstSolve = accepted && !solvedIds.includes(problemId);
      const attempts = ((prog.attemptCounts || {})[problemId] || 0) + 1;

      for (const tag of p.roadmapSkillTags || []) {
        const t = bySkill[tag] || { attempted: 0, solved: 0, avgAttempts: 0 };
        if (!attemptedIds.includes(problemId)) t.attempted += 1;
        if (firstSolve) {
          const prevSolved = t.solved;
          t.avgAttempts = prevSolved > 0 ? (t.avgAttempts * prevSolved + attempts) / (prevSolved + 1) : attempts;
          t.solved += 1;
        }
        bySkill[tag] = t;
      }

      const curDaily = prog.daily?.date === today ? prog.daily.count || 0 : 0;
      const nextDaily = curDaily + 1;

      const newProg: any = {
        solvedProblemIds: firstSolve ? [...solvedIds, problemId] : solvedIds,
        attemptedProblemIds: attemptedIds.includes(problemId) ? attemptedIds : [...attemptedIds, problemId],
        bySkillTag: bySkill,
        attemptCounts: { ...(prog.attemptCounts || {}), [problemId]: attempts },
        daily: { date: today, count: nextDaily },
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };
      if (firstSolve) {
        newProg.lastSolvedAt = new Date().toISOString();
        if (p.difficulty === "Medium") newProg.mediumSolved = (prog.mediumSolved || 0) + 1;
        if (p.difficulty === "Hard") newProg.hardSolved = (prog.hardSolved || 0) + 1;
        // Streak
        const last = prog.lastSolvedAt ? new Date(prog.lastSolvedAt).toISOString().slice(0, 10) : null;
        const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
        newProg.streak = last === today ? prog.streak || 1 : last === yesterday ? (prog.streak || 0) + 1 : 1;
      }

      newProg.codingReadinessScore = computeCodingScore({ ...prog, ...newProg }, totalUnlocked);
      tx.set(progRef, newProg, { merge: true });
      return { attemptsOnProblem: attempts, codingReadinessScore: newProg.codingReadinessScore, dailyUsed: nextDaily };
    });

    // AI coach: on accepted, or after 3+ failed attempts (help strugglers too)
    const shouldCoach = accepted || (!accepted && attemptsOnProblem >= 3);
    if (shouldCoach) {
      runAiCoach({
        submissionId: subRef.id,
        uid: user.uid,
        problem: { ...p, slug: problemId },
        code,
        language,
        status: out.status,
        passed: out.passed,
        total: out.total,
        isPremium: status.isPremium,
      }); // deliberately not awaited — client polls /feedback/:id
    }

    // Client gets public results only; hidden cases are pass/fail counts.
    res.json({
      submissionId: subRef.id,
      status: out.status,
      passed: out.passed,
      total: out.total,
      results: out.results.map((r) => (r.isHidden ? { passed: r.passed, isHidden: true, statusDesc: r.statusDesc, timeMs: r.timeMs, memoryKb: r.memoryKb } : r)),
      runtimeMs: out.maxTimeMs,
      memoryKb: out.maxMemoryKb,
      coachQueued: shouldCoach,
      codingReadinessScore,
    });
  } catch (err: any) {
    console.error("[CODING ARENA] submit:", err?.message);
    res.status(500).json({ error: "Submission failed", detail: err?.message });
  }
});

// ─── GET /api/coding-arena/feedback/:submissionId — AI coach result ──────────
router.get("/api/coding-arena/feedback/:submissionId", async (req: Request, res: Response) => {
  try {
    const user = await verifyUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    if (!getFirebaseAdmin()) return res.status(503).json({ error: "Firebase unavailable" });
    const db = admin.firestore();

    const snap = await db.collection(FEEDBACK).doc(req.params.submissionId).get();
    if (!snap.exists) return res.json({ ready: false });
    const f = snap.data()!;
    if (f.userId !== user.uid) return res.status(403).json({ error: "Forbidden" });

    // Resolve recommended problem titles for the client
    let recommended: any[] = [];
    if (Array.isArray(f.recommendedProblemIds) && f.recommendedProblemIds.length > 0) {
      const docs = await Promise.all(f.recommendedProblemIds.map((id: string) => db.collection(PROBLEMS).doc(id).get()));
      recommended = docs.filter((d) => d.exists).map((d) => ({ id: d.id, title: d.data()!.title, difficulty: d.data()!.difficulty, tags: d.data()!.tags || [] }));
    }

    res.json({
      ready: true,
      timeComplexity: f.timeComplexity,
      spaceComplexity: f.spaceComplexity,
      explanation: f.explanation,
      betterApproach: f.betterApproach || null,
      weakAreaTag: f.weakAreaTag || null,
      recommended,
      tier: f.tier,
    });
  } catch (err: any) {
    console.error("[CODING ARENA] feedback:", err?.message);
    res.status(500).json({ error: "Failed to load feedback" });
  }
});

// ─── GET /api/coding-arena/progress — dashboard data + weak areas ────────────
router.get("/api/coding-arena/progress", async (req: Request, res: Response) => {
  try {
    const user = await verifyUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    if (!getFirebaseAdmin()) return res.status(503).json({ error: "Firebase unavailable" });
    const db = admin.firestore();

    const [progSnap, tags, status] = await Promise.all([
      db.collection(PROGRESS).doc(user.uid).get(),
      computeUnlockedTags(user.uid),
      getSubscriptionStatus(user.uid, user.email),
    ]);

    if (!status.isPremium) {
      return res.status(403).json({ error: "premium_required", message: "Coding Arena requires Career Compass Premium." });
    }

    const prog = progSnap.exists ? progSnap.data() || {} : {};

    res.json({
      solvedCount: (prog.solvedProblemIds || []).length,
      attemptedCount: (prog.attemptedProblemIds || []).length,
      bySkillTag: prog.bySkillTag || {},
      weakAreas: (prog.weakAreas || []).slice(-5),
      streak: prog.streak || 0,
      lastSolvedAt: prog.lastSolvedAt || null,
      codingReadinessScore: prog.codingReadinessScore || 0,
      mediumSolved: prog.mediumSolved || 0,
      hardSolved: prog.hardSolved || 0,
      unlockedSkillTags: tags.unlockedSkillTags,
      currentFocusTag: tags.currentFocusTag,
    });
  } catch (err: any) {
    console.error("[CODING ARENA] progress:", err?.message);
    res.status(500).json({ error: "Failed to load progress" });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// ADMIN — Coding Arena analytics (same auth contract as institutional roadmap)
// ══════════════════════════════════════════════════════════════════════════════
import { LANCING_ADMIN_EMAIL } from "../config/constants";

async function verifyCodingAdmin(req: Request): Promise<boolean> {
  try {
    const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
    if (!token || !getFirebaseAdmin()) return false;
    const decoded = await admin.auth().verifyIdToken(token);
    return decoded.email?.toLowerCase() === LANCING_ADMIN_EMAIL.toLowerCase();
  } catch {
    return false;
  }
}

// ─── GET /api/coding-arena/admin/overview ────────────────────────────────────
// Global stats + per-student rows + hardest problems + recent submissions.
router.get("/api/coding-arena/admin/overview", async (req: Request, res: Response) => {
  try {
    if (!(await verifyCodingAdmin(req))) return res.status(403).json({ error: "Forbidden" });
    const db = admin.firestore();

    const [progressSnap, problemsSnap, recentSubsSnap] = await Promise.all([
      db.collection(PROGRESS).limit(500).get(),
      db.collection(PROBLEMS).where("isActive", "==", true).get(),
      db.collection(SUBMISSIONS).orderBy("submittedAt", "desc").limit(30).get(),
    ]);

    // Problem metadata lookup
    const problemMeta: Record<string, { title: string; difficulty: string; tags: string[] }> = {};
    problemsSnap.docs.forEach((d) => {
      const p = d.data();
      problemMeta[d.id] = { title: p.title || d.id, difficulty: p.difficulty || "Easy", tags: p.roadmapSkillTags || [] };
    });

    // Per-student rows + global aggregation
    let totalSolved = 0;
    let totalAttempted = 0;
    const globalAttempts: Record<string, number> = {};   // problemId → attempts across all students
    const globalSolvers: Record<string, number> = {};    // problemId → students who solved it
    const weakAreaFreq: Record<string, number> = {};

    const students = await Promise.all(progressSnap.docs.map(async (doc) => {
      const prog: any = doc.data();
      const uid = doc.id;
      const solved: string[] = prog.solvedProblemIds || [];
      const attempted: string[] = prog.attemptedProblemIds || [];
      totalSolved += solved.length;
      totalAttempted += attempted.length;
      for (const [pid, n] of Object.entries(prog.attemptCounts || {})) {
        globalAttempts[pid] = (globalAttempts[pid] || 0) + (n as number);
      }
      for (const pid of solved) globalSolvers[pid] = (globalSolvers[pid] || 0) + 1;
      for (const w of prog.weakAreas || []) weakAreaFreq[w] = (weakAreaFreq[w] || 0) + 1;

      // Resolve identity from career compass profile (fallback: users collection)
      let name = "Student", email: string | null = null, degree = "", year = "";
      try {
        const prof = await db.collection("career_compass_profiles").doc(uid).get();
        if (prof.exists) {
          const p = prof.data()!;
          name = p.fullName || p.name || (p.email ? String(p.email).split("@")[0] : "Student");
          email = p.email || null;
          degree = p.degree || "";
          year = p.year || "";
        } else {
          const u = await db.collection("users").doc(uid).get();
          if (u.exists) {
            const ud = u.data()!;
            name = ud.name || ud.displayName || "Student";
            email = ud.email || null;
          }
        }
      } catch {}

      return {
        uid, name, email, degree, year,
        solvedCount: solved.length,
        attemptedCount: attempted.length,
        mediumSolved: prog.mediumSolved || 0,
        hardSolved: prog.hardSolved || 0,
        streak: prog.streak || 0,
        codingReadinessScore: prog.codingReadinessScore || 0,
        weakAreas: (prog.weakAreas || []).slice(-5),
        bySkillTag: prog.bySkillTag || {},
        lastSolvedAt: prog.lastSolvedAt || null,
      };
    }));

    students.sort((a, b) => b.solvedCount - a.solvedCount || b.codingReadinessScore - a.codingReadinessScore);

    // Hardest problems: most attempted with lowest solve ratio
    const hardestProblems = Object.entries(globalAttempts)
      .map(([pid, attempts]) => ({
        problemId: pid,
        title: problemMeta[pid]?.title || pid,
        difficulty: problemMeta[pid]?.difficulty || "?",
        tags: problemMeta[pid]?.tags || [],
        attempts,
        solvers: globalSolvers[pid] || 0,
        solveRate: attempts > 0 ? Math.round(((globalSolvers[pid] || 0) / attempts) * 100) : 0,
      }))
      .filter((p) => p.attempts >= 2)
      .sort((a, b) => a.solveRate - b.solveRate || b.attempts - a.attempts)
      .slice(0, 10);

    // Recent submissions feed (code excluded — admin sees metadata only)
    const recentSubmissions = recentSubsSnap.docs.map((d) => {
      const s = d.data();
      const st = students.find((x) => x.uid === s.userId);
      return {
        id: d.id,
        studentName: st?.name || "Student",
        studentEmail: st?.email || null,
        problemTitle: problemMeta[s.problemId]?.title || s.problemId,
        difficulty: problemMeta[s.problemId]?.difficulty || "?",
        language: s.language,
        status: s.status,
        passed: s.passedTestCases,
        total: s.totalTestCases,
        submittedAt: s.submittedAt?.toDate?.()?.toISOString?.() || null,
      };
    });

    const topWeakAreas = Object.entries(weakAreaFreq)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    res.json({
      summary: {
        activeStudents: students.filter((s) => s.attemptedCount > 0).length,
        totalStudents: students.length,
        totalProblems: problemsSnap.size,
        totalSolved,
        totalAttempted,
        avgReadiness: students.length ? Math.round(students.reduce((a, s) => a + s.codingReadinessScore, 0) / students.length) : 0,
      },
      students,
      hardestProblems,
      recentSubmissions,
      topWeakAreas,
    });
  } catch (err: any) {
    console.error("[CODING ARENA] admin overview:", err?.message);
    res.status(500).json({ error: "Failed to load coding arena overview" });
  }
});

export default router;
