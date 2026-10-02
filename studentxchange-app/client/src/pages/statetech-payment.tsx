import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCollabAuth } from "@/hooks/use-collab-auth";
import { useToast } from "@/hooks/use-toast";
import { getFirestore, doc, getDoc, updateDoc, Timestamp } from "firebase/firestore";
import app from "@/lib/firebase";
import { 
  ArrowLeft, CheckCircle, Upload, Loader2, CreditCard,
  QrCode, Smartphone, AlertCircle, FileImage
} from "lucide-react";

const db = getFirestore(app);

const PAYMENT_UPI_ID = "Nisarga11069600@aubank";

export default function StatetechPayment() {
  const [, setLocation] = useLocation();
  const { user, status } = useCollabAuth();
  const { toast } = useToast();
  const [registration, setRegistration] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  const [transactionId, setTransactionId] = useState("");
  const [screenshotUrl, setScreenshotUrl] = useState("");
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      setLocation('/student-collab');
      return;
    }
    
    const fetchRegistration = async () => {
      if (!user?.uid) return;
      try {
        const regRef = doc(db, "statetech_registrations", user.uid);
        const regSnap = await getDoc(regRef);
        if (regSnap.exists()) {
          const data = regSnap.data();
          setRegistration(data);
          if (data.paymentStatus === 'paid' || data.paymentStatus === 'exempt') {
            toast({ title: "Payment already completed", description: "Your registration is pending verification." });
          }
        } else {
          toast({ title: "No registration found", description: "Please complete registration first.", variant: "destructive" });
          setLocation('/statetech-2026/register');
        }
      } catch (err) {
        console.error("Error fetching registration:", err);
        toast({ title: "Error", description: "Failed to load registration", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    };

    if (user?.uid) {
      fetchRegistration();
    }
  }, [user?.uid, status, setLocation, toast]);

  const handleScreenshotUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({ title: "Invalid file", description: "Please upload an image file", variant: "destructive" });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "File too large", description: "Maximum file size is 10MB", variant: "destructive" });
      return;
    }

    setScreenshotFile(file);
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'statetech-payments');

      const response = await fetch('/api/upload/firebase', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) throw new Error('Upload failed');

      const result = await response.json();
      setScreenshotUrl(result.url);
      toast({ title: "Success", description: "Screenshot uploaded successfully" });
    } catch (err) {
      console.error("Upload error:", err);
      toast({ title: "Upload failed", description: "Please try again", variant: "destructive" });
      setScreenshotFile(null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmitPayment = async () => {
    if (!transactionId.trim()) {
      toast({ title: "Missing field", description: "Please enter your UPI transaction ID", variant: "destructive" });
      return;
    }
    if (!screenshotUrl) {
      toast({ title: "Missing screenshot", description: "Please upload your payment screenshot", variant: "destructive" });
      return;
    }
    if (!user?.uid) return;

    setIsSubmitting(true);

    try {
      const regRef = doc(db, "statetech_registrations", user.uid);
      await updateDoc(regRef, {
        transactionId,
        paymentScreenshotUrl: screenshotUrl,
        paymentStatus: 'paid',
        verificationStatus: 'under_verification',
        paymentSubmittedAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });

      toast({ title: "Payment submitted!", description: "Your registration is now pending verification." });
      setLocation('/statetech-2026/status');
    } catch (err) {
      console.error("Submit error:", err);
      toast({ title: "Error", description: "Failed to submit payment. Please try again.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading || status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-800 via-blue-800/80 to-indigo-900/90 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
      </div>
    );
  }

  if (registration?.paymentStatus === 'exempt') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-800 via-blue-800/80 to-indigo-900/90">
        <div className="max-w-2xl mx-auto px-4 py-8">
          <Button variant="ghost" onClick={() => setLocation('/statetech-2026')} className="mb-6 text-blue-300 hover:text-white">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to STATETECH
          </Button>
          
          <Card className="border-0 shadow-2xl bg-white/10 backdrop-blur">
            <CardContent className="p-8 text-center">
              <CheckCircle className="h-16 w-16 text-green-400 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-white mb-2">Registration Submitted</h2>
              <p className="text-blue-200 mb-6">
                As a 12th Science student, you are exempted from registration fees.
                Your registration is pending verification.
              </p>
              <div className="bg-green-500/20 border border-green-500/30 rounded-xl p-4">
                <p className="text-green-300 text-sm">
                  <CheckCircle className="h-4 w-4 inline mr-2" />
                  No payment required for 12th Science students
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (registration?.paymentStatus === 'paid') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-800 via-blue-800/80 to-indigo-900/90">
        <div className="max-w-2xl mx-auto px-4 py-8">
          <Button variant="ghost" onClick={() => setLocation('/statetech-2026')} className="mb-6 text-blue-300 hover:text-white">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to STATETECH
          </Button>
          
          <Card className="border-0 shadow-2xl bg-white/10 backdrop-blur">
            <CardContent className="p-8 text-center">
              <CheckCircle className="h-16 w-16 text-green-400 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-white mb-2">Payment Submitted</h2>
              <p className="text-blue-200 mb-6">
                Your payment has been submitted and is pending verification. 
                You will receive an email once your registration is verified.
              </p>
              <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-xl p-4">
                <p className="text-yellow-300 text-sm">
                  <AlertCircle className="h-4 w-4 inline mr-2" />
                  Verification usually takes 24-48 hours
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-800 via-blue-800/80 to-indigo-900/90">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Button variant="ghost" onClick={() => setLocation('/statetech-2026')} className="mb-6 text-blue-300 hover:text-white">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to STATETECH
        </Button>

        <div className="text-center mb-8">
          <CreditCard className="h-12 w-12 text-yellow-400 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-white mb-2">Complete Payment</h1>
          <p className="text-blue-200">STATETECH SHOWCASE 2026</p>
        </div>

        <Card className="border-0 shadow-2xl bg-white/10 backdrop-blur mb-6">
          <CardContent className="p-6">
            <div className="text-center mb-6">
              <p className="text-blue-300 text-sm mb-2">Registration Fee</p>
              <p className="text-4xl font-bold text-white">₹5,000</p>
              <p className="text-yellow-300 text-sm mt-2">
                Category: {registration?.category?.replace('_', ' ').toUpperCase()}
              </p>
            </div>

            <div className="bg-white rounded-2xl p-6 mb-6">
              <div className="text-center mb-4">
                <p className="text-gray-600 text-sm mb-2">Scan QR to Pay</p>
                <p className="text-blue-600 font-medium">{PAYMENT_UPI_ID}</p>
              </div>
              <div className="flex justify-center mb-4">
                <div className="bg-white p-4 rounded-xl border-2 border-blue-900 shadow-lg">
                  <img 
                    src="/attached_assets/image_1769026613987.png" 
                    alt="Payment QR Code" 
                    className="w-48 h-48 object-contain"
                    loading="eager"
                  />
                </div>
              </div>
              <div className="flex items-center justify-center gap-4 text-sm text-gray-500">
                <Smartphone className="h-4 w-4" />
                <span>Works with any UPI App</span>
              </div>
            </div>

            <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-xl p-4 mb-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-yellow-200">
                  <p className="font-medium mb-1">Important Instructions</p>
                  <ol className="list-decimal list-inside space-y-1 text-yellow-300">
                    <li>Scan the QR code using any UPI app</li>
                    <li>Pay exactly ₹5,000</li>
                    <li>Take a screenshot of the payment confirmation</li>
                    <li>Upload the screenshot below</li>
                  </ol>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-2xl bg-white/10 backdrop-blur">
          <CardContent className="p-6">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <FileImage className="h-5 w-5 text-blue-400" />
              Payment Verification
            </h3>

            <div className="space-y-4">
              <div>
                <Label className="text-blue-200">UPI Transaction ID / Reference Number *</Label>
                <Input 
                  value={transactionId}
                  onChange={(e) => setTransactionId(e.target.value)}
                  placeholder="Enter your UPI transaction ID"
                  className="bg-white/10 border-white/20 text-white placeholder:text-blue-300/50 mt-2"
                />
              </div>

              <div>
                <Label className="text-blue-200">Payment Screenshot *</Label>
                <div className="mt-2">
                  <input 
                    type="file"
                    accept="image/*"
                    onChange={handleScreenshotUpload}
                    className="hidden"
                    id="screenshot-upload"
                    disabled={isUploading}
                  />
                  
                  {screenshotUrl ? (
                    <div className="bg-green-500/20 border border-green-500/30 rounded-xl p-4">
                      <div className="flex items-center gap-3">
                        <img src={screenshotUrl} alt="Payment screenshot" className="w-16 h-16 object-cover rounded-lg" loading="lazy" />
                        <div className="flex-1">
                          <p className="text-white font-medium text-sm">Screenshot uploaded</p>
                          <p className="text-green-300 text-xs">Ready for verification</p>
                        </div>
                        <label 
                          htmlFor="screenshot-upload"
                          className="px-4 py-2 bg-white/10 text-blue-300 rounded-lg text-sm cursor-pointer hover:bg-white/20"
                        >
                          Change
                        </label>
                      </div>
                    </div>
                  ) : (
                    <label 
                      htmlFor="screenshot-upload"
                      className={`flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-xl cursor-pointer transition-all ${
                        isUploading 
                          ? 'border-gray-500 bg-gray-500/10' 
                          : 'border-white/20 hover:border-yellow-500/50 hover:bg-white/5'
                      }`}
                    >
                      {isUploading ? (
                        <>
                          <Loader2 className="h-8 w-8 text-blue-400 animate-spin mb-2" />
                          <p className="text-blue-300 text-sm">Uploading...</p>
                        </>
                      ) : (
                        <>
                          <Upload className="h-8 w-8 text-blue-400 mb-2" />
                          <p className="text-white font-medium">Click to upload screenshot</p>
                          <p className="text-blue-300 text-sm">PNG, JPG up to 10MB</p>
                        </>
                      )}
                    </label>
                  )}
                </div>
              </div>
            </div>

            <Button 
              onClick={handleSubmitPayment}
              disabled={isSubmitting || !transactionId || !screenshotUrl}
              className="w-full mt-6 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 py-6 text-lg"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <CheckCircle className="h-5 w-5 mr-2" />
                  Submit Payment for Verification
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
