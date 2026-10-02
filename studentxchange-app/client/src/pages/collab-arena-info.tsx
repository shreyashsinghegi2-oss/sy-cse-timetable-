import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useCollabAuth } from "@/hooks/use-collab-auth";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeft, CheckCircle, AlertCircle, FileText, Award, 
  Clock, Shield, Sparkles, ArrowRight
} from "lucide-react";

import { PLATFORM_ADMIN_EMAIL } from "@/config/constants";
const ADMIN_EMAIL = PLATFORM_ADMIN_EMAIL;

export default function CollabArenaInfo() {
  const [, setLocation] = useLocation();
  const { user, isAuthenticated } = useCollabAuth();
  const { toast } = useToast();
  
  const isAdmin = user?.email === ADMIN_EMAIL;

  const handleContinue = () => {
    if (!isAuthenticated) {
      toast({
        title: "Sign in required",
        description: "Please sign in to register for Collab Arena",
        variant: "destructive"
      });
      return;
    }
    if (!isAdmin) {
      toast({
        title: "Registration Closed",
        description: "Registration for Collab Arena has ended. You can still view the arena feed.",
        variant: "destructive"
      });
      return;
    }
    setLocation('/collab-arena/register');
  };

  return (
    <div className="min-h-screen bg-gray-50 overflow-y-auto pb-24">
      <div className="max-w-2xl mx-auto px-4 py-8 safe-area-inset">
        <button 
          onClick={() => setLocation('/collab-arena')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
          data-testid="button-back-to-arena"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Collab Arena
        </button>

        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Registration Information
          </h1>
          <p className="text-gray-600">
            Please read carefully before proceeding
          </p>
        </div>

        <Card className="mb-6 border-0 shadow-lg bg-white/80 backdrop-blur">
          <CardContent className="p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Rules & Guidelines
            </h2>
            <ul className="space-y-3 text-gray-700">
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">1</span>
                <span>Each registration is for <strong>one project in one category</strong>. To enter multiple categories, register separately for each.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">2</span>
                <span>You can submit <strong>previously created work</strong> or create something new during the competition period.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">3</span>
                <span>All work must be <strong>your original creation</strong>. Plagiarized content will be disqualified.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">4</span>
                <span>Your entry is only valid after <strong>payment verification</strong> by our team.</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card className="mb-6 border-0 shadow-lg bg-white/80 backdrop-blur">
          <CardContent className="p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-500" />
              Timeline Reminder
            </h2>
            <div className="bg-blue-50 rounded-xl p-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Submission Deadline</p>
                  <p className="font-bold text-blue-600">16 Jan 2026</p>
                </div>
                <div>
                  <p className="text-gray-500">Results</p>
                  <p className="font-bold text-green-600">20 Jan 2026</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6 border-0 shadow-lg bg-white/80 backdrop-blur">
          <CardContent className="p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Award className="h-5 w-5 text-yellow-500" />
              What You Get
            </h2>
            <ul className="space-y-2 text-gray-700">
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>Official <strong>Participation Certificate</strong></span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>Chance to win <strong>cash prizes</strong> up to ₹10,000</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span><strong>Merit Certificate</strong> for winners & runner-ups</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>Recognition from <strong>Entrepreneurship Club, ADYPU</strong></span>
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card className="mb-8 border-0 shadow-lg bg-gradient-to-r from-green-500 to-emerald-600 text-white">
          <CardContent className="p-6">
            <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Registration Fee
            </h2>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold">₹50</p>
                <p className="text-green-100 text-sm">One-time payment per entry</p>
              </div>
              <div className="text-right text-green-100 text-sm">
                <p>Secure UPI Payment</p>
                <p>Instant Verification</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-8">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-yellow-800">
              <p className="font-semibold mb-1">Important Note</p>
              <p>After completing the form, you'll be asked to pay ₹50 via UPI and upload the payment screenshot. Your registration will be confirmed only after our team verifies the payment (usually within 2-4 hours).</p>
            </div>
          </div>
        </div>

        <div className="text-center">
          {isAdmin ? (
            <Button 
              size="lg"
              onClick={handleContinue}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-10 py-6 text-lg rounded-2xl shadow-lg hover:shadow-xl transition-all"
              data-testid="button-continue-registration"
            >
              Continue to Registration
              <ArrowRight className="h-5 w-5 ml-2" />
            </Button>
          ) : (
            <div className="space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <div className="flex items-center justify-center gap-2 text-red-600 font-semibold">
                  <AlertCircle className="h-5 w-5" />
                  Registration Closed
                </div>
                <p className="text-red-600 text-sm mt-2">
                  Registration for Collab Arena has ended. You can still view the arena feed and all submissions.
                </p>
              </div>
              <Button 
                size="lg"
                onClick={() => setLocation('/collab-arena')}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-10 py-6 text-lg rounded-2xl shadow-lg hover:shadow-xl transition-all"
              >
                View Arena Feed
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
