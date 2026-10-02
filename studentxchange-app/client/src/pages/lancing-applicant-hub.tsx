import { useEffect, useState, useMemo } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { useLancingAuth } from "@/hooks/use-lancing-auth";
import { auth } from "@/lib/firebase";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Loader2, ArrowLeft, Users, CheckCircle2, XCircle, Search, ExternalLink,
  AlertCircle, Download, X, Filter, Save, GraduationCap, Mail, Phone,
  Briefcase, Sparkles,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { displayInstitutionName } from "@/lib/institution-display";
import SEOHead from "@/components/seo/seo-head";

const DOC_LABELS: Record<string, string> = {
  profile_photo: "Profile Photo",
  aadhaar: "Aadhaar Card",
  id_card: "College ID Card",
  marks_10: "10th Marksheet",
  marks_12_or_diploma: "12th / Diploma Marksheet",
  latest_sem_marksheet: "Latest Sem Marksheet",
};

// Normalize various field name variants from career_compass_profile / profileSnapshot
function p(profile: any, ...keys: string[]) {
  if (!profile) return undefined;
  for (const k of keys) {
    if (profile[k] != null && profile[k] !== "") return profile[k];
  }
  return undefined;
}

function getDoc(profile: any, key: string): string | undefined {
  const docs = profile?.documents || {};
  // try alternate document field names
  const map: Record<string, string[]> = {
    profile_photo: ["profile_photo", "profilePhoto"],
    aadhaar: ["aadhaar", "aadhaar_card", "aadhaarCard"],
    id_card: ["id_card", "idCard", "college_id"],
    marks_10: ["marks_10", "marksheet_10th", "marks10"],
    marks_12_or_diploma: ["marks_12_or_diploma", "marksheet_12th_diploma", "marks12"],
    latest_sem_marksheet: ["latest_sem_marksheet", "marksheet_latest_sem", "latestSem"],
  };
  for (const k of (map[key] || [key])) if (docs[k]) return docs[k];
  return undefined;
}

export default function LancingApplicantHub() {
  const { isAuthenticated, role, isLoading: authLoading, user } = useLancingAuth();
  const [, setLocation] = useLocation();
  const search = useSearch();
  const { toast } = useToast();

  const [drives, setDrives] = useState<any[]>([]);
  const [applicants, setApplicants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const initialDrive = new URLSearchParams(search).get("drive") || "";
  const [fDrive, setFDrive] = useState(initialDrive);
  const [fStatus, setFStatus] = useState("");
  const [fGender, setFGender] = useState("");
  const [fBranch, setFBranch] = useState("");
  const [fYear, setFYear] = useState("");
  const [fCgpaMin, setFCgpaMin] = useState("");
  const [fCgpaMax, setFCgpaMax] = useState("");
  const [fScoreMin, setFScoreMin] = useState("");
  const [fScoreMax, setFScoreMax] = useState("");
  const [fSearch, setFSearch] = useState("");
  const [fSkill, setFSkill] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const [selected, setSelected] = useState<any | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) { setLocation("/lancing/login"); return; }
    if (role && role !== "placement_cell") { setLocation("/lancing/role-select"); return; }
    void load();
  }, [authLoading, isAuthenticated, role]);

  const load = async () => {
    setLoading(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch("/api/placement-cell/applicants/all", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setDrives(data.drives || []);
      setApplicants(data.applicants || []);
    } catch (e: any) {
      toast({ title: "Failed to load", description: e.message, variant: "destructive" });
    }
    setLoading(false);
  };

  const setStatus = async (driveId: string, uid: string, status: string) => {
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch(`/api/placement-cell/drives/${driveId}/applicants/${uid}/status`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast({ title: status === "shortlisted" ? "Shortlisted ✓" : status === "rejected" ? "Rejected" : "Updated" });
      setApplicants(prev => prev.map(a =>
        a.uid === uid && a.driveId === driveId ? { ...a, status } : a
      ));
      if (selected?.uid === uid && selected?.driveId === driveId) {
        setSelected({ ...selected, status });
      }
      if (status === "rejected") setRejectingId(null);
    } catch (e: any) {
      toast({ title: "Failed", description: e.message, variant: "destructive" });
    }
  };

  const saveNextStepsNote = async (driveId: string, uid: string, note: string) => {
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch(`/api/placement-cell/drives/${driveId}/applicants/${uid}/next-steps`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ note }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast({ title: "Next steps saved" });
      setApplicants(prev => prev.map(a =>
        a.uid === uid && a.driveId === driveId ? { ...a, nextStepsNote: note } : a
      ));
      if (selected?.uid === uid && selected?.driveId === driveId) {
        setSelected({ ...selected, nextStepsNote: note });
      }
    } catch (e: any) {
      toast({ title: "Failed", description: e.message, variant: "destructive" });
    }
  };

  // Unique branches for filter dropdown
  const uniqueBranches = useMemo(() => {
    const set = new Set<string>();
    applicants.forEach(a => {
      const b = p(a.profile, "branch") || a.branch;
      if (b) set.add(b);
    });
    return Array.from(set).sort();
  }, [applicants]);

  const filtered = useMemo(() => {
    return applicants.filter(a => {
      const pr = a.profile || {};
      const q = fSearch.toLowerCase();

      if (fDrive && a.driveId !== fDrive) return false;
      if (fStatus) {
        if (fStatus === "test_taken") {
          if (a.testStatus !== "completed" && a.testScore == null) return false;
        } else if ((a.status || "applied") !== fStatus) return false;
      }
      if (fGender) {
        const g = String(p(pr, "gender") || "").toLowerCase();
        if (g !== fGender.toLowerCase()) return false;
      }
      if (fBranch) {
        const b = String(p(pr, "branch") || a.branch || "").toLowerCase();
        if (b !== fBranch.toLowerCase()) return false;
      }
      if (fYear) {
        const y = String(p(pr, "yearOfStudy", "year") || a.batch || "");
        if (!y.toLowerCase().includes(fYear.toLowerCase())) return false;
      }
      const cgpa = parseFloat(String(p(pr, "currentCgpa", "cgpa") || a.cgpa || "0")) || 0;
      if (fCgpaMin && cgpa < parseFloat(fCgpaMin)) return false;
      if (fCgpaMax && cgpa > parseFloat(fCgpaMax)) return false;
      const score = a.testPct;
      if (fScoreMin && (score == null || score < parseFloat(fScoreMin))) return false;
      if (fScoreMax && (score == null || score > parseFloat(fScoreMax))) return false;
      if (q) {
        const name = String(p(pr, "fullName") || a.name || "").toLowerCase();
        const email = String(a.email || "").toLowerCase();
        const branch = String(p(pr, "branch") || a.branch || "").toLowerCase();
        if (!name.includes(q) && !email.includes(q) && !branch.includes(q)) return false;
      }
      if (fSkill) {
        const skills: string[] = p(pr, "skillsKnown", "knownSkills") || a.skillsKnown || [];
        if (!skills.some((s: string) => s.toLowerCase().includes(fSkill.toLowerCase()))) return false;
      }
      return true;
    });
  }, [applicants, fDrive, fStatus, fGender, fBranch, fYear, fCgpaMin, fCgpaMax,
      fScoreMin, fScoreMax, fSearch, fSkill]);

  const clearFilters = () => {
    setFDrive(""); setFStatus(""); setFGender(""); setFBranch("");
    setFYear(""); setFCgpaMin(""); setFCgpaMax("");
    setFScoreMin(""); setFScoreMax(""); setFSearch(""); setFSkill("");
  };

  const hasFilters = fDrive || fStatus || fGender || fBranch || fYear || fCgpaMin || fCgpaMax
    || fScoreMin || fScoreMax || fSkill || fSearch;

  const exportXLSX = async () => {
    try {
      const mod: any = await import("xlsx");
      const XLSX = mod.default || mod;
      const driveName = fDrive
        ? (drives.find(d => d.id === fDrive)?.jobTitle || "Drive")
        : "AllDrives";
      const dateStr = new Date().toISOString().slice(0, 10);
      const headers = [
        "Full Name","Email","Phone","Gender","Branch","Year of Study","University",
        "CGPA","10th Marks %","12th/Diploma %","URN","Division","LinkedIn","GitHub",
        "Known Skills","Certifications","Drive Name","Applied At","Status",
        "Test Status","Test Score (%)","Violations Count",
      ];
      const rows = filtered.map(a => {
        const pr = a.profile || {};
        return [
          p(pr, "fullName") || a.name || "",
          a.email || "",
          p(pr, "phone") || a.phone || "",
          p(pr, "gender") || "",
          p(pr, "branch") || a.branch || "",
          p(pr, "yearOfStudy", "year") || "",
          p(pr, "universityName", "university") || "",
          String(p(pr, "currentCgpa", "cgpa") ?? a.cgpa ?? ""),
          String(p(pr, "pct10", "marks10") ?? ""),
          pr.prevType === "diploma"
            ? String(p(pr, "diplomaPct") ?? "")
            : String(p(pr, "pct12", "marks12") ?? ""),
          p(pr, "urn") || "",
          p(pr, "division") || "",
          p(pr, "linkedin") || "",
          p(pr, "github") || "",
          (p(pr, "skillsKnown", "knownSkills") || a.skillsKnown || []).join(", "),
          (p(pr, "certifications") || []).join("; "),
          a.driveTitle || "",
          a.appliedAt
            ? new Date(a.appliedAt).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
            : "",
          a.status || "applied",
          a.testStatus === "completed" ? "Completed" : a.testStatus === "not_started" ? "Not started" : (a.testScore != null ? "Completed" : "—"),
          a.testPct != null ? String(a.testPct) : "",
          a.violations ? String(a.violations.length) : "0",
        ];
      });
      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Applicants");
      XLSX.writeFile(wb, `Applicants_${driveName.replace(/\s+/g, "_")}_${dateStr}.xlsx`);
    } catch (e: any) {
      toast({ title: "Export failed", description: e.message, variant: "destructive" });
    }
  };

  const kTotal = applicants.length;
  const kShortlisted = applicants.filter(a => a.status === "shortlisted").length;
  const kTestTaken = applicants.filter(a => a.testStatus === "completed" || a.testScore != null).length;
  const kRejected = applicants.filter(a => a.status === "rejected").length;

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 bg-gray-200 animate-pulse rounded-xl" />
            <div className="w-48 h-6 bg-gray-200 animate-pulse rounded-lg" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {Array.from({ length: 4 }).map((_, i) => <div key={i} className="bg-gray-200 animate-pulse rounded-2xl h-20" />)}
          </div>
          <div className="bg-white border border-gray-200 rounded-2xl p-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="border-b border-gray-100 last:border-0 py-3 px-2 flex items-center gap-3">
                <div className="w-8 h-8 bg-gray-200 animate-pulse rounded-full" />
                <div className="flex-1 h-4 bg-gray-200 animate-pulse rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <SEOHead title="Applicant Hub" description="All applicants across your drives" />
      <div className="max-w-7xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Link href="/lancing/placement-cell-dashboard">
              <button className="p-2 rounded-xl hover:bg-white border border-gray-200 text-gray-500">
                <ArrowLeft className="w-4 h-4" />
              </button>
            </Link>
            <div>
              <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-600" /> Applicant Hub
              </h1>
              <p className="text-xs text-gray-500">All applicants across your campus drives</p>
            </div>
          </div>
          <Button onClick={exportXLSX} variant="outline" size="sm" className="rounded-xl text-xs h-9 gap-1.5">
            <Download className="w-3.5 h-3.5" /> Export to Excel
          </Button>
        </div>

        {/* KPI Tiles */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          <KPI label="Total Applicants" value={kTotal} color="indigo" />
          <KPI label="Shortlisted" value={kShortlisted} color="emerald" />
          <KPI label="Test Taken" value={kTestTaken} color="purple" />
          <KPI label="Rejected" value={kRejected} color="red" />
        </div>

        {/* Filters */}
        <div className="bg-white border border-gray-200 rounded-2xl p-4 mb-5">
          <div className="flex flex-wrap gap-2 mb-2">
            <div className="relative flex-1 min-w-48">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:border-indigo-400 bg-gray-50"
                placeholder="Search name, email, branch…"
                value={fSearch} onChange={e => setFSearch(e.target.value)}
              />
            </div>
            <select value={fDrive} onChange={e => setFDrive(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-2 text-xs bg-gray-50 focus:outline-none focus:border-indigo-400">
              <option value="">All Drives</option>
              {drives.map(d => <option key={d.id} value={d.id}>{d.jobTitle} — {d.companyName}</option>)}
            </select>
            <select value={fStatus} onChange={e => setFStatus(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-2 text-xs bg-gray-50 focus:outline-none focus:border-indigo-400">
              <option value="">All Statuses</option>
              <option value="applied">Applied</option>
              <option value="test_taken">Test Taken</option>
              <option value="shortlisted">Shortlisted</option>
              <option value="rejected">Rejected</option>
            </select>
            <button
              onClick={() => setShowFilters(f => !f)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-medium ${showFilters ? "bg-indigo-600 text-white border-indigo-600" : "border-gray-200 text-gray-600 hover:border-indigo-300 bg-gray-50"}`}
            >
              <Filter className="w-3.5 h-3.5" /> Filters
            </button>
            {hasFilters && (
              <button onClick={clearFilters} className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs text-red-600 hover:bg-red-50 border border-red-200 font-medium">
                <X className="w-3.5 h-3.5" /> Clear all
              </button>
            )}
          </div>

          {showFilters && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 border-t border-gray-100">
              <FilterField label="Gender">
                <select value={fGender} onChange={e => setFGender(e.target.value)} className="filter-input">
                  <option value="">All Genders</option><option value="Female">Female</option><option value="Male">Male</option><option value="Other">Other</option>
                </select>
              </FilterField>
              <FilterField label="Branch">
                <select value={fBranch} onChange={e => setFBranch(e.target.value)} className="filter-input">
                  <option value="">All</option>
                  {uniqueBranches.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </FilterField>
              <FilterField label="Year of Study">
                <select value={fYear} onChange={e => setFYear(e.target.value)} className="filter-input">
                  <option value="">All Years</option><option value="1st">1st Year</option><option value="2nd">2nd Year</option><option value="3rd">3rd Year</option><option value="Final">Final Year</option>
                </select>
              </FilterField>
              <FilterField label="Skill">
                <input value={fSkill} onChange={e => setFSkill(e.target.value)} placeholder="e.g. React" className="filter-input" />
              </FilterField>
              <FilterField label="CGPA Min">
                <input type="number" step="0.1" min="0" max="10" value={fCgpaMin} onChange={e => setFCgpaMin(e.target.value)} placeholder="0.0" className="filter-input" />
              </FilterField>
              <FilterField label="CGPA Max">
                <input type="number" step="0.1" min="0" max="10" value={fCgpaMax} onChange={e => setFCgpaMax(e.target.value)} placeholder="10.0" className="filter-input" />
              </FilterField>
              <FilterField label="Test Score Min %">
                <input type="number" min="0" max="100" value={fScoreMin} onChange={e => setFScoreMin(e.target.value)} placeholder="0" className="filter-input" />
              </FilterField>
              <FilterField label="Test Score Max %">
                <input type="number" min="0" max="100" value={fScoreMax} onChange={e => setFScoreMax(e.target.value)} placeholder="100" className="filter-input" />
              </FilterField>
            </div>
          )}
        </div>

        {/* Table */}
        {drives.length === 0 ? (
          <Card className="border border-gray-200 rounded-2xl shadow-none">
            <CardContent className="p-12 text-center">
              <GraduationCap className="w-10 h-10 mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500 text-sm mb-3">No drives posted yet.</p>
              <Button onClick={() => setLocation("/lancing/placement-cell-post-drive")} className="bg-indigo-600 text-white rounded-xl text-sm">Post a Drive</Button>
            </CardContent>
          </Card>
        ) : applicants.length === 0 ? (
          <Card className="border border-gray-200 rounded-2xl shadow-none">
            <CardContent className="p-12 text-center">
              <Users className="w-10 h-10 mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500 text-sm">No applicants yet across your drives.</p>
            </CardContent>
          </Card>
        ) : filtered.length === 0 ? (
          <Card className="border border-gray-200 rounded-2xl shadow-none">
            <CardContent className="p-12 text-center">
              <Search className="w-9 h-9 mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500 text-sm">No applicants match your filters.</p>
              <button onClick={clearFilters} className="text-indigo-600 text-xs mt-2 hover:underline">Clear filters</button>
            </CardContent>
          </Card>
        ) : (
          <>
            <p className="text-xs text-gray-400 mb-2 font-medium">
              Showing {filtered.length} of {applicants.length} applicant{applicants.length !== 1 ? "s" : ""}
            </p>
            <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-gray-200 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                    <tr>
                      <th className="px-3 py-3 text-left w-12"></th>
                      <th className="px-3 py-3 text-left">Name</th>
                      <th className="px-3 py-3 text-left">Drive</th>
                      <th className="px-3 py-3 text-left">Branch</th>
                      <th className="px-3 py-3 text-left">Year</th>
                      <th className="px-3 py-3 text-center">CGPA</th>
                      <th className="px-3 py-3 text-center">10th %</th>
                      <th className="px-3 py-3 text-center">12th/Dip %</th>
                      <th className="px-3 py-3 text-left">Skills</th>
                      <th className="px-3 py-3 text-center">Test Score</th>
                      <th className="px-3 py-3 text-left">Status</th>
                      <th className="px-3 py-3 text-center">Actions</th>
                      <th className="px-3 py-3 text-center">Profile</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(a => {
                      const pr = a.profile || {};
                      const rejectKey = `${a.driveId}_${a.uid}`;
                      const isRejecting = rejectingId === rejectKey;
                      const name = p(pr, "fullName") || a.name || "Student";
                      const gender = p(pr, "gender");
                      const branch = p(pr, "branch") || a.branch || "—";
                      const year = p(pr, "yearOfStudy", "year") || "—";
                      const cgpa = p(pr, "currentCgpa", "cgpa") ?? a.cgpa;
                      const m10 = p(pr, "pct10", "marks10");
                      const m12 = pr.prevType === "diploma" ? p(pr, "diplomaPct") : p(pr, "pct12", "marks12");
                      const skills: string[] = p(pr, "skillsKnown", "knownSkills") || a.skillsKnown || [];
                      const photo = getDoc(pr, "profile_photo");
                      const status = a.status || "applied";

                      return (
                        <tr key={`${a.driveId}-${a.uid}`} className="border-b border-gray-100 hover:bg-indigo-50/30 transition-colors">
                          <td className="px-3 py-3">
                            {photo ? (
                              <img src={photo} alt={name} className="w-8 h-8 rounded-full object-cover border border-gray-200" />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs">
                                {name.charAt(0).toUpperCase()}
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-3 max-w-44">
                            <p className="font-semibold text-gray-900 text-xs truncate">{name}</p>
                            <p className="text-[10px] text-gray-400 truncate">{gender || ""}{gender && a.email ? " · " : ""}{a.email}</p>
                          </td>
                          <td className="px-3 py-3 text-xs text-indigo-600 font-medium max-w-32 truncate">{a.driveTitle}</td>
                          <td className="px-3 py-3 text-xs text-gray-700">{branch}</td>
                          <td className="px-3 py-3 text-xs text-gray-700">{year}</td>
                          <td className="px-3 py-3 text-xs text-gray-700 text-center font-mono">{cgpa ?? "—"}</td>
                          <td className="px-3 py-3 text-xs text-gray-700 text-center font-mono">{m10 != null ? `${m10}%` : "—"}</td>
                          <td className="px-3 py-3 text-xs text-gray-700 text-center font-mono">{m12 != null ? `${m12}%` : "—"}</td>
                          <td className="px-3 py-3 max-w-40">
                            {skills.length === 0 ? <span className="text-gray-300 text-xs">—</span> : (
                              <div className="flex flex-wrap gap-1">
                                {skills.slice(0, 3).map(s => (
                                  <span key={s} className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 rounded text-[10px] font-medium">{s}</span>
                                ))}
                                {skills.length > 3 && <span className="text-[10px] text-gray-400">+{skills.length - 3}</span>}
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-3 text-xs text-center font-mono">
                            {a.testPct != null ? <span className="text-purple-700 font-semibold">{a.testPct}%</span> : <span className="text-gray-300">—</span>}
                          </td>
                          <td className="px-3 py-3"><StatusBadge status={status} testStatus={a.testStatus} testScore={a.testScore} /></td>
                          <td className="px-3 py-3">
                            <div className="flex gap-1 justify-center">
                              {isRejecting ? (
                                <>
                                  <span className="text-[10px] text-red-600 font-medium leading-none self-center">Reject?</span>
                                  <button onClick={() => setStatus(a.driveId, a.uid, "rejected")} className="text-[10px] text-white bg-red-500 hover:bg-red-600 px-1.5 py-0.5 rounded font-semibold">Yes</button>
                                  <button onClick={() => setRejectingId(null)} className="text-[10px] text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded">No</button>
                                </>
                              ) : (
                                <>
                                  {status !== "shortlisted" && (
                                    <button onClick={() => setStatus(a.driveId, a.uid, "shortlisted")} title="Shortlist" className="p-1 rounded-md text-emerald-600 hover:bg-emerald-50 border border-emerald-200">
                                      <CheckCircle2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                  {status !== "rejected" && (
                                    <button onClick={() => setRejectingId(rejectKey)} title="Reject" className="p-1 rounded-md text-red-500 hover:bg-red-50 border border-red-200">
                                      <XCircle className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                  {status === "rejected" && (
                                    <button onClick={() => setStatus(a.driveId, a.uid, "applied")} title="Unreject" className="p-1 rounded-md text-gray-600 hover:bg-gray-100 border border-gray-200 text-[10px] px-2">
                                      Unreject
                                    </button>
                                  )}
                                </>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-3 text-center">
                            <button onClick={() => setSelected(a)} title="View profile" className="p-1 rounded-md text-indigo-600 hover:bg-indigo-50 border border-indigo-200">
                              <ExternalLink className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>

      {selected && (
        <ProfileSlideOver
          applicant={selected}
          onClose={() => setSelected(null)}
          onStatus={(s) => setStatus(selected.driveId, selected.uid, s)}
          onSaveNote={(n) => saveNextStepsNote(selected.driveId, selected.uid, n)}
        />
      )}

      <style>{`
        .filter-input {
          width: 100%;
          border: 1px solid #e5e7eb;
          border-radius: 0.5rem;
          padding: 0.375rem 0.5rem;
          font-size: 0.75rem;
          background-color: #f9fafb;
          outline: none;
        }
        .filter-input:focus { border-color: #818cf8; }
      `}</style>
    </div>
  );
}

function FilterField({ label, children }: { label: string; children: any }) {
  return (
    <div>
      <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">{label}</label>
      {children}
    </div>
  );
}

function KPI({ label, value, color }: { label: string; value: number; color: string }) {
  const colors: Record<string, string> = {
    indigo: "text-indigo-700",
    emerald: "text-emerald-700",
    purple: "text-purple-700",
    red: "text-red-600",
  };
  return (
    <Card className="border border-gray-200 shadow-none rounded-2xl">
      <CardContent className="p-4 text-center">
        <p className={`text-2xl font-bold tracking-tight ${colors[color]}`}>{value}</p>
        <p className="text-xs text-gray-500 mt-0.5 font-medium">{label}</p>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status, testStatus, testScore }: { status: string; testStatus?: string; testScore?: any }) {
  // If a test was taken, show "Test Taken" amber badge when status is still "applied"
  if (status === "applied" && (testStatus === "completed" || testScore != null)) {
    return <Badge className="bg-amber-100 text-amber-700 text-xs">⏵ Test Taken</Badge>;
  }
  const m: Record<string, { cls: string; label: string }> = {
    applied: { cls: "bg-blue-100 text-blue-700", label: "Applied" },
    shortlisted: { cls: "bg-emerald-100 text-emerald-700", label: "✓ Shortlisted" },
    rejected: { cls: "bg-red-100 text-red-700", label: "✗ Rejected" },
    hired: { cls: "bg-violet-100 text-violet-700", label: "Hired" },
  };
  const item = m[status] || m.applied;
  return <Badge className={`text-xs ${item.cls}`}>{item.label}</Badge>;
}

function ProfileSlideOver({ applicant: a, onClose, onStatus, onSaveNote }: {
  applicant: any; onClose: () => void; onStatus: (s: string) => void; onSaveNote: (n: string) => void;
}) {
  const pr = a.profile || {};
  const name = p(pr, "fullName") || a.name || "Student";
  const skills: string[] = p(pr, "skillsKnown", "knownSkills") || a.skillsKnown || [];
  const certs: string[] = p(pr, "certifications") || [];
  const [note, setNote] = useState<string>(a.nextStepsNote || "");
  const [savingNote, setSavingNote] = useState(false);

  const handleSaveNote = async () => {
    setSavingNote(true);
    await onSaveNote(note);
    setSavingNote(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/40" onClick={onClose} />
      <div className="w-full max-w-md bg-white h-full overflow-y-auto shadow-2xl">
        <div className="sticky top-0 bg-white p-5 border-b border-gray-100 flex items-center justify-between z-10">
          <h3 className="font-bold text-gray-900 text-base">Student Profile</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-5">

          {/* A — Identity */}
          <div>
            <div className="flex items-center gap-3 mb-3">
              {getDoc(pr, "profile_photo") ? (
                <img src={getDoc(pr, "profile_photo")} alt={name} className="w-20 h-20 rounded-2xl object-cover border border-gray-200" />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-2xl">{name.charAt(0).toUpperCase()}</div>
              )}
              <div className="min-w-0">
                <p className="font-bold text-gray-900">{name}</p>
                {a.email && <p className="text-xs text-gray-500 flex items-center gap-1 truncate"><Mail className="w-3 h-3" />{a.email}</p>}
                {p(pr, "phone") && <p className="text-xs text-gray-500 flex items-center gap-1"><Phone className="w-3 h-3" />{p(pr, "phone")}</p>}
                <div className="mt-1.5"><StatusBadge status={a.status || "applied"} testStatus={a.testStatus} testScore={a.testScore} /></div>
              </div>
            </div>
            <ProfileGrid items={[
              { label: "Gender", value: p(pr, "gender") },
              { label: "Date of Birth", value: p(pr, "dob") },
              { label: "State", value: p(pr, "state") },
              { label: "City", value: p(pr, "city") },
            ]} />
            {p(pr, "address") && <p className="text-xs text-gray-600 mt-2 bg-gray-50 rounded-xl p-2">{p(pr, "address")}</p>}
          </div>

          {/* B — Academic */}
          <Section title="Academic">
            <ProfileGrid items={[
              { label: "University", value: p(pr, "universityName", "university") ? displayInstitutionName(p(pr, "universityName", "university")) : null },
              { label: "Degree", value: p(pr, "degree") },
              { label: "Branch", value: p(pr, "branch") || a.branch },
              { label: "Year", value: p(pr, "yearOfStudy", "year") },
              { label: "URN", value: p(pr, "urn") },
              { label: "Division", value: p(pr, "division") },
              { label: "Admission Year", value: p(pr, "admissionYear") },
              { label: "CGPA", value: p(pr, "currentCgpa", "cgpa") != null ? String(p(pr, "currentCgpa", "cgpa")) : null },
              { label: "10th Board", value: p(pr, "board10") },
              { label: "10th Marks", value: p(pr, "pct10", "marks10") != null ? `${p(pr, "pct10", "marks10")}%` : null },
              { label: pr.prevType === "diploma" ? "Diploma Stream" : "12th Board", value: pr.prevType === "diploma" ? p(pr, "diplomaStream") : p(pr, "board12") },
              { label: pr.prevType === "diploma" ? "Diploma %" : "12th Marks", value: pr.prevType === "diploma" ? (p(pr, "diplomaPct") != null ? `${p(pr, "diplomaPct")}%` : null) : (p(pr, "pct12", "marks12") != null ? `${p(pr, "pct12", "marks12")}%` : null) },
            ]} />
          </Section>

          {/* C — Documents */}
          <Section title="Documents">
            <div className="space-y-2">
              {Object.entries(DOC_LABELS).map(([key, label]) => {
                const url = getDoc(pr, key);
                return (
                  <div key={key} className="flex items-center justify-between py-1">
                    <span className="text-xs text-gray-600">{label}</span>
                    {url ? (
                      <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-600 hover:underline font-medium flex items-center gap-1">
                        <ExternalLink className="w-3 h-3" /> View
                      </a>
                    ) : (
                      <span className="text-xs text-gray-400 italic">Not uploaded</span>
                    )}
                  </div>
                );
              })}
            </div>
          </Section>

          {/* D — Career */}
          <Section title="Career">
            {skills.length > 0 && (
              <div className="mb-3">
                <p className="text-[10px] text-gray-400 font-medium uppercase mb-1">Skills</p>
                <div className="flex flex-wrap gap-1.5">
                  {skills.map(s => <span key={s} className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full text-xs font-medium">{s}</span>)}
                </div>
              </div>
            )}
            {certs.length > 0 && (
              <div className="mb-3">
                <p className="text-[10px] text-gray-400 font-medium uppercase mb-1">Certifications</p>
                <ul className="text-xs text-gray-700 list-disc list-inside space-y-0.5">{certs.map(c => <li key={c}>{c}</li>)}</ul>
              </div>
            )}
            {p(pr, "linkedin") && <a href={p(pr, "linkedin")} target="_blank" rel="noopener noreferrer" className="block text-xs text-indigo-600 hover:underline">LinkedIn →</a>}
            {p(pr, "github") && <a href={p(pr, "github")} target="_blank" rel="noopener noreferrer" className="block text-xs text-indigo-600 hover:underline mt-1">GitHub →</a>}
          </Section>

          {/* E — This Drive */}
          <Section title={`This Drive — ${a.driveTitle || ""}`}>
            <ProfileGrid items={[
              { label: "Status", value: a.status || "applied" },
              { label: "Test Status", value: a.testStatus === "completed" ? "Completed" : a.testStatus === "not_started" ? "Not started" : (a.testScore != null ? "Completed" : "—") },
              { label: "Test Score", value: a.testPct != null ? `${a.testPct}% (${a.testScore}/${a.testTotal})` : null },
              { label: "Violations", value: a.violations ? String(a.violations.length) : "0" },
              { label: "Applied At", value: a.appliedAt ? new Date(a.appliedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : null },
            ]} />
          </Section>

          {/* F — Next Steps Note */}
          <Section title="Next Steps note (visible to student)">
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={4}
              placeholder='e.g. "Report to Room 204 at 10 AM on 28 May for the interview round."'
              className="text-xs resize-none"
            />
            <p className="text-[10px] text-gray-400 mt-1">Shown to the student in their My Applications card when shortlisted.</p>
            <Button onClick={handleSaveNote} disabled={savingNote || note === (a.nextStepsNote || "")} className="mt-2 w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs h-8">
              {savingNote ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Save className="w-3 h-3 mr-1" />}
              Save Note
            </Button>
          </Section>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-2 pt-3 border-t border-gray-100">
            {a.status !== "shortlisted" && (
              <Button onClick={() => onStatus("shortlisted")} size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs h-9">
                <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Shortlist
              </Button>
            )}
            {a.status !== "rejected" && (
              <Button onClick={() => onStatus("rejected")} size="sm" variant="outline" className="text-red-600 border-red-200 rounded-xl text-xs h-9">
                <XCircle className="w-3.5 h-3.5 mr-1" /> Reject
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: any }) {
  return (
    <div className="border-t pt-4">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{title}</p>
      {children}
    </div>
  );
}

function ProfileGrid({ items }: { items: { label: string; value?: any }[] }) {
  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-2">
      {items.filter(i => i.value != null && i.value !== "").map(({ label, value }) => (
        <div key={label}>
          <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">{label}</p>
          <p className="text-xs text-gray-800 font-medium">{value}</p>
        </div>
      ))}
    </div>
  );
}
