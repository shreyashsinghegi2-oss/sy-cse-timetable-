import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Shield, ArrowLeft, IndianRupee, Loader2, CheckCircle2, Clock, Building2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLancingAuth } from "@/hooks/use-lancing-auth";
import ReadinessGateButton from "@/components/lancing/readiness-gate-button";
import { auth } from "@/lib/firebase";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface SureShotJob {
  id: string;
  title: string;
  company: string;
  description: string;
  skills: string[];
  payout_amount: number;
  work_mode: string;
  duration: string;
  deadline: string;
  slots_available: number;
  slots_filled: number;
  status: string;
  createdAt: string;
}

interface SureShotApplication {
  id: string;
  job_id: string;
  job_title: string;
  status: string;
  applied_at: string;
  payout_amount: number;
  payout_status: string;
  payment_proof_url?: string;
  upi_id: string;
  phone_number?: string;
  work_submission_link?: string;
}

async function authedFetch(url: string, init: RequestInit = {}) {
  const token = await auth.currentUser?.getIdToken();
  return fetch(url, { ...init, headers: { ...(init.headers || {}), Authorization: `Bearer ${token}` } });
}

export default function LancingSureShotPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading: authLoading, role } = useLancingAuth();
  const qc = useQueryClient();

  const [selectedJob, setSelectedJob] = useState<SureShotJob | null>(null);
  const [whyInterested, setWhyInterested] = useState("");
  const [upiId, setUpiId] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated || !user) {
      setLocation("/lancing/login");
      return;
    }
    if (role && role !== "freelancer") {
      setLocation(role === "company" ? "/lancing/company-dashboard" : "/lancing/angel-dashboard");
    }
  }, [authLoading, isAuthenticated, user, role, setLocation]);

  const jobsQuery = useQuery<{ jobs: SureShotJob[] }>({
    queryKey: ["/api/lancing/sure-shot/jobs"],
    queryFn: async () => {
      const r = await fetch("/api/lancing/sure-shot/jobs");
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
  });

  const myAppsQuery = useQuery<{ applications: SureShotApplication[] }>({
    queryKey: ["/api/lancing/sure-shot/my-applications"],
    enabled: !!user,
    queryFn: async () => {
      const r = await authedFetch("/api/lancing/sure-shot/my-applications");
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
  });

  const submitWorkMutation = useMutation({
    mutationFn: async (vars: { applicationId: string; link: string }) => {
      const r = await authedFetch("/api/lancing/sure-shot/submit-work", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId: vars.applicationId, workSubmissionLink: vars.link }),
      });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/lancing/sure-shot/my-applications"] });
      toast({ title: "Work submitted!" });
    },
  });

  const handleApply = async () => {
    if (!selectedJob) return;
    if (!whyInterested.trim() || !upiId.trim() || !phoneNumber.trim()) {
      toast({ title: "All fields are required", description: "Please fill in your reason, UPI ID, and phone number.", variant: "destructive" });
      return;
    }
    const phoneDigits = phoneNumber.replace(/\D/g, "");
    if (phoneDigits.length < 10) {
      toast({ title: "Invalid phone number", description: "Enter a valid 10-digit phone number.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const r = await authedFetch("/api/lancing/sure-shot/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId: selectedJob.id,
          whyInterested: whyInterested.trim(),
          upiId: upiId.trim(),
          phoneNumber: phoneNumber.trim(),
          studentName: (user as any)?.displayName || user?.email,
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Failed");
      toast({ title: "Applied successfully!", description: "Track status under My Applications" });
      setSelectedJob(null);
      setWhyInterested("");
      setUpiId("");
      setPhoneNumber("");
      qc.invalidateQueries({ queryKey: ["/api/lancing/sure-shot/jobs"] });
      qc.invalidateQueries({ queryKey: ["/api/lancing/sure-shot/my-applications"] });
    } catch (e: any) {
      toast({ title: "Apply failed", description: e?.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const myJobIds = new Set((myAppsQuery.data?.applications || []).map((a) => a.job_id));
  const jobs = (jobsQuery.data?.jobs || []).filter((j) => j.slots_filled < j.slots_available);

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50">
      <header className="bg-white border-b border-amber-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <Link href="/lancing/freelancer-dashboard">
            <Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4 mr-1" />Dashboard</Button>
          </Link>
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-amber-600" />
            <span className="font-bold text-slate-900">Sure Shot Jobs</span>
          </div>
          <div />
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        <div className="rounded-xl border-2 border-amber-300 bg-gradient-to-r from-amber-100 to-yellow-100 p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <Shield className="w-7 h-7 text-amber-700 shrink-0" />
            <div>
              <div className="font-bold text-amber-900 text-lg">StudentXchange Verified</div>
              <p className="text-sm text-amber-900/90 mt-1">
                These opportunities are personally sourced and verified by StudentXchange. Apply, complete the work, and get paid directly. Sure Shot Jobs do <span className="font-semibold">not</span> count toward your monthly apply limit.
              </p>
            </div>
          </div>
        </div>

        {(myAppsQuery.data?.applications || []).length > 0 && (
          <section className="space-y-3">
            <h2 className="font-bold text-slate-900">Your Sure Shot applications</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {myAppsQuery.data!.applications.map((app) => (
                <Card key={app.id} className="border-amber-300 bg-white">
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="font-semibold text-slate-900">{app.job_title}</div>
                      <Badge className="bg-amber-100 text-amber-800 border-amber-200">{app.status}</Badge>
                    </div>
                    <div className="text-xs text-slate-600 flex items-center gap-1">
                      <IndianRupee className="w-3 h-3" />Payout: ₹{app.payout_amount}
                      <span className="ml-2 text-slate-400">•</span>
                      <span className="ml-1">UPI: {app.upi_id}</span>
                    </div>
                    {app.payout_status === "done" && (
                      <div className="flex items-center gap-1 text-emerald-700 text-sm font-medium">
                        <CheckCircle2 className="w-4 h-4" />Payment of ₹{app.payout_amount} done ✓
                      </div>
                    )}
                    {app.status === "assigned" && !app.work_submission_link && (
                      <SubmitWorkInline onSubmit={(link) => submitWorkMutation.mutate({ applicationId: app.id, link })} />
                    )}
                    {app.work_submission_link && (
                      <div className="text-xs text-slate-500 truncate">Submitted: {app.work_submission_link}</div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        <section className="space-y-3">
          <h2 className="font-bold text-slate-900">Open opportunities</h2>
          {jobsQuery.isLoading ? (
            <div className="text-center py-12"><Loader2 className="w-6 h-6 animate-spin mx-auto text-amber-600" /></div>
          ) : jobs.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-slate-500">No open Sure Shot Jobs at the moment. Check back soon!</CardContent></Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {jobs.map((job) => (
                <Card key={job.id} className="border-amber-300 bg-white shadow-sm">
                  <CardContent className="p-5 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-bold text-slate-900">{job.title}</h3>
                        <div className="flex items-center gap-1 text-sm text-slate-600 mt-0.5">
                          <Building2 className="w-3.5 h-3.5" />{job.company}
                        </div>
                      </div>
                      <Badge className="bg-amber-500 text-white shrink-0">
                        <Shield className="w-3 h-3 mr-1" />Verified
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-600 line-clamp-3">{job.description}</p>
                    <div className="flex flex-wrap gap-2 text-xs">
                      <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 px-2 py-1 rounded-md font-bold">
                        <IndianRupee className="w-3 h-3" />₹{job.payout_amount} payout
                      </span>
                      <Badge variant="secondary">{job.work_mode}</Badge>
                      {job.duration && <Badge variant="secondary">{job.duration}</Badge>}
                      <span className="text-slate-500 inline-flex items-center gap-1">
                        <Clock className="w-3 h-3" />{job.slots_available - job.slots_filled} slots left
                      </span>
                    </div>
                    {job.skills.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {job.skills.slice(0, 6).map((s, i) => (
                          <Badge key={i} variant="outline" className="text-[10px] py-0 px-1.5 font-normal">{s}</Badge>
                        ))}
                      </div>
                    )}
                    <Button
                      onClick={() => setSelectedJob(job)}
                      disabled={myJobIds.has(job.id)}
                      className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
                    >
                      {myJobIds.has(job.id) ? "Already Applied" : "Apply for ₹" + job.payout_amount + " payout"}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>
      </main>

      <Dialog open={!!selectedJob} onOpenChange={(v) => !v && setSelectedJob(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Apply: {selectedJob?.title}</DialogTitle>
            <DialogDescription>Tell us why you're interested. We'll review and assign the work to selected applicants.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Why are you interested? <span className="text-red-500">*</span></Label>
              <Textarea value={whyInterested} onChange={(e) => setWhyInterested(e.target.value)} rows={4} placeholder="Briefly share your fit and approach" />
            </div>
            <div>
              <Label>Phone Number <span className="text-red-500">*</span></Label>
              <Input
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="10-digit mobile number"
                type="tel"
                maxLength={15}
              />
              <p className="text-xs text-slate-500 mt-1">Used only for coordination — not shared publicly.</p>
            </div>
            <div>
              <Label>Your UPI ID (for payout) <span className="text-red-500">*</span></Label>
              <Input value={upiId} onChange={(e) => setUpiId(e.target.value)} placeholder="yourname@oksbi" />
            </div>
            <ReadinessGateButton
              onApply={handleApply}
              loading={submitting}
              className="w-full bg-gradient-to-r from-amber-500 to-orange-500"
            >
              Submit Application
            </ReadinessGateButton>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SubmitWorkInline({ onSubmit }: { onSubmit: (link: string) => void }) {
  const [link, setLink] = useState("");
  return (
    <div className="flex gap-2 pt-2">
      <Input value={link} onChange={(e) => setLink(e.target.value)} placeholder="Paste link to your work" className="text-sm" />
      <Button size="sm" onClick={() => link.trim() && onSubmit(link.trim())} disabled={!link.trim()}>Submit</Button>
    </div>
  );
}
