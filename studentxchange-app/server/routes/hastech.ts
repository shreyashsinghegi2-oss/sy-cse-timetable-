import { Router, Request, Response } from "express";
import { getFirebaseAdmin, admin } from "../firebase-admin";
import { verifyJWT } from "./firebase-auth";
import { PLATFORM_ADMIN_EMAIL } from "../config/constants";

const router = Router();

const HASTECH_ADMINS = [
  PLATFORM_ADMIN_EMAIL,
  "yadnyesh.khapekar@adypu.edu.in",
  "sameer.agarwal@adypu.edu.in",
  "ganesh.mundhe@adypu.edu.in",
  "e25b000279@adypu.edu.in",
];

function requireHastechAdmin(req: Request, res: Response): boolean {
  const jwtUser = (req as any).jwtUser;
  const email = jwtUser?.email?.toLowerCase() || "";
  if (!email || !HASTECH_ADMINS.includes(email)) {
    res.status(403).json({ error: "Admin access required" });
    return false;
  }
  return true;
}

/* ── POST /api/hastech/register ─────────────────────────────────────── */
router.post("/api/hastech/register", async (req: Request, res: Response) => {
  try {
    const firebaseApp = getFirebaseAdmin();
    if (!firebaseApp) return res.status(503).json({ error: "Firebase not configured" });

    const {
      name, urn, college, department, course, year,
      email, phone, selectedEvents, teamName, teamLeader,
      totalAmount, paymentScreenshotURL,
    } = req.body;

    if (!name || !urn || !email || !phone || !selectedEvents || !paymentScreenshotURL) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const eventsArray: Array<{ name: string; price: number; type: string; category: string }> =
      Array.isArray(selectedEvents) ? selectedEvents : [];

    const db = admin.firestore();
    const batch = db.batch();

    const regRef = db.collection("hastech_registrations").doc();
    batch.set(regRef, {
      name:                 String(name).trim(),
      urn:                  String(urn).trim(),
      college:              String(college || "").trim(),
      department:           String(department || "").trim(),
      course:               String(course || "").trim(),
      year:                 year || "",
      email:                String(email).trim(),
      phone:                String(phone).trim(),
      selectedEvents:       eventsArray,
      teamName:             String(teamName || "").trim(),
      teamLeader:           String(teamLeader || "").trim(),
      totalAmount:          Number(totalAmount) || 0,
      paymentScreenshotURL: String(paymentScreenshotURL),
      paymentStatus:        "confirmed",
      createdAt:            admin.firestore.FieldValue.serverTimestamp(),
    });

    for (const ev of eventsArray) {
      const entryRef = db.collection("hastech_event_entries").doc();
      batch.set(entryRef, {
        registrationId:       regRef.id,
        name:                 String(name).trim(),
        phone:                String(phone).trim(),
        email:                String(email).trim(),
        urn:                  String(urn).trim(),
        college:              String(college || "").trim(),
        department:           String(department || "").trim(),
        eventName:            String(ev.name || ""),
        eventCategory:        String(ev.category || ""),
        eventType:            String(ev.type || "individual"),
        teamName:             String(teamName || "").trim(),
        teamLeader:           String(teamLeader || "").trim(),
        amountPaid:           Number(ev.price) || 0,
        paymentScreenshotURL: String(paymentScreenshotURL),
        paymentStatus:        "confirmed",
        createdAt:            admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    await batch.commit();

    /* ── Auto-create hastech_users profile ──────────────────────────── */
    try {
      const emailKey = String(email).trim().toLowerCase().replace(/[.@]/g, "_");
      const profileRef = db.collection("hastech_users").doc(emailKey);
      const profileSnap = await profileRef.get();

      if (!profileSnap.exists) {
        await profileRef.set({
          name:              String(name).trim(),
          email:             String(email).trim().toLowerCase(),
          phone:             String(phone).trim(),
          urn:               String(urn).trim(),
          department:        String(department || "").trim(),
          course:            String(course || "").trim(),
          year:              year || "",
          college:           String(college || "").trim(),
          profilePhoto:      "",
          bio:               "",
          skills:            [],
          interests:         [],
          profileCompletion: 60,
          profileStatus:     "incomplete",
          createdFrom:       "hastech",
          registrationIds:   [regRef.id],
          createdAt:         admin.firestore.FieldValue.serverTimestamp(),
          updatedAt:         admin.firestore.FieldValue.serverTimestamp(),
        });
      } else {
        const existing = profileSnap.data() as any;
        const existingIds: string[] = existing?.registrationIds || [];
        await profileRef.update({
          name:            String(name).trim(),
          phone:           String(phone).trim(),
          urn:             String(urn).trim(),
          department:      String(department || "").trim(),
          course:          String(course || "").trim(),
          year:            year || "",
          college:         String(college || "").trim(),
          registrationIds: [...new Set([...existingIds, regRef.id])],
          updatedAt:       admin.firestore.FieldValue.serverTimestamp(),
        });
      }
    } catch (profileErr) {
      console.warn("[hastech/register] Profile upsert failed (non-critical):", profileErr);
    }

    return res.status(200).json({ success: true, id: regRef.id });
  } catch (err) {
    console.error("[hastech/register] Error:", err);
    return res.status(500).json({ error: "Submission failed" });
  }
});

/* ── GET /api/hastech/registrations ─────────────────────────────────── */
router.get("/api/hastech/registrations", verifyJWT, async (req: Request, res: Response) => {
  try {
    if (!requireHastechAdmin(req, res)) return;
    const firebaseApp = getFirebaseAdmin();
    if (!firebaseApp) return res.status(503).json({ error: "Firebase not configured" });

    const db = admin.firestore();
    const snapshot = await db.collection("hastech_registrations").orderBy("createdAt", "desc").get();
    const registrations = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return res.status(200).json(registrations);
  } catch (err) {
    console.error("[hastech/registrations] Error:", err);
    return res.status(500).json({ error: "Failed to fetch registrations" });
  }
});

/* ── PATCH /api/hastech/registrations/:id ───────────────────────────── */
router.patch("/api/hastech/registrations/:id", verifyJWT, async (req: Request, res: Response) => {
  try {
    if (!requireHastechAdmin(req, res)) return;
    const firebaseApp = getFirebaseAdmin();
    if (!firebaseApp) return res.status(503).json({ error: "Firebase not configured" });

    const { id } = req.params;
    const { paymentStatus } = req.body;
    if (!paymentStatus) return res.status(400).json({ error: "Missing paymentStatus" });

    const db = admin.firestore();
    await db.collection("hastech_registrations").doc(id).update({ paymentStatus });
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("[hastech/registrations patch] Error:", err);
    return res.status(500).json({ error: "Failed to update status" });
  }
});

/* ── GET /api/hastech/event-entries ─────────────────────────────────── */
router.get("/api/hastech/event-entries", verifyJWT, async (req: Request, res: Response) => {
  try {
    if (!requireHastechAdmin(req, res)) return;
    const firebaseApp = getFirebaseAdmin();
    if (!firebaseApp) return res.status(503).json({ error: "Firebase not configured" });

    const db = admin.firestore();
    const snapshot = await db.collection("hastech_event_entries").orderBy("createdAt", "desc").get();
    const entries = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return res.status(200).json(entries);
  } catch (err) {
    console.error("[hastech/event-entries] Error:", err);
    return res.status(500).json({ error: "Failed to fetch event entries" });
  }
});

/* ── GET /api/hastech/my-registration ───────────────────────────────── */
router.get("/api/hastech/my-registration", async (req: Request, res: Response) => {
  try {
    const firebaseApp = getFirebaseAdmin();
    if (!firebaseApp) return res.status(503).json({ error: "Firebase not configured" });

    const email = String(req.query.email || "").trim().toLowerCase();
    if (!email) return res.status(400).json({ error: "Email required" });

    const db = admin.firestore();
    const snap = await db.collection("hastech_registrations")
      .where("email", "==", email)
      .get();

    if (snap.empty) return res.status(404).json({ error: "Not found" });

    /* Pick the most recent doc if multiple (sort client-side) */
    snap.docs.sort((a, b) => {
      const ta = (a.data() as any).createdAt?.toMillis?.() || 0;
      const tb = (b.data() as any).createdAt?.toMillis?.() || 0;
      return tb - ta;
    });

    const data = snap.docs[0].data() as any;
    const events: string[] = [];
    (data.selectedEvents || []).forEach((ev: any) => {
      const name = typeof ev === "string" ? ev : (ev?.name || "");
      if (name) events.push(name);
    });

    return res.status(200).json({
      name: data.name || "",
      urn: data.urn || "",
      email: data.email || "",
      events,
      amount: data.totalAmount || 0,
      regId: snap.docs[0].id,
      paymentStatus: data.paymentStatus || "confirmed",
    });
  } catch (err) {
    console.error("[hastech/my-registration] Error:", err);
    return res.status(500).json({ error: "Failed to fetch" });
  }
});

/* ── GET /api/hastech/registered-events ─────────────────────────────── */
router.get("/api/hastech/registered-events", async (req: Request, res: Response) => {
  try {
    const firebaseApp = getFirebaseAdmin();
    if (!firebaseApp) return res.status(503).json({ error: "Firebase not configured" });

    const email = String(req.query.email || "").trim().toLowerCase();
    if (!email) return res.status(400).json({ error: "Email required" });

    const db = admin.firestore();
    const snap = await db.collection("hastech_registrations")
      .where("email", "==", email)
      .get();

    const registeredEvents: string[] = [];
    snap.docs.forEach(doc => {
      const data = doc.data() as any;
      if (data.paymentStatus === "rejected") return;
      const events = data.selectedEvents || [];
      events.forEach((ev: any) => {
        const name = typeof ev === "string" ? ev : (ev?.name || "");
        if (name && !registeredEvents.includes(name)) registeredEvents.push(name);
      });
    });

    return res.status(200).json({ registeredEvents });
  } catch (err) {
    console.error("[hastech/registered-events] Error:", err);
    return res.status(500).json({ error: "Failed to check" });
  }
});

/* ── DELETE /api/hastech/all ─────────────────────────────────────────── */
router.delete("/api/hastech/all", verifyJWT, async (req: Request, res: Response) => {
  try {
    if (!requireHastechAdmin(req, res)) return;
    const firebaseApp = getFirebaseAdmin();
    if (!firebaseApp) return res.status(503).json({ error: "Firebase not configured" });

    const db = admin.firestore();
    const batchSize = 400;

    const deleteCollection = async (colName: string) => {
      let deleted = 0;
      let snap = await db.collection(colName).limit(batchSize).get();
      while (!snap.empty) {
        const batch = db.batch();
        snap.docs.forEach(d => batch.delete(d.ref));
        await batch.commit();
        deleted += snap.docs.length;
        snap = await db.collection(colName).limit(batchSize).get();
      }
      return deleted;
    };

    const regs = await deleteCollection("hastech_registrations");
    const entries = await deleteCollection("hastech_event_entries");
    const users = await deleteCollection("hastech_users");

    return res.status(200).json({ success: true, deleted: { registrations: regs, entries, users } });
  } catch (err) {
    console.error("[hastech/delete-all] Error:", err);
    return res.status(500).json({ error: "Failed to delete" });
  }
});

/* ── GET /api/hastech/profile/:email ────────────────────────────────── */
router.get("/api/hastech/profile/:email", async (req: Request, res: Response) => {
  try {
    const firebaseApp = getFirebaseAdmin();
    if (!firebaseApp) return res.status(503).json({ error: "Firebase not configured" });

    const email = decodeURIComponent(req.params.email).toLowerCase().trim();
    const emailKey = email.replace(/[.@]/g, "_");
    const db = admin.firestore();
    const snap = await db.collection("hastech_users").doc(emailKey).get();
    if (!snap.exists) return res.status(404).json({ error: "Profile not found" });
    return res.status(200).json({ id: snap.id, ...snap.data() });
  } catch (err) {
    console.error("[hastech/profile get] Error:", err);
    return res.status(500).json({ error: "Failed to fetch profile" });
  }
});

/* ── PATCH /api/hastech/profile/:email ──────────────────────────────── */
router.patch("/api/hastech/profile/:email", async (req: Request, res: Response) => {
  try {
    const firebaseApp = getFirebaseAdmin();
    if (!firebaseApp) return res.status(503).json({ error: "Firebase not configured" });

    const email = decodeURIComponent(req.params.email).toLowerCase().trim();
    const emailKey = email.replace(/[.@]/g, "_");
    const db = admin.firestore();

    const { bio, skills, interests, profilePhoto } = req.body;
    const updates: Record<string, any> = { updatedAt: admin.firestore.FieldValue.serverTimestamp() };

    if (bio !== undefined) updates.bio = String(bio).trim();
    if (profilePhoto !== undefined) updates.profilePhoto = String(profilePhoto).trim();
    if (Array.isArray(skills)) updates.skills = skills;
    if (Array.isArray(interests)) updates.interests = interests;

    const snap = await db.collection("hastech_users").doc(emailKey).get();
    if (!snap.exists) return res.status(404).json({ error: "Profile not found" });

    const data = snap.data() as any;
    const filledFields = [
      data.name, data.email, data.phone, data.urn,
      data.department, data.course, data.year, data.college,
      updates.bio ?? data.bio,
      updates.profilePhoto ?? data.profilePhoto,
      ((updates.skills ?? data.skills) || []).length > 0 ? "x" : "",
      ((updates.interests ?? data.interests) || []).length > 0 ? "x" : "",
    ].filter(Boolean).length;
    const pct = Math.round((filledFields / 12) * 100);
    updates.profileCompletion = pct;
    updates.profileStatus = pct >= 100 ? "complete" : "incomplete";

    await db.collection("hastech_users").doc(emailKey).update(updates);
    return res.status(200).json({ success: true, profileCompletion: pct, profileStatus: updates.profileStatus });
  } catch (err) {
    console.error("[hastech/profile patch] Error:", err);
    return res.status(500).json({ error: "Failed to update profile" });
  }
});

/* ── PATCH /api/hastech/event-entries/:id ───────────────────────────── */
router.patch("/api/hastech/event-entries/:id", verifyJWT, async (req: Request, res: Response) => {
  try {
    if (!requireHastechAdmin(req, res)) return;
    const firebaseApp = getFirebaseAdmin();
    if (!firebaseApp) return res.status(503).json({ error: "Firebase not configured" });

    const { id } = req.params;
    const { paymentStatus } = req.body;
    if (!paymentStatus) return res.status(400).json({ error: "Missing paymentStatus" });

    const db = admin.firestore();
    const entryRef = db.collection("hastech_event_entries").doc(id);
    const entrySnap = await entryRef.get();
    if (!entrySnap.exists) return res.status(404).json({ error: "Entry not found" });

    const registrationId = (entrySnap.data() as any).registrationId;

    const batch = db.batch();
    batch.update(entryRef, { paymentStatus });
    if (registrationId) {
      const regStatus = paymentStatus === "approved" ? "approved"
        : paymentStatus === "rejected" ? "rejected"
        : "pending_verification";
      batch.update(db.collection("hastech_registrations").doc(registrationId), {
        paymentStatus: regStatus,
      });
    }
    await batch.commit();

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("[hastech/event-entries patch] Error:", err);
    return res.status(500).json({ error: "Failed to update status" });
  }
});

/* ── GET /api/hastech/closed-events ────────────────────────────────── */
router.get("/api/hastech/closed-events", async (req: Request, res: Response) => {
  try {
    const db = admin.firestore();
    const doc = await db.collection("hastech_config").doc("closedEvents").get();
    const closed: string[] = doc.exists ? (doc.data()?.events || []) : [];
    res.json({ closed });
  } catch (err) {
    console.error("[hastech/closed-events] Error:", err);
    res.json({ closed: [] });
  }
});

/* ── POST /api/hastech/closed-events/toggle (owner only) ───────────── */
const OWNER_EMAIL = PLATFORM_ADMIN_EMAIL;

router.post("/api/hastech/closed-events/toggle", verifyJWT, async (req: Request, res: Response) => {
  const jwtUser = (req as any).jwtUser;
  if (jwtUser?.email?.toLowerCase() !== OWNER_EMAIL) {
    return res.status(403).json({ error: "Owner access only" });
  }
  try {
    const { eventName, closed } = req.body;
    if (!eventName) return res.status(400).json({ error: "eventName required" });
    const db = admin.firestore();
    const ref = db.collection("hastech_config").doc("closedEvents");
    const doc = await ref.get();
    let events: string[] = doc.exists ? (doc.data()?.events || []) : [];
    if (closed) {
      if (!events.includes(eventName)) events.push(eventName);
    } else {
      events = events.filter((e: string) => e !== eventName);
    }
    await ref.set({ events, updatedAt: new Date() });
    res.json({ success: true, closed: events });
  } catch (err) {
    console.error("[hastech/closed-events/toggle] Error:", err);
    res.status(500).json({ error: "Failed to update" });
  }
});

export default router;
