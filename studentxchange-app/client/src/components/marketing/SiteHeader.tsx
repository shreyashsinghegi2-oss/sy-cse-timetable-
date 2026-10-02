import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { ChevronDown, GraduationCap, Briefcase, Building2, Menu, X } from "lucide-react";
import { ButtonLink, BrandLogo } from "@/components/marketing/mui";

const links = [
  { label: "Opportunities", href: "#opportunities" },
  { label: "Product", href: "#product" },
  { label: "Career Compass", href: "#compass" },
  { label: "For Institutions", href: "#institutions" },
  { label: "Marketplace", href: "#marketplace" },
];

const logins = [
  { icon: GraduationCap, title: "Student", desc: "Marketplace and Student Collab", href: "/auth" },
  { icon: Briefcase, title: "StudentLancing", desc: "Career Compass, jobs and freelancing", href: "/lancing/login" },
  { icon: Building2, title: "Institution / Company", desc: "Placement cells and recruiters", href: "/lancing/login" },
];

function LoginMenu() {
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
        className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-line px-4 text-sm font-medium transition-colors hover:bg-surface-2">
        Log in <ChevronDown size={14} className={open ? "rotate-180 transition-transform" : "transition-transform"} />
      </button>
      {open && (
        <div role="menu" className="animate-fade-up absolute right-0 top-12 z-50 w-72 rounded-xl border border-line bg-white p-2 shadow-pop">
          {logins.map(({ icon: I, title, desc, href }) => (
            <Link key={title} href={href} role="menuitem" className="flex items-start gap-3 rounded-lg p-3 transition-colors hover:bg-surface-2" onClick={() => setOpen(false)}>
              <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-sky-50 text-sky-600"><I size={16} /></span>
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
    <header className={`sticky top-0 z-40 overflow-visible bg-white/90 backdrop-blur ${scrolled ? "border-b border-line" : "border-b border-transparent"}`}>
      <div className="container-x flex h-16 items-center justify-between gap-6">
        <Link href="/" aria-label="StudentXchange home"><BrandLogo /></Link>
        <nav aria-label="Primary" className="hidden items-center gap-1 lg:flex">
          {links.map((l) => (
            <a key={l.href} href={l.href} className="nav-link rounded-md px-3 py-2 text-sm text-subtle transition-colors hover:text-ink">{l.label}</a>
          ))}
        </nav>
        <div className="hidden items-center gap-2 lg:flex">
          <LoginMenu />
          <ButtonLink href="/auth?mode=signup" variant="dark">Register free</ButtonLink>
        </div>
        <button className="grid h-10 w-10 place-items-center rounded-lg hover:bg-surface-2 lg:hidden" aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} onClick={() => setOpen(!open)}>
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>
      {open && (
        <div className="animate-fade-up border-t border-line bg-white lg:hidden">
          <div className="container-x flex flex-col gap-1 py-3">
            {links.map((l) => (
              <a key={l.href} href={l.href} onClick={() => setOpen(false)} className="rounded-md px-2 py-3 text-base">{l.label}</a>
            ))}
            <p className="mt-3 px-2 text-xs font-semibold uppercase tracking-wider text-subtle">Log in as</p>
            {logins.map((l) => (
              <Link key={l.title} href={l.href} className="rounded-md px-2 py-2.5 text-base">{l.title}</Link>
            ))}
            <ButtonLink href="/auth?mode=signup" variant="dark" size="lg" className="mt-3">Register free</ButtonLink>
          </div>
        </div>
      )}
    </header>
  );
}
