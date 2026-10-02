import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, Calendar, Clock, MapPin, Code, Gamepad2, Wrench, Lightbulb,
  Trophy, Zap, ChevronRight, Users, Target, Rocket, Bot,
  CircuitBoard, Star, X, CheckSquare, Square, Loader2
} from "lucide-react";
import { EVENTS_BY_NAME, EVENT_DETAILS, EVENT_INSIGHTS, calcTotal } from "@/lib/hastech-events";
import { useCollabAuth } from "@/hooks/use-collab-auth";
import { useToast } from "@/hooks/use-toast";

/* ── Inline animation styles ── */
const animStyles = `
@keyframes twinkle {
  0%,100% { opacity: 0.15; transform: scale(1); }
  50% { opacity: 0.9; transform: scale(1.5); }
}
@keyframes floatUp {
  0%,100% { transform: translateY(0px); }
  50% { transform: translateY(-10px); }
}
@keyframes pulseGlow {
  0%,100% { box-shadow: 0 0 20px rgba(139,92,246,0.4); }
  50% { box-shadow: 0 0 55px rgba(139,92,246,0.9), 0 0 90px rgba(59,130,246,0.4); }
}
@keyframes pulseGlowCyan {
  0%,100% { box-shadow: 0 0 20px rgba(6,182,212,0.4); }
  50% { box-shadow: 0 0 55px rgba(6,182,212,0.9), 0 0 90px rgba(139,92,246,0.4); }
}
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(28px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes scanLine {
  0% { transform: translateY(-100%); }
  100% { transform: translateY(200vh); }
}
@keyframes neonFlicker {
  0%,100%,92%,96% { opacity: 1; }
  93%,97% { opacity: 0.85; }
}
@keyframes slideInUp {
  from { transform: translateY(100%); opacity: 0; }
  to   { transform: translateY(0);    opacity: 1; }
}
.ht-star { animation: twinkle var(--dur,3s) ease-in-out var(--delay,0s) infinite; }
.ht-float { animation: floatUp 4s ease-in-out infinite; }
.ht-pulse { animation: pulseGlow 2.5s ease-in-out infinite; }
.ht-pulse-cyan { animation: pulseGlowCyan 2.5s ease-in-out infinite; }
.ht-fade-up { animation: fadeInUp 0.7s ease forwards; }
.ht-scan { animation: scanLine 7s linear infinite; }
.ht-neon { animation: neonFlicker 6s ease-in-out infinite; }
.ht-panel-in { animation: slideInUp 0.35s cubic-bezier(0.32,0.72,0,1) forwards; }
.ht-card {
  transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease;
}
.ht-card:hover {
  transform: translateY(-4px);
  border-color: rgba(139,92,246,0.5) !important;
  box-shadow: 0 8px 32px rgba(139,92,246,0.2);
}
.ht-event-card {
  cursor: pointer;
  transition: transform 0.22s ease, box-shadow 0.22s ease, background 0.22s ease, border-color 0.22s ease;
}
.ht-event-card:hover {
  transform: translateY(-3px);
  background: rgba(255,255,255,0.10) !important;
  box-shadow: 0 6px 24px rgba(139,92,246,0.18);
}
.ht-event-card.selected {
  border-color: rgba(139,92,246,0.7) !important;
  background: rgba(139,92,246,0.15) !important;
  box-shadow: 0 0 18px rgba(139,92,246,0.25);
}
`;

/* ── Static starfield ── */
const STARS = Array.from({ length: 70 }, (_, i) => ({
  id: i,
  x: Math.round(Math.random() * 100),
  y: Math.round(Math.random() * 100),
  r: 1 + Math.round(Math.random() * 1.5),
  dur: (2 + Math.round(Math.random() * 4)) + "s",
  delay: (Math.round(Math.random() * 30) / 10) + "s",
}));

/* ── Data ── */
const CATEGORIES = [
  {
    id: "robotics",
    label: "Robotics & Engineering",
    icon: Bot,
    color: "from-blue-500 to-cyan-600",
    accent: "rgba(59,130,246,0.25)",
    border: "rgba(59,130,246,0.35)",
    image: "https://images.unsplash.com/photo-1581092921461-eab62e97a780?w=600&q=80",
    events: [
      { name: "Robo Soccer", desc: "Autonomous robots battle it out on the football field." },
      { name: "Line Follower Challenge", desc: "Robot follows a track — precision and speed decide the winner." },
      { name: "RC Racing", desc: "High-speed remote-controlled car racing circuit." },
      { name: "Tower Titans (Solo)", desc: "Build the tallest structural tower using limited materials — solo entry. ₹50" },
      { name: "Tower Titans (Group)", desc: "Build the tallest structural tower using limited materials — team entry (2–4). ₹200" },
    ],
  },
  {
    id: "coding",
    label: "Coding & Innovation",
    icon: Code,
    color: "from-violet-500 to-purple-700",
    accent: "rgba(139,92,246,0.25)",
    border: "rgba(139,92,246,0.35)",
    image: "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=600&q=80",
    events: [
      { name: "Hackathon", desc: "Single day innovation challenge solving real-world problems · 9:30 AM – 5:30 PM." },
      { name: "Project Competition", desc: "Showcase your best technical project to expert judges." },
      { name: "C Coding Champion", desc: "Competitive C programming challenge testing speed and problem-solving." },
    ],
  },
  {
    id: "workshops",
    label: "Workshops",
    icon: Wrench,
    color: "from-cyan-500 to-teal-600",
    accent: "rgba(6,182,212,0.25)",
    border: "rgba(6,182,212,0.35)",
    image: "https://images.unsplash.com/photo-1581092335397-9583eb92d232?w=600&q=80",
    events: [
      { name: "Arduino Workshop", desc: "Hands-on microcontroller programming and prototyping." },
      { name: "Workshop on 3D Printing", desc: "Learn additive manufacturing from design to print." },
      { name: "BioTech Next", desc: "Advanced techniques in modern biotechnology." },
      { name: "IoT Robotics & Drones", desc: "Build and program connected IoT-enabled robots and drones." },
      { name: "Ethical Hacking & CTF", desc: "Cybersecurity capture-the-flag challenge." },
    ],
  },
  {
    id: "strategy",
    label: "Strategy & Mind Games",
    icon: Lightbulb,
    color: "from-amber-500 to-orange-600",
    accent: "rgba(245,158,11,0.25)",
    border: "rgba(245,158,11,0.35)",
    image: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=600&q=80",
    events: [
      { name: "Apti Keeda", desc: "Battle of aptitude — logic, reasoning, and quant." },
      { name: "Ingenium", desc: "Engineering quiz and technical brain-teaser competition." },
      { name: "The Boss – Escape the Board Room", desc: "Strategic business simulation escape challenge." },
      { name: "Quest Tank", desc: "Shark-Tank style idea pitching and innovation quest." },
    ],
  },
  {
    id: "gaming",
    label: "Gaming Arena",
    icon: Gamepad2,
    color: "from-green-500 to-emerald-600",
    accent: "rgba(34,197,94,0.25)",
    border: "rgba(34,197,94,0.35)",
    image: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600&q=80",
    events: [
      { name: "Gaming Event (Solo)", desc: "Solo esports tournament — compete across multi-title gaming showdowns. ₹500" },
      { name: "Gaming Event (Group)", desc: "Team esports tournament — multi-title gaming showdowns with your squad (2–4). ₹300" },
    ],
  },
];

const STATS = [
  { label: "Event Categories", value: "5" },
  { label: "Total Events", value: "17+" },
  { label: "Coding Hours", value: "48H" },
  { label: "Tech Domains", value: "Multi" },
];

/* ── All events flat list for the panel ── */
const ALL_EVENTS = CATEGORIES.flatMap((cat) =>
  cat.events.map((ev) => ({ ...ev, category: cat.label, catId: cat.id, accent: cat.accent, border: cat.border, color: cat.color }))
);

export default function Hastech2026Page() {
  const [, setLocation] = useLocation();
  const [showPanel, setShowPanel] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [detailEvent, setDetailEvent] = useState<string | null>(null);
  const [serverClosedEvents, setServerClosedEvents] = useState<string[]>([]);
  const { status } = useCollabAuth();
  const { toast } = useToast();

  /* Merge static closed flag + server-side closed events */
  function isEventClosed(name: string): boolean {
    if (EVENTS_BY_NAME[name]?.closed) return true;
    return serverClosedEvents.includes(name);
  }

  /* ── Load server-side closed events ── */
  useEffect(() => {
    fetch("/api/hastech/closed-events")
      .then(r => r.json())
      .then(data => { if (Array.isArray(data.closed)) setServerClosedEvents(data.closed); })
      .catch(() => {});
  }, []);

  /* ── If user already registered, show their confirmation page ── */
  useEffect(() => {
    try {
      const isRegistered = localStorage.getItem("hastech_registered") === "true";
      if (isRegistered) {
        setLocation("/hastech-register");
      }
    } catch {}
  }, [setLocation]);

  useEffect(() => {
    if (status === "unauthenticated") {
      localStorage.setItem("hastech_return_after_login", "/hastech-2026");
      toast({
        title: "Sign in required",
        description: "Please sign in to access #TECH 2026",
      });
      setLocation("/student-collab");
    }
  }, [status, setLocation, toast]);

  if (status === "loading" || status === "unauthenticated") {
    return (
      <div className="min-h-screen flex items-center justify-center"
        style={{ background: "linear-gradient(160deg,#0f0320,#1a0a40,#0d0530)" }}>
        <Loader2 className="h-9 w-9 animate-spin" style={{ color: "#a78bfa" }} />
      </div>
    );
  }

  function toggleEvent(name: string) {
    if (isEventClosed(name)) {
      toast({ title: "Registration Closed", description: `"${name}" registration is currently closed.`, variant: "destructive" });
      return;
    }
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  function openPanel() {
    setShowPanel(true);
    document.body.style.overflow = "hidden";
  }

  function closePanel() {
    setShowPanel(false);
    document.body.style.overflow = "";
  }

  return (
    <>
      <style>{animStyles}</style>
      <div
        className="min-h-screen relative overflow-x-hidden"
        style={{ background: "linear-gradient(150deg,#050010 0%,#0d0520 40%,#0a0830 70%,#060015 100%)" }}
      >
        {/* ── STARFIELD ── */}
        <div className="fixed inset-0 pointer-events-none z-0">
          {STARS.map((s) => (
            <span
              key={s.id}
              className="ht-star absolute rounded-full bg-purple-200"
              style={{
                left: `${s.x}%`, top: `${s.y}%`,
                width: s.r, height: s.r,
                "--dur": s.dur, "--delay": s.delay,
              } as React.CSSProperties}
            />
          ))}
          <div className="ht-scan absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-400/8 to-transparent" />
        </div>

        {/* ── BACKGROUND ORBS ── */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] pointer-events-none z-0">
          <div className="absolute inset-0 rounded-full blur-3xl" style={{ background: "rgba(139,92,246,0.07)" }} />
          <div className="absolute inset-[100px] rounded-full blur-2xl" style={{ background: "rgba(59,130,246,0.05)" }} />
        </div>

        {/* ── CIRCUIT GRID ── */}
        <div
          className="absolute inset-0 pointer-events-none z-0"
          style={{
            opacity: 0.035,
            backgroundImage: `
              linear-gradient(rgba(139,92,246,0.8) 1px, transparent 1px),
              linear-gradient(90deg, rgba(139,92,246,0.8) 1px, transparent 1px)`,
            backgroundSize: "48px 48px",
          }}
        />

        {/* ── PAGE CONTENT ── */}
        {/* pb-36 md:pb-24 accounts for sticky bar height + mobile nav on small screens */}
        <div className="relative z-10 max-w-6xl mx-auto px-4 py-8 pb-36 md:pb-24">

          {/* Back */}
          <button
            onClick={() => setLocation("/student-collab")}
            className="flex items-center gap-2 text-purple-300 hover:text-white mb-8 transition-colors text-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Student Collab
          </button>

          {/* ══════════════ HERO ══════════════ */}
          <section className="relative rounded-3xl overflow-hidden mb-12 border border-purple-500/20"
            style={{ minHeight: 480 }}>

            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(https://images.unsplash.com/photo-1535378917042-10a22c95931a?w=1400&q=80)` }}
            />
            <div className="absolute inset-0" style={{ background: "linear-gradient(135deg,rgba(5,0,16,0.92) 0%,rgba(13,5,32,0.85) 50%,rgba(6,0,21,0.90) 100%)" }} />
            <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 30% 50%, rgba(139,92,246,0.18) 0%, transparent 60%)" }} />
            <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 75% 40%, rgba(59,130,246,0.12) 0%, transparent 55%)" }} />

            <div className="absolute top-0 left-0 right-0 h-px" style={{ background: "linear-gradient(to right, transparent, rgba(139,92,246,0.6), transparent)" }} />
            <div className="absolute bottom-0 left-0 right-0 h-px" style={{ background: "linear-gradient(to right, transparent, rgba(59,130,246,0.4), transparent)" }} />

            <div className="relative z-10 flex flex-col items-center justify-center text-center px-6 py-20">

              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border mb-6 text-sm font-medium ht-neon"
                style={{ background: "rgba(139,92,246,0.15)", color: "#c4b5fd", borderColor: "rgba(139,92,246,0.45)" }}>
                <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: "#a78bfa", display: "inline-block" }} />
                Technology Fest · ADYPU
              </div>

              <h1 className="text-5xl sm:text-6xl md:text-7xl font-black text-white mb-3 leading-none ht-fade-up tracking-tight"
                style={{ textShadow: "0 0 60px rgba(139,92,246,0.5)" }}>
                #TECH
              </h1>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold mb-4 ht-fade-up"
                style={{ background: "linear-gradient(to right,#c4b5fd,#818cf8,#60a5fa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                2026
              </h2>

              <p className="text-xl sm:text-2xl font-bold text-white mb-3 ht-fade-up">
                The Ultimate Technology Battlefield
              </p>
              <p className="text-sm sm:text-base mb-8 ht-fade-up" style={{ color: "#c4b5fd" }}>
                Robotics &nbsp;•&nbsp; Hackathons &nbsp;•&nbsp; Gaming &nbsp;•&nbsp; Engineering Challenges
              </p>

              <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border mb-8"
                style={{ background: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.12)" }}>
                <Calendar className="h-4 w-4" style={{ color: "#a78bfa" }} />
                <span className="font-semibold text-white text-sm">Ajeenkya DY Patil University, Pune</span>
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-wrap gap-4 justify-center">
                <Button
                  size="lg"
                  onClick={openPanel}
                  className="ht-pulse font-bold px-10 py-5 text-base rounded-2xl text-white border-0"
                  style={{ background: "linear-gradient(135deg,#7c3aed,#4f46e5)" }}
                >
                  <Rocket className="h-5 w-5 mr-2" />
                  Register for Events
                </Button>
                <a href="#events">
                  <Button
                    size="lg"
                    variant="outline"
                    className="font-bold px-10 py-5 text-base rounded-2xl transition-all"
                    style={{ borderColor: "rgba(139,92,246,0.5)", color: "#c4b5fd", background: "rgba(139,92,246,0.10)" }}
                  >
                    <ChevronRight className="h-5 w-5 mr-2" />
                    Explore Events
                  </Button>
                </a>
              </div>
            </div>
          </section>

          {/* ══════════════ STATS STRIP ══════════════ */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-12">
            {STATS.map((s) => (
              <div key={s.label}
                className="rounded-2xl border text-center p-5"
                style={{ background: "rgba(255,255,255,0.04)", borderColor: "rgba(139,92,246,0.20)", boxShadow: "0 0 18px rgba(139,92,246,0.06)" }}>
                <p className="text-2xl sm:text-3xl font-extrabold mb-1" style={{ color: "#c4b5fd" }}>{s.value}</p>
                <p className="text-xs" style={{ color: "#a5b4fc", lineHeight: 1.4 }}>{s.label}</p>
              </div>
            ))}
          </div>

          {/* ══════════════ ABOUT ══════════════ */}
          <div className="rounded-2xl border p-6 md:p-8 mb-12"
            style={{ background: "rgba(255,255,255,0.04)", borderColor: "rgba(139,92,246,0.20)", backdropFilter: "blur(12px)", boxShadow: "0 0 40px rgba(139,92,246,0.06)" }}>
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg,#7c3aed,#4f46e5)" }}>
                <CircuitBoard className="h-5 w-5 text-white" />
              </div>
              About #TECH 2026
            </h2>
            <div className="space-y-3 text-sm md:text-base leading-relaxed" style={{ color: "#ddd6fe" }}>
              <p>
                #TECH 2026 is ADYPU's flagship Technology Fest — a high-energy battleground where the brightest
                minds in engineering, coding, robotics and innovation come face-to-face to compete, collaborate
                and create.
              </p>
              <p>
                From autonomous robots to single-day hackathons, cutting-edge workshops to esports showdowns,
                #TECH is the ultimate technology experience for every student who wants to push their limits.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-4 mt-6">
              {[
                { icon: Bot,      color: "#a78bfa", title: "Robotics Battles",    sub: "Autonomous & RC robot competitions" },
                { icon: Code,     color: "#818cf8", title: "Coding Challenges",   sub: "Hackathon, CTF, and project showcase" },
                { icon: Gamepad2, color: "#6ee7b7", title: "Gaming Arena",        sub: "Esports tournaments and game showdowns" },
              ].map((item) => (
                <div key={item.title} className="rounded-xl p-4 text-center border" style={{ background: "rgba(255,255,255,0.07)", borderColor: "rgba(255,255,255,0.06)" }}>
                  <item.icon className="h-8 w-8 mx-auto mb-2" style={{ color: item.color }} />
                  <p className="font-semibold text-white text-sm">{item.title}</p>
                  <p className="text-xs mt-1" style={{ color: "#a5b4fc" }}>{item.sub}</p>
                </div>
              ))}
            </div>
          </div>

          {/* ══════════════ EVENTS SECTION ══════════════ */}
          <div id="events" className="mb-14">
            <h2 className="text-2xl font-bold text-white mb-2 text-center">Event Categories</h2>
            <p className="text-center text-sm mb-3" style={{ color: "#a5b4fc" }}>17+ events across 5 battlegrounds</p>
            <p className="text-center text-xs mb-8" style={{ color: "#7c6bb5" }}>
              Tap any event card to select it, then hit <span style={{ color: "#c4b5fd" }}>Register</span> below
            </p>

            <div className="space-y-10">
              {CATEGORIES.map((cat) => (
                <div key={cat.id} className="ht-card rounded-2xl border overflow-hidden"
                  style={{ background: "rgba(255,255,255,0.04)", borderColor: "rgba(139,92,246,0.18)" }}>

                  {/* Category header */}
                  <div className="relative h-40 overflow-hidden">
                    <img
                      src={cat.image}
                      alt={cat.label}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                    <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${cat.accent.replace('0.25', '0.88')}, rgba(5,0,16,0.75))` }} />
                    <div className="absolute bottom-0 left-0 right-0 p-5 flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${cat.color} flex items-center justify-center shadow-lg flex-shrink-0`}>
                        <cat.icon className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h3 className="text-white font-bold text-lg leading-tight">{cat.label}</h3>
                        <p className="text-xs" style={{ color: "#c4b5fd" }}>{cat.events.length} event{cat.events.length > 1 ? "s" : ""}</p>
                      </div>
                    </div>
                  </div>

                  {/* Event cards — tappable, no individual Register button */}
                  <div className="p-5 grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {cat.events.map((ev) => {
                      const isSelected = selected.has(ev.name);
                      const isClosed = isEventClosed(ev.name);
                      const details = EVENT_DETAILS[ev.name];
                      const insights = EVENT_INSIGHTS[ev.name];
                      const badgeColors: Record<string, { bg: string; text: string }> = {
                        "High Prize": { bg: "rgba(234,179,8,0.18)", text: "#fde047" },
                        "Popular":    { bg: "rgba(34,197,94,0.18)", text: "#86efac" },
                        "Workshop":   { bg: "rgba(6,182,212,0.18)", text: "#67e8f9" },
                      };
                      const badgeStyle = insights?.badge ? badgeColors[insights.badge] : null;
                      return (
                        <div
                          key={ev.name}
                          onClick={() => toggleEvent(ev.name)}
                          className={`ht-event-card rounded-xl p-4 border flex flex-col gap-2 relative${isSelected && !isClosed ? " selected" : ""}`}
                          style={{
                            background: isClosed ? "rgba(239,68,68,0.04)" : isSelected ? "rgba(139,92,246,0.15)" : "rgba(255,255,255,0.05)",
                            borderColor: isClosed ? "rgba(239,68,68,0.45)" : isSelected ? "rgba(139,92,246,0.7)" : cat.border,
                            opacity: isClosed ? 0.75 : 1,
                            cursor: isClosed ? "not-allowed" : "pointer",
                          }}
                        >
                          {/* Closed banner — full width across top */}
                          {isClosed && (
                            <div className="absolute top-0 left-0 right-0 flex items-center justify-center gap-1.5 py-1 rounded-t-xl"
                              style={{ background: "rgba(239,68,68,0.85)", backdropFilter: "blur(4px)" }}>
                              <span className="text-xs font-bold text-white tracking-wide">🔒 Registration Closed</span>
                            </div>
                          )}

                          {/* Checkmark indicator (hidden when closed) */}
                          <div className={`absolute right-3 ${isClosed ? "top-8" : "top-3"}`}>
                            {!isClosed && (isSelected
                              ? <CheckSquare className="h-4 w-4" style={{ color: "#a78bfa" }} />
                              : <Square className="h-4 w-4" style={{ color: "rgba(255,255,255,0.2)" }} />
                            )}
                          </div>

                          {/* Extra top padding when closed so banner doesn't overlap content */}
                          <div className={isClosed ? "mt-5" : ""}>
                            {/* Badge */}
                            {badgeStyle && (
                              <span className="self-start text-[10px] font-bold px-2 py-0.5 rounded-full mb-0.5 inline-block"
                                style={{ background: badgeStyle.bg, color: badgeStyle.text }}>
                                {insights!.badge === "High Prize" ? "🏆 " : insights!.badge === "Popular" ? "🔥 " : "🎓 "}
                                {insights!.badge}
                              </span>
                            )}

                            <p className="font-bold text-sm leading-tight pr-6" style={{ color: isClosed ? "rgba(255,255,255,0.5)" : "white" }}>{ev.name}</p>
                            <p className="text-xs flex-1 mt-1" style={{ color: isClosed ? "rgba(196,181,253,0.45)" : "#c4b5fd", lineHeight: 1.5 }}>{ev.desc}</p>
                          </div>

                          {/* Date / Time / Venue */}
                          {details && (
                            <div className="flex flex-col gap-1 mt-1 pt-2 border-t" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
                              <div className="flex items-center gap-1.5">
                                <Calendar className="h-3 w-3 shrink-0" style={{ color: "#818cf8" }} />
                                <span className="text-xs" style={{ color: "#a5b4fc" }}>{details.date}</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <Clock className="h-3 w-3 shrink-0" style={{ color: "#818cf8" }} />
                                <span className="text-xs" style={{ color: "#a5b4fc" }}>{details.time}</span>
                              </div>
                              <div className="flex items-start gap-1.5">
                                <MapPin className="h-3 w-3 shrink-0 mt-0.5" style={{ color: "#818cf8" }} />
                                <span className="text-xs" style={{ color: "#a5b4fc" }}>{details.venue}</span>
                              </div>
                            </div>
                          )}

                          {/* View Details button */}
                          {insights && (
                            <button
                              onClick={(e) => { e.stopPropagation(); setDetailEvent(ev.name); }}
                              className="mt-1 w-full py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-80 active:scale-95"
                              style={{ background: isClosed ? "rgba(239,68,68,0.12)" : "rgba(139,92,246,0.18)", color: isClosed ? "#f87171" : "#c4b5fd", border: `1px solid ${isClosed ? "rgba(239,68,68,0.3)" : "rgba(139,92,246,0.3)"}` }}
                            >
                              View Details →
                            </button>
                          )}

                          {isSelected && !isClosed && (
                            <p className="text-xs font-semibold" style={{ color: "#a78bfa" }}>✓ Selected</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ══════════════ FINAL CTA BANNER ══════════════ */}
          <div className="relative rounded-3xl overflow-hidden mb-24 border border-purple-500/25"
            style={{ boxShadow: "0 0 80px rgba(139,92,246,0.14)" }}>
            <div className="absolute inset-0" style={{ background: "linear-gradient(135deg,#0f0320,#1a0a40,#0d0530)" }} />
            <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 50% 50%, rgba(139,92,246,0.20), transparent 60%)" }} />
            <div className="absolute top-4 left-6 opacity-10 text-5xl select-none">🤖</div>
            <div className="absolute bottom-4 right-6 opacity-10 text-5xl select-none">🏆</div>
            <div className="relative z-10 text-center px-6 py-14">
              <h2 className="text-2xl md:text-4xl font-extrabold text-white mb-3">
                Ready to compete at #TECH 2026?
              </h2>
              <p className="text-base mb-8 max-w-xl mx-auto" style={{ color: "#c4b5fd" }}>
                Join hundreds of students from across Maharashtra in the ultimate technology battleground at ADYPU.
              </p>
              <Button
                size="lg"
                onClick={openPanel}
                className="ht-pulse-cyan font-bold px-12 py-5 text-lg rounded-2xl text-white border-0"
                style={{ background: "linear-gradient(135deg,#6d28d9,#2563eb)" }}
              >
                <Rocket className="h-5 w-5 mr-2" />
                Register for Events
              </Button>
            </div>
          </div>

          {/* WhatsApp Community CTA */}
          <div className="rounded-2xl overflow-hidden"
            style={{ background: "linear-gradient(135deg,rgba(37,211,102,0.14),rgba(18,140,67,0.1))", border: "2px solid rgba(37,211,102,0.4)" }}>
            <div className="px-5 py-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: "rgba(37,211,102,0.18)", border: "1px solid rgba(37,211,102,0.4)" }}>
                  {/* WhatsApp icon SVG */}
                  <svg viewBox="0 0 32 32" className="h-6 w-6" fill="#25d366">
                    <path d="M16 2C8.28 2 2 8.28 2 16c0 2.48.67 4.8 1.83 6.8L2 30l7.4-1.8A13.93 13.93 0 0016 30c7.72 0 14-6.28 14-14S23.72 2 16 2zm0 25.5c-2.3 0-4.45-.63-6.3-1.72l-.45-.27-4.65 1.13 1.17-4.52-.3-.47A11.46 11.46 0 014.5 16C4.5 9.6 9.6 4.5 16 4.5S27.5 9.6 27.5 16 22.4 27.5 16 27.5zm6.3-8.57c-.35-.17-2.05-1.01-2.37-1.12-.32-.12-.55-.17-.78.17s-.9 1.12-1.1 1.35c-.2.22-.4.25-.75.08-.35-.17-1.47-.54-2.8-1.72a10.5 10.5 0 01-1.94-2.4c-.2-.35-.02-.53.15-.7.15-.15.35-.4.52-.6.17-.2.22-.35.33-.58.12-.22.06-.42-.03-.6-.08-.17-.78-1.87-1.07-2.56-.28-.67-.57-.58-.78-.59h-.67c-.22 0-.58.08-.88.42-.3.33-1.15 1.12-1.15 2.73s1.18 3.17 1.34 3.39c.17.22 2.33 3.55 5.64 4.98.79.34 1.4.54 1.88.69.79.25 1.51.22 2.08.13.63-.1 1.94-.79 2.22-1.56.27-.77.27-1.43.19-1.56-.08-.14-.3-.22-.65-.38z"/>
                  </svg>
                </div>
                <div>
                  <p className="text-base font-extrabold text-white leading-tight">#TECH 2026 WhatsApp Community</p>
                  <p className="text-xs mt-0.5" style={{ color: "#86efac" }}>Updates, schedule &amp; event coordination</p>
                </div>
              </div>
              <p className="text-sm mb-2 leading-relaxed" style={{ color: "#d1fae5" }}>
                This is the community for all the events. Get the latest updates, event schedules and media by joining it!
              </p>
              <p className="text-sm mb-4 leading-relaxed font-semibold" style={{ color: "#86efac" }}>
                ALL PARTICIPANTS — Once you have registered for your interested event, you can join the respective group of that event.
              </p>
              <a
                href="https://chat.whatsapp.com/BZFrB1UVOlHIODhWj5YoZ1"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2.5 w-full py-3.5 rounded-xl font-bold text-base transition-all active:scale-95 hover:opacity-90"
                style={{ background: "#25d366", color: "#fff" }}>
                <svg viewBox="0 0 32 32" className="h-5 w-5" fill="white">
                  <path d="M16 2C8.28 2 2 8.28 2 16c0 2.48.67 4.8 1.83 6.8L2 30l7.4-1.8A13.93 13.93 0 0016 30c7.72 0 14-6.28 14-14S23.72 2 16 2zm0 25.5c-2.3 0-4.45-.63-6.3-1.72l-.45-.27-4.65 1.13 1.17-4.52-.3-.47A11.46 11.46 0 014.5 16C4.5 9.6 9.6 4.5 16 4.5S27.5 9.6 27.5 16 22.4 27.5 16 27.5zm6.3-8.57c-.35-.17-2.05-1.01-2.37-1.12-.32-.12-.55-.17-.78.17s-.9 1.12-1.1 1.35c-.2.22-.4.25-.75.08-.35-.17-1.47-.54-2.8-1.72a10.5 10.5 0 01-1.94-2.4c-.2-.35-.02-.53.15-.7.15-.15.35-.4.52-.6.17-.2.22-.35.33-.58.12-.22.06-.42-.03-.6-.08-.17-.78-1.87-1.07-2.56-.28-.67-.57-.58-.78-.59h-.67c-.22 0-.58.08-.88.42-.3.33-1.15 1.12-1.15 2.73s1.18 3.17 1.34 3.39c.17.22 2.33 3.55 5.64 4.98.79.34 1.4.54 1.88.69.79.25 1.51.22 2.08.13.63-.1 1.94-.79 2.22-1.56.27-.77.27-1.43.19-1.56-.08-.14-.3-.22-.65-.38z"/>
                </svg>
                Join WhatsApp Community
              </a>
            </div>
          </div>

          {/* Footer */}
          <footer className="text-center py-6 border-t" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
            <p className="text-sm mb-1" style={{ color: "#c4b5fd" }}>
              <span className="font-semibold" style={{ color: "#a78bfa" }}>Powered by StudentXchange</span>
            </p>
            <p className="text-xs" style={{ color: "#818cf8" }}>
              #TECH 2026 – Technology Fest · Ajeenkya DY Patil University, Pune
            </p>
          </footer>

        </div>

        {/* ══════════════ STICKY REGISTER BAR ══════════════ */}
        {/* On mobile: sits above the 56px ColabMobileNav (bottom-14). On md+: flush to bottom. */}
        <div
          className="fixed left-0 right-0 z-[60] px-4 pt-3 bottom-14 md:bottom-0"
          style={{
            paddingBottom: "max(12px, env(safe-area-inset-bottom))",
            background: "linear-gradient(to top, rgba(5,0,16,0.97) 60%, transparent)",
            backdropFilter: "blur(12px)",
          }}
        >
          <Button
            size="lg"
            onClick={openPanel}
            className="w-full max-w-lg mx-auto flex items-center justify-center gap-3 font-bold text-base rounded-2xl text-white border-0 ht-pulse"
            style={{ background: "linear-gradient(135deg,#7c3aed,#4f46e5)", display: "flex" }}
          >
            <Rocket className="h-5 w-5" />
            Register for Events
            {selected.size > 0 && (
              <span
                className="ml-1 px-2.5 py-0.5 rounded-full text-sm font-black"
                style={{ background: "rgba(255,255,255,0.25)" }}
              >
                {selected.size} selected
              </span>
            )}
          </Button>
        </div>

        {/* ══════════════ REGISTRATION PANEL ══════════════ */}
        {showPanel && (
          /*
           * z-[70] → above sticky bar (z-[60]) and mobile nav (z-50)
           * touch-action/overscroll prevents iOS page-scroll bleed-through
           * flex flex-col justify-end → panel anchors to bottom
           */
          <div
            className="fixed inset-0 z-[70] flex flex-col justify-end sm:justify-center sm:items-center"
            style={{ touchAction: "none", overscrollBehavior: "none" }}
          >
            {/* Full-screen backdrop — covers nav bar too */}
            <div
              className="absolute inset-0"
              style={{ background: "rgba(0,0,0,0.80)", backdropFilter: "blur(4px)" }}
              onClick={closePanel}
            />

            {/* Panel — mb-14 lifts it clear of the 56px mobile nav */}
            <div
              className="ht-panel-in relative w-full sm:max-w-2xl mx-0 sm:mx-4 rounded-t-3xl sm:rounded-3xl overflow-hidden flex flex-col mb-14 sm:mb-0"
              style={{
                background: "linear-gradient(160deg,#0f0320,#1a0a40,#0d0530)",
                border: "1px solid rgba(139,92,246,0.35)",
                boxShadow: "0 -8px 60px rgba(139,92,246,0.3)",
                maxHeight: "calc(85vh - 56px)",
              }}
            >
              {/* Panel header */}
              <div className="flex items-center justify-between px-6 py-5 border-b flex-shrink-0"
                style={{ borderColor: "rgba(139,92,246,0.25)" }}>
                <div>
                  <h3 className="text-xl font-extrabold text-white">#TECH 2026 — Select Events</h3>
                  <p className="text-xs mt-0.5" style={{ color: "#a5b4fc" }}>
                    {selected.size === 0
                      ? "Tap events below to select them"
                      : `${selected.size} event${selected.size > 1 ? "s" : ""} selected`}
                  </p>
                </div>
                <button
                  onClick={closePanel}
                  className="w-9 h-9 rounded-full flex items-center justify-center transition-colors hover:bg-white/10"
                  style={{ color: "#a5b4fc" }}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Event list — overscroll contain stops iOS page scroll bleed */}
              <div
                className="overflow-y-auto flex-1 px-4 py-4 space-y-4"
                style={{ overscrollBehavior: "contain", WebkitOverflowScrolling: "touch" } as React.CSSProperties}
                onTouchMove={(e) => e.stopPropagation()}
              >
                {CATEGORIES.map((cat) => (
                  <div key={cat.id}>
                    {/* Category label */}
                    <div className="flex items-center gap-2 mb-2 px-1">
                      <div className={`w-6 h-6 rounded-lg bg-gradient-to-br ${cat.color} flex items-center justify-center flex-shrink-0`}>
                        <cat.icon className="h-3.5 w-3.5 text-white" />
                      </div>
                      <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "#a5b4fc" }}>
                        {cat.label}
                      </span>
                    </div>
                    {/* Events */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {cat.events.map((ev) => {
                        const isSelected = selected.has(ev.name);
                        const cfg = EVENTS_BY_NAME[ev.name];
                        const isClosed = !!cfg?.closed;
                        return (
                          <button
                            key={ev.name}
                            onClick={() => !isClosed && toggleEvent(ev.name)}
                            disabled={isClosed}
                            className="text-left rounded-xl p-3.5 border flex items-start gap-3 transition-all relative overflow-hidden"
                            style={{
                              background: isClosed ? "rgba(255,255,255,0.02)" : isSelected ? "rgba(139,92,246,0.22)" : "rgba(255,255,255,0.04)",
                              borderColor: isClosed ? "rgba(239,68,68,0.4)" : isSelected ? "rgba(139,92,246,0.65)" : "rgba(255,255,255,0.08)",
                              boxShadow: isSelected && !isClosed ? "0 0 14px rgba(139,92,246,0.2)" : "none",
                              cursor: isClosed ? "not-allowed" : "pointer",
                              opacity: isClosed ? 0.65 : 1,
                            }}
                          >
                            <div className="flex-shrink-0 mt-0.5">
                              {isClosed
                                ? <Square className="h-4 w-4" style={{ color: "rgba(239,68,68,0.4)" }} />
                                : isSelected
                                  ? <CheckSquare className="h-4 w-4" style={{ color: "#a78bfa" }} />
                                  : <Square className="h-4 w-4" style={{ color: "rgba(255,255,255,0.25)" }} />
                              }
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-1 flex-wrap">
                                <p className="font-semibold text-sm leading-tight" style={{ color: isClosed ? "rgba(255,255,255,0.45)" : "white" }}>{ev.name}</p>
                                <div className="flex items-center gap-1.5 shrink-0 ml-1">
                                  {isClosed && (
                                    <span className="text-xs font-bold px-1.5 py-0.5 rounded-full" style={{ background: "rgba(239,68,68,0.2)", color: "#f87171", border: "1px solid rgba(239,68,68,0.35)" }}>
                                      🔒 Closed
                                    </span>
                                  )}
                                  {cfg && !isClosed && (
                                    <span className="text-xs font-bold" style={{ color: "#a78bfa" }}>₹{cfg.price}</span>
                                  )}
                                </div>
                              </div>
                              <p className="text-xs mt-0.5" style={{ color: "#8b7cc8", lineHeight: 1.4 }}>{ev.desc}</p>
                              {isClosed && (
                                <p className="text-xs mt-1 font-semibold" style={{ color: "#f87171" }}>Registration closed for this event</p>
                              )}
                              {cfg && !isClosed && (
                                <span className="inline-flex items-center gap-1 mt-1.5 px-1.5 py-0.5 rounded-full text-xs"
                                  style={cfg.type === "group"
                                    ? { background: "rgba(251,146,60,0.15)", color: "#fb923c" }
                                    : { background: "rgba(96,165,250,0.15)", color: "#60a5fa" }}>
                                  {cfg.type === "group" ? <Users className="h-2.5 w-2.5" /> : null}
                                  {cfg.type === "group" ? `Group · ${cfg.minTeamSize}–${cfg.maxTeamSize} members` : "Individual"}
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* Panel footer */}
              <div className="px-5 py-4 border-t flex-shrink-0"
                style={{ borderColor: "rgba(139,92,246,0.25)", background: "rgba(0,0,0,0.3)" }}>
                {selected.size > 0 && (
                  <>
                    <div className="mb-2.5 flex flex-wrap gap-1.5">
                      {Array.from(selected).map((name) => (
                        <span
                          key={name}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium"
                          style={{ background: "rgba(139,92,246,0.25)", color: "#c4b5fd", border: "1px solid rgba(139,92,246,0.4)" }}
                        >
                          {name}
                          <button onClick={(e) => { e.stopPropagation(); toggleEvent(name); }} className="hover:opacity-70">
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center justify-between mb-3 px-1">
                      <span className="text-xs" style={{ color: "#8b7cc8" }}>
                        {selected.size} event{selected.size > 1 ? "s" : ""} selected
                      </span>
                      <span className="text-sm font-extrabold" style={{ color: "#a78bfa" }}>
                        Total: ₹{calcTotal(Array.from(selected))}
                      </span>
                    </div>
                  </>
                )}
                <Button
                  size="lg"
                  disabled={selected.size === 0}
                  className="w-full font-bold text-base rounded-2xl text-white border-0"
                  style={{
                    background: selected.size > 0
                      ? "linear-gradient(135deg,#7c3aed,#2563eb)"
                      : "rgba(255,255,255,0.08)",
                    color: selected.size > 0 ? "white" : "rgba(255,255,255,0.35)",
                    cursor: selected.size > 0 ? "pointer" : "not-allowed",
                  }}
                  onClick={() => {
                    if (selected.size === 0) return;
                    localStorage.setItem("hastech_selected_events", JSON.stringify(Array.from(selected)));
                    setLocation("/hastech-register");
                  }}
                >
                  <Rocket className="h-5 w-5 mr-2" />
                  {selected.size === 0
                    ? "Select at least one event"
                    : `Confirm — ${selected.size} Event${selected.size > 1 ? "s" : ""} · ₹${calcTotal(Array.from(selected))}`}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════ EVENT DETAIL MODAL ══════════════ */}
        {detailEvent && (() => {
          const ins = EVENT_INSIGHTS[detailEvent];
          const det = EVENT_DETAILS[detailEvent];
          const ev  = EVENTS_BY_NAME[detailEvent];
          if (!ins) return null;
          const isSelected = selected.has(detailEvent);
          return (
            <div
              className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center"
              style={{ touchAction: "none" }}
            >
              {/* Backdrop */}
              <div
                className="absolute inset-0"
                style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(6px)" }}
                onClick={() => setDetailEvent(null)}
              />

              {/* Modal panel */}
              <div
                className="ht-panel-in relative w-full sm:max-w-lg mx-0 sm:mx-4 rounded-t-3xl sm:rounded-3xl flex flex-col mb-14 sm:mb-0 overflow-hidden"
                style={{
                  background: "linear-gradient(160deg,#0f0320,#1a0a40,#0d0530)",
                  border: "1px solid rgba(139,92,246,0.4)",
                  boxShadow: "0 -8px 60px rgba(139,92,246,0.35)",
                  maxHeight: "calc(88vh - 56px)",
                }}
              >
                {/* Header */}
                <div className="flex items-start justify-between px-5 pt-5 pb-4 border-b flex-shrink-0"
                  style={{ borderColor: "rgba(139,92,246,0.25)" }}>
                  <div className="flex-1 pr-3">
                    {ins.badge && (() => {
                      const bc = { "High Prize": { bg: "rgba(234,179,8,0.18)", text: "#fde047" }, "Popular": { bg: "rgba(34,197,94,0.18)", text: "#86efac" }, "Workshop": { bg: "rgba(6,182,212,0.18)", text: "#67e8f9" } }[ins.badge];
                      return (
                        <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mb-2"
                          style={{ background: bc.bg, color: bc.text }}>
                          {ins.badge === "High Prize" ? "🏆 " : ins.badge === "Popular" ? "🔥 " : "🎓 "}{ins.badge}
                        </span>
                      );
                    })()}
                    <h3 className="text-lg font-extrabold text-white leading-tight">{detailEvent}</h3>
                    {det && (
                      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5">
                        <span className="flex items-center gap-1 text-xs" style={{ color: "#a5b4fc" }}>
                          <Calendar className="h-3 w-3" />{det.date}
                        </span>
                        <span className="flex items-center gap-1 text-xs" style={{ color: "#a5b4fc" }}>
                          <Clock className="h-3 w-3" />{det.time}
                        </span>
                        <span className="flex items-center gap-1 text-xs" style={{ color: "#a5b4fc" }}>
                          <MapPin className="h-3 w-3" />{det.venue}
                        </span>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => setDetailEvent(null)}
                    className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 hover:bg-white/10 transition-colors"
                    style={{ color: "#a5b4fc" }}>
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Scrollable body */}
                <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4"
                  style={{ WebkitOverflowScrolling: "touch" }}>

                  {/* About */}
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "#818cf8" }}>About</p>
                    <p className="text-sm leading-relaxed" style={{ color: "#e2e8f0" }}>{ins.about}</p>
                  </div>

                  {/* Fee & Prize */}
                  <div className="rounded-xl p-3.5" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                    <p className="text-xs font-bold uppercase tracking-wider mb-2.5" style={{ color: "#818cf8" }}>Fee & Prize</p>
                    <div className="space-y-1.5">
                      {ins.fee && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs" style={{ color: "#94a3b8" }}>Registration Fee</span>
                          <span className="ml-auto text-sm font-bold" style={{ color: "#c4b5fd" }}>{ins.fee}</span>
                        </div>
                      )}
                      {ev && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs" style={{ color: "#94a3b8" }}>Team Size</span>
                          <span className="ml-auto text-xs font-semibold" style={{ color: "#a5b4fc" }}>
                            {ev.type === "individual" ? "Individual" : `${ev.minTeamSize}–${ev.maxTeamSize} members`}
                          </span>
                        </div>
                      )}
                      {ins.prize && ins.prize.length > 0 && (
                        <div className="mt-2 pt-2 border-t space-y-1" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
                          <p className="text-xs font-semibold" style={{ color: "#fbbf24" }}>🏆 Prize Pool</p>
                          {ins.prize.map((p) => (
                            <div key={p.label} className="flex items-center justify-between">
                              <span className="text-xs" style={{ color: "#94a3b8" }}>{p.label}</span>
                              <span className="text-sm font-extrabold" style={{ color: "#fde047" }}>{p.amount}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Rounds */}
                  {ins.rounds && ins.rounds.length > 0 && (
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "#818cf8" }}>Rounds / Structure</p>
                      <ol className="space-y-1.5">
                        {ins.rounds.map((r, i) => (
                          <li key={i} className="flex items-start gap-2.5">
                            <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5"
                              style={{ background: "rgba(139,92,246,0.25)", color: "#c4b5fd" }}>{i + 1}</span>
                            <span className="text-sm" style={{ color: "#cbd5e1" }}>{r}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}

                  {/* Highlights */}
                  {ins.highlights && ins.highlights.length > 0 && (
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "#818cf8" }}>Key Highlights</p>
                      <ul className="space-y-1">
                        {ins.highlights.map((h, i) => (
                          <li key={i} className="flex items-center gap-2 text-sm" style={{ color: "#cbd5e1" }}>
                            <span style={{ color: "#a78bfa" }}>✦</span> {h}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Footer action */}
                <div className="px-5 py-4 border-t flex-shrink-0" style={{ borderColor: "rgba(139,92,246,0.2)" }}>
                  <button
                    onClick={() => { toggleEvent(detailEvent); setDetailEvent(null); }}
                    className="w-full py-3 rounded-2xl font-bold text-base transition-all active:scale-95"
                    style={isSelected
                      ? { background: "rgba(139,92,246,0.2)", color: "#c4b5fd", border: "1px solid rgba(139,92,246,0.5)" }
                      : { background: "linear-gradient(135deg,#7c3aed,#4f46e5)", color: "#fff", border: "none" }
                    }
                  >
                    {isSelected ? "✓ Remove from selection" : "＋ Select this event"}
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

      </div>
    </>
  );
}
