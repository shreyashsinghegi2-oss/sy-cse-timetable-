import { createHash } from "node:crypto";
import { admin, getFirebaseAdmin } from "../firebase-admin";
import { degreeKey, instRoadmapDocId } from "@shared/career-keys";
import { buildCareerSelectionContext } from "@shared/career-data";
import { generateHybridRoadmap, type CareerContext } from "./career-hybrid";
import { getCachedRoadmap, putCachedRoadmap, recordAiUsage, type AiUsageEvent } from "./career-ai-store";

const AI_VERSION = "hybrid-v2";

export function careerAiEngine(): "legacy" | "hybrid" {
  return process.env.CAREER_COMPASS_AI_ENGINE === "hybrid" ? "hybrid" : "legacy";
}

type Student = { uid: string; email?: string };
type Input = {
  degree: string;
  year: string;
  aspirations: string[];
  university?: string;
  fieldOfInterest?: string;
  commitment?: string;
  hours?: string;
  track: "personal" | "institutional";
  customGoal?: boolean;
  institutionContext?: unknown;
  step?: number;
};

export async function createCareerAiContext(user: Student, input: Input): Promise<{ context: CareerContext; key: string }> {
  if (!getFirebaseAdmin()) throw new Error("Career Compass storage is unavailable.");
  const bounded = (value: unknown, max: number) => typeof value === "string" ? value.trim().slice(0, max) : "";
  const goals = input.aspirations.slice(0, 3).map((value) => bounded(value, 160)).filter(Boolean);
  if (!goals.length) throw new Error("At least one career goal is required.");
  const snap = input.institutionContext
    ? null
    : await admin.firestore().collection("career_compass_onboarding").doc(user.uid).get();
  const profile = snap?.exists ? snap.data() || {} : {};
  // Do not send identity, phone, address, date of birth, academic ID, or other
  // unnecessary personal data to either provider.
  const relevantProfile = {
    branch: bounded(profile.branch, 100),
    yearOfStudy: bounded(profile.yearOfStudy, 20),
    skillsKnown: Array.isArray(profile.skillsKnown) ? profile.skillsKnown.slice(0, 20) : [],
    certifications: Array.isArray(profile.certifications)
      ? profile.certifications.slice(0, 8).map((item: unknown) => bounded(item, 80))
      : bounded(profile.certifications, 300),
    academicBackground: typeof profile.prevType === "string" ? profile.prevType.slice(0, 80) : "",
    currentCgpa: bounded(String(profile.currentCgpa ?? ""), 16),
    careerGoal: typeof profile.careerGoal === "string" ? profile.careerGoal.slice(0, 200) : "",
    languages: Array.isArray(profile.languages)
      ? profile.languages.slice(0, 6).map((item: unknown) => bounded(item, 40))
      : [],
    // Only public, user-provided portfolio links may improve project guidance.
    github: bounded(profile.github, 160),
    linkedin: bounded(profile.linkedin, 160),
  };
  const context: CareerContext = {
    track: input.track,
    degree: bounded(input.degree, 120),
    year: bounded(input.year, 20),
    institution: bounded(input.university || profile.universityName || "Indian University", 160),
    goals,
    field: bounded(input.fieldOfInterest, 160),
    commitment: bounded(input.commitment, 80),
    hours: bounded(input.hours, 30),
    taxonomy: buildCareerSelectionContext(goals),
    profile: relevantProfile,
    customGoal: input.customGoal === true,
    ...(input.institutionContext ? { adminContext: input.institutionContext } : {}),
  };
  // Key includes the student UID in the persistent store and every relevant
  // context field, so neither another student nor a changed profile can reuse it.
  const key = createHash("sha256").update(JSON.stringify({
    aiVersion: AI_VERSION, schemaVersion: "career-map-1", promptVersion: "dual-track-1",
    context, reviewMode: process.env.CLAUDE_REVIEW_MODE || "adaptive",
  })).digest("hex");
  return { context, key };
}

export async function publishedInstitutionalRoadmap(context: CareerContext): Promise<any | null> {
  if (context.track !== "institutional" || !getFirebaseAdmin()) return null;
  const snap = await admin.firestore().collection("institutionalRoadmaps")
    .doc(instRoadmapDocId(context.degree, String(context.year))).get();
  return snap.exists && snap.data()?.status === "published" ? snap.data()?.roadmap || null : null;
}

export async function cachedCareerRoadmap(key: string, uid: string, validate: (r: any) => string | null): Promise<any | null> {
  const roadmap = await getCachedRoadmap({ key, uid });
  return roadmap && !validate(roadmap) ? roadmap : null;
}

export async function generateCareerHybrid(options: {
  user: Student;
  context: CareerContext;
  key: string;
  route: string;
  systemPrompt: string;
  sanitize: (r: any) => any;
  validate: (r: any) => string | null;
  extractJson: (s: string) => string | null;
  getClaudeClient: () => any;
  onStage?: (stage: string) => void;
  cache?: boolean;
}): Promise<{ roadmap: any; reviewed: boolean; fallback: boolean }> {
  const pendingUsage: Promise<void>[] = [];
  let attempt = 0;
  try {
    const result = await generateHybridRoadmap({
      context: options.context,
      systemPrompt: options.systemPrompt,
      sanitize: options.sanitize,
      validate: options.validate,
      extractJson: options.extractJson,
      getClaudeClient: options.getClaudeClient,
      onStage: options.onStage,
      onUsage: (usage) => {
        const event: AiUsageEvent = {
          provider: usage.provider, model: usage.model, operation: usage.operation,
          attempt: ++attempt, tokens: usage.tokens, cacheTokens: 0,
          success: usage.success, latency: usage.latency,
          reviewTriggered: usage.operation === "review",
          fallback: usage.operation === "fallback",
           errorCategory: usage.errorCategory, triggerReason: usage.triggerReason, route: options.route,
        };
        pendingUsage.push(recordAiUsage(event));
      },
    });
    options.onStage?.("finalizing");
    if (options.cache !== false) {
      try {
        await putCachedRoadmap({
          key: options.key, uid: options.user.uid, roadmap: result.roadmap,
          metadata: { reviewTriggered: result.reviewed },
        });
      } catch {
        // A cache outage must not discard an otherwise valid roadmap.
        console.warn("[CAREER COMPASS] persistent cache write unavailable");
      }
    }
    return result;
  } finally {
    await Promise.allSettled(pendingUsage);
  }
}

export async function recordCareerCacheHit(route: string): Promise<void> {
  await recordAiUsage({
    provider: "cache", model: "persistent", operation: "cache_hit",
    attempt: 0, tokens: 0, cacheTokens: 0, success: true, latency: 0,
    reviewTriggered: false, route, cacheHit: true,
  });
}

export async function persistStudentRoadmap(
  user: Student,
  input: Input,
  roadmap: any,
): Promise<void> {
  if (!getFirebaseAdmin()) throw new Error("Career Compass storage is unavailable.");
  const db = admin.firestore();
  if (input.track === "institutional") {
    // Keep the original per-degree document and status fields, but store each
    // generated plan by academic year so changing year cannot overwrite it.
    const yearKey = String(input.year).trim().slice(0, 30).replace(/[^a-zA-Z0-9_-]/g, "_");
    await db.collection("users").doc(user.uid).collection("institutionalProgress")
      .doc(degreeKey(input.degree)).set({
        generatedRoadmap: roadmap,
        generatedRoadmapYear: input.year,
        generatedRoadmapsByYear: { [yearKey]: roadmap },
        uid: user.uid,
        email: user.email || null,
        degree: input.degree,
        degreeKey: degreeKey(input.degree),
        lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
    return;
  }
  const batch = db.batch();
  batch.set(db.collection("career_compass_roadmaps").doc(user.uid), {
    uid: user.uid, roadmap, savedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  batch.set(db.collection("career_compass_profiles").doc(user.uid), {
    uid: user.uid, email: user.email || null,
    degree: input.degree, year: input.year,
    aspirations: input.aspirations,
    commitment: input.commitment || "", hours: input.hours || "",
    university: input.university || "",
    roadmapGenerated: true,
    step: input.step || 4,
    lastSaved: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });
  await batch.commit();
}