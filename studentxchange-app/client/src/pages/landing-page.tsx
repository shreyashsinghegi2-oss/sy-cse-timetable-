import { Link } from "wouter";
import { ShoppingBag, Users, Briefcase } from "lucide-react";

import SEOHead from "@/components/seo/seo-head";
import { generateWebsiteSchema } from "@/components/seo/product-schema";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-white">
      <SEOHead
        title="StudentXchange - Connect, Collaborate, and Create Opportunities"
        description="Empowering students to buy & sell educational materials, collaborate on projects, and find freelancing opportunities. Your one-stop platform for student success."
        keywords="student marketplace, student collaboration, student freelancing, buy sell books, educational materials, student network, India education"
        structuredData={generateWebsiteSchema()}
        canonical="https://studentxchange.in/"
      />

      {/* Header */}
      <header className="w-full py-6 px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="text-3xl font-bold text-gray-900 tracking-tight" aria-label="StudentXchange">
              Student<span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Xchange</span>
            </div>
          </div>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <Link href="/">
              <span className="text-gray-700 font-medium hover:text-blue-600 transition-colors duration-300 cursor-pointer">
                Home
              </span>
            </Link>
            <Link href="/about">
              <span className="text-gray-700 font-medium hover:text-blue-600 transition-colors duration-300 cursor-pointer">
                About
              </span>
            </Link>
            <Link href="/policies">
              <span className="text-gray-700 font-medium hover:text-blue-600 transition-colors duration-300 cursor-pointer">
                Policies
              </span>
            </Link>
          </nav>
        </div>
      </header>

      {/* Main Content - Three Platform Cards */}
      <main className="flex-1 flex items-center justify-center px-4 py-12 md:py-20">
        <div className="max-w-6xl w-full">
          {/* Welcome Text */}
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4 tracking-tight">
              Choose Your Platform
            </h1>
            <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto">
              Three powerful tools designed to empower your student journey
            </p>
          </div>

          {/* Platform Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 mb-16">
            
            {/* Student Marketplace Card */}
            <Link href="/marketplace">
              <div 
                className="group relative bg-white rounded-2xl p-8 shadow-md hover:shadow-2xl transition-all duration-500 cursor-pointer transform hover:-translate-y-2 border border-gray-100"
                data-testid="card-marketplace"
              >
                <div className="flex flex-col items-center text-center space-y-4">
                  {/* Icon */}
                  <div className="w-20 h-20 bg-gradient-to-br from-orange-400 to-pink-500 rounded-2xl flex items-center justify-center transform group-hover:scale-110 transition-transform duration-300 shadow-lg">
                    <ShoppingBag className="w-10 h-10 text-white" />
                  </div>
                  
                  {/* Title */}
                  <h3 className="text-2xl font-bold text-gray-900">
                    Student Marketplace
                  </h3>
                  
                  {/* Description */}
                  <p className="text-gray-600 text-base leading-relaxed">
                    Buy & Sell Student Essentials
                  </p>
                  
                  {/* Hover indicator */}
                  <div className="mt-4 text-blue-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    Explore →
                  </div>
                </div>
              </div>
            </Link>

            {/* Student Collab Card - Highlighted */}
            <Link href="/collab">
              <div 
                className="group relative bg-white rounded-2xl p-8 shadow-md hover:shadow-2xl transition-all duration-500 cursor-pointer transform hover:-translate-y-2 border-2 border-blue-400 ring-4 ring-blue-100"
                data-testid="card-collab"
              >
                {/* Blue accent glow */}
                <div className="absolute inset-0 rounded-2xl bg-blue-400 opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-500"></div>
                
                <div className="relative flex flex-col items-center text-center space-y-4">
                  {/* Icon */}
                  <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center transform group-hover:scale-110 transition-transform duration-300 shadow-lg">
                    <Users className="w-10 h-10 text-white" />
                  </div>
                  
                  {/* Title */}
                  <h3 className="text-2xl font-bold text-gray-900">
                    Student Collab
                  </h3>
                  
                  {/* Description */}
                  <p className="text-gray-600 text-base leading-relaxed">
                    Connect & Collaborate with Like-Minded Students
                  </p>
                  
                  {/* Badge */}
                  <div className="absolute -top-3 -right-3 bg-blue-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                    Popular
                  </div>
                  
                  {/* Hover indicator */}
                  <div className="mt-4 text-blue-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    Start Collaborating →
                  </div>
                </div>
              </div>
            </Link>

            {/* Student Lancing Card */}
            <Link href="/student-lancing">
              <div 
                className="group relative bg-white rounded-2xl p-8 shadow-md hover:shadow-2xl transition-all duration-500 cursor-pointer transform hover:-translate-y-2 border border-gray-100"
                data-testid="card-lancing"
              >
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-teal-500 rounded-2xl flex items-center justify-center transform group-hover:scale-110 transition-transform duration-300 shadow-lg">
                    <Briefcase className="w-10 h-10 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900">
                    Student Lancing
                  </h3>
                  <p className="text-gray-600 text-base leading-relaxed">
                    Freelancing Opportunities for Students
                  </p>
                  <div className="absolute -top-3 -right-3 bg-gradient-to-r from-green-500 to-teal-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                    New
                  </div>
                  <div className="mt-4 text-green-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    Start Freelancing →
                  </div>
                </div>
              </div>
            </Link>

          </div>

          {/* Tagline */}
          <div className="text-center mb-8">
            <p className="text-xl md:text-2xl text-gray-700 font-medium italic">
              "Empowering Students to Connect, Collaborate, and Create Opportunities."
            </p>
          </div>

          {/* Mobile Quick Links - About & Policies */}
          <div className="md:hidden flex justify-center gap-6 mb-8">
            <Link href="/about">
              <span className="text-blue-600 font-medium hover:text-blue-700 transition-colors cursor-pointer">
                About
              </span>
            </Link>
            <span className="text-gray-300">|</span>
            <Link href="/policies">
              <span className="text-blue-600 font-medium hover:text-blue-700 transition-colors cursor-pointer">
                Policies
              </span>
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full py-8 border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-8 text-center">
          <div className="flex flex-wrap justify-center gap-4 mb-4 text-sm">
            <Link href="/about">
              <span className="text-gray-500 hover:text-gray-700 cursor-pointer">About Us</span>
            </Link>
            <Link href="/policies">
              <span className="text-gray-500 hover:text-gray-700 cursor-pointer">Policies</span>
            </Link>
            <Link href="/policies#shipping">
              <span className="text-gray-500 hover:text-gray-700 cursor-pointer">Shipping</span>
            </Link>
            <Link href="/policies#refund">
              <span className="text-gray-500 hover:text-gray-700 cursor-pointer">Refunds</span>
            </Link>
          </div>
          <p className="text-gray-600 text-sm">
            © 2025 StudentXchange.in – All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
