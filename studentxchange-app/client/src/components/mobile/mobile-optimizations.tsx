import { useEffect } from 'react';

// Mobile performance optimizations
export function useMobileOptimizations() {
  useEffect(() => {
    // Prevent zoom on input focus for better UX
    const viewport = document.querySelector('meta[name="viewport"]');
    if (viewport) {
      viewport.setAttribute('content', 
        'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no'
      );
    }

    // Add touch-friendly styles
    const style = document.createElement('style');
    style.textContent = `
      /* Smooth scrolling for low-spec phones */
      * {
        -webkit-overflow-scrolling: touch;
      }
      
      /* Hide scrollbars */
      .scrollbar-hide {
        -ms-overflow-style: none;
        scrollbar-width: none;
      }
      .scrollbar-hide::-webkit-scrollbar {
        display: none;
      }
      
      /* Touch-friendly buttons */
      button, .cursor-pointer {
        min-height: 44px;
        min-width: 44px;
      }
      
      /* Reduce animations on low-spec devices */
      @media (prefers-reduced-motion: reduce) {
        * {
          animation-duration: 0.01ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: 0.01ms !important;
        }
      }
      
      /* Optimize for slow connections */
      img {
        loading: lazy;
      }
      
      /* Improve touch targets */
      input, textarea, select {
        min-height: 44px;
        font-size: 16px; /* Prevents zoom on iOS */
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);
}

// Performance monitoring for Core Web Vitals
export function usePerformanceMonitoring() {
  // No-op in production — hook kept for API compatibility
}