import { GoogleGenAI } from "@google/genai";
import { admin, getFirebaseAdmin } from "./firebase-admin";
import { listVerifiedLancingSources, refreshLancingSources } from "./utils/lancing-sources";
import { isRecentPosting } from "./utils/lancing-posting-freshness";

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";
const RANK_CACHE_TTL_MS = 15 * 60 * 1000;
const RANK_CACHE_MAX = 300;
const FEED_CACHE_TTL_MS = 5 * 60 * 1000;
const GEMINI_REQUEST_TIMEOUT_MS = 45_000;
const MAX_GEMINI_RETRIES = 1;

export interface AIOpportunity {
  id?: string;
  title: string;
  company: string;
  company_size?: string;
  source: string;
  source_url?: string;
  url: string;
  logo_letter?: string;
  logo_color?: string;
  type?: string;
  stipend: string;
  stipend_numeric?: number;
  work_mode: string;
  location?: string;
  duration?: string;
  skills: string[];
  description?: string;
  perks?: string[];
  deadline?: string;
  deadlineKind?: "REGISTRATION" | "START_TIME";
  experience_level?: string;
  match_score?: number;
  match_reason?: string;
  fallback?: boolean;
  engineStatus?: "gemini" | "legacy" | "degraded";
  is_hot?: boolean;
  applicants?: string;
  posted_ago?: string;
  posted_at?: string;
  source_metadata?: Record<string, unknown>;
  themes?: string[];
  eligibility?: string;
  eligibleDegrees?: string[];
  eligibleYears?: string[];
}

type SourceCategory = "competitions" | "jobs" | "internships";
type CacheEntry<T> = { value: T; at: number };
const rankingCache = new Map<string, CacheEntry<any>>();
const feedCache = new Map<string, CacheEntry<AIOpportunity[]>>();
const SEARCH_ANALYTICS_COLLECTION = "lancing_search_analytics";

function stableHash(value: unknown): string {
  const text = typeof value === "string" ? value : JSON.stringify(value);
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function compactText(value: unknown, max: number): string {
  return typeof value === "string" ? value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, max) : "";
}

function asStringArray(value: unknown, maxItems = 20, maxLength = 60): string[] {
  return Array.isArray(value) ? value.slice(0, maxItems).map((v) => compactText(v, maxLength)).filter(Boolean) : [];
}

function normalizeSource(raw: any, category: SourceCategory): AIOpportunity | null {
  if (!raw || typeof raw !== "object") return null;
  const id = compactText(raw.id ?? raw.source_id, 120);
  const title = compactText(raw.title ?? raw.name, 200);
  const url = compactText(raw.source_url ?? raw.url, 1000);
  if (!id || !title || !/^https?:\/\/\S+$/i.test(url)) return null;
  const company = compactText(raw.company ?? raw.organizer ?? raw.organization ?? raw.employer, 120);
  const source = compactText(raw.source ?? raw.platform ?? raw.provider, 100);
  return {
    id, title, company, source, source_url: url, url,
    company_size: compactText(raw.company_size, 30) || undefined,
    logo_letter: company ? company[0].toUpperCase() : undefined,
    logo_color: /^#[0-9a-f]{6}$/i.test(String(raw.logo_color || "")) ? raw.logo_color : undefined,
    type: compactText(raw.type ?? raw.category ?? category, 40),
    stipend: compactText(raw.stipend ?? raw.prize ?? raw.salary, 100) || "Not specified",
    stipend_numeric: Number.isFinite(raw.stipend_numeric) ? raw.stipend_numeric : undefined,
    work_mode: compactText(raw.work_mode ?? raw.mode, 40) || "Not specified",
    location: compactText(raw.location, 100) || undefined,
    duration: compactText(raw.duration, 80) || undefined,
    skills: asStringArray(raw.skills, 20, 60),
    themes: asStringArray(raw.themes, 20, 60),
    eligibility: compactText(raw.eligibility, 300) || undefined,
    eligibleDegrees: asStringArray(raw.eligibleDegrees, 20, 80),
    eligibleYears: asStringArray(raw.eligibleYears, 12, 40),
    description: compactText(raw.description ?? raw.summary, 1000) || undefined,
    perks: asStringArray(raw.perks, 10, 80),
    deadline: compactText(raw.deadline, 100) || undefined,
    deadlineKind: raw.deadlineKind === "START_TIME" ? "START_TIME" : "REGISTRATION",
    experience_level: compactText(raw.experience_level, 60) || undefined,
    is_hot: raw.is_hot === true,
    posted_at: compactText(raw.posted_at ?? raw.created_at, 80) || undefined,
    source_metadata: {
      category,
      sourceId: id,
      sourceRegistryId: compactText(raw.source_id, 120) || undefined,
      verified: true,
      verificationStatus: compactText(raw.verification_status, 40) || "VERIFIED_EXTERNAL",
      sourceUpdatedAt: compactText(raw.last_verified_at ?? raw.source_updated_at ?? raw.updated_at, 80) || undefined,
      scrapedAt: compactText(raw.scraped_at, 80) || undefined,
      sourceVersion: compactText(raw.parser_version ?? raw.source_version ?? raw.version, 100) || undefined,
      sourceContentHash: compactText(raw.raw_content_hash, 100) || undefined,
    },
  };
}

function sourceDatasetVersion(items: any[]): string {
  return stableHash(items);
}

function telemetry(input: {
  operation: string; started: number; success: boolean; inputTokens?: number;
  outputTokens?: number; datasetVersion: string; datasetCount: number; cacheState: string;
}): void {
  console.info("[LANCING GEMINI]", JSON.stringify({
    provider: "gemini",
    model: GEMINI_MODEL,
    operation: input.operation,
    inputTokens: input.inputTokens || 0,
    outputTokens: input.outputTokens || 0,
    latencyMs: Date.now() - input.started,
    success: input.success,
    sourceDatasetVersion: input.datasetVersion,
    sourceDatasetCount: input.datasetCount,
    cacheState: input.cacheState,
  }));
}

function requireGemini(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is required to rank verified opportunity sources.");
  return new GoogleGenAI({ apiKey, httpOptions: { timeout: GEMINI_REQUEST_TIMEOUT_MS } });
}

export type LancingAIEngine = "legacy" | "gemini";

/** Reject unknown configuration rather than silently changing the ranking engine. */
export function getLancingAIEngine(): LancingAIEngine {
  const configured = process.env.STUDENTLANCING_AI_ENGINE;
  if (configured === undefined) return "gemini";
  if (configured === "legacy" || configured === "gemini") return configured;
  throw new Error(`Invalid STUDENTLANCING_AI_ENGINE value "${configured}". Expected "legacy" or "gemini".`);
}

function isTransientProviderError(error: unknown): boolean {
  const value = error as any;
  const status = Number(value?.status ?? value?.statusCode ?? value?.code);
  if (status === 408 || status === 425 || status === 429 || status >= 500 && status <= 599) return true;
  const text = `${value?.name || ""} ${value?.message || ""} ${value?.code || ""}`.toLowerCase();
  return /timeout|timed out|econnreset|econnrefused|eai_again|network|temporar|unavailable|rate limit|socket hang up/.test(text);
}

async function generateGeminiContent(request: Record<string, unknown>): Promise<any> {
  let attempt = 0;
  while (true) {
    try {
      return await requireGemini().models.generateContent(request as any);
    } catch (error) {
      if (attempt >= MAX_GEMINI_RETRIES || !isTransientProviderError(error)) throw error;
      attempt++;
    }
  }
}

function parseGeminiJson(text: string): any {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  try { return JSON.parse(cleaned); } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(cleaned.slice(start, end + 1));
    throw new Error("Gemini returned invalid structured JSON.");
  }
}

export function validateLancingRankingResponse(text: string): any[] {
  const parsed = parseGeminiJson(text);
  if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.rankings)) {
    throw new Error("Gemini ranking response is missing the rankings array.");
  }
  return parsed.rankings;
}

function cacheGet<T>(cache: Map<string, CacheEntry<T>>, key: string, ttl: number): T | null {
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > ttl) { cache.delete(key); return null; }
  return hit.value;
}

function cacheSet<T>(cache: Map<string, CacheEntry<T>>, key: string, value: T, max: number): void {
  if (cache.size >= max) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(key, { value, at: Date.now() });
}

function candidateForModel(item: AIOpportunity): Record<string, unknown> {
  return {
    id: item.id,
    title: compactText(item.title, 180),
    company: compactText(item.company, 100),
    source: compactText(item.source, 80),
    type: compactText(item.type, 40),
    skills: asStringArray(item.skills, 10, 45),
    themes: asStringArray(item.themes, 10, 45),
    eligibility: compactText(item.eligibility, 180),
    deadline: compactText(item.deadline, 40),
    description: compactText(item.description, 350),
    location: compactText(item.location, 80),
    work_mode: compactText(item.work_mode, 30),
    source_url: compactText(item.source_url ?? item.url, 500),
  };
}

function competitionEligible(item: AIOpportunity, profile: any): boolean {
  if (item.source_metadata?.category !== "competitions") return true;
  const degree = compactText(profile?.degree ?? profile?.course ?? profile?.branch, 80).toLowerCase();
  const degreeKey = degree.replace(/[^a-z0-9]/g, "");
  const year = compactText(profile?.year ?? profile?.academicYear, 40).toLowerCase();
  const degrees = asStringArray(item.eligibleDegrees).map((value) => value.toLowerCase());
  const years = asStringArray(item.eligibleYears).map((value) => value.toLowerCase());
  if (degrees.length && (!degree || !degrees.some((allowed) => allowed === degree))) return false;
  if (years.length && (!year || !years.includes(year))) return false;
  const eligibility = compactText(item.eligibility, 300).toLowerCase();
  if (/\bonly (?:postgraduate|post-graduate|master'?s)\b/.test(eligibility) &&
    (!degree || !/^(?:postgraduate|master|mba|mtech|msc|ma|phd)/.test(degreeKey))) return false;
  if (/\bonly (?:undergraduate|under-graduate|bachelor'?s)\b/.test(eligibility) &&
    (!degree || !/^(?:undergraduate|bachelor|btech|bsc|ba|bba|bca)/.test(degreeKey))) return false;
  return true;
}

/**
 * The legacy mode is deliberately a local ranking algorithm, not a revival of the
 * former Claude path. It only scores records already supplied by internal callers
 * or verified sources, and therefore cannot invent opportunity IDs or listings.
 */
function localRank<T extends { id?: string; title: string; skills?: string[]; description?: string; company?: string }>(
  candidates: T[],
  profile: any,
  query: string,
  engineStatus: "legacy" | "degraded",
): Array<T & { matchScore: number; matchReason: string; fallback: boolean; engineStatus: "legacy" | "degraded" }> {
  const profileValues: string[] = [];
  const collectProfileValues = (value: unknown): void => {
    if (typeof value === "string" || typeof value === "number") profileValues.push(String(value));
    else if (Array.isArray(value)) value.forEach(collectProfileValues);
    else if (value && typeof value === "object") Object.values(value).forEach(collectProfileValues);
  };
  collectProfileValues(profile || {});
  const profileText = [...profileValues, query].join(" ");
  const terms = Array.from(new Set((profileText.toLowerCase().match(/[a-z0-9+#.]{2,}/g) || [])));
  const ranked = candidates.map((candidate, index) => {
    const candidateText = [
      candidate.title,
      candidate.company,
      candidate.description,
      Array.isArray(candidate.skills) ? candidate.skills.join(" ") : "",
      (candidate as any).type,
      (candidate as any).location,
      (candidate as any).work_mode,
    ].filter(Boolean).join(" ").toLowerCase();
    const matched = terms.filter((term) => candidateText.includes(term));
    const skillTerms = Array.isArray(candidate.skills) ? candidate.skills.map((skill) => String(skill).toLowerCase()) : [];
    const matchedSkills = skillTerms.filter((skill) => terms.some((term) => skill.includes(term) || term.includes(skill)));
    const score = terms.length ? Math.min(100, Math.round(matched.length / terms.length * 100)) : 0;
    const reason = matchedSkills.length
      ? `Matches your skills: ${matchedSkills.slice(0, 3).join(", ")}.`
      : matched.length
        ? `Relevant terms: ${matched.slice(0, 3).join(", ")}.`
        : "Ranked from the supplied opportunity records; no strong profile or query overlap found.";
    return {
      item: candidate,
      index,
      matchScore: score,
      matchReason: reason,
      fallback: engineStatus === "degraded",
      engineStatus,
    };
  });
  ranked.sort((a, b) => b.matchScore - a.matchScore || a.index - b.index);
  return ranked.map(({ item, matchScore, matchReason, fallback, engineStatus }) => ({
    ...item,
    matchScore,
    matchReason,
    fallback,
    engineStatus,
  }));
}

/**
 * Ranks only the supplied dataset. Gemini returns IDs and scoring metadata, never listings.
 * Unknown, duplicate, or malformed IDs are ignored; score values are clamped to 0–100.
 */
export async function rankLancingOpportunities<T extends {
  id?: string; title: string; skills?: string[]; description?: string; company?: string;
}>(
  items: T[],
  profile: any,
  query: string,
  operation: string,
): Promise<Array<T & { matchScore: number; matchReason: string; fallback: boolean; engineStatus: "gemini" | "legacy" | "degraded" }>> {
  const engine = getLancingAIEngine();
  if (!items.length) return [];
  const candidates = items.filter((item) => typeof item.id === "string" && item.id.trim() && compactText(item.title, 200)).slice(0, 100);
  if (!candidates.length) return [];
  const ids = new Set(candidates.map((item) => item.id!.trim()));
  const datasetVersion = stableHash(candidates);
  const profileVersion = stableHash(profile || {});
  const normalizedQuery = compactText(query, 500).toLowerCase();
  const cacheKey = stableHash([engine, "success", normalizedQuery, profileVersion, datasetVersion, operation]);
  const fallbackKey = stableHash([engine, "fallback", normalizedQuery, profileVersion, datasetVersion, operation]);
  if (engine === "legacy") {
    const cached = cacheGet(rankingCache, cacheKey, RANK_CACHE_TTL_MS);
    if (cached) return cached;
    const ranked = localRank(candidates, profile, normalizedQuery, "legacy");
    cacheSet(rankingCache, cacheKey, ranked, RANK_CACHE_MAX);
    return ranked;
  }
  const cached = cacheGet(rankingCache, cacheKey, RANK_CACHE_TTL_MS);
  if (cached) {
    telemetry({ operation, started: Date.now(), success: true, datasetVersion, datasetCount: candidates.length, cacheState: "hit" });
    return cached;
  }
  const cachedFallback = cacheGet(rankingCache, fallbackKey, RANK_CACHE_TTL_MS);
  if (cachedFallback) {
    telemetry({ operation, started: Date.now(), success: false, datasetVersion, datasetCount: candidates.length, cacheState: "hit" });
    return cachedFallback;
  }
  const started = Date.now();
  const modelCandidates: Record<string, unknown>[] = [];
  for (const item of candidates) {
    const next = candidateForModel(item as unknown as AIOpportunity);
    if (JSON.stringify([...modelCandidates, next]).length > 36_000) break;
    modelCandidates.push(next);
  }
  const modelInput = JSON.stringify({
    task: "Rank only these existing source-backed opportunity IDs for relevance. Do not create or modify listings.",
    query: normalizedQuery,
    student_profile: compactText(JSON.stringify(profile || {}), 4000),
    candidates: modelCandidates,
  });
  let inputTokens = 0;
  let outputTokens = 0;
  try {
    const response: any = await generateGeminiContent({
      model: GEMINI_MODEL,
      contents: modelInput,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            rankings: { type: "ARRAY", items: { type: "OBJECT", properties: {
              id: { type: "STRING" }, score: { type: "NUMBER" }, reason: { type: "STRING" },
            }, required: ["id", "score", "reason"] } },
          },
          required: ["rankings"],
        },
        maxOutputTokens: 5000,
      },
    });
    inputTokens = Number(response?.usageMetadata?.promptTokenCount) || 0;
    outputTokens = Number(response?.usageMetadata?.candidatesTokenCount) || 0;
    const rows = validateLancingRankingResponse(String(response?.text || ""));
    const seen = new Set<string>();
    const ranked: Array<T & { matchScore: number; matchReason: string; fallback: boolean; engineStatus: "gemini" }> = [];
    for (const row of rows) {
      const id = typeof row?.id === "string" ? row.id.trim() : "";
      if (!ids.has(id) || seen.has(id)) continue;
      const candidate = candidates.find((item) => item.id!.trim() === id);
      if (!candidate) continue;
      const rawScore = Number(row.score);
      const matchScore = Number.isFinite(rawScore) ? Math.max(0, Math.min(100, Math.round(rawScore))) : 0;
      ranked.push({ ...candidate, matchScore, matchReason: compactText(row.reason, 240), fallback: false, engineStatus: "gemini" });
      seen.add(id);
    }
    ranked.sort((a, b) => b.matchScore - a.matchScore);
    if (ranked.length === candidates.length) cacheSet(rankingCache, cacheKey, ranked, RANK_CACHE_MAX);
    const complete = ranked.length === candidates.length;
    telemetry({ operation, started, success: complete, inputTokens, outputTokens, datasetVersion, datasetCount: candidates.length, cacheState: "miss" });
    if (complete) return ranked;
    const remaining = candidates.filter((item) => !seen.has(item.id!.trim()));
    const supplemented = [
      ...ranked,
      ...localRank(remaining, profile, normalizedQuery, "degraded"),
    ];
    cacheSet(rankingCache, fallbackKey, supplemented, RANK_CACHE_MAX);
    return supplemented;
  } catch {
    telemetry({ operation, started, success: false, inputTokens, outputTokens, datasetVersion, datasetCount: candidates.length, cacheState: "miss" });
    const degraded = localRank(candidates, profile, normalizedQuery, "degraded");
    cacheSet(rankingCache, fallbackKey, degraded, RANK_CACHE_MAX);
    return degraded;
  }
}

export function buildAIMatchFallback(_profile: any): AIOpportunity[] { return []; }

export async function warmAllCaches(): Promise<void> {
  await refreshLancingSources();
  feedCache.clear();
  rankingCache.clear();
}

export async function logSearchQuery(
  query: string,
  opts?: { uid?: string | null; result_counts?: Record<string, number> },
): Promise<void> {
  try {
    if (!getFirebaseAdmin()) return;
    const q = query.toLowerCase().trim();
    if (!q || q.length > 80) return;
    await admin.firestore().collection(SEARCH_ANALYTICS_COLLECTION).doc(q).set({
      query: q, count: admin.firestore.FieldValue.increment(1), lastSearched: Date.now(),
    }, { merge: true });
    await admin.firestore().collection("search_logs").add({
      uid: opts?.uid ?? null, query: q, result_counts: opts?.result_counts ?? {}, timestamp: Date.now(),
    });
  } catch { /* analytics best-effort */ }
}

export async function getTrendingSearches(limit = 8): Promise<string[]> {
  try {
    if (!getFirebaseAdmin()) return [];
    const snap = await admin.firestore().collection(SEARCH_ANALYTICS_COLLECTION)
      .orderBy("count", "desc").limit(Math.max(0, Math.min(50, limit))).get();
    const list: string[] = [];
    snap.forEach((doc) => {
      const query = doc.data()?.query;
      if (typeof query === "string" && query.trim()) list.push(query);
    });
    return list;
  } catch { return []; }
}

async function extractSearchIntent(
  query: string,
  category: string,
  datasetVersion: string,
  datasetCount: number,
  candidates: AIOpportunity[],
): Promise<{ intent: string; degraded: boolean }> {
  const started = Date.now();
  let inputTokens = 0;
  let outputTokens = 0;
  try {
    const response: any = await generateGeminiContent({
      model: GEMINI_MODEL,
      contents: JSON.stringify({
        task: "Extract concise search intent keywords and role concepts from this student opportunity search. Return JSON {intent:string}. Do not suggest or generate listings.",
        category,
        query: compactText(query, 300),
        available_opportunities: candidates.slice(0, 100).map((item) => ({
          id: item.id,
          title: compactText(item.title, 160),
          company: compactText(item.company, 80),
          skills: asStringArray(item.skills, 8, 40),
          description: compactText(item.description, 200),
        })),
      }),
      config: { responseMimeType: "application/json", maxOutputTokens: 250 },
    });
    inputTokens = Number(response?.usageMetadata?.promptTokenCount) || 0;
    outputTokens = Number(response?.usageMetadata?.candidatesTokenCount) || 0;
    const parsed = parseGeminiJson(String(response?.text || ""));
    const intent = compactText(parsed?.intent, 400);
    telemetry({ operation: "search_intent", started, success: Boolean(intent), inputTokens, outputTokens, datasetVersion, datasetCount, cacheState: "miss" });
    return { intent: intent || compactText(query, 300), degraded: !intent };
  } catch {
    telemetry({ operation: "search_intent", started, success: false, inputTokens, outputTokens, datasetVersion, datasetCount, cacheState: "miss" });
    return { intent: compactText(query, 300), degraded: true };
  }
}

function sourceCategory(category: "jobs" | "internships" | "micro_tasks"): SourceCategory | null {
  if (category === "jobs") return "jobs";
  if (category === "internships") return "internships";
  return null;
}

async function storedSources(category: SourceCategory): Promise<any[]> {
  const sources = await listVerifiedLancingSources(category);
  return Array.isArray(sources) ? sources : [];
}

export async function searchOpportunities(
  query: string,
  category: "jobs" | "internships" | "micro_tasks",
  candidates: AIOpportunity[] = [],
): Promise<{ items: AIOpportunity[]; cached: boolean; cachedAt: number }> {
  const engine = getLancingAIEngine();
  const cachedAt = Date.now();
  const cat = sourceCategory(category);
  if (!compactText(query, 300)) return { items: [], cached: false, cachedAt };
  const rawSources = cat ? await storedSources(cat) : [];
  const external = cat
    ? rawSources.map((source) => normalizeSource(source, cat)).filter((item): item is AIOpportunity => Boolean(item))
    : [];
  const byId = new Map<string, AIOpportunity>();
  for (const item of [...(Array.isArray(candidates) ? candidates : []), ...external]) {
    const id = typeof item?.id === "string" ? item.id.trim() : "";
    if (!id || !compactText(item?.title, 200) || byId.has(id)) continue;
    byId.set(id, { ...item, id });
  }
  const items = Array.from(byId.values());
  if (!items.length) return { items: [], cached: false, cachedAt };
  const datasetVersion = stableHash([sourceDatasetVersion(rawSources), items]);
  let intent = compactText(query, 300);
  let intentDegraded = false;
  if (engine === "gemini") {
    const extracted = await extractSearchIntent(query, category, datasetVersion, items.length, items);
    intent = extracted.intent;
    intentDegraded = extracted.degraded;
  }
  const ranked = await rankLancingOpportunities(items, { search: query, intent }, intent, "search");
  return { items: ranked.map((item) => ({
    ...item,
    match_score: item.matchScore,
    match_reason: item.matchReason,
    ...(intentDegraded ? { fallback: true, engineStatus: "degraded" as const } : {}),
  })), cached: false, cachedAt };
}

export async function getLiveFeed(
  category: "jobs" | "internships" | "micro_tasks" | "competitions",
  sectors: string[] = [],
  studentProfile: Record<string, unknown> = {},
): Promise<{ data: AIOpportunity[]; cached: boolean; cachedAt: number }> {
  const engine = getLancingAIEngine();
  const cachedAt = Date.now();
  if (category === "micro_tasks") return { data: [], cached: false, cachedAt };
  const sourceCat: SourceCategory = category === "competitions" ? "competitions" : category;
  const sources = await storedSources(sourceCat);
  const datasetVersion = sourceDatasetVersion(sources);
  const sectorKey = Array.from(new Set(sectors.map((sector) => compactText(sector, 80).toLowerCase()).filter(Boolean))).sort().join(",");
  const key = `${sourceCat}:${engine}:success:${datasetVersion}:${sectorKey}:${stableHash(studentProfile)}`;
  const cached = cacheGet(feedCache, key, FEED_CACHE_TTL_MS);
  if (cached) return { data: cached, cached: true, cachedAt };
  const candidates = sources.map((source) => normalizeSource(source, sourceCat))
    .filter((item): item is AIOpportunity => Boolean(item))
    .filter((item) => competitionEligible(item, studentProfile));
  if (!candidates.length) return { data: [], cached: false, cachedAt };
  const data = category === "competitions"
    ? (await rankLancingOpportunities(
      candidates,
      { ...studentProfile, sectors: sectorKey ? sectorKey.split(",") : [] },
      sectorKey,
      "competitions_feed",
    )).map((item) => ({ ...item, match_score: item.matchScore, match_reason: item.matchReason }))
    : candidates;
  const isDegraded = data.some((item) => item.engineStatus === "degraded" || item.fallback === true);
  const cacheKey = isDegraded
    ? `${sourceCat}:${engine}:fallback:${datasetVersion}:${sectorKey}:${stableHash(studentProfile)}`
    : key;
  cacheSet(feedCache, cacheKey, data, 30);
  return { data, cached: false, cachedAt };
}

export interface AIMatchInput {
  resumeText: string;
  profile: {
    skills: string[];
    branch?: string;
    year?: string;
    preferredRole?: string;
    workMode?: string;
    stipendExpectation?: string;
    [key: string]: unknown;
  };
  candidates?: AIOpportunity[];
}

const RESUME_EVIDENCE_STOP_WORDS = new Set([
  "about", "after", "also", "and", "are", "based", "been", "being", "can", "currently",
  "data", "developed", "experience", "for", "from", "have", "into", "intern", "internship",
  "is", "it", "its", "more", "our", "over", "project", "projects", "responsible", "skills",
  "team", "the", "their", "this", "through", "to", "using", "was", "with", "work", "worked",
  "year",
]);
const RECOGNIZED_RESUME_SKILLS = new Set([
  "angular", "aws", "azure", "c", "c#", "c++", "css", "django", "docker", "express",
  "figma", "firebase", "git", "go", "graphql", "html", "java", "javascript", "kotlin",
  "kubernetes", "linux", "mongodb", "mysql", "node.js", "pandas", "php", "postgresql",
  "python", "react", "redis", "ruby", "rust", "scala", "spring", "sql", "swift",
  "tensorflow", "typescript", "vue",
]);

/**
 * Keep only a short, normalized evidence list for local ranking. The raw resume is
 * never placed in rank profiles, cache keys, or telemetry.
 */
function resumeEvidence(resumeText: unknown): { terms: string[]; skills: string[] } {
  const boundedText = compactText(resumeText, 6_000).toLowerCase();
  const tokens = boundedText.match(/[a-z][a-z0-9+#.]{1,}/g) || [];
  const terms: string[] = [];
  const seen = new Set<string>();
  for (const rawToken of tokens) {
    const token = rawToken.replace(/^\.+|\.+$/g, "");
    if (token.length < 2 || RESUME_EVIDENCE_STOP_WORDS.has(token) || seen.has(token)) continue;
    seen.add(token);
    terms.push(token);
    if (terms.length >= 40) break;
  }
  const skills = terms.filter((term) => RECOGNIZED_RESUME_SKILLS.has(term)).slice(0, 20);
  return { terms, skills };
}

function profileWithResumeEvidence(profile: any, resumeText: unknown): any {
  const evidence = resumeEvidence(resumeText);
  const existingSkills = asStringArray(profile?.skills, 40, 60);
  const skills = Array.from(new Set([...existingSkills, ...evidence.skills])).slice(0, 40);
  return { ...(profile || {}), skills, resumeTerms: evidence.terms };
}

export async function getAIMatches(input: AIMatchInput): Promise<AIOpportunity[]> {
  const engine = getLancingAIEngine();
  const sourceGroups = await Promise.all([
    storedSources("jobs"),
    storedSources("internships"),
    storedSources("competitions"),
  ]);
  const externalRaw = sourceGroups.flat();
  const external = sourceGroups.flatMap((sources, index) => {
    const category: SourceCategory = index === 0 ? "jobs" : index === 1 ? "internships" : "competitions";
    return sources.map((source) => normalizeSource(source, category))
      .filter((item): item is AIOpportunity => Boolean(item));
  });
  const provided = Array.isArray(input.candidates) ? input.candidates.slice(0, 100) : [];
  const all = new Map<string, AIOpportunity>();
  for (const candidate of [...external, ...provided]) {
    if (candidate?.id && !all.has(candidate.id)) all.set(candidate.id, candidate);
  }
  // Filter before either profile extraction or ranking so stale listings are
  // never presented to Gemini. Verified competition records are not governed
  // by the rolling job/internship posting window.
  const candidates = Array.from(all.values()).filter((candidate) => {
    const metadata = candidate.source_metadata;
    const isVerifiedCompetition = metadata?.verified === true
      && metadata.verificationStatus === "VERIFIED_EXTERNAL"
      && metadata.category === "competitions";
    return (isVerifiedCompetition || isRecentPosting(candidate.posted_at))
      && competitionEligible(candidate, input.profile);
  });
  if (!candidates.length) return [];

  const started = Date.now();
  let profile = input.profile || {};
  let profileDegraded = false;
  let inTokens = 0;
  let outTokens = 0;
  if (engine === "legacy") {
    profile = profileWithResumeEvidence(input.profile, input.resumeText);
  } else {
    const profileInput = JSON.stringify({
      resume: compactText(input.resumeText, 8000),
      profile: compactText(JSON.stringify(input.profile || {}), 3000),
    });
    try {
      const response: any = await generateGeminiContent({
        model: GEMINI_MODEL,
        contents: JSON.stringify({
          task: "Extract a concise structured student career profile from resume and profile. Do not suggest opportunities. Return JSON with skills, branch, year, preferredRole, workMode, stipendExpectation.",
          student: profileInput,
        }),
        config: { responseMimeType: "application/json", maxOutputTokens: 500 },
      });
      inTokens = Number(response?.usageMetadata?.promptTokenCount) || 0;
      outTokens = Number(response?.usageMetadata?.candidatesTokenCount) || 0;
      const parsed = parseGeminiJson(String(response?.text || ""));
      const profileFields = ["skills", "branch", "year", "preferredRole", "workMode", "stipendExpectation"];
      const hasExtractedEvidence = parsed && typeof parsed === "object" && !Array.isArray(parsed)
        && profileFields.some((field) => Array.isArray(parsed[field])
          ? parsed[field].length > 0
          : typeof parsed[field] === "string" && parsed[field].trim().length > 0);
      if (!hasExtractedEvidence) throw new Error("Gemini returned no usable resume profile evidence.");
      profile = {
        ...input.profile,
        ...parsed,
        skills: asStringArray(parsed?.skills, 40, 60),
      };
      telemetry({ operation: "resume_profile_extraction", started, success: true, inputTokens: inTokens, outputTokens: outTokens, datasetVersion: stableHash(candidates), datasetCount: candidates.length, cacheState: "miss" });
    } catch {
      telemetry({ operation: "resume_profile_extraction", started, success: false, inputTokens: inTokens, outputTokens: outTokens, datasetVersion: stableHash(candidates), datasetCount: candidates.length, cacheState: "miss" });
      profileDegraded = true;
      profile = profileWithResumeEvidence(input.profile, input.resumeText);
    }
  }

  const resumeTerms = asStringArray(profile.resumeTerms, 40, 40);
  const ranked = await rankLancingOpportunities(
    candidates,
    profile,
    compactText(`${profile.preferredRole || ""} ${asStringArray(profile.skills, 20).join(" ")} ${resumeTerms.join(" ")}`, 500),
    "resume_match",
  );
  return ranked.map((item) => ({
    ...item,
    match_score: item.matchScore,
    match_reason: item.matchReason,
    ...(profileDegraded ? { fallback: true, engineStatus: "degraded" as const } : {}),
  }));
}