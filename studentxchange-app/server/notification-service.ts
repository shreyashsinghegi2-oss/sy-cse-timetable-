import { admin } from './firebase-admin';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import { CollabFirestoreService } from './collab-firestore-service';

const NOTIFICATIONS_COLLECTION = 'notifications';

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

export interface Notification {
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

export class NotificationService {
  private get db() {
    return admin.firestore();
  }
  private collabService = new CollabFirestoreService();

  async createNotification(data: {
    recipientUid: string;
    senderUid: string;
    type: NotificationType;
    relatedPostId?: string;
    relatedCommentId?: string;
    relatedGroupId?: string;
    relatedConnectionId?: string;
    relatedJoinRequestId?: string;
  }): Promise<string> {
    // Don't create notification if sender is the recipient
    if (data.recipientUid === data.senderUid) {
      return '';
    }

    // Get sender profile for message and sender info
    const senderProfile = await this.collabService.getProfileByUid(data.senderUid);
    // All profile types have name and username from baseProfileSchema
    const senderName = (senderProfile as any)?.username || (senderProfile as any)?.name || 'Someone';
    const senderUsername = (senderProfile as any)?.username || '';
    const senderAvatarUrl = (senderProfile as any)?.avatarUrl || '';

    // Generate message based on type
    let message = '';
    switch (data.type) {
      case 'post_like':
        message = `${senderName} liked your post`;
        break;
      case 'post_comment':
        message = `${senderName} commented on your post`;
        break;
      case 'comment_reply':
        message = `${senderName} replied to your comment`;
        break;
      case 'comment_like':
        message = `${senderName} liked your comment`;
        break;
      case 'join_request':
        message = `${senderName} wants to join your group`;
        break;
      case 'join_request_accepted':
        message = `${senderName} accepted your join request`;
        break;
      case 'join_request_rejected':
        message = `${senderName} rejected your join request`;
        break;
      case 'group_member_joined':
        message = `${senderName} joined your group`;
        break;
      case 'connection_request':
        message = `${senderName} sent you a connection request`;
        break;
      case 'connection_accepted':
        message = `${senderName} accepted your connection request`;
        break;
    }

    const notificationRef = this.db.collection(NOTIFICATIONS_COLLECTION).doc();
    await notificationRef.set({
      recipientUid: data.recipientUid,
      senderUid: data.senderUid,
      senderName,
      senderUsername,
      senderAvatarUrl,
      type: data.type,
      message,
      relatedPostId: data.relatedPostId || null,
      relatedCommentId: data.relatedCommentId || null,
      relatedGroupId: data.relatedGroupId || null,
      relatedConnectionId: data.relatedConnectionId || null,
      relatedJoinRequestId: data.relatedJoinRequestId || null,
      isRead: false,
      createdAt: Timestamp.now(),
    });

    return notificationRef.id;
  }

  async getUserNotifications(uid: string): Promise<Notification[]> {
    const snapshot = await this.db
      .collection(NOTIFICATIONS_COLLECTION)
      .where('recipientUid', '==', uid)
      .limit(50)
      .get();

    // Sort client-side to avoid Firestore composite index requirement
    const notifications = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
    })) as Notification[];

    return notifications.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getUnreadCount(uid: string): Promise<number> {
    const snapshot = await this.db
      .collection(NOTIFICATIONS_COLLECTION)
      .where('recipientUid', '==', uid)
      .where('isRead', '==', false)
      .get();

    return snapshot.size;
  }

  async markAsRead(notificationId: string): Promise<void> {
    await this.db
      .collection(NOTIFICATIONS_COLLECTION)
      .doc(notificationId)
      .update({
        isRead: true,
      });
  }

  async markAllAsRead(uid: string): Promise<void> {
    const snapshot = await this.db
      .collection(NOTIFICATIONS_COLLECTION)
      .where('recipientUid', '==', uid)
      .where('isRead', '==', false)
      .get();

    const batch = this.db.batch();
    snapshot.docs.forEach(doc => {
      batch.update(doc.ref, { isRead: true });
    });

    await batch.commit();
  }

  async updateNotificationStatus(senderUid: string, recipientUid: string, type: NotificationType, status: 'accepted' | 'rejected'): Promise<void> {
    // Find the notification to update
    const snapshot = await this.db
      .collection(NOTIFICATIONS_COLLECTION)
      .where('senderUid', '==', senderUid)
      .where('recipientUid', '==', recipientUid)
      .where('type', '==', type)
      .limit(1)
      .get();

    if (!snapshot.empty) {
      const notificationRef = snapshot.docs[0].ref;
      await notificationRef.update({
        status,
        updatedAt: Timestamp.now(),
      });
    }
  }
}

export const notificationService = new NotificationService();
