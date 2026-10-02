import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Briefcase, Loader2, Upload, X, ArrowLeft, Camera, Plus, Mail, Clock, CheckCircle2, FileText, Sparkles, User, Trash2, Crown, Check, Lock } from "lucide-react";
import { useLancingAuth } from "@/hooks/use-lancing-auth";
import { useLocation, Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { firestore, auth } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import SEOHead from "@/components/seo/seo-head";
import { useCareerSubscription } from "@/hooks/use-career-subscription";
import { useCareerPricing } from "@/hooks/use-career-pricing";
import CareerCompassPlanModal from "@/components/lancing/career-compass-plan-modal";

const SKILL_OPTIONS = [
  // Computer Science
  "JavaScript", "TypeScript", "React", "Node.js", "Python", "Java", "C++", "C#",
  "HTML/CSS", "Vue.js", "Angular", "MongoDB", "SQL", "PostgreSQL", "Firebase",
  "AWS", "Docker", "UI/UX Design", "Figma", "Web Development", "Mobile Development",
  "Android", "iOS", "Flutter", "React Native", "Machine Learning", "AI", "Data Science",
  "Data Analysis", "TensorFlow", "PyTorch", "WordPress", "SEO", "DevOps", "Git",
  
  // Engineering
  "CAD", "AutoCAD", "3D Modeling", "Mechanical Design", "Circuit Design", "Arduino",
  "Embedded Systems", "Robotics", "MATLAB", "Simulink", "SolidWorks", "CATIA",
  
  // Business & Economics
  "Business Analysis", "Market Research", "Excel", "Financial Analysis", "Accounting",
  "Supply Chain", "Project Management", "Scrum", "Agile", "SAP", "Business Writing",
  
  // Design & Multimedia
  "Graphic Design", "Logo Design", "Branding", "Video Editing", "After Effects", "Premiere Pro",
  "Photography", "Photo Editing", "Photoshop", "Illustrator", "InDesign", "Animation",
  "Motion Graphics", "3D Animation", "Blender", "Web Design", "UI Design", "UX Design",
  
  // Content & Communication
  "Content Writing", "Copywriting", "Technical Writing", "Blog Writing", "SEO Writing",
  "Social Media Marketing", "Email Marketing", "Marketing Strategy", "Advertising",
  "Communications", "Public Speaking", "Presentation Design",
  
  // Languages & Translation
  "English", "Hindi", "Spanish", "French", "German", "Chinese", "Japanese", "Arabic",
  "Translation", "Proofreading", "Editing", "Localization",
  
  // Science & Research
  "Research", "Scientific Writing", "Data Collection", "Statistics", "Chemistry",
  "Physics", "Biology", "Biotechnology", "Pharmaceutical Research",
  
  // Mathematics
  "Calculus", "Linear Algebra", "Statistics", "Probability", "Discrete Mathematics",
  "Geometry", "Trigonometry", "Abstract Algebra",
  
  // Education & Tutoring
  "Tutoring", "Teaching", "Curriculum Design", "Lesson Planning", "Online Teaching",
  "STEM Education", "Language Teaching",
  
  // Humanities & Social Sciences
  "History", "Literature", "Philosophy", "Psychology", "Sociology", "Political Science",
  "Anthropology", "Geography", "Environmental Science",
  
  // Law & Administration
  "Legal Research", "Contract Writing", "Documentation", "Administrative Support",
  
  // Media & Journalism
  "Journalism", "News Writing", "Interviewing", "Podcast Production", "Audio Editing",
  "Live Streaming", "Video Production",
  
  // Other Professional Skills
  "Customer Service", "Sales", "Negotiation", "Problem Solving", "Critical Thinking",
  "Leadership", "Team Management", "Communication", "Time Management", "Organization"
];

interface ProfileData {
  fullName: string;
  phoneNumber: string;
  aboutMe: string;
  skills: string[];
  experienceYears: string;
  experienceDescription: string;
  profileImageUrl?: string;
  resumeUrl?: string;
  certificateUrl?: string;
  email?: string;
  microTaskPreferences: string[];
  internshipFieldPreferences: string[];
}

export default function LancingProfileEditPage() {
  const { user, isAuthenticated, role, isLoading: authLoading } = useLancingAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const resumeInputRef = useRef<HTMLInputElement>(null);
  const certificateInputRef = useRef<HTMLInputElement>(null);
  const { isPremium, isLoading: subLoading } = useCareerSubscription(isAuthenticated);
  const { pricing } = useCareerPricing();
  const [showPlanModal, setShowPlanModal] = useState(false);

  const [formData, setFormData] = useState<ProfileData>({
    fullName: "",
    phoneNumber: "",
    aboutMe: "",
    skills: [],
    experienceYears: "",
    experienceDescription: "",
    email: "",
    microTaskPreferences: [],
    internshipFieldPreferences: []
  });

  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [profileImagePreview, setProfileImagePreview] = useState<string | null>(null);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [certificateFile, setCertificateFile] = useState<File | null>(null);
  const [skillInput, setSkillInput] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeletingResume, setIsDeletingResume] = useState(false);
  const [isDeletingCertificate, setIsDeletingCertificate] = useState(false);
  const [shouldRedirect, setShouldRedirect] = useState<string | null>(null);

  useEffect(() => {
    if (shouldRedirect) {
      setLocation(shouldRedirect);
    }
  }, [shouldRedirect, setLocation]);

  useEffect(() => {
    if (authLoading) return;
    
    if (!isAuthenticated || role !== "freelancer") {
      setShouldRedirect("/student-lancing");
      return;
    }
    
    loadProfileData();
  }, [authLoading, isAuthenticated, role]);

  const loadProfileData = async () => {
    if (!user) return;
    
    try {
      const profileDoc = await getDoc(doc(firestore, "lancing_users", user.uid, "profile", "data"));
      if (profileDoc.exists()) {
        const data = profileDoc.data() as ProfileData;
        setFormData({
          fullName: data.fullName || "",
          phoneNumber: data.phoneNumber || "",
          aboutMe: data.aboutMe || "",
          skills: data.skills || [],
          experienceYears: data.experienceYears || "",
          experienceDescription: data.experienceDescription || "",
          email: user.email || data.email || "",
          profileImageUrl: data.profileImageUrl,
          resumeUrl: data.resumeUrl,
          certificateUrl: data.certificateUrl,
          microTaskPreferences: data.microTaskPreferences || [],
          internshipFieldPreferences: data.internshipFieldPreferences || []
        });
        if (data.profileImageUrl) {
          setProfileImagePreview(data.profileImageUrl);
        }
      } else {
        setFormData(prev => ({ ...prev, email: user.email || "" }));
      }
    } catch (error) {
      console.error("Error loading profile:", error);
      toast({ title: "Error loading profile", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({ title: "Image too large", description: "Max 5MB allowed", variant: "destructive" });
        return;
      }
      setProfileImage(file);
      setProfileImagePreview(URL.createObjectURL(file));
    }
  };

  const handleResumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== "application/pdf") {
        toast({ title: "Invalid file type", description: "Only PDF files allowed", variant: "destructive" });
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast({ title: "File too large", description: "Max 10MB allowed", variant: "destructive" });
        return;
      }
      setResumeFile(file);
    }
  };

  const handleCertificateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== "application/pdf") {
        toast({ title: "Invalid file type", description: "Only PDF files allowed", variant: "destructive" });
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast({ title: "File too large", description: "Max 10MB allowed", variant: "destructive" });
        return;
      }
      setCertificateFile(file);
    }
  };

  const addSkill = (skill: string) => {
    if (skill && !formData.skills.includes(skill) && formData.skills.length < 10) {
      setFormData({ ...formData, skills: [...formData.skills, skill] });
      setSkillInput("");
    }
  };

  const removeSkill = (skill: string) => {
    setFormData({ ...formData, skills: formData.skills.filter(s => s !== skill) });
  };

  const addMicroTaskPreference = (pref: string) => {
    if (pref && !formData.microTaskPreferences.includes(pref)) {
      setFormData({ ...formData, microTaskPreferences: [...formData.microTaskPreferences, pref] });
    }
  };

  const removeMicroTaskPreference = (pref: string) => {
    setFormData({ ...formData, microTaskPreferences: formData.microTaskPreferences.filter(p => p !== pref) });
  };

  const addInternshipFieldPreference = (pref: string) => {
    if (pref && !formData.internshipFieldPreferences.includes(pref)) {
      setFormData({ ...formData, internshipFieldPreferences: [...formData.internshipFieldPreferences, pref] });
    }
  };

  const removeInternshipFieldPreference = (pref: string) => {
    setFormData({ ...formData, internshipFieldPreferences: formData.internshipFieldPreferences.filter(p => p !== pref) });
  };

  const handleDeleteResume = async () => {
    if (!user) return;
    
    setIsDeletingResume(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const response = await fetch("/api/lancing/delete-file", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ fileType: "resume" })
      });
      
      if (!response.ok) {
        throw new Error("Failed to delete resume");
      }
      
      setFormData(prev => ({ ...prev, resumeUrl: undefined }));
      toast({ title: "Resume deleted successfully" });
    } catch (error: any) {
      console.error("Error deleting resume:", error);
      toast({ title: "Failed to delete resume", variant: "destructive" });
    } finally {
      setIsDeletingResume(false);
    }
  };

  const handleDeleteCertificate = async () => {
    if (!user) return;
    
    setIsDeletingCertificate(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const response = await fetch("/api/lancing/delete-file", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ fileType: "certificate" })
      });
      
      if (!response.ok) {
        throw new Error("Failed to delete certificate");
      }
      
      setFormData(prev => ({ ...prev, certificateUrl: undefined }));
      toast({ title: "Certificate deleted successfully" });
    } catch (error: any) {
      console.error("Error deleting certificate:", error);
      toast({ title: "Failed to delete certificate", variant: "destructive" });
    } finally {
      setIsDeletingCertificate(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.fullName || !formData.phoneNumber || !formData.aboutMe) {
      toast({ title: "Please fill all required fields", variant: "destructive" });
      return;
    }

    if (formData.skills.length === 0) {
      toast({ title: "Please add at least one skill", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    try {
      let profileImageUrl = formData.profileImageUrl;
      let resumeUrl = formData.resumeUrl;
      let certificateUrl = formData.certificateUrl;

      // Helper function to upload via backend API (bypasses Firebase Storage security rules)
      const uploadFile = async (file: File, fileType: string): Promise<string> => {
        const token = await auth.currentUser?.getIdToken();
        if (!token) throw new Error('Not authenticated');
        
        const formDataUpload = new FormData();
        formDataUpload.append('file', file);
        formDataUpload.append('fileType', fileType);
        
        const response = await fetch('/api/collab/lancing/upload', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formDataUpload
        });
        
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Upload failed');
        }
        
        const data = await response.json();
        return data.url;
      };

      // Upload new profile image if selected
      if (profileImage && user) {
        profileImageUrl = await uploadFile(profileImage, 'avatar');
      }

      // Upload resume if selected
      if (resumeFile && user) {
        resumeUrl = await uploadFile(resumeFile, 'resume');
      }

      // Upload certificate if selected
      if (certificateFile && user) {
        certificateUrl = await uploadFile(certificateFile, 'certificate');
      }

      // Save to Firestore
      if (user) {
        // Save profile data
        await setDoc(doc(firestore, "lancing_users", user.uid, "profile", "data"), {
          fullName: formData.fullName,
          phoneNumber: formData.phoneNumber,
          aboutMe: formData.aboutMe,
          skills: formData.skills,
          experienceYears: formData.experienceYears,
          experienceDescription: formData.experienceDescription,
          email: formData.email,
          profileImageUrl: profileImageUrl || null,
          resumeUrl: resumeUrl || null,
          certificateUrl: certificateUrl || null,
          microTaskPreferences: formData.microTaskPreferences,
          internshipFieldPreferences: formData.internshipFieldPreferences,
          updatedAt: new Date().toISOString()
        }, { merge: true });

        // Set profile complete flag on main user document
        await setDoc(doc(firestore, "lancing_users", user.uid), {
          profileComplete: true,
          profileCompletedAt: new Date().toISOString()
        }, { merge: true });
      }

      toast({ title: "Profile updated successfully!", description: "Your changes have been saved." });
      
      // Redirect back to dashboard after a short delay
      setTimeout(() => {
        setShouldRedirect("/lancing/freelancer-dashboard");
      }, 500);
    } catch (error: any) {
      console.error("Error saving profile:", error);
      toast({ title: "Error saving profile", description: error.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  if (authLoading || isLoading || shouldRedirect) {
    return (
      <div className="min-h-screen sl-bg-atmosphere sl-grain-overlay flex items-center justify-center">
        <div className="text-center sl-slide-up">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center shadow-lg animate-pulse">
            <Briefcase className="w-8 h-8 text-white" />
          </div>
          <Loader2 className="w-6 h-6 animate-spin text-sky-600 mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen sl-bg-atmosphere sl-grain-overlay">
      <SEOHead title="Edit Profile - StudentLancing" description="Edit your freelancer profile" />

      <div className="flex">
        {/* Sidebar - Same as dashboard */}
        <aside className="w-72 bg-slate-900 border-r border-slate-800 min-h-screen p-6 hidden lg:block fixed left-0 top-0 overflow-y-auto">
          <Link href="/student-lancing" className="flex items-center gap-3 mb-10 group">
            <div className="w-11 h-11 bg-gradient-to-br from-sky-500 to-blue-600 rounded-xl flex items-center justify-center shadow-xl group-hover:shadow-2xl transition-all">
              <Briefcase className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight text-white" >
              Student<span className="text-sky-400">Lancing</span>
            </span>
          </Link>

          {/* Profile Card */}
          <div className="mb-8 p-5 bg-gradient-to-br from-sky-950 to-slate-900 rounded-2xl border border-sky-900 shadow-xl">
            <Avatar className="w-16 h-16 mx-auto mb-4 border-3 border-sky-500 shadow-lg">
              <AvatarImage src={profileImagePreview || undefined} />
              <AvatarFallback className="bg-gradient-to-br from-sky-500 to-blue-600 text-white text-xl font-bold">
                {formData.fullName?.[0] || "F"}
              </AvatarFallback>
            </Avatar>
            <p className="text-center font-bold text-white text-lg">
              {formData.fullName || "Freelancer"}
            </p>
            {/* Community badge */}
            <div className="flex justify-center mt-2">
              {isPremium ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 text-amber-950 text-[10px] font-bold shadow">
                  <Crown className="w-3 h-3" />
                  Premium Community
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-700 text-slate-300 text-[10px] font-semibold border border-slate-600">
                  <User className="w-3 h-3" />
                  Normal Community
                </span>
              )}
            </div>
            <p className="text-center text-xs text-sky-400 font-semibold mt-2">
              Editing your profile
            </p>
          </div>

          {/* Back Button */}
          <Link href="/lancing/freelancer-dashboard">
            <Button className="w-full bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-semibold flex items-center gap-2" >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Button>
          </Link>
        </aside>

        {/* Main Content */}
        <main className="flex-1 lg:ml-72 p-6 lg:p-10">
          {/* Mobile Header */}
          <div className="lg:hidden mb-8">
            <Link href="/lancing/freelancer-dashboard" className="inline-block mb-4">
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
            </Link>
            <h1 className="text-3xl font-black" >Edit Profile</h1>
          </div>

          {/* Page Title */}
          <div className="hidden lg:block mb-10">
            <h1 className="text-4xl lg:text-5xl font-black tracking-tight mb-2" >
              <span className="text-slate-900">Edit Your</span>
              <br />
              <span className="bg-gradient-to-r from-sky-600 to-blue-500 bg-clip-text text-transparent">Freelancer Profile</span>
            </h1>
            <p className="text-lg text-slate-600 max-w-2xl" >
              Keep your profile up-to-date to attract better opportunities.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSave} className="max-w-4xl space-y-6">

            {/* ── Membership Card ── */}
            <div className={`rounded-3xl shadow-lg border overflow-hidden ${
              isPremium
                ? "border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50"
                : "border-gray-200 bg-white"
            }`}>
              <div className="p-5 sm:p-6">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-3">
                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shadow-sm ${
                      isPremium ? "bg-gradient-to-br from-amber-400 to-orange-500" : "bg-gray-100"
                    }`}>
                      {isPremium
                        ? <Crown className="w-5 h-5 text-white" />
                        : <User className="w-5 h-5 text-gray-500" />
                      }
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 text-sm">
                        {isPremium ? "Premium Community Member" : "Normal Community Member"}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {isPremium
                          ? "You have full access to Career Compass, Placement Readiness & more"
                          : "Upgrade to unlock Career Compass Premium, Placement Readiness & AI tools"
                        }
                      </p>
                    </div>
                  </div>
                  {!isPremium && !subLoading && (
                    <button
                      type="button"
                      onClick={() => setShowPlanModal(true)}
                      className="flex-shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-bold shadow-sm active:scale-95 transition-all"
                    >
                      <Crown className="w-3.5 h-3.5" />
                      {pricing ? `Upgrade — ${pricing.priceLabel}` : "Upgrade to Premium"}
                    </button>
                  )}
                  {isPremium && (
                    <span className="flex-shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-100 text-amber-700 text-xs font-bold border border-amber-200">
                      <Check className="w-3.5 h-3.5" />
                      Active
                    </span>
                  )}
                </div>

                {/* What's included for non-premium */}
                {!isPremium && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Premium includes</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {(pricing?.premiumFeatures ?? []).map((f) => (
                        <div key={f} className="flex items-center gap-1.5">
                          <Lock className="w-3 h-3 text-gray-300 flex-shrink-0" />
                          <span className="text-xs text-gray-500">{f}</span>
                        </div>
                      ))}
                    </div>
                    <p className="text-[10px] text-gray-400 mt-3">
                      {pricing
                        ? `${pricing.priceLabel} for ${pricing.durationDays} days · Single payment · No automatic renewal · PayU`
                        : "Premium pricing is unavailable. The current price must load before a purchase."}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Basic Info Card */}
            <Card className="rounded-3xl shadow-xl border border-gray-100/50 overflow-hidden bg-white/80 backdrop-blur-sm">
              <CardHeader className="bg-gradient-to-r from-emerald-50 to-green-50 border-b border-emerald-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center">
                    <User className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-lg" >Basic Information</CardTitle>
                    <CardDescription >Your public profile details</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                {/* Profile Image */}
                <div className="flex items-center gap-6">
                  <div className="relative group">
                    <Avatar className="w-24 h-24 border-4 border-emerald-100 shadow-lg">
                      <AvatarImage src={profileImagePreview || undefined} />
                      <AvatarFallback className="bg-gradient-to-br from-emerald-400 to-blue-500 text-white text-2xl font-bold">
                        {formData.fullName ? formData.fullName[0].toUpperCase() : "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div 
                      className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Camera className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <div>
                    <input type="file" ref={fileInputRef} accept="image/*" onChange={handleImageChange} className="hidden" />
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => fileInputRef.current?.click()} 
                      className="rounded-xl border-2 font-semibold"
                      
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Photo
                    </Button>
                    <p className="text-xs text-gray-500 mt-2" >JPG, PNG. Max 5MB</p>
                  </div>
                </div>

                {/* Full Name */}
                <div className="space-y-2">
                  <Label htmlFor="fullName" className="text-sm font-semibold text-gray-700" >
                    Full Name *
                  </Label>
                  <Input
                    id="fullName"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    placeholder="Your full name"
                    className="rounded-xl h-14 border-2 text-base focus:border-sky-500 focus:ring-emerald-500/20"
                    
                  />
                </div>

                {/* Phone Number */}
                <div className="space-y-2">
                  <Label htmlFor="phoneNumber" className="text-sm font-semibold text-gray-700" >
                    Phone Number *
                  </Label>
                  <Input
                    id="phoneNumber"
                    type="tel"
                    value={formData.phoneNumber}
                    onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                    placeholder="Your contact number"
                    className="rounded-xl h-14 border-2 text-base focus:border-sky-500 focus:ring-emerald-500/20"
                    
                  />
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-semibold text-gray-700" >
                    Email
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      id="email"
                      value={formData.email}
                      disabled
                      className="pl-12 rounded-xl h-14 bg-gray-50 border-2 text-base"
                      
                    />
                    <CheckCircle2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-500" />
                  </div>
                </div>

                {/* About Me */}
                <div className="space-y-2">
                  <Label htmlFor="aboutMe" className="text-sm font-semibold text-gray-700" >
                    About Me *
                  </Label>
                  <Textarea
                    id="aboutMe"
                    value={formData.aboutMe}
                    onChange={(e) => setFormData({ ...formData, aboutMe: e.target.value })}
                    placeholder="Tell companies about yourself, your background, and what makes you unique..."
                    className="rounded-xl min-h-[140px] border-2 text-base focus:border-sky-500 focus:ring-emerald-500/20 resize-none"
                    
                  />
                  <p className="text-xs text-gray-400 text-right">{formData.aboutMe.length}/500</p>
                </div>
              </CardContent>
            </Card>

            {/* Skills Card */}
            <Card className="rounded-3xl shadow-xl border border-gray-100/50 overflow-hidden bg-white/80 backdrop-blur-sm">
              <CardHeader className="bg-gradient-to-r from-amber-50 to-yellow-50 border-b border-amber-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-lg" >Your Skills</CardTitle>
                    <CardDescription >Add up to 10 skills across any field (minimum 1 required)</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                {/* Skills Input */}
                <div className="flex gap-3">
                  <Input
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    placeholder="Type a skill..."
                    className="rounded-xl h-12 border-2 focus:border-sky-500"
                    
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSkill(skillInput))}
                  />
                  <Button 
                    type="button" 
                    onClick={() => addSkill(skillInput)} 
                    className="rounded-xl h-12 px-6 bg-sky-600 hover:bg-sky-700 font-semibold"
                    
                  >
                    <Plus className="w-5 h-5" />
                  </Button>
                </div>

                {/* Selected Skills */}
                {formData.skills.length > 0 && (
                  <div className="flex flex-wrap gap-2 p-4 bg-sky-50 rounded-xl border border-emerald-100">
                    {formData.skills.map(skill => (
                      <Badge 
                        key={skill} 
                        className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-medium cursor-pointer rounded-lg"
                        
                      >
                        {skill}
                        <X className="w-4 h-4 ml-2 hover:text-red-200" onClick={() => removeSkill(skill)} />
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Skill Suggestions */}
                {skillInput && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 mb-2" >
                      SUGGESTIONS
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {SKILL_OPTIONS
                        .filter(s => s.toLowerCase().includes(skillInput.toLowerCase()) && !formData.skills.includes(s))
                        .slice(0, 8)
                        .map(skill => (
                          <Badge
                            key={skill}
                            variant="outline"
                            className="px-3 py-1.5 cursor-pointer hover:bg-sky-50 hover:border-emerald-300 hover:text-sky-700 transition-all rounded-lg font-medium"
                            
                            onClick={() => addSkill(skill)}
                          >
                            + {skill}
                          </Badge>
                        ))}
                    </div>
                  </div>
                )}

                {/* All Skills Browser */}
                {!skillInput && formData.skills.length < 10 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 mb-2" >
                      POPULAR SKILLS
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {SKILL_OPTIONS.filter(s => !formData.skills.includes(s)).slice(0, 12).map(skill => (
                        <Badge
                          key={skill}
                          variant="outline"
                          className="px-3 py-1.5 cursor-pointer hover:bg-sky-50 hover:border-emerald-300 hover:text-sky-700 transition-all rounded-lg font-medium"
                          
                          onClick={() => addSkill(skill)}
                        >
                          + {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Experience Card */}
            <Card className="rounded-3xl shadow-xl border border-gray-100/50 overflow-hidden bg-white/80 backdrop-blur-sm">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-lg" >Experience</CardTitle>
                    <CardDescription >Share your work history and achievements</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="experienceYears" className="text-sm font-semibold text-gray-700" >
                    Years of Experience
                  </Label>
                  <Input
                    id="experienceYears"
                    type="number"
                    min="0"
                    value={formData.experienceYears}
                    onChange={(e) => setFormData({ ...formData, experienceYears: e.target.value })}
                    placeholder="e.g., 2"
                    className="rounded-xl h-14 border-2 text-base focus:border-sky-500 max-w-[200px]"
                    
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="experienceDescription" className="text-sm font-semibold text-gray-700" >
                    Experience Description
                  </Label>
                  <Textarea
                    id="experienceDescription"
                    value={formData.experienceDescription}
                    onChange={(e) => setFormData({ ...formData, experienceDescription: e.target.value })}
                    placeholder="Describe your work experience, projects, and achievements..."
                    className="rounded-xl min-h-[120px] border-2 text-base focus:border-sky-500 resize-none"
                    
                  />
                </div>
              </CardContent>
            </Card>


            {/* Resume Card */}
            <Card className="rounded-3xl shadow-xl border border-gray-100/50 overflow-hidden bg-white/80 backdrop-blur-sm">
              <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 border-b border-purple-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-lg" >Resume (Optional)</CardTitle>
                    <CardDescription >Upload your resume to showcase your qualifications</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                {formData.resumeUrl && !resumeFile && (
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                    <p className="text-sm font-semibold text-emerald-700 mb-2">Current Resume</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <a 
                        href={formData.resumeUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium"
                        data-testid="view-resume-link"
                      >
                        <FileText className="w-4 h-4" />
                        View Resume
                      </a>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleDeleteResume}
                        disabled={isDeletingResume}
                        className="text-red-600 border-red-200 hover:bg-red-50 rounded-lg"
                        data-testid="delete-resume-btn"
                      >
                        {isDeletingResume ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                        <span className="ml-1">Delete</span>
                      </Button>
                    </div>
                  </div>
                )}
                <input type="file" ref={resumeInputRef} accept=".pdf" onChange={handleResumeChange} className="hidden" />
                <div
                  onClick={() => resumeInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                    resumeFile 
                      ? "border-emerald-400 bg-sky-50" 
                      : "border-gray-200 hover:border-emerald-400 hover:bg-sky-50/50"
                  }`}
                >
                  {resumeFile ? (
                    <div className="flex items-center justify-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-sky-100 flex items-center justify-center">
                        <FileText className="w-6 h-6 text-sky-600" />
                      </div>
                      <div className="text-left">
                        <p className="font-semibold text-sky-700" >{resumeFile.name}</p>
                        <p className="text-xs text-sky-600" >Click to change</p>
                      </div>
                      <CheckCircle2 className="w-6 h-6 text-emerald-500 ml-2" />
                    </div>
                  ) : (
                    <>
                      <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
                        <Upload className="w-8 h-8 text-gray-400" />
                      </div>
                      <p className="text-gray-600 font-medium mb-1" >{formData.resumeUrl ? 'Upload a new resume' : 'Drop your resume here or click to browse'}</p>
                      <p className="text-sm text-gray-400" >PDF only, max 10MB</p>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Keep saved preferences intact while Micro Tasks are paused. */}
            {false && (
            <Card className="rounded-3xl shadow-xl border border-gray-100/50 overflow-hidden bg-white/80 backdrop-blur-sm">
              <CardHeader className="bg-gradient-to-r from-teal-50 to-cyan-50 border-b border-teal-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-lg" >Micro Task Preferences</CardTitle>
                    <CardDescription >Types of micro tasks you can work on across all sectors</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="flex flex-wrap gap-2">
                  {formData.microTaskPreferences.map(pref => (
                    <Badge key={pref} className="bg-teal-100 text-teal-700 rounded-lg py-2 px-3 flex items-center gap-2 cursor-pointer hover:bg-teal-200" >
                      {pref}
                      <X className="w-3 h-3" onClick={() => removeMicroTaskPreference(pref)} />
                    </Badge>
                  ))}
                </div>
                <div className="space-y-2">
                  <Label  className="text-sm font-semibold text-gray-700">
                    Add Preference (Writing, Design, Development, Analysis, Support, etc.)
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="e.g., Content Writing, Logo Design, Data Entry..."
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          addMicroTaskPreference((e.target as HTMLInputElement).value);
                          (e.target as HTMLInputElement).value = '';
                        }
                      }}
                      className="rounded-xl h-12 border-2 text-base focus:border-teal-500"
                      
                    />
                    <Button
                      type="button"
                      onClick={(e) => {
                        const input = (e.currentTarget as any).previousElementSibling as HTMLInputElement;
                        if (input?.value) {
                          addMicroTaskPreference(input.value);
                          input.value = '';
                        }
                      }}
                      className="bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-semibold"
                      
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            )}
            {/* Internship Field Preferences Card */}
            <Card className="rounded-3xl shadow-xl border border-gray-100/50 overflow-hidden bg-white/80 backdrop-blur-sm">
              <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-indigo-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                    <Briefcase className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-lg" >Internship Field Preferences</CardTitle>
                    <CardDescription >Sectors and fields you want internships in</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="flex flex-wrap gap-2">
                  {formData.internshipFieldPreferences.map(pref => (
                    <Badge key={pref} className="bg-indigo-100 text-indigo-700 rounded-lg py-2 px-3 flex items-center gap-2 cursor-pointer hover:bg-indigo-200" >
                      {pref}
                      <X className="w-3 h-3" onClick={() => removeInternshipFieldPreference(pref)} />
                    </Badge>
                  ))}
                </div>
                <div className="space-y-2">
                  <Label  className="text-sm font-semibold text-gray-700">
                    Add Field (Technology, Finance, Healthcare, Marketing, etc.)
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="e.g., Software Development, Marketing, Data Science..."
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          addInternshipFieldPreference((e.target as HTMLInputElement).value);
                          (e.target as HTMLInputElement).value = '';
                        }
                      }}
                      className="rounded-xl h-12 border-2 text-base focus:border-indigo-500"
                      
                    />
                    <Button
                      type="button"
                      onClick={(e) => {
                        const input = (e.currentTarget as any).previousElementSibling as HTMLInputElement;
                        if (input?.value) {
                          addInternshipFieldPreference(input.value);
                          input.value = '';
                        }
                      }}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold"
                      
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Certificate Card */}
            <Card className="rounded-3xl shadow-xl border border-gray-100/50 overflow-hidden bg-white/80 backdrop-blur-sm">
              <CardHeader className="bg-gradient-to-r from-orange-50 to-red-50 border-b border-orange-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-lg" >Certificate (Optional)</CardTitle>
                    <CardDescription >Upload any relevant certificates or credentials</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                {formData.certificateUrl && !certificateFile && (
                  <div className="p-4 bg-orange-50 border border-orange-200 rounded-xl">
                    <p className="text-sm font-semibold text-orange-700 mb-2">Current Certificate</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <a 
                        href={formData.certificateUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm font-medium"
                        data-testid="view-certificate-link"
                      >
                        <FileText className="w-4 h-4" />
                        View Certificate
                      </a>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleDeleteCertificate}
                        disabled={isDeletingCertificate}
                        className="text-red-600 border-red-200 hover:bg-red-50 rounded-lg"
                        data-testid="delete-certificate-btn"
                      >
                        {isDeletingCertificate ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                        <span className="ml-1">Delete</span>
                      </Button>
                    </div>
                  </div>
                )}
                <input type="file" ref={certificateInputRef} accept=".pdf" onChange={handleCertificateChange} className="hidden" />
                <div
                  onClick={() => certificateInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                    certificateFile 
                      ? "border-orange-400 bg-orange-50" 
                      : "border-gray-200 hover:border-orange-400 hover:bg-orange-50/50"
                  }`}
                >
                  {certificateFile ? (
                    <div className="flex items-center justify-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center">
                        <FileText className="w-6 h-6 text-orange-600" />
                      </div>
                      <div className="text-left">
                        <p className="font-semibold text-orange-700" >{certificateFile.name}</p>
                        <p className="text-xs text-orange-600" >Click to change</p>
                      </div>
                      <CheckCircle2 className="w-6 h-6 text-orange-500 ml-2" />
                    </div>
                  ) : (
                    <>
                      <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
                        <Upload className="w-8 h-8 text-gray-400" />
                      </div>
                      <p className="text-gray-600 font-medium mb-1" >{formData.certificateUrl ? 'Upload a new certificate' : 'Drop your certificate here or click to browse'}</p>
                      <p className="text-sm text-gray-400" >PDF only, max 10MB</p>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 pt-8">
              <Link href="/lancing/freelancer-dashboard" className="flex-1">
                <Button type="button" variant="outline" className="w-full rounded-xl font-semibold border-2 border-slate-300 h-12" >
                  Cancel
                </Button>
              </Link>
              <Button
                type="submit"
                disabled={isSaving}
                className="flex-1 bg-gradient-to-r from-sky-600 to-blue-500 hover:from-emerald-700 hover:to-blue-600 text-white rounded-xl font-semibold h-12 flex items-center justify-center gap-2"
                
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </form>
        </main>
      </div>

      {/* Premium upgrade modal */}
      <CareerCompassPlanModal
        open={showPlanModal}
        onContinueFree={() => setShowPlanModal(false)}
        customerName={formData.fullName || undefined}
        customerPhone={formData.phoneNumber || undefined}
      />
    </div>
  );
}
