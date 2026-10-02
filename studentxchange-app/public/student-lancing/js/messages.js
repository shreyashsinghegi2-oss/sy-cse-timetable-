// Messages Module for StudentLancing - Real-time Chat

let currentConversation = null;
let messagesUnsubscribe = null;

// Get user conversations
async function getConversations() {
  const { db } = window.FirebaseApp.init();
  const user = window.Auth.getCurrentUser();
  
  if (!user) return [];
  
  try {
    const snapshot = await db.collection(window.FirebaseApp.COLLECTIONS.MESSAGES)
      .where('participants', 'array-contains', user.uid)
      .orderBy('lastMessageAt', 'desc')
      .get();
    
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error fetching conversations:', error);
    return [];
  }
}

// Get or create conversation between two users
async function getOrCreateConversation(otherUserId, projectId = null) {
  const { db } = window.FirebaseApp.init();
  const user = window.Auth.getCurrentUser();
  
  if (!user) return null;
  
  const participants = [user.uid, otherUserId].sort();
  
  try {
    // Check if conversation exists
    const snapshot = await db.collection(window.FirebaseApp.COLLECTIONS.MESSAGES)
      .where('participants', '==', participants)
      .limit(1)
      .get();
    
    if (!snapshot.empty) {
      return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
    }
    
    // Get other user's info
    const otherUserDoc = await db.collection(window.FirebaseApp.COLLECTIONS.USERS).doc(otherUserId).get();
    const otherUser = otherUserDoc.data();
    
    // Create new conversation
    const docRef = await db.collection(window.FirebaseApp.COLLECTIONS.MESSAGES).add({
      participants,
      participantDetails: {
        [user.uid]: {
          name: user.displayName || user.email,
          photo: user.photoURL || ''
        },
        [otherUserId]: {
          name: otherUser?.displayName || otherUser?.email || 'Unknown',
          photo: otherUser?.photoURL || ''
        }
      },
      projectId: projectId || null,
      messages: [],
      lastMessage: '',
      lastMessageAt: firebase.firestore.FieldValue.serverTimestamp(),
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    const newConv = await docRef.get();
    return { id: newConv.id, ...newConv.data() };
  } catch (error) {
    console.error('Error getting/creating conversation:', error);
    return null;
  }
}

// Send message
async function sendMessage(conversationId, messageText) {
  const { db } = window.FirebaseApp.init();
  const user = window.Auth.getCurrentUser();
  
  if (!user || !messageText.trim()) return false;
  
  try {
    const message = {
      senderId: user.uid,
      senderName: user.displayName || user.email,
      text: messageText.trim(),
      timestamp: firebase.firestore.Timestamp.now(),
      read: false
    };
    
    await db.collection(window.FirebaseApp.COLLECTIONS.MESSAGES).doc(conversationId).update({
      messages: firebase.firestore.FieldValue.arrayUnion(message),
      lastMessage: messageText.trim(),
      lastMessageAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    return true;
  } catch (error) {
    console.error('Error sending message:', error);
    showToast('Error sending message', 'error');
    return false;
  }
}

// Subscribe to conversation messages (real-time)
function subscribeToMessages(conversationId, callback) {
  const { db } = window.FirebaseApp.init();
  
  // Unsubscribe from previous conversation
  if (messagesUnsubscribe) {
    messagesUnsubscribe();
  }
  
  messagesUnsubscribe = db.collection(window.FirebaseApp.COLLECTIONS.MESSAGES)
    .doc(conversationId)
    .onSnapshot((doc) => {
      if (doc.exists) {
        const data = doc.data();
        callback(data.messages || []);
      }
    }, (error) => {
      console.error('Error subscribing to messages:', error);
    });
    
  return messagesUnsubscribe;
}

// Mark messages as read
async function markAsRead(conversationId) {
  const { db } = window.FirebaseApp.init();
  const user = window.Auth.getCurrentUser();
  
  if (!user) return;
  
  try {
    const doc = await db.collection(window.FirebaseApp.COLLECTIONS.MESSAGES).doc(conversationId).get();
    
    if (doc.exists) {
      const data = doc.data();
      const messages = data.messages || [];
      
      // Mark all messages from other users as read
      const updatedMessages = messages.map(msg => {
        if (msg.senderId !== user.uid && !msg.read) {
          return { ...msg, read: true };
        }
        return msg;
      });
      
      await db.collection(window.FirebaseApp.COLLECTIONS.MESSAGES).doc(conversationId).update({
        messages: updatedMessages
      });
    }
  } catch (error) {
    console.error('Error marking messages as read:', error);
  }
}

// Get unread count
async function getUnreadCount() {
  const { db } = window.FirebaseApp.init();
  const user = window.Auth.getCurrentUser();
  
  if (!user) return 0;
  
  try {
    const snapshot = await db.collection(window.FirebaseApp.COLLECTIONS.MESSAGES)
      .where('participants', 'array-contains', user.uid)
      .get();
    
    let unreadCount = 0;
    
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      const messages = data.messages || [];
      
      messages.forEach(msg => {
        if (msg.senderId !== user.uid && !msg.read) {
          unreadCount++;
        }
      });
    });
    
    return unreadCount;
  } catch (error) {
    console.error('Error getting unread count:', error);
    return 0;
  }
}

// Render conversation item
function renderConversationItem(conversation, currentUserId) {
  const otherParticipantId = conversation.participants.find(p => p !== currentUserId);
  const otherParticipant = conversation.participantDetails?.[otherParticipantId] || {};
  
  const initials = (otherParticipant.name || 'U')[0].toUpperCase();
  const photoHtml = otherParticipant.photo 
    ? `<img src="${otherParticipant.photo}" alt="${otherParticipant.name}">`
    : initials;
  
  return `
    <div class="conversation-item" data-conversation-id="${conversation.id}">
      <div class="conversation-avatar">${photoHtml}</div>
      <div class="conversation-info">
        <div class="conversation-name">${window.Utils.escapeHtml(otherParticipant.name || 'Unknown')}</div>
        <div class="conversation-preview">${window.Utils.escapeHtml(window.Utils.truncateText(conversation.lastMessage || 'No messages yet', 40))}</div>
      </div>
      <div class="conversation-time">${window.Utils.formatDate(conversation.lastMessageAt)}</div>
    </div>
  `;
}

// Render message bubble
function renderMessage(message, currentUserId) {
  const isSent = message.senderId === currentUserId;
  const timeStr = message.timestamp?.toDate 
    ? message.timestamp.toDate().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    : '';
  
  return `
    <div class="message ${isSent ? 'sent' : 'received'}">
      <div class="message-text">${window.Utils.escapeHtml(message.text)}</div>
      <div class="message-time">${timeStr}</div>
    </div>
  `;
}

// Cleanup on page leave
function cleanup() {
  if (messagesUnsubscribe) {
    messagesUnsubscribe();
    messagesUnsubscribe = null;
  }
}

// Export functions
window.Messages = {
  getConversations,
  getOrCreateConversation,
  sendMessage,
  subscribe: subscribeToMessages,
  markAsRead,
  getUnreadCount,
  renderConversationItem,
  renderMessage,
  cleanup
};

// Cleanup on page unload
window.addEventListener('beforeunload', cleanup);
