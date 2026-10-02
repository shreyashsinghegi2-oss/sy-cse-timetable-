import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { notificationService } from './notification-service';
import { cacheService } from './cache-service';

interface ConnectionRequest {
  id: string;
  requesterId: string;
  requesterName: string;
  requesterUsername: string;
  requesterRole?: string;
  requesterAvatarUrl?: string;
  receiverId: string;
  receiverName: string;
  receiverUsername: string;
  status: 'pending' | 'accepted' | 'rejected';
  timestamp: Date;
}

interface ProfileConnectionData {
  connections: string[];
  pendingRequests: string[];
  sentRequests: string[];
}

export class ConnectionService {
  private get db() {
    return getFirestore();
  }

  private readonly PROFILES_COLLECTION = 'studentProfiles';
  private readonly REQUESTS_COLLECTION = 'connection_requests';
  private readonly USERS_COLLECTION = 'users';

  /**
   * Send a connection request
   */
  async sendRequest(requesterId: string, receiverId: string): Promise<{ success: boolean; message: string }> {
    if (requesterId === receiverId) {
      return { success: false, message: 'Cannot send connection request to yourself' };
    }

    try {
      // Get both profiles
      const [requesterDoc, receiverDoc] = await Promise.all([
        this.db.collection(this.PROFILES_COLLECTION).doc(requesterId).get(),
        this.db.collection(this.PROFILES_COLLECTION).doc(receiverId).get()
      ]);

      if (!requesterDoc.exists || !receiverDoc.exists) {
        return { success: false, message: 'User profile not found' };
      }

      const requesterData = requesterDoc.data();
      const receiverData = receiverDoc.data();

      // Check if already connected
      const requesterConnections = requesterData?.connections || [];
      if (requesterConnections.includes(receiverId)) {
        return { success: false, message: 'Already connected' };
      }

      // Check if request already exists
      const existingRequests = await this.db.collection(this.REQUESTS_COLLECTION)
        .where('requesterId', '==', requesterId)
        .where('receiverId', '==', receiverId)
        .where('status', '==', 'pending')
        .get();

      if (!existingRequests.empty) {
        return { success: false, message: 'Connection request already sent' };
      }

      // Check if reverse request exists (receiver already sent to requester)
      const reverseRequests = await this.db.collection(this.REQUESTS_COLLECTION)
        .where('requesterId', '==', receiverId)
        .where('receiverId', '==', requesterId)
        .where('status', '==', 'pending')
        .get();

      if (!reverseRequests.empty) {
        return { success: false, message: 'This user has already sent you a connection request' };
      }

      // Create connection request using dual-write pattern in a transaction
      const requestId = this.db.collection(this.REQUESTS_COLLECTION).doc().id;
      
      await this.db.runTransaction(async (transaction) => {
        const requesterRef = this.db.collection(this.PROFILES_COLLECTION).doc(requesterId);
        const receiverRef = this.db.collection(this.PROFILES_COLLECTION).doc(receiverId);
        
        // Dual-write: Save request under both users' subcollections
        const requesterRequestRef = this.db.collection(this.USERS_COLLECTION).doc(requesterId)
          .collection('requests').doc(requestId);
        const receiverRequestRef = this.db.collection(this.USERS_COLLECTION).doc(receiverId)
          .collection('requests').doc(requestId);

        const requestData: ConnectionRequest = {
          id: requestId,
          requesterId,
          requesterName: requesterData?.name || requesterData?.username || 'Unknown',
          requesterUsername: requesterData?.username || '',
          requesterRole: requesterData?.role || 'Student',
          requesterAvatarUrl: requesterData?.avatarUrl || '',
          receiverId,
          receiverName: receiverData?.name || receiverData?.username || 'Unknown',
          receiverUsername: receiverData?.username || '',
          status: 'pending',
          timestamp: new Date()
        };

        // Save to both users' subcollections atomically
        transaction.set(requesterRequestRef, requestData);
        transaction.set(receiverRequestRef, requestData);

        // Update requester's sentRequests (use set with merge to initialize if needed)
        transaction.set(requesterRef, {
          sentRequests: FieldValue.arrayUnion(receiverId),
          connections: requesterData?.connections || [],
          pendingRequests: requesterData?.pendingRequests || []
        }, { merge: true });

        // Update receiver's pendingRequests (use set with merge to initialize if needed)
        transaction.set(receiverRef, {
          pendingRequests: FieldValue.arrayUnion(requesterId),
          connections: receiverData?.connections || [],
          sentRequests: receiverData?.sentRequests || []
        }, { merge: true });
      });

      
      cacheService.invalidate(`connections:${requesterId}`);
      cacheService.invalidate(`connections:${receiverId}`);
      
      await notificationService.createNotification({
        recipientUid: receiverId,
        senderUid: requesterId,
        type: 'connection_request'
      });

      return { success: true, message: 'Connection request sent successfully' };

    } catch (error) {
      return { success: false, message: 'Failed to send connection request' };
    }
  }

  /**
   * Accept a connection request
   */
  async acceptRequest(receiverId: string, requesterId: string): Promise<{ success: boolean; message: string }> {
    try {
      
      // Find the pending request in receiver's subcollection (dual-write pattern)
      const receiverRequestsQuery = await this.db.collection(this.USERS_COLLECTION)
        .doc(receiverId)
        .collection('requests')
        .where('requesterId', '==', requesterId)
        .where('status', '==', 'pending')
        .get();

      let requestId: string | null = null;
      let topLevelRequestId: string | null = null;

      if (receiverRequestsQuery.empty) {
        // Fallback 1: check top-level connection_requests collection
        const topLevelQuery = await this.db.collection(this.REQUESTS_COLLECTION)
          .where('requesterId', '==', requesterId)
          .where('receiverId', '==', receiverId)
          .where('status', '==', 'pending')
          .get();

        if (!topLevelQuery.empty) {
          topLevelRequestId = topLevelQuery.docs[0].id;
        } else {
          // Fallback 2: check receiver's pendingRequests array
          const receiverDoc = await this.db.collection(this.PROFILES_COLLECTION).doc(receiverId).get();
          const receiverData = receiverDoc.data() || {};
          const receiverConnections = receiverData?.connections || [];
          if (receiverConnections.includes(requesterId)) {
            return { success: false, message: 'Already connected with this user' };
          }
          const pendingRequests = receiverData?.pendingRequests || [];
          if (!pendingRequests.includes(requesterId)) {
            return { success: false, message: 'Connection request not found or has expired' };
          }
          // pendingRequests array shows the request exists even without a doc — proceed
        }
      } else {
        requestId = receiverRequestsQuery.docs[0].id;
      }
      
      // Accept request in a transaction
      await this.db.runTransaction(async (transaction) => {
        const requesterRef = this.db.collection(this.PROFILES_COLLECTION).doc(requesterId);
        const receiverRef = this.db.collection(this.PROFILES_COLLECTION).doc(receiverId);
        
        // Reference to connection documents in both users' subcollections
        const requesterConnectionRef = this.db.collection(this.USERS_COLLECTION).doc(requesterId)
          .collection('connections').doc(receiverId);
        const receiverConnectionRef = this.db.collection(this.USERS_COLLECTION).doc(receiverId)
          .collection('connections').doc(requesterId);

        // Get profile data for safe updates
        const requesterDoc = await transaction.get(requesterRef);
        const receiverDoc = await transaction.get(receiverRef);
        const requesterData = requesterDoc.data();
        const receiverData = receiverDoc.data();

        // Update request status — handle whichever storage path was used
        if (requestId) {
          const requesterRequestRef = this.db.collection(this.USERS_COLLECTION).doc(requesterId)
            .collection('requests').doc(requestId);
          const receiverRequestRef = this.db.collection(this.USERS_COLLECTION).doc(receiverId)
            .collection('requests').doc(requestId);
          transaction.update(requesterRequestRef, { status: 'accepted' });
          transaction.update(receiverRequestRef, { status: 'accepted' });
        }
        if (topLevelRequestId) {
          const topLevelRef = this.db.collection(this.REQUESTS_COLLECTION).doc(topLevelRequestId);
          transaction.update(topLevelRef, { status: 'accepted' });
        }
        
        // Create connection documents in both users' subcollections
        const connectionData = {
          connectedAt: new Date(),
          requestId
        };
        transaction.set(requesterConnectionRef, {
          userId: receiverId,
          name: receiverData?.name || 'Unknown',
          username: receiverData?.username || '',
          role: receiverData?.role || 'Student',
          avatarUrl: receiverData?.avatarUrl || '',
          ...connectionData
        });
        transaction.set(receiverConnectionRef, {
          userId: requesterId,
          name: requesterData?.name || 'Unknown',
          username: requesterData?.username || '',
          role: requesterData?.role || 'Student',
          avatarUrl: requesterData?.avatarUrl || '',
          ...connectionData
        });

        // Add to each other's connections array and increment connectionCount
        transaction.set(requesterRef, {
          connections: FieldValue.arrayUnion(receiverId),
          connectionCount: FieldValue.increment(1),
          sentRequests: FieldValue.arrayRemove(receiverId),
          pendingRequests: requesterData?.pendingRequests || []
        }, { merge: true });

        transaction.set(receiverRef, {
          connections: FieldValue.arrayUnion(requesterId),
          connectionCount: FieldValue.increment(1),
          pendingRequests: FieldValue.arrayRemove(requesterId),
          sentRequests: receiverData?.sentRequests || []
        }, { merge: true });
        
      });

      
      // Update the original connection_request notification status
      await notificationService.updateNotificationStatus(requesterId, receiverId, 'connection_request', 'accepted');
      
      // Create notification for the requester ONLY after transaction succeeds
      await notificationService.createNotification({
        recipientUid: requesterId,
        senderUid: receiverId,
        type: 'connection_accepted'
      });

      return { success: true, message: 'Connection request accepted' };

    } catch (error) {
      return { success: false, message: 'Failed to accept connection request' };
    }
  }

  /**
   * Reject a connection request
   */
  async rejectRequest(receiverId: string, requesterId: string): Promise<{ success: boolean; message: string }> {
    try {
      // Find the pending request in receiver's subcollection (dual-write pattern)
      const receiverRequestsQuery = await this.db.collection(this.USERS_COLLECTION)
        .doc(receiverId)
        .collection('requests')
        .where('requesterId', '==', requesterId)
        .where('status', '==', 'pending')
        .get();

      if (receiverRequestsQuery.empty) {
        return { success: false, message: 'Connection request not found' };
      }

      const requestDoc = receiverRequestsQuery.docs[0];
      const requestId = requestDoc.id;

      // Reject request in a transaction
      await this.db.runTransaction(async (transaction) => {
        const requesterRef = this.db.collection(this.PROFILES_COLLECTION).doc(requesterId);
        const receiverRef = this.db.collection(this.PROFILES_COLLECTION).doc(receiverId);
        
        // Reference to request documents in both users' subcollections
        const requesterRequestRef = this.db.collection(this.USERS_COLLECTION).doc(requesterId)
          .collection('requests').doc(requestId);
        const receiverRequestRef = this.db.collection(this.USERS_COLLECTION).doc(receiverId)
          .collection('requests').doc(requestId);

        // Get profile data for safe updates
        const requesterDoc = await transaction.get(requesterRef);
        const receiverDoc = await transaction.get(receiverRef);
        const requesterData = requesterDoc.data();
        const receiverData = receiverDoc.data();

        // Update request status to rejected in both subcollections
        transaction.update(requesterRequestRef, { status: 'rejected' });
        transaction.update(receiverRequestRef, { status: 'rejected' });

        // Remove from arrays (use set with merge)
        transaction.set(requesterRef, {
          sentRequests: FieldValue.arrayRemove(receiverId),
          connections: requesterData?.connections || [],
          pendingRequests: requesterData?.pendingRequests || []
        }, { merge: true });

        transaction.set(receiverRef, {
          pendingRequests: FieldValue.arrayRemove(requesterId),
          connections: receiverData?.connections || [],
          sentRequests: receiverData?.sentRequests || []
        }, { merge: true });
      });

      
      // Update the original connection_request notification status
      await notificationService.updateNotificationStatus(requesterId, receiverId, 'connection_request', 'rejected');
      
      return { success: true, message: 'Connection request rejected' };

    } catch (error) {
      return { success: false, message: 'Failed to reject connection request' };
    }
  }

  /**
   * Get connection status between two users
   */
  async getConnectionStatus(userId: string, targetUserId: string): Promise<{
    status: 'none' | 'connected' | 'pending_sent' | 'pending_received';
    connectionCount?: number;
  }> {
    try {
      const userDoc = await this.db.collection(this.PROFILES_COLLECTION).doc(userId).get();
      
      if (!userDoc.exists) {
        return { status: 'none' };
      }

      const userData = userDoc.data();
      const connections = userData?.connections || [];
      const sentRequests = userData?.sentRequests || [];
      const pendingRequests = userData?.pendingRequests || [];
      // Use connectionCount field if available, otherwise count the connections array
      const connectionCount = userData?.connectionCount || connections.length;

      if (connections.includes(targetUserId)) {
        return { status: 'connected', connectionCount };
      }

      if (sentRequests.includes(targetUserId)) {
        return { status: 'pending_sent', connectionCount };
      }

      if (pendingRequests.includes(targetUserId)) {
        return { status: 'pending_received', connectionCount };
      }

      return { status: 'none', connectionCount };

    } catch (error) {
      return { status: 'none' };
    }
  }
  
  /**
   * Get connection count for a user
   */
  async getConnectionCount(userId: string): Promise<number> {
    try {
      const userDoc = await this.db.collection(this.PROFILES_COLLECTION).doc(userId).get();
      
      if (!userDoc.exists) {
        return 0;
      }

      const userData = userDoc.data();
      // Use connectionCount field if available, otherwise count the connections array
      const count = userData?.connectionCount || (userData?.connections?.length || 0);
      return count;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Get all pending connection requests for a user
   */
  async getPendingRequests(userId: string): Promise<ConnectionRequest[]> {
    try {
      const requestsSnapshot = await this.db.collection(this.REQUESTS_COLLECTION)
        .where('receiverId', '==', userId)
        .where('status', '==', 'pending')
        .orderBy('timestamp', 'desc')
        .get();

      return requestsSnapshot.docs.map(doc => doc.data() as ConnectionRequest);

    } catch (error) {
      return [];
    }
  }

  /**
   * Get all connections for a user
   */
  async getConnections(userId: string): Promise<any[]> {
    try {
      const userDoc = await this.db.collection(this.PROFILES_COLLECTION).doc(userId).get();
      
      
      if (!userDoc.exists) {
        return [];
      }

      const userData = userDoc.data();
      const connectionIds = userData?.connections || [];

      if (connectionIds.length === 0) {
        return [];
      }

      // Fetch all connected user profiles
      const connectionProfiles = await Promise.all(
        connectionIds.map(async (connectionId: string) => {
          const profileDoc = await this.db.collection(this.PROFILES_COLLECTION).doc(connectionId).get();
          if (profileDoc.exists) {
            return {
              uid: connectionId,
              ...profileDoc.data()
            };
          }
          return null;
        })
      );

      const validProfiles = connectionProfiles.filter(p => p !== null);
      return validProfiles;

    } catch (error) {
      return [];
    }
  }

  /**
   * Get mutual connections between two users
   */
  async getMutualConnections(userId: string, targetUserId: string): Promise<any[]> {
    try {
      const [userDoc, targetDoc] = await Promise.all([
        this.db.collection(this.PROFILES_COLLECTION).doc(userId).get(),
        this.db.collection(this.PROFILES_COLLECTION).doc(targetUserId).get()
      ]);

      if (!userDoc.exists || !targetDoc.exists) {
        return [];
      }

      const userConnections = userDoc.data()?.connections || [];
      const targetConnections = targetDoc.data()?.connections || [];

      // Find intersection
      const mutualConnectionIds = userConnections.filter((id: string) => 
        targetConnections.includes(id)
      );

      if (mutualConnectionIds.length === 0) {
        return [];
      }

      // Fetch full profile data for mutual connections
      const mutualProfiles = await Promise.all(
        mutualConnectionIds.map(async (connectionId: string) => {
          const profileDoc = await this.db.collection(this.PROFILES_COLLECTION).doc(connectionId).get();
          if (profileDoc.exists) {
            return {
              uid: connectionId,
              ...profileDoc.data()
            };
          }
          return null;
        })
      );

      return mutualProfiles.filter(p => p !== null);

    } catch (error) {
      return [];
    }
  }
}

export const connectionService = new ConnectionService();
