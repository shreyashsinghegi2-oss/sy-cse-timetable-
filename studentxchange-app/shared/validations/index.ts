/**
 * shared/validations/index.ts
 * Zod insert schemas shared between frontend (forms) and backend (API validation).
 * Import from here so form schemas and API validators stay in sync automatically.
 *
 * Usage:
 *   import { insertProductSchema, insertOrderSchema } from '@shared/validations';
 */

export {
  insertUserSchema,
  insertProductSchema,
  insertOrderSchema,
  insertOrderItemSchema,
  insertCartSchema,
  insertBuyerRequestSchema,
  insertReviewSchema,
  insertNotificationSchema,
  insertUserAchievementSchema,
  insertUserStatsSchema,
} from "../schema";
