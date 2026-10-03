import { Link } from "wouter";
import { Heart, Linkedin, Twitter, Instagram, Facebook, MessageCircle } from "lucide-react";
import { BrandMark } from "@/components/brand/brand-mark";

/** Fill in the real profile URLs to show the icons. Empty values are not rendered. */
const SOCIAL_LINKS: { label: string; href: string; icon: typeof Linkedin }[] = [
  { label: "LinkedIn", href: "", icon: Linkedin },
  { label: "X (Twitter)", href: "", icon: Twitter },
  { label: "Instagram", href: "", icon: Instagram },
  { label: "Facebook", href: "", icon: Facebook },
  { label: "Discord", href: "", icon: MessageCircle },
];

const cols: { title: string; items: [string, string][] }[] = [
  { title: "Platform", items: [["Marketplace", "/marketplace"], ["Post an item", "/sell"], ["Browse listings", "/browse"], ["Student Collab", "/collab"], ["StudentLancing", "/student-lancing"]] },
  { title: "Campus life", items: [["Competitions", "/competitions"], ["Campus drives", "/lancing/campus-drives"], ["Internships", "/lancing/internships"], ["Career Compass", "/lancing/career-compass"], ["Achievements", "/achievements"]] },
  { title: "Resources", items: [["About", "/about"], ["Policies & refunds", "/policies"], ["Company problem bank", "/lancing/companies"]] },
  { title: "Legal", items: [["Terms of service", "/terms"], ["Privacy policy", "/privacy-policy"], ["Policies", "/policies"]] },
];

export function SiteFooter() {
  const social = SOCIAL_LINKS.filter((s) => s.href);
  return (
    <footer id="footer" className="bg-navy text-white">
      <div className="container-x grid gap-10 pb-10 pt-14 md:grid-cols-[1.5fr_repeat(4,1fr)]">
        <div>
          <Link href="/" aria-label="StudentXchange home"><BrandMark light size={60} /></Link>
          <p className="mt-4 max-w-[260px] text-[15px] leading-snug text-white/70">Connecting students to build, trade and learn.</p>
          {social.length > 0 && (
            <div className="mt-5 flex gap-3">
              {social.map(({ label, href, icon: I }) => (
                <a key={label} href={href} aria-label={label} target="_blank" rel="noopener noreferrer" className="grid h-9 w-9 place-items-center rounded-full bg-white/10 text-white/80 transition-colors hover:bg-white/20 hover:text-white"><I size={16} /></a>
              ))}
            </div>
          )}
        </div>
        {cols.map((c) => (
          <div key={c.title}>
            <h4 className="text-xs font-semibold uppercase tracking-[0.08em] text-white">{c.title}</h4>
            <ul className="mt-4 space-y-2.5">
              {c.items.map(([l, h]) => (
                <li key={l}><Link href={h} className="text-sm text-white/60 transition-colors hover:text-white">{l}</Link></li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-white/10">
        <div className="container-x grid gap-2 py-5 text-xs text-white/55 md:grid-cols-3 md:items-center">
          <span>Copyright © {new Date().getFullYear()} StudentXchange</span>
          <span className="flex items-center gap-1.5 md:justify-center">Made with <Heart size={13} className="fill-sky text-sky" aria-label="love" /> for students</span>
          <span className="md:text-right">StudentXchange Pvt. Ltd. · Pune, India</span>
        </div>
      </div>
    </footer>
  );
}
