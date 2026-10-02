import { Router, Request, Response } from "express";
import { getFirebaseAdmin, admin } from "../firebase-admin";

const router = Router();

async function verifyUser(req: Request) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  try {
    if (!getFirebaseAdmin()) return null;
    const token = authHeader.replace("Bearer ", "");
    const decoded = await admin.auth().verifyIdToken(token);
    return { uid: decoded.uid, email: decoded.email };
  } catch {
    return null;
  }
}

// Apply counter — always returns unlimited (no payment required).
router.get("/api/lancing/apply-counter", async (req: Request, res: Response) => {
  const user = await verifyUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });
  res.json({
    month: "unlimited",
    count: 0,
    freeLimit: 9999,
    remaining: 9999,
    requiresPayment: false,
    feeAmount: 0,
    paidPasses: 9999,
    aiMatchCount: 0,
    aiMatchFreeLimit: 9999,
    aiMatchRemaining: 9999,
    isAdmin: false,
  });
});

// Consume one application — always succeeds, no payment required.
router.post("/api/lancing/apply-counter/consume", async (req: Request, res: Response) => {
  const user = await verifyUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });
  res.json({ used: "free", count: 0, remaining: 9999, paidPasses: 9999, aiMatchRemaining: 9999 });
});

export default router;
