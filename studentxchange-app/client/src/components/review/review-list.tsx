import { useQuery } from "@tanstack/react-query";
import { Star, User } from "lucide-react";
import { format } from "date-fns";
import { getQueryFn } from "@/lib/queryClient";

interface Review {
  id: number;
  userId: number;
  productId: number;
  orderId?: number;
  rating: number;
  comment: string;
  createdAt: string;
  user: {
    id: number;
    username: string;
    fullName: string;
  } | null;
}

interface ReviewListProps {
  productId: number;
}

export default function ReviewList({ productId }: ReviewListProps) {
  const { data: reviews = [], isLoading, error } = useQuery<Review[]>({
    queryKey: ["/api/reviews/product", productId],
    queryFn: getQueryFn({ on401: "throw" })
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="border rounded-lg p-4 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-3/4"></div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600">Failed to load reviews</p>
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No reviews yet. Be the first to review this product!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {reviews.map((review) => (
        <div key={review.id} className="border rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-gray-600" />
              </div>
              <div>
                <p className="font-medium text-sm">
                  {review.user?.fullName || review.user?.username || "Anonymous"}
                </p>
                <p className="text-xs text-gray-500">
                  {format(new Date(review.createdAt), "MMM d, yyyy")}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`w-4 h-4 ${
                    star <= review.rating
                      ? "fill-yellow-400 text-yellow-400"
                      : "text-gray-300"
                  }`}
                />
              ))}
            </div>
          </div>
          {review.comment && (
            <p className="text-sm text-gray-700 leading-relaxed">
              {review.comment}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}