import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Briefcase, Loader2, Upload, X, User, Mail, FileText, DollarSign, Clock, Sparkles, CheckCircle2, ArrowRight, Camera, Plus } from "lucide-react";
import { useLancingAuth } from "@/hooks/use-lancing-auth";
import { useLocation, Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { firestore, auth } from "@/lib/firebase";
import { doc, setDoc } from "firebase/firestore";
import SEOHead from "@/components/seo/seo-head";

const SKILL_OPTIONS = [
  "JavaScript", "TypeScript", "React", "Node.js", "Python", "Java", "C++",
  "HTML/CSS", "UI/UX Design", "Graphic Design", "Content Writing", "Video Editing",
  "Data Analysis", "Machine Learning", "Mobile Development", "WordPress", "SEO",
  "Social Media", "Photography", "Translation", "Research", "Tutoring"
];

export default function LancingFreelancerProfile() {
  const { user, isAuthenticated, role, profileComplete, refreshUser, isLoading: authLoading } = useLancingAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const resumeInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    fullName: "",
    phoneNumber: "",
    skills: [] as string[],
    experienceYears: "",
    experienceDescription: "",
    aboutMe: "",
    microTaskPreferences: [] as string[],
    internshipFieldPreferences: [] as string[]
  });
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [profileImagePreview, setProfileImagePreview] = useState<string | null>(null);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [skillInput, setSkillInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [shouldRedirect, setShouldRedirect] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(1);

  const getMissingFields = () => {
    const missing = [];
    if (!formData.fullName) missing.push("Full Name");
    if (!formData.phoneNumber) missing.push("Phone Number");
    if (formData.skills.length === 0) missing.push("At least 1 Skill");
    if (!formData.aboutMe) missing.push("Bio/About Me");
    if (!profileImagePreview && !profileImage) missing.push("Profile Photo");
    return missing;
  };

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
    if (profileComplete) {
      setShouldRedirect("/lancing/freelancer-dashboard");
      return;
    }
  }, [authLoading, isAuthenticated, role, profileComplete]);

  if (authLoading || shouldRedirect) {
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

  const addSkill = (skill: string) => {
    if (skill && !formData.skills.includes(skill) && formData.skills.length < 10) {
      setFormData({ ...formData, skills: [...formData.skills, skill] });
      setSkillInput("");
    }
  };

  const removeSkill = (skill: string) => {
    setFormData({ ...formData, skills: formData.skills.filter(s => s !== skill) });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // fullName, phoneNumber, skills, aboutMe, and profileImageUrl are required
    if (!formData.fullName || !formData.phoneNumber || formData.skills.length === 0 || !formData.aboutMe || (!profileImagePreview && !profileImage)) {
      toast({ title: "Please fill all required fields including profile photo", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      let profileImageUrl = "";
      let resumeUrl = "";

      // Helper function to upload via backend API (bypasses Firebase Storage security rules)
      const uploadFile = async (file: File, fileType: string): Promise<string> => {
        const token = await auth.currentUser?.getIdToken();
        if (!token) throw new Error('Not authenticated');
        
        const formData = new FormData();
        formData.append('file', file);
        formData.append('fileType', fileType);
        
        const response = await fetch('/api/collab/lancing/upload', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        });
        
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Upload failed');
        }
        
        const data = await response.json();
        return data.url;
      };

      if (profileImage && user) {
        profileImageUrl = await uploadFile(profileImage, 'avatar');
      }

      if (resumeFile && user) {
        resumeUrl = await uploadFile(resumeFile, 'resume');
      }

      if (user) {
        await setDoc(doc(firestore, "lancing_users", user.uid, "profile", "data"), {
          fullName: formData.fullName,
          phoneNumber: formData.phoneNumber,
          email: user.email,
          skills: formData.skills,
          experienceYears: formData.experienceYears,
          experienceDescription: formData.experienceDescription,
          aboutMe: formData.aboutMe,
          profileImageUrl,
          resumeUrl,
          microTaskPreferences: formData.microTaskPreferences,
          internshipFieldPreferences: formData.internshipFieldPreferences,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });

        await setDoc(doc(firestore, "lancing_users", user.uid), {
          profileComplete: true
        }, { merge: true });

        await refreshUser();
        toast({ title: "Profile created successfully!" });
        setLocation("/lancing/freelancer-dashboard");
      }
    } catch (error: any) {
      toast({ title: "Failed to create profile", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const steps = [
    { id: 1, title: "Basic Info", icon: User },
    { id: 2, title: "Skills", icon: Sparkles },
    { id: 3, title: "Experience", icon: Clock }
  ];

  return (
    <div className="min-h-screen sl-bg-atmosphere sl-grain-overlay relative overflow-hidden">
      <SEOHead title="Complete Your Profile - StudentLancing" description="Set up your freelancer profile" />

      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-emerald-200/40 to-green-300/30 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-gradient-to-br from-teal-200/30 to-cyan-200/20 rounded-full blur-3xl" />
      </div>

      {/* Navigation */}
      <nav className="relative z-10 px-6 py-4 border-b border-gray-100/50 bg-white/60 backdrop-blur-md">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/student-lancing" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center shadow-md">
              <Briefcase className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight" >
              Student<span className="text-sky-600">Lancing</span>
            </span>
          </Link>

          {/* Progress Steps */}
          <div className="hidden md:flex items-center gap-2">
            {steps.map((step, i) => (
              <div key={step.id} className="flex items-center">
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                  currentStep >= step.id 
                    ? "bg-sky-100 text-sky-700" 
                    : "bg-gray-100 text-gray-400"
                }`} >
                  <step.icon className="w-4 h-4" />
                  <span className="hidden lg:inline">{step.title}</span>
                </div>
                {i < steps.length - 1 && (
                  <div className={`w-8 h-0.5 mx-1 ${currentStep > step.id ? "bg-emerald-400" : "bg-gray-200"}`} />
                )}
              </div>
            ))}
          </div>
        </div>
      </nav>

      <div className="relative z-10 max-w-3xl mx-auto px-6 py-8 lg:py-12">
        {/* Header */}
        <div className="text-center mb-10 sl-slide-up">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3" >
            <span className="text-gray-900">Build your</span>{" "}
            <span className="bg-gradient-to-r from-sky-600 to-blue-500 bg-clip-text text-transparent">freelancer profile</span>
          </h1>
          <p className="text-gray-600 max-w-lg mx-auto" >
            Tell companies about yourself and showcase your skills to land your first project.
          </p>
        </div>

        {getMissingFields().length > 0 && (
          <div className="p-4 bg-red-50 border-2 border-red-200 rounded-2xl mb-6 sl-slide-up">
            <p className="text-sm font-bold text-red-700 mb-3">Missing Required Fields:</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {getMissingFields().map((field) => (
                <div key={field} className="flex items-center gap-2 text-sm text-red-600 font-medium">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
                  {field}
                </div>
              ))}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Basic Info Card */}
          <Card className="rounded-3xl shadow-xl border border-gray-100/50 mb-6 overflow-hidden bg-white/80 backdrop-blur-sm sl-scale-in sl-stagger-1">
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
                  
                  data-testid="input-freelancer-name"
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
                    value={user?.email || ""}
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
                  
                  data-testid="input-freelancer-about"
                />
                <p className="text-xs text-gray-400 text-right">{formData.aboutMe.length}/500</p>
              </div>
            </CardContent>
          </Card>

          {/* Skills Card */}
          <Card className="rounded-3xl shadow-xl border border-gray-100/50 mb-6 overflow-hidden bg-white/80 backdrop-blur-sm sl-scale-in sl-stagger-2">
            <CardHeader className="bg-gradient-to-r from-amber-50 to-yellow-50 border-b border-amber-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-lg" >Your Skills</CardTitle>
                  <CardDescription >Add up to 10 skills (minimum 1 required)</CardDescription>
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
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-2" >
                  POPULAR SKILLS
                </p>
                <div className="flex flex-wrap gap-2">
                  {SKILL_OPTIONS.filter(s => !formData.skills.includes(s)).slice(0, 10).map(skill => (
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
            </CardContent>
          </Card>

          {/* Experience Card */}
          <Card className="rounded-3xl shadow-xl border border-gray-100/50 mb-6 overflow-hidden bg-white/80 backdrop-blur-sm sl-scale-in sl-stagger-3">
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
          <Card className="rounded-3xl shadow-xl border border-gray-100/50 mb-8 overflow-hidden bg-white/80 backdrop-blur-sm sl-scale-in sl-stagger-5">
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
            <CardContent className="p-6">
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
                    <p className="text-gray-600 font-medium mb-1" >Drop your resume here or click to browse</p>
                    <p className="text-sm text-gray-400" >PDF only, max 10MB</p>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-16 bg-gradient-to-r from-sky-600 to-blue-500 hover:from-emerald-700 hover:to-blue-600 text-white font-bold rounded-2xl shadow-xl shadow-sky-500/30 hover:shadow-sky-500/50 transition-all text-lg"
            
            data-testid="button-save-freelancer-profile"
          >
            {isSubmitting ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <>
                Complete Profile
                <ArrowRight className="w-6 h-6 ml-2" />
              </>
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
