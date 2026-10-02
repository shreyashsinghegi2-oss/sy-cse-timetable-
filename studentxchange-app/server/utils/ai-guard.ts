/**
 * AI Guard — per-user quota, concurrency lock, circuit breaker, timeout wrapper.
 * Single source of truth for all Anthropic call protection across the app.
 *
 * Quota storage strategy:
 *  Primary   — Firestore transaction (persistent across restarts, multi-instance safe,
 *              race-condition-free because Firestore transactions are serialised per doc)
 *  Fallback  — in-memory Map (single-instance, resets on restart; used only when
 *              Firestore is temporarily unavailable so we never block real users)
 *
 * Concurrency guard (IN_FLIGHT) and circuit breaker stay in-memory intentionally:
 *  • Concurrency guard: prevents a single user hammering THIS instance in parallel.
 *    Each instance independently enforces its own concurrency limit, which is correct.
 *  • Circuit breaker: tracks failures seen by THIS instance. If Anthropic is down,
 *    every instance will independently open its circuit, which is the desired behaviour.
 */

import { getFirebaseAdmin, admin } from "../firebase-admin";

// ─── Per-user daily quota ──────────────────────────────────────────────────────

export const QUOTA_LIMITS: Record<string, number> = {
  roadmap:       parseInt(process.env.AI_QUOTA_ROADMAP       ?? "3"),
  stream:        parseInt(process.env.AI_QUOTA_STREAM        ?? "3"),
  coach:         parseInt(process.env.AI_QUOTA_COACH         ?? "10"),
  opportunities: parseInt(process.env.AI_QUOTA_OPPORTUNITIES ?? "20"),
  default:       parseInt(process.env.AI_QUOTA_DEFAULT       ?? "5"),
};

// In-memory fallback (used only when Firestore is unavailable)
const QUOTA_FALLBACK = new Map<string, { count: number; resetAt: number }>();

setInterval(() => {
  const now = Date.now();
  Array.from(QUOTA_FALLBACK.entries()).forEach(([key, entry]) => {
    if (now >= entry.resetAt) QUOTA_FALLBACK.delete(key);
  });
}, 60_000);

function getMidnight(): number {
  const d = new Date();
  d.setHours(24, 0, 0, 0);
  return d.getTime();
}

/** In-memory fallback quota check — single-instance, non-persistent. */
function quotaFallback(
  uid: string,
  operation: string,
): { allowed: boolean; remaining: number; resetAt: number } {
  const limit = QUOTA_LIMITS[operation] ?? QUOTA_LIMITS.default;
  const now = Date.now();
  const resetAt = getMidnight();
  const key = `${uid}:${operation}`;
  let entry = QUOTA_FALLBACK.get(key);
  if (!entry || now >= entry.resetAt) {
    entry = { count: 0, resetAt };
    QUOTA_FALLBACK.set(key, entry);
  }
  if (entry.count >= limit) return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  entry.count++;
  return { allowed: true, remaining: limit - entry.count, resetAt: entry.resetAt };
}

/**
 * Check and increment the per-user daily quota for the given operation.
 *
 * Uses Firestore transactions as primary storage so:
 *  1. Quota persists across server restarts.
 *  2. Multiple server instances share the same counter.
 *  3. Concurrent requests from the same user cannot both bypass the limit
 *     (Firestore transactions are serialised per document).
 *
 * Falls back to in-memory if Firestore is temporarily unavailable, so
 * legitimate users are never blocked due to infrastructure issues.
 */
export async function checkAndIncrementQuota(
  uid: string,
  operation: string,
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const limit = QUOTA_LIMITS[operation] ?? QUOTA_LIMITS.default;
  const now = Date.now();
  const resetAt = getMidnight();

  if (getFirebaseAdmin()) {
    try {
      const db = admin.firestore();
      const docRef = db.collection("ai_quotas").doc(uid);

      const result = await db.runTransaction(async (tx) => {
        const doc = await tx.get(docRef);
        const data = doc.exists ? (doc.data() ?? {}) : {};
        const field = data[operation] as { count: number; resetAt: number } | undefined;

        let count = 0;
        let windowResetAt = resetAt;
        if (field && field.resetAt > now) {
          count = field.count || 0;
          windowResetAt = field.resetAt;
        }

        if (count >= limit) {
          return { allowed: false, remaining: 0, resetAt: windowResetAt };
        }

        tx.set(
          docRef,
          {
            [operation]: { count: count + 1, resetAt: windowResetAt },
            _updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true },
        );

        return { allowed: true, remaining: limit - count - 1, resetAt: windowResetAt };
      });

      return result;
    } catch (err: any) {
      console.error("[AI QUOTA] Firestore error (falling back to in-memory):", err?.message);
    }
  }

  // Fallback — single instance, resets on restart
  return quotaFallback(uid, operation);
}

/**
 * Return a reserved quota unit when the provider call fails or produces no
 * usable result. Quota therefore measures successful AI work, not outages.
 */
export async function refundQuota(uid: string, operation: string): Promise<void> {
  const now = Date.now();
  if (getFirebaseAdmin()) {
    try {
      const docRef = admin.firestore().collection("ai_quotas").doc(uid);
      await admin.firestore().runTransaction(async (tx) => {
        const doc = await tx.get(docRef);
        const data = doc.exists ? (doc.data() ?? {}) : {};
        const field = data[operation] as { count: number; resetAt: number } | undefined;
        if (!field || field.resetAt <= now || field.count <= 0) return;
        tx.set(docRef, {
          [operation]: { ...field, count: Math.max(0, field.count - 1) },
          _updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
      });
      return;
    } catch (err: any) {
      console.error("[AI QUOTA] Firestore refund error (using in-memory fallback):", err?.message);
    }
  }

  const key = `${uid}:${operation}`;
  const entry = QUOTA_FALLBACK.get(key);
  if (entry && entry.resetAt > now && entry.count > 0) {
    entry.count--;
  }
}

// ─── Per-user concurrency guard ────────────────────────────────────────────────
// Prevents a single user from firing multiple simultaneous expensive AI calls
// against the same instance.  In-memory is intentional here: each instance
// independently enforces its own concurrency limit, which is correct and safe.
const IN_FLIGHT = new Set<string>(); // uid:operation

export function acquireConcurrencySlot(uid: string, operation: string): boolean {
  const key = `${uid}:${operation}`;
  if (IN_FLIGHT.has(key)) return false;
  IN_FLIGHT.add(key);
  return true;
}

export function releaseConcurrencySlot(uid: string, operation: string): void {
  IN_FLIGHT.delete(`${uid}:${operation}`);
}

// ─── Circuit breaker ───────────────────────────────────────────────────────────
// In-memory, intentional: if Anthropic is down, every instance will open its
// own circuit, which is the desired behaviour (no need to distribute this state).
let CONSECUTIVE_FAILURES = 0;
let CIRCUIT_OPEN_UNTIL   = 0;

const CB_THRESHOLD   = parseInt(process.env.AI_CB_THRESHOLD   ?? "5");
const CB_COOLDOWN_MS = parseInt(process.env.AI_CB_COOLDOWN_MS ?? "60000");

export function isCircuitOpen(): boolean {
  if (CIRCUIT_OPEN_UNTIL !== 0 && CIRCUIT_OPEN_UNTIL <= Date.now()) {
    CONSECUTIVE_FAILURES = 0;
    CIRCUIT_OPEN_UNTIL = 0;
    console.info("[AI CIRCUIT BREAKER] Cooldown complete; automatically allowing provider requests again.");
  }
  return CIRCUIT_OPEN_UNTIL > Date.now();
}

export function getCircuitStatus(): { open: boolean; openUntil: number; failures: number } {
  return { open: isCircuitOpen(), openUntil: CIRCUIT_OPEN_UNTIL, failures: CONSECUTIVE_FAILURES };
}

export function recordAISuccess(): void {
  CONSECUTIVE_FAILURES = 0;
  CIRCUIT_OPEN_UNTIL = 0;
}

export function recordAIFailure(): void {
  // Calls already in flight when the breaker opened must not extend its
  // cooldown indefinitely. After the fixed cooldown, the next call probes
  // the provider again and either succeeds or starts a fresh failure count.
  if (isCircuitOpen()) return;
  CONSECUTIVE_FAILURES++;
  if (CONSECUTIVE_FAILURES >= CB_THRESHOLD) {
    CIRCUIT_OPEN_UNTIL = Date.now() + CB_COOLDOWN_MS;
    console.error(
      `[AI CIRCUIT BREAKER] Opened after ${CONSECUTIVE_FAILURES} consecutive failures. ` +
      `Cooling down for ${CB_COOLDOWN_MS / 1000}s until ${new Date(CIRCUIT_OPEN_UNTIL).toISOString()}`,
    );
  }
}

// ─── Timeout wrapper ───────────────────────────────────────────────────────────
export const AI_TIMEOUT_MS = parseInt(process.env.AI_TIMEOUT_MS ?? "30000");

/**
 * Wrap any async AI function with a hard timeout.
 * Throws Error("AI_TIMEOUT") if the call takes longer than timeoutMs.
 */
export async function withAITimeout<T>(
  fn: () => Promise<T>,
  timeoutMs = AI_TIMEOUT_MS,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error("AI_TIMEOUT")), timeoutMs);
  });
  try {
    const result = await Promise.race([fn(), timeoutPromise]);
    if (timer !== null) clearTimeout(timer);
    return result;
  } catch (err) {
    if (timer !== null) clearTimeout(timer);
    throw err;
  }
}

// ─── Convenience: full gate (circuit + quota + concurrency) ───────────────────
/**
 * Run all AI pre-flight checks.  Now async because quota uses Firestore.
 * Returns null if all checks pass, or an { status, body } object to return
 * to the client immediately.
 *
 * Call this at the top of every authenticated AI endpoint:
 *   const gate = await aiGate(user.uid, "roadmap");
 *   if (gate) return res.status(gate.status).json(gate.body);
 */
export async function aiGate(
  uid: string,
  operation: string,
  options: { bypassQuota?: boolean } = {},
): Promise<{ status: number; body: object } | null> {
  if (isCircuitOpen()) {
    return {
      status: 503,
      body: {
        error: "ai_unavailable",
        message: "AI service is temporarily unavailable. Please try again in a minute.",
      },
    };
  }

  if (!acquireConcurrencySlot(uid, operation)) {
    return {
      status: 429,
      body: {
        error: "ai_busy",
        message: "You already have an AI request in progress. Please wait for it to finish.",
      },
    };
  }

  if (!options.bypassQuota) {
    const quota = await checkAndIncrementQuota(uid, operation);
    if (!quota.allowed) {
      releaseConcurrencySlot(uid, operation); // release — we're not starting a call
      const resetIn = Math.ceil((quota.resetAt - Date.now()) / 60000);
      return {
        status: 429,
        body: {
          error: "quota_exceeded",
          message: `Daily AI limit reached for this feature. Resets in ~${resetIn} minute${resetIn === 1 ? "" : "s"}.`,
          resetAt: quota.resetAt,
        },
      };
    }
  }

  return null; // all checks passed
}
