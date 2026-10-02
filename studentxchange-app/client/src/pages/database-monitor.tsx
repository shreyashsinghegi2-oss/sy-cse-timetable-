import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Database, Users, Package, ShoppingCart, Bell, AlertTriangle } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { PLATFORM_ADMIN_EMAIL } from "@/config/constants";

interface UserStats {
  total: number;
  new_today: number;
  admins: any[];
}

interface ProductStats {
  total: number;
  active: number;
  outOfStock: number;
  categories: any[];
  topSellers?: any[];
}

interface OrderStats {
  total: number;
  revenue: number;
  commission: number;
  topSellers: any[];
}

interface ActivityData {
  map: (fn: any) => any[];
}

export default function DatabaseMonitor() {
  const { user } = useAuth();
  const [sqlQuery, setSqlQuery] = useState("");
  const [queryResult, setQueryResult] = useState<any>(null);
  const [queryError, setQueryError] = useState<string | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);

  const isAdmin = !!(user?.email === PLATFORM_ADMIN_EMAIL || user?.username === "admin");

  // Quick stats queries
  const { data: userStats } = useQuery<UserStats>({
    queryKey: ["/api/admin/database/users"],
    enabled: isAdmin,
  });

  const { data: productStats } = useQuery<ProductStats>({
    queryKey: ["/api/admin/database/products"],
    enabled: isAdmin,
  });

  const { data: orderStats } = useQuery<OrderStats>({
    queryKey: ["/api/admin/database/orders"],
    enabled: isAdmin,
  });

  const { data: recentActivity } = useQuery<ActivityData>({
    queryKey: ["/api/admin/database/activity"],
    enabled: isAdmin,
  });

  // Check if user is admin
  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-96">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Access Denied
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">You need admin privileges to access the database monitor.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const [newUser, setNewUser] = useState({
    username: "",
    email: "",
    phone: "",
    password: "",
    isAdmin: false
  });

  const executeQuery = async () => {
    if (!sqlQuery.trim()) return;
    
    setIsExecuting(true);
    setQueryError(null);
    
    try {
      const result = await apiRequest("POST", "/api/admin/database/execute", { query: sqlQuery });
      setQueryResult(result);
    } catch (error: any) {
      setQueryError(error.message || "Failed to execute query");
    } finally {
      setIsExecuting(false);
    }
  };

  const createUser = async () => {
    if (!newUser.username || !newUser.email || !newUser.password) {
      setQueryError("Username, email, and password are required");
      return;
    }

    try {
      const result = await apiRequest("POST", "/api/admin/create-user", newUser);
      
      setNewUser({
        username: "",
        email: "",
        phone: "",
        password: "",
        isAdmin: false
      });
      
      alert(`User created successfully: ${result.username}`);
    } catch (error: any) {
      setQueryError(error.message || "Failed to create user");
    }
  };

  const quickQueries = [
    {
      name: "All Users",
      query: "SELECT id, username, email, phone, created_at FROM users ORDER BY created_at DESC LIMIT 20;"
    },
    {
      name: "Admin Users",
      query: "SELECT id, username, email, phone, created_at FROM users WHERE username LIKE '%admin%' OR email LIKE '%admin%';"
    },
    {
      name: "Recent Products",
      query: "SELECT id, title, price, category, seller_id, created_at FROM products ORDER BY created_at DESC LIMIT 20;"
    },
    {
      name: "Recent Orders",
      query: "SELECT id, user_id, total, status, created_at FROM orders ORDER BY created_at DESC LIMIT 20;"
    },
    {
      name: "User Statistics",
      query: "SELECT COUNT(*) as total_users, COUNT(CASE WHEN created_at >= CURRENT_DATE THEN 1 END) as new_today FROM users;"
    },
    {
      name: "Revenue Summary",
      query: "SELECT COUNT(*) as total_orders, SUM(total) as total_revenue, SUM(total * 0.20) as commission_earned FROM orders;"
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-4 sm:p-6">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Database Monitor</h1>
          <p className="text-sm sm:text-base text-gray-600">Monitor and manage your StudentXchange database</p>
        </div>

        <Tabs defaultValue="overview" className="space-y-4 sm:space-y-6">
          <div className="overflow-x-auto">
            <TabsList className="grid w-full grid-cols-4 min-w-max">
              <TabsTrigger value="overview" className="text-xs sm:text-sm">Overview</TabsTrigger>
              <TabsTrigger value="users" className="text-xs sm:text-sm">Users</TabsTrigger>
              <TabsTrigger value="products" className="text-xs sm:text-sm">Products</TabsTrigger>
              <TabsTrigger value="query" className="text-xs sm:text-sm">SQL Query</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="overview" className="space-y-4 sm:space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{userStats?.total || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    {userStats?.new_today || 0} new today
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Products</CardTitle>
                  <Package className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{productStats?.total || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    {productStats?.active || 0} active listings
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                  <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{orderStats?.total || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    ₹{orderStats?.revenue || 0} revenue
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Platform Fee</CardTitle>
                  <Database className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">₹{orderStats?.commission || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    5-15% platform fee
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Latest database events and notifications</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recentActivity?.map((activity: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                      <div className="flex items-center gap-3">
                        <Bell className="h-4 w-4 text-blue-500" />
                        <span className="text-sm">{activity.message}</span>
                      </div>
                      <Badge variant="outline">{activity.type}</Badge>
                    </div>
                  )) || (
                    <p className="text-gray-500 text-sm">No recent activity</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Create New Admin User</CardTitle>
                <CardDescription>Add a new administrator to the system</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Username</label>
                    <Input 
                      placeholder="admin_username" 
                      className="mt-1"
                      value={newUser.username}
                      onChange={(e) => setNewUser({...newUser, username: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Email</label>
                    <Input 
                      placeholder="admin@studentxchange.in" 
                      className="mt-1"
                      value={newUser.email}
                      onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Phone</label>
                    <Input 
                      placeholder="7039862086" 
                      className="mt-1"
                      value={newUser.phone}
                      onChange={(e) => setNewUser({...newUser, phone: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Password</label>
                    <Input 
                      type="password" 
                      placeholder="Secure password" 
                      className="mt-1"
                      value={newUser.password}
                      onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-4">
                  <input
                    type="checkbox"
                    id="isAdmin"
                    checked={newUser.isAdmin}
                    onChange={(e) => setNewUser({...newUser, isAdmin: e.target.checked})}
                  />
                  <label htmlFor="isAdmin" className="text-sm font-medium">Create as Admin User</label>
                </div>
                <Button className="mt-4" onClick={createUser}>
                  Create {newUser.isAdmin ? 'Admin' : 'Regular'} User
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Admin Users</CardTitle>
                <CardDescription>Current administrators with system access</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-gray-600 mb-4">
                  Users with "admin" in their username or email automatically get admin privileges
                </div>
                <div className="space-y-2">
                  {userStats?.admins?.map((admin: any) => (
                    <div key={admin.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                      <div>
                        <div className="font-medium">{admin.username}</div>
                        <div className="text-sm text-gray-600">{admin.email}</div>
                      </div>
                      <Badge>Admin</Badge>
                    </div>
                  )) || (
                    <p className="text-gray-500">No admin users found</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="products" className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>By Category</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {productStats?.categories?.map((cat: any) => (
                      <div key={cat.category} className="flex justify-between">
                        <span className="text-sm">{cat.category}</span>
                        <Badge variant="outline">{cat.count}</Badge>
                      </div>
                    )) || (
                      <p className="text-gray-500 text-sm">No categories found</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Top Sellers</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {productStats?.topSellers?.map((seller: any) => (
                      <div key={seller.seller_id} className="flex justify-between">
                        <span className="text-sm">User ID: {seller.seller_id}</span>
                        <Badge variant="outline">{seller.count} products</Badge>
                      </div>
                    )) || (
                      <p className="text-gray-500 text-sm">No sellers found</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Product Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Active</span>
                      <Badge variant="outline" className="text-green-600">{productStats?.active || 0}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Out of Stock</span>
                      <Badge variant="outline" className="text-red-600">{productStats?.outOfStock || 0}</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="query" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>SQL Query Executor</CardTitle>
                <CardDescription>Execute custom SQL queries on your database</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">SQL Query</label>
                    <Textarea
                      placeholder="SELECT * FROM users LIMIT 10;"
                      value={sqlQuery}
                      onChange={(e) => setSqlQuery(e.target.value)}
                      className="mt-1 font-mono text-sm"
                      rows={6}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={executeQuery} disabled={isExecuting || !sqlQuery.trim()}>
                      {isExecuting ? "Executing..." : "Execute Query"}
                    </Button>
                    <Button variant="outline" onClick={() => setSqlQuery("")}>
                      Clear
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quick Queries</CardTitle>
                <CardDescription>Common database queries for quick access</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {quickQueries.map((query) => (
                    <Button
                      key={query.name}
                      variant="outline"
                      onClick={() => setSqlQuery(query.query)}
                      className="justify-start"
                    >
                      {query.name}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {queryError && (
              <Alert className="border-red-200 bg-red-50">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">
                  {queryError}
                </AlertDescription>
              </Alert>
            )}

            {queryResult && (
              <Card>
                <CardHeader>
                  <CardTitle>Query Results</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-gray-50 p-4 rounded-md">
                    <pre className="text-sm overflow-auto">
                      {JSON.stringify(queryResult, null, 2)}
                    </pre>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}