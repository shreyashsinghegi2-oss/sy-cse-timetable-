import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { useCollabAuth } from "@/hooks/use-collab-auth";
import { useLocation } from "wouter";
import { 
  ChevronRight, 
  ChevronLeft, 
  Check, 
  Upload, 
  User, 
  GraduationCap, 
  Briefcase,
  X,
  Search
} from "lucide-react";
import { SKILLS_OPTIONS, INTERESTS_OPTIONS, PASSIONS_OPTIONS, GENERAL_SKILLS_OPTIONS } from "@/lib/profile-options";
import { CAREER_STAGES, STREAMS } from "@shared/schema";
import { ObjectUploader } from "@/components/ObjectUploader";
import { collabFetch } from "@/lib/firebase";

interface ProfileData {
  avatarUrl: string;
  name: string;
  username: string;
  college: string;
  email: string;
  phone: string;
  bio: string;
  currentCourse: string;
  specialization: string;
  career: string;
  primaryStream: string;
  subStreams: string[];
  skills: string[];
  interests: string[];
  passions: string[];
  role: 'Student';
}

const COURSE_OPTIONS = [
  'B.Tech', 'BCA', 'BBA', 'MBA', 'M.Tech', 'MCA',
  'B.Sc', 'M.Sc', 'B.Com', 'M.Com', 'BA', 'MA',
  'MBBS', 'BDS', 'B.Pharm', 'LLB', 'B.Arch', 'B.Des',
  'Diploma', 'Certificate', 'Other'
];

export function StepProfileBuilder() {
  const [step, setStep] = useState(1);
  const [, setLocation] = useLocation();
  const { user } = useCollabAuth();
  const queryClient = useQueryClient();
  const saving = useRef(false);
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  
  // Search states for portfolio sections
  const [skillsSearch, setSkillsSearch] = useState("");
  const [interestsSearch, setInterestsSearch] = useState("");
  const [passionsSearch, setPassionsSearch] = useState("");
  
  const [profileData, setProfileData] = useState<ProfileData>({
    avatarUrl: '',
    name: user?.username || user?.email?.split('@')[0] || '',
    username: user?.username || '',
    college: '',
    email: user?.email || '',
    phone: '',
    bio: '',
    currentCourse: '',
    specialization: '',
    career: '',
    primaryStream: '',
    subStreams: [],
    skills: [],
    interests: [],
    passions: [],
    role: 'Student'
  });

  const draftKey = user ? `collab-profile-draft:${user.uid || `sql:${user.id}`}` : null;
  const [loadedDraftKey, setLoadedDraftKey] = useState<string | null>(null);
  useEffect(() => {
    if (!draftKey) return;
    let draft: Partial<ProfileData> = {};
    try {
      let stored = JSON.parse(sessionStorage.getItem(draftKey) || "null");
      if (!stored) {
        // Recover a pre-fix draft only when its email belongs to this account.
        const legacy = JSON.parse(sessionStorage.getItem("profileData") || "null");
        if (legacy?.email?.toLowerCase() === user?.email?.toLowerCase()) {
          stored = legacy;
          sessionStorage.removeItem("profileData");
        }
      }
      if (stored && typeof stored === "object") draft = stored;
    } catch { /* Corrupt or unavailable browser storage must not block editing. */ }
    setProfileData(prev => ({
      ...prev, ...draft,
      name: draft.name || prev.name || user?.username || "",
      email: user?.email || "",
      skills: Array.isArray(draft.skills) ? draft.skills : [],
      interests: Array.isArray(draft.interests) ? draft.interests : [],
      passions: Array.isArray(draft.passions) ? draft.passions : [],
      subStreams: Array.isArray(draft.subStreams) ? draft.subStreams : [],
      role: "Student",
    }));
    setLoadedDraftKey(draftKey);
  }, [draftKey]);

  useEffect(() => {
    if (!draftKey || loadedDraftKey !== draftKey) return;
    try { sessionStorage.setItem(draftKey, JSON.stringify(profileData)); } catch {}
  }, [draftKey, loadedDraftKey, profileData]);

  const updateField = (field: keyof ProfileData, value: any) => {
    setProfileData(prev => ({ ...prev, [field]: value }));
  };

  const addSkill = (skill: string) => {
    if (!profileData.skills.includes(skill)) {
      updateField('skills', [...profileData.skills, skill]);
    }
  };

  const removeSkill = (skill: string) => {
    updateField('skills', profileData.skills.filter(s => s !== skill));
  };

  const addInterest = (interest: string) => {
    if (!profileData.interests.includes(interest)) {
      updateField('interests', [...profileData.interests, interest]);
    }
  };

  const removeInterest = (interest: string) => {
    updateField('interests', profileData.interests.filter(i => i !== interest));
  };

  const addPassion = (passion: string) => {
    if (!profileData.passions.includes(passion)) {
      updateField('passions', [...profileData.passions, passion]);
    }
  };

  const removePassion = (passion: string) => {
    updateField('passions', profileData.passions.filter(p => p !== passion));
  };

  const handleNext = () => {
    if (step === 1) {
      if (!profileData.name || !profileData.college || !profileData.email) {
        toast({
          title: "Missing Information",
          description: "Please fill in all required fields (name, college, email)",
          variant: "destructive"
        });
        return;
      }
    } else if (step === 2) {
      if (!profileData.currentCourse || !profileData.career || !profileData.primaryStream) {
        toast({
          title: "Missing Information",
          description: "Please fill in all required academic fields",
          variant: "destructive"
        });
        return;
      }
    }
    setStep(step + 1);
  };

  const handleBack = () => {
    setStep(step - 1);
  };

  const handleSubmit = async () => {
    if (saving.current) return;
    if (profileData.skills.length === 0) {
      toast({
        title: "Missing Skills",
        description: "Please select at least one skill",
        variant: "destructive"
      });
      return;
    }
    
    if (profileData.interests.length === 0) {
      toast({
        title: "Missing Interests",
        description: "Please select at least one interest",
        variant: "destructive"
      });
      return;
    }

    saving.current = true;
    setLoading(true);
    try {
      const requestBody = {
          role: 'Student',
          name: profileData.name,
          username: user?.email?.split('@')[0] || 'user' + Date.now(),
          email: profileData.email,
          phone: profileData.phone,
          college: profileData.college,
          career: profileData.career,
          currentCourse: profileData.currentCourse,
          specialization: profileData.specialization,
          primaryStream: profileData.primaryStream,
          subStreams: profileData.subStreams,
          skills: profileData.skills,
          interests: profileData.interests,
          passions: profileData.passions,
          bio: profileData.bio,
          avatarUrl: profileData.avatarUrl,
        };
      
      const response = await collabFetch('/api/collab/student-profile', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody)
        });

      const responseData = await response.json().catch(() => ({}));

      if (!response.ok) {
        // Handle specific error cases
        if (response.status === 409) {
          // Profile already exists - redirect to profile page
          if (draftKey) sessionStorage.removeItem(draftKey);
          await queryClient.invalidateQueries({ queryKey: ['/api/collab/student-profile'] });
          toast({
            title: "Profile Already Exists",
            description: "You already have a profile. Redirecting...",
          });
          setLocation('/collab-profile');
          return;
        }
        
        if (response.status === 401) {
          throw new Error('Your sign-in session could not be refreshed. Please log in again');
        }
        
        throw new Error(responseData.message || responseData.error || 'Failed to create profile');
      }

      if (draftKey) sessionStorage.removeItem(draftKey);
      queryClient.setQueryData(['/api/collab/student-profile'], responseData);
      await queryClient.invalidateQueries({ queryKey: ['/api/collab/student-profile'] });
      toast({
        title: "Profile Created!",
        description: "Your profile has been successfully created.",
      });
      
      setLocation('/collab-profile');
    } catch (error) {
      console.error('[StepProfileBuilder] Error creating profile:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create profile';
      toast({
        title: "Error",
        description: errorMessage.endsWith(".") ? `${errorMessage} Please try again.` : `${errorMessage}. Please try again.`,
        variant: "destructive"
      });
    } finally {
      saving.current = false;
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Progress Indicator */}
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center gap-2">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all ${
                  s === step ? 'bg-blue-600 text-white scale-110' : 
                  s < step ? 'bg-green-500 text-white' : 
                  'bg-gray-200 text-gray-500'
                }`}>
                  {s < step ? <Check className="h-5 w-5" /> : s}
                </div>
                {s < 3 && (
                  <div className={`w-16 h-1 transition-all ${
                    s < step ? 'bg-green-500' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step 1: Personal Details */}
        {step === 1 && (
          <Card className="animate-in fade-in slide-in-from-bottom-4 duration-500 shadow-xl border-t-4 border-t-blue-500">
            <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-t-lg">
              <CardTitle className="flex items-center gap-2 text-2xl">
                <User className="h-6 w-6" />
                Personal Information
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              {/* Profile Picture */}
              <div className="flex flex-col items-center gap-4">
                <Avatar className="h-24 w-24 ring-4 ring-blue-100">
                  <AvatarImage src={profileData.avatarUrl} />
                  <AvatarFallback className="bg-blue-100 text-blue-600 text-2xl">
                    {profileData.name?.[0]?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <ObjectUploader
                  onComplete={(result: { url: string }) => updateField('avatarUrl', result.url)}
                  maxFileSize={2 * 1024 * 1024}
                  accept="image/*"
                >
                  <Button variant="outline" size="sm" className="gap-2" data-testid="button-upload-picture">
                    <Upload className="h-4 w-4" />
                    Upload Profile Picture
                  </Button>
                </ObjectUploader>
              </div>

              {/* Form Fields */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name" className="required">Full Name *</Label>
                  <Input
                    id="name"
                    value={profileData.name}
                    onChange={(e) => updateField('name', e.target.value)}
                    placeholder="Enter your full name"
                    className="mt-1"
                    data-testid="input-full-name"
                  />
                </div>

                <div>
                  <Label htmlFor="college" className="required">College/University *</Label>
                  <Input
                    id="college"
                    value={profileData.college}
                    onChange={(e) => updateField('college', e.target.value)}
                    placeholder="Enter your college or university name"
                    className="mt-1"
                    data-testid="input-college"
                  />
                </div>

                <div>
                  <Label htmlFor="email" className="required">Email ID *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profileData.email}
                    onChange={(e) => updateField('email', e.target.value)}
                    placeholder="your.email@example.com"
                    className="mt-1"
                    data-testid="input-email"
                  />
                </div>

                <div>
                  <Label htmlFor="phone">Mobile Number</Label>
                  <Input
                    id="phone"
                    value={profileData.phone}
                    onChange={(e) => updateField('phone', e.target.value)}
                    placeholder="Enter your mobile number"
                    className="mt-1"
                    data-testid="input-phone"
                  />
                </div>

                <div>
                  <Label htmlFor="bio">About</Label>
                  <Textarea
                    id="bio"
                    value={profileData.bio}
                    onChange={(e) => updateField('bio', e.target.value)}
                    placeholder="Write a short paragraph about yourself..."
                    rows={4}
                    className="mt-1"
                    data-testid="textarea-about"
                  />
                </div>
              </div>

              {/* Navigation Buttons */}
              <div className="flex justify-between pt-4">
                <Button 
                  onClick={() => setLocation('/collab-org-selector')} 
                  variant="outline" 
                  className="gap-2"
                  data-testid="button-back-to-role-selection"
                >
                  <ChevronLeft className="h-4 w-4" /> Back
                </Button>
                <Button 
                  onClick={handleNext} 
                  className="gap-2 bg-blue-600 hover:bg-blue-700"
                  data-testid="button-next-step1"
                >
                  Next <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Academic Details */}
        {step === 2 && (
          <Card className="animate-in fade-in slide-in-from-right-4 duration-500 shadow-sm border border-gray-200 rounded-xl">
            <CardHeader className="bg-blue-600 text-white rounded-t-xl">
              <CardTitle className="flex items-center gap-2 text-2xl">
                <GraduationCap className="h-6 w-6" />
                Academic Information
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="currentCourse" className="required">Course *</Label>
                  <Select value={profileData.currentCourse} onValueChange={(value) => updateField('currentCourse', value)}>
                    <SelectTrigger className="mt-1" data-testid="select-course">
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
                </div>

                <div>
                  <Label htmlFor="career" className="required">Year *</Label>
                  <Select value={profileData.career} onValueChange={(value) => updateField('career', value)}>
                    <SelectTrigger className="mt-1" data-testid="select-year">
                      <SelectValue placeholder="Select your current year" />
                    </SelectTrigger>
                    <SelectContent>
                      {CAREER_STAGES.map((stage) => (
                        <SelectItem key={stage} value={stage}>
                          {stage}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="primaryStream" className="required">Academic Stream *</Label>
                  <Select value={profileData.primaryStream} onValueChange={(value) => updateField('primaryStream', value)}>
                    <SelectTrigger className="mt-1" data-testid="select-stream">
                      <SelectValue placeholder="Select your academic stream" />
                    </SelectTrigger>
                    <SelectContent>
                      {STREAMS.map((stream) => (
                        <SelectItem key={stream} value={stream}>
                          {stream}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="specialization">Specialization</Label>
                  <Input
                    id="specialization"
                    value={profileData.specialization}
                    onChange={(e) => updateField('specialization', e.target.value)}
                    placeholder="e.g., Computer Science, Marketing, etc."
                    className="mt-1"
                    data-testid="input-specialization"
                  />
                </div>
              </div>

              {/* Navigation Buttons */}
              <div className="flex justify-between pt-4">
                <Button 
                  onClick={handleBack} 
                  variant="outline" 
                  className="gap-2"
                  data-testid="button-back-step2"
                >
                  <ChevronLeft className="h-4 w-4" /> Back
                </Button>
                <Button 
                  onClick={handleNext} 
                  className="gap-2 bg-blue-600 hover:bg-blue-700"
                  data-testid="button-next-step2"
                >
                  Next <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Portfolio & Interests */}
        {step === 3 && (
          <Card className="animate-in fade-in slide-in-from-right-4 duration-500 shadow-xl border-t-4 border-t-green-500">
            <CardHeader className="bg-gradient-to-r from-green-500 to-green-600 text-white rounded-t-lg">
              <CardTitle className="flex items-center gap-2 text-2xl">
                <Briefcase className="h-6 w-6" />
                Portfolio
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              {/* Skills */}
              <div>
                <Label className="text-base font-semibold">Skills *</Label>
                <p className="text-sm text-gray-500 mb-3">Select your technical and professional skills</p>
                <div className="flex flex-wrap gap-2 mb-3">
                  {profileData.skills.map((skill) => (
                    <Badge key={skill} variant="default" className="gap-1 bg-blue-600 hover:bg-blue-700">
                      {skill}
                      <button onClick={() => removeSkill(skill)} className="ml-1 hover:text-red-200">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <div className="relative mb-2">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search skills..."
                    value={skillsSearch}
                    onChange={(e) => setSkillsSearch(e.target.value)}
                    className="pl-9"
                    data-testid="input-search-skills"
                  />
                </div>
                <Select onValueChange={(skill) => { addSkill(skill); setSkillsSearch(""); }}>
                  <SelectTrigger data-testid="select-skills">
                    <SelectValue placeholder="Add skills..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {[...SKILLS_OPTIONS, ...GENERAL_SKILLS_OPTIONS]
                      .sort()
                      .filter((skill) => skill.toLowerCase().includes(skillsSearch.toLowerCase()))
                      .map((skill) => (
                        <SelectItem key={skill} value={skill}>
                          {skill}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Interests */}
              <div>
                <Label className="text-base font-semibold">Interests *</Label>
                <p className="text-sm text-gray-500 mb-3">Select your academic and professional interests</p>
                <div className="flex flex-wrap gap-2 mb-3">
                  {profileData.interests.map((interest) => (
                    <Badge key={interest} variant="default" className="gap-1 bg-blue-600 hover:bg-blue-700">
                      {interest}
                      <button onClick={() => removeInterest(interest)} className="ml-1 hover:text-red-200">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <div className="relative mb-2">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search interests..."
                    value={interestsSearch}
                    onChange={(e) => setInterestsSearch(e.target.value)}
                    className="pl-9"
                    data-testid="input-search-interests"
                  />
                </div>
                <Select onValueChange={(interest) => { addInterest(interest); setInterestsSearch(""); }}>
                  <SelectTrigger data-testid="select-interests">
                    <SelectValue placeholder="Add interests..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {INTERESTS_OPTIONS
                      .filter((interest) => interest.toLowerCase().includes(interestsSearch.toLowerCase()))
                      .map((interest) => (
                        <SelectItem key={interest} value={interest}>
                          {interest}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Passions */}
              <div>
                <Label className="text-base font-semibold">Passions</Label>
                <p className="text-sm text-gray-500 mb-3">Select your hobbies and personal interests</p>
                <div className="flex flex-wrap gap-2 mb-3">
                  {profileData.passions.map((passion) => (
                    <Badge key={passion} variant="default" className="gap-1 bg-green-600 hover:bg-green-700">
                      {passion}
                      <button onClick={() => removePassion(passion)} className="ml-1 hover:text-red-200">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <div className="relative mb-2">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search passions..."
                    value={passionsSearch}
                    onChange={(e) => setPassionsSearch(e.target.value)}
                    className="pl-9"
                    data-testid="input-search-passions"
                  />
                </div>
                <Select onValueChange={(passion) => { addPassion(passion); setPassionsSearch(""); }}>
                  <SelectTrigger data-testid="select-passions">
                    <SelectValue placeholder="Add passions..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {PASSIONS_OPTIONS
                      .filter((passion) => passion.toLowerCase().includes(passionsSearch.toLowerCase()))
                      .map((passion) => (
                        <SelectItem key={passion} value={passion}>
                          {passion}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Navigation Buttons */}
              <div className="flex justify-between pt-4">
                <Button 
                  onClick={handleBack} 
                  variant="outline" 
                  className="gap-2"
                  data-testid="button-back-step3"
                >
                  <ChevronLeft className="h-4 w-4" /> Back
                </Button>
                <Button 
                  onClick={handleSubmit} 
                  className="gap-2 bg-green-600 hover:bg-green-700"
                  disabled={loading}
                  data-testid="button-save-profile"
                >
                  <Check className="h-4 w-4" /> {loading ? 'Saving...' : 'Save Profile'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
