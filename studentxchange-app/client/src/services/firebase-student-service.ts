import { db } from '@/lib/firebase';
import { ref, set, get, push, onValue, off, update, remove, query, orderByChild, equalTo } from 'firebase/database';

// Types for Firebase Student Collab data
export interface FirebaseStudentProfile {
  id: string;
  userId: number;
  name: string;
  username: string;
  email: string;
  phone?: string;
  college: string;
  career: string;
  
  // Academic Stream fields - support ALL disciplines
  primaryStream?: string;
  subStreams?: string[];
  specialties?: string[];
  
  skills: string[];
  currentCourse: string;
  interests: string[];
  passions?: string[];
  studentLifeActivities?: string[];
  
  // Collaboration preferences
  openToCrossStreamCollab?: boolean;
  preferredCollabTypes?: string[];
  
  bio?: string;
  avatarUrl?: string;
  isAvailableForCollab: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface FirebaseConnection {
  id: string;
  requesterId: number;
  receiverId: number;
  requesterProfile: Partial<FirebaseStudentProfile>;
  receiverProfile: Partial<FirebaseStudentProfile>;
  status: 'pending' | 'accepted' | 'rejected';
  requestedAt: number;
  respondedAt?: number;
}

export interface FirebaseMessage {
  id: string;
  senderId: number;
  receiverId: number;
  senderName: string;
  receiverName: string;
  content: string;
  messageType: 'text' | 'image' | 'file';
  attachmentUrl?: string;
  isRead: boolean;
  sentAt: number;
}

export interface FirebaseConversation {
  id: string;
  participants: number[];
  participantNames: { [userId: number]: string };
  lastMessage: Partial<FirebaseMessage>;
  lastMessageAt: number;
  unreadCount: { [userId: number]: number };
}

class FirebaseStudentService {
  // Student Profiles
  async createStudentProfile(profile: Omit<FirebaseStudentProfile, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const profilesRef = ref(db, 'studentProfiles');
    const newProfileRef = push(profilesRef);
    const profileId = newProfileRef.key!;
    
    const profileData: FirebaseStudentProfile = {
      ...profile,
      id: profileId,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    
    await set(newProfileRef, profileData);
    return profileId;
  }

  async getStudentProfile(userId: number): Promise<FirebaseStudentProfile | null> {
    const profilesRef = ref(db, 'studentProfiles');
    const profileQuery = query(profilesRef, orderByChild('userId'), equalTo(userId));
    const snapshot = await get(profileQuery);
    
    if (snapshot.exists()) {
      const profiles = snapshot.val();
      const profileKey = Object.keys(profiles)[0];
      return profiles[profileKey];
    }
    return null;
  }

  async updateStudentProfile(profileId: string, updates: Partial<FirebaseStudentProfile>): Promise<void> {
    const profileRef = ref(db, `studentProfiles/${profileId}`);
    await update(profileRef, {
      ...updates,
      updatedAt: Date.now()
    });
  }

  async searchStudents(searchQuery: string): Promise<FirebaseStudentProfile[]> {
    const profilesRef = ref(db, 'studentProfiles');
    const snapshot = await get(profilesRef);
    
    if (!snapshot.exists()) return [];
    
    const profiles = snapshot.val();
    const searchResults: FirebaseStudentProfile[] = [];
    
    Object.values(profiles).forEach((profile: any) => {
      const searchableText = `${profile.name || ''} ${profile.username} ${profile.college} ${profile.skills?.join(' ')} ${profile.interests?.join(' ')}`.toLowerCase();
      if (searchableText.includes(searchQuery.toLowerCase())) {
        searchResults.push(profile);
      }
    });
    
    return searchResults;
  }

  async checkUsernameAvailability(username: string, excludeUserId?: number): Promise<boolean> {
    const profilesRef = ref(db, 'studentProfiles');
    const snapshot = await get(profilesRef);
    
    if (!snapshot.exists()) return true;
    
    const profiles = snapshot.val();
    const isAvailable = !Object.values(profiles).some((profile: any) => 
      profile.username.toLowerCase() === username.toLowerCase() && 
      (excludeUserId === undefined || profile.userId !== excludeUserId)
    );
    
    return isAvailable;
  }

  // Connections
  async sendConnectionRequest(requesterId: number, receiverId: number, requesterProfile: Partial<FirebaseStudentProfile>, receiverProfile: Partial<FirebaseStudentProfile>): Promise<string> {
    const connectionsRef = ref(db, 'connections');
    const newConnectionRef = push(connectionsRef);
    const connectionId = newConnectionRef.key!;
    
    const connectionData: FirebaseConnection = {
      id: connectionId,
      requesterId,
      receiverId,
      requesterProfile,
      receiverProfile,
      status: 'pending',
      requestedAt: Date.now()
    };
    
    await set(newConnectionRef, connectionData);
    return connectionId;
  }

  async getUserConnections(userId: number): Promise<FirebaseConnection[]> {
    const connectionsRef = ref(db, 'connections');
    const snapshot = await get(connectionsRef);
    
    if (!snapshot.exists()) return [];
    
    const connections = snapshot.val();
    const userConnections: FirebaseConnection[] = [];
    
    Object.values(connections).forEach((connection: any) => {
      if (connection.requesterId === userId || connection.receiverId === userId) {
        userConnections.push(connection);
      }
    });
    
    return userConnections.sort((a, b) => b.requestedAt - a.requestedAt);
  }

  async updateConnectionStatus(connectionId: string, status: 'accepted' | 'rejected'): Promise<void> {
    const connectionRef = ref(db, `connections/${connectionId}`);
    await update(connectionRef, {
      status,
      respondedAt: Date.now()
    });
  }

  // Real-time messaging
  async sendMessage(message: Omit<FirebaseMessage, 'id' | 'sentAt'>): Promise<string> {
    const messagesRef = ref(db, 'messages');
    const newMessageRef = push(messagesRef);
    const messageId = newMessageRef.key!;
    
    const messageData: FirebaseMessage = {
      ...message,
      id: messageId,
      sentAt: Date.now()
    };
    
    await set(newMessageRef, messageData);
    
    // Update conversation
    await this.updateConversation(message.senderId, message.receiverId, messageData);
    
    return messageId;
  }

  private async updateConversation(senderId: number, receiverId: number, lastMessage: FirebaseMessage): Promise<void> {
    const conversationId = this.getConversationId(senderId, receiverId);
    const conversationRef = ref(db, `conversations/${conversationId}`);
    
    const conversationData: FirebaseConversation = {
      id: conversationId,
      participants: [senderId, receiverId].sort(),
      participantNames: {
        [senderId]: lastMessage.senderName,
        [receiverId]: lastMessage.receiverName
      },
      lastMessage: {
        content: lastMessage.content,
        sentAt: lastMessage.sentAt,
        senderId: lastMessage.senderId
      },
      lastMessageAt: lastMessage.sentAt,
      unreadCount: {
        [senderId]: 0,
        [receiverId]: 1
      }
    };
    
    await set(conversationRef, conversationData);
  }

  private getConversationId(userId1: number, userId2: number): string {
    return [userId1, userId2].sort().join('_');
  }

  async getConversationMessages(userId1: number, userId2: number): Promise<FirebaseMessage[]> {
    const messagesRef = ref(db, 'messages');
    const snapshot = await get(messagesRef);
    
    if (!snapshot.exists()) return [];
    
    const messages = snapshot.val();
    const conversationMessages: FirebaseMessage[] = [];
    
    Object.values(messages).forEach((message: any) => {
      if ((message.senderId === userId1 && message.receiverId === userId2) ||
          (message.senderId === userId2 && message.receiverId === userId1)) {
        conversationMessages.push(message);
      }
    });
    
    return conversationMessages.sort((a, b) => a.sentAt - b.sentAt);
  }

  async getUserConversations(userId: number): Promise<FirebaseConversation[]> {
    const conversationsRef = ref(db, 'conversations');
    const snapshot = await get(conversationsRef);
    
    if (!snapshot.exists()) return [];
    
    const conversations = snapshot.val();
    const userConversations: FirebaseConversation[] = [];
    
    Object.values(conversations).forEach((conversation: any) => {
      if (conversation.participants.includes(userId)) {
        userConversations.push(conversation);
      }
    });
    
    return userConversations.sort((a, b) => b.lastMessageAt - a.lastMessageAt);
  }

  async markMessagesAsRead(conversationId: string, userId: number): Promise<void> {
    const conversationRef = ref(db, `conversations/${conversationId}/unreadCount/${userId}`);
    await set(conversationRef, 0);
  }

  // Real-time listeners
  onConversationsUpdate(userId: number, callback: (conversations: FirebaseConversation[]) => void): () => void {
    const conversationsRef = ref(db, 'conversations');
    
    const unsubscribe = onValue(conversationsRef, (snapshot) => {
      if (!snapshot.exists()) {
        callback([]);
        return;
      }
      
      const conversations = snapshot.val();
      const userConversations: FirebaseConversation[] = [];
      
      Object.values(conversations).forEach((conversation: any) => {
        if (conversation.participants.includes(userId)) {
          userConversations.push(conversation);
        }
      });
      
      callback(userConversations.sort((a, b) => b.lastMessageAt - a.lastMessageAt));
    });
    
    return () => off(conversationsRef, 'value', unsubscribe);
  }

  onMessagesUpdate(userId1: number, userId2: number, callback: (messages: FirebaseMessage[]) => void): () => void {
    const messagesRef = ref(db, 'messages');
    
    const unsubscribe = onValue(messagesRef, (snapshot) => {
      if (!snapshot.exists()) {
        callback([]);
        return;
      }
      
      const messages = snapshot.val();
      const conversationMessages: FirebaseMessage[] = [];
      
      Object.values(messages).forEach((message: any) => {
        if ((message.senderId === userId1 && message.receiverId === userId2) ||
            (message.senderId === userId2 && message.receiverId === userId1)) {
          conversationMessages.push(message);
        }
      });
      
      callback(conversationMessages.sort((a, b) => a.sentAt - b.sentAt));
    });
    
    return () => off(messagesRef, 'value', unsubscribe);
  }

  onConnectionsUpdate(userId: number, callback: (connections: FirebaseConnection[]) => void): () => void {
    const connectionsRef = ref(db, 'connections');
    
    const unsubscribe = onValue(connectionsRef, (snapshot) => {
      if (!snapshot.exists()) {
        callback([]);
        return;
      }
      
      const connections = snapshot.val();
      const userConnections: FirebaseConnection[] = [];
      
      Object.values(connections).forEach((connection: any) => {
        if (connection.requesterId === userId || connection.receiverId === userId) {
          userConnections.push(connection);
        }
      });
      
      callback(userConnections.sort((a, b) => b.requestedAt - a.requestedAt));
    });
    
    return () => off(connectionsRef, 'value', unsubscribe);
  }
}

export const firebaseStudentService = new FirebaseStudentService();