import {
  User,
  Product,
  Order,
  OrderItem,
  Cart,
  Review,
  Notification,
  UserAchievement,
  UserStats,
  BuyerRequest,
  StudentProfile,
  InsertUser,
  InsertProduct,
  InsertOrder,
  InsertOrderItem,
  InsertCart,
  InsertReview,
  InsertNotification,
  InsertUserAchievement,
  InsertUserStats,
  InsertBuyerRequest,
  InsertStudentProfile,
  Project,
  ProjectMember,
  InsertProject,
  Connection,
  Message,
  InsertConnection,
  InsertMessage,
  users,
  products,
  orders,
  orderItems,
  carts,
  reviews,
  notifications,
  userAchievements,
  userStats,
  buyerRequests,
  studentProfiles,
  projects,
  projectMembers,
  connections,
  messages,
  passwordResetTokens,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, asc, like, count, gt, sql, or, inArray } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  deleteUser(id: number): Promise<boolean>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByFirebaseUid(uid: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;

  // Product operations
  getProduct(id: number): Promise<Product | undefined>;
  getProductsBySeller(sellerId: number): Promise<Product[]>;
  getProductsByCategory(category: string): Promise<Product[]>;
  searchProducts(query: string): Promise<Product[]>;
  getAvailableProducts(): Promise<Product[]>;
  createProduct(product: InsertProduct, sellerId: number | null): Promise<Product>;
  updateProduct(id: number, product: Partial<InsertProduct>): Promise<Product | undefined>;
  deleteProduct(id: number): Promise<boolean>;
  getAllProducts(): Promise<Product[]>;

  // Order operations
  getOrder(id: number): Promise<Order | undefined>;
  getOrderByPaymentId(paymentId: string): Promise<Order | undefined>;
  getOrdersByUser(userId: number): Promise<Order[]>;
  createOrder(order: InsertOrder): Promise<Order>;
  updateOrderStatus(id: number, status: string): Promise<Order | undefined>;
  updateOrder(id: number, order: Partial<InsertOrder>): Promise<Order | undefined>;
  getOrderItems(orderId: number): Promise<OrderItem[]>;
  createOrderItem(item: InsertOrderItem): Promise<OrderItem>;
  deleteOrder(id: number): Promise<boolean>;
  getAllOrders(): Promise<Order[]>;
  getTotalRevenue(): Promise<number>;
  resetRevenue(): Promise<boolean>;

  // Cart operations
  getCartByUser(userId: number): Promise<Cart[]>;
  addToCart(item: InsertCart): Promise<Cart>;
  updateCartItemQuantity(id: number, quantity: number): Promise<Cart | undefined>;
  removeFromCart(id: number): Promise<boolean>;
  clearCart(userId: number): Promise<boolean>;

  // Review operations
  getReview(id: number): Promise<Review | undefined>;
  getReviewsByProduct(productId: number): Promise<Review[]>;
  getReviewsByUser(userId: number): Promise<Review[]>;
  createReview(review: InsertReview): Promise<Review>;
  updateReview(id: number, review: Partial<InsertReview>): Promise<Review | undefined>;
  deleteReview(id: number): Promise<boolean>;
  getProductAverageRating(productId: number): Promise<number>;

  // Buyer Request operations
  getBuyerRequests(): Promise<BuyerRequest[]>;
  createBuyerRequest(request: InsertBuyerRequest & { requesterUserId: number }): Promise<BuyerRequest>;
  updateBuyerRequestStatus(id: number, status: string): Promise<BuyerRequest | undefined>;
  deleteBuyerRequest(id: number): Promise<boolean>;

  // Notification operations
  createNotification(notification: InsertNotification): Promise<Notification>;
  getNotifications(limit?: number): Promise<Notification[]>;
  getUnreadNotifications(): Promise<Notification[]>;
  markNotificationAsRead(id: number): Promise<boolean>;

  // Achievement operations
  getUserAchievements(userId: number): Promise<UserAchievement[]>;
  createUserAchievement(achievement: InsertUserAchievement): Promise<UserAchievement>;
  
  // User stats operations
  getUserStats(userId: number): Promise<UserStats | undefined>;
  createUserStats(stats: InsertUserStats): Promise<UserStats>;
  updateUserStats(userId: number, stats: Partial<InsertUserStats>): Promise<UserStats | undefined>;

  // Analytics and statistics
  calculateCommission(amount: number): number;
  getDisplayedCommissionRate(amount: number): number;
  resetAllCommissions(): Promise<void>;

  // Student Profile operations
  getStudentProfile(userId: number): Promise<StudentProfile | undefined>;
  getStudentProfileById(id: number): Promise<StudentProfile | undefined>;
  createStudentProfile(profile: InsertStudentProfile): Promise<StudentProfile>;
  updateStudentProfile(userId: number, profile: Partial<InsertStudentProfile>): Promise<StudentProfile | undefined>;
  deleteStudentProfile(userId: number): Promise<boolean>;
  searchStudentProfiles(query: string): Promise<StudentProfile[]>;
  getStudentsByCollege(college: string): Promise<StudentProfile[]>;
  getStudentsBySkills(skills: string[]): Promise<StudentProfile[]>;
  getAllStudentProfiles(): Promise<StudentProfile[]>;
  
  // Matchmaking interface
  getPotentialMatches(userId: number, limit?: number): Promise<(StudentProfile & { matchPercentage: number })[]>;
  
  // Project management interface
  createProject(project: InsertProject, creatorId: number): Promise<Project>;
  getProject(id: number): Promise<Project | undefined>;
  getUserProjects(userId: number): Promise<Project[]>;
  getAllProjects(): Promise<Project[]>;
  updateProject(id: number, project: Partial<InsertProject>): Promise<Project | undefined>;
  deleteProject(id: number): Promise<boolean>;
  searchProjects(query: string): Promise<Project[]>;
  getProjectsBySkills(skills: string[]): Promise<Project[]>;
  joinProject(userId: number, projectId: number, role?: string): Promise<ProjectMember | undefined>;
  leaveProject(userId: number, projectId: number): Promise<boolean>;
  getProjectMembers(projectId: number): Promise<ProjectMember[]>;
  isProjectMember(userId: number, projectId: number): Promise<boolean>;

  // Connection management interface
  createConnection(connection: InsertConnection): Promise<Connection>;
  getConnection(requesterId: number, receiverId: number): Promise<Connection | undefined>;
  getUserConnections(userId: number): Promise<Connection[]>;
  updateConnectionStatus(id: number, status: 'accepted' | 'rejected'): Promise<Connection | undefined>;
  getConnectionStatus(requesterId: number, receiverId: number): Promise<string | null>;

  // Messaging interface
  sendMessage(message: InsertMessage): Promise<Message>;
  getConversation(userId1: number, userId2: number): Promise<Message[]>;
  getUserConversations(userId: number): Promise<{ peerId: number; lastMessage: Message; unreadCount: number }[]>;
  markMessagesAsRead(senderId: number, receiverId: number): Promise<boolean>;
  searchStudentsGlobal(query: string, limit?: number): Promise<(StudentProfile & { user: Omit<User, 'password'> })[]>;
  
  // Password Reset operations
  createPasswordResetToken(data: { userId: number; token: string; expiresAt: Date }): Promise<{ id: number; userId: number; token: string; expiresAt: Date }>;
  getPasswordResetToken(token: string): Promise<{ id: number; userId: number; token: string; expiresAt: Date; used: boolean | null } | undefined>;
  markPasswordResetTokenUsed(id: number): Promise<boolean>;
  updateUserPassword(userId: number, hashedPassword: string): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  constructor() {
    // Database storage doesn't need initialization
  }

  // User operations
  async deleteUser(id: number): Promise<boolean> {
    const result = await db.delete(users).where(eq(users.id, id)).returning();
    return result.length > 0;
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUserByFirebaseUid(uid: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.uid, uid));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }



  // Product operations
  async getProduct(id: number): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.id, id));
    return product;
  }

  async getProductsBySeller(sellerId: number): Promise<Product[]> {
    return await db.select().from(products).where(eq(products.sellerId, sellerId));
  }

  async getProductsByCategory(category: string): Promise<Product[]> {
    return await db.select().from(products).where(eq(products.category, category));
  }

  async searchProducts(query: string): Promise<Product[]> {
    return await db.select().from(products).where(
      like(products.title, `%${query}%`)
    );
  }

  async createProduct(product: InsertProduct, sellerId: number | null): Promise<Product> {
    const [newProduct] = await db.insert(products).values({
      ...product,
      sellerId,
    }).returning();
    return newProduct;
  }

  async updateProduct(id: number, product: Partial<InsertProduct>): Promise<Product | undefined> {
    const [updatedProduct] = await db.update(products)
      .set(product)
      .where(eq(products.id, id))
      .returning();
    return updatedProduct;
  }

  async deleteProduct(id: number): Promise<boolean> {
    const result = await db.delete(products).where(eq(products.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async getAllProducts(): Promise<Product[]> {
    return await db.select().from(products);
  }

  // Get only available products (quantity > 0) for browse page - optimized
  async getAvailableProducts(): Promise<Product[]> {
    const start = Date.now();
    const availableProducts = await db.select().from(products).where(gt(products.quantity, 0));
    const duration = Date.now() - start;
    return availableProducts;
  }

  // Order operations
  async getOrder(id: number): Promise<Order | undefined> {
    const [order] = await db.select().from(orders).where(eq(orders.id, id));
    return order;
  }

  async getOrderByPaymentId(paymentId: string): Promise<Order | undefined> {
    const [order] = await db.select().from(orders).where(eq(orders.paymentId, paymentId));
    return order;
  }

  async getOrdersByUser(userId: number): Promise<Order[]> {
    return await db.select().from(orders).where(eq(orders.userId, userId));
  }

  async createOrder(order: InsertOrder): Promise<Order> {
    const [newOrder] = await db.insert(orders).values(order).returning();
    return newOrder;
  }

  async updateOrderStatus(id: number, status: string): Promise<Order | undefined> {
    const [updatedOrder] = await db.update(orders)
      .set({ status })
      .where(eq(orders.id, id))
      .returning();
    return updatedOrder;
  }

  async updateOrder(id: number, order: Partial<InsertOrder>): Promise<Order | undefined> {
    const [updatedOrder] = await db.update(orders)
      .set(order)
      .where(eq(orders.id, id))
      .returning();
    return updatedOrder;
  }

  async getOrderItems(orderId: number): Promise<OrderItem[]> {
    return await db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
  }

  async createOrderItem(item: InsertOrderItem): Promise<OrderItem> {
    const [newItem] = await db.insert(orderItems).values(item).returning();
    return newItem;
  }

  async deleteOrder(id: number): Promise<boolean> {
    try {
      // Delete order items first (foreign key constraint)
      await db.delete(orderItems).where(eq(orderItems.orderId, id));
      // Delete the order
      const result = await db.delete(orders).where(eq(orders.id, id));
      return (result.rowCount ?? 0) > 0;
    } catch (error) {
      return false;
    }
  }

  async getAllOrders(): Promise<Order[]> {
    return await db.select().from(orders).orderBy(desc(orders.createdAt));
  }

  async getTotalRevenue(): Promise<number> {
    const ordersData = await db.select().from(orders).where(eq(orders.status, 'completed'));
    const totalRevenue = ordersData.reduce((sum, order) => {
      return sum + parseFloat(order.commission?.toString() || '0');
    }, 0);
    
    return totalRevenue;
  }

  async resetRevenue(): Promise<boolean> {
    try {
      // Reset only platform fees to 0, keep transaction records for history
      await db.update(orders).set({ commission: "0.00" });
      return true;
    } catch (error) {
      return false;
    }
  }

  // Cart operations
  async getCartByUser(userId: number): Promise<Cart[]> {
    return await db.select().from(carts).where(eq(carts.userId, userId));
  }

  async addToCart(item: InsertCart): Promise<Cart> {
    const [newCartItem] = await db.insert(carts).values(item).returning();
    return newCartItem;
  }

  async updateCartItemQuantity(id: number, quantity: number): Promise<Cart | undefined> {
    const [updatedCart] = await db.update(carts)
      .set({ quantity })
      .where(eq(carts.id, id))
      .returning();
    return updatedCart;
  }

  async removeFromCart(id: number): Promise<boolean> {
    const result = await db.delete(carts).where(eq(carts.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async clearCart(userId: number): Promise<boolean> {
    const result = await db.delete(carts).where(eq(carts.userId, userId));
    return (result.rowCount ?? 0) > 0;
  }

  // Review operations
  async getReview(id: number): Promise<Review | undefined> {
    const [review] = await db.select().from(reviews).where(eq(reviews.id, id));
    return review;
  }

  async getReviewsByProduct(productId: number): Promise<Review[]> {
    return await db.select().from(reviews).where(eq(reviews.productId, productId));
  }

  async getReviewsByUser(userId: number): Promise<Review[]> {
    return await db.select().from(reviews).where(eq(reviews.userId, userId));
  }

  async createReview(review: InsertReview): Promise<Review> {
    const [newReview] = await db.insert(reviews).values(review).returning();
    
    // Update product rating
    await this.updateProductRating(review.productId);
    
    return newReview;
  }

  async updateReview(id: number, review: Partial<InsertReview>): Promise<Review | undefined> {
    const [updatedReview] = await db.update(reviews)
      .set(review)
      .where(eq(reviews.id, id))
      .returning();
    
    if (updatedReview) {
      await this.updateProductRating(updatedReview.productId);
    }
    
    return updatedReview;
  }

  async deleteReview(id: number): Promise<boolean> {
    const [review] = await db.select().from(reviews).where(eq(reviews.id, id));
    if (!review) return false;
    
    const result = await db.delete(reviews).where(eq(reviews.id, id));
    if ((result.rowCount ?? 0) > 0) {
      await this.updateProductRating(review.productId);
      return true;
    }
    return false;
  }

  async getProductAverageRating(productId: number): Promise<number> {
    const result = await db.select({
      avgRating: count(reviews.rating)
    }).from(reviews).where(eq(reviews.productId, productId));
    
    return result[0]?.avgRating || 0;
  }

  private async updateProductRating(productId: number): Promise<void> {
    const avgRating = await this.getProductAverageRating(productId);
    await db.update(products)
      .set({ rating: avgRating.toString() })
      .where(eq(products.id, productId));
  }

  // Buyer Request operations
  async getBuyerRequests(): Promise<BuyerRequest[]> {
    return await db.select().from(buyerRequests).orderBy(desc(buyerRequests.createdAt));
  }

  async createBuyerRequest(request: InsertBuyerRequest & { requesterUserId: number }): Promise<BuyerRequest> {
    const [newRequest] = await db.insert(buyerRequests).values(request).returning();
    return newRequest;
  }

  async updateBuyerRequestStatus(id: number, status: string): Promise<BuyerRequest | undefined> {
    const [updatedRequest] = await db.update(buyerRequests)
      .set({ status })
      .where(eq(buyerRequests.id, id))
      .returning();
    return updatedRequest;
  }

  async deleteBuyerRequest(id: number): Promise<boolean> {
    const result = await db.delete(buyerRequests).where(eq(buyerRequests.id, id)).returning();
    return result.length > 0;
  }

  // Notification operations
  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [newNotification] = await db.insert(notifications).values(notification).returning();
    return newNotification;
  }

  async getNotifications(limit?: number): Promise<Notification[]> {
    if (limit) {
      return await db.select().from(notifications).orderBy(desc(notifications.createdAt)).limit(limit);
    }
    
    return await db.select().from(notifications).orderBy(desc(notifications.createdAt));
  }

  async getUnreadNotifications(): Promise<Notification[]> {
    return await db.select().from(notifications)
      .where(eq(notifications.isRead, false))
      .orderBy(desc(notifications.createdAt));
  }

  async markNotificationAsRead(id: number): Promise<boolean> {
    const result = await db.update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Achievement operations
  async getUserAchievements(userId: number): Promise<UserAchievement[]> {
    return await db.select().from(userAchievements).where(eq(userAchievements.userId, userId));
  }

  async createUserAchievement(achievement: InsertUserAchievement): Promise<UserAchievement> {
    const [newAchievement] = await db.insert(userAchievements).values(achievement).returning();
    return newAchievement;
  }

  // User stats operations
  async getUserStats(userId: number): Promise<UserStats | undefined> {
    const [stats] = await db.select().from(userStats).where(eq(userStats.userId, userId));
    return stats;
  }

  async createUserStats(stats: InsertUserStats): Promise<UserStats> {
    const [newStats] = await db.insert(userStats).values(stats).returning();
    return newStats;
  }

  async updateUserStats(userId: number, statsUpdate: Partial<InsertUserStats>): Promise<UserStats | undefined> {
    const [updatedStats] = await db
      .update(userStats)
      .set({ ...statsUpdate, updatedAt: new Date() })
      .where(eq(userStats.userId, userId))
      .returning();
    return updatedStats;
  }

  // Analytics and statistics
  calculateCommission(amount: number): number {
    // Tiered platform fee system - actual fees charged to seller
    if (amount <= 499) {
      return amount * 0.15; // 15% actual fee (shown as 20%)
    } else if (amount <= 1499) {
      return amount * 0.10; // 10% actual fee (shown as 15%)
    } else {
      return amount * 0.05; // 5% actual fee (shown as 8%)
    }
  }

  // Get displayed commission rate for frontend
  getDisplayedCommissionRate(amount: number): number {
    if (amount <= 499) {
      return 0.20; // Show 20%
    } else if (amount <= 1499) {
      return 0.15; // Show 15%
    } else {
      return 0.08; // Show 8%
    }
  }

  // Reset all commissions to 0 (admin function)
  async resetAllCommissions(): Promise<void> {
    await db.update(orders).set({ commission: "0.00" });
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(desc(users.createdAt));
  }

  // Student Profile operations
  async getStudentProfile(userId: number): Promise<StudentProfile | undefined> {
    const [profile] = await db.select().from(studentProfiles).where(eq(studentProfiles.userId, userId));
    return profile;
  }

  async getStudentProfileById(id: number): Promise<StudentProfile | undefined> {
    const [profile] = await db.select().from(studentProfiles).where(eq(studentProfiles.id, id));
    return profile;
  }

  async createStudentProfile(profile: InsertStudentProfile): Promise<StudentProfile> {
    const [newProfile] = await db.insert(studentProfiles).values(profile).returning();
    return newProfile;
  }

  async updateStudentProfile(userId: number, profileUpdate: Partial<InsertStudentProfile>): Promise<StudentProfile | undefined> {
    const [updatedProfile] = await db
      .update(studentProfiles)
      .set({ ...profileUpdate, updatedAt: new Date() })
      .where(eq(studentProfiles.userId, userId))
      .returning();
    return updatedProfile;
  }

  async deleteStudentProfile(userId: number): Promise<boolean> {
    const result = await db.delete(studentProfiles).where(eq(studentProfiles.userId, userId));
    return (result.rowCount ?? 0) > 0;
  }

  async searchStudentProfiles(query: string): Promise<StudentProfile[]> {
    return await db
      .select()
      .from(studentProfiles)
      .where(
        like(studentProfiles.college, `%${query}%`)
      )
      .orderBy(asc(studentProfiles.college));
  }

  async getStudentsByCollege(college: string): Promise<StudentProfile[]> {
    return await db
      .select()
      .from(studentProfiles)
      .where(eq(studentProfiles.college, college))
      .orderBy(asc(studentProfiles.createdAt));
  }

  async getStudentsBySkills(skills: string[]): Promise<StudentProfile[]> {
    if (skills.length === 0) {
      return await db
        .select()
        .from(studentProfiles)
        .where(eq(studentProfiles.isAvailableForCollab, true))
        .orderBy(desc(studentProfiles.createdAt));
    }
    
    // Use SQL to check if any of the provided skills match
    // This queries for profiles where the skills array overlaps with provided skills
    return await db
      .select()
      .from(studentProfiles)
      .where(
        and(
          eq(studentProfiles.isAvailableForCollab, true),
          // Check if skills array contains any of the requested skills
          // This uses PostgreSQL array operators for efficient matching
          sql`${studentProfiles.skills} && ARRAY[${skills.map(skill => sql`${skill}`).join(',')}]`
        )
      )
      .orderBy(desc(studentProfiles.createdAt));
  }

  async getAllStudentProfiles(): Promise<StudentProfile[]> {
    return await db
      .select()
      .from(studentProfiles)
      .orderBy(desc(studentProfiles.createdAt));
  }

  // Matchmaking methods
  async getPotentialMatches(userId: number, limit: number = 20): Promise<(StudentProfile & { matchPercentage: number })[]> {
    // First get the current user's profile
    const currentProfile = await this.getStudentProfile(userId);
    if (!currentProfile) {
      return [];
    }

    // Get all other available profiles
    const allProfiles = await db
      .select()
      .from(studentProfiles)
      .where(
        and(
          eq(studentProfiles.isAvailableForCollab, true),
          sql`${studentProfiles.userId} != ${userId}`
        )
      );

    // Calculate match percentages and sort
    const profilesWithScores = allProfiles.map(profile => ({
      ...profile,
      matchPercentage: this.calculateMatchPercentage(currentProfile, profile)
    }));

    // Sort by match percentage (highest first) and limit results
    return profilesWithScores
      .sort((a, b) => b.matchPercentage - a.matchPercentage)
      .slice(0, limit);
  }

  private calculateMatchPercentage(profile1: StudentProfile, profile2: StudentProfile): number {
    let totalScore = 0;
    let maxPossibleScore = 0;

    // College match (30% weight)
    maxPossibleScore += 30;
    if (profile1.college && profile2.college && profile1.college === profile2.college) {
      totalScore += 30;
    }

    // Career stage match (25% weight)
    maxPossibleScore += 25;
    if (profile1.career && profile2.career && profile1.career === profile2.career) {
      totalScore += 25;
    }

    // Skills overlap (25% weight)
    maxPossibleScore += 25;
    if (profile1.skills.length > 0 && profile2.skills.length > 0) {
      const skillsIntersection = profile1.skills.filter(skill => 
        profile2.skills.includes(skill)
      ).length;
      const skillsUnion = new Set([...profile1.skills, ...profile2.skills]).size;
      const skillsSimilarity = skillsIntersection / skillsUnion;
      totalScore += Math.round(skillsSimilarity * 25);
    }

    // Interests overlap (20% weight)
    maxPossibleScore += 20;
    if (profile1.interests.length > 0 && profile2.interests.length > 0) {
      const interestsIntersection = profile1.interests.filter(interest => 
        profile2.interests.includes(interest)
      ).length;
      const interestsUnion = new Set([...profile1.interests, ...profile2.interests]).size;
      const interestsSimilarity = interestsIntersection / interestsUnion;
      totalScore += Math.round(interestsSimilarity * 20);
    }

    // Return percentage (0-100)
    return Math.round((totalScore / maxPossibleScore) * 100);
  }

  // Project management methods
  async createProject(project: InsertProject, creatorId: number): Promise<Project> {
    const [newProject] = await db
      .insert(projects)
      .values([{ ...project, creatorId }])
      .returning();
    return newProject;
  }

  async getProject(id: number): Promise<Project | undefined> {
    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, id));
    return project;
  }

  async getUserProjects(userId: number): Promise<Project[]> {
    // Get projects where user is owner
    const ownedProjects = await db
      .select()
      .from(projects)
      .where(eq(projects.creatorId, userId));

    // Get projects where user is a member
    const memberProjectIds = await db
      .select({ projectId: projectMembers.projectId })
      .from(projectMembers)
      .where(eq(projectMembers.userId, userId));

    const memberProjects = memberProjectIds.length > 0
      ? await db
          .select()
          .from(projects)
          .where(inArray(projects.id, memberProjectIds.map(p => p.projectId)))
      : [];

    // Combine and deduplicate by ID
    const allProjects = [...ownedProjects, ...memberProjects];
    const uniqueProjects = allProjects.filter((project, index, self) => 
      index === self.findIndex(p => p.id === project.id)
    );
    
    return uniqueProjects.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  async getAllProjects(): Promise<Project[]> {
    return await db
      .select()
      .from(projects)
      .orderBy(desc(projects.createdAt));
  }

  async updateProject(id: number, projectData: Partial<InsertProject>): Promise<Project | undefined> {
    const [updatedProject] = await db
      .update(projects)
      .set({ ...projectData, updatedAt: new Date() })
      .where(eq(projects.id, id))
      .returning();
    return updatedProject;
  }

  async deleteProject(id: number): Promise<boolean> {
    const result = await db
      .delete(projects)
      .where(eq(projects.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async searchProjects(query: string): Promise<Project[]> {
    return await db
      .select()
      .from(projects)
      .where(
        or(
          like(projects.title, `%${query}%`),
          like(projects.description, `%${query}%`),
          like(projects.tags, `%${query}%`)
        )
      )
      .orderBy(desc(projects.createdAt));
  }

  async getProjectsBySkills(skills: string[]): Promise<Project[]> {
    if (skills.length === 0) {
      return await this.getAllProjects();
    }
    
    // Find projects that require any of the provided skills using array overlap
    const projectsWithSkills = await db
      .select()
      .from(projects)
      .where(
        sql`${projects.requiredSkills} && ARRAY[${skills.map(skill => sql`${skill}`).join(',')}]`
      )
      .orderBy(desc(projects.createdAt));
    
    return projectsWithSkills;
  }

  async joinProject(userId: number, projectId: number, role: string = 'member'): Promise<ProjectMember | undefined> {
    // Check if project exists and has space
    const project = await this.getProject(projectId);
    if (!project) {
      return undefined;
    }

    if (project.currentMembers >= project.maxMembers) {
      return undefined; // Project is full
    }

    // Check if user is already a member
    const isAlreadyMember = await this.isProjectMember(userId, projectId);
    if (isAlreadyMember) {
      return undefined;
    }

    // Add user as member and increment currentMembers
    const [newMember] = await db
      .insert(projectMembers)
      .values({
        studentId: userId,
        projectId,
        role,
        joinedAt: new Date()
      })
      .returning();

    // Update project member count
    await db
      .update(projects)
      .set({ 
        currentMembers: project.currentMembers + 1,
        updatedAt: new Date()
      })
      .where(eq(projects.id, projectId));

    return newMember;
  }

  async leaveProject(userId: number, projectId: number): Promise<boolean> {
    const result = await db
      .delete(projectMembers)
      .where(
        and(
          eq(projectMembers.studentId, userId),
          eq(projectMembers.projectId, projectId)
        )
      );

    if ((result.rowCount ?? 0) > 0) {
      // Decrement currentMembers count
      const project = await this.getProject(projectId);
      if (project) {
        await db
          .update(projects)
          .set({ 
            currentMembers: Math.max(0, project.currentMembers - 1),
            updatedAt: new Date()
          })
          .where(eq(projects.id, projectId));
      }
      return true;
    }
    return false;
  }

  async getProjectMembers(projectId: number): Promise<ProjectMember[]> {
    return await db
      .select()
      .from(projectMembers)
      .where(eq(projectMembers.projectId, projectId))
      .orderBy(asc(projectMembers.joinedAt));
  }

  async isProjectMember(userId: number, projectId: number): Promise<boolean> {
    const [member] = await db
      .select()
      .from(projectMembers)
      .where(
        and(
          eq(projectMembers.studentId, userId),
          eq(projectMembers.projectId, projectId)
        )
      )
      .limit(1);
    
    return !!member;
  }

  // Connection management methods
  async createConnection(connection: InsertConnection): Promise<Connection> {
    const [newConnection] = await db
      .insert(connections)
      .values([connection])
      .returning();
    return newConnection;
  }

  async getConnection(requesterId: number, receiverId: number): Promise<Connection | undefined> {
    const [connection] = await db
      .select()
      .from(connections)
      .where(
        or(
          and(eq(connections.requesterId, requesterId), eq(connections.receiverId, receiverId)),
          and(eq(connections.requesterId, receiverId), eq(connections.receiverId, requesterId))
        )
      )
      .limit(1);
    return connection;
  }

  async getUserConnections(userId: number): Promise<Connection[]> {
    return await db
      .select()
      .from(connections)
      .where(
        and(
          or(eq(connections.requesterId, userId), eq(connections.receiverId, userId)),
          eq(connections.status, 'accepted')
        )
      )
      .orderBy(desc(connections.requestedAt));
  }

  async updateConnectionStatus(id: number, status: 'accepted' | 'rejected'): Promise<Connection | undefined> {
    const [updated] = await db
      .update(connections)
      .set({ status, respondedAt: new Date() })
      .where(eq(connections.id, id))
      .returning();
    return updated;
  }

  async getConnectionStatus(requesterId: number, receiverId: number): Promise<string | null> {
    const connection = await this.getConnection(requesterId, receiverId);
    return connection?.status || null;
  }

  // Messaging methods
  async sendMessage(message: InsertMessage): Promise<Message> {
    const [newMessage] = await db
      .insert(messages)
      .values([message])
      .returning();
    return newMessage;
  }

  async getConversation(userId1: number, userId2: number): Promise<Message[]> {
    return await db
      .select()
      .from(messages)
      .where(
        or(
          and(eq(messages.senderId, userId1), eq(messages.receiverId, userId2)),
          and(eq(messages.senderId, userId2), eq(messages.receiverId, userId1))
        )
      )
      .orderBy(asc(messages.sentAt));
  }

  async getUserConversations(userId: number): Promise<{ peerId: number; lastMessage: Message; unreadCount: number }[]> {
    // Get all messages where user is sender or receiver
    const allMessages = await db
      .select()
      .from(messages)
      .where(
        or(eq(messages.senderId, userId), eq(messages.receiverId, userId))
      )
      .orderBy(desc(messages.sentAt));

    // Group by conversation partner
    const conversationMap = new Map<number, { lastMessage: Message; unreadCount: number }>();
    
    for (const message of allMessages) {
      const peerId = message.senderId === userId ? message.receiverId : message.senderId;
      
      if (!conversationMap.has(peerId)) {
        const unreadCount = allMessages.filter(m => 
          m.senderId === peerId && m.receiverId === userId && !m.isRead
        ).length;
        
        conversationMap.set(peerId, {
          lastMessage: message,
          unreadCount
        });
      }
    }

    return Array.from(conversationMap.entries()).map(([peerId, data]) => ({
      peerId,
      ...data
    }));
  }

  async markMessagesAsRead(senderId: number, receiverId: number): Promise<boolean> {
    const result = await db
      .update(messages)
      .set({ isRead: true })
      .where(
        and(
          eq(messages.senderId, senderId),
          eq(messages.receiverId, receiverId),
          eq(messages.isRead, false)
        )
      );
    
    return (result.rowCount ?? 0) > 0;
  }

  async searchStudentsGlobal(query: string, limit: number = 10): Promise<(StudentProfile & { user: Omit<User, 'password'> })[]> {
    const profiles = await db
      .select({
        id: studentProfiles.id,
        userId: studentProfiles.userId,
        college: studentProfiles.college,
        career: studentProfiles.career,
        skills: studentProfiles.skills,
        currentCourse: studentProfiles.currentCourse,
        interests: studentProfiles.interests,
        bio: studentProfiles.bio,
        avatarUrl: studentProfiles.avatarUrl,
        isAvailableForCollab: studentProfiles.isAvailableForCollab,
        createdAt: studentProfiles.createdAt,
        updatedAt: studentProfiles.updatedAt,
        user: {
          id: users.id,
          username: users.username,
          email: users.email,
          phone: users.phone,
          createdAt: users.createdAt
        }
      })
      .from(studentProfiles)
      .innerJoin(users, eq(studentProfiles.userId, users.id))
      .where(
        or(
          like(users.username, `%${query}%`),
          like(users.email, `%${query}%`),
          like(studentProfiles.college, `%${query}%`),
          like(studentProfiles.currentCourse, `%${query}%`),
          sql`${studentProfiles.skills}::text ILIKE ${'%' + query + '%'}`,
          sql`${studentProfiles.interests}::text ILIKE ${'%' + query + '%'}`
        )
      )
      .limit(limit);

    return profiles.map(p => ({
      ...p,
      user: p.user
    }));
  }

  // Password Reset operations
  async createPasswordResetToken(data: { userId: number; token: string; expiresAt: Date }): Promise<{ id: number; userId: number; token: string; expiresAt: Date }> {
    const [token] = await db.insert(passwordResetTokens).values({
      userId: data.userId,
      token: data.token,
      expiresAt: data.expiresAt
    }).returning();
    return token;
  }

  async getPasswordResetToken(token: string): Promise<{ id: number; userId: number; token: string; expiresAt: Date; used: boolean | null } | undefined> {
    const [resetToken] = await db.select().from(passwordResetTokens).where(eq(passwordResetTokens.token, token));
    return resetToken;
  }

  async markPasswordResetTokenUsed(id: number): Promise<boolean> {
    const result = await db.update(passwordResetTokens).set({ used: true }).where(eq(passwordResetTokens.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async updateUserPassword(userId: number, hashedPassword: string): Promise<boolean> {
    const result = await db.update(users).set({ password: hashedPassword }).where(eq(users.id, userId));
    return (result.rowCount ?? 0) > 0;
  }
}

export const storage = new DatabaseStorage();