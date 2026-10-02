import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { getCareerCompassPricing } from "../config/career-compass-pricing";
import {
  amountInPaise, createCareerPremiumPayUForm, settleCareerPremiumPayment, recordCareerPremiumFailure,
  CAREER_PAYMENTS_COLLECTION as PAYMENTS, CAREER_SUBSCRIPTIONS_COLLECTION as SUBSCRIPTIONS,
} from "./career-compass-payment";

const now = new Date("2026-10-01T10:00:00.000Z");
const values = {
  now: () => now,
  timestamp: (date: Date) => date.toISOString(),
  serverTimestamp: () => "server-time",
  deleteField: () => "__delete__",
};

function fakeFirestore(seed: Record<string, Record<string, unknown>> = {}) {
  const records = new Map(Object.entries(seed).map(([key, data]) => [key, { ...data }]));
  const writes: Array<{ key: string; data: Record<string, unknown> }> = [];
  let queue: Promise<unknown> = Promise.resolve();
  const db = {
    collection: (name: string) => ({ doc: (id: string) => ({ key: `${name}/${id}` }) }),
    runTransaction: (operation: (tx: any) => Promise<unknown>) => {
      const work = queue.then(async () => {
        const staged: typeof writes = [];
        const result = await operation({
          get: async (ref: { key: string }) => ({
            exists: records.has(ref.key),
            data: () => ({ ...records.get(ref.key) }),
          }),
          set: (ref: { key: string }, data: Record<string, unknown>) => staged.push({ key: ref.key, data }),
        });
        for (const write of staged) {
          const next = { ...records.get(write.key), ...write.data };
          for (const [field, value] of Object.entries(next)) if (value === "__delete__") delete next[field];
          records.set(write.key, next);
          writes.push(write);
        }
        return result;
      });
      queue = work.catch(() => {});
      return work;
    },
  };
  return { db, records, writes };
}

function initiated(amount = "499.00", status = "initiated") {
  return { uid: "student", amount, status, returnTrack: "institutional", createdAt: "before-change" };
}
const payment = { txnid: "ccsub_test", verifiedAmount: "499.00", mihpayid: "gateway-test" };

test("the current public plan is ₹499 for the unchanged 365-day entitlement", () => {
  const pricing = getCareerCompassPricing();
  assert.equal(pricing.amount, "499.00");
  assert.equal(pricing.displayPrice, "₹499");
  assert.equal(pricing.priceLabel, "₹499/year");
  assert.equal(pricing.durationDays, 365);
  assert.ok(pricing.freeFeatures.includes("AI career roadmap"));
  assert.ok(pricing.premiumFeatures.includes("Placement Readiness"));
});

test("PayU payload and signature use server pricing, ignoring a supplied client amount", () => {
  let signedAmount = "";
  const form = createCareerPremiumPayUForm({
    key: "test-key", salt: "test-salt", txnid: "ccsub_test", firstname: "Test",
    email: "student@example.test", phone: "", callbackBaseUrl: "https://example.test",
    amount: "1.00",
  } as any, (...args) => {
    signedAmount = args[2];
    const [key, txnid, amount, productinfo, firstname, email, salt] = args;
    return createHash("sha512").update(
      `${key}|${txnid}|${amount}|${productinfo}|${firstname}|${email}|||||||||||${salt}`,
    ).digest("hex");
  });
  assert.equal(form.amount, "499.00");
  assert.equal(signedAmount, "499.00");
  assert.equal(form.hash.length, 128);
  assert.equal(form.surl, "https://example.test/api/career-compass/subscription/payu-callback");
  assert.equal(form.furl, "https://example.test/api/career-compass/subscription/payu-failure");
  assert.equal("salt" in form, false);
});

test("money parsing fails closed on missing or malformed amounts", () => {
  for (const value of ["499x", "499.001", "-499", "0", "", null, undefined, NaN, Infinity, {}, "4.99e2"]) {
    assert.equal(amountInPaise(value), null);
  }
  assert.equal(amountInPaise("499"), 49900);
  assert.equal(amountInPaise("499.00"), 49900);
  assert.equal(amountInPaise(299), 29900);
});

test("a new ₹499 payment activates Premium and expires exactly 365 days later", async () => {
  const f = fakeFirestore({ [`${PAYMENTS}/ccsub_test`]: initiated() });
  const result = await settleCareerPremiumPayment(f.db, payment, values);
  assert.deepEqual(result, { ok: true, uid: "student", returnTrack: "institutional", alreadySettled: false });
  const subscription = f.records.get(`${SUBSCRIPTIONS}/student`)!;
  assert.equal(subscription.isPremium, true);
  assert.equal(subscription.amount, "499.00");
  assert.equal(subscription.expiryDate, "2027-10-01T10:00:00.000Z");
  assert.equal(subscription.purchaseDate, now.toISOString());
  assert.equal(f.records.get(`${PAYMENTS}/ccsub_test`)?.status, "success");
});

test("an in-flight legacy ₹299 transaction settles at ₹299 after the price change", async () => {
  const f = fakeFirestore({ [`${PAYMENTS}/ccsub_test`]: initiated("299.00") });
  assert.equal((await settleCareerPremiumPayment(f.db, { ...payment, verifiedAmount: "299.00" }, values)).ok, true);
  assert.equal(f.records.get(`${PAYMENTS}/ccsub_test`)?.amount, "299.00");
  assert.equal(f.records.get(`${PAYMENTS}/ccsub_test`)?.createdAt, "before-change");
  assert.equal(f.records.get(`${SUBSCRIPTIONS}/student`)?.amount, "299.00");
});

test("underpaid and mismatched amounts never activate a new ₹499 transaction", async () => {
  for (const amount of ["299.00", "498.00", "498.99", "499.01", "499evil", ""]) {
    const f = fakeFirestore({ [`${PAYMENTS}/ccsub_test`]: initiated() });
    assert.equal((await settleCareerPremiumPayment(f.db, { ...payment, verifiedAmount: amount }, values)).ok, false);
    assert.equal(f.writes.length, 0);
    assert.equal(f.records.has(`${SUBSCRIPTIONS}/student`), false);
  }
});

test("unknown and incomplete transaction records cannot activate Premium", async () => {
  for (const row of [undefined, { uid: "student", status: "initiated" }, { amount: "499.00", status: "initiated" }]) {
    const f = fakeFirestore(row ? { [`${PAYMENTS}/ccsub_test`]: row } : {});
    assert.equal((await settleCareerPremiumPayment(f.db, payment, values)).ok, false);
    assert.equal(f.writes.length, 0);
  }
});

test("sequential and concurrent success callbacks grant Premium only once", async () => {
  const f = fakeFirestore({ [`${PAYMENTS}/ccsub_test`]: initiated() });
  const results = await Promise.all([
    settleCareerPremiumPayment(f.db, payment, values),
    settleCareerPremiumPayment(f.db, payment, { ...values, now: () => new Date("2026-11-01") }),
  ]);
  assert.equal(results.filter((r) => r.ok && !r.alreadySettled).length, 1);
  assert.equal(f.writes.filter((w) => w.key === `${SUBSCRIPTIONS}/student`).length, 1);
  const before = { ...f.records.get(`${SUBSCRIPTIONS}/student`) };
  await settleCareerPremiumPayment(f.db, payment, { ...values, now: () => new Date("2026-12-01") });
  assert.deepEqual(f.records.get(`${SUBSCRIPTIONS}/student`), before);
});

test("replaying an old settled ₹299 payment preserves access, dates and history", async () => {
  const previous = { isPremium: true, subscriptionType: "PREMIUM", amount: "299.00",
    purchaseDate: "2026-09-01T00:00:00.000Z", expiryDate: "2027-09-01T00:00:00.000Z" };
  const f = fakeFirestore({
    [`${PAYMENTS}/ccsub_test`]: initiated("299.00", "success"),
    [`${SUBSCRIPTIONS}/student`]: previous,
  });
  const result = await settleCareerPremiumPayment(f.db, { ...payment, verifiedAmount: "299.00" }, values);
  assert.ok(result.ok && result.alreadySettled);
  assert.deepEqual(f.records.get(`${SUBSCRIPTIONS}/student`), previous);
  assert.equal(f.writes.length, 0);
});

test("failure does not activate Premium or create a record for unknown transactions", async () => {
  const f = fakeFirestore({ [`${PAYMENTS}/ccsub_test`]: initiated() });
  await recordCareerPremiumFailure(f.db, "unknown", values.serverTimestamp);
  assert.equal(f.writes.length, 0);
  await recordCareerPremiumFailure(f.db, "ccsub_test", values.serverTimestamp);
  assert.equal(f.records.get(`${PAYMENTS}/ccsub_test`)?.status, "failed");
  assert.equal(f.records.has(`${SUBSCRIPTIONS}/student`), false);
});

test("a delayed failure cannot overwrite a successful payment or revoke its access", async () => {
  const f = fakeFirestore({ [`${PAYMENTS}/ccsub_test`]: initiated() });
  await settleCareerPremiumPayment(f.db, payment, values);
  const before = { ...f.records.get(`${SUBSCRIPTIONS}/student`) };
  const writes = f.writes.length;
  await recordCareerPremiumFailure(f.db, "ccsub_test", values.serverTimestamp);
  assert.equal(f.records.get(`${PAYMENTS}/ccsub_test`)?.status, "success");
  assert.deepEqual(f.records.get(`${SUBSCRIPTIONS}/student`), before);
  assert.equal(f.writes.length, writes);
});

test("verified success can recover from an earlier advisory failure exactly once", async () => {
  const f = fakeFirestore({ [`${PAYMENTS}/ccsub_test`]: initiated("299.00") });
  await recordCareerPremiumFailure(f.db, "ccsub_test", values.serverTimestamp);
  const paid = { ...payment, verifiedAmount: "299.00" };
  assert.equal((await settleCareerPremiumPayment(f.db, paid, values)).ok, true);
  await settleCareerPremiumPayment(f.db, paid, values);
  assert.equal(f.writes.filter((w) => w.key === `${SUBSCRIPTIONS}/student`).length, 1);
});

test("processing a new buyer leaves unrelated existing subscribers and history unchanged", async () => {
  const previous = { isPremium: true, amount: "299.00", expiryDate: "2027-09-01" };
  const oldPayment = { uid: "old_student", amount: "299.00", status: "success" };
  const f = fakeFirestore({
    [`${PAYMENTS}/ccsub_test`]: initiated(),
    [`${PAYMENTS}/ccsub_old`]: oldPayment,
    [`${SUBSCRIPTIONS}/old_student`]: previous,
  });
  await settleCareerPremiumPayment(f.db, payment, values);
  assert.deepEqual(f.records.get(`${SUBSCRIPTIONS}/old_student`), previous);
  assert.deepEqual(f.records.get(`${PAYMENTS}/ccsub_old`), oldPayment);
});