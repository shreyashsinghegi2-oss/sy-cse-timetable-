import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { CAREER_YEARS, DEGREE_GROUPS } from "@/config/constants";
import RoadmapView, { Roadmap, SkillState } from "@/components/lancing/roadmap-view";
import {
  Loader2, Sparkles, Save, Eye, EyeOff, Building2, Map, Users,
  Code2, ChevronRight, X, CheckCircle2, Circle, CircleDot, RefreshCw, Crown,
} from "lucide-react";

type GetToken = () => Promise<string | null>;

async function adminFetch(getToken: GetToken, url: string, init: RequestInit = {}) {
  const token = await getToken();
  return fetch(url, {
    ...init,
    headers: { ...(init.headers || {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
}

const DEFAULT_INSTITUTION = "Your Institute";

// ══════════════════════════════════════════════════════════════════════════════
// Roadmap Manager
// ══════════════════════════════════════════════════════════════════════════════
function RoadmapManager({ getToken }: { getToken: GetToken }) {
  const { toast } = useToast();
  const [degree, setDegree] = useState("");
  const [year, setYear] = useState("");
  const [institution, setInstitution] = useState(DEFAULT_INSTITUTION);
  const [focusAreas, setFocusAreas] = useState("");
  const [targetCompanies, setTargetCompanies] = useState("");
  const [context, setContext] = useState("");

  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
  const [status, setStatus] = useState<"none" | "draft" | "published">("none");
  const [generatedBy, setGeneratedBy] = useState<"ai" | "manual">("manual");
  const [showJson, setShowJson] = useState(false);
  const [jsonText, setJsonText] = useState("");
  const [jsonError, setJsonError] = useState<string | null>(null);

  const loadExisting = useCallback(async (d: string, y: string) => {
    if (!d || !y) return;
    setLoading(true);
    setRoadmap(null);
    setStatus("none");
    try {
      const r = await adminFetch(getToken, `/api/institutional-roadmap/admin/get?degree=${encodeURIComponent(d)}&year=${encodeURIComponent(y)}`);
      if (r.ok) {
        const data = await r.json();
        if (data.exists && data.roadmap) {
          setRoadmap(data.roadmap);
          setStatus(data.status || "draft");
          setGeneratedBy(data.generatedBy || "manual");
          setJsonText(JSON.stringify(data.roadmap, null, 2));
        } else {
          setRoadmap(null);
          setStatus("none");
          setJsonText("");
        }
      }
    } catch {
      toast({ title: "Failed to load roadmap", variant: "destructive" });
    }
    setLoading(false);
  }, [getToken, toast]);

  useEffect(() => {
    if (degree && year) loadExisting(degree, year);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [degree, year]);

  const generate = async () => {
    if (!degree || !year) { toast({ title: "Select degree and year first", variant: "destructive" }); return; }
    setGenerating(true);
    try {
      const r = await adminFetch(getToken, "/api/institutional-roadmap/admin/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          degree, year, institution,
          focusAreas: focusAreas.split(",").map((s) => s.trim()).filter(Boolean),
          targetCompanies: targetCompanies.split(",").map((s) => s.trim()).filter(Boolean),
          context,
        }),
      });
      if (!r.ok) {
        const error = await r.json().catch(() => ({}));
        throw new Error(error.message || "Please try again.");
      }
      const data = await r.json();
      if (data.roadmap) {
        setRoadmap(data.roadmap);
        setGeneratedBy("ai");
        setJsonText(JSON.stringify(data.roadmap, null, 2));
        toast({ title: "Roadmap generated ✓", description: "Review it below, then save & publish." });
      }
    } catch (error: any) {
      toast({ title: "AI generation failed", description: error.message || "Please try again.", variant: "destructive" });
    }
    setGenerating(false);
  };

  const applyJson = () => {
    try {
      const parsed = JSON.parse(jsonText);
      setRoadmap(parsed);
      setGeneratedBy("manual");
      setJsonError(null);
      toast({ title: "Applied JSON to preview ✓" });
    } catch (e: any) {
      setJsonError(e.message || "Invalid JSON");
    }
  };

  const save = async (publish: boolean) => {
    if (!degree || !year || !roadmap) { toast({ title: "Nothing to save", variant: "destructive" }); return; }
    setSaving(true);
    try {
      const r = await adminFetch(getToken, "/api/institutional-roadmap/admin/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ degree, year, roadmap, status: publish ? "published" : "draft", generatedBy }),
      });
      if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.error || "save failed"); }
      setStatus(publish ? "published" : "draft");
      toast({ title: publish ? "Published ✓" : "Saved as draft ✓", description: `${degree} · ${year}` });
    } catch (e: any) {
      toast({ title: "Failed to save", description: e.message, variant: "destructive" });
    }
    setSaving(false);
  };

  const toggleStatus = async () => {
    if (status === "none") return;
    const next = status === "published" ? "draft" : "published";
    setSaving(true);
    try {
      const r = await adminFetch(getToken, "/api/institutional-roadmap/admin/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ degree, year, status: next }),
      });
      if (!r.ok) throw new Error("status failed");
      setStatus(next);
      toast({ title: next === "published" ? "Published ✓" : "Unpublished (draft) ✓" });
    } catch {
      toast({ title: "Failed to update status", variant: "destructive" });
    }
    setSaving(false);
  };

  const statusBadge =
    status === "published" ? "bg-green-100 text-green-700 border-green-200"
    : status === "draft" ? "bg-amber-100 text-amber-700 border-amber-200"
    : "bg-gray-100 text-gray-500 border-gray-200";

  return (
    <div className="space-y-4">
      {/* Selectors */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Degree / Branch</label>
              <select value={degree} onChange={(e) => setDegree(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 bg-white">
                <option value="">Select degree…</option>
                {DEGREE_GROUPS.map((g) => (
                  <optgroup key={g.group} label={g.group}>
                    {g.degrees.map((d) => <option key={d} value={d}>{d}</option>)}
                  </optgroup>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Year of Study</label>
              <select value={year} onChange={(e) => setYear(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 bg-white">
                <option value="">Select year…</option>
                {CAREER_YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Institution</label>
              <input value={institution} onChange={(e) => setInstitution(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 bg-white" />
            </div>
          </div>

          {degree && year && (
            <div className="flex items-center justify-between gap-3 flex-wrap pt-1">
              <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${statusBadge}`}>
                {status === "none" ? "No roadmap yet" : status === "published" ? "Published" : "Draft (hidden from students)"}
              </span>
              {loading && <Loader2 className="w-4 h-4 animate-spin text-sky-500" />}
            </div>
          )}
        </CardContent>
      </Card>

      {degree && year && (
        <>
          {/* AI generation */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-500" />
                <span className="text-sm font-bold text-gray-800">Generate with AI</span>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Focus Areas (comma-separated)</label>
                  <input value={focusAreas} onChange={(e) => setFocusAreas(e.target.value)} placeholder="DSA, Full-stack, Cloud" className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Target Companies (comma-separated)</label>
                  <input value={targetCompanies} onChange={(e) => setTargetCompanies(e.target.value)} placeholder="TCS, Infosys, Amazon" className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Additional Context</label>
                <textarea value={context} onChange={(e) => setContext(e.target.value)} rows={2} placeholder="Any institution-specific priorities, electives, placement strategy…" className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-y" />
              </div>
              <Button onClick={generate} disabled={generating} className="bg-indigo-600 hover:bg-indigo-700">
                {generating ? <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Generating…</> : <><Sparkles className="w-4 h-4 mr-1.5" /> {roadmap ? "Regenerate" : "Generate Roadmap"}</>}
              </Button>
            </CardContent>
          </Card>

          {/* Manual JSON editor */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <button onClick={() => setShowJson((s) => !s)} className="flex items-center gap-2 text-sm font-bold text-gray-800">
                <Code2 className="w-4 h-4 text-gray-500" />
                Edit manually (JSON)
                <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${showJson ? "rotate-90" : ""}`} />
              </button>
              {showJson && (
                <div className="space-y-2">
                  <textarea
                    value={jsonText}
                    onChange={(e) => setJsonText(e.target.value)}
                    rows={12}
                    spellCheck={false}
                    placeholder="Paste or edit roadmap JSON here…"
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-gray-400 resize-y"
                  />
                  {jsonError && <p className="text-xs text-red-600">⚠ {jsonError}</p>}
                  <Button onClick={applyJson} variant="outline" size="sm">
                    <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Apply to preview
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Preview + Save */}
          {roadmap && (
            <>
              {(!roadmap.career_map || !roadmap.project_suggestions?.length) && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
                  This roadmap was saved without the Career Map or project sections. Existing published content is unchanged; add those sections or generate a new draft before publishing a complete shared student experience.
                </div>
              )}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2 text-sm font-bold text-gray-800">
                      <Eye className="w-4 h-4 text-gray-500" /> Preview
                      <span className="text-[10px] font-semibold text-gray-400 uppercase">({generatedBy === "ai" ? "AI-generated" : "Manual"})</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button onClick={() => save(false)} disabled={saving} variant="outline" size="sm">
                        {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1.5" />} Save Draft
                      </Button>
                      <Button onClick={() => save(true)} disabled={saving} size="sm" className="bg-green-600 hover:bg-green-700">
                        <Eye className="w-3.5 h-3.5 mr-1.5" /> Save & Publish
                      </Button>
                      {status !== "none" && (
                        <Button onClick={toggleStatus} disabled={saving} variant="outline" size="sm">
                          {status === "published" ? <><EyeOff className="w-3.5 h-3.5 mr-1.5" /> Unpublish</> : <><Eye className="w-3.5 h-3.5 mr-1.5" /> Publish</>}
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
              <div className="pointer-events-none opacity-95">
                <RoadmapView roadmap={roadmap} skillStatus={{}} onCycleSkill={() => {}} trackType="institutional" readOnly />
              </div>
            </>
          )}
        </>
      )}

      {!degree || !year ? (
        <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-10 text-center">
          <Map className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-semibold text-gray-600">Select a degree and year to manage its roadmap</p>
        </div>
      ) : null}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Student Progress Tracker
// ══════════════════════════════════════════════════════════════════════════════
interface StudentRow {
  uid: string;
  email: string | null;
  name: string;
  degree: string;
  year: string;
  personalScore: number;
  personalDone: number;
  personalTotal: number;
  institutionalScore: number;
  institutionalDone: number;
  institutionalTotal: number;
  isPremium?: boolean;
}

function ScoreBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
      </div>
      <span className="text-xs font-bold text-gray-700 w-9 text-right">{value}%</span>
    </div>
  );
}

function ProgressColumn({ label, score, done, total, barColor, labelColor }: {
  label: string; score: number; done: number; total: number;
  barColor: string; labelColor: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className={`text-[10px] font-bold uppercase tracking-wide ${labelColor}`}>{label}</span>
        <span className="text-[11px] font-bold text-gray-800">{score}%</span>
      </div>
      <div className="w-full h-2 rounded-full bg-gray-100 overflow-hidden">
        <div className={`h-full rounded-full ${barColor} transition-all duration-500`} style={{ width: `${Math.max(0, Math.min(100, score))}%` }} />
      </div>
      <span className="text-[10px] text-gray-400">{done}/{total} skills</span>
    </div>
  );
}

function StudentDetailModal({ getToken, student, onClose }: { getToken: GetToken; student: StudentRow; onClose: () => void }) {
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<any>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const r = await adminFetch(getToken, `/api/institutional-roadmap/admin/student-detail?uid=${encodeURIComponent(student.uid)}&degree=${encodeURIComponent(student.degree)}&year=${encodeURIComponent(student.year)}`);
        if (r.ok) setDetail(await r.json());
      } catch {}
      setLoading(false);
    })();
  }, [getToken, student]);

  const renderTrack = (label: string, track: any, color: string) => {
    const roadmap: Roadmap | null = track?.roadmap || null;
    const skillStatus: Record<string, SkillState> = track?.skillStatus || {};
    const skills = roadmap ? roadmap.years.flatMap((y) => y.skills) : [];
    return (
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-bold text-gray-800">{label}</h4>
          <span className={`text-xs font-bold ${color}`}>{track?.score ?? 0}%</span>
        </div>
        {!roadmap ? (
          <p className="text-xs text-gray-400 italic">No roadmap for this track.</p>
        ) : (
          <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
            {skills.map((s) => {
              const st = skillStatus[s.name] || "not_started";
              return (
                <div key={s.name} className="flex items-center gap-2 text-xs">
                  {st === "done" ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                    : st === "in_progress" ? <CircleDot className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                    : <Circle className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />}
                  <span className={st === "done" ? "line-through text-gray-400" : "text-gray-700"}>{s.name}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-gray-100 sticky top-0 bg-white">
          <div>
            <h3 className="font-bold text-gray-900">{student.name}</h3>
            <p className="text-xs text-gray-400">{student.email} · {student.degree} · {student.year}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-4">
          {loading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="w-7 h-7 animate-spin text-sky-500" /></div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-5">
              {renderTrack("Personal Career Map", detail?.personal, "text-sky-600")}
              <div className="hidden sm:block w-px bg-gray-100" />
              {renderTrack(
                detail?.institutional?.source === "student_generated" ? "Institutional Career Map · Student-generated" : detail?.institutional?.source === "published" ? "Institutional Career Map · Published" : "Institutional Career Map",
                detail?.institutional, "text-emerald-600",
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StudentProgressTracker({ getToken }: { getToken: GetToken }) {
  const { toast } = useToast();
  const [degree, setDegree] = useState("");
  const [year, setYear] = useState("");
  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [selected, setSelected] = useState<StudentRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (degree) params.set("degree", degree);
      if (year) params.set("year", year);
      const r = await adminFetch(getToken, `/api/institutional-roadmap/admin/student-progress?${params.toString()}`);
      if (r.ok) {
        const data = await r.json();
        setStudents(data.students || []);
      } else {
        throw new Error();
      }
    } catch {
      toast({ title: "Failed to load students", variant: "destructive" });
    }
    setLoading(false);
  }, [degree, year, getToken, toast]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4">
          <div className="grid sm:grid-cols-3 gap-3 items-end">
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Degree</label>
              <select value={degree} onChange={(e) => setDegree(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 bg-white">
                <option value="">All degrees</option>
                {DEGREE_GROUPS.map((g) => (
                  <optgroup key={g.group} label={g.group}>
                    {g.degrees.map((d) => <option key={d} value={d}>{d}</option>)}
                  </optgroup>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Year</label>
              <select value={year} onChange={(e) => setYear(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 bg-white">
                <option value="">All years</option>
                {CAREER_YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <Button onClick={load} variant="outline" disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><RefreshCw className="w-4 h-4 mr-1.5" /> Refresh</>}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16"><Loader2 className="w-7 h-7 animate-spin text-sky-500" /></div>
          ) : students.length === 0 ? (
            <div className="text-center py-16">
              <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm font-semibold text-gray-600">No students found</p>
              <p className="text-xs text-gray-400 mt-1">Try a different degree/year filter.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {/* Header row */}
              <div className="hidden sm:grid px-5 py-3 bg-gray-50 border-b border-gray-100" style={{ gridTemplateColumns: "1.8fr 1fr 1fr auto" }}>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Student</span>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-sky-500" />
                  <span className="text-[10px] font-bold text-sky-600 uppercase tracking-wider">Personal</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Institutional</span>
                </div>
                <span />
              </div>

              {students.map((s) => (
                <button
                  key={s.uid}
                  onClick={() => setSelected(s)}
                  className="w-full px-5 py-4 text-left hover:bg-slate-50 transition-colors"
                >
                  {/* Desktop: 4-col grid */}
                  <div className="hidden sm:grid items-center gap-5" style={{ gridTemplateColumns: "1.8fr 1fr 1fr auto" }}>
                    {/* Student info */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-sm font-semibold text-gray-800 truncate">{s.name}</span>
                        {s.isPremium && (
                          <span className="inline-flex items-center gap-0.5 shrink-0 px-1.5 py-0.5 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 text-white text-[9px] font-bold uppercase tracking-wide shadow-sm">
                            <Crown className="w-2.5 h-2.5" /> Premium
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-gray-400 mt-0.5 truncate">{s.email} · {s.year}</div>
                    </div>

                    {/* Personal column */}
                    <ProgressColumn
                      label="Personal" score={s.personalScore}
                      done={s.personalDone} total={s.personalTotal}
                      barColor="bg-sky-500" labelColor="text-sky-600"
                    />

                    {/* Institutional column */}
                    <ProgressColumn
                      label="Institutional" score={s.institutionalScore}
                      done={s.institutionalDone} total={s.institutionalTotal}
                      barColor="bg-emerald-500" labelColor="text-emerald-600"
                    />

                    <ChevronRight className="w-4 h-4 text-gray-300" />
                  </div>

                  {/* Mobile: stacked */}
                  <div className="sm:hidden space-y-3">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-semibold text-gray-800">{s.name}</span>
                      {s.isPremium && (
                        <span className="inline-flex items-center gap-0.5 shrink-0 px-1.5 py-0.5 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 text-white text-[9px] font-bold uppercase tracking-wide shadow-sm">
                          <Crown className="w-2.5 h-2.5" /> Premium
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-gray-400">{s.email} · {s.year}</div>
                    <div className="grid grid-cols-2 gap-3">
                      <ProgressColumn
                        label="Personal" score={s.personalScore}
                        done={s.personalDone} total={s.personalTotal}
                        barColor="bg-sky-500" labelColor="text-sky-600"
                      />
                      <ProgressColumn
                        label="Institutional" score={s.institutionalScore}
                        done={s.institutionalDone} total={s.institutionalTotal}
                        barColor="bg-emerald-500" labelColor="text-emerald-600"
                      />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {selected && <StudentDetailModal getToken={getToken} student={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Coding Arena Analytics
// ══════════════════════════════════════════════════════════════════════════════
interface ArenaStudent {
  uid: string; name: string; email: string | null; degree: string; year: string;
  solvedCount: number; attemptedCount: number; mediumSolved: number; hardSolved: number;
  streak: number; codingReadinessScore: number; weakAreas: string[];
  bySkillTag: Record<string, { attempted: number; solved: number; avgAttempts: number }>;
  lastSolvedAt: string | null;
}

const DIFF_COLOR: Record<string, string> = {
  Easy: "bg-green-100 text-green-700",
  Medium: "bg-amber-100 text-amber-700",
  Hard: "bg-red-100 text-red-700",
};

function CodingArenaAdmin({ getToken }: { getToken: GetToken }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [expandedUid, setExpandedUid] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await adminFetch(getToken, "/api/coding-arena/admin/overview");
      if (!r.ok) throw new Error();
      setData(await r.json());
    } catch {
      toast({ title: "Failed to load Coding Arena stats", variant: "destructive" });
    }
    setLoading(false);
  }, [getToken, toast]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return <div className="flex items-center justify-center py-16"><Loader2 className="w-7 h-7 animate-spin text-violet-500" /></div>;
  }
  if (!data) {
    return <p className="text-sm text-gray-500 py-8 text-center">Could not load Coding Arena data.</p>;
  }

  const s = data.summary || {};
  const students: ArenaStudent[] = data.students || [];

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Active Students", value: `${s.activeStudents || 0}/${s.totalStudents || 0}` },
          { label: "Problems Live", value: s.totalProblems || 0 },
          { label: "Total Solves", value: s.totalSolved || 0 },
          { label: "Avg Readiness", value: `${s.avgReadiness || 0}%` },
        ].map((c) => (
          <Card key={c.label}>
            <CardContent className="p-4">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{c.label}</p>
              <p className="text-2xl font-extrabold text-gray-900 mt-1">{c.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Common weak areas */}
      {(data.topWeakAreas || []).length > 0 && (
        <Card>
          <CardContent className="p-4">
            <p className="text-sm font-bold text-gray-800 mb-2">Common Weak Areas (AI-detected)</p>
            <div className="flex flex-wrap gap-2">
              {data.topWeakAreas.map((w: any) => (
                <span key={w.tag} className="text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 px-2.5 py-1 rounded-full">
                  {w.tag} · {w.count} student{w.count > 1 ? "s" : ""}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Student leaderboard */}
      <Card>
        <CardContent className="p-0">
          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <p className="text-sm font-bold text-gray-800">Student Activity ({students.length})</p>
            <Button onClick={load} variant="outline" size="sm"><RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Refresh</Button>
          </div>
          {students.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-10">No coding activity yet.</p>
          ) : (
            <div className="divide-y divide-gray-100">
              <div className="hidden sm:grid grid-cols-[1.7fr_repeat(4,0.7fr)_auto] gap-2 px-4 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                <div>Student</div><div>Solved</div><div>Med/Hard</div><div>Streak</div><div>Readiness</div><div></div>
              </div>
              {students.map((st) => {
                const open = expandedUid === st.uid;
                return (
                  <div key={st.uid}>
                    <button
                      onClick={() => setExpandedUid(open ? null : st.uid)}
                      className="w-full grid sm:grid-cols-[1.7fr_repeat(4,0.7fr)_auto] grid-cols-2 gap-2 px-4 py-3 text-left hover:bg-slate-50 items-center"
                    >
                      <div className="min-w-0 col-span-2 sm:col-span-1">
                        <div className="text-sm font-semibold text-gray-800 truncate">{st.name}</div>
                        <div className="text-[11px] text-gray-400 truncate">{st.email} {st.degree ? `· ${st.degree}` : ""} {st.year ? `· ${st.year}` : ""}</div>
                      </div>
                      <div className="text-sm font-bold text-gray-800">{st.solvedCount}<span className="text-[11px] text-gray-400 font-normal">/{st.attemptedCount} tried</span></div>
                      <div className="text-xs text-gray-600">{st.mediumSolved}M · {st.hardSolved}H</div>
                      <div className="text-xs text-gray-600">{st.streak > 0 ? `🔥 ${st.streak}d` : "—"}</div>
                      <ScoreBar value={st.codingReadinessScore} color="bg-violet-500" />
                      <ChevronRight className={`hidden sm:block w-4 h-4 text-gray-300 transition-transform ${open ? "rotate-90" : ""}`} />
                    </button>
                    {open && (
                      <div className="px-4 pb-4 bg-slate-50 border-t border-gray-100 pt-3 space-y-3">
                        {st.weakAreas.length > 0 && (
                          <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Weak Areas</p>
                            <div className="flex flex-wrap gap-1.5">
                              {st.weakAreas.map((w) => <span key={w} className="text-[11px] font-semibold bg-rose-50 text-rose-700 px-2 py-0.5 rounded-full border border-rose-200">{w}</span>)}
                            </div>
                          </div>
                        )}
                        <div>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Skill Breakdown (roadmap-aligned)</p>
                          {Object.keys(st.bySkillTag).length === 0 ? (
                            <p className="text-xs text-gray-400 italic">No skill data yet.</p>
                          ) : (
                            <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1">
                              {Object.entries(st.bySkillTag).map(([tag, v]) => (
                                <div key={tag} className="flex items-center justify-between text-xs">
                                  <span className="text-gray-700 truncate">{tag}</span>
                                  <span className="text-gray-500 shrink-0 ml-2">{v.solved}/{v.attempted} solved</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        {st.lastSolvedAt && <p className="text-[11px] text-gray-400">Last solve: {new Date(st.lastSolvedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</p>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Hardest problems */}
        <Card>
          <CardContent className="p-4">
            <p className="text-sm font-bold text-gray-800 mb-2">Hardest Problems (lowest solve rate)</p>
            {(data.hardestProblems || []).length === 0 ? (
              <p className="text-xs text-gray-400 italic py-4 text-center">Not enough attempts yet.</p>
            ) : (
              <div className="space-y-2">
                {data.hardestProblems.map((p: any) => (
                  <div key={p.problemId} className="flex items-center justify-between gap-2 text-xs border-b border-gray-50 pb-1.5">
                    <div className="min-w-0">
                      <span className="font-semibold text-gray-800 truncate block">{p.title}</span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${DIFF_COLOR[p.difficulty] || "bg-gray-100 text-gray-600"}`}>{p.difficulty}</span>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-bold text-gray-800">{p.solveRate}% solve rate</div>
                      <div className="text-gray-400">{p.attempts} attempts · {p.solvers} solved</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent submissions */}
        <Card>
          <CardContent className="p-4">
            <p className="text-sm font-bold text-gray-800 mb-2">Recent Submissions</p>
            {(data.recentSubmissions || []).length === 0 ? (
              <p className="text-xs text-gray-400 italic py-4 text-center">No submissions yet.</p>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {data.recentSubmissions.map((sub: any) => (
                  <div key={sub.id} className="flex items-center justify-between gap-2 text-xs border-b border-gray-50 pb-1.5">
                    <div className="min-w-0">
                      <span className="font-semibold text-gray-800 truncate block">{sub.studentName}</span>
                      <span className="text-gray-400 truncate block">{sub.problemTitle} · {sub.language}</span>
                    </div>
                    <div className="text-right shrink-0">
                      <span className={`font-bold ${sub.status === "accepted" ? "text-green-600" : "text-rose-600"}`}>
                        {sub.status === "accepted" ? "✓ Accepted" : `✗ ${sub.passed}/${sub.total}`}
                      </span>
                      {sub.submittedAt && <div className="text-gray-400">{new Date(sub.submittedAt).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Main tab with sub-tabs
// ══════════════════════════════════════════════════════════════════════════════
export default function CareerCompassAdminTab({ getToken }: { getToken: GetToken }) {
  const [sub, setSub] = useState<"manager" | "progress" | "arena">("manager");

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <Building2 className="w-5 h-5 text-emerald-600" />
        <div>
          <h2 className="text-lg font-bold text-gray-900">Career Compass</h2>
          <p className="text-xs text-gray-500">Shared student experience · institutional publishing and both-track progress</p>
        </div>
      </div>

      <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        <button
          onClick={() => setSub("manager")}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${sub === "manager" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
        >
          <Map className="w-4 h-4 inline mr-1.5" /> Roadmap Manager
        </button>
        <button
          onClick={() => setSub("progress")}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${sub === "progress" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
        >
          <Users className="w-4 h-4 inline mr-1.5" /> Student Progress
        </button>
        <button
          onClick={() => setSub("arena")}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${sub === "arena" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
        >
          <Code2 className="w-4 h-4 inline mr-1.5" /> Coding Arena
        </button>
      </div>

      {sub === "manager" ? <RoadmapManager getToken={getToken} /> : sub === "progress" ? <StudentProgressTracker getToken={getToken} /> : <CodingArenaAdmin getToken={getToken} />}
    </div>
  );
}
