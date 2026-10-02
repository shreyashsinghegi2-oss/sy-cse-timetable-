import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useSimpleToast } from "@/hooks/use-simple-toast";
import { auth } from "@/lib/firebase";
import { Loader2, Check, Crown, Map, Sparkles, Lock } from "lucide-react";
import { useCareerPricing } from "@/hooks/use-career-pricing";

interface PlanModalProps {
  open: boolean;
  onContinueFree: () => void;
  customerName?: string;
  customerPhone?: string;
  returnTrack?: string;
}

export default function CareerCompassPlanModal({
  open,
  onContinueFree,
  customerName,
  customerPhone,
  returnTrack,
}: PlanModalProps) {
  const { toast } = useSimpleToast();
  const { pricing, isLoading: pricingLoading, error: pricingError, refetch: refetchPricing } = useCareerPricing();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Record<string, string> | null>(null);
  const [payuBaseUrl, setPayuBaseUrl] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Reset loading if the modal is re-opened after a failed attempt
  useEffect(() => {
    if (open) { setLoading(false); setFormData(null); setPayuBaseUrl(""); }
    return () => { abortRef.current?.abort(); };
  }, [open]);

  useEffect(() => {
    if (formData && payuBaseUrl && formRef.current) formRef.current.submit();
  }, [formData, payuBaseUrl]);

  const handleUpgrade = async () => {
    if (loading) return; // guard against rapid double-tap
    setLoading(true);
    abortRef.current = new AbortController();
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error("Please sign in again to continue.");
      const res = await fetch("/api/career-compass/subscription/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ firstname: customerName, phone: customerPhone, returnTrack: returnTrack || "personal" }),
        signal: abortRef.current.signal,
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || data.error || "Failed to start payment.");
      }
      setFormData(data.formData);
      setPayuBaseUrl(data.payuBaseUrl);
      // loading stays true — page navigates away to PayU
    } catch (err: any) {
      if (err?.name === "AbortError") return; // modal closed mid-fetch — no-op
      toast({
        title: "Payment Failed",
        description: err instanceof Error ? err.message : "Unknown error occurred",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  return (
    <Dialog open={open}>
      <DialogContent
        className="w-[calc(100%-1.5rem)] sm:max-w-2xl max-h-[92dvh] flex flex-col p-0 gap-0 border-0 overflow-hidden rounded-2xl [&>button]:hidden"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogTitle className="sr-only">Choose Your Career Compass Plan</DialogTitle>

        {/* Header — compact on mobile */}
        <div className="shrink-0 bg-gradient-to-br from-sky-600 to-indigo-700 px-5 py-4 sm:px-6 sm:py-5 text-center">
          <div className="inline-flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-white/15 mb-2 sm:mb-3">
            <Map className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
          </div>
          <h2 className="text-lg sm:text-2xl font-black text-white leading-tight">
            Choose Your Career Compass Plan
          </h2>
          <p className="text-sky-100 text-xs sm:text-sm mt-1">
            Start free, or unlock everything with Premium.
          </p>
        </div>

        {/* Scrollable cards area — Premium first on mobile */}
        <div className="flex-1 overflow-y-auto overscroll-contain bg-slate-50 p-4 sm:p-6">
          <div className="flex flex-col sm:grid sm:grid-cols-2 gap-4">

            {/* Premium card — ORDER 1 on mobile so it's seen first */}
            <div className="order-first sm:order-last rounded-2xl border-2 border-amber-400 bg-white p-4 sm:p-5 flex flex-col relative shadow-lg">
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-400 text-amber-950 text-[10px] sm:text-[11px] font-bold px-3 py-0.5 rounded-full whitespace-nowrap">
                ⭐ RECOMMENDED
              </span>
              <div className="flex items-center gap-2 mt-1">
                <Crown className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500 shrink-0" />
                <span className="font-bold text-gray-900 text-sm sm:text-base">Premium</span>
              </div>
              <div className="mt-2 sm:mt-3 mb-3 sm:mb-4 flex items-baseline gap-1">
                <span className="text-2xl sm:text-3xl font-black text-gray-900">
                  {pricing?.priceLabel ?? (pricingLoading ? "Loading price…" : "Price unavailable")}
                </span>
                <span className="ml-2 text-[10px] sm:text-xs bg-emerald-100 text-emerald-700 font-semibold px-2 py-0.5 rounded-full">Best value</span>
              </div>
              <ul className="space-y-2 sm:space-y-2.5 flex-1">
                {(pricing?.premiumFeatures ?? []).map((f) => (
                  <li key={f} className="flex items-start gap-2 text-xs sm:text-sm text-gray-700">
                    <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-500 mt-0.5 shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              {pricingError && (
                <div className="mt-3 text-center" role="alert">
                  <p className="text-xs text-red-600">{pricingError.message}</p>
                  <button
                    type="button"
                    className="mt-1 text-xs font-semibold text-sky-700 underline disabled:opacity-50"
                    onClick={() => void refetchPricing()}
                    disabled={pricingLoading}
                  >
                    Retry loading price
                  </button>
                </div>
              )}
              <Button
                className="mt-4 sm:mt-5 w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white h-10 sm:h-11 text-sm sm:text-base font-bold"
                disabled={loading || !pricing}
                onClick={handleUpgrade}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Opening PayU…
                  </>
                ) : (
                  <>
                    <Crown className="mr-2 h-4 w-4" />
                    {pricing ? "Upgrade to Premium" : "Premium price unavailable"}
                  </>
                )}
              </Button>
            </div>

            {/* Free card — ORDER 2 on mobile */}
            <div className="order-last sm:order-first rounded-2xl border border-gray-200 bg-white p-4 sm:p-5 flex flex-col">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-sky-500 shrink-0" />
                <span className="font-bold text-gray-900 text-sm sm:text-base">Free Tier</span>
              </div>
              <div className="mt-2 sm:mt-3 mb-3 sm:mb-4 flex items-baseline gap-1">
                <span className="text-2xl sm:text-3xl font-black text-gray-900">₹0</span>
                <span className="text-gray-500 text-xs sm:text-sm">/ forever</span>
              </div>
              <ul className="space-y-2 sm:space-y-2.5 flex-1">
                {(pricing?.freeFeatures ?? []).map((f) => (
                  <li key={f} className="flex items-start gap-2 text-xs sm:text-sm text-gray-700">
                    <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-500 mt-0.5 shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
                {pricing?.premiumFeatures
                  .filter((feature) => feature !== "Everything in Free")
                  .map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-xs sm:text-sm text-gray-400">
                      <Lock className="w-3.5 h-3.5 sm:w-4 sm:h-4 mt-0.5 shrink-0" />
                      <span>{feature} locked</span>
                    </li>
                  ))}
              </ul>
              <Button
                variant="outline"
                className="mt-4 sm:mt-5 w-full h-10 sm:h-11 text-sm"
                disabled={loading}
                onClick={onContinueFree}
              >
                Continue for Free
              </Button>
            </div>

          </div>

          {/* Reassurance note */}
          <p className="text-center text-[11px] sm:text-xs text-gray-400 mt-3 px-2">
            {pricing
              ? `Secure payment via PayU · ${pricing.priceLabel} for ${pricing.durationDays} days · Single payment · No automatic renewal`
              : "Plan pricing must load before you can purchase. You can still continue with the Free plan."}
          </p>
        </div>

        {formData && payuBaseUrl && (
          <form ref={formRef} action={payuBaseUrl} method="POST" style={{ display: "none" }}>
            {Object.entries(formData).map(([key, value]) => (
              <input key={key} type="hidden" name={key} value={value} />
            ))}
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
