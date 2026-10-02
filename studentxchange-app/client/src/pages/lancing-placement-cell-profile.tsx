import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { GraduationCap, Loader2, Upload, CheckCircle2, ArrowLeft, ArrowRight, Building2, FileText, Clock } from "lucide-react";
import { useLancingAuth } from "@/hooks/use-lancing-auth";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { auth } from "@/lib/firebase";
import SEOHead from "@/components/seo/seo-head";

interface PCForm {
  collegeName: string;
  contactName: string;
  designation: string;
  phone: string;
  officialEmail: string;
  website: string;
  address: string;
  description: string;
}

export default function LancingPlacementCellProfile() {
  const { user, isAuthenticated, role, isLoading: authLoading } = useLancingAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const logoInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState(1);
  const [form, setForm] = useState<PCForm>({
    collegeName: "", contactName: "", designation: "", phone: "",
    officialEmail: user?.email || "", website: "", address: "", description: "",
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docName, setDocName] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    setAuthChecked(true);
    if (!isAuthenticated) { setLocation("/lancing/login"); return; }
    if (role && role !== "placement_cell") { setLocation("/lancing/role-select"); return; }
    if (user?.email && !form.officialEmail) setForm(f => ({ ...f, officialEmail: user.email }));

    (async () => {
      try {
        const token = await auth.currentUser?.getIdToken();
        if (!token) { setLoadingProfile(false); return; }
        const res = await fetch("/api/placement-cell/profile", { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json();
        if (data.profile) {
          setForm({
            collegeName: data.profile.collegeName || "",
            contactName: data.profile.contactName || "",
            designation: data.profile.designation || "",
            phone: data.profile.phone || "",
            officialEmail: data.profile.officialEmail || user?.email || "",
            website: data.profile.website || "",
            address: data.profile.address || "",
            description: data.profile.description || "",
          });
          if (data.profile.logoUrl) setLogoPreview(data.profile.logoUrl);
          if (data.profile.verificationDocUrl) setDocName("Previously uploaded");
        }
      } catch {}
      setLoadingProfile(false);
    })();
  }, [authLoading, isAuthenticated, role, user]);

  const onLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      if (f.size > 5 * 1024 * 1024) return toast({ title: "Logo must be < 5MB", variant: "destructive" });
      setLogoFile(f);
      setLogoPreview(URL.createObjectURL(f));
    }
  };
  const onDoc = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      if (f.size > 10 * 1024 * 1024) return toast({ title: "Document must be < 10MB", variant: "destructive" });
      setDocFile(f);
      setDocName(f.name);
    }
  };

  const uploadFile = async (file: File, fileType: string): Promise<string> => {
    const token = await auth.currentUser?.getIdToken();
    if (!token) throw new Error("Not authenticated");
    const fd = new FormData();
    fd.append("file", file);
    fd.append("fileType", fileType);
    const res = await fetch("/api/collab/lancing/upload", { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: fd });
    if (!res.ok) throw new Error((await res.json()).error || "Upload failed");
    return (await res.json()).url;
  };

  const validStep1 = () => form.collegeName && form.contactName && form.designation && form.phone && form.officialEmail;
  const validStep2 = () => form.address;

  const submit = async () => {
    if (!user) return;
    setSubmitting(true);
    try {
      let logoUrl = logoPreview;
      let docUrl: string | null = null;
      if (logoFile) logoUrl = await uploadFile(logoFile, "logo");
      if (docFile) docUrl = await uploadFile(docFile, "doc");
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch("/api/placement-cell/profile", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, logoUrl, verificationDocUrl: docUrl }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Save failed");
      toast({ title: "Profile submitted!", description: "We'll review your details shortly." });
      setSubmitted(true);
    } catch (e: any) {
      toast({ title: "Failed to save", description: e.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || !authChecked || loadingProfile) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>;
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-violet-50 flex items-center justify-center p-6">
        <SEOHead title="Submitted - Placement Cell" description="Profile submitted" />
        <Card className="max-w-lg w-full border-2 border-indigo-100 rounded-3xl shadow-2xl">
          <CardContent className="p-10 text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg">
              <Clock className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold mb-3">Profile Submitted</h2>
            <p className="text-gray-600 mb-2">Your placement cell profile has been received.</p>
            <p className="text-sm text-amber-600 font-medium mb-6">Status: Pending Verification</p>
            <p className="text-sm text-gray-500 mb-6">
              While we verify your credentials, you can already access your dashboard and start managing drives.
              Drives posted before verification will be marked as "unverified" to applicants.
            </p>
            <Button onClick={() => setLocation("/lancing/placement-cell-dashboard")} className="w-full bg-gradient-to-r from-indigo-600 to-violet-500 text-white h-12 rounded-xl">
              Go to Dashboard <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-violet-50 py-10 px-4">
      <SEOHead title="Placement Cell Profile" description="Create your placement cell profile" />
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
            <GraduationCap className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Set up your Placement Cell</h1>
            <p className="text-sm text-gray-600">Step {step} of 3</p>
          </div>
        </div>

        {/* Progress */}
        <div className="flex gap-2 mb-8">
          {[1, 2, 3].map(n => (
            <div key={n} className={`flex-1 h-2 rounded-full transition-colors ${step >= n ? "bg-indigo-600" : "bg-gray-200"}`} />
          ))}
        </div>

        <Card className="border-2 border-indigo-100 rounded-3xl shadow-xl">
          <CardContent className="p-8">
            {step === 1 && (
              <div className="space-y-5">
                <h2 className="text-xl font-bold flex items-center gap-2"><Building2 className="w-5 h-5 text-indigo-600" /> College & Contact</h2>
                <div>
                  <Label>College / University name *</Label>
                  <Input value={form.collegeName} onChange={e => setForm({ ...form, collegeName: e.target.value })} placeholder="e.g. ADYPU School of Engineering" data-testid="input-college-name" />
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <Label>Contact person *</Label>
                    <Input value={form.contactName} onChange={e => setForm({ ...form, contactName: e.target.value })} placeholder="Full name" data-testid="input-contact-name" />
                  </div>
                  <div>
                    <Label>Designation *</Label>
                    <Input value={form.designation} onChange={e => setForm({ ...form, designation: e.target.value })} placeholder="e.g. TPO, SPCR Head" data-testid="input-designation" />
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <Label>Phone *</Label>
                    <Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="10-digit number" data-testid="input-phone" />
                  </div>
                  <div>
                    <Label>Official email *</Label>
                    <Input type="email" value={form.officialEmail} onChange={e => setForm({ ...form, officialEmail: e.target.value })} data-testid="input-email" />
                  </div>
                </div>
                <Button onClick={() => validStep1() ? setStep(2) : toast({ title: "Fill all required fields", variant: "destructive" })} className="w-full h-12 bg-gradient-to-r from-indigo-600 to-violet-500 text-white rounded-xl" data-testid="button-next-step-1">
                  Next <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-5">
                <h2 className="text-xl font-bold flex items-center gap-2"><Building2 className="w-5 h-5 text-indigo-600" /> Address & Website</h2>
                <div>
                  <Label>Full address *</Label>
                  <Textarea value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="Street, City, State, PIN" rows={3} data-testid="input-address" />
                </div>
                <div>
                  <Label>Website</Label>
                  <Input value={form.website} onChange={e => setForm({ ...form, website: e.target.value })} placeholder="https://yourcollege.edu" data-testid="input-website" />
                </div>
                <div>
                  <Label>Short description</Label>
                  <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Briefly tell us about your placement cell" rows={3} data-testid="input-description" />
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setStep(1)} className="h-12 rounded-xl"><ArrowLeft className="w-4 h-4 mr-2" /> Back</Button>
                  <Button onClick={() => validStep2() ? setStep(3) : toast({ title: "Address is required", variant: "destructive" })} className="flex-1 h-12 bg-gradient-to-r from-indigo-600 to-violet-500 text-white rounded-xl" data-testid="button-next-step-2">
                    Next <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-5">
                <h2 className="text-xl font-bold flex items-center gap-2"><FileText className="w-5 h-5 text-indigo-600" /> Verification</h2>
                <p className="text-sm text-gray-600">Logo and verification document help us verify your placement cell faster.</p>
                <div>
                  <Label>College logo</Label>
                  <div className="flex items-center gap-4 mt-2">
                    <div className="w-20 h-20 rounded-2xl border-2 border-dashed border-indigo-200 bg-indigo-50 flex items-center justify-center overflow-hidden">
                      {logoPreview ? <img src={logoPreview} className="w-full h-full object-cover" alt="logo" /> : <Building2 className="w-8 h-8 text-indigo-300" />}
                    </div>
                    <Button type="button" variant="outline" onClick={() => logoInputRef.current?.click()} className="rounded-xl">
                      <Upload className="w-4 h-4 mr-2" /> Upload logo
                    </Button>
                    <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={onLogo} />
                  </div>
                </div>
                <div>
                  <Label>Verification document (PDF)</Label>
                  <div className="flex items-center gap-4 mt-2">
                    <div className="flex-1 p-3 rounded-xl border-2 border-dashed border-indigo-200 bg-indigo-50 text-sm text-gray-600 truncate">
                      {docName || "No file selected"}
                    </div>
                    <Button type="button" variant="outline" onClick={() => docInputRef.current?.click()} className="rounded-xl">
                      <Upload className="w-4 h-4 mr-2" /> Upload doc
                    </Button>
                    <input ref={docInputRef} type="file" accept=".pdf,application/pdf,image/*" className="hidden" onChange={onDoc} />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Letter of authority, college ID, or institutional approval.</p>
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setStep(2)} className="h-12 rounded-xl"><ArrowLeft className="w-4 h-4 mr-2" /> Back</Button>
                  <Button onClick={submit} disabled={submitting} className="flex-1 h-12 bg-gradient-to-r from-indigo-600 to-violet-500 text-white rounded-xl" data-testid="button-submit-profile">
                    {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Submit for Verification <CheckCircle2 className="w-4 h-4 ml-2" /></>}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
