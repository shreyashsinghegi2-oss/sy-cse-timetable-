import { Router, Request, Response } from "express";
import { GoogleGenAI } from "@google/genai";
import { getFirebaseAdmin, admin } from "../firebase-admin";
import { PLATFORM_ADMIN_EMAIL } from "../config/constants";
import { cacheMiddleware, invalidateCache } from "../middleware/api-cache";
import {
  comparePublicDriveDocsNewestFirst,
  decodePublicDrivesCursor,
  encodePublicDrivesCursor,
  matchesPublicDrivesCursor,
} from "../utils/public-drive-pagination";
import { aiGate, isCircuitOpen, recordAIFailure, recordAISuccess, releaseConcurrencySlot, withAITimeout } from "../utils/ai-guard";

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";
let _gemini: GoogleGenAI | null = null;
function getGemini(): GoogleGenAI {
  if (!_gemini) {
    if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY not set");
    _gemini = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: { timeout: 60_000 },
    });
  }
  return _gemini;
}

const router = Router();
const PUBLIC_DRIVES_CACHE_PATTERN = "/api/placement-cell/public/drives";
const DEFAULT_PUBLIC_DRIVES_PAGE_SIZE = 25;
const MAX_PUBLIC_DRIVES_PAGE_SIZE = 50;

function getPublicDrivesPageSize(value: unknown): number {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(parsed) || parsed < 1) return DEFAULT_PUBLIC_DRIVES_PAGE_SIZE;
  return Math.min(parsed, MAX_PUBLIC_DRIVES_PAGE_SIZE);
}

function toPublicDrive(doc: FirebaseFirestore.QueryDocumentSnapshot): any {
  const data = doc.data();
  return serialize({
    id: doc.id,
    jobTitle: data.jobTitle, companyName: data.companyName,
    collegeName: data.collegeName, jobType: data.jobType,
    location: data.location, ctc: data.ctc,
    eligibility: data.eligibility, deadline: data.deadline,
    hasAssessment: data.hasAssessment, applicantCount: data.applicantCount || 0,
    createdAt: data.createdAt,
  });
}

function isMissingFirestoreIndex(error: any): boolean {
  return error?.code === 9 || /query requires an index/i.test(String(error?.message || ""));
}

// ─── Auth helpers ─────────────────────────────────────────────────────────────
async function verifyUser(req: Request): Promise<{ uid: string; email?: string } | null> {
  const hdr = req.headers.authorization;
  if (!hdr?.startsWith("Bearer ")) return null;
  try {
    if (!getFirebaseAdmin()) return null;
    const decoded = await admin.auth().verifyIdToken(hdr.replace("Bearer ", ""));
    return { uid: decoded.uid, email: decoded.email };
  } catch { return null; }
}

const ADMIN_EMAIL = PLATFORM_ADMIN_EMAIL;

async function verifyAdmin(req: Request): Promise<{ uid: string; email?: string } | null> {
  const u = await verifyUser(req);
  if (!u) return null;
  if ((u.email || "").toLowerCase() !== ADMIN_EMAIL.toLowerCase()) return null;
  return u;
}

async function verifyPlacementCell(req: Request): Promise<{ uid: string; email?: string; doc: any } | null> {
  const u = await verifyUser(req);
  if (!u || !getFirebaseAdmin()) return null;
  const userSnap = await admin.firestore().collection("lancing_users").doc(u.uid).get();
  if (!userSnap.exists || userSnap.data()?.role !== "placement_cell") return null;
  const pcSnap = await admin.firestore().collection("placement_cells").doc(u.uid).get();
  return { uid: u.uid, email: u.email, doc: pcSnap.exists ? pcSnap.data() : null };
}

function serialize(raw: any): any {
  if (raw == null) return raw;
  if (Array.isArray(raw)) return raw.map(serialize);
  if (typeof raw === "object") {
    if (typeof raw.toDate === "function") return raw.toDate().toISOString();
    const out: any = {};
    for (const [k, v] of Object.entries(raw)) out[k] = serialize(v);
    return out;
  }
  return raw;
}

// ─── PC PROFILE ───────────────────────────────────────────────────────────────
// ─── Admin: approve / reject a placement cell ────────────────────────────────
router.post("/api/admin/placement-cells/:uid/approve", async (req: Request, res: Response) => {
  try {
    const admin_user = await verifyAdmin(req);
    if (!admin_user) return res.status(403).json({ error: "Forbidden" });
    if (!getFirebaseAdmin()) return res.status(500).json({ error: "Admin SDK unavailable" });

    const { uid } = req.params;
    const db = admin.firestore();
    const snap = await db.collection("placement_cells").doc(uid).get();
    if (!snap.exists) return res.status(404).json({ error: "Placement cell not found" });

    await db.collection("placement_cells").doc(uid).set({
      status: "approved",
      approved_at: admin.firestore.FieldValue.serverTimestamp(),
      approved_by: admin_user.email || "",
      rejected_at: admin.firestore.FieldValue.delete(),
      rejected_by: admin.firestore.FieldValue.delete(),
      rejection_reason: admin.firestore.FieldValue.delete(),
    }, { merge: true });
    res.json({ ok: true });
  } catch (err: any) {
    console.error("[ADMIN] approve placement cell:", err?.message);
    res.status(500).json({ error: err?.message || "Failed to approve" });
  }
});

router.post("/api/admin/placement-cells/:uid/reject", async (req: Request, res: Response) => {
  try {
    const admin_user = await verifyAdmin(req);
    if (!admin_user) return res.status(403).json({ error: "Forbidden" });
    if (!getFirebaseAdmin()) return res.status(500).json({ error: "Admin SDK unavailable" });

    const { uid } = req.params;
    const { reason } = req.body || {};
    const db = admin.firestore();
    const snap = await db.collection("placement_cells").doc(uid).get();
    if (!snap.exists) return res.status(404).json({ error: "Placement cell not found" });

    await db.collection("placement_cells").doc(uid).set({
      status: "rejected",
      rejected_at: admin.firestore.FieldValue.serverTimestamp(),
      rejected_by: admin_user.email || "",
      rejection_reason: (reason || "").toString().slice(0, 500),
      approved_at: admin.firestore.FieldValue.delete(),
      approved_by: admin.firestore.FieldValue.delete(),
    }, { merge: true });
    res.json({ ok: true });
  } catch (err: any) {
    console.error("[ADMIN] reject placement cell:", err?.message);
    res.status(500).json({ error: err?.message || "Failed to reject" });
  }
});

router.post("/api/placement-cell/profile", async (req: Request, res: Response) => {
  try {
    const u = await verifyUser(req);
    if (!u) return res.status(401).json({ error: "Auth required" });
    if (!getFirebaseAdmin()) return res.status(503).json({ error: "Firebase unavailable" });
    const userSnap = await admin.firestore().collection("lancing_users").doc(u.uid).get();
    if (!userSnap.exists || userSnap.data()?.role !== "placement_cell") {
      return res.status(403).json({ error: "Placement Cell role required" });
    }

    const {
      collegeName, contactName, designation, phone, officialEmail,
      website, address, logoUrl, verificationDocUrl, description,
    } = req.body || {};

    if (!collegeName || !contactName || !designation || !phone || !officialEmail) {
      return res.status(400).json({ error: "collegeName, contactName, designation, phone and officialEmail are required" });
    }

    const db = admin.firestore();
    const existing = await db.collection("placement_cells").doc(u.uid).get();
    const now = admin.firestore.FieldValue.serverTimestamp();

    await db.collection("placement_cells").doc(u.uid).set({
      collegeName: String(collegeName).trim(),
      contactName: String(contactName).trim(),
      designation: String(designation).trim(),
      phone: String(phone).trim(),
      officialEmail: String(officialEmail).trim(),
      website: website ? String(website).trim() : null,
      address: address ? String(address).trim() : null,
      description: description ? String(description).trim() : null,
      logoUrl: logoUrl || null,
      verificationDocUrl: verificationDocUrl || null,
      status: existing.exists ? (existing.data()?.status || "pending") : "pending",
      ownerUid: u.uid,
      ownerEmail: u.email || null,
      createdAt: existing.exists ? existing.data()?.createdAt : now,
      updatedAt: now,
    }, { merge: true });

    await db.collection("lancing_users").doc(u.uid).set({ profileComplete: true }, { merge: true });

    res.json({ ok: true });
  } catch (err: any) {
    console.error("[PC] profile save:", err?.message);
    res.status(500).json({ error: "Failed to save profile" });
  }
});

router.get("/api/placement-cell/profile", async (req: Request, res: Response) => {
  try {
    const u = await verifyUser(req);
    if (!u) return res.status(401).json({ error: "Auth required" });
    if (!getFirebaseAdmin()) return res.status(503).json({ error: "Firebase unavailable" });
    const userSnap = await admin.firestore().collection("lancing_users").doc(u.uid).get();
    if (!userSnap.exists || userSnap.data()?.role !== "placement_cell") {
      return res.status(403).json({ error: "Placement Cell role required" });
    }
    const snap = await admin.firestore().collection("placement_cells").doc(u.uid).get();
    res.json({ profile: snap.exists ? serialize({ id: snap.id, ...snap.data() }) : null });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to load profile" });
  }
});

// ─── PC DRIVES ───────────────────────────────────────────────────────────────
router.post("/api/placement-cell/drives", async (req: Request, res: Response) => {
  try {
    const pc = await verifyPlacementCell(req);
    if (!pc) return res.status(403).json({ error: "Placement Cell role required" });
    if (!pc.doc || pc.doc.status === "rejected") {
      return res.status(403).json({ error: "Placement Cell profile not active" });
    }

    const {
      jobTitle, companyName, jobType, location, ctc, description,
      minCGPA, min12Pct, min10Pct, maxBacklogs,
      branches, batches, deadline, jdUrl,
      hasAssessment, assessmentConfig,
    } = req.body || {};

    if (!jobTitle?.trim() || !companyName?.trim() || !jobType) {
      return res.status(400).json({ error: "jobTitle, companyName and jobType are required" });
    }

    const db = admin.firestore();
    const driveRef = db.collection("placement_drives").doc();
    const now = admin.firestore.FieldValue.serverTimestamp();

    await driveRef.set({
      source: "placement_cell",
      ownerUid: pc.uid,
      collegeName: pc.doc.collegeName || "",
      jobTitle: String(jobTitle).trim(),
      companyName: String(companyName).trim(),
      jobType: String(jobType),
      location: location ? String(location).trim() : "",
      ctc: ctc ? String(ctc).trim() : "",
      description: description ? String(description).trim() : "",
      eligibility: {
        minCGPA: Number(minCGPA) || 0,
        min12Pct: min12Pct != null && min12Pct !== "" ? Number(min12Pct) : null,
        min10Pct: min10Pct != null && min10Pct !== "" ? Number(min10Pct) : null,
        maxBacklogs: maxBacklogs != null && maxBacklogs !== "" ? Number(maxBacklogs) : null,
        branches: Array.isArray(branches) ? branches.filter(Boolean) : [],
        batches: Array.isArray(batches) ? batches.filter(Boolean) : [],
      },
      deadline: deadline || null,
      jdUrl: jdUrl || null,
      hasAssessment: !!hasAssessment,
      assessmentConfig: hasAssessment ? {
        topics: Array.isArray(assessmentConfig?.topics) ? assessmentConfig.topics : [],
        duration: Number(assessmentConfig?.duration) || 30,
        numQuestions: Number(assessmentConfig?.numQuestions) || 15,
        questions: null,
      } : null,
      status: "open",
      applicantCount: 0,
      createdAt: now,
      updatedAt: now,
    });

    invalidateCache(PUBLIC_DRIVES_CACHE_PATTERN);
    res.json({ ok: true, driveId: driveRef.id });
  } catch (err: any) {
    console.error("[PC] create drive:", err?.message);
    res.status(500).json({ error: "Failed to create drive" });
  }
});

router.get("/api/placement-cell/drives", async (req: Request, res: Response) => {
  try {
    const pc = await verifyPlacementCell(req);
    if (!pc) return res.status(403).json({ error: "Placement Cell role required" });
    const db = admin.firestore();
    const snap = await db.collection("placement_drives")
      .where("source", "==", "placement_cell")
      .where("ownerUid", "==", pc.uid)
      .get();
    const drives: any[] = [];
    snap.forEach(d => drives.push(serialize({ id: d.id, ...d.data() })));
    drives.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
    res.json({ drives });
  } catch (err: any) {
    console.error("[PC] list drives:", err?.message);
    res.status(500).json({ error: "Failed to list drives" });
  }
});

router.get("/api/placement-cell/drives/:driveId", async (req: Request, res: Response) => {
  try {
    const pc = await verifyPlacementCell(req);
    if (!pc) return res.status(403).json({ error: "Placement Cell role required" });
    const db = admin.firestore();
    const snap = await db.collection("placement_drives").doc(req.params.driveId).get();
    if (!snap.exists) return res.status(404).json({ error: "Drive not found" });
    const data = snap.data()!;
    if (data.ownerUid !== pc.uid) return res.status(403).json({ error: "Forbidden" });
    res.json({ drive: serialize({ id: snap.id, ...data }) });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to load drive" });
  }
});

router.patch("/api/placement-cell/drives/:driveId", async (req: Request, res: Response) => {
  try {
    const pc = await verifyPlacementCell(req);
    if (!pc) return res.status(403).json({ error: "Placement Cell role required" });
    const db = admin.firestore();
    const ref = db.collection("placement_drives").doc(req.params.driveId);
    const snap = await ref.get();
    if (!snap.exists) return res.status(404).json({ error: "Drive not found" });
    if (snap.data()?.ownerUid !== pc.uid) return res.status(403).json({ error: "Forbidden" });

    const allowed: any = {};
    const { status, description, deadline, ctc, location,
            jobTitle, companyName, jobType, jdUrl,
            minCGPA, min12Pct, min10Pct, maxBacklogs, branches, batches } = req.body || {};

    if (status && ["open", "closed", "deleted"].includes(status)) allowed.status = status;
    if (jobTitle !== undefined) allowed.jobTitle = String(jobTitle);
    if (companyName !== undefined) allowed.companyName = String(companyName);
    if (jobType !== undefined) allowed.jobType = String(jobType);
    if (description !== undefined) allowed.description = String(description);
    if (deadline !== undefined) allowed.deadline = deadline;
    if (ctc !== undefined) allowed.ctc = String(ctc);
    if (location !== undefined) allowed.location = String(location);
    if (jdUrl !== undefined) allowed.jdUrl = jdUrl;

    const eligibilityFields = [minCGPA, min12Pct, min10Pct, maxBacklogs, branches, batches];
    if (eligibilityFields.some(f => f !== undefined)) {
      const existing = (snap.data() as any).eligibility || {};
      const elig: any = { ...existing };
      if (minCGPA !== undefined) elig.minCGPA = parseFloat(minCGPA) || 0;
      if (min12Pct !== undefined) elig.min12Pct = min12Pct ? parseFloat(min12Pct) : null;
      if (min10Pct !== undefined) elig.min10Pct = min10Pct ? parseFloat(min10Pct) : null;
      if (maxBacklogs !== undefined) elig.maxBacklogs = (maxBacklogs !== "" && maxBacklogs !== null) ? parseInt(maxBacklogs) : null;
      if (branches !== undefined) elig.branches = branches;
      if (batches !== undefined) elig.batches = batches;
      allowed.eligibility = elig;
    }

    allowed.updatedAt = admin.firestore.FieldValue.serverTimestamp();

    await ref.set(allowed, { merge: true });
    invalidateCache(PUBLIC_DRIVES_CACHE_PATTERN);
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to update drive" });
  }
});

router.get("/api/placement-cell/drives/:driveId/applicants", async (req: Request, res: Response) => {
  try {
    const pc = await verifyPlacementCell(req);
    if (!pc) return res.status(403).json({ error: "Placement Cell role required" });
    const db = admin.firestore();
    const driveSnap = await db.collection("placement_drives").doc(req.params.driveId).get();
    if (!driveSnap.exists || driveSnap.data()?.ownerUid !== pc.uid) {
      return res.status(403).json({ error: "Forbidden" });
    }
    const appsSnap = await driveSnap.ref.collection("applications").get();
    const applicants: any[] = [];
    appsSnap.forEach(d => applicants.push(serialize({ id: d.id, ...d.data() })));
    applicants.sort((a, b) => (b.appliedAt || "").localeCompare(a.appliedAt || ""));
    res.json({ applicants });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to load applicants" });
  }
});

router.post("/api/placement-cell/drives/:driveId/applicants/:uid/status", async (req: Request, res: Response) => {
  try {
    const pc = await verifyPlacementCell(req);
    if (!pc) return res.status(403).json({ error: "Placement Cell role required" });
    const { status, note } = req.body || {};
    if (!["applied", "shortlisted", "rejected", "hired"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }
    const db = admin.firestore();
    const driveRef = db.collection("placement_drives").doc(req.params.driveId);
    const driveSnap = await driveRef.get();
    if (!driveSnap.exists || driveSnap.data()?.ownerUid !== pc.uid) {
      return res.status(403).json({ error: "Forbidden" });
    }
    await driveRef.collection("applications").doc(req.params.uid).set({
      status, note: note || null,
      reviewedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to update status" });
  }
});

// Save a "Next Steps" note that the student will see in My Applications
router.post("/api/placement-cell/drives/:driveId/applicants/:uid/next-steps", async (req: Request, res: Response) => {
  try {
    const pc = await verifyPlacementCell(req);
    if (!pc) return res.status(403).json({ error: "Placement Cell role required" });
    const { note } = req.body || {};
    if (typeof note !== "string") return res.status(400).json({ error: "note must be a string" });
    if (note.length > 2000) return res.status(400).json({ error: "note too long (max 2000 chars)" });
    const db = admin.firestore();
    const driveRef = db.collection("placement_drives").doc(req.params.driveId);
    const driveSnap = await driveRef.get();
    if (!driveSnap.exists || driveSnap.data()?.ownerUid !== pc.uid) {
      return res.status(403).json({ error: "Forbidden" });
    }
    // Verify the application document exists before merging — avoids creating stub docs
    const appRef = driveRef.collection("applications").doc(req.params.uid);
    const appSnap = await appRef.get();
    if (!appSnap.exists) {
      return res.status(404).json({ error: "Application not found" });
    }
    await appRef.set({
      nextStepsNote: note,
      nextStepsUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to save next steps note" });
  }
});

// CSV export of applicants
router.get("/api/placement-cell/drives/:driveId/applicants/export", async (req: Request, res: Response) => {
  try {
    const pc = await verifyPlacementCell(req);
    if (!pc) return res.status(403).json({ error: "Placement Cell role required" });
    const db = admin.firestore();
    const driveSnap = await db.collection("placement_drives").doc(req.params.driveId).get();
    if (!driveSnap.exists || driveSnap.data()?.ownerUid !== pc.uid) {
      return res.status(403).json({ error: "Forbidden" });
    }
    const drive = driveSnap.data()!;
    const appsSnap = await driveSnap.ref.collection("applications").get();
    const rows = [["Name", "Email", "Phone", "CGPA", "Branch", "Batch", "Status", "Applied At", "Test Score"]];
    appsSnap.forEach(d => {
      const a = d.data();
      rows.push([
        a.name || "", a.email || "", a.phone || "",
        String(a.cgpa ?? ""), a.branch || "", a.batch || "",
        a.status || "applied",
        a.appliedAt?.toDate?.()?.toISOString() || "",
        a.testScore != null ? `${a.testScore}/${a.testTotal ?? "?"}` : "",
      ]);
    });
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const fname = `applicants_${(drive.companyName || "drive").replace(/[^a-z0-9]/gi, "_")}.csv`;
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${fname}"`);
    res.send(csv);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to export" });
  }
});

// ─── ENRICHED ALL-APPLICANTS (placement cell) ────────────────────────────────
router.get("/api/placement-cell/applicants/all", async (req: Request, res: Response) => {
  try {
    const pc = await verifyPlacementCell(req);
    if (!pc) return res.status(403).json({ error: "Placement Cell role required" });
    const db = admin.firestore();

    // 1. All drives owned by this PC
    const drivesSnap = await db.collection("placement_drives")
      .where("source", "==", "placement_cell")
      .where("ownerUid", "==", pc.uid)
      .get();
    const drives: any[] = [];
    drivesSnap.forEach(d => drives.push({ id: d.id, ...d.data() }));

    if (drives.length === 0) return res.json({ drives: [], applicants: [] });

    // 2. All applications across all drives
    const rawApplicants: any[] = [];
    await Promise.all(drives.map(async (drive) => {
      const appsSnap = await db.collection("placement_drives").doc(drive.id)
        .collection("applications").get();
      appsSnap.forEach(doc => {
        rawApplicants.push({
          ...doc.data(),
          uid: doc.id,
          driveId: drive.id,
          driveTitle: drive.jobTitle,
          driveCompany: drive.companyName,
        });
      });
    }));

    // 3. Fetch fresh profile data only for uids that DON'T have a profileSnapshot
    //    (newer applications carry profileSnapshot; older ones need a fallback fetch)
    const uidsNeedingFetch = Array.from(new Set(
      rawApplicants.filter(a => !a.profileSnapshot).map(a => a.uid)
    ));
    const fallbackProfiles: Record<string, any> = {};
    await Promise.all(uidsNeedingFetch.map(async (uid) => {
      try {
        const [obSnap, uSnap] = await Promise.all([
          db.collection("career_compass_onboarding").doc(uid).get(),
          db.collection("users").doc(uid).get(),
        ]);
        const ob = obSnap.exists ? obSnap.data() : {};
        const ccp = uSnap.exists ? (uSnap.data()?.career_compass_profile || {}) : {};
        // Prefer career_compass_profile fields; supplement with onboarding doc
        fallbackProfiles[uid] = { ...ob, ...ccp, documents: ccp.documents || {} };
      } catch { /* profile not found — skip */ }
    }));

    // 4. Merge — use profileSnapshot (preferred, captured at apply time) or fallback
    const applicants = rawApplicants.map(a => {
      const profile = a.profileSnapshot || fallbackProfiles[a.uid] || null;
      const { profileSnapshot, ...rest } = a;
      return {
        ...serialize(rest),
        profile: profile ? serialize(profile) : null,
      };
    });

    const drivesSafe = drives.map(d => serialize({
      id: d.id, jobTitle: d.jobTitle, companyName: d.companyName, status: d.status,
    }));
    res.json({ drives: drivesSafe, applicants });
  } catch (err: any) {
    console.error("[PC] all-applicants:", err?.message);
    res.status(500).json({ error: "Failed to load applicants" });
  }
});

// ─── PUBLIC (FREELANCER) ENDPOINTS ───────────────────────────────────────────
router.get("/api/placement-cell/public/drives", cacheMiddleware.short, async (req: Request, res: Response) => {
  const pageSize = getPublicDrivesPageSize(req.query.limit);
  const cursorValue = req.query.cursor;
  const cursor = cursorValue === undefined ? undefined : decodePublicDrivesCursor(cursorValue);
  if (cursorValue !== undefined && !cursor) {
    return res.status(400).json({ error: "Invalid pagination cursor" });
  }

  try {
    if (!getFirebaseAdmin()) return res.json({ drives: [] });
    const db = admin.firestore();

    // Bounded query: open public drives only, newest first. This is backed by
    // the placement_drives source+status+createdAt composite index.
    let query = db.collection("placement_drives")
      .where("source", "==", "placement_cell")
      .where("status", "==", "open")
      .orderBy("createdAt", "desc")
      .orderBy(admin.firestore.FieldPath.documentId(), "desc")
      .limit(pageSize + 1);

    if (cursor) {
      query = query.startAfter(
        new admin.firestore.Timestamp(cursor.seconds, cursor.nanoseconds),
        cursor.id,
      );
    }

    const snap = await query.get();
    const pageDocs = snap.docs.slice(0, pageSize);
    const hasMore = snap.docs.length > pageSize;
    const drives = pageDocs.map(toPublicDrive);
    const nextCursor = hasMore ? encodePublicDrivesCursor(pageDocs[pageDocs.length - 1]) : null;
    res.json({ drives, nextCursor, hasMore });
  } catch (err: any) {
    console.error("[PC] public drives:", err?.message);
    // The deployed index is the normal path. Keep pagination functionally
    // correct while a newly configured index is still building.
    if (isMissingFirestoreIndex(err) && getFirebaseAdmin()) {
      try {
        const legacySnap = await admin.firestore().collection("placement_drives")
          .where("source", "==", "placement_cell")
          .get();
        const legacyDocs = legacySnap.docs
          .filter(d => d.get("status") === "open")
          .sort(comparePublicDriveDocsNewestFirst);
        const cursorIndex = cursor
          ? legacyDocs.findIndex(doc => matchesPublicDrivesCursor(doc, cursor))
          : -1;
        if (cursor && cursorIndex < 0) {
          return res.status(400).json({ error: "Invalid pagination cursor" });
        }
        const startIndex = cursor ? cursorIndex + 1 : 0;
        const pageDocs = legacyDocs.slice(startIndex, startIndex + pageSize);
        const hasMore = startIndex + pageSize < legacyDocs.length;
        const nextCursor = hasMore ? encodePublicDrivesCursor(pageDocs[pageDocs.length - 1]) : null;
        res.setHeader("X-Drive-Index", "pending");
        return res.json({ drives: pageDocs.map(toPublicDrive), nextCursor, hasMore });
      } catch (fallbackError: any) {
        console.error("[PC] public drives fallback:", fallbackError?.message);
      }
    }
    res.status(503).json({ error: "Drive listing temporarily unavailable", drives: [] });
  }
});

router.get("/api/placement-cell/public/drives/:driveId", async (req: Request, res: Response) => {
  try {
    if (!getFirebaseAdmin()) return res.status(503).json({ error: "Firebase unavailable" });
    const db = admin.firestore();
    const snap = await db.collection("placement_drives").doc(req.params.driveId).get();
    if (!snap.exists || snap.data()?.source !== "placement_cell") {
      return res.status(404).json({ error: "Drive not found" });
    }
    const data = snap.data()!;
    const { assessmentConfig, ...safe } = data;
    let alreadyApplied = false;
    const u = await verifyUser(req);
    if (u) {
      const ap = await snap.ref.collection("applications").doc(u.uid).get();
      alreadyApplied = ap.exists;
    }
    res.json({
      drive: serialize({
        id: snap.id, ...safe,
        hasAssessment: data.hasAssessment,
        assessmentDuration: data.assessmentConfig?.duration || null,
        assessmentNumQuestions: data.assessmentConfig?.numQuestions || null,
      }),
      alreadyApplied,
    });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to load drive" });
  }
});

router.post("/api/placement-cell/public/drives/:driveId/apply", async (req: Request, res: Response) => {
  try {
    const u = await verifyUser(req);
    if (!u) return res.status(401).json({ error: "Auth required" });
    if (!getFirebaseAdmin()) return res.status(503).json({ error: "Firebase unavailable" });
    const db = admin.firestore();
    const driveRef = db.collection("placement_drives").doc(req.params.driveId);
    const driveSnap = await driveRef.get();
    if (!driveSnap.exists || driveSnap.data()?.source !== "placement_cell") {
      return res.status(404).json({ error: "Drive not found" });
    }
    const drive = driveSnap.data()!;
    if (drive.status !== "open") return res.status(400).json({ error: "Drive is closed" });

    // SECURITY: derive identity & eligibility ENTIRELY from the server-side
    // career_compass_profile — never trust client-supplied cgpa/branch/batch.
    // The client body is ignored for eligibility decisions.
    let profileSnapshot: any = null;
    try {
      const userSnap = await db.collection("users").doc(u.uid).get();
      if (userSnap.exists) {
        profileSnapshot = userSnap.data()?.career_compass_profile || null;
      }
    } catch { /* fall through to incomplete-profile error below */ }

    if (!profileSnapshot) {
      return res.status(400).json({
        error: "Profile required",
        reasons: ["You need to complete your Career Compass profile before applying."],
      });
    }

    const profName  = profileSnapshot.fullName || "";
    const profEmail = profileSnapshot.email || u.email || "";
    const profPhone = profileSnapshot.phone || "";
    const profBranch = profileSnapshot.branch || profileSnapshot.degree || "";
    const profYear   = profileSnapshot.yearOfStudy || profileSnapshot.year || "";
    const profUniv   = profileSnapshot.universityName || profileSnapshot.university || "";
    const rawCgpa = profileSnapshot.currentCgpa ?? profileSnapshot.cgpa;
    const cgpaNum = rawCgpa != null && rawCgpa !== "" ? Number(rawCgpa) : null;

    // Profile completeness gate
    const missing: string[] = [];
    if (!profName) missing.push("full name");
    if (!profBranch) missing.push("branch");
    if (!profUniv) missing.push("university");
    if (cgpaNum == null || Number.isNaN(cgpaNum)) missing.push("CGPA");
    if (!profYear) missing.push("year of study");
    if (missing.length > 0) {
      return res.status(400).json({
        error: "Profile incomplete",
        reasons: [`Complete your Career Compass profile (missing: ${missing.join(", ")}).`],
      });
    }

    // Eligibility — strictly from server-side profile
    const elig = drive.eligibility || {};
    const reasons: string[] = [];

    if (elig.minCGPA && elig.minCGPA > 0 && cgpaNum! < Number(elig.minCGPA)) {
      reasons.push(`Your CGPA ${cgpaNum} is below the minimum CGPA of ${elig.minCGPA}.`);
    }

    const pct12Raw = profileSnapshot.pct12 ?? profileSnapshot.marks12;
    const pct12Num = pct12Raw != null && pct12Raw !== "" ? Number(pct12Raw) : null;
    if (elig.min12Pct != null && elig.min12Pct > 0 && pct12Num != null && !isNaN(pct12Num) && pct12Num < Number(elig.min12Pct)) {
      reasons.push(`Your 12th percentage (${pct12Num}%) is below the minimum of ${elig.min12Pct}%.`);
    }

    const pct10Raw = profileSnapshot.pct10 ?? profileSnapshot.marks10;
    const pct10Num = pct10Raw != null && pct10Raw !== "" ? Number(pct10Raw) : null;
    if (elig.min10Pct != null && elig.min10Pct > 0 && pct10Num != null && !isNaN(pct10Num) && pct10Num < Number(elig.min10Pct)) {
      reasons.push(`Your 10th percentage (${pct10Num}%) is below the minimum of ${elig.min10Pct}%.`);
    }

    if (Array.isArray(elig.branches) && elig.branches.length > 0) {
      const allowed = elig.branches.map((b: string) => String(b).toLowerCase());
      if (!allowed.includes(String(profBranch).toLowerCase())) {
        reasons.push(`Your branch (${profBranch}) is not eligible. Eligible branches: ${elig.branches.join(", ")}.`);
      }
    }
    if (Array.isArray(elig.batches) && elig.batches.length > 0) {
      const allowed = elig.batches.map((b: string) => String(b).toLowerCase());
      if (!allowed.includes(String(profYear).toLowerCase())) {
        reasons.push(`Students in ${profYear} are not eligible. Eligible: ${elig.batches.join(", ")}.`);
      }
    }
    if (reasons.length > 0) {
      return res.status(403).json({ error: "Not eligible", reasons });
    }

    const appRef = driveRef.collection("applications").doc(u.uid);
    const now = admin.firestore.FieldValue.serverTimestamp();

    // Atomic: ensure first-time application + counter increment together
    try {
      await db.runTransaction(async (tx) => {
        const existing = await tx.get(appRef);
        if (existing.exists) throw new Error("ALREADY_APPLIED");
        const appData = {
          uid: u.uid,
          name: profName,
          email: profEmail,
          phone: profPhone,
          cgpa: cgpaNum,
          branch: profBranch,
          batch: profYear,
          resumeUrl: profileSnapshot.resumeUrl || null,
          cvPdfUrl: null,
          status: "applied",
          appliedAt: now,
          driveTitle: drive.jobTitle,
          companyName: drive.companyName,
          collegeName: drive.collegeName,
          driveId: req.params.driveId,
          hasAssessment: !!drive.hasAssessment,
          testStatus: drive.hasAssessment ? "not_started" : null,
          testScore: null,
          testTotal: null,
          testPct: null,
          violations: [],
          nextStepsNote: "",
          profileSnapshot,
        };
        tx.set(appRef, appData);
        // Mirror to user doc so my-applications can query without a collectionGroup index
        const userAppRef = db.collection("users").doc(u.uid).collection("driveApplications").doc(req.params.driveId);
        tx.set(userAppRef, appData);
        tx.set(driveRef, { applicantCount: admin.firestore.FieldValue.increment(1) }, { merge: true });
      });
    } catch (e: any) {
      if (e?.message === "ALREADY_APPLIED") return res.status(409).json({ error: "Already applied" });
      throw e;
    }

    invalidateCache(PUBLIC_DRIVES_CACHE_PATTERN);
    res.json({ ok: true, requiresAssessment: !!drive.hasAssessment });
  } catch (err: any) {
    console.error("[PC] apply:", err?.message);
    res.status(500).json({ error: "Failed to apply" });
  }
});

router.get("/api/placement-cell/my-applications", async (req: Request, res: Response) => {
  try {
    const u = await verifyUser(req);
    if (!u) return res.status(401).json({ error: "Auth required" });
    if (!getFirebaseAdmin()) return res.json({ applications: [] });
    const db = admin.firestore();
    // Primary: user's own driveApplications subcollection (no index needed)
    const userAppsSnap = await db.collection("users").doc(u.uid).collection("driveApplications").get();
    const apps: any[] = [];
    userAppsSnap.forEach(d => {
      const data = d.data();
      if (data.driveTitle) {
        apps.push(serialize({ id: d.id, driveId: data.driveId || d.id, ...data }));
      }
    });
    // Fallback: collectionGroup query for old applications written before this change
    if (apps.length === 0) {
      try {
        const snap = await db.collectionGroup("applications")
          .where("uid", "==", u.uid).get();
        snap.forEach(d => {
          const data = d.data();
          if (data.driveTitle) {
            apps.push(serialize({ id: d.id, driveId: data.driveId || d.ref.parent.parent?.id, ...data }));
          }
        });
      } catch { /* collectionGroup index may not exist — silently skip */ }
    }
    apps.sort((a, b) => (b.appliedAt || "").localeCompare(a.appliedAt || ""));
    res.json({ applications: apps });
  } catch (err: any) {
    console.error("[PC] my-applications:", err?.message);
    res.json({ applications: [] });
  }
});

// ─── DRIVE ASSESSMENT (Gemini-generated MCQs + anti-cheat) ────────────────────
const QUESTION_GEN_PROMPT = `You are an exam question writer for Indian engineering placement tests.
Generate {N} multiple-choice questions covering these topics: {TOPICS}.
Return ONLY valid JSON (no markdown):
{
  "questions": [
    {
      "id": "q1",
      "topic": "<one of the topics>",
      "question": "<question text>",
      "options": ["A", "B", "C", "D"],
      "correct": 0,
      "explanation": "<1-2 sentences>"
    }
  ]
}
Rules:
- Exactly 4 options per question. "correct" is the 0-based index.
- Mix easy/medium/hard. Cover all listed topics evenly.
- Questions must be self-contained (no images, no code longer than 6 lines).
- No duplicate questions.`;

router.post("/api/placement-cell/drives/:driveId/generate-questions", async (req: Request, res: Response) => {
  let slotAcquired = false;
  let placementUid = "";
  try {
    const pc = await verifyPlacementCell(req);
    if (!pc) return res.status(403).json({ error: "Placement Cell role required" });
    placementUid = pc.uid;
    if (!getFirebaseAdmin()) return res.status(503).json({ error: "Firebase unavailable" });
    const db = admin.firestore();
    const driveRef = db.collection("placement_drives").doc(req.params.driveId);
    const snap = await driveRef.get();
    if (!snap.exists || snap.data()?.ownerUid !== pc.uid) return res.status(403).json({ error: "Forbidden" });
    const drive = snap.data()!;
    if (!drive.hasAssessment) return res.status(400).json({ error: "Drive has no assessment" });
    const cfg = drive.assessmentConfig || {};
    if (cfg.questions && Array.isArray(cfg.questions) && cfg.questions.length > 0 && !req.body?.regenerate) {
      return res.json({ ok: true, count: cfg.questions.length, cached: true });
    }
    if (!process.env.GEMINI_API_KEY) {
      return res.status(503).json({ error: "AI unavailable", detail: "GEMINI_API_KEY not set" });
    }

    const topics = Array.isArray(cfg.topics) && cfg.topics.length > 0 ? cfg.topics : ["Aptitude", "Logical Reasoning"];
    const numQ = Math.max(5, Math.min(50, Number(cfg.numQuestions) || 15));
    const prompt = QUESTION_GEN_PROMPT.replace("{N}", String(numQ)).replace("{TOPICS}", topics.join(", "));

    if (isCircuitOpen()) return res.status(503).json({ error: "AI temporarily unavailable. Please try again in a minute." });
    const gate = await aiGate(pc.uid, "default");
    if (gate) return res.status(gate.status).json(gate.body);
    slotAcquired = true;

    const client = getGemini();
    let response: any;
    try {
      response = await withAITimeout(() => client.models.generateContent({
        model: GEMINI_MODEL,
        contents: `Generate ${numQ} questions now for a placement screening for "${drive.jobTitle}" at "${drive.companyName}".`,
        config: {
          systemInstruction: prompt,
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT",
            properties: {
              questions: {
                type: "ARRAY",
                items: {
                  type: "OBJECT",
                  properties: {
                    id: { type: "STRING" },
                    topic: { type: "STRING" },
                    question: { type: "STRING" },
                    options: { type: "ARRAY", items: { type: "STRING" } },
                    correct: { type: "INTEGER" },
                    explanation: { type: "STRING" },
                  },
                  required: ["id", "topic", "question", "options", "correct", "explanation"],
                },
              },
            },
            required: ["questions"],
          },
          maxOutputTokens: 8192,
        },
      }));
      recordAISuccess();
    } catch (aiErr: any) {
      recordAIFailure();
      const isTimeout = aiErr?.message === "AI_TIMEOUT";
      return res.status(isTimeout ? 504 : 503).json({
        error: isTimeout ? "AI timed out. Please try again." : "AI unavailable",
      });
    } finally {
      if (slotAcquired) {
        releaseConcurrencySlot(pc.uid, "default");
        slotAcquired = false;
      }
    }

    let parsed: any;
    try {
      parsed = JSON.parse(String(response?.text || ""));
    } catch {
      recordAIFailure();
      const truncated = response?.candidates?.[0]?.finishReason === "MAX_TOKENS";
      return res.status(502).json({
        error: truncated ? "ai_response_incomplete" : "ai_response_invalid",
        message: truncated
          ? "Question-generation AI reached its response limit. Please retry."
          : "Question-generation AI returned an invalid response. Please retry.",
      });
    }
    if (!Array.isArray(parsed?.questions) || parsed.questions.length === 0) {
      recordAIFailure();
      return res.status(502).json({
        error: "ai_response_invalid",
        message: "Question-generation AI returned no questions. Please retry.",
      });
    }

    await driveRef.set({
      assessmentConfig: { ...cfg, questions: parsed.questions, generatedAt: admin.firestore.FieldValue.serverTimestamp() },
    }, { merge: true });

    res.json({ ok: true, count: parsed.questions.length, cached: false });
  } catch (err: any) {
    console.error("[PC] generate-questions:", err?.message);
    res.status(500).json({ error: "Failed to generate questions" });
  } finally {
    if (slotAcquired && placementUid) releaseConcurrencySlot(placementUid, "default");
  }
});

router.post("/api/placement-cell/drives/:driveId/start-test", async (req: Request, res: Response) => {
  try {
    const u = await verifyUser(req);
    if (!u) return res.status(401).json({ error: "Auth required" });
    if (!getFirebaseAdmin()) return res.status(503).json({ error: "Firebase unavailable" });
    const db = admin.firestore();
    const driveRef = db.collection("placement_drives").doc(req.params.driveId);
    const driveSnap = await driveRef.get();
    if (!driveSnap.exists || driveSnap.data()?.source !== "placement_cell") return res.status(404).json({ error: "Drive not found" });
    const drive = driveSnap.data()!;
    if (!drive.hasAssessment) return res.status(400).json({ error: "No assessment" });

    const appSnap = await driveRef.collection("applications").doc(u.uid).get();
    if (!appSnap.exists) return res.status(403).json({ error: "Apply to the drive first" });
    if (appSnap.data()?.status === "test_taken" || appSnap.data()?.testScore != null) {
      return res.status(409).json({ error: "Test already submitted" });
    }
    const attemptSnap2 = await driveRef.collection("test_attempts").doc(u.uid).get();
    if (attemptSnap2.exists) return res.status(409).json({ error: "Test already submitted" });

    const qs = drive.assessmentConfig?.questions || [];
    if (qs.length === 0) return res.status(503).json({ error: "Questions not generated yet" });

    // Strip correct answers
    const sanitized = qs.map((q: any) => ({
      id: q.id, topic: q.topic, question: q.question, options: q.options,
    }));
    res.json({
      questions: sanitized,
      duration: drive.assessmentConfig?.duration || 30,
      driveTitle: drive.jobTitle,
      companyName: drive.companyName,
    });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to start test" });
  }
});

router.post("/api/placement-cell/drives/:driveId/submit-test", async (req: Request, res: Response) => {
  try {
    const u = await verifyUser(req);
    if (!u) return res.status(401).json({ error: "Auth required" });
    if (!getFirebaseAdmin()) return res.status(503).json({ error: "Firebase unavailable" });
    const { answers, integrityFlags, durationSec } = req.body || {};
    if (!answers || typeof answers !== "object") return res.status(400).json({ error: "answers required" });

    const db = admin.firestore();
    const driveRef = db.collection("placement_drives").doc(req.params.driveId);
    const driveSnap = await driveRef.get();
    if (!driveSnap.exists) return res.status(404).json({ error: "Drive not found" });
    const drive = driveSnap.data()!;
    const qs = drive.assessmentConfig?.questions || [];
    if (qs.length === 0) return res.status(400).json({ error: "Test misconfigured" });

    const appRef = driveRef.collection("applications").doc(u.uid);
    const appSnap = await appRef.get();
    if (!appSnap.exists) return res.status(403).json({ error: "Apply first" });
    const appData = appSnap.data() || {};
    // Block resubmit even if status was reverted: presence of a test_attempt is the source of truth
    const attemptSnap = await driveRef.collection("test_attempts").doc(u.uid).get();
    if (attemptSnap.exists || appData.testScore != null || appData.status === "test_taken") {
      return res.status(409).json({ error: "Test already submitted" });
    }

    let correct = 0;
    const breakdown: any[] = [];
    for (const q of qs) {
      const given = answers[q.id];
      const isCorrect = Number(given) === Number(q.correct);
      if (isCorrect) correct++;
      breakdown.push({ id: q.id, topic: q.topic, given, correct: q.correct, isCorrect });
    }
    const total = qs.length;
    const score = correct;
    const pct = Math.round((correct / total) * 100);
    const now = admin.firestore.FieldValue.serverTimestamp();

    const allowedSecs = (drive.assessmentConfig?.duration || 0) * 60;
    const speedThreshold = allowedSecs * 0.2;
    const durNum = Number(durationSec) || null;
    const finalFlags: string[] = Array.isArray(integrityFlags) ? [...integrityFlags] : [];
    if (durNum !== null && allowedSecs > 0 && durNum < speedThreshold) {
      finalFlags.push(`speed_anomaly:${durNum}s<${Math.round(speedThreshold)}s`);
    }

    await driveRef.collection("test_attempts").doc(u.uid).set({
      uid: u.uid, score, total, pct,
      durationSec: durNum,
      integrityFlags: finalFlags,
      breakdown,
      submittedAt: now,
    });

    await appRef.set({
      status: "test_taken",
      testScore: score, testTotal: total, testPct: pct,
      testStatus: "completed",
      testFlags: finalFlags,
      violations: finalFlags,
      testSubmittedAt: now,
    }, { merge: true });

    res.json({ ok: true, score, total, pct });
  } catch (err: any) {
    console.error("[PC] submit-test:", err?.message);
    res.status(500).json({ error: "Failed to submit test" });
  }
});

// XLSX-friendly JSON export of all test results (client converts to xlsx)
router.get("/api/placement-cell/drives/:driveId/test-results", async (req: Request, res: Response) => {
  try {
    const pc = await verifyPlacementCell(req);
    if (!pc) return res.status(403).json({ error: "Placement Cell role required" });
    const db = admin.firestore();
    const driveRef = db.collection("placement_drives").doc(req.params.driveId);
    const driveSnap = await driveRef.get();
    if (!driveSnap.exists || driveSnap.data()?.ownerUid !== pc.uid) return res.status(403).json({ error: "Forbidden" });
    const drive = driveSnap.data()!;
    const appsSnap = await driveRef.collection("applications").get();
    const results: any[] = [];
    for (const d of appsSnap.docs) {
      const a = d.data();
      if (a.testScore == null) continue;
      results.push({
        name: a.name, email: a.email, branch: a.branch || "", batch: a.batch || "",
        cgpa: a.cgpa ?? "",
        score: a.testScore, total: a.testTotal, pct: a.testPct,
        flags: (a.testFlags || []).join("; "),
        submittedAt: serialize(a.testSubmittedAt) || "",
        status: a.status,
      });
    }
    res.json({
      driveTitle: drive.jobTitle, companyName: drive.companyName,
      results,
    });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to load results" });
  }
});

// ─── MANUAL QUESTION MANAGEMENT ──────────────────────────────────────────────

router.post("/api/placement-cell/drives/:driveId/questions", async (req: Request, res: Response) => {
  try {
    const pc = await verifyPlacementCell(req);
    if (!pc) return res.status(403).json({ error: "Placement Cell role required" });
    if (!getFirebaseAdmin()) return res.status(503).json({ error: "Firebase unavailable" });
    const { question, options, correct, topic } = req.body || {};
    if (!question || !Array.isArray(options) || options.length !== 4) {
      return res.status(400).json({ error: "question and 4 options required" });
    }
    const db = admin.firestore();
    const driveRef = db.collection("placement_drives").doc(req.params.driveId);
    const snap = await driveRef.get();
    if (!snap.exists || snap.data()?.ownerUid !== pc.uid) return res.status(403).json({ error: "Forbidden" });
    const drive = snap.data()!;
    const cfg = drive.assessmentConfig || {};
    const existing: any[] = Array.isArray(cfg.questions) ? cfg.questions : [];
    const newQ = {
      id: `manual_${Date.now()}`,
      question: String(question).trim(),
      options: options.map((o: any) => String(o).trim()),
      correct: Number(correct),
      topic: topic ? String(topic).trim() : "General",
    };
    await driveRef.set({ assessmentConfig: { ...cfg, questions: [...existing, newQ] } }, { merge: true });
    res.json({ ok: true, count: existing.length + 1 });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to add question" });
  }
});

router.delete("/api/placement-cell/drives/:driveId/questions/:qId", async (req: Request, res: Response) => {
  try {
    const pc = await verifyPlacementCell(req);
    if (!pc) return res.status(403).json({ error: "Placement Cell role required" });
    if (!getFirebaseAdmin()) return res.status(503).json({ error: "Firebase unavailable" });
    const db = admin.firestore();
    const driveRef = db.collection("placement_drives").doc(req.params.driveId);
    const snap = await driveRef.get();
    if (!snap.exists || snap.data()?.ownerUid !== pc.uid) return res.status(403).json({ error: "Forbidden" });
    const drive = snap.data()!;
    const cfg = drive.assessmentConfig || {};
    const existing: any[] = Array.isArray(cfg.questions) ? cfg.questions : [];
    const { qId } = req.params;
    const updated = existing.filter((q: any, idx: number) => q.id !== qId && String(idx) !== qId);
    await driveRef.set({ assessmentConfig: { ...cfg, questions: updated } }, { merge: true });
    res.json({ ok: true, count: updated.length });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to remove question" });
  }
});

export default router;
