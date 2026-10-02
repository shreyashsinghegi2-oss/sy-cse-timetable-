import { Link, useLocation } from "wouter";
import { Home, Search, PlusSquare, MessageCircle, User } from "lucide-react";
import { useUnreadMessages } from "@/hooks/use-unread-messages";

export default function CollabMobileNav() {
  const [location] = useLocation();
  const totalUnread = useUnreadMessages();
  
  const isActive = (path: string) => {
    if (path === "/student-collab") {
      return location === "/student-collab" || location === "/";
    }
    return location.startsWith(path);
  };
  
  const navItems = [
    { icon: Home, label: "Home", path: "/student-collab" },
    { icon: Search, label: "Search", path: "/collab-search" },
    { icon: PlusSquare, label: "Post", path: "/collab-post-create" },
    { icon: MessageCircle, label: "Messages", path: "/collab-messages", badge: totalUnread },
    { icon: User, label: "Profile", path: "/collab-profile" },
  ];
  
  return (
    <nav className="sc-mobile-bottom-nav" data-testid="mobile-bottom-nav">
      {navItems.map((item) => {
        const Icon = item.icon;
        const active = isActive(item.path);
        
        return (
          <Link key={item.path} href={item.path}>
            <button
              className={`sc-mobile-nav-item ${active ? "active" : ""}`}
              data-testid={`nav-${item.label.toLowerCase()}`}
            >
              <Icon className={active ? "stroke-[2.5]" : "stroke-2"} />
              <span>{item.label}</span>
              {item.badge && item.badge > 0 && (
                <span className="badge">{item.badge > 9 ? '9+' : item.badge}</span>
              )}
            </button>
          </Link>
        );
      })}
    </nav>
  );
}
