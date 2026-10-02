import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { storage } from "./storage";
import { insertUserSchema, insertProductSchema, insertCartSchema, insertOrderSchema, insertOrderItemSchema, insertBuyerRequestSchema, insertStudentProfileSchema, insertProjectSchema } from "@shared/schema";
import { z, ZodError } from "zod";
import { initiatePayUPayment, handlePaymentSuccess, handlePaymentFailure, getPayUConfig, consumeVerifiedTransaction } from "./payu";
import { achievementService } from "./achievement-service";
import { emailService } from "./emailService";
import { deliveryScheduler } from "./deliveryScheduler";
import { uploadFileToFirebase, deleteFileFromFirebase, isFirebaseStorageConfigured } from "./firebase-storage";
import "./types/session";
import authHybridRoutes from "./routes/auth-hybrid";
import enhancedAuthRoutes from "./routes/enhanced-auth";
import firebaseAuthRoutes, { isUniqueConstraintError } from "./routes/firebase-auth";
import collabSocialRoutes from "./routes/collab-social";
import collabElectionsRoutes from "./routes/collab-elections";
import collabConnectionsRoutes from "./routes/collab-connections";
import lancingRoutes from "./routes/lancing";
import lancingAdminRoutes from "./routes/lancing-admin";
import lancingAiRoutes from "./routes/lancing-ai";
import lancingApplyRoutes from "./routes/lancing-apply";
import lancingSureShotRoutes from "./routes/lancing-sure-shot";
import careerCompassRoutes from "./routes/career-compass";
import codingArenaRoutes from "./routes/coding-arena";
import institutionalRoadmapRoutes from "./routes/institutional-roadmap";
import placementReadinessRoutes from "./routes/placement-readiness";
import placementCellRoutes from "./routes/placement-cell";
import assessmentRoutes from "./routes/assessments";
import attendanceRoutes from "./routes/attendance";
import collabAdminRoutes from "./routes/collab-admin";
import competitionsRoutes from "./routes/competitions";
import hastechRoutes from "./routes/hastech";
import natConfRoutes from "./routes/nat-conf";
import netxRoutes from "./routes/netx";
import { rateLimitMiddleware } from "./middleware/rate-limiter";
import { requireAdmin } from "./middleware/security";
import { admin as firebaseAdmin } from "./firebase-admin";

import { hasDangerousExtension, ALLOWED_MIME_TYPES, strictFileFilter, verifyMagicBytes } from './utils/upload-filter';
export { verifyMagicBytes };

// Configure multer for file uploads with strict allow-listing.
// Limits are intentionally conservative: 50MB × 10 files would allow a single
// request to spike 500MB of RAM, crashing the process under load.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB per file (was 50MB)
    files: 5,                   // Max 5 files per request (was 10)
    fields: 20,
    fieldSize: 2 * 1024 * 1024,
    fieldNameSize: 200,
  },
  fileFilter: strictFileFilter,
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Serve Object Storage files (profile pictures, etc.)
  app.get("/objects/*", async (req: Request, res: Response) => {
    try {
      const { objectStorage } = await import('./objectStorage');
      const objectPath = req.path; // e.g., /objects/profile-pictures/uuid
      const file = await objectStorage.getObjectEntityFile(objectPath);
      await objectStorage.downloadObject(file, res);
    } catch (error: any) {
      if (error.message === 'Object not found') {
        return res.status(404).json({ error: 'File not found' });
      }
      res.status(500).json({ error: 'Failed to serve file' });
    }
  });

  // User routes
  app.post("/api/register", rateLimitMiddleware.auth, async (req: Request, res: Response) => {
    try {
      // SECURITY: never trust client-supplied role / privileged fields on
      // registration. Strip them before parsing so the schema default applies.
      const { role: _ignoredRole, ...safeBody } = (req.body || {}) as Record<string, unknown>;
      const userData = insertUserSchema.parse(safeBody);
      
      // Check if username already exists
      const existingUserByUsername = await storage.getUserByUsername(userData.username);
      if (existingUserByUsername) {
        return res.status(400).json({ message: "Username already exists" });
      }
      
      // Check if email already exists
      const existingUserByEmail = await storage.getUserByEmail(userData.email);
      if (existingUserByEmail) {
        return res.status(400).json({ message: "Email already exists" });
      }
      
      // Hash password before storing
      const hashedPassword = await bcrypt.hash(userData.password || "", 10);
      const user = await storage.createUser({ ...userData, password: hashedPassword });
      
      // Initialize user stats and achievements
      await achievementService.initializeUserStats(user.id);
      
      // Create notification for admin
      await storage.createNotification({
        type: "signup",
        message: `New user registered: ${user.username} (${user.email}) - Phone: ${user.phone}`,
        userId: user.id
      });
      
      // Create persistent session for new user (7 days expiry)
      req.session.userId = user.id;
      req.session.loginTime = new Date().toISOString();
      
      // Configure session for persistence — SameSite=None+Secure so the
      // cookie is sent in cross-origin iframe contexts (Replit preview).
      req.session.cookie.maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
      req.session.cookie.secure = true;
      req.session.cookie.httpOnly = true;
      req.session.cookie.sameSite = 'none';
      
      // Save session explicitly, then return signed session token so the
      // client can fall back to header-based auth when cookies are blocked
      // (cross-origin iframe / Chrome third-party cookie blocking).
      req.session.save(async (err) => {
        if (err) console.error('Session save error (register):', err);
        const sig = await import('cookie-signature');
        const sessionToken = sig.sign(req.sessionID, process.env.SESSION_SECRET!);
        const { password, ...userWithoutPassword } = user;
        res.status(201).json({ ...userWithoutPassword, sessionToken });
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Invalid user data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to register user" });
    }
  });
  
  app.post("/api/login", rateLimitMiddleware.auth, async (req: Request, res: Response) => {
    try {
      const loginSchema = z.object({
        username: z.string().min(1),
        password: z.string().min(1)
      });
      
      const { username, password } = loginSchema.parse(req.body);
      
      const user = await storage.getUserByUsername(username);
      
      if (!user || !user.password) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      
      // Create persistent session (7 days expiry)
      req.session.userId = user.id;
      req.session.loginTime = new Date().toISOString();
      
      // Configure session for persistence — SameSite=None+Secure so the
      // cookie is sent in cross-origin iframe contexts (Replit preview).
      req.session.cookie.maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
      req.session.cookie.secure = true;
      req.session.cookie.httpOnly = true;
      req.session.cookie.sameSite = 'none';
      
      // Save session, then return signed session token so the client can
      // fall back to header-based auth when cookies are blocked
      // (cross-origin iframe / Chrome third-party cookie blocking).
      req.session.save(async (err) => {
        if (err) console.error('Session save error:', err);
        const sig = await import('cookie-signature');
        const sessionToken = sig.sign(req.sessionID, process.env.SESSION_SECRET!);
        const { password: userPassword, ...userWithoutPassword } = user;
        res.status(200).json({ ...userWithoutPassword, sessionToken });
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  // Google Sign-In for Marketplace
  // Reuses the same Firebase auth instance as Collab/Lancing. Accepts a
  // Firebase ID token from `signInWithPopup(GoogleAuthProvider)` on the
  // client, verifies it server-side via firebase-admin, finds-or-creates
  // the user in the central PostgreSQL `users` table (deduped by Firebase
  // UID first, email second), and establishes the marketplace session.
  app.post("/api/auth/google", rateLimitMiddleware.auth, async (req: Request, res: Response) => {
    try {
      const schema = z.object({ firebaseIdToken: z.string().min(10) });
      const { firebaseIdToken } = schema.parse(req.body);

      const decoded = await firebaseAdmin.auth().verifyIdToken(firebaseIdToken);
      const email = decoded.email;
      if (!email) {
        return res.status(400).json({ message: "Google account has no email" });
      }

      // Dedupe: Firebase UID first, then email.
      let user = await storage.getUserByFirebaseUid(decoded.uid);
      if (!user) {
        user = await storage.getUserByEmail(email);
      }

      if (!user) {
        // Create marketplace user from Google profile. Username must be unique
        // — derive from email prefix and add a numeric suffix on collision.
        // Password is left null because this is a Firebase-only account.
        const baseUsername = (decoded.name || email.split("@")[0])
          .replace(/[^a-zA-Z0-9_]/g, "")
          .slice(0, 24) || `user${Date.now().toString(36)}`;
        let candidate = baseUsername;
        let suffix = 0;
        while (await storage.getUserByUsername(candidate)) {
          suffix += 1;
          candidate = `${baseUsername}${suffix}`;
          if (suffix > 50) {
            candidate = `${baseUsername}${Math.random().toString(36).slice(2, 8)}`;
            break;
          }
        }

        try {
          user = await storage.createUser({
            uid: decoded.uid,
            username: candidate,
            email,
            phone: null as any,
            password: null as any,
            role: "student",
          } as any);
        } catch (error) {
          if (!isUniqueConstraintError(error)) throw error;

          // Another provider callback won the insert race. Re-read by both
          // authoritative identity keys and continue only for this same
          // Firebase account; unrelated unique failures remain errors.
          user = await storage.getUserByFirebaseUid(decoded.uid);
          if (!user) user = await storage.getUserByEmail(email);
          if (!user) throw error;
          if (user.uid && user.uid !== decoded.uid) {
            return res.status(409).json({ message: "Google account is linked to another user" });
          }
        }
      }

      // Establish marketplace session
      req.session.userId = user.id;
      req.session.loginTime = new Date().toISOString();
      req.session.cookie.maxAge = 7 * 24 * 60 * 60 * 1000;
      req.session.cookie.secure = true;
      req.session.cookie.httpOnly = true;
      req.session.cookie.sameSite = "none";
      req.session.save(async (err) => {
        if (err) console.error("Session save error (google):", err);
        const sig = await import('cookie-signature');
        const sessionToken = sig.sign(req.sessionID, process.env.SESSION_SECRET!);
        const { password: _pw, ...userWithoutPassword } = user as any;
        res.status(200).json({
          ...userWithoutPassword,
          photoURL: decoded.picture || null,
          displayName: decoded.name || null,
          sessionToken,
        });
      });
    } catch (error: any) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Invalid request" });
      }
      console.error("Google sign-in error:", error?.message || error);
      return res.status(401).json({ message: "Google sign-in failed" });
    }
  });

  // Password Reset - Request reset email
  app.post("/api/forgot-password", rateLimitMiddleware.passwordReset, async (req: Request, res: Response) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }
      
      // Find user by email
      const user = await storage.getUserByEmail(email);
      
      // Always return success to prevent email enumeration attacks
      if (!user) {
        return res.status(200).json({ 
          message: "If an account with that email exists, a password reset link has been sent." 
        });
      }
      
      // Generate secure reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes from now
      
      // Store token in database
      await storage.createPasswordResetToken({
        userId: user.id,
        token: resetToken,
        expiresAt: expiresAt
      });
      
      // Generate reset link - use request host for flexibility
      const protocol = req.headers['x-forwarded-proto'] || 'https';
      const host = req.headers.host || 'studentxchange.in';
      const resetLink = `${protocol}://${host}/reset-password?token=${resetToken}`;
      
      // Send email
      await emailService.sendPasswordResetEmail(
        user.email,
        user.username,
        resetToken,
        resetLink
      );
      
      res.status(200).json({ 
        message: "If an account with that email exists, a password reset link has been sent." 
      });
    } catch (error) {
      console.error('Forgot password error:', error);
      res.status(500).json({ message: "Failed to process password reset request" });
    }
  });

  // Password Reset - Verify token and reset password
  app.post("/api/reset-password", rateLimitMiddleware.passwordReset, async (req: Request, res: Response) => {
    try {
      const { token, newPassword } = req.body;
      
      if (!token || !newPassword) {
        return res.status(400).json({ message: "Token and new password are required" });
      }
      
      if (newPassword.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters" });
      }
      
      // Find valid token
      const resetToken = await storage.getPasswordResetToken(token);
      
      if (!resetToken) {
        return res.status(400).json({ message: "Invalid or expired reset link" });
      }
      
      if (resetToken.used) {
        return res.status(400).json({ message: "This reset link has already been used" });
      }
      
      if (new Date() > new Date(resetToken.expiresAt)) {
        return res.status(400).json({ message: "This reset link has expired" });
      }
      
      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      
      // Update user password
      await storage.updateUserPassword(resetToken.userId, hashedPassword);
      
      // Mark token as used
      await storage.markPasswordResetTokenUsed(resetToken.id);

      // SECURITY: revoke all existing sessions for this user so a hijacked
      // session cannot continue to be used after the password is changed
      try {
        const { pool } = await import("./db");
        await pool.query(
          "DELETE FROM session WHERE (sess::jsonb)->>'userId' = $1",
          [String(resetToken.userId)]
        );
      } catch (sessionErr) {
        console.warn('[reset-password] Could not clear user sessions:', sessionErr);
      }

      res.status(200).json({ message: "Password has been reset successfully" });
    } catch (error) {
      console.error('Reset password error:', error);
      res.status(500).json({ message: "Failed to reset password" });
    }
  });

  // Verify reset token (for frontend validation)
  app.get("/api/verify-reset-token", async (req: Request, res: Response) => {
    try {
      const token = req.query.token as string;
      
      if (!token) {
        return res.status(400).json({ valid: false, message: "Token is required" });
      }
      
      const resetToken = await storage.getPasswordResetToken(token);
      
      if (!resetToken || resetToken.used || new Date() > new Date(resetToken.expiresAt)) {
        return res.status(200).json({ valid: false, message: "Invalid or expired reset link" });
      }
      
      res.status(200).json({ valid: true });
    } catch (error) {
      console.error('Verify reset token error:', error);
      res.status(500).json({ valid: false, message: "Failed to verify token" });
    }
  });

  // Direct Password Reset - only for already-authenticated users changing their own password.
  // SECURITY: requires a live session; derives userId from session (never trusts req.body userId).
  // Email in body is only used to confirm the user is resetting their own account.
  app.post("/api/direct-password-reset", rateLimitMiddleware.passwordReset, async (req: Request, res: Response) => {
    try {
      // Must be logged in — unauthenticated callers are rejected immediately.
      if (!req.session?.userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const { email, newPassword } = req.body;
      
      if (!email || !newPassword) {
        return res.status(400).json({ message: "Email and new password are required" });
      }
      
      if (newPassword.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters" });
      }

      // SECURITY: look up the account by session userId (not by the email from the body).
      // Then verify the supplied email matches — this prevents IDOR where an authenticated
      // user passes someone else's email to change a different account's password.
      const sessionUser = await storage.getUser(req.session.userId);
      if (!sessionUser) {
        return res.status(401).json({ message: "Authentication required" });
      }
      if (sessionUser.email.toLowerCase() !== String(email).toLowerCase()) {
        return res.status(403).json({ message: "Email does not match the authenticated account" });
      }
      
      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      
      // Update user password
      await storage.updateUserPassword(sessionUser.id, hashedPassword);

      // Revoke all other sessions for this account; keep current session so
      // the user stays logged in after their own password change.
      try {
        const currentSid = req.sessionID;
        const { pool } = await import("./db");
        await pool.query(
          "DELETE FROM session WHERE (sess::jsonb)->>'userId' = $1 AND sid != $2",
          [String(sessionUser.id), currentSid]
        );
      } catch (sessionErr) {
        console.warn('[direct-password-reset] Could not clear other sessions:', sessionErr);
      }

      res.status(200).json({ message: "Password has been reset successfully" });
    } catch (error) {
      console.error('Direct password reset error:', error);
      res.status(500).json({ message: "Failed to reset password" });
    }
  });

  // Student Profile routes
  app.get("/api/student-profile", async (req: Request, res: Response) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const profile = await storage.getStudentProfile(req.session.userId);
      if (!profile) {
        return res.status(404).json({ message: "Student profile not found" });
      }

      res.json(profile);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/student-profile", async (req: Request, res: Response) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      // Check if profile already exists
      const existingProfile = await storage.getStudentProfile(req.session.userId);
      if (existingProfile) {
        return res.status(400).json({ message: "Student profile already exists" });
      }

      const profileData = insertStudentProfileSchema.parse({
        ...req.body,
        userId: req.session.userId
      });

      const profile = await storage.createStudentProfile(profileData);
      res.status(201).json(profile);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ message: "Validation error", errors: error.errors });
      } else {
        res.status(500).json({ message: "Internal server error" });
      }
    }
  });

  app.put("/api/student-profile", async (req: Request, res: Response) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      // Parse and exclude userId and other immutable fields for security
      const { userId, ...safeProfileData } = insertStudentProfileSchema.partial().parse(req.body);
      const updatedProfile = await storage.updateStudentProfile(req.session.userId, safeProfileData);

      if (!updatedProfile) {
        return res.status(404).json({ message: "Student profile not found" });
      }

      res.json(updatedProfile);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ message: "Validation error", errors: error.errors });
      } else {
        res.status(500).json({ message: "Internal server error" });
      }
    }
  });

  app.get("/api/student-profiles/search", async (req: Request, res: Response) => {
    try {
      const { query } = req.query;
      if (!query || typeof query !== "string") {
        return res.status(400).json({ message: "Query parameter required" });
      }

      const profiles = await storage.searchStudentProfiles(query);
      res.json(profiles);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/student-profiles/by-skills", async (req: Request, res: Response) => {
    try {
      const { skills } = req.query;
      if (!skills || typeof skills !== "string") {
        return res.status(400).json({ message: "Skills parameter required (comma-separated)" });
      }

      const skillsArray = skills.split(',').map(skill => skill.trim()).filter(skill => skill.length > 0);
      const profiles = await storage.getStudentsBySkills(skillsArray);
      res.json(profiles);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/student-profiles", async (req: Request, res: Response) => {
    try {
      const profiles = await storage.getAllStudentProfiles();
      res.json(profiles);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/student-profile", async (req: Request, res: Response) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const deleted = await storage.deleteStudentProfile(req.session.userId);
      if (!deleted) {
        return res.status(404).json({ message: "Student profile not found" });
      }

      res.status(200).json({ message: "Student profile deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Self-service account deletion — authenticated users only
  // Removes all personal data: user row (cascades to carts, orders, products),
  // sessions, and student profile. Irreversible.
  app.delete("/api/account", async (req: Request, res: Response) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      const userId = req.session.userId;

      // Delete student profile if exists (non-fatal if not found)
      await storage.deleteStudentProfile(userId).catch(() => {});

      // Destroy all sessions for this user
      try {
        await new Promise<void>((resolve, reject) => {
          (req.sessionStore as any).db?.query(
            "DELETE FROM session WHERE (sess::jsonb)->>'userId' = $1",
            [String(userId)],
            (err: Error) => (err ? reject(err) : resolve())
          );
        });
      } catch { /* pg session cleanup best-effort */ }

      // Delete the user row (cascades to carts etc.)
      const deleted = await storage.deleteUser(userId);
      if (!deleted) {
        return res.status(404).json({ message: "Account not found" });
      }

      // Destroy the current session cookie
      req.session.destroy(() => {
        res.clearCookie("connect.sid");
        res.status(200).json({ message: "Account deleted successfully" });
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete account" });
    }
  });

  // Authentication status route
  app.get("/api/user", async (req: Request, res: Response) => {
    try {
      if (!req.session.userId) {
        // This endpoint is an auth-state probe used on public pages. A guest is
        // a valid state, so return null without generating a noisy browser 401.
        return res.status(200).json(null);
      }
      
      const user = await storage.getUser(req.session.userId);
      if (!user) {
        req.session.destroy((err) => {
        });
        return res.status(200).json(null);
      }
      
      // Don't return the password
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      res.status(500).json({ message: "Failed to get user" });
    }
  });
  
  // Logout route
  app.post("/api/logout", async (req: Request, res: Response) => {
    try {
      req.session.destroy((err) => {
        if (err) {
          return res.status(500).json({ message: "Failed to logout" });
        }
        // Clear all session cookies and ensure proper logout
        res.clearCookie('connect.sid', {
          path: '/',
          httpOnly: true,
          secure: true
        });
        // Aggressive cache-control headers to prevent any caching
        res.set({
          'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0, private',
          'Pragma': 'no-cache',
          'Expires': 'Thu, 01 Jan 1970 00:00:00 GMT',
          'Last-Modified': new Date().toUTCString(),
          'ETag': 'logout-' + Date.now()
        });
        res.json({ 
          message: "Logged out successfully",
          timestamp: new Date().toISOString()
        });
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to logout" });
    }
  });
  
  // Product routes
  app.get("/api/products", async (req: Request, res: Response) => {
    try {
      const category = req.query.category as string;
      const search = req.query.search as string;
      
      let products;
      
      if (category) {
        products = await storage.getProductsByCategory(category);
        // Filter out zero quantity products from category results
        products = products.filter(p => p.quantity > 0);
      } else if (search) {
        products = await storage.searchProducts(search);
        // Filter out zero quantity products from search results
        products = products.filter(p => p.quantity > 0);
      } else {
        // Use new method that only returns available products
        products = await storage.getAvailableProducts();
      }
      
      res.status(200).json(products);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch products" });
    }
  });

  app.get("/api/products/seller/:sellerId", async (req: Request, res: Response) => {
    try {
      const sellerId = parseInt(req.params.sellerId);
      const products = await storage.getProductsBySeller(sellerId);
      res.json(products);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch seller products" });
    }
  });
  
  app.get("/api/products/:id", async (req: Request, res: Response) => {
    try {
      const productId = parseInt(req.params.id);
      const product = await storage.getProduct(productId);
      
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      
      res.status(200).json(product);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch product" });
    }
  });
  
  app.post("/api/products", rateLimitMiddleware.upload, upload.array('files', 10), async (req: Request, res: Response) => {
    try {
      // sellerId is optional - use session user if logged in, otherwise null (guest seller)
      const userId = req.session?.userId || null;

      const uploadedFileUrls: string[] = [];
      const imageUrls: string[] = [];
      
      
      // Process uploaded files
      if (!req.files || !Array.isArray(req.files)) {
        return res.status(400).json({ message: "No files uploaded" });
      }
      
      
      if (req.files && Array.isArray(req.files)) {
        for (const file of req.files) {
          try {
            let publicUrl: string;
            
            // Upload to Firebase Storage
            try {
                  publicUrl = await uploadFileToFirebase(
                file.buffer,
                file.originalname,
                'products'
              );
            } catch (firebaseError) {
              console.error('Firebase Storage upload failed:', firebaseError);
              return res.status(500).json({ 
                message: "Failed to upload image to cloud storage. Please try again.",
                error: firebaseError instanceof Error ? firebaseError.message : 'Unknown error'
              });
            }
            
            // Categorize files by type and log success
            if (file.mimetype.startsWith('image/')) {
              imageUrls.push(publicUrl);
            } else {
              uploadedFileUrls.push(publicUrl);
            }
          } catch (uploadError) {
            console.error('Upload error:', uploadError);
            return res.status(500).json({ message: "File upload failed. Please try again." });
          }
        }
      }

      // Prepare product data
      const productData = {
        title: req.body.title,
        description: req.body.description,
        price: req.body.price || "0",
        originalPrice: req.body.originalPrice || null,
        condition: req.body.condition,
        category: req.body.category,
        quantity: req.body.quantity ? parseInt(req.body.quantity) : 1,
        images: imageUrls,
        files: uploadedFileUrls,
        sellerWhatsapp: req.body.sellerWhatsapp || null,
        sellerContactName: req.body.sellerContactName || null,
        sellerContactEmail: req.body.sellerContactEmail || null,
        pickupAddress: req.body.pickupAddress || null,
        pickupCity: req.body.pickupCity || null,
        pickupState: req.body.pickupState || null,
        pickupPincode: req.body.pickupPincode || null,
        pickupInstitution: req.body.institute || null,
      };
      
      const product = await storage.createProduct(productData, userId);
      
      // Create notification for admin only when a registered user posts
      if (userId) {
        try {
          await storage.createNotification({
            type: "product_listed",
            message: `New product listed: "${product.title}" by ${req.body.sellerContactName || 'Unknown'} (ID: ${userId})`,
            productId: product.id,
            userId: userId
          });
        } catch (_) {}
      }
      
      res.status(201).json(product);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Invalid product data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create product" });
    }
  });
  
  app.put("/api/products/:id", async (req: Request, res: Response) => {
    try {
      const productId = parseInt(req.params.id);
      const productData = req.body;
      const userId = req.session.userId;
      
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const existingProduct = await storage.getProduct(productId);
      if (!existingProduct) {
        return res.status(404).json({ message: "Product not found" });
      }
      
      // Check if user owns this product
      if (existingProduct.sellerId !== userId) {
        return res.status(403).json({ message: "Not authorized to update this product" });
      }
      
      const updatedProduct = await storage.updateProduct(productId, productData);
      
      if (updatedProduct) {
        // Create notification for admin
        await storage.createNotification({
          type: "product_updated",
          message: `Product "${updatedProduct.title}" updated by seller (ID: ${updatedProduct.sellerId})`,
          productId: updatedProduct.id,
          userId: updatedProduct.sellerId
        });
      }
      
      res.status(200).json(updatedProduct);
    } catch (error) {
      res.status(500).json({ message: "Failed to update product" });
    }
  });
  
  app.delete("/api/products/:id", async (req: Request, res: Response) => {
    try {
      const productId = parseInt(req.params.id);
      const userId = req.session.userId;
      
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const existingProduct = await storage.getProduct(productId);
      if (!existingProduct) {
        return res.status(404).json({ message: "Product not found" });
      }
      
      // Check if user owns this product
      if (existingProduct.sellerId !== userId) {
        return res.status(403).json({ message: "Not authorized to delete this product" });
      }
      
      // Create notification for admin before deletion
      await storage.createNotification({
        type: "product_deleted",
        message: `Product "${existingProduct.title}" deleted by seller (ID: ${existingProduct.sellerId})`,
        productId: existingProduct.id,
        userId: existingProduct.sellerId
      });
      
      await storage.deleteProduct(productId);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete product" });
    }
  });

  // Buyer Request routes
  app.get("/api/buyer-requests", async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId;
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const requests = await storage.getBuyerRequests();
      res.status(200).json(requests);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch buyer requests" });
    }
  });

  app.post("/api/buyer-requests", async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId;
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const requestData = insertBuyerRequestSchema.parse(req.body);
      const buyerRequest = await storage.createBuyerRequest({
        ...requestData,
        requesterUserId: userId
      });

      res.status(201).json(buyerRequest);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create buyer request" });
    }
  });

  app.put("/api/buyer-requests/:id/status", requireAdmin, async (req: Request, res: Response) => {
    try {
      const requestId = parseInt(req.params.id);
      const { status } = req.body;

      if (!['open', 'fulfilled', 'closed'].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }

      const updatedRequest = await storage.updateBuyerRequestStatus(requestId, status);
      if (!updatedRequest) {
        return res.status(404).json({ message: "Buyer request not found" });
      }

      res.status(200).json(updatedRequest);
    } catch (error) {
      res.status(500).json({ message: "Failed to update buyer request status" });
    }
  });
  
  // Cart routes
  app.get("/api/cart/:userId", async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      if (!req.session?.userId || req.session.userId !== userId) {
        return res.status(403).json({ message: "Not authorized to view this cart" });
      }
      const cartItems = await storage.getCartByUser(userId);
      
      // Get full product details for each cart item
      const cartWithProducts = await Promise.all(
        cartItems.map(async (item) => {
          const product = await storage.getProduct(item.productId);
          return {
            ...item,
            product
          };
        })
      );
      
      res.status(200).json(cartWithProducts);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch cart" });
    }
  });
  
  app.post("/api/cart", async (req: Request, res: Response) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      // SECURITY: Identity must come from session, never from request body.
      const { userId: _ignoredUserId, ...rest } = req.body || {};
      const cartItemData = insertCartSchema.parse({
        ...rest,
        userId: req.session.userId,
      });
      
      // Make sure the product exists
      const product = await storage.getProduct(cartItemData.productId);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      
      const cartItem = await storage.addToCart(cartItemData);
      
      // Return the cart item with product details
      res.status(201).json({
        ...cartItem,
        product
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Invalid cart data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to add to cart" });
    }
  });
  
  app.put("/api/cart/:id", async (req: Request, res: Response) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      const cartId = parseInt(req.params.id);
      const { quantity } = req.body;
      
      if (!quantity || isNaN(quantity) || quantity < 1) {
        return res.status(400).json({ message: "Valid quantity is required" });
      }

      // SECURITY: Verify the cart item belongs to the authenticated user.
      const userCart = await storage.getCartByUser(req.session.userId);
      if (!userCart.some((item) => item.id === cartId)) {
        return res.status(403).json({ message: "Not authorized to modify this cart item" });
      }
      
      const updatedCartItem = await storage.updateCartItemQuantity(cartId, quantity);
      
      if (!updatedCartItem) {
        return res.status(404).json({ message: "Cart item not found" });
      }
      
      // Get product details
      const product = await storage.getProduct(updatedCartItem.productId);
      
      res.status(200).json({
        ...updatedCartItem,
        product
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to update cart item" });
    }
  });
  
  app.delete("/api/cart/:id", async (req: Request, res: Response) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      const cartId = parseInt(req.params.id);

      // SECURITY: Verify the cart item belongs to the authenticated user.
      const userCart = await storage.getCartByUser(req.session.userId);
      if (!userCart.some((item) => item.id === cartId)) {
        return res.status(403).json({ message: "Not authorized to modify this cart item" });
      }

      await storage.removeFromCart(cartId);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to remove from cart" });
    }
  });
  
  app.delete("/api/cart/user/:userId", async (req: Request, res: Response) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      const userId = parseInt(req.params.userId);
      // SECURITY: Users may only clear their own cart.
      if (req.session.userId !== userId) {
        return res.status(403).json({ message: "Not authorized to clear this cart" });
      }
      await storage.clearCart(userId);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to clear cart" });
    }
  });
  
  // Order routes
  app.get("/api/orders/:userId", async (req: Request, res: Response) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      const userId = parseInt(req.params.userId);
      // SECURITY: Users may only read their own orders (admins use /api/admin/orders).
      if (req.session.userId !== userId) {
        return res.status(403).json({ message: "Not authorized to view these orders" });
      }
      const orders = await storage.getOrdersByUser(userId);
      
      // Get order items for each order
      const ordersWithItems = await Promise.all(
        orders.map(async (order) => {
          const items = await storage.getOrderItems(order.id);
          
          // Get products for each order item
          const itemsWithProducts = await Promise.all(
            items.map(async (item) => {
              const product = await storage.getProduct(item.productId);
              return {
                ...item,
                product
              };
            })
          );
          
          return {
            ...order,
            items: itemsWithProducts
          };
        })
      );
      
      res.status(200).json(ordersWithItems);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch orders" });
    }
  });

  // Test endpoint for order creation debugging
  
  app.post("/api/orders", async (req: Request, res: Response) => {
    try {
      // SECURITY: orders MUST be created for the authenticated session user.
      // The checkout / cart flows in the client (checkout-page.tsx,
      // cart-page.tsx) only run for logged-in users, so requiring a session
      // here does not break the PayU or COD paths — it just stops an
      // unauthenticated caller from forging orders against arbitrary
      // userIds, decrementing inventory, sending emails, etc.
      if (!req.session?.userId) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const userId = req.session.userId;

      const { 
        items, 
        paymentMethod,
        customerName,
        customerPhone,
        deliveryAddress,
        deliveryCity,
        deliveryState,
        deliveryPincode,
        deliveryAddressType,
        deliveryInstitution
      } = req.body;
      
      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ message: "Items are required" });
      }

      // SECURITY: validate every item before it touches pricing or inventory
      // math. quantity must be a positive integer and productId must be a
      // positive integer. Without this, a caller could submit negative /
      // zero / fractional / string quantities to invert inventory or
      // reduce the computed total below the real price.
      for (const item of items) {
        const pid = Number(item?.productId);
        const qty = Number(item?.quantity);
        if (!Number.isInteger(pid) || pid < 1) {
          return res.status(400).json({ message: "Invalid productId in items" });
        }
        if (!Number.isInteger(qty) || qty < 1) {
          return res.status(400).json({ message: "Invalid quantity in items" });
        }
        item.productId = pid;
        item.quantity = qty;
      }

      // SECURITY: always recompute totals server-side from product prices.
      // Do NOT trust client-supplied totalAmount or commission — that would
      // allow an authenticated user to under-pay (or zero-out) any order.
      let finalTotalAmount = 0;
      for (const item of items) {
        const product = await storage.getProduct(item.productId);
        if (!product) {
          return res.status(404).json({ message: `Product with ID ${item.productId} not found` });
        }
        finalTotalAmount += parseFloat((product.price || 0).toString()) * item.quantity;
      }
      const finalCommission = storage.calculateCommission(finalTotalAmount);

      // SECURITY: derive order status from paymentMethod only — never accept
      // a client-supplied "paid" status. The transition to "paid" must
      // happen exclusively via the verified PayU callback path.
      const isCod = paymentMethod === "COD" || paymentMethod === "cod";
      const orderStatus = isCod ? "pending_cod" : "pending_payment";
      const finalPaymentMethod = isCod ? "cod" : "payu";

      // Create order. paymentId and the external orderId are set later by
      // the verified PayU callback, never trusted from the create-order
      // request body.
      const orderData = {
        userId,
        totalAmount: finalTotalAmount.toString(),
        commission: finalCommission.toString(),
        status: orderStatus,
        paymentMethod: finalPaymentMethod,
        paymentId: null,
        orderId: null,
        customerName,
        customerPhone,
        deliveryAddress,
        deliveryCity,
        deliveryState,
        deliveryPincode,
        deliveryAddressType,
        deliveryInstitution
      };
      
      const order = await storage.createOrder(orderData);
      
      const orderItems = await Promise.all(
        items.map(async (item: any) => {
          const product = await storage.getProduct(item.productId);
          if (!product) {
            throw new Error(`Product with ID ${item.productId} not found`);
          }
          
          // Check if enough quantity is available
          if (product.quantity < item.quantity) {
            throw new Error(`Not enough quantity available for product: ${product.title}`);
          }
          
          // Get seller details for comprehensive order tracking
          const seller = await storage.getUser(product.sellerId);
          
          const orderItemData = {
            orderId: order.id,
            productId: item.productId,
            quantity: item.quantity,
            price: (product.price || 0).toString()
          };
          
          // Update product quantity - critical for real-time inventory
          const newQuantity = product.quantity - item.quantity;
          await storage.updateProduct(item.productId, { quantity: newQuantity });
          
          
          // If quantity becomes 0, product will automatically disappear from browse view
          if (newQuantity === 0) {
          }
          
          return await storage.createOrderItem(orderItemData);
        })
      );
      
      const isPendingPayment = orderStatus === "pending_payment";

      if (!isPendingPayment) {
        await storage.clearCart(userId);

        try {
          const userStats = await storage.getUserStats(userId);
          if (userStats) {
            await storage.updateUserStats(userId, { 
              totalPurchases: userStats.totalPurchases + 1 
            });
          }
          await achievementService.checkAndUpdateAchievements(userId);
        } catch (error) {}

        const buyer = await storage.getUser(userId);

        for (const item of items) {
          const product = await storage.getProduct(item.productId);
          if (product) {
            const seller = await storage.getUser(product.sellerId);
            if (seller) {
              await storage.createNotification({
                type: "product_sold",
                message: `Your product "${product.title}" has been sold! Buyer: ${buyer?.username} (${buyer?.phone}). Order ID: ${order.id}`,
                userId: product.sellerId,
                orderId: order.id,
                productId: product.id
              });
              await storage.createNotification({
                type: "order",
                message: `New order placed: ${buyer?.username} ordered "${product.title}" from ${seller.username}. Order ID: ${order.id}`,
                userId: userId,
                orderId: order.id,
                productId: product.id
              });
            }
          }
        }

        if (buyer?.email) {
          try {
            const productsForEmail = await Promise.all(
              items.map(async (item: any) => {
                const product = await storage.getProduct(item.productId);
                const seller = await storage.getUser(product?.sellerId || 0);
                return {
                  title: product?.title || 'Unknown Product',
                  quantity: item.quantity,
                  price: parseFloat(product?.price?.toString() || "0"),
                  seller: seller?.username || 'Unknown Seller'
                };
              })
            );

            const deliveryAddressText = [
              deliveryAddress, deliveryCity, deliveryState, deliveryPincode
            ].filter(Boolean).join(', ');

            await emailService.sendTransactionConfirmation(
              buyer.email,
              buyer.username || customerName || 'Customer',
              `TXN-${order.id.toString().padStart(6, '0')}`,
              parseFloat(finalTotalAmount.toString()),
              parseFloat(finalCommission.toString()),
              productsForEmail,
              deliveryAddressText || 'Not provided'
            );

            deliveryScheduler.scheduleDeliveryReminder(
              order.id,
              buyer.email,
              buyer.username || customerName || 'Customer',
              `TXN-${order.id.toString().padStart(6, '0')}`
            );
          } catch (emailError) {}
        }
      }
      
      
      res.status(201).json({
        success: true,
        ...order,
        items: orderItems
      });
    } catch (error) {
      res.status(500).json({ 
        success: false,
        message: error instanceof Error ? error.message : "Failed to create order",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  
  app.put("/api/orders/:id/status", requireAdmin, async (req: Request, res: Response) => {
    try {
      const orderId = parseInt(req.params.id);
      const { status } = req.body;
      
      if (!status) {
        return res.status(400).json({ message: "Status is required" });
      }
      
      const updatedOrder = await storage.updateOrderStatus(orderId, status);
      
      if (!updatedOrder) {
        return res.status(404).json({ message: "Order not found" });
      }
      
      res.status(200).json(updatedOrder);
    } catch (error) {
      res.status(500).json({ message: "Failed to update order status" });
    }
  });
  
  // Delivery reminder endpoints
  app.get("/api/admin/delivery-reminders", requireAdmin, async (req: Request, res: Response) => {
    try {
      const reminders = deliveryScheduler.getScheduledReminders();
      res.json(reminders);
    } catch (error) {
      res.status(500).json({ error: "Failed to get delivery reminders" });
    }
  });

  app.post("/api/admin/trigger-delivery-check", requireAdmin, async (req: Request, res: Response) => {
    try {
      await deliveryScheduler.triggerReminderCheck();
      res.json({ success: true, message: "Delivery check triggered successfully" });
    } catch (error) {
      res.status(500).json({ error: "Failed to trigger delivery check" });
    }
  });

  // Admin revenue management
  app.get("/api/admin/revenue", requireAdmin, async (req: Request, res: Response) => {
    try {
      const totalRevenue = await storage.getTotalRevenue();
      res.json({ totalRevenue });
    } catch (error) {
      res.status(500).json({ error: "Failed to get revenue data" });
    }
  });

  app.post("/api/admin/reset-revenue", requireAdmin, async (req: Request, res: Response) => {
    try {
      const success = await storage.resetRevenue();
      if (success) {
        res.json({ success: true, message: "Platform fees reset to ₹0 - transaction records preserved" });
      } else {
        res.status(500).json({ error: "Failed to reset revenue" });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to reset revenue" });
    }
  });

  // Admin orders endpoint with enhanced details
  app.get("/api/admin/orders", requireAdmin, async (req: Request, res: Response) => {
    try {
      const orders = await storage.getAllOrders();
      
      // Enhance orders with buyer and seller details
      const enhancedOrders = await Promise.all(
        orders.map(async (order) => {
          const buyer = await storage.getUser(order.userId);
          const orderItems = await storage.getOrderItems(order.id);
          
          // Get product and seller details for each item
          const itemsWithDetails = await Promise.all(
            orderItems.map(async (item) => {
              const product = await storage.getProduct(item.productId);
              const seller = product ? await storage.getUser(product.sellerId) : null;
              
              return {
                ...item,
                product: product ? {
                  ...product,
                  sellerName: seller?.username,
                  sellerEmail: seller?.email,
                  sellerPhone: seller?.phone
                } : null
              };
            })
          );
          
          return {
            ...order,
            buyer: buyer ? {
              id: buyer.id,
              username: buyer.username,
              email: buyer.email,
              phone: buyer.phone
            } : null,
            items: itemsWithDetails
          };
        })
      );
      
      // Sort by creation date (newest first)
      enhancedOrders.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      
      res.json(enhancedOrders);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch orders" });
    }
  });

  // Admin users endpoint
  app.get("/api/admin/users", requireAdmin, async (req: Request, res: Response) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Admin transaction deletion
  app.delete("/api/admin/orders/:id", requireAdmin, async (req: Request, res: Response) => {
    try {
      const orderId = parseInt(req.params.id);
      const success = await storage.deleteOrder(orderId);
      
      if (success) {
        res.json({ success: true, message: "Transaction deleted successfully" });
      } else {
        res.status(404).json({ error: "Transaction not found" });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to delete transaction" });
    }
  });

  // Payment routes
  // SECURITY: stub removed — returning 501 instead of fake 200.
  // All payments go through PayU (/api/payu/pay) or Razorpay (/api/lancing/escrow).
  app.post("/api/create-payment-intent", rateLimitMiddleware.payment, (_req: Request, res: Response) => {
    return res.status(501).json({
      success: false,
      message: "Not implemented. Use the PayU or Razorpay payment flow.",
    });
  });
  
  // SECURITY: legacy stub. Previously this route trusted client-supplied
  // paymentId/orderId, set `verified = true` unconditionally and called
  // storage.updateOrderStatus(orderId, "paid") with no authentication and
  // no payment-gateway proof — i.e. anyone could mark any order paid.
  // The frontend never calls this endpoint (all PayU completion goes
  // through /api/payu/verify, which performs real signature verification).
  // The route is left in place but neutered so any caller gets a clear
  // 410 Gone instead of being able to forge order state.
  app.post("/api/verify-payment", rateLimitMiddleware.payment, async (_req: Request, res: Response) => {
    return res.status(410).json({
      success: false,
      message: "This endpoint is no longer supported. Use the verified PayU callback flow.",
    });
  });

  // File upload endpoint
  app.post("/api/upload", rateLimitMiddleware.upload, upload.array('files'), (req: Request, res: Response) => {
    try {
      if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
        return res.status(400).json({ message: "No files uploaded" });
      }

      // Return filenames that the frontend expects
      const filenames = req.files.map(file => file.filename);
      const urls = req.files.map(file => `/uploads/${file.filename}`);
      
      res.status(200).json({ 
        success: true, 
        filenames, // This is what the bulk upload form expects
        urls,
        message: `${req.files.length} files uploaded successfully`
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to upload files" });
    }
  });

  // File upload endpoint for STATETECH proposals, Collab Arena, and other uploads
  app.post("/api/upload/firebase", rateLimitMiddleware.upload, upload.single('file'), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      // Magic-bytes verification — declared MIME must match actual file content
      if (!verifyMagicBytes(req.file.buffer, req.file.mimetype)) {
        console.warn(`[SECURITY] Magic-bytes mismatch on upload. declaredMime=${req.file.mimetype} originalname=${req.file.originalname}`);
        return res.status(400).json({ message: "File contents do not match declared type" });
      }

      const folder = req.body.folder || 'uploads';
      
      try {
        const publicUrl = await uploadFileToFirebase(
          req.file.buffer,
          req.file.originalname,
          folder
        );
        
        res.status(200).json({ 
          success: true, 
          url: publicUrl,
          filename: req.file.originalname
        });
      } catch (uploadError) {
        console.error('Firebase Storage upload failed:', uploadError);
        res.status(500).json({ 
          message: "Failed to upload file to cloud storage",
          error: uploadError instanceof Error ? uploadError.message : 'Unknown error'
        });
      }
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({ message: "Failed to upload file" });
    }
  });

  // PayU routes — callbacks rate-limited to block replay/flood attacks
  app.post("/api/payu/pay", rateLimitMiddleware.payment, initiatePayUPayment);
  app.post("/api/payu/payment-success", rateLimitMiddleware.payment, handlePaymentSuccess);
  app.post("/api/payu/payment-failure", rateLimitMiddleware.payment, handlePaymentFailure);
  app.get("/api/payu/config", getPayUConfig);

  app.post("/api/payu/verify", rateLimitMiddleware.payment, async (req: Request, res: Response) => {
    try {
      const { txnid, mihpayid } = req.body;

      if (!txnid) {
        return res.status(400).json({ success: false, message: "Missing required field: txnid" });
      }

      const verifiedTxn = consumeVerifiedTransaction(txnid);
      if (!verifiedTxn) {
        console.error("[PAYU STAGE 4] Transaction not found in verified store:", txnid);
        return res.status(403).json({ success: false, message: "Payment not verified. This transaction was not confirmed by PayU." });
      }

      const existingOrder = await storage.getOrderByPaymentId(txnid);
      if (!existingOrder) {
        console.error("[PAYU STAGE 4] No order found with paymentId (txnid):", txnid);
        return res.status(404).json({ success: false, message: "Order not found for this transaction. Please contact support at 7039862086." });
      }

      if (existingOrder.status === "paid") {
        const orderItems = await storage.getOrderItems(existingOrder.id);
        return res.status(200).json({
          success: true,
          ...existingOrder,
          items: orderItems,
          alreadyPaid: true,
        });
      }

      if (existingOrder.status !== "pending_payment") {
        console.error("[PAYU STAGE 4] Order not in pending_payment status:", existingOrder.status, "orderId:", existingOrder.id);
        return res.status(400).json({ success: false, message: `Order is in '${existingOrder.status}' status, cannot update.` });
      }

      // SECURITY: defense-in-depth amount cross-check.
      // Even if the initiate step is somehow bypassed, the verified PayU amount
      // must match the stored order total (within ₹1 rounding tolerance).
      // This prevents any edge case where a ₹1 PayU payment marks a ₹10,000 order paid.
      const verifiedAmount = parseFloat(verifiedTxn.amount);
      const orderTotal = parseFloat(existingOrder.totalAmount.toString());
      if (Math.abs(verifiedAmount - orderTotal) > 1.0) {
        console.error(`[PAYU STAGE 4] Amount mismatch! Verified: ₹${verifiedAmount}, Order total: ₹${orderTotal}, orderId: ${existingOrder.id}`);
        return res.status(400).json({
          success: false,
          message: "Payment amount does not match order total. Please contact support.",
        });
      }

      const updatedOrder = await storage.updateOrder(existingOrder.id, {
        status: "paid",
        orderId: verifiedTxn.mihpayid || mihpayid || txnid,
      });

      if (!updatedOrder) {
        throw new Error("Failed to update order status to paid");
      }

      await storage.clearCart(existingOrder.userId);

      try {
        const userStats = await storage.getUserStats(existingOrder.userId);
        if (userStats) {
          await storage.updateUserStats(existingOrder.userId, {
            totalPurchases: userStats.totalPurchases + 1,
          });
        }
        await achievementService.checkAndUpdateAchievements(existingOrder.userId);
      } catch (_) {}

      const buyer = await storage.getUser(existingOrder.userId);
      const orderItems = await storage.getOrderItems(existingOrder.id);

      for (const item of orderItems) {
        const product = await storage.getProduct(item.productId);
        if (product) {
          const seller = await storage.getUser(product.sellerId);
          if (seller) {
            await storage.createNotification({
              type: "product_sold",
              message: `Your product "${product.title}" has been sold! Buyer: ${buyer?.username} (${buyer?.phone}). Order ID: ${updatedOrder.id}`,
              userId: product.sellerId,
              orderId: updatedOrder.id,
              productId: product.id,
            });
            await storage.createNotification({
              type: "order",
              message: `New order placed: ${buyer?.username} ordered "${product.title}" from ${seller.username}. Order ID: ${updatedOrder.id}`,
              userId: existingOrder.userId,
              orderId: updatedOrder.id,
              productId: product.id,
            });
          }
        }
      }

      if (buyer?.email) {
        try {
          const productsForEmail = await Promise.all(
            orderItems.map(async (item: any) => {
              const product = await storage.getProduct(item.productId);
              const seller = await storage.getUser(product?.sellerId || 0);
              return {
                title: product?.title || "Unknown Product",
                quantity: item.quantity,
                price: parseFloat(product?.price?.toString() || "0"),
                seller: seller?.username || "Unknown Seller",
              };
            })
          );
          const deliveryAddressText = [
            existingOrder.deliveryAddress, existingOrder.deliveryCity,
            existingOrder.deliveryState, existingOrder.deliveryPincode
          ].filter(Boolean).join(", ");
          await emailService.sendTransactionConfirmation(
            buyer.email,
            buyer.username || existingOrder.customerName || "Customer",
            `TXN-${updatedOrder.id.toString().padStart(6, "0")}`,
            parseFloat(updatedOrder.totalAmount?.toString() || "0"),
            parseFloat(updatedOrder.commission?.toString() || "0"),
            productsForEmail,
            deliveryAddressText || "Not provided"
          );
          deliveryScheduler.scheduleDeliveryReminder(
            updatedOrder.id,
            buyer.email,
            buyer.username || existingOrder.customerName || "Customer",
            `TXN-${updatedOrder.id.toString().padStart(6, "0")}`
          );
        } catch (_) {}
      }

      res.status(200).json({
        success: true,
        ...updatedOrder,
        items: orderItems,
      });
    } catch (error) {
      console.error("[PAYU STAGE 4] Verification error:", error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : "Failed to verify payment and update order",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // Test order creation endpoint

  // Order management routes
  app.put("/api/orders/:id/cancel", async (req: Request, res: Response) => {
    try {
      const orderId = parseInt(req.params.id);
      const userId = req.session?.userId;
      
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const order = await storage.getOrder(orderId);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      
      if (order.userId !== userId) {
        return res.status(403).json({ message: "Not authorized to cancel this order" });
      }
      
      // Check if order can be cancelled
      const cancelableStatuses = ['pending', 'processing', 'paid'];
      if (!cancelableStatuses.includes(order.status.toLowerCase())) {
        return res.status(400).json({ message: "Order cannot be cancelled at this stage" });
      }
      
      const updatedOrder = await storage.updateOrderStatus(orderId, "cancelled");
      res.json(updatedOrder);
    } catch (error) {
      res.status(500).json({ message: "Failed to cancel order" });
    }
  });

  app.post("/api/orders/:id/refund-request", async (req: Request, res: Response) => {
    try {
      const orderId = parseInt(req.params.id);
      const userId = req.session?.userId;
      const { reason } = req.body;
      
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      if (!reason || reason.trim().length === 0) {
        return res.status(400).json({ message: "Refund reason is required" });
      }
      
      const order = await storage.getOrder(orderId);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      
      if (order.userId !== userId) {
        return res.status(403).json({ message: "Not authorized to request refund for this order" });
      }
      
      // Check if refund can be requested
      const refundableStatuses = ['delivered', 'completed'];
      if (!refundableStatuses.includes(order.status.toLowerCase())) {
        return res.status(400).json({ message: "Refund can only be requested for delivered orders" });
      }
      
      if (order.refundRequested) {
        return res.status(400).json({ message: "Refund already requested for this order" });
      }
      
      // Update order with refund request
      const updatedOrder = await storage.updateOrder(orderId, {
        refundRequested: true,
        refundReason: reason.trim(),
        refundStatus: "pending"
      });
      
      res.json(updatedOrder);
    } catch (error) {
      res.status(500).json({ message: "Failed to request refund" });
    }
  });

  // Analytics routes
  app.get("/api/commission-rate", (req: Request, res: Response) => {
    try {
      const commissionRate = storage.calculateCommission(100); // Example for 100$
      res.status(200).json({ rate: commissionRate, percentage: commissionRate });
    } catch (error) {
      res.status(500).json({ message: "Failed to get commission rate" });
    }
  });

  // Review routes
  app.get("/api/reviews/product/:productId", async (req: Request, res: Response) => {
    try {
      const productId = parseInt(req.params.productId);
      const reviews = await storage.getReviewsByProduct(productId);
      
      // Get user details for each review
      const reviewsWithUsers = await Promise.all(
        reviews.map(async (review) => {
          const user = await storage.getUser(review.userId);
          return {
            ...review,
            user: user ? { id: user.id, username: user.username, fullName: user.username } : null
          };
        })
      );
      
      res.json(reviewsWithUsers);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch reviews" });
    }
  });

  app.get("/api/reviews/user/:userId", async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      const reviews = await storage.getReviewsByUser(userId);
      res.json(reviews);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch user reviews" });
    }
  });

  app.post("/api/reviews", async (req: Request, res: Response) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      // SECURITY: Identity must come from session, never from request body.
      const userId = req.session.userId;
      const { productId, orderId, rating, comment } = req.body;

      if (!productId || isNaN(parseInt(productId))) {
        return res.status(400).json({ error: "Valid productId is required" });
      }

      // Validate rating
      if (rating < 1 || rating > 5) {
        return res.status(400).json({ error: "Rating must be between 1 and 5" });
      }

      // SECURITY: only allow reviews for products the user actually purchased.
      // Verify the supplied orderId belongs to the session user and contains
      // the product being reviewed.
      if (!orderId || isNaN(parseInt(orderId))) {
        return res.status(400).json({ error: "Valid orderId is required" });
      }
      const order = await storage.getOrder(parseInt(orderId));
      if (!order || order.userId !== userId) {
        return res.status(403).json({ error: "Not authorized to review for this order" });
      }
      // SECURITY: only fulfilment-backed orders count as a real purchase.
      // Reject pending_payment / pending / pending_cod / cancelled etc.
      // so a user cannot create an unpaid order just to drop a review.
      const reviewableStatuses = new Set(["paid", "completed", "delivered", "shipped"]);
      if (!reviewableStatuses.has(order.status)) {
        return res.status(400).json({ error: "Order is not in a reviewable state" });
      }
      const orderItemList = await storage.getOrderItems(order.id);
      const productInOrder = orderItemList.some(
        (it) => it.productId === parseInt(productId),
      );
      if (!productInOrder) {
        return res.status(400).json({ error: "Product was not part of this order" });
      }
      
      // Check if user has already reviewed this product
      const existingReviews = await storage.getReviewsByProduct(parseInt(productId));
      const userReview = existingReviews.find(r => r.userId === userId);
      
      if (userReview) {
        return res.status(400).json({ error: "You have already reviewed this product" });
      }
      
      const review = await storage.createReview({
        userId,
        productId: parseInt(productId),
        orderId: parseInt(orderId),
        rating,
        comment
      });
      
      res.status(201).json(review);
    } catch (error) {
      res.status(500).json({ error: "Failed to create review" });
    }
  });

  app.put("/api/reviews/:id", async (req: Request, res: Response) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const id = parseInt(req.params.id);
      const { rating, comment } = req.body;
      
      if (rating && (rating < 1 || rating > 5)) {
        return res.status(400).json({ error: "Rating must be between 1 and 5" });
      }

      // SECURITY: Verify review ownership.
      const existingReview = await storage.getReview(id);
      if (!existingReview) {
        return res.status(404).json({ error: "Review not found" });
      }
      if (existingReview.userId !== req.session.userId) {
        return res.status(403).json({ error: "Not authorized to update this review" });
      }
      
      const review = await storage.updateReview(id, { rating, comment });
      
      if (!review) {
        return res.status(404).json({ error: "Review not found" });
      }
      
      res.json(review);
    } catch (error) {
      res.status(500).json({ error: "Failed to update review" });
    }
  });

  app.delete("/api/reviews/:id", async (req: Request, res: Response) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const id = parseInt(req.params.id);

      // SECURITY: Verify review ownership.
      const existingReview = await storage.getReview(id);
      if (!existingReview) {
        return res.status(404).json({ error: "Review not found" });
      }
      if (existingReview.userId !== req.session.userId) {
        return res.status(403).json({ error: "Not authorized to delete this review" });
      }

      const success = await storage.deleteReview(id);
      
      if (!success) {
        return res.status(404).json({ error: "Review not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete review" });
    }
  });

  app.get("/api/products/:id/rating", async (req: Request, res: Response) => {
    try {
      const productId = parseInt(req.params.id);
      const rating = await storage.getProductAverageRating(productId);
      const reviews = await storage.getReviewsByProduct(productId);
      
      res.json({ 
        averageRating: rating, 
        totalReviews: reviews.length 
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch product rating" });
    }
  });

  // Admin routes
  app.get("/api/admin/stats", requireAdmin, async (req: Request, res: Response) => {
    try {
      const users = await storage.getAllUsers();
      const products = await storage.getAllProducts();
      const allOrders = await storage.getAllOrders();
      
      const stats = {
        totalUsers: users.length,
        totalProducts: products.length,
        totalOrders: allOrders.length,
        totalRevenue: allOrders.reduce((sum, order) => sum + parseFloat(order.totalAmount?.toString() || '0'), 0),
        platformFees: allOrders.reduce((sum, order) => sum + parseFloat(order.commission || "0"), 0),
        pendingOrders: allOrders.filter(order => order.status === "pending" || order.status === "pending_cod").length,
        completedOrders: allOrders.filter(order => order.status === "completed").length,
      };
      
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Failed to get admin stats" });
    }
  });

  app.get("/api/admin/users", requireAdmin, async (req: Request, res: Response) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      res.status(500).json({ error: "Failed to get users" });
    }
  });

  app.get("/api/admin/products", requireAdmin, async (req: Request, res: Response) => {
    try {
      const products = await storage.getAllProducts();
      res.json(products);
    } catch (error) {
      res.status(500).json({ error: "Failed to get products" });
    }
  });

  // Delete product (admin only)
  app.delete("/api/admin/products/:id", requireAdmin, async (req: Request, res: Response) => {
    try {
      const productId = parseInt(req.params.id);
      
      if (isNaN(productId)) {
        return res.status(400).json({ message: "Invalid product ID" });
      }
      
      // Check if product exists
      const product = await storage.getProduct(productId);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      
      // Delete the product
      await storage.deleteProduct(productId);
      
      // Create notification for admin
      await storage.createNotification({
        type: "product_deleted",
        message: `Product "${product.title}" has been deleted by admin`,
        userId: product.sellerId
      });
      
      res.status(200).json({ message: "Product deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete product" });
    }
  });

  app.get("/api/admin/orders", requireAdmin, async (req: Request, res: Response) => {
    try {
      const allOrders = await storage.getAllOrders();
      const ordersWithItems = await Promise.all(
        allOrders.map(async (order) => {
          const items = await storage.getOrderItems(order.id);
          const itemsWithProducts = await Promise.all(
            items.map(async (item) => {
              const product = await storage.getProduct(item.productId);
              // Get seller details for each product
              const seller = product ? await storage.getUser(product.sellerId) : null;
              return {
                ...item,
                product: {
                  ...product,
                  title: product?.title || "Unknown Product",
                  category: product?.category || "Unknown",
                  description: product?.description || "No description",
                  originalPrice: product?.price || 0,
                  originalQuantity: product?.quantity || 0,
                  sellerId: product?.sellerId || 0,
                  sellerName: seller?.username || "Unknown Seller",
                  sellerEmail: seller?.email || "N/A",
                  sellerPhone: seller?.phone || "N/A"
                }
              };
            })
          );
          // Get buyer details for this order
          const buyer = await storage.getUser(order.userId);
          return {
            ...order,
            buyer: {
              id: buyer?.id || order.userId,
              name: buyer?.username || "Unknown Buyer",
              email: buyer?.email || "N/A",
              phone: buyer?.phone || "N/A"
            },
            items: itemsWithProducts
          };
        })
      );
      res.json(ordersWithItems);
    } catch (error) {
      res.status(500).json({ error: "Failed to get orders" });
    }
  });

  // Reset revenue route (admin only)
  app.post("/api/admin/reset-revenue", requireAdmin, async (req: Request, res: Response) => {
    try {
      // Reset all order commissions to 0
      await storage.resetAllCommissions();
      res.status(200).json({ message: "Revenue reset successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to reset revenue" });
    }
  });

  // Notification routes — these power the admin notification feed
  // (admin-dashboard.tsx → NotificationPanel). They expose system-wide
  // activity (signups, product listings, order events) so they must be
  // admin-only.
  app.get("/api/notifications", requireAdmin, async (req: Request, res: Response) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const notifications = await storage.getNotifications(limit);
      res.status(200).json(notifications);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  app.get("/api/notifications/unread", requireAdmin, async (req: Request, res: Response) => {
    try {
      const notifications = await storage.getUnreadNotifications();
      res.status(200).json(notifications);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch unread notifications" });
    }
  });

  app.post("/api/notifications/:id/read", requireAdmin, async (req: Request, res: Response) => {
    try {
      const notificationId = parseInt(req.params.id);
      const success = await storage.markNotificationAsRead(notificationId);
      
      if (!success) {
        return res.status(404).json({ message: "Notification not found" });
      }
      
      res.status(200).json({ message: "Notification marked as read" });
    } catch (error) {
      res.status(500).json({ message: "Failed to mark notification as read" });
    }
  });

  // Database monitoring and admin management routes
  app.get("/api/admin/database/users", requireAdmin, async (req: Request, res: Response) => {
    try {
      const users = await storage.getAllUsers();
      const admins = users.filter(user => user.username.includes('admin') || user.email?.includes('admin'));
      const newToday = users.filter(user => {
        const today = new Date();
        const userDate = new Date(user.createdAt);
        return userDate.toDateString() === today.toDateString();
      }).length;

      res.json({
        total: users.length,
        new_today: newToday,
        admins: admins
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch user stats" });
    }
  });

  app.get("/api/admin/database/products", requireAdmin, async (req: Request, res: Response) => {
    try {
      const products = await storage.getAllProducts();
      const categories = products.reduce((acc: any, product) => {
        acc[product.category] = (acc[product.category] || 0) + 1;
        return acc;
      }, {});
      
      const categoryStats = Object.entries(categories).map(([category, count]) => ({
        category,
        count
      }));

      const sellerStats = products.reduce((acc: any, product) => {
        acc[product.sellerId] = (acc[product.sellerId] || 0) + 1;
        return acc;
      }, {});

      const topSellers = Object.entries(sellerStats)
        .map(([seller_id, count]) => ({ seller_id: parseInt(seller_id), count }))
        .sort((a: any, b: any) => b.count - a.count)
        .slice(0, 10);

      res.json({
        total: products.length,
        active: products.filter(p => p.quantity > 0).length,
        outOfStock: products.filter(p => p.quantity === 0).length,
        categories: categoryStats,
        topSellers: topSellers
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch product stats" });
    }
  });

  app.get("/api/admin/database/orders", requireAdmin, async (req: Request, res: Response) => {
    try {
      const orders = await storage.getAllOrders();
      const totalRevenue = orders.reduce((sum, order) => sum + parseFloat(order.totalAmount?.toString() || '0'), 0);
      const commission = totalRevenue * 0.20;

      res.json({
        total: orders.length,
        revenue: totalRevenue,
        commission: commission
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch order stats" });
    }
  });

  app.get("/api/admin/database/activity", requireAdmin, async (req: Request, res: Response) => {
    try {
      const notifications = await storage.getNotifications(20);
      res.json(notifications);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch activity" });
    }
  });

  // SECURITY: raw-SQL execute endpoint permanently removed.
  // The keyword-allowlist check (SELECT/INSERT/UPDATE) was trivially bypassed via
  // CTEs (`WITH x AS (DELETE …) SELECT 1`) and subqueries
  // (`SELECT * FROM (UPDATE … RETURNING *) AS t`), allowing full data exfiltration
  // and schema mutation even behind requireAdmin.
  // All admin data needs are served by the dedicated typed endpoints above.
  app.post("/api/admin/database/execute", requireAdmin, (_req: Request, res: Response) => {
    return res.status(410).json({
      success: false,
      message: "Raw SQL execution is no longer supported. Use the specific admin data endpoints.",
    });
  });

  app.post("/api/admin/create-user", requireAdmin, async (req: Request, res: Response) => {
    try {
      const { username, email, phone, password, isAdmin } = req.body;
      
      if (!username || !email || !password) {
        return res.status(400).json({ message: "Username, email, and password are required" });
      }

      // Check if user already exists
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(409).json({ message: "Username already exists" });
      }

      const existingEmail = await storage.getUserByEmail(email);
      if (existingEmail) {
        return res.status(409).json({ message: "Email already exists" });
      }

      // Create user with admin privileges if requested
      const userData = {
        username: isAdmin ? (username.includes('admin') ? username : `admin_${username}`) : username,
        email: isAdmin ? (email.includes('admin') ? email : `admin_${email}`) : email,
        phone: phone || '7039862086',
        password: password
      };

      const newUser = await storage.createUser(userData);
      
      // Create notification
      await storage.createNotification({
        type: isAdmin ? "admin_created" : "user_created",
        message: `New ${isAdmin ? 'admin' : 'user'} created: ${newUser.username}`,
        userId: newUser.id
      });

      const { password: _, ...userWithoutPassword } = newUser;
      res.status(201).json(userWithoutPassword);
    } catch (error) {
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  // Achievement routes
  app.get("/api/user/:userId/achievements", async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }

      const achievements = await storage.getUserAchievements(userId);
      res.json(achievements);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch achievements" });
    }
  });

  app.get("/api/user/:userId/stats", async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }

      const stats = await storage.getUserStats(userId);
      if (!stats) {
        // Initialize stats if they don't exist
        await achievementService.initializeUserStats(userId);
        const newStats = await storage.getUserStats(userId);
        return res.json(newStats);
      }

      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch user stats" });
    }
  });

  app.post("/api/user/:userId/achievements/check", async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }

      const newAchievements = await achievementService.checkAndUpdateAchievements(userId);
      res.json(newAchievements || []);
    } catch (error) {
      res.status(500).json({ message: "Failed to check achievements" });
    }
  });

  // Connection management routes
  app.post("/api/connections/request", async (req: Request, res: Response) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const { receiverId } = req.body;
      if (!receiverId || isNaN(parseInt(receiverId))) {
        return res.status(400).json({ message: "Valid receiver ID is required" });
      }

      const requesterId = req.session.userId;
      const receiverIdNum = parseInt(receiverId);

      // Check if trying to connect to self
      if (requesterId === receiverIdNum) {
        return res.status(400).json({ message: "Cannot send connection request to yourself" });
      }

      // Check if connection already exists
      const existingConnection = await storage.getConnection(requesterId, receiverIdNum);
      if (existingConnection) {
        return res.status(400).json({ 
          message: "Connection already exists",
          status: existingConnection.status 
        });
      }

      // Create new connection request
      const newConnection = await storage.createConnection({
        requesterId,
        receiverId: receiverIdNum,
        status: "pending"
      });

      res.status(201).json(newConnection);
    } catch (error) {
      res.status(500).json({ message: "Failed to send connection request" });
    }
  });

  app.get("/api/connections/status", async (req: Request, res: Response) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const { otherUserId } = req.query;
      if (!otherUserId || isNaN(parseInt(otherUserId as string))) {
        return res.status(400).json({ message: "Valid other user ID is required" });
      }

      const currentUserId = req.session.userId;
      const otherUserIdNum = parseInt(otherUserId as string);

      const status = await storage.getConnectionStatus(currentUserId, otherUserIdNum);
      res.json({ status: status || "not_connected" });
    } catch (error) {
      res.status(500).json({ message: "Failed to get connection status" });
    }
  });

  app.put("/api/connections/:id/respond", async (req: Request, res: Response) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const connectionId = parseInt(req.params.id);
      const { status } = req.body;

      if (isNaN(connectionId)) {
        return res.status(400).json({ message: "Invalid connection ID" });
      }

      if (!status || !["accepted", "rejected"].includes(status)) {
        return res.status(400).json({ message: "Status must be 'accepted' or 'rejected'" });
      }

      // SECURITY: fetch the actual connection by id and verify the
      // authenticated user is the receiver of that connection request.
      // (Previous implementation called getConnection(userId, userId), which
      // looked up a self-self connection and never returned the real row.)
      const { db } = await import("./db");
      const { connections } = await import("@shared/schema");
      const { eq } = await import("drizzle-orm");
      const [connection] = await db
        .select()
        .from(connections)
        .where(eq(connections.id, connectionId))
        .limit(1);

      if (!connection) {
        return res.status(404).json({ message: "Connection not found" });
      }

      if (connection.receiverId !== req.session.userId) {
        return res.status(403).json({ message: "Not authorized to respond to this connection" });
      }

      const updatedConnection = await storage.updateConnectionStatus(connectionId, status);
      res.json(updatedConnection);
    } catch (error) {
      res.status(500).json({ message: "Failed to respond to connection" });
    }
  });

  app.get("/api/connections", async (req: Request, res: Response) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const connections = await storage.getUserConnections(req.session.userId);
      
      // Enhance connections with user details
      const enhancedConnections = await Promise.all(
        connections.map(async (connection) => {
          const otherUserId = connection.requesterId === req.session.userId 
            ? connection.receiverId 
            : connection.requesterId;
          
          const otherUser = await storage.getUser(otherUserId);
          const profile = await storage.getStudentProfile(otherUserId);
          
          return {
            ...connection,
            otherUser: otherUser ? {
              id: otherUser.id,
              username: otherUser.username,
              email: otherUser.email
            } : null,
            profile: profile ? {
              college: profile.college,
              currentCourse: profile.currentCourse,
              avatarUrl: profile.avatarUrl
            } : null
          };
        })
      );

      res.json(enhancedConnections);
    } catch (error) {
      res.status(500).json({ message: "Failed to get connections" });
    }
  });

  // Test Supabase connection endpoint (for debugging)

  // Admin routes for enhanced order management
  app.get("/api/admin/orders", requireAdmin, async (req: Request, res: Response) => {
    try {
      const orders = await storage.getAllOrders();
      
      // Enhance orders with buyer and seller details
      const enhancedOrders = await Promise.all(
        orders.map(async (order) => {
          const buyer = await storage.getUser(order.userId);
          const orderItems = await storage.getOrderItems(order.id);
          
          // Get product and seller details for each item
          const itemsWithDetails = await Promise.all(
            orderItems.map(async (item) => {
              const product = await storage.getProduct(item.productId);
              const seller = product ? await storage.getUser(product.sellerId) : null;
              
              return {
                ...item,
                product: product ? {
                  ...product,
                  sellerName: seller?.username,
                  sellerEmail: seller?.email,
                  sellerPhone: seller?.phone
                } : null
              };
            })
          );
          
          return {
            ...order,
            buyer: buyer ? {
              id: buyer.id,
              username: buyer.username,
              email: buyer.email,
              phone: buyer.phone
            } : null,
            items: itemsWithDetails
          };
        })
      );
      
      // Sort by creation date (newest first)
      enhancedOrders.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      
      res.json(enhancedOrders);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch orders" });
    }
  });

  app.get("/api/admin/users", requireAdmin, async (req: Request, res: Response) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.delete("/api/admin/users/:id", requireAdmin, async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.id);
      if (isNaN(userId)) return res.status(400).json({ message: "Invalid user ID" });
      const deleted = await storage.deleteUser(userId);
      if (!deleted) return res.status(404).json({ message: "User not found" });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  app.delete("/api/admin/buyer-requests/:id", requireAdmin, async (req: Request, res: Response) => {
    try {
      const requestId = parseInt(req.params.id);
      if (isNaN(requestId)) return res.status(400).json({ message: "Invalid request ID" });
      const deleted = await storage.deleteBuyerRequest(requestId);
      if (!deleted) return res.status(404).json({ message: "Buyer request not found" });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete buyer request" });
    }
  });

  // Matchmaking routes
  app.get("/api/student-matches", async (req: Request, res: Response) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
      if (isNaN(limit) || limit < 1 || limit > 100) {
        return res.status(400).json({ message: "Invalid limit parameter (1-100)" });
      }

      const matches = await storage.getPotentialMatches(req.session.userId, limit);
      res.json(matches);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Project collaboration routes
  app.post("/api/projects", async (req: Request, res: Response) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const projectData = insertProjectSchema.parse({
        ...req.body,
        creatorId: req.session.userId // Ensure project is owned by authenticated user
      });

      const newProject = await storage.createProject(projectData, req.session.userId);
      res.status(201).json(newProject);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });



  app.get("/api/projects/search", async (req: Request, res: Response) => {
    try {
      const { q } = req.query;
      if (!q || typeof q !== "string") {
        return res.status(400).json({ message: "Search query parameter 'q' is required" });
      }

      const projects = await storage.searchProjects(q);
      res.json(projects);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/projects/by-skills", async (req: Request, res: Response) => {
    try {
      const { skills } = req.query;
      if (!skills || typeof skills !== "string") {
        return res.status(400).json({ message: "Skills parameter required (comma-separated)" });
      }

      const skillsArray = skills.split(',').map(skill => skill.trim()).filter(skill => skill.length > 0);
      const projects = await storage.getProjectsBySkills(skillsArray);
      res.json(projects);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/projects/:id", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.id);
      if (isNaN(projectId)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }

      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      res.json(project);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/projects", async (req: Request, res: Response) => {
    try {
      const projects = await storage.getAllProjects();
      res.json(projects);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/user/projects", async (req: Request, res: Response) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const projects = await storage.getUserProjects(req.session.userId);
      res.json(projects);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/projects/:id", async (req: Request, res: Response) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const projectId = parseInt(req.params.id);
      if (isNaN(projectId)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }

      // Check if user owns the project
      const existingProject = await storage.getProject(projectId);
      if (!existingProject) {
        return res.status(404).json({ message: "Project not found" });
      }
      if (existingProject.creatorId !== req.session.userId) {
        return res.status(403).json({ message: "You don't have permission to update this project" });
      }

      const safeProjectData = insertProjectSchema.partial().parse(req.body);
      const updatedProject = await storage.updateProject(projectId, safeProjectData);

      if (!updatedProject) {
        return res.status(404).json({ message: "Project not found" });
      }

      res.json(updatedProject);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/projects/:id", async (req: Request, res: Response) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const projectId = parseInt(req.params.id);
      if (isNaN(projectId)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }

      // Check if user owns the project
      const existingProject = await storage.getProject(projectId);
      if (!existingProject) {
        return res.status(404).json({ message: "Project not found" });
      }
      if (existingProject.creatorId !== req.session.userId) {
        return res.status(403).json({ message: "You don't have permission to delete this project" });
      }

      const deleted = await storage.deleteProject(projectId);
      if (!deleted) {
        return res.status(404).json({ message: "Project not found" });
      }

      res.status(200).json({ message: "Project deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });



  app.post("/api/projects/:id/join", async (req: Request, res: Response) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const projectId = parseInt(req.params.id);
      if (isNaN(projectId)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }

      const { role } = req.body;
      const member = await storage.joinProject(req.session.userId, projectId, role || 'member');
      
      if (!member) {
        return res.status(400).json({ message: "Unable to join project (may be full or already a member)" });
      }

      res.status(201).json(member);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/projects/:id/leave", async (req: Request, res: Response) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const projectId = parseInt(req.params.id);
      if (isNaN(projectId)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }

      const left = await storage.leaveProject(req.session.userId, projectId);
      if (!left) {
        return res.status(404).json({ message: "You are not a member of this project" });
      }

      res.status(200).json({ message: "Successfully left project" });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/projects/:id/members", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.id);
      if (isNaN(projectId)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }

      const members = await storage.getProjectMembers(projectId);
      res.json(members);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Add hybrid authentication routes
  app.use("/api", authHybridRoutes);
  
  // Add enhanced authentication routes
  app.use("/api", enhancedAuthRoutes);

  // Add Firebase authentication routes (scoped to collab)
  app.use("/api/collab", firebaseAuthRoutes);
  app.use("/api/collab/social", collabSocialRoutes);
  app.use("/api/collab/elections", collabElectionsRoutes);
  app.use("/api/collab/connections", collabConnectionsRoutes);
  app.use("/api/collab/admin", collabAdminRoutes);
  app.use(lancingRoutes);
  app.use(lancingAdminRoutes);
  app.use(lancingAiRoutes);
  app.use(lancingApplyRoutes);
  app.use(lancingSureShotRoutes);
  app.use(careerCompassRoutes);
  app.use(codingArenaRoutes);
  app.use(institutionalRoadmapRoutes);
  app.use(placementReadinessRoutes);
  app.use(placementCellRoutes);
  app.use(assessmentRoutes);
  app.use(attendanceRoutes);
  app.use(hastechRoutes);
  app.use(natConfRoutes);
  app.use(netxRoutes);
  app.use(competitionsRoutes);

  // Student Lancing API - Get Firebase config for client
  app.get("/api/student-lancing/config", (req: Request, res: Response) => {
    res.json({
      apiKey: process.env.VITE_FIREBASE_API_KEY || "",
      authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || "",
      projectId: process.env.VITE_FIREBASE_PROJECT_ID || "",
      storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || "",
      messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
      appId: process.env.VITE_FIREBASE_APP_ID || "",
      measurementId: process.env.VITE_FIREBASE_MEASUREMENT_ID || ""
    });
  });

  const httpServer = createServer(app);

  return httpServer;
}
