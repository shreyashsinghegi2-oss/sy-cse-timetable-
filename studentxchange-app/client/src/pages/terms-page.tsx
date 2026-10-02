import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Link } from "wouter";
import { ArrowLeft, Shield, Users, CreditCard, Ban, AlertTriangle, Eye, FileText, Phone } from "lucide-react";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import MobileNav from "@/components/layout/mobile-nav";
import SEOHead from "@/components/seo/seo-head";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <SEOHead
        title="Terms & Conditions - StudentXchange"
        description="Read StudentXchange terms of service, user responsibilities, and platform guidelines for our student marketplace."
        canonical="https://studentxchange.in/terms"
      />
      <Header />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="shadow-sm">
          <CardHeader className="text-center">
            <h1 className="text-3xl font-bold text-gray-900">Terms & Conditions</h1>
            <p className="text-gray-600 mt-2">Effective Date: 22 July 2025</p>
          </CardHeader>
          
          <CardContent>
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <p className="text-blue-800">
                  <strong>Welcome to StudentXchange!</strong> By using StudentXchange, you agree to these terms. We provide a peer-to-peer platform for students to buy and sell educational materials.
                </p>
              </div>

        <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-blue-600" />
                    1. Eligibility
                  </CardTitle>
                </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                  <p className="text-gray-700">Only students can register on our platform</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                  <p className="text-gray-700">You must be at least 16 years old</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                  <p className="text-gray-700">Provide accurate and truthful information during registration</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                  <p className="text-gray-700">Valid institutional ID may be required for verification</p>
                </div>
              </div>
            </CardContent>
          </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-green-600" />
                    2. User Responsibilities
                  </CardTitle>
                </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                  <p className="text-gray-700">You are responsible for all activities under your account</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                  <p className="text-gray-700">You are responsible for your posts and listings</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                  <p className="text-gray-700">Sellers set prices; we don't interfere with pricing</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-red-500 rounded-full mt-2"></div>
                  <p className="text-gray-700">No illegal, fake, or harmful content allowed</p>
                </div>
              </div>
            </CardContent>
          </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-purple-600" />
                    3. Listings and Transactions
                  </CardTitle>
                </CardHeader>
            <CardContent className="space-y-3">
              <p>• StudentXchange is a peer-to-peer platform; we do not own or sell the listed items.</p>
              <p>• Buyers and sellers are responsible for verifying the condition, quality, and authenticity of the product.</p>
              <p>• Transactions must be completed within the agreed time and payment method.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-orange-600" />
                4. Payment and Fees
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h4 className="font-medium text-yellow-800 mb-2">Payment Processing:</h4>
                <div className="space-y-2">
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-orange-500 rounded-full mt-2"></div>
                    <p className="text-gray-700">Payments are handled via PayU for security</p>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-orange-500 rounded-full mt-2"></div>
                    <p className="text-gray-700">Platform charges a 20% commission on sales</p>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-orange-500 rounded-full mt-2"></div>
                    <p className="text-gray-700">Settlement cycles may take 2-3 working days</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-600" />
                5. Refunds & Cancellations
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p>• Since this is a student-to-student marketplace, we do not guarantee refunds.</p>
              <p>• Buyers and sellers must resolve disputes respectfully.</p>
              <p>• StudentXchange may step in to mediate if needed but does not offer any legal guarantees.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Ban className="w-5 h-5 text-red-600" />
                6. Prohibited Items
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="font-medium">You may NOT list or sell:</p>
              <div className="ml-4 space-y-2">
                <p>• Assignments for unethical use (e.g., cheating, plagiarism)</p>
                <p>• Counterfeit or pirated materials</p>
                <p>• Any item that violates university or national laws</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                7. Account Termination
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="font-medium">We reserve the right to suspend or terminate accounts that:</p>
              <div className="ml-4 space-y-2">
                <p>• Violate these Terms</p>
                <p>• Use fake identities or institutional affiliations</p>
                <p>• Post abusive, spammy, or misleading content</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-indigo-600" />
                8. Privacy Policy
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p>• Your personal data is protected under our Privacy Policy.</p>
              <p>• We do not sell your information to third parties.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-gray-600" />
                9. Changes to Terms
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p>• We may update these Terms occasionally.</p>
              <p>• Continued use of the platform after changes means you accept the updated Terms.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="w-5 h-5 text-blue-600" />
                10. Contact Us
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p>For any queries or issues, contact our support team:</p>
              <div className="ml-4 space-y-2">
                <p>• Email: studentxchange1@gmail.com</p>
                <p>• Phone: +91 7039862086</p>
                <p>• WhatsApp: +91 7039862086</p>
              </div>
            </CardContent>
          </Card>
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