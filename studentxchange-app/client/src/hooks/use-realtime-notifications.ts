import { useEffect, useState } from 'react';
import { useCollabAuth } from './use-collab-auth';

export type NotificationType = 
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

export interface RealtimeNotification {
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
  createdAt: Date;
}

export function useRealtimeNotifications() {
  const { user } = useCollabAuth();
  const [notifications, setNotifications] = useState<RealtimeNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user?.uid) {
      setNotifications([]);
      setUnreadCount(0);
      setIsLoading(false);
      return;
    }

    // Fetch notifications from backend API
    const fetchNotifications = async () => {
      try {
        const token = localStorage.getItem('collabAuthToken');
        if (!token) {
          setIsLoading(false);
          return;
        }

        const response = await fetch('/api/collab/social/notifications', {
          headers: { 'Authorization': `Bearer ${token}` },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch notifications');
        }

        const data = await response.json();
        const notifs = data.map((notif: any) => ({
          ...notif,
          createdAt: new Date(notif.createdAt),
        }));

        setNotifications(notifs);
        setUnreadCount(notifs.filter((n: any) => !n.isRead).length);
        setIsLoading(false);
      } catch (error) {
        console.warn('[Notifications] Fetch failed');
        setIsLoading(false);
      }
    };

    // Initial fetch
    fetchNotifications();

    // Poll for new notifications every 3 seconds
    const interval = setInterval(fetchNotifications, 3000);

    return () => clearInterval(interval);
  }, [user?.uid]);

  return { notifications, unreadCount, isLoading };
}
