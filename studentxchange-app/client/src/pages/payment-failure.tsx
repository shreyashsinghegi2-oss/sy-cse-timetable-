import { useLocation } from "wouter";
import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { XCircle } from "lucide-react";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";

export default function PaymentFailurePage() {
  const [, navigate] = useLocation();
  
  const urlParams = new URLSearchParams(window.location.search);
  const txnid = urlParams.get('txnid');
  const error = urlParams.get('error');

  useEffect(() => {
    sessionStorage.removeItem('payuCheckoutData');
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto">
          <Card className="text-center">
            <CardHeader>
              <div className="mx-auto mb-4">
                <XCircle className="h-16 w-16 text-red-500" />
              </div>
              <CardTitle className="text-2xl text-red-600">Payment Failed</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-600">
                Unfortunately, your payment could not be processed.
              </p>
              
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-left">
                  <p className="text-sm text-red-600">{decodeURIComponent(error)}</p>
                </div>
              )}
              
              {txnid && (
                <div className="bg-gray-50 rounded-lg p-4 text-left">
                  <p className="text-sm text-gray-500">Transaction ID</p>
                  <p className="font-mono text-sm">{txnid}</p>
                </div>
              )}

              <div className="flex flex-col gap-2 pt-4">
                <Button onClick={() => navigate("/checkout")} className="w-full">
                  Try Again
                </Button>
                <Button variant="outline" onClick={() => navigate("/")} className="w-full">
                  Back to Home
                </Button>
              </div>
              
              <p className="text-xs text-gray-500 mt-4">
                If money was deducted from your account, please contact support at 7039862086
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
}
