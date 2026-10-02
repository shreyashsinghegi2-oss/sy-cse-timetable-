import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Building2, Loader2, Upload, ArrowLeft, Camera, CheckCircle2 } from "lucide-react";
import { useLancingAuth } from "@/hooks/use-lancing-auth";
import { useLocation, Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { firestore, auth } from "@/lib/firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";
import SEOHead from "@/components/seo/seo-head";

const INDUSTRY_TYPES = [
  "Technology", "Education", "Healthcare", "Finance", "E-commerce",
  "Marketing", "Media", "Consulting", "Manufacturing", "Real Estate",
  "Hospitality", "Non-profit", "Government", "Startup", "Other"
];

interface CompanyProfile {
  companyName: string;
  recruiterName: string;
  website: string;
  industryType: string;
  companyBio: string;
  logoUrl?: string;
}

export default function LancingCompanyProfileEdit() {
  const { user, isAuthenticated, role, isLoading: authLoading } = useLancingAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const logoInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<CompanyProfile>({
    companyName: "",
    recruiterName: "",
    website: "",
    industryType: "",
    companyBio: ""
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [shouldRedirect, setShouldRedirect] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    if (shouldRedirect) {
      setLocation(shouldRedirect);
    }
  }, [shouldRedirect, setLocation]);

  useEffect(() => {
    if (authLoading) return;
    setAuthChecked(true);
    if (!isAuthenticated || !user || role !== "company") {
      setShouldRedirect("/student-lancing");
      return;
    }
    fetchProfile();
  }, [authLoading, isAuthenticated, user, role]);

  const fetchProfile = async () => {
    if (!user) return;
    try {
      const profileDoc = await getDoc(doc(firestore, "lancing_users", user.uid, "profile", "data"));
      if (profileDoc.exists()) {
        const data = profileDoc.data() as CompanyProfile;
        setFormData({
          companyName: data.companyName || "",
          recruiterName: data.recruiterName || "",
          website: data.website || "",
          industryType: data.industryType || "",
          companyBio: data.companyBio || ""
        });
        if (data.logoUrl) {
          setLogoPreview(data.logoUrl);
        }
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
    } finally {
      setIsLoading(false);
    }
  };

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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.companyName || !formData.recruiterName || !formData.industryType) {
      toast({ title: "Please fill all required fields", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    try {
      let logoUrl = logoPreview;

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
          logoUrl: logoUrl || null,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      }

      toast({ title: "Company profile updated successfully!" });
      
      setTimeout(() => {
        setShouldRedirect("/lancing/company-dashboard");
      }, 500);
    } catch (error: any) {
      console.error("Error saving profile:", error);
      toast({ title: "Error saving profile", description: error.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  if (authLoading || !authChecked || shouldRedirect || isLoading) {
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

  return (
    <div className="min-h-screen sl-bg-atmosphere sl-grain-overlay">
      <SEOHead title="Edit Company Profile - StudentLancing" description="Edit your company profile" />

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-72 bg-slate-900 border-r border-slate-800 min-h-screen p-6 hidden lg:block fixed left-0 top-0 overflow-y-auto">
          <Link href="/student-lancing" className="flex items-center gap-3 mb-10 group">
            <div className="w-11 h-11 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-xl flex items-center justify-center shadow-xl group-hover:shadow-2xl transition-all">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight text-white" >
              Student<span className="text-teal-400">Lancing</span>
            </span>
          </Link>

          {/* Profile Card */}
          <div className="mb-8 p-5 bg-gradient-to-br from-teal-950 to-slate-900 rounded-2xl border border-teal-900 shadow-xl">
            <Avatar className="w-16 h-16 mx-auto mb-4 border-3 border-teal-500 rounded-xl shadow-lg">
              <AvatarImage src={logoPreview || undefined} className="object-cover" />
              <AvatarFallback className="bg-gradient-to-br from-teal-500 to-cyan-600 text-white text-xl font-bold rounded-xl">
                {formData.companyName?.[0] || "C"}
              </AvatarFallback>
            </Avatar>
            <p className="text-center font-bold text-white text-lg" >
              {formData.companyName || "Company"}
            </p>
            <p className="text-center text-xs text-teal-400 font-semibold mt-2" >
              Editing profile
            </p>
          </div>

          {/* Back Button */}
          <Link href="/lancing/company-dashboard">
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
            <Link href="/lancing/company-dashboard" className="inline-block mb-4">
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
            </Link>
            <h1 className="text-3xl font-black" >Edit Company Profile</h1>
          </div>

          {/* Page Title */}
          <div className="hidden lg:block mb-10">
            <h1 className="text-4xl lg:text-5xl font-black tracking-tight mb-2" >
              <span className="text-slate-900">Edit Your</span>
              <br />
              <span className="bg-gradient-to-r from-teal-600 to-cyan-500 bg-clip-text text-transparent">Company Profile</span>
            </h1>
            <p className="text-lg text-slate-600 max-w-2xl" >
              Keep your profile updated to attract top student talent.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSave} className="max-w-4xl space-y-6">
            {/* Company Info Card */}
            <Card className="rounded-3xl shadow-xl border border-gray-100/50 overflow-hidden bg-white/80 backdrop-blur-sm">
              <CardHeader className="bg-gradient-to-r from-teal-50 to-cyan-50 border-b border-teal-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-lg" >Company Information</CardTitle>
                    <CardDescription >Your company details and branding</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                {/* Company Logo */}
                <div className="flex items-center gap-6">
                  <div className="relative group">
                    <Avatar className="w-24 h-24 border-4 border-teal-100 rounded-xl shadow-lg">
                      <AvatarImage src={logoPreview || undefined} className="object-cover" />
                      <AvatarFallback className="bg-gradient-to-br from-teal-400 to-cyan-500 text-white text-2xl font-bold rounded-xl">
                        {formData.companyName ? formData.companyName[0].toUpperCase() : "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div 
                      className="absolute inset-0 bg-black/40 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
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
                  <Input
                    id="companyName"
                    value={formData.companyName}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    placeholder="Your company name"
                    className="rounded-xl h-14 border-2 text-base focus:border-teal-500"
                    
                  />
                </div>

                {/* Recruiter Name */}
                <div className="space-y-2">
                  <Label htmlFor="recruiterName" className="text-sm font-semibold text-gray-700" >
                    Recruiter Name *
                  </Label>
                  <Input
                    id="recruiterName"
                    value={formData.recruiterName}
                    onChange={(e) => setFormData({ ...formData, recruiterName: e.target.value })}
                    placeholder="Your name"
                    className="rounded-xl h-14 border-2 text-base focus:border-teal-500"
                    
                  />
                </div>

                {/* Website */}
                <div className="space-y-2">
                  <Label htmlFor="website" className="text-sm font-semibold text-gray-700" >
                    Website (Optional)
                  </Label>
                  <Input
                    id="website"
                    type="url"
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    placeholder="https://yourcompany.com"
                    className="rounded-xl h-14 border-2 text-base focus:border-teal-500"
                    
                  />
                </div>

                {/* Industry Type */}
                <div className="space-y-2">
                  <Label htmlFor="industryType" className="text-sm font-semibold text-gray-700" >
                    Industry Type *
                  </Label>
                  <Select value={formData.industryType} onValueChange={(value) => setFormData({ ...formData, industryType: value })}>
                    <SelectTrigger className="rounded-xl h-14 border-2 text-base focus:border-teal-500" >
                      <SelectValue placeholder="Select industry" />
                    </SelectTrigger>
                    <SelectContent>
                      {INDUSTRY_TYPES.map(type => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Company Bio */}
                <div className="space-y-2">
                  <Label htmlFor="companyBio" className="text-sm font-semibold text-gray-700" >
                    Company Bio (Optional)
                  </Label>
                  <Textarea
                    id="companyBio"
                    value={formData.companyBio}
                    onChange={(e) => setFormData({ ...formData, companyBio: e.target.value })}
                    placeholder="Tell freelancers about your company..."
                    className="rounded-xl min-h-[120px] border-2 text-base focus:border-teal-500 resize-none"
                    
                  />
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 pt-8">
              <Link href="/lancing/company-dashboard" className="flex-1">
                <Button type="button" variant="outline" className="w-full rounded-xl font-semibold border-2 border-slate-300 h-12" >
                  Cancel
                </Button>
              </Link>
              <Button
                type="submit"
                disabled={isSaving}
                className="flex-1 bg-gradient-to-r from-teal-600 to-cyan-500 hover:from-teal-700 hover:to-cyan-600 text-white rounded-xl font-semibold h-12 flex items-center justify-center gap-2"
                
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </form>
        </main>
      </div>
    </div>
  );
}
