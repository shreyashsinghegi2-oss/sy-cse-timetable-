import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import { admin } from '../firebase-admin';
import { PLATFORM_ADMIN_EMAIL } from '../config/constants';

const isProduction = process.env.NODE_ENV === 'production';

const ADMIN_EMAIL = PLATFORM_ADMIN_EMAIL;
const ADMIN_EMAILS = new Set([
  PLATFORM_ADMIN_EMAIL,
  'admin@studentxchange.in',
  'gautambennurkar@gmail.com',
  'meghanamaydeo@gmail.com',
]);

export const securityHeaders = helmet({
  // CSP: permissive enough for Firebase auth + PayU + Google Fonts while
  // still blocking the most dangerous vectors (data:, javascript:, object)
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "'unsafe-inline'",  // Firebase Auth uses inline scripts
        "https://apis.google.com",  // Firebase Google Auth GAPI loader (NOT covered by *.googleapis.com)
        "https://*.googleapis.com",
        "https://*.gstatic.com",
        "https://*.firebaseapp.com",
        "https://*.firebasestorage.googleapis.com",
        "https://cdn.jsdelivr.net",  // Monaco Editor CDN (AMD loader + language workers)
        "https://www.googletagmanager.com",
        "https://www.google-analytics.com",
      ],
      // Monaco Editor creates language-service web workers via blob: URLs.
      // Without this, the editor loads forever while workers silently fail.
      workerSrc: ["'self'", "blob:"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdn.jsdelivr.net"],
      imgSrc: ["'self'", "data:", "blob:", "https:"],
      fontSrc: ["'self'", "data:", "https://fonts.gstatic.com", "https://cdn.jsdelivr.net"],
      connectSrc: [
        "'self'",
        "https://*.googleapis.com",
        "https://*.firebaseapp.com",
        "https://*.firebasestorage.googleapis.com",
        "https://*.firebaseio.com",
        "wss://*.firebaseio.com",
        "https://*.payu.in",
        "https://secure.payu.in",
        "https://cdn.jsdelivr.net",  // Monaco loader fetches version manifests
        "https://www.google-analytics.com",
        "https://region1.google-analytics.com",
        "https://www.googletagmanager.com",
      ],
      frameSrc: [
        "'self'",
        "https://*.firebaseapp.com",
        "https://accounts.google.com",  // Google OAuth popup (required for Firebase Google Auth)
        "https://*.payu.in",
        "https://secure.payu.in",
      ],
      // Allow embedding inside Replit preview iframes and same origin
      frameAncestors: [
        "'self'",
        "https://*.replit.dev",
        "https://*.replit.co",
        "https://*.repl.co",
        "https://replit.com",
      ],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'", "https://*.payu.in", "https://secure.payu.in"],
      upgradeInsecureRequests: [],
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: false, // Required for Google auth popups
  crossOriginResourcePolicy: false,
  dnsPrefetchControl: { allow: true },
  // SAMEORIGIN: protects against clickjacking; allows Replit iframe via CSP frame-ancestors above
  frameguard: { action: 'sameorigin' },
  hidePoweredBy: true,
  // HSTS: force HTTPS for 1 year with subdomains
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  ieNoOpen: true,
  noSniff: true,
  originAgentCluster: false,
  permittedCrossDomainPolicies: false,
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  xssFilter: false, // Deprecated, CSP handles this now
});

export function additionalSecurityHeaders(req: Request, res: Response, next: NextFunction) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.removeHeader('X-Powered-By');
  next();
}

export function disableDirectoryListing(req: Request, res: Response, next: NextFunction) {
  if (req.path.endsWith('/') && req.path !== '/') {
    const pathWithoutTrailingSlash = req.path.slice(0, -1);
    return res.redirect(301, pathWithoutTrailingSlash);
  }
  next();
}

export function blockSensitiveFiles(req: Request, res: Response, next: NextFunction) {
  const blockedPatterns = [
    /\.env$/i,
    /\.git/i,
    /\.htaccess$/i,
    /\.htpasswd$/i,
    /\.DS_Store$/i,
    /Thumbs\.db$/i,
    /\.log$/i,
    /\.sql$/i,
    /\.bak$/i,
    /\.swp$/i,
    /\.config$/i,
    /package-lock\.json$/i,
    /yarn\.lock$/i,
    /\.npmrc$/i,
    /\.map$/i,
    /tsconfig\.json$/i,
    /drizzle\.config\.ts$/i,
  ];
  
  for (const pattern of blockedPatterns) {
    if (pattern.test(req.path)) {
      return res.status(403).json({ error: 'Access denied' });
    }
  }
  
  next();
}

async function verifyFirebaseToken(authHeader: string): Promise<{ uid: string; email?: string } | null> {
  try {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    
    const token = authHeader.split('Bearer ')[1];
    if (!token) return null;
    
    const firebaseAdmin = admin;
    if (!firebaseAdmin.apps.length) {
      return null;
    }
    
    const decodedToken = await firebaseAdmin.auth().verifyIdToken(token);
    return {
      uid: decodedToken.uid,
      email: decodedToken.email
    };
  } catch (error) {
    return null;
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (req.session?.userId) {
    return next();
  }
  
  return res.status(401).json({ 
    error: 'Authentication required',
    message: 'Please log in to access this resource'
  });
}

export async function requireFirebaseAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  
  const user = await verifyFirebaseToken(authHeader as string);
  
  if (!user) {
    return res.status(401).json({ 
      error: 'Authentication required',
      message: 'Please log in to access this resource'
    });
  }
  
  (req as any).firebaseUser = user;
  next();
}

export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  let firebaseEmail: string | undefined;
  let sessionEmail: string | undefined;
  let sessionUserId: number | undefined = req.session?.userId;

  if (authHeader) {
    const user = await verifyFirebaseToken(authHeader);
    firebaseEmail = user?.email;
    if (user?.email && ADMIN_EMAILS.has(user.email)) {
      (req as any).firebaseUser = user;
      (req as any).isAdmin = true;
      return next();
    }
  }

  if (sessionUserId) {
    const { storage } = await import('../storage');
    const sessionUser = await storage.getUser(sessionUserId);
    sessionEmail = sessionUser?.email;
    // SECURITY: only explicitly listed admin emails grant admin access. The
    // previous `username === 'admin'` check was bypassable — any user who
    // registered the username "admin" would have received full admin powers.
    if (sessionUser?.email && ADMIN_EMAILS.has(sessionUser.email)) {
      (req as any).isAdmin = true;
      return next();
    }
  }

  // Log denial server-side only — never expose email/userId to client
  console.warn('[requireAdmin] DENIED', {
    path: req.path,
    method: req.method,
    hasAuthHeader: !!authHeader,
    hasCookie: !!req.headers.cookie,
    ip: req.ip,
  });

  return res.status(403).json({
    error: 'Access denied',
    message: 'Admin privileges required',
  });
}

export function requireAdminForRoute(req: Request, res: Response, next: NextFunction) {
  const adminPaths = [
    '/admin',
    '/admin-lancing',
    '/collab-admin',
    '/database-monitor',
    '/seo-dashboard',
    '/clear-cache',
    '/collab-arena/admin',
    '/statetech-2026/admin'
  ];
  
  const isAdminRoute = adminPaths.some(path => req.path.startsWith(path));
  
  if (!isAdminRoute) {
    return next();
  }
  
  return requireAdmin(req, res, next);
}

export function productionErrorSanitizer(req: Request, res: Response, next: NextFunction) {
  const originalJson = res.json.bind(res);
  
  res.json = function(body: any) {
    if (isProduction && body) {
      if (body.stack) {
        delete body.stack;
      }
      if (body.trace) {
        delete body.trace;
      }
      if (body.debug) {
        delete body.debug;
      }
      if (body.internalError) {
        delete body.internalError;
      }
    }
    return originalJson(body);
  };
  
  next();
}

export function blockSourceMaps(req: Request, res: Response, next: NextFunction) {
  if (isProduction && req.path.endsWith('.map')) {
    return res.status(404).json({ error: 'Not found' });
  }
  next();
}

export const productionMode = {
  isProduction,
  flag: isProduction ? 'production' : 'development',
  debugEnabled: !isProduction,
};
