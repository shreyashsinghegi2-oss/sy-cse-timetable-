import { memo, useState, useEffect, useRef, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { usePerformance } from '@/hooks/use-performance';

// Optimized Card with reduced animations for slow devices
export const LagFreeCard = memo(({ 
  children, 
  className, 
  ...props 
}: React.HTMLAttributes<HTMLDivElement>) => {
  const { isSlowConnection, shouldOptimize } = usePerformance();
  
  return (
    <Card 
      className={cn(
        "transition-colors",
        shouldOptimize ? 
          "hover:bg-accent/30" : // Reduced hover effects for slow devices
          "hover:shadow-lg transition-all duration-200 hover:scale-[1.02]",
        className
      )}
      {...props}
    >
      {children}
    </Card>
  );
});

// Optimized Button with better touch targets
export const LagFreeButton = memo(({
  children,
  className,
  variant = "default",
  size = "default",
  ...props
}: any) => {
  return (
    <Button
      className={cn(
        "min-h-[44px] touch-manipulation", // Better touch targets
        className
      )}
      variant={variant}
      size={size}
      {...props}
    >
      {children}
    </Button>
  );
});

// Intersection Observer for lazy loading
export const LazyLoadWrapper = memo(({ 
  children, 
  threshold = 0.1,
  rootMargin = "50px" 
}: {
  children: React.ReactNode;
  threshold?: number;
  rootMargin?: string;
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold, rootMargin }
    );
    
    if (ref.current) {
      observer.observe(ref.current);
    }
    
    return () => observer.disconnect();
  }, [threshold, rootMargin]);
  
  return (
    <div ref={ref}>
      {isVisible ? children : <div className="h-64 bg-gray-100 animate-pulse rounded" />}
    </div>
  );
});

// Optimized Badge with reduced DOM complexity
export const LagFreeBadge = memo(({ 
  children, 
  variant = "default", 
  className 
}: {
  children: React.ReactNode;
  variant?: "default" | "secondary" | "destructive" | "outline";
  className?: string;
}) => {
  const badgeStyles = useMemo(() => {
    const baseStyles = "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium";
    const variants = {
      default: "bg-primary text-primary-foreground",
      secondary: "bg-secondary text-secondary-foreground",
      destructive: "bg-destructive text-destructive-foreground",
      outline: "border border-input bg-background"
    };
    return cn(baseStyles, variants[variant], className);
  }, [variant, className]);
  
  return <span className={badgeStyles}>{children}</span>;
});

LagFreeCard.displayName = "LagFreeCard";
LagFreeButton.displayName = "LagFreeButton";
LazyLoadWrapper.displayName = "LazyLoadWrapper";
LagFreeBadge.displayName = "LagFreeBadge";