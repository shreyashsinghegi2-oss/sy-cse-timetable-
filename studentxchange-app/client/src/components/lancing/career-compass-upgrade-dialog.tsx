import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Crown, Lock, Check } from "lucide-react";
import { useCareerPricing } from "@/hooks/use-career-pricing";

interface UpgradeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpgrade: () => void;
  featureName?: string;
}

export default function CareerCompassUpgradeDialog({
  open,
  onOpenChange,
  onUpgrade,
  featureName,
}: UpgradeDialogProps) {
  const { pricing, isLoading, error, refetch } = useCareerPricing();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-1.5rem)] sm:max-w-sm rounded-2xl p-0 gap-0 overflow-hidden border-0">
        {/* Amber header strip */}
        <div className="bg-gradient-to-br from-amber-400 to-orange-500 px-5 py-5 text-center">
          <div className="flex justify-center mb-2">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-white/25">
              <Lock className="w-6 h-6 text-white" />
            </div>
          </div>
          <h2 className="text-lg font-black text-white leading-tight">
            Unlock Career Compass Premium
          </h2>
          <p className="text-amber-100 text-xs mt-1">
            {featureName ? `${featureName} is a Premium feature.` : "This is a Premium feature."}{" "}
            {pricing
              ? `${pricing.priceLabel} for ${pricing.durationDays} days, as a single payment with no automatic renewal.`
              : isLoading
                ? "Loading the current Premium price…"
                : "The current Premium price is unavailable."}
          </p>
        </div>

        {/* Perks list */}
        <div className="px-5 py-4 bg-white">
          <ul className="space-y-2.5">
            {(pricing?.premiumFeatures ?? []).map((p) => (
              <li key={p} className="flex items-center gap-2.5 text-sm text-gray-700">
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-100 shrink-0">
                  <Check className="w-3 h-3 text-amber-600" />
                </span>
                <span>{p}</span>
              </li>
            ))}
          </ul>
          {error && (
            <div className="mt-3 text-center" role="alert">
              <p className="text-xs text-red-600">{error.message}</p>
              <button
                type="button"
                className="mt-1 text-xs font-semibold text-sky-700 underline disabled:opacity-50"
                onClick={() => void refetch()}
                disabled={isLoading}
              >
                Retry loading price
              </button>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="px-5 pb-5 pt-1 bg-white flex flex-col gap-2">
          <Button
            className="w-full h-11 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold text-sm rounded-xl"
            onClick={onUpgrade}
            disabled={!pricing}
          >
            <Crown className="mr-2 h-4 w-4" />
            {pricing ? `Upgrade Now — ${pricing.priceLabel}` : "Premium price unavailable"}
          </Button>
          <Button
            variant="ghost"
            className="w-full h-9 text-sm text-gray-500 hover:text-gray-700"
            onClick={() => onOpenChange(false)}
          >
            Maybe Later
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
