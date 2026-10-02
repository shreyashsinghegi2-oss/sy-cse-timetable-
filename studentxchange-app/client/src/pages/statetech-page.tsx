import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useCollabAuth } from "@/hooks/use-collab-auth";
import { useToast } from "@/hooks/use-toast";
import { 
  Rocket, ArrowLeft, Calendar, Award, Users, CheckCircle,
  FileText, Cpu, Lightbulb, Wrench, GraduationCap, Clock,
  MapPin, Mail, Phone, ExternalLink, ChevronRight, Loader2
} from "lucide-react";

const CATEGORIES = [
  {
    id: "innovators",
    name: "Innovators' Arena",
    subtitle: "Working Models Competition",
    description: "Fully functional, working models and prototypes showcasing real-world applications of engineering and technology.",
    fee: "₹5,000",
    icon: Wrench,
    color: "from-blue-500 to-indigo-600"
  },
  {
    id: "blueprint",
    name: "Blueprint Bonanza",
    subtitle: "Non-Working Models/Prototypes",
    description: "Scaled models, non-functional prototypes, and detailed design concepts demonstrating innovative engineering solutions.",
    fee: "₹5,000",
    icon: FileText,
    color: "from-blue-500 to-blue-600"
  },
  {
    id: "concept",
    name: "Concept Catalyst",
    subtitle: "CAD-Based Designs & Simulations",
    description: "Conceptual models using CAD software or engineering simulation tools with detailed 3D designs and research-backed justifications.",
    fee: "₹5,000",
    icon: Cpu,
    color: "from-cyan-500 to-blue-600"
  },
  {
    id: "ideathon",
    name: "Ideathon Challenge",
    subtitle: "Startup & Idea Pitching",
    description: "Entrepreneurial competition where participants pitch innovative startup ideas, business models, or technological solutions.",
    fee: "₹5,000",
    icon: Lightbulb,
    color: "from-amber-500 to-orange-600"
  }
];

const ELIGIBILITY = [
  { degree: "Diploma", description: "All Diploma students", fee: "₹5,000" },
  { degree: "B.Tech", description: "All B.Tech students", fee: "₹5,000" },
  { degree: "M.Tech", description: "All M.Tech students", fee: "₹5,000" },
  { degree: "12th", description: "12th Science students", fee: "FREE", highlight: true }
];

const TIMELINE = [
  { date: "15 Dec 2025", event: "Registration Opens", icon: Calendar, status: "active" },
  { date: "16 Feb 2026", event: "Proposal Submission Deadline", icon: FileText, status: "upcoming" },
  { date: "20 Feb 2026", event: "Verification & Shortlisting", icon: CheckCircle, status: "upcoming" },
  { date: "27-28 Feb 2026", event: "Event Days", icon: Rocket, status: "upcoming" }
];

export default function StatetechPage() {
  const [, setLocation] = useLocation();
  const { user, status } = useCollabAuth();
  const { toast } = useToast();
  const isAuthenticated = status === 'authenticated';

  useEffect(() => {
    if (status === 'unauthenticated') {
      toast({
        title: "Sign in required",
        description: "Please sign in to view STATETECH SHOWCASE 2026",
      });
      setLocation('/');
    }
  }, [status, setLocation, toast]);

  const handleRegister = () => {
    setLocation('/statetech-2026/register');
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-800 via-blue-800/80 to-indigo-900/90 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-800 via-blue-800/80 to-indigo-900/90 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-800 via-blue-800/80 to-indigo-900/90">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <button 
          onClick={() => setLocation('/student-collab')}
          className="flex items-center gap-2 text-blue-200 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Student Collab
        </button>

        <div className="flex items-center justify-center gap-6 md:gap-10 mb-8">
          <div className="bg-white rounded-xl p-2 shadow-lg">
            <img 
              src="/images/adypu-logo.png" 
              alt="Ajeenkya DY Patil University" 
              className="h-12 md:h-16 w-auto object-contain"
              loading="eager"
            />
          </div>
          <div className="bg-white rounded-xl p-2 shadow-lg">
            <img 
              src="/images/aero-logo.png" 
              alt="AERO" 
              className="h-12 md:h-16 w-auto object-contain"
              loading="eager"
            />
          </div>
        </div>

        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-4 mb-6 flex-wrap">
            <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-500/30 px-4 py-2">
              <Award className="h-4 w-4 mr-2" />
              Gold Sponsor: StudentXchange
            </Badge>
          </div>
          
          <div className="bg-gradient-to-r from-yellow-500/20 via-amber-500/30 to-orange-500/20 border border-yellow-500/40 rounded-2xl p-6 max-w-md mx-auto mb-6 shadow-lg shadow-yellow-500/10">
            <p className="text-yellow-300 text-sm font-semibold mb-2">Total Prize Pool</p>
            <p className="text-4xl md:text-5xl font-black text-white">
              ₹2,00,000
            </p>
            <p className="text-amber-200/80 text-xs mt-2">+ Certificates & Internship Opportunities</p>
          </div>
          
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-4">
            🚀 STATETECH SHOWCASE 2026
          </h1>
          <p className="text-xl text-blue-200 mb-6 max-w-3xl mx-auto">
            A state-level project showcase for innovation, technology, and engineering
          </p>
          
          <div className="flex items-center justify-center gap-6 flex-wrap text-sm text-blue-300 mb-8">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Dept. of Space Engineering, ADYPU
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              27-28 February 2026
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur rounded-2xl p-6 max-w-4xl mx-auto mb-8 border border-white/10">
            <p className="text-sm text-blue-200 mb-4">Organized by</p>
            <div className="flex items-center justify-center gap-6 md:gap-8 flex-wrap">
              <div className="text-center">
                <div className="w-16 h-16 md:w-20 md:h-20 bg-white rounded-xl flex items-center justify-center mx-auto mb-2 p-1 shadow-lg overflow-hidden">
                  <img src="/images/space-club-logo.jpeg" alt="Space Club" className="w-full h-full object-cover rounded-lg" loading="lazy" />
                </div>
                <p className="text-white text-sm font-medium">Space Club</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 md:w-20 md:h-20 bg-white rounded-xl flex items-center justify-center mx-auto mb-2 p-1 shadow-lg overflow-hidden">
                  <img src="/images/aero-club-logo.jpeg" alt="Aero Club" className="w-full h-full object-contain" loading="lazy" />
                </div>
                <p className="text-white text-sm font-medium">Aero Club</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 md:w-20 md:h-20 bg-white rounded-xl flex items-center justify-center mx-auto mb-2 p-1 shadow-lg overflow-hidden">
                  <img src="/images/defnav-club-logo.jpeg" alt="DefNav Club" className="w-full h-full object-contain" loading="lazy" />
                </div>
                <p className="text-white text-sm font-medium">DefNav Club</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 md:w-20 md:h-20 bg-black rounded-xl flex items-center justify-center mx-auto mb-2 p-1 shadow-lg overflow-hidden">
                  <img src="/images/astronomy-club-logo.jpeg" alt="Astronomy Club" className="w-full h-full object-contain" loading="lazy" />
                </div>
                <p className="text-white text-sm font-medium">Astronomy Club</p>
              </div>
            </div>
          </div>
        </div>

        <Card className="border-0 shadow-2xl bg-white/5 backdrop-blur mb-10">
          <CardContent className="p-6 md:p-8">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <FileText className="h-6 w-6 text-blue-400" />
              About the Event
            </h2>
            <div className="text-blue-100 space-y-3">
              <p>
                STATETECH SHOWCASE 2026 is a flagship event organized by the Space Club of Ajeenkya DY Patil University, 
                designed to bring together the brightest minds in engineering and technology.
              </p>
              <p>
                This state-level project competition provides a platform for Final-year Diploma, B.Tech, M.Tech & 12th Science 
                students to present their innovative ideas and technical projects, bridging the gap between academic knowledge 
                and real-world application.
              </p>
              <div className="grid md:grid-cols-3 gap-4 mt-6">
                <div className="bg-white/10 rounded-xl p-4 text-center">
                  <Users className="h-8 w-8 text-blue-400 mx-auto mb-2" />
                  <p className="font-semibold text-white">Industry Interaction</p>
                  <p className="text-sm text-blue-200">Connect with company professionals</p>
                </div>
                <div className="bg-white/10 rounded-xl p-4 text-center">
                  <Cpu className="h-8 w-8 text-blue-400 mx-auto mb-2" />
                  <p className="font-semibold text-white">Real Problem Statements</p>
                  <p className="text-sm text-blue-200">Work on industry challenges</p>
                </div>
                <div className="bg-white/10 rounded-xl p-4 text-center">
                  <Award className="h-8 w-8 text-yellow-400 mx-auto mb-2" />
                  <p className="font-semibold text-white">₹2,00,000 Prize Pool</p>
                  <p className="text-sm text-blue-200">Cash vouchers & recognition</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="mb-10">
          <h2 className="text-2xl font-bold text-white mb-6 text-center">
            🏆 Competition Categories
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            {CATEGORIES.map((cat) => (
              <Card 
                key={cat.id} 
                className="border-0 shadow-xl bg-white/5 backdrop-blur hover:bg-white/10 transition-all cursor-pointer group"
              >
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${cat.color} flex items-center justify-center flex-shrink-0`}>
                      <cat.icon className="h-7 w-7 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-white mb-1">{cat.name}</h3>
                      <p className="text-blue-300 text-sm mb-2">{cat.subtitle}</p>
                      <p className="text-blue-200 text-sm mb-3">{cat.description}</p>
                      <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-500/30">
                        Entry Fee: {cat.fee}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          
          <Card className="border-0 shadow-xl bg-gradient-to-r from-green-500/20 to-emerald-500/20 mt-4">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center flex-shrink-0">
                  <GraduationCap className="h-7 w-7 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white mb-1">12th Science Students</h3>
                  <p className="text-green-200 text-sm">Working & Non-Working Models or Poster presentations</p>
                  <p className="text-green-100 text-xs mt-1">Topics: Aviation & Space | Innovation & Robotics | Green Energy | Health Tech | Agro-Tech | Ancient vs Modern Science</p>
                  <Badge className="bg-green-500 text-white mt-2">FREE Registration</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="border-0 shadow-2xl bg-white/5 backdrop-blur mb-10">
          <CardContent className="p-6 md:p-8">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
              <GraduationCap className="h-6 w-6 text-blue-400" />
              Eligibility & Fees
            </h2>
            <div className="grid md:grid-cols-4 gap-4">
              {ELIGIBILITY.map((item) => (
                <div 
                  key={item.degree}
                  className={`rounded-xl p-4 text-center ${
                    item.highlight 
                      ? 'bg-gradient-to-br from-green-500/30 to-emerald-500/30 border border-green-500/50' 
                      : 'bg-white/10'
                  }`}
                >
                  <p className="text-xl font-bold text-white mb-1">{item.degree}</p>
                  <p className="text-sm text-blue-200 mb-2">{item.description}</p>
                  <Badge className={item.highlight ? 'bg-green-500 text-white' : 'bg-blue-500/30 text-blue-200'}>
                    {item.fee}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-2xl bg-white/5 backdrop-blur mb-10">
          <CardContent className="p-6 md:p-8">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
              <Clock className="h-6 w-6 text-blue-400" />
              Event Timeline
            </h2>
            <div className="grid md:grid-cols-4 gap-4">
              {TIMELINE.map((item, index) => (
                <div key={index} className="relative">
                  <div className={`rounded-xl p-4 text-center ${
                    item.status === 'active' 
                      ? 'bg-gradient-to-br from-green-500/30 to-emerald-500/30 border border-green-500/50' 
                      : 'bg-white/10'
                  }`}>
                    <item.icon className={`h-8 w-8 mx-auto mb-2 ${
                      item.status === 'active' ? 'text-green-400' : 'text-blue-400'
                    }`} />
                    <p className="text-lg font-bold text-white mb-1">{item.date}</p>
                    <p className="text-sm text-blue-200">{item.event}</p>
                    {item.status === 'active' && (
                      <Badge className="bg-green-500 text-white mt-2">Now Open</Badge>
                    )}
                  </div>
                  {index < TIMELINE.length - 1 && (
                    <div className="hidden md:block absolute top-1/2 -right-2 transform -translate-y-1/2 z-10">
                      <ChevronRight className="h-4 w-4 text-blue-400" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="text-center mb-12">
          <Button 
            size="lg"
            onClick={handleRegister}
            className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-bold px-12 py-8 text-xl rounded-2xl shadow-2xl hover:shadow-yellow-500/25 transition-all"
          >
            <Rocket className="h-6 w-6 mr-3" />
            Register Your Team
            <ChevronRight className="h-6 w-6 ml-2" />
          </Button>
          <p className="text-blue-300 mt-4 text-sm">
            Team size: Up to 5 members • Proposal submission required
          </p>
        </div>

        <Card className="border-0 shadow-2xl bg-white/5 backdrop-blur mb-10">
          <CardContent className="p-6">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Mail className="h-5 w-5 text-blue-400" />
              Contact Information
            </h2>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="flex items-center gap-3 text-blue-200">
                <Mail className="h-5 w-5 text-blue-400" />
                <span>se_spaceclub@adypu.edu.in</span>
              </div>
              <div className="flex items-center gap-3 text-blue-200">
                <Phone className="h-5 w-5 text-blue-400" />
                <span>7021070312 / 9923275911</span>
              </div>
              <div className="flex items-center gap-3 text-blue-200">
                <ExternalLink className="h-5 w-5 text-blue-400" />
                <a href="https://www.adypu.edu.in" target="_blank" rel="noopener noreferrer" className="hover:text-white">
                  www.adypu.edu.in
                </a>
              </div>
            </div>
          </CardContent>
        </Card>

        <footer className="text-center py-8 border-t border-white/10">
          <p className="text-blue-200 text-sm mb-2">
            <span className="text-yellow-400 font-semibold">Powered by StudentXchange</span>
          </p>
          <p className="text-blue-300 text-xs">
            In collaboration with Dept. of Space Engineering & Ajeenkya DY Patil University
          </p>
          <p className="text-blue-400 text-xs mt-1">
            Official Digital Platform Partner – STATETECH SHOWCASE 2026
          </p>
        </footer>
      </div>
    </div>
  );
}
