import { BookOpen, FlaskConical, Laptop, Wrench, Pencil, Cpu, Armchair, Ellipsis, LayoutGrid, type LucideIcon } from "lucide-react";
import { CATEGORY_GROUPS } from "@/lib/marketplace";
import { cn } from "@/components/marketing/cn";

const icons: Record<string, LucideIcon> = { "book-open": BookOpen, "flask-conical": FlaskConical, laptop: Laptop, wrench: Wrench, pencil: Pencil, cpu: Cpu, armchair: Armchair, ellipsis: Ellipsis };

export function CategoryRow({ value, onChange }: { value: string; onChange: (k: string) => void }) {
  const items = [{ key: "all", label: "All Categories", Icon: LayoutGrid }, ...CATEGORY_GROUPS.map((g) => ({ key: g.key, label: g.label, Icon: icons[g.icon] }))];
  return (
    <div role="tablist" aria-label="Categories" className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 md:mx-0 md:grid md:grid-cols-9 md:overflow-visible md:px-0 [scrollbar-width:none]">
      {items.map(({ key, label, Icon }) => {
        const active = value === key;
        return (
          <button key={key} role="tab" aria-selected={active} onClick={() => onChange(key)}
            className={cn("flex h-[78px] min-w-[104px] shrink-0 flex-col items-center justify-center gap-2 rounded-xl border bg-white px-2 text-center text-[12.5px] leading-tight transition-all md:min-w-0",
              active ? "border-sky bg-sky-50 text-sky-700 shadow-[0_0_0_3px_rgba(56,189,248,.18)]" : "border-line text-navy/80 hover:border-sky/60 hover:bg-white")}>
            <Icon size={22} strokeWidth={1.6} className={active ? "text-sky-600" : "text-navy/70"} />
            {label}
          </button>
        );
      })}
    </div>
  );
}
