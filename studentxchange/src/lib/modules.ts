import {
  Home, ShoppingBag, Users, Briefcase, Compass, Search, GraduationCap, Code2,
  CalendarDays, User, Bell, Settings, type LucideIcon,
} from "lucide-react";

export type NavItem = { label: string; to: string; icon: LucideIcon };

/** Global application shell navigation (design brief §4). */
export const appNav: NavItem[] = [
  { label: "Home", to: "/app", icon: Home },
  { label: "Marketplace", to: "/app/marketplace", icon: ShoppingBag },
  { label: "Student Collab", to: "/app/collab", icon: Users },
  { label: "StudentLancing", to: "/app/lancing", icon: Briefcase },
  { label: "Career Compass", to: "/app/career-compass", icon: Compass },
  { label: "Opportunities", to: "/app/opportunities", icon: Search },
  { label: "Placement", to: "/app/placement", icon: GraduationCap },
  { label: "Coding Arena", to: "/app/coding-arena", icon: Code2 },
  { label: "Events", to: "/app/events", icon: CalendarDays },
];

export const appNavSecondary: NavItem[] = [
  { label: "Profile", to: "/app/profile", icon: User },
  { label: "Notifications", to: "/app/notifications", icon: Bell },
  { label: "Settings", to: "/app/settings", icon: Settings },
];

/** Mobile bottom navigation: Home • Discover • Opportunities • Collab • Profile */
export const mobileNav: NavItem[] = [
  { label: "Home", to: "/app", icon: Home },
  { label: "Discover", to: "/app/marketplace", icon: ShoppingBag },
  { label: "Opportunities", to: "/app/opportunities", icon: Search },
  { label: "Collab", to: "/app/collab", icon: Users },
  { label: "Profile", to: "/app/profile", icon: User },
];

export const titleFor = (path: string) =>
  [...appNav, ...appNavSecondary].find((n) => (n.to === "/app" ? path === "/app" : path.startsWith(n.to)))?.label ?? "StudentXchange";
