import { Shield, CheckCircle, Award, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface TrustBadgeProps {
  type: 'verified' | 'university' | 'top_seller' | 'new_member';
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function TrustBadge({ type, className, size = 'sm' }: TrustBadgeProps) {
  const badges = {
    verified: {
      icon: CheckCircle,
      text: "Verified Student",
      color: "bg-green-100 text-green-700 border-green-200",
      description: "Student ID verified"
    },
    university: {
      icon: Shield,
      text: "University Verified",
      color: "bg-blue-100 text-blue-700 border-blue-200",
      description: "Institution confirmed"
    },
    top_seller: {
      icon: Award,
      text: "Top Seller",
      color: "bg-yellow-100 text-yellow-700 border-yellow-200",
      description: "Highly rated seller"
    },
    new_member: {
      icon: Star,
      text: "New Member",
      color: "bg-purple-100 text-purple-700 border-purple-200",
      description: "New to platform"
    }
  };

  const badge = badges[type];
  const Icon = badge.icon;
  
  const sizeClasses = {
    sm: "text-xs px-2 py-0.5",
    md: "text-sm px-3 py-1",
    lg: "text-base px-4 py-2"
  };

  return (
    <Badge 
      variant="outline" 
      className={cn(
        badge.color,
        sizeClasses[size],
        "flex items-center gap-1 font-medium",
        className
      )}
      title={badge.description}
    >
      <Icon className={cn(
        size === 'sm' ? "h-3 w-3" : size === 'md' ? "h-4 w-4" : "h-5 w-5"
      )} />
      {badge.text}
    </Badge>
  );
}