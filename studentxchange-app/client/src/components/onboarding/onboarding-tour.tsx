import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, ChevronRight, ChevronLeft, Play, Check } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

interface TourStep {
  id: string;
  title: string;
  description: string;
  target: string;
  position: 'top' | 'bottom' | 'left' | 'right';
  content: React.ReactNode;
  action?: string;
}

const tourSteps: TourStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to StudentXchange!',
    description: 'Let\'s take a quick tour to help you get started',
    target: '#header',
    position: 'bottom',
    content: (
      <div className="space-y-3">
        <p className="text-gray-600">
          StudentXchange is your marketplace for educational materials. Buy and sell textbooks, notes, assignments, and more with fellow students.
        </p>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">Quick Tour</Badge>
          <span className="text-sm text-gray-500">Takes 2-3 minutes</span>
        </div>
      </div>
    )
  },
  {
    id: 'search',
    title: 'Search & Browse',
    description: 'Find what you need quickly',
    target: '#search-bar',
    position: 'bottom',
    content: (
      <div className="space-y-3">
        <p className="text-gray-600">
          Use the search bar to find specific items, or browse by category. You can filter by price, condition, and location.
        </p>
        <div className="bg-blue-50 p-3 rounded-lg">
          <p className="text-sm text-blue-800">
            💡 <strong>Tip:</strong> Use specific keywords like "Engineering Physics Notes" for better results
          </p>
        </div>
      </div>
    )
  },
  {
    id: 'categories',
    title: 'Browse Categories',
    description: 'Explore by subject and type',
    target: '#categories',
    position: 'bottom',
    content: (
      <div className="space-y-3">
        <p className="text-gray-600">
          Browse items by category: Textbooks, Notes, Assignments, Lab Journals, and Stationery. Each category is organized by subject.
        </p>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="bg-green-50 p-2 rounded">📚 Textbooks</div>
          <div className="bg-blue-50 p-2 rounded">📝 Notes</div>
          <div className="bg-purple-50 p-2 rounded">📋 Assignments</div>
          <div className="bg-orange-50 p-2 rounded">🧪 Lab Journals</div>
        </div>
      </div>
    )
  },
  {
    id: 'product-details',
    title: 'Product Information',
    description: 'View detailed product information',
    target: '#product-card',
    position: 'right',
    content: (
      <div className="space-y-3">
        <p className="text-gray-600">
          Click on any product to see detailed information, photos, seller details, and reviews from other students.
        </p>
        <div className="bg-yellow-50 p-3 rounded-lg">
          <p className="text-sm text-yellow-800">
            ⭐ <strong>Check Reviews:</strong> Read what other students say about the item and seller
          </p>
        </div>
      </div>
    )
  },
  {
    id: 'sell-items',
    title: 'Sell Your Items',
    description: 'Turn your unused items into cash',
    target: '#sell-button',
    position: 'bottom',
    content: (
      <div className="space-y-3">
        <p className="text-gray-600">
          Ready to sell? Click "Sell Your Items" to list your textbooks, notes, or other educational materials.
        </p>
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span>Upload photos and descriptions</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span>Set your price with our guidance</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span>Get paid after successful sale</span>
          </div>
        </div>
      </div>
    )
  },
  {
    id: 'profile',
    title: 'Your Profile & Orders',
    description: 'Manage your account and track orders',
    target: '#profile-menu',
    position: 'left',
    content: (
      <div className="space-y-3">
        <p className="text-gray-600">
          Access your profile to manage listings, view order history, and track your achievements.
        </p>
        <div className="grid grid-cols-1 gap-2 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-blue-600">📦</span>
            <span>Track your orders</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-green-600">🏆</span>
            <span>View achievements</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-purple-600">📋</span>
            <span>Manage your listings</span>
          </div>
        </div>
      </div>
    )
  },
  {
    id: 'achievements',
    title: 'Achievement System',
    description: 'Earn badges and level up',
    target: '#achievements-link',
    position: 'bottom',
    content: (
      <div className="space-y-3">
        <p className="text-gray-600">
          Earn achievement badges for sales, purchases, and community participation. Level up to unlock rewards!
        </p>
        <div className="flex items-center gap-2">
          <Badge className="bg-yellow-100 text-yellow-800">🏆 First Sale</Badge>
          <Badge className="bg-blue-100 text-blue-800">🛒 Active Buyer</Badge>
          <Badge className="bg-purple-100 text-purple-800">⭐ Helpful Reviewer</Badge>
        </div>
      </div>
    )
  },
  {
    id: 'complete',
    title: 'You\'re All Set!',
    description: 'Ready to start your StudentXchange journey',
    target: '#main-content',
    position: 'top',
    content: (
      <div className="space-y-3">
        <p className="text-gray-600">
          You're now ready to buy and sell on StudentXchange! Remember, we're here to help students succeed.
        </p>
        <div className="bg-green-50 p-3 rounded-lg">
          <p className="text-sm text-green-800">
            🎉 <strong>Welcome aboard!</strong> Start by browsing items or listing something to sell
          </p>
        </div>
      </div>
    )
  }
];

interface OnboardingTourProps {
  onComplete: () => void;
}

export function OnboardingTour({ onComplete }: OnboardingTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [highlightedElement, setHighlightedElement] = useState<HTMLElement | null>(null);
  const [tourPosition, setTourPosition] = useState({ top: 50, left: 50 });

  useEffect(() => {
    const step = tourSteps[currentStep];
    if (step) {
      const element = document.querySelector(step.target) as HTMLElement;
      if (element) {
        setHighlightedElement(element);
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // Add highlight class
        element.classList.add('tour-highlight');
        
        // Calculate responsive position for tour card
        const rect = element.getBoundingClientRect();
        const windowHeight = window.innerHeight;
        const windowWidth = window.innerWidth;
        const isMobile = windowWidth < 768;
        
        let top: number;
        let left: number;
        
        if (isMobile) {
          // Mobile positioning - always show at bottom with full width
          top = Math.max(20, windowHeight - 280); // Fixed position from bottom, with minimum top margin
          left = 10; // Small margin from edges
        } else {
          // Desktop positioning logic
          const cardWidth = 400;
          const cardHeight = 300;
          
          top = rect.top + rect.height + 20;
          left = rect.left + rect.width / 2 - cardWidth / 2;
          
          // Adjust position to stay within viewport
          if (top + cardHeight > windowHeight) {
            top = rect.top - cardHeight - 20; // Show above element
          }
          if (left < 20) {
            left = 20;
          }
          if (left + cardWidth > windowWidth) {
            left = windowWidth - cardWidth - 20;
          }
        }
        
        setTourPosition({ top, left });
        
        return () => {
          element.classList.remove('tour-highlight');
        };
      } else {
        // If element not found, position tour card appropriately
        const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
        setTourPosition({ 
          top: isMobile ? Math.max(20, window.innerHeight - 280) : window.innerHeight / 2 - 150,
          left: isMobile ? 10 : window.innerWidth / 2 - 200 
        });
      }
    }
  }, [currentStep]);

  const nextStep = () => {
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      completeTour();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const completeTour = () => {
    setIsVisible(false);
    localStorage.setItem('onboardingCompleted', 'true');
    onComplete();
  };

  const skipTour = () => {
    const confirmSkip = window.confirm("Are you sure you want to skip the tour? You can always restart it later from the help menu.");
    if (confirmSkip) {
      setIsVisible(false);
      localStorage.setItem('onboardingCompleted', 'true');
      onComplete();
    }
  };

  if (!isVisible) return null;

  const step = tourSteps[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === tourSteps.length - 1;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-50 z-[9999] tour-overlay" />
      
      {/* Tour Card */}
      <Card 
        className="fixed z-[10000] shadow-xl border-2 border-primary/20 
                   max-w-sm md:max-w-md lg:max-w-lg tour-card"
        style={{ 
          top: `${tourPosition.top}px`, 
          left: `${tourPosition.left}px`,
          width: typeof window !== 'undefined' && window.innerWidth < 768 ? 'calc(100vw - 20px)' : '400px',
          maxHeight: typeof window !== 'undefined' && window.innerHeight < 600 ? 'calc(100vh - 100px)' : 'auto'
        }}
      >
        <CardContent className="p-4 md:p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-3 md:mb-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <Badge variant="outline" className="text-xs shrink-0">
                  {currentStep + 1} of {tourSteps.length}
                </Badge>
                {step.id === 'welcome' && <Play className="h-4 w-4 text-primary shrink-0" />}
                {step.id === 'complete' && <Check className="h-4 w-4 text-green-600 shrink-0" />}
              </div>
              <h3 className="text-base md:text-lg font-semibold text-gray-900 truncate tour-text">
                {step.title}
              </h3>
              <p className="text-sm text-gray-600 mt-1 line-clamp-2 tour-text">
                {step.description}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={skipTour}
              className="text-gray-400 hover:text-gray-600 p-1 shrink-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Content */}
          <div className="mb-4 md:mb-6 text-sm md:text-base overflow-y-auto max-h-32 md:max-h-none tour-text">
            {step.content}
          </div>

          {/* Progress Bar */}
          <div className="mb-3 md:mb-4">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Progress</span>
              <span>{Math.round(((currentStep + 1) / tourSteps.length) * 100)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1.5 md:h-2">
              <div 
                className="bg-primary h-1.5 md:h-2 rounded-full transition-all duration-300"
                style={{ width: `${((currentStep + 1) / tourSteps.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Navigation - Mobile Responsive */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2 md:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={prevStep}
              disabled={isFirstStep}
              className="flex items-center justify-center gap-1 order-2 md:order-1 min-h-[44px] tour-button touch-target"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            
            <div className="flex items-center gap-2 order-1 md:order-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={skipTour}
                className="text-gray-500 hover:text-gray-700 flex-1 md:flex-none min-h-[44px] tour-button touch-target"
              >
                Skip Tour
              </Button>
              
              <Button
                onClick={nextStep}
                size="sm"
                className="flex items-center justify-center gap-1 flex-1 md:flex-none min-h-[44px] tour-button touch-target"
              >
                {isLastStep ? 'Complete' : 'Next'}
                {!isLastStep && <ChevronRight className="h-4 w-4" />}
                {isLastStep && <Check className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Highlight Pointer */}
      {highlightedElement && (
        <div className="fixed z-[10001] pointer-events-none">
          <div className="absolute animate-pulse">
            <div className="w-4 h-4 bg-primary rounded-full shadow-lg" />
            <div className="w-4 h-4 bg-primary rounded-full shadow-lg animate-ping absolute top-0 left-0" />
          </div>
        </div>
      )}
    </>
  );
}