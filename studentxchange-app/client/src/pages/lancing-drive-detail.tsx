import { useEffect, useState } from "react";
import { useParams, Link, useLocation } from "wouter";
import { useLancingAuth } from "@/hooks/use-lancing-auth";
import { auth, firestore } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowLeft, MapPin, IndianRupee, Calendar, Briefcase, GraduationCap, CheckCircle2, AlertCircle, FileText, Download, ExternalLink, XCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import SEOHead from "@/components/seo/seo-head";
import { useToast } from "@/hooks/use-toast";
import { displayInstitutionName } from "@/lib/institution-display";

export default function LancingDriveDetail() {
  const { driveId } = useParams<{ driveId: string }>();
  const { user, isAuthenticated, isLoading: authLoading } = useLancingAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [drive, setDrive] = useState<any>(null);
  const [alreadyApplied, setAlreadyApplied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showApply, setShowApply] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [applied, setApplied] = useState(false);
  const [eligErrors, setEligErrors] = useState<string[]>([]);
  const [ccProfile, setCcProfile] = useState<any>(null);
  const [applyMode, setApplyMode] = useState<"loading" | "no_profile" | "ineligible" | "confirm" | "success">("loading");

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) { setLocation("/lancing/login"); return; }
    if (driveId) void load();
    else setError("Invalid drive link.");
  }, [authLoading, isAuthenticated, driveId]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch(`/api/placement-cell/public/drives/${driveId}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Drive not found");
      setDrive(data.drive);
      setAlreadyApplied(!!data.alreadyApplied);
    } catch (e: any) {
      setError(e.message || "Failed to load drive");
    } finally {
      setLoading(false);
    }
  };

  const handleApplyClick = async () => {
    if (!user) return;
    setShowApply(true);
    setApplyMode("loading");
    setEligErrors([]);
    try {
      const userDoc = await getDoc(doc(firestore, "users", user.uid));
      const data = userDoc.data();
      const ccp = data?.career_compass_profile;
      const branchVal = ccp?.branch || ccp?.degree;
      const univVal = ccp?.universityName || ccp?.university;
      const yearVal = ccp?.yearOfStudy || ccp?.year;
      const cgpaVal = ccp?.currentCgpa ?? ccp?.cgpa;
      if (!ccp || !ccp.fullName || !branchVal || !univVal || !yearVal || cgpaVal == null || cgpaVal === "") {
        setApplyMode("no_profile");
        return;
      }
      setCcProfile(ccp);
      const reasons: string[] = [];
      const cgpaNum = parseFloat(String(cgpaVal));
      if (drive?.eligibility?.minCGPA > 0 && cgpaNum < drive.eligibility.minCGPA) {
        reasons.push(`Your CGPA ${cgpaVal} is below the minimum required CGPA of ${drive.eligibility.minCGPA}.`);
      }
      const pct12Val = ccp?.pct12 || ccp?.marks12;
      if (drive?.eligibility?.min12Pct != null && pct12Val) {
        const pct12Num = parseFloat(String(pct12Val));
        if (!isNaN(pct12Num) && pct12Num < drive.eligibility.min12Pct) {
          reasons.push(`Your 12th percentage (${pct12Val}%) is below the minimum of ${drive.eligibility.min12Pct}%.`);
        }
      }
      const pct10Val = ccp?.pct10 || ccp?.marks10;
      if (drive?.eligibility?.min10Pct != null && pct10Val) {
        const pct10Num = parseFloat(String(pct10Val));
        if (!isNaN(pct10Num) && pct10Num < drive.eligibility.min10Pct) {
          reasons.push(`Your 10th percentage (${pct10Val}%) is below the minimum of ${drive.eligibility.min10Pct}%.`);
        }
      }
      if (drive?.eligibility?.branches?.length > 0 && !drive.eligibility.branches.map((b: string) => String(b).toLowerCase()).includes(String(branchVal).toLowerCase())) {
        reasons.push(`Your branch (${branchVal}) is not eligible. Eligible branches: ${drive.eligibility.branches.join(", ")}.`);
      }
      if (drive?.eligibility?.batches?.length > 0 && !drive.eligibility.batches.map((b: string) => String(b).toLowerCase()).includes(String(yearVal).toLowerCase())) {
        reasons.push(`Students in ${yearVal} are not eligible. Eligible batches: ${drive.eligibility.batches.join(", ")}.`);
      }
      if (reasons.length > 0) {
        setEligErrors(reasons);
        setApplyMode("ineligible");
      } else {
        setApplyMode("confirm");
      }
    } catch {
      setApplyMode("confirm");
    }
  };

  const exportCV = async () => {
    if (!user) return;
    try {
      const profDoc = await getDoc(doc(firestore, "lancing_users", user.uid, "profile", "data"));
      const p = profDoc.exists() ? profDoc.data() : {};
      const html = `
        <html><head><title>${p.fullName || "CV"}</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 800px; margin: 40px auto; padding: 0 20px; color: #333; }
          h1 { font-size: 28px; margin-bottom: 4px; } h2 { font-size: 16px; color: #555; border-bottom: 1px solid #ddd; padding-bottom: 6px; margin-top: 20px; }
          p { margin: 4px 0; font-size: 14px; }
        </style></head><body>
        <h1>${p.fullName || "Student"}</h1>
        <p>${p.email || ""} ${p.phone ? "· " + p.phone : ""}</p>
        ${p.degree || p.cgpa ? `<h2>Academic</h2><p>${p.degree || ""} ${p.cgpa ? "· CGPA " + p.cgpa : ""}</p>` : ""}
        ${p.skills?.length ? `<h2>Skills</h2><p>${p.skills.join(", ")}</p>` : ""}
        ${p.bio ? `<h2>About</h2><p>${p.bio}</p>` : ""}
        </body></html>`;
      const w = window.open("", "_blank");
      if (w) { w.document.write(html); w.document.close(); }
    } catch (e: any) {
      toast({ title: "Failed", description: e.message, variant: "destructive" });
    }
  };

  const apply = async () => {
    if (!user || submitting) return;
    setSubmitting(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch(`/api/placement-cell/public/drives/${driveId}/apply`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Application failed");
      setAlreadyApplied(true);
      setApplied(true);
      setApplyMode("success");
    } catch (e: any) {
      if (e.message?.includes("Already applied") || e.message?.includes("already applied")) {
        setAlreadyApplied(true);
        setApplyMode("success");
      } else if (e.message?.includes("not eligible") || e.message?.includes("Not eligible")) {
        setEligErrors([e.message]);
        setApplyMode("ineligible");
      } else {
        toast({ title: "Failed to apply", description: e.message, variant: "destructive" });
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>;
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-violet-50 p-6">
        <Card className="max-w-md w-full border-2 border-red-100 rounded-3xl">
          <CardContent className="p-10 text-center">
            <XCircle className="w-12 h-12 mx-auto text-red-400 mb-3" />
            <h2 className="text-xl font-bold mb-2">Drive Not Found</h2>
            <p className="text-gray-500 text-sm mb-6">{error}</p>
            <button
              onClick={() => setLocation("/lancing/campus-drives")}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Campus Drives
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!drive) return null;

  const elig = drive.eligibility || {};
  const hasEligCriteria = elig.minCGPA > 0 || elig.min12Pct != null || elig.min10Pct != null ||
    elig.maxBacklogs != null || elig.branches?.length > 0 || elig.batches?.length > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-violet-50 py-10 px-4">
      <SEOHead title={`${drive.jobTitle} - ${drive.companyName}`} description={drive.description} />
      <div className="max-w-3xl mx-auto">
        <button
          onClick={() => setLocation("/lancing/campus-drives")}
          className="inline-flex items-center text-indigo-600 mb-6 hover:text-indigo-700 text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to drives
        </button>

        <Card className="border-2 border-indigo-100 rounded-3xl shadow-xl">
          <CardContent className="p-8">

            {/* Header */}
            <div className="flex items-start justify-between flex-wrap gap-4 mb-6">
              <div>
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <Badge variant="outline">{drive.jobType}</Badge>
                  {drive.hasAssessment && <Badge className="bg-purple-100 text-purple-700">Assessment required</Badge>}
                </div>
                <h1 className="text-3xl font-bold">{drive.jobTitle}</h1>
                <p className="text-xl text-gray-700">{drive.companyName}</p>
                <p className="text-sm text-gray-500 flex items-center gap-1 mt-1"><GraduationCap className="w-4 h-4" /> Posted by {displayInstitutionName(drive.collegeName)}</p>
              </div>
              <div className="flex gap-2 flex-col">
                {alreadyApplied ? (
                  <Badge className="bg-emerald-100 text-emerald-700 px-4 py-2 text-sm"><CheckCircle2 className="w-4 h-4 mr-1.5" /> Applied</Badge>
                ) : (
                  <Button onClick={handleApplyClick} className="bg-gradient-to-r from-indigo-600 to-violet-500 text-white rounded-xl h-12 px-6" data-testid="button-apply">
                    Apply Now
                  </Button>
                )}
                <Button onClick={exportCV} variant="outline" size="sm" className="rounded-xl"><Download className="w-3 h-3 mr-1.5" /> Export my CV (PDF)</Button>
              </div>
            </div>

            {/* Meta pills */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              <Meta icon={Briefcase} label={drive.jobType} />
              {drive.location && <Meta icon={MapPin} label={drive.location} />}
              {drive.ctc && <Meta icon={IndianRupee} label={drive.ctc} />}
              {drive.deadline && <Meta icon={Calendar} label={drive.deadline} />}
            </div>

            {/* Description */}
            {drive.description && (
              <div className="mb-6">
                <h3 className="font-bold mb-2">About the role</h3>
                <p className="text-gray-700 whitespace-pre-wrap text-sm leading-relaxed">{drive.description}</p>
              </div>
            )}

            {/* JD Document */}
            {drive.jdUrl && (
              <div className="mb-6 flex items-center gap-3 p-4 rounded-2xl bg-blue-50 border border-blue-100">
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-blue-900 text-sm">Job Description Document</p>
                  <p className="text-xs text-blue-600 mt-0.5">Official JD / offer letter attached by placement cell</p>
                </div>
                <a
                  href={drive.jdUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition-colors shrink-0"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  View JD
                </a>
              </div>
            )}

            {/* Eligibility */}
            <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-100 mb-4">
              <h3 className="font-bold text-indigo-900 mb-3 flex items-center gap-2"><AlertCircle className="w-4 h-4" /> Eligibility Criteria</h3>
              {hasEligCriteria ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-6 text-sm text-indigo-900">
                  {elig.minCGPA > 0 && <EligRow label="Minimum CGPA" value={String(elig.minCGPA)} />}
                  {elig.min12Pct != null && <EligRow label="Minimum 12th %" value={`${elig.min12Pct}%`} />}
                  {elig.min10Pct != null && <EligRow label="Minimum 10th %" value={`${elig.min10Pct}%`} />}
                  {elig.maxBacklogs != null && <EligRow label="Max Backlogs Allowed" value={String(elig.maxBacklogs)} />}
                  {elig.branches?.length > 0 && <EligRow label="Eligible Branches" value={elig.branches.join(", ")} wide />}
                  {elig.batches?.length > 0 && <EligRow label="Eligible Batches" value={elig.batches.join(", ")} wide />}
                </div>
              ) : (
                <p className="text-sm text-indigo-700">Open to all students — no specific eligibility criteria.</p>
              )}
            </div>

            {/* Assessment notice */}
            {drive.hasAssessment && (
              <div className="p-4 rounded-2xl bg-purple-50 border border-purple-100">
                <p className="font-bold text-purple-900 mb-1 flex items-center gap-2"><FileText className="w-4 h-4" /> Screening test required</p>
                <p className="text-sm text-purple-800">After applying, you'll be required to take a {drive.assessmentNumQuestions}-question screening test ({drive.assessmentDuration} minutes). Anti-cheat measures are enforced.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Apply Dialog */}
      <Dialog open={showApply} onOpenChange={open => { if (!open && applyMode !== "success") setShowApply(false); else if (!open) setShowApply(false); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {applyMode === "success"
                ? "Application Submitted!"
                : applyMode === "confirm"
                ? `Confirm Application — ${drive.jobTitle}`
                : `Apply to ${drive.companyName}`}
            </DialogTitle>
            {applyMode === "confirm" && (
              <p className="text-xs text-gray-500 -mt-1">Posted by {displayInstitutionName(drive.collegeName)}</p>
            )}
          </DialogHeader>

          {applyMode === "loading" && (
            <div className="flex flex-col items-center justify-center py-10 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
              <p className="text-sm text-gray-500">Loading your Career Compass profile…</p>
            </div>
          )}

          {applyMode === "no_profile" && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-800">
                <p className="font-bold mb-1">Complete your profile first</p>
                <p>You need to complete your Career Compass profile before applying to placement drives. Your branch, CGPA, and year of study are required.</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setShowApply(false)} className="flex-1">Cancel</Button>
                <Button onClick={() => { setShowApply(false); setLocation("/lancing/career-compass"); }} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white">
                  Go to Career Compass
                </Button>
              </div>
            </div>
          )}

          {applyMode === "ineligible" && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-800">
                <p className="font-bold mb-2">You are not eligible for this drive:</p>
                <ul className="list-disc list-inside space-y-1">{eligErrors.map((r, i) => <li key={i}>{r}</li>)}</ul>
              </div>
              <Button variant="outline" onClick={() => setShowApply(false)} className="w-full">Close</Button>
            </div>
          )}

          {applyMode === "confirm" && ccProfile && (() => {
            const skills: string[] = ccProfile.skillsKnown || ccProfile.knownSkills || [];
            return (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-indigo-50/70 border border-indigo-100 text-sm">
                  <p className="text-xs font-semibold text-indigo-500 uppercase tracking-wide mb-2">Your profile (will be shared with placement cell)</p>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-indigo-900">
                    <Row label="Full Name" value={ccProfile.fullName} />
                    <Row label="Email" value={ccProfile.email || user?.email} />
                    {ccProfile.phone && <Row label="Phone" value={ccProfile.phone} />}
                    <Row label="Branch" value={ccProfile.branch || ccProfile.degree} />
                    <Row label="Year of Study" value={ccProfile.yearOfStudy || ccProfile.year} />
                    <Row label="CGPA" value={ccProfile.currentCgpa || ccProfile.cgpa} />
                    {(ccProfile.pct12 || ccProfile.marks12) && (
                      <Row label="12th %" value={`${ccProfile.pct12 || ccProfile.marks12}%`} />
                    )}
                    {(ccProfile.pct10 || ccProfile.marks10) && (
                      <Row label="10th %" value={`${ccProfile.pct10 || ccProfile.marks10}%`} />
                    )}
                    {(ccProfile.universityName || ccProfile.university) && (
                      <Row label="University" value={displayInstitutionName(ccProfile.universityName || ccProfile.university)} span />
                    )}
                    {ccProfile.linkedin && (
                      <div className="col-span-2">
                        <p className="text-[10px] text-indigo-400 font-medium uppercase">LinkedIn</p>
                        <p className="text-xs text-indigo-700 truncate">{ccProfile.linkedin}</p>
                      </div>
                    )}
                  </div>
                  {skills.length > 0 && (
                    <div className="mt-3">
                      <p className="text-[10px] text-indigo-400 font-medium uppercase mb-1">Known Skills</p>
                      <div className="flex flex-wrap gap-1">
                        {skills.slice(0, 3).map((s: string) => (
                          <span key={s} className="px-2 py-0.5 bg-white text-indigo-700 rounded-full text-xs font-medium border border-indigo-200">{s}</span>
                        ))}
                        {skills.length > 3 && <span className="text-xs text-indigo-500 font-medium self-center">+{skills.length - 3} more</span>}
                      </div>
                    </div>
                  )}
                </div>
                {drive.hasAssessment && (
                  <div className="p-3 rounded-xl bg-purple-50 border border-purple-100 text-xs text-purple-800">
                    After applying, you will need to complete a {drive.assessmentNumQuestions}-question screening test ({drive.assessmentDuration} min).
                  </div>
                )}
                <div className="flex gap-2">
                  <Button variant="ghost" onClick={() => setShowApply(false)} className="flex-1" disabled={submitting}>Cancel</Button>
                  <Button onClick={apply} disabled={submitting} className="flex-1 bg-gradient-to-r from-teal-600 to-emerald-500 hover:from-teal-700 hover:to-emerald-600 text-white">
                    {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Confirm & Apply"}
                  </Button>
                </div>
              </div>
            );
          })()}

          {applyMode === "success" && (
            <div className="space-y-4">
              <div className="flex flex-col items-center py-4 text-center gap-3">
                <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                </div>
                <div>
                  <p className="font-bold text-lg text-gray-900">Application Sent!</p>
                  <p className="text-sm text-gray-600 mt-1">
                    Your profile has been shared with the placement cell at <strong>{displayInstitutionName(drive.collegeName)}</strong>.
                    They will review your application and update your status.
                  </p>
                </div>
                {drive.hasAssessment && (
                  <div className="p-3 rounded-xl bg-purple-50 border border-purple-100 text-xs text-purple-800 text-left w-full">
                    <strong>Next step:</strong> You need to complete a {drive.assessmentNumQuestions}-question screening test ({drive.assessmentDuration} min). Click "Take Test" below.
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => { setShowApply(false); setLocation("/lancing/my-applications"); }} className="flex-1">
                  View My Applications
                </Button>
                {drive.hasAssessment && (
                  <Button onClick={() => { setShowApply(false); setLocation(`/lancing/drive/${driveId}/test`); }} className="flex-1 bg-purple-600 hover:bg-purple-700 text-white">
                    Take Test
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
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

function EligRow({ label, value, wide }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={wide ? "sm:col-span-2" : ""}>
      <span className="text-indigo-500 font-medium">{label}: </span>
      <strong>{value}</strong>
    </div>
  );
}

function Row({ label, value, span }: { label: string; value: any; span?: boolean }) {
  if (value == null || value === "") return null;
  return (
    <div className={span ? "col-span-2" : ""}>
      <p className="text-[10px] text-indigo-400 font-medium uppercase">{label}</p>
      <p className="text-xs text-indigo-900 font-medium truncate">{value}</p>
    </div>
  );
}
