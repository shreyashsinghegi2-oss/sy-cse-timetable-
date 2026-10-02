import { Router, Request, Response } from "express";
import { getFirebaseAdmin } from "../firebase-admin";
import { verifyJWT } from "./firebase-auth";
import { v4 as uuidv4 } from "uuid";
import crypto from "crypto";
import { NAT_CONF_ADMIN_EMAILS } from "../config/constants";

function buildCSV(rows: Record<string, any>[]): Buffer {
  if (rows.length === 0) return Buffer.from("", "utf-8");
  const headers = Object.keys(rows[0]);
  const escape = (v: any) => {
    let s = String(v ?? "");
    // Neutralize spreadsheet formula injection (=, +, -, @, tab, CR prefixes)
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
    return `"${s.replace(/"/g, '""')}"`;
  };
  const lines = [headers.map(escape).join(","), ...rows.map(r => headers.map(k => escape(r[k])).join(","))];
  return Buffer.from(lines.join("\r\n"), "utf-8");
}

const router = Router();

const CONF_ADMINS = NAT_CONF_ADMIN_EMAILS;
const COLLECTION = "conference_attendance";
const AUDIT_COLLECTION = "conf_audit_logs";
const QR_SECRET = process.env.CONF_QR_SECRET!;
const QR_TTL_MS = 45_000; // 45 seconds — covers 25s refresh + scanner latency buffer

export const SESSIONS = [
  { id: 1, name: "Day 1 – Session 1", day: 1, label: "Inauguration & Keynote Address",    start: new Date("2026-03-30T09:00:00+05:30"), end: new Date("2026-03-30T10:30:00+05:30") },
  { id: 2, name: "Day 1 – Session 2", day: 1, label: "Technical Presentations – Part I",  start: new Date("2026-03-30T11:00:00+05:30"), end: new Date("2026-03-30T13:00:00+05:30") },
  { id: 3, name: "Day 1 – Session 3", day: 1, label: "Technical Presentations – Part II", start: new Date("2026-03-30T14:00:00+05:30"), end: new Date("2026-03-30T16:30:00+05:30") },
  { id: 4, name: "Day 2 – Session 4", day: 2, label: "Advanced Research Papers",          start: new Date("2026-03-31T09:30:00+05:30"), end: new Date("2026-03-31T13:00:00+05:30") },
  { id: 5, name: "Day 2 – Session 5", day: 2, label: "Closing Ceremony & Awards",         start: new Date("2026-03-31T14:00:00+05:30"), end: new Date("2026-03-31T17:00:00+05:30") },
];

function signQr(payload: object): string {
  return crypto.createHmac("sha256", QR_SECRET).update(JSON.stringify(payload)).digest("hex");
}
function verifyQr(payload: object, sig: string): boolean {
  try {
    const expected = crypto.createHmac("sha256", QR_SECRET).update(JSON.stringify(payload)).digest("hex");
    return crypto.timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(sig, "hex"));
  } catch { return false; }
}

function getInitialSessions(): Record<string, { status: string; checkinTime: string | null }> {
  const s: Record<string, { status: string; checkinTime: string | null }> = {};
  SESSIONS.forEach(sess => { s[String(sess.id)] = { status: "available", checkinTime: null }; });
  return s;
}

function requireConfAdmin(req: Request, res: Response): string | null {
  const email = ((req as any).jwtUser?.email || "").toLowerCase();
  if (!email || !CONF_ADMINS.includes(email)) {
    res.status(403).json({ error: "Admin access required" });
    return null;
  }
  return email;
}

async function writeAuditLog(db: FirebaseFirestore.Firestore, action: {
  actionType: "DELETE_USER" | "RESTORE_USER";
  userId: string; adminId: string; reason?: string; meta?: Record<string, any>;
}) {
  try { await db.collection(AUDIT_COLLECTION).add({ ...action, timestamp: new Date().toISOString() }); }
  catch (err) { console.error("[conf/audit]", err); }
}

const PROFILE_COLLECTION = "ncadt_users";

/** Compute profile completion % out of 12 possible fields */
function calcProfileCompletion(d: Record<string, any>): number {
  const fields = [d.name, d.email, d.phone, d.urn, d.college, d.department, d.degree, d.year,
    d.bio, d.profilePhoto, (d.skills || []).length > 0 ? "x" : "", (d.interests || []).length > 0 ? "x" : ""];
  return Math.round((fields.filter(Boolean).length / fields.length) * 100);
}

/** Create or update ncadt_users profile (non-critical — errors are swallowed) */
async function upsertNcadtProfile(db: FirebaseFirestore.Firestore, data: {
  urn: string; name: string; email: string; phone: string;
  college: string; department: string; degree: string; year: string;
  registrationId: string;
}) {
  try {
    const profileRef = db.collection(PROFILE_COLLECTION).doc(data.urn);
    const snap = await profileRef.get();
    const now = new Date().toISOString();

    if (!snap.exists) {
      const doc: Record<string, any> = {
        name: data.name, email: data.email || "", phone: data.phone,
        urn: data.urn, college: data.college, department: data.department,
        degree: data.degree, year: data.year,
        profilePhoto: "", bio: "", skills: [], interests: [], stream: "",
        profileStatus: "incomplete", createdFrom: "ncadt",
        registrationId: data.registrationId, createdAt: now, updatedAt: now,
      };
      doc.profileCompletion = calcProfileCompletion(doc);
      await profileRef.set(doc);
      console.log(`[ncadt/profile] CREATED profile for urn=${data.urn}`);
    } else {
      const updates: Record<string, any> = {
        name: data.name, phone: data.phone, college: data.college,
        department: data.department, degree: data.degree, year: data.year,
        updatedAt: now,
      };
      if (data.email) updates.email = data.email;
      const merged = { ...snap.data(), ...updates };
      updates.profileCompletion = calcProfileCompletion(merged);
      updates.profileStatus = updates.profileCompletion >= 100 ? "complete" : "incomplete";
      await profileRef.update(updates);
      console.log(`[ncadt/profile] UPDATED profile for urn=${data.urn}`);
    }
  } catch (err) {
    console.warn("[ncadt/profile] upsert failed (non-critical):", err);
  }
}

/* ── POST /api/conf/register ─────────────────────────────────────── */
router.post("/api/conf/register", async (req: Request, res: Response) => {
  try {
    const firebaseApp = getFirebaseAdmin();
    if (!firebaseApp) return res.status(503).json({ error: "Firebase not configured" });
    const db = firebaseApp.firestore();

    const { name, college, department, degree, year, urn, phone, email } = req.body;
    if (!name || !college || !department || !degree || !year || !urn || !phone)
      return res.status(400).json({ error: "All fields are required" });
    const degreeClean = degree.trim();
    if (degreeClean.length < 2 || degreeClean.length > 50)
      return res.status(400).json({ error: "Degree must be 2–50 characters" });

    const urnClean = urn.trim().toUpperCase();
    const emailClean = String(email || "").trim().toLowerCase();
    const existing = await db.collection(COLLECTION).where("urn", "==", urnClean).get();

    if (!existing.empty) {
      const docRef = existing.docs[0].ref;
      const d = existing.docs[0].data();
      if (d.isDeleted) {
        // Restore the deleted registration with fresh details
        await docRef.update({
          name: name.trim(), college: college.trim(), department: department.trim(),
          degree: degreeClean, year: String(year), phone: phone.trim(),
          ...(emailClean ? { email: emailClean } : {}),
          isDeleted: false, deletedAt: null, deletedBy: null, deleteReason: null,
          activeQr: null, activeQrs: {},
        });
        const restored = (await docRef.get()).data()!;
        console.log(`[conf/register] RESTORED deleted user urn=${urnClean}`);
        // Also restore/update the profile
        await upsertNcadtProfile(db, {
          urn: urnClean, name: name.trim(), email: emailClean, phone: phone.trim(),
          college: college.trim(), department: department.trim(), degree: degreeClean,
          year: String(year), registrationId: docRef.id,
        });
        return res.status(200).json({
          existing: true, restored: true,
          userId: docRef.id, urn: restored.urn, name: restored.name,
          sessions: restored.sessions || getInitialSessions(), totalAttended: restored.totalAttended || 0,
        });
      }
      // Existing, not deleted — upsert profile to keep it fresh
      await upsertNcadtProfile(db, {
        urn: d.urn, name: d.name, email: emailClean || d.email || "", phone: d.phone,
        college: d.college, department: d.department, degree: d.degree,
        year: d.year, registrationId: existing.docs[0].id,
      });
      return res.status(200).json({
        existing: true, userId: existing.docs[0].id, urn: d.urn, name: d.name,
        sessions: d.sessions || getInitialSessions(), totalAttended: d.totalAttended || 0,
      });
    }

    const docRef = db.collection(COLLECTION).doc();
    const doc = {
      id: docRef.id, name: name.trim(), college: college.trim(), department: department.trim(),
      degree: degreeClean, year: String(year), urn: urnClean, phone: phone.trim(),
      email: emailClean || "",
      sessions: getInitialSessions(), activeQr: null, activeQrs: {},
      totalAttended: 0, createdAt: new Date().toISOString(),
      isDeleted: false, deletedAt: null, deletedBy: null, deleteReason: null,
    };
    await docRef.set(doc);
    // Auto-create partial profile
    await upsertNcadtProfile(db, {
      urn: urnClean, name: doc.name, email: emailClean, phone: doc.phone,
      college: doc.college, department: doc.department, degree: doc.degree,
      year: doc.year, registrationId: docRef.id,
    });
    return res.status(201).json({ userId: docRef.id, urn: urnClean, name: doc.name, sessions: doc.sessions, totalAttended: 0 });
  } catch (err) {
    console.error("[conf/register]", err);
    return res.status(500).json({ error: "Registration failed" });
  }
});

/* ── POST /api/conf/status ──────────────────────────────────────── */
router.post("/api/conf/status", async (req: Request, res: Response) => {
  try {
    const firebaseApp = getFirebaseAdmin();
    if (!firebaseApp) return res.status(503).json({ error: "Firebase not configured" });
    const db = firebaseApp.firestore();

    const { userId, urn } = req.body;
    if (!userId || !urn) return res.status(400).json({ error: "userId and urn required" });

    const docSnap = await db.collection(COLLECTION).doc(String(userId)).get();
    if (!docSnap.exists) return res.status(404).json({ error: "Not found" });
    const d = docSnap.data()!;
    if (d.urn !== urn.trim().toUpperCase()) return res.status(403).json({ error: "URN mismatch" });
    if (d.isDeleted) return res.status(403).json({ error: "Registration has been removed. Contact organizers." });

    return res.json({
      userId: docSnap.id, name: d.name, urn: d.urn,
      sessions: d.sessions || getInitialSessions(), totalAttended: d.totalAttended || 0,
    });
  } catch (err) {
    console.error("[conf/status]", err);
    return res.status(500).json({ error: "Status check failed" });
  }
});

/* ── POST /api/conf/generate-qr ─────────────────────────────────── */
// Generates QR for any session (time window enforced at SCAN time, not here).
// Frontend shows all 5 session cards; backend validates session time during check-in.
router.post("/api/conf/generate-qr", async (req: Request, res: Response) => {
  try {
    const firebaseApp = getFirebaseAdmin();
    if (!firebaseApp) return res.status(503).json({ error: "Firebase not configured" });
    const db = firebaseApp.firestore();

    const { userId, urn, sessionId } = req.body;
    if (!userId || !urn || !sessionId) return res.status(400).json({ error: "userId, urn, sessionId required" });

    const sid = Number(sessionId);
    const sessInfo = SESSIONS.find(s => s.id === sid);
    if (!sessInfo) return res.status(400).json({ error: "Invalid sessionId" });

    const docSnap = await db.collection(COLLECTION).doc(String(userId)).get();
    if (!docSnap.exists) return res.status(404).json({ error: "User not found" });
    const d = docSnap.data()!;
    if (d.urn !== urn.trim().toUpperCase()) return res.status(403).json({ error: "Unauthorized" });
    if (d.isDeleted) return res.status(403).json({ error: "Registration removed. Contact organizers." });

    const sessions = d.sessions || getInitialSessions();
    const sessKey = String(sid);

    // Do not generate QR if user already attended this session
    if (sessions[sessKey]?.status === "attended") {
      return res.status(409).json({
        error: "already_attended",
        message: `You already attended ${sessInfo.name}.`,
        sessionId: sid, checkinTime: sessions[sessKey].checkinTime,
      });
    }

    // Generate QR for this session regardless of current time
    // Time window is enforced at check-in (scan time), not at QR generation
    const nonce = uuidv4();
    const issuedAt = new Date().toISOString();
    const expiresAt = new Date(Date.now() + QR_TTL_MS).toISOString();
    const payload = { uid: userId, sid, nonce, iat: issuedAt, exp: expiresAt };
    const sig = signQr(payload);
    const token = Buffer.from(JSON.stringify({ ...payload, sig })).toString("base64url");

    // Store nonce per session (activeQrs map) so multiple sessions can be active simultaneously
    await docSnap.ref.update({ [`activeQrs.${sessKey}`]: { nonce, expiresAt } });

    console.log(`[conf/generate-qr] user=${userId} urn=${d.urn} session=${sid} nonce=${nonce.slice(0, 8)}…`);

    return res.json({
      token, sessionId: sid, sessionName: sessInfo.name, sessionLabel: sessInfo.label,
      expiresAt, ttlMs: QR_TTL_MS,
    });
  } catch (err) {
    console.error("[conf/generate-qr]", err);
    return res.status(500).json({ error: "QR generation failed" });
  }
});

/* ── POST /api/conf/checkin ─────────────────────────────────────── */
router.post("/api/conf/checkin", verifyJWT, async (req: Request, res: Response) => {
  try {
    if (!requireConfAdmin(req, res)) return;
    const firebaseApp = getFirebaseAdmin();
    if (!firebaseApp) return res.status(503).json({ error: "Firebase not configured" });
    const db = firebaseApp.firestore();

    const { token } = req.body;
    if (!token) return res.status(400).json({ error: "Token required" });

    let tokenData: any;
    try { tokenData = JSON.parse(Buffer.from(token, "base64url").toString()); }
    catch { return res.status(400).json({ error: "Invalid QR format — cannot decode" }); }

    const { uid, sid, nonce, iat, exp, sig } = tokenData;
    if (!uid || !sid || !nonce || !exp || !sig) return res.status(400).json({ error: "Malformed QR payload" });

    // 1. Check QR expiry
    if (new Date(exp) < new Date()) {
      return res.status(410).json({ error: "QR has expired — ask the student to show a fresh QR." });
    }

    // 2. Verify HMAC signature
    const payload = { uid, sid, nonce, iat, exp };
    if (!verifyQr(payload, sig)) {
      return res.status(401).json({ error: "QR signature invalid — possible tampering detected." });
    }

    const docSnap = await db.collection(COLLECTION).doc(String(uid)).get();
    if (!docSnap.exists) return res.status(404).json({ error: "User not found in database" });
    const d = docSnap.data()!;

    // 3. Reject deleted users
    if (d.isDeleted) return res.status(403).json({ error: "User registration has been removed. Cannot check in." });

    // 4. Resolve session info (no time window enforcement — QRs valid at any time)
    const sessInfo = SESSIONS.find(s => s.id === Number(sid));
    if (!sessInfo) return res.status(400).json({ error: "Invalid session in QR token" });

    // 5. Check nonce freshness (prevents screenshot reuse after QR refresh)
    const sessKey = String(sid);
    const activeQrForSess = d.activeQrs?.[sessKey] || (d.activeQr?.sessionId === Number(sid) ? d.activeQr : null);
    if (!activeQrForSess || activeQrForSess.nonce !== nonce) {
      return res.status(409).json({ error: "QR is outdated — student must show their latest QR." });
    }

    const sessions = d.sessions || {};

    // 6. Check if already attended
    if (sessions[sessKey]?.status === "attended") {
      console.log(`[conf/checkin] ALREADY_ATTENDED user=${uid} session=${sid} urn=${d.urn}`);
      return res.status(200).json({
        alreadyAttended: true, name: d.name, urn: d.urn,
        sessionId: sid, sessionName: sessInfo.name, checkinTime: sessions[sessKey].checkinTime,
      });
    }

    // 7. Mark attendance
    const checkinTime = new Date().toISOString();
    const updatedSessions = { ...sessions, [sessKey]: { status: "attended", checkinTime } };
    const totalAttended = Object.values(updatedSessions).filter((s: any) => s.status === "attended").length;

    // Clear nonce for this session
    await docSnap.ref.update({
      sessions: updatedSessions,
      [`activeQrs.${sessKey}`]: null,
      activeQr: null,
      totalAttended,
    });

    console.log(`[conf/checkin] SUCCESS user=${uid} session=${sid} urn=${d.urn} total=${totalAttended}`);

    return res.json({
      success: true, name: d.name, urn: d.urn,
      college: d.college, department: d.department, degree: d.degree, year: d.year, phone: d.phone,
      sessionId: sid, sessionName: sessInfo.name, sessionLabel: sessInfo.label,
      checkinTime, totalAttended,
    });
  } catch (err) {
    console.error("[conf/checkin]", err);
    return res.status(500).json({ error: "Check-in failed" });
  }
});

/* ── GET /api/conf/registrations ────────────────────────────────── */
router.get("/api/conf/registrations", verifyJWT, async (req: Request, res: Response) => {
  try {
    if (!requireConfAdmin(req, res)) return;
    const firebaseApp = getFirebaseAdmin();
    if (!firebaseApp) return res.status(503).json({ error: "Firebase not configured" });
    const db = firebaseApp.firestore();

    const snap = await db.collection(COLLECTION).orderBy("createdAt", "desc").get();
    const data = snap.docs.map(doc => {
      const r = doc.data();
      return {
        id: r.id || doc.id, name: r.name, college: r.college, department: r.department,
        degree: r.degree, year: r.year, urn: r.urn, phone: r.phone,
        sessions: r.sessions || {}, totalAttended: r.totalAttended || 0, createdAt: r.createdAt,
        isDeleted: r.isDeleted || false, deletedAt: r.deletedAt || null,
        deletedBy: r.deletedBy || null, deleteReason: r.deleteReason || null,
      };
    });
    return res.json({ data, sessions: SESSIONS.map(s => ({ id: s.id, name: s.name, label: s.label })) });
  } catch (err) {
    console.error("[conf/registrations]", err);
    return res.status(500).json({ error: "Failed to fetch registrations" });
  }
});

/* ── POST /api/conf/delete-user ─────────────────────────────────── */
router.post("/api/conf/delete-user", verifyJWT, async (req: Request, res: Response) => {
  try {
    const adminEmail = requireConfAdmin(req, res);
    if (!adminEmail) return;
    const firebaseApp = getFirebaseAdmin();
    if (!firebaseApp) return res.status(503).json({ error: "Firebase not configured" });
    const db = firebaseApp.firestore();

    const { userId, reason } = req.body;
    if (!userId) return res.status(400).json({ error: "userId required" });

    const docRef = db.collection(COLLECTION).doc(String(userId));
    const docSnap = await docRef.get();
    if (!docSnap.exists) return res.status(404).json({ error: "User not found" });
    const d = docSnap.data()!;
    if (d.isDeleted) return res.status(409).json({ error: "User is already deleted" });

    const deletedAt = new Date().toISOString();
    await docRef.update({ isDeleted: true, deletedAt, deletedBy: adminEmail, deleteReason: reason?.trim() || null, activeQr: null, activeQrs: {} });
    await writeAuditLog(db, { actionType: "DELETE_USER", userId, adminId: adminEmail, reason: reason?.trim() || undefined, meta: { urn: d.urn, name: d.name, totalAttended: d.totalAttended || 0 } });
    console.log(`[conf/delete-user] DELETED user=${userId} urn=${d.urn} by=${adminEmail}`);

    return res.json({ success: true, deletedAt, message: `${d.name} has been soft-deleted.` });
  } catch (err) {
    console.error("[conf/delete-user]", err);
    return res.status(500).json({ error: "Delete failed" });
  }
});

/* ── POST /api/conf/restore-user ────────────────────────────────── */
router.post("/api/conf/restore-user", verifyJWT, async (req: Request, res: Response) => {
  try {
    const adminEmail = requireConfAdmin(req, res);
    if (!adminEmail) return;
    const firebaseApp = getFirebaseAdmin();
    if (!firebaseApp) return res.status(503).json({ error: "Firebase not configured" });
    const db = firebaseApp.firestore();

    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: "userId required" });

    const docRef = db.collection(COLLECTION).doc(String(userId));
    const docSnap = await docRef.get();
    if (!docSnap.exists) return res.status(404).json({ error: "User not found" });
    const d = docSnap.data()!;
    if (!d.isDeleted) return res.status(409).json({ error: "User is not deleted — nothing to restore" });

    await docRef.update({ isDeleted: false, deletedAt: null, deletedBy: null, deleteReason: null });
    await writeAuditLog(db, { actionType: "RESTORE_USER", userId, adminId: adminEmail, meta: { urn: d.urn, name: d.name } });
    console.log(`[conf/restore-user] RESTORED user=${userId} urn=${d.urn} by=${adminEmail}`);

    return res.json({ success: true, message: `${d.name} has been restored.` });
  } catch (err) {
    console.error("[conf/restore-user]", err);
    return res.status(500).json({ error: "Restore failed" });
  }
});

/* ── GET /api/conf/export ──────────────────────────────────────── */
router.get("/api/conf/export", verifyJWT, async (req: Request, res: Response) => {
  try {
    if (!requireConfAdmin(req, res)) return;
    const firebaseApp = getFirebaseAdmin();
    if (!firebaseApp) return res.status(503).json({ error: "Firebase not configured" });
    const db = firebaseApp.firestore();

    const includeDeleted = req.query.includeDeleted === "true";
    const snap = await db.collection(COLLECTION).orderBy("createdAt", "desc").get();
    const rows = snap.docs.map(doc => doc.data()).filter(r => includeDeleted || !r.isDeleted).map(r => {
      const s = r.sessions || {};
      const row: Record<string, any> = {
        "Full Name": r.name, "Phone Number": r.phone, "URN": r.urn,
        "Degree": r.degree, "Year": r.year, "College": r.college, "Department": r.department,
      };
      SESSIONS.forEach(sess => {
        const sd = s[String(sess.id)];
        row[sess.name] = sd?.status === "attended" ? `Present (${new Date(sd.checkinTime).toLocaleTimeString("en-IN")})` : "Absent";
      });
      row["Total Sessions Attended"] = r.totalAttended || 0;
      if (includeDeleted) {
        row["Status"] = r.isDeleted ? "Deleted" : "Active";
        row["Deleted At"] = r.deletedAt || "";
        row["Delete Reason"] = r.deleteReason || "";
      }
      return row;
    });

    const buf = buildCSV(rows);
    const filename = includeDeleted ? "NCADT2026_Attendance_All.csv" : "NCADT2026_Attendance.csv";
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    return res.send(buf);
  } catch (err) {
    console.error("[conf/export]", err);
    return res.status(500).json({ error: "Export failed" });
  }
});

/* ── POST /api/conf/sync-collab-profiles ──────────────────────────── */
// Syncs all active NCADT registrants into the main studentProfiles collection
// so they appear in the Student Collab admin dashboard.
router.post("/api/conf/sync-collab-profiles", verifyJWT, async (req: Request, res: Response) => {
  try {
    if (!requireConfAdmin(req, res)) return;
    const firebaseApp = getFirebaseAdmin();
    if (!firebaseApp) return res.status(503).json({ error: "Firebase not configured" });
    const db = firebaseApp.firestore();

    const snap = await db.collection(COLLECTION).where("isDeleted", "==", false).get();
    let created = 0, skipped = 0, emailLinked = 0;

    for (const doc of snap.docs) {
      const d = doc.data();
      if (!d.urn || !d.name) { skipped++; continue; }

      const urn = String(d.urn).trim().toUpperCase();
      const uid = `ncadt_${urn}`;

      // Skip if profile already exists for this NCADT uid
      const existingRef = db.collection("studentProfiles").doc(uid);
      const existing = await existingRef.get();
      if (existing.exists) { skipped++; continue; }

      // Skip if a profile with the same email already exists (user already in Collab)
      const emailStr = (d.email || "").toLowerCase().trim();
      if (emailStr) {
        const emailQ = await db.collection("studentProfiles")
          .where("email", "==", emailStr).limit(1).get();
        if (!emailQ.empty) { emailLinked++; skipped++; continue; }
      }

      // Build a unique username
      const base = (d.name || "").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 15);
      const suffix = Math.floor(Math.random() * 8999 + 1000).toString();
      const username = base ? `${base}${suffix}` : `ncadt${urn.replace(/[^a-z0-9]/gi, "")}`;

      const course = [d.degree, d.year ? `Year ${d.year}` : ""].filter(Boolean).join(" - ");

      const profile: Record<string, any> = {
        uid,
        role: "Student",
        name: d.name || "",
        username,
        email: emailStr,
        phone: d.phone || "",
        college: d.college || "",
        career: d.department || d.college || "",
        currentCourse: course,
        bio: "",
        skills: [],
        interests: [],
        avatarUrl: "",
        primaryStream: null,
        subStreams: [],
        openToCrossStreamCollab: false,
        preferredCollabTypes: [],
        isAvailableForCollab: false,
        createdFrom: "ncadt",
        urn,
        registrationId: doc.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await existingRef.set(profile);
      created++;
    }

    console.log(`[conf/sync-collab] created=${created} skipped=${skipped} emailLinked=${emailLinked} total=${snap.size}`);
    return res.json({ success: true, created, skipped, emailLinked, total: snap.size });
  } catch (err) {
    console.error("[conf/sync-collab-profiles]", err);
    return res.status(500).json({ error: "Sync failed" });
  }
});

/* ── POST /api/conf/backfill-profiles ───────────────────────────── */
// One-shot admin endpoint: creates ncadt_users profiles for all existing registrants
router.post("/api/conf/backfill-profiles", verifyJWT, async (req: Request, res: Response) => {
  try {
    if (!requireConfAdmin(req, res)) return;
    const firebaseApp = getFirebaseAdmin();
    if (!firebaseApp) return res.status(503).json({ error: "Firebase not configured" });
    const db = firebaseApp.firestore();

    const snap = await db.collection(COLLECTION).get();
    let created = 0, updated = 0, skipped = 0;

    await Promise.all(snap.docs.map(async (doc) => {
      const d = doc.data();
      if (!d.urn) { skipped++; return; }
      const profileRef = db.collection(PROFILE_COLLECTION).doc(String(d.urn).trim().toUpperCase());
      const profileSnap = await profileRef.get();
      const now = new Date().toISOString();
      const urn = String(d.urn).trim().toUpperCase();

      if (!profileSnap.exists) {
        const profile: Record<string, any> = {
          name: d.name || "", email: d.email || "", phone: d.phone || "",
          urn, college: d.college || "", department: d.department || "",
          degree: d.degree || "", year: d.year || "",
          profilePhoto: "", bio: "", skills: [], interests: [], stream: "",
          profileStatus: "incomplete", createdFrom: "ncadt",
          registrationId: doc.id, createdAt: d.createdAt || now, updatedAt: now,
        };
        profile.profileCompletion = calcProfileCompletion(profile);
        await profileRef.set(profile);
        created++;
      } else {
        // Only update core fields, preserve any profile enrichment user may have done
        const existing = profileSnap.data()!;
        const updates: Record<string, any> = {
          name: d.name || existing.name,
          phone: d.phone || existing.phone,
          college: d.college || existing.college,
          department: d.department || existing.department,
          degree: d.degree || existing.degree,
          year: d.year || existing.year,
          updatedAt: now,
        };
        if (d.email && !existing.email) updates.email = d.email;
        const merged = { ...existing, ...updates };
        updates.profileCompletion = calcProfileCompletion(merged);
        updates.profileStatus = updates.profileCompletion >= 100 ? "complete" : "incomplete";
        await profileRef.update(updates);
        updated++;
      }
    }));

    console.log(`[conf/backfill] created=${created} updated=${updated} skipped=${skipped}`);
    return res.json({ success: true, created, updated, skipped, total: snap.size });
  } catch (err) {
    console.error("[conf/backfill]", err);
    return res.status(500).json({ error: "Backfill failed" });
  }
});

/* ── GET /api/conf/profile/:urn ─────────────────────────────────── */
router.get("/api/conf/profile/:urn", async (req: Request, res: Response) => {
  try {
    const firebaseApp = getFirebaseAdmin();
    if (!firebaseApp) return res.status(503).json({ error: "Firebase not configured" });
    const db = firebaseApp.firestore();

    const urn = String(req.params.urn).trim().toUpperCase();
    const snap = await db.collection(PROFILE_COLLECTION).doc(urn).get();
    if (!snap.exists) return res.status(404).json({ error: "Profile not found" });
    return res.json({ id: snap.id, ...snap.data() });
  } catch (err) {
    console.error("[conf/profile get]", err);
    return res.status(500).json({ error: "Failed to fetch profile" });
  }
});

/* ── PATCH /api/conf/profile/:urn ───────────────────────────────── */
router.patch("/api/conf/profile/:urn", async (req: Request, res: Response) => {
  try {
    const firebaseApp = getFirebaseAdmin();
    if (!firebaseApp) return res.status(503).json({ error: "Firebase not configured" });
    const db = firebaseApp.firestore();

    const urn = String(req.params.urn).trim().toUpperCase();
    const profileRef = db.collection(PROFILE_COLLECTION).doc(urn);
    const snap = await profileRef.get();
    if (!snap.exists) return res.status(404).json({ error: "Profile not found" });

    const { bio, skills, interests, profilePhoto, email, stream } = req.body;
    const updates: Record<string, any> = { updatedAt: new Date().toISOString() };
    if (bio !== undefined) updates.bio = String(bio).trim();
    if (email !== undefined) updates.email = String(email).trim().toLowerCase();
    if (stream !== undefined) updates.stream = String(stream).trim();
    if (profilePhoto !== undefined) updates.profilePhoto = String(profilePhoto).trim();
    if (Array.isArray(skills)) updates.skills = skills;
    if (Array.isArray(interests)) updates.interests = interests;

    const merged = { ...snap.data(), ...updates };
    updates.profileCompletion = calcProfileCompletion(merged);
    updates.profileStatus = updates.profileCompletion >= 100 ? "complete" : "incomplete";

    await profileRef.update(updates);
    return res.json({ success: true, profileCompletion: updates.profileCompletion, profileStatus: updates.profileStatus });
  } catch (err) {
    console.error("[conf/profile patch]", err);
    return res.status(500).json({ error: "Failed to update profile" });
  }
});

export default router;
