import { useEffect } from "react";

// Add tour-specific CSS classes
const tourStyles = `
  .tour-highlight {
    position: relative;
    z-index: 9998;
    border-radius: 8px;
    box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.5), 0 0 0 8px rgba(59, 130, 246, 0.2);
    transition: all 0.3s ease;
  }

  .tour-highlight::before {
    content: '';
    position: absolute;
    top: -4px;
    left: -4px;
    right: -4px;
    bottom: -4px;
    background: transparent;
    border: 2px solid #3b82f6;
    border-radius: 8px;
    animation: tour-pulse 2s infinite;
    z-index: -1;
  }

  @keyframes tour-pulse {
    0% {
      transform: scale(1);
      opacity: 1;
    }
    50% {
      transform: scale(1.05);
      opacity: 0.7;
    }
    100% {
      transform: scale(1);
      opacity: 1;
    }
  }

  .tour-spotlight {
    position: relative;
    z-index: 9998;
    background: white;
    border-radius: 8px;
    box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.5);
  }
`;

export function TourHighlights() {
  useEffect(() => {
    // Inject tour styles
    const style = document.createElement('style');
    style.textContent = tourStyles;
    document.head.appendChild(style);

    return () => {
      // Cleanup styles
      document.head.removeChild(style);
    };
  }, []);

  return null;
}

// Hook to add tour IDs to components
export function useTourId(id: string) {
  useEffect(() => {
    const element = document.getElementById(id);
    if (element) {
      element.setAttribute('data-tour-id', id);
    }
  }, [id]);
}