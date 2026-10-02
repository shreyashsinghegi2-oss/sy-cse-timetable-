import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Home, ArrowLeft, Package2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export default function TopNav() {
  const [location] = useLocation();
  const { user } = useAuth();
  
  const isLandingPage = location === "/";
  const isBrowsePage = location === "/browse";
  const isCollabPage = location.startsWith('/collab') || location.startsWith('/student-collab') || location.startsWith('/elections');
  
  const getPageTitle = () => {
    if (location === "/browse") return "Browse Products";
    if (location === "/cart") return "Shopping Cart";
    if (location === "/checkout") return "Checkout";
    if (location === "/seller") return "Seller Dashboard";
    if (location === "/admin") return "Admin Dashboard";
    if (location === "/orders") return "My Orders";
    if (location.startsWith("/product/")) return "Product Details";
    if (location === "/login") return "Login";
    if (location === "/register") return "Register";
    if (location === "/post") return "Post Item";
    if (location === "/bulk-post") return "Bulk Upload";
    if (location === "/marketplace" || location === "/") return ""; // Don't show title on home/marketplace
    return "StudentXchange";
  };
  
  const isMarketplacePage = location === "/marketplace";
  const showBackButton = !isLandingPage; // Show back button on all pages except landing
  const showBrowseButton = !isBrowsePage && !isLandingPage && !isCollabPage && !isMarketplacePage;
  
  // Determine where back button should go
  const getBackLink = () => {
    if (isBrowsePage) return "/marketplace";
    return "/";
  };
  
  return (
    <div className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="container mx-auto px-4">
        <div className="flex h-14 items-center justify-between">
          {/* Left side - Navigation */}
          <div className="flex items-center gap-2 min-w-[120px]">
            {showBackButton && (
              <Button 
                variant="ghost" 
                size="sm"
                asChild
              >
                <Link href={getBackLink()}>
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Back
                </Link>
              </Button>
            )}
            
            {showBrowseButton && (
              <Button 
                variant="ghost" 
                size="sm"
                asChild
              >
                <Link href="/browse">
                  <Package2 className="h-4 w-4 mr-1" />
                  Browse
                </Link>
              </Button>
            )}
          </div>
          
          {/* Center - Page title */}
          <div className="flex-1 flex justify-center">
            {getPageTitle() && (
              <h1 className="text-lg font-semibold text-gray-900 truncate">
                {getPageTitle()}
              </h1>
            )}
          </div>
          
          {/* Right side - User info */}
          <div className="flex items-center gap-2 min-w-[120px] justify-end">
            {user && (
              <div className="text-sm text-gray-600 hidden sm:block">
                Welcome, {user.username || 'User'}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}