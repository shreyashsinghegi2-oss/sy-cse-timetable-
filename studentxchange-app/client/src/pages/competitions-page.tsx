import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Trophy, Search, Calendar, MapPin, Users, Tag, ExternalLink,
  IndianRupee, Clock, Filter, Zap, Award, ChevronLeft, ChevronRight,
  Globe, Wifi, Building2, Star, CheckCircle2
} from "lucide-react";
import { COMPETITION_CATEGORIES } from "@shared/schema";
import type { Competition } from "@shared/schema";
import DiscoverySearchLinks from "@/components/lancing/DiscoverySearchLinks";

const CATEGORY_ICONS: Record<string, any> = {
  Hackathon: Zap,
  "Case Study": Building2,
  "Business Plan": Trophy,
  "Coding Contest": Award,
  Olympiad: Star,
  "Research Paper": Search,
  "Design/Art": Star,
  Quiz: CheckCircle2,
  Ideathon: Zap,
  Other: Trophy,
};

const CATEGORY_COLORS: Record<string, string> = {
  Hackathon: "bg-violet-100 text-violet-700 border-violet-200",
  "Case Study": "bg-blue-100 text-blue-700 border-blue-200",
  "Business Plan": "bg-emerald-100 text-emerald-700 border-emerald-200",
  "Coding Contest": "bg-orange-100 text-orange-700 border-orange-200",
  Olympiad: "bg-yellow-100 text-yellow-700 border-yellow-200",
  "Research Paper": "bg-indigo-100 text-indigo-700 border-indigo-200",
  "Design/Art": "bg-pink-100 text-pink-700 border-pink-200",
  Quiz: "bg-cyan-100 text-cyan-700 border-cyan-200",
  Ideathon: "bg-purple-100 text-purple-700 border-purple-200",
  Other: "bg-gray-100 text-gray-700 border-gray-200",
};

const MODE_ICON: Record<string, any> = {
  Online: Wifi,
  Offline: MapPin,
  Hybrid: Globe,
};

function CompetitionCard({ comp }: { comp: Competition }) {
  const CatIcon = CATEGORY_ICONS[comp.category] ?? Trophy;
  const catColor = CATEGORY_COLORS[comp.category] ?? "bg-gray-100 text-gray-700";
  const ModeIcon = MODE_ICON[comp.mode] ?? Globe;

  const deadlinePassed = comp.registrationDeadline
    ? new Date(comp.registrationDeadline) < new Date()
    : false;

  return (
    <Card className="group rounded-2xl border border-slate-200 hover:border-violet-300 hover:shadow-lg transition-all duration-200 bg-white overflow-hidden">
      <CardContent className="p-5 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${catColor}`}>
              <CatIcon className="w-3 h-3" />
              {comp.category}
            </span>
            {comp.isVerified && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                <CheckCircle2 className="w-3 h-3" /> Verified
              </span>
            )}
          </div>
          <span className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
            comp.mode === "Online" ? "bg-blue-50 text-blue-600"
            : comp.mode === "Offline" ? "bg-amber-50 text-amber-700"
            : "bg-purple-50 text-purple-700"
          }`}>
            <ModeIcon className="w-3 h-3" />
            {comp.mode}
          </span>
        </div>

        <div>
          <h3 className="font-bold text-slate-900 text-base leading-snug line-clamp-2 group-hover:text-violet-700 transition-colors">
            {comp.title}
          </h3>
          <p className="text-sm text-slate-500 mt-0.5">{comp.organizer}</p>
        </div>

        {comp.descriptionSummary && (
          <p className="text-sm text-slate-600 line-clamp-2">{comp.descriptionSummary}</p>
        )}

        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs text-slate-500">
          {comp.registrationDeadline && (
            <span className={`flex items-center gap-1 ${deadlinePassed ? "text-red-500" : ""}`}>
              <Clock className="w-3 h-3 shrink-0" />
              Deadline: {comp.registrationDeadline}
            </span>
          )}
          {comp.eventDate && (
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3 shrink-0" />
              {comp.eventDate}
            </span>
          )}
          {comp.teamSize && (
            <span className="flex items-center gap-1">
              <Users className="w-3 h-3 shrink-0" />
              {comp.teamSize}
            </span>
          )}
          {comp.location && (
            <span className="flex items-center gap-1 truncate">
              <MapPin className="w-3 h-3 shrink-0" />
              {comp.location}
            </span>
          )}
        </div>

        {comp.field && (
          <p className="text-xs text-slate-400 flex items-center gap-1">
            <Tag className="w-3 h-3 shrink-0" />
            {comp.field}
          </p>
        )}

        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2">
            {comp.prizePool && (
              <span className="flex items-center gap-1 text-sm font-bold text-emerald-600">
                <IndianRupee className="w-3.5 h-3.5" />
                {comp.prizePool}
              </span>
            )}
            {comp.entryFee && (
              <span className="text-xs text-slate-400">
                Fee: {comp.entryFee}
              </span>
            )}
          </div>
          {(() => {
            const href = [comp.applyLink, (comp as any).source_url, (comp as any).url]
              .find((u) => u && /^https?:\/\//i.test(String(u).trim()));
            return href ? (
              <a
                href={String(href).trim()}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
              >
                Apply Now <ExternalLink className="w-3 h-3" />
              </a>
            ) : (
              <span className="text-xs text-slate-400 italic">Link pending</span>
            );
          })()}
        </div>

        {comp.tags && comp.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1 border-t border-slate-100">
            {comp.tags.slice(0, 4).map((tag) => (
              <span key={tag} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                {tag}
              </span>
            ))}
            {comp.tags.length > 4 && (
              <span className="text-xs text-slate-400">+{comp.tags.length - 4} more</span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CardSkeleton() {
  return (
    <Card className="rounded-2xl border border-slate-200">
      <CardContent className="p-5 space-y-3">
        <div className="flex gap-2">
          <Skeleton className="h-6 w-24 rounded-full" />
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-5/6" />
        <div className="flex justify-between pt-1">
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-7 w-16 rounded-lg" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function CompetitionsPage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [mode, setMode] = useState("All");
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");

  const { data, isLoading } = useQuery<{ competitions: Competition[]; total: number; page: number }>({
    queryKey: ["/api/competitions", { search, category, mode, page }],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), limit: "18" });
      if (search) params.set("search", search);
      if (category !== "All") params.set("category", category);
      if (mode !== "All") params.set("mode", mode);
      return fetch(`/api/competitions?${params}`).then(r => r.json());
    },
  });

  const comps = data?.competitions ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / 18);

  function applySearch() {
    setSearch(searchInput);
    setPage(1);
  }

  function resetFilters() {
    setSearch("");
    setSearchInput("");
    setCategory("All");
    setMode("All");
    setPage(1);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-violet-50/30 to-slate-50">
      {/* Hero */}
      <div className="bg-gradient-to-r from-violet-700 via-purple-700 to-indigo-700 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center gap-3 mb-4">
            <Trophy className="w-8 h-8 text-yellow-300" />
            <span className="text-sm font-semibold bg-white/20 px-3 py-1 rounded-full">StudentXchange</span>
          </div>
          <h1 className="text-4xl lg:text-5xl font-black tracking-tight mb-3">
            Competitions <span className="text-yellow-300">Hub</span>
          </h1>
          <p className="text-lg text-violet-100 max-w-2xl">
            Hackathons, case studies, coding contests, olympiads and more — curated for students across every field.
          </p>
          <div className="mt-6 flex gap-3 flex-wrap text-sm">
            <span className="bg-white/10 border border-white/20 px-3 py-1.5 rounded-lg">🏆 {total > 0 ? `${total}+ Active Competitions` : "Competitions Feed"}</span>
            <span className="bg-white/10 border border-white/20 px-3 py-1.5 rounded-lg">🌍 All Fields & Disciplines</span>
            <span className="bg-white/10 border border-white/20 px-3 py-1.5 rounded-lg">📅 Updated Regularly</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search + Filters */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm mb-8">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search competitions, organizers..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && applySearch()}
                className="pl-9 rounded-xl border-slate-200"
              />
            </div>
            <Select value={category} onValueChange={(v) => { setCategory(v); setPage(1); }}>
              <SelectTrigger className="w-full sm:w-44 rounded-xl border-slate-200">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Categories</SelectItem>
                {COMPETITION_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={mode} onValueChange={(v) => { setMode(v); setPage(1); }}>
              <SelectTrigger className="w-full sm:w-36 rounded-xl border-slate-200">
                <SelectValue placeholder="Mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Modes</SelectItem>
                <SelectItem value="Online">Online</SelectItem>
                <SelectItem value="Offline">Offline</SelectItem>
                <SelectItem value="Hybrid">Hybrid</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={applySearch} className="bg-violet-600 hover:bg-violet-700 rounded-xl gap-1.5 shrink-0">
              <Filter className="w-4 h-4" /> Filter
            </Button>
          </div>
          {(search || category !== "All" || mode !== "All") && (
            <div className="mt-3 flex items-center gap-2 text-sm text-slate-500">
              <span>Active filters:</span>
              {search && <Badge variant="secondary" className="rounded-full">{search}</Badge>}
              {category !== "All" && <Badge variant="secondary" className="rounded-full">{category}</Badge>}
              {mode !== "All" && <Badge variant="secondary" className="rounded-full">{mode}</Badge>}
              <button onClick={resetFilters} className="text-violet-600 hover:underline ml-1">Clear all</button>
            </div>
          )}
        </div>

        {/* Results */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {Array.from({ length: 9 }).map((_, i) => <CardSkeleton key={i} />)}
          </div>
        ) : comps.length === 0 ? (
          <div className="text-center py-24">
            <Trophy className="w-14 h-14 mx-auto text-slate-300 mb-4" />
            <h3 className="text-xl font-bold text-slate-700 mb-2">No competitions found</h3>
            <p className="text-slate-500 mb-4">Try adjusting your filters or check back soon.</p>
            <Button variant="outline" onClick={resetFilters} className="rounded-xl">Reset Filters</Button>
            <DiscoverySearchLinks category="competitions" query={search} />
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-slate-500">
                Showing <span className="font-semibold text-slate-700">{comps.length}</span> of <span className="font-semibold text-slate-700">{total}</span> competitions
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {comps.map((c) => <CompetitionCard key={c.id} comp={c} />)}
            </div>

            {totalPages > 1 && (
              <div className="mt-8 flex items-center justify-center gap-3">
                <Button
                  variant="outline" size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="rounded-xl gap-1"
                >
                  <ChevronLeft className="w-4 h-4" /> Previous
                </Button>
                <span className="text-sm text-slate-600">Page {page} of {totalPages}</span>
                <Button
                  variant="outline" size="sm"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="rounded-xl gap-1"
                >
                  Next <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
