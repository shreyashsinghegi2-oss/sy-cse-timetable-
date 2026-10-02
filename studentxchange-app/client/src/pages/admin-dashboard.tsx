import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MARKETPLACE_ADMIN_EMAILS } from "@/config/constants";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ResponsiveTable, MobileTable, MobileRow, MobileField } from "@/components/ui/mobile-optimized-table";
import OrderManagement from "@/components/admin/order-management";
import BuyerRequestsManagement from "@/components/admin/buyer-requests-management";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSimpleToast } from "@/hooks/use-simple-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import { 
  Users, 
  Package, 
  ShoppingBag, 
  IndianRupee, 
  TrendingUp, 
  AlertCircle,
  CheckCircle,
  XCircle,
  Eye,
  Edit,
  Trash2,
  RotateCcw
} from "lucide-react";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { User, Product, Order } from "@shared/schema";
import NotificationPanel from "@/components/notifications/notification-panel";

interface AdminStats {
  totalUsers: number;
  totalProducts: number;
  totalOrders: number;
  totalRevenue: number;
  platformFees: number;
  pendingOrders: number;
  completedOrders: number;
}

interface OrderWithItems extends Order {
  customerName: string | null;
  customerPhone: string | null;
  buyer: {
    id: string;
    name: string;
    email: string;
    phone: string;
  };
  items: Array<{
    id: number;
    productId: number;
    quantity: number;
    price: number;
    product: {
      id?: number;
      title: string;
      category: string;
      description?: string;
      originalPrice?: number;
      originalQuantity?: number;
      sellerId?: number;
      sellerName?: string;
      sellerEmail?: string;
      sellerPhone?: string;
    };
  }>;
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const { toast } = useSimpleToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [orderFilter, setOrderFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [sellerFilter, setSellerFilter] = useState("all");
  const [buyerFilter, setBuyerFilter] = useState("all");

  const ADMIN_EMAILS = new Set([...MARKETPLACE_ADMIN_EMAILS, 'admin@studentxchange.in']);
  const isAdmin = ADMIN_EMAILS.has(user?.email?.toLowerCase() ?? '');

  // Fetch admin statistics — staleTime:0 forces a fresh fetch every mount
  const { data: stats } = useQuery<AdminStats>({
    queryKey: ['/api/admin/stats'],
    enabled: isAdmin,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: true,
  });

  // Fetch all users
  const { data: _usersRaw } = useQuery<User[]>({
    queryKey: ['/api/admin/users'],
    enabled: isAdmin,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: true,
  });
  const users = _usersRaw ?? [];

  // Fetch all products
  const { data: _productsRaw } = useQuery<Product[]>({
    queryKey: ['/api/admin/products'],
    enabled: isAdmin,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: true,
  });
  const products = _productsRaw ?? [];

  // Fetch all orders
  const { data: _ordersRaw } = useQuery<OrderWithItems[]>({
    queryKey: ['/api/admin/orders'],
    enabled: isAdmin,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: true,
  });
  const orders = _ordersRaw ?? [];

  // Update order status mutation
  const updateOrderMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: number; status: string }) => {
      return await apiRequest("PUT", `/api/orders/${orderId}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/orders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
      toast({
        title: "Order Updated",
        description: "Order status has been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update order status.",
        variant: "destructive",
      });
    },
  });

  // Reset revenue mutation
  const resetRevenueMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/admin/reset-revenue");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/orders'] });
      toast({
        title: "Revenue Reset",
        description: "Platform fees have been reset to ₹0.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to reset revenue.",
        variant: "destructive",
      });
    },
  });

  // Delete product mutation
  const deleteProductMutation = useMutation({
    mutationFn: async (productId: number) => {
      await apiRequest("DELETE", `/api/admin/products/${productId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/products'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/products'] }); // Invalidate browse page
      toast({
        title: "Product Deleted",
        description: "Product has been deleted successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete product.",
        variant: "destructive",
      });
    },
  });

  // Delete order mutation
  const deleteOrderMutation = useMutation({
    mutationFn: async (orderId: number) => {
      return await apiRequest("DELETE", `/api/admin/orders/${orderId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/orders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/revenue'] });
      toast({
        title: "Transaction Deleted",
        description: "Transaction has been deleted successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete transaction.",
        variant: "destructive",
      });
    },
  });

  // Fetch current revenue
  const { data: revenueData } = useQuery({
    queryKey: ['/api/admin/revenue'],
    enabled: isAdmin,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: true,
  });



  if (!isAdmin) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-grow flex items-center justify-center">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center text-red-600">
                <AlertCircle className="h-5 w-5 mr-2" />
                Access Denied
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                You don't have permission to access the admin dashboard.
              </p>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  // Get unique sellers and buyers for filter dropdowns
  const uniqueSellers = Array.from(new Set(
    orders.flatMap(order => 
      order.items?.map(item => ({
        id: item.product?.sellerId,
        name: item.product?.sellerName,
        email: item.product?.sellerEmail
      })) || []
    ).filter(seller => seller.id)
  ));

  const uniqueBuyers = Array.from(new Set(
    orders.map(order => ({
      id: order.buyer?.id || order.userId,
      name: order.buyer?.name || "Unknown",
      email: order.buyer?.email || "N/A"
    }))
  ));

  // Filter orders based on search and filter criteria
  const filteredOrders = orders.filter(order => {
    const buyer = order.buyer || users.find(u => u.id === order.userId);
    const orderMatches = order.id.toString().includes(searchTerm) ||
                        buyer?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        buyer?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        order.items?.some(item => 
                          item.product?.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.product?.sellerName?.toLowerCase().includes(searchTerm.toLowerCase())
                        );
    
    const statusMatches = orderFilter === "all" || order.status === orderFilter;
    const sellerMatches = sellerFilter === "all" || order.items?.some(item => 
      item.product?.sellerId?.toString() === sellerFilter
    );
    const buyerMatches = buyerFilter === "all" || order.buyer?.id?.toString() === buyerFilter || order.userId?.toString() === buyerFilter;
    
    // Date filtering
    const dateMatches = dateFilter === "all" || (() => {
      const orderDate = new Date(order.createdAt);
      const now = new Date();
      
      switch (dateFilter) {
        case "today":
          return orderDate.toDateString() === now.toDateString();
        case "week":
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          return orderDate >= weekAgo;
        case "month":
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          return orderDate >= monthAgo;
        default:
          return true;
      }
    })();
    
    return orderMatches && statusMatches && sellerMatches && buyerMatches && dateMatches;
  });

  // Filter products based on search term and status
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.category.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (orderFilter === "all") return matchesSearch;
    
    const productOrder = orders.find(order => 
      order.items?.some(item => item.productId === product.id)
    );
    
    if (orderFilter === "sold") return matchesSearch && productOrder;
    if (orderFilter === "available") return matchesSearch && !productOrder;
    
    return matchesSearch;
  });

  const getStatusBadge = (status: string) => {
    const baseClasses = "px-2 py-1 text-xs font-medium rounded-full";
    switch (status) {
      case "pending":
        return <span className={`${baseClasses} bg-yellow-100 text-yellow-800`}>Pending</span>;
      case "pending_cod":
        return <span className={`${baseClasses} bg-blue-100 text-blue-800`}>Pending COD</span>;
      case "completed":
        return <span className={`${baseClasses} bg-green-100 text-green-800`}>Completed</span>;
      case "cancelled":
        return <span className={`${baseClasses} bg-red-100 text-red-800`}>Cancelled</span>;
      default:
        return <span className={`${baseClasses} bg-gray-100 text-gray-800`}>{status}</span>;
    }
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <div className="text-center">
          <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600">You don't have permission to access the admin dashboard.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-grow py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-gray-600 mt-2">Manage your StudentXchange platform</p>
          </div>
          
          {/* Admin Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.totalUsers || users.length}</div>
                <p className="text-xs text-muted-foreground">
                  +{users.filter(u => new Date(u.createdAt).toDateString() === new Date().toDateString()).length} today
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Products</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.totalProducts || products.length}</div>
                <p className="text-xs text-muted-foreground">
                  {products.filter(p => p.quantity && parseInt(p.quantity.toString()) > 0).length} available
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                <ShoppingBag className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.totalOrders || orders.length}</div>
                <p className="text-xs text-muted-foreground">
                  {orders.filter(o => o.status === 'pending').length} pending
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Platform Revenue</CardTitle>
                <div className="flex items-center gap-2">
                  <IndianRupee className="h-4 w-4 text-muted-foreground" />
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" className="h-6 w-6 p-0">
                        <RotateCcw className="h-3 w-3" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Reset Revenue to ₹0</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will reset all platform fees to ₹0 but preserve transaction records for history. 
                          This action cannot be undone. Are you sure you want to continue?
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => resetRevenueMutation.mutate()}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          Reset Revenue
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">₹{stats?.platformFees?.toFixed(2) || '0.00'}</div>
                <p className="text-xs text-muted-foreground">
                  From {orders.filter(o => o.status === 'completed').length} completed orders
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Notification Panel */}
          <div className="mb-8">
            <NotificationPanel />
          </div>

          {/* Main Content Tabs */}
          <Tabs defaultValue="orders" className="space-y-6">
            <TabsList className="grid w-full grid-cols-7">
              <TabsTrigger value="orders">New Orders</TabsTrigger>
              <TabsTrigger value="transactions">Transactions</TabsTrigger>
              <TabsTrigger value="products">Products</TabsTrigger>
              <TabsTrigger value="requests">Buyer Requests</TabsTrigger>
              <TabsTrigger value="sellers">Sellers</TabsTrigger>
              <TabsTrigger value="buyers">Buyers</TabsTrigger>
              <TabsTrigger value="users">All Users</TabsTrigger>
            </TabsList>

            {/* New Orders Management Tab */}
            <TabsContent value="orders">
              <OrderManagement />
            </TabsContent>

            {/* Comprehensive Transactions Tab */}
            <TabsContent value="transactions">
              <Card>
                <CardHeader>
                  <CardTitle>All Transactions - Seller to Buyer</CardTitle>
                  <CardDescription>
                    Complete transaction history showing all seller-buyer interactions with payment details
                  </CardDescription>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    <Input
                      placeholder="Search by seller, buyer, or product..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full"
                    />
                    <Select value={orderFilter} onValueChange={setOrderFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Filter by status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="pending_cod">Pending COD</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={dateFilter} onValueChange={setDateFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Filter by date" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Time</SelectItem>
                        <SelectItem value="today">Today</SelectItem>
                        <SelectItem value="week">Past Week</SelectItem>
                        <SelectItem value="month">Past Month</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={sellerFilter} onValueChange={setSellerFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Filter by seller" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Sellers</SelectItem>
                        {uniqueSellers.map((seller) => (
                          <SelectItem key={seller.id} value={seller.id?.toString() || ""}>
                            {seller.name || seller.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={buyerFilter} onValueChange={setBuyerFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Filter by buyer" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Buyers</SelectItem>
                        {uniqueBuyers.map((buyer) => (
                          <SelectItem key={buyer.id} value={buyer.id?.toString() || ""}>
                            {buyer.name || buyer.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardHeader>
                <CardContent>
                  <ResponsiveTable
                    desktopTable={
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Transaction ID</TableHead>
                              <TableHead>Date & Time</TableHead>
                              <TableHead>Seller Details</TableHead>
                              <TableHead>Buyer Details</TableHead>
                              <TableHead>Product(s)</TableHead>
                              <TableHead>Amount (₹)</TableHead>
                              <TableHead>Platform Fee (₹)</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredOrders.map((order) => {
                              const buyer = users.find(u => u.id === order.userId);
                              const totalProducts = order.items?.length || 0;
                              const sellerIds = Array.from(new Set(order.items?.map(item => {
                                const product = products.find(p => p.id === item.productId);
                                return product?.sellerId;
                              }).filter(Boolean)));
                              const sellers = sellerIds.map(id => users.find(u => u.id === id)).filter(Boolean);
                              
                              return (
                                <TableRow key={order.id}>
                                  <TableCell className="font-medium">
                                    TXN-{order.id.toString().padStart(6, '0')}
                                  </TableCell>
                                  <TableCell>
                                    <div className="text-sm">
                                      <div className="font-medium">
                                        {new Date(order.createdAt).toLocaleDateString('en-IN')}
                                      </div>
                                      <div className="text-gray-500">
                                        {new Date(order.createdAt).toLocaleTimeString('en-IN')}
                                      </div>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <div className="space-y-1">
                                      {order.items?.map((item, idx) => (
                                        <div key={idx} className="text-sm border-b pb-1 last:border-b-0">
                                          <div className="font-medium text-blue-600">{item.product?.sellerName || "Unknown"}</div>
                                          <div className="text-gray-500 text-xs">{item.product?.sellerEmail || "N/A"}</div>
                                          <div className="text-gray-500 text-xs">{item.product?.sellerPhone || "N/A"}</div>
                                          <div className="text-gray-400 text-xs">Product: {item.product?.title}</div>
                                        </div>
                                      ))}
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <div className="text-sm">
                                      <div className="font-medium text-green-600">{order.buyer?.name || buyer?.username || "Unknown"}</div>
                                      <div className="text-gray-500">{order.buyer?.email || buyer?.email || "N/A"}</div>
                                      <div className="text-gray-500">{order.buyer?.phone || buyer?.phone || "N/A"}</div>
                                      {order.customerName && (
                                        <div className="text-gray-400 text-xs">Alt: {order.customerName}</div>
                                      )}
                                      {order.customerPhone && (
                                        <div className="text-gray-400 text-xs">Alt Phone: {order.customerPhone}</div>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <div className="space-y-1">
                                      {order.items?.slice(0, 2).map((item, idx) => (
                                        <div key={idx} className="text-sm">
                                          <div className="font-medium">{item.product?.title}</div>
                                          <div className="text-gray-500">Qty: {item.quantity} × ₹{item.price}</div>
                                        </div>
                                      ))}
                                      {totalProducts > 2 && (
                                        <div className="text-xs text-gray-500">+{totalProducts - 2} more items</div>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <div className="text-sm">
                                      <div className="font-bold text-lg">₹{parseFloat(order.totalAmount?.toString() || "0").toFixed(2)}</div>
                                      <div className="text-gray-500">Total paid</div>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <div className="text-sm">
                                      <div className="font-medium text-green-600">₹{parseFloat(order.commission?.toString() || "0").toFixed(2)}</div>
                                      <div className="text-gray-500">Platform earning</div>
                                    </div>
                                  </TableCell>
                                  <TableCell>{getStatusBadge(order.status)}</TableCell>
                                  <TableCell>
                                    <div className="flex space-x-2">
                                      <Select
                                        value={order.status}
                                        onValueChange={(status) =>
                                          updateOrderMutation.mutate({ orderId: order.id, status })
                                        }
                                      >
                                        <SelectTrigger className="w-32">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="pending">Pending</SelectItem>
                                          <SelectItem value="pending_cod">Pending COD</SelectItem>
                                          <SelectItem value="completed">Completed</SelectItem>
                                          <SelectItem value="cancelled">Cancelled</SelectItem>
                                        </SelectContent>
                                      </Select>
                                      <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                          <Button variant="outline" size="sm">
                                            <Trash2 className="h-4 w-4" />
                                          </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                          <AlertDialogHeader>
                                            <AlertDialogTitle>Delete Transaction</AlertDialogTitle>
                                            <AlertDialogDescription>
                                              This will permanently delete transaction TXN-{order.id.toString().padStart(6, '0')} and remove ₹{parseFloat(order.commission?.toString() || "0").toFixed(2)} from your revenue. This action cannot be undone.
                                            </AlertDialogDescription>
                                          </AlertDialogHeader>
                                          <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction
                                              onClick={() => deleteOrderMutation.mutate(order.id)}
                                              className="bg-red-600 hover:bg-red-700"
                                            >
                                              Delete Transaction
                                            </AlertDialogAction>
                                          </AlertDialogFooter>
                                        </AlertDialogContent>
                                      </AlertDialog>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    }
                    mobileTable={
                      <MobileTable>
                        {filteredOrders.map((order) => {
                          const buyer = users.find(u => u.id === order.userId);
                          const sellerIds = Array.from(new Set(order.items?.map(item => {
                            const product = products.find(p => p.id === item.productId);
                            return product?.sellerId;
                          }).filter(Boolean)));
                          const sellers = sellerIds.map(id => users.find(u => u.id === id)).filter(Boolean);
                          
                          return (
                            <MobileRow key={order.id}>
                              <MobileField label="Transaction">{`TXN-${order.id.toString().padStart(6, '0')}`}</MobileField>
                              <MobileField label="Date">
                                {`${new Date(order.createdAt).toLocaleDateString('en-IN')} ${new Date(order.createdAt).toLocaleTimeString('en-IN')}`}
                              </MobileField>
                              <MobileField label="Sellers">
                                {sellers.map(s => `${s?.username} (${s?.phone})`).join(', ')}
                              </MobileField>
                              <MobileField label="Buyer">
                                {`${buyer?.username} (${buyer?.phone})`}
                              </MobileField>
                              <MobileField label="Amount">
                                {`₹${parseFloat(order.totalAmount?.toString() || "0").toFixed(2)}`}
                              </MobileField>
                              <MobileField label="Platform Fee">
                                {`₹${parseFloat(order.commission?.toString() || "0").toFixed(2)}`}
                              </MobileField>
                              <MobileField label="Status">{getStatusBadge(order.status)}</MobileField>
                              <MobileField label="Actions">
                                <Select
                                  value={order.status}
                                  onValueChange={(status) =>
                                    updateOrderMutation.mutate({ orderId: order.id, status })
                                  }
                                >
                                  <SelectTrigger className="w-32">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="pending">Pending</SelectItem>
                                    <SelectItem value="pending_cod">Pending COD</SelectItem>
                                    <SelectItem value="completed">Completed</SelectItem>
                                    <SelectItem value="cancelled">Cancelled</SelectItem>
                                  </SelectContent>
                                </Select>
                              </MobileField>
                            </MobileRow>
                          );
                        })}
                      </MobileTable>
                    }
                  />
                </CardContent>
              </Card>
            </TabsContent>

            {/* Products with Seller/Buyer Details Tab */}
            <TabsContent value="orders">
              <Card>
                <CardHeader>
                  <CardTitle>Product Listings - Seller & Buyer Details</CardTitle>
                  <CardDescription>
                    Complete overview of all product listings with seller and buyer information
                  </CardDescription>
                  <div className="flex items-center space-x-4">
                    <Input
                      placeholder="Search products..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="max-w-sm"
                    />
                    <Select value={orderFilter} onValueChange={setOrderFilter}>
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Filter by status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Products</SelectItem>
                        <SelectItem value="available">Available</SelectItem>
                        <SelectItem value="sold">Sold</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardHeader>
                <CardContent>
                  <ResponsiveTable
                    desktopTable={
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-32">Image</TableHead>
                              <TableHead>Product Title</TableHead>
                              <TableHead>Price (₹)</TableHead>
                              <TableHead>Seller Details</TableHead>
                              <TableHead>Seller Address</TableHead>
                              <TableHead>Buyer Details</TableHead>
                              <TableHead>Upload Date</TableHead>
                              <TableHead>Purchase Date</TableHead>
                              <TableHead>Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredProducts.map((product) => {
                              const productOrder = orders.find(order => 
                                order.items?.some(item => item.productId === product.id)
                              );
                              const buyer = productOrder ? users.find(u => u.id === productOrder.userId) : null;
                              const seller = users.find(u => u.id === product.sellerId);
                              
                              return (
                                <TableRow key={product.id}>
                                  <TableCell>
                                    <div className="w-20 h-20 relative">
                                      {product.images && product.images.length > 0 ? (
                                        <img
                                          src={product.images[0].startsWith('http') ? product.images[0] : `/uploads/${product.images[0]}`}
                                          alt={product.title}
                                          className="w-full h-full object-cover rounded-lg border border-gray-200"
                                          onError={(e) => {
                                            const target = e.target as HTMLImageElement;
                                            target.src = `https://images.unsplash.com/photo-1546198632-9ef6368bef12?w=400&h=400&fit=crop`;
                                          }}
                                        />
                                      ) : (
                                        <div className="w-full h-full bg-gray-100 rounded-lg flex items-center justify-center">
                                          <Package className="h-8 w-8 text-gray-400" />
                                        </div>
                                      )}
                                      {product.images && product.images.length > 1 && (
                                        <div className="absolute top-1 right-1 bg-black bg-opacity-75 text-white text-xs px-1 rounded">
                                          +{product.images.length - 1}
                                        </div>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <div>
                                      <p className="font-medium text-sm">{product.title}</p>
                                      <p className="text-xs text-gray-500">{product.category}</p>
                                      <p className="text-xs text-gray-400">ID: {product.id}</p>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <div>
                                      <p className="font-medium">₹{product.price}</p>
                                      {product.originalPrice && (
                                        <p className="text-xs text-gray-500 line-through">₹{product.originalPrice}</p>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <div className="space-y-1">
                                      <p className="font-medium text-sm">{seller?.username || 'Unknown Seller'}</p>
                                      <p className="text-xs text-gray-600">{seller?.email || 'No email'}</p>
                                      <p className="text-xs text-gray-500">ID: {product.sellerId}</p>
                                      {seller?.phone && (
                                        <p className="text-xs text-blue-600">{seller.phone}</p>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <div className="space-y-1 max-w-48">
                                      {product.pickupAddressType === 'university' && product.pickupInstitution ? (
                                        <div className="bg-blue-50 p-2 rounded-lg">
                                          <p className="text-xs font-medium text-blue-800">📍 Institution</p>
                                          <p className="text-xs text-blue-700">{product.pickupInstitution}</p>
                                        </div>
                                      ) : product.pickupAddress ? (
                                        <div className="bg-gray-50 p-2 rounded-lg">
                                          <p className="text-xs font-medium text-gray-800">📍 Address</p>
                                          <p className="text-xs text-gray-700">{product.pickupAddress}</p>
                                          {product.pickupCity && (
                                            <p className="text-xs text-gray-600">
                                              {product.pickupCity}{product.pickupState && `, ${product.pickupState}`}{product.pickupPincode && ` - ${product.pickupPincode}`}
                                            </p>
                                          )}
                                        </div>
                                      ) : (
                                        <div className="text-center">
                                          <p className="text-xs text-gray-400">No address provided</p>
                                        </div>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    {buyer ? (
                                      <div className="space-y-1">
                                        <p className="font-medium text-sm text-green-700">{buyer.username}</p>
                                        <p className="text-xs text-gray-600">{buyer.email}</p>
                                        <p className="text-xs text-gray-500">ID: {buyer.id}</p>
                                        {buyer.phone && (
                                          <p className="text-xs text-blue-600">{buyer.phone}</p>
                                        )}
                                      </div>
                                    ) : (
                                      <div className="text-center">
                                        <p className="text-xs text-gray-400">Not sold yet</p>
                                        <div className="inline-flex items-center px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                                          Available
                                        </div>
                                      </div>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    <p className="text-xs text-gray-600">
                                      {new Date(product.createdAt).toLocaleDateString()}
                                    </p>
                                    <p className="text-xs text-gray-400">
                                      {new Date(product.createdAt).toLocaleTimeString()}
                                    </p>
                                  </TableCell>
                                  <TableCell>
                                    {productOrder ? (
                                      <div>
                                        <p className="text-xs text-gray-600">
                                          {new Date(productOrder.createdAt).toLocaleDateString()}
                                        </p>
                                        <p className="text-xs text-gray-400">
                                          {new Date(productOrder.createdAt).toLocaleTimeString()}
                                        </p>
                                        <div className="mt-1">
                                          {getStatusBadge(productOrder.status)}
                                        </div>
                                      </div>
                                    ) : (
                                      <p className="text-xs text-gray-400">-</p>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex space-x-1">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => window.open(`/product/${product.id}`, '_blank')}
                                      >
                                        <Eye className="h-3 w-3" />
                                      </Button>
                                      <Button
                                        variant="destructive"
                                        size="sm"
                                        onClick={() => {
                                          if (confirm(`Delete "${product.title}"? This action cannot be undone.`)) {
                                            deleteProductMutation.mutate(product.id);
                                          }
                                        }}
                                        disabled={deleteProductMutation.isPending}
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    }
                    mobileTable={
                      <MobileTable>
                        {filteredProducts.map((product) => {
                          const productOrder = orders.find(order => 
                            order.items?.some(item => item.productId === product.id)
                          );
                          const buyer = productOrder ? users.find(u => u.id === productOrder.userId) : null;
                          const seller = users.find(u => u.id === product.sellerId);
                          
                          return (
                            <MobileRow key={product.id}>
                              <div className="flex items-start space-x-3 mb-3">
                                <div className="w-16 h-16 relative flex-shrink-0">
                                  {product.images && product.images.length > 0 ? (
                                    <img
                                      src={product.images[0].startsWith('http') ? product.images[0] : `/uploads/${product.images[0]}`}
                                      alt={product.title}
                                      className="w-full h-full object-cover rounded-lg border border-gray-200"
                                      onError={(e) => {
                                        const target = e.target as HTMLImageElement;
                                        target.src = `https://images.unsplash.com/photo-1546198632-9ef6368bef12?w=400&h=400&fit=crop`;
                                      }}
                                    />
                                  ) : (
                                    <div className="w-full h-full bg-gray-100 rounded-lg flex items-center justify-center">
                                      <Package className="h-6 w-6 text-gray-400" />
                                    </div>
                                  )}
                                  {product.images && product.images.length > 1 && (
                                    <div className="absolute top-0 right-0 bg-black bg-opacity-75 text-white text-xs px-1 rounded">
                                      +{product.images.length - 1}
                                    </div>
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h3 className="font-medium text-sm text-gray-900 truncate">{product.title}</h3>
                                  <p className="text-xs text-gray-500">{product.category}</p>
                                  <p className="text-lg font-bold text-gray-900 mt-1">₹{product.price}</p>
                                </div>
                              </div>
                              
                              <MobileField label="Seller">
                                <div>
                                  <p className="font-medium">{seller?.username || 'Unknown'}</p>
                                  <p className="text-xs text-gray-500">{seller?.email || 'No email'}</p>
                                  {seller?.phone && (
                                    <p className="text-xs text-blue-600">{seller.phone}</p>
                                  )}
                                </div>
                              </MobileField>
                              
                              <MobileField label="Seller Address">
                                <div className="max-w-56">
                                  {product.pickupAddressType === 'university' && product.pickupInstitution ? (
                                    <div className="bg-blue-50 p-2 rounded-lg">
                                      <p className="text-xs font-medium text-blue-800">📍 Institution</p>
                                      <p className="text-xs text-blue-700">{product.pickupInstitution}</p>
                                    </div>
                                  ) : product.pickupAddress ? (
                                    <div className="bg-gray-50 p-2 rounded-lg">
                                      <p className="text-xs font-medium text-gray-800">📍 Address</p>
                                      <p className="text-xs text-gray-700">{product.pickupAddress}</p>
                                      {product.pickupCity && (
                                        <p className="text-xs text-gray-600">
                                          {product.pickupCity}{product.pickupState && `, ${product.pickupState}`}{product.pickupPincode && ` - ${product.pickupPincode}`}
                                        </p>
                                      )}
                                    </div>
                                  ) : (
                                    <p className="text-xs text-gray-400">No address provided</p>
                                  )}
                                </div>
                              </MobileField>
                              
                              <MobileField label="Buyer">
                                {buyer ? (
                                  <div>
                                    <p className="font-medium text-green-700">{buyer.username}</p>
                                    <p className="text-xs text-gray-500">{buyer.email}</p>
                                    {buyer.phone && (
                                      <p className="text-xs text-blue-600">{buyer.phone}</p>
                                    )}
                                  </div>
                                ) : (
                                  <div className="inline-flex items-center px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                                    Available
                                  </div>
                                )}
                              </MobileField>
                              
                              <MobileField label="Upload Date">
                                <div>
                                  <p className="text-xs">{new Date(product.createdAt).toLocaleDateString()}</p>
                                  <p className="text-xs text-gray-400">{new Date(product.createdAt).toLocaleTimeString()}</p>
                                </div>
                              </MobileField>
                              
                              {productOrder && (
                                <MobileField label="Purchase Date">
                                  <div>
                                    <p className="text-xs">{new Date(productOrder.createdAt).toLocaleDateString()}</p>
                                    <p className="text-xs text-gray-400">{new Date(productOrder.createdAt).toLocaleTimeString()}</p>
                                    <div className="mt-1">{getStatusBadge(productOrder.status)}</div>
                                  </div>
                                </MobileField>
                              )}
                              
                              <div className="flex space-x-2 pt-2 border-t border-gray-100">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => window.open(`/product/${product.id}`, '_blank')}
                                  className="flex-1"
                                >
                                  <Eye className="h-3 w-3 mr-1" />
                                  View
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => {
                                    if (confirm(`Delete "${product.title}"? This action cannot be undone.`)) {
                                      deleteProductMutation.mutate(product.id);
                                    }
                                  }}
                                  disabled={deleteProductMutation.isPending}
                                  className="flex-1"
                                >
                                  <Trash2 className="h-3 w-3 mr-1" />
                                  Delete
                                </Button>
                              </div>
                            </MobileRow>
                          );
                        })}
                      </MobileTable>
                    }
                  />
                </CardContent>
              </Card>
            </TabsContent>

            {/* Orders Tab */}
            <TabsContent value="products">
              <Card>
                <CardHeader>
                  <CardTitle>Order Management</CardTitle>
                  <CardDescription>
                    View and manage all orders on the platform
                  </CardDescription>
                  <div className="flex items-center space-x-4">
                    <Select value={orderFilter} onValueChange={setOrderFilter}>
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Filter by status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Orders</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="pending_cod">Pending COD</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Order ID</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Items</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredOrders.map((order) => (
                        <TableRow key={order.id}>
                          <TableCell className="font-medium">#{order.id}</TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <div>{order.customerName || "N/A"}</div>
                              <div className="text-gray-500">{order.customerPhone || "N/A"}</div>
                            </div>
                          </TableCell>
                          <TableCell>{order.items?.length || 0} items</TableCell>
                          <TableCell>₹{Number(order.totalAmount).toFixed(2)}</TableCell>
                          <TableCell>{getStatusBadge(order.status)}</TableCell>
                          <TableCell>{new Date(order.createdAt).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <Select
                                value={order.status}
                                onValueChange={(status) => 
                                  updateOrderMutation.mutate({ orderId: order.id, status })
                                }
                              >
                                <SelectTrigger className="w-32">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="pending">Pending</SelectItem>
                                  <SelectItem value="pending_cod">Pending COD</SelectItem>
                                  <SelectItem value="completed">Completed</SelectItem>
                                  <SelectItem value="cancelled">Cancelled</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Products Tab */}
            <TabsContent value="products">
              <Card>
                <CardHeader>
                  <CardTitle>Product Management</CardTitle>
                  <CardDescription>
                    View and manage all products on the platform
                  </CardDescription>
                  <div className="flex items-center space-x-4">
                    <Input
                      placeholder="Search products..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="max-w-sm"
                    />
                  </div>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product Image & Details</TableHead>
                        <TableHead>Price & Stock</TableHead>
                        <TableHead>Seller</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredProducts.map((product) => {
                        const seller = users.find(u => u.id === product.sellerId);
                        const status = product.quantity > 0 ? 'Available' : 'Out of Stock';
                        
                        return (
                          <TableRow key={product.id}>
                            <TableCell>
                              <div className="flex gap-3 items-start">
                                {/* Product Image */}
                                <div className="flex-shrink-0">
                                  {product.images && product.images.length > 0 ? (
                                    <img 
                                      src={product.images[0].startsWith('http') ? product.images[0] : `/uploads/${product.images[0]}`}
                                      alt={product.title}
                                      className="w-16 h-16 object-cover rounded-lg border"
                                      onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
                                        (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0yNCAzMkMzNi40MTggMzIgNDYuNSAyMS45MTggNDYuNSA5LjVTMzYuNDE4LTMgMjQtM1MxLjUgNy4wODIgMS41IDE5LjVTMTEuNTgyIDMyIDI0IDMyWiIgZmlsbD0iI0Q5RDlEOSIvPgo8dGV4dCB4PSIzMiIgeT0iNDAiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxMCIgZmlsbD0iIzk5OTk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+Tm8gSW1hZ2U8L3RleHQ+Cjwvc3ZnPg==';
                                      }}
                                    />
                                  ) : (
                                    <div className="w-16 h-16 bg-gray-100 rounded-lg border flex items-center justify-center">
                                      <Package className="w-6 h-6 text-gray-400" />
                                    </div>
                                  )}
                                </div>
                                
                                {/* Product Details */}
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium text-sm mb-1">{product.title}</div>
                                  <div className="text-sm text-gray-500 mb-1">Category: {product.category || 'Uncategorized'}</div>
                                  <div className="text-xs text-gray-400">ID: {product.id}</div>
                                  {product.description && (
                                    <div className="text-xs text-gray-500 mt-1 truncate max-w-xs">
                                      {product.description}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                <div className="font-bold">₹{parseFloat((product.price || 0).toString()).toFixed(2)}</div>
                                <div className="text-sm text-gray-500">Stock: {product.quantity}</div>
                                {product.condition && (
                                  <div className="text-xs text-gray-400">Condition: {product.condition}</div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                <div className="font-medium">{seller?.username || 'Unknown'}</div>
                                <div className="text-sm text-gray-500">{seller?.phone || 'No phone'}</div>
                                <div className="text-xs text-gray-400">{seller?.email || 'No email'}</div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                status === 'Available' 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {status}
                              </span>
                            </TableCell>
                            <TableCell>
                              <Button 
                                variant="destructive" 
                                size="sm"
                                onClick={() => {
                                  if (confirm(`Are you sure you want to delete "${product.title}"? This action cannot be undone.`)) {
                                    deleteProductMutation.mutate(product.id);
                                  }
                                }}
                                disabled={deleteProductMutation.isPending}
                              >
                                {deleteProductMutation.isPending ? "..." : <Trash2 className="h-4 w-4" />}
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Buyer Requests Tab */}
            <TabsContent value="requests">
              <BuyerRequestsManagement />
            </TabsContent>

            {/* Sellers Tab */}
            <TabsContent value="sellers">
              <Card>
                <CardHeader>
                  <CardTitle>Seller Management</CardTitle>
                  <CardDescription>
                    View all sellers, their products, and earnings
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Seller ID</TableHead>
                        <TableHead>Username</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Products</TableHead>
                        <TableHead>Total Earnings</TableHead>
                        <TableHead>Orders Received</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.filter(user => products.some(p => p.sellerId === user.id)).map((seller) => {
                        const sellerProducts = products.filter(p => p.sellerId === seller.id);
                        const sellerOrders = orders.filter(o => 
                          o.items.some(item => sellerProducts.some(p => p.id === item.productId))
                        );
                        const totalEarnings = sellerOrders.reduce((sum, o) => sum + parseFloat(o.totalAmount?.toString() || '0'), 0);
                        
                        return (
                          <TableRow key={seller.id}>
                            <TableCell className="font-medium">#{seller.id}</TableCell>
                            <TableCell>{seller.username}</TableCell>
                            <TableCell>
                              <div className="text-sm">
                                <div>{seller.email}</div>
                                <div className="text-gray-500 font-mono">{seller.phone}</div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                {sellerProducts.slice(0, 3).map(product => (
                                  <div key={product.id} className="text-sm">
                                    {product.title} - ₹{product.price}
                                  </div>
                                ))}
                                {sellerProducts.length > 3 && (
                                  <div className="text-xs text-gray-500">
                                    +{sellerProducts.length - 3} more
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="font-medium">₹{totalEarnings.toFixed(2)}</TableCell>
                            <TableCell>{sellerOrders.length}</TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                <Button variant="outline" size="sm" onClick={() => {
                                  const productDetails = sellerProducts.map(p => 
                                    `• ${p.title} (₹${p.price}) - ${p.condition} - Qty: ${p.quantity}`
                                  ).join('\n');
                                  
                                  alert(`🛍️ SELLER PROFILE\n\n` +
                                    `👤 ${seller.username}\n` +
                                    `📧 ${seller.email}\n` +
                                    `📱 ${seller.phone}\n` +
                                    `📅 Joined: ${new Date(seller.createdAt).toLocaleDateString()}\n\n` +
                                    `📦 PRODUCTS (${sellerProducts.length}):\n${productDetails || 'None'}\n\n` +
                                    `💰 Total Earnings: ₹${totalEarnings.toFixed(2)}\n` +
                                    `🛒 Orders Received: ${sellerOrders.length}`
                                  );
                                }}>
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => {
                                  window.open(`tel:${seller.phone}`, '_self');
                                }}>
                                  📞
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => {
                                  window.open(`mailto:${seller.email}?subject=StudentXchange - Seller Support`, '_blank');
                                }}>
                                  📧
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Buyers Tab */}
            <TabsContent value="buyers">
              <Card>
                <CardHeader>
                  <CardTitle>Buyer Management</CardTitle>
                  <CardDescription>
                    View all buyers and their purchase history
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Buyer ID</TableHead>
                        <TableHead>Username</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Orders Placed</TableHead>
                        <TableHead>Total Spent</TableHead>
                        <TableHead>Recent Purchases</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.filter(user => orders.some(o => o.userId === user.id)).map((buyer) => {
                        const buyerOrders = orders.filter(o => o.userId === buyer.id);
                        const totalSpent = buyerOrders.reduce((sum, o) => sum + parseFloat(o.totalAmount?.toString() || '0'), 0);
                        
                        return (
                          <TableRow key={buyer.id}>
                            <TableCell className="font-medium">#{buyer.id}</TableCell>
                            <TableCell>{buyer.username}</TableCell>
                            <TableCell>
                              <div className="text-sm">
                                <div>{buyer.email}</div>
                                <div className="text-gray-500 font-mono">{buyer.phone}</div>
                              </div>
                            </TableCell>
                            <TableCell>{buyerOrders.length}</TableCell>
                            <TableCell className="font-medium">₹{totalSpent.toFixed(2)}</TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                {buyerOrders.slice(0, 3).map(order => (
                                  <div key={order.id} className="text-sm">
                                    Order #{order.id} - ₹{Number(order.totalAmount).toFixed(2)}
                                  </div>
                                ))}
                                {buyerOrders.length > 3 && (
                                  <div className="text-xs text-gray-500">
                                    +{buyerOrders.length - 3} more
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                <Button variant="outline" size="sm" onClick={() => {
                                  const orderDetails = buyerOrders.map(o => 
                                    `• Order #${o.id} - ₹${Number(o.totalAmount).toFixed(2)} (${o.status}) - ${new Date(o.createdAt).toLocaleDateString()}`
                                  ).join('\n');
                                  
                                  alert(`🛒 BUYER PROFILE\n\n` +
                                    `👤 ${buyer.username}\n` +
                                    `📧 ${buyer.email}\n` +
                                    `📱 ${buyer.phone}\n` +
                                    `📅 Joined: ${new Date(buyer.createdAt).toLocaleDateString()}\n\n` +
                                    `🛍️ PURCHASE HISTORY (${buyerOrders.length} orders):\n${orderDetails || 'None'}\n\n` +
                                    `💰 Total Spent: ₹${totalSpent.toFixed(2)}\n` +
                                    `📊 Average Order: ₹${buyerOrders.length > 0 ? (totalSpent / buyerOrders.length).toFixed(2) : "0.00"}`
                                  );
                                }}>
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => {
                                  window.open(`tel:${buyer.phone}`, '_self');
                                }}>
                                  📞
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => {
                                  window.open(`mailto:${buyer.email}?subject=StudentXchange - Customer Support`, '_blank');
                                }}>
                                  📧
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* All Users Tab */}
            <TabsContent value="users">
              <Card>
                <CardHeader>
                  <CardTitle>User Management</CardTitle>
                  <CardDescription>
                    View and manage all registered users
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User ID</TableHead>
                        <TableHead>Username</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Products Listed</TableHead>
                        <TableHead>Joined</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((user) => {
                        const userProducts = products.filter(p => p.sellerId === user.id);
                        const userOrders = orders.filter(o => 
                          o.items.some(item => userProducts.some(p => p.id === item.productId))
                        );
                        return (
                          <TableRow key={user.id}>
                            <TableCell className="font-medium">#{user.id}</TableCell>
                            <TableCell>{user.username}</TableCell>
                            <TableCell>{user.email}</TableCell>
                            <TableCell className="font-mono">{user.phone}</TableCell>
                            <TableCell>{userProducts.length}</TableCell>
                            <TableCell>{new Date(user.createdAt).toLocaleDateString()}</TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                <Button variant="outline" size="sm" onClick={() => {
                                  const productTitles = userProducts.map(p => `• ${p.title} (₹${p.price})`).join('\n');
                                  const orderDetails = userOrders.map(o => 
                                    `Order #${o.id} - ₹${Number(o.totalAmount).toFixed(2)} (${o.status})`
                                  ).join('\n');
                                  
                                  alert(`📋 SELLER DETAILS\n\n` +
                                    `👤 Username: ${user.username}\n` +
                                    `📧 Email: ${user.email}\n` +
                                    `📱 Phone: ${user.phone}\n` +
                                    `📅 Joined: ${new Date(user.createdAt).toLocaleDateString()}\n\n` +
                                    `📦 Products Listed (${userProducts.length}):\n${productTitles || 'None'}\n\n` +
                                    `🛒 Orders Received (${userOrders.length}):\n${orderDetails || 'None'}\n\n` +
                                    `💰 Total Earnings: ₹${userOrders.reduce((sum, o) => sum + parseFloat(o.totalAmount?.toString() || '0'), 0).toFixed(2)}`
                                  );
                                }}>
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => {
                                  window.open(`tel:${user.phone}`, '_self');
                                }}>
                                  📞
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => {
                                  window.open(`mailto:${user.email}?subject=StudentXchange - Admin Contact`, '_blank');
                                }}>
                                  📧
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="destructive" size="sm">
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Delete User</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Permanently delete <strong>{user.username}</strong> ({user.email})?
                                        This will remove their account and cannot be undone.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction
                                        className="bg-red-600 hover:bg-red-700"
                                        onClick={async () => {
                                          try {
                                            const res = await apiRequest("DELETE", `/api/admin/users/${user.id}`);
                                            if (res.ok) {
                                              toast({ title: "User deleted", description: `${user.username} has been removed.` });
                                              queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
                                            } else {
                                              toast({ title: "Failed to delete user", variant: "destructive" });
                                            }
                                          } catch {
                                            toast({ title: "Failed to delete user", variant: "destructive" });
                                          }
                                        }}
                                      >
                                        Delete
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Analytics Tab */}
            <TabsContent value="analytics">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <TrendingUp className="h-5 w-5 mr-2" />
                      Order Statistics
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span>Pending Orders</span>
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
                          {orders.filter(o => o.status === "pending").length}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>COD Orders</span>
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                          {orders.filter(o => o.status === "pending_cod").length}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Completed Orders</span>
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                          {orders.filter(o => o.status === "completed").length}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Cancelled Orders</span>
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                          {orders.filter(o => o.status === "cancelled").length}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Platform Fee Overview</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span>Total Platform Fees Earned</span>
                        <span className="font-bold">
                          ₹{orders.reduce((sum, order) => sum + parseFloat(order.commission?.toString() || "0"), 0).toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Platform Fee Rate</span>
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">5-15%</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Average Order Value</span>
                        <span className="font-bold">
                          ₹{orders.length > 0 ? (orders.reduce((sum, order) => sum + parseFloat(order.totalAmount?.toString() || '0'), 0) / orders.length).toFixed(2) : "0.00"}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <Footer />
    </div>
  );
}