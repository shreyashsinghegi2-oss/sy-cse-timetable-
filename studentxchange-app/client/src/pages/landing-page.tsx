import { Link } from "wouter";
import { ArrowRight, ShieldCheck, Users } from "lucide-react";
import SEOHead from "@/components/seo/seo-head";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { Reveal } from "@/components/marketing/mui";
import { CampusArt, HeroSearch, PortalCards, HighlightsTicker, TrustGrid, CampusShowcase, growth } from "@/components/marketing/Sections";

function Heading({ title, sub }: { title: string; sub?: string }) {
  return (
    <Reveal className="text-center">
      <h2 className="text-[28px] font-semibold leading-tight tracking-tight text-navy md:text-[36px]">{title}</h2>
      {sub && <p className="mx-auto mt-2 max-w-xl text-[15px] text-subtle">{sub}</p>}
    </Reveal>
  );
}

export default function LandingPage() {
  return (
    <div className="bg-[#F8F9FA] text-navy">
      <SEOHead
        title="StudentXchange — The Complete Campus Ecosystem for Student Ambition"
        description="One platform to trade gear, find collaborators, and land gigs. Marketplace, Collab and Freelance for students."
        canonical="https://studentxchange.in/"
      />
      <SiteHeader />
      <main>
        {/* Hero */}
        <section className="relative">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(60%_50%_at_20%_0%,rgba(255,107,107,.10),transparent),radial-gradient(60%_50%_at_85%_10%,rgba(99,102,241,.12),transparent),radial-gradient(50%_40%_at_60%_60%,rgba(16,185,129,.08),transparent)]" aria-hidden />
          <div className="hero-dots absolute inset-0 -z-10" aria-hidden />
          <div className="container-x pt-6 md:pt-10">
            <div className="relative px-2 pb-[150px] pt-10 text-center md:px-10 md:pb-[170px] md:pt-14">
              <CampusArt />
              <div className="relative animate-fade-up">
                <h1 className="mx-auto max-w-[900px] text-[32px] font-bold leading-[1.1] tracking-tight text-navy md:text-[46px]">The Complete Campus Ecosystem for Student Ambition.</h1>
                <p className="mx-auto mt-4 max-w-xl text-base text-navy/80 md:text-lg">One platform to trade gear, find collaborators, and land gigs.</p>
                <div className="mt-8"><HeroSearch /></div>
              </div>
            </div>
          </div>
        </section>

        {/* Portal cards overlap the hero */}
        <section className="container-x relative z-10 -mt-[120px] md:-mt-[140px]" aria-label="Explore StudentXchange">
          <PortalCards />
          <div className="mt-6 flex items-center justify-center gap-5 text-sm text-navy/80">
            <span className="inline-flex items-center gap-2"><Users size={16} />3,500+ students</span>
            <span className="h-4 w-px bg-line" aria-hidden />
            <span className="inline-flex items-center gap-2"><ShieldCheck size={16} />Verified student identity</span>
          </div>
        </section>

        <section className="container-x mt-8"><HighlightsTicker /></section>

        {/* Trust */}
        <section className="container-x py-20 md:py-24">
          <Heading title="Trusted Community & Safe Trading" />
          <div className="mt-12"><TrustGrid /></div>
        </section>

        {/* Campuses */}
        <section className="bg-white py-20 md:py-24">
          <div className="container-x">
            <Heading title="Campuses we're building with" sub="Rolling out across Pune and beyond." />
            <div className="mt-10"><CampusShowcase /></div>
          </div>
        </section>

        {/* Learn / Earn / Collaborate / Grow */}
        <section className="container-x py-20 md:py-24">
          <Heading title="Learn. Earn. Collaborate. Grow." />
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {growth.map(({ k, t, c }, i) => (
              <Reveal key={k} delay={i * 80}>
                <div className="h-full rounded-2xl bg-white p-6 ring-1 ring-black/[.05] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_14px_32px_rgba(10,25,47,.10)]">
                  <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${c}`}>{k}</span>
                  <p className="mt-4 text-[15px] leading-snug text-navy/80">{t}</p>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal className="mt-12 flex flex-wrap justify-center gap-3">
            <Link href="/auth?mode=signup" className="group inline-flex h-12 items-center gap-2 rounded-full bg-navy px-7 text-[15px] font-semibold text-white transition-all hover:scale-[1.03] hover:bg-navy-2">Register free <ArrowRight size={16} className="text-coral transition-transform group-hover:translate-x-0.5" /></Link>
            <Link href="/auth" className="inline-flex h-12 items-center rounded-full border border-navy/20 bg-white px-7 text-[15px] font-medium text-navy transition-colors hover:border-navy">Log in</Link>
          </Reveal>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
