import { useState, useEffect } from "react";
import { useLancingAuth } from "@/hooks/use-lancing-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { PLATFORM_ADMIN_EMAIL } from "@/config/constants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  LayoutDashboard,
  Briefcase,
  Users,
  Trash2,
  Shield,
  ShieldOff,
  RefreshCw,
  Zap,
  Target,
  Building2,
  UserCheck,
  Ban,
  Home,
  Send,
  User,
  Plus,
  IndianRupee,
  CheckCircle2,
  Loader2,
  ExternalLink,
  FileText,
  GraduationCap,
  Map,
  Trophy,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { displayInstitutionName } from "@/lib/institution-display";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Link, useLocation } from "wouter";
import CareerCompassAdminTab from "@/components/lancing/career-compass-admin";
import CompetitionSourcesAdmin from "@/components/lancing/competition-sources-admin";
import { auth, firestore } from "@/lib/firebase";
import { collection, onSnapshot, updateDoc, doc, serverTimestamp } from "firebase/firestore";

const ADMIN_EMAIL = PLATFORM_ADMIN_EMAIL;

interface Analytics {
  freelancers: number;
  companies: number;
  angelRecruiters: number;
  totalJobs: number;
  regularJobs: number;
  microTasks: number;
  internships: number;
}

interface Job {
  id: string;
  type: "job" | "micro_task" | "internship";
  title?: string;
  description?: string;
  companyId?: string;
  companyName?: string;
  createdAt?: string;
  status?: string;
}

interface User {
  id: string;
  role: "freelancer" | "company" | "angel";
  email?: string;
  displayName?: string;
  phoneNumber?: string;
  disabled?: boolean;
  profile?: {
    fullName?: string;
    companyName?: string;
    angelName?: string;
    name?: string;
    phoneNumber?: string;
    phone?: string;
  };
}

export default function LancingAdminDashboard() {
  const { user, firebaseUser, isLoading: authLoading } = useLancingAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"overview" | "jobs" | "users" | "post-opportunity" | "sure-shot" | "revenue" | "applicants" | "placement-approvals" | "career-compass" | "competition-sources">("overview");
  const [deleteJobId, setDeleteJobId] = useState<string | null>(null);
  const [deleteJobType, setDeleteJobType] = useState<string | null>(null);
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const [disableUserId, setDisableUserId] = useState<string | null>(null);
  const [disableUserState, setDisableUserState] = useState<boolean>(false);

  // ── Placement Cell Approvals state ──────────────────────────────────────────
  const [pcApprovals, setPcApprovals] = useState<any[]>([]);
  const [pcPendingCount, setPcPendingCount] = useState(0);
  const [approvingPcUid, setApprovingPcUid] = useState<string | null>(null);
  const [rejectingPcUid, setRejectingPcUid] = useState<string | null>(null);
  const [pcRejectionReason, setPcRejectionReason] = useState("");

  const isAdmin = user?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();

  // Subscribe to placement cell approval requests in real-time
  useEffect(() => {
    if (!isAdmin) return;
    const unsub = onSnapshot(collection(firestore, "placement_cells"), (snap) => {
      const all = snap.docs.map((d) => ({ uid: d.id, ...d.data() }));
      setPcApprovals(all);
      setPcPendingCount(all.filter((a: any) => a.status === "pending_verification" || a.status === "pending").length);
    });
    return () => unsub();
  }, [isAdmin]);

  const getToken = async () => {
    if (firebaseUser) {
      return await firebaseUser.getIdToken();
    }
    return null;
  };

  const { data: analytics, isLoading: analyticsLoading, refetch: refetchAnalytics } = useQuery<Analytics>({
    queryKey: ["/api/lancing/admin/analytics"],
    enabled: isAdmin,
    refetchInterval: 30000,
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error("No token");
      const response = await fetch("/api/lancing/admin/analytics", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to fetch analytics");
      return response.json();
    }
  });

  const { data: jobsData, isLoading: jobsLoading, refetch: refetchJobs } = useQuery<{ jobs: Job[] }>({
    queryKey: ["/api/lancing/admin/jobs"],
    enabled: isAdmin && activeTab === "jobs",
    refetchInterval: 30000,
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error("No token");
      const response = await fetch("/api/lancing/admin/jobs", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to fetch jobs");
      return response.json();
    }
  });

  const { data: usersData, isLoading: usersLoading, refetch: refetchUsers } = useQuery<{ users: User[] }>({
    queryKey: ["/api/lancing/admin/users"],
    enabled: isAdmin && activeTab === "users",
    refetchInterval: 30000,
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error("No token");
      const response = await fetch("/api/lancing/admin/users", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to fetch users");
      return response.json();
    }
  });

  const deleteJobMutation = useMutation({
    mutationFn: async ({ jobId, type }: { jobId: string; type: string }) => {
      const token = await getToken();
      if (!token) throw new Error("No token");
      const response = await fetch(`/api/lancing/admin/jobs/${jobId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ type }),
      });
      if (!response.ok) throw new Error("Failed to delete job");
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Job deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/lancing/admin/jobs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/lancing/admin/analytics"] });
      setDeleteJobId(null);
      setDeleteJobType(null);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const token = await getToken();
      if (!token) throw new Error("No token");
      const response = await fetch(`/api/lancing/admin/users/${userId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to delete user");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "User deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/lancing/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/lancing/admin/analytics"] });
      setDeleteUserId(null);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const disableUserMutation = useMutation({
    mutationFn: async ({ userId, disabled }: { userId: string; disabled: boolean }) => {
      const token = await getToken();
      if (!token) throw new Error("No token");
      const response = await fetch(`/api/lancing/admin/users/${userId}/disable`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ disabled }),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to update user");
      }
      return response.json();
    },
    onSuccess: (_, variables) => {
      toast({ title: variables.disabled ? "User disabled" : "User enabled" });
      queryClient.invalidateQueries({ queryKey: ["/api/lancing/admin/users"] });
      setDisableUserId(null);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const handleRefresh = () => {
    refetchAnalytics();
    if (activeTab === "jobs") refetchJobs();
    if (activeTab === "users") refetchUsers();
    toast({ title: "Data refreshed" });
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verifying admin access...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <Shield className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Authentication Required</h2>
            <p className="text-gray-600 mb-4">Please log in to StudentLancing to access the admin dashboard.</p>
            <Link href="/lancing/login">
              <Button data-testid="button-go-to-login">
                Go to Login
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <ShieldOff className="h-16 w-16 text-red-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
            <p className="text-gray-600 mb-4">
              You don't have permission to access the admin dashboard. 
              Admin access is restricted to authorized administrators only.
            </p>
            <p className="text-sm text-gray-500 mb-4">Logged in as: {user.email}</p>
            <Link href="/lancing/freelancer-dashboard">
              <Button variant="outline" data-testid="button-back-to-lancing">
                Back to Dashboard
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getJobTypeBadge = (type: string) => {
    switch (type) {
      case "job":
        return <Badge className="bg-blue-100 text-blue-700">Job</Badge>;
      case "micro_task":
        return <Badge className="bg-purple-100 text-purple-700">Micro Task</Badge>;
      case "internship":
        return <Badge className="bg-green-100 text-green-700">Internship</Badge>;
      default:
        return <Badge variant="secondary">{type}</Badge>;
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "freelancer":
        return <Badge className="bg-blue-100 text-blue-700">Freelancer</Badge>;
      case "company":
        return <Badge className="bg-purple-100 text-purple-700">Company</Badge>;
      case "angel":
        return <Badge className="bg-amber-100 text-amber-700">Angel Recruiter</Badge>;
      default:
        return <Badge variant="secondary">{role}</Badge>;
    }
  };

  const getUserName = (u: User) => {
    if (u.displayName) return u.displayName;
    if (u.role === "freelancer") return u.profile?.fullName || u.profile?.name || u.email || "No name";
    if (u.role === "company") return u.profile?.companyName || u.profile?.name || u.email || "No name";
    if (u.role === "angel") return u.profile?.angelName || u.profile?.name || u.email || "No name";
    return u.email || "No name";
  };

  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-gray-50 pb-20 lg:pb-0">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="h-6 w-6 text-blue-600" />
            <h1 className="text-xl font-bold">StudentLancing Admin</h1>
          </div>
          <Button variant="outline" size="sm" onClick={handleRefresh} data-testid="button-refresh">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex flex-wrap gap-2 mb-6">
          {[
            { id: "overview", label: "Overview", icon: LayoutDashboard },
            { id: "jobs", label: "Jobs", icon: Briefcase },
            { id: "users", label: "Users", icon: Users },
            { id: "applicants", label: "All Applicants", icon: Send },
            { id: "post-opportunity", label: "Post Opportunity", icon: Plus },
            { id: "sure-shot", label: "Sure Shot Jobs", icon: Shield },
            { id: "revenue", label: "Revenue", icon: IndianRupee },
            { id: "career-compass", label: "Career Compass", icon: Map },
            { id: "competition-sources", label: "Competition Sources", icon: Trophy },
          ].map((tab) => (
            <Button
              key={tab.id}
              variant={activeTab === tab.id ? "default" : "outline"}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              data-testid={`tab-${tab.id}`}
            >
              <tab.icon className="h-4 w-4 mr-2" />
              {tab.label}
            </Button>
          ))}
          <Button
            variant={activeTab === "placement-approvals" ? "default" : "outline"}
            onClick={() => setActiveTab("placement-approvals")}
            data-testid="tab-placement-approvals"
            className="relative"
          >
            <GraduationCap className="h-4 w-4 mr-2" />
            Placement Approvals
            {pcPendingCount > 0 && (
              <span className="ml-2 bg-amber-500 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5 leading-none">
                {pcPendingCount}
              </span>
            )}
          </Button>
        </div>

        {activeTab === "overview" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
                    <UserCheck className="h-4 w-4" />
                    Total Freelancers
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-blue-600">
                    {analyticsLoading ? "..." : analytics?.freelancers || 0}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Total Companies
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-purple-600">
                    {analyticsLoading ? "..." : analytics?.companies || 0}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Angel Recruiters
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-amber-600">
                    {analyticsLoading ? "..." : analytics?.angelRecruiters || 0}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
                    <Briefcase className="h-4 w-4" />
                    Total Jobs
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-600">
                    {analyticsLoading ? "..." : analytics?.totalJobs || 0}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Jobs Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg">
                    <Briefcase className="h-8 w-8 text-blue-600" />
                    <div>
                      <div className="text-2xl font-bold">{analytics?.regularJobs || 0}</div>
                      <div className="text-sm text-gray-500">Regular Jobs</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-4 bg-purple-50 rounded-lg">
                    <Zap className="h-8 w-8 text-purple-600" />
                    <div>
                      <div className="text-2xl font-bold">{analytics?.microTasks || 0}</div>
                      <div className="text-sm text-gray-500">Micro Tasks</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg">
                    <Target className="h-8 w-8 text-green-600" />
                    <div>
                      <div className="text-2xl font-bold">{analytics?.internships || 0}</div>
                      <div className="text-sm text-gray-500">Internships</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "jobs" && (
          <Card>
            <CardHeader>
              <CardTitle>All Jobs ({jobsData?.jobs?.length || 0})</CardTitle>
            </CardHeader>
            <CardContent>
              {jobsLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                </div>
              ) : !jobsData?.jobs?.length ? (
                <div className="text-center py-8 text-gray-500">No jobs found</div>
              ) : (
                <>
                  <div className="hidden md:block overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Title</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Company</TableHead>
                          <TableHead>Created</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {jobsData.jobs.map((job) => (
                          <TableRow key={job.id}>
                            <TableCell className="font-medium max-w-xs truncate">
                              {job.title || "Untitled"}
                            </TableCell>
                            <TableCell>{getJobTypeBadge(job.type)}</TableCell>
                            <TableCell>{job.companyName || "Unknown"}</TableCell>
                            <TableCell>
                              {job.createdAt ? new Date(job.createdAt).toLocaleDateString() : "-"}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() => {
                                  setDeleteJobId(job.id);
                                  setDeleteJobType(job.type);
                                }}
                                data-testid={`button-delete-job-${job.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  <div className="md:hidden space-y-3">
                    {jobsData.jobs.map((job) => (
                      <Card key={job.id} className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div className="font-medium truncate flex-1 mr-2">
                            {job.title || "Untitled"}
                          </div>
                          {getJobTypeBadge(job.type)}
                        </div>
                        <div className="text-sm text-gray-500 mb-2">
                          {job.companyName || "Unknown Company"}
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-gray-400">
                            {job.createdAt ? new Date(job.createdAt).toLocaleDateString() : "-"}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600"
                            onClick={() => {
                              setDeleteJobId(job.id);
                              setDeleteJobType(job.type);
                            }}
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Delete
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === "users" && (
          <Card>
            <CardHeader>
              <CardTitle>All Users ({usersData?.users?.length || 0})</CardTitle>
            </CardHeader>
            <CardContent>
              {usersLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                </div>
              ) : !usersData?.users?.length ? (
                <div className="text-center py-8 text-gray-500">No users found</div>
              ) : (
                <>
                  <div className="hidden md:block overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Phone</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {usersData.users.map((u) => (
                          <TableRow key={u.id}>
                            <TableCell className="font-medium">
                              {getUserName(u)}
                            </TableCell>
                            <TableCell>{u.email || "-"}</TableCell>
                            <TableCell>
                              {(u.phoneNumber || u.profile?.phoneNumber || u.profile?.phone) ? (
                                <a
                                  href={`tel:${u.phoneNumber || u.profile?.phoneNumber || u.profile?.phone}`}
                                  className="font-mono text-sm text-emerald-700 hover:underline whitespace-nowrap"
                                >
                                  {u.phoneNumber || u.profile?.phoneNumber || u.profile?.phone}
                                </a>
                              ) : (
                                <span className="text-slate-400 text-sm">—</span>
                              )}
                            </TableCell>
                            <TableCell>{getRoleBadge(u.role)}</TableCell>
                            <TableCell>
                              {u.disabled ? (
                                <Badge variant="destructive">Disabled</Badge>
                              ) : (
                                <Badge className="bg-green-100 text-green-700">Active</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right space-x-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className={u.disabled ? "text-green-600" : "text-amber-600"}
                                onClick={() => {
                                  setDisableUserId(u.id);
                                  setDisableUserState(!u.disabled);
                                }}
                                data-testid={`button-toggle-user-${u.id}`}
                              >
                                <Ban className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() => setDeleteUserId(u.id)}
                                data-testid={`button-delete-user-${u.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  <div className="md:hidden space-y-3">
                    {usersData.users.map((u) => (
                      <Card key={u.id} className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div className="font-medium truncate flex-1 mr-2">
                            {getUserName(u)}
                          </div>
                          {getRoleBadge(u.role)}
                        </div>
                        <div className="text-sm text-gray-500 mb-1">{u.email || "-"}</div>
                        {(u.phoneNumber || u.profile?.phoneNumber || u.profile?.phone) && (
                          <a
                            href={`tel:${u.phoneNumber || u.profile?.phoneNumber || u.profile?.phone}`}
                            className="block text-sm font-mono text-emerald-700 hover:underline mb-2"
                          >
                            📞 {u.phoneNumber || u.profile?.phoneNumber || u.profile?.phone}
                          </a>
                        )}
                        <div className="flex justify-between items-center">
                          {u.disabled ? (
                            <Badge variant="destructive">Disabled</Badge>
                          ) : (
                            <Badge className="bg-green-100 text-green-700">Active</Badge>
                          )}
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className={u.disabled ? "text-green-600" : "text-amber-600"}
                              onClick={() => {
                                setDisableUserId(u.id);
                                setDisableUserState(!u.disabled);
                              }}
                            >
                              <Ban className="h-4 w-4 mr-1" />
                              {u.disabled ? "Enable" : "Disable"}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-600"
                              onClick={() => setDeleteUserId(u.id)}
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              Delete
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}
        {activeTab === "post-opportunity" && <PostOpportunityTab getToken={getToken} />}
        {activeTab === "sure-shot" && <SureShotManagerTab getToken={getToken} />}
        {activeTab === "revenue" && <RevenueTrackerTab getToken={getToken} />}
        {activeTab === "applicants" && <ApplicantsTab getToken={getToken} />}
        {activeTab === "career-compass" && <CareerCompassAdminTab getToken={getToken} />}
        {activeTab === "competition-sources" && <CompetitionSourcesAdmin />}

        {/* ── Placement Cell Approvals ── */}
        {activeTab === "placement-approvals" && (
          <div className="space-y-5">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <GraduationCap className="w-5 h-5 text-sky-600" />
                  Placement Cell Approvals
                </h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  Review and approve placement cell (SPCR) applications from university coordinators.
                </p>
              </div>
              {pcPendingCount > 0 && (
                <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-sm px-3 py-1">
                  {pcPendingCount} pending
                </Badge>
              )}
            </div>

            {pcApprovals.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center text-gray-400">
                  <GraduationCap className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">No placement cell accounts submitted yet.</p>
                  <p className="text-sm mt-1">Applications will appear here once university coordinators register.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {[...pcApprovals].sort((a, b) => {
                  const order: Record<string, number> = { pending_verification: 0, pending: 0, approved: 1, rejected: 2 };
                  return (order[a.status] ?? 1) - (order[b.status] ?? 1);
                }).map((pc) => (
                  <Card key={pc.uid}>
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between flex-wrap gap-4">
                        <div className="space-y-1 flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-bold text-gray-900 text-base">{displayInstitutionName(pc.collegeName)}</p>
                            <Badge className={
                              pc.status === "approved"
                                ? "bg-emerald-100 text-emerald-700"
                                : pc.status === "rejected"
                                ? "bg-red-100 text-red-700"
                                : "bg-amber-100 text-amber-700"
                            }>
                              {(pc.status === "pending_verification" || pc.status === "pending") ? "Pending"
                                : pc.status === "approved" ? "Approved" : "Rejected"}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600">
                            {pc.contactName}{pc.designation ? ` · ${pc.designation}` : ""}
                          </p>
                          <p className="text-sm text-gray-500">
                            {pc.officialEmail}{pc.phone ? ` · ${pc.phone}` : ""}
                          </p>
                          <p className="text-xs text-gray-400">
                            Applied{" "}
                            {pc.createdAt?.toDate
                              ? new Date(pc.createdAt.toDate()).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
                              : "—"}
                          </p>
                          {pc.status === "rejected" && pc.rejection_reason && (
                            <p className="text-xs text-red-500 mt-1">Rejection reason: {pc.rejection_reason}</p>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          {pc.verificationDocUrl && (
                            <a href={pc.verificationDocUrl} target="_blank" rel="noopener noreferrer">
                              <Button size="sm" variant="outline" className="text-xs gap-1.5">
                                <FileText className="w-3.5 h-3.5" /> View Document
                              </Button>
                            </a>
                          )}
                          {pc.status !== "approved" && pc.status !== "rejected" && (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => setApprovingPcUid(pc.uid)}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
                              >
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => { setRejectingPcUid(pc.uid); setPcRejectionReason(""); }}
                                className="text-red-600 border-red-200 hover:bg-red-50 text-xs"
                              >
                                Reject
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Confirm approval inline */}
                      {approvingPcUid === pc.uid && (
                        <div className="mt-4 flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                          <p className="text-sm text-gray-700 flex-1">
                            Approve <strong>{displayInstitutionName(pc.collegeName)}</strong> as a verified placement cell?
                            Once approved, their coordinator can access the SPCR student dashboard.
                          </p>
                          <Button
                            size="sm"
                            onClick={async () => {
                              try {
                                const token = await auth.currentUser?.getIdToken();
                                const res = await fetch(`/api/admin/placement-cells/${pc.uid}/approve`, {
                                  method: "POST",
                                  headers: { Authorization: `Bearer ${token}` },
                                });
                                if (!res.ok) {
                                  const err = await res.json().catch(() => ({}));
                                  throw new Error(err.error || "Approval failed");
                                }
                                setApprovingPcUid(null);
                                toast({ title: "Placement cell approved", description: `${displayInstitutionName(pc.collegeName)} now has SPCR dashboard access.` });
                              } catch (e: any) {
                                toast({ title: "Failed to approve", description: e.message || "Please try again.", variant: "destructive" });
                              }
                            }}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white whitespace-nowrap"
                          >
                            Confirm Approval
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setApprovingPcUid(null)}>Cancel</Button>
                        </div>
                      )}

                      {/* Rejection reason input */}
                      {rejectingPcUid === pc.uid && (
                        <div className="mt-4 flex gap-2">
                          <input
                            className="flex-1 border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-red-400"
                            placeholder="Reason for rejection…"
                            value={pcRejectionReason}
                            onChange={(e) => setPcRejectionReason(e.target.value)}
                          />
                          <Button
                            size="sm"
                            onClick={async () => {
                              try {
                                const token = await auth.currentUser?.getIdToken();
                                const res = await fetch(`/api/admin/placement-cells/${pc.uid}/reject`, {
                                  method: "POST",
                                  headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
                                  body: JSON.stringify({ reason: pcRejectionReason }),
                                });
                                if (!res.ok) {
                                  const err = await res.json().catch(() => ({}));
                                  throw new Error(err.error || "Rejection failed");
                                }
                                setRejectingPcUid(null);
                                setPcRejectionReason("");
                                toast({ title: "Placement cell rejected" });
                              } catch (e: any) {
                                toast({ title: "Failed to reject", description: e.message || "Please try again.", variant: "destructive" });
                              }
                            }}
                            className="bg-red-600 hover:bg-red-700 text-white"
                          >
                            Confirm
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setRejectingPcUid(null)}>Cancel</Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <AlertDialog open={!!deleteJobId} onOpenChange={() => setDeleteJobId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Job</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this job? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                if (deleteJobId && deleteJobType) {
                  deleteJobMutation.mutate({ jobId: deleteJobId, type: deleteJobType });
                }
              }}
              data-testid="button-confirm-delete-job"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteUserId} onOpenChange={() => setDeleteUserId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this user? This will permanently remove their account and all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                if (deleteUserId) {
                  deleteUserMutation.mutate(deleteUserId);
                }
              }}
              data-testid="button-confirm-delete-user"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!disableUserId} onOpenChange={() => setDisableUserId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{disableUserState ? "Disable" : "Enable"} User</AlertDialogTitle>
            <AlertDialogDescription>
              {disableUserState 
                ? "This user will no longer be able to access the platform."
                : "This user will regain access to the platform."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={disableUserState ? "bg-amber-600 hover:bg-amber-700" : "bg-green-600 hover:bg-green-700"}
              onClick={() => {
                if (disableUserId) {
                  disableUserMutation.mutate({ userId: disableUserId, disabled: disableUserState });
                }
              }}
              data-testid="button-confirm-toggle-user"
            >
              {disableUserState ? "Disable" : "Enable"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden sl-mobile-bottom-nav" data-testid="admin-mobile-bottom-nav">
        <button 
          className="sl-mobile-bottom-nav-item"
          onClick={() => setLocation("/lancing/freelancer-dashboard")}
          data-testid="nav-home"
        >
          <Home className="h-5 w-5" />
          <span>Home</span>
        </button>
        <button 
          className="sl-mobile-bottom-nav-item"
          onClick={() => setLocation("/lancing/freelancer-dashboard")}
          data-testid="nav-applied"
        >
          <Send className="h-5 w-5" />
          <span>Applied</span>
        </button>
        <button 
          className="sl-mobile-bottom-nav-item"
          onClick={() => setLocation("/lancing/profile")}
          data-testid="nav-profile"
        >
          <User className="h-5 w-5" />
          <span>Profile</span>
        </button>
      </nav>
    </div>
  );
}

type TokenGetter = () => Promise<string | null>;

function PostOpportunityTab({ getToken }: { getToken: TokenGetter }) {
  const { toast } = useToast();
  const [form, setForm] = useState({
    type: "job" as "job" | "internship" | "microtask",
    title: "",
    company: "",
    description: "",
    skills: "",
    payout: "",
    work_mode: "Remote",
    duration: "",
    deadline: "",
    source_url: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const token = await getToken();
      if (!token) throw new Error("Not authenticated");
      const r = await fetch("/api/lancing/admin/opportunities", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          payout: form.payout ? Number(form.payout) : null,
          skills: form.skills.split(",").map((s) => s.trim()).filter(Boolean),
        }),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err.error || "Failed to post");
      }
      toast({ title: "Opportunity posted!" });
      setForm({ type: form.type, title: "", company: "", description: "", skills: "", payout: "", work_mode: "Remote", duration: "", deadline: "", source_url: "" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Plus className="w-5 h-5" /> Post a New Opportunity</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <Label>Type</Label>
            <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as any })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="job">Job</SelectItem>
                <SelectItem value="internship">Internship</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required /></div>
          <div><Label>Company</Label><Input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} required /></div>
          <div className="md:col-span-2"><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required /></div>
          <div className="md:col-span-2"><Label>Skills (comma-separated)</Label><Input value={form.skills} onChange={(e) => setForm({ ...form, skills: e.target.value })} placeholder="React, Node.js, Tailwind" /></div>
          <div><Label>Payout / Stipend (₹)</Label><Input type="number" value={form.payout} onChange={(e) => setForm({ ...form, payout: e.target.value })} placeholder="15000" /></div>
          <div>
            <Label>Work Mode</Label>
            <Select value={form.work_mode} onValueChange={(v) => setForm({ ...form, work_mode: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Remote">Remote</SelectItem>
                <SelectItem value="On-site">On-site</SelectItem>
                <SelectItem value="Hybrid">Hybrid</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>Duration</Label><Input value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} placeholder="3 months" /></div>
          <div><Label>Deadline</Label><Input value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} placeholder="2025-12-31" /></div>
          <div><Label>Slots Available (for Sure Shot)</Label><Input type="number" value={(form as any).slots_available || ""} onChange={(e) => setForm({ ...form, ...({"slots_available": e.target.value} as any) })} placeholder="10" /></div>
          <div className="md:col-span-2"><Label>Source URL (optional)</Label><Input value={form.source_url} onChange={(e) => setForm({ ...form, source_url: e.target.value })} /></div>
          <div className="md:col-span-2">
            <Button type="submit" disabled={submitting} className="w-full">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Post Opportunity (also appears in Sure Shot)"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function SureShotManagerTab({ getToken }: { getToken: TokenGetter }) {
  const { toast } = useToast();
  const [form, setForm] = useState({ title: "", company: "", description: "", skills: "", work_mode: "Remote", payout_amount: "", duration: "", deadline: "", slots_available: "10" });
  const [submitting, setSubmitting] = useState(false);

  const jobsQuery = useQuery<{ jobs: any[] }>({
    queryKey: ["/api/lancing/admin/sure-shot/jobs"],
    queryFn: async () => {
      const token = await getToken();
      const r = await fetch("/api/lancing/admin/sure-shot/jobs", { headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) return { jobs: [] };
      return r.json();
    },
  });

  const appsQuery = useQuery<{ applications: any[] }>({
    queryKey: ["/api/lancing/admin/sure-shot/all-applications"],
    queryFn: async () => {
      const token = await getToken();
      const r = await fetch("/api/lancing/admin/sure-shot/all-applications", { headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) return { applications: [] };
      return r.json();
    },
  });

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const token = await getToken();
      const r = await fetch("/api/lancing/admin/sure-shot/jobs", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          payout_amount: Number(form.payout_amount),
          slots_available: Number(form.slots_available),
          skills: form.skills.split(",").map((s) => s.trim()).filter(Boolean),
        }),
      });
      if (!r.ok) throw new Error((await r.json()).error || "Failed");
      toast({ title: "Sure Shot job created" });
      setForm({ title: "", company: "", description: "", skills: "", work_mode: "Remote", payout_amount: "", duration: "", deadline: "", slots_available: "10" });
      jobsQuery.refetch();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const toggleStatus = async (id: string, nextStatus: "open" | "closed") => {
    try {
      const token = await getToken();
      await fetch(`/api/lancing/admin/sure-shot/jobs/${id}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      jobsQuery.refetch();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Shield className="w-5 h-5" /> Create Sure Shot Job</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={create} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required /></div>
            <div><Label>Company</Label><Input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} required /></div>
            <div className="md:col-span-2"><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required /></div>
            <div className="md:col-span-2"><Label>Skills (comma-separated)</Label><Input value={form.skills} onChange={(e) => setForm({ ...form, skills: e.target.value })} /></div>
            <div>
              <Label>Work Mode</Label>
              <Select value={form.work_mode} onValueChange={(v) => setForm({ ...form, work_mode: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Remote">Remote</SelectItem>
                  <SelectItem value="On-site">On-site</SelectItem>
                  <SelectItem value="Hybrid">Hybrid</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Payout (₹)</Label><Input type="number" value={form.payout_amount} onChange={(e) => setForm({ ...form, payout_amount: e.target.value })} required /></div>
            <div><Label>Duration</Label><Input value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} placeholder="2 weeks" /></div>
            <div><Label>Deadline</Label><Input value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} placeholder="2025-12-31" /></div>
            <div><Label>Slots Available</Label><Input type="number" value={form.slots_available} onChange={(e) => setForm({ ...form, slots_available: e.target.value })} required /></div>
            <div className="md:col-span-2">
              <Button type="submit" disabled={submitting} className="w-full">{submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create Sure Shot Job"}</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>All Sure Shot Jobs ({jobsQuery.data?.jobs?.length || 0})</CardTitle></CardHeader>
        <CardContent>
          {jobsQuery.isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
            <div className="space-y-3">
              {(jobsQuery.data?.jobs || []).map((j: any) => {
                const isOpen = j.status !== "closed";
                return (
                <div key={j.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="font-bold">{j.title} <span className="text-sm text-slate-500">@ {j.company}</span></div>
                    <div className="text-xs text-slate-500">{j.work_mode} · ₹{j.payout_amount} · {j.slots_filled || 0}/{j.slots_available} slots</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={isOpen ? "default" : "destructive"}>{isOpen ? "Open" : "Closed"}</Badge>
                    <Button size="sm" variant="outline" onClick={() => toggleStatus(j.id, isOpen ? "closed" : "open")}>
                      {isOpen ? "Close" : "Reopen"}
                    </Button>
                  </div>
                </div>
              )})}
              {(jobsQuery.data?.jobs?.length || 0) === 0 && <p className="text-sm text-slate-500">No Sure Shot jobs yet.</p>}
            </div>
          )}
        </CardContent>
      </Card>

      <SureShotApplicationsPanel getToken={getToken} appsQuery={appsQuery} jobsQuery={jobsQuery} />
    </div>
  );
}

function SureShotApplicationsPanel({ getToken, appsQuery, jobsQuery }: { getToken: TokenGetter; appsQuery: any; jobsQuery: any }) {
  const { toast } = useToast();
  const [filterJob, setFilterJob] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);

  const updateApp = async (id: string, patch: Record<string, string>) => {
    setUpdating(id);
    try {
      const token = await getToken();
      const r = await fetch(`/api/lancing/admin/sure-shot/applications/${id}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!r.ok) throw new Error((await r.json()).error || "Failed");
      appsQuery.refetch();
      toast({ title: "Updated" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setUpdating(null);
    }
  };

  const apps: any[] = appsQuery.data?.applications || [];
  const jobs: any[] = jobsQuery.data?.jobs || [];

  const filtered = apps.filter((a) => {
    if (filterJob !== "all" && a.job_id !== filterJob) return false;
    if (filterStatus !== "all" && a.status !== filterStatus) return false;
    return true;
  });

  const statusColor: Record<string, string> = {
    applied: "bg-blue-100 text-blue-800",
    assigned: "bg-amber-100 text-amber-800",
    submitted: "bg-purple-100 text-purple-800",
    completed: "bg-green-100 text-green-800",
    rejected: "bg-red-100 text-red-800",
  };
  const payoutColor: Record<string, string> = {
    pending: "bg-slate-100 text-slate-700",
    done: "bg-emerald-100 text-emerald-800",
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5" /> Sure Shot Applications ({filtered.length}/{apps.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-4">
          <div className="flex items-center gap-2">
            <Label className="text-xs shrink-0">Job:</Label>
            <Select value={filterJob} onValueChange={setFilterJob}>
              <SelectTrigger className="h-8 text-xs w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Jobs</SelectItem>
                {jobs.map((j: any) => <SelectItem key={j.id} value={j.id}>{j.title}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-xs shrink-0">Status:</Label>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="h-8 text-xs w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="applied">Applied</SelectItem>
                <SelectItem value="assigned">Assigned</SelectItem>
                <SelectItem value="submitted">Submitted</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {appsQuery.isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-amber-600" /></div>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-slate-500 py-4 text-center">No applications match the current filter.</p>
        ) : (
          <div className="space-y-3">
            {filtered.map((a: any) => {
              const isExpanded = expandedId === a.id;
              const isUpdating = updating === a.id;
              return (
                <div key={a.id} className="border rounded-lg overflow-hidden">
                  {/* Row summary */}
                  <div
                    className="flex items-center justify-between gap-3 p-3 cursor-pointer hover:bg-slate-50 transition-colors"
                    onClick={() => setExpandedId(isExpanded ? null : a.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm text-slate-900 truncate">{a.student_name || "Unknown"}</span>
                        <span className="text-xs text-slate-500 truncate">{a.student_email}</span>
                        {a.phone_number && (
                          <span className="text-xs bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-mono">{a.phone_number}</span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-slate-700">{a.job_title}</span>
                        <span>·</span>
                        <span>{new Date(a.applied_at || Date.now()).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</span>
                        <span>·</span>
                        <span className="font-medium text-emerald-700">₹{a.payout_amount}</span>
                        <span>·</span>
                        <span className="font-mono text-xs">{a.upi_id}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusColor[a.status] || "bg-slate-100 text-slate-700"}`}>
                        {a.status || "applied"}
                      </span>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${payoutColor[a.payout_status] || "bg-slate-100 text-slate-700"}`}>
                        {a.payout_status === "done" ? "Paid ✓" : "Payout pending"}
                      </span>
                    </div>
                  </div>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div className="border-t bg-slate-50 p-4 space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Applicant Details</p>
                          <div className="space-y-1">
                            <div><span className="text-slate-500">Name:</span> <span className="font-medium">{a.student_name || "—"}</span></div>
                            <div><span className="text-slate-500">Email:</span> <span className="font-medium">{a.student_email || "—"}</span></div>
                            <div><span className="text-slate-500">Phone:</span> <span className="font-medium font-mono">{a.phone_number || "—"}</span></div>
                            <div><span className="text-slate-500">UPI ID:</span> <span className="font-medium font-mono">{a.upi_id || "—"}</span></div>
                            <div><span className="text-slate-500">Payout:</span> <span className="font-bold text-emerald-700">₹{a.payout_amount}</span></div>
                          </div>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Why Interested</p>
                          <p className="text-sm text-slate-700 whitespace-pre-wrap bg-white border rounded p-2 max-h-32 overflow-y-auto">{a.why_interested || "—"}</p>
                        </div>
                      </div>

                      {a.work_submission_link && (
                        <div>
                          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Work Submitted</p>
                          <a href={a.work_submission_link} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline text-sm break-all">
                            {a.work_submission_link}
                          </a>
                        </div>
                      )}

                      {/* Action Controls */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Update Status</p>
                          <div className="flex flex-wrap gap-2">
                            {["applied", "assigned", "submitted", "completed", "rejected"].map((s) => (
                              <Button
                                key={s}
                                size="sm"
                                variant={a.status === s ? "default" : "outline"}
                                className="text-xs h-7"
                                disabled={isUpdating || a.status === s}
                                onClick={() => updateApp(a.id, { status: s })}
                              >
                                {isUpdating ? <Loader2 className="w-3 h-3 animate-spin" /> : s}
                              </Button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Payout</p>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant={a.payout_status === "done" ? "default" : "outline"}
                              className={`text-xs h-7 ${a.payout_status === "done" ? "bg-emerald-600 hover:bg-emerald-700" : ""}`}
                              disabled={isUpdating || a.payout_status === "done"}
                              onClick={() => updateApp(a.id, { payout_status: "done" })}
                            >
                              {isUpdating ? <Loader2 className="w-3 h-3 animate-spin" /> : a.payout_status === "done" ? "✓ Paid" : "Mark as Paid"}
                            </Button>
                            {a.payout_status === "done" && a.paid_at && (
                              <span className="text-xs text-slate-500 self-center">
                                {new Date(a.paid_at).toLocaleDateString("en-IN")}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RevenueTrackerTab({ getToken }: { getToken: TokenGetter }) {
  const revQuery = useQuery<{ month: string; totalRevenue: number; paymentCount: number }>({
    queryKey: ["/api/lancing/admin/application-revenue"],
    queryFn: async () => {
      const token = await getToken();
      const r = await fetch("/api/lancing/admin/application-revenue", { headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) return { month: "", totalRevenue: 0, paymentCount: 0 };
      return r.json();
    },
  });

  return (
    <div className="space-y-6">
      <div className="text-sm text-slate-600">
        Showing data for <span className="font-bold">{revQuery.data?.month || "current month"}</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-sm text-slate-500">Total Revenue (this month)</CardTitle></CardHeader>
          <CardContent>
            <div className="text-3xl font-black flex items-center gap-1">
              <IndianRupee className="w-7 h-7" />
              {(revQuery.data?.totalRevenue || 0).toLocaleString("en-IN")}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm text-slate-500">Paid Application Passes</CardTitle></CardHeader>
          <CardContent>
            <div className="text-3xl font-black flex items-center gap-2">
              <CheckCircle2 className="w-7 h-7 text-emerald-500" />
              {revQuery.data?.paymentCount || 0}
            </div>
          </CardContent>
        </Card>
      </div>
      <p className="text-xs text-slate-500">
        Revenue resets at the start of each calendar month, mirroring the freelancer free-apply quota cycle.
      </p>
    </div>
  );
}

// ─── Applicants Tab ───────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  under_process: "bg-blue-100 text-blue-700",
  shortlisted: "bg-indigo-100 text-indigo-700",
  accepted: "bg-emerald-100 text-emerald-700",
  hired: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
};

const STATUS_OPTIONS = ["pending", "under_process", "shortlisted", "accepted", "hired", "rejected"];

function ApplicantsTab({ getToken }: { getToken: TokenGetter }) {
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const appsQuery = useQuery<{ applications: any[] }>({
    queryKey: ["/api/lancing/admin/all-applications"],
    queryFn: async () => {
      const token = await getToken();
      const r = await fetch("/api/lancing/admin/all-applications", { headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) throw new Error("Failed to fetch applications");
      return r.json();
    },
  });

  const updateStatus = async (app: any, newStatus: string) => {
    setUpdatingId(app.id);
    try {
      const token = await getToken();
      const res = await fetch(`/api/lancing/admin/applications/${app.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: newStatus, studentUid: app.studentUid, jobId: app.jobId, type: app.type }),
      });
      if (!res.ok) throw new Error("Update failed");
      toast({ title: "Status updated", description: `→ ${newStatus}` });
      appsQuery.refetch();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setUpdatingId(null);
    }
  };

  const exportCSV = () => {
    const apps = appsQuery.data?.applications || [];
    const rows = [
      ["ID", "Student UID", "Email", "Phone", "Job Title", "Company", "Type", "Status", "Applied At"],
      ...apps.map((a) => [a.id, a.studentUid, a.studentEmail, a.applicantPhone || "", a.jobTitle, a.companyName, a.type, a.status, a.appliedAt]),
    ];
    const csv = rows.map((r) => r.map((v) => `"${(v || "").toString().replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `all-applications-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const all = appsQuery.data?.applications || [];
  const filtered = all.filter((a) => {
    if (statusFilter !== "all" && a.status !== statusFilter) return false;
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      return (
        (a.jobTitle || "").toLowerCase().includes(s) ||
        (a.companyName || "").toLowerCase().includes(s) ||
        (a.studentEmail || "").toLowerCase().includes(s) ||
        (a.applicantPhone || "").toLowerCase().includes(s) ||
        (a.studentUid || "").toLowerCase().includes(s)
      );
    }
    return true;
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <h2 className="text-xl font-black text-slate-900">All Applications ({all.length})</h2>
        <div className="flex items-center gap-2 flex-wrap">
          <Input
            placeholder="Search by title, company, email…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-56 h-8 text-sm"
          />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-8 w-36 text-sm">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={exportCSV} className="h-8 gap-1.5 text-xs">
            Export CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => appsQuery.refetch()} disabled={appsQuery.isFetching} className="h-8 gap-1.5 text-xs">
            {appsQuery.isFetching ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
            Refresh
          </Button>
        </div>
      </div>

      {appsQuery.isLoading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
        </div>
      )}

      {appsQuery.isError && (
        <Card className="border-red-200 bg-red-50 p-6 text-center">
          <p className="text-red-700 text-sm font-medium">Failed to load applications. Check backend logs.</p>
        </Card>
      )}

      {!appsQuery.isLoading && !appsQuery.isError && (
        <Card className="rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="text-xs font-bold text-slate-600 whitespace-nowrap">Student</TableHead>
                  <TableHead className="text-xs font-bold text-slate-600 whitespace-nowrap">Phone</TableHead>
                  <TableHead className="text-xs font-bold text-slate-600 whitespace-nowrap">Opportunity</TableHead>
                  <TableHead className="text-xs font-bold text-slate-600 whitespace-nowrap">Type</TableHead>
                  <TableHead className="text-xs font-bold text-slate-600 whitespace-nowrap">Applied</TableHead>
                  <TableHead className="text-xs font-bold text-slate-600 whitespace-nowrap">Status</TableHead>
                  <TableHead className="text-xs font-bold text-slate-600 whitespace-nowrap">Update</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-slate-400 text-sm">
                      {statusFilter === "all" && !searchTerm ? "No applications yet" : "No results for this filter"}
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((app) => (
                    <TableRow key={`${app.studentUid}-${app.id}`} className="hover:bg-slate-50 transition-colors">
                      <TableCell className="text-xs">
                        <div className="font-medium text-slate-900 max-w-[120px] truncate">{app.studentEmail || app.studentUid}</div>
                      </TableCell>
                      <TableCell className="text-xs whitespace-nowrap">
                        {app.applicantPhone ? (
                          <a href={`tel:${app.applicantPhone}`} className="font-mono font-semibold text-emerald-700 hover:underline">
                            {app.applicantPhone}
                          </a>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">
                        <div className="font-semibold text-slate-900 max-w-[160px] truncate">{app.jobTitle || "—"}</div>
                        <div className="text-slate-500 max-w-[160px] truncate">{app.companyName || "—"}</div>
                      </TableCell>
                      <TableCell>
                        <Badge className={`text-[10px] px-1.5 py-0.5 ${app.type === "internship" ? "bg-purple-100 text-purple-700" : app.type === "micro_task" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"}`}>
                          {app.type === "micro_task" ? "Task" : app.type || "Job"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-slate-500 whitespace-nowrap">
                        {app.appliedAt ? new Date(app.appliedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge className={`text-[10px] px-2 py-0.5 font-semibold ${STATUS_COLORS[app.status] || "bg-slate-100 text-slate-600"}`}>
                          {(app.status || "pending").replace(/_/g, " ")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={app.status || "pending"}
                          onValueChange={(v) => updateStatus(app, v)}
                          disabled={updatingId === app.id}
                        >
                          <SelectTrigger className="h-7 w-32 text-xs border-slate-200">
                            {updatingId === app.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <SelectValue />}
                          </SelectTrigger>
                          <SelectContent>
                            {STATUS_OPTIONS.map((s) => (
                              <SelectItem key={s} value={s} className="text-xs">{s.replace(/_/g, " ")}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}
      {!appsQuery.isLoading && filtered.length > 0 && (
        <p className="text-xs text-slate-400 text-right">Showing {filtered.length} of {all.length} applications</p>
      )}
    </div>
  );
}
