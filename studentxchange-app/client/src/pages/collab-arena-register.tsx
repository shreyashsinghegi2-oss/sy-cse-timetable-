import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useCollabAuth } from "@/hooks/use-collab-auth";
import { useCollabProfile } from "@/hooks/use-collab-profile";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeft, ArrowRight, User, Mail, Phone, GraduationCap,
  Palette, Lightbulb, Code, FileText, IndianRupee, Info
} from "lucide-react";

const registrationSchema = z.object({
  fullName: z.string().min(2, "Full name is required"),
  email: z.string().email("Valid email is required"),
  mobile: z.string().min(10, "Valid mobile number is required"),
  college: z.string().min(2, "College/University name is required"),
  courseYear: z.string().min(2, "Course & Year is required"),
  categories: z.array(z.string()).min(1, "Please select at least one category"),
  projectTitle: z.string().optional(),
});

type RegistrationForm = z.infer<typeof registrationSchema>;

const PRICE_PER_CATEGORY = 50;

import { PLATFORM_ADMIN_EMAIL } from "@/config/constants";
const ADMIN_EMAIL = PLATFORM_ADMIN_EMAIL;

export default function CollabArenaRegister() {
  const [, setLocation] = useLocation();
  const { user, isAuthenticated } = useCollabAuth();
  const { profile } = useCollabProfile();
  const { toast } = useToast();

  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const totalAmount = selectedCategories.length * PRICE_PER_CATEGORY;
  
  const isAdmin = user?.email === ADMIN_EMAIL;

  const form = useForm<RegistrationForm>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      fullName: "",
      email: "",
      mobile: "",
      college: "",
      courseYear: "",
      categories: [],
      projectTitle: "",
    }
  });

  useEffect(() => {
    if (profile) {
      const p = profile as any;
      form.setValue("fullName", p.name || p.fullName || "");
      form.setValue("email", p.email || user?.email || "");
      if (p.phone || p.mobile) form.setValue("mobile", p.phone || p.mobile || "");
      if (p.organization || p.college) form.setValue("college", p.organization || p.college || "");
    } else if (user?.email) {
      form.setValue("email", user.email);
    }
  }, [profile, user, form]);

  const onSubmit = (data: RegistrationForm) => {
    sessionStorage.setItem('arenaRegistration', JSON.stringify({
      ...data,
      amountToPay: totalAmount
    }));
    setLocation('/collab-arena/payment');
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center overflow-y-auto pb-24">
        <Card className="max-w-md mx-4 border-0 shadow-lg">
          <CardContent className="p-8 text-center">
            <p className="text-gray-600 mb-4">Please sign in to register for Collab Arena</p>
            <Button onClick={() => setLocation('/student-collab')}>
              Go to Student Collab
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center overflow-y-auto pb-24">
        <Card className="max-w-md mx-4 border-0 shadow-lg">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Info className="h-8 w-8 text-red-500" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Registration Closed</h2>
            <p className="text-gray-600 mb-6">
              Registration for Collab Arena has ended. You can still view the arena feed and see all submissions.
            </p>
            <Button onClick={() => setLocation('/collab-arena')} className="w-full">
              View Arena Feed
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const categories = [
    { value: "creative", label: "Creative House", icon: Palette, color: "from-pink-500 to-rose-500", description: "Art, Sketches, Poems, Dance, Drama, Photography, Video", focus: "Creativity, originality, execution quality" },
    { value: "idea", label: "Innovative Ideas", icon: Lightbulb, color: "from-amber-500 to-yellow-500", description: "Startup ideas, Business models, Social Impact", focus: "Innovation, clarity, feasibility" },
    { value: "tech", label: "House of Tech", icon: Code, color: "from-blue-500 to-indigo-500", description: "Websites, Apps, Software, Hardware, UI/UX", focus: "Functionality, technical depth, implementation" },
  ];

  const toggleCategory = (categoryValue: string) => {
    setSelectedCategories(prev => {
      const newCategories = prev.includes(categoryValue)
        ? prev.filter(c => c !== categoryValue)
        : [...prev, categoryValue];
      form.setValue("categories", newCategories, { shouldValidate: true });
      return newCategories;
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 overflow-y-auto pb-24">
      <div className="max-w-xl mx-auto px-4 py-8">
        <button 
          onClick={() => setLocation('/collab-arena/info')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
          data-testid="button-back-to-info"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Registration Form
          </h1>
          <p className="text-gray-600 text-sm">
            Collab Arena 2026 - Step 1 of 2
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur">
              <CardContent className="p-6">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <User className="h-4 w-4 text-blue-600" />
                  Personal Details
                </h3>
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="fullName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter your full name" {...field} data-testid="input-fullname" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Address *</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="your@email.com" {...field} data-testid="input-email" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="mobile"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mobile Number *</FormLabel>
                        <FormControl>
                          <Input type="tel" placeholder="10-digit mobile number" {...field} data-testid="input-mobile" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="college"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>College / University *</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter your college name" {...field} data-testid="input-college" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="courseYear"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Course & Year *</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., B.Tech CSE, 2nd Year" {...field} data-testid="input-course" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur">
              <CardContent className="p-6">
                <h3 className="font-semibold text-gray-900 mb-2">
                  Select Categories *
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                  You can select multiple categories (₹{PRICE_PER_CATEGORY} per category)
                </p>
                <FormField
                  control={form.control}
                  name="categories"
                  render={() => (
                    <FormItem>
                      <div className="space-y-3">
                        {categories.map((cat) => {
                          const isSelected = selectedCategories.includes(cat.value);
                          return (
                            <div
                              key={cat.value}
                              className={`relative flex items-center p-4 rounded-xl border-2 transition-all cursor-pointer ${
                                isSelected 
                                  ? 'border-blue-500 bg-blue-50' 
                                  : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                              }`}
                              onClick={() => toggleCategory(cat.value)}
                              data-testid={`category-${cat.value}`}
                            >
                              <div 
                                className={`w-5 h-5 mr-4 rounded border-2 flex items-center justify-center ${
                                  isSelected ? 'bg-blue-600 border-blue-600' : 'border-gray-300'
                                }`}
                              >
                                {isSelected && (
                                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                  </svg>
                                )}
                              </div>
                              <div className={`w-10 h-10 bg-gradient-to-br ${cat.color} rounded-lg flex items-center justify-center mr-4`}>
                                <cat.icon className="h-5 w-5 text-white" />
                              </div>
                              <div className="flex-1">
                                <Label className="font-semibold text-gray-900 cursor-pointer">
                                  {cat.label}
                                </Label>
                                <p className="text-xs text-gray-500">{cat.description}</p>
                                <p className="text-xs text-blue-600 mt-1">Focus: {cat.focus}</p>
                              </div>
                              {isSelected && (
                                <div className="absolute right-4 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                  </svg>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="mt-4 bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-blue-800">
                      <p className="font-semibold mb-2">Participation Rules:</p>
                      <ul className="list-disc list-inside space-y-1 text-blue-700">
                        <li>₹{PRICE_PER_CATEGORY} per category</li>
                        <li>One project per category</li>
                        <li>Multiple categories require separate payment for each</li>
                        <li>Original work only (no plagiarism)</li>
                        <li>Submission valid only after payment verification</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur">
              <CardContent className="p-6">
                <FormField
                  control={form.control}
                  name="projectTitle"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Project Title (Optional)</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Give your project a catchy title" 
                          {...field} 
                          data-testid="input-project-title"
                        />
                      </FormControl>
                      <p className="text-xs text-gray-500 mt-1">
                        You can provide detailed project description after payment verification
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {selectedCategories.length > 0 && (
              <Card className="border-0 shadow-lg bg-blue-600 text-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-100 text-sm">Total Amount</p>
                      <p className="text-3xl font-bold flex items-center gap-1">
                        <IndianRupee className="h-6 w-6" />
                        {totalAmount}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-blue-100 text-sm">Categories Selected</p>
                      <p className="text-2xl font-bold">{selectedCategories.length}</p>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-white/20">
                    <p className="text-sm text-blue-100">
                      {selectedCategories.length} × ₹{PRICE_PER_CATEGORY} = ₹{totalAmount}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            <Button 
              type="submit"
              size="lg"
              disabled={selectedCategories.length === 0}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-6 text-lg rounded-2xl shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              data-testid="button-proceed-payment"
            >
              {selectedCategories.length === 0 ? (
                'Select at least one category'
              ) : (
                <>
                  Proceed to Payment (₹{totalAmount})
                  <ArrowRight className="h-5 w-5 ml-2" />
                </>
              )}
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
}
