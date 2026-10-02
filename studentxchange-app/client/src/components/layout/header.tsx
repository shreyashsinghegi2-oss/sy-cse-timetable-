import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { ShoppingCart, Menu, Package, ListOrdered, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MARKETPLACE_ADMIN_EMAILS } from "@/config/constants";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState } from "react";
import { useCart } from "@/hooks/use-cart";


export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [location] = useLocation();
  const { user, firebaseUser, logoutMutation } = useAuth();
  const { items } = useCart();

  const itemCount = (items ?? []).reduce((acc, item) => acc + item.quantity, 0);

  const handleLogout = () => {
    sessionStorage.setItem('just_logged_out', 'true');
    logoutMutation.mutate();
  };

  const isActive = (path: string) => location === path;

  // Use the Firebase profile picture (Google avatar) when available; otherwise fall back to the
  // user's initial. firebaseUser.displayName is preferred for greeting; fall back to username.
  const avatarUrl = firebaseUser?.photoURL || undefined;
  const displayName = firebaseUser?.displayName || user?.username || "Account";
  const initial = (displayName || "U").trim().charAt(0).toUpperCase();

  return (
    <header id="header" className="bg-white dark:bg-gray-900 shadow-sm border-b border-gray-200 dark:border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <nav className="hidden sm:flex sm:space-x-8">
              <Link href="/sell">
                <span id="sell-button" className={`${isActive('/sell') ? 'border-primary text-gray-900' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'} inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium cursor-pointer`}>
                  Sell Your Items
                </span>
              </Link>
              <Link href="/seller-listings">
                <span className={`${isActive('/seller-listings') ? 'border-primary text-gray-900' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'} inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium cursor-pointer`}>
                  My Listings
                </span>
              </Link>
              <Link href="/buyer-requests">
                <span className={`${isActive('/buyer-requests') ? 'border-primary text-gray-900' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'} inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium cursor-pointer`}>
                  Buyer Requests
                </span>
              </Link>

              <Link href="/achievements">
                <span id="achievements-link" className={`${isActive('/achievements') ? 'border-primary text-gray-900' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'} inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium cursor-pointer`}>
                  Achievements
                </span>
              </Link>
              {(MARKETPLACE_ADMIN_EMAILS.includes(user?.email?.toLowerCase() ?? '') || user?.username === "admin") && (
                <>
                  <Link href="/admin">
                    <span className={`${isActive('/admin') ? 'border-primary text-gray-900' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'} inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium cursor-pointer`}>
                      Admin
                    </span>
                  </Link>
                  <Link href="/database-monitor">
                    <span className={`${isActive('/database-monitor') ? 'border-primary text-gray-900' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'} inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium cursor-pointer`}>
                      Database
                    </span>
                  </Link>
                </>
              )}
            </nav>
          </div>
          <div className="hidden sm:ml-6 sm:flex sm:items-center">
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    id="profile-menu"
                    className="ml-3 flex items-center gap-2 rounded-full p-1 pr-3 hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                    data-testid="button-account-menu"
                    aria-label="Open account menu"
                  >
                    <Avatar className="h-9 w-9">
                      {avatarUrl ? <AvatarImage src={avatarUrl} alt={displayName} /> : null}
                      <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                        {initial}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-200 max-w-[140px] truncate">
                      {displayName}
                    </span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none truncate">{displayName}</p>
                      {user.email ? (
                        <p className="text-xs leading-none text-muted-foreground truncate">{user.email}</p>
                      ) : null}
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild className="cursor-pointer" data-testid="menu-my-listings">
                    <Link href="/seller-listings">
                      <Package className="mr-2 h-4 w-4" />
                      My Listings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="cursor-pointer" data-testid="menu-orders">
                    <Link href="/orders">
                      <ListOrdered className="mr-2 h-4 w-4" />
                      Orders
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="cursor-pointer text-red-600 focus:text-red-600"
                    onClick={handleLogout}
                    data-testid="menu-logout"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link href="/auth">
                <Button className="ml-3">Sign In</Button>
              </Link>
            )}
            <Link href="/cart">
              <span className="ml-4 px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary flex items-center gap-2 cursor-pointer">
                <ShoppingCart className="h-4 w-4" />
                Cart ({itemCount})
              </span>
            </Link>
          </div>
          <div className="-mr-2 flex items-center sm:hidden">
            <button
              type="button"
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-expanded={mobileMenuOpen}
            >
              <span className="sr-only">Open main menu</span>
              <Menu className="block h-6 w-6" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="sm:hidden bg-white border-b border-gray-200">
          <div className="pt-2 pb-3 space-y-1">
            <Link href="/">
              <span
                className={`${isActive('/') ? 'bg-primary/10 border-primary text-primary' : 'border-transparent text-gray-600'} block pl-3 pr-4 py-2 border-l-4 text-base font-medium cursor-pointer`}
                onClick={() => setMobileMenuOpen(false)}
              >
                Home
              </span>
            </Link>
            <Link href="/sell">
              <span
                className={`${isActive('/sell') ? 'bg-primary/10 border-primary text-primary' : 'border-transparent text-gray-600'} block pl-3 pr-4 py-2 border-l-4 text-base font-medium cursor-pointer`}
                onClick={() => setMobileMenuOpen(false)}
              >
                Sell Your Items
              </span>
            </Link>
            <Link href="/seller-listings">
              <span
                className={`${isActive('/seller-listings') ? 'bg-primary/10 border-primary text-primary' : 'border-transparent text-gray-600'} block pl-3 pr-4 py-2 border-l-4 text-base font-medium cursor-pointer`}
                onClick={() => setMobileMenuOpen(false)}
              >
                My Listings
              </span>
            </Link>
            <Link href="/orders">
              <span
                className={`${isActive('/orders') ? 'bg-primary/10 border-primary text-primary' : 'border-transparent text-gray-600'} block pl-3 pr-4 py-2 border-l-4 text-base font-medium cursor-pointer`}
                onClick={() => setMobileMenuOpen(false)}
              >
                Orders
              </span>
            </Link>
            {(MARKETPLACE_ADMIN_EMAILS.includes(user?.email?.toLowerCase() ?? '') || user?.username === "admin") && (
              <>
                <Link href="/admin">
                  <span
                    className={`${isActive('/admin') ? 'bg-primary/10 border-primary text-primary' : 'border-transparent text-gray-600'} block pl-3 pr-4 py-2 border-l-4 text-base font-medium cursor-pointer`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Admin Dashboard
                  </span>
                </Link>
                <Link href="/database-monitor">
                  <span
                    className={`${isActive('/database-monitor') ? 'bg-primary/10 border-primary text-primary' : 'border-transparent text-gray-600'} block pl-3 pr-4 py-2 border-l-4 text-base font-medium cursor-pointer`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Database Monitor
                  </span>
                </Link>
              </>
            )}
            {/* Cart link for mobile */}
            <Link href="/cart">
              <span
                className={`${isActive('/cart') ? 'bg-primary/10 border-primary text-primary' : 'border-transparent text-gray-600'} block pl-3 pr-4 py-2 border-l-4 text-base font-medium cursor-pointer flex items-center gap-2`}
                onClick={() => setMobileMenuOpen(false)}
              >
                <ShoppingCart className="h-4 w-4" />
                Cart ({itemCount})
              </span>
            </Link>
          </div>
          <div className="pt-4 pb-3 border-t border-gray-200 dark:border-gray-700">
            {user ? (
              <>
                <div className="flex items-center px-4">
                  <Avatar className="h-10 w-10">
                    {avatarUrl ? <AvatarImage src={avatarUrl} alt={displayName} /> : null}
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                      {initial}
                    </AvatarFallback>
                  </Avatar>
                  <div className="ml-3">
                    <div className="text-base font-medium text-gray-800 dark:text-gray-200 truncate max-w-[200px]">{displayName}</div>
                    {user.email ? (
                      <div className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate max-w-[200px]">{user.email}</div>
                    ) : null}
                  </div>
                </div>
                <div className="mt-3 space-y-1">
                  <button
                    onClick={handleLogout}
                    className="block px-4 py-2 text-base font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-800 w-full text-left"
                    data-testid="mobile-button-logout"
                  >
                    Sign out
                  </button>
                </div>
              </>
            ) : (
              <div className="px-4">
                <Link href="/auth">
                  <Button onClick={() => setMobileMenuOpen(false)} className="w-full">
                    Sign In
                  </Button>
                </Link>
              </div>
            )}

          </div>
        </div>
      )}
    </header>
  );
}
