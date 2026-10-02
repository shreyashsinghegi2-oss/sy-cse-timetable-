import { useState } from 'react';
import { getFirestore, doc, getDoc, setDoc, serverTimestamp, collection, query, where, getDocs } from 'firebase/firestore';
import { initializeApp, getApps } from 'firebase/app';

// Initialize Firebase for chat service
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Check if app already exists to avoid duplicate initialization
const existingApp = getApps().find(app => app.name === 'chat-service-app');
const app = existingApp || initializeApp(firebaseConfig, 'chat-service-app');
const db = getFirestore(app);

export function generateChatId(userId1: string, userId2: string): string {
  const sortedIds = [userId1, userId2].sort();
  return `${sortedIds[0]}_${sortedIds[1]}`;
}

export function useChatService() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  /**
   * Find existing chat or create new one between two users
   * Returns the chatId to navigate to
   */
  const findOrCreateChat = async (currentUserUid: string, targetUserUid: string) => {
    setIsLoading(true);
    setError(null);

    try {
      // Generate consistent chat ID (sorted to ensure uniqueness)
      const chatId = generateChatId(currentUserUid, targetUserUid);
      
      // Check if chat already exists
      const chatRef = doc(db, 'chats', chatId);
      const chatDoc = await getDoc(chatRef);

      if (chatDoc.exists()) {
        return { chatId, isNew: false };
      }

      // Create new chat document
      await setDoc(chatRef, {
        id: chatId,
        members: [currentUserUid, targetUserUid],
        createdAt: serverTimestamp(),
        lastMessage: null,
        lastMessageTime: null,
      });

      return { chatId, isNew: true };
    } catch (err) {
      const error = err as Error;
      console.warn('[Chat] Service error');
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    findOrCreateChat,
    isLoading,
    error,
  };
}
