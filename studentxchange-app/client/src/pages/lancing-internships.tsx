import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { PLATFORM_ADMIN_EMAIL } from "@/config/constants";
import { Input } from "@/components/ui/input";
import { Briefcase, LogOut, Search, MapPin, Clock, IndianRupee, Loader2, Send, ArrowRight, ArrowLeft, MessageSquare, Zap, Target, Sparkles, Shield, HelpCircle, RefreshCw } from "lucide-react";
import { RotatingSearchMessage, TrendingChips, SearchSkeletonGrid, CacheBadge, NoCreditsNotice } from "@/components/lancing/search-loader";
import { useLocation, Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useLancingAuth } from "@/hooks/use-lancing-auth";
import { firestore, getAuthToken } from "@/lib/firebase";
import { useApplyCounter } from "@/hooks/use-apply-counter";
import ApplyGateModal from "@/components/lancing/apply-gate-modal";
import WelcomeCreditsModal from "@/components/lancing/welcome-credits-modal";
import ApplyCounterBadge from "@/components/lancing/apply-counter-badge";
import OpportunityCard, { OpportunityCardData } from "@/components/lancing/opportunity-card";
import { LastUpdatedBadge } from "@/components/lancing/last-updated-badge";
import { doc, getDoc } from "firebase/firestore";
import SEOHead from "@/components/seo/seo-head";
import ReadinessGateButton from "@/components/lancing/readiness-gate-button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ExternalApplicationConfirmation, openExternalOpportunity, recordExternalApplication } from "@/components/lancing/external-application-confirmation";
import DiscoverySearchLinks from "@/components/lancing/DiscoverySearchLinks";

interface Internship {
  id: string;
  sourceCollection?: string;
  title: string;
  description: string;
  skills: string[];
  budget: string;
  deadline: string;
  mode: string;
  duration: string;
  companyId: string;
  companyName: string;
  companyLogo?: string;
  createdAt: string;
}

interface FreelancerProfile {
  fullName: string;
  skills: string[];
  phoneNumber?: string;
  profileImageUrl?: string;
}

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

export default function LancingInternshipsPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading: authLoading, logout, hasSelectedRole, role } = useLancingAuth();

  const [internships, setInternships] = useState<Internship[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [profile, setProfile] = useState<FreelancerProfile | null>(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [selectedInternship, setSelectedInternship] = useState<Internship | null>(null);
  const [applyMessage, setApplyMessage] = useState("");
  const [isApplying, setIsApplying] = useState(false);
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set());
  const [showApplyGate, setShowApplyGate] = useState(false);
  // Single source of truth for the rendered feed — populated only by /api/match.
  const [displayResults, setDisplayResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResultTs, setSearchResultTs] = useState(0);
  const [searchError, setSearchError] = useState("");
  const [showBasicMatchingNotice, setShowBasicMatchingNotice] = useState(false);
  const [externalItem, setExternalItem] = useState<{ item: OpportunityCardData; url: string } | null>(null);
  const [isMarkingApplied, setIsMarkingApplied] = useState(false);
  const [externalAppliedIds, setExternalAppliedIds] = useState<Set<string>>(new Set());
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const applyCounter = useApplyCounter();

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated || !user) { setLocation("/lancing/login"); return; }
    if (!hasSelectedRole || !role) { setLocation("/lancing/role-select"); return; }
    if (role !== "freelancer") { setLocation("/lancing/company-dashboard"); return; }
    setIsAuthorized(true);
  }, [authLoading, isAuthenticated, hasSelectedRole, role, user, setLocation]);

  useEffect(() => { if (isAuthorized && user) fetchData(); }, [isAuthorized, user]);

  // Fetch current internship matches on mount and on debounced searches.
  const fetchMatches = async (q: string) => {
    if (!user) return;
    if (abortControllerRef.current) abortControllerRef.current.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;
    setIsSearching(true);
    setSearchError("");
    setShowBasicMatchingNotice(false);
    try {
      const token = await getAuthToken();
      if (!token) throw new Error("Please sign in again to load matches.");
      const r = await fetch("/api/match", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Cache-Control": "no-store", "Pragma": "no-cache", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ uid: user.uid, query: q, category: "internship", _t: Date.now() }),
        signal: controller.signal,
        cache: "no-store",
      });
      if (controller.signal.aborted) return;
      if (r.status === 401) throw new Error("Authentication required. Please sign in again to load internships.");
      if (r.status === 403) throw new Error("Your account is not authorized to load these internships.");
      if (!r.ok) throw new Error(`Could not load internships (HTTP ${r.status}).`);
      const data = await r.json();
      if (data?.engineStatus === "unavailable") {
        throw new Error("Could not load internships. Please try again.");
      }
      const results = Array.isArray(data.results) ? data.results : [];
      setDisplayResults(results);
      setShowBasicMatchingNotice(hasBasicMatchingDegradation(data, results));
      setSearchResultTs(Date.now());
    } catch (err: any) {
      if (err?.name === "AbortError") return;
      setDisplayResults([]);
      setShowBasicMatchingNotice(false);
      setSearchError(err?.message || "Could not load internships. Please try again.");
    } finally {
      if (!controller.signal.aborted) setIsSearching(false);
    }
  };

  // Load once on mount; didInitRef prevents the search effect from duplicating the initial request.
  const didInitRef = useRef(false);
  useEffect(() => {
    if (isAuthorized && user && !didInitRef.current) {
      didInitRef.current = true;
      void fetchMatches("");
    }
  }, [isAuthorized, user]);
  useEffect(() => {
    if (!didInitRef.current) return;
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    const q = searchQuery.trim();
    if (q.length > 0 && q.length < 3) return;
    setIsSearching(true);
    searchDebounce.current = setTimeout(() => { void fetchMatches(q); }, 1500);
    return () => { if (searchDebounce.current) clearTimeout(searchDebounce.current); };
  }, [searchQuery]);

  // Loads profile (for the apply dialog + sidebar avatar) and the user's existing
  // applied IDs so the cards can show ✓ Applied. Internal listings are NOT rendered
  // from here — /api/match owns the displayed feed.
  const fetchData = async () => {
    setIsLoading(true);
    try {
      if (user) {
        try {
          const profileDoc = await getDoc(doc(firestore, "lancing_users", user.uid, "profile", "data"));
          if (profileDoc.exists()) setProfile(profileDoc.data() as FreelancerProfile);
        } catch {}
        try {
          const token = await getAuthToken();
          if (!token) throw new Error("Please sign in again to load applications.");
          const response = await fetch("/api/lancing/my-applications", {
            headers: { Authorization: `Bearer ${token}` },
          });
          const data = await response.json();
          if (!response.ok) throw new Error(data.error || "Could not load applications.");
          const ids = new Set<string>();
          (Array.isArray(data.applications) ? data.applications : []).forEach((application: any) => {
            const type = String(application.category || application.type || "").toLowerCase();
            const id = application.jobId || application.opportunityId;
            if ((type === "internship" || type === "internships") && id) ids.add(id);
          });
          setAppliedIds(ids);
        } catch {}
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleApply = async () => {
    if (!selectedInternship || !user || !profile) return;
    setIsApplying(true);
    try {
      const token = await getAuthToken();
      if (!token) throw new Error("Please sign in again to apply.");
      try {
        await applyCounter.consume.mutateAsync("general");
      } catch (e: any) {
        if (e?.code === 402) { setIsApplying(false); setSelectedInternship(null); setShowApplyGate(true); return; }
        throw e;
      }
      const response = await fetch("/api/lancing/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          jobId: selectedInternship.id,
          jobTitle: selectedInternship.title,
          companyName: selectedInternship.companyName,
          companyLogo: selectedInternship.companyLogo || "",
          applicantId: user.uid,
          applicantName: profile.fullName || "Freelancer",
          applicantEmail: user.email || "",
          applicantPhone: profile.phoneNumber || "",
          applicantProfileImage: profile.profileImageUrl || "",
          applicantSkills: profile.skills || [],
          message: applyMessage,
          type: "internship",
          ...(selectedInternship.sourceCollection === "opportunities" ? { sourceCollection: "opportunities" } : {}),
        }),
      });
      let result: any = {};
      try { result = await response.json(); } catch {}
      if (!response.ok) {
        if (result.alreadyApplied) {
          setAppliedIds(prev => new Set(prev).add(selectedInternship.id));
          toast({ title: "Already applied", description: "You have already applied to this internship." });
          setSelectedInternship(null);
          return;
        }
        throw new Error(result.error || `Failed to submit application (HTTP ${response.status}).`);
      }
      setAppliedIds(prev => new Set(Array.from(prev).concat([selectedInternship.id])));
      toast({ title: "Application submitted" });
      setSelectedInternship(null);
      setApplyMessage("");
    } catch (error: any) {
      toast({ title: "Failed to apply", description: error.message, variant: "destructive" });
    } finally {
      setIsApplying(false);
    }
  };

  const openExternal = (item: OpportunityCardData) => {
    const url = openExternalOpportunity(item);
    if (!url) {
      toast({ title: "Could not open listing", description: "This opportunity has no valid external URL, or the browser blocked the new tab.", variant: "destructive" });
      return;
    }
    setExternalItem({ item, url });
  };

  const markExternalApplied = async () => {
    if (!externalItem || !user) return;
    setIsMarkingApplied(true);
    try {
      await recordExternalApplication(
        externalItem.item,
        "internship",
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

  const handleLogout = async () => {
    try { await logout(); toast({ title: "Logged out" }); setLocation("/lancing/login"); }
    catch { toast({ title: "Logout failed", variant: "destructive" }); }
  };

  const isLoadingLive = isSearching;

  if (authLoading || !isAuthorized) {
    return (
      <div className="min-h-screen sl-bg-atmosphere flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-sky-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen sl-bg-atmosphere sl-grain-overlay">
      <SEOHead title="Internships - StudentLancing" description="Find and apply to internships" />

      <div className="flex">
        <aside className="w-60 bg-slate-900 border-r border-slate-800 hidden lg:flex flex-col fixed left-0 top-0 h-screen">
          <div className="flex-1 overflow-y-auto px-3 py-4">
            <Link href="/">
              <button className="flex items-center gap-2 px-2.5 py-1.5 mb-3 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg">
                <ArrowLeft className="w-3.5 h-3.5" />
                <span className="text-xs font-medium">Back to Home</span>
              </button>
            </Link>
            <Link href="/student-lancing" className="flex items-center gap-2 mb-5">
              <div className="w-9 h-9 bg-gradient-to-br from-sky-500 to-blue-600 rounded-lg flex items-center justify-center shadow-lg">
                <Briefcase className="w-4 h-4 text-white" />
              </div>
              <span className="text-base font-bold text-white">Student<span className="text-sky-400">Lancing</span></span>
            </Link>
            <Link href="/lancing/profile">
              <button className="w-full mb-5 p-3 bg-gradient-to-br from-sky-950 to-slate-900 rounded-xl border border-sky-900 hover:border-sky-700 transition-all group">
                <Avatar className="w-12 h-12 mx-auto mb-2 border-2 border-sky-500">
                  <AvatarImage src={profile?.profileImageUrl} />
                  <AvatarFallback className="bg-gradient-to-br from-sky-500 to-blue-600 text-white text-base font-bold">
                    {profile?.fullName?.[0] || "F"}
                  </AvatarFallback>
                </Avatar>
                <p className="text-center font-bold text-white text-sm">{profile?.fullName || "Freelancer"}</p>
                <p className="text-center text-[10px] text-sky-400 font-semibold mt-1">Click to edit profile</p>
              </button>
            </Link>
            <nav className="space-y-1">
              {[
                { id: "jobs", label: "Browse Jobs", icon: Briefcase, link: "/lancing/freelancer-dashboard" },
                { id: "internships", label: "Internships", icon: Target, link: "/lancing/internships", active: true },
                { id: "ai-match", label: "AI Match", icon: Sparkles, link: "/lancing/ai-match" },
                { id: "sure-shot", label: "Sure Shot Jobs", icon: Shield, link: "/lancing/sure-shot" },
                { id: "applications", label: "My Applications", icon: Send, link: "/lancing/freelancer-dashboard?tab=applications" },
                { id: "messages", label: "Messages", icon: MessageSquare, link: "/lancing/freelancer-dashboard?tab=messages" },
                { id: "how-to-earn", label: "How to Earn", icon: HelpCircle, link: "/lancing/freelancer-dashboard?tab=how-to-earn" },
                ...(user?.email?.toLowerCase() === PLATFORM_ADMIN_EMAIL ? [{ id: "admin", label: "Admin Dashboard", icon: Shield, link: "/admin-lancing" }] : []),
              ].map((item: any) => (
                <Link key={item.id} href={item.link}>
                  <button className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${item.active ? "bg-sky-600 text-white shadow-md" : "text-slate-300 hover:bg-slate-800 hover:text-white"}`}>
                    <item.icon className="w-4 h-4 flex-shrink-0" />
                    <span className="flex-1 text-left">{item.label}</span>
                  </button>
                </Link>
              ))}
            </nav>
          </div>
          <div className="px-3 py-3 border-t border-slate-800">
            <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm text-red-400 hover:bg-red-950/30 font-semibold border border-red-900/30">
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </aside>

        <main className="flex-1 lg:ml-60 p-6 lg:p-8 max-lg:pb-20">
          <div className="space-y-6 sl-fade-in">
            <div className="space-y-4">
              <div className="space-y-1">
                <h1 className="text-3xl lg:text-4xl font-black tracking-tight">
                  <span className="text-slate-900">Build Your</span>{" "}
                  <span className="bg-gradient-to-r from-sky-600 to-blue-500 bg-clip-text text-transparent">Career Path</span>
                </h1>
                <p className="text-sm text-slate-600 max-w-2xl">Apply to internships and gain real-world experience.</p>
              </div>
              <div className="max-w-2xl space-y-2">
                <div className="relative group flex items-center gap-2">
                  <div className="relative flex-1">
                    {isSearching ? (
                      <Loader2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-sky-500 animate-spin" />
                    ) : (
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    )}
                    <Input
                      placeholder="Search internships — by role, skill, or company..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-11 pr-10 h-11 rounded-xl border-2 border-slate-200 focus:border-sky-500 bg-white text-sm font-medium"
                    />
                    {searchQuery && (
                      <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-base leading-none">✕</button>
                    )}
                  </div>
                  <button
                    onClick={() => { void fetchMatches(searchQuery.trim()); }}
                    disabled={isSearching}
                    title="Refresh AI results"
                    className="shrink-0 h-11 w-11 rounded-xl border-2 border-slate-200 bg-white hover:border-sky-400 hover:bg-sky-50 flex items-center justify-center text-slate-600 hover:text-sky-700 disabled:opacity-50"
                    data-testid="button-refresh-search-int"
                  >
                    <RefreshCw className={`w-4 h-4 ${isSearching ? "animate-spin" : ""}`} />
                  </button>
                </div>
                <RotatingSearchMessage active={isSearching} />
                <div className="flex items-center justify-between gap-2 mt-2">
                  <TrendingChips visible={!searchQuery.trim()} onPick={(q) => setSearchQuery(q)} />
                  {!searchQuery.trim() && searchResultTs > 0 && (
                    <LastUpdatedBadge timestamp={searchResultTs} isFetching={isSearching} />
                  )}
                </div>
              </div>
            </div>

            {/* Single AI-curated feed — fed by /api/match. */}
            <div className="space-y-3">
              <div className="flex items-baseline gap-3 flex-wrap">
                <h2 className="text-lg lg:text-xl font-black text-slate-900 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  {searchQuery.trim() ? `AI results for "${searchQuery}"` : "AI-matched internships for you"}
                </h2>
                <CacheBadge cachedAt={searchResultTs} />
              </div>
              {isLoadingLive ? (
                <SearchSkeletonGrid />
              ) : displayResults.length > 0 ? (
                <>
                  {showBasicMatchingNotice && !isSearching && (
                    <p role="status" className="text-xs text-slate-500">
                      Showing available opportunities with basic matching.
                    </p>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                    {displayResults.map((item: any, i) => (
                      <OpportunityCard
                        key={`match-int-${item.id || i}`}
                        data={item}
                        userId={user?.uid}
                        alreadyApplied={item.isInternal && item.internalRecord
                          ? appliedIds.has(item.internalRecord.id)
                          : Boolean(item.id && (externalAppliedIds.has(item.id) || appliedIds.has(item.id)))}
                        onApply={async (it) => {
                          // Internal posting → open in-app apply dialog (handleApply uses selectedInternship).
                          if (item.isInternal && item.internalRecord) {
                            if (appliedIds.has(item.internalRecord.id)) {
                              toast({ title: "Already applied" });
                              return;
                            }
                            setSelectedInternship(item.internalRecord as Internship);
                            return;
                          }
                          openExternal(it);
                        }}
                      />
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <Card className="rounded-2xl border border-slate-200 py-12 bg-white">
                    <CardContent className="text-center space-y-3">
                      <div className="w-14 h-14 rounded-xl bg-sky-50 flex items-center justify-center mx-auto">
                        <Target className="w-7 h-7 text-sky-600" />
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-base font-bold text-slate-900">
                          {searchError ? "Could not load internships" : searchQuery.trim() ? `No matches for "${searchQuery}"` : "No results found"}
                        </h3>
                        <p className="text-xs text-slate-600">{searchError || "Try a different search term."}</p>
                      </div>
                    </CardContent>
                  </Card>
                  <DiscoverySearchLinks category="internships" query={searchQuery} />
                </>
              )}
            </div>
            {/* Suppress unused-state lint (kept for future loading skeleton) */}
            {false && <span>{isLoading}{internships.length}</span>}
          </div>
        </main>
      </div>

      <ExternalApplicationConfirmation
        item={externalItem?.item || null}
        open={!!externalItem}
        submitting={isMarkingApplied}
        onOpenChange={(open) => { if (!open && !isMarkingApplied) setExternalItem(null); }}
        onConfirm={markExternalApplied}
      />

      <Dialog open={!!selectedInternship} onOpenChange={() => setSelectedInternship(null)}>
        <DialogContent className="rounded-2xl max-w-md p-0 overflow-hidden">
          <div className="bg-gradient-to-r from-purple-600 to-violet-500 p-6">
            <DialogHeader>
              <DialogTitle className="text-white text-lg">Apply to {selectedInternship?.title}</DialogTitle>
              <DialogDescription className="text-purple-100 text-sm">at {selectedInternship?.companyName}</DialogDescription>
            </DialogHeader>
          </div>
          <div className="p-6 space-y-4">
            <Textarea placeholder="Why are you a great fit? (optional)" value={applyMessage} onChange={(e) => setApplyMessage(e.target.value)} className="min-h-[100px]" />
            <ReadinessGateButton
              onApply={handleApply}
              loading={isApplying}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white"
            >
              Submit Application
            </ReadinessGateButton>
          </div>
        </DialogContent>
      </Dialog>

      <ApplyGateModal open={showApplyGate} onClose={() => setShowApplyGate(false)} />
      {applyCounter.data && <WelcomeCreditsModal remaining={applyCounter.data.remaining} onClose={() => {}} />}
    </div>
  );
}
