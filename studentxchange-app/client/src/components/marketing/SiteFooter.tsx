import { Link } from "wouter";
import { Logo } from "@/components/marketing/mui";

const cols: { title: string; items: [string, string][] }[] = [
  { title: "Platform", items: [["Marketplace", "/marketplace"], ["Student Collab", "/collab"], ["StudentLancing", "/student-lancing"], ["Career Compass", "/lancing/career-compass"]] },
  { title: "Opportunities", items: [["Internships", "/lancing/internships"], ["Campus drives", "/lancing/campus-drives"], ["Competitions", "/competitions"], ["Company problem bank", "/lancing/companies"]] },
  { title: "Company", items: [["About", "/about"], ["Log in", "/auth"], ["Register", "/auth?mode=signup"]] },
  { title: "Legal", items: [["Terms", "/terms"], ["Privacy policy", "/privacy-policy"], ["Policies & refunds", "/policies"]] },
];

export function SiteFooter() {
  return (
    <footer id="footer" className="bg-ink text-white">
      <div className="container-x grid gap-10 py-14 md:grid-cols-[1.4fr_repeat(4,1fr)]">
        <div>
          <Link href="/" aria-label="StudentXchange home"><Logo light size={56} /></Link>
          <p className="mt-4 max-w-xs text-sm text-white/60">The student operating system. Learn, earn, collaborate and grow.</p>
        </div>
        {cols.map((c) => (
          <div key={c.title}>
            <h4 className="text-sm font-semibold">{c.title}</h4>
            <ul className="mt-4 space-y-2.5">
              {c.items.map(([l, h]) => (
                <li key={l}><Link href={h} className="text-sm text-white/60 transition-colors hover:text-white">{l}</Link></li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-white/10">
        <div className="container-x flex flex-col gap-2 py-6 text-xs text-white/50 md:flex-row md:justify-between">
          <span>© {new Date().getFullYear()} StudentXchange Pvt. Ltd. · Pune, India</span>
          <span>CIN U63122MH2025PTC462144</span>
        </div>
      </div>
    </footer>
  );
}
