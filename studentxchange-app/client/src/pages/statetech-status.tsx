import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useCollabAuth } from "@/hooks/use-collab-auth";
import { useToast } from "@/hooks/use-toast";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import app from "@/lib/firebase";
import { 
  ArrowLeft, Clock, CheckCircle, User, Rocket, 
  Loader2, Shield, Star, ExternalLink, UserPlus
} from "lucide-react";

const db = getFirestore(app);
const auth = getAuth(app);

export default function StatetechStatus() {
  const [, setLocation] = useLocation();
  const { user, status } = useCollabAuth();
  const { toast } = useToast();
  const [registration, setRegistration] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLinking, setIsLinking] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.uid) return;
      try {
        const regRef = doc(db, "statetech_registrations", user.uid);
        const regSnap = await getDoc(regRef);
        
        if (regSnap.exists()) {
          setRegistration(regSnap.data());
        } else {
          toast({ title: "No registration found", description: "Please complete registration first.", variant: "destructive" });
          setLocation('/statetech-2026/register');
          return;
        }

        const profileRef = doc(db, "collab_profiles", user.uid);
        const profileSnap = await getDoc(profileRef);
        if (profileSnap.exists()) {
          setProfile(profileSnap.data());
        }
      } catch (err) {
        console.error("Error fetching data:", err);
        toast({ title: "Error", description: "Failed to load registration status", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    };

    if (user?.uid) {
      fetchData();
    } else if (status === 'unauthenticated') {
      setIsLoading(false);
    }
  }, [user?.uid, status, setLocation, toast]);

  const handleLinkProfile = async () => {
    if (!user?.uid || !profile) return;
    
    setIsLinking(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) {
        toast({ title: "Error", description: "Please log in again", variant: "destructive" });
        return;
      }

      const response = await fetch('/api/collab/social/statetech/link-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to link profile');
      }

      setRegistration((prev: any) => ({
        ...prev,
        profileLinked: true,
        verificationPriority: 'high'
      }));

      toast({ 
        title: "Profile linked successfully!", 
        description: "Your registration now has priority verification status." 
      });
    } catch (err) {
      console.error("Link error:", err);
      toast({ title: "Error", description: "Failed to link profile. Please try again.", variant: "destructive" });
    } finally {
      setIsLinking(false);
    }
  };

  const getStatusBadge = () => {
    const verificationStatus = registration?.verificationStatus;
    
    if (verificationStatus === 'verified') {
      return (
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/20 border border-green-500/30">
          <CheckCircle className="h-5 w-5 text-green-400" />
          <span className="text-green-300 font-medium">Verified</span>
        </div>
      );
    }
    
    return (
      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/20 border border-blue-500/30">
        <Clock className="h-5 w-5 text-blue-400" />
        <span className="text-blue-300 font-medium">Verification Pending</span>
      </div>
    );
  };

  if (isLoading || status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-800 via-blue-800/80 to-indigo-900/90 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
      </div>
    );
  }

  if (status === 'unauthenticated' || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-800 via-blue-800/80 to-indigo-900/90">
        <div className="max-w-2xl mx-auto px-4 py-8">
          <Button
            variant="ghost"
            className="text-blue-200 hover:text-white hover:bg-white/10 mb-6"
            onClick={() => setLocation('/statetech-2026')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to STATETECH
          </Button>

          <Card className="border-0 shadow-xl bg-white/5 backdrop-blur">
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center mx-auto mb-4">
                <User className="h-8 w-8 text-blue-400" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-4">View Your Registration Status</h2>
              <p className="text-blue-200 mb-6">
                Sign in to view your STATETECH registration details and status.
              </p>
              <Button
                className="bg-blue-600 hover:bg-blue-700 text-white"
                onClick={() => setLocation('/student-collab')}
              >
                Sign In to View Status
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const isProfileLinked = registration?.profileLinked;
  const hasProfile = !!profile;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-800 via-blue-800/80 to-indigo-900/90">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Button
          variant="ghost"
          className="text-blue-200 hover:text-white hover:bg-white/10 mb-6"
          onClick={() => setLocation('/statetech-2026')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to STATETECH
        </Button>

        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center">
              <Rocket className="h-8 w-8 text-blue-400" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            Registration Submitted!
          </h1>
          <p className="text-blue-200">
            Thank you for registering for STATETECH SHOWCASE 2026
          </p>
        </div>

        <Card className="border-0 shadow-xl bg-white/5 backdrop-blur mb-6">
          <CardContent className="p-6 text-center">
            <div className="mb-4">
              {getStatusBadge()}
            </div>
            <p className="text-blue-100">
              Your registration has been received and is currently under verification.
            </p>
            
            {isProfileLinked && (
              <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20">
                <Star className="h-4 w-4 text-yellow-400" />
                <span className="text-green-300 text-sm">Priority Verification</span>
              </div>
            )}
          </CardContent>
        </Card>

        {!isProfileLinked && (
          <Card className="border-0 shadow-xl bg-gradient-to-br from-blue-600/20 to-purple-600/20 backdrop-blur mb-6 border border-blue-500/20">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                  <Shield className="h-6 w-6 text-blue-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-white mb-2">
                    Want Faster Verification?
                  </h3>
                  <p className="text-blue-200 text-sm mb-4 leading-relaxed">
                    Participants with a completed Student Collab profile are verified earlier.
                    Creating your profile helps us confirm your details quickly and keeps you
                    updated about event announcements, certificates, and results.
                  </p>
                  
                  <div className="space-y-3">
                    {hasProfile ? (
                      <Button
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                        onClick={handleLinkProfile}
                        disabled={isLinking}
                      >
                        {isLinking ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Linking Profile...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Link My Profile for Priority Verification
                          </>
                        )}
                      </Button>
                    ) : (
                      <Button
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                        onClick={() => setLocation('/student-collab/profile/create')}
                      >
                        <UserPlus className="h-4 w-4 mr-2" />
                        Create / Complete Profile
                      </Button>
                    )}
                    
                    {!hasProfile && (
                      <button
                        className="w-full text-center text-blue-300 hover:text-white text-sm underline-offset-2 hover:underline transition-colors"
                        onClick={() => setLocation('/student-collab')}
                      >
                        I already have a profile
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="border-0 shadow-xl bg-white/5 backdrop-blur">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <User className="h-5 w-5 text-blue-400" />
              Registration Details
            </h3>
            
            <div className="space-y-3 text-sm">
              <div className="flex justify-between py-2 border-b border-white/10">
                <span className="text-blue-300">Team Lead</span>
                <span className="text-white">{registration?.leadName}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-white/10">
                <span className="text-blue-300">Category</span>
                <span className="text-white capitalize">{registration?.category?.replace('_', ' ')}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-white/10">
                <span className="text-blue-300">College</span>
                <span className="text-white">{registration?.collegeName}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-white/10">
                <span className="text-blue-300">Payment Status</span>
                <span className={`capitalize ${
                  registration?.paymentStatus === 'paid' || registration?.paymentStatus === 'exempt' 
                    ? 'text-green-400' 
                    : 'text-yellow-400'
                }`}>
                  {registration?.paymentStatus === 'exempt' ? 'Free (12th Science)' : registration?.paymentStatus}
                </span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-blue-300">Registration Date</span>
                <span className="text-white">
                  {registration?.createdAt?.toDate?.()?.toLocaleDateString() || 'N/A'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 text-center">
          <Button
            variant="outline"
            className="border-blue-500/30 text-blue-300 hover:bg-blue-500/10"
            onClick={() => setLocation('/statetech-2026')}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            View Event Details
          </Button>
        </div>

        <footer className="text-center py-8 mt-8 border-t border-white/10">
          <p className="text-blue-300 text-xs">
            Questions? Contact us at statetech@adypu.edu.in
          </p>
        </footer>
      </div>
    </div>
  );
}
