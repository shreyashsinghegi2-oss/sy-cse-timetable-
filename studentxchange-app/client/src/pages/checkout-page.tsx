import { useAuth } from "@/hooks/use-auth";
import { useCart } from "@/hooks/use-cart";
import { useState } from "react";
import { useLocation } from "wouter";
import { trackEvent } from "@/lib/analytics";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import MobileNav from "@/components/layout/mobile-nav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Check, CreditCard, MapPin, Package, FileText } from "lucide-react";
import { calculateFee, getFeeRate, calculateDisplayedFee, getDiscountPercentage } from "@shared/commission-utils";
import { useSimpleToast } from "@/hooks/use-simple-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import PayUButton from "@/components/PayUButton";

const deliverySchema = z.object({
  customerName: z.string().min(2, "Name must be at least 2 characters"),
  customerPhone: z.string().min(10, "Phone number must be at least 10 digits"),
  deliveryAddressType: z.string().min(1, "Address type is required"),
  deliveryInstitution: z.string().optional(),
  deliveryAddress: z.string().optional(),
  deliveryCity: z.string().optional(),
  deliveryState: z.string().optional(),
  deliveryPincode: z.string().optional(),
});

type DeliveryFormValues = z.infer<typeof deliverySchema>;

export default function CheckoutPage() {
  const { user } = useAuth();
  const { items: cartItems, clearCart } = useCart();
  const [, navigate] = useLocation();
  const { toast } = useSimpleToast();
  const [paymentCompleted, setPaymentCompleted] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'gateway' | 'cod'>('gateway');
  const [showDeliveryForm, setShowDeliveryForm] = useState(true);
  
  const userId = user?.id || 0;

  const buyNowData = sessionStorage.getItem('buyNowCheckout');  
  const items = buyNowData ? JSON.parse(buyNowData).items : cartItems;

  const form = useForm<DeliveryFormValues>({
    resolver: zodResolver(deliverySchema),
    defaultValues: {
      customerName: "",
      customerPhone: "",
      deliveryAddressType: "home",
      deliveryInstitution: "",
      deliveryAddress: "",
      deliveryCity: "",
      deliveryState: "",
      deliveryPincode: "",
    },
  });
  
  const sellerSubtotal = items.reduce(
    (sum: number, item: any) => sum + Number(item.product?.price || 0) * item.quantity,
    0
  );
  const fee = calculateFee(sellerSubtotal);
  const total = sellerSubtotal + fee;
  
  const createPendingOrderAndSave = async (): Promise<number> => {
    const deliveryData = form.getValues();
    const validation = deliverySchema.safeParse(deliveryData);
    
    if (!validation.success) {
      toast({
        title: "Please complete delivery details",
        description: "Fill in your name, phone, and address before paying.",
        variant: "destructive",
      });
      throw new Error("Validation failed");
    }

    try {
      const orderData = {
        userId,
        items: items.map((item: any) => ({
          productId: item.product?.id || item.productId,
          quantity: item.quantity,
          price: parseFloat(item.product?.price?.toString() || item.price?.toString() || "0")
        })).filter((item: any) => item.productId),
        totalAmount: total,
        commission: fee,
        status: "pending_payment",
        paymentMethod: "payu",
        customerName: deliveryData.customerName,
        customerPhone: deliveryData.customerPhone,
        deliveryAddress: deliveryData.deliveryAddress,
        deliveryCity: deliveryData.deliveryCity,
        deliveryState: deliveryData.deliveryState,
        deliveryPincode: deliveryData.deliveryPincode,
        deliveryAddressType: deliveryData.deliveryAddressType,
        deliveryInstitution: deliveryData.deliveryInstitution,
      };

      const response = await apiRequest("POST", "/api/orders", orderData);
      
      if (!response || !response.success || !response.id) {
        throw new Error(response?.message || "Order creation failed");
      }

      const checkoutData = {
        pendingOrderId: response.id,
        userId,
        totalAmount: total,
        isBuyNow: !!buyNowData,
        timestamp: Date.now(),
      };
      sessionStorage.setItem('payuCheckoutData', JSON.stringify(checkoutData));

      return response.id;

    } catch (error: any) {
      console.error("[PAYU STAGE 1] Failed to create pending order:", error);
      const errorMessage = error?.message || "Unknown error";
      
      if (errorMessage.includes("Product with ID") && errorMessage.includes("not found")) {
        toast({
          title: "Product Not Available",
          description: "One or more items are no longer available. Please refresh and try again.",
          variant: "destructive",
        });
      } else if (errorMessage.includes("Not enough quantity available")) {
        toast({
          title: "Insufficient Stock",
          description: "Not enough quantity available for one or more items.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Order Processing Issue",
          description: "Could not prepare your order. Please try again.",
          variant: "destructive",
        });
      }
      throw error;
    }
  };

  const handlePayUError = (error: any) => {
    console.error("PayU payment error:", error);
    toast({
      title: "Payment Failed",
      description: "Payment could not be processed. Please try again.",
      variant: "destructive",
    });
  };

  const handleCODOrder = async () => {
    const deliveryData = form.getValues();
    const validation = deliverySchema.safeParse(deliveryData);
    
    if (!validation.success) {
      toast({
        title: "Please complete delivery details",
        description: "All delivery address fields are required.",
        variant: "destructive",
      });
      return;
    }

    setIsVerifying(true);
    
    try {
      const orderData = {
        userId,
        items: items.map((item: any) => ({
          productId: item.product?.id || item.productId,
          quantity: item.quantity,
          price: Number(item.product?.price || item.price || 0)
        })).filter((item: any) => item.productId),
        totalAmount: total,
        commission: fee,
        status: "pending_cod",
        customerName: deliveryData.customerName,
        customerPhone: deliveryData.customerPhone,
        deliveryAddress: deliveryData.deliveryAddress,
        deliveryCity: deliveryData.deliveryCity,
        deliveryState: deliveryData.deliveryState,
        deliveryPincode: deliveryData.deliveryPincode,
        deliveryAddressType: deliveryData.deliveryAddressType,
        deliveryInstitution: deliveryData.deliveryInstitution,
        paymentMethod: "cod",
      };

      const orderResponse = await apiRequest("POST", "/api/orders", orderData);
      
      if (orderResponse && orderResponse.success && orderResponse.id) {
        
        trackEvent('purchase', 'ecommerce', `cod_order_${orderResponse.id}`, total);
        
        if (!buyNowData) {
          clearCart();
        } else {
          sessionStorage.removeItem('buyNowCheckout');
        }
        
        setPaymentCompleted(true);
        setPaymentMethod("cod");
        
        queryClient.invalidateQueries({ queryKey: [`/api/orders/${userId}`] });
        queryClient.invalidateQueries({ queryKey: ['/api/products'] });
        
        toast({
          title: "COD Order Placed Successfully!",
          description: `Order #TXN-${orderResponse.id.toString().padStart(6, '0')} confirmed. Pay on delivery.`,
        });
        
        setTimeout(() => {
          navigate("/orders");
        }, 3000);
        
      } else {
        throw new Error("COD order creation failed - invalid response format");
      }
      
    } catch (error: any) {
      console.error("[Checkout] COD order error:", error);
      
      const errorMessage = error?.message || error?.error || "Unknown error";
      
      if (errorMessage.includes("Product with ID") && errorMessage.includes("not found")) {
        toast({
          title: "Product Not Available",
          description: "One or more items are no longer available.",
          variant: "destructive",
        });
      } else if (errorMessage.includes("Not enough quantity available")) {
        toast({
          title: "Insufficient Stock",
          description: "Not enough quantity available for one or more items.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "COD Order Failed",
          description: "Unable to create Cash on Delivery order. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setIsVerifying(false);
    }
  };
  
  if (paymentCompleted) {
    return (
      <div className="min-h-screen flex flex-col bg-white">
        <Header />
        
        <main className="flex-grow py-10">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center py-12">
              <div className="mb-4 flex justify-center">
                <div className="h-24 w-24 rounded-full bg-green-100 flex items-center justify-center">
                  <Check className="h-12 w-12 text-green-600" />
                </div>
              </div>
              {paymentMethod === 'cod' ? (
                <>
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">COD Order Placed Successfully!</h1>
                  <p className="text-gray-600 mb-4">Your Cash on Delivery order has been confirmed.</p>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8 max-w-md mx-auto">
                    <h3 className="text-lg font-semibold text-blue-900 mb-2">Payment Instructions</h3>
                    <p className="text-blue-800 mb-2">Please keep <span className="font-bold text-xl">₹{total.toFixed(2)}</span> ready</p>
                    <p className="text-blue-700 text-sm">You'll pay in cash when the items are delivered to your address.</p>
                  </div>
                </>
              ) : (
                <>
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">Payment Successful!</h1>
                  <p className="text-gray-600 mb-8">Your order has been placed and is now being processed.</p>
                </>
              )}
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
                <Button onClick={() => navigate("/")}>Continue Shopping</Button>
                <Button variant="outline" onClick={() => navigate("/orders")}>View My Orders</Button>
              </div>
            </div>
          </div>
        </main>
        
        <Footer />
        <MobileNav />
      </div>
    );
  }
  
  if (items.length === 0) {
    return (
      <div className="min-h-screen flex flex-col bg-white">
        <Header />
        
        <main className="flex-grow py-10">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center py-12">
              <h2 className="text-2xl font-medium text-gray-900 mb-2">Your cart is empty</h2>
              <p className="text-gray-500 mb-6">Add items to your cart before checkout.</p>
              <Button onClick={() => navigate("/")} className="flex items-center gap-2 mx-auto">
                Browse Products
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
              onClick={() => navigate("/cart")}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Cart
            </Button>
            <h1 className="text-2xl font-bold text-gray-900 ml-4">Checkout</h1>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            <div className="lg:col-span-3">
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Delivery Address
                  </CardTitle>
                  <CardDescription>Enter your delivery details</CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...form}>
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="customerName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Full Name</FormLabel>
                              <FormControl>
                                <Input placeholder="Your full name" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="customerPhone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Phone Number</FormLabel>
                              <FormControl>
                                <Input placeholder="Your phone number" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <FormField
                        control={form.control}
                        name="deliveryAddressType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Address Type</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select address type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="home">Home Address</SelectItem>
                                <SelectItem value="university">University Address</SelectItem>
                                <SelectItem value="college">College Address</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormDescription>
                              Choose university/college to skip detailed address entry
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {form.watch("deliveryAddressType") === "university" && (
                        <FormField
                          control={form.control}
                          name="deliveryInstitution"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>University Name</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter your university name" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}

                      {form.watch("deliveryAddressType") === "college" && (
                        <FormField
                          control={form.control}
                          name="deliveryInstitution"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>College Name</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter your college name" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}

                      {form.watch("deliveryAddressType") === "home" && (
                        <>
                          <FormField
                            control={form.control}
                            name="deliveryAddress"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Street Address</FormLabel>
                                <FormControl>
                                  <Textarea 
                                    placeholder="Enter your full street address" 
                                    {...field} 
                                    rows={3}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                      
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <FormField
                              control={form.control}
                              name="deliveryCity"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>City</FormLabel>
                                  <FormControl>
                                    <Input placeholder="City" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={form.control}
                              name="deliveryState"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>State</FormLabel>
                                  <FormControl>
                                    <Input placeholder="State" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={form.control}
                              name="deliveryPincode"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Pincode</FormLabel>
                                  <FormControl>
                                    <Input 
                                      placeholder="Pincode" 
                                      {...field} 
                                      maxLength={6}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </>
                      )}
                    </div>
                  </Form>
                </CardContent>
              </Card>

              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>Choose Payment Method</CardTitle>
                  <CardDescription>Select how you'd like to pay</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Button
                      variant={paymentMethod === 'gateway' ? 'default' : 'outline'}
                      className="h-16 flex-col"
                      onClick={() => setPaymentMethod('gateway')}
                    >
                      <CreditCard className="h-6 w-6 mb-2" />
                      Payment Gateway
                    </Button>
                    <Button
                      variant="outline"
                      className="h-16 flex-col opacity-50 cursor-not-allowed"
                      disabled
                    >
                      <Package className="h-6 w-6 mb-2" />
                      Cash on Delivery
                      <span className="text-xs mt-1 text-gray-500">(Temporarily Disabled)</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {paymentMethod === 'gateway' && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <CreditCard className="h-5 w-5 mr-2" />
                      Payment Gateway
                    </CardTitle>
                    <CardDescription>
                      Secure payment processing directly to bank account
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="p-6 border-2 border-dashed border-gray-200 rounded-lg text-center">
                      <CreditCard className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">Secure Payment Gateway</h3>
                      <p className="text-gray-600 mb-4">
                        Click below to proceed with secure payment processing. Money will be directly deposited to our bank account.
                      </p>
                      
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                        <p className="text-sm text-green-800">
                          <span className="font-semibold">Amount:</span> ₹{total.toFixed(2)} INR
                        </p>
                        <p className="text-sm text-green-800 mt-1">
                          <span className="font-semibold">Currency:</span> Indian Rupees (INR)
                        </p>
                        <p className="text-sm text-green-800 mt-1">
                          <span className="font-semibold">Processing:</span> Instant bank transfer
                        </p>
                      </div>
                      
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <p className="text-sm text-blue-800">
                          <span className="font-semibold">Contact Phone:</span> 7039862086
                        </p>
                        <p className="text-sm text-blue-800 mt-1">
                          Secure payment processing with instant confirmation. Your payment will be processed securely.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <PayUButton
                      amount={total}
                      productinfo={`Payment for ${items.length} items from StudentXchange`}
                      customerName={form.getValues('customerName')}
                      customerEmail={user?.email || ""}
                      customerPhone={form.getValues('customerPhone')}
                      onBeforeRedirect={createPendingOrderAndSave}
                      onError={handlePayUError}
                      disabled={!form.formState.isValid || isVerifying}
                      className="w-full"
                    />
                  </CardFooter>
                </Card>
              )}

              {paymentMethod === 'cod' && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Package className="h-5 w-5 mr-2" />
                      Cash on Delivery
                    </CardTitle>
                    <CardDescription>
                      Pay with cash when your order is delivered
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="p-4 bg-green-50 rounded-lg">
                        <h4 className="font-medium text-green-900 mb-2">Cash on Delivery</h4>
                        <p className="text-sm text-green-700 mb-2">
                          You can pay with cash when your order is delivered to your doorstep.
                        </p>
                        <ul className="text-sm text-green-700 space-y-1">
                          <li>No advance payment required</li>
                          <li>Pay exact amount to delivery partner</li>
                          <li>Additional COD charges may apply</li>
                        </ul>
                      </div>
                      
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <p className="text-sm text-blue-800">
                          <span className="font-semibold">Amount to pay on delivery:</span> ₹{total.toFixed(2)} INR
                        </p>
                        <p className="text-sm text-blue-800 mt-1">
                          <span className="font-semibold">Contact Phone:</span> 7039862086
                        </p>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button
                      onClick={handleCODOrder}
                      disabled={isVerifying}
                      className="w-full"
                      size="lg"
                    >
                      {isVerifying ? "Processing..." : "Place COD Order"}
                    </Button>
                  </CardFooter>
                </Card>
              )}
            </div>
            
            <div className="lg:col-span-2">
              <Card className="sticky top-4">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Order Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {items.map((item: any, index: number) => {
                    const product = item.product;
                    const images = product?.images || [];
                    const imageUrl = images.length > 0 ? images[0] : null;
                    
                    return (
                      <div key={index} className="flex gap-3 py-3 border-b last:border-0">
                        <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                          {imageUrl ? (
                            <img 
                              src={imageUrl} 
                              alt={product?.title || "Product"} 
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                              <Package className="h-6 w-6" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 text-sm truncate">{product?.title || "Product"}</p>
                          <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
                          <p className="text-sm font-semibold text-gray-900 mt-1">
                            ₹{(Number(product?.price || 0) * item.quantity).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  
                  <Separator />
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between text-gray-600">
                      <span>Subtotal</span>
                      <span>₹{sellerSubtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>Platform Fee ({getFeeRate(sellerSubtotal)}%)</span>
                      <span>₹{fee.toFixed(2)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-bold text-lg">
                      <span>Total</span>
                      <span>₹{total.toFixed(2)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
      <MobileNav />
    </div>
  );
}
