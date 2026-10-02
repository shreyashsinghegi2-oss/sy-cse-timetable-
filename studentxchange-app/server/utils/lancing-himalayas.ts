import { createHash } from "node:crypto";
import { isRecentPosting } from "./lancing-posting-freshness";

export type HimalayasCategory = "jobs" | "internships";

export interface HimalayasOpportunity {
  id: string;
  title: string;
  company: string;
  source: "Himalayas";
  source_url: string;
  source_listing_url: string;
  url: string;
  skills: string[];
  stipend: string;
  work_mode: "Remote";
  category: HimalayasCategory;
  deadline: string;
  location: string;
  description: string;
  posted_at: string;
  employment_type: string;
  verification_status: "VERIFIED_EXTERNAL";
  source_id: "himalayas-jobs" | "himalayas-internships";
  scraped_at: string;
  last_verified_at: string;
  source_updated_at: string;
  parser_version: "himalayas-api-1";
  raw_content_hash: string;
}

const HIMALAYAS_ORIGIN = "https://himalayas.app";
const ENDPOINTS: Record<HimalayasCategory, string> = {
  jobs: `${HIMALAYAS_ORIGIN}/jobs/api/search?q=junior&country=IN&sort=recent&page=1`,
  internships: `${HIMALAYAS_ORIGIN}/jobs/api/search?q=internship&country=IN&sort=recent&page=1`,
};
const PAGINATION_ENDPOINTS: Record<HimalayasCategory, readonly string[]> = {
  jobs: [
    ENDPOINTS.jobs,
    `${HIMALAYAS_ORIGIN}/jobs/api/search?q=junior&country=IN&sort=recent&page=2`,
    `${HIMALAYAS_ORIGIN}/jobs/api/search?q=junior&country=IN&sort=recent&page=3`,
  ],
  internships: [
    ENDPOINTS.internships,
    `${HIMALAYAS_ORIGIN}/jobs/api/search?q=internship&country=IN&sort=recent&page=2`,
    `${HIMALAYAS_ORIGIN}/jobs/api/search?q=internship&country=IN&sort=recent&page=3`,
  ],
};
const ALLOWED_ENDPOINTS = new Set(Object.values(PAGINATION_ENDPOINTS).flat());
const REQUEST_TIMEOUT_MS = 12_000;
const MAX_RESPONSE_BYTES = 1_500_000;
const MAX_ITEMS = 20;
const MAX_PAGES = 3;
// Search responses can use the newest matching listing's publication time
// as updatedAt, even while the provider serves the current open-job feed.
// Bound that age without treating a quiet three-day search as a failed sync.
const MAX_PROVIDER_AGE_MS = 14 * 24 * 60 * 60 * 1000;
const MAX_FUTURE_SKEW_MS = 5 * 60 * 1000;
const TEN_YEARS_MS = 10 * 365 * 24 * 60 * 60 * 1000;

function safeText(value: unknown, maxLength: number): string {
  if (typeof value !== "string") return "";
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength)
    .trim();
}

function timestampFromSeconds(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return null;
  const timestamp = value * 1000;
  return Number.isFinite(timestamp) ? timestamp : null;
}

function safeHimalayasUrl(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 2_000) return null;
  try {
    const url = new URL(value);
    if (
      url.protocol !== "https:"
      || url.origin !== HIMALAYAS_ORIGIN
      || url.username
      || url.password
      || !/^\/companies\/[^/?#]+\/jobs\/[^/?#]+\/?$/.test(url.pathname)
    ) {
      return null;
    }
    url.search = "";
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

function boundedSalary(job: Record<string, unknown>): string {
  const currency = safeText(job.currency, 8);
  const period = safeText(job.salaryPeriod, 24);
  const min = typeof job.minSalary === "number" && Number.isFinite(job.minSalary) && job.minSalary >= 0
    ? job.minSalary : null;
  const max = typeof job.maxSalary === "number" && Number.isFinite(job.maxSalary) && job.maxSalary >= 0
    ? job.maxSalary : null;
  if (min === null && max === null) return "Not specified";

  const amount = min === null
    ? `Up to ${max}`
    : max === null || max === min ? `${min}` : `${min}–${max}`;
  return [currency, amount, period].filter(Boolean).join(" ");
}

function normalizeRecord(
  category: HimalayasCategory,
  raw: unknown,
  sourceUpdatedAt: string,
  now: Date,
): HimalayasOpportunity | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const job = raw as Record<string, unknown>;
  const title = safeText(job.title, 200);
  const company = safeText(job.companyName, 160);
  const employmentType = safeText(job.employmentType, 80);
  const applicationUrl = safeHimalayasUrl(job.applicationLink ?? job.guid);
  const postedAtMs = timestampFromSeconds(job.pubDate);
  const expiryMs = timestampFromSeconds(job.expiryDate);
  const nowMs = now.getTime();

  if (
    !title
    || !company
    || !employmentType
    || !applicationUrl
    || postedAtMs === null
    || expiryMs === null
    || postedAtMs < Date.UTC(2000, 0, 1)
    || !isRecentPosting(postedAtMs, now)
    || expiryMs <= nowMs
    || expiryMs > nowMs + TEN_YEARS_MS
  ) {
    return null;
  }
  if (!Array.isArray(job.locationRestrictions)) return null;
  const locationRestrictions = job.locationRestrictions
    .map((location) => safeText(location, 100))
    .filter(Boolean);
  if (job.locationRestrictions.some((location) => typeof location !== "string")) return null;
  if (locationRestrictions.some((location) => location.toLowerCase() !== "india")) return null;

  const isInternship = employmentType.toLowerCase() === "intern";
  if (category === "internships" ? !isInternship : isInternship) return null;

  const tags = [
    ...(Array.isArray(job.categories) ? job.categories : []),
    ...(Array.isArray(job.parentCategories) ? job.parentCategories : []),
  ];
  const skills = Array.from(new Set(tags
    .map((tag) => safeText(tag, 60))
    .filter(Boolean))).slice(0, 20);
  const description = safeText(job.excerpt, 600);
  const record: HimalayasOpportunity = {
    id: `himalayas:${createHash("sha256").update(applicationUrl).digest("hex").slice(0, 24)}`,
    title,
    company,
    source: "Himalayas",
    source_url: applicationUrl,
    source_listing_url: ENDPOINTS[category],
    url: applicationUrl,
    skills,
    stipend: boundedSalary(job),
    work_mode: "Remote",
    category,
    deadline: new Date(expiryMs).toISOString(),
    location: locationRestrictions.length ? locationRestrictions.join(", ") : "Not specified",
    description,
    posted_at: new Date(postedAtMs).toISOString(),
    employment_type: employmentType,
    verification_status: "VERIFIED_EXTERNAL",
    source_id: category === "jobs" ? "himalayas-jobs" : "himalayas-internships",
    scraped_at: now.toISOString(),
    last_verified_at: now.toISOString(),
    source_updated_at: sourceUpdatedAt,
    parser_version: "himalayas-api-1",
    raw_content_hash: "",
  };
  record.raw_content_hash = createHash("sha256").update(JSON.stringify(job)).digest("hex");
  return record;
}

function normalizeHimalayasPage(
  category: HimalayasCategory,
  payload: unknown,
  now: Date,
): { records: HimalayasOpportunity[]; returnedCount: number; totalCount: number } {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("Himalayas API returned an invalid response object");
  }
  const response = payload as Record<string, unknown>;
  if (!Array.isArray(response.jobs)) {
    throw new Error("Himalayas API response is missing its jobs array");
  }
  if (
    typeof response.totalCount !== "number"
    || !Number.isInteger(response.totalCount)
    || response.totalCount < 0
  ) {
    throw new Error("Himalayas API response has an invalid totalCount");
  }

  const updatedAtMs = timestampFromSeconds(response.updatedAt);
  const nowMs = now.getTime();
  if (
    updatedAtMs === null
    || updatedAtMs > nowMs + MAX_FUTURE_SKEW_MS
    || nowMs - updatedAtMs > MAX_PROVIDER_AGE_MS
  ) {
    throw new Error("Himalayas API data is stale or has an invalid update timestamp");
  }
  const sourceUpdatedAt = new Date(updatedAtMs).toISOString();
  const records = response.jobs
    .map((job) => normalizeRecord(category, job, sourceUpdatedAt, now))
    .filter((job): job is HimalayasOpportunity => job !== null);
  return { records, returnedCount: response.jobs.length, totalCount: response.totalCount };
}

export function normalizeHimalayasResponse(
  category: HimalayasCategory,
  payload: unknown,
  now: Date,
): HimalayasOpportunity[] {
  const page = normalizeHimalayasPage(category, payload, now);
  const unique = new Map(page.records.map((record) => [record.source_url, record]));
  return Array.from(unique.values()).slice(0, MAX_ITEMS);
}

async function fetchHimalayasJson(url: string): Promise<unknown> {
  const parsedUrl = new URL(url);
  if (parsedUrl.protocol !== "https:" || parsedUrl.origin !== HIMALAYAS_ORIGIN || !ALLOWED_ENDPOINTS.has(url)) {
    throw new Error("Refusing to fetch an unregistered Himalayas API URL");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      method: "GET",
      redirect: "manual",
      cache: "no-store",
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "User-Agent": "StudentLancingSourceRefresh/1.0 (Himalayas public jobs API)",
      },
    });
    if (response.status !== 200) {
      throw new Error(`Himalayas API returned HTTP ${response.status}`);
    }
    if (!/^application\/json\b/i.test(response.headers.get("content-type") || "")) {
      throw new Error("Himalayas API returned a non-JSON response");
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error("Himalayas API response has no readable body");
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size >= MAX_RESPONSE_BYTES) {
        await reader.cancel().catch(() => undefined);
        throw new Error("Himalayas API response exceeds the size limit");
      }
      chunks.push(value);
    }
    return JSON.parse(new TextDecoder().decode(Buffer.concat(chunks)));
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchHimalayasCategory(
  category: HimalayasCategory,
  dependencies: {
    fetchJson?: (url: string) => Promise<unknown>;
    now?: () => Date;
  } = {},
): Promise<HimalayasOpportunity[]> {
  if (category !== "jobs" && category !== "internships") {
    throw new TypeError("Invalid Himalayas category");
  }
  const fetchJson = dependencies.fetchJson || fetchHimalayasJson;
  const now = dependencies.now?.() || new Date();
  const results = new Map<string, HimalayasOpportunity>();
  let totalFetched = 0;

  for (const url of PAGINATION_ENDPOINTS[category].slice(0, MAX_PAGES)) {
    const payload = await fetchJson(url);
    const page = normalizeHimalayasPage(category, payload, now);
    totalFetched += page.returnedCount;

    for (const record of page.records) {
      if (!results.has(record.source_url)) results.set(record.source_url, record);
    }
    if (results.size >= MAX_ITEMS) {
      return Array.from(results.values()).slice(0, MAX_ITEMS);
    }
    if (page.returnedCount === 0 || totalFetched >= page.totalCount) break;
  }

  return Array.from(results.values()).slice(0, MAX_ITEMS);
}

export const __testing = {
  ENDPOINTS,
  PAGINATION_ENDPOINTS,
  MAX_ITEMS,
  MAX_PAGES,
  normalizeHimalayasPage,
  normalizeRecord,
  safeHimalayasUrl,
};