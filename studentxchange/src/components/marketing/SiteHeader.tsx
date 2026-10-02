import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { ButtonLink, Logo } from "@/components/ui";

const links = [
  { label: "Product", href: "#product" },
  { label: "Solutions", href: "#journey" },
  { label: "For Institutions", href: "#institutions" },
  { label: "Opportunities", href: "#opportunities" },
  { label: "Resources", href: "#footer" },
];

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
    <header className={`sticky top-0 z-40 bg-surface/85 backdrop-blur ${scrolled ? "border-b border-line" : "border-b border-transparent"}`}>
      <div className="container-x flex h-16 items-center justify-between">
        <Link to="/" aria-label="StudentXchange home"><Logo /></Link>
        <nav aria-label="Primary" className="hidden items-center gap-1 lg:flex">
          {links.map((l) => (
            <a key={l.href} href={l.href} className="rounded-md px-3 py-2 text-sm text-muted transition-colors hover:text-ink">{l.label}</a>
          ))}
        </nav>
        <div className="hidden items-center gap-2 lg:flex">
          <ButtonLink to="/login" variant="ghost">Log in</ButtonLink>
          <ButtonLink to="/login?mode=signup" variant="dark">Get Started</ButtonLink>
        </div>
        <button className="grid h-10 w-10 place-items-center rounded-lg hover:bg-surface-2 lg:hidden" aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} onClick={() => setOpen(!open)}>
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>
      {open && (
        <div className="animate-fade-up border-t border-line bg-surface lg:hidden">
          <div className="container-x flex flex-col gap-1 py-3">
            {links.map((l) => (
              <a key={l.href} href={l.href} onClick={() => setOpen(false)} className="rounded-md px-2 py-3 text-base">{l.label}</a>
            ))}
            <div className="mt-2 grid grid-cols-2 gap-2">
              <ButtonLink to="/login" variant="secondary">Log in</ButtonLink>
              <ButtonLink to="/login?mode=signup" variant="dark">Get Started</ButtonLink>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
