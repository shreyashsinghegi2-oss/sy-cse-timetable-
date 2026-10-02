import { useEffect, useState, useCallback } from 'react';

export function useMobileOptimizations() {
  const [isMobile, setIsMobile] = useState(false);
  const [isLowEndDevice, setIsLowEndDevice] = useState(false);
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');

  useEffect(() => {
    const checkDevice = () => {
      // Check if mobile
      const mobileCheck = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      setIsMobile(mobileCheck);

      // Check for low-end device indicators
      const memory = (navigator as any).deviceMemory || 4; // Default to 4GB if not available
      const cores = navigator.hardwareConcurrency || 4; // Default to 4 cores if not available
      
      const isLowEnd = memory <= 2 || cores <= 2 || window.innerWidth <= 360;
      setIsLowEndDevice(isLowEnd);

      // Check orientation
      setOrientation(window.innerHeight > window.innerWidth ? 'portrait' : 'landscape');
    };

    checkDevice();
    window.addEventListener('resize', checkDevice);
    window.addEventListener('orientationchange', checkDevice);

    return () => {
      window.removeEventListener('resize', checkDevice);
      window.removeEventListener('orientationchange', checkDevice);
    };
  }, []);

  // Optimize scrolling for mobile
  const optimizeScrolling = useCallback(() => {
    if (isMobile) {
      (document.body.style as any).webkitOverflowScrolling = 'touch';
      (document.body.style as any).overflowScrolling = 'touch';
    }
  }, [isMobile]);

  // Reduce animations for low-end devices
  const shouldReduceAnimations = isLowEndDevice || window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Touch-friendly measurements
  const minTouchTarget = 44; // 44px minimum touch target
  const safeAreaInsets = {
    top: parseInt(getComputedStyle(document.documentElement).getPropertyValue('--safe-area-inset-top') || '0'),
    bottom: parseInt(getComputedStyle(document.documentElement).getPropertyValue('--safe-area-inset-bottom') || '0'),
    left: parseInt(getComputedStyle(document.documentElement).getPropertyValue('--safe-area-inset-left') || '0'),
    right: parseInt(getComputedStyle(document.documentElement).getPropertyValue('--safe-area-inset-right') || '0'),
  };

  useEffect(() => {
    optimizeScrolling();
  }, [optimizeScrolling]);

  return {
    isMobile,
    isLowEndDevice,
    orientation,
    shouldReduceAnimations,
    minTouchTarget,
    safeAreaInsets,
    // Helper functions
    getTouchFriendlySize: (baseSize: number) => Math.max(baseSize, minTouchTarget),
    getOptimizedClassName: (normalClass: string, mobileClass: string) => 
      isMobile ? mobileClass : normalClass,
  };
}