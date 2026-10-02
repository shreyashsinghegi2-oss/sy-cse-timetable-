import { useLocation } from "wouter";
import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Loader2, AlertTriangle } from "lucide-react";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useSimpleToast } from "@/hooks/use-simple-toast";
import { trackEvent } from "@/lib/analytics";

export default function PaymentSuccessPage() {
  const [, navigate] = useLocation();
  const { toast } = useSimpleToast();
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [orderId, setOrderId] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const hasVerified = useRef(false);

  const urlParams = new URLSearchParams(window.location.search);
  const txnid = urlParams.get('txnid');
  const mihpayid = urlParams.get('mihpayid');

  useEffect(() => {
    if (hasVerified.current) return;
    hasVerified.current = true;

    const verifyAndUpdateOrder = async () => {
      try {
        if (!txnid) {
          setErrorMsg("Payment verification data missing. Please contact support at 7039862086.");
          setStatus('error');
          return;
        }

        // Lancing application fee flow — redeem the txn into a paid pass and bounce back
        if (txnid.startsWith("lancingapp_")) {
          try {
            const { auth } = await import("@/lib/firebase");
            // Wait briefly for Firebase auth to rehydrate after the PayU redirect
            const u = await new Promise<any>((resolve) => {
              if (auth.currentUser) return resolve(auth.currentUser);
              const unsub = auth.onAuthStateChanged((firebaseUser) => {
                unsub();
                resolve(firebaseUser);
              });
              setTimeout(() => resolve(auth.currentUser), 4000);
            });
            const token = u ? await u.getIdToken() : null;
            const r = await fetch("/api/lancing/apply-counter/redeem", {
              method: "POST",
              headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
              body: JSON.stringify({ txnid }),
            });
            if (!r.ok && r.status !== 409) {
              const data = await r.json().catch(() => ({}));
              throw new Error(data?.error || "Could not credit your application pass");
            }
            setOrderId(`PASS-${txnid.slice(-8)}`);
            setStatus('success');
            toast({ title: "Application pass added!", description: "Returning you to your dashboard..." });
            const intentRaw = localStorage.getItem("lancing_post_payment_intent");
            let target = "/lancing/freelancer-dashboard";
            if (intentRaw) {
              try {
                const intent = JSON.parse(intentRaw);
                if (intent?.type === "internship") target = "/lancing/internships";
                else if (intent?.type === "ai_match") target = "/lancing/ai-match";
              } catch {}
              localStorage.removeItem("lancing_post_payment_intent");
            }
            setTimeout(() => navigate(target), 2000);
          } catch (e: any) {
            setErrorMsg(e?.message || "Pass redemption failed");
            setStatus('error');
          }
          return;
        }

        const savedData = sessionStorage.getItem('payuCheckoutData');
        const checkoutData = savedData ? JSON.parse(savedData) : {};

        const response = await apiRequest("POST", "/api/payu/verify", {
          txnid,
          mihpayid,
        });

        if (response && response.success && response.id) {
          trackEvent('purchase', 'ecommerce', `order_${response.id}`, checkoutData.totalAmount || 0);

          sessionStorage.removeItem('payuCheckoutData');
          sessionStorage.removeItem('buyNowCheckout');
          const userId = checkoutData.userId;
          if (userId) {
            queryClient.invalidateQueries({ queryKey: [`/api/orders/${userId}`] });
            queryClient.invalidateQueries({ queryKey: [`/api/cart/${userId}`] });
          }
          queryClient.invalidateQueries({ queryKey: ['/api/products'] });
          queryClient.invalidateQueries({ queryKey: ['/api/admin/orders'] });
          queryClient.invalidateQueries({ queryKey: ['/api/orders'] });

          setOrderId(`TXN-${response.id.toString().padStart(6, '0')}`);
          setStatus('success');

          toast({
            title: "Order Placed Successfully!",
            description: `Order #TXN-${response.id.toString().padStart(6, '0')} is confirmed and paid.`,
          });

          setTimeout(() => {
            navigate("/marketplace");
          }, 4000);
        } else {
          throw new Error(response?.message || "Order verification failed");
        }
      } catch (error: any) {
        console.error("[PAYU STAGE 4] Verification error:", error);
        const msg = error?.message || "Unknown error";
        setErrorMsg(msg);
        setStatus('error');
      }
    };

    verifyAndUpdateOrder();
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto">
          {status === 'verifying' && (
            <Card className="text-center">
              <CardHeader>
                <div className="mx-auto mb-4">
                  <Loader2 className="h-16 w-16 text-blue-500 animate-spin" />
                </div>
                <CardTitle className="text-2xl text-blue-600">Confirming Your Payment...</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-600">
                  Payment received! Verifying and updating your order. Please don't close this page.
                </p>
                {txnid && (
                  <div className="bg-gray-50 rounded-lg p-4 text-left">
                    <p className="text-sm text-gray-500">Transaction ID</p>
                    <p className="font-mono text-sm">{txnid}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {status === 'success' && (
            <Card className="text-center">
              <CardHeader>
                <div className="mx-auto mb-4">
                  <CheckCircle className="h-16 w-16 text-green-500" />
                </div>
                <CardTitle className="text-2xl text-green-600">Payment Successful!</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-600">
                  Your order has been confirmed and is now being processed.
                </p>

                {orderId && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-left">
                    <p className="text-sm text-green-600 font-medium">Order Number</p>
                    <p className="font-mono text-lg font-bold text-green-800">{orderId}</p>
                  </div>
                )}

                {txnid && (
                  <div className="bg-gray-50 rounded-lg p-4 text-left">
                    <p className="text-sm text-gray-500">Transaction ID</p>
                    <p className="font-mono text-sm">{txnid}</p>
                  </div>
                )}

                {mihpayid && (
                  <div className="bg-gray-50 rounded-lg p-4 text-left">
                    <p className="text-sm text-gray-500">PayU Reference (mihpayid)</p>
                    <p className="font-mono text-sm">{mihpayid}</p>
                  </div>
                )}

                <p className="text-sm text-gray-500">Redirecting to marketplace in a few seconds...</p>

                <div className="flex flex-col gap-2 pt-4">
                  <Button onClick={() => navigate("/orders")} className="w-full">
                    View My Orders
                  </Button>
                  <Button variant="outline" onClick={() => navigate("/marketplace")} className="w-full">
                    Back to Marketplace
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {status === 'error' && (
            <Card className="text-center">
              <CardHeader>
                <div className="mx-auto mb-4">
                  <AlertTriangle className="h-16 w-16 text-orange-500" />
                </div>
                <CardTitle className="text-2xl text-orange-600">Order Processing Issue</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-600">
                  Your payment was received but there was an issue confirming your order.
                </p>

                {errorMsg && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-left">
                    <p className="text-sm text-red-600">{errorMsg}</p>
                  </div>
                )}

                {txnid && (
                  <div className="bg-gray-50 rounded-lg p-4 text-left">
                    <p className="text-sm text-gray-500">Transaction ID</p>
                    <p className="font-mono text-sm">{txnid}</p>
                  </div>
                )}

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    If money was deducted, please contact support immediately at <strong>7039862086</strong> with your transaction ID.
                  </p>
                </div>

                <div className="flex flex-col gap-2 pt-4">
                  <Button onClick={() => navigate("/checkout")} className="w-full">
                    Try Again
                  </Button>
                  <Button variant="outline" onClick={() => navigate("/marketplace")} className="w-full">
                    Back to Marketplace
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
