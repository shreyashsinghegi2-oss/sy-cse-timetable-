---
name: ACTIVE_ATTEMPTS Firestore migration
description: Placement-readiness skill attempts moved from in-memory Map to Firestore active_skill_attempts collection for multi-instance safety
---

## Rule
`active_skill_attempts/{attempt_id}` in Firestore holds each in-progress skill attempt. Submit uses `db.runTransaction` to atomically mark `submitted_at` — preventing duplicate submissions across concurrent requests and across server instances.

**Why:** The in-memory Map broke under horizontal scaling — Instance A starts attempt, Instance B gets submit request, 404. Firestore is already available; no new infrastructure needed.

**How to apply:**
- Periodic cleanup job (10-min interval) deletes docs where `expires_at < Date.now()` (limit 50 per sweep). Runs on all instances; idempotent.
- `expires_at` is always server-computed (`Date.now() + time_sec * 2 * 1000`); client never touches it.
- Transaction error codes: `not_found`, `forbidden`, `already_submitted`, `expired` → mapped to HTTP 404/403/400.
- After successful submit, `attemptRef.delete()` is called (fire-and-forget — cleanup job handles any stragglers).
- `correct_map` stays in Firestore doc (server-only); never sent to client.
