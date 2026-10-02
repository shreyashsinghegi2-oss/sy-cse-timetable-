/**
 * Frontend URL safety guard — every Apply Now click passes through here.
 * Broken or specific-ID URLs are silently replaced with equivalent search pages.
 */

const SAFE_DOMAINS = [
  "internshala.com",
  "unstop.com",
  "linkedin.com",
  "wellfound.com",
  "naukri.com",
  "fiverr.com",
  "upwork.com",
  "cutshort.io",
  "apna.co",
  "workindia.in",
  "freelancer.in",
  "truelancer.com",
];

const FORBIDDEN_PATH: RegExp[] = [
  /\/jobs\/view\/\d+/i,
  /\/internship\/detail\//i,
  /\/jobs\/~[a-z0-9]+/i,
  /\/apply\/?$/i,
  /\/view\/\d+/i,
  /\/detail\//i,
  /\/listing\/\d+/i,
  /\/careers\/job\/\d+/i,
  /\/jobs\/\d+\/?$/i,
];

function makeQuery(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
    .replace(/\s+/g, "+");
}

function makeSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

function buildFallback(title: string, type: string): string {
  const q = makeQuery(title);
  const s = makeSlug(title);
  if (type === "microtask" || type === "freelance") {
    return `https://www.fiverr.com/search/gigs?query=${q}`;
  }
  if (type === "internship") {
    return `https://internshala.com/internships/${s}-internship/`;
  }
  return `https://www.linkedin.com/jobs/search/?keywords=${q}&location=India&f_WT=2`;
}

function isSafe(url: string): boolean {
  try {
    const parsed = new URL(url);
    const domain = parsed.hostname.replace(/^www\./, "");
    if (!SAFE_DOMAINS.some((d) => domain === d || domain.endsWith("." + d))) return false;
    const fullPath = parsed.pathname + parsed.search;
    if (FORBIDDEN_PATH.some((p) => p.test(fullPath))) return false;
    return true;
  } catch {
    return false;
  }
}

export interface ApplyListing {
  title: string;
  company?: string;
  url?: string;
  source_url?: string;
  type?: string;
  source?: string;
  id?: string;
  [key: string]: any;
}

/**
 * Opens the apply URL for a listing safely.
 * - Validates the URL against forbidden patterns
 * - Replaces broken URLs with search-page equivalents
 * - Returns the URL that was actually opened
 */
export function safeOpen(listing: ApplyListing, sector: string): string {
  let url = listing.url || listing.source_url || "";
  if (!isSafe(url)) {
    const type = listing.type || sector;
    const fallback = buildFallback(listing.title || listing.company || "student opportunities", type);
    if (url) {
      console.warn("[ApplyHandler] Replacing unsafe URL:", url, "→", fallback);
    }
    url = fallback;
  }
  const win = window.open(url, "_blank", "noopener,noreferrer");
  if (!win) window.location.href = url;
  return url;
}
