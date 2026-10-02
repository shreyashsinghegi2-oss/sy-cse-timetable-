import { useEffect, useRef, useState } from "react";
import { useParams, useLocation } from "wouter";
import { useLancingAuth } from "@/hooks/use-lancing-auth";
import { auth } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, AlertTriangle, Clock, CheckCircle2, ShieldAlert, ChevronLeft, ChevronRight, Maximize } from "lucide-react";
import SEOHead from "@/components/seo/seo-head";
import { useToast } from "@/hooks/use-toast";

interface Q { id: string; topic: string; question: string; options: string[]; }

export default function LancingDriveTest() {
  const { driveId } = useParams<{ driveId: string }>();
  const { isAuthenticated, isLoading: authLoading } = useLancingAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [phase, setPhase] = useState<"intro" | "running" | "done">("intro");
  const [questions, setQuestions] = useState<Q[]>([]);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [idx, setIdx] = useState(0);
  const [duration, setDuration] = useState(30);
  const [remaining, setRemaining] = useState(0);
  const [driveTitle, setDriveTitle] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const flagsRef = useRef<string[]>([]);
  const startedAtRef = useRef<number>(0);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) { setLocation("/lancing/login"); return; }
  }, [authLoading, isAuthenticated]);

  const startTest = async () => {
    if (!driveId) { toast({ title: "Invalid drive", variant: "destructive" }); return; }
    setLoading(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch(`/api/placement-cell/drives/${driveId}/start-test`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setQuestions(data.questions);
      setDuration(data.duration);
      setRemaining(data.duration * 60);
      setDriveTitle(data.driveTitle);
      setCompanyName(data.companyName);
      startedAtRef.current = Date.now();
      setPhase("running");
      flagsRef.current = [];
      try { document.documentElement.requestFullscreen?.(); } catch {}
    } catch (e: any) {
      toast({ title: "Cannot start test", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // Anti-cheat listeners
  useEffect(() => {
    if (phase !== "running") return;
    const onBlur = () => flagsRef.current.push(`tab_blur@${Math.round((Date.now() - startedAtRef.current) / 1000)}s`);
    const onVis = () => { if (document.hidden) flagsRef.current.push(`tab_hidden@${Math.round((Date.now() - startedAtRef.current) / 1000)}s`); };
    const onPaste = (e: ClipboardEvent) => { e.preventDefault(); flagsRef.current.push("paste_blocked"); };
    const onCopy = (e: ClipboardEvent) => { e.preventDefault(); flagsRef.current.push("copy_blocked"); };
    const onCtxMenu = (e: MouseEvent) => e.preventDefault();
    const onFullscreenChange = () => { if (!document.fullscreenElement) flagsRef.current.push("exit_fullscreen"); };
    window.addEventListener("blur", onBlur);
    document.addEventListener("visibilitychange", onVis);
    document.addEventListener("paste", onPaste);
    document.addEventListener("copy", onCopy);
    document.addEventListener("contextmenu", onCtxMenu);
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => {
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("visibilitychange", onVis);
      document.removeEventListener("paste", onPaste);
      document.removeEventListener("copy", onCopy);
      document.removeEventListener("contextmenu", onCtxMenu);
      document.removeEventListener("fullscreenchange", onFullscreenChange);
    };
  }, [phase]);

  // Timer
  useEffect(() => {
    if (phase !== "running") return;
    timerRef.current = setInterval(() => {
      setRemaining(r => {
        if (r <= 1) { clearInterval(timerRef.current); void submit(true); return 0; }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const submit = async (auto = false) => {
    if (phase !== "running") return;
    setPhase("done");
    setLoading(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch(`/api/placement-cell/drives/${driveId}/submit-test`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          answers,
          integrityFlags: flagsRef.current,
          durationSec: Math.round((Date.now() - startedAtRef.current) / 1000),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult(data);
      try { if (document.fullscreenElement) await document.exitFullscreen(); } catch {}
      if (auto) toast({ title: "Time up — auto submitted" });
    } catch (e: any) {
      toast({ title: "Submission failed", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const fmtTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  if (authLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin" /></div>;

  if (phase === "intro") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50 flex items-center justify-center p-6">
        <SEOHead title="Drive Assessment" description="Drive screening test" />
        <Card className="max-w-2xl w-full border-2 border-purple-100 rounded-3xl shadow-2xl">
          <CardContent className="p-10">
            <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
              <ShieldAlert className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-center mb-2">Drive Screening Test</h1>
            <p className="text-center text-gray-600 mb-6">Please read the instructions carefully before starting.</p>
            <ul className="space-y-3 text-sm text-gray-700 mb-8">
              <li className="flex gap-2"><AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />The test will run in fullscreen. Switching tabs, opening dev tools, copying, or pasting is flagged.</li>
              <li className="flex gap-2"><Clock className="w-4 h-4 text-purple-500 flex-shrink-0 mt-0.5" />Once you start, the timer cannot be paused. Auto-submits when time runs out.</li>
              <li className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />You can answer questions in any order. Unanswered questions are scored as wrong.</li>
              <li className="flex gap-2"><ShieldAlert className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />Integrity flags are reported to the placement cell along with your score.</li>
            </ul>
            <Button onClick={startTest} disabled={loading} className="w-full h-12 bg-gradient-to-r from-purple-600 to-indigo-500 text-white rounded-xl" data-testid="button-start-test">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Maximize className="w-4 h-4 mr-2" /> Start Test (Fullscreen)</>}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (phase === "done" && result) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-indigo-50 flex items-center justify-center p-6">
        <Card className="max-w-lg w-full border-2 border-emerald-100 rounded-3xl shadow-2xl">
          <CardContent className="p-10 text-center">
            <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Test Submitted</h1>
            <div className="text-5xl font-bold text-indigo-600 my-4">{result.pct}%</div>
            <p className="text-gray-600 mb-6">{result.score} / {result.total} correct</p>
            {flagsRef.current.length > 0 && (
              <p className="text-xs text-amber-600 mb-4 flex items-center justify-center gap-1"><AlertTriangle className="w-3 h-3" /> {flagsRef.current.length} integrity flag(s) recorded</p>
            )}
            <Button onClick={() => setLocation("/lancing/my-applications")} className="w-full bg-indigo-600 text-white rounded-xl h-12">View My Applications</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (phase === "done" && !result) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>;
  }

  // Running phase
  const q = questions[idx];
  if (!q) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin" /></div>;

  const answeredCount = Object.keys(answers).length;

  return (
    <div className="min-h-screen bg-white select-none" style={{ userSelect: "none" }}>
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-6 py-3 flex items-center justify-between sticky top-0 z-50">
        <div>
          <p className="text-xs opacity-80">{companyName} · {driveTitle}</p>
          <p className="text-sm font-bold">Question {idx + 1} of {questions.length}</p>
        </div>
        <div className="flex items-center gap-4">
          <Badge className="bg-white/20 text-white border-0">{answeredCount} answered</Badge>
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${remaining < 60 ? "bg-red-500" : "bg-white/20"}`}>
            <Clock className="w-4 h-4" /> <span className="font-mono font-bold">{fmtTime(remaining)}</span>
          </div>
        </div>
      </div>

      {/* Question */}
      <div className="max-w-3xl mx-auto p-6">
        <div className="mb-4">
          <Badge variant="outline" className="text-xs">{q.topic}</Badge>
        </div>
        <h2 className="text-xl font-bold mb-6 leading-relaxed">{q.question}</h2>
        <div className="space-y-3">
          {q.options.map((opt, i) => (
            <button
              key={i}
              onClick={() => setAnswers({ ...answers, [q.id]: i })}
              className={`w-full text-left p-4 rounded-2xl border-2 transition-all ${answers[q.id] === i ? "border-indigo-600 bg-indigo-50" : "border-gray-200 hover:border-indigo-300"}`}
              data-testid={`option-${i}`}
            >
              <span className="font-bold text-indigo-600 mr-2">{String.fromCharCode(65 + i)}.</span> {opt}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between mt-8 pt-6 border-t">
          <Button variant="outline" disabled={idx === 0} onClick={() => setIdx(idx - 1)}>
            <ChevronLeft className="w-4 h-4 mr-1" /> Previous
          </Button>
          <div className="flex flex-wrap gap-1.5 max-w-md justify-center">
            {questions.map((_, i) => (
              <button
                key={i}
                onClick={() => setIdx(i)}
                className={`w-8 h-8 rounded-lg text-xs font-bold ${
                  i === idx ? "bg-indigo-600 text-white" :
                  answers[questions[i].id] != null ? "bg-emerald-100 text-emerald-700 border-2 border-emerald-300" :
                  "bg-gray-100 text-gray-600"
                }`}
              >{i + 1}</button>
            ))}
          </div>
          {idx < questions.length - 1 ? (
            <Button onClick={() => setIdx(idx + 1)}>Next <ChevronRight className="w-4 h-4 ml-1" /></Button>
          ) : (
            <Button onClick={() => submit(false)} disabled={loading} className="bg-emerald-600 text-white">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Submit Test"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
