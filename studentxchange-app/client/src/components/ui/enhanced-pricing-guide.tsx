import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Target, TrendingUp, CheckCircle, AlertCircle } from "lucide-react";

interface PricingGuideProps {
  selectedCategory?: string;
  currentPrice?: string;
  className?: string;
}

const categoryData = {
  "Textbooks": {
    icon: "📚",
    description: "50% MRP for new, 30-50% for used",
    minPrice: 100,
    maxPrice: 500,
    proTip: "Popular textbooks sell quickly. Mention edition & subject clearly.",
    color: "bg-blue-50 border-blue-200"
  },
  "Assignments": {
    icon: "📄",
    description: "₹5 per page for unique/well-written",
    minPrice: 30,
    maxPrice: 150,
    proTip: "Original assignments with good grades sell better.",
    color: "bg-yellow-50 border-yellow-200"
  },
  "Handwritten Notes": {
    icon: "📝",
    description: "₹5 per page for neat & complete",
    minPrice: 50,
    maxPrice: 200,
    proTip: "Well-organized notes with clear handwriting command higher prices.",
    color: "bg-green-50 border-green-200"
  },
  "Notes": {
    icon: "📝",
    description: "₹5 per page for neat & complete",
    minPrice: 50,
    maxPrice: 200,
    proTip: "Well-organized notes with clear handwriting command higher prices.",
    color: "bg-green-50 border-green-200"
  },
  "Lab Journals": {
    icon: "🧪",
    description: "₹5 per page for clean & full syllabus",
    minPrice: 100,
    maxPrice: 300,
    proTip: "Complete lab journals with all experiments are in high demand.",
    color: "bg-purple-50 border-purple-200"
  },
  "Stationery": {
    icon: "✏️",
    description: "50% MRP for bundled items",
    minPrice: 20,
    maxPrice: 200,
    proTip: "Bundle similar items for value (e.g., 5 pens + ruler combo).",
    color: "bg-orange-50 border-orange-200"
  }
};

export function EnhancedPricingGuide({ selectedCategory, currentPrice, className }: PricingGuideProps) {
  const priceNum = currentPrice ? parseFloat(currentPrice) : 0;
  const categoryInfo = selectedCategory && categoryData[selectedCategory as keyof typeof categoryData];

  return (
    <Card className={`${categoryInfo?.color || 'bg-blue-50 border-blue-200'} border-2 ${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Target className="h-5 w-5 text-blue-600" />
          <span className="font-bold text-gray-800">Pricing Guide</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Core Pricing Information */}
        <div className="bg-white rounded-lg p-3 border border-gray-200">
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <span>📚</span>
              <span><strong>Textbooks:</strong> 50% MRP for new, 30-50% for used</span>
            </div>
            <div className="flex items-center gap-2">
              <span>📄</span>
              <span><strong>Assignments:</strong> ₹5 per page for unique/well-written</span>
            </div>
            <div className="flex items-center gap-2">
              <span>📝</span>
              <span><strong>Handwritten Notes:</strong> ₹5 per page for neat & complete</span>
            </div>
            <div className="flex items-center gap-2">
              <span>🧪</span>
              <span><strong>Lab Journals:</strong> ₹5 per page for clean & full syllabus</span>
            </div>
            <div className="flex items-center gap-2">
              <span>✏️</span>
              <span><strong>Stationery Sets:</strong> 50% MRP for bundled items</span>
            </div>
          </div>
        </div>

        {/* Color-coded Price Feedback */}
        {currentPrice && priceNum > 0 && categoryInfo && (
          <div className="bg-white rounded-lg p-3 border border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">{categoryInfo.icon}</span>
              <span className="font-semibold text-gray-800">Your Price: ₹{currentPrice}</span>
            </div>
            <div className="text-sm">
              {priceNum < categoryInfo.minPrice && (
                <div className="text-orange-600 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Consider pricing higher for better value
                </div>
              )}
              {priceNum >= categoryInfo.minPrice && priceNum <= categoryInfo.maxPrice && (
                <div className="text-green-600 flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" />
                  Great pricing for this category!
                </div>
              )}
              {priceNum > categoryInfo.maxPrice && (
                <div className="text-red-600 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Price seems high compared to similar items
                </div>
              )}
            </div>
          </div>
        )}

        {/* Pro Tip for Selected Category */}
        {categoryInfo && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-3 border border-blue-200">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-semibold text-blue-800">Pro Tip</span>
            </div>
            <div className="text-xs text-blue-700 leading-relaxed">{categoryInfo.proTip}</div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default EnhancedPricingGuide;