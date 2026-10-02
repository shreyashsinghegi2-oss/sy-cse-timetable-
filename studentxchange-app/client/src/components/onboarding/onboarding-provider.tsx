import { createContext, useContext, useState, useEffect } from "react";
import { OnboardingTour } from "./onboarding-tour";
import { MobileOptimizedTour } from "./mobile-optimized-tour";

interface OnboardingContextType {
  showTour: boolean;
  startTour: () => void;
  completeTour: () => void;
  isFirstVisit: boolean;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error("useOnboarding must be used within OnboardingProvider");
  }
  return context;
}

interface OnboardingProviderProps {
  children: React.ReactNode;
}

export function OnboardingProvider({ children }: OnboardingProviderProps) {
  const [showTour, setShowTour] = useState(false);
  const [isFirstVisit, setIsFirstVisit] = useState(false);

  useEffect(() => {
    try {
      const hasCompletedOnboarding = localStorage.getItem('onboardingCompleted');
      const hasVisited = localStorage.getItem('hasVisited');
      
      if (!hasCompletedOnboarding && !hasVisited) {
        setIsFirstVisit(true);
        // Show tour after a brief delay to ensure page is loaded
        setTimeout(() => {
          setShowTour(true);
        }, 2000);
        
        // Mark that user has visited
        localStorage.setItem('hasVisited', 'true');
      }
    } catch (error) {
      console.error('Error in onboarding provider:', error);
    }
  }, []);

  const startTour = () => {
    setShowTour(true);
  };

  const completeTour = () => {
    setShowTour(false);
    try {
      localStorage.setItem('onboardingCompleted', 'true');
    } catch (error) {
      console.error('Error saving onboarding completion:', error);
    }
  };

  return (
    <OnboardingContext.Provider
      value={{
        showTour,
        startTour,
        completeTour,
        isFirstVisit
      }}
    >
      {children}
      {showTour && (
        <div style={{ position: 'fixed', top: 0, left: 0, zIndex: 10000 }}>
          {typeof window !== 'undefined' && window.innerWidth < 768 ? (
            <MobileOptimizedTour onComplete={completeTour} />
          ) : (
            <OnboardingTour onComplete={completeTour} />
          )}
        </div>
      )}
    </OnboardingContext.Provider>
  );
}