import { useQuery } from "@tanstack/react-query";
import { Star } from "lucide-react";
import { getQueryFn } from "@/lib/queryClient";

interface RatingData {
  averageRating: number;
  totalReviews: number;
}

interface RatingDisplayProps {
  productId: number;
  className?: string;
}

export default function RatingDisplay({ productId, className = "" }: RatingDisplayProps) {
  const { data: ratingData, isLoading } = useQuery<RatingData>({
    queryKey: ["/api/products", productId, "rating"],
    queryFn: getQueryFn({ on401: "throw" })
  });

  if (isLoading) {
    return (
      <div className={`flex items-center space-x-1 ${className}`}>
        <div className="w-4 h-4 bg-gray-200 rounded animate-pulse"></div>
        <div className="w-8 h-3 bg-gray-200 rounded animate-pulse"></div>
        <div className="w-16 h-3 bg-gray-200 rounded animate-pulse"></div>
      </div>
    );
  }

  if (!ratingData || ratingData.totalReviews === 0) {
    return (
      <div className={`flex items-center space-x-1 text-gray-500 ${className}`}>
        <Star className="w-4 h-4" />
        <span className="text-sm">No reviews yet</span>
      </div>
    );
  }

  const { averageRating, totalReviews } = ratingData;

  return (
    <div className={`flex items-center space-x-1 ${className}`}>
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${
              star <= Math.round(averageRating)
                ? "fill-yellow-400 text-yellow-400"
                : "text-gray-300"
            }`}
          />
        ))}
      </div>
      <span className="text-sm font-medium">{Number(averageRating).toFixed(1)}</span>
      <span className="text-xs text-gray-500">
        ({totalReviews} review{totalReviews !== 1 ? "s" : ""})
      </span>
    </div>
  );
}