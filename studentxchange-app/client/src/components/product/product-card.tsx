import { useState, memo, useMemo, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star, FileText, Image as ImageIcon, Eye, Shield, CheckCircle, Camera } from "lucide-react";
import { Product } from "@shared/schema";
import { calculateFee, getFeeRate } from "@shared/commission-utils";
import { Link } from "wouter";
import { useCart } from "@/hooks/use-cart";
import { useSimpleToast } from "@/hooks/use-simple-toast";
import { TrustBadge } from "@/components/trust/trust-badge";
import RatingDisplay from "@/components/review/rating-display";
import { FileViewerPopup } from "@/components/product/file-viewer-popup";
import { OLXStyleImageDisplay } from "@/components/ui/olx-style-image-display";
import { ImageSlideshow } from "@/components/ui/image-slideshow";
import { OptimizedImage } from "@/components/ui/optimized-image";
import OptimizedImageDisplay from "@/components/ui/optimized-image-display";

interface ProductCardProps {
  product: Product;
}

export default memo(function ProductCard({ product }: ProductCardProps) {
  const { addToCart } = useCart();
  const { toast } = useSimpleToast();
  const [showImagePopup, setShowImagePopup] = useState(false);
  const [showImageSlideshow, setShowImageSlideshow] = useState(false);
  const [showFileViewer, setShowFileViewer] = useState(false);
  const [selectedFile, setSelectedFile] = useState<string>("");

  const openFileViewer = useCallback((filePath: string) => {
    setSelectedFile(filePath);
    setShowFileViewer(true);
  }, []);

  const productImages = useMemo(() => {
    if (product.images && product.images.length > 0) {
      return product.images.map(imageUrl => {
        // Handle Firebase Storage URLs (full URLs) and local filenames
        if (imageUrl.startsWith('http')) {
          return imageUrl; // Firebase Storage URL
        } else {
          return `/uploads/${imageUrl}`; // Local storage path
        }
      });
    }
    return [];
  }, [product.images]);

  const optimizedImage = useMemo(() => {
    // Prioritize optimized WebP images (new system)
    if (product.thumbnailUrls && product.thumbnailUrls.length > 0) {
      return {
        thumbnailUrl: product.thumbnailUrls[0],
        fullImageUrl: product.fullImageUrls?.[0] || product.thumbnailUrls[0]
      };
    }
    
    // Fallback to legacy images
    if (product.images && product.images.length > 0) {
      const imageUrl = product.images[0];
      const fullUrl = imageUrl.startsWith('http') ? imageUrl : `/uploads/${imageUrl}`;
      return {
        thumbnailUrl: fullUrl,
        fullImageUrl: fullUrl
      };
    }
    
    return null;
  }, [product.thumbnailUrls, product.fullImageUrls, product.images]);

  const productImage = useMemo(() => {
    // Legacy function for components that still need single URL
    if (optimizedImage) return optimizedImage.thumbnailUrl;
    
    // If no images but has seller-uploaded files, show first file as preview
    if (product.files && product.files.length > 0) {
      const firstFile = product.files[0];
      if (firstFile.startsWith('http')) {
        return firstFile; // Firebase Storage URL
      } else {
        return `/uploads/${firstFile}`; // Local file path
      }
    }
    
    // Only use category fallback if NO seller content exists
    const categoryImages: Record<string, string> = {
      'Textbooks': 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500&h=500&fit=crop',
      'Second-hand Books': 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500&h=500&fit=crop',
      'Reference Books': 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500&h=500&fit=crop',
      'Course Notes': 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=500&h=500&fit=crop',
      'Handwritten Notes': 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=500&h=500&fit=crop',
      'Previous Year Papers': 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=500&h=500&fit=crop',
      'Study Materials': 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=500&h=500&fit=crop',
      'Lab Equipment': 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=500&h=500&fit=crop',
      'Calculators': 'https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=500&h=500&fit=crop',
      'Stationery': 'https://images.unsplash.com/photo-1606092195730-5d7b9af1efc5?w=500&h=500&fit=crop'
    };
    
    return categoryImages[product.category] || 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=500&h=500&fit=crop';
  }, [optimizedImage, product.files, product.category]);

  // Check if product has seller-uploaded content
  const sellerContentExists = useMemo(() => {
    const hasSellerImages = product.images && product.images.length > 0 && 
      product.images.some(img => 
        !img.includes('unsplash.com') && 
        (img.includes('firebasestorage.googleapis.com') || img.includes('/uploads/') || img.startsWith('http'))
      );
    const hasSellerFiles = product.files && product.files.length > 0 &&
      product.files.some(file =>
        file.includes('firebasestorage.googleapis.com') || file.includes('/uploads/') || file.startsWith('http')
      );
    return hasSellerImages || hasSellerFiles;
  }, [product.images, product.files]);
  
  const renderStars = useCallback((rating: number | string) => {
    const numRating = typeof rating === 'string' ? parseFloat(rating) : rating;
    const stars = [];
    
    // Full stars
    for (let i = 1; i <= Math.floor(numRating); i++) {
      stars.push(
        <Star key={`star-${i}`} className="h-4 w-4 text-yellow-400 fill-yellow-400" />
      );
    }
    
    // Empty stars
    for (let i = Math.ceil(numRating); i <= 5; i++) {
      stars.push(
        <Star key={`star-${i}`} className="h-4 w-4 text-gray-300" />
      );
    }
    
    return stars;
  }, []);
  
  const handleAddToCart = useCallback(() => {
    addToCart(product);
    toast({
      title: "Added to cart",
      description: `${product.title} has been added to your cart.`,
    });
  }, [addToCart, product, toast]);
  
  const badgeColor = useMemo(() => {
    const colors: Record<string, string> = {
      'Textbooks': 'bg-blue-100 text-blue-800',
      'Second-hand Books': 'bg-blue-100 text-blue-800', 
      'Reference Books': 'bg-sky-100 text-sky-800',
      'Course Notes': 'bg-cyan-100 text-cyan-800',
      'Handwritten Notes': 'bg-cyan-100 text-cyan-800',
      'Previous Year Papers': 'bg-indigo-100 text-indigo-800',
      'Study Materials': 'bg-purple-100 text-purple-800',
      'Stationery': 'bg-indigo-100 text-indigo-800',
      'Study Electronics': 'bg-purple-100 text-purple-800',
      'Lab Equipment': 'bg-green-100 text-green-800',
      'Calculators': 'bg-pink-100 text-pink-800',
      'Drawing Instruments': 'bg-rose-100 text-rose-800',
      'Backpacks & Bags': 'bg-amber-100 text-amber-800',
      'Study Tables': 'bg-orange-100 text-orange-800',
      'Educational Software': 'bg-violet-100 text-violet-800',
      'Study Lamps': 'bg-yellow-100 text-yellow-800',
      'Project Supplies': 'bg-emerald-100 text-emerald-800',
      'Classroom Furniture': 'bg-lime-100 text-lime-800',
      'Educational Tablets': 'bg-fuchsia-100 text-fuchsia-800',
      'Other Study Materials': 'bg-gray-100 text-gray-800'
    };
    
    return colors[product.category] || 'bg-gray-100 text-gray-800';
  }, [product.category]);
  
  const conditionColor = useMemo(() => {
    const colors: Record<string, string> = {
      'New': 'bg-green-100 text-green-800',
      'Like New': 'bg-green-100 text-green-800',
      'Good': 'bg-green-100 text-green-800',
      'Fair': 'bg-yellow-100 text-yellow-800'
    };
    
    return colors[product.condition] || 'bg-gray-100 text-gray-800';
  }, [product.condition]);
  
  return (
    <Card className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-200 transition-all duration-200 hover:shadow-md">
      <Link href={`/product/${product.id}`}>
        <div className="relative h-56 overflow-hidden cursor-pointer">
          {(() => {
            if (optimizedImage) {
              return (
                <div className="relative group/image">
                  <OptimizedImageDisplay
                    thumbnailUrl={optimizedImage.thumbnailUrl}
                    fullImageUrl={optimizedImage.fullImageUrl}
                    alt={product.title}
                    className="object-cover w-full h-full"
                    showFullOnClick={false}
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover/image:bg-opacity-50 transition-all duration-300 flex items-center justify-center">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="opacity-0 group-hover/image:opacity-100 transition-opacity duration-300"
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        setShowImagePopup(true);
                      }}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View Image
                    </Button>
                  </div>
                </div>
              );
            } else {
              // Show category-themed placeholder when no images available
              const categoryGradients: Record<string, string> = {
                'Textbooks': 'from-blue-400 to-blue-600',
                'Second-hand Books': 'from-amber-400 to-amber-600',
                'Reference Books': 'from-indigo-400 to-indigo-600',
                'Course Notes': 'from-cyan-400 to-cyan-600',
                'Handwritten Notes': 'from-teal-400 to-teal-600',
                'Previous Year Papers': 'from-purple-400 to-purple-600',
                'Study Materials': 'from-violet-400 to-violet-600',
                'Lab Equipment': 'from-green-400 to-green-600',
                'Calculators': 'from-pink-400 to-pink-600',
                'Stationery': 'from-rose-400 to-rose-600'
              };
              const gradient = categoryGradients[product.category] || 'from-gray-400 to-gray-600';
              
              return (
                <div className={`w-full h-full bg-gradient-to-br ${gradient} flex flex-col items-center justify-center`}>
                  {product.files && product.files.length > 0 ? (
                    <>
                      <FileText className="h-14 w-14 text-white/90 mb-2" />
                      <span className="text-sm font-semibold text-white">{product.category}</span>
                      <span className="text-xs text-white/80">{product.files.length} file(s) available</span>
                    </>
                  ) : (
                    <>
                      <ImageIcon className="h-14 w-14 text-white/90 mb-2" />
                      <span className="text-sm font-semibold text-white">{product.category}</span>
                      <span className="text-xs text-white/80">No preview available</span>
                    </>
                  )}
                </div>
              );
            }
          })()}
          
          {/* Seller Content Indicators */}
          <div className="absolute top-2 right-2 flex gap-1">
            {sellerContentExists && (
              <Badge className="text-xs bg-orange-500 text-white font-medium">
                <Camera className="h-3 w-3 mr-1" />
                Seller Photos
              </Badge>
            )}
            {product.images && product.images.length > 0 && (
              <Badge variant="secondary" className="text-xs bg-blue-500 text-white">
                <ImageIcon className="h-3 w-3 mr-1" />
                {product.images.length}
              </Badge>
            )}
            {product.files && product.files.length > 0 && (
              <Badge variant="secondary" className="text-xs bg-green-500 text-white">
                <FileText className="h-3 w-3 mr-1" />
                {product.files.length}
              </Badge>
            )}
          </div>
        </div>
      </Link>

      <div className="p-4 space-y-3">
        {/* Header with rating and trust badges */}
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <Link href={`/product/${product.id}`}>
              <h3 className="font-medium text-gray-900 text-sm sm:text-base line-clamp-2 hover:text-blue-600 transition-colors cursor-pointer mb-1">
                {product.title}
              </h3>
            </Link>
            <div className="flex items-center gap-1 mt-0.5">
              {renderStars(product.rating || 0)}
              <span className="text-xs text-gray-500 ml-1">
                ({product.rating || '0'})
              </span>
            </div>
          </div>
        </div>

        {/* Price and condition */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="text-lg font-bold text-gray-900">
              ₹{Number(product.price || 0).toLocaleString('en-IN')}
            </div>
            {product.originalPrice && Number(product.originalPrice) > Number(product.price || 0) && (
              <div className="text-xs text-gray-500">
                <span className="line-through">₹{Number(product.originalPrice).toLocaleString('en-IN')}</span>
                <span className="ml-1 text-green-600 font-medium">
                  {Math.round((1 - Number(product.price || 0) / Number(product.originalPrice)) * 100)}% off
                </span>
              </div>
            )}
          </div>
          
          <div className="text-right">
            <Badge variant="outline" className={`text-xs ${conditionColor}`}>
              {product.condition}
            </Badge>
          </div>
        </div>

        {/* Category and description */}
        <div className="space-y-2">
          <Badge variant="outline" className={`text-xs ${badgeColor}`}>
            {product.category}
          </Badge>
          
          <p className="text-sm text-gray-600 line-clamp-2">
            {product.description}
          </p>
        </div>

        {/* Seller Content Highlight */}
        {sellerContentExists && (
          <div className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-lg p-2">
            <div className="flex items-center gap-2">
              <Camera className="h-4 w-4 text-orange-600" />
              <span className="text-xs font-medium text-orange-800">
                Real seller photos available
              </span>
              <Badge variant="secondary" className="text-xs bg-orange-500 text-white ml-auto">
                <Eye className="h-3 w-3 mr-1" />
                View
              </Badge>
            </div>
          </div>
        )}

        {/* Files section - Show uploaded files with viewer popups */}
        {((product.images?.length || 0) > 0 || (product.files?.length || 0) > 0) && (
          <div className="space-y-2">
            <div className="text-xs font-medium text-gray-700">Attached Files:</div>
            <div className="flex flex-wrap gap-1">
              {/* Images */}
              {product.images && product.images.map((image, index) => (
                <FileViewerPopup
                  key={`image-${index}`}
                  fileName={`Image ${index + 1}`}
                  fileUrl={image.startsWith('http') ? image : `/uploads/${image}`}
                  fileType="image/jpeg"
                >
                  <Badge variant="outline" className="text-xs bg-blue-50 hover:bg-blue-100 cursor-pointer transition-colors">
                    <ImageIcon className="h-3 w-3 mr-1" />
                    Image {index + 1}
                  </Badge>
                </FileViewerPopup>
              ))}
              
              {/* Other files */}
              {product.files && product.files.map((file, index) => (
                <FileViewerPopup
                  key={`file-${index}`}
                  fileName={file}
                  fileUrl={`/uploads/${file}`}
                  fileType={file.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream'}
                >
                  <Badge variant="outline" className="text-xs bg-green-50 hover:bg-green-100 cursor-pointer transition-colors">
                    <FileText className="h-3 w-3 mr-1" />
                    {file.length > 15 ? file.substring(0, 12) + '...' : file}
                  </Badge>
                </FileViewerPopup>
              ))}
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-2 pt-2">
          <Link href={`/product/${product.id}`} className="flex-1">
            <Button variant="outline" className="w-full text-xs card-action-btn">
              View Details
            </Button>
          </Link>
          <Button 
            onClick={handleAddToCart} 
            className="flex-1 text-xs card-action-btn"
            disabled={product.quantity === 0}
          >
            {product.quantity === 0 ? 'Out of Stock' : 'Add to Cart'}
          </Button>
        </div>
      </div>

      {/* Image popup */}
      {showImagePopup && (
        <FileViewerPopup
          fileName={product.title}
          fileUrl={productImage || ''}
          fileType="image/jpeg"
        />
      )}
    </Card>
  );
});