import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Send,
  Paperclip,
  ArrowLeft,
  MoreVertical,
  MessageCircle,
  Plus,
  Edit3,
  Loader2,
  Image as ImageIcon,
  Check,
  CheckCheck,
} from "lucide-react";
import { getFirestore, collection, query, where, orderBy, onSnapshot, or, and, limit, doc, getDoc, setDoc, serverTimestamp, deleteDoc } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { initializeApp } from "firebase/app";
import { collabFetch } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { useCollabAuth } from "@/hooks/use-collab-auth";

// Initialize Firebase
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig, 'messaging-app');
const db = getFirestore(app);
const storage = getStorage(app);

interface Message {
  id: string;
  senderId: number;
  senderUid: string;
  receiverId: number;
  receiverUid: string;
  text: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video' | 'file';
  fileName?: string;
  isRead?: boolean;
  createdAt: Date;
}

interface Conversation {
  uid: string;
  userId: number;
  name: string;
  username: string;
  avatarUrl?: string;
  lastMessage?: string;
  lastMessageTime?: Date;
  unreadCount: number;
  isOnline?: boolean;
  isTyping?: boolean;
}

interface GroupMessage {
  id: string;
  groupId: string;
  senderId: number;
  senderUid: string;
  text: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video' | 'file';
  fileName?: string;
  senderProfile?: {
    name: string;
    username: string;
    avatarUrl?: string;
  };
  createdAt: Date;
}

interface Group {
  id: string;
  postId: string;
  name: string;
  groupName?: string; // Backward compatibility
  description?: string;
  avatarUrl?: string;
  leaderId: string;
  members: string[];
  maxMembers: number;
  createdAt: Date;
  lastMessage?: string;
  lastMessageTime?: Date;
  unreadCount?: number;
}

interface CurrentUser {
  id: number;
  uid: string;
  name?: string;
  username?: string;
  avatarUrl?: string;
}

async function collabJson(input: string, init: RequestInit = {}) {
  const response = await collabFetch(input, init);
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || error.error || `HTTP ${response.status}`);
  }
  return response.json();
}

export default function CollabMessagesPage() {
  const [, setLocation] = useLocation();
  const [match, params] = useRoute("/collab-messages/:chatId?");
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [groupMessages, setGroupMessages] = useState<GroupMessage[]>([]);
  const [uploading, setUploading] = useState(false);
  const [hasAutoSelectedConversation, setHasAutoSelectedConversation] = useState(false);
  const [hasAutoSelectedGroup, setHasAutoSelectedGroup] = useState(false);
  const [markedAsReadConversation, setMarkedAsReadConversation] = useState<string | null>(null);
  const [conversationsWithMeta, setConversationsWithMeta] = useState<Map<string, { lastMessage: string; lastMessageTime: Date; unreadCount: number }>>(new Map());
  const [groupsWithMeta, setGroupsWithMeta] = useState<Map<string, { lastMessage: string; lastMessageTime: Date; unreadCount: number }>>(new Map());
  const [typingUsers, setTypingUsers] = useState<Map<string, boolean>>(new Map());
  const [chatData, setChatData] = useState<{ members: string[] } | null>(null);
  const lastMarkAsReadTimeRef = useRef<number>(0);
  const markAsReadTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const currentChatIdRef = useRef<string | null | undefined>(null);
  const { toast } = useToast();
  const { isAuthenticated } = useCollabAuth();
  
  const chatId = params?.chatId;
  const targetUid = new URLSearchParams(window.location.search).get('uid');
  const targetGroupId = new URLSearchParams(window.location.search).get('groupId');

  // Get current user
  const { data: currentUser } = useQuery<CurrentUser>({
    queryKey: ['/api/collab/student-profile'],
    queryFn: () => collabJson('/api/collab/student-profile'),
    enabled: isAuthenticated,
  });

  // Get user's connections (potential conversations)
  const { data: connections = [] } = useQuery<any[]>({
    queryKey: ['/api/collab/connections'],
    queryFn: () => collabJson('/api/collab/connections'),
    enabled: isAuthenticated,
  });

  // Get user's groups
  const { data: groups = [] } = useQuery<Group[]>({
    queryKey: ['/api/collab/social/my-groups'],
    queryFn: () => collabJson('/api/collab/social/my-groups'),
    enabled: !!currentUser,
  });

  // Set current user online status
  useEffect(() => {
    if (!currentUser?.uid) return;

    const presenceRef = doc(db, 'presence', currentUser.uid);
    
    // Set online when component mounts
    setDoc(presenceRef, {
      online: true,
      lastSeen: serverTimestamp(),
    }).catch(() => {
      // Ignore errors for presence
    });

    // Update online status every 30 seconds
    const intervalId = setInterval(() => {
      setDoc(presenceRef, {
        online: true,
        lastSeen: serverTimestamp(),
      }).catch(() => {
        // Ignore errors
      });
    }, 30000);

    // Set offline when component unmounts or navigating away
    return () => {
      clearInterval(intervalId);
      setDoc(presenceRef, {
        online: false,
        lastSeen: serverTimestamp(),
      }).catch(() => {
        // Ignore errors - best effort
      });
    };
  }, [currentUser?.uid]);

  // Track online status of connections
  const [onlineStatus, setOnlineStatus] = useState<Map<string, boolean>>(new Map());

  useEffect(() => {
    setChatData(null);
    setHasAutoSelectedConversation(false);
    setSelectedConversation(null);
    currentChatIdRef.current = chatId;
    
    if (!chatId || !currentUser?.uid) {
      return;
    }

    const loadChatData = async () => {
      try {
        const chatRef = doc(db, 'chats', chatId);
        const chatDoc = await getDoc(chatRef);
        
        if (currentChatIdRef.current !== chatId) {
          return;
        }
        
        if (chatDoc.exists()) {
          const data = chatDoc.data();
          setChatData(data as { members: string[] });
        } else {
          // Chat doesn't exist - create it
          // Extract UIDs from chatId (format: uid1_uid2)
          const members = chatId.split('_');
          
          if (members.length === 2 && members.includes(currentUser.uid)) {
            // Create new chat document
            await setDoc(chatRef, {
              id: chatId,
              members: members,
              createdAt: serverTimestamp(),
              lastMessage: null,
              lastMessageTime: null,
            });
            
            // Set chat data
            setChatData({ members });
          } else {
            console.error('Invalid chat ID format or user not a member');
          }
        }
      } catch (error) {
        console.error('Failed to load/create chat data:', error);
      }
    };

    loadChatData();
  }, [chatId, currentUser?.uid]);

  const conversations: Conversation[] = currentUser?.uid ? connections.map((conn: any) => {
    const isReceiver = conn.receiverUid === currentUser.uid;
    const otherUser = isReceiver 
      ? { uid: conn.senderUid, userId: conn.senderId, name: conn.senderProfile?.name, username: conn.senderProfile?.username, avatarUrl: conn.senderProfile?.avatarUrl }
      : { uid: conn.receiverUid, userId: conn.receiverId, name: conn.receiverProfile?.name, username: conn.receiverProfile?.username, avatarUrl: conn.receiverProfile?.avatarUrl };
    
    return {
      uid: otherUser.uid,
      userId: otherUser.userId,
      name: otherUser.name || otherUser.username || 'Unknown',
      username: otherUser.username || 'user',
      avatarUrl: otherUser.avatarUrl,
      unreadCount: 0,
      isOnline: onlineStatus.get(otherUser.uid) || false,
    };
  }) : [];

  useEffect(() => {
    if (targetUid && !chatId) {
      setHasAutoSelectedConversation(false);
    }
  }, [targetUid, chatId]);

  useEffect(() => {
    if (targetGroupId) {
      setHasAutoSelectedGroup(false);
    }
  }, [targetGroupId]);

  useEffect(() => {
    if (chatId && chatData && currentUser?.uid && conversations.length > 0 && !hasAutoSelectedConversation) {
      const otherMemberUid = chatData.members.find(uid => uid !== currentUser.uid);
      if (otherMemberUid) {
        const targetConversation = conversations.find(conv => conv.uid === otherMemberUid);
        if (targetConversation) {
          setSelectedConversation(targetConversation);
          setSelectedGroup(null);
          setHasAutoSelectedConversation(true);
        }
      }
    } else if (targetUid && conversations.length > 0 && !hasAutoSelectedConversation) {
      const targetConversation = conversations.find(conv => conv.uid === targetUid);
      if (targetConversation) {
        setSelectedConversation(targetConversation);
        setSelectedGroup(null);
        setHasAutoSelectedConversation(true);
      }
    }
  }, [chatId, chatData, targetUid, conversations, hasAutoSelectedConversation, currentUser?.uid]);

  // Auto-select group when coming from notification
  useEffect(() => {
    if (targetGroupId && groups.length > 0 && !hasAutoSelectedGroup) {
      const targetGroup = groups.find((group: Group) => group.id === targetGroupId);
      if (targetGroup) {
        setSelectedGroup(targetGroup);
        setSelectedConversation(null); // Clear conversation selection
        setHasAutoSelectedGroup(true);
      }
    }
  }, [targetGroupId, groups, hasAutoSelectedGroup]);

  // Real-time messages listener for 1-to-1 chat
  useEffect(() => {
    if (!currentUser?.uid || !selectedConversation) {
      setMessages([]);
      setMarkedAsReadConversation(null);
      // Don't reset refs here - let cleanup handle it to prevent race conditions
      return;
    }

    const conversationKey = selectedConversation.uid;

    const messagesRef = collection(db, 'messages');
    const q = query(
      messagesRef,
      or(
        and(
          where('senderUid', '==', currentUser.uid),
          where('receiverUid', '==', selectedConversation.uid)
        ),
        and(
          where('senderUid', '==', selectedConversation.uid),
          where('receiverUid', '==', currentUser.uid)
        )
      ),
      orderBy('createdAt', 'asc'),
      limit(100) // Limit to last 100 messages for performance
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const msgs = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt),
        } as Message;
      });
      
      // Check if there are unread messages from the partner
      const hasUnreadFromPartner = msgs.some(msg => 
        msg.senderUid === selectedConversation.uid && 
        msg.receiverUid === currentUser.uid && 
        msg.isRead === false
      );
      
      // Mark as read with debounce (2 second cooldown to prevent excessive calls)
      if (hasUnreadFromPartner) {
        const now = Date.now();
        const timeSinceLastMarkRead = now - lastMarkAsReadTimeRef.current;
        
        const markRead = async () => {
          try {
            await collabJson('/api/collab/social/messages/mark-read', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
              senderUid: selectedConversation.uid
              }),
            });
            lastMarkAsReadTimeRef.current = Date.now();
            setMarkedAsReadConversation(conversationKey);
          } catch (error) {
            console.error('Failed to mark messages as read:', error);
            toast({
              title: "Warning",
              description: "Could not mark messages as read. Please try refreshing.",
              variant: "destructive"
            });
          }
        };
        
        // If outside cooldown, call immediately
        if (timeSinceLastMarkRead > 2000) {
          markRead();
        } 
        // If inside cooldown and no timeout scheduled yet, schedule for when cooldown expires
        else if (!markAsReadTimeoutRef.current) {
          const delay = 2000 - timeSinceLastMarkRead;
          markAsReadTimeoutRef.current = setTimeout(() => {
            markAsReadTimeoutRef.current = null;
            markRead();
          }, delay);
        }
      }
      
      setMessages(msgs);
    });

    return () => {
      unsubscribe();
      // If there's a pending timeout, it means there are unread messages waiting to be marked
      // Execute the mark-as-read immediately on cleanup to prevent losing unread state
      if (markAsReadTimeoutRef.current) {
        clearTimeout(markAsReadTimeoutRef.current);
        
        // Mark messages as read immediately before cleanup
        collabJson('/api/collab/social/messages/mark-read', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
          senderUid: selectedConversation.uid
          }),
        }).catch(error => {
          console.error('Failed to mark messages as read on cleanup:', error);
        });
      }
      
      // Reset refs after handling any pending operations
      markAsReadTimeoutRef.current = null;
      lastMarkAsReadTimeRef.current = 0;
    };
  }, [currentUser?.uid, selectedConversation?.uid, toast]);

  // Real-time group messages listener
  useEffect(() => {
    if (!selectedGroup) {
      setGroupMessages([]);
      return;
    }

    const groupMessagesRef = collection(db, 'groupMessages');
    const q = query(
      groupMessagesRef,
      where('groupId', '==', selectedGroup.id),
      orderBy('createdAt', 'asc'),
      limit(100) // Limit to last 100 messages for performance
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt),
        } as GroupMessage;
      });
      setGroupMessages(msgs);
    });

    return () => unsubscribe();
  }, [selectedGroup?.id]);

  // Real-time listener for last messages in all conversations
  useEffect(() => {
    if (!currentUser?.uid || connections.length === 0) {
      return;
    }

    const unsubscribers: (() => void)[] = [];

    // Create a list of unique user UIDs from connections
    const userUids = new Set<string>();
    connections.forEach((conn: any) => {
      const isReceiver = conn.receiverUid === currentUser.uid;
      const otherUid = isReceiver ? conn.senderUid : conn.receiverUid;
      userUids.add(otherUid);
    });

    userUids.forEach((conversationUid) => {
      const messagesRef = collection(db, 'messages');
      
      // Query for last message
      const lastMsgQuery = query(
        messagesRef,
        or(
          and(
            where('senderUid', '==', currentUser.uid),
            where('receiverUid', '==', conversationUid)
          ),
          and(
            where('senderUid', '==', conversationUid),
            where('receiverUid', '==', currentUser.uid)
          )
        ),
        orderBy('createdAt', 'desc'),
        limit(1)
      );

      // Query for unread messages FROM the conversation partner
      const unreadQuery = query(
        messagesRef,
        and(
          where('senderUid', '==', conversationUid),
          where('receiverUid', '==', currentUser.uid),
          where('isRead', '==', false)
        )
      );

      // Subscribe to last message
      const lastMsgUnsubscribe = onSnapshot(lastMsgQuery, (snapshot) => {
        const msgs = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            ...data,
            createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt),
          } as Message;
        });

        const lastMsg = msgs[0];

        setConversationsWithMeta(prev => {
          const newMap = new Map(prev);
          const existing = newMap.get(conversationUid);
          newMap.set(conversationUid, {
            lastMessage: lastMsg ? (lastMsg.mediaUrl ? (lastMsg.mediaType === 'image' ? '📷 Photo' : lastMsg.mediaType === 'video' ? '🎥 Video' : '📎 File') : lastMsg.text) : '',
            lastMessageTime: lastMsg ? lastMsg.createdAt : new Date(0),
            unreadCount: existing?.unreadCount || 0,
          });
          return newMap;
        });
      });

      // Subscribe to unread count
      const unreadUnsubscribe = onSnapshot(unreadQuery, (snapshot) => {
        const unreadCount = snapshot.docs.length;

        setConversationsWithMeta(prev => {
          const newMap = new Map(prev);
          const existing = newMap.get(conversationUid);
          newMap.set(conversationUid, {
            lastMessage: existing?.lastMessage || '',
            lastMessageTime: existing?.lastMessageTime || new Date(0),
            unreadCount,
          });
          return newMap;
        });
      });

      unsubscribers.push(lastMsgUnsubscribe, unreadUnsubscribe);
    });

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [currentUser?.uid, connections.length]);

  // Real-time listener for last messages in all groups
  useEffect(() => {
    if (!currentUser?.uid || groups.length === 0) {
      return;
    }

    const unsubscribers: (() => void)[] = [];

    groups.forEach((group) => {
      const groupMessagesRef = collection(db, 'groupMessages');
      
      // Query for last message
      const lastMsgQuery = query(
        groupMessagesRef,
        where('groupId', '==', group.id),
        orderBy('createdAt', 'desc'),
        limit(1)
      );

      const lastMsgUnsubscribe = onSnapshot(lastMsgQuery, (snapshot) => {
        const msgs = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            ...data,
            createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt),
          } as GroupMessage;
        });

        const lastMsg = msgs[0];

        setGroupsWithMeta(prev => {
          const newMap = new Map(prev);
          const existing = newMap.get(group.id);
          newMap.set(group.id, {
            lastMessage: lastMsg ? (lastMsg.mediaUrl ? (lastMsg.mediaType === 'image' ? '📷 Photo' : lastMsg.mediaType === 'video' ? '🎥 Video' : '📎 File') : lastMsg.text) : '',
            lastMessageTime: lastMsg ? lastMsg.createdAt : new Date(0),
            unreadCount: existing?.unreadCount || 0, // Keep existing unread count
          });
          return newMap;
        });
      });

      unsubscribers.push(lastMsgUnsubscribe);
    });

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [currentUser?.uid, groups.length]);

  // Real-time listener for typing indicators and online status
  useEffect(() => {
    if (!currentUser?.uid || connections.length === 0) {
      return;
    }

    const unsubscribers: (() => void)[] = [];

    // Create a list of unique user UIDs from connections
    const userUids = new Set<string>();
    connections.forEach((conn: any) => {
      const isReceiver = conn.receiverUid === currentUser.uid;
      const otherUid = isReceiver ? conn.senderUid : conn.receiverUid;
      userUids.add(otherUid);
    });

    userUids.forEach((uid) => {
      // Typing indicator listener
      const typingRef = doc(db, 'typing', `${uid}_${currentUser.uid}`);
      const typingUnsubscribe = onSnapshot(typingRef, (snapshot) => {
        setTypingUsers(prev => {
          const newMap = new Map(prev);
          if (snapshot.exists()) {
            newMap.set(uid, true);
          } else {
            newMap.delete(uid);
          }
          return newMap;
        });
      });
      unsubscribers.push(typingUnsubscribe);

      // Online status listener
      const presenceRef = doc(db, 'presence', uid);
      const presenceUnsubscribe = onSnapshot(presenceRef, (snapshot) => {
        setOnlineStatus(prev => {
          const newMap = new Map(prev);
          if (snapshot.exists()) {
            const data = snapshot.data();
            newMap.set(uid, data?.online || false);
          } else {
            newMap.set(uid, false);
          }
          return newMap;
        });
      });
      unsubscribers.push(presenceUnsubscribe);
    });

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [currentUser?.uid, connections.length]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, groupMessages]);

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (data: { text: string; mediaUrl?: string; mediaType?: string; fileName?: string }) => {
      if (selectedGroup) {
        return collabJson(`/api/collab/social/groups/${selectedGroup.id}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
      } else if (selectedConversation) {
        return collabJson('/api/collab/social/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            receiverId: selectedConversation.userId,
            receiverUid: selectedConversation.uid,
            text: data.text,
            mediaUrl: data.mediaUrl,
            mediaType: data.mediaType,
            fileName: data.fileName,
          }),
        });
      }
    },
    onSuccess: () => {
      setNewMessage("");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    },
  });

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;
    
    // Clear typing indicator when sending
    if (selectedConversation && currentUser?.uid) {
      try {
        await deleteDoc(doc(db, 'typing', `${currentUser.uid}_${selectedConversation.uid}`));
      } catch (error) {
        // Ignore errors for typing indicator cleanup
      }
    }
    
    sendMessageMutation.mutate({ text: newMessage.trim() });
  };

  // Handle typing indicator
  const handleTyping = async (text: string) => {
    setNewMessage(text);
    
    if (!selectedConversation || !currentUser?.uid) return;
    
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    if (text.trim()) {
      // Set typing indicator in Firestore
      try {
        await setDoc(doc(db, 'typing', `${currentUser.uid}_${selectedConversation.uid}`), {
          senderId: currentUser.uid,
          receiverId: selectedConversation.uid,
          timestamp: serverTimestamp(),
        });
      } catch (error) {
        // Ignore errors for typing indicator
      }
      
      // Auto-remove typing indicator after 3 seconds of inactivity
      typingTimeoutRef.current = setTimeout(async () => {
        try {
          await deleteDoc(doc(db, 'typing', `${currentUser.uid}_${selectedConversation.uid}`));
        } catch (error) {
          // Ignore errors
        }
      }, 3000);
    } else {
      // Remove typing indicator immediately when input is cleared
      try {
        await deleteDoc(doc(db, 'typing', `${currentUser.uid}_${selectedConversation.uid}`));
      } catch (error) {
        // Ignore errors
      }
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const storageRef = ref(storage, `chat-media/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);

      const mediaType = file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : 'file';
      
      sendMessageMutation.mutate({
        text: file.name,
        mediaUrl: downloadURL,
        mediaType,
        fileName: file.name,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to upload file",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffWeeks = Math.floor(diffDays / 7);

    if (diffMins < 1) return 'now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    if (diffWeeks < 4) return `${diffWeeks}w`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatMessageTime = (date: Date) => {
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const isToday = date.toDateString() === now.toDateString();
    const isYesterday = date.toDateString() === yesterday.toDateString();
    
    if (isToday) {
      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    } else if (isYesterday) {
      return 'Yesterday ' + date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' ' + 
             date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    }
  };

  const filteredConversations = conversations
    .filter(conv =>
      (conv.name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      (conv.username?.toLowerCase() || '').includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      const aTime = conversationsWithMeta.get(a.uid)?.lastMessageTime?.getTime() || 0;
      const bTime = conversationsWithMeta.get(b.uid)?.lastMessageTime?.getTime() || 0;
      return bTime - aTime; // Most recent first
    });

  const filteredGroups = groups
    .filter(group => {
      const groupName = group.name || group.groupName || '';
      return groupName.toLowerCase().includes(searchQuery.toLowerCase());
    })
    .sort((a, b) => {
      const aTime = groupsWithMeta.get(a.id)?.lastMessageTime?.getTime() || 0;
      const bTime = groupsWithMeta.get(b.id)?.lastMessageTime?.getTime() || 0;
      return bTime - aTime; // Most recent first
    });

  const currentMessages = selectedGroup ? groupMessages : messages;
  const isGroupChat = !!selectedGroup;

  return (
    <div className="h-screen flex flex-col bg-white overflow-hidden">
      {/* Top Header - Mobile optimized with larger touch targets */}
      <div className="border-b bg-white px-3 md:px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2 md:gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation('/student-collab')}
            className="hover:bg-gray-100 h-10 w-10 md:h-8 md:w-auto px-2"
            data-testid="button-back-to-collab"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg md:text-xl font-semibold text-gray-900">Messages</h1>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="hover:bg-gray-100 h-10 w-10 md:h-8 md:w-auto px-2"
          data-testid="button-new-message"
        >
          <Edit3 className="h-5 w-5" />
        </Button>
      </div>

      {/* Main Content - Instagram DM inspired split layout */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Left Sidebar - Conversations List */}
        <div className={`w-full md:w-96 border-r bg-white flex flex-col min-h-0 ${(selectedConversation || selectedGroup) ? 'hidden md:flex' : 'flex'}`}>
          {/* Search Bar */}
          <div className="p-3 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search messages"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 border-0 bg-gray-100 focus-visible:ring-0 focus-visible:ring-offset-0 rounded-lg"
                data-testid="input-search-messages"
              />
            </div>
          </div>

          {/* Conversations */}
          <ScrollArea className="flex-1">
            <div>
              {/* Groups Section */}
              {filteredGroups.length > 0 && (
                <div className="mb-2">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase px-4 py-2">Groups</h3>
                  {filteredGroups.map((group) => (
                    <div
                      key={group.id}
                      className={`flex items-center gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors ${
                        selectedGroup?.id === group.id ? 'bg-gray-50' : ''
                      }`}
                      onClick={() => {
                        setSelectedGroup(group);
                        setSelectedConversation(null);
                      }}
                      data-testid={`group-${group.id}`}
                    >
                      <Avatar className="h-14 w-14">
                        <AvatarImage src={group.avatarUrl} />
                        <AvatarFallback className="bg-blue-600 text-white text-lg font-semibold">
                          {(group.name || group.groupName || 'G').charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-medium text-sm text-gray-900 truncate">
                            {group.name || group.groupName || 'Group'}
                          </p>
                          {groupsWithMeta.get(group.id)?.lastMessageTime && groupsWithMeta.get(group.id)!.lastMessageTime.getTime() > 0 && (
                            <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                              {formatTime(groupsWithMeta.get(group.id)!.lastMessageTime)}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 truncate">
                          {groupsWithMeta.get(group.id)?.lastMessage || `${group.members.length} members`}
                        </p>
                      </div>
                      {(groupsWithMeta.get(group.id)?.unreadCount || 0) > 0 && (
                        <Badge className="bg-blue-600 text-white h-5 px-2 flex-shrink-0">
                          {groupsWithMeta.get(group.id)!.unreadCount}
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Direct Messages Section */}
              {filteredConversations.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-gray-500 uppercase px-4 py-2">Messages</h3>
                  {filteredConversations.map((conversation) => (
                    <div
                      key={conversation.uid}
                      className={`flex items-center gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors ${
                        selectedConversation?.uid === conversation.uid ? 'bg-gray-50' : ''
                      }`}
                      onClick={() => {
                        setSelectedConversation(conversation);
                        setSelectedGroup(null);
                      }}
                      data-testid={`conversation-${conversation.uid}`}
                    >
                      <div className="relative flex-shrink-0">
                        <Avatar className="h-14 w-14">
                          <AvatarImage src={conversation.avatarUrl} />
                          <AvatarFallback className="bg-blue-600 text-white text-lg font-semibold">
                            {(conversation.name || conversation.username || 'U').charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        {conversation.isOnline && (
                          <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-medium text-sm text-gray-900 truncate">
                            {conversation.name}
                          </p>
                          {conversationsWithMeta.get(conversation.uid)?.lastMessageTime && conversationsWithMeta.get(conversation.uid)!.lastMessageTime.getTime() > 0 && (
                            <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                              {formatTime(conversationsWithMeta.get(conversation.uid)!.lastMessageTime)}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 truncate">
                          {typingUsers.get(conversation.uid) ? (
                            <span className="text-blue-600 italic">typing...</span>
                          ) : (
                            conversationsWithMeta.get(conversation.uid)?.lastMessage || `@${conversation.username}`
                          )}
                        </p>
                      </div>
                      {(conversationsWithMeta.get(conversation.uid)?.unreadCount || 0) > 0 && (
                        <Badge className="bg-blue-600 text-white h-5 px-2 flex-shrink-0">
                          {conversationsWithMeta.get(conversation.uid)!.unreadCount}
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {filteredConversations.length === 0 && filteredGroups.length === 0 && (
                <div className="text-center py-12 px-4">
                  <MessageCircle className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-sm text-gray-500">No conversations yet</p>
                  <p className="text-xs text-gray-400 mt-1">Connect with students to start chatting</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Right Side - Chat View */}
        <div className={`flex-1 flex flex-col bg-white min-h-0 ${!(selectedConversation || selectedGroup) ? 'hidden md:flex' : 'flex'}`}>
          {!(selectedConversation || selectedGroup) ? (
            // Empty State
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center px-4">
                <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-blue-100 flex items-center justify-center">
                  <MessageCircle className="h-12 w-12 text-blue-600" />
                </div>
                <h2 className="text-2xl font-semibold text-gray-900 mb-2">Your Messages</h2>
                <p className="text-gray-600 mb-6 max-w-sm mx-auto">
                  Connect with fellow students, collaborate on projects, and build your network
                </p>
              </div>
            </div>
          ) : (
            // Active Chat
            <>
              {/* Chat Header - Mobile optimized */}
              <div className="px-3 md:px-4 py-3 border-b flex items-center justify-between bg-white flex-shrink-0">
                <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedConversation(null);
                      setSelectedGroup(null);
                    }}
                    className="md:hidden hover:bg-gray-100 h-10 w-10 p-0 flex-shrink-0"
                    data-testid="button-back-to-list"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                  <div className="relative flex-shrink-0">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={selectedGroup?.avatarUrl || selectedConversation?.avatarUrl} />
                      <AvatarFallback className="bg-blue-600 text-white font-semibold">
                        {(selectedGroup?.name || selectedGroup?.groupName || selectedConversation?.name || 'U').charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    {!selectedGroup && selectedConversation?.isOnline && (
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                    )}
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-gray-900">
                      {selectedGroup?.name || selectedGroup?.groupName || selectedConversation?.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {selectedGroup 
                        ? `${selectedGroup.members.length} members` 
                        : typingUsers.get(selectedConversation?.uid || '') 
                          ? <span className="text-blue-600 italic">typing...</span>
                          : (selectedConversation?.isOnline ? 'Active now' : 'Offline')
                      }
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" className="hover:bg-gray-100">
                  <MoreVertical className="h-5 w-5 text-gray-600" />
                </Button>
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 px-4 py-6 bg-gray-50 min-h-0">
                <div className="space-y-2 max-w-4xl mx-auto">
                  {currentMessages.map((message, index) => {
                    const isCurrentUser = isGroupChat 
                      ? (message as GroupMessage).senderUid === currentUser?.uid
                      : (message as Message).senderUid === currentUser?.uid || false;
                    
                    const showTime = index === 0 || 
                      (currentMessages[index - 1].createdAt.getTime() - message.createdAt.getTime() > 5 * 60 * 1000);

                    return (
                      <div key={message.id}>
                        {showTime && (
                          <div className="text-center text-xs text-gray-500 my-4">
                            {formatMessageTime(message.createdAt)}
                          </div>
                        )}
                        <div className={`flex gap-2 ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
                          {!isCurrentUser && isGroupChat && (
                            <Avatar className="h-8 w-8 flex-shrink-0">
                              <AvatarImage src={(message as GroupMessage).senderProfile?.avatarUrl} />
                              <AvatarFallback className="text-xs bg-gray-300">
                                {((message as GroupMessage).senderProfile?.name || 'U').charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                          )}
                          <div className="max-w-[70%]">
                            {!isCurrentUser && isGroupChat && (
                              <p className="text-xs text-gray-600 mb-1 px-2">
                                {(message as GroupMessage).senderProfile?.name}
                              </p>
                            )}
                            <div
                              className={`px-4 py-2.5 rounded-3xl ${
                                isCurrentUser
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-white border border-gray-200 text-gray-900'
                              }`}
                            >
                              {message.mediaUrl && (
                                <div className="mb-2">
                                  {message.mediaType === 'image' ? (
                                    <img 
                                      src={message.mediaUrl} 
                                      alt="Shared media" 
                                      className="rounded-lg max-w-xs cursor-pointer hover:opacity-90 transition"
                                      style={{ aspectRatio: '4/3', objectFit: 'cover', display: 'block' }}
                                    />
                                  ) : message.mediaType === 'video' ? (
                                    <video 
                                      src={message.mediaUrl} 
                                      controls 
                                      className="rounded-lg max-w-xs"
                                      style={{ aspectRatio: '16/9', display: 'block' }}
                                    />
                                  ) : (
                                    <a 
                                      href={message.mediaUrl} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-2 text-sm hover:underline"
                                    >
                                      <Paperclip className="h-4 w-4" />
                                      {message.fileName || 'File'}
                                    </a>
                                  )}
                                </div>
                              )}
                              <div className="flex items-end gap-2">
                                <p className="text-sm leading-relaxed flex-1">{message.text}</p>
                                {isCurrentUser && !isGroupChat && (
                                  <span className="flex-shrink-0">
                                    {(message as Message).isRead ? (
                                      <CheckCheck className="h-4 w-4 text-blue-200" />
                                    ) : (
                                      <Check className="h-4 w-4 text-white opacity-70" />
                                    )}
                                  </span>
                                )}
                              </div>
                            </div>
                            {isCurrentUser && (
                              <p className="text-xs text-gray-500 mt-1 text-right px-2">
                                {message.createdAt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* Message Input - Mobile optimized with larger touch targets */}
              <div className="px-3 md:px-4 py-3 border-t bg-white flex-shrink-0">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  className="hidden"
                  accept="image/*,video/*,.pdf,.doc,.docx"
                />
                <div className="flex items-center gap-2 max-w-4xl mx-auto">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="hover:bg-gray-100 flex-shrink-0 h-10 w-10 md:h-8 md:w-8 p-0"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    data-testid="button-attach-file"
                  >
                    {uploading ? (
                      <Loader2 className="h-5 w-5 animate-spin text-gray-600" />
                    ) : (
                      <Paperclip className="h-5 w-5 text-gray-600" />
                    )}
                  </Button>
                  <div className="flex-1 relative">
                    <Input
                      placeholder="Message..."
                      value={newMessage}
                      onChange={(e) => handleTyping(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                      className="border-0 bg-gray-100 focus-visible:ring-0 focus-visible:ring-offset-0 rounded-full pl-4 pr-4 h-10 md:h-9 text-base md:text-sm"
                      data-testid="input-new-message"
                    />
                  </div>
                  {newMessage.trim() ? (
                    <Button
                      onClick={handleSendMessage}
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700 flex-shrink-0 h-10 w-10 md:h-8 md:w-auto p-0 md:px-3"
                      disabled={sendMessageMutation.isPending}
                      data-testid="button-send-message"
                    >
                      {sendMessageMutation.isPending ? (
                        <Loader2 className="h-4 w-4 md:h-4 md:w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4 md:h-4 md:w-4" />
                      )}
                    </Button>
                  ) : (
                    <Button variant="ghost" size="sm" className="hover:bg-gray-100 flex-shrink-0 h-10 w-10 md:h-8 md:w-8 p-0">
                      <Plus className="h-5 w-5 text-gray-600" />
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
