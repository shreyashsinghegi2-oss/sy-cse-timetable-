/**
 * client/src/types/index.ts
 * Client-side TypeScript types for UI state, component props, and local models.
 * For shared backend/frontend entity types, import from '@shared/types' instead.
 *
 * Usage:
 *   import type { FilterState, UploadState } from '@/types';
 */

// ─── Re-export shared entity types for convenience ──────────────────────────────
export type {
  User,
  Product,
  Order,
  OrderItem,
  Cart,
  Review,
  Notification,
  BuyerRequest,
  ApiResponse,
  PaginatedResponse,
  JwtUser,
} from "@shared/types";

// ─── UI / Component state types ─────────────────────────────────────────────────

export interface FilterState {
  category: string;
  condition: string;
  minPrice: number | null;
  maxPrice: number | null;
  sortBy: "newest" | "price_asc" | "price_desc" | "popular";
  search: string;
}

export interface UploadState {
  file: File | null;
  preview: string | null;
  progress: number;
  error: string | null;
  uploading: boolean;
}

export interface ModalState {
  open: boolean;
  data?: unknown;
}

export interface ToastMessage {
  id: string;
  type: "success" | "error" | "warning" | "info";
  title: string;
  description?: string;
  duration?: number;
}

// ─── Auth / session types ───────────────────────────────────────────────────────

export interface AuthUser {
  id: number;
  username: string;
  email: string;
  role: string;
  profileImage?: string | null;
}

export interface CollabUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string | null;
}

// ─── Navigation types ───────────────────────────────────────────────────────────

export interface NavItem {
  id: string;
  label: string;
  href: string;
  icon?: React.ComponentType<{ className?: string }>;
  badge?: number;
  adminOnly?: boolean;
}

// React import for NavItem icon type (ambient — Vite JSX transform handles this)
import type React from "react";
