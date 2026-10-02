import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PLATFORM_ADMIN_EMAIL } from "@/config/constants";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCollabAuth } from "@/hooks/use-collab-auth";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { 
  ArrowLeft, Upload, CreditCard, CheckCircle, Loader2,
  Copy, AlertCircle, Smartphone, IndianRupee
} from "lucide-react";
import arenaQrCode from "../../../attached_assets/WhatsApp_Image_2026-01-08_at_3.52.08_PM_1767867794562.jpeg";

interface RegistrationData {
  fullName: string;
  email: string;
  mobile: string;
  college: string;
  courseYear: string;
  categories: string[];
  projectTitle?: string;
  amountToPay: number;
}

const PRICE_PER_CATEGORY = 50;
const ADMIN_EMAIL = PLATFORM_ADMIN_EMAIL;

export default function CollabArenaPayment() {
  const [, setLocation] = useLocation();
  const { user, isAuthenticated } = useCollabAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [registrationData, setRegistrationData] = useState<RegistrationData | null>(null);
  const [transactionId, setTransactionId] = useState("");
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const UPI_ID = "hrishikesh.vallakati2006-1@okicici";
  const isAdmin = user?.email === ADMIN_EMAIL;

  useEffect(() => {
    if (!isAdmin) {
      setLocation('/collab-arena');
      return;
    }
    const storedData = sessionStorage.getItem('arenaRegistration');
    if (storedData) {
      const data = JSON.parse(storedData);
      if (Array.isArray(data.categories) && data.categories.length > 0) {
        setRegistrationData(data);
      } else {
        setLocation('/collab-arena/register');
      }
    } else {
      setLocation('/collab-arena/register');
    }
  }, [setLocation, isAdmin]);

  const copyUPI = () => {
    navigator.clipboard.writeText(UPI_ID);
    toast({
      title: "Copied!",
      description: "UPI ID copied to clipboard",
    });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please upload an image under 5MB",
          variant: "destructive"
        });
        return;
      }
      setScreenshotFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setScreenshotPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!registrationData || !transactionId || !screenshotFile) {
        throw new Error("Missing required fields");
      }

      const expectedAmount = registrationData.categories.length * PRICE_PER_CATEGORY;
      if (registrationData.amountToPay !== expectedAmount) {
        throw new Error("Amount mismatch detected");
      }

      setIsUploading(true);

      const token = localStorage.getItem('collabAuthToken');
      
      const formData = new FormData();
      formData.append('file', screenshotFile);

      const uploadRes = await fetch('/api/collab/social/upload-media', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      if (!uploadRes.ok) throw new Error('Failed to upload screenshot');
      const { mediaUrl } = await uploadRes.json();

      const res = await fetch('/api/collab/social/arena/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          fullName: registrationData.fullName,
          email: registrationData.email,
          mobile: registrationData.mobile,
          college: registrationData.college,
          courseYear: registrationData.courseYear,
          categories: registrationData.categories,
          projectTitle: registrationData.projectTitle || '',
          amountPaid: registrationData.amountToPay,
          transactionId,
          paymentScreenshotUrl: mediaUrl
        })
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to submit registration');
      }

      return res.json();
    },
    onSuccess: () => {
      sessionStorage.removeItem('arenaRegistration');
      queryClient.invalidateQueries({ queryKey: ['/api/collab/social/arena/registrations'] });
      toast({
        title: "Registration Submitted!",
        description: "Your payment is pending verification. We'll confirm within 2-4 hours.",
      });
      setLocation('/collab-arena');
    },
    onError: (error: any) => {
      toast({
        title: "Submission Failed",
        description: error.message || "Please try again",
        variant: "destructive"
      });
    },
    onSettled: () => {
      setIsUploading(false);
    }
  });

  const handleSubmit = () => {
    if (!transactionId.trim()) {
      toast({
        title: "Transaction ID required",
        description: "Please enter the UPI transaction ID",
        variant: "destructive"
      });
      return;
    }
    if (!screenshotFile) {
      toast({
        title: "Screenshot required",
        description: "Please upload the payment screenshot",
        variant: "destructive"
      });
      return;
    }
    submitMutation.mutate();
  };

  if (!isAuthenticated || !registrationData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const getCategoryLabel = (cat: string) => {
    switch (cat) {
      case 'creative': return '🎨 Creative House';
      case 'idea': return '💡 Innovative Ideas';
      case 'tech': return '💻 House of Tech';
      default: return cat;
    }
  };

  const totalAmount = registrationData.amountToPay;

  return (
    <div className="min-h-screen bg-gray-50 overflow-y-auto pb-24">
      <div className="max-w-xl mx-auto px-4 py-8">
        <button 
          onClick={() => setLocation('/collab-arena/register')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
          data-testid="button-back-to-register"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <CreditCard className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Complete Payment
          </h1>
          <p className="text-gray-600 text-sm">
            Collab Arena 2026 - Step 2 of 2
          </p>
        </div>

        <Card className="mb-6 border-0 shadow-lg bg-white/80 backdrop-blur">
          <CardContent className="p-6">
            <h3 className="font-semibold text-gray-900 mb-3">Registration Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Name</span>
                <span className="font-medium">{registrationData.fullName}</span>
              </div>
              <div className="flex justify-between items-start">
                <span className="text-gray-500">Categories</span>
                <div className="text-right">
                  {registrationData.categories.map((cat, idx) => (
                    <div key={cat} className="font-medium">{getCategoryLabel(cat)}</div>
                  ))}
                </div>
              </div>
              {registrationData.projectTitle && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Project</span>
                  <span className="font-medium truncate max-w-[200px]">{registrationData.projectTitle}</span>
                </div>
              )}
            </div>

            <div className="mt-4 pt-4 border-t border-gray-200">
              <h4 className="font-medium text-gray-700 mb-2">Payment Breakdown</h4>
              {registrationData.categories.map((cat) => (
                <div key={cat} className="flex justify-between text-sm">
                  <span className="text-gray-500">{getCategoryLabel(cat)}</span>
                  <span>₹{PRICE_PER_CATEGORY}</span>
                </div>
              ))}
              <div className="flex justify-between font-bold text-lg mt-2 pt-2 border-t border-gray-200">
                <span>Total</span>
                <span className="text-green-600">₹{totalAmount}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6 border-0 shadow-lg bg-gradient-to-r from-green-500 to-emerald-600 text-white">
          <CardContent className="p-6 text-center">
            <p className="text-green-100 mb-2">Amount to Pay</p>
            <p className="text-5xl font-bold mb-4 flex items-center justify-center gap-1">
              <IndianRupee className="h-10 w-10" />
              {totalAmount}
            </p>
            
            <div className="bg-white rounded-2xl p-4 mb-4 mx-auto max-w-xs">
              <img 
                src={arenaQrCode} 
                alt="Scan QR to pay" 
                className="w-full rounded-xl"
                loading="eager"
                style={{ aspectRatio: '1/1', objectFit: 'contain' }}
              />
            </div>
            
            <p className="text-sm text-green-100 mb-2">Or pay using UPI ID</p>
            <div className="bg-white/20 backdrop-blur rounded-xl p-4">
              <div className="flex items-center justify-center gap-2">
                <code className="text-lg font-mono">{UPI_ID}</code>
                <button 
                  onClick={copyUPI}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                  data-testid="button-copy-upi"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6 border-0 shadow-lg bg-white/80 backdrop-blur">
          <CardContent className="p-6">
            <div className="flex items-start gap-3 mb-4">
              <Smartphone className="h-5 w-5 text-blue-500 flex-shrink-0 mt-1" />
              <div className="text-sm text-gray-700">
                <p className="font-semibold mb-1">How to Pay:</p>
                <ol className="list-decimal list-inside space-y-1 text-gray-600">
                  <li>Open any UPI app (Google Pay, PhonePe, Paytm, etc.)</li>
                  <li>Send ₹{totalAmount} to the UPI ID above</li>
                  <li>Take a screenshot of the payment confirmation</li>
                  <li>Fill in the details below</li>
                </ol>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6 border-0 shadow-lg bg-white/80 backdrop-blur">
          <CardContent className="p-6 space-y-4">
            <div>
              <Label htmlFor="transactionId">Transaction ID / UTR Number *</Label>
              <Input 
                id="transactionId"
                placeholder="Enter the transaction ID from your UPI app"
                value={transactionId}
                onChange={(e) => setTransactionId(e.target.value)}
                className="mt-1"
                data-testid="input-transaction-id"
              />
              <p className="text-xs text-gray-500 mt-1">
                You can find this in your payment confirmation
              </p>
            </div>

            <div>
              <Label>Payment Screenshot *</Label>
              <input 
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              {screenshotPreview ? (
                <div className="mt-2 relative">
                  <img 
                    src={screenshotPreview} 
                    alt="Payment screenshot" 
                    className="w-full max-h-64 object-contain rounded-xl border"
                    loading="lazy"
                  />
                  <button
                    onClick={() => {
                      setScreenshotFile(null);
                      setScreenshotPreview(null);
                    }}
                    className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                    data-testid="button-remove-screenshot"
                  >
                    ×
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-2 w-full border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-blue-400 hover:bg-blue-50 transition-colors"
                  data-testid="button-upload-screenshot"
                >
                  <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-600 font-medium">Click to upload screenshot</p>
                  <p className="text-xs text-gray-400">PNG, JPG up to 5MB</p>
                </button>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-yellow-800">
              <p className="font-semibold mb-1">What happens next?</p>
              <p>After you submit, our team will verify your payment. Once verified, your registration will be <strong>confirmed</strong> and you'll see the status update on the Collab Arena page. This usually takes 2-4 hours.</p>
            </div>
          </div>
        </div>

        <Button 
          size="lg"
          onClick={handleSubmit}
          disabled={submitMutation.isPending || isUploading}
          className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold py-6 text-lg rounded-2xl shadow-lg"
          data-testid="button-submit-payment"
        >
          {submitMutation.isPending || isUploading ? (
            <>
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              <CheckCircle className="h-5 w-5 mr-2" />
              Submit Payment (₹{totalAmount})
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
