import { useEffect, useState } from "react";
import { useLocation, Link } from "wouter";
import { useLancingAuth } from "@/hooks/use-lancing-auth";
import { auth, firestore } from "@/lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  GraduationCap, Loader2, Plus, ClipboardList, Users, CheckCircle2,
  AlertCircle, LogOut, Briefcase, ExternalLink, FileText, ShieldCheck,
  ChevronDown, ChevronUp, MapPin, IndianRupee, Calendar, Clock, ScanLine, BookOpen,
  Edit, Trash2,
} from "lucide-react";
import SEOHead from "@/components/seo/seo-head";
import { useToast } from "@/hooks/use-toast";
import { displayInstitutionName } from "@/lib/institution-display";

interface Drive {
  id: string; jobTitle: string; companyName: string; jobType: string;
  status: string; applicantCount: number; deadline?: string; createdAt?: string;
  hasAssessment?: boolean; location?: string; ctc?: string; description?: string;
  eligibility?: { minCGPA?: number; branches?: string[]; batches?: string[] };
}

export default function LancingPlacementCellDashboard() {
  const { user, isAuthenticated, role, isLoading: authLoading, logout } = useLancingAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [drives, setDrives] = useState<Drive[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) { setLocation("/lancing/login"); return; }
    if (role && role !== "placement_cell") { setLocation("/lancing/role-select"); return; }
    void loadDrives();
  }, [authLoading, isAuthenticated, role]);

  useEffect(() => {
    // Wait until role is confirmed as placement_cell before checking the Firestore doc.
    // Starting the snapshot while role is still null (loading) causes a premature
    // "document not found" redirect to the setup wizard.
    if (!user?.uid || role !== "placement_cell") return;
    const unsub = onSnapshot(
      doc(firestore, "placement_cells", user.uid),
      (snap) => {
        if (!snap.exists()) { setProfile(null); setLocation("/lancing/placement-cell-profile"); return; }
        setProfile({ id: snap.id, ...snap.data() });
      },
      (e) => toast({ title: "Failed to load profile", description: e.message, variant: "destructive" }),
    );
    return () => unsub();
  }, [user?.uid, role]);

  const loadDrives = async () => {
    setLoading(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) return;
      const dRes = await fetch("/api/placement-cell/drives", { headers: { Authorization: `Bearer ${token}` } });
      const dData = await dRes.json();
      setDrives(dData.drives || []);
    } catch (e: any) {
      toast({ title: "Failed to load drives", description: e.message, variant: "destructive" });
    } finally { setLoading(false); }
  };

  const rawStatus: string = profile?.status || "";
  const isApproved = rawStatus === "approved" || rawStatus === "verified";
  const isPending = rawStatus === "pending" || rawStatus === "pending_verification" || (!isApproved && rawStatus !== "rejected");
  const isRejected = rawStatus === "rejected";

  if (authLoading || loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>;
  }

  const visibleDrives = drives.filter(d => d.status !== "deleted");
  const activeDrives = visibleDrives.filter(d => d.status === "open");
  const totalApplicants = visibleDrives.reduce((s, d) => s + (d.applicantCount || 0), 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 font-sans">
      <SEOHead title="Placement Cell Dashboard" description="Manage your campus drives" />
      <div className="flex flex-col lg:flex-row">

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
            <SidebarLink href="/lancing/pc-assessments" icon={BookOpen}>Assessments</SidebarLink>
            <SidebarLink href="/lancing/placement-cell-dashboard" icon={Briefcase} active>My Drives</SidebarLink>
            <SidebarLink href="/lancing/applicant-hub" icon={Users}>Applicant Hub</SidebarLink>
            <SidebarLink href="/lancing/pc-attendance" icon={ScanLine}>Mark Attendance</SidebarLink>
            <SidebarLink href="/coe-dashboard" icon={ShieldCheck}>SPCR Portal</SidebarLink>
            <SidebarLink href="/lancing/placement-cell-profile" icon={FileText}>Profile</SidebarLink>
          </nav>
          <Button
            onClick={async () => { await logout(); setLocation("/student-lancing"); }}
            variant="ghost"
            className="mt-8 w-full text-slate-400 hover:text-white hover:bg-slate-800 justify-start text-sm"
          >
            <LogOut className="w-4 h-4 mr-2" /> Sign out
          </Button>
        </aside>

        {/* Main */}
        <main className="flex-1 p-6 lg:p-10 min-w-0">

          {isPending && (
            <div className="mb-6 p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold text-amber-900 text-sm">Account pending verification</p>
                <p className="text-xs text-amber-700 mt-0.5">You can set up your profile but cannot post drives until the SPCR admin verifies you.</p>
              </div>
            </div>
          )}
          {isRejected && (
            <div className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-200 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold text-red-900 text-sm">Account not verified</p>
                {profile?.rejection_reason && <p className="text-xs text-red-700 mt-0.5">Reason: {profile.rejection_reason}</p>}
                <p className="text-xs text-red-700 mt-0.5">Contact studentxchange1@gmail.com for support.</p>
              </div>
            </div>
          )}

          {/* Header */}
          <div className="flex items-start justify-between mb-8 flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Welcome back</h1>
                {isApproved && (
                  <Badge className="bg-emerald-100 text-emerald-700 border border-emerald-200 gap-1 px-2 py-0.5 text-xs font-semibold">
                    <CheckCircle2 className="w-3 h-3" /> Verified
                  </Badge>
                )}
              </div>
              <p className="text-sm text-gray-500 mt-1">Manage your campus placement drives</p>
            </div>
            <Button
              onClick={() => setLocation("/lancing/placement-cell-post-drive")}
              disabled={!isApproved}
              title={isApproved ? "" : "Account pending verification"}
              className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl h-10 px-5 text-sm font-semibold shadow-sm disabled:opacity-40"
            >
              <Plus className="w-4 h-4 mr-1.5" /> Post a Drive
            </Button>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <KPI icon={ClipboardList} label="Total Drives" value={drives.length} color="indigo" />
            <KPI icon={Briefcase} label="Active Drives" value={activeDrives.length} color="emerald" />
            <KPI icon={Users} label="Total Applicants" value={totalApplicants} color="violet" />
          </div>

          {/* Drives list */}
          <div>
            <h2 className="text-base font-semibold text-gray-700 uppercase tracking-wider mb-4 flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-indigo-400" /> My Drives
            </h2>
            {drives.length === 0 ? (
              <Card className="border border-gray-200 rounded-2xl shadow-none">
                <CardContent className="p-12 text-center">
                  <ClipboardList className="w-10 h-10 mx-auto text-gray-300 mb-3" />
                  <p className="text-gray-500 text-sm mb-4">No drives yet. Post your first one!</p>
                  <Button onClick={() => setLocation("/lancing/placement-cell-post-drive")} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm">
                    <Plus className="w-4 h-4 mr-1.5" /> Post a Drive
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {visibleDrives.map(d => {
                  const isExpanded = expandedId === d.id;
                  return (
                    <div key={d.id} className="bg-white border border-gray-200 rounded-2xl hover:border-indigo-200 transition-all overflow-hidden">
                      {/* Card header — clickable to expand */}
                      <button
                        className="w-full text-left p-4 flex items-center gap-3"
                        onClick={() => setExpandedId(isExpanded ? null : d.id)}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-gray-900 text-sm">{d.jobTitle}</span>
                            <Badge variant="outline" className="text-xs font-medium">{d.jobType}</Badge>
                            {d.hasAssessment && <Badge className="bg-purple-100 text-purple-700 text-xs">Test</Badge>}
                            <Badge className={
                              d.status === "open"
                                ? "bg-emerald-100 text-emerald-700 text-xs"
                                : "bg-gray-100 text-gray-600 text-xs"
                            }>{d.status}</Badge>
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">{d.companyName}</p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <div className="text-right">
                            <p className="text-xl font-bold text-indigo-600">{d.applicantCount || 0}</p>
                            <p className="text-[10px] text-gray-400 uppercase tracking-wide">applicants</p>
                          </div>
                          {/* Side corner → Applicant Hub */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setLocation(`/lancing/applicant-hub?drive=${d.id}`);
                            }}
                            className="p-1.5 rounded-lg hover:bg-indigo-50 text-gray-400 hover:text-indigo-600 transition-colors"
                            title="View in Applicant Hub"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </button>
                          {isExpanded
                            ? <ChevronUp className="w-4 h-4 text-gray-400" />
                            : <ChevronDown className="w-4 h-4 text-gray-400" />
                          }
                        </div>
                      </button>

                      {/* Expanded details dropdown */}
                      {isExpanded && (
                        <div className="border-t border-gray-100 px-4 pb-4 pt-3 bg-gray-50/60">
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                            {d.location && (
                              <div className="flex items-center gap-1.5 text-xs text-gray-600">
                                <MapPin className="w-3.5 h-3.5 text-indigo-400" /> {d.location}
                              </div>
                            )}
                            {d.ctc && (
                              <div className="flex items-center gap-1.5 text-xs text-gray-600">
                                <IndianRupee className="w-3.5 h-3.5 text-indigo-400" /> {d.ctc}
                              </div>
                            )}
                            {d.deadline && (
                              <div className="flex items-center gap-1.5 text-xs text-gray-600">
                                <Calendar className="w-3.5 h-3.5 text-indigo-400" /> Deadline: {d.deadline}
                              </div>
                            )}
                            {d.createdAt && (
                              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                <Clock className="w-3.5 h-3.5" /> Posted {new Date(d.createdAt).toLocaleDateString("en-IN")}
                              </div>
                            )}
                          </div>
                          {d.description && (
                            <p className="text-xs text-gray-600 mb-3 line-clamp-3">{d.description}</p>
                          )}
                          {d.eligibility && (
                            <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-gray-600 mb-3">
                              {(d.eligibility.minCGPA || 0) > 0 && (
                                <span>Min CGPA: <span className="font-semibold text-gray-800">{d.eligibility.minCGPA}</span></span>
                              )}
                              {(d.eligibility.branches || []).length > 0 && (
                                <span>Branches: <span className="font-semibold text-gray-800">{d.eligibility.branches!.join(", ")}</span></span>
                              )}
                              {(d.eligibility.batches || []).length > 0 && (
                                <span>Batches: <span className="font-semibold text-gray-800">{d.eligibility.batches!.join(", ")}</span></span>
                              )}
                            </div>
                          )}
                          <div className="flex flex-wrap gap-2">
                            <Button
                              size="sm"
                              className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs h-8 px-3"
                              onClick={() => setLocation(`/lancing/applicant-hub?drive=${d.id}`)}
                            >
                              <Users className="w-3.5 h-3.5 mr-1" /> View Applicants
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className={`rounded-xl text-xs h-8 px-3 ${d.status === "open" ? "text-gray-600 border-gray-300 hover:bg-gray-50" : "text-emerald-700 border-emerald-300 hover:bg-emerald-50"}`}
                              onClick={async () => {
                                const newStatus = d.status === "open" ? "closed" : "open";
                                try {
                                  const token = await auth.currentUser?.getIdToken();
                                  const res = await fetch(`/api/placement-cell/drives/${d.id}`, {
                                    method: "PATCH",
                                    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
                                    body: JSON.stringify({ status: newStatus }),
                                  });
                                  if (!res.ok) throw new Error((await res.json()).error || "Failed");
                                  toast({ title: newStatus === "closed" ? "Drive closed — no new applications accepted" : "Drive reopened" });
                                  loadDrives();
                                } catch (err: any) {
                                  toast({ title: "Failed", description: err.message, variant: "destructive" });
                                }
                              }}
                            >
                              {d.status === "open" ? "Close Drive" : "Reopen Drive"}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="rounded-xl text-xs h-8 px-3 text-amber-700 border-amber-300 hover:bg-amber-50"
                              onClick={() => setLocation(`/lancing/placement-cell-post-drive?edit=${d.id}`)}
                            >
                              <Edit className="w-3 h-3 mr-1" /> Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="rounded-xl text-xs h-8 px-3 text-red-600 border-red-200 hover:bg-red-50"
                              onClick={async () => {
                                if (!confirm(`Delete "${d.jobTitle || d.title || "this drive"}"? This cannot be undone.`)) return;
                                try {
                                  const token = await auth.currentUser?.getIdToken();
                                  const res = await fetch(`/api/placement-cell/drives/${d.id}`, {
                                    method: "PATCH",
                                    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
                                    body: JSON.stringify({ status: "deleted" }),
                                  });
                                  if (!res.ok) throw new Error((await res.json()).error || "Failed");
                                  toast({ title: "Drive deleted" });
                                  loadDrives();
                                } catch (err: any) {
                                  toast({ title: "Delete failed", description: err.message, variant: "destructive" });
                                }
                              }}
                            >
                              <Trash2 className="w-3 h-3 mr-1" /> Delete
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

function SidebarLink({ href, icon: Icon, children, active }: any) {
  return (
    <Link href={href}>
      <a className={`flex items-center gap-2.5 px-3 py-2 rounded-xl transition-colors text-sm ${
        active ? "bg-indigo-600/20 text-white font-medium" : "text-slate-400 hover:bg-slate-800 hover:text-white"
      }`}>
        <Icon className="w-4 h-4 shrink-0" /> {children}
      </a>
    </Link>
  );
}

function KPI({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color: string }) {
  const colors: Record<string, string> = {
    indigo: "bg-indigo-50 text-indigo-600",
    emerald: "bg-emerald-50 text-emerald-600",
    violet: "bg-violet-50 text-violet-600",
  };
  const textColors: Record<string, string> = {
    indigo: "text-indigo-700",
    emerald: "text-emerald-700",
    violet: "text-violet-700",
  };
  return (
    <Card className="border border-gray-200 shadow-none rounded-2xl">
      <CardContent className="p-5 flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colors[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className={`text-2xl font-bold tracking-tight ${textColors[color]}`}>{value}</p>
          <p className="text-xs text-gray-500 font-medium">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}
