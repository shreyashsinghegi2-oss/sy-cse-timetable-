import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Building2, LogOut, Plus, Loader2, Clock, 
  IndianRupee, MapPin, Calendar, Eye, Trash2,
  Users, Send, CheckCircle2, Bell, MessageSquare, X, Zap, Target,
  Briefcase, GraduationCap, FileText, Award, Phone, Mail, UserCheck, ArrowLeft, HelpCircle
} from "lucide-react";
import { useLancingAuth } from "@/hooks/use-lancing-auth";
import { useLocation, Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { firestore } from "@/lib/firebase";
import { collection, getDocs, doc, getDoc, setDoc, deleteDoc, query, where, updateDoc, writeBatch } from "firebase/firestore";
import SEOHead from "@/components/seo/seo-head";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface Application {
  id: string;
  applicantId: string;
  applicantName: string;
  applicantEmail: string;
  applicantProfileImage?: string;
  message: string;
  status: "under_process" | "accepted" | "rejected" | "hired";
  appliedAt: string;
  hiredContactEmail?: string;
  hiredContactPhone?: string;
  contactSubmittedAt?: string;
  // Escrow payment fields
  escrowStatus?: "pending" | "funded" | "released" | "refunded";
  escrowAmount?: number;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  workApproved?: boolean;
  workApprovedAt?: string;
}

interface ApplicantProfile {
  fullName: string;
  skills: string[];
  aboutMe: string;
  experience: string;
  resumeUrl: string | null;
  certificateUrl: string | null;
  profileImageUrl: string | null;
}

interface Job {
  id: string;
  title: string;
  description: string;
  skills: string[];
  budget: string;
  paymentAmount?: number; // Exact amount for escrow
  deadline: string;
  mode: string;
  duration: string;
  companyId: string;
  createdAt: string;
  applicationsCount?: number;
  applications?: Application[];
}

interface CompanyProfile {
  companyName: string;
  recruiterName: string;
  logoUrl?: string;
  industryType: string;
}

const SKILL_OPTIONS = [
  "JavaScript", "TypeScript", "React", "Node.js", "Python", "Java", "C++",
  "HTML/CSS", "UI/UX Design", "Graphic Design", "Content Writing", "Video Editing",
  "Data Analysis", "Machine Learning", "Mobile Development", "WordPress", "SEO"
];

const TASK_TYPES = [
  "Writing", "Design", "Development", "Analysis", "Support", "Research", 
  "Translation", "Data Entry", "Testing", "Marketing"
];

const INTERNSHIP_FIELDS = [
  "Technology", "Finance", "Healthcare", "Marketing", "Education", 
  "Engineering", "Research", "Design", "Operations", "HR"
];

export default function LancingCompanyDashboard() {
  const { user, isAuthenticated, role, logout, isLoading: authLoading, dataLoaded, hasSelectedRole, profileComplete } = useLancingAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [activeTab, setActiveTab] = useState("post");
  const [postType, setPostType] = useState<"job" | "internship" | "microtask">("job");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [internships, setInternships] = useState<any[]>([]);
  const [microTasks, setMicroTasks] = useState<any[]>([]);
  const [profile, setProfile] = useState<CompanyProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [selectedJob, setSelectedJob] = useState<any | null>(null);
  const [selectedItemType, setSelectedItemType] = useState<"job" | "internship" | "microtask">("job");
  const [showApplicantsDialog, setShowApplicantsDialog] = useState(false);
  const [jobApplicants, setJobApplicants] = useState<Application[]>([]);
  const [isLoadingApplicants, setIsLoadingApplicants] = useState(false);
  
  // Applicant profile view state
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [selectedApplicant, setSelectedApplicant] = useState<Application | null>(null);
  const [applicantProfile, setApplicantProfile] = useState<ApplicantProfile | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [isHiring, setIsHiring] = useState(false);
  const [hiringMessage, setHiringMessage] = useState("");
  const [showHireDialog, setShowHireDialog] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [processingMessageId, setProcessingMessageId] = useState<string | null>(null);
  const [companyMessages, setCompanyMessages] = useState<any[]>([]);

  const [jobForm, setJobForm] = useState({
    title: "",
    description: "",
    skills: [] as string[],
    budget: "",
    paymentAmount: "",
    deadline: "",
    mode: "Remote",
    duration: ""
  });
  const [internshipForm, setInternshipForm] = useState({
    title: "",
    description: "",
    skills: [] as string[],
    stipend: "",
    duration: "",
    mode: "Remote",
    field: ""
  });
  const [microTaskForm, setMicroTaskForm] = useState({
    title: "",
    description: "",
    taskType: "",
    payment: "",
    deadline: ""
  });
  const [skillInput, setSkillInput] = useState("");

  useEffect(() => {
    if (authLoading) return;
    setAuthChecked(true);
    if (!isAuthenticated || !user) {
      setLocation("/lancing/login");
      return;
    }
    // Wait for Firestore role data before deciding — redirecting to
    // role-select while role is still loading bounces logged-in users away.
    if (!dataLoaded) return;
    if (!hasSelectedRole || !role) {
      setLocation("/lancing/role-select");
      return;
    }
    if (role !== "company") {
      setLocation(role === "angel" ? "/lancing/angel-dashboard" : "/lancing/freelancer-dashboard");
      return;
    }
    if (!profileComplete) {
      setLocation("/lancing/company-profile");
      return;
    }
    setIsAuthorized(true);
  }, [authLoading, dataLoaded, isAuthenticated, hasSelectedRole, role, profileComplete, user, setLocation]);
  
  useEffect(() => {
    if (isAuthorized) {
      fetchData();
    }
  }, [isAuthorized]);

  // Fetch messages when messages tab is active
  useEffect(() => {
    if (activeTab !== "messages" || !user?.uid || !isAuthorized) return;

    const fetchMessages = async () => {
      try {
        const response = await fetch(`/api/lancing/recruiter/${user.uid}/messages`, {
          headers: {
            "Authorization": `Bearer ${user.uid}`
          }
        });
        if (response.ok) {
          const data = await response.json();
          setCompanyMessages(data.messages || []);
        }
      } catch (error) {
        console.error("Error fetching messages:", error);
      }
    };

    fetchMessages();
    const interval = setInterval(fetchMessages, 5000);
    return () => clearInterval(interval);
  }, [activeTab, user?.uid, isAuthorized]);

  const fetchData = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const profileDoc = await getDoc(doc(firestore, "lancing_users", user.uid, "profile", "data"));
      if (profileDoc.exists()) {
        setProfile(profileDoc.data() as CompanyProfile);
      }

      // Use backend API to fetch jobs with applications (bypasses Firestore permissions)
      const response = await fetch(`/api/lancing/company/${user.uid}/jobs`);
      if (response.ok) {
        const data = await response.json();
        const jobsList = (data.jobs || []).sort((a: Job, b: Job) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        const internshipsList = (data.internships || []).sort((a: any, b: any) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        const microTasksList = (data.microTasks || []).sort((a: any, b: any) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        setJobs(jobsList);
        setInternships(internshipsList);
        setMicroTasks(microTasksList);
      } else {
        // Fallback to direct Firestore query
        const jobsQuery = query(
          collection(firestore, "lancing_jobs"),
          where("companyId", "==", user.uid)
        );
        const jobsSnapshot = await getDocs(jobsQuery);
        const jobsList: Job[] = [];
        
        for (const jobDoc of jobsSnapshot.docs) {
          const applicationsSnapshot = await getDocs(collection(firestore, "lancing_jobs", jobDoc.id, "applications"));
          jobsList.push({ 
            id: jobDoc.id, 
            ...jobDoc.data(),
            applicationsCount: applicationsSnapshot.size
          } as Job);
        }
        
        setJobs(jobsList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const addSkill = (skill: string) => {
    if (skill && !jobForm.skills.includes(skill) && jobForm.skills.length < 10) {
      setJobForm({ ...jobForm, skills: [...jobForm.skills, skill] });
      setSkillInput("");
    }
  };

  const removeSkill = (skill: string) => {
    setJobForm({ ...jobForm, skills: jobForm.skills.filter(s => s !== skill) });
  };

  const handlePostJob = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (postType === "job") {
      if (!jobForm.title || !jobForm.description || jobForm.skills.length === 0 || !jobForm.budget) {
        toast({ title: "Please fill required fields", variant: "destructive" });
        return;
      }
    } else if (postType === "internship") {
      if (!internshipForm.title || !internshipForm.description || internshipForm.skills.length === 0 || !internshipForm.field) {
        toast({ title: "Please fill required fields", variant: "destructive" });
        return;
      }
    } else {
      if (!microTaskForm.title || !microTaskForm.description || !microTaskForm.taskType || !microTaskForm.payment) {
        toast({ title: "Please fill required fields", variant: "destructive" });
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const id = `${postType}_${Date.now()}`;
      let collection_name = "lancing_jobs";
      if (postType === "internship") collection_name = "lancing_internships";
      else if (postType === "microtask") collection_name = "microTasks";

      const data: any = {
        companyId: user?.uid,
        companyName: profile?.companyName || "Company",
        companyLogo: profile?.logoUrl || "",
        createdAt: new Date().toISOString()
      };

      if (postType === "job") {
        data.title = jobForm.title;
        data.description = jobForm.description;
        data.skills = jobForm.skills;
        data.budget = jobForm.budget;
        data.paymentAmount = jobForm.paymentAmount ? parseInt(jobForm.paymentAmount) : null;
        data.deadline = jobForm.deadline;
        data.mode = jobForm.mode;
        data.duration = jobForm.duration;
      } else if (postType === "internship") {
        data.title = internshipForm.title;
        data.description = internshipForm.description;
        data.skills = internshipForm.skills;
        data.stipend = internshipForm.stipend;
        data.duration = internshipForm.duration;
        data.mode = internshipForm.mode;
        data.field = internshipForm.field;
      } else {
        data.title = microTaskForm.title;
        data.description = microTaskForm.description;
        data.taskType = microTaskForm.taskType;
        data.payment = microTaskForm.payment;
        data.deadline = microTaskForm.deadline;
      }

      await setDoc(doc(firestore, collection_name, id), data);

      toast({ title: `${postType === "job" ? "Job" : postType === "internship" ? "Internship" : "Micro Task"} posted successfully! 🚀` });
      
      setJobForm({ title: "", description: "", skills: [], budget: "", paymentAmount: "", deadline: "", mode: "Remote", duration: "" });
      setInternshipForm({ title: "", description: "", skills: [], stipend: "", duration: "", mode: "Remote", field: "" });
      setMicroTaskForm({ title: "", description: "", taskType: "", payment: "", deadline: "" });
      setSkillInput("");
      
      // Reload jobs with a delay to ensure Firestore has saved
      setTimeout(async () => {
        await fetchData();
        setActiveTab("manage");
      }, 1000);
    } catch (error: any) {
      console.error("Error posting:", error);
      toast({ title: "Failed to post", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteItem = async (itemId: string, type: "job" | "internship" | "microtask") => {
    try {
      const collectionName = type === "job" ? "lancing_jobs" : type === "internship" ? "lancing_internships" : "microTasks";
      await deleteDoc(doc(firestore, collectionName, itemId));
      if (type === "job") setJobs(jobs.filter(j => j.id !== itemId));
      else if (type === "internship") setInternships(internships.filter(i => i.id !== itemId));
      else setMicroTasks(microTasks.filter(t => t.id !== itemId));
      toast({ title: `${type.charAt(0).toUpperCase() + type.slice(1)} deleted` });
    } catch (error: any) {
      toast({ title: "Failed to delete", variant: "destructive" });
    }
  };

  const viewApplicants = async (item: any, type: "job" | "internship" | "microtask") => {
    setSelectedJob(item);
    setSelectedItemType(type);
    setShowApplicantsDialog(true);
    setIsLoadingApplicants(true);
    try {
      // Use backend API to fetch applications (bypasses Firestore permissions)
      const apiType = type === "internship" ? "internship" : type === "microtask" ? "micro_task" : "job";
      const response = await fetch(`/api/lancing/jobs/${item.id}/applications?type=${apiType}`);
      if (!response.ok) {
        throw new Error("Failed to fetch applications");
      }
      const data = await response.json();
      const applicantsList = (data.applications || []).sort((a: Application, b: Application) => 
        new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime()
      );
      setJobApplicants(applicantsList);
    } catch (error) {
      console.error("Error fetching applicants:", error);
      toast({ title: "Failed to load applicants", variant: "destructive" });
    } finally {
      setIsLoadingApplicants(false);
    }
  };

  const [updatingApplicationId, setUpdatingApplicationId] = useState<string | null>(null);

  const handleAcceptApplication = async (applicationId: string) => {
    if (!selectedJob || updatingApplicationId) return;
    const applicant = jobApplicants.find(app => app.id === applicationId);
    if (!applicant || applicant.status !== "under_process") return;
    
    setUpdatingApplicationId(applicationId);
    try {
      // Use backend API to update status (bypasses Firestore permissions)
      const apiType = selectedItemType === "internship" ? "internship" : selectedItemType === "microtask" ? "micro_task" : "job";
      const response = await fetch(`/api/lancing/applications/${applicationId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "accepted",
          jobId: selectedJob.id,
          applicantId: applicant.applicantId,
          type: apiType
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update status");
      }
      
      // Update UI immediately
      setJobApplicants(prev => prev.map(app => 
        app.id === applicationId ? { ...app, status: "accepted" } : app
      ));
      
      toast({ title: "Application accepted!" });
    } catch (error: any) {
      console.error("Error accepting application:", error);
      toast({ title: "Failed to accept application", description: error.message, variant: "destructive" });
    } finally {
      setUpdatingApplicationId(null);
    }
  };

  const handleRejectApplication = async (applicationId: string) => {
    if (!selectedJob || updatingApplicationId) return;
    const applicant = jobApplicants.find(app => app.id === applicationId);
    if (!applicant || applicant.status !== "under_process") return;
    
    setUpdatingApplicationId(applicationId);
    try {
      // Use backend API to update status (bypasses Firestore permissions)
      const apiType = selectedItemType === "internship" ? "internship" : selectedItemType === "microtask" ? "micro_task" : "job";
      const response = await fetch(`/api/lancing/applications/${applicationId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "rejected",
          jobId: selectedJob.id,
          applicantId: applicant.applicantId,
          type: apiType
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update status");
      }
      
      // Update UI immediately
      setJobApplicants(prev => prev.map(app => 
        app.id === applicationId ? { ...app, status: "rejected" } : app
      ));
      
      toast({ title: "Application rejected" });
    } catch (error: any) {
      console.error("Error rejecting application:", error);
      toast({ title: "Failed to reject application", description: error.message, variant: "destructive" });
    } finally {
      setUpdatingApplicationId(null);
    }
  };

  const viewApplicantProfile = async (applicant: Application) => {
    setSelectedApplicant(applicant);
    setShowProfileDialog(true);
    setIsLoadingProfile(true);
    setApplicantProfile(null);
    
    try {
      const response = await fetch(`/api/lancing/applicant/${applicant.applicantId}/profile`);
      if (!response.ok) {
        throw new Error("Failed to fetch profile");
      }
      const data = await response.json();
      setApplicantProfile(data.profile);
    } catch (error: any) {
      console.error("Error fetching applicant profile:", error);
      toast({ title: "Failed to load profile", variant: "destructive" });
    } finally {
      setIsLoadingProfile(false);
    }
  };

  const openHireDialog = () => {
    setHiringMessage(`Congratulations! 🎉 We're excited to offer you the ${selectedItemType === "internship" ? "internship" : selectedItemType === "microtask" ? "task" : "position"}: ${selectedJob?.title}\n\nWe look forward to working with you! Please submit your contact details so we can proceed.`);
    setShowHireDialog(true);
  };

  const handleHireApplicant = async () => {
    if (!selectedJob || !selectedApplicant || isHiring) return;
    
    setIsHiring(true);
    try {
      const apiType = selectedItemType === "internship" ? "internship" : selectedItemType === "microtask" ? "micro_task" : "job";
      const response = await fetch(`/api/lancing/applications/${selectedApplicant.id}/hire`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId: selectedJob.id,
          jobTitle: selectedJob.title,
          applicantId: selectedApplicant.applicantId,
          recruiterId: user?.uid,
          recruiterName: profile?.recruiterName || profile?.companyName || "Recruiter",
          companyName: profile?.companyName || "Company",
          type: apiType,
          hiringMessage: hiringMessage,
          paymentAmount: selectedJob.paymentAmount || 0
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to hire applicant");
      }

      // Update UI
      setJobApplicants(prev => prev.map(app => 
        app.id === selectedApplicant.id ? { 
          ...app, 
          status: "hired" as const,
          escrowStatus: "pending",
          escrowAmount: selectedJob.paymentAmount 
        } : app
      ));
      
      setShowHireDialog(false);
      setShowProfileDialog(false);
      setHiringMessage("");
      toast({ title: "🎉 Applicant hired successfully!", description: "They will receive your message and can submit their contact details." });
    } catch (error: any) {
      console.error("Error hiring applicant:", error);
      toast({ title: "Failed to hire applicant", description: error.message, variant: "destructive" });
    } finally {
      setIsHiring(false);
    }
  };

  const handleApproveAndPay = async (applicant: Application) => {
    if (!selectedJob || isProcessingPayment) return;
    setSelectedApplicant(applicant);
    setShowPaymentDialog(true);
  };

  const processEscrowPayment = async () => {
    if (!selectedJob || !selectedApplicant || isProcessingPayment) return;
    
    setIsProcessingPayment(true);
    try {
      const amount = selectedApplicant.escrowAmount || selectedJob.paymentAmount || 0;
      if (amount <= 0) {
        throw new Error("Invalid payment amount");
      }

      // Create Razorpay order
      const orderResponse = await fetch("/api/razorpay/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: amount,
          currency: "INR",
          receipt: `escrow_${selectedApplicant.id}`
        })
      });

      if (!orderResponse.ok) {
        throw new Error("Failed to create payment order");
      }

      const orderData = await orderResponse.json();
      
      // Open Razorpay checkout
      const options = {
        key: orderData.key_id,
        amount: orderData.order.amount,
        currency: orderData.order.currency,
        name: "StudentXchange",
        description: `Payment for ${selectedJob.title}`,
        order_id: orderData.order.id,
        handler: async (response: any) => {
          // Verify payment
          const verifyResponse = await fetch("/api/razorpay/verify-payment", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature
            })
          });

          if (!verifyResponse.ok) {
            throw new Error("Payment verification failed");
          }

          // Update escrow status with signature for server-side verification
          const fundResponse = await fetch(`/api/lancing/escrow/${selectedApplicant.id}/fund`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              jobId: selectedJob.id,
              applicantId: selectedApplicant.applicantId,
              amount: amount,
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
              type: selectedItemType,
              recruiterId: user?.uid
            })
          });

          if (!fundResponse.ok) {
            const errorData = await fundResponse.json();
            throw new Error(errorData.error || "Failed to fund escrow");
          }

          // Update UI
          setJobApplicants(prev => prev.map(app => 
            app.id === selectedApplicant.id ? { 
              ...app, 
              escrowStatus: "funded" as const,
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id
            } : app
          ));

          setShowPaymentDialog(false);
          toast({ title: "✅ Payment successful!", description: "Funds are now held in escrow. Release payment when work is complete." });
        },
        prefill: {
          email: user?.email || ""
        },
        theme: {
          color: "#0d9488"
        }
      };

      const razorpay = new (window as any).Razorpay(options);
      razorpay.open();
    } catch (error: any) {
      console.error("Error processing payment:", error);
      toast({ title: "Payment failed", description: error.message, variant: "destructive" });
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const releaseEscrowPayment = async (applicant: Application) => {
    if (!selectedJob || !user) return;
    try {
      const response = await fetch(`/api/lancing/escrow/${applicant.id}/release`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId: selectedJob.id,
          applicantId: applicant.applicantId,
          type: selectedItemType,
          recruiterId: user.uid
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to release payment");
      }

      // Update UI
      setJobApplicants(prev => prev.map(app => 
        app.id === applicant.id ? { 
          ...app, 
          escrowStatus: "released" as const,
          workApproved: true,
          workApprovedAt: new Date().toISOString()
        } : app
      ));

      toast({ title: "💰 Payment released!", description: "Funds have been released to the freelancer." });
    } catch (error: any) {
      console.error("Error releasing payment:", error);
      toast({ title: "Failed to release payment", description: error.message, variant: "destructive" });
    }
  };

  const handleLogout = async () => {
    await logout();
    setLocation("/student-lancing");
  };

  if (authLoading || !authChecked || !isAuthorized || isLoading) {
    return (
      <div className="min-h-screen sl-bg-atmosphere sl-grain-overlay flex items-center justify-center">
        <div className="text-center sl-slide-up">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center shadow-xl">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <Loader2 className="w-6 h-6 animate-spin text-teal-600 mx-auto" />
        </div>
      </div>
    );
  }

  const totalPosts = jobs.length + internships.length + microTasks.length;
  const totalApplications = jobs.reduce((acc, j) => acc + (j.applicationsCount || 0), 0) + 
    internships.reduce((acc: number, i: any) => acc + (i.applicationsCount || 0), 0) + 
    microTasks.reduce((acc: number, t: any) => acc + (t.applicationsCount || 0), 0);
  
  const statCards = [
    { label: "Total Posts", value: totalPosts, icon: Building2, color: "from-teal-500 to-cyan-600" },
    { label: "Total Applications", value: totalApplications, icon: Users, color: "from-violet-500 to-purple-600" },
    { label: "Interviews Scheduled", value: 0, icon: Target, color: "from-blue-500 to-indigo-600" },
    { label: "Hires Completed", value: 0, icon: CheckCircle2, color: "from-green-500 to-emerald-600" }
  ];

  return (
    <div className="min-h-screen sl-bg-atmosphere sl-grain-overlay">
      <SEOHead title="Company Dashboard - StudentLancing" description="Post jobs and hire student freelancers" />

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-72 bg-slate-900 border-r border-slate-800 min-h-screen p-6 hidden lg:block fixed left-0 top-0 overflow-y-auto">
          {/* Back Button */}
          <Link href="/">
            <button
              className="flex items-center gap-2 px-3 py-2 mb-4 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all"
              data-testid="button-back-home"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm font-medium" >Back to Home</span>
            </button>
          </Link>

          {/* Brand */}
          <Link href="/student-lancing" className="flex items-center gap-3 mb-10 group">
            <div className="w-11 h-11 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-xl flex items-center justify-center shadow-xl group-hover:shadow-2xl transition-all">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight text-white" >
              Student<span className="text-teal-400">Lancing</span>
            </span>
          </Link>

          {/* Company Profile Card */}
          <Link href="/lancing/company-profile-edit">
            <button className="w-full mb-8 p-5 bg-gradient-to-br from-teal-950 to-slate-900 rounded-2xl border border-teal-900 shadow-xl hover:shadow-2xl hover:border-teal-700 transition-all group cursor-pointer">
              <Avatar className="w-16 h-16 mx-auto mb-4 border-3 border-teal-500 rounded-xl shadow-lg group-hover:scale-105 transition-transform">
                <AvatarImage src={profile?.logoUrl} className="object-cover" />
                <AvatarFallback className="bg-gradient-to-br from-teal-500 to-cyan-600 text-white text-xl font-bold rounded-xl">
                  {profile?.companyName?.[0] || "C"}
                </AvatarFallback>
              </Avatar>
              <p className="text-center font-bold text-white text-lg group-hover:text-teal-300 transition-colors" >
                {profile?.companyName || "Company"}
              </p>
              <p className="text-center text-xs text-teal-400 font-semibold mt-2" >
                Click to edit profile
              </p>
            </button>
          </Link>

          {/* Navigation */}
          <nav className="space-y-2 mb-12">
            {[
              { id: "post", label: "Post a Job", icon: Plus, color: "emerald" },
              { id: "manage", label: "Manage Posts", icon: Building2, count: totalPosts, color: "teal" },
              { id: "messages", label: "Messages", icon: MessageSquare, color: "purple" },
              { id: "how-to-work", label: "How to Work", icon: HelpCircle, color: "slate" }
            ].map(item => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-5 py-4 rounded-xl font-semibold transition-all ${
                  activeTab === item.id 
                    ? "bg-teal-600 text-white shadow-lg shadow-teal-600/30" 
                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                }`}
                
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                <span className="flex-1 text-left">{item.label}</span>
                {item.count ? (
                  <span className="text-xs font-bold bg-teal-500 text-white px-2.5 py-1 rounded-full">
                    {item.count}
                  </span>
                ) : null}
              </button>
            ))}
          </nav>

          {/* Logout */}
          <div className="absolute bottom-6 left-6 right-6">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-5 py-3.5 rounded-xl text-red-400 hover:bg-red-950/30 transition-colors font-semibold border border-red-900/30"
              
            >
              <LogOut className="w-5 h-5" />
              Logout
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 lg:ml-72 p-6 lg:p-10">
          {/* Mobile Header */}
          <div className="lg:hidden flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <Link href="/">
                <Button variant="ghost" size="icon" className="rounded-xl hover:bg-slate-100">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-xl flex items-center justify-center shadow-lg">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-lg" >StudentLancing</span>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="icon" className="rounded-xl hover:bg-slate-100">
                <Bell className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="icon" onClick={handleLogout} className="rounded-xl hover:bg-slate-100">
                <LogOut className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Post Job Tab */}
          {activeTab === "post" && (
            <div className="space-y-8 sl-fade-in">
              <div className="space-y-2">
                <h1 className="text-4xl lg:text-5xl font-black tracking-tight" >
                  <span className="text-slate-900">Post Your Next</span>
                  <br />
                  <span className="bg-gradient-to-r from-teal-600 to-cyan-500 bg-clip-text text-transparent">Freelance Opportunity</span>
                </h1>
                <p className="text-lg text-slate-600 max-w-2xl" >
                  Find talented student freelancers. Build amazing projects. Scale your team.
                </p>
              </div>
              
              <form onSubmit={handlePostJob}>
                <Card className="rounded-3xl shadow-xl border-0 mb-8 overflow-hidden bg-white">
                  <CardContent className="p-8 space-y-8">
                    <div className="space-y-3">
                      <Label className="text-sm font-black text-slate-900" >OPPORTUNITY TYPE *</Label>
                      <Select value={postType} onValueChange={(v: any) => setPostType(v)}>
                        <SelectTrigger className="h-14 rounded-xl border-2 border-slate-200 focus:border-teal-500 font-bold" >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          <SelectItem value="job" className="rounded-lg">Job</SelectItem>
                          <SelectItem value="internship" className="rounded-lg">Internship</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-3">
                      <Label className="text-sm font-black text-slate-900" >{postType === "job" ? "JOB" : postType === "internship" ? "INTERNSHIP" : "MICRO TASK"} TITLE *</Label>
                      <Input
                        value={postType === "job" ? jobForm.title : postType === "internship" ? internshipForm.title : microTaskForm.title}
                        onChange={(e) => {
                          if (postType === "job") setJobForm({ ...jobForm, title: e.target.value });
                          else if (postType === "internship") setInternshipForm({ ...internshipForm, title: e.target.value });
                          else setMicroTaskForm({ ...microTaskForm, title: e.target.value });
                        }}
                        placeholder={postType === "job" ? "e.g., React Developer" : postType === "internship" ? "e.g., Summer Internship" : "e.g., Write Product Description"}
                        className="h-14 rounded-xl border-2 border-slate-200 focus:border-teal-500 text-base font-medium"
                        
                      />
                    </div>

                    <div className="space-y-3">
                      <Label className="text-sm font-black text-slate-900" >DESCRIPTION *</Label>
                      <Textarea
                        value={postType === "job" ? jobForm.description : postType === "internship" ? internshipForm.description : microTaskForm.description}
                        onChange={(e) => {
                          if (postType === "job") setJobForm({ ...jobForm, description: e.target.value });
                          else if (postType === "internship") setInternshipForm({ ...internshipForm, description: e.target.value });
                          else setMicroTaskForm({ ...microTaskForm, description: e.target.value });
                        }}
                        placeholder="Describe the opportunity, responsibilities, and requirements..."
                        className="rounded-xl min-h-[140px] border-2 border-slate-200 focus:border-teal-500 text-base font-medium resize-none p-4"
                        
                      />
                    </div>

                    {(postType === "job" || postType === "internship") && (
                      <div className="space-y-3">
                        <Label className="text-sm font-black text-slate-900" >REQUIRED SKILLS *</Label>
                        <div className="flex gap-3">
                          <Input
                            value={skillInput}
                            onChange={(e) => setSkillInput(e.target.value)}
                            placeholder="Type a skill..."
                            className="h-12 rounded-xl border-2 border-slate-200 focus:border-teal-500 font-medium"
                            
                            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSkill(skillInput))}
                          />
                          <Button 
                            type="button" 
                            onClick={() => addSkill(skillInput)} 
                            className="h-12 px-6 bg-teal-600 hover:bg-teal-700 rounded-xl font-bold"
                            
                          >
                            <Plus className="w-5 h-5" />
                          </Button>
                        </div>

                        {(postType === "job" ? jobForm.skills : internshipForm.skills).length > 0 && (
                          <div className="flex flex-wrap gap-2.5 p-5 bg-teal-50 rounded-xl border-2 border-teal-200">
                            {(postType === "job" ? jobForm.skills : internshipForm.skills).map(skill => (
                              <Badge 
                                key={skill} 
                                className="px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold cursor-pointer rounded-lg"
                                
                              >
                                {skill}
                                <X className="w-4 h-4 ml-2" onClick={() => removeSkill(skill)} />
                              </Badge>
                            ))}
                          </div>
                        )}

                        <div className="flex flex-wrap gap-2">
                          {SKILL_OPTIONS.filter(s => !(postType === "job" ? jobForm.skills : internshipForm.skills).includes(s)).slice(0, 8).map(skill => (
                            <Badge
                              key={skill}
                              variant="outline"
                              className="px-3.5 py-2 cursor-pointer hover:bg-teal-50 hover:border-teal-400 hover:text-teal-700 transition-all rounded-lg font-bold"
                              
                              onClick={() => addSkill(skill)}
                            >
                              + {skill}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {postType === "microtask" && (
                      <div className="space-y-3">
                        <Label className="text-sm font-black text-slate-900" >TASK TYPE *</Label>
                        <Select value={microTaskForm.taskType} onValueChange={(v) => setMicroTaskForm({ ...microTaskForm, taskType: v })}>
                          <SelectTrigger className="h-14 rounded-xl border-2 border-slate-200 focus:border-teal-500 font-medium" >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl">
                            {TASK_TYPES.map(type => (
                              <SelectItem key={type} value={type} className="rounded-lg">{type}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {postType === "internship" && (
                      <div className="space-y-3">
                        <Label className="text-sm font-black text-slate-900" >FIELD *</Label>
                        <Select value={internshipForm.field} onValueChange={(v) => setInternshipForm({ ...internshipForm, field: v })}>
                          <SelectTrigger className="h-14 rounded-xl border-2 border-slate-200 focus:border-teal-500 font-medium" >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl">
                            {INTERNSHIP_FIELDS.map(field => (
                              <SelectItem key={field} value={field} className="rounded-lg">{field}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {postType === "job" && (
                      <>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <div className="space-y-3">
                            <Label className="text-sm font-black text-slate-900" >BUDGET RANGE (₹)</Label>
                            <div className="relative">
                              <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-600 font-bold">₹</span>
                              <Input
                                value={jobForm.budget}
                                onChange={(e) => setJobForm({ ...jobForm, budget: e.target.value })}
                                placeholder="e.g., 10000-15000"
                                className="pl-12 h-14 rounded-xl border-2 border-slate-200 focus:border-teal-500 font-medium"
                                
                              />
                            </div>
                          </div>
                          <div className="space-y-3">
                            <Label className="text-sm font-black text-slate-900" >DEADLINE</Label>
                            <div className="relative">
                              <Calendar className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                              <Input
                                type="date"
                                value={jobForm.deadline}
                                onChange={(e) => setJobForm({ ...jobForm, deadline: e.target.value })}
                                className="pl-12 h-14 rounded-xl border-2 border-slate-200 focus:border-teal-500 font-medium"
                                
                              />
                            </div>
                          </div>
                        </div>
                        
                        <div className="space-y-3 p-5 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl border-2 border-emerald-200">
                          <div className="flex items-center gap-2 mb-3">
                            <IndianRupee className="w-5 h-5 text-emerald-600" />
                            <Label className="text-sm font-black text-emerald-900" >FREELANCER PAYMENT AMOUNT (₹) *</Label>
                          </div>
                          <p className="text-xs text-emerald-700 mb-3" >
                            This is the amount you'll pay to the freelancer for completing the job.
                          </p>
                          <div className="relative">
                            <span className="absolute left-5 top-1/2 -translate-y-1/2 text-emerald-700 font-bold text-lg">₹</span>
                            <Input
                              type="number"
                              value={jobForm.paymentAmount}
                              onChange={(e) => setJobForm({ ...jobForm, paymentAmount: e.target.value })}
                              placeholder="e.g., 5000"
                              className="pl-12 h-14 rounded-xl border-2 border-emerald-300 focus:border-emerald-500 font-bold text-lg bg-white"
                              
                              data-testid="input-payment-amount"
                            />
                          </div>
                        </div>
                      </>
                    )}

                    {postType === "internship" && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-3">
                          <Label className="text-sm font-black text-slate-900" >STIPEND (₹)</Label>
                          <div className="relative">
                            <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-600 font-bold">₹</span>
                            <Input
                              value={internshipForm.stipend}
                              onChange={(e) => setInternshipForm({ ...internshipForm, stipend: e.target.value })}
                              placeholder="e.g., 5000/month"
                              className="pl-12 h-14 rounded-xl border-2 border-slate-200 focus:border-teal-500 font-medium"
                              
                            />
                          </div>
                        </div>
                        <div className="space-y-3">
                          <Label className="text-sm font-black text-slate-900" >DURATION</Label>
                          <div className="relative">
                            <Clock className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <Input
                              value={internshipForm.duration}
                              onChange={(e) => setInternshipForm({ ...internshipForm, duration: e.target.value })}
                              placeholder="e.g., 3 months"
                              className="pl-12 h-14 rounded-xl border-2 border-slate-200 focus:border-teal-500 font-medium"
                              
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {postType === "microtask" && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-3">
                          <Label className="text-sm font-black text-slate-900" >PAYMENT (₹) *</Label>
                          <div className="relative">
                            <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-600 font-bold">₹</span>
                            <Input
                              value={microTaskForm.payment}
                              onChange={(e) => setMicroTaskForm({ ...microTaskForm, payment: e.target.value })}
                              placeholder="e.g., 500-1000"
                              className="pl-12 h-14 rounded-xl border-2 border-slate-200 focus:border-teal-500 font-medium"
                              
                            />
                          </div>
                        </div>
                        <div className="space-y-3">
                          <Label className="text-sm font-black text-slate-900" >DEADLINE *</Label>
                          <div className="relative">
                            <Calendar className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <Input
                              type="date"
                              value={microTaskForm.deadline}
                              onChange={(e) => setMicroTaskForm({ ...microTaskForm, deadline: e.target.value })}
                              className="pl-12 h-14 rounded-xl border-2 border-slate-200 focus:border-teal-500 font-medium"
                              
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {(postType === "job" || postType === "internship") && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-3">
                          <Label className="text-sm font-black text-slate-900" >WORK MODE</Label>
                          <Select value={postType === "job" ? jobForm.mode : internshipForm.mode} onValueChange={(v) => {
                            if (postType === "job") setJobForm({ ...jobForm, mode: v });
                            else setInternshipForm({ ...internshipForm, mode: v });
                          }}>
                            <SelectTrigger className="h-14 rounded-xl border-2 border-slate-200 focus:border-teal-500 font-medium" >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                              <SelectItem value="Remote" className="rounded-lg">Remote</SelectItem>
                              <SelectItem value="On-site" className="rounded-lg">On-site</SelectItem>
                              <SelectItem value="Hybrid" className="rounded-lg">Hybrid</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-3">
                          <Label className="text-sm font-black text-slate-900" >DURATION</Label>
                          <div className="relative">
                            <Clock className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <Input
                              value={postType === "job" ? jobForm.duration : internshipForm.duration}
                              onChange={(e) => {
                                if (postType === "job") setJobForm({ ...jobForm, duration: e.target.value });
                                else setInternshipForm({ ...internshipForm, duration: e.target.value });
                              }}
                              placeholder="e.g., 2 weeks"
                              className="pl-12 h-14 rounded-xl border-2 border-slate-200 focus:border-teal-500 font-medium"
                              
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-16 bg-gradient-to-r from-teal-600 to-cyan-500 hover:from-teal-700 hover:to-cyan-600 text-white font-black rounded-2xl shadow-xl shadow-teal-500/30 hover:shadow-teal-500/50 transition-all text-lg"
                  
                >
                  {isSubmitting ? <Loader2 className="h-6 w-6 animate-spin" /> : (
                    <>
                      <Plus className="w-6 h-6 mr-2" />
                      Post {postType === "job" ? "Job" : postType === "internship" ? "Internship" : "Micro Task"} Now
                    </>
                  )}
                </Button>
              </form>
            </div>
          )}

          {/* Manage Posts Tab */}
          {activeTab === "manage" && (
            <div className="space-y-8 sl-fade-in">
              <h1 className="text-4xl lg:text-5xl font-black tracking-tight" >
                Your Posts
              </h1>

              <Tabs defaultValue="jobs" className="w-full">
                <TabsList className="grid w-full grid-cols-3 h-12 rounded-xl bg-slate-100 p-1">
                  <TabsTrigger value="jobs" className="rounded-lg font-bold data-[state=active]:bg-white data-[state=active]:shadow-md" >
                    <Briefcase className="w-4 h-4 mr-2" />
                    Jobs ({jobs.length})
                  </TabsTrigger>
                  <TabsTrigger value="internships" className="rounded-lg font-bold data-[state=active]:bg-white data-[state=active]:shadow-md" >
                    <GraduationCap className="w-4 h-4 mr-2" />
                    Internships ({internships.length})
                  </TabsTrigger>
                  <TabsTrigger value="microtasks" className="rounded-lg font-bold data-[state=active]:bg-white data-[state=active]:shadow-md" >
                    <Zap className="w-4 h-4 mr-2" />
                    Micro Tasks ({microTasks.length})
                  </TabsTrigger>
                </TabsList>

                {/* Jobs Tab Content */}
                <TabsContent value="jobs" className="mt-6">
                  {jobs.length === 0 ? (
                    <Card className="rounded-3xl border-0 shadow-xl py-16 bg-gradient-to-br from-slate-50 to-white">
                      <CardContent className="text-center space-y-4">
                        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-teal-100 to-cyan-50 flex items-center justify-center mx-auto shadow-lg">
                          <Briefcase className="w-10 h-10 text-teal-600" />
                        </div>
                        <h3 className="text-xl font-black text-slate-900" >No Jobs Yet</h3>
                        <p className="text-slate-600 max-w-sm mx-auto" >Post your first job to attract student talent!</p>
                        <Button onClick={() => setActiveTab("post")} className="bg-teal-600 hover:bg-teal-700 rounded-xl font-bold" >
                          <Plus className="w-4 h-4 mr-2" />Post Job
                        </Button>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="grid gap-4">
                      {jobs.map((job, index) => (
                        <Card key={job.id} className="rounded-2xl border-2 border-slate-200 hover:border-teal-500 bg-white hover:shadow-xl transition-all duration-300 group shadow-md" style={{ animationDelay: `${index * 0.05}s` }}>
                          <CardContent className="p-6">
                            <div className="flex items-start justify-between gap-6">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <Badge className="bg-blue-100 text-blue-700 font-bold rounded-lg border-0" >
                                    <Briefcase className="w-3 h-3 mr-1" />Job
                                  </Badge>
                                </div>
                                <h3 className="font-black text-lg text-slate-900 mb-2 group-hover:text-teal-700 transition-colors" >{job.title}</h3>
                                <p className="text-slate-700 text-sm mb-4 line-clamp-2 font-medium" >{job.description}</p>
                                <div className="flex flex-wrap gap-2 mb-4">
                                  {job.skills.slice(0, 4).map(skill => (
                                    <Badge key={skill} className="px-3 py-1 bg-teal-100 text-teal-700 font-bold rounded-lg border-0" >{skill}</Badge>
                                  ))}
                                  {job.skills.length > 4 && <Badge variant="secondary" className="px-3 py-1 rounded-lg font-bold">+{job.skills.length - 4}</Badge>}
                                </div>
                                <div className="flex flex-wrap gap-4 text-sm font-bold" >
                                  <span className="flex items-center gap-2 text-teal-700 bg-teal-50 px-3 py-1.5 rounded-lg"><IndianRupee className="w-4 h-4" />₹{job.budget}</span>
                                  <span className="flex items-center gap-2 text-slate-700 bg-slate-100 px-3 py-1.5 rounded-lg"><Users className="w-4 h-4" />{job.applicationsCount || 0} applications</span>
                                </div>
                              </div>
                              <div className="flex flex-col gap-2 flex-shrink-0">
                                <Button variant="outline" onClick={() => viewApplicants(job, "job")} className="rounded-xl font-bold border-2 hover:border-teal-400 hover:text-teal-700" >
                                  <Users className="w-4 h-4 mr-2" />Applicants ({job.applicationsCount || 0})
                                </Button>
                                <Button variant="ghost" onClick={() => handleDeleteItem(job.id, "job")} className="text-red-600 hover:bg-red-50 rounded-xl font-bold" >
                                  <Trash2 className="w-4 h-4 mr-2" />Delete
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </TabsContent>

                {/* Internships Tab Content */}
                <TabsContent value="internships" className="mt-6">
                  {internships.length === 0 ? (
                    <Card className="rounded-3xl border-0 shadow-xl py-16 bg-gradient-to-br from-slate-50 to-white">
                      <CardContent className="text-center space-y-4">
                        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-100 to-pink-50 flex items-center justify-center mx-auto shadow-lg">
                          <GraduationCap className="w-10 h-10 text-purple-600" />
                        </div>
                        <h3 className="text-xl font-black text-slate-900" >No Internships Yet</h3>
                        <p className="text-slate-600 max-w-sm mx-auto" >Post internship opportunities for students!</p>
                        <Button onClick={() => { setPostType("internship"); setActiveTab("post"); }} className="bg-purple-600 hover:bg-purple-700 rounded-xl font-bold" >
                          <Plus className="w-4 h-4 mr-2" />Post Internship
                        </Button>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="grid gap-4">
                      {internships.map((intern: any, index: number) => (
                        <Card key={intern.id} className="rounded-2xl border-2 border-slate-200 hover:border-purple-500 bg-white hover:shadow-xl transition-all duration-300 group shadow-md" style={{ animationDelay: `${index * 0.05}s` }}>
                          <CardContent className="p-6">
                            <div className="flex items-start justify-between gap-6">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <Badge className="bg-purple-100 text-purple-700 font-bold rounded-lg border-0" >
                                    <GraduationCap className="w-3 h-3 mr-1" />Internship
                                  </Badge>
                                  {intern.field && <Badge variant="outline" className="font-medium rounded-lg">{intern.field}</Badge>}
                                </div>
                                <h3 className="font-black text-lg text-slate-900 mb-2 group-hover:text-purple-700 transition-colors" >{intern.title}</h3>
                                <p className="text-slate-700 text-sm mb-4 line-clamp-2 font-medium" >{intern.description}</p>
                                <div className="flex flex-wrap gap-2 mb-4">
                                  {(intern.skills || []).slice(0, 4).map((skill: string) => (
                                    <Badge key={skill} className="px-3 py-1 bg-purple-100 text-purple-700 font-bold rounded-lg border-0" >{skill}</Badge>
                                  ))}
                                  {(intern.skills || []).length > 4 && <Badge variant="secondary" className="px-3 py-1 rounded-lg font-bold">+{intern.skills.length - 4}</Badge>}
                                </div>
                                <div className="flex flex-wrap gap-4 text-sm font-bold" >
                                  {intern.stipend && <span className="flex items-center gap-2 text-purple-700 bg-purple-50 px-3 py-1.5 rounded-lg"><IndianRupee className="w-4 h-4" />₹{intern.stipend}</span>}
                                  {intern.duration && <span className="flex items-center gap-2 text-slate-700 bg-slate-100 px-3 py-1.5 rounded-lg"><Clock className="w-4 h-4" />{intern.duration}</span>}
                                  <span className="flex items-center gap-2 text-slate-700 bg-slate-100 px-3 py-1.5 rounded-lg"><Users className="w-4 h-4" />{intern.applicationsCount || 0} applications</span>
                                </div>
                              </div>
                              <div className="flex flex-col gap-2 flex-shrink-0">
                                <Button variant="outline" onClick={() => viewApplicants(intern, "internship")} className="rounded-xl font-bold border-2 hover:border-purple-400 hover:text-purple-700" >
                                  <Users className="w-4 h-4 mr-2" />Applicants ({intern.applicationsCount || 0})
                                </Button>
                                <Button variant="ghost" onClick={() => handleDeleteItem(intern.id, "internship")} className="text-red-600 hover:bg-red-50 rounded-xl font-bold" >
                                  <Trash2 className="w-4 h-4 mr-2" />Delete
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </TabsContent>

                {/* Micro Tasks Tab Content */}
                <TabsContent value="microtasks" className="mt-6">
                  {microTasks.length === 0 ? (
                    <Card className="rounded-3xl border-0 shadow-xl py-16 bg-gradient-to-br from-slate-50 to-white">
                      <CardContent className="text-center space-y-4">
                        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-100 to-orange-50 flex items-center justify-center mx-auto shadow-lg">
                          <Zap className="w-10 h-10 text-amber-600" />
                        </div>
                        <h3 className="text-xl font-black text-slate-900" >No Micro Tasks Yet</h3>
                        <p className="text-slate-600 max-w-sm mx-auto" >Post quick tasks for students!</p>
                        <Button onClick={() => { setPostType("microtask"); setActiveTab("post"); }} className="bg-amber-600 hover:bg-amber-700 rounded-xl font-bold" >
                          <Plus className="w-4 h-4 mr-2" />Post Micro Task
                        </Button>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="grid gap-4">
                      {microTasks.map((task: any, index: number) => (
                        <Card key={task.id} className="rounded-2xl border-2 border-slate-200 hover:border-amber-500 bg-white hover:shadow-xl transition-all duration-300 group shadow-md" style={{ animationDelay: `${index * 0.05}s` }}>
                          <CardContent className="p-6">
                            <div className="flex items-start justify-between gap-6">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <Badge className="bg-amber-100 text-amber-700 font-bold rounded-lg border-0" >
                                    <Zap className="w-3 h-3 mr-1" />Micro Task
                                  </Badge>
                                  {task.taskType && <Badge variant="outline" className="font-medium rounded-lg">{task.taskType}</Badge>}
                                </div>
                                <h3 className="font-black text-lg text-slate-900 mb-2 group-hover:text-amber-700 transition-colors" >{task.title}</h3>
                                <p className="text-slate-700 text-sm mb-4 line-clamp-2 font-medium" >{task.description}</p>
                                <div className="flex flex-wrap gap-4 text-sm font-bold" >
                                  {task.payment && <span className="flex items-center gap-2 text-amber-700 bg-amber-50 px-3 py-1.5 rounded-lg"><IndianRupee className="w-4 h-4" />₹{task.payment}</span>}
                                  {task.deadline && <span className="flex items-center gap-2 text-slate-700 bg-slate-100 px-3 py-1.5 rounded-lg"><Calendar className="w-4 h-4" />{task.deadline}</span>}
                                  <span className="flex items-center gap-2 text-slate-700 bg-slate-100 px-3 py-1.5 rounded-lg"><Users className="w-4 h-4" />{task.applicationsCount || 0} applications</span>
                                </div>
                              </div>
                              <div className="flex flex-col gap-2 flex-shrink-0">
                                <Button variant="outline" onClick={() => viewApplicants(task, "microtask")} className="rounded-xl font-bold border-2 hover:border-amber-400 hover:text-amber-700" >
                                  <Users className="w-4 h-4 mr-2" />Applicants ({task.applicationsCount || 0})
                                </Button>
                                <Button variant="ghost" onClick={() => handleDeleteItem(task.id, "microtask")} className="text-red-600 hover:bg-red-50 rounded-xl font-bold" >
                                  <Trash2 className="w-4 h-4 mr-2" />Delete
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          )}

          {/* Messages Tab */}
          {activeTab === "messages" && (
            <div className="sl-fade-in space-y-6">
              <div className="space-y-2">
                <h1 className="text-3xl font-black text-slate-900" >
                  Freelancer <span className="bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent">Messages</span>
                </h1>
                <p className="text-slate-600" >
                  Contact details from hired freelancers - review and proceed with payment
                </p>
              </div>
              
              {companyMessages.length === 0 ? (
                <Card className="rounded-3xl border-0 shadow-xl py-20 bg-gradient-to-br from-purple-50 to-white">
                  <CardContent className="text-center space-y-6">
                    <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-purple-100 to-pink-50 flex items-center justify-center mx-auto shadow-lg">
                      <MessageSquare className="w-12 h-12 text-purple-600" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-2xl font-black text-slate-900" >No Messages Yet</h3>
                      <p className="text-slate-600 max-w-sm mx-auto" >When freelancers submit their contact details after being hired, they'll appear here.</p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {companyMessages.map((message: any, index: number) => (
                    <Card 
                      key={message.id} 
                      className="rounded-2xl border-2 border-purple-200 hover:border-purple-400 bg-white hover:shadow-xl transition-all duration-300 shadow-md sl-scale-in"
                      style={{ animationDelay: `${index * 0.05}s` }}
                      data-testid={`message-card-${message.id}`}
                    >
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-3">
                              <Avatar className="w-12 h-12 rounded-xl border-2 border-purple-200">
                                <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-600 text-white font-bold rounded-xl">
                                  {message.freelancerName?.[0] || "F"}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-bold text-slate-900" >
                                  {message.freelancerName || "Freelancer"}
                                </p>
                                {message.jobTitle && (
                                  <p className="text-sm text-purple-600 font-medium" >
                                    For: {message.jobTitle}
                                  </p>
                                )}
                                <p className="text-xs text-slate-500" >
                                  {new Date(message.createdAt).toLocaleDateString()} at {new Date(message.createdAt).toLocaleTimeString()}
                                </p>
                              </div>
                            </div>
                            
                            {/* Contact Details */}
                            {(message.contactEmail || message.contactPhone) && (
                              <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl p-4 mb-4 border-2 border-emerald-200">
                                <p className="font-bold text-emerald-800 mb-2 text-sm" >
                                  📋 Contact Details Submitted
                                </p>
                                <div className="space-y-2">
                                  {message.contactEmail && (
                                    <div className="flex items-center gap-2 text-sm">
                                      <Mail className="w-4 h-4 text-emerald-600" />
                                      <span className="font-medium text-slate-700">{message.contactEmail}</span>
                                    </div>
                                  )}
                                  {message.contactPhone && (
                                    <div className="flex items-center gap-2 text-sm">
                                      <Phone className="w-4 h-4 text-emerald-600" />
                                      <span className="font-medium text-slate-700">{message.contactPhone}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Message text */}
                            <p className="text-slate-700 whitespace-pre-wrap break-words text-sm" >
                              {message.text}
                            </p>
                          </div>

                          {/* Payment Button - show for all contact submissions */}
                          {message.type === "contact_submission" && (
                            <div className="flex flex-col gap-2 flex-shrink-0">
                              {message.escrowStatus === "funded" ? (
                                <Badge className="bg-emerald-100 text-emerald-700 px-4 py-2 rounded-xl font-bold">
                                  ✓ Payment Complete
                                </Badge>
                              ) : message.escrowStatus === "released" ? (
                                <Badge className="bg-green-100 text-green-700 px-4 py-2 rounded-xl font-bold">
                                  ✓ Payment Released
                                </Badge>
                              ) : (
                                <Button 
                                  className="bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white rounded-xl font-bold shadow-lg px-6"
                                  
                                  disabled={processingMessageId === message.id}
                                  onClick={async () => {
                                    const paymentAmountRs = message.escrowAmount && message.escrowAmount > 0 ? message.escrowAmount : 10;
                                    setProcessingMessageId(message.id);
                                    try {
                                      const amountInPaise = Math.round(paymentAmountRs * 100);
                                      const orderResponse = await fetch("/api/razorpay/create-order", {
                                        method: "POST",
                                        headers: { "Content-Type": "application/json" },
                                        body: JSON.stringify({
                                          amount: amountInPaise,
                                          currency: "INR",
                                          receipt: `sl_${(message.applicationId || message.id).slice(-30)}`
                                        })
                                      });

                                      const orderData = await orderResponse.json();
                                      
                                      if (!orderResponse.ok) {
                                        throw new Error(orderData.message || "Failed to create payment order");
                                      }
                                      
                                      const options = {
                                        key: orderData.key_id,
                                        amount: orderData.order.amount,
                                        currency: orderData.order.currency,
                                        name: "StudentLancing",
                                        description: `Payment for ${message.freelancerName || "Freelancer"}`,
                                        order_id: orderData.order.id,
                                        handler: async (response: any) => {
                                          const verifyResponse = await fetch("/api/razorpay/verify-payment", {
                                            method: "POST",
                                            headers: { "Content-Type": "application/json" },
                                            body: JSON.stringify({
                                              razorpay_order_id: response.razorpay_order_id,
                                              razorpay_payment_id: response.razorpay_payment_id,
                                              razorpay_signature: response.razorpay_signature
                                            })
                                          });

                                          if (!verifyResponse.ok) {
                                            throw new Error("Payment verification failed");
                                          }

                                          setCompanyMessages(prev => prev.map(m => 
                                            m.id === message.id ? { ...m, escrowStatus: "funded" } : m
                                          ));
                                          setProcessingMessageId(null);
                                          toast({ title: "✅ Payment successful!", description: "Payment has been processed successfully." });
                                        },
                                        prefill: {
                                          email: user?.email || ""
                                        },
                                        theme: {
                                          color: "#0d9488"
                                        }
                                      };

                                      const razorpay = new (window as any).Razorpay(options);
                                      razorpay.on('payment.failed', () => {
                                        setProcessingMessageId(null);
                                        toast({ title: "Payment failed", description: "Please try again", variant: "destructive" });
                                      });
                                      razorpay.open();
                                    } catch (error: any) {
                                      console.error("Error processing payment:", error);
                                      toast({ title: "Payment failed", description: error.message, variant: "destructive" });
                                      setProcessingMessageId(null);
                                    }
                                  }}
                                  data-testid={`pay-button-${message.id}`}
                                >
                                  {processingMessageId === message.id ? (
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  ) : (
                                    <IndianRupee className="w-4 h-4 mr-2" />
                                  )}
                                  Confirm & Pay{message.escrowAmount && message.escrowAmount > 0 ? ` ₹${message.escrowAmount}` : ""}
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* How to Work Tab */}
          {activeTab === "how-to-work" && (
            <div className="sl-fade-in space-y-6">
              <div className="space-y-2">
                <h1 className="text-4xl lg:text-5xl font-black tracking-tight" >
                  <span className="text-slate-900">How to</span>{" "}
                  <span className="bg-gradient-to-r from-teal-600 to-cyan-500 bg-clip-text text-transparent">Work</span>
                </h1>
                <p className="text-lg text-slate-600" >
                  Step-by-step guide to hiring student freelancers
                </p>
              </div>

              <div className="space-y-4">
                {/* Step 1 */}
                <Card className="rounded-2xl border-2 border-teal-200 bg-gradient-to-br from-teal-50 to-white shadow-lg">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-teal-600 text-white flex items-center justify-center font-black text-xl flex-shrink-0" >1</div>
                      <div>
                        <h3 className="font-black text-lg text-slate-900 mb-2" >Post Your Job Requirement</h3>
                        <p className="text-slate-600" >
                          Create a detailed job posting with title, description, required skills, and payment amount. Choose between Job, Internship, or Micro Task.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Step 2 */}
                <Card className="rounded-2xl border-2 border-sky-200 bg-gradient-to-br from-sky-50 to-white shadow-lg">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-sky-600 text-white flex items-center justify-center font-black text-xl flex-shrink-0" >2</div>
                      <div>
                        <h3 className="font-black text-lg text-slate-900 mb-2" >Review Applicants</h3>
                        <p className="text-slate-600" >
                          Browse through applicant profiles in the <strong>Manage Posts</strong> section. Review their skills, experience, resume, and certificates to find the best fit.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Step 3 */}
                <Card className="rounded-2xl border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-white shadow-lg">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-purple-600 text-white flex items-center justify-center font-black text-xl flex-shrink-0" >3</div>
                      <div>
                        <h3 className="font-black text-lg text-slate-900 mb-2" >Finalize & Hire</h3>
                        <p className="text-slate-600" >
                          Send a hiring confirmation to your chosen applicant. They will receive a notification and submit their contact details.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Step 4 */}
                <Card className="rounded-2xl border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-white shadow-lg">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black text-xl flex-shrink-0" >4</div>
                      <div>
                        <h3 className="font-black text-lg text-slate-900 mb-2" >Receive Contact & Pay</h3>
                        <p className="text-slate-600" >
                          After receiving the freelancer's contact information in <strong>Messages</strong>, make the payment. Your amount is held under <strong>StudentXchange Pvt Ltd</strong>.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Step 5 */}
                <Card className="rounded-2xl border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-white shadow-lg">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-amber-600 text-white flex items-center justify-center font-black text-xl flex-shrink-0" >5</div>
                      <div>
                        <h3 className="font-black text-lg text-slate-900 mb-2" >Confirm Task Completion</h3>
                        <p className="text-slate-600" >
                          After the freelancer completes the task, confirm the work. The payment will then be released to the freelancer by StudentXchange.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Payment Security Info */}
                <Card className="rounded-2xl border-2 border-slate-300 bg-gradient-to-br from-slate-100 to-white shadow-xl">
                  <CardContent className="p-6">
                    <h3 className="font-black text-xl text-slate-900 mb-4 flex items-center gap-2" >
                      <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                      Secure Payment Process
                    </h3>
                    <div className="space-y-3">
                      <p className="text-slate-600" >
                        All payments are processed securely through <strong>StudentXchange Pvt Ltd</strong>:
                      </p>
                      <ul className="space-y-2 text-slate-600" >
                        <li className="flex items-start gap-2">
                          <span className="text-emerald-600 font-bold">✓</span>
                          Your payment is held safely until task completion
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-emerald-600 font-bold">✓</span>
                          Funds are released only after your confirmation
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-emerald-600 font-bold">✓</span>
                          Full transaction transparency and assurance
                        </li>
                      </ul>
                    </div>
                    <p className="text-sm text-slate-500 mt-4 text-center" >
                      StudentXchange ensures a safe and reliable hiring experience for all recruiters.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Applicants Dialog */}
      <Dialog open={showApplicantsDialog} onOpenChange={setShowApplicantsDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black" >
              Applicants for "{selectedJob?.title}"
            </DialogTitle>
            <DialogDescription className="text-slate-600" >
              Review and manage applications for this position
            </DialogDescription>
          </DialogHeader>
          
          {isLoadingApplicants ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
            </div>
          ) : jobApplicants.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="font-bold text-lg text-slate-700 mb-2" >No Applications Yet</h3>
              <p className="text-slate-500" >When students apply, they'll appear here</p>
            </div>
          ) : (
            <div className="space-y-4 mt-4">
              {jobApplicants.map((applicant) => (
                <Card key={applicant.id} className={`rounded-xl border-2 transition-colors ${
                  applicant.status === "hired" && applicant.escrowStatus === "funded" ? "border-sky-300 bg-sky-50/50" :
                  applicant.status === "hired" && applicant.escrowStatus === "released" ? "border-green-300 bg-green-50/50" :
                  applicant.status === "hired" ? "border-emerald-300 bg-emerald-50/50" : "border-slate-200 hover:border-teal-300"
                }`}>
                  <CardContent className="p-5">
                    <div className="flex items-start gap-4">
                      <Avatar className="w-14 h-14 rounded-xl border-2 border-slate-200 cursor-pointer hover:border-teal-400 transition-colors" onClick={() => viewApplicantProfile(applicant)}>
                        <AvatarImage src={applicant.applicantProfileImage} className="object-cover" />
                        <AvatarFallback className="bg-gradient-to-br from-teal-500 to-cyan-600 text-white font-bold rounded-xl">
                          {applicant.applicantName?.[0] || "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <button 
                              onClick={() => viewApplicantProfile(applicant)}
                              className="font-bold text-slate-900 hover:text-teal-600 transition-colors text-left"
                              
                              data-testid={`applicant-name-${applicant.id}`}
                            >
                              {applicant.applicantName}
                            </button>
                            <p className="text-sm text-slate-500" >
                              {applicant.applicantEmail}
                            </p>
                          </div>
                          <Badge 
                            className={`rounded-lg font-bold ${
                              applicant.status === "hired" && applicant.escrowStatus === "released"
                                ? "bg-green-100 text-green-700"
                                : applicant.status === "hired" && applicant.escrowStatus === "funded"
                                ? "bg-sky-100 text-sky-700"
                                : applicant.status === "hired"
                                ? "bg-emerald-100 text-emerald-700"
                                : applicant.status === "accepted" 
                                ? "bg-green-100 text-green-700" 
                                : applicant.status === "rejected"
                                ? "bg-red-100 text-red-700"
                                : "bg-amber-100 text-amber-700"
                            }`}
                            
                          >
                            {applicant.status === "hired" && applicant.escrowStatus === "released" ? "Completed ✓" :
                             applicant.status === "hired" && applicant.escrowStatus === "funded" ? "In Working 🔄" :
                             applicant.status === "under_process" ? "Pending" : 
                             applicant.status === "accepted" ? "Accepted" : 
                             applicant.status === "hired" ? "Hired" : "Rejected"}
                          </Badge>
                        </div>
                        {applicant.message && (
                          <p className="text-sm text-slate-700 bg-slate-50 rounded-lg p-3 mb-3" >
                            "{applicant.message}"
                          </p>
                        )}
                        
                        {/* Show contact details for hired candidates */}
                        {applicant.status === "hired" && applicant.hiredContactEmail && (
                          <div className="bg-emerald-100 rounded-lg p-3 mb-3 space-y-1">
                            <p className="text-sm font-bold text-emerald-800" >Contact Details:</p>
                            <div className="flex items-center gap-2 text-sm text-emerald-700">
                              <Mail className="w-4 h-4" />
                              <span>{applicant.hiredContactEmail}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-emerald-700">
                              <Phone className="w-4 h-4" />
                              <span>{applicant.hiredContactPhone}</span>
                            </div>
                          </div>
                        )}
                        
                        {applicant.status === "hired" && !applicant.hiredContactEmail && (
                          <div className="bg-amber-100 rounded-lg p-3 mb-3">
                            <p className="text-sm text-amber-700" >
                              Waiting for candidate to submit contact details...
                            </p>
                          </div>
                        )}
                        
                        {/* Payment Status Display */}
                        {applicant.status === "hired" && applicant.escrowAmount && applicant.escrowAmount > 0 && (
                          <div className={`rounded-lg p-3 mb-3 ${
                            applicant.escrowStatus === "released" 
                              ? "bg-green-100 border border-green-200" 
                              : applicant.escrowStatus === "funded"
                              ? "bg-teal-100 border border-teal-200"
                              : "bg-slate-100 border border-slate-200"
                          }`}>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <IndianRupee className={`w-4 h-4 ${
                                  applicant.escrowStatus === "released" 
                                    ? "text-green-600" 
                                    : applicant.escrowStatus === "funded"
                                    ? "text-teal-600"
                                    : "text-slate-600"
                                }`} />
                                <span className="text-sm font-bold" >
                                  Payment: ₹{applicant.escrowAmount}
                                </span>
                              </div>
                              <Badge className={`text-xs ${
                                applicant.escrowStatus === "released" 
                                  ? "bg-green-200 text-green-800" 
                                  : applicant.escrowStatus === "funded"
                                  ? "bg-teal-200 text-teal-800"
                                  : "bg-amber-200 text-amber-800"
                              }`}>
                                {applicant.escrowStatus === "released" ? "Released ✓" : 
                                 applicant.escrowStatus === "funded" ? "Payment Secured" : "Awaiting Payment"}
                              </Badge>
                            </div>
                          </div>
                        )}
                        
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="text-xs text-slate-500" >
                            <span>Applied {new Date(applicant.appliedAt).toLocaleDateString()}</span>
                          </div>
                          <div className="flex gap-2 flex-wrap">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => viewApplicantProfile(applicant)}
                              className="rounded-lg font-bold border-slate-300 hover:border-teal-400 hover:text-teal-600"
                              
                              data-testid={`view-profile-${applicant.id}`}
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              View Profile
                            </Button>
                            {applicant.status === "under_process" && (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => handleAcceptApplication(applicant.id)}
                                  disabled={updatingApplicationId === applicant.id}
                                  className="bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold disabled:opacity-50"
                                  
                                >
                                  {updatingApplicationId === applicant.id ? (
                                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                  ) : (
                                    <CheckCircle2 className="w-4 h-4 mr-1" />
                                  )}
                                  Accept
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleRejectApplication(applicant.id)}
                                  disabled={updatingApplicationId === applicant.id}
                                  className="text-red-600 border-red-200 hover:bg-red-50 rounded-lg font-bold disabled:opacity-50"
                                  
                                >
                                  <X className="w-4 h-4 mr-1" />
                                  Reject
                                </Button>
                              </>
                            )}
                            {applicant.status === "accepted" && (
                              <Button
                                size="sm"
                                onClick={() => viewApplicantProfile(applicant)}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold"
                                
                                data-testid={`hire-${applicant.id}`}
                              >
                                <UserCheck className="w-4 h-4 mr-1" />
                                Hire
                              </Button>
                            )}
                            {/* Approve & Pay button - shows when hired and contact submitted but not yet paid */}
                            {applicant.status === "hired" && applicant.hiredContactEmail && applicant.escrowStatus === "pending" && applicant.escrowAmount && applicant.escrowAmount > 0 && (
                              <Button
                                size="sm"
                                onClick={() => handleApproveAndPay(applicant)}
                                className="bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-bold"
                                
                                data-testid={`approve-pay-${applicant.id}`}
                              >
                                <IndianRupee className="w-4 h-4 mr-1" />
                                Approve & Pay ₹{applicant.escrowAmount}
                              </Button>
                            )}
                            {/* Release Payment button - shows when escrow is funded */}
                            {applicant.status === "hired" && applicant.escrowStatus === "funded" && (
                              <Button
                                size="sm"
                                onClick={() => releaseEscrowPayment(applicant)}
                                className="bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold"
                                
                                data-testid={`release-payment-${applicant.id}`}
                              >
                                <CheckCircle2 className="w-4 h-4 mr-1" />
                                Release Payment
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Applicant Profile View Dialog */}
      <Dialog open={showProfileDialog} onOpenChange={setShowProfileDialog}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black" >
              Applicant Profile
            </DialogTitle>
            <DialogDescription className="text-slate-600" >
              Review candidate qualifications
            </DialogDescription>
          </DialogHeader>
          
          {isLoadingProfile ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
            </div>
          ) : applicantProfile ? (
            <div className="space-y-5 mt-4">
              {/* Profile Header */}
              <div className="flex items-center gap-4 pb-4 border-b border-slate-200">
                <Avatar className="w-16 h-16 rounded-xl border-2 border-teal-200">
                  <AvatarImage src={applicantProfile.profileImageUrl || selectedApplicant?.applicantProfileImage} className="object-cover" />
                  <AvatarFallback className="bg-gradient-to-br from-teal-500 to-cyan-600 text-white text-xl font-bold rounded-xl">
                    {applicantProfile.fullName?.[0] || selectedApplicant?.applicantName?.[0] || "?"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-bold text-lg text-slate-900" >
                    {applicantProfile.fullName || selectedApplicant?.applicantName}
                  </h3>
                  <p className="text-sm text-slate-500" >
                    {selectedApplicant?.applicantEmail}
                  </p>
                </div>
              </div>

              {/* Skills */}
              <div>
                <h4 className="font-bold text-slate-700 mb-2 flex items-center gap-2" >
                  <Award className="w-4 h-4 text-teal-600" />
                  Skills
                </h4>
                {applicantProfile.skills && applicantProfile.skills.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {applicantProfile.skills.map((skill, idx) => (
                      <Badge key={idx} className="bg-teal-100 text-teal-700 rounded-lg font-medium">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-400">No skills listed</p>
                )}
              </div>

              {/* Experience / About */}
              <div>
                <h4 className="font-bold text-slate-700 mb-2 flex items-center gap-2" >
                  <Briefcase className="w-4 h-4 text-teal-600" />
                  Experience
                </h4>
                {applicantProfile.experience || applicantProfile.aboutMe ? (
                  <p className="text-sm text-slate-600 bg-slate-50 rounded-lg p-3" >
                    {applicantProfile.experience || applicantProfile.aboutMe}
                  </p>
                ) : (
                  <p className="text-sm text-slate-400">No experience details provided</p>
                )}
              </div>

              {/* Resume */}
              {applicantProfile.resumeUrl && (
                <div>
                  <h4 className="font-bold text-slate-700 mb-2 flex items-center gap-2" >
                    <FileText className="w-4 h-4 text-teal-600" />
                    Resume
                  </h4>
                  <a 
                    href={applicantProfile.resumeUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
                  >
                    <FileText className="w-4 h-4" />
                    View Resume
                  </a>
                </div>
              )}

              {/* Certificates */}
              {applicantProfile.certificateUrl && (
                <div>
                  <h4 className="font-bold text-slate-700 mb-2 flex items-center gap-2" >
                    <Award className="w-4 h-4 text-teal-600" />
                    Certificates
                  </h4>
                  <a 
                    href={applicantProfile.certificateUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors text-sm font-medium"
                  >
                    <Award className="w-4 h-4" />
                    View Certificate
                  </a>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-200 flex gap-3">
                {selectedApplicant?.status === "accepted" && (
                  <Button
                    onClick={openHireDialog}
                    disabled={isHiring}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold"
                    
                    data-testid="hire-button"
                  >
                    <UserCheck className="w-4 h-4 mr-2" />
                    Hire This Candidate
                  </Button>
                )}
                {selectedApplicant?.status === "under_process" && (
                  <>
                    <Button
                      onClick={() => {
                        handleAcceptApplication(selectedApplicant.id);
                        setShowProfileDialog(false);
                      }}
                      disabled={updatingApplicationId === selectedApplicant.id}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold"
                      
                    >
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Accept
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        handleRejectApplication(selectedApplicant.id);
                        setShowProfileDialog(false);
                      }}
                      disabled={updatingApplicationId === selectedApplicant.id}
                      className="flex-1 text-red-600 border-red-200 hover:bg-red-50 rounded-xl font-bold"
                      
                    >
                      <X className="w-4 h-4 mr-2" />
                      Reject
                    </Button>
                  </>
                )}
                {selectedApplicant?.status === "hired" && (
                  <div className="flex-1 bg-emerald-100 text-emerald-700 rounded-xl p-4 text-center">
                    <UserCheck className="w-6 h-6 mx-auto mb-2" />
                    <p className="font-bold" >Already Hired</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-slate-500">Profile not available</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Hire Dialog with Custom Message */}
      <Dialog open={showHireDialog} onOpenChange={setShowHireDialog}>
        <DialogContent className="max-w-lg rounded-2xl p-0 overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-500 to-teal-500 p-6">
            <DialogHeader>
              <DialogTitle className="text-white text-xl" >
                🎉 Hire {selectedApplicant?.applicantName}
              </DialogTitle>
              <DialogDescription className="text-emerald-100" >
                Send a personalized hiring message to the candidate
              </DialogDescription>
            </DialogHeader>
          </div>
          <div className="p-6 space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-bold text-slate-700" >
                Hiring Message
              </Label>
              <Textarea
                value={hiringMessage}
                onChange={(e) => setHiringMessage(e.target.value)}
                placeholder="Write your personalized hiring message..."
                className="min-h-[150px] rounded-xl border-2 border-slate-200 focus:border-emerald-400 resize-none"
                
                data-testid="input-hiring-message"
              />
            </div>
            
            {selectedJob?.paymentAmount && (
              <div className="bg-emerald-50 rounded-xl p-4 border-2 border-emerald-200">
                <div className="flex items-center gap-2 text-emerald-700 font-bold" >
                  <IndianRupee className="w-5 h-5" />
                  <span>Payment Amount: ₹{selectedJob.paymentAmount}</span>
                </div>
                <p className="text-sm text-emerald-600 mt-2" >
                  You'll pay this amount after receiving the freelancer's contact details.
                </p>
              </div>
            )}
          </div>
          <div className="flex gap-3 p-6 pt-0">
            <Button
              variant="outline"
              onClick={() => setShowHireDialog(false)}
              className="flex-1 rounded-xl border-2"
              
            >
              Cancel
            </Button>
            <Button
              onClick={handleHireApplicant}
              disabled={isHiring || !hiringMessage.trim()}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold"
              
              data-testid="confirm-hire-button"
            >
              {isHiring ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              Send & Hire
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="max-w-md rounded-2xl p-0 overflow-hidden">
          <div className="bg-gradient-to-r from-teal-500 to-cyan-500 p-6">
            <DialogHeader>
              <DialogTitle className="text-white text-xl" >
                💰 Process Payment
              </DialogTitle>
              <DialogDescription className="text-teal-100" >
                Pay to secure the freelancer for this task
              </DialogDescription>
            </DialogHeader>
          </div>
          <div className="p-6 space-y-4">
            <div className="bg-slate-50 rounded-xl p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-slate-600" >Task Amount</span>
                <span className="font-bold text-lg" >₹{selectedApplicant?.escrowAmount || selectedJob?.paymentAmount || 0}</span>
              </div>
              <div className="border-t pt-3 flex justify-between items-center">
                <span className="font-bold text-slate-800" >Total to Pay</span>
                <span className="font-black text-xl text-teal-600" >₹{selectedApplicant?.escrowAmount || selectedJob?.paymentAmount || 0}</span>
              </div>
            </div>
            
            <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
              <p className="text-sm text-amber-800" >
                <strong>How it works:</strong> Your payment will be processed securely. Once you confirm the work is complete, the payment will be released to the freelancer.
              </p>
            </div>
          </div>
          <div className="flex gap-3 p-6 pt-0">
            <Button
              variant="outline"
              onClick={() => setShowPaymentDialog(false)}
              className="flex-1 rounded-xl border-2"
              
            >
              Cancel
            </Button>
            <Button
              onClick={processEscrowPayment}
              disabled={isProcessingPayment}
              className="flex-1 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold"
              
              data-testid="pay-escrow-button"
            >
              {isProcessingPayment ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <IndianRupee className="w-4 h-4 mr-2" />
              )}
              Pay Now
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
