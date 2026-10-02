import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Product } from "@shared/schema";
import { calculateFee, getFeeRate, getDisplayedFeeRate, calculateDisplayedFee, getDiscountPercentage } from "@shared/commission-utils";
import { trackEvent } from "@/lib/analytics";
import { useCart } from "@/hooks/use-cart";
import { useSimpleToast } from "@/hooks/use-simple-toast";
import { useAuth } from "@/hooks/use-auth";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import MobileNav from "@/components/layout/mobile-nav";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Star, Minus, Plus, ShoppingCart, ArrowLeft, FileText } from "lucide-react";
import { EnhancedImageSlideshow } from "@/components/ui/enhanced-image-slideshow";
import RatingDisplay from "@/components/review/rating-display";
import ReviewList from "@/components/review/review-list";
import ReviewForm from "@/components/review/review-form";

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useSimpleToast();
  const { addToCart } = useCart();
  const { user } = useAuth();
  const [quantity, setQuantity] = useState(1);

  const getProductImages = () => {
    if (!product?.images || product.images.length === 0) return [];
    return product.images.map(imageUrl => {
      // Handle both Firebase Storage URLs and local file paths
      if (imageUrl.startsWith('http')) {
        return imageUrl; // Firebase Storage URL
      } else {
        return `/uploads/${imageUrl}`; // Local legacy path
      }
    });
  };

  const getProductFiles = () => {
    if (!product?.files || product.files.length === 0) return [];
    return product.files.map(fileUrl => {
      if (fileUrl.startsWith('http')) {
        return fileUrl;
      } else {
        return `/uploads/${fileUrl}`;
      }
    });
  };

  const { data: product, isLoading, error } = useQuery<Product>({
    queryKey: [`/api/products/${id}`],
  });

  // Track product view when product data loads
  useEffect(() => {
    if (product) {
      trackEvent('view_item', 'engagement', `product_${product.id}`, parseFloat((product.price || 0).toString()));
    }
  }, [product]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-grow flex items-center justify-center">
          <div className="animate-pulse text-primary">Loading product details...</div>
        </main>
        <Footer />
        <MobileNav />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-grow flex items-center justify-center">
          <Card className="max-w-lg mx-auto">
            <CardContent className="pt-6">
              <h2 className="text-xl font-bold mb-4">Product Not Found</h2>
              <p className="mb-4">Sorry, we couldn't find the product you're looking for.</p>
              <Button onClick={() => window.history.back()} className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            </CardContent>
          </Card>
        </main>
        <Footer />
        <MobileNav />
      </div>
    );
  }

  const getProductImage = () => {
    // Always prioritize seller-uploaded images first (like OLX)
    if (product.images && product.images.length > 0) {
      const imageUrl = product.images[0];
      // Check if it's a filename (from upload) or full URL
      if (imageUrl.startsWith('http')) {
        return imageUrl; // External URL (existing sample images)
      } else {
        // It's a filename from upload, construct the correct path
        return `/uploads/${imageUrl}`;
      }
    }
    
    // If no seller images, show document preview for files only
    if (product.files && product.files.length > 0) {
      // Return null to show document preview instead of fallback
      return null;
    }
    
    // Only show category fallback if absolutely no content uploaded
    const categoryImages: Record<string, string> = {
      'Textbooks': 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=600&fit=crop',
      'Second-hand Books': 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=600&fit=crop',
      'Reference Books': 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=600&fit=crop',
      'Course Notes': 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&h=600&fit=crop',
      'Handwritten Notes': 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&h=600&fit=crop',
      'Previous Year Papers': 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&h=600&fit=crop',
      'Study Materials': 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&h=600&fit=crop',
      'Lab Equipment': 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=800&h=600&fit=crop',
      'Calculators': 'https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=800&h=600&fit=crop',
      'Stationery': 'https://images.unsplash.com/photo-1606092195730-5d7b9af1efc5?w=800&h=600&fit=crop'
    };
    
    return categoryImages[product.category] || 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=800&h=600&fit=crop';
  };

  const renderStars = (rating: number | string) => {
    const numRating = typeof rating === 'string' ? parseFloat(rating) : rating;
    const stars = [];
    
    // Full stars
    for (let i = 1; i <= Math.floor(numRating); i++) {
      stars.push(
        <Star key={`star-${i}`} className="h-5 w-5 text-yellow-400 fill-yellow-400" />
      );
    }
    
    // Empty stars
    for (let i = Math.ceil(numRating); i <= 5; i++) {
      stars.push(
        <Star key={`star-${i}`} className="h-5 w-5 text-gray-300" />
      );
    }
    
    return stars;
  };

  const handleIncreaseQuantity = () => {
    if (quantity < (product.quantity || 10)) {
      setQuantity(quantity + 1);
    }
  };

  const handleDecreaseQuantity = () => {
    if (quantity > 1) {
      setQuantity(quantity - 1);
    }
  };

  const handleAddToCart = () => {
    addToCart({ ...product, quantity });
    trackEvent('add_to_cart', 'ecommerce', `product_${product.id}`, parseFloat((product.price || 0).toString()) * quantity);
    toast({
      title: "Added to cart",
      description: `${product.title} has been added to your cart.`,
    });
  };

  const handleBuyNow = () => {
    if (!user) {
      toast({
        title: "Please log in",
        description: "You need to log in to make a purchase.",
        variant: "destructive"
      });
      navigate("/auth");
      return;
    }
    
    trackEvent('begin_checkout', 'ecommerce', `product_${product.id}`, parseFloat((product.price || 0).toString()) * quantity);
    
    // Navigate directly to checkout with this product
    const checkoutData = {
      items: [{
        product,
        quantity
      }],
      fromBuyNow: true
    };
    
    // Store checkout data in sessionStorage for the checkout page to use
    sessionStorage.setItem('buyNowCheckout', JSON.stringify(checkoutData));
    navigate("/checkout");
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-grow py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Button 
            variant="ghost" 
            className="mb-4 pl-0" 
            onClick={() => window.history.back()}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Enhanced Image Slideshow */}
            <div className="bg-white rounded-lg overflow-hidden border border-gray-200 shadow-sm p-4">
              <EnhancedImageSlideshow
                images={getProductImages()}
                productTitle={product.title}
              />
            </div>
            
            {/* Product Info */}
            <div>
              <div className="mb-4">
                <Badge className="mb-2">{product.category}</Badge>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">{product.title}</h1>
                <div className="flex items-center mb-2">
                  <div className="flex">
                    {renderStars(product.rating || 0)}
                  </div>
                  <span className="text-sm text-gray-500 ml-2">
                    {product.rating ? `${product.rating} out of 5` : 'No ratings yet'}
                  </span>
                </div>
                <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
                  {product.condition}
                </Badge>
              </div>
              
              <div className="mb-6">
                <div className="flex items-end mb-2">
                  <span className="text-sm text-gray-600 mr-2">INR</span>
                  <span className="text-3xl font-bold text-gray-900">₹{Number(product.price).toFixed(2)}</span>
                  {product.originalPrice && Number(product.originalPrice) > Number(product.price) && (
                    <span className="ml-2 text-lg text-gray-500 line-through">
                      ₹{Number(product.originalPrice).toFixed(2)}
                    </span>
                  )}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500 line-through">
                      Platform fee (20%): ₹{calculateDisplayedFee(Number(product.price)).toFixed(2)}
                    </span>
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full font-medium">
                      {getDiscountPercentage(Number(product.price)).toFixed(0)}% OFF
                    </span>
                  </div>
                  <p className="text-sm text-green-600 font-medium">
                    Discounted Platform fee ({(getFeeRate(Number(product.price)) * 100).toFixed(0)}%): ₹{calculateFee(Number(product.price)).toFixed(2)}
                  </p>
                </div>
                <p className="text-xs text-green-600 mt-1">
                  Free delivery - ₹0 shipping charges
                </p>
              </div>
              
              <Separator className="my-6" />
              
              <div className="mb-6">
                <h2 className="text-lg font-semibold mb-2">Description</h2>
                <p className="text-gray-700 whitespace-pre-line">{product.description}</p>
              </div>
              
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold mb-2">Quantity</h2>
                  <div className="flex items-center border rounded-md max-w-[150px]">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={handleDecreaseQuantity}
                      disabled={quantity <= 1}
                      className="h-10 w-10"
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="flex-1 text-center font-medium">{quantity}</span>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={handleIncreaseQuantity}
                      disabled={quantity >= (product.quantity || 10)}
                      className="h-10 w-10"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    {product.quantity ? `${product.quantity} available` : ''}
                  </p>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button 
                    onClick={handleAddToCart}
                    variant="outline"
                    className="flex-1 sm:flex-none sm:px-8 gap-2"
                    size="lg"
                  >
                    <ShoppingCart className="h-5 w-5" />
                    Add to Cart
                  </Button>
                  <Button 
                    onClick={handleBuyNow}
                    className="flex-1 sm:flex-none sm:px-8 bg-blue-600 hover:bg-blue-700"
                    size="lg"
                  >
                    Buy Now
                  </Button>
                </div>
              </div>
            </div>
          </div>
          
          {/* Reviews Section */}
          <div className="mt-12">
            <Tabs defaultValue="reviews" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="reviews">Reviews</TabsTrigger>
                <TabsTrigger value="write-review">Write Review</TabsTrigger>
              </TabsList>
              
              <TabsContent value="reviews" className="mt-6">
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold">Customer Reviews</h2>
                    <RatingDisplay productId={product.id} />
                  </div>
                  <ReviewList productId={product.id} />
                </div>
              </TabsContent>
              
              <TabsContent value="write-review" className="mt-6">
                <div className="max-w-2xl">
                  <h2 className="text-xl font-semibold mb-4">Write a Review</h2>
                  {user ? (
                    <ReviewForm
                      productId={product.id}
                      userId={user.id}
                      onSubmit={() => {
                        toast({
                          title: "Review submitted",
                          description: "Thank you for your feedback!",
                        });
                      }}
                    />
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-gray-500 mb-4">You need to be logged in to write a review.</p>
                      <Button onClick={() => navigate("/auth")}>
                        Sign In to Write Review
                      </Button>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Platform Information */}
          <div className="mt-12 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-2">About Our Platform</h2>
            <p className="text-gray-700 mb-4">
              StudentXchange helps students buy and sell educational items easily. We charge a tiered platform fee (5-15%) on all sales to maintain the platform and provide secure transactions.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 bg-white rounded-md shadow-sm">
                <h3 className="font-medium mb-1">Quality Guarantee</h3>
                <p className="text-sm text-gray-600">All items are verified for quality and accuracy.</p>
              </div>
              <div className="p-4 bg-white rounded-md shadow-sm">
                <h3 className="font-medium mb-1">Student Discounts</h3>
                <p className="text-sm text-gray-600">Lower prices than retail stores for educational items.</p>
              </div>
              <div className="p-4 bg-white rounded-md shadow-sm">
                <h3 className="font-medium mb-1">Easy Returns</h3>
                <p className="text-sm text-gray-600">Hassle-free return process if you're not satisfied.</p>
              </div>
              <div className="p-4 bg-white rounded-md shadow-sm">
                <h3 className="font-medium mb-1">Secure Payments</h3>
                <p className="text-sm text-gray-600">All transactions are secure and protected.</p>
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
