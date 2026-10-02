import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useCart } from "@/hooks/use-cart";
import { useSimpleToast } from "@/hooks/use-simple-toast";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import MobileNav from "@/components/layout/mobile-nav";
import CartItem from "@/components/cart/cart-item";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ShoppingCart, Check, ArrowLeft } from "lucide-react";
import { calculateFee, getFeeRate, calculateDisplayedFee, getDiscountPercentage } from "@shared/commission-utils";

export default function CartPage() {
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { items, clearCart } = useCart();
  const { toast } = useSimpleToast();
  
  const userId = user?.id;

  // Calculate order totals based on seller prices
  const sellerSubtotal = items.reduce((total, item) => {
    return total + (Number(item.product?.price || 0) * item.quantity);
  }, 0);
  
  // Calculate platform fee using tiered rates
  const fee = calculateFee(sellerSubtotal);
  
  // Total is seller price plus fee (what buyer actually pays)
  const total = sellerSubtotal + fee;

  const checkoutMutation = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error("User not authenticated");
      
      // Format order items for the API
      const orderItems = items.map(item => ({
        productId: item.product?.id,
        quantity: item.quantity
      })).filter(item => item.productId); // Filter out items without productId
      
      const res = await apiRequest("POST", "/api/orders", {
        userId,
        items: orderItems
      });
      
      return res;
    },
    onSuccess: () => {
      // Clear the cart after successful checkout
      clearCart();
      
      // Show success message
      toast({
        title: "Order placed successfully",
        description: "Thank you for your purchase!",
        variant: "default",
      });
      
      // Redirect to orders page
      navigate("/orders");
    },
    onError: (error: Error) => {
      toast({
        title: "Checkout failed",
        description: error.message,
        variant: "destructive",
      });
      setIsCheckingOut(false);
    }
  });

  const handleCheckout = () => {
    setIsCheckingOut(true);
    // Navigate to the UPI payment checkout page
    navigate("/checkout");
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen flex flex-col bg-white">
        <Header />
        
        <main className="flex-grow py-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center py-12">
              <ShoppingCart className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h2 className="text-2xl font-medium text-gray-900 mb-2">Your cart is empty</h2>
              <p className="text-gray-500 mb-6">Looks like you haven't added any items to your cart yet.</p>
              <Button onClick={() => navigate("/")} className="flex items-center gap-2 mx-auto">
                Continue Shopping
              </Button>
            </div>
          </div>
        </main>
        
        <Footer />
        <MobileNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />
      
      <main className="flex-grow py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-6 flex items-center">
            <Button 
              variant="ghost" 
              className="pl-0" 
              onClick={() => navigate("/")}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Continue Shopping
            </Button>
            <h1 className="text-2xl font-bold text-gray-900 ml-4">Your Cart</h1>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Cart Items ({items.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-0">
                    {items.map((item) => (
                      <CartItem 
                        key={item.id} 
                        id={item.id} 
                        product={item.product} 
                        quantity={item.quantity} 
                        userId={userId || 0}
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <div>
              <Card>
                <CardHeader>
                  <CardTitle>Order Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Subtotal (Seller price)</span>
                      <div className="text-right">
                        <span className="font-medium">₹{sellerSubtotal.toFixed(2)}</span>
                        <span className="text-xs text-gray-500 block">INR</span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-500 line-through text-sm">Platform Fee (20%)</span>
                        <div className="text-right">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-500 line-through">₹{calculateDisplayedFee(sellerSubtotal).toFixed(2)}</span>
                            <span className="text-xs bg-green-100 text-green-800 px-1.5 py-0.5 rounded-full font-medium">
                              {getDiscountPercentage(sellerSubtotal).toFixed(0)}% OFF
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-green-600 font-medium">Discounted Platform Fee ({(getFeeRate(sellerSubtotal) * 100).toFixed(0)}%)</span>
                        <div className="text-right">
                          <span className="font-medium text-green-600">₹{fee.toFixed(2)}</span>
                          <span className="text-xs text-gray-500 block">INR</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Delivery Charges</span>
                      <div className="text-right">
                        <span className="font-medium text-green-600">FREE</span>
                        <span className="text-xs text-gray-500 block">₹0 INR</span>
                      </div>
                    </div>
                    <Separator />
                    <div className="flex justify-between">
                      <span className="text-lg font-semibold">Total (You pay)</span>
                      <div className="text-right">
                        <span className="text-lg font-semibold">₹{total.toFixed(2)}</span>
                        <span className="text-xs text-gray-500 block">INR</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button 
                    className="w-full gap-2" 
                    size="lg"
                    onClick={handleCheckout}
                    disabled={isCheckingOut || items.length === 0}
                  >
                    {isCheckingOut ? (
                      <>Processing...</>
                    ) : (
                      <>
                        <Check className="h-5 w-5" />
                        Checkout
                      </>
                    )}
                  </Button>
                </CardFooter>
              </Card>
              
              <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h3 className="font-medium text-yellow-800 mb-1">Order Information</h3>
                <p className="text-sm text-yellow-700">
                  By proceeding to checkout, you are agreeing to our terms of service and acknowledge 
                  that the platform charges a tiered fee (5-15%) on all sales. The seller receives the base price,
                  and you pay the base price plus fee.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
      <MobileNav />
    </div>
  );
}
