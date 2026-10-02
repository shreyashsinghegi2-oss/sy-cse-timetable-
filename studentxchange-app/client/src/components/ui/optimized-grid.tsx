import { memo, useMemo } from 'react';
import { useMobileOptimizations } from '@/hooks/use-mobile-optimizations';
import { usePerformance } from '@/hooks/use-performance';
import { cn } from '@/lib/utils';

interface OptimizedGridProps {
  children: React.ReactNode;
  className?: string;
  minItemWidth?: number;
  gap?: number;
  maxColumns?: number;
}

export const OptimizedGrid = memo(({
  children,
  className,
  minItemWidth = 280,
  gap = 16,
  maxColumns = 4
}: OptimizedGridProps) => {
  const { isMobile, isLowEndDevice } = useMobileOptimizations();
  const { shouldOptimize } = usePerformance();

  const gridClasses = useMemo(() => {
    if (isMobile) {
      // Mobile: Use simpler grid
      return isLowEndDevice 
        ? "grid grid-cols-1 gap-4" // Single column for very low-end
        : "grid grid-cols-2 gap-3"; // Two columns for mobile
    }
    
    // Desktop: Responsive grid based on performance
    if (shouldOptimize) {
      return "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4";
    }
    
    return "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6";
  }, [isMobile, isLowEndDevice, shouldOptimize]);

  return (
    <div className={cn(gridClasses, className)}>
      {children}
    </div>
  );
});

OptimizedGrid.displayName = "OptimizedGrid";