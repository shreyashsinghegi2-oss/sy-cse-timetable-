import { useEffect, useState, useRef } from "react";
import { useLocation, Link } from "wouter";
import { useLancingAuth } from "@/hooks/use-lancing-auth";
import { auth, firestore } from "@/lib/firebase";
import { collection, query, where, onSnapshot, doc, getDoc } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import {
  GraduationCap, LogOut, Plus, Briefcase, Users, ClipboardList,
  FileText, ShieldCheck, ScanLine, Loader2, Trash2, Edit,
  Monitor, BarChart2, BookOpen, Upload, AlertCircle, CheckCircle2,
  ChevronLeft, ChevronRight, ArrowRight, X, PenLine, Zap, Square
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getAuthToken } from "@/lib/firebase";
import { displayInstitutionName } from "@/lib/institution-display";

const BRANCHES = ["Computer Science", "Information Technology", "Electronics", "Mechanical", "Civil", "Electrical", "Chemical", "Other"];
const YEARS = ["1st Year", "2nd Year", "3rd Year", "Final Year"];

interface Question {
  id: string;
  type: "mcq" | "short_answer" | "coding";
  questionText: string;
  options?: { A: string; B: string; C: string; D: string };
  correctAnswer?: "A" | "B" | "C" | "D" | null;
  marks: number;
  language?: string;
  sampleSolution?: string;
  testCases?: { input: string; expectedOutput: string }[];
  evaluationMode?: "ai" | "manual";
}

interface ExamForm {
  title: string;
  instructions: string;
  timeLimitMinutes: number;
  scheduledAt: string;
  eligibleBranches: string[];
  eligibleYears: string[];
  allowLateJoin: boolean;
  passMarkPercent: number;
  questions: Question[];
  status: "draft" | "scheduled";
}

const blankForm = (): ExamForm => ({
  title: "",
  instructions: "",
  timeLimitMinutes: 60,
  scheduledAt: "",
  eligibleBranches: [],
  eligibleYears: [],
  allowLateJoin: false,
  passMarkPercent: 40,
  questions: [],
  status: "draft",
});

const blankQuestion = (): Question => ({
  id: `q${Date.now()}`,
  type: "mcq",
  questionText: "",
  options: { A: "", B: "", C: "", D: "" },
  correctAnswer: null,
  marks: 1,
});

function SidebarLink({ href, icon: Icon, active, children }: any) {
  return (
    <Link href={href}>
      <button className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${active ? "bg-indigo-600/20 text-white" : "text-slate-400 hover:bg-slate-800 hover:text-white"}`}>
        <Icon className="w-4 h-4 flex-shrink-0" />
        <span className="flex-1 text-left">{children}</span>
      </button>
    </Link>
  );
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    draft: "bg-gray-100 text-gray-600",
    scheduled: "bg-blue-100 text-blue-700",
    live: "bg-emerald-100 text-emerald-700",
    completed: "bg-violet-100 text-violet-700",
  };
  return <Badge className={`capitalize text-xs font-semibold ${map[status] || "bg-gray-100"}`}>{status}</Badge>;
}

export default function LancingPCAssessments() {
  const [, setLocation] = useLocation();
  const { logout } = useLancingAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<any>(null);
  const [exams, setExams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editExam, setEditExam] = useState<any | null>(null);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<ExamForm>(blankForm());
  const [saving, setSaving] = useState(false);
  const [parseLoading, setParseLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const user = auth.currentUser;

  useEffect(() => {
    if (!user) return;
    const pSnap = doc(firestore, "placement_cells", user.uid);
    const unsub = onSnapshot(pSnap, d => { if (d.exists()) setProfile(d.data()); });
    return unsub;
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(firestore, "placement_exams"), where("createdByUid", "==", user.uid));
    const unsub = onSnapshot(q, snap => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
      list.sort((a, b) => {
        const ta = a.createdAt?.toDate?.()?.getTime() || 0;
        const tb = b.createdAt?.toDate?.()?.getTime() || 0;
        return tb - ta;
      });
      setExams(list);
      setLoading(false);
    });
    return unsub;
  }, [user]);

  function openCreate() {
    setForm(blankForm());
    setStep(1);
    setEditExam(null);
    setShowCreate(true);
  }

  function openEdit(exam: any) {
    setForm({
      title: exam.title || "",
      instructions: exam.instructions || "",
      timeLimitMinutes: exam.timeLimitMinutes || 60,
      scheduledAt: exam.scheduledAt ? new Date(exam.scheduledAt?.toDate ? exam.scheduledAt.toDate() : exam.scheduledAt).toISOString().slice(0, 16) : "",
      eligibleBranches: exam.eligibleBranches || [],
      eligibleYears: exam.eligibleYears || [],
      allowLateJoin: exam.allowLateJoin || false,
      passMarkPercent: exam.passMarkPercent || 40,
      questions: exam.questions || [],
      status: exam.status || "draft",
    });
    setStep(1);
    setEditExam(exam);
    setShowCreate(true);
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setParseLoading(true);
    try {
      const token = await getAuthToken();
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/assessments/parse-questions", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to parse");
      setForm(f => ({ ...f, questions: data.questions || [] }));
      toast({ title: `Extracted ${data.questions?.length || 0} questions`, description: "Review and edit below before confirming." });
    } catch (err: any) {
      toast({ title: "Parse failed", description: err.message, variant: "destructive" });
    } finally {
      setParseLoading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function addQuestion() {
    setForm(f => ({ ...f, questions: [...f.questions, blankQuestion()] }));
  }

  function removeQuestion(idx: number) {
    setForm(f => ({ ...f, questions: f.questions.filter((_, i) => i !== idx) }));
  }

  function updateQuestion(idx: number, field: string, value: any) {
    setForm(f => {
      const qs = [...f.questions];
      qs[idx] = { ...qs[idx], [field]: value };
      if (field === "type" && value === "short_answer") {
        qs[idx].options = undefined;
        qs[idx].correctAnswer = undefined;
        qs[idx].language = undefined;
        qs[idx].sampleSolution = undefined;
        qs[idx].testCases = undefined;
      }
      if (field === "type" && value === "mcq") {
        qs[idx].options = { A: "", B: "", C: "", D: "" };
        qs[idx].language = undefined;
        qs[idx].sampleSolution = undefined;
        qs[idx].testCases = undefined;
      }
      if (field === "type" && value === "coding") {
        qs[idx].options = undefined;
        qs[idx].correctAnswer = undefined;
        qs[idx].language = qs[idx].language || "Python";
        qs[idx].marks = Math.max(qs[idx].marks || 1, 5);
      }
      return { ...f, questions: qs };
    });
  }

  function updateOption(idx: number, opt: string, val: string) {
    setForm(f => {
      const qs = [...f.questions];
      qs[idx] = { ...qs[idx], options: { ...qs[idx].options, [opt]: val } as any };
      return { ...f, questions: qs };
    });
  }

  async function saveExam(publish: boolean) {
    if (!form.title.trim()) { toast({ title: "Title required", variant: "destructive" }); return; }
    setSaving(true);
    try {
      const token = await getAuthToken();
      const payload = { ...form, status: publish ? "scheduled" : "draft" };
      const url = editExam ? `/api/assessments/${editExam.id}` : "/api/assessments";
      const method = editExam ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save");
      toast({ title: publish ? "Exam published!" : "Saved as draft", description: publish ? "Students can now see this exam." : "You can publish it later." });
      setShowCreate(false);
    } catch (err: any) {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  async function deleteExam(id: string) {
    if (!confirm("Delete this draft exam? This cannot be undone.")) return;
    try {
      const token = await getAuthToken();
      const res = await fetch(`/api/assessments/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error((await res.json()).error);
      toast({ title: "Exam deleted" });
    } catch (err: any) {
      toast({ title: "Delete failed", description: err.message, variant: "destructive" });
    }
  }

  async function changeStatus(id: string, newStatus: string) {
    const labels: Record<string, string> = { live: "start this exam and let students in?", completed: "end this exam? Students will no longer be able to join.", draft: "move this exam back to draft?" };
    if (!confirm(`Are you sure you want to ${labels[newStatus] || "change this exam status?"}`)) return;
    try {
      const token = await getAuthToken();
      const res = await fetch(`/api/assessments/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      const titles: Record<string, string> = { live: "Exam is now LIVE!", completed: "Exam ended", draft: "Moved to draft" };
      toast({ title: titles[newStatus] || "Status updated", description: newStatus === "live" ? "Students can now join the exam." : undefined });
    } catch (err: any) {
      toast({ title: "Failed to update status", description: err.message, variant: "destructive" });
    }
  }

  const totalMarks = form.questions.reduce((s, q) => s + (q.marks || 1), 0);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col lg:flex-row">
      {/* Sidebar */}
      <aside className="lg:w-64 bg-slate-900 lg:min-h-screen p-5 lg:p-6 flex flex-col">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl flex items-center justify-center shrink-0">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-white font-semibold text-sm leading-tight truncate">{displayInstitutionName(profile?.collegeName, "Placement Cell")}</p>
            <p className="text-xs text-indigo-300 truncate">{profile?.contactName}</p>
          </div>
        </div>
        <nav className="space-y-1 flex-1">
          <SidebarLink href="/lancing/placement-cell-post-drive" icon={Plus}>Post a Drive</SidebarLink>
          <SidebarLink href="/lancing/pc-assessments" icon={BookOpen} active>Assessments</SidebarLink>
          <SidebarLink href="/lancing/placement-cell-dashboard" icon={Briefcase}>My Drives</SidebarLink>
          <SidebarLink href="/lancing/applicant-hub" icon={Users}>Applicant Hub</SidebarLink>
          <SidebarLink href="/lancing/pc-attendance" icon={ScanLine}>Mark Attendance</SidebarLink>
          <SidebarLink href="/lancing/career-compass?from=placement-cell&view=placement" icon={ShieldCheck}>SPCR Portal</SidebarLink>
          <SidebarLink href="/lancing/placement-cell-profile" icon={FileText}>Profile</SidebarLink>
        </nav>
        <Button onClick={async () => { await logout(); setLocation("/student-lancing"); }} variant="ghost"
          className="mt-8 w-full text-slate-400 hover:text-white hover:bg-slate-800 justify-start text-sm">
          <LogOut className="w-4 h-4 mr-2" /> Sign out
        </Button>
      </aside>

      {/* Main */}
      <main className="flex-1 p-6 lg:p-10 min-w-0">
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Assessments</h1>
            <p className="text-sm text-gray-500 mt-1">Create and manage online exams for your campus drives</p>
          </div>
          <Button onClick={openCreate} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl h-10 px-5 text-sm font-semibold shadow-sm">
            <Plus className="w-4 h-4 mr-1.5" /> Create New Assessment
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-indigo-600" /></div>
        ) : exams.length === 0 ? (
          <Card className="border-dashed border-2 border-gray-200">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <BookOpen className="w-12 h-12 text-gray-300 mb-4" />
              <h3 className="text-lg font-semibold text-gray-700 mb-2">No assessments yet</h3>
              <p className="text-sm text-gray-500 mb-6">Create an online exam with auto-proctoring and instant results.</p>
              <Button onClick={openCreate} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl">
                <Plus className="w-4 h-4 mr-1.5" /> Create First Assessment
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {exams.map(exam => {
              const isLive = exam.status === "live";
              const isDraft = exam.status === "draft";
              const isCompleted = exam.status === "completed";
              const scheduledDate = exam.scheduledAt?.toDate ? exam.scheduledAt.toDate() : (exam.scheduledAt ? new Date(exam.scheduledAt) : null);
              return (
                <Card key={exam.id} className={`border ${isLive ? "border-emerald-300 bg-emerald-50/30" : "border-gray-200"}`}>
                  <CardContent className="p-5">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          {statusBadge(exam.status)}
                          {isLive && <span className="text-xs font-semibold text-emerald-600 animate-pulse">● LIVE NOW</span>}
                          <span className="text-xs text-gray-400">{(exam.questions || []).length} questions · {(exam.questions || []).reduce((s: number, q: any) => s + (q.marks || 1), 0)} marks</span>
                        </div>
                        <h3 className="text-base font-bold text-gray-900 truncate">{exam.title}</h3>
                        <div className="flex flex-wrap gap-4 mt-2 text-xs text-gray-500">
                          {scheduledDate && <span>📅 {scheduledDate.toLocaleString()}</span>}
                          <span>⏱ {exam.timeLimitMinutes} minutes</span>
                          <span>🎯 Pass mark: {exam.passMarkPercent || 40}%</span>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 items-center">
                        {isCompleted && (
                          <Button size="sm" variant="outline" onClick={() => setLocation(`/lancing/pc-exam-results/${exam.id}`)}
                            className="text-violet-700 border-violet-300 hover:bg-violet-50 text-xs">
                            <BarChart2 className="w-3.5 h-3.5 mr-1" /> View Results
                          </Button>
                        )}
                        {exam.status === "scheduled" && (
                          <Button size="sm" onClick={() => changeStatus(exam.id, "live")}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold">
                            <Zap className="w-3.5 h-3.5 mr-1" /> Start Exam Now
                          </Button>
                        )}
                        {isLive && (
                          <>
                            <Button size="sm" onClick={() => setLocation(`/lancing/pc-exam-monitor/${exam.id}`)}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs">
                              <Monitor className="w-3.5 h-3.5 mr-1" /> Monitor Live
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => changeStatus(exam.id, "completed")}
                              className="text-red-600 border-red-300 hover:bg-red-50 text-xs">
                              <Square className="w-3.5 h-3.5 mr-1" /> End Exam
                            </Button>
                          </>
                        )}
                        {(isDraft || exam.status === "scheduled") && (
                          <Button size="sm" variant="outline" onClick={() => openEdit(exam)}
                            className="text-indigo-700 border-indigo-300 hover:bg-indigo-50 text-xs">
                            <Edit className="w-3.5 h-3.5 mr-1" /> Edit
                          </Button>
                        )}
                        {isDraft && (
                          <Button size="sm" variant="ghost" onClick={() => deleteExam(exam.id)}
                            className="text-red-500 hover:bg-red-50 text-xs">
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      {/* Create / Edit Dialog */}
      <Dialog open={showCreate} onOpenChange={v => !saving && setShowCreate(v)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editExam ? "Edit Assessment" : "Create New Assessment"}</DialogTitle>
          </DialogHeader>

          {/* Step indicator */}
          <div className="flex gap-2 mb-6">
            {["Exam Details", "Question Paper", "Review & Publish"].map((label, i) => (
              <div key={i} className={`flex-1 h-1 rounded-full transition-colors ${step > i ? "bg-indigo-600" : "bg-gray-200"}`} />
            ))}
          </div>
          <div className="flex justify-between text-xs text-gray-500 -mt-4 mb-4">
            {["Exam Details", "Question Paper", "Review & Publish"].map((label, i) => (
              <span key={i} className={step === i + 1 ? "text-indigo-600 font-semibold" : ""}>{label}</span>
            ))}
          </div>

          {/* STEP 1 */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <Label>Exam Title <span className="text-red-500">*</span></Label>
                <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Software Engineer Aptitude Test" className="mt-1" />
              </div>
              <div>
                <Label>Instructions for Students</Label>
                <Textarea value={form.instructions} onChange={e => setForm(f => ({ ...f, instructions: e.target.value }))}
                  placeholder="Read all questions carefully. No negative marking..." rows={3} className="mt-1" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Time Limit (minutes)</Label>
                  <Input type="number" min={5} max={180} value={form.timeLimitMinutes}
                    onChange={e => setForm(f => ({ ...f, timeLimitMinutes: Number(e.target.value) }))} className="mt-1" />
                </div>
                <div>
                  <Label>Pass Mark (%)</Label>
                  <Input type="number" min={0} max={100} value={form.passMarkPercent}
                    onChange={e => setForm(f => ({ ...f, passMarkPercent: Number(e.target.value) }))} className="mt-1" />
                </div>
              </div>
              <div>
                <Label>Scheduled Date & Time</Label>
                <Input type="datetime-local" value={form.scheduledAt}
                  onChange={e => setForm(f => ({ ...f, scheduledAt: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <Label className="mb-2 block">Eligible Branches</Label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {BRANCHES.map(b => (
                    <label key={b} className="flex items-center gap-1.5 text-xs cursor-pointer">
                      <Checkbox checked={form.eligibleBranches.includes(b)}
                        onCheckedChange={c => setForm(f => ({ ...f, eligibleBranches: c ? [...f.eligibleBranches, b] : f.eligibleBranches.filter(x => x !== b) }))} />
                      {b}
                    </label>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-1">Leave all unchecked for all branches.</p>
              </div>
              <div>
                <Label className="mb-2 block">Eligible Years</Label>
                <div className="flex flex-wrap gap-3">
                  {YEARS.map(y => (
                    <label key={y} className="flex items-center gap-1.5 text-xs cursor-pointer">
                      <Checkbox checked={form.eligibleYears.includes(y)}
                        onCheckedChange={c => setForm(f => ({ ...f, eligibleYears: c ? [...f.eligibleYears, y] : f.eligibleYears.filter(x => x !== y) }))} />
                      {y}
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={form.allowLateJoin} onCheckedChange={c => setForm(f => ({ ...f, allowLateJoin: c }))} />
                <Label>Allow late join (up to 10 minutes after start)</Label>
              </div>
            </div>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <div className="space-y-5">
              <div className="p-4 border-2 border-dashed border-indigo-200 rounded-xl bg-indigo-50/40">
                <p className="text-sm font-semibold text-indigo-800 mb-1">Upload Question Paper (Optional)</p>
                <p className="text-xs text-indigo-600 mb-3">Upload a PDF, Word (.docx), or TXT file. Our AI will extract questions automatically.</p>
                <input ref={fileRef} type="file" accept=".pdf,.docx,.txt" onChange={handleFileUpload} className="hidden" />
                <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={parseLoading}
                  className="text-indigo-700 border-indigo-300">
                  {parseLoading ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Extracting...</> : <><Upload className="w-4 h-4 mr-1" /> Choose File</>}
                </Button>
              </div>

              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-gray-800">{form.questions.length} Questions</span>
                  {(() => {
                    const mcqCount = form.questions.filter(q => q.type === "mcq").length;
                    const saCount = form.questions.filter(q => q.type === "short_answer").length;
                    const codingCount = form.questions.filter(q => q.type === "coding").length;
                    return (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {mcqCount > 0 && <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">{mcqCount} MCQ</span>}
                        {saCount > 0 && <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">{saCount} Short Answer</span>}
                        {codingCount > 0 && <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">{codingCount} Coding</span>}
                        <span className="text-xs text-gray-400">· {totalMarks} total marks</span>
                      </div>
                    );
                  })()}
                </div>
                <Button size="sm" onClick={addQuestion} variant="outline" className="text-xs">
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add Question
                </Button>
              </div>

              {form.questions.length === 0 && (
                <div className="text-center py-8 text-gray-400 text-sm border-2 border-dashed rounded-xl">
                  No questions yet. Upload a file or add manually.
                </div>
              )}

              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1">
                {form.questions.map((q, idx) => (
                  <div key={q.id} className="border border-gray-200 rounded-xl p-4 bg-white space-y-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-gray-500 w-6">Q{idx + 1}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                        q.type === "mcq" ? "bg-blue-100 text-blue-700" :
                        q.type === "short_answer" ? "bg-amber-100 text-amber-700" :
                        "bg-purple-100 text-purple-700"
                      }`}>
                        {q.type === "mcq" ? "MCQ" : q.type === "short_answer" ? "Short Answer" : "Coding"}
                      </span>
                      <select value={q.type} onChange={e => updateQuestion(idx, "type", e.target.value)}
                        className="text-xs border rounded-lg px-2 py-1 text-gray-700 bg-gray-50">
                        <option value="mcq">MCQ</option>
                        <option value="short_answer">Short Answer</option>
                        <option value="coding">Coding</option>
                      </select>
                      <Input type="number" min={1} max={20} value={q.marks} onChange={e => updateQuestion(idx, "marks", Number(e.target.value))}
                        className="w-16 text-xs h-7" placeholder="Marks" />
                      <span className="text-xs text-gray-400">marks</span>
                      <button onClick={() => removeQuestion(idx)} className="ml-auto text-red-400 hover:text-red-600">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <Textarea value={q.questionText} onChange={e => updateQuestion(idx, "questionText", e.target.value)}
                      placeholder={q.type === "coding" ? "Problem statement (describe the coding challenge)..." : "Question text..."} rows={q.type === "coding" ? 3 : 2} className="text-sm" />
                    {q.type === "mcq" && q.options && (
                      <div className="grid grid-cols-2 gap-2">
                        {(["A", "B", "C", "D"] as const).map(opt => (
                          <div key={opt} className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-gray-500 w-4">{opt}.</span>
                            <Input value={q.options![opt]} onChange={e => updateOption(idx, opt, e.target.value)}
                              placeholder={`Option ${opt}`} className="text-xs h-7 flex-1" />
                            <input type="radio" name={`correct-${q.id}`} checked={q.correctAnswer === opt}
                              onChange={() => updateQuestion(idx, "correctAnswer", opt)}
                              title="Mark as correct answer" className="cursor-pointer" />
                          </div>
                        ))}
                        <p className="col-span-2 text-xs text-gray-400">Select the correct answer (radio button)</p>
                      </div>
                    )}
                    {q.type === "coding" && (
                      <div className="space-y-2 border-t border-gray-100 pt-2">
                        <div className="flex items-center gap-2">
                          <label className="text-xs text-gray-500 font-medium w-24 shrink-0">Language:</label>
                          <select value={q.language || "Python"} onChange={e => updateQuestion(idx, "language", e.target.value)}
                            className="text-xs border rounded-lg px-2 py-1 text-gray-700 bg-gray-50">
                            {["Python", "JavaScript", "Java", "C++", "C", "Go", "TypeScript"].map(l => <option key={l}>{l}</option>)}
                          </select>
                          <label className="text-xs text-gray-500 font-medium ml-3 shrink-0">Evaluation:</label>
                          <select value={q.evaluationMode || "ai"} onChange={e => updateQuestion(idx, "evaluationMode", e.target.value)}
                            className="text-xs border rounded-lg px-2 py-1 text-gray-700 bg-gray-50">
                            <option value="ai">AI Auto-Grade</option>
                            <option value="manual">Manual Review</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 font-medium">Sample Solution <span className="text-gray-400">(optional – used by AI for grading)</span></label>
                          <Textarea value={q.sampleSolution || ""} onChange={e => updateQuestion(idx, "sampleSolution", e.target.value)}
                            placeholder="Paste reference/sample solution here..." rows={3}
                            className="text-xs font-mono mt-1 bg-gray-50" />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 3 */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-5 space-y-2">
                <h3 className="font-bold text-indigo-900">{form.title}</h3>
                <div className="grid grid-cols-2 gap-2 text-sm text-indigo-800">
                  <div>⏱ Duration: <strong>{form.timeLimitMinutes} minutes</strong></div>
                  <div>🎯 Pass mark: <strong>{form.passMarkPercent}%</strong></div>
                  <div>📅 Scheduled: <strong>{form.scheduledAt ? new Date(form.scheduledAt).toLocaleString() : "Not set"}</strong></div>
                  <div>❓ Questions: <strong>{form.questions.length}</strong></div>
                  <div>📊 Total Marks: <strong>{totalMarks}</strong></div>
                  <div>⏰ Late Join: <strong>{form.allowLateJoin ? "Allowed" : "Not allowed"}</strong></div>
                </div>
                <div>
                  <span className="text-xs text-indigo-600 font-semibold">Eligible Branches: </span>
                  <span className="text-xs text-indigo-800">{form.eligibleBranches.length ? form.eligibleBranches.join(", ") : "All branches"}</span>
                </div>
                <div>
                  <span className="text-xs text-indigo-600 font-semibold">Eligible Years: </span>
                  <span className="text-xs text-indigo-800">{form.eligibleYears.length ? form.eligibleYears.join(", ") : "All years"}</span>
                </div>
              </div>
              {form.questions.length === 0 && (
                <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 text-sm">
                  <AlertCircle className="w-4 h-4 shrink-0" /> No questions added. You can still save as draft.
                </div>
              )}
              {!form.scheduledAt && (
                <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 text-sm">
                  <AlertCircle className="w-4 h-4 shrink-0" /> No scheduled time. Set a date before publishing.
                </div>
              )}
            </div>
          )}

          <DialogFooter className="flex-wrap gap-2 mt-6">
            {step > 1 && (
              <Button variant="outline" onClick={() => setStep(s => s - 1)} className="text-sm">
                <ChevronLeft className="w-4 h-4 mr-1" /> Back
              </Button>
            )}
            {step < 3 && (
              <Button onClick={() => setStep(s => s + 1)} className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm ml-auto">
                Next <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            )}
            {step === 3 && (
              <>
                <Button variant="outline" onClick={() => saveExam(false)} disabled={saving} className="text-sm">
                  {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null} Save as Draft
                </Button>
                <Button onClick={() => saveExam(true)} disabled={saving || !form.scheduledAt || form.questions.length === 0}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm">
                  {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-1" />}
                  Publish Exam
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
