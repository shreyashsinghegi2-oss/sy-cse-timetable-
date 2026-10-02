import { Router, Request, Response } from "express";
import { getFirebaseAdmin, admin } from "../firebase-admin";

const router = Router();

async function verifyUser(req: Request): Promise<{ uid: string; email?: string } | null> {
  const hdr = req.headers.authorization;
  if (!hdr?.startsWith("Bearer ")) return null;
  try {
    if (!getFirebaseAdmin()) return null;
    const decoded = await admin.auth().verifyIdToken(hdr.replace("Bearer ", ""));
    return { uid: decoded.uid, email: decoded.email };
  } catch { return null; }
}

// POST /api/attendance/mark — only placement_cell role allowed
router.post("/api/attendance/mark", async (req: Request, res: Response) => {
  try {
    if (!getFirebaseAdmin()) return res.status(503).json({ error: "Firebase unavailable" });
    const u = await verifyUser(req);
    if (!u) return res.status(401).json({ error: "Unauthorized" });

    // Verify role = placement_cell
    const userSnap = await admin.firestore().collection("lancing_users").doc(u.uid).get();
    if (!userSnap.exists || userSnap.data()?.role !== "placement_cell") {
      return res.status(403).json({ error: "Only Placement Cell officers can mark attendance" });
    }

    const pcSnap = await admin.firestore().collection("placement_cells").doc(u.uid).get();
    const pcData = pcSnap.exists ? pcSnap.data() : null;
    if (!pcData) return res.status(403).json({ error: "Placement Cell profile not found" });

    const {
      studentUid, date,
      studentName, studentBranch, studentYear, studentUniversity,
    } = req.body || {};

    if (!studentUid || !date) {
      return res.status(400).json({ error: "studentUid and date are required" });
    }

    const db = admin.firestore();
    const recordRef = db.collection("attendance").doc(studentUid).collection("records").doc(date);

    // Idempotency check
    const existing = await recordRef.get();
    if (existing.exists) {
      return res.status(409).json({ error: "already_marked", message: `${studentName || studentUid} is already marked Present today.` });
    }

    await recordRef.set({
      date: String(date),
      status: "present",
      markedAt: admin.firestore.FieldValue.serverTimestamp(),
      markedByUid: u.uid,
      markedByName: pcData.contactName || "",
      markedByCollege: pcData.collegeName || "",
      studentUid: String(studentUid),
      studentName: studentName ? String(studentName) : "",
      studentBranch: studentBranch ? String(studentBranch) : "",
      studentYear: studentYear ? String(studentYear) : "",
      studentUniversity: studentUniversity ? String(studentUniversity) : "",
    });

    res.json({ ok: true, message: `${studentName || studentUid} marked Present for ${date}.` });
  } catch (err: any) {
    console.error("[ATTENDANCE] mark:", err?.message);
    res.status(500).json({ error: "Failed to mark attendance" });
  }
});

export default router;
