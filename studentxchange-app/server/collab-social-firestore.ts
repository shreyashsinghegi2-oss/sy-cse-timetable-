import { admin } from './firebase-admin';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import { CollabFirestoreService, FirebaseStudentProfile, FirebaseProfile } from './collab-firestore-service';
import { objectStorage } from './objectStorage';

// Collection names
const POSTS_COLLECTION = 'posts';
const LIKES_COLLECTION = 'likes';
const COMMENTS_COLLECTION = 'comments';
const SHARES_COLLECTION = 'shares';
const CONNECTIONS_COLLECTION = 'connections';
const MESSAGES_COLLECTION = 'messages';
const GROUPS_COLLECTION = 'groups';
const GROUP_MESSAGES_COLLECTION = 'groupMessages';
const JOIN_REQUESTS_COLLECTION = 'joinRequests';

// Types
export interface Post {
  id: string;
  userId: number;
  uid: string;
  type: 'direct' | 'group' | 'event' | 'arena';
  title?: string;
  description: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video';
  membersRequired?: number;
  currentMembers?: number;
  groupMembers?: string[];
  groupName?: string;
  groupDescription?: string;
  eventDate?: string;
  eventTime?: string;
  eventLink?: string;
  // Arena-specific fields
  arenaMonth?: string; // YYYY-MM format
  category?: 'creative' | 'idea' | 'tech';
  problemStatement?: string;
  solution?: string;
  toolsUsed?: string;
  challengesFaced?: string;
  learnings?: string;
  proofOfWork?: string[];
  status?: 'submitted' | 'verified';
  isWinner?: boolean;
  winnerMonth?: string;
  verifiedAt?: Date;
  verifiedBy?: string;
  profile?: {
    username?: string;
    name?: string;
    avatarUrl?: string;
    role?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface Like {
  id: string;
  postId: string;
  userId: number;
  uid: string;
  createdAt: Date;
}

export interface Comment {
  id: string;
  postId: string;
  userId: number;
  uid: string;
  text: string;
  parentCommentId?: string;
  reactions?: { [key: string]: number };
  profile?: {
    username?: string;
    name?: string;
    avatarUrl?: string;
    role?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface Share {
  id: string;
  postId: string;
  senderId: number;
  senderUid: string;
  receiverId: number;
  receiverUid: string;
  createdAt: Date;
}

export interface Connection {
  id: string;
  senderId: number;
  senderUid: string;
  receiverId: number;
  receiverUid: string;
  status: 'pending' | 'accepted';
  createdAt: Date;
  updatedAt: Date;
}

export interface Message {
  id: string;
  senderId: number;
  senderUid: string;
  receiverId: number;
  receiverUid: string;
  text: string;
  isRead?: boolean;
  createdAt: Date;
}

export interface Group {
  id: string;
  postId: string;
  name: string;
  description?: string;
  avatarUrl?: string;
  leaderId: string;
  leaderUid: string;
  coLeaders?: string[];
  members: string[];
  maxMembers: number;
  isArchived?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface JoinRequest {
  id: string;
  postId: string;
  groupId?: string;
  userId: number;
  uid: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: Date;
  updatedAt: Date;
}

export interface GroupMessage {
  id: string;
  groupId: string;
  senderId: number;
  senderUid: string;
  text: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video' | 'document';
  fileName?: string;
  createdAt: Date;
}

export class CollabSocialFirestore {
  private collabService = new CollabFirestoreService();

  private get db() {
    return admin.firestore();
  }

  // ========== POSTS ==========
  
  async createPost(data: Omit<Post, 'id' | 'createdAt' | 'updatedAt'>): Promise<Post> {
    const docRef = this.db.collection(POSTS_COLLECTION).doc();
    const now = new Date();
    
    // Normalize mediaUrl at write time for consistent storage
    const normalizedMediaUrl = data.mediaUrl ? objectStorage.normalizeObjectEntityPath(data.mediaUrl) : undefined;
    
    const post: any = {
      id: docRef.id,
      ...data,
      mediaUrl: normalizedMediaUrl,
      createdAt: now,
      updatedAt: now,
    };

    // Remove undefined and null values (Firestore doesn't allow them)
    // Use a more robust cleaner that recursively handles objects like 'profile'
    const cleanObject = (obj: any): any => {
      if (Array.isArray(obj)) {
        return obj.map(v => (v && typeof v === 'object' ? cleanObject(v) : v)).filter(v => v !== undefined && v !== null);
      }
      return Object.fromEntries(
        Object.entries(obj)
          .filter(([_, value]) => value !== undefined && value !== null)
          .map(([key, value]) => [key, value && typeof value === 'object' && !(value instanceof Date) ? cleanObject(value) : value])
      );
    };

    const cleanedPost = cleanObject(post);
    await docRef.set(cleanedPost);
    return post;
  }

  /**
   * Create an arena post atomically with duplicate prevention
   * Uses a deterministic document ID based on uid and category to prevent race conditions
   */
  async createArenaPost(uid: string, category: string, data: Omit<Post, 'id' | 'createdAt' | 'updatedAt'>): Promise<{ success: boolean; post?: Post; error?: string; alreadySubmitted?: boolean }> {
    // Deterministic document ID prevents duplicate submissions atomically
    const arenaDocId = `arena_${uid}_${category}`;
    const docRef = this.db.collection(POSTS_COLLECTION).doc(arenaDocId);
    
    const now = new Date();
    
    // Normalize mediaUrl at write time for consistent storage
    const normalizedMediaUrl = data.mediaUrl ? objectStorage.normalizeObjectEntityPath(data.mediaUrl) : undefined;
    
    const cleanObject = (obj: any): any => {
      if (Array.isArray(obj)) {
        return obj.map(v => (v && typeof v === 'object' ? cleanObject(v) : v)).filter(v => v !== undefined && v !== null);
      }
      return Object.fromEntries(
        Object.entries(obj)
          .filter(([_, value]) => value !== undefined && value !== null)
          .map(([key, value]) => [key, value && typeof value === 'object' && !(value instanceof Date) ? cleanObject(value) : value])
      );
    };

    try {
      // Use Firestore transaction for atomic check-and-create
      const result = await this.db.runTransaction(async (transaction) => {
        const doc = await transaction.get(docRef);
        
        if (doc.exists) {
          // Document already exists - user has already submitted for this category
          return { alreadySubmitted: true };
        }
        
        const post: any = {
          id: arenaDocId,
          ...data,
          mediaUrl: normalizedMediaUrl,
          createdAt: now,
          updatedAt: now,
        };
        
        const cleanedPost = cleanObject(post);
        transaction.set(docRef, cleanedPost);
        
        return { success: true, post: cleanedPost };
      });
      
      if (result.alreadySubmitted) {
        return { 
          success: false, 
          error: `You have already submitted a post for the ${category} category. Only one submission per category is allowed.`,
          alreadySubmitted: true 
        };
      }
      
      return { success: true, post: result.post };
    } catch (error: any) {
      console.error('Error creating arena post:', error);
      return { success: false, error: error.message || 'Failed to create arena post' };
    }
  }

  async getPost(postId: string): Promise<Post | null> {
    const doc = await this.db.collection(POSTS_COLLECTION).doc(postId).get();
    return doc.exists ? (doc.data() as Post) : null;
  }

  async getPosts(limit: number = 50): Promise<Post[]> {
    const snapshot = await this.db
      .collection(POSTS_COLLECTION)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();
    
    return snapshot.docs.map(doc => doc.data() as Post);
  }

  async getPostsByUser(uid: string): Promise<Post[]> {
    const snapshot = await this.db
      .collection(POSTS_COLLECTION)
      .where('uid', '==', uid)
      .where('type', '==', 'group')
      .orderBy('createdAt', 'desc')
      .get();
    
    return snapshot.docs.map(doc => doc.data() as Post);
  }

  async updatePost(postId: string, data: Partial<Post>): Promise<void> {
    await this.db.collection(POSTS_COLLECTION).doc(postId).update({
      ...data,
      updatedAt: new Date(),
    });
  }

  async deletePost(postId: string): Promise<void> {
    await this.db.collection(POSTS_COLLECTION).doc(postId).delete();
  }

  // ========== JOIN REQUESTS ==========

  async createJoinRequest(postId: string, userId: number, uid: string): Promise<{ success: boolean; message?: string; requestId?: string; post?: Post }> {
    const post = await this.getPost(postId);
    
    if (!post) {
      return { success: false, message: 'Post not found' };
    }

    if (post.type !== 'group') {
      return { success: false, message: 'Not a group post' };
    }

    // Check if user is trying to join their own post
    if (post.uid === uid) {
      return { success: false, message: "You can't join your own group post" };
    }

    // Check if group is full
    const currentMembers = post.groupMembers || [];
    if (currentMembers.length >= (post.membersRequired || 0)) {
      return { success: false, message: 'This group is full.' };
    }

    // Check if user already has a pending request
    const existingRequest = await this.getUserJoinRequest(postId, uid);
    if (existingRequest && existingRequest.status === 'pending') {
      return { success: false, message: 'Join request already sent' };
    }

    // Check if user is already a member
    if (currentMembers.includes(uid)) {
      return { success: false, message: 'Already a member' };
    }

    // Create join request
    const docRef = this.db.collection(JOIN_REQUESTS_COLLECTION).doc();
    const joinRequest: JoinRequest = {
      id: docRef.id,
      postId,
      userId,
      uid,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await docRef.set(joinRequest);
    return { success: true, message: 'Join request sent', requestId: docRef.id, post };
  }

  async getJoinRequestsForPost(postId: string): Promise<JoinRequest[]> {
    const snapshot = await this.db
      .collection(JOIN_REQUESTS_COLLECTION)
      .where('postId', '==', postId)
      .where('status', '==', 'pending')
      .get();
    
    // Sort in memory to avoid composite index requirement
    const requests = snapshot.docs.map(doc => doc.data() as JoinRequest);
    return requests.sort((a, b) => {
      const timeA = a.createdAt instanceof Date ? a.createdAt.getTime() : new Date(a.createdAt as any).getTime();
      const timeB = b.createdAt instanceof Date ? b.createdAt.getTime() : new Date(b.createdAt as any).getTime();
      return timeB - timeA; // desc order
    });
  }

  async getUserJoinRequest(postId: string, uid: string): Promise<JoinRequest | null> {
    const snapshot = await this.db
      .collection(JOIN_REQUESTS_COLLECTION)
      .where('postId', '==', postId)
      .where('uid', '==', uid)
      .limit(1)
      .get();
    
    return snapshot.empty ? null : (snapshot.docs[0].data() as JoinRequest);
  }

  async getUserJoinRequests(uid: string): Promise<JoinRequest[]> {
    const snapshot = await this.db
      .collection(JOIN_REQUESTS_COLLECTION)
      .where('uid', '==', uid)
      .get();
    
    return snapshot.docs.map(doc => doc.data() as JoinRequest);
  }

  async acceptJoinRequest(requestId: string, postId: string): Promise<{ success: boolean; message?: string; groupId?: string; request?: JoinRequest; post?: Post }> {
    return this.db.runTransaction(async (transaction) => {
      const requestRef = this.db.collection(JOIN_REQUESTS_COLLECTION).doc(requestId);
      const requestDoc = await transaction.get(requestRef);
      
      if (!requestDoc.exists) {
        return { success: false, message: 'Request not found' };
      }

      const request = requestDoc.data() as JoinRequest;
      const postRef = this.db.collection(POSTS_COLLECTION).doc(postId);
      const postDoc = await transaction.get(postRef);

      if (!postDoc.exists) {
        return { success: false, message: 'Post not found' };
      }

      const post = postDoc.data() as Post;
      const currentMembers = post.groupMembers || [];

      // Check if group is full
      if (currentMembers.length >= (post.membersRequired || 0)) {
        return { success: false, message: 'This group is full.' };
      }

      // Add member to group
      currentMembers.push(request.uid);

      transaction.update(postRef, {
        groupMembers: currentMembers,
        currentMembers: currentMembers.length,
        updatedAt: new Date(),
      });

      // Update join request status
      transaction.update(requestRef, {
        status: 'accepted',
        updatedAt: new Date(),
      });

      // If group is now full, create a private group
      let groupId: string | undefined;
      if (currentMembers.length >= (post.membersRequired || 0)) {
        const groupRef = this.db.collection(GROUPS_COLLECTION).doc();
        groupId = groupRef.id;
        
        transaction.set(groupRef, {
          id: groupId,
          postId: postId,
          name: post.groupName || `Group - ${post.description.substring(0, 30)}...`,
          description: post.groupDescription,
          leaderId: post.userId,
          leaderUid: post.uid,
          members: currentMembers,
          maxMembers: post.membersRequired,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      return { success: true, groupId, request, post };
    });
  }

  async rejectJoinRequest(requestId: string): Promise<{ success: boolean; message?: string; request?: JoinRequest }> {
    const requestRef = this.db.collection(JOIN_REQUESTS_COLLECTION).doc(requestId);
    const requestDoc = await requestRef.get();

    if (!requestDoc.exists) {
      return { success: false, message: 'Request not found' };
    }

    const request = requestDoc.data() as JoinRequest;

    await requestRef.update({
      status: 'rejected',
      updatedAt: new Date(),
    });

    return { success: true, message: 'Request rejected', request };
  }

  async getJoinRequestsWithProfiles(postId: string): Promise<Array<JoinRequest & { profile: FirebaseProfile | null }>> {
    const requests = await this.getJoinRequestsForPost(postId);
    
    // Fetch profiles for all requests
    const requestsWithProfiles = await Promise.all(
      requests.map(async (request) => {
        const profile = await this.collabService.getProfileByUid(request.uid);
        return {
          ...request,
          profile,
        };
      })
    );
    
    return requestsWithProfiles;
  }

  // ========== LIKES ==========
  
  async likePost(postId: string, userId: number, uid: string): Promise<boolean> {
    // Check if already liked
    const existing = await this.db
      .collection(LIKES_COLLECTION)
      .where('postId', '==', postId)
      .where('uid', '==', uid)
      .limit(1)
      .get();

    if (!existing.empty) {
      // Unlike
      await existing.docs[0].ref.delete();
      return false;
    }

    // Like
    const docRef = this.db.collection(LIKES_COLLECTION).doc();
    await docRef.set({
      id: docRef.id,
      postId,
      userId,
      uid,
      createdAt: new Date(),
    });
    return true;
  }

  async getLikesCount(postId: string): Promise<number> {
    const snapshot = await this.db
      .collection(LIKES_COLLECTION)
      .where('postId', '==', postId)
      .count()
      .get();
    
    return snapshot.data().count;
  }

  async getUserLike(postId: string, uid: string): Promise<boolean> {
    const snapshot = await this.db
      .collection(LIKES_COLLECTION)
      .where('postId', '==', postId)
      .where('uid', '==', uid)
      .limit(1)
      .get();
    
    return !snapshot.empty;
  }

  // ========== COMMENTS ==========
  
  async createComment(data: Omit<Comment, 'id' | 'createdAt' | 'updatedAt'>): Promise<Comment> {
    const docRef = this.db.collection(COMMENTS_COLLECTION).doc();
    const now = new Date();
    
    const comment: Comment = {
      id: docRef.id,
      ...data,
      createdAt: now,
      updatedAt: now,
    };

    // Remove undefined values (Firestore doesn't allow them)
    const cleanedComment = Object.fromEntries(
      Object.entries(comment).filter(([_, value]) => value !== undefined)
    ) as Comment;

    await docRef.set(cleanedComment);
    return comment;
  }

  async getComment(commentId: string): Promise<Comment | null> {
    const doc = await this.db
      .collection(COMMENTS_COLLECTION)
      .doc(commentId)
      .get();
    
    if (!doc.exists) {
      return null;
    }
    
    return doc.data() as Comment;
  }

  async getComments(postId: string): Promise<Comment[]> {
    const snapshot = await this.db
      .collection(COMMENTS_COLLECTION)
      .where('postId', '==', postId)
      .orderBy('createdAt', 'asc')
      .get();
    
    return snapshot.docs.map(doc => doc.data() as Comment);
  }

  async deleteComment(commentId: string): Promise<void> {
    await this.db.collection(COMMENTS_COLLECTION).doc(commentId).delete();
  }

  async reactToComment(commentId: string, reaction: string): Promise<void> {
    const commentRef = this.db.collection(COMMENTS_COLLECTION).doc(commentId);
    await commentRef.update({
      [`reactions.${reaction}`]: admin.firestore.FieldValue.increment(1),
    });
  }

  // ========== COMMENT LIKES ==========
  
  async toggleCommentLike(commentId: string, userId: number, uid: string): Promise<boolean> {
    const likesQuery = await this.db
      .collection('commentLikes')
      .where('commentId', '==', commentId)
      .where('uid', '==', uid)
      .limit(1)
      .get();

    if (likesQuery.empty) {
      // Add like
      const docRef = this.db.collection('commentLikes').doc();
      await docRef.set({
        id: docRef.id,
        commentId,
        userId,
        uid,
        createdAt: new Date(),
      });
      return true; // liked
    } else {
      // Remove like
      await likesQuery.docs[0].ref.delete();
      return false; // unliked
    }
  }

  async getCommentLikesCount(commentId: string): Promise<number> {
    const snapshot = await this.db
      .collection('commentLikes')
      .where('commentId', '==', commentId)
      .count()
      .get();
    
    return snapshot.data().count;
  }

  async getUserCommentLike(commentId: string, uid: string): Promise<boolean> {
    const snapshot = await this.db
      .collection('commentLikes')
      .where('commentId', '==', commentId)
      .where('uid', '==', uid)
      .limit(1)
      .get();
    
    return !snapshot.empty;
  }

  // ========== COMMENT REPLIES ==========
  
  async createReply(data: Omit<Comment, 'id' | 'createdAt' | 'updatedAt'>): Promise<Comment> {
    const docRef = this.db.collection(COMMENTS_COLLECTION).doc();
    const now = new Date();
    
    const reply: Comment = {
      id: docRef.id,
      ...data,
      createdAt: now,
      updatedAt: now,
    };

    // Remove undefined values
    const cleanedReply = Object.fromEntries(
      Object.entries(reply).filter(([_, value]) => value !== undefined)
    ) as Comment;

    await docRef.set(cleanedReply);
    return reply;
  }

  async getReplies(parentCommentId: string): Promise<Comment[]> {
    const snapshot = await this.db
      .collection(COMMENTS_COLLECTION)
      .where('parentCommentId', '==', parentCommentId)
      .orderBy('createdAt', 'asc')
      .get();
    
    return snapshot.docs.map(doc => doc.data() as Comment);
  }

  // ========== SHARES ==========
  
  async sharePost(postId: string, senderId: number, senderUid: string, receiverId: number, receiverUid: string): Promise<Share> {
    const docRef = this.db.collection(SHARES_COLLECTION).doc();
    
    const share: Share = {
      id: docRef.id,
      postId,
      senderId,
      senderUid,
      receiverId,
      receiverUid,
      createdAt: new Date(),
    };

    await docRef.set(share);
    return share;
  }

  // ========== CONNECTIONS ==========
  
  async sendConnectionRequest(senderId: number, senderUid: string, receiverId: number, receiverUid: string): Promise<Connection> {
    // Check if connection already exists
    const existing = await this.db
      .collection(CONNECTIONS_COLLECTION)
      .where('senderUid', 'in', [senderUid, receiverUid])
      .where('receiverUid', 'in', [senderUid, receiverUid])
      .limit(1)
      .get();

    if (!existing.empty) {
      return existing.docs[0].data() as Connection;
    }

    const docRef = this.db.collection(CONNECTIONS_COLLECTION).doc();
    const now = new Date();
    
    const connection: Connection = {
      id: docRef.id,
      senderId,
      senderUid,
      receiverId,
      receiverUid,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    };

    await docRef.set(connection);
    return connection;
  }

  async getConnection(connectionId: string): Promise<Connection | null> {
    const doc = await this.db.collection(CONNECTIONS_COLLECTION).doc(connectionId).get();
    return doc.exists ? (doc.data() as Connection) : null;
  }

  async acceptConnection(connectionId: string): Promise<void> {
    await this.db.collection(CONNECTIONS_COLLECTION).doc(connectionId).update({
      status: 'accepted',
      updatedAt: new Date(),
    });
  }

  async rejectConnection(connectionId: string): Promise<void> {
    await this.db.collection(CONNECTIONS_COLLECTION).doc(connectionId).delete();
  }

  async getConnectionStatus(uid1: string, uid2: string): Promise<'none' | 'pending' | 'connected'> {
    const snapshot = await this.db
      .collection(CONNECTIONS_COLLECTION)
      .where('senderUid', 'in', [uid1, uid2])
      .where('receiverUid', 'in', [uid1, uid2])
      .limit(1)
      .get();

    if (snapshot.empty) return 'none';
    
    const connection = snapshot.docs[0].data() as Connection;
    return connection.status === 'accepted' ? 'connected' : 'pending';
  }

  async getUserConnections(uid: string): Promise<Connection[]> {
    const asSender = await this.db
      .collection(CONNECTIONS_COLLECTION)
      .where('senderUid', '==', uid)
      .where('status', '==', 'accepted')
      .get();

    const asReceiver = await this.db
      .collection(CONNECTIONS_COLLECTION)
      .where('receiverUid', '==', uid)
      .where('status', '==', 'accepted')
      .get();

    return [
      ...asSender.docs.map(doc => doc.data() as Connection),
      ...asReceiver.docs.map(doc => doc.data() as Connection),
    ];
  }

  // ========== MESSAGES ==========
  
  async sendMessage(data: Omit<Message, 'id' | 'createdAt' | 'isRead'>): Promise<Message> {
    const docRef = this.db.collection(MESSAGES_COLLECTION).doc();
    
    const message: Message = {
      id: docRef.id,
      ...data,
      isRead: false,
      createdAt: new Date(),
    };

    await docRef.set(message);
    return message;
  }

  async markMessagesAsRead(receiverUid: string, senderUid: string): Promise<void> {
    const snapshot = await this.db
      .collection(MESSAGES_COLLECTION)
      .where('receiverUid', '==', receiverUid)
      .where('senderUid', '==', senderUid)
      .where('isRead', '==', false)
      .get();

    const batch = this.db.batch();
    snapshot.docs.forEach(doc => {
      batch.update(doc.ref, { isRead: true });
    });

    await batch.commit();
  }

  async getMessages(uid1: string, uid2: string): Promise<Message[]> {
    const snapshot = await this.db
      .collection(MESSAGES_COLLECTION)
      .where('senderUid', 'in', [uid1, uid2])
      .where('receiverUid', 'in', [uid1, uid2])
      .orderBy('createdAt', 'asc')
      .get();
    
    return snapshot.docs.map(doc => doc.data() as Message);
  }

  // ========== GROUPS ==========
  
  async getGroup(groupId: string): Promise<Group | null> {
    const doc = await this.db.collection(GROUPS_COLLECTION).doc(groupId).get();
    return doc.exists ? (doc.data() as Group) : null;
  }

  async getUserGroups(uid: string): Promise<Group[]> {
    const snapshot = await this.db
      .collection(GROUPS_COLLECTION)
      .where('members', 'array-contains', uid)
      .get();
    
    return snapshot.docs.map(doc => doc.data() as Group);
  }

  async updateGroup(groupId: string, data: Partial<Group>): Promise<void> {
    await this.db.collection(GROUPS_COLLECTION).doc(groupId).update({
      ...data,
      updatedAt: new Date(),
    });
  }

  async sendGroupMessage(data: Omit<GroupMessage, 'id' | 'createdAt'>): Promise<GroupMessage> {
    const docRef = this.db.collection(GROUP_MESSAGES_COLLECTION).doc();
    
    // Filter out undefined values to avoid Firestore errors
    const messageData: any = {
      id: docRef.id,
      groupId: data.groupId,
      senderId: data.senderId,
      senderUid: data.senderUid,
      text: data.text,
      createdAt: new Date(),
    };

    // Only add optional fields if they have values
    if (data.mediaUrl) messageData.mediaUrl = data.mediaUrl;
    if (data.mediaType) messageData.mediaType = data.mediaType;
    if (data.fileName) messageData.fileName = data.fileName;

    await docRef.set(messageData);
    return messageData as GroupMessage;
  }

  async getGroupMessages(groupId: string): Promise<GroupMessage[]> {
    const snapshot = await this.db
      .collection(GROUP_MESSAGES_COLLECTION)
      .where('groupId', '==', groupId)
      .orderBy('createdAt', 'asc')
      .get();
    
    return snapshot.docs.map(doc => doc.data() as GroupMessage);
  }

  // ========== ADMIN METHODS ==========

  async getAllPostsForAdmin(): Promise<Post[]> {
    const snapshot = await this.db
      .collection(POSTS_COLLECTION)
      .orderBy('createdAt', 'desc')
      .get();
    
    return snapshot.docs.map(doc => doc.data() as Post);
  }

  async featurePost(postId: string): Promise<void> {
    await this.db.collection(POSTS_COLLECTION).doc(postId).update({
      isFeatured: true,
      featuredAt: new Date()
    });
  }

  async unfeaturePost(postId: string): Promise<void> {
    await this.db.collection(POSTS_COLLECTION).doc(postId).update({
      isFeatured: false,
      featuredAt: null
    });
  }

  async getFeaturedPosts(): Promise<Post[]> {
    const snapshot = await this.db
      .collection(POSTS_COLLECTION)
      .where('isFeatured', '==', true)
      .orderBy('featuredAt', 'desc')
      .get();
    
    return snapshot.docs.map(doc => doc.data() as Post);
  }

  // ========== SAVED POSTS ==========

  async toggleSavePost(postId: string, uid: string): Promise<boolean> {
    const userSavesRef = this.db.collection('userSavedPosts').doc(uid);
    const userSavesDoc = await userSavesRef.get();
    
    if (userSavesDoc.exists) {
      const savedPosts = userSavesDoc.data()?.savedPosts || [];
      if (savedPosts.includes(postId)) {
        // Unsave the post
        await userSavesRef.update({
          savedPosts: FieldValue.arrayRemove(postId),
          updatedAt: new Date()
        });
        return false;
      } else {
        // Save the post
        await userSavesRef.update({
          savedPosts: FieldValue.arrayUnion(postId),
          updatedAt: new Date()
        });
        return true;
      }
    } else {
      // First save for this user
      await userSavesRef.set({
        uid,
        savedPosts: [postId],
        createdAt: new Date(),
        updatedAt: new Date()
      });
      return true;
    }
  }

  async getSavedPostIds(uid: string): Promise<string[]> {
    const userSavesDoc = await this.db.collection('userSavedPosts').doc(uid).get();
    if (!userSavesDoc.exists) return [];
    return userSavesDoc.data()?.savedPosts || [];
  }

  async getSavedPosts(uid: string): Promise<Post[]> {
    const savedPostIds = await this.getSavedPostIds(uid);
    if (savedPostIds.length === 0) return [];
    
    const posts: Post[] = [];
    for (const postId of savedPostIds) {
      const post = await this.getPost(postId);
      if (post) posts.push(post);
    }
    return posts;
  }
}

export const collabSocial = new CollabSocialFirestore();
