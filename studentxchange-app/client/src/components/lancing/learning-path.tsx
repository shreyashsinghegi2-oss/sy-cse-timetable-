import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Loader2, BookOpen, CheckCircle2, Circle, Trophy, Calendar, Target,
  Sparkles, Lock, Play, X, ArrowRight,
} from "lucide-react";
import { auth } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";

interface WeekPlan {
  week: number;
  title: string;
  hours: number;
  daily_tasks: string[];
  resources: { title: string; type: string; url?: string }[];
  checkpoint: string;
  milestone?: string;
}

interface LearningPath {
  skill: string;
  total_weeks: number;
  weeks: WeekPlan[];
  outcomes: string[];
}

interface Props {
  skill: string;
  onClose: () => void;
  onTakeAssessment?: () => void;
}

export default function LearningPathView({ skill, onClose, onTakeAssessment }: Props) {
  const { toast } = useToast();
  const [path, setPath] = useState<LearningPath | null>(null);
  const [loading, setLoading] = useState(true);
  const [completedWeeks, setCompletedWeeks] = useState<Set<number>>(new Set());

  useEffect(() => {
    const stored = localStorage.getItem(`learning_path_progress:${skill}`);
    if (stored) {
      try { setCompletedWeeks(new Set(JSON.parse(stored))); } catch {}
    }
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skill]);

  async function load() {
    setLoading(true);
    try {
      const u = auth.currentUser;
      if (!u) { toast({ title: "Sign in required", variant: "destructive" }); onClose(); return; }
      const token = await u.getIdToken();
      const r = await fetch("/api/placement/learning-path", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ skill }),
      });
      if (!r.ok) throw new Error("Could not generate learning path");
      const data = await r.json();
      setPath(data.path);
    } catch (e: any) {
      toast({ title: "Failed", description: e?.message, variant: "destructive" });
      onClose();
    } finally {
      setLoading(false);
    }
  }

  function toggleWeek(w: number) {
    setCompletedWeeks(prev => {
      const next = new Set(prev);
      if (next.has(w)) next.delete(w); else next.add(w);
      localStorage.setItem(`learning_path_progress:${skill}`, JSON.stringify(Array.from(next)));
      return next;
    });
  }

  const allDone = path && completedWeeks.size >= path.total_weeks;
  const pct = path ? Math.round((completedWeeks.size / path.total_weeks) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <Card className="w-full max-w-2xl bg-white border-gray-200 shadow-2xl my-8">
        <CardContent className="p-0">
          <div className="sticky top-0 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-5 py-4 flex items-center justify-between rounded-t-lg z-10">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              <div>
                <p className="font-bold">Week-by-Week Path</p>
                <p className="text-xs text-indigo-100">{skill}</p>
              </div>
            </div>
            <button onClick={onClose} className="text-white/80 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-5">
            {loading ? (
              <div className="text-center py-12">
                <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mx-auto mb-3" />
                <p className="text-sm text-gray-600">Generating personalized {skill} learning path…</p>
                <p className="text-xs text-gray-400 mt-1">This takes 10-20 seconds.</p>
              </div>
            ) : path ? (
              <>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-indigo-500" />
                    <span className="font-semibold">{path.total_weeks} weeks</span>
                    <span className="text-gray-400">·</span>
                    <span className="text-gray-600">{completedWeeks.size}/{path.total_weeks} done</span>
                  </div>
                  <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200">{pct}% complete</Badge>
                </div>
                <Progress value={pct} className="h-1.5 mb-5" />

                {path.outcomes?.length > 0 && (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 mb-4">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <Target className="w-4 h-4 text-emerald-600" />
                      <span className="text-xs font-bold text-emerald-900 uppercase tracking-wider">Outcomes</span>
                    </div>
                    <ul className="text-xs text-emerald-800 space-y-1 list-disc pl-4">
                      {path.outcomes.map((o, i) => <li key={i}>{o}</li>)}
                    </ul>
                  </div>
                )}

                <div className="space-y-2.5">
                  {path.weeks.map((w, idx) => {
                    const prevDone = idx === 0 || completedWeeks.has(path.weeks[idx - 1].week);
                    const locked = !prevDone && !completedWeeks.has(w.week);
                    const done = completedWeeks.has(w.week);
                    return (
                      <Card key={w.week} className={`border ${done ? "bg-green-50 border-green-200" : locked ? "bg-gray-50 border-gray-200 opacity-60" : "bg-white border-indigo-200"}`}>
                        <CardContent className="p-3">
                          <div className="flex items-start gap-3">
                            <button
                              onClick={() => !locked && toggleWeek(w.week)}
                              disabled={locked}
                              className={`mt-0.5 ${locked ? "cursor-not-allowed" : ""}`}
                              title={locked ? "Complete previous week first" : done ? "Mark as not done" : "Mark as done"}
                            >
                              {locked ? <Lock className="w-5 h-5 text-gray-400" /> :
                                done ? <CheckCircle2 className="w-5 h-5 text-green-600" /> :
                                <Circle className="w-5 h-5 text-indigo-400" />}
                            </button>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <span className="text-xs font-bold text-indigo-600">Week {w.week}</span>
                                <span className="text-sm font-bold text-gray-900">{w.title}</span>
                                <Badge variant="outline" className="text-[10px]">{w.hours}h</Badge>
                              </div>
                              {w.daily_tasks?.length > 0 && (
                                <div className="text-xs text-gray-600 mt-1.5">
                                  <span className="font-semibold text-gray-700">Daily tasks:</span>
                                  <ul className="list-disc pl-4 mt-0.5 space-y-0.5">
                                    {w.daily_tasks.slice(0, 5).map((t, i) => <li key={i}>{t}</li>)}
                                  </ul>
                                </div>
                              )}
                              {w.resources?.length > 0 && (
                                <div className="text-xs text-gray-600 mt-2">
                                  <span className="font-semibold text-gray-700">Resources:</span>
                                  <div className="mt-1 space-y-1">
                                    {w.resources.slice(0, 3).map((r, i) => (
                                      r.url ? (
                                        <a key={i} href={r.url} target="_blank" rel="noopener noreferrer" className="block text-indigo-600 hover:underline text-xs">
                                          → [{r.type}] {r.title}
                                        </a>
                                      ) : (
                                        <div key={i} className="text-gray-500 text-xs">→ [{r.type}] {r.title}</div>
                                      )
                                    ))}
                                  </div>
                                </div>
                              )}
                              <div className="mt-2 text-xs bg-amber-50 border border-amber-200 rounded px-2 py-1.5 text-amber-800">
                                <span className="font-bold">✓ Checkpoint:</span> {w.checkpoint}
                              </div>
                              {w.milestone && (
                                <div className="mt-1 text-xs bg-purple-50 border border-purple-200 rounded px-2 py-1.5 text-purple-800">
                                  <Trophy className="w-3 h-3 inline mr-1" />
                                  <span className="font-bold">Milestone:</span> {w.milestone}
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                <div className="mt-5 pt-4 border-t border-gray-200">
                  {allDone ? (
                    <div className="bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-lg p-4 text-center">
                      <Sparkles className="w-6 h-6 mx-auto mb-2" />
                      <p className="font-bold mb-1">All weeks completed! 🎉</p>
                      <p className="text-xs text-emerald-100 mb-3">You're ready to take the assessment.</p>
                      <Button
                        onClick={() => { onTakeAssessment?.(); onClose(); }}
                        className="bg-white text-emerald-700 hover:bg-emerald-50 font-bold"
                      >
                        <Play className="w-4 h-4 mr-1.5" /> Take Level 1 Assessment <ArrowRight className="w-4 h-4 ml-1.5" />
                      </Button>
                    </div>
                  ) : (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-center">
                      <Lock className="w-4 h-4 text-gray-400 mx-auto mb-1" />
                      <p className="text-xs text-gray-600">Complete all {path.total_weeks} weeks to unlock the assessment.</p>
                    </div>
                  )}
                </div>
              </>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
