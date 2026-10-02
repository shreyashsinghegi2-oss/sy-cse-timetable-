export type BrabbleDeadlineKind = "REGISTRATION" | "START_TIME";

export interface BrabbleCompetition {
  id: string;
  title: string;
  url: string;
  applicationUrl: string;
  shareUrl: string | null;
  source: "Brabble.ai";
  attribution: string;
  deadline: string;
  deadlineKind: BrabbleDeadlineKind;
  registrationDeadline: string | null;
  startsAt: string | null;
  organizer: string | null;
  description: string | null;
  participationMode: "ONLINE" | "OFFLINE" | "HYBRID" | null;
  location: string | null;
  prize: string | null;
  fee: string | null;
  eligibility: string[] | null;
  type: string | null;
  kind: "competition" | "contest";
  refreshedAt: string;
}

export interface CollectBrabbleOptions {
  apiKey?: string;
  fetch?: typeof fetch;
  now?: () => Date;
}

const API_URL = "https://brabble.ai/api/listings";
const ALLOWED_HOST = "brabble.ai";
const PAGE_SIZE = 200;
const MAX_PAGES = 3;
const MAX_RESPONSE_BYTES = 1_500_000;
const REQUEST_TIMEOUT_MS = 10_000;
const MAX_SNAPSHOT_AGE_MS = 24 * 60 * 60 * 1000;
const ATTRIBUTION =
  "Free to use, including commercially. Please credit Brabble.ai and link back where a reader can see it.";

function cleanText(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  return cleaned ? cleaned.slice(0, maxLength) : null;
}

function normalizedPlaceholder(value: unknown): string | null {
  const cleaned = cleanText(value, 500);
  return cleaned && !/^see listing$/i.test(cleaned) ? cleaned : null;
}

function safeHttpsUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || !url.hostname || url.username || url.password || url.port) return null;
    return url.toString();
  } catch {
    return null;
  }
}

function brabbleShareUrl(value: unknown): string | null {
  const safeUrl = safeHttpsUrl(value);
  if (!safeUrl) return null;
  const url = new URL(safeUrl);
  return url.hostname.toLowerCase() === ALLOWED_HOST ? safeUrl : null;
}

function parseIso(value: unknown): string | null {
  if (typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/i.test(value)) return null;
  const milliseconds = Date.parse(value);
  return Number.isFinite(milliseconds) ? new Date(milliseconds).toISOString() : null;
}

function normalizeRecord(
  value: unknown,
  refreshedAt: string,
  now: Date,
): BrabbleCompetition | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  const id = cleanText(row.id, 160);
  const title = cleanText(row.title, 240);
  const kind = row.kind;
  const deadline = parseIso(row.deadline);
  const applicationUrl = safeHttpsUrl(row.url);
  if (!id || !title || !deadline || !applicationUrl ||
    (kind !== "competition" && kind !== "contest")) return null;

  const deadlineTime = Date.parse(deadline);
  if (!Number.isFinite(deadlineTime) || deadlineTime <= now.getTime()) return null;
  const eligibility = Array.isArray(row.eligibility)
    ? Array.from(new Set(row.eligibility
      .map((entry) => cleanText(entry, 300))
      .filter((entry): entry is string => !!entry))).slice(0, 20)
    : null;
  const mode = row.mode === "ONLINE" || row.mode === "OFFLINE" || row.mode === "HYBRID" ? row.mode : null;
  const shareUrl = brabbleShareUrl(row.shareUrl);

  return {
    id,
    title,
    url: applicationUrl,
    applicationUrl,
    shareUrl,
    source: "Brabble.ai",
    attribution: ATTRIBUTION,
    deadline,
    deadlineKind: kind === "competition" ? "REGISTRATION" : "START_TIME",
    registrationDeadline: kind === "competition" ? deadline : null,
    startsAt: kind === "contest" ? deadline : parseIso(row.startsAt),
    organizer: cleanText(row.organiser, 200),
    description: cleanText(row.description, 5000),
    participationMode: mode,
    location: normalizedPlaceholder(row.city),
    prize: normalizedPlaceholder((row.prize as Record<string, unknown> | null)?.label),
    fee: normalizedPlaceholder(row.fee),
    eligibility: eligibility?.length ? eligibility : null,
    type: cleanText(row.type, 80),
    kind,
    refreshedAt,
  };
}

async function readJson(response: Response): Promise<unknown> {
  if ((response.status >= 300 && response.status < 400) || response.redirected) {
    throw new Error("Brabble redirects are refused");
  }
  if (!response.ok) throw new Error(`Brabble returned HTTP ${response.status}`);
  if (!/application\/json\b/i.test(response.headers.get("content-type") || "")) {
    throw new Error("Brabble returned an unexpected content type");
  }
  const contentLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > MAX_RESPONSE_BYTES) {
    throw new Error("Brabble response exceeds the body size limit");
  }
  const reader = response.body?.getReader();
  if (!reader) throw new Error("Brabble response has no readable body");
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_RESPONSE_BYTES) {
      await reader.cancel();
      throw new Error("Brabble response exceeds the body size limit");
    }
    chunks.push(value);
  }
  try {
    return JSON.parse(new TextDecoder().decode(Buffer.concat(chunks)));
  } catch {
    throw new Error("Brabble returned malformed JSON");
  }
}

async function fetchPage(
  fetcher: typeof fetch,
  apiKey: string,
  offset: number,
): Promise<{ listings: unknown[]; total: number; refreshedAt: string; remaining: number | null }> {
  const url = new URL(API_URL);
  if (url.protocol !== "https:" || url.hostname !== ALLOWED_HOST) {
    throw new Error("Brabble API URL is not allowed");
  }
  url.searchParams.set("limit", String(PAGE_SIZE));
  url.searchParams.set("offset", String(offset));
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetcher(url, {
      method: "GET",
      redirect: "manual",
      signal: controller.signal,
      headers: {
        accept: "application/json",
        authorization: `Bearer ${apiKey}`,
      },
    });
    const payload = await readJson(response);
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      throw new Error("Brabble returned a malformed listings response");
    }
    const body = payload as Record<string, unknown>;
    const refreshedAt = parseIso(body.refreshedAt);
    const total = body.total;
    const limit = body.limit;
    const echoedOffset = body.offset;
    const count = body.count;
    if (!Array.isArray(body.listings) || !refreshedAt ||
      !Number.isSafeInteger(total) || Number(total) < 0 ||
      !Number.isSafeInteger(limit) || Number(limit) < 1 || Number(limit) > PAGE_SIZE ||
      !Number.isSafeInteger(echoedOffset) || Number(echoedOffset) !== offset ||
      !Number.isSafeInteger(count) || Number(count) !== body.listings.length) {
      throw new Error("Brabble response does not match its documented listings schema");
    }
    const remainingHeader = response.headers.get("x-ratelimit-remaining");
    const remaining = remainingHeader === null ? null : Number(remainingHeader);
    if (remainingHeader !== null && (!Number.isInteger(remaining) || Number(remaining) < 0)) {
      throw new Error("Brabble returned an invalid rate-limit header");
    }
    return { listings: body.listings, total: Number(total), refreshedAt, remaining };
  } finally {
    clearTimeout(timer);
  }
}

export async function collectBrabbleCompetitions(
  options: CollectBrabbleOptions = {},
): Promise<BrabbleCompetition[]> {
  const apiKey = options.apiKey?.trim();
  if (!apiKey || !/^brbl_[a-f0-9]{64}$/i.test(apiKey)) {
    throw new Error("A valid Brabble API key is required; configure it as a server secret.");
  }
  const fetcher = options.fetch || globalThis.fetch;
  const now = options.now?.() || new Date();
  const records: BrabbleCompetition[] = [];
  let offset = 0;
  let snapshotTime: string | null = null;

  for (let page = 0; page < MAX_PAGES; page += 1) {
    const result = await fetchPage(fetcher, apiKey, offset);
    const refreshedAtMs = Date.parse(result.refreshedAt);
    if (refreshedAtMs > now.getTime() + 5 * 60 * 1000) {
      throw new Error("Brabble snapshot timestamp is unexpectedly in the future");
    }
    if (now.getTime() - refreshedAtMs > MAX_SNAPSHOT_AGE_MS) {
      throw new Error("Brabble snapshot is older than the 24-hour freshness limit");
    }
    if (snapshotTime && snapshotTime !== result.refreshedAt) {
      throw new Error("Brabble snapshot changed during pagination; retry the refresh");
    }
    snapshotTime = result.refreshedAt;

    for (const row of result.listings) {
      const record = normalizeRecord(row, result.refreshedAt, now);
      if (record) records.push(record);
    }

    offset += result.listings.length;
    if (offset >= result.total || offset >= PAGE_SIZE * MAX_PAGES) return records;
    if (result.listings.length === 0) {
      throw new Error("Brabble returned an empty page before the advertised total");
    }
    if (result.remaining === 0) {
      throw new Error("Brabble daily rate limit is exhausted before pagination completed");
    }
  }
  return records;
}

export const __testing = {
  cleanText,
  normalizedPlaceholder,
  safeHttpsUrl,
  parseIso,
  normalizeRecord,
  readJson,
  fetchPage,
  PAGE_SIZE,
  MAX_PAGES,
  MAX_RESPONSE_BYTES,
  MAX_SNAPSHOT_AGE_MS,
  REQUEST_TIMEOUT_MS,
  ATTRIBUTION,
};