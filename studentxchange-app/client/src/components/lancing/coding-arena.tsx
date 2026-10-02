// ─── Coding Arena ─────────────────────────────────────────────────────────────
// Placement-prep coding practice inside Placement Readiness. Problems unlock
// from the student's Career Compass roadmap (personal or institutional),
// submissions are judged server-side, and the AI Coach feeds weak-area tags
// back into the Placement Readiness score.

import { useState, useEffect, useRef, useCallback } from "react";
import Editor from "@monaco-editor/react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { auth } from "@/lib/firebase";
import {
  Code2, Play, Send, Loader2, CheckCircle2, XCircle,
  ChevronLeft, Flame, Target, Sparkles, AlertTriangle, Trophy, Filter,
  FileText, Terminal, Crown,
} from "lucide-react";

// ─── Auth-bearing fetch ───────────────────────────────────────────────────────
async function apiFetch(url: string, init: RequestInit = {}) {
  const token = await auth.currentUser?.getIdToken();
  return fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
}

// ─── Mobile detection hook ────────────────────────────────────────────────────
function useIsMobile() {
  const [mobile, setMobile] = useState(() => window.innerWidth < 1024);
  useEffect(() => {
    const handler = () => setMobile(window.innerWidth < 1024);
    window.addEventListener("resize", handler, { passive: true });
    return () => window.removeEventListener("resize", handler);
  }, []);
  return mobile;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const DIFF_STYLES: Record<string, string> = {
  Easy:   "bg-green-50 text-green-700 border-green-200",
  Medium: "bg-amber-50 text-amber-700 border-amber-200",
  Hard:   "bg-red-50 text-red-700 border-red-200",
};

// Monaco editor language identifiers (must match Monaco's registered names)
const MONACO_LANG: Record<string, string> = {
  python: "python", javascript: "javascript", java: "java",
  c: "c", cpp: "cpp", csharp: "csharp", go: "go", kotlin: "kotlin", rust: "rust", sql: "sql",
};

const LANG_LABEL: Record<string, string> = {
  python: "Python", javascript: "JavaScript", java: "Java",
  c: "C", cpp: "C++", csharp: "C#", go: "Go", kotlin: "Kotlin", rust: "Rust", sql: "SQL",
};

// Fallback starter snippets — used when a problem has no starterCode for the language.
const LANG_STARTER: Record<string, string> = {
  python:     "def solution():\n    pass\n",
  javascript: "function solution() {\n    \n}\n",
  java:       "public class Solution {\n    public static void main(String[] args) {\n        \n    }\n}\n",
  c:          "#include <stdio.h>\n\nint main() {\n    \n    return 0;\n}\n",
  cpp:        "#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    \n    return 0;\n}\n",
  csharp:     "using System;\n\nclass Solution {\n    static void Main(string[] args) {\n        \n    }\n}\n",
  go:         "package main\n\nimport \"fmt\"\n\nfunc main() {\n    _ = fmt.Println\n}\n",
  kotlin:     "fun main() {\n    \n}\n",
  rust:       "use std::io::{self, BufRead};\n\nfn main() {\n    let stdin = io::stdin();\n    for line in stdin.lock().lines() {\n        let _line = line.unwrap();\n    }\n}\n",
  sql:        "-- Write your SQL query here\nSELECT * FROM ...\n",
};

const STATUS_LABEL: Record<string, string> = {
  accepted:      "Accepted",
  wrong_answer:  "Wrong Answer",
  tle:           "Time Limit Exceeded",
  compile_error: "Compile Error",
  runtime_error: "Runtime Error",
};

// ─── Types ────────────────────────────────────────────────────────────────────
type ProblemRow = {
  id: string; title: string; difficulty: string; tags: string[];
  roadmapSkillTags: string[]; languages: string[];
  solved: boolean; attempted: boolean;
};

type SubmitResult = {
  submissionId?: string; status: string; passed: number; total: number;
  results: any[]; coachQueued?: boolean; codingReadinessScore?: number;
};

// ═══ Weak-area widget (rendered on the Placement Readiness main view) ═══════
export function WeakAreaWidget({ onPractice }: { onPractice: () => void }) {
  const [data, setData] = useState<{
    weakAreas: string[]; codingReadinessScore: number; solvedCount: number;
  } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await apiFetch("/api/coding-arena/progress");
        if (r.ok) setData(await r.json());
      } catch {}
    })();
  }, []);

  if (!data) return null;
  const weak = (data.weakAreas || []).slice(-3).reverse();

  return (
    <Card className="bg-gradient-to-br from-slate-50 to-indigo-50 border-indigo-200 shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Code2 className="w-4 h-4 text-indigo-600" />
            <span className="text-sm font-bold text-gray-900">Coding Arena</span>
            <Badge className="text-[10px] bg-indigo-100 text-indigo-700 border-indigo-200">
              {data.codingReadinessScore}% coding readiness
            </Badge>
          </div>
        </div>
        <p className="text-[11px] text-gray-600 mb-2">
          {data.solvedCount > 0
            ? `${data.solvedCount} problem${data.solvedCount === 1 ? "" : "s"} solved. Feeds 10% of your Placement Readiness score.`
            : "Solve roadmap-aligned coding problems — they feed 10% of your Placement Readiness score."}
        </p>
        {weak.length > 0 && (
          <div className="mb-2.5">
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Weak areas detected by AI Coach</p>
            <div className="flex flex-wrap gap-1.5">
              {weak.map((t) => (
                <Badge key={t} className="text-[10px] bg-red-50 text-red-700 border-red-200">
                  <AlertTriangle className="w-2.5 h-2.5 mr-1" />{t}
                </Badge>
              ))}
            </div>
          </div>
        )}
        <Button size="sm" onClick={onPractice} className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white">
          <Play className="w-3 h-3 mr-1.5" /> Practice Now
        </Button>
      </CardContent>
    </Card>
  );
}

// ═══ Main Coding Arena panel (problem list) ══════════════════════════════════
export default function CodingArena({ user, onUpgrade }: { user: any; onUpgrade?: () => void }) {
  const { toast } = useToast();
  const [loading, setLoading]       = useState(true);
  const [problems, setProblems]     = useState<ProblemRow[]>([]);
  const [unlockedTags, setUnlockedTags] = useState<string[]>([]);
  const [focusTag, setFocusTag]     = useState<string>("");
  const [diffFilter, setDiffFilter] = useState<string>("All");
  const [tagFilter, setTagFilter]   = useState<string>("All");
  const [activeProblemId, setActiveProblemId] = useState<string | null>(null);

  const loadProblems = useCallback(async () => {
    setLoading(true);
    try {
      const r = await apiFetch("/api/coding-arena/problems");
      if (r.ok) {
        const d = await r.json();
        setProblems(d.problems || []);
        setUnlockedTags(d.unlockedSkillTags || []);
        setFocusTag(d.currentFocusTag || "");
      }
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { loadProblems(); }, [loadProblems]);

  if (activeProblemId) {
    return (
      <ProblemDetail
        problemId={activeProblemId}
        isPremium={true}
        onBack={() => { setActiveProblemId(null); loadProblems(); }}
        onUpgrade={onUpgrade}
        onOpenProblem={(id) => setActiveProblemId(id)}
      />
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-gray-400">
        <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading Coding Arena…
      </div>
    );
  }

  const allTags    = Array.from(new Set(problems.flatMap((p) => p.tags))).sort();
  const thisWeek   = problems.filter((p) => p.roadmapSkillTags.includes(focusTag));
  const filtered   = problems.filter(
    (p) =>
      (diffFilter === "All" || p.difficulty === diffFilter) &&
      (tagFilter  === "All" || p.tags.includes(tagFilter)),
  );
  const solvedCount = problems.filter((p) => p.solved).length;

  return (
    <div className="space-y-4">
      {/* Header card */}
      <Card className="bg-gradient-to-br from-slate-800 via-indigo-900 to-slate-800 text-white border-0 shadow-lg">
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Code2 className="w-5 h-5 text-indigo-300 flex-shrink-0" />
                <span className="text-lg font-bold">Coding Arena</span>
              </div>
              <p className="text-xs text-white/70 mt-1">
                Placement-prep problems matched to your career roadmap.
              </p>
            </div>
            <div className="text-right flex-shrink-0">
              <div className="text-2xl font-bold">
                {solvedCount}<span className="text-sm text-white/60">/{problems.length}</span>
              </div>
              <div className="text-[10px] text-white/60 uppercase tracking-wide">solved</div>
            </div>
          </div>

          {unlockedTags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {unlockedTags.map((t) => (
                <Badge
                  key={t}
                  className={`text-[10px] border ${t === focusTag ? "bg-indigo-500 text-white border-indigo-400" : "bg-white/10 text-white/80 border-white/15"}`}
                >
                  {t === focusTag && <Target className="w-2.5 h-2.5 mr-1" />}{t}
                </Badge>
              ))}
            </div>
          )}

        </CardContent>
      </Card>

      {/* This Week — roadmap focus */}
      {thisWeek.length > 0 && focusTag && (
        <Card className="bg-indigo-50 border-indigo-200">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2 mb-2.5 flex-wrap">
              <Target className="w-4 h-4 text-indigo-600 flex-shrink-0" />
              <span className="text-sm font-bold text-indigo-900">This Week: {focusTag}</span>
              <Badge className="text-[10px] bg-indigo-100 text-indigo-700 border-indigo-200">
                {thisWeek.length} problems
              </Badge>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {thisWeek.slice(0, 4).map((p) => (
                <ProblemCard
                  key={p.id} p={p} compact
                  onOpen={() => setActiveProblemId(p.id)}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
        {["All", "Easy", "Medium", "Hard"].map((d) => (
          <button
            key={d}
            onClick={() => setDiffFilter(d)}
            className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border transition-colors ${
              diffFilter === d
                ? "bg-indigo-600 text-white border-indigo-600"
                : "bg-white text-gray-600 border-gray-200 hover:border-indigo-300"
            }`}
          >
            {d}
          </button>
        ))}
        <select
          value={tagFilter}
          onChange={(e) => setTagFilter(e.target.value)}
          className="text-[11px] font-medium border border-gray-200 rounded-full px-2.5 py-1 bg-white text-gray-600 max-w-[140px]"
        >
          <option value="All">All topics</option>
          {allTags.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {/* Problem list */}
      <div className="grid gap-2">
        {filtered.map((p) => (
          <ProblemCard
            key={p.id} p={p}
            onOpen={() => setActiveProblemId(p.id)}
          />
        ))}
        {filtered.length === 0 && (
          <p className="text-xs text-gray-400 text-center py-8">No problems match these filters.</p>
        )}
      </div>
    </div>
  );
}

// ─── Problem card ─────────────────────────────────────────────────────────────
function ProblemCard({ p, onOpen, compact }: { p: ProblemRow; onOpen: () => void; compact?: boolean }) {
  return (
    <button
      onClick={onOpen}
      className={`text-left w-full bg-white border rounded-xl transition-all active:scale-[0.99] hover:shadow-md hover:border-indigo-300 ${
        compact ? "p-2.5" : "p-3.5"
      } ${p.solved ? "border-green-200" : "border-gray-200"}`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {p.solved ? <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                    : <Code2       className="w-4 h-4 text-gray-300 flex-shrink-0" />}
          <span className={`font-semibold truncate ${compact ? "text-xs" : "text-sm"} text-gray-900`}>
            {p.title}
          </span>
        </div>
        <Badge className={`text-[10px] flex-shrink-0 ${DIFF_STYLES[p.difficulty] || ""}`}>
          {p.difficulty}
        </Badge>
      </div>
      {!compact && (
        <div className="flex flex-wrap gap-1 mt-1.5 ml-6">
          {p.tags.slice(0, 3).map((t) => (
            <span key={t} className="text-[10px] text-gray-400">#{t}</span>
          ))}
        </div>
      )}
    </button>
  );
}

// ─── Results panel — handles all error types richly ──────────────────────────
function ResultsPanel({
  result, isSubmitResult, language,
}: {
  result: SubmitResult; isSubmitResult: boolean; language: string;
}) {
  const accepted     = result.status === "accepted";
  const isCompileErr = result.status === "compile_error";
  const isRuntimeErr = result.status === "runtime_error";
  const label        = STATUS_LABEL[result.status] || result.status;

  const compileErr = isCompileErr ? (result.results[0]?.error || "") : "";
  const runtimeErr = isRuntimeErr ? (result.results.find((r: any) => !r.passed)?.error || "") : "";

  return (
    <Card className={`border ${
      accepted    ? "bg-green-50 border-green-200"
      : isCompileErr ? "bg-orange-50 border-orange-200"
      :               "bg-red-50 border-red-200"
    }`}>
      <CardContent className="p-3 sm:p-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            {accepted
              ? <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
              : isCompileErr
                ? <AlertTriangle className="w-5 h-5 text-orange-500 flex-shrink-0" />
                : <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />}
            <span className={`text-sm font-bold ${
              accepted ? "text-green-800" : isCompileErr ? "text-orange-800" : "text-red-800"
            }`}>
              {label}
            </span>
            {!isCompileErr && (
              <Badge className="text-[10px] bg-white/70 text-gray-700 border-gray-200">
                {result.passed}/{result.total} {isSubmitResult ? "tests" : "public tests"} passed
              </Badge>
            )}
          </div>
          {isSubmitResult && typeof result.codingReadinessScore === "number" && (
            <Badge className="text-[10px] bg-indigo-50 text-indigo-700 border-indigo-200">
              <Trophy className="w-2.5 h-2.5 mr-1" /> Readiness: {result.codingReadinessScore}%
            </Badge>
          )}
        </div>

        {/* Compile error output */}
        {isCompileErr && compileErr && (
          <div className="mb-2">
            <p className="text-[10px] font-semibold text-orange-700 uppercase tracking-wide mb-1">
              {LANG_LABEL[language] || language} compile output
            </p>
            <pre className="bg-orange-900/10 text-orange-900 rounded-lg p-2.5 text-[10px] font-mono whitespace-pre-wrap overflow-x-auto max-h-48 touch-pan-y">
              {compileErr}
            </pre>
          </div>
        )}

        {/* Runtime error output */}
        {isRuntimeErr && runtimeErr && (
          <div className="mb-2">
            <p className="text-[10px] font-semibold text-red-700 uppercase tracking-wide mb-1">Error output</p>
            <pre className="bg-red-900/10 text-red-900 rounded-lg p-2.5 text-[10px] font-mono whitespace-pre-wrap overflow-x-auto max-h-48 touch-pan-y">
              {runtimeErr}
            </pre>
          </div>
        )}

        {/* Per-test-case rows */}
        {!isCompileErr && (
          <div className="space-y-1.5">
            {result.results.map((tr: any, i: number) => (
              <div key={i} className="bg-white/70 rounded-lg p-2 text-[11px]">
                <div className="flex items-center gap-1.5 font-semibold flex-wrap">
                  {tr.passed
                    ? <CheckCircle2 className="w-3 h-3 text-green-500 flex-shrink-0" />
                    : <XCircle      className="w-3 h-3 text-red-500 flex-shrink-0" />}
                  <span>{tr.isHidden ? `Hidden test ${i + 1}` : `Test ${i + 1}`}</span>
                  {tr.timeMs > 0 && (
                    <span className="text-gray-400 font-normal">{tr.timeMs} ms</span>
                  )}
                  {tr.memoryKb > 0 && (
                    <span className="text-gray-400 font-normal">
                      · {(tr.memoryKb / 1024).toFixed(1)} MB
                    </span>
                  )}
                </div>
                {!tr.isHidden && !tr.passed && (
                  <div className="mt-1.5 font-mono text-[10px] text-gray-600 space-y-0.5 overflow-x-auto">
                    {tr.input !== undefined && (
                      <div>
                        <span className="text-gray-400">Input: </span>
                        <span className="whitespace-pre-wrap break-all">{tr.input}</span>
                      </div>
                    )}
                    {tr.expectedOutput !== undefined && (
                      <div>
                        <span className="text-gray-400">Expected: </span>
                        <span className="whitespace-pre-wrap break-all">{tr.expectedOutput}</span>
                      </div>
                    )}
                    {tr.actualOutput !== undefined && (
                      <div>
                        <span className="text-gray-400">Got: </span>
                        <span className={`whitespace-pre-wrap break-all ${tr.actualOutput ? "text-red-600" : "text-gray-400"}`}>
                          {tr.actualOutput || "(no output)"}
                        </span>
                      </div>
                    )}
                    {tr.error && !isRuntimeErr && (
                      <pre className="mt-1 bg-red-50 text-red-700 rounded p-1.5 whitespace-pre-wrap overflow-x-auto max-h-32 text-[10px]">
                        {tr.error}
                      </pre>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Code editor: Monaco on desktop, textarea on mobile ───────────────────────
function EditorLoadingFallback({ timedOut, onRetry }: { timedOut: boolean; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-[380px] bg-[#1e1e1e] rounded-xl border border-gray-700 gap-3">
      {timedOut ? (
        <>
          <AlertTriangle className="w-6 h-6 text-amber-400" />
          <p className="text-sm text-gray-400">Editor failed to load.</p>
          <button
            onClick={onRetry}
            className="text-xs text-indigo-400 hover:text-indigo-300 underline"
          >
            Retry
          </button>
        </>
      ) : (
        <>
          <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
          <p className="text-xs text-gray-500">Loading editor…</p>
        </>
      )}
    </div>
  );
}

function CodeEditor({
  value, onChange, language, isMobile,
}: {
  value: string; onChange: (v: string) => void; language: string; isMobile: boolean;
}) {
  const [timedOut, setTimedOut] = useState(false);
  const [editorKey, setEditorKey] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Start a 12-second timeout when the editor mounts. If Monaco hasn't fired
  // onMount by then (CDN blocked / worker failed), show an actionable fallback
  // instead of spinning forever.
  useEffect(() => {
    if (isMobile) return;
    setTimedOut(false);
    timerRef.current = setTimeout(() => setTimedOut(true), 12000);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [editorKey, isMobile]);

  function handleEditorMount() {
    // Editor loaded successfully — cancel the timeout.
    if (timerRef.current) clearTimeout(timerRef.current);
    setTimedOut(false);
  }

  function handleRetry() {
    setTimedOut(false);
    setEditorKey(k => k + 1); // remount Monaco
  }

  if (isMobile) {
    return (
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        spellCheck={false}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="none"
        className="w-full h-[260px] bg-[#1e1e1e] text-[#d4d4d4] font-mono text-[12px] p-3 rounded-xl border border-gray-700 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 leading-relaxed"
        placeholder={`// Write your ${LANG_LABEL[language] || language} code here…`}
      />
    );
  }

  if (timedOut) {
    return <EditorLoadingFallback timedOut={true} onRetry={handleRetry} />;
  }

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <Editor
        key={editorKey}
        height="380px"
        language={MONACO_LANG[language] || "plaintext"}
        value={value}
        onChange={(v) => onChange(v || "")}
        theme="vs-dark"
        loading={<EditorLoadingFallback timedOut={false} onRetry={handleRetry} />}
        onMount={handleEditorMount}
        options={{
          fontSize: 13,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabSize: 4,
          wordWrap: "on",
          lineNumbersMinChars: 3,
          padding: { top: 8, bottom: 8 },
        }}
      />
    </div>
  );
}

// ═══ Problem detail: tabbed on mobile, side-by-side on desktop ═══════════════
function ProblemDetail({
  problemId, isPremium, onBack, onUpgrade, onOpenProblem,
}: {
  problemId: string; isPremium: boolean; onBack: () => void;
  onUpgrade?: () => void; onOpenProblem: (id: string) => void;
}) {
  const { toast } = useToast();
  const isMobile  = useIsMobile();

  const [problem, setProblem]         = useState<any>(null);
  const [loading, setLoading]         = useState(true);
  const [language, setLanguage]       = useState("python");
  const [code, setCode]               = useState("");
  const [running, setRunning]         = useState(false);
  const [submitting, setSubmitting]   = useState(false);
  const [result, setResult]           = useState<SubmitResult | null>(null);
  const [isSubmitResult, setIsSubmitResult] = useState(false);
  const [coach, setCoach]             = useState<any>(null);
  const [coachLoading, setCoachLoading] = useState(false);
  // Mobile tab: "statement" | "code"
  const [mobileTab, setMobileTab]     = useState<"statement" | "code">("statement");

  const pollRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const codeByLang = useRef<Record<string, string>>({});

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const r = await apiFetch(`/api/coding-arena/problems/${problemId}`);
        if (r.ok) {
          const d = await r.json();
          setProblem(d);
          const firstLang = (d.languages || [])[0] || "python";
          setLanguage(firstLang);
          setCode(d.starterCode?.[firstLang] ?? LANG_STARTER[firstLang] ?? "");
        } else if (r.status === 403) {
          toast({
            title: "Premium required",
            description: "Medium and Hard problems need Career Compass Premium.",
            variant: "destructive",
          });
          onBack();
        }
      } catch {}
      setLoading(false);
    })();
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [problemId]);

  function switchLanguage(next: string) {
    codeByLang.current[language] = code;
    setLanguage(next);
    setCode(codeByLang.current[next] ?? problem?.starterCode?.[next] ?? LANG_STARTER[next] ?? "");
    setResult(null);
    setCoach(null);
  }

  async function doRun() {
    if (running || submitting) return;
    setRunning(true);
    setResult(null);
    setIsSubmitResult(false);
    // Switch to code tab so user can see results on mobile
    if (isMobile) setMobileTab("code");
    try {
      const r = await apiFetch("/api/coding-arena/run", {
        method: "POST",
        body: JSON.stringify({ problemId, language, code }),
      });
      const d = await r.json();
      if (r.ok) setResult(d);
      else toast({ title: "Run failed", description: d.message || d.error || "Try again.", variant: "destructive" });
    } catch {
      toast({ title: "Run failed", description: "Network error.", variant: "destructive" });
    }
    setRunning(false);
  }

  async function doSubmit() {
    if (running || submitting) return;
    setSubmitting(true);
    setResult(null);
    setCoach(null);
    setIsSubmitResult(true);
    if (isMobile) setMobileTab("code");
    try {
      const r = await apiFetch("/api/coding-arena/submit", {
        method: "POST",
        body: JSON.stringify({ problemId, language, code }),
      });
      const d = await r.json();
      if (r.ok) {
        setResult(d);
        if (d.status === "accepted") {
          toast({ title: "Accepted! 🎉", description: `All ${d.total} test cases passed.` });
        }
        if (d.coachQueued && d.submissionId) pollCoach(d.submissionId);
      } else if (d.error === "daily_limit") {
        toast({ title: "Daily limit reached", description: d.message, variant: "destructive" });
        if (onUpgrade) onUpgrade();
      } else {
        toast({ title: "Submission failed", description: d.message || d.error || "Try again.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Submission failed", description: "Network error.", variant: "destructive" });
    }
    setSubmitting(false);
  }

  function pollCoach(submissionId: string) {
    setCoachLoading(true);
    let tries = 0;
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      tries++;
      if (tries > 15) {
        if (pollRef.current) clearInterval(pollRef.current);
        setCoachLoading(false);
        return;
      }
      try {
        const r = await apiFetch(`/api/coding-arena/feedback/${submissionId}`);
        if (r.ok) {
          const d = await r.json();
          if (d.ready) {
            setCoach(d);
            setCoachLoading(false);
            if (pollRef.current) clearInterval(pollRef.current);
          }
        }
      } catch {}
    }, 3000);
  }

  if (loading || !problem) {
    return (
      <div className="flex items-center justify-center py-16 text-gray-400">
        <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading problem…
      </div>
    );
  }

  // ── Shared: toolbar (language picker + Run + Submit) ─────────────────────
  const Toolbar = (
    <div className="flex items-center gap-2 flex-wrap">
      <select
        value={language}
        onChange={(e) => switchLanguage(e.target.value)}
        className="text-xs font-semibold border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white flex-shrink-0 max-w-[130px] sm:max-w-none"
      >
        {(problem.languages || []).map((l: string) => (
          <option key={l} value={l}>{LANG_LABEL[l] || l}</option>
        ))}
      </select>
      <div className="flex items-center gap-2 ml-auto">
        <Button
          size="sm" variant="outline"
          onClick={doRun}
          disabled={running || submitting}
          className="h-8 text-xs px-3"
        >
          {running
            ? <Loader2 className="w-3 h-3 animate-spin mr-1" />
            : <Play    className="w-3 h-3 mr-1" />}
          Run
        </Button>
        <Button
          size="sm"
          onClick={doSubmit}
          disabled={running || submitting}
          className="h-8 text-xs px-3 bg-green-600 hover:bg-green-700 text-white"
        >
          {submitting
            ? <Loader2 className="w-3 h-3 animate-spin mr-1" />
            : <Send    className="w-3 h-3 mr-1" />}
          Submit
        </Button>
      </div>
    </div>
  );

  // ── Status / judging indicator ───────────────────────────────────────────
  const JudgingBanner = (running || submitting) ? (
    <Card className="bg-gray-50 border-gray-200">
      <CardContent className="p-3 flex items-center gap-2 text-xs text-gray-500">
        <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
        {submitting ? "Judging all test cases including hidden ones…" : "Running public test cases…"}
      </CardContent>
    </Card>
  ) : null;

  // ── Statement panel ──────────────────────────────────────────────────────
  const StatementPanel = (
    <Card className="bg-white border-gray-200">
      <CardContent className="p-3 sm:p-4 overflow-y-auto" style={{ maxHeight: isMobile ? "60vh" : "520px" }}>
        <h3 className="text-base font-bold text-gray-900 mb-2">{problem.title}</h3>
        <div className="text-xs text-gray-700 whitespace-pre-wrap leading-relaxed">
          {problem.statement.replace(/\*\*/g, "")}
        </div>
        <div className="mt-3 text-[11px] text-gray-500">
          <span className="font-semibold">Constraints:</span> {problem.constraints}
        </div>
        {(problem.examples || []).map((ex: any, i: number) => (
          <div key={i} className="mt-3 bg-gray-50 rounded-lg p-2.5 text-[11px] font-mono overflow-x-auto">
            <div className="text-gray-500 font-sans font-semibold mb-1">Example {i + 1}</div>
            <div>
              <span className="text-gray-400">Input: </span>
              <pre className="inline whitespace-pre-wrap break-all">{ex.input}</pre>
            </div>
            <div>
              <span className="text-gray-400">Output: </span>
              <pre className="inline whitespace-pre-wrap break-all">{ex.output}</pre>
            </div>
            {ex.explanation && (
              <div className="text-gray-500 font-sans mt-1">{ex.explanation}</div>
            )}
          </div>
        ))}
        {problem.hint && (
          <details className="mt-3">
            <summary className="text-[11px] font-semibold text-indigo-600 cursor-pointer select-none">
              💡 Show hint
            </summary>
            <p className="text-[11px] text-gray-600 mt-1">{problem.hint}</p>
          </details>
        )}
      </CardContent>
    </Card>
  );

  // ── Editor + results pane ────────────────────────────────────────────────
  const EditorPane = (
    <div className="space-y-2">
      {Toolbar}
      <CodeEditor value={code} onChange={setCode} language={language} isMobile={isMobile} />
      {JudgingBanner}
      {result && <ResultsPanel result={result} isSubmitResult={isSubmitResult} language={language} />}
      <AiCoachPanel
        coach={coach}
        coachLoading={coachLoading}
        isPremium={isPremium}
        onUpgrade={onUpgrade}
        onOpenProblem={onOpenProblem}
      />
      {result?.status === "accepted" && (
        <div className="flex items-center gap-1.5 text-[11px] text-gray-500 justify-center pb-2">
          <Flame className="w-3.5 h-3.5 text-orange-500" />
          Keep the streak going — solving daily compounds your readiness score.
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-3">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-indigo-600 active:text-indigo-700"
        >
          <ChevronLeft className="w-4 h-4" /> All problems
        </button>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge className={`text-[10px] ${DIFF_STYLES[problem.difficulty] || ""}`}>
            {problem.difficulty}
          </Badge>
          {problem.tags.slice(0, 3).map((t: string) => (
            <span key={t} className="text-[10px] text-gray-400 hidden sm:inline">#{t}</span>
          ))}
        </div>
      </div>

      {/* Mobile: tab switcher */}
      {isMobile && (
        <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
          <button
            onClick={() => setMobileTab("statement")}
            className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold py-2 rounded-lg transition-all ${
              mobileTab === "statement"
                ? "bg-white text-indigo-700 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <FileText className="w-3.5 h-3.5" /> Problem
          </button>
          <button
            onClick={() => setMobileTab("code")}
            className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold py-2 rounded-lg transition-all ${
              mobileTab === "code"
                ? "bg-white text-indigo-700 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <Terminal className="w-3.5 h-3.5" /> Code
            {(running || submitting) && (
              <Loader2 className="w-2.5 h-2.5 animate-spin ml-0.5" />
            )}
            {result && !running && !submitting && (
              result.status === "accepted"
                ? <CheckCircle2 className="w-2.5 h-2.5 text-green-500 ml-0.5" />
                : <XCircle      className="w-2.5 h-2.5 text-red-500 ml-0.5" />
            )}
          </button>
        </div>
      )}

      {/* Content */}
      {isMobile ? (
        <>
          {mobileTab === "statement" && StatementPanel}
          {mobileTab === "code" && EditorPane}
        </>
      ) : (
        <div className="grid lg:grid-cols-2 gap-3">
          {StatementPanel}
          {EditorPane}
        </div>
      )}
    </div>
  );
}

// ─── AI Coach panel ───────────────────────────────────────────────────────────
function AiCoachPanel({
  coach, coachLoading, isPremium, onUpgrade, onOpenProblem,
}: {
  coach: any; coachLoading: boolean;
  isPremium: boolean; onUpgrade?: () => void; onOpenProblem: (id: string) => void;
}) {
  if (coachLoading) {
    return (
      <Card className="bg-purple-50 border-purple-200">
        <CardContent className="p-3 flex items-center gap-2 text-xs text-purple-700">
          <Sparkles className="w-4 h-4 animate-pulse flex-shrink-0" />
          AI Coach is analyzing your solution…
        </CardContent>
      </Card>
    );
  }
  if (!coach) return null;

  return (
    <Card className="bg-purple-50 border-purple-200">
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <Sparkles className="w-4 h-4 text-purple-600 flex-shrink-0" />
          <span className="text-sm font-bold text-purple-900">AI Coach Feedback</span>
          {coach.tier === "free" && (
            <Badge className="text-[10px] bg-white text-purple-600 border-purple-200">Basic</Badge>
          )}
        </div>
        <div className="grid sm:grid-cols-2 gap-2 mb-2">
          <div className="bg-white/70 rounded-lg p-2.5">
            <div className="text-[10px] text-gray-500 uppercase font-semibold">Your complexity</div>
            <div className="text-xs font-mono font-bold text-gray-800 mt-0.5">
              {coach.timeComplexity} time · {coach.spaceComplexity} space
            </div>
          </div>
          {coach.betterApproach && (
            <div className="bg-white/70 rounded-lg p-2.5">
              <div className="text-[10px] text-gray-500 uppercase font-semibold">Better approach</div>
              <div className="text-xs text-gray-800 mt-0.5">
                <span className="font-mono font-bold">{coach.betterApproach.complexity}</span>
                {" — "}{coach.betterApproach.hint}
              </div>
            </div>
          )}
        </div>
        {coach.explanation && (
          <p className="text-xs text-purple-900 mb-2">{coach.explanation}</p>
        )}
        {coach.weakAreaTag && (
          <div className="flex items-center gap-1.5 text-[11px] text-red-700 mb-2 flex-wrap">
            <AlertTriangle className="w-3 h-3 flex-shrink-0" />
            Weak area detected: <span className="font-bold">{coach.weakAreaTag}</span>
            <span className="text-gray-400">— added to your Placement Readiness focus.</span>
          </div>
        )}
        {Array.isArray(coach.recommended) && coach.recommended.length > 0 && (
          <div className="mt-2">
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Recommended next
            </p>
            <div className="flex flex-wrap gap-1.5">
              {coach.recommended.map((rp: any) => (
                <button
                  key={rp.id}
                  onClick={() => onOpenProblem(rp.id)}
                  className="text-[11px] font-semibold bg-white border border-purple-200 text-purple-700 rounded-full px-2.5 py-1 hover:bg-purple-100 active:bg-purple-200"
                >
                  {rp.title} · {rp.difficulty}
                </button>
              ))}
            </div>
          </div>
        )}
        {!isPremium && (
          <div className="mt-2.5 flex items-center justify-between gap-2 bg-white/70 rounded-lg px-2.5 py-2 flex-wrap">
            <span className="text-[11px] text-gray-600">
              Premium unlocks weak-area analysis + 5 recommended problems.
            </span>
            {onUpgrade && (
              <Button
                size="sm" onClick={onUpgrade}
                className="h-7 text-[11px] bg-amber-500 hover:bg-amber-600 text-white flex-shrink-0"
              >
                <Crown className="w-3 h-3 mr-1" /> Upgrade
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
