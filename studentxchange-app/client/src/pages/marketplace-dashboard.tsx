import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { MessageSquareQuote, Plus, ShoppingCart, SearchX, TriangleAlert } from "lucide-react";
import type { Product } from "@shared/schema";
import AppShell from "@/components/app-shell/AppShell";
import { CategoryRow } from "@/components/marketplace/CategoryRow";
import { FilterBar, PRICE_RANGES, defaultFilters, type Filters } from "@/components/marketplace/FilterBar";
import { ProductCard, ProductCardSkeleton } from "@/components/marketplace/ProductCard";
import { useCart } from "@/hooks/use-cart";
import { useDebounce } from "@/hooks/use-debounce";
import { EnhancedSEO } from "@/components/seo/enhanced-seo";
import { groupOf, isNewCondition, loadFavourites, locationOf, priceOf, saveFavourites } from "@/lib/marketplace";

const PAGE = 12;

export default function MarketplaceDashboard() {
  const { items, addToCart } = useCart();
  const [category, setCategory] = useState("all");
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [visible, setVisible] = useState(PAGE);
  const [favs, setFavs] = useState<number[]>(() => loadFavourites());
  const [q, setQ] = useState(() => (typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("q") ?? "" : ""));
  const dq = useDebounce(q, 250);

  const { data: products = [], isLoading, isError, refetch } = useQuery<Product[]>({
    queryKey: ["/api/products"], staleTime: 60_000, refetchOnWindowFocus: false,
  });

  // keep the page in sync with the top-bar search (it navigates with ?q=)
  useEffect(() => {
    const onPop = () => setQ(new URLSearchParams(window.location.search).get("q") ?? "");
    window.addEventListener("popstate", onPop);
    const t = setInterval(() => { const n = new URLSearchParams(window.location.search).get("q") ?? ""; setQ((c) => (c === n ? c : n)); }, 400);
    return () => { window.removeEventListener("popstate", onPop); clearInterval(t); };
  }, []);

  const set = (f: Partial<Filters>) => setFilters((c) => ({ ...c, ...f }));
  const locations = useMemo(() => Array.from(new Set(products.map(locationOf))).sort(), [products]);

  const shown = useMemo(() => {
    const range = PRICE_RANGES.find((p) => p.key === filters.price)!;
    const term = dq.trim().toLowerCase();
    const list = products.filter((p) =>
      (category === "all" || groupOf(p.category) === category) &&
      (!term || `${p.title} ${p.description} ${p.category}`.toLowerCase().includes(term)) &&
      (filters.cond === "all" || (filters.cond === "new" ? isNewCondition(p.condition) : !isNewCondition(p.condition))) &&
      (filters.condition === "all" || p.condition === filters.condition) &&
      (filters.location === "all" || locationOf(p) === filters.location) &&
      range.test(priceOf(p)) &&
      (!filters.inStock || p.quantity > 0));
    const by = filters.sort;
    return list.sort((a, b) =>
      by === "price-asc" ? priceOf(a) - priceOf(b)
      : by === "price-desc" ? priceOf(b) - priceOf(a)
      : by === "relevance" ? (Number(b.rating) || 0) - (Number(a.rating) || 0)
      : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [products, category, filters, dq]);

  useEffect(() => setVisible(PAGE), [category, filters, dq]);
  const toggleFav = (id: number) => setFavs((c) => { const n = c.includes(id) ? c.filter((x) => x !== id) : [...c, id]; saveFavourites(n); return n; });
  const reset = () => { setCategory("all"); setFilters(defaultFilters); setQ(""); };

  return (
    <AppShell>
      <EnhancedSEO title="Student Marketplace | StudentXchange" description="Buy, sell and exchange textbooks, tools, gadgets and more, by students, for students." keywords="student marketplace, buy sell textbooks, student gadgets" canonicalUrl="https://studentxchange.in/marketplace" />
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight md:text-[32px]">Student Marketplace</h1>
          <p className="mt-1 max-w-xl text-sm text-subtle">Buy, sell and exchange textbooks, tools, gadgets and more, by students, for students.</p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <Link href="/sell" className="inline-flex h-11 items-center gap-2 rounded-lg bg-sky px-5 text-sm font-semibold text-white transition-colors hover:bg-sky-600"><Plus size={17} /> Sell an Item</Link>
          <Link href="/buyer-requests" className="inline-flex h-11 items-center gap-2 rounded-lg border border-sky bg-white px-5 text-sm font-semibold text-sky-700 transition-colors hover:bg-sky-50"><MessageSquareQuote size={17} /> Buyer Requests</Link>
          <Link href="/cart" className="relative inline-flex h-11 items-center gap-2 rounded-lg border border-sky bg-white px-5 text-sm font-semibold text-sky-700 transition-colors hover:bg-sky-50">
            <ShoppingCart size={17} /> My Cart{items.length > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-red-500 px-1 text-[11px] text-white">{items.length}</span>}
          </Link>
        </div>
      </div>

      <div className="mt-6"><CategoryRow value={category} onChange={setCategory} /></div>
      <div className="mt-5"><FilterBar filters={filters} set={set} locations={locations} /></div>

      <section className="mt-5" aria-live="polite">
        {isLoading ? (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4 min-[1360px]:grid-cols-6">{Array.from({ length: 12 }, (_, i) => <ProductCardSkeleton key={i} />)}</div>
        ) : isError ? (
          <div className="grid place-items-center rounded-xl border border-dashed border-line bg-white px-6 py-16 text-center">
            <TriangleAlert className="text-amber-500" size={28} /><h2 className="mt-3 text-base font-semibold">We couldn't load listings</h2>
            <p className="mt-1 text-sm text-subtle">Check your connection and try again.</p>
            <button onClick={() => refetch()} className="mt-4 h-10 rounded-lg bg-sky px-5 text-sm font-semibold text-white hover:bg-sky-600">Try again</button>
          </div>
        ) : shown.length === 0 ? (
          <div className="grid place-items-center rounded-xl border border-dashed border-line bg-white px-6 py-16 text-center">
            <SearchX className="text-subtle" size={28} /><h2 className="mt-3 text-base font-semibold">No listings match</h2>
            <p className="mt-1 text-sm text-subtle">Try another category or clear your filters.</p>
            <button onClick={reset} className="mt-4 h-10 rounded-lg border border-line bg-white px-5 text-sm font-medium hover:border-sky">Clear filters</button>
          </div>
        ) : (
          <>
            <p className="mb-3 text-sm text-subtle">{shown.length} {shown.length === 1 ? "listing" : "listings"}</p>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4 min-[1360px]:grid-cols-6">
              {shown.slice(0, visible).map((p) => (
                <ProductCard key={p.id} product={p} favourite={favs.includes(p.id)} onFavourite={() => toggleFav(p.id)} onAdd={() => addToCart(p, 1)} />
              ))}
            </div>
            {visible < shown.length && (
              <div className="mt-6 flex justify-center"><button onClick={() => setVisible((v) => v + PAGE)} className="h-11 rounded-lg border border-line bg-white px-6 text-sm font-medium transition-colors hover:border-sky">Show more</button></div>
            )}
          </>
        )}
      </section>
    </AppShell>
  );
}
