import React from 'react';
import LazyImage from '@/components/ui/lazy-image';
import { cn } from '@/lib/utils';

interface OptimizedImageDisplayProps {
  thumbnailUrl?: string;
  fullImageUrl?: string;
  alt?: string;
  className?: string;
  containerClassName?: string;
  showFullOnClick?: boolean;
  fallbackSrc?: string;
}

export default function OptimizedImageDisplay({
  thumbnailUrl,
  fullImageUrl,
  alt = '',
  className = '',
  containerClassName = 'w-full h-full',
  showFullOnClick = false,
  fallbackSrc = '/placeholder-image.png',
}: OptimizedImageDisplayProps) {
  // Use thumbnail for listing, full for details
  const displayUrl = thumbnailUrl || fullImageUrl || fallbackSrc;
  const targetUrl = fullImageUrl || thumbnailUrl || fallbackSrc;

  const handleClick = () => {
    if (showFullOnClick && targetUrl) {
      window.open(targetUrl, '_blank');
    }
  };

  return (
    <LazyImage
      src={displayUrl}
      fallbackSrc={fallbackSrc}
      alt={alt}
      className={cn(
        'object-cover',
        showFullOnClick && 'cursor-pointer hover:opacity-90 transition-opacity',
        className
      )}
      containerClassName={containerClassName}
      onClick={showFullOnClick ? handleClick : undefined}
    />
  );
}

interface OptimizedImageGalleryProps {
  thumbnailUrls?: string[];
  fullImageUrls?: string[];
  alt?: string;
  className?: string;
  maxDisplay?: number;
  showFullOnClick?: boolean;
}

export function OptimizedImageGallery({
  thumbnailUrls = [],
  fullImageUrls = [],
  alt = 'Product image',
  className = '',
  maxDisplay = 4,
  showFullOnClick = true,
}: OptimizedImageGalleryProps) {
  const displayImages = thumbnailUrls.slice(0, maxDisplay);
  const hasMore = thumbnailUrls.length > maxDisplay;

  if (displayImages.length === 0) {
    return (
      <div className={cn('bg-gray-100 rounded-lg flex items-center justify-center', className)}>
        <div className="text-gray-400 text-sm">No images</div>
      </div>
    );
  }

  if (displayImages.length === 1) {
    return (
      <OptimizedImageDisplay
        thumbnailUrl={displayImages[0]}
        fullImageUrl={fullImageUrls[0]}
        alt={alt}
        className={cn('w-full h-full rounded-lg', className)}
        showFullOnClick={showFullOnClick}
      />
    );
  }

  return (
    <div className={cn('grid gap-2', className)}>
      {displayImages.length === 2 && (
        <div className="grid grid-cols-2 gap-2">
          {displayImages.map((thumbnail, index) => (
            <OptimizedImageDisplay
              key={index}
              thumbnailUrl={thumbnail}
              fullImageUrl={fullImageUrls[index]}
              alt={`${alt} ${index + 1}`}
              className="w-full h-32 rounded-lg"
              showFullOnClick={showFullOnClick}
            />
          ))}
        </div>
      )}
      
      {displayImages.length === 3 && (
        <div className="grid grid-cols-2 gap-2">
          <OptimizedImageDisplay
            thumbnailUrl={displayImages[0]}
            fullImageUrl={fullImageUrls[0]}
            alt={`${alt} 1`}
            className="w-full h-32 rounded-lg"
            showFullOnClick={showFullOnClick}
          />
          <div className="grid grid-rows-2 gap-2">
            <OptimizedImageDisplay
              thumbnailUrl={displayImages[1]}
              fullImageUrl={fullImageUrls[1]}
              alt={`${alt} 2`}
              className="w-full h-15 rounded-lg"
              showFullOnClick={showFullOnClick}
            />
            <OptimizedImageDisplay
              thumbnailUrl={displayImages[2]}
              fullImageUrl={fullImageUrls[2]}
              alt={`${alt} 3`}
              className="w-full h-15 rounded-lg"
              showFullOnClick={showFullOnClick}
            />
          </div>
        </div>
      )}
      
      {displayImages.length >= 4 && (
        <div className="grid grid-cols-2 gap-2">
          <OptimizedImageDisplay
            thumbnailUrl={displayImages[0]}
            fullImageUrl={fullImageUrls[0]}
            alt={`${alt} 1`}
            className="w-full h-32 rounded-lg"
            showFullOnClick={showFullOnClick}
          />
          <div className="grid grid-rows-2 gap-2">
            <OptimizedImageDisplay
              thumbnailUrl={displayImages[1]}
              fullImageUrl={fullImageUrls[1]}
              alt={`${alt} 2`}
              className="w-full h-15 rounded-lg"
              showFullOnClick={showFullOnClick}
            />
            <div className="relative">
              <OptimizedImageDisplay
                thumbnailUrl={displayImages[2]}
                fullImageUrl={fullImageUrls[2]}
                alt={`${alt} 3`}
                className="w-full h-15 rounded-lg"
                showFullOnClick={showFullOnClick}
              />
              {hasMore && (
                <div className="absolute inset-0 bg-black bg-opacity-50 rounded-lg flex items-center justify-center">
                  <span className="text-white text-sm font-medium">
                    +{thumbnailUrls.length - maxDisplay + 1}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}