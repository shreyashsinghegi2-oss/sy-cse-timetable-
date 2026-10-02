import { Button } from "@/components/ui/button";
import { Play, RotateCcw } from "lucide-react";
import { useOnboarding } from "./onboarding-provider";

interface TourTriggerProps {
  variant?: "default" | "ghost" | "outline";
  size?: "sm" | "default" | "lg";
  showIcon?: boolean;
  children?: React.ReactNode;
}

export function TourTrigger({ 
  variant = "outline", 
  size = "sm", 
  showIcon = true,
  children
}: TourTriggerProps) {
  const { startTour } = useOnboarding();

  return (
    <Button
      variant={variant}
      size={size}
      onClick={startTour}
      className="flex items-center gap-2"
    >
      {showIcon && <Play className="h-4 w-4" />}
      {children || "Take Tour"}
    </Button>
  );
}

export function RestartTourButton() {
  const { startTour } = useOnboarding();

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => {
        localStorage.removeItem('onboardingCompleted');
        startTour();
      }}
      className="flex items-center gap-2 text-gray-500 hover:text-gray-700"
    >
      <RotateCcw className="h-4 w-4" />
      Restart Tour
    </Button>
  );
}