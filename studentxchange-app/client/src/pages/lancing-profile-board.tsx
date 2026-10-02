import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, User, GraduationCap, FileText, Link2, Award,
  CheckCircle2, CloudUpload, Loader2, Pencil, X, ExternalLink,
  Shield, AlertCircle, Download,
} from "lucide-react";
import { useLancingAuth } from "@/hooks/use-lancing-auth";
import { auth, storage, firestore } from "@/lib/firebase";
import { doc, setDoc, onSnapshot, serverTimestamp, writeBatch } from "firebase/firestore";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { useToast } from "@/hooks/use-toast";
import { displayInstitutionName } from "@/lib/institution-display";

// ── Types ────────────────────────────────────────────────────────────────────

interface CareerCompassProfile {
  // Identity
  fullName?: string;
  gender?: string;
  dob?: string;
  phone?: string;
  email?: string;
  state?: string;
  address?: string;
  photoUrl?: string;
  // Academic
  university?: string;
  degree?: string;
  branch?: string;
  year?: string;
  urn?: string;
  division?: string;
  admissionYear?: string;
  marks10?: string;
  marks12?: string;
  diplomaPercentage?: string;
  cgpa?: string;
  // Documents
  documents?: Partial<Record<string, string>>;
  // Career
  linkedin?: string;
  github?: string;
  skills?: string[];
  certifications?: string[];
  // Placement status (read-only)
  spcrEligible?: boolean;
  placementScore?: number | null;
  coeApproved?: boolean;
}

// ── Constants ────────────────────────────────────────────────────────────────

const DOC_META = [
  { key: "profile_photo", label: "Profile Photo", accept: ".jpg,.jpeg,.png", maxMB: 2 },
  { key: "aadhaar_card", label: "Aadhaar Card", accept: ".pdf,.jpg,.jpeg,.png", maxMB: 5 },
  { key: "id_card", label: "College / University ID Card", accept: ".pdf,.jpg,.jpeg,.png", maxMB: 5 },
  { key: "marksheet_10th", label: "10th Marksheet", accept: ".pdf,.jpg,.jpeg,.png", maxMB: 10 },
  { key: "marksheet_12th_diploma", label: "12th / Diploma Marksheet", accept: ".pdf,.jpg,.jpeg,.png", maxMB: 10 },
  { key: "marksheet_latest_sem", label: "Latest Semester Marksheet", accept: ".pdf,.jpg,.jpeg,.png", maxMB: 10 },
] as const;

// ── Main Component ───────────────────────────────────────────────────────────

export default function LancingProfileBoardPage() {
  const [, setLocation] = useLocation();
  const { user, isAuthenticated, isLoading: authLoading } = useLancingAuth();
  const { toast } = useToast();

  const [profile, setProfile] = useState<CareerCompassProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [spcrStatus, setSpcrStatus] = useState<{ approval?: string; score?: number | null; coe?: string } | null>(null);

  // Edit modal state
  const [editSection, setEditSection] = useState<"identity" | "career" | null>(null);
  const [editForm, setEditForm] = useState<Partial<CareerCompassProfile>>({});
  const [saving, setSaving] = useState(false);

  // Document upload state
  const [docUploading, setDocUploading] = useState<Partial<Record<string, boolean>>>({});

  // Redirect unauthenticated users
  useEffect(() => {
    if (!authLoading && !isAuthenticated) setLocation("/lancing/login");
  }, [authLoading, isAuthenticated]);

  // Real-time subscription: merges career_compass_onboarding (canonical) + users/{uid}.career_compass_profile (documents + photo overrides)
  useEffect(() => {
    if (!user) return;
    setLoading(true);
    let usersData: any = {};
    let onbData: any = {};
    let usersLoaded = false;
    let onbLoaded = false;

    const merge = () => {
      const ccp = usersData?.career_compass_profile ?? {};
      const onb = onbData ?? {};
      // Field name unification: onboarding writes canonical names — map to display fields.
      // Onboarding writes: universityName, yearOfStudy, pct10, pct12, diplomaPct, currentCgpa, skillsKnown
      // Profile board legacy reads: university, year, marks10, marks12, diplomaPercentage, cgpa, skills
      // Edit-modal writes (post-fix) write BOTH names to keep both surfaces synced.
      const certs = onb.certifications ?? ccp.certifications ?? [];
      const certsArr: string[] = Array.isArray(certs)
        ? certs
        : (typeof certs === "string" ? certs.split(/[\n,]/).map((s: string) => s.trim()).filter(Boolean) : []);
      setProfile({
        fullName: onb.fullName ?? ccp.fullName ?? auth.currentUser?.displayName ?? "",
        email: onb.email ?? ccp.email ?? user.email ?? "",
        photoUrl: ccp.documents?.profile_photo ?? ccp.photoUrl ?? auth.currentUser?.photoURL ?? "",
        gender: onb.gender ?? ccp.gender ?? "",
        dob: onb.dob ?? ccp.dob ?? "",
        phone: onb.phone ?? ccp.phone ?? "",
        state: onb.state ?? ccp.state ?? "",
        address: onb.address ?? ccp.address ?? "",
        university: onb.universityName ?? ccp.university ?? ccp.universityName ?? "",
        degree: onb.degree ?? ccp.degree ?? "",
        branch: onb.branch ?? ccp.branch ?? "",
        year: onb.yearOfStudy ?? ccp.year ?? ccp.yearOfStudy ?? "",
        urn: onb.urn ?? ccp.urn ?? "",
        division: onb.division ?? ccp.division ?? "",
        admissionYear: onb.admissionYear ?? ccp.admissionYear ?? "",
        marks10: onb.pct10 ?? ccp.marks10 ?? ccp.pct10 ?? "",
        marks12: onb.pct12 ?? ccp.marks12 ?? ccp.pct12 ?? "",
        diplomaPercentage: onb.diplomaPct ?? ccp.diplomaPercentage ?? ccp.diplomaPct ?? "",
        cgpa: onb.currentCgpa ?? ccp.cgpa ?? ccp.currentCgpa ?? "",
        documents: ccp.documents ?? {},
        linkedin: onb.linkedin ?? ccp.linkedin ?? "",
        github: onb.github ?? ccp.github ?? "",
        skills: onb.skillsKnown ?? ccp.skills ?? ccp.skillsKnown ?? [],
        certifications: certsArr,
        spcrEligible: ccp.spcrEligible ?? false,
        placementScore: ccp.placementScore ?? null,
        coeApproved: ccp.coeApproved ?? false,
      });
      if (usersLoaded && onbLoaded) setLoading(false);
    };

    const unsubUsers = onSnapshot(doc(firestore, "users", user.uid), (snap) => {
      usersData = snap.data() ?? {};
      usersLoaded = true;
      merge();
    }, () => { usersLoaded = true; merge(); });

    const unsubOnb = onSnapshot(doc(firestore, "career_compass_onboarding", user.uid), (snap) => {
      onbData = snap.data() ?? {};
      onbLoaded = true;
      merge();
    }, () => { onbLoaded = true; merge(); });

    return () => { unsubUsers(); unsubOnb(); };
  }, [user]);

  // Subscribe to SPCR status (Section E) once we know the university
  useEffect(() => {
    if (!user || !profile?.university) return;
    const unsub = onSnapshot(
      doc(firestore, "spcr_students", profile.university, user.uid, "status"),
      (snap) => {
        const d = snap.data() ?? {};
        setSpcrStatus({
          approval: d.spcr_approval_status ?? "pending",
          score: typeof d.placement_score === "number" ? d.placement_score : null,
          coe: d.coe_approval_status ?? "pending",
        });
      },
      () => setSpcrStatus(null),
    );
    return () => unsub();
  }, [user, profile?.university]);

  // Save edited section: write to BOTH users/{uid}.career_compass_profile AND career_compass_onboarding/{uid}
  // using canonical onboarding field names, plus mirror to spcr_students/{university}/{uid}.
  const handleSaveEdit = async () => {
    if (!user || !profile) return;
    setSaving(true);
    try {
      // Build canonical write payload using onboarding field names
      const canonical: any = {};
      if (editForm.fullName !== undefined) canonical.fullName = editForm.fullName;
      if (editForm.gender !== undefined) canonical.gender = editForm.gender;
      if (editForm.dob !== undefined) canonical.dob = editForm.dob;
      if (editForm.phone !== undefined) canonical.phone = editForm.phone;
      if (editForm.state !== undefined) canonical.state = editForm.state;
      if (editForm.address !== undefined) canonical.address = editForm.address;
      if (editForm.linkedin !== undefined) canonical.linkedin = editForm.linkedin;
      if (editForm.github !== undefined) canonical.github = editForm.github;
      if (editForm.skills !== undefined) canonical.skillsKnown = editForm.skills;
      if (editForm.certifications !== undefined) canonical.certifications = editForm.certifications;
      canonical.updatedAt = serverTimestamp();

      // Atomic batched write across all three mirror locations
      const batch = writeBatch(firestore);
      batch.set(doc(firestore, "career_compass_onboarding", user.uid), canonical, { merge: true });
      batch.set(doc(firestore, "users", user.uid), { career_compass_profile: { ...editForm, ...canonical } }, { merge: true });
      if (profile.university) {
        batch.set(doc(firestore, "spcr_students", profile.university, user.uid, "profile"), canonical, { merge: true });
      }
      await batch.commit();

      toast({ title: "Saved", description: "Your profile has been updated." });
      setEditSection(null);
      setEditForm({});
    } catch (e: any) {
      console.error("Save failed:", e);
      toast({ title: "Save failed", description: e?.message || "Please try again.", variant: "destructive" });
    }
    setSaving(false);
  };

  // Upload a document
  const handleDocUpload = async (key: string, file: File, maxMB: number) => {
    if (!user) return;
    if (file.size > maxMB * 1024 * 1024) { alert(`File exceeds ${maxMB}MB limit`); return; }
    setDocUploading((p) => ({ ...p, [key]: true }));
    try {
      const filename = `${Date.now()}_${file.name}`;
      const fileRef = storageRef(storage, `student-documents/${user.uid}/${key}/${filename}`);
      await uploadBytes(fileRef, file);
      const url = await getDownloadURL(fileRef);
      const updatedDocs = { ...(profile?.documents ?? {}), [key]: url };
      const updatedProfile = { ...profile!, documents: updatedDocs };
      await setDoc(doc(firestore, "users", user.uid), { career_compass_profile: { documents: updatedDocs } }, { merge: true });
      const university = profile?.university;
      if (university) {
        await setDoc(doc(firestore, "spcr_students", university, user.uid, "documents"), updatedDocs, { merge: true });
      }
      setProfile(updatedProfile);
    } catch (e) {
      console.error("Upload failed:", e);
      alert("Upload failed. Please try again.");
    }
    setDocUploading((p) => ({ ...p, [key]: false }));
  };

  const handleExportCVPDF = async () => {
    if (!profile) return;
    try {
      const { jsPDF } = await import("jspdf");
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const margin = 18;
      let y = 20;

      const section = (title: string) => {
        pdf.setFillColor(79, 70, 229);
        pdf.rect(margin, y, 174, 7, "F");
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(10);
        pdf.setFont("helvetica", "bold");
        pdf.text(title, margin + 3, y + 5);
        pdf.setTextColor(30, 30, 30);
        y += 10;
      };

      const row = (label: string, value: string | undefined) => {
        if (!value) return;
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(8.5);
        pdf.text(label + ":", margin, y);
        pdf.setFont("helvetica", "normal");
        const lines = pdf.splitTextToSize(value, 120);
        pdf.text(lines, margin + 40, y);
        y += lines.length * 5 + 1;
      };

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(20);
      pdf.setTextColor(79, 70, 229);
      pdf.text(profile.fullName || "Student CV", margin, y);
      y += 7;
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9);
      pdf.setTextColor(80, 80, 80);
      const contact = [profile.email, profile.phone, displayInstitutionName(profile.university, "")].filter(Boolean).join("  |  ");
      pdf.text(contact, margin, y);
      y += 10;

      section("Personal Information");
      row("Gender", profile.gender);
      row("Date of Birth", profile.dob);
      row("Phone", profile.phone);
      row("State", profile.state);
      row("Address", profile.address);
      y += 3;

      section("Academic Details");
      row("University", displayInstitutionName(profile.university, "—"));
      row("Degree", profile.degree);
      row("Branch", profile.branch);
      row("Year of Study", profile.year);
      row("URN", profile.urn);
      row("CGPA", profile.cgpa);
      row("10th Marks", profile.marks10 ? profile.marks10 + "%" : undefined);
      row("12th / Diploma", profile.marks12 ? profile.marks12 + "%" : (profile.diplomaPercentage ? profile.diplomaPercentage + "%" : undefined));
      y += 3;

      section("Career Links");
      row("LinkedIn", profile.linkedin);
      row("GitHub", profile.github);
      y += 3;

      if (profile.skills && profile.skills.length > 0) {
        section("Skills");
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(8.5);
        const skillLines = pdf.splitTextToSize(profile.skills.join(", "), 174);
        pdf.text(skillLines, margin, y);
        y += skillLines.length * 5 + 3;
      }

      if (profile.certifications && profile.certifications.length > 0) {
        section("Certifications");
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(8.5);
        profile.certifications.forEach((c: string) => {
          pdf.text(`• ${c}`, margin + 2, y);
          y += 5;
        });
      }

      pdf.setFont("helvetica", "italic");
      pdf.setFontSize(7);
      pdf.setTextColor(150, 150, 150);
      pdf.text("Generated by StudentXchange · StudentLancing", margin, 285);

      const safeName = (profile.fullName || "CV").replace(/\s+/g, "_");
      pdf.save(`${safeName}_CV.pdf`);
    } catch (e) {
      console.error("PDF export failed:", e);
      alert("PDF export failed. Please try again.");
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-sky-500 animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4 px-4">
        <AlertCircle className="w-10 h-10 text-red-400" />
        <p className="text-gray-600 text-sm">Could not load your profile. Please try again.</p>
        <Button variant="outline" onClick={() => setLocation("/lancing/freelancer-dashboard")}>
          Back to Dashboard
        </Button>
      </div>
    );
  }

  const initials = (profile.fullName || "?").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Header ── */}
      <header className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center gap-3">
          <Link href="/lancing/freelancer-dashboard">
            <button className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
              <ArrowLeft className="w-4 h-4" />
            </button>
          </Link>
          <div className="flex-1">
            <h1 className="text-base font-black text-gray-900">My Profile</h1>
            <p className="text-[10px] text-gray-400">StudentLancing · Career Compass</p>
          </div>
          <button
            onClick={handleExportCVPDF}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition-colors"
          >
            <Download className="w-3.5 h-3.5" /> Download CV
          </button>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">

        {/* ── Section A: Identity & Photo ── */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-sky-500" />
              <span className="text-sm font-black text-gray-800">Identity & Photo</span>
            </div>
            <button
              onClick={() => { setEditSection("identity"); setEditForm({ fullName: profile.fullName, gender: profile.gender, dob: profile.dob, phone: profile.phone, state: profile.state, address: profile.address }); }}
              className="flex items-center gap-1 text-xs font-semibold text-sky-600 hover:text-sky-700"
            >
              <Pencil className="w-3 h-3" /> Edit
            </button>
          </div>
          <div className="p-5 flex gap-4">
            {/* Avatar */}
            <div className="flex-shrink-0">
              {profile.photoUrl || profile.documents?.profile_photo ? (
                <img
                  src={(profile.documents?.profile_photo ?? profile.photoUrl) as string}
                  alt={profile.fullName}
                  className="w-20 h-20 rounded-xl object-cover border-2 border-sky-100"
                />
              ) : (
                <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center text-2xl font-black text-white">
                  {initials}
                </div>
              )}
            </div>
            {/* Fields */}
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
              <Field label="Full Name" value={profile.fullName} />
              <Field label="Email" value={profile.email} />
              <Field label="Phone" value={profile.phone} />
              <Field label="Gender" value={profile.gender} />
              <Field label="Date of Birth" value={profile.dob ? formatDob(profile.dob) : ""} />
              <Field label="State" value={profile.state} />
              <Field label="Address" value={profile.address} fullWidth />
            </div>
          </div>
        </div>

        {/* ── Section B: Academic Details ── */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-5 pt-5 pb-3 border-b border-gray-100">
            <GraduationCap className="w-4 h-4 text-indigo-500" />
            <span className="text-sm font-black text-gray-800">Academic Details</span>
            <span className="text-[10px] text-gray-400 ml-auto">Read from SPCR / COE</span>
          </div>
          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
            <Field label="University" value={displayInstitutionName(profile.university, "—")} />
            <Field label="Degree" value={profile.degree} />
            <Field label="Branch" value={profile.branch} />
            <Field label="Year of Study" value={profile.year} />
            <Field label="URN" value={profile.urn} />
            <Field label="Division" value={profile.division} />
            <Field label="Admission Year" value={profile.admissionYear} />
            <Field label="CGPA" value={profile.cgpa} note="Editable only by COE" />
            <Field label="10th Marks %" value={profile.marks10} />
            <Field label="12th Marks %" value={profile.marks12} />
            <Field label="Diploma %" value={profile.diplomaPercentage} />
          </div>
        </div>

        {/* ── Section C: Documents ── */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-500" />
              <span className="text-sm font-black text-gray-800">Documents</span>
            </div>
            <span className="text-[10px] text-gray-400">
              {Object.values(profile.documents ?? {}).filter(Boolean).length} / {DOC_META.length} uploaded
            </span>
          </div>
          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {DOC_META.map(({ key, label, accept, maxMB }) => {
              const url = profile.documents?.[key] as string | undefined;
              const uploading = !!docUploading[key];
              const isImage = key === "profile_photo" || (url && !url.includes(".pdf") && (url.includes("jpg") || url.includes("jpeg") || url.includes("png") || url.includes("webp") || url.includes("token=")));
              return (
                <div key={key} className={`border rounded-xl overflow-hidden transition-all ${url ? "border-emerald-200 bg-emerald-50/30" : "border-gray-200"}`}>
                  {/* Image preview for photos */}
                  {url && isImage && (
                    <a href={url} target="_blank" rel="noopener noreferrer" className="block">
                      <img
                        src={url}
                        alt={label}
                        className="w-full h-32 object-cover border-b border-emerald-100 hover:opacity-90 transition-opacity"
                      />
                    </a>
                  )}
                  {/* PDF preview tile */}
                  {url && !isImage && (
                    <a href={url} target="_blank" rel="noopener noreferrer" className="block bg-red-50 border-b border-red-100 h-20 flex flex-col items-center justify-center gap-1 hover:bg-red-100 transition-colors">
                      <FileText className="w-8 h-8 text-red-400" />
                      <span className="text-[10px] text-red-500 font-semibold">PDF — click to view</span>
                    </a>
                  )}
                  <div className="p-3 flex flex-col gap-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-xs font-bold text-gray-700">{label}</p>
                        <p className="text-[10px] text-gray-400">Max {maxMB}MB</p>
                      </div>
                      {uploading ? (
                        <Loader2 className="w-4 h-4 text-sky-500 animate-spin flex-shrink-0" />
                      ) : url ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                      ) : (
                        <div className="w-4 h-4 rounded-full border-2 border-gray-300 flex-shrink-0" />
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {url && (
                        <a href={url} target="_blank" rel="noopener noreferrer">
                          <Button size="sm" variant="outline" className="h-7 text-[11px] px-2 gap-1">
                            <ExternalLink className="w-3 h-3" /> View
                          </Button>
                        </a>
                      )}
                      <label className="cursor-pointer">
                        <Button size="sm" variant={url ? "outline" : "default"} className={`h-7 text-[11px] px-2 gap-1 pointer-events-none ${!url ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""}`} asChild={false}>
                          <span className="flex items-center gap-1">
                            <CloudUpload className="w-3 h-3" />
                            {url ? "Replace" : "Upload"}
                          </span>
                        </Button>
                        <input
                          type="file"
                          accept={accept}
                          className="sr-only"
                          disabled={uploading}
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) handleDocUpload(key, f, maxMB);
                            e.target.value = "";
                          }}
                        />
                      </label>
                      {!url && !uploading && (
                        <span className="text-[10px] text-gray-400">Not uploaded</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Section D: Career & Social Links ── */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Link2 className="w-4 h-4 text-violet-500" />
              <span className="text-sm font-black text-gray-800">Career & Social Links</span>
            </div>
            <button
              onClick={() => {
                setEditSection("career");
                setEditForm({
                  linkedin: profile.linkedin,
                  github: profile.github,
                  skills: profile.skills,
                  certifications: profile.certifications,
                });
              }}
              className="flex items-center gap-1 text-xs font-semibold text-sky-600 hover:text-sky-700"
            >
              <Pencil className="w-3 h-3" /> Edit
            </button>
          </div>
          <div className="p-5 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
              <div>
                <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide mb-0.5">LinkedIn</p>
                {profile.linkedin ? (
                  <a href={profile.linkedin} target="_blank" rel="noopener noreferrer" className="text-xs text-sky-600 hover:underline flex items-center gap-1">
                    {profile.linkedin} <ExternalLink className="w-3 h-3" />
                  </a>
                ) : <p className="text-xs text-gray-400">Not added</p>}
              </div>
              <div>
                <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide mb-0.5">GitHub</p>
                {profile.github ? (
                  <a href={profile.github} target="_blank" rel="noopener noreferrer" className="text-xs text-sky-600 hover:underline flex items-center gap-1">
                    {profile.github} <ExternalLink className="w-3 h-3" />
                  </a>
                ) : <p className="text-xs text-gray-400">Not added</p>}
              </div>
            </div>
            <div>
              <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide mb-1.5">Skills</p>
              {profile.skills && profile.skills.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {profile.skills.map((s) => (
                    <Badge key={s} variant="secondary" className="text-[11px] bg-sky-50 text-sky-700 border border-sky-100">{s}</Badge>
                  ))}
                </div>
              ) : <p className="text-xs text-gray-400">No skills listed</p>}
            </div>
            <div>
              <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide mb-1.5">Certifications</p>
              {profile.certifications && profile.certifications.length > 0 ? (
                <ul className="space-y-1">
                  {profile.certifications.map((c) => (
                    <li key={c} className="flex items-center gap-1.5 text-xs text-gray-700">
                      <Award className="w-3 h-3 text-amber-500 flex-shrink-0" />{c}
                    </li>
                  ))}
                </ul>
              ) : <p className="text-xs text-gray-400">No certifications listed</p>}
            </div>
          </div>
        </div>

        {/* ── Section E: Placement Status ── */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-5 pt-5 pb-3 border-b border-gray-100">
            <Shield className="w-4 h-4 text-rose-500" />
            <span className="text-sm font-black text-gray-800">Placement Status</span>
            <span className="text-[10px] text-gray-400 ml-auto">Read-only · Managed by SPCR / COE</span>
          </div>
          <div className="p-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatusCard
              label="SPCR Shortlist"
              value={spcrStatus?.approval === "approved" ? "✓ Approved" : spcrStatus?.approval === "rejected" ? "✗ Rejected" : "Pending"}
              ok={spcrStatus?.approval === "approved"}
            />
            <StatusCard
              label="Placement Engine Score"
              value={spcrStatus?.score != null ? `${spcrStatus.score}%` : (profile.placementScore != null ? `${profile.placementScore}%` : "Not taken")}
              ok={(spcrStatus?.score ?? profile.placementScore ?? 0) >= 60}
            />
            <StatusCard
              label="COE Approval"
              value={spcrStatus?.coe === "approved" ? "✓ Approved" : (profile.coeApproved ? "Approved" : "Pending")}
              ok={spcrStatus?.coe === "approved" || !!profile.coeApproved}
            />
          </div>
        </div>

      </div>

      {/* ── Edit Modal ── */}
      {editSection && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="text-sm font-black text-gray-900">
                {editSection === "identity" ? "Edit Identity & Photo" : "Edit Career & Social Links"}
              </h3>
              <button onClick={() => { setEditSection(null); setEditForm({}); }} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="overflow-y-auto p-5 space-y-3">
              {editSection === "identity" && (
                <>
                  <EditField label="Full Name" value={editForm.fullName ?? ""} onChange={(v) => setEditForm((p) => ({ ...p, fullName: v }))} />
                  <EditField label="Gender" value={editForm.gender ?? ""} onChange={(v) => setEditForm((p) => ({ ...p, gender: v }))} select={["", "Male", "Female", "Non-binary", "Prefer not to say"]} />
                  <EditField label="Date of Birth" type="date" value={editForm.dob ?? ""} onChange={(v) => setEditForm((p) => ({ ...p, dob: v }))} />
                  <EditField label="Phone" type="tel" value={editForm.phone ?? ""} onChange={(v) => setEditForm((p) => ({ ...p, phone: v }))} />
                  <EditField label="State" value={editForm.state ?? ""} onChange={(v) => setEditForm((p) => ({ ...p, state: v }))} />
                  <EditField label="Address" value={editForm.address ?? ""} onChange={(v) => setEditForm((p) => ({ ...p, address: v }))} textarea />
                </>
              )}
              {editSection === "career" && (
                <>
                  <EditField label="LinkedIn URL" value={editForm.linkedin ?? ""} onChange={(v) => setEditForm((p) => ({ ...p, linkedin: v }))} />
                  <EditField label="GitHub URL" value={editForm.github ?? ""} onChange={(v) => setEditForm((p) => ({ ...p, github: v }))} />
                  <div>
                    <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-1 block">Skills (comma-separated)</label>
                    <input
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-200"
                      value={(editForm.skills ?? []).join(", ")}
                      onChange={(e) => setEditForm((p) => ({ ...p, skills: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) }))}
                      placeholder="React, Node.js, Python…"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-1 block">Certifications (one per line)</label>
                    <textarea
                      rows={3}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-200 resize-none"
                      value={(editForm.certifications ?? []).join("\n")}
                      onChange={(e) => setEditForm((p) => ({ ...p, certifications: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean) }))}
                      placeholder="AWS Cloud Practitioner&#10;Google Analytics"
                    />
                  </div>
                </>
              )}
            </div>
            <div className="px-5 py-4 border-t border-gray-100 flex gap-2">
              <Button variant="outline" onClick={() => { setEditSection(null); setEditForm({}); }} className="flex-1">Cancel</Button>
              <Button onClick={handleSaveEdit} disabled={saving} className="flex-1 bg-sky-600 hover:bg-sky-700 text-white">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Small helper components ──────────────────────────────────────────────────

function formatDob(raw: string): string {
  if (!raw) return "";
  const d = new Date(raw);
  if (isNaN(d.getTime())) return raw;
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function Field({ label, value, note, fullWidth }: { label: string; value?: string; note?: string; fullWidth?: boolean }) {
  return (
    <div className={fullWidth ? "sm:col-span-2" : ""}>
      <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide mb-0.5">
        {label}{note && <span className="normal-case ml-1 text-gray-300">({note})</span>}
      </p>
      <p className="text-sm text-gray-800 font-medium">{value || <span className="text-gray-300 font-normal">—</span>}</p>
    </div>
  );
}

function StatusCard({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return (
    <div className={`rounded-xl border p-3 text-center ${ok ? "border-emerald-200 bg-emerald-50" : "border-gray-200 bg-gray-50"}`}>
      <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide mb-1">{label}</p>
      <p className={`text-sm font-black ${ok ? "text-emerald-700" : "text-gray-500"}`}>{value}</p>
    </div>
  );
}

function EditField({
  label, value, onChange, type = "text", select, textarea,
}: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; select?: string[]; textarea?: boolean;
}) {
  const baseClass = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-200";
  return (
    <div>
      <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-1 block">{label}</label>
      {select ? (
        <select className={baseClass} value={value} onChange={(e) => onChange(e.target.value)}>
          {select.map((o) => <option key={o} value={o}>{o || "Select…"}</option>)}
        </select>
      ) : textarea ? (
        <textarea rows={3} className={`${baseClass} resize-none`} value={value} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input type={type} className={baseClass} value={value} onChange={(e) => onChange(e.target.value)} />
      )}
    </div>
  );
}
