import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Loader2, Clock, AlertTriangle, CheckCircle2, XCircle, ChevronLeft, ChevronRight, Trophy, ShieldAlert, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { auth } from "@/lib/firebase";

interface MCQ { id: string; q: string; opts: string[]; }
interface Submission { id: string; prompt: string; placeholder?: string; }
interface AttemptResponse {
  attempt_id: string;
  level: 1 | 2 | 3;
  skill: string;
  time_limit_sec: number;
  pass_pct: number;
  credits_on_pass: number;
  questions: MCQ[];
  submissions?: Submission[];
}
interface ResultResponse {
  passed: boolean;
  score_pct: number;
  correct_count: number;
  total_count: number;
  credits_awarded: number;
  cooldown_until?: string;
  integrity_flagged?: boolean;
  breakdown: { q_id: string; correct: number; chosen: number | null; explanation: string; }[];
  next_level_unlocked?: boolean;
}

async function apiFetch(url: string, init: RequestInit = {}) {
  const token = await auth.currentUser?.getIdToken();
  return fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init.headers || {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
}

export default function TestRunner({
  skill, level, onClose, onResult,
}: {
  skill: string;
  level: 1 | 2 | 3;
  onClose: () => void;
  onResult: (r: ResultResponse) => void;
}) {
  const { toast } = useToast();
  const [phase, setPhase] = useState<"loading" | "intro" | "running" | "submitting" | "result">("loading");
  const [attempt, setAttempt] = useState<AttemptResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ResultResponse | null>(null);

  // Question state
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submissions, setSubmissions] = useState<Record<string, string>>({});

  // Anti-cheat / timing
  const [timeLeft, setTimeLeft] = useState(0);
  const startedAtRef = useRef<number>(0);
  const tabSwitchesRef = useRef(0);
  const questionFirstSeenRef = useRef<Record<string, number>>({});
  const minViewSecRef = useRef(3); // each question must be visible ≥3s before answer counted

  // ── Load attempt ──────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await apiFetch("/api/placement/start-attempt", {
          method: "POST",
          body: JSON.stringify({ skill, level }),
        });
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || "Could not start attempt");
        if (cancelled) return;
        setAttempt(data);
        setTimeLeft(data.time_limit_sec);
        setPhase("intro");
      } catch (e: any) {
        if (cancelled) return;
        setError(e.message);
        setPhase("intro");
      }
    })();
    return () => { cancelled = true; };
  }, [skill, level]);

  // ── Tab visibility detection (anti-cheat) ─────────────────────────────────
  useEffect(() => {
    function onVisibility() {
      if (document.visibilityState === "hidden" && phase === "running") {
        tabSwitchesRef.current += 1;
      }
    }
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [phase]);

  // ── Track first time each question becomes visible ────────────────────────
  useEffect(() => {
    if (phase !== "running" || !attempt) return;
    const q = attempt.questions[currentIdx];
    if (q && !questionFirstSeenRef.current[q.id]) {
      questionFirstSeenRef.current[q.id] = Date.now();
    }
  }, [currentIdx, phase, attempt]);

  // ── Countdown timer ───────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== "running") return;
    const id = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(id);
          submitAttempt(true);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // ── Warn on close mid-test ────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== "running") return;
    function handler(e: BeforeUnloadEvent) {
      e.preventDefault();
      e.returnValue = "";
    }
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [phase]);

  function startTest() {
    if (!attempt) return;
    startedAtRef.current = Date.now();
    setPhase("running");
  }

  function selectAnswer(qid: string, optIdx: number) {
    const seenAt = questionFirstSeenRef.current[qid];
    const elapsedSec = seenAt ? (Date.now() - seenAt) / 1000 : 0;
    if (elapsedSec < minViewSecRef.current) {
      toast({ title: "Read the question first", description: `Please spend at least ${minViewSecRef.current}s reading before answering.`, variant: "destructive" });
      return;
    }
    setAnswers(prev => ({ ...prev, [qid]: optIdx }));
  }

  const submitAttempt = useCallback(async (timedOut = false) => {
    if (!attempt) return;
    setPhase("submitting");
    const totalTimeMs = Date.now() - startedAtRef.current;
    try {
      const r = await apiFetch("/api/placement/submit-attempt", {
        method: "POST",
        body: JSON.stringify({
          attempt_id: attempt.attempt_id,
          answers,
          submissions,
          integrity_signals: {
            tab_switches: tabSwitchesRef.current,
            total_time_ms: totalTimeMs,
            timed_out: timedOut,
          },
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Submission failed");
      setResult(data);
      setPhase("result");
      onResult(data);
    } catch (e: any) {
      toast({ title: "Submission failed", description: e.message, variant: "destructive" });
      setPhase("running");
    }
  }, [attempt, answers, submissions, onResult, toast]);

  function fmtTime(s: number) {
    const m = Math.floor(s / 60); const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  }

  // ── RENDER ────────────────────────────────────────────────────────────────
  const overlayBase = "fixed inset-0 z-50 bg-black/70 flex items-start sm:items-center justify-center p-2 sm:p-4 overflow-y-auto";
  const panelBase = "bg-white rounded-xl shadow-2xl w-full max-w-3xl my-2 sm:my-8";

  if (phase === "loading") {
    return (
      <div className={overlayBase}>
        <div className={panelBase}>
          <Card className="border-0 shadow-none"><CardContent className="p-12 flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
            <p className="text-sm text-gray-600">Preparing your assessment…</p>
          </CardContent></Card>
        </div>
      </div>
    );
  }

  if (phase === "intro" && error) {
    return (
      <div className={overlayBase}>
        <div className={panelBase}>
          <Card className="border-0 shadow-none"><CardContent className="p-8 space-y-4">
            <div className="flex items-start gap-3">
              <ShieldAlert className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-bold text-gray-900 text-lg">Assessment unavailable</h3>
                <p className="text-sm text-gray-600 mt-1">{error}</p>
              </div>
            </div>
            <Button variant="outline" onClick={onClose} className="w-full">Close</Button>
          </CardContent></Card>
        </div>
      </div>
    );
  }

  if (phase === "intro" && attempt) {
    return (
      <div className={overlayBase}>
        <div className={panelBase}>
          <Card className="border-0 shadow-none"><CardContent className="p-6 sm:p-8 space-y-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <Badge className="bg-indigo-100 text-indigo-800 border-indigo-200 mb-2">Level {level} Assessment</Badge>
                <h2 className="text-2xl font-bold text-gray-900">{attempt.skill}</h2>
              </div>
              <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100"><X className="w-5 h-5 text-gray-400" /></button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-xs text-gray-500">Questions</div>
                <div className="font-bold text-gray-900">{attempt.questions.length}{attempt.submissions?.length ? ` + ${attempt.submissions.length} sub` : ""}</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-xs text-gray-500">Time limit</div>
                <div className="font-bold text-gray-900">{Math.round(attempt.time_limit_sec / 60)} min</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-xs text-gray-500">Pass mark</div>
                <div className="font-bold text-gray-900">{attempt.pass_pct}%</div>
              </div>
              <div className="bg-emerald-50 rounded-lg p-3">
                <div className="text-xs text-emerald-700">Credits on pass</div>
                <div className="font-bold text-emerald-900">{attempt.credits_on_pass}</div>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-xs text-amber-900 space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold"><AlertTriangle className="w-4 h-4" /> Integrity rules</div>
              <ul className="list-disc list-inside space-y-1 leading-relaxed">
                <li>Switching tabs/windows is logged and may flag your attempt for COE review.</li>
                <li>You must spend at least 3 seconds reading each question before answering.</li>
                <li>Do not refresh or close this window — you will lose your attempt.</li>
                <li>Maximum 2 attempts per level per semester.</li>
                {level === 3 && <li>Level 3 includes a written submission that COE will review manually.</li>}
              </ul>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
              <Button onClick={startTest} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white">
                Start Assessment <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </CardContent></Card>
        </div>
      </div>
    );
  }

  if (phase === "running" && attempt) {
    const totalQs = attempt.questions.length + (attempt.submissions?.length || 0);
    const answered = Object.keys(answers).length + Object.values(submissions).filter(s => s.trim().length > 10).length;
    const isSub = currentIdx >= attempt.questions.length;
    const sub = isSub ? attempt.submissions![currentIdx - attempt.questions.length] : null;
    const q = !isSub ? attempt.questions[currentIdx] : null;
    const timePct = attempt.time_limit_sec > 0 ? (timeLeft / attempt.time_limit_sec) * 100 : 0;
    const lowTime = timeLeft < 120;

    return (
      <div className={overlayBase}>
        <div className={panelBase}>
          <Card className="border-0 shadow-none">
            <CardContent className="p-0">
              {/* Sticky header */}
              <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between gap-3 rounded-t-xl">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <Badge className="bg-indigo-100 text-indigo-800 border-indigo-200 flex-shrink-0">L{level}</Badge>
                  <div className="text-sm font-semibold text-gray-900 truncate">{attempt.skill}</div>
                </div>
                <div className={`flex items-center gap-1.5 font-mono font-bold text-sm px-2.5 py-1 rounded ${lowTime ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-700"}`}>
                  <Clock className="w-3.5 h-3.5" /> {fmtTime(timeLeft)}
                </div>
              </div>

              <div className="p-4 sm:p-6 space-y-4">
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>Question {currentIdx + 1} of {totalQs}</span>
                  <span>{answered} / {totalQs} answered</span>
                </div>
                <Progress value={(answered / totalQs) * 100} className="h-1" />

                {q && (
                  <div className="space-y-3">
                    <h3 className="text-base font-semibold text-gray-900 leading-relaxed">{q.q}</h3>
                    <div className="space-y-2">
                      {q.opts.map((opt, i) => {
                        const selected = answers[q.id] === i;
                        return (
                          <button
                            key={i}
                            onClick={() => selectAnswer(q.id, i)}
                            className={`w-full text-left p-3 rounded-lg border transition-all ${selected ? "bg-indigo-50 border-indigo-400 ring-1 ring-indigo-300" : "bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50"}`}
                          >
                            <span className={`inline-block w-6 h-6 rounded-full text-xs font-bold mr-2 text-center leading-6 ${selected ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600"}`}>
                              {String.fromCharCode(65 + i)}
                            </span>
                            <span className="text-sm text-gray-800">{opt}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {sub && (
                  <div className="space-y-3">
                    <Badge className="bg-purple-100 text-purple-800 border-purple-200">Written submission</Badge>
                    <h3 className="text-base font-semibold text-gray-900 leading-relaxed">{sub.prompt}</h3>
                    <textarea
                      value={submissions[sub.id] || ""}
                      onChange={e => setSubmissions(prev => ({ ...prev, [sub.id]: e.target.value }))}
                      placeholder={sub.placeholder || "Your answer…"}
                      rows={6}
                      maxLength={3000}
                      className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none resize-y"
                    />
                    <div className="text-[11px] text-gray-500 text-right">{(submissions[sub.id] || "").length} / 3000 chars</div>
                  </div>
                )}

                {/* Nav */}
                <div className="flex items-center justify-between gap-2 pt-2">
                  <Button variant="outline" disabled={currentIdx === 0} onClick={() => setCurrentIdx(i => i - 1)}>
                    <ChevronLeft className="w-4 h-4 mr-1" /> Prev
                  </Button>
                  <div className="flex gap-2">
                    {currentIdx < totalQs - 1 && (
                      <Button variant="outline" onClick={() => setCurrentIdx(i => i + 1)}>
                        Next <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    )}
                    {currentIdx === totalQs - 1 && (
                      <Button onClick={() => submitAttempt(false)} className="bg-green-600 hover:bg-green-700 text-white">
                        Submit Attempt
                      </Button>
                    )}
                  </div>
                </div>

                {/* Question grid */}
                <div className="pt-3 border-t border-gray-100">
                  <div className="text-[11px] text-gray-500 uppercase tracking-wider font-semibold mb-2">Jump to question</div>
                  <div className="grid grid-cols-10 gap-1.5">
                    {Array.from({ length: totalQs }).map((_, i) => {
                      const qq = i < attempt.questions.length ? attempt.questions[i] : null;
                      const ss = i >= attempt.questions.length ? attempt.submissions![i - attempt.questions.length] : null;
                      const done = qq ? answers[qq.id] != null : (ss ? (submissions[ss.id]?.length || 0) > 10 : false);
                      const cur = i === currentIdx;
                      return (
                        <button
                          key={i}
                          onClick={() => setCurrentIdx(i)}
                          className={`text-xs font-bold py-1 rounded ${cur ? "bg-indigo-600 text-white" : done ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}
                        >
                          {i + 1}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (phase === "submitting") {
    return (
      <div className={overlayBase}>
        <div className={panelBase}>
          <Card className="border-0 shadow-none"><CardContent className="p-12 flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
            <p className="text-sm text-gray-600">Grading your attempt…</p>
          </CardContent></Card>
        </div>
      </div>
    );
  }

  if (phase === "result" && result) {
    return (
      <div className={overlayBase}>
        <div className={panelBase}>
          <Card className="border-0 shadow-none"><CardContent className="p-6 sm:p-8 space-y-5">
            <div className="text-center space-y-3">
              {result.passed ? (
                <>
                  <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                    <Trophy className="w-9 h-9 text-green-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900">You passed Level {level}!</h2>
                  <p className="text-sm text-gray-600">Credits earned: <strong className="text-emerald-700">+{result.credits_awarded}</strong></p>
                </>
              ) : (
                <>
                  <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                    <XCircle className="w-9 h-9 text-red-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900">Not passed this time</h2>
                  <p className="text-sm text-gray-600">
                    You scored {result.score_pct}%. Need {attempt!.pass_pct}% to pass.
                    {result.cooldown_until && <> Try again after <strong>{new Date(result.cooldown_until).toLocaleString()}</strong>.</>}
                  </p>
                </>
              )}

              <div className="grid grid-cols-3 gap-2 max-w-sm mx-auto pt-2">
                <div className="bg-gray-50 rounded-lg p-2">
                  <div className="text-xs text-gray-500">Score</div>
                  <div className="font-bold text-gray-900">{result.score_pct}%</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-2">
                  <div className="text-xs text-gray-500">Correct</div>
                  <div className="font-bold text-gray-900">{result.correct_count}/{result.total_count}</div>
                </div>
                <div className={`rounded-lg p-2 ${result.passed ? "bg-emerald-50" : "bg-gray-50"}`}>
                  <div className={`text-xs ${result.passed ? "text-emerald-700" : "text-gray-500"}`}>Credits</div>
                  <div className="font-bold text-gray-900">+{result.credits_awarded}</div>
                </div>
              </div>

              {result.integrity_flagged && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800 text-left flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span><strong>Flagged for COE review.</strong> The system detected unusual activity (e.g. tab switching). Your attempt is recorded but credits will be confirmed only after COE approval.</span>
                </div>
              )}
            </div>

            {/* Per-question breakdown */}
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-gray-900">Question breakdown</h3>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {result.breakdown.map((b, i) => {
                  const isCorrect = b.chosen === b.correct;
                  const q = attempt!.questions.find(x => x.id === b.q_id);
                  if (!q) return null;
                  return (
                    <div key={b.q_id} className={`text-xs p-2.5 rounded-lg border ${isCorrect ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
                      <div className="flex items-start gap-2">
                        {isCorrect ? <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" /> : <XCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />}
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-gray-900">Q{i + 1}: {q.q}</div>
                          {b.chosen != null && <div className="text-gray-600 mt-0.5">Your answer: <span className={isCorrect ? "text-green-700" : "text-red-700"}>{q.opts[b.chosen]}</span></div>}
                          {!isCorrect && <div className="text-gray-600">Correct answer: <span className="text-green-700">{q.opts[b.correct]}</span></div>}
                          <div className="text-gray-500 italic mt-1">{b.explanation}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <Button onClick={onClose} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white">
              Back to placement track
            </Button>
          </CardContent></Card>
        </div>
      </div>
    );
  }

  return null;
}
