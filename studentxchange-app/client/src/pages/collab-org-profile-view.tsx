import { useState, useEffect } from "react";
import { useCollabStudentProfile } from "@/hooks/use-collab-student-profile";
import { useCollabAuth } from "@/hooks/use-collab-auth";
import { useQuery } from "@tanstack/react-query";
import { useSearch } from "wouter";

// Extended profile type for organizations
type OrgProfile = any; // Using any to handle Club/Community/Company fields
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { MultiProfileBuilder } from "@/components/collab/multi-profile-builder";
import { 
  MapPin, 
  Briefcase, 
  GraduationCap, 
  Mail, 
  Phone,
  Edit,
  Globe,
  Users,
  Building2,
  Calendar,
  User as UserIcon,
  Facebook,
  Instagram,
  Twitter,
  Linkedin
} from "lucide-react";
import { Link } from "wouter";

export default function CollabOrgProfileView() {
  const search = useSearch();
  const targetUid = new URLSearchParams(search).get('uid');
  
  const { profile: myProfile, isLoading: myProfileLoading } = useCollabStudentProfile();
  const { user } = useCollabAuth();
  const [showEditDialog, setShowEditDialog] = useState(false);
  
  // Fetch other user's profile if uid is provided
  const { data: otherProfile, isLoading: otherProfileLoading } = useQuery({
    queryKey: ['/api/collab/social/profiles', targetUid],
    queryFn: async () => {
      if (!targetUid) return null;
      const token = localStorage.getItem('collab_jwt');
      const response = await fetch(`/api/collab/social/profiles/${targetUid}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) return null;
      return response.json();
    },
    enabled: !!targetUid
  });
  
  const profile = (targetUid ? otherProfile : myProfile) as OrgProfile;
  const isLoading = targetUid ? otherProfileLoading : myProfileLoading;
  const isOwnProfile = !targetUid || user?.uid === targetUid;

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

  if (!profile || profile.role === 'Student') {
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
        <div className="flex items-center justify-center p-4 mt-8">
          <Card className="max-w-md w-full">
            <CardContent className="pt-6 text-center">
              <Building2 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">No Organization Profile Found</h2>
              <p className="text-gray-600 mb-4">
                You haven't created an organization profile yet.
              </p>
              <Button asChild>
                <Link href="/student-collab">Go to Student Collab</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const getDisplayName = () => {
    switch (profile.role) {
      case 'Club': return profile.clubName;
      case 'Community': return profile.communityName;
      case 'Company': return profile.companyName;
      default: return profile.name;
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'Club': return 'from-blue-500 to-blue-600';
      case 'Community': return 'from-green-500 to-green-600';
      case 'Company': return 'from-orange-500 to-orange-600';
      default: return 'from-blue-500 to-blue-600';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'Club': return <Users className="h-5 w-5" />;
      case 'Community': return <Building2 className="h-5 w-5" />;
      case 'Company': return <Briefcase className="h-5 w-5" />;
      default: return <UserIcon className="h-5 w-5" />;
    }
  };

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

      {/* Main Content - Added pb-24 for mobile navigation spacing */}
      <div className="max-w-6xl mx-auto pb-24">
        {/* Hero Profile Section */}
        <div className="profile-hero-section">
          {/* Banner with Blue → Purple Gradient */}
          <div className="profile-banner-fixed" style={{ background: 'linear-gradient(135deg, #005FF9 0%, #9A1EFF 100%)' }}>
            {/* Edit Button - Top Right */}
            {isOwnProfile && (
              <button
                onClick={() => setShowEditDialog(true)}
                className="absolute top-6 right-6 z-20 p-2.5 bg-white/90 hover:bg-white rounded-full shadow-lg transition-all"
                data-testid="button-edit-org-profile"
              >
                <Edit className="h-5 w-5 text-gray-700" />
              </button>
            )}
          </div>

          {/* Profile Info - Overlapping Banner Bottom */}
          <div className="profile-hero-overlay px-6">
            <div className="flex items-end gap-6">
              {/* Avatar - 160px circular with border + shadow overlapping banner */}
              <div className="profile-avatar-container">
                {profile.avatarUrl ? (
                  <img
                    src={profile.avatarUrl}
                    alt={getDisplayName()}
                    className="w-40 h-40 rounded-full object-cover border-4 border-white shadow-lg"
                  />
                ) : (
                  <div className={`w-40 h-40 rounded-full bg-gradient-to-br ${getRoleColor(profile.role)} flex items-center justify-center text-white text-5xl font-bold border-4 border-white shadow-lg`}>
                    {getInitials(getDisplayName())}
                  </div>
                )}
                {/* Small badge overlapping avatar */}
                <div className="absolute -top-2 -right-2 z-30">
                  <Badge className="bg-white text-indigo-700 hover:bg-white border border-indigo-200 px-2.5 py-1 text-xs font-semibold">
                    {profile.role}
                  </Badge>
                </div>
              </div>

              {/* Name and Info - Below Avatar */}
              <div className="pb-2 flex-1">
                <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
                  {getDisplayName()}
                </h1>
                <p className="text-gray-600 mt-1 text-sm">
                  @{profile.username && !profile.username.includes('.') ? profile.username : user?.username || profile.username}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Content Grid - 30/70 Layout with proper top margin */}
        <div className="profile-grid-modern px-6 pt-8">
          {/* Left Column - Quick Info */}
          <div className="space-y-4">
            {/* Contact Card */}
            <div className="profile-card">
              <div className="profile-card-content">
                <h3 className="profile-section-title">
                  <Mail />
                  Contact
                </h3>
                {profile.contactEmail && (
                  <div className="profile-contact-item">
                    <Mail />
                    <a href={`mailto:${profile.contactEmail}`}>{profile.contactEmail}</a>
                  </div>
                )}
                {profile.role === 'Community' && profile.websiteJoinLink && (
                  <div className="profile-contact-item">
                    <Globe />
                    <a href={profile.websiteJoinLink} target="_blank" rel="noopener noreferrer">Join Community</a>
                  </div>
                )}
                {profile.role === 'Company' && profile.websiteCareersPage && (
                  <div className="profile-contact-item">
                    <Globe />
                    <a href={profile.websiteCareersPage} target="_blank" rel="noopener noreferrer">Careers Page</a>
                  </div>
                )}
                
                {/* Social Links */}
                {(profile.socialMediaLinks || profile.socialLinks || profile.linkedinProfile) && (
                  <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-100">
                    {(profile.socialMediaLinks?.facebook || profile.socialLinks?.facebook) && (
                      <a href={profile.socialMediaLinks?.facebook || profile.socialLinks?.facebook} target="_blank" rel="noopener noreferrer" 
                         className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors">
                        <Facebook className="h-4 w-4" />
                      </a>
                    )}
                    {(profile.socialMediaLinks?.instagram || profile.socialLinks?.instagram) && (
                      <a href={profile.socialMediaLinks?.instagram || profile.socialLinks?.instagram} target="_blank" rel="noopener noreferrer"
                         className="p-2 bg-pink-50 text-pink-600 rounded-lg hover:bg-pink-100 transition-colors">
                        <Instagram className="h-4 w-4" />
                      </a>
                    )}
                    {(profile.socialMediaLinks?.twitter || profile.socialLinks?.twitter) && (
                      <a href={profile.socialMediaLinks?.twitter || profile.socialLinks?.twitter} target="_blank" rel="noopener noreferrer"
                         className="p-2 bg-sky-50 text-sky-500 rounded-lg hover:bg-sky-100 transition-colors">
                        <Twitter className="h-4 w-4" />
                      </a>
                    )}
                    {(profile.socialMediaLinks?.linkedin || profile.socialLinks?.linkedin || profile.linkedinProfile) && (
                      <a href={profile.socialMediaLinks?.linkedin || profile.socialLinks?.linkedin || profile.linkedinProfile} target="_blank" rel="noopener noreferrer"
                         className="p-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors">
                        <Linkedin className="h-4 w-4" />
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Team/Person Card */}
            <div className="profile-card">
              <div className="profile-card-content">
                <h3 className="profile-section-title">
                  <Users />
                  {profile.role === 'Club' ? 'Team' : profile.role === 'Community' ? 'Contact' : 'Recruiter'}
                </h3>
                
                {profile.role === 'Club' && (
                  <div className="space-y-0">
                    {profile.facultyCoordinatorName && (
                      <div className="profile-team-item">
                        <span className="profile-team-label">Faculty Coordinator</span>
                        <span className="profile-team-name">{profile.facultyCoordinatorName}</span>
                      </div>
                    )}
                    {profile.studentHeadName && (
                      <div className="profile-team-item">
                        <span className="profile-team-label">Student Head</span>
                        <span className="profile-team-name">{profile.studentHeadName}</span>
                      </div>
                    )}
                  </div>
                )}
                
                {profile.role === 'Community' && profile.contactPerson && (
                  <div className="profile-team-item">
                    <span className="profile-team-label">Contact Person</span>
                    <span className="profile-team-name">{profile.contactPerson}</span>
                  </div>
                )}
                
                {profile.role === 'Company' && (
                  <div className="space-y-0">
                    {profile.recruiterName && (
                      <div className="profile-team-item">
                        <span className="profile-team-label">Name</span>
                        <span className="profile-team-name">{profile.recruiterName}</span>
                      </div>
                    )}
                    {profile.designation && (
                      <div className="profile-team-item">
                        <span className="profile-team-label">Designation</span>
                        <span className="profile-team-name">{profile.designation}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - About */}
          <div className="space-y-4">
            {/* About Section */}
            <div className="profile-card">
              <div className="profile-card-content">
                <h3 className="profile-section-title">
                  <Building2 />
                  {profile.role === 'Club' ? 'About Club' : profile.role === 'Community' ? 'Mission & Vision' : 'About Company'}
                </h3>
                <p className="text-gray-700 text-sm leading-relaxed">
                  {profile.role === 'Club' ? profile.aboutClub : 
                   profile.role === 'Community' ? profile.missionVision : 
                   profile.aboutCompany}
                </p>
                
                <div className="flex flex-wrap items-center gap-3 mt-4 pt-4 border-t border-gray-100">
                  <Badge className="bg-indigo-50 text-indigo-600 hover:bg-indigo-50">
                    {profile.role === 'Club' || profile.role === 'Community' ? profile.category : profile.industryType}
                  </Badge>
                  {profile.role === 'Club' && profile.foundedYear && (
                    <div className="flex items-center gap-1.5 text-sm text-gray-500">
                      <Calendar className="h-4 w-4" />
                      <span>Founded {profile.foundedYear}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Profile Dialog */}
      {showEditDialog && (
        <MultiProfileBuilder
          open={showEditDialog}
          onOpenChange={setShowEditDialog}
          initialRole={profile.role as 'Club' | 'Community' | 'Company'}
        />
      )}
    </div>
  );
}
