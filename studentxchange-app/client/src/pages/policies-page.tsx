import SEOHead from "@/components/seo/seo-head";
import { Link } from "wouter";
import { ArrowLeft, FileText, RefreshCw, Calendar, CreditCard, Shield, Phone, Truck } from "lucide-react";

export default function PoliciesPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-white">
      <SEOHead
        title="Policies - StudentXchange"
        description="Terms & Conditions, Subscription Policy, Refund Policy, Privacy Policy and more for StudentXchange platform."
        keywords="studentxchange policies, terms conditions, refund policy, privacy policy, subscription policy"
        canonical="https://studentxchange.in/policies"
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
              <span className="text-gray-700 font-medium hover:text-blue-600 transition-colors cursor-pointer">About</span>
            </Link>
            <Link href="/policies">
              <span className="text-blue-600 font-medium cursor-pointer">Policies</span>
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

        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-8">Policies</h1>

        <div className="space-y-12">
          <section id="terms" className="bg-white rounded-xl p-8 shadow-md border border-gray-100">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Terms and Conditions</h2>
            </div>
            <div className="prose prose-gray max-w-none">
              <p className="text-gray-700 leading-relaxed">
                By accessing or using StudentXchange, users agree to comply with all applicable terms, policies, and platform guidelines. StudentXchange reserves the right to modify platform features, pricing, services, or policies at any time without prior notice.
              </p>
              <p className="text-gray-700 leading-relaxed mt-4">
                Users are responsible for maintaining the confidentiality of their account credentials and for all activities conducted through their accounts. Any misuse, fraudulent activity, or violation of platform rules may result in suspension or termination of access without refund.
              </p>
            </div>
          </section>

          <section id="subscription" className="bg-white rounded-xl p-8 shadow-md border border-gray-100">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <RefreshCw className="w-6 h-6 text-purple-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Subscription Policy</h2>
            </div>
            <div className="prose prose-gray max-w-none">
              <p className="text-gray-700 leading-relaxed">
                Student Collab operates on a monthly subscription-based access model. Subscription fees are charged in advance and grant access to platform features for the selected billing period.
              </p>
              <p className="text-gray-700 leading-relaxed mt-4">
                Users may cancel their subscription at any time. Upon cancellation, no further charges will be applied; however, access will remain active until the end of the current billing cycle.
              </p>
              <p className="text-gray-700 leading-relaxed mt-4">
                StudentXchange does not guarantee outcomes, collaborations, placements, or earnings as part of any subscription plan.
              </p>
            </div>
          </section>

          <section id="events" className="bg-white rounded-xl p-8 shadow-md border border-gray-100">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Calendar className="w-6 h-6 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Event & Competition Registration Policy</h2>
            </div>
            <div className="prose prose-gray max-w-none">
              <p className="text-gray-700 leading-relaxed">
                StudentXchange facilitates paid registrations for events, competitions, workshops, and initiatives conducted under Student Lancing. Registration fees are collected strictly for participation and access purposes.
              </p>
              <p className="text-gray-700 leading-relaxed mt-4">
                Event structure, timelines, deliverables, and rewards are defined by StudentXchange or its associated partners. The platform reserves the right to reschedule, modify, or cancel events if necessary.
              </p>
            </div>
          </section>

          <section id="refund" className="bg-white rounded-xl p-8 shadow-md border border-red-200 border-l-4 border-l-red-500">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-red-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Refund and Cancellation Policy</h2>
            </div>
            <div className="prose prose-gray max-w-none">
              <p className="text-gray-700 leading-relaxed font-semibold">
                Subscription fees are non-refundable once the billing cycle has commenced.
              </p>
              <p className="text-gray-700 leading-relaxed mt-4">
                Event registration fees are non-refundable unless an event is canceled by StudentXchange. In such cases, eligible refunds will be processed to the original payment method within a reasonable processing period.
              </p>
              <p className="text-gray-700 leading-relaxed mt-4 font-semibold">
                No refunds will be issued for partial usage, missed participation, or dissatisfaction with outcomes or results.
              </p>
            </div>
          </section>

          <section id="payment" className="bg-white rounded-xl p-8 shadow-md border border-blue-200 border-l-4 border-l-blue-500">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-blue-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Payment and Payout Policy</h2>
            </div>
            <div className="prose prose-gray max-w-none">
              <p className="text-gray-700 leading-relaxed">
                All payments made on StudentXchange are collected directly by the platform through authorized and compliant payment gateways.
              </p>
              <p className="text-gray-700 leading-relaxed mt-4 font-semibold">
                StudentXchange does not facilitate automated payouts. Any rewards, incentives, honorariums, or payments related to events or collaborations are processed manually by the platform through verified channels.
              </p>
              <p className="text-gray-700 leading-relaxed mt-4">
                StudentXchange is not responsible for disputes arising from external agreements, expectations, or informal arrangements beyond the scope of the platform.
              </p>
            </div>
          </section>

          <section id="shipping" className="bg-white rounded-xl p-8 shadow-md border border-orange-200 border-l-4 border-l-orange-500">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <Truck className="w-6 h-6 text-orange-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Shipping & Delivery Policy</h2>
            </div>
            <div className="prose prose-gray max-w-none">
              <p className="text-gray-700 leading-relaxed font-semibold">
                StudentXchange is an intermediary marketplace platform. Products listed on StudentXchange are sold and fulfilled by individual student sellers. StudentXchange does not own inventory and does not handle physical shipping or delivery.
              </p>
              
              <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-2">Physical Products</h3>
              <p className="text-gray-700 leading-relaxed">
                For physical items such as books, calculators, study materials, and other tangible goods, shipping and delivery are the sole responsibility of the individual seller. Estimated delivery timelines are typically 3–10 business days, depending on the seller's location and chosen delivery method. StudentXchange does not guarantee delivery timelines and is not liable for delays caused by sellers, courier services, or external factors.
              </p>
              
              <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-2">Digital Products</h3>
              <p className="text-gray-700 leading-relaxed">
                For digital products such as notes, PDFs, assignments, and other electronic materials, delivery is completed electronically after payment confirmation. Buyers will receive access to digital products through their StudentXchange account or via email within 24 hours of successful payment.
              </p>
              
              <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-2">Delayed, Damaged, or Non-Delivered Items</h3>
              <p className="text-gray-700 leading-relaxed">
                If an item is delayed, damaged during transit, or not delivered, buyers should first raise the issue directly with the seller through the platform's messaging system. If the dispute remains unresolved within 48 hours, buyers may escalate the matter to StudentXchange Support.
              </p>
              
              <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-2">Dispute Resolution</h3>
              <p className="text-gray-700 leading-relaxed">
                StudentXchange will review escalated disputes on a case-by-case basis and may facilitate communication between buyers and sellers. Resolution may include refund processing (subject to our Refund Policy), seller warnings, or account suspension for repeat offenders. StudentXchange's decision in disputes shall be final and binding.
              </p>
              
              <p className="text-gray-700 leading-relaxed mt-6 text-sm italic">
                For shipping-related queries, contact us at: studentxchange1@gmail.com or +91 7039862086
              </p>
            </div>
          </section>

          <section id="privacy" className="bg-white rounded-xl p-8 shadow-md border border-gray-100">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                <Shield className="w-6 h-6 text-indigo-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Privacy Policy</h2>
            </div>
            <div className="prose prose-gray max-w-none">
              <p className="text-gray-700 leading-relaxed">
                StudentXchange collects only essential personal information required for user verification, platform functionality, payment processing, and legal compliance.
              </p>
              <p className="text-gray-700 leading-relaxed mt-4">
                User data is not sold or shared with third parties, except where required for payment processing, regulatory obligations, or platform operations.
              </p>
              <p className="text-gray-700 leading-relaxed mt-4">
                By using the platform, users consent to the collection and use of information in accordance with this policy.
              </p>
            </div>
          </section>

          <section id="support" className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-8 text-white">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                <Phone className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-2xl font-bold">Contact & Support</h2>
            </div>
            <div className="prose prose-invert max-w-none">
              <p className="text-blue-100 leading-relaxed">
                For any queries related to subscriptions, payments, events, refunds, or policies, users may contact StudentXchange through the following official channels:
              </p>
              <div className="mt-6 space-y-3">
                <p className="text-white font-medium text-lg">
                  Email: <a href="mailto:studentxchange1@gmail.com" className="text-white underline">studentxchange1@gmail.com</a>
                </p>
                <p className="text-white font-medium text-lg">
                  Phone: <a href="tel:+917039862086" className="text-white underline">+91 7039862086</a>
                </p>
              </div>
              <p className="text-blue-100 leading-relaxed mt-6">
                Support requests are handled during standard business hours and responses are provided within a reasonable timeframe.
              </p>
            </div>
          </section>
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
