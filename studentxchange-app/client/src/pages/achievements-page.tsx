import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, Medal, Star, Award, Users, ShoppingCart, Target, Clock } from "lucide-react";
import { AchievementBadge } from "@/components/gamification/achievement-badge";
import { UserLevel } from "@/components/gamification/user-level";
import { achievements } from "@/lib/achievement-system";
import type { UserAchievement, UserStats } from "@shared/schema";

// Mock user ID - in real app, get from auth context
const MOCK_USER_ID = 1;

export default function AchievementsPage() {
  const [activeTab, setActiveTab] = useState("overview");

  const { data: userAchievements = [] } = useQuery<UserAchievement[]>({
    queryKey: [`/api/user/${MOCK_USER_ID}/achievements`],
  });

  const { data: userStats } = useQuery<UserStats>({
    queryKey: [`/api/user/${MOCK_USER_ID}/stats`],
  });

  // Get achievement status
  const getAchievementStatus = (achievementId: string) => {
    const userAchievement = userAchievements.find(ua => ua.achievementId === achievementId);
    return userAchievement ? "completed" : "locked";
  };

  // Calculate progress for achievements
  const calculateProgress = (achievementId: string) => {
    const achievement = achievements.find(a => a.id === achievementId);
    if (!achievement || !userStats) return 0;

    switch (achievement.id) {
      case "first_sale":
        return userStats.totalSales > 0 ? 100 : 0;
      case "sales_milestone_5":
        return Math.min((userStats.totalSales / 5) * 100, 100);
      case "sales_milestone_10":
        return Math.min((userStats.totalSales / 10) * 100, 100);
      case "sales_milestone_25":
        return Math.min((userStats.totalSales / 25) * 100, 100);
      case "sales_milestone_50":
        return Math.min((userStats.totalSales / 50) * 100, 100);
      case "first_purchase":
        return userStats.totalPurchases > 0 ? 100 : 0;
      case "purchase_milestone_5":
        return Math.min((userStats.totalPurchases / 5) * 100, 100);
      case "purchase_milestone_10":
        return Math.min((userStats.totalPurchases / 10) * 100, 100);
      case "early_adopter":
        return userStats.daysSinceJoined <= 30 ? 100 : 0;
      case "active_user":
        return userStats.daysSinceJoined >= 30 ? 100 : 0;
      case "loyal_user":
        return userStats.daysSinceJoined >= 90 ? 100 : 0;
      case "veteran_user":
        return userStats.daysSinceJoined >= 365 ? 100 : 0;
      default:
        return 0;
    }
  };

  // Group achievements by category
  const groupedAchievements = achievements.reduce((acc, achievement) => {
    if (!acc[achievement.category]) {
      acc[achievement.category] = [];
    }
    acc[achievement.category].push(achievement);
    return acc;
  }, {} as Record<string, typeof achievements>);

  const completedAchievements = userAchievements.length;
  const totalAchievements = achievements.length;
  const overallProgress = (completedAchievements / totalAchievements) * 100;

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Achievements</h1>
          <p className="text-gray-600">Track your progress and unlock rewards</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="sales">Sales</TabsTrigger>
            <TabsTrigger value="purchases">Purchases</TabsTrigger>
            <TabsTrigger value="community">Community</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-yellow-500" />
                    Progress
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold mb-2">
                    {completedAchievements}/{totalAchievements}
                  </div>
                  <Progress value={overallProgress} className="mb-2" />
                  <p className="text-sm text-gray-600">
                    {overallProgress.toFixed(1)}% complete
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Medal className="h-5 w-5 text-blue-500" />
                    Current Level
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <UserLevel 
                    level={userStats?.currentLevel || 1} 
                    points={userStats?.totalPoints || 0} 
                    showProgress={true}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Star className="h-5 w-5 text-purple-500" />
                    Total Points
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-purple-600">
                    {userStats?.totalPoints || 0}
                  </div>
                  <p className="text-sm text-gray-600">Points earned</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Recent Achievements</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {userAchievements.slice(0, 6).map((userAchievement) => {
                    const achievement = achievements.find(a => a.id === userAchievement.achievementId);
                    if (!achievement) return null;
                    
                    return (
                      <AchievementBadge 
                        key={userAchievement.id}
                        achievement={achievement}
                        status="completed"
                        progress={100}
                        earnedDate={userAchievement.earnedAt}
                        size="medium"
                      />
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sales">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5 text-green-500" />
                  Sales Achievements
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {groupedAchievements["sales"]?.map((achievement) => (
                    <AchievementBadge 
                      key={achievement.id}
                      achievement={achievement}
                      status={getAchievementStatus(achievement.id)}
                      progress={calculateProgress(achievement.id)}
                      earnedDate={userAchievements.find(ua => ua.achievementId === achievement.id)?.earnedAt}
                      size="medium"
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="purchases">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-blue-500" />
                  Purchase Achievements
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {groupedAchievements["buyer"]?.map((achievement) => (
                    <AchievementBadge 
                      key={achievement.id}
                      achievement={achievement}
                      status={getAchievementStatus(achievement.id)}
                      progress={calculateProgress(achievement.id)}
                      earnedDate={userAchievements.find(ua => ua.achievementId === achievement.id)?.earnedAt}
                      size="medium"
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="community">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-orange-500" />
                  Community Achievements
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {groupedAchievements["community"]?.map((achievement) => (
                    <AchievementBadge 
                      key={achievement.id}
                      achievement={achievement}
                      status={getAchievementStatus(achievement.id)}
                      progress={calculateProgress(achievement.id)}
                      earnedDate={userAchievements.find(ua => ua.achievementId === achievement.id)?.earnedAt}
                      size="medium"
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}