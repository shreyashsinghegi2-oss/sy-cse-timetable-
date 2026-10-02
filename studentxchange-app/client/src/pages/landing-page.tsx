import { useState, type FormEvent } from "react";
import { Link, useLocation } from "wouter";
import {
  ArrowRight, ShoppingBag, Users, Briefcase, Compass, Map, Brain, BookOpen, ClipboardCheck, Target, Sparkles,
  BarChart3, FileText, Building2, Search, ShieldCheck, ShoppingCart, MessageSquare, CalendarDays, Trophy, Zap,
  Code2, GraduationCap, Clock, MapPin, Users2, CheckCircle2, Plus, UserPlus, Rocket,
} from "lucide-react";
import SEOHead from "@/components/seo/seo-head";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { ProductMock } from "@/components/marketing/ProductMock";
import { EcosystemHub, ReadinessGauge, Wave } from "@/components/marketing/Graphics";
import { ButtonLink, Badge, Card, Reveal, CountUp } from "@/components/marketing/mui";

const stats: [number, string, string][] = [
  [3500, "+", "students"],
  [4830, "", "pipeline students"],
  [134, "+", "marketplace listings"],
  [33, "+", "completed orders"],
];

/** Explore-by-category tiles, each deep-linking into the live module. */
const categories = [
  { icon: Briefcase, name: "Internships", text: "Paid and unpaid roles, filtered to your year.", to: "/lancing/internships", tint: "bg-sky-50 text-sky-600 group-hover:bg-sky-500 group-hover:text-white" },
  { icon: Trophy, name: "Competitions", text: "Quizzes, case studies and design challenges.", to: "/competitions", tint: "bg-amber-50 text-amber-600 group-hover:bg-amber-500 group-hover:text-white" },
  { icon: Code2, name: "Hackathons & Coding", text: "Build with a team or compete in the Coding Arena.", to: "/collab-arena", tint: "bg-indigo-50 text-indigo-600 group-hover:bg-indigo-500 group-hover:text-white" },
  { icon: GraduationCap, name: "Campus drives", text: "Placement drives from partner colleges.", to: "/lancing/campus-drives", tint: "bg-emerald-50 text-emerald-600 group-hover:bg-emerald-500 group-hover:text-white" },
  { icon: Zap, name: "Freelancing", text: "Take on projects from companies and angels.", to: "/student-lancing", tint: "bg-cyan-50 text-cyan-600 group-hover:bg-cyan-500 group-hover:text-white" },
  { icon: Building2, name: "Company problems", text: "Real problem statements from employers.", to: "/lancing/companies", tint: "bg-violet-50 text-violet-600 group-hover:bg-violet-500 group-hover:text-white" },
];

const quick = ["Internships", "Hackathons", "Competitions", "Freelancing", "Campus drives"];

/** Illustrative cards only — wire to the opportunities API before launch. */
const bannerFor: Record<string, string> = {
  Hackathon: "from-sky-500 to-blue-700",
  Internship: "from-blue-600 to-indigo-700",
  Competition: "from-cyan-500 to-sky-700",
  "Campus drive": "from-indigo-600 to-blue-900",
};

const trending = [
  { type: "Hackathon", title: "Smart Campus Hackathon 2026", org: "ADYPU Innovation Centre", place: "Pune · Offline", left: "6 days left", joined: "842", reward: "₹1,00,000 prizes" },
  { type: "Internship", title: "Frontend Developer Intern", org: "Veloces Labs", place: "Pune · Hybrid", left: "12 days left", joined: "213", reward: "₹15,000 / month" },
  { type: "Competition", title: "National Coding Championship", org: "StudentXchange Arena", place: "Online", left: "3 days left", joined: "2,310", reward: "₹50,000 prizes" },
  { type: "Campus drive", title: "Software Engineer — Campus Drive", org: "Partner company", place: "Pune · Offline", left: "15 days left", joined: "1,180", reward: "Final-year" },
];

const steps = [
  { icon: UserPlus, title: "Create your verified profile", text: "Sign up with your college details. Add your degree, year, skills and goals once." },
  { icon: Map, title: "Get your roadmap", text: "Career Compass builds a year-wise plan with skills, learning paths and assessments." },
  { icon: Rocket, title: "Collaborate and apply", text: "Join teams, enter competitions and apply to internships and drives from one profile." },
];

const faqs = [
  ["Is StudentXchange free?", "Marketplace, Student Collab and the core Career Compass tools (goals, skills and roadmap generation, within quotas) are free. Career Compass Premium is ₹499 per student per year: a one-time payment, 365 days of access, no automatic renewal."],
  ["Do I need Premium to use the Marketplace or Collab?", "No. Premium unlocks Placement Readiness, skill assessments, learning paths and the Coding Arena. Marketplace and Collab work without it."],
  ["How does an institution partner with StudentXchange?", "Your college acts as the distribution and implementation partner, while students are billed directly for the annual career product. Institutions get roadmaps, cohort progress and readiness views."],
  ["How are payments handled?", "Payments are processed through PayU, and amounts are verified on the server before access is granted."],
  ["Who can join?", "Students from any institution can register. Companies, angels and placement cells have their own Lancing sign-in."],
];

const journey = ["First year", "Skills", "Collaboration", "Internships", "Projects", "Placement readiness", "Career"];

const compass = [
  [Map, "Roadmap"], [Target, "Skills"], [BookOpen, "Learning"], [ClipboardCheck, "Assessments"],
  [BarChart3, "Placement readiness"], [Search, "Opportunities"], [Brain, "AI guidance"],
] as const;

const inst = [
  [BarChart3, "Progress"], [Target, "Skill mapping"], [ClipboardCheck, "Readiness"], [FileText, "Reports"], [Building2, "Opportunity management"],
] as const;

const stories = [
  ["I stopped juggling five apps. My roadmap, teammates and internship applications now live in one place.", "Student, Computer Engineering"],
  ["Sold my semester notes in two days, and the buyer was verified from my own campus.", "Student, Business Studies"],
  ["Our placement cell finally sees where each student stands, from Year 1.", "Placement coordinator, partner college"],
];

/** Institutions in the pipeline. Only ADYPU has a logo asset in the project; others render as text until logos are supplied. */
const partners = ["Vedam Institute of Technology", "Veloces Institute of Technology", "Sri Balaji University, Pune", "Spicer Adventist University"];

function SectionHead({ eyebrow, title, text, action }: { eyebrow: string; title: string; text?: string; action?: React.ReactNode }) {
  return (
    <Reveal className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h2 className="h2 mt-3 max-w-2xl">{title}</h2>
        {text && <p className="lead mt-3 max-w-xl">{text}</p>}
      </div>
      {action}
    </Reveal>
  );
}

export default function LandingPage() {
  const [, navigate] = useLocation();
  const [q, setQ] = useState("");
  const search = (e: FormEvent) => {
    e.preventDefault();
    navigate(`/lancing/internships${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ""}`);
  };
  const marquee = [...partners, "Ajeenkya DY Patil University", ...partners, "Ajeenkya DY Patil University"];

  return (
    <div className="bg-white text-ink">
      <SEOHead
        title="StudentXchange — The Student Operating System"
        description="Learn, earn, collaborate and grow. Marketplace, Student Collab, StudentLancing and Career Compass under one verified student identity."
        canonical="https://studentxchange.in/"
      />
      <SiteHeader />
      <main>
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 -z-10 bg-gradient-to-b from-sky-50 via-white to-white" aria-hidden />
          <div className="bg-grid absolute inset-0 -z-10" aria-hidden />
          <div className="blob absolute -left-24 top-10 -z-10 h-72 w-72 rounded-full bg-sky/25 blur-3xl" aria-hidden />
          <div className="blob absolute -right-20 top-40 -z-10 h-80 w-80 rounded-full bg-blue-500/15 blur-3xl [animation-delay:-5s]" aria-hidden />
          <div className="container-x grid items-center gap-14 pb-20 pt-12 md:pt-20 lg:grid-cols-[1.15fr_1fr]">
            <div className="animate-fade-up">
              <span className="inline-flex items-center gap-2 rounded-full border border-sky/40 bg-white/80 px-3 py-1 text-xs font-medium text-sky-600 shadow-card backdrop-blur">
                <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full rounded-full bg-sky" style={{ animation: "ping-soft 1.8s ease-out infinite" }} /><span className="relative inline-flex h-2 w-2 rounded-full bg-sky-600" /></span>
                The student operating system
              </span>
              <h1 className="h1 mt-5">Everything a student needs to <span className="text-gradient">learn, earn, collaborate</span> and grow.</h1>
              <p className="lead mt-5 max-w-xl">Internships, competitions, a campus marketplace and a personal career roadmap, under one verified student identity.</p>

              <form onSubmit={search} className="mt-8 flex max-w-xl items-center gap-2 rounded-2xl border border-line bg-white p-1.5 shadow-pop transition-shadow focus-within:border-sky-600 focus-within:ring-4 focus-within:ring-sky/20" role="search">
                <Search size={18} className="ml-3 shrink-0 text-subtle" aria-hidden />
                <label className="min-w-0 flex-1"><span className="sr-only">Search opportunities</span>
                  <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search internships, hackathons, skills…" className="h-11 w-full bg-transparent text-sm outline-none placeholder:text-subtle/70" />
                </label>
                <button type="submit" className="btn-shine h-11 !w-auto shrink-0 rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 px-5 text-sm font-medium text-white transition-transform hover:scale-[1.03] active:scale-[0.98]">Search</button>
              </form>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                <span className="text-subtle">Popular:</span>
                {quick.map((t) => (
                  <Link key={t} href="/lancing/internships" className="rounded-full border border-line bg-white px-3 py-1 text-xs transition-all hover:-translate-y-0.5 hover:border-sky hover:bg-sky-50">{t}</Link>
                ))}
              </div>

              <div className="mt-8 flex flex-wrap gap-3">
                <ButtonLink href="/auth?mode=signup" variant="dark" size="lg">Register free <ArrowRight size={16} /></ButtonLink>
                <ButtonLink href="/auth" variant="secondary" size="lg">Log in</ButtonLink>
              </div>
            </div>
            <ProductMock />
          </div>
        </section>

        {/* Traction */}
        <section aria-label="Traction" className="band-blue text-white">
          <div className="container-x grid grid-cols-2 gap-y-8 py-10 md:grid-cols-4">
            {stats.map(([n, suf, l], i) => (
              <Reveal key={l} delay={i * 90} className="md:text-center">
                <div className="text-3xl font-semibold tracking-tight md:text-4xl"><CountUp to={n} suffix={suf} /></div>
                <div className="mt-1 text-sm text-white/75">{l}</div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* Explore by category */}
        <section id="opportunities" className="container-x py-20 md:py-24">
          <SectionHead eyebrow="Explore" title="Find the next thing worth doing." text="Six ways in, one profile behind all of them." />
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map(({ icon: I, name, text, to, tint }, i) => (
              <Reveal key={name} delay={i * 70}>
                <Link href={to} className="group block h-full">
                  <Card className="lift flex h-full items-start gap-4 p-5">
                    <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl transition-colors duration-300 ${tint}`}><I size={20} /></span>
                    <span className="flex-1">
                      <span className="flex items-center justify-between text-base font-semibold tracking-tight">{name}<ArrowRight size={16} className="text-subtle transition-transform duration-200 group-hover:translate-x-1 group-hover:text-sky-600" /></span>
                      <span className="mt-1 block text-sm text-subtle">{text}</span>
                    </span>
                  </Card>
                </Link>
              </Reveal>
            ))}
          </div>

          <div className="mt-14">
            <Reveal><h3 className="text-lg font-semibold tracking-tight">Trending now</h3></Reveal>
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {trending.map((o, i) => (
                <Reveal key={o.title} delay={i * 90}>
                  <Card className="lift flex h-full flex-col overflow-hidden">
                    <div className={`relative flex h-28 items-end overflow-hidden bg-gradient-to-br p-3 ${bannerFor[o.type]}`} aria-hidden>
                      <div className="absolute -right-6 -top-6 h-28 w-28 rounded-full bg-white/10" />
                      <div className="absolute right-6 top-8 h-12 w-12 rounded-full bg-white/10" />
                      <span className="relative rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-medium text-white backdrop-blur">{o.type}</span>
                    </div>
                    <div className="flex flex-1 flex-col p-4">
                      <h4 className="line-clamp-2 text-sm font-semibold leading-snug">{o.title}</h4>
                      <p className="mt-1 text-xs text-subtle">{o.org}</p>
                      <div className="mt-3 space-y-1.5 text-xs text-subtle">
                        <p className="flex items-center gap-1.5"><MapPin size={12} />{o.place}</p>
                        <p className="flex items-center gap-1.5"><Users2 size={12} />{o.joined} registered</p>
                        <p className="flex items-center gap-1.5 font-medium text-ink"><Trophy size={12} className="text-amber-500" />{o.reward}</p>
                      </div>
                      <p className="mt-auto flex items-center gap-1.5 pt-4 text-xs font-medium text-amber-600"><Clock size={12} />{o.left}</p>
                    </div>
                  </Card>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* Ecosystem */}
        <section id="product" className="bg-gradient-to-b from-surface-2 to-white py-20 md:py-24">
          <div className="container-x">
            <div className="grid items-center gap-12 lg:grid-cols-[1fr_1fr]">
              <Reveal>
                <p className="eyebrow">One ecosystem</p>
                <h2 className="h2 mt-3">Four products. One identity. <span className="text-gradient">One loop.</span></h2>
                <p className="lead mt-4 max-w-md">Your profile, skills and activity travel with you. What you do in Collab strengthens your career roadmap, and your roadmap points you to the right opportunities.</p>
                <ul className="mt-6 space-y-3 text-sm">
                  {["Verified student identity across every product", "Progress and history that carry over", "One login, one profile, one place"].map((t) => (
                    <li key={t} className="flex items-center gap-3"><span className="grid h-6 w-6 place-items-center rounded-full bg-sky-50 text-sky-600"><CheckCircle2 size={14} /></span>{t}</li>
                  ))}
                </ul>
              </Reveal>
              <Reveal delay={120}><EcosystemHub /></Reveal>
            </div>
            <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { icon: ShoppingBag, name: "Marketplace", text: "Buy and sell academic resources with verified students.", to: "/marketplace", g: "from-sky-500 to-blue-600" },
                { icon: Users, name: "Student Collab", text: "Find teammates, join communities, ship projects together.", to: "/collab", g: "from-blue-500 to-indigo-600" },
                { icon: Briefcase, name: "StudentLancing", text: "Internships, jobs and freelance work with clear application states.", to: "/student-lancing", g: "from-cyan-500 to-sky-600" },
                { icon: Compass, name: "Career Compass", text: "An AI roadmap from first year to placement, with progress you can see.", to: "/lancing/career-compass", g: "from-indigo-500 to-blue-700" },
              ].map(({ icon: I, name, text, to, g }, i) => (
                <Reveal key={name} delay={i * 90}>
                  <Link href={to} className="group block h-full">
                    <Card className="lift h-full p-6">
                      <div className={`grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br text-white shadow-md transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3 ${g}`}><I size={20} /></div>
                      <h3 className="mt-5 text-lg font-semibold tracking-tight">{name}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-subtle">{text}</p>
                      <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-sky-600">Open <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" /></span>
                    </Card>
                  </Link>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="container-x py-20 md:py-24">
          <SectionHead eyebrow="How it works" title="Up and running in three steps." />
          <div className="relative mt-12 grid gap-6 md:grid-cols-3">
            <div className="absolute left-[16%] right-[16%] top-7 hidden h-px md:block" aria-hidden>
              <svg width="100%" height="2" className="overflow-visible"><line x1="0" y1="1" x2="100%" y2="1" stroke="#38bdf8" strokeWidth="2" className="dash-flow" /></svg>
            </div>
            {steps.map(({ icon: I, title, text }, i) => (
              <Reveal key={title} delay={i * 120}>
                <div className="relative text-center">
                  <div className="relative mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-sky-500 to-blue-700 text-white shadow-lg shadow-sky-500/30"><I size={22} />
                    <span className="absolute -right-2 -top-2 grid h-6 w-6 place-items-center rounded-full border-2 border-white bg-ink text-[11px] font-semibold">{i + 1}</span>
                  </div>
                  <h3 className="mt-5 text-lg font-semibold tracking-tight">{title}</h3>
                  <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-subtle">{text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* Journey */}
        <section id="journey" className="container-x py-20 md:py-24">
          <SectionHead eyebrow="Student journey" title="From first year to first offer." />
          <div role="list" className="mt-10 flex overflow-x-auto pb-2 [scrollbar-width:none]">
            {journey.map((s, i) => (
              <Reveal key={s} delay={i * 80} className="min-w-[140px] flex-1 pr-4">
                <div role="listitem">
                  <div className="flex items-center">
                    <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-xs font-semibold text-white shadow-md ${i === journey.length - 1 ? "bg-gradient-to-br from-sky-500 to-blue-700" : "bg-ink"}`}>{i + 1}</span>
                    {i < journey.length - 1 && <span className="ml-2 h-0.5 flex-1 rounded bg-gradient-to-r from-sky/70 to-line" />}
                  </div>
                  <p className="mt-3 text-sm font-medium">{s}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* Career Compass */}
        <section id="compass" className="bg-gradient-to-b from-sky-50 to-white py-20 md:py-24">
          <div className="container-x grid items-center gap-12 lg:grid-cols-2">
            <Reveal>
              <Badge tone="sky">Premium · ₹499 / year</Badge>
              <h2 className="h2 mt-4">Career Compass turns “what should I do next?” into a <span className="text-gradient">plan</span>.</h2>
              <p className="lead mt-4">Pick your degree, goals and skills. Get a roadmap, learning paths and assessments, and a readiness score that moves as you do.</p>
              <ButtonLink href="/lancing/career-compass" className="mt-7" variant="dark">See Career Compass <ArrowRight size={16} /></ButtonLink>
            </Reveal>
            <Reveal delay={120}>
              <Card className="p-6 shadow-pop">
                <div className="flex flex-col items-center gap-6 sm:flex-row">
                  <ReadinessGauge value={68} />
                  <div className="w-full flex-1 space-y-3">
                    <p className="text-sm font-semibold">Skill progress</p>
                    {[["Data structures", 82], ["React & TypeScript", 64], ["SQL", 47]].map(([n, v]) => (
                      <div key={n as string}>
                        <div className="mb-1 flex justify-between text-xs"><span>{n}</span><span className="text-subtle">{v}%</span></div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-surface-2"><div className="h-full rounded-full bg-gradient-to-r from-sky to-blue-600" style={{ width: `${v}%` }} /></div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="mt-6 flex flex-wrap gap-2 border-t border-line pt-5">
                  {compass.map(([I, l]) => (
                    <span key={l} className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-3 py-1.5 text-xs font-medium text-sky-600"><I size={13} />{l}</span>
                  ))}
                </div>
              </Card>
            </Reveal>
          </div>
        </section>

        <Wave fill="#071A2E" />
        {/* Institutions + logos */}
        <section id="institutions" className="section-navy py-20 text-white md:py-28">
          <div className="container-x">
            <Reveal>
              <p className="eyebrow !text-sky">For institutions</p>
              <h2 className="h2 mt-3 max-w-2xl">Career visibility from Year 1, not just placement season.</h2>
              <p className="mt-4 max-w-xl text-base text-white/65">Roadmaps, cohort progress and readiness in one dashboard. Students pay directly, so colleges stay out of the billing.</p>
            </Reveal>
            <div className="mt-10 grid grid-cols-2 gap-3 md:grid-cols-5">
              {inst.map(([I, l], i) => (
                <Reveal key={l} delay={i * 70}>
                  <div className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:border-sky/50 hover:bg-white/10"><I size={18} className="text-sky" /><p className="mt-3 text-sm font-medium">{l}</p></div>
                </Reveal>
              ))}
            </div>
            <div className="mt-12 border-t border-white/10 pt-8">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/50">Institutions on the platform and in rollout</p>
              <div className="marquee relative mt-6 overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_10%,#000_90%,transparent)]">
                <div className="marquee-track items-center gap-12">
                  {marquee.map((p, i) => p.startsWith("Ajeenkya")
                    ? <span key={i} className="grid h-14 shrink-0 place-items-center rounded-lg bg-white px-4"><img src="/adypu-logo.png" alt="Ajeenkya DY Patil University" width={88} height={36} className="h-9 w-[88px] object-contain" /></span>
                    : <span key={i} className="shrink-0 text-base font-medium text-white/70">{p}</span>)}
                </div>
              </div>
            </div>
            <div className="mt-10 flex flex-wrap gap-3">
              <ButtonLink href="/lancing/login?mode=signup" size="lg">Partner with us <ArrowRight size={16} /></ButtonLink>
              <ButtonLink href="/lancing/login" variant="secondary" size="lg" className="!border-white/25 !bg-transparent !text-white hover:!bg-white/10">Institution login</ButtonLink>
            </div>
          </div>
        </section>

        {/* Marketplace */}
        <section id="marketplace" className="container-x grid items-center gap-12 py-20 md:py-28 lg:grid-cols-2">
          <div className="order-2 grid grid-cols-2 gap-3 lg:order-1">
            {[["Data Structures Notes", "₹199", "from-sky-100 to-blue-200"], ["Engineering Drawing Kit", "₹349", "from-indigo-100 to-blue-200"], ["Python Cheat Sheets", "₹99", "from-cyan-100 to-sky-200"], ["DBMS Previous Papers", "₹149", "from-blue-100 to-indigo-200"]].map(([n, p, g], i) => (
              <Reveal key={n} delay={i * 80}>
                <Card className="lift overflow-hidden">
                  <div className={`aspect-[4/3] bg-gradient-to-br ${g}`} />
                  <div className="p-3"><p className="text-sm font-medium">{n}</p>
                    <div className="mt-1 flex items-center justify-between"><span className="text-sm font-semibold">{p}</span><Badge tone="success">Verified</Badge></div>
                  </div>
                </Card>
              </Reveal>
            ))}
          </div>
          <Reveal className="order-1 lg:order-2">
            <p className="eyebrow">Marketplace</p>
            <h2 className="h2 mt-3">Verified campus commerce.</h2>
            <ul className="mt-6 space-y-3 text-sm">
              {[[Search, "Search and filter by category"], [ShieldCheck, "Verified student sellers"], [ShoppingCart, "Cart and one-step checkout"]].map(([I, t]) => {
                const Icon = I as typeof Search;
                return <li key={t as string} className="flex items-center gap-3"><span className="grid h-7 w-7 place-items-center rounded-full bg-sky-50 text-sky-600"><Icon size={14} /></span>{t as string}</li>;
              })}
            </ul>
            <ButtonLink href="/marketplace" className="mt-7" variant="secondary">Browse the marketplace <ArrowRight size={16} /></ButtonLink>
          </Reveal>
        </section>

        {/* Collab */}
        <section id="collab" className="bg-gradient-to-b from-surface-2 to-white py-20 md:py-24">
          <div className="container-x">
            <SectionHead eyebrow="Student Collab" title="A professional network, built for students." />
            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {[[Users, "Profiles and matching", "Skills, goals and projects decide who you meet."], [MessageSquare, "Messaging", "Direct and group chats for teams and communities."], [CalendarDays, "Events", "Hackathons, meetups and club activity in one feed."]].map(([I, t, d], i) => {
                const Icon = I as typeof Users;
                return (
                  <Reveal key={t as string} delay={i * 90}>
                    <Card className="lift p-6"><span className="grid h-10 w-10 place-items-center rounded-xl bg-sky-50 text-sky-600"><Icon size={20} /></span>
                      <h3 className="mt-4 text-base font-semibold">{t as string}</h3><p className="mt-1.5 text-sm text-subtle">{d as string}</p>
                    </Card>
                  </Reveal>
                );
              })}
            </div>
          </div>
        </section>

        {/* AI */}
        <section className="section-navy py-20 text-white md:py-28">
          <div className="container-x grid items-center gap-12 lg:grid-cols-2">
            <Reveal>
              <p className="eyebrow !text-sky">AI, where it helps</p>
              <h2 className="h2 mt-3">Guidance that reads your goals, not your buzzwords.</h2>
              <p className="mt-4 text-base text-white/65">Roadmap generation, skill-gap analysis and learning paths, all kept inside your plan with quotas you can see.</p>
            </Reveal>
            <Reveal delay={120}>
              <div className="float-slow rounded-2xl border border-white/10 bg-white/5 p-5 font-mono text-[13px] leading-relaxed shadow-2xl backdrop-blur" aria-hidden>
                <div className="mb-3 flex gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-white/20" /><i className="h-2.5 w-2.5 rounded-full bg-white/20" /><i className="h-2.5 w-2.5 rounded-full bg-white/20" /></div>
                <p className="text-white/50">› goal: backend engineer · year 2</p>
                <p className="mt-2 text-sky">Skill gap: databases, system design</p>
                <p className="mt-1 text-white/80">Week 1–2 · SQL fundamentals</p>
                <p className="text-white/80">Week 3–4 · REST API project</p>
                <p className="text-white/80">Week 5 · Mock assessment<span className="ml-1 inline-block h-4 w-2 translate-y-0.5 animate-pulse bg-sky" /></p>
              </div>
            </Reveal>
          </div>
        </section>

        {/* Why */}
        <section className="container-x py-20 md:py-24">
          <SectionHead eyebrow="Why StudentXchange" title="Built with the students who use it." />
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {stories.map(([q, a], i) => (
              <Reveal key={a} delay={i * 90}>
                <Card className="lift h-full p-6"><p className="text-sm leading-relaxed">“{q}”</p><p className="mt-4 text-xs text-subtle">{a}</p></Card>
              </Reveal>
            ))}
          </div>
          <ul className="mt-8 flex flex-wrap gap-x-8 gap-y-3 text-sm text-subtle">
            {["One verified student identity", "Server-side access control", "Secure PayU payments"].map((t) => (
              <li key={t} className="flex items-center gap-2"><CheckCircle2 size={16} className="text-sky-600" />{t}</li>
            ))}
          </ul>
        </section>

        {/* FAQ */}
        <section id="faq" className="container-x py-20 md:py-24">
          <div className="grid gap-10 lg:grid-cols-[1fr_1.4fr]">
            <Reveal>
              <p className="eyebrow">FAQ</p>
              <h2 className="h2 mt-3">Questions, answered.</h2>
              <p className="lead mt-4 max-w-sm">Can’t find what you’re looking for? Read our <Link href="/policies" className="text-sky-600 underline underline-offset-4">policies</Link> or write to the team.</p>
            </Reveal>
            <Reveal delay={100}>
              <div className="divide-y divide-line rounded-2xl border border-line bg-white">
                {faqs.map(([q, a]) => (
                  <details key={q} className="faq group px-5 py-4">
                    <summary className="flex items-center justify-between gap-4 text-left text-[15px] font-medium">
                      {q}
                      <span className="faq-plus grid h-7 w-7 shrink-0 place-items-center rounded-full bg-surface-2 text-ink transition-all duration-300"><Plus size={15} /></span>
                    </summary>
                    <p className="faq-body mt-3 pr-10 text-sm leading-relaxed text-subtle">{a}</p>
                  </details>
                ))}
              </div>
            </Reveal>
          </div>
        </section>

        {/* Final CTA */}
        <section className="container-x pb-20 md:pb-28">
          <Reveal>
            <div className="cta-blue relative overflow-hidden rounded-3xl px-6 py-14 text-center text-white md:py-20">
              <div className="blob absolute -left-10 -top-10 h-56 w-56 rounded-full bg-white/10 blur-2xl" aria-hidden />
              <div className="blob absolute -bottom-16 right-0 h-64 w-64 rounded-full bg-sky/30 blur-3xl [animation-delay:-6s]" aria-hidden />
              <div className="relative mx-auto grid h-24 w-24 place-items-center rounded-full bg-white shadow-xl"><img src="/logo-mark.png" alt="StudentXchange" className="float-slow h-[68px] w-auto" /></div>
              <h2 className="h2 relative mx-auto mt-6 max-w-3xl">Your college years should build your career, not scatter your attention.</h2>
              <div className="relative mt-8 flex flex-wrap justify-center gap-3">
                <ButtonLink href="/auth?mode=signup" variant="white" size="lg">Register free <ArrowRight size={16} /></ButtonLink>
                <ButtonLink href="/auth" variant="secondary" size="lg" className="!border-white/40 !bg-transparent !text-white hover:!bg-white/10">Log in</ButtonLink>
              </div>
            </div>
          </Reveal>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
