import { Link, useLocation } from "wouter";
import { Home, MessageSquare, Info, ShoppingCart, User, ClipboardList } from "lucide-react";

export default function MobileNav() {
  const [location] = useLocation();
  
  const isActive = (path: string) => location === path;
  
  return (
    <div className="fixed bottom-0 inset-x-0 bg-white shadow-lg border-t border-gray-200 z-10 sm:hidden">
      <div className="grid grid-cols-6 gap-0">
        <Link href="/">
          <span className={`flex flex-col items-center py-3 cursor-pointer transition-colors ${isActive('/') ? 'text-primary' : 'text-gray-600'}`}>
            <Home className="h-6 w-6" />
            <span className="text-xs mt-1">Home</span>
          </span>
        </Link>
        <Link href="/buyer-requests">
          <span className={`flex flex-col items-center py-3 cursor-pointer transition-colors ${isActive('/buyer-requests') ? 'text-primary' : 'text-gray-600'}`}>
            <MessageSquare className="h-6 w-6" />
            <span className="text-xs mt-1">Requests</span>
          </span>
        </Link>
        <Link href="/orders">
          <span className={`flex flex-col items-center py-3 cursor-pointer transition-colors ${isActive('/orders') ? 'text-primary' : 'text-gray-600'}`}>
            <ClipboardList className="h-6 w-6" />
            <span className="text-xs mt-1">Orders</span>
          </span>
        </Link>
        <Link href="/sell">
          <span className={`flex flex-col items-center py-3 cursor-pointer transition-colors ${isActive('/sell') ? 'text-primary' : 'text-gray-600'}`}>
            <Info className="h-6 w-6" />
            <span className="text-xs mt-1">Sell</span>
          </span>
        </Link>
        <Link href="/cart">
          <span className={`flex flex-col items-center py-3 cursor-pointer transition-colors ${isActive('/cart') ? 'text-primary' : 'text-gray-600'}`}>
            <ShoppingCart className="h-6 w-6" />
            <span className="text-xs mt-1">Cart</span>
          </span>
        </Link>
        <Link href="/auth">
          <span className={`flex flex-col items-center py-3 cursor-pointer transition-colors ${isActive('/auth') ? 'text-primary' : 'text-gray-600'}`}>
            <User className="h-6 w-6" />
            <span className="text-xs mt-1">Profile</span>
          </span>
        </Link>
      </div>
    </div>
  );
}
