import { Router, Request, Response } from "express";
import { getFirebaseAdmin, admin } from "../firebase-admin";
import { publicAILimiter, searchLinksLimiter } from "../middleware/rate-limiter";
import { getLancingSearchLinks } from "../utils/lancing-search-links";
import { HIMALAYAS_VERIFICATION_TTL_MS, isRecentPosting } from "../utils/lancing-posting-freshness";
import {
  AIOpportunity,
  getAIMatches,
  getLiveFeed,
  getTrendingSearches,
  logSearchQuery,
  rankLancingOpportunities,
  searchOpportunities,
} from "../lancing-ai";

type OpportunityCategory = "jobs" | "internships" | "micro_tasks";
type InternalCategory = "job" | "internship" | "micro_task";

const router = Router();
const categories: OpportunityCategory[] = ["jobs", "internships"];
const INTERNAL_READ_LIMIT_PER_QUERY = 100;
const INTERNAL_MAX_READS_PER_COLLECTION = INTERNAL_READ_LIMIT_PER_QUERY * 2;
const internalCollections: Array<{ name: string; category: InternalCategory }> = [
  { name: "lancing_jobs", category: "job" },
  { name: "lancing_internships", category: "internship" },
  { name: "internships", category: "internship" },
  { name: "microTasks", category: "micro_task" },
  { name: "opportunities", category: "job" },
];

router.use((_req, res, next) => {
  res.set({
    "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
    Pragma: "no-cache",
    Expires: "0",
    "Surrogate-Control": "no-store",
  });
  next();
});

async function verifyUser(req: Request): Promise<{ uid: string; email?: string } | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) return null;
  try {
    if (!getFirebaseAdmin()) return null;
    const decoded = await admin.auth().verifyIdToken(authHeader.slice("Bearer ".length));
    return { uid: decoded.uid, email: decoded.email };
  } catch {
    return null;
  }
}

function dateValue(value: any): number | null {
  if (value && typeof value.toDate === "function") {
    const date = value.toDate();
    return date instanceof Date && Number.isFinite(date.getTime()) ? date.getTime() : null;
  }
  if (value instanceof Date) return Number.isFinite(value.getTime()) ? value.getTime() : null;
  if (typeof value !== "string" && typeof value !== "number") return null;
  if (typeof value === "string" && !/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})?)?$/.test(value.trim())) return null;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : null;
}

function isCurrentListing(record: any, now = Date.now()): boolean {
  if (!record || typeof record !== "object" || typeof record.title !== "string" || !record.title.trim()) return false;
  if (Array.isArray(record.skills) && record.skills.some((skill: any) => typeof skill !== "string")) return false;
  const status = typeof record.status === "string" ? record.status.toLowerCase() : "";
  if (status && !["open", "active", "published"].includes(status)) return false;
  for (const key of ["deadline", "expiresAt", "expiryDate", "expires_at"]) {
    const value = record[key];
    if (value === undefined || value === null || value === "") continue;
    const time = dateValue(value);
    if (time === null || time <= now) return false;
  }
  return true;
}

function isVerifiedCurrentExternal(record: any, now = Date.now()): boolean {
  if (!isCurrentListing(record, now)) return false;
  const metadata = record?.source_metadata;
  if (!metadata || metadata.verified !== true || metadata.verificationStatus !== "VERIFIED_EXTERNAL") return false;
  if (metadata.category !== "competitions" && !isRecentPosting(record?.posted_at, new Date(now))) return false;
  const verifiedAt = dateValue(metadata.sourceUpdatedAt);
  const ttl = metadata.sourceRegistryId === "himalayas-jobs" || metadata.sourceRegistryId === "himalayas-internships"
    ? HIMALAYAS_VERIFICATION_TTL_MS : 12 * 60 * 60 * 1000;
  return verifiedAt !== null && verifiedAt <= now && now - verifiedAt <= ttl;
}

function isRecentBrowseResult(item: any): boolean {
  const category = item?._category || item?.source_metadata?.category || item?.category || item?.type;
  return category === "competitions" || category === "competition"
    || isRecentPosting(item?.posted_at);
}

function publicVerificationFields(item: any): any {
  const isInternal = item?.isInternal === true;
  const isVerified = !isInternal && isVerifiedCurrentExternal(item);
  return { ...item, isVerified, verified: isVerified };
}

function engineResponseMetadata(items: any[], emptyStatus = "empty_verified_data") {
  if (!items.length) return { fallback: false, engineStatus: emptyStatus };
  const statuses = Array.from(new Set(items
    .map((item) => item?.engineStatus)
    .filter((status): status is string => ["gemini", "legacy", "degraded"].includes(status))));
  const fallback = items.some((item) => item?.fallback === true || item?.engineStatus === "degraded");
  if (fallback) return { fallback: true, engineStatus: "degraded" };
  if (statuses.length === 1) return { fallback: false, engineStatus: statuses[0] };
  if (statuses.length > 1) return { fallback: false, engineStatus: "mixed" };
  return { fallback: false, engineStatus: "unknown" };
}

function unavailableEngineMetadata() {
  return { fallback: false, engineStatus: "unavailable" };
}

function publicString(value: any, maxLength = 500): string | undefined {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : undefined;
}

function publicAmount(value: any): string | undefined {
  if (typeof value !== "string" && typeof value !== "number") return undefined;
  if (typeof value === "number" && !Number.isFinite(value)) return undefined;
  return String(value).trim().slice(0, 100);
}

function publicDate(value: any): string | undefined {
  const time = dateValue(value);
  return time === null ? undefined : new Date(time).toISOString();
}

function mapInternal(id: string, raw: any, category: InternalCategory, collection: string): any | null {
  if (!isCurrentListing(raw)) return null;
  const isGeneralOpportunity = collection === "opportunities";
  const rawType = String(raw.type || "").toLowerCase().replace(/[-_\s]/g, "");
  const internalType = isGeneralOpportunity
    ? rawType === "internship" ? "internship" : rawType === "microtask" || rawType === "task" ? "micro_task" : "job"
    : category;
  const normalizedCategory: OpportunityCategory =
    internalType === "internship" ? "internships" : internalType === "micro_task" ? "micro_tasks" : "jobs";
  const title = publicString(raw.title, 200) || "";
  const companyName = publicString(raw.companyName || raw.company, 160) || "Company";
  const companyId = publicString(raw.companyId, 160) || "";
  const companyLogo = publicString(raw.companyLogo, 1000);
  const skills = Array.isArray(raw.skills)
    ? raw.skills.filter((skill: any) => typeof skill === "string").slice(0, 30).map((skill: string) => skill.trim().slice(0, 100))
    : [];
  const stipendValue = raw.stipend ?? raw.budget ?? raw.payment ?? raw.payout;
  const description = publicString(raw.description, 3000) || "";
  const mode = publicString(raw.mode || raw.work_mode, 80) || "Remote";
  const location = publicString(raw.location, 160);
  const deadline = publicDate(raw.deadline);
  const duration = publicString(raw.duration, 100);
  const budget = publicAmount(raw.budget ?? raw.payout);
  const payment = publicAmount(raw.payment);
  const stipend = publicAmount(raw.stipend);
  const status = publicString(raw.status, 40);
  const internalRecord = {
    id,
    title,
    companyId,
    companyName,
    ...(companyLogo ? { companyLogo } : {}),
    skills,
    ...(stipend ? { stipend } : {}),
    description,
    mode,
    ...(location ? { location } : {}),
    ...(deadline ? { deadline } : {}),
    ...(duration ? { duration } : {}),
    ...(status ? { status } : {}),
    ...(budget ? { budget } : {}),
    ...(payment ? { payment } : {}),
    type: internalType,
    sourceCollection: collection,
  };
  return {
    id: `internal:${collection}:${id}`,
    listingId: id,
    title,
    company: companyName,
    companyName,
    companyId,
    ...(companyLogo ? { companyLogo } : {}),
    skills,
    stipend: publicAmount(stipendValue) ? `₹${publicAmount(stipendValue)}` : "Not specified",
    work_mode: mode,
    workMode: mode,
    location: location || null,
    deadline: deadline || null,
    posted_at: publicDate(raw.createdAt ?? raw.created_at ?? raw.postedAt),
    duration: duration || null,
    description,
    source: "StudentLancing",
    source_url: undefined,
    url: `internal:${id}`,
    category: internalType,
    _category: normalizedCategory,
    isInternal: true,
    isVerified: false,
    verified: false,
    internalType,
    internalRecord,
  };
}

async function fetchInternal(category?: OpportunityCategory): Promise<any[]> {
  const db = admin.firestore();
  const selected = internalCollections.filter(({ category: type, name }) => {
    if (name === "opportunities") return true;
    if (!category) return type !== "micro_task";
    if (category === "jobs") return type === "job";
    if (category === "internships") return type === "internship";
    return type === "micro_task";
  });
  const snapshots = await Promise.all(selected.map(async ({ name, category: type }) => {
    try {
      const query = db.collection(name);
      const openQuery = name === "opportunities" ? query.where("status", "==", "open") : query;
      const [recent, compatibility] = await Promise.all([
        openQuery.orderBy("createdAt", "desc").limit(INTERNAL_READ_LIMIT_PER_QUERY).get().catch(() => null),
        openQuery.limit(INTERNAL_READ_LIMIT_PER_QUERY).get().catch(() => null),
      ]);
      const documents = new Map<string, any>();
      for (const doc of [...(recent?.docs || []), ...(compatibility?.docs || [])]) {
        if (!documents.has(doc.id)) documents.set(doc.id, doc);
      }
      const now = new Date();
      return Array.from(documents.values())
        .map((doc: any) => {
          const data = doc.data();
          const postedAt = data.createdAt ?? data.created_at ?? data.postedAt;
          return {
            item: mapInternal(doc.id, data, type, name),
            createdAt: dateValue(postedAt) ?? Number.NEGATIVE_INFINITY,
            collection: name,
            documentId: doc.id,
          };
        })
        .filter((entry: any) => entry.item && isRecentPosting(entry.createdAt, now));
    } catch {
      return [];
    }
  }));
  const allowed = new Set(category ? [category] : categories);
  return snapshots.flat()
    .sort((a: any, b: any) =>
      b.createdAt - a.createdAt
      || a.collection.localeCompare(b.collection)
      || a.documentId.localeCompare(b.documentId))
    .map((entry: any) => entry.item)
    .filter((item: any) => allowed.has(item._category));
}

function internalReadMetadata() {
  return {
    internalReadLimitPerCollection: INTERNAL_MAX_READS_PER_COLLECTION,
    internalListingsMayBeTruncated: true,
  };
}

function categoryFrom(value: unknown): OpportunityCategory | "all" {
  const raw = String(value || "all").toLowerCase();
  if (raw.startsWith("intern")) return "internships";
  if (raw.startsWith("micro") || raw === "task" || raw === "tasks") return "micro_tasks";
  if (raw.startsWith("job")) return "jobs";
  return "all";
}

function deduplicate(items: any[]): any[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = typeof item.url === "string" && !item.url.startsWith("internal:")
      ? item.url.trim().toLowerCase().replace(/\/$/, "")
      : String(item.id || "").trim();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function externalItems(selected: OpportunityCategory[]): Promise<any[]> {
  const feeds = await Promise.all(selected.map(async (category) => {
    const { data } = await getLiveFeed(category);
    return (data || []).filter((item) => isVerifiedCurrentExternal(item)).map((item) => ({
      ...item,
      id: `external:${item.id || item.url}`,
      listingId: item.id,
      _category: category,
      category: category === "micro_tasks" ? "task" : category === "internships" ? "internship" : "job",
      isInternal: false,
      isVerified: true,
      verified: true,
    }));
  }));
  return feeds.flat();
}

function profileSectors(profile: any): string[] {
  const text = [
    profile?.branch || profile?.stream || "",
    ...(Array.isArray(profile?.skills) ? profile.skills : []),
    ...(Array.isArray(profile?.interests) ? profile.interests : []),
  ].join(" ").toLowerCase();
  const matching: Array<[string, string[]]> = [
    ["engineering", ["engineer", "computer", "cse", "software", "python", "developer", "coding"]],
    ["medical", ["medical", "mbbs", "nurs", "healthcare"]],
    ["business", ["business", "bba", "mba", "marketing", "finance", "commerce"]],
    ["design", ["design", "ui", "ux", "figma", "graphic"]],
    ["media", ["media", "writing", "content", "journalism"]],
    ["law", ["law", "legal", "llb"]],
    ["science", ["science", "biology", "chemistry", "physics", "research"]],
    ["education", ["teach", "tutor", "education"]],
  ];
  const found = matching.filter(([, words]) => words.some((word) => text.includes(word))).map(([sector]) => sector);
  return found.length ? found : ["engineering", "business", "design"];
}

router.get("/api/lancing/live-feed/:category", publicAILimiter, async (req: Request, res: Response) => {
  const category = req.params.category;
  if (!["jobs", "internships", "competitions"].includes(category)) {
    return res.status(400).json({ error: "Invalid category" });
  }
  const rawSectors = String(req.query.sectors || "").slice(0, 500);
  const sectors = rawSectors.split(",").map((sector) => sector.trim().slice(0, 60)).filter(Boolean).slice(0, 8);
  try {
    if (category === "competitions") {
      const student = await verifyUser(req);
      let studentProfile: Record<string, unknown> = {};
      if (student) {
        try {
          const snapshot = await admin.firestore().collection("lancing_users").doc(student.uid)
            .collection("profile").doc("data").get();
          const profile = snapshot.data() || {};
          studentProfile = {
            degree: profile.degree || profile.course || profile.branch || "",
            year: profile.year || profile.academicYear || "",
            skills: Array.isArray(profile.skills) ? profile.skills.slice(0, 30) : [],
            careerGoals: profile.careerGoals || profile.preferredRole || "",
            interests: Array.isArray(profile.interests) ? profile.interests.slice(0, 20) : [],
          };
        } catch { /* Feed stays available when optional profile data cannot be read. */ }
      }
      const result = await getLiveFeed("competitions", sectors, studentProfile);
      const items = (result.data || [])
        .filter((item) => isVerifiedCurrentExternal(item))
        .map((item) => publicVerificationFields(item));
      return res.json({
        items,
        cached: result.cached,
        cachedAt: result.cachedAt,
        ...engineResponseMetadata(items),
      });
    }
    const opportunityCategory = category as OpportunityCategory;
    const [external, internal] = await Promise.all([
      externalItems([opportunityCategory]),
      fetchInternal(opportunityCategory),
    ]);
    const items = deduplicate([...internal, ...external]);
    const ranked = (await rankLancingOpportunities(items, { sectors }, "", `live_feed_${category}`))
      .filter(isRecentBrowseResult);
    return res.json({
      items: ranked,
      cached: false,
      cachedAt: Date.now(),
      ...engineResponseMetadata(ranked),
      ...internalReadMetadata(),
    });
  } catch {
    return res.status(500).json({ error: "Failed to fetch live feed", ...unavailableEngineMetadata() });
  }
});

router.get("/api/lancing/search", publicAILimiter, async (req: Request, res: Response) => {
  const query = String(req.query.q || "").trim();
  if (query.length > 200) return res.status(400).json({ error: "Query too long", maxLength: 200 });
  const rawCategory = String(req.query.category || "jobs");
  if (rawCategory === "micro_tasks") return res.status(400).json({ error: "Micro Tasks are unavailable" });
  const category = (["jobs", "internships"].includes(rawCategory) ? rawCategory : "jobs") as OpportunityCategory;
  if (!query) return res.json({ items: [], cached: false, cachedAt: 0, fallback: false, engineStatus: "not_run" });
  try {
    const candidates = await fetchInternal(category);
    const { items, cached, cachedAt } = await searchOpportunities(query, category, candidates as AIOpportunity[]);
    const recentItems = items.filter(isRecentBrowseResult);
    void logSearchQuery(query, {
      uid: (req as any).session?.userId ? String((req as any).session.userId) : null,
      result_counts: { [category]: recentItems.length },
    });
    return res.json({
      items: recentItems.map((item) => publicVerificationFields(item)),
      cached,
      cachedAt,
      ...engineResponseMetadata(recentItems),
      ...internalReadMetadata(),
    });
  } catch {
    return res.status(503).json({
      error: "search_unavailable",
      message: "Opportunity search is temporarily unavailable.",
      ...unavailableEngineMetadata(),
    });
  }
});

router.get("/api/lancing/search/trending", async (_req: Request, res: Response) => {
  try {
    return res.json({ items: await getTrendingSearches(8) });
  } catch {
    return res.json({ items: [] });
  }
});

router.post("/api/lancing/search-links", searchLinksLimiter, async (req: Request, res: Response) => {
  const body = req.body && typeof req.body === "object" && !Array.isArray(req.body) ? req.body : {};
  const allowedCategories = ["jobs", "internships", "competitions", "ai_match"];
  if (typeof body.category !== "string" || !allowedCategories.includes(body.category)) {
    return res.status(400).json({ error: "Invalid category" });
  }
  try {
    const result = await getLancingSearchLinks({
      category: body.category,
      query: body.query,
      hints: body.hints,
    });
    return res.json(result);
  } catch {
    return res.status(503).json({ error: "search_links_unavailable" });
  }
});

router.post("/api/match", publicAILimiter, async (req: Request, res: Response) => {
  try {
    const body = req.body || {};
    const user = await verifyUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    if (body.uid !== undefined && body.uid !== user.uid) return res.status(403).json({ error: "Forbidden" });
    const query = typeof body.query === "string" ? body.query.trim() : "";
    if (query.length > 200) return res.status(400).json({ error: "query too long", maxLength: 200 });
    const category = categoryFrom(body.category);
    if (category === "micro_tasks") return res.status(400).json({ error: "Micro Tasks are unavailable" });
    const selected: OpportunityCategory[] = category === "all" ? categories : [category];
    const internalOnly = body.internalOnly === true;
    const db = admin.firestore();
    let profile: any = null;
    try {
      const snap = await db.collection("lancing_users").doc(user.uid).collection("profile").doc("data").get();
      if (snap.exists) profile = snap.data();
    } catch { /* Optional profile data does not prevent listing results. */ }
    const [internal, external] = await Promise.all([
      fetchInternal(category === "all" ? undefined : category),
      internalOnly ? Promise.resolve([]) : externalItems(selected),
    ]);
    const batch = deduplicate([...internal, ...external]).filter((item) => selected.includes(item._category));
    const ranked = await rankLancingOpportunities(batch, profile || {}, query, "match");
    const results = ranked.filter(isRecentBrowseResult).slice(0, 40).map((item: any) => publicVerificationFields({
      ...item,
      id: item.listingId || item.id,
    }));
    return res.json({
      results,
      count: results.length,
      timestamp: Date.now(),
      category,
      ...engineResponseMetadata(ranked),
      ...internalReadMetadata(),
    });
  } catch {
    return res.status(503).json({
      results: [],
      count: 0,
      error: "match_unavailable",
      ...unavailableEngineMetadata(),
    });
  }
});

router.post("/api/lancing/opportunities-hub", publicAILimiter, async (req: Request, res: Response) => {
  try {
    const user = await verifyUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    const db = admin.firestore();
    const profileDoc = await db.collection("lancing_users").doc(user.uid).collection("profile").doc("data").get();
    const profile: any = profileDoc.exists ? profileDoc.data() : null;
    if (!profile) return res.json({ matches: [], timestamp: Date.now(), noProfile: true, fallback: false, engineStatus: "not_run" });
    const sectors = profileSectors(profile);
    const [internal, external] = await Promise.all([
      fetchInternal(),
      externalItems(categories),
    ]);
    const batch = deduplicate([...internal, ...external]);
    if (!batch.length) {
      return res.json({
        matches: [],
        timestamp: Date.now(),
        noListings: true,
        ...engineResponseMetadata([]),
        ...internalReadMetadata(),
      });
    }
    const ranked = await rankLancingOpportunities(batch, profile, "", "opportunities_hub");
    const matches = ranked
      .filter((item: any) => isRecentBrowseResult(item) && (item.isInternal || item.source_url || item.url))
      .slice(0, 30)
      .map((item: any) => ({
        id: item.listingId || item.id,
        title: item.title,
        company: item.company,
        category: item.category,
        stipend: item.stipend || null,
        workMode: item.work_mode || item.workMode || "Remote",
        location: item.location || null,
        deadline: item.deadline || null,
        duration: item.duration || null,
        skills: item.skills || [],
        description: item.description || "",
        source: item.source || "",
        applyUrl: item.isInternal ? null : item.url || item.source_url || null,
        posted_ago: item.posted_ago || null,
        matchScore: item.matchScore,
        matchReason: item.matchReason,
        verified: item.isInternal ? false : item.verified === true,
        isVerified: item.isInternal ? false : isVerifiedCurrentExternal(item),
        isInternal: item.isInternal === true,
        internalType: item.internalType || null,
      }));
    return res.json({
      matches,
      timestamp: Date.now(),
      sectors,
      ...engineResponseMetadata(ranked),
      ...internalReadMetadata(),
    });
  } catch {
    return res.status(500).json({ error: "Failed to fetch matches", ...unavailableEngineMetadata() });
  }
});

router.post("/api/lancing/ai-match", publicAILimiter, async (req: Request, res: Response) => {
  try {
    const user = await verifyUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    const { resumeText, profile } = req.body || {};
    if (typeof resumeText !== "string" || resumeText.trim().length < 50) {
      return res.status(400).json({ error: "Resume text is too short" });
    }
    if (resumeText.length > 10_000) {
      return res.status(400).json({ error: "Resume text is too long", maxLength: 10_000 });
    }
    if (!profile || typeof profile !== "object") return res.status(400).json({ error: "Profile is required" });
    const candidates = await fetchInternal();
    const items = (await getAIMatches({ resumeText, profile, candidates: candidates as AIOpportunity[] }))
      .filter(isRecentBrowseResult);
    return res.json({
      items: items.map((item: any) => publicVerificationFields({
        ...item,
        id: item.listingId || item.id,
      })),
      ...engineResponseMetadata(items),
      ...internalReadMetadata(),
    });
  } catch {
    return res.status(500).json({ error: "AI matching failed", ...unavailableEngineMetadata() });
  }
});

export default router;