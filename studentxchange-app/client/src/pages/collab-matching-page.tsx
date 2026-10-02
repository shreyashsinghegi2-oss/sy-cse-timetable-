import { ArrowLeft, Target, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useLocation } from "wouter";

export default function CollabMatchingPage() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation("/collab")}
              className="flex items-center gap-2"
              data-testid="button-back"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <h1 className="text-xl font-bold text-gray-900">Find Your Match</h1>
            <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
              Not available yet
            </span>
          </div>
        </div>
      </div>

      {/* Coming Soon Content */}
      <div className="flex items-center justify-center min-h-[calc(100vh-80px)] px-4">
        <Card className="max-w-2xl w-full bg-white border border-gray-200 shadow-sm">
          <CardContent className="p-12 text-center space-y-6">
            {/* Icon */}
            <div className="inline-block">
              <div className="bg-blue-100 rounded-full p-6">
                <Target className="h-16 w-16 text-blue-600" />
              </div>
            </div>

            {/* Main Heading */}
            <div className="space-y-3">
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900">
                Find Match — Coming Soon
              </h2>
              <p className="text-xl text-gray-600 max-w-xl mx-auto leading-relaxed">
                We're building something exciting to help you connect with like-minded students!
              </p>
            </div>

            {/* Features Preview */}
            <div className="grid md:grid-cols-3 gap-4 py-6">
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                <Sparkles className="h-6 w-6 text-blue-600 mx-auto mb-2" />
                <p className="text-sm text-gray-700 font-medium">Smart Matching</p>
              </div>
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                <Sparkles className="h-6 w-6 text-blue-600 mx-auto mb-2" />
                <p className="text-sm text-gray-700 font-medium">Skill-Based Pairing</p>
              </div>
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                <Sparkles className="h-6 w-6 text-blue-600 mx-auto mb-2" />
                <p className="text-sm text-gray-700 font-medium">Team Discovery</p>
              </div>
            </div>

            {/* Bottom Text */}
            <div className="pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-500">
                Matching is not available yet. You can still discover students
                through the feed and search.
              </p>
            </div>

            {/* Back Button */}
            <Button
              onClick={() => setLocation("/collab")}
              className="bg-blue-600 hover:bg-blue-700"
              data-testid="button-back-to-feed"
            >
              Back to Feed
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
