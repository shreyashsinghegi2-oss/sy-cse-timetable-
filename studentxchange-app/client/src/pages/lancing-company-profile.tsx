import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Building2, Loader2, Upload, User, Mail, Globe, Briefcase, Camera, CheckCircle2, ArrowRight } from "lucide-react";
import { useLancingAuth } from "@/hooks/use-lancing-auth";
import { useLocation, Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { firestore, auth } from "@/lib/firebase";
import { doc, setDoc } from "firebase/firestore";
import SEOHead from "@/components/seo/seo-head";

const INDUSTRY_TYPES = [
  "Technology", "Education", "Healthcare", "Finance", "E-commerce",
  "Marketing", "Media", "Consulting", "Manufacturing", "Real Estate",
  "Hospitality", "Non-profit", "Government", "Startup", "Other"
];

export default function LancingCompanyProfile() {
  const { user, isAuthenticated, role, profileComplete, refreshUser, isLoading: authLoading } = useLancingAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const logoInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    companyName: "",
    recruiterName: "",
    website: "",
    industryType: "",
    companyBio: ""
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [shouldRedirect, setShouldRedirect] = useState<string | null>(null);

  useEffect(() => {
    if (shouldRedirect) {
      setLocation(shouldRedirect);
    }
  }, [shouldRedirect, setLocation]);

  useEffect(() => {
    if (authLoading) return;
    
    if (!isAuthenticated || role !== "company") {
      setShouldRedirect("/student-lancing");
      return;
    }
    if (profileComplete) {
      setShouldRedirect("/lancing/company-dashboard");
      return;
    }
  }, [authLoading, isAuthenticated, role, profileComplete]);

  if (authLoading || shouldRedirect) {
    return (
      <div className="min-h-screen sl-bg-atmosphere sl-grain-overlay flex items-center justify-center">
        <div className="text-center sl-slide-up">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center shadow-lg animate-pulse">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <Loader2 className="w-6 h-6 animate-spin text-teal-600 mx-auto" />
        </div>
      </div>
    );
  }

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({ title: "Image too large", description: "Max 5MB allowed", variant: "destructive" });
        return;
      }
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.companyName || !formData.recruiterName || !formData.industryType) {
      toast({ title: "Please fill required fields", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      let logoUrl = "";

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

      if (logoFile && user) {
        logoUrl = await uploadFile(logoFile, 'logo');
      }

      if (user) {
        await setDoc(doc(firestore, "lancing_users", user.uid, "profile", "data"), {
          companyName: formData.companyName,
          recruiterName: formData.recruiterName,
          email: user.email,
          website: formData.website,
          industryType: formData.industryType,
          companyBio: formData.companyBio,
          logoUrl,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });

        await setDoc(doc(firestore, "lancing_users", user.uid), {
          profileComplete: true
        }, { merge: true });

        await refreshUser();
        toast({ title: "Company profile created successfully!" });
        setLocation("/lancing/company-dashboard");
      }
    } catch (error: any) {
      toast({ title: "Failed to create profile", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen sl-bg-atmosphere sl-grain-overlay relative overflow-hidden">
      <SEOHead title="Complete Company Profile - StudentLancing" description="Set up your company profile" />

      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-teal-200/40 to-cyan-300/30 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-gradient-to-br from-emerald-200/30 to-green-200/20 rounded-full blur-3xl" />
      </div>

      {/* Navigation */}
      <nav className="relative z-10 px-6 py-4 border-b border-gray-100/50 bg-white/60 backdrop-blur-md">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/student-lancing" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center shadow-md">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight" >
              Student<span className="text-teal-600">Lancing</span>
            </span>
          </Link>
        </div>
      </nav>

      <div className="relative z-10 max-w-3xl mx-auto px-6 py-8 lg:py-12">
        {/* Header */}
        <div className="text-center mb-10 sl-slide-up">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3" >
            <span className="text-gray-900">Set up your</span>{" "}
            <span className="bg-gradient-to-r from-teal-600 to-cyan-500 bg-clip-text text-transparent">company profile</span>
          </h1>
          <p className="text-gray-600 max-w-lg mx-auto" >
            Tell freelancers about your company and start hiring student talent.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <Card className="rounded-3xl shadow-xl border border-gray-100/50 mb-6 overflow-hidden bg-white/80 backdrop-blur-sm sl-scale-in">
            <CardHeader className="bg-gradient-to-r from-teal-50 to-cyan-50 border-b border-teal-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-lg" >Company Information</CardTitle>
                  <CardDescription >Your public company details</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {/* Company Logo */}
              <div className="flex items-center gap-6">
                <div className="relative group">
                  <Avatar className="w-24 h-24 border-4 border-teal-100 rounded-2xl shadow-lg">
                    <AvatarImage src={logoPreview || undefined} className="object-cover" />
                    <AvatarFallback className="bg-gradient-to-br from-teal-400 to-cyan-500 text-white text-2xl font-bold rounded-2xl">
                      {formData.companyName ? formData.companyName[0].toUpperCase() : "C"}
                    </AvatarFallback>
                  </Avatar>
                  <div 
                    className="absolute inset-0 bg-black/40 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    onClick={() => logoInputRef.current?.click()}
                  >
                    <Camera className="w-6 h-6 text-white" />
                  </div>
                </div>
                <div>
                  <input type="file" ref={logoInputRef} accept="image/*" onChange={handleLogoChange} className="hidden" />
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => logoInputRef.current?.click()} 
                    className="rounded-xl border-2 font-semibold"
                    
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Logo
                  </Button>
                  <p className="text-xs text-gray-500 mt-2" >JPG, PNG. Max 5MB</p>
                </div>
              </div>

              {/* Company Name */}
              <div className="space-y-2">
                <Label htmlFor="companyName" className="text-sm font-semibold text-gray-700" >
                  Company Name *
                </Label>
                <div className="relative">
                  <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    id="companyName"
                    value={formData.companyName}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    placeholder="Your company name"
                    className="pl-12 h-14 rounded-xl border-2 focus:border-teal-500 text-base"
                    
                    data-testid="input-company-name"
                  />
                </div>
              </div>

              {/* Recruiter Name */}
              <div className="space-y-2">
                <Label htmlFor="recruiterName" className="text-sm font-semibold text-gray-700" >
                  Your Name *
                </Label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    id="recruiterName"
                    value={formData.recruiterName}
                    onChange={(e) => setFormData({ ...formData, recruiterName: e.target.value })}
                    placeholder="Your full name"
                    className="pl-12 h-14 rounded-xl border-2 focus:border-teal-500 text-base"
                    
                    data-testid="input-recruiter-name"
                  />
                </div>
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
                    className="pl-12 h-14 rounded-xl bg-gray-50 border-2 text-base"
                    
                  />
                  <CheckCircle2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-teal-500" />
                </div>
              </div>

              {/* Website */}
              <div className="space-y-2">
                <Label htmlFor="website" className="text-sm font-semibold text-gray-700" >
                  Company Website
                </Label>
                <div className="relative">
                  <Globe className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    id="website"
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    placeholder="https://yourcompany.com"
                    className="pl-12 h-14 rounded-xl border-2 focus:border-teal-500 text-base"
                    
                  />
                </div>
              </div>

              {/* Industry Type */}
              <div className="space-y-2">
                <Label htmlFor="industryType" className="text-sm font-semibold text-gray-700" >
                  Industry Type *
                </Label>
                <Select value={formData.industryType} onValueChange={(value) => setFormData({ ...formData, industryType: value })}>
                  <SelectTrigger className="h-14 rounded-xl border-2 focus:border-teal-500" >
                    <div className="flex items-center gap-2">
                      <Briefcase className="w-5 h-5 text-gray-400" />
                      <SelectValue placeholder="Select industry" />
                    </div>
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {INDUSTRY_TYPES.map(industry => (
                      <SelectItem key={industry} value={industry} className="rounded-lg">{industry}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Company Bio */}
              <div className="space-y-2">
                <Label htmlFor="companyBio" className="text-sm font-semibold text-gray-700" >
                  Company Description
                </Label>
                <Textarea
                  id="companyBio"
                  value={formData.companyBio}
                  onChange={(e) => setFormData({ ...formData, companyBio: e.target.value })}
                  placeholder="Tell freelancers about your company, culture, and what you do..."
                  className="rounded-xl min-h-[140px] border-2 focus:border-teal-500 text-base resize-none"
                  
                  data-testid="input-company-bio"
                />
              </div>
            </CardContent>
          </Card>

          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-16 bg-gradient-to-r from-teal-600 to-cyan-500 hover:from-teal-700 hover:to-cyan-600 text-white font-bold rounded-2xl shadow-xl shadow-teal-500/30 hover:shadow-teal-500/50 transition-all text-lg"
            
            data-testid="button-save-company-profile"
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
