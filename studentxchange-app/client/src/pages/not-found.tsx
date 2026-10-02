import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, Home, ShoppingBag, Users, Briefcase, ArrowLeft, Search } from "lucide-react";
import { Link, useLocation } from "wouter";
import SEOHead from "@/components/seo/seo-head";

export default function NotFound() {
  const [, setLocation] = useLocation();
  
  const popularPages = [
    { name: "Home", href: "/", icon: Home, description: "Return to StudentXchange homepage" },
    { name: "Marketplace", href: "/browse", icon: ShoppingBag, description: "Browse study materials & products" },
    { name: "Student Collab", href: "/student-collab", icon: Users, description: "Connect with fellow students" },
    { name: "Student Lancing", href: "/student-lancing", icon: Briefcase, description: "Find freelancing opportunities" },
  ];

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4">
      <SEOHead
        title="Page Not Found | StudentXchange"
        description="The requested StudentXchange page could not be found. Use these links to return to the marketplace, collaboration network, or career platform."
        canonical="https://studentxchange.in/404"
      />
      <div className="max-w-2xl w-full">
        <Card className="shadow-xl border-0">
          <CardContent className="p-8">
            <div className="text-center mb-8">
              <p className="text-sm font-bold uppercase tracking-[0.22em] text-blue-600 mb-4">Error 404</p>
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-100 mb-4" aria-hidden="true">
                <AlertCircle className="h-10 w-10 text-red-500" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Page Not Found</h1>
              <p className="text-gray-600 text-lg">
                Oops! The page you're looking for doesn't exist or has been moved.
              </p>
            </div>

            <div className="mb-8">
              <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Search className="h-5 w-5" />
                Popular Pages
              </h2>
              <div className="grid sm:grid-cols-2 gap-3">
                {popularPages.map((page) => (
                  <Link key={page.href} href={page.href}>
                    <div className="flex items-start gap-3 p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all cursor-pointer group">
                      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                        <page.icon className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900 group-hover:text-blue-700">{page.name}</h3>
                        <p className="text-sm text-gray-500">{page.description}</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button 
                variant="outline" 
                onClick={() => window.history.back()}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Go Back
              </Button>
              <Button 
                onClick={() => setLocation("/")}
                className="gap-2 bg-blue-600 hover:bg-blue-700"
              >
                <Home className="h-4 w-4" />
                Back to Home
              </Button>
            </div>

            <p className="text-center text-sm text-gray-400 mt-8">
              StudentXchange - India's Multi-Service Student Platform
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
