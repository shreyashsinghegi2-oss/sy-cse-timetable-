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
  Sparkles, LogOut, Plus, Loader2, Clock, 
  DollarSign, MapPin, Calendar, Eye, Trash2,
  Users, Send, CheckCircle2, Bell, MessageSquare, X, Zap, Target,
  Briefcase, GraduationCap, ClipboardList, ArrowRight, XCircle, Mail, HelpCircle, IndianRupee, Shield, UserCheck, FileText, Award
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
  applicantEmail?: string;
  applicantPhone?: string;
  applicantProfileImage?: string;
  applicantSkills?: string[];
  applicantBio?: string;
  message: string;
  status: "under_process" | "accepted" | "rejected";
  appliedAt: string;
}

interface Job {
  id: string;
  title: string;
  description: string;
  skills: string[];
  budget: string;
  deadline: string;
  mode: string;
  duration: string;
  recruiterId: string;
  postedByRole: "angel";
  recruiterName: string;
  createdAt: string;
  applicationsCount?: number;
}

interface Internship {
  id: string;
  title: string;
  description: string;
  skills: string[];
  stipend: string;
  duration: string;
  mode: string;
  field: string;
  recruiterId: string;
  postedByRole: "angel";
  recruiterName: string;
  createdAt: string;
  applicationsCount?: number;
}

interface MicroTask {
  id: string;
  title: string;
  description: string;
  taskType: string;
  payment: string;
  deadline: string;
  recruiterId: string;
  postedByRole: "angel";
  recruiterName: string;
  createdAt: string;
  applicationsCount?: number;
}

interface AngelProfile {
  fullName: string;
  headline: string;
  photoUrl?: string;
  expertise: string;
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

export default function LancingAngelDashboard() {
  const { user, isAuthenticated, role, logout, isLoading: authLoading, dataLoaded, hasSelectedRole, profileComplete } = useLancingAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [activeTab, setActiveTab] = useState("post");
  const [postType, setPostType] = useState<"job" | "internship" | "microtask">("job");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [internships, setInternships] = useState<Internship[]>([]);
  const [microTasks, setMicroTasks] = useState<MicroTask[]>([]);
  const [profile, setProfile] = useState<AngelProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Job | Internship | MicroTask | null>(null);
  const [showApplicantsDialog, setShowApplicantsDialog] = useState(false);
  const [applicants, setApplicants] = useState<Application[]>([]);
  const [isLoadingApplicants, setIsLoadingApplicants] = useState(false);
  const [itemType, setItemType] = useState<"job" | "internship" | "microtask">("job");
  
  // Applicant profile view state
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [selectedApplicant, setSelectedApplicant] = useState<Application | null>(null);
  const [applicantProfile, setApplicantProfile] = useState<ApplicantProfile | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);

  const [jobForm, setJobForm] = useState({
    title: "", description: "", skills: [] as string[], budget: "", deadline: "", mode: "Remote", duration: ""
  });
  const [internshipForm, setInternshipForm] = useState({
    title: "", description: "", skills: [] as string[], stipend: "", duration: "", mode: "Remote", field: ""
  });
  const [microTaskForm, setMicroTaskForm] = useState({
    title: "", description: "", taskType: "", payment: "", deadline: ""
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
    if (role !== "angel") {
      setLocation(role === "company" ? "/lancing/company-dashboard" : "/lancing/freelancer-dashboard");
      return;
    }
    if (!profileComplete) {
      setLocation("/lancing/angel-profile");
      return;
    }
    setIsAuthorized(true);
  }, [authLoading, dataLoaded, isAuthenticated, hasSelectedRole, role, profileComplete, user, setLocation]);
  
  useEffect(() => {
    if (isAuthorized) {
      fetchData();
    }
  }, [isAuthorized]);

  const fetchData = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const profileDoc = await getDoc(doc(firestore, "lancing_users", user.uid, "profile", "data"));
      if (profileDoc.exists()) {
        setProfile(profileDoc.data() as AngelProfile);
      }

      // Use backend API to fetch posts with applications (bypasses Firestore permissions)
      const response = await fetch(`/api/lancing/angel/${user.uid}/posts`);
      if (response.ok) {
        const data = await response.json();
        const jobsList = (data.jobs || []).sort((a: Job, b: Job) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        const internshipsList = (data.internships || []).sort((a: Internship, b: Internship) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        const microTasksList = (data.microTasks || []).sort((a: MicroTask, b: MicroTask) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        setJobs(jobsList);
        setInternships(internshipsList);
        setMicroTasks(microTasksList);
      } else {
        // Fallback to direct Firestore query
        const jobsQuery = query(collection(firestore, "lancing_jobs"), where("recruiterId", "==", user.uid));
        const jobsSnapshot = await getDocs(jobsQuery);
        const jobsList: Job[] = [];
        for (const jobDoc of jobsSnapshot.docs) {
          const applicationsSnapshot = await getDocs(collection(firestore, "lancing_jobs", jobDoc.id, "applications"));
          jobsList.push({ id: jobDoc.id, ...jobDoc.data(), applicationsCount: applicationsSnapshot.size } as Job);
        }
        setJobs(jobsList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));

        const internshipsQuery = query(collection(firestore, "lancing_internships"), where("recruiterId", "==", user.uid));
        const internshipsSnapshot = await getDocs(internshipsQuery);
        const internshipsList: Internship[] = [];
        for (const internDoc of internshipsSnapshot.docs) {
          const applicationsSnapshot = await getDocs(collection(firestore, "lancing_internships", internDoc.id, "applications"));
          internshipsList.push({ id: internDoc.id, ...internDoc.data(), applicationsCount: applicationsSnapshot.size } as Internship);
        }
        setInternships(internshipsList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));

        const microTasksQuery = query(collection(firestore, "microTasks"), where("recruiterId", "==", user.uid));
        const microTasksSnapshot = await getDocs(microTasksQuery);
        const microTasksList: MicroTask[] = [];
        for (const taskDoc of microTasksSnapshot.docs) {
          const applicationsSnapshot = await getDocs(collection(firestore, "microTasks", taskDoc.id, "applications"));
          microTasksList.push({ id: taskDoc.id, ...taskDoc.data(), applicationsCount: applicationsSnapshot.size } as MicroTask);
        }
        setMicroTasks(microTasksList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const addSkill = (skill: string) => {
    if (postType === "job" && skill && !jobForm.skills.includes(skill) && jobForm.skills.length < 10) {
      setJobForm({ ...jobForm, skills: [...jobForm.skills, skill] });
    } else if (postType === "internship" && skill && !internshipForm.skills.includes(skill) && internshipForm.skills.length < 10) {
      setInternshipForm({ ...internshipForm, skills: [...internshipForm.skills, skill] });
    }
    setSkillInput("");
  };

  const removeSkill = (skill: string) => {
    if (postType === "job") {
      setJobForm({ ...jobForm, skills: jobForm.skills.filter(s => s !== skill) });
    } else if (postType === "internship") {
      setInternshipForm({ ...internshipForm, skills: internshipForm.skills.filter(s => s !== skill) });
    }
  };

  const handlePostJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jobForm.title || !jobForm.description || jobForm.skills.length === 0 || !jobForm.budget) {
      toast({ title: "Please fill required fields", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      const jobId = `job_${Date.now()}`;
      await setDoc(doc(firestore, "lancing_jobs", jobId), {
        ...jobForm,
        recruiterId: user?.uid,
        postedByRole: "angel",
        recruiterName: profile?.fullName || "Angel Recruiter",
        recruiterPhoto: profile?.photoUrl || "",
        createdAt: new Date().toISOString()
      });
      toast({ title: "Job posted successfully!" });
      setJobForm({ title: "", description: "", skills: [], budget: "", deadline: "", mode: "Remote", duration: "" });
      fetchData();
      setActiveTab("manage");
    } catch (error: any) {
      toast({ title: "Failed to post job", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePostInternship = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!internshipForm.title || !internshipForm.description || !internshipForm.field) {
      toast({ title: "Please fill required fields", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      const internId = `intern_${Date.now()}`;
      await setDoc(doc(firestore, "lancing_internships", internId), {
        ...internshipForm,
        recruiterId: user?.uid,
        postedByRole: "angel",
        recruiterName: profile?.fullName || "Angel Recruiter",
        recruiterPhoto: profile?.photoUrl || "",
        createdAt: new Date().toISOString()
      });
      toast({ title: "Internship posted successfully!" });
      setInternshipForm({ title: "", description: "", skills: [], stipend: "", duration: "", mode: "Remote", field: "" });
      fetchData();
      setActiveTab("manage");
    } catch (error: any) {
      toast({ title: "Failed to post internship", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePostMicroTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!microTaskForm.title || !microTaskForm.description || !microTaskForm.taskType || !microTaskForm.payment) {
      toast({ title: "Please fill required fields", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      const taskId = `task_${Date.now()}`;
      await setDoc(doc(firestore, "microTasks", taskId), {
        ...microTaskForm,
        recruiterId: user?.uid,
        postedByRole: "angel",
        recruiterName: profile?.fullName || "Angel Recruiter",
        recruiterPhoto: profile?.photoUrl || "",
        createdAt: new Date().toISOString()
      });
      toast({ title: "Micro Task posted successfully!" });
      setMicroTaskForm({ title: "", description: "", taskType: "", payment: "", deadline: "" });
      fetchData();
      setActiveTab("manage");
    } catch (error: any) {
      toast({ title: "Failed to post task", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, type: "job" | "internship" | "microtask") => {
    try {
      const collectionName = type === "job" ? "lancing_jobs" : type === "internship" ? "lancing_internships" : "microTasks";
      await deleteDoc(doc(firestore, collectionName, id));
      if (type === "job") setJobs(jobs.filter(j => j.id !== id));
      else if (type === "internship") setInternships(internships.filter(i => i.id !== id));
      else setMicroTasks(microTasks.filter(t => t.id !== id));
      toast({ title: `${type.charAt(0).toUpperCase() + type.slice(1)} deleted` });
    } catch (error: any) {
      toast({ title: "Failed to delete", variant: "destructive" });
    }
  };

  const [updatingApplicationId, setUpdatingApplicationId] = useState<string | null>(null);

  const viewApplicants = async (item: Job | Internship | MicroTask, type: "job" | "internship" | "microtask") => {
    setSelectedItem(item);
    setItemType(type);
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
      setApplicants(applicantsList);
    } catch (error) {
      console.error("Error fetching applicants:", error);
      toast({ title: "Failed to load applicants", variant: "destructive" });
    } finally {
      setIsLoadingApplicants(false);
    }
  };

  const handleAcceptApplication = async (applicationId: string) => {
    if (!selectedItem || updatingApplicationId) return;
    const applicant = applicants.find(app => app.id === applicationId);
    if (!applicant || applicant.status !== "under_process") return;
    
    setUpdatingApplicationId(applicationId);
    try {
      // Use backend API to update status (bypasses Firestore permissions)
      const apiType = itemType === "internship" ? "internship" : itemType === "microtask" ? "micro_task" : "job";
      const response = await fetch(`/api/lancing/applications/${applicationId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "accepted",
          jobId: selectedItem.id,
          applicantId: applicant.applicantId,
          type: apiType
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update status");
      }
      
      // Update UI immediately
      setApplicants(prev => prev.map(app => 
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
    if (!selectedItem || updatingApplicationId) return;
    const applicant = applicants.find(app => app.id === applicationId);
    if (!applicant || applicant.status !== "under_process") return;
    
    setUpdatingApplicationId(applicationId);
    try {
      // Use backend API to update status (bypasses Firestore permissions)
      const apiType = itemType === "internship" ? "internship" : itemType === "microtask" ? "micro_task" : "job";
      const response = await fetch(`/api/lancing/applications/${applicationId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "rejected",
          jobId: selectedItem.id,
          applicantId: applicant.applicantId,
          type: apiType
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update status");
      }
      
      // Update UI immediately
      setApplicants(prev => prev.map(app => 
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

  const handleLogout = async () => {
    await logout();
    setLocation("/student-lancing");
  };

  if (authLoading || !authChecked || !isAuthorized || isLoading) {
    return (
      <div className="min-h-screen sl-bg-atmosphere sl-grain-overlay flex items-center justify-center">
        <div className="text-center sl-slide-up">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center shadow-xl">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <Loader2 className="w-6 h-6 animate-spin text-teal-600 mx-auto" />
        </div>
      </div>
    );
  }

  const totalPosts = jobs.length + internships.length + microTasks.length;
  const totalApplications = jobs.reduce((acc, j) => acc + (j.applicationsCount || 0), 0) + 
    internships.reduce((acc, i) => acc + (i.applicationsCount || 0), 0) +
    microTasks.reduce((acc, t) => acc + (t.applicationsCount || 0), 0);

  const statCards = [
    { label: "Total Posts", value: totalPosts, icon: ClipboardList, color: "from-teal-500 to-cyan-600" },
    { label: "Applications", value: totalApplications, icon: Users, color: "from-teal-500 to-cyan-600" },
    { label: "Jobs", value: jobs.length, icon: Briefcase, color: "from-blue-500 to-indigo-600" },
    { label: "Internships", value: internships.length, icon: GraduationCap, color: "from-green-500 to-emerald-600" }
  ];

  return (
    <div className="min-h-screen sl-bg-atmosphere sl-grain-overlay">
      <SEOHead title="Angel Dashboard - StudentLancing" description="Post opportunities and help students grow" />

      <div className="flex">
        <aside className="w-72 bg-slate-900 border-r border-slate-800 min-h-screen p-6 hidden lg:block fixed left-0 top-0 overflow-y-auto">
          <Link href="/student-lancing" className="flex items-center gap-3 mb-10 group">
            <div className="w-11 h-11 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-xl flex items-center justify-center shadow-xl group-hover:shadow-2xl transition-all">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight text-white" >
              Student<span className="text-teal-400">Lancing</span>
            </span>
          </Link>

          <Link href="/lancing/angel-profile-edit">
            <button className="w-full mb-8 p-5 bg-gradient-to-br from-teal-950 to-slate-900 rounded-2xl border border-teal-900 shadow-xl hover:shadow-2xl hover:border-teal-700 transition-all group cursor-pointer">
              <Avatar className="w-16 h-16 mx-auto mb-4 border-3 border-teal-500 rounded-xl shadow-lg group-hover:scale-105 transition-transform">
                <AvatarImage src={profile?.photoUrl} className="object-cover" />
                <AvatarFallback className="bg-gradient-to-br from-teal-500 to-cyan-600 text-white text-xl font-bold rounded-xl">
                  {profile?.fullName?.[0] || "A"}
                </AvatarFallback>
              </Avatar>
              <p className="text-center font-bold text-white text-lg group-hover:text-teal-300 transition-colors" >
                {profile?.fullName || "Angel Recruiter"}
              </p>
              <p className="text-center text-xs text-teal-400 font-semibold mt-2" >
                Click to edit profile
              </p>
            </button>
          </Link>

          <nav className="space-y-2 mb-12">
            {[
              { id: "post", label: "Post Opportunity", icon: Plus, color: "teal" },
              { id: "manage", label: "Manage Posts", icon: ClipboardList, count: totalPosts, color: "teal" },
              { id: "messages", label: "Messages", icon: MessageSquare, color: "teal" },
              { id: "howtowork", label: "How to Work", icon: HelpCircle, color: "teal" }
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
                {item.count !== undefined && (
                  <span className="text-xs font-bold bg-teal-500 text-white px-2.5 py-1 rounded-full">
                    {item.count}
                  </span>
                )}
              </button>
            ))}
          </nav>

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

        <main className="flex-1 lg:ml-72 p-6 lg:p-10">
          <div className="lg:hidden flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-xl flex items-center justify-center shadow-lg">
                <Sparkles className="w-5 h-5 text-white" />
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

          {activeTab === "post" && (
            <div className="space-y-8 sl-fade-in">
              <div className="space-y-2">
                <h1 className="text-4xl lg:text-5xl font-black tracking-tight" >
                  <span className="text-slate-900">Post an</span>{" "}
                  <span className="bg-gradient-to-r from-teal-600 to-cyan-500 bg-clip-text text-transparent">Opportunity</span>
                </h1>
                <p className="text-lg text-slate-600 max-w-2xl" >
                  Help students grow by posting jobs or internships.
                </p>
              </div>

              <Tabs value={postType} onValueChange={(v) => setPostType(v as any)} className="w-full">
                <TabsList className="grid w-full grid-cols-2 h-14 rounded-2xl bg-slate-100 p-1.5">
                  <TabsTrigger value="job" className="rounded-xl font-bold data-[state=active]:bg-white data-[state=active]:shadow-md" >
                    <Briefcase className="w-4 h-4 mr-2" />
                    Job
                  </TabsTrigger>
                  <TabsTrigger value="internship" className="rounded-xl font-bold data-[state=active]:bg-white data-[state=active]:shadow-md" >
                    <GraduationCap className="w-4 h-4 mr-2" />
                    Internship
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="job" className="mt-6">
                  <form onSubmit={handlePostJob}>
                    <Card className="rounded-3xl shadow-xl border-0 mb-8 overflow-hidden bg-white">
                      <CardContent className="p-8 space-y-6">
                        <div className="space-y-2">
                          <Label className="text-sm font-black text-slate-900" >JOB TITLE *</Label>
                          <Input value={jobForm.title} onChange={(e) => setJobForm({ ...jobForm, title: e.target.value })} placeholder="e.g., React Developer for E-commerce Project" className="h-14 rounded-xl border-2 border-slate-200 focus:border-teal-500 text-base font-medium"  />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-black text-slate-900" >DESCRIPTION *</Label>
                          <Textarea value={jobForm.description} onChange={(e) => setJobForm({ ...jobForm, description: e.target.value })} placeholder="Describe the project, responsibilities, and requirements..." className="rounded-xl min-h-[140px] border-2 border-slate-200 focus:border-teal-500 text-base font-medium resize-none p-4"  />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-black text-slate-900" >REQUIRED SKILLS *</Label>
                          <div className="flex gap-3">
                            <Input value={skillInput} onChange={(e) => setSkillInput(e.target.value)} placeholder="Type a skill..." className="h-12 rounded-xl border-2 border-slate-200 focus:border-teal-500 font-medium"  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSkill(skillInput))} />
                            <Button type="button" onClick={() => addSkill(skillInput)} className="h-12 px-6 bg-teal-600 hover:bg-teal-700 rounded-xl font-bold" ><Plus className="w-5 h-5" /></Button>
                          </div>
                          {jobForm.skills.length > 0 && (
                            <div className="flex flex-wrap gap-2.5 p-5 bg-teal-50 rounded-xl border-2 border-teal-200">
                              {jobForm.skills.map(skill => (
                                <Badge key={skill} className="px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold cursor-pointer rounded-lg" >
                                  {skill}<X className="w-4 h-4 ml-2" onClick={() => removeSkill(skill)} />
                                </Badge>
                              ))}
                            </div>
                          )}
                          <div className="flex flex-wrap gap-2">
                            {SKILL_OPTIONS.filter(s => !jobForm.skills.includes(s)).slice(0, 8).map(skill => (
                              <Badge key={skill} variant="outline" className="px-3.5 py-2 cursor-pointer hover:bg-teal-50 hover:border-teal-400 hover:text-teal-700 transition-all rounded-lg font-bold"  onClick={() => addSkill(skill)}>+ {skill}</Badge>
                            ))}
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <Label className="text-sm font-black text-slate-900" >BUDGET (₹) *</Label>
                            <div className="relative">
                              <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-600 font-bold">₹</span>
                              <Input value={jobForm.budget} onChange={(e) => setJobForm({ ...jobForm, budget: e.target.value })} placeholder="e.g., 10000-15000" className="pl-12 h-14 rounded-xl border-2 border-slate-200 focus:border-teal-500 font-medium"  />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-sm font-black text-slate-900" >DEADLINE</Label>
                            <div className="relative">
                              <Calendar className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                              <Input type="date" value={jobForm.deadline} onChange={(e) => setJobForm({ ...jobForm, deadline: e.target.value })} className="pl-12 h-14 rounded-xl border-2 border-slate-200 focus:border-teal-500 font-medium"  />
                            </div>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <Label className="text-sm font-black text-slate-900" >WORK MODE</Label>
                            <Select value={jobForm.mode} onValueChange={(v) => setJobForm({ ...jobForm, mode: v })}>
                              <SelectTrigger className="h-14 rounded-xl border-2 border-slate-200 focus:border-teal-500 font-medium" ><SelectValue /></SelectTrigger>
                              <SelectContent className="rounded-xl">
                                <SelectItem value="Remote" className="rounded-lg">Remote</SelectItem>
                                <SelectItem value="On-site" className="rounded-lg">On-site</SelectItem>
                                <SelectItem value="Hybrid" className="rounded-lg">Hybrid</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-sm font-black text-slate-900" >DURATION</Label>
                            <div className="relative">
                              <Clock className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                              <Input value={jobForm.duration} onChange={(e) => setJobForm({ ...jobForm, duration: e.target.value })} placeholder="e.g., 2 weeks" className="pl-12 h-14 rounded-xl border-2 border-slate-200 focus:border-teal-500 font-medium"  />
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Button type="submit" disabled={isSubmitting} className="w-full h-16 bg-gradient-to-r from-teal-600 to-cyan-500 hover:from-teal-700 hover:to-cyan-600 text-white font-black rounded-2xl shadow-xl shadow-teal-500/30 hover:shadow-teal-500/50 transition-all text-lg" >
                      {isSubmitting ? <Loader2 className="h-6 w-6 animate-spin" /> : <><Plus className="w-6 h-6 mr-2" />Post Job Now</>}
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="internship" className="mt-6">
                  <form onSubmit={handlePostInternship}>
                    <Card className="rounded-3xl shadow-xl border-0 mb-8 overflow-hidden bg-white">
                      <CardContent className="p-8 space-y-6">
                        <div className="space-y-2">
                          <Label className="text-sm font-black text-slate-900" >INTERNSHIP TITLE *</Label>
                          <Input value={internshipForm.title} onChange={(e) => setInternshipForm({ ...internshipForm, title: e.target.value })} placeholder="e.g., Marketing Intern" className="h-14 rounded-xl border-2 border-slate-200 focus:border-teal-500 text-base font-medium"  />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-black text-slate-900" >DESCRIPTION *</Label>
                          <Textarea value={internshipForm.description} onChange={(e) => setInternshipForm({ ...internshipForm, description: e.target.value })} placeholder="Describe the internship role and responsibilities..." className="rounded-xl min-h-[140px] border-2 border-slate-200 focus:border-teal-500 text-base font-medium resize-none p-4"  />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-black text-slate-900" >FIELD *</Label>
                          <Select value={internshipForm.field} onValueChange={(v) => setInternshipForm({ ...internshipForm, field: v })}>
                            <SelectTrigger className="h-14 rounded-xl border-2 border-slate-200 focus:border-teal-500 font-medium" ><SelectValue placeholder="Select field" /></SelectTrigger>
                            <SelectContent className="rounded-xl">
                              {INTERNSHIP_FIELDS.map(field => (
                                <SelectItem key={field} value={field} className="rounded-lg">{field}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <Label className="text-sm font-black text-slate-900" >STIPEND (₹)</Label>
                            <div className="relative">
                              <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-600 font-bold">₹</span>
                              <Input value={internshipForm.stipend} onChange={(e) => setInternshipForm({ ...internshipForm, stipend: e.target.value })} placeholder="e.g., 5000/month" className="pl-12 h-14 rounded-xl border-2 border-slate-200 focus:border-teal-500 font-medium"  />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-sm font-black text-slate-900" >DURATION</Label>
                            <Input value={internshipForm.duration} onChange={(e) => setInternshipForm({ ...internshipForm, duration: e.target.value })} placeholder="e.g., 3 months" className="h-14 rounded-xl border-2 border-slate-200 focus:border-teal-500 font-medium"  />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-black text-slate-900" >WORK MODE</Label>
                          <Select value={internshipForm.mode} onValueChange={(v) => setInternshipForm({ ...internshipForm, mode: v })}>
                            <SelectTrigger className="h-14 rounded-xl border-2 border-slate-200 focus:border-teal-500 font-medium" ><SelectValue /></SelectTrigger>
                            <SelectContent className="rounded-xl">
                              <SelectItem value="Remote" className="rounded-lg">Remote</SelectItem>
                              <SelectItem value="On-site" className="rounded-lg">On-site</SelectItem>
                              <SelectItem value="Hybrid" className="rounded-lg">Hybrid</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </CardContent>
                    </Card>
                    <Button type="submit" disabled={isSubmitting} className="w-full h-16 bg-gradient-to-r from-teal-600 to-cyan-500 hover:from-teal-700 hover:to-cyan-600 text-white font-black rounded-2xl shadow-xl shadow-teal-500/30 hover:shadow-teal-500/50 transition-all text-lg" >
                      {isSubmitting ? <Loader2 className="h-6 w-6 animate-spin" /> : <><Plus className="w-6 h-6 mr-2" />Post Internship</>}
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="microtask" className="mt-6">
                  <form onSubmit={handlePostMicroTask}>
                    <Card className="rounded-3xl shadow-xl border-0 mb-8 overflow-hidden bg-white">
                      <CardContent className="p-8 space-y-6">
                        <div className="space-y-2">
                          <Label className="text-sm font-black text-slate-900" >TASK TITLE *</Label>
                          <Input value={microTaskForm.title} onChange={(e) => setMicroTaskForm({ ...microTaskForm, title: e.target.value })} placeholder="e.g., Write 5 Product Descriptions" className="h-14 rounded-xl border-2 border-slate-200 focus:border-teal-500 text-base font-medium"  />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-black text-slate-900" >DESCRIPTION *</Label>
                          <Textarea value={microTaskForm.description} onChange={(e) => setMicroTaskForm({ ...microTaskForm, description: e.target.value })} placeholder="Describe the task in detail..." className="rounded-xl min-h-[140px] border-2 border-slate-200 focus:border-teal-500 text-base font-medium resize-none p-4"  />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-black text-slate-900" >TASK TYPE *</Label>
                          <Select value={microTaskForm.taskType} onValueChange={(v) => setMicroTaskForm({ ...microTaskForm, taskType: v })}>
                            <SelectTrigger className="h-14 rounded-xl border-2 border-slate-200 focus:border-teal-500 font-medium" ><SelectValue placeholder="Select task type" /></SelectTrigger>
                            <SelectContent className="rounded-xl">
                              {TASK_TYPES.map(type => (
                                <SelectItem key={type} value={type} className="rounded-lg">{type}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <Label className="text-sm font-black text-slate-900" >PAYMENT (₹) *</Label>
                            <div className="relative">
                              <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-600 font-bold">₹</span>
                              <Input value={microTaskForm.payment} onChange={(e) => setMicroTaskForm({ ...microTaskForm, payment: e.target.value })} placeholder="e.g., 500" className="pl-12 h-14 rounded-xl border-2 border-slate-200 focus:border-teal-500 font-medium"  />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-sm font-black text-slate-900" >DEADLINE</Label>
                            <div className="relative">
                              <Calendar className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                              <Input type="date" value={microTaskForm.deadline} onChange={(e) => setMicroTaskForm({ ...microTaskForm, deadline: e.target.value })} className="pl-12 h-14 rounded-xl border-2 border-slate-200 focus:border-teal-500 font-medium"  />
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Button type="submit" disabled={isSubmitting} className="w-full h-16 bg-gradient-to-r from-teal-600 to-cyan-500 hover:from-teal-700 hover:to-cyan-600 text-white font-black rounded-2xl shadow-xl shadow-teal-500/30 hover:shadow-teal-500/50 transition-all text-lg" >
                      {isSubmitting ? <Loader2 className="h-6 w-6 animate-spin" /> : <><Plus className="w-6 h-6 mr-2" />Post Micro Task</>}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </div>
          )}

          {activeTab === "manage" && (
            <div className="space-y-8 sl-fade-in">
              <h1 className="text-4xl lg:text-5xl font-black tracking-tight" >Your Posts</h1>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {statCards.map((stat, i) => (
                  <Card key={i} className="rounded-2xl border-0 shadow-lg hover:shadow-xl transition-shadow overflow-hidden bg-white">
                    <CardContent className="p-6">
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center mb-4 shadow-lg`}>
                        <stat.icon className="w-6 h-6 text-white" />
                      </div>
                      <p className="text-3xl lg:text-4xl font-black text-slate-900 mb-1" >{stat.value}</p>
                      <p className="text-xs lg:text-sm text-slate-600 font-semibold" >{stat.label}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Tabs defaultValue="jobs" className="w-full">
                <TabsList className="grid w-full grid-cols-3 h-12 rounded-xl bg-slate-100 p-1">
                  <TabsTrigger value="jobs" className="rounded-lg font-bold" >Jobs ({jobs.length})</TabsTrigger>
                  <TabsTrigger value="internships" className="rounded-lg font-bold" >Internships ({internships.length})</TabsTrigger>
                  <TabsTrigger value="microtasks" className="rounded-lg font-bold" >Micro Tasks ({microTasks.length})</TabsTrigger>
                </TabsList>

                <TabsContent value="jobs" className="mt-6 space-y-4">
                  {jobs.length === 0 ? (
                    <Card className="rounded-3xl border-0 shadow-xl py-16 bg-gradient-to-br from-slate-50 to-white">
                      <CardContent className="text-center">
                        <Briefcase className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                        <p className="text-slate-600 font-medium">No jobs posted yet</p>
                        <Button onClick={() => { setActiveTab("post"); setPostType("job"); }} className="mt-4 bg-teal-600 hover:bg-teal-700 rounded-xl" >Post a Job</Button>
                      </CardContent>
                    </Card>
                  ) : jobs.map((job) => (
                    <Card key={job.id} className="rounded-2xl border-2 border-slate-200 hover:border-teal-500 bg-white hover:shadow-xl transition-all duration-300 group shadow-md">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between gap-6">
                          <div className="flex-1">
                            <h3 className="font-black text-lg text-slate-900 mb-2 group-hover:text-teal-700 transition-colors" >{job.title}</h3>
                            <p className="text-slate-700 text-sm mb-4 line-clamp-2 font-medium" >{job.description}</p>
                            <div className="flex flex-wrap gap-2 mb-4">
                              {job.skills.slice(0, 4).map(skill => (
                                <Badge key={skill} className="px-3 py-1.5 bg-teal-100 text-teal-700 font-bold rounded-lg border-0" >{skill}</Badge>
                              ))}
                            </div>
                            <div className="flex flex-wrap gap-4 text-sm font-bold" >
                              <span className="flex items-center gap-2 text-teal-700 bg-teal-50 px-3 py-1.5 rounded-lg"><DollarSign className="w-4 h-4" />₹{job.budget}</span>
                              <span className="flex items-center gap-2 text-slate-700 bg-slate-100 px-3 py-1.5 rounded-lg"><Users className="w-4 h-4" />{job.applicationsCount || 0} applications</span>
                            </div>
                          </div>
                          <div className="flex flex-col gap-2 flex-shrink-0">
                            <Button variant="outline" onClick={() => viewApplicants(job, "job")} className="rounded-xl font-bold border-2 hover:border-teal-400 hover:text-teal-700" >
                              <Users className="w-4 h-4 mr-2" />Applicants ({job.applicationsCount || 0})
                            </Button>
                            <Button variant="ghost" onClick={() => handleDelete(job.id, "job")} className="text-red-600 hover:bg-red-50 rounded-xl font-bold" >
                              <Trash2 className="w-4 h-4 mr-2" />Delete
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </TabsContent>

                <TabsContent value="internships" className="mt-6 space-y-4">
                  {internships.length === 0 ? (
                    <Card className="rounded-3xl border-0 shadow-xl py-16 bg-gradient-to-br from-slate-50 to-white">
                      <CardContent className="text-center">
                        <GraduationCap className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                        <p className="text-slate-600 font-medium">No internships posted yet</p>
                        <Button onClick={() => { setActiveTab("post"); setPostType("internship"); }} className="mt-4 bg-teal-600 hover:bg-teal-700 rounded-xl" >Post an Internship</Button>
                      </CardContent>
                    </Card>
                  ) : internships.map((intern) => (
                    <Card key={intern.id} className="rounded-2xl border-2 border-slate-200 hover:border-teal-500 bg-white hover:shadow-xl transition-all duration-300 group shadow-md">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between gap-6">
                          <div className="flex-1">
                            <h3 className="font-black text-lg text-slate-900 mb-2 group-hover:text-teal-700 transition-colors" >{intern.title}</h3>
                            <p className="text-slate-700 text-sm mb-4 line-clamp-2 font-medium" >{intern.description}</p>
                            <div className="flex flex-wrap gap-4 text-sm font-bold" >
                              <span className="flex items-center gap-2 text-green-700 bg-green-50 px-3 py-1.5 rounded-lg"><GraduationCap className="w-4 h-4" />{intern.field}</span>
                              {intern.stipend && <span className="flex items-center gap-2 text-teal-700 bg-teal-50 px-3 py-1.5 rounded-lg"><DollarSign className="w-4 h-4" />₹{intern.stipend}</span>}
                              <span className="flex items-center gap-2 text-slate-700 bg-slate-100 px-3 py-1.5 rounded-lg"><Users className="w-4 h-4" />{intern.applicationsCount || 0} applications</span>
                            </div>
                          </div>
                          <div className="flex flex-col gap-2 flex-shrink-0">
                            <Button variant="outline" onClick={() => viewApplicants(intern, "internship")} className="rounded-xl font-bold border-2 hover:border-teal-400 hover:text-teal-700" >
                              <Users className="w-4 h-4 mr-2" />Applicants ({intern.applicationsCount || 0})
                            </Button>
                            <Button variant="ghost" onClick={() => handleDelete(intern.id, "internship")} className="text-red-600 hover:bg-red-50 rounded-xl font-bold" >
                              <Trash2 className="w-4 h-4 mr-2" />Delete
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </TabsContent>

                <TabsContent value="microtasks" className="mt-6 space-y-4">
                  {microTasks.length === 0 ? (
                    <Card className="rounded-3xl border-0 shadow-xl py-16 bg-gradient-to-br from-slate-50 to-white">
                      <CardContent className="text-center">
                        <Zap className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                        <p className="text-slate-600 font-medium">No micro tasks posted yet</p>
                      </CardContent>
                    </Card>
                  ) : microTasks.map((task) => (
                    <Card key={task.id} className="rounded-2xl border-2 border-slate-200 hover:border-teal-500 bg-white hover:shadow-xl transition-all duration-300 group shadow-md">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between gap-6">
                          <div className="flex-1">
                            <h3 className="font-black text-lg text-slate-900 mb-2 group-hover:text-teal-700 transition-colors" >{task.title}</h3>
                            <p className="text-slate-700 text-sm mb-4 line-clamp-2 font-medium" >{task.description}</p>
                            <div className="flex flex-wrap gap-4 text-sm font-bold" >
                              <span className="flex items-center gap-2 text-amber-700 bg-amber-50 px-3 py-1.5 rounded-lg"><Zap className="w-4 h-4" />{task.taskType}</span>
                              <span className="flex items-center gap-2 text-teal-700 bg-teal-50 px-3 py-1.5 rounded-lg"><DollarSign className="w-4 h-4" />₹{task.payment}</span>
                              <span className="flex items-center gap-2 text-slate-700 bg-slate-100 px-3 py-1.5 rounded-lg"><Users className="w-4 h-4" />{task.applicationsCount || 0} applications</span>
                            </div>
                          </div>
                          <div className="flex flex-col gap-2 flex-shrink-0">
                            <Button variant="outline" onClick={() => viewApplicants(task, "microtask")} className="rounded-xl font-bold border-2 hover:border-teal-400 hover:text-teal-700" >
                              <Users className="w-4 h-4 mr-2" />Applicants ({task.applicationsCount || 0})
                            </Button>
                            <Button variant="ghost" onClick={() => handleDelete(task.id, "microtask")} className="text-red-600 hover:bg-red-50 rounded-xl font-bold" >
                              <Trash2 className="w-4 h-4 mr-2" />Delete
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </TabsContent>
              </Tabs>
            </div>
          )}

          {activeTab === "messages" && (
            <div className="sl-fade-in space-y-6">
              <h1 className="text-3xl font-black text-slate-900" >Messages</h1>
              <Card className="rounded-3xl border-0 shadow-xl py-20 bg-gradient-to-br from-teal-50 to-white">
                <CardContent className="text-center space-y-6">
                  <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-teal-100 to-cyan-50 flex items-center justify-center mx-auto shadow-lg">
                    <MessageSquare className="w-12 h-12 text-teal-600" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-2xl font-black text-slate-900" >No Messages Yet</h3>
                    <p className="text-slate-600 max-w-sm mx-auto" >When freelancers apply to your posts, their applications will appear here.</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === "howtowork" && (
            <div className="sl-fade-in space-y-6">
              <div className="space-y-2">
                <h1 className="text-4xl lg:text-5xl font-black tracking-tight" >
                  <span className="text-slate-900">How to</span>{" "}
                  <span className="bg-gradient-to-r from-teal-600 to-cyan-500 bg-clip-text text-transparent">Work</span>
                </h1>
                <p className="text-lg text-slate-600 max-w-2xl" >
                  Your complete guide to hiring freelancers on StudentLancing
                </p>
              </div>

              <Card className="rounded-3xl border-0 shadow-xl overflow-hidden bg-white">
                <CardContent className="p-8 space-y-8">
                  <div className="space-y-6">
                    <h2 className="text-2xl font-black text-slate-900" >
                      Step-by-Step Guide
                    </h2>
                    
                    <div className="space-y-4">
                      <div className="flex gap-4 p-4 bg-teal-50 rounded-2xl border-2 border-teal-100">
                        <div className="w-12 h-12 bg-teal-600 rounded-xl flex items-center justify-center flex-shrink-0">
                          <span className="text-white font-black text-lg">1</span>
                        </div>
                        <div>
                          <h3 className="font-bold text-teal-900 mb-1" >Post Your Opportunity</h3>
                          <p className="text-teal-700 text-sm" >
                            Create a job, internship, or micro task with clear requirements, budget, and timeline.
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-4 p-4 bg-teal-50 rounded-2xl border-2 border-teal-100">
                        <div className="w-12 h-12 bg-teal-600 rounded-xl flex items-center justify-center flex-shrink-0">
                          <span className="text-white font-black text-lg">2</span>
                        </div>
                        <div>
                          <h3 className="font-bold text-teal-900 mb-1" >Review Applications</h3>
                          <p className="text-teal-700 text-sm" >
                            View applicant profiles, skills, and cover letters. Shortlist promising candidates.
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-4 p-4 bg-teal-50 rounded-2xl border-2 border-teal-100">
                        <div className="w-12 h-12 bg-teal-600 rounded-xl flex items-center justify-center flex-shrink-0">
                          <span className="text-white font-black text-lg">3</span>
                        </div>
                        <div>
                          <h3 className="font-bold text-teal-900 mb-1" >Hire & Get Contact Info</h3>
                          <p className="text-teal-700 text-sm" >
                            Accept the best candidate. They'll submit their contact details for you to reach out.
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-4 p-4 bg-teal-50 rounded-2xl border-2 border-teal-100">
                        <div className="w-12 h-12 bg-teal-600 rounded-xl flex items-center justify-center flex-shrink-0">
                          <span className="text-white font-black text-lg">4</span>
                        </div>
                        <div>
                          <h3 className="font-bold text-teal-900 mb-1" >Make Secure Payment</h3>
                          <p className="text-teal-700 text-sm" >
                            Pay securely via PayU. Funds are held in escrow until work is completed.
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-4 p-4 bg-green-50 rounded-2xl border-2 border-green-100">
                        <div className="w-12 h-12 bg-green-600 rounded-xl flex items-center justify-center flex-shrink-0">
                          <span className="text-white font-black text-lg">5</span>
                        </div>
                        <div>
                          <h3 className="font-bold text-green-900 mb-1" >Approve & Release Payment</h3>
                          <p className="text-green-700 text-sm" >
                            Review the completed work. Once satisfied, release payment to the freelancer.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Payment Security */}
              <Card className="rounded-3xl border-0 shadow-xl overflow-hidden bg-gradient-to-br from-teal-50 to-cyan-50">
                <CardContent className="p-8">
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 bg-teal-600 rounded-2xl flex items-center justify-center flex-shrink-0">
                      <Shield className="w-7 h-7 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-teal-900 mb-2" >
                        Secure Escrow Payment
                      </h3>
                      <p className="text-teal-700" >
                        Your payment is held securely in escrow. Funds are only released to the freelancer after you approve the completed work. This protects both you and the freelancer throughout the project.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </main>
      </div>

      <Dialog open={showApplicantsDialog} onOpenChange={setShowApplicantsDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black" >
              Applicants for "{selectedItem?.title}"
            </DialogTitle>
            <DialogDescription className="text-slate-600" >
              Review applications and accept or reject candidates
            </DialogDescription>
          </DialogHeader>
          
          {isLoadingApplicants ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
            </div>
          ) : applicants.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-600">No applications yet</p>
            </div>
          ) : (
            <div className="space-y-4 mt-4">
              {applicants.map((app) => (
                <Card key={app.id} className="rounded-xl border-2 border-slate-200">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <Avatar className="w-12 h-12 border-2 border-teal-200">
                        <AvatarImage src={app.applicantProfileImage} />
                        <AvatarFallback className="bg-teal-100 text-teal-700 font-bold">
                          {app.applicantName?.[0] || "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-slate-900" >{app.applicantName}</h4>
                          <Badge className={`${
                            app.status === "accepted" ? "bg-green-100 text-green-700" :
                            app.status === "rejected" ? "bg-red-100 text-red-700" :
                            "bg-amber-100 text-amber-700"
                          } font-bold`}>
                            {app.status === "accepted" ? "Accepted" : app.status === "rejected" ? "Rejected" : "Pending"}
                          </Badge>
                        </div>
                        
                        {app.status === "accepted" && (
                          <div className="mt-2 p-3 bg-green-50 rounded-lg border border-green-200">
                            <p className="text-xs font-bold text-green-700 mb-1" >CONTACT INFO (REVEALED)</p>
                            {app.applicantEmail && (
                              <p className="text-sm text-green-800 flex items-center gap-2"><Mail className="w-3.5 h-3.5" />{app.applicantEmail}</p>
                            )}
                            {app.applicantPhone && (
                              <p className="text-sm text-green-800">{app.applicantPhone}</p>
                            )}
                          </div>
                        )}
                        
                        {app.message && (
                          <p className="text-sm text-slate-600 mt-2" >{app.message}</p>
                        )}
                        
                        {app.applicantSkills && app.applicantSkills.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {app.applicantSkills.slice(0, 5).map(skill => (
                              <Badge key={skill} variant="outline" className="text-xs">{skill}</Badge>
                            ))}
                          </div>
                        )}
                        
                        {app.status === "under_process" && (
                          <div className="flex gap-2 mt-3">
                            <Button size="sm" onClick={() => handleAcceptApplication(app.id)} className="bg-green-600 hover:bg-green-700 rounded-lg font-bold" >
                              <CheckCircle2 className="w-4 h-4 mr-1" />Accept
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleRejectApplication(app.id)} className="text-red-600 border-red-200 hover:bg-red-50 rounded-lg font-bold" >
                              <XCircle className="w-4 h-4 mr-1" />Reject
                            </Button>
                          </div>
                        )}
                        
                        {app.status === "accepted" && (
                          <div className="flex gap-2 mt-3">
                            <Button size="sm" onClick={() => viewApplicantProfile(app)} className="bg-teal-600 hover:bg-teal-700 rounded-lg font-bold" data-testid={`view-profile-${app.id}`}>
                              <Eye className="w-4 h-4 mr-1" />View Profile
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Applicant Profile Dialog */}
      <Dialog open={showProfileDialog} onOpenChange={setShowProfileDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black">
              {selectedApplicant?.applicantName}'s Profile
            </DialogTitle>
            <DialogDescription className="text-slate-600">
              View applicant's full profile, resume, and certificates
            </DialogDescription>
          </DialogHeader>

          {isLoadingProfile ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
            </div>
          ) : applicantProfile ? (
            <div className="space-y-6 mt-4">
              {/* Profile Header */}
              <div className="flex items-center gap-4">
                <Avatar className="w-16 h-16 border-2 border-teal-200">
                  <AvatarImage src={applicantProfile.profileImageUrl || undefined} />
                  <AvatarFallback className="bg-teal-100 text-teal-700 text-xl font-bold">
                    {applicantProfile.fullName?.[0] || "?"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">{applicantProfile.fullName}</h3>
                  {selectedApplicant?.applicantEmail && (
                    <p className="text-sm text-slate-600 flex items-center gap-1">
                      <Mail className="w-3.5 h-3.5" />{selectedApplicant.applicantEmail}
                    </p>
                  )}
                </div>
              </div>

              {/* Skills */}
              {applicantProfile.skills && applicantProfile.skills.length > 0 && (
                <div>
                  <h4 className="font-bold text-slate-700 mb-2">Skills</h4>
                  <div className="flex flex-wrap gap-2">
                    {applicantProfile.skills.map(skill => (
                      <Badge key={skill} className="bg-teal-100 text-teal-700 rounded-lg">{skill}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* About / Experience */}
              <div>
                <h4 className="font-bold text-slate-700 mb-2">About / Experience</h4>
                {applicantProfile.experience || applicantProfile.aboutMe ? (
                  <p className="text-sm text-slate-600 whitespace-pre-wrap">
                    {applicantProfile.experience || applicantProfile.aboutMe}
                  </p>
                ) : (
                  <p className="text-sm text-slate-400">No experience details provided</p>
                )}
              </div>

              {/* Resume */}
              {applicantProfile.resumeUrl && (
                <div>
                  <h4 className="font-bold text-slate-700 mb-2 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-teal-600" />
                    Resume
                  </h4>
                  <a 
                    href={applicantProfile.resumeUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
                    data-testid="view-applicant-resume"
                  >
                    <FileText className="w-4 h-4" />
                    View Resume
                  </a>
                </div>
              )}

              {/* Certificate */}
              {applicantProfile.certificateUrl && (
                <div>
                  <h4 className="font-bold text-slate-700 mb-2 flex items-center gap-2">
                    <Award className="w-4 h-4 text-teal-600" />
                    Certificate
                  </h4>
                  <a 
                    href={applicantProfile.certificateUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors text-sm font-medium"
                    data-testid="view-applicant-certificate"
                  >
                    <Award className="w-4 h-4" />
                    View Certificate
                  </a>
                </div>
              )}

              {/* Close Button */}
              <div className="pt-4 border-t border-slate-200">
                <Button onClick={() => setShowProfileDialog(false)} variant="outline" className="w-full rounded-xl font-bold">
                  Close
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-slate-500">Could not load profile</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
