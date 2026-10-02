import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Briefcase, Loader2, Mail, Lock, Eye, EyeOff, Zap, Users, TrendingUp, ArrowRight } from "lucide-react";
import { SiGoogle } from "react-icons/si";
import { useLancingAuth } from "@/hooks/use-lancing-auth";
import { useLocation, Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import SEOHead from "@/components/seo/seo-head";

export default function LancingLoginPage() {
  const [isLogin, setIsLogin] = useState(() => new URLSearchParams(window.location.search).get("mode") !== "signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  
  const { login, register, loginWithGoogle, registerWithGoogle, isAuthenticated, hasSelectedRole, role, isLoading: authLoading, dataLoaded } = useLancingAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    // Wait for BOTH auth and Firestore role data to finish loading before redirecting.
    // Without this, role/hasSelectedRole are still null when the redirect fires,
    // sending placement cell users to role-select instead of their dashboard.
    if (!authLoading && dataLoaded && isAuthenticated && !redirecting) {
      setRedirecting(true);
      if (!hasSelectedRole) {
        setLocation("/lancing/role-select");
      } else if (role === "freelancer") {
        setLocation("/lancing/freelancer-dashboard");
      } else if (role === "placement_cell") {
        setLocation("/lancing/placement-cell-dashboard");
      } else {
        setLocation("/lancing/company-dashboard");
      }
    }
  }, [authLoading, dataLoaded, isAuthenticated, hasSelectedRole, role, setLocation, redirecting]);

  // Show a full-screen spinner instead of the login form while:
  // (a) Firebase is still resolving auth state on mount, OR
  // (b) user is already authenticated but role data hasn't loaded yet, OR
  // (c) redirect has been initiated.
  // This prevents the "flash of login page" on both desktop and mobile.
  if (redirecting || authLoading || (isAuthenticated && !dataLoaded)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="w-10 h-10 animate-spin text-sky-500" />
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast({ title: "Please fill all fields", variant: "destructive" });
      return;
    }
    
    setIsLoading(true);
    try {
      if (isLogin) {
        await login(email, password);
        toast({ title: "Login successful!" });
      } else {
        await register(email, password);
        toast({ title: "Account created successfully!" });
      }
    } catch (error: any) {
      toast({ 
        title: isLogin ? "Login failed" : "Registration failed", 
        description: error.message,
        variant: "destructive" 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setIsGoogleLoading(true);
    try {
      if (isLogin) {
        await loginWithGoogle();
      } else {
        await registerWithGoogle();
      }
      // On mobile, signInWithRedirect navigates the page away — no toast needed.
      // On desktop (popup flow), show success; the useEffect redirect fires shortly after.
    } catch (error: any) {
      const code = (error?.code as string) || "";
      // Ignore user-cancelled popup flows silently
      if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") {
        return;
      }
      const friendlyMsg =
        code === "auth/unauthorized-domain"
          ? "Google sign-in is not enabled for this domain yet. Please use email/password."
          : code === "auth/internal-error" || code === "auth/popup-blocked"
          ? "Google sign-in failed. Please try again or use email/password."
          : error.message || "Google sign-in failed. Please try again.";
      toast({
        title: "Google authentication failed",
        description: friendlyMsg,
        variant: "destructive",
      });
    } finally {
      // Always clear the spinner: covers cancelled popups (which resolve
      // silently) and errors. On redirect fallback the page navigates away,
      // and on popup success the redirect useEffect fires — harmless either way.
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen sl-bg-atmosphere sl-grain-overlay relative overflow-hidden">
      <SEOHead
        title={`${isLogin ? "Login" : "Sign Up"} - StudentLancing`}
        description="Join StudentLancing to find freelance opportunities or hire student talent"
      />

      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 -left-32 w-96 h-96 bg-gradient-to-br from-emerald-200/30 to-green-300/20 rounded-full blur-3xl" />
        <div className="absolute bottom-20 -right-32 w-80 h-80 bg-gradient-to-br from-green-200/20 to-teal-200/30 rounded-full blur-3xl" />
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
        </div>
      </nav>

      <div className="relative z-10 max-w-6xl mx-auto px-6 py-8 lg:py-16">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          
          {/* Left Column - Hero Content */}
          <div className="sl-slide-up">
            <div className="mb-6">
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold bg-sky-100 text-sky-700" >
                <Zap className="w-4 h-4" />
                Student Freelancing Platform
              </span>
            </div>
            
            <h1 className="text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1] mb-6" >
              <span className="text-gray-900">Turn your</span>
              <br />
              <span className="bg-gradient-to-r from-sky-600 via-green-500 to-teal-500 bg-clip-text text-transparent">skills into</span>
              <br />
              <span className="text-gray-900">income.</span>
            </h1>
            
            <p className="text-lg text-gray-600 mb-8 leading-relaxed max-w-md" >
              Connect with companies looking for student talent. Build your portfolio, gain experience, and earn while you learn.
            </p>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-6">
              <div className="sl-scale-in sl-stagger-1">
                <div className="text-3xl font-bold text-gray-900" >2.5K+</div>
                <div className="text-sm text-gray-500" >Active Students</div>
              </div>
              <div className="sl-scale-in sl-stagger-2">
                <div className="text-3xl font-bold text-sky-600" >₹15L+</div>
                <div className="text-sm text-gray-500" >Earned</div>
              </div>
              <div className="sl-scale-in sl-stagger-3">
                <div className="text-3xl font-bold text-gray-900" >500+</div>
                <div className="text-sm text-gray-500" >Companies</div>
              </div>
            </div>

            {/* Trust Badges */}
            <div className="mt-10 flex items-center gap-4">
              <div className="flex -space-x-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-blue-500 border-3 border-white flex items-center justify-center text-white text-xs font-bold shadow-md">
                    {String.fromCharCode(64 + i)}
                  </div>
                ))}
              </div>
              <div className="text-sm text-gray-600" >
                <span className="font-semibold text-gray-900">1,000+</span> students joined this month
              </div>
            </div>
          </div>

          {/* Right Column - Auth Form */}
          <div className="w-full max-w-md mx-auto lg:mx-0">
            <Card className="rounded-3xl shadow-2xl border border-gray-100/50 overflow-hidden sl-scale-in bg-white/80 backdrop-blur-sm">
              <CardContent className="p-8">
                {/* Form Header */}
                <div className="text-center mb-8">
                  <div className="lg:hidden flex items-center justify-center gap-2 mb-6">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center shadow-lg">
                      <Briefcase className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2" >
                    {isLogin ? "Welcome back" : "Join StudentLancing"}
                  </h2>
                  <p className="text-gray-500" >
                    {isLogin ? "Sign in to continue your journey" : "Start earning with your skills"}
                  </p>
                </div>

                {/* Google Button */}
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-14 rounded-2xl mb-6 border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all font-semibold text-gray-700"
                  
                  onClick={handleGoogleAuth}
                  disabled={isGoogleLoading || isLoading}
                  data-testid="button-google-auth"
                >
                  {isGoogleLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <SiGoogle className="w-5 h-5 mr-3 text-red-500" />
                      Continue with Google
                    </>
                  )}
                </Button>

                {/* Divider */}
                <div className="relative mb-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200"></div>
                  </div>
                  <div className="relative flex justify-center">
                    <span className="px-4 bg-white text-sm text-gray-400" >or</span>
                  </div>
                </div>

                {/* Email/Password Form */}
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-semibold text-gray-700" >
                      Email
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="you@college.edu"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-12 h-14 rounded-2xl border-2 border-gray-200 focus:border-sky-500 focus:ring-emerald-500/20 text-base"
                        
                        data-testid="input-email"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-sm font-semibold text-gray-700" >
                      Password
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-12 pr-12 h-14 rounded-2xl border-2 border-gray-200 focus:border-sky-500 focus:ring-emerald-500/20 text-base"
                        
                        data-testid="input-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                        data-testid="button-toggle-password"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  {isLogin && (
                    <div className="text-right">
                      <button type="button" className="text-sm text-sky-600 hover:text-sky-700 font-medium transition-colors" >
                        Forgot password?
                      </button>
                    </div>
                  )}

                  <Button
                    type="submit"
                    className="w-full h-14 rounded-2xl text-base font-bold bg-gradient-to-r from-sky-600 to-blue-500 hover:from-emerald-700 hover:to-blue-600 shadow-lg shadow-sky-500/25 hover:shadow-sky-500/40 transition-all"
                    
                    disabled={isLoading || isGoogleLoading}
                    data-testid="button-submit"
                  >
                    {isLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        {isLogin ? "Sign In" : "Create Account"}
                        <ArrowRight className="w-5 h-5 ml-2" />
                      </>
                    )}
                  </Button>
                </form>

                {/* Toggle Login/Signup */}
                <div className="mt-8 text-center">
                  <p className="text-gray-500 text-sm" >
                    {isLogin ? "Don't have an account?" : "Already have an account?"}
                    <button
                      type="button"
                      onClick={() => setIsLogin(!isLogin)}
                      className="ml-2 text-sky-600 hover:text-sky-700 font-semibold transition-colors"
                      data-testid="button-toggle-mode"
                    >
                      {isLogin ? "Sign up" : "Sign in"}
                    </button>
                  </p>
                </div>

                {/* Trust indicators */}
                <div className="mt-8 pt-6 border-t border-gray-100">
                  <div className="flex items-center justify-center gap-6 text-xs text-gray-400" >
                    <span className="flex items-center gap-1">
                      <svg className="w-4 h-4 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Secure
                    </span>
                    <span className="flex items-center gap-1">
                      <svg className="w-4 h-4 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Student Verified
                    </span>
                    <span className="flex items-center gap-1">
                      <svg className="w-4 h-4 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Free to Join
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Mobile Stats */}
            <div className="lg:hidden mt-8 grid grid-cols-3 gap-4 text-center sl-fade-in">
              <div>
                <div className="text-2xl font-bold text-gray-900" >2.5K+</div>
                <div className="text-xs text-gray-500" >Students</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-sky-600" >₹15L+</div>
                <div className="text-xs text-gray-500" >Earned</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900" >500+</div>
                <div className="text-xs text-gray-500" >Companies</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
