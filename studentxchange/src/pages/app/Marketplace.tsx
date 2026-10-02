import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Badge, Card } from "@/components/ui";
import { cn } from "@/lib/cn";

const cats = ["All", "Notes", "Books", "Electronics", "Lab gear", "Stationery"];
const items = [
  ["Data Structures Notes — Sem 4", "Notes", 199], ["Engineering Drawing Kit", "Lab gear", 349], ["Python Cheat Sheets", "Notes", 99],
  ["DBMS Previous Papers", "Notes", 149], ["Scientific Calculator", "Electronics", 450], ["Operating Systems (Galvin)", "Books", 300],
  ["A4 Spiral Notebooks (5)", "Stationery", 120], ["Arduino Starter Kit", "Electronics", 899],
] as const;

export default function Marketplace() {
  const [cat, setCat] = useState("All");
  const [q, setQ] = useState("");
  const shown = useMemo(() => items.filter(([n, c]) => (cat === "All" || c === cat) && n.toLowerCase().includes(q.toLowerCase())), [cat, q]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Marketplace</h1>
        <label className="relative">
          <span className="sr-only">Search listings</span>
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search listings" className="h-10 w-full rounded-lg border border-line bg-surface pl-9 pr-3 text-sm focus:border-sky-600 focus:outline-none sm:w-72" />
        </label>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]" role="tablist" aria-label="Categories">
        {cats.map((c) => (
          <button key={c} role="tab" aria-selected={cat === c} onClick={() => setCat(c)}
            className={cn("shrink-0 rounded-full border px-3.5 py-1.5 text-sm transition-colors", cat === c ? "border-ink bg-ink text-white" : "border-line bg-surface hover:bg-surface-2")}>{c}</button>
        ))}
      </div>
      {shown.length === 0 ? (
        <p className="py-16 text-center text-sm text-muted">No listings match your search.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {shown.map(([n, c, p]) => (
            <Card key={n} className="overflow-hidden transition-colors hover:border-sky">
              <div className="aspect-[4/3] bg-surface-2" />
              <div className="p-3">
                <p className="line-clamp-2 text-sm font-medium">{n}</p>
                <div className="mt-2 flex items-center justify-between"><span className="text-sm font-semibold">₹{p}</span><Badge tone="success">Verified</Badge></div>
                <p className="mt-1 text-xs text-muted">{c}</p>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
