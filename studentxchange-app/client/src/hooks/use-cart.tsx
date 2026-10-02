import { createContext, ReactNode, useContext, useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Product } from "@shared/schema";
import { useAuth } from "./use-auth";
import { useSimpleToast } from "./use-simple-toast";

interface CartItem {
  id: number;
  productId: number;
  quantity: number;
  userId: number;
  product: Product;
}

interface CartContextType {
  items: CartItem[];
  isLoading: boolean;
  addToCart: (product: Product, quantity?: number) => void;
  updateQuantity: (id: number, quantity: number) => void;
  removeFromCart: (id: number) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { toast } = useSimpleToast();
  const userId = user?.id;
  
  // Use local state as a fallback when not authenticated
  const [localCart, setLocalCart] = useState<CartItem[]>([]);
  
  // Fetch cart from API when authenticated
  const { data: cartItems = [], isLoading, refetch } = useQuery<CartItem[]>({
    queryKey: [`/api/cart/${userId}`],
    enabled: !!userId,
  });

  // Use either server cart or local cart based on authentication state
  const items = userId ? cartItems : localCart;

  // Add to cart mutation
  const addToCartMutation = useMutation({
    mutationFn: async ({ productId, quantity }: { productId: number, quantity: number }) => {
      if (!userId) throw new Error("User not authenticated");
      
      const res = await apiRequest("POST", "/api/cart", {
        userId,
        productId,
        quantity
      });
      
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/cart/${userId}`] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error adding to cart",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Update quantity mutation
  const updateQuantityMutation = useMutation({
    mutationFn: async ({ id, quantity }: { id: number, quantity: number }) => {
      if (!userId) throw new Error("User not authenticated");
      
      return await apiRequest("PUT", `/api/cart/${id}`, { quantity });
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
    }
  });

  // Remove from cart mutation
  const removeFromCartMutation = useMutation({
    mutationFn: async (id: number) => {
      if (!userId) throw new Error("User not authenticated");
      
      await apiRequest("DELETE", `/api/cart/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/cart/${userId}`] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error removing item",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Clear cart mutation
  const clearCartMutation = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error("User not authenticated");
      
      await apiRequest("DELETE", `/api/cart/user/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/cart/${userId}`] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error clearing cart",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Add item to cart
  const addToCart = (product: Product, quantity: number = 1) => {
    if (userId) {
      // If authenticated, use API
      addToCartMutation.mutate({ 
        productId: product.id, 
        quantity 
      });
    } else {
      // If not authenticated, use local state
      setLocalCart(prev => {
        // Check if product is already in cart
        const existingItemIndex = prev.findIndex(item => item.productId === product.id);
        
        if (existingItemIndex !== -1) {
          // Update quantity if product already in cart
          const updatedCart = [...prev];
          updatedCart[existingItemIndex].quantity += quantity;
          return updatedCart;
        } else {
          // Add new item if product not in cart
          return [...prev, {
            id: Date.now(), // Use timestamp as temporary ID
            productId: product.id,
            quantity,
            userId: 0, // Placeholder user ID
            product
          }];
        }
      });
    }
  };

  // Update quantity
  const updateQuantity = (id: number, quantity: number) => {
    if (userId) {
      // If authenticated, use API
      updateQuantityMutation.mutate({ id, quantity });
    } else {
      // If not authenticated, use local state
      setLocalCart(prev => 
        prev.map(item => 
          item.id === id ? { ...item, quantity } : item
        )
      );
    }
  };

  // Remove item from cart
  const removeFromCart = (id: number) => {
    if (userId) {
      // If authenticated, use API
      removeFromCartMutation.mutate(id);
    } else {
      // If not authenticated, use local state
      setLocalCart(prev => prev.filter(item => item.id !== id));
    }
  };

  // Clear cart
  const clearCart = () => {
    if (userId) {
      // If authenticated, use API
      clearCartMutation.mutate();
    } else {
      // If not authenticated, use local state
      setLocalCart([]);
    }
  };

  // Transfer local cart to server when user logs in
  useEffect(() => {
    const transferLocalCart = async () => {
      if (userId && localCart.length > 0) {
        // Add each local cart item to the server
        for (const item of localCart) {
          try {
            await addToCartMutation.mutateAsync({
              productId: item.productId,
              quantity: item.quantity
            });
          } catch (error) {
            console.warn('[Cart] Transfer item failed');
          }
        }
        
        // Clear local cart after transfer
        setLocalCart([]);
      }
    };

    transferLocalCart();
  }, [userId]);

  return (
    <CartContext.Provider value={{
      items,
      isLoading,
      addToCart,
      updateQuantity,
      removeFromCart,
      clearCart
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
