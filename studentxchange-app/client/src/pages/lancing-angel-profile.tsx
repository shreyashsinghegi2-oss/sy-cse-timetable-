import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sparkles, Loader2, Upload, User, Mail, Briefcase, Camera, CheckCircle2, ArrowRight, Linkedin, Globe } from "lucide-react";
import { useLancingAuth } from "@/hooks/use-lancing-auth";
import { useLocation, Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { firestore, auth } from "@/lib/firebase";
import { doc, setDoc } from "firebase/firestore";
import SEOHead from "@/components/seo/seo-head";

const EXPERTISE_AREAS = [
  "Technology & Software", "Marketing & Sales", "Finance & Accounting", 
  "Design & Creative", "Content & Writing", "Data & Analytics",
  "HR & Recruiting", "Operations", "Consulting", "Education",
  "Healthcare", "Legal", "Engineering", "Research", "Other"
];

export default function LancingAngelProfile() {
  const { user, isAuthenticated, role, profileComplete, refreshUser, isLoading: authLoading } = useLancingAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const photoInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    fullName: "",
    headline: "",
    expertise: "",
    linkedIn: "",
    website: "",
    bio: ""
  });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [shouldRedirect, setShouldRedirect] = useState<string | null>(null);

  useEffect(() => {
    if (shouldRedirect) {
      setLocation(shouldRedirect);
    }
  }, [shouldRedirect, setLocation]);

  useEffect(() => {
    if (authLoading) return;
    
    if (!isAuthenticated || role !== "angel") {
      setShouldRedirect("/student-lancing");
      return;
    }
    if (profileComplete) {
      setShouldRedirect("/lancing/angel-dashboard");
      return;
    }
  }, [authLoading, isAuthenticated, role, profileComplete]);

  if (authLoading || shouldRedirect) {
    return (
      <div className="min-h-screen sl-bg-atmosphere sl-grain-overlay flex items-center justify-center">
        <div className="text-center sl-slide-up">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-lg animate-pulse">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <Loader2 className="w-6 h-6 animate-spin text-purple-600 mx-auto" />
        </div>
      </div>
    );
  }

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({ title: "Image too large", description: "Max 5MB allowed", variant: "destructive" });
        return;
      }
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.fullName || !formData.headline || !formData.expertise) {
      toast({ title: "Please fill required fields", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      let photoUrl = "";

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

      if (photoFile && user) {
        photoUrl = await uploadFile(photoFile, 'photo');
      }

      if (user) {
        await setDoc(doc(firestore, "lancing_users", user.uid, "profile", "data"), {
          fullName: formData.fullName,
          headline: formData.headline,
          email: user.email,
          expertise: formData.expertise,
          linkedIn: formData.linkedIn,
          website: formData.website,
          bio: formData.bio,
          photoUrl,
          role: "angel",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });

        await setDoc(doc(firestore, "lancing_users", user.uid), {
          profileComplete: true
        }, { merge: true });

        await refreshUser();
        toast({ title: "Angel Recruiter profile created!" });
        setLocation("/lancing/angel-dashboard");
      }
    } catch (error: any) {
      toast({ title: "Failed to create profile", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen sl-bg-atmosphere sl-grain-overlay relative overflow-hidden">
      <SEOHead title="Complete Angel Profile - StudentLancing" description="Set up your angel recruiter profile" />

      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-purple-200/40 to-pink-300/30 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-gradient-to-br from-violet-200/30 to-purple-200/20 rounded-full blur-3xl" />
      </div>

      <nav className="relative z-10 px-6 py-4 border-b border-gray-100/50 bg-white/60 backdrop-blur-md">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/student-lancing" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-md">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight" >
              Student<span className="text-purple-600">Lancing</span>
            </span>
          </Link>
        </div>
      </nav>

      <div className="relative z-10 max-w-3xl mx-auto px-6 py-8 lg:py-12">
        <div className="text-center mb-10 sl-slide-up">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3" >
            <span className="text-gray-900">Set up your</span>{" "}
            <span className="bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent">angel profile</span>
          </h1>
          <p className="text-gray-600 max-w-lg mx-auto" >
            Help students grow their careers by posting opportunities and mentoring talent.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <Card className="rounded-3xl shadow-xl border border-gray-100/50 mb-6 overflow-hidden bg-white/80 backdrop-blur-sm sl-scale-in">
            <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 border-b border-purple-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-lg" >Angel Recruiter Profile</CardTitle>
                  <CardDescription >Your public recruiter details</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="flex items-center gap-6">
                <div className="relative group">
                  <Avatar className="w-24 h-24 border-4 border-purple-100 rounded-2xl shadow-lg">
                    <AvatarImage src={photoPreview || undefined} className="object-cover" />
                    <AvatarFallback className="bg-gradient-to-br from-purple-400 to-pink-500 text-white text-2xl font-bold rounded-2xl">
                      {formData.fullName ? formData.fullName[0].toUpperCase() : "A"}
                    </AvatarFallback>
                  </Avatar>
                  <div 
                    className="absolute inset-0 bg-black/40 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    onClick={() => photoInputRef.current?.click()}
                  >
                    <Camera className="w-6 h-6 text-white" />
                  </div>
                </div>
                <div>
                  <input type="file" ref={photoInputRef} accept="image/*" onChange={handlePhotoChange} className="hidden" />
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => photoInputRef.current?.click()} 
                    className="rounded-xl border-2 font-semibold"
                    
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Photo
                  </Button>
                  <p className="text-xs text-gray-500 mt-2" >JPG, PNG. Max 5MB</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="fullName" className="text-sm font-semibold text-gray-700" >
                  Full Name *
                </Label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    id="fullName"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    placeholder="Your full name"
                    className="pl-12 h-12 rounded-xl border-2 border-gray-200 focus:border-purple-500"
                    
                    data-testid="input-fullname"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="headline" className="text-sm font-semibold text-gray-700" >
                  Professional Headline *
                </Label>
                <div className="relative">
                  <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    id="headline"
                    value={formData.headline}
                    onChange={(e) => setFormData({ ...formData, headline: e.target.value })}
                    placeholder="e.g., Senior Tech Recruiter | Helping Students Launch Careers"
                    className="pl-12 h-12 rounded-xl border-2 border-gray-200 focus:border-purple-500"
                    
                    data-testid="input-headline"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="expertise" className="text-sm font-semibold text-gray-700" >
                  Area of Expertise *
                </Label>
                <Select value={formData.expertise} onValueChange={(v) => setFormData({ ...formData, expertise: v })}>
                  <SelectTrigger className="h-12 rounded-xl border-2 border-gray-200 focus:border-purple-500" >
                    <SelectValue placeholder="Select your expertise" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {EXPERTISE_AREAS.map(area => (
                      <SelectItem key={area} value={area} className="rounded-lg">{area}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="linkedIn" className="text-sm font-semibold text-gray-700" >
                    LinkedIn Profile
                  </Label>
                  <div className="relative">
                    <Linkedin className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      id="linkedIn"
                      value={formData.linkedIn}
                      onChange={(e) => setFormData({ ...formData, linkedIn: e.target.value })}
                      placeholder="linkedin.com/in/yourprofile"
                      className="pl-12 h-12 rounded-xl border-2 border-gray-200 focus:border-purple-500"
                      
                      data-testid="input-linkedin"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="website" className="text-sm font-semibold text-gray-700" >
                    Website
                  </Label>
                  <div className="relative">
                    <Globe className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      id="website"
                      value={formData.website}
                      onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                      placeholder="yourwebsite.com"
                      className="pl-12 h-12 rounded-xl border-2 border-gray-200 focus:border-purple-500"
                      
                      data-testid="input-website"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio" className="text-sm font-semibold text-gray-700" >
                  About You
                </Label>
                <Textarea
                  id="bio"
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  placeholder="Tell students about your background and how you can help them grow..."
                  className="rounded-xl min-h-[120px] border-2 border-gray-200 focus:border-purple-500 resize-none"
                  
                  data-testid="textarea-bio"
                />
              </div>
            </CardContent>
          </Card>

          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-14 bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600 text-white font-bold rounded-2xl shadow-xl shadow-purple-500/30 hover:shadow-purple-500/50 transition-all"
            
            data-testid="button-submit-profile"
          >
            {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : (
              <>
                Complete Profile
                <ArrowRight className="w-5 h-5 ml-2" />
              </>
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
