import {
  ArrowRight, ShoppingBag, Users, Briefcase, Compass, Map, Brain, BookOpen, ClipboardCheck, Target, Sparkles,
  BarChart3, FileText, Building2, Search, ShieldCheck, ShoppingCart, MessageSquare, CalendarDays, Trophy, Zap,
} from "lucide-react";
import { Link } from "wouter";
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

const products = [
  { icon: ShoppingBag, name: "Marketplace", text: "Buy and sell academic resources with verified students.", to: "/marketplace" },
  { icon: Users, name: "Student Collab", text: "Find teammates, join communities, ship projects together.", to: "/collab" },
  { icon: Briefcase, name: "StudentLancing", text: "Internships, jobs and freelance work with clear application states.", to: "/student-lancing" },
  { icon: Compass, name: "Career Compass", text: "An AI roadmap from first year to placement, with progress you can see.", to: "/lancing/career-compass" },
];

const journey = ["First year", "Skills", "Collaboration", "Internships", "Projects", "Placement readiness", "Career"];

const compass = [
  [Map, "Roadmap"], [Target, "Skills"], [BookOpen, "Learning"], [ClipboardCheck, "Assessments"],
  [BarChart3, "Placement readiness"], [Search, "Opportunities"], [Brain, "AI guidance"],
] as const;

const inst = [
  [BarChart3, "Progress"], [Target, "Skill mapping"], [ClipboardCheck, "Readiness"], [FileText, "Reports"], [Building2, "Opportunity management"],
] as const;

const opp = [
  ["Internships", Briefcase], ["Jobs", Building2], ["Freelancing", Zap], ["Competitions", Trophy], ["Hackathons", Sparkles], ["Campus drives", CalendarDays],
] as const;

const stories = [
  ["I stopped juggling five apps. My roadmap, teammates and internship applications now live in one place.", "Aarav, SY Computer Engineering"],
  ["Sold my semester notes in two days, and the buyer was verified from my own campus.", "Meera, Business Studies"],
  ["Our placement cell finally sees where each student stands, from Year 1.", "Placement coordinator, partner college"],
];

export default function Landing() {
  return (
    <div>
      <SEOHead
        title="StudentXchange — The Student Operating System"
        description="Learn, earn, collaborate and grow. Marketplace, Student Collab, StudentLancing and Career Compass under one verified student identity."
        canonical="https://studentxchange.in/"
      />
      <SiteHeader />
      <main>
        {/* 02 Hero */}
        <section className="container-x grid items-center gap-12 pb-16 pt-14 md:pt-20 lg:grid-cols-[1.05fr_1fr]">
          <div className="animate-fade-up">
            <p className="eyebrow">The student operating system</p>
            <h1 className="h1 mt-4">Everything a student needs to learn, earn, collaborate and grow.</h1>
            <p className="lead mt-5 max-w-xl">Marketplace, community, opportunities and a personal career roadmap, under one verified student identity.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href="/auth" variant="dark" size="lg">Get Started <ArrowRight size={16} /></ButtonLink>
              <ButtonLink href="/marketplace" variant="secondary" size="lg">Explore StudentXchange</ButtonLink>
            </div>
          </div>
          <ProductMock />
        </section>

        {/* 03 Traction */}
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

        {/* 04 Ecosystem */}
        <section id="product" className="container-x py-20 md:py-28">
          <p className="eyebrow">One ecosystem</p>
          <h2 className="h2 mt-3 max-w-2xl">Four products. One identity. One loop.</h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {products.map(({ icon: I, name, text, to }) => (
              <Link key={name} href={to} className="group">
                <Card className="h-full p-6 transition-colors duration-150 group-hover:border-sky">
                  <div className="grid h-10 w-10 place-items-center rounded-lg bg-sky-50 text-sky-600"><I size={20} /></div>
                  <h3 className="mt-5 text-lg font-semibold tracking-tight">{name}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-subtle">{text}</p>
                </Card>
              </Link>
            ))}
          </div>
        </section>

        {/* 05 Journey */}
        <section id="journey" className="bg-surface-2 py-20 md:py-24">
          <div className="container-x">
            <p className="eyebrow">Student journey</p>
            <h2 className="h2 mt-3 max-w-2xl">From first year to first offer.</h2>
            <ol className="mt-10 flex gap-0 overflow-x-auto pb-2 [scrollbar-width:none]">
              {journey.map((s, i) => (
                <li key={s} className="relative min-w-[140px] flex-1 pr-4">
                  <div className="flex items-center">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-ink text-xs font-semibold text-white">{i + 1}</span>
                    {i < journey.length - 1 && <span className="ml-2 h-px flex-1 bg-line" />}
                  </div>
                  <p className="mt-3 text-sm font-medium">{s}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* 06 Career Compass */}
        <section id="compass" className="container-x grid items-center gap-12 py-20 md:py-28 lg:grid-cols-2">
          <div>
            <Badge tone="sky">Premium · ₹499 / year</Badge>
            <h2 className="h2 mt-4">Career Compass turns “what should I do next?” into a plan.</h2>
            <p className="lead mt-4">Pick your degree, goals and skills. Get a roadmap, learning paths and assessments, and a readiness score that moves as you do.</p>
            <ButtonLink href="/lancing/career-compass" className="mt-7" variant="dark">See Career Compass <ArrowRight size={16} /></ButtonLink>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {compass.map(([I, l]) => (
              <Card key={l} className="p-4">
                <I size={18} className="text-sky-600" />
                <p className="mt-3 text-sm font-medium">{l}</p>
              </Card>
            ))}
          </div>
        </section>

        {/* 07 Institutions */}
        <section id="institutions" className="bg-ink py-20 text-white md:py-28">
          <div className="container-x">
            <p className="eyebrow !text-sky">For institutions</p>
            <h2 className="h2 mt-3 max-w-2xl">Career visibility from Year 1, not just placement season.</h2>
            <p className="mt-4 max-w-xl text-base text-white/60">Roadmaps, cohort progress and readiness in one dashboard. Students pay directly, so colleges stay out of the billing.</p>
            <div className="mt-10 grid grid-cols-2 gap-3 md:grid-cols-5">
              {inst.map(([I, l]) => (
                <div key={l} className="rounded-xl border border-white/10 bg-ink-2 p-4">
                  <I size={18} className="text-sky" />
                  <p className="mt-3 text-sm font-medium">{l}</p>
                </div>
              ))}
            </div>
            <ButtonLink href="/auth" size="lg" className="mt-10">Partner with us</ButtonLink>
          </div>
        </section>

        {/* 08 Marketplace */}
        <section id="marketplace" className="container-x grid items-center gap-12 py-20 md:py-28 lg:grid-cols-2">
          <div className="order-2 grid grid-cols-2 gap-3 lg:order-1">
            {[["Data Structures Notes", "₹199"], ["Engineering Drawing Kit", "₹349"], ["Python Cheat Sheets", "₹99"], ["DBMS Previous Papers", "₹149"]].map(([n, p]) => (
              <Card key={n} className="overflow-hidden">
                <div className="aspect-[4/3] bg-surface-2" />
                <div className="p-3">
                  <p className="text-sm font-medium">{n}</p>
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
          </div>
        </section>

        {/* 09 Collab */}
        <section id="collab" className="bg-surface-2 py-20 md:py-28">
          <div className="container-x">
            <p className="eyebrow">Student Collab</p>
            <h2 className="h2 mt-3 max-w-2xl">A professional network, built for students.</h2>
            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {[[Users, "Profiles and matching", "Skills, goals and projects decide who you meet."], [MessageSquare, "Messaging", "Direct and group chats for teams and communities."], [CalendarDays, "Events", "Hackathons, meetups and club activity in one feed."]].map(([I, t, d]) => {
                const Icon = I as typeof Users;
                return (
                  <Card key={t as string} className="p-6">
                    <Icon size={20} className="text-sky-600" />
                    <h3 className="mt-4 text-base font-semibold">{t as string}</h3>
                    <p className="mt-1.5 text-sm text-subtle">{d as string}</p>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>

        {/* 10 Opportunities */}
        <section id="opportunities" className="container-x py-20 md:py-28">
          <p className="eyebrow">Opportunities</p>
          <h2 className="h2 mt-3 max-w-2xl">Find the next thing worth doing.</h2>
          <div className="mt-8 flex flex-wrap gap-2">
            {opp.map(([l, I]) => (
              <span key={l} className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 text-sm"><I size={14} className="text-sky-600" />{l}</span>
            ))}
          </div>
          <div className="mt-8 divide-y divide-line rounded-xl border border-line">
            {[["Frontend Intern", "Pune · Remote", "Internship"], ["Smart India Hackathon prep", "Team formation open", "Hackathon"], ["Campus drive — Aug", "Placement cell", "Drive"]].map(([t, m, k]) => (
              <div key={t} className="flex items-center justify-between gap-4 p-4">
                <div><p className="text-sm font-medium">{t}</p><p className="text-xs text-subtle">{m}</p></div>
                <Badge tone="sky">{k}</Badge>
              </div>
            ))}
          </div>
        </section>

        {/* 11 AI */}
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

        {/* 12 Testimonials */}
        <section className="container-x py-20 md:py-28">
          <h2 className="h2 max-w-2xl">Built with the students who use it.</h2>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {stories.map(([q, a]) => (
              <Card key={a} className="p-6">
                <p className="text-sm leading-relaxed">“{q}”</p>
                <p className="mt-4 text-xs text-subtle">{a}</p>
              </Card>
            ))}
          </div>
        </section>

        {/* 13 Final CTA */}
        <section className="container-x pb-20 md:pb-28">
          <div className="rounded-3xl bg-surface-2 px-6 py-14 text-center md:py-20">
            <h2 className="h2 mx-auto max-w-3xl">Your college years should build your career, not scatter your attention.</h2>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <ButtonLink href="/auth" variant="dark" size="lg">Join StudentXchange</ButtonLink>
              <ButtonLink href="/auth" variant="secondary" size="lg">Partner with us</ButtonLink>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
