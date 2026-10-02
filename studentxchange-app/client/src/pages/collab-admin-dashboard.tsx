import { useState, useEffect } from "react";
import { useCollabAuth } from "@/hooks/use-collab-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  LayoutDashboard,
  FileText,
  Users,
  Trash2,
  Shield,
  ShieldOff,
  ChevronLeft,
  RefreshCw,
  AlertTriangle,
  User,
  Building2,
  GraduationCap,
  Heart,
  Calendar,
  UsersRound,
  MessageSquare,
  Trophy,
  CheckCircle,
  XCircle,
  Eye,
  IndianRupee,
  Filter,
  Rocket,
  Download,
  ExternalLink,
  Cpu,
  Clock,
  ArrowRight,
  Bot,
  Phone,
  Mail,
  Search,
  TrendingUp,
  AlertCircle,
} from "lucide-react";
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
import { Link } from "wouter";

interface Analytics {
  totalProfiles: number;
  totalPosts: number;
  profilesByRole: { student: number; club: number; community: number; company: number; };
  postsByType: { direct: number; group: number; event: number; };
  profileCompletion?: { justSignedUp: number; partialProfile: number; completeProfile: number; };
}

interface Post {
  id: string;
  uid: string;
  type: string;
  title?: string;
  description: string;
  createdAt: string | Date;
  profile?: { username?: string; name?: string; };
}

interface Profile {
  id: string;
  uid: string;
  role: string;
  email?: string;
  name?: string;
  username?: string;
  clubName?: string;
  communityName?: string;
  companyName?: string;
  phone?: string;
  phoneNumber?: string;
  bio?: string;
  skills?: string[];
  stream?: string;
  disabled?: boolean;
  createdAt: string | Date;
  updatedAt?: string | Date;
}

type CompletionStatus = "signed-up" | "partial" | "complete";

function getCompletionStatus(profile: Profile): CompletionStatus {
  const hasName = !!(profile.name || profile.username || profile.clubName || profile.communityName || profile.companyName);
  const hasPhone = !!(profile.phone || profile.phoneNumber);
  const hasBio = !!(profile.bio);
  const hasRole = !!(profile.role);
  const hasEmail = !!(profile.email);
  if (!hasName) return "signed-up";
  if (hasName && hasEmail && hasPhone && hasRole && hasBio) return "complete";
  return "partial";
}

function getProfilePhone(profile: Profile): string {
  return profile.phone || profile.phoneNumber || "";
}

function getProfileDisplayName(profile: Profile): string {
  return profile.name || profile.username || profile.clubName || profile.communityName || profile.companyName || "Unknown";
}

function exportProfilesCSV(profiles: Profile[]) {
  const headers = ["Name", "Email", "Phone", "Role", "Status", "Completion", "Joined"];
  const rows = profiles.map(p => [
    getProfileDisplayName(p),
    p.email || "",
    getProfilePhone(p),
    p.role || "",
    p.disabled ? "Disabled" : "Active",
    getCompletionStatus(p),
    new Date(p.createdAt).toLocaleDateString(),
  ]);
  const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `collab-profiles-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function CollabAdminDashboard() {
  const { user, token, isLoading: authLoading } = useCollabAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"overview" | "posts" | "profiles" | "arena" | "statetech" | "hastech">("overview");
  const [deletePostId, setDeletePostId] = useState<string | null>(null);
  const [deleteProfileId, setDeleteProfileId] = useState<string | null>(null);
  const [disableProfileId, setDisableProfileId] = useState<string | null>(null);
  const [disableProfileState, setDisableProfileState] = useState<boolean>(false);

  const { data: adminCheck, isLoading: adminCheckLoading, error: adminError } = useQuery({
    queryKey: ["/api/collab/admin/verify"],
    enabled: !!token && !!user?.email,
    retry: false,
    queryFn: async () => {
      const response = await fetch("/api/collab/admin/verify", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        throw new Error("Not authorized");
      }
      return response.json();
    }
  });

  const isAdmin = adminCheck?.isAdmin === true;
  const isLoading = authLoading || adminCheckLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verifying admin access...</p>
        </div>
      </div>
    );
  }

  if (!user || !token) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <Shield className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Authentication Required</h2>
            <p className="text-gray-600 mb-4">Please log in to Student Collab to access the admin dashboard.</p>
            <Link href="/student-collab">
              <Button data-testid="button-go-to-login">
                <ChevronLeft className="h-4 w-4 mr-2" />
                Go to Student Collab
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (adminError || !isAdmin) {
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
            <Link href="/student-collab">
              <Button variant="outline" data-testid="button-back-to-collab">
                <ChevronLeft className="h-4 w-4 mr-2" />
                Back to Student Collab
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-0">
      <div className="bg-blue-600 text-white py-4 md:py-6">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl md:text-3xl font-bold">Admin Dashboard</h1>
              <p className="text-indigo-200 text-sm mt-1 hidden md:block">Student Collab Management</p>
            </div>
            <Badge variant="secondary" className="bg-white/20 text-white">
              <Shield className="h-3 w-3 mr-1" />
              Admin
            </Badge>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-4 md:py-6">
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          <Button
            variant={activeTab === "overview" ? "default" : "outline"}
            onClick={() => setActiveTab("overview")}
            className="flex items-center gap-2 whitespace-nowrap"
            data-testid="tab-overview"
          >
            <LayoutDashboard className="h-4 w-4" />
            <span>Overview</span>
          </Button>
          <Button
            variant={activeTab === "posts" ? "default" : "outline"}
            onClick={() => setActiveTab("posts")}
            className="flex items-center gap-2 whitespace-nowrap"
            data-testid="tab-posts"
          >
            <FileText className="h-4 w-4" />
            <span>Posts</span>
          </Button>
          <Button
            variant={activeTab === "profiles" ? "default" : "outline"}
            onClick={() => setActiveTab("profiles")}
            className="flex items-center gap-2 whitespace-nowrap"
            data-testid="tab-profiles"
          >
            <Users className="h-4 w-4" />
            <span>Profiles</span>
          </Button>
          <Button
            variant={activeTab === "arena" ? "default" : "outline"}
            onClick={() => setActiveTab("arena")}
            className="flex items-center gap-2 whitespace-nowrap"
            data-testid="tab-arena"
          >
            <Trophy className="h-4 w-4" />
            <span>Arena</span>
          </Button>
          <Button
            variant={activeTab === "statetech" ? "default" : "outline"}
            onClick={() => setActiveTab("statetech")}
            className="flex items-center gap-2 whitespace-nowrap"
            data-testid="tab-statetech"
          >
            <Rocket className="h-4 w-4" />
            <span>STATETECH</span>
          </Button>
          <Button
            variant={activeTab === "hastech" ? "default" : "outline"}
            onClick={() => setActiveTab("hastech")}
            className="flex items-center gap-2 whitespace-nowrap"
            data-testid="tab-hastech"
          >
            <Cpu className="h-4 w-4" />
            <span>#TECH 2026</span>
          </Button>
        </div>

        {activeTab === "overview" && <OverviewTab token={token} />}
        {activeTab === "posts" && (
          <PostsTab 
            token={token} 
            onDeletePost={setDeletePostId}
          />
        )}
        {activeTab === "profiles" && (
          <ProfilesTab 
            token={token}
            currentUserEmail={user.email}
            onDeleteProfile={setDeleteProfileId}
            onDisableProfile={(id, disabled) => {
              setDisableProfileId(id);
              setDisableProfileState(disabled);
            }}
          />
        )}
        {activeTab === "arena" && <ArenaTab token={token} />}
        {activeTab === "statetech" && <StatetechTab token={token} />}
        {activeTab === "hastech" && <HastechTab />}
      </div>

      <DeletePostDialog
        postId={deletePostId}
        token={token}
        onClose={() => setDeletePostId(null)}
      />
      
      <DeleteProfileDialog
        profileId={deleteProfileId}
        token={token}
        onClose={() => setDeleteProfileId(null)}
      />

      <DisableProfileDialog
        profileId={disableProfileId}
        disabled={disableProfileState}
        token={token}
        onClose={() => setDisableProfileId(null)}
      />
    </div>
  );
}

function OverviewTab({ token }: { token: string }) {
  const { data: analytics, isLoading, refetch, isRefetching } = useQuery<Analytics>({
    queryKey: ["/api/collab/admin/analytics"],
    queryFn: async () => {
      const response = await fetch("/api/collab/admin/analytics", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to fetch analytics");
      return response.json();
    },
    refetchInterval: 30000,
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="pt-6">
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const total = analytics?.totalProfiles || 0;
  const comp = analytics?.profileCompletion;
  const signedUp = comp?.justSignedUp || 0;
  const partial = comp?.partialProfile || 0;
  const complete = comp?.completeProfile || 0;
  const pct = (n: number) => total > 0 ? Math.round((n / total) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isRefetching} data-testid="button-refresh-analytics">
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefetching ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Top metrics */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Users className="h-4 w-4" />Total Registered Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold" data-testid="text-total-profiles">{total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <FileText className="h-4 w-4" />Total Posts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold" data-testid="text-total-posts">{analytics?.totalPosts || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Profile Completion Cards */}
      <div>
        <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-blue-600" />Profile Completion Breakdown
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-red-500" />
                  <span className="text-sm font-semibold text-red-700">Just Signed Up</span>
                </div>
                <span className="text-xs font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-full">{pct(signedUp)}%</span>
              </div>
              <div className="text-3xl font-bold text-red-700 mb-2">{signedUp}</div>
              <div className="w-full bg-red-200 rounded-full h-2">
                <div className="bg-red-500 h-2 rounded-full transition-all" style={{ width: `${pct(signedUp)}%` }} />
              </div>
              <p className="text-xs text-red-600 mt-1">No profile data filled</p>
            </CardContent>
          </Card>

          <Card className="border-yellow-200 bg-yellow-50">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-yellow-600" />
                  <span className="text-sm font-semibold text-yellow-700">Partial Profile</span>
                </div>
                <span className="text-xs font-bold text-yellow-700 bg-yellow-100 px-2 py-0.5 rounded-full">{pct(partial)}%</span>
              </div>
              <div className="text-3xl font-bold text-yellow-700 mb-2">{partial}</div>
              <div className="w-full bg-yellow-200 rounded-full h-2">
                <div className="bg-yellow-500 h-2 rounded-full transition-all" style={{ width: `${pct(partial)}%` }} />
              </div>
              <p className="text-xs text-yellow-600 mt-1">Name set, missing fields</p>
            </CardContent>
          </Card>

          <Card className="border-green-200 bg-green-50">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="text-sm font-semibold text-green-700">Complete Profile</span>
                </div>
                <span className="text-xs font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">{pct(complete)}%</span>
              </div>
              <div className="text-3xl font-bold text-green-700 mb-2">{complete}</div>
              <div className="w-full bg-green-200 rounded-full h-2">
                <div className="bg-green-500 h-2 rounded-full transition-all" style={{ width: `${pct(complete)}%` }} />
              </div>
              <p className="text-xs text-green-600 mt-1">All required fields filled</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Funnel */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Activation Funnel</CardTitle>
          <CardDescription>Drop-off between signup → complete profile</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 flex-wrap">
            {[
              { label: "Signed Up", count: total, color: "bg-blue-500" },
              { label: "Named Profile", count: partial + complete, color: "bg-yellow-500" },
              { label: "Full Profile", count: complete, color: "bg-green-500" },
            ].map((stage, i, arr) => (
              <div key={stage.label} className="flex items-center gap-2">
                <div className="text-center">
                  <div className={`${stage.color} text-white font-bold rounded-lg px-4 py-3 text-sm min-w-[100px]`}>
                    <div className="text-xl font-black">{stage.count}</div>
                    <div className="text-xs opacity-90">{stage.label}</div>
                  </div>
                </div>
                {i < arr.length - 1 && (
                  <div className="flex flex-col items-center">
                    <ArrowRight className="h-5 w-5 text-gray-400" />
                    {arr[i + 1].count < stage.count && (
                      <span className="text-xs text-red-500 font-semibold">
                        -{Math.round(((stage.count - arr[i + 1].count) / Math.max(stage.count, 1)) * 100)}%
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Profiles by Role */}
      <Card>
        <CardHeader><CardTitle className="text-lg">Profiles by Role</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: GraduationCap, label: "Students", count: analytics?.profilesByRole?.student || 0, bg: "bg-blue-50", color: "text-blue-600", testId: "text-student-count" },
              { icon: Building2, label: "Clubs", count: analytics?.profilesByRole?.club || 0, bg: "bg-indigo-50", color: "text-indigo-600", testId: "text-club-count" },
              { icon: Heart, label: "Communities", count: analytics?.profilesByRole?.community || 0, bg: "bg-green-50", color: "text-green-600", testId: "text-community-count" },
              { icon: Building2, label: "Companies", count: analytics?.profilesByRole?.company || 0, bg: "bg-orange-50", color: "text-orange-600", testId: "text-company-count" },
            ].map(({ icon: Icon, label, count, bg, color, testId }) => (
              <div key={label} className={`flex items-center gap-3 p-3 ${bg} rounded-lg`}>
                <Icon className={`h-8 w-8 ${color}`} />
                <div>
                  <div className="text-2xl font-bold" data-testid={testId}>{count}</div>
                  <div className="text-sm text-gray-600">{label}</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Posts by Type */}
      <Card>
        <CardHeader><CardTitle className="text-lg">Posts by Type</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            {[
              { icon: MessageSquare, label: "Direct", count: analytics?.postsByType?.direct || 0, bg: "bg-indigo-50", color: "text-indigo-600", testId: "text-direct-posts" },
              { icon: UsersRound, label: "Group", count: analytics?.postsByType?.group || 0, bg: "bg-teal-50", color: "text-teal-600", testId: "text-group-posts" },
              { icon: Calendar, label: "Events", count: analytics?.postsByType?.event || 0, bg: "bg-pink-50", color: "text-pink-600", testId: "text-event-posts" },
            ].map(({ icon: Icon, label, count, bg, color, testId }) => (
              <div key={label} className={`flex items-center gap-3 p-3 ${bg} rounded-lg`}>
                <Icon className={`h-6 w-6 ${color}`} />
                <div>
                  <div className="text-xl font-bold" data-testid={testId}>{count}</div>
                  <div className="text-xs text-gray-600">{label}</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function PostsTab({ 
  token, 
  onDeletePost 
}: { 
  token: string; 
  onDeletePost: (id: string) => void;
}) {
  const { data: posts, isLoading, refetch, isRefetching } = useQuery<Post[]>({
    queryKey: ["/api/collab/admin/posts"],
    queryFn: async () => {
      const response = await fetch("/api/collab/admin/posts", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to fetch posts");
      return response.json();
    },
    refetchInterval: 30000,
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="py-4">
              <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">All Posts ({posts?.length || 0})</h2>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => refetch()}
          disabled={isRefetching}
          data-testid="button-refresh-posts"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefetching ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="hidden md:block">
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Author</TableHead>
                  <TableHead>Content</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {posts?.map((post) => (
                  <TableRow key={post.id}>
                    <TableCell className="font-medium">
                      {post.profile?.name || post.profile?.username || "Unknown"}
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {post.title || post.description?.slice(0, 50) || "No content"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={post.type === "direct" ? "default" : post.type === "event" ? "destructive" : "secondary"}>
                        {post.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {new Date(post.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => onDeletePost(post.id)}
                        data-testid={`button-delete-post-${post.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <div className="md:hidden space-y-3">
        {posts?.map((post) => (
          <Card key={post.id}>
            <CardContent className="p-4">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="font-medium">{post.profile?.name || post.profile?.username || "Unknown"}</p>
                  <Badge 
                    variant={post.type === "direct" ? "default" : post.type === "event" ? "destructive" : "secondary"}
                    className="mt-1"
                  >
                    {post.type}
                  </Badge>
                </div>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => onDeletePost(post.id)}
                  data-testid={`button-delete-post-mobile-${post.id}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                {post.title || post.description || "No content"}
              </p>
              <p className="text-xs text-gray-400">
                {new Date(post.createdAt).toLocaleDateString()}
              </p>
            </CardContent>
          </Card>
        ))}
        {(!posts || posts.length === 0) && (
          <Card>
            <CardContent className="py-8 text-center text-gray-500">
              No posts found
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function CompletionBadge({ status }: { status: CompletionStatus }) {
  if (status === "complete") return <Badge className="bg-green-100 text-green-800 hover:bg-green-100 text-xs">Complete</Badge>;
  if (status === "partial") return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100 text-xs">Partial</Badge>;
  return <Badge className="bg-red-100 text-red-800 hover:bg-red-100 text-xs">Just Signed Up</Badge>;
}

function ProfilesTab({ 
  token,
  currentUserEmail,
  onDeleteProfile,
  onDisableProfile 
}: { 
  token: string;
  currentUserEmail: string;
  onDeleteProfile: (id: string) => void;
  onDisableProfile: (id: string, disabled: boolean) => void;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<CompletionStatus | "all">("all");
  const [filterRole, setFilterRole] = useState<string>("all");

  const { data: profiles, isLoading, refetch, isRefetching } = useQuery<Profile[]>({
    queryKey: ["/api/collab/admin/profiles"],
    queryFn: async () => {
      const response = await fetch("/api/collab/admin/profiles", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to fetch profiles");
      return response.json();
    },
    refetchInterval: 30000,
  });

  const isCurrentUser = (profile: Profile) => profile.email?.toLowerCase() === currentUserEmail.toLowerCase();

  const filteredProfiles = (profiles || []).filter(p => {
    const name = getProfileDisplayName(p).toLowerCase();
    const email = (p.email || "").toLowerCase();
    const phone = getProfilePhone(p);
    const q = searchQuery.toLowerCase();
    if (q && !name.includes(q) && !email.includes(q) && !phone.includes(q)) return false;
    if (filterStatus !== "all" && getCompletionStatus(p) !== filterStatus) return false;
    if (filterRole !== "all" && (p.role || "").toLowerCase() !== filterRole.toLowerCase()) return false;
    return true;
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="py-4">
              <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex flex-wrap justify-between items-center gap-2">
        <h2 className="text-lg font-semibold">All Profiles ({filteredProfiles.length} / {profiles?.length || 0})</h2>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isRefetching} data-testid="button-refresh-profiles">
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={() => exportProfilesCSV(filteredProfiles)}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Search + Filters */}
      <Card>
        <CardContent className="pt-4 pb-4 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search name, email, phone..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="flex gap-1 flex-wrap">
              {(["all", "signed-up", "partial", "complete"] as const).map(s => (
                <button key={s} onClick={() => setFilterStatus(s)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${filterStatus === s
                    ? s === "signed-up" ? "bg-red-500 text-white border-red-500" : s === "partial" ? "bg-yellow-500 text-white border-yellow-500" : s === "complete" ? "bg-green-500 text-white border-green-500" : "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"}`}>
                  {s === "all" ? "All Status" : s === "signed-up" ? "Just Signed Up" : s === "partial" ? "Partial" : "Complete"}
                </button>
              ))}
            </div>
            <div className="flex gap-1 flex-wrap">
              {["all", "Student", "Club", "Community", "Company"].map(r => (
                <button key={r} onClick={() => setFilterRole(r)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${filterRole === r ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"}`}>
                  {r === "all" ? "All Roles" : r}
                </button>
              ))}
            </div>
          </div>
          {/* Quick target buttons */}
          <div className="flex flex-wrap gap-2 pt-1 border-t">
            <span className="text-xs text-gray-500 self-center">Quick Target:</span>
            <button onClick={() => { setFilterStatus("signed-up"); setFilterRole("all"); }}
              className="px-3 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 transition-all">
              🚨 Incomplete Profiles
            </button>
            <button onClick={() => { setFilterStatus("partial"); setFilterRole("all"); }}
              className="px-3 py-1 rounded-full text-xs font-semibold bg-yellow-50 text-yellow-700 border border-yellow-200 hover:bg-yellow-100 transition-all">
              ⚡ High Potential (Partial)
            </button>
            <button onClick={() => { setFilterStatus("complete"); setFilterRole("all"); }}
              className="px-3 py-1 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 transition-all">
              ✅ Fully Active Users
            </button>
            <button onClick={() => { setFilterStatus("all"); setFilterRole("all"); setSearchQuery(""); }}
              className="px-3 py-1 rounded-full text-xs font-semibold bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100 transition-all">
              Clear Filters
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Desktop table */}
      <div className="hidden md:block">
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Completion</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProfiles.map((profile) => {
                  const phone = getProfilePhone(profile);
                  const completion = getCompletionStatus(profile);
                  return (
                    <TableRow key={profile.id} className={profile.disabled ? "opacity-50" : ""}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {getProfileDisplayName(profile)}
                          {isCurrentUser(profile) && <Badge variant="outline" className="text-xs">You</Badge>}
                          {profile.disabled && <Badge variant="destructive" className="text-xs">Disabled</Badge>}
                        </div>
                        {profile.username && <div className="text-xs text-gray-400">@{profile.username}</div>}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {profile.email && (
                            <div className="flex items-center gap-1 text-xs text-gray-600">
                              <Mail className="h-3 w-3" />
                              <a href={`mailto:${profile.email}`} className="hover:text-blue-600 hover:underline">{profile.email}</a>
                            </div>
                          )}
                          {phone && (
                            <div className="flex items-center gap-1 text-xs text-gray-600">
                              <Phone className="h-3 w-3" />
                              <a href={`tel:${phone}`} className="hover:text-blue-600 hover:underline">{phone}</a>
                              <a href={`https://wa.me/91${phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer"
                                className="ml-1 text-green-600 hover:text-green-700 text-[10px] font-semibold bg-green-50 px-1.5 py-0.5 rounded">WA</a>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell><Badge variant="secondary">{profile.role || "—"}</Badge></TableCell>
                      <TableCell><CompletionBadge status={completion} /></TableCell>
                      <TableCell className="text-sm text-gray-500">{new Date(profile.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        {!isCurrentUser(profile) && (
                          <div className="flex justify-end gap-1">
                            <Button size="sm" variant="outline" onClick={() => onDisableProfile(profile.id, !profile.disabled)} data-testid={`button-toggle-profile-${profile.id}`} title={profile.disabled ? "Enable" : "Disable"}>
                              {profile.disabled ? <Shield className="h-3.5 w-3.5" /> : <ShieldOff className="h-3.5 w-3.5" />}
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => onDeleteProfile(profile.id)} data-testid={`button-delete-profile-${profile.id}`}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filteredProfiles.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-gray-500">No profiles match your filters</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {filteredProfiles.map((profile) => {
          const phone = getProfilePhone(profile);
          const completion = getCompletionStatus(profile);
          return (
            <Card key={profile.id} className={profile.disabled ? "opacity-60" : ""}>
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium truncate">{getProfileDisplayName(profile)}</p>
                      {isCurrentUser(profile) && <Badge variant="outline" className="text-xs">You</Badge>}
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      <Badge variant="secondary" className="text-xs">{profile.role || "—"}</Badge>
                      <CompletionBadge status={completion} />
                      {profile.disabled && <Badge variant="destructive" className="text-xs">Disabled</Badge>}
                    </div>
                    {profile.email && (
                      <a href={`mailto:${profile.email}`} className="text-xs text-blue-600 flex items-center gap-1 mt-1">
                        <Mail className="h-3 w-3" />{profile.email}
                      </a>
                    )}
                    {phone && (
                      <div className="flex items-center gap-2 mt-1">
                        <a href={`tel:${phone}`} className="text-xs text-gray-600 flex items-center gap-1">
                          <Phone className="h-3 w-3" />{phone}
                        </a>
                        <a href={`https://wa.me/91${phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer"
                          className="text-xs text-green-700 font-semibold bg-green-50 px-2 py-0.5 rounded border border-green-200">
                          WhatsApp
                        </a>
                      </div>
                    )}
                  </div>
                  {!isCurrentUser(profile) && (
                    <div className="flex gap-1 ml-2">
                      <Button size="sm" variant="outline" onClick={() => onDisableProfile(profile.id, !profile.disabled)} data-testid={`button-toggle-profile-mobile-${profile.id}`}>
                        {profile.disabled ? <Shield className="h-4 w-4" /> : <ShieldOff className="h-4 w-4" />}
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => onDeleteProfile(profile.id)} data-testid={`button-delete-profile-mobile-${profile.id}`}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-400">Joined: {new Date(profile.createdAt).toLocaleDateString()}</p>
              </CardContent>
            </Card>
          );
        })}
        {filteredProfiles.length === 0 && (
          <Card>
            <CardContent className="py-8 text-center text-gray-500">
              No profiles match your filters
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function DeletePostDialog({
  postId,
  token,
  onClose,
}: {
  postId: string | null;
  token: string;
  onClose: () => void;
}) {
  const { toast } = useToast();

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/collab/admin/posts/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to delete post");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/collab/admin/posts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/collab/admin/analytics"] });
      toast({ title: "Post deleted successfully" });
      onClose();
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to delete post", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  return (
    <AlertDialog open={!!postId} onOpenChange={() => onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            Delete Post
          </AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete this post? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel data-testid="button-cancel-delete-post">Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => postId && deleteMutation.mutate(postId)}
            className="bg-red-600 hover:bg-red-700"
            disabled={deleteMutation.isPending}
            data-testid="button-confirm-delete-post"
          >
            {deleteMutation.isPending ? "Deleting..." : "Delete Post"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function DeleteProfileDialog({
  profileId,
  token,
  onClose,
}: {
  profileId: string | null;
  token: string;
  onClose: () => void;
}) {
  const { toast } = useToast();

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/collab/admin/profiles/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete profile");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/collab/admin/profiles"] });
      queryClient.invalidateQueries({ queryKey: ["/api/collab/admin/analytics"] });
      toast({ title: "Profile deleted successfully" });
      onClose();
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to delete profile", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  return (
    <AlertDialog open={!!profileId} onOpenChange={() => onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            Delete Profile
          </AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete this profile? This will remove all their data and cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel data-testid="button-cancel-delete-profile">Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => profileId && deleteMutation.mutate(profileId)}
            className="bg-red-600 hover:bg-red-700"
            disabled={deleteMutation.isPending}
            data-testid="button-confirm-delete-profile"
          >
            {deleteMutation.isPending ? "Deleting..." : "Delete Profile"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function DisableProfileDialog({
  profileId,
  disabled,
  token,
  onClose,
}: {
  profileId: string | null;
  disabled: boolean;
  token: string;
  onClose: () => void;
}) {
  const { toast } = useToast();

  const disableMutation = useMutation({
    mutationFn: async ({ id, disable }: { id: string; disable: boolean }) => {
      const response = await fetch(`/api/collab/admin/profiles/${id}/disable`, {
        method: "PATCH",
        headers: { 
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ disabled: disable }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update profile");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/collab/admin/profiles"] });
      toast({ title: disabled ? "Profile disabled" : "Profile enabled" });
      onClose();
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to update profile", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  return (
    <AlertDialog open={!!profileId} onOpenChange={() => onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            {disabled ? (
              <ShieldOff className="h-5 w-5 text-orange-500" />
            ) : (
              <Shield className="h-5 w-5 text-green-500" />
            )}
            {disabled ? "Disable Profile" : "Enable Profile"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {disabled
              ? "This will disable the profile. The user won't be able to use their account until it's enabled again."
              : "This will re-enable the profile. The user will be able to use their account again."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel data-testid="button-cancel-toggle-profile">Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => profileId && disableMutation.mutate({ id: profileId, disable: disabled })}
            className={disabled ? "bg-orange-600 hover:bg-orange-700" : "bg-green-600 hover:bg-green-700"}
            disabled={disableMutation.isPending}
            data-testid="button-confirm-toggle-profile"
          >
            {disableMutation.isPending ? "Updating..." : disabled ? "Disable" : "Enable"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

interface ArenaRegistration {
  id: string;
  uid: string;
  fullName: string;
  email: string;
  mobile?: string;
  college?: string;
  courseYear?: string;
  categories: string[];
  projectTitle?: string;
  amountPaid: number;
  transactionId: string;
  paymentScreenshotUrl: string;
  status: 'pending' | 'confirmed' | 'rejected';
  createdAt: string;
}

function ArenaTab({ token }: { token: string }) {
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [selectedScreenshot, setSelectedScreenshot] = useState<string | null>(null);

  const { data: registrations, isLoading, refetch, isRefetching } = useQuery<ArenaRegistration[]>({
    queryKey: ["/api/collab/social/arena/admin/registrations"],
    queryFn: async () => {
      const response = await fetch("/api/collab/social/arena/admin/registrations", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to fetch registrations");
      return response.json();
    },
    refetchInterval: 30000,
  });

  const verifyMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'confirmed' | 'rejected' }) => {
      const response = await fetch(`/api/collab/social/arena/admin/registrations/${id}/verify`, {
        method: "PATCH",
        headers: { 
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update registration");
      }
      return response.json();
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/collab/social/arena/admin/registrations"] });
      toast({ 
        title: status === 'confirmed' ? "Registration Confirmed" : "Registration Rejected",
        description: status === 'confirmed' ? "Payment has been verified" : "Payment has been rejected"
      });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to update", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/collab/social/arena/admin/registrations/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete registration");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/collab/social/arena/admin/registrations"] });
      toast({ 
        title: "Registration Deleted",
        description: "Registration and associated posts have been removed"
      });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to delete", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const { data: orphanedPosts = [], refetch: refetchOrphaned } = useQuery<any[]>({
    queryKey: ["/api/collab/social/arena/admin/orphaned-posts"],
    queryFn: async () => {
      const response = await fetch("/api/collab/social/arena/admin/orphaned-posts", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) return [];
      return response.json();
    },
    refetchInterval: 30000,
  });

  const deleteOrphanedPostMutation = useMutation({
    mutationFn: async (postId: string) => {
      const response = await fetch(`/api/collab/social/arena/admin/posts/${postId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to delete post");
      return response.json();
    },
    onSuccess: () => {
      refetchOrphaned();
      toast({ title: "Orphaned post deleted" });
    },
    onError: () => {
      toast({ title: "Failed to delete post", variant: "destructive" });
    },
  });

  const getCategoryLabel = (cat: string) => {
    switch (cat) {
      case 'creative': return '🎨 Creative House';
      case 'idea': return '💡 Innovative Ideas';
      case 'tech': return '💻 House of Tech';
      default: return cat;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">Pending</Badge>;
      case 'confirmed':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">Confirmed</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filteredRegistrations = (registrations || []).filter((reg) => {
    if (statusFilter !== "all" && reg.status !== statusFilter) return false;
    if (categoryFilter !== "all" && !reg.categories?.includes(categoryFilter)) return false;
    return true;
  });

  const stats = {
    total: registrations?.length || 0,
    pending: registrations?.filter(r => r.status === 'pending').length || 0,
    confirmed: registrations?.filter(r => r.status === 'confirmed').length || 0,
    rejected: registrations?.filter(r => r.status === 'rejected').length || 0,
    totalRevenue: registrations?.filter(r => r.status === 'confirmed').reduce((sum, r) => sum + (r.amountPaid || 0), 0) || 0,
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="pt-6">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Trophy className="h-5 w-5 text-blue-600" />
          Collab Arena 2026 Registrations
        </h2>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => refetch()}
          disabled={isRefetching}
          data-testid="button-refresh-arena"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefetching ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {orphanedPosts.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-orange-700 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Orphaned Posts ({orphanedPosts.length})
              </h3>
            </div>
            <p className="text-sm text-orange-600 mb-3">These arena posts don't have associated registrations and should be deleted:</p>
            <div className="space-y-2">
              {orphanedPosts.map((post: any) => (
                <div key={post.id} className="flex items-center justify-between bg-white p-2 rounded border">
                  <div>
                    <span className="font-medium">{post.profile?.name || 'Unknown'}</span>
                    <span className="text-gray-500 mx-2">-</span>
                    <span className="text-sm text-gray-600">{getCategoryLabel(post.category)}</span>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => deleteOrphanedPostMutation.mutate(post.id)}
                    disabled={deleteOrphanedPostMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-sm text-gray-500">Total</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card className="bg-yellow-50">
          <CardContent className="pt-4 pb-4">
            <p className="text-sm text-yellow-600">Pending</p>
            <p className="text-2xl font-bold text-yellow-700">{stats.pending}</p>
          </CardContent>
        </Card>
        <Card className="bg-green-50">
          <CardContent className="pt-4 pb-4">
            <p className="text-sm text-green-600">Confirmed</p>
            <p className="text-2xl font-bold text-green-700">{stats.confirmed}</p>
          </CardContent>
        </Card>
        <Card className="bg-red-50">
          <CardContent className="pt-4 pb-4">
            <p className="text-sm text-red-600">Rejected</p>
            <p className="text-2xl font-bold text-red-700">{stats.rejected}</p>
          </CardContent>
        </Card>
        <Card className="bg-blue-50">
          <CardContent className="pt-4 pb-4">
            <p className="text-sm text-blue-600">Revenue</p>
            <p className="text-2xl font-bold text-blue-700 flex items-center">
              <IndianRupee className="h-5 w-5" />{stats.totalRevenue}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-500" />
          <span className="text-sm text-gray-600">Filter:</span>
        </div>
        <select 
          value={statusFilter} 
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm"
        >
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="rejected">Rejected</option>
        </select>
        <select 
          value={categoryFilter} 
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm"
        >
          <option value="all">All Categories</option>
          <option value="creative">Creative House</option>
          <option value="idea">Innovative Ideas</option>
          <option value="tech">House of Tech</option>
        </select>
      </div>

      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student</TableHead>
              <TableHead>Categories</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Transaction ID</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRegistrations.map((reg) => (
              <TableRow key={reg.id}>
                <TableCell>
                  <div>
                    <p className="font-medium">{reg.fullName}</p>
                    <p className="text-sm text-gray-500">{reg.email}</p>
                    {reg.college && <p className="text-xs text-gray-400">{reg.college}</p>}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="space-y-1">
                    {(reg.categories || []).map((cat) => (
                      <Badge key={cat} variant="outline" className="mr-1 text-xs">
                        {getCategoryLabel(cat)}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell>
                  <span className="font-medium flex items-center">
                    <IndianRupee className="h-3 w-3" />{reg.amountPaid}
                  </span>
                </TableCell>
                <TableCell>
                  <code className="text-xs bg-gray-100 px-2 py-1 rounded">{reg.transactionId}</code>
                </TableCell>
                <TableCell>{getStatusBadge(reg.status)}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedScreenshot(reg.paymentScreenshotUrl)}
                      data-testid={`button-view-screenshot-${reg.id}`}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    {reg.status === 'pending' && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-green-600 hover:text-green-700 hover:bg-green-50"
                          onClick={() => verifyMutation.mutate({ id: reg.id, status: 'confirmed' })}
                          disabled={verifyMutation.isPending}
                          data-testid={`button-confirm-${reg.id}`}
                        >
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => verifyMutation.mutate({ id: reg.id, status: 'rejected' })}
                          disabled={verifyMutation.isPending}
                          data-testid={`button-reject-${reg.id}`}
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => {
                        if (confirm(`Delete registration for ${reg.fullName}? This will also remove their arena posts.`)) {
                          deleteMutation.mutate(reg.id);
                        }
                      }}
                      disabled={deleteMutation.isPending}
                      data-testid={`button-delete-registration-${reg.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="md:hidden space-y-4">
        {filteredRegistrations.map((reg) => (
          <Card key={reg.id}>
            <CardContent className="pt-4">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <p className="font-medium">{reg.fullName}</p>
                  <p className="text-sm text-gray-500">{reg.email}</p>
                </div>
                {getStatusBadge(reg.status)}
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex flex-wrap gap-1">
                  {(reg.categories || []).map((cat) => (
                    <Badge key={cat} variant="outline" className="text-xs">
                      {getCategoryLabel(cat)}
                    </Badge>
                  ))}
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Amount:</span>
                  <span className="font-medium flex items-center"><IndianRupee className="h-3 w-3" />{reg.amountPaid}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Transaction:</span>
                  <code className="text-xs bg-gray-100 px-2 py-1 rounded">{reg.transactionId}</code>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-4 pt-4 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedScreenshot(reg.paymentScreenshotUrl)}
                  className="flex-1"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  View Screenshot
                </Button>
                {reg.status === 'pending' && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-green-600 border-green-300 hover:bg-green-50"
                      onClick={() => verifyMutation.mutate({ id: reg.id, status: 'confirmed' })}
                      disabled={verifyMutation.isPending}
                    >
                      <CheckCircle className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-600 border-red-300 hover:bg-red-50"
                      onClick={() => verifyMutation.mutate({ id: reg.id, status: 'rejected' })}
                      disabled={verifyMutation.isPending}
                    >
                      <XCircle className="h-4 w-4" />
                    </Button>
                  </>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="text-red-600 border-red-300 hover:bg-red-50"
                  onClick={() => {
                    if (confirm(`Delete registration for ${reg.fullName}? This will also remove their arena posts.`)) {
                      deleteMutation.mutate(reg.id);
                    }
                  }}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {filteredRegistrations.length === 0 && (
          <Card>
            <CardContent className="pt-6 text-center text-gray-500">
              No registrations found matching your filters.
            </CardContent>
          </Card>
        )}
      </div>

      <AlertDialog open={!!selectedScreenshot} onOpenChange={() => setSelectedScreenshot(null)}>
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Payment Screenshot</AlertDialogTitle>
          </AlertDialogHeader>
          <div className="max-h-[60vh] overflow-auto">
            {selectedScreenshot && (
              <img 
                src={selectedScreenshot} 
                alt="Payment screenshot" 
                className="w-full rounded-lg"
              />
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Close</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

interface StatetechRegistration {
  id: string;
  uid: string;
  collegeName: string;
  branch: string;
  degree: string;
  year?: string;
  category: string;
  leadName: string;
  leadEmail: string;
  leadPhone: string;
  teamMembers: Array<{ name: string; phone: string }>;
  proposalUrl: string;
  proposalFileName?: string;
  paymentRequired: boolean;
  paymentStatus: 'pending' | 'paid' | 'exempt';
  verificationStatus: 'submitted' | 'verified' | 'rejected';
  registrationFee: number;
  transactionId?: string;
  paymentScreenshot?: string;
  createdAt: any;
}

function StatetechTab({ token }: { token: string }) {
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [selectedScreenshot, setSelectedScreenshot] = useState<string | null>(null);
  const [selectedProposal, setSelectedProposal] = useState<string | null>(null);

  const { data: registrations, isLoading, refetch, isRefetching } = useQuery<StatetechRegistration[]>({
    queryKey: ["/api/collab/social/statetech/admin/registrations"],
    queryFn: async () => {
      const response = await fetch("/api/collab/social/statetech/admin/registrations", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to fetch registrations");
      return response.json();
    },
    refetchInterval: 30000,
  });

  const verifyMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'verified' | 'rejected' }) => {
      const response = await fetch(`/api/collab/social/statetech/admin/registrations/${id}/verify`, {
        method: "PATCH",
        headers: { 
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update registration");
      }
      return response.json();
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/collab/social/statetech/admin/registrations"] });
      toast({ 
        title: status === 'verified' ? "Registration Verified" : "Registration Rejected",
        description: status === 'verified' ? "Registration has been verified" : "Registration has been rejected"
      });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to update", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/collab/social/statetech/admin/registrations/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete registration");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/collab/social/statetech/admin/registrations"] });
      toast({ 
        title: "Registration Deleted",
        description: "Registration has been removed"
      });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to delete", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const clearAllMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/collab/social/statetech/admin/registrations", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to clear registrations");
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/collab/social/statetech/admin/registrations"] });
      toast({ 
        title: "All Registrations Cleared",
        description: data.message
      });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to clear", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const getCategoryLabel = (cat: string) => {
    const labels: Record<string, string> = {
      innovators: "Innovators' Arena",
      blueprint: "Blueprint Bonanza",
      concept: "Concept Catalyst",
      ideathon: "Ideathon Challenge"
    };
    return labels[cat] || cat;
  };

  const getCategoryColor = (cat: string) => {
    const colors: Record<string, string> = {
      innovators: "bg-blue-100 text-blue-700",
      blueprint: "bg-blue-100 text-blue-700",
      concept: "bg-cyan-100 text-cyan-700",
      ideathon: "bg-amber-100 text-amber-700"
    };
    return colors[cat] || "bg-gray-100 text-gray-700";
  };

  const filteredRegistrations = registrations?.filter(reg => {
    if (statusFilter !== "all" && reg.verificationStatus !== statusFilter) return false;
    if (categoryFilter !== "all" && reg.category !== categoryFilter) return false;
    return true;
  }) || [];

  const stats = {
    total: registrations?.length || 0,
    verified: registrations?.filter(r => r.verificationStatus === 'verified').length || 0,
    submitted: registrations?.filter(r => r.verificationStatus === 'submitted').length || 0,
    rejected: registrations?.filter(r => r.verificationStatus === 'rejected').length || 0,
    revenue: registrations?.filter(r => r.verificationStatus === 'verified' && r.paymentStatus === 'paid')
      .reduce((sum, r) => sum + (r.registrationFee || 0), 0) || 0
  };

  const exportToCSV = () => {
    const verifiedRegs = registrations?.filter(r => r.verificationStatus === 'verified') || [];
    if (verifiedRegs.length === 0) {
      toast({ title: "No data to export", description: "No verified registrations found", variant: "destructive" });
      return;
    }
    
    const headers = ["Lead Name", "Email", "Phone", "College", "Branch", "Degree", "Year", "Category", "Team Members", "Payment Status"];
    const rows = verifiedRegs.map(r => [
      r.leadName,
      r.leadEmail,
      r.leadPhone,
      r.collegeName,
      r.branch,
      r.degree,
      r.year || '',
      getCategoryLabel(r.category),
      r.teamMembers?.map(m => m.name).join('; ') || '',
      r.paymentStatus
    ]);
    
    const csvContent = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `statetech-2026-registrations-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Export complete", description: `Exported ${verifiedRegs.length} verified registrations` });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Rocket className="h-5 w-5 text-blue-600" />
          STATETECH SHOWCASE 2026 Registrations
        </h2>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={exportToCSV}
            data-testid="button-export-statetech"
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => refetch()}
            disabled={isRefetching}
            data-testid="button-refresh-statetech"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button 
            variant="destructive" 
            size="sm" 
            onClick={() => {
              if (confirm("Are you sure you want to clear ALL registrations? This cannot be undone.")) {
                clearAllMutation.mutate();
              }
            }}
            disabled={clearAllMutation.isPending || !registrations?.length}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Clear All
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="bg-gray-50">
          <CardContent className="pt-4">
            <div className="text-sm text-gray-500">Total</div>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card className="bg-yellow-50">
          <CardContent className="pt-4">
            <div className="text-sm text-yellow-600">Pending</div>
            <div className="text-2xl font-bold text-yellow-700">{stats.submitted}</div>
          </CardContent>
        </Card>
        <Card className="bg-green-50">
          <CardContent className="pt-4">
            <div className="text-sm text-green-600">Verified</div>
            <div className="text-2xl font-bold text-green-700">{stats.verified}</div>
          </CardContent>
        </Card>
        <Card className="bg-red-50">
          <CardContent className="pt-4">
            <div className="text-sm text-red-600">Rejected</div>
            <div className="text-2xl font-bold text-red-700">{stats.rejected}</div>
          </CardContent>
        </Card>
        <Card className="bg-blue-50">
          <CardContent className="pt-4">
            <div className="text-sm text-blue-600">Revenue</div>
            <div className="text-2xl font-bold text-blue-700">₹{stats.revenue.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-500" />
          <span className="text-sm text-gray-500">Filter:</span>
        </div>
        <select 
          value={statusFilter} 
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm"
        >
          <option value="all">All Status</option>
          <option value="submitted">Pending</option>
          <option value="verified">Verified</option>
          <option value="rejected">Rejected</option>
        </select>
        <select 
          value={categoryFilter} 
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm"
        >
          <option value="all">All Categories</option>
          <option value="innovators">Innovators' Arena</option>
          <option value="blueprint">Blueprint Bonanza</option>
          <option value="concept">Concept Catalyst</option>
          <option value="ideathon">Ideathon Challenge</option>
        </select>
      </div>

      <div className="space-y-4">
        {filteredRegistrations.map((reg) => (
          <Card key={reg.id}>
            <CardContent className="pt-4">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-lg">{reg.leadName}</h3>
                    <Badge className={getCategoryColor(reg.category)}>{getCategoryLabel(reg.category)}</Badge>
                    <Badge variant={reg.verificationStatus === 'verified' ? 'default' : reg.verificationStatus === 'rejected' ? 'destructive' : 'secondary'}>
                      {reg.verificationStatus === 'verified' ? 'Verified' : reg.verificationStatus === 'rejected' ? 'Rejected' : 'Pending'}
                    </Badge>
                  </div>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p>{reg.leadEmail} • {reg.leadPhone}</p>
                    <p>{reg.collegeName} - {reg.branch} ({reg.degree}{reg.year ? `, ${reg.year}` : ''})</p>
                    {reg.teamMembers && reg.teamMembers.length > 0 && (
                      <p className="text-gray-500">Team: {reg.teamMembers.map(m => m.name).join(', ')}</p>
                    )}
                    <p>
                      Payment: {reg.paymentStatus === 'exempt' ? (
                        <span className="text-green-600 font-medium">Exempt (12th)</span>
                      ) : reg.paymentStatus === 'paid' ? (
                        <span className="text-green-600">₹{reg.registrationFee} - {reg.transactionId}</span>
                      ) : (
                        <span className="text-yellow-600">Pending (₹{reg.registrationFee})</span>
                      )}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 flex-wrap">
                  {reg.proposalUrl && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(reg.proposalUrl, '_blank')}
                    >
                      <ExternalLink className="h-4 w-4 mr-1" />
                      Proposal
                    </Button>
                  )}
                  {reg.paymentScreenshot && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedScreenshot(reg.paymentScreenshot || null)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Screenshot
                    </Button>
                  )}
                  {reg.verificationStatus === 'submitted' && (
                    <>
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                        onClick={() => verifyMutation.mutate({ id: reg.id, status: 'verified' })}
                        disabled={verifyMutation.isPending}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Verify
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => verifyMutation.mutate({ id: reg.id, status: 'rejected' })}
                        disabled={verifyMutation.isPending}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Reject
                      </Button>
                    </>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-600 border-red-300 hover:bg-red-50"
                    onClick={() => {
                      if (confirm(`Delete registration for ${reg.leadName}?`)) {
                        deleteMutation.mutate(reg.id);
                      }
                    }}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {filteredRegistrations.length === 0 && (
          <Card>
            <CardContent className="pt-6 text-center text-gray-500">
              No STATETECH registrations found matching your filters.
            </CardContent>
          </Card>
        )}
      </div>

      <AlertDialog open={!!selectedScreenshot} onOpenChange={() => setSelectedScreenshot(null)}>
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Payment Screenshot</AlertDialogTitle>
          </AlertDialogHeader>
          <div className="max-h-[60vh] overflow-auto">
            {selectedScreenshot && (
              <img 
                src={selectedScreenshot} 
                alt="Payment screenshot" 
                className="w-full rounded-lg"
              />
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Close</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* ── #TECH 2026 Tab ──────────────────────────────────────────────────── */
function HastechTab() {
  const { toast } = useToast();
  const [regs, setRegs] = useState<any[]>([]);
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/hastech/registrations").then(r => r.ok ? r.json() : []),
      fetch("/api/hastech/event-entries").then(r => r.ok ? r.json() : []),
    ]).then(([r, e]) => {
      setRegs(Array.isArray(r) ? r : []);
      setEntries(Array.isArray(e) ? e : []);
    }).catch(() => {
      toast({ title: "Failed to load #TECH data", variant: "destructive" });
    }).finally(() => setLoading(false));
  }, []);

  const stats = {
    total:    regs.length,
    pending:  regs.filter(r => r.paymentStatus === "pending_verification").length,
    approved: regs.filter(r => r.paymentStatus === "approved").length,
    rejected: regs.filter(r => r.paymentStatus === "rejected").length,
    revenue:  regs.filter(r => r.paymentStatus === "approved").reduce((s: number, r: any) => s + (r.totalAmount || 0), 0),
    entries:  entries.length,
  };

  const pendingRegs = regs
    .filter(r => r.paymentStatus === "pending_verification")
    .slice(0, 5);

  function formatDate(ts: any) {
    if (!ts) return "—";
    try {
      const d = ts._seconds ? new Date(ts._seconds * 1000) : new Date(ts);
      return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
    } catch { return "—"; }
  }

  function evtDisplay(events: any[]) {
    if (!events || events.length === 0) return "—";
    return events.map((e: any) => typeof e === "string" ? e : e.name).join(", ");
  }

  return (
    <div className="space-y-6">
      {/* Header banner */}
      <div className="rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
        style={{ background: "linear-gradient(135deg,#1a0a40,#0d0530)", border: "1px solid rgba(139,92,246,0.35)" }}>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Cpu className="h-5 w-5" style={{ color: "#a78bfa" }} />
            <h2 className="text-lg font-extrabold text-white">#TECH 2026</h2>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold"
              style={{ background: "rgba(167,139,250,0.2)", color: "#a78bfa", border: "1px solid rgba(167,139,250,0.4)" }}>
              Tech Fest · ADYPU
            </span>
          </div>
          <p className="text-sm" style={{ color: "#8b7cc8" }}>
            17 events · Robotics, Coding, Workshops, Strategy, Gaming
          </p>
        </div>
        <a href="/hastech-admin" target="_blank" rel="noopener noreferrer">
          <Button className="flex items-center gap-2 font-bold shrink-0"
            style={{ background: "linear-gradient(135deg,#7c3aed,#2563eb)", color: "white", border: "none" }}>
            Open Full Admin
            <ArrowRight className="h-4 w-4" />
          </Button>
        </a>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600" />
        </div>
      ) : (
        <>
          {/* Stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: "Registrations", value: stats.total,    color: "#7c3aed" },
              { label: "Pending",       value: stats.pending,  color: "#d97706" },
              { label: "Approved",      value: stats.approved, color: "#059669" },
              { label: "Rejected",      value: stats.rejected, color: "#dc2626" },
              { label: "Event Entries", value: stats.entries,  color: "#2563eb" },
              { label: "Revenue",       value: `₹${stats.revenue.toLocaleString("en-IN")}`, color: "#ea580c" },
            ].map(s => (
              <Card key={s.label}>
                <CardContent className="pt-4 pb-3 text-center">
                  <p className="text-2xl font-extrabold" style={{ color: s.color }}>{s.value}</p>
                  <p className="text-xs text-gray-500 mt-0.5 font-medium">{s.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Pending registrations preview */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="h-4 w-4 text-amber-500" />
                  Pending Verifications
                  {stats.pending > 0 && (
                    <Badge className="bg-amber-100 text-amber-700 border-amber-200">
                      {stats.pending}
                    </Badge>
                  )}
                </CardTitle>
                <a href="/hastech-admin" target="_blank" rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                  View all <ExternalLink className="h-3 w-3" />
                </a>
              </div>
              <CardDescription>Most recent registrations awaiting payment verification</CardDescription>
            </CardHeader>
            <CardContent>
              {pendingRegs.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <CheckCircle className="h-10 w-10 mx-auto mb-2 opacity-40 text-green-500" />
                  <p className="text-sm font-medium">All caught up! No pending verifications.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>URN</TableHead>
                        <TableHead>Events</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingRegs.map((reg: any) => (
                        <TableRow key={reg.id}>
                          <TableCell className="font-medium">{reg.name}</TableCell>
                          <TableCell className="text-gray-500 text-xs">{reg.urn}</TableCell>
                          <TableCell className="text-xs max-w-[180px] truncate text-gray-600">
                            {evtDisplay(reg.selectedEvents || [])}
                          </TableCell>
                          <TableCell className="font-bold text-violet-600">₹{reg.totalAmount}</TableCell>
                          <TableCell className="text-xs text-gray-400">{formatDate(reg.createdAt)}</TableCell>
                          <TableCell>
                            <a href="/hastech-admin" target="_blank" rel="noopener noreferrer">
                              <Button size="sm" variant="outline" className="text-xs h-7 px-2">
                                <Eye className="h-3 w-3 mr-1" />Review
                              </Button>
                            </a>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {stats.pending > 5 && (
                    <p className="text-xs text-center text-gray-400 mt-3">
                      +{stats.pending - 5} more —{" "}
                      <a href="/hastech-admin" target="_blank" rel="noopener noreferrer"
                        className="text-blue-600 hover:underline">open full admin</a>
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick links */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <a href="/hastech-admin" target="_blank" rel="noopener noreferrer" className="block">
              <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                <CardContent className="pt-5 pb-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-violet-50">
                    <Users className="h-5 w-5 text-violet-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm">All Registrations</p>
                    <p className="text-xs text-gray-500">View {stats.total} registrations, approve/reject payments</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-gray-400 shrink-0" />
                </CardContent>
              </Card>
            </a>
            <a href="/hastech-admin" target="_blank" rel="noopener noreferrer" className="block">
              <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                <CardContent className="pt-5 pb-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-blue-50">
                    <Bot className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm">Event Management</p>
                    <p className="text-xs text-gray-500">{stats.entries} event entries · per-event tabs with approve/reject</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-gray-400 shrink-0" />
                </CardContent>
              </Card>
            </a>
          </div>
        </>
      )}
    </div>
  );
}
