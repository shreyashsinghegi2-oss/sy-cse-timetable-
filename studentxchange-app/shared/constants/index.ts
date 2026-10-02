/**
 * shared/constants/index.ts
 * Platform-wide constants shared between frontend and backend.
 * Import from here for any value that must be consistent on both sides.
 *
 * Usage:
 *   import { PLATFORM_FEE_RATES, PRODUCT_CONDITIONS } from '@shared/constants';
 */

// ─── Re-export from existing files ─────────────────────────────────────────────
export {
  calculateFee,
  getFeeRate,
  getDisplayedFeeRate,
  calculateDisplayedFee,
} from "../commission-utils";

export {
  COMMISSION_RATE,
  PRODUCT_CONDITIONS,
  STREAMS,
  COLLAB_TYPES,
  PROJECT_CATEGORIES,
  OPPORTUNITY_TYPES,
  CAREER_STAGES,
} from "../schema";

// ─── Platform fee tiers (mirrors commission-utils.ts logic) ────────────────────
export const PLATFORM_FEE_RATES = {
  LOW:    { maxPrice: 499,  rate: 0.15 },
  MID:    { maxPrice: 1499, rate: 0.10 },
  HIGH:   { maxPrice: Infinity, rate: 0.05 },
} as const;

// ─── Order status values ────────────────────────────────────────────────────────
export const ORDER_STATUSES = [
  "pending",
  "paid",
  "processing",
  "shipped",
  "delivered",
  "completed",
  "cancelled",
  "refunded",
] as const;

export type OrderStatus = typeof ORDER_STATUSES[number];

// ─── File upload limits ─────────────────────────────────────────────────────────
export const UPLOAD_LIMITS = {
  MAX_IMAGE_SIZE_MB: 10,
  MAX_PDF_SIZE_MB: 25,
  ALLOWED_IMAGE_TYPES: ["image/jpeg", "image/png", "image/webp", "image/gif"],
  ALLOWED_DOC_TYPES: ["application/pdf"],
} as const;

// ─── Pagination defaults ────────────────────────────────────────────────────────
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
} as const;
