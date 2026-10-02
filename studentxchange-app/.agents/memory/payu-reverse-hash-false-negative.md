---
name: PayU reverse-hash false negatives
description: PayU callback reverse-hash can fail for legitimate payments; always fall back to the verify_payment server-to-server API.
---

A real production payment was rejected because `verifyReverseHash` mismatched on a
legitimate PayU success callback (formats vary with udf fields / additionalCharges),
leaving the user charged with no premium.

**Rule:** never treat a reverse-hash mismatch alone as final rejection for a payment
callback. Fall back to PayU's authoritative verify_payment API:
`sha512(key|verify_payment|txnid|salt)` POSTed to
`info.payu.in/merchant/postservice.php?form=2` (test.payu.in for sandbox), and use
PayU's returned amount/mihpayid, then run the normal amount + idempotent settlement.

**Why:** hash false negatives silently eat real customer money; the verify API asks
PayU directly, so forged callbacks still cannot pass it.

**How to apply:** any PayU surl handler — hash check first, verify API fallback on
mismatch, with a fetch timeout so the callback can't hang.
