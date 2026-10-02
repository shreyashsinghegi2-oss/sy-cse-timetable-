import { Router, Request, Response } from "express";
import { db } from "../db";
import { competitions, insertCompetitionSchema } from "@shared/schema";
import { eq, desc, and, ilike, or, sql } from "drizzle-orm";
import { LANCING_ADMIN_EMAIL, PLATFORM_ADMIN_EMAIL } from "../config/constants";
import { getFirebaseAdmin, admin } from "../firebase-admin";
import { z } from "zod";

const router = Router();

const COMPETITIONS_ADMIN_EMAILS = new Set([
  PLATFORM_ADMIN_EMAIL.toLowerCase(),
  LANCING_ADMIN_EMAIL.toLowerCase(),
]);

async function verifyCompetitionsAdmin(req: Request, res: Response, next: Function) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const token = authHeader.split("Bearer ")[1];
    const firebaseApp = getFirebaseAdmin();
    if (!firebaseApp) return res.status(500).json({ error: "Firebase not configured" });
    const decoded = await admin.auth().verifyIdToken(token);
    if (!COMPETITIONS_ADMIN_EMAILS.has(decoded.email?.toLowerCase() ?? "")) {
      return res.status(403).json({ error: "Admin access required" });
    }
    (req as any).adminUser = decoded;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}

// ─── PUBLIC: list competitions with filtering/search ────────────────────────
router.get("/api/competitions", async (req: Request, res: Response) => {
  try {
    const { category, mode, search, field, page = "1", limit = "20" } = req.query as Record<string, string>;
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit) || 20));
    const offset = (pageNum - 1) * limitNum;

    const conditions = [eq(competitions.isActive, true)];

    if (category && category !== "All") conditions.push(eq(competitions.category, category));
    if (mode && mode !== "All") conditions.push(eq(competitions.mode, mode));
    if (search) {
      conditions.push(
        or(
          ilike(competitions.title, `%${search}%`),
          ilike(competitions.organizer, `%${search}%`),
          ilike(competitions.descriptionSummary, `%${search}%`)
        )!
      );
    }
    if (field && field !== "All") conditions.push(ilike(competitions.field, `%${field}%`));

    const where = conditions.length > 1 ? and(...conditions) : conditions[0];

    const [rows, countResult] = await Promise.all([
      db.select().from(competitions).where(where).orderBy(desc(competitions.createdAt)).limit(limitNum).offset(offset),
      db.select({ count: sql<number>`count(*)::int` }).from(competitions).where(where),
    ]);

    res.json({ competitions: rows, total: countResult[0]?.count ?? 0, page: pageNum, limit: limitNum });
  } catch (err) {
    console.error("[competitions] list error", err);
    res.status(500).json({ error: "Failed to fetch competitions" });
  }
});

// ─── PUBLIC: single competition ──────────────────────────────────────────────
router.get("/api/competitions/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
    const rows = await db.select().from(competitions).where(eq(competitions.id, id));
    if (!rows.length) return res.status(404).json({ error: "Not found" });
    res.json(rows[0]);
  } catch (err) {
    console.error("[competitions] get error", err);
    res.status(500).json({ error: "Failed to fetch competition" });
  }
});

// ─── ADMIN: create single competition ───────────────────────────────────────
router.post("/api/competitions", verifyCompetitionsAdmin, async (req: Request, res: Response) => {
  try {
    const parsed = insertCompetitionSchema.parse(req.body);
    const [created] = await db.insert(competitions).values(parsed).returning();
    res.status(201).json(created);
  } catch (err: any) {
    if (err?.name === "ZodError") return res.status(400).json({ error: err.errors });
    console.error("[competitions] create error", err);
    res.status(500).json({ error: "Failed to create competition" });
  }
});

// ─── ADMIN: bulk import from AI-normalized JSON ──────────────────────────────
router.post("/api/competitions/bulk", verifyCompetitionsAdmin, async (req: Request, res: Response) => {
  try {
    const { items } = req.body as { items: unknown[] };
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "items must be a non-empty array" });
    }

    const valid: any[] = [];
    const errors: { index: number; error: string }[] = [];

    for (let i = 0; i < items.length; i++) {
      try {
        const row = items[i] as Record<string, any>;
        const mapped = {
          title: row.title ?? "",
          organizer: row.organizer ?? "",
          category: row.category ?? "Other",
          field: row.field ?? "",
          eligibility: row.eligibility ?? null,
          teamSize: row.team_size ?? null,
          mode: row.mode ?? "Online",
          location: row.location ?? null,
          registrationDeadline: row.registration_deadline ?? null,
          eventDate: row.event_date ?? null,
          prizePool: row.prize_pool ?? null,
          entryFee: row.entry_fee ?? null,
          applyLink: row.apply_link ?? null,
          sourcePlatform: row.source_platform ?? null,
          descriptionSummary: row.description_summary ?? null,
          isVerified: Boolean(row.is_verified),
          requiresReview: Boolean(row.requires_review),
          tags: Array.isArray(row.tags) ? row.tags : [],
          isActive: true,
        };
        valid.push(insertCompetitionSchema.parse(mapped));
      } catch (e: any) {
        errors.push({ index: i, error: e?.message ?? "Validation failed" });
      }
    }

    let inserted: any[] = [];
    if (valid.length > 0) {
      inserted = await db.insert(competitions).values(valid).returning();
    }

    res.status(201).json({ inserted: inserted.length, errors });
  } catch (err) {
    console.error("[competitions] bulk error", err);
    res.status(500).json({ error: "Bulk import failed" });
  }
});

// ─── ADMIN: update competition ───────────────────────────────────────────────
router.patch("/api/competitions/:id", verifyCompetitionsAdmin, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
    const partial = insertCompetitionSchema.partial().parse(req.body);
    const [updated] = await db.update(competitions).set(partial).where(eq(competitions.id, id)).returning();
    if (!updated) return res.status(404).json({ error: "Not found" });
    res.json(updated);
  } catch (err: any) {
    if (err?.name === "ZodError") return res.status(400).json({ error: err.errors });
    res.status(500).json({ error: "Failed to update competition" });
  }
});

// ─── ADMIN: delete competition ───────────────────────────────────────────────
router.delete("/api/competitions/:id", verifyCompetitionsAdmin, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
    await db.delete(competitions).where(eq(competitions.id, id));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete competition" });
  }
});

// ─── ADMIN: analytics ────────────────────────────────────────────────────────
router.get("/api/competitions/admin/stats", verifyCompetitionsAdmin, async (req: Request, res: Response) => {
  try {
    const [total, active, needsReview] = await Promise.all([
      db.select({ count: sql<number>`count(*)::int` }).from(competitions),
      db.select({ count: sql<number>`count(*)::int` }).from(competitions).where(eq(competitions.isActive, true)),
      db.select({ count: sql<number>`count(*)::int` }).from(competitions).where(eq(competitions.requiresReview, true)),
    ]);
    res.json({ total: total[0]?.count ?? 0, active: active[0]?.count ?? 0, needsReview: needsReview[0]?.count ?? 0 });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

// ─── ADMIN: list all (including inactive) ────────────────────────────────────
router.get("/api/competitions/admin/all", verifyCompetitionsAdmin, async (req: Request, res: Response) => {
  try {
    const rows = await db.select().from(competitions).orderBy(desc(competitions.createdAt));
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch competitions" });
  }
});

export default router;
