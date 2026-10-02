import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lightbulb, BookOpen, FileText, PenTool, FlaskConical, Package } from "lucide-react";

const pricingData = [
  {
    category: "Textbooks (UG/PG)",
    icon: <BookOpen className="h-4 w-4" />,
    conditions: [
      {
        condition: "New/Like New",
        price: "50% of MRP",
        notes: "Mention edition & subject clearly",
        color: "bg-green-100 text-green-800"
      },
      {
        condition: "Used with notes",
        price: "30%-50% of MRP",
        notes: "Highlight extra notes or marks",
        color: "bg-yellow-100 text-yellow-800"
      }
    ]
  },
  {
    category: "Assignments",
    icon: <FileText className="h-4 w-4" />,
    conditions: [
      {
        condition: "Unique / Well-written",
        price: "₹5 per page",
        notes: "Clearly scanned, no blur",
        color: "bg-blue-100 text-blue-800"
      }
    ]
  },
  {
    category: "Handwritten Notes",
    icon: <PenTool className="h-4 w-4" />,
    conditions: [
      {
        condition: "Neat & complete",
        price: "₹5 per page",
        notes: "Mention subject, chapter names",
        color: "bg-purple-100 text-purple-800"
      }
    ]
  },
  {
    category: "Lab Journals",
    icon: <FlaskConical className="h-4 w-4" />,
    conditions: [
      {
        condition: "Clean & full syllabus",
        price: "₹5 per page",
        notes: "Mention branch/year & experiment titles",
        color: "bg-orange-100 text-orange-800"
      }
    ]
  },
  {
    category: "Stationery Sets",
    icon: <Package className="h-4 w-4" />,
    conditions: [
      {
        condition: "New / Bundled Items",
        price: "50% of MRP",
        notes: "Bundle for value (e.g., 5 pens + ruler combo)",
        color: "bg-pink-100 text-pink-800"
      }
    ]
  }
];

const sellerTips = [
  "Set the price as low as you can handle — low prices attract faster buyers.",
  "Use clear images and honest condition details.",
  "Mention subject, semester, and MRP (if applicable).",
  "Bundle similar items (e.g., All Semester 4 Notes for ₹99).",
  "Avoid overpricing—buyers compare with new rates & peers."
];

export default function SellerPricingGuide() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-blue-600" />
            StudentXchange Seller Pricing Guide
          </CardTitle>
          <p className="text-sm text-gray-600">
            This pricing index helps you set a smart, fair, and student-friendly price when listing your educational items.
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {pricingData.map((category, index) => (
              <div key={index} className="border-l-4 border-blue-500 pl-4">
                <div className="flex items-center gap-2 mb-3">
                  {category.icon}
                  <h3 className="font-semibold text-gray-900">{category.category}</h3>
                </div>
                <div className="space-y-2">
                  {category.conditions.map((condition, condIndex) => (
                    <div key={condIndex} className="grid grid-cols-1 sm:grid-cols-4 gap-2 sm:gap-4 p-3 bg-gray-50 rounded-lg">
                      <div className="font-medium text-gray-700">
                        {condition.condition}
                      </div>
                      <div className="text-center">
                        <Badge className={`${condition.color} border-0`}>
                          {condition.price}
                        </Badge>
                      </div>
                      <div className="text-sm text-gray-600 sm:col-span-2">
                        {condition.notes}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-yellow-600" />
            Seller Tips
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {sellerTips.map((tip, index) => (
              <div key={index} className="flex items-start gap-3">
                <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-sm text-gray-700">{tip}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}