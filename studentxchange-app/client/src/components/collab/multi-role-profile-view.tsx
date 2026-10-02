import { Badge } from "@/components/ui/badge";
import { 
  Building2, 
  Globe, 
  Briefcase, 
  Mail, 
  Calendar,
  Users,
  Target,
  ExternalLink,
  Facebook,
  Instagram,
  Twitter,
  Linkedin,
  Link as LinkIcon
} from "lucide-react";

interface ClubProfile {
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

interface CommunityProfile {
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

interface CompanyProfile {
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

type NonStudentProfile = ClubProfile | CommunityProfile | CompanyProfile;

interface MultiRoleProfileViewProps {
  profile: NonStudentProfile;
}

export function MultiRoleProfileView({ profile }: MultiRoleProfileViewProps) {
  if (profile.role === 'Club') {
    return <ClubProfileView profile={profile} />;
  }
  
  if (profile.role === 'Community') {
    return <CommunityProfileView profile={profile} />;
  }
  
  if (profile.role === 'Company') {
    return <CompanyProfileView profile={profile} />;
  }
  
  return null;
}

function ClubProfileView({ profile }: { profile: ClubProfile }) {
  return (
    <div className="space-y-4">
      {/* About Section */}
      <div className="profile-card">
        <div className="profile-card-content">
          <h3 className="profile-section-title">
            <Building2 />
            About
          </h3>
          <p className="text-gray-700 text-sm leading-relaxed">{profile.aboutClub}</p>
          
          <div className="flex flex-wrap items-center gap-3 mt-4 pt-4 border-t border-gray-100">
            <Badge className="bg-indigo-50 text-indigo-600 hover:bg-indigo-50">{profile.category}</Badge>
            <div className="flex items-center gap-1.5 text-sm text-gray-500">
              <Calendar className="h-4 w-4" />
              <span>Founded {profile.foundedYear}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Team Section */}
      <div className="profile-card">
        <div className="profile-card-content">
          <h3 className="profile-section-title">
            <Users />
            Team
          </h3>
          <div className="space-y-0">
            <div className="profile-team-item">
              <span className="profile-team-label">Faculty Coordinator</span>
              <span className="profile-team-name">{profile.facultyCoordinatorName}</span>
            </div>
            <div className="profile-team-item">
              <span className="profile-team-label">Student Head</span>
              <span className="profile-team-name">{profile.studentHeadName}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Contact Section */}
      <div className="profile-card">
        <div className="profile-card-content">
          <h3 className="profile-section-title">
            <Mail />
            Contact
          </h3>
          <div className="profile-contact-item">
            <Mail />
            <a href={`mailto:${profile.contactEmail}`}>{profile.contactEmail}</a>
          </div>

          {profile.socialMediaLinks && Object.keys(profile.socialMediaLinks).length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-100">
              {profile.socialMediaLinks.facebook && (
                <a href={profile.socialMediaLinks.facebook} target="_blank" rel="noopener noreferrer" 
                   className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors">
                  <Facebook className="h-4 w-4" />
                </a>
              )}
              {profile.socialMediaLinks.instagram && (
                <a href={profile.socialMediaLinks.instagram} target="_blank" rel="noopener noreferrer"
                   className="p-2 bg-pink-50 text-pink-600 rounded-lg hover:bg-pink-100 transition-colors">
                  <Instagram className="h-4 w-4" />
                </a>
              )}
              {profile.socialMediaLinks.twitter && (
                <a href={profile.socialMediaLinks.twitter} target="_blank" rel="noopener noreferrer"
                   className="p-2 bg-sky-50 text-sky-500 rounded-lg hover:bg-sky-100 transition-colors">
                  <Twitter className="h-4 w-4" />
                </a>
              )}
              {profile.socialMediaLinks.linkedin && (
                <a href={profile.socialMediaLinks.linkedin} target="_blank" rel="noopener noreferrer"
                   className="p-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors">
                  <Linkedin className="h-4 w-4" />
                </a>
              )}
              {profile.socialMediaLinks.website && (
                <a href={profile.socialMediaLinks.website} target="_blank" rel="noopener noreferrer"
                   className="p-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
                  <ExternalLink className="h-4 w-4" />
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CommunityProfileView({ profile }: { profile: CommunityProfile }) {
  return (
    <div className="space-y-4">
      {/* Mission & Vision Section */}
      <div className="profile-card">
        <div className="profile-card-content">
          <h3 className="profile-section-title">
            <Target />
            Mission & Vision
          </h3>
          <p className="text-gray-700 text-sm leading-relaxed">{profile.missionVision}</p>
          
          <div className="mt-4 pt-4 border-t border-gray-100">
            <Badge className="bg-green-50 text-green-600 hover:bg-green-50">{profile.category}</Badge>
          </div>
        </div>
      </div>

      {/* Contact Section */}
      <div className="profile-card">
        <div className="profile-card-content">
          <h3 className="profile-section-title">
            <Mail />
            Contact
          </h3>
          
          <div className="space-y-0 mb-4">
            <div className="profile-team-item">
              <span className="profile-team-label">Contact Person</span>
              <span className="profile-team-name">{profile.contactPerson}</span>
            </div>
          </div>

          <div className="profile-contact-item">
            <Mail />
            <a href={`mailto:${profile.contactEmail}`}>{profile.contactEmail}</a>
          </div>

          {profile.websiteJoinLink && (
            <div className="profile-contact-item">
              <LinkIcon />
              <a href={profile.websiteJoinLink} target="_blank" rel="noopener noreferrer">Join Our Community</a>
            </div>
          )}

          {profile.socialLinks && Object.keys(profile.socialLinks).length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-100">
              {profile.socialLinks.facebook && (
                <a href={profile.socialLinks.facebook} target="_blank" rel="noopener noreferrer"
                   className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors">
                  <Facebook className="h-4 w-4" />
                </a>
              )}
              {profile.socialLinks.instagram && (
                <a href={profile.socialLinks.instagram} target="_blank" rel="noopener noreferrer"
                   className="p-2 bg-pink-50 text-pink-600 rounded-lg hover:bg-pink-100 transition-colors">
                  <Instagram className="h-4 w-4" />
                </a>
              )}
              {profile.socialLinks.discord && (
                <a href={profile.socialLinks.discord} target="_blank" rel="noopener noreferrer"
                   className="p-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors">
                  <Users className="h-4 w-4" />
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CompanyProfileView({ profile }: { profile: CompanyProfile }) {
  return (
    <div className="space-y-4">
      {/* About Company Section */}
      <div className="profile-card">
        <div className="profile-card-content">
          <h3 className="profile-section-title">
            <Briefcase />
            About Company
          </h3>
          <p className="text-gray-700 text-sm leading-relaxed">{profile.aboutCompany}</p>
          
          <div className="mt-4 pt-4 border-t border-gray-100">
            <Badge className="bg-blue-50 text-blue-600 hover:bg-blue-50">{profile.industryType}</Badge>
          </div>
        </div>
      </div>

      {/* Recruiter Section */}
      <div className="profile-card">
        <div className="profile-card-content">
          <h3 className="profile-section-title">
            <Users />
            Recruiter
          </h3>
          <div className="space-y-0">
            <div className="profile-team-item">
              <span className="profile-team-label">Name</span>
              <span className="profile-team-name">{profile.recruiterName}</span>
            </div>
            <div className="profile-team-item">
              <span className="profile-team-label">Designation</span>
              <span className="profile-team-name">{profile.designation}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Contact Section */}
      <div className="profile-card">
        <div className="profile-card-content">
          <h3 className="profile-section-title">
            <Mail />
            Contact
          </h3>

          <div className="profile-contact-item">
            <Mail />
            <a href={`mailto:${profile.contactEmail}`}>{profile.contactEmail}</a>
          </div>

          {profile.websiteCareersPage && (
            <div className="profile-contact-item">
              <ExternalLink />
              <a href={profile.websiteCareersPage} target="_blank" rel="noopener noreferrer">Careers Page</a>
            </div>
          )}

          {profile.linkedinProfile && (
            <div className="profile-contact-item">
              <Linkedin />
              <a href={profile.linkedinProfile} target="_blank" rel="noopener noreferrer">LinkedIn Profile</a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
