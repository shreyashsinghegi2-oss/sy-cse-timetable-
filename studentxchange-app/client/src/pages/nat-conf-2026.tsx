import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Rocket, ArrowLeft, Calendar, Award, Users, FileText,
  MapPin, Phone, ChevronRight, Trophy, Cpu, Wind, Layers,
  Globe, Zap, FlaskConical, Settings, Shield, Waves, Calculator, Star, QrCode
} from "lucide-react";

const THEMES = [
  { name: "Aerodynamics", icon: Wind, color: "from-blue-500 to-cyan-600" },
  { name: "Aircraft / Spacecraft Propulsion", icon: Rocket, color: "from-indigo-500 to-blue-600" },
  { name: "Analysis of Composite Structures", icon: Layers, color: "from-purple-500 to-indigo-600" },
  { name: "Orbital Mechanics", icon: Globe, color: "from-slate-500 to-blue-700" },
  { name: "Computational Fluid Dynamics", icon: Cpu, color: "from-cyan-500 to-blue-600" },
  { name: "Space Technology", icon: Rocket, color: "from-blue-600 to-indigo-700" },
  { name: "Aeroacoustics", icon: Waves, color: "from-teal-500 to-cyan-600" },
  { name: "Aircraft / Spacecraft Structures", icon: Settings, color: "from-blue-500 to-slate-600" },
  { name: "Avionics", icon: Zap, color: "from-amber-500 to-orange-600" },
  { name: "Fluid Dynamics", icon: FlaskConical, color: "from-cyan-600 to-blue-500" },
  { name: "Mathematical Modelling", icon: Calculator, color: "from-slate-600 to-blue-600" },
  { name: "Defence Technologies", icon: Shield, color: "from-red-500 to-rose-600" },
];

const TIMELINE = [
  { date: "15 March 2026", event: "Abstract Submission", icon: FileText, highlight: false },
  { date: "18 March 2026", event: "Abstract Acceptance Notification", icon: Award, highlight: false },
  { date: "20 March 2026", event: "Last Date for Registration", icon: Calendar, highlight: false },
  { date: "22 March 2026", event: "Manuscript Submission", icon: FileText, highlight: false },
  { date: "30 – 31 March 2026", event: "Conference Days", icon: Rocket, highlight: true },
];

const FEE_TABLE = [
  { category: "Student", aesi: "₹2,500", nonAesi: "₹3,000" },
  { category: "Faculty / Research", aesi: "₹3,500", nonAesi: "₹4,000" },
  { category: "Industry", aesi: "₹4,500", nonAesi: "₹5,000" },
  { category: "Accompanying Author", aesi: "₹750", nonAesi: "₹1,000" },
];

const COMMITTEE = [
  {
    role: "Chief Patron",
    color: "from-yellow-500/30 to-amber-500/20",
    border: "border-yellow-500/40",
    members: ["Dr Ajeenkya DY Patil", "Mrs Pooja Patil", "Shri Anshul B Sharma"],
  },
  {
    role: "Patron",
    color: "from-blue-600/30 to-indigo-600/20",
    border: "border-blue-500/40",
    members: ["Dr Rakesh Kumar Jain"],
  },
  {
    role: "Advisory Committee",
    color: "from-purple-600/30 to-indigo-500/20",
    border: "border-purple-500/40",
    members: ["Dr Sudhakar Shinde"],
  },
  {
    role: "National Advisory Committee",
    color: "from-indigo-600/30 to-blue-500/20",
    border: "border-indigo-500/40",
    members: ["Dr A.P. Dash"],
  },
  {
    role: "Convener",
    color: "from-cyan-600/30 to-blue-500/20",
    border: "border-cyan-500/40",
    members: ["Dr M Suresh Kumar"],
  },
  {
    role: "Co Conveners",
    color: "from-teal-600/30 to-cyan-500/20",
    border: "border-teal-500/40",
    members: ["Dr Shiva Prasad U", "Dr Prashant Kumar"],
  },
];

const STATS = [
  { label: "Conference Days", value: "2" },
  { label: "Technical Themes", value: "12" },
  { label: "Paper Awards", value: "6+" },
  { label: "National Collaboration", value: "AeSI" },
];

const GOOGLE_FORM = "https://forms.gle/Ai5UbDS5ivcZ7WJ29";

/* ── Inline CSS for animations (no external CSS file needed) ── */
const animStyles = `
@keyframes twinkle {
  0%,100% { opacity: 0.2; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.4); }
}
@keyframes orbit1 {
  from { transform: rotate(0deg) translateX(140px) rotate(0deg); }
  to   { transform: rotate(360deg) translateX(140px) rotate(-360deg); }
}
@keyframes orbit2 {
  from { transform: rotate(90deg) translateX(190px) rotate(-90deg); }
  to   { transform: rotate(450deg) translateX(190px) rotate(-450deg); }
}
@keyframes orbit3 {
  from { transform: rotate(220deg) translateX(240px) rotate(-220deg); }
  to   { transform: rotate(580deg) translateX(240px) rotate(-580deg); }
}
@keyframes floatUp {
  0%,100% { transform: translateY(0px); }
  50% { transform: translateY(-12px); }
}
@keyframes pulseGlow {
  0%,100% { box-shadow: 0 0 20px rgba(56,189,248,0.3); }
  50% { box-shadow: 0 0 50px rgba(56,189,248,0.8), 0 0 80px rgba(56,189,248,0.3); }
}
@keyframes scanLine {
  0% { transform: translateY(-100%); }
  100% { transform: translateY(200vh); }
}
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(30px); }
  to   { opacity: 1; transform: translateY(0); }
}
.star { animation: twinkle var(--dur,3s) ease-in-out var(--delay,0s) infinite; }
.sat-1 { animation: orbit1 8s linear infinite; }
.sat-2 { animation: orbit2 14s linear infinite; }
.sat-3 { animation: orbit3 22s linear infinite; }
.float-anim { animation: floatUp 4s ease-in-out infinite; }
.pulse-glow  { animation: pulseGlow 2.5s ease-in-out infinite; }
.fade-in-up  { animation: fadeInUp 0.8s ease forwards; }
.scan-line   { animation: scanLine 6s linear infinite; }
`;

/* ── Starfield: 60 static stars with random positions ── */
const STARS = Array.from({ length: 60 }, (_, i) => ({
  id: i,
  x: Math.round(Math.random() * 100),
  y: Math.round(Math.random() * 100),
  r: 1 + Math.round(Math.random() * 2),
  dur: (2 + Math.round(Math.random() * 4)) + "s",
  delay: (Math.round(Math.random() * 30) / 10) + "s",
}));

export default function NatConf2026Page() {
  const [, setLocation] = useLocation();

  return (
    <>
      <style>{animStyles}</style>
      <div className="min-h-screen relative overflow-x-hidden"
        style={{ background: "linear-gradient(150deg,#020c1b 0%,#071428 45%,#0a1a38 75%,#050e1e 100%)" }}>

        {/* ── GLOBAL STAR FIELD ── */}
        <div className="fixed inset-0 pointer-events-none z-0">
          {STARS.map((s) => (
            <span
              key={s.id}
              className="star absolute rounded-full bg-white"
              style={{
                left: `${s.x}%`, top: `${s.y}%`,
                width: s.r, height: s.r,
                "--dur": s.dur, "--delay": s.delay,
              } as React.CSSProperties}
            />
          ))}
          {/* Subtle scan line */}
          <div className="scan-line absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-400/10 to-transparent" />
        </div>

        {/* ── HERO BACKGROUND ORBS ── */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[700px] pointer-events-none z-0">
          <div className="absolute inset-0 rounded-full bg-blue-600/8 blur-3xl" />
          <div className="absolute inset-[80px] rounded-full bg-cyan-500/6 blur-2xl" />
        </div>

        {/* ── GRID OVERLAY ── */}
        <div className="absolute inset-0 pointer-events-none z-0 opacity-[0.04]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(100,200,255,0.5) 1px, transparent 1px),
              linear-gradient(90deg, rgba(100,200,255,0.5) 1px, transparent 1px)`,
            backgroundSize: "60px 60px",
          }} />

        {/* ── PAGE CONTENT ── */}
        <div className="relative z-10 max-w-6xl mx-auto px-4 py-8">

          {/* Back Button */}
          <button
            onClick={() => setLocation("/student-collab")}
            className="flex items-center gap-2 text-blue-300 hover:text-white mb-8 transition-colors text-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Student Collab
          </button>

          {/* ── LOGO ── */}
          <div className="flex items-center justify-center mb-10">
            <div className="bg-white rounded-xl p-2 shadow-lg shadow-blue-900/60 float-anim">
              <img
                src="/images/adypu-logo.png"
                alt="Ajeenkya DY Patil University"
                className="h-12 md:h-16 w-auto object-contain"
              />
            </div>
          </div>

          {/* ═══════════════ HERO ═══════════════ */}
          <section className="text-center mb-4 relative">
            <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/40 px-4 py-2 mb-6 inline-flex items-center gap-2">
              <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
              NCADT 2026 · National Conference
            </Badge>

            <h1 className="text-3xl sm:text-4xl md:text-6xl font-extrabold text-white mb-4 leading-tight fade-in-up">
              National Conference on
              <br />
              <span className="bg-gradient-to-r from-blue-400 via-cyan-300 to-blue-500 bg-clip-text text-transparent">
                Aerospace &amp; Defence Technologies
              </span>
            </h1>

            <p className="text-blue-200 text-base md:text-lg font-semibold mb-1">
              Organized by Department of Space Engineering
            </p>
            <p className="text-blue-300 text-sm md:text-base mb-2">
              Ajeenkya DY Patil University, Pune
            </p>
            <p className="text-cyan-300 text-sm md:text-base mb-8 font-medium">
              In collaboration with{" "}
              <span className="text-white font-semibold">Aeronautical Society of India (AeSI)</span>
            </p>

            <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-blue-300 mb-10">
              <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-5 py-2.5 backdrop-blur">
                <Calendar className="h-4 w-4 text-cyan-400" />
                <span className="text-white font-medium">30 – 31 March 2026</span>
              </div>
              <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-5 py-2.5 backdrop-blur">
                <MapPin className="h-4 w-4 text-cyan-400" />
                <span>ADYPU, Pune, Maharashtra, India</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
              <a href={GOOGLE_FORM} target="_blank" rel="noopener noreferrer">
                <Button
                  size="lg"
                  className="pulse-glow bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-bold px-10 py-6 text-lg rounded-2xl transition-all"
                >
                  <Rocket className="h-5 w-5 mr-2" />
                  Register Now
                </Button>
              </a>
              <Button
                size="lg"
                onClick={() => setLocation("/nat-conf-register")}
                className="font-bold px-10 py-6 text-lg rounded-2xl transition-all border-2 border-cyan-400/60 hover:bg-cyan-500/10"
                style={{ background: "rgba(6,182,212,0.1)", color: "#67e8f9" }}
              >
                <QrCode className="h-5 w-5 mr-2" />
                Get Attendance QR
              </Button>
            </div>
          </section>

          {/* ═══════════════ VISUAL: ORBITAL GRAPHIC ═══════════════ */}
          <div className="flex justify-center my-10 select-none pointer-events-none">
            <div className="relative w-[320px] h-[320px] sm:w-[420px] sm:h-[420px] flex items-center justify-center">

              {/* Orbit ring 1 */}
              <div className="absolute inset-[40px] rounded-full border border-cyan-500/20"
                style={{ boxShadow: "0 0 24px rgba(56,189,248,0.08)" }} />
              {/* Orbit ring 2 */}
              <div className="absolute inset-[10px] rounded-full border border-blue-500/15" />
              {/* Orbit ring 3 */}
              <div className="absolute inset-[-20px] rounded-full border border-indigo-500/10" />

              {/* Planet core */}
              <div className="absolute w-28 h-28 sm:w-36 sm:h-36 rounded-full z-10"
                style={{
                  background: "radial-gradient(circle at 35% 35%, #1e90ff 0%, #0047ab 50%, #00234d 100%)",
                  boxShadow: "0 0 60px rgba(30,144,255,0.5), inset 0 -10px 30px rgba(0,35,77,0.8)",
                }}>
                {/* Continent patches */}
                <div className="absolute top-[22%] left-[20%] w-8 h-5 rounded-full bg-blue-300/30 rotate-12" />
                <div className="absolute bottom-[25%] right-[18%] w-6 h-4 rounded-full bg-cyan-300/20 -rotate-6" />
                {/* Atmosphere glow */}
                <div className="absolute inset-[-4px] rounded-full border-2 border-cyan-400/30 blur-sm" />
              </div>

              {/* Orbital satellite 1 – small rocket */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="sat-1 w-6 h-6 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center shadow-lg shadow-cyan-500/60">
                  <Rocket className="h-3 w-3 text-white" />
                </div>
              </div>

              {/* Orbital satellite 2 – star */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="sat-2 w-5 h-5 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-lg shadow-yellow-400/50">
                  <Star className="h-3 w-3 text-white fill-white" />
                </div>
              </div>

              {/* Orbital satellite 3 – shield */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="sat-3 w-5 h-5 rounded-full bg-gradient-to-br from-purple-400 to-indigo-500 flex items-center justify-center shadow-lg shadow-purple-400/50">
                  <Shield className="h-3 w-3 text-white" />
                </div>
              </div>
            </div>
          </div>

          {/* ═══════════════ STATS STRIP ═══════════════ */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-12">
            {STATS.map((s) => (
              <div key={s.label}
                className="rounded-2xl border border-cyan-500/20 bg-white/5 backdrop-blur p-5 text-center"
                style={{ boxShadow: "0 0 20px rgba(56,189,248,0.06)" }}>
                <p className="text-2xl sm:text-3xl font-extrabold text-cyan-300 mb-1">{s.value}</p>
                <p className="text-xs text-blue-200 leading-snug">{s.label}</p>
              </div>
            ))}
          </div>

          {/* ═══════════════ ABOUT SECTIONS ═══════════════ */}
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <Card className="border border-white/10 shadow-xl bg-white/5 backdrop-blur">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center">
                    <Globe className="h-4 w-4 text-white" />
                  </div>
                  <h2 className="text-base font-bold text-white">About ADYPU</h2>
                </div>
                <p className="text-blue-100 text-sm leading-relaxed">
                  ADYPU is one of the leading private universities in Pune offering undergraduate, postgraduate and
                  doctoral programs across engineering, management, media, design and law. The university promotes
                  innovation, research and entrepreneurship while providing students with a vibrant campus environment
                  that encourages exploration beyond academics.
                </p>
              </CardContent>
            </Card>

            <Card className="border border-white/10 shadow-xl bg-white/5 backdrop-blur">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center">
                    <Rocket className="h-4 w-4 text-white" />
                  </div>
                  <h2 className="text-base font-bold text-white">Dept. of Space Engineering</h2>
                </div>
                <p className="text-blue-100 text-sm leading-relaxed">
                  The Department of Space Engineering at ADYPU was established in 2022 with the goal of delivering
                  high quality technical education in Aerospace, Aeronautical, Avionics and Defence Technology. The
                  department aims to produce skilled aerospace engineers to meet the increasing demand in both civilian
                  and defence aerospace industries.
                </p>
              </CardContent>
            </Card>

            <Card className="border border-white/10 shadow-xl bg-white/5 backdrop-blur">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-teal-600 flex items-center justify-center">
                    <Star className="h-4 w-4 text-white" />
                  </div>
                  <h2 className="text-base font-bold text-white">Aeronautical Society of India</h2>
                </div>
                <p className="text-blue-100 text-sm leading-relaxed">
                  AeSI, established in 1948, is a prestigious professional organization promoting aeronautics and
                  astronautics in India. With 18+ branches and thousands of members, AeSI connects research
                  organizations, industry and academia to strengthen India's aerospace ecosystem.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* ═══════════════ ABOUT CONFERENCE ═══════════════ */}
          <Card id="about-conf" className="border border-cyan-500/20 shadow-2xl bg-white/5 backdrop-blur mb-10"
            style={{ boxShadow: "0 0 40px rgba(56,189,248,0.06)" }}>
            <CardContent className="p-6 md:p-8">
              <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center">
                  <FileText className="h-5 w-5 text-white" />
                </div>
                About NCADT 2026
              </h2>
              <div className="text-blue-100 space-y-3 leading-relaxed text-sm md:text-base">
                <p>
                  The National Conference on Aerospace and Defence Technology (NCADT 2026) brings together
                  academicians, researchers, industry experts and students to discuss emerging technologies and
                  innovations in aerospace and defence engineering.
                </p>
                <p>
                  The conference provides a platform for sharing research findings, technical knowledge and
                  collaborative ideas in aeronautics, space systems and defence applications.
                </p>
                <p>
                  The event will be held on{" "}
                  <span className="text-cyan-300 font-semibold">30–31 March 2026</span> at ADYPU Pune in
                  collaboration with{" "}
                  <span className="text-cyan-300 font-semibold">Aeronautical Society of India (AeSI) Pune Branch</span>.
                </p>
              </div>
              <div className="grid md:grid-cols-3 gap-4 mt-6">
                {[
                  { icon: Users, color: "text-cyan-400", title: "National Participation", sub: "Researchers & academicians across India" },
                  { icon: Cpu, color: "text-cyan-400", title: "Industry Experts", sub: "Connect with aerospace & defence professionals" },
                  { icon: Award, color: "text-yellow-400", title: "Paper & Poster Awards", sub: "Recognition in every session" },
                ].map((item) => (
                  <div key={item.title} className="bg-white/10 rounded-xl p-4 text-center border border-white/5">
                    <item.icon className={`h-8 w-8 ${item.color} mx-auto mb-2`} />
                    <p className="font-semibold text-white text-sm">{item.title}</p>
                    <p className="text-xs text-blue-200 mt-1">{item.sub}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* ═══════════════ CONFERENCE THEMES ═══════════════ */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-white mb-2 text-center">Conference Themes</h2>
            <p className="text-blue-300 text-center text-sm mb-6">Topics covered at NCADT 2026</p>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {THEMES.map((theme) => (
                <div
                  key={theme.name}
                  className="group rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-4 text-center hover:border-cyan-500/40 hover:bg-white/10 transition-all"
                >
                  <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${theme.color} flex items-center justify-center mx-auto mb-3 shadow-lg group-hover:scale-110 transition-transform`}>
                    <theme.icon className="h-5 w-5 text-white" />
                  </div>
                  <p className="text-white text-xs font-medium leading-tight">{theme.name}</p>
                </div>
              ))}
            </div>
          </div>

          {/* ═══════════════ IMPORTANT DATES ═══════════════ */}
          <Card className="border border-white/10 shadow-2xl bg-white/5 backdrop-blur mb-10">
            <CardContent className="p-6 md:p-8">
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-white" />
                </div>
                Important Dates
              </h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {TIMELINE.map((item, index) => (
                  <div
                    key={index}
                    className={`rounded-xl p-4 text-center relative ${
                      item.highlight
                        ? "bg-gradient-to-br from-blue-500/30 to-cyan-500/20 border border-cyan-500/50 shadow-lg"
                        : "bg-white/10 border border-white/5"
                    }`}
                  >
                    <item.icon className={`h-6 w-6 mx-auto mb-2 ${item.highlight ? "text-cyan-300" : "text-blue-400"}`} />
                    <p className={`text-sm font-bold mb-1 ${item.highlight ? "text-cyan-200" : "text-white"}`}>{item.date}</p>
                    <p className="text-xs text-blue-200 leading-snug">{item.event}</p>
                    {item.highlight && (
                      <Badge className="bg-cyan-500 text-white mt-2 text-xs">Conference</Badge>
                    )}
                    {index < TIMELINE.length - 1 && (
                      <div className="hidden lg:block absolute top-1/2 -right-2 transform -translate-y-1/2 z-10">
                        <ChevronRight className="h-4 w-4 text-blue-400" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* ═══════════════ AWARDS ═══════════════ */}
          <div className="grid md:grid-cols-2 gap-6 mb-10">
            <div className="rounded-2xl border border-yellow-500/30 bg-gradient-to-br from-yellow-500/10 to-amber-500/10 p-6 text-center"
              style={{ boxShadow: "0 0 30px rgba(251,191,36,0.08)" }}>
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-yellow-400/30">
                <Trophy className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-1">Best Paper Award</h3>
              <p className="text-amber-200 text-sm">Best Paper Award in Each Session</p>
            </div>
            <div className="rounded-2xl border border-cyan-500/30 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 p-6 text-center"
              style={{ boxShadow: "0 0 30px rgba(56,189,248,0.08)" }}>
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-cyan-400/30">
                <Star className="h-8 w-8 text-white fill-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-1">Best Poster Award</h3>
              <p className="text-cyan-200 text-sm">Best Poster Presentation Award</p>
            </div>
          </div>

          {/* ═══════════════ REGISTRATION FEES ═══════════════ */}
          <Card id="registration-fees" className="border border-white/10 shadow-2xl bg-white/5 backdrop-blur mb-10">
            <CardContent className="p-6 md:p-8">
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-green-500 to-teal-600 flex items-center justify-center">
                  <Award className="h-5 w-5 text-white" />
                </div>
                Registration Fees
              </h2>
              <div className="overflow-x-auto rounded-xl border border-white/10">
                <table className="w-full">
                  <thead>
                    <tr className="bg-blue-900/40">
                      <th className="text-left px-4 py-3 text-cyan-200 font-semibold text-sm">Category</th>
                      <th className="text-center px-4 py-3 text-cyan-200 font-semibold text-sm">AeSI Member</th>
                      <th className="text-center px-4 py-3 text-cyan-200 font-semibold text-sm">Non Member</th>
                    </tr>
                  </thead>
                  <tbody>
                    {FEE_TABLE.map((row, index) => (
                      <tr key={row.category} className={index % 2 === 0 ? "bg-white/5" : "bg-transparent"}>
                        <td className="px-4 py-3 text-white font-medium text-sm">{row.category}</td>
                        <td className="px-4 py-3 text-center text-cyan-200 font-semibold">{row.aesi}</td>
                        <td className="px-4 py-3 text-center text-blue-100">{row.nonAesi}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 space-y-1">
                <p className="text-blue-300 text-xs flex items-start gap-2">
                  <span className="text-yellow-400">*</span>
                  Separate registration required for poster competition and conference presentation.
                </p>
                <p className="text-blue-300 text-xs flex items-start gap-2">
                  <span className="text-yellow-400">*</span>
                  Maximum two authors per registration.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* ═══════════════ COMMITTEE ═══════════════ */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-white mb-2 text-center">Organising Committee</h2>
            <p className="text-blue-300 text-center text-sm mb-6">Leadership &amp; coordination for NCADT 2026</p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {COMMITTEE.map((group) => (
                <div
                  key={group.role}
                  className={`rounded-2xl border ${group.border} bg-gradient-to-br ${group.color} backdrop-blur p-5`}
                >
                  <p className="text-xs font-bold uppercase tracking-widest text-cyan-300 mb-3">{group.role}</p>
                  <div className="space-y-1">
                    {group.members.map((member) => (
                      <p key={member} className="text-white font-medium text-sm">{member}</p>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ═══════════════ CONTACT ═══════════════ */}
          <Card className="border border-white/10 shadow-2xl bg-white/5 backdrop-blur mb-10">
            <CardContent className="p-6 md:p-8">
              <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                  <Phone className="h-4 w-4 text-white" />
                </div>
                Contact Information
              </h2>
              <div className="grid md:grid-cols-3 gap-6">
                {[
                  { role: "Co-Convener", name: "Dr. Shiva Prasad U", phone: "9290303037" },
                  { role: "Co-Convener", name: "Dr. Prashant Kumar", phone: "7708690845" },
                ].map((c) => (
                  <div key={c.name} className="bg-white/10 rounded-xl p-5">
                    <p className="text-cyan-300 text-xs font-semibold uppercase tracking-wide mb-2">{c.role}</p>
                    <p className="text-white font-bold text-base mb-2">{c.name}</p>
                    <div className="flex items-center gap-2 text-blue-200 text-sm">
                      <Phone className="h-4 w-4 text-cyan-400 flex-shrink-0" />
                      <span>{c.phone}</span>
                    </div>
                  </div>
                ))}
                <div className="bg-white/10 rounded-xl p-5">
                  <p className="text-cyan-300 text-xs font-semibold uppercase tracking-wide mb-2">Venue</p>
                  <div className="flex items-start gap-2 text-blue-100 text-sm leading-relaxed">
                    <MapPin className="h-4 w-4 text-cyan-400 mt-0.5 flex-shrink-0" />
                    <span>
                      Ajeenkya DY Patil University,<br />
                      Charholi BK, via Lohegaon,<br />
                      Pune, Maharashtra – 412105
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ═══════════════ FINAL CTA BANNER ═══════════════ */}
          <div className="relative rounded-3xl overflow-hidden mb-12 border border-cyan-500/30"
            style={{ boxShadow: "0 0 60px rgba(56,189,248,0.12)" }}>
            {/* Animated background */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#0c1f4a] via-[#0d2560] to-[#0a1a3e]" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_50%,rgba(56,189,248,0.18),transparent_65%)]" />
            {/* Decorative corner rockets */}
            <div className="absolute top-4 left-6 opacity-10 text-5xl select-none">🚀</div>
            <div className="absolute bottom-4 right-6 opacity-10 text-5xl select-none rotate-180">🚀</div>
            <div className="relative z-10 text-center px-6 py-14">
              <h2 className="text-2xl md:text-4xl font-extrabold text-white mb-3">
                Submit Your Research and Join NCADT 2026
              </h2>
              <p className="text-blue-200 text-base mb-8 max-w-xl mx-auto">
                Be part of India's premier aerospace &amp; defence technologies conference at ADYPU Pune, 30–31 March 2026.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
                <a href={GOOGLE_FORM} target="_blank" rel="noopener noreferrer">
                  <Button
                    size="lg"
                    className="pulse-glow bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-bold px-10 py-6 text-lg rounded-2xl transition-all"
                  >
                    <Rocket className="h-5 w-5 mr-2" />
                    Register Now
                  </Button>
                </a>
                <Button
                  size="lg"
                  onClick={() => setLocation("/nat-conf-register")}
                  className="font-bold px-10 py-6 text-lg rounded-2xl transition-all border-2 border-cyan-400/60 hover:bg-cyan-500/10"
                  style={{ background: "rgba(6,182,212,0.1)", color: "#67e8f9" }}
                >
                  <QrCode className="h-5 w-5 mr-2" />
                  Get Attendance QR
                </Button>
              </div>
            </div>
          </div>

          {/* Footer */}
          <footer className="text-center py-6 border-t border-white/10">
            <p className="text-blue-200 text-sm mb-1">
              <span className="text-cyan-400 font-semibold">Powered by StudentXchange</span>
            </p>
            <p className="text-blue-300 text-xs">
              Organized by Dept. of Space Engineering, Ajeenkya DY Patil University
            </p>
            <p className="text-blue-400 text-xs mt-1">
              National Conference on Aerospace &amp; Defence Technologies 2026 · NCADT 2026
            </p>
          </footer>

        </div>
      </div>
    </>
  );
}
