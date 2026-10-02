import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Trophy, Star, ShoppingCart, Package, Users, TrendingUp, Target, Award } from "lucide-react";

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'seller' | 'buyer' | 'community' | 'milestone';
  points: number;
  requirement: number;
  currentProgress: number;
  unlocked: boolean;
  unlockedAt?: Date;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

const iconMap = {
  trophy: Trophy,
  star: Star,
  cart: ShoppingCart,
  package: Package,
  users: Users,
  trending: TrendingUp,
  target: Target,
  award: Award,
};

const rarityColors = {
  common: 'bg-gray-100 text-gray-800 border-gray-300',
  rare: 'bg-blue-100 text-blue-800 border-blue-300',
  epic: 'bg-purple-100 text-purple-800 border-purple-300',
  legendary: 'bg-yellow-100 text-yellow-800 border-yellow-300',
};

const categoryColors = {
  seller: 'bg-green-50 border-green-200',
  buyer: 'bg-blue-50 border-blue-200',
  community: 'bg-purple-50 border-purple-200',
  milestone: 'bg-yellow-50 border-yellow-200',
};

interface AchievementBadgeProps {
  achievement: {
    id: string;
    name: string;
    description: string;
    icon: string;
    category: string;
    points: number;
    rarity: string;
  };
  status: 'locked' | 'completed' | 'in_progress';
  progress: number;
  earnedDate?: Date;
  size?: 'small' | 'medium' | 'large';
}

export function AchievementBadge({ achievement, status, progress, earnedDate, size = 'medium' }: AchievementBadgeProps) {
  const IconComponent = iconMap[achievement.icon as keyof typeof iconMap] || Trophy;
  const isCompleted = status === 'completed';
  const isLocked = status === 'locked';
  
  const sizeClasses = {
    small: 'p-2',
    medium: 'p-4',
    large: 'p-6'
  };
  
  const iconSizes = {
    small: 'h-4 w-4',
    medium: 'h-6 w-6',
    large: 'h-8 w-8'
  };

  return (
    <Card className={`${categoryColors[achievement.category as keyof typeof categoryColors] || 'bg-gray-50 border-gray-200'} ${isCompleted ? 'ring-2 ring-yellow-300' : ''}`}>
      <CardContent className={sizeClasses[size]}>
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-full ${isCompleted ? 'bg-yellow-100' : 'bg-gray-100'}`}>
            <IconComponent className={`${iconSizes[size]} ${isCompleted ? 'text-yellow-600' : 'text-gray-400'}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-gray-900 truncate">{achievement.name}</h3>
              <Badge className={`text-xs ${rarityColors[achievement.rarity as keyof typeof rarityColors] || 'bg-gray-100 text-gray-800'}`}>
                {achievement.rarity}
              </Badge>
            </div>
            <p className="text-sm text-gray-600 mb-2">{achievement.description}</p>
            
            {isCompleted ? (
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  Completed
                </Badge>
                <span className="text-sm font-medium text-green-600">+{achievement.points} points</span>
                {earnedDate && (
                  <span className="text-xs text-gray-500">
                    {new Date(earnedDate).toLocaleDateString()}
                  </span>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Progress</span>
                  <span className="font-medium">{Math.round(progress)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">{Math.round(progress)}% complete</span>
                  <span className="text-xs font-medium text-blue-600">+{achievement.points} points</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}