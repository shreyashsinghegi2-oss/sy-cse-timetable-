import { useState, useEffect } from "react";
import { useCollabProfile } from "@/hooks/use-collab-profile";
import { useCollabAuth } from "@/hooks/use-collab-auth";
import { useConnections } from "@/hooks/use-connections";
import { useQuery } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ProfileBuilder } from "@/components/collab/profile-builder";
import { MultiProfileBuilder } from "@/components/collab/multi-profile-builder";
import { MultiRoleProfileView } from "@/components/collab/multi-role-profile-view";
import { StreamBadge } from "@/components/collab/stream-badge";
import { UserPosts } from "@/components/collab/user-posts";
import { ConnectionButton } from "@/components/collab/connection-button";
import { 
  MapPin, 
  Briefcase, 
  GraduationCap, 
  Mail, 
  Phone,
  Edit,
  CheckCircle,
  User,
  Heart,
  Target,
  Users,
  BookOpen,
  Sparkles,
  FileText,
  UsersRound,
  LogOut,
  Bookmark,
  Loader2
} from "lucide-react";
import { Link } from "wouter";
import { collabFetch } from "@/lib/firebase";

export default function CollabProfilePage() {
  const { profile, isLoading, error: profileError } = useCollabProfile();
  const queryClient = useQueryClient();
  const { user, logout } = useCollabAuth();
  const [showEditDialog, setShowEditDialog] = useState(false);
  
  // Fetch connections for current user
  const { data: connectionsData } = useConnections(user?.uid);
  const connections = (connectionsData as any)?.connections || [];
  
  // Fetch saved posts for current user
  const { data: savedPostsData, isLoading: isSavedPostsLoading } = useQuery({
    queryKey: ['/api/collab/social/saved-posts/full'],
    queryFn: async () => {
      const response = await collabFetch('/api/collab/social/saved-posts/full');
      if (!response.ok) throw new Error('Failed to fetch saved posts');
      return response.json();
    },
    enabled: !!user,
  });
  const savedPosts = savedPostsData || [];
  
  // Determine profile role (default to Student for backward compatibility)
  const profileRole = profile?.role || 'Student';
  const isStudentProfile = profileRole === 'Student';

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (profileError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
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
        <div className="bg-white border-b sticky top-0 z-10 shadow-sm">
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
          <Card className="max-w-md w-full">
            <CardContent className="pt-6 text-center">
              <User className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">No Profile Found</h2>
              <p className="text-gray-600 mb-4">
                You haven't created your student profile yet.
              </p>
              <Button asChild data-testid="button-build-profile">
                <Link href="/collab-org-selector">Build Profile</Link>
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
      <div className="bg-white border-b sticky top-0 z-10 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <Button variant="outline" size="sm" asChild className="border-gray-300 hover:bg-gray-100 text-gray-700 font-medium">
            <Link href="/student-collab">
              ← Back to Feed
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              logout();
              window.location.href = '/collab';
            }}
            className="hidden sm:flex text-gray-600 hover:text-red-600"
            data-testid="button-signout-desktop"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </div>

      {/* Main Content - Added pb-24 for mobile navigation spacing */}
      <div className="max-w-5xl mx-auto px-4 py-6 pb-24">
        {/* Hero Profile Card */}
        <div className="profile-card mb-6">
          {/* Hero Banner with Gradient */}
          <div className="profile-hero-banner h-32 md:h-44 relative">
            {/* Edit Button - Top Right */}
            <button
              onClick={() => setShowEditDialog(true)}
              className="absolute top-4 right-4 z-20 p-2 bg-white/90 hover:bg-white rounded-full shadow-md transition-all"
              data-testid="button-edit-profile"
            >
              <Edit className="h-4 w-4 text-gray-700" />
            </button>
          </div>

          {/* Profile Info Section */}
          <div className="px-4 md:px-6 pb-6">
            {/* Avatar - Overlapping banner */}
            <div className="profile-avatar-wrapper -mt-16 md:-mt-20 mb-4">
              {profile.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt={displayName}
                  className="profile-avatar w-28 h-28 md:w-36 md:h-36 rounded-full object-cover bg-white"
                />
              ) : (
                <div className="profile-avatar w-28 h-28 md:w-36 md:h-36 rounded-full bg-blue-600 flex items-center justify-center text-white text-3xl md:text-4xl font-bold">
                  {getInitials(displayName)}
                </div>
              )}
            </div>

            {/* Name and Role */}
            <div className="mb-4">
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 leading-tight">
                {displayName}
              </h1>
              {isStudentProfile && 'username' in profile ? (
                <p className="text-gray-500 mt-1">
                  @{profile.username && !profile.username.includes('.') ? profile.username : user?.username || profile.username}
                </p>
              ) : (
                <Badge className="mt-2 bg-indigo-100 text-indigo-700 hover:bg-indigo-100">{profileRole}</Badge>
              )}
            </div>

            {/* Bio - Student only */}
            {isStudentProfile && 'bio' in profile && profile.bio && (
              <p className="text-gray-600 text-sm leading-relaxed mb-4 max-w-2xl">{profile.bio}</p>
            )}

            {/* Quick Info Row */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-4">
              {isStudentProfile && 'college' in profile && profile.college && (
                <div className="flex items-center gap-1.5">
                  <GraduationCap className="h-4 w-4 text-gray-400" />
                  <span>{profile.college}</span>
                </div>
              )}
              {'career' in profile && 'currentCourse' in profile && (
                <div className="flex items-center gap-1.5">
                  <Briefcase className="h-4 w-4 text-gray-400" />
                  <span>{profile.career} • {profile.currentCourse}</span>
                </div>
              )}
              {isStudentProfile && 'isAvailableForCollab' in profile && profile.isAvailableForCollab && (
                <Badge className="bg-green-50 text-green-600 hover:bg-green-50 text-xs">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Available
                </Badge>
              )}
            </div>

            {/* Contact Info */}
            {isStudentProfile && (
              <div className="flex flex-wrap gap-4 text-sm">
                <a href={`mailto:${profile.email}`} className="flex items-center gap-1.5 text-indigo-600 hover:text-indigo-700">
                  <Mail className="h-4 w-4" />
                  <span>{profile.email}</span>
                </a>
                {'phone' in profile && profile.phone && (
                  <a href={`tel:${profile.phone}`} className="flex items-center gap-1.5 text-indigo-600 hover:text-indigo-700">
                    <Phone className="h-4 w-4" />
                    <span>{profile.phone}</span>
                  </a>
                )}
              </div>
            )}

            {/* Mobile Sign Out */}
            <Button
              variant="outline"
              onClick={() => {
                logout();
                window.location.href = '/collab';
              }}
              className="w-full mt-4 sm:hidden text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
              data-testid="button-signout-mobile"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>

        {/* Two Column Grid Layout */}
        <div className="profile-grid">
          {/* Left Column - Connections & Saved */}
          <div className="space-y-4">
            {/* Connections Card */}
            <div className="profile-card">
              <div className="profile-card-content">
                <h3 className="profile-section-title">
                  <UsersRound />
                  Connections
                  {connections.length > 0 && (
                    <span className="ml-auto text-sm font-normal text-gray-500">{connections.length}</span>
                  )}
                </h3>
                {connections.length > 0 ? (
                  <div className="grid grid-cols-4 gap-3">
                    {connections.slice(0, 8).map((connection: any) => (
                      <Link 
                        key={connection.uid} 
                        href={`/collab-profile/${connection.uid}`}
                        className="flex flex-col items-center gap-1.5 hover:opacity-80 transition-opacity"
                      >
                        <Avatar className="h-12 w-12 ring-2 ring-indigo-100">
                          <AvatarImage src={connection.avatarUrl} alt={connection.name} />
                          <AvatarFallback className="bg-blue-600 text-white text-xs font-semibold">
                            {connection.name?.substring(0, 2).toUpperCase() || '??'}
                          </AvatarFallback>
                        </Avatar>
                        <p className="text-xs text-gray-700 truncate w-full text-center">{connection.name?.split(' ')[0]}</p>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm text-center py-4">No connections yet</p>
                )}
              </div>
            </div>

            {/* Saved Posts Card */}
            <div className="profile-card">
              <div className="profile-card-content">
                <h3 className="profile-section-title">
                  <Bookmark />
                  Saved Posts
                  {savedPosts.length > 0 && (
                    <span className="ml-auto text-sm font-normal text-gray-500">{savedPosts.length}</span>
                  )}
                </h3>
                {isSavedPostsLoading ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="h-5 w-5 animate-spin text-indigo-600" />
                  </div>
                ) : savedPosts.length > 0 ? (
                  <div className="space-y-2">
                    {savedPosts.slice(0, 4).map((post: any) => (
                      <Link 
                        key={post.id} 
                        href={`/collab`}
                        className="block p-2.5 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex items-center gap-2.5">
                          <Avatar className="h-8 w-8 flex-shrink-0">
                            {post.profile?.avatarUrl && (
                              <AvatarImage src={post.profile.avatarUrl} alt={post.profile?.name || 'User'} />
                            )}
                            <AvatarFallback className="bg-blue-600 text-white text-xs font-semibold">
                              {(post.profile?.name || 'U').charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-gray-900 truncate">{post.profile?.name || 'User'}</p>
                            <p className="text-xs text-gray-500 truncate">{post.description?.substring(0, 40)}...</p>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm text-center py-4">No saved posts</p>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - About & Details */}
          <div className="space-y-4">

        {/* Student-specific sections */}
        {isStudentProfile && (
          <>
            {/* Academic Stream Section */}
            {'primaryStream' in profile && profile.primaryStream && (
              <div className="profile-card">
                <div className="profile-card-content">
                  <h3 className="profile-section-title">
                    <BookOpen />
                    Academic Stream
                  </h3>
                  
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">Primary Stream</p>
                      <StreamBadge 
                        stream={profile.primaryStream as typeof import("@shared/schema").STREAMS[number]} 
                        testId="primary-stream-badge"
                      />
                    </div>

                    {profile.subStreams && profile.subStreams.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">Additional Streams</p>
                        <div className="flex flex-wrap gap-1.5">
                          {profile.subStreams.map((stream: string, index: number) => (
                            <Badge key={index} variant="outline" className="text-xs" data-testid={`substream-badge-${index}`}>
                              {stream}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {profile.specialties && profile.specialties.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">Specialties</p>
                        <div className="flex flex-wrap gap-1.5">
                          {profile.specialties.map((specialty: string, index: number) => (
                            <Badge key={index} variant="outline" className="bg-indigo-50 text-indigo-600 border-indigo-200 text-xs" data-testid={`specialty-badge-${index}`}>
                              {specialty}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {profile.openToCrossStreamCollab && (
                      <Badge variant="outline" className="bg-green-50 text-green-600 border-green-200 text-xs" data-testid="crossstream-indicator">
                        <Sparkles className="h-3 w-3 mr-1" />
                        Open to Cross-Stream Collaboration
                      </Badge>
                    )}

                    {profile.preferredCollabTypes && profile.preferredCollabTypes.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">Collaboration Types</p>
                        <div className="flex flex-wrap gap-1.5">
                          {profile.preferredCollabTypes.map((type: string, index: number) => (
                            <Badge key={index} className="bg-blue-50 text-blue-600 hover:bg-blue-100 text-xs" data-testid={`collabtype-badge-${index}`}>
                              {type}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Skills Section */}
            {'skills' in profile && profile.skills && profile.skills.length > 0 && (
              <div className="profile-card">
                <div className="profile-card-content">
                  <h3 className="profile-section-title">
                    <Target />
                    Skills
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {profile.skills.map((skill: string, index: number) => (
                      <Badge key={index} variant="secondary" className="text-xs">{skill}</Badge>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Interests Section */}
            {'interests' in profile && profile.interests && profile.interests.length > 0 && (
              <div className="profile-card">
                <div className="profile-card-content">
                  <h3 className="profile-section-title">
                    <Heart />
                    Interests
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {profile.interests.map((interest: string, index: number) => (
                      <Badge key={index} variant="outline" className="text-xs">{interest}</Badge>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Passions Section */}
            {'passions' in profile && profile.passions && profile.passions.length > 0 && (
              <div className="profile-card">
                <div className="profile-card-content">
                  <h3 className="profile-section-title">
                    <Heart className="text-pink-500" />
                    Passions & Hobbies
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {profile.passions.map((passion: string, index: number) => (
                      <Badge key={index} className="bg-pink-50 text-pink-600 hover:bg-pink-100 text-xs">{passion}</Badge>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Student Life Activities Section */}
            {'studentLifeActivities' in profile && profile.studentLifeActivities && profile.studentLifeActivities.length > 0 && (
              <div className="profile-card">
                <div className="profile-card-content">
                  <h3 className="profile-section-title">
                    <Users />
                    Student Life
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {profile.studentLifeActivities.map((activity, index) => (
                      <Badge key={index} className="bg-blue-50 text-blue-600 hover:bg-blue-100 text-xs">{activity}</Badge>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Non-Student profiles: Club, Community, Company */}
        {!isStudentProfile && (
          <MultiRoleProfileView profile={profile as any} />
        )}

        {/* Posts Section - All profile types */}
        <div className="profile-card">
          <div className="profile-card-content">
            <h3 className="profile-section-title">
              <FileText />
              Posts
            </h3>
            <UserPosts 
              userUid={profile.uid || ''} 
              userName={displayName} 
            />
          </div>
        </div>
          </div>
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
