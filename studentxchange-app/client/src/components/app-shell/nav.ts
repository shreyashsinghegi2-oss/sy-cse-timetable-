import {
  LayoutDashboard, Store, Search, Tag, MessageSquareQuote, Package, ShoppingCart, Trophy,
  Users, Briefcase, Compass, CalendarDays, Code2, MessageSquare, Bell, Settings, LifeBuoy, type LucideIcon,
} from "lucide-react";

export type NavItem = { label: string; href: string; icon: LucideIcon; match?: string[]; badge?: "cart" };

export const marketplaceNav: NavItem[][] = [
  [
    { label: "Dashboard", href: "/", icon: LayoutDashboard, match: [] },
    { label: "Marketplace", href: "/marketplace", icon: Store, match: ["/marketplace", "/product", "/sell", "/checkout", "/payment"] },
    { label: "Browse Products", href: "/browse", icon: Search, match: ["/browse"] },
    { label: "My Listings", href: "/seller-listings", icon: Tag, match: ["/seller-listings"] },
    { label: "Buyer Requests", href: "/buyer-requests", icon: MessageSquareQuote, match: ["/buyer-requests"] },
    { label: "My Orders", href: "/orders", icon: Package, match: ["/orders"] },
    { label: "Cart", href: "/cart", icon: ShoppingCart, match: ["/cart"], badge: "cart" },
    { label: "Achievements", href: "/achievements", icon: Trophy, match: ["/achievements"] },
  ],
  [
    { label: "Student Collab", href: "/collab", icon: Users, match: [] },
    { label: "StudentLancing", href: "/student-lancing", icon: Briefcase, match: [] },
    { label: "Career Compass", href: "/lancing/career-compass", icon: Compass, match: [] },
    { label: "Events", href: "/competitions", icon: CalendarDays, match: [] },
    { label: "Coding Arena", href: "/collab-arena", icon: Code2, match: [] },
  ],
  [
    { label: "Messages", href: "/collab-messages", icon: MessageSquare, match: [] },
    { label: "Notifications", href: "/collab-notifications", icon: Bell, match: [] },
  ],
  [
    { label: "Settings", href: "/profile", icon: Settings, match: [] },
    { label: "Help & Support", href: "/policies", icon: LifeBuoy, match: [] },
  ],
];

/** Routes rendered inside the new shell (the old TopNav / MobileNav are hidden on these). */
export const SHELL_PREFIXES = ["/marketplace", "/browse"];
export const usesShell = (path: string) => SHELL_PREFIXES.some((p) => path === p || path.startsWith(p + "/"));

export const isActive = (item: NavItem, path: string) => (item.match ?? []).some((m) => path === m || path.startsWith(m + "/"));
