import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { getFirestore, collection, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';
import app from '@/lib/firebase';

export interface Notification {
  id: string;
  recipientUid: string;
  senderUid: string;
  type: string;
  message: string;
  relatedPostId?: string;
  relatedCommentId?: string;
  relatedGroupId?: string;
  isRead: boolean;
  createdAt: string;
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const uid = localStorage.getItem('collab_uid');

  // Real-time listener for notifications
  useEffect(() => {
    if (!uid) {
      setIsLoading(false);
      return;
    }

    const db = getFirestore(app);
    const notificationsRef = collection(db, 'notifications');
    const q = query(
      notificationsRef,
      where('recipientUid', '==', uid),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifs: Notification[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        notifs.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        } as Notification);
      });
      setNotifications(notifs);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [uid]);

  return { data: notifications, isLoading };
}

export function useUnreadCount() {
  const [unreadCount, setUnreadCount] = useState(0);
  const uid = localStorage.getItem('collab_uid');
  const token = localStorage.getItem('collabAuthToken');

  // Real-time listener for unread notifications
  useEffect(() => {
    if (!uid) return;

    const db = getFirestore(app);
    const notificationsRef = collection(db, 'notifications');
    const q = query(
      notificationsRef,
      where('recipientUid', '==', uid),
      where('isRead', '==', false)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setUnreadCount(snapshot.size);
    });

    return () => unsubscribe();
  }, [uid]);

  // Also fetch from API as fallback
  const { data } = useQuery<{ count: number }>({
    queryKey: ['/api/collab/social/notifications/unread-count'],
    enabled: !!token,
    refetchInterval: 30000, // Refetch every 30 seconds as backup
  });

  return unreadCount > 0 ? unreadCount : (data?.count || 0);
}
