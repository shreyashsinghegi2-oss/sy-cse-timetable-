import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { firestore } from '@/lib/firebase';
import { collection, query, where, onSnapshot, or, and, doc, getDocs } from 'firebase/firestore';
import { useCollabAuth } from './use-collab-auth';

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
  timestamp: any;
}

interface ConnectionStatus {
  status: 'none' | 'connected' | 'pending_sent' | 'pending_received';
  connectionCount?: number;
}

/**
 * Hook to manage connection status with a target user (Real-time)
 * Reads from users/{uid}/connections subcollection which is the source of truth
 */
export function useConnectionStatus(targetUserId: string | undefined) {
  const { user } = useCollabAuth();
  const [status, setStatus] = useState<'none' | 'connected' | 'pending_sent' | 'pending_received'>('none');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid || !targetUserId || user.uid === targetUserId) {
      setStatus('none');
      setIsLoading(false);
      return;
    }

    let unsubRequests: (() => void) | null = null;
    let isConnected = false;

    // Listen to users/{currentUser}/connections subcollection for real-time connection status
    // This is the source of truth for connections (written by server on accept)
    const connectionsRef = collection(firestore, 'users', user.uid, 'connections');
    const connectionDocRef = doc(connectionsRef, targetUserId);

    const unsubConnection = onSnapshot(
      connectionDocRef, 
      (connectionSnapshot) => {
        
        if (connectionSnapshot.exists()) {
          // Connection document exists - we are connected
          if (unsubRequests) {
            unsubRequests();
            unsubRequests = null;
          }
          isConnected = true;
          setStatus('connected');
          setIsLoading(false);
        } else if (!isConnected && !unsubRequests) {
          // No connection - check for pending requests in the user's own requests subcollection
          // (dual-written by sendRequest for both parties — more reliable than top-level collection)
          const requestsQuery = query(
            collection(firestore, 'users', user.uid, 'requests'),
            or(
              and(where('requesterId', '==', user.uid), where('receiverId', '==', targetUserId), where('status', '==', 'pending')),
              and(where('requesterId', '==', targetUserId), where('receiverId', '==', user.uid), where('status', '==', 'pending'))
            )
          );

          unsubRequests = onSnapshot(requestsQuery, (reqSnapshot) => {
            if (!reqSnapshot.empty) {
              const request = reqSnapshot.docs[0].data();
              if (request.requesterId === user.uid) {
                setStatus('pending_sent');
              } else {
                setStatus('pending_received');
              }
            } else {
              setStatus('none');
            }
            setIsLoading(false);
          }, (error) => {
            console.warn('[ConnectionStatus] Error in requests listener:', error.message);
            setStatus('none');
            setIsLoading(false);
          });
        }
    },
    (error) => {
      console.warn('[Connections] Listener error');
      // Fallback: check pending requests
      if (!unsubRequests) {
        setStatus('none');
        setIsLoading(false);
      }
    });

    return () => {
      unsubConnection();
      if (unsubRequests) {
        unsubRequests();
      }
    };
  }, [user?.uid, targetUserId]);

  // Get connection count for the TARGET user, not the logged-in user
  const { connectionCount } = useConnectionCount(targetUserId);

  return {
    status,
    connectionCount,
    isLoading,
    refetch: () => {} // No-op for compatibility
  };
}

/**
 * Hook to send connection requests
 */
export function useSendConnectionRequest() {
  return useMutation({
    mutationFn: async (targetUserId: string) => {
      return await apiRequest('POST', '/api/collab/connections/request', { targetUserId });
    },
    onSuccess: (data, targetUserId) => {
      queryClient.invalidateQueries({ queryKey: [`/api/collab/connections/status/${targetUserId}`, targetUserId] });
    },
    onError: () => {
    }
  });
}

/**
 * Hook to accept connection requests
 */
export function useAcceptConnectionRequest() {
  const { user } = useCollabAuth();

  return useMutation({
    mutationFn: async ({ requesterId, requesterName }: { requesterId: string; requesterName: string }) => {
      const result = await apiRequest('POST', '/api/collab/connections/accept', { requesterId });
      // Treat server-side success:false as an error so onError fires
      if (result && result.success === false) {
        throw new Error(result.error || 'Failed to accept connection request');
      }
      return result;
    },
    onSuccess: (data, { requesterId, requesterName }) => {
      queryClient.invalidateQueries({ queryKey: ['/api/collab/connections'] });
      queryClient.invalidateQueries({ queryKey: [`/api/collab/connections/status/${requesterId}`, requesterId] });
      queryClient.invalidateQueries({ queryKey: ['/api/collab/profiles'] });
      
      if (user?.uid) {
        queryClient.invalidateQueries({ queryKey: [`/api/collab/profile/${user.uid}`] });
        queryClient.invalidateQueries({ queryKey: [`/api/collab/profile/${requesterId}`] });
      }
    },
    onError: (error: any) => {
      // Error will be surfaced by the calling component via mutation.isError / mutation.error
      console.error('[Connections] Accept failed:', error?.message || error);
    }
  });
}

/**
 * Hook to reject connection requests
 */
export function useRejectConnectionRequest() {
  return useMutation({
    mutationFn: async (requesterId: string) => {
      return await apiRequest('POST', '/api/collab/connections/reject', { requesterId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/collab/connections'] });
    },
    onError: () => {
    }
  });
}

/**
 * Hook to get pending connection requests with real-time updates
 */
export function useConnectionRequests() {
  const { user } = useCollabAuth();
  const [requests, setRequests] = useState<ConnectionRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) {
      setRequests([]);
      setIsLoading(false);
      return;
    }

    // Set up real-time listener for connection requests
    const requestsQuery = query(
      collection(firestore, 'connection_requests'),
      where('receiverId', '==', user.uid),
      where('status', '==', 'pending')
    );

    const unsubscribe = onSnapshot(requestsQuery, (snapshot) => {
      const pendingRequests = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ConnectionRequest[];

      setRequests(pendingRequests);
      setIsLoading(false);
    }, (error) => {
      console.warn('[Connections] Fetch requests failed');
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user?.uid]);

  return { requests, isLoading };
}

/**
 * Hook to get user's connections
 */
export function useConnections(userId?: string) {
  return useQuery({
    queryKey: [`/api/collab/connections/${userId}`, userId],
    enabled: !!userId
  });
}

/**
 * Hook to get mutual connections
 */
export function useMutualConnections(targetUserId: string | undefined) {
  return useQuery({
    queryKey: [`/api/collab/connections/mutual/${targetUserId}`, targetUserId],
    enabled: !!targetUserId
  });
}

/**
 * Hook to get real-time connection count for a user
 * Reads from users/{uid}/connections subcollection which is the source of truth
 */
export function useConnectionCount(userId: string | undefined) {
  const [connectionCount, setConnectionCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setConnectionCount(0);
      setIsLoading(false);
      return;
    }

    // Listen to users/{userId}/connections subcollection for real-time count
    const connectionsRef = collection(firestore, 'users', userId, 'connections');

    const unsubscribe = onSnapshot(connectionsRef, (snapshot) => {
      const count = snapshot.docs.length;
      setConnectionCount(count);
      setIsLoading(false);
    }, (error) => {
      console.warn('[Connections] Subcollection listener error');
      // Fallback: try to get count from profile document
      const profileDocRef = doc(firestore, 'studentProfiles', userId);
      onSnapshot(profileDocRef, (profileSnapshot) => {
        if (profileSnapshot.exists()) {
          const profileData = profileSnapshot.data();
          const connectionsArray = profileData.connections || [];
          const count = Array.isArray(connectionsArray) ? connectionsArray.length : 0;
          setConnectionCount(count);
        } else {
          setConnectionCount(0);
        }
        setIsLoading(false);
      });
    });

    return () => unsubscribe();
  }, [userId]);

  return { connectionCount, isLoading };
}
