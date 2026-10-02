import { useState, useEffect, useCallback, useMemo, memo, useRef } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PLATFORM_ADMIN_EMAIL } from "@/config/constants";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useCollabAuth } from "@/hooks/use-collab-auth";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { getFirestore, collection, query, where, onSnapshot, doc, getDoc, setDoc, deleteDoc, addDoc, getDocs, limit, Timestamp } from "firebase/firestore";
import app, { collabFetch } from "@/lib/firebase";
import { 
  Trophy, ArrowLeft, Calendar, Palette, Lightbulb, Code,
  Award, CheckCircle, Clock, Users, Shield, FileText,
  CreditCard, Sparkles, Target, Star, Heart, MessageSquare,
  Send, Plus, Image, Loader2, LayoutGrid, PenSquare, Upload,
  X, File, Play, FileImage, FileVideo, AlertTriangle
} from "lucide-react";
import { ArenaFeedSkeleton } from "@/components/ui/loading-skeleton";

interface ArenaRegistration {
  id: string;
  uid: string;
  categories: string[];
  projectTitle: string;
  transactionId: string;
  paymentScreenshotUrl: string;
  status: 'pending' | 'confirmed' | 'rejected';
  createdAt: string;
}

interface ArenaPost {
  id: string;
  uid: string;
  type: 'arena';
  category: string;
  description: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video' | 'document';
  documentName?: string;
  profile?: {
    username?: string;
    name?: string;
    avatarUrl?: string;
    role?: string;
  };
  createdAt: string;
}

// Client-side URL normalization for legacy posts with relative paths
function normalizeMediaUrl(rawUrl: string | undefined): string | undefined {
  if (!rawUrl) return undefined;
  
  // Handle Firebase Storage V0 URLs - convert to direct download format
  // https://firebasestorage.googleapis.com/v0/b/<bucket>/o/<path>?alt=media
  if (rawUrl.includes('firebasestorage.googleapis.com/v0/b/')) {
    // Remove leading slashes and ensure https:// prefix
    let normalizedUrl = rawUrl;
    // Strip leading slashes first
    while (normalizedUrl.startsWith('/')) {
      normalizedUrl = normalizedUrl.slice(1);
    }
    // Add https:// if missing
    if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
      normalizedUrl = `https://${normalizedUrl}`;
    }
    // Ensure alt=media for direct download
    if (!normalizedUrl.includes('alt=media')) {
      const separator = normalizedUrl.includes('?') ? '&' : '?';
      normalizedUrl = `${normalizedUrl}${separator}alt=media`;
    }
    return normalizedUrl;
  }
  
  // Already a full URL - keep as-is
  if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://') || 
      rawUrl.startsWith('data:') || rawUrl.startsWith('blob:')) {
    return rawUrl;
  }
  
  // Handle gs:// URLs (Firebase Storage SDK format)
  if (rawUrl.startsWith('gs://')) {
    return `https://storage.googleapis.com/${rawUrl.slice(5)}`;
  }
  
  // Handle storage.googleapis.com paths without scheme
  if (rawUrl.startsWith('storage.googleapis.com/')) {
    return `https://${rawUrl}`;
  }
  if (rawUrl.startsWith('/storage.googleapis.com/')) {
    return `https:/${rawUrl}`;
  }
  
  // Keep /objects/ paths as-is (they're served by our backend)
  if (rawUrl.startsWith('/objects/') || rawUrl.startsWith('objects/')) {
    return rawUrl.startsWith('/') ? rawUrl : `/${rawUrl}`;
  }
  
  // Handle legacy paths that look like Firebase Storage paths
  const firebaseBucket = import.meta.env.VITE_FIREBASE_STORAGE_BUCKET;
  if (firebaseBucket) {
    const cleanPath = rawUrl.startsWith('/') ? rawUrl.slice(1) : rawUrl;
    if (cleanPath.startsWith(firebaseBucket + '/')) {
      return `https://storage.googleapis.com/${cleanPath}`;
    }
    if (cleanPath.includes('/')) {
      return `https://storage.googleapis.com/${firebaseBucket}/${cleanPath}`;
    }
  }
  
  return rawUrl;
}

export default function CollabArenaPage() {
  const [, setLocation] = useLocation();
  const { user, isAuthenticated } = useCollabAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");
  const [arenaPosts, setArenaPosts] = useState<ArenaPost[]>([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [likesData, setLikesData] = useState<Record<string, { count: number; liked: boolean }>>({});
  const [likePending, setLikePending] = useState<Set<string>>(new Set());
  const [commentsData, setCommentsData] = useState<Record<string, any[]>>({});
  const [showComments, setShowComments] = useState<string | null>(null);
  const [commentText, setCommentText] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [displayLimit, setDisplayLimit] = useState(10);
  const [expandedPosts, setExpandedPosts] = useState<Set<string>>(new Set());
  const fetchedPostsRef = useRef<Set<string>>(new Set());
  const POSTS_PER_PAGE = 10;

  const toggleExpanded = useCallback((postId: string) => {
    setExpandedPosts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(postId)) {
        newSet.delete(postId);
      } else {
        newSet.add(postId);
      }
      return newSet;
    });
  }, []);

  const { data: myRegistration, error: registrationError } = useQuery<{
    registered: boolean; 
    verified: boolean; 
    categories: string[]; 
    status?: string;
    allowedPostLimit?: number;
    submittedPostCount?: number;
    remainingPosts?: number;
    submittedCategories?: string[];
    remainingCategories?: string[];
  }>({
    queryKey: ['/api/collab/social/arena/my-registration'],
    queryFn: async () => {
      const response = await collabFetch('/api/collab/social/arena/my-registration');
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || error.error || `Unable to load Arena registration (HTTP ${response.status})`);
      }
      return response.json();
    },
    enabled: isAuthenticated,
  });

  // Check if user has reached their post limit
  const hasReachedPostLimit = myRegistration?.verified && (myRegistration?.remainingPosts ?? 0) === 0;
  const canCreatePost = myRegistration?.verified && (myRegistration?.remainingPosts ?? 0) > 0;

  const { data: userProfile, error: userProfileError } = useQuery<{ id?: string; name?: string } | null>({
    queryKey: ['/api/collab/student-profile'],
    queryFn: async () => {
      const response = await collabFetch('/api/collab/student-profile');
      if (!response.ok) {
        if (response.status === 404) return null;
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || error.error || `Unable to load profile (HTTP ${response.status})`);
      }
      return response.json();
    },
    enabled: isAuthenticated,
  });

  const hasProfile = !!userProfile?.id;

  useEffect(() => {
    const error = registrationError || userProfileError;
    if (error) {
      toast({
        title: "Unable to load Arena account data",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    }
  }, [registrationError, userProfileError, toast]);

  useEffect(() => {
    if (!user) {
      setPostsLoading(false);
      return;
    }

    const db = getFirestore(app);
    const postsRef = collection(db, 'posts');
    const postsQuery = query(postsRef, where('type', '==', 'arena'));

    const unsubscribe = onSnapshot(postsQuery, (snapshot) => {
      const posts = snapshot.docs.map(doc => {
        const data = doc.data();
        let createdAt = new Date().toISOString();
        if (data.createdAt?.toDate) {
          createdAt = data.createdAt.toDate().toISOString();
        } else if (data.createdAt?.seconds) {
          createdAt = new Date(data.createdAt.seconds * 1000).toISOString();
        }
        return {
          id: doc.id,
          uid: data.uid,
          type: 'arena' as const,
          category: data.category || 'creative',
          description: data.description || '',
          mediaUrl: normalizeMediaUrl(data.mediaUrl),
          mediaType: data.mediaType,
          documentName: data.documentName,
          profile: data.profile ? {
            ...data.profile,
            avatarUrl: normalizeMediaUrl(data.profile.avatarUrl)
          } : undefined,
          createdAt
        };
      }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setArenaPosts(posts);
      setPostsLoading(false);
    }, (error) => {
      console.error('Error fetching arena posts:', error);
      setPostsLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleLike = useCallback(async (postId: string) => {
    if (!user) return;
    
    // Prevent multiple clicks while operation is pending
    if (likePending.has(postId)) return;
    
    // Lock the button
    setLikePending(prev => new Set(prev).add(postId));
    
    const db = getFirestore(app);
    const likeRef = doc(db, 'likes', `${postId}_${user.uid}`);
    
    // Get current state from likesData
    const currentLiked = likesData[postId]?.liked || false;
    const currentCount = likesData[postId]?.count || 0;
    
    // Optimistic update for instant feedback
    setLikesData(prev => ({
      ...prev,
      [postId]: { 
        count: currentLiked ? Math.max(0, currentCount - 1) : currentCount + 1, 
        liked: !currentLiked 
      }
    }));
    
    try {
      const likeSnap = await getDoc(likeRef);
      if (likeSnap.exists()) {
        await deleteDoc(likeRef);
      } else {
        await setDoc(likeRef, { postId, uid: user.uid, createdAt: new Date() });
      }
    } catch (error) {
      // Revert on error
      setLikesData(prev => ({
        ...prev,
        [postId]: { 
          count: currentCount,
          liked: currentLiked 
        }
      }));
    } finally {
      // Unlock the button
      setLikePending(prev => {
        const newSet = new Set(prev);
        newSet.delete(postId);
        return newSet;
      });
    }
  }, [user, likesData, likePending]);

  const handleComment = useCallback(async (postId: string) => {
    if (!user || !commentText.trim() || !userProfile) return;
    const db = getFirestore(app);
    
    // Use cached profile data instead of fetching again
    const profile = { name: userProfile.name, avatarUrl: (userProfile as any).avatarUrl };
    const text = commentText.trim();

    await addDoc(collection(db, 'comments'), {
      postId,
      uid: user.uid,
      text,
      profile,
      createdAt: new Date()
    });
    
    setCommentText("");
    setCommentsData(prev => ({
      ...prev,
      [postId]: [{ uid: user.uid, text, profile, createdAt: new Date() }, ...(prev[postId] || [])]
    }));
  }, [user, userProfile, commentText]);

  const handleRegister = () => {
    if (!isAuthenticated) {
      toast({ title: "Sign in required", description: "Please sign in to register", variant: "destructive" });
      return;
    }
    setLocation('/collab-arena/info');
  };

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'creative': return <Palette className="h-4 w-4" />;
      case 'idea': return <Lightbulb className="h-4 w-4" />;
      case 'tech': return <Code className="h-4 w-4" />;
      default: return <Star className="h-4 w-4" />;
    }
  };

  const getCategoryLabel = (cat: string) => {
    switch (cat) {
      case 'creative': return 'Creative House';
      case 'idea': return 'Idea Innovation';
      case 'tech': return 'House of Tech';
      default: return cat;
    }
  };

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'creative': return 'bg-pink-100 text-pink-700 border-pink-200';
      case 'idea': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'tech': return 'bg-blue-100 text-blue-700 border-blue-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const filteredPosts = useMemo(() => {
    const filtered = categoryFilter === 'all' 
      ? arenaPosts 
      : arenaPosts.filter(p => p.category === categoryFilter);
    return filtered.slice(0, displayLimit);
  }, [arenaPosts, categoryFilter, displayLimit]);

  const totalFilteredCount = useMemo(() => {
    return categoryFilter === 'all' 
      ? arenaPosts.length 
      : arenaPosts.filter(p => p.category === categoryFilter).length;
  }, [arenaPosts, categoryFilter]);

  const hasMorePosts = filteredPosts.length < totalFilteredCount;

  const loadMorePosts = useCallback(() => {
    setDisplayLimit(prev => prev + POSTS_PER_PAGE);
  }, []);

  // Reset pagination when category filter changes
  useEffect(() => {
    setDisplayLimit(POSTS_PER_PAGE);
  }, [categoryFilter]);

  // Fetch likes/comments only for currently displayed posts (not all posts)
  useEffect(() => {
    if (!user || filteredPosts.length === 0) return;
    
    const fetchLikesAndComments = async () => {
      const db = getFirestore(app);
      const newLikesData: Record<string, { count: number; liked: boolean }> = {};
      const newCommentsData: Record<string, any[]> = {};
      
      // Only fetch for currently displayed posts to reduce Firestore reads
      const displayedPostIds = filteredPosts.map(p => p.id);
      
      // Filter to only fetch data for posts we haven't fetched yet
      const postsToFetch = displayedPostIds.filter(id => !fetchedPostsRef.current.has(id));
      
      if (postsToFetch.length === 0) return;
      
      await Promise.all(postsToFetch.map(async (postId) => {
        const [likesSnap, commentsSnap] = await Promise.all([
          getDocs(query(collection(db, 'likes'), where('postId', '==', postId))),
          getDocs(query(collection(db, 'comments'), where('postId', '==', postId)))
        ]);
        
        const liked = likesSnap.docs.some(d => d.data().uid === user.uid);
        newLikesData[postId] = { count: likesSnap.size, liked };
        
        // Sort comments client-side to avoid composite index requirement
        const comments = commentsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        comments.sort((a: any, b: any) => {
          const aTime = a.createdAt?.seconds || 0;
          const bTime = b.createdAt?.seconds || 0;
          return bTime - aTime;
        });
        newCommentsData[postId] = comments;
        
        // Mark as fetched
        fetchedPostsRef.current.add(postId);
      }));
      
      // Merge with existing data
      setLikesData(prev => ({ ...prev, ...newLikesData }));
      setCommentsData(prev => ({ ...prev, ...newCommentsData }));
    };

    fetchLikesAndComments();
  }, [user, filteredPosts]);

  const formatTimeAgo = (date: string) => {
    const now = new Date();
    const postDate = new Date(date);
    const diff = Math.floor((now.getTime() - postDate.getTime()) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  return (
    <div className="min-h-screen bg-gray-50 overflow-y-auto pb-24">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <button 
          onClick={() => setLocation('/student-collab')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
          data-testid="button-back-to-collab"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Student Collab
        </button>

        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-full text-sm font-semibold mb-4">
            <Trophy className="h-4 w-4" />
            <span>Talent Showcase & Competition</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-3">🎯 Collab Arena</h1>
          <p className="text-gray-600">In association with the <span className="font-semibold text-blue-600">Entrepreneurship Club</span>, Ajeenkya DY Patil University</p>
        </div>

        {myRegistration?.registered && (
          <Card className="mb-6 border-0 shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${myRegistration.verified ? 'bg-green-500' : 'bg-yellow-500'}`} />
                  <span className="font-medium">
                    {myRegistration.verified ? '✅ Verified Participant' : '⏳ Verification Pending'}
                  </span>
                </div>
                <div className="flex gap-2">
                  {myRegistration.categories?.map(cat => (
                    <Badge key={cat} variant="outline" className={getCategoryColor(cat)}>
                      {getCategoryIcon(cat)} {getCategoryLabel(cat)}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs value={activeTab} onValueChange={(val) => {
          if (val === 'results') {
            setLocation('/collab-arena/results');
          } else {
            setActiveTab(val);
          }
        }} className="mb-8">
          <TabsList className={`grid w-full mb-6 ${myRegistration?.verified ? 'grid-cols-4' : 'grid-cols-3'}`}>
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              <span className="hidden md:inline">Overview</span>
              <span className="md:hidden">Info</span>
            </TabsTrigger>
            <TabsTrigger value="feed" className="flex items-center gap-2">
              <LayoutGrid className="h-4 w-4" />
              <span className="hidden md:inline">Arena Feed</span>
              <span className="md:hidden">Feed</span>
            </TabsTrigger>
            <TabsTrigger value="results" className="flex items-center gap-2">
              <Trophy className="h-4 w-4" />
              Results
            </TabsTrigger>
            {myRegistration?.verified && (
              <TabsTrigger value="create" className="flex items-center gap-2" disabled={hasReachedPostLimit}>
                <PenSquare className="h-4 w-4" />
                <span className="hidden md:inline">{hasReachedPostLimit ? 'Limit Reached' : 'Create Post'}</span>
                <span className="md:hidden">{hasReachedPostLimit ? 'Limit' : 'Post'}</span>
                {!hasProfile && !hasReachedPostLimit && <span className="text-xs text-amber-500">!</span>}
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="overview">
            <OverviewSection handleRegister={handleRegister} isAuthenticated={isAuthenticated} myRegistration={myRegistration} userEmail={user?.email} />
          </TabsContent>

          <TabsContent value="feed">
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-6">
                <button
                  onClick={() => setCategoryFilter("all")}
                  className={`px-4 py-3 rounded-xl font-medium text-sm transition-all ${
                    categoryFilter === "all"
                      ? "bg-blue-600 text-white shadow-lg"
                      : "bg-white border border-gray-200 text-gray-700 hover:border-blue-300 hover:bg-blue-50"
                  }`}
                  data-testid="filter-all"
                >
                  <span className="hidden md:inline">📋 </span>All Posts
                </button>
                <button
                  onClick={() => setCategoryFilter("creative")}
                  className={`px-4 py-3 rounded-xl font-medium text-sm transition-all ${
                    categoryFilter === "creative"
                      ? "bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-lg"
                      : "bg-white border border-gray-200 text-gray-700 hover:border-pink-300 hover:bg-pink-50"
                  }`}
                  data-testid="filter-creative"
                >
                  🎨 <span className="hidden md:inline">Creative House</span><span className="md:hidden">Creative</span>
                </button>
                <button
                  onClick={() => setCategoryFilter("idea")}
                  className={`px-4 py-3 rounded-xl font-medium text-sm transition-all ${
                    categoryFilter === "idea"
                      ? "bg-gradient-to-r from-amber-500 to-yellow-500 text-white shadow-lg"
                      : "bg-white border border-gray-200 text-gray-700 hover:border-amber-300 hover:bg-amber-50"
                  }`}
                  data-testid="filter-idea"
                >
                  💡 <span className="hidden md:inline">Idea Innovation</span><span className="md:hidden">Ideas</span>
                </button>
                <button
                  onClick={() => setCategoryFilter("tech")}
                  className={`px-4 py-3 rounded-xl font-medium text-sm transition-all ${
                    categoryFilter === "tech"
                      ? "bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg"
                      : "bg-white border border-gray-200 text-gray-700 hover:border-blue-300 hover:bg-blue-50"
                  }`}
                  data-testid="filter-tech"
                >
                  💻 <span className="hidden md:inline">House of Tech</span><span className="md:hidden">Tech</span>
                </button>
              </div>

              {postsLoading ? (
                <ArenaFeedSkeleton count={3} />
              ) : filteredPosts.length === 0 ? (
                <Card className="border-0 shadow-lg">
                  <CardContent className="p-12 text-center">
                    <Trophy className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-700 mb-2">No Arena Posts Yet</h3>
                    <p className="text-gray-500 mb-4">Be the first to showcase your talent!</p>
                    {myRegistration?.verified && canCreatePost && (
                      <Button onClick={() => setActiveTab('create')} className="bg-blue-600 hover:bg-blue-700">
                        <Plus className="h-4 w-4 mr-2" />
                        Create First Post
                      </Button>
                    )}
                    {hasReachedPostLimit && (
                      <p className="text-amber-600 font-medium">Submission limit reached for all your categories.</p>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4 md:space-y-6">
                  {filteredPosts.map(post => (
                    <div key={post.id}>
                      {/* Mobile Card - Original Arena style */}
                      <Card className="md:hidden border-0 shadow-lg bg-white overflow-hidden">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3 mb-3">
                            <Avatar className="h-10 w-10 flex-shrink-0">
                              <AvatarImage src={post.profile?.avatarUrl} />
                              <AvatarFallback className="bg-blue-600 text-white font-bold text-sm">
                                {post.profile?.name?.charAt(0) || 'U'}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <p className="font-semibold text-gray-900 truncate text-sm">{post.profile?.name || 'Anonymous'}</p>
                                  <p className="text-xs text-gray-500">{formatTimeAgo(post.createdAt)}</p>
                                </div>
                                <Badge variant="outline" className={`text-xs flex-shrink-0 whitespace-nowrap ${getCategoryColor(post.category)}`}>
                                  {getCategoryLabel(post.category)}
                                </Badge>
                              </div>
                            </div>
                          </div>
                          {/* Mobile: 2-line text with inline "more" */}
                          <div className="mb-3">
                            {expandedPosts.has(post.id) ? (
                              <p className="text-gray-800 whitespace-pre-wrap text-sm">
                                {post.description}
                                {post.description.length > 80 && (
                                  <button
                                    onClick={() => toggleExpanded(post.id)}
                                    className="text-gray-500 text-sm font-medium ml-1 active:opacity-70"
                                  >
                                    less
                                  </button>
                                )}
                              </p>
                            ) : (
                              <p className="text-gray-800 text-sm">
                                <span 
                                  className="overflow-hidden"
                                  style={{
                                    display: '-webkit-box',
                                    WebkitLineClamp: 2,
                                    WebkitBoxOrient: 'vertical' as const,
                                    lineHeight: '1.5'
                                  }}
                                >
                                  {post.description.length > 80 
                                    ? post.description.slice(0, 80) + '... '
                                    : post.description
                                  }
                                </span>
                                {post.description.length > 80 && (
                                  <button
                                    onClick={() => toggleExpanded(post.id)}
                                    className="text-gray-500 text-sm font-medium active:opacity-70"
                                  >
                                    more
                                  </button>
                                )}
                              </p>
                            )}
                          </div>
                          {post.mediaUrl && (
                            <div className="mb-4 rounded-xl overflow-hidden">
                              {post.mediaType === 'video' ? (
                                <div className="aspect-video bg-black relative">
                                  <video 
                                    src={post.mediaUrl} 
                                    controls 
                                    className="w-full h-full object-contain"
                                    preload="metadata"
                                    onError={(e) => {
                                      const target = e.target as HTMLVideoElement;
                                      const parent = target.parentElement;
                                      if (parent) {
                                        parent.innerHTML = '<div class="flex items-center justify-center h-full text-gray-400"><span>Video unavailable</span></div>';
                                      }
                                    }}
                                  />
                                </div>
                              ) : post.mediaType === 'document' ? (
                                <a 
                                  href={post.mediaUrl} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-4 p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border hover:shadow-md transition-shadow"
                                >
                                  <div className="w-14 h-14 bg-white rounded-lg shadow flex items-center justify-center flex-shrink-0">
                                    {post.documentName?.endsWith('.pdf') ? (
                                      <FileText className="h-7 w-7 text-red-500" />
                                    ) : (
                                      <File className="h-7 w-7 text-orange-500" />
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium text-gray-900 truncate">{post.documentName || 'Document'}</p>
                                    <p className="text-sm text-blue-600">Click to view</p>
                                  </div>
                                </a>
                              ) : (
                                <div className="post-media-cls-wrapper bg-gray-100 rounded-lg overflow-hidden">
                                  <img 
                                    src={post.mediaUrl} 
                                    alt="Post media" 
                                    className="post-content-image"
                                    loading="eager"
                                    onError={(e) => {
                                      const target = e.target as HTMLImageElement;
                                      target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="150" viewBox="0 0 200 150"%3E%3Crect fill="%23f3f4f6" width="200" height="150"/%3E%3Ctext x="100" y="75" text-anchor="middle" fill="%239ca3af" font-family="sans-serif" font-size="14"%3EImage unavailable%3C/text%3E%3C/svg%3E';
                                      target.onerror = null;
                                    }}
                                  />
                                </div>
                              )}
                            </div>
                          )}
                          {/* Mobile buttons - pill style */}
                          <div className="pt-3 border-t">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleLike(post.id)}
                                disabled={likePending.has(post.id)}
                                className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-full transition-all active:scale-95 ${
                                  likesData[post.id]?.liked 
                                    ? 'text-red-500 bg-red-50' 
                                    : 'text-gray-500 bg-gray-50 active:bg-red-50'
                                } ${likePending.has(post.id) ? 'opacity-50 pointer-events-none' : ''}`}
                              >
                                <Heart className={`h-5 w-5 ${likesData[post.id]?.liked ? 'fill-current' : ''}`} />
                                <span className="text-sm font-medium">{likesData[post.id]?.count || 0}</span>
                              </button>
                              <button
                                onClick={() => setShowComments(showComments === post.id ? null : post.id)}
                                className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-full transition-all active:scale-95 ${
                                  showComments === post.id
                                    ? 'text-blue-500 bg-blue-50'
                                    : 'text-gray-500 bg-gray-50 active:bg-blue-50'
                                }`}
                              >
                                <MessageSquare className="h-5 w-5" />
                                <span className="text-sm font-medium">{commentsData[post.id]?.length || 0}</span>
                              </button>
                            </div>
                          </div>
                          {showComments === post.id && (
                            <div className="mt-4 pt-4 border-t space-y-4">
                              <div className="flex gap-2">
                                <Textarea
                                  placeholder="Write a comment..."
                                  value={commentText}
                                  onChange={(e) => setCommentText(e.target.value)}
                                  className="flex-1 min-h-[60px]"
                                />
                                <Button onClick={() => handleComment(post.id)} size="sm" className="self-end">
                                  <Send className="h-4 w-4" />
                                </Button>
                              </div>
                              <div className="space-y-3 max-h-60 overflow-y-auto">
                                {(commentsData[post.id] || []).map((comment: any, idx: number) => (
                                  <div key={idx} className="flex gap-3">
                                    <Avatar className="h-8 w-8">
                                      <AvatarImage src={comment.profile?.avatarUrl} />
                                      <AvatarFallback>{comment.profile?.name?.charAt(0) || 'U'}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 bg-gray-50 rounded-lg p-3">
                                      <p className="text-sm font-medium">{comment.profile?.name || 'Anonymous'}</p>
                                      <p className="text-sm text-gray-700">{comment.text}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>

                      {/* Desktop Card - Matches Collab feed structure exactly (no Connect button) */}
                      <Card 
                        key={`desktop-${post.id}`}
                        className="hidden md:block premium-post-card"
                        data-testid={`arena-post-${post.id}`}
                      >
                        {/* Profile Section - Matches Collab feed exactly */}
                        <div className="post-profile-section">
                          <div className="post-profile-avatar cursor-pointer hover:opacity-90 transition-opacity flex-shrink-0">
                            <Avatar className="h-11 w-11">
                              <AvatarImage src={post.profile?.avatarUrl} alt={post.profile?.name || 'User'} />
                              <AvatarFallback className="bg-blue-600 text-white font-semibold text-sm">
                                {(() => {
                                  const name = post.profile?.name || post.profile?.username || 'U';
                                  const parts = name.trim().split(/\s+/);
                                  if (parts.length >= 2) {
                                    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
                                  }
                                  return name.charAt(0).toUpperCase();
                                })()}
                              </AvatarFallback>
                            </Avatar>
                          </div>
                          
                          <div className="post-profile-info flex-1 min-w-0">
                            <div className="post-profile-name-row flex-wrap">
                              <span className="font-medium truncate max-w-[120px] sm:max-w-none">{post.profile?.name || post.profile?.username || 'User'}</span>
                              <div className="dot hidden sm:block" />
                              <span className="hidden sm:inline text-gray-500 text-xs">{new Date(post.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                            </div>
                            <div className="post-profile-date">
                              <Clock className="w-3 h-3" />
                              <span>{new Date(post.createdAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</span>
                            </div>
                          </div>

                          {/* Category Badge - Arena specific (replaces Connect button position) */}
                          <Badge variant="outline" className={`text-xs flex-shrink-0 whitespace-nowrap ${getCategoryColor(post.category)}`}>
                            {getCategoryLabel(post.category)}
                          </Badge>
                        </div>

                        <CardContent className="p-0">
                          {/* Content Section - Matches Collab feed */}
                          <div className="post-content">
                            {/* Description with truncation matching Collab feed */}
                            {(() => {
                              const isExpanded = expandedPosts.has(post.id);
                              const description = post.description || '';
                              const shouldTruncate = description.length > 150 || description.split('\n').length > 3;
                              
                              return (
                                <>
                                  {(() => {
                                    const maxChars = 200;
                                    const needsTruncation = !isExpanded && shouldTruncate;
                                    const displayText = needsTruncation && description.length > maxChars 
                                      ? description.substring(0, maxChars).trim()
                                      : description;
                                    
                                    return (
                                      <p className="post-content-description">
                                        {displayText}
                                        {needsTruncation && (
                                          <span 
                                            onClick={() => toggleExpanded(post.id)}
                                            className="text-blue-500 cursor-pointer hover:text-blue-700 font-medium"
                                          >
                                            ...more
                                          </span>
                                        )}
                                      </p>
                                    );
                                  })()}
                                  
                                  {/* Media - Matches Collab feed image handling */}
                                  {post.mediaUrl && (
                                    <div className="cursor-pointer">
                                      {post.mediaType === 'video' ? (
                                        <video 
                                          src={post.mediaUrl} 
                                          className="post-content-image" 
                                          controls 
                                          muted
                                          preload="metadata"
                                          onError={(e) => {
                                            const target = e.currentTarget;
                                            target.style.display = 'none';
                                          }}
                                        />
                                      ) : post.mediaType === 'document' ? (
                                        <a 
                                          href={post.mediaUrl} 
                                          target="_blank" 
                                          rel="noopener noreferrer"
                                          className="flex items-center gap-4 p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border hover:shadow-md transition-shadow mb-3"
                                        >
                                          <div className="w-14 h-14 bg-white rounded-lg shadow flex items-center justify-center flex-shrink-0">
                                            {post.documentName?.endsWith('.pdf') ? (
                                              <FileText className="h-7 w-7 text-red-500" />
                                            ) : (
                                              <File className="h-7 w-7 text-orange-500" />
                                            )}
                                          </div>
                                          <div className="flex-1 min-w-0">
                                            <p className="font-medium text-gray-900 truncate">{post.documentName || 'Document'}</p>
                                            <p className="text-sm text-blue-600">Click to view</p>
                                          </div>
                                        </a>
                                      ) : (
                                        <img 
                                          src={post.mediaUrl} 
                                          alt="Student Collab Arena post media"
                                          className="rounded-lg mb-3 cursor-pointer transition-transform duration-300 hover:scale-[1.02]"
                                          loading="lazy"
                                          style={{ 
                                            width: '100%', 
                                            aspectRatio: '3/2',
                                            objectFit: 'cover',
                                            display: 'block'
                                          }}
                                          decoding="async"
                                          onError={(e) => {
                                            const target = e.currentTarget;
                                            target.style.display = 'none';
                                          }}
                                        />
                                      )}
                                    </div>
                                  )}
                                </>
                              );
                            })()}
                          </div>

                          {/* Interaction Footer - Matches Collab feed (Like, Comment only - no Share for Arena) */}
                          <div className="border-t border-gray-200">
                            <div className="px-4 py-2.5 flex items-center justify-between">
                              <div className="flex items-center justify-around flex-1 gap-1">
                                {/* Like Button */}
                                <button 
                                  onClick={() => handleLike(post.id)}
                                  disabled={likePending.has(post.id)}
                                  className={`flex items-center justify-center gap-1.5 py-1.5 px-2 transition-all duration-200 border-0 outline-none bg-transparent active:scale-95 text-sm font-medium hover:scale-105 flex-1 ${
                                    likesData[post.id]?.liked 
                                      ? 'text-red-500' 
                                      : 'text-gray-600 hover:text-gray-900'
                                  } ${likePending.has(post.id) ? 'opacity-50 pointer-events-none' : ''}`}
                                >
                                  <Heart 
                                    className={`h-4 w-4 transition-all duration-200 flex-shrink-0 ${
                                      likesData[post.id]?.liked 
                                        ? 'fill-current' 
                                        : ''
                                    }`} 
                                  />
                                  {likesData[post.id]?.count > 0 ? (
                                    <span>{likesData[post.id].count} Like</span>
                                  ) : (
                                    <span>Like</span>
                                  )}
                                </button>
                                
                                {/* Comment Button */}
                                <button 
                                  onClick={() => setShowComments(showComments === post.id ? null : post.id)}
                                  className="flex items-center justify-center gap-1.5 py-1.5 px-2 text-gray-600 hover:text-gray-900 transition-all duration-200 border-0 outline-none bg-transparent active:scale-95 text-sm font-medium hover:scale-105 flex-1"
                                >
                                  <MessageSquare className="h-4 w-4 flex-shrink-0" />
                                  <span>Comment</span>
                                  {commentsData[post.id]?.length > 0 && (
                                    <span className="text-xs">({commentsData[post.id].length})</span>
                                  )}
                                </button>
                              </div>
                            </div>
                          </div>
                        </CardContent>

                        {/* Comments Section */}
                        {showComments === post.id && (
                          <div className="border-t border-gray-100 bg-gray-50 p-4 space-y-4">
                            <div className="flex gap-2">
                              <Textarea
                                placeholder="Write a comment..."
                                value={commentText}
                                onChange={(e) => setCommentText(e.target.value)}
                                className="flex-1 min-h-[60px]"
                              />
                              <Button onClick={() => handleComment(post.id)} size="sm" className="self-end">
                                <Send className="h-4 w-4" />
                              </Button>
                            </div>
                            <div className="space-y-3 max-h-60 overflow-y-auto">
                              {(commentsData[post.id] || []).map((comment: any, idx: number) => (
                                <div key={idx} className="flex gap-3">
                                  <Avatar className="h-8 w-8 flex-shrink-0">
                                    <AvatarImage src={comment.profile?.avatarUrl} />
                                    <AvatarFallback className="bg-blue-600 text-white text-xs">
                                      {(comment.profile?.name)?.charAt(0).toUpperCase() || 'U'}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1 bg-white rounded-lg p-3 shadow-sm">
                                    <p className="text-sm font-semibold text-gray-900">{comment.profile?.name || 'Anonymous'}</p>
                                    <p className="text-sm text-gray-700">{comment.text}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </Card>
                    </div>
                  ))}
                  
                  {/* Load More Button */}
                  {hasMorePosts && (
                    <div className="text-center py-6">
                      <Button 
                        onClick={loadMorePosts}
                        variant="outline"
                        className="px-8"
                      >
                        <Loader2 className="h-4 w-4 mr-2 hidden" />
                        Load More Posts ({totalFilteredCount - filteredPosts.length} remaining)
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </TabsContent>

          {myRegistration?.verified && (
            <TabsContent value="create">
              {hasReachedPostLimit ? (
                <Card className="border-0 shadow-lg">
                  <CardContent className="p-8 text-center">
                    <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Trophy className="h-8 w-8 text-amber-600" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Submission Limit Reached</h3>
                    <p className="text-gray-600 mb-4">
                      You have already submitted posts for all your registered categories.
                    </p>
                    <div className="flex flex-wrap gap-2 justify-center mb-4">
                      {myRegistration.submittedCategories?.map(cat => (
                        <Badge key={cat} className="bg-green-100 text-green-800 border-green-300">
                          ✓ {cat.charAt(0).toUpperCase() + cat.slice(1)} - Submitted
                        </Badge>
                      ))}
                    </div>
                    <p className="text-sm text-gray-500">
                      To submit more entries, register for additional categories.
                    </p>
                  </CardContent>
                </Card>
              ) : hasProfile ? (
                <CreatePostSection categories={myRegistration.remainingCategories || myRegistration.categories} />
              ) : (
                <Card className="border-0 shadow-lg">
                  <CardContent className="p-8 text-center">
                    <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Users className="h-8 w-8 text-amber-600" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Profile Required</h3>
                    <p className="text-gray-600 mb-6">
                      You need to create your Student Collab profile before posting in the Arena. 
                      Your profile helps others know who you are and showcases your work.
                    </p>
                    <Button 
                      onClick={() => setLocation('/student-collab/profile/create')}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Users className="h-4 w-4 mr-2" />
                      Create Your Profile
                    </Button>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
}

const ADMIN_EMAIL = PLATFORM_ADMIN_EMAIL;

function OverviewSection({ handleRegister, isAuthenticated, myRegistration, userEmail }: { handleRegister: () => void; isAuthenticated: boolean; myRegistration?: any; userEmail?: string }) {
  const isAdmin = userEmail === ADMIN_EMAIL;
  
  return (
    <div className="space-y-6">
      <Card className="border-0 shadow-lg bg-white/80 backdrop-blur">
        <CardContent className="p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Target className="h-5 w-5 text-blue-600" />
            About Collab Arena
          </h2>
          <div className="space-y-3 text-gray-700">
            <p>Collab Arena is a competitive talent showcase where students submit their best work and get evaluated on skills, originality, and quality.</p>
            <p>Participants can submit previously created work or work created during the event timeline.</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-3 gap-4">
        <Card className="border-0 shadow-lg bg-gradient-to-br from-pink-50 to-rose-50">
          <CardContent className="p-6 text-center">
            <Palette className="h-10 w-10 text-pink-500 mx-auto mb-3" />
            <h3 className="font-bold text-gray-900 mb-2">🎨 Creative House</h3>
            <p className="text-sm text-gray-600">Art, sketches, poems, dance, drama, photography</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-lg bg-gradient-to-br from-amber-50 to-yellow-50">
          <CardContent className="p-6 text-center">
            <Lightbulb className="h-10 w-10 text-amber-500 mx-auto mb-3" />
            <h3 className="font-bold text-gray-900 mb-2">💡 Idea Innovation</h3>
            <p className="text-sm text-gray-600">Startup ideas, business models, social impact</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-indigo-50">
          <CardContent className="p-6 text-center">
            <Code className="h-10 w-10 text-blue-500 mx-auto mb-3" />
            <h3 className="font-bold text-gray-900 mb-2">💻 House of Tech</h3>
            <p className="text-sm text-gray-600">Websites, apps, software, hardware projects</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-0 shadow-lg bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 text-white">
        <CardContent className="p-6">
          <h2 className="text-xl font-bold mb-4 text-center">🏆 Prize Pool</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-white/20 backdrop-blur rounded-xl p-4 text-center">
              <h3 className="font-bold mb-2">Creative House</h3>
              <p className="font-semibold">Winner: ₹5,000</p>
              <p className="text-sm opacity-90">Runner-up: ₹3,000</p>
            </div>
            <div className="bg-white/20 backdrop-blur rounded-xl p-4 text-center">
              <h3 className="font-bold mb-2">Idea Innovation</h3>
              <p className="font-semibold">Winner: ₹5,000</p>
              <p className="text-sm opacity-90">Runner-up: ₹3,000</p>
            </div>
            <div className="bg-white/20 backdrop-blur rounded-xl p-4 text-center">
              <h3 className="font-bold mb-2">House of Tech</h3>
              <p className="font-semibold">Winner: ₹10,000</p>
              <p className="text-sm opacity-90">Runner-up: ₹8,000</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-lg bg-gradient-to-r from-green-500 to-emerald-600 text-white">
        <CardContent className="p-6 text-center">
          <h2 className="text-xl font-bold mb-2">💰 Registration Fee: ₹50 per category</h2>
          <p className="text-green-100">Entry confirmed after payment verification</p>
        </CardContent>
      </Card>

      {!myRegistration?.registered && (
        <div className="text-center">
          {isAdmin ? (
            <Button 
              size="lg"
              onClick={handleRegister}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-12 py-6 text-lg rounded-2xl shadow-lg"
              data-testid="button-register-arena"
            >
              <Sparkles className="h-5 w-5 mr-2" />
              Register for Collab Arena
            </Button>
          ) : (
            <Card className="border-0 shadow-lg bg-red-50 border-red-200">
              <CardContent className="p-6 text-center">
                <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-3" />
                <h3 className="font-bold text-red-700 mb-2">Registration Closed</h3>
                <p className="text-red-600 text-sm">
                  Registration for Collab Arena has ended. You can still view all submissions in the Arena Feed.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

function CreatePostSection({ categories }: { categories: string[] }) {
  const { toast } = useToast();
  const [description, setDescription] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(categories[0] || "");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = { current: null as HTMLInputElement | null };

  const getAcceptedFileTypes = (category: string) => {
    return "image/*,video/*,.pdf,.ppt,.pptx,.doc,.docx";
  };

  const getFileTypeInfo = (category: string) => {
    return "Images, videos, PDF, PPT, or documents";
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({ title: "File too large", description: "Maximum file size is 50MB", variant: "destructive" });
      return;
    }

    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    const isPDF = file.type === 'application/pdf';
    const isPPT = file.type.includes('presentation') || file.name.endsWith('.ppt') || file.name.endsWith('.pptx');
    const isDoc = file.type.includes('word') || file.name.endsWith('.doc') || file.name.endsWith('.docx');

    if (!isImage && !isVideo && !isPDF && !isPPT && !isDoc) {
      toast({ title: "Invalid file type", description: "Please upload an image, video, PDF, PPT, or document", variant: "destructive" });
      return;
    }

    setSelectedFile(file);

    if (isImage) {
      const reader = new FileReader();
      reader.onload = (e) => setFilePreview(e.target?.result as string);
      reader.readAsDataURL(file);
    } else if (isVideo) {
      setFilePreview(URL.createObjectURL(file));
    } else {
      setFilePreview(null);
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    setFilePreview(null);
  };

  const getFileTypeDisplay = (file: File) => {
    if (file.type.startsWith('image/')) return 'image';
    if (file.type.startsWith('video/')) return 'video';
    if (file.type === 'application/pdf') return 'pdf';
    if (file.type.includes('presentation') || file.name.endsWith('.ppt') || file.name.endsWith('.pptx')) return 'ppt';
    if (file.type.includes('word') || file.name.endsWith('.doc') || file.name.endsWith('.docx')) return 'doc';
    return 'file';
  };

  const handleSubmit = async () => {
    if (!description.trim()) {
      toast({ title: "Description required", variant: "destructive" });
      return;
    }
    if (!selectedCategory) {
      toast({ title: "Select a category", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      let mediaUrl = undefined;
      let mediaType: 'image' | 'video' | 'document' | undefined = undefined;
      let documentName = undefined;

      // Helper function with retry logic for fetch requests
      const fetchWithRetry = async (url: string, options: RequestInit, maxRetries = 3) => {
        let lastError: Error | null = null;
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 45000); // 45s timeout for uploads
            
            const response = await collabFetch(url, {
              ...options,
              signal: controller.signal,
            });
            
            clearTimeout(timeoutId);
            return response;
          } catch (error: any) {
            lastError = error;
            // Only retry on network errors
            if (attempt < maxRetries && (error.name === 'AbortError' || error.message === 'Failed to fetch')) {
              await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
              continue;
            }
            throw error;
          }
        }
        throw lastError || new Error('Failed after multiple attempts');
      };

      if (selectedFile) {
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('type', 'arena-post');

        const uploadResponse = await fetchWithRetry('/api/collab/social/upload-media', {
          method: 'POST',
          body: formData
        });

        if (!uploadResponse.ok) {
          const errData = await uploadResponse.json().catch(() => ({}));
          throw new Error(errData.error || 'Failed to upload file. Please try again.');
        }

        const uploadData = await uploadResponse.json();
        mediaUrl = uploadData.mediaUrl;

        const fileType = getFileTypeDisplay(selectedFile);
        if (fileType === 'image') mediaType = 'image';
        else if (fileType === 'video') mediaType = 'video';
        else {
          mediaType = 'document';
          documentName = selectedFile.name;
        }
      }

      const response = await fetchWithRetry('/api/collab/social/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: 'arena',
          category: selectedCategory,
          description: description.trim(),
          mediaUrl,
          mediaType,
          documentName
        })
      });

      if (!response.ok) {
        const error = await response.json();
        if (error.needsProfile) {
          toast({ 
            title: "Profile Required", 
            description: "Please create your Student Collab profile first to post in the Arena.", 
            variant: "destructive",
            action: (
              <Button size="sm" variant="outline" onClick={() => window.location.href = '/collab-org-selector'}>
                Build Profile
              </Button>
            )
          });
          return;
        }
        if (error.alreadySubmitted) {
          toast({ 
            title: "Already Submitted", 
            description: error.error, 
            variant: "destructive" 
          });
          return;
        }
        throw new Error(error.error || 'Failed to create post');
      }

      toast({ title: "Post created!", description: "Your arena submission is live." });
      setDescription("");
      setSelectedFile(null);
      setFilePreview(null);
    } catch (error: any) {
      const errorMessage = error.message === 'Failed to fetch' 
        ? 'Network error. Please check your connection and try again.'
        : error.message;
      toast({ title: "Error", description: errorMessage, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getCategoryLabel = (cat: string) => {
    switch (cat) {
      case 'creative': return '🎨 Creative House';
      case 'idea': return '💡 Idea Innovation';
      case 'tech': return '💻 House of Tech';
      default: return cat;
    }
  };

  return (
    <Card className="border-0 shadow-lg">
      <CardContent className="p-6 space-y-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-2 flex items-center gap-2">
            <PenSquare className="h-5 w-5 text-blue-600" />
            Create Arena Post
          </h2>
          <p className="text-gray-600 text-sm">Share your project, artwork, or idea for the competition</p>
        </div>

        <div className="space-y-4">
          <div>
            <Label className="mb-2 block">Category *</Label>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map(cat => (
                  <SelectItem key={cat} value={cat}>{getCategoryLabel(cat)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="mb-2 block">Description *</Label>
            <Textarea
              placeholder="Describe your project, what you built, your creative work, or your idea..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[150px]"
            />
          </div>

          <div>
            <Label className="mb-2 block">Upload Media</Label>
            <input
              type="file"
              ref={(el) => fileInputRef.current = el}
              accept={getAcceptedFileTypes(selectedCategory)}
              onChange={handleFileSelect}
              className="hidden"
            />
            
            {selectedFile ? (
              <div className="relative border-2 border-dashed border-gray-300 rounded-xl p-4">
                <button
                  type="button"
                  onClick={removeFile}
                  className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 z-10"
                >
                  <X className="h-4 w-4" />
                </button>
                
                {filePreview && selectedFile.type.startsWith('image/') && (
                  <div className="aspect-[4/5] max-w-xs mx-auto overflow-hidden rounded-lg">
                    <img 
                      src={filePreview} 
                      alt="Preview" 
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                )}
                
                {filePreview && selectedFile.type.startsWith('video/') && (
                  <div className="aspect-video max-w-md mx-auto overflow-hidden rounded-lg">
                    <video 
                      src={filePreview} 
                      controls 
                      className="w-full h-full object-contain"
                    />
                  </div>
                )}
                
                {!filePreview && (
                  <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      {selectedFile.name.endsWith('.pdf') ? (
                        <FileText className="h-6 w-6 text-red-500" />
                      ) : (
                        <File className="h-6 w-6 text-orange-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{selectedFile.name}</p>
                      <p className="text-sm text-gray-500">
                        {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-blue-400 hover:bg-blue-50 transition-colors"
              >
                <Upload className="h-10 w-10 text-gray-400 mx-auto mb-3" />
                <p className="font-medium text-gray-700">Click to upload</p>
                <p className="text-sm text-gray-500 mt-1">{getFileTypeInfo(selectedCategory)}</p>
                <p className="text-xs text-gray-400 mt-2">Max 50MB</p>
              </button>
            )}
          </div>
        </div>

        {/* Mandatory Submission Guidelines */}
        <div className="bg-amber-50 border-2 border-amber-400 rounded-xl p-4 space-y-3">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-6 w-6 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-amber-900 text-lg">IMPORTANT SUBMISSION GUIDELINES</h3>
            </div>
          </div>
          
          <ul className="list-disc list-inside text-sm text-amber-900 space-y-1 ml-1">
            <li><strong>Only original content is allowed.</strong></li>
            <li>Fake, copied, AI-generated, or plagiarized submissions will be <strong>immediately disqualified</strong>.</li>
            <li>Misleading information in the description will lead to post removal without review.</li>
            <li>The content and the description are <strong>both evaluated</strong>.</li>
          </ul>

          {selectedCategory === 'creative' && (
            <div className="bg-pink-100 border border-pink-300 rounded-lg p-3 mt-2">
              <p className="font-semibold text-pink-800 mb-1">Creative House Requirements:</p>
              <ul className="list-disc list-inside text-sm text-pink-800 space-y-0.5">
                <li>What type of art this is (design, video, illustration, music, photography, etc.)</li>
                <li>Tools or software used</li>
                <li>Brief idea or inspiration behind the work</li>
              </ul>
            </div>
          )}

          {selectedCategory === 'tech' && (
            <div className="bg-blue-100 border border-blue-300 rounded-lg p-3 mt-2">
              <p className="font-semibold text-blue-800 mb-1">House of Tech Requirements:</p>
              <ul className="list-disc list-inside text-sm text-blue-800 space-y-0.5">
                <li>The problem you are solving</li>
                <li>Technology, software, or tools used</li>
                <li>Whether it is a concept, prototype, or working solution</li>
                <li>Your role (solo or team)</li>
              </ul>
            </div>
          )}

          {selectedCategory === 'idea' && (
            <div className="bg-yellow-100 border border-yellow-400 rounded-lg p-3 mt-2">
              <p className="font-semibold text-yellow-800 mb-1">Innovative Ideas Requirements:</p>
              <ul className="list-disc list-inside text-sm text-yellow-800 space-y-0.5">
                <li>The problem statement</li>
                <li>Your proposed solution</li>
                <li>Target users or industry</li>
                <li>Current stage (idea / MVP / tested)</li>
              </ul>
            </div>
          )}

          <p className="text-xs font-semibold text-amber-800 border-t border-amber-300 pt-3 mt-3">
            Collab Arena is for serious creators and builders. Low-effort or fake submissions will not be tolerated. Final decision rests with the Collab Arena team.
          </p>
        </div>

        <Button 
          onClick={handleSubmit} 
          disabled={isSubmitting || !description.trim()}
          className="w-full bg-blue-600 hover:bg-blue-700"
        >
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
          Submit to Arena
        </Button>
      </CardContent>
    </Card>
  );
}
