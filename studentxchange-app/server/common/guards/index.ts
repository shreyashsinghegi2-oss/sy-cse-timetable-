/**
 * server/common/guards/index.ts
 * Auth guard barrel — re-exports all authentication/authorization middleware
 * from their source files so routes can import from one place.
 *
 * Usage:
 *   import { requireAdmin, verifyJWT, requireSession } from '../common/guards';
 */

// Session-based guards (marketplace)
export { requireAdmin, requireSession } from "../../middleware/security";

// Firebase JWT guard (Collab / Lancing)
export { verifyJWT } from "../../routes/firebase-auth";
