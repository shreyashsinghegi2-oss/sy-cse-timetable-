import { useLocation } from 'wouter';
import { useCollabStudentProfile } from '@/hooks/use-collab-student-profile';
import { useEffect } from 'react';
import { StepProfileBuilder } from '@/components/collab/step-profile-builder';
import { Button } from '@/components/ui/button';
import { useQueryClient } from '@tanstack/react-query';

export default function CollabStudentProfileBuilder() {
  const [, setLocation] = useLocation();
  const { profile, isLoading, error } = useCollabStudentProfile();
  const queryClient = useQueryClient();

  // Redirect to profile page if profile already exists
  useEffect(() => {
    if (profile) {
      setLocation('/collab-profile');
    }
  }, [profile, setLocation]);

  if (isLoading || profile) {
    return <div role="status" className="p-8 text-center">Loading your profile…</div>;
  }
  if (error) {
    return <div role="alert" className="mx-auto max-w-lg p-8 text-center space-y-4">
      <h1 className="text-xl font-semibold">We couldn’t check your profile</h1>
      <p>Your profile has not been deleted. Please retry before creating another one.</p>
      <Button onClick={() => queryClient.resetQueries({ queryKey: ['/api/collab/student-profile'] })}>Retry</Button>
    </div>;
  }
  return <StepProfileBuilder />;
}
