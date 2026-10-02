import { useEffect, useState } from 'react';
import { usePerformance, useMemoryOptimization } from '@/hooks/use-performance';

export function PerformanceMonitor() {
  const { isSlowConnection, shouldOptimize, effectiveType } = usePerformance();
  const { isLowMemory } = useMemoryOptimization();
  const [showWarning, setShowWarning] = useState(false);

  useEffect(() => {
    if (isSlowConnection || isLowMemory) {
      setShowWarning(true);
      const timer = setTimeout(() => setShowWarning(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [isSlowConnection, isLowMemory]);

  if (!showWarning) return null;

  return (
    <div className="fixed top-16 right-4 z-50 bg-orange-100 border border-orange-200 rounded-lg p-3 shadow-lg max-w-sm">
      <div className="text-sm text-orange-800">
        <p className="font-medium mb-1">Performance Notice</p>
        {isSlowConnection && (
          <p className="text-xs">Slow connection detected ({effectiveType}). Optimizing experience...</p>
        )}
        {isLowMemory && (
          <p className="text-xs">Low memory detected. Reducing animations...</p>
        )}
      </div>
    </div>
  );
}