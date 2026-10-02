import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { useLancingAuth } from "@/hooks/use-lancing-auth";
import { auth } from "@/lib/firebase";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Loader2, ArrowLeft, GraduationCap, ExternalLink, AlertCircle,
  Briefcase, Zap, Target, CheckCircle2, Clock, XCircle, Mail, Send, Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import SEOHead from "@/components/seo/seo-head";
import { displayInstitutionName } from "@/lib/institution-display";

type Tab = "campus-drives" | "jobs" | "internships";

const TABS: { id: Tab; label: string; icon: any }[] = [
  { id: "campus-drives", label: "Campus Drives", icon: GraduationCap },
  { id: "jobs", label: "Jobs", icon: Briefcase },
  { id: "internships", label: "Internships", icon: Target },
];

function formatAppliedDate(v: any): string {
  if (!v) return "";
  try {
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  } catch { return ""; }
}

export default function LancingMyApplications() {
  const { user, isAuthenticated, isLoading: authLoading } = useLancingAuth();
  const [, setLocation] = useLocation();
  const [apps, setApps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("campus-drives");

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) { setLocation("/lancing/login"); return; }
    void load();
  }, [authLoading, isAuthenticated]);

  const load = async () => {
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch("/api/placement-cell/my-applications", { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setApps(data.applications || []);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-violet-50 py-10 px-4">
      <SEOHead title="My Applications" description="Your applications on StudentLancing" />
      <div className="max-w-4xl mx-auto">
        <Link href="/lancing/freelancer-dashboard"><a className="inline-flex items-center text-indigo-600 mb-6 hover:text-indigo-700"><ArrowLeft className="w-4 h-4 mr-1" /> Back</a></Link>
        <h1 className="text-3xl font-bold mb-2">My Applications</h1>
        <p className="text-gray-600 mb-6">Track your campus drive, job, and internship applications.</p>

        {/* Tabs */}
        <div className="flex gap-1 bg-white border border-gray-200 p-1 rounded-2xl shadow-sm mb-6 w-fit flex-wrap">
          {TABS.map(t => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                  activeTab === t.id
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-gray-500 hover:bg-gray-100 hover:text-gray-800"
                }`}
              >
                <Icon className="w-4 h-4" />
                {t.label}
                {t.id === "campus-drives" && apps.length > 0 && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${activeTab === t.id ? "bg-white/20 text-white" : "bg-indigo-100 text-indigo-700"}`}>
                    {apps.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Campus Drives Tab */}
        {activeTab === "campus-drives" && (
          apps.length === 0 ? (
            <Card className="border-2 border-indigo-100 rounded-3xl">
              <CardContent className="p-12 text-center">
                <GraduationCap className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500 mb-4">You haven't applied to any campus drives yet.</p>
                <Button onClick={() => setLocation("/lancing/campus-drives")} className="bg-indigo-600 text-white rounded-xl">Browse Drives</Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {apps.map(a => <DriveAppCard key={`${a.driveId}-${a.id}`} a={a} userEmail={user?.email || ""} />)}
            </div>
          )
        )}

        {/* Jobs/Internships stubs */}
        {activeTab === "jobs" && (
          <Card className="border-2 border-indigo-100 rounded-3xl">
            <CardContent className="p-12 text-center">
              <Briefcase className="w-12 h-12 mx-auto text-gray-300 mb-3" />
              <p className="text-gray-700 font-semibold mb-1">Jobs application tracking coming soon</p>
              <p className="text-gray-500 text-sm mb-4">When you apply to listed jobs, they'll appear here.</p>
              <Button onClick={() => setLocation("/lancing/freelancer-dashboard")} variant="outline" className="rounded-xl">Browse Jobs</Button>
            </CardContent>
          </Card>
        )}
        {activeTab === "internships" && (
          <Card className="border-2 border-indigo-100 rounded-3xl">
            <CardContent className="p-12 text-center">
              <Target className="w-12 h-12 mx-auto text-gray-300 mb-3" />
              <p className="text-gray-700 font-semibold mb-1">Internship application tracking coming soon</p>
              <p className="text-gray-500 text-sm mb-4">When you apply to internships, they'll appear here.</p>
              <Button onClick={() => setLocation("/lancing/internships")} variant="outline" className="rounded-xl">Browse Internships</Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function DriveAppCard({ a, userEmail }: { a: any; userEmail: string }) {
  const status = a.status || "applied";
  const isRejected = status === "rejected";
  const isShortlisted = status === "shortlisted";
  const needsTest = a.hasAssessment && a.status === "applied" && a.testScore == null;
  const testCompleted = a.testStatus === "completed" || a.testScore != null;
  const appliedDate = formatAppliedDate(a.appliedAt);

  return (
    <Card className={`border-2 border-indigo-100 rounded-2xl transition-opacity ${isRejected ? "opacity-70" : ""}`}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h3 className={`font-bold ${isRejected ? "line-through decoration-red-300" : ""}`}>{a.driveTitle}</h3>
              <StatusBadge status={status} />
            </div>
            <p className={`text-sm text-gray-700 ${isRejected ? "line-through decoration-red-300" : ""}`}>
              {a.companyName}{a.companyName && a.collegeName ? " · " : ""}{a.collegeName && <span className="text-gray-500">via {displayInstitutionName(a.collegeName)}</span>}
            </p>
            {appliedDate && <p className="text-xs text-gray-400 mt-0.5">Applied on {appliedDate}</p>}

            {/* Assessment status */}
            {a.hasAssessment && (
              <p className={`text-xs mt-1 ${testCompleted ? "text-emerald-600 font-medium" : "text-gray-500"}`}>
                {testCompleted
                  ? `Assessment Completed — Score: ${a.testPct != null ? `${a.testPct}%` : `${a.testScore}/${a.testTotal}`}`
                  : "Assessment Pending"
                }
              </p>
            )}
          </div>
          <div className="flex gap-2 flex-wrap">
            {needsTest && (
              <Link href={`/lancing/drive/${a.driveId}/test`}>
                <Button className="bg-purple-600 hover:bg-purple-700 text-white"><AlertCircle className="w-4 h-4 mr-1" /> Take Test</Button>
              </Link>
            )}
            <Link href={`/lancing/drive/${a.driveId}`}>
              <Button variant="outline" size="sm"><ExternalLink className="w-4 h-4 mr-1" /> View</Button>
            </Link>
          </div>
        </div>

        {/* Shortlisted — Next Steps section */}
        {isShortlisted && (
          <div className="mt-4 p-4 rounded-2xl bg-emerald-50 border border-emerald-200">
            <p className="font-bold text-emerald-700 flex items-center gap-1.5 mb-2 text-sm">
              <Sparkles className="w-4 h-4" /> Next Steps
            </p>
            <p className="text-sm text-emerald-900 whitespace-pre-wrap">
              {a.nextStepsNote && a.nextStepsNote.trim().length > 0
                ? a.nextStepsNote
                : "The placement cell will contact you shortly with further details."}
            </p>
            <p className="text-xs text-emerald-700 mt-2 flex items-center gap-1.5">
              <Mail className="w-3 h-3" /> Your email <strong>{userEmail}</strong> has been shared with the placement cell.
            </p>
            <a href={`mailto:?subject=Regarding ${a.driveTitle} application`} className="inline-flex items-center gap-1 mt-2 text-xs text-emerald-700 hover:text-emerald-900 font-medium hover:underline">
              <Send className="w-3 h-3" /> Message Placement Cell
            </a>
          </div>
        )}

        {/* Rejected */}
        {isRejected && (
          <div className="mt-3 p-3 rounded-xl bg-red-50 border border-red-100">
            <p className="text-sm text-red-700">You were not selected for this drive. Keep building your skills — more drives will be posted soon.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "shortlisted") return <Badge className="bg-emerald-100 text-emerald-700"><CheckCircle2 className="w-3 h-3 mr-1" /> Shortlisted</Badge>;
  if (status === "rejected") return <Badge className="bg-red-100 text-red-700"><XCircle className="w-3 h-3 mr-1" /> Not Selected</Badge>;
  if (status === "hired") return <Badge className="bg-violet-100 text-violet-700">Hired</Badge>;
  return <Badge className="bg-amber-100 text-amber-700"><Clock className="w-3 h-3 mr-1" /> Approval Pending</Badge>;
}
