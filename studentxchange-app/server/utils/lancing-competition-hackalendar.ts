export interface HackalendarCompetition {
  id: string;
  title: string;
  url: string;
  applicationUrl: string;
  deadline: string;
  registrationDeadline: string;
  deadlineKind: "REGISTRATION";
  organizer: string | null;
  description: string | null;
  startsAt: string | null;
  endsAt: string | null;
  location: string | null;
  participationMode: string | null;
  themes: string[] | null;
  imageUrl?: string | null;
}

export interface CollectHackalendarOptions {
  fetch?: typeof fetch;
  now?: () => Date;
}

const API_URL = "https://hackalendar.com/api/events";
const ALLOWED_HOST = "hackalendar.com";
const PAGE_SIZE = 200;
const MAX_PAGES = 5;
const MAX_RECORDS = PAGE_SIZE * MAX_PAGES;
const MAX_RESPONSE_BYTES = 1_500_000;
const REQUEST_TIMEOUT_MS = 10_000;
const MAX_DESCRIPTION_LENGTH = 5_000;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function text(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const clean = value.replace(/<[^>]*>/g, " ").replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'").replace(/\s+/g, " ").trim();
  return clean ? clean.slice(0, maxLength) : null;
}

function isoDate(value: unknown, inclusiveEndOfDay = false): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const source = value.trim();
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(source);
  if (!dateOnly && /T/i.test(source) && !/(?:z|[+-]\d{2}:?\d{2})$/i.test(source)) return null;
  const date = new Date(dateOnly && inclusiveEndOfDay ? `${source}T23:59:59.999Z` : source);
  if (!Number.isFinite(date.getTime())) return null;
  if (dateOnly && date.toISOString().slice(0, 10) !== source) return null;
  return date.toISOString();
}

function publishedDate(value: unknown, inclusiveEndOfDay = false): string | null {
  const parsed = isoDate(value, inclusiveEndOfDay);
  if (!parsed || typeof value !== "string") return null;
  return /^\d{4}-\d{2}-\d{2}$/.test(value.trim()) ? value.trim() : parsed;
}

function allowedApplicationUrl(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || url.port) return null;
    return url.toString();
  } catch {
    return null;
  }
}

function allowedEventUrl(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.hostname.toLowerCase() !== ALLOWED_HOST ||
      url.username || url.password || url.port || !/^\/e\/[a-z0-9][a-z0-9-]*\/?$/i.test(url.pathname)) return null;
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

function normalizeRecord(input: unknown, now: Date): HackalendarCompetition | null {
  if (!isPlainObject(input)) return null;
  const id = text(input.id, 160);
  const title = text(input.name, 240);
  const url = allowedEventUrl(input.url);
  const applicationUrl = allowedApplicationUrl(input.registrationUrl);
  const registrationDeadline = isoDate(input.registrationDeadline, true);
  const endsAt = isoDate(input.endAt, true);
  const startsAt = publishedDate(input.startAt);
  const deadlineTime = registrationDeadline ? Date.parse(registrationDeadline) : NaN;

  if (!id || !title || !url || !applicationUrl || !registrationDeadline ||
    !Number.isFinite(deadlineTime) || deadlineTime <= now.getTime()) return null;
  if (endsAt && Date.parse(endsAt) <= now.getTime()) return null;
  if ((input.cancelled === true || input.withdrawn === true) ||
    ["cancelled", "withdrawn"].includes(String(input.status || "").toLowerCase())) return null;

  const mode = ["online", "in_person", "hybrid"].includes(String(input.mode))
    ? String(input.mode).replace("_", "-").replace(/^./, (letter) => letter.toUpperCase())
    : null;
  const themes = Array.isArray(input.themes)
    ? Array.from(new Set(input.themes.map((value) => text(value, 80)).filter((value): value is string => !!value))).slice(0, 20)
    : null;

  return {
    id,
    title,
    url,
    applicationUrl,
    deadline: registrationDeadline,
    registrationDeadline,
    deadlineKind: "REGISTRATION",
    organizer: text(input.organizer, 200),
    description: text(input.description, MAX_DESCRIPTION_LENGTH),
    startsAt,
    endsAt: publishedDate(input.endAt, true),
    location: text(input.location, 200),
    participationMode: mode,
    themes: themes?.length ? themes : null,
  };
}

async function readJsonBounded(response: Response): Promise<unknown> {
  if ((response.status >= 300 && response.status < 400) || response.redirected) {
    throw new Error("Hackalendar redirects are refused");
  }
  if (!response.ok) throw new Error(`Hackalendar returned HTTP ${response.status}`);
  const contentType = response.headers.get("content-type") || "";
  if (!/application\/json\b/i.test(contentType)) throw new Error("Hackalendar returned a non-JSON response");
  const reader = response.body?.getReader();
  if (!reader) throw new Error("Hackalendar response has no readable body");
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_RESPONSE_BYTES) {
      await reader.cancel();
      throw new Error("Hackalendar response exceeds the body size limit");
    }
    chunks.push(value);
  }
  try {
    return JSON.parse(new TextDecoder().decode(Buffer.concat(chunks)));
  } catch {
    throw new Error("Hackalendar returned malformed JSON");
  }
}

async function fetchPage(fetcher: typeof fetch, offset: number): Promise<{
  data: unknown[];
  hasMore: boolean;
  nextOffset: number | null;
}> {
  const url = new URL(API_URL);
  url.searchParams.set("limit", String(PAGE_SIZE));
  url.searchParams.set("offset", String(offset));
  if (url.protocol !== "https:" || url.hostname !== ALLOWED_HOST) throw new Error("Hackalendar API URL is not allowed");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetcher(url, {
      method: "GET",
      redirect: "manual",
      signal: controller.signal,
      headers: { accept: "application/json" },
    });
    const payload = await readJsonBounded(response);
    if (!isPlainObject(payload) || !Array.isArray(payload.data) || !isPlainObject(payload.meta)) {
      throw new Error("Hackalendar response does not match the documented { data, meta } schema");
    }
    if (payload.data.length > PAGE_SIZE || typeof payload.meta.hasMore !== "boolean") {
      throw new Error("Hackalendar response exceeds the documented page limit or has invalid pagination metadata");
    }
    const rawNextOffset = payload.meta.nextOffset;
    const nextOffset = rawNextOffset == null ? null : typeof rawNextOffset === "number" &&
      Number.isInteger(rawNextOffset) ? rawNextOffset : NaN;
    if (nextOffset !== null && (!Number.isInteger(nextOffset) || nextOffset <= offset)) {
      throw new Error("Hackalendar returned an invalid nextOffset");
    }
    if (payload.meta.hasMore && nextOffset === null) {
      throw new Error("Hackalendar has more records but omitted nextOffset");
    }
    return { data: payload.data, hasMore: payload.meta.hasMore, nextOffset };
  } finally {
    clearTimeout(timeout);
  }
}

export async function collectHackalendarCompetitions(
  options: CollectHackalendarOptions = {},
): Promise<HackalendarCompetition[]> {
  const fetcher = options.fetch || globalThis.fetch;
  const now = options.now?.() || new Date();
  const records: HackalendarCompetition[] = [];
  const seen = new Set<string>();
  let offset = 0;
  let pages = 0;

  while (true) {
    if (pages >= MAX_PAGES) throw new Error(`Hackalendar pagination exceeds the ${MAX_PAGES}-page collection limit`);
    const page = await fetchPage(fetcher, offset);
    pages += 1;
    if (records.length + page.data.length > MAX_RECORDS) {
      throw new Error(`Hackalendar pagination exceeds the ${MAX_RECORDS}-record collection limit`);
    }
    for (const raw of page.data) {
      const record = normalizeRecord(raw, now);
      if (!record) continue;
      const identity = `${record.id}\u0000${record.url}`;
      if (!seen.has(identity)) {
        seen.add(identity);
        records.push(record);
      }
    }
    if (!page.hasMore) return records;
    if (pages >= MAX_PAGES) throw new Error(`Hackalendar pagination exceeds the ${MAX_PAGES}-page collection limit`);
    offset = page.nextOffset!;
  }
}

export const __testing = {
  isoDate,
  publishedDate,
  normalizeRecord,
  allowedEventUrl,
  allowedApplicationUrl,
  readJsonBounded,
  fetchPage,
  PAGE_SIZE,
  MAX_PAGES,
  MAX_RECORDS,
  MAX_RESPONSE_BYTES,
  REQUEST_TIMEOUT_MS,
};