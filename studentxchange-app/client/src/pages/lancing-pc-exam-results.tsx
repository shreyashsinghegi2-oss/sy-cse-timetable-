import { useEffect, useState } from "react";
import { useRoute, useLocation } from "wouter";
import { auth, firestore } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  ChevronLeft, Loader2, Download, AlertTriangle, CheckCircle2,
  Flag, Eye, Trophy, Users, TrendingUp, Save, Code2
} from "lucide-react";
import * as XLSX from "xlsx";
import { getAuthToken } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";

interface ResultRow {
  id: string;
  uid: string;
  studentName: string;
  studentUrn: string;
  studentBranch: string;
  studentYear: string;
  studentUniversity: string;
  studentCgpa: number;
  studentEmail: string;
  score: number;
  totalMarks: number;
  percentage: number;
  timeTakenMinutes: number;
  violationsCount: number;
  violations: any[];
  status: "passed" | "failed";
  autoSubmitted: boolean;
  flaggedForReview: boolean;
  submittedAt: string;
  answers: Record<string, string>;
  hasPendingReview: boolean;
  shortAnswerGrades?: Record<string, { marksAwarded: number; feedback: string }>;
  codingBreakdown?: Record<string, { marksAwarded: number; feedback: string; score: number }>;
  mcqScore?: number;
  codingScore?: number;
}

export default function LancingPCExamResults() {
  const [, params] = useRoute("/lancing/pc-exam-results/:examId");
  const [, setLocation] = useLocation();
  const examId = params?.examId || "";
  const { toast } = useToast();

  const [exam, setExam] = useState<any>(null);
  const [results, setResults] = useState<ResultRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailRow, setDetailRow] = useState<ResultRow | null>(null);
  const [flagging, setFlagging] = useState<string | null>(null);
  const [saGrades, setSaGrades] = useState<Record<string, { marks: string; feedback: string }>>({});
  const [savingGrade, setSavingGrade] = useState<string | null>(null);

  useEffect(() => {
    if (!examId) return;
    async function load() {
      setLoading(true);
      try {
        const token = await getAuthToken();
        const [examSnap, resSnap] = await Promise.all([
          getDoc(doc(firestore, "placement_exams", examId)),
          fetch(`/api/assessments/${examId}/results`, { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        if (examSnap.exists()) setExam({ id: examSnap.id, ...examSnap.data() });
        if (resSnap.ok) {
          const data = await resSnap.json();
          setResults(data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [examId]);

  async function saveShortAnswerGrade(resultId: string, questionId: string, marksAwarded: number, feedback: string) {
    setSavingGrade(questionId);
    try {
      const token = await getAuthToken();
      const res = await fetch(`/api/assessments/${examId}/results/${resultId}/grade-short-answer`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ questionId, marksAwarded, feedback }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save grade");
      setResults(prev => prev.map(r => r.id === resultId ? {
        ...r,
        score: data.newScore,
        percentage: data.newPercentage,
        status: data.newPercentage >= (exam?.passMarkPercent || 40) ? "passed" : "failed",
        shortAnswerGrades: { ...(r.shortAnswerGrades || {}), [questionId]: { marksAwarded, feedback } },
      } : r));
      if (detailRow?.id === resultId) {
        setDetailRow(prev => prev ? { ...prev, score: data.newScore, percentage: data.newPercentage, shortAnswerGrades: { ...(prev.shortAnswerGrades || {}), [questionId]: { marksAwarded, feedback } } } : prev);
      }
      toast({ title: "Grade saved" });
    } catch (err: any) {
      toast({ title: "Failed to save grade", description: err.message, variant: "destructive" });
    } finally {
      setSavingGrade(null);
    }
  }

  async function toggleFlag(row: ResultRow) {
    setFlagging(row.id);
    try {
      const token = await getAuthToken();
      const res = await fetch(`/api/assessments/${examId}/results/${row.id}/flag`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ flagged: !row.flaggedForReview }),
      });
      if (res.ok) {
        setResults(prev => prev.map(r => r.id === row.id ? { ...r, flaggedForReview: !r.flaggedForReview } : r));
        toast({ title: row.flaggedForReview ? "Flag removed" : "Flagged for review" });
      }
    } catch { } finally {
      setFlagging(null); }
  }

  function exportExcel() {
    try {
      const rows = results.map((r, i) => ({
        Rank: i + 1,
        "Full Name": r.studentName,
        Email: r.studentEmail,
        URN: r.studentUrn,
        Branch: r.studentBranch,
        Year: r.studentYear,
        University: r.studentUniversity,
        CGPA: r.studentCgpa,
        Score: r.score,
        "Total Marks": r.totalMarks,
        Percentage: `${r.percentage}%`,
        "Time Taken (min)": r.timeTakenMinutes,
        "Violations Count": r.violationsCount,
        "Violation Types": (r.violations || []).map((v: any) => v.type).join(", "),
        Status: r.status,
        "Auto Submitted": r.autoSubmitted ? "Yes" : "No",
        "Flagged for Review": r.flaggedForReview ? "Yes" : "No",
        "Submitted At": r.submittedAt ? new Date(r.submittedAt).toLocaleString() : "",
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Results");
      const today = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(wb, `ExamResults_${(exam?.title || "Exam").replace(/\s+/g, "_")}_${today}.xlsx`);
    } catch (err: any) {
      toast({ title: "Export failed", description: err.message, variant: "destructive" });
    }
  }

  const ranked = [...results].sort((a, b) => b.score - a.score || a.timeTakenMinutes - b.timeTakenMinutes);
  const passed = results.filter(r => r.status === "passed").length;
  const avgScore = results.length ? Math.round(results.reduce((s, r) => s + r.percentage, 0) / results.length) : 0;

  if (loading) return (
    <div className="flex items-center justify-center h-screen bg-gray-50">
      <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex flex-wrap items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => setLocation("/lancing/pc-assessments")} className="text-gray-600">
          <ChevronLeft className="w-4 h-4 mr-1" /> Back
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-gray-900 truncate">{exam?.title || "Exam Results"}</h1>
          <p className="text-sm text-gray-500">{results.length} submissions</p>
        </div>
        <Button onClick={exportExcel} variant="outline" size="sm" className="text-emerald-700 border-emerald-300">
          <Download className="w-4 h-4 mr-1" /> Export Excel
        </Button>
      </div>

      <div className="max-w-6xl mx-auto p-6">
        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[
            { icon: Users, label: "Total Submissions", value: results.length, color: "text-indigo-600 bg-indigo-100" },
            { icon: CheckCircle2, label: "Passed", value: passed, color: "text-emerald-600 bg-emerald-100" },
            { icon: TrendingUp, label: "Average Score", value: `${avgScore}%`, color: "text-blue-600 bg-blue-100" },
            { icon: Trophy, label: "Top Score", value: results.length ? `${Math.max(...results.map(r => r.percentage))}%` : "—", color: "text-amber-600 bg-amber-100" },
          ].map(kpi => (
            <Card key={kpi.label} className="border-gray-200">
              <CardContent className="flex items-center gap-3 p-4">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${kpi.color}`}>
                  <kpi.icon className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-lg font-bold text-gray-900">{kpi.value}</p>
                  <p className="text-xs text-gray-500">{kpi.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {results.length === 0 ? (
          <Card className="border-dashed border-2 border-gray-200">
            <CardContent className="text-center py-16 text-gray-400">
              <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>No results yet. Students haven't submitted this exam.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {["Rank", "Name", "URN", "Branch", "Score", "%", "Time", "Violations", "Status", "Actions"].map(h => (
                    <th key={h} className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ranked.map((row, i) => (
                  <tr key={row.id} className={`border-b border-gray-100 last:border-0 ${row.flaggedForReview ? "bg-amber-50" : ""}`}>
                    <td className="px-3 py-3 font-bold text-gray-700">{i + 1 === 1 ? "🥇" : i + 1 === 2 ? "🥈" : i + 1 === 3 ? "🥉" : i + 1}</td>
                    <td className="px-3 py-3">
                      <p className="font-medium text-gray-900 whitespace-nowrap">{row.studentName || "—"}</p>
                      <p className="text-xs text-gray-400">{row.studentBranch}</p>
                    </td>
                    <td className="px-3 py-3 text-gray-600 whitespace-nowrap">{row.studentUrn || "—"}</td>
                    <td className="px-3 py-3 text-gray-600 whitespace-nowrap">{row.studentBranch || "—"}</td>
                    <td className="px-3 py-3 font-mono font-bold text-gray-900">{row.score}/{row.totalMarks}</td>
                    <td className="px-3 py-3">
                      <span className={`font-bold ${row.percentage >= (exam?.passMarkPercent || 40) ? "text-emerald-600" : "text-red-500"}`}>
                        {row.percentage}%
                      </span>
                    </td>
                    <td className="px-3 py-3 text-gray-600 whitespace-nowrap">{row.timeTakenMinutes}m</td>
                    <td className="px-3 py-3">
                      {row.violationsCount > 0 ? (
                        <span className="inline-flex items-center gap-1 text-red-600 font-semibold text-xs">
                          <AlertTriangle className="w-3 h-3" />{row.violationsCount}
                        </span>
                      ) : <span className="text-gray-400 text-xs">0</span>}
                    </td>
                    <td className="px-3 py-3">
                      <Badge className={`text-xs ${row.status === "passed" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-600"}`}>
                        {row.status === "passed" ? "Passed" : "Failed"}
                      </Badge>
                      {row.autoSubmitted && <Badge className="ml-1 text-[10px] bg-amber-100 text-amber-700">Auto</Badge>}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1">
                        <Button size="sm" variant="ghost" onClick={() => setDetailRow(row)} className="text-xs h-7 px-2 text-indigo-700">
                          <Eye className="w-3 h-3 mr-1" />View
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => toggleFlag(row)} disabled={flagging === row.id}
                          className={`text-xs h-7 px-2 ${row.flaggedForReview ? "text-amber-600" : "text-gray-400"}`}>
                          <Flag className="w-3 h-3" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Answer Detail Dialog */}
      <Dialog open={!!detailRow} onOpenChange={v => !v && setDetailRow(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Answers — {detailRow?.studentName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-indigo-700">{detailRow?.score}/{detailRow?.totalMarks}</p>
                <p className="text-xs text-gray-500">Score</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <p className={`text-2xl font-bold ${(detailRow?.percentage || 0) >= (exam?.passMarkPercent || 40) ? "text-emerald-600" : "text-red-500"}`}>{detailRow?.percentage}%</p>
                <p className="text-xs text-gray-500">Percentage</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-gray-700">{detailRow?.violationsCount}</p>
                <p className="text-xs text-gray-500">Violations</p>
              </div>
            </div>

            {/* Questions + answers */}
            {exam?.questions?.map((q: any, idx: number) => {
              const studentAnswer = detailRow?.answers?.[q.id];
              const isCorrect = q.type === "mcq" && q.correctAnswer && studentAnswer === q.correctAnswer;
              const isWrong = q.type === "mcq" && q.correctAnswer && studentAnswer && studentAnswer !== q.correctAnswer;
              return (
                <div key={q.id} className={`border rounded-xl p-4 ${isCorrect ? "border-emerald-300 bg-emerald-50" : isWrong ? "border-red-300 bg-red-50" : "border-gray-200"}`}>
                  <div className="flex gap-2 mb-2">
                    <span className="text-xs font-bold text-gray-500">Q{idx + 1}</span>
                    <span className="text-xs text-gray-400">{q.marks} mark{q.marks > 1 ? "s" : ""}</span>
                    {isCorrect && <span className="text-xs text-emerald-600 font-bold">✓ Correct</span>}
                    {isWrong && <span className="text-xs text-red-600 font-bold">✗ Wrong</span>}
                    {q.type === "short_answer" && <span className="text-xs text-amber-600">Pending review</span>}
                  </div>
                  <p className="text-sm font-medium text-gray-800 mb-2">{q.questionText}</p>
                  {q.type === "mcq" && q.options && (
                    <div className="grid grid-cols-2 gap-1">
                      {(["A", "B", "C", "D"] as const).map(opt => (
                        <div key={opt} className={`text-xs px-2 py-1 rounded-lg ${
                          opt === q.correctAnswer ? "bg-emerald-100 text-emerald-700 font-bold" :
                          opt === studentAnswer && opt !== q.correctAnswer ? "bg-red-100 text-red-600 font-bold" :
                          "text-gray-600"
                        }`}>
                          {opt}. {q.options[opt]}
                          {opt === studentAnswer && <span className="ml-1">(student)</span>}
                        </div>
                      ))}
                    </div>
                  )}
                  {q.type === "short_answer" && (
                    <div className="space-y-2 mt-2">
                      <div className="bg-white border border-gray-200 rounded-lg p-3 text-sm text-gray-700">
                        {studentAnswer || <span className="text-gray-400 italic">No answer provided</span>}
                      </div>
                      {/* Grading UI */}
                      {studentAnswer && (() => {
                        const gradeKey = `${detailRow?.id}__${q.id}`;
                        const existingGrade = detailRow?.shortAnswerGrades?.[q.id];
                        const gradeState = saGrades[gradeKey] || {
                          marks: existingGrade ? String(existingGrade.marksAwarded) : "",
                          feedback: existingGrade?.feedback || "",
                        };
                        return (
                          <div className="border border-amber-200 bg-amber-50 rounded-lg p-3 space-y-2">
                            <p className="text-xs font-semibold text-amber-800">
                              {existingGrade ? "✓ Graded — Update grade" : "Grade this answer"} (max {q.marks} marks)
                            </p>
                            <div className="flex items-center gap-2">
                              <Input
                                type="number" min={0} max={q.marks} step={0.5}
                                value={gradeState.marks}
                                onChange={e => setSaGrades(g => ({ ...g, [gradeKey]: { ...gradeState, marks: e.target.value } }))}
                                placeholder={`0–${q.marks}`}
                                className="w-20 h-7 text-xs"
                              />
                              <span className="text-xs text-gray-500">/ {q.marks} marks</span>
                              <Input
                                value={gradeState.feedback}
                                onChange={e => setSaGrades(g => ({ ...g, [gradeKey]: { ...gradeState, feedback: e.target.value } }))}
                                placeholder="Feedback (optional)..."
                                className="flex-1 h-7 text-xs"
                              />
                              <Button size="sm"
                                onClick={() => saveShortAnswerGrade(detailRow!.id, q.id, Number(gradeState.marks) || 0, gradeState.feedback)}
                                disabled={savingGrade === q.id || gradeState.marks === ""}
                                className="h-7 px-3 text-xs bg-amber-600 hover:bg-amber-700 text-white shrink-0">
                                {savingGrade === q.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                              </Button>
                            </div>
                            {existingGrade && (
                              <p className="text-xs text-amber-700">Current: {existingGrade.marksAwarded}/{q.marks} marks{existingGrade.feedback ? ` · "${existingGrade.feedback}"` : ""}</p>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  )}
                  {q.type === "coding" && (
                    <div className="mt-2 space-y-2">
                      <div className="bg-gray-900 rounded-lg p-3 text-xs font-mono text-gray-100 overflow-x-auto max-h-32">
                        <pre className="whitespace-pre-wrap">{studentAnswer || <span className="text-gray-500 italic">No code submitted</span>}</pre>
                      </div>
                      {detailRow?.codingBreakdown?.[q.id] && (
                        <div className={`border rounded-lg p-2 text-xs ${
                          detailRow.codingBreakdown[q.id].score >= 0.7 ? "border-emerald-200 bg-emerald-50" :
                          detailRow.codingBreakdown[q.id].score >= 0.4 ? "border-amber-200 bg-amber-50" :
                          "border-red-200 bg-red-50"
                        }`}>
                          <div className="flex items-center gap-2 mb-1">
                            <Code2 className="w-3 h-3" />
                            <span className="font-semibold">AI Evaluation: {detailRow.codingBreakdown[q.id].marksAwarded}/{q.marks} marks</span>
                          </div>
                          <p className="text-gray-700">{detailRow.codingBreakdown[q.id].feedback}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Violations */}
            {(detailRow?.violations?.length || 0) > 0 && (
              <div>
                <p className="text-sm font-semibold text-gray-800 mb-2">Violations Timeline</p>
                <div className="space-y-2">
                  {detailRow!.violations.map((v: any, i: number) => (
                    <div key={i} className="flex gap-2 items-start text-xs bg-red-50 border border-red-100 rounded-lg p-2">
                      <AlertTriangle className="w-3.5 h-3.5 text-red-500 mt-0.5 shrink-0" />
                      <div>
                        <span className="font-semibold capitalize text-red-700">{v.type?.replace(/_/g, " ")}</span>
                        {v.details && <p className="text-red-500 mt-0.5">{v.details}</p>}
                        <p className="text-gray-400">{v.timestamp ? new Date(v.timestamp).toLocaleTimeString() : ""}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
