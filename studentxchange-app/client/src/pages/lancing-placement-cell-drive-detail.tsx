import { useEffect, useState } from "react";
import { useRoute, Link, useLocation } from "wouter";
import { useLancingAuth } from "@/hooks/use-lancing-auth";
import { auth } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Loader2, Download, Users, Calendar, MapPin, IndianRupee, Briefcase, AlertCircle, CheckCircle2, XCircle, FileText, RefreshCw, Plus, Trash2 } from "lucide-react";
import SEOHead from "@/components/seo/seo-head";
import { useToast } from "@/hooks/use-toast";

export default function LancingPlacementCellDriveDetail() {
  const [, params] = useRoute<{ driveId: string }>("/lancing/placement-cell-drive/:driveId");
  const driveId = params?.driveId;
  const { isAuthenticated, role, isLoading: authLoading } = useLancingAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [drive, setDrive] = useState<any>(null);
  const [applicants, setApplicants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [showAddQuestion, setShowAddQuestion] = useState(false);
  const [savingQuestion, setSavingQuestion] = useState(false);
  const [newQ, setNewQ] = useState({ question: "", options: ["", "", "", ""], correct: 0, topic: "" });

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) { setLocation("/lancing/login"); return; }
    if (role && role !== "placement_cell") { setLocation("/lancing/role-select"); return; }
    if (driveId) void load();
  }, [authLoading, isAuthenticated, role, driveId]);

  const load = async () => {
    if (!driveId) return;
    setLoading(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const [dRes, aRes] = await Promise.all([
        fetch(`/api/placement-cell/drives/${driveId}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/placement-cell/drives/${driveId}/applicants`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const dData = await dRes.json();
      const aData = await aRes.json();
      if (!dRes.ok) throw new Error(dData.error);
      setDrive(dData.drive);
      setApplicants(aData.applicants || []);
    } catch (e: any) {
      toast({ title: "Failed to load", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const setStatus = async (uid: string, status: string) => {
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch(`/api/placement-cell/drives/${driveId}/applicants/${uid}/status`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast({ title: `Applicant marked ${status}` });
      void load();
    } catch (e: any) {
      toast({ title: "Failed", description: e.message, variant: "destructive" });
    }
  };

  const exportXLSX = async () => {
    try {
      const mod: any = await import("xlsx");
      const XLSX = mod.default || mod;
      const headers = ["Full Name","Email","Phone","Gender","Branch","Year/Batch","University","CGPA","LinkedIn URL","GitHub URL","Known Skills","Certifications","Resume URL","Applied At","Application Status","Test Status","Test Score (%)","Violations Count"];
      const rows = applicants.map((a: any) => [
        a.name||"", a.email||"", a.phone||"", a.gender||"",
        a.branch||"", a.batch||"", a.university||"",
        a.cgpa!=null?String(a.cgpa):"",
        a.linkedin||"", a.github||"",
        Array.isArray(a.skillsKnown)?a.skillsKnown.join("; "):"",
        Array.isArray(a.certifications)?a.certifications.join("; "):"",
        a.resumeUrl||"",
        a.appliedAt?new Date(a.appliedAt).toLocaleString("en-IN"):"",
        a.status||"applied",
        a.testScore!=null?"Completed":"Not taken",
        a.testPct!=null?String(a.testPct):"",
        a.testFlags?String(a.testFlags.length):"0",
      ]);
      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Applicants");
      const safeTitle = (drive?.jobTitle||"drive").replace(/\s+/g,"_");
      const dateStr = new Date().toISOString().slice(0,10);
      XLSX.writeFile(wb, `DriveApplicants_${safeTitle}_${dateStr}.xlsx`);
    } catch {
      toast({ title: "Export failed", variant: "destructive" });
    }
  };

  const exportTestResultsXLSX = async () => {
    try {
      const mod2: any = await import("xlsx");
      const XLSX = mod2.default || mod2;
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch(`/api/placement-cell/drives/${driveId}/test-results`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) return toast({ title: "Export failed", variant: "destructive" });
      const { results } = await res.json();
      if (!results || results.length === 0) return toast({ title: "No test results yet" });
      const headers = ["Full Name","Email","Branch","Year/Batch","CGPA","Score","Total","Score (%)","Violations","Submitted At","Application Status"];
      const rows = results.map((r: any) => [
        r.name, r.email, r.branch, r.batch, String(r.cgpa||""),
        String(r.score||0), String(r.total||0), String(r.pct||0),
        Array.isArray(r.flags)?r.flags.join("; "):String(r.flags||""),
        r.submittedAt, r.status,
      ]);
      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Test Results");
      const safeTitle = (drive?.jobTitle||"drive").replace(/\s+/g,"_");
      const dateStr = new Date().toISOString().slice(0,10);
      XLSX.writeFile(wb, `TestResults_${safeTitle}_${dateStr}.xlsx`);
    } catch {
      toast({ title: "Export failed", variant: "destructive" });
    }
  };

  const addManualQuestion = async () => {
    if (!newQ.question.trim() || newQ.options.some(o => !o.trim())) {
      toast({ title: "Fill in the question and all 4 options", variant: "destructive" }); return;
    }
    setSavingQuestion(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch(`/api/placement-cell/drives/${driveId}/questions`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ question: newQ.question.trim(), options: newQ.options.map(o => o.trim()), correct: newQ.correct, topic: newQ.topic.trim() || "General" }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast({ title: "Question added" });
      setNewQ({ question: "", options: ["", "", "", ""], correct: 0, topic: "" });
      setShowAddQuestion(false);
      void load();
    } catch (e: any) {
      toast({ title: "Failed", description: e.message, variant: "destructive" });
    }
    setSavingQuestion(false);
  };

  const deleteQuestion = async (qId: string) => {
    if (!confirm("Remove this question?")) return;
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch(`/api/placement-cell/drives/${driveId}/questions/${qId}`, {
        method: "DELETE", headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast({ title: "Question removed" });
      void load();
    } catch (e: any) {
      toast({ title: "Failed", description: e.message, variant: "destructive" });
    }
  };

  const regenerateQuestions = async () => {
    if (!confirm("Regenerate all questions? Existing applicants who haven't taken the test will see the new ones.")) return;
    setRegenerating(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch(`/api/placement-cell/drives/${driveId}/generate-questions`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ regenerate: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast({ title: `Generated ${data.count} questions` });
    } catch (e: any) {
      toast({ title: "Failed", description: e.message, variant: "destructive" });
    } finally {
      setRegenerating(false);
    }
  };

  const toggleStatus = async () => {
    const newStatus = drive.status === "open" ? "closed" : "open";
    try {
      const token = await auth.currentUser?.getIdToken();
      await fetch(`/api/placement-cell/drives/${driveId}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      toast({ title: `Drive ${newStatus}` });
      void load();
    } catch (e: any) {
      toast({ title: "Failed", variant: "destructive" });
    }
  };

  if (authLoading || loading || !drive) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-violet-50 py-10 px-4">
      <SEOHead title={`${drive.jobTitle} - ${drive.companyName}`} description="Drive applicants" />
      <div className="max-w-5xl mx-auto">
        <Link href="/lancing/placement-cell-dashboard"><a className="inline-flex items-center text-indigo-600 mb-6 hover:text-indigo-700"><ArrowLeft className="w-4 h-4 mr-1" /> Back</a></Link>

        <Card className="border-2 border-indigo-100 rounded-3xl shadow-xl mb-6">
          <CardContent className="p-8">
            <div className="flex items-start justify-between flex-wrap gap-4 mb-6">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-3xl font-bold">{drive.jobTitle}</h1>
                  <Badge className={drive.status === "open" ? "bg-emerald-100 text-emerald-700" : "bg-gray-200 text-gray-700"}>{drive.status}</Badge>
                  {drive.hasAssessment && <Badge className="bg-purple-100 text-purple-700">Assessment</Badge>}
                </div>
                <p className="text-lg text-gray-600 mt-1">{drive.companyName}</p>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button variant="outline" onClick={exportXLSX}><Download className="w-4 h-4 mr-2" /> Export Applicants (.xlsx)</Button>
                {drive.hasAssessment && <Button variant="outline" onClick={exportTestResultsXLSX}><Download className="w-4 h-4 mr-2" /> Export Test Results (.xlsx)</Button>}
                <Button variant="outline" onClick={toggleStatus}>{drive.status === "open" ? "Close Drive" : "Reopen Drive"}</Button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              <Meta icon={Briefcase} label={drive.jobType} />
              {drive.location && <Meta icon={MapPin} label={drive.location} />}
              {drive.ctc && <Meta icon={IndianRupee} label={drive.ctc} />}
              {drive.deadline && <Meta icon={Calendar} label={`Deadline: ${drive.deadline}`} />}
            </div>

            <div className="space-y-3 text-sm">
              {drive.description && <p className="text-gray-700 whitespace-pre-wrap">{drive.description}</p>}
              <div className="flex flex-wrap gap-x-6 gap-y-2 text-gray-600 pt-2 border-t">
                <span>Min CGPA: <strong className="text-gray-900">{drive.eligibility?.minCGPA || "—"}</strong></span>
                {drive.eligibility?.min12Pct != null && (
                  <span>Min 12th %: <strong className="text-gray-900">{drive.eligibility.min12Pct}%</strong></span>
                )}
                {drive.eligibility?.min10Pct != null && (
                  <span>Min 10th %: <strong className="text-gray-900">{drive.eligibility.min10Pct}%</strong></span>
                )}
                {drive.eligibility?.maxBacklogs != null && (
                  <span>Max Backlogs: <strong className="text-gray-900">{drive.eligibility.maxBacklogs}</strong></span>
                )}
                <span>Branches: <strong className="text-gray-900">{drive.eligibility?.branches?.length ? drive.eligibility.branches.join(", ") : "All"}</strong></span>
                <span>Batches: <strong className="text-gray-900">{drive.eligibility?.batches?.length ? drive.eligibility.batches.join(", ") : "All"}</strong></span>
              </div>
              {drive.jdUrl && (
                <div className="flex items-center gap-3 mt-3 pt-3 border-t">
                  <FileText className="w-4 h-4 text-blue-500 shrink-0" />
                  <span className="text-sm text-gray-700 flex-1">Job Description Document attached</span>
                  <a
                    href={drive.jdUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors"
                  >
                    View JD
                  </a>
                </div>
              )}
            </div>

            {drive.hasAssessment && (
              <>
              <div className="mt-6 p-4 rounded-2xl bg-purple-50 border border-purple-200">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <p className="font-semibold text-purple-900">Assessment: {drive.assessmentConfig?.numQuestions} questions · {drive.assessmentConfig?.duration} min</p>
                    <p className="text-xs text-purple-700">Topics: {drive.assessmentConfig?.topics?.join(", ") || "—"}</p>
                    {drive.assessmentConfig?.questions ? (
                      <p className="text-xs text-emerald-700 mt-1">✓ {drive.assessmentConfig.questions.length} questions ready</p>
                    ) : (
                      <p className="text-xs text-amber-700 mt-1">Questions not yet generated</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={regenerateQuestions} disabled={regenerating} variant="outline" size="sm">
                      <RefreshCw className={`w-4 h-4 mr-2 ${regenerating ? "animate-spin" : ""}`} /> Regenerate (AI)
                    </Button>
                    <Button onClick={() => setShowAddQuestion(v => !v)} variant="outline" size="sm" className="border-indigo-200 text-indigo-700">
                      <Plus className="w-4 h-4 mr-1" /> Add Manually
                    </Button>
                  </div>
                </div>
              </div>

              {/* Manual question form */}
              {showAddQuestion && (
                <div className="mt-4 p-4 rounded-2xl bg-indigo-50 border border-indigo-200 space-y-3">
                  <p className="font-semibold text-indigo-900 text-sm">Add a Custom Question</p>
                  <input
                    className="w-full border border-indigo-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                    placeholder="Question text…"
                    value={newQ.question}
                    onChange={e => setNewQ(p => ({ ...p, question: e.target.value }))}
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {newQ.options.map((opt, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="correct"
                          checked={newQ.correct === i}
                          onChange={() => setNewQ(p => ({ ...p, correct: i }))}
                          className="accent-indigo-600"
                          title="Mark as correct answer"
                        />
                        <input
                          className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-indigo-400"
                          placeholder={`Option ${String.fromCharCode(65 + i)}${newQ.correct === i ? " (correct)" : ""}`}
                          value={opt}
                          onChange={e => setNewQ(p => { const ops = [...p.options]; ops[i] = e.target.value; return { ...p, options: ops }; })}
                        />
                      </div>
                    ))}
                  </div>
                  <input
                    className="w-full border border-indigo-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                    placeholder="Topic (e.g. Aptitude, DSA)…"
                    value={newQ.topic}
                    onChange={e => setNewQ(p => ({ ...p, topic: e.target.value }))}
                  />
                  <div className="flex gap-2">
                    <Button onClick={addManualQuestion} disabled={savingQuestion} size="sm" className="bg-indigo-600 text-white">
                      {savingQuestion ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Plus className="w-4 h-4 mr-1" />} Save Question
                    </Button>
                    <Button onClick={() => setShowAddQuestion(false)} variant="ghost" size="sm">Cancel</Button>
                  </div>
                </div>
              )}

              {/* Existing question list */}
              {drive.assessmentConfig?.questions?.length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Questions ({drive.assessmentConfig.questions.length})</p>
                  {drive.assessmentConfig.questions.map((q: any, idx: number) => (
                    <div key={q.id || idx} className="flex items-start gap-2 p-3 bg-white border border-gray-200 rounded-xl">
                      <span className="text-xs font-bold text-gray-400 mt-0.5 w-5 shrink-0">{idx + 1}.</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-800">{q.question}</p>
                        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                          {(q.options || []).map((opt: string, i: number) => (
                            <span key={i} className={`text-xs ${i === Number(q.correct) ? "text-emerald-600 font-semibold" : "text-gray-500"}`}>
                              {String.fromCharCode(65 + i)}) {opt}
                            </span>
                          ))}
                        </div>
                        <span className="text-[10px] text-gray-400 mt-0.5 block">{q.topic}</span>
                      </div>
                      <button onClick={() => deleteQuestion(q.id || String(idx))} className="text-red-400 hover:text-red-600 p-1 shrink-0">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              </>
            )}
          </CardContent>
        </Card>

        <Card className="border-2 border-indigo-100 rounded-3xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold flex items-center gap-2"><Users className="w-5 h-5 text-indigo-600" /> Applicants ({applicants.length})</h2>
            </div>
            {applicants.length === 0 ? (
              <div className="text-center py-12 text-gray-500">No applicants yet</div>
            ) : (
              <div className="space-y-3">
                {applicants.map(a => (
                  <div key={a.uid} className="p-4 rounded-2xl border-2 border-gray-100 hover:border-indigo-200" data-testid={`applicant-${a.uid}`}>
                    <div className="flex items-center justify-between flex-wrap gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-bold">{a.name}</p>
                          <Badge className={
                            a.status === "shortlisted" ? "bg-emerald-100 text-emerald-700" :
                            a.status === "rejected" ? "bg-red-100 text-red-700" :
                            a.status === "hired" ? "bg-blue-100 text-blue-700" :
                            a.status === "test_taken" ? "bg-purple-100 text-purple-700" :
                            "bg-gray-100 text-gray-700"
                          }>{a.status || "applied"}</Badge>
                          {a.testScore != null && (
                            <Badge variant="outline" className="font-mono">{a.testScore}/{a.testTotal} ({a.testPct}%)</Badge>
                          )}
                          {a.testFlags?.length > 0 && <Badge className="bg-amber-100 text-amber-700 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{a.testFlags.length} flag(s)</Badge>}
                        </div>
                        <p className="text-sm text-gray-600">{a.email}{a.phone ? ` · ${a.phone}` : ""}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {a.branch && `${a.branch} · `}{a.batch && `Batch ${a.batch} · `}{a.cgpa && `CGPA ${a.cgpa}`}
                        </p>
                        <div className="flex gap-3 mt-2 text-xs">
                          {a.resumeUrl && <a href={a.resumeUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline flex items-center gap-1"><FileText className="w-3 h-3" /> Resume</a>}
                          {a.cvPdfUrl && <a href={a.cvPdfUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline flex items-center gap-1"><FileText className="w-3 h-3" /> CV PDF</a>}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={() => setStatus(a.uid, "shortlisted")} size="sm" variant="outline" className="text-emerald-600 border-emerald-200 hover:bg-emerald-50"><CheckCircle2 className="w-4 h-4 mr-1" /> Shortlist</Button>
                        <Button onClick={() => setStatus(a.uid, "rejected")} size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50"><XCircle className="w-4 h-4 mr-1" /> Reject</Button>
                      </div>
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

function Meta({ icon: Icon, label }: any) {
  return (
    <div className="flex items-center gap-2 text-sm text-gray-700 bg-gray-50 px-3 py-2 rounded-xl">
      <Icon className="w-4 h-4 text-indigo-500" /> <span className="truncate">{label}</span>
    </div>
  );
}
