import {
  CAREER_COMPASS_PREMIUM_PRICE,
  CAREER_COMPASS_PREMIUM_DURATION_DAYS,
} from "../config/career-compass-pricing";

export const CAREER_SUBSCRIPTIONS_COLLECTION = "career_compass_subscriptions";
export const CAREER_PAYMENTS_COLLECTION = "career_compass_payments";

type SignPayment = (
  key: string, txnid: string, amount: string, productinfo: string,
  firstname: string, email: string, salt: string,
) => string;

export function createCareerPremiumPayUForm(
  input: {
    key: string; salt: string; txnid: string; firstname: string; email: string;
    phone: string; callbackBaseUrl: string;
  },
  sign: SignPayment,
) {
  const amount = CAREER_COMPASS_PREMIUM_PRICE;
  const productinfo = "Career Compass Premium (1 Year)";
  return {
    key: input.key, txnid: input.txnid, amount, productinfo,
    firstname: input.firstname, email: input.email, phone: input.phone,
    surl: `${input.callbackBaseUrl}/api/career-compass/subscription/payu-callback`,
    furl: `${input.callbackBaseUrl}/api/career-compass/subscription/payu-failure`,
    hash: sign(input.key, input.txnid, amount, productinfo, input.firstname, input.email, input.salt),
    service_provider: "payu_paisa",
  };
}

// Strict decimal parsing avoids accepting strings such as "499tampered" or NaN.
export function amountInPaise(value: unknown): number | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const text = String(value).trim();
  if (!/^\d{1,9}(?:\.\d{1,2})?$/.test(text)) return null;
  const [rupees, fraction = ""] = text.split(".");
  const amount = Number(rupees) * 100 + Number(fraction.padEnd(2, "0"));
  return Number.isSafeInteger(amount) && amount > 0 ? amount : null;
}

type SettlementResult =
  | { ok: false; reason: string }
  | { ok: true; uid: string; returnTrack: string; alreadySettled: boolean };

type FirestoreValues = {
  now?: () => Date;
  timestamp: (date: Date) => unknown;
  serverTimestamp: () => unknown;
  deleteField: () => unknown;
};

/** Only call after PayU has authenticated a successful payment. */
export async function settleCareerPremiumPayment(
  db: any,
  payment: { txnid: string; verifiedAmount: unknown; mihpayid?: unknown },
  values: FirestoreValues,
): Promise<SettlementResult> {
  if (!/^[a-zA-Z0-9_-]{1,160}$/.test(payment.txnid)) return { ok: false, reason: "invalid-txnid" };
  const paid = amountInPaise(payment.verifiedAmount);
  if (paid === null) return { ok: false, reason: "invalid-paid-amount" };
  const payRef = db.collection(CAREER_PAYMENTS_COLLECTION).doc(payment.txnid);
  return db.runTransaction(async (tx: any): Promise<SettlementResult> => {
    const paySnap = await tx.get(payRef);
    if (!paySnap.exists) return { ok: false, reason: "unknown-txnid" };
    const data = paySnap.data() || {};
    const uid = data.uid;
    if (typeof uid !== "string" || !uid) return { ok: false, reason: "no-uid" };

    // A transaction initiated at ₹299 remains valid after the current price changes.
    // Never reprice it or validate it against the current plan configuration.
    const expected = amountInPaise(data.amount);
    if (expected === null || paid !== expected) return { ok: false, reason: "amount-mismatch" };
    const returnTrack = data.returnTrack === "institutional" ? "institutional" : "personal";
    const status = String(data.status || "").toLowerCase();
    if (status === "success") return { ok: true, uid, returnTrack, alreadySettled: true };
    // An unverified/out-of-order failure notification cannot block a later verified success.
    if (!["initiated", "pending", "failed"].includes(status)) {
      return { ok: false, reason: `bad-status:${status}` };
    }
    const now = values.now?.() || new Date();
    const expiry = new Date(now.getTime() + CAREER_COMPASS_PREMIUM_DURATION_DAYS * 24 * 60 * 60 * 1000);
    tx.set(db.collection(CAREER_SUBSCRIPTIONS_COLLECTION).doc(uid), {
      uid, subscriptionType: "PREMIUM", isPremium: true, paymentStatus: "success",
      transactionId: payment.txnid,
      paymentId: typeof payment.mihpayid === "string" ? payment.mihpayid : null,
      paymentGateway: "PayU",
      amount: data.amount,
      purchaseDate: values.timestamp(now), expiryDate: values.timestamp(expiry),
      pendingTxnid: values.deleteField(), updatedAt: values.serverTimestamp(),
    }, { merge: true });
    tx.set(payRef, {
      status: "success",
      mihpayid: typeof payment.mihpayid === "string" ? payment.mihpayid : null,
      completedAt: values.serverTimestamp(),
    }, { merge: true });
    return { ok: true, uid, returnTrack, alreadySettled: false };
  });
}

/** Failure is advisory; it must never overwrite a settled payment or revoke access. */
export async function recordCareerPremiumFailure(
  db: any, txnid: unknown, serverTimestamp: () => unknown,
): Promise<void> {
  if (typeof txnid !== "string" || !/^[a-zA-Z0-9_-]{1,160}$/.test(txnid)) return;
  const ref = db.collection(CAREER_PAYMENTS_COLLECTION).doc(txnid);
  await db.runTransaction(async (tx: any) => {
    const snap = await tx.get(ref);
    if (!snap.exists) return;
    const status = String(snap.data()?.status || "").toLowerCase();
    if (!["initiated", "pending", "failed"].includes(status)) return;
    tx.set(ref, { status: "failed", failedAt: serverTimestamp() }, { merge: true });
  });
}