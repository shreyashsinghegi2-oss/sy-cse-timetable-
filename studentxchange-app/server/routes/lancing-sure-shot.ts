import { Router, Request, Response } from "express";
import { getFirebaseAdmin, admin } from "../firebase-admin";
import { LANCING_ADMIN_EMAIL } from "../config/constants";

const router = Router();
const ADMIN_EMAIL = LANCING_ADMIN_EMAIL;

async function verifyUser(req: Request) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  try {
    if (!getFirebaseAdmin()) return null;
    const token = authHeader.replace("Bearer ", "");
    const decoded = await admin.auth().verifyIdToken(token);
    return { uid: decoded.uid, email: decoded.email, name: decoded.name };
  } catch {
    return null;
  }
}

async function requireAdmin(req: Request, res: Response): Promise<{ uid: string; email?: string } | null> {
  const user = await verifyUser(req);
  if (!user || user.email?.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
    res.status(403).json({ error: "Admin only" });
    return null;
  }
  return user;
}

// Public list (open jobs)
router.get("/api/lancing/sure-shot/jobs", async (req: Request, res: Response) => {
  try {
    const db = admin.firestore();
    const snap = await db.collection("sure_shot_jobs").where("status", "==", "open").get();
    const jobs: any[] = [];
    snap.forEach((d) => jobs.push({ id: d.id, ...d.data() }));
    jobs.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    res.json({ jobs });
  } catch (err: any) {
    console.error("[SURE SHOT] list error:", err?.message || err);
    res.status(500).json({ error: "Failed" });
  }
});

// Apply to a sure shot job (does NOT count against apply counter)
router.post("/api/lancing/sure-shot/apply", async (req: Request, res: Response) => {
  try {
    const user = await verifyUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    const { jobId, whyInterested, upiId, phoneNumber, studentName } = req.body || {};
    if (!jobId || !whyInterested || !upiId || !phoneNumber) {
      return res.status(400).json({ error: "Missing fields" });
    }
    const phoneDigits = String(phoneNumber).replace(/\D/g, "");
    if (phoneDigits.length < 10) {
      return res.status(400).json({ error: "Invalid phone number" });
    }
    const db = admin.firestore();
    const jobRef = db.collection("sure_shot_jobs").doc(jobId);
    const jobSnap = await jobRef.get();
    if (!jobSnap.exists) return res.status(404).json({ error: "Job not found" });
    const job: any = jobSnap.data();
    if (job.status !== "open") return res.status(400).json({ error: "Job is closed" });
    if ((job.slots_filled || 0) >= (job.slots_available || 0)) {
      return res.status(400).json({ error: "No slots left" });
    }

    const applicationId = `${jobId}_${user.uid}`;
    const appRef = db.collection("sure_shot_applications").doc(applicationId);

    await db.runTransaction(async (tx) => {
      const existing = await tx.get(appRef);
      if (existing.exists) throw new Error("Already applied");
      const freshJob = await tx.get(jobRef);
      const j: any = freshJob.data();
      if ((j.slots_filled || 0) >= (j.slots_available || 0)) {
        throw new Error("No slots left");
      }
      tx.set(appRef, {
        job_id: jobId,
        job_title: job.title,
        student_uid: user.uid,
        student_name: studentName || user.name || "Student",
        student_email: user.email || "",
        why_interested: String(whyInterested).slice(0, 1000),
        upi_id: String(upiId).slice(0, 80),
        phone_number: String(phoneNumber).slice(0, 20),
        status: "applied",
        applied_at: new Date().toISOString(),
        payout_amount: job.payout_amount || 0,
        payout_status: "pending",
      });
      tx.update(jobRef, { slots_filled: (j.slots_filled || 0) + 1 });
    });

    res.json({ success: true, applicationId });
  } catch (err: any) {
    if (err?.message === "Already applied") return res.status(409).json({ error: "Already applied" });
    if (err?.message === "No slots left") return res.status(400).json({ error: "No slots left" });
    console.error("[SURE SHOT] apply error:", err?.message || err);
    res.status(500).json({ error: "Failed" });
  }
});

// My sure shot applications
router.get("/api/lancing/sure-shot/my-applications", async (req: Request, res: Response) => {
  try {
    const user = await verifyUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    const db = admin.firestore();
    const snap = await db.collection("sure_shot_applications").where("student_uid", "==", user.uid).get();
    const apps: any[] = [];
    snap.forEach((d) => apps.push({ id: d.id, ...d.data() }));
    apps.sort((a, b) => new Date(b.applied_at || 0).getTime() - new Date(a.applied_at || 0).getTime());
    res.json({ applications: apps });
  } catch (err: any) {
    console.error("[SURE SHOT] my-apps error:", err?.message || err);
    res.status(500).json({ error: "Failed" });
  }
});

// Update student's submission link (work delivery)
router.post("/api/lancing/sure-shot/submit-work", async (req: Request, res: Response) => {
  try {
    const user = await verifyUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    const { applicationId, workSubmissionLink } = req.body || {};
    if (!applicationId || !workSubmissionLink) return res.status(400).json({ error: "Missing fields" });
    const db = admin.firestore();
    const ref = db.collection("sure_shot_applications").doc(applicationId);
    const snap = await ref.get();
    if (!snap.exists) return res.status(404).json({ error: "Not found" });
    const data: any = snap.data();
    if (data.student_uid !== user.uid) return res.status(403).json({ error: "Forbidden" });
    await ref.update({
      work_submission_link: String(workSubmissionLink).slice(0, 500),
      status: "submitted",
      submitted_at: new Date().toISOString(),
    });
    res.json({ success: true });
  } catch (err: any) {
    console.error("[SURE SHOT] submit error:", err?.message || err);
    res.status(500).json({ error: "Failed" });
  }
});

// === Admin endpoints ===
router.post("/api/lancing/admin/sure-shot/jobs", async (req: Request, res: Response) => {
  const user = await requireAdmin(req, res);
  if (!user) return;
  try {
    const { title, company, description, skills, payout_amount, work_mode, duration, deadline, slots_available } = req.body || {};
    if (!title || !payout_amount || !slots_available) {
      return res.status(400).json({ error: "Missing fields" });
    }
    const db = admin.firestore();
    const docRef = await db.collection("sure_shot_jobs").add({
      title: String(title).slice(0, 200),
      company: String(company || "Confidential").slice(0, 120),
      description: String(description || "").slice(0, 2000),
      skills: Array.isArray(skills) ? skills.slice(0, 12).map((s) => String(s).slice(0, 40)) : [],
      payout_amount: Number(payout_amount),
      work_mode: String(work_mode || "Remote"),
      duration: String(duration || ""),
      deadline: String(deadline || ""),
      slots_available: Number(slots_available),
      slots_filled: 0,
      status: "open",
      createdAt: new Date().toISOString(),
    });
    res.json({ success: true, id: docRef.id });
  } catch (err: any) {
    console.error("[SURE SHOT ADMIN] create error:", err?.message || err);
    res.status(500).json({ error: "Failed" });
  }
});

router.get("/api/lancing/admin/sure-shot/jobs", async (req: Request, res: Response) => {
  const user = await requireAdmin(req, res);
  if (!user) return;
  try {
    const db = admin.firestore();
    const snap = await db.collection("sure_shot_jobs").get();
    const jobs: any[] = [];
    snap.forEach((d) => jobs.push({ id: d.id, ...d.data() }));
    jobs.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    res.json({ jobs });
  } catch (err: any) {
    res.status(500).json({ error: "Failed" });
  }
});

router.patch("/api/lancing/admin/sure-shot/jobs/:id", async (req: Request, res: Response) => {
  const user = await requireAdmin(req, res);
  if (!user) return;
  try {
    const { status, slots_available } = req.body || {};
    const update: any = {};
    if (status) update.status = String(status);
    if (slots_available !== undefined) update.slots_available = Number(slots_available);
    await admin.firestore().collection("sure_shot_jobs").doc(req.params.id).update(update);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: "Failed" });
  }
});

router.get("/api/lancing/admin/sure-shot/applications/:jobId", async (req: Request, res: Response) => {
  const user = await requireAdmin(req, res);
  if (!user) return;
  try {
    const db = admin.firestore();
    const snap = await db.collection("sure_shot_applications").where("job_id", "==", req.params.jobId).get();
    const apps: any[] = [];
    snap.forEach((d) => apps.push({ id: d.id, ...d.data() }));
    res.json({ applications: apps });
  } catch (err: any) {
    res.status(500).json({ error: "Failed" });
  }
});

router.get("/api/lancing/admin/sure-shot/all-applications", async (req: Request, res: Response) => {
  const user = await requireAdmin(req, res);
  if (!user) return;
  try {
    const db = admin.firestore();
    const snap = await db.collection("sure_shot_applications").get();
    const apps: any[] = [];
    snap.forEach((d) => apps.push({ id: d.id, ...d.data() }));
    apps.sort((a, b) => new Date(b.applied_at || 0).getTime() - new Date(a.applied_at || 0).getTime());
    res.json({ applications: apps });
  } catch (err: any) {
    res.status(500).json({ error: "Failed" });
  }
});

router.patch("/api/lancing/admin/sure-shot/applications/:id", async (req: Request, res: Response) => {
  const user = await requireAdmin(req, res);
  if (!user) return;
  try {
    const { status, payout_status, payment_proof_url } = req.body || {};
    const update: any = {};
    if (status) update.status = String(status);
    if (payout_status) update.payout_status = String(payout_status);
    if (payment_proof_url) update.payment_proof_url = String(payment_proof_url);
    if (payout_status === "done") update.paid_at = new Date().toISOString();
    await admin.firestore().collection("sure_shot_applications").doc(req.params.id).update(update);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: "Failed" });
  }
});

// === Opportunities (Source A — admin posts) ===
// Posting an opportunity also creates a Sure Shot job so students see it there.
router.post("/api/lancing/admin/opportunities", async (req: Request, res: Response) => {
  const user = await requireAdmin(req, res);
  if (!user) return;
  try {
    const { title, company, type, description, skills, payout, work_mode, duration, deadline, source_url, slots_available } = req.body || {};
    if (!title || !type) return res.status(400).json({ error: "Missing fields" });
    if (!["job", "internship"].includes(type)) {
      return res.status(400).json({ error: "Invalid type" });
    }
    const db = admin.firestore();
    const payload = {
      title: String(title).slice(0, 200),
      company: String(company || "StudentXchange").slice(0, 120),
      type,
      description: String(description || "").slice(0, 2000),
      skills: Array.isArray(skills) ? skills.slice(0, 12).map((s) => String(s).slice(0, 40)) : [],
      payout: payout ? Number(payout) : null,
      work_mode: String(work_mode || "Remote"),
      duration: String(duration || ""),
      deadline: String(deadline || ""),
      source_url: source_url ? String(source_url).slice(0, 500) : null,
      status: "open",
      createdAt: new Date().toISOString(),
    };
    // Save to opportunities collection (used by AI match merge)
    const docRef = await db.collection("opportunities").add(payload);
    // Also save to sure_shot_jobs so it appears in the Sure Shot section for students
    await db.collection("sure_shot_jobs").add({
      title: payload.title,
      company: payload.company,
      description: payload.description,
      skills: payload.skills,
      payout_amount: payload.payout || 0,
      work_mode: payload.work_mode,
      duration: payload.duration,
      deadline: payload.deadline,
      slots_available: slots_available ? Number(slots_available) : 10,
      slots_filled: 0,
      status: "open",
      source_url: payload.source_url,
      opportunity_id: docRef.id,
      createdAt: payload.createdAt,
    });
    res.json({ success: true, id: docRef.id });
  } catch (err: any) {
    console.error("[OPPORTUNITIES] create error:", err?.message || err);
    res.status(500).json({ error: "Failed" });
  }
});

router.get("/api/lancing/opportunities/:type", async (req: Request, res: Response) => {
  try {
    const type = req.params.type;
    if (!["job", "internship"].includes(type)) {
      return res.status(400).json({ error: "Invalid type" });
    }
    const db = admin.firestore();
    const snap = await db.collection("opportunities").where("type", "==", type).where("status", "==", "open").get();
    const opps: any[] = [];
    snap.forEach((d) => opps.push({ id: d.id, ...d.data() }));
    opps.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    res.json({ opportunities: opps });
  } catch (err: any) {
    res.status(500).json({ error: "Failed" });
  }
});

router.get("/api/lancing/admin/opportunities", async (req: Request, res: Response) => {
  const user = await requireAdmin(req, res);
  if (!user) return;
  try {
    const db = admin.firestore();
    const snap = await db.collection("opportunities").get();
    const opps: any[] = [];
    snap.forEach((d) => opps.push({ id: d.id, ...d.data() }));
    opps.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    res.json({ opportunities: opps });
  } catch (err: any) {
    res.status(500).json({ error: "Failed" });
  }
});

router.delete("/api/lancing/admin/opportunities/:id", async (req: Request, res: Response) => {
  const user = await requireAdmin(req, res);
  if (!user) return;
  try {
    await admin.firestore().collection("opportunities").doc(req.params.id).delete();
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: "Failed" });
  }
});

export default router;
