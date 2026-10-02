/**
 * server/config/security/index.ts
 * Security configuration barrel.
 * Centralises session, rate-limiter, and header middleware exports.
 *
 * Usage:
 *   import { securityHeaders, sessionMiddleware } from 'server/config/security';
 */

export { securityHeaders } from "../../middleware/security";
export { authLimiter, uploadLimiter, paymentLimiter } from "../../middleware/rate-limiter";
