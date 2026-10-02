/**
 * shared/types/index.ts
 * Aggregated TypeScript types shared between frontend and backend.
 * Import from here instead of deriving types ad-hoc from schema tables.
 *
 * Usage:
 *   import type { User, Product, Order } from '@shared/types';
 */

import type {
  users,
  products,
  orders,
  orderItems,
  carts,
  reviews,
  notifications,
  userAchievements,
  userStats,
} from "../schema";

// ─── Core entity types (inferred from Drizzle table definitions) ───────────────
export type User            = typeof users.$inferSelect;
export type Product         = typeof products.$inferSelect;
export type Order           = typeof orders.$inferSelect;
export type OrderItem       = typeof orderItems.$inferSelect;
export type Cart            = typeof carts.$inferSelect;
export type Review          = typeof reviews.$inferSelect;
export type Notification    = typeof notifications.$inferSelect;
export type UserAchievement = typeof userAchievements.$inferSelect;
export type UserStats       = typeof userStats.$inferSelect;

// ─── Re-export explicitly named types from schema ─────────────────────────────
export type { BuyerRequest, InsertBuyerRequest } from "../schema";

// ─── Common API response shapes ────────────────────────────────────────────────
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T = unknown> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// ─── Auth context shapes ────────────────────────────────────────────────────────
export interface JwtUser {
  uid: string;
  email?: string;
  name?: string;
  picture?: string;
}

export interface SessionUser {
  userId: number;
  loginTime: string;
}
