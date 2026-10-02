import { useCollabAuth } from "@/hooks/use-collab-auth";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import { useLocation } from "wouter";

interface CollabAuthGateProps {
  children: React.ReactNode;
  requireAuth?: boolean;
}

export function CollabAuthGate({ children, requireAuth = false }: CollabAuthGateProps) {
  const { status, isAuthenticated } = useCollabAuth();
  const [, setLocation] = useLocation();

  // Handle redirect for pages that require auth
  useEffect(() => {
    if (requireAuth && status === 'unauthenticated') {
      setLocation('/student-collab');
    }
  }, [requireAuth, status, setLocation]);

  // Show loading spinner while auth state is being determined
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // If requireAuth is set and user is not authenticated, show loading while redirect happens
  if (requireAuth && !isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Redirecting...</p>
        </div>
      </div>
    );
  }

  // Auth state is determined, render children
  return <>{children}</>;
}

export function CollabLoadingScreen() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
        <p className="text-gray-600">Loading...</p>
      </div>
    </div>
  );
}
