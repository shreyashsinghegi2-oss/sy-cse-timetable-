import { useEffect, useRef, useState } from "react";
import { Loader2, RefreshCw, Search, Sparkles, Zap } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import OpportunityCard, { OpportunityCardData } from "@/components/lancing/opportunity-card";
import { useToast } from "@/hooks/use-toast";
import { getAuthToken } from "@/lib/firebase";
import { ExternalApplicationConfirmation, openExternalOpportunity, recordExternalApplication, ExternalApplicationType } from "@/components/lancing/external-application-confirmation";
import DiscoverySearchLinks from "@/components/lancing/DiscoverySearchLinks";

// ─── Live match results ─
type Category = "job" | "internship" | "microtask" | "all";

interface Props {
  category: Category;
  userId?: string;
  appliedIds: Set<string>;
  onInternalApply: (record: any, type: "job" | "internship" | "micro_task") => void;
  onShowApplyGate: () => void;
  title?: string;
  subtitle?: string;
  searchPlaceholder?: string;
  accent?: "sky" | "blue" | "purple" | "indigo";
  /** When true, only company/admin-posted Firestore listings are shown. */
  internalOnly?: boolean;
}

const ACCENTS: Record<NonNullable<Props["accent"]>, { ring: string; text: string; from: string; to: string; chip: string }> = {
  sky:    { ring: "focus:border-sky-500",    text: "text-sky-700",    from: "from-sky-600",    to: "to-blue-500",  chip: "bg-sky-50 text-sky-700" },
  blue:   { ring: "focus:border-blue-500",   text: "text-blue-700",   from: "from-blue-600",   to: "to-cyan-500",  chip: "bg-blue-50 text-blue-700" },
  purple: { ring: "focus:border-purple-500", text: "text-purple-700", from: "from-purple-600", to: "to-pink-500",  chip: "bg-purple-50 text-purple-700" },
  indigo: { ring: "focus:border-indigo-500", text: "text-indigo-700", from: "from-indigo-600", to: "to-purple-500",chip: "bg-indigo-50 text-indigo-700" },
};

function hasBasicMatchingDegradation(data: any, results: any[]) {
  const hasSourceBackedResults = results.some(item =>
    item?.isInternal === true || Boolean(item?.source || item?.source_url || item?.url),
  );
  const itemFallback = results.some(item =>
    item?.fallback === true || item?.engineStatus === "degraded" || item?.engineStatus === "legacy",
  );
  return hasSourceBackedResults && (
    data?.fallback === true ||
    data?.engineStatus === "degraded" ||
    data?.engineStatus === "legacy" ||
    itemFallback
  );
}

export default function UnifiedMatchFeed({
  category, userId, appliedIds, onInternalApply,
  title, subtitle, searchPlaceholder, accent = "sky", internalOnly = false,
}: Props) {
  const { toast } = useToast();
  const a = ACCENTS[accent];

  const [searchQuery, setSearchQuery] = useState("");
  const [displayResults, setDisplayResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(!internalOnly);
  const [searchError, setSearchError] = useState("");
  const [showBasicMatchingNotice, setShowBasicMatchingNotice] = useState(false);
  const [resultTs, setResultTs] = useState(0);
  const [externalItem, setExternalItem] = useState<{ item: OpportunityCardData; url: string } | null>(null);
  const [isMarkingApplied, setIsMarkingApplied] = useState(false);
  const [externalAppliedIds, setExternalAppliedIds] = useState<Set<string>>(new Set());
  const lastQueryRef = useRef<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didInitRef = useRef(false);

  const fetchMatches = async (q: string) => {
    // Skip if the same query already returned live results.
    if (lastQueryRef.current === q && displayResults.length > 0 && !searchError) return;
    lastQueryRef.current = q;
    if (abortRef.current) abortRef.current.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setIsSearching(true);
    setSearchError("");
    setShowBasicMatchingNotice(false);
    try {
      const token = await getAuthToken();
      if (!token) throw new Error("Please sign in again to load matches.");
      const res = await fetch("/api/match", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Cache-Control": "no-store", "Pragma": "no-cache", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ uid: userId || null, query: q, category, internalOnly, _t: Date.now() }),
        signal: ctrl.signal,
        cache: "no-store",
      });
      if (res.status === 401) throw new Error("Authentication required. Please sign in again to load matches.");
      if (res.status === 403) throw new Error("Your account is not authorized to load these matches.");
      if (!res.ok) throw new Error(`Could not load matches (HTTP ${res.status}).`);
      const data = await res.json();
      if (ctrl.signal.aborted) return;
      if (data?.engineStatus === "unavailable") {
        throw new Error("Could not load matches. Please try again.");
      }
      const live = Array.isArray(data.results) ? data.results : [];
      setDisplayResults(live);
      setShowBasicMatchingNotice(hasBasicMatchingDegradation(data, live));
      setResultTs(Date.now());
    } catch (err: any) {
      if (err?.name !== "AbortError") {
        setDisplayResults([]);
        setSearchError(err?.message || "Could not load matches. Please try again.");
      }
    } finally {
      if (!ctrl.signal.aborted) setIsSearching(false);
    }
  };

  // Mount call (once) + debounced search effect.
  useEffect(() => {
    if (!didInitRef.current) {
      didInitRef.current = true;
      void fetchMatches("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (!didInitRef.current) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = searchQuery.trim();
    // Wait for 3+ characters for partial queries; an empty query refreshes the feed.
    if (q.length > 0 && q.length < 3) return;
    setIsSearching(true);
    debounceRef.current = setTimeout(() => { void fetchMatches(q); }, 600);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  const handleApply = async (item: any) => {
    // Internal posting → bubble up so parent opens its existing apply dialog with the
    // original Firestore record (preserves phone/email capture flow).
    if (item.isInternal && item.internalRecord) {
      const t = (item.internalType === "internship") ? "internship"
              : (item.internalType === "micro_task") ? "micro_task"
              : "job";
      if (appliedIds.has(item.internalRecord.id)) {
        toast({ title: "Already applied" });
        return;
      }
      onInternalApply(item.internalRecord, t);
      return;
    }
    const openedUrl = openExternalOpportunity(item);
    if (!openedUrl) {
      toast({ title: "Could not open listing", description: "This opportunity has no valid external URL, or the browser blocked the new tab.", variant: "destructive" });
      return;
    }
    setExternalItem({ item, url: openedUrl });
  };

  const markExternalApplied = async () => {
    if (!externalItem || !userId) {
      toast({ title: "Sign in to save this application", variant: "destructive" });
      return;
    }
    setIsMarkingApplied(true);
    try {
      const itemType = String((externalItem.item as any).internalType || externalItem.item.type || category).toLowerCase();
      const type: ExternalApplicationType = itemType === "microtask" || itemType === "micro_task" ? "micro_task" : itemType === "internship" ? "internship" : itemType === "competition" ? "competition" : "job";
      await recordExternalApplication(
        externalItem.item,
        type,
        externalItem.url,
      );
      if (externalItem.item.id) setExternalAppliedIds(prev => new Set(prev).add(externalItem.item.id!));
      toast({ title: "Marked as applied" });
      setExternalItem(null);
    } catch (e: any) {
      toast({ title: "Could not save application", description: e?.message, variant: "destructive" });
    } finally {
      setIsMarkingApplied(false);
    }
  };

  return (
    <div className="space-y-5 sl-fade-in">
      {(title || subtitle) && (
        <div className="space-y-1">
          {title && (
            <h1 className="text-3xl lg:text-4xl font-black tracking-tight">
              <span className="text-slate-900">{title.split(" ")[0]}</span>{" "}
              <span className={`bg-gradient-to-r ${a.from} ${a.to} bg-clip-text text-transparent`}>
                {title.split(" ").slice(1).join(" ") || ""}
              </span>
            </h1>
          )}
          {subtitle && <p className="text-slate-600 text-sm lg:text-base">{subtitle}</p>}
        </div>
      )}

      <div className="flex items-center gap-2 max-w-2xl">
        <div className="relative flex-1">
          {isSearching
            ? <Loader2 className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin ${a.text}`} />
            : <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />}
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={searchPlaceholder || "Search by skill, role, company…"}
            className={`pl-11 pr-10 h-11 rounded-xl border-2 border-slate-200 bg-white text-sm font-medium shadow-sm ${a.ring}`}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-base leading-none"
              aria-label="Clear"
            >✕</button>
          )}
        </div>
        <button
          onClick={() => { void fetchMatches(searchQuery.trim()); }}
          disabled={isSearching}
          className="shrink-0 h-11 w-11 rounded-xl border-2 border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-600 disabled:opacity-50"
          title="Refresh AI matches"
        >
          <RefreshCw className={`w-4 h-4 ${isSearching ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="flex items-baseline gap-3 flex-wrap">
        <h2 className="text-base lg:text-lg font-black text-slate-900 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-500" />
          {searchQuery.trim() ? `AI results for "${searchQuery}"` : "AI-matched for you"}
        </h2>
        {displayResults.length > 0 && (
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${a.chip}`}>
            {displayResults.length} found
          </span>
        )}
        {isSearching && (
          <span className="text-[11px] text-slate-500 flex items-center gap-1">
            <Loader2 className="w-3 h-3 animate-spin" />
            loading live results…
          </span>
        )}
        {resultTs > 0 && (
          <span className="text-[11px] text-slate-400">
            updated {new Date(resultTs).toLocaleTimeString()}
          </span>
        )}
      </div>

      {displayResults.length > 0 ? (
        <>
          {showBasicMatchingNotice && !isSearching && (
            <p role="status" className="text-xs text-slate-500">
              Showing available opportunities with basic matching.
            </p>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {displayResults.map((item: any, i) => (
              <OpportunityCard
                key={`${item.id || i}-${i}`}
                data={item as OpportunityCardData}
                userId={userId}
                alreadyApplied={item.isInternal && item.internalRecord
                  ? appliedIds.has(item.internalRecord.id)
                  : Boolean(item.id && (externalAppliedIds.has(item.id) || appliedIds.has(item.id)))}
                onApply={() => handleApply(item)}
              />
            ))}
          </div>
        </>
      ) : (
        <>
          <Card className="rounded-2xl border border-slate-200 py-12 bg-white">
            <CardContent className="text-center space-y-3">
              <div className={`w-14 h-14 rounded-xl ${a.chip} flex items-center justify-center mx-auto`}>
                <Zap className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900">
                  {isSearching
                    ? "Searching live results…"
                    : searchError
                      ? "Could not load results"
                      : searchQuery.trim()
                    ? `No matches for "${searchQuery}"`
                    : internalOnly
                      ? "No company-posted opportunities yet"
                      : "No results found"}
                </h3>
                <p className="text-xs text-slate-600">
                  {isSearching
                    ? "Waiting for current opportunities from the matcher."
                    : searchError
                      ? searchError
                      : internalOnly && !searchQuery.trim()
                    ? "When a company posts a job, internship or micro task on StudentLancing, it'll show up here instantly. Apply → company sees it → they accept and message you in-app."
                    : "Try a different search term or refresh."}
                </p>
              </div>
            </CardContent>
          </Card>
          {!isSearching && (
            <DiscoverySearchLinks
              category={category === "internship" ? "internships" : category === "microtask" ? "micro_tasks" : "jobs"}
              query={searchQuery}
            />
          )}
        </>
      )}
      <ExternalApplicationConfirmation
        item={externalItem?.item || null}
        open={!!externalItem}
        submitting={isMarkingApplied}
        onOpenChange={(open) => { if (!open && !isMarkingApplied) setExternalItem(null); }}
        onConfirm={markExternalApplied}
      />
    </div>
  );
}
