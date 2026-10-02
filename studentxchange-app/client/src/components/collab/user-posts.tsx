import { useState, useEffect, lazy, Suspense } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Heart, MessageSquare, Send, Loader2, MoreVertical, Edit, Trash2, Upload, X } from "lucide-react";
import { UserPostsSkeleton } from "@/components/ui/skeletons";
import { useCollabAuth } from "@/hooks/use-collab-auth";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { getFirestore, collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import app from "@/lib/firebase";

const ShareModal = lazy(() => import("./share-modal").then(m => ({ default: m.ShareModal })));

interface Post {
  id: string;
  userId: number;
  uid: string;
  type: 'direct' | 'group';
  description: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video';
  createdAt: string;
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

interface UserPostsProps {
  userUid: string;
  userName: string;
}

export function UserPosts({ userUid, userName }: UserPostsProps) {
  const { user } = useCollabAuth();
  const { toast } = useToast();
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletePostId, setDeletePostId] = useState<string | null>(null);
  const [editPost, setEditPost] = useState<Post | null>(null);
  const [editDescription, setEditDescription] = useState("");
  const [editMedia, setEditMedia] = useState<File | null>(null);
  const [editMediaPreview, setEditMediaPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [likesData, setLikesData] = useState<Record<string, { count: number; liked: boolean }>>({});
  const [commentsData, setCommentsData] = useState<Record<string, Comment[]>>({});
  const [optimisticLikes, setOptimisticLikes] = useState<Set<string>>(new Set());
  const [commentText, setCommentText] = useState("");
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [showReplyBox, setShowReplyBox] = useState<string | null>(null);
  const [commentLikes, setCommentLikes] = useState<Record<string, { count: number; liked: boolean }>>({});
  const [repliesData, setRepliesData] = useState<Record<string, Comment[]>>({});
  const [showComments, setShowComments] = useState<string | null>(null);
  const [sharePostId, setSharePostId] = useState<string | null>(null);
  
  // Get current user's UID from localStorage or user object
  const currentUserUid = user?.uid || localStorage.getItem('collab_uid') || '';

  // Real-time posts listener for specific user
  useEffect(() => {
    const db = getFirestore(app);
    const postsRef = collection(db, 'posts');
    // Remove orderBy to avoid composite index requirement - sort in memory instead
    const postsQuery = query(
      postsRef, 
      where('uid', '==', userUid)
    );

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
        
        return {
          id: doc.id,
          userId: data.userId || 0,
          uid: data.uid || '',
          type: data.type || 'direct',
          description: data.description || '',
          mediaUrl: data.mediaUrl || undefined,
          mediaType: data.mediaType || undefined,
          createdAt: createdAtString,
        } as Post;
      });
      
      // Sort in memory by createdAt descending
      postsData.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      setPosts(postsData);
      setIsLoading(false);
    }, (error) => {
      console.error('❌ Error loading user posts:', error);
      console.error('Error code:', error.code);
      
      let errorMsg = "Failed to load posts";
      let description = "";
      
      if (error.code === 'permission-denied') {
        errorMsg = "Permission denied";
        description = "Please update Firestore rules to allow reading posts.";
      } else if (error.code === 'failed-precondition') {
        errorMsg = "Index required";
        description = "Firestore needs a composite index. Check console for the link.";
      } else {
        description = error.message;
      }
      
      toast({ title: errorMsg, description, variant: "destructive" });
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [userUid]);

  // Fetch likes and comments count for all posts
  useEffect(() => {
    if (!user || posts.length === 0) return;

    const fetchEngagementData = async () => {
      const token = localStorage.getItem('collabAuthToken');
      
      for (const post of posts) {
        try {
          // Fetch likes data
          const likesResponse = await fetch(`/api/collab/social/posts/${post.id}/likes`, {
            headers: { 'Authorization': `Bearer ${token}` },
          });
          if (likesResponse.ok) {
            const likesResult = await likesResponse.json();
            setLikesData(prev => ({
              ...prev,
              [post.id]: { count: likesResult.count, liked: likesResult.liked }
            }));
          }

          // Fetch comments data
          const commentsResponse = await fetch(`/api/collab/social/posts/${post.id}/comments`, {
            headers: { 'Authorization': `Bearer ${token}` },
          });
          if (commentsResponse.ok) {
            const commentsResult = await commentsResponse.json();
            setCommentsData(prev => ({
              ...prev,
              [post.id]: commentsResult
            }));
          }
        } catch (error) {
          console.error(`Failed to fetch engagement data for post ${post.id}:`, error);
        }
      }
    };

    fetchEngagementData();

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
      window.removeEventListener('post-like-sync' as any, handleLikeSync as any);
    };
  }, [posts, user]);

  // Fetch comment likes and replies when comments are shown
  useEffect(() => {
    if (!user || !showComments) return;

    const abortController = new AbortController();
    const postComments = commentsData[showComments] || [];

    const fetchCommentData = async () => {
      const token = localStorage.getItem('collabAuthToken');
      
      await Promise.all(postComments.map(async (comment) => {
        // Fetch comment likes
        try {
          const likesResponse = await fetch(`/api/collab/social/comments/${comment.id}/likes`, {
            headers: { 'Authorization': `Bearer ${token}` },
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
          const repliesResponse = await fetch(`/api/collab/social/comments/${comment.id}/replies`, {
            headers: { 'Authorization': `Bearer ${token}` },
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

  // Like mutation with optimistic update
  const likeMutation = useMutation({
    mutationFn: async (postId: string) => {
      const token = localStorage.getItem('collabAuthToken');
      const response = await fetch(`/api/collab/social/posts/${postId}/like`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
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
      // Remove from optimistic set
      setOptimisticLikes(prev => {
        const next = new Set(prev);
        next.delete(postId);
        return next;
      });
      
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
      
      // Invalidate to sync with main feed
      queryClient.invalidateQueries({ queryKey: ['/api/collab/social/posts'] });
    },
    onError: (error, postId) => {
      // Remove from optimistic set
      setOptimisticLikes(prev => {
        const next = new Set(prev);
        next.delete(postId);
        return next;
      });
      
      // Revert optimistic update on error
      setLikesData(prev => {
        const current = prev[postId] || { count: 0, liked: false };
        return {
          ...prev,
          [postId]: {
            count: current.liked ? current.count + 1 : current.count - 1,
            liked: !current.liked
          }
        };
      });
      
      toast({
        title: "Failed to like post",
        description: "Please try again.",
        variant: "destructive",
      });
    },
  });

  // Comment mutation
  const commentMutation = useMutation({
    mutationFn: async ({ postId, text }: { postId: string; text: string }) => {
      const token = localStorage.getItem('collabAuthToken');
      const response = await fetch(`/api/collab/social/posts/${postId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ text }),
      });
      if (!response.ok) throw new Error('Failed to comment');
      return response.json();
    },
    onSuccess: async (_, variables) => {
      setCommentText("");
      toast({ title: "✅ Comment added!" });
      
      // Refresh comments for this post
      const token = localStorage.getItem('collabAuthToken');
      try {
        const commentsResponse = await fetch(`/api/collab/social/posts/${variables.postId}/comments`, {
          headers: { 'Authorization': `Bearer ${token}` },
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
    onError: (error: any) => {
      toast({ 
        title: "Failed to add comment", 
        description: error.message || "Please try again",
        variant: "destructive" 
      });
    },
  });

  // Comment like mutation
  const commentLikeMutation = useMutation({
    mutationFn: async (commentId: string) => {
      const token = localStorage.getItem('collabAuthToken');
      const response = await fetch(`/api/collab/social/comments/${commentId}/like`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
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

  // Reply mutation
  const replyMutation = useMutation({
    mutationFn: async ({ postId, parentCommentId, text }: { postId: string; parentCommentId: string; text: string }) => {
      const token = localStorage.getItem('collabAuthToken');
      const response = await fetch(`/api/collab/social/posts/${postId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ text, parentCommentId }),
      });
      if (!response.ok) throw new Error('Failed to reply');
      return response.json();
    },
    onSuccess: async (_, variables) => {
      setReplyText(prev => ({ ...prev, [variables.parentCommentId]: "" }));
      setShowReplyBox(null);
      toast({ title: "✅ Reply added!" });
      
      // Refresh replies for this comment
      const token = localStorage.getItem('collabAuthToken');
      try {
        const repliesResponse = await fetch(`/api/collab/social/comments/${variables.parentCommentId}/replies`, {
          headers: { 'Authorization': `Bearer ${token}` },
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
    onError: (error: any) => {
      toast({ 
        title: "Failed to add reply", 
        description: error.message || "Please try again",
        variant: "destructive" 
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (postId: string) => {
      const token = localStorage.getItem('collabAuthToken');
      const response = await fetch(`/api/collab/social/posts/${postId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to delete post');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Post deleted",
        description: "Your post has been deleted successfully.",
      });
      setDeletePostId(null);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to delete post",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  // Edit mutation
  const editMutation = useMutation({
    mutationFn: async ({ postId, description, mediaUrl, mediaType }: { postId: string; description: string; mediaUrl?: string; mediaType?: 'image' | 'video' }) => {
      const token = localStorage.getItem('collabAuthToken');
      const response = await fetch(`/api/collab/social/posts/${postId}`, {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ description, mediaUrl, mediaType }),
      });
      if (!response.ok) throw new Error('Failed to update post');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Post updated",
        description: "Your post has been updated successfully.",
      });
      setEditPost(null);
      setEditDescription("");
      setEditMedia(null);
      setEditMediaPreview(null);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update post",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  // Handle edit button click
  const handleEditClick = (post: Post) => {
    setEditPost(post);
    setEditDescription(post.description);
    setEditMediaPreview(post.mediaUrl || null);
  };

  // Handle media file selection
  const handleMediaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setEditMedia(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditMediaPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle removing media
  const handleRemoveMedia = () => {
    setEditMedia(null);
    setEditMediaPreview(null);
  };

  // Handle save edit
  const handleSaveEdit = async () => {
    if (!editPost) return;

    try {
      setIsUploading(true);
      
      let mediaUrl = editPost.mediaUrl;
      let mediaType = editPost.mediaType;

      // If new media is selected, upload it to Firebase Storage
      if (editMedia) {
        const formData = new FormData();
        formData.append('file', editMedia);

        const uploadResponse = await fetch('/api/collab/social/upload', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('collabAuthToken')}`,
          },
          body: formData,
        });

        if (uploadResponse.ok) {
          const uploadData = await uploadResponse.json();
          mediaUrl = uploadData.url;
          mediaType = editMedia.type.startsWith('image/') ? 'image' : 'video';
        }
      } else if (editMediaPreview === null) {
        // User removed media
        mediaUrl = undefined;
        mediaType = undefined;
      }

      await editMutation.mutateAsync({
        postId: editPost.id,
        description: editDescription,
        mediaUrl,
        mediaType,
      });
    } catch (error) {
      console.error('Error updating post:', error);
    } finally {
      setIsUploading(false);
    }
  };

  if (isLoading) {
    return <UserPostsSkeleton count={3} />;
  }

  if (posts.length === 0) {
    return (
      <Card className="bg-gray-50 border-0">
        <CardContent className="p-8 text-center">
          <p className="text-gray-600">No posts yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-4 max-w-xl mx-auto">
        {posts.map((post) => (
          <Card 
            key={post.id} 
            className="bg-white border-0 card-modern animate-fade-in overflow-hidden"
            data-testid={`user-post-${post.id}`}
          >
            <CardContent className="p-4">
              {/* Post Header */}
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h4 className="text-sm font-semibold text-gray-900">{userName}</h4>
                  <p className="text-xs text-gray-500">
                    {new Date(post.createdAt).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric', 
                      year: 'numeric' 
                    })}
                  </p>
                </div>

                {/* Edit/Delete Menu - Only show if viewing own profile */}
                {currentUserUid && post.uid === currentUserUid && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8" data-testid={`button-post-menu-${post.id}`}>
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEditClick(post)} data-testid={`button-edit-post-${post.id}`}>
                        <Edit className="h-4 w-4 mr-2 text-blue-600" />
                        <span className="text-blue-600">Edit</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setDeletePostId(post.id)} data-testid={`button-delete-post-${post.id}`}>
                        <Trash2 className="h-4 w-4 mr-2 text-red-600" />
                        <span className="text-red-600">Delete</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>

            {/* Post Content */}
            <p className="text-gray-700 text-sm leading-relaxed mb-3">{post.description}</p>
            
            {/* Media - matches feed display */}
            {post.mediaUrl && (
              <div className="post-media-cls-wrapper mb-3">
                {post.mediaType === 'image' ? (
                  <img 
                    src={post.mediaUrl} 
                    alt="Post media" 
                    className="post-content-image"
                    loading="lazy"
                    data-testid={`post-media-${post.id}`}
                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                  />
                ) : post.mediaType === 'video' ? (
                  <video 
                    src={post.mediaUrl} 
                    className="post-content-image"
                    controls 
                    muted
                    preload="metadata"
                    data-testid={`post-media-${post.id}`}
                    onError={(e) => { (e.currentTarget as HTMLVideoElement).style.display = 'none'; }}
                  />
                ) : null}
              </div>
            )}

            {/* Engagement Bar */}
            {user && (
              <div className="border-t border-gray-100 pt-3 mt-3">
                <div className="flex items-center space-x-6">
                  <button 
                    onClick={() => likeMutation.mutate(post.id)}
                    disabled={optimisticLikes.has(post.id)}
                    className={`flex items-center space-x-1 transition-colors border-0 outline-none bg-transparent disabled:opacity-50 disabled:cursor-not-allowed ${
                      likesData[post.id]?.liked 
                        ? 'text-red-600' 
                        : 'text-gray-500 hover:text-red-500'
                    }`}
                    data-testid={`button-like-${post.id}`}
                  >
                    <Heart 
                      className={`h-5 w-5 transition-all duration-200 ${
                        likesData[post.id]?.liked 
                          ? 'fill-current' 
                          : ''
                      }`} 
                    />
                    <span className="text-sm font-medium">
                      {likesData[post.id]?.count > 0 ? likesData[post.id].count : ''} Like
                    </span>
                  </button>
                  
                  <button 
                    onClick={() => setShowComments(showComments === post.id ? null : post.id)}
                    className="flex items-center space-x-1 text-gray-500 hover:text-blue-600 transition-colors border-0 outline-none bg-transparent"
                    data-testid={`button-comment-${post.id}`}
                  >
                    <MessageSquare className="h-5 w-5" />
                    <span className="text-sm font-medium">
                      {(commentsData[post.id]?.length || 0) > 0 ? commentsData[post.id]?.length : ''} Comment
                    </span>
                  </button>
                  
                  <button 
                    onClick={() => setSharePostId(post.id)}
                    className="flex items-center space-x-1 text-gray-500 hover:text-green-600 transition-colors border-0 outline-none bg-transparent"
                    data-testid={`button-share-${post.id}`}
                  >
                    <Send className="h-5 w-5" />
                    <span className="text-sm font-medium">Share</span>
                  </button>
                </div>
              </div>
            )}

            {/* Comments Section */}
            {user && showComments === post.id && (
              <div className="border-t border-gray-100 pt-4 mt-4">
                {/* Add Comment Input */}
                <div className="flex gap-2 mb-4">
                  <Textarea
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Write a comment..."
                    className="flex-1 min-h-[80px] resize-none"
                    data-testid={`textarea-comment-${post.id}`}
                  />
                  <Button
                    onClick={() => commentMutation.mutate({ postId: post.id, text: commentText })}
                    disabled={!commentText.trim() || commentMutation.isPending}
                    size="sm"
                    className="self-end"
                    data-testid={`button-post-comment-${post.id}`}
                  >
                    {commentMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </div>

                {/* Comments List */}
                <div className="space-y-4">
                  {commentsData[post.id]?.map((comment) => (
                    <div key={comment.id} className="space-y-2">
                      {/* Comment */}
                      <div className="flex gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={comment.profile?.avatarUrl} />
                          <AvatarFallback className="bg-blue-600 text-white text-xs">
                            {comment.profile?.username?.substring(0, 2).toUpperCase() || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="bg-gray-100 rounded-lg px-3 py-2">
                            <p className="font-semibold text-sm text-gray-900">
                              {comment.profile?.name || comment.profile?.username || 'Unknown'}
                            </p>
                            <p className="text-sm text-gray-700">{comment.text}</p>
                          </div>
                          <div className="flex items-center gap-4 mt-1 px-2">
                            <button
                              onClick={() => commentLikeMutation.mutate(comment.id)}
                              className={`text-xs font-medium ${
                                commentLikes[comment.id]?.liked ? 'text-red-600' : 'text-gray-500'
                              }`}
                            >
                              {commentLikes[comment.id]?.liked ? '❤️' : 'Like'}
                              {commentLikes[comment.id]?.count > 0 && ` ${commentLikes[comment.id].count}`}
                            </button>
                            <button
                              onClick={() => setShowReplyBox(showReplyBox === comment.id ? null : comment.id)}
                              className="text-xs font-medium text-gray-500"
                            >
                              Reply
                            </button>
                            <span className="text-xs text-gray-400">
                              {new Date(comment.createdAt).toLocaleDateString()}
                            </span>
                          </div>

                          {/* Reply Input */}
                          {showReplyBox === comment.id && (
                            <div className="flex gap-2 mt-2">
                              <Textarea
                                value={replyText[comment.id] || ''}
                                onChange={(e) => setReplyText(prev => ({ ...prev, [comment.id]: e.target.value }))}
                                placeholder="Write a reply..."
                                className="flex-1 min-h-[60px] resize-none text-sm"
                              />
                              <Button
                                onClick={() => replyMutation.mutate({
                                  postId: post.id,
                                  parentCommentId: comment.id,
                                  text: replyText[comment.id] || ''
                                })}
                                disabled={!replyText[comment.id]?.trim() || replyMutation.isPending}
                                size="sm"
                                className="self-end"
                              >
                                {replyMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                              </Button>
                            </div>
                          )}

                          {/* Replies */}
                          {repliesData[comment.id]?.length > 0 && (
                            <div className="mt-2 space-y-2 ml-4">
                              {repliesData[comment.id].map((reply) => (
                                <div key={reply.id} className="flex gap-2">
                                  <Avatar className="h-6 w-6">
                                    <AvatarImage src={reply.profile?.avatarUrl} />
                                    <AvatarFallback className="bg-blue-600 text-white text-xs">
                                      {reply.profile?.username?.substring(0, 2).toUpperCase() || 'U'}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1">
                                    <div className="bg-gray-100 rounded-lg px-3 py-2">
                                      <p className="font-semibold text-xs text-gray-900">
                                        {reply.profile?.name || reply.profile?.username || 'Unknown'}
                                      </p>
                                      <p className="text-xs text-gray-700">{reply.text}</p>
                                    </div>
                                    <span className="text-xs text-gray-400 px-2">
                                      {new Date(reply.createdAt).toLocaleDateString()}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>

    {/* Delete Confirmation Dialog */}
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
          >
            {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    {/* Edit Post Dialog */}
    <Dialog open={!!editPost} onOpenChange={(open) => !open && setEditPost(null)}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Edit Post</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="edit-description">Description</Label>
            <Textarea
              id="edit-description"
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              placeholder="What's on your mind?"
              className="min-h-[120px]"
              data-testid="textarea-edit-description"
            />
          </div>

          {/* Media Upload */}
          <div className="space-y-2">
            <Label>Photo/Video</Label>
            
            {/* Media Preview */}
            {editMediaPreview && (
              <div className="relative rounded-lg overflow-hidden border border-gray-200">
                {editPost?.mediaType === 'video' || editMedia?.type.startsWith('video/') ? (
                  <video src={editMediaPreview} className="w-full max-h-64 object-cover" controls />
                ) : (
                  <img src={editMediaPreview} alt="Media preview" className="w-full max-h-64 object-cover" />
                )}
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2"
                  onClick={handleRemoveMedia}
                  data-testid="button-remove-media"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}

            {/* Upload Button */}
            {!editMediaPreview && (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <Input
                  id="edit-media-upload"
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleMediaChange}
                  className="hidden"
                  data-testid="input-edit-media"
                />
                <Label
                  htmlFor="edit-media-upload"
                  className="cursor-pointer flex flex-col items-center space-y-2"
                >
                  <Upload className="h-8 w-8 text-gray-400" />
                  <span className="text-sm text-gray-600">Click to upload photo or video</span>
                  <span className="text-xs text-gray-400">PNG, JPG, MP4 up to 10MB</span>
                </Label>
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setEditPost(null)}
            disabled={isUploading || editMutation.isPending}
            data-testid="button-cancel-edit"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSaveEdit}
            disabled={!editDescription.trim() || isUploading || editMutation.isPending}
            className="bg-blue-600 hover:bg-blue-700"
            data-testid="button-save-edit"
          >
            {isUploading || editMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Share Modal - lazy loaded only when share is triggered */}
    {sharePostId && (
      <Suspense fallback={null}>
        <ShareModal
          open={!!sharePostId}
          onOpenChange={(open) => !open && setSharePostId(null)}
          postId={sharePostId || ''}
        />
      </Suspense>
    )}
  </>
  );
}
