import { Skeleton } from "./skeleton";
import { Card } from "./card";

export function ProductCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      {/* Image skeleton */}
      <Skeleton className="h-56 w-full rounded-none" />
      
      {/* Content skeleton */}
      <div className="p-4 space-y-3">
        {/* Title */}
        <Skeleton className="h-4 w-3/4" />
        
        {/* Description */}
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-2/3" />
        
        {/* Condition and rating */}
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-4 w-20" />
        </div>
        
        {/* Price and button */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-3 w-20" />
          </div>
          <Skeleton className="h-8 w-20" />
        </div>
      </div>
      
      {/* Payment protection badge */}
      <div className="px-4 pb-4">
        <Skeleton className="h-6 w-full" />
      </div>
    </Card>
  );
}

export function ProductGridSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {Array.from({ length: 8 }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}