import { useState } from "react";
import { useParams, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { 
  ArrowLeft, 
  MessageCircle, 
  UserPlus, 
  MapPin, 
  Calendar, 
  BookOpen, 
  Award,
  Heart,
  MessageSquare,
  Share2,
  MoreHorizontal,
  School,
  Briefcase
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useConnections, useConnectionStatus } from "@/hooks/use-connections";

// Mock data for demonstration
const mockProfile = {
  id: 1,
  user: {
    id: 1,
    username: "Alex Chen",
    email: "alex.chen@mit.edu"
  },
  college: "MIT",
  career: "Third Year",
  currentCourse: "Computer Science & Engineering",
  bio: "Passionate about AI/ML and building innovative solutions. Currently working on machine learning projects and looking to collaborate on interesting tech ventures. Always excited to connect with fellow students and share knowledge!",
  skills: ["Python", "Machine Learning", "React", "Node.js", "TensorFlow", "Data Science", "AWS"],
  interests: ["Artificial Intelligence", "Startup Culture", "Open Source", "Robotics", "Music Production"],
  avatarUrl: "",
  coverUrl: "",
  isAvailableForCollab: true,
  connectionStatus: "not_connected", // "connected", "pending", "not_connected"
  location: "Cambridge, MA",
  joinedDate: "2023-08-15",
  stats: {
    projects: 12,
    connections: 145,
    achievements: 8
  }
};

const mockPosts = [
  {
    id: 1,
    type: "achievement",
    content: "Just completed my first machine learning project! Built a recommendation system using collaborative filtering. Excited to share what I learned with the community.",
    timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    likes: 24,
    comments: 5,
    attachments: []
  },
  {
    id: 2,
    type: "general",
    content: "Looking for teammates for the upcoming MIT hackathon! I'm particularly interested in projects involving AI, sustainability, or social impact. Let me know if you're interested in collaborating!",
    timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    likes: 18,
    comments: 12,
    attachments: []
  },
  {
    id: 3,
    type: "event",
    content: "Attended an amazing workshop on quantum computing today. The intersection of quantum mechanics and computer science is fascinating. Would love to discuss this with anyone interested!",
    timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    likes: 31,
    comments: 8,
    attachments: []
  }
];

export default function ProfilePage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [isOwnProfile] = useState(user?.id.toString() === id);
  
  // Connection management
  const { sendConnectionRequest, isSendingRequest } = useConnections();
  const { connectionStatus, isLoadingStatus } = useConnectionStatus(
    !isOwnProfile && id ? parseInt(id) : undefined
  );

  // In a real app, this would fetch the profile data
  const { data: profile, isLoading } = useQuery({
    queryKey: ['/api/profiles', id],
    enabled: !!id,
    // For now, return mock data
    queryFn: () => Promise.resolve(mockProfile),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const handleConnect = () => {
    if (id && !isOwnProfile) {
      sendConnectionRequest(parseInt(id));
    }
  };

  const handleMessage = () => {
    // TODO: Open messaging in chat panel
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Profile Not Found</h2>
          <p className="text-gray-600 mb-4">The profile you're looking for doesn't exist.</p>
          <Link href="/student-collab">
            <Button>Back to Student Collab</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <Link href="/student-collab">
            <Button variant="ghost" size="sm" className="mb-2" data-testid="button-back">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Student Collab
            </Button>
          </Link>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Cover Photo & Profile Section */}
        <Card className="mb-6 overflow-hidden">
          {/* Cover Photo */}
          <div className="h-48 bg-gradient-to-r from-blue-500 to-purple-600 relative">
            {profile.coverUrl ? (
              <img src={profile.coverUrl} alt="Cover" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-r from-blue-500 to-purple-600" />
            )}
          </div>

          {/* Profile Info */}
          <CardContent className="pt-0">
            <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4 -mt-16 relative">
              {/* Avatar */}
              <Avatar className="h-32 w-32 border-4 border-white shadow-lg">
                <AvatarImage src={profile.avatarUrl} />
                <AvatarFallback className="bg-blue-600 text-white text-2xl">
                  {profile.user.username.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>

              {/* Profile Details & Actions */}
              <div className="flex-1 pt-4 sm:pt-0">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900" data-testid="profile-name">
                      {profile.user.username}
                    </h1>
                    <p className="text-lg text-gray-600 flex items-center gap-2 mt-1">
                      <BookOpen className="h-4 w-4" />
                      {profile.currentCourse}
                    </p>
                    <p className="text-gray-500 flex items-center gap-2 mt-1">
                      <School className="h-4 w-4" />
                      {profile.college} • {profile.career}
                    </p>
                    <p className="text-gray-500 flex items-center gap-2 mt-1">
                      <MapPin className="h-4 w-4" />
                      {profile.location}
                    </p>
                  </div>

                  {/* Action Buttons */}
                  {!isOwnProfile && (
                    <div className="flex gap-2">
                      {isLoadingStatus ? (
                        <Button variant="outline" disabled data-testid="button-loading">
                          <UserPlus className="h-4 w-4 mr-2" />
                          Loading...
                        </Button>
                      ) : connectionStatus === "accepted" ? (
                        <Button onClick={handleMessage} data-testid="button-message">
                          <MessageCircle className="h-4 w-4 mr-2" />
                          Message
                        </Button>
                      ) : connectionStatus === "pending" ? (
                        <Button variant="outline" disabled data-testid="button-pending">
                          <UserPlus className="h-4 w-4 mr-2" />
                          Pending
                        </Button>
                      ) : (
                        <Button 
                          onClick={handleConnect} 
                          disabled={isSendingRequest}
                          data-testid="button-connect"
                        >
                          <UserPlus className="h-4 w-4 mr-2" />
                          {isSendingRequest ? "Connecting..." : "Connect"}
                        </Button>
                      )}
                      <Button variant="outline" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>

                {/* Stats */}
                <div className="flex gap-6 mt-4 pt-4 border-t">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-gray-900">{profile.stats.projects}</p>
                    <p className="text-sm text-gray-500">Projects</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-gray-900">{profile.stats.connections}</p>
                    <p className="text-sm text-gray-500">Connections</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-gray-900">{profile.stats.achievements}</p>
                    <p className="text-sm text-gray-500">Achievements</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - About & Skills */}
          <div className="lg:col-span-1 space-y-6">
            {/* About Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5" />
                  About
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 leading-relaxed" data-testid="profile-bio">
                  {profile.bio}
                </p>
                <Separator className="my-4" />
                <div className="space-y-2 text-sm text-gray-600">
                  <p className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Joined {new Date(profile.joinedDate).toLocaleDateString('en-US', { 
                      month: 'long', 
                      year: 'numeric' 
                    })}
                  </p>
                  <p className="flex items-center gap-2">
                    <Award className="h-4 w-4" />
                    {profile.isAvailableForCollab ? "Available for collaboration" : "Not available for collaboration"}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Skills Section */}
            <Card>
              <CardHeader>
                <CardTitle>Skills</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2" data-testid="profile-skills">
                  {profile.skills.map((skill, index) => (
                    <Badge key={index} variant="secondary" className="text-sm">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Interests Section */}
            <Card>
              <CardHeader>
                <CardTitle>Interests</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2" data-testid="profile-interests">
                  {profile.interests.map((interest, index) => (
                    <Badge key={index} variant="outline" className="text-sm">
                      {interest}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Recent Posts */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Recent Posts</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {mockPosts.map((post) => (
                  <div key={post.id} className="border-b border-gray-200 pb-6 last:border-b-0 last:pb-0">
                    <div className="flex items-start gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={profile.avatarUrl} />
                        <AvatarFallback className="bg-blue-600 text-white text-sm">
                          {profile.user.username.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <p className="font-medium text-gray-900">{profile.user.username}</p>
                          <p className="text-sm text-gray-500">
                            {post.timestamp.toLocaleDateString('en-US', { 
                              month: 'short', 
                              day: 'numeric' 
                            })}
                          </p>
                        </div>
                        <p className="text-gray-700 mb-3">{post.content}</p>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <button className="flex items-center gap-1 hover:text-red-500 transition-colors">
                            <Heart className="h-4 w-4" />
                            {post.likes}
                          </button>
                          <button className="flex items-center gap-1 hover:text-blue-500 transition-colors">
                            <MessageSquare className="h-4 w-4" />
                            {post.comments}
                          </button>
                          <button className="flex items-center gap-1 hover:text-green-500 transition-colors">
                            <Share2 className="h-4 w-4" />
                            Share
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}