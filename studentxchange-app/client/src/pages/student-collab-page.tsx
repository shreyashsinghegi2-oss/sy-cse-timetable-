import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { PLATFORM_ADMIN_EMAIL, STATETECH_ADMIN_EMAILS, HASTECH_ADMIN_EMAILS, NAT_CONF_ADMIN_EMAILS, NETX_ADMIN_EMAILS } from "@/config/constants";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SocialFeed } from "@/components/collab/social-feed";
import CollabMobileNav from "@/components/collab/collab-mobile-nav";
import { Users, BookOpen, Lightbulb, Target, MessageCircle, Plus, Handshake, LogIn, UserPlus, Eye, EyeOff, UserCheck, Edit3, ChevronDown, Heart, Calendar, MessageSquare, FileText, Search, LogOut, Send, X, Loader2, PlusCircle, Bell, Building2, Shield, Bookmark, FolderOpen, GraduationCap, ExternalLink, ArrowLeft, Menu, Home, Trophy, Rocket, Zap, QrCode, Bot } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useCollabAuth } from "@/hooks/use-collab-auth";
import { useCollabProfile } from "@/hooks/use-collab-profile";
import { useCollabConnections } from "@/hooks/use-collab-connections";
import { useCollabSearch } from "@/hooks/use-collab-search";
import { useUnreadCount } from "@/hooks/use-notifications";
import { useUnreadMessages } from "@/hooks/use-unread-messages";
import { ProfileBuilder } from "@/components/collab/profile-builder";
import { MultiProfileBuilder } from "@/components/collab/multi-profile-builder";
import CollabLoginForm from "@/components/collab/collab-login-form";
import CollabSignupForm from "@/components/collab/collab-signup-form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useLocation } from "wouter";
import { collabFetch } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";

export default function StudentCollabPage() {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [, setLocation] = useLocation();
  
  // Mobile drawer state
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [showProfileBuilder, setShowProfileBuilder] = useState(false);
  const [profileMode, setProfileMode] = useState<"create" | "edit">("create");
  const [showMultiProfileBuilder, setShowMultiProfileBuilder] = useState(false);
  
  // Global search state
  const [globalSearchQuery, setGlobalSearchQuery] = useState("");
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [showEventsDropdown, setShowEventsDropdown] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { user: collabUser, isAuthenticated, isLoading: authLoading, isCheckingRedirect, logout: collabLogout } = useCollabAuth();
  const { profile, isLoading: profileLoading, createProfile, updateProfile, getDisplayName, getUsername } = useCollabProfile();
  const { connections, sendConnectionRequest, isLoadingConnections, isSendingRequest: connectionsLoading } = useCollabConnections();
  
  // For backward compatibility - map collab user to expected shape
  const user = collabUser;
  
  /* ── Restore the page that initiated the Collab login ── */
  useEffect(() => {
    if (authLoading) return;
    try {
      // Keep protected-route destinations tab-scoped. HashTech's older
      // integration still writes its legacy localStorage key, so retain that
      // as a fallback for existing users.
      const returnTo = sessionStorage.getItem("collab_return_after_login")
        || localStorage.getItem("collab_return_after_login")
        || localStorage.getItem("hastech_return_after_login");
      if (!isAuthenticated) {
        if (returnTo) {
          setAuthMode("login");
          setShowAuthModal(true);
        }
        return;
      }
      if (returnTo) {
        sessionStorage.removeItem("collab_return_after_login");
        localStorage.removeItem("collab_return_after_login");
        localStorage.removeItem("hastech_return_after_login");
        // Only honor internal application paths; this value is navigation
        // state and must never become an open redirect.
        if (returnTo.startsWith("/") && !returnTo.startsWith("//")) {
          setLocation(returnTo);
        }
      }
    } catch {}
  }, [isAuthenticated, authLoading, setLocation]);
  const isLoading = false; // Collab auth loads instantly from localStorage
  const logoutMutation = { mutate: collabLogout };
  const hasProfile = !!profile;
  const { searchResults, isSearching, searchProfiles } = useCollabSearch();
  const totalUnread = useUnreadMessages();
  const notificationUnreadCount = useUnreadCount();
  const { toast } = useToast();
  
  // Fetch upcoming events for sidebar
  const { data: upcomingEvents = [], isLoading: eventsLoading } = useQuery<any[]>({
    queryKey: ['/api/collab/social/events'],
    enabled: isAuthenticated,
    queryFn: async () => {
      const response = await collabFetch('/api/collab/social/events');
      if (!response.ok) return [];
      return response.json();
    },
    refetchInterval: 60000, // Refresh every minute
  });
  
  // Format event date for display
  const formatEventDate = (dateStr: string, timeStr: string) => {
    const eventDate = new Date(`${dateStr}T${timeStr || '00:00'}`);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const isToday = eventDate.toDateString() === today.toDateString();
    const isTomorrow = eventDate.toDateString() === tomorrow.toDateString();
    
    let dayLabel = '';
    if (isToday) {
      dayLabel = 'TODAY';
    } else if (isTomorrow) {
      dayLabel = 'TOMORROW';
    } else {
      dayLabel = eventDate.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
    }
    
    const timeLabel = eventDate.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
    
    return { dayLabel, timeLabel };
  };
  
  // Fetch user data to check admin role
  const { data: userData } = useQuery({
    queryKey: ['/api/user'],
    enabled: !!user
  });


  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(globalSearchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [globalSearchQuery]);

  // Connect search functionality
  useEffect(() => {
    if (debouncedSearchQuery.length >= 1) {
      searchProfiles(debouncedSearchQuery);
    }
  }, [debouncedSearchQuery, searchProfiles]);

  useEffect(() => {
    if (isAuthenticated && showAuthModal) {
      setTimeout(() => setShowAuthModal(false), 100);
    }
  }, [isAuthenticated, showAuthModal]);

  // Helper to get user initials for avatar
  const getUserInitials = () => {
    let fullName = '';
    if (profile) {
      if ('name' in profile && profile.name) fullName = profile.name;
      else if ('clubName' in profile && profile.clubName) fullName = profile.clubName;
      else if ('communityName' in profile && profile.communityName) fullName = profile.communityName;
      else if ('companyName' in profile && profile.companyName) fullName = profile.companyName;
    }
    if (!fullName) fullName = getDisplayName(profile) || user?.username || '';
    
    const parts = fullName.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
    }
    return fullName.substring(0, 1).toUpperCase() || 'U';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100/50">

      {/* ═══════════════════════════════════════════════════════════════════════
          MOBILE UI (max-width: 768px) - Completely separate from desktop
          ═══════════════════════════════════════════════════════════════════════ */}
      
      {/* Mobile Header - Only below 768px (md breakpoint) */}
      <header className="sc-mobile-header md:hidden" data-testid="mobile-header">
        <div className="sc-mobile-header-left">
          <button 
            className="sc-mobile-header-btn"
            onClick={() => setMobileDrawerOpen(true)}
            data-testid="button-mobile-menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
        <div className="sc-mobile-header-center">
          <div className="sc-mobile-logo">
            Student<span>Collab</span>
          </div>
        </div>
        <div className="sc-mobile-header-right">
          <Link href="/collab-search">
            <button className="sc-mobile-header-btn" data-testid="button-mobile-search">
              <Search className="h-5 w-5" />
            </button>
          </Link>
          <Link href="/collab-notifications">
            <button className="sc-mobile-header-btn" data-testid="button-mobile-notifications">
              <Bell className="h-5 w-5" />
              {notificationUnreadCount > 0 && (
                <span className="badge">{notificationUnreadCount > 9 ? '9+' : notificationUnreadCount}</span>
              )}
            </button>
          </Link>
        </div>
      </header>

      {/* Mobile Drawer Overlay - Only below 768px */}
      <div 
        className={`sc-mobile-drawer-overlay md:hidden ${mobileDrawerOpen ? 'open' : ''}`}
        onClick={() => setMobileDrawerOpen(false)}
      />

      {/* Mobile Drawer - Only below 768px */}
      <aside className={`sc-mobile-drawer md:hidden ${mobileDrawerOpen ? 'open' : ''}`} data-testid="mobile-drawer">
        <div className="sc-mobile-drawer-header">
          {user ? (
            <div className="sc-mobile-drawer-profile">
              {profile?.avatarUrl ? (
                <img src={profile.avatarUrl} alt="Your StudentXchange profile" className="sc-mobile-drawer-avatar" />
              ) : (
                <div className="sc-mobile-drawer-avatar">{getUserInitials()}</div>
              )}
              <div className="sc-mobile-drawer-info">
                <h3>{(() => {
                  // Priority: profile name fields > 'User'
                  if (profile) {
                    if ('name' in profile && profile.name) return profile.name;
                    if ('clubName' in profile && profile.clubName) return profile.clubName;
                    if ('communityName' in profile && profile.communityName) return profile.communityName;
                    if ('companyName' in profile && profile.companyName) return profile.companyName;
                  }
                  return 'User';
                })()}</h3>
                <p>@{getUsername(profile) || user?.email?.split('@')[0]}</p>
              </div>
            </div>
          ) : (
            <div className="sc-mobile-drawer-profile">
              <div className="sc-mobile-drawer-avatar">?</div>
              <div className="sc-mobile-drawer-info">
                <h3>Welcome</h3>
                <p>Sign in to continue</p>
              </div>
            </div>
          )}
        </div>
        
        <nav className="sc-mobile-drawer-nav">
          <Link href="/student-collab" onClick={() => setMobileDrawerOpen(false)}>
            <div className="sc-mobile-drawer-item active">
              <Home className="h-5 w-5" />
              <span>Home Feed</span>
            </div>
          </Link>
          <div
            className="sc-mobile-drawer-item opacity-60 cursor-not-allowed"
            aria-disabled="true"
            title="Find Your Match is coming soon"
          >
            <Handshake className="h-5 w-5" />
            <span>Find Your Match <span className="text-xs">(Coming soon)</span></span>
          </div>
          <Link href="/collab-messages" onClick={() => setMobileDrawerOpen(false)}>
            <div className="sc-mobile-drawer-item">
              <MessageCircle className="h-5 w-5" />
              <span>Messages</span>
              {totalUnread > 0 && (
                <Badge className="ml-auto bg-red-500 text-white text-xs">{totalUnread}</Badge>
              )}
            </div>
          </Link>
          <Link href="/collab-profile" onClick={() => setMobileDrawerOpen(false)}>
            <div className="sc-mobile-drawer-item">
              <UserCheck className="h-5 w-5" />
              <span>My Profile</span>
            </div>
          </Link>
          
          {user?.email?.toLowerCase() === PLATFORM_ADMIN_EMAIL && (
            <Link href="/collab-admin" onClick={() => setMobileDrawerOpen(false)}>
              <div className="sc-mobile-drawer-item">
                <Shield className="h-5 w-5" />
                <span>Admin Dashboard</span>
              </div>
            </Link>
          )}
          
          {STATETECH_ADMIN_EMAILS.includes(user?.email?.toLowerCase() || '') && (
            <Link href="/statetech-2026/admin" onClick={() => setMobileDrawerOpen(false)}>
              <div className="sc-mobile-drawer-item">
                <Shield className="h-5 w-5" />
                <span>STATETECH Admin</span>
              </div>
            </Link>
          )}

          {HASTECH_ADMIN_EMAILS.includes(user?.email?.toLowerCase() || '') && (
            <Link href="/hastech-admin" onClick={() => setMobileDrawerOpen(false)}>
              <div className="sc-mobile-drawer-item">
                <Shield className="h-5 w-5" />
                <span>#TECH Admin</span>
              </div>
            </Link>
          )}

          
          <div className="sc-mobile-drawer-divider" />
          
          <Link href="/" onClick={() => setMobileDrawerOpen(false)}>
            <div className="sc-mobile-drawer-item">
              <ArrowLeft className="h-5 w-5" />
              <span>Back to StudentXchange</span>
            </div>
          </Link>
        </nav>
        
        <div className="sc-mobile-drawer-footer">
          {user ? (
            <button 
              className="sc-mobile-drawer-logout"
              onClick={() => {
                logoutMutation.mutate();
                setMobileDrawerOpen(false);
              }}
              data-testid="button-mobile-logout"
            >
              <LogOut className="h-5 w-5" />
              <span>Sign Out</span>
            </button>
          ) : (
            <Button 
              className="w-full bg-blue-600 hover:bg-blue-700"
              onClick={() => {
                setAuthMode("login");
                setShowAuthModal(true);
                setMobileDrawerOpen(false);
              }}
            >
              Sign In
            </Button>
          )}
        </div>
      </aside>

      {/* Mobile Content Wrapper - Only below 768px */}
      <div className="sc-mobile-content md:hidden">
        <div className="sc-mobile-feed">
          {/* Mobile Find Your Match Card - Spotlight */}
          {user && (
            <div className="sc-mobile-match-card" data-testid="mobile-match-card">
              <div className="sc-mobile-match-header">
                <div className="sc-mobile-match-icon">
                  <Handshake className="h-6 w-6" />
                </div>
                <div className="sc-mobile-match-title">
                  <h3>Find Your Match</h3>
                  <p>Connect with like-minded students</p>
                </div>
              </div>
              <button
                type="button"
                disabled
                className="sc-mobile-match-btn opacity-70 cursor-not-allowed"
                data-testid="button-mobile-start-matching"
              >
                Matching coming soon
              </button>
            </div>
          )}

          {/* Mobile Events Carousel */}
          {user && (
            <div className="sc-events-carousel" data-testid="mobile-events-carousel">

              {/* NETX 2026 - first card */}
              <div
                className="sc-mobile-match-card sc-carousel-card cursor-pointer border-0 shadow-lg"
                style={{ background: "linear-gradient(to right, #06b6d4, #0ea5e9, #3b82f6)" }}
                onClick={() => setLocation("/netx-2026")}
                data-testid="mobile-netx-card-first"
              >
                <div className="sc-mobile-match-header">
                  <div className="sc-mobile-match-icon bg-white/20 backdrop-blur-sm">
                    <Bot className="h-6 w-6 text-white" />
                  </div>
                  <div className="sc-mobile-match-title">
                    <h3 className="text-white">NETX 2026</h3>
                    <p className="text-white/80">Robotics Challenge · Build. Think. Solve.</p>
                  </div>
                </div>
                <button
                  className="sc-mobile-match-btn bg-white hover:bg-gray-100"
                  style={{ color: "#0e7490" }}
                  data-testid="button-mobile-netx-first"
                >
                  Explore
                </button>
              </div>

              {/* HASHTECH 2026 - second card */}
              <div
                className="sc-mobile-match-card sc-carousel-card cursor-pointer border-0 shadow-lg"
                style={{ background: "linear-gradient(to right, #4c1d95, #1e1b4b, #312e81)" }}
                onClick={() => setLocation("/hastech-2026")}
                data-testid="mobile-hastech-card-first"
              >
                <div className="sc-mobile-match-header">
                  <div className="sc-mobile-match-icon bg-white/20 backdrop-blur-sm">
                    <Zap className="h-6 w-6 text-white" />
                  </div>
                  <div className="sc-mobile-match-title">
                    <h3 className="text-white">#TECH 2026</h3>
                    <p className="text-white/80">Technology Fest · Robotics &amp; Hackathon</p>
                  </div>
                </div>
                <button
                  className="sc-mobile-match-btn bg-white hover:bg-gray-100"
                  style={{ color: "#6d28d9" }}
                  data-testid="button-mobile-hastech-first"
                >
                  Explore
                </button>
              </div>

              {/* STATETECH 2026 */}
              <div
                className="sc-mobile-match-card sc-carousel-card cursor-pointer bg-gradient-to-r from-purple-500 via-indigo-500 to-blue-500 border-0 shadow-lg"
                onClick={() => setLocation("/statetech-2026")}
                data-testid="mobile-statetech-card"
              >
                <div className="sc-mobile-match-header">
                  <div className="sc-mobile-match-icon bg-white/20 backdrop-blur-sm">
                    <Rocket className="h-6 w-6 text-white" />
                  </div>
                  <div className="sc-mobile-match-title">
                    <h3 className="text-white">STATETECH 2026</h3>
                    <p className="text-white/80">Innovation Showcase Event</p>
                  </div>
                </div>
                <button
                  className="sc-mobile-match-btn bg-white text-purple-600 hover:bg-gray-100"
                  data-testid="button-mobile-statetech"
                >
                  Learn More
                </button>
              </div>

              {/* Collab Arena - last card */}
              <div
                className="sc-mobile-match-card sc-carousel-card cursor-pointer bg-gradient-to-r from-blue-500 via-purple-500 to-indigo-500 border-0 shadow-lg"
                onClick={() => setLocation("/collab-arena")}
                data-testid="mobile-arena-card"
              >
                <div className="sc-mobile-match-header">
                  <div className="sc-mobile-match-icon bg-white/20 backdrop-blur-sm">
                    <Trophy className="h-6 w-6 text-white" />
                  </div>
                  <div className="sc-mobile-match-title">
                    <h3 className="text-white">Collab Arena</h3>
                    <p className="text-white/80">Monthly Project Competition</p>
                  </div>
                </div>
                <button
                  className="sc-mobile-match-btn bg-white text-purple-600 hover:bg-gray-100"
                  data-testid="button-mobile-arena"
                >
                  Enter Arena
                </button>
              </div>

            </div>
          )}

          {/* Mobile Events Widget - After a few posts */}
          {user && upcomingEvents.length > 0 && (
            <div className="sc-mobile-events-card" data-testid="mobile-events-card">
              <div className="sc-mobile-events-header">
                <div className="sc-mobile-events-title">
                  <Calendar className="h-5 w-5" />
                  <span>Upcoming Events</span>
                </div>
                <span className="sc-mobile-events-count">{upcomingEvents.length}</span>
              </div>
              {upcomingEvents.slice(0, 3).map((event: any) => {
                const { dayLabel, timeLabel } = formatEventDate(event.eventDate, event.eventTime);
                return (
                  <div 
                    key={event.id} 
                    className="sc-mobile-event-item"
                    onClick={() => setLocation(`/collab-profile/${event.uid}?post=${event.id}`)}
                    data-testid={`mobile-event-${event.id}`}
                  >
                    <div className="sc-mobile-event-date">
                      <span className="sc-mobile-event-day">{dayLabel}</span>
                      <span className="sc-mobile-event-time">{timeLabel}</span>
                    </div>
                    <div className="sc-mobile-event-info">
                      <div className="sc-mobile-event-name">{event.title}</div>
                      <div className="sc-mobile-event-host">
                        by {event.profile?.name || 'Anonymous'}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* NCADT 2026 Banner — mobile only, below events slider, above posts */}
          <div
            className="mx-3 mb-3 rounded-2xl overflow-hidden cursor-pointer"
            style={{ background: "linear-gradient(135deg,#0c1f4a 0%,#1e3a8a 50%,#0f172a 100%)", border: "1px solid rgba(56,189,248,0.3)" }}
            onClick={() => setLocation("/nat-conf-2026")}
            data-testid="mobile-ncadt-banner"
          >
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(56,189,248,0.15)", border: "1px solid rgba(56,189,248,0.3)" }}>
                <Rocket className="h-5 w-5 text-cyan-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-white font-bold text-sm">NCADT 2026</span>
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: "rgba(56,189,248,0.2)", color: "#67e8f9" }}>30–31 MAR</span>
                </div>
                <p className="text-blue-300 text-xs truncate">Aerospace &amp; Defence Technologies · ADYPU</p>
              </div>
              <button
                className="flex-shrink-0 text-xs font-bold px-3 py-1.5 rounded-xl"
                style={{ background: "rgba(56,189,248,0.15)", color: "#67e8f9", border: "1px solid rgba(56,189,248,0.35)" }}
                onClick={e => { e.stopPropagation(); setLocation("/nat-conf-register"); }}
                data-testid="button-ncadt-get-qr"
              >
                Get QR
              </button>
            </div>
          </div>

          {/* Mobile Social Feed */}
          <SocialFeed onSignInClick={() => { setAuthMode("login"); setShowAuthModal(true); }} />

        </div>
      </div>

      {/* Mobile Bottom Navigation - Only below 768px */}
      <div className="md:hidden">
        <CollabMobileNav />
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          DESKTOP UI (min-width: 769px) - Original layout unchanged
          ═══════════════════════════════════════════════════════════════════════ */}

      {/* Desktop UI - 768px and above */}
      <div className="hidden md:block max-w-7xl mx-auto px-4 pt-3 pb-2">
        {/* Enhanced Header - Tight top bar like LinkedIn/Behance */}
        <div className="mb-3 flex items-center justify-between gap-3 collab-header py-2 -mx-4 rounded-xl">
          <div className="flex items-center gap-4 pl-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation("/")}
              className="rounded-full hover:bg-gray-100 mr-1"
              data-testid="button-back-home"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight whitespace-nowrap">Student <span className="text-blue-600">Collab</span></h1>
          </div>

          {/* Modern Compact Search Bar - Responsive */}
          {user && (
            <div className="flex md:hidden lg:flex flex-1 max-w-md mx-2 lg:mx-4 relative">
              <div className="relative w-full h-11 md:h-12 rounded-full bg-[hsl(var(--card))] border border-[hsl(var(--border))] shadow-card flex items-center">
                <Search className="absolute left-3 md:left-4 h-5 w-5 text-muted-foreground pointer-events-none" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search students by name, skills, college..."
                  value={globalSearchQuery}
                  onChange={(e) => {
                    setGlobalSearchQuery(e.target.value);
                    setShowSearchResults(e.target.value.length > 0);
                  }}
                  onFocus={() => setShowSearchResults(globalSearchQuery.length > 0)}
                  onBlur={() => {
                    setTimeout(() => setShowSearchResults(false), 200);
                  }}
                  className="w-full h-full pl-11 md:pl-12 pr-3 md:pr-4 border-0 bg-transparent text-sm text-gray-900 placeholder:text-gray-500 focus:outline-none"
                  data-testid="input-global-search"
                />
                {isSearching && (
                  <Loader2 className="absolute right-3 md:right-4 h-5 w-5 animate-spin text-muted-foreground pointer-events-none" />
                )}
              </div>

              {/* Search Results Dropdown */}
              {showSearchResults && globalSearchQuery.length >= 1 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-100 rounded-2xl shadow-xl z-50 max-h-96 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200">
                  {isSearching ? (
                    <div className="p-4 text-center text-gray-500">
                      <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
                      Searching profiles...
                    </div>
                  ) : searchResults && searchResults.length > 0 ? (
                    <div className="py-2">
                      {searchResults.map((result: any) => {
                        // Get display name based on profile type
                        const displayName = result.role === 'Student' ? result.name :
                                          result.role === 'Club' ? result.clubName :
                                          result.role === 'Community' ? result.communityName :
                                          result.role === 'Company' ? result.companyName :
                                          result.name;
                        
                        // Get navigation URL based on role (default to Student if undefined for backward compatibility)
                        const role = result.role || 'Student';
                        const navUrl = role === 'Student' ? `/collab-profile/${result.id}` :
                                      `/collab-org-profile-view?uid=${result.id}`;
                        
                        // Get subtitle based on role
                        const subtitle = result.role === 'Student' ? `${result.currentCourse || ''} • ${result.college || ''}` :
                                        result.role === 'Club' ? result.category :
                                        result.role === 'Community' ? result.category :
                                        result.role === 'Company' ? result.industryType :
                                        '';
                        
                        // Get badge color based on role
                        const badgeColor = result.role === 'Student' ? 'bg-blue-500' :
                                          result.role === 'Club' ? 'bg-blue-700' :
                                          result.role === 'Community' ? 'bg-green-500' :
                                          'bg-orange-500';
                        
                        return (
                          <div
                            key={result.id}
                            className="px-4 py-3 hover:bg-blue-50 cursor-pointer border-b border-gray-50 last:border-b-0 transition-all duration-200"
                            onClick={() => {
                              setLocation(navUrl);
                              setShowSearchResults(false);
                              setGlobalSearchQuery("");
                            }}
                            data-testid={`search-result-${result.id}`}
                          >
                            <div className="flex items-center gap-3">
                              <Avatar className="h-10 w-10">
                                <AvatarImage src={result.avatarUrl} />
                                <AvatarFallback className={`${badgeColor} text-white text-sm`}>
                                  {displayName?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <p className="font-medium text-gray-900">{displayName}</p>
                                  <Badge className={`${badgeColor} text-white text-xs`}>
                                    {result.role}
                                  </Badge>
                                </div>
                                <p className="text-sm text-gray-600">@{result.username}</p>
                                {subtitle && (
                                  <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>
                                )}
                                {result.role === 'Student' && result.skills && result.skills.length > 0 && (
                                  <div className="flex gap-1 mt-1">
                                    {result.skills.slice(0, 2).map((skill: string, index: number) => (
                                      <Badge key={index} variant="secondary" className="text-xs">
                                        {skill}
                                      </Badge>
                                    ))}
                                    {result.skills.length > 2 && (
                                      <Badge variant="secondary" className="text-xs">
                                        +{result.skills.length - 2}
                                      </Badge>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : globalSearchQuery.length >= 1 ? (
                    <div className="p-4 text-center text-gray-500">
                      No matches found
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          )}
          
          {/* Navigation Buttons - Clean design matching reference */}
          <div className="flex items-center gap-1 lg:gap-2">
            {user ? (
              <>
                {/* Messages Button */}
                <Button
                  variant="ghost"
                  size="sm"
                  asChild
                  className="relative collab-nav-btn"
                  data-testid="button-messages"
                >
                  <Link href="/collab-messages">
                    <MessageCircle className="h-4 w-4" />
                    <span className="hidden lg:inline">Messages</span>
                    {totalUnread > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs h-5 min-w-5 px-1 rounded-full flex items-center justify-center font-medium">
                        {totalUnread > 9 ? '9+' : totalUnread}
                      </span>
                    )}
                  </Link>
                </Button>



                {/* Post Button - Hidden on mobile */}
                <div className="hidden lg:block">
                  <Button
                    variant="ghost"
                    size="sm"
                    asChild
                    className="collab-nav-btn"
                    data-testid="button-post"
                  >
                    <Link href="/collab-post-create">
                      <PlusCircle className="h-4 w-4" />
                      <span>Post</span>
                    </Link>
                  </Button>
                </div>

                {/* Notifications Button */}
                <Button
                  variant="ghost"
                  size="sm"
                  asChild
                  className="relative collab-nav-btn"
                  data-testid="button-notifications"
                >
                  <Link href="/collab-notifications">
                    <Bell className="h-4 w-4" />
                    <span className="hidden lg:inline">Notifications</span>
                    {notificationUnreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs h-5 min-w-5 px-1 rounded-full flex items-center justify-center font-medium">
                        {notificationUnreadCount > 9 ? '9+' : notificationUnreadCount}
                      </span>
                    )}
                  </Link>
                </Button>

                {/* Admin Button - Only visible to admin email */}
                {user?.email?.toLowerCase() === PLATFORM_ADMIN_EMAIL && (
                  <Button
                    variant="ghost"
                    size="sm"
                    asChild
                    className="collab-nav-btn"
                    data-testid="button-admin"
                  >
                    <Link href="/collab-admin">
                      <Shield className="h-4 w-4" />
                      <span className="hidden lg:inline">Admin</span>
                    </Link>
                  </Button>
                )}

                {/* STATETECH Admin Button - visible to STATETECH admins */}
                {STATETECH_ADMIN_EMAILS.includes(user?.email?.toLowerCase() || '') && (
                  <Button
                    variant="ghost"
                    size="sm"
                    asChild
                    className="collab-nav-btn"
                    data-testid="button-statetech-admin"
                  >
                    <Link href="/statetech-2026/admin">
                      <Shield className="h-4 w-4" />
                      <span className="hidden lg:inline">STATETECH</span>
                    </Link>
                  </Button>
                )}

                {/* #TECH Admin Button - visible to HasTech admins */}
                {HASTECH_ADMIN_EMAILS.includes(user?.email?.toLowerCase() || '') && (
                  <Button
                    variant="ghost"
                    size="sm"
                    asChild
                    className="collab-nav-btn"
                    data-testid="button-hastech-admin"
                  >
                    <Link href="/hastech-admin">
                      <Shield className="h-4 w-4" />
                      <span className="hidden lg:inline">#TECH</span>
                    </Link>
                  </Button>
                )}

                {/* Elections Button - Only visible to admin users */}
                {(userData as any)?.role === 'admin' && (
                  <div className="hidden lg:block">
                    <Button
                      variant="ghost"
                      size="sm"
                      asChild
                      className="collab-nav-btn"
                      data-testid="button-elections"
                    >
                      <Link href="/elections">
                        <Calendar className="h-4 w-4" />
                        <span>Elections 2025</span>
                      </Link>
                    </Button>
                  </div>
                )}

                {/* Profile Button */}
                <div className="hidden lg:block">
                  <Button
                    variant="ghost"
                    size="sm"
                    asChild
                    className="collab-nav-btn"
                    data-testid="button-profile"
                  >
                    <Link href="/collab-profile">
                      <UserCheck className="h-4 w-4" />
                      <span>Profile</span>
                    </Link>
                  </Button>
                </div>
              </>
            ) : !authLoading && !isLoading && !isCheckingRedirect && (
              <>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => { setAuthMode("login"); setShowAuthModal(true); }}
                  className="collab-nav-btn"
                  data-testid="button-signin"
                >
                  <LogIn className="h-4 w-4" />
                  <span className="hidden lg:inline">Sign In</span>
                </Button>
                <Button 
                  size="sm"
                  onClick={() => { setAuthMode("signup"); setShowAuthModal(true); }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-all duration-200 shadow-sm hover:shadow-md flex items-center gap-2"
                  data-testid="button-signup"
                >
                  <UserPlus className="h-4 w-4" />
                  <span className="hidden lg:inline">Sign Up</span>
                </Button>
              </>
            )}
          </div>
        </div>

        {/* LinkedIn-style 3-column layout - Fixed sidebars, scrollable feed */}
        <div className="grid grid-cols-1 md:grid-cols-8 lg:grid-cols-12 gap-4 lg:gap-6 lg:h-[calc(100vh-80px)] lg:overflow-hidden items-start">

          {/* Left Sidebar - Profile & Stats - Fixed in place */}
          <div className="hidden md:block md:col-span-3 lg:col-span-3 space-y-4 lg:h-[calc(100vh-100px)] lg:overflow-y-auto lg:scrollbar-hide collab-stagger">
            {user ? (
              <>
                {/* Enhanced Profile Card - Hidden on mobile */}
                <div className="hidden lg:block collab-profile-card collab-fade-in">
                  <div className="p-6 text-center">
                    {/* Avatar with initials */}
                    <div className="relative inline-block">
                      <Avatar className="h-20 w-20 mx-auto ring-4 ring-blue-100">
                        <AvatarImage src={profile?.avatarUrl || undefined} alt={user.username} />
                        <AvatarFallback className="bg-blue-600 text-white font-bold text-xl">
                          {(() => {
                            // Get name from profile fields directly
                            let fullName = '';
                            if (profile) {
                              if ('name' in profile && profile.name) fullName = profile.name;
                              else if ('clubName' in profile && profile.clubName) fullName = profile.clubName;
                              else if ('communityName' in profile && profile.communityName) fullName = profile.communityName;
                              else if ('companyName' in profile && profile.companyName) fullName = profile.companyName;
                            }
                            if (!fullName) fullName = getDisplayName(profile) || user.username || '';
                            
                            const parts = fullName.trim().split(/\s+/);
                            if (parts.length >= 2) {
                              return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
                            }
                            return fullName.substring(0, 1).toUpperCase() || 'U';
                          })()}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                    
                    {/* Full Name Only */}
                    <h3 className="text-lg font-bold text-gray-900 mt-4 mb-4">
                      {(() => {
                        // Priority: profile.name > clubName/communityName/companyName > getDisplayName > username
                        if (profile) {
                          if ('name' in profile && profile.name) return profile.name;
                          if ('clubName' in profile && profile.clubName) return profile.clubName;
                          if ('communityName' in profile && profile.communityName) return profile.communityName;
                          if ('companyName' in profile && profile.companyName) return profile.companyName;
                        }
                        return getDisplayName(profile) || user.username;
                      })()}
                    </h3>
                    
                    {/* Action Buttons */}
                    <div className="space-y-2.5">
                      <Button 
                        variant="outline" 
                        className="w-full text-gray-700 hover:text-blue-600 hover:bg-blue-50/50 transition-all duration-200 border-gray-200 rounded-xl h-11" 
                        onClick={() => setLocation(hasProfile ? '/collab-profile' : '/collab-org-selector')}
                        data-testid="sidebar-build-profile"
                      >
                        <Edit3 className="h-4 w-4 mr-2" />
                        {hasProfile ? 'Edit Profile' : 'Build Profile'}
                      </Button>

                      {/* HasTech Admin — sidebar shortcut for admin emails */}
                      {HASTECH_ADMIN_EMAILS.includes((user?.email || '').toLowerCase()) && (
                        <Button
                          variant="outline"
                          className="w-full font-semibold rounded-xl h-11 border-violet-300 hover:bg-violet-50 transition-all duration-200"
                          style={{ color: "#7c3aed", borderColor: "rgba(124,58,237,0.4)", background: "rgba(124,58,237,0.06)" }}
                          onClick={() => setLocation('/hastech-admin')}
                          data-testid="sidebar-hastech-admin"
                        >
                          <Zap className="h-4 w-4 mr-2" />
                          HasTech Admin
                        </Button>
                      )}

                      {/* NCADT Admin — visible to all 3 NCADT admins */}
                      {NAT_CONF_ADMIN_EMAILS.includes((user?.email || '').toLowerCase()) && (
                        <Button
                          variant="outline"
                          className="w-full font-semibold rounded-xl h-11 transition-all duration-200"
                          style={{ color: "#0369a1", borderColor: "rgba(3,105,161,0.4)", background: "rgba(3,105,161,0.06)" }}
                          onClick={() => setLocation('/nat-conf-admin')}
                        >
                          <QrCode className="h-4 w-4 mr-2" />
                          NCADT Admin
                        </Button>
                      )}

                      {/* NETX Admin — visible to NETX admins */}
                      {NETX_ADMIN_EMAILS.includes((user?.email || '').toLowerCase()) && (
                        <Button
                          variant="outline"
                          className="w-full font-semibold rounded-xl h-11 transition-all duration-200"
                          style={{ color: "#1d4ed8", borderColor: "rgba(29,78,216,0.4)", background: "rgba(29,78,216,0.06)" }}
                          onClick={() => setLocation('/netx-admin')}
                        >
                          <Shield className="h-4 w-4 mr-2" />
                          NETX Admin
                        </Button>
                      )}

                      <Button 
                        variant="ghost" 
                        className="w-full text-gray-500 hover:text-red-600 hover:bg-red-50/50 transition-all duration-200 rounded-xl h-10" 
                        onClick={() => {
                          if (user) {
                            logoutMutation.mutate();
                          }
                        }}
                        data-testid="sidebar-logout"
                      >
                        <LogOut className="h-4 w-4 mr-2" />
                        Sign Out
                      </Button>
                    </div>
                  </div>
                </div>
                
                
                {/* Club Elections 2025 Event Card - Admin Only */}
                {(userData as any)?.role === 'admin' && (
                  <Card className="lg:hidden bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                    <CardContent className="p-6 text-center">
                      {/* Live Badge */}
                      <div className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 rounded-full mb-4">
                        <span className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></span>
                        <span className="text-blue-700 text-xs font-semibold">ADMIN</span>
                      </div>

                      {/* Icon */}
                      <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Users className="h-8 w-8 text-blue-600" />
                      </div>

                      {/* Title */}
                      <h3 className="text-2xl font-bold text-gray-900 mb-2">
                        Club Elections 2025
                      </h3>

                      {/* Subtitle */}
                      <p className="text-gray-600 text-sm mb-5 leading-relaxed">
                        Manage nominees and view election results
                      </p>

                      {/* CTA Button */}
                      <Button 
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-all duration-200"
                        onClick={() => setLocation("/elections")}
                        data-testid="button-manage-elections"
                      >
                        Manage Elections
                      </Button>

                      {/* Microtext */}
                      <p className="text-gray-500 text-xs mt-3">
                        Admin-only access
                      </p>
                    </CardContent>
                  </Card>
                )}

                {/* Find Your Match Card */}
                <Card className="bg-gradient-to-br from-indigo-500 via-purple-500 to-blue-500 rounded-2xl shadow-lg overflow-hidden border-0">
                  <CardContent className="p-6 text-center">
                    {/* Icon */}
                    <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-4">
                      <Handshake className="h-8 w-8 text-white" />
                    </div>

                    {/* Title */}
                    <h3 className="text-2xl font-bold text-white mb-2">
                      Find Your Match
                    </h3>

                    {/* Subtitle */}
                    <p className="text-white/80 text-sm mb-5 leading-relaxed">
                      Connect with students who share your goals & mindset.
                    </p>

                    {/* CTA Button */}
                    <Button
                      className="w-full bg-white text-purple-600 font-semibold opacity-70 cursor-not-allowed"
                      disabled
                      data-testid="button-start-matching"
                    >
                      Matching coming soon
                    </Button>

                    {/* Microtext */}
                    <p className="text-white/60 text-xs mt-3">
                      Explore connections that push you forward.
                    </p>
                  </CardContent>
                </Card>


              </>
            ) : (
              <Card className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden transition-all duration-200 hover:shadow-md">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Users className="h-6 w-6 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Join Student Collab</h3>
                  <p className="text-sm text-gray-600 mb-4">Connect with fellow students and collaborate on amazing projects</p>
                  <div className="space-y-2">
                    <Button 
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white transition-all duration-200"
                      onClick={() => { setAuthMode("signup"); setShowAuthModal(true); }}
                    >
                      Sign Up Free
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full border-blue-200 hover:border-blue-300 hover:bg-blue-50 transition-all duration-200"
                      onClick={() => { setAuthMode("login"); setShowAuthModal(true); }}
                    >
                      Sign In
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Center Content - Main Feed - Scrollable */}
          <div className="md:col-span-5 lg:col-span-6 lg:h-[calc(100vh-100px)] lg:overflow-y-auto lg:pr-2 flex flex-col">
            <SocialFeed onSignInClick={() => { setAuthMode("login"); setShowAuthModal(true); }} />
          </div>

          {/* Right Sidebar - Events & Connections - Fixed in place */}
          <div className="hidden lg:block lg:col-span-3 space-y-4 lg:h-[calc(100vh-100px)] lg:overflow-y-auto lg:scrollbar-hide collab-stagger">
            {/* Upcoming Events Card */}
            <div className="hidden lg:block collab-events-card collab-fade-in">
              <div className="collab-events-header">
                <div className="collab-events-title">
                  <Calendar className="h-5 w-5 text-blue-500" />
                  <span>Upcoming Events</span>
                </div>
                <span className="collab-events-count">{upcomingEvents.length} event{upcomingEvents.length !== 1 ? 's' : ''}</span>
              </div>
              
              {eventsLoading ? (
                <div className="p-4 text-center text-gray-500 text-sm">
                  <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
                  Loading events...
                </div>
              ) : upcomingEvents.length === 0 ? (
                <div className="p-4 text-center text-gray-500 text-sm">
                  <Calendar className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                  No upcoming events
                  <p className="text-xs mt-1">Be the first to post an event!</p>
                </div>
              ) : (
                upcomingEvents.map((event: any) => {
                  const { dayLabel, timeLabel } = formatEventDate(event.eventDate, event.eventTime);
                  const hostName = event.profile?.name || 'Anonymous';
                  const hostInitial = hostName.charAt(0).toUpperCase();
                  
                  return (
                    <div 
                      key={event.id} 
                      className="collab-event-item cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={() => setLocation(`/collab-profile/${event.uid}?post=${event.id}`)}
                      data-testid={`event-item-${event.id}`}
                    >
                      <div className="collab-event-date">
                        <span className="collab-event-day">{dayLabel}</span>
                        <span className="collab-event-time">{timeLabel}</span>
                      </div>
                      <div className="collab-event-info">
                        <p className="collab-event-title">{event.title}</p>
                        <div className="collab-event-host">
                          {event.profile?.avatarUrl ? (
                            <img 
                              src={event.profile.avatarUrl} 
                              alt={hostName} 
                              className="w-4 h-4 rounded-full object-cover"
                            />
                          ) : (
                            <span className="collab-event-host-avatar">{hostInitial}</span>
                          )}
                          <span>{hostName}</span>
                        </div>
                        {event.eventLink && (
                          <div className="collab-event-joined text-blue-500">
                            <ExternalLink className="h-3 w-3" />
                            <span>Has link</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            
            {/* NETX 2026 Card - Desktop Only (shown first) */}
            <Card
              className="hidden lg:block rounded-2xl shadow-lg overflow-hidden collab-fade-in cursor-pointer hover:shadow-xl transition-shadow border-0"
              style={{ animationDelay: '0.03s', background: "linear-gradient(135deg,#06b6d4,#0ea5e9,#3b82f6)" }}
              onClick={() => setLocation('/netx-2026')}
              data-testid="desktop-netx-card"
            >
              <CardContent className="p-6 text-center">
                <div className="inline-flex items-center gap-1 px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full mb-4">
                  <span className="w-2 h-2 bg-cyan-200 rounded-full animate-pulse"></span>
                  <span className="text-white text-xs font-semibold">ROBOTICS</span>
                </div>

                <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-4">
                  <Bot className="h-8 w-8 text-white" />
                </div>

                <h3 className="text-xl font-bold text-white mb-2">
                  NETX 2026
                </h3>

                <p className="text-white/80 text-sm mb-5 leading-relaxed">
                  Build • Think • Solve · Multi-disciplinary Robotics Challenge
                </p>

                <Button
                  className="w-full bg-white hover:bg-gray-100 font-semibold transition-all duration-200"
                  style={{ color: "#0e7490" }}
                  data-testid="button-enter-netx-desktop"
                >
                  Explore Event
                </Button>
              </CardContent>
            </Card>

            {/* HASHTECH 2026 Card - Desktop Only (shown second) */}
            <Card
              className="hidden lg:block rounded-2xl shadow-lg overflow-hidden collab-fade-in cursor-pointer hover:shadow-xl transition-shadow border-0"
              style={{ animationDelay: '0.05s', background: "linear-gradient(135deg,#4c1d95,#1e1b4b,#312e81)" }}
              onClick={() => setLocation('/hastech-2026')}
              data-testid="desktop-hastech-card"
            >
              <CardContent className="p-6 text-center">
                <div className="inline-flex items-center gap-1 px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full mb-4">
                  <span className="w-2 h-2 bg-purple-300 rounded-full animate-pulse"></span>
                  <span className="text-white text-xs font-semibold">TECH FEST</span>
                </div>

                <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-4">
                  <Zap className="h-8 w-8 text-white" />
                </div>

                <h3 className="text-xl font-bold text-white mb-2">
                  #TECH 2026
                </h3>

                <p className="text-white/80 text-sm mb-5 leading-relaxed">
                  Robotics • Hackathon • Gaming • Engineering Challenges
                </p>

                <Button
                  className="w-full bg-white hover:bg-gray-100 font-semibold transition-all duration-200"
                  style={{ color: "#6d28d9" }}
                  data-testid="button-enter-hastech-desktop"
                >
                  Explore Events
                </Button>
              </CardContent>
            </Card>

            {/* National Conference 2026 Card - Desktop Only */}
            <Card 
              className="hidden lg:block bg-gradient-to-br from-slate-700 via-blue-800 to-indigo-900 rounded-2xl shadow-lg overflow-hidden collab-fade-in cursor-pointer hover:shadow-xl transition-shadow border-0" 
              style={{ animationDelay: '0.08s' }}
              onClick={() => setLocation('/nat-conf-2026')}
              data-testid="desktop-natconf-card"
            >
              <CardContent className="p-6 text-center">
                <div className="inline-flex items-center gap-1 px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full mb-4">
                  <span className="w-2 h-2 bg-blue-300 rounded-full animate-pulse"></span>
                  <span className="text-white text-xs font-semibold">NATIONAL CONFERENCE</span>
                </div>

                <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-4">
                  <Rocket className="h-8 w-8 text-white" />
                </div>

                <h3 className="text-xl font-bold text-white mb-2">
                  Aerospace &amp; Defence 2026
                </h3>

                <p className="text-white/80 text-sm mb-5 leading-relaxed">
                  30 – 31 March 2026 • NCADT 2026 • In collab with AeSI
                </p>

                <Button 
                  className="w-full bg-white hover:bg-gray-100 text-blue-800 font-semibold transition-all duration-200"
                  data-testid="button-enter-natconf-desktop"
                >
                  Learn More
                </Button>
              </CardContent>
            </Card>

            {/* STATETECH 2026 Card - Desktop Only */}
            <Card 
              className="hidden lg:block bg-gradient-to-br from-purple-500 via-indigo-500 to-blue-500 rounded-2xl shadow-lg overflow-hidden collab-fade-in cursor-pointer hover:shadow-xl transition-shadow border-0" 
              style={{ animationDelay: '0.1s' }}
              onClick={() => setLocation('/statetech-2026')}
              data-testid="desktop-statetech-card"
            >
              <CardContent className="p-6 text-center">
                <div className="inline-flex items-center gap-1 px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full mb-4">
                  <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                  <span className="text-white text-xs font-semibold">INNOVATION EVENT</span>
                </div>

                <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-4">
                  <Rocket className="h-8 w-8 text-white" />
                </div>

                <h3 className="text-xl font-bold text-white mb-2">
                  STATETECH 2026
                </h3>

                <p className="text-white/80 text-sm mb-5 leading-relaxed">
                  Innovation Showcase • ₹5,000/category • Free for 12th Students
                </p>

                <Button 
                  className="w-full bg-white hover:bg-gray-100 text-purple-600 font-semibold transition-all duration-200"
                  data-testid="button-enter-statetech-desktop"
                >
                  Learn More
                </Button>
              </CardContent>
            </Card>

            {/* Collab Arena Card - Desktop Only */}
            <Card 
              className="hidden lg:block bg-gradient-to-br from-blue-500 via-purple-500 to-indigo-500 rounded-2xl shadow-lg overflow-hidden collab-fade-in cursor-pointer hover:shadow-xl transition-shadow border-0" 
              style={{ animationDelay: '0.15s' }}
              onClick={() => setLocation('/collab-arena')}
              data-testid="desktop-arena-card"
            >
              <CardContent className="p-6 text-center">
                <div className="inline-flex items-center gap-1 px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full mb-4">
                  <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                  <span className="text-white text-xs font-semibold">COMPETITION</span>
                </div>

                <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-4">
                  <Trophy className="h-8 w-8 text-white" />
                </div>

                <h3 className="text-xl font-bold text-white mb-2">
                  Collab Arena
                </h3>

                <p className="text-white/80 text-sm mb-5 leading-relaxed">
                  Monthly project showcase • Build • Verify • Win
                </p>

                <Button 
                  className="w-full bg-white hover:bg-gray-100 text-purple-600 font-semibold transition-all duration-200"
                  data-testid="button-enter-arena-desktop"
                >
                  Enter Arena
                </Button>
              </CardContent>
            </Card>
            
            {/* Club Elections 2025 Event Card - Desktop Only, Admin Only */}
            {(userData as any)?.role === 'admin' && (
              <Card className="hidden lg:block bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden collab-fade-in" style={{ animationDelay: '0.2s' }}>
                <CardContent className="p-6 text-center">
                  {/* Live Badge */}
                  <div className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 rounded-full mb-4">
                    <span className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></span>
                    <span className="text-blue-700 text-xs font-semibold">ADMIN</span>
                  </div>

                  {/* Icon */}
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Users className="h-8 w-8 text-blue-600" />
                  </div>

                  {/* Title */}
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">
                    Club Elections 2025
                  </h3>

                  {/* Subtitle */}
                  <p className="text-gray-600 text-sm mb-5 leading-relaxed">
                    Manage nominees and view election results
                  </p>

                  {/* CTA Button */}
                  <Button 
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-all duration-200"
                    onClick={() => setLocation("/elections")}
                    data-testid="button-manage-elections-desktop"
                  >
                    Manage Elections
                  </Button>

                  {/* Microtext */}
                  <p className="text-white/70 text-xs mt-3">
                    Admin-only access
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

        </div>
      </div>


      {/* Student Collab Authentication Modal */}
      <Dialog open={showAuthModal} onOpenChange={setShowAuthModal}>
        <DialogContent className="max-w-md p-0 border-0">
          {authMode === "login" ? (
            <CollabLoginForm 
              onSuccess={() => {
                setShowAuthModal(false);
                // Replace current history entry to prevent back button returning to login state
                window.history.replaceState(null, '', window.location.pathname);
              }}
              onSwitchToSignup={() => setAuthMode("signup")}
            />
          ) : (
            <CollabSignupForm 
              onSuccess={() => {
                setShowAuthModal(false);
                // Replace current history entry to prevent back button returning to signup state
                window.history.replaceState(null, '', window.location.pathname);
              }}
              onSwitchToLogin={() => setAuthMode("login")}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Profile Builder Modal */}
      <ProfileBuilder 
        open={showProfileBuilder}
        onOpenChange={setShowProfileBuilder}
        mode={profileMode}
      />

      {/* Multi-Role Profile Builder Modal */}
      <MultiProfileBuilder
        open={showMultiProfileBuilder}
        onOpenChange={setShowMultiProfileBuilder}
      />
    </div>
  );
}