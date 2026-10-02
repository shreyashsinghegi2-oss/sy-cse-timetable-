import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import MobileNav from "@/components/layout/mobile-nav";
import SEOHead from "@/components/seo/seo-head";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <SEOHead
        title="Privacy Policy - StudentXchange"
        description="Learn how StudentXchange protects your privacy and handles your personal data. Understand our data collection and usage policies."
        canonical="https://studentxchange.in/privacy-policy"
      />
      <Header />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="shadow-sm">
          <CardHeader className="text-center">
            <h1 className="text-3xl font-bold text-gray-900">Privacy Policy</h1>
            <p className="text-gray-600 mt-2">Effective Date: 22 July 2025</p>
          </CardHeader>
          
          <CardContent className="prose prose-gray max-w-none">
            <div className="space-y-6">
              <p className="text-lg leading-relaxed">
                StudentXchange ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our platform.
              </p>

              <Separator />

              <section>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Information We Collect</h2>
                <div className="space-y-3">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h3 className="font-medium text-gray-900 mb-2">Personal Information:</h3>
                    <ul className="list-disc list-inside text-gray-700 space-y-1">
                      <li>Name, email address, and phone number</li>
                      <li>Student ID and college/university information</li>
                      <li>Profile picture and basic demographic information</li>
                    </ul>
                  </div>
                  
                  <div className="bg-green-50 p-4 rounded-lg">
                    <h3 className="font-medium text-gray-900 mb-2">Content & Usage Data:</h3>
                    <ul className="list-disc list-inside text-gray-700 space-y-1">
                      <li>Product listings, descriptions, and uploaded images</li>
                      <li>Reviews, ratings, and communication on the platform</li>
                      <li>Usage patterns and interaction data</li>
                    </ul>
                  </div>
                  
                  <div className="bg-yellow-50 p-4 rounded-lg">
                    <h3 className="font-medium text-gray-900 mb-2">Transaction Data:</h3>
                    <ul className="list-disc list-inside text-gray-700 space-y-1">
                      <li>Purchase and sales history</li>
                      <li>Payment information processed via PayU</li>
                      <li>Shipping and delivery addresses</li>
                    </ul>
                  </div>
                </div>
              </section>

              <Separator />

              <section>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. How We Use Your Information</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
                      <p className="text-gray-700">Enable secure transactions between students</p>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
                      <p className="text-gray-700">Improve our platform services and user experience</p>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
                      <p className="text-gray-700">Prevent fraud and ensure platform security</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
                      <p className="text-gray-700">Provide customer support and assistance</p>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
                      <p className="text-gray-700">Send important updates about your account</p>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
                      <p className="text-gray-700">Comply with legal obligations</p>
                    </div>
                  </div>
                </div>
              </section>

              <Separator />

              <section>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. Sharing of Information</h2>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-gray-700 mb-3">
                    <strong>We do not sell your personal information.</strong> We only share your information in limited circumstances:
                  </p>
                  <ul className="list-disc list-inside text-gray-700 space-y-2">
                    <li><strong>With PayU:</strong> For secure payment processing</li>
                    <li><strong>Legal Requirements:</strong> When required by law or legal process</li>
                    <li><strong>Safety Concerns:</strong> To prevent fraud or protect user safety</li>
                    <li><strong>Business Transfers:</strong> In case of merger or acquisition</li>
                  </ul>
                </div>
              </section>

              <Separator />

              <section>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Data Security</h2>
                <p className="text-gray-700 mb-4">
                  We implement industry-standard security measures to protect your personal information:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                      <span className="text-green-600 font-bold">🔒</span>
                    </div>
                    <h3 className="font-medium text-gray-900">Encryption</h3>
                    <p className="text-sm text-gray-600">All data transmitted is encrypted</p>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                      <span className="text-blue-600 font-bold">🛡️</span>
                    </div>
                    <h3 className="font-medium text-gray-900">Secure Storage</h3>
                    <p className="text-sm text-gray-600">Protected database systems</p>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-2">
                      <span className="text-purple-600 font-bold">👥</span>
                    </div>
                    <h3 className="font-medium text-gray-900">Access Control</h3>
                    <p className="text-sm text-gray-600">Limited employee access</p>
                  </div>
                </div>
              </section>

              <Separator />

              <section>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Your Rights</h2>
                <div className="space-y-3">
                  <p className="text-gray-700">You have the right to:</p>
                  <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4">
                    <li>Access and review your personal information</li>
                    <li>Request corrections to inaccurate data</li>
                    <li>Request deletion of your account and data</li>
                    <li>Opt-out of marketing communications</li>
                    <li>Withdraw consent where applicable</li>
                  </ul>
                  <p className="text-gray-700 mt-3">
                    To exercise these rights, contact us at <a href="mailto:studentxchange@gmail.com" className="text-primary hover:underline">studentxchange@gmail.com</a>
                  </p>
                </div>
              </section>

              <Separator />

              <section>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Cookie Policy</h2>
                <p className="text-gray-700 mb-3">
                  We use cookies and similar technologies to enhance your experience:
                </p>
                <div className="space-y-2">
                  <div className="flex items-start space-x-3">
                    <span className="text-green-600 font-bold">✓</span>
                    <p className="text-gray-700"><strong>Essential Cookies:</strong> Required for platform functionality</p>
                  </div>
                  <div className="flex items-start space-x-3">
                    <span className="text-blue-600 font-bold">📊</span>
                    <p className="text-gray-700"><strong>Analytics Cookies:</strong> Help us understand usage patterns</p>
                  </div>
                  <div className="flex items-start space-x-3">
                    <span className="text-purple-600 font-bold">⚙️</span>
                    <p className="text-gray-700"><strong>Preference Cookies:</strong> Remember your settings</p>
                  </div>
                </div>
              </section>

              <Separator />

              <section>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Changes to This Policy</h2>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-gray-700">
                    We may update this Privacy Policy periodically. We'll notify you of significant changes by email or through platform notifications. Continued use of StudentXchange after changes constitutes acceptance of the updated policy.
                  </p>
                </div>
              </section>

              <Separator />

              <section className="bg-gray-50 p-6 rounded-lg">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Contact Information</h2>
                <div className="space-y-2">
                  <p className="text-gray-700">
                    <strong>Email:</strong> <a href="mailto:studentxchange@gmail.com" className="text-primary hover:underline">studentxchange@gmail.com</a>
                  </p>
                  <p className="text-gray-700">
                    <strong>Phone:</strong> <a href="tel:+917039862086" className="text-primary hover:underline">+91 7039862086</a>
                  </p>
                  <p className="text-gray-700">
                    <strong>Response Time:</strong> We aim to respond within 48 hours
                  </p>
                </div>
              </section>

              <div className="mt-8 text-center text-sm text-gray-500">
                <p>Last Updated: 22 July 2025</p>
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