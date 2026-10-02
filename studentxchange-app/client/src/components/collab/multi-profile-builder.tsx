import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent } from "@/components/ui/card";
import { Users, Building2, Globe, Briefcase, Loader2, Upload } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { ObjectUploader } from "@/components/ObjectUploader";
import { collabFetch } from "@/lib/firebase";

// Profile Role Types
type ProfileRole = 'Student' | 'Club' | 'Community' | 'Company';

// Club Profile Schema
const clubProfileSchema = z.object({
  role: z.literal('Club'),
  clubName: z.string().min(1, "Club name is required"),
  category: z.enum(['Technical', 'Cultural', 'Sports', 'Social', 'Departmental'], {
    required_error: "Category is required"
  }),
  foundedYear: z.number().min(1900).max(new Date().getFullYear()),
  aboutClub: z.string().min(10, "Please provide at least 10 characters about the club"),
  facultyCoordinatorName: z.string().min(1, "Faculty coordinator name is required"),
  studentHeadName: z.string().min(1, "Student head name is required"),
  contactEmail: z.string().email("Valid email is required"),
  avatarUrl: z.string().optional(),
  facebook: z.string().optional(),
  instagram: z.string().optional(),
  twitter: z.string().optional(),
  linkedin: z.string().optional(),
  website: z.string().optional(),
});

// Community Profile Schema
const communityProfileSchema = z.object({
  role: z.literal('Community'),
  communityName: z.string().min(1, "Community name is required"),
  missionVision: z.string().min(10, "Please provide at least 10 characters for mission/vision"),
  category: z.enum(['Tech', 'Research', 'Social', 'Cultural'], {
    required_error: "Category is required"
  }),
  contactPerson: z.string().min(1, "Contact person is required"),
  contactEmail: z.string().email("Valid email is required"),
  avatarUrl: z.string().optional(),
  websiteJoinLink: z.string().optional(),
  facebook: z.string().optional(),
  instagram: z.string().optional(),
  twitter: z.string().optional(),
  linkedin: z.string().optional(),
  discord: z.string().optional(),
});

// Company/Recruiter Profile Schema
const companyProfileSchema = z.object({
  role: z.literal('Company'),
  companyName: z.string().min(1, "Company name is required"),
  industryType: z.string().min(1, "Industry type is required"),
  aboutCompany: z.string().min(10, "Please provide at least 10 characters about the company"),
  recruiterName: z.string().min(1, "Recruiter name is required"),
  designation: z.string().min(1, "Designation is required"),
  contactEmail: z.string().email("Valid email is required"),
  avatarUrl: z.string().optional(),
  websiteCareersPage: z.string().optional(),
  linkedinProfile: z.string().optional(),
});

type ClubFormData = z.infer<typeof clubProfileSchema>;
type CommunityFormData = z.infer<typeof communityProfileSchema>;
type CompanyFormData = z.infer<typeof companyProfileSchema>;

interface MultiProfileBuilderProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialRole?: ProfileRole;
  existingProfile?: any; // Existing profile data for edit mode
}

export function MultiProfileBuilder({ open, onOpenChange, initialRole = 'Student', existingProfile }: MultiProfileBuilderProps) {
  const { toast } = useToast();
  const [selectedRole, setSelectedRole] = useState<ProfileRole>(initialRole);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [clubProfilePictureUrl, setClubProfilePictureUrl] = useState<string>(existingProfile?.avatarUrl || "");
  const [communityProfilePictureUrl, setCommunityProfilePictureUrl] = useState<string>(existingProfile?.avatarUrl || "");
  const [companyProfilePictureUrl, setCompanyProfilePictureUrl] = useState<string>(existingProfile?.avatarUrl || "");

  // Sync selectedRole with initialRole when dialog opens or initialRole changes
  useEffect(() => {
    if (open && initialRole) {
      setSelectedRole(initialRole);
    }
  }, [open, initialRole]);

  const clubForm = useForm<ClubFormData>({
    resolver: zodResolver(clubProfileSchema),
    defaultValues: {
      role: 'Club',
      clubName: existingProfile?.clubName || "",
      category: existingProfile?.category || 'Technical',
      foundedYear: existingProfile?.foundedYear || new Date().getFullYear(),
      aboutClub: existingProfile?.aboutClub || "",
      facultyCoordinatorName: existingProfile?.facultyCoordinatorName || "",
      studentHeadName: existingProfile?.studentHeadName || "",
      contactEmail: existingProfile?.contactEmail || "",
      avatarUrl: existingProfile?.avatarUrl || "",
      facebook: existingProfile?.socialMediaLinks?.facebook || "",
      instagram: existingProfile?.socialMediaLinks?.instagram || "",
      twitter: existingProfile?.socialMediaLinks?.twitter || "",
      linkedin: existingProfile?.socialMediaLinks?.linkedin || "",
      website: existingProfile?.socialMediaLinks?.website || "",
    },
  });

  const communityForm = useForm<CommunityFormData>({
    resolver: zodResolver(communityProfileSchema),
    defaultValues: {
      role: 'Community',
      communityName: existingProfile?.communityName || "",
      missionVision: existingProfile?.missionVision || "",
      category: existingProfile?.category || 'Tech',
      contactPerson: existingProfile?.contactPerson || "",
      contactEmail: existingProfile?.contactEmail || "",
      avatarUrl: existingProfile?.avatarUrl || "",
      websiteJoinLink: existingProfile?.websiteJoinLink || "",
      facebook: existingProfile?.socialLinks?.facebook || "",
      instagram: existingProfile?.socialLinks?.instagram || "",
      twitter: existingProfile?.socialLinks?.twitter || "",
      linkedin: existingProfile?.socialLinks?.linkedin || "",
      discord: existingProfile?.socialLinks?.discord || "",
    },
  });

  const companyForm = useForm<CompanyFormData>({
    resolver: zodResolver(companyProfileSchema),
    defaultValues: {
      role: 'Company',
      companyName: existingProfile?.companyName || "",
      industryType: existingProfile?.industryType || "",
      aboutCompany: existingProfile?.aboutCompany || "",
      recruiterName: existingProfile?.recruiterName || "",
      designation: existingProfile?.designation || "",
      contactEmail: existingProfile?.contactEmail || "",
      avatarUrl: existingProfile?.avatarUrl || "",
      websiteCareersPage: existingProfile?.websiteCareersPage || "",
      linkedinProfile: existingProfile?.linkedinProfile || "",
    },
  });

  const handleRoleChange = (role: ProfileRole) => {
    setSelectedRole(role);
  };

  const onSubmitClub = async (data: ClubFormData) => {
    try {
      setIsSubmitting(true);
      
      // Generate username (3-20 chars, lowercase, underscores)
      const generatedUsername = data.clubName.toLowerCase().replace(/\s+/g, '_').substring(0, 20);
      
      const profileData = {
        role: 'Club' as const,
        name: data.clubName,
        username: generatedUsername,
        email: data.contactEmail, // Required by schema
        clubName: data.clubName,
        category: data.category,
        foundedYear: data.foundedYear,
        aboutClub: data.aboutClub,
        facultyCoordinatorName: data.facultyCoordinatorName,
        studentHeadName: data.studentHeadName,
        contactEmail: data.contactEmail,
        avatarUrl: data.avatarUrl || undefined,
        socialMediaLinks: {
          facebook: data.facebook || undefined,
          instagram: data.instagram || undefined,
          twitter: data.twitter || undefined,
          linkedin: data.linkedin || undefined,
          website: data.website || undefined,
        }
      };

      const response = await collabFetch('/api/collab/student-profile', {
        method: existingProfile ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(profileData)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to save profile');
      }

      queryClient.invalidateQueries({ queryKey: ['/api/collab/student-profile'] });
      
      toast({
        title: "Success",
        description: existingProfile ? "Club profile updated successfully!" : "Club profile created successfully!",
      });
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving club profile:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save club profile",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const onSubmitCommunity = async (data: CommunityFormData) => {
    try {
      setIsSubmitting(true);
      
      // Generate username (3-20 chars, lowercase, underscores)
      const generatedUsername = data.communityName.toLowerCase().replace(/\s+/g, '_').substring(0, 20);
      
      const profileData = {
        role: 'Community' as const,
        name: data.communityName,
        username: generatedUsername,
        email: data.contactEmail, // Required by schema
        communityName: data.communityName,
        missionVision: data.missionVision,
        category: data.category,
        contactPerson: data.contactPerson,
        contactEmail: data.contactEmail,
        avatarUrl: data.avatarUrl || undefined,
        websiteJoinLink: data.websiteJoinLink || undefined,
        socialLinks: {
          facebook: data.facebook || undefined,
          instagram: data.instagram || undefined,
          twitter: data.twitter || undefined,
          linkedin: data.linkedin || undefined,
          discord: data.discord || undefined,
        }
      };

      const response = await collabFetch('/api/collab/student-profile', {
        method: existingProfile ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(profileData)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to save profile');
      }

      queryClient.invalidateQueries({ queryKey: ['/api/collab/student-profile'] });
      
      toast({
        title: "Success",
        description: existingProfile ? "Community profile updated successfully!" : "Community profile created successfully!",
      });
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving community profile:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save community profile",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const onSubmitCompany = async (data: CompanyFormData) => {
    try {
      setIsSubmitting(true);
      
      // Generate username (3-20 chars, lowercase, underscores)
      const generatedUsername = data.companyName.toLowerCase().replace(/\s+/g, '_').substring(0, 20);
      
      const profileData = {
        role: 'Company' as const,
        name: data.companyName,
        username: generatedUsername,
        email: data.contactEmail, // Required by schema
        companyName: data.companyName,
        industryType: data.industryType,
        aboutCompany: data.aboutCompany,
        recruiterName: data.recruiterName,
        designation: data.designation,
        contactEmail: data.contactEmail,
        avatarUrl: data.avatarUrl || undefined,
        websiteCareersPage: data.websiteCareersPage || undefined,
        linkedinProfile: data.linkedinProfile || undefined,
      };

      const response = await collabFetch('/api/collab/student-profile', {
        method: existingProfile ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(profileData)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to save profile');
      }

      queryClient.invalidateQueries({ queryKey: ['/api/collab/student-profile'] });
      
      toast({
        title: "Success",
        description: existingProfile ? "Company profile updated successfully!" : "Company profile created successfully!",
      });
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving company profile:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save company profile",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isEditMode = !!existingProfile;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold">
            {isEditMode ? 'Edit Your Profile' : 'Build Your Profile'}
          </DialogTitle>
          <DialogDescription>
            {isEditMode 
              ? 'Update your profile information below'
              : 'Choose your profile type and complete the form to get started'
            }
          </DialogDescription>
        </DialogHeader>

        {/* Role Selection - Only show when creating new profile */}
        {!isEditMode && (
          <Card className="shadow-lg rounded-2xl p-6">
            <CardContent className="pt-6">
              <h3 className="text-lg font-semibold mb-4">Select Profile Type</h3>
              <RadioGroup value={selectedRole} onValueChange={(value) => handleRoleChange(value as ProfileRole)}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className={`flex items-center space-x-3 p-4 border-2 rounded-xl cursor-pointer transition ${selectedRole === 'Student' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
                    <RadioGroupItem value="Student" id="student" />
                    <Users className="h-5 w-5" />
                    <span className="font-medium">Student</span>
                  </label>

                  <label className={`flex items-center space-x-3 p-4 border-2 rounded-xl cursor-pointer transition ${selectedRole === 'Club' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
                    <RadioGroupItem value="Club" id="club" />
                    <Building2 className="h-5 w-5" />
                    <span className="font-medium">Club</span>
                  </label>

                  <label className={`flex items-center space-x-3 p-4 border-2 rounded-xl cursor-pointer transition ${selectedRole === 'Community' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
                    <RadioGroupItem value="Community" id="community" />
                    <Globe className="h-5 w-5" />
                    <span className="font-medium">Community</span>
                  </label>

                  <label className={`flex items-center space-x-3 p-4 border-2 rounded-xl cursor-pointer transition ${selectedRole === 'Company' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
                    <RadioGroupItem value="Company" id="company" />
                    <Briefcase className="h-5 w-5" />
                    <span className="font-medium">Company / Recruiter</span>
                  </label>
                </div>
              </RadioGroup>
            </CardContent>
          </Card>
        )}

        {/* Student Profile - Redirect to existing profile builder */}
        {selectedRole === 'Student' && (
          <Card className="shadow-lg rounded-2xl p-6">
            <CardContent className="pt-6">
              <p className="text-center text-gray-600 mb-4">
                Student profiles use the existing profile builder.
              </p>
              <Button 
                onClick={() => onOpenChange(false)} 
                className="w-full bg-blue-600 hover:bg-blue-700 rounded-xl"
              >
                Close and Use Student Profile Builder
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Club Profile Form */}
        {selectedRole === 'Club' && (
          <Form {...clubForm}>
            <form onSubmit={clubForm.handleSubmit(onSubmitClub)} className="space-y-6">
              <Card className="shadow-lg rounded-2xl p-6">
                <CardContent className="space-y-4 pt-6">
                  <FormField
                    control={clubForm.control}
                    name="clubName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Club Name *</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g., Coding Club" className="border rounded-xl p-2 w-full focus:ring focus:outline-none" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Profile Picture
                    </h3>
                    
                    <div className="flex items-center space-x-4">
                      {(clubProfilePictureUrl || clubForm.watch("avatarUrl")) && (
                        <img 
                          src={clubProfilePictureUrl || clubForm.watch("avatarUrl") || ""} 
                          alt="Club Logo" 
                          className="w-20 h-20 rounded-full object-cover border-2 border-gray-200"
                        />
                      )}
                      
                      <ObjectUploader
                        onComplete={(result) => {
                          setClubProfilePictureUrl(result.url);
                          clubForm.setValue("avatarUrl", result.url);
                        }}
                        maxFileSize={2 * 1024 * 1024}
                        accept="image/*"
                      >
                        <Upload className="h-4 w-4" />
                        {clubProfilePictureUrl || clubForm.watch("avatarUrl") ? "Change Logo" : "Upload Logo"}
                      </ObjectUploader>
                    </div>
                  </div>

                  <FormField
                    control={clubForm.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="border rounded-xl p-2 w-full">
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Technical">Technical</SelectItem>
                            <SelectItem value="Cultural">Cultural</SelectItem>
                            <SelectItem value="Sports">Sports</SelectItem>
                            <SelectItem value="Social">Social</SelectItem>
                            <SelectItem value="Departmental">Departmental</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={clubForm.control}
                    name="foundedYear"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Founded Year *</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            {...field} 
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                            placeholder="e.g., 2020" 
                            className="border rounded-xl p-2 w-full focus:ring focus:outline-none" 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={clubForm.control}
                    name="aboutClub"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>About Club *</FormLabel>
                        <FormControl>
                          <Textarea {...field} placeholder="Brief description of the club" rows={4} className="border rounded-xl p-2 w-full focus:ring focus:outline-none" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={clubForm.control}
                    name="facultyCoordinatorName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Faculty Coordinator Name *</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g., Dr. John Doe" className="border rounded-xl p-2 w-full focus:ring focus:outline-none" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={clubForm.control}
                    name="studentHeadName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Student Head Name *</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g., Jane Smith" className="border rounded-xl p-2 w-full focus:ring focus:outline-none" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={clubForm.control}
                    name="contactEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contact Email *</FormLabel>
                        <FormControl>
                          <Input type="email" {...field} placeholder="club@college.edu" className="border rounded-xl p-2 w-full focus:ring focus:outline-none" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="space-y-2">
                    <h4 className="font-medium text-sm text-gray-700">Social Media Links (Optional)</h4>
                    <FormField
                      control={clubForm.control}
                      name="facebook"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input {...field} placeholder="Facebook URL" className="border rounded-xl p-2 w-full focus:ring focus:outline-none" />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={clubForm.control}
                      name="instagram"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input {...field} placeholder="Instagram URL" className="border rounded-xl p-2 w-full focus:ring focus:outline-none" />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={clubForm.control}
                      name="linkedin"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input {...field} placeholder="LinkedIn URL" className="border rounded-xl p-2 w-full focus:ring focus:outline-none" />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={clubForm.control}
                      name="website"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input {...field} placeholder="Website URL" className="border rounded-xl p-2 w-full focus:ring focus:outline-none" />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>

              <Button 
                type="submit" 
                disabled={isSubmitting} 
                className="w-full bg-blue-600 text-white rounded-xl px-4 py-2 hover:bg-blue-700 transition"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Profile'
                )}
              </Button>
            </form>
          </Form>
        )}

        {/* Community Profile Form */}
        {selectedRole === 'Community' && (
          <Form {...communityForm}>
            <form onSubmit={communityForm.handleSubmit(onSubmitCommunity)} className="space-y-6">
              <Card className="shadow-lg rounded-2xl p-6">
                <CardContent className="space-y-4 pt-6">
                  <FormField
                    control={communityForm.control}
                    name="communityName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Community Name *</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g., Tech Community" className="border rounded-xl p-2 w-full focus:ring focus:outline-none" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Community Logo
                    </h3>
                    
                    <div className="flex items-center space-x-4">
                      {(communityProfilePictureUrl || communityForm.watch("avatarUrl")) && (
                        <img 
                          src={communityProfilePictureUrl || communityForm.watch("avatarUrl") || ""} 
                          alt="Community Logo" 
                          className="w-20 h-20 rounded-full object-cover border-2 border-gray-200"
                        />
                      )}
                      
                      <ObjectUploader
                        onComplete={(result) => {
                          setCommunityProfilePictureUrl(result.url);
                          communityForm.setValue("avatarUrl", result.url);
                        }}
                        maxFileSize={2 * 1024 * 1024}
                        accept="image/*"
                      >
                        <Upload className="h-4 w-4" />
                        {communityProfilePictureUrl || communityForm.watch("avatarUrl") ? "Change Logo" : "Upload Logo"}
                      </ObjectUploader>
                    </div>
                  </div>

                  <FormField
                    control={communityForm.control}
                    name="missionVision"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mission / Vision *</FormLabel>
                        <FormControl>
                          <Textarea {...field} placeholder="What is your community's mission and vision?" rows={4} className="border rounded-xl p-2 w-full focus:ring focus:outline-none" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={communityForm.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="border rounded-xl p-2 w-full">
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Tech">Tech</SelectItem>
                            <SelectItem value="Research">Research</SelectItem>
                            <SelectItem value="Social">Social</SelectItem>
                            <SelectItem value="Cultural">Cultural</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={communityForm.control}
                    name="contactPerson"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contact Person *</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g., John Doe" className="border rounded-xl p-2 w-full focus:ring focus:outline-none" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={communityForm.control}
                    name="contactEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contact Email *</FormLabel>
                        <FormControl>
                          <Input type="email" {...field} placeholder="contact@community.org" className="border rounded-xl p-2 w-full focus:ring focus:outline-none" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={communityForm.control}
                    name="websiteJoinLink"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Website / Join Link (Optional)</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="https://..." className="border rounded-xl p-2 w-full focus:ring focus:outline-none" />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <div className="space-y-2">
                    <h4 className="font-medium text-sm text-gray-700">Social Links (Optional)</h4>
                    <FormField
                      control={communityForm.control}
                      name="facebook"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input {...field} placeholder="Facebook URL" className="border rounded-xl p-2 w-full focus:ring focus:outline-none" />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={communityForm.control}
                      name="instagram"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input {...field} placeholder="Instagram URL" className="border rounded-xl p-2 w-full focus:ring focus:outline-none" />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={communityForm.control}
                      name="discord"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input {...field} placeholder="Discord Server URL" className="border rounded-xl p-2 w-full focus:ring focus:outline-none" />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>

              <Button 
                type="submit" 
                disabled={isSubmitting} 
                className="w-full bg-blue-600 text-white rounded-xl px-4 py-2 hover:bg-blue-700 transition"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Profile'
                )}
              </Button>
            </form>
          </Form>
        )}

        {/* Company/Recruiter Profile Form */}
        {selectedRole === 'Company' && (
          <Form {...companyForm}>
            <form onSubmit={companyForm.handleSubmit(onSubmitCompany)} className="space-y-6">
              <Card className="shadow-lg rounded-2xl p-6">
                <CardContent className="space-y-4 pt-6">
                  <FormField
                    control={companyForm.control}
                    name="companyName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company Name *</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g., Tech Corp" className="border rounded-xl p-2 w-full focus:ring focus:outline-none" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Company Logo
                    </h3>
                    
                    <div className="flex items-center space-x-4">
                      {(companyProfilePictureUrl || companyForm.watch("avatarUrl")) && (
                        <img 
                          src={companyProfilePictureUrl || companyForm.watch("avatarUrl") || ""} 
                          alt="Company Logo" 
                          className="w-20 h-20 rounded-full object-cover border-2 border-gray-200"
                        />
                      )}
                      
                      <ObjectUploader
                        onComplete={(result) => {
                          setCompanyProfilePictureUrl(result.url);
                          companyForm.setValue("avatarUrl", result.url);
                        }}
                        maxFileSize={2 * 1024 * 1024}
                        accept="image/*"
                      >
                        <Upload className="h-4 w-4" />
                        {companyProfilePictureUrl || companyForm.watch("avatarUrl") ? "Change Logo" : "Upload Logo"}
                      </ObjectUploader>
                    </div>
                  </div>

                  <FormField
                    control={companyForm.control}
                    name="industryType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Industry Type *</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g., Information Technology" className="border rounded-xl p-2 w-full focus:ring focus:outline-none" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={companyForm.control}
                    name="aboutCompany"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>About Company *</FormLabel>
                        <FormControl>
                          <Textarea {...field} placeholder="Brief description of the company" rows={4} className="border rounded-xl p-2 w-full focus:ring focus:outline-none" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={companyForm.control}
                    name="recruiterName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Recruiter Name *</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g., Jane Smith" className="border rounded-xl p-2 w-full focus:ring focus:outline-none" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={companyForm.control}
                    name="designation"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Designation *</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g., HR Manager" className="border rounded-xl p-2 w-full focus:ring focus:outline-none" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={companyForm.control}
                    name="contactEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contact Email *</FormLabel>
                        <FormControl>
                          <Input type="email" {...field} placeholder="careers@company.com" className="border rounded-xl p-2 w-full focus:ring focus:outline-none" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={companyForm.control}
                    name="websiteCareersPage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Website / Careers Page (Optional)</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="https://company.com/careers" className="border rounded-xl p-2 w-full focus:ring focus:outline-none" />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={companyForm.control}
                    name="linkedinProfile"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>LinkedIn Profile (Optional)</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="https://linkedin.com/in/..." className="border rounded-xl p-2 w-full focus:ring focus:outline-none" />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <Button 
                type="submit" 
                disabled={isSubmitting} 
                className="w-full bg-blue-600 text-white rounded-xl px-4 py-2 hover:bg-blue-700 transition"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Profile'
                )}
              </Button>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
