import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, Heart, MessageSquare, UserPlus, Users, CheckCircle, XCircle, ArrowLeft, Check, X } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useRealtimeNotifications } from "@/hooks/use-realtime-notifications";
import { useConnectionRequests, useAcceptConnectionRequest, useRejectConnectionRequest } from "@/hooks/use-connections";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface NotificationProfile {
  username: string;
  name: string;
  avatarUrl?: string;
}

export default function CollabNotificationsPage() {
  const [, setLocation] = useLocation();
  const { notifications, isLoading } = useRealtimeNotifications();
  const { requests: connectionRequests, isLoading: isLoadingRequests } = useConnectionRequests();
  const acceptRequest = useAcceptConnectionRequest();
  const rejectRequest = useRejectConnectionRequest();
  const { toast } = useToast();
  const [processedNotifications, setProcessedNotifications] = useState<Set<string>>(new Set());

  // Mark all as read when page opens
  useEffect(() => {
    markAllAsReadMutation.mutate();
  }, []);

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const token = localStorage.getItem('collabAuthToken');
      const response = await fetch('/api/collab/social/notifications/mark-all-read', {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to mark as read');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/collab/social/notifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/collab/social/notifications/unread-count'] });
    },
  });

  const acceptJoinRequestMutation = useMutation({
    mutationFn: async ({ requestId, notificationId, postId }: { requestId: string; notificationId: string; postId: string }) => {
      const token = localStorage.getItem('collabAuthToken');
      const response = await fetch(`/api/collab/social/join-requests/${requestId}/accept-and-create-group`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ notificationId, postId }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to accept join request');
      }
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Request Accepted",
        description: `New group created with ${data.requesterName}`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/collab/social/notifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/collab/social/notifications/unread-count'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Cannot Accept Request",
        description: error.message || "Failed to accept join request",
        variant: "destructive",
      });
    },
  });

  const rejectJoinRequestMutation = useMutation({
    mutationFn: async ({ requestId, notificationId, postId }: { requestId: string; notificationId: string; postId: string }) => {
      const token = localStorage.getItem('collabAuthToken');
      const response = await fetch(`/api/collab/social/join-requests/${requestId}/reject-with-notification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ notificationId, postId }),
      });
      if (!response.ok) throw new Error('Failed to reject join request');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Request Rejected",
        description: "Join request has been rejected",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/collab/social/notifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/collab/social/notifications/unread-count'] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to reject join request",
        variant: "destructive",
      });
    },
  });

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'post_like':
      case 'comment_like':
        return <Heart className="h-5 w-5 text-red-500" />;
      case 'post_comment':
      case 'comment_reply':
        return <MessageSquare className="h-5 w-5 text-blue-500" />;
      case 'connection_request':
        return <UserPlus className="h-5 w-5 text-blue-500" />;
      case 'connection_accepted':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'join_request_accepted':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'join_request_rejected':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'group_member_joined':
        return <Users className="h-5 w-5 text-blue-500" />;
      default:
        return <Bell className="h-5 w-5 text-gray-500" />;
    }
  };

  const handleNotificationClick = (notification: any) => {
    if (notification.relatedGroupId) {
      setLocation(`/collab-groups/${notification.relatedGroupId}`);
    } else if (notification.relatedPostId) {
      // Navigate to main feed where the post is displayed
      setLocation('/student-collab');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          {/* Back Button */}
          <div className="mb-6">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/student-collab">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Student Collab
              </Link>
            </Button>
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notifications
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <Bell className="h-12 w-12 mx-auto text-gray-400 mb-4 animate-pulse" />
                <p className="text-gray-600">Loading notifications...</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Back Button */}
        <div className="mb-6">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/student-collab">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Student Collab
            </Link>
          </Button>
        </div>

        {/* Connection Requests Section */}
        {connectionRequests && connectionRequests.length > 0 && (
          <Card className="mb-6 border-blue-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-700">
                <UserPlus className="h-5 w-5" />
                Connection Requests ({connectionRequests.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {connectionRequests.map((request) => (
                  <div
                    key={request.id}
                    className="flex items-center gap-4 p-4 rounded-lg bg-blue-50 border border-blue-100"
                    data-testid={`connection-request-${request.requesterId}`}
                  >
                    {/* Avatar */}
                    <Avatar className="h-14 w-14 ring-2 ring-blue-200">
                      <AvatarImage src={request.requesterAvatarUrl} alt={request.requesterName} />
                      <AvatarFallback className="bg-blue-600 text-white font-semibold">
                        {request.requesterName.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-gray-900">{request.requesterName}</h4>
                      <p className="text-sm text-gray-600">@{request.requesterUsername}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {request.requesterRole || 'Student'}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {formatDistanceToNow(new Date(request.timestamp.toDate ? request.timestamp.toDate() : request.timestamp), { addSuffix: true })}
                      </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 text-white"
                        onClick={() => acceptRequest.mutate({ 
                          requesterId: request.requesterId, 
                          requesterName: request.requesterName 
                        })}
                        disabled={acceptRequest.isPending || rejectRequest.isPending}
                        data-testid={`button-accept-${request.requesterId}`}
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-red-500 text-red-600 hover:bg-red-50"
                        onClick={() => rejectRequest.mutate(request.requesterId)}
                        disabled={acceptRequest.isPending || rejectRequest.isPending}
                        data-testid={`button-reject-${request.requesterId}`}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Reject
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Notifications List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              All Notifications
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!notifications || notifications.length === 0 ? (
              <div className="text-center py-12">
                <Bell className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600">No notifications yet</p>
                <p className="text-sm text-gray-400 mt-2">
                  You'll see notifications for likes, comments, and group activities here
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {notifications.map((notification) => {
                  const isClickable = !!(notification.relatedPostId || notification.relatedGroupId);
                  const isJoinRequest = notification.type === 'join_request';
                  const isConnectionRequest = notification.type === 'connection_request';
                  const notificationStatus = (notification as any).status;
                  const isProcessed = processedNotifications.has(notification.id) || notificationStatus;

                  return (
                    <div
                      key={notification.id}
                      onClick={() => !isJoinRequest && !isConnectionRequest && isClickable && handleNotificationClick(notification)}
                      className={`flex items-start gap-3 p-4 rounded-lg transition-colors ${
                        !isJoinRequest && !isConnectionRequest && isClickable ? 'hover:bg-gray-50 cursor-pointer' : ''
                      } ${!notification.isRead ? 'bg-blue-50' : ''}`}
                      data-testid={`notification-${notification.id}`}
                    >
                      {/* Connection Request - Special Layout */}
                      {isConnectionRequest ? (
                        <>
                          {/* Sender Avatar */}
                          <Avatar className="h-14 w-14 md:h-16 md:w-16 ring-2 ring-blue-200">
                            <AvatarImage 
                              src={notification.senderAvatarUrl || ''} 
                              alt={notification.senderName || 'User'} 
                              width="64"
                              height="64"
                            />
                            <AvatarFallback className="bg-blue-600 text-white font-semibold text-lg">
                              {(notification.senderName?.[0] || '?').toUpperCase()}
                            </AvatarFallback>
                          </Avatar>

                          {/* Profile Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                              <div>
                                <h4 className="font-semibold text-gray-900 text-base">
                                  {notification.senderName || notification.senderUsername}
                                </h4>
                                {notification.senderUsername && (
                                  <p className="text-sm text-gray-600">@{notification.senderUsername}</p>
                                )}
                                <p className="text-sm text-gray-700 mt-2">
                                  {notification.message}
                                </p>
                                <p className="text-xs text-gray-400 mt-1">
                                  {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                                </p>
                              </div>

                              {/* Action Buttons - Instagram Style */}
                              {!isProcessed ? (
                                <div className="flex gap-2 flex-shrink-0">
                                  <Button
                                    size="sm"
                                    className="bg-blue-500 hover:bg-blue-600 text-white rounded-full px-4 h-8"
                                    onClick={async () => {
                                      if (notification.senderUid) {
                                        try {
                                          await acceptRequest.mutateAsync({ 
                                            requesterId: notification.senderUid, 
                                            requesterName: notification.senderName || notification.senderUsername || 'User' 
                                          });
                                          setProcessedNotifications(prev => new Set(prev).add(notification.id));
                                          toast({ title: "Connected!", description: "Connection request accepted." });
                                        } catch {
                                          toast({ title: "Could not accept", description: "The connection request may have expired. Please try again.", variant: "destructive" });
                                        }
                                      }
                                    }}
                                    disabled={acceptRequest.isPending || rejectRequest.isPending}
                                    data-testid={`button-accept-connection-${notification.id}`}
                                  >
                                    <Check className="h-3 w-3 mr-1" />
                                    Accept
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-full px-4 h-8 border-gray-300"
                                    onClick={() => {
                                      if (notification.senderUid) {
                                        rejectRequest.mutate(notification.senderUid);
                                        setProcessedNotifications(prev => new Set(prev).add(notification.id));
                                      }
                                    }}
                                    disabled={acceptRequest.isPending || rejectRequest.isPending}
                                    data-testid={`button-reject-connection-${notification.id}`}
                                  >
                                    <X className="h-3 w-3 mr-1" />
                                    Reject
                                  </Button>
                                </div>
                              ) : (
                                <Badge 
                                  variant={notificationStatus === 'accepted' ? 'default' : 'secondary'}
                                  className="flex-shrink-0"
                                >
                                  {notificationStatus === 'accepted' ? 'Connected' : 'Rejected'}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </>
                      ) : isJoinRequest ? (
                        <>
                          {/* Sender Avatar */}
                          <Avatar className="h-14 w-14 md:h-16 md:w-16 ring-2 ring-blue-200">
                            <AvatarImage 
                              src={notification.senderAvatarUrl || ''} 
                              alt={notification.senderName || 'User'} 
                              width="64"
                              height="64"
                            />
                            <AvatarFallback className="bg-blue-600 text-white font-semibold text-lg">
                              {(notification.senderName?.[0] || '?').toUpperCase()}
                            </AvatarFallback>
                          </Avatar>

                          {/* Profile Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                              <div>
                                <h4 className="font-semibold text-gray-900 text-base">
                                  {notification.senderName || notification.senderUsername}
                                </h4>
                                {notification.senderUsername && (
                                  <p className="text-sm text-gray-600">@{notification.senderUsername}</p>
                                )}
                                <Badge variant="outline" className="mt-1">
                                  {(notification as any).senderRole || 'Student'}
                                </Badge>
                                <p className="text-sm text-gray-700 mt-2">
                                  {notification.message}
                                </p>
                                <p className="text-xs text-gray-400 mt-1">
                                  {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                                </p>
                              </div>

                              {/* Action Buttons - Instagram Style */}
                              {!isProcessed ? (
                                <div className="flex gap-2 flex-shrink-0">
                                  <Button
                                    size="sm"
                                    className="bg-blue-500 hover:bg-blue-600 text-white rounded-full px-4 h-8"
                                    onClick={() => {
                                      if (notification.relatedJoinRequestId && notification.relatedPostId) {
                                        acceptJoinRequestMutation.mutate({ 
                                          requestId: notification.relatedJoinRequestId, 
                                          notificationId: notification.id,
                                          postId: notification.relatedPostId 
                                        });
                                        setProcessedNotifications(prev => new Set(prev).add(notification.id));
                                      }
                                    }}
                                    disabled={acceptJoinRequestMutation.isPending || rejectJoinRequestMutation.isPending}
                                    data-testid={`button-accept-join-${notification.id}`}
                                  >
                                    <Check className="h-3 w-3 mr-1" />
                                    Accept
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-full px-4 h-8 border-gray-300"
                                    onClick={() => {
                                      if (notification.relatedJoinRequestId && notification.relatedPostId) {
                                        rejectJoinRequestMutation.mutate({ 
                                          requestId: notification.relatedJoinRequestId, 
                                          notificationId: notification.id,
                                          postId: notification.relatedPostId 
                                        });
                                        setProcessedNotifications(prev => new Set(prev).add(notification.id));
                                      }
                                    }}
                                    disabled={acceptJoinRequestMutation.isPending || rejectJoinRequestMutation.isPending}
                                    data-testid={`button-reject-join-${notification.id}`}
                                  >
                                    <X className="h-3 w-3 mr-1" />
                                    Reject
                                  </Button>
                                </div>
                              ) : (
                                <Badge 
                                  variant={notificationStatus === 'accepted' ? 'default' : 'secondary'}
                                  className="flex-shrink-0"
                                >
                                  {notificationStatus === 'accepted' ? 'Accepted' : 'Rejected'}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          {/* Regular Notification Layout */}
                          <div className="mt-1">
                            {getNotificationIcon(notification.type)}
                          </div>

                          <Avatar className="h-12 w-12">
                            <AvatarImage 
                              src={notification.senderAvatarUrl || ''} 
                              alt={notification.senderName || 'User'} 
                            />
                            <AvatarFallback className="bg-blue-600 text-white">
                              {(notification.senderName?.[0] || notification.senderUsername?.[0] || '?').toUpperCase()}
                            </AvatarFallback>
                          </Avatar>

                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-900">
                              {notification.message}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                            </p>
                          </div>

                          {!notification.isRead && (
                            <div className="h-2 w-2 rounded-full bg-blue-600" />
                          )}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
