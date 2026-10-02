import { Compass, ShoppingBag, Users, Briefcase, CheckCircle2 } from "lucide-react";
import { Badge, Progress } from "@/components/marketing/mui";

/** Composite hero visual: slices of Career Compass, Marketplace, Collab and Lancing. */
export function ProductMock() {
  return (
    <div className="relative mx-auto w-full max-w-[560px]" aria-hidden>
      <div className="absolute -inset-6 -z-10 rounded-[32px] bg-gradient-to-b from-sky/15 to-transparent blur-2xl" />
      <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-pop">
        <div className="flex items-center gap-1.5 border-b border-line bg-surface-2 px-4 py-2.5">
          <i className="h-2.5 w-2.5 rounded-full bg-line" /><i className="h-2.5 w-2.5 rounded-full bg-line" /><i className="h-2.5 w-2.5 rounded-full bg-line" />
          <span className="ml-3 rounded-md bg-surface px-2 py-0.5 text-[10px] text-subtle">studentxchange.in/app</span>
        </div>
        <div className="grid gap-3 bg-surface-2 p-4 sm:grid-cols-5">
          <div className="rounded-xl border border-line bg-surface p-4 sm:col-span-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-medium"><Compass size={14} className="text-sky-600" />Career Compass</div>
              <Badge tone="sky">Year 2</Badge>
            </div>
            <p className="mt-3 text-sm font-semibold">Full-stack developer roadmap</p>
            <div className="mt-3 space-y-2.5">
              {[["Data structures", 82], ["React & TypeScript", 64], ["System design", 31]].map(([n, v]) => (
                <div key={n as string}>
                  <div className="mb-1 flex justify-between text-[11px] text-subtle"><span>{n}</span><span>{v}%</span></div>
                  <Progress value={v as number} />
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center justify-between rounded-lg bg-surface-2 px-3 py-2">
              <span className="text-[11px] text-subtle">Placement readiness</span>
              <span className="text-sm font-semibold">68 / 100</span>
            </div>
          </div>
          <div className="space-y-3 sm:col-span-2">
            <div className="rounded-xl border border-line bg-surface p-3">
              <div className="flex items-center gap-2 text-xs font-medium"><ShoppingBag size={14} className="text-sky-600" />Marketplace</div>
              <div className="mt-2 flex items-center gap-2">
                <div className="h-9 w-9 rounded-md bg-surface-2" />
                <div><p className="text-xs font-medium">DSA Notes — Sem 4</p><p className="text-[11px] text-subtle">₹199 · Verified</p></div>
              </div>
            </div>
            <div className="rounded-xl border border-line bg-surface p-3">
              <div className="flex items-center gap-2 text-xs font-medium"><Users size={14} className="text-sky-600" />Collab</div>
              <p className="mt-2 text-xs">Hackathon team needs a <b>UI designer</b></p>
              <p className="text-[11px] text-subtle">3 matches · Pune</p>
            </div>
            <div className="rounded-xl border border-line bg-surface p-3">
              <div className="flex items-center gap-2 text-xs font-medium"><Briefcase size={14} className="text-sky-600" />Lancing</div>
              <p className="mt-2 flex items-center gap-1 text-xs"><CheckCircle2 size={12} className="text-emerald-600" />Application shortlisted</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
