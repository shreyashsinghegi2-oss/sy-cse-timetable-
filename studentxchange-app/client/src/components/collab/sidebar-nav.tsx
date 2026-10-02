import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, Home, Search, Users, Calendar, MessageSquare, FileText, Target, Star, Settings, Handshake, UserCheck, Edit3, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useCollabProfile } from "@/hooks/use-collab-profile";

interface SidebarNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  setShowAuthModal: (show: boolean) => void;
  setShowProfileBuilder: (show: boolean) => void;
  setProfileMode: (mode: "create" | "edit") => void;
}

export function SidebarNav({ 
  activeTab, 
  setActiveTab, 
  setShowAuthModal, 
  setShowProfileBuilder, 
  setProfileMode 
}: SidebarNavProps) {
  const [open, setOpen] = useState(false);
  const { user, logoutMutation } = useAuth();
  const { profile, getDisplayName, getUsername } = useCollabProfile();
  const hasProfile = !!profile;

  const handleNavClick = (action: string, tab?: string) => {
    if (tab) {
      setActiveTab(tab);
    }
    
    if (!user && (action === 'auth-required')) {
      setShowAuthModal(true);
    }
    
    setOpen(false);
  };

  const handleProfileAction = () => {
    if (hasProfile) {
      setProfileMode("edit");
    } else {
      setProfileMode("create");
    }
    setShowProfileBuilder(true);
    setOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className="p-2 hover:bg-gray-100" 
          data-testid="button-sidebar-menu"
        >
          <Menu className="h-5 w-5 text-gray-700" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-64 p-0 bg-white">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-4 border-b bg-gray-50">
            <h2 className="text-lg font-semibold text-gray-900">Student Collab</h2>
            <p className="text-sm text-gray-600">Navigate & Explore</p>
          </div>

          {/* Navigation Items */}
          <div className="flex-1 overflow-y-auto">
            <div className="py-2">
              {/* Main Navigation */}
              <div className="space-y-1 px-2">
                <button
                  onClick={() => handleNavClick('home', 'browse')}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-left rounded-lg hover:bg-gray-100 transition-colors ${
                    activeTab === 'browse' ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700' : 'text-gray-700'
                  }`}
                  data-testid="nav-home"
                >
                  <Home className="h-5 w-5" />
                  <span className="font-medium">Home</span>
                </button>

                <button
                  onClick={() => handleNavClick('find-match', 'browse')}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-left rounded-lg hover:bg-gray-100 transition-colors text-gray-700"
                  data-testid="nav-find-match"
                >
                  <Search className="h-5 w-5" />
                  <span className="font-medium">Find Match by Mindset</span>
                </button>

                <button
                  onClick={() => handleNavClick('my-projects', 'my-projects')}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-left rounded-lg hover:bg-gray-100 transition-colors ${
                    activeTab === 'my-projects' ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700' : 'text-gray-700'
                  }`}
                  data-testid="nav-my-projects"
                >
                  <Target className="h-5 w-5" />
                  <span className="font-medium">My Projects</span>
                </button>

                <button
                  onClick={() => handleNavClick('create-new', 'create')}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-left rounded-lg hover:bg-gray-100 transition-colors ${
                    activeTab === 'create' ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700' : 'text-gray-700'
                  }`}
                  data-testid="nav-create"
                >
                  <Star className="h-5 w-5" />
                  <span className="font-medium">Create New</span>
                </button>
              </div>

              {/* User Actions */}
              {!user && (
                <div className="space-y-1 px-2 mt-3">
                  <button
                    onClick={() => {
                      setShowAuthModal(true);
                      setOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-left rounded-lg hover:bg-blue-50 transition-colors text-blue-700"
                    data-testid="nav-signin"
                  >
                    <UserCheck className="h-5 w-5" />
                    <span className="font-medium">Sign In</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* User Info Footer */}
          {user && (
            <div className="border-t bg-gray-50 p-3">
              <div className="flex items-center gap-2">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={profile?.avatarUrl || undefined} alt={getDisplayName(profile) || user.username} />
                  <AvatarFallback className="bg-blue-600 text-white font-semibold text-sm">
                    {(() => {
                      const name = getDisplayName(profile) || user.username || '';
                      const parts = name.trim().split(/\s+/);
                      if (parts.length >= 2) {
                        return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
                      }
                      return name.substring(0, 2).toUpperCase();
                    })()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {getDisplayName(profile) || user.username}
                  </p>
                  {profile && profile.role === 'Student' && profile.college && (
                    <p className="text-xs text-gray-500 truncate">{profile.college}</p>
                  )}
                  {profile && profile.role !== 'Student' && (
                    <p className="text-xs text-gray-500 truncate">{profile.role}</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}