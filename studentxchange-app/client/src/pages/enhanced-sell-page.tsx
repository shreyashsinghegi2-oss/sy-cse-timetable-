import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlusCircle, Package, BarChart3, Settings, Zap, Award, Upload } from "lucide-react";
import { trackEvent } from "@/lib/analytics";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import MobileNav from "@/components/layout/mobile-nav";
import { EnhancedSEO } from "@/components/seo/enhanced-seo";
import { SimpleEnhancedPosting } from "@/components/posting/simple-enhanced-posting";
import { ComprehensiveBulkUpload } from "@/components/posting/comprehensive-bulk-upload";
import { useMobileOptimizations } from "@/components/mobile/mobile-optimizations";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";

export default function EnhancedSellPage() {
  const [showPostingFlow, setShowPostingFlow] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  
  // Apply mobile optimizations
  useMobileOptimizations();

  // Check marketplace session auth (returnNull on 401 so no redirect loop)
  const { data: user } = useQuery<any>({
    queryKey: ['/api/user'],
    retry: false,
    meta: { on401: 'returnNull' },
  });

  // Guard: only allow starting the posting flow if logged into marketplace
  const requireAuth = (action: () => void) => {
    if (!user) {
      window.location.href = '/auth?returnTo=/sell';
      return;
    }
    action();
  };

  if (showPostingFlow) {
    return (
      <div className="min-h-screen bg-gray-50">
        <EnhancedSEO 
          title="Sell Your Educational Materials - StudentXchange"
          description="Sell your textbooks, notes, and study materials to fellow students. Quick listing, secure payments."
          keywords="sell textbooks, sell study materials, student marketplace, educational materials"
          canonicalUrl="/sell"
        />
        <Header />
        
        <div className="container mx-auto px-4 py-8">
          <div className="mb-6">
            <Button 
              variant="outline" 
              onClick={() => setShowPostingFlow(false)}
              className="mb-4"
            >
              ← Back to Seller Dashboard
            </Button>
          </div>
          
          <SimpleEnhancedPosting 
            onSuccess={() => setShowPostingFlow(false)}
            onCancel={() => setShowPostingFlow(false)}
          />
        </div>
        
        <MobileNav />
        <Footer />
      </div>
    );
  }

  if (showBulkUpload) {
    return (
      <div className="min-h-screen bg-gray-50">
        <EnhancedSEO 
          title="Bulk Upload - StudentXchange"
          description="Upload multiple products at once to save time"
          keywords="bulk upload, multiple products, seller tools"
          canonicalUrl="/sell"
        />
        <Header />
        
        <div className="container mx-auto px-4 py-8">
          <div className="mb-6">
            <Button 
              variant="outline" 
              onClick={() => setShowBulkUpload(false)}
              className="mb-4"
            >
              ← Back to Seller Dashboard
            </Button>
          </div>
          
          <ComprehensiveBulkUpload 
            onSuccess={() => setShowBulkUpload(false)}
          />
        </div>
        
        <MobileNav />
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <EnhancedSEO 
        title="Sell Your Educational Materials - StudentXchange"
        description="Sell your textbooks, notes, and study materials to fellow students. Quick listing, secure payments."
        keywords="sell textbooks, sell study materials, student marketplace, educational materials"
        canonicalUrl="/sell"
      />
      <Header />
      
      <div className="container mx-auto px-4 py-8">

        {/* Login Status Banner */}
        {!user && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6 flex items-center justify-between">
            <div>
              <p className="font-semibold text-yellow-800">You are not logged into the marketplace</p>
              <p className="text-sm text-yellow-700 mt-1">You need to log in with your marketplace account to list products.</p>
            </div>
            <Link href="/auth">
              <Button className="bg-yellow-600 hover:bg-yellow-700 text-white ml-4 shrink-0">
                Log In to Marketplace
              </Button>
            </Link>
          </div>
        )}
        {user && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-6 flex items-center gap-2">
            <span className="text-green-700 font-medium">✓ Logged in as: {user.username || user.email}</span>
          </div>
        )}

        {/* Hero Section */}
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg p-8 mb-8">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold mb-4">Start Selling Today</h1>
              <p className="text-green-100 mb-6">Turn your unused study materials into cash. Join thousands of successful student sellers.</p>
              <div className="flex flex-wrap gap-4 mb-6">
                <div className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  <span>Quick 4-step listing</span>
                </div>
                <div className="flex items-center gap-2">
                  <Award className="h-5 w-5" />
                  <span>Secure payments</span>
                </div>
                <div className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  <span>Free pickup & delivery</span>
                </div>
              </div>
              <Button 
                size="lg" 
                className="bg-white text-green-600 hover:bg-green-50 font-semibold px-8"
                onClick={() => {
                  requireAuth(() => {
                    trackEvent('start_listing', 'seller', 'post_new_product');
                    setShowPostingFlow(true);
                  });
                }}
              >
                <PlusCircle className="mr-2 h-5 w-5" />
                List Your First Item
              </Button>
            </div>
            <div className="mt-6 md:mt-0 md:ml-8">
              <div className="text-center">
                <div className="text-3xl font-bold">₹2,500</div>
                <div className="text-green-200">Average monthly earnings</div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions - Direct Access */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button 
                className="h-20 justify-start" 
                variant="outline"
                onClick={() => {
                  requireAuth(() => {
                    trackEvent('start_listing', 'seller', 'quick_add_item');
                    setShowPostingFlow(true);
                  });
                }}
              >
                <div className="flex items-center gap-4">
                  <PlusCircle className="h-8 w-8 text-green-600" />
                  <div className="text-left">
                    <div className="font-semibold">Add New Item</div>
                    <div className="text-sm text-muted-foreground">List a new product</div>
                  </div>
                </div>
              </Button>

              <Button 
                className="h-20 justify-start" 
                variant="outline"
                onClick={() => {
                  requireAuth(() => {
                    trackEvent('start_bulk_upload', 'seller', 'bulk_upload_action');
                    setShowBulkUpload(true);
                  });
                }}
              >
                <div className="flex items-center gap-4">
                  <Upload className="h-8 w-8 text-blue-600" />
                  <div className="text-left">
                    <div className="font-semibold">Bulk Upload</div>
                    <div className="text-sm text-muted-foreground">Upload multiple items</div>
                  </div>
                </div>
              </Button>

              <Button 
                className="h-20 justify-start" 
                variant="outline"
                onClick={() => window.location.href = '/seller-listings'}
              >
                <div className="flex items-center gap-4">
                  <Package className="h-8 w-8 text-purple-600" />
                  <div className="text-left">
                    <div className="font-semibold">My Listings</div>
                    <div className="text-sm text-muted-foreground">View & manage items</div>
                  </div>
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Seller Dashboard */}
        <Tabs defaultValue="tips" className="space-y-6">
          <TabsList className="grid w-full grid-cols-1">
            <TabsTrigger value="tips">Pro Tips</TabsTrigger>
          </TabsList>



          <TabsContent value="tips" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Seller Success Tips</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 text-sm">
                  <div className="p-4 bg-green-50 rounded-lg border-l-4 border-green-400">
                    <h4 className="font-semibold text-green-800 mb-2">📸 High-Quality Photos</h4>
                    <p className="text-green-700">Take clear, well-lit photos from multiple angles. Good photos can increase sales by 40%.</p>
                  </div>
                  
                  <div className="p-4 bg-blue-50 rounded-lg border-l-4 border-blue-400">
                    <h4 className="font-semibold text-blue-800 mb-2">💰 Competitive Pricing</h4>
                    <p className="text-blue-700">Research similar items to price competitively. Consider the condition and original price.</p>
                  </div>
                  
                  <div className="p-4 bg-purple-50 rounded-lg border-l-4 border-purple-400">
                    <h4 className="font-semibold text-purple-800 mb-2">📝 Detailed Descriptions</h4>
                    <p className="text-purple-700">Include condition details, edition info, and any defects. Transparency builds trust.</p>
                  </div>
                  
                  <div className="p-4 bg-orange-50 rounded-lg border-l-4 border-orange-400">
                    <h4 className="font-semibold text-orange-800 mb-2">⚡ Quick Responses</h4>
                    <p className="text-orange-700">Respond to inquiries within 24 hours. Fast communication leads to more sales.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>


        </Tabs>
      </div>
      
      <MobileNav />
      <Footer />
    </div>
  );
}