import { useState } from "react";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useSimpleToast } from "@/hooks/use-simple-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface ReviewFormProps {
  productId: number;
  userId: number;
  orderId?: number;
  onSubmit?: () => void;
}

export default function ReviewForm({ productId, userId, orderId, onSubmit }: ReviewFormProps) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [hoveredRating, setHoveredRating] = useState(0);
  const { toast } = useSimpleToast();
  const queryClient = useQueryClient();

  const reviewMutation = useMutation({
    mutationFn: async (data: { userId: number; productId: number; orderId?: number; rating: number; comment: string }) => {
      const response = await apiRequest("POST", "/api/reviews", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Review submitted",
        description: "Thank you for your review!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/reviews/product", productId] });
      queryClient.invalidateQueries({ queryKey: ["/api/products", productId, "rating"] });
      setRating(0);
      setComment("");
      onSubmit?.();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit review",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (rating === 0) {
      toast({
        title: "Rating required",
        description: "Please select a rating",
        variant: "destructive",
      });
      return;
    }

    reviewMutation.mutate({
      userId,
      productId,
      orderId,
      rating,
      comment: comment.trim()
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-sm font-medium mb-2 block">Your Rating</label>
        <div className="flex items-center space-x-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              className="p-1 hover:scale-110 transition-transform"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoveredRating(star)}
              onMouseLeave={() => setHoveredRating(0)}
            >
              <Star
                className={`w-6 h-6 ${
                  star <= (hoveredRating || rating)
                    ? "fill-yellow-400 text-yellow-400"
                    : "text-gray-300"
                }`}
              />
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-sm font-medium mb-2 block">Your Review</label>
        <Textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Share your thoughts about this product..."
          className="min-h-[100px]"
        />
      </div>

      <Button 
        type="submit" 
        disabled={reviewMutation.isPending}
        className="w-full"
      >
        {reviewMutation.isPending ? "Submitting..." : "Submit Review"}
      </Button>
    </form>
  );
}