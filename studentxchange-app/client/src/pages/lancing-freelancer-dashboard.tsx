import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { PLATFORM_ADMIN_EMAIL } from "@/config/constants";
import { useCareerSubscription } from "@/hooks/use-career-subscription";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  Briefcase, LogOut, Search, MapPin, Clock, 
  Loader2, Send, Star, ArrowRight, ArrowLeft, Bell, 
  MessageSquare, TrendingUp, Zap, Target, Award, IndianRupee,
  Phone, Mail, CheckCircle2, XCircle, PartyPopper, HelpCircle,
  Menu, X, Home, User, FileText, ChevronRight, Shield, Sparkles, RefreshCw, Map, Contact, GraduationCap, CalendarCheck, Crown,
  Trophy, ExternalLink, Wifi, Globe, Tag, Users, Filter
} from "lucide-react";
import { RotatingSearchMessage, TrendingChips, SearchSkeletonGrid, CacheBadge, NoCreditsNotice } from "@/components/lancing/search-loader";
import { useLocation, Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useLancingAuth } from "@/hooks/use-lancing-auth";
import { firestore, getAuthToken } from "@/lib/firebase";
import { useApplyCounter } from "@/hooks/use-apply-counter";
import { useReadinessGate } from "@/hooks/use-readiness-gate";
import ApplyGateModal from "@/components/lancing/apply-gate-modal";
import WelcomeCreditsModal from "@/components/lancing/welcome-credits-modal";
import ApplyCounterBadge from "@/components/lancing/apply-counter-badge";
import OpportunityCard, { OpportunityCardData } from "@/components/lancing/opportunity-card";
import UnifiedMatchFeed from "@/components/lancing/unified-match-feed";
import DiscoverySearchLinks from "@/components/lancing/DiscoverySearchLinks";
import { displayInstitutionName } from "@/lib/institution-display";
import { LastUpdatedBadge } from "@/components/lancing/last-updated-badge";
import { fuzzySearch } from "@/lib/lancing-search";
import { computeDriveEligibility, hasAnyEligibilityCriteria } from "@/lib/drive-eligibility";
import { ExternalApplicationConfirmation, openExternalOpportunity, recordExternalApplication, ExternalApplicationType } from "@/components/lancing/external-application-confirmation";
import { SectorChips } from "@/components/lancing/sector-chips";
import { SmartSections } from "@/components/lancing/smart-sections";
import { useQuery } from "@tanstack/react-query";
import { collection, getDocs, doc, getDoc, query, collectionGroup, where } from "firebase/firestore";
import SEOHead from "@/components/seo/seo-head";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Job {
  id: string;
  applicationType?: "job" | "internship" | "micro_task";
  sourceCollection?: string;
  title: string;
  description: string;
  skills: string[];
  budget: string;
  deadline: string;
  mode: string;
  duration: string;
  companyId: string;
  companyName: string;
  companyLogo?: string;
  createdAt: string;
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
  companyId: string;
  companyName: string;
  createdAt: string;
}

interface MicroTask {
  id: string;
  title: string;
  description: string;
  taskType: string;
  payment: string;
  deadline: string;
  companyId: string;
  companyName: string;
  createdAt: string;
}

interface FreelancerProfile {
  fullName: string;
  phoneNumber: string;
  aboutMe: string;
  skills: string[];
  profileImageUrl?: string;
  resumeUrl?: string;
  hourlyRate?: string;
  preferred_sectors?: string[];
  branch?: string;
  year?: string;
}

interface Application {
  id: string;
  jobId: string;
  jobTitle: string;
  companyName: string;
  companyLogo?: string;
  type: "job" | "micro_task" | "internship" | "competition";
  status: "under_process" | "accepted" | "rejected" | "hired";
  appliedAt: string;
  message?: string;
  contactSubmitted?: boolean;
  escrowStatus?: "pending" | "funded" | "released";
  escrowAmount?: number;
}

interface Notification {
  id: string;
  type: "hired" | "accepted" | "rejected";
  title: string;
  message: string;
  jobId: string;
  jobTitle: string;
  jobType: string;
  applicationId: string;
  recruiterId: string;
  recruiterName: string;
  requiresContactSubmission: boolean;
  contactSubmitted: boolean;
  createdAt: string;
  read: boolean;
}

export default function LancingFreelancerDashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading: authLoading, dataLoaded, logout, hasSelectedRole, role, profileComplete, isLoadingData, loadError, retryLoad } = useLancingAuth();
  const { isPremium: isCareerPremium } = useCareerSubscription(isAuthenticated);

  const [activeTab, setActiveTab] = useState<"jobs" | "micro-tasks" | "internships" | "competitions" | "applications" | "messages" | "how-to-earn">("jobs");
  const [compSearch, setCompSearch] = useState("");
  const [compCategory, setCompCategory] = useState("All");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [internships, setInternships] = useState<Internship[]>([]);
  const [microTasks, setMicroTasks] = useState<MicroTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [applyMessage, setApplyMessage] = useState("");
  const [isApplying, setIsApplying] = useState(false);
  const [profile, setProfile] = useState<FreelancerProfile | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [myApplications, setMyApplications] = useState<Application[]>([]);
  const [appliedJobIds, setAppliedJobIds] = useState<Set<string>>(new Set());
  const [showApplyGate, setShowApplyGate] = useState(false);
  const [externalItem, setExternalItem] = useState<{ item: OpportunityCardData; url: string; type: ExternalApplicationType } | null>(null);
  const [isMarkingExternalApplied, setIsMarkingExternalApplied] = useState(false);
  const [campusDrives, setCampusDrives] = useState<any[]>([]);
  const [campusDrivesLoading, setCampusDrivesLoading] = useState(false);
  const [campusDrivesLoaded, setCampusDrivesLoaded] = useState(false);
  const [campusDrivesNextCursor, setCampusDrivesNextCursor] = useState<string | null>(null);
  const [campusDrivesLoadingMore, setCampusDrivesLoadingMore] = useState(false);
  const [studentCCProfile, setStudentCCProfile] = useState<any>(null);
  const [campusEligibleOnly, setCampusEligibleOnly] = useState(false);
  const [welcomeDismissed, setWelcomeDismissed] = useState(false);
  const applyCounter = useApplyCounter();
  const { score: readinessScore, loading: readinessLoading, canApply: canApplyToJobs } = useReadinessGate();

  const { data: competitionsData, isLoading: competitionsLoading } = useQuery<{ items: any[]; cached: boolean; cachedAt: number }>({
    queryKey: ["/api/lancing/live-feed/competitions", user?.uid],
    queryFn: async () => {
      const token = await getAuthToken();
      const response = await fetch("/api/lancing/live-feed/competitions", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!response.ok) throw new Error("Competition listings are unavailable");
      return response.json();
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    refetchInterval: 10 * 60 * 1000,
  });
  const competitions = competitionsData?.items ?? [];

  const COMP_TYPE_MAP: Record<string, string> = {
    "hackathon": "Hackathon",
    "case-study": "Case Study",
    "coding-contest": "Coding Contest",
    "contest": "Coding Contest",
    "business-plan": "Business Plan",
    "olympiad": "Olympiad",
    "quiz": "Quiz",
    "ideathon": "Ideathon",
    "design": "Design",
    "research": "Research",
  };

  useEffect(() => {
    if (!user?.uid || campusDrivesLoaded) return;
    let cancelled = false;
    setCampusDrivesLoading(true);
    const loadCampus = async () => {
      const [drivesRes, profileSnap] = await Promise.allSettled([
        fetch("/api/placement-cell/public/drives").then(r => r.json()),
        user?.uid ? getDoc(doc(firestore, "users", user.uid)) : Promise.resolve(null),
      ]);
      if (!cancelled && drivesRes.status === "fulfilled") {
        setCampusDrives(drivesRes.value.drives || []);
        setCampusDrivesNextCursor(drivesRes.value.nextCursor || null);
      }
      if (!cancelled && profileSnap.status === "fulfilled" && profileSnap.value) {
        const snap: any = profileSnap.value;
        if (snap && snap.exists && snap.exists()) setStudentCCProfile(snap.data()?.career_compass_profile || null);
      }
      if (!cancelled) {
        setCampusDrivesLoaded(true);
        setCampusDrivesLoading(false);
      }
    };
    loadCampus().catch(() => {
      if (!cancelled) {
        setCampusDrivesLoaded(true);
        setCampusDrivesLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [campusDrivesLoaded, user?.uid]);

  const loadMoreCampusDrives = async () => {
    if (!campusDrivesNextCursor || campusDrivesLoadingMore) return;
    setCampusDrivesLoadingMore(true);
    try {
      const res = await fetch(`/api/placement-cell/public/drives?cursor=${encodeURIComponent(campusDrivesNextCursor)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load more drives");
      setCampusDrives(prev => {
        const existing = new Set(prev.map(d => d.id));
        return [...prev, ...(data.drives || []).filter((d: any) => !existing.has(d.id))];
      });
      setCampusDrivesNextCursor(data.nextCursor || null);
    } finally {
      setCampusDrivesLoadingMore(false);
    }
  };

  // Sector filter state — persisted to localStorage
  const [selectedSectors, setSelectedSectors] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem("sl_sectors") || "[]"); } catch { return []; }
  });
  const toggleSector = (id: string) => {
    setSelectedSectors((prev) => {
      const next = prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id];
      try { localStorage.setItem("sl_sectors", JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const sectorsParam = selectedSectors.length > 0 ? `?sectors=${selectedSectors.join(",")}` : "";
  const liveFeedQuery = useQuery<{ items: OpportunityCardData[] }>({
    refetchInterval: 15 * 60 * 1000,
    refetchOnWindowFocus: true,
    queryKey: ["/api/lancing/live-feed/jobs", ...selectedSectors],
    staleTime: 0,
    gcTime: 0,
    queryFn: async () => {
      const r = await fetch(`/api/lancing/live-feed/jobs${sectorsParam}`);
      if (!r.ok) return { items: [] };
      return r.json();
    },
  });
  const [searchResults, setSearchResults] = useState<OpportunityCardData[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResultTs, setSearchResultTs] = useState(0);
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [showIncompleteDialog, setShowIncompleteDialog] = useState(false);
  const [incompleteFields, setIncompleteFields] = useState<string[]>([]);
  
  // Notifications and hiring workflow
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [showContactForm, setShowContactForm] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [isSubmittingContact, setIsSubmittingContact] = useState(false);
  
  // Mobile UI state
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [mobileActiveTab, setMobileActiveTab] = useState<"home" | "tasks" | "applied" | "profile">("home");

  useEffect(() => {
    if (authLoading) return;
    
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
    if (role !== "freelancer") {
      setLocation(role === "company" ? "/lancing/company-dashboard" : "/lancing/angel-dashboard");
      return;
    }
    // Profile checks happen in background - don't block page rendering
    setIsAuthorized(true);
  }, [authLoading, dataLoaded, isAuthenticated, hasSelectedRole, role, user, setLocation]);
  
  useEffect(() => {
    if (isAuthorized && user) {
      fetchData();
    }
  }, [isAuthorized, user]);

  // Live search with AbortController — aborts stale requests, adds nonce for freshness
  const runSearch = async () => {
    const q = searchQuery.trim();
    if (!q) return;
    // Abort any previous in-flight request
    if (abortControllerRef.current) abortControllerRef.current.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;
    setIsSearching(true);
    try {
      const nonce = Date.now();
      const r = await fetch(
        `/api/lancing/search?q=${encodeURIComponent(q)}&category=jobs&_n=${nonce}`,
        { signal: controller.signal, headers: { "Cache-Control": "no-store", "Pragma": "no-cache" } }
      );
      if (controller.signal.aborted) return;
      const data = r.ok ? await r.json() : { items: [] };
      setSearchResults(data.items || []);
      setSearchResultTs(Date.now());
    } catch (err: any) {
      if (err?.name === "AbortError") return;
      setSearchResults([]);
    } finally {
      if (!controller.signal.aborted) setIsSearching(false);
    }
  };
  useEffect(() => {
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    if (!searchQuery.trim()) {
      if (abortControllerRef.current) { abortControllerRef.current.abort(); abortControllerRef.current = null; }
      setSearchResults(null);
      setSearchResultTs(0);
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    searchDebounce.current = setTimeout(() => { void runSearch(); }, 600);
    return () => { if (searchDebounce.current) clearTimeout(searchDebounce.current); };
  }, [searchQuery]);

  const fetchData = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      // Fetch profile FIRST so name appears immediately in sidebar
      const profileDoc = await getDoc(doc(firestore, "lancing_users", user.uid, "profile", "data"));
      if (profileDoc.exists()) {
        setProfile(profileDoc.data() as FreelancerProfile);
      }

      // Then fetch jobs and other data
      const jobsSnapshot = await getDocs(collection(firestore, "lancing_jobs"));
      const jobsList: Job[] = [];
      jobsSnapshot.forEach(doc => {
        jobsList.push({ id: doc.id, ...doc.data() } as Job);
      });
      setJobs(jobsList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));

      const internshipsSnapshot = await getDocs(collection(firestore, "lancing_internships"));
      const internshipsList: Internship[] = [];
      internshipsSnapshot.forEach(doc => {
        internshipsList.push({ id: doc.id, ...doc.data() } as Internship);
      });
      setInternships(internshipsList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));

      const microTasksSnapshot = await getDocs(collection(firestore, "microTasks"));
      const microTasksList: MicroTask[] = [];
      microTasksSnapshot.forEach(doc => {
        microTasksList.push({ id: doc.id, ...doc.data() } as MicroTask);
      });
      setMicroTasks(microTasksList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));

      if (user) {

        const token = await getAuthToken();
        if (!token) throw new Error("Please sign in again to load applications.");
        const applicationsResponse = await fetch("/api/lancing/my-applications", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const applicationsData = await applicationsResponse.json();
        if (!applicationsResponse.ok) {
          throw new Error(applicationsData.error || `Could not load applications (HTTP ${applicationsResponse.status}).`);
        }
        const applicationsList: Application[] = (Array.isArray(applicationsData.applications) ? applicationsData.applications : [])
          .map((application: any) => {
            const rawType = String(application.category || application.type || "").toLowerCase();
            const type: Application["type"] = rawType === "internship" || rawType === "internships"
              ? "internship"
              : rawType === "micro_task" || rawType === "microtask" || rawType === "micro_tasks"
                ? "micro_task"
                : rawType === "competition"
                  ? "competition"
                  : "job";
            return {
              ...application,
              id: application.id,
              jobId: application.jobId || application.opportunityId || application.id,
              jobTitle: application.jobTitle || application.title || "External opportunity",
              companyName: application.companyName || application.company || "External listing",
              type,
              status: application.status || "under_process",
              appliedAt: application.appliedAt || application.createdAt || "",
            } as Application;
          });
        const appliedIds = new Set<string>();
        applicationsList.forEach(application => { if (application.jobId) appliedIds.add(application.jobId); });
        setMyApplications(applicationsList.sort((a, b) => new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime()));
        setAppliedJobIds(appliedIds);
        
        // Fetch notifications
        try {
          const notifResponse = await fetch(`/api/lancing/freelancer/${user.uid}/notifications`);
          if (notifResponse.ok) {
            const notifData = await notifResponse.json();
            setNotifications(notifData.notifications || []);
          }
        } catch (notifError) {
          console.error("Error fetching notifications:", notifError);
        }
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitContact = async () => {
    if (!selectedNotification || !user || !contactEmail || !contactPhone) {
      toast({ title: "Please fill in all fields", variant: "destructive" });
      return;
    }
    
    setIsSubmittingContact(true);
    try {
      const response = await fetch(`/api/lancing/applications/${selectedNotification.applicationId}/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicantId: user.uid,
          jobId: selectedNotification.jobId,
          email: contactEmail,
          phoneNumber: contactPhone,
          type: selectedNotification.jobType
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to submit contact");
      }

      // Update notification in state
      setNotifications(prev => prev.map(n => 
        n.id === selectedNotification.id ? { ...n, contactSubmitted: true } : n
      ));
      
      // Update application in state
      setMyApplications(prev => prev.map(app => 
        app.id === selectedNotification.applicationId ? { ...app, contactSubmitted: true } : app
      ));

      setShowContactForm(false);
      setContactEmail("");
      setContactPhone("");
      toast({ title: "Contact details submitted successfully! 🎉", description: "The recruiter can now reach you." });
    } catch (error: any) {
      console.error("Error submitting contact:", error);
      toast({ title: "Failed to submit contact details", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmittingContact(false);
    }
  };

  const openContactForm = (notification: Notification) => {
    setSelectedNotification(notification);
    setContactEmail(user?.email || "");
    setContactPhone(profile?.phoneNumber || "");
    setShowContactForm(true);
  };

  // Fetch messages from API for StudentLancing messaging
  useEffect(() => {
    if (activeTab !== "messages" || !user?.uid) return;

    const fetchMessages = async () => {
      try {
        const response = await fetch(`/api/lancing/freelancer/${user.uid}/messages`, {
          headers: {
            "Authorization": `Bearer ${user.uid}`
          }
        });
        if (response.ok) {
          const data = await response.json();
          setMessages(data.messages || []);
        }
      } catch (error) {
        console.error("Error fetching messages:", error);
      }
    };

    fetchMessages();
    // Refresh messages every 5 seconds for better real-time updates
    const interval = setInterval(fetchMessages, 5000);
    return () => clearInterval(interval);
  }, [activeTab, user?.uid]);

  const handleApply = async () => {
    if (!selectedJob || !user) {
      toast({ title: "Please log in to apply", variant: "destructive" });
      return;
    }
    // T005: Placement readiness gate — fail-closed (block while loading or below threshold)
    if (readinessLoading) {
      toast({
        title: "Checking placement readiness…",
        description: "Please wait a moment and try again.",
      });
      return;
    }
    if (!canApplyToJobs) {
      toast({
        title: `Apply Now is locked (${readinessScore.total}%/${readinessScore.threshold}%)`,
        description: readinessScore.gaps[0] || "Improve your placement readiness score in the Portal first.",
        variant: "destructive",
      });
      setLocation("/lancing/freelancer-dashboard?tab=placement");
      return;
    }
    setIsApplying(true);
    try {
      const applicationType = selectedJob.applicationType === "internship" || selectedJob.applicationType === "micro_task"
        ? selectedJob.applicationType
        : "job";
      // Fetch profile directly from Firestore to ensure we have latest data
      let currentProfile = profile;
      if (!currentProfile) {
        const profileDoc = await getDoc(doc(firestore, "lancing_users", user.uid, "profile", "data"));
        if (profileDoc.exists()) {
          currentProfile = profileDoc.data() as FreelancerProfile;
          setProfile(currentProfile);
        }
      }
      
      // Validate required profile fields (fullName, phoneNumber, skills≥1, aboutMe)
      const missingFields: string[] = [];
      if (!currentProfile?.fullName) missingFields.push("Full Name");
      if (!currentProfile?.phoneNumber) missingFields.push("Phone Number");
      if (!currentProfile?.skills?.length) missingFields.push("Skills (at least 1)");
      if (!currentProfile?.aboutMe) missingFields.push("About Me");
      
      if (missingFields.length > 0 || !currentProfile) {
        toast({ 
          title: "Profile incomplete", 
          description: `Please add: ${missingFields.join(", ")}`,
          variant: "destructive" 
        });
        setIsApplying(false);
        return;
      }

      // Apply counter gate (after profile validation so we don't burn a free apply)
      try {
        await applyCounter.consume.mutateAsync("general");
      } catch (e: any) {
        if (e?.code === 402) {
          setIsApplying(false);
          setSelectedJob(null);
          setShowApplyGate(true);
          return;
        }
        throw e;
      }

      // Use backend API to save application (bypasses Firestore permissions)
      const idToken = await getAuthToken();
      if (!idToken) throw new Error("Please sign in again to apply.");
      const response = await fetch("/api/lancing/apply", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          jobId: selectedJob.id,
          jobTitle: selectedJob.title,
          companyName: selectedJob.companyName,
          companyLogo: selectedJob.companyLogo,
          applicantId: user.uid,
          applicantName: currentProfile.fullName,
          applicantEmail: user.email || "",
          applicantProfileImage: currentProfile.profileImageUrl || "",
          applicantSkills: currentProfile.skills || [],
          message: applyMessage,
          type: applicationType,
          ...(selectedJob.sourceCollection === "opportunities" ? { sourceCollection: "opportunities" } : {}),
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        if (errorData.alreadyApplied) {
          // Add to applied list if not already there
          setAppliedJobIds(prev => new Set([...Array.from(prev), selectedJob.id]));
          toast({ title: "Already Applied", description: "You have already applied to this opportunity.", variant: "destructive" });
          setSelectedJob(null);
          setIsApplying(false);
          return;
        }
        throw new Error(errorData.error || "Failed to submit application");
      }
      
      const result = await response.json();
      setMyApplications(prev => [{ 
        id: result.applicationId,
        jobId: selectedJob.id,
        jobTitle: selectedJob.title,
        companyName: selectedJob.companyName,
        companyLogo: selectedJob.companyLogo,
        type: applicationType,
        status: "under_process",
        appliedAt: result.appliedAt,
        message: applyMessage
      }, ...prev]);
      setAppliedJobIds(prev => new Set([...Array.from(prev), selectedJob.id]));

      toast({ title: "Application submitted successfully! 🎉" });
      setSelectedJob(null);
    } catch (error: any) {
      toast({ title: "Failed to apply", description: error.message, variant: "destructive" });
    } finally {
      setIsApplying(false);
    }
  };

  const openExternalForApply = (item: OpportunityCardData, type: ExternalApplicationType) => {
    const url = openExternalOpportunity(item);
    if (!url) {
      toast({ title: "Could not open listing", description: "This opportunity has no valid external URL, or the browser blocked the new tab.", variant: "destructive" });
      return;
    }
    setExternalItem({ item, url, type });
  };

  const markExternalApplied = async () => {
    if (!externalItem || !user) return;
    setIsMarkingExternalApplied(true);
    try {
      const applicationId = await recordExternalApplication(
        externalItem.item,
        externalItem.type,
        externalItem.url,
      );
      const application: Application = {
        id: applicationId,
        jobId: externalItem.item.id || applicationId,
        jobTitle: externalItem.item.title,
        companyName: externalItem.item.company,
        type: externalItem.type,
        status: "under_process",
        appliedAt: new Date().toISOString(),
      };
      setMyApplications(prev => [application, ...prev]);
      if (externalItem.item.id) setAppliedJobIds(prev => new Set(prev).add(externalItem.item.id!));
      toast({ title: "Marked as applied" });
      setExternalItem(null);
    } catch (error: any) {
      toast({ title: "Could not save application", description: error?.message, variant: "destructive" });
    } finally {
      setIsMarkingExternalApplied(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      toast({ title: "Logged out successfully" });
      setLocation("/lancing/login");
    } catch (error) {
      toast({ title: "Logout failed", variant: "destructive" });
    }
  };

  const filteredJobs = searchQuery.trim() ? fuzzySearch(jobs, searchQuery) : jobs;

  // Wait for profile to load before showing dashboard — render a small loader
  // instead of `null` so we don't flash a blank screen while the auth state resolves.
  if (!isAuthorized) {
    return (
      <div className="min-h-screen sl-bg-atmosphere flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-sky-600" />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen sl-bg-atmosphere sl-grain-overlay flex items-center justify-center">
        <div className="text-center sl-slide-up">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center shadow-xl">
            <Briefcase className="w-8 h-8 text-white" />
          </div>
          <Loader2 className="w-6 h-6 animate-spin text-sky-600 mx-auto" />
        </div>
      </div>
    );
  }

  const acceptedApplications = myApplications.filter(a => a.status === "accepted").length;
  
  const statCards = [
    { label: "Opportunities Available", value: jobs.length + internships.length, icon: Briefcase, color: "from-sky-500 to-blue-600", accent: "#10b981" },
    { label: "Applications Sent", value: myApplications.length, icon: Send, color: "from-blue-500 to-cyan-600", accent: "#0891b2" },
    { label: "Interviews Lined Up", value: acceptedApplications, icon: Target, color: "from-violet-500 to-purple-600", accent: "#7c3aed" },
    { label: "Earnings This Month", value: "₹0", icon: IndianRupee, color: "from-amber-500 to-orange-600", accent: "#d97706" }
  ];

  return (
    <div className="min-h-screen sl-bg-atmosphere sl-grain-overlay">
      <SEOHead title="Freelancer Dashboard - StudentLancing" description="Find and apply to freelance jobs" />

      {/* Firebase Timeout Retry */}
      {loadError && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-red-50 border-b-2 border-red-500 p-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
              <p className="text-sm font-bold text-red-700">Connection timeout. Firebase is taking longer than expected.</p>
            </div>
            <Button
              onClick={retryLoad}
              size="sm"
              className="bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold"
            >
              Retry
            </Button>
          </div>
        </div>
      )}

      <div className="flex">
        {/* Sidebar — flex column so the nav scrolls and the logout stays pinned */}
        <aside className="w-60 bg-slate-900 border-r border-slate-800 hidden lg:flex flex-col fixed left-0 top-0 h-screen">
          {/* Scrollable section */}
          <div className="flex-1 overflow-y-auto px-3 py-4">
            {/* Back Button */}
            <Link href="/">
              <button
                className="flex items-center gap-2 px-2.5 py-1.5 mb-3 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all"
                data-testid="button-back-home"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span className="text-xs font-medium">Back to Home</span>
              </button>
            </Link>

            {/* Brand */}
            <Link href="/student-lancing" className="flex items-center gap-2 mb-5 group">
              <div className="w-9 h-9 bg-gradient-to-br from-sky-500 to-blue-600 rounded-lg flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all">
                <Briefcase className="w-4 h-4 text-white" />
              </div>
              <span className="text-base font-bold tracking-tight text-white">
                Student<span className="text-sky-400">Lancing</span>
              </span>
            </Link>

            {/* Profile Card */}
            <Link href="/lancing/profile">
              <button className="w-full mb-5 p-3 bg-gradient-to-br from-sky-950 to-slate-900 rounded-xl border border-sky-900 shadow-lg hover:shadow-xl hover:border-sky-700 transition-all group cursor-pointer">
                <Avatar className="w-12 h-12 mx-auto mb-2 border-2 border-sky-500 shadow-md group-hover:scale-105 transition-transform">
                  <AvatarImage src={profile?.profileImageUrl} />
                  <AvatarFallback className="bg-gradient-to-br from-sky-500 to-blue-600 text-white text-base font-bold">
                    {profile?.fullName?.[0] || "F"}
                  </AvatarFallback>
                </Avatar>
                <p className="text-center font-bold text-white text-sm group-hover:text-sky-300 transition-colors">
                  {profile?.fullName || "Freelancer"}
                </p>
                {isCareerPremium && (
                  <div className="flex justify-center mt-1.5">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 text-amber-950 text-[10px] font-bold shadow">
                      <Crown className="w-3 h-3" />
                      Premium Community Member
                    </span>
                  </div>
                )}
                <p className="text-center text-[10px] text-sky-400 font-semibold mt-1">
                  Click to edit profile
                </p>
              </button>
            </Link>

            {/* Navigation */}
            <nav className="space-y-1">
              {[
                { id: "jobs", label: "Browse Jobs", icon: Briefcase, count: jobs.length, link: null },
                { id: "internships", label: "Internships", icon: Target, count: internships.length, link: null },
                { id: "competitions", label: "Competitions", icon: Trophy, count: competitions.length || undefined, link: null },
                { id: "ai-match", label: "AI Match", icon: Sparkles, link: "/lancing/ai-match" },
                { id: "career-compass", label: "Career Compass", icon: Map, link: "/lancing/career-compass" },
                { id: "sure-shot", label: "Sure Shot Jobs", icon: Shield, link: "/lancing/sure-shot" },
                { id: "campus-drives", label: "Campus Drives", icon: GraduationCap, link: "/lancing/campus-drives" },
                { id: "campus-applications", label: "Drive Applications", icon: CalendarCheck, link: "/lancing/my-applications" },
                { id: "messages", label: "Messages", icon: MessageSquare, link: null },
                { id: "how-to-earn", label: "How to Earn", icon: HelpCircle, link: null },
                ...(user?.email?.toLowerCase() === PLATFORM_ADMIN_EMAIL ? [{ id: "admin", label: "Admin Dashboard", icon: Shield, link: "/admin-lancing" }] : [])
              ].map(item => (
                item.link ? (
                  <Link key={item.id} href={item.link}>
                    <button
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-slate-300 hover:bg-slate-800 hover:text-white"
                    >
                      <item.icon className="w-4 h-4 flex-shrink-0" />
                      <span className="flex-1 text-left">{item.label}</span>
                    </button>
                  </Link>
                ) : (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id as "jobs" | "micro-tasks" | "internships" | "competitions" | "applications" | "messages" | "how-to-earn")}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                      activeTab === item.id
                        ? "bg-sky-600 text-white shadow-md shadow-sky-600/30"
                        : "text-slate-300 hover:bg-slate-800 hover:text-white"
                    }`}
                  >
                    <item.icon className="w-4 h-4 flex-shrink-0" />
                    <span className="flex-1 text-left">{item.label}</span>
                    {item.count ? (
                      <span className="text-[10px] font-bold bg-sky-500 text-white px-1.5 py-0.5 rounded-full">
                        {item.count}
                      </span>
                    ) : null}
                  </button>
                )
              ))}
            </nav>
          </div>

          {/* Pinned Logout */}
          <div className="px-3 py-3 border-t border-slate-800 bg-slate-900">
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm text-red-400 hover:bg-red-950/30 transition-colors font-semibold border border-red-900/30"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className={`flex-1 lg:ml-60 p-6 lg:p-8 ${loadError ? "pt-24" : ""} max-lg:pt-14 max-lg:pb-14`}>
          {/* Mobile Header - Sticky Top Bar */}
          <div className="lg:hidden sl-mobile-header" data-testid="mobile-header">
            <button 
              className="sl-mobile-header-btn" 
              onClick={() => setMobileDrawerOpen(true)}
              data-testid="button-mobile-menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="sl-mobile-header-logo">
              <div className="sl-mobile-header-logo-icon">
                <Briefcase className="w-4 h-4 text-white" />
              </div>
              <span className="sl-mobile-header-logo-text">Student<span>Lancing</span></span>
            </div>
            <button className="sl-mobile-header-btn" data-testid="button-mobile-notifications">
              <Bell className="w-5 h-5" />
            </button>
          </div>

          {/* Mobile Drawer Overlay */}
          <div 
            className={`lg:hidden sl-mobile-drawer-overlay ${mobileDrawerOpen ? 'open' : ''}`}
            onClick={() => setMobileDrawerOpen(false)}
          />

          {/* Mobile Drawer */}
          <div className={`lg:hidden sl-mobile-drawer ${mobileDrawerOpen ? 'open' : ''}`} data-testid="mobile-drawer">
            <div className="sl-mobile-drawer-header">
              <div className="sl-mobile-drawer-profile" onClick={() => { setMobileDrawerOpen(false); setLocation("/lancing/profile"); }}>
                <div className="sl-mobile-drawer-avatar">
                  {profile?.profileImageUrl ? (
                    <img src={profile.profileImageUrl} alt={profile?.fullName || "Profile"} />
                  ) : (
                    profile?.fullName?.[0] || "F"
                  )}
                </div>
                <div className="sl-mobile-drawer-name">{profile?.fullName || "Freelancer"}</div>
              </div>
            </div>
            
            <nav className="sl-mobile-drawer-nav">
              {[
                { id: "jobs", label: "Browse Jobs", icon: Briefcase },
                { id: "internships", label: "Internships", icon: Target },
                { id: "competitions", label: "Competitions", icon: Trophy },
                { id: "ai-match", label: "AI Match", icon: Sparkles, link: "/lancing/ai-match" },
                { id: "career-compass", label: "Career Compass", icon: Map, link: "/lancing/career-compass" },
                { id: "sure-shot", label: "Sure Shot Jobs", icon: Shield, link: "/lancing/sure-shot" },
                { id: "campus-drives", label: "Campus Drives", icon: GraduationCap, link: "/lancing/campus-drives" },
                { id: "campus-applications", label: "Drive Applications", icon: CalendarCheck, link: "/lancing/my-applications" },
                { id: "messages", label: "Messages", icon: MessageSquare },
                { id: "how-to-earn", label: "How to Earn", icon: HelpCircle },
                ...(user?.email?.toLowerCase() === PLATFORM_ADMIN_EMAIL ? [{ id: "admin", label: "Admin Dashboard", icon: Shield, link: "/admin-lancing" }] : []),
                { id: "back-home", label: "Back to StudentXchange", icon: ArrowLeft, link: "/" }
              ].map(item => (
                item.link ? (
                  <Link key={item.id} href={item.link}>
                    <button 
                      className="sl-mobile-drawer-item"
                      onClick={() => setMobileDrawerOpen(false)}
                      data-testid={`drawer-${item.id}`}
                    >
                      <item.icon className="w-5 h-5" />
                      {item.label}
                    </button>
                  </Link>
                ) : (
                  <button
                    key={item.id}
                    className={`sl-mobile-drawer-item ${activeTab === item.id ? 'active' : ''}`}
                    onClick={() => { 
                      setActiveTab(item.id as "jobs" | "micro-tasks" | "internships" | "competitions" | "applications" | "messages" | "how-to-earn"); 
                      setMobileDrawerOpen(false); 
                    }}
                    data-testid={`drawer-${item.id}`}
                  >
                    <item.icon className="w-5 h-5" />
                    {item.label}
                  </button>
                )
              ))}
            </nav>
            
            <div className="sl-mobile-drawer-footer">
              <button 
                className="sl-mobile-drawer-logout"
                onClick={() => { setMobileDrawerOpen(false); handleLogout(); }}
                data-testid="drawer-logout"
              >
                <LogOut className="w-5 h-5" />
                Logout
              </button>
            </div>
          </div>

          {activeTab === "jobs" && (
            <div className="space-y-6 sl-fade-in">
              {!profileComplete && (
                <div className="p-4 bg-red-50 border-l-4 border-red-500 rounded-lg">
                  <p className="text-sm font-bold text-red-700 mb-2">⚠️ Profile Incomplete - Missing:</p>
                  <div className="flex flex-wrap gap-2">
                    {!profile?.fullName && <span className="text-xs bg-red-200 text-red-800 px-2 py-1 rounded">Full Name</span>}
                    {!profile?.phoneNumber && <span className="text-xs bg-red-200 text-red-800 px-2 py-1 rounded">Phone Number</span>}
                    {!profile?.skills?.length && <span className="text-xs bg-red-200 text-red-800 px-2 py-1 rounded">Skills (≥1)</span>}
                    {!profile?.aboutMe && <span className="text-xs bg-red-200 text-red-800 px-2 py-1 rounded">About Me</span>}
                  </div>
                  <Link href="/lancing/profile" className="text-xs text-red-700 font-bold hover:underline inline-block mt-2">
                    Complete Profile →
                  </Link>
                </div>
              )}
              <UnifiedMatchFeed
                category="job"
                userId={user?.uid}
                appliedIds={appliedJobIds}
                onInternalApply={(rec, t) => setSelectedJob({ ...rec, applicationType: t } as any)}
                onShowApplyGate={() => setShowApplyGate(true)}
                title="Browse Jobs"
                subtitle="One combined feed — admin-posted jobs and AI-matched freelance projects from across the web."
                searchPlaceholder="Search jobs, skills, companies…"
                accent="sky"
              />
            </div>
          )}
          {false && activeTab === "jobs" && (
            <div className="space-y-8 sl-fade-in">
              {/* Mobile Content Wrapper */}
              <div className="lg:hidden sl-mobile-content">
                {/* Mobile Greeting Card — hidden when searching to keep results in focus */}
                {!searchQuery.trim() && (
                  <div className="sl-mobile-greeting-card" data-testid="mobile-greeting-card">
                    <h2 className="sl-mobile-greeting">Hi {profile?.fullName?.split(' ')[0] || 'there'}</h2>
                    <p className="sl-mobile-subtext">Find your next opportunity</p>
                  </div>
                )}

                {/* Mobile Search Bar */}
                <div className="px-1 mb-4 space-y-2" data-testid="mobile-search">
                  <div className="relative flex items-center gap-2">
                    <div className="relative flex-1">
                      {isSearching ? (
                        <Loader2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-sky-500 animate-spin" />
                      ) : (
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      )}
                      <Input
                        placeholder="Search jobs, skills, companies..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-11 pr-10 h-12 rounded-xl border-2 border-slate-200 focus:border-sky-500 bg-white text-sm font-medium shadow-sm w-full"
                        data-testid="input-mobile-search"
                      />
                      {searchQuery && (
                        <button
                          onClick={() => setSearchQuery("")}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-base leading-none"
                          aria-label="Clear search"
                          data-testid="button-mobile-search-clear"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        if (searchQuery.trim()) void runSearch();
                        else { void liveFeedQuery.refetch(); void fetchData(); }
                      }}
                      disabled={isSearching || liveFeedQuery.isFetching}
                      title={searchQuery.trim() ? "Refresh AI results" : "Refresh all — live feed + local listings"}
                      className="shrink-0 h-12 w-12 rounded-xl border-2 border-slate-200 bg-white hover:border-sky-400 hover:bg-sky-50 flex items-center justify-center text-slate-600 hover:text-sky-700 disabled:opacity-50"
                      data-testid="button-mobile-refresh-search"
                    >
                      <RefreshCw className={`w-4 h-4 ${isSearching || liveFeedQuery.isFetching ? "animate-spin" : ""}`} />
                    </button>
                  </div>
                  <RotatingSearchMessage active={isSearching} />
                  <div className="flex items-center justify-between gap-2 mt-2">
                    <TrendingChips visible={!searchQuery.trim()} onPick={(q) => setSearchQuery(q)} />
                    {!searchQuery.trim() && (
                      <LastUpdatedBadge timestamp={liveFeedQuery.dataUpdatedAt} isFetching={liveFeedQuery.isFetching} />
                    )}
                  </div>
                  {!searchQuery.trim() && (
                    <div className="mt-2">
                      <SectorChips selectedSectors={selectedSectors} onToggle={toggleSector} />
                    </div>
                  )}
                </div>

                {/* Mobile Category Cards — hidden when searching */}
                {!searchQuery.trim() && (
                  <div className="sl-mobile-categories" data-testid="mobile-categories">
                    <h3 className="sl-mobile-categories-title">Quick Categories</h3>
                    <Link href="/lancing/internships">
                      <div className="sl-mobile-category-card" data-testid="card-internships">
                        <div className="sl-mobile-category-icon blue">
                          <Target className="w-5 h-5" />
                        </div>
                        <div className="sl-mobile-category-info">
                          <div className="sl-mobile-category-name">Internships</div>
                          <div className="sl-mobile-category-range">Build your career</div>
                        </div>
                        <ChevronRight className="sl-mobile-category-arrow w-5 h-5" />
                      </div>
                    </Link>
                  </div>
                )}
              </div>

              {/* Desktop Hero Section */}
              <div className="hidden lg:block space-y-6">
                <div className="space-y-2">
                  <h1 className="text-4xl lg:text-5xl font-black tracking-tight" >
                    <span className="text-slate-900">Your Next</span>
                    <br />
                    <span className="bg-gradient-to-r from-sky-600 to-blue-500 bg-clip-text text-transparent">Opportunity Awaits</span>
                  </h1>
                  <p className="text-lg text-slate-600 max-w-2xl" >
                    Browse premium freelance projects. Build your portfolio. Level up your student hustle.
                  </p>
                </div>

                {/* Search Bar */}
                <div className="max-w-2xl space-y-2">
                  <div className="relative group flex items-center gap-2">
                    <div className="relative flex-1">
                      {isSearching ? (
                        <Loader2 className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-sky-500 animate-spin" />
                      ) : (
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-sky-600 transition-colors" />
                      )}
                      <Input
                        placeholder="Search anything — react, marketing, content writing, video editing..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-14 pr-12 h-14 rounded-xl border-2 border-slate-200 focus:border-sky-500 bg-white text-base font-medium shadow-sm hover:shadow-md transition-shadow"
                      />
                      {searchQuery && (
                        <button onClick={() => setSearchQuery("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-lg leading-none">✕</button>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        if (searchQuery.trim()) void runSearch();
                        else { void liveFeedQuery.refetch(); void fetchData(); }
                      }}
                      disabled={isSearching || liveFeedQuery.isFetching}
                      title={searchQuery.trim() ? "Refresh — fetch fresh AI results" : "Refresh all — live feed + local listings"}
                      className="shrink-0 h-14 w-14 rounded-xl border-2 border-slate-200 bg-white hover:border-sky-400 hover:bg-sky-50 flex items-center justify-center text-slate-600 hover:text-sky-700 transition-colors disabled:opacity-50"
                      data-testid="button-refresh-search"
                    >
                      <RefreshCw className={`w-5 h-5 ${isSearching || liveFeedQuery.isFetching ? "animate-spin" : ""}`} />
                    </button>
                  </div>
                  <RotatingSearchMessage active={isSearching} />
                  <div className="flex items-center justify-between gap-2 mt-2">
                    <TrendingChips visible={!searchQuery.trim()} onPick={(q) => setSearchQuery(q)} />
                    {!searchQuery.trim() && (
                      <LastUpdatedBadge timestamp={liveFeedQuery.dataUpdatedAt} isFetching={liveFeedQuery.isFetching} />
                    )}
                  </div>
                  {!searchQuery.trim() && (
                    <div className="mt-3">
                      <p className="text-xs text-slate-500 font-medium mb-2">Filter by sector</p>
                      <SectorChips selectedSectors={selectedSectors} onToggle={toggleSector} />
                    </div>
                  )}
                </div>
              </div>

              {/* Jobs List */}
              <div className="space-y-4">
                {!searchQuery.trim() && (
                <div className="flex items-baseline gap-4 flex-wrap">
                  <h2 className="text-2xl lg:text-3xl font-black text-slate-900">
                    Live Opportunities
                  </h2>
                  {filteredJobs.length > 0 && (
                    <span className="text-sm font-bold text-sky-600 px-3 py-1.5 bg-sky-50 rounded-full">
                      {filteredJobs.length} available
                    </span>
                  )}
                  <ApplyCounterBadge />
                </div>
                )}

                {!profileComplete && (
                  <div className="p-4 bg-red-50 border-l-4 border-red-500 rounded-lg mb-4">
                    <p className="text-sm font-bold text-red-700 mb-2">⚠️ Profile Incomplete - Missing:</p>
                    <div className="flex flex-wrap gap-2">
                      {!profile?.fullName && <span className="text-xs bg-red-200 text-red-800 px-2 py-1 rounded">Full Name</span>}
                      {!profile?.phoneNumber && <span className="text-xs bg-red-200 text-red-800 px-2 py-1 rounded">Phone Number</span>}
                      {!profile?.skills?.length && <span className="text-xs bg-red-200 text-red-800 px-2 py-1 rounded">Skills (≥1)</span>}
                      {!profile?.aboutMe && <span className="text-xs bg-red-200 text-red-800 px-2 py-1 rounded">About Me</span>}
                    </div>
                    <Link href="/lancing/profile" className="text-xs text-red-700 font-bold hover:underline inline-block mt-2">
                      Complete Profile →
                    </Link>
                  </div>
                )}
                {!searchQuery.trim() && filteredJobs.length === 0 && (liveFeedQuery.data?.items?.length || 0) === 0 ? (
                  <>
                    {/* Mobile Empty State */}
                    <div className="lg:hidden sl-mobile-empty-state" data-testid="mobile-empty-state">
                      <div className="sl-mobile-empty-icon">
                        <TrendingUp className="w-7 h-7" />
                      </div>
                      <h3 className="sl-mobile-empty-title">New Opportunities Daily</h3>
                      <p className="sl-mobile-empty-text">
                        Fresh projects are posted every day. Get ready to land your next gig!
                      </p>
                      <div className="sl-mobile-checklist">
                        <div className="sl-mobile-checklist-item">
                          <CheckCircle2 className={`w-4 h-4 ${profile?.fullName ? 'text-green-500' : 'text-slate-300'}`} />
                          <span>Complete your profile</span>
                        </div>
                        <div className="sl-mobile-checklist-item">
                          <CheckCircle2 className={`w-4 h-4 ${profile?.skills?.length ? 'text-green-500' : 'text-slate-300'}`} />
                          <span>Add your skills</span>
                        </div>
                        <div className="sl-mobile-checklist-item">
                          <CheckCircle2 className="w-4 h-4 text-slate-300" />
                          <span>Enable notifications</span>
                        </div>
                      </div>
                      <Link href="/lancing/profile">
                        <button className="sl-mobile-empty-btn" data-testid="button-complete-profile">
                          <User className="w-4 h-4" />
                          Complete Profile
                        </button>
                      </Link>
                    </div>

                    {/* Desktop Empty State */}
                    <Card className="hidden lg:block rounded-3xl border-0 shadow-xl py-20 bg-gradient-to-br from-slate-50 to-white overflow-hidden">
                      <CardContent className="text-center space-y-6">
                        <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-emerald-100 to-green-50 flex items-center justify-center mx-auto shadow-lg">
                          <Zap className="w-12 h-12 text-sky-600" />
                        </div>
                        <div className="space-y-2">
                          <h3 className="text-2xl font-black text-slate-900" >
                            No Opportunities Yet
                          </h3>
                          <p className="text-slate-600 max-w-sm mx-auto" >
                            New projects are posted daily. Check back soon or refine your search. Your perfect match is coming!
                          </p>
                        </div>
                        <div className="flex gap-3 justify-center pt-4">
                          <Button className="bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-bold" >
                            <Briefcase className="w-4 h-4 mr-2" />
                            View All Jobs
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </>
                ) : null}
                {!searchQuery.trim() && filteredJobs.length > 0 && (
                  <div className="grid gap-4">
                    {filteredJobs.map((job, index) => (
                      <Card 
                        key={job.id} 
                        className={`rounded-2xl border-2 bg-white transition-all duration-300 group shadow-md sl-scale-in ${
                          profileComplete
                            ? "border-slate-200 hover:border-sky-500 hover:shadow-xl"
                            : "border-red-200 hover:border-red-300"
                        }`}
                        style={{ animationDelay: `${index * 0.05}s` }}
                      >
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between gap-6">
                            <div className="flex-1">
                              <div className="flex items-center gap-4 mb-4">
                                <Avatar className="w-12 h-12 rounded-xl border-2 border-slate-200 shadow-md">
                                  <AvatarImage src={job.companyLogo} />
                                  <AvatarFallback className="bg-gradient-to-br from-teal-500 to-cyan-600 text-white font-bold rounded-xl">
                                    {job.companyName?.[0] || "C"}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <h3 className="font-black text-lg text-slate-900 group-hover:text-sky-700 transition-colors" >
                                    {job.title}
                                  </h3>
                                  <p className="text-sm text-slate-500 font-semibold" >{job.companyName}</p>
                                </div>
                              </div>
                              
                              <p className="text-slate-700 mb-4 line-clamp-2 font-medium" >{job.description}</p>
                              
                              <div className="flex flex-wrap gap-2 mb-5">
                                {job.skills.slice(0, 4).map(skill => (
                                  <Badge key={skill} className="px-3.5 py-1.5 bg-sky-100 text-sky-700 font-bold rounded-lg border-0" >
                                    {skill}
                                  </Badge>
                                ))}
                                {job.skills.length > 4 && (
                                  <Badge variant="secondary" className="px-3.5 py-1.5 rounded-lg font-bold">+{job.skills.length - 4} more</Badge>
                                )}
                              </div>

                              <div className="flex flex-wrap gap-5 text-sm font-bold" >
                                <span className="flex items-center gap-2 text-sky-700 bg-sky-50 px-3.5 py-1.5 rounded-lg">
                                  <IndianRupee className="w-4 h-4" />
                                  ₹{job.budget}
                                </span>
                                <span className="flex items-center gap-2 text-slate-700 bg-slate-100 px-3.5 py-1.5 rounded-lg">
                                  <Clock className="w-4 h-4" />
                                  {job.duration}
                                </span>
                                <span className="flex items-center gap-2 text-slate-700 bg-slate-100 px-3.5 py-1.5 rounded-lg">
                                  <MapPin className="w-4 h-4" />
                                  {job.mode}
                                </span>
                              </div>
                            </div>

                            {appliedJobIds.has(job.id) ? (
                              <Badge className="h-14 px-8 bg-slate-100 text-slate-600 rounded-xl font-bold flex items-center" >
                                ✓ Applied
                              </Badge>
                            ) : (
                              <Button
                                onClick={() => setSelectedJob(job)}
                                className="h-14 px-8 bg-gradient-to-r from-sky-600 to-blue-500 hover:from-sky-700 hover:to-blue-600 rounded-xl font-black shadow-xl shadow-sky-500/25 hover:shadow-sky-500/40 transition-all whitespace-nowrap flex-shrink-0"
                                
                              >
                                Apply Now
                                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}

                {/* Live Web Feed — shows AI search results when query typed, curated feed when empty */}
                {(() => {
                  const displayItems = searchQuery.trim()
                    ? (searchResults ?? [])
                    : (liveFeedQuery.data?.items ?? []);
                  const isLoadingFeed = searchQuery.trim() ? isSearching : liveFeedQuery.isLoading;

                  const handleLiveApply = (it: OpportunityCardData) => {
                    const itemType = it.type?.toLowerCase();
                    const type: ExternalApplicationType = itemType === "internship" ? "internship" : itemType === "microtask" || itemType === "micro_task" ? "micro_task" : itemType === "competition" ? "competition" : "job";
                    openExternalForApply(it, type);
                  };

                  return (
                    <div className="mt-8 space-y-3">
                      <div className="flex items-baseline gap-3 flex-wrap">
                        <h2 className="text-lg lg:text-xl font-black text-slate-900 flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-amber-500" />
                          {searchQuery.trim() ? `AI results for "${searchQuery}"` : "More opportunities from across the web"}
                        </h2>
                        {searchQuery.trim() && <CacheBadge cachedAt={searchResultTs} />}
                        <ApplyCounterBadge />
                      </div>
                      {isLoadingFeed ? (
                        <SearchSkeletonGrid />
                      ) : displayItems.length === 0 && searchQuery.trim() ? (
                        <p className="text-sm text-slate-500 py-4">No results found for "{searchQuery}" — try different keywords.</p>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                          {displayItems.map((item, i) => (
                            <OpportunityCard key={`live-${i}`} data={item} onApply={handleLiveApply} userId={user?.uid} alreadyApplied={Boolean(item.id && appliedJobIds.has(item.id))} />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Smart Sections — derived from live feed data */}
                {!searchQuery.trim() && (liveFeedQuery.data?.items?.length ?? 0) > 0 && (
                  <SmartSections
                    items={liveFeedQuery.data?.items ?? []}
                    appliedIds={appliedJobIds}
                    onApply={(it) => {
                      const itemType = it.type?.toLowerCase();
                      const type: ExternalApplicationType = itemType === "internship" ? "internship" : itemType === "microtask" || itemType === "micro_task" ? "micro_task" : itemType === "competition" ? "competition" : "job";
                      openExternalForApply(it, type);
                    }}
                  />
                )}
              </div>
            </div>
          )}

          {/* Internships Tab — unified combined feed */}
          {activeTab === "internships" && (
            <UnifiedMatchFeed
              category="internship"
              userId={user?.uid}
              appliedIds={appliedJobIds}
              onInternalApply={(rec, t) => setSelectedJob({ ...rec, applicationType: t } as any)}
              onShowApplyGate={() => setShowApplyGate(true)}
              title="Internships For Students"
              subtitle="One combined feed — paid internships from StudentLancing companies and AI-matched picks from across the web."
              searchPlaceholder="Search internships, companies, domains…"
              accent="blue"
            />
          )}
          {false && activeTab === "internships" && (
            <div className="sl-fade-in space-y-6">
              <div className="space-y-1">
                <h1 className="text-3xl lg:text-4xl font-black tracking-tight">
                  <span className="text-slate-900">Internships</span>{" "}
                  <span className="bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">For Students</span>
                </h1>
                <p className="text-slate-600">Paid internships posted by companies & recruiters on StudentLancing.</p>
              </div>
              {internships.length === 0 ? (
                <Card className="rounded-3xl border-0 shadow-xl py-16 bg-gradient-to-br from-blue-50 to-white">
                  <CardContent className="text-center space-y-4">
                    <Target className="w-14 h-14 mx-auto text-blue-300" />
                    <div>
                      <h3 className="text-xl font-black text-slate-900 mb-1">No internships posted yet</h3>
                      <p className="text-slate-500 text-sm max-w-sm mx-auto">Check back soon — new internships are posted regularly by companies.</p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {internships.map((internship: any, index) => (
                    <Card key={internship.id} className="rounded-2xl border-2 border-slate-200 hover:border-blue-500 hover:shadow-xl bg-white transition-all sl-scale-in" style={{ animationDelay: `${index * 0.05}s` }}>
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between gap-6 flex-wrap">
                          <div className="flex-1 min-w-[260px]">
                            <div className="flex items-center gap-3 mb-3">
                              <Avatar className="w-11 h-11 rounded-xl border-2 border-slate-200">
                                <AvatarImage src={internship.companyLogo} />
                                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-cyan-600 text-white font-bold rounded-xl">
                                  {internship.companyName?.[0] || "C"}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <h3 className="font-black text-lg text-slate-900">{internship.title}</h3>
                                <p className="text-sm text-slate-500 font-semibold">{internship.companyName}</p>
                              </div>
                            </div>
                            {internship.description && <p className="text-slate-700 mb-3 line-clamp-2 font-medium">{internship.description}</p>}
                            <div className="flex flex-wrap gap-2 mb-3">
                              {(internship.skills || []).slice(0, 4).map((skill: string) => (
                                <Badge key={skill} className="px-3 py-1 bg-blue-100 text-blue-700 font-bold rounded-lg border-0">{skill}</Badge>
                              ))}
                            </div>
                            <div className="flex flex-wrap gap-3 text-sm font-bold">
                              {internship.stipend && (
                                <span className="flex items-center gap-1.5 text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg">
                                  <IndianRupee className="w-4 h-4" />₹{internship.stipend}/mo
                                </span>
                              )}
                              {internship.duration && (
                                <span className="flex items-center gap-1.5 text-slate-700 bg-slate-100 px-3 py-1.5 rounded-lg">
                                  <Clock className="w-4 h-4" />{internship.duration}
                                </span>
                              )}
                              {internship.mode && (
                                <span className="flex items-center gap-1.5 text-slate-700 bg-slate-100 px-3 py-1.5 rounded-lg">
                                  <MapPin className="w-4 h-4" />{internship.mode}
                                </span>
                              )}
                            </div>
                          </div>
                          {appliedJobIds.has(internship.id) ? (
                            <Badge className="h-12 px-6 bg-slate-100 text-slate-600 rounded-xl font-bold flex items-center">✓ Applied</Badge>
                          ) : (
                            <Button onClick={() => setSelectedJob({ ...internship, applicationType: "internship" } as any)} className="h-12 px-6 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 rounded-xl font-black shadow-lg">
                              Apply Now <ArrowRight className="w-4 h-4 ml-2" />
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Micro Tasks Tab — unified combined feed */}
          {false && activeTab === "micro-tasks" && (
            <UnifiedMatchFeed
              category="microtask"
              userId={user?.uid}
              appliedIds={appliedJobIds}
              onInternalApply={(rec, t) => setSelectedJob({ ...rec, applicationType: t } as any)}
              onShowApplyGate={() => setShowApplyGate(true)}
              title="Micro Tasks"
              subtitle="One combined feed — quick paid gigs from StudentLancing and AI-matched micro tasks from across the web."
              searchPlaceholder="Search micro tasks, skills, payment…"
              accent="purple"
            />
          )}
          {false && activeTab === "micro-tasks" && (
            <div className="sl-fade-in space-y-6">
              <div className="space-y-1">
                <h1 className="text-3xl lg:text-4xl font-black tracking-tight">
                  <span className="text-slate-900">Micro</span>{" "}
                  <span className="bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent">Tasks</span>
                </h1>
                <p className="text-slate-600">Quick paid gigs you can finish in a few hours or days.</p>
              </div>
              {microTasks.length === 0 ? (
                <Card className="rounded-3xl border-0 shadow-xl py-16 bg-gradient-to-br from-purple-50 to-white">
                  <CardContent className="text-center space-y-4">
                    <Zap className="w-14 h-14 mx-auto text-purple-300" />
                    <div>
                      <h3 className="text-xl font-black text-slate-900 mb-1">No micro tasks posted yet</h3>
                      <p className="text-slate-500 text-sm max-w-sm mx-auto">Check back soon — new micro tasks are posted regularly by companies.</p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {microTasks.map((task: any, index) => (
                    <Card key={task.id} className="rounded-2xl border-2 border-slate-200 hover:border-purple-500 hover:shadow-xl bg-white transition-all sl-scale-in" style={{ animationDelay: `${index * 0.05}s` }}>
                      <CardContent className="p-5 space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <h3 className="font-black text-base text-slate-900 mb-1">{task.title}</h3>
                            <p className="text-xs text-slate-500 font-semibold">{task.companyName || "StudentLancing"}</p>
                          </div>
                          <Badge className="bg-purple-100 text-purple-700 font-bold rounded-lg border-0 whitespace-nowrap">
                            <IndianRupee className="w-3 h-3 mr-0.5" />{task.payment || "—"}
                          </Badge>
                        </div>
                        {task.description && <p className="text-sm text-slate-600 line-clamp-2">{task.description}</p>}
                        {task.duration && (
                          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold">
                            <Clock className="w-3.5 h-3.5" />{task.duration}
                          </div>
                        )}
                        {appliedJobIds.has(task.id) ? (
                          <Badge className="w-full justify-center py-2 bg-slate-100 text-slate-600 rounded-lg font-bold">✓ Applied</Badge>
                        ) : (
                          <Button size="sm" onClick={() => setSelectedJob({ ...task, applicationType: "micro_task" } as any)} className="w-full bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600 rounded-lg font-bold">
                            Apply Now <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "competitions" && (
            <div className="sl-fade-in space-y-6">
              <div className="flex items-start justify-between flex-wrap gap-3">
                <div className="space-y-1">
                  <h1 className="text-4xl lg:text-5xl font-black tracking-tight">
                    <span className="text-slate-900">Competitions</span>{" "}
                    <span className="bg-gradient-to-r from-violet-600 to-purple-500 bg-clip-text text-transparent">Hub</span>
                  </h1>
                  <p className="text-slate-600">Hackathons, case studies, coding contests, olympiads & more — curated for you.</p>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-100 rounded-full px-3 py-1.5">
                  <Clock className="w-3.5 h-3.5" /> Refreshes every 12 hrs
                </div>
              </div>

              {/* Search + Category filter */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search competitions, organizers..."
                    value={compSearch}
                    onChange={e => setCompSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                  />
                </div>
                <div className="flex gap-2 flex-wrap">
                  {["All", "Hackathon", "Case Study", "Coding Contest", "Business Plan", "Olympiad", "Quiz", "Ideathon", "Other"].map(cat => (
                    <button
                      key={cat}
                      onClick={() => setCompCategory(cat)}
                      className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all ${compCategory === cat ? "bg-violet-600 text-white shadow-sm" : "bg-white border border-slate-200 text-slate-600 hover:border-violet-300"}`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {competitionsLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Card key={i} className="rounded-2xl border border-slate-200 animate-pulse">
                      <CardContent className="p-5 space-y-3">
                        <div className="h-5 bg-slate-100 rounded-full w-1/3" />
                        <div className="h-4 bg-slate-100 rounded w-3/4" />
                        <div className="h-3 bg-slate-100 rounded w-full" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (() => {
                const filtered = competitions.filter((c: any) => {
                  const q = compSearch.toLowerCase();
                  const matchQ = !q || c.title?.toLowerCase().includes(q) || c.company?.toLowerCase().includes(q) || (c.skills || []).some((s: string) => s.toLowerCase().includes(q));
                  const typeLabel = COMP_TYPE_MAP[c.type?.toLowerCase()] || "Other";
                  const matchCat = compCategory === "All" || typeLabel === compCategory;
                  return matchQ && matchCat;
                });

                if (filtered.length === 0) {
                  return (
                    <Card className="rounded-3xl border-0 shadow-xl py-16 bg-gradient-to-br from-violet-50 to-white">
                      <CardContent className="text-center space-y-4">
                        <Trophy className="w-14 h-14 mx-auto text-violet-300" />
                        <div>
                          <h3 className="text-xl font-black text-slate-900 mb-1">No competitions found</h3>
                          <p className="text-slate-500 text-sm max-w-sm mx-auto">Try a different filter or check back soon.</p>
                        </div>
                        <button onClick={() => { setCompSearch(""); setCompCategory("All"); }} className="text-sm text-violet-600 hover:underline">Clear filters</button>
                        <DiscoverySearchLinks
                          category="competitions"
                          query={compSearch}
                          hints={compCategory !== "All" ? [compCategory] : []}
                        />
                      </CardContent>
                    </Card>
                  );
                }

                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filtered.map((c: any) => {
                      const typeLabel = COMP_TYPE_MAP[c.type?.toLowerCase()] || (c.type || "Competition");
                      const modeColor = c.work_mode === "Online" ? "bg-blue-50 text-blue-600" : c.work_mode === "Offline" ? "bg-amber-50 text-amber-700" : "bg-purple-50 text-purple-700";
                      return (
                        <Card key={c.id} className="group rounded-2xl border border-slate-200 hover:border-violet-300 hover:shadow-md transition-all bg-white overflow-hidden">
                          <CardContent className="p-5 space-y-3">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-violet-100 text-violet-700 border border-violet-200">
                                  <Trophy className="w-3 h-3" /> {typeLabel}
                                </span>
                                {c.is_hot && (
                                  <span className="inline-flex items-center gap-1 text-xs font-medium text-orange-700 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-full">
                                    🔥 Hot
                                  </span>
                                )}
                              </div>
                              <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${modeColor}`}>{c.work_mode || "Online"}</span>
                            </div>

                            <div>
                              <h3 className="font-bold text-slate-900 text-sm leading-snug line-clamp-2 group-hover:text-violet-700 transition-colors">{c.title}</h3>
                              <p className="text-xs text-slate-500 mt-0.5">{c.company}</p>
                            </div>

                            {c.description && (
                              <p className="text-xs text-slate-600 line-clamp-2">{c.description}</p>
                            )}

                            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-slate-500">
                              {c.deadline && (
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3 shrink-0" /> {c.deadlineKind === "START_TIME" ? "Starts" : "Deadline"}: {c.deadline}
                                </span>
                              )}
                              {c.duration && (
                                <span className="flex items-center gap-1">
                                  <Users className="w-3 h-3 shrink-0" /> {c.duration}
                                </span>
                              )}
                              {c.stipend && (
                                <span className="flex items-center gap-1 font-semibold text-emerald-600">
                                  <IndianRupee className="w-3 h-3 shrink-0" /> {c.stipend}
                                </span>
                              )}
                              {c.location && (
                                <span className="flex items-center gap-1 truncate">
                                  <MapPin className="w-3 h-3 shrink-0" /> {c.location}
                                </span>
                              )}
                            </div>

                            {c.skills && c.skills.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {c.skills.slice(0, 4).map((tag: string) => (
                                  <span key={tag} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{tag}</span>
                                ))}
                              </div>
                            )}

                            <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                              {c.source && <span className="text-xs text-slate-400">via {c.source}</span>}
                              {(() => {
                                const href = [c.source_url, c.url, c.applyUrl, c.apply_url]
                                  .find((u) => u && /^https?:\/\//i.test(String(u).trim()));
                                  return href ? appliedJobIds.has(c.id) ? (
                                    <Badge className="ml-auto bg-slate-100 text-slate-600">Applied</Badge>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => openExternalForApply({
                                        id: c.id,
                                        title: c.title,
                                        company: c.company || "Competition organizer",
                                        source: c.source || "Competitions",
                                        url: String(href).trim(),
                                      }, "competition")}
                                      className="ml-auto inline-flex items-center gap-1.5 bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                                    >
                                      Open Listing <ExternalLink className="w-3 h-3" />
                                    </button>
                                  ) : (
                                  <span className="ml-auto text-xs text-slate-400 italic">Link pending</span>
                                );
                              })()}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                );
              })()}

              <div className="text-center pt-2">
                <a href="/competitions" target="_blank" className="inline-flex items-center gap-1.5 text-sm text-violet-600 hover:underline font-medium">
                  <ExternalLink className="w-3.5 h-3.5" /> View full Competitions Hub
                </a>
              </div>
            </div>
          )}

          {false && activeTab === "opportunities-hub-DEAD-CODE-A" && (
            <div className="space-y-4">
              {/* Sub-tab toggle */}
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => setHubSubTab("company")}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${hubSubTab === "company" ? "bg-indigo-600 text-white shadow-sm" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
                >
                  Company Listings
                </button>
                <button
                  onClick={() => setHubSubTab("campus")}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-1.5 ${hubSubTab === "campus" ? "bg-teal-600 text-white shadow-sm" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
                >
                  <GraduationCap className="w-4 h-4" /> Campus Drives
                </button>
              </div>

              {hubSubTab === "company" && (
                <UnifiedMatchFeed
                  category="all"
                  internalOnly
                  userId={user?.uid}
                  appliedIds={appliedJobIds}
                  onInternalApply={(rec, t) => setSelectedJob({ ...rec, applicationType: t } as any)}
                  onShowApplyGate={() => setShowApplyGate(true)}
                  title="Opportunities Hub"
                  subtitle="Jobs and internships posted directly by companies on StudentLancing. Apply here and the company sees your application instantly — they can accept, message you, and hire you in-app."
                  searchPlaceholder="Search company-posted opportunities…"
                  accent="indigo"
                />
              )}

              {hubSubTab === "campus" && (() => {
                const drivesWithElig = campusDrives.map(d => ({
                  ...d,
                  _elig: computeDriveEligibility(d, studentCCProfile),
                  _hasCriteria: hasAnyEligibilityCriteria(d),
                }));
                const eligibleCount = drivesWithElig.filter(d => d._elig.eligible).length;
                const displayed = campusEligibleOnly ? drivesWithElig.filter(d => d._elig.eligible) : drivesWithElig;
                return (
                  <div className="space-y-4">
                    {/* Filter bar */}
                    {!campusDrivesLoading && campusDrives.length > 0 && (
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          onClick={() => setCampusEligibleOnly(false)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${!campusEligibleOnly ? "bg-teal-600 text-white shadow-sm" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
                        >
                          All Drives ({campusDrives.length})
                        </button>
                        {studentCCProfile && (
                          <button
                            onClick={() => setCampusEligibleOnly(true)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1 ${campusEligibleOnly ? "bg-emerald-600 text-white shadow-sm" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" /> I'm Eligible ({eligibleCount})
                          </button>
                        )}
                        {!studentCCProfile && (
                          <Link href="/lancing/career-compass">
                            <a className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-1.5 hover:bg-amber-100 transition-colors">
                              ⚠ Complete Career Compass profile to see eligibility
                            </a>
                          </Link>
                        )}
                      </div>
                    )}

                    {campusDrivesLoading && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {Array.from({ length: 4 }).map((_, i) => (
                          <div key={i} className="rounded-2xl bg-slate-100 animate-pulse h-44" />
                        ))}
                      </div>
                    )}
                    {!campusDrivesLoading && displayed.length === 0 && (
                      <div className="text-center py-16 text-slate-400">
                        <GraduationCap className="w-12 h-12 mx-auto mb-3 opacity-40" />
                        <p className="font-medium">
                          {campusEligibleOnly ? "No drives match your eligibility right now." : "No active campus drives right now."}
                        </p>
                        {campusEligibleOnly
                          ? <button onClick={() => setCampusEligibleOnly(false)} className="text-sm text-teal-600 underline mt-1">View all drives</button>
                          : <p className="text-sm mt-1">Check back soon — placement cells post new drives regularly.</p>
                        }
                      </div>
                    )}
                    {!campusDrivesLoading && displayed.length > 0 && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {displayed.map(d => {
                          const deadline = d.deadline ? new Date(d.deadline) : null;
                          const daysLeft = deadline ? Math.ceil((deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;
                          const eligible = d._elig.eligible;
                          const hasCriteria = d._hasCriteria;
                          const isIneligible = studentCCProfile && hasCriteria && !eligible;
                          return (
                            <Link key={d.id} href={`/lancing/drive/${d.id}`}>
                              <div className={`rounded-2xl border-2 hover:shadow-lg bg-white p-5 cursor-pointer transition-all ${isIneligible ? "border-red-100 hover:border-red-300 opacity-75" : "border-teal-100 hover:border-teal-400"}`}>
                                <div className="mb-3">
                                  <div className="flex items-center gap-2 flex-wrap mb-1">
                                    <Badge className="bg-teal-100 text-teal-700 text-[10px] uppercase tracking-wide">Campus Drive</Badge>
                                    {d.hasAssessment && <Badge className="bg-purple-100 text-purple-700 text-[10px]">Assessment</Badge>}
                                    {studentCCProfile && hasCriteria && (
                                      eligible
                                        ? <Badge className="bg-emerald-100 text-emerald-700 text-[10px] flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Eligible</Badge>
                                        : <Badge className="bg-red-100 text-red-700 text-[10px] flex items-center gap-1"><XCircle className="w-3 h-3" /> Not Eligible</Badge>
                                    )}
                                  </div>
                                  <h3 className="font-bold text-gray-900">{d.jobTitle}</h3>
                                  <p className="text-sm text-gray-700">{d.companyName}</p>
                                  <p className="text-xs text-gray-500">via {displayInstitutionName(d.collegeName)}</p>
                                </div>
                                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600 mb-2">
                                  {d.ctc && <span className="flex items-center gap-1"><IndianRupee className="w-3 h-3" /> {d.ctc}</span>}
                                  {d.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {d.location}</span>}
                                  {daysLeft != null && (
                                    <span className={`font-semibold ${daysLeft <= 3 ? "text-red-600" : "text-gray-600"}`}>
                                      {daysLeft > 0 ? `${daysLeft}d left` : "Deadline passed"}
                                    </span>
                                  )}
                                  {d.eligibility?.minCGPA > 0 && <span className="text-amber-700">Min CGPA {d.eligibility.minCGPA}</span>}
                                  {d.eligibility?.min12Pct > 0 && <span className="text-amber-700">12th ≥{d.eligibility.min12Pct}%</span>}
                                </div>
                                {d.eligibility?.branches?.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mb-2">
                                    {d.eligibility.branches.slice(0, 3).map((b: string) => (
                                      <span key={b} className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full text-[10px]">{b}</span>
                                    ))}
                                    {d.eligibility.branches.length > 3 && <span className="text-gray-400 text-[10px]">+{d.eligibility.branches.length - 3}</span>}
                                  </div>
                                )}
                                {isIneligible && d._elig.reasons.length > 0 && (
                                  <p className="text-[10px] text-red-600 mb-2 flex items-start gap-1">
                                    <XCircle className="w-3 h-3 mt-0.5 shrink-0" />
                                    {d._elig.reasons[0]}{d._elig.reasons.length > 1 ? ` (+${d._elig.reasons.length - 1} more)` : ""}
                                  </p>
                                )}
                                <button
                                  disabled={!!isIneligible}
                                  className={`w-full rounded-xl py-2 text-sm font-semibold transition-colors ${isIneligible ? "bg-gray-100 text-gray-400 cursor-not-allowed" : "bg-teal-600 hover:bg-teal-700 text-white"}`}
                                >
                                  {isIneligible ? "Not Eligible" : "View & Apply"}
                                </button>
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                    {campusDrivesNextCursor && !campusDrivesLoading && (
                      <div className="flex justify-center pt-2">
                        <Button
                          variant="outline"
                          onClick={() => void loadMoreCampusDrives()}
                          disabled={campusDrivesLoadingMore}
                        >
                          {campusDrivesLoadingMore ? "Loading more drives…" : "Load more drives"}
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}
          {false && activeTab === "opportunities-hub" && (
            <div className="sl-fade-in space-y-6">
              <div className="flex items-start justify-between flex-wrap gap-3">
                <div className="space-y-1">
                  <h1 className="text-4xl lg:text-5xl font-black tracking-tight">
                    <span className="text-slate-900">Opportunities</span>{" "}
                    <span className="bg-gradient-to-r from-indigo-600 to-purple-500 bg-clip-text text-transparent">Hub</span>
                  </h1>
                  <p className="text-slate-600">AI-matched listings from real companies & recruiters on this platform.</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchHubMatches}
                  disabled={hubLoading}
                  className="gap-1.5 border-slate-300"
                >
                  {hubLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                  Refresh Matches
                </Button>
              </div>

              {hubLoading && (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="rounded-2xl bg-slate-100 animate-pulse h-52" />
                  ))}
                </div>
              )}

              {!hubLoading && hubNoProfile && (
                <Card className="rounded-3xl border-0 shadow-xl py-16 bg-gradient-to-br from-indigo-50 to-white">
                  <CardContent className="text-center space-y-5">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-100 to-purple-50 flex items-center justify-center mx-auto shadow-lg">
                      <User className="w-10 h-10 text-indigo-600" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-black text-slate-900 mb-1">Set up your profile first</h3>
                      <p className="text-slate-600 max-w-sm mx-auto text-sm">Complete your freelancer profile so we can match you to the best opportunities.</p>
                    </div>
                    <Link href="/lancing/profile">
                      <Button className="bg-indigo-600 hover:bg-indigo-700 rounded-xl font-bold">
                        <User className="w-4 h-4 mr-2" />
                        Complete My Profile →
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              )}

              {!hubLoading && hubError && (
                <Card className="rounded-2xl border-red-200 bg-red-50 p-6 text-center">
                  <p className="text-red-700 font-medium mb-3">{hubError}</p>
                  <Button variant="outline" size="sm" onClick={fetchHubMatches}>Try Again</Button>
                </Card>
              )}

              {!hubLoading && !hubNoProfile && !hubError && hubMatches.length === 0 && (
                <Card className="rounded-3xl border-0 shadow-xl py-16 bg-gradient-to-br from-slate-50 to-white">
                  <CardContent className="text-center space-y-4">
                    <Briefcase className="w-14 h-14 mx-auto text-slate-300" />
                    <div>
                      <h3 className="text-xl font-black text-slate-900 mb-1">No matched listings yet</h3>
                      <p className="text-slate-500 text-sm max-w-sm mx-auto">Companies haven't posted opportunities yet, or none matched your profile. Try refreshing.</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setActiveTab("jobs")}>Browse Live Jobs Instead</Button>
                  </CardContent>
                </Card>
              )}

              {!hubLoading && hubMatches.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <Sparkles className="w-4 h-4 text-indigo-500" />
                    <span>{hubMatches.length} listings ranked for you · {hubTimestamp ? new Date(hubTimestamp).toLocaleTimeString() : ""}</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {hubMatches.map((m, i) => {
                      const score: number = typeof m.matchScore === "number" ? m.matchScore : 50;
                      const scoreColor = score >= 75 ? "bg-emerald-500" : score >= 50 ? "bg-amber-400" : "bg-red-400";
                      const scoreBg = score >= 75 ? "text-emerald-700 bg-emerald-50" : score >= 50 ? "text-amber-700 bg-amber-50" : "text-red-700 bg-red-50";
                      return (
                        <Card key={i} className="rounded-2xl border-2 border-slate-100 hover:border-indigo-400 hover:shadow-lg transition-all duration-200">
                          <CardContent className="p-5 space-y-3">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                  <Badge className={`text-xs px-2 py-0.5 ${m.category === "job" ? "bg-blue-100 text-blue-700" : m.category === "internship" ? "bg-purple-100 text-purple-700" : "bg-amber-100 text-amber-700"}`}>
                                    {m.category === "job" ? "Job" : m.category === "internship" ? "Internship" : "Task"}
                                  </Badge>
                                  {m.verified && (
                                    <Badge className="text-xs px-2 py-0.5 bg-emerald-100 text-emerald-700 gap-1">
                                      <CheckCircle2 className="w-3 h-3" /> Verified
                                    </Badge>
                                  )}
                                </div>
                                <h3 className="font-bold text-slate-900 text-sm leading-tight">{m.title}</h3>
                                <p className="text-xs text-slate-500 mt-0.5">{m.company}</p>
                              </div>
                              <div className={`shrink-0 text-xs font-black px-2.5 py-1 rounded-lg ${scoreBg}`}>
                                {score}% match
                              </div>
                            </div>

                            {/* Match score bar */}
                            <div className="w-full bg-slate-100 rounded-full h-1.5">
                              <div className={`h-1.5 rounded-full ${scoreColor}`} style={{ width: `${score}%` }} />
                            </div>

                            {m.matchReason && (
                              <p className="text-xs italic text-slate-600 border-l-2 border-indigo-300 pl-2">{m.matchReason}</p>
                            )}

                            <div className="flex flex-wrap gap-1.5">
                              {m.workMode && <Badge variant="outline" className="text-[10px] px-1.5 py-0.5">{m.workMode}</Badge>}
                              {m.stipend && <Badge variant="outline" className="text-[10px] px-1.5 py-0.5"><IndianRupee className="w-2.5 h-2.5 mr-0.5" />{m.stipend}</Badge>}
                              {m.deadline && <Badge variant="outline" className="text-[10px] px-1.5 py-0.5"><Clock className="w-2.5 h-2.5 mr-0.5" />{m.deadline}</Badge>}
                            </div>

                            {Array.isArray(m.skills) && m.skills.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {m.skills.slice(0, 4).map((s: string) => (
                                  <span key={s} className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">{s}</span>
                                ))}
                              </div>
                            )}

                            <Button
                              size="sm"
                              className="w-full bg-indigo-600 hover:bg-indigo-700 rounded-lg text-xs font-bold"
                              onClick={async () => {
                                // Internal posting → open the in-app apply dialog (keeps phone/email flow)
                                if ((m as any).isInternal) {
                                  const internalType = (m as any).internalType || (m.category === "internship" ? "internship" : m.category === "task" ? "micro_task" : "job");
                                  const pool = internalType === "internship" ? internships : internalType === "micro_task" ? microTasks : jobs;
                                  const found = (pool as any[]).find((p) => p.id === m.id);
                                  if (found) {
                                    setSelectedJob({ ...found, applicationType: internalType } as any);
                                  } else {
                                    toast({ title: "Listing not available", description: "Refresh and try again" });
                                  }
                                  return;
                                }
                                if (!m.applyUrl) {
                                  toast({ title: "No apply link available", description: "Try refreshing matches", variant: "destructive" });
                                  return;
                                }
                                const type: ExternalApplicationType = m.category === "internship" ? "internship" : m.category === "task" ? "micro_task" : "job";
                                openExternalForApply({
                                  id: m.id,
                                  title: m.title,
                                  company: m.company,
                                  source: m.source || "opportunities-hub",
                                  url: m.applyUrl,
                                  type: type === "micro_task" ? "microtask" : type,
                                }, type);
                              }}
                            >
                              <Send className="w-3 h-3 mr-1.5" />
                              Apply Now
                              <ArrowRight className="w-3 h-3 ml-1" />
                            </Button>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Applications Tab */}
          {activeTab === "applications" && (
            <div className="sl-fade-in space-y-6">
              <div className="space-y-2">
                <h1 className="text-4xl lg:text-5xl font-black tracking-tight" >
                  <span className="text-slate-900">My</span>{" "}
                  <span className="bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">Applications</span>
                </h1>
                <p className="text-lg text-slate-600" >
                  Track all your job and internship applications, including previous micro task applications
                </p>
              </div>

              {myApplications.length === 0 ? (
                <Card className="rounded-3xl border-0 shadow-xl py-20 bg-gradient-to-br from-blue-50 to-white">
                  <CardContent className="text-center space-y-6">
                    <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-blue-100 to-cyan-50 flex items-center justify-center mx-auto shadow-lg">
                      <Send className="w-12 h-12 text-blue-600" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-2xl font-black text-slate-900" >No Applications Yet</h3>
                      <p className="text-slate-600 max-w-sm mx-auto" >Start applying to jobs to track your applications here.</p>
                    </div>
                    <Button onClick={() => setActiveTab("jobs")} className="bg-sky-600 hover:bg-sky-700 rounded-xl font-bold" >
                      <Briefcase className="w-4 h-4 mr-2" />
                      Browse Jobs
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {myApplications.map((application, index) => (
                    <Card 
                      key={application.id} 
                      className="rounded-2xl border-2 border-slate-200 hover:border-blue-400 bg-white hover:shadow-xl transition-all duration-300 shadow-md sl-scale-in"
                      style={{ animationDelay: `${index * 0.05}s` }}
                    >
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between gap-6">
                          <div className="flex items-start gap-4">
                            <Avatar className="w-14 h-14 rounded-xl border-2 border-slate-200">
                              <AvatarImage src={application.companyLogo} className="object-cover" />
                              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-cyan-600 text-white font-bold rounded-xl">
                                {application.companyName?.[0] || "C"}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <h3 className="font-black text-lg text-slate-900 mb-1" >
                                {application.jobTitle}
                              </h3>
                              <p className="text-slate-600 text-sm mb-3 font-medium" >
                                {application.companyName}
                              </p>
                              <div className="flex flex-wrap gap-3">
                                <Badge 
                                  className={`px-3 py-1.5 rounded-lg font-bold ${
                                    application.type === "job" 
                                      ? "bg-blue-100 text-blue-700" 
                                      : application.type === "micro_task"
                                      ? "bg-amber-100 text-amber-700"
                                      : "bg-purple-100 text-purple-700"
                                  }`}
                                  
                                >
                                  {application.type === "job" ? "Job" : application.type === "micro_task" ? "Micro Task" : application.type === "internship" ? "Internship" : "Competition"}
                                </Badge>
                                <span className="text-xs text-slate-500 flex items-center gap-1" >
                                  <Clock className="w-3.5 h-3.5" />
                                  Applied {new Date(application.appliedAt).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                          </div>
                          <Badge 
                            className={`px-4 py-2 rounded-xl font-bold text-sm ${
                              application.status === "hired" && application.escrowStatus === "released"
                                ? "bg-green-100 text-green-700 border-2 border-green-300"
                                : application.status === "hired" && application.escrowStatus === "funded"
                                ? "bg-sky-100 text-sky-700 border-2 border-sky-300"
                                : application.status === "hired"
                                ? "bg-emerald-100 text-emerald-700 border-2 border-emerald-300"
                                : application.status === "accepted" 
                                ? "bg-green-100 text-green-700 border-2 border-green-200" 
                                : application.status === "rejected"
                                ? "bg-red-100 text-red-700 border-2 border-red-200"
                                : "bg-amber-100 text-amber-700 border-2 border-amber-200"
                            }`}
                            
                          >
                            {application.status === "hired" && application.escrowStatus === "released" ? "✓ Completed" :
                             application.status === "hired" && application.escrowStatus === "funded" ? "🔄 In Working" :
                             application.status === "hired" ? "🎉 Hired" :
                             application.status === "under_process" ? "Under Review" : 
                             application.status === "accepted" ? "Shortlisted ✓" : 
                             "Declined"}
                          </Badge>
                        </div>
                        
                        {/* Escrow Status for Hired Applications */}
                        {application.status === "hired" && application.escrowAmount && application.escrowAmount > 0 && (
                          <div className={`mt-4 p-4 rounded-xl ${
                            application.escrowStatus === "released" 
                              ? "bg-green-50 border-2 border-green-200" 
                              : application.escrowStatus === "funded"
                              ? "bg-teal-50 border-2 border-teal-200"
                              : "bg-slate-50 border-2 border-slate-200"
                          }`}>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                                  application.escrowStatus === "released" 
                                    ? "bg-green-100" 
                                    : application.escrowStatus === "funded"
                                    ? "bg-teal-100"
                                    : "bg-slate-100"
                                }`}>
                                  <IndianRupee className={`w-5 h-5 ${
                                    application.escrowStatus === "released" 
                                      ? "text-green-600" 
                                      : application.escrowStatus === "funded"
                                      ? "text-teal-600"
                                      : "text-slate-600"
                                  }`} />
                                </div>
                                <div>
                                  <p className="font-bold text-sm" >
                                    Payment: ₹{application.escrowAmount}
                                  </p>
                                  <p className="text-xs text-slate-600" >
                                    {application.escrowStatus === "released" 
                                      ? "Payment received! 🎉" 
                                      : application.escrowStatus === "funded"
                                      ? "In Working - complete your task"
                                      : "Awaiting payment from recruiter"}
                                  </p>
                                </div>
                              </div>
                              <Badge className={`text-xs ${
                                application.escrowStatus === "released" 
                                  ? "bg-green-200 text-green-800" 
                                  : application.escrowStatus === "funded"
                                  ? "bg-teal-200 text-teal-800"
                                  : "bg-amber-200 text-amber-800"
                              }`}>
                                {application.escrowStatus === "released" ? "✓ Paid" : 
                                 application.escrowStatus === "funded" ? "In Working" : "Pending"}
                              </Badge>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Messages Tab */}
          {activeTab === "messages" && (
            <div className="sl-fade-in space-y-6">
              <div className="space-y-2">
                <h1 className="text-4xl lg:text-5xl font-black tracking-tight" >
                  <span className="text-slate-900">Recruiter</span>{" "}
                  <span className="bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent">Messages</span>
                </h1>
                <p className="text-lg text-slate-600" >
                  Hiring offers and communications from recruiters
                </p>
              </div>

              {messages.length === 0 ? (
                <Card className="rounded-3xl border-0 shadow-xl py-20 bg-gradient-to-br from-purple-50 to-white">
                  <CardContent className="text-center space-y-6">
                    <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-purple-100 to-pink-50 flex items-center justify-center mx-auto shadow-lg">
                      <MessageSquare className="w-12 h-12 text-purple-600" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-2xl font-black text-slate-900" >No Messages Yet</h3>
                      <p className="text-slate-600 max-w-sm mx-auto" >When recruiters contact you, messages will appear here.</p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {messages.map((message: any, index) => (
                    <Card 
                      key={message.id} 
                      className="rounded-2xl border-2 border-purple-200 hover:border-purple-400 bg-white hover:shadow-xl transition-all duration-300 shadow-md sl-scale-in"
                      style={{ animationDelay: `${index * 0.05}s` }}
                    >
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-slate-900 mb-2" >
                              {message.type === "hiring" ? "🎉 Hiring Offer" : 
                               message.type === "escrow_funded" ? "💰 Payment Secured" :
                               message.type === "escrow_released" ? "🎉 Payment Released" :
                               "📧 Message"}
                            </p>
                            <p className="text-slate-700 whitespace-pre-wrap break-words" >
                              {message.text}
                            </p>
                            <p className="text-xs text-slate-500 mt-3">
                              {new Date(message.createdAt).toLocaleDateString()} {new Date(message.createdAt).toLocaleTimeString()}
                            </p>
                          </div>
                          {message.type === "hiring" && (
                            <Button
                              size="sm"
                              onClick={() => openContactForm({
                                id: message.id,
                                type: "hired",
                                title: "You're Hired!",
                                message: message.text,
                                jobId: message.jobId || "",
                                jobTitle: message.jobTitle || "Job",
                                jobType: message.jobType || "job",
                                applicationId: message.applicationId || "",
                                recruiterId: message.senderUid || "",
                                recruiterName: message.recruiterName || "Recruiter",
                                requiresContactSubmission: true,
                                contactSubmitted: false,
                                createdAt: message.createdAt,
                                read: message.isRead || false
                              })}
                              className="bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold text-xs h-10 whitespace-nowrap flex-shrink-0"
                              
                            >
                              Submit Details
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* How to Earn Tab */}
          {activeTab === "how-to-earn" && (
            <div className="sl-fade-in space-y-6">
              <div className="space-y-2">
                <h1 className="text-4xl lg:text-5xl font-black tracking-tight" >
                  <span className="text-slate-900">How to</span>{" "}
                  <span className="bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">Earn</span>
                </h1>
                <p className="text-lg text-slate-600" >
                  Step-by-step guide to start earning on StudentLancing
                </p>
              </div>

              <div className="space-y-4">
                {/* Step 1 */}
                <Card className="rounded-2xl border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-white shadow-lg">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black text-xl flex-shrink-0" >1</div>
                      <div>
                        <h3 className="font-black text-lg text-slate-900 mb-2" >Apply for Tasks</h3>
                        <p className="text-slate-600" >
                          Browse and apply for jobs or internships. Submit your application with a compelling cover message.
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
                        <h3 className="font-black text-lg text-slate-900 mb-2" >Wait for Confirmation</h3>
                        <p className="text-slate-600" >
                          After applying, wait for confirmation messages from the company. Check your <strong>Messages</strong> tab regularly for hiring offers.
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
                        <h3 className="font-black text-lg text-slate-900 mb-2" >Submit Your Details</h3>
                        <p className="text-slate-600" >
                          Once hired, submit your contact details (phone & email) for further process. This allows the company to communicate with you directly.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Step 4 */}
                <Card className="rounded-2xl border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-white shadow-lg">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-amber-600 text-white flex items-center justify-center font-black text-xl flex-shrink-0" >4</div>
                      <div>
                        <h3 className="font-black text-lg text-slate-900 mb-2" >Receive Payment</h3>
                        <p className="text-slate-600" >
                          Your payment will be received by <strong>StudentXchange Pvt Ltd</strong> and transferred to you after the company confirms task completion.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Platform Fees */}
                <Card className="rounded-2xl border-2 border-slate-300 bg-gradient-to-br from-slate-100 to-white shadow-xl">
                  <CardContent className="p-6">
                    <h3 className="font-black text-xl text-slate-900 mb-4 flex items-center gap-2" >
                      <IndianRupee className="w-6 h-6 text-emerald-600" />
                      Platform Fees
                    </h3>
                    <p className="text-slate-600 mb-4" >
                      To maintain proper transactions and assurance for all users, StudentXchange deducts a small platform fee:
                    </p>
                    <div className="grid gap-3">
                      <div className="flex items-center justify-between p-4 bg-purple-50 rounded-xl border border-purple-200">
                        <div className="flex items-center gap-3">
                          <Target className="w-5 h-5 text-purple-600" />
                          <span className="font-bold text-slate-800" >Internship</span>
                        </div>
                        <Badge className="bg-purple-600 text-white font-black px-3 py-1">10% Fee</Badge>
                      </div>
                      <div className="flex items-center justify-between p-4 bg-sky-50 rounded-xl border border-sky-200">
                        <div className="flex items-center gap-3">
                          <Briefcase className="w-5 h-5 text-sky-600" />
                          <span className="font-bold text-slate-800" >Job</span>
                        </div>
                        <Badge className="bg-sky-600 text-white font-black px-3 py-1">5% Fee</Badge>
                      </div>
                    </div>
                    <p className="text-sm text-slate-500 mt-4 text-center" >
                      All payments are handled by StudentXchange to ensure secure and reliable transactions.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Incomplete Profile Dialog */}
      <Dialog open={showIncompleteDialog} onOpenChange={setShowIncompleteDialog}>
        <DialogContent className="rounded-3xl border-0 shadow-2xl max-w-md p-0 overflow-hidden">
          <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-8">
            <DialogHeader>
              <DialogTitle className="text-white text-2xl" >
                Complete Your Profile
              </DialogTitle>
              <DialogDescription className="text-amber-100 text-base" >
                To start applying for jobs, please complete these fields
              </DialogDescription>
            </DialogHeader>
          </div>
          <div className="p-8 space-y-4">
            <div className="space-y-3">
              {incompleteFields.map((field) => (
                <div key={field} className="flex items-center gap-3 p-3 bg-orange-50 rounded-xl border-2 border-orange-200">
                  <div className="w-2 h-2 rounded-full bg-orange-600 flex-shrink-0" />
                  <p className="text-slate-700 font-semibold" >{field}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="flex gap-3 p-8 pt-0">
            <Button 
              variant="outline" 
              onClick={() => setShowIncompleteDialog(false)}
              className="flex-1 rounded-xl h-12 font-bold border-2" 
              
            >
              Maybe Later
            </Button>
            <Button
              onClick={() => {
                setShowIncompleteDialog(false);
                setLocation("/lancing/freelancer-profile");
              }}
              className="flex-1 h-12 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-black transition-all duration-200 hover:scale-105"
              
            >
              Edit Profile
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Apply Dialog */}
      <Dialog open={!!selectedJob} onOpenChange={() => !isApplying && setSelectedJob(null)}>
        <DialogContent className="rounded-3xl border-0 shadow-2xl max-w-lg p-0 overflow-hidden">
          <div className="bg-gradient-to-r from-sky-600 to-blue-500 p-8">
            <DialogHeader>
              <DialogTitle className="text-white text-2xl" >
                Apply to {selectedJob?.title}
              </DialogTitle>
              <DialogDescription className="text-emerald-100 text-base" >
                at {selectedJob?.companyName}
              </DialogDescription>
            </DialogHeader>
          </div>
          <div className="p-8 space-y-6">
            <div className="p-5 bg-sky-50 rounded-2xl border-2 border-emerald-200">
              <p className="text-sm font-bold text-emerald-900 mb-3" >REQUIRED SKILLS</p>
              <div className="flex flex-wrap gap-2">
                {selectedJob?.skills?.map((skill: string) => (
                  <Badge key={skill} className="bg-sky-600 text-white font-bold px-3 py-1.5">{skill}</Badge>
                )) || <p className="text-sm text-slate-500">No specific skills required</p>}
              </div>
            </div>
            <div className="space-y-3">
              <label className="text-sm font-black text-slate-900" >COVER MESSAGE (Optional)</label>
              <Textarea
                placeholder="Tell them why you're perfect for this job..."
                value={applyMessage}
                onChange={(e) => setApplyMessage(e.target.value)}
                disabled={isApplying}
                className="rounded-xl min-h-[120px] border-2 border-slate-200 focus:border-sky-500 font-medium p-4"
                
              />
            </div>
          </div>
          <div className="flex gap-3 p-8 pt-0">
            <Button 
              variant="outline" 
              onClick={() => setSelectedJob(null)}
              disabled={isApplying}
              className="flex-1 rounded-xl h-12 font-bold border-2" 
              
            >
              Cancel
            </Button>
            <Button
              onClick={handleApply}
              disabled={isApplying}
              className="flex-1 h-12 bg-blue-600 text-white hover:bg-blue-700 rounded-lg px-4 py-2 transition-all duration-200 hover:scale-105 active:scale-95 font-black disabled:opacity-50 disabled:cursor-not-allowed"
              
            >
              {isApplying ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  Applying...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5 mr-2" />
                  Apply Now
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Contact Submission Dialog for Hired Students */}
      <Dialog open={showContactForm} onOpenChange={setShowContactForm}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader className="pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
                <PartyPopper className="w-6 h-6 text-white" />
              </div>
              <div>
                <DialogTitle className="text-xl font-black text-slate-900" >
                  Congratulations! 🎉
                </DialogTitle>
                <DialogDescription className="text-emerald-600 font-medium" >
                  You've been hired!
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          
          <div className="space-y-5 py-4">
            <div className="bg-emerald-50 border-2 border-emerald-200 rounded-xl p-4">
              <p className="text-sm font-bold text-emerald-800 mb-1" >
                {selectedNotification?.message}
              </p>
              <p className="text-xs text-emerald-600" >
                by {selectedNotification?.recruiterName}
              </p>
            </div>
            
            <div>
              <p className="text-sm text-slate-700 mb-4" >
                Please submit your contact details so the recruiter can reach you:
              </p>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700" >
                    Email Address *
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <Input
                      type="email"
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      placeholder="your@email.com"
                      className="pl-11 rounded-xl border-2 border-slate-200 focus:border-emerald-500 h-12"
                      disabled={isSubmittingContact}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700" >
                    Phone Number *
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <Input
                      type="tel"
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                      placeholder="+91 9876543210"
                      className="pl-11 rounded-xl border-2 border-slate-200 focus:border-emerald-500 h-12"
                      disabled={isSubmittingContact}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex gap-3 pt-2">
            <Button 
              variant="outline" 
              onClick={() => setShowContactForm(false)}
              disabled={isSubmittingContact}
              className="flex-1 rounded-xl h-12 font-bold border-2" 
              
            >
              Later
            </Button>
            <Button
              onClick={handleSubmitContact}
              disabled={isSubmittingContact || !contactEmail || !contactPhone}
              className="flex-1 h-12 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold disabled:opacity-50"
              
            >
              {isSubmittingContact ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  Submitting...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5 mr-2" />
                  Submit Details
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden sl-mobile-bottom-nav" data-testid="mobile-bottom-nav">
        <button 
          className={`sl-mobile-bottom-nav-item ${mobileActiveTab === "home" ? 'active' : ''}`}
          onClick={() => { setMobileActiveTab("home"); setActiveTab("jobs"); }}
          data-testid="nav-home"
        >
          <Home className="w-5 h-5" />
          <span>Home</span>
        </button>
        <button 
          className={`sl-mobile-bottom-nav-item ${mobileActiveTab === "applied" ? 'active' : ''}`}
          onClick={() => { setMobileActiveTab("applied"); setActiveTab("applications"); }}
          data-testid="nav-applied"
        >
          <Send className="w-5 h-5" />
          <span>Applied</span>
        </button>
        <button 
          className={`sl-mobile-bottom-nav-item ${mobileActiveTab === "profile" ? 'active' : ''}`}
          onClick={() => { setMobileActiveTab("profile"); setLocation("/lancing/profile"); }}
          data-testid="nav-profile"
        >
          <User className="w-5 h-5" />
          <span>Profile</span>
        </button>
      </nav>

      {/* Hiring Notifications Banner */}
      {notifications.filter(n => n.type === "hired" && !n.contactSubmitted).length > 0 && (
        <div className="fixed bottom-6 right-6 max-w-sm z-50 animate-pulse">
          {notifications.filter(n => n.type === "hired" && !n.contactSubmitted).slice(0, 1).map(notification => (
            <Card key={notification.id} className="rounded-2xl border-2 border-emerald-300 bg-white shadow-2xl">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center flex-shrink-0">
                    <PartyPopper className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-900 text-sm mb-1" >
                      {notification.title}
                    </p>
                    <p className="text-xs text-slate-600 truncate" >
                      {notification.message}
                    </p>
                    <Button
                      size="sm"
                      onClick={() => openContactForm(notification)}
                      className="mt-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs h-8"
                      
                    >
                      Submit Contact Details
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <ExternalApplicationConfirmation
        item={externalItem?.item || null}
        open={!!externalItem}
        submitting={isMarkingExternalApplied}
        onOpenChange={(open) => { if (!open && !isMarkingExternalApplied) setExternalItem(null); }}
        onConfirm={markExternalApplied}
      />
      <ApplyGateModal open={showApplyGate} onClose={() => setShowApplyGate(false)} />
      {!welcomeDismissed && applyCounter.data && (
        <WelcomeCreditsModal
          remaining={applyCounter.data.remaining}
          onClose={() => setWelcomeDismissed(true)}
        />
      )}
    </div>
  );
}
