/**
 * client/src/validations/index.ts
 * Form validation schemas for client-side use.
 * Shared insert schemas from @shared/validations ensure the frontend and
 * backend always validate the same shape.
 *
 * Usage:
 *   import { insertProductSchema, loginSchema } from '@/validations';
 */

import { z } from "zod";

// ─── Re-export shared insert schemas (backend-compatible) ──────────────────────
export {
  insertUserSchema,
  insertProductSchema,
  insertOrderSchema,
  insertCartSchema,
  insertBuyerRequestSchema,
  insertReviewSchema,
} from "@shared/validations";

// ─── Client-only form schemas ───────────────────────────────────────────────────

export const loginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const registerSchema = z.object({
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username must be at most 30 characters")
    .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores"),
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(1, "Name is required"),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(8, "New password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const searchSchema = z.object({
  query: z.string().max(200, "Search query too long"),
  category: z.string().optional(),
  minPrice: z.number().min(0).optional(),
  maxPrice: z.number().min(0).optional(),
});

export const reviewSchema = z.object({
  rating: z.number().min(1, "Rating is required").max(5),
  comment: z.string().min(10, "Review must be at least 10 characters").max(2000),
});

export type LoginForm = z.infer<typeof loginSchema>;
export type RegisterForm = z.infer<typeof registerSchema>;
export type ChangePasswordForm = z.infer<typeof changePasswordSchema>;
export type SearchForm = z.infer<typeof searchSchema>;
export type ReviewForm = z.infer<typeof reviewSchema>;
