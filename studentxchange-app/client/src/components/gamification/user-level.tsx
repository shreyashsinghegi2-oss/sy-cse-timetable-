import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Star, TrendingUp } from "lucide-react";

interface UserLevelProps {
  level: number;
  points: number;
  showProgress?: boolean;
  size?: 'small' | 'medium' | 'large';
}

// Calculate points needed for next level
const getPointsForLevel = (level: number): number => {
  return level * 100; // Each level requires 100 more points than the previous
};

export function UserLevel({ level, points, showProgress = false, size = 'medium' }: UserLevelProps) {
  const currentLevelPoints = getPointsForLevel(level - 1);
  const nextLevelPoints = getPointsForLevel(level);
  const progressInCurrentLevel = Math.max(0, points - currentLevelPoints);
  const pointsNeededForCurrentLevel = nextLevelPoints - currentLevelPoints;
  const progressPercentage = Math.min((progressInCurrentLevel / pointsNeededForCurrentLevel) * 100, 100);

  const getLevelColor = (level: number) => {
    if (level >= 50) return 'bg-purple-100 text-purple-800 border-purple-300';
    if (level >= 25) return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    if (level >= 10) return 'bg-blue-100 text-blue-800 border-blue-300';
    return 'bg-green-100 text-green-800 border-green-300';
  };

  const getLevelTitle = (level: number) => {
    if (level >= 50) return 'Legend';
    if (level >= 25) return 'Expert';
    if (level >= 10) return 'Advanced';
    if (level >= 5) return 'Intermediate';
    return 'Beginner';
  };

  const sizeClasses = {
    small: 'text-sm',
    medium: 'text-base',
    large: 'text-lg'
  };

  const iconSizes = {
    small: 'h-4 w-4',
    medium: 'h-5 w-5',
    large: 'h-6 w-6'
  };

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2">
        <div className={`p-2 rounded-full ${getLevelColor(level)} border`}>
          <Star className={`${iconSizes[size]} fill-current`} />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className={`font-bold ${sizeClasses[size]}`}>Level {level}</span>
            <Badge variant="secondary" className={`text-xs ${getLevelColor(level)}`}>
              {getLevelTitle(level)}
            </Badge>
          </div>
          {showProgress && (
            <div className="mt-1 space-y-1">
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>{progressInCurrentLevel} / {pointsNeededForCurrentLevel} XP</span>
                <span>{Math.round(progressPercentage)}%</span>
              </div>
              <Progress value={progressPercentage} className="h-2" />
            </div>
          )}
        </div>
      </div>
      
      <div className="flex items-center gap-1 text-blue-600">
        <TrendingUp className="h-4 w-4" />
        <span className="text-sm font-medium">{points} XP</span>
      </div>
    </div>
  );
}