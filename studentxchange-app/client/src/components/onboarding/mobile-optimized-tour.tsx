import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Check, Play, X } from "lucide-react";

interface TourStep {
  id: string;
  title: string;
  description: string;
  target: string;
  position: 'top' | 'bottom' | 'left' | 'right';
  content: React.ReactNode;
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
        <p className="text-gray-600 text-sm">
          StudentXchange is your marketplace for educational materials. Buy and sell textbooks, notes, assignments, and more with fellow students.
        </p>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">Quick Tour</Badge>
          <span className="text-xs text-gray-500">Takes 2-3 minutes</span>
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
        <p className="text-gray-600 text-sm">
          Use the search bar to find specific items, or browse by category. You can filter by price, condition, and location.
        </p>
        <div className="bg-blue-50 p-2 rounded-lg">
          <p className="text-xs text-blue-800">
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
        <p className="text-gray-600 text-sm">
          Browse items by category: Textbooks, Notes, Assignments, Lab Journals, and Stationery.
        </p>
        <div className="grid grid-cols-2 gap-1 text-xs">
          <div className="bg-green-50 p-1 rounded text-center">📚 Textbooks</div>
          <div className="bg-blue-50 p-1 rounded text-center">📝 Notes</div>
          <div className="bg-purple-50 p-1 rounded text-center">📋 Assignments</div>
          <div className="bg-orange-50 p-1 rounded text-center">🧪 Labs</div>
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
        <p className="text-gray-600 text-sm">
          Ready to sell? Click "Sell Your Items" to list your textbooks, notes, or other educational materials.
        </p>
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs">
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
            <span>Upload photos and descriptions</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
            <span>Set your price with our guidance</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
            <span>Get paid after successful sale</span>
          </div>
        </div>
      </div>
    )
  },
  {
    id: 'complete',
    title: 'You\'re All Set!',
    description: 'Start buying and selling educational materials',
    target: '#header',
    position: 'bottom',
    content: (
      <div className="space-y-3">
        <p className="text-gray-600 text-sm">
          Great! You're ready to start using StudentXchange. Happy buying and selling!
        </p>
        <div className="bg-green-50 p-2 rounded-lg">
          <p className="text-xs text-green-800">
            🎉 <strong>Welcome aboard!</strong> You can restart this tour anytime from the help menu.
          </p>
        </div>
      </div>
    )
  }
];

interface MobileOptimizedTourProps {
  onComplete: () => void;
}

export function MobileOptimizedTour({ onComplete }: MobileOptimizedTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [highlightedElement, setHighlightedElement] = useState<HTMLElement | null>(null);
  const [tourPosition, setTourPosition] = useState({ top: 0, left: 0 });

  const updatePosition = useCallback(() => {
    if (!highlightedElement) return;
    
    const targetRect = highlightedElement.getBoundingClientRect();
    const isMobile = window.innerWidth < 768;
    const cardWidth = isMobile ? window.innerWidth - 20 : 350;
    const cardHeight = 200;
    
    let top, left;
    
    if (isMobile) {
      // Mobile: Center horizontally and position smartly
      left = 10;
      
      // Check if target is in upper half of screen
      const isTargetInUpperHalf = targetRect.top < window.innerHeight / 2;
      
      if (isTargetInUpperHalf) {
        // Position below target
        top = Math.min(targetRect.bottom + 10, window.innerHeight - cardHeight - 10);
      } else {
        // Position above target
        top = Math.max(targetRect.top - cardHeight - 10, 10);
      }
      
      // Ensure tour doesn't go off screen
      if (top + cardHeight > window.innerHeight - 20) {
        top = window.innerHeight - cardHeight - 20;
      }
      if (top < 20) {
        top = 20;
      }
    } else {
      // Desktop positioning
      top = targetRect.bottom + 10;
      left = Math.max(10, Math.min(targetRect.left, window.innerWidth - cardWidth - 10));
      
      if (top + cardHeight > window.innerHeight) {
        top = targetRect.top - cardHeight - 10;
      }
    }
    
    setTourPosition({ top, left });
  }, [highlightedElement]);

  useEffect(() => {
    const step = tourSteps[currentStep];
    const targetElement = document.querySelector(step.target) as HTMLElement;
    
    if (targetElement) {
      setHighlightedElement(targetElement);
      
      // Scroll element into view on mobile
      if (window.innerWidth < 768) {
        targetElement.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center',
          inline: 'center'
        });
      }
    }
  }, [currentStep]);

  useEffect(() => {
    updatePosition();
    
    const handleResize = () => updatePosition();
    const handleScroll = () => updatePosition();
    
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleScroll);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll);
    };
  }, [updatePosition]);

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
    completeTour();
  };

  if (!isVisible) return null;

  const step = tourSteps[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === tourSteps.length - 1;
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  return (
    <>
      {/* Mobile-optimized backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-40 z-[9999] tour-overlay" />
      
      {/* Tour Card */}
      <Card 
        className="fixed z-[10000] shadow-2xl border-2 border-primary/20 tour-card"
        style={{ 
          top: `${tourPosition.top}px`, 
          left: `${tourPosition.left}px`,
          width: isMobile ? 'calc(100vw - 20px)' : '350px',
          maxHeight: isMobile ? '300px' : 'auto'
        }}
      >
        <CardContent className="p-4">
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="text-xs">
                  {currentStep + 1} of {tourSteps.length}
                </Badge>
                {step.id === 'welcome' && <Play className="h-3 w-3 text-primary" />}
                {step.id === 'complete' && <Check className="h-3 w-3 text-green-600" />}
              </div>
              <h3 className="text-sm font-semibold text-gray-900 leading-tight">
                {step.title}
              </h3>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={skipTour}
              className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600 ml-2"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Content */}
          <div className="mb-4 text-sm">
            {step.content}
          </div>

          {/* Navigation - Mobile Optimized */}
          <div className="flex items-center justify-between gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={prevStep}
              disabled={isFirstStep}
              className={`flex items-center gap-1 ${isMobile ? 'min-h-[44px] px-3' : ''}`}
            >
              <ChevronLeft className="h-3 w-3" />
              {!isMobile && "Previous"}
            </Button>
            
            <div className="flex items-center gap-1">
              {tourSteps.map((_, index) => (
                <div
                  key={index}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    index === currentStep ? 'bg-primary' : 'bg-gray-200'
                  }`}
                />
              ))}
            </div>
            
            <Button
              onClick={nextStep}
              size="sm"
              className={`flex items-center gap-1 ${isMobile ? 'min-h-[44px] px-3' : ''}`}
            >
              {isLastStep ? 'Complete' : isMobile ? 'Next' : 'Next'}
              {!isLastStep && <ChevronRight className="h-3 w-3" />}
              {isLastStep && <Check className="h-3 w-3" />}
            </Button>
          </div>
        </CardContent>
      </Card>
    </>
  );
}