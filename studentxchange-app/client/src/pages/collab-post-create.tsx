import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ImageIcon, Users, ArrowLeft, CalendarDays, LogIn } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useCollabAuth } from "@/hooks/use-collab-auth";

export default function CollabPostCreate() {
  const [, setLocation] = useLocation();
  const { isAuthenticated, status } = useCollabAuth();

  // Show loading state while checking auth
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="h-8 w-8 animate-spin text-blue-600 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  // Show login prompt for unauthenticated users
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-md mx-auto text-center">
          <div className="mb-6">
            <Button
              variant="ghost"
              onClick={() => setLocation("/student-collab")}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </div>
          <Card className="p-8">
            <LogIn className="h-12 w-12 text-blue-600 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Sign In Required</h2>
            <p className="text-gray-600 mb-6">Please sign in to create posts on Student Collab</p>
            <Button onClick={() => setLocation("/student-collab")} className="w-full">
              Go to Sign In
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => setLocation("/student-collab")}
            data-testid="button-back"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Student Collab
          </Button>
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-2">Create a Post</h1>
        <p className="text-gray-600 mb-8">Choose the type of post you want to create</p>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Direct Post Card */}
          <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer border-2 hover:border-blue-500" data-testid="card-direct-post">
            <Link href="/collab-post-direct">
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                  <ImageIcon className="h-8 w-8 text-blue-600" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Direct Post</h2>
                <p className="text-gray-600 mb-4">
                  Share updates, photos, or thoughts with your network
                </p>
                <ul className="text-sm text-gray-500 space-y-1 mb-4">
                  <li>• Add photos or videos</li>
                  <li>• Get likes and comments</li>
                  <li>• Share with connections</li>
                </ul>
                <Button className="mt-auto" data-testid="button-create-direct">Create Direct Post</Button>
              </div>
            </Link>
          </Card>

          {/* Group Requirement Post Card */}
          <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer border-2 hover:border-green-500" data-testid="card-group-post">
            <Link href="/collab-post-group">
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                  <Users className="h-8 w-8 text-green-600" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Group Requirement Post</h2>
                <p className="text-gray-600 mb-4">
                  Find team members for projects or study groups
                </p>
                <ul className="text-sm text-gray-500 space-y-1 mb-4">
                  <li>• Set required members</li>
                  <li>• Students can join</li>
                  <li>• Auto-create group chat when full</li>
                </ul>
                <Button className="mt-auto bg-green-600 hover:bg-green-700" data-testid="button-create-group">Create Group Post</Button>
              </div>
            </Link>
          </Card>

          {/* Event Post Card */}
          <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer border-2 hover:border-blue-500" data-testid="card-event-post">
            <Link href="/collab-post-event">
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                  <CalendarDays className="h-8 w-8 text-blue-600" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Event Post</h2>
                <p className="text-gray-600 mb-4">
                  Announce sessions, workshops, or upcoming events
                </p>
                <ul className="text-sm text-gray-500 space-y-1 mb-4">
                  <li>• Set event date and time</li>
                  <li>• Add links and details</li>
                  <li>• Show in Upcoming Events</li>
                </ul>
                <Button className="mt-auto bg-blue-600 hover:bg-blue-700" data-testid="button-create-event">Create Event Post</Button>
              </div>
            </Link>
          </Card>
        </div>
      </div>
    </div>
  );
}
