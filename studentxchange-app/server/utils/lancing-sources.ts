import { createHash } from "node:crypto";
import { getFirebaseAdmin } from "../firebase-admin";
import { fetchHimalayasCategory } from "./lancing-himalayas";
import { HIMALAYAS_VERIFICATION_TTL_MS, isRecentPosting } from "./lancing-posting-freshness";
import { collectDevfolioCompetitions } from "./lancing-competition-devfolio";
import { collectHackalendarCompetitions } from "./lancing-competition-hackalendar";
import { collectCodeforcesCompetitions } from "./lancing-competition-codeforces";
import { collectBrabbleCompetitions } from "./lancing-competition-brabble";

export type LancingCategory = "competitions" | "jobs" | "internships";

export interface LancingSourceMetadata {
  id: string;
  name: string;
  origin: string;
  category: LancingCategory;
  listingUrl: string;
  enabled: boolean;
  status: "enabled" | "disabled";
  refresh_interval_hours: number;
  robotsReviewed: boolean;
  termsReviewed: boolean;
  disabledReason?: string;
}

type Opportunity = {
  title: string;
  company: string;
  type?: string;
  description?: string;
  source: string;
  source_url: string;
  source_listing_url: string;
  url: string;
  skills: string[];
  stipend: string;
  work_mode: string;
  category: LancingCategory;
  deadline: string;
  verification_status: "VERIFIED_EXTERNAL";
  source_id: string;
  scraped_at: string;
  last_verified_at: string;
  parser_version: string;
  raw_content_hash: string;
  id?: string;
  organizer?: string | null;
  registrationDeadline?: string | null;
  deadlineKind?: "REGISTRATION" | "START_TIME";
  registrationStart?: string | null;
  applicationUrl?: string;
  sourceCompetitionId?: string | null;
  eligibility?: string | null;
  themes?: string[] | null;
  eligibleDegrees?: string[] | null;
  eligibleYears?: string[] | null;
  subcategory?: string | null;
  fee?: string | null;
  participants?: number | null;
  stages?: unknown[] | null;
  tags?: string[] | null;
  imageUrl?: string | null;
  sourcePublishedAt?: string | null;
  expiresAt?: string;
  status?: string;
  prize?: string | null;
  source_references?: string[];
  location?: string | null;
  eventStart?: string | null;
  eventEnd?: string | null;
  teamSizeMin?: number | null;
  teamSizeMax?: number | null;
};

const PARSER_VERSION = "1";
const CACHE_TTL_MS = 12 * 60 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 10_000;
const MAX_RESPONSE_BYTES = 1_500_000;
const SOURCE_DELAY_MS = 1_500;
const SOURCES: LancingSourceMetadata[] = [
  {
    id: "unstop-competitions",
    name: "Unstop",
    origin: "https://unstop.com",
    category: "competitions",
    listingUrl: "https://unstop.com/competitions?oppType=competitions&category=coding",
    enabled: false,
    status: "disabled",
    refresh_interval_hours: 12,
    robotsReviewed: true,
    termsReviewed: false,
    disabledReason: "Public paths are listed in robots.txt and opportunity sitemap, but terms do not establish permission for automated listing extraction; a detail-page probe returned a generic shell without listing evidence.",
  },
  {
    id: "devfolio-competitions",
    name: "Devfolio",
    origin: "https://devfolio.co",
    category: "competitions",
    listingUrl: "https://devfolio.co/hackathons",
    enabled: true,
    status: "enabled",
    refresh_interval_hours: 6,
    robotsReviewed: true,
    // Reviewed https://devfolio.co/terms-of-use and robots.txt on 2026-09-30.
    // No automated listing-access prohibition was identified; retain source links.
    termsReviewed: true,
  },
  {
    id: "hackalendar-competitions",
    name: "Hackalendar",
    origin: "https://hackalendar.com",
    category: "competitions",
    listingUrl: "https://hackalendar.com/api/events",
    enabled: true,
    status: "enabled",
    refresh_interval_hours: 6,
    robotsReviewed: true,
    // https://hackalendar.com/api explicitly permits the keyless JSON feed;
    // direct links to organisers' registration pages are requested.
    termsReviewed: true,
  },
  {
    id: "codeforces-competitions",
    name: "Codeforces",
    origin: "https://codeforces.com",
    category: "competitions",
    listingUrl: "https://codeforces.com/api/contest.list?gym=false",
    enabled: true,
    status: "enabled",
    refresh_interval_hours: 3,
    robotsReviewed: true,
    // https://codeforces.com/apiHelp documents anonymous contest.list.
    termsReviewed: true,
  },
  {
    id: "brabble-competitions",
    name: "Brabble.ai",
    origin: "https://brabble.ai",
    category: "competitions",
    listingUrl: "https://brabble.ai/api/listings",
    enabled: true,
    status: "disabled",
    refresh_interval_hours: 6,
    robotsReviewed: true,
    // The current /docs requires a free developer key and source attribution.
    termsReviewed: true,
    disabledReason: !process.env.BRABBLE_API_KEY ? "A Brabble developer API key is required. Add BRABBLE_API_KEY to workspace Secrets." : undefined,
  },
  {
    id: "devpost-competitions",
    name: "Devpost",
    origin: "https://devpost.com",
    category: "competitions",
    listingUrl: "https://devpost.com/hackathons",
    enabled: false,
    status: "disabled",
    refresh_interval_hours: 6,
    robotsReviewed: true,
    termsReviewed: false,
    disabledReason: "Devpost terms prohibit automated scraping and crawling of the site and related data.",
  },
  {
    id: "hackerearth-competitions",
    name: "HackerEarth",
    origin: "https://www.hackerearth.com",
    category: "competitions",
    listingUrl: "https://www.hackerearth.com/challenges/",
    enabled: false,
    status: "disabled",
    refresh_interval_hours: 6,
    robotsReviewed: false,
    termsReviewed: false,
    disabledReason: "Public challenges and robots.txt return an anti-bot HTTP 403 from this environment. Do not bypass access controls.",
  },
  {
    id: "unstop-jobs",
    name: "Unstop",
    origin: "https://unstop.com",
    category: "jobs",
    listingUrl: "https://unstop.com/jobs?searchTerm=python%20developer",
    enabled: false,
    status: "disabled",
    refresh_interval_hours: 6,
    robotsReviewed: true,
    termsReviewed: false,
    disabledReason: "Public paths are listed in robots.txt and opportunity sitemap, but terms do not establish permission for automated listing extraction; a detail-page probe returned a generic shell without listing evidence.",
  },
  {
    id: "unstop-internships",
    name: "Unstop",
    origin: "https://unstop.com",
    category: "internships",
    listingUrl: "https://unstop.com/opportunities?search=software%20internship",
    enabled: false,
    status: "disabled",
    refresh_interval_hours: 12,
    robotsReviewed: true,
    termsReviewed: false,
    disabledReason: "Public paths are listed in robots.txt and opportunity sitemap, but terms do not establish permission for automated listing extraction; a detail-page probe returned a generic shell without listing evidence.",
  },
  {
    id: "himalayas-jobs",
    name: "Himalayas",
    origin: "https://himalayas.app",
    category: "jobs",
    listingUrl: "https://himalayas.app/jobs/api/search?q=junior&country=IN&sort=recent&page=1",
    enabled: true,
    status: "enabled",
    refresh_interval_hours: 12,
    robotsReviewed: true,
    termsReviewed: true,
  },
  {
    id: "himalayas-internships",
    name: "Himalayas",
    origin: "https://himalayas.app",
    category: "internships",
    listingUrl: "https://himalayas.app/jobs/api/search?q=internship&country=IN&sort=recent&page=1",
    enabled: true,
    status: "enabled",
    refresh_interval_hours: 12,
    robotsReviewed: true,
    termsReviewed: true,
  },
];

export const lancingSourceMetadata: readonly LancingSourceMetadata[] = SOURCES;

const RECORDS_COLLECTION = "lancing_external_opportunities";
const METADATA_COLLECTION = "lancing_external_source_metadata";
export interface CompetitionRefreshReport {
  sourcesSucceeded: number;
  sourcesFailed: number;
  failures: Array<{ id: string; error: string }>;
  newCompetitions: number;
  updatedCompetitions: number;
  expiredCompetitions: number;
  duplicatesRemoved: number;
}

function firestore(): any | null {
  try {
    return getFirebaseAdmin()?.firestore() ?? null;
  } catch {
    return null;
  }
}

function canonicalUrl(input: unknown, origin: string): string | null {
  if (typeof input !== "string") return null;
  try {
    const url = new URL(input, origin);
    if (url.protocol !== "https:" || url.origin !== origin || url.username || url.password) return null;
    url.hash = "";
    for (const key of Array.from(url.searchParams.keys())) {
      if (/^(utm_|fbclid|gclid)/i.test(key)) url.searchParams.delete(key);
    }
    url.searchParams.sort();
    return url.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

function parseDeadline(value: unknown): Date | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})?)?$/.test(value.trim())) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

function plainText(value: unknown): string {
  return typeof value === "string" ? value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim() : "";
}

function decodeHtml(value: string): string {
  return value.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ");
}

function jsonLdRecords(html: string): any[] {
  const results: any[] = [];
  const blocks = html.match(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi) || [];
  for (const block of blocks) {
    const content = block.slice(block.indexOf(">") + 1).replace(/<\/script>\s*$/i, "");
    try {
      const parsed = JSON.parse(decodeHtml(content));
      const collect = (value: any) => {
        if (!value || typeof value !== "object") return;
        if (Array.isArray(value)) return value.forEach(collect);
        results.push(value);
        if (Array.isArray(value["@graph"])) value["@graph"].forEach(collect);
        if (Array.isArray(value.itemListElement)) value.itemListElement.forEach((item: any) => collect(item?.item || item));
      };
      collect(parsed);
    } catch {
      // Malformed structured data is deliberately ignored.
    }
  }
  return results;
}

function parseDetailPage(html: string, url: string): any | null {
  if (!html || html.length > MAX_RESPONSE_BYTES) return null;
  const finalUrl = canonicalUrl(url, "https://unstop.com");
  if (!finalUrl) return null;
  const nodes = jsonLdRecords(html);
  const listing = nodes.find((node) => {
    const types = Array.isArray(node["@type"]) ? node["@type"] : [node["@type"]];
    return types.some((type: unknown) => ["JobPosting", "Event", "EducationEvent"].includes(String(type)));
  });
  if (!listing) return null;
  const organization = listing.hiringOrganization || listing.organizer || {};
  const title = plainText(listing.title || listing.name);
  const company = plainText(organization.name);
  const deadline = listing.validThrough || listing.endDate || listing.expires;
  if (!title || !company || !parseDeadline(deadline)) return null;
  const skillsValue = listing.skills || listing.qualifications || [];
  const skills = (Array.isArray(skillsValue) ? skillsValue : String(skillsValue).split(/[,;]/))
    .map(plainText).filter(Boolean).slice(0, 30);
  const salary = listing.baseSalary?.value;
  const stipend = typeof salary === "number" || typeof salary === "string"
    ? String(salary) : plainText(listing.baseSalary?.currency || listing.salary || "Not specified");
  const location = listing.jobLocation?.address || listing.location;
  return {
    title, company, url: finalUrl, deadline,
    skills, stipend,
    work_mode: listing.jobLocationType === "TELECOMMUTE" ? "Remote" : plainText(location?.addressLocality || location) || "Not specified",
    description: plainText(listing.description).slice(0, 5_000),
  };
}

function normalizeVerifiedCandidate(
  candidate: any,
  source: LancingSourceMetadata,
  rawContent: string,
  now: Date,
): Opportunity | null {
  if (!candidate || typeof candidate !== "object") return null;
  const title = plainText(candidate.title);
  const company = plainText(candidate.company);
  const url = canonicalUrl(candidate.url, source.origin);
  const deadline = parseDeadline(candidate.deadline);
  if (!title || !company || !url || !deadline || deadline.getTime() <= now.getTime()) return null;
  if (!Array.isArray(candidate.skills) || !rawContent) return null;
  return {
    ...candidate,
    title,
    company,
    source: source.name,
    source_url: url,
    source_listing_url: source.listingUrl,
    url,
    skills: candidate.skills.map(plainText).filter(Boolean).slice(0, 30),
    stipend: plainText(candidate.stipend) || "Not specified",
    work_mode: plainText(candidate.work_mode) || "Not specified",
    category: source.category,
    deadline: deadline.toISOString(),
    verification_status: "VERIFIED_EXTERNAL",
    source_id: source.id,
    scraped_at: now.toISOString(),
    last_verified_at: now.toISOString(),
    parser_version: PARSER_VERSION,
    raw_content_hash: createHash("sha256").update(rawContent).digest("hex"),
  };
}

function normalizeDevfolioCandidate(candidate: any, now: Date): Opportunity | null {
  const title = plainText(candidate?.title).slice(0, 200);
  const company = plainText(candidate?.organizer ?? candidate?.company).slice(0, 160);
  const deadline = parseDeadline(candidate?.registrationDeadline ?? candidate?.deadline);
  let url: URL;
  try {
    url = new URL(candidate?.url ?? candidate?.sourceUrl);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || url.username || url.password ||
    !(url.hostname === "devfolio.co" || /^[a-z0-9-]+\.devfolio\.co$/.test(url.hostname)) ||
    !title || !deadline || deadline.getTime() <= now.getTime()) return null;
  url.hash = "";
  const sourceUrl = url.toString().replace(/\/$/, "");
  let applicationUrl = sourceUrl;
  try {
    const apply = new URL(candidate?.applicationUrl);
    if (apply.protocol === "https:" && !apply.username && !apply.password) applicationUrl = apply.toString();
  } catch { /* Use the verified source detail URL. */ }
  const description = plainText(candidate?.description).slice(0, 3000);
  const sourceCompetitionId = typeof candidate?.id === "string" ? candidate.id.slice(0, 120) : null;
  const fields = {
    title, company, type: "hackathon", deadline: deadline.toISOString(), description, sourceUrl, applicationUrl,
    registrationStart: candidate?.registrationStart || null,
    eventStart: candidate?.startsAt || null, eventEnd: candidate?.endsAt || null,
    participationMode: candidate?.participationMode || null, imageUrl: candidate?.imageUrl || null,
    location: plainText(candidate?.location), eligibility: plainText(candidate?.eligibility),
    teamSizeMin: candidate?.teamMin ?? null, teamSizeMax: candidate?.teamMax ?? null,
  };
  return {
    id: `devfolio:${createHash("sha256").update(sourceUrl).digest("hex").slice(0, 24)}`,
    title, company, organizer: company || null, description,
    deadline: deadline.toISOString(),
    source: "Devfolio", source_id: "devfolio-competitions", category: "competitions", type: "hackathon",
    source_url: applicationUrl, source_listing_url: "https://devfolio.co/hackathons",
    url: sourceUrl, applicationUrl,
    sourceCompetitionId, source_references: ["devfolio-competitions"],
    skills: Array.isArray(candidate?.skills) ? candidate.skills.map(plainText).filter(Boolean).slice(0, 20) : [],
    themes: Array.isArray(candidate?.themes) ? candidate.themes.map(plainText).filter(Boolean).slice(0, 20) : null,
    subcategory: "hackathon", eligibleDegrees: null, eligibleYears: null,
    registrationStart: candidate?.registrationStart || null,
    sourcePublishedAt: null, fee: null, participants: null, stages: null, tags: null,
    imageUrl: candidate?.imageUrl || null,
    eligibility: plainText(candidate?.eligibility).slice(0, 300) || null,
    prize: plainText(candidate?.prize).slice(0, 100) || null,
    stipend: plainText(candidate?.prize).slice(0, 100) || "Not specified",
    work_mode: plainText(candidate?.participationMode ?? candidate?.mode).slice(0, 60) || "Not specified",
    location: plainText(candidate?.location).slice(0, 100) || null,
    eventStart: candidate?.startsAt || null,
    eventEnd: candidate?.endsAt || null,
    teamSizeMin: Number.isInteger(candidate?.teamMin) ? candidate.teamMin : null,
    teamSizeMax: Number.isInteger(candidate?.teamMax) ? candidate.teamMax : null,
    registrationDeadline: deadline.toISOString(),
    expiresAt: deadline.toISOString(), status: "ACTIVE", verification_status: "VERIFIED_EXTERNAL",
    scraped_at: now.toISOString(), last_verified_at: now.toISOString(),
    parser_version: "devfolio-next-1",
    raw_content_hash: createHash("sha256").update(JSON.stringify(fields)).digest("hex"),
  };
}

function normalizePublicApiCompetition(candidate: any, source: LancingSourceMetadata, now: Date): Opportunity | null {
  const title = plainText(candidate?.title).slice(0, 200);
  const detailUrl = canonicalUrl(source.id === "brabble-competitions" ? candidate?.shareUrl : candidate?.url, source.origin);
  const deadlineKind = candidate?.deadlineKind;
  const deadline = parseDeadline(candidate?.deadline);
  if (!title || !detailUrl || !deadline || deadline.getTime() <= now.getTime() ||
    !["REGISTRATION", "START_TIME"].includes(deadlineKind)) return null;
  if (deadlineKind === "REGISTRATION" &&
    parseDeadline(candidate?.registrationDeadline)?.getTime() !== deadline.getTime()) return null;
  if (deadlineKind === "START_TIME" &&
    parseDeadline(candidate?.startsAt)?.getTime() !== deadline.getTime()) return null;
  let applicationUrl: string;
  try {
    const link = new URL(candidate?.applicationUrl);
    if (link.protocol !== "https:" || link.username || link.password ||
      /^(localhost|127(?:\.\d+){3}|0\.0\.0\.0)$/i.test(link.hostname)) return null;
    link.hash = "";
    applicationUrl = link.toString();
  } catch { return null; }
  const organizer = plainText(candidate?.organizer).slice(0, 160) || null;
  const description = plainText(candidate?.description).slice(0, 3000);
  const type = source.id === "codeforces-competitions" ? "coding-contest"
    : source.id === "brabble-competitions" ? (plainText(candidate?.type).toLowerCase().replace(/\s+/g, "-") || "competition")
    : "hackathon";
  const eventStart = parseDeadline(candidate?.startsAt)?.toISOString() || null;
  const eventEnd = parseDeadline(candidate?.endsAt)?.toISOString() || null;
  if (eventEnd && Date.parse(eventEnd) <= now.getTime()) return null;
  const sourceCompetitionId = typeof candidate?.id === "string" ? candidate.id.slice(0, 120) : String(candidate?.id ?? "").slice(0, 120);
  if (!sourceCompetitionId) return null;
  const themes = Array.isArray(candidate?.themes) ? candidate.themes.map(plainText).filter(Boolean).slice(0, 20) : null;
  const eligibility = Array.isArray(candidate?.eligibility)
    ? candidate.eligibility.map(plainText).filter(Boolean).join("; ").slice(0, 300)
    : plainText(candidate?.eligibility).slice(0, 300);
  const prize = plainText(candidate?.prize).slice(0, 100) || null;
  const fee = plainText(candidate?.fee).slice(0, 100) || null;
  const fields = {
    title, organizer, description, detailUrl, applicationUrl, deadline: deadline.toISOString(),
    deadlineKind, eventStart, eventEnd, themes, type, eligibility, prize, fee,
  };
  return {
    id: `${source.id}:${createHash("sha256").update(detailUrl).digest("hex").slice(0, 24)}`,
    title, company: organizer || "", organizer, description, type, subcategory: type,
    source: source.name, source_id: source.id, category: "competitions",
    source_url: applicationUrl, source_listing_url: source.listingUrl,
    url: detailUrl, applicationUrl, sourceCompetitionId, source_references: [source.id],
    deadline: deadline.toISOString(), deadlineKind,
    registrationDeadline: deadlineKind === "REGISTRATION" ? deadline.toISOString() : null,
    expiresAt: deadline.toISOString(), status: "ACTIVE",
    skills: type === "contest" ? ["Competitive programming"] : [],
    themes, eligibility: eligibility || null, eligibleDegrees: null, eligibleYears: null,
    stipend: prize || "Not specified", work_mode: plainText(candidate?.participationMode).slice(0, 60) || "Not specified",
    location: plainText(candidate?.location).slice(0, 100) || null,
    eventStart, eventEnd, sourcePublishedAt: null, fee, prize,
    participants: null, stages: null, tags: null, imageUrl: null,
    verification_status: "VERIFIED_EXTERNAL", scraped_at: now.toISOString(), last_verified_at: now.toISOString(),
    parser_version: `${source.id}-api-1`,
    raw_content_hash: createHash("sha256").update(JSON.stringify(fields)).digest("hex"),
  };
}

function deduplicate(records: Opportunity[]): Opportunity[] {
  const unique = new Map<string, Opportunity>();
  for (const record of records) {
    const key = record.category === "competitions" && record.company
      ? `${record.title.toLowerCase().replace(/\W/g, "")}:${record.company.toLowerCase().replace(/\W/g, "")}:${record.deadline}`
      : record.url;
    if (!unique.has(key)) unique.set(key, record);
  }
  return Array.from(unique.values());
}

async function fetchBounded(source: LancingSourceMetadata, url: string): Promise<string> {
  const safeUrl = canonicalUrl(url, source.origin);
  if (!safeUrl) throw new Error("Source URL is outside the registered HTTPS origin");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(safeUrl, {
      method: "GET",
      redirect: "manual",
      signal: controller.signal,
      headers: { "user-agent": "StudentLancingSourceRefresh/1.0 (public listing verification)", accept: "text/html,application/xml,text/plain;q=0.9" },
    });
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      const redirectUrl = location ? canonicalUrl(new URL(location, safeUrl).toString(), source.origin) : null;
      if (!redirectUrl) throw new Error("Cross-origin or invalid redirect refused");
      throw new Error("Redirect refused; source URL must be reviewed before following redirects");
    }
    if (!response.ok) throw new Error(`Source returned HTTP ${response.status}`);
    const type = response.headers.get("content-type") || "";
    if (!/text\/html|application\/(xml|xhtml\+xml)|text\/plain/i.test(type)) throw new Error("Unexpected source content type");
    const reader = response.body?.getReader();
    if (!reader) throw new Error("Source response has no readable body");
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_RESPONSE_BYTES) {
        await reader.cancel();
        throw new Error("Source response exceeds the body size limit");
      }
      chunks.push(value);
    }
    return new TextDecoder().decode(Buffer.concat(chunks));
  } finally {
    clearTimeout(timer);
  }
}

async function refreshSource(
  source: LancingSourceMetadata,
  dependencies: {
    fetchPage?: (source: LancingSourceMetadata, url: string) => Promise<string>;
    now?: () => Date;
    delay?: (ms: number) => Promise<void>;
    lastAttemptedAt?: string | null;
  } = {},
): Promise<Opportunity[]> {
  const now = dependencies.now?.() || new Date();
  if (!isSourceRefreshDue(source, dependencies.lastAttemptedAt, now)) return [];
  if (!source.enabled || !source.robotsReviewed || !source.termsReviewed) return [];
  const fetchPage = dependencies.fetchPage || fetchBounded;
  const delay = dependencies.delay || ((ms: number) => new Promise((resolve) => setTimeout(resolve, ms)));
  const robots = await fetchPage(source, `${source.origin}/robots.txt`);
  if (!robotsAllows(robots, source.listingUrl, source.origin)) throw new Error("robots.txt disallows the listing path");
  await delay(SOURCE_DELAY_MS);
  const listingHtml = await fetchPage(source, source.listingUrl);
  const detailUrls = extractDetailUrls(listingHtml, source);
  const records: Opportunity[] = [];
  for (const detailUrl of detailUrls) {
    await delay(SOURCE_DELAY_MS);
    if (!robotsAllows(robots, detailUrl, source.origin)) {
      throw new Error("robots.txt disallows a detail path");
    }
    const raw = await fetchPage(source, detailUrl);
    const candidate = parseDetailPage(raw, detailUrl);
    const record = normalizeVerifiedCandidate(candidate, source, raw, now);
    if (record) records.push(record);
  }
  return deduplicate(records);
}

function isSourceRefreshDue(source: LancingSourceMetadata, lastAttemptedAt: unknown, now: Date, previousFailure = false): boolean {
  if (typeof lastAttemptedAt !== "string" || !lastAttemptedAt) return true;
  const attemptedAt = new Date(lastAttemptedAt).getTime();
  if (!Number.isFinite(attemptedAt)) return true;
  // A failed provider check must not suppress retries for an entire day.
  const intervalMs = previousFailure
    ? Math.min(source.refresh_interval_hours * 60 * 60 * 1000, 5 * 60 * 1000)
    : source.refresh_interval_hours * 60 * 60 * 1000;
  const elapsedMs = now.getTime() - attemptedAt;
  return elapsedMs < 0 || elapsedMs >= intervalMs;
}

function robotsAllows(robots: string, url: string, origin: string): boolean {
  const target = new URL(url, origin).pathname;
  let active = false;
  const rules: Array<{ allow: boolean; pattern: string }> = [];
  for (const line of robots.split(/\r?\n/)) {
    const match = line.match(/^\s*(user-agent|allow|disallow)\s*:\s*(.*?)\s*$/i);
    if (!match) continue;
    const [, field, value] = match;
    if (field.toLowerCase() === "user-agent") {
      active = value === "*" || /studentlancing/i.test(value);
      continue;
    }
    if (!active || !value) continue;
    rules.push({ allow: field.toLowerCase() === "allow", pattern: value });
  }
  const matching = rules.filter(({ pattern }) => {
    const anchored = pattern.endsWith("$");
    const clean = anchored ? pattern.slice(0, -1) : pattern;
    const escaped = clean.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
    return new RegExp(`^${escaped}${anchored ? "$" : ""}`).test(target);
  }).sort((a, b) => b.pattern.replace(/[*$]/g, "").length - a.pattern.replace(/[*$]/g, "").length);
  return matching.length === 0 || matching[0].allow;
}

function extractDetailUrls(html: string, source: LancingSourceMetadata): string[] {
  const matches = Array.from(html.matchAll(/href=["']([^"'#]+)["']/gi)).map((match) => decodeHtml(match[1]));
  const categoryPath = source.category === "jobs" ? "/jobs/" : source.category === "internships" ? "/internships/" : "/competitions/";
  return Array.from(new Set(matches.map((href) => canonicalUrl(href, source.origin))
    .filter((url): url is string => !!url && new URL(url).pathname.startsWith(categoryPath)))).slice(0, 30);
}

function cacheIsFresh(record: any, now: Date): boolean {
  const verified = new Date(record?.last_verified_at).getTime();
  const deadline = parseDeadline(record?.deadline);
  // Allow the 12-hour fetch interval plus one three-hour scheduler tick.
  const ttl = record?.source_id === "himalayas-jobs" || record?.source_id === "himalayas-internships"
    ? HIMALAYAS_VERIFICATION_TTL_MS : CACHE_TTL_MS;
  return record?.verification_status === "VERIFIED_EXTERNAL"
    && Number.isFinite(verified) && now.getTime() - verified >= 0 && now.getTime() - verified <= ttl
    && !!deadline && deadline.getTime() > now.getTime()
    && (!record?.eventEnd || (parseDeadline(record.eventEnd)?.getTime() ?? 0) > now.getTime())
    && (record?.category === "competitions" || isRecentPosting(record?.posted_at, now));
}

function sourceCanPublish(sourceId: unknown, category?: unknown): boolean {
  if (typeof sourceId !== "string") return false;
  const source = SOURCES.find((entry) => entry.id === sourceId);
  return !!source && source.enabled && approved(source)
    && (category === undefined || category === source.category);
}

function approved(source: LancingSourceMetadata): boolean {
  return source.robotsReviewed && source.termsReviewed &&
    (source.id !== "brabble-competitions" || Boolean(process.env.BRABBLE_API_KEY));
}

async function persistSourceSnapshot(
  db: any, metadataRef: any, metadata: Record<string, unknown>, records: Opportunity[],
  previousRecords: Map<string, any> = new Map(),
): Promise<void> {
  // Firestore batches commit the records and success marker together. A failed
  // commit must never leave "refreshed" metadata over a partial result set.
  const batch = db.batch();
  const currentUrls = new Set(records.map((record) => record.url));
  for (const record of records) {
    const ref = db.collection(RECORDS_COLLECTION).doc(createHash("sha256").update(record.url).digest("hex"));
    const old = previousRecords.get(record.url);
    if (old?.raw_content_hash === record.raw_content_hash && typeof batch.update === "function") {
      batch.update(ref, {
        scraped_at: record.scraped_at,
        last_verified_at: record.last_verified_at,
        verification_status: "VERIFIED_EXTERNAL",
      });
    } else batch.set(ref, record, { merge: true });
  }
  if (metadata.category === "competitions" && !metadata.last_error) {
    const now = new Date(String(metadata.last_attempted_at));
    for (const [url, old] of Array.from(previousRecords.entries())) {
      if (currentUrls.has(url) || old?.verification_status !== "VERIFIED_EXTERNAL") continue;
      const ref = db.collection(RECORDS_COLLECTION).doc(createHash("sha256").update(url).digest("hex"));
      const expired = (parseDeadline(old.deadline)?.getTime() ?? 0) <= now.getTime();
      const retired = { verification_status: expired ? "EXPIRED" : "STALE", last_checked_at: now.toISOString() };
      if (typeof batch.update === "function") batch.update(ref, retired);
      else batch.set(ref, retired, { merge: true });
    }
  }
  batch.set(metadataRef, metadata, { merge: true });
  await batch.commit();
}

let refreshPromise: Promise<CompetitionRefreshReport> | null = null;
let retryTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleFailedSourceRetry(): void {
  if (retryTimer) return;
  retryTimer = setTimeout(() => {
    retryTimer = null;
    void refreshLancingSources().catch(() => {
      console.error(JSON.stringify({ event: "LANCING_SOURCE_RETRY_FAILED" }));
    });
  }, 5 * 60 * 1000);
  retryTimer.unref?.();
}

export async function refreshLancingSources(options: { category?: LancingCategory; force?: boolean } = {}): Promise<CompetitionRefreshReport> {
  if (refreshPromise) {
    if (!options.force) return refreshPromise;
    await refreshPromise;
  }
  if (!refreshPromise) refreshPromise = performSourceRefresh(options).finally(() => { refreshPromise = null; });
  return refreshPromise;
}

async function performSourceRefresh(options: { category?: LancingCategory; force?: boolean } = {}): Promise<CompetitionRefreshReport> {
  const report: CompetitionRefreshReport = {
    sourcesSucceeded: 0, sourcesFailed: 0, failures: [], newCompetitions: 0,
    updatedCompetitions: 0, expiredCompetitions: 0, duplicatesRemoved: 0,
  };
  const db = firestore();
  if (!db) {
    console.warn(JSON.stringify({ event: "LANCING_SOURCE_STORAGE_UNAVAILABLE" }));
    throw new Error("Source storage unavailable");
  }
  const now = new Date();
  for (const source of SOURCES) {
    if (options.category && source.category !== options.category) continue;
    let records: Opportunity[] = [];
    let lastError: string | undefined;
    let previousMetadata: any = null;
    let metadataRef: any = null;
    let previousRecords = new Map<string, any>();
    if (db) {
      try {
        metadataRef = db.collection(METADATA_COLLECTION).doc(source.id);
        const previousSnapshot = await metadataRef.get();
        previousMetadata = previousSnapshot.exists ? previousSnapshot.data() : null;
      } catch (error) {
        lastError = error instanceof Error ? error.message : "Unable to read source refresh metadata";
      }
    }
    const enabled = approved(source) && (typeof previousMetadata?.enabled === "boolean" ? previousMetadata.enabled : source.enabled);
    const currentSource = { ...source, enabled, status: enabled ? "enabled" as const : "disabled" as const };
    const due = options.force || isSourceRefreshDue(currentSource, previousMetadata?.last_attempted_at, now, Boolean(previousMetadata?.last_error) && enabled);
    if (due) {
      try {
        if (enabled) console.info(JSON.stringify({ event: "SOURCE_FETCH_STARTED", sourceId: source.id }));
        records = !enabled ? []
          : source.id === "himalayas-jobs" || source.id === "himalayas-internships"
          ? await fetchHimalayasCategory(source.category as "jobs" | "internships")
          : ["devfolio-competitions", "hackalendar-competitions", "codeforces-competitions", "brabble-competitions"].includes(source.id)
            ? []
          : await refreshSource(currentSource, { lastAttemptedAt: options.force ? null : previousMetadata?.last_attempted_at });
        if (enabled && source.id === "devfolio-competitions") {
          // Devfolio detail pages live on source-controlled subdomains; its adapter
          // checks each host's robots rules before fetching it.
          const parsed = (await collectDevfolioCompetitions())
            .map((candidate) => normalizeDevfolioCandidate(candidate, now))
            .filter((record): record is Opportunity => record !== null);
          records = deduplicate(parsed);
          report.duplicatesRemoved += parsed.length - records.length;
        }
        if (enabled && ["hackalendar-competitions", "codeforces-competitions", "brabble-competitions"].includes(source.id)) {
          const candidates = source.id === "hackalendar-competitions"
            ? await collectHackalendarCompetitions()
            : source.id === "codeforces-competitions" ? await collectCodeforcesCompetitions()
            : await collectBrabbleCompetitions({ apiKey: process.env.BRABBLE_API_KEY });
          const parsed = candidates.map((candidate) => normalizePublicApiCompetition(candidate, source, now))
            .filter((record): record is Opportunity => record !== null);
          records = deduplicate(parsed);
          report.duplicatesRemoved += parsed.length - records.length;
        }
        if (enabled && source.category === "competitions" &&
          Number(previousMetadata?.record_count) >= 8 &&
          records.length < Number(previousMetadata.record_count) / 4) {
          throw new Error("PARSER_ANOMALY: competition count fell abnormally; retaining previous verified records");
        }
        if (enabled && source.id === "devfolio-competitions" && records.length === 0) {
          throw new Error("PARSER_ANOMALY: no current, validated competition details; retaining previous data");
        }
        if (enabled) console.info(JSON.stringify({ event: "SOURCE_FETCH_SUCCESS", sourceId: source.id, recordCount: records.length }));
      } catch (error) {
        lastError = error instanceof Error ? error.message : "Source refresh failed";
        console.warn(JSON.stringify({ event: lastError.includes("PARSER_ANOMALY") ? "SOURCE_PARSER_ANOMALY" : "SOURCE_FETCH_FAILED", sourceId: source.id, error: lastError }));
      }
    }
    if (!due) continue;
    if (lastError && enabled) scheduleFailedSourceRetry();
    const before = {
      created: report.newCompetitions,
      updated: report.updatedCompetitions,
      expired: report.expiredCompetitions,
      duplicates: report.duplicatesRemoved,
    };
    try {
      if (source.category === "competitions" && enabled && !lastError) {
        const old = await db.collection(RECORDS_COLLECTION).where("source_id", "==", source.id).get();
        const existing = new Map<string, any>(old.docs.map((doc: any): [string, any] => [String(doc.data()?.url), doc.data()]));
        previousRecords = existing;
        report.newCompetitions += records.filter((record) => !existing.has(record.url)).length;
        report.updatedCompetitions += records.filter((record) => {
          const previous: any = existing.get(record.url);
          return previous && previous.raw_content_hash !== record.raw_content_hash;
        }).length;
        report.expiredCompetitions += old.docs.filter((doc: any) => {
          const previous = doc.data();
          return previous.verification_status !== "EXPIRED" &&
            (parseDeadline(previous.deadline)?.getTime() ?? 0) <= now.getTime();
        }).length;
      }
      await persistSourceSnapshot(db, metadataRef, {
        ...source,
        enabled, status: enabled ? (lastError ? "error" : "refreshed") : "disabled",
        last_attempted_at: now.toISOString(),
        last_successful_at: lastError ? previousMetadata?.last_successful_at || null : now.toISOString(),
        last_failed_at: lastError ? now.toISOString() : previousMetadata?.last_failed_at || null,
        next_refresh_at: new Date(now.getTime() + (lastError && source.enabled ? 5 * 60 * 1000 : source.refresh_interval_hours * 60 * 60 * 1000)).toISOString(),
        record_count: lastError ? previousMetadata?.record_count ?? 0 : records.length,
        last_error: lastError || source.disabledReason || null,
      }, records, previousRecords);
      if (enabled) {
        if (lastError) {
          report.sourcesFailed += 1;
          report.failures.push({ id: source.id, error: lastError });
        } else report.sourcesSucceeded += 1;
        console.info(JSON.stringify({
          event: "LANCING_SOURCE_REFRESH", sourceId: source.id,
          success: !lastError, recordCount: records.length,
        }));
        if (!lastError && source.category === "competitions") {
          console.info(JSON.stringify({ event: "SOURCE_PARSE_SUCCESS", sourceId: source.id, recordCount: records.length }));
          for (const [event, count] of [
            ["COMPETITION_CREATED", report.newCompetitions - before.created],
            ["COMPETITION_UPDATED", report.updatedCompetitions - before.updated],
            ["COMPETITION_EXPIRED", report.expiredCompetitions - before.expired],
            ["COMPETITION_DEDUPLICATED", report.duplicatesRemoved - before.duplicates],
          ] as const) {
            if (count > 0) console.info(JSON.stringify({ event, sourceId: source.id, count }));
          }
        }
      }
    } catch (error) {
      report.newCompetitions = before.created;
      report.updatedCompetitions = before.updated;
      report.expiredCompetitions = before.expired;
      report.duplicatesRemoved = before.duplicates;
      console.error(JSON.stringify({
        event: "LANCING_SOURCE_WRITE_FAILED", sourceId: source.id,
        error: error instanceof Error ? error.message.slice(0, 250) : "Unknown storage failure",
      }));
      if (enabled) {
        report.sourcesFailed += 1;
        report.failures.push({ id: source.id, error: "Source records could not be stored" });
        scheduleFailedSourceRetry();
      }
      try {
        await metadataRef.set({
          status: "error",
          last_error: "Source records could not be stored",
          last_attempted_at: now.toISOString(),
          next_refresh_at: new Date(now.getTime() + 5 * 60 * 1000).toISOString(),
        }, { merge: true });
      } catch {
        // A database outage prevents both writes; the next startup can retry.
      }
    }
  }
  return report;
}

export async function listVerifiedLancingSources(category: LancingCategory): Promise<any[]> {
  if (!["competitions", "jobs", "internships"].includes(category)) return [];
  const db = firestore();
  if (!db) return [];
  try {
    const [snapshot, sourceSnapshots] = await Promise.all([
      db.collection(RECORDS_COLLECTION).where("category", "==", category).get(),
      db.collection(METADATA_COLLECTION).get(),
    ]);
    const settings = new Map(sourceSnapshots.docs.map((doc: any) => [doc.id, doc.data()]));
    const now = new Date();
    const valid = snapshot.docs.map((doc: any) => doc.data())
      .filter((record: any) => {
        if (!sourceCanPublish(record?.source_id, record?.category) || !cacheIsFresh(record, now)) return false;
        const config: any = settings.get(record.source_id);
        return config?.enabled !== false;
      });
    if (category !== "competitions") return valid;
    const unique = new Map<string, any>();
    const priority: Record<string, number> = {
      "devfolio-competitions": 0, "codeforces-competitions": 0,
      "hackalendar-competitions": 1, "brabble-competitions": 2,
    };
    for (const record of valid.sort((a: any, b: any) =>
      (priority[a.source_id] ?? 3) - (priority[b.source_id] ?? 3))) {
      const key = String(record.applicationUrl || record.source_url || record.url).toLowerCase().replace(/\/$/, "");
      const previous = unique.get(key);
      if (previous) previous.source_references = Array.from(new Set([...(previous.source_references || [previous.source_id]), record.source_id]));
      else unique.set(key, { ...record });
    }
    return Array.from(unique.values());
  } catch {
    return [];
  }
}

export async function setCompetitionSourceEnabled(id: string, enabled: boolean): Promise<boolean> {
  const source = SOURCES.find((item) => item.id === id && item.category === "competitions");
  if (!source || !approved(source)) return false;
  const db = firestore();
  if (!db) throw new Error("Source storage unavailable");
  await db.collection(METADATA_COLLECTION).doc(id).set({ enabled, status: enabled ? "enabled" : "disabled" }, { merge: true });
  return true;
}

export async function listCompetitionSourceHealth(): Promise<any[]> {
  const db = firestore();
  if (!db) throw new Error("Source storage unavailable");
  const [metadata, records] = await Promise.all([
    db.collection(METADATA_COLLECTION).get(),
    db.collection(RECORDS_COLLECTION).where("category", "==", "competitions").get(),
  ]);
  const config = new Map(metadata.docs.map((doc: any) => [doc.id, doc.data()]));
  const now = new Date();
  return SOURCES.filter((source) => source.category === "competitions").map((source) => {
    const data: any = config.get(source.id) || {};
    const own = records.docs.map((doc: any) => doc.data()).filter((record: any) => record.source_id === source.id);
    return {
      ...source, ...data,
      approved: approved(source),
      enabled: approved(source) && (typeof data.enabled === "boolean" ? data.enabled : source.enabled),
      parser_version: source.id === "devfolio-competitions" ? "devfolio-next-1" : "1",
      active_count: own.filter((record: any) => cacheIsFresh(record, now)).length,
      expired_count: own.filter((record: any) => {
        const deadline = parseDeadline(record.deadline);
        return deadline !== null && deadline.getTime() <= now.getTime();
      }).length,
      stale_count: own.filter((record: any) => !cacheIsFresh(record, now) && (parseDeadline(record.deadline)?.getTime() ?? 0) > now.getTime()).length,
      last_error: data.last_error || source.disabledReason || null,
    };
  });
}

export const __testing = {
  persistSourceSnapshot,
  normalizeVerifiedCandidate,
  deduplicate,
  parseDetailPage,
  refreshSource,
  robotsAllows,
  cacheIsFresh,
  extractDetailUrls,
  canonicalUrl,
  isSourceRefreshDue,
  sourceCanPublish,
  normalizeDevfolioCandidate,
  normalizePublicApiCompetition,
};