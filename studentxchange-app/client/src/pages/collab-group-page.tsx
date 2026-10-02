import { useState, useEffect, useRef } from "react";
import { useRoute } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { useCollabAuth } from "@/hooks/use-collab-auth";
import { ArrowLeft, Send, Users, Crown, Loader2, MessageCircle, Paperclip, X, Image as ImageIcon, FileText, Video, UserMinus, MoreVertical, Archive, UserPlus, Star } from "lucide-react";
import { useLocation } from "wouter";
import { storage } from "@/lib/firebase";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";

interface Group {
  id: string;
  postId: string;
  name: string;
  description?: string;
  leaderId: string;
  leaderUid: string;
  coLeaders?: string[];
  members: string[];
  maxMembers: number;
  isArchived?: boolean;
  createdAt: string;
}

interface GroupMessage {
  id: string;
  groupId: string;
  senderId: number;
  senderUid: string;
  text: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video' | 'document';
  fileName?: string;
  createdAt: string;
}

interface Profile {
  id: string;
  name: string;
  username?: string;
  avatarUrl?: string;
}

export default function CollabGroupPage() {
  const [, params] = useRoute("/collab-groups/:groupId");
  const groupId = params?.groupId;
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useCollabAuth();
  const [messageText, setMessageText] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string>("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [memberToRemove, setMemberToRemove] = useState<{ uid: string; name: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch group details
  const { data: group, isLoading: groupLoading } = useQuery<Group>({
    queryKey: ['/api/collab/social/groups', groupId],
    enabled: !!groupId,
  });

  // Fetch group messages with real-time polling
  const { data: messages = [], refetch: refetchMessages } = useQuery<GroupMessage[]>({
    queryKey: ['/api/collab/social/groups', groupId, 'messages'],
    queryFn: async () => {
      const token = localStorage.getItem('collabAuthToken');
      const response = await fetch(`/api/collab/social/groups/${groupId}/messages`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch messages');
      return response.json();
    },
    enabled: !!groupId,
    refetchInterval: 3000, // Poll every 3 seconds for real-time updates
  });

  // Fetch member profiles
  const { data: profiles = {} } = useQuery<Record<string, Profile>>({
    queryKey: ['/api/collab/profiles', group?.members],
    queryFn: async () => {
      if (!group?.members) return {};
      const token = localStorage.getItem('collabAuthToken');
      const profilePromises = group.members.map(async (uid) => {
        const response = await fetch(`/api/collab/profile/${uid}`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (response.ok) {
          const profile = await response.json();
          return [uid, profile];
        }
        return [uid, null];
      });
      const profileEntries = await Promise.all(profilePromises);
      return Object.fromEntries(profileEntries.filter(([_, p]) => p !== null));
    },
    enabled: !!group?.members,
  });

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "File too large", description: "Max file size is 10MB", variant: "destructive" });
      return;
    }

    setSelectedFile(file);

    // Create preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFilePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setFilePreview("");
    }
  };

  // Upload file to Firebase Storage
  const uploadFile = async (file: File): Promise<{ url: string; type: 'image' | 'video' | 'document' }> => {
    const fileName = `${Date.now()}_${file.name}`;
    const storageRef = ref(storage, `groups/${groupId}/${fileName}`);
    
    return new Promise((resolve, reject) => {
      const uploadTask = uploadBytesResumable(storageRef, file);
      
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(progress);
        },
        (error) => {
          console.error('Upload error:', error);
          reject(error);
        },
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          let mediaType: 'image' | 'video' | 'document' = 'document';
          
          if (file.type.startsWith('image/')) {
            mediaType = 'image';
          } else if (file.type.startsWith('video/')) {
            mediaType = 'video';
          }
          
          resolve({ url: downloadURL, type: mediaType });
        }
      );
    });
  };

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async ({ text, mediaUrl, mediaType, fileName }: { 
      text: string; 
      mediaUrl?: string; 
      mediaType?: 'image' | 'video' | 'document';
      fileName?: string;
    }) => {
      const token = localStorage.getItem('collabAuthToken');
      const response = await fetch(`/api/collab/social/groups/${groupId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ text, mediaUrl, mediaType, fileName }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to send message');
      }
      return response.json();
    },
    onSuccess: () => {
      setMessageText("");
      setSelectedFile(null);
      setFilePreview("");
      setUploadProgress(0);
      refetchMessages();
    },
    onError: (error: any) => {
      toast({ title: error.message, variant: "destructive" });
      setUploadProgress(0);
    },
  });

  // Remove member mutation
  const removeMemberMutation = useMutation({
    mutationFn: async (memberUid: string) => {
      const token = localStorage.getItem('collabAuthToken');
      const response = await fetch(`/api/collab/social/groups/${groupId}/members/${memberUid}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to remove member');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Member removed", description: "The member has been removed from the group" });
      queryClient.invalidateQueries({ queryKey: ['/api/collab/social/groups', groupId] });
      setMemberToRemove(null);
    },
    onError: (error: any) => {
      toast({ title: error.message, variant: "destructive" });
    },
  });

  // Archive group mutation
  const archiveGroupMutation = useMutation({
    mutationFn: async (isArchived: boolean) => {
      const token = localStorage.getItem('collabAuthToken');
      const response = await fetch(`/api/collab/social/groups/${groupId}/archive`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ isArchived }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to archive group');
      }
      return response.json();
    },
    onSuccess: (_, isArchived) => {
      toast({ 
        title: isArchived ? "Group archived" : "Group restored", 
        description: isArchived ? "The group has been archived" : "The group has been restored" 
      });
      queryClient.invalidateQueries({ queryKey: ['/api/collab/social/groups', groupId] });
    },
    onError: (error: any) => {
      toast({ title: error.message, variant: "destructive" });
    },
  });

  // Assign co-leader mutation
  const assignCoLeaderMutation = useMutation({
    mutationFn: async (memberUid: string) => {
      const token = localStorage.getItem('collabAuthToken');
      const response = await fetch(`/api/collab/social/groups/${groupId}/co-leaders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ memberUid }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to assign co-leader');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Co-leader assigned", description: "Member has been assigned as co-leader" });
      queryClient.invalidateQueries({ queryKey: ['/api/collab/social/groups', groupId] });
    },
    onError: (error: any) => {
      toast({ title: error.message, variant: "destructive" });
    },
  });

  // Remove co-leader mutation
  const removeCoLeaderMutation = useMutation({
    mutationFn: async (memberUid: string) => {
      const token = localStorage.getItem('collabAuthToken');
      const response = await fetch(`/api/collab/social/groups/${groupId}/co-leaders/${memberUid}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to remove co-leader');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Co-leader removed", description: "Member is no longer a co-leader" });
      queryClient.invalidateQueries({ queryKey: ['/api/collab/social/groups', groupId] });
    },
    onError: (error: any) => {
      toast({ title: error.message, variant: "destructive" });
    },
  });

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Check if user is a member
  const isMember = group?.members.includes(user?.uid || '');
  const isLeader = group?.leaderUid === user?.uid;

  if (groupLoading) {
    return (
      <div className="min-h-screen bg-gray-50 py-6 px-4">
        <div className="max-w-6xl mx-auto">
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

  if (!group) {
    return (
      <div className="min-h-screen bg-gray-50 py-6 px-4">
        <div className="max-w-6xl mx-auto">
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
          <Card className="p-6 text-center">
            <h3 className="text-xl font-semibold mb-2">Group not found</h3>
          </Card>
        </div>
      </div>
    );
  }

  if (!isMember) {
    return (
      <div className="min-h-screen bg-gray-50 py-6 px-4">
        <div className="max-w-6xl mx-auto">
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
          <Card className="p-6 text-center max-w-md mx-auto">
            <h3 className="text-xl font-semibold mb-2">Access Denied</h3>
            <p className="text-gray-600 mb-4">You must be a member of this group to view it.</p>
          </Card>
        </div>
      </div>
    );
  }

  const handleSendMessage = async () => {
    if (!messageText.trim() && !selectedFile) return;

    try {
      let mediaUrl: string | undefined;
      let mediaType: 'image' | 'video' | 'document' | undefined;
      let fileName: string | undefined;

      // Upload file if selected
      if (selectedFile) {
        const uploadResult = await uploadFile(selectedFile);
        mediaUrl = uploadResult.url;
        mediaType = uploadResult.type;
        fileName = selectedFile.name;
      }

      // Send message
      sendMessageMutation.mutate({
        text: messageText || (selectedFile ? `Shared ${fileName}` : ''),
        mediaUrl,
        mediaType,
        fileName,
      });
    } catch (error: any) {
      toast({ 
        title: "Upload failed", 
        description: error.message || "Failed to upload file",
        variant: "destructive" 
      });
      setUploadProgress(0);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.history.back()}
              data-testid="button-back"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <Users className="h-6 w-6 text-blue-600" />
                  {group.name}
                  {group.isArchived && (
                    <Badge variant="secondary" className="text-xs">
                      <Archive className="h-3 w-3 mr-1" />
                      Archived
                    </Badge>
                  )}
                </h1>
                {isLeader && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" data-testid="button-group-settings">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Group Settings</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={() => archiveGroupMutation.mutate(!group.isArchived)}
                        data-testid="button-archive-group"
                      >
                        <Archive className="h-4 w-4 mr-2" />
                        {group.isArchived ? 'Restore Group' : 'Archive Group'}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
              {group.description && (
                <p className="text-sm text-gray-600 mt-1">{group.description}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Chat Area */}
          <div className="lg:col-span-2">
            <Card className="h-[calc(100vh-200px)] flex flex-col">
              <CardHeader className="border-b border-gray-200">
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className="h-5 w-5 text-blue-600" />
                  Group Chat
                </CardTitle>
              </CardHeader>
              
              <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    <div className="text-center">
                      <MessageCircle className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                      <p>No messages yet. Start the conversation!</p>
                    </div>
                  </div>
                ) : (
                  messages.map((message) => {
                    const profile = profiles[message.senderUid];
                    const isOwnMessage = message.senderUid === user?.uid;
                    
                    return (
                      <div
                        key={message.id}
                        className={`flex gap-3 ${isOwnMessage ? 'flex-row-reverse' : ''}`}
                        data-testid={`message-${message.id}`}
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={profile?.avatarUrl} />
                          <AvatarFallback className="bg-blue-100 text-blue-600 text-sm">
                            {profile?.name?.substring(0, 2).toUpperCase() || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <div className={`flex-1 ${isOwnMessage ? 'text-right' : ''}`}>
                          <div className="flex items-center gap-2 mb-1">
                            {!isOwnMessage && (
                              <>
                                <span className="text-sm font-semibold text-gray-900">
                                  {profile?.name || 'Unknown'}
                                </span>
                                {message.senderUid === group.leaderUid && (
                                  <Crown className="h-3 w-3 text-yellow-500" />
                                )}
                              </>
                            )}
                          </div>
                          <div
                            className={`inline-block px-4 py-2 rounded-lg ${
                              isOwnMessage
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100 text-gray-900'
                            }`}
                          >
                            {message.mediaUrl && message.mediaType === 'image' && (
                              <img 
                                src={message.mediaUrl} 
                                alt={message.fileName || 'Image'}
                                className="max-w-xs rounded-lg mb-2"
                                loading="lazy"
                                style={{ aspectRatio: '4/3', objectFit: 'cover', display: 'block' }}
                              />
                            )}
                            {message.mediaUrl && message.mediaType === 'video' && (
                              <video 
                                src={message.mediaUrl} 
                                controls
                                className="max-w-xs rounded-lg mb-2"
                                style={{ aspectRatio: '16/9', display: 'block' }}
                              />
                            )}
                            {message.mediaUrl && message.mediaType === 'document' && (
                              <a 
                                href={message.mediaUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className={`flex items-center gap-2 mb-2 ${isOwnMessage ? 'text-white' : 'text-blue-600'} hover:underline`}
                              >
                                <FileText className="h-4 w-4" />
                                {message.fileName || 'Document'}
                              </a>
                            )}
                            {message.text}
                          </div>
                          <p className="text-xs text-gray-400 mt-1">
                            {new Date(message.createdAt).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </CardContent>

              {/* Message Input */}
              <div className="border-t border-gray-200 p-4">
                {/* File Preview */}
                {selectedFile && (
                  <div className="mb-3 p-3 bg-gray-50 rounded-lg border border-gray-200 flex items-center gap-3">
                    {filePreview ? (
                      <img src={filePreview} alt="Preview" className="h-20 w-20 object-cover rounded" loading="lazy" />
                    ) : (
                      <div className="h-20 w-20 bg-gray-200 rounded flex items-center justify-center">
                        <FileText className="h-8 w-8 text-gray-400" />
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="font-medium text-sm">{selectedFile.name}</p>
                      <p className="text-xs text-gray-500">
                        {(selectedFile.size / 1024).toFixed(1)} KB
                      </p>
                      {uploadProgress > 0 && uploadProgress < 100 && (
                        <div className="mt-2 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full transition-all"
                            style={{ width: `${uploadProgress}%` }}
                          />
                        </div>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedFile(null);
                        setFilePreview("");
                        if (fileInputRef.current) fileInputRef.current.value = "";
                      }}
                      data-testid="button-remove-file"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}

                <div className="flex gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,video/*,.pdf,.doc,.docx,.txt"
                    onChange={handleFileSelect}
                    className="hidden"
                    data-testid="input-file"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={sendMessageMutation.isPending}
                    data-testid="button-attach"
                  >
                    <Paperclip className="h-4 w-4" />
                  </Button>
                  <Input
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    placeholder="Type a message..."
                    className="flex-1"
                    data-testid="input-message"
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={(!messageText.trim() && !selectedFile) || sendMessageMutation.isPending}
                    data-testid="button-send"
                  >
                    {sendMessageMutation.isPending || uploadProgress > 0 ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </Card>
          </div>

          {/* Members Sidebar */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-600" />
                  Members ({group.members.length}/{group.maxMembers})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {group.members.map((memberUid) => {
                  const profile = profiles[memberUid];
                  const isGroupLeader = memberUid === group.leaderUid;
                  const isCoLeader = group.coLeaders?.includes(memberUid);
                  const canRemove = isLeader && !isGroupLeader;
                  
                  return (
                    <div
                      key={memberUid}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50"
                      data-testid={`member-${memberUid}`}
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={profile?.avatarUrl} />
                        <AvatarFallback className="bg-blue-100 text-blue-600">
                          {profile?.name?.substring(0, 2).toUpperCase() || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-gray-900">
                            {profile?.name || 'Loading...'}
                          </p>
                          {isGroupLeader && (
                            <Badge variant="secondary" className="text-xs">
                              <Crown className="h-3 w-3 mr-1" />
                              Leader
                            </Badge>
                          )}
                          {isCoLeader && !isGroupLeader && (
                            <Badge variant="outline" className="text-xs">
                              <Star className="h-3 w-3 mr-1" />
                              Co-Leader
                            </Badge>
                          )}
                        </div>
                        {profile?.username && (
                          <p className="text-sm text-gray-500">@{profile.username}</p>
                        )}
                      </div>
                      {isLeader && !isGroupLeader && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              data-testid={`button-member-menu-${memberUid}`}
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {isCoLeader ? (
                              <DropdownMenuItem 
                                onClick={() => removeCoLeaderMutation.mutate(memberUid)}
                                data-testid={`button-remove-coleader-${memberUid}`}
                              >
                                <Star className="h-4 w-4 mr-2" />
                                Remove Co-Leader
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem 
                                onClick={() => assignCoLeaderMutation.mutate(memberUid)}
                                data-testid={`button-make-coleader-${memberUid}`}
                              >
                                <Star className="h-4 w-4 mr-2" />
                                Make Co-Leader
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => setMemberToRemove({ uid: memberUid, name: profile?.name || 'this member' })}
                              className="text-red-600"
                              data-testid={`button-remove-member-${memberUid}`}
                            >
                              <UserMinus className="h-4 w-4 mr-2" />
                              Remove from Group
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Remove Member Confirmation Dialog */}
      <AlertDialog open={!!memberToRemove} onOpenChange={(open) => !open && setMemberToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Member?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {memberToRemove?.name} from this group? 
              They will no longer have access to group messages and files.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => memberToRemove && removeMemberMutation.mutate(memberToRemove.uid)}
              className="bg-red-600 hover:bg-red-700"
              data-testid="button-confirm-remove"
            >
              {removeMemberMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Removing...
                </>
              ) : (
                'Remove Member'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
