import { useEffect } from "react";
import { Briefcase, Loader2, Zap } from "lucide-react";
import { useLocation } from "wouter";
import { useLancingAuth } from "@/hooks/use-lancing-auth";

export default function LancingHomePage() {
  const [, setLocation] = useLocation();
  const { isAuthenticated, hasSelectedRole, role, isLoading } = useLancingAuth();

  useEffect(() => {
    if (isLoading) return;
    
    if (!isAuthenticated) {
      setLocation("/lancing/login");
    } else if (!hasSelectedRole) {
      setLocation("/lancing/role-select");
    } else if (role === "freelancer") {
      setLocation("/lancing/freelancer-dashboard");
    } else if (role === "placement_cell") {
      setLocation("/lancing/placement-cell-dashboard");
    } else {
      setLocation("/lancing/company-dashboard");
    }
  }, [isAuthenticated, hasSelectedRole, role, isLoading, setLocation]);

  return (
    <div className="min-h-screen sl-bg-atmosphere sl-grain-overlay flex items-center justify-center relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-br from-emerald-200/50 to-green-300/40 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-gradient-to-br from-teal-200/40 to-cyan-200/30 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <div className="relative z-10 text-center sl-slide-up">
        {/* Logo Animation */}
        <div className="relative mb-8">
          <div className="w-24 h-24 mx-auto bg-gradient-to-br from-sky-500 to-blue-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-sky-500/30 animate-bounce" style={{ animationDuration: '2s' }}>
            <Briefcase className="w-12 h-12 text-white" />
          </div>
          <div className="absolute -top-2 -right-2 w-8 h-8 bg-amber-400 rounded-full flex items-center justify-center animate-pulse">
            <Zap className="w-4 h-4 text-amber-900" />
          </div>
        </div>

        {/* Brand */}
        <h1 className="text-4xl font-bold tracking-tight mb-3" >
          <span className="text-gray-900">Student</span>
          <span className="bg-gradient-to-r from-sky-600 to-blue-500 bg-clip-text text-transparent">Lancing</span>
        </h1>
        
        <p className="text-gray-600 mb-8" >
          Student Freelancing Platform
        </p>

        {/* Loading Indicator */}
        <div className="flex items-center justify-center gap-3 text-gray-500" >
          <Loader2 className="w-5 h-5 animate-spin text-sky-600" />
          <span>Loading your dashboard...</span>
        </div>

        {/* Progress Dots */}
        <div className="flex justify-center gap-2 mt-8">
          {[1, 2, 3].map((i) => (
            <div 
              key={i} 
              className="w-2 h-2 rounded-full bg-sky-500 animate-pulse"
              style={{ animationDelay: `${i * 0.2}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
