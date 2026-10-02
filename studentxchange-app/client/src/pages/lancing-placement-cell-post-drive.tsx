import { useState, useRef, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useLancingAuth } from "@/hooks/use-lancing-auth";
import { auth, storage } from "@/lib/firebase";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Loader2, Plus, X, ClipboardList, Briefcase, Sparkles, Upload, FileText, CheckCircle2, AlertCircle } from "lucide-react";
import SEOHead from "@/components/seo/seo-head";
import { useToast } from "@/hooks/use-toast";

const JOB_TYPES = ["Full-time", "Internship", "Internship → PPO", "Part-time", "Contract"];
const COMMON_BRANCHES = ["CSE", "IT", "ECE", "EEE", "Mechanical", "Civil", "Chemical", "AI/ML", "Data Science", "MBA", "B.Com", "BBA"];
const COMMON_BATCHES = ["2024", "2025", "2026", "2027", "2028"];

export default function LancingPlacementCellPostDrive() {
  const { isAuthenticated, role, isLoading: authLoading } = useLancingAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Edit mode — read ?edit=driveId from URL
  const editDriveId = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "").get("edit");
  const isEditMode = !!editDriveId;
  const [loadingEdit, setLoadingEdit] = useState(isEditMode);

  const [form, setForm] = useState({
    jobTitle: "", companyName: "", jobType: "Full-time",
    location: "", ctc: "", description: "", minCGPA: "0",
    min12Pct: "", min10Pct: "", maxBacklogs: "", deadline: "",
  });
  const [branches, setBranches] = useState<string[]>([]);
  const [batches, setBatches] = useState<string[]>([]);

  // JD upload state
  const [jdFile, setJdFile] = useState<File | null>(null);
  const [jdUrl, setJdUrl] = useState("");
  const [jdUploading, setJdUploading] = useState(false);
  const [jdProgress, setJdProgress] = useState(0);

  // AI Assessment
  const [showAssessmentDialog, setShowAssessmentDialog] = useState(false);
  const [assessmentConfig, setAssessmentConfig] = useState<{
    enabled: boolean; topics: string[]; numQuestions: number; duration: number;
  }>({ enabled: false, topics: [], numQuestions: 15, duration: 30 });
  const [topicInput, setTopicInput] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) { setLocation("/lancing/login"); return; }
    if (role && role !== "placement_cell") { setLocation("/lancing/role-select"); return; }
  }, [authLoading, isAuthenticated, role]);

  // Load existing drive when in edit mode
  useEffect(() => {
    if (!editDriveId || authLoading || !isAuthenticated) return;
    (async () => {
      try {
        const token = await auth.currentUser?.getIdToken();
        const res = await fetch(`/api/placement-cell/drives/${editDriveId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Drive not found");
        const { drive } = await res.json();
        const elig = drive.eligibility || {};
        setForm({
          jobTitle: drive.jobTitle || "",
          companyName: drive.companyName || "",
          jobType: drive.jobType || "Full-time",
          location: drive.location || "",
          ctc: drive.ctc || "",
          description: drive.description || "",
          minCGPA: elig.minCGPA != null ? String(elig.minCGPA) : "0",
          min12Pct: elig.min12Pct != null ? String(elig.min12Pct) : "",
          min10Pct: elig.min10Pct != null ? String(elig.min10Pct) : "",
          maxBacklogs: elig.maxBacklogs != null ? String(elig.maxBacklogs) : "",
          deadline: drive.deadline || "",
        });
        setBranches(elig.branches || []);
        setBatches(elig.batches || []);
        if (drive.jdUrl) setJdUrl(drive.jdUrl);
      } catch (e: any) {
        toast({ title: "Could not load drive", description: e.message, variant: "destructive" });
      } finally {
        setLoadingEdit(false);
      }
    })();
  }, [editDriveId, authLoading, isAuthenticated]);

  const toggleBranch = (b: string) => setBranches(p => p.includes(b) ? p.filter(x => x !== b) : [...p, b]);
  const toggleBatch = (b: string) => setBatches(p => p.includes(b) ? p.filter(x => x !== b) : [...p, b]);
  const addTopic = () => {
    const t = topicInput.trim();
    if (t && !assessmentConfig.topics.includes(t)) {
      setAssessmentConfig(p => ({ ...p, topics: [...p.topics, t] }));
    }
    setTopicInput("");
  };
  const removeTopic = (t: string) => setAssessmentConfig(p => ({ ...p, topics: p.topics.filter(x => x !== t) }));

  const handleJdFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf") {
      toast({ title: "Only PDF files allowed for JD", variant: "destructive" }); return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "File too large — max 10 MB", variant: "destructive" }); return;
    }
    setJdFile(file);
    setJdUrl("");
    setJdUploading(true);
    setJdProgress(0);
    try {
      const uid = auth.currentUser?.uid || "unknown";
      const storageRef = ref(storage, `jd_documents/${uid}_${Date.now()}.pdf`);
      const task = uploadBytesResumable(storageRef, file, { contentType: "application/pdf" });
      task.on("state_changed",
        snap => setJdProgress(Math.round(snap.bytesTransferred / snap.totalBytes * 100)),
        err => { toast({ title: "Upload failed", description: err.message, variant: "destructive" }); setJdUploading(false); },
        async () => {
          const url = await getDownloadURL(task.snapshot.ref);
          setJdUrl(url);
          setJdUploading(false);
          toast({ title: "JD uploaded ✓" });
        }
      );
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
      setJdUploading(false);
    }
  };

  const removeJd = () => {
    setJdFile(null); setJdUrl(""); setJdProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const submit = async () => {
    if (!form.jobTitle.trim() || !form.companyName.trim()) {
      return toast({ title: "Job title and company are required", variant: "destructive" });
    }
    if (jdUploading) {
      return toast({ title: "Please wait for JD upload to complete", variant: "destructive" });
    }
    if (!isEditMode && assessmentConfig.enabled && assessmentConfig.topics.length === 0) {
      return toast({ title: "Add at least one assessment topic", variant: "destructive" });
    }
    setSubmitting(true);
    try {
      const token = await auth.currentUser?.getIdToken();

      if (isEditMode) {
        // Update existing drive
        const res = await fetch(`/api/placement-cell/drives/${editDriveId}`, {
          method: "PATCH",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            jobTitle: form.jobTitle,
            companyName: form.companyName,
            jobType: form.jobType,
            location: form.location,
            ctc: form.ctc,
            description: form.description,
            minCGPA: form.minCGPA,
            min12Pct: form.min12Pct || null,
            min10Pct: form.min10Pct || null,
            maxBacklogs: form.maxBacklogs !== "" ? form.maxBacklogs : null,
            branches, batches,
            deadline: form.deadline || null,
            jdUrl: jdUrl || null,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to update drive");
        toast({ title: "Drive updated successfully!" });
        setLocation("/lancing/placement-cell-dashboard");
      } else {
        // Create new drive
        const res = await fetch("/api/placement-cell/drives", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            jobTitle: form.jobTitle,
            companyName: form.companyName,
            jobType: form.jobType,
            location: form.location,
            ctc: form.ctc,
            description: form.description,
            minCGPA: parseFloat(form.minCGPA) || 0,
            min12Pct: form.min12Pct ? parseFloat(form.min12Pct) : null,
            min10Pct: form.min10Pct ? parseFloat(form.min10Pct) : null,
            maxBacklogs: form.maxBacklogs !== "" ? parseInt(form.maxBacklogs) : null,
            branches, batches,
            deadline: form.deadline || null,
            jdUrl: jdUrl || null,
            hasAssessment: assessmentConfig.enabled,
            assessmentConfig: assessmentConfig.enabled ? {
              topics: assessmentConfig.topics,
              duration: assessmentConfig.duration,
              numQuestions: assessmentConfig.numQuestions,
            } : null,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to create drive");

        if (assessmentConfig.enabled && data.driveId) {
          toast({ title: "Drive created. Generating assessment questions…" });
          try {
            await fetch(`/api/placement-cell/drives/${data.driveId}/generate-questions`, {
              method: "POST",
              headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
              body: JSON.stringify({}),
            });
          } catch {}
        }
        toast({ title: "Drive posted successfully!" });
        setLocation("/lancing/placement-cell-dashboard");
      }
    } catch (e: any) {
      toast({ title: "Failed", description: e.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || loadingEdit) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>;

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <SEOHead title={isEditMode ? "Edit Drive" : "Post a Drive"} description="Post a campus placement drive" />
      <div className="max-w-2xl mx-auto">
        <Link href="/lancing/placement-cell-dashboard">
          <a className="inline-flex items-center text-sm text-indigo-600 mb-5 hover:text-indigo-700 font-medium">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to Dashboard
          </a>
        </Link>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center">
            <Briefcase className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{isEditMode ? "Edit Drive" : "Post a Placement Drive"}</h1>
            <p className="text-xs text-gray-500">Fill in the role, eligibility and supporting documents</p>
          </div>
        </div>

        <Card className="border border-gray-200 rounded-2xl shadow-none">
          <CardContent className="p-6 space-y-5">

            {/* Role Details */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Role Details</p>
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-medium text-gray-700">Job Title *</Label>
                  <Input
                    value={form.jobTitle}
                    onChange={e => setForm({ ...form, jobTitle: e.target.value })}
                    placeholder="e.g. SDE Intern"
                    className="mt-1 h-9 text-sm"
                    data-testid="input-job-title"
                  />
                </div>
                <div>
                  <Label className="text-xs font-medium text-gray-700">Company Name *</Label>
                  <Input
                    value={form.companyName}
                    onChange={e => setForm({ ...form, companyName: e.target.value })}
                    placeholder="e.g. Acme Corp"
                    className="mt-1 h-9 text-sm"
                    data-testid="input-company-name"
                  />
                </div>
                <div>
                  <Label className="text-xs font-medium text-gray-700">Job Type</Label>
                  <Select value={form.jobType} onValueChange={v => setForm({ ...form, jobType: v })}>
                    <SelectTrigger className="mt-1 h-9 text-sm" data-testid="select-job-type"><SelectValue /></SelectTrigger>
                    <SelectContent>{JOB_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs font-medium text-gray-700">Location</Label>
                  <Input
                    value={form.location}
                    onChange={e => setForm({ ...form, location: e.target.value })}
                    placeholder="Remote / Pune / Bangalore"
                    className="mt-1 h-9 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs font-medium text-gray-700">CTC / Stipend</Label>
                  <Input
                    value={form.ctc}
                    onChange={e => setForm({ ...form, ctc: e.target.value })}
                    placeholder="₹6L–10L / ₹25k/mo"
                    className="mt-1 h-9 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs font-medium text-gray-700">Application Deadline</Label>
                  <Input
                    type="date"
                    value={form.deadline}
                    onChange={e => setForm({ ...form, deadline: e.target.value })}
                    className="mt-1 h-9 text-sm"
                  />
                </div>
              </div>
              <div className="mt-3">
                <Label className="text-xs font-medium text-gray-700">Description</Label>
                <Textarea
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  rows={3}
                  placeholder="Role responsibilities, skills required, perks, key expectations…"
                  className="mt-1 text-sm resize-none"
                />
              </div>
            </div>

            {/* JD Document Upload */}
            <div className="border-t pt-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Job Description Document</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={handleJdFileChange}
              />
              {!jdFile ? (
                jdUrl ? (
                  /* Existing JD already attached — show preview with replace option */
                  <div className="flex items-center gap-3 p-3 rounded-xl border border-emerald-200 bg-emerald-50">
                    <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-emerald-800">JD attached</p>
                      <a href={jdUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] text-emerald-600 underline">View current JD</a>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3 py-1.5 text-xs font-medium text-indigo-700 border border-indigo-200 rounded-lg hover:bg-indigo-50 transition-colors"
                      >
                        Replace
                      </button>
                      <button type="button" onClick={() => setJdUrl("")} className="p-1.5 hover:bg-red-100 rounded-lg text-gray-400 hover:text-red-500">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex items-center gap-3 p-4 rounded-xl border-2 border-dashed border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/40 transition-all text-left"
                >
                  <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                    <Upload className="w-4 h-4 text-gray-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Upload JD / Offer Letter (PDF)</p>
                    <p className="text-xs text-gray-400">Max 10 MB · Shown to students on the drive page</p>
                  </div>
                </button>
                )
              ) : (
                <div className={`flex items-center gap-3 p-3 rounded-xl border ${jdUrl ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}>
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${jdUrl ? "bg-emerald-100" : "bg-amber-100"}`}>
                    {jdUploading
                      ? <Loader2 className="w-4 h-4 animate-spin text-amber-600" />
                      : jdUrl
                        ? <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        : <AlertCircle className="w-4 h-4 text-amber-600" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-800 truncate">{jdFile.name}</p>
                    {jdUploading
                      ? <p className="text-[10px] text-amber-700">Uploading… {jdProgress}%</p>
                      : jdUrl
                        ? <p className="text-[10px] text-emerald-700">Uploaded — students can view this PDF</p>
                        : <p className="text-[10px] text-amber-700">Processing…</p>
                    }
                    {jdUploading && (
                      <div className="w-full h-1 bg-amber-200 rounded-full mt-1">
                        <div className="h-1 bg-amber-500 rounded-full transition-all" style={{ width: `${jdProgress}%` }} />
                      </div>
                    )}
                  </div>
                  {!jdUploading && (
                    <button type="button" onClick={removeJd} className="p-1 hover:bg-red-100 rounded-lg text-gray-400 hover:text-red-500 shrink-0">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Eligibility */}
            <div className="border-t pt-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Eligibility Criteria</p>

              {/* CGPA + marks grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                <div>
                  <Label className="text-xs font-medium text-gray-700">Min CGPA</Label>
                  <Input
                    type="number" min="0" max="10" step="0.1"
                    value={form.minCGPA}
                    onChange={e => setForm({ ...form, minCGPA: e.target.value })}
                    className="mt-1 h-9 text-sm"
                    data-testid="input-min-cgpa"
                    placeholder="0"
                  />
                  <p className="text-[10px] text-gray-400 mt-0.5">0 = no minimum</p>
                </div>
                <div>
                  <Label className="text-xs font-medium text-gray-700">Min 12th %</Label>
                  <Input
                    type="number" min="0" max="100" step="0.1"
                    value={form.min12Pct}
                    onChange={e => setForm({ ...form, min12Pct: e.target.value })}
                    className="mt-1 h-9 text-sm"
                    placeholder="e.g. 60"
                  />
                  <p className="text-[10px] text-gray-400 mt-0.5">Leave blank = any</p>
                </div>
                <div>
                  <Label className="text-xs font-medium text-gray-700">Min 10th %</Label>
                  <Input
                    type="number" min="0" max="100" step="0.1"
                    value={form.min10Pct}
                    onChange={e => setForm({ ...form, min10Pct: e.target.value })}
                    className="mt-1 h-9 text-sm"
                    placeholder="e.g. 60"
                  />
                  <p className="text-[10px] text-gray-400 mt-0.5">Leave blank = any</p>
                </div>
                <div>
                  <Label className="text-xs font-medium text-gray-700">Max Backlogs</Label>
                  <Input
                    type="number" min="0" max="20"
                    value={form.maxBacklogs}
                    onChange={e => setForm({ ...form, maxBacklogs: e.target.value })}
                    className="mt-1 h-9 text-sm"
                    placeholder="e.g. 0"
                  />
                  <p className="text-[10px] text-gray-400 mt-0.5">Leave blank = any</p>
                </div>
              </div>

              <div className="mb-3">
                <Label className="text-xs font-medium text-gray-700 block mb-2">Eligible Branches <span className="text-gray-400 font-normal">(leave empty for all)</span></Label>
                <div className="flex flex-wrap gap-1.5">
                  {COMMON_BRANCHES.map(b => (
                    <button
                      type="button" key={b} onClick={() => toggleBranch(b)}
                      className={`px-2.5 py-1 text-xs rounded-full border transition-colors font-medium ${branches.includes(b) ? "bg-indigo-600 text-white border-indigo-600" : "bg-white border-gray-200 text-gray-600 hover:border-indigo-300"}`}
                      data-testid={`branch-${b}`}
                    >{b}</button>
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-xs font-medium text-gray-700 block mb-2">Eligible Batches <span className="text-gray-400 font-normal">(leave empty for all)</span></Label>
                <div className="flex flex-wrap gap-1.5">
                  {COMMON_BATCHES.map(b => (
                    <button
                      type="button" key={b} onClick={() => toggleBatch(b)}
                      className={`px-2.5 py-1 text-xs rounded-full border transition-colors font-medium ${batches.includes(b) ? "bg-indigo-600 text-white border-indigo-600" : "bg-white border-gray-200 text-gray-600 hover:border-indigo-300"}`}
                      data-testid={`batch-${b}`}
                    >{b}</button>
                  ))}
                </div>
              </div>

              {/* Eligibility summary pill */}
              {(parseFloat(form.minCGPA) > 0 || form.min12Pct || form.min10Pct || form.maxBacklogs !== "") && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {parseFloat(form.minCGPA) > 0 && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs rounded-full font-medium">
                      CGPA ≥ {form.minCGPA}
                    </span>
                  )}
                  {form.min12Pct && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">
                      12th ≥ {form.min12Pct}%
                    </span>
                  )}
                  {form.min10Pct && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-cyan-100 text-cyan-700 text-xs rounded-full font-medium">
                      10th ≥ {form.min10Pct}%
                    </span>
                  )}
                  {form.maxBacklogs !== "" && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full font-medium">
                      Backlogs ≤ {form.maxBacklogs}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* AI Assessment */}
            <div className="border-t pt-4">
              <button
                type="button"
                onClick={() => setShowAssessmentDialog(true)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${
                  assessmentConfig.enabled
                    ? "border-purple-300 bg-purple-50"
                    : "border-dashed border-gray-200 hover:border-purple-200 hover:bg-purple-50/40"
                }`}
                data-testid="checkbox-has-assessment"
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${assessmentConfig.enabled ? "bg-purple-600" : "bg-gray-100"}`}>
                  <Sparkles className={`w-4 h-4 ${assessmentConfig.enabled ? "text-white" : "text-gray-400"}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold ${assessmentConfig.enabled ? "text-purple-900" : "text-gray-700"}`}>
                    AI Screening Assessment
                    {assessmentConfig.enabled && <span className="ml-2 text-xs font-normal text-purple-600">✓ configured</span>}
                  </p>
                  <p className="text-xs text-gray-500">
                    {assessmentConfig.enabled
                      ? `${assessmentConfig.numQuestions} questions · ${assessmentConfig.topics.join(", ")}`
                      : "Click to add an auto-generated MCQ test for applicants"
                    }
                  </p>
                </div>
                {assessmentConfig.enabled && (
                  <button
                    type="button"
                    onClick={e => { e.stopPropagation(); setAssessmentConfig(p => ({ ...p, enabled: false, topics: [] })); }}
                    className="p-1 hover:bg-red-100 rounded-lg text-gray-400 hover:text-red-500"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </button>
            </div>

            <Button
              onClick={submit}
              disabled={submitting || jdUploading}
              className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-sm"
              data-testid="button-submit-drive"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ClipboardList className="w-4 h-4 mr-2" />}
              {isEditMode ? "Update Drive" : "Post Drive"}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* AI Assessment Dialog */}
      {showAssessmentDialog && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-5 h-5 text-purple-600" />
              <h3 className="font-bold text-gray-900">AI Screening Assessment</h3>
            </div>
            <p className="text-xs text-gray-500 mb-5">Set up an auto-generated MCQ test for applicants</p>

            <div className="space-y-4">
              <div>
                <Label className="text-xs font-medium text-gray-700">Topics to cover</Label>
                <div className="flex gap-2 mt-1.5">
                  <Input
                    value={topicInput}
                    onChange={e => setTopicInput(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addTopic())}
                    placeholder="e.g. Data Structures, OOP…"
                    className="h-9 text-sm"
                    data-testid="input-topic"
                  />
                  <Button type="button" onClick={addTopic} variant="outline" size="sm" className="shrink-0 h-9">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                {assessmentConfig.topics.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {assessmentConfig.topics.map(t => (
                      <Badge key={t} className="bg-purple-100 text-purple-700 pl-2.5 pr-1 py-0.5 gap-1 text-xs">
                        {t}
                        <button onClick={() => removeTopic(t)} className="hover:text-purple-900">
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-medium text-gray-700">Number of Questions</Label>
                  <Input
                    type="number" min="5" max="50"
                    value={assessmentConfig.numQuestions}
                    onChange={e => setAssessmentConfig(p => ({ ...p, numQuestions: parseInt(e.target.value) || 15 }))}
                    className="mt-1 h-9 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs font-medium text-gray-700">Duration (minutes)</Label>
                  <Input
                    type="number" min="5" max="180"
                    value={assessmentConfig.duration}
                    onChange={e => setAssessmentConfig(p => ({ ...p, duration: parseInt(e.target.value) || 30 }))}
                    className="mt-1 h-9 text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-5">
              <Button
                onClick={() => {
                  if (assessmentConfig.topics.length === 0) {
                    toast({ title: "Add at least one topic", variant: "destructive" }); return;
                  }
                  setAssessmentConfig(p => ({ ...p, enabled: true }));
                  setShowAssessmentDialog(false);
                }}
                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm h-10 font-semibold"
              >
                <Sparkles className="w-4 h-4 mr-1.5" /> Add Assessment
              </Button>
              <Button
                onClick={() => setShowAssessmentDialog(false)}
                variant="outline"
                className="rounded-xl text-sm h-10"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
