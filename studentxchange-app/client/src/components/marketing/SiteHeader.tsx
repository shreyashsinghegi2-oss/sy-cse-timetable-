import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { ArrowRight, ChevronDown, GraduationCap, Briefcase, Building2, Menu, X } from "lucide-react";
import { BrandMark } from "@/components/brand/brand-mark";

const links = [
  { label: "Explore", href: "/browse" },
  { label: "Marketplace", href: "/marketplace" },
  { label: "Collab", href: "/collab" },
  { label: "Freelance", href: "/student-lancing" },
  { label: "About", href: "/about" },
];

const accounts = [
  { icon: GraduationCap, title: "Student login", desc: "Marketplace and Student Collab", href: "/auth" },
  { icon: ArrowRight, title: "Create an account", desc: "Free for students", href: "/auth?mode=signup" },
  { icon: Briefcase, title: "StudentLancing", desc: "Gigs, internships, Career Compass", href: "/lancing/login" },
  { icon: Building2, title: "Institution / company", desc: "Placement cells and recruiters", href: "/lancing/login" },
];

function AccountMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const close = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", esc); };
  }, []);
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(!open)} aria-haspopup="menu" aria-expanded={open}
        className="inline-flex h-10 items-center gap-1 rounded-lg px-2 text-sm font-medium text-navy transition-colors hover:text-sky-600">
        Login / Register <ChevronDown size={14} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div role="menu" className="animate-fade-up absolute right-0 top-12 z-50 w-72 rounded-xl border border-line bg-white p-2 shadow-pop">
          {accounts.map(({ icon: I, title, desc, href }) => (
            <Link key={title} href={href} role="menuitem" onClick={() => setOpen(false)} className="flex items-start gap-3 rounded-lg p-3 transition-colors hover:bg-surface-2">
              <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-navy/5 text-navy"><I size={16} /></span>
              <span><span className="block text-sm font-medium">{title}</span><span className="block text-xs text-subtle">{desc}</span></span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  return (
    <header className={`sticky top-0 z-50 overflow-visible bg-white/80 backdrop-blur-md transition-shadow ${scrolled ? "shadow-[0_1px_0_#e5e7eb]" : ""}`}>
      <div className="container-x flex h-[68px] items-center justify-between gap-6">
        <Link href="/" aria-label="StudentXchange home"><BrandMark size={44} /></Link>
        <nav aria-label="Primary" className="hidden items-center gap-1 lg:flex">
          {links.map((l) => (
            <Link key={l.label} href={l.href} className="nav-link rounded-md px-3.5 py-2 text-[15px] text-navy/80 transition-colors hover:text-navy">{l.label}</Link>
          ))}
        </nav>
        <div className="hidden items-center gap-3 lg:flex">
          <Link href="/sell" className="group inline-flex h-10 items-center gap-2 rounded-full bg-navy px-5 text-sm font-semibold text-white transition-all hover:scale-[1.03] hover:bg-navy-2">
            Post / Offer <ArrowRight size={15} className="text-coral transition-transform group-hover:translate-x-0.5" />
          </Link>
          <span className="h-5 w-px bg-line" aria-hidden />
          <AccountMenu />
        </div>
        <button className="grid h-10 w-10 place-items-center rounded-lg hover:bg-surface-2 lg:hidden" aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} onClick={() => setOpen(!open)}>
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>
      {open && (
        <div className="animate-fade-up border-t border-line bg-white lg:hidden">
          <div className="container-x flex flex-col gap-1 py-3">
            {links.map((l) => <Link key={l.label} href={l.href} onClick={() => setOpen(false)} className="rounded-md px-2 py-3 text-base">{l.label}</Link>)}
            <div className="mt-2 grid grid-cols-2 gap-2">
              <Link href="/auth" className="grid h-11 place-items-center rounded-lg border border-line text-sm font-medium">Login</Link>
              <Link href="/auth?mode=signup" className="grid h-11 place-items-center rounded-lg bg-navy text-sm font-semibold text-white">Register</Link>
            </div>
            <Link href="/sell" className="mt-1 grid h-11 place-items-center rounded-lg bg-coral/10 text-sm font-semibold text-coral-600">Post / Offer</Link>
          </div>
        </div>
      )}
    </header>
  );
}
