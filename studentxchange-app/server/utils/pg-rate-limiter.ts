/**
 * Postgres-backed distributed rate limiter.
 *
 * Design goals:
 *  • Persistent — limits survive server restarts.
 *  • Multi-instance safe — one atomic UPSERT per request, no TOCTOU race.
 *  • Fail-open — if Postgres is temporarily unavailable, requests are
 *    allowed through rather than blocking legitimate users due to infra issues.
 *  • Zero new dependencies — uses the existing `pool` from server/db.ts.
 *
 * Table: rate_limit_store
 *   key        TEXT PRIMARY KEY   — "category:identifier" composite key
 *   count      INTEGER            — requests in current window
 *   reset_at   TIMESTAMPTZ        — when the window expires
 *
 * The UPSERT atomically resets the count when the window expires, so there
 * is no separate "reset" job needed.  A periodic DELETE still runs to keep
 * the table small.
 */

import { pool } from "../db";

let tableReady = false;

/**
 * Call once at server startup (before accepting requests).
 * Safe to call multiple times — CREATE TABLE IF NOT EXISTS is idempotent.
 */
export async function initRateLimitTable(): Promise<void> {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS rate_limit_store (
        key       TEXT        PRIMARY KEY,
        count     INTEGER     NOT NULL DEFAULT 0,
        reset_at  TIMESTAMPTZ NOT NULL
      )
    `);
    tableReady = true;
    console.log("[PG RATE LIMITER] Table ready");

    // Prune expired rows every 10 minutes to prevent unbounded growth
    setInterval(() => {
      pool.query("DELETE FROM rate_limit_store WHERE reset_at < NOW()").catch((e) =>
        console.error("[PG RATE LIMITER] Prune error:", e?.message),
      );
    }, 10 * 60 * 1000);
  } catch (err: any) {
    console.error(
      "[PG RATE LIMITER] Table init failed — critical endpoints will fall back to in-memory:",
      err?.message,
    );
  }
}

/**
 * Atomic check-and-increment.
 *
 * Returns { allowed, remaining, resetAt }.
 * `allowed` is false when the caller has exceeded `limit` requests in the
 * current `windowMs`-millisecond window.
 *
 * Thread safety: the single SQL UPSERT is atomic at the database level, so
 * two simultaneous requests from different server instances cannot both
 * read count=0 and both increment to 1 — one will win the conflict and
 * the loser will increment the already-inserted row.
 */
export async function pgCheckRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  if (!tableReady) {
    // Table not initialised yet — fail open
    return { allowed: true, remaining: limit, resetAt: Date.now() + windowMs };
  }

  const windowEnd = new Date(Date.now() + windowMs);

  try {
    const { rows } = await pool.query<{ count: string; reset_ms: string }>(
      `INSERT INTO rate_limit_store (key, count, reset_at)
       VALUES ($1, 1, $2)
       ON CONFLICT (key) DO UPDATE
         SET count    = CASE
                          WHEN rate_limit_store.reset_at < NOW() THEN 1
                          ELSE LEAST(rate_limit_store.count + 1, $3::integer + 1)
                        END,
             reset_at = CASE
                          WHEN rate_limit_store.reset_at < NOW() THEN $2
                          ELSE rate_limit_store.reset_at
                        END
       RETURNING count,
                 (EXTRACT(EPOCH FROM reset_at) * 1000)::bigint AS reset_ms`,
      [key, windowEnd, limit],
    );

    const count   = parseInt(rows[0].count,    10);
    const resetAt = parseInt(rows[0].reset_ms, 10);

    return {
      allowed:   count <= limit,
      remaining: Math.max(0, limit - count),
      resetAt,
    };
  } catch (err: any) {
    console.error("[PG RATE LIMITER] DB error (failing open):", err?.message);
    return { allowed: true, remaining: 1, resetAt: Date.now() + windowMs };
  }
}
