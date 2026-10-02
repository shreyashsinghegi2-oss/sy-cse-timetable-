import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import MobileNav from "@/components/layout/mobile-nav";
import SEOHead from "@/components/seo/seo-head";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { AlertTriangle, Shield, Eye } from "lucide-react";

export default function DisclaimerPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <SEOHead
        title="Disclaimer - StudentXchange"
        description="Important disclaimers and limitations of liability for StudentXchange platform users. Understand your responsibilities when using our service."
        canonical="https://studentxchange.in/disclaimer"
      />
      <Header />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="shadow-sm">
          <CardHeader className="text-center">
            <h1 className="text-3xl font-bold text-gray-900">Disclaimer</h1>
            <p className="text-gray-600 mt-2">Effective Date: 22 July 2025</p>
          </CardHeader>
          
          <CardContent>
            <div className="space-y-6">
              {/* Warning Banner */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="h-6 w-6 text-yellow-600 mt-1" />
                  <div>
                    <h3 className="text-lg font-semibold text-yellow-800 mb-2">Important Notice</h3>
                    <p className="text-yellow-700">
                      All content on StudentXchange is submitted by users. We do not guarantee the accuracy, legality, or safety of any listing or transaction. Please exercise caution and due diligence in all interactions.
                    </p>
                  </div>
                </div>
              </div>

              <Separator />

              <section>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4 flex items-center">
                  <Shield className="h-6 w-6 mr-2 text-blue-600" />
                  Platform Limitations
                </h2>
                
                <div className="space-y-4">
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <h3 className="font-semibold text-red-800 mb-2">User-Generated Content</h3>
                    <ul className="list-disc list-inside text-red-700 space-y-1">
                      <li>We are not responsible for the accuracy of user-posted information</li>
                      <li>Product descriptions, images, and conditions are provided by sellers</li>
                      <li>We do not verify the authenticity or legality of listed items</li>
                      <li>Users are solely responsible for their listings and communications</li>
                    </ul>
                  </div>

                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                    <h3 className="font-semibold text-orange-800 mb-2">Transaction Responsibility</h3>
                    <ul className="list-disc list-inside text-orange-700 space-y-1">
                      <li>We are not a party to user-to-user transactions</li>
                      <li>Disputes between buyers and sellers must be resolved directly</li>
                      <li>We do not guarantee successful completion of transactions</li>
                      <li>Payment processing is handled by third-party providers</li>
                    </ul>
                  </div>
                </div>
              </section>

              <Separator />

              <section>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4 flex items-center">
                  <Eye className="h-6 w-6 mr-2 text-purple-600" />
                  Content Verification
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="font-semibold text-gray-800">What We Don't Verify:</h3>
                    <ul className="space-y-2">
                      <li className="flex items-start space-x-2">
                        <span className="text-red-500">✗</span>
                        <span className="text-gray-700">Product authenticity or condition</span>
                      </li>
                      <li className="flex items-start space-x-2">
                        <span className="text-red-500">✗</span>
                        <span className="text-gray-700">Seller credentials or identity</span>
                      </li>
                      <li className="flex items-start space-x-2">
                        <span className="text-red-500">✗</span>
                        <span className="text-gray-700">Academic material accuracy</span>
                      </li>
                      <li className="flex items-start space-x-2">
                        <span className="text-red-500">✗</span>
                        <span className="text-gray-700">Copyright compliance</span>
                      </li>
                    </ul>
                  </div>
                  
                  <div className="space-y-4">
                    <h3 className="font-semibold text-gray-800">Your Responsibility:</h3>
                    <ul className="space-y-2">
                      <li className="flex items-start space-x-2">
                        <span className="text-green-500">✓</span>
                        <span className="text-gray-700">Verify product details before purchasing</span>
                      </li>
                      <li className="flex items-start space-x-2">
                        <span className="text-green-500">✓</span>
                        <span className="text-gray-700">Communicate directly with sellers</span>
                      </li>
                      <li className="flex items-start space-x-2">
                        <span className="text-green-500">✓</span>
                        <span className="text-gray-700">Report suspicious or illegal content</span>
                      </li>
                      <li className="flex items-start space-x-2">
                        <span className="text-green-500">✓</span>
                        <span className="text-gray-700">Use common sense and caution</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </section>

              <Separator />

              <section>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">Risk and Liability</h2>
                
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                  <h3 className="font-semibold text-gray-800 mb-3">Use at Your Own Risk</h3>
                  <p className="text-gray-700 mb-4">
                    By using StudentXchange, you acknowledge and agree that:
                  </p>
                  
                  <div className="space-y-3">
                    <div className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-red-500 rounded-full mt-2"></div>
                      <p className="text-gray-700">
                        <strong>Personal Risk:</strong> All transactions and interactions are at your own risk
                      </p>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-red-500 rounded-full mt-2"></div>
                      <p className="text-gray-700">
                        <strong>No Guarantees:</strong> We make no warranties about platform availability or functionality
                      </p>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-red-500 rounded-full mt-2"></div>
                      <p className="text-gray-700">
                        <strong>Limited Liability:</strong> Our liability is limited to the maximum extent allowed by law
                      </p>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-red-500 rounded-full mt-2"></div>
                      <p className="text-gray-700">
                        <strong>Third-Party Services:</strong> We are not responsible for third-party payment or shipping services
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              <Separator />

              <section>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">Safety Guidelines</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="font-semibold text-blue-800 mb-3">For Buyers:</h3>
                    <ul className="list-disc list-inside text-blue-700 space-y-1 text-sm">
                      <li>Meet sellers in public places</li>
                      <li>Inspect items before payment</li>
                      <li>Use secure payment methods</li>
                      <li>Keep transaction records</li>
                      <li>Report suspicious behavior</li>
                    </ul>
                  </div>
                  
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h3 className="font-semibold text-green-800 mb-3">For Sellers:</h3>
                    <ul className="list-disc list-inside text-green-700 space-y-1 text-sm">
                      <li>Post accurate descriptions</li>
                      <li>Use your own photos</li>
                      <li>Be honest about condition</li>
                      <li>Respond promptly to inquiries</li>
                      <li>Follow through on commitments</li>
                    </ul>
                  </div>
                </div>
              </section>

              <Separator />

              <section>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">Legal Compliance</h2>
                
                <div className="space-y-4">
                  <p className="text-gray-700">
                    Users are responsible for ensuring their activities comply with all applicable laws, including but not limited to:
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-purple-50 rounded-lg">
                      <h4 className="font-medium text-purple-800 mb-2">Copyright Laws</h4>
                      <p className="text-sm text-purple-600">Respect intellectual property rights</p>
                    </div>
                    <div className="text-center p-4 bg-orange-50 rounded-lg">
                      <h4 className="font-medium text-orange-800 mb-2">Consumer Protection</h4>
                      <p className="text-sm text-orange-600">Follow local trading regulations</p>
                    </div>
                    <div className="text-center p-4 bg-red-50 rounded-lg">
                      <h4 className="font-medium text-red-800 mb-2">Tax Obligations</h4>
                      <p className="text-sm text-red-600">Report income as required by law</p>
                    </div>
                  </div>
                </div>
              </section>

              <Separator />

              <section className="bg-gray-50 p-6 rounded-lg">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">Contact for Concerns</h2>
                <div className="space-y-2">
                  <p className="text-gray-700">
                    If you encounter any issues or have concerns about content on our platform:
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div>
                      <p className="text-gray-700">
                        <strong>Email:</strong> <a href="mailto:studentxchange@gmail.com" className="text-primary hover:underline">studentxchange@gmail.com</a>
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-700">
                        <strong>Phone:</strong> <a href="tel:+917039862086" className="text-primary hover:underline">+91 7039862086</a>
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              <div className="mt-8 text-center text-sm text-gray-500">
                <p>Last Updated: 22 July 2025</p>
                <p className="mt-1">This disclaimer is subject to change. Check regularly for updates.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Footer />
      <MobileNav />
    </div>
  );
}