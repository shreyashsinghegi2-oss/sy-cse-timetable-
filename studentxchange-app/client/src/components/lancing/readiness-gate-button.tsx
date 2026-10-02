import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Lock, ShieldCheck, Loader2, ArrowRight, Sparkles } from "lucide-react";
import { useLocation } from "wouter";
import { useReadinessGate } from "@/hooks/use-readiness-gate";

interface Props {
  children: React.ReactNode;
  className?: string;
  onApply: () => void | Promise<void>;
  size?: "sm" | "default" | "lg";
  variant?: "default" | "outline" | "ghost";
  loading?: boolean;
}

export default function ReadinessGateButton({ children, className, onApply, size = "default", variant = "default", loading: externalLoading }: Props) {
  const { score, loading: gateLoading, canApply } = useReadinessGate();
  const [showGate, setShowGate] = useState(false);
  const [, setLocation] = useLocation();
  const busy = gateLoading || !!externalLoading;

  const handleClick = async () => {
    if (busy) return;
    if (!canApply) { setShowGate(true); return; }
    await onApply();
  };

  return (
    <>
      <Button
        onClick={handleClick}
        size={size}
        variant={variant}
        className={className}
        disabled={busy}
      >
        {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : !canApply ? <Lock className="w-3.5 h-3.5 mr-1.5" /> : null}
        {children}
      </Button>

      <Dialog open={showGate} onOpenChange={(v) => !v && setShowGate(false)}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Lock className="w-5 h-5 text-amber-600" /> Apply Now is locked
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-3xl font-black text-amber-700">{score.total}%</span>
                <span className="text-sm text-amber-600">/ {score.threshold}% required</span>
              </div>
              <Progress value={score.total} className="h-2" />
              <p className="text-xs text-amber-700 mt-2">You need {score.threshold - score.total}% more to unlock applications.</p>
            </div>

            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Score Breakdown</p>
              <div className="space-y-2">
                {Object.entries(score.breakdown).map(([key, b]) => (
                  <div key={key} className="flex items-center justify-between text-sm">
                    <span className="capitalize text-gray-700">{key.replace("_", " ")}</span>
                    <span className="font-semibold text-gray-900">{b.score}/{b.max}</span>
                  </div>
                ))}
              </div>
            </div>

            {score.gaps.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-blue-600" />
                  <p className="text-sm font-bold text-blue-900">Gap-closing plan</p>
                </div>
                <ul className="text-xs text-blue-800 space-y-1.5 list-disc pl-4">
                  {score.gaps.map((g, i) => <li key={i}>{g}</li>)}
                </ul>
              </div>
            )}

            <Button
              onClick={() => { setShowGate(false); setLocation("/lancing/freelancer-dashboard?tab=placement"); }}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              <ShieldCheck className="w-4 h-4 mr-2" />
              Open Placement Readiness Portal
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
