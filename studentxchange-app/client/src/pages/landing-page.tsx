import { useState, type FormEvent } from "react";
import { Link, useLocation } from "wouter";
import {
  ArrowRight, ShoppingBag, Users, Briefcase, Compass, Map, Brain, BookOpen, ClipboardCheck, Target, Sparkles,
  BarChart3, FileText, Building2, Search, ShieldCheck, ShoppingCart, MessageSquare, CalendarDays, Trophy, Zap,
  Code2, GraduationCap, Clock, MapPin, Users2, CheckCircle2,
} from "lucide-react";
import SEOHead from "@/components/seo/seo-head";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { ProductMock } from "@/components/marketing/ProductMock";
import { ButtonLink, Badge, Card } from "@/components/marketing/mui";

const stats = [
  ["3,500+", "students"],
  ["4,830", "pipeline students"],
  ["134+", "marketplace listings"],
  ["33+", "completed orders"],
];

/** Explore-by-category tiles, each deep-linking into the live module. */
const categories = [
  { icon: Briefcase, name: "Internships", text: "Paid and unpaid roles, filtered to your year.", to: "/lancing/internships" },
  { icon: Trophy, name: "Competitions", text: "Quizzes, case studies and design challenges.", to: "/competitions" },
  { icon: Code2, name: "Hackathons & Coding", text: "Build with a team or compete in the Coding Arena.", to: "/collab-arena" },
  { icon: GraduationCap, name: "Campus drives", text: "Placement drives from partner colleges.", to: "/lancing/campus-drives" },
  { icon: Zap, name: "Freelancing", text: "Take on projects from companies and angels.", to: "/student-lancing" },
  { icon: Building2, name: "Company problems", text: "Real problem statements from employers.", to: "/lancing/companies" },
];

const quick = ["Internships", "Hackathons", "Competitions", "Freelancing", "Campus drives"];

/** Illustrative cards only — wire to the opportunities API before launch. */
const trending = [
  { type: "Hackathon", title: "Smart Campus Hackathon 2026", org: "ADYPU Innovation Centre", place: "Pune · Offline", left: "6 days left", joined: "842", reward: "₹1,00,000 prizes" },
  { type: "Internship", title: "Frontend Developer Intern", org: "Veloces Labs", place: "Pune · Hybrid", left: "12 days left", joined: "213", reward: "₹15,000 / month" },
  { type: "Competition", title: "National Coding Championship", org: "StudentXchange Arena", place: "Online", left: "3 days left", joined: "2,310", reward: "₹50,000 prizes" },
  { type: "Campus drive", title: "Software Engineer — Campus Drive", org: "Partner company", place: "Pune · Offline", left: "15 days left", joined: "1,180", reward: "Final-year" },
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
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h2 className="h2 mt-3 max-w-2xl">{title}</h2>
        {text && <p className="lead mt-3 max-w-xl">{text}</p>}
      </div>
      {action}
    </div>
  );
}

export default function LandingPage() {
  const [, navigate] = useLocation();
  const [q, setQ] = useState("");
  const search = (e: FormEvent) => {
    e.preventDefault();
    navigate(`/lancing/internships${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ""}`);
  };

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
          <div className="absolute inset-x-0 top-0 -z-10 h-[520px] bg-gradient-to-b from-sky-50 to-white" aria-hidden />
          <div className="container-x grid items-center gap-12 pb-16 pt-12 md:pt-20 lg:grid-cols-[1.2fr_1fr]">
            <div className="animate-fade-up">
              <p className="eyebrow">The student operating system</p>
              <h1 className="h1 mt-4">Everything a student needs to learn, earn, collaborate and grow.</h1>
              <p className="lead mt-5 max-w-xl">Internships, competitions, a campus marketplace and a personal career roadmap, under one verified student identity.</p>

              <form onSubmit={search} className="mt-8 flex max-w-xl items-center gap-2 rounded-xl border border-line bg-white p-1.5 shadow-card focus-within:border-sky-600 focus-within:ring-2 focus-within:ring-sky/30" role="search">
                <Search size={18} className="ml-3 shrink-0 text-subtle" aria-hidden />
                <label className="min-w-0 flex-1"><span className="sr-only">Search opportunities</span>
                  <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search internships, hackathons, skills…" className="h-11 w-full bg-transparent text-sm outline-none placeholder:text-subtle/70" />
                </label>
                <button type="submit" className="h-11 !w-auto shrink-0 rounded-lg bg-ink px-5 text-sm font-medium text-white transition-colors hover:bg-ink-2">Search</button>
              </form>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                <span className="text-subtle">Popular:</span>
                {quick.map((t) => (
                  <Link key={t} href="/lancing/internships" className="rounded-full border border-line px-3 py-1 text-xs transition-colors hover:border-sky hover:bg-sky-50">{t}</Link>
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
        <section aria-label="Traction" className="border-y border-line bg-surface-2">
          <div className="container-x grid grid-cols-2 gap-y-6 py-8 md:grid-cols-4">
            {stats.map(([n, l]) => (
              <div key={l} className="md:text-center">
                <div className="text-2xl font-semibold tracking-tight md:text-3xl">{n}</div>
                <div className="text-sm text-subtle">{l}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Explore by category */}
        <section id="opportunities" className="container-x py-20 md:py-24">
          <SectionHead eyebrow="Explore" title="Find the next thing worth doing." text="Six ways in, one profile behind all of them." />
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map(({ icon: I, name, text, to }) => (
              <Link key={name} href={to} className="group">
                <Card className="flex h-full items-start gap-4 p-5 transition-colors duration-150 group-hover:border-sky">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-sky-50 text-sky-600"><I size={20} /></span>
                  <span className="flex-1">
                    <span className="flex items-center justify-between text-base font-semibold tracking-tight">{name}<ArrowRight size={16} className="text-subtle transition-transform group-hover:translate-x-0.5" /></span>
                    <span className="mt-1 block text-sm text-subtle">{text}</span>
                  </span>
                </Card>
              </Link>
            ))}
          </div>

          <div className="mt-14">
            <h3 className="text-lg font-semibold tracking-tight">Trending now</h3>
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {trending.map((o) => (
                <Card key={o.title} className="flex flex-col overflow-hidden transition-colors hover:border-sky">
                  <div className="flex h-24 items-end bg-gradient-to-br from-ink to-ink-2 p-3" aria-hidden>
                    <Badge tone="sky">{o.type}</Badge>
                  </div>
                  <div className="flex flex-1 flex-col p-4">
                    <h4 className="line-clamp-2 text-sm font-semibold leading-snug">{o.title}</h4>
                    <p className="mt-1 text-xs text-subtle">{o.org}</p>
                    <div className="mt-3 space-y-1.5 text-xs text-subtle">
                      <p className="flex items-center gap-1.5"><MapPin size={12} />{o.place}</p>
                      <p className="flex items-center gap-1.5"><Users2 size={12} />{o.joined} registered</p>
                      <p className="flex items-center gap-1.5 text-ink"><Trophy size={12} />{o.reward}</p>
                    </div>
                    <p className="mt-auto flex items-center gap-1.5 pt-4 text-xs font-medium text-subtle"><Clock size={12} />{o.left}</p>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Ecosystem */}
        <section id="product" className="bg-surface-2 py-20 md:py-24">
          <div className="container-x">
            <SectionHead eyebrow="One ecosystem" title="Four products. One identity. One loop." />
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { icon: ShoppingBag, name: "Marketplace", text: "Buy and sell academic resources with verified students.", to: "/marketplace" },
                { icon: Users, name: "Student Collab", text: "Find teammates, join communities, ship projects together.", to: "/collab" },
                { icon: Briefcase, name: "StudentLancing", text: "Internships, jobs and freelance work with clear application states.", to: "/student-lancing" },
                { icon: Compass, name: "Career Compass", text: "An AI roadmap from first year to placement, with progress you can see.", to: "/lancing/career-compass" },
              ].map(({ icon: I, name, text, to }) => (
                <Link key={name} href={to} className="group">
                  <Card className="h-full p-6 transition-colors duration-150 group-hover:border-sky">
                    <div className="grid h-10 w-10 place-items-center rounded-lg bg-sky-50 text-sky-600"><I size={20} /></div>
                    <h3 className="mt-5 text-lg font-semibold tracking-tight">{name}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-subtle">{text}</p>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Journey */}
        <section id="journey" className="container-x py-20 md:py-24">
          <SectionHead eyebrow="Student journey" title="From first year to first offer." />
          <ol className="mt-10 flex overflow-x-auto pb-2 [scrollbar-width:none]">
            {journey.map((s, i) => (
              <li key={s} className="min-w-[140px] flex-1 pr-4">
                <div className="flex items-center">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-ink text-xs font-semibold text-white">{i + 1}</span>
                  {i < journey.length - 1 && <span className="ml-2 h-px flex-1 bg-line" />}
                </div>
                <p className="mt-3 text-sm font-medium">{s}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Career Compass */}
        <section id="compass" className="bg-surface-2 py-20 md:py-24">
          <div className="container-x grid items-center gap-12 lg:grid-cols-2">
            <div>
              <Badge tone="sky">Premium · ₹499 / year</Badge>
              <h2 className="h2 mt-4">Career Compass turns “what should I do next?” into a plan.</h2>
              <p className="lead mt-4">Pick your degree, goals and skills. Get a roadmap, learning paths and assessments, and a readiness score that moves as you do.</p>
              <ButtonLink href="/lancing/career-compass" className="mt-7" variant="dark">See Career Compass <ArrowRight size={16} /></ButtonLink>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {compass.map(([I, l]) => (
                <Card key={l} className="p-4"><I size={18} className="text-sky-600" /><p className="mt-3 text-sm font-medium">{l}</p></Card>
              ))}
            </div>
          </div>
        </section>

        {/* Institutions + logos */}
        <section id="institutions" className="bg-ink py-20 text-white md:py-28">
          <div className="container-x">
            <p className="eyebrow !text-sky">For institutions</p>
            <h2 className="h2 mt-3 max-w-2xl">Career visibility from Year 1, not just placement season.</h2>
            <p className="mt-4 max-w-xl text-base text-white/60">Roadmaps, cohort progress and readiness in one dashboard. Students pay directly, so colleges stay out of the billing.</p>
            <div className="mt-10 grid grid-cols-2 gap-3 md:grid-cols-5">
              {inst.map(([I, l]) => (
                <div key={l} className="rounded-xl border border-white/10 bg-ink-2 p-4"><I size={18} className="text-sky" /><p className="mt-3 text-sm font-medium">{l}</p></div>
              ))}
            </div>
            <div className="mt-12 border-t border-white/10 pt-8">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/50">Institutions on the platform and in rollout</p>
              <div className="mt-5 flex flex-wrap items-center gap-x-8 gap-y-5">
                <span className="grid h-14 place-items-center rounded-lg bg-white px-4"><img src="/adypu-logo.png" alt="Ajeenkya DY Patil University" width={88} height={36} className="h-9 w-[88px] object-contain" loading="lazy" /></span>
                {partners.map((p) => <span key={p} className="text-sm font-medium text-white/70">{p}</span>)}
              </div>
            </div>
            <div className="mt-10 flex flex-wrap gap-3">
              <ButtonLink href="/lancing/login?mode=signup" size="lg">Partner with us</ButtonLink>
              <ButtonLink href="/lancing/login" variant="secondary" size="lg" className="!border-white/20 !bg-transparent !text-white hover:!bg-white/10">Institution login</ButtonLink>
            </div>
          </div>
        </section>

        {/* Marketplace */}
        <section id="marketplace" className="container-x grid items-center gap-12 py-20 md:py-28 lg:grid-cols-2">
          <div className="order-2 grid grid-cols-2 gap-3 lg:order-1">
            {[["Data Structures Notes", "₹199"], ["Engineering Drawing Kit", "₹349"], ["Python Cheat Sheets", "₹99"], ["DBMS Previous Papers", "₹149"]].map(([n, p]) => (
              <Card key={n} className="overflow-hidden">
                <div className="aspect-[4/3] bg-surface-2" />
                <div className="p-3"><p className="text-sm font-medium">{n}</p>
                  <div className="mt-1 flex items-center justify-between"><span className="text-sm font-semibold">{p}</span><Badge tone="success">Verified</Badge></div>
                </div>
              </Card>
            ))}
          </div>
          <div className="order-1 lg:order-2">
            <p className="eyebrow">Marketplace</p>
            <h2 className="h2 mt-3">Verified campus commerce.</h2>
            <ul className="mt-6 space-y-3 text-sm">
              {[[Search, "Search and filter by category"], [ShieldCheck, "Verified student sellers"], [ShoppingCart, "Cart and one-step checkout"]].map(([I, t]) => {
                const Icon = I as typeof Search;
                return <li key={t as string} className="flex items-center gap-3"><Icon size={16} className="text-sky-600" />{t as string}</li>;
              })}
            </ul>
            <ButtonLink href="/marketplace" className="mt-7" variant="secondary">Browse the marketplace <ArrowRight size={16} /></ButtonLink>
          </div>
        </section>

        {/* Collab */}
        <section id="collab" className="bg-surface-2 py-20 md:py-24">
          <div className="container-x">
            <SectionHead eyebrow="Student Collab" title="A professional network, built for students." />
            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {[[Users, "Profiles and matching", "Skills, goals and projects decide who you meet."], [MessageSquare, "Messaging", "Direct and group chats for teams and communities."], [CalendarDays, "Events", "Hackathons, meetups and club activity in one feed."]].map(([I, t, d]) => {
                const Icon = I as typeof Users;
                return (
                  <Card key={t as string} className="p-6"><Icon size={20} className="text-sky-600" />
                    <h3 className="mt-4 text-base font-semibold">{t as string}</h3><p className="mt-1.5 text-sm text-subtle">{d as string}</p>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>

        {/* AI */}
        <section className="bg-ink py-20 text-white md:py-28">
          <div className="container-x grid items-center gap-12 lg:grid-cols-2">
            <div>
              <p className="eyebrow !text-sky">AI, where it helps</p>
              <h2 className="h2 mt-3">Guidance that reads your goals, not your buzzwords.</h2>
              <p className="mt-4 text-base text-white/60">Roadmap generation, skill-gap analysis and learning paths, all kept inside your plan with quotas you can see.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-ink-2 p-5 font-mono text-[13px] leading-relaxed" aria-hidden>
              <p className="text-white/50">› goal: backend engineer · year 2</p>
              <p className="mt-2 text-sky">Skill gap: databases, system design</p>
              <p className="mt-1 text-white/80">Week 1–2 · SQL fundamentals</p>
              <p className="text-white/80">Week 3–4 · REST API project</p>
              <p className="text-white/80">Week 5 · Mock assessment</p>
            </div>
          </div>
        </section>

        {/* Why */}
        <section className="container-x py-20 md:py-24">
          <SectionHead eyebrow="Why StudentXchange" title="Built with the students who use it." />
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {stories.map(([q, a]) => (
              <Card key={a} className="p-6"><p className="text-sm leading-relaxed">“{q}”</p><p className="mt-4 text-xs text-subtle">{a}</p></Card>
            ))}
          </div>
          <ul className="mt-8 flex flex-wrap gap-x-8 gap-y-3 text-sm text-subtle">
            {["One verified student identity", "Server-side access control", "Secure PayU payments"].map((t) => (
              <li key={t} className="flex items-center gap-2"><CheckCircle2 size={16} className="text-sky-600" />{t}</li>
            ))}
          </ul>
        </section>

        {/* Final CTA */}
        <section className="container-x pb-20 md:pb-28">
          <div className="rounded-3xl bg-ink px-6 py-14 text-center text-white md:py-20">
            <Sparkles size={22} className="mx-auto text-sky" aria-hidden />
            <h2 className="h2 mx-auto mt-4 max-w-3xl">Your college years should build your career, not scatter your attention.</h2>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <ButtonLink href="/auth?mode=signup" size="lg">Register free</ButtonLink>
              <ButtonLink href="/auth" variant="secondary" size="lg" className="!border-white/20 !bg-transparent !text-white hover:!bg-white/10">Log in</ButtonLink>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
