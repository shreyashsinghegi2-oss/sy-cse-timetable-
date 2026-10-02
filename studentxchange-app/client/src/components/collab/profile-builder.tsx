import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Edit3, UserCheck, MapPin, BookOpen, Star, Target, Briefcase, Heart, Users, X, Upload, Camera } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CAREER_STAGES, STREAMS, COLLAB_TYPES } from "@shared/schema";
import { 
  SKILLS_OPTIONS, 
  INTERESTS_OPTIONS, 
  PASSIONS_OPTIONS, 
  STUDENT_LIFE_OPTIONS, 
  COURSE_OPTIONS,
  SKILLS_BY_STREAM,
  INTERESTS_BY_STREAM,
  COURSE_OPTIONS_BY_STREAM,
  getStreamOptions,
  getSubStreamSuggestions
} from "@/lib/profile-options";
import { useCollabStudentProfile } from "@/hooks/use-collab-student-profile";
import { ObjectUploader } from "@/components/ObjectUploader";
import { useToast } from "@/hooks/use-toast";

// Profile form schema - matches Firestore student profile structure
const profileFormSchema = z.object({
  // Personal Information
  name: z.string().min(1, "Full name is required"),
  username: z.string().optional(),
  email: z.string().email("Valid email is required"),
  phone: z.string().optional(),
  
  // Educational Information
  college: z.string().min(1, "College is required"),
  career: z.enum(CAREER_STAGES, { required_error: "Career stage is required" }),
  
  // Academic Stream fields - support ALL disciplines
  primaryStream: z.enum(STREAMS, { required_error: "Primary stream is required" }),
  specialization: z.string().optional(),
  subStreams: z.array(z.string()).optional().default([]),
  specialties: z.array(z.string()).optional().default([]),
  
  currentCourse: z.string().min(1, "Current course is required"),
  skills: z.array(z.string()).min(1, "At least one skill is required"),
  interests: z.array(z.string()).min(1, "At least one interest is required"),
  passions: z.array(z.string()).optional().default([]),
  studentLifeActivities: z.array(z.string()).optional().default([]),
  
  // Collaboration preferences
  openToCrossStreamCollab: z.boolean().default(true),
  preferredCollabTypes: z.array(z.string()).optional().default([]),
  
  // Profile Details
  bio: z.string().optional(),
  avatarUrl: z.string().optional(),
  isAvailableForCollab: z.boolean().default(true),
});

type ProfileFormData = z.infer<typeof profileFormSchema>;

interface ProfileBuilderProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
}

export function ProfileBuilder({ open, onOpenChange, mode }: ProfileBuilderProps) {
  const { profile, createProfile, updateProfile } = useCollabStudentProfile();
  const { toast } = useToast();
  const [skillSearch, setSkillSearch] = useState("");
  const [interestSearch, setInterestSearch] = useState("");
  const [passionSearch, setPassionSearch] = useState("");
  const [studentLifeSearch, setStudentLifeSearch] = useState("");
  const [customCourse, setCustomCourse] = useState("");
  const [customSkill, setCustomSkill] = useState("");
  const [customInterest, setCustomInterest] = useState("");
  const [customPassion, setCustomPassion] = useState("");
  const [customStudentLife, setCustomStudentLife] = useState("");
  const [customSpecialty, setCustomSpecialty] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [profilePictureUrl, setProfilePictureUrl] = useState<string | null>(null);
  
  const [showCustomCourse, setShowCustomCourse] = useState(false);
  const [selectedStream, setSelectedStream] = useState<typeof STREAMS[number] | null>(null);
  
  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: "",
      username: "",
      email: "",
      phone: "",
      college: "",
      career: "First Year",
      primaryStream: "Other" as typeof STREAMS[number],
      specialization: "",
      subStreams: [],
      specialties: [],
      currentCourse: "",
      skills: [],
      interests: [],
      passions: [],
      studentLifeActivities: [],
      openToCrossStreamCollab: true,
      preferredCollabTypes: [],
      bio: "",
      avatarUrl: "",
      isAvailableForCollab: true,
    },
  });

  // Load existing profile data for editing
  useEffect(() => {
    if (mode === "edit" && profile) {
      const profileData = {
        name: profile.name || "",
        username: profile.username || "",
        email: profile.email || "",
        phone: profile.phone || "",
        college: profile.college || "",
        career: profile.career as typeof CAREER_STAGES[number],
        primaryStream: profile.primaryStream as typeof STREAMS[number] | undefined,
        specialization: (profile as any).specialization || "",
        subStreams: profile.subStreams || [],
        specialties: profile.specialties || [],
        currentCourse: profile.currentCourse || "",
        skills: profile.skills || [],
        interests: profile.interests || [],
        passions: profile.passions || [],
        studentLifeActivities: profile.studentLifeActivities || [],
        openToCrossStreamCollab: profile.openToCrossStreamCollab ?? true,
        preferredCollabTypes: profile.preferredCollabTypes || [],
        bio: profile.bio || "",
        avatarUrl: profile.avatarUrl || "",
        isAvailableForCollab: profile.isAvailableForCollab ?? true,
      };
      form.reset(profileData);
      if (profile.primaryStream) {
        setSelectedStream(profile.primaryStream as typeof STREAMS[number]);
      }
    }
  }, [profile, mode, form]);

  const onSubmit = async (data: ProfileFormData) => {
    const profileData = {
      name: data.name,
      username: data.username || profile?.username || profile?.email?.split('@')[0] || 'user' + Date.now(),
      email: data.email,
      phone: data.phone || undefined,
      college: data.college,
      career: data.career,
      primaryStream: data.primaryStream || undefined,
      specialization: data.specialization || undefined,
      subStreams: data.subStreams || [],
      specialties: data.specialties || [],
      currentCourse: data.currentCourse,
      skills: data.skills,
      interests: data.interests,
      passions: data.passions,
      studentLifeActivities: data.studentLifeActivities,
      openToCrossStreamCollab: data.openToCrossStreamCollab ?? true,
      preferredCollabTypes: data.preferredCollabTypes || [],
      bio: data.bio || undefined,
      avatarUrl: data.avatarUrl || undefined,
      isAvailableForCollab: data.isAvailableForCollab,
    };

    try {
      setIsSubmitting(true);
      
      if (mode === "create") {
        await createProfile(profileData);
      } else {
        await updateProfile(profileData);
      }
      
      toast({
        title: "Success",
        description: mode === "create" ? "Profile created successfully!" : "Profile updated successfully!",
      });
      onOpenChange(false);
    } catch (error) {
      console.error('[Profile Save] ERROR occurred:', error);
      
      // Detailed error logging
      if (error instanceof Error) {
        console.error('[Profile Save] Error message:', error.message);
        console.error('[Profile Save] Error stack:', error.stack);
      } else {
        console.error('[Profile Save] Unknown error type:', typeof error);
      }
      
      // Check for specific errors
      if (error instanceof Error && error.message.includes('Username is already taken')) {
        toast({
          title: "Username Taken",
          description: error.message,
          variant: "destructive",
        });
        form.setError("username", {
          type: "manual",
          message: error.message,
        });
      } else if (error instanceof Error && (error.message.includes('auth') || error.message.includes('401') || error.message.includes('token'))) {
        toast({
          title: "Session Expired",
          description: "Your login session has expired. Please refresh the page and log in again to save your profile.",
          variant: "destructive",
        });
      } else if (error instanceof Error && error.message.includes('Firebase')) {
        toast({
          title: "Database Error",
          description: `Firebase error: ${error.message}. Please check your internet connection and try again.`,
          variant: "destructive",
        });
      } else if (error instanceof Error) {
        toast({
          title: "Save Failed",
          description: `Unable to save profile: ${error.message}. Please check the console for details.`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to save profile. Please check your internet connection and try again.",
          variant: "destructive",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const addSkill = (skill: string) => {
    const currentSkills = form.getValues("skills");
    if (!currentSkills.includes(skill)) {
      form.setValue("skills", [...currentSkills, skill]);
      setSkillSearch("");
    }
  };

  const addCustomSkill = () => {
    if (customSkill.trim()) {
      const currentSkills = form.getValues("skills");
      if (!currentSkills.includes(customSkill.trim())) {
        form.setValue("skills", [...currentSkills, customSkill.trim()]);
        setCustomSkill("");
      }
    }
  };

  const removeSkill = (skillToRemove: string) => {
    const currentSkills = form.getValues("skills");
    form.setValue("skills", currentSkills.filter(skill => skill !== skillToRemove));
  };

  const addInterest = (interest: string) => {
    const currentInterests = form.getValues("interests");
    if (!currentInterests.includes(interest)) {
      form.setValue("interests", [...currentInterests, interest]);
      setInterestSearch("");
    }
  };

  const addCustomInterest = () => {
    if (customInterest.trim()) {
      const currentInterests = form.getValues("interests");
      if (!currentInterests.includes(customInterest.trim())) {
        form.setValue("interests", [...currentInterests, customInterest.trim()]);
        setCustomInterest("");
      }
    }
  };

  const removeInterest = (interestToRemove: string) => {
    const currentInterests = form.getValues("interests");
    form.setValue("interests", currentInterests.filter(interest => interest !== interestToRemove));
  };

  const addPassion = (passion: string) => {
    const currentPassions = form.getValues("passions");
    if (!currentPassions.includes(passion)) {
      form.setValue("passions", [...currentPassions, passion]);
      setPassionSearch("");
    }
  };

  const addCustomPassion = () => {
    if (customPassion.trim()) {
      const currentPassions = form.getValues("passions");
      if (!currentPassions.includes(customPassion.trim())) {
        form.setValue("passions", [...currentPassions, customPassion.trim()]);
        setCustomPassion("");
      }
    }
  };

  const removePassion = (passionToRemove: string) => {
    const currentPassions = form.getValues("passions");
    form.setValue("passions", currentPassions.filter(passion => passion !== passionToRemove));
  };

  const addStudentLifeActivity = (activity: string) => {
    const currentActivities = form.getValues("studentLifeActivities");
    if (!currentActivities.includes(activity)) {
      form.setValue("studentLifeActivities", [...currentActivities, activity]);
      setStudentLifeSearch("");
    }
  };

  const addCustomStudentLifeActivity = () => {
    if (customStudentLife.trim()) {
      const currentActivities = form.getValues("studentLifeActivities");
      if (!currentActivities.includes(customStudentLife.trim())) {
        form.setValue("studentLifeActivities", [...currentActivities, customStudentLife.trim()]);
        setCustomStudentLife("");
      }
    }
  };

  const removeStudentLifeActivity = (activityToRemove: string) => {
    const currentActivities = form.getValues("studentLifeActivities");
    form.setValue("studentLifeActivities", currentActivities.filter(activity => activity !== activityToRemove));
  };

  const handleUploadComplete = (result: { url: string }) => {
    const normalizedUrl = result.url;
    setProfilePictureUrl(normalizedUrl);
    form.setValue("avatarUrl", normalizedUrl, { shouldDirty: true, shouldValidate: true });
    
    // Auto-save if in edit mode to ensure persistence
    if (mode === "edit" && profile) {
      const currentValues = form.getValues();
      updateProfile({ ...currentValues, avatarUrl: normalizedUrl });
    }
  };

  const filteredSkills = SKILLS_OPTIONS.filter(skill =>
    skill.toLowerCase().includes(skillSearch.toLowerCase())
  ).slice(0, 10);

  const filteredInterests = INTERESTS_OPTIONS.filter(interest =>
    interest.toLowerCase().includes(interestSearch.toLowerCase())
  ).slice(0, 10);

  const filteredPassions = PASSIONS_OPTIONS.filter(passion =>
    passion.toLowerCase().includes(passionSearch.toLowerCase())
  ).slice(0, 10);

  const filteredStudentLifeActivities = STUDENT_LIFE_OPTIONS.filter(activity =>
    activity.toLowerCase().includes(studentLifeSearch.toLowerCase())
  ).slice(0, 10);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {mode === "create" ? (
              <>
                <UserCheck className="h-5 w-5" />
                Build Your Student Profile
              </>
            ) : (
              <>
                <Edit3 className="h-5 w-5" />
                Edit Your Profile
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {mode === "create" 
              ? "Complete your profile to start collaborating with fellow students and discover amazing projects."
              : "Update your profile information and preferences."
            }
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Profile Picture Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Camera className="h-4 w-4" />
                Profile Picture
              </h3>
              
              <div className="flex items-center space-x-4">
                {(profilePictureUrl || form.watch("avatarUrl")) && (
                  <img 
                    src={profilePictureUrl || form.watch("avatarUrl") || ""} 
                    alt="Profile" 
                    className="w-20 h-20 rounded-full object-cover border-2 border-gray-200"
                  />
                )}
                <ObjectUploader
                  maxNumberOfFiles={1}
                  maxFileSize={2 * 1024 * 1024} // 2MB
                  accept="image/*"
                  onComplete={handleUploadComplete}
                >
                  <Upload className="h-4 w-4" />
                  {profilePictureUrl || form.watch("avatarUrl") ? "Change Picture" : "Upload Picture"}
                </ObjectUploader>
              </div>
            </div>

            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <User className="h-4 w-4" />
                Basic Information
              </h3>
              
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Enter your full name"
                        data-testid="input-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />


              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="email"
                        placeholder="Enter your email address"
                        data-testid="input-email"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="tel"
                        placeholder="Enter your phone number"
                        data-testid="input-phone"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="college"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>College/University</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter your college/university name"
                        value={field.value}
                        onChange={field.onChange}
                        data-testid="input-college"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="career"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Academic Stage</FormLabel>
                      <FormControl>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger data-testid="select-career">
                            <SelectValue placeholder="Select your stage" />
                          </SelectTrigger>
                          <SelectContent>
                            {CAREER_STAGES.map((stage) => (
                              <SelectItem key={stage} value={stage}>
                                {stage}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="currentCourse"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Current Course</FormLabel>
                      <FormControl>
                        <div className="space-y-3">
                          <Select 
                            onValueChange={(value) => {
                              if (value === "Other") {
                                setShowCustomCourse(true);
                                field.onChange("");
                              } else {
                                setShowCustomCourse(false);
                                field.onChange(value);
                              }
                            }} 
                            value={showCustomCourse ? "Other" : field.value}
                          >
                            <SelectTrigger data-testid="select-course">
                              <SelectValue placeholder="Select your course" />
                            </SelectTrigger>
                            <SelectContent>
                              {COURSE_OPTIONS.map((course) => (
                                <SelectItem key={course} value={course}>
                                  {course}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          
                          {showCustomCourse && (
                            <Input
                              placeholder="Enter your course name"
                              value={customCourse}
                              onChange={(e) => {
                                setCustomCourse(e.target.value);
                                field.onChange(e.target.value);
                              }}
                              data-testid="input-custom-course"
                            />
                          )}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Academic Stream Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Briefcase className="h-4 w-4" />
                Academic Stream & Discipline
              </h3>
              <p className="text-sm text-gray-600">Help us connect you with students from all fields - Engineering, Medicine, Arts, Commerce, Law, Design, and beyond!</p>
              
              <FormField
                control={form.control}
                name="primaryStream"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Primary Academic Stream</FormLabel>
                    <FormControl>
                      <Select 
                        onValueChange={(value) => {
                          field.onChange(value);
                          setSelectedStream(value as typeof STREAMS[number]);
                        }} 
                        value={field.value}
                      >
                        <SelectTrigger data-testid="select-primary-stream">
                          <SelectValue placeholder="Select your primary stream" />
                        </SelectTrigger>
                        <SelectContent className="max-h-72 overflow-y-auto">
                          {STREAMS.map((stream) => (
                            <SelectItem key={stream} value={stream}>
                              {stream}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="specialization"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Specialization</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="e.g., Computer Science, Marketing, etc."
                        data-testid="input-specialization"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="subStreams"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sub-Streams / Related Fields (Optional)</FormLabel>
                    <FormControl>
                      <div className="space-y-3">
                        {selectedStream && getSubStreamSuggestions(selectedStream).length > 0 && (
                          <div className="grid grid-cols-2 gap-2 p-3 bg-blue-50 rounded-lg">
                            <div className="col-span-2 text-sm font-medium text-blue-900 mb-1">Suggested related streams:</div>
                            {getSubStreamSuggestions(selectedStream).map((subStream) => (
                              <Button
                                key={subStream}
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="justify-start h-auto p-2 text-left hover:bg-blue-100"
                                onClick={() => {
                                  if (!field.value.includes(subStream)) {
                                    field.onChange([...field.value, subStream]);
                                  }
                                }}
                                disabled={field.value.includes(subStream)}
                              >
                                {subStream}
                              </Button>
                            ))}
                          </div>
                        )}
                        {field.value.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {field.value.map((subStream) => (
                              <Badge key={subStream} variant="secondary" className="flex items-center gap-1">
                                {subStream}
                                <X
                                  className="h-3 w-3 cursor-pointer"
                                  onClick={() => field.onChange(field.value.filter(s => s !== subStream))}
                                />
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="specialties"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Specialties / Areas of Focus (Optional)</FormLabel>
                    <FormControl>
                      <div className="space-y-3">
                        <div className="flex gap-2">
                          <Input
                            placeholder="e.g., Organic Chemistry, Corporate Law, UI/UX Design..."
                            value={customSpecialty}
                            onChange={(e) => setCustomSpecialty(e.target.value)}
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                if (customSpecialty.trim() && !field.value.includes(customSpecialty.trim())) {
                                  field.onChange([...field.value, customSpecialty.trim()]);
                                  setCustomSpecialty("");
                                }
                              }
                            }}
                            data-testid="input-specialty"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              if (customSpecialty.trim() && !field.value.includes(customSpecialty.trim())) {
                                field.onChange([...field.value, customSpecialty.trim()]);
                                setCustomSpecialty("");
                              }
                            }}
                          >
                            Add
                          </Button>
                        </div>
                        {field.value.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {field.value.map((specialty) => (
                              <Badge key={specialty} variant="outline" className="flex items-center gap-1">
                                {specialty}
                                <X
                                  className="h-3 w-3 cursor-pointer"
                                  onClick={() => field.onChange(field.value.filter(s => s !== specialty))}
                                />
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Skills Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Star className="h-4 w-4" />
                Skills
              </h3>
              
              <FormField
                control={form.control}
                name="skills"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Add Skills (Type to search)</FormLabel>
                    <FormControl>
                      <div className="space-y-3">
                        <Input
                          placeholder="Type a skill..."
                          value={skillSearch}
                          onChange={(e) => setSkillSearch(e.target.value)}
                          data-testid="input-skill-search"
                        />
                        {skillSearch && filteredSkills.length > 0 && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 sm:max-h-64 overflow-y-auto border rounded-lg p-3 bg-white shadow-sm">
                            {filteredSkills.map((skill) => (
                              <Button
                                key={skill}
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="justify-start h-auto p-3 text-left hover:bg-blue-50 transition-colors"
                                onClick={() => {
                                  if (skill === "Other") {
                                    // Do nothing, let user type custom skill below
                                  } else {
                                    addSkill(skill);
                                  }
                                }}
                                disabled={skill !== "Other" && field.value.includes(skill)}
                              >
                                {skill}
                              </Button>
                            ))}
                          </div>
                        )}
                        
                        {/* Always show custom input option */}
                        <div className="space-y-2 border rounded p-3 bg-gray-50">
                          <div className="text-sm font-medium text-gray-700">Add Custom Skill:</div>
                          <div className="flex gap-2">
                            <Input
                              placeholder="Enter your custom skill or press Enter to add what you typed above"
                              value={customSkill}
                              onChange={(e) => setCustomSkill(e.target.value)}
                              data-testid="input-custom-skill"
                              onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  if (customSkill.trim()) {
                                    addCustomSkill();
                                  } else if (skillSearch.trim() && !filteredSkills.map(s => s.toLowerCase()).includes(skillSearch.toLowerCase())) {
                                    // Add what user typed in search if it's not in the predefined list
                                    const currentSkills = form.getValues("skills");
                                    if (!currentSkills.includes(skillSearch.trim())) {
                                      form.setValue("skills", [...currentSkills, skillSearch.trim()]);
                                      setSkillSearch("");
                                    }
                                  }
                                }
                              }}
                            />
                            <Button
                              type="button"
                              onClick={() => {
                                if (customSkill.trim()) {
                                  addCustomSkill();
                                } else if (skillSearch.trim() && !filteredSkills.map(s => s.toLowerCase()).includes(skillSearch.toLowerCase())) {
                                  // Add what user typed in search if it's not in the predefined list
                                  const currentSkills = form.getValues("skills");
                                  if (!currentSkills.includes(skillSearch.trim())) {
                                    form.setValue("skills", [...currentSkills, skillSearch.trim()]);
                                    setSkillSearch("");
                                  }
                                }
                              }}
                              size="sm"
                              disabled={!customSkill.trim() && !skillSearch.trim()}
                            >
                              Add
                            </Button>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {field.value.map((skill) => (
                            <Badge key={skill} variant="default" className="px-3 py-1">
                              {skill}
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-auto p-1 ml-2 hover:bg-destructive hover:text-destructive-foreground"
                                onClick={() => removeSkill(skill)}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Interests Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Target className="h-4 w-4" />
                Interests
              </h3>
              
              <FormField
                control={form.control}
                name="interests"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Add Interests (Type to search)</FormLabel>
                    <FormControl>
                      <div className="space-y-3">
                        <Input
                          placeholder="Type an interest..."
                          value={interestSearch}
                          onChange={(e) => setInterestSearch(e.target.value)}
                          data-testid="input-interest-search"
                        />
                        {interestSearch && filteredInterests.length > 0 && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 sm:max-h-64 overflow-y-auto border rounded-lg p-3 bg-white shadow-sm">
                            {filteredInterests.map((interest) => (
                              <Button
                                key={interest}
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="justify-start h-auto p-3 text-left hover:bg-blue-50 transition-colors"
                                onClick={() => {
                                  if (interest === "Other") {
                                    // Do nothing, let user type custom interest below
                                  } else {
                                    addInterest(interest);
                                  }
                                }}
                                disabled={interest !== "Other" && field.value.includes(interest)}
                              >
                                {interest}
                              </Button>
                            ))}
                          </div>
                        )}
                        
                        {/* Always show custom input option */}
                        <div className="space-y-2 border rounded p-3 bg-gray-50">
                          <div className="text-sm font-medium text-gray-700">Add Custom Interest:</div>
                          <div className="flex gap-2">
                            <Input
                              placeholder="Enter your custom interest or press Enter to add what you typed above"
                              value={customInterest}
                              onChange={(e) => setCustomInterest(e.target.value)}
                              data-testid="input-custom-interest"
                              onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  if (customInterest.trim()) {
                                    addCustomInterest();
                                  } else if (interestSearch.trim() && !filteredInterests.map(i => i.toLowerCase()).includes(interestSearch.toLowerCase())) {
                                    // Add what user typed in search if it's not in the predefined list
                                    const currentInterests = form.getValues("interests");
                                    if (!currentInterests.includes(interestSearch.trim())) {
                                      form.setValue("interests", [...currentInterests, interestSearch.trim()]);
                                      setInterestSearch("");
                                    }
                                  }
                                }
                              }}
                            />
                            <Button
                              type="button"
                              onClick={() => {
                                if (customInterest.trim()) {
                                  addCustomInterest();
                                } else if (interestSearch.trim() && !filteredInterests.map(i => i.toLowerCase()).includes(interestSearch.toLowerCase())) {
                                  // Add what user typed in search if it's not in the predefined list
                                  const currentInterests = form.getValues("interests");
                                  if (!currentInterests.includes(interestSearch.trim())) {
                                    form.setValue("interests", [...currentInterests, interestSearch.trim()]);
                                    setInterestSearch("");
                                  }
                                }
                              }}
                              size="sm"
                              disabled={!customInterest.trim() && !interestSearch.trim()}
                            >
                              Add
                            </Button>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {field.value.map((interest) => (
                            <Badge key={interest} variant="secondary" className="px-3 py-1">
                              {interest}
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-auto p-1 ml-2 hover:bg-destructive hover:text-destructive-foreground"
                                onClick={() => removeInterest(interest)}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Passions Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Heart className="h-4 w-4" />
                Personal Passions & Hobbies
              </h3>
              
              <FormField
                control={form.control}
                name="passions"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Add Passions (Optional - Type to search)</FormLabel>
                    <FormControl>
                      <div className="space-y-3">
                        <Input
                          placeholder="Type a passion or hobby..."
                          value={passionSearch}
                          onChange={(e) => setPassionSearch(e.target.value)}
                          data-testid="input-passion-search"
                        />
                        {passionSearch && filteredPassions.length > 0 && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 sm:max-h-64 overflow-y-auto border rounded-lg p-3 bg-white shadow-sm">
                            {filteredPassions.map((passion) => (
                              <Button
                                key={passion}
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="justify-start h-auto p-3 text-left hover:bg-pink-50 transition-colors"
                                onClick={() => {
                                  if (passion === "Other") {
                                    // Do nothing, let user type custom passion below
                                  } else {
                                    addPassion(passion);
                                  }
                                }}
                                disabled={passion !== "Other" && field.value.includes(passion)}
                              >
                                {passion}
                              </Button>
                            ))}
                          </div>
                        )}
                        
                        {/* Always show custom input option */}
                        <div className="space-y-2 border rounded p-3 bg-pink-50">
                          <div className="text-sm font-medium text-gray-700">Add Custom Passion:</div>
                          <div className="flex gap-2">
                            <Input
                              placeholder="Enter your custom passion or hobby, or press Enter to add what you typed above"
                              value={customPassion}
                              onChange={(e) => setCustomPassion(e.target.value)}
                              data-testid="input-custom-passion"
                              onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  if (customPassion.trim()) {
                                    addCustomPassion();
                                  } else if (passionSearch.trim() && !filteredPassions.map(p => p.toLowerCase()).includes(passionSearch.toLowerCase())) {
                                    // Add what user typed in search if it's not in the predefined list
                                    const currentPassions = form.getValues("passions");
                                    if (!currentPassions.includes(passionSearch.trim())) {
                                      form.setValue("passions", [...currentPassions, passionSearch.trim()]);
                                      setPassionSearch("");
                                    }
                                  }
                                }
                              }}
                            />
                            <Button
                              type="button"
                              onClick={() => {
                                if (customPassion.trim()) {
                                  addCustomPassion();
                                } else if (passionSearch.trim() && !filteredPassions.map(p => p.toLowerCase()).includes(passionSearch.toLowerCase())) {
                                  // Add what user typed in search if it's not in the predefined list
                                  const currentPassions = form.getValues("passions");
                                  if (!currentPassions.includes(passionSearch.trim())) {
                                    form.setValue("passions", [...currentPassions, passionSearch.trim()]);
                                    setPassionSearch("");
                                  }
                                }
                              }}
                              size="sm"
                              disabled={!customPassion.trim() && !passionSearch.trim()}
                            >
                              Add
                            </Button>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {field.value.map((passion) => (
                            <Badge key={passion} variant="secondary" className="px-3 py-1 bg-pink-50 text-pink-700 border-pink-200">
                              {passion}
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-auto p-1 ml-2 hover:bg-destructive hover:text-destructive-foreground"
                                onClick={() => removePassion(passion)}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Student Life Activities Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Users className="h-4 w-4" />
                Student Life & Campus Activities
              </h3>
              
              <FormField
                control={form.control}
                name="studentLifeActivities"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Add Activities (Optional - Type to search)</FormLabel>
                    <FormControl>
                      <div className="space-y-3">
                        <Input
                          placeholder="Type a campus activity..."
                          value={studentLifeSearch}
                          onChange={(e) => setStudentLifeSearch(e.target.value)}
                          data-testid="input-student-life-search"
                        />
                        {studentLifeSearch && filteredStudentLifeActivities.length > 0 && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 sm:max-h-64 overflow-y-auto border rounded-lg p-3 bg-white shadow-sm">
                            {filteredStudentLifeActivities.map((activity) => (
                              <Button
                                key={activity}
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="justify-start h-auto p-3 text-left hover:bg-blue-50 transition-colors"
                                onClick={() => {
                                  if (activity === "Other") {
                                    // Do nothing, let user type custom activity below
                                  } else {
                                    addStudentLifeActivity(activity);
                                  }
                                }}
                                disabled={activity !== "Other" && field.value.includes(activity)}
                              >
                                {activity}
                              </Button>
                            ))}
                          </div>
                        )}
                        
                        {/* Always show custom input option */}
                        <div className="space-y-2 border rounded p-3 bg-blue-50">
                          <div className="text-sm font-medium text-gray-700">Add Custom Activity:</div>
                          <div className="flex gap-2">
                            <Input
                              placeholder="Enter your custom campus activity or press Enter to add what you typed above"
                              value={customStudentLife}
                              onChange={(e) => setCustomStudentLife(e.target.value)}
                              data-testid="input-custom-student-life"
                              onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  if (customStudentLife.trim()) {
                                    addCustomStudentLifeActivity();
                                  } else if (studentLifeSearch.trim() && !filteredStudentLifeActivities.map(a => a.toLowerCase()).includes(studentLifeSearch.toLowerCase())) {
                                    // Add what user typed in search if it's not in the predefined list
                                    const currentActivities = form.getValues("studentLifeActivities");
                                    if (!currentActivities.includes(studentLifeSearch.trim())) {
                                      form.setValue("studentLifeActivities", [...currentActivities, studentLifeSearch.trim()]);
                                      setStudentLifeSearch("");
                                    }
                                  }
                                }
                              }}
                            />
                            <Button
                              type="button"
                              onClick={() => {
                                if (customStudentLife.trim()) {
                                  addCustomStudentLifeActivity();
                                } else if (studentLifeSearch.trim() && !filteredStudentLifeActivities.map(a => a.toLowerCase()).includes(studentLifeSearch.toLowerCase())) {
                                  // Add what user typed in search if it's not in the predefined list
                                  const currentActivities = form.getValues("studentLifeActivities");
                                  if (!currentActivities.includes(studentLifeSearch.trim())) {
                                    form.setValue("studentLifeActivities", [...currentActivities, studentLifeSearch.trim()]);
                                    setStudentLifeSearch("");
                                  }
                                }
                              }}
                              size="sm"
                              disabled={!customStudentLife.trim() && !studentLifeSearch.trim()}
                            >
                              Add
                            </Button>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {field.value.map((activity) => (
                            <Badge key={activity} variant="secondary" className="px-3 py-1 bg-blue-50 text-blue-700 border-blue-200">
                              {activity}
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-auto p-1 ml-2 hover:bg-destructive hover:text-destructive-foreground"
                                onClick={() => removeStudentLifeActivity(activity)}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Collaboration Preferences Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Users className="h-4 w-4" />
                Collaboration Preferences
              </h3>
              
              <FormField
                control={form.control}
                name="openToCrossStreamCollab"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="checkbox-cross-stream-collab"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="text-sm font-medium">
                        Open to Cross-Stream Collaboration
                      </FormLabel>
                      <p className="text-xs text-muted-foreground">
                        Enable this to collaborate with students from different academic disciplines (e.g., Engineering with Arts, Medicine with Business, etc.)
                      </p>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="preferredCollabTypes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preferred Collaboration Types (Optional)</FormLabel>
                    <FormControl>
                      <div className="space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 sm:max-h-64 overflow-y-auto p-3 border rounded-lg bg-white shadow-sm">
                          {COLLAB_TYPES.map((collabType) => (
                            <Button
                              key={collabType}
                              type="button"
                              variant={field.value.includes(collabType) ? "default" : "ghost"}
                              size="sm"
                              className="justify-start h-auto p-3 text-left hover:bg-gray-50 transition-colors"
                              onClick={() => {
                                if (field.value.includes(collabType)) {
                                  field.onChange(field.value.filter(t => t !== collabType));
                                } else {
                                  field.onChange([...field.value, collabType]);
                                }
                              }}
                            >
                              {collabType}
                            </Button>
                          ))}
                        </div>
                        {field.value.length > 0 && (
                          <div className="text-xs text-gray-600">
                            Selected: {field.value.join(", ")}
                          </div>
                        )}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Bio Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                About You
              </h3>
              
              <FormField
                control={form.control}
                name="bio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bio (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Tell others about yourself, your goals, and what you're passionate about..."
                        className="min-h-[100px]"
                        data-testid="textarea-bio"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isAvailableForCollab"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="checkbox-available-collab"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="text-sm">
                        Available for collaboration
                      </FormLabel>
                      <p className="text-xs text-muted-foreground">
                        Show your profile to others looking for collaborators
                      </p>
                    </div>
                  </FormItem>
                )}
              />
            </div>

            {/* Submit Button */}
            <div className="flex justify-end space-x-4 pt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                data-testid="button-save-profile"
              >
                {isSubmitting ? (
                  mode === "create" ? "Creating..." : "Saving..."
                ) : (
                  mode === "create" ? "Create Profile" : "Save Changes"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}