import { useEffect, useState, type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { Bell, ChevronDown, Menu, Search, X } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useCart } from "@/hooks/use-cart";
import { marketplaceNav, isActive } from "./nav";
import { cn } from "@/components/marketing/cn";

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const [path] = useLocation();
  const { items } = useCart();
  const cartCount = items?.length ?? 0;
  return (
    <div className="flex h-full flex-col bg-ink text-white">
      <Link href="/" onClick={onNavigate} aria-label="StudentXchange home" className="flex items-center gap-2.5 px-4 pb-4 pt-5">
        <img src="/logo-mark-light.png" alt="" width={40} height={36} className="h-9 w-auto shrink-0" />
        <span className="min-w-0 leading-tight">
          <span className="block whitespace-nowrap text-[15px] font-semibold tracking-tight">StudentXchange</span>
          <span className="block whitespace-nowrap text-[9.5px] text-white/55">Learn. Earn. Collaborate. Grow.</span>
        </span>
      </Link>
      <nav aria-label="Main" className="flex-1 overflow-y-auto px-3 pb-4">
        {marketplaceNav.map((group, gi) => (
          <ul key={gi} className={cn("space-y-0.5", gi > 0 && "mt-3 border-t border-white/10 pt-3")}>
            {group.map((item) => {
              const active = isActive(item, path) && !(item.label === "Marketplace" && ["/browse", "/seller-listings", "/buyer-requests", "/orders", "/cart", "/achievements"].some((p) => path.startsWith(p)));
              const badge = item.badge === "cart" && cartCount > 0 ? cartCount : 0;
              return (
                <li key={item.label}>
                  <Link href={item.href} onClick={onNavigate} aria-current={active ? "page" : undefined}
                    className={cn("!flex !min-h-0 h-10 !justify-start items-center gap-3 rounded-lg px-3 text-[14px] transition-colors",
                      active ? "bg-sky font-medium text-white" : "text-white/75 hover:bg-white/8 hover:text-white")}>
                    <item.icon size={17} strokeWidth={1.8} />
                    <span className="flex-1">{item.label}</span>
                    {badge > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-red-500 px-1 text-[11px] font-semibold">{badge}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        ))}
      </nav>
    </div>
  );
}

function Topbar({ onMenu }: { onMenu: () => void }) {
  const [, navigate] = useLocation();
  const { user, firebaseUser } = useAuth();
  const [q, setQ] = useState("");
  useEffect(() => {
    if (typeof window === "undefined") return;
    setQ(new URLSearchParams(window.location.search).get("q") ?? "");
  }, []);
  const name = firebaseUser?.displayName || user?.username;
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-line bg-white/90 px-4 backdrop-blur md:px-6">
      <button onClick={onMenu} aria-label="Open menu" className="grid h-10 w-10 place-items-center rounded-lg hover:bg-surface-2 lg:hidden"><Menu size={20} /></button>
      <form role="search" onSubmit={(e) => { e.preventDefault(); navigate(`/browse${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ""}`); }}
        className="flex h-10 max-w-[560px] flex-1 items-center overflow-hidden rounded-lg border border-line bg-white focus-within:border-sky focus-within:ring-2 focus-within:ring-sky/30">
        <label className="min-w-0 flex-1"><span className="sr-only">Search products</span>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search textbooks, notes, gadgets, lab equipment…" className="h-10 w-full bg-transparent px-3.5 text-sm outline-none placeholder:text-subtle/80" />
        </label>
        <button type="submit" aria-label="Search" className="grid h-10 !w-11 !min-w-0 shrink-0 place-items-center bg-sky text-white transition-colors hover:bg-sky-600"><Search size={16} /></button>
      </form>
      <div className="ml-auto flex items-center gap-2">
        <Link href="/collab-notifications" aria-label="Notifications" className="relative grid h-10 w-10 place-items-center rounded-lg hover:bg-surface-2"><Bell size={19} /></Link>
        {user ? (
          <Link href="/profile" className="flex items-center gap-2.5 rounded-lg px-1.5 py-1 hover:bg-surface-2">
            {firebaseUser?.photoURL
              ? <img src={firebaseUser.photoURL} alt="" className="h-9 w-9 rounded-full object-cover" referrerPolicy="no-referrer" />
              : <span className="grid h-9 w-9 place-items-center rounded-full bg-navy text-sm font-semibold text-white">{(name ?? "U").charAt(0).toUpperCase()}</span>}
            <span className="hidden text-left leading-tight md:block">
              <span className="block max-w-[140px] truncate text-[13px] font-semibold">{name}</span>
              <span className="block max-w-[140px] truncate text-[11px] text-subtle">{user.email}</span>
            </span>
            <ChevronDown size={14} className="hidden text-subtle md:block" />
          </Link>
        ) : (
          <Link href="/auth" className="inline-flex h-10 items-center rounded-lg bg-sky px-4 text-sm font-semibold text-white transition-colors hover:bg-sky-600">Sign in</Link>
        )}
      </div>
    </header>
  );
}

/** Logged-in application shell: dark sidebar, search / profile bar, light workspace. */
export default function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [path] = useLocation();
  useEffect(() => setOpen(false), [path]);
  return (
    <div className="min-h-screen bg-surface-2 text-ink">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[232px] lg:block"><SidebarContent /></aside>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-ink/50" onClick={() => setOpen(false)} />
          <div className="animate-fade-up absolute inset-y-0 left-0 w-[268px] shadow-pop" aria-label="Menu">
            <SidebarContent onNavigate={() => setOpen(false)} />
            <button onClick={() => setOpen(false)} aria-label="Close menu" className="absolute right-3 top-4 grid h-8 !min-h-0 w-8 place-items-center rounded-lg text-white/70 hover:bg-white/10"><X size={18} /></button>
          </div>
        </div>
      )}
      <div className="lg:pl-[232px]">
        <Topbar onMenu={() => setOpen(true)} />
        <main className="mx-auto w-full max-w-[1280px] px-4 py-6 md:px-6">{children}</main>
      </div>
    </div>
  );
}
