import { useCollabProfile } from "@/hooks/use-collab-profile";
import { CollabProfileSkeleton } from "@/components/ui/skeletons";
import { useCollabAuth } from "@/hooks/use-collab-auth";
import { useConnections } from "@/hooks/use-connections";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MultiRoleProfileView } from "@/components/collab/multi-role-profile-view";
import { 
  MapPin, 
  Briefcase, 
  GraduationCap, 
  Mail, 
  Phone,
  Edit,
  Heart,
  Target,
  Users,
  Sparkles,
  MessageCircle,
  LogOut
} from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";
import { ProfileBuilder } from "@/components/collab/profile-builder";
import { MultiProfileBuilder } from "@/components/collab/multi-profile-builder";
import { UserPosts } from "@/components/collab/user-posts";
import { collabFetch } from "@/lib/firebase";

export default function CollabNewProfileView() {
  const { profile, isLoading, error: profileError } = useCollabProfile();
  const queryClient = useQueryClient();
  const { user, logout } = useCollabAuth();
  const [showEditDialog, setShowEditDialog] = useState(false);
  
  // Determine profile role (default to Student for backward compatibility)
  const profileRole = profile?.role || 'Student';
  const isStudentProfile = profileRole === 'Student';
  
  // Fetch connections for current user
  const { data: connectionsData } = useConnections(user?.uid);
  const connections = (connectionsData as any)?.connections || [];

  // Check connection status with this profile user
  const { data: connectionStatus } = useQuery<{ status: string }>({
    queryKey: ['/api/collab/connections/status', profile?.uid],
    enabled: !!profile?.uid && !!user?.uid && profile.uid !== user.uid,
    queryFn: async () => {
      const response = await collabFetch(`/api/collab/connections/status/${profile?.uid}`);
      if (!response.ok) {
        throw new Error(`Failed to load connection status (${response.status})`);
      }
      return response.json();
    },
  });

  const isConnected = connectionStatus?.status === 'connected';

  if (isLoading) {
    return <CollabProfileSkeleton />;
  }

  if (profileError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full shadow-xl">
          <CardContent className="pt-6 text-center">
            <h2 className="text-2xl font-bold mb-2">Unable to load your profile</h2>
            <p className="text-gray-600 mb-4">
              Something went wrong while loading your profile. Please try again.
            </p>
            <Button
              onClick={() => queryClient.refetchQueries({ queryKey: ["/api/collab/student-profile"] })}
              data-testid="button-retry-profile"
            >
              Try again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header with Sign Out button */}
        <div className="bg-white border-b sticky top-0 z-20 shadow-sm">
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
            <Button variant="outline" size="sm" asChild className="border-gray-300 hover:bg-gray-100 text-gray-700 font-medium">
              <Link href="/student-collab">
                ← Back to Feed
              </Link>
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={logout}
              data-testid="button-signout-no-profile"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* No Profile Card */}
        <div className="flex items-center justify-center p-4 mt-8">
          <Card className="max-w-md w-full shadow-xl">
            <CardContent className="pt-6 text-center">
              <div className="h-16 w-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8" />
              </div>
              <h2 className="text-2xl font-bold mb-2">No Profile Found</h2>
              <p className="text-gray-600 mb-4">
                You haven't created your student profile yet.
              </p>
              <Button asChild data-testid="button-build-profile">
                <Link href="/collab-student-profile-builder">Build Profile</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };
  
  // Get display name based on profile type
  const getDisplayName = () => {
    if (!profile) return '';
    if (isStudentProfile && 'name' in profile) return profile.name;
    if (profileRole === 'Club' && 'clubName' in profile) return profile.clubName;
    if (profileRole === 'Community' && 'communityName' in profile) return profile.communityName;
    if (profileRole === 'Company' && 'companyName' in profile) return profile.companyName;
    return '';
  };
  
  const displayName = getDisplayName();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with back button */}
      <div className="bg-white border-b sticky top-0 z-20 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-4">
          <Button variant="outline" size="sm" asChild className="border-gray-300 hover:bg-gray-100 text-gray-700 font-medium">
            <Link href="/student-collab">
              ← Back to Feed
            </Link>
          </Button>
        </div>
      </div>
      
      {/* Hero Section with Profile Header */}
      <div className="bg-blue-600 text-white pt-20 pb-32 relative">
        {/* Sign Out Button - Mobile & Desktop (Top Right) */}
        {user?.uid === profile.uid && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              logout();
              window.location.href = '/collab';
            }}
            className="absolute top-4 right-4 text-white hover:bg-white/20"
            data-testid="button-signout"
          >
            <LogOut className="h-5 w-5" />
          </Button>
        )}
        
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
            {/* Avatar */}
            <Avatar className="h-32 w-32 md:h-40 md:w-40 ring-4 ring-white/30 shadow-2xl">
              <AvatarImage src={profile.avatarUrl} />
              <AvatarFallback className="bg-white text-blue-600 text-4xl">
                {getInitials(displayName)}
              </AvatarFallback>
            </Avatar>

            {/* Profile Info */}
            <div className="flex-1 text-center md:text-left">
              <h1 className="text-3xl md:text-4xl font-bold mb-2" data-testid="text-profile-name">
                {displayName}
              </h1>
              {isStudentProfile && 'username' in profile ? (
                <p className="text-xl text-blue-100 mb-4">@{profile.username}</p>
              ) : (
                <Badge className="mb-4" variant="secondary">{profileRole}</Badge>
              )}
              {isStudentProfile && 'bio' in profile && profile.bio && (
                <p className="text-white/90 max-w-2xl mb-4" data-testid="text-profile-bio">
                  {profile.bio}
                </p>
              )}
              
              {/* Quick Info - Student only */}
              {isStudentProfile && 'college' in profile && (
                <div className="flex flex-wrap gap-4 justify-center md:justify-start text-sm">
                  {profile.college && (
                    <div className="flex items-center gap-2">
                      <GraduationCap className="h-4 w-4" />
                      <span>{profile.college}</span>
                    </div>
                  )}
                  {'currentCourse' in profile && 'career' in profile && (
                    <div className="flex items-center gap-2">
                      <Briefcase className="h-4 w-4" />
                      <span>{profile.currentCourse} - {profile.career}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              {/* Edit Button (only for own profile) */}
              {user?.uid === profile.uid && (
                <Button 
                  onClick={() => setShowEditDialog(true)} 
                  variant="secondary"
                  className="gap-2 shadow-lg"
                  data-testid="button-edit-profile"
                >
                  <Edit className="h-4 w-4" /> Edit Profile
                </Button>
              )}

              {/* Message Button (only for connected users) */}
              {user?.uid !== profile.uid && isConnected && (
                <Button 
                  onClick={() => window.location.href = `/collab-messages?uid=${profile.uid}`}
                  className="gap-2 shadow-lg bg-white text-blue-600 hover:bg-blue-50"
                  data-testid="button-message-user"
                >
                  <MessageCircle className="h-4 w-4" /> Message
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Added pb-24 for mobile navigation spacing */}
      <div className="max-w-6xl mx-auto px-4 -mt-20 pb-24">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left Column - Contact & Connections */}
          <div className="space-y-6">
            {/* Contact Card */}
            <Card className="shadow-xl">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100">
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5 text-blue-600" />
                  Contact Info
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-3">
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="font-medium break-all">{profile.email}</p>
                </div>
                {isStudentProfile && 'phone' in profile && profile.phone && (
                  <div>
                    <p className="text-sm text-gray-500">Phone</p>
                    <p className="font-medium">{profile.phone}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Connections Card */}
            <Card className="shadow-xl">
              <CardHeader className="bg-blue-50">
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-600" />
                  Connections
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="text-center">
                  <p className="text-4xl font-bold text-blue-600">{connections.length}</p>
                  <p className="text-sm text-gray-500 mt-1">Connected Students</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Academic & Portfolio */}
          <div className="md:col-span-2 space-y-6">
            {isStudentProfile ? (
              <>
            {/* Academic Details Card */}
            {'currentCourse' in profile && (
              <Card className="shadow-xl">
                <CardHeader className="bg-gradient-to-r from-green-50 to-green-100">
                  <CardTitle className="flex items-center gap-2">
                    <GraduationCap className="h-5 w-5 text-green-600" />
                    Academic Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Course</p>
                    <p className="font-semibold text-lg">{profile.currentCourse}</p>
                  </div>
                  {'career' in profile && (
                    <div>
                      <p className="text-sm text-gray-500">Year</p>
                      <p className="font-semibold text-lg">{profile.career}</p>
                    </div>
                  )}
                  {'primaryStream' in profile && profile.primaryStream && (
                    <div className="md:col-span-2">
                      <p className="text-sm text-gray-500 mb-2">Academic Stream</p>
                      <Badge className="bg-green-600 hover:bg-green-700 text-white text-base px-3 py-1">
                        {profile.primaryStream}
                      </Badge>
                    </div>
                  )}
                  {'subStreams' in profile && profile.subStreams && profile.subStreams.length > 0 && (
                    <div className="md:col-span-2">
                      <p className="text-sm text-gray-500 mb-2">Specializations</p>
                      <div className="flex flex-wrap gap-2">
                        {profile.subStreams.map((stream: string, i: number) => (
                          <Badge key={i} variant="outline" className="border-green-200 text-green-700">
                            {stream}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Skills Card */}
            {'skills' in profile && profile.skills && profile.skills.length > 0 && (
              <Card className="shadow-xl">
                <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100">
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-blue-600" />
                    Skills
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="flex flex-wrap gap-2">
                    {profile.skills.map((skill: string, i: number) => (
                      <Badge key={i} className="bg-blue-600 hover:bg-blue-700 text-white">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Interests Card */}
            {'interests' in profile && profile.interests && profile.interests.length > 0 && (
              <Card className="shadow-xl">
                <CardHeader className="bg-blue-50">
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-blue-600" />
                    Interests
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="flex flex-wrap gap-2">
                    {profile.interests.map((interest: string, i: number) => (
                      <Badge key={i} className="bg-blue-600 hover:bg-blue-700 text-white">
                        {interest}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Passions Card */}
            {'passions' in profile && profile.passions && profile.passions.length > 0 && (
              <Card className="shadow-xl">
                <CardHeader className="bg-gradient-to-r from-pink-50 to-pink-100">
                  <CardTitle className="flex items-center gap-2">
                    <Heart className="h-5 w-5 text-pink-600" />
                    Passions
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="flex flex-wrap gap-2">
                    {profile.passions.map((passion: string, i: number) => (
                      <Badge key={i} className="bg-pink-600 hover:bg-pink-700 text-white">
                        {passion}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
              </>
            ) : (
              <MultiRoleProfileView profile={profile as any} />
            )}
          </div>
        </div>

        {/* Posts Section */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold mb-6 text-gray-800">
            {user?.uid === profile.uid ? 'Your Posts' : `${displayName}'s Posts`}
          </h2>
          <UserPosts userUid={profile.uid} userName={displayName} />
        </div>
      </div>

      {/* Edit Profile Dialog - Conditional based on role */}
      {isStudentProfile ? (
        <ProfileBuilder
          open={showEditDialog}
          onOpenChange={setShowEditDialog}
          mode="edit"
        />
      ) : (
        <MultiProfileBuilder
          open={showEditDialog}
          onOpenChange={setShowEditDialog}
          initialRole={profileRole}
          existingProfile={profile}
        />
      )}
    </div>
  );
}
