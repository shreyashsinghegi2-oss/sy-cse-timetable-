/**
 * URL Guard — ensures every apply/source URL is a search-based or category page,
 * never a specific job-ID or detail page that expires or points to a removed listing.
 * Also covers direct competition/event pages on known student platforms.
 */

const FORBIDDEN_PATTERNS: RegExp[] = [
  /linkedin\.com\/jobs\/view\/\d+/i,
  /internshala\.com\/internship\/detail\//i,
  /internshala\.com\/internship\/[^/\s]+\//i,
  /unstop\.com\/jobs\/[\w-]+-\d+/i,
  /wellfound\.com\/jobs\/[\w-]+\/apply/i,
  /naukri\.com\/job-listings-[\w-]+-\d+/i,
  /fiverr\.com\/(?!search)[a-z0-9_.-]+\/[\w-]+/i,
  /upwork\.com\/jobs\/~[a-z0-9]+/i,
  /\/careers\/job\/\d+/i,
  /\/jobs\/\d+\/?$/i,
  /\/apply\/?$/i,
  /\/view\/\d+/i,
  /\/job-detail\//i,
  /\/listing\/\d+/i,
];

/** Only URLs that match at least one of these are considered safe. */
const ALLOWED_PATTERNS: RegExp[] = [
  // ── Internshala ──────────────────────────────────────────────────────────────
  /^https:\/\/internshala\.com\/internships\/[\w-]+-internship\/?(\?.*)?$/i,
  /^https:\/\/internshala\.com\/internships\/work-from-home-[\w-]+-internship\/?(\?.*)?$/i,
  /^https:\/\/internshala\.com\/internships\/?(\?.*)?$/i,
  /^https:\/\/internshala\.com\/jobs\/[\w-]+-jobs\/?(\?.*)?$/i,
  /^https:\/\/internshala\.com\/freelance-projects\//i,

  // ── Unstop — opportunities / jobs / hackathons / competitions ────────────────
  /^https:\/\/unstop\.com\/opportunities(\?.*)?$/i,
  /^https:\/\/unstop\.com\/hackathons(\?.*)?$/i,
  /^https:\/\/unstop\.com\/hackathons\/[\w-]+-\d+(\?.*)?$/i,
  /^https:\/\/unstop\.com\/competitions(\?.*)?$/i,
  /^https:\/\/unstop\.com\/competitions\/[\w-]+-\d+(\?.*)?$/i,
  /^https:\/\/unstop\.com\/p\/[\w-]+(\?.*)?$/i,

  // ── LinkedIn ──────────────────────────────────────────────────────────────────
  /^https:\/\/www\.linkedin\.com\/jobs\/search\/\?/i,

  // ── Wellfound / AngelList ─────────────────────────────────────────────────────
  /^https:\/\/wellfound\.com\/jobs\?/i,

  // ── Naukri / Foundit ─────────────────────────────────────────────────────────
  /^https:\/\/www\.naukri\.com\/[\w-]+-jobs\/?(\?.*)?$/i,
  /^https:\/\/www\.foundit\.in\/srp\/results\?/i,
  /^https:\/\/www\.foundit\.in\/jobs\//i,

  // ── Fiverr / Upwork ───────────────────────────────────────────────────────────
  /^https:\/\/www\.fiverr\.com\/search\/gigs\?/i,
  /^https:\/\/www\.upwork\.com\/search\/jobs\/\?/i,

  // ── Cutshort ──────────────────────────────────────────────────────────────────
  /^https:\/\/cutshort\.io\/jobs(\?.*)?$/i,

  // ── Apna ──────────────────────────────────────────────────────────────────────
  /^https:\/\/apna\.co\/jobs(\?.*)?$/i,

  // ── WorkIndia ─────────────────────────────────────────────────────────────────
  /^https:\/\/workindia\.in\/jobs(\?.*)?$/i,

  // ── Freelancer.in / Truelancer ────────────────────────────────────────────────
  /^https:\/\/www\.freelancer\.in\//i,
  /^https:\/\/www\.truelancer\.com\//i,

  // ── Hirect ────────────────────────────────────────────────────────────────────
  /^https:\/\/hirect\.in\//i,

  // ── Shine ─────────────────────────────────────────────────────────────────────
  /^https:\/\/www\.shine\.com\/job-search\//i,

  // ── HackerEarth ───────────────────────────────────────────────────────────────
  /^https:\/\/www\.hackerearth\.com\/challenges\//i,

  // ── Kaggle ────────────────────────────────────────────────────────────────────
  /^https:\/\/www\.kaggle\.com\/competitions(\?.*)?$/i,
  /^https:\/\/www\.kaggle\.com\/competitions\/[\w-]+(\?.*)?$/i,

  // ── Dare2Compete ──────────────────────────────────────────────────────────────
  /^https:\/\/dare2compete\.com\/competition\/[\w-]+(\?.*)?$/i,
  /^https:\/\/dare2compete\.com\/competitions(\?.*)?$/i,

  // ── Devfolio ──────────────────────────────────────────────────────────────────
  /^https:\/\/devfolio\.co\/hackathons(\?.*)?$/i,
  /^https:\/\/devfolio\.co\/hackathons\/[\w-]+(\?.*)?$/i,
  /^https:\/\/[\w-]+\.devfolio\.co\/?(\?.*)?$/i,

  // ── Devpost ───────────────────────────────────────────────────────────────────
  /^https:\/\/devpost\.com\/hackathons(\?.*)?$/i,
  /^https:\/\/devpost\.com\/hackathons\/[\w-]+(\?.*)?$/i,

  // ── HackerRank ────────────────────────────────────────────────────────────────
  /^https:\/\/www\.hackerrank\.com\/contests\/[\w-]+\//i,
  /^https:\/\/www\.hackerrank\.com\/challenges\//i,

  // ── LeetCode ──────────────────────────────────────────────────────────────────
  /^https:\/\/leetcode\.com\/contest\/[\w-]+\/?(\?.*)?$/i,

  // ── Codeforces ────────────────────────────────────────────────────────────────
  /^https:\/\/codeforces\.com\/contests(\?.*)?$/i,
  /^https:\/\/codeforces\.com\/contest\/\d+(\?.*)?$/i,

  // ── CodeChef ──────────────────────────────────────────────────────────────────
  /^https:\/\/www\.codechef\.com\/[\w-]+(\?.*)?$/i,

  // ── SIH / Govt events ─────────────────────────────────────────────────────────
  /^https:\/\/sih\.gov\.in\//i,
  /^https:\/\/innovate\.mygov\.in\//i,

  // ── Generic college-fest & event sites (direct .in / .com event pages) ────────
  /^https:\/\/[\w-]+\.in\/(?:hackathon|event|register|competition)[\w/.-]*(\?.*)?$/i,
  /^https:\/\/[\w-]+\.com\/(?:hackathon|event|register|competition)[\w/.-]*(\?.*)?$/i,
];

/** Platform-to-category search fallback URLs used when a URL fails validation. */
const COMPETITION_FALLBACK_BY_SOURCE: Record<string, string> = {
  unstop: "https://unstop.com/hackathons?search=student",
  devfolio: "https://devfolio.co/hackathons",
  hackerearth: "https://www.hackerearth.com/challenges/",
  kaggle: "https://www.kaggle.com/competitions?search=student",
  dare2compete: "https://dare2compete.com/competitions",
  devpost: "https://devpost.com/hackathons",
  hackerrank: "https://www.hackerrank.com/contests/",
  leetcode: "https://leetcode.com/contest/",
  codeforces: "https://codeforces.com/contests",
  codechef: "https://www.codechef.com/",
};

function makeSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

function makeQuery(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
    .replace(/\s+/g, "+");
}

export function buildSafeUrl(title: string, type: string, source?: string): string {
  const slug = makeSlug(title);
  const query = makeQuery(title);

  // Competition types — route to the best platform search page
  if (["hackathon", "case-study", "coding-contest", "business-plan", "olympiad",
       "quiz", "ideathon", "design", "research", "competition"].includes(type)) {
    if (source) {
      const src = source.toLowerCase();
      for (const [key, url] of Object.entries(COMPETITION_FALLBACK_BY_SOURCE)) {
        if (src.includes(key)) return url;
      }
    }
    return `https://unstop.com/hackathons?search=${query}`;
  }

  if (type === "microtask" || type === "freelance") {
    return `https://www.fiverr.com/search/gigs?query=${query}`;
  }
  if (type === "internship") {
    return `https://internshala.com/internships/${slug}-internship/`;
  }
  // jobs, part-time, full-time, contract, remote
  return `https://www.linkedin.com/jobs/search/?keywords=${query}&location=India&f_WT=2`;
}

export function isBrokenUrl(url: string | undefined | null): boolean {
  if (!url || typeof url !== "string") return true;
  try {
    new URL(url); // must be a valid URL
  } catch {
    return true;
  }
  if (FORBIDDEN_PATTERNS.some((p) => p.test(url))) return true;
  if (!ALLOWED_PATTERNS.some((p) => p.test(url))) return true;
  return false;
}

export interface Fixable {
  title: string;
  type?: string;
  source?: string;
  url?: string;
  source_url?: string;
  [key: string]: any;
}

/**
 * Replaces any broken apply/source URL on every item in-place with a safe
 * search-based URL. Returns the same array with URLs fixed.
 */
export function sanitizeUrls<T extends Fixable>(items: T[], sector: string): T[] {
  let fixedCount = 0;
  const result = items.map((item) => {
    const currentUrl = item.url || item.source_url || "";
    if (isBrokenUrl(currentUrl)) {
      const itemType = item.type || sector;
      const safeUrl = buildSafeUrl(item.title || "", itemType, item.source);
      console.warn(`[URLGuard] Fixed broken URL for "${item.title}": "${currentUrl}" → "${safeUrl}"`);
      fixedCount++;
      return { ...item, url: safeUrl, source_url: safeUrl };
    }
    return item;
  });
  if (fixedCount > 0) {
    console.log(`[URLGuard] Fixed ${fixedCount}/${items.length} URLs in sector="${sector}"`);
  }
  return result;
}
