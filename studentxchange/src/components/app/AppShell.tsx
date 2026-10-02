import { NavLink, Outlet, Link, useLocation } from "react-router-dom";
import { Bell, Search } from "lucide-react";
import { Logo } from "@/components/ui";
import { appNav, appNavSecondary, mobileNav, titleFor, type NavItem } from "@/lib/modules";
import { cn } from "@/lib/cn";

function SideLink({ item }: { item: NavItem }) {
  return (
    <NavLink
      to={item.to}
      end={item.to === "/app"}
      className={({ isActive }) =>
        cn("flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
          isActive ? "bg-sky-50 font-medium text-ink [&_svg]:text-sky-600" : "text-muted hover:bg-surface-2 hover:text-ink")
      }
    >
      <item.icon size={18} />
      {item.label}
    </NavLink>
  );
}

export default function AppShell() {
  const { pathname } = useLocation();
  return (
    <div className="min-h-screen bg-surface-2">
      {/* Sidebar — desktop/tablet */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-line bg-surface px-3 py-4 md:flex">
        <Link to="/" className="px-3 py-2" aria-label="StudentXchange home"><Logo /></Link>
        <nav aria-label="Modules" className="mt-5 flex flex-1 flex-col gap-0.5 overflow-y-auto">
          {appNav.map((i) => <SideLink key={i.to} item={i} />)}
        </nav>
        <nav aria-label="Account" className="flex flex-col gap-0.5 border-t border-line pt-3">
          {appNavSecondary.map((i) => <SideLink key={i.to} item={i} />)}
        </nav>
      </aside>

      <div className="md:pl-60">
        {/* Top context bar */}
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-line bg-surface/90 px-4 backdrop-blur md:px-8">
          <h2 className="text-sm font-semibold md:text-base">{titleFor(pathname)}</h2>
          <div className="ml-auto flex items-center gap-2">
            <label className="relative hidden sm:block">
              <span className="sr-only">Search</span>
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input placeholder="Search StudentXchange" className="h-9 w-64 rounded-lg border border-line bg-surface-2 pl-9 pr-3 text-sm focus:border-sky-600 focus:outline-none" />
            </label>
            <Link to="/app/notifications" aria-label="Notifications" className="grid h-9 w-9 place-items-center rounded-lg hover:bg-surface-2"><Bell size={18} /></Link>
            <div className="grid h-8 w-8 place-items-center rounded-full bg-ink text-xs font-semibold text-white" aria-label="Your account">SX</div>
          </div>
        </header>
        <main className="px-4 py-6 pb-24 md:px-8 md:pb-10">
          <div className="mx-auto max-w-[1100px]"><Outlet /></div>
        </main>
      </div>

      {/* Bottom nav — mobile */}
      <nav aria-label="Mobile" className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] md:hidden">
        {mobileNav.map((i) => (
          <NavLink key={i.to} to={i.to} end={i.to === "/app"}
            className={({ isActive }) => cn("flex flex-col items-center gap-1 py-2.5 text-[11px]", isActive ? "font-medium text-ink [&_svg]:text-sky-600" : "text-muted")}>
            <i.icon size={20} />{i.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
