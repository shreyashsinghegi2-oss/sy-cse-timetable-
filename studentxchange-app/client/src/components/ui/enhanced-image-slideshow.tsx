import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, X, ZoomIn, Download } from "lucide-react";

interface EnhancedImageSlideshowProps {
  images: string[];
  productTitle: string;
}

export function EnhancedImageSlideshow({ images, productTitle }: EnhancedImageSlideshowProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  if (!images || images.length === 0) {
    return (
      <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-200 rounded-lg mx-auto mb-2"></div>
          <p className="text-sm text-gray-500">No image available</p>
        </div>
      </div>
    );
  }

  const nextImage = () => {
    setCurrentIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const getImageSrc = (imagePath: string) => {
    // Return Firebase Storage URLs directly, fallback to local uploads for legacy images
    if (imagePath.startsWith('http')) {
      return imagePath; // Firebase Storage URL or external URL
    }
    
    // For legacy local files, check if they exist in uploads folder
    return `/uploads/${imagePath}`; // Legacy local path
  };

  return (
    <div className="relative">
      {/* Main Image Display */}
      <div className="aspect-square relative bg-gray-50 rounded-lg overflow-hidden border border-gray-200">
        <img
          src={getImageSrc(images[currentIndex])}
          alt={`${productTitle} - Image ${currentIndex + 1}`}
          className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform duration-300"
          onClick={() => setIsOpen(true)}
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = `https://images.unsplash.com/photo-1546198632-9ef6368bef12?w=400&h=400&fit=crop`;
          }}
        />
        
        {/* Image Counter */}
        {images.length > 1 && (
          <div className="absolute top-2 right-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded-full">
            {currentIndex + 1} / {images.length}
          </div>
        )}

        {/* Navigation Arrows (only show if multiple images) */}
        {images.length > 1 && (
          <>
            <Button
              variant="ghost"
              size="sm"
              className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-white bg-opacity-80 hover:bg-opacity-100 rounded-full p-1 h-8 w-8"
              onClick={(e) => {
                e.stopPropagation();
                prevImage();
              }}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-white bg-opacity-80 hover:bg-opacity-100 rounded-full p-1 h-8 w-8"
              onClick={(e) => {
                e.stopPropagation();
                nextImage();
              }}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </>
        )}

        {/* Zoom Icon */}
        <div className="absolute bottom-2 right-2 bg-black bg-opacity-50 text-white p-1 rounded-full opacity-0 hover:opacity-100 transition-opacity">
          <ZoomIn className="h-4 w-4" />
        </div>
      </div>

      {/* Thumbnail Strip (only show if multiple images) */}
      {images.length > 1 && (
        <div className="flex gap-2 mt-3 overflow-x-auto scrollbar-hide">
          {images.map((image, index) => (
            <button
              key={index}
              className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                index === currentIndex 
                  ? 'border-blue-500 ring-2 ring-blue-200' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => setCurrentIndex(index)}
            >
              <img
                src={getImageSrc(image)}
                alt={`Thumbnail ${index + 1}`}
                className="w-full h-full object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = `https://images.unsplash.com/photo-1546198632-9ef6368bef12?w=64&h=64&fit=crop`;
                }}
              />
            </button>
          ))}
        </div>
      )}

      {/* Full Screen Modal */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0 bg-black">
          <div className="relative w-full h-full flex items-center justify-center">
            <img
              src={getImageSrc(images[currentIndex])}
              alt={`${productTitle} - Full view`}
              className="max-w-full max-h-[85vh] object-contain"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = `https://images.unsplash.com/photo-1546198632-9ef6368bef12?w=800&h=800&fit=crop`;
              }}
            />
            
            {/* Close Button */}
            <Button
              variant="ghost"
              size="sm"
              className="absolute top-4 right-4 text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2"
              onClick={() => setIsOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>

            {/* Navigation in Modal */}
            {images.length > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2"
                  onClick={prevImage}
                >
                  <ChevronLeft className="h-6 w-6" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2"
                  onClick={nextImage}
                >
                  <ChevronRight className="h-6 w-6" />
                </Button>
              </>
            )}

            {/* Image Info */}
            <div className="absolute bottom-4 left-4 right-4 text-white text-center">
              <p className="text-lg font-medium">{productTitle}</p>
              {images.length > 1 && (
                <p className="text-sm opacity-75">
                  Image {currentIndex + 1} of {images.length}
                </p>
              )}
            </div>

            {/* Download Button */}
            <Button
              variant="ghost"
              size="sm"
              className="absolute top-4 left-4 text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2"
              onClick={() => {
                const link = document.createElement('a');
                link.href = getImageSrc(images[currentIndex]);
                link.download = `${productTitle}-image-${currentIndex + 1}`;
                link.click();
              }}
            >
              <Download className="h-5 w-5" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}