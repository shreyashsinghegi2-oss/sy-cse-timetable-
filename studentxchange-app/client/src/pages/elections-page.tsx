import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Plus, Trash2, Upload, Loader2, Vote, Users, AlertCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { useLocation } from "wouter";
import { useCollabAuth } from "@/hooks/use-collab-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface Nominee {
  id: string;
  name: string;
  role: 'President' | 'Secretary' | 'Treasurer';
  club: string;
  bio: string;
  imageUrl: string;
  votesCount: number;
  createdAt: string;
}

interface Vote {
  id: string;
  userId: string;
  nomineeId: string;
  role: string;
  club: string;
  createdAt: string;
}

const CLUBS = ['Aero Club', 'Space Club', 'Def & Av Club'];
const ROLES: Array<'President' | 'Secretary' | 'Treasurer'> = ['President', 'Secretary', 'Treasurer'];

export default function ElectionsPage() {
  const [location, setLocation] = useLocation();
  const { user, token } = useCollabAuth();
  const { toast } = useToast();
  const [showAdminForm, setShowAdminForm] = useState(false);
  const [selectedClub, setSelectedClub] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<'President' | 'Secretary' | 'Treasurer'>('President');
  const [uploadingImage, setUploadingImage] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    role: '' as 'President' | 'Secretary' | 'Treasurer' | '',
    club: '',
    bio: '',
    imageUrl: ''
  });
  const [imageFile, setImageFile] = useState<File | null>(null);

  // Fetch user data to check admin role
  const { data: userData } = useQuery({
    queryKey: ['/api/user'],
    enabled: !!user
  });

  // Admin check based on user role from database
  const isAdmin = (userData as any)?.role === 'admin';

  // Fetch nominees
  const { data: nominees = [], isLoading: loadingNominees } = useQuery<Nominee[]>({
    queryKey: ['/api/collab/elections/nominees'],
    enabled: !!user && !!token
  });

  // Fetch user's votes
  const { data: userVotes = [], isLoading: loadingVotes } = useQuery<Vote[]>({
    queryKey: ['/api/collab/elections/my-votes'],
    enabled: !!user && !!token && !isAdmin
  });

  // Fetch user's voted club
  const { data: votedClubData } = useQuery<{ club: string | null }>({
    queryKey: ['/api/collab/elections/my-voted-club'],
    enabled: !!user && !!token && !isAdmin
  });

  const userVotedClub = votedClubData?.club || null;

  // Auto-select club if user has already voted
  useEffect(() => {
    if (userVotedClub && !selectedClub) {
      setSelectedClub(userVotedClub);
    }
  }, [userVotedClub, selectedClub]);

  // Group nominees by club and role
  const nomineesByClub = nominees.reduce((acc, nominee) => {
    if (!acc[nominee.club]) {
      acc[nominee.club] = {};
    }
    if (!acc[nominee.club][nominee.role]) {
      acc[nominee.club][nominee.role] = [];
    }
    acc[nominee.club][nominee.role].push(nominee);
    return acc;
  }, {} as Record<string, Record<string, Nominee[]>>);

  // Check if user has voted for a specific role
  const hasVotedForRole = (role: string) => {
    return userVotes.some(vote => vote.role === role);
  };

  // Check if user voted for a specific nominee
  const hasVotedForNominee = (nomineeId: string) => {
    return userVotes.some(vote => vote.nomineeId === nomineeId);
  };

  // Image upload handler - uses server-side upload
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageFile(file);
    setUploadingImage(true);

    try {
      // Upload via server endpoint
      const formData = new FormData();
      formData.append('photo', file);

      const response = await fetch('/api/collab/elections/upload-nominee-photo', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }

      const data = await response.json();
      setFormData(prev => ({ ...prev, imageUrl: data.url }));
      toast({
        title: "✅ Image Uploaded",
        description: "Nominee photo uploaded successfully"
      });
    } catch (error: any) {
      console.error('Image upload error:', error);
      
      toast({
        title: "❌ Upload Failed",
        description: error?.message || 'Failed to upload image',
        variant: "destructive"
      });
    } finally {
      setUploadingImage(false);
    }
  };

  // Create nominee mutation
  const createNomineeMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return apiRequest('POST', '/api/collab/elections/nominees', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/collab/elections/nominees'] });
      toast({
        title: "✅ Nominee Added",
        description: "Nominee has been added successfully"
      });
      setShowAdminForm(false);
      setFormData({ name: '', role: '', club: '', bio: '', imageUrl: '' });
      setImageFile(null);
    },
    onError: () => {
      toast({
        title: "❌ Failed",
        description: "Failed to add nominee",
        variant: "destructive"
      });
    }
  });

  // Delete nominee mutation
  const deleteNomineeMutation = useMutation({
    mutationFn: async (nomineeId: string) => {
      return apiRequest('DELETE', `/api/collab/elections/nominees/${nomineeId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/collab/elections/nominees'] });
      toast({
        title: "✅ Nominee Deleted",
        description: "Nominee has been removed"
      });
    },
    onError: () => {
      toast({
        title: "❌ Failed",
        description: "Failed to delete nominee",
        variant: "destructive"
      });
    }
  });

  // Vote mutation
  const voteMutation = useMutation({
    mutationFn: async ({ nomineeId, role, club }: { nomineeId: string; role: string; club: string }) => {
      return apiRequest('POST', '/api/collab/elections/vote', { nomineeId, role, club });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/collab/elections/my-votes'] });
      queryClient.invalidateQueries({ queryKey: ['/api/collab/elections/my-voted-club'] });
      queryClient.invalidateQueries({ queryKey: ['/api/collab/elections/nominees'] });
      toast({
        title: "✅ Vote Recorded",
        description: "Your vote has been successfully recorded"
      });
    },
    onError: (error: any) => {
      toast({
        title: "❌ Vote Failed",
        description: error.message || "Failed to record vote",
        variant: "destructive"
      });
    }
  });

  const handleSubmitNominee = () => {
    if (!formData.name || !formData.role || !formData.club || !formData.bio || !formData.imageUrl) {
      toast({
        title: "❌ Incomplete Form",
        description: "Please fill all fields and upload an image",
        variant: "destructive"
      });
      return;
    }
    createNomineeMutation.mutate(formData);
  };

  const getRoleIndex = () => ROLES.indexOf(selectedRole);
  
  const handleNextRole = () => {
    const currentIndex = getRoleIndex();
    if (currentIndex < ROLES.length - 1) {
      setSelectedRole(ROLES[currentIndex + 1]);
    }
  };

  const handlePrevRole = () => {
    const currentIndex = getRoleIndex();
    if (currentIndex > 0) {
      setSelectedRole(ROLES[currentIndex - 1]);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <h2 className="text-2xl font-bold mb-4">Login Required</h2>
            <p className="text-gray-600 mb-6">You must be logged in to access this page</p>
            <Button onClick={() => setLocation("/student-collab")} className="w-full">
              Go to Student Collab
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Admin-only access control
  if (userData && !isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-16 w-16 text-orange-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-4">Admin Access Only</h2>
            <p className="text-gray-600 mb-6">This page is restricted to administrators only.</p>
            <Button onClick={() => setLocation("/student-collab")} className="w-full">
              Go to Student Collab
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 pb-24">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setLocation("/student-collab")}
              data-testid="button-back"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">🗳️ Club Elections 2025</h1>
              <p className="text-gray-600 mt-1">
                {isAdmin ? 'Manage nominees and view results' : 'Vote for President, Secretary, and Treasurer in ONE club'}
              </p>
            </div>
          </div>
          
          {isAdmin && (
            <Button 
              onClick={() => setShowAdminForm(true)}
              className="bg-gradient-to-r from-blue-600 to-indigo-600"
              data-testid="button-add-nominee"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Nominee
            </Button>
          )}
        </div>

        {/* Admin View */}
        {isAdmin ? (
          <Tabs defaultValue={CLUBS[0]} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              {CLUBS.map(club => (
                <TabsTrigger key={club} value={club}>{club}</TabsTrigger>
              ))}
            </TabsList>
            
            {CLUBS.map(club => (
              <TabsContent key={club} value={club} className="space-y-6">
                <Tabs defaultValue="President" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    {ROLES.map(role => (
                      <TabsTrigger key={role} value={role}>{role}</TabsTrigger>
                    ))}
                  </TabsList>
                  
                  {ROLES.map(role => (
                    <TabsContent key={role} value={role}>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
                        {nomineesByClub[club]?.[role]?.map((nominee) => (
                          <Card key={nominee.id} className="relative">
                            <CardContent className="p-6">
                              <Button
                                size="icon"
                                variant="destructive"
                                className="absolute top-2 right-2"
                                onClick={() => deleteNomineeMutation.mutate(nominee.id)}
                                data-testid={`button-delete-${nominee.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                              
                              <div className="text-center mb-4">
                                <Avatar className="h-24 w-24 mx-auto mb-3">
                                  <AvatarImage src={nominee.imageUrl} alt={nominee.name} />
                                  <AvatarFallback>
                                    {nominee.name.split(' ').map(n => n[0]).join('')}
                                  </AvatarFallback>
                                </Avatar>
                                <h4 className="text-lg font-bold">{nominee.name}</h4>
                                <Badge className="mt-2">{nominee.role}</Badge>
                                
                                {/* Vote Count - Admin Only */}
                                <div className="mt-3 p-2 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg">
                                  <div className="flex items-center justify-center gap-2">
                                    <Vote className="h-5 w-5 text-green-600" />
                                    <p className="text-lg font-bold text-green-700">
                                      {nominee.votesCount} {nominee.votesCount === 1 ? 'Vote' : 'Votes'}
                                    </p>
                                  </div>
                                </div>
                              </div>

                              <p className="text-sm text-gray-600">{nominee.bio}</p>
                            </CardContent>
                          </Card>
                        )) || (
                          <div className="col-span-3 text-center py-12 text-gray-500">
                            No nominees for {role}
                          </div>
                        )}
                      </div>
                    </TabsContent>
                  ))}
                </Tabs>
              </TabsContent>
            ))}
          </Tabs>
        ) : (
          /* User View */
          <>
            {/* One Club Warning */}
            {!userVotedClub && (
              <Card className="bg-yellow-50 border-yellow-200">
                <CardContent className="p-6">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-6 w-6 text-yellow-600 mt-0.5" />
                    <div>
                      <h3 className="font-semibold text-yellow-900">Important: One Club Rule</h3>
                      <p className="text-sm text-yellow-800 mt-1">
                        You can only vote in ONE club for all three roles (President, Secretary, Treasurer). 
                        Choose your club carefully - once you vote, you cannot switch to another club!
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Club Selection or Locked Club */}
            {!selectedClub ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {CLUBS.map((club) => (
                  <Card 
                    key={club}
                    className="cursor-pointer transition-all duration-200 hover:scale-105 hover:shadow-xl"
                    onClick={() => setSelectedClub(club)}
                    data-testid={`club-card-${club}`}
                  >
                    <CardContent className="p-6 text-center">
                      <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Users className="h-10 w-10 text-white" />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 mb-2">{club}</h3>
                      <p className="text-sm text-gray-600 mb-4">
                        {Object.values(nomineesByClub[club] || {}).flat().length || 0} Nominees
                      </p>
                      <Button className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                        Select & Vote
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="space-y-6">
                {/* Selected Club Header */}
                <Card className={`${userVotedClub ? 'bg-green-50 border-green-200' : 'bg-gradient-to-br from-blue-600 to-indigo-600'} border-0`}>
                  <CardContent className={`p-8 ${userVotedClub ? '' : 'text-white'}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h2 className="text-3xl font-bold mb-2">{selectedClub}</h2>
                        <p className={userVotedClub ? 'text-green-800' : 'text-white/90'}>
                          {userVotedClub ? '✓ You are voting in this club' : 'You selected this club - vote for each role below'}
                        </p>
                        
                        {/* Voting Progress */}
                        <div className="mt-4">
                          <div className="flex items-center gap-3">
                            <div className={`text-sm font-semibold ${userVotedClub ? 'text-green-700' : 'text-white/90'}`}>
                              Voting Progress: {userVotes.length}/3 Roles
                            </div>
                            <div className="flex-1 max-w-xs bg-gray-200 rounded-full h-3 overflow-hidden">
                              <div 
                                className="bg-green-500 h-full transition-all duration-500"
                                style={{ width: `${(userVotes.length / 3) * 100}%` }}
                              />
                            </div>
                            {userVotes.length === 3 && (
                              <Badge className="bg-green-600 text-white">Complete! ✓</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      {!userVotedClub && (
                        <Button 
                          variant="outline"
                          className="bg-white/20 text-white border-white/30 hover:bg-white/30"
                          onClick={() => setSelectedClub(null)}
                        >
                          Change Club
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Role Navigation */}
                <div className="flex items-center justify-between">
                  <Button
                    variant="outline"
                    onClick={handlePrevRole}
                    disabled={getRoleIndex() === 0}
                  >
                    <ChevronLeft className="h-4 w-4 mr-2" />
                    Previous
                  </Button>
                  
                  <div className="flex gap-2">
                    {ROLES.map((role, idx) => (
                      <Button
                        key={role}
                        variant={selectedRole === role ? "default" : "outline"}
                        onClick={() => setSelectedRole(role)}
                        className={hasVotedForRole(role) ? "bg-green-600" : ""}
                      >
                        {hasVotedForRole(role) && '✓ '}{role}
                      </Button>
                    ))}
                  </div>

                  <Button
                    variant="outline"
                    onClick={handleNextRole}
                    disabled={getRoleIndex() === ROLES.length - 1}
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>

                {/* Current Role Nominees */}
                <div>
                  <h3 className="text-2xl font-bold mb-4">{selectedRole}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {nomineesByClub[selectedClub]?.[selectedRole]?.map((nominee) => {
                      const votedForThis = hasVotedForNominee(nominee.id);
                      
                      return (
                        <Card 
                          key={nominee.id}
                          className={votedForThis ? 'border-4 border-green-500 shadow-xl' : ''}
                        >
                          <CardContent className="p-6">
                            {votedForThis && (
                              <div className="mb-3 p-2 bg-green-600 text-white text-center rounded-lg font-bold flex items-center justify-center gap-2">
                                <Vote className="h-4 w-4" />
                                YOUR VOTE
                              </div>
                            )}
                            
                            <div className="text-center mb-4">
                              <Avatar className="h-24 w-24 mx-auto mb-3">
                                <AvatarImage src={nominee.imageUrl} alt={nominee.name} />
                                <AvatarFallback>
                                  {nominee.name.split(' ').map(n => n[0]).join('')}
                                </AvatarFallback>
                              </Avatar>
                              <h4 className="text-lg font-bold">{nominee.name}</h4>
                            </div>

                            <p className="text-sm text-gray-600 mb-4">{nominee.bio}</p>

                            <Button
                              className={`w-full ${votedForThis ? 'bg-green-600 hover:bg-green-700' : ''}`}
                              onClick={() => voteMutation.mutate({
                                nomineeId: nominee.id,
                                role: nominee.role,
                                club: nominee.club
                              })}
                              disabled={hasVotedForRole(selectedRole) || voteMutation.isPending}
                              data-testid={`button-vote-${nominee.id}`}
                            >
                              {votedForThis ? (
                                <>
                                  <Vote className="h-4 w-4 mr-2" />
                                  ✓ You Voted for This
                                </>
                              ) : hasVotedForRole(selectedRole) ? '✓ Voted' : (
                                <>
                                  <Vote className="h-4 w-4 mr-2" />
                                  Vote
                                </>
                              )}
                            </Button>
                          </CardContent>
                        </Card>
                      );
                    }) || (
                      <div className="col-span-3 text-center py-12 text-gray-500">
                        No nominees for {selectedRole}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Admin Form Dialog */}
      <Dialog open={showAdminForm} onOpenChange={setShowAdminForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Nominee</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Full Name"
                data-testid="input-nominee-name"
              />
            </div>

            <div>
              <Label>Club</Label>
              <Select value={formData.club} onValueChange={(value) => setFormData(prev => ({ ...prev, club: value }))}>
                <SelectTrigger data-testid="select-nominee-club">
                  <SelectValue placeholder="Select Club" />
                </SelectTrigger>
                <SelectContent>
                  {CLUBS.map(club => (
                    <SelectItem key={club} value={club}>{club}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Role</Label>
              <Select value={formData.role} onValueChange={(value) => setFormData(prev => ({ ...prev, role: value as any }))}>
                <SelectTrigger data-testid="select-nominee-role">
                  <SelectValue placeholder="Select Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="President">President</SelectItem>
                  <SelectItem value="Secretary">Secretary</SelectItem>
                  <SelectItem value="Treasurer">Treasurer</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Bio / Information</Label>
              <Textarea
                value={formData.bio}
                onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                placeholder="Short bio or campaign message..."
                rows={3}
                data-testid="textarea-nominee-bio"
              />
            </div>

            <div>
              <Label>Profile Photo</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={uploadingImage}
                  data-testid="input-nominee-photo"
                />
                {uploadingImage && <Loader2 className="h-4 w-4 animate-spin" />}
              </div>
              {formData.imageUrl && (
                <img src={formData.imageUrl} alt="Preview" className="mt-2 w-20 h-20 rounded object-cover" />
              )}
            </div>

            <Button
              className="w-full"
              onClick={handleSubmitNominee}
              disabled={createNomineeMutation.isPending || uploadingImage}
              data-testid="button-submit-nominee"
            >
              {createNomineeMutation.isPending ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Adding...</>
              ) : (
                'Add Nominee'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
