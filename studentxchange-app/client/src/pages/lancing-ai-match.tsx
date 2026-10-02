import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Zap, Loader2, Upload, ArrowLeft, CheckCircle2, X, Briefcase, Sparkles, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLancingAuth } from "@/hooks/use-lancing-auth";
import { firestore, getAuthToken } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { useApplyCounter } from "@/hooks/use-apply-counter";
import ApplyGateModal from "@/components/lancing/apply-gate-modal";
import OpportunityCard, { OpportunityCardData } from "@/components/lancing/opportunity-card";
import ApplyCounterBadge from "@/components/lancing/apply-counter-badge";
import { SectorChips } from "@/components/lancing/sector-chips";
import { SmartSections } from "@/components/lancing/smart-sections";
import { ExternalApplicationConfirmation, openExternalOpportunity, recordExternalApplication, ExternalApplicationType } from "@/components/lancing/external-application-confirmation";
import DiscoverySearchLinks from "@/components/lancing/DiscoverySearchLinks";

function hasBasicMatchingDegradation(data: any, items: OpportunityCardData[]) {
  const hasSourceBackedResults = items.some(item =>
    (item as any).isInternal === true || Boolean(item.source || item.source_url || item.url),
  );
  const itemFallback = items.some(item =>
    (item as any).fallback === true ||
    (item as any).engineStatus === "degraded" ||
    (item as any).engineStatus === "legacy",
  );
  return hasSourceBackedResults && (
    data?.fallback === true ||
    data?.engineStatus === "degraded" ||
    data?.engineStatus === "legacy" ||
    itemFallback
  );
}

export default function LancingAIMatchPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading: authLoading, role } = useLancingAuth();
  const counter = useApplyCounter();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [resumeText, setResumeText] = useState("");
  const [resumeFileName, setResumeFileName] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [skillsInput, setSkillsInput] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [branch, setBranch] = useState("");
  const [year, setYear] = useState("");
  const [preferredRole, setPreferredRole] = useState("");
  const [workMode, setWorkMode] = useState("");
  const [stipendExpectation, setStipendExpectation] = useState("");
  const [selectedSectors, setSelectedSectors] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem("lancing_sectors") || "[]"); } catch { return []; }
  });
  const [matches, setMatches] = useState<OpportunityCardData[]>([]);
  const [matchError, setMatchError] = useState("");
  const [showBasicMatchingNotice, setShowBasicMatchingNotice] = useState(false);
  const [searching, setSearching] = useState(false);
  const [showGate, setShowGate] = useState(false);
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set());
  const [externalItem, setExternalItem] = useState<{ item: OpportunityCardData; url: string } | null>(null);
  const [isMarkingApplied, setIsMarkingApplied] = useState(false);
  const [internalItem, setInternalItem] = useState<{ item: OpportunityCardData; record: any; type: "job" | "internship" | "micro_task" } | null>(null);
  const [internalApplyMessage, setInternalApplyMessage] = useState("");
  const [isApplyingInternal, setIsApplyingInternal] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated || !user) { setLocation("/lancing/login"); return; }
    if (role && role !== "freelancer") {
      setLocation(role === "company" ? "/lancing/company-dashboard" : "/lancing/angel-dashboard");
    }
  }, [authLoading, isAuthenticated, user, role, setLocation]);

  const handleSectorToggle = (sector: string) => {
    setSelectedSectors((prev) => {
      const next = prev.includes(sector) ? prev.filter((s) => s !== sector) : [...prev, sector];
      try { localStorage.setItem("lancing_sectors", JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const handleResume = async (file: File) => {
    setExtracting(true);
    setResumeFileName(file.name);
    try {
      const pdfjs: any = await import("pdfjs-dist");
      pdfjs.GlobalWorkerOptions.workerSrc = "https://cdn.jsdelivr.net/npm/pdfjs-dist@5.6.205/build/pdf.worker.min.mjs";
      const arrayBuf = await file.arrayBuffer();
      const pdf = await pdfjs.getDocument({ data: arrayBuf }).promise;
      let text = "";
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        text += content.items.map((it: any) => it.str).join(" ") + "\n";
      }
      setResumeText(text.trim());
      toast({ title: "Resume parsed", description: `${text.trim().length.toLocaleString()} characters extracted` });
    } catch (e: any) {
      toast({ title: "Failed to read resume", description: e?.message, variant: "destructive" });
    } finally {
      setExtracting(false);
    }
  };

  const addSkill = () => {
    const s = skillsInput.trim();
    if (!s) return;
    if (!skills.includes(s)) setSkills([...skills, s]);
    setSkillsInput("");
  };

  const findMatches = async () => {
    if (resumeText.trim().length < 50) {
      toast({ title: "Please upload a resume first", variant: "destructive" });
      setStep(1);
      return;
    }
    if (skills.length === 0) {
      toast({ title: "Add at least one skill", variant: "destructive" });
      return;
    }
    setSearching(true);
    setMatchError("");
    setShowBasicMatchingNotice(false);
    try {
      const token = await getAuthToken();
      if (!token) throw new Error("Please sign in again to find matches.");
      const res = await fetch("/api/lancing/ai-match", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          resumeText,
          profile: { skills, branch, year, preferredRole, workMode, stipendExpectation, sectors: selectedSectors },
        }),
      });
      let data: any = {};
      try { data = await res.json(); } catch {}
      if (res.status === 401) throw new Error("Authentication required. Please sign in again to find matches.");
      if (res.status === 403) throw new Error("Your account is not authorized to find matches.");
      if (!res.ok || data?.engineStatus === "unavailable") {
        throw new Error(data.error || `Could not load matches${res.status ? ` (HTTP ${res.status})` : ""}.`);
      }
      const items = Array.isArray(data?.items) ? data.items : [];
      setMatches(items);
      setShowBasicMatchingNotice(hasBasicMatchingDegradation(data, items));
      setStep(3);
      if (items.length === 0) {
        toast({ title: "No strong matches found", description: "Try adding more skills or refining your profile." });
      }
    } catch (error: any) {
      setMatches([]);
      setShowBasicMatchingNotice(false);
      setMatchError(error?.message || "Could not load matches. Please try again.");
      setStep(3);
      toast({ title: "Could not load matches", description: error?.message || "Please try again.", variant: "destructive" });
    } finally {
      setSearching(false);
    }
  };

  const handleOpportunityApply = (item: OpportunityCardData) => {
    const candidate = item as any;
    const isInternal = candidate.isInternal || /^internal:/i.test(item.url || item.source_url || "");
    if (isInternal) {
      const record = candidate.internalRecord;
      const internalType = String(candidate.internalType || record?.type || candidate.category || candidate._category || item.type || "").toLowerCase();
      const type = internalType === "internship" || internalType === "internships"
          ? "internship"
          : internalType === "micro_task" || internalType === "microtask" || internalType === "micro_tasks" || internalType === "task"
          ? "micro_task"
          : internalType === "job" || internalType === "jobs" || internalType === "full-time" || internalType === "part-time"
            ? "job"
            : null;
      if (!record || !record.id || !type) {
        toast({ title: "In-platform application unavailable", description: "This internal opportunity cannot be applied to from AI Match. Open it from the dashboard to continue.", variant: "destructive" });
        return;
      }
      setInternalApplyMessage("");
      setInternalItem({ item, record, type });
      return;
    }
    const url = openExternalOpportunity(item);
    if (!url) {
      toast({ title: "Could not open listing", description: "This opportunity has no valid external URL, or the browser blocked the new tab.", variant: "destructive" });
      return;
    }
    setExternalItem({ item, url });
  };

  const submitInternalApplication = async () => {
    if (!internalItem || !user) return;
    setIsApplyingInternal(true);
    try {
      const profileSnapshot = await getDoc(doc(firestore, "lancing_users", user.uid, "profile", "data"));
      const profile = profileSnapshot.exists() ? profileSnapshot.data() : {};
      const applicantName = profile.fullName || "Freelancer";
      const token = await getAuthToken();
      if (!token) throw new Error("Please sign in again to apply.");

      await counter.consume.mutateAsync("general");
      const response = await fetch("/api/lancing/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          jobId: internalItem.record.id,
          jobTitle: internalItem.record.title || internalItem.item.title,
          companyName: internalItem.record.companyName || internalItem.item.company,
          companyLogo: internalItem.record.companyLogo || "",
          applicantName,
          applicantEmail: user.email || "",
          applicantProfileImage: profile.profileImageUrl || "",
          applicantSkills: profile.skills || skills,
          applicantPhone: profile.phoneNumber || "",
          message: internalApplyMessage,
          type: internalItem.type,
          ...(internalItem.record.sourceCollection === "opportunities" ? { sourceCollection: "opportunities" } : {}),
        }),
      });
      let result: any = {};
      try { result = await response.json(); } catch {}
      if (!response.ok) {
        if (result.alreadyApplied) {
          setAppliedIds(prev => new Set(prev).add(internalItem.record.id));
          toast({ title: "Already applied", description: "You have already applied to this in-platform opportunity." });
          setInternalItem(null);
          return;
        }
        throw new Error(result.error || `Failed to submit application (HTTP ${response.status}).`);
      }

      setAppliedIds(prev => new Set(prev).add(internalItem.record.id));
      toast({ title: "Application submitted", description: "The company can review your application in StudentLancing." });
      setInternalItem(null);
      setInternalApplyMessage("");
    } catch (e: any) {
      if (e?.code === 402) setShowGate(true);
      else toast({ title: "Failed to apply", description: e?.message || "Please try again.", variant: "destructive" });
    } finally {
      setIsApplyingInternal(false);
    }
  };

  const markExternalApplied = async () => {
    if (!externalItem || !user) return;
    setIsMarkingApplied(true);
    try {
      const lowerType = String(externalItem.item.type || (externalItem.item as any).category || "").toLowerCase();
      const type: ExternalApplicationType = lowerType === "internship" || lowerType === "internships" ? "internship" : lowerType === "microtask" || lowerType === "micro_task" || lowerType === "micro_tasks" ? "micro_task" : lowerType === "competition" ? "competition" : "job";
      await recordExternalApplication(
        externalItem.item,
        type,
        externalItem.url,
      );
      if (externalItem.item.id) setAppliedIds(prev => new Set(prev).add(externalItem.item.id!));
      toast({ title: "Marked as applied", description: "Come back any time for fresh AI matches." });
      setExternalItem(null);
    } catch (e: any) {
      toast({ title: "Could not save application", description: e?.message, variant: "destructive" });
    } finally {
      setIsMarkingApplied(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <Link href="/lancing/freelancer-dashboard">
            <Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4 mr-1" />Dashboard</Button>
          </Link>
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-500" />
            <span className="font-bold text-slate-900">AI Match</span>
          </div>
          <ApplyCounterBadge />
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center gap-2 text-sm">
          {[1, 2, 3].map((s) => (
            <div key={s} className={`flex-1 h-1.5 rounded-full ${step >= (s as 1 | 2 | 3) ? "bg-blue-600" : "bg-slate-200"}`} />
          ))}
        </div>

        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Step 1 — Upload your resume</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-lg p-8 cursor-pointer hover:bg-slate-50">
                <input
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleResume(e.target.files[0])}
                />
                {extracting ? (
                  <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-2" />
                ) : resumeText ? (
                  <CheckCircle2 className="w-10 h-10 text-emerald-600 mb-2" />
                ) : (
                  <Upload className="w-10 h-10 text-slate-400 mb-2" />
                )}
                <div className="font-medium text-slate-700">
                  {extracting ? "Extracting text..." : resumeText ? resumeFileName : "Click to upload PDF resume"}
                </div>
                {resumeText && (
                  <div className="text-xs text-slate-500 mt-1">{resumeText.length.toLocaleString()} characters parsed</div>
                )}
              </label>
              <div className="flex justify-end">
                <Button onClick={() => setStep(2)} disabled={!resumeText}>Next: Profile →</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>Step 2 — Quick profile</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div>
                <Label>Skills (multi-select)</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    value={skillsInput}
                    onChange={(e) => setSkillsInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSkill())}
                    placeholder="e.g. React, Python, Figma"
                  />
                  <Button type="button" onClick={addSkill}>Add</Button>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {skills.map((s) => (
                    <Badge key={s} variant="secondary" className="gap-1">
                      {s}
                      <button onClick={() => setSkills(skills.filter((x) => x !== s))}><X className="w-3 h-3" /></button>
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Sector preference — same chips as dashboard */}
              <div>
                <Label className="mb-2 block">Preferred sectors (optional — helps tailor your matches)</Label>
                <SectorChips selectedSectors={selectedSectors} onToggle={handleSectorToggle} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><Label>Branch</Label><Input value={branch} onChange={(e) => setBranch(e.target.value)} placeholder="e.g. Computer Science" /></div>
                <div><Label>Year</Label><Input value={year} onChange={(e) => setYear(e.target.value)} placeholder="e.g. 3rd year" /></div>
                <div><Label>Preferred role</Label><Input value={preferredRole} onChange={(e) => setPreferredRole(e.target.value)} placeholder="e.g. Frontend Developer" /></div>
                <div><Label>Work mode preference</Label><Input value={workMode} onChange={(e) => setWorkMode(e.target.value)} placeholder="Remote / Hybrid / Onsite" /></div>
                <div className="md:col-span-2"><Label>Stipend expectation (optional)</Label><Input value={stipendExpectation} onChange={(e) => setStipendExpectation(e.target.value)} placeholder="e.g. ₹10000-20000/month" /></div>
              </div>
              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(1)}>← Back</Button>
                <Button onClick={findMatches} disabled={searching} className="bg-gradient-to-r from-blue-600 to-indigo-600">
                  {searching ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" />Finding matches...</>) : (<><Zap className="w-4 h-4 mr-2" />Find My Matches</>)}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 3 && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900">{matches.length} matches found</h2>
                <p className="text-sm text-slate-600">AI-curated for your profile{selectedSectors.length > 0 ? ` · ${selectedSectors.join(", ")}` : ""}.</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => { setMatches([]); findMatches(); }} disabled={searching}>
                {searching ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : null}
                Refresh
              </Button>
            </div>

            <div className="rounded-lg border border-blue-100 bg-blue-50/60 px-4 py-3 text-sm text-blue-900 flex items-start gap-2">
              <Sparkles className="w-4 h-4 mt-0.5 shrink-0 text-blue-600" />
              <div>
                <p className="font-semibold">Apply to up to <span className="underline">2 picks for free</span> from these AI matches.</p>
                <p className="text-blue-800/80 text-xs mt-0.5">Come back any time and click "Refresh" — we'll pull a fresh set personalised to your latest profile.</p>
              </div>
            </div>

            {matches.length > 0 && showBasicMatchingNotice && !searching && (
              <p role="status" className="text-xs text-slate-500">
                Showing available opportunities with basic matching.
              </p>
            )}

            {matchError ? (
              <>
                <Card><CardContent className="py-12 text-center text-slate-600">{matchError}</CardContent></Card>
                {!searching && (
                  <DiscoverySearchLinks
                    category="ai_match"
                    hints={[...skills, preferredRole]}
                  />
                )}
              </>
            ) : matches.length === 0 ? (
              <>
                <Card><CardContent className="py-12 text-center text-slate-600">
                  <Briefcase className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                  No matches yet. Try refining your skills or profile.
                </CardContent></Card>
                {!searching && (
                  <DiscoverySearchLinks
                    category="ai_match"
                    hints={[...skills, preferredRole]}
                  />
                )}
              </>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {matches.map((m, i) => (
                    <OpportunityCard key={i} data={m} onApply={handleOpportunityApply} userId={user?.uid} alreadyApplied={Boolean((m as any).isInternal && (m as any).internalRecord?.id ? appliedIds.has((m as any).internalRecord.id) : m.id && appliedIds.has(m.id))} />
                  ))}
                </div>

                {/* Smart dynamic sections derived from match results */}
                <SmartSections
                  items={matches}
                  appliedIds={appliedIds}
                  onApply={handleOpportunityApply}
                />
              </>
            )}

            <div className="pt-2 text-center">
              <Button variant="ghost" size="sm" onClick={() => setStep(2)}>← Refine profile</Button>
            </div>
          </div>
        )}
      </main>

      <Dialog open={!!internalItem} onOpenChange={(open) => { if (!open && !isApplyingInternal) setInternalItem(null); }}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Apply to {internalItem?.item.title}</DialogTitle>
            <DialogDescription>
              This is an in-platform opportunity. Submit your application here; it will be sent to the company on StudentLancing.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Why are you a great fit? (optional)"
            value={internalApplyMessage}
            onChange={(event) => setInternalApplyMessage(event.target.value)}
            className="min-h-[100px]"
          />
          <Button onClick={submitInternalApplication} disabled={isApplyingInternal} className="w-full">
            {isApplyingInternal ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Submitting…</> : <><Send className="mr-2 h-4 w-4" />Submit Application</>}
          </Button>
        </DialogContent>
      </Dialog>
      <ExternalApplicationConfirmation
        item={externalItem?.item || null}
        open={!!externalItem}
        submitting={isMarkingApplied}
        onOpenChange={(open) => { if (!open && !isMarkingApplied) setExternalItem(null); }}
        onConfirm={markExternalApplied}
      />
      <ApplyGateModal open={showGate} onClose={() => setShowGate(false)} />
    </div>
  );
}
