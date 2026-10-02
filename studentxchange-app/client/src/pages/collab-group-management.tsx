import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Users, CheckCircle, XCircle, Loader2, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useState } from "react";

interface Post {
  id: string;
  type: string;
  groupName?: string;
  groupDescription?: string;
  description: string;
  membersRequired?: number;
  currentMembers?: number;
  groupMembers?: string[];
  createdAt: string;
}

interface JoinRequest {
  id: string;
  postId: string;
  uid: string;
  status: string;
  createdAt: string;
  profile: {
    id: string;
    name: string;
    username?: string;
    email: string;
    college?: string;
    primaryStream?: string;
    skills?: string[];
    interests?: string[];
    avatarUrl?: string;
  } | null;
}

export default function CollabGroupManagement() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [expandedPost, setExpandedPost] = useState<string | null>(null);

  // Fetch user's group posts
  const { data: posts = [], isLoading: postsLoading } = useQuery<Post[]>({
    queryKey: ['/api/collab/social/my-group-posts'],
  });

  // Accept join request mutation
  const acceptMutation = useMutation({
    mutationFn: async ({ requestId, postId }: { requestId: string; postId: string }) => {
      const token = localStorage.getItem('collabAuthToken');
      const response = await fetch(`/api/collab/social/join-requests/${requestId}/accept`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ postId }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to accept request');
      }
      return response.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/collab/social/my-group-posts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/collab/social/posts', variables.postId, 'join-requests'] });
      
      if (data.groupId) {
        toast({ 
          title: "✅ Group is now full!",
          description: "A private group chat has been created. Check your messages.",
          duration: 4000,
        });
      } else {
        toast({ 
          title: "✅ Member accepted",
          description: "The member has been added to your group",
          duration: 3000,
        });
      }
    },
    onError: (error: any) => {
      toast({ title: error.message, variant: "destructive" });
    },
  });

  // Reject join request mutation
  const rejectMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const token = localStorage.getItem('collabAuthToken');
      const response = await fetch(`/api/collab/social/join-requests/${requestId}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to reject request');
      }
      return response.json();
    },
    onSuccess: (_, requestId) => {
      queryClient.invalidateQueries({ queryKey: ['/api/collab/social/my-group-posts'] });
      toast({ 
        title: "Request rejected",
        description: "The join request has been declined",
        duration: 3000,
      });
    },
    onError: (error: any) => {
      toast({ title: error.message, variant: "destructive" });
    },
  });

  if (postsLoading) {
    return (
      <div className="min-h-screen bg-gray-50 py-6 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.history.back()}
              data-testid="button-back"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </div>
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-6 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.history.back()}
            data-testid="button-back"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>

        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Users className="h-8 w-8 text-blue-600" />
            Group Management
          </h1>
          <p className="text-gray-600 mt-2">Review and manage join requests for your groups</p>
        </div>

        {posts.length === 0 ? (
          <Card className="p-8 text-center">
            <div className="flex flex-col items-center">
              <Users className="h-16 w-16 text-gray-300 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No group posts yet</h3>
              <p className="text-gray-600 mb-4">Create a group requirement post to start building your team</p>
              <Button onClick={() => setLocation('/collab-post-create')} data-testid="button-create-post">
                Create Group Post
              </Button>
            </div>
          </Card>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
              <GroupPostCard
                key={post.id}
                post={post}
                isExpanded={expandedPost === post.id}
                onToggle={() => setExpandedPost(expandedPost === post.id ? null : post.id)}
                onAccept={(requestId) => acceptMutation.mutate({ requestId, postId: post.id })}
                onReject={(requestId) => rejectMutation.mutate(requestId)}
                acceptPending={acceptMutation.isPending}
                rejectPending={rejectMutation.isPending}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function GroupPostCard({
  post,
  isExpanded,
  onToggle,
  onAccept,
  onReject,
  acceptPending,
  rejectPending,
}: {
  post: Post;
  isExpanded: boolean;
  onToggle: () => void;
  onAccept: (requestId: string) => void;
  onReject: (requestId: string) => void;
  acceptPending: boolean;
  rejectPending: boolean;
}) {
  const { data: requests = [], isLoading } = useQuery<JoinRequest[]>({
    queryKey: ['/api/collab/social/posts', post.id, 'join-requests'],
    queryFn: async () => {
      const token = localStorage.getItem('collabAuthToken');
      const response = await fetch(`/api/collab/social/posts/${post.id}/join-requests`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch requests');
      return response.json();
    },
    enabled: isExpanded,
  });

  const isFull = (post.currentMembers || 0) >= (post.membersRequired || 0);
  const spotsLeft = (post.membersRequired || 0) - (post.currentMembers || 0);

  return (
    <Card className="overflow-hidden">
      <div 
        className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={onToggle}
        data-testid={`card-post-${post.id}`}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-lg font-semibold text-gray-900">{post.groupName || 'Unnamed Group'}</h3>
              {isFull ? (
                <Badge className="bg-green-100 text-green-800 border-green-200">Full</Badge>
              ) : (
                <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                  {spotsLeft} {spotsLeft === 1 ? 'spot' : 'spots'} left
                </Badge>
              )}
              {requests.length > 0 && (
                <Badge className="bg-orange-100 text-orange-800 border-orange-200">
                  {requests.length} {requests.length === 1 ? 'request' : 'requests'}
                </Badge>
              )}
            </div>
            <p className="text-sm text-gray-600 mb-2">{post.groupDescription || post.description}</p>
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <span>{post.currentMembers || 0} / {post.membersRequired} members</span>
              <span>•</span>
              <span>{new Date(post.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
          <Button variant="ghost" size="sm" data-testid={`button-toggle-${post.id}`}>
            {isExpanded ? 'Hide Requests' : 'View Requests'}
          </Button>
        </div>
      </div>

      {isExpanded && (
        <div className="border-t border-gray-200 bg-gray-50 p-4">
          {isLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            </div>
          ) : requests.length === 0 ? (
            <p className="text-center text-gray-500 py-4">No pending join requests</p>
          ) : (
            <div className="space-y-3">
              {requests.map((request) => (
                <JoinRequestCard
                  key={request.id}
                  request={request}
                  onAccept={() => onAccept(request.id)}
                  onReject={() => onReject(request.id)}
                  acceptPending={acceptPending}
                  rejectPending={rejectPending}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

function JoinRequestCard({
  request,
  onAccept,
  onReject,
  acceptPending,
  rejectPending,
}: {
  request: JoinRequest;
  onAccept: () => void;
  onReject: () => void;
  acceptPending: boolean;
  rejectPending: boolean;
}) {
  const profile = request.profile;
  
  if (!profile) {
    return (
      <div className="bg-white rounded-lg p-4 border border-gray-200">
        <p className="text-sm text-gray-500">Profile not found</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg p-4 border border-gray-200 flex items-start justify-between gap-4" data-testid={`request-${request.id}`}>
      <div className="flex items-start gap-3 flex-1">
        <Avatar className="h-12 w-12">
          <AvatarImage src={profile.avatarUrl} alt={profile.name} />
          <AvatarFallback className="bg-blue-100 text-blue-600">
            {profile.name.split(' ').map(n => n[0]).join('').toUpperCase()}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1">
          <h4 className="font-semibold text-gray-900">{profile.name}</h4>
          {profile.username && <p className="text-sm text-gray-500">@{profile.username}</p>}
          {profile.college && <p className="text-sm text-gray-600 mt-1">{profile.college}</p>}
          {profile.primaryStream && (
            <Badge variant="outline" className="mt-2 text-xs">
              {profile.primaryStream}
            </Badge>
          )}
          {profile.skills && profile.skills.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {profile.skills.slice(0, 3).map((skill, idx) => (
                <Badge key={idx} variant="secondary" className="text-xs">
                  {skill}
                </Badge>
              ))}
              {profile.skills.length > 3 && (
                <Badge variant="secondary" className="text-xs">
                  +{profile.skills.length - 3} more
                </Badge>
              )}
            </div>
          )}
          <p className="text-xs text-gray-400 mt-2">
            Requested {new Date(request.createdAt).toLocaleDateString()}
          </p>
        </div>
      </div>

      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={onAccept}
          disabled={acceptPending || rejectPending}
          className="bg-green-600 hover:bg-green-700"
          data-testid={`button-accept-${request.id}`}
        >
          {acceptPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <CheckCircle className="h-4 w-4 mr-1" />
              Accept
            </>
          )}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={onReject}
          disabled={acceptPending || rejectPending}
          className="border-red-200 text-red-600 hover:bg-red-50"
          data-testid={`button-reject-${request.id}`}
        >
          {rejectPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <XCircle className="h-4 w-4 mr-1" />
              Reject
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
