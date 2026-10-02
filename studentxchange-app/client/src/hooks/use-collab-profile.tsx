import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useCollabAuth } from "@/hooks/use-collab-auth";
import { collabFetch } from "@/lib/firebase";

// Base profile interface
interface BaseProfile {
  id: number;
  uid: string;
  userId: number;
  role: 'Student' | 'Club' | 'Community' | 'Company';
  email: string;
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
}

// Student Profile
export interface StudentProfile extends BaseProfile {
  role: 'Student';
  name: string;
  username: string;
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
  isAvailableForCollab?: boolean;
}

// Club Profile
export interface ClubProfile extends BaseProfile {
  role: 'Club';
  clubName: string;
  category: 'Technical' | 'Cultural' | 'Sports' | 'Social' | 'Departmental';
  foundedYear: number;
  aboutClub: string;
  facultyCoordinatorName: string;
  studentHeadName: string;
  contactEmail: string;
  socialMediaLinks?: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
    linkedin?: string;
    website?: string;
  };
}

// Community Profile
export interface CommunityProfile extends BaseProfile {
  role: 'Community';
  communityName: string;
  missionVision: string;
  category: 'Tech' | 'Research' | 'Social' | 'Cultural';
  contactPerson: string;
  contactEmail: string;
  websiteJoinLink?: string;
  socialLinks?: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
    linkedin?: string;
    discord?: string;
  };
}

// Company Profile
export interface CompanyProfile extends BaseProfile {
  role: 'Company';
  companyName: string;
  industryType: string;
  aboutCompany: string;
  recruiterName: string;
  designation: string;
  contactEmail: string;
  websiteCareersPage?: string;
  linkedinProfile?: string;
}

// Union type for all profiles
export type CollabProfile = StudentProfile | ClubProfile | CommunityProfile | CompanyProfile;

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

export function useCollabProfile() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isAuthenticated } = useCollabAuth();

  // Fetch user's profile (any type)
  const {
    data: profile,
    isLoading,
    error
  } = useQuery<CollabProfile | null>({
    queryKey: ["/api/collab/student-profile"],
    queryFn: async () => {
      try {
        const response = await collabApiRequest("GET", "/student-profile");
        return response as CollabProfile;
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
    mutationFn: async (profileData: any) => {
      return await collabApiRequest("POST", "/student-profile", profileData);
    },
    onSuccess: (newProfile: CollabProfile) => {
      queryClient.setQueryData(["/api/collab/student-profile"], newProfile);
      queryClient.invalidateQueries({ queryKey: ["/api/collab/student-profile"] });
      const profileType = newProfile.role === 'Student' ? 'Student' : newProfile.role;
      toast({
        title: "Profile created successfully!",
        description: `Your ${profileType} Collab profile is now ready.`,
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
    mutationFn: async (profileData: any) => {
      return await collabApiRequest("PUT", "/student-profile", profileData);
    },
    onSuccess: (updatedProfile: CollabProfile) => {
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

  // Helper to get display name based on profile type
  const getDisplayName = (profile: CollabProfile | null | undefined): string => {
    if (!profile) return '';
    
    switch (profile.role) {
      case 'Student':
        return profile.name;
      case 'Club':
        return profile.clubName;
      case 'Community':
        return profile.communityName;
      case 'Company':
        return profile.companyName;
      default:
        return '';
    }
  };

  // Helper to get username (only for Student profiles)
  const getUsername = (profile: CollabProfile | null | undefined): string | null => {
    if (!profile) return null;
    return profile.role === 'Student' ? profile.username : null;
  };

  return {
    profile,
    isLoading,
    error,
    createProfile: createProfileMutation.mutate,
    updateProfile: updateProfileMutation.mutate,
    isCreating: createProfileMutation.isPending,
    isUpdating: updateProfileMutation.isPending,
    getDisplayName,
    getUsername,
  };
}
