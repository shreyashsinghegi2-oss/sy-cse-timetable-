import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useCollabAuth } from "@/hooks/use-collab-auth";
import { useToast } from "@/hooks/use-toast";
import { getAuth, onAuthStateChanged, User } from "firebase/auth";
import app from "@/lib/firebase";
import { 
  ArrowLeft, ArrowRight, CheckCircle, Building, Users, 
  FileText, CreditCard, Upload, Loader2, GraduationCap,
  Lightbulb, Wrench, Cpu, Rocket, Copy, Clock, Image,
  Shield, UserPlus
} from "lucide-react";

const auth = getAuth(app);

async function waitForFirebaseAuth(timeoutMs = 10000): Promise<User | null> {
  return new Promise((resolve) => {
    if (auth.currentUser) {
      resolve(auth.currentUser);
      return;
    }
    
    const timeout = setTimeout(() => {
      unsubscribe();
      resolve(auth.currentUser);
    }, timeoutMs);
    
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      clearTimeout(timeout);
      unsubscribe();
      resolve(user);
    });
  });
}

const CATEGORIES = [
  { id: "innovators", name: "Innovators' Arena", subtitle: "Working Models", icon: Wrench, fee: 5000 },
  { id: "blueprint", name: "Blueprint Bonanza", subtitle: "Non-Working Models", icon: FileText, fee: 5000 },
  { id: "concept", name: "Concept Catalyst", subtitle: "CAD Designs", icon: Cpu, fee: 5000 },
  { id: "ideathon", name: "Ideathon Challenge", subtitle: "Startup Pitching", icon: Lightbulb, fee: 5000 }
];

const DEGREES = [
  { id: "diploma", label: "Diploma", fee: 5000 },
  { id: "btech", label: "B.Tech", fee: 5000 },
  { id: "mtech", label: "M.Tech", fee: 5000 },
  { id: "12th", label: "12th Science", fee: 0 }
];

const YEARS = [
  { id: "1", label: "1st Year" },
  { id: "2", label: "2nd Year" },
  { id: "3", label: "3rd Year" },
  { id: "4", label: "4th Year" },
  { id: "final", label: "Final Year" }
];

export default function StatetechRegister() {
  const [, setLocation] = useLocation();
  const { user, status } = useCollabAuth();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [existingRegistration, setExistingRegistration] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    collegeName: "",
    branch: "",
    degree: "",
    year: "",
    category: "",
    leadName: "",
    leadEmail: "",
    leadPhone: "",
    member2Name: "",
    member2Phone: "",
    member3Name: "",
    member3Phone: "",
    member4Name: "",
    member4Phone: "",
    member5Name: "",
    member5Phone: "",
    proposalUrl: "",
    proposalFileName: ""
  });

  const [proposalFile, setProposalFile] = useState<File | null>(null);
  const [isUploadingProposal, setIsUploadingProposal] = useState(false);
  const [transactionId, setTransactionId] = useState("");
  const [paymentScreenshot, setPaymentScreenshot] = useState<File | null>(null);
  const [paymentScreenshotUrl, setPaymentScreenshotUrl] = useState("");
  const [isUploadingScreenshot, setIsUploadingScreenshot] = useState(false);
  const [paymentSubmitted, setPaymentSubmitted] = useState(false);
  const [profileCreated, setProfileCreated] = useState(false);
  const [profileIncomplete, setProfileIncomplete] = useState(true);
  const [incompleteFields, setIncompleteFields] = useState<string[]>([]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      setLocation('/student-collab');
    }
  }, [status, setLocation]);

  useEffect(() => {
    const checkExisting = async () => {
      if (!user?.uid) return;
      try {
        const token = await auth.currentUser?.getIdToken(true);
        if (!token) return;
        
        const response = await fetch('/api/collab/social/statetech/registration', {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.registration) {
            setExistingRegistration(data.registration);
          }
        }
      } catch (err) {
        console.error("Error checking registration:", err);
      }
    };
    checkExisting();
  }, [user?.uid]);

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const isFreeRegistration = formData.degree === "12th";
  const selectedCategory = CATEGORIES.find(c => c.id === formData.category);

  const validateStep = (currentStep: number): boolean => {
    switch (currentStep) {
      case 1:
        if (!formData.collegeName || !formData.branch || !formData.degree) {
          toast({ title: "Missing fields", description: "Please fill all required fields", variant: "destructive" });
          return false;
        }
        if (formData.degree !== '12th' && !formData.year) {
          toast({ title: "Missing year", description: "Please select your year of study", variant: "destructive" });
          return false;
        }
        return true;
      case 2:
        if (!formData.category) {
          toast({ title: "Select category", description: "Please select a competition category", variant: "destructive" });
          return false;
        }
        return true;
      case 3:
        if (!formData.leadName || !formData.leadEmail || !formData.leadPhone) {
          toast({ title: "Missing fields", description: "Lead student details are required", variant: "destructive" });
          return false;
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.leadEmail)) {
          toast({ title: "Invalid email", description: "Please enter a valid email address", variant: "destructive" });
          return false;
        }
        const phoneRegex = /^[6-9]\d{9}$/;
        if (!phoneRegex.test(formData.leadPhone)) {
          toast({ title: "Invalid phone", description: "Please enter a valid 10-digit phone number", variant: "destructive" });
          return false;
        }
        return true;
      case 4:
        if (!formData.proposalUrl) {
          toast({ title: "Upload required", description: "Please upload your project proposal", variant: "destructive" });
          return false;
        }
        return true;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (validateStep(step)) {
      if (step === 4) {
        if (isFreeRegistration) {
          handleSubmit();
        } else {
          setStep(5);
        }
      } else {
        setStep(step + 1);
      }
    }
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleProposalUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      toast({ title: "Invalid file", description: "Only PDF files are allowed", variant: "destructive" });
      return;
    }

    if (file.size > 100 * 1024 * 1024) {
      toast({ title: "File too large", description: "Maximum file size is 100MB", variant: "destructive" });
      return;
    }

    setProposalFile(file);
    setIsUploadingProposal(true);

    try {
      const formDataUpload = new FormData();
      formDataUpload.append('file', file);
      formDataUpload.append('folder', 'statetech-proposals');

      const response = await fetch('/api/upload/firebase', {
        method: 'POST',
        body: formDataUpload
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const result = await response.json();
      updateField('proposalUrl', result.url);
      updateField('proposalFileName', file.name);
      toast({ title: "Success", description: "Proposal uploaded successfully" });
    } catch (err) {
      console.error("Upload error:", err);
      toast({ title: "Upload failed", description: "Please try again", variant: "destructive" });
    } finally {
      setIsUploadingProposal(false);
    }
  };

  const handleScreenshotUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({ title: "Invalid file", description: "Please upload an image file", variant: "destructive" });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "File too large", description: "Maximum file size is 10MB", variant: "destructive" });
      return;
    }

    setPaymentScreenshot(file);
    setIsUploadingScreenshot(true);

    try {
      const formDataUpload = new FormData();
      formDataUpload.append('file', file);
      formDataUpload.append('folder', 'statetech-payments');

      const response = await fetch('/api/upload/firebase', {
        method: 'POST',
        body: formDataUpload
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const result = await response.json();
      setPaymentScreenshotUrl(result.url);
      toast({ title: "Success", description: "Screenshot uploaded successfully" });
    } catch (err) {
      console.error("Upload error:", err);
      toast({ title: "Upload failed", description: "Please try again", variant: "destructive" });
      setPaymentScreenshot(null);
    } finally {
      setIsUploadingScreenshot(false);
    }
  };

  const handlePaymentSubmit = async () => {
    if (!transactionId.trim()) {
      toast({ title: "Missing UTR/Transaction ID", description: "Please enter your UTR/Transaction ID", variant: "destructive" });
      return;
    }
    
    if (!paymentScreenshotUrl) {
      toast({ title: "Missing screenshot", description: "Please upload your payment screenshot", variant: "destructive" });
      return;
    }

    if (!formData.collegeName || !formData.category || !formData.leadName) {
      toast({ title: "Missing information", description: "Please go back and fill in all required fields", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);

    try {
      let token: string | null = null;

      const currentUser = await waitForFirebaseAuth(10000);
      if (currentUser) {
        try {
          token = await currentUser.getIdToken(true);
          localStorage.setItem('collabAuthToken', token);
        } catch (tokenErr) {
          console.warn('[STATETECH] Firebase token refresh failed, trying localStorage fallback');
        }
      }

      if (!token) {
        token = localStorage.getItem('collabAuthToken');
      }
      
      if (!token) {
        toast({ title: "Please sign in", description: "Sign in to Student Collab first, then return here to register", variant: "destructive" });
        setIsSubmitting(false);
        return;
      }

      const teamMembers = [];
      if (formData.member2Name) teamMembers.push({ name: formData.member2Name, phone: formData.member2Phone });
      if (formData.member3Name) teamMembers.push({ name: formData.member3Name, phone: formData.member3Phone });
      if (formData.member4Name) teamMembers.push({ name: formData.member4Name, phone: formData.member4Phone });
      if (formData.member5Name) teamMembers.push({ name: formData.member5Name, phone: formData.member5Phone });

      const registration = {
        collegeName: formData.collegeName,
        branch: formData.branch,
        degree: formData.degree,
        year: formData.year || '',
        category: formData.category,
        leadName: formData.leadName,
        leadEmail: formData.leadEmail,
        leadPhone: formData.leadPhone,
        teamMembers,
        proposalUrl: formData.proposalUrl,
        proposalFileName: formData.proposalFileName,
        paymentRequired: true,
        paymentStatus: 'paid',
        transactionId: transactionId.trim(),
        paymentScreenshot: paymentScreenshotUrl,
        registrationFee: 5000
      };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, 30000);
      
      let response: Response;
      try {
        response = await fetch('/api/collab/social/statetech/register', {
          method: 'POST',
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(registration),
          signal: controller.signal
        });
        clearTimeout(timeoutId);
      } catch (fetchErr: any) {
        clearTimeout(timeoutId);
        console.error('[STATETECH] Fetch error:', fetchErr);
        if (fetchErr.name === 'AbortError') {
          toast({ title: "Request timed out", description: "Server took too long to respond. Please try again.", variant: "destructive" });
        } else {
          toast({ title: "Network error", description: fetchErr?.message || "Could not reach server", variant: "destructive" });
        }
        setIsSubmitting(false);
        return;
      }

      let responseData: any;
      try {
        const responseText = await response.text();
        responseData = responseText ? JSON.parse(responseText) : {};
      } catch (parseErr) {
        console.error('[STATETECH] JSON parse error:', parseErr);
        responseData = { error: 'Invalid server response' };
      }

      if (!response.ok) {
        throw new Error(responseData.error || `Server error: ${response.status}`);
      }

      setPaymentSubmitted(true);
      toast({ title: "Registration submitted!", description: "Your registration is pending verification." });
    } catch (err: any) {
      console.error("[STATETECH] Registration error:", err);
      const errorMessage = err?.message || "Failed to submit registration. Please try again.";
      toast({ title: "Error", description: errorMessage, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);

    try {
      let token: string | null = null;

      const currentUser = await waitForFirebaseAuth(10000);
      if (currentUser) {
        try {
          token = await currentUser.getIdToken(true);
          localStorage.setItem('collabAuthToken', token);
        } catch (tokenErr) {
          console.warn('[STATETECH-FREE] Firebase token refresh failed, trying localStorage fallback');
        }
      }

      if (!token) {
        token = localStorage.getItem('collabAuthToken');
      }
      
      if (!token) {
        toast({ title: "Please sign in", description: "Sign in to Student Collab first, then return here to register", variant: "destructive" });
        setIsSubmitting(false);
        return;
      }

      const teamMembers = [];
      if (formData.member2Name) teamMembers.push({ name: formData.member2Name, phone: formData.member2Phone });
      if (formData.member3Name) teamMembers.push({ name: formData.member3Name, phone: formData.member3Phone });
      if (formData.member4Name) teamMembers.push({ name: formData.member4Name, phone: formData.member4Phone });
      if (formData.member5Name) teamMembers.push({ name: formData.member5Name, phone: formData.member5Phone });

      const registration = {
        collegeName: formData.collegeName,
        branch: formData.branch,
        degree: formData.degree,
        year: formData.year || (formData.degree === '12th' ? '12th' : ''),
        category: formData.category,
        leadName: formData.leadName,
        leadEmail: formData.leadEmail,
        leadPhone: formData.leadPhone,
        teamMembers,
        proposalUrl: formData.proposalUrl,
        proposalFileName: formData.proposalFileName,
        paymentRequired: !isFreeRegistration,
        paymentStatus: isFreeRegistration ? 'exempt' : 'pending',
        registrationFee: isFreeRegistration ? 0 : 5000
      };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, 30000);

      let response: Response;
      try {
        response = await fetch('/api/collab/social/statetech/register', {
          method: 'POST',
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(registration),
          signal: controller.signal
        });
        clearTimeout(timeoutId);
      } catch (fetchErr: any) {
        clearTimeout(timeoutId);
        console.error('[STATETECH-FREE] Fetch error:', fetchErr);
        if (fetchErr.name === 'AbortError') {
          toast({ title: "Request timed out", description: "Server took too long. Please try again.", variant: "destructive" });
        } else {
          toast({ title: "Network error", description: fetchErr?.message || "Could not reach server", variant: "destructive" });
        }
        setIsSubmitting(false);
        return;
      }

      let responseData: any;
      try {
        const responseText = await response.text();
        responseData = responseText ? JSON.parse(responseText) : {};
      } catch (parseErr) {
        console.error('[STATETECH-FREE] JSON parse error:', parseErr);
        responseData = { error: 'Invalid server response' };
      }

      if (!response.ok) {
        throw new Error(responseData.error || `Server error: ${response.status}`);
      }

      setProfileCreated(responseData.profileCreated || false);
      setProfileIncomplete(responseData.profileIncomplete ?? true);
      setIncompleteFields(responseData.incompleteFields || []);

      if (isFreeRegistration) {
        toast({ title: "Registration submitted!", description: "Your registration is pending verification." });
        setPaymentSubmitted(true);
        setStep(5);
      } else {
        setStep(5);
      }
    } catch (err: any) {
      console.error("[STATETECH-FREE] Registration error:", err);
      const errorMessage = err?.message || "Failed to submit registration. Please try again.";
      toast({ title: "Error", description: errorMessage, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-800 via-blue-800/80 to-indigo-900/90 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
      </div>
    );
  }

  if (existingRegistration) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-800 via-blue-800/80 to-indigo-900/90">
        <div className="max-w-2xl mx-auto px-4 py-8">
          <Button variant="ghost" onClick={() => setLocation('/statetech-2026')} className="mb-6 text-blue-300 hover:text-white">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to STATETECH
          </Button>
          
          <Card className="border-0 shadow-2xl bg-white/10 backdrop-blur">
            <CardContent className="p-8 text-center">
              <CheckCircle className="h-16 w-16 text-green-400 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-white mb-2">Already Registered</h2>
              <p className="text-blue-200 mb-6">
                You have already submitted a registration for STATETECH SHOWCASE 2026.
              </p>
              <div className="bg-white/10 rounded-xl p-4 text-left mb-6">
                <p className="text-sm text-blue-300">Category: <span className="text-white font-medium">{existingRegistration.category}</span></p>
                <p className="text-sm text-blue-300 mt-2">Status: 
                  <span className={`ml-2 px-2 py-1 rounded text-xs font-medium ${
                    existingRegistration.verificationStatus === 'verified' 
                      ? 'bg-green-500/20 text-green-300' 
                      : existingRegistration.verificationStatus === 'rejected'
                      ? 'bg-red-500/20 text-red-300'
                      : 'bg-yellow-500/20 text-yellow-300'
                  }`}>
                    {existingRegistration.verificationStatus === 'verified' ? 'Verified Participant' :
                     existingRegistration.verificationStatus === 'rejected' ? 'Rejected' : 'Pending Verification'}
                  </span>
                </p>
              </div>
              {existingRegistration.paymentStatus === 'pending' && (
                <Button 
                  onClick={() => setLocation('/statetech-2026/payment')}
                  className="bg-gradient-to-r from-yellow-500 to-orange-500"
                >
                  Complete Payment
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Button variant="ghost" onClick={() => setLocation('/statetech-2026')} className="mb-6 text-blue-300 hover:text-white">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to STATETECH
        </Button>

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Team Registration</h1>
          <p className="text-blue-200">STATETECH SHOWCASE 2026</p>
        </div>

        <div className="flex items-center justify-between mb-8">
          {[1, 2, 3, 4, 5].map((s) => (
            <div key={s} className="flex items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                step >= s 
                  ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white' 
                  : 'bg-white/10 text-blue-300'
              }`}>
                {step > s ? <CheckCircle className="h-5 w-5" /> : s}
              </div>
              {s < 5 && (
                <div className={`w-8 md:w-16 h-1 ${step > s ? 'bg-yellow-500' : 'bg-white/10'}`} />
              )}
            </div>
          ))}
        </div>

        <Card className="border-0 shadow-2xl bg-white/10 backdrop-blur">
          <CardContent className="p-6 md:p-8">
            {step === 1 && (
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-6">
                  <Building className="h-6 w-6 text-blue-400" />
                  <h2 className="text-xl font-bold text-white">College & Academic Details</h2>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label className="text-blue-200">College Name *</Label>
                    <Input 
                      value={formData.collegeName}
                      onChange={(e) => updateField('collegeName', e.target.value)}
                      placeholder="Enter your college name"
                      className="bg-white/10 border-white/20 text-white placeholder:text-blue-300/50"
                    />
                  </div>

                  <div>
                    <Label className="text-blue-200">Branch / Department *</Label>
                    <Input 
                      value={formData.branch}
                      onChange={(e) => updateField('branch', e.target.value)}
                      placeholder="e.g., Computer Science, Mechanical"
                      className="bg-white/10 border-white/20 text-white placeholder:text-blue-300/50"
                    />
                  </div>

                  <div>
                    <Label className="text-blue-200 mb-3 block">Degree *</Label>
                    <RadioGroup value={formData.degree} onValueChange={(v) => updateField('degree', v)}>
                      <div className="grid grid-cols-2 gap-3">
                        {DEGREES.map((deg) => (
                          <div 
                            key={deg.id}
                            className={`p-4 rounded-xl border cursor-pointer transition-all ${
                              formData.degree === deg.id 
                                ? 'bg-yellow-500/20 border-yellow-500' 
                                : 'bg-white/5 border-white/10 hover:bg-white/10'
                            }`}
                            onClick={() => updateField('degree', deg.id)}
                          >
                            <RadioGroupItem value={deg.id} id={deg.id} className="sr-only" />
                            <p className="text-white font-medium text-sm">{deg.label}</p>
                            <p className={`text-xs mt-1 ${deg.fee === 0 ? 'text-green-400' : 'text-blue-300'}`}>
                              {deg.fee === 0 ? 'FREE' : `₹${deg.fee}`}
                            </p>
                          </div>
                        ))}
                      </div>
                    </RadioGroup>
                  </div>

                  {formData.degree && formData.degree !== '12th' && (
                    <div>
                      <Label className="text-blue-200 mb-3 block">Year of Study *</Label>
                      <RadioGroup value={formData.year} onValueChange={(v) => updateField('year', v)}>
                        <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
                          {YEARS.map((yr) => (
                            <div 
                              key={yr.id}
                              className={`p-3 rounded-xl border cursor-pointer transition-all text-center ${
                                formData.year === yr.id 
                                  ? 'bg-yellow-500/20 border-yellow-500' 
                                  : 'bg-white/5 border-white/10 hover:bg-white/10'
                              }`}
                              onClick={() => updateField('year', yr.id)}
                            >
                              <RadioGroupItem value={yr.id} id={`year-${yr.id}`} className="sr-only" />
                              <p className="text-white font-medium text-sm">{yr.label}</p>
                            </div>
                          ))}
                        </div>
                      </RadioGroup>
                    </div>
                  )}
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-6">
                  <Rocket className="h-6 w-6 text-blue-400" />
                  <h2 className="text-xl font-bold text-white">Select Competition Category</h2>
                </div>

                <RadioGroup value={formData.category} onValueChange={(v) => updateField('category', v)}>
                  <div className="space-y-3">
                    {CATEGORIES.map((cat) => (
                      <div 
                        key={cat.id}
                        className={`p-4 rounded-xl border cursor-pointer transition-all ${
                          formData.category === cat.id 
                            ? 'bg-yellow-500/20 border-yellow-500' 
                            : 'bg-white/5 border-white/10 hover:bg-white/10'
                        }`}
                        onClick={() => updateField('category', cat.id)}
                      >
                        <RadioGroupItem value={cat.id} id={cat.id} className="sr-only" />
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                            <cat.icon className="h-6 w-6 text-white" />
                          </div>
                          <div className="flex-1">
                            <p className="text-white font-bold">{cat.name}</p>
                            <p className="text-blue-300 text-sm">{cat.subtitle}</p>
                          </div>
                          <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                            isFreeRegistration ? 'bg-green-500/20 text-green-300' : 'bg-yellow-500/20 text-yellow-300'
                          }`}>
                            {isFreeRegistration ? 'FREE' : `₹${cat.fee}`}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </RadioGroup>

                {isFreeRegistration && (
                  <div className="bg-green-500/20 border border-green-500/30 rounded-xl p-4">
                    <p className="text-green-300 text-sm">
                      ✅ 12th standard participants are exempted from registration fees.
                    </p>
                  </div>
                )}
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-6">
                  <Users className="h-6 w-6 text-blue-400" />
                  <h2 className="text-xl font-bold text-white">Team Information</h2>
                </div>
                <p className="text-blue-300 text-sm mb-4">Maximum 5 team members allowed</p>

                <div className="space-y-4">
                  <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
                    <p className="text-yellow-300 text-sm font-medium mb-3">Lead Student (Required)</p>
                    <div className="space-y-3">
                      <Input 
                        value={formData.leadName}
                        onChange={(e) => updateField('leadName', e.target.value)}
                        placeholder="Full Name *"
                        className="bg-white/10 border-white/20 text-white placeholder:text-blue-300/50"
                      />
                      <Input 
                        type="email"
                        value={formData.leadEmail}
                        onChange={(e) => updateField('leadEmail', e.target.value)}
                        placeholder="Email Address *"
                        className="bg-white/10 border-white/20 text-white placeholder:text-blue-300/50"
                      />
                      <Input 
                        type="tel"
                        value={formData.leadPhone}
                        onChange={(e) => updateField('leadPhone', e.target.value)}
                        placeholder="Contact Number *"
                        className="bg-white/10 border-white/20 text-white placeholder:text-blue-300/50"
                      />
                    </div>
                  </div>

                  {[2, 3, 4, 5].map((num) => (
                    <div key={num} className="bg-white/5 border border-white/10 rounded-xl p-4">
                      <p className="text-blue-300 text-sm mb-3">Team Member {num} (Optional)</p>
                      <div className="grid grid-cols-2 gap-3">
                        <Input 
                          value={(formData as any)[`member${num}Name`]}
                          onChange={(e) => updateField(`member${num}Name`, e.target.value)}
                          placeholder="Full Name"
                          className="bg-white/10 border-white/20 text-white placeholder:text-blue-300/50"
                        />
                        <Input 
                          type="tel"
                          value={(formData as any)[`member${num}Phone`]}
                          onChange={(e) => updateField(`member${num}Phone`, e.target.value)}
                          placeholder="Contact Number"
                          className="bg-white/10 border-white/20 text-white placeholder:text-blue-300/50"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-6">
                  <FileText className="h-6 w-6 text-blue-400" />
                  <h2 className="text-xl font-bold text-white">Project Proposal Upload</h2>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                  <div className="text-center">
                    <Upload className="h-12 w-12 text-blue-400 mx-auto mb-4" />
                    <p className="text-white font-medium mb-2">Upload your project proposal</p>
                    <p className="text-blue-300 text-sm mb-4">PDF format only • Maximum 100MB</p>
                    
                    <input 
                      type="file"
                      accept=".pdf"
                      onChange={handleProposalUpload}
                      className="hidden"
                      id="proposal-upload"
                      disabled={isUploadingProposal}
                    />
                    <label 
                      htmlFor="proposal-upload"
                      className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl font-medium cursor-pointer transition-all ${
                        isUploadingProposal 
                          ? 'bg-gray-500 text-gray-300 cursor-not-allowed' 
                          : 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:from-blue-600 hover:to-indigo-700'
                      }`}
                    >
                      {isUploadingProposal ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="h-5 w-5" />
                          Choose PDF File
                        </>
                      )}
                    </label>

                    {formData.proposalUrl && (
                      <div className="mt-4 bg-green-500/20 border border-green-500/30 rounded-xl p-4">
                        <div className="flex items-center gap-3">
                          <FileText className="h-8 w-8 text-green-400" />
                          <div className="text-left flex-1">
                            <p className="text-white font-medium text-sm">{formData.proposalFileName}</p>
                            <p className="text-green-300 text-xs">Uploaded successfully</p>
                          </div>
                          <CheckCircle className="h-6 w-6 text-green-400" />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {step === 5 && !isFreeRegistration && !paymentSubmitted && (
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-6">
                  <CreditCard className="h-6 w-6 text-blue-400" />
                  <h2 className="text-xl font-bold text-white">Complete Payment</h2>
                </div>

                <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-xl p-4 text-center">
                  <p className="text-3xl font-bold text-white mb-1">₹5,000</p>
                  <p className="text-yellow-300 text-sm">Registration Fee for {selectedCategory?.name}</p>
                </div>

                <div className="bg-white rounded-xl p-4 text-center">
                  <p className="text-gray-700 font-medium mb-2">Scan QR Code to Pay</p>
                  <img 
                    src="/images/statetech-qr.jpeg" 
                    alt="Payment QR Code" 
                    className="w-64 h-64 mx-auto mb-3 object-contain"
                  />
                  <div className="flex items-center justify-center gap-2 bg-gray-100 rounded-lg px-4 py-2">
                    <span className="text-gray-800 font-mono text-sm">Nisarga11069600@aubank</span>
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText('Nisarga11069600@aubank');
                        toast({ title: "Copied!", description: "UPI ID copied to clipboard" });
                      }}
                      className="p-1 hover:bg-gray-200 rounded"
                    >
                      <Copy className="h-4 w-4 text-gray-600" />
                    </button>
                  </div>
                  <p className="text-gray-500 text-xs mt-2">Works with any UPI App</p>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label className="text-white mb-2 block">UTR / Transaction ID *</Label>
                    <Input
                      value={transactionId}
                      onChange={(e) => setTransactionId(e.target.value)}
                      placeholder="Enter your UTR or Transaction ID"
                      className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                    />
                    <p className="text-blue-200/70 text-xs mt-1">You can find this in your UPI app payment history</p>
                  </div>

                  <div>
                    <Label className="text-white mb-2 block">Payment Screenshot *</Label>
                    <div className="border-2 border-dashed border-white/30 rounded-xl p-4 text-center hover:border-blue-400/50 transition-colors">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleScreenshotUpload}
                        className="hidden"
                        id="screenshot-upload"
                        disabled={isUploadingScreenshot}
                      />
                      <label htmlFor="screenshot-upload" className="cursor-pointer">
                        {isUploadingScreenshot ? (
                          <div className="flex items-center justify-center gap-2">
                            <Loader2 className="h-6 w-6 animate-spin text-blue-400" />
                            <span className="text-blue-200">Uploading...</span>
                          </div>
                        ) : paymentScreenshotUrl ? (
                          <div className="space-y-2">
                            <img 
                              src={paymentScreenshotUrl} 
                              alt="Payment screenshot" 
                              className="max-h-32 mx-auto rounded-lg"
                            />
                            <div className="flex items-center justify-center gap-2 text-green-400">
                              <CheckCircle className="h-4 w-4" />
                              <span className="text-sm">Screenshot uploaded</span>
                            </div>
                            <p className="text-blue-200/70 text-xs">Click to replace</p>
                          </div>
                        ) : (
                          <div className="py-4">
                            <Image className="h-10 w-10 text-blue-300 mx-auto mb-2" />
                            <p className="text-blue-200">Click to upload payment screenshot</p>
                            <p className="text-blue-200/60 text-xs mt-1">PNG, JPG up to 10MB</p>
                          </div>
                        )}
                      </label>
                    </div>
                  </div>
                </div>

                <Button 
                  onClick={handlePaymentSubmit}
                  disabled={isSubmitting || isUploadingScreenshot || !transactionId.trim() || !paymentScreenshotUrl}
                  className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 py-6 text-lg"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-5 w-5 mr-2" />
                      Submit Registration
                    </>
                  )}
                </Button>
              </div>
            )}

            {step === 5 && isFreeRegistration && paymentSubmitted && (
              <div className="text-center space-y-6 py-8">
                <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle className="h-10 w-10 text-green-400" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white mb-2">Registration Submitted!</h2>
                  <p className="text-blue-200 max-w-md mx-auto">
                    Your registration has been received and is currently under verification.
                  </p>
                  <div className="inline-flex items-center gap-2 mt-3 px-3 py-1.5 rounded-full bg-green-500/20 border border-green-500/30">
                    <span className="text-green-300 text-sm font-medium">12th Science - FREE Registration</span>
                  </div>
                </div>

                {profileCreated && (
                  <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 max-w-md mx-auto">
                    <div className="flex items-center gap-2 text-green-300 mb-2">
                      <CheckCircle className="h-5 w-5" />
                      <span className="font-medium">Profile Created!</span>
                    </div>
                    <p className="text-blue-200 text-sm">
                      We've created your Student Collab profile using your registration details.
                    </p>
                  </div>
                )}

                {profileIncomplete && incompleteFields.length > 0 && (
                  <div className="bg-gradient-to-br from-blue-600/20 to-purple-600/20 rounded-xl p-5 max-w-md mx-auto border border-blue-500/20 text-left">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                        <Shield className="h-5 w-5 text-blue-400" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-base font-semibold text-white mb-1.5">
                          Complete Your Profile for Faster Verification
                        </h3>
                        <p className="text-blue-200 text-sm mb-3 leading-relaxed">
                          Add these details to get verified faster and stay updated on event announcements:
                        </p>
                        
                        <div className="flex flex-wrap gap-2 mb-4">
                          {incompleteFields.map((field) => (
                            <span key={field} className="px-2.5 py-1 text-xs rounded-full bg-yellow-500/20 text-yellow-300 border border-yellow-500/30">
                              {field === 'bio' ? 'Bio' : 
                               field === 'skills' ? 'Skills' : 
                               field === 'interests' ? 'Interests' : 
                               field === 'avatarUrl' ? 'Profile Photo' : 
                               field === 'primaryStream' ? 'Academic Stream' : field}
                            </span>
                          ))}
                        </div>
                        
                        <Button
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                          onClick={() => setLocation('/student-collab/profile/edit')}
                        >
                          <UserPlus className="h-4 w-4 mr-2" />
                          Complete Profile Now
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {!profileIncomplete && (
                  <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 max-w-md mx-auto">
                    <div className="flex items-center gap-2 text-green-300">
                      <CheckCircle className="h-5 w-5" />
                      <span className="font-medium">Profile Complete - Priority Verification Enabled!</span>
                    </div>
                  </div>
                )}

                <Button 
                  onClick={() => setLocation('/statetech-2026')}
                  variant="outline"
                  className="border-blue-500/30 text-blue-300 hover:bg-blue-500/10"
                >
                  Back to STATETECH
                </Button>
              </div>
            )}

            {step === 5 && !isFreeRegistration && paymentSubmitted && (
              <div className="text-center space-y-6 py-8">
                <div className="w-20 h-20 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto">
                  <Clock className="h-10 w-10 text-blue-400" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white mb-2">Verification Pending</h2>
                  <p className="text-blue-200 max-w-md mx-auto">
                    Your registration has been received and is currently under verification.
                  </p>
                </div>
                <div className="bg-white/10 rounded-xl p-4 max-w-sm mx-auto">
                  <p className="text-sm text-blue-200">Transaction ID</p>
                  <p className="text-white font-mono">{transactionId}</p>
                </div>

                {profileCreated && (
                  <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 max-w-md mx-auto">
                    <div className="flex items-center gap-2 text-green-300 mb-2">
                      <CheckCircle className="h-5 w-5" />
                      <span className="font-medium">Profile Created!</span>
                    </div>
                    <p className="text-blue-200 text-sm">
                      We've created your Student Collab profile using your registration details.
                    </p>
                  </div>
                )}

                {profileIncomplete && incompleteFields.length > 0 && (
                  <div className="bg-gradient-to-br from-blue-600/20 to-purple-600/20 rounded-xl p-5 max-w-md mx-auto border border-blue-500/20 text-left">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                        <Shield className="h-5 w-5 text-blue-400" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-base font-semibold text-white mb-1.5">
                          Complete Your Profile for Faster Verification
                        </h3>
                        <p className="text-blue-200 text-sm mb-3 leading-relaxed">
                          Add these details to get verified faster and stay updated on event announcements:
                        </p>
                        
                        <div className="flex flex-wrap gap-2 mb-4">
                          {incompleteFields.map((field) => (
                            <span key={field} className="px-2.5 py-1 text-xs rounded-full bg-yellow-500/20 text-yellow-300 border border-yellow-500/30">
                              {field === 'bio' ? 'Bio' : 
                               field === 'skills' ? 'Skills' : 
                               field === 'interests' ? 'Interests' : 
                               field === 'avatarUrl' ? 'Profile Photo' : 
                               field === 'primaryStream' ? 'Academic Stream' : field}
                            </span>
                          ))}
                        </div>
                        
                        <Button
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                          onClick={() => setLocation('/student-collab/profile/edit')}
                        >
                          <UserPlus className="h-4 w-4 mr-2" />
                          Complete Profile Now
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {!profileIncomplete && (
                  <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 max-w-md mx-auto">
                    <div className="flex items-center gap-2 text-green-300">
                      <CheckCircle className="h-5 w-5" />
                      <span className="font-medium">Profile Complete - Priority Verification Enabled!</span>
                    </div>
                  </div>
                )}

                <Button 
                  onClick={() => setLocation('/statetech-2026')}
                  variant="outline"
                  className="border-blue-500/30 text-blue-300 hover:bg-blue-500/10"
                >
                  Back to STATETECH
                </Button>
              </div>
            )}

            {step < 5 && (
              <div className="flex justify-between mt-8">
                {step > 1 && (
                  <Button variant="outline" onClick={handleBack} className="border-white/20 text-blue-300 hover:bg-white/10">
                    <ArrowLeft className="h-4 w-4 mr-2" /> Back
                  </Button>
                )}
                <Button 
                  onClick={handleNext}
                  disabled={isSubmitting || isUploadingProposal}
                  className="ml-auto bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : step === 4 && isFreeRegistration ? (
                    <>
                      Submit Registration
                      <CheckCircle className="h-4 w-4 ml-2" />
                    </>
                  ) : (
                    <>
                      Continue
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            )}

            {step === 5 && !paymentSubmitted && (
              <div className="flex justify-start mt-8">
                <Button variant="outline" onClick={handleBack} className="border-white/20 text-blue-300 hover:bg-white/10">
                  <ArrowLeft className="h-4 w-4 mr-2" /> Back
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
