import { Button } from "@/components/ui/button";
import { Product } from "@shared/schema";
import { Minus, Plus, Trash2, FileText } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useSimpleToast } from "@/hooks/use-simple-toast";
import { calculateFee } from "@shared/commission-utils";

interface CartItemProps {
  id: number;
  product: Product;
  quantity: number;
  userId: number;
}

export default function CartItem({ id, product, quantity, userId }: CartItemProps) {
  const { toast } = useSimpleToast();
  
  const updateQuantityMutation = useMutation({
    mutationFn: async (newQuantity: number) => {
      return await apiRequest("PUT", `/api/cart/${id}`, { quantity: newQuantity });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/cart/${userId}`] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating quantity",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const removeItemMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/cart/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Item removed",
        description: "The item has been removed from your cart",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/cart/${userId}`] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error removing item",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const handleIncreaseQuantity = () => {
    updateQuantityMutation.mutate(quantity + 1);
  };
  
  const handleDecreaseQuantity = () => {
    if (quantity > 1) {
      updateQuantityMutation.mutate(quantity - 1);
    }
  };
  
  const handleRemove = () => {
    removeItemMutation.mutate();
  };
  
  // Function to get product image (same as other components for consistency)
  const getProductImage = () => {
    if (product.images && product.images.length > 0) {
      const imageUrl = product.images[0];
      if (imageUrl.startsWith('http')) {
        return imageUrl; // External URL
      } else {
        return `/uploads/${imageUrl}`; // Uploaded file
      }
    }
    return null; // No image available
  };

  const fee = calculateFee(Number(product.price || 0));
  const totalPrice = Number(product.price || 0) + fee;

  return (
    <div className="flex flex-col md:flex-row py-6 border-b">
      <div className="flex-shrink-0 w-full md:w-32 h-32 md:mr-6 mb-4 md:mb-0 bg-gray-100 rounded-lg overflow-hidden">
        {(() => {
          const imageUrl = getProductImage();
          return imageUrl ? (
            <img 
              src={imageUrl} 
              alt={product.title} 
              className="w-full h-full object-cover"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=150&h=150&fit=crop';
              }}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center">
              <FileText className="h-8 w-8 text-blue-500" />
            </div>
          );
        })()}
      </div>
      
      <div className="flex-1">
        <div className="flex flex-col md:flex-row md:justify-between">
          <div>
            <h3 className="text-base font-medium text-gray-900">{product.title}</h3>
            <p className="mt-1 text-sm text-gray-500">{product.category}</p>
            <p className="mt-1 text-sm text-gray-500">Condition: {product.condition}</p>
          </div>
          <div className="mt-4 md:mt-0 flex flex-col md:items-end">
            <div className="flex items-baseline">
              <span className="text-xs text-gray-600 mr-1">INR</span>
              <span className="text-lg font-medium text-gray-900">
                ₹{totalPrice.toFixed(2)}
              </span>
            </div>
            <span className="text-xs text-gray-500">
              (Seller price: ₹{Number(product.price).toFixed(2)})
            </span>
            {product.originalPrice && Number(product.originalPrice) > Number(product.price) && (
              <span className="text-sm text-gray-500 line-through">
                ₹{(Number(product.originalPrice) + calculateFee(Number(product.originalPrice))).toFixed(2)}
              </span>
            )}
          </div>
        </div>
        
        <div className="mt-4 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <div className="flex items-center border rounded">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8"
                onClick={handleDecreaseQuantity}
                disabled={quantity <= 1 || updateQuantityMutation.isPending}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="w-8 text-center">{quantity}</span>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8"
                onClick={handleIncreaseQuantity}
                disabled={updateQuantityMutation.isPending}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <div className="flex items-center">
            <div className="flex flex-col items-end mr-4">
              <div className="flex items-baseline">
                <span className="text-xs text-gray-600 mr-1">INR</span>
                <span className="text-lg font-medium">
                  ₹{((Number(product.price) + calculateFee(Number(product.price))) * quantity).toFixed(2)}
                </span>
              </div>
              <span className="text-xs text-gray-500">Total for {quantity} item{quantity > 1 ? 's' : ''}</span>
            </div>
            <Button 
              variant="outline"
              size="icon"
              onClick={handleRemove}
              disabled={removeItemMutation.isPending}
            >
              <Trash2 className="h-4 w-4 text-red-500" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
