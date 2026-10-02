import { Achievement } from "@/components/gamification/achievement-badge";

export const ACHIEVEMENT_DEFINITIONS: Record<string, Omit<Achievement, 'currentProgress' | 'unlocked' | 'unlockedAt'>> = {
  // Seller Achievements
  first_sale: {
    id: 'first_sale',
    name: 'First Sale',
    description: 'Complete your first successful sale',
    icon: 'package',
    category: 'seller',
    points: 50,
    requirement: 1,
    rarity: 'common',
  },
  five_sales: {
    id: 'five_sales',
    name: 'Rising Seller',
    description: 'Complete 5 successful sales',
    icon: 'trending',
    category: 'seller',
    points: 150,
    requirement: 5,
    rarity: 'rare',
  },
  ten_sales: {
    id: 'ten_sales',
    name: 'Trusted Seller',
    description: 'Complete 10 successful sales',
    icon: 'star',
    category: 'seller',
    points: 300,
    requirement: 10,
    rarity: 'epic',
  },
  twenty_five_sales: {
    id: 'twenty_five_sales',
    name: 'Super Seller',
    description: 'Complete 25 successful sales',
    icon: 'trophy',
    category: 'seller',
    points: 500,
    requirement: 25,
    rarity: 'legendary',
  },
  
  // Buyer Achievements
  first_purchase: {
    id: 'first_purchase',
    name: 'First Purchase',
    description: 'Make your first purchase',
    icon: 'cart',
    category: 'buyer',
    points: 25,
    requirement: 1,
    rarity: 'common',
  },
  five_purchases: {
    id: 'five_purchases',
    name: 'Active Buyer',
    description: 'Make 5 successful purchases',
    icon: 'cart',
    category: 'buyer',
    points: 100,
    requirement: 5,
    rarity: 'rare',
  },
  ten_purchases: {
    id: 'ten_purchases',
    name: 'Frequent Buyer',
    description: 'Make 10 successful purchases',
    icon: 'cart',
    category: 'buyer',
    points: 200,
    requirement: 10,
    rarity: 'epic',
  },
  
  // Community Achievements
  first_review: {
    id: 'first_review',
    name: 'First Review',
    description: 'Write your first product review',
    icon: 'star',
    category: 'community',
    points: 30,
    requirement: 1,
    rarity: 'common',
  },
  five_reviews: {
    id: 'five_reviews',
    name: 'Helpful Reviewer',
    description: 'Write 5 helpful reviews',
    icon: 'star',
    category: 'community',
    points: 100,
    requirement: 5,
    rarity: 'rare',
  },
  helpful_member: {
    id: 'helpful_member',
    name: 'Helpful Member',
    description: 'Maintain a 4.5+ average rating',
    icon: 'users',
    category: 'community',
    points: 200,
    requirement: 45, // 4.5 * 10 for decimal handling
    rarity: 'epic',
  },
  
  // Milestone Achievements
  welcome: {
    id: 'welcome',
    name: 'Welcome to StudentXchange',
    description: 'Create your account and join the community',
    icon: 'users',
    category: 'milestone',
    points: 10,
    requirement: 1,
    rarity: 'common',
  },
  hundred_points: {
    id: 'hundred_points',
    name: 'Century Club',
    description: 'Earn 100 total points',
    icon: 'target',
    category: 'milestone',
    points: 50,
    requirement: 100,
    rarity: 'rare',
  },
  five_hundred_points: {
    id: 'five_hundred_points',
    name: 'Point Champion',
    description: 'Earn 500 total points',
    icon: 'award',
    category: 'milestone',
    points: 100,
    requirement: 500,
    rarity: 'epic',
  },
  thousand_points: {
    id: 'thousand_points',
    name: 'Point Legend',
    description: 'Earn 1000 total points',
    icon: 'trophy',
    category: 'milestone',
    points: 200,
    requirement: 1000,
    rarity: 'legendary',
  },
};

export const LEVEL_SYSTEM = {
  pointsPerLevel: 100,
  levelNames: [
    'Newcomer',
    'Student',
    'Scholar',
    'Graduate',
    'Expert',
    'Master',
    'Champion',
    'Legend',
    'Elite',
    'Grandmaster'
  ],
  levelRewards: {
    2: { points: 20, message: 'Level 2 bonus!' },
    5: { points: 50, message: 'Level 5 bonus!' },
    10: { points: 100, message: 'Level 10 bonus!' },
  }
};

export function calculateLevel(totalPoints: number): number {
  return Math.floor(totalPoints / LEVEL_SYSTEM.pointsPerLevel) + 1;
}

export function getPointsForNextLevel(totalPoints: number): number {
  const currentLevel = calculateLevel(totalPoints);
  const pointsForNextLevel = currentLevel * LEVEL_SYSTEM.pointsPerLevel;
  return pointsForNextLevel - totalPoints;
}

export function getLevelName(level: number): string {
  const index = Math.min(level - 1, LEVEL_SYSTEM.levelNames.length - 1);
  return LEVEL_SYSTEM.levelNames[index] || 'Legendary';
}

export function getProgressToNextLevel(totalPoints: number): number {
  const currentLevel = calculateLevel(totalPoints);
  const pointsAtCurrentLevel = (currentLevel - 1) * LEVEL_SYSTEM.pointsPerLevel;
  const pointsInCurrentLevel = totalPoints - pointsAtCurrentLevel;
  return (pointsInCurrentLevel / LEVEL_SYSTEM.pointsPerLevel) * 100;
}

export function shouldUnlockAchievement(achievementId: string, currentProgress: number): boolean {
  const achievement = ACHIEVEMENT_DEFINITIONS[achievementId];
  return achievement && currentProgress >= achievement.requirement;
}

export function getAchievementsByCategory(category: Achievement['category']): Achievement[] {
  return Object.values(ACHIEVEMENT_DEFINITIONS)
    .filter(achievement => achievement.category === category)
    .map(achievement => ({
      ...achievement,
      currentProgress: 0,
      unlocked: false,
    }));
}

// Export achievements array for use in components
export const achievements = Object.values(ACHIEVEMENT_DEFINITIONS).map(achievement => ({
  id: achievement.id,
  name: achievement.name,
  description: achievement.description,
  icon: achievement.icon,
  category: achievement.category,
  points: achievement.points,
  rarity: achievement.rarity,
}));