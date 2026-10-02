import { useState, useEffect, lazy, Suspense } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Heart, MessageSquare, Send, Users, Loader2, X, UserPlus, UserCheck, Star, Trophy, Clock, Bookmark, TrendingUp, CalendarDays, ExternalLink, MoreVertical, Trash2 } from "lucide-react";
import { FeedSkeleton } from "@/components/ui/skeletons";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useCollabAuth } from "@/hooks/use-collab-auth";
import { queryClient } from "@/lib/queryClient";
import { ConnectionButton } from "./connection-button";
import { getFirestore, collection, query, orderBy, onSnapshot, Timestamp } from "firebase/firestore";
import app, { collabFetch } from "@/lib/firebase";

const ShareModal = lazy(() => import("./share-modal").then(m => ({ default: m.ShareModal })));

interface Post {
  id: string;
  userId: number;
  uid: string;
  type: 'direct' | 'group' | 'event' | 'arena';
  title?: string;
  description: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video';
  membersRequired?: number;
  currentMembers?: number;
  groupMembers?: string[];
  skills?: string[];
  eventDate?: string;
  eventTime?: string;
  eventLink?: string;
  createdAt: string;
}

interface PostWithProfile extends Post {
  profile?: any;
}

interface Comment {
  id: string;
  postId: string;
  userId: number;
  uid: string;
  text: string;
  createdAt: string;
  profile?: any;
}

interface SocialFeedProps {
  onSignInClick?: () => void;
}

export function SocialFeed({ onSignInClick }: SocialFeedProps = {}) {
  const { user } = useCollabAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [userProfile, setUserProfile] = useState<any>(null);
  const [selectedPost, setSelectedPost] = useState<string | null>(null);
  const [commentText, setCommentText] = useState("");
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [showReplyBox, setShowReplyBox] = useState<string | null>(null);
  const [commentLikes, setCommentLikes] = useState<Record<string, { count: number; liked: boolean }>>({});
  const [repliesData, setRepliesData] = useState<Record<string, Comment[]>>({});
  const [showComments, setShowComments] = useState<string | null>(null);
  const [connectionStatuses, setConnectionStatuses] = useState<Record<string, 'none' | 'pending' | 'connected'>>({});
  const [sharePostId, setSharePostId] = useState<string | null>(null);
  const [posts, setPosts] = useState<PostWithProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [likesData, setLikesData] = useState<Record<string, { count: number; liked: boolean }>>({});
  const [commentsData, setCommentsData] = useState<Record<string, Comment[]>>({});
  const [optimisticLikes, setOptimisticLikes] = useState<Set<string>>(new Set());
  const [joinRequestStatuses, setJoinRequestStatuses] = useState<Record<string, 'none' | 'pending' | 'accepted' | 'rejected'>>({});
  const [mediaModal, setMediaModal] = useState<{ url: string; type: 'image' | 'video' } | null>(null);
  const [expandedPosts, setExpandedPosts] = useState<Set<string>>(new Set());
  const [savedPosts, setSavedPosts] = useState<Set<string>>(new Set());
  const [deletePostId, setDeletePostId] = useState<string | null>(null);

  // Fetch current user's profile
  useEffect(() => {
    if (!user) return;

    const fetchUserProfile = async () => {
      try {
        const response = await collabFetch('/api/collab/student-profile');
        if (response.ok) {
          const profileData = await response.json();
          setUserProfile(profileData);
        }
      } catch (error) {
        console.error('Failed to fetch user profile:', error);
      }
    };

    fetchUserProfile();
  }, [user]);

  // Fetch user's saved posts
  useEffect(() => {
    if (!user) return;

    const fetchSavedPosts = async () => {
      try {
        const response = await collabFetch('/api/collab/social/saved-posts');
        if (response.ok) {
          const savedPostIds = await response.json();
          setSavedPosts(new Set(savedPostIds));
        }
      } catch (error) {
        console.error('Failed to fetch saved posts:', error);
      }
    };

    fetchSavedPosts();
  }, [user]);

  // Fetch user's join request statuses
  useEffect(() => {
    if (!user) return;

    const fetchJoinRequestStatuses = async () => {
      try {
        const response = await collabFetch('/api/collab/social/my-join-requests');
        if (response.ok) {
          const statuses = await response.json();
          setJoinRequestStatuses(statuses);
        }
      } catch (error) {
        console.error('Failed to fetch join request statuses:', error);
      }
    };

    fetchJoinRequestStatuses();
  }, [user]);

  // Real-time posts listener using Firestore onSnapshot
  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    const db = getFirestore(app);
    const postsRef = collection(db, 'posts');
    const postsQuery = query(postsRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(postsQuery, (snapshot) => {
      const postsData = snapshot.docs.map(doc => {
        const data = doc.data();
        
        // Safely handle createdAt conversion
        let createdAtString: string;
        try {
          if (data.createdAt?.toDate) {
            createdAtString = data.createdAt.toDate().toISOString();
          } else if (data.createdAt?.seconds) {
            createdAtString = new Date(data.createdAt.seconds * 1000).toISOString();
          } else {
            createdAtString = new Date().toISOString();
          }
        } catch (err) {
          console.warn('Error parsing createdAt for post:', doc.id, err);
          createdAtString = new Date().toISOString();
        }
        
        const post = {
          id: doc.id,
          userId: data.userId || 0,
          uid: data.uid || '',
          type: data.type || 'direct',
          description: data.description || '',
          mediaUrl: data.mediaUrl || undefined,
          mediaType: data.mediaType || undefined,
          membersRequired: data.membersRequired || undefined,
          currentMembers: data.currentMembers || 0,
          groupMembers: data.groupMembers || [],
          createdAt: createdAtString,
          profile: data.profile || undefined,
        } as PostWithProfile;
        
        return post;
      });
      
      // Filter out arena posts from main feed (arena posts only appear in Collab Arena)
      const mainFeedPosts = postsData.filter(post => post.type !== 'arena');
      setPosts(mainFeedPosts);
      setIsLoading(false);
    }, (error) => {
      console.error('❌ Firestore error:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      
      let errorMsg = "Failed to load posts";
      let description = "";
      
      if (error.code === 'permission-denied') {
        errorMsg = "Permission denied";
        description = "Please update Firestore rules to allow public read access for posts.";
      } else if (error.code === 'failed-precondition') {
        errorMsg = "Index required";
        description = "Check console for Firestore index creation link.";
      } else {
        description = error.message;
      }
      
      toast({ title: errorMsg, description, variant: "destructive" });
      setIsLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, [user]);

  // Fetch missing profile data for posts
  useEffect(() => {
    if (!user || posts.length === 0) return;

    const fetchMissingProfiles = async () => {
      const postsNeedingProfiles = posts.filter(post => !post.profile?.name && !post.profile?.username);
      
      if (postsNeedingProfiles.length === 0) return;

      // Fetch profiles for posts without profile data
      const profilePromises = postsNeedingProfiles.map(async (post) => {
        try {
          const response = await collabFetch(`/api/collab/social/profiles/${post.uid}`);
          if (response.ok) {
            const profileData = await response.json();
            return { postId: post.id, profile: profileData };
          }
        } catch (error) {
          console.error(`Failed to fetch profile for post ${post.id}:`, error);
        }
        return null;
      });

      const profiles = await Promise.all(profilePromises);

      // Update posts with fetched profile data
      setPosts(prevPosts => 
        prevPosts.map(post => {
          const profileMatch = profiles.find(p => p?.postId === post.id);
          if (profileMatch && profileMatch.profile) {
            // Get display name based on profile type
            const displayName = profileMatch.profile.role === 'Club' 
              ? profileMatch.profile.clubName || profileMatch.profile.name
              : profileMatch.profile.role === 'Community'
              ? profileMatch.profile.communityName || profileMatch.profile.name
              : profileMatch.profile.role === 'Company'
              ? profileMatch.profile.companyName || profileMatch.profile.name
              : profileMatch.profile.name;
            
            return {
              ...post,
              profile: {
                username: profileMatch.profile.username,
                name: displayName,
                avatarUrl: profileMatch.profile.avatarUrl,
                role: profileMatch.profile.role || 'Student'
              }
            };
          }
          return post;
        })
      );
    };

    fetchMissingProfiles();
  }, [posts.length, user]);

  // Fetch likes and comments for all posts
  useEffect(() => {
    if (!user || posts.length === 0) return;

    const abortController = new AbortController();
    
    const fetchLikesAndComments = async () => {
      // Batch fetch all likes and comments in parallel
      await Promise.all(posts.map(async (post) => {
        // Fetch likes - skip if optimistically updating
        if (!optimisticLikes.has(post.id)) {
          try {
            const likesResponse = await collabFetch(`/api/collab/social/posts/${post.id}/likes`, {
              signal: abortController.signal,
            });
            if (likesResponse.ok) {
              const likesResult = await likesResponse.json();
              setLikesData(prev => ({
                ...prev,
                [post.id]: { count: likesResult.count, liked: likesResult.liked }
              }));
            }
          } catch (error: any) {
            if (error.name !== 'AbortError') {
              console.error('Failed to fetch likes:', error);
            }
          }
        }

        // Fetch comments
        try {
            const commentsResponse = await collabFetch(`/api/collab/social/posts/${post.id}/comments`, {
            signal: abortController.signal,
          });
          if (commentsResponse.ok) {
            const commentsResult = await commentsResponse.json();
            setCommentsData(prev => ({
              ...prev,
              [post.id]: commentsResult
            }));
          }
        } catch (error: any) {
          if (error.name !== 'AbortError') {
            console.error('Failed to fetch comments:', error);
          }
        }
      }));
    };

    fetchLikesAndComments();
    
    // Listen for cross-component sync events
    const handleLikeSync = (e: CustomEvent) => {
      const { postId, count, liked } = e.detail;
      setLikesData(prev => ({
        ...prev,
        [postId]: { count, liked }
      }));
    };

    window.addEventListener('post-like-sync' as any, handleLikeSync as any);
    
    return () => {
      abortController.abort();
      window.removeEventListener('post-like-sync' as any, handleLikeSync as any);
    };
  }, [posts, user, optimisticLikes]);

  // Fetch comment likes and replies when comments are shown
  useEffect(() => {
    if (!user || !showComments) return;

    const abortController = new AbortController();
    const postComments = commentsData[showComments] || [];

    const fetchCommentData = async () => {
      await Promise.all(postComments.map(async (comment) => {
        // Fetch comment likes
        try {
          const likesResponse = await collabFetch(`/api/collab/social/comments/${comment.id}/likes`, {
            signal: abortController.signal,
          });
          if (likesResponse.ok) {
            const likesResult = await likesResponse.json();
            setCommentLikes(prev => ({
              ...prev,
              [comment.id]: { count: likesResult.count, liked: likesResult.liked }
            }));
          }
        } catch (error: any) {
          if (error.name !== 'AbortError') {
            console.error('Failed to fetch comment likes:', error);
          }
        }

        // Fetch replies
        try {
          const repliesResponse = await collabFetch(`/api/collab/social/comments/${comment.id}/replies`, {
            signal: abortController.signal,
          });
          if (repliesResponse.ok) {
            const repliesResult = await repliesResponse.json();
            setRepliesData(prev => ({
              ...prev,
              [comment.id]: repliesResult
            }));
          }
        } catch (error: any) {
          if (error.name !== 'AbortError') {
            console.error('Failed to fetch replies:', error);
          }
        }
      }));
    };

    fetchCommentData();

    return () => {
      abortController.abort();
    };
  }, [showComments, commentsData, user]);

  // Helper to check if user has profile
  const requireProfile = (action: string): boolean => {
    if (!userProfile) {
      toast({
        title: "Profile required",
        description: `Please create your profile before you can ${action}.`,
        variant: "destructive"
      });
      return false;
    }
    return true;
  };

  // Like mutation with optimistic update
  const likeMutation = useMutation({
    mutationFn: async (postId: string) => {
      // Check for profile before liking
      if (!userProfile) {
        throw new Error('Profile required');
      }
      const response = await collabFetch(`/api/collab/social/posts/${postId}/like`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to like post');
      return response.json();
    },
    onMutate: async (postId) => {
      // Mark as optimistically updating
      setOptimisticLikes(prev => new Set(prev).add(postId));
      
      // Optimistic update
      setLikesData(prev => {
        const current = prev[postId] || { count: 0, liked: false };
        return {
          ...prev,
          [postId]: {
            count: current.liked ? current.count - 1 : current.count + 1,
            liked: !current.liked
          }
        };
      });
    },
    onSuccess: (data, postId) => {
      // Sync with server response
      setLikesData(prev => ({
        ...prev,
        [postId]: {
          count: data.count,
          liked: data.liked
        }
      }));
      
      // Dispatch custom event for cross-component sync
      window.dispatchEvent(new CustomEvent('post-like-sync', {
        detail: { postId, count: data.count, liked: data.liked }
      }));
    },
    onError: (error, postId) => {
      // Revert optimistic update on error silently
      setLikesData(prev => {
        const current = prev[postId] || { count: 0, liked: false };
        return {
          ...prev,
          [postId]: {
            count: current.liked ? current.count - 1 : current.count + 1,
            liked: !current.liked
          }
        };
      });
      // Silently handle error - do not show toast to user
    },
    onSettled: (data, error, postId) => {
      // Clear optimistic flag
      setOptimisticLikes(prev => {
        const newSet = new Set(prev);
        newSet.delete(postId);
        return newSet;
      });
    },
  });

  // Comment mutation with optimistic update
  const commentMutation = useMutation({
    mutationFn: async ({ postId, text }: { postId: string; text: string }) => {
      const response = await collabFetch(`/api/collab/social/posts/${postId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
      });
      if (!response.ok) throw new Error('Failed to comment');
      return response.json();
    },
    onMutate: async ({ postId, text }) => {
      setCommentText("");
      
      const optimisticComment: Comment = {
        id: `temp-${Date.now()}`,
        postId,
        userId: user?.id || 0,
        uid: user?.uid || '',
        text,
        createdAt: new Date().toISOString(),
        profile: {
          name: user?.username || 'You',
          username: user?.username || 'You',
          avatarUrl: undefined,
          role: 'Student'
        }
      };
      
      setCommentsData(prev => ({
        ...prev,
        [postId]: [optimisticComment, ...(prev[postId] || [])]
      }));
      
      return { previousComments: commentsData[postId] };
    },
    onSuccess: async (_, variables) => {
      try {
        const commentsResponse = await collabFetch(`/api/collab/social/posts/${variables.postId}/comments`, {
        });
        if (commentsResponse.ok) {
          const commentsResult = await commentsResponse.json();
          setCommentsData(prev => ({
            ...prev,
            [variables.postId]: commentsResult
          }));
        }
      } catch (error) {
        console.error('Failed to refresh comments:', error);
      }
    },
    onError: (error: any, variables, context: any) => {
      if (context?.previousComments) {
        setCommentsData(prev => ({
          ...prev,
          [variables.postId]: context.previousComments
        }));
      }
      setCommentText(variables.text);
    },
  });

  // Comment like mutation
  const commentLikeMutation = useMutation({
    mutationFn: async (commentId: string) => {
      const response = await collabFetch(`/api/collab/social/comments/${commentId}/like`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to like comment');
      return response.json();
    },
    onMutate: async (commentId) => {
      // Optimistic update
      setCommentLikes(prev => {
        const current = prev[commentId] || { count: 0, liked: false };
        return {
          ...prev,
          [commentId]: {
            count: current.liked ? current.count - 1 : current.count + 1,
            liked: !current.liked
          }
        };
      });
    },
    onSuccess: (data, commentId) => {
      // Sync with server response
      setCommentLikes(prev => ({
        ...prev,
        [commentId]: {
          count: data.count,
          liked: data.liked
        }
      }));
    },
    onError: (error, commentId) => {
      // Revert optimistic update on error silently
      setCommentLikes(prev => {
        const current = prev[commentId] || { count: 0, liked: false };
        return {
          ...prev,
          [commentId]: {
            count: current.liked ? current.count - 1 : current.count + 1,
            liked: !current.liked
          }
        };
      });
      // Silently handle error - do not show toast to user
    },
  });

  // Reply mutation with optimistic update
  const replyMutation = useMutation({
    mutationFn: async ({ postId, parentCommentId, text }: { postId: string; parentCommentId: string; text: string }) => {
      const response = await collabFetch(`/api/collab/social/posts/${postId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text, parentCommentId }),
      });
      if (!response.ok) throw new Error('Failed to reply');
      return response.json();
    },
    onMutate: async ({ postId, parentCommentId, text }) => {
      const currentReplyText = replyText[parentCommentId] || '';
      setReplyText(prev => ({ ...prev, [parentCommentId]: "" }));
      setShowReplyBox(null);
      
      const optimisticReply: Comment = {
        id: `temp-reply-${Date.now()}`,
        postId,
        userId: user?.id || 0,
        uid: user?.uid || '',
        text,
        createdAt: new Date().toISOString(),
        profile: {
          name: user?.username || 'You',
          username: user?.username || 'You',
          avatarUrl: undefined,
          role: 'Student'
        }
      };
      
      setRepliesData(prev => ({
        ...prev,
        [parentCommentId]: [optimisticReply, ...(prev[parentCommentId] || [])]
      }));
      
      return { previousReplies: repliesData[parentCommentId], parentCommentId, text: currentReplyText };
    },
    onSuccess: async (_, variables) => {
      try {
        const repliesResponse = await collabFetch(`/api/collab/social/comments/${variables.parentCommentId}/replies`, {
        });
        if (repliesResponse.ok) {
          const repliesResult = await repliesResponse.json();
          setRepliesData(prev => ({
            ...prev,
            [variables.parentCommentId]: repliesResult
          }));
        }
      } catch (error) {
        console.error('Failed to refresh replies:', error);
      }
    },
    onError: (error: any, variables, context: any) => {
      if (context?.previousReplies && context?.parentCommentId) {
        setRepliesData(prev => ({
          ...prev,
          [context.parentCommentId]: context.previousReplies
        }));
        setReplyText(prev => ({ ...prev, [context.parentCommentId]: context.text }));
      }
    },
  });

  // Join group mutation
  const joinMutation = useMutation({
    mutationFn: async (postId: string) => {
       const response = await collabFetch(`/api/collab/social/posts/${postId}/join`, {
         method: 'POST',
       });
      
      const data = await response.json();
      
      if (!response.ok) {
        // If request already sent, mark as pending instead of throwing error
        if (response.status === 400 && data.error?.includes('already')) {
          return { postId, alreadyPending: true };
        }
        throw new Error(data.error || 'Failed to send join request');
      }
      
      return { ...data, postId };
    },
    onMutate: async (postId) => {
      setJoinRequestStatuses(prev => ({ ...prev, [postId]: 'pending' }));
      return { postId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/collab/social/posts'] });
    },
    onError: (error: any, postId, context: any) => {
      if (context?.postId) {
        setJoinRequestStatuses(prev => ({ ...prev, [context.postId]: 'none' }));
      }
    },
  });

  // Connect mutation
  const connectMutation = useMutation({
    mutationFn: async ({ receiverId, receiverUid }: { receiverId: number; receiverUid: string }) => {
      const response = await collabFetch('/api/collab/social/connections/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ receiverId, receiverUid }),
      });
      if (!response.ok) throw new Error('Failed to send connection request');
      return response.json();
    },
    onSuccess: (_, variables) => {
      setConnectionStatuses(prev => ({ ...prev, [variables.receiverUid]: 'pending' }));
      toast({ title: "Connection request sent!" });
    },
  });

  // Save post mutation
  const saveMutation = useMutation({
    mutationFn: async (postId: string) => {
       const response = await collabFetch(`/api/collab/social/posts/${postId}/save`, {
         method: 'POST',
       });
      if (!response.ok) throw new Error('Failed to save post');
      return response.json();
    },
    onMutate: async (postId) => {
      // Optimistic update
      setSavedPosts(prev => {
        const newSet = new Set(prev);
        if (newSet.has(postId)) {
          newSet.delete(postId);
        } else {
          newSet.add(postId);
        }
        return newSet;
      });
    },
    onSuccess: (data, postId) => {
      setSavedPosts(prev => {
        const newSet = new Set(prev);
        if (data.saved) {
          newSet.add(postId);
        } else {
          newSet.delete(postId);
        }
        return newSet;
      });
    },
    onError: (error, postId) => {
      // Revert optimistic update
      setSavedPosts(prev => {
        const newSet = new Set(prev);
        if (newSet.has(postId)) {
          newSet.delete(postId);
        } else {
          newSet.add(postId);
        }
        return newSet;
      });
    },
  });

  // Delete post mutation
  const deleteMutation = useMutation({
    mutationFn: async (postId: string) => {
      const response = await collabFetch(`/api/collab/social/posts/${postId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete post');
      return { postId };
    },
    onSuccess: (data) => {
      // Remove the deleted post from local state for immediate UI update
      setPosts(prev => prev.filter(p => p.id !== data.postId));
      toast({ title: "Deleted successfully" });
      setDeletePostId(null);
      queryClient.invalidateQueries({ queryKey: ['/api/collab/social/posts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/collab/social/events'] });
    },
    onError: () => {
      setDeletePostId(null);
      toast({ title: "Failed to delete", variant: "destructive" });
    },
  });

  // Toggle post expansion
  const togglePostExpansion = (postId: string) => {
    setExpandedPosts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(postId)) {
        newSet.delete(postId);
      } else {
        newSet.add(postId);
      }
      return newSet;
    });
  };

  // Fetch connection status for a user
  const fetchConnectionStatus = async (uid: string) => {
    if (!user || uid === user.uid) return;
    try {
      const response = await collabFetch(`/api/collab/social/connections/status/${uid}`);
      const { status } = await response.json();
      setConnectionStatuses(prev => ({ ...prev, [uid]: status }));
    } catch (error) {
      console.error('Failed to fetch connection status:', error);
    }
  };

  if (!user) {
    return (
      <div className="w-full mx-auto mt-4">
        <Card className="bg-white rounded-xl border-0 shadow-[0_2px_6px_rgba(0,0,0,0.08)]">
          <CardContent className="p-6 text-center">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Join Student Collab</h3>
            <p className="text-sm text-gray-600 mb-4">Sign in to see posts and connect with students</p>
            <Button 
              className="w-full bg-blue-600 hover:bg-blue-700"
              onClick={() => {
                if (onSignInClick) {
                  onSignInClick();
                }
              }}
              data-testid="button-feed-sign-in"
            >
              Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return <FeedSkeleton count={4} />;
  }

  if (posts.length === 0) {
    return (
      <div className="w-full mx-auto mt-4">
        <Card className="bg-white rounded-xl border-0 shadow-[0_2px_6px_rgba(0,0,0,0.08)]">
          <CardContent className="p-4 text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No posts yet</h3>
            <p className="text-sm text-gray-600">Be the first to share something!</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full mx-auto mt-4 space-y-4">
      {posts.map((post) => (
        <Card 
          key={post.id} 
          className="premium-post-card"
          data-testid={`post-${post.id}`}
        >

          {/* Profile Section - 48x48 Avatar, Username, Date, Clock Icon + Connect Button */}
          <div className="post-profile-section">
            <div 
              className="post-profile-avatar cursor-pointer hover:opacity-90 transition-opacity flex-shrink-0"
              onClick={() => {
                if (post.uid === user.uid) {
                  setLocation('/collab-profile');
                } else if (post.profile?.username) {
                  setLocation(`/u/${post.profile.username}`);
                } else {
                  setLocation(`/collab-profile/${post.uid}`);
                }
              }}
              data-testid={`profile-link-${post.id}`}
            >
              <Avatar className="h-11 w-11">
                {post.profile?.avatarUrl && (
                  <AvatarImage src={post.profile.avatarUrl} alt={post.profile.username || post.profile.name} />
                )}
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
                <span
                  className="font-medium truncate max-w-[120px] sm:max-w-none cursor-pointer hover:underline"
                  onClick={() => {
                    if (post.uid === user.uid) {
                      setLocation('/collab-profile');
                    } else if (post.profile?.username) {
                      setLocation(`/u/${post.profile.username}`);
                    } else {
                      setLocation(`/collab-profile/${post.uid}`);
                    }
                  }}
                >{post.profile?.name || post.profile?.username || 'User'}</span>
                <div className="dot hidden sm:block" />
                <span className="hidden sm:inline text-gray-500 text-xs">{new Date(post.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
              </div>
              <div className="post-profile-date">
                <Clock className="w-3 h-3" />
                <span>{new Date(post.createdAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</span>
              </div>
            </div>

            {/* Connect Button - Right side, inline */}
            {post.uid !== user.uid && user && user.id && user.uid && (
              <div className="post-connect-wrapper flex-shrink-0">
                <ConnectionButton
                  targetUid={post.uid}
                  targetUserId={post.userId.toString()}
                  targetName={post.profile?.name || post.profile?.username || 'User'}
                  showMessage={false}
                />
              </div>
            )}

            {/* Post Options Menu - Only for post owner */}
            {post.uid === user?.uid && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-11 w-11 flex-shrink-0" data-testid={`button-post-options-${post.id}`}>
                    <MoreVertical className="h-4 w-4 text-gray-500" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem 
                    onClick={() => setDeletePostId(post.id)}
                    className="text-red-600 focus:text-red-600"
                    data-testid={`button-delete-post-${post.id}`}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete {post.type === 'event' ? 'Event' : 'Post'}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          <CardContent className="p-0">
          {/* Content Section */}
          <div className="post-content">

            {/* Title - Bold */}
            {post.title && (
              <h3 className="text-lg font-bold text-gray-900 mb-3">{post.title}</h3>
            )}

            {/* Event Info - Date, Time, Link */}
            {post.type === 'event' && (post.eventDate || post.eventTime || post.eventLink) && (
              <div className="flex flex-wrap items-center gap-3 mb-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
                {post.eventDate && (
                  <div className="flex items-center gap-1.5 text-blue-700">
                    <CalendarDays className="h-4 w-4" />
                    <span className="text-sm font-medium">
                      {new Date(post.eventDate + 'T00:00:00').toLocaleDateString('en-US', { 
                        weekday: 'short', 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </span>
                  </div>
                )}
                {post.eventTime && (
                  <div className="flex items-center gap-1.5 text-blue-700">
                    <Clock className="h-4 w-4" />
                    <span className="text-sm font-medium">
                      {(() => {
                        try {
                          const [hours, minutes] = post.eventTime.split(':');
                          if (!hours || isNaN(parseInt(hours))) return post.eventTime;
                          const date = new Date();
                          date.setHours(parseInt(hours), parseInt(minutes || '0'));
                          return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
                        } catch {
                          return post.eventTime;
                        }
                      })()}
                    </span>
                  </div>
                )}
                {post.eventLink && (
                  <a 
                    href={post.eventLink} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-blue-600 hover:text-blue-800 transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ExternalLink className="h-4 w-4" />
                    <span className="text-sm font-medium">Join Event</span>
                  </a>
                )}
              </div>
            )}

            {/* Description - 14px */}
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
                            onClick={() => togglePostExpansion(post.id)}
                            className="text-blue-500 cursor-pointer hover:text-blue-700 font-medium"
                            data-testid={`button-expand-${post.id}`}
                          >
                            ...more
                          </span>
                        )}
                      </p>
                    );
                  })()}
                  
                  {/* Image/Video - Always show media directly in feed */}
                  {post.mediaUrl && (
                    <div className="post-media-cls-wrapper cursor-pointer" onClick={() => setMediaModal({ url: post.mediaUrl!, type: post.mediaType || 'image' })}>
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
                      ) : (
                        <img 
                          src={post.mediaUrl} 
                          alt="" 
                          className="post-content-image"
                          loading="lazy"
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
              
            {/* Tags - Small pills with outline */}
            {post.type === 'group' && post.skills && post.skills.length > 0 && (
              <div className="post-tags-section">
                {post.skills.slice(0, 4).map((skill: string, idx: number) => (
                  <span key={idx} className="post-tag-pill">{skill}</span>
                ))}
              </div>
            )}
          </div>

          {/* Members Section - Show for group posts only */}
          {post.type === 'group' && (post.membersRequired || 0) > 0 && (
            <div className="px-4 py-2 flex items-center gap-2 text-sm text-gray-600">
              <Users className="h-4 w-4 flex-shrink-0" />
              <span className="font-medium">{post.currentMembers || 0}/{post.membersRequired} members</span>
              <span className="text-gray-400">•</span>
              <Badge 
                variant="outline" 
                className="text-xs px-2 py-0.5 bg-green-50 text-green-700 border-green-200"
              >
                {(post.currentMembers || 0) >= (post.membersRequired || 1) ? 'Full' : 'Spots Available'}
              </Badge>
            </div>
          )}

          {/* Interaction Footer - Like, Comment, Share evenly spaced */}
          <div className="border-t border-gray-200">
            <div className="px-4 py-2.5 flex items-center justify-between">
              {/* Like, Comment, Share - Evenly Spaced */}
              <div className="flex items-center justify-around flex-1 gap-1">
                {/* Like Button */}
                <button 
                  onClick={() => {
                    if (!requireProfile('like posts')) return;
                    likeMutation.mutate(post.id);
                  }}
                  disabled={optimisticLikes.has(post.id)}
                  className={`post-action-btn transition-all duration-200 disabled:opacity-50 active:scale-95 text-xs sm:text-sm font-medium hover:scale-105 ${
                    likesData[post.id]?.liked 
                      ? 'text-red-500' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                  data-testid={`button-like-${post.id}`}
                >
                  <Heart 
                    className={`h-3.5 w-3.5 sm:h-4 sm:w-4 transition-all duration-200 flex-shrink-0 ${
                      likesData[post.id]?.liked 
                        ? 'fill-current' 
                        : ''
                    }`} 
                  />
                  {likesData[post.id]?.count > 0 ? (
                    <span>{likesData[post.id].count} <span className="hidden sm:inline">Like</span></span>
                  ) : (
                    <span className="hidden sm:inline">Like</span>
                  )}
                </button>
                
                {/* Comment Button */}
                <button 
                  onClick={() => setShowComments(showComments === post.id ? null : post.id)}
                  className="post-action-btn text-gray-600 hover:text-gray-900 transition-all duration-200 active:scale-95 text-xs sm:text-sm font-medium hover:scale-105"
                  data-testid={`button-comment-${post.id}`}
                >
                  <MessageSquare className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                  <span className="hidden sm:inline">Comment</span>
                  {commentsData[post.id]?.length > 0 && (
                    <span className="text-xs inline sm:hidden">{commentsData[post.id].length}</span>
                  )}
                </button>
                
                {/* Share Button */}
                <button 
                  onClick={() => setSharePostId(post.id)}
                  className="post-action-btn text-gray-600 hover:text-gray-900 transition-all duration-200 active:scale-95 text-xs sm:text-sm font-medium hover:scale-105"
                  data-testid={`button-share-${post.id}`}
                >
                  <Send className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                  <span className="hidden sm:inline">Share</span>
                </button>
              </div>

              {/* Group Post Controls: Full badge / Join Button / Pending / Joined */}
              {post.type === 'group' && post.uid !== (user.uid || localStorage.getItem('collab_uid') || '') && (
                <div className="flex items-center ml-2 flex-shrink-0">
                  {(() => {
                    const currentUid = user.uid || localStorage.getItem('collab_uid') || '';
                    const isMember = post.groupMembers?.includes(currentUid);
                    const isGroupFull = (post.currentMembers || 0) >= (post.membersRequired || 1);
                    const isPending = joinMutation.isPending || joinRequestStatuses[post.id] === 'pending';

                    if (isMember) {
                      return (
                        <Badge 
                          variant="outline" 
                          className="text-xs px-2 py-1 whitespace-nowrap bg-green-50 text-green-700 border-green-200"
                          data-testid={`badge-joined-${post.id}`}
                        >
                          Joined
                        </Badge>
                      );
                    }

                    if (isGroupFull) {
                      return (
                        <Badge 
                          variant="outline" 
                          className="text-xs px-2 py-1 whitespace-nowrap bg-green-50 text-green-700 border-green-200"
                          data-testid={`badge-full-${post.id}`}
                        >
                          Full
                        </Badge>
                      );
                    }

                    if (isPending) {
                      return (
                        <Badge variant="outline" className="text-xs px-2 py-1 whitespace-nowrap bg-blue-50 text-blue-700 border-blue-200">
                          Pending…
                        </Badge>
                      );
                    }

                    return (
                      <Button 
                        size="sm"
                        onClick={() => joinMutation.mutate(post.id)}
                        className="bg-green-500 hover:bg-green-600 text-white text-xs px-3 py-1.5 transition-all duration-200 hover:scale-105 active:scale-95 whitespace-nowrap h-auto"
                        data-testid={`button-join-${post.id}`}
                      >
                        Join
                      </Button>
                    );
                  })()}
                </div>
              )}
            </div>
          </div>
          </CardContent>

          {/* Comments Section */}
          {showComments === post.id && (
            <div className="border-t border-gray-100 bg-gray-50">
                {/* Existing Comments */}
                {commentsData[post.id] && commentsData[post.id].length > 0 && (
                  <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
                    {commentsData[post.id].map((comment) => (
                      <div key={comment.id} className="flex gap-2" data-testid={`comment-${comment.id}`}>
                          <Avatar
                            className="h-8 w-8 flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => {
                              if (comment.profile?.username) {
                                setLocation(`/u/${comment.profile.username}`);
                              } else if (comment.uid) {
                                setLocation(`/collab-profile/${comment.uid}`);
                              }
                            }}
                          >
                            {comment.profile?.avatarUrl && (
                              <AvatarImage src={comment.profile.avatarUrl} alt={comment.profile.username || comment.profile.name} />
                            )}
                            <AvatarFallback className="bg-blue-600 text-white text-xs">
                              {(comment.profile?.username || comment.profile?.name)?.charAt(0).toUpperCase() || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="bg-white rounded-lg p-3 shadow-sm">
                              <span
                                className="text-sm font-semibold text-gray-900 cursor-pointer hover:underline"
                                onClick={() => {
                                  if (comment.profile?.username) {
                                    setLocation(`/u/${comment.profile.username}`);
                                  } else if (comment.uid) {
                                    setLocation(`/collab-profile/${comment.uid}`);
                                  }
                                }}
                              >
                                {comment.profile?.name || comment.profile?.username || 'User'}
                              </span>
                              <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5 mb-1">
                                <span>{comment.profile?.role || 'Student'}</span>
                                <span>•</span>
                                <span>{new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              </div>
                              <p className="text-sm text-gray-700 mb-2">{comment.text}</p>
                              
                              {/* Comment Actions */}
                              <div className="flex items-center gap-3 text-xs">
                                <button
                                  onClick={() => commentLikeMutation.mutate(comment.id)}
                                  className={`comment-action-btn transition-all duration-200 active:scale-95 ${
                                    commentLikes[comment.id]?.liked 
                                      ? 'text-red-600' 
                                      : 'text-gray-500 hover:text-red-500'
                                  }`}
                                  data-testid={`button-like-comment-${comment.id}`}
                                >
                                  <Heart 
                                    className={`h-3 w-3 transition-all duration-200 ${
                                      commentLikes[comment.id]?.liked 
                                        ? 'fill-current scale-110' 
                                        : 'hover:scale-110'
                                    }`} 
                                  />
                                  {commentLikes[comment.id]?.count > 0 && (
                                    <span className="transition-all duration-200">{commentLikes[comment.id].count}</span>
                                  )}
                                </button>
                                
                                <button
                                  onClick={() => setShowReplyBox(showReplyBox === comment.id ? null : comment.id)}
                                  className="comment-action-btn text-gray-500 hover:text-blue-600 font-medium"
                                  data-testid={`button-reply-${comment.id}`}
                                >
                                  Reply
                                </button>
                              </div>
                            </div>

                            {/* Reply Input Box */}
                            {showReplyBox === comment.id && (
                              <div className="mt-2 flex gap-2">
                                <Textarea
                                  value={replyText[comment.id] || ""}
                                  onChange={(e) => setReplyText(prev => ({ ...prev, [comment.id]: e.target.value }))}
                                  placeholder="Write a reply..."
                                  rows={2}
                                  className="flex-1 text-sm"
                                  data-testid={`textarea-reply-${comment.id}`}
                                />
                                <Button
                                  size="sm"
                                  onClick={() => replyMutation.mutate({ 
                                    postId: post.id, 
                                    parentCommentId: comment.id, 
                                    text: replyText[comment.id] || "" 
                                  })}
                                  disabled={!replyText[comment.id]?.trim() || replyMutation.isPending}
                                  data-testid={`button-submit-reply-${comment.id}`}
                                >
                                  {replyMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                                </Button>
                              </div>
                            )}

                            {/* Replies */}
                            {repliesData[comment.id] && repliesData[comment.id].length > 0 && (
                              <div className="mt-2 ml-4 space-y-2">
                                {repliesData[comment.id].map((reply) => (
                                  <div key={reply.id} className="flex gap-2" data-testid={`reply-${reply.id}`}>
                                    <Avatar
                                      className="h-6 w-6 flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                                      onClick={() => {
                                        if (reply.profile?.username) {
                                          setLocation(`/u/${reply.profile.username}`);
                                        } else if (reply.uid) {
                                          setLocation(`/collab-profile/${reply.uid}`);
                                        }
                                      }}
                                    >
                                      {reply.profile?.avatarUrl && (
                                        <AvatarImage src={reply.profile.avatarUrl} alt={reply.profile.username || reply.profile.name} />
                                      )}
                                      <AvatarFallback className="bg-gradient-to-br from-green-500 to-teal-500 text-white text-xs">
                                        {(reply.profile?.username || reply.profile?.name)?.charAt(0).toUpperCase() || 'U'}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 bg-gray-100 rounded-lg p-2">
                                      <div className="mb-1">
                                        <span
                                          className="text-xs font-semibold text-gray-900 cursor-pointer hover:underline"
                                          onClick={() => {
                                            if (reply.profile?.username) {
                                              setLocation(`/u/${reply.profile.username}`);
                                            } else if (reply.uid) {
                                              setLocation(`/collab-profile/${reply.uid}`);
                                            }
                                          }}
                                        >
                                          {reply.profile?.name || reply.profile?.username || 'User'}
                                        </span>
                                        <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                                          <span>{reply.profile?.role || 'Student'}</span>
                                          <span>•</span>
                                          <span>{new Date(reply.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>
                                      </div>
                                      <p className="text-xs text-gray-700">{reply.text}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                    ))}
                  </div>
                )}
                
                {/* Add Comment */}
                <div className="p-4 flex gap-2 border-t border-gray-200">
                  <Textarea
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Write a comment..."
                    rows={2}
                    className="flex-1"
                    data-testid={`textarea-comment-${post.id}`}
                  />
                  <Button
                    size="sm"
                    onClick={() => commentMutation.mutate({ postId: post.id, text: commentText })}
                    disabled={!commentText.trim() || commentMutation.isPending}
                    data-testid={`button-submit-comment-${post.id}`}
                  >
                    {commentMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            )}
        </Card>
      ))}
      
      {/* Share Modal - lazy loaded only when share is triggered */}
      {sharePostId && (
        <Suspense fallback={null}>
          <ShareModal
            open={!!sharePostId}
            onOpenChange={(open) => !open && setSharePostId(null)}
            postId={sharePostId}
          />
        </Suspense>
      )}
      
      {/* Media Modal - Full Screen View */}
      {mediaModal && (
        <Dialog open={!!mediaModal} onOpenChange={(open) => !open && setMediaModal(null)}>
          <DialogContent className="max-w-4xl w-full p-0 bg-black/95">
            <div className="relative w-full h-[90vh] flex items-center justify-center">
              {mediaModal.type === 'image' ? (
                <img 
                  src={mediaModal.url} 
                  alt="Full screen media" 
                  className="max-w-full max-h-full object-contain"
                />
              ) : (
                <video 
                  src={mediaModal.url} 
                  className="max-w-full max-h-full object-contain" 
                  controls 
                  autoPlay
                  muted
                />
              )}
              <button
                onClick={() => setMediaModal(null)}
                className="absolute top-4 right-4 text-white bg-black/50 hover:bg-black/70 rounded-full p-2 transition-colors"
                data-testid="button-close-media-modal"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Post Confirmation Dialog */}
      <AlertDialog open={!!deletePostId} onOpenChange={(open) => !open && setDeletePostId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Post</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this post? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletePostId && deleteMutation.mutate(deletePostId)}
              className="bg-red-600 hover:bg-red-700"
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
