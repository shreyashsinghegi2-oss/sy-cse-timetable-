import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  BookOpen, 
  Calculator, 
  Search, 
  Users, 
  ShoppingCart, 
  Star,
  CheckCircle,
  Heart,
  Quote,
  ArrowLeft
} from "lucide-react";
import { Link } from "wouter";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import MobileNav from "@/components/layout/mobile-nav";
import SEOHead from "@/components/seo/seo-head";
import { generateWebsiteSchema } from "@/components/seo/product-schema";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      <SEOHead
        title="StudentXchange - Buy & Sell Educational Materials | Books, Notes, Calculators"
        description="India's leading marketplace for students to buy and sell educational materials like books, notes, calculators, and study materials. Safe transactions with 20% commission structure."
        keywords="student marketplace, buy sell books, educational materials, study notes, calculators, student exchange, India education, textbooks, college books, school supplies"
        structuredData={generateWebsiteSchema()}
        canonical="https://studentxchange.in/marketplace"
      />
      <Header />
      
      <div id="main-content">
      
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-50 to-indigo-100 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
              Student<span className="text-blue-600">Xchange</span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 mb-8 max-w-3xl mx-auto">
              India's #1 Student Marketplace - Buy & Sell Educational Materials Like Books, Notes & Calculators
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/sell">
                <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 text-lg">
                  Start Selling
                </Button>
              </Link>
              <Link href="/browse">
                <Button size="lg" variant="outline" className="px-8 py-3 text-lg">
                  Browse Items
                </Button>
              </Link>
              <Link href="/buyer-requests">
                <Button size="lg" variant="outline" className="px-8 py-3 text-lg border-green-300 text-green-700 hover:bg-green-50">
                  Post Request
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 bg-gradient-to-b from-white to-gray-50/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 animate-fade-in">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              How It Works
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Simple steps to buy and sell educational materials with fellow students
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 animate-staggered">
            <div className="marketplace-card p-8 text-center">
              <div className="bg-gradient-to-br from-blue-100 to-blue-50 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6 transition-transform duration-300 hover:scale-110">
                <Search className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Browse Listings</h3>
              <p className="text-gray-600">
                Explore thousands of educational materials posted by students from your area
              </p>
            </div>
            
            <div className="marketplace-card p-8 text-center">
              <div className="bg-gradient-to-br from-green-100 to-green-50 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6 transition-transform duration-300 hover:scale-110">
                <Users className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Connect Directly</h3>
              <p className="text-gray-600">
                Chat with sellers, ask questions, and arrange meetups through our secure platform
              </p>
            </div>
            
            <div className="marketplace-card p-8 text-center">
              <div className="bg-gradient-to-br from-purple-100 to-purple-50 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6 transition-transform duration-300 hover:scale-110">
                <ShoppingCart className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Buy or Sell</h3>
              <p className="text-gray-600">
                Complete transactions safely with multiple payment options and buyer protection
              </p>
            </div>
          </div>
        </div>
      </section>



      {/* Testimonials Section */}
      <section className="py-20 bg-gradient-to-b from-gray-50/50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 animate-fade-in">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              What Students Say
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Hear from students who have successfully bought and sold on StudentXchange
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-staggered">
            <Card className="marketplace-card p-8 bg-gradient-to-br from-blue-50 to-white border-blue-100">
              <div className="flex items-center mb-6">
                <Quote className="w-8 h-8 text-blue-600 mr-3" />
                <div className="flex text-yellow-500">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-current" />
                  ))}
                </div>
              </div>
              <p className="text-gray-700 mb-6 text-lg leading-relaxed">
                "I sold my engineering textbooks within a week and made ₹2,500! The platform made it so easy to connect with other students who needed exactly what I was selling."
              </p>
              <div className="flex items-center pt-4 border-t border-blue-100">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                  PR
                </div>
                <div className="ml-4">
                  <p className="font-semibold text-gray-900">Priya R.</p>
                  <p className="text-sm text-gray-600">Engineering Student, Mumbai</p>
                </div>
              </div>
            </Card>
            
            <Card className="marketplace-card p-8 bg-gradient-to-br from-green-50 to-white border-green-100">
              <div className="flex items-center mb-6">
                <Quote className="w-8 h-8 text-green-600 mr-3" />
                <div className="flex text-yellow-500">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-current" />
                  ))}
                </div>
              </div>
              <p className="text-gray-700 mb-6 text-lg leading-relaxed">
                "Found amazing study notes for my CA exams at half the market price. The seller was super helpful and even shared extra tips for free!"
              </p>
              <div className="flex items-center pt-4 border-t border-green-100">
                <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center text-white font-semibold">
                  AS
                </div>
                <div className="ml-4">
                  <p className="font-semibold text-gray-900">Arjun S.</p>
                  <p className="text-sm text-gray-600">CA Student, Delhi</p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Call to Action Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Join thousands of students who are already buying and selling educational materials
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/auth">
              <Button size="lg" className="bg-white text-blue-600 hover:bg-gray-100 px-8 py-3 text-lg">
                Sign Up Now
              </Button>
            </Link>
            <Link href="/sell">
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-blue-600 px-8 py-3 text-lg">
                Start Selling
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Mobile Quick Links - Visible only on mobile */}
      <section className="sm:hidden bg-gray-100 py-6 px-4">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 text-center">Quick Links</h3>
        <div className="grid grid-cols-2 gap-3">
          <Link href="/about">
            <div className="bg-white rounded-lg p-4 text-center shadow-sm border border-gray-200 hover:border-blue-400 transition-colors">
              <span className="text-gray-700 font-medium">About Us</span>
            </div>
          </Link>
          <Link href="/policies">
            <div className="bg-white rounded-lg p-4 text-center shadow-sm border border-gray-200 hover:border-blue-400 transition-colors">
              <span className="text-gray-700 font-medium">Policies</span>
            </div>
          </Link>
          <Link href="/policies#shipping">
            <div className="bg-white rounded-lg p-4 text-center shadow-sm border border-gray-200 hover:border-blue-400 transition-colors">
              <span className="text-gray-700 font-medium">Shipping</span>
            </div>
          </Link>
          <Link href="/policies#refund">
            <div className="bg-white rounded-lg p-4 text-center shadow-sm border border-gray-200 hover:border-blue-400 transition-colors">
              <span className="text-gray-700 font-medium">Refunds</span>
            </div>
          </Link>
        </div>
        <div className="mt-4 text-center text-sm text-gray-500">
          <p>Email: studentxchange1@gmail.com</p>
          <p>Phone: +91 7039862086</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-12 pb-24 sm:pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="md:col-span-2">
              <h3 className="text-2xl font-bold mb-4">StudentXchange</h3>
              <p className="text-gray-300 mb-4 max-w-md">
                Your trusted marketplace for student-to-student educational resources. 
                Buy and sell books, notes, calculators, and more with fellow students.
              </p>
              <div className="flex space-x-4">
                <div className="bg-blue-600 rounded-full p-2">
                  <Heart className="w-4 h-4" />
                </div>
                <span className="text-gray-300">Made with love for students</span>
              </div>
            </div>
            
            <div>
              <h4 className="text-lg font-semibold mb-4">Quick Links</h4>
              <ul className="space-y-2 text-gray-300">
                <li><Link href="/browse"><span className="hover:text-white transition-colors cursor-pointer">Buy Items</span></Link></li>
                <li><Link href="/sell"><span className="hover:text-white transition-colors cursor-pointer">Sell Your Items</span></Link></li>
                <li><Link href="/about"><span className="hover:text-white transition-colors cursor-pointer">About Us</span></Link></li>
                <li><Link href="/policies"><span className="hover:text-white transition-colors cursor-pointer">Policies</span></Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-lg font-semibold mb-4">Contact Us</h4>
              <ul className="space-y-2 text-gray-300">
                <li>Email: studentxchange1@gmail.com</li>
                <li>Phone: +91 7039862086</li>
                <li>WhatsApp: +91 7039862086</li>
              </ul>
            </div>
          </div>
          
          <div className="mt-8 pt-8 border-t border-gray-700 flex flex-col sm:flex-row justify-between items-center">
            <p className="text-gray-400">
              &copy; 2025 StudentXchange. All rights reserved.
            </p>
            <div className="flex flex-wrap justify-center gap-4 sm:gap-6 mt-4 sm:mt-0">
              <Link href="/about">
                <span className="text-gray-400 hover:text-white transition-colors cursor-pointer">
                  About Us
                </span>
              </Link>
              <Link href="/policies">
                <span className="text-gray-400 hover:text-white transition-colors cursor-pointer">
                  Policies
                </span>
              </Link>
              <Link href="/policies#shipping">
                <span className="text-gray-400 hover:text-white transition-colors cursor-pointer">
                  Shipping
                </span>
              </Link>
              <Link href="/policies#privacy">
                <span className="text-gray-400 hover:text-white transition-colors cursor-pointer">
                  Privacy
                </span>
              </Link>
            </div>
          </div>
        </div>
      </footer>
      </div>
    </div>
  );
}
