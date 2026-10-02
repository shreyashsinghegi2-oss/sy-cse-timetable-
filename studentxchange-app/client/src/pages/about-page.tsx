import SEOHead from "@/components/seo/seo-head";
import { Link } from "wouter";
import { ShoppingBag, Users, Briefcase, ArrowLeft } from "lucide-react";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-white">
      <SEOHead
        title="About StudentXchange - Empowering Students"
        description="StudentXchange is an integrated digital platform built exclusively for students to connect, collaborate, and create opportunities within a trusted ecosystem."
        keywords="about studentxchange, student platform, student marketplace, student collaboration, student freelancing"
        canonical="https://studentxchange.in/about"
      />

      <header className="w-full py-6 px-8 border-b border-gray-100">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/">
            <div className="flex items-center gap-2 cursor-pointer">
              <div className="text-3xl font-bold text-gray-900 tracking-tight" aria-label="StudentXchange">
                Student<span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Xchange</span>
              </div>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            <Link href="/">
              <span className="text-gray-700 font-medium hover:text-blue-600 transition-colors cursor-pointer">Home</span>
            </Link>
            <Link href="/about">
              <span className="text-blue-600 font-medium cursor-pointer">About</span>
            </Link>
            <Link href="/policies">
              <span className="text-gray-700 font-medium hover:text-blue-600 transition-colors cursor-pointer">Policies</span>
            </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-12">
        <Link href="/">
          <span className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-8 cursor-pointer">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </span>
        </Link>

        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-8">About StudentXchange Pvt Ltd</h1>

        <div className="prose prose-lg max-w-none">
          <p className="text-xl text-gray-700 leading-relaxed mb-8">
            StudentXchange is an integrated digital platform built exclusively for students to connect, collaborate, and create opportunities within a trusted ecosystem. The platform operates across three core verticals designed to support student needs beyond traditional academics.
          </p>

          <div className="grid md:grid-cols-3 gap-6 my-12">
            <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100">
              <div className="w-14 h-14 bg-gradient-to-br from-orange-400 to-pink-500 rounded-xl flex items-center justify-center mb-4">
                <ShoppingBag className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Student Marketplace</h3>
              <p className="text-gray-600">
                Student Marketplace enables students to buy and sell educational essentials such as books, tools, and academic resources within their campus or student community.
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center mb-4">
                <Users className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Student Collab</h3>
              <p className="text-gray-600">
                Student Collab is a subscription-based collaboration space where students can network, participate in collaborative challenges, access curated opportunities, and engage in skill-building activities with like-minded peers.
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100">
              <div className="w-14 h-14 bg-gradient-to-br from-green-400 to-teal-500 rounded-xl flex items-center justify-center mb-4">
                <Briefcase className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Student Lancing</h3>
              <p className="text-gray-600">
                Student Lancing focuses on student freelancing, event participation, and competition-based engagements, where students and partner organizations can register for events, challenges, and educational initiatives hosted on the platform.
              </p>
            </div>
          </div>

          <div className="bg-blue-50 rounded-xl p-8 my-8 border border-blue-100">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Payment & Rewards</h3>
            <p className="text-gray-700">
              StudentXchange collects subscription fees and event registration charges directly through its platform. All rewards, incentives, or payouts related to events or collaborations are managed manually by the platform to ensure compliance, transparency, and controlled fund distribution.
            </p>
          </div>

          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-8 text-white my-8">
            <h3 className="text-xl font-bold mb-4">Our Mission</h3>
            <p className="text-blue-100">
              Our mission is to empower students with practical opportunities while maintaining ethical practices, secure payments, and a clear operational structure aligned with regulatory and payment gateway standards.
            </p>
          </div>

          <div className="bg-gray-50 rounded-xl p-8 my-8 border border-gray-200">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Registered Office</h3>
            <p className="text-gray-700">
              <strong>StudentXchange Pvt Ltd</strong><br />
              F-503, Floor -5 PL-616 F, Wing<br />
              Senapati Bapat Marg, Worli<br />
              Mumbai - 400018
            </p>
          </div>

          <div className="bg-gray-50 rounded-xl p-8 my-8 border border-gray-200">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Contact Us</h3>
            <div className="space-y-3">
              <p className="text-gray-700 flex items-center gap-3">
                <span className="text-blue-600">✉</span>
                <a href="mailto:studentxchange1@gmail.com" className="hover:text-blue-600 transition-colors">
                  studentxchange1@gmail.com
                </a>
              </p>
              <p className="text-gray-700 flex items-center gap-3">
                <span className="text-blue-600">📞</span>
                <a href="tel:+917039862086" className="hover:text-blue-600 transition-colors">
                  +91 7039862086
                </a>
              </p>
            </div>
          </div>
        </div>
      </main>

      <footer className="bg-white border-t border-gray-200 mt-16">
        <div className="max-w-7xl mx-auto py-8 px-4">
          <div className="flex flex-wrap justify-center gap-8">
            <Link href="/">
              <span className="text-gray-500 hover:text-gray-900 cursor-pointer">Home</span>
            </Link>
            <Link href="/about">
              <span className="text-gray-500 hover:text-gray-900 cursor-pointer">About</span>
            </Link>
            <Link href="/policies">
              <span className="text-gray-500 hover:text-gray-900 cursor-pointer">Policies</span>
            </Link>
          </div>
          <p className="mt-6 text-center text-gray-400">
            &copy; 2025 StudentXchange. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
