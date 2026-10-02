import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Briefcase, Building2, User, Loader2, AlertTriangle, Code, Palette, PenTool, Rocket, Users, DollarSign, ArrowRight, CheckCircle2, Sparkles, Heart, Award, UserCheck, GraduationCap, ClipboardList, Target } from "lucide-react";
import { useLancingAuth } from "@/hooks/use-lancing-auth";
import { useLocation, Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import SEOHead from "@/components/seo/seo-head";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function LancingRoleSelect() {
  const [selectedRole, setSelectedRole] = useState<"freelancer" | "company" | "angel" | "placement_cell" | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const { selectRole, logout, isAuthenticated, hasSelectedRole, role, isLoading: authLoading } = useLancingAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    if (authLoading || redirecting) return;
    
    if (!isAuthenticated) {
      setRedirecting(true);
      setLocation("/lancing/login");
      return;
    }

    if (hasSelectedRole) {
      setRedirecting(true);
      if (role === "freelancer") {
        setLocation("/lancing/freelancer-profile");
      } else if (role === "company") {
        setLocation("/lancing/company-profile");
      } else if (role === "angel") {
        setLocation("/lancing/angel-profile");
      } else if (role === "placement_cell") {
        setLocation("/lancing/placement-cell-profile");
      }
      return;
    }
  }, [authLoading, isAuthenticated, hasSelectedRole, role, setLocation, redirecting]);

  const handleRoleClick = (clickedRole: "freelancer" | "company" | "angel" | "placement_cell") => {
    setSelectedRole(clickedRole);
    setShowConfirmDialog(true);
  };

  const handleConfirmRole = async () => {
    if (!selectedRole) return;
    
    setIsSubmitting(true);
    try {
      await selectRole(selectedRole);
      const roleLabels: Record<string, string> = { freelancer: "Freelancer", company: "Company/Recruiter", angel: "Angel Recruiter", placement_cell: "Placement Cell" };
      toast({ 
        title: "Role selected!",
        description: `You've chosen to join as a ${roleLabels[selectedRole]}`
      });
      if (selectedRole === "freelancer") {
        setLocation("/lancing/freelancer-profile");
      } else if (selectedRole === "company") {
        setLocation("/lancing/company-profile");
      } else if (selectedRole === "angel") {
        setLocation("/lancing/angel-profile");
      } else {
        setLocation("/lancing/placement-cell-profile");
      }
    } catch (error: any) {
      toast({ 
        title: "Failed to select role",
        description: error.message || "Please try again",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
      setShowConfirmDialog(false);
    }
  };

  // Show role selection immediately - redirects happen in background
  if (redirecting) {
    return null; // Already redirected, don't show anything
  }

  return (
    <div className="min-h-screen sl-bg-atmosphere sl-grain-overlay relative overflow-hidden">
      <SEOHead
        title="Choose Your Role - StudentLancing"
        description="Select your role to get started on StudentLancing"
      />

      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-br from-emerald-200/40 to-green-300/30 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-gradient-to-br from-teal-200/30 to-cyan-200/20 rounded-full blur-3xl" />
      </div>

      {/* Navigation */}
      <nav className="relative z-10 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/student-lancing" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow">
              <Briefcase className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight" >
              Student<span className="text-sky-600">Lancing</span>
            </span>
          </Link>
          <Button
            variant="outline"
            size="sm"
            onClick={logout}
            className="flex items-center gap-2 rounded-xl border-gray-200 text-gray-600 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-colors"
          >
            <ArrowRight className="w-4 h-4 rotate-180" />
            Logout
          </Button>
        </div>
      </nav>

      <div className="relative z-10 max-w-5xl mx-auto px-6 py-12 lg:py-20">
        {/* Header */}
        <div className="text-center mb-12 sl-slide-up">
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold bg-sky-100 text-sky-700 mb-6" >
            <Rocket className="w-4 h-4" />
            Almost There!
          </span>
          
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4" >
            <span className="text-gray-900">How will you use</span>
            <br />
            <span className="bg-gradient-to-r from-sky-600 via-green-500 to-teal-500 bg-clip-text text-transparent">StudentLancing?</span>
          </h1>
          
          <p className="text-lg text-gray-600 max-w-xl mx-auto" >
            Choose your path. This decision shapes your entire experience.
          </p>
        </div>

        {/* Role Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto mb-12">
          {/* Freelancer Card */}
          <Card 
            className={`cursor-pointer transition-all duration-300 hover:shadow-2xl border-2 rounded-3xl overflow-hidden group sl-scale-in sl-stagger-1 ${
              selectedRole === "freelancer" 
                ? "border-sky-500 shadow-xl bg-gradient-to-br from-emerald-50 to-white" 
                : "border-gray-100 hover:border-emerald-300 bg-white/80 backdrop-blur-sm"
            }`}
            onClick={() => handleRoleClick("freelancer")}
            data-testid="card-role-freelancer"
          >
            <CardContent className="p-6">
              <div className="w-16 h-16 bg-gradient-to-br from-sky-500 to-blue-600 rounded-2xl flex items-center justify-center mb-5 shadow-lg group-hover:shadow-xl group-hover:scale-105 transition-all">
                <User className="w-8 h-8 text-white" />
              </div>
              
              <h3 className="text-xl font-bold text-gray-900 mb-2" >Freelancer</h3>
              <p className="text-gray-600 text-sm mb-5" >
                Showcase skills and land paid projects
              </p>
              
              <ul className="space-y-2.5 mb-6">
                {[
                  { icon: Code, text: "Browse & apply to projects" },
                  { icon: Palette, text: "Build your portfolio" },
                  { icon: DollarSign, text: "Earn money freelancing" },
                  { icon: Rocket, text: "Gain real experience" }
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-2.5 text-sm text-gray-600" >
                    <div className="w-5 h-5 rounded-full bg-sky-100 flex items-center justify-center flex-shrink-0">
                      <item.icon className="w-3 h-3 text-sky-600" />
                    </div>
                    {item.text}
                  </li>
                ))}
              </ul>
              
              <Button 
                className="w-full h-12 rounded-xl font-bold bg-gradient-to-r from-sky-600 to-blue-500 hover:from-emerald-700 hover:to-blue-600 text-white shadow-lg shadow-sky-500/25 group-hover:shadow-sky-500/40 transition-all text-sm"
                
                data-testid="button-select-freelancer"
              >
                Continue as Freelancer
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </CardContent>
          </Card>

          {/* Company Card */}
          <Card 
            className={`cursor-pointer transition-all duration-300 hover:shadow-2xl border-2 rounded-3xl overflow-hidden group sl-scale-in sl-stagger-2 ${
              selectedRole === "company" 
                ? "border-teal-500 shadow-xl bg-gradient-to-br from-teal-50 to-white" 
                : "border-gray-100 hover:border-teal-300 bg-white/80 backdrop-blur-sm"
            }`}
            onClick={() => handleRoleClick("company")}
            data-testid="card-role-company"
          >
            <CardContent className="p-6">
              <div className="w-16 h-16 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-2xl flex items-center justify-center mb-5 shadow-lg group-hover:shadow-xl group-hover:scale-105 transition-all">
                <Building2 className="w-8 h-8 text-white" />
              </div>
              
              <h3 className="text-xl font-bold text-gray-900 mb-2" >Company</h3>
              <p className="text-gray-600 text-sm mb-5" >
                Post jobs and hire student talent
              </p>
              
              <ul className="space-y-2.5 mb-6">
                {[
                  { icon: PenTool, text: "Post job listings" },
                  { icon: Users, text: "Review applications" },
                  { icon: CheckCircle2, text: "Hire student talent" },
                  { icon: Rocket, text: "Manage projects" }
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-2.5 text-sm text-gray-600" >
                    <div className="w-5 h-5 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0">
                      <item.icon className="w-3 h-3 text-teal-600" />
                    </div>
                    {item.text}
                  </li>
                ))}
              </ul>
              
              <Button 
                className="w-full h-12 rounded-xl font-bold bg-gradient-to-r from-teal-600 to-cyan-500 hover:from-teal-700 hover:to-cyan-600 text-white shadow-lg shadow-teal-500/25 group-hover:shadow-teal-500/40 transition-all text-sm"
                
                data-testid="button-select-company"
              >
                Continue as Company
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </CardContent>
          </Card>

          {/* Angel Recruiter Card */}
          <Card 
            className={`cursor-pointer transition-all duration-300 hover:shadow-2xl border-2 rounded-3xl overflow-hidden group sl-scale-in sl-stagger-3 ${
              selectedRole === "angel" 
                ? "border-purple-500 shadow-xl bg-gradient-to-br from-purple-50 to-white" 
                : "border-gray-100 hover:border-purple-300 bg-white/80 backdrop-blur-sm"
            }`}
            onClick={() => handleRoleClick("angel")}
            data-testid="card-role-angel"
          >
            <CardContent className="p-6">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center mb-5 shadow-lg group-hover:shadow-xl group-hover:scale-105 transition-all">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              
              <h3 className="text-xl font-bold text-gray-900 mb-2" >Angel Recruiter</h3>
              <p className="text-gray-600 text-sm mb-5" >
                Individual recruiter helping students grow
              </p>
              
              <ul className="space-y-2.5 mb-6">
                {[
                  { icon: Heart, text: "Mentor student talent" },
                  { icon: Award, text: "Post internships & tasks" },
                  { icon: UserCheck, text: "Build student careers" },
                  { icon: Sparkles, text: "Personal recruiting" }
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-2.5 text-sm text-gray-600" >
                    <div className="w-5 h-5 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                      <item.icon className="w-3 h-3 text-purple-600" />
                    </div>
                    {item.text}
                  </li>
                ))}
              </ul>
              
              <Button 
                className="w-full h-12 rounded-xl font-bold bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600 text-white shadow-lg shadow-purple-500/25 group-hover:shadow-purple-500/40 transition-all text-sm"
                
                data-testid="button-select-angel"
              >
                Continue as Angel
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </CardContent>
          </Card>

          {/* Placement Cell Card */}
          <Card 
            className={`cursor-pointer transition-all duration-300 hover:shadow-2xl border-2 rounded-3xl overflow-hidden group sl-scale-in sl-stagger-4 ${
              selectedRole === "placement_cell" 
                ? "border-indigo-500 shadow-xl bg-gradient-to-br from-indigo-50 to-white" 
                : "border-gray-100 hover:border-indigo-300 bg-white/80 backdrop-blur-sm"
            }`}
            onClick={() => handleRoleClick("placement_cell")}
            data-testid="card-role-placement-cell"
          >
            <CardContent className="p-6">
              <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-2xl flex items-center justify-center mb-5 shadow-lg group-hover:shadow-xl group-hover:scale-105 transition-all">
                <GraduationCap className="w-8 h-8 text-white" />
              </div>
              
              <h3 className="text-xl font-bold text-gray-900 mb-2">Placement Cell</h3>
              <p className="text-gray-600 text-sm mb-5">
                College officials managing campus placement drives
              </p>
              
              <ul className="space-y-2.5 mb-6">
                {[
                  { icon: ClipboardList, text: "Post campus drives" },
                  { icon: Users, text: "Manage applicants" },
                  { icon: Target, text: "Eligibility-based shortlisting" },
                  { icon: Award, text: "Run drive assessments" }
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-2.5 text-sm text-gray-600">
                    <div className="w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                      <item.icon className="w-3 h-3 text-indigo-600" />
                    </div>
                    {item.text}
                  </li>
                ))}
              </ul>
              
              <Button 
                className="w-full h-12 rounded-xl font-bold bg-gradient-to-r from-indigo-600 to-violet-500 hover:from-indigo-700 hover:to-violet-600 text-white shadow-lg shadow-indigo-500/25 group-hover:shadow-indigo-500/40 transition-all text-sm"
                data-testid="button-select-placement-cell"
              >
                Continue as Placement Cell
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Warning Notice */}
        <div className="max-w-2xl mx-auto sl-fade-in">
          <div className="flex items-start gap-4 p-5 bg-amber-50/80 backdrop-blur-sm border border-amber-200 rounded-2xl">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h4 className="font-bold text-amber-900 mb-1" >Permanent Choice</h4>
              <p className="text-sm text-amber-800" >
                Your role selection cannot be changed later. Choose the option that best fits how you want to use StudentLancing.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent className="rounded-3xl border-0 shadow-2xl max-w-md">
          <AlertDialogHeader>
            <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center shadow-lg ${
              selectedRole === "freelancer" 
                ? "bg-gradient-to-br from-sky-500 to-blue-600" 
                : selectedRole === "company"
                ? "bg-gradient-to-br from-teal-500 to-cyan-600"
                : selectedRole === "angel"
                ? "bg-gradient-to-br from-purple-500 to-pink-600"
                : "bg-gradient-to-br from-indigo-500 to-violet-600"
            }`}>
              {selectedRole === "freelancer" ? <User className="w-8 h-8 text-white" /> : 
               selectedRole === "company" ? <Building2 className="w-8 h-8 text-white" /> :
               selectedRole === "angel" ? <Sparkles className="w-8 h-8 text-white" /> :
               <GraduationCap className="w-8 h-8 text-white" />}
            </div>
            <AlertDialogTitle className="text-2xl text-center" >
              Confirm Your Role
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center text-base" >
              You're about to join as a{" "}
              <strong className="text-gray-900">
                {selectedRole === "freelancer" ? "Freelancer" : selectedRole === "company" ? "Company" : selectedRole === "angel" ? "Angel Recruiter" : "Placement Cell"}
              </strong>. 
              <br />
              <span className="text-amber-600 font-medium">This choice is permanent.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-3 sm:gap-3">
            <AlertDialogCancel className="rounded-xl h-12 font-semibold" >
              Go Back
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmRole}
              disabled={isSubmitting}
              className={`rounded-xl h-12 font-semibold shadow-lg ${
                selectedRole === "freelancer" 
                  ? "bg-gradient-to-r from-sky-600 to-blue-500 shadow-sky-500/25" 
                  : selectedRole === "company"
                  ? "bg-gradient-to-r from-teal-600 to-cyan-500 shadow-teal-500/25"
                  : selectedRole === "angel"
                  ? "bg-gradient-to-r from-purple-600 to-pink-500 shadow-purple-500/25"
                  : "bg-gradient-to-r from-indigo-600 to-violet-500 shadow-indigo-500/25"
              }`}
              
            >
              {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : (
                <>
                  Confirm Selection
                  <CheckCircle2 className="w-5 h-5 ml-2" />
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
