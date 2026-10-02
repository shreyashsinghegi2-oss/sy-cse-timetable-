import { useEffect, useState } from "react";
import { Loader2, Search, AlertTriangle, ShoppingCart } from "lucide-react";
import { Link } from "wouter";

const MESSAGES = [
  "🔍 Scanning Internshala...",
  "🔍 Checking LinkedIn...",
  "🔍 Searching Wellfound...",
  "🔍 Browsing Unstop...",
  "🔍 Looking on Cutshort...",
  "🔍 Checking AngelList...",
  "✨ Finding the best matches for you...",
  "✨ Almost ready...",
];

export function RotatingSearchMessage({ active }: { active: boolean }) {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    if (!active) {
      setIdx(0);
      return;
    }
    const t = setInterval(() => setIdx((i) => (i + 1) % MESSAGES.length), 1500);
    return () => clearInterval(t);
  }, [active]);
  if (!active) return null;
  return (
    <div className="flex items-center gap-2 text-xs font-medium text-sky-700 bg-sky-50 border border-sky-100 rounded-lg px-3 py-2 animate-in fade-in">
      <Loader2 className="w-3.5 h-3.5 animate-spin" />
      <span className="truncate">{MESSAGES[idx]}</span>
    </div>
  );
}

export function SearchSkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-2.5 overflow-hidden relative">
          <div className="flex items-start gap-2.5">
            <div className="w-10 h-10 rounded-lg bg-slate-200 animate-pulse" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3.5 bg-slate-200 rounded w-3/4 animate-pulse" />
              <div className="h-2.5 bg-slate-100 rounded w-1/2 animate-pulse" />
            </div>
          </div>
          <div className="flex gap-1.5">
            <div className="h-4 bg-slate-200 rounded w-14 animate-pulse" />
            <div className="h-4 bg-slate-100 rounded w-12 animate-pulse" />
          </div>
          <div className="space-y-1">
            <div className="h-2.5 bg-slate-100 rounded w-full animate-pulse" />
            <div className="h-2.5 bg-slate-100 rounded w-5/6 animate-pulse" />
          </div>
          <div className="flex gap-1.5">
            <div className="h-5 bg-emerald-100 rounded w-16 animate-pulse" />
            <div className="h-5 bg-slate-100 rounded w-14 animate-pulse" />
            <div className="h-5 bg-slate-100 rounded w-12 animate-pulse" />
          </div>
          <div className="h-8 bg-slate-200 rounded w-full animate-pulse" />
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full animate-[shimmer_1.6s_infinite]" />
        </div>
      ))}
    </div>
  );
}

export function TrendingChips({ visible, onPick }: { visible: boolean; onPick: (q: string) => void }) {
  const [items, setItems] = useState<string[]>([]);
  useEffect(() => {
    let cancelled = false;
    if (!visible) return;
    fetch("/api/lancing/search/trending")
      .then((r) => r.json())
      .then((d) => { if (!cancelled) setItems(Array.isArray(d.items) ? d.items : []); })
      .catch(() => { /* silent */ });
    return () => { cancelled = true; };
  }, [visible]);

  if (!visible || items.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5 mt-2 max-w-2xl">
      <span className="text-[11px] font-bold text-slate-500 mr-1">🔥 Trending:</span>
      {items.map((q) => (
        <button
          key={q}
          onClick={() => onPick(q)}
          className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-white border border-slate-200 text-slate-700 hover:border-sky-400 hover:bg-sky-50 hover:text-sky-700 transition-colors"
          data-testid={`chip-trending-${q.toLowerCase().replace(/\s+/g, "-")}`}
        >
          {q.replace(/\b\w/g, (c) => c.toUpperCase())}
        </button>
      ))}
    </div>
  );
}

// Always shows "Live" — caching has been removed from the system.
export function CacheBadge({ cachedAt }: { cached?: boolean; cachedAt?: number }) {
  if (!cachedAt) return null;
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
      Live results
    </span>
  );
}

// Shown when the user has 0 free applies AND 0 paid passes left.
export function NoCreditsNotice({ remaining, paidPasses }: { remaining: number; paidPasses: number }) {
  if (remaining > 0 || paidPasses > 0) return null;
  return (
    <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm">
      <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="font-bold text-amber-800">You have no apply credits left</p>
        <p className="text-amber-700 text-xs mt-0.5">
          You've used all your free applies. Buy a pass to keep applying to opportunities.
        </p>
      </div>
      <Link href="/lancing/buy-credits">
        <button className="shrink-0 flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors">
          <ShoppingCart className="w-3.5 h-3.5" />
          Buy Pass
        </button>
      </Link>
    </div>
  );
}
