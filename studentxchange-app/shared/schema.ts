import { pgTable, text, serial, integer, boolean, numeric, timestamp, varchar, jsonb, index, unique } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Constants for Student Collab (moved to top for use in schemas)

// Academic Streams - ALL disciplines included
export const STREAMS = [
  'Engineering & Technology',
  'Computer Science & IT',
  'Science',
  'Medicine & Health Sciences',
  'Commerce & Business',
  'Arts',
  'Humanities',
  'Social Sciences',
  'Law',
  'Design & Architecture',
  'Media & Communication',
  'Education',
  'Agriculture & Environmental',
  'Vocational & Polytechnic',
  'Performing & Fine Arts',
  'Languages & Literature',
  'Hospitality & Tourism',
  'Pharmacy',
  'Nursing',
  'Dentistry',
  'Allied Health',
  'Mathematics & Statistics',
  'Economics',
  'Psychology',
  'Sociology',
  'Political Science',
  'History',
  'Philosophy',
  'Physical Education & Sports Sciences',
  'Earth & Geological Sciences',
  'Other'
] as const;

// Collaboration Types - inclusive of all academic activities
export const COLLAB_TYPES = [
  'Study Group',
  'Research Project',
  'Startup/Entrepreneurship',
  'Case Competition',
  'Arts Production',
  'Social Impact',
  'Clinical Study',
  'Legal Clinic',
  'Design Sprint',
  'Festival/Event',
  'Academic Writing',
  'Lab Project',
  'Field Study',
  'Cultural Exchange',
  'Policy Research',
  'Community Service',
  'Business Plan',
  'Creative Collaboration',
  'Tech Development',
  'Other'
] as const;

export const PROJECT_CATEGORIES = [
  'Web Development',
  'Mobile App',
  'Data Science',
  'AI/ML',
  'Research',
  'Design',
  'Marketing',
  'Business',
  'Social Impact',
  'Gaming',
  'IoT',
  'Blockchain',
  'Cybersecurity',
  'Healthcare Innovation',
  'Legal Tech',
  'Creative Arts',
  'Educational Tech',
  'Environmental',
  'Policy & Governance',
  'Media Production',
  'Other'
] as const;

export const OPPORTUNITY_TYPES = [
  'Hackathon',
  'Competition',
  'Conference',
  'Workshop',
  'Internship',
  'Job',
  'Volunteer',
  'Event',
  'Course',
  'Certification'
] as const;

export const CAREER_STAGES = [
  'High School',
  'First Year',
  'Second Year',
  'Third Year',
  'Final Year',
  'Graduate',
  'Postgraduate',
  'PhD',
  'Professional'
] as const;



// Users schema - Updated for Firebase + PostgreSQL authentication
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  uid: text("uid").unique(), // Firebase UID - optional for existing users
  username: text("username").notNull().unique(),
  password: text("password"), // Optional - Firebase users won't have password here
  email: text("email").notNull(),
  phone: text("phone"),
  role: text("role").default("student").notNull(), // student, admin, organization
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  // Login by email is the most frequent lookup; index prevents a seq-scan per login.
  index("users_email_idx").on(table.email),
]);

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

// Products schema
export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  originalPrice: numeric("original_price", { precision: 10, scale: 2 }),
  condition: text("condition").notNull(),
  category: text("category").notNull(),
  sellerId: integer("seller_id"),
  images: text("images").array(),
  files: text("files").array(),
  // New optimized image fields for WebP system
  thumbnailUrls: text("thumbnail_urls").array(),
  fullImageUrls: text("full_image_urls").array(),
  quantity: integer("quantity").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  rating: numeric("rating", { precision: 3, scale: 2 }).default("0"),
  sellerWhatsapp: text("seller_whatsapp"),
  sellerContactName: text("seller_contact_name"),
  sellerContactEmail: text("seller_contact_email"),
  pickupAddressType: text("pickup_address_type").default("home"),
  pickupInstitution: text("pickup_institution"),
  pickupAddress: text("pickup_address"),
  pickupCity: text("pickup_city"),
  pickupState: text("pickup_state"),
  pickupPincode: text("pickup_pincode"),
}, (table) => [
  // Browse by category and seller lookups are the hottest product queries.
  index("products_category_idx").on(table.category),
  index("products_seller_id_idx").on(table.sellerId),
  index("products_created_at_idx").on(table.createdAt),
]);

export const insertProductSchema = createInsertSchema(products).omit({
  id: true,
  sellerId: true,
  createdAt: true,
});

// Orders schema
export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  totalAmount: numeric("total_amount", { precision: 10, scale: 2 }).notNull(),
  commission: numeric("commission", { precision: 10, scale: 2 }).notNull(),
  status: text("status").notNull(),
  deliveryAddressType: text("delivery_address_type").default("home"),
  deliveryInstitution: text("delivery_institution"),
  deliveryAddress: text("delivery_address"),
  deliveryCity: text("delivery_city"),
  deliveryState: text("delivery_state"),
  deliveryPincode: text("delivery_pincode"),
  customerName: text("customer_name"),
  customerPhone: text("customer_phone"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  // New fields for enhanced order management
  canCancel: boolean("can_cancel").default(true),
  refundRequested: boolean("refund_requested").default(false),
  refundReason: text("refund_reason"),
  refundStatus: text("refund_status"),
  estimatedDelivery: timestamp("estimated_delivery"),
  trackingNumber: text("tracking_number"),
  paymentId: text("payment_id"),
  orderId: text("order_id"),
  paymentMethod: text("payment_method").default("payu").notNull(),
}, (table) => [
  // Most-read queries filter by userId (order history) and status (admin dashboard).
  index("orders_user_id_idx").on(table.userId),
  index("orders_status_idx").on(table.status),
  index("orders_payment_id_idx").on(table.paymentId),
  index("orders_created_at_idx").on(table.createdAt),
]);

export const insertOrderSchema = createInsertSchema(orders).omit({
  id: true,
  createdAt: true,
});

// Order items schema
export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull(),
  productId: integer("product_id").notNull(),
  quantity: integer("quantity").notNull(),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  // Enhanced seller/product details for admin dashboard
  sellerName: text("seller_name"),
  sellerEmail: text("seller_email"),
  sellerPhone: text("seller_phone"),
  productTitle: text("product_title"),
  productPrice: text("product_price"),
});

export const insertOrderItemSchema = createInsertSchema(orderItems).omit({
  id: true,
});

// Cart schema
export const carts = pgTable("carts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  productId: integer("product_id").notNull(),
  quantity: integer("quantity").notNull(),
}, (table) => [
  index("carts_user_id_idx").on(table.userId),
]);

export const insertCartSchema = createInsertSchema(carts).omit({
  id: true,
});

// Buyer Requests schema
export const buyerRequests = pgTable("buyer_requests", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  priceRange: text("price_range"),
  requesterUserId: integer("requester_user_id").notNull(),
  status: text("status").notNull().default("open"), // open, fulfilled, closed
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertBuyerRequestSchema = createInsertSchema(buyerRequests).omit({
  id: true,
  requesterUserId: true,
  createdAt: true,
});

export type BuyerRequest = typeof buyerRequests.$inferSelect;
export type InsertBuyerRequest = z.infer<typeof insertBuyerRequestSchema>;

// Reviews schema
export const reviews = pgTable("reviews", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  productId: integer("product_id").notNull(),
  orderId: integer("order_id").notNull(),
  rating: integer("rating").notNull(), // 1-5 stars
  comment: text("comment"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertReviewSchema = createInsertSchema(reviews).omit({
  id: true,
  createdAt: true,
});

// Notifications schema
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(), // "order", "signup", "product_sold", etc.
  message: text("message").notNull(),
  userId: integer("user_id"), // Related user ID
  orderId: integer("order_id"), // Related order ID
  productId: integer("product_id"), // Related product ID
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
});

// User achievements schema
export const userAchievements = pgTable("user_achievements", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  achievementId: text("achievement_id").notNull(),
  unlockedAt: timestamp("unlocked_at").defaultNow().notNull(),
  currentProgress: integer("current_progress").notNull().default(0),
});

export const insertUserAchievementSchema = createInsertSchema(userAchievements).omit({
  id: true,
  unlockedAt: true,
});

// User stats schema for gamification
export const userStats = pgTable("user_stats", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().unique(),
  totalPoints: integer("total_points").notNull().default(0),
  totalSales: integer("total_sales").notNull().default(0),
  totalPurchases: integer("total_purchases").notNull().default(0),
  totalReviews: integer("total_reviews").notNull().default(0),
  averageRating: numeric("average_rating", { precision: 3, scale: 2 }).default("0"),
  currentStreak: integer("current_streak").notNull().default(0),
  longestStreak: integer("longest_streak").notNull().default(0),
  lastActivityDate: timestamp("last_activity_date").defaultNow(),
  level: integer("level").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertUserStatsSchema = createInsertSchema(userStats).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Session storage table for persistent login
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Constants
export const COMMISSION_RATE = 0.20; // 20% commission
export const PRODUCT_CONDITIONS = ['New', 'Like New', 'Good', 'Fair'] as const;
export const PRODUCT_CATEGORIES = [
  'Textbooks',
  'Second-hand Books', 
  'Reference Books',
  'Course Notes',
  'Handwritten Notes',
  'Previous Year Papers',
  'Study Materials',
  'Stationery', 
  'Study Electronics',
  'Lab Equipment',
  'Calculators',
  'Drawing Instruments',
  'Backpacks & Bags',
  'Study Tables',
  'Educational Software',
  'Study Lamps',
  'Project Supplies',
  'Classroom Furniture',
  'Educational Tablets',
  'Other Study Materials'
] as const;

export const categorySchema = z.enum(PRODUCT_CATEGORIES);
export const conditionSchema = z.enum(PRODUCT_CONDITIONS);

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;

export type Order = typeof orders.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;

export type OrderItem = typeof orderItems.$inferSelect;
export type InsertOrderItem = z.infer<typeof insertOrderItemSchema>;

export type Cart = typeof carts.$inferSelect;
export type InsertCart = z.infer<typeof insertCartSchema>;

export type Review = typeof reviews.$inferSelect;
export type InsertReview = z.infer<typeof insertReviewSchema>;

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;

export type UserAchievement = typeof userAchievements.$inferSelect;
export type InsertUserAchievement = z.infer<typeof insertUserAchievementSchema>;

export type UserStats = typeof userStats.$inferSelect;
export type InsertUserStats = z.infer<typeof insertUserStatsSchema>;

export type Category = z.infer<typeof categorySchema>;
export type Condition = z.infer<typeof conditionSchema>;

// ======================================
// STUDENT COLLAB PLATFORM SCHEMAS
// ======================================

// Student profiles (extends users with additional fields)
export const studentProfiles = pgTable("student_profiles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }), // References users.id
  college: text("college").notNull(),
  career: text("career").notNull(), // academic/career stage from enum
  
  // Academic Stream fields - support ALL disciplines
  primaryStream: text("primary_stream"), // main academic stream from STREAMS enum
  subStreams: text("sub_streams").array().default([]), // additional streams/specializations
  specialties: text("specialties").array().default([]), // specific areas of focus
  
  // Existing profile fields
  skills: text("skills").array().notNull().default([]), // flexible array of any skills
  currentCourse: text("current_course").notNull(),
  interests: text("interests").array().notNull().default([]), // academic & career interests
  passions: text("passions").array().notNull().default([]), // personal passions & hobbies
  studentLifeActivities: text("student_life_activities").array().notNull().default([]), // social activities and student life
  
  // Collaboration preferences
  openToCrossStreamCollab: boolean("open_to_cross_stream_collab").default(true), // willing to collaborate across streams
  preferredCollabTypes: text("preferred_collab_types").array().default([]), // from COLLAB_TYPES
  
  bio: text("bio"),
  avatarUrl: text("avatar_url"),
  isAvailableForCollab: boolean("is_available_for_collab").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertStudentProfileSchema = createInsertSchema(studentProfiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  career: z.enum(CAREER_STAGES),
  primaryStream: z.enum(STREAMS).optional(),
});

// Organizations (institutions, clubs, recruiters)
export const organizations = pgTable("organizations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  type: text("type").notNull(), // institution, club, recruiter, company
  purpose: text("purpose"), // what they do
  description: text("description"),
  website: text("website"),
  location: text("location"),
  verified: boolean("verified").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertOrganizationSchema = createInsertSchema(organizations).omit({
  id: true,
  createdAt: true,
});

// Organization users (who can manage/post for an organization)
export const organizationUsers = pgTable("organization_users", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: text("role").notNull().default("admin"), // admin, editor, viewer
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  uniqueOrgUser: unique("unique_organization_user").on(table.organizationId, table.userId)
}));

// Collaboration projects
export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  creatorId: integer("creator_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  category: text("category").notNull(), // project type from enum
  requiredSkills: text("required_skills").array().notNull().default([]),
  maxMembers: integer("max_members").notNull().default(4),
  currentMembers: integer("current_members").notNull().default(1),
  status: text("status").notNull().default("recruiting"), // recruiting, in_progress, completed, paused
  isPublic: boolean("is_public").default(true),
  duration: text("duration"), // expected timeline
  difficultyLevel: text("difficulty_level"), // beginner, intermediate, advanced
  tags: text("tags").array().default([]),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  creatorId: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  category: z.enum(PROJECT_CATEGORIES),
  status: z.enum(['recruiting', 'in_progress', 'completed', 'paused']),
  difficultyLevel: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
});

// Study groups
export const studyGroups = pgTable("study_groups", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  subject: text("subject").notNull(),
  description: text("description"),
  creatorId: integer("creator_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  maxMembers: integer("max_members").notNull().default(6),
  currentMembers: integer("current_members").notNull().default(1),
  meetingType: text("meeting_type").notNull(), // online, offline, hybrid
  schedule: text("schedule"), // meeting schedule preferences
  location: text("location"), // for offline meetings
  college: text("college"), // specific to a college or open to all
  isActive: boolean("is_active").default(true),
  tags: text("tags").array().default([]),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertStudyGroupSchema = createInsertSchema(studyGroups).omit({
  id: true,
  creatorId: true,
  createdAt: true,
});

// Opportunities posted by organizations
export const opportunities = pgTable("opportunities", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  type: text("type").notNull(), // hackathon, competition, event, internship, job
  organizationId: integer("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  requiredSkills: text("required_skills").array().default([]),
  eligibleCourses: text("eligible_courses").array().default([]),
  eligibleColleges: text("eligible_colleges").array().default([]),
  applicationDeadline: timestamp("application_deadline"),
  eventDate: timestamp("event_date"),
  location: text("location"),
  isRemote: boolean("is_remote").default(false),
  prizes: text("prizes"), // prize details if applicable
  registrationFee: numeric("registration_fee", { precision: 10, scale: 2 }).default("0"),
  maxParticipants: integer("max_participants"),
  currentParticipants: integer("current_participants").default(0),
  status: text("status").notNull().default("open"), // open, closed, ongoing, completed
  tags: text("tags").array().default([]),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertOpportunitySchema = createInsertSchema(opportunities).omit({
  id: true,
  createdAt: true,
}).extend({
  type: z.enum(OPPORTUNITY_TYPES),
  status: z.enum(['open', 'closed', 'ongoing', 'completed']),
});

// Project members
export const projectMembers = pgTable("project_members", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  studentId: integer("student_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: text("role").default("member"), // creator, member, collaborator
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
  status: text("status").default("active"), // active, left, removed
}, (table) => ({
  uniqueProjectUser: unique("unique_project_user").on(table.projectId, table.studentId)
}));

// Study group members
export const studyGroupMembers = pgTable("study_group_members", {
  id: serial("id").primaryKey(),
  studyGroupId: integer("study_group_id").notNull().references(() => studyGroups.id, { onDelete: "cascade" }),
  studentId: integer("student_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: text("role").default("member"), // creator, member
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
  status: text("status").default("active"),
}, (table) => ({
  uniqueGroupUser: unique("unique_group_user").on(table.studyGroupId, table.studentId)
}));

// Applications for projects and opportunities
export const applications = pgTable("applications", {
  id: serial("id").primaryKey(),
  applicantId: integer("applicant_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  targetType: text("target_type").notNull(), // project, study_group, opportunity
  targetId: integer("target_id").notNull(), // ID of the target
  message: text("message"), // application message
  status: text("status").notNull().default("pending"), // pending, accepted, rejected
  appliedAt: timestamp("applied_at").defaultNow().notNull(),
  reviewedAt: timestamp("reviewed_at"),
}, (table) => ({
  uniqueApplication: unique("unique_application").on(table.applicantId, table.targetType, table.targetId),
  targetTypeIndex: index("applications_target_type_id_idx").on(table.targetType, table.targetId)
}));

export const insertApplicationSchema = createInsertSchema(applications).omit({
  id: true,
  appliedAt: true,
}).extend({
  targetType: z.enum(['project', 'study_group', 'opportunity']),
  status: z.enum(['pending', 'accepted', 'rejected']),
});

// Student connections and matches  
export const connections = pgTable("connections", {
  id: serial("id").primaryKey(),
  requesterId: integer("requester_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  receiverId: integer("receiver_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  matchPercentage: integer("match_percentage").default(0), // 0-100
  status: text("status").notNull().default("pending"), // pending, accepted, rejected
  requestedAt: timestamp("requested_at").defaultNow().notNull(),
  respondedAt: timestamp("responded_at"),
}, (table) => ({
  uniqueConnection: unique("unique_connection").on(table.requesterId, table.receiverId),
  receiverIndex: index("connections_receiver_idx").on(table.receiverId),
  statusIndex: index("connections_status_idx").on(table.status)
}));

export const insertConnectionSchema = createInsertSchema(connections).omit({
  id: true,
  requestedAt: true,
}).extend({
  status: z.enum(['pending', 'accepted', 'rejected']),
  matchPercentage: z.number().min(0).max(100).optional(),
});

// Direct messages
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  senderId: integer("sender_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  receiverId: integer("receiver_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  messageType: text("message_type").default("text"), // text, image, file
  attachmentUrl: text("attachment_url"),
  isRead: boolean("is_read").default(false),
  sentAt: timestamp("sent_at").defaultNow().notNull(),
}, (table) => ({
  conversationIndex: index("messages_conversation_idx").on(table.senderId, table.receiverId),
  sentAtIndex: index("messages_sent_at_idx").on(table.sentAt),
  unreadIndex: index("messages_unread_idx").on(table.receiverId, table.isRead)
}));

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  sentAt: true,
}).extend({
  messageType: z.enum(['text', 'image', 'file']).optional(),
});

// Posts for social/explore page
export const posts = pgTable("posts", {
  id: serial("id").primaryKey(),
  authorId: integer("author_id").notNull(), // student or organization ID
  authorType: text("author_type").notNull(), // student, organization
  title: text("title"),
  content: text("content").notNull(),
  type: text("type").notNull(), // announcement, event, achievement, general
  attachmentUrls: text("attachment_urls").array().default([]),
  tags: text("tags").array().default([]),
  likes: integer("likes").default(0),
  shares: integer("shares").default(0),
  isPublic: boolean("is_public").default(true),
  isFeatured: boolean("is_featured").default(false),
  featuredAt: timestamp("featured_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  authorIndex: index("posts_author_idx").on(table.authorType, table.authorId),
  publicCreatedIndex: index("posts_public_created_idx").on(table.isPublic, table.createdAt),
  typeIndex: index("posts_type_idx").on(table.type),
  featuredIndex: index("posts_featured_idx").on(table.isFeatured, table.featuredAt)
}));

export const insertPostSchema = createInsertSchema(posts).omit({
  id: true,
  createdAt: true,
}).extend({
  authorType: z.enum(['student', 'organization']),
  type: z.enum(['announcement', 'event', 'achievement', 'general']),
});

// Post interactions (likes, comments, shares)
export const postInteractions = pgTable("post_interactions", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").notNull().references(() => posts.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // like, comment, share
  content: text("content"), // for comments
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  uniqueUserPostType: unique("unique_user_post_type").on(table.postId, table.userId, table.type),
  postIdIndex: index("post_interactions_post_idx").on(table.postId)
}));

// Student Collab notifications (extending existing notification system)
export const studentNotifications = pgTable("student_notifications", {
  id: serial("id").primaryKey(),
  recipientId: integer("recipient_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // match_found, project_invite, message, opportunity_match, etc.
  title: text("title").notNull(),
  message: text("message").notNull(),
  relatedId: integer("related_id"), // ID of related project, opportunity, etc.
  relatedType: text("related_type"), // project, opportunity, message, etc.
  actionUrl: text("action_url"), // where to navigate when clicked
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  recipientUnreadIndex: index("student_notifications_recipient_unread_idx").on(table.recipientId, table.isRead),
  createdAtIndex: index("student_notifications_created_idx").on(table.createdAt)
}));

export const insertStudentNotificationSchema = createInsertSchema(studentNotifications).omit({
  id: true,
  createdAt: true,
}).extend({
  type: z.enum(['match_found', 'project_invite', 'message', 'opportunity_match', 'application_status', 'connection_request']),
  relatedType: z.enum(['project', 'opportunity', 'message', 'connection', 'application']).optional(),
});

// Admin Reports - for user-reported content
export const reports = pgTable("reports", {
  id: serial("id").primaryKey(),
  reporterId: integer("reporter_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  reportedType: text("reported_type").notNull(), // post, user, comment
  reportedId: integer("reported_id").notNull(), // ID of reported item
  reason: text("reason").notNull(), // spam, inappropriate, fake, harassment, other
  description: text("description"), // additional details
  status: text("status").notNull().default("pending"), // pending, reviewed, resolved, dismissed
  actionTaken: text("action_taken"), // warning, deleted, suspended, none
  reviewedBy: integer("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  statusIndex: index("reports_status_idx").on(table.status),
  reporterIndex: index("reports_reporter_idx").on(table.reporterId),
  reportedTypeIdIndex: index("reports_type_id_idx").on(table.reportedType, table.reportedId)
}));

export const insertReportSchema = createInsertSchema(reports).omit({
  id: true,
  createdAt: true,
  reviewedAt: true,
}).extend({
  reportedType: z.enum(['post', 'user', 'comment']),
  reason: z.enum(['spam', 'inappropriate', 'fake', 'harassment', 'other']),
  status: z.enum(['pending', 'reviewed', 'resolved', 'dismissed']).optional(),
});

// Admin Announcements
export const announcements = pgTable("announcements", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  type: text("type").notNull().default("general"), // general, urgent, maintenance, feature
  isActive: boolean("is_active").default(true),
  createdBy: integer("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at"),
}, (table) => ({
  activeIndex: index("announcements_active_idx").on(table.isActive, table.createdAt),
  typeIndex: index("announcements_type_idx").on(table.type)
}));

export const insertAnnouncementSchema = createInsertSchema(announcements).omit({
  id: true,
  createdAt: true,
}).extend({
  type: z.enum(['general', 'urgent', 'maintenance', 'feature']),
});

// Password Reset Tokens - for Marketplace password reset
export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  tokenIndex: index("password_reset_token_idx").on(table.token),
  userIdIndex: index("password_reset_user_idx").on(table.userId),
}));

export const insertPasswordResetTokenSchema = createInsertSchema(passwordResetTokens).omit({
  id: true,
  createdAt: true,
  used: true,
});

export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type InsertPasswordResetToken = z.infer<typeof insertPasswordResetTokenSchema>;

// Types for Student Collab
export type StudentProfile = typeof studentProfiles.$inferSelect;
export type InsertStudentProfile = z.infer<typeof insertStudentProfileSchema>;

export type Organization = typeof organizations.$inferSelect;
export type InsertOrganization = z.infer<typeof insertOrganizationSchema>;

export type Project = typeof projects.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;

export type ProjectMember = typeof projectMembers.$inferSelect;
export type InsertProjectMember = typeof projectMembers.$inferInsert;

export type StudyGroup = typeof studyGroups.$inferSelect;
export type InsertStudyGroup = z.infer<typeof insertStudyGroupSchema>;

export type Opportunity = typeof opportunities.$inferSelect;
export type InsertOpportunity = z.infer<typeof insertOpportunitySchema>;

export type Application = typeof applications.$inferSelect;
export type InsertApplication = z.infer<typeof insertApplicationSchema>;

export type Connection = typeof connections.$inferSelect;
export type InsertConnection = z.infer<typeof insertConnectionSchema>;

export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;

export type Post = typeof posts.$inferSelect;
export type InsertPost = z.infer<typeof insertPostSchema>;

export type StudentNotification = typeof studentNotifications.$inferSelect;
export type InsertStudentNotification = z.infer<typeof insertStudentNotificationSchema>;

export type Report = typeof reports.$inferSelect;
export type InsertReport = z.infer<typeof insertReportSchema>;

export type Announcement = typeof announcements.$inferSelect;
export type InsertAnnouncement = z.infer<typeof insertAnnouncementSchema>;

// ===== COMPETITIONS =====

export const COMPETITION_CATEGORIES = [
  'Hackathon',
  'Case Study',
  'Business Plan',
  'Coding Contest',
  'Olympiad',
  'Research Paper',
  'Design/Art',
  'Quiz',
  'Ideathon',
  'Other',
] as const;

export const competitions = pgTable("competitions", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  organizer: text("organizer").notNull(),
  category: text("category").notNull(),
  field: text("field").notNull(),
  eligibility: text("eligibility"),
  teamSize: text("team_size"),
  mode: text("mode").notNull().default("Online"),
  location: text("location"),
  registrationDeadline: text("registration_deadline"),
  eventDate: text("event_date"),
  prizePool: text("prize_pool"),
  entryFee: text("entry_fee"),
  applyLink: text("apply_link"),
  sourcePlatform: text("source_platform"),
  descriptionSummary: text("description_summary"),
  isVerified: boolean("is_verified").notNull().default(false),
  requiresReview: boolean("requires_review").notNull().default(false),
  tags: text("tags").array().notNull().default([]),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertCompetitionSchema = createInsertSchema(competitions).omit({
  id: true,
  createdAt: true,
});

export type Competition = typeof competitions.$inferSelect;
export type InsertCompetition = z.infer<typeof insertCompetitionSchema>;

// ===== MULTI-ROLE PROFILE SCHEMAS FOR FIREBASE =====
// Base profile fields shared by all roles
const baseProfileSchema = z.object({
  uid: z.string(), // Firebase UID (document ID)
  userId: z.number().optional(), // PostgreSQL user ID - optional for Firebase-only authenticated users
  email: z.string().email(),
  name: z.string().min(1, "Name is required"),
  username: z.string().min(3).max(20),
  avatarUrl: z.string().optional(),
  bio: z.string().optional(),
});

// Club profile schema
export const clubProfileSchema = baseProfileSchema.extend({
  role: z.literal('Club'),
  clubName: z.string().min(1, "Club name is required"),
  category: z.string().min(1, "Category is required"),
  foundedYear: z.number().int().min(1900).max(new Date().getFullYear()),
  aboutClub: z.string().min(10, "About section must be at least 10 characters"),
  facultyCoordinatorName: z.string().min(1, "Faculty coordinator name is required"),
  studentHeadName: z.string().min(1, "Student head name is required"),
  contactEmail: z.string().email("Valid contact email is required"),
  socialMediaLinks: z.object({
    facebook: z.string().optional(),
    instagram: z.string().optional(),
    twitter: z.string().optional(),
    linkedin: z.string().optional(),
    website: z.string().optional(),
  }).optional(),
});

// Community profile schema
export const communityProfileSchema = baseProfileSchema.extend({
  role: z.literal('Community'),
  communityName: z.string().min(1, "Community name is required"),
  missionVision: z.string().min(10, "Mission & vision must be at least 10 characters"),
  category: z.string().min(1, "Category is required"),
  contactPerson: z.string().min(1, "Contact person name is required"),
  contactEmail: z.string().email("Valid contact email is required"),
  websiteJoinLink: z.string().optional(),
  socialLinks: z.object({
    facebook: z.string().optional(),
    instagram: z.string().optional(),
    twitter: z.string().optional(),
    linkedin: z.string().optional(),
    discord: z.string().optional(),
  }).optional(),
});

// Company profile schema
export const companyProfileSchema = baseProfileSchema.extend({
  role: z.literal('Company'),
  companyName: z.string().min(1, "Company name is required"),
  industryType: z.string().min(1, "Industry type is required"),
  aboutCompany: z.string().min(10, "About company must be at least 10 characters"),
  recruiterName: z.string().min(1, "Recruiter name is required"),
  designation: z.string().min(1, "Designation is required"),
  contactEmail: z.string().email("Valid contact email is required"),
  websiteCareersPage: z.string().optional(),
  linkedinProfile: z.string().optional(),
});

// Student profile schema (for Firebase Firestore)
export const firebaseStudentProfileSchema = baseProfileSchema.extend({
  role: z.literal('Student').default('Student'),
  college: z.string().min(1, "College is required"),
  career: z.enum(CAREER_STAGES),
  primaryStream: z.enum(STREAMS),
  specialization: z.string().optional(),
  subStreams: z.array(z.string()).optional(),
  specialties: z.array(z.string()).optional(),
  currentCourse: z.string().min(1, "Current course is required"),
  skills: z.array(z.string()).min(1, "At least one skill is required"),
  interests: z.array(z.string()).min(1, "At least one interest is required"),
  passions: z.array(z.string()).optional(),
  studentLifeActivities: z.array(z.string()).optional(),
  openToCrossStreamCollab: z.boolean().default(true),
  preferredCollabTypes: z.array(z.string()).optional(),
  phone: z.string().optional(),
  isAvailableForCollab: z.boolean().default(true),
});

// Discriminated union for all profile types
export const firebaseProfileSchema = z.discriminatedUnion('role', [
  firebaseStudentProfileSchema,
  clubProfileSchema,
  communityProfileSchema,
  companyProfileSchema,
]);

// TypeScript types for Firebase profiles
export type FirebaseStudentProfile = z.infer<typeof firebaseStudentProfileSchema>;
export type FirebaseClubProfile = z.infer<typeof clubProfileSchema>;
export type FirebaseCommunityProfile = z.infer<typeof communityProfileSchema>;
export type FirebaseCompanyProfile = z.infer<typeof companyProfileSchema>;
export type FirebaseProfile = z.infer<typeof firebaseProfileSchema>;
