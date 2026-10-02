---
name: PayU subscription callback idempotency
description: Why Career Compass premium PayU callbacks must settle inside a transaction with a one-time status transition.
---

PayU success callbacks (surl) carry no auth session — the user is resolved via the
payment record keyed by `txnid` (`career_compass_payments/{txnid}`). Reverse-hash +
amount verification alone is NOT enough: a valid callback payload can be replayed.

**Rule:** grant/extend premium only inside a Firestore transaction that transitions
a recoverable payment state to `success` exactly once after PayU confirms success. If already `success`,
return the success path but do NOT re-write purchaseDate/expiryDate. The initiate
endpoint must seed the payment doc with `status: "initiated"` so the transition exists.

**Why:** without the one-time state transition, re-POSTing a previously valid callback
extends the subscription for free (payment replay). Recomputing expiry from `now` on
every callback is the trap.

**How to apply:** any gateway-callback path that has no auth token and grants a paid
entitlement needs an idempotency guard on its persisted payment record, not just
signature/amount checks.

Validate the authenticated amount against the amount saved when that individual transaction was initiated, never the current plan price. Retain its original amount when granting the entitlement. Missing stored amounts must fail closed.

**Why:** a price cutover must not reject callbacks from legitimate in-flight purchases at the old price or rewrite historical payment truth.

**How to apply:** centralize the current price for new checkout creation and public UI configuration, but use the persisted transaction price during settlement. Pricing changes do not migrate existing paid access or expiry.

A failure notification is advisory: it must not overwrite success or revoke access. A previously failed transaction may settle only after an authenticated success, with the same amount/idempotency checks.

**Why:** failure callbacks may be unverified or arrive out of order; treating them as irreversible blocks a legitimate later success.

**How to apply:** guard failure writes transactionally, and let verified success supersede a recoverable failure exactly once. After a failed reverse hash, the verification API must supply the trusted amount; never fall back to the unauthenticated callback amount.
