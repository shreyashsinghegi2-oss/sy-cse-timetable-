import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Bell, Check, X, User, MessageCircle, Heart, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { formatDistanceToNow } from 'date-fns';
import { useLocation } from 'wouter';
import { useRealtimeNotifications } from '@/hooks/use-realtime-notifications';
import { useToast } from '@/hooks/use-toast';

type NotificationType = 
  | 'post_like'
  | 'post_comment'
  | 'comment_reply'
  | 'comment_like'
  | 'join_request'
  | 'join_request_accepted'
  | 'join_request_rejected'
  | 'group_member_joined'
  | 'connection_request'
  | 'connection_accepted';

interface CollabNotification {
  id: string;
  recipientUid: string;
  senderUid: string;
  senderName?: string;
  senderUsername?: string;
  senderAvatarUrl?: string;
  type: NotificationType;
  message: string;
  relatedPostId?: string;
  relatedCommentId?: string;
  relatedGroupId?: string;
  relatedConnectionId?: string;
  relatedJoinRequestId?: string;
  isRead: boolean;
  createdAt: string | Date;
}

export default function NotificationsDropdown() {
  const [, setLocation] = useLocation();
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  // Use real-time notifications hook
  const { notifications, unreadCount, isLoading } = useRealtimeNotifications();

  const markAsReadMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest('PUT', `/api/collab/social/notifications/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/collab/social/notifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/collab/social/notifications/unread-count'] });
    },
  });

  const acceptConnectionMutation = useMutation({
    mutationFn: async (requesterId: string) => {
      const result = await apiRequest('POST', `/api/collab/connections/accept`, { requesterId });
      if (result && result.success === false) {
        throw new Error(result.error || 'Failed to accept connection request');
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/collab/connections'] });
      queryClient.invalidateQueries({ queryKey: ['/api/collab/social/notifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/collab/social/notifications/unread-count'] });
      toast({ title: "Connected!", description: "Connection request accepted." });
    },
    onError: () => {
      toast({ title: "Could not accept", description: "The connection request may have expired. Please try again.", variant: "destructive" });
    }
  });

  const rejectConnectionMutation = useMutation({
    mutationFn: async ({ requesterId, notificationId }: { requesterId: string; notificationId: string }) => {
      await apiRequest('POST', `/api/collab/connections/reject`, { requesterId });
      await apiRequest('PUT', `/api/collab/social/notifications/${notificationId}/read`);
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/collab/connections'] });
      queryClient.invalidateQueries({ queryKey: ['/api/collab/social/notifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/collab/social/notifications/unread-count'] });
    },
  });

  const acceptJoinRequestMutation = useMutation({
    mutationFn: async ({ requestId, postId }: { requestId: string; postId: string }) => {
      return await apiRequest('POST', `/api/collab/social/join-requests/${requestId}/accept`, { postId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/collab/social/notifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/collab/social/notifications/unread-count'] });
      queryClient.invalidateQueries({ queryKey: ['/api/collab/social/posts'] });
    },
  });

  const rejectJoinRequestMutation = useMutation({
    mutationFn: async ({ requestId, notificationId }: { requestId: string; notificationId: string }) => {
      await apiRequest('POST', `/api/collab/social/join-requests/${requestId}/reject`);
      await apiRequest('PUT', `/api/collab/social/notifications/${notificationId}/read`);
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/collab/social/notifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/collab/social/notifications/unread-count'] });
    },
  });

  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case 'connection_request':
      case 'connection_accepted':
        return <User className="w-4 h-4" />;
      case 'post_like':
      case 'comment_like':
        return <Heart className="w-4 h-4" />;
      case 'post_comment':
      case 'comment_reply':
        return <MessageCircle className="w-4 h-4" />;
      case 'join_request':
      case 'join_request_accepted':
      case 'join_request_rejected':
      case 'group_member_joined':
        return <Users className="w-4 h-4" />;
      default:
        return <Bell className="w-4 h-4" />;
    }
  };

  const handleNotificationClick = (notification: CollabNotification) => {
    if (!notification.isRead) {
      markAsReadMutation.mutate(notification.id);
    }

    // For connection requests, navigate to sender's profile
    if (notification.type === 'connection_request' || notification.type === 'connection_accepted') {
      setOpen(false);
      setLocation(`/collab-user-profile/${notification.senderUid}`);
    } else if (notification.relatedPostId) {
      setOpen(false);
      setLocation('/collab-social');
    } else if (notification.relatedGroupId) {
      setOpen(false);
      setLocation(`/collab-messages?groupId=${notification.relatedGroupId}`);
    }
  };

  const handleAcceptConnection = async (e: React.MouseEvent, requesterId: string, notificationId: string) => {
    e.stopPropagation();
    try {
      await acceptConnectionMutation.mutateAsync(requesterId);
      await markAsReadMutation.mutateAsync(notificationId);
    } catch (error) {
      console.error('Failed to accept connection:', error);
    }
  };

  const handleRejectConnection = async (e: React.MouseEvent, requesterId: string, notificationId: string) => {
    e.stopPropagation();
    await rejectConnectionMutation.mutateAsync({ requesterId, notificationId });
  };

  const handleAcceptJoinRequest = async (e: React.MouseEvent, requestId: string, postId: string, notificationId: string) => {
    e.stopPropagation();
    try {
      await acceptJoinRequestMutation.mutateAsync({ requestId, postId });
      await markAsReadMutation.mutateAsync(notificationId);
    } catch (error) {
      console.error('Failed to accept join request:', error);
    }
  };

  const handleRejectJoinRequest = async (e: React.MouseEvent, requestId: string, notificationId: string) => {
    e.stopPropagation();
    await rejectJoinRequestMutation.mutateAsync({ requestId, notificationId });
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative border-0 shadow-none hover:bg-transparent"
          data-testid="button-notifications"
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <Badge
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs animate-in fade-in zoom-in duration-200"
              data-testid="badge-unread-count"
            >
              {unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold" data-testid="text-notifications-title">Notifications</h3>
        </div>
        <ScrollArea className="h-96">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground" data-testid="text-no-notifications">
              <Bell className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No notifications yet</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification, index) => (
                <div
                  key={notification.id}
                  className={`p-4 cursor-pointer hover:bg-accent transition-all duration-200 animate-in fade-in slide-in-from-top-2 ${
                    !notification.isRead ? 'bg-blue-50/50 dark:bg-blue-950/20' : ''
                  }`}
                  style={{ animationDelay: `${index * 50}ms` }}
                  onClick={() => handleNotificationClick(notification)}
                  data-testid={`notification-item-${notification.id}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-1">
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={notification.senderAvatarUrl || ''} alt={notification.senderName || 'User'} />
                        <AvatarFallback className="bg-primary/10">
                          {notification.senderName?.charAt(0) || notification.senderUsername?.charAt(0) || 'U'}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium" data-testid={`text-notification-message-${notification.id}`}>
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1" data-testid={`text-notification-time-${notification.id}`}>
                        {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                      </p>
                      
                      {notification.type === 'connection_request' && (
                        <div className="flex gap-2 mt-3">
                          <Button
                            size="sm"
                            onClick={(e) => handleAcceptConnection(e, notification.senderUid, notification.id)}
                            disabled={acceptConnectionMutation.isPending || rejectConnectionMutation.isPending}
                            data-testid={`button-accept-connection-${notification.id}`}
                          >
                            <Check className="w-3 h-3 mr-1" />
                            Accept
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => handleRejectConnection(e, notification.senderUid, notification.id)}
                            disabled={acceptConnectionMutation.isPending || rejectConnectionMutation.isPending}
                            data-testid={`button-reject-connection-${notification.id}`}
                          >
                            <X className="w-3 h-3 mr-1" />
                            Reject
                          </Button>
                        </div>
                      )}

                      {notification.type === 'join_request' && notification.relatedJoinRequestId && notification.relatedPostId && (
                        <div className="flex gap-2 mt-3">
                          <Button
                            size="sm"
                            onClick={(e) => handleAcceptJoinRequest(e, notification.relatedJoinRequestId!, notification.relatedPostId!, notification.id)}
                            disabled={acceptJoinRequestMutation.isPending || rejectJoinRequestMutation.isPending}
                            data-testid={`button-accept-join-request-${notification.id}`}
                          >
                            <Check className="w-3 h-3 mr-1" />
                            Accept
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => handleRejectJoinRequest(e, notification.relatedJoinRequestId!, notification.id)}
                            disabled={acceptJoinRequestMutation.isPending || rejectJoinRequestMutation.isPending}
                            data-testid={`button-reject-join-request-${notification.id}`}
                          >
                            <X className="w-3 h-3 mr-1" />
                            Reject
                          </Button>
                        </div>
                      )}
                    </div>
                    {!notification.isRead && (
                      <div className="flex-shrink-0">
                        <div className="w-2 h-2 rounded-full bg-blue-500" data-testid={`indicator-unread-${notification.id}`} />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
