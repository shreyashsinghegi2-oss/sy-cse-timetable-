import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useCollabAuth } from "@/hooks/use-collab-auth";
import type { InsertStudentProfile } from "@shared/schema";
import { collabFetch } from "@/lib/firebase";

// Firestore Student Profile type (matches what API returns)
export interface CollabStudentProfile {
  id: number; // normalized from userId
  uid: string; // Firebase UID
  userId: number;
  name: string;
  username: string;
  email: string;
  phone?: string;
  college: string;
  career: string;
  primaryStream?: string | null;
  subStreams?: string[];
  specialties?: string[];
  skills: string[];
  currentCourse: string;
  interests: string[];
  passions?: string[];
  studentLifeActivities?: string[];
  openToCrossStreamCollab?: boolean;
  preferredCollabTypes?: string[];
  bio?: string;
  avatarUrl?: string;
  isAvailableForCollab?: boolean;
  createdAt: string; // ISO string after normalization
  updatedAt: string; // ISO string after normalization
}

// Frontend profile type - excludes userId (handled by backend)
type CreateStudentProfile = Omit<InsertStudentProfile, "userId">;
type UpdateStudentProfile = Partial<CreateStudentProfile>;

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
    let errorMessage = `HTTP ${response.status}`;
    try {
      const error = await response.json();
      errorMessage = error.message || error.error || errorMessage;
    } catch {
      // Keep the HTTP status when the server did not return JSON.
    }
    throw new Error(errorMessage);
  }

  return response.json();
}

export function useCollabStudentProfile() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isAuthenticated } = useCollabAuth();

  // Fetch user's profile
  const {
    data: profile,
    isLoading,
    error
  } = useQuery<CollabStudentProfile | null>({
    queryKey: ["/api/collab/student-profile"],
    queryFn: async () => {
      try {
        const response = await collabApiRequest("GET", "/student-profile");
        return response;
      } catch (error: any) {
        if (error.message?.includes("404") || error.message?.includes("No profile found")) {
          return null; // No profile exists yet
        }
        throw error;
      }
    },
    enabled: isAuthenticated, // Only run query when authenticated
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: false
  });

  // Create profile
  const createProfileMutation = useMutation({
    mutationFn: async (profileData: CreateStudentProfile) => {
      return await collabApiRequest("POST", "/student-profile", profileData);
    },
    onSuccess: (newProfile: CollabStudentProfile) => {
      queryClient.setQueryData(["/api/collab/student-profile"], newProfile);
      queryClient.invalidateQueries({ queryKey: ["/api/collab/student-profile"] });
      toast({
        title: "Profile created successfully!",
        description: "Your Student Collab profile is now ready for collaboration.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create profile",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update profile
  const updateProfileMutation = useMutation({
    mutationFn: async (profileData: UpdateStudentProfile) => {
      return await collabApiRequest("PUT", "/student-profile", profileData);
    },
    onSuccess: (updatedProfile: CollabStudentProfile) => {
      queryClient.setQueryData(["/api/collab/student-profile"], updatedProfile);
      queryClient.invalidateQueries({ queryKey: ["/api/collab/student-profile"] });
      toast({
        title: "Profile updated successfully!",
        description: "Your changes have been saved.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update profile",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    profile,
    isLoading,
    error,
    createProfile: createProfileMutation.mutate,
    updateProfile: updateProfileMutation.mutate,
    isCreating: createProfileMutation.isPending,
    isUpdating: updateProfileMutation.isPending,
  };
}