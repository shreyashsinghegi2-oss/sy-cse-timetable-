import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Edit, Trash2, Plus, Eye, AlertCircle, UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useSimpleToast } from "@/hooks/use-simple-toast";
import { Product } from "@shared/schema";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import ProductForm from "@/components/product/product-form";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import SellerPricingGuide from "@/components/seller-pricing-guide";

export default function SellerListings() {
  const { user } = useAuth();
  const { toast } = useSimpleToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/account", {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || "Failed to delete account");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.clear();
      localStorage.clear();
      toast({ title: "Account deleted", description: "Your account and all data have been permanently removed." });
      setTimeout(() => setLocation("/"), 1500);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const { data: products, isLoading } = useQuery({
    queryKey: [`/api/products/seller/${user?.id}`],
    enabled: !!user?.id,
  });

  const deleteMutation = useMutation({
    mutationFn: async (productId: number) => {
      const response = await fetch(`/api/products/${productId}`, {
        method: "DELETE",
        credentials: 'include', // Include cookies for session
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete product');
      }
      
      return response.json();
    },
    onSuccess: (_, productId) => {
      queryClient.invalidateQueries({ queryKey: [`/api/products/seller/${user?.id}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({
        title: "Success",
        description: "Product deleted successfully",
      });
    },
    onError: (error: Error) => {
      console.error('Delete product error:', error);
      toast({
        title: "Error", 
        description: error.message || "Failed to delete product",
        variant: "destructive",
      });
    },
  });

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setIsEditDialogOpen(true);
  };

  const handleDeleteProduct = (productId: number) => {
    deleteMutation.mutate(productId);
  };

  const handleEditSuccess = () => {
    setEditingProduct(null);
    setIsEditDialogOpen(false);
    queryClient.invalidateQueries({ queryKey: [`/api/products/seller/${user?.id}`] });
    queryClient.invalidateQueries({ queryKey: ["/api/products"] });
    toast({
      title: "Success",
      description: "Product updated successfully",
    });
  };

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-gray-400" />
          <h2 className="mt-2 text-lg font-medium text-gray-900">
            Please log in to view your listings
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            You need to be logged in to manage your product listings.
          </p>
          <div className="mt-6">
            <Link href="/auth">
              <Button>Sign In</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2 mb-4"></div>
                <div className="h-8 bg-gray-200 rounded w-full"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Seller Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Manage your product listings and get pricing guidance
          </p>
        </div>
        <Link href="/sell">
          <Button className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            Add New Product
          </Button>
        </Link>
      </div>

      <Tabs defaultValue="listings" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="listings">My Listings</TabsTrigger>
          <TabsTrigger value="pricing-guide">Pricing Guide</TabsTrigger>
        </TabsList>

        <TabsContent value="pricing-guide">
          <SellerPricingGuide />
        </TabsContent>

        <TabsContent value="listings">
          {!products || !Array.isArray(products) || products.length === 0 ? (
            <div className="text-center py-12">
              <div className="bg-gray-50 rounded-lg p-8">
                <div className="text-gray-400 text-6xl mb-4">📦</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  No products listed yet
                </h3>
                <p className="text-gray-600 mb-6">
                  Start selling by adding your first product listing
                </p>
                <Link href="/sell">
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Your First Product
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {(products as Product[]).map((product: Product) => (
                <Card key={product.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg leading-6 truncate">
                          {product.title}
                        </CardTitle>
                        <p className="text-sm text-gray-500 mt-1">
                          {product.category} • {product.condition}
                        </p>
                      </div>
                      <Badge variant={product.quantity > 0 ? "default" : "secondary"}>
                        {product.quantity > 0 ? "Active" : "Out of Stock"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-lg font-semibold text-blue-600">
                            ₹{product.price}
                          </p>
                          <p className="text-sm text-gray-500">
                            Qty: {product.quantity}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-500">Rating</p>
                          <p className="text-sm font-medium">
                            {product.rating || "0"} ⭐
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Link href={`/product/${product.id}`}>
                          <Button size="sm" variant="outline">
                            <Eye className="w-4 h-4 mr-1" />
                            View
                          </Button>
                        </Link>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditProduct(product)}
                        >
                          <Edit className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="text-red-600 hover:text-red-700"
                              disabled={deleteMutation.isPending}
                            >
                              <Trash2 className="w-4 h-4 mr-1" />
                              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Product</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete "{product.title}"? This action cannot be undone and will permanently remove your product listing.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel disabled={deleteMutation.isPending}>
                                Cancel
                              </AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteProduct(product.id)}
                                className="bg-red-600 hover:bg-red-700"
                                disabled={deleteMutation.isPending}
                              >
                                {deleteMutation.isPending ? 'Deleting...' : 'Delete Product'}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Edit Product Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Product</DialogTitle>
          </DialogHeader>
          {editingProduct && (
            <ProductForm
              product={editingProduct}
              onSuccess={handleEditSuccess}
              onCancel={() => setIsEditDialogOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Danger Zone */}
      <div className="mt-12 border border-red-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-red-700 mb-1">Danger Zone</h2>
        <p className="text-sm text-gray-600 mb-4">
          Permanently delete your account and all associated data — listings, orders, and profile. This cannot be undone.
        </p>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" className="border-red-400 text-red-600 hover:bg-red-50" disabled={deleteAccountMutation.isPending}>
              <UserX className="w-4 h-4 mr-2" />
              {deleteAccountMutation.isPending ? "Deleting account…" : "Delete My Account"}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete your account?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently remove your account, all product listings, order history, and personal data from StudentXchange. This action is irreversible.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteAccountMutation.mutate()}
                className="bg-red-600 hover:bg-red-700"
                disabled={deleteAccountMutation.isPending}
              >
                {deleteAccountMutation.isPending ? "Deleting…" : "Yes, delete my account"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}