import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import path from "path";
import { createRequire } from "module";
const _require = createRequire(import.meta.url);
const compression = _require("compression") as () => express.RequestHandler;
import connectPg from "connect-pg-simple";
import { initializeFirebaseAdmin } from "./firebase-admin";
import { globalRateLimiter } from "./middleware/rate-limiter";
import { errorHandler, notFoundHandler } from "./middleware/error-handler";
import { sanitizeInput } from "./middleware/request-validator";
import { securityAuditLogger, detectSuspiciousPatterns } from "./middleware/security-logger";
import { 
  securityHeaders, 
  additionalSecurityHeaders, 
  disableDirectoryListing,
  blockSensitiveFiles,
  productionErrorSanitizer,
  blockSourceMaps,
  productionMode,
  requireAdminForRoute
} from "./middleware/security";

const app = express();

// Gzip compression — reduces transfer size by ~65% for HTML/JS/CSS/JSON
app.use(compression());

// ─── Firebase Auth handler proxy ─────────────────────────────────────────────
// Google sign-in on the custom domain (studentxchange.in) breaks when the
// auth handler lives on <project>.firebaseapp.com: Safari ITP and Chrome
// third-party storage partitioning silently drop the auth state, so users
// bounce back to the login page. Fix (Firebase-recommended): serve the
// /__/auth/* handler from OUR domain by proxying it to firebaseapp.com,
// and set authDomain to the app's own hostname on the client.
// Registered BEFORE all other middleware — the handler must not be touched
// by CSP headers, body parsing, rate limiting, or input sanitization.
if (!process.env.VITE_FIREBASE_PROJECT_ID) {
  console.error("[AUTH PROXY] FATAL: VITE_FIREBASE_PROJECT_ID is not set — Google sign-in proxy cannot work");
}
const FIREBASE_AUTH_HOST = `${process.env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`;
// Only forward headers the Firebase auth handler actually needs.
// NEVER forward cookie/authorization/x-session-token — those are OUR app's
// credentials and must not leak to an external host.
const PROXY_HEADER_ALLOWLIST = new Set([
  "user-agent", "accept", "accept-language", "content-type",
  "referer", "x-client-version", "x-firebase-gmpid", "x-firebase-locale",
]);
app.use("/__/auth", (req, res) => {
  if (!process.env.VITE_FIREBASE_PROJECT_ID) {
    return res.status(500).send("Auth proxy misconfigured");
  }
  const targetUrl = `https://${FIREBASE_AUTH_HOST}/__/auth${req.url}`;
  const headers: Record<string, string> = { host: FIREBASE_AUTH_HOST };
  for (const [k, v] of Object.entries(req.headers)) {
    if (typeof v === "string" && PROXY_HEADER_ALLOWLIST.has(k.toLowerCase())) {
      headers[k] = v;
    }
  }

  const https = _require("https") as typeof import("https");
  const proxyReq = https.request(targetUrl, { method: req.method, headers }, (proxyRes) => {
    const resHeaders: Record<string, any> = { ...proxyRes.headers };
    // Strip frame/embedding restrictions so the handler iframe works on our origin
    delete resHeaders["x-frame-options"];
    delete resHeaders["content-security-policy"];
    delete resHeaders["cross-origin-opener-policy"];
    delete resHeaders["cross-origin-embedder-policy"];
    res.writeHead(proxyRes.statusCode || 500, resHeaders);
    proxyRes.pipe(res);
  });
  proxyReq.on("error", (err) => {
    console.error("[AUTH PROXY] upstream error:", err.message);
    if (!res.headersSent) res.status(502).send("Auth service unavailable");
  });
  req.pipe(proxyReq);
});
// Firebase JS SDK also fetches /__/firebase/init.json from the authDomain
app.use("/__/firebase", (req, res) => {
  const https = _require("https") as typeof import("https");
  https.get(`https://${FIREBASE_AUTH_HOST}/__/firebase${req.url}`, (proxyRes) => {
    res.writeHead(proxyRes.statusCode || 500, proxyRes.headers as any);
    proxyRes.pipe(res);
  }).on("error", () => {
    if (!res.headersSent) res.status(502).end();
  });
});

// CORS — tightened: allow own domain in production, wildcard only in dev
const ALLOWED_ORIGINS = new Set([
  // Replit workspace previews and deployed URL patterns
  process.env.REPLIT_DOMAINS ? `https://${process.env.REPLIT_DOMAINS}` : '',
  process.env.REPL_SLUG ? `https://${process.env.REPL_SLUG}.repl.co` : '',
  'https://studentxchange.in',
  'https://www.studentxchange.in',
].filter(Boolean));

app.use((req, res, next) => {
  const origin = req.headers.origin || '';
  const isProduction = process.env.NODE_ENV === 'production';

  // In development allow all Replit preview origins; in production restrict
  // to the explicit allowlist only — *.replit.dev wildcards let any
  // attacker-controlled Replit app make credentialed cross-origin requests.
  const isAllowedOrigin =
    !isProduction
      ? true
      : ALLOWED_ORIGINS.has(origin);

  if (isAllowedOrigin && origin) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Session-Token');
    res.header('Access-Control-Max-Age', '86400');
    res.header('Vary', 'Origin');
  }
  // Unknown origins in production: no ACAO header set → browser blocks cross-origin request

  if (req.method === 'OPTIONS') {
    return res.status(isAllowedOrigin ? 200 : 403).end();
  }
  next();
});

app.use(securityHeaders);
app.use(additionalSecurityHeaders);

// Compatibility for browsers that cached the old public-directory 301 from
// /student-lancing to /student-lancing/. Rewrite internally so both forms
// render the React route while the canonical remains slash-free.
app.use((req, _res, next) => {
  if (req.path === "/student-lancing/") {
    req.url = req.url.replace(/^\/student-lancing\/(?=\?|$)/, "/student-lancing");
  }
  next();
});

app.use(disableDirectoryListing);
app.use(blockSensitiveFiles);
app.use(blockSourceMaps);

app.use(productionErrorSanitizer);

// Body parser limits — reduced from 50mb to stop payload-based DoS.
// File uploads use multipart/form-data (handled by multer) and don't hit these.
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

app.use(globalRateLimiter);
app.use(sanitizeInput);
app.use(detectSuspiciousPatterns);
app.use(securityAuditLogger);

log(`🔒 Security mode: ${productionMode.flag}`);

// Cache control + SEO indexing middleware
app.use((req, res, next) => {
  const isApi = req.path.startsWith('/api/');
  const isHtml = req.path.endsWith('.html') || req.path === '/' ||
    (!req.path.startsWith('/api/') && !req.path.includes('.'));

  if (isApi) {
    // API responses: never cache
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  } else if (req.path.endsWith('.html') || req.path === '/') {
    // HTML shell: no-cache allows conditional GET (ETag/Last-Modified),
    // which is friendlier for SEO crawlers than no-store.
    res.setHeader('Cache-Control', 'no-cache, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    // Explicitly allow indexing on the deployed site. This header overrides
    // any noindex injected by intermediate proxies for non-Replit environments.
    res.setHeader('X-Robots-Tag', 'index, follow, max-snippet:-1, max-image-preview:large');
  }

  // Add versioning header for client-side cache detection
  res.setHeader('X-App-Version', '7.0-LIVE-TEST-2025-08-01');

  next();
});
app.use(express.static(path.join(process.cwd(), "public"), {
  // Let React routes win when an old static directory has the same name.
  redirect: false,
  setHeaders: (res, filePath) => {
    if (filePath.match(/\.(js|css)$/i) && filePath.includes('-')) {
      // Vite fingerprinted assets: cache for 1 year (immutable)
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    } else if (filePath.match(/\.(jpg|jpeg|png|gif|webp|svg|ico|woff2?|ttf|eot)$/i)) {
      // Images and fonts: cache for 7 days
      res.setHeader('Cache-Control', 'public, max-age=604800, stale-while-revalidate=86400');
    } else if (filePath.match(/\.(xml|txt|json)$/i)) {
      // robots.txt, sitemap.xml, manifest.json: cache for 1 day
      res.setHeader('Cache-Control', 'public, max-age=86400');
    } else {
      res.setHeader('Cache-Control', 'no-cache, must-revalidate');
    }
  }
}));

// Serve uploaded files with aggressive cache prevention
app.use("/uploads", express.static(path.join(process.cwd(), "uploads"), {
  setHeaders: (res, path) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', 'Thu, 01 Jan 1970 00:00:00 GMT');
    res.setHeader('Last-Modified', new Date().toUTCString());
    res.setHeader('ETag', 'nocache-' + Date.now());
  }
}));

// Configure PostgreSQL session storage for persistence across restarts
const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 7 days
const PgSession = connectPg(session);
const isProduction = process.env.NODE_ENV === 'production';

const pgSessionStore = new PgSession({
  conString: process.env.DATABASE_URL,
  tableName: 'sessions',
  createTableIfMissing: false,
  ttl: Math.floor(sessionTtl / 1000),
  // Prune expired sessions every 15 minutes to prevent unbounded table growth.
  // Without pruning the sessions table grows forever and reads become slow scans.
  pruneSessionInterval: 900,
  errorLog: (err: Error) => {
    console.error('[SESSION STORE ERROR]', err.message);
  },
});

app.set('trust proxy', 1);

// Token-based session fallback for cross-origin iframe contexts.
// Modern browsers (Chrome with Tracking Protection, Safari ITP) block
// third-party cookies entirely in iframes regardless of SameSite=None.
// To handle this, the client may also send the signed session id as
// `X-Session-Token` header (stored in localStorage). We synthesize the
// cookie header from it BEFORE express-session runs so the rest of the
// auth stack works unchanged.
// SECURITY: validate token format before injecting to prevent header injection.
const SESSION_TOKEN_PATTERN = /^[A-Za-z0-9_\-\.]{20,256}$/;
app.use((req, _res, next) => {
  if (!req.headers.cookie) {
    const tok = req.headers['x-session-token'];
    if (typeof tok === 'string' && SESSION_TOKEN_PATTERN.test(tok)) {
      req.headers.cookie = `connect.sid=${encodeURIComponent('s:' + tok)}`;
    }
  }
  next();
});

app.use(session({
  secret: process.env.SESSION_SECRET!,
  resave: false,
  saveUninitialized: false,
  store: pgSessionStore,
  cookie: {
    // SameSite=None + Secure is required so the session cookie is sent
    // when the app is loaded inside a cross-origin iframe (e.g. the
    // Replit workspace preview iframe). Without this, browsers silently
    // drop the cookie on every fetch and every authenticated endpoint
    // looks like the user is logged out (admin dashboard shows zeros).
    // Replit always serves over HTTPS, so Secure is safe in dev too.
    secure: true,
    httpOnly: true,
    maxAge: sessionTtl,
    sameSite: 'none',
  }
}));

// SECURITY: auth-status returns minimal info — no session previews or cookie contents
app.get('/api/auth-status', (req: Request, res: Response) => {
  res.json({
    isAuthenticated: !!req.session?.userId,
    userId: req.session?.userId || null,
  });
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  try {
    // Enhanced environment validation for Cloud Run deployment
    log("🚀 Starting server initialization...");
    log(`Node.js version: ${process.version}`);
    log(`Platform: ${process.platform}`);
    
    // Check for required environment variables early — hard fail if any are missing
    const requiredSecrets = ['DATABASE_URL', 'SESSION_SECRET', 'JWT_SECRET', 'CONF_QR_SECRET'];
    const missingVars = requiredSecrets.filter(envVar => !process.env[envVar]);
    if (missingVars.length > 0) {
      throw new Error(`Required secrets missing: ${missingVars.join(', ')}. Set them in Replit Secrets.`);
    }

    // Warn if SESSION_SECRET is suspiciously short
    if (process.env.SESSION_SECRET!.length < 32) {
      console.warn('⚠️  SESSION_SECRET is set but appears short (< 32 chars). Use a longer random value.');
    } else {
      log('🔐 SESSION_SECRET: configured ✓');
    }
    if (process.env.JWT_SECRET!.length < 32) {
      console.warn('⚠️  JWT_SECRET is set but appears short (< 32 chars). Use a longer random value.');
    } else {
      log('🔐 JWT_SECRET: configured ✓');
    }
    log('🔐 CONF_QR_SECRET: configured ✓');
    
    log("✅ Environment variables validated");

    // Initialize Firebase Admin SDK
    initializeFirebaseAdmin();

    // Test database connection before starting server, then initialise
    // the Postgres-backed rate-limit table (CREATE TABLE IF NOT EXISTS).
    try {
      const { pool } = await import("./db");
      const { initRateLimitTable } = await import("./utils/pg-rate-limiter");
      const client = await pool.connect();
      await client.query('SELECT NOW()');
      client.release();
      log("Database connection test successful");
      // Deliberately not awaited to avoid blocking startup if Postgres is slow;
      // initRateLimitTable() sets its own internal `tableReady` flag when done.
      initRateLimitTable().catch((e: any) =>
        console.error("[STARTUP] Rate-limit table init error:", e?.message),
      );
    } catch (dbError) {
      throw new Error(`Database connection failed: ${dbError}`);
    }

    // Enhanced port configuration for Cloud Run deployment
    const port = parseInt(process.env.PORT || "5000", 10);
    
    // Validate port configuration
    if (isNaN(port) || port < 1 || port > 65535) {
      throw new Error(`Invalid port configuration: ${process.env.PORT}. Port must be a number between 1-65535.`);
    }
    
    log(`🌐 Server will bind to 0.0.0.0:${port}`);
    
    // Add health check endpoint for Cloud Run (BEFORE Vite setup)
    app.get('/health', (_req, res) => {
      // SECURITY: do not expose internal port or environment name.
      // Minimal response sufficient for Cloud Run / load-balancer probes.
      res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
    });

    const server = await registerRoutes(app);

    // importantly only setup vite in development and after
    // setting up all the other routes so the catch-all route
    // doesn't interfere with the other routes
    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    // Error handlers must be mounted AFTER Vite/static serving
    // so they don't intercept frontend routes
    app.use(notFoundHandler);
    app.use(errorHandler);

    // Use standard Express listen method for better Cloud Run compatibility
    const server_instance = server.listen(port, "0.0.0.0", () => {
      log(`✅ Server successfully started on 0.0.0.0:${port}`);
      log(`🌍 Environment: ${process.env.NODE_ENV || "production"}`);
      log(`💾 Database: ${process.env.DATABASE_URL ? "Connected" : "Not configured"}`);
      log(`🔐 Session: ${process.env.SESSION_SECRET ? "Secured" : "Using default key"}`);
      log(`📊 Health check available at /health`);

      // Refresh permitted Lancing sources in the background; student requests
      // consume stored, verified records and never scrape a source themselves.
      setTimeout(() => {
        import("./lancing-ai").then(({ warmAllCaches }) => {
          log("Lancing source refresh started (background)…");
          warmAllCaches()
            .then(() => log("Lancing source refresh complete"))
            .catch((e: any) => log(`Lancing source refresh error: ${e?.message || e}`));
        }).catch(() => {});
      }, 3000);

      // Check every three hours; each approved source's own refresh interval
      // gates outbound requests (Himalayas jobs and internships: 12 hours).
      import("node-cron").then((cron) => {
        cron.default.schedule("0 */3 * * *", () => {
          import("./lancing-ai").then(({ warmAllCaches }) => {
            log("[Cron] Lancing source refresh started…");
            warmAllCaches()
              .then(() => log("[Cron] Lancing source refresh complete"))
              .catch((e: any) => log(`[Cron] Lancing source refresh error: ${e?.message || e}`));
          }).catch(() => {});
        });
        log("Lancing three-hour source refresh check scheduled");
      }).catch(() => {});
    });

    // Handle server startup errors
    server_instance.on('error', (err: any) => {
      if (err.code === 'EADDRINUSE') {
        log(`❌ Port ${port} is already in use`);
      } else if (err.code === 'EACCES') {
        log(`❌ Permission denied for port ${port}`);
      } else {
        log(`❌ Server error: ${err.message}`);
      }
      throw err;
    });

    // Graceful shutdown handling for Cloud Run
    const gracefulShutdown = (signal: string) => {
      log(`${signal} received, shutting down gracefully`);
      server_instance.close((err) => {
        if (err) {
          log(`Error during server close: ${err.message}`);
          process.exit(1);
        } else {
          log('Server closed successfully');
          process.exit(0);
        }
      });
      
      // Force close after 10 seconds
      setTimeout(() => {
        log('Force closing server after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    process.on('uncaughtException', (err) => {
      log(`Uncaught exception: ${err.message}`);
      if (!err.message?.includes('ECONNRESET') && !err.message?.includes('EPIPE')) {
        process.exit(1);
      }
    });

    process.on('unhandledRejection', (reason: any) => {
      log(`Unhandled rejection: ${reason?.message || reason}`);
    });

  } catch (error) {
    log(`Failed to start server: ${error}`);
    process.exit(1);
  }
})();
