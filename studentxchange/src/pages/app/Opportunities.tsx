import { useMemo, useState } from "react";
import { Bookmark, Clock, MapPin, Search, SlidersHorizontal, Users, X, Trophy, Wallet } from "lucide-react";
import { Badge, Button, Card, EmptyState } from "@/components/ui";
import { cn } from "@/lib/cn";
import { opportunities, types, type Mode, type Opportunity } from "@/lib/opportunities";

const modes: Mode[] = ["Online", "Offline", "Hybrid"];
const fees = ["Free", "Paid"] as const;
const tabLabel: Record<string, string> = { All: "All", Competition: "Competitions", Hackathon: "Hackathons", Internship: "Internships", Job: "Jobs", Freelance: "Freelancing", "Campus drive": "Campus drives" };
const sorts = ["Relevance", "Deadline", "Popular"] as const;
type Sort = (typeof sorts)[number];

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 py-1 text-sm">
      <input type="checkbox" checked={checked} onChange={onChange} className="h-4 w-4 rounded border-line accent-[#0ea5e9]" />
      {label}
    </label>
  );
}

function OppCard({ o, saved, onSave }: { o: Opportunity; saved: boolean; onSave: () => void }) {
  const urgent = o.daysLeft <= 3;
  const reward = o.prize ?? o.stipend;
  return (
    <Card className="flex flex-col gap-4 p-4 transition-colors hover:border-sky sm:flex-row sm:items-center">
      <div className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-surface-2 text-base font-semibold text-muted" aria-hidden>{o.org[0]}</div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="sky">{o.type}</Badge>
          <Badge>{o.mode}</Badge>
          {o.fee === "Paid" && <Badge tone="warning">Paid entry</Badge>}
        </div>
        <h3 className="mt-2 truncate text-base font-semibold tracking-tight">{o.title}</h3>
        <p className="text-sm text-muted">{o.org}</p>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
          <span className="inline-flex items-center gap-1"><MapPin size={12} />{o.location}</span>
          <span className="inline-flex items-center gap-1"><Users size={12} />{o.registrations.toLocaleString("en-IN")} registered</span>
          {reward && <span className="inline-flex items-center gap-1 text-ink">{o.prize ? <Trophy size={12} /> : <Wallet size={12} />}{reward}</span>}
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">{o.tags.map((t) => <span key={t} className="rounded-md bg-surface-2 px-2 py-0.5 text-[11px] text-muted">{t}</span>)}</div>
      </div>
      <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end">
        <span className={cn("inline-flex items-center gap-1 text-xs font-medium", urgent ? "text-danger" : "text-muted")}>
          <Clock size={12} />{o.daysLeft === 1 ? "1 day left" : `${o.daysLeft} days left`}
        </span>
        <div className="flex items-center gap-2">
          <button onClick={onSave} aria-pressed={saved} aria-label={saved ? "Remove bookmark" : "Bookmark"} className="grid h-9 w-9 place-items-center rounded-lg border border-line hover:bg-surface-2">
            <Bookmark size={16} className={saved ? "fill-sky text-sky-600" : "text-muted"} />
          </button>
          <Button size="md" variant="dark">Apply</Button>
        </div>
      </div>
    </Card>
  );
}

export default function Opportunities() {
  const [type, setType] = useState<(typeof types)[number]>("All");
  const [q, setQ] = useState("");
  const [mode, setMode] = useState<Mode[]>([]);
  const [fee, setFee] = useState<string[]>([]);
  const [sort, setSort] = useState<Sort>("Relevance");
  const [saved, setSaved] = useState<string[]>([]);
  const [drawer, setDrawer] = useState(false);

  const toggle = <T,>(arr: T[], v: T, set: (a: T[]) => void) => set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  const active = mode.length + fee.length;
  const clear = () => { setMode([]); setFee([]); setQ(""); setType("All"); };

  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    const r = opportunities.filter((o) =>
      (type === "All" || o.type === type) &&
      (!mode.length || mode.includes(o.mode)) &&
      (!fee.length || fee.includes(o.fee)) &&
      (!t || `${o.title} ${o.org} ${o.tags.join(" ")}`.toLowerCase().includes(t)));
    if (sort === "Deadline") r.sort((a, b) => a.daysLeft - b.daysLeft);
    if (sort === "Popular") r.sort((a, b) => b.registrations - a.registrations);
    return r;
  }, [type, q, mode, fee, sort]);

  const filters = (
    <div className="space-y-6">
      <div><h3 className="mb-2 text-sm font-semibold">Mode</h3>{modes.map((m) => <Check key={m} label={m} checked={mode.includes(m)} onChange={() => toggle(mode, m, setMode)} />)}</div>
      <div><h3 className="mb-2 text-sm font-semibold">Entry</h3>{fees.map((f) => <Check key={f} label={f} checked={fee.includes(f)} onChange={() => toggle(fee, f, setFee)} />)}</div>
      {active > 0 && <button onClick={clear} className="text-sm text-sky-600 hover:underline">Clear all filters</button>}
    </div>
  );

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Opportunities</h1>
        <p className="mt-1 text-sm text-muted">Internships, jobs, freelancing, competitions, hackathons and campus drives in one place.</p>
      </div>

      <div className="flex gap-2">
        <label className="relative flex-1">
          <span className="sr-only">Search opportunities</span>
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by role, company or skill" className="h-11 w-full rounded-lg border border-line bg-surface pl-10 pr-3 text-sm focus:border-sky-600 focus:outline-none focus:ring-2 focus:ring-sky/30" />
        </label>
        <Button variant="secondary" className="h-11 lg:hidden" onClick={() => setDrawer(true)}><SlidersHorizontal size={16} />Filters{active > 0 && ` (${active})`}</Button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]" role="tablist" aria-label="Opportunity type">
        {types.map((t) => (
          <button key={t} role="tab" aria-selected={type === t} onClick={() => setType(t)}
            className={cn("shrink-0 rounded-full border px-3.5 py-1.5 text-sm transition-colors", type === t ? "border-ink bg-ink text-white" : "border-line bg-surface hover:bg-surface-2")}>{tabLabel[t]}</button>
        ))}
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[220px_1fr]">
        <aside className="sticky top-20 hidden rounded-[var(--radius-card)] border border-line bg-surface p-5 lg:block" aria-label="Filters">{filters}</aside>
        <section aria-live="polite">
          <div className="mb-3 flex items-center justify-between text-sm">
            <span className="text-muted">{shown.length} {shown.length === 1 ? "result" : "results"}</span>
            <label className="flex items-center gap-2 text-muted">Sort
              <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="h-8 rounded-md border border-line bg-surface px-2 text-sm text-ink">
                {sorts.map((s) => <option key={s}>{s}</option>)}
              </select>
            </label>
          </div>
          <div className="space-y-3">
            {shown.length === 0 ? (
              <EmptyState icon={<Search size={20} />} title="No opportunities match" body="Try removing a filter or searching a different skill." action={<Button variant="secondary" onClick={clear}>Clear filters</Button>} />
            ) : shown.map((o) => <OppCard key={o.id} o={o} saved={saved.includes(o.id)} onSave={() => toggle(saved, o.id, setSaved)} />)}
          </div>
        </section>
      </div>

      {drawer && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Filters">
          <div className="absolute inset-0 bg-ink/40" onClick={() => setDrawer(false)} />
          <div className="animate-fade-up absolute inset-x-0 bottom-0 max-h-[80vh] overflow-y-auto rounded-t-2xl bg-surface p-5">
            <div className="mb-4 flex items-center justify-between"><h2 className="text-base font-semibold">Filters</h2><button aria-label="Close filters" onClick={() => setDrawer(false)}><X size={20} /></button></div>
            {filters}
            <Button variant="dark" size="lg" className="mt-6 w-full" onClick={() => setDrawer(false)}>Show {shown.length} results</Button>
          </div>
        </div>
      )}
    </div>
  );
}
