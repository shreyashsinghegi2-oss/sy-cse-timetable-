import { Router, Request, Response } from "express";
import { getFirebaseAdmin, admin } from "../firebase-admin";
import { verifyJWT } from "./firebase-auth";
import { PLATFORM_ADMIN_EMAIL } from "../config/constants";

const router = Router();

const NETX_ADMINS = [
  PLATFORM_ADMIN_EMAIL,
  "gautamsantoshbennurkar@gmail.com",
];

function requireNetxAdmin(req: Request, res: Response): boolean {
  const jwtUser = (req as any).jwtUser;
  const email = jwtUser?.email?.toLowerCase() || "";
  if (!email || !NETX_ADMINS.includes(email)) {
    res.status(403).json({ error: "Admin access required" });
    return false;
  }
  return true;
}

/* ── POST /api/netx/register ─────────────────────────────────────── */
router.post("/api/netx/register", async (req: Request, res: Response) => {
  try {
    const firebaseApp = getFirebaseAdmin();
    if (!firebaseApp) return res.status(503).json({ error: "Firebase not configured" });

    const { fullName, phone, email, college, educationLevel, branch, utrNumber, paymentScreenshotURL } = req.body;

    if (!fullName || !phone || !email || !college || !educationLevel) {
      return res.status(400).json({ error: "All fields are required" });
    }
    if (!paymentScreenshotURL) {
      return res.status(400).json({ error: "Payment screenshot is required" });
    }

    const needsBranch = educationLevel !== "12th Standard";
    if (needsBranch && !branch) {
      return res.status(400).json({ error: "Branch is required for this education level" });
    }

    const db = admin.firestore();

    /* Prevent duplicate registrations by same email */
    const existing = await db.collection("netx_registrations")
      .where("email", "==", String(email).trim().toLowerCase())
      .limit(1)
      .get();
    if (!existing.empty) {
      return res.status(409).json({ error: "already_registered", message: "You are already registered for NETX!" });
    }

    const regRef = db.collection("netx_registrations").doc();
    await regRef.set({
      fullName:             String(fullName).trim(),
      phone:                String(phone).trim(),
      email:                String(email).trim().toLowerCase(),
      college:              String(college).trim(),
      educationLevel:       String(educationLevel).trim(),
      branch:               needsBranch ? String(branch).trim() : "",
      utrNumber:            utrNumber ? String(utrNumber).trim() : "",
      paymentScreenshotURL: String(paymentScreenshotURL),
      paymentStatus:        "pending_verification",
      amountPaid:           3600,
      status:               "registered",
      createdAt:            admin.firestore.FieldValue.serverTimestamp(),
    });

    /* Auto-create netx_users profile */
    try {
      const emailKey = String(email).trim().toLowerCase().replace(/[.@]/g, "_");
      const profileRef = db.collection("netx_users").doc(emailKey);
      const snap = await profileRef.get();
      if (!snap.exists) {
        await profileRef.set({
          fullName:         String(fullName).trim(),
          email:            String(email).trim().toLowerCase(),
          phone:            String(phone).trim(),
          college:          String(college).trim(),
          educationLevel:   String(educationLevel).trim(),
          branch:           needsBranch ? String(branch).trim() : "",
          registrationIds:  [regRef.id],
          createdFrom:      "netx",
          createdAt:        admin.firestore.FieldValue.serverTimestamp(),
          updatedAt:        admin.firestore.FieldValue.serverTimestamp(),
        });
      } else {
        const existingData = snap.data() as any;
        const existingIds: string[] = existingData?.registrationIds || [];
        await profileRef.update({
          registrationIds: [...new Set([...existingIds, regRef.id])],
          updatedAt:       admin.firestore.FieldValue.serverTimestamp(),
        });
      }
    } catch (profileErr) {
      console.warn("[netx/register] Profile upsert failed (non-critical):", profileErr);
    }

    return res.status(200).json({ success: true, id: regRef.id });
  } catch (err) {
    console.error("[netx/register] Error:", err);
    return res.status(500).json({ error: "Submission failed" });
  }
});

/* ── GET /api/netx/registrations (admin) ──────────────────────────── */
router.get("/api/netx/registrations", verifyJWT, async (req: Request, res: Response) => {
  try {
    if (!requireNetxAdmin(req, res)) return;
    const firebaseApp = getFirebaseAdmin();
    if (!firebaseApp) return res.status(503).json({ error: "Firebase not configured" });

    const db = admin.firestore();
    const snap = await db.collection("netx_registrations").orderBy("createdAt", "desc").get();
    return res.status(200).json(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  } catch (err) {
    console.error("[netx/registrations] Error:", err);
    return res.status(500).json({ error: "Failed to fetch" });
  }
});

/* ── PATCH /api/netx/registrations/:id (admin) ─────────────────────── */
router.patch("/api/netx/registrations/:id", verifyJWT, async (req: Request, res: Response) => {
  try {
    if (!requireNetxAdmin(req, res)) return;
    const firebaseApp = getFirebaseAdmin();
    if (!firebaseApp) return res.status(503).json({ error: "Firebase not configured" });

    const { id } = req.params;
    const { paymentStatus } = req.body;
    if (!paymentStatus) return res.status(400).json({ error: "Missing paymentStatus" });

    const db = admin.firestore();
    await db.collection("netx_registrations").doc(id).update({
      paymentStatus,
      reviewedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("[netx/patch] Error:", err);
    return res.status(500).json({ error: "Update failed" });
  }
});

/* ── DELETE /api/netx/registrations/:id (admin) ────────────────────── */
router.delete("/api/netx/registrations/:id", verifyJWT, async (req: Request, res: Response) => {
  try {
    if (!requireNetxAdmin(req, res)) return;
    const firebaseApp = getFirebaseAdmin();
    if (!firebaseApp) return res.status(503).json({ error: "Firebase not configured" });

    const { id } = req.params;
    const db = admin.firestore();
    await db.collection("netx_registrations").doc(id).delete();
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("[netx/delete] Error:", err);
    return res.status(500).json({ error: "Delete failed" });
  }
});

export default router;
