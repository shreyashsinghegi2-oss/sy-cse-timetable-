import { storage } from "./storage";
import { ACHIEVEMENT_DEFINITIONS } from "../client/src/lib/achievement-system";

export class AchievementService {
  async checkAndUpdateAchievements(userId: number) {
    const userStats = await storage.getUserStats(userId);
    const userAchievements = await storage.getUserAchievements(userId);
    
    if (!userStats) {
      // Initialize user stats if they don't exist
      await storage.createUserStats({
        userId,
        totalPoints: 0,
        totalSales: 0,
        totalPurchases: 0,
        totalReviews: 0,
        averageRating: 0,
        currentStreak: 0,
        longestStreak: 0,
        level: 1,
      });
      return;
    }

    const newAchievements = [];
    
    // Check each achievement
    for (const [achievementId, definition] of Object.entries(ACHIEVEMENT_DEFINITIONS)) {
      const existingAchievement = userAchievements.find(ua => ua.achievementId === achievementId);
      
      if (!existingAchievement) {
        let currentProgress = 0;
        
        // Calculate progress based on user stats
        switch (achievementId) {
          case 'first_sale':
          case 'five_sales':
          case 'ten_sales':
          case 'twenty_five_sales':
            currentProgress = userStats.totalSales;
            break;
          case 'first_purchase':
          case 'five_purchases':
          case 'ten_purchases':
            currentProgress = userStats.totalPurchases;
            break;
          case 'first_review':
          case 'five_reviews':
            currentProgress = userStats.totalReviews;
            break;
          case 'helpful_member':
            currentProgress = Math.round(userStats.averageRating * 10);
            break;
          case 'welcome':
            currentProgress = 1; // Always completed if user exists
            break;
          case 'hundred_points':
          case 'five_hundred_points':
          case 'thousand_points':
            currentProgress = userStats.totalPoints;
            break;
        }
        
        // Check if achievement should be unlocked
        if (currentProgress >= definition.requirement) {
          const newAchievement = await storage.createUserAchievement({
            userId,
            achievementId,
            currentProgress,
          });
          
          // Award points for the achievement
          await storage.updateUserStats(userId, {
            totalPoints: userStats.totalPoints + definition.points,
          });
          
          newAchievements.push({
            ...definition,
            unlockedAt: newAchievement.unlockedAt,
          });
        }
      }
    }
    
    return newAchievements;
  }

  async updateUserStatsOnSale(userId: number, saleAmount: number) {
    const userStats = await storage.getUserStats(userId);
    if (!userStats) return;

    const commission = saleAmount * 0.20; // 20% commission
    const points = Math.floor(saleAmount / 10); // 1 point per ₹10 sold
    
    await storage.updateUserStats(userId, {
      totalSales: userStats.totalSales + 1,
      totalPoints: userStats.totalPoints + points,
    });
    
    // Check for new achievements
    return this.checkAndUpdateAchievements(userId);
  }

  async updateUserStatsOnPurchase(userId: number, purchaseAmount: number) {
    const userStats = await storage.getUserStats(userId);
    if (!userStats) return;

    const points = Math.floor(purchaseAmount / 20); // 1 point per ₹20 spent
    
    await storage.updateUserStats(userId, {
      totalPurchases: userStats.totalPurchases + 1,
      totalPoints: userStats.totalPoints + points,
    });
    
    // Check for new achievements
    return this.checkAndUpdateAchievements(userId);
  }

  async updateUserStatsOnReview(userId: number, rating: number) {
    const userStats = await storage.getUserStats(userId);
    if (!userStats) return;

    const newTotalReviews = userStats.totalReviews + 1;
    const newAverageRating = ((userStats.averageRating * userStats.totalReviews) + rating) / newTotalReviews;
    
    await storage.updateUserStats(userId, {
      totalReviews: newTotalReviews,
      averageRating: newAverageRating,
      totalPoints: userStats.totalPoints + 10, // 10 points per review
    });
    
    // Check for new achievements
    return this.checkAndUpdateAchievements(userId);
  }

  async initializeUserStats(userId: number) {
    const existingStats = await storage.getUserStats(userId);
    if (existingStats) return;

    await storage.createUserStats({
      userId,
      totalPoints: 10, // Welcome bonus
      totalSales: 0,
      totalPurchases: 0,
      totalReviews: 0,
      averageRating: 0,
      currentStreak: 0,
      longestStreak: 0,
      level: 1,
    });

    // Award welcome achievement
    return this.checkAndUpdateAchievements(userId);
  }
}

export const achievementService = new AchievementService();