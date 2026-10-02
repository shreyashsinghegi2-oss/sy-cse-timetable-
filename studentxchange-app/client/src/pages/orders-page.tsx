import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import MobileNav from "@/components/layout/mobile-nav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, PackageCheck, Calendar, X, RefreshCw, Truck, Eye, AlertCircle } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { useLocation } from "wouter";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";

interface OrderItem {
  id: number;
  orderId: number;
  productId: number;
  quantity: number;
  price: number;
  product: {
    id: number;
    title: string;
    category: string;
    condition: string;
    images?: string[];
  };
}

interface Order {
  id: number;
  userId: number;
  totalAmount: number;
  commission: number;
  status: string;
  createdAt: string;
  items: OrderItem[];
  customerName?: string;
  customerPhone?: string;
  deliveryAddress?: string;
  deliveryCity?: string;
  deliveryState?: string;
  deliveryPincode?: string;
  deliveryAddressType?: string;
  deliveryInstitution?: string;
  canCancel?: boolean;
  refundRequested?: boolean;
  refundReason?: string;
  refundStatus?: string;
  estimatedDelivery?: string;
  trackingNumber?: string;
  paymentId?: string;
  orderId?: string;
}

export default function OrdersPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [refundReason, setRefundReason] = useState("");
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [orderToCancel, setOrderToCancel] = useState<Order | null>(null);
  const userId = user?.id;

  const { data: orders = [], isLoading } = useQuery<Order[]>({
    queryKey: [`/api/orders/${userId}`],
    enabled: !!userId,
  });

  // Cancel Order Mutation
  const cancelOrderMutation = useMutation({
    mutationFn: async (orderId: number) => {
      return await apiRequest("PUT", `/api/orders/${orderId}/cancel`, {});
    },
    onSuccess: () => {
      toast({
        title: "Order Cancelled",
        description: "Your order has been cancelled. For any queries, please contact us at 7039862086.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/orders/${userId}`] });
    },
    onError: (error: Error) => {
      toast({
        title: "Cancellation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Request Refund Mutation
  const refundRequestMutation = useMutation({
    mutationFn: async ({ orderId, reason }: { orderId: number; reason: string }) => {
      return await apiRequest("POST", `/api/orders/${orderId}/refund-request`, { reason });
    },
    onSuccess: () => {
      toast({
        title: "Refund Requested",
        description: "Your refund request has been submitted. We'll process it within 3-5 business days.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/orders/${userId}`] });
      setRefundReason("");
      setSelectedOrder(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Refund Request Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'processing':
      case 'pending':
      case 'paid':
        return 'bg-yellow-100 text-yellow-800';
      case 'shipped':
      case 'in_transit':
        return 'bg-blue-100 text-blue-800';
      case 'pending_payment':
        return 'bg-amber-100 text-amber-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'refund_requested':
        return 'bg-orange-100 text-orange-800';
      case 'refunded':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
      case 'delivered':
        return <PackageCheck className="h-4 w-4" />;
      case 'shipped':
      case 'in_transit':
        return <Truck className="h-4 w-4" />;
      case 'cancelled':
        return <X className="h-4 w-4" />;
      case 'refund_requested':
      case 'refunded':
        return <RefreshCw className="h-4 w-4" />;
      default:
        return <Calendar className="h-4 w-4" />;
    }
  };

  const canCancelOrder = (order: Order) => {
    const cancelableStatuses = ['pending', 'processing', 'paid'];
    return order.canCancel !== false && cancelableStatuses.includes(order.status.toLowerCase());
  };

  const canRequestRefund = (order: Order) => {
    const refundableStatuses = ['delivered', 'completed'];
    return refundableStatuses.includes(order.status.toLowerCase()) && !order.refundRequested;
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'PPP');
    } catch {
      return dateString;
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-grow py-10">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => navigate("/")}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <h1 className="text-3xl font-bold text-gray-900">Your Orders</h1>
            </div>
            <div className="text-sm text-gray-600">
              {orders.length} {orders.length === 1 ? 'order' : 'orders'}
            </div>
          </div>
          
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-pulse">Loading your orders...</div>
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-12">
              <PackageCheck className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h2 className="text-2xl font-medium text-gray-900 mb-2">No orders yet</h2>
              <p className="text-gray-500 mb-6">You haven't placed any orders yet.</p>
              <Button onClick={() => navigate("/")} className="flex items-center gap-2 mx-auto">
                Browse Products
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {orders.map((order) => (
                <Card key={order.id} className="overflow-hidden">
                  <CardHeader className="pb-4">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          Order #{order.id}
                          <Badge className={getStatusColor(order.status)}>
                            {getStatusIcon(order.status)}
                            <span className="ml-1">{order.status}</span>
                          </Badge>
                        </CardTitle>
                        <CardDescription className="flex items-center gap-1 mt-1">
                          <Calendar className="h-3 w-3" />
                          Placed on {formatDate(order.createdAt)}
                        </CardDescription>
                      </div>
                      <div className="mt-2 md:mt-0">
                        <div className="flex gap-2">
                          {canCancelOrder(order) && (
                            <>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => {
                                  setOrderToCancel(order);
                                  setShowCancelDialog(true);
                                }}
                                disabled={cancelOrderMutation.isPending}
                                className="flex items-center gap-1"
                              >
                                <X className="h-3 w-3" />
                                Cancel Order
                              </Button>
                            </>
                          )}
                          {canRequestRefund(order) && (
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  onClick={() => setSelectedOrder(order)}
                                  className="flex items-center gap-1"
                                >
                                  <RefreshCw className="h-3 w-3" />
                                  Request Refund
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Request Refund</DialogTitle>
                                  <DialogDescription>
                                    Please provide a reason for your refund request. Our team will review and process it within 3-5 business days.
                                  </DialogDescription>
                                </DialogHeader>
                                <Textarea
                                  placeholder="Please explain why you want to return this order..."
                                  value={refundReason}
                                  onChange={(e) => setRefundReason(e.target.value)}
                                  className="min-h-[100px]"
                                />
                                <DialogFooter>
                                  <Button 
                                    variant="outline" 
                                    onClick={() => {
                                      setRefundReason("");
                                      setSelectedOrder(null);
                                    }}
                                  >
                                    Cancel
                                  </Button>
                                  <Button 
                                    onClick={() => {
                                      if (selectedOrder && refundReason.trim()) {
                                        refundRequestMutation.mutate({
                                          orderId: selectedOrder.id,
                                          reason: refundReason.trim()
                                        });
                                      }
                                    }}
                                    disabled={!refundReason.trim() || refundRequestMutation.isPending}
                                  >
                                    Submit Refund Request
                                  </Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent>
                    {/* Product Images Section - Prominently displayed */}
                    <div className="mb-6">
                      <h4 className="font-medium text-gray-900 mb-3">Items Ordered</h4>
                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {order.items.map((item, index) => (
                          <div key={index} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                            <div className="w-full h-32 bg-gray-100 rounded-lg overflow-hidden mb-3">
                              {item.product?.images && item.product.images.length > 0 ? (
                                <img 
                                  src={item.product.images[0]} 
                                  alt={item.product?.title || 'Product'}
                                  className="w-full h-full object-cover"
                                  loading="lazy"
                                  onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
                                    (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTI4IiBoZWlnaHQ9IjEyOCIgdmlld0JveD0iMCAwIDEyOCAxMjgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMjgiIGhlaWdodD0iMTI4IiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik00OCA2NEMzNi40MTggNjQgMjcgNTQuNTgyIDI3IDQzUzM2LjQxOCAyMiA0OCAyMlM2OSAzMS40MTggNjkgNDNTNTkuNTgyIDY0IDQ4IDY0WiIgZmlsbD0iI0Q5RDlEOSIvPgo8dGV4dCB4PSI2NCIgeT0iODQiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OTk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+Tm8gSW1hZ2U8L3RleHQ+Cjwvc3ZnPg==';
                                  }}
                                />
                              ) : (
                                <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                                  <PackageCheck className="h-8 w-8 text-gray-400" />
                                </div>
                              )}
                            </div>
                            <h4 className="font-medium text-gray-900 text-sm mb-1 line-clamp-2">{item.product?.title || 'Unknown Product'}</h4>
                            <p className="text-xs text-gray-500 mb-2">
                              {item.product?.category || 'Unknown'}{item.product?.condition && ` • ${item.product.condition}`}
                            </p>
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-gray-500">Qty: {item.quantity}</span>
                              <span className="font-semibold text-gray-900">₹{parseFloat((item.price || 0).toString()).toFixed(2)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <Separator className="my-4" />
                    
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">Order Summary</h4>
                        <div className="text-sm text-gray-600 space-y-1">
                          <div className="flex justify-between">
                            <span>Subtotal:</span>
                            <span>₹{(parseFloat(order.totalAmount?.toString() || '0') - parseFloat(order.commission?.toString() || '0')).toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Platform Fee:</span>
                            <span>₹{parseFloat(order.commission?.toString() || '0').toFixed(2)}</span>
                          </div>
                          <Separator className="my-2" />
                          <div className="flex justify-between font-semibold text-gray-900">
                            <span>Total:</span>
                            <span>₹{parseFloat(order.totalAmount?.toString() || '0').toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">Delivery Information</h4>
                        <div className="text-sm text-gray-600 space-y-1">
                          {order.customerName && (
                            <div><span className="font-medium">Name:</span> {order.customerName}</div>
                          )}
                          {order.customerPhone && (
                            <div><span className="font-medium">Phone:</span> {order.customerPhone}</div>
                          )}
                          {(order.deliveryAddress || order.deliveryInstitution) && (
                            <div>
                              <span className="font-medium">Address:</span><br />
                              {order.deliveryAddressType === 'college' || order.deliveryAddressType === 'university' ? (
                                <div>
                                  <div className="font-medium text-blue-600">{order.deliveryInstitution || 'Institution'}</div>
                                  {order.deliveryAddress && <div>{order.deliveryAddress}</div>}
                                </div>
                              ) : (
                                <div>{order.deliveryAddress}</div>
                              )}
                              {order.deliveryCity && <div>{order.deliveryCity}</div>}
                              {order.deliveryState && <div>{order.deliveryState}</div>}
                              {order.deliveryPincode && <div>PIN: {order.deliveryPincode}</div>}
                            </div>
                          )}
                          {order.trackingNumber && (
                            <div>
                              <span className="font-medium">Tracking:</span> {order.trackingNumber}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {order.refundRequested && (
                      <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 text-orange-600" />
                          <span className="text-sm font-medium text-orange-800">
                            Refund Request Submitted
                          </span>
                        </div>
                        {order.refundReason && (
                          <p className="text-xs text-orange-700 mt-1">
                            Reason: {order.refundReason}
                          </p>
                        )}
                        {order.refundStatus && (
                          <p className="text-xs text-orange-700 mt-1">
                            Status: {order.refundStatus}
                          </p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
      
      <Footer />
      <MobileNav />

      {/* Cancellation Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Order</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel this order? Once cancelled, this action cannot be reversed.
            </DialogDescription>
          </DialogHeader>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 my-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              <span className="font-medium text-blue-800">Need Help?</span>
            </div>
            <p className="text-sm text-blue-700">
              For any questions about your order or cancellation, please contact us at:
            </p>
            <div className="mt-2 font-semibold text-blue-800">
              📞 +91 7039862086
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowCancelDialog(false);
                setOrderToCancel(null);
              }}
            >
              Keep Order
            </Button>
            <Button 
              variant="destructive"
              onClick={() => {
                if (orderToCancel) {
                  cancelOrderMutation.mutate(orderToCancel.id);
                  setShowCancelDialog(false);
                  setOrderToCancel(null);
                }
              }}
              disabled={cancelOrderMutation.isPending}
            >
              {cancelOrderMutation.isPending ? "Cancelling..." : "Cancel Order"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}