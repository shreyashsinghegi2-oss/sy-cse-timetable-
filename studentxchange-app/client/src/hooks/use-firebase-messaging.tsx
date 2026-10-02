import { useState, useEffect, useCallback } from 'react';
import { firebaseStudentService, FirebaseMessage, FirebaseConversation } from '@/services/firebase-student-service';
import { useAuth } from '@/hooks/use-auth';
import { useFirebaseStudentProfile } from '@/hooks/use-firebase-student-profile';

export function useFirebaseMessaging() {
  const { user } = useAuth();
  const { profile } = useFirebaseStudentProfile();
  const [conversations, setConversations] = useState<FirebaseConversation[]>([]);
  const [currentMessages, setCurrentMessages] = useState<FirebaseMessage[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load conversations with real-time updates
  useEffect(() => {
    if (!user) {
      setConversations([]);
      setIsLoading(false);
      return;
    }

    const unsubscribe = firebaseStudentService.onConversationsUpdate(user.id, (updatedConversations) => {
      setConversations(updatedConversations);
      setIsLoading(false);
    });

    return unsubscribe;
  }, [user]);

  // Load messages for current conversation with real-time updates
  useEffect(() => {
    if (!user || !currentConversationId) {
      setCurrentMessages([]);
      return;
    }

    const [userId1, userId2] = currentConversationId.split('_').map(Number);
    const otherUserId = userId1 === user.id ? userId2 : userId1;

    const unsubscribe = firebaseStudentService.onMessagesUpdate(user.id, otherUserId, (messages) => {
      setCurrentMessages(messages);
    });

    return unsubscribe;
  }, [user, currentConversationId]);

  const sendMessage = async (receiverId: number, content: string, receiverName: string) => {
    if (!user || !profile) throw new Error('User not authenticated or no profile');

    try {
      await firebaseStudentService.sendMessage({
        senderId: user.id,
        receiverId,
        senderName: profile.username,
        receiverName,
        content,
        messageType: 'text',
        isRead: false
      });
    } catch (error) {
      console.warn('[Messaging] Send failed');
      throw error;
    }
  };

  const startConversation = useCallback((userId1: number, userId2: number) => {
    const conversationId = [userId1, userId2].sort().join('_');
    setCurrentConversationId(conversationId);
  }, []);

  const markAsRead = async (conversationId: string) => {
    if (!user) return;

    try {
      await firebaseStudentService.markMessagesAsRead(conversationId, user.id);
    } catch (error) {
      console.warn('[Messaging] Mark read failed');
    }
  };

  const getTotalUnreadCount = () => {
    if (!user) return 0;
    
    return conversations.reduce((total, conversation) => {
      return total + (conversation.unreadCount[user.id] || 0);
    }, 0);
  };

  const getConversationWithUser = (otherUserId: number) => {
    return conversations.find(conv => conv.participants.includes(otherUserId));
  };

  return {
    conversations,
    currentMessages,
    currentConversationId,
    isLoading,
    sendMessage,
    startConversation,
    markAsRead,
    getTotalUnreadCount,
    getConversationWithUser
  };
}