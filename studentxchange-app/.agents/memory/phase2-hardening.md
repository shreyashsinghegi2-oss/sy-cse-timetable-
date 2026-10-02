---
name: Phase 2 Hardening — rate limiting, AI quota, public endpoints
description: Design decisions made during Phase 2 scalability hardening. Covers Postgres rate limiter, Firestore AI quota, public Claude endpoint protection.
---

## Postgres-backed rate limiter (server/utils/pg-rate-limiter.ts)

**Rule:** `rate_limit_store` table is CREATE IF NOT EXISTS at server startup (server/index.ts). The init call is deliberately NOT awaited — startup must not block if Postgres is slow. `tableReady` flag gates all queries.

**Why:** Persistent across restarts, multi-instance safe (atomic UPSERT), no new dependency (uses existing pool). Fails open on DB errors — infra issues never block users.

**How to apply:** Only used for critical/public-AI endpoints. Low-volume endpoints (auth, post, message) keep in-memory limiters for zero latency overhead.

## Firestore AI quota (server/utils/ai-guard.ts)

**Rule:** `checkAndIncrementQuota()` is now async. `aiGate()` is now async. All callers must `await aiGate(...)`. The Firestore `ai_quotas/{uid}` document is updated via `runTransaction()` to prevent race conditions.

**Why:** In-memory Map resets on restart and isn't shared between instances. Firestore transactions serialise concurrent requests from the same user — no double-quota bypass.

**How to apply:** Fallback to in-memory (QUOTA_FALLBACK Map) when Firestore unavailable (fail open). Concurrency guard (IN_FLIGHT) and circuit breaker stay in-memory intentionally.

**Recovery rule:** Provider failures and unusable AI responses must refund the reserved quota unit. An open circuit has a fixed cooldown: failures from already-running background requests must not extend it, and the first request after cooldown automatically probes Claude again.

**Why:** Billing exhaustion or a temporary Claude outage must not consume a student's daily allowance or require an application restart after credits are replenished.

## Public Claude endpoints (server/routes/lancing-ai.ts)

**Rule:** `/api/match` and `/api/lancing/search` are intentionally unauthenticated but now have: (1) `publicAILimiter` middleware (5/min by IP, Postgres-backed), (2) input validation (query max 200 chars, category allowlist), (3) circuit breaker check, (4) AI_TIMEOUT_MS hard timeout on each Claude call.

**Why:** Public endpoints can be abused to run up Anthropic bills. Caching in lancing-ai.ts means most real traffic hits cache, not Claude.

## ACTIVE_ATTEMPTS Map (server/routes/placement-readiness.ts)

**Rule:** This Map stores in-flight quiz attempts. If multi-instance is ever deployed WITHOUT sticky sessions, quiz submissions will fail with "attempt not found". Current single-instance deployment is safe.

**Action needed before horizontal scaling:** Move ACTIVE_ATTEMPTS to Redis or Firestore.

## Rate limit table direct-query test

The `node` script test fails ("relation does not exist") because it runs outside the server's secret-injected environment. Trust the "[PG RATE LIMITER] Table ready" server log as ground truth — the table IS created.
