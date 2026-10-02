import { useQuery } from "@tanstack/react-query";
import { UserProfileSkeleton } from "@/components/ui/skeletons";
import { useRoute, useLocation } from "wouter";
import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ConnectionButton } from "@/components/collab/connection-button";
import { useCollabAuth } from "@/hooks/use-collab-auth";
import {
  ArrowLeft,
  GraduationCap,
  MapPin,
  Briefcase,
  User,
  BookOpen,
  Sparkles,
  Heart,
  Image as ImageIcon,
  FileText,
} from "lucide-react";

interface Profile {
  uid: string;
  id: string;
  role?: string;
  email?: string;
  avatarUrl?: string;
  name?: string;
  username?: string;
  bio?: string;
  college?: string;
  course?: string;
  yearOfStudy?: string;
  skills?: string[];
  interests?: string[];
  passions?: string[];
  primaryStream?: string;
  subStreams?: string[];
  clubName?: string;
  communityName?: string;
  companyName?: string;
  industryType?: string;
  aboutClub?: string;
  aboutCommunity?: string;
  aboutCompany?: string;
}

interface Post {
  id: string;
  uid: string;
  text: string;
  mediaUrl?: string;
  createdAt: string;
  likeCount?: number;
  commentCount?: number;
  type?: string;
  profile?: {
    name?: string;
    username?: string;
    avatarUrl?: string;
  };
}

function getAuthToken() {
  return localStorage.getItem("collabAuthToken") || localStorage.getItem("collab_jwt") || "";
}

function getDisplayName(profile: Profile): string {
  if (profile.role === "Club") return profile.clubName || "Club";
  if (profile.role === "Community") return profile.communityName || "Community";
  if (profile.role === "Company") return profile.companyName || "Company";
  return profile.name || profile.username || "User";
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name[0]?.toUpperCase() || "U";
}

function getRoleBadgeColor(role?: string): string {
  switch (role) {
    case "Student": return "bg-blue-600";
    case "Club": return "bg-violet-600";
    case "Community": return "bg-emerald-600";
    case "Company": return "bg-orange-600";
    default: return "bg-gray-500";
  }
}

export default function UserProfilePage() {
  const [, params] = useRoute("/u/:username");
  const username = params?.username || "";
  const [, setLocation] = useLocation();
  const { user } = useCollabAuth();

  const { data: profile, isLoading, error } = useQuery<Profile>({
    queryKey: [`/api/collab/users/${username}`],
    enabled: !!username,
    queryFn: async () => {
      const res = await fetch(`/api/collab/social/users/${username}`, {
        headers: { Authorization: `Bearer ${getAuthToken()}` },
      });
      if (!res.ok) throw new Error("User not found");
      return res.json();
    },
    retry: false,
  });

  const { data: posts = [] } = useQuery<Post[]>({
    queryKey: [`/api/collab/user-posts/${profile?.uid}`],
    enabled: !!profile?.uid,
    queryFn: async () => {
      const res = await fetch(`/api/collab/social/user-posts/${profile!.uid}`, {
        headers: { Authorization: `Bearer ${getAuthToken()}` },
      });
      if (!res.ok) return [];
      return res.json();
    },
  });

  if (isLoading) {
    return <UserProfileSkeleton />;
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-sm w-full">
          <CardContent className="pt-8 pb-6 text-center">
            <User className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">User not found</h2>
            <p className="text-gray-500 text-sm mb-6">
              No account found with username <span className="font-medium">@{username}</span>
            </p>
            <Button onClick={() => setLocation("/student-collab")} className="w-full">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Feed
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const displayName = getDisplayName(profile);
  const isOwnProfile = user?.uid === profile.uid;
  const about = profile.bio || profile.aboutClub || profile.aboutCommunity || profile.aboutCompany;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => setLocation("/student-collab")}
          className="p-2 rounded-full hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-gray-700" />
        </button>
        <div>
          <h1 className="font-bold text-gray-900 text-base leading-tight">{displayName}</h1>
          {profile.username && (
            <p className="text-xs text-gray-400">@{profile.username}</p>
          )}
        </div>
      </div>

      <div className="max-w-2xl mx-auto">
        {/* Hero Banner */}
        <div
          className="h-32 w-full"
          style={{
            background:
              profile.role === "Club"
                ? "linear-gradient(135deg, #7c3aed, #4f46e5)"
                : profile.role === "Community"
                ? "linear-gradient(135deg, #059669, #0891b2)"
                : profile.role === "Company"
                ? "linear-gradient(135deg, #ea580c, #dc2626)"
                : "linear-gradient(135deg, #1d4ed8, #4f46e5)",
          }}
        />

        {/* Profile Card */}
        <div className="bg-white px-4 pb-4 border-b border-gray-100">
          <div className="flex items-end justify-between -mt-10 mb-3">
            <Avatar className="h-20 w-20 border-4 border-white shadow-md">
              {profile.avatarUrl && (
                <AvatarImage src={profile.avatarUrl} alt={displayName} />
              )}
              <AvatarFallback
                className={`${getRoleBadgeColor(profile.role)} text-white text-xl font-bold`}
              >
                {getInitials(displayName)}
              </AvatarFallback>
            </Avatar>

            <div className="mb-1 flex gap-2">
              {isOwnProfile ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setLocation("/collab-profile")}
                  className="rounded-full text-sm font-semibold"
                >
                  Edit Profile
                </Button>
              ) : (
                <ConnectionButton
                  targetUid={profile.uid}
                  targetUserId={profile.id}
                  targetName={displayName}
                  showMessage={true}
                />
              )}
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-bold text-gray-900">{displayName}</h2>
              {profile.role && (
                <Badge className={`${getRoleBadgeColor(profile.role)} text-white text-xs`}>
                  {profile.role}
                </Badge>
              )}
            </div>
            {profile.username && (
              <p className="text-gray-400 text-sm">@{profile.username}</p>
            )}

            {/* Quick Info */}
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
              {(profile.college || profile.course) && (
                <span className="flex items-center gap-1 text-sm text-gray-500">
                  <GraduationCap className="h-3.5 w-3.5" />
                  {[profile.course, profile.college].filter(Boolean).join(" · ")}
                </span>
              )}
              {profile.industryType && (
                <span className="flex items-center gap-1 text-sm text-gray-500">
                  <Briefcase className="h-3.5 w-3.5" />
                  {profile.industryType}
                </span>
              )}
              {profile.primaryStream && (
                <span className="flex items-center gap-1 text-sm text-gray-500">
                  <BookOpen className="h-3.5 w-3.5" />
                  {profile.primaryStream}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {/* About / Bio */}
          {about && (
            <Card>
              <CardContent className="pt-4">
                <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <User className="h-4 w-4 text-gray-500" />
                  About
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-line">{about}</p>
              </CardContent>
            </Card>
          )}

          {/* Skills */}
          {profile.skills && profile.skills.length > 0 && (
            <Card>
              <CardContent className="pt-4">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-yellow-500" />
                  Skills
                </h3>
                <div className="flex flex-wrap gap-2">
                  {profile.skills.slice(0, 20).map((skill) => (
                    <Badge
                      key={skill}
                      variant="secondary"
                      className="text-xs bg-blue-50 text-blue-700 border-blue-200"
                    >
                      {skill}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Interests */}
          {profile.interests && profile.interests.length > 0 && (
            <Card>
              <CardContent className="pt-4">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Heart className="h-4 w-4 text-red-400" />
                  Interests
                </h3>
                <div className="flex flex-wrap gap-2">
                  {profile.interests.slice(0, 15).map((interest) => (
                    <Badge
                      key={interest}
                      variant="secondary"
                      className="text-xs bg-pink-50 text-pink-700 border-pink-200"
                    >
                      {interest}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Streams */}
          {profile.subStreams && profile.subStreams.length > 0 && (
            <Card>
              <CardContent className="pt-4">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-emerald-500" />
                  Academic Streams
                </h3>
                <div className="flex flex-wrap gap-2">
                  {profile.subStreams.map((stream) => (
                    <Badge
                      key={stream}
                      variant="secondary"
                      className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200"
                    >
                      {stream}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Posts */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2 px-1">
              <FileText className="h-4 w-4 text-gray-500" />
              Posts
              {posts.length > 0 && (
                <span className="text-gray-400 text-sm font-normal">({posts.length})</span>
              )}
            </h3>

            {posts.length === 0 ? (
              <Card>
                <CardContent className="py-10 text-center">
                  <ImageIcon className="h-10 w-10 text-gray-200 mx-auto mb-3" />
                  <p className="text-gray-400 text-sm">No posts yet</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {posts.map((post) => (
                  <Card
                    key={post.id}
                    className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => setLocation(`/collab-profile/${profile.uid}?post=${post.id}`)}
                  >
                    <CardContent className="p-4">
                      {post.text && (
                        <p className="text-sm text-gray-700 line-clamp-3 mb-2">{post.text}</p>
                      )}
                      {post.mediaUrl && (
                        <img
                          src={post.mediaUrl}
                          alt="Post media"
                          className="w-full rounded-lg object-cover max-h-52"
                          loading="lazy"
                        />
                      )}
                      <div className="flex items-center gap-3 mt-3 text-xs text-gray-400">
                        <span>
                          {new Date(post.createdAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                        {(post.likeCount ?? 0) > 0 && (
                          <span className="flex items-center gap-1">
                            <Heart className="h-3 w-3" /> {post.likeCount}
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
