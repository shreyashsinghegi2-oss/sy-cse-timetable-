import { displayInstitutionName } from "@/lib/institution-display";
import { useState, useEffect, useCallback, useRef } from "react";
import { auth } from "@/lib/firebase";
import { CAREER_DEGREES, CAREER_YEARS, DEGREE_GROUPS } from "@/config/constants";
import RoadmapView, { Roadmap, SkillState } from "@/components/lancing/roadmap-view";
import {
  Loader2, Building2, ChevronLeft, MapPinned, Handshake,
  Sparkles, RefreshCw, AlertCircle, Map,
} from "lucide-react";

// ─── Loading step config (matches personal track timing) ─────────────────────
const LOADING_STEPS = [
  "Analysing your degree & goals…",
  "Mapping career pathways…",
  "Building Year 1 roadmap…",
  "Adding learning resources…",
  "Generating project suggestions…",
  "Finalising your roadmap…",
];
const STEP_DURATIONS = [1200, 1800, 2500, 2000, 2000];

async function authedFetch(url: string, init: RequestInit = {}) {
  const token = await auth.currentUser?.getIdToken();
  return fetch(url, {
    ...init,
    headers: { ...(init.headers || {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
}

export default function InstitutionalRoadmapView({
  initialDegree, initialYear, institution, onBack, aspirations = [],
  onDegreeChange, onYearChange,
}: {
  initialDegree?: string;
  initialYear?: string;
  institution?: string;
  onBack: () => void;
  aspirations?: string[];
  onDegreeChange?: (degree: string) => void;
  onYearChange?: (year: string) => void;
}) {
  const [degree, setDegree] = useState(
    initialDegree && CAREER_DEGREES.includes(initialDegree) ? initialDegree : ""
  );
  const [year, setYear] = useState(
    initialYear && CAREER_YEARS.includes(initialYear) ? initialYear : ""
  );

  // Keep in sync when the shared (personal-track) info loads after mount —
  // both tracks always show the same entered info.
  useEffect(() => {
    if (initialDegree && CAREER_DEGREES.includes(initialDegree)) setDegree(initialDegree);
  }, [initialDegree]);
  useEffect(() => {
    if (initialYear && CAREER_YEARS.includes(initialYear)) setYear(initialYear);
  }, [initialYear]);

  // Admin-published roadmap
  const [loading, setLoading] = useState(false);
  const [adminRoadmap, setAdminRoadmap] = useState<Roadmap | null>(null);
  const [adminStatus, setAdminStatus] = useState<"none" | "published">("none");
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  // AI-generated roadmap
  const [generatedRoadmap, setGeneratedRoadmap] = useState<Roadmap | null>(null);
  const [generating, setGenerating] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [genError, setGenError] = useState<string | null>(null);
  const [roadmapSaveError, setRoadmapSaveError] = useState<string | null>(null);
  const [savingRoadmap, setSavingRoadmap] = useState(false);

  // Skill progress
  const [skillStatus, setSkillStatus] = useState<Record<string, SkillState>>({});
  const [progressSaveError, setProgressSaveError] = useState<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Cycle through step messages while generating (matches personal track) ──
  useEffect(() => {
    if (!generating) { setLoadingStep(0); return; }
    setLoadingStep(0);
    const timers: ReturnType<typeof setTimeout>[] = [];
    let accumulated = 0;
    STEP_DURATIONS.forEach((dur, i) => {
      accumulated += dur;
      const t = setTimeout(() => setLoadingStep(i + 1), accumulated);
      timers.push(t);
    });
    return () => timers.forEach(clearTimeout);
  }, [generating]);

  const loadRoadmap = useCallback(async (d: string, y: string) => {
    if (!d || !y) { setAdminRoadmap(null); setAdminStatus("none"); return; }
    setLoading(true);
    setAdminRoadmap(null);
    setGeneratedRoadmap(null);
    try {
      const [adminRes, progressRes] = await Promise.all([
        authedFetch(`/api/institutional-roadmap/student?degree=${encodeURIComponent(d)}&year=${encodeURIComponent(y)}`),
        authedFetch(`/api/institutional-roadmap/progress?degree=${encodeURIComponent(d)}`),
      ]);
      if (adminRes.ok) {
        const data = await adminRes.json();
        if (data.roadmap && data.status === "published") {
          setAdminRoadmap(data.roadmap);
          setAdminStatus("published");
          setLastUpdated(data.lastUpdated || null);
        } else {
          setAdminStatus("none");
        }
      }
      if (progressRes.ok) {
        const pd = await progressRes.json();
        setSkillStatus(pd.skillStatus || {});
        if (pd.generatedRoadmap) setGeneratedRoadmap(pd.generatedRoadmap);
      }
    } catch {
      setAdminStatus("none");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (degree && year) loadRoadmap(degree, year);
  }, [degree, year, loadRoadmap]);

  const effectiveAspirations = aspirations.length > 0
    ? aspirations
    : ["Placements", "Software Development"];

  const saveGeneratedRoadmap = useCallback(async (roadmap: Roadmap) => {
    setSavingRoadmap(true);
    setRoadmapSaveError(null);
    try {
      const response = await authedFetch("/api/institutional-roadmap/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ degree, year, generatedRoadmap: roadmap }),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error((err as any).error || `Server error ${response.status}`);
      }
    } catch (e: any) {
      setRoadmapSaveError(e?.message || "Failed to save roadmap. Please retry.");
    } finally {
      setSavingRoadmap(false);
    }
  }, [degree, year]);

  const generateInstRoadmap = async () => {
    if (!degree || !year || generating) return;
    setGenerating(true);
    setGenError(null);
    setRoadmapSaveError(null);
    try {
      const token = await auth.currentUser?.getIdToken();
      const response = await fetch("/api/career-compass/stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          degree,
          year,
          aspirations: effectiveAspirations,
          commitment: "Actively applying",
          hours: "5-10 hrs",
          university: institution || "",
          track: "institutional",
        }),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error((err as any).error || `Server error ${response.status}`);
      }
      const ct = response.headers.get("Content-Type") || "";
      let finalRoadmap: Roadmap | null = null;
      if (ct.includes("application/json")) {
        const data = await response.json();
        if (data.roadmap) finalRoadmap = data.roadmap;
      } else {
        const reader = response.body!.getReader();
        const decoder = new TextDecoder();
        let buf = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          const lines = buf.split("\n");
          buf = lines.pop() || "";
          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            try {
              const payload = JSON.parse(line.slice(6));
              if (payload.done && payload.roadmap) finalRoadmap = payload.roadmap;
              if (payload.error) throw new Error(payload.error);
            } catch (e) {
              if (e instanceof SyntaxError) continue;
              throw e;
            }
          }
        }
      }
      if (finalRoadmap) {
        setGeneratedRoadmap(finalRoadmap);
        await saveGeneratedRoadmap(finalRoadmap);
      } else {
        throw new Error("Connection interrupted. Please try again.");
      }
    } catch (e: any) {
      setGenError(e?.message || "Failed to generate roadmap. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  const persistProgress = useCallback((next: Record<string, SkillState>) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      authedFetch("/api/institutional-roadmap/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ degree, year, skillStatus: next }),
      }).then(async (response) => {
        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error((err as any).error || `Server error ${response.status}`);
        }
        setProgressSaveError(null);
      }).catch((e: any) => {
        setProgressSaveError(e?.message || "Failed to save skill progress. Please retry.");
      });
    }, 600);
  }, [degree, year]);

  const retryProgressSave = useCallback(() => {
    if (!degree || !year) return;
    persistProgress(skillStatus);
  }, [degree, year, persistProgress, skillStatus]);

  const cycleSkill = useCallback((name: string) => {
    setSkillStatus((prev) => {
      const cur = prev[name] || "not_started";
      const next: SkillState = cur === "not_started" ? "in_progress" : cur === "in_progress" ? "done" : "not_started";
      const updated = { ...prev, [name]: next };
      persistProgress(updated);
      return updated;
    });
  }, [persistProgress]);

  const displayRoadmap = (adminStatus === "published" && adminRoadmap) ? adminRoadmap : generatedRoadmap;

  return (
    <div className="space-y-4 sm:space-y-5">

      {/* ── Back / meta row ── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-gray-800 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" /> Choose track
        </button>
        {adminStatus === "published" && lastUpdated && (
          <span className="text-[11px] text-gray-400">
            Updated {new Date(lastUpdated).toLocaleDateString()}
          </span>
        )}
        {displayRoadmap && adminStatus !== "published" && !generating && (
          <button
            onClick={() => { setGeneratedRoadmap(null); generateInstRoadmap(); }}
            className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 hover:text-emerald-800 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Regenerate
          </button>
        )}
      </div>

      {/* ── Institutional banner ── */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 shadow-lg">
        <div className="relative z-10 p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-1.5">
            <Building2 className="w-4 h-4 text-emerald-100" />
            <span className="text-emerald-100 font-semibold text-xs tracking-widest uppercase">
              Institutional Track
            </span>
          </div>
          <h2 className="text-lg sm:text-xl font-black text-white leading-tight">
            {adminStatus === "published" && institution
              ? `${displayInstitutionName(institution)}'s Recommended Roadmap`
              : "Your AI Career Roadmap"}
          </h2>
          <p className="text-emerald-50 text-xs sm:text-sm mt-1 leading-relaxed max-w-lg">
            {adminStatus === "published"
              ? "A curated, year-by-year plan published by your institution."
              : "Personalised career plan — skills, internships & companies tailored to your degree & goals."}
          </p>
          <div className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-medium text-emerald-50">
            <Handshake className="w-3.5 h-3.5" />
            Placements, jobs &amp; internships are handled by your institution
          </div>
        </div>
      </div>

      {/* ── Degree + Year selectors ── */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
              Degree / Branch
            </label>
            <select
              value={degree}
              onChange={(e) => { setDegree(e.target.value); setGeneratedRoadmap(null); setGenError(null); onDegreeChange?.(e.target.value); }}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white"
            >
              <option value="">Select your degree…</option>
              {DEGREE_GROUPS.map((g) => (
                <optgroup key={g.group} label={g.group}>
                  {g.degrees.map((d) => <option key={d} value={d}>{d}</option>)}
                </optgroup>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
              Year of Study
            </label>
            <select
              value={year}
              onChange={(e) => { setYear(e.target.value); setGeneratedRoadmap(null); setGenError(null); onYearChange?.(e.target.value); }}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white"
            >
              <option value="">Select your year…</option>
              {CAREER_YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* ── Content area ── */}

      {/* Nothing selected yet */}
      {!generating && !loading && (!degree || !year) && (
        <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-10 text-center">
          <MapPinned className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-semibold text-gray-600">Select your degree and year</p>
          <p className="text-xs text-gray-400 mt-1">We'll load the roadmap for your track.</p>
        </div>
      )}

      {/* Loading from Firestore */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
        </div>
      )}

      {/* Pre-generate CTA — degree+year selected, no roadmap yet */}
      {!loading && !generating && degree && year && !displayRoadmap && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 sm:p-6">
          {genError && (
            <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5 mb-4">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              {genError}
            </div>
          )}
          <button
            onClick={generateInstRoadmap}
            className="w-full h-12 flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-700 hover:via-teal-700 hover:to-cyan-700 text-white font-bold rounded-xl shadow-sm active:scale-[0.98] transition-transform text-sm"
          >
            <Sparkles className="w-4 h-4" />
            Generate My Roadmap
          </button>
          <p className="text-center text-[11px] text-gray-400 mt-2.5">
            Usually takes 20–30 seconds · Saved automatically
          </p>
        </div>
      )}

      {/* ── Generating skeleton — mirrors personal track exactly ── */}
      {generating && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-5">
          {/* Spinner + step message */}
          <div className="flex items-center gap-4">
            <div className="relative flex-shrink-0">
              <div className="w-12 h-12 rounded-full border-4 border-emerald-100 border-t-emerald-500 animate-spin" />
              <Map className="w-5 h-5 text-emerald-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-gray-900 text-sm">Building your roadmap…</p>
              <p className="text-xs text-emerald-600 mt-0.5 font-medium transition-all duration-500">
                {LOADING_STEPS[loadingStep] ?? LOADING_STEPS[LOADING_STEPS.length - 1]}
              </p>
            </div>
          </div>

          {/* Step progress bar */}
          <div className="space-y-2">
            <div className="flex gap-1">
              {LOADING_STEPS.map((_, i) => (
                <div
                  key={i}
                  className={`h-1 flex-1 rounded-full transition-all duration-500 ${
                    i <= loadingStep ? "bg-emerald-500" : "bg-gray-100"
                  }`}
                />
              ))}
            </div>
            <div className="flex justify-between text-[10px] text-gray-400">
              <span>Step {Math.min(loadingStep + 1, LOADING_STEPS.length)} of {LOADING_STEPS.length}</span>
              <span className="text-emerald-500">AI-powered generation</span>
            </div>
          </div>

          {/* Animated skeleton cards matching real roadmap layout */}
          <div className="space-y-3 animate-pulse">
            {[
              { w: "w-24", label: "Year 1 — Foundation" },
              { w: "w-28", label: "Year 2 — Growth" },
              { w: "w-32", label: "Year 3 — Specialisation" },
            ].map((item, i) => (
              <div
                key={i}
                className={`rounded-xl border border-gray-100 p-4 space-y-2 transition-opacity duration-700 ${
                  i > loadingStep ? "opacity-30" : "opacity-100"
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className={`h-5 bg-emerald-100 rounded ${item.w}`} />
                  <div className="h-4 bg-gray-100 rounded w-16 ml-auto" />
                </div>
                <div className="h-3 bg-gray-100 rounded w-full" />
                <div className="h-3 bg-gray-100 rounded w-4/5" />
                <div className="flex gap-2 pt-1">
                  <div className="h-5 bg-gray-100 rounded-full w-20" />
                  <div className="h-5 bg-gray-100 rounded-full w-24" />
                  <div className="h-5 bg-gray-100 rounded-full w-16" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Roadmap ready ── */}
      {!loading && !generating && displayRoadmap && (
        <>
          {adminStatus !== "published" && roadmapSaveError && (
            <div className="flex items-center justify-between gap-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5">
              <span className="flex items-center gap-2">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                Roadmap could not be saved: {roadmapSaveError}
              </span>
              <button
                onClick={() => generatedRoadmap && saveGeneratedRoadmap(generatedRoadmap)}
                disabled={savingRoadmap}
                className="shrink-0 font-semibold underline disabled:opacity-50"
              >
                {savingRoadmap ? "Retrying…" : "Retry save"}
              </button>
            </div>
          )}
          {progressSaveError && (
            <div className="flex items-center justify-between gap-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5">
              <span className="flex items-center gap-2">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                Skill progress could not be saved: {progressSaveError}
              </span>
              <button
                onClick={retryProgressSave}
                className="shrink-0 font-semibold underline"
              >
                Retry save
              </button>
            </div>
          )}
          <RoadmapView
            roadmap={displayRoadmap}
            skillStatus={skillStatus}
            onCycleSkill={cycleSkill}
            trackType="institutional"
          />
        </>
      )}

    </div>
  );
}
