import { forwardRef, ButtonHTMLAttributes } from 'react';
import { Button, ButtonProps } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// Touch-friendly button with minimum 44px tap target
export const TouchButton = forwardRef<
  HTMLButtonElement,
  ButtonProps & { touchOptimized?: boolean }
>(({ className, touchOptimized = false, children, ...props }, ref) => {
  return (
    <Button
      ref={ref}
      className={cn(
        touchOptimized && "min-h-[44px] min-w-[44px] px-4 py-2",
        className
      )}
      {...props}
    >
      {children}
    </Button>
  );
});

TouchButton.displayName = "TouchButton";

// Touch-friendly card with optimized hover states
export const TouchCard = forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { touchOptimized?: boolean }
>(({ className, touchOptimized = false, children, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        "rounded-lg border bg-card text-card-foreground shadow-sm transition-colors",
        touchOptimized && "hover:bg-accent/50 active:bg-accent/80 touch-manipulation",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
});

TouchCard.displayName = "TouchCard";