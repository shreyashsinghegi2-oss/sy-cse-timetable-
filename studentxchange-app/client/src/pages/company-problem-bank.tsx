import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft, Building2, Trophy, Users, ExternalLink, ChevronRight,
  Search, ShieldCheck, Calendar, Briefcase, Code, BookOpen,
} from "lucide-react";
import { COMPANY_BANK, CompanyTier, CompanyEntry } from "@/data/company-bank";
import ReadinessGateButton from "@/components/lancing/readiness-gate-button";

const TIER_STYLES: Record<CompanyTier, { tab: string; badge: string; accent: string }> = {
  "FAANG": { tab: "from-amber-500 to-orange-500", badge: "bg-gradient-to-r from-amber-100 to-orange-100 text-amber-800 border-amber-200", accent: "text-amber-700" },
  "Tier 1": { tab: "from-indigo-500 to-purple-500", badge: "bg-indigo-50 text-indigo-700 border-indigo-200", accent: "text-indigo-700" },
  "Tier 2": { tab: "from-emerald-500 to-teal-500", badge: "bg-emerald-50 text-emerald-700 border-emerald-200", accent: "text-emerald-700" },
};

const DIFFICULTY_COLORS: Record<string, string> = {
  Easy: "bg-green-50 text-green-700 border-green-200",
  Medium: "bg-amber-50 text-amber-700 border-amber-200",
  Hard: "bg-red-50 text-red-700 border-red-200",
};

export default function CompanyProblemBank() {
  const [, setLocation] = useLocation();
  const [tier, setTier] = useState<CompanyTier>("FAANG");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<CompanyEntry | null>(null);

  const companies = useMemo(() => {
    return COMPANY_BANK.filter(c =>
      c.tier === tier &&
      (query.trim() === "" ||
        c.name.toLowerCase().includes(query.toLowerCase()) ||
        c.topicsTested.some(t => t.toLowerCase().includes(query.toLowerCase())))
    );
  }, [tier, query]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-indigo-50/30">
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-gray-200 px-4 py-3 flex items-center gap-3 shadow-sm">
        <Button variant="ghost" size="sm" onClick={() => setLocation("/lancing/freelancer-dashboard")}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <Building2 className="w-5 h-5 text-indigo-500" />
        <span className="font-bold text-gray-900 flex-1">Company Problem Bank</span>
        <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200 text-[10px]">
          {COMPANY_BANK.length} companies
        </Badge>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-5 space-y-5">
        <Card className="bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 border-0 text-white shadow-xl">
          <CardContent className="p-5">
            <div className="flex items-start gap-3">
              <Trophy className="w-8 h-8 flex-shrink-0" />
              <div className="flex-1">
                <h1 className="text-xl font-black mb-1">Top company hiring playbook</h1>
                <p className="text-sm text-indigo-100">
                  Curated topics, problem sets, interview rounds & eligibility for FAANG, Tier 1 and Tier 2 companies.
                  Apply Now is unlocked when your placement readiness ≥ 70%.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl p-1 w-fit shadow-sm">
          {(["FAANG", "Tier 1", "Tier 2"] as const).map(t => {
            const count = COMPANY_BANK.filter(c => c.tier === t).length;
            const active = tier === t;
            return (
              <button
                key={t}
                onClick={() => setTier(t)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  active ? `bg-gradient-to-r ${TIER_STYLES[t].tab} text-white shadow-sm` : "text-gray-600 hover:text-gray-900"
                }`}
              >
                {t} ({count})
              </button>
            );
          })}
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search by company or topic (e.g. DSA, System Design)…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-10 bg-white border-gray-200"
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          {companies.length === 0 ? (
            <Card className="col-span-full bg-white border-gray-200">
              <CardContent className="p-8 text-center text-gray-400 text-sm">No companies match your search.</CardContent>
            </Card>
          ) : companies.map(c => (
            <Card
              key={c.id}
              className="bg-white border-gray-200 shadow-sm hover:shadow-md transition-all cursor-pointer hover:border-indigo-300"
              onClick={() => setSelected(c)}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="text-3xl">{c.logoEmoji}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="font-bold text-gray-900">{c.name}</h3>
                      <Badge className={`${TIER_STYLES[c.tier].badge} text-[10px] border`}>{c.tier}</Badge>
                    </div>
                    <p className="text-xs text-gray-500 mb-2">{c.ctcRange}</p>
                    <div className="flex flex-wrap gap-1 mb-2">
                      {c.topicsTested.slice(0, 4).map((t, i) => (
                        <span key={i} className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{t}</span>
                      ))}
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">CGPA ≥ {c.eligibility.minCgpa}</span>
                      <span className={`flex items-center gap-1 font-semibold ${TIER_STYLES[c.tier].accent}`}>
                        Details <ChevronRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto" onClick={() => setSelected(null)}>
          <Card className="w-full max-w-2xl bg-white shadow-2xl my-8 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <CardContent className="p-0">
              <div className={`sticky top-0 z-10 bg-gradient-to-r ${TIER_STYLES[selected.tier].tab} text-white px-5 py-4 flex items-center justify-between`}>
                <div className="flex items-center gap-3">
                  <div className="text-3xl">{selected.logoEmoji}</div>
                  <div>
                    <h2 className="text-lg font-bold">{selected.name}</h2>
                    <p className="text-xs text-white/80">{selected.tier} · {selected.ctcRange}</p>
                  </div>
                </div>
                <button onClick={() => setSelected(null)} className="text-white/80 hover:text-white text-xl">×</button>
              </div>

              <div className="p-5 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                      <p className="text-[10px] font-bold text-gray-500 uppercase">Hiring Season</p>
                    </div>
                    <p className="text-xs text-gray-800">{selected.hiringSeason}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                      <p className="text-[10px] font-bold text-gray-500 uppercase">Eligibility</p>
                    </div>
                    <p className="text-xs text-gray-800">CGPA ≥ {selected.eligibility.minCgpa} · {selected.eligibility.backlogs}</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">{selected.eligibility.branches.join(", ")}</p>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Topics Tested</p>
                  <div className="flex flex-wrap gap-1.5">
                    {selected.topicsTested.map((t, i) => (
                      <Badge key={i} className="bg-indigo-50 text-indigo-700 border-indigo-200 text-xs">{t}</Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <Users className="w-3.5 h-3.5 text-purple-500" />
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Interview Rounds</p>
                  </div>
                  <div className="space-y-2">
                    {selected.interviewRounds.map((r, i) => (
                      <div key={i} className="border border-gray-200 rounded-lg p-2.5">
                        <p className="text-sm font-semibold text-gray-900">{i + 1}. {r.name}</p>
                        <p className="text-xs text-gray-600 mt-0.5">{r.description}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <Code className="w-3.5 h-3.5 text-rose-500" />
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Problem Sets</p>
                  </div>
                  <div className="space-y-3">
                    {selected.problemSets.map((set, i) => (
                      <div key={i}>
                        <p className="text-xs font-bold text-gray-700 mb-1.5">{set.topic}</p>
                        <div className="space-y-1">
                          {set.problems.map((p, j) => (
                            <div key={j} className="flex items-center justify-between gap-2 bg-gray-50 rounded-lg px-3 py-2">
                              <div className="flex-1 min-w-0">
                                {p.url ? (
                                  <a href={p.url} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-600 hover:underline flex items-center gap-1">
                                    {p.title} <ExternalLink className="w-3 h-3" />
                                  </a>
                                ) : (
                                  <span className="text-xs text-gray-700">{p.title}</span>
                                )}
                              </div>
                              <Badge className={`${DIFFICULTY_COLORS[p.difficulty]} text-[10px] border`}>{p.difficulty}</Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {selected.recommendedSkills.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-emerald-500" />
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Build These on Your Portal</p>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {selected.recommendedSkills.map((s, i) => (
                        <Badge key={i} className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">{s}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-3 border-t border-gray-200">
                  <ReadinessGateButton
                    className={`w-full bg-gradient-to-r ${TIER_STYLES[selected.tier].tab} hover:opacity-90 text-white font-bold`}
                    onApply={() => {
                      if (selected.applyUrl) window.open(selected.applyUrl, "_blank", "noopener,noreferrer");
                    }}
                  >
                    <Briefcase className="w-4 h-4 mr-1.5" /> Apply Now
                  </ReadinessGateButton>
                  <p className="text-[10px] text-gray-400 text-center mt-1.5">
                    Requires placement readiness ≥ 70%. Build credits in the portal first.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
