import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, useLocation, useSearch } from "wouter";
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { StreamBadge } from "@/components/collab/stream-badge";
import { ConnectionButton } from "@/components/collab/connection-button";
import { MultiRoleProfileView } from "@/components/collab/multi-role-profile-view";
import { useCollabAuth } from "@/hooks/use-collab-auth";
import { useToast } from "@/hooks/use-toast";
import { useConnectionStatus, useConnections, useMutualConnections } from "@/hooks/use-connections";
import { MessageCircle, UserPlus, UsersRound } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { collabFetch } from "@/lib/firebase";
import { 
  MapPin, 
  Briefcase, 
  GraduationCap, 
  Mail, 
  Phone,
  CheckCircle,
  User,
  Heart,
  Target,
  Users,
  BookOpen,
  Sparkles,
  FileText,
  Calendar,
  Clock,
  ExternalLink,
  Edit
} from "lucide-react";
import { Link } from "wouter";

// Base profile interface with common fields
interface BaseProfile {
  uid: string;
  role: 'Student' | 'Club' | 'Community' | 'Company';
  email: string;
  avatarUrl?: string;
}

interface StudentProfile extends BaseProfile {
  role: 'Student';
  name: string;
  username: string;
  phoneNumber?: string;
  bio?: string;
  college?: string;
  course?: string;
  yearOfStudy?: string;
  interests?: string[];
  skills?: string[];
  primaryStream?: string;
  subStreams?: string[];
  specialties?: string[];
  openToCrossStreamCollab?: boolean;
  preferredCollabTypes?: string[];
  passions?: string[];
  studentLifeActivities?: string[];
}

interface ClubProfile extends BaseProfile {
  role: 'Club';
  clubName: string;
  category: string;
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

interface CommunityProfile extends BaseProfile {
  role: 'Community';
  communityName: string;
  missionVision: string;
  category: string;
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

interface CompanyProfile extends BaseProfile {
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

type Profile = StudentProfile | ClubProfile | CommunityProfile | CompanyProfile;

export default function CollabUserProfilePage() {
  const [, params] = useRoute("/collab-profile/:uid");
  const uid = params?.uid;
  const [, setLocation] = useLocation();
  const search = useSearch();
  const postId = new URLSearchParams(search).get('post');
  const postRef = useRef<HTMLDivElement>(null);
  const { user } = useCollabAuth();
  const { toast } = useToast();

  const { data: profile, isLoading, error } = useQuery<Profile>({
    queryKey: [`/api/collab/social/profiles/${uid}`],
    enabled: !!uid,
    queryFn: async () => {
      const response = await collabFetch(`/api/collab/social/profiles/${uid}`);
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || error.error || `Failed to fetch profile (HTTP ${response.status})`);
      }
      return response.json();
    },
  });

  // Use new connection hooks
  const { status: connectionStatus, connectionCount } = useConnectionStatus(uid);
  const { data: connectionsData } = useConnections(uid);
  const { data: mutualData } = useMutualConnections(uid);
  
  const connections = (connectionsData as any)?.connections || [];
  const mutualConnections = (mutualData as any)?.mutualConnections || [];

  // Fetch specific post when postId is provided
  const { data: highlightedPost, isLoading: postLoading, error: postError } = useQuery({
    queryKey: ['/api/collab/social/posts', postId],
    enabled: !!postId,
    queryFn: async () => {
      const response = await collabFetch(`/api/collab/social/posts/${postId}`);
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || error.error || `Failed to fetch post (HTTP ${response.status})`);
      }
      return response.json();
    },
  });

  // Scroll to highlighted post when it loads
  useEffect(() => {
    if (highlightedPost && postRef.current) {
      setTimeout(() => {
        postRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300);
    }
  }, [highlightedPost]);

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

  if (error || !profile) {
    // Check if error is auth-related
    const errorMessage = error instanceof Error ? error.message : '';
    const isAuthError = errorMessage.includes('AUTH_SILENT_FAIL') ||
      errorMessage.includes('401') ||
      errorMessage.includes('Not authenticated');
    
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <User className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">
              {isAuthError ? 'Please Sign In' : 'Profile Not Found'}
            </h2>
            <p className="text-gray-600 mb-4">
              {isAuthError 
                ? 'Please sign in to view this profile.'
                : 'The profile you\'re looking for doesn\'t exist or hasn\'t been created yet.'}
            </p>
            <Button asChild>
              <Link href="/student-collab">Go to Student Collab</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Get display name based on profile type
  const getDisplayName = (profile: Profile): string => {
    // Handle undefined role by checking which name field exists
    if (!profile.role) {
      // Check for role-specific name fields
      if ((profile as any).clubName) return (profile as any).clubName;
      if ((profile as any).communityName) return (profile as any).communityName;
      if ((profile as any).companyName) return (profile as any).companyName;
      if ((profile as any).name) return (profile as any).name;
      return 'Unknown User';
    }
    
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
        return 'Unknown';
    }
  };

  // Get username for Student profiles only
  const getUsername = (profile: Profile): string | null => {
    // Handle undefined role - check if username field exists
    if (!profile.role && (profile as any).username) {
      return (profile as any).username;
    }
    return profile.role === 'Student' ? profile.username : null;
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const displayName = getDisplayName(profile);
  const username = getUsername(profile);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with back button */}
      <div className="bg-white border-b sticky top-0 z-10 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-4">
          <Button variant="outline" size="sm" asChild className="border-gray-300 hover:bg-gray-100 text-gray-700 font-medium">
            <Link href="/student-collab">
              ← Back to Feed
            </Link>
          </Button>
        </div>
      </div>

      {/* Main Content - Added pb-24 for mobile navigation spacing */}
      <div className="max-w-5xl mx-auto px-4 py-6 pb-24">
        {/* Hero Profile Card */}
        <div className="profile-card mb-6">
          {/* Hero Banner with Gradient */}
          <div className="profile-hero-banner h-32 md:h-44 relative">
            {/* Edit Profile Button - Only show when viewing own profile */}
            {user?.uid === uid && (
              <Button 
                asChild
                variant="secondary"
                size="sm"
                className="absolute top-4 right-4 z-20 bg-white/90 hover:bg-white shadow-md"
                data-testid="button-edit-profile"
              >
                <Link href="/collab-profile">
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Profile
                </Link>
              </Button>
            )}
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
              {username ? (
                <p className="text-gray-500 mt-1">@{username}</p>
              ) : profile.role ? (
                <Badge className="mt-2 bg-indigo-100 text-indigo-700 hover:bg-indigo-100">{profile.role}</Badge>
              ) : null}
            </div>

            {/* Connection Button & Stats */}
            <div className="flex flex-wrap items-center gap-3">
              {user?.uid && user.uid !== uid && (
                <ConnectionButton 
                  targetUid={uid || ''} 
                  targetName={displayName}
                  showMessage={true}
                />
              )}
              <div className="profile-connection-stats">
                <UsersRound className="h-4 w-4" />
                <span>{connectionCount} Connection{connectionCount !== 1 ? 's' : ''}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Highlighted Post Section - Show when navigating from event sidebar */}
        {postId && (
          <div ref={postRef} className="mb-6">
            {postLoading ? (
              <Card className="border-2 border-blue-300 bg-blue-50/50">
                <CardContent className="p-6 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-3 text-blue-600">Loading post...</p>
                </CardContent>
              </Card>
            ) : postError ? (
              <Card className="border-2 border-red-300 bg-red-50">
                <CardContent className="p-6 text-center text-red-700">
                  Unable to load this post: {postError instanceof Error ? postError.message : "Please try again."}
                </CardContent>
              </Card>
            ) : highlightedPost ? (
              <Card className="border-2 border-blue-400 bg-blue-50 shadow-lg overflow-hidden">
                <div className="bg-blue-600 px-4 py-2 flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-white" />
                  <span className="text-white font-semibold text-sm">Event Post</span>
                </div>
                <CardContent className="p-4 md:p-6">
                  {/* Event Title */}
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    {highlightedPost.title || 'Untitled Event'}
                  </h3>
                  
                  {/* Event Date & Time */}
                  {(highlightedPost.eventDate || highlightedPost.eventTime) && (
                    <div className="flex flex-wrap items-center gap-4 mb-3 text-blue-700">
                      {highlightedPost.eventDate && (
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-4 w-4" />
                          <span className="text-sm font-medium">
                            {new Date(highlightedPost.eventDate + 'T00:00:00').toLocaleDateString('en-US', {
                              weekday: 'long',
                              month: 'long',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </span>
                        </div>
                      )}
                      {highlightedPost.eventTime && (
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-4 w-4" />
                          <span className="text-sm font-medium">
                            {(() => {
                              try {
                                const [hours, minutes] = highlightedPost.eventTime.split(':');
                                if (!hours || isNaN(parseInt(hours))) return highlightedPost.eventTime;
                                const date = new Date();
                                date.setHours(parseInt(hours), parseInt(minutes || '0'));
                                return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
                              } catch {
                                return highlightedPost.eventTime;
                              }
                            })()}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Event Link */}
                  {highlightedPost.eventLink && (
                    <a 
                      href={highlightedPost.eventLink} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-800 mb-3 text-sm"
                    >
                      <ExternalLink className="h-4 w-4" />
                      <span className="underline">Event Link</span>
                    </a>
                  )}
                  
                  {/* Description */}
                  {highlightedPost.description && (
                    <p className="text-gray-700 mb-4 whitespace-pre-wrap">{highlightedPost.description}</p>
                  )}
                  
                  {/* Media */}
                  {highlightedPost.mediaUrl && (
                    <div className="rounded-lg overflow-hidden mb-4" style={{ aspectRatio: '3/2' }}>
                      {highlightedPost.mediaType === 'video' ? (
                        <video 
                          src={highlightedPost.mediaUrl} 
                          controls 
                          className="w-full h-full object-contain bg-black"
                          style={{ aspectRatio: '3/2' }}
                        />
                      ) : (
                        <img 
                          src={highlightedPost.mediaUrl} 
                          alt="Event media" 
                          className="w-full h-full object-contain"
                          loading="lazy"
                          style={{ aspectRatio: '3/2' }}
                        />
                      )}
                    </div>
                  )}
                  
                  {/* Posted by */}
                  <div className="flex items-center gap-2 pt-3 border-t border-gray-100 text-sm text-gray-500">
                    <span>Posted by {displayName}</span>
                    {highlightedPost.createdAt && (
                      <>
                        <span>•</span>
                        <span>
                          {new Date(highlightedPost.createdAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric'
                          })}
                        </span>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : null}
          </div>
        )}

        {/* Two Column Grid Layout */}
        <div className="profile-grid">
          {/* Left Column - Quick Info */}
          <div className="space-y-4">
            {/* Contact Info Card */}
            {(profile.role === 'Student' || (!profile.role && (profile as any).username)) && (profile.email || profile.phoneNumber || profile.college) && (
              <div className="profile-card">
                <div className="profile-card-content">
                  <h3 className="profile-section-title">
                    <Mail />
                    Contact
                  </h3>
                  <div className="space-y-2">
                    {profile.email && (
                      <div className="profile-contact-item">
                        <Mail />
                        <span className="text-sm">{profile.email}</span>
                      </div>
                    )}
                    {profile.phoneNumber && (
                      <div className="profile-contact-item">
                        <Phone />
                        <span className="text-sm">{profile.phoneNumber}</span>
                      </div>
                    )}
                    {profile.college && (
                      <div className="profile-contact-item">
                        <GraduationCap />
                        <span className="text-sm">{profile.college}</span>
                      </div>
                    )}
                    {profile.course && (
                      <div className="profile-contact-item">
                        <Briefcase />
                        <span className="text-sm">{profile.course} {profile.yearOfStudy && `• ${profile.yearOfStudy}`}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Connections Card */}
            {connections.length > 0 && (
              <div className="profile-card">
                <div className="profile-card-content">
                  <h3 className="profile-section-title">
                    <UsersRound />
                    Connections
                    <span className="ml-auto text-sm font-normal text-gray-500">{connections.length}</span>
                  </h3>
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
                </div>
              </div>
            )}

            {/* Mutual Connections */}
            {mutualConnections.length > 0 && user?.uid && user.uid !== uid && (
              <div className="profile-card">
                <div className="profile-card-content">
                  <h3 className="profile-section-title">
                    <Users />
                    Mutual
                    <span className="ml-auto text-sm font-normal text-gray-500">{mutualConnections.length}</span>
                  </h3>
                  <div className="grid grid-cols-4 gap-3">
                    {mutualConnections.slice(0, 4).map((connection: any) => (
                      <Link 
                        key={connection.uid} 
                        href={`/collab-profile/${connection.uid}`}
                        className="flex flex-col items-center gap-1.5 hover:opacity-80 transition-opacity"
                      >
                        <Avatar className="h-10 w-10 ring-2 ring-blue-100">
                          <AvatarImage src={connection.avatarUrl} alt={connection.name} />
                          <AvatarFallback className="bg-blue-600 text-white text-xs font-semibold">
                            {connection.name?.substring(0, 2).toUpperCase() || '??'}
                          </AvatarFallback>
                        </Avatar>
                        <p className="text-xs text-gray-700 truncate w-full text-center">{connection.name?.split(' ')[0]}</p>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column - About & Details */}
          <div className="space-y-4">
            {/* Profile Type Specific Content */}
            {(profile.role === 'Student' || (!profile.role && (profile as any).username)) ? (
              <>
                {/* Bio */}
                {profile.bio && (
                  <div className="profile-card">
                    <div className="profile-card-content">
                      <h3 className="profile-section-title">
                        <User />
                        About
                      </h3>
                      <p className="text-gray-700 text-sm leading-relaxed">{profile.bio}</p>
                    </div>
                  </div>
                )}

                {/* Academic Stream Information */}
                {profile.primaryStream && (
                  <div className="profile-card">
                    <div className="profile-card-content">
                      <h3 className="profile-section-title">
                        <BookOpen />
                        Academic Stream
                      </h3>
                      
                      <div className="space-y-3">
                        <div>
                          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">Primary Stream</p>
                          <StreamBadge stream={profile.primaryStream as any} />
                        </div>

                        {profile.subStreams && profile.subStreams.length > 0 && (
                          <div>
                            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">Sub-Streams</p>
                            <div className="flex flex-wrap gap-1.5">
                              {profile.subStreams.map((stream) => (
                                <StreamBadge key={stream} stream={stream as any} />
                              ))}
                            </div>
                          </div>
                        )}

                        {profile.specialties && profile.specialties.length > 0 && (
                          <div>
                            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">Specialties</p>
                            <div className="flex flex-wrap gap-1.5">
                              {profile.specialties.map((specialty, index) => (
                                <Badge key={index} variant="outline" className="text-xs">{specialty}</Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {profile.openToCrossStreamCollab && (
                          <Badge variant="outline" className="bg-green-50 text-green-600 border-green-200 text-xs">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Open to Cross-Stream Collaboration
                          </Badge>
                        )}

                        {profile.preferredCollabTypes && profile.preferredCollabTypes.length > 0 && (
                          <div>
                            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">Collaboration Types</p>
                            <div className="flex flex-wrap gap-1.5">
                              {profile.preferredCollabTypes.map((type, index) => (
                                <Badge key={index} className="bg-indigo-50 text-indigo-600 hover:bg-indigo-100 text-xs">{type}</Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Skills Section */}
                {profile.skills && profile.skills.length > 0 && (
                  <div className="profile-card">
                    <div className="profile-card-content">
                      <h3 className="profile-section-title">
                        <Target />
                        Skills
                      </h3>
                      <div className="flex flex-wrap gap-1.5">
                        {profile.skills.map((skill, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">{skill}</Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Interests Section */}
                {profile.interests && profile.interests.length > 0 && (
                  <div className="profile-card">
                    <div className="profile-card-content">
                      <h3 className="profile-section-title">
                        <Heart />
                        Interests
                      </h3>
                      <div className="flex flex-wrap gap-1.5">
                        {profile.interests.map((interest, index) => (
                          <Badge key={index} variant="outline" className="text-xs">{interest}</Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Personal Passions */}
                {profile.passions && profile.passions.length > 0 && (
                  <div className="profile-card">
                    <div className="profile-card-content">
                      <h3 className="profile-section-title">
                        <Heart className="text-pink-500" />
                        Passions
                      </h3>
                      <div className="flex flex-wrap gap-1.5">
                        {profile.passions.map((passion, index) => (
                          <Badge key={index} className="bg-pink-50 text-pink-600 hover:bg-pink-100 text-xs">{passion}</Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Student Life Activities */}
                {profile.studentLifeActivities && profile.studentLifeActivities.length > 0 && (
                  <div className="profile-card">
                    <div className="profile-card-content">
                      <h3 className="profile-section-title">
                        <Sparkles />
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
            ) : (
              /* Render Club, Community, or Company Profile */
              <MultiRoleProfileView profile={profile as any} />
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
