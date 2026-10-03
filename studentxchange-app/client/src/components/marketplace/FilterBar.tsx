import { ChevronDown, ArrowUpDown } from "lucide-react";
import { cn } from "@/components/marketing/cn";

export type Filters = { cond: "all" | "new" | "used"; location: string; price: string; condition: string; inStock: boolean; sort: string };
export const defaultFilters: Filters = { cond: "all", location: "all", price: "any", condition: "all", inStock: true, sort: "latest" };

export const PRICE_RANGES: { key: string; label: string; test: (n: number) => boolean }[] = [
  { key: "any", label: "Price Range", test: () => true },
  { key: "u500", label: "Under ₹500", test: (n) => n < 500 },
  { key: "500-1500", label: "₹500 – ₹1,500", test: (n) => n >= 500 && n <= 1500 },
  { key: "1500-5000", label: "₹1,500 – ₹5,000", test: (n) => n > 1500 && n <= 5000 },
  { key: "5000+", label: "Above ₹5,000", test: (n) => n > 5000 },
];

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <label className="relative">
      <span className="sr-only">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="h-10 appearance-none rounded-lg border border-line bg-white pl-3 pr-8 text-[13px] text-navy outline-none transition-colors hover:border-sky/60 focus:border-sky focus:ring-2 focus:ring-sky/30">
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-subtle" />
    </label>
  );
}

export function FilterBar({ filters, set, locations }: { filters: Filters; set: (f: Partial<Filters>) => void; locations: string[] }) {
  const seg = [{ k: "all", l: "All" }, { k: "new", l: "New" }, { k: "used", l: "Used" }] as const;
  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <div role="group" aria-label="Condition type" className="flex gap-1.5">
        {seg.map(({ k, l }) => (
          <button key={k} onClick={() => set({ cond: k })} aria-pressed={filters.cond === k}
            className={cn("h-10 min-w-[56px] rounded-lg border px-4 text-[13px] font-medium transition-colors", filters.cond === k ? "border-sky bg-sky text-white" : "border-line bg-white text-navy hover:border-sky/60")}>{l}</button>
        ))}
      </div>
      <Select label="Location" value={filters.location} onChange={(v) => set({ location: v })} options={[{ value: "all", label: "Location" }, ...locations.map((l) => ({ value: l, label: l }))]} />
      <Select label="Price range" value={filters.price} onChange={(v) => set({ price: v })} options={PRICE_RANGES.map((p) => ({ value: p.key, label: p.label }))} />
      <Select label="Condition" value={filters.condition} onChange={(v) => set({ condition: v })} options={[{ value: "all", label: "Condition" }, { value: "New", label: "Brand New" }, { value: "Like New", label: "Like New" }, { value: "Good", label: "Used · Good" }, { value: "Fair", label: "Used · Fair" }]} />
      <label className="flex h-10 cursor-pointer items-center gap-2 rounded-lg border border-line bg-white px-3 text-[13px]">
        <input type="checkbox" checked={filters.inStock} onChange={(e) => set({ inStock: e.target.checked })} className="h-4 w-4 accent-[#0ea5e9]" /> In stock
      </label>
      <div className="ml-auto flex items-center gap-2">
        <ArrowUpDown size={15} className="hidden text-subtle sm:block" />
        <Select label="Sort by" value={filters.sort} onChange={(v) => set({ sort: v })} options={[{ value: "latest", label: "Sort by: Latest" }, { value: "relevance", label: "Sort by: Relevance" }, { value: "price-asc", label: "Price: Low to High" }, { value: "price-desc", label: "Price: High to Low" }]} />
      </div>
    </div>
  );
}
