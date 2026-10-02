import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Copy, MessageSquare, Clock, Phone, Mail, Package, DollarSign } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ResponsiveTable } from '@/components/ui/mobile-optimized-table';

interface Order {
  id: number;
  userId: number;
  totalAmount: string;
  commission: string;
  status: string;
  paymentMethod?: string;
  customerName?: string;
  customerPhone?: string;
  deliveryAddress?: string;
  deliveryCity?: string;
  deliveryState?: string;
  createdAt: string;
  items?: OrderItem[];
  buyer?: {
    id: number;
    username: string;
    email: string;
    phone?: string;
  };
}

interface OrderItem {
  id: number;
  productId: number;
  quantity: number;
  price: string;
  product?: {
    id: number;
    title: string;
    price: string;
    sellerId: number;
    sellerName?: string;
    sellerEmail?: string;
    sellerPhone?: string;
    images?: string[];
    description?: string;
    category?: string;
  };
}

interface User {
  id: number;
  username: string;
  email: string;
  phone?: string;
}

export default function OrderManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [smsTemplate, setSmsTemplate] = useState("");
  const { toast } = useToast();

  const { data: _ordersRaw, isLoading: ordersLoading } = useQuery<Order[]>({
    queryKey: ['/api/admin/orders'],
  });
  const orders = _ordersRaw ?? [];

  const { data: _usersRaw } = useQuery<User[]>({
    queryKey: ['/api/admin/users'],
  });
  const users = _usersRaw ?? [];

  // Sort orders by creation date (newest first)
  const sortedOrders = [...orders].sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  // Filter orders based on search criteria
  const filteredOrders = sortedOrders.filter((order: Order) => {
    const buyer = order.buyer || users.find((u: User) => u.id === order.userId);
    const searchLower = searchTerm.toLowerCase();
    
    const matchesSearch = !searchTerm || 
      order.id.toString().includes(searchTerm) ||
      buyer?.username?.toLowerCase().includes(searchLower) ||
      buyer?.email?.toLowerCase().includes(searchLower) ||
      order.customerName?.toLowerCase().includes(searchLower) ||
      order.items?.some((item: OrderItem) => 
        item.product?.title?.toLowerCase().includes(searchLower) ||
        item.product?.sellerName?.toLowerCase().includes(searchLower)
      );

    const matchesStatus = statusFilter === "all" || order.status === statusFilter;
    const matchesPayment = paymentFilter === "all" || order.paymentMethod === paymentFilter;

    return matchesSearch && matchesStatus && matchesPayment;
  });

  const getStatusBadge = (status: string, paymentMethod?: string) => {
    const getStatusColor = () => {
      switch (status) {
        case "paid": return "bg-green-100 text-green-800";
        case "completed": return "bg-blue-100 text-blue-800";
        case "pending_cod": return "bg-orange-100 text-orange-800";
        case "pending_payment": return "bg-amber-100 text-amber-800";
        case "cancelled": return "bg-red-100 text-red-800";
        default: return "bg-yellow-100 text-yellow-800";
      }
    };

    const getStatusLabel = () => {
      switch (status) {
        case "pending_cod": return "COD Pending";
        case "pending_payment": return "Awaiting Payment";
        default: return status;
      }
    };

    return (
      <div className="space-y-1">
        <Badge className={`${getStatusColor()} text-xs`}>
          {getStatusLabel()}
        </Badge>
        {paymentMethod && (
          <div className="text-xs text-gray-500">
            {paymentMethod === "cod" ? "💰 Cash on Delivery" : "💳 Online Payment"}
          </div>
        )}
      </div>
    );
  };

  const generateSmsTemplate = (order: Order, sellerName?: string, productName?: string) => {
    return `Hi ${sellerName || 'Seller'}, your product '${productName || 'Product'}' has been purchased. Pickup and payment processing will be completed within 7 days. Order #TXN-${order.id.toString().padStart(6, '0')}`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to clipboard",
      description: "SMS message template has been copied to your clipboard.",
    });
  };

  const copyOrderDetails = (order: Order) => {
    const buyer = order.buyer || users.find(u => u.id === order.userId);
    const orderDetails = `
Order #TXN-${order.id.toString().padStart(6, '0')}
Date: ${new Date(order.createdAt).toLocaleDateString()}
Status: ${order.status}
Payment: ${order.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Online Payment'}

BUYER DETAILS:
Name: ${buyer?.username || order.customerName || 'N/A'}
Phone: ${buyer?.phone || order.customerPhone || 'N/A'}
Email: ${buyer?.email || 'N/A'}

DELIVERY ADDRESS:
${order.deliveryAddress || 'N/A'}
${order.deliveryCity || ''} ${order.deliveryState || ''}

ITEMS:
${order.items?.map(item => `• ${item.product?.title || 'Unknown Product'} (Qty: ${item.quantity}) - ₹${item.price}`).join('\n') || 'No items'}

TOTAL: ₹${parseFloat(order.totalAmount || "0").toFixed(2)}
Platform Fee: ₹${parseFloat(order.commission || "0").toFixed(2)}
    `.trim();

    copyToClipboard(orderDetails);
  };

  if (ordersLoading) {
    return <div className="p-6">Loading orders...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Order Management Dashboard
          </CardTitle>
          <div className="text-sm text-gray-600">
            Total Orders: {orders.length} | New Orders Today: {
              orders.filter((o: Order) => 
                new Date(o.createdAt).toDateString() === new Date().toDateString()
              ).length
            }
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search and Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Input
              placeholder="Search orders, buyers, products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="pending_cod">Pending COD</SelectItem>
                <SelectItem value="pending_payment">Awaiting Payment</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Select value={paymentFilter} onValueChange={setPaymentFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by payment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Payment Methods</SelectItem>
                <SelectItem value="cod">Cash on Delivery</SelectItem>
                <SelectItem value="payu">Online Payment</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={() => {
              setSearchTerm("");
              setStatusFilter("all");
              setPaymentFilter("all");
            }}>
              Clear Filters
            </Button>
          </div>

          {/* Orders Table */}
          <ResponsiveTable
            desktopTable={
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3">Order Details</th>
                      <th className="text-left p-3">Buyer Info</th>
                      <th className="text-left p-3">Product & Seller Details</th>
                      <th className="text-left p-3">Payment</th>
                      <th className="text-left p-3">Status</th>
                      <th className="text-left p-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.map((order: Order) => {
                      const buyer = order.buyer || users.find((u: User) => u.id === order.userId);
                      
                      return (
                        <tr key={order.id} className="border-b hover:bg-gray-50">
                          <td className="p-3">
                            <div className="space-y-1">
                              <div className="font-bold text-blue-600">
                                TXN-{order.id.toString().padStart(6, '0')}
                              </div>
                              <div className="text-sm text-gray-500">
                                {new Date(order.createdAt).toLocaleDateString('en-IN')} at{' '}
                                {new Date(order.createdAt).toLocaleTimeString('en-IN', { 
                                  hour: '2-digit', 
                                  minute: '2-digit' 
                                })}
                              </div>
                              <div className="text-xs text-gray-400">
                                <Clock className="h-3 w-3 inline mr-1" />
                                {Math.floor((Date.now() - new Date(order.createdAt).getTime()) / (1000 * 60 * 60))}h ago
                              </div>
                            </div>
                          </td>
                          <td className="p-3">
                            <div className="space-y-1">
                              <div className="font-medium text-green-600">
                                {buyer?.username || order.customerName || "Unknown"}
                              </div>
                              <div className="text-sm text-gray-600 flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {buyer?.phone || order.customerPhone || "N/A"}
                              </div>
                              <div className="text-sm text-gray-600 flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                {buyer?.email || "N/A"}
                              </div>
                            </div>
                          </td>
                          <td className="p-3">
                            <div className="space-y-3">
                              {order.items && order.items.length > 0 ? (
                                order.items.slice(0, 2).map((item: OrderItem, idx: number) => {
                                  // Use seller data from product object first, then fallback to users
                                  const sellerFromProduct = item.product?.sellerName;
                                  const sellerFromUsers = users.find((u: User) => u.id === item.product?.sellerId);
                                  const sellerName = sellerFromProduct || sellerFromUsers?.username;
                                  const sellerPhone = item.product?.sellerPhone || sellerFromUsers?.phone;
                                  const sellerEmail = item.product?.sellerEmail || sellerFromUsers?.email;
                                  const buyer = order.buyer || users.find((u: User) => u.id === order.userId);
                                  
                                  return (
                                    <div key={idx} className="border border-gray-200 rounded-lg p-3 bg-white shadow-sm">
                                      <div className="flex gap-3">
                                        {/* Product Image */}
                                        <div className="flex-shrink-0">
                                          {item.product?.images && item.product.images.length > 0 ? (
                                            <img 
                                              src={item.product.images[0]} 
                                              alt={item.product?.title || 'Product'}
                                              className="w-16 h-16 object-cover rounded border"
                                              onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
                                                (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0yNCAzMkMzNi40MTggMzIgNDYuNSAyMS45MTggNDYuNSA5LjVTMzYuNDE4LTMgMjQtM1MxLjUgNy4wODIgMS41IDE5LjVTMTEuNTgyIDMyIDI0IDMyWiIgZmlsbD0iI0Q5RDlEOSIvPgo8dGV4dCB4PSIzMiIgeT0iNDAiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxMCIgZmlsbD0iIzk5OTk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+Tm8gSW1hZ2U8L3RleHQ+Cjwvc3ZnPg==';
                                              }}
                                            />
                                          ) : (
                                            <div className="w-16 h-16 bg-gray-100 rounded border flex items-center justify-center">
                                              <Package className="w-6 h-6 text-gray-400" />
                                            </div>
                                          )}
                                        </div>
                                        
                                        {/* Product & Transaction Details */}
                                        <div className="flex-1 min-w-0">
                                          <div className="font-bold text-sm text-blue-700 mb-1">
                                            {item.product?.title || "Product Not Available"}
                                          </div>
                                          
                                          {/* Buyer-Product-Seller Relationship */}
                                          <div className="bg-gray-50 p-2 rounded text-xs space-y-1">
                                            <div className="flex items-center gap-1">
                                              <span className="font-medium text-green-600">Buyer:</span>
                                              <span>{buyer?.username || order.customerName || "Unknown"}</span>
                                              <span className="text-gray-500">({buyer?.phone || order.customerPhone || "No phone"})</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                              <span className="font-medium text-blue-600">Product:</span>
                                              <span>{item.product?.title || "Unknown Product"}</span>
                                              <span className="text-gray-500">• Qty: {item.quantity}</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                              <span className="font-medium text-purple-600">Seller:</span>
                                              <span>{sellerName || "Unknown Seller"}</span>
                                              <span className="text-gray-500">({sellerPhone || "No phone"})</span>
                                            </div>
                                          </div>
                                          
                                          <div className="text-xs text-purple-600 font-medium mt-2">
                                            Price: ₹{parseFloat(item.price || "0").toFixed(2)} each
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })
                              ) : (
                                <div className="border border-yellow-200 rounded-lg p-3 bg-yellow-50">
                                  <div className="text-sm text-yellow-800 font-medium flex items-center gap-2">
                                    <Package className="w-4 h-4" />
                                    No Product Items Available
                                  </div>
                                  <div className="text-xs text-yellow-600 mt-1">
                                    Products may have been deleted or are unavailable
                                  </div>
                                  <div className="mt-2 text-xs space-y-1">
                                    <div><strong>Order Total:</strong> ₹{parseFloat(order.totalAmount || "0").toFixed(2)}</div>
                                    <div><strong>Order ID:</strong> {order.id} • <strong>Status:</strong> {order.status}</div>
                                    <div><strong>Payment Method:</strong> {order.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Online Payment'}</div>
                                  </div>
                                </div>
                              )}
                              {(order.items?.length || 0) > 2 && (
                                <div className="text-xs text-blue-600 font-medium text-center py-1 bg-blue-50 rounded">
                                  +{(order.items?.length || 0) - 2} more items in this order
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="p-3">
                            <div className="space-y-1">
                              <div className="font-bold text-lg flex items-center gap-1">
                                <DollarSign className="h-4 w-4" />
                                ₹{parseFloat(order.totalAmount || "0").toFixed(2)}
                              </div>
                              <div className="text-xs text-gray-500">
                                Fee: ₹{parseFloat(order.commission || "0").toFixed(2)}
                              </div>
                            </div>
                          </td>
                          <td className="p-3">
                            {getStatusBadge(order.status, order.paymentMethod)}
                          </td>
                          <td className="p-3">
                            <div className="flex flex-col gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => copyOrderDetails(order)}
                                className="flex items-center gap-1"
                              >
                                <Copy className="h-3 w-3" />
                                Copy Details
                              </Button>
                              {order.items?.map((item: OrderItem, idx: number) => {
                                const seller = users.find((u: User) => u.id === item.product?.sellerId);
                                return (
                                  <Button
                                    key={idx}
                                    size="sm"
                                    onClick={() => {
                                      const sms = generateSmsTemplate(order, seller?.username, item.product?.title);
                                      copyToClipboard(sms);
                                    }}
                                    className="flex items-center gap-1 bg-green-600 hover:bg-green-700"
                                  >
                                    <MessageSquare className="h-3 w-3" />
                                    SMS Seller
                                  </Button>
                                );
                              })}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            }
            mobileTable={
              <div className="space-y-4">
                {filteredOrders.map((order: Order) => {
                  const buyer = order.buyer || users.find((u: User) => u.id === order.userId);
                  
                  return (
                    <Card key={order.id} className="border-l-4 border-l-blue-500">
                      <CardContent className="p-4 space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-bold text-blue-600">
                              TXN-{order.id.toString().padStart(6, '0')}
                            </div>
                            <div className="text-sm text-gray-500">
                              {new Date(order.createdAt).toLocaleDateString('en-IN')}
                            </div>
                          </div>
                          {getStatusBadge(order.status, order.paymentMethod)}
                        </div>
                        
                        <div className="space-y-2">
                          <div>
                            <div className="text-sm font-medium text-gray-700">Buyer</div>
                            <div className="text-sm text-green-600">
                              {buyer?.username || order.customerName || "Unknown"}
                            </div>
                            <div className="text-xs text-gray-500">
                              {buyer?.phone || order.customerPhone || "N/A"}
                            </div>
                          </div>
                          
                          <div>
                            <div className="text-sm font-medium text-gray-700 mb-2">Product & Seller Details</div>
                            {order.items && order.items.length > 0 ? (
                              order.items.map((item: OrderItem, idx: number) => {
                                const seller = users.find((u: User) => u.id === item.product?.sellerId);
                                const buyer = order.buyer || users.find((u: User) => u.id === order.userId);
                                return (
                                  <div key={idx} className="border border-gray-200 rounded p-2 mb-2 bg-gray-50">
                                    <div className="flex gap-2">
                                      {item.product?.images && item.product.images.length > 0 ? (
                                        <img 
                                          src={item.product.images[0]} 
                                          alt={item.product?.title || 'Product'}
                                          className="w-12 h-12 object-cover rounded"
                                          onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
                                            (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCA0OCA0OCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQ4IiBoZWlnaHQ9IjQ4IiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xOCAyNEMyNi44MzY2IDI0IDM0IDIwLjQxODMgMzQgMTZTMjYuODM2NiA4IDE4IDhTMiAxMS41ODE3IDIgMTZTOS4xNjM0NCAyNCAxOCAyNFoiIGZpbGw9IiNEOUQ5RDkiLz4KPHN2Zz4K';
                                          }}
                                        />
                                      ) : (
                                        <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center">
                                          <Package className="w-4 h-4 text-gray-400" />
                                        </div>
                                      )}
                                      <div className="flex-1">
                                        <div className="font-medium text-sm">{item.product?.title || "Unknown Product"}</div>
                                        <div className="text-xs text-gray-600 space-y-1">
                                          <div>Buyer: {buyer?.username || order.customerName || "Unknown"}</div>
                                          <div>Seller: {seller?.username || "Unknown"}</div>
                                          <div>Qty: {item.quantity} • ₹{parseFloat(item.price || "0").toFixed(2)}</div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })
                            ) : (
                              <div className="text-sm text-yellow-600 bg-yellow-50 p-2 rounded">
                                No product items available for this order
                              </div>
                            )}
                          </div>
                          
                          <div>
                            <div className="text-sm font-medium text-gray-700">Payment</div>
                            <div className="font-bold">₹{parseFloat(order.totalAmount || "0").toFixed(2)}</div>
                          </div>
                        </div>
                        
                        <div className="flex gap-2 pt-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => copyOrderDetails(order)}
                            className="flex-1"
                          >
                            <Copy className="h-3 w-3 mr-1" />
                            Copy Details
                          </Button>
                          {order.items?.[0] && (
                            <Button
                              size="sm"
                              onClick={() => {
                                const seller = users.find((u: User) => u.id === order.items?.[0]?.product?.sellerId);
                                const sms = generateSmsTemplate(order, seller?.username, order.items?.[0]?.product?.title);
                                copyToClipboard(sms);
                              }}
                              className="flex-1 bg-green-600 hover:bg-green-700"
                            >
                              <MessageSquare className="h-3 w-3 mr-1" />
                              SMS Seller
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            }
          />
          
          {filteredOrders.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No orders found matching your criteria.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}