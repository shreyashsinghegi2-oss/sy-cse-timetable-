import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCollabAuth } from "@/hooks/use-collab-auth";
import { collabFetch } from "@/lib/firebase";

export interface Connection {
  id: number;
  requesterId: number;
  receiverId: number;
  status: "pending" | "accepted" | "rejected";
  matchPercentage?: number;
  requestedAt: string;
  respondedAt?: string | null;
  otherUser?: {
    id: number;
    username: string;
    email: string;
  };
  profile?: {
    college: string;
    currentCourse: string;
    avatarUrl?: string;
  };
}

// Collab-specific API request function
async function collabApiRequest(method: string, endpoint: string, data?: any) {
  const response = await collabFetch(`/api/collab${endpoint}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
    body: data ? JSON.stringify(data) : undefined
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

export function useCollabConnections() {
  const queryClient = useQueryClient();
  const { isAuthenticated } = useCollabAuth();

  // Get user's connections
  const {
    data: connections = [],
    isLoading: isLoadingConnections,
    error: connectionsError
  } = useQuery<Connection[]>({
    queryKey: ['/api/collab/connections'],
    queryFn: async () => await collabApiRequest('GET', '/connections'),
    enabled: isAuthenticated, // Only run when authenticated
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Send connection request
  const sendConnectionRequestMutation = useMutation({
    mutationFn: async (receiverId: number) => {
      const response = await collabApiRequest('POST', '/connections/request', { receiverId });
      return response;
    },
    onSuccess: () => {
      // Invalidate connections to refresh the list
      queryClient.invalidateQueries({ queryKey: ['/api/collab/connections'] });
      queryClient.invalidateQueries({ queryKey: ['/api/collab/connections/status'] });
    },
    onError: (error) => {
      console.warn('[Connections] Send request failed');
    },
  });

  // Respond to connection request (accept/reject)
  const respondToConnectionMutation = useMutation({
    mutationFn: async ({ connectionId, status }: { connectionId: number; status: 'accepted' | 'rejected' }) => {
      const response = await collabApiRequest('PUT', `/connections/${connectionId}/respond`, { status });
      return response;
    },
    onSuccess: () => {
      // Invalidate connections to refresh the list
      queryClient.invalidateQueries({ queryKey: ['/api/collab/connections'] });
    },
    onError: (error) => {
      console.warn('[Connections] Response failed');
    },
  });

  return {
    connections,
    isLoadingConnections,
    connectionsError,
    sendConnectionRequest: sendConnectionRequestMutation.mutate,
    respondToConnection: respondToConnectionMutation.mutate,
    isSendingRequest: sendConnectionRequestMutation.isPending,
    isRespondingToConnection: respondToConnectionMutation.isPending,
  };
}