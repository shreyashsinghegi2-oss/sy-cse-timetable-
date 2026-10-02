export interface CompetitionCandidate {
  id: string;
  title: string;
  organizer?: string;
  url: string;
  applicationUrl: string;
  registrationDeadline: string;
  registrationStart?: string;
  deadline: string;
  description?: string;
  startsAt?: string;
  endsAt?: string;
  location?: string;
  isOnline?: boolean;
  participationMode?: string;
  imageUrl?: string;
  teamMin?: number;
  teamMax?: number;
}

export interface DevfolioListingLink {
  id: string;
  slug: string;
  url: string;
}

export interface CollectDevfolioOptions {
  fetch?: typeof fetch;
  now?: () => Date;
  delay?: (milliseconds: number) => Promise<void>;
}

const LISTING_URL = "https://devfolio.co/hackathons";
const MAX_RESPONSE_BYTES = 1_500_000;
const REQUEST_TIMEOUT_MS = 10_000;
const SOURCE_DELAY_MS = 1_500;
const MAX_DETAILS = 15;
const USER_AGENT = "StudentLancingCompetitionRefresh/1.0 (public listing verification)";

function allowedUrl(input: string, base?: string): URL | null {
  try {
    const url = new URL(input, base);
    const host = url.hostname.toLowerCase();
    if (url.protocol !== "https:" || url.username || url.password || url.port) return null;
    if (host !== "devfolio.co" && !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.devfolio\.co$/.test(host)) return null;
    return url;
  } catch {
    return null;
  }
}

function extractNextData(html: string): any | null {
  const match = html.match(/<script\b(?=[^>]*\bid=["']__NEXT_DATA__["'])[^>]*>([\s\S]*?)<\/script>/i);
  if (!match) return null;
  try {
    return JSON.parse(match[1]);
  } catch {
    return null;
  }
}

function findHackathons(value: any, found: any[] = [], seen = new Set<any>()): any[] {
  if (!value || typeof value !== "object" || seen.has(value)) return found;
  seen.add(value);
  if (Array.isArray(value)) {
    for (const item of value) findHackathons(item, found, seen);
    return found;
  }
  if (Array.isArray(value.open_hackathons)) found.push(...value.open_hackathons);
  for (const [key, child] of Object.entries(value)) {
    if (key !== "open_hackathons") findHackathons(child, found, seen);
  }
  return found;
}

export function extractDevfolioListingLinks(html: string): DevfolioListingLink[] {
  if (!html || Buffer.byteLength(html, "utf8") > MAX_RESPONSE_BYTES) return [];
  const nextData = extractNextData(html);
  if (!nextData) return [];
  const unique = new Map<string, DevfolioListingLink>();
  for (const hackathon of findHackathons(nextData)) {
    if (!hackathon || typeof hackathon.slug !== "string") continue;
    const slug = hackathon.slug.trim();
    if (!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(slug)) continue;
    const hostUrl = allowedUrl(`https://${slug}.devfolio.co/`);
    if (!hostUrl) continue;
    const id = typeof hackathon.uuid === "string" && hackathon.uuid.trim()
      ? hackathon.uuid.trim()
      : slug;
    if (!unique.has(hostUrl.toString())) unique.set(hostUrl.toString(), { id, slug, url: hostUrl.toString() });
  }
  return Array.from(unique.values());
}

function parseIsoDate(value: unknown): Date | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

function plainText(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.replace(/<[^>]*>/g, " ").replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'").replace(/\s+/g, " ").trim();
}

function safeExternalApplicationUrl(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password) return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function normalizeDevfolioCompetition(
  hackathon: any,
  url: string,
  now: Date = new Date(),
): CompetitionCandidate | null {
  const safeUrl = allowedUrl(url);
  if (!safeUrl || !hackathon || typeof hackathon !== "object") return null;
  const title = plainText(hackathon.name);
  const deadlineDate = parseIsoDate(hackathon.settings?.reg_ends_at);
  const eventEnd = parseIsoDate(hackathon.ends_at);
  if (!title || !deadlineDate || deadlineDate.getTime() <= now.getTime()) return null;
  if (eventEnd && eventEnd.getTime() <= now.getTime()) return null;

  const startsAtDate = parseIsoDate(hackathon.starts_at);
  const organizerValue = hackathon.organizer ?? hackathon.organization;
  const organizer = plainText(typeof organizerValue === "string" ? organizerValue : organizerValue?.name);
  const description = plainText(hackathon.desc || hackathon.description || hackathon.tagline);
  const settings = hackathon.settings || {};
  const candidate: CompetitionCandidate = {
    id: typeof hackathon.uuid === "string" && hackathon.uuid.trim()
      ? `devfolio:${hackathon.uuid.trim()}`
      : `devfolio:${safeUrl.hostname.split(".")[0]}`,
    title,
    url: safeUrl.toString(),
    applicationUrl: safeExternalApplicationUrl(settings.external_apply_url) || safeUrl.toString(),
    registrationDeadline: deadlineDate.toISOString(),
    deadline: deadlineDate.toISOString(),
  };
  if (organizer) candidate.organizer = organizer;
  const registrationStart = parseIsoDate(settings.reg_starts_at);
  if (registrationStart) candidate.registrationStart = registrationStart.toISOString();
  if (description) candidate.description = description.slice(0, 5_000);
  if (startsAtDate) candidate.startsAt = startsAtDate.toISOString();
  if (eventEnd) candidate.endsAt = eventEnd.toISOString();
  if (typeof hackathon.location === "string" && hackathon.location.trim()) {
    candidate.location = plainText(hackathon.location);
  } else if (typeof hackathon.city === "string" && hackathon.city.trim()) {
    candidate.location = [hackathon.city, hackathon.country].filter((part) => typeof part === "string" && part.trim()).join(", ");
  }
  if (typeof hackathon.is_online === "boolean") candidate.isOnline = hackathon.is_online;
  if (typeof hackathon.cover_img === "string") {
    try {
      const image = new URL(hackathon.cover_img);
      if (image.protocol === "https:" && image.hostname === "assets.devfolio.co" && !image.username && !image.password) {
        candidate.imageUrl = image.toString();
      }
    } catch { /* Ignore malformed source images. */ }
  }
  if (settings.is_hybrid === true) candidate.participationMode = "Hybrid";
  else if (hackathon.is_online === true) candidate.participationMode = "Online";
  else if (hackathon.is_online === false && candidate.location) candidate.participationMode = "On-site";
  if (Number.isInteger(hackathon.team_min)) candidate.teamMin = hackathon.team_min;
  if (Number.isInteger(hackathon.team_max)) candidate.teamMax = hackathon.team_max;
  return candidate;
}

export function parseDevfolioDetailPage(
  html: string,
  url: string,
  now: Date = new Date(),
): CompetitionCandidate | null {
  if (!html || Buffer.byteLength(html, "utf8") > MAX_RESPONSE_BYTES || !allowedUrl(url)) return null;
  const nextData = extractNextData(html);
  const hackathon = nextData?.props?.pageProps?.hackathon;
  if (!hackathon || typeof hackathon !== "object") return null;
  return normalizeDevfolioCompetition(hackathon, url, now);
}

function robotsAllows(robots: string, url: URL): boolean {
  let agents: string[] = [];
  let rules: Array<{ agent: string; allow: boolean; path: string }> = [];
  const groups: Array<{ agents: string[]; rules: typeof rules }> = [];
  for (const line of robots.split(/\r?\n/)) {
    const clean = line.split("#", 1)[0].trim();
    const match = clean.match(/^(user-agent|allow|disallow)\s*:\s*(.*?)\s*$/i);
    if (!match) continue;
    const field = match[1].toLowerCase();
    const value = match[2];
    if (field === "user-agent") {
      if (rules.length) {
        groups.push({ agents, rules });
        rules = [];
        agents = [];
      }
      agents.push(value.toLowerCase());
    } else if (value) {
      for (const agent of agents) rules.push({ agent, allow: field === "allow", path: value });
    }
  }
  if (rules.length) groups.push({ agents, rules });
  const crawlerName = USER_AGENT.split("/", 1)[0].toLowerCase();
  const specific = groups.filter((group) =>
    group.agents.some((agent) => agent !== "*" && crawlerName.startsWith(agent)));
  const applicable = (specific.length ? specific : groups.filter((group) => group.agents.includes("*")))
    .flatMap((group) => group.rules);
  const target = `${url.pathname}${url.search}`;
  const matching = applicable.filter((rule) => {
    const anchored = rule.path.endsWith("$");
    const pattern = (anchored ? rule.path.slice(0, -1) : rule.path)
      .replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
    return new RegExp(`^${pattern}${anchored ? "$" : ""}`).test(target);
  }).sort((a, b) => b.path.replace(/[*$]/g, "").length - a.path.replace(/[*$]/g, "").length);
  return matching.length === 0 || matching[0].allow;
}

async function readBoundedResponse(response: Response, maxBytes = MAX_RESPONSE_BYTES): Promise<string> {
  if (response.status >= 300 && response.status < 400 || response.redirected) {
    throw new Error("Devfolio redirects are refused");
  }
  if (!response.ok) throw new Error(`Devfolio returned HTTP ${response.status}`);
  const reader = response.body?.getReader();
  if (!reader) throw new Error("Devfolio response has no readable body");
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) {
      await reader.cancel();
      throw new Error("Devfolio response exceeds the body size limit");
    }
    chunks.push(value);
  }
  return new TextDecoder().decode(Buffer.concat(chunks));
}

async function requestText(fetcher: typeof fetch, url: string, accept: string): Promise<string> {
  const safeUrl = allowedUrl(url);
  if (!safeUrl) throw new Error("Devfolio URL is outside the allowed HTTPS domains");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetcher(safeUrl.toString(), {
      method: "GET",
      redirect: "manual",
      signal: controller.signal,
      headers: { "user-agent": USER_AGENT, accept },
    });
    const contentType = response.headers.get("content-type") || "";
    if (!/text\/html|text\/plain|application\/xhtml\+xml/i.test(contentType)) {
      throw new Error("Unexpected Devfolio content type");
    }
    return await readBoundedResponse(response);
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchDevfolioDetailPage(
  url: string,
  options: { fetch?: typeof fetch } = {},
): Promise<string> {
  return requestText(options.fetch || globalThis.fetch, url, "text/html");
}

export async function collectDevfolioCompetitions(
  options: CollectDevfolioOptions = {},
): Promise<CompetitionCandidate[]> {
  const fetcher = options.fetch || globalThis.fetch;
  const delay = options.delay || ((milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds)));
  const now = options.now?.() || new Date();
  const robotsByHost = new Map<string, string>();
  let requestCount = 0;
  const fetchText = async (url: string, accept: string): Promise<string> => {
    if (requestCount > 0) await delay(SOURCE_DELAY_MS);
    requestCount += 1;
    return requestText(fetcher, url, accept);
  };
  const getRobots = async (url: URL): Promise<string> => {
    const host = url.hostname.toLowerCase();
    const cached = robotsByHost.get(host);
    if (cached !== undefined) return cached;
    const text = await fetchText(`https://${host}/robots.txt`, "text/plain");
    robotsByHost.set(host, text);
    return text;
  };

  const listing = new URL(LISTING_URL);
  const listingRobots = await getRobots(listing);
  if (!robotsAllows(listingRobots, listing)) throw new Error("Devfolio robots.txt disallows the listing path");
  const listingHtml = await fetchText(LISTING_URL, "text/html");
  const candidates = extractDevfolioListingLinks(listingHtml).slice(0, MAX_DETAILS);
  if (candidates.length === 0) throw new Error("Devfolio listing returned zero competition candidates");

  const records: CompetitionCandidate[] = [];
  for (const link of candidates) {
    const detailUrl = allowedUrl(link.url);
    if (!detailUrl) continue;
    const robots = await getRobots(detailUrl);
    if (!robotsAllows(robots, detailUrl)) throw new Error("Devfolio robots.txt disallows a detail path");
    try {
      const detailHtml = await fetchText(detailUrl.toString(), "text/html");
      const record = parseDevfolioDetailPage(detailHtml, detailUrl.toString(), now);
      if (record) records.push(record);
    } catch (error) {
      // A single unavailable public detail should not hide other valid events.
      if (error instanceof Error && /robots\.txt|outside the allowed HTTPS domains/.test(error.message)) throw error;
    }
  }
  const unique = Array.from(new Map(records.map((record) => [record.url, record])).values());
  if (unique.length === 0) throw new Error("Devfolio returned zero valid, current competitions");
  return unique;
}

export const __testing = {
  allowedUrl,
  extractNextData,
  findHackathons,
  robotsAllows,
  MAX_DETAILS,
  MAX_RESPONSE_BYTES,
  REQUEST_TIMEOUT_MS,
  SOURCE_DELAY_MS,
};