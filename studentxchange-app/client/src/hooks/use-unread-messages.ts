import { useState, useEffect, useContext } from 'react';
import { getFirestore, collection, query, where, onSnapshot, FirestoreError } from 'firebase/firestore';
import app from '@/lib/firebase';
import { CollabAuthContext } from './use-collab-auth';

/**
 * Hook to track total unread message count in real-time
 * Safe to use outside CollabAuthProvider (returns 0)
 * Silently handles Firestore permission errors to prevent UI disruption
 */
export function useUnreadMessages() {
  const context = useContext(CollabAuthContext);
  const user = context?.user || null;
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user?.uid) {
      setUnreadCount(0);
      return;
    }

    let unsubscribe: (() => void) | undefined;

    try {
      const db = getFirestore(app);
      const messagesRef = collection(db, 'messages');
      
      // Query for unread messages where current user is the receiver
      const unreadQuery = query(
        messagesRef,
        where('receiverUid', '==', user.uid),
        where('isRead', '==', false)
      );

      unsubscribe = onSnapshot(
        unreadQuery, 
        (snapshot) => {
          setUnreadCount(snapshot.docs.length);
        }, 
        (error: FirestoreError) => {
          // Silently handle permission errors - don't log to console
          // This prevents the runtime error overlay from appearing
          if (error.code !== 'permission-denied') {
            console.warn('Unread messages error:', error.code);
          }
          setUnreadCount(0);
        }
      );
    } catch (error) {
      // Silently handle any initialization errors
      setUnreadCount(0);
    }

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [user?.uid]);

  return unreadCount;
}
