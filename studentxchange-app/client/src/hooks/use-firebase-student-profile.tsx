import { useState, useEffect } from 'react';
import { firebaseStudentService, FirebaseStudentProfile } from '@/services/firebase-student-service';
import { useCollabAuth } from '@/hooks/use-collab-auth';

export function useFirebaseStudentProfile() {
  const { user } = useCollabAuth();
  const [profile, setProfile] = useState<FirebaseStudentProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasProfile, setHasProfile] = useState(false);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      setHasProfile(false);
      setIsLoading(false);
      return;
    }

    const loadProfile = async () => {
      try {
        setIsLoading(true);
        const existingProfile = await firebaseStudentService.getStudentProfile(user.id);
        
        if (existingProfile) {
          setProfile(existingProfile);
          setHasProfile(true);
        } else {
          setProfile(null);
          setHasProfile(false);
        }
      } catch (error) {
        console.warn('[Profile] Load failed');
        setProfile(null);
        setHasProfile(false);
      } finally {
        setIsLoading(false);
      }
    };

    loadProfile();
  }, [user]);

  const createProfile = async (profileData: {
    name: string;
    username: string;
    email: string;
    phone?: string;
    college: string;
    career: string;
    primaryStream?: string;
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
  }) => {
    if (!user) throw new Error('User not authenticated');

    // Check username availability
    const isAvailable = await firebaseStudentService.checkUsernameAvailability(profileData.username);
    if (!isAvailable) {
      throw new Error('Username is already taken. Please choose a different username.');
    }

    try {
      const profileId = await firebaseStudentService.createStudentProfile({
        userId: user.id,
        name: profileData.name,
        username: profileData.username,
        email: profileData.email,
        phone: profileData.phone,
        college: profileData.college,
        career: profileData.career,
        primaryStream: profileData.primaryStream,
        subStreams: profileData.subStreams,
        specialties: profileData.specialties,
        skills: profileData.skills,
        currentCourse: profileData.currentCourse,
        interests: profileData.interests,
        passions: profileData.passions,
        studentLifeActivities: profileData.studentLifeActivities,
        openToCrossStreamCollab: profileData.openToCrossStreamCollab,
        preferredCollabTypes: profileData.preferredCollabTypes,
        bio: profileData.bio,
        avatarUrl: profileData.avatarUrl,
        isAvailableForCollab: profileData.isAvailableForCollab ?? true
      });

      const newProfile = await firebaseStudentService.getStudentProfile(user.id);
      setProfile(newProfile);
      setHasProfile(true);
      
      return profileId;
    } catch (error) {
      console.warn('[Profile] Create failed');
      throw error;
    }
  };

  const updateProfile = async (updates: Partial<FirebaseStudentProfile>) => {
    if (!user || !profile) throw new Error('User not authenticated or no profile exists');

    // Check username availability if username is being updated
    if (updates.username && updates.username !== profile.username) {
      const isAvailable = await firebaseStudentService.checkUsernameAvailability(updates.username, user.id);
      if (!isAvailable) {
        throw new Error('Username is already taken. Please choose a different username.');
      }
    }

    try {
      await firebaseStudentService.updateStudentProfile(profile.id, updates);
      
      const updatedProfile = await firebaseStudentService.getStudentProfile(user.id);
      setProfile(updatedProfile);
    } catch (error) {
      console.warn('[Profile] Update failed');
      throw error;
    }
  };

  return {
    profile,
    hasProfile,
    isLoading,
    createProfile,
    updateProfile
  };
}