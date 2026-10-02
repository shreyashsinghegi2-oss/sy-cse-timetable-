import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { StudentProfile, InsertStudentProfile } from "@shared/schema";

// Frontend profile type - excludes userId (handled by backend)
type CreateStudentProfile = Omit<InsertStudentProfile, "userId">;
type UpdateStudentProfile = Partial<CreateStudentProfile>;

export function useStudentProfile() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch user's profile
  const {
    data: profile,
    isLoading,
    error
  } = useQuery<StudentProfile | null>({
    queryKey: ["/api/student-profile"],
    queryFn: async () => {
      try {
        const response = await apiRequest("GET", "/api/student-profile");
        return response;
      } catch (error: any) {
        if (error.message?.includes("404") || error.message?.includes("No profile found")) {
          return null; // No profile exists yet
        }
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: false
  });

  // Create profile
  const createProfileMutation = useMutation({
    mutationFn: async (profileData: CreateStudentProfile) => {
      return await apiRequest("POST", "/api/student-profile", profileData);
    },
    onSuccess: (newProfile: StudentProfile) => {
      queryClient.setQueryData(["/api/student-profile"], newProfile);
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
      return await apiRequest("PUT", "/api/student-profile", profileData);
    },
    onSuccess: (updatedProfile: StudentProfile) => {
      queryClient.setQueryData(["/api/student-profile"], updatedProfile);
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

  // Delete profile
  const deleteProfileMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("DELETE", "/api/student-profile");
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/student-profile"], null);
      toast({
        title: "Profile deleted",
        description: "Your Student Collab profile has been removed.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete profile",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    profile,
    isLoading,
    error,
    hasProfile: !!profile,
    createProfile: createProfileMutation.mutate,
    updateProfile: updateProfileMutation.mutate,
    deleteProfile: deleteProfileMutation.mutate,
    isCreating: createProfileMutation.isPending,
    isUpdating: updateProfileMutation.isPending,
    isDeleting: deleteProfileMutation.isPending,
  };
}