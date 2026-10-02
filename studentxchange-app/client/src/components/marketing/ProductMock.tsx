import { Compass, ShoppingBag, Users, Briefcase, CheckCircle2, Sparkles, TrendingUp } from "lucide-react";
import { Badge, Progress } from "@/components/marketing/mui";

/** Composite hero visual: slices of Career Compass, Marketplace, Collab and Lancing, with floating status chips. */
export function ProductMock() {
  return (
    <div className="relative mx-auto w-full max-w-[560px]" aria-hidden>
      <div className="blob absolute -inset-8 -z-10 rounded-[40px] bg-gradient-to-br from-sky/30 via-blue-500/15 to-transparent blur-3xl" />

      <div className="float-slow absolute -top-10 left-6 z-10 hidden items-center gap-2 rounded-xl border border-line bg-white px-3 py-2 shadow-pop sm:flex">
        <span className="grid h-7 w-7 place-items-center rounded-full bg-emerald-50 text-emerald-600"><CheckCircle2 size={15} /></span>
        <span className="text-xs"><b className="block text-[12px]">Offer received</b><span className="text-subtle">Frontend Intern</span></span>
      </div>
      <div className="float-slower absolute -bottom-10 right-6 z-10 hidden items-center gap-2 rounded-xl border border-line bg-white px-3 py-2 shadow-pop sm:flex">
        <span className="grid h-7 w-7 place-items-center rounded-full bg-sky-50 text-sky-600"><TrendingUp size={15} /></span>
        <span className="text-xs"><b className="block text-[12px]">Readiness +6</b><span className="text-subtle">this month</span></span>
      </div>

      <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-pop">
        <div className="flex items-center gap-1.5 border-b border-line bg-surface-2 px-4 py-2.5">
          <i className="h-2.5 w-2.5 rounded-full bg-red-300" /><i className="h-2.5 w-2.5 rounded-full bg-amber-300" /><i className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
          <span className="ml-3 rounded-md bg-white px-2 py-0.5 text-[10px] text-subtle">studentxchange.in</span>
        </div>
        <div className="grid gap-3 bg-gradient-to-b from-sky-50/70 to-surface-2 p-4 sm:grid-cols-5">
          <div className="rounded-xl border border-line bg-white p-4 sm:col-span-3">
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
            <div className="mt-4 flex items-center justify-between rounded-lg bg-ink px-3 py-2 text-white">
              <span className="flex items-center gap-1.5 text-[11px] text-white/70"><Sparkles size={12} className="text-sky" />Placement readiness</span>
              <span className="text-sm font-semibold">68 / 100</span>
            </div>
          </div>
          <div className="space-y-3 sm:col-span-2">
            <div className="rounded-xl border border-line bg-white p-3">
              <div className="flex items-center gap-2 text-xs font-medium"><ShoppingBag size={14} className="text-sky-600" />Marketplace</div>
              <div className="mt-2 flex items-center gap-2">
                <div className="h-9 w-9 rounded-md bg-gradient-to-br from-sky-100 to-blue-200" />
                <div><p className="text-xs font-medium">DSA Notes — Sem 4</p><p className="text-[11px] text-subtle">₹199 · Verified</p></div>
              </div>
            </div>
            <div className="rounded-xl border border-line bg-white p-3">
              <div className="flex items-center gap-2 text-xs font-medium"><Users size={14} className="text-sky-600" />Collab</div>
              <p className="mt-2 text-xs">Hackathon team needs a <b>UI designer</b></p>
              <div className="mt-2 flex -space-x-1.5">{["from-sky-400 to-blue-500", "from-indigo-400 to-blue-600", "from-cyan-400 to-sky-600"].map((g) => <i key={g} className={`h-5 w-5 rounded-full border-2 border-white bg-gradient-to-br ${g}`} />)}<span className="ml-3 text-[11px] text-subtle">3 matches</span></div>
            </div>
            <div className="rounded-xl border border-line bg-white p-3">
              <div className="flex items-center gap-2 text-xs font-medium"><Briefcase size={14} className="text-sky-600" />Lancing</div>
              <p className="mt-2 flex items-center gap-1 text-xs"><CheckCircle2 size={12} className="text-emerald-600" />Application shortlisted</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
