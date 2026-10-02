import { Request, Response, NextFunction } from 'express';

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

const RATE_LIMITS = {
  // General API traffic
  default:      { requests: 300,  windowMs: 60000 },
  api:          { requests: 600,  windowMs: 60000 },
  // Auth endpoints — 40/min per IP.
  // 20/min was too tight for a launch day where many mobile users share a
  // campus NAT (same IP). 40/min still blocks brute-force (attacker needs
  // 40 attempts/min to lockout a target) while letting a shared-IP cohort
  // sign up without hitting 429s.
  auth:         { requests: 40,   windowMs: 60000 },
  // Password reset — max 5 per hour per IP to block enumeration attacks
  passwordReset:{ requests: 5,    windowMs: 3600000 },
  // Social features
  post:         { requests: 60,   windowMs: 60000 },
  message:      { requests: 120,  windowMs: 60000 },
  // File uploads
  upload:       { requests: 30,   windowMs: 60000 },
  // Registrations (conference, SPCR, etc.)
  registration: { requests: 20,   windowMs: 60000 },
  // Admin ops — low volume, fast detection
  admin:        { requests: 100,  windowMs: 60000 },
  // Payment initiation — 15/min: generous enough for a user retrying a
  // failed payment a few times, tight enough to block scripted abuse.
  payment:      { requests: 15,   windowMs: 60000 },
  // Other sensitive ops
  sensitive:    { requests: 20,   windowMs: 60000 },
};

function getClientIdentifier(req: Request): string {
  // SECURITY: use req.ip which Express resolves via the trusted `trust proxy`
  // setting, rather than reading X-Forwarded-For directly.  Reading that
  // header ourselves lets an attacker rotate fake IPs on every request and
  // bypass all IP-based rate limits entirely.
  const ip = req.ip || req.socket?.remoteAddress || 'unknown';
  
  const userId = (req as any).session?.userId || (req as any).user?.uid || '';
  return `${ip}:${userId}`;
}

function cleanupExpiredEntries() {
  const now = Date.now();
  const entries = Array.from(rateLimitStore.entries());
  for (const [key, entry] of entries) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}

setInterval(cleanupExpiredEntries, 60000);

export function createRateLimiter(
  type: keyof typeof RATE_LIMITS = 'default'
) {
  const config = RATE_LIMITS[type];
  
  return (req: Request, res: Response, next: NextFunction) => {
    const clientId = getClientIdentifier(req);
    const key = `${type}:${clientId}`;
    const now = Date.now();
    
    let entry = rateLimitStore.get(key);
    
    if (!entry || now > entry.resetTime) {
      entry = { count: 0, resetTime: now + config.windowMs };
      rateLimitStore.set(key, entry);
    }
    
    entry.count++;
    
    res.setHeader('X-RateLimit-Limit', config.requests);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, config.requests - entry.count));
    res.setHeader('X-RateLimit-Reset', entry.resetTime);
    
    if (entry.count > config.requests) {
      const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
      res.setHeader('Retry-After', retryAfter);
      return res.status(429).json({
        error: 'Too many requests',
        message: 'Please slow down and try again later',
        retryAfter
      });
    }
    
    next();
  };
}

export const rateLimitMiddleware = {
  default:       createRateLimiter('default'),
  auth:          createRateLimiter('auth'),
  passwordReset: createRateLimiter('passwordReset'),
  post:          createRateLimiter('post'),
  message:       createRateLimiter('message'),
  upload:        createRateLimiter('upload'),
  registration:  createRateLimiter('registration'),
  api:           createRateLimiter('api'),
  admin:         createRateLimiter('admin'),
  payment:       createRateLimiter('payment'),
  sensitive:     createRateLimiter('sensitive'),
};

// Named aliases re-exported for backwards-compat with server/config/security/index.ts
export const authLimiter    = rateLimitMiddleware.auth;
export const uploadLimiter  = rateLimitMiddleware.upload;
export const paymentLimiter = rateLimitMiddleware.payment;

// ─── Async Postgres-backed middleware for public AI endpoints ─────────────────
// These endpoints (e.g. /api/match, /api/lancing/search) are intentionally
// unauthenticated but invoke paid AI APIs.  We protect them with a strict
// IP-based limit stored in Postgres so the limit survives restarts and is
// shared across server instances.
//
// Limits are configurable through env vars:
//   PUBLIC_AI_REQUESTS  (default 5)
//   PUBLIC_AI_WINDOW_MS (default 60000)
//
// The middleware is async; use it with async-aware Express (Express 5) or
// wrap in next(err) style — the lancing-ai router already uses async handlers.

import { pgCheckRateLimit } from "../utils/pg-rate-limiter";

const PUBLIC_AI_LIMIT     = parseInt(process.env.PUBLIC_AI_REQUESTS  ?? "5");
const PUBLIC_AI_WINDOW_MS = parseInt(process.env.PUBLIC_AI_WINDOW_MS ?? "60000");

export async function publicAILimiter(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const ip  = req.ip || (req.socket?.remoteAddress ?? "unknown");
  const key = `public_ai:${ip}`;

  const result = await pgCheckRateLimit(key, PUBLIC_AI_LIMIT, PUBLIC_AI_WINDOW_MS);

  res.setHeader("X-RateLimit-Limit",     PUBLIC_AI_LIMIT);
  res.setHeader("X-RateLimit-Remaining", result.remaining);
  res.setHeader("X-RateLimit-Reset",     result.resetAt);

  if (!result.allowed) {
    const retryAfter = Math.ceil((result.resetAt - Date.now()) / 1000);
    res.setHeader("Retry-After", retryAfter);
    res.status(429).json({
      error: "rate_limited",
      message: "Too many requests to this endpoint. Please wait before trying again.",
      retryAfter,
    });
    return;
  }

  next();
}

// Discovery searches have their own shared limit so visiting several listing
// tabs does not exhaust the stricter opportunity-matching budget. Cached
// requests still count against this limit; concurrent cache misses are
// coalesced by the search-links service.
const configuredSearchLinksLimit = Number(process.env.LANCING_SEARCH_LINKS_REQUESTS);
const SEARCH_LINKS_LIMIT = Number.isInteger(configuredSearchLinksLimit) &&
  configuredSearchLinksLimit >= 1 && configuredSearchLinksLimit <= 100
  ? configuredSearchLinksLimit : 12;

export async function searchLinksLimiter(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const ip = req.ip || req.socket?.remoteAddress || "unknown";
  const result = await pgCheckRateLimit(`lancing_search_links:${ip}`, SEARCH_LINKS_LIMIT, 60_000);
  res.setHeader("X-RateLimit-Limit", SEARCH_LINKS_LIMIT);
  res.setHeader("X-RateLimit-Remaining", result.remaining);
  res.setHeader("X-RateLimit-Reset", result.resetAt);
  if (!result.allowed) {
    const retryAfter = Math.ceil((result.resetAt - Date.now()) / 1000);
    res.setHeader("Retry-After", retryAfter);
    res.status(429).json({
      error: "rate_limited",
      message: "Too many web-search requests. Please wait before trying again.",
      retryAfter,
    });
    return;
  }
  next();
}

export function globalRateLimiter(req: Request, res: Response, next: NextFunction) {
  const clientId = getClientIdentifier(req);
  const key = `global:${clientId}`;
  const now = Date.now();
  const config = { requests: 5000, windowMs: 60000 };
  
  let entry = rateLimitStore.get(key);
  
  if (!entry || now > entry.resetTime) {
    entry = { count: 0, resetTime: now + config.windowMs };
    rateLimitStore.set(key, entry);
  }
  
  entry.count++;
  
  if (entry.count > config.requests) {
    return res.status(429).json({
      error: 'Rate limit exceeded',
      message: 'Too many requests. Please try again later.'
    });
  }
  
  next();
}
