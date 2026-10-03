import { Link } from "wouter";
import { Heart, MapPin, ShoppingCart, ShieldCheck, ImageOff } from "lucide-react";
import type { Product } from "@shared/schema";
import { cn } from "@/components/marketing/cn";
import { conditionLabel, discountPct, formatINR, imageOf, isNewCondition, locationOf, originalPriceOf, priceOf, SHOW_VERIFIED_BADGE } from "@/lib/marketplace";

export function VerifiedBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-sky-100 px-1.5 py-0.5 text-[11px] font-medium text-sky-700">
      <ShieldCheck size={12} /> Verified Student
    </span>
  );
}

export function ProductCard({ product, favourite, onFavourite, onAdd }: {
  product: Product; favourite: boolean; onFavourite: () => void; onAdd: () => void;
}) {
  const img = imageOf(product);
  const orig = originalPriceOf(product);
  const off = discountPct(product);
  return (
    <article className="group flex flex-col overflow-hidden rounded-xl border border-line bg-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_10px_28px_rgba(10,25,47,.10)]">
      <div className="relative">
        <Link href={`/product/${product.id}`} aria-label={product.title} className="block aspect-[4/3] bg-white">
          {img
            ? <img src={img} alt="" loading="lazy" className="h-full w-full object-contain p-2.5 transition-transform duration-300 group-hover:scale-[1.03]" />
            : <span className="grid h-full w-full place-items-center text-subtle/60"><ImageOff size={28} /></span>}
        </Link>
        <span className={cn("absolute left-2.5 top-2.5 rounded-md px-2 py-0.5 text-[11px] font-semibold", isNewCondition(product.condition) ? "bg-sky-100 text-sky-700" : "bg-emerald-100 text-emerald-700")}>
          {conditionLabel(product.condition)}
        </span>
        <button onClick={onFavourite} aria-pressed={favourite} aria-label={favourite ? "Remove from saved" : "Save item"}
          className="absolute right-2.5 top-2.5 grid !h-8 !min-h-0 !w-8 !min-w-0 place-items-center rounded-full bg-white/90 text-subtle shadow-sm transition-colors hover:text-coral">
          <Heart size={16} className={favourite ? "fill-coral text-coral" : ""} />
        </button>
        {off > 0 && <span className="absolute bottom-2.5 left-2.5 rounded-md bg-emerald-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">{off}% off</span>}
      </div>
      <div className="flex flex-1 flex-col p-3.5">
        <Link href={`/product/${product.id}`} className="line-clamp-2 min-h-[2.5rem] text-[14px] font-medium leading-snug hover:text-sky-700">{product.title}</Link>
        <div className="mt-1.5 flex items-baseline gap-2">
          <span className="text-[17px] font-semibold tracking-tight">{formatINR(priceOf(product))}</span>
          {orig > priceOf(product) && <span className="text-xs text-subtle line-through">{formatINR(orig)}</span>}
        </div>
        {SHOW_VERIFIED_BADGE && <div className="mt-2"><VerifiedBadge /></div>}
        <div className="mt-auto flex items-end justify-between gap-2 pt-3">
          <span className="flex min-w-0 items-center gap-1 text-xs text-subtle"><MapPin size={12} className="shrink-0" /><span className="truncate">{locationOf(product)}</span></span>
          <button onClick={onAdd} aria-label={`Add ${product.title} to cart`}
            className="grid !h-9 !min-h-0 !w-9 !min-w-0 shrink-0 place-items-center rounded-lg border border-line text-navy transition-colors hover:border-sky hover:bg-sky-50 hover:text-sky-700">
            <ShoppingCart size={16} />
          </button>
        </div>
      </div>
    </article>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-line bg-white" aria-hidden>
      <div className="aspect-[4/3] animate-pulse bg-surface-2" />
      <div className="space-y-2.5 p-3.5"><div className="h-3.5 w-4/5 animate-pulse rounded bg-surface-2" /><div className="h-3.5 w-2/5 animate-pulse rounded bg-surface-2" /><div className="h-8 animate-pulse rounded bg-surface-2" /></div>
    </div>
  );
}
