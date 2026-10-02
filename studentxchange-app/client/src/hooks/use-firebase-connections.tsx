import { useState, useEffect } from 'react';
import { firebaseStudentService, FirebaseConnection } from '@/services/firebase-student-service';
import { useAuth } from '@/hooks/use-auth';
import { useFirebaseStudentProfile } from '@/hooks/use-firebase-student-profile';

export function useFirebaseConnections() {
  const { user } = useAuth();
  const { profile } = useFirebaseStudentProfile();
  const [connections, setConnections] = useState<FirebaseConnection[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setConnections([]);
      setIsLoading(false);
      return;
    }

    const loadConnections = async () => {
      try {
        setIsLoading(true);
        const userConnections = await firebaseStudentService.getUserConnections(user.id);
        setConnections(userConnections);
      } catch (error) {
        console.warn('[Connections] Load failed');
        setConnections([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadConnections();

    // Set up real-time listener for connections
    const unsubscribe = firebaseStudentService.onConnectionsUpdate(user.id, (updatedConnections) => {
      setConnections(updatedConnections);
      setIsLoading(false);
    });

    return unsubscribe;
  }, [user]);

  const sendConnectionRequest = async (receiverId: number, receiverProfile: { username: string; college: string; email: string }) => {
    if (!user || !profile) throw new Error('User not authenticated or no profile');

    try {
      const requesterProfileData = {
        username: profile.username,
        college: profile.college,
        email: profile.email,
        skills: profile.skills,
        avatarUrl: profile.avatarUrl
      };

      await firebaseStudentService.sendConnectionRequest(
        user.id,
        receiverId,
        requesterProfileData,
        receiverProfile
      );
    } catch (error) {
      console.warn('[Connections] Send request failed');
      throw error;
    }
  };

  const respondToConnection = async (connectionId: string, status: 'accepted' | 'rejected') => {
    try {
      await firebaseStudentService.updateConnectionStatus(connectionId, status);
    } catch (error) {
      console.warn('[Connections] Response failed');
      throw error;
    }
  };

  const getAcceptedConnections = () => {
    return connections.filter(conn => conn.status === 'accepted');
  };

  const getPendingRequests = () => {
    if (!user) return [];
    return connections.filter(conn => 
      conn.status === 'pending' && conn.receiverId === user.id
    );
  };

  const getSentRequests = () => {
    if (!user) return [];
    return connections.filter(conn => 
      conn.status === 'pending' && conn.requesterId === user.id
    );
  };

  return {
    connections,
    isLoading,
    sendConnectionRequest,
    respondToConnection,
    getAcceptedConnections,
    getPendingRequests,
    getSentRequests
  };
}