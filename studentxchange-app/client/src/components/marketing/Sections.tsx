import { useEffect, useState, type FormEvent } from "react";
import { Link, useLocation } from "wouter";
import {
  Search, ArrowRight, ShoppingBag, Users, Briefcase, BookOpen, Cpu, Palette, UserRoundCheck, CreditCard,
  ScrollText, LifeBuoy, MapPin, Star, Flag, Lock, GraduationCap,
} from "lucide-react";
import { Reveal } from "@/components/marketing/mui";

/* ---------- Hero visual: soft campus illustration (replace by dropping /campus/hero.jpg in client/public) ---------- */
export function CampusArt() {
  const win = (x: number, y: number, cols: number, rows: number) =>
    Array.from({ length: cols * rows }, (_, i) => (
      <rect key={`${x}-${y}-${i}`} x={x + (i % cols) * 22} y={y + Math.floor(i / cols) * 26} width="12" height="16" rx="1.5" fill="#cfe0f2" />
    ));
  return (
    <div aria-hidden className="absolute inset-0 overflow-hidden rounded-[28px]"
      style={{ backgroundImage: "url(/campus/hero.jpg)", backgroundSize: "cover", backgroundPosition: "center" }}>
      <svg viewBox="0 0 1200 460" preserveAspectRatio="xMidYMax slice" className="absolute inset-0 h-full w-full opacity-90">
        <defs>
          <linearGradient id="skyg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#eaf1fb" /><stop offset="1" stopColor="#f6f8fc" /></linearGradient>
          <linearGradient id="ground" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#dfe8e0" /><stop offset="1" stopColor="#eef1ee" /></linearGradient>
        </defs>
        <rect width="1200" height="460" fill="url(#skyg)" />
        {/* left block */}
        <rect x="40" y="130" width="300" height="230" fill="#f7f9fc" stroke="#d6dfec" />
        <rect x="40" y="118" width="300" height="14" fill="#e3eaf4" />
        {win(62, 150, 11, 6)}
        {/* right block */}
        <rect x="860" y="110" width="300" height="250" fill="#f7f9fc" stroke="#d6dfec" />
        <rect x="860" y="98" width="300" height="14" fill="#e3eaf4" />
        {win(882, 132, 11, 6)}
        {/* centre hall */}
        <rect x="430" y="170" width="340" height="190" fill="#fbfcfe" stroke="#d6dfec" />
        <polygon points="420,170 600,120 780,170" fill="#e8eef7" stroke="#d6dfec" />
        {win(452, 196, 14, 4)}
        <rect x="570" y="300" width="60" height="60" fill="#dbe5f2" />
        {/* ground, path, trees */}
        <rect y="360" width="1200" height="100" fill="url(#ground)" />
        <polygon points="560,360 640,360 780,460 420,460" fill="#e9edf3" />
        {[[110, 372], [330, 380], [880, 376], [1090, 372]].map(([x, y]) => (
          <g key={`${x}`}><rect x={x - 3} y={y - 4} width="6" height="22" fill="#b9c7b4" /><circle cx={x} cy={y - 14} r="22" fill="#cfe0cd" /></g>
        ))}
      </svg>
      <div className="absolute inset-0 bg-gradient-to-b from-white/10 via-white/40 to-white/75" />
    </div>
  );
}

/* ---------- Hero search ---------- */
const PHRASES = ["textbooks, notes and lab gear", "hackathon teammates", "freelance design gigs", "internships and campus drives"];

export function HeroSearch() {
  const [, navigate] = useLocation();
  const [q, setQ] = useState("");
  const [typed, setTyped] = useState(PHRASES[0]);

  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    let i = 0, n = 0, dir = 1, t: ReturnType<typeof setTimeout>;
    const tick = () => {
      const word = PHRASES[i];
      n += dir;
      setTyped(word.slice(0, n));
      if (dir === 1 && n === word.length) { dir = -1; t = setTimeout(tick, 1600); return; }
      if (dir === -1 && n === 0) { dir = 1; i = (i + 1) % PHRASES.length; }
      t = setTimeout(tick, dir === 1 ? 55 : 28);
    };
    t = setTimeout(tick, 900);
    return () => clearTimeout(t);
  }, []);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    navigate(`/browse${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ""}`);
  };

  const tags = [
    { icon: BookOpen, label: "#Textbooks (Maths)", href: "/browse?q=maths" },
    { icon: Cpu, label: "#Project Partners (AI)", href: "/collab-search" },
    { icon: Palette, label: "#Freelance Gigs (UI)", href: "/student-lancing" },
  ];

  return (
    <div className="mx-auto w-full max-w-[760px]">
      <form onSubmit={submit} role="search" className="flex items-center gap-2 rounded-full bg-white p-1.5 shadow-[0_10px_28px_rgba(10,25,47,.12)] ring-1 ring-black/5 transition-shadow focus-within:shadow-[0_12px_32px_rgba(10,25,47,.18)] focus-within:ring-2 focus-within:ring-sky/60">
        <button type="submit" aria-label="Search" className="grid h-11 !w-11 !min-w-0 shrink-0 place-items-center rounded-full bg-navy text-white transition-transform hover:scale-105"><Search size={18} /></button>
        <label className="relative min-w-0 flex-1">
          <span className="sr-only">Search StudentXchange</span>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search for ${typed}`} className="h-11 w-full bg-transparent pr-3 text-[15px] outline-none placeholder:text-subtle" />
        </label>
      </form>
      <div className="mt-3.5 flex flex-wrap items-center justify-center gap-2 text-sm">
        <span className="text-navy/70">Trending tags</span>
        {tags.map(({ icon: I, label, href }) => (
          <Link key={label} href={href} className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white/90 px-3 py-1.5 text-[13px] text-navy transition-all hover:-translate-y-0.5 hover:border-sky hover:shadow-card"><I size={13} className="text-subtle" />{label}</Link>
        ))}
      </div>
    </div>
  );
}

/* ---------- Three portal cards ---------- */
const portals = [
  { icon: ShoppingBag, name: "Marketplace", sub: "Buy & sell student essentials", stat: "134+", statText: "listings", cta: "Browse Marketplace", href: "/marketplace", g: "from-[#FF9A8B] to-[#FF6B6B]", badge: null as null | { t: string; c: string } },
  { icon: Users, name: "Collab", sub: "Connect & collaborate", stat: "Profiles,", statText: "groups & events", cta: "Connect & Build", href: "/collab", g: "from-[#818CF8] to-[#6366F1]", badge: { t: "Popular", c: "bg-blue-500" } },
  { icon: Briefcase, name: "Freelance", sub: "Freelancing opportunities", stat: "Gigs,", statText: "internships & jobs", cta: "Explore Gigs", href: "/student-lancing", g: "from-[#34D399] to-[#10B981]", badge: { t: "New", c: "bg-emerald-500" } },
];

export function PortalCards() {
  return (
    <div className="grid gap-5 md:grid-cols-3">
      {portals.map(({ icon: I, name, sub, stat, statText, cta, href, g, badge }, i) => (
        <Reveal key={name} delay={i * 90}>
          <div className="group relative flex h-full flex-col rounded-2xl bg-white p-6 shadow-[0_6px_24px_rgba(10,25,47,.08)] ring-1 ring-black/[.04] transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_18px_40px_rgba(10,25,47,.14)]">
            {badge && <span className={`absolute right-4 top-4 rounded-full px-2.5 py-0.5 text-[11px] font-semibold text-white ${badge.c}`}>{badge.t}</span>}
            <div className="flex items-center gap-4">
              <span className={`grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br text-white shadow-md transition-transform duration-300 group-hover:scale-105 ${g}`}><I size={26} /></span>
              <div><h3 className="text-xl font-semibold tracking-tight">{name}</h3><p className="text-sm text-subtle">{sub}</p></div>
            </div>
            <p className="mt-5 text-[15px]"><b className="text-navy">{stat}</b> <span className="text-navy/80">{statText}</span></p>
            <Link href={href} className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-navy text-[15px] font-medium text-white transition-colors hover:bg-navy-2">
              {cta} <ArrowRight size={16} className="text-coral transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </Reveal>
      ))}
    </div>
  );
}

/* ---------- Highlights ticker (static highlights today; connect to a real activity feed when available) ---------- */
const HIGHLIGHTS = [
  "Marketplace: textbooks, electronics, lab gear and more",
  "Collab: find teammates for projects and hackathons",
  "Freelance: internships, jobs and gigs for students",
  "Career Compass: your roadmap from first year to placement",
  "Competitions and the Coding Arena",
];

export function HighlightsTicker() {
  const items = [...HIGHLIGHTS, ...HIGHLIGHTS];
  return (
    <div className="mx-auto flex max-w-[1180px] items-center overflow-hidden rounded-full border border-line bg-white shadow-card" aria-label="Platform highlights">
      <span className="z-10 shrink-0 bg-white py-3 pl-6 pr-5 text-sm font-semibold text-navy shadow-[8px_0_12px_-6px_rgba(10,25,47,.12)]">Highlights</span>
      <div className="marquee relative min-w-0 flex-1 overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_4%,#000_96%,transparent)]">
        <div className="marquee-track items-center" style={{ animationDuration: "42s" }}>
          {items.map((t, i) => (
            <span key={i} className="flex shrink-0 items-center whitespace-nowrap px-6 text-sm text-navy/80"><i className="mr-6 inline-block h-4 w-px bg-line" />{t}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------- Trust grid ---------- */
const trust = [
  { icon: UserRoundCheck, title: "Verified student identity", text: "Sign up with your college details." },
  { icon: CreditCard, title: "Secure payments", text: "Payments run through PayU." },
  { icon: ScrollText, title: "Community guidelines", text: "Clear rules for buyers and sellers." },
  { icon: LifeBuoy, title: "Help & support", text: "Policies, refunds and contact in one place." },
  { icon: MapPin, title: "Safe campus meetups", text: "Meet in public campus spaces." },
  { icon: Star, title: "Ratings & reviews", text: "See feedback before you buy." },
  { icon: Flag, title: "Report & moderation", text: "Flag listings and behaviour." },
  { icon: Lock, title: "Your data, protected", text: "Read our privacy policy." },
];

export function TrustGrid() {
  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-4">
      {trust.map(({ icon: I, title, text }, i) => (
        <Reveal key={title} delay={(i % 4) * 70} className="text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-sky-50 text-sky-600 transition-colors duration-300 hover:bg-navy hover:text-white"><I size={26} strokeWidth={1.6} /></span>
          <h3 className="mt-4 text-[15px] font-semibold">{title}</h3>
          <p className="mx-auto mt-1 max-w-[210px] text-sm text-subtle">{text}</p>
        </Reveal>
      ))}
    </div>
  );
}

/* ---------- Campus showcase: institutions in the rollout. Drop photos in client/public/campus/<slug>.jpg ---------- */
const campuses = [
  { slug: "adypu", name: "Ajeenkya DY Patil University", city: "Pune", tag: "General", g: "from-[#1e3a8a] to-[#0A192F]" },
  { slug: "sbup", name: "Sri Balaji University", city: "Pune", tag: "General", g: "from-[#0f766e] to-[#0A192F]" },
  { slug: "vedam", name: "Vedam Institute of Technology", city: "", tag: "Engineering", g: "from-[#4338ca] to-[#0A192F]" },
  { slug: "veloces", name: "Veloces Institute of Technology", city: "", tag: "Engineering", g: "from-[#9a3412] to-[#0A192F]" },
  { slug: "spicer", name: "Spicer Adventist University", city: "Pune", tag: "General", g: "from-[#6d28d9] to-[#0A192F]" },
];

export function CampusShowcase() {
  return (
    <div className="-mx-5 flex snap-x gap-4 overflow-x-auto px-5 pb-3 md:mx-0 md:grid md:grid-cols-3 md:overflow-visible md:px-0 lg:grid-cols-6 [scrollbar-width:none]">
      {campuses.map((c, i) => (
        <Reveal key={c.slug} delay={i * 70} className="w-[240px] shrink-0 snap-start md:w-auto">
          <div className="group h-full overflow-hidden rounded-2xl bg-white shadow-[0_6px_24px_rgba(10,25,47,.08)] ring-1 ring-black/[.04] transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_18px_40px_rgba(10,25,47,.14)]">
            <div className={`relative h-28 bg-gradient-to-br ${c.g}`} style={{ backgroundImage: `url(/campus/${c.slug}.jpg), linear-gradient(135deg, var(--tw-gradient-stops))`, backgroundSize: "cover", backgroundPosition: "center" }}>
              <GraduationCap className="absolute bottom-3 right-3 text-white/25" size={44} />
              <span className="absolute left-3 top-3 rounded-full bg-white/20 px-2.5 py-0.5 text-[11px] font-medium text-white backdrop-blur">{c.tag}</span>
            </div>
            <div className="p-4">
              <h3 className="text-sm font-semibold leading-snug">{c.name}</h3>
              <p className="mt-1 text-xs text-subtle">{c.city ? `${c.city} · ` : ""}Rolling out in 2026</p>
            </div>
          </div>
        </Reveal>
      ))}
      <Reveal delay={400} className="w-[240px] shrink-0 snap-start md:w-auto">
        <Link href="/lancing/login?mode=signup" className="group flex h-full min-h-[190px] flex-col items-start justify-between rounded-2xl border border-dashed border-navy/25 bg-white/60 p-5 transition-colors hover:border-navy hover:bg-white">
          <span className="text-sm font-semibold leading-snug">Bring StudentXchange to your campus</span>
          <span className="inline-flex items-center gap-1 text-sm font-medium text-sky-600">Partner with us <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" /></span>
        </Link>
      </Reveal>
    </div>
  );
}

/* ---------- Learn / Earn / Collaborate / Grow ---------- */
export const growth = [
  { k: "Learn", t: "Roadmaps, skills and assessments with Career Compass.", c: "text-sky-600 bg-sky-50" },
  { k: "Earn", t: "Sell what you don't need. Take gigs and internships.", c: "text-coral-600 bg-coral/10" },
  { k: "Collaborate", t: "Find teammates for projects, events and hackathons.", c: "text-indigo-600 bg-indigo-50" },
  { k: "Grow", t: "Track your progress from first year to placement.", c: "text-emerald-600 bg-emerald-50" },
];

