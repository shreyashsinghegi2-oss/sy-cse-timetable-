import { useEffect, ReactNode } from 'react';
import { useMobileOptimizations } from '@/hooks/use-mobile-optimizations';
import { usePerformance } from '@/hooks/use-performance';
import { PerformanceMonitor } from '@/components/ui/performance-monitor';

interface PerformanceWrapperProps {
  children: ReactNode;
}

export function PerformanceWrapper({ children }: PerformanceWrapperProps) {
  const { shouldReduceAnimations, isMobile, isLowEndDevice } = useMobileOptimizations();
  const { shouldOptimize, isSlowConnection } = usePerformance();

  useEffect(() => {
    const root = document.documentElement;
    let cleanupStyle: HTMLStyleElement | null = null;
    
    if (shouldReduceAnimations) {
      root.style.setProperty('--animation-duration', '0s');
      root.style.setProperty('--transition-duration', '0s');
    } else {
      root.style.setProperty('--animation-duration', '0.3s');
      root.style.setProperty('--transition-duration', '0.2s');
    }

    if (isMobile) {
      root.style.setProperty('--touch-target-min', '44px');
      root.style.setProperty('--spacing-touch', '12px');
      document.body.style.touchAction = 'manipulation';
      document.body.style.textRendering = 'optimizeSpeed';
      (document.body.style as any).webkitFontSmoothing = 'antialiased';
    }

    if (isLowEndDevice) {
      root.style.setProperty('--box-shadow', 'none');
      root.style.setProperty('--backdrop-filter', 'none');
      
      cleanupStyle = document.createElement('style');
      cleanupStyle.textContent = `
        * {
          transform-style: flat !important;
          backface-visibility: hidden !important;
        }
      `;
      document.head.appendChild(cleanupStyle);
    }

    if (isSlowConnection) {
      const preconnectDomains = ['https://images.unsplash.com'];
      preconnectDomains.forEach(domain => {
        const link = document.createElement('link');
        link.rel = 'preconnect';
        link.href = domain;
        document.head.appendChild(link);
      });
    }
    
    return () => {
      if (cleanupStyle && cleanupStyle.parentNode) {
        document.head.removeChild(cleanupStyle);
      }
    };
  }, [shouldReduceAnimations, isMobile, isLowEndDevice, shouldOptimize, isSlowConnection]);

  return (
    <>
      <PerformanceMonitor />
      {children}
    </>
  );
}