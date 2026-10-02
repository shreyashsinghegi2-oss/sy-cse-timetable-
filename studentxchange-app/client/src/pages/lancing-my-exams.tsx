import { useLocation, Link } from "wouter";
import { useLancingAuth } from "@/hooks/use-lancing-auth";
import {
  Briefcase, LogOut, Zap, TrendingUp, Sparkles, Map, Shield,
  Send, MessageSquare, HelpCircle, Target, PenLine,
} from "lucide-react";
import MyExamsContent from "@/components/lancing/my-exams-content";

export default function LancingMyExams() {
  const [, setLocation] = useLocation();
  const { logout } = useLancingAuth();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col lg:flex-row">
      <aside className="lg:w-60 bg-slate-900 lg:min-h-screen flex flex-col shrink-0">
        <div className="p-5">
          <Link href="/student-lancing">
            <button className="text-xs text-slate-400 hover:text-white flex items-center gap-1 mb-6">← Back to Home</button>
          </Link>
          <div className="text-lg font-bold text-white mb-6">StudentLancing</div>
          <nav className="space-y-1">
            {[
              { label: "Browse Jobs", icon: Briefcase, link: "/lancing/freelancer-dashboard" },
              { label: "Opportunities Hub", icon: TrendingUp, link: "/lancing/freelancer-dashboard" },
              { label: "AI Match", icon: Sparkles, link: "/lancing/ai-match" },
              { label: "Career Compass", icon: Map, link: "/lancing/career-compass" },
              { label: "Sure Shot Jobs", icon: Shield, link: "/lancing/sure-shot" },
              { label: "My Applications", icon: Send, link: "/lancing/freelancer-dashboard" },
              { label: "My Exams", icon: PenLine, link: "/lancing/my-exams" },
            ].map(item => (
              <Link key={item.label} href={item.link}>
                <button className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  item.link === "/lancing/my-exams" ? "bg-sky-600 text-white shadow-md" : "text-slate-300 hover:bg-slate-800 hover:text-white"
                }`}>
                  <item.icon className="w-4 h-4 flex-shrink-0" />
                  <span className="flex-1 text-left">{item.label}</span>
                </button>
              </Link>
            ))}
          </nav>
        </div>
        <div className="mt-auto px-3 py-3 border-t border-slate-800">
          <button onClick={async () => { await logout(); setLocation("/student-lancing"); }}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm text-red-400 hover:bg-red-950/30 transition-colors font-semibold border border-red-900/30">
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>
      </aside>

      <main className="flex-1 p-6 lg:p-10 min-w-0">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">My Exams</h1>
          <p className="text-sm text-gray-500 mt-1">Online assessments scheduled for your campus placement</p>
        </div>
        <MyExamsContent />
      </main>
    </div>
  );
}
