import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { redactInstitutionText } from "@/lib/institution-display";
import {
  CheckCircle2, BookOpen, Target, Zap, Award, Sparkles,
  ChevronRight, Trophy, Building2, Map, Lightbulb, Wrench,
  TrendingUp, AlertCircle, BadgeCheck, ExternalLink, Users,
} from "lucide-react";

// ─── Types (shared shape with career-compass) ─────────────────────────────────
export interface LearningResource {
  type: "NPTEL" | "YouTube" | "Platform" | "Coursera" | "Udemy" | "Book" | string;
  title: string;
  url: string;
  duration?: string;
  credit_eligible?: boolean;
  free?: boolean;
}
export interface RoadmapSkill {
  name: string;
  priority: "high" | "medium" | "low";
  by_when: string;
  category?: string;
  estimated_hours?: number;
  credit_points?: number;
  why_it_matters?: string;
  learning_resources?: LearningResource[];
}
export interface RoadmapCourse {
  name: string;
  platform: string;
  url: string;
  free: boolean;
}
export interface RoadmapYear {
  year_number: number;
  label: string;
  semester_label?: string;
  skills: RoadmapSkill[];
  courses?: RoadmapCourse[];
  targets: string[];
  studentlancing_fit: { type: string; description: string };
}
export interface CareerMapMilestone {
  milestone: string;
  why_it_matters: string;
}
export interface CareerMap {
  primary_path: string;
  alternate_paths: string[];
  next_12_months: CareerMapMilestone[];
  next_24_months: CareerMapMilestone[];
  skill_gaps: string[];
  recommended_certifications: string[];
  education_guidance?: string[];
  recommended_tools?: string[];
  internship_targets?: string[];
  role_progression?: {
    entry_level?: string[];
    mid_level?: string[];
    senior_level?: string[];
  };
  higher_studies?: string[];
  entrepreneurship?: string[];
  employment_guidance?: string;
}
export interface ProjectSuggestion {
  project_title: string;
  relevance: string;
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  estimated_duration: string;
  tools_required: string[];
  learning_outcomes: string[];
  portfolio_value: string;
  can_be_paired_with_studentlancing: boolean;
}
export interface TrackSpecificOutput {
  personal_notes?: string;
  timeline_flexibility?: string;
  institutional_alignment?: string;
  faculty_mentor_suggestion?: string;
  cohort_potential?: boolean;
}
export interface Roadmap {
  years: RoadmapYear[];
  overall_summary: string;
  top_3_immediate_actions: string[];
  career_map?: CareerMap;
  project_suggestions?: ProjectSuggestion[];
  track_specific_output?: TrackSpecificOutput;
}

export type SkillState = "not_started" | "in_progress" | "done";

const FIT_COLORS: Record<string, string> = {
  "Micro Task": "bg-yellow-50 text-yellow-700 border border-yellow-200",
  "Internship": "bg-blue-50 text-blue-700 border border-blue-200",
  "Job": "bg-green-50 text-green-700 border border-green-200",
  "Sure Shot Jobs": "bg-purple-50 text-purple-700 border border-purple-200",
  "AI Match": "bg-pink-50 text-pink-700 border border-pink-200",
};

const PRIORITY_DOT: Record<string, string> = {
  high: "bg-red-400",
  medium: "bg-amber-400",
  low: "bg-green-400",
};

const SKILL_CATEGORY_LABELS: Record<string, string> = {
  technical: "Technical Skills",
  soft: "Soft Skills",
  domain: "Domain Knowledge",
  tools: "Tools & Platforms",
};

const RESOURCE_TYPE_STYLE: Record<string, string> = {
  NPTEL: "bg-orange-50 text-orange-700 border-orange-200",
  YouTube: "bg-red-50 text-red-700 border-red-200",
  Platform: "bg-sky-50 text-sky-700 border-sky-200",
  Coursera: "bg-blue-50 text-blue-700 border-blue-200",
  Udemy: "bg-purple-50 text-purple-700 border-purple-200",
  Book: "bg-amber-50 text-amber-700 border-amber-200",
};

// ─── URL safety guard ─────────────────────────────────────────────────────────
function safeHref(raw: string | undefined | null): string | null {
  if (typeof raw !== "string" || !raw.trim()) return null;
  try {
    const u = new URL(raw.trim());
    return (u.protocol === "http:" || u.protocol === "https:") ? u.toString() : null;
  } catch {
    return null;
  }
}

// ─── Circular Progress Ring ───────────────────────────────────────────────────
function CircleRing({ pct, theme = "personal" }: { pct: number; theme?: "personal" | "institutional" }) {
  const r = 44;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  const gradId = theme === "institutional" ? "compassGradInst" : "compassGrad";
  const stops = theme === "institutional"
    ? { from: "#10b981", to: "#0d9488" }
    : { from: "#0ea5e9", to: "#6366f1" };
  return (
    <svg width="110" height="110" viewBox="0 0 110 110">
      <circle cx="55" cy="55" r={r} fill="none" stroke="#e2e8f0" strokeWidth="8" />
      <circle
        cx="55" cy="55" r={r} fill="none"
        stroke={`url(#${gradId})`} strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        transform="rotate(-90 55 55)"
        style={{ transition: "stroke-dashoffset 0.8s ease" }}
      />
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={stops.from} />
          <stop offset="100%" stopColor={stops.to} />
        </linearGradient>
      </defs>
      <text x="55" y="51" textAnchor="middle" fill="#1e293b" fontSize="20" fontWeight="bold">{pct}%</text>
      <text x="55" y="66" textAnchor="middle" fill="#64748b" fontSize="9">complete</text>
    </svg>
  );
}

// ─── Per-Skill Card with Resources ────────────────────────────────────────────
function SkillCard({
  skill, status, onCycle,
}: {
  skill: RoadmapSkill;
  status: SkillState;
  onCycle: () => void;
}) {
  const [open, setOpen] = useState(false);
  const hasResources = (skill.learning_resources?.length || 0) > 0;
  const credits = skill.credit_points ?? 2;
  const hours = skill.estimated_hours;

  return (
    <div className={`border rounded-xl transition-all ${status === "done" ? "border-green-200 bg-green-50/40" : status === "in_progress" ? "border-amber-200 bg-amber-50/40" : "border-gray-200 bg-white hover:border-gray-300"}`}>
      <div className="p-3 flex items-start gap-3">
        {/* Status checkbox */}
        <button
          onClick={onCycle}
          className={`mt-0.5 w-5 h-5 rounded flex-shrink-0 flex items-center justify-center border transition-all ${status === "done" ? "bg-green-500 border-green-500" : status === "in_progress" ? "bg-amber-100 border-amber-400" : "border-gray-300 hover:border-gray-400 bg-white"}`}
          title={status === "not_started" ? "Mark as Learning" : status === "in_progress" ? "Mark as Done" : "Reset"}
        >
          {status === "done" && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
          {status === "in_progress" && <div className="w-2 h-2 rounded-full bg-amber-500" />}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-sm font-semibold ${status === "done" ? "line-through text-gray-400" : "text-gray-900"}`}>{skill.name}</span>
            <div className={`w-1.5 h-1.5 rounded-full ${PRIORITY_DOT[skill.priority]}`} title={`${skill.priority} priority`} />
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${skill.priority === "high" ? "bg-red-100 text-red-700" : skill.priority === "medium" ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"}`}>
              {skill.priority}
            </span>
          </div>

          <div className="flex items-center gap-2 mt-1 flex-wrap text-[10px] text-gray-500">
            {hours && <span className="flex items-center gap-0.5"><Sparkles className="w-2.5 h-2.5" />{hours} hrs</span>}
            <span className="flex items-center gap-0.5 text-emerald-700 font-semibold"><Trophy className="w-2.5 h-2.5" />{credits} credits</span>
            {skill.by_when && <span>· {redactInstitutionText(skill.by_when)}</span>}
          </div>

          {skill.why_it_matters && (
            <p className="text-[11px] text-gray-600 italic mt-1 leading-snug">💡 {redactInstitutionText(skill.why_it_matters)}</p>
          )}

          {hasResources && (
            <button
              onClick={() => setOpen(o => !o)}
              className="mt-2 text-[11px] font-semibold text-sky-600 hover:text-sky-700 flex items-center gap-1"
            >
              <BookOpen className="w-3 h-3" />
              {open ? "Hide" : "Show"} {skill.learning_resources!.length} learning resource{skill.learning_resources!.length === 1 ? "" : "s"}
              <ChevronRight className={`w-3 h-3 transition-transform ${open ? "rotate-90" : ""}`} />
            </button>
          )}

          {open && hasResources && (
            <div className="mt-2 space-y-1.5">
              {skill.learning_resources!.map((r, i) => {
                const href = safeHref(r.url);
                const Wrap: any = href ? "a" : "div";
                const wrapProps = href
                  ? { href, target: "_blank", rel: "noopener noreferrer" }
                  : { title: "Link unavailable" };
                return (
                <Wrap
                  key={i}
                  {...wrapProps}
                  className={`block p-2 rounded-lg border border-gray-200 transition-all ${href ? "hover:border-sky-300 hover:bg-sky-50/50" : "opacity-60 cursor-not-allowed"}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-gray-800 leading-snug">{redactInstitutionText(r.title)}</div>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${RESOURCE_TYPE_STYLE[r.type] || "bg-gray-50 text-gray-700 border-gray-200"}`}>
                          {redactInstitutionText(r.type)}
                        </span>
                        {r.duration && <span className="text-[10px] text-gray-500">{redactInstitutionText(r.duration)}</span>}
                        {r.free && <span className="text-[9px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-semibold">FREE</span>}
                        {r.credit_eligible && (
                          <span className="text-[9px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-semibold flex items-center gap-0.5">
                            <Award className="w-2.5 h-2.5" /> CREDIT-ELIGIBLE
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 mt-0.5" />
                  </div>
                </Wrap>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Skills Tracker Panel ─────────────────────────────────────────────────────
function SkillsTracker({
  skillsByCategory, skillStatus, profileScore, onCycle, trackType = "personal",
}: {
  skillsByCategory: Record<string, RoadmapSkill[]>;
  skillStatus: Record<string, SkillState>;
  profileScore: number;
  onCycle: (name: string) => void;
  trackType?: "personal" | "institutional";
}) {
  const isInstitutional = trackType === "institutional";
  const CYCLE_LABELS = { not_started: "Not started", in_progress: "In progress", done: "Done" };
  const CYCLE_COLORS = {
    not_started: "border-gray-200 text-gray-500 bg-white hover:border-gray-300",
    in_progress: "border-amber-300 text-amber-700 bg-amber-50",
    done: "border-green-300 text-green-700 bg-green-50",
  };

  return (
    <Card className="bg-white border-gray-200 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <CardTitle className="text-base font-bold text-gray-900 flex items-center gap-2">
            {isInstitutional
              ? <Building2 className="w-4 h-4 text-emerald-600" />
              : <Award className="w-4 h-4 text-sky-500" />}
            {isInstitutional ? "Institutional Skills Tracker" : "Skills Tracker"}
          </CardTitle>
          <div className="flex items-center gap-4">
            <CircleRing pct={profileScore} theme={trackType} />
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          {profileScore < 30
            ? "You're just getting started. Tick your first skill!"
            : profileScore < 70
            ? isInstitutional
              ? `Your profile is ${profileScore}% complete. Keep going to reach your institution's placement-readiness target.`
              : `Your profile is ${profileScore}% complete. Students with 70%+ score get 3× more AI matches.`
            : isInstitutional
            ? `🎉 ${profileScore}% complete! You're placement-ready by your institution's roadmap.`
            : `🎉 ${profileScore}% complete! You're in the top tier for AI matching.`}
        </p>
        <Progress value={profileScore} className="h-1.5 mt-2 bg-gray-100" />
      </CardHeader>
      <CardContent className="space-y-5">
        {Object.entries(SKILL_CATEGORY_LABELS).map(([cat, catLabel]) => {
          const skills = skillsByCategory[cat];
          if (!skills?.length) return null;
          return (
            <div key={cat}>
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{catLabel}</div>
              <div className="grid sm:grid-cols-2 gap-2">
                {skills.map((s) => {
                  const st = skillStatus[s.name] || "not_started";
                  return (
                    <button
                      key={s.name}
                      onClick={() => onCycle(s.name)}
                      className={`flex items-center justify-between gap-3 px-3 py-2 rounded-lg border text-left transition-all ${CYCLE_COLORS[st]}`}
                    >
                      <div>
                        <div className={`text-sm font-medium ${st === "done" ? "line-through text-gray-400" : "text-gray-800"}`}>{s.name}</div>
                        <div className="text-[10px] text-gray-400">{redactInstitutionText(s.by_when)}</div>
                      </div>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border flex-shrink-0 ${CYCLE_COLORS[st]}`}>
                        {CYCLE_LABELS[st]}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

// ─── Reusable Roadmap View (used by both Personal and Institutional tracks) ────
export default function RoadmapView({
  roadmap, skillStatus, onCycleSkill, readOnly = false, onReset, trackType = "personal",
}: {
  roadmap: Roadmap;
  skillStatus: Record<string, SkillState>;
  onCycleSkill: (name: string) => void;
  readOnly?: boolean;
  onReset?: () => void;
  trackType?: "personal" | "institutional";
}) {
  const allSkills = roadmap.years.flatMap((y) => y.skills);
  const doneCount = allSkills.filter((s) => skillStatus[s.name] === "done").length;
  const profileScore = allSkills.length > 0 ? Math.round((doneCount / allSkills.length) * 100) : 0;
  const earnedCredits = allSkills.filter((s) => skillStatus[s.name] === "done").reduce((sum, s) => sum + (s.credit_points || 2), 0);
  const totalCredits = allSkills.reduce((sum, s) => sum + (s.credit_points || 2), 0);

  const skillsByCategory = allSkills.reduce<Record<string, RoadmapSkill[]>>((acc, s) => {
    const cat = s.category || "technical";
    if (!acc[cat]) acc[cat] = [];
    if (!acc[cat].find((x) => x.name === s.name)) acc[cat].push(s);
    return acc;
  }, {});

  const isInstitutional = trackType === "institutional";

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Summary card */}
      <div className={`rounded-2xl border shadow-sm p-4 sm:p-5 ${isInstitutional ? "bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200" : "bg-gradient-to-br from-sky-50 to-indigo-50 border-indigo-200"}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              {isInstitutional
                ? <Building2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                : <Sparkles className="w-4 h-4 text-indigo-500 flex-shrink-0" />}
              <span className={`text-xs font-bold uppercase tracking-widest ${isInstitutional ? "text-emerald-700" : "text-indigo-600"}`}>
                {isInstitutional ? "Your Institution's Plan" : "Your AI Summary"}
              </span>
            </div>
            <p className="text-sm text-gray-800 leading-relaxed">{redactInstitutionText(roadmap.overall_summary)}</p>
            {roadmap.top_3_immediate_actions?.length > 0 && (
              <div className="mt-3 space-y-2">
                <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">3 actions to start today</p>
                {roadmap.top_3_immediate_actions.map((action, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <span className={`w-5 h-5 rounded-full text-white text-[10px] font-black flex items-center justify-center flex-shrink-0 mt-0.5 ${isInstitutional ? "bg-emerald-600" : "bg-sky-600"}`}>
                      {i + 1}
                    </span>
                    <span className="text-sm text-gray-700 leading-snug">{redactInstitutionText(action)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          {!readOnly && onReset && (
            <button
              onClick={onReset}
              title="Clear all entries and start fresh"
              className="flex-shrink-0 text-xs text-gray-400 hover:text-red-500 border border-gray-200 hover:border-red-200 px-2.5 py-1.5 rounded-lg bg-white transition-colors"
            >
              ↺ Reset
            </button>
          )}
        </div>
      </div>

      {/* Credits progress */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
              <Trophy className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <div className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Skill Credits</div>
              <div className="text-2xl font-black text-gray-900 leading-none">
                {earnedCredits}
                <span className="text-sm font-medium text-gray-400"> / {totalCredits}</span>
              </div>
            </div>
          </div>
          <div className="flex-1 min-w-[140px]">
            <Progress value={totalCredits > 0 ? Math.round((earnedCredits / totalCredits) * 100) : 0} className="h-2 bg-gray-100" />
            <p className="text-[10px] text-gray-400 mt-1">
              Mark skills Done · NPTEL courses are COE-verifiable
            </p>
          </div>
        </div>
      </div>

      {/* Semester timeline */}
      <div>
        <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-3 flex items-center gap-2">
          <Target className={`w-4 h-4 ${isInstitutional ? "text-emerald-500" : "text-sky-500"}`} />
          Semester-wise Roadmap
        </h3>
        <div className="relative">
          {/* Vertical line — positioned to match dots */}
          <div className={`absolute left-[18px] sm:left-5 top-3 bottom-3 w-0.5 rounded-full ${isInstitutional ? "bg-gradient-to-b from-emerald-400 via-teal-400 to-emerald-500" : "bg-gradient-to-b from-sky-400 via-indigo-400 to-violet-400"}`} />
          <div className="space-y-4">
            {roadmap.years.map((yr) => (
              <div key={yr.year_number} className="relative pl-11 sm:pl-14">
                {/* Timeline dot */}
                <div className={`absolute left-2.5 sm:left-3 top-2 w-5 h-5 rounded-full border-2 border-white shadow flex items-center justify-center flex-shrink-0 ${isInstitutional ? "bg-gradient-to-br from-emerald-500 to-teal-600" : "bg-gradient-to-br from-sky-500 to-indigo-600"}`}>
                  <span className="text-[9px] font-black text-white leading-none">{yr.year_number}</span>
                </div>

                <div className="bg-white rounded-2xl border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all shadow-sm overflow-hidden">
                  {/* Card header */}
                  <div className="flex items-start justify-between gap-3 p-4 pb-3">
                    <div className="min-w-0">
                      <h4 className="font-bold text-gray-900 text-sm sm:text-base truncate">{redactInstitutionText(yr.label)}</h4>
                      {yr.semester_label && (
                        <div className="text-[11px] font-semibold text-sky-600 mt-0.5">{redactInstitutionText(yr.semester_label)}</div>
                      )}
                      <p className="text-[11px] text-gray-400 italic mt-1 leading-snug">
                        {trackType === "institutional" ? "🎯" : "💼"} {redactInstitutionText(yr.studentlancing_fit.description)}
                      </p>
                    </div>
                    <span className={`flex-shrink-0 text-[11px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap ${FIT_COLORS[yr.studentlancing_fit.type] || "bg-gray-100 text-gray-600 border border-gray-200"}`}>
                      {trackType === "institutional" ? `${redactInstitutionText(yr.studentlancing_fit.type)} ready` : redactInstitutionText(yr.studentlancing_fit.type)}
                    </span>
                  </div>

                  <div className="px-4 pb-4 space-y-3">
                    {/* Skills */}
                    {yr.skills?.length > 0 && (
                      <div>
                        <div className="flex items-center gap-1.5 mb-2">
                          <Zap className="w-3 h-3 text-amber-500" />
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Skills & Resources</span>
                        </div>
                        <div className="space-y-2">
                          {yr.skills.map((skill) => (
                            <SkillCard
                              key={skill.name}
                              skill={skill}
                              status={skillStatus[skill.name] || "not_started"}
                              onCycle={() => onCycleSkill(skill.name)}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Targets */}
                    {yr.targets?.length > 0 && (
                      <div>
                        <div className="flex items-center gap-1.5 mb-2">
                          <Target className="w-3 h-3 text-indigo-500" />
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Year Targets</span>
                        </div>
                        <ul className="space-y-1.5">
                          {yr.targets.map((t, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <ChevronRight className="w-3 h-3 text-sky-400 flex-shrink-0 mt-0.5" />
                              <span className="text-xs text-gray-700 leading-snug">{redactInstitutionText(t)}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Legacy courses fallback */}
                    {(yr.courses?.length ?? 0) > 0 && !yr.skills.some(s => s.learning_resources?.length) && (
                      <div>
                        <div className="flex items-center gap-1.5 mb-2">
                          <BookOpen className="w-3 h-3 text-sky-500" />
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Recommended Courses</span>
                        </div>
                        <ul className="space-y-2">
                          {yr.courses?.map((c) => {
                            const href = safeHref(c.url);
                            return (
                              <li key={c.name}>
                                {href ? (
                                  <a href={href} target="_blank" rel="noopener noreferrer" className="block group">
                                    <span className="text-xs text-sky-600 group-hover:text-sky-700 font-medium leading-snug">{redactInstitutionText(c.name)}</span>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                      <span className="text-[10px] text-gray-400">{redactInstitutionText(c.platform)}</span>
                                      {c.free && <span className="text-[9px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-semibold">FREE</span>}
                                    </div>
                                  </a>
                                ) : (
                                  <div className="opacity-60">
                                    <span className="text-xs text-gray-500 font-medium">{redactInstitutionText(c.name)}</span>
                                    <div className="text-[10px] text-gray-400">{redactInstitutionText(c.platform)} · link unavailable</div>
                                  </div>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Skills Tracker */}
      <SkillsTracker
        skillsByCategory={skillsByCategory}
        skillStatus={skillStatus}
        profileScore={profileScore}
        onCycle={onCycleSkill}
        trackType={trackType}
      />

      {/* ─── Career Map panel ─────────────────────────────────────────────── */}
      {roadmap.career_map && (roadmap.career_map.primary_path || roadmap.career_map.skill_gaps?.length > 0 || (roadmap.career_map.education_guidance?.length ?? 0) > 0 || (roadmap.career_map.recommended_tools?.length ?? 0) > 0 || (roadmap.career_map.internship_targets?.length ?? 0) > 0 || roadmap.career_map.role_progression || (roadmap.career_map.higher_studies?.length ?? 0) > 0 || (roadmap.career_map.entrepreneurship?.length ?? 0) > 0 || roadmap.career_map.employment_guidance) && (
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider flex items-center gap-2">
            <Map className={`w-4 h-4 ${isInstitutional ? "text-emerald-500" : "text-indigo-500"}`} />
            Career Map
          </h3>

          {/* Primary path */}
          {roadmap.career_map.primary_path && (
            <div className={`rounded-2xl border p-4 ${isInstitutional ? "bg-emerald-50 border-emerald-200" : "bg-indigo-50 border-indigo-200"}`}>
              <div className="flex items-start gap-2.5">
                <TrendingUp className={`w-4 h-4 mt-0.5 flex-shrink-0 ${isInstitutional ? "text-emerald-600" : "text-indigo-600"}`} />
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Primary Career Path</div>
                  <p className="text-sm font-semibold text-gray-900 leading-snug">{redactInstitutionText(roadmap.career_map.primary_path)}</p>
                </div>
              </div>
              {roadmap.career_map.alternate_paths?.length > 0 && (
                <div className="mt-3 pt-3 border-t border-white/60">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">Alternate Paths</div>
                  <div className="flex flex-wrap gap-2">
                    {roadmap.career_map.alternate_paths.map((p, i) => (
                      <span key={i} className="text-xs bg-white/70 border border-white px-2.5 py-1 rounded-full text-gray-700 font-medium">{redactInstitutionText(p)}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Next 12 & 24 months milestones */}
          {(roadmap.career_map.next_12_months?.length > 0 || roadmap.career_map.next_24_months?.length > 0) && (
            <div className="grid sm:grid-cols-2 gap-3">
              {roadmap.career_map.next_12_months?.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-200 p-4">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-amber-600 mb-2 flex items-center gap-1.5">
                    <Zap className="w-3 h-3" /> Next 12 Months
                  </div>
                  <ul className="space-y-2">
                    {roadmap.career_map.next_12_months.map((m, i) => (
                      <li key={i} className="space-y-0.5">
                        <div className="flex items-start gap-2">
                          <ChevronRight className="w-3 h-3 text-amber-400 flex-shrink-0 mt-0.5" />
                          <span className="text-xs font-semibold text-gray-800 leading-snug">{redactInstitutionText(m.milestone)}</span>
                        </div>
                        {m.why_it_matters && <p className="text-[11px] text-gray-500 pl-5 italic leading-snug">{redactInstitutionText(m.why_it_matters)}</p>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {roadmap.career_map.next_24_months?.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-200 p-4">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-sky-600 mb-2 flex items-center gap-1.5">
                    <Target className="w-3 h-3" /> Next 24 Months
                  </div>
                  <ul className="space-y-2">
                    {roadmap.career_map.next_24_months.map((m, i) => (
                      <li key={i} className="space-y-0.5">
                        <div className="flex items-start gap-2">
                          <ChevronRight className="w-3 h-3 text-sky-400 flex-shrink-0 mt-0.5" />
                          <span className="text-xs font-semibold text-gray-800 leading-snug">{redactInstitutionText(m.milestone)}</span>
                        </div>
                        {m.why_it_matters && <p className="text-[11px] text-gray-500 pl-5 italic leading-snug">{redactInstitutionText(m.why_it_matters)}</p>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Skill gaps + Certifications */}
          {(roadmap.career_map.skill_gaps?.length > 0 || roadmap.career_map.recommended_certifications?.length > 0) && (
            <div className="grid sm:grid-cols-2 gap-3">
              {roadmap.career_map.skill_gaps?.length > 0 && (
                <div className="bg-white rounded-2xl border border-red-100 p-4">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-red-500 mb-2 flex items-center gap-1.5">
                    <AlertCircle className="w-3 h-3" /> Skill Gaps to Close
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {roadmap.career_map.skill_gaps.map((g, i) => (
                      <span key={i} className="text-xs bg-red-50 border border-red-200 text-red-700 px-2 py-0.5 rounded-full">{redactInstitutionText(g)}</span>
                    ))}
                  </div>
                </div>
              )}
              {roadmap.career_map.recommended_certifications?.length > 0 && (
                <div className="bg-white rounded-2xl border border-emerald-100 p-4">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 mb-2 flex items-center gap-1.5">
                    <BadgeCheck className="w-3 h-3" /> Recommended Certifications
                  </div>
                  <ul className="space-y-1">
                    {roadmap.career_map.recommended_certifications.map((c, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <CheckCircle2 className="w-3 h-3 text-emerald-500 flex-shrink-0 mt-0.5" />
                        <span className="text-xs text-gray-700 leading-snug">{redactInstitutionText(c)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Role-specific education and opportunity guidance (optional for older roadmaps) */}
          {((roadmap.career_map.education_guidance?.length ?? 0) > 0 || (roadmap.career_map.recommended_tools?.length ?? 0) > 0 || (roadmap.career_map.internship_targets?.length ?? 0) > 0) && (
            <div className="grid sm:grid-cols-3 gap-3">
              {(roadmap.career_map.education_guidance?.length ?? 0) > 0 && (
                <div className="bg-white rounded-2xl border border-blue-100 p-4">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-blue-600 mb-2 flex items-center gap-1.5"><BookOpen className="w-3 h-3" /> Education Focus</div>
                  <ul className="space-y-1">{roadmap.career_map.education_guidance?.map((item, i) => <li key={i} className="text-xs text-gray-700 leading-snug">• {redactInstitutionText(item)}</li>)}</ul>
                </div>
              )}
              {(roadmap.career_map.recommended_tools?.length ?? 0) > 0 && (
                <div className="bg-white rounded-2xl border border-violet-100 p-4">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-violet-600 mb-2 flex items-center gap-1.5"><Wrench className="w-3 h-3" /> Tools to Practice</div>
                  <div className="flex flex-wrap gap-1.5">{roadmap.career_map.recommended_tools?.map((item, i) => <span key={i} className="text-xs bg-violet-50 border border-violet-100 text-violet-700 px-2 py-0.5 rounded-full">{redactInstitutionText(item)}</span>)}</div>
                </div>
              )}
              {(roadmap.career_map.internship_targets?.length ?? 0) > 0 && (
                <div className="bg-white rounded-2xl border border-cyan-100 p-4">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-cyan-600 mb-2 flex items-center gap-1.5"><Building2 className="w-3 h-3" /> Internship Targets</div>
                  <ul className="space-y-1">{roadmap.career_map.internship_targets?.map((item, i) => <li key={i} className="text-xs text-gray-700 leading-snug">• {redactInstitutionText(item)}</li>)}</ul>
                </div>
              )}
            </div>
          )}

          {roadmap.career_map.role_progression && (roadmap.career_map.role_progression.entry_level?.length || roadmap.career_map.role_progression.mid_level?.length || roadmap.career_map.role_progression.senior_level?.length) && (
            <div className="bg-white rounded-2xl border border-gray-200 p-4">
              <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 mb-3 flex items-center gap-1.5"><TrendingUp className="w-3 h-3" /> Role Progression</div>
              <div className="grid sm:grid-cols-3 gap-3">
                {([["Entry Level", roadmap.career_map.role_progression.entry_level], ["Mid Level", roadmap.career_map.role_progression.mid_level], ["Senior Level", roadmap.career_map.role_progression.senior_level]] as const).map(([label, roles]) => roles?.length ? (
                  <div key={label}><div className="text-[10px] font-bold text-gray-400 uppercase mb-1">{label}</div><div className="flex flex-wrap gap-1">{roles.map((role, i) => <span key={i} className="text-xs bg-gray-50 border border-gray-100 text-gray-700 px-2 py-0.5 rounded-full">{redactInstitutionText(role)}</span>)}</div></div>
                ) : null)}
              </div>
            </div>
          )}

          {((roadmap.career_map.higher_studies?.length ?? 0) > 0 || (roadmap.career_map.entrepreneurship?.length ?? 0) > 0 || roadmap.career_map.employment_guidance) && (
            <div className="grid sm:grid-cols-3 gap-3">
              {(roadmap.career_map.higher_studies?.length ?? 0) > 0 && <div className="bg-white rounded-2xl border border-amber-100 p-4"><div className="text-[10px] font-bold uppercase tracking-wider text-amber-600 mb-2 flex items-center gap-1.5"><Award className="w-3 h-3" /> Higher Studies</div><ul className="space-y-1">{roadmap.career_map.higher_studies?.map((item, i) => <li key={i} className="text-xs text-gray-700">• {redactInstitutionText(item)}</li>)}</ul></div>}
              {(roadmap.career_map.entrepreneurship?.length ?? 0) > 0 && <div className="bg-white rounded-2xl border border-emerald-100 p-4"><div className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 mb-2 flex items-center gap-1.5"><Lightbulb className="w-3 h-3" /> Entrepreneurship</div><ul className="space-y-1">{roadmap.career_map.entrepreneurship?.map((item, i) => <li key={i} className="text-xs text-gray-700">• {redactInstitutionText(item)}</li>)}</ul></div>}
              {roadmap.career_map.employment_guidance && <div className="bg-white rounded-2xl border border-slate-200 p-4"><div className="text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-2 flex items-center gap-1.5"><Users className="w-3 h-3" /> Employment Guidance</div><p className="text-xs text-gray-700 leading-snug">{redactInstitutionText(roadmap.career_map.employment_guidance)}</p></div>}
            </div>
          )}
        </div>
      )}

      {/* ─── Project Suggestions panel ────────────────────────────────────── */}
      {roadmap.project_suggestions && roadmap.project_suggestions.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-amber-500" />
            Project Suggestions
          </h3>
          <div className="space-y-3">
            {roadmap.project_suggestions.map((proj, idx) => {
              const diffColor = proj.difficulty === "Advanced"
                ? "bg-red-100 text-red-700 border-red-200"
                : proj.difficulty === "Intermediate"
                ? "bg-amber-100 text-amber-700 border-amber-200"
                : "bg-green-100 text-green-700 border-green-200";
              return (
                <div key={idx} className="bg-white rounded-2xl border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all overflow-hidden">
                  <div className="p-4 space-y-3">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${diffColor}`}>{proj.difficulty}</span>
                          {proj.estimated_duration && (
                            <span className="text-[10px] text-gray-400">{redactInstitutionText(proj.estimated_duration)}</span>
                          )}
                          {proj.can_be_paired_with_studentlancing && (
                            <span className="text-[10px] font-bold bg-sky-50 border border-sky-200 text-sky-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <ExternalLink className="w-2.5 h-2.5" /> Earnable on StudentLancing
                            </span>
                          )}
                        </div>
                        <h4 className="text-sm font-bold text-gray-900 leading-snug">{redactInstitutionText(proj.project_title)}</h4>
                      </div>
                    </div>

                    {/* Relevance */}
                    {proj.relevance && (
                      <p className="text-xs text-gray-600 leading-relaxed italic">{redactInstitutionText(proj.relevance)}</p>
                    )}

                    {/* Tools */}
                    {proj.tools_required?.length > 0 && (
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5 flex items-center gap-1">
                          <Wrench className="w-3 h-3" /> Tools Required
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {proj.tools_required.map((t, i) => (
                            <span key={i} className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-medium">{redactInstitutionText(t)}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Learning outcomes */}
                    {proj.learning_outcomes?.length > 0 && (
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">Skills You'll Gain</div>
                        <ul className="space-y-1">
                          {proj.learning_outcomes.map((o, i) => (
                            <li key={i} className="flex items-start gap-1.5">
                              <Sparkles className="w-3 h-3 text-indigo-400 flex-shrink-0 mt-0.5" />
                              <span className="text-xs text-gray-700 leading-snug">{redactInstitutionText(o)}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Portfolio value */}
                    {proj.portfolio_value && (
                      <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-3 py-2">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-500 mb-0.5 flex items-center gap-1">
                          <Award className="w-3 h-3" /> Portfolio Value
                        </div>
                        <p className="text-xs text-gray-700 leading-snug">{redactInstitutionText(proj.portfolio_value)}</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── Track-specific output panel ─────────────────────────────────── */}
      {roadmap.track_specific_output && (
        (() => {
          const tso = roadmap.track_specific_output;
          const hasPersonal = !isInstitutional && (tso.personal_notes || tso.timeline_flexibility);
          const hasInstitutional = isInstitutional && (tso.institutional_alignment || tso.faculty_mentor_suggestion);
          if (!hasPersonal && !hasInstitutional) return null;
          return (
            <div className={`rounded-2xl border p-4 space-y-3 ${isInstitutional ? "bg-teal-50 border-teal-200" : "bg-violet-50 border-violet-200"}`}>
              <div className="flex items-center gap-2">
                {isInstitutional
                  ? <Users className="w-4 h-4 text-teal-600" />
                  : <Sparkles className="w-4 h-4 text-violet-500" />}
                <span className={`text-[10px] font-bold uppercase tracking-wider ${isInstitutional ? "text-teal-700" : "text-violet-700"}`}>
                  {isInstitutional ? "Institutional Guidance" : "Personal Guidance"}
                </span>
              </div>
              {hasPersonal && (
                <>
                  {tso.personal_notes && <p className="text-sm text-gray-800 leading-relaxed">{redactInstitutionText(tso.personal_notes)}</p>}
                  {tso.timeline_flexibility && (
                    <div className="bg-white/70 rounded-xl px-3 py-2">
                      <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Suggested Pacing</div>
                      <p className="text-xs text-gray-700 leading-snug">{redactInstitutionText(tso.timeline_flexibility)}</p>
                    </div>
                  )}
                </>
              )}
              {hasInstitutional && (
                <>
                  {tso.institutional_alignment && <p className="text-sm text-gray-800 leading-relaxed">{redactInstitutionText(tso.institutional_alignment)}</p>}
                  {tso.faculty_mentor_suggestion && (
                    <div className="bg-white/70 rounded-xl px-3 py-2">
                      <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Recommended Faculty Mentor</div>
                      <p className="text-xs text-gray-700 leading-snug">{redactInstitutionText(tso.faculty_mentor_suggestion)}</p>
                    </div>
                  )}
                  {typeof tso.cohort_potential === "boolean" && (
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${tso.cohort_potential ? "bg-emerald-100 text-emerald-700 border border-emerald-200" : "bg-gray-100 text-gray-500 border border-gray-200"}`}>
                        {tso.cohort_potential ? "✓ Works as group/batch assignment" : "Individual assignment recommended"}
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })()
      )}
    </div>
  );
}
