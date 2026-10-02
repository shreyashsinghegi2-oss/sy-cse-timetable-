import { createHash } from "node:crypto";
import { admin, getFirebaseAdmin } from "../firebase-admin";

const ROADMAP_CACHE_COLLECTION = "career_compass_roadmap_cache";
const AI_USAGE_COLLECTION = "career_compass_ai_usage";
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const USAGE_QUERY_LIMIT = 5000;

export type RoadmapCacheMetadata = Record<string, unknown>;

export interface AiUsageEvent {
  provider: string;
  model: string;
  operation: string;
  attempt: number;
  tokens: number | {
    input?: number;
    output?: number;
    total?: number;
    prompt?: number;
    completion?: number;
  };
  cacheTokens: number;
  success: boolean;
  latency: number;
  reviewTriggered: boolean;
  errorCategory?: string | null;
  triggerReason?: string;
  route: string;
  cacheHit?: boolean;
  fallback?: boolean;
}

interface TokenPrice {
  input?: number;
  output?: number;
  cachedInput?: number;
  blended?: number;
}

function hashCacheIdentity(key: string, uid: string): string {
  return createHash("sha256")
    .update(JSON.stringify([uid, key]), "utf8")
    .digest("hex");
}

function cleanLabel(value: unknown, fallback: string, maxLength = 64): string {
  if (typeof value !== "string") return fallback;
  const cleaned = value.trim().replace(/[^a-zA-Z0-9._/-]/g, "").slice(0, maxLength);
  return cleaned || fallback;
}

function finiteNonNegative(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.max(0, value);
}

function priceFromEnv(provider: string): TokenPrice {
  const providerName = provider.toUpperCase().replace(/[^A-Z0-9]/g, "_");
  const readPrice = (...names: string[]): number | undefined => {
    for (const name of names) {
      const raw = process.env[name];
      if (raw === undefined || raw.trim() === "") continue;
      const parsed = Number(raw);
      if (Number.isFinite(parsed) && parsed >= 0) return parsed;
    }
    return undefined;
  };

  return {
    input: readPrice(
      `AI_TOKEN_PRICE_${providerName}_INPUT_PER_1M`,
      `AI_${providerName}_INPUT_PRICE_PER_1M`,
      "AI_TOKEN_PRICE_INPUT_PER_1M",
    ),
    output: readPrice(
      `AI_TOKEN_PRICE_${providerName}_OUTPUT_PER_1M`,
      `AI_${providerName}_OUTPUT_PRICE_PER_1M`,
      "AI_TOKEN_PRICE_OUTPUT_PER_1M",
    ),
    cachedInput: readPrice(
      `AI_TOKEN_PRICE_${providerName}_CACHE_INPUT_PER_1M`,
      `AI_${providerName}_CACHE_INPUT_PRICE_PER_1M`,
      "AI_TOKEN_PRICE_CACHE_INPUT_PER_1M",
    ),
    blended: readPrice(
      `AI_TOKEN_PRICE_${providerName}_PER_1M`,
      `AI_${providerName}_PRICE_PER_1M`,
      "AI_TOKEN_PRICE_PER_1M",
    ),
  };
}

function estimateCostUsd(
  provider: string,
  tokens: AiUsageEvent["tokens"],
  cacheTokens: number,
): number | null {
  const prices = priceFromEnv(provider);
  if (typeof tokens === "number") {
    const rate = prices.blended ?? prices.input;
    if (rate === undefined) return null;
    const total = finiteNonNegative(tokens);
    const cached = Math.min(total, finiteNonNegative(cacheTokens));
    const cachedRate = prices.cachedInput ?? rate;
    return ((total - cached) * rate + cached * cachedRate) / 1_000_000;
  }

  const input = finiteNonNegative(tokens?.input ?? tokens?.prompt);
  const output = finiteNonNegative(tokens?.output ?? tokens?.completion);
  const total = finiteNonNegative(tokens?.total);
  if (input === 0 && output === 0 && total > 0) {
    return prices.blended === undefined ? null : (total * prices.blended) / 1_000_000;
  }

  if ((input > 0 && prices.input === undefined) || (output > 0 && prices.output === undefined)) {
    return null;
  }
  const cachedInput = Math.min(input, finiteNonNegative(cacheTokens));
  const uncachedInput = input - cachedInput;
  const cachedRate = prices.cachedInput ?? prices.input ?? 0;
  const inputCost = (uncachedInput * (prices.input ?? 0) + cachedInput * cachedRate) / 1_000_000;
  const outputCost = (output * (prices.output ?? 0)) / 1_000_000;
  return inputCost + outputCost;
}

function safeMetadata(metadata?: RoadmapCacheMetadata): Record<string, number | boolean> {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return {};
  const allowed = new Set([
    "attempt",
    "latencyMs",
    "inputTokens",
    "outputTokens",
    "cacheTokens",
    "reviewTriggered",
  ]);
  const safe: Record<string, number | boolean> = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (!allowed.has(key)) continue;
    if (typeof value === "boolean") safe[key] = value;
    else if (typeof value === "number" && Number.isFinite(value) && value >= 0) safe[key] = value;
  }
  return safe;
}

function safeRoute(value: unknown): string {
  if (typeof value !== "string") return "unknown";
  const path = value.split(/[?#]/, 1)[0].slice(0, 256);
  const knownSegments = new Set([
    "api",
    "v1",
    "ai",
    "career",
    "careers",
    "compass",
    "roadmap",
    "generate",
    "review",
    "health",
  ]);
  const segments = path.split("/").filter(Boolean).slice(0, 8).map((segment) => {
    if (
      segment.length > 48 ||
      /^\d+$/.test(segment) ||
      /^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(segment) ||
      /@/.test(segment)
    ) return ":id";
    const normalized = segment.replace(/[^a-zA-Z0-9_-]/g, "").toLowerCase();
    return knownSegments.has(normalized) ? normalized : ":route";
  });
  return segments.length ? `/${segments.join("/")}` : "unknown";
}

function safeErrorCategory(value: unknown): string {
  const category = typeof value === "string"
    ? value.trim().toLowerCase().replace(/[^a-z]+/g, "_").replace(/^_|_$/g, "")
    : "";
  const allowed = new Set([
    "timeout",
    "rate_limit",
    "provider_error",
    "invalid_response",
    "validation",
    "quota",
    "network",
    "fallback",
    "cancelled",
    "unknown",
    "truncated",
    "invalid_json",
    "empty_response",
    "rate_limited",
    "provider_unavailable",
    "request_failed",
    "validation_failed",
  ]);
  return allowed.has(category) ? category : "unknown";
}

function getTimestampMillis(value: unknown): number {
  if (value instanceof Date) return value.getTime();
  if (value && typeof (value as { toMillis?: unknown }).toMillis === "function") {
    return (value as { toMillis: () => number }).toMillis();
  }
  return 0;
}

/**
 * Read a seven-day, user-scoped roadmap cache entry. The caller's key should
 * include its schema/prompt version; the uid is always included in the hash.
 */
export async function getCachedRoadmap({
  key,
  uid,
}: {
  key: string;
  uid: string;
}): Promise<unknown | null> {
  if (!key || !uid || !getFirebaseAdmin()) return null;
  try {
    const ref = admin.firestore()
      .collection(ROADMAP_CACHE_COLLECTION)
      .doc(hashCacheIdentity(key, uid));
    const snapshot = await ref.get();
    if (!snapshot.exists) return null;
    const data = snapshot.data();
    if (!data || getTimestampMillis(data.expiresAt) <= Date.now()) return null;
    return data.roadmap ?? null;
  } catch {
    return null;
  }
}

/**
 * Persist a validated roadmap for seven days. Firestore failures are surfaced
 * to the caller; no raw uid or cache key is written to the document.
 */
export async function putCachedRoadmap({
  key,
  uid,
  roadmap,
  metadata,
}: {
  key: string;
  uid: string;
  roadmap: unknown;
  metadata?: RoadmapCacheMetadata;
}): Promise<void> {
  if (!key || !uid) throw new Error("Roadmap cache key and user identity are required.");
  if (!getFirebaseAdmin()) throw new Error("Firebase Admin is unavailable; roadmap cache write failed.");

  const ref = admin.firestore()
    .collection(ROADMAP_CACHE_COLLECTION)
    .doc(hashCacheIdentity(key, uid));
  await ref.set({
    roadmap,
    metadata: safeMetadata(metadata),
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    expiresAt: new Date(Date.now() + CACHE_TTL_MS),
  });
}

/**
 * Record operational/cost telemetry without user identifiers or provider error
 * details. This is intentionally best-effort and must not affect AI responses.
 */
export async function recordAiUsage(event: AiUsageEvent): Promise<void> {
  if (!event || !getFirebaseAdmin()) return;
  try {
    const provider = cleanLabel(event.provider, "unknown", 32);
    const operation = cleanLabel(event.operation, "unknown", 48);
    const tokens = typeof event.tokens === "number"
      ? finiteNonNegative(event.tokens)
      : {
        input: finiteNonNegative(event.tokens?.input ?? event.tokens?.prompt),
        output: finiteNonNegative(event.tokens?.output ?? event.tokens?.completion),
        total: finiteNonNegative(event.tokens?.total),
      };
    const cacheTokens = finiteNonNegative(event.cacheTokens);
    const costUsd = estimateCostUsd(provider, event.tokens, cacheTokens);

    await admin.firestore().collection(AI_USAGE_COLLECTION).add({
      provider,
      model: cleanLabel(event.model, "unknown", 64),
      operation,
      attempt: Math.max(0, Math.floor(finiteNonNegative(event.attempt))),
      tokens,
      cacheTokens,
      success: event.success === true,
      latencyMs: finiteNonNegative(event.latency),
      reviewTriggered: event.reviewTriggered === true,
      errorCategory: event.success ? null : safeErrorCategory(event.errorCategory),
      triggerReason: event.triggerReason ? cleanLabel(event.triggerReason, "unknown", 80) : null,
      route: safeRoute(event.route),
      cacheHit: event.cacheHit === true,
      fallback: event.fallback === true || /fallback/i.test(operation),
      costUsd,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch {
    // Telemetry is best-effort and deliberately does not log potentially sensitive errors.
  }
}

/**
 * Aggregate recent cost and reliability telemetry. Results are based on at
 * most 5,000 records; `truncated` and `caveat` flag potentially incomplete data.
 */
export async function getAiUsageSummary(days: number): Promise<Record<string, unknown>> {
  const requestedDays = Number.isFinite(days) ? Math.floor(days) : 30;
  const rangeDays = Math.min(365, Math.max(1, requestedDays));
  const empty = {
    days: rangeDays,
    eventCount: 0,
    successfulCount: 0,
    failedCount: 0,
    cacheHitCount: 0,
    reviewTriggeredCount: 0,
    fallbackCount: 0,
    successRatio: 0,
    cacheHitRatio: 0,
    reviewTriggeredRatio: 0,
    fallbackRatio: 0,
    estimatedCostUsd: 0,
    estimatedDailyCostUsd: 0,
    estimatedMonthlyCostUsd: 0,
    estimatedPerRoadmapCostUsd: null as number | null,
    costEvents: 0,
    roadmapCostEvents: 0,
    providerCounts: { gemini: 0, claude: 0 },
    providerTokens: { gemini: 0, claude: 0 },
    claudeInputTokens: 0,
    claudeOutputTokens: 0,
    claudeCallsPerCompletedRoadmap: null as number | null,
    claudeTokensPerCompletedRoadmap: null as number | null,
    reviewCount: 0,
    regenerationCount: 0,
    claudeReviewRate: 0,
    claudeRegenerationRate: 0,
    geminiFailureRate: 0,
    averageTokensPerRequest: 0,
    truncated: false,
    caveat: null as string | null,
  };
  if (!getFirebaseAdmin()) return { ...empty, caveat: "Firebase Admin is unavailable; no persistent usage data was read." };

  try {
    const start = new Date(Date.now() - rangeDays * 24 * 60 * 60 * 1000);
    const snapshot = await admin.firestore()
      .collection(AI_USAGE_COLLECTION)
      .where("timestamp", ">=", admin.firestore.Timestamp.fromDate(start))
      .orderBy("timestamp", "desc")
      .limit(USAGE_QUERY_LIMIT)
      .get();
    const truncated = snapshot.size === USAGE_QUERY_LIMIT;
    const docs = snapshot.docs.map((doc) => doc.data());
    const count = docs.length;
    const successfulCount = docs.filter((row) => row.success === true).length;
    const cacheHitCount = docs.filter((row) => row.cacheHit === true).length;
    const costRows = docs.filter((row) => typeof row.costUsd === "number" && Number.isFinite(row.costUsd));
    const totalCost = costRows.reduce((sum, row) => sum + Math.max(0, row.costUsd), 0);
    // Completion is a bookkeeping event, not another provider request.
    const providerRows = docs.filter((row) =>
      (row.provider === "gemini" || row.provider === "claude") && row.operation !== "roadmap_completed");
    const completedRoadmaps = docs.filter((row) => row.operation === "roadmap_completed" && row.success).length;
    const providerCounts = {
      gemini: providerRows.filter((row) => row.provider === "gemini").length,
      claude: providerRows.filter((row) => row.provider === "claude").length,
    };
    const providerTokens = {
      gemini: providerRows.filter((row) => row.provider === "gemini").reduce((sum, row) => sum + (row.tokens?.total || 0), 0),
      claude: providerRows.filter((row) => row.provider === "claude").reduce((sum, row) => sum + (row.tokens?.total || 0), 0),
    };
    const claudeRows = providerRows.filter((row) => row.provider === "claude");
    const roadmapClaudeRows = claudeRows.filter((row) =>
      row.operation === "review" || row.operation === "fallback");
    const roadmapClaudeTokens = roadmapClaudeRows.reduce((sum, row) => sum + (row.tokens?.total || 0), 0);
    const claudeInputTokens = claudeRows.reduce((sum, row) => sum + (row.tokens?.input || 0), 0);
    const claudeOutputTokens = claudeRows.reduce((sum, row) => sum + (row.tokens?.output || 0), 0);
    const reviewCount = providerRows.filter((row) => row.operation === "review").length;
    const regenerationCount = providerRows.filter((row) => row.operation === "fallback").length;
    const geminiFailed = providerRows.filter((row) => row.provider === "gemini" && !row.success).length;
    const missingPrices = providerRows.some((row) => !Number.isFinite(row.costUsd));
    const caveats = [
      truncated ? `Results are limited to the latest ${USAGE_QUERY_LIMIT} events; totals and ratios may be understated.` : "",
      missingPrices ? "Some provider prices are not configured; cost estimates exclude unpriced tokens." : "",
    ].filter(Boolean);
    const dailyCost = totalCost / rangeDays;
    return {
      days: rangeDays,
      eventCount: count,
      successfulCount,
      failedCount: count - successfulCount,
      cacheHitCount,
      reviewTriggeredCount: reviewCount,
      fallbackCount: regenerationCount,
      successRatio: count ? successfulCount / count : 0,
      cacheHitRatio: cacheHitCount + completedRoadmaps ? cacheHitCount / (cacheHitCount + completedRoadmaps) : 0,
      reviewTriggeredRatio: completedRoadmaps ? reviewCount / completedRoadmaps : 0,
      fallbackRatio: completedRoadmaps ? regenerationCount / completedRoadmaps : 0,
      estimatedCostUsd: totalCost,
      estimatedDailyCostUsd: dailyCost,
      estimatedMonthlyCostUsd: dailyCost * 30,
      estimatedPerRoadmapCostUsd: completedRoadmaps ? totalCost / completedRoadmaps : null,
      costEvents: costRows.length,
      roadmapCostEvents: completedRoadmaps,
      providerCounts,
      providerTokens,
      claudeInputTokens,
      claudeOutputTokens,
      claudeCallsPerCompletedRoadmap: completedRoadmaps ? roadmapClaudeRows.length / completedRoadmaps : null,
      claudeTokensPerCompletedRoadmap: completedRoadmaps ? roadmapClaudeTokens / completedRoadmaps : null,
      reviewCount,
      regenerationCount,
      claudeReviewRate: completedRoadmaps ? reviewCount / completedRoadmaps : 0,
      claudeRegenerationRate: completedRoadmaps ? regenerationCount / completedRoadmaps : 0,
      geminiFailureRate: providerCounts.gemini ? geminiFailed / providerCounts.gemini : 0,
      averageTokensPerRequest: providerRows.length ? (providerTokens.gemini + providerTokens.claude) / providerRows.length : 0,
      truncated,
      caveat: caveats.join(" ") || null,
    };
  } catch {
    return { ...empty, caveat: "Usage telemetry could not be read from Firestore." };
  }
}