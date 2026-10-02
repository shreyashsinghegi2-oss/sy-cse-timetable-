import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { useLancingAuth } from "@/hooks/use-lancing-auth";
import { firestore } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, GraduationCap, MapPin, IndianRupee, Calendar, ArrowLeft, Users, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import SEOHead from "@/components/seo/seo-head";
import { computeDriveEligibility, hasAnyEligibilityCriteria } from "@/lib/drive-eligibility";
import { displayInstitutionName } from "@/lib/institution-display";

export default function LancingCampusDrives() {
  const { user, isAuthenticated, isLoading: authLoading } = useLancingAuth();
  const [, setLocation] = useLocation();
  const [drives, setDrives] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [studentProfile, setStudentProfile] = useState<any>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [eligibleOnly, setEligibleOnly] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) { setLocation("/lancing/login"); return; }
    void loadAll();
  }, [authLoading, isAuthenticated, user?.uid]);

  const loadAll = async () => {
    const [drivesRes, profileSnap] = await Promise.allSettled([
      fetch("/api/placement-cell/public/drives").then(r => r.json()),
      user?.uid ? getDoc(doc(firestore, "users", user.uid)) : Promise.resolve(null),
    ]);
    if (drivesRes.status === "fulfilled") {
      setDrives(drivesRes.value.drives || []);
      setNextCursor(drivesRes.value.nextCursor || null);
    }
    if (profileSnap.status === "fulfilled" && profileSnap.value) {
      const snap: any = profileSnap.value;
      if (snap && snap.exists && snap.exists()) setStudentProfile(snap.data()?.career_compass_profile || null);
    }
    setProfileLoaded(true);
    setLoading(false);
  };

  const loadMore = async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await fetch(`/api/placement-cell/public/drives?cursor=${encodeURIComponent(nextCursor)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load more drives");
      setDrives(prev => {
        const existing = new Set(prev.map(d => d.id));
        return [...prev, ...(data.drives || []).filter((d: any) => !existing.has(d.id))];
      });
      setNextCursor(data.nextCursor || null);
    } finally {
      setLoadingMore(false);
    }
  };

  if (authLoading || loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>;
  }

  const drivesWithElig = drives.map(d => {
    const result = computeDriveEligibility(d, studentProfile);
    return { ...d, _elig: result };
  });
  const displayed = eligibleOnly ? drivesWithElig.filter(d => d._elig.eligible) : drivesWithElig;
  const eligibleCount = drivesWithElig.filter(d => d._elig.eligible).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-violet-50 py-10 px-4">
      <SEOHead title="Campus Drives" description="Campus placement opportunities" />
      <div className="max-w-5xl mx-auto">
        <Link href="/lancing/freelancer-dashboard">
          <a className="inline-flex items-center text-indigo-600 mb-6 hover:text-indigo-700">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </a>
        </Link>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
            <GraduationCap className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Campus Drives</h1>
            <p className="text-sm text-gray-600">Placement opportunities posted by college placement cells</p>
          </div>
        </div>

        {/* Profile warning + filter bar */}
        {profileLoaded && !studentProfile && (
          <div className="mb-4 p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-2 text-sm text-amber-800">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>
              <strong>Set up your Career Compass profile</strong> so we can show which drives you're eligible for.{" "}
              <Link href="/lancing/career-compass">
                <a className="underline font-semibold hover:text-amber-900">Go to Career Compass →</a>
              </Link>
            </span>
          </div>
        )}

        {drives.length > 0 && (
          <div className="flex items-center gap-3 mb-6 flex-wrap">
            <button
              onClick={() => setEligibleOnly(false)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${!eligibleOnly ? "bg-indigo-600 text-white shadow-sm" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
            >
              All Drives ({drives.length})
            </button>
            {studentProfile && (
              <button
                onClick={() => setEligibleOnly(true)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-1.5 ${eligibleOnly ? "bg-emerald-600 text-white shadow-sm" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
              >
                <CheckCircle2 className="w-4 h-4" /> I'm Eligible ({eligibleCount})
              </button>
            )}
          </div>
        )}

        {displayed.length === 0 ? (
          <Card className="border-2 border-indigo-100 rounded-3xl">
            <CardContent className="p-12 text-center">
              <GraduationCap className="w-12 h-12 mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500 font-medium">
                {eligibleOnly ? "No drives match your eligibility criteria right now." : "No active campus drives right now. Check back soon."}
              </p>
              {eligibleOnly && (
                <button onClick={() => setEligibleOnly(false)} className="mt-3 text-sm text-indigo-600 underline">
                  View all drives
                </button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {displayed.map(d => {
              const elig = d._elig;
              const hasCriteria = hasAnyEligibilityCriteria(d);
              return (
                <Link key={d.id} href={`/lancing/drive/${d.id}`}>
                  <Card
                    className={`border-2 hover:shadow-lg cursor-pointer rounded-2xl transition-all ${
                      !hasCriteria || elig.eligible
                        ? "border-indigo-100 hover:border-indigo-400"
                        : "border-red-100 hover:border-red-300 opacity-80"
                    }`}
                    data-testid={`campus-drive-${d.id}`}
                  >
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between flex-wrap gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <h3 className="text-lg font-bold">{d.jobTitle}</h3>
                            <Badge variant="outline" className="text-xs">{d.jobType}</Badge>
                            {d.hasAssessment && <Badge className="bg-purple-100 text-purple-700 text-xs">Test required</Badge>}
                            {/* Eligibility badge */}
                            {studentProfile && hasCriteria && (
                              elig.eligible
                                ? <Badge className="bg-emerald-100 text-emerald-700 text-xs flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Eligible</Badge>
                                : <Badge className="bg-red-100 text-red-700 text-xs flex items-center gap-1"><XCircle className="w-3 h-3" /> Not Eligible</Badge>
                            )}
                          </div>
                          <p className="text-gray-700 font-medium">{d.companyName}</p>
                          <p className="text-xs text-gray-500 mt-0.5">via {displayInstitutionName(d.collegeName)}</p>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm text-gray-600">
                            {d.location && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {d.location}</span>}
                            {d.ctc && <span className="flex items-center gap-1"><IndianRupee className="w-3.5 h-3.5" /> {d.ctc}</span>}
                            {d.deadline && <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> Deadline: {d.deadline}</span>}
                            <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {d.applicantCount} applied</span>
                          </div>
                          {d.eligibility && (
                            <div className="mt-3 flex flex-wrap gap-2 text-xs">
                              {d.eligibility.minCGPA > 0 && <span className="px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full">Min CGPA {d.eligibility.minCGPA}</span>}
                              {d.eligibility.min12Pct > 0 && <span className="px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full">12th ≥ {d.eligibility.min12Pct}%</span>}
                              {d.eligibility.branches?.slice(0, 3).map((b: string) => <span key={b} className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full">{b}</span>)}
                              {d.eligibility.branches?.length > 3 && <span className="text-gray-500">+{d.eligibility.branches.length - 3}</span>}
                            </div>
                          )}
                          {/* Ineligibility reasons */}
                          {studentProfile && !elig.eligible && elig.reasons.length > 0 && hasCriteria && (
                            <div className="mt-2 space-y-0.5">
                              {elig.reasons.map((r: string, i: number) => (
                                <p key={i} className="text-xs text-red-600 flex items-start gap-1">
                                  <XCircle className="w-3 h-3 mt-0.5 shrink-0" /> {r}
                                </p>
                              ))}
                            </div>
                          )}
                        </div>
                        <Button
                          variant="outline"
                          disabled={studentProfile != null && hasCriteria && !elig.eligible}
                          className={studentProfile && hasCriteria && !elig.eligible ? "opacity-50 cursor-not-allowed" : ""}
                        >
                          {studentProfile && hasCriteria && !elig.eligible ? "Not Eligible" : "View & Apply"}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
        {nextCursor && (
          <div className="mt-6 flex justify-center">
            <Button variant="outline" onClick={() => void loadMore()} disabled={loadingMore}>
              {loadingMore && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Load more drives
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
