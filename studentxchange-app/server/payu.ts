import { Request, Response } from "express";
import crypto from "crypto";
import { storage } from "./storage";

const { PAYU_MERCHANT_KEY, PAYU_SALT, PAYU_BASE_URL } = process.env;

const verifiedTransactions = new Map<string, { mihpayid: string; amount: string; status: string; verifiedAt: number }>();

const VERIFIED_TTL_MS = 30 * 60 * 1000;

function cleanupOldTransactions() {
  const now = Date.now();
  const keys = Array.from(verifiedTransactions.keys());
  for (const key of keys) {
    const value = verifiedTransactions.get(key);
    if (value && now - value.verifiedAt > VERIFIED_TTL_MS) {
      verifiedTransactions.delete(key);
    }
  }
}

setInterval(cleanupOldTransactions, 5 * 60 * 1000);

export function generateHash(
  key: string,
  txnid: string,
  amount: string,
  productinfo: string,
  firstname: string,
  email: string,
  salt: string
): string {
  const hashString = `${key}|${txnid}|${amount}|${productinfo}|${firstname}|${email}|||||||||||${salt}`;
  return crypto.createHash("sha512").update(hashString).digest("hex");
}

export function verifyReverseHash(
  salt: string,
  status: string,
  email: string,
  firstname: string,
  productinfo: string,
  amount: string,
  txnid: string,
  key: string,
  additionalCharges: string,
  receivedHash: string
): boolean {
  let reverseHashString: string;
  if (additionalCharges) {
    reverseHashString = `${additionalCharges}|${salt}|${status}|||||||||||${email}|${firstname}|${productinfo}|${amount}|${txnid}|${key}`;
  } else {
    reverseHashString = `${salt}|${status}|||||||||||${email}|${firstname}|${productinfo}|${amount}|${txnid}|${key}`;
  }
  const calculatedHash = crypto.createHash("sha512").update(reverseHashString).digest("hex");
  return calculatedHash === receivedHash;
}

// Server-to-server verification with PayU's verify_payment API. This is the
// authoritative check: it asks PayU directly whether a txnid succeeded, so it
// works even when the reverse-hash format mismatches (false negatives).
export async function verifyPaymentWithPayU(txnid: string): Promise<{ verified: boolean; status?: string; amount?: string; mihpayid?: string }> {
  try {
    if (!PAYU_MERCHANT_KEY || !PAYU_SALT) return { verified: false };
    const command = "verify_payment";
    const hash = crypto.createHash("sha512")
      .update(`${PAYU_MERCHANT_KEY}|${command}|${txnid}|${PAYU_SALT}`)
      .digest("hex");
    const isTest = (PAYU_BASE_URL || "").includes("test");
    const apiUrl = isTest
      ? "https://test.payu.in/merchant/postservice.php?form=2"
      : "https://info.payu.in/merchant/postservice.php?form=2";
    const body = new URLSearchParams({ key: PAYU_MERCHANT_KEY, command, var1: txnid, hash });
    const resp = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
      signal: AbortSignal.timeout(15000),
    });
    if (!resp.ok) return { verified: false };
    const data: any = await resp.json();
    const details = data?.transaction_details?.[txnid];
    if (!details) return { verified: false };
    const status = String(details.status || "").toLowerCase();
    return {
      verified: status === "success",
      status,
      amount: details.amt || details.amount,
      mihpayid: details.mihpayid,
    };
  } catch (err: any) {
    console.error("[PAYU] verify_payment API error:", err?.message);
    return { verified: false };
  }
}

export function isTransactionVerified(txnid: string): boolean {
  return verifiedTransactions.has(txnid);
}

export function getVerifiedTransaction(txnid: string) {
  return verifiedTransactions.get(txnid);
}

export function consumeVerifiedTransaction(txnid: string) {
  const data = verifiedTransactions.get(txnid);
  if (data) {
    verifiedTransactions.delete(txnid);
  }
  return data;
}

export async function initiatePayUPayment(req: Request, res: Response) {
  try {
    // SECURITY: never trust the client-supplied `amount`.  Look up the order
    // total from the database using pendingOrderId.  A client that sends
    // amount=1 for a ₹10,000 order would receive a PayU hash for ₹1, pay ₹1,
    // and get the callback verified — paying essentially nothing.
    const { productinfo, firstname, email, phone, pendingOrderId } = req.body;

    if (!productinfo || !firstname || !email) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: productinfo, firstname, email",
      });
    }

    if (!pendingOrderId) {
      return res.status(400).json({
        success: false,
        message: "Missing pendingOrderId. Order must be created before payment.",
      });
    }

    // Look up the authoritative order total server-side
    const order = await storage.getOrder(parseInt(pendingOrderId));
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found. Please create an order first.",
      });
    }
    if (order.status !== "pending_payment") {
      return res.status(400).json({
        success: false,
        message: "Order is not awaiting payment.",
      });
    }
    const serverAmount = parseFloat(order.totalAmount.toString());
    if (!serverAmount || serverAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Order has an invalid total amount.",
      });
    }

    if (!PAYU_MERCHANT_KEY || !PAYU_SALT || !PAYU_BASE_URL) {
      console.error("[PAYU] Missing configuration:", {
        hasKey: !!PAYU_MERCHANT_KEY,
        hasSalt: !!PAYU_SALT,
        hasBaseUrl: !!PAYU_BASE_URL,
      });
      return res.status(500).json({
        success: false,
        message: "PayU configuration missing. Please contact support.",
      });
    }

    const txnid = `txn_${Date.now()}_${pendingOrderId}`;
    const amountStr = serverAmount.toFixed(2);

    const hash = generateHash(
      PAYU_MERCHANT_KEY,
      txnid,
      amountStr,
      productinfo,
      firstname,
      email,
      PAYU_SALT
    );

    const updatedOrder = await storage.updateOrder(pendingOrderId, {
      paymentId: txnid,
    });

    if (!updatedOrder) {
      console.error("[PAYU STAGE 2] Failed to store txnid on pending order:", pendingOrderId);
      return res.status(404).json({
        success: false,
        message: "Pending order not found. Please try again.",
      });
    }

    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
    const host = req.get('host');
    const baseUrl = host ? `${protocol}://${host}` : 'https://localhost:5000';
    const formData = {
      key: PAYU_MERCHANT_KEY,
      txnid,
      amount: amountStr,
      productinfo,
      firstname,
      email,
      phone: phone || "",
      surl: `${baseUrl}/api/payu/payment-success`,
      furl: `${baseUrl}/api/payu/payment-failure`,
      hash,
      service_provider: "payu_paisa",
    };

    res.status(200).json({
      success: true,
      formData,
      payuBaseUrl: PAYU_BASE_URL,
      txnid,
      pendingOrderId,
    });
  } catch (error: any) {
    console.error("[PAYU STAGE 2] Error initiating payment:", error);
    res.status(500).json({
      success: false,
      message: error?.message || "Failed to initiate PayU payment",
    });
  }
}

export async function handlePaymentSuccess(req: Request, res: Response) {
  try {
    const { txnid, mihpayid, status, hash, amount, productinfo, firstname, email, additionalCharges } = req.body;

    if (!PAYU_SALT || !PAYU_MERCHANT_KEY) {
      console.error("[PAYU STAGE 3] Missing PayU configuration for hash verification");
      return res.redirect("/payment-failure?error=config");
    }

    const isValid = verifyReverseHash(
      PAYU_SALT, status, email, firstname, productinfo, amount, txnid, PAYU_MERCHANT_KEY, additionalCharges || "", hash
    );

    if (!isValid) {
      console.error("[PAYU STAGE 3] Hash verification FAILED for txnid:", txnid, "- possible tampered response");
      return res.redirect("/payment-failure?error=verification");
    }

    verifiedTransactions.set(txnid, {
      mihpayid,
      amount,
      status,
      verifiedAt: Date.now(),
    });

    res.redirect(`/payment-success?txnid=${txnid}&mihpayid=${mihpayid}&status=${status}&amount=${amount}`);
  } catch (error) {
    console.error("[PAYU STAGE 3] Error in payment success handler:", error);
    res.redirect("/payment-failure?error=server");
  }
}

export async function handlePaymentFailure(req: Request, res: Response) {
  try {
    const { txnid, error_Message, status } = req.body;

    res.redirect(`/payment-failure?txnid=${txnid}&error=${encodeURIComponent(error_Message || "Payment failed")}`);
  } catch (error) {
    console.error("[PAYU] Error in payment failure handler:", error);
    res.redirect("/payment-failure?error=server");
  }
}

export function getPayUConfig(req: Request, res: Response) {
  res.status(200).json({
    configured: !!(PAYU_MERCHANT_KEY && PAYU_SALT && PAYU_BASE_URL),
  });
}
