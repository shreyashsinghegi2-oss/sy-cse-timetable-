import express, { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { storage } from '../storage';
import {
  collabFirestore,
  ProfileAlreadyExistsError,
  getSqlOnlyCollabUid,
  isSqlOnlyCollabUid,
  normalizeSqlOnlyCollabUidClaim,
} from '../collab-firestore-service';
import { firebaseProfileSchema } from '@shared/schema';
import { admin } from '../firebase-admin';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { strictFileFilter, verifyMagicBytes } from '../utils/upload-filter';

const router = express.Router();

// JWT Secret - In production, this should be in environment variables
const JWT_SECRET = process.env.JWT_SECRET!;

class CollabUidCollisionError extends Error {
  constructor() {
    super('The SQL account cannot be assigned a safe Collab identity');
    this.name = 'CollabUidCollisionError';
  }
}

async function resolveCollabUid(user: { id: number; uid?: string | null }): Promise<string> {
  if (user.uid) {
    // A reserved SQL owner key is valid only for its own SQL row. Never let
    // a stale or manually supplied reserved UID redirect profile ownership.
    return isSqlOnlyCollabUid(user.uid)
      ? normalizeSqlOnlyCollabUidClaim(user.id, user.uid)
      : user.uid;
  }

  const syntheticUid = getSqlOnlyCollabUid(user.id);
  const collision = await storage.getUserByFirebaseUid(syntheticUid);
  if (collision && collision.id !== user.id) {
    throw new CollabUidCollisionError();
  }
  return syntheticUid;
}

// ---------------------------------------------------------------------------
// JWT token blacklist — invalidated on explicit logout.
// Keyed by jti (JWT ID); value is the expiry timestamp so we can prune stale
// entries. Stored in-memory; survives normal runtime but cleared on restart
// (acceptable: tokens are short-lived at 7 days and revoked ones age out).
// ---------------------------------------------------------------------------
const jwtBlacklist = new Map<string, number>(); // jti → expiry epoch ms

function blacklistToken(jti: string, expiryMs: number) {
  jwtBlacklist.set(jti, expiryMs);
}

function isTokenBlacklisted(jti: string): boolean {
  const exp = jwtBlacklist.get(jti);
  if (exp === undefined) return false;
  if (Date.now() > exp) {
    jwtBlacklist.delete(jti); // prune expired entry
    return false;
  }
  return true;
}

// Prune fully-expired entries once per hour so the Map never grows unbounded.
const jwtBlacklistPruner = setInterval(() => {
  const now = Date.now();
  for (const [jti, exp] of jwtBlacklist.entries()) {
    if (now > exp) jwtBlacklist.delete(jti);
  }
}, 60 * 60 * 1000);
jwtBlacklistPruner.unref?.();

// Multer setup for file uploads (memory storage) with strict allow-listing
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: strictFileFilter,
});

/**
 * Middleware to verify Firebase ID token and extract user info
 * This validates that the request comes from a properly authenticated Firebase user
 */
const verifyFirebaseToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No Firebase token provided' });
    }

    const idToken = authHeader.split('Bearer ')[1];
    
    // Verify the Firebase ID token
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    if (isSqlOnlyCollabUid(decodedToken.uid)) {
      return res.status(401).json({ error: 'Reserved SQL-only identity cannot be used as a Firebase token' });
    }
    
    // Add Firebase user info to request object
    (req as any).firebaseUser = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      name: decodedToken.name || decodedToken.email?.split('@')[0]
    };
    
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid Firebase token' });
  }
};

/**
 * Middleware to verify JWT token for protected routes
 * This ensures the user has a valid session
 * Falls back to Firebase ID token verification for robustness
 */
export const verifyJWT = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'No JWT token provided' });
  }

  let token = authHeader.slice('Bearer '.length).trim();
  if (!token) {
    return res.status(401).json({ success: false, error: 'No JWT token provided' });
  }
  
  // Handle double Bearer prefix (e.g., "Bearer Bearer xyz")
  if (token.startsWith('Bearer ')) {
    token = token.substring(7);
  }
  
  // First, try to verify as server-issued JWT (HS256)
  let decodedServer: any;
  try {
    decodedServer = jwt.verify(token, JWT_SECRET) as any;
  } catch (jwtError: any) {
    // JWT verification failed, try Firebase ID token as fallback
  }

  if (decodedServer) {
    try {
      // Old SQL-only JWTs omitted uid. Derive it from the signed userId so
      // those sessions address the same profile as newly issued tokens.
      if (isSqlOnlyCollabUid(decodedServer.uid)
        && (!Number.isInteger(decodedServer.userId) || decodedServer.userId <= 0)) {
        throw new Error('SQL Collab identity requires a valid JWT userId');
      }
      if (Number.isInteger(decodedServer.userId) && decodedServer.userId > 0) {
        decodedServer.uid = normalizeSqlOnlyCollabUidClaim(
          decodedServer.userId,
          decodedServer.uid,
        );
      }

      if (decodedServer.jti && isTokenBlacklisted(decodedServer.jti)) {
        return res.status(401).json({ success: false, error: 'Token has been revoked. Please sign in again.' });
      }
      (req as any).jwtUser = decodedServer;
      return next();
    } catch (identityError: any) {
      return res.status(401).json({
        success: false,
        error: identityError?.message || 'Invalid server session identity',
      });
    }
  }
  
  // Fallback: Try to verify as Firebase ID token (RS256)
  let decodedFirebase: any;
  try {
    decodedFirebase = await admin.auth().verifyIdToken(token);
  } catch (firebaseError: any) {
    console.error('[verifyJWT] ❌ Firebase token verification failed:', firebaseError?.message);
    console.error('[verifyJWT] Firebase error code:', firebaseError?.code);
    return res.status(401).json({ success: false, error: 'Invalid or expired token. Please sign in again.' });
  }
  if (isSqlOnlyCollabUid(decodedFirebase.uid)) {
    return res.status(401).json({
      success: false,
      error: 'Reserved SQL-only identity cannot be used as a Firebase token',
    });
  }

  // Token verification and account lookup are deliberately separate.  A
  // database outage is not an invalid credential and must not be reported as
  // 401 (the client would incorrectly sign the user out).
  try {
    // Look up user in database by Firebase UID first, then by email.
    let dbUser = await storage.getUserByFirebaseUid(decodedFirebase.uid);
    if (!dbUser && decodedFirebase.email) {
      dbUser = await storage.getUserByEmail(decodedFirebase.email);
    }
    if (dbUser && dbUser.uid !== decodedFirebase.uid) {
      // Do not turn an email-only match into an authenticated session for a
      // different Firebase identity (including legacy SQL users with no uid).
      return res.status(409).json({
        success: false,
        error: 'Firebase account is not linked to this SQL account'
      });
    }

    (req as any).jwtUser = {
      uid: decodedFirebase.uid,
      email: decodedFirebase.email,
      username: dbUser?.username || decodedFirebase.name || decodedFirebase.email?.split('@')[0],
      userId: dbUser?.id,
      role: dbUser?.role || 'student'
    };

    (req as any).firebaseUser = {
      uid: decodedFirebase.uid,
      email: decodedFirebase.email,
      name: decodedFirebase.name || decodedFirebase.email?.split('@')[0]
    };

    return next();
  } catch (databaseError: any) {
    console.error('[verifyJWT] Database lookup failed:', databaseError?.message || databaseError);
    return res.status(503).json({ success: false, error: 'Authentication service temporarily unavailable' });
  }
};

/**
 * POST /signup
 * Creates user in PostgreSQL after Firebase registration
 * Expects Firebase ID token in Authorization header
 */
router.post('/signup', verifyFirebaseToken, async (req: Request, res: Response) => {
  try {

    // Validation schema for signup data
    const signupSchema = z.object({
      uid: z.string().min(1, 'Firebase UID is required'),
      username: z.string().min(3, 'Username must be at least 3 characters').max(30),
      email: z.string().email('Valid email is required'),
      // Account roles are not Collab profile roles.  Never allow this
      // endpoint to mint an admin account from client input.
      role: z.enum(['student', 'organization']).default('student'),
    });

    const userData = signupSchema.parse(req.body);
    const firebaseUser = (req as any).firebaseUser;

    // Verify that the Firebase UID matches the token
    if (userData.uid !== firebaseUser.uid) {
      return res.status(400).json({ error: 'Firebase UID mismatch' });
    }

    // Verify email matches Firebase token
    if (userData.email !== firebaseUser.email) {
      return res.status(400).json({ error: 'Email mismatch with Firebase token' });
    }


    // Check if user already exists by email
    const existingUserByEmail = await storage.getUserByEmail(userData.email);
    if (existingUserByEmail) {
      return res.status(409).json({ error: 'User with this email already exists' });
    }

    // Check if username is taken
    const existingUserByUsername = await storage.getUserByUsername(userData.username);
    if (existingUserByUsername) {
      return res.status(409).json({ error: 'Username is already taken' });
    }

    // Create user in PostgreSQL database
    let newUser: Awaited<ReturnType<typeof storage.createUser>>;
    try {
      newUser = await storage.createUser({
        uid: userData.uid, // Store Firebase UID
        username: userData.username,
        email: userData.email,
        password: null, // No password for Firebase users
        phone: null, // Phone is optional for Firebase users
        role: userData.role,
      });
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        return res.status(409).json({ error: 'User with this email, username, or Firebase account already exists' });
      }
      throw error;
    }


    // Generate JWT token for session management
    const jwtToken = jwt.sign(
      { 
        jti: randomUUID(),
        userId: newUser.id, 
        uid: newUser.uid,
        email: newUser.email,
        username: newUser.username,
        role: newUser.role
      }, 
      JWT_SECRET, 
      { expiresIn: '7d' } // 7 days expiry
    );

    // Create notification for admin
    await storage.createNotification({
      type: "signup",
      message: `New Firebase user registered: ${newUser.username} (${newUser.email})`,
      userId: newUser.id
    });

    // Return success response with user data and JWT
    res.status(201).json({
      message: 'User created successfully',
      user: {
        id: newUser.id,
        uid: newUser.uid,
        username: newUser.username,
        email: newUser.email,
        role: newUser.role,
        createdAt: newUser.createdAt
      },
      token: jwtToken // JWT token for localStorage storage
    });

  } catch (error: any) {
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Invalid input data', 
        details: error.errors 
      });
    }

    res.status(500).json({ error: 'Failed to create user account' });
  }
});

/**
 * GET /user/:uid
 * Fetches user profile by Firebase UID
 * Requires valid JWT token
 */
router.get('/user/:uid', verifyJWT, async (req: Request, res: Response) => {
  try {
    const { uid } = req.params;
    const jwtUser = (req as any).jwtUser;


    // Security check: users can only access their own profile
    // Unless they're admin (for future admin features)
    if (jwtUser.uid !== uid && jwtUser.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied: can only access own profile' });
    }

    // Find user by Firebase UID
    const user = await storage.getUserByFirebaseUid(uid);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }


    // Return user profile (excluding sensitive data)
    res.json({
      id: user.id,
      uid: user.uid,
      username: user.username,
      email: user.email,
      phone: user.phone,
      role: user.role,
      createdAt: user.createdAt
    });

  } catch (error: any) {
    res.status(500).json({ 
      error: 'Failed to fetch user profile',
      message: error.message 
    });
  }
});

/**
 * POST /auth/verify-token
 * Verifies if a JWT token is still valid
 * Used for checking login status on app startup
 */
router.post('/auth/verify-token', verifyJWT, (req: Request, res: Response) => {
  const jwtUser = (req as any).jwtUser;
  
  res.json({
    valid: true,
    user: {
      userId: jwtUser.userId,
      uid: jwtUser.uid,
      email: jwtUser.email,
      username: jwtUser.username,
      role: jwtUser.role
    }
  });
});

/**
 * GET /auth/me
 * Session endpoint used by JWT-only Collab clients.  Unlike the Firebase
 * token endpoint this accepts the server JWT in local storage, so it must not
 * require a live Firebase client session.
 */
router.get('/auth/me', verifyJWT, (req: Request, res: Response) => {
  const jwtUser = (req as any).jwtUser;
  return res.json({
    authenticated: true,
    valid: true,
    user: {
      id: jwtUser.userId,
      userId: jwtUser.userId,
      uid: jwtUser.uid,
      email: jwtUser.email,
      username: jwtUser.username,
      role: jwtUser.role,
    },
  });
});

/**
 * POST /auth/firebase-token
 * Generates a Firebase custom token for restoring Firebase auth session
 * Used when Firebase auth.currentUser is null but user has valid JWT
 */
router.post('/auth/firebase-token', verifyJWT, async (req: Request, res: Response) => {
  try {
    const jwtUser = (req as any).jwtUser;
    
    if (!jwtUser.uid || isSqlOnlyCollabUid(jwtUser.uid)) {
      return res.status(400).json({ error: 'A Firebase-linked session is required' });
    }

    // Generate Firebase custom token using the user's Firebase UID
    const customToken = await admin.auth().createCustomToken(jwtUser.uid);

    res.json({
      customToken,
      uid: jwtUser.uid
    });

  } catch (error: any) {
    console.error('Error generating Firebase custom token:', error);
    res.status(500).json({ 
      error: 'Failed to generate Firebase token',
      message: error.message 
    });
  }
});

/**
 * POST /auth/refresh-token
 * Refreshes JWT token with a new expiry
 * Used to extend user sessions
 */
router.post('/auth/refresh-token', verifyJWT, async (req: Request, res: Response) => {
  try {
    const jwtUser = (req as any).jwtUser;
    
    if (!jwtUser.uid && !Number.isInteger(jwtUser.userId)) {
      return res.status(401).json({ error: 'No account identity available for token refresh' });
    }

    // Fetch latest user data from database.  Traditional JWT-only sessions do
    // not have a Firebase UID, so use the signed SQL userId for those tokens.
    const user = jwtUser.uid && !isSqlOnlyCollabUid(jwtUser.uid)
      ? await storage.getUserByFirebaseUid(jwtUser.uid)
      : await storage.getUser(jwtUser.userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Generate new JWT token
    const collabUid = await resolveCollabUid(user);
    const newToken = jwt.sign(
      { 
        jti: randomUUID(),
        userId: user.id, 
        uid: collabUid,
        email: user.email,
        username: user.username,
        role: user.role
      }, 
      JWT_SECRET, 
      { expiresIn: '7d' }
    );

    return res.json({
      message: 'Token refreshed successfully',
      token: newToken,
      user: {
        id: user.id,
        userId: user.id,
        uid: collabUid,
        email: user.email,
        username: user.username,
        role: user.role,
      },
    });

  } catch (error: any) {
    if (error instanceof CollabUidCollisionError) {
      return res.status(409).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to refresh token' });
  }
});

/**
 * POST /auth/logout
 * Blacklists the current JWT so it cannot be reused even before its 7-day expiry.
 * The client must also delete the token from localStorage.
 */
router.post('/auth/logout', verifyJWT, (req: Request, res: Response) => {
  const decoded = (req as any).jwtUser;
  if (decoded?.jti && decoded?.exp) {
    // Blacklist until the token's own expiry (epoch seconds → ms)
    blacklistToken(decoded.jti, decoded.exp * 1000);
  }
  return res.status(200).json({ message: 'Logged out successfully' });
});

/**
 * GET /auth/login-status
 * Check if user exists and determine authentication type
 * Used by SmartLoginForm to decide authentication flow
 */
router.get('/auth/login-status', async (req: Request, res: Response) => {
  try {
    const { email } = req.query;
    
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: "Email required" });
    }

    const existingUser = await storage.getUserByEmail(email);
    
    return res.json({
      userExists: !!existingUser,
      authType: existingUser ? "traditional" : "firebase",
      suggestion: existingUser 
        ? "Use your existing password to log in" 
        : "New user? Register with Firebase authentication"
    });

  } catch (error) {
    return res.status(500).json({ error: "Status check failed" });
  }
});

/**
 * POST /auth/smart-login
 * Smart login that handles both traditional and Firebase authentication
 * Returns JWT token for collab authentication (no session modification)
 */
router.post('/auth/smart-login', async (req: Request, res: Response) => {
  try {
    const loginSchema = z.object({
      email: z.string().email(),
      password: z.string().optional(), // Optional for Firebase-only flow
      firebaseIdToken: z.string().optional(), // For Firebase authentication
    });

    const { email, password, firebaseIdToken } = loginSchema.parse(req.body);

    // Step 1: Check if user exists in PostgreSQL
    const existingUser = await storage.getUserByEmail(email);

    if (existingUser && password) {
      // Check if user has a password (traditional user) or was created via Firebase
      if (!existingUser.password) {
        // User exists but was created via Firebase - suggest Firebase login
        return res.status(400).json({ 
          error: "This account was created with Firebase. Please sign in using the 'Sign Up' option to authenticate with Firebase.",
          loginType: "firebase_required",
          suggestFirebase: true
        });
      }
      
      // Existing PostgreSQL user with password - use traditional authentication
      
      const isValidPassword = await bcrypt.compare(password, existingUser.password);
      if (!isValidPassword) {
        return res.status(401).json({ 
          error: "Invalid credentials",
          loginType: "traditional" 
        });
      }

      // Password accounts may predate Firebase and have a null users.uid.
      // Give those accounts a collision-checked, stable namespace key so
      // their server JWT can own a Collab Firestore profile.
      let collabUid: string;
      try {
        collabUid = await resolveCollabUid(existingUser);
      } catch (error) {
        if (error instanceof CollabUidCollisionError) {
          return res.status(409).json({ error: error.message, loginType: "traditional" });
        }
        throw error;
      }

      // Generate JWT token for collab (don't modify session)
      const token = jwt.sign(
        { 
          jti: randomUUID(),
          userId: existingUser.id,
          uid: collabUid,
          email: existingUser.email,
          username: existingUser.username,
          role: existingUser.role || 'student'
        }, 
        JWT_SECRET, 
        { expiresIn: '7d' }
      );

      return res.json({
        message: "Login successful",
        loginType: "traditional",
        token: token,
        user: {
          id: existingUser.id,
          username: existingUser.username,
          email: existingUser.email,
          uid: collabUid // Stable Collab owner key (Firebase UID when linked)
        }
      });

    } else if (firebaseIdToken) {
      // Firebase authentication path - verify token and create/get user
      let decodedToken: any;
      try {
        decodedToken = await admin.auth().verifyIdToken(firebaseIdToken);
      } catch (firebaseError: any) {
        console.error("[Smart-Login] Firebase token verification failed:", firebaseError?.message || firebaseError);
        return res.status(401).json({
          error: "Firebase authentication failed",
          loginType: "firebase"
        });
      }
      if (isSqlOnlyCollabUid(decodedToken.uid)) {
        return res.status(401).json({
          error: "Reserved SQL-only identity cannot be used as a Firebase token",
          loginType: "firebase",
        });
      }

      const tokenEmail = decodedToken.email?.trim().toLowerCase();
      if (!tokenEmail || tokenEmail !== email.trim().toLowerCase()) {
        return res.status(400).json({ error: "Email does not match Firebase token" });
      }

      // Create or get user from database.  Account lookup errors intentionally
      // escape to the outer 500 handler rather than being reported as 401.
      let user = await storage.getUserByFirebaseUid(decodedToken.uid);
      if (!user) {
        user = existingUser;
      }
      if (!user) {
        user = await storage.getUserByEmail(tokenEmail);
      }

      if (user && user.uid && user.uid !== decodedToken.uid) {
        return res.status(409).json({
          error: "This email is already linked to another authentication account",
          loginType: "firebase"
        });
      }
      if (user && !user.uid) {
        return res.status(409).json({
          error: "This email belongs to an account that must be linked before Firebase sign-in",
          loginType: "firebase"
        });
      }

      if (!user) {
        const candidate = String(decodedToken.name || email.split('@')[0])
          .toLowerCase()
          .replace(/[^a-z0-9_]/g, '_')
          .replace(/^_+|_+$/g, '')
          .slice(0, 30) || 'user';
        let username = candidate.length >= 3 ? candidate : `${candidate}user`.slice(0, 30);
        for (let suffix = 1; await storage.getUserByUsername(username); suffix++) {
          const suffixText = `_${suffix}`;
          username = `${candidate.slice(0, 30 - suffixText.length)}${suffixText}`;
        }

        try {
          user = await storage.createUser({
            username,
            email: tokenEmail,
            uid: decodedToken.uid,
            password: null,
            phone: null,
            role: 'student'
          });
        } catch (error) {
          if (!isUniqueConstraintError(error)) throw error;
          user = await storage.getUserByFirebaseUid(decodedToken.uid);
          if (!user) user = await storage.getUserByEmail(tokenEmail);
          if (!user) throw error;
          if (user.uid && user.uid !== decodedToken.uid) {
            return res.status(409).json({
              error: "This email is already linked to another authentication account",
              loginType: "firebase"
            });
          }
        }
      }

      // Generate JWT token for collab
      const token = jwt.sign(
        {
          jti: randomUUID(),
          userId: user.id,
          uid: user.uid,
          email: user.email,
          username: user.username,
          role: user.role
        },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      return res.json({
        message: "Firebase login successful",
        loginType: "firebase",
        token: token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          uid: user.uid // Include Firebase UID so delete button works
        }
      });

    } else {
      return res.status(400).json({
        error: "Either password or Firebase ID token required"
      });
    }

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid input", details: error.errors });
    }
    return res.status(500).json({ error: "Login failed" });
  }
});

/**
 * Student Collab-specific endpoints using JWT authentication
 * These are isolated from the main marketplace session-based auth
 */

/**
 * Helper to normalize Firestore profile for API response
 * Converts Timestamps to ISO strings for JSON compatibility
 */
function normalizeProfile(profile: any) {
  const normalizeTimestamp = (value: any) => {
    if (!value) return value;
    if (typeof value.toISOString === 'function') return value.toISOString();
    if (typeof value.toDate === 'function') return value.toDate().toISOString();
    return value;
  };

  return {
    ...profile,
    id: profile.userId || profile.id, // Use userId as primary id for API compatibility
    uid: profile.uid, // Keep Firebase UID separate
    createdAt: normalizeTimestamp(profile.createdAt),
    updatedAt: normalizeTimestamp(profile.updatedAt),
  };
}

const genericCollabProfileSchema = z.object({
  uid: z.string().min(1),
  userId: z.number().int().positive().optional(),
  email: z.string().email(),
  name: z.string().min(1, 'Name is required'),
  username: z.string().min(3).max(20),
  role: z.enum(['Professional', 'Organisation', 'Organization']),
}).passthrough();

/**
 * The original Collab API used Club/Community/Company while the newer
 * profile builder uses Student/Professional/Organisation.  Keep the
 * role-specific legacy schemas strict, and accept the newer open-ended role
 * payloads after validating their shared identity fields.
 */
export const collabProfilePayloadSchema = z.union([
  firebaseProfileSchema,
  genericCollabProfileSchema,
]);

export function parseCollabProfilePayload(payload: unknown) {
  return collabProfilePayloadSchema.safeParse(payload);
}

export function isUniqueConstraintError(error: unknown, seen = new Set<object>()): boolean {
  if (!error || typeof error !== 'object' || seen.has(error)) return false;
  seen.add(error);

  const candidate = error as {
    code?: unknown;
    cause?: unknown;
    originalError?: unknown;
  };
  if (
    candidate.code === '23505' ||
    candidate.code === 'already-exists' ||
    candidate.code === 6
  ) {
    return true;
  }

  // Drizzle's DatabaseError commonly exposes the underlying pg error as
  // `cause` (and some drivers use `originalError`). Follow only those known
  // error wrappers so unrelated failures remain 500s.
  return isUniqueConstraintError(candidate.cause, seen)
    || isUniqueConstraintError(candidate.originalError, seen);
}

/**
 * Firebase ID token authentication can legitimately arrive before the SQL
 * account has been synchronized (for example after a deploy or a direct
 * Firebase sign-in).  Collab writes still need a SQL user id for social
 * records, so synchronize that account at the write boundary.
 */
async function ensureSqlUserId(jwtUser: any): Promise<number> {
  if (Number.isInteger(jwtUser.userId) && jwtUser.userId > 0) {
    return jwtUser.userId;
  }

  if (!jwtUser.uid) {
    throw new Error('Firebase identity is required for Collab profiles');
  }
  if (!jwtUser.email) {
    throw new Error('Firebase account email is required for Collab profiles');
  }

  let user = await storage.getUserByFirebaseUid(jwtUser.uid);
  if (!user && jwtUser.email) {
    user = await storage.getUserByEmail(jwtUser.email);
    if (user && user.uid && user.uid !== jwtUser.uid) {
      throw new Error('This email is already linked to another authentication account');
    }
  }

  if (!user) {
    const rawUsername = String(jwtUser.username || jwtUser.email?.split('@')[0] || 'user')
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 20) || 'user';
    let username = rawUsername.length >= 3 ? rawUsername : `${rawUsername}user`.slice(0, 20);

    // Avoid selecting a username that can be taken by another account.  The
    // unique constraint remains the final authority for concurrent requests.
    for (let suffix = 1; await storage.getUserByUsername(username); suffix++) {
      const suffixText = `_${suffix}`;
      username = `${rawUsername.slice(0, 30 - suffixText.length)}${suffixText}`;
    }

    try {
      user = await storage.createUser({
        uid: jwtUser.uid,
        username,
        email: jwtUser.email,
        password: null,
        phone: null,
        role: 'student',
      });
    } catch (error) {
      if (!isUniqueConstraintError(error)) throw error;
      // A concurrent smart-login/profile request won the insert race.
      user = await storage.getUserByFirebaseUid(jwtUser.uid);
      if (!user && jwtUser.email) user = await storage.getUserByEmail(jwtUser.email);
      if (!user) throw error;
    }
  }

  jwtUser.userId = user.id;
  jwtUser.username = user.username;
  jwtUser.email = user.email || jwtUser.email;
  jwtUser.role = user.role;
  return user.id;
}

/**
 * GET /student-profile
 * Get current user's student profile for collab (Firebase Firestore)
 */
router.get('/student-profile', verifyJWT, async (req: Request, res: Response) => {
  try {
    const jwtUser = (req as any).jwtUser;
    if (!jwtUser.uid) {
      return res.status(401).json({ message: 'Firebase authentication is required' });
    }
    
    // Security: Only allow users to fetch their own profile
    const profile = await collabFirestore.getProfileByUid(jwtUser.uid);
    
    if (!profile) {
      return res.status(404).json({ message: 'No profile found' });
    }
    
    // DEBUG: Log avatarUrl to check if it exists (safely handle union type)
    const avatarUrl = 'avatarUrl' in profile ? profile.avatarUrl : 'NOT SET';
    
    // Normalize timestamps and ID for API compatibility
    const normalizedProfile = normalizeProfile(profile);
    const normalizedAvatarUrl = 'avatarUrl' in normalizedProfile ? normalizedProfile.avatarUrl : 'NOT SET';
    res.json(normalizedProfile);
  } catch (error) {
    res.status(500).json({ message: 'Failed to get profile' });
  }
});

/**
 * GET /profile-picture-upload-url
 * Get presigned URL for uploading profile picture to Object Storage
 */
router.get('/profile-picture-upload-url', verifyJWT, async (req: Request, res: Response) => {
  try {
    const { objectStorage } = await import('../objectStorage');
    const uploadUrl = await objectStorage.getProfilePictureUploadURL();
    res.json({ uploadUrl });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get upload URL' });
  }
});

/**
 * POST /profile-picture-upload
 * Upload profile picture directly through backend (CORS workaround)
 */
router.post('/profile-picture-upload', verifyJWT, upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Get Firebase Storage bucket
    const bucket = admin.storage().bucket();
    
    // Sanitise filename and generate unique path
    const safeOriginal = req.file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    const filename = `profile-pictures/${uuidv4()}-${safeOriginal}`;
    const downloadToken = uuidv4();
    const fileRef = bucket.file(filename);

    // Upload with download token — avoids makePublic() which fails on
    // uniform-access-control Firebase Storage buckets
    await fileRef.save(req.file.buffer, {
      metadata: {
        contentType: req.file.mimetype,
        metadata: { firebaseStorageDownloadTokens: downloadToken },
      },
    });

    // Standard Firebase Storage download URL
    const encodedFilename = encodeURIComponent(filename);
    const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodedFilename}?alt=media&token=${downloadToken}`;
    
    
    // Ensure JSON response with proper content-type
    res.setHeader('Content-Type', 'application/json');
    return res.status(200).json({ url: publicUrl });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to upload file';
    res.setHeader('Content-Type', 'application/json');
    return res.status(500).json({ error: errorMessage });
  }
});

/**
 * POST /lancing/upload
 * Upload files for StudentLancing (profile images, resumes) via Firebase Storage Admin SDK
 * This bypasses client-side security rules
 */
router.post('/lancing/upload', verifyFirebaseToken, upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const firebaseUser = (req as any).firebaseUser;
    const fileType = req.body.fileType || 'avatar'; // 'avatar', 'resume', 'certificate'

    // Magic-bytes check for PDFs and images
    if (!verifyMagicBytes(req.file.buffer, req.file.mimetype)) {
      return res.status(400).json({ error: 'File content does not match declared type' });
    }

    // Get Firebase Storage bucket
    const bucket = admin.storage().bucket();

    // Sanitise original filename to remove path-traversal characters
    const safeOriginal = req.file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');

    // Generate path based on file type
    let filename: string;
    if (fileType === 'resume') {
      filename = `lancing/profiles/${firebaseUser.uid}/resume-${uuidv4()}.pdf`;
    } else if (fileType === 'certificate') {
      filename = `lancing/profiles/${firebaseUser.uid}/certificate-${uuidv4()}.pdf`;
    } else if (fileType === 'logo') {
      filename = `lancing/companies/${firebaseUser.uid}/logo-${uuidv4()}-${safeOriginal}`;
    } else if (fileType === 'photo') {
      filename = `lancing/angels/${firebaseUser.uid}/photo-${uuidv4()}-${safeOriginal}`;
    } else {
      filename = `lancing/profiles/${firebaseUser.uid}/avatar-${uuidv4()}-${safeOriginal}`;
    }

    // Generate a download token so we can produce a stable Firebase Storage URL
    // without relying on makePublic() (which fails on uniform-access-control buckets)
    const downloadToken = uuidv4();

    const fileRef = bucket.file(filename);
    await fileRef.save(req.file.buffer, {
      metadata: {
        contentType: req.file.mimetype,
        metadata: {
          firebaseStorageDownloadTokens: downloadToken,
        },
      },
    });

    // Build the standard Firebase Storage download URL
    const encodedFilename = encodeURIComponent(filename);
    const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodedFilename}?alt=media&token=${downloadToken}`;

    res.setHeader('Content-Type', 'application/json');
    return res.status(200).json({ url: publicUrl });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to upload file';
    console.error('[LANCING UPLOAD] error:', errorMessage);
    res.setHeader('Content-Type', 'application/json');
    return res.status(500).json({ error: errorMessage });
  }
});


/**
 * POST /student-profile
 * Create student profile for collab (Firebase Firestore)
 */
router.post('/student-profile', verifyJWT, async (req: Request, res: Response) => {
  try {
    const jwtUser = (req as any).jwtUser;
    if (!jwtUser.uid || !jwtUser.email) {
      return res.status(401).json({ message: 'Firebase authentication is required' });
    }

    const sqlUserId = await ensureSqlUserId(jwtUser);
    
    // Security: Check if profile already exists to prevent duplicate creation
    const existingProfile = await collabFirestore.getProfileByUid(jwtUser.uid);
    if (existingProfile) {
      return res.status(409).json({ 
        message: 'Profile already exists',
        error: 'PROFILE_EXISTS' 
      });
    }
    
    // Normalize avatar URL if present (convert Google Storage URLs to /objects/... format)
    const profileData = { 
      ...req.body,
      // Add required fields from JWT for security and schema validation
      uid: jwtUser.uid,
      userId: sqlUserId,
      email: jwtUser.email,
    };
    
    if (profileData.avatarUrl) {
      const { objectStorage } = await import('../objectStorage');
      profileData.avatarUrl = objectStorage.normalizeObjectEntityPath(profileData.avatarUrl);
    }
    
    // Ensure role is always set - default to 'Student' if not provided
    if (!profileData.role) {
      profileData.role = 'Student';
    }
    
    // Ensure username is set - generate from email if not provided
    if (!profileData.username) {
      profileData.username = (jwtUser.username || jwtUser.email.split('@')[0] || `user${Date.now()}`).slice(0, 20);
    }

    const validationResult = parseCollabProfilePayload(profileData);
    if (!validationResult.success) {
      return res.status(400).json({
        message: 'Invalid profile data',
        errors: validationResult.error.errors,
      });
    }

    const profile = await collabFirestore.createProfile(
      jwtUser.uid,
      sqlUserId,
      validationResult.data
    );
    
    // Normalize timestamps and ID for API compatibility
    res.status(201).json(normalizeProfile(profile));
  } catch (error) {
    console.error('[student-profile POST] Error creating profile:', error);
    if (error instanceof ProfileAlreadyExistsError || (error as any)?.code === 'PROFILE_EXISTS') {
      return res.status(409).json({ message: 'Profile already exists', error: 'PROFILE_EXISTS' });
    }
    res.status(500).json({ message: 'Failed to create profile' });
  }
});

/**
 * PUT /student-profile
 * Update student profile for collab (Firebase Firestore)
 */
router.put('/student-profile', verifyJWT, async (req: Request, res: Response) => {
  try {
    const jwtUser = (req as any).jwtUser;
    if (!jwtUser.uid || !jwtUser.email) {
      return res.status(401).json({ message: 'Firebase authentication is required' });
    }
    await ensureSqlUserId(jwtUser);
    
    // Normalize avatar URL if present (convert Google Storage URLs to /objects/... format)
    const updateData = { ...req.body };
    if (updateData.avatarUrl) {
      const { objectStorage } = await import('../objectStorage');
      updateData.avatarUrl = objectStorage.normalizeObjectEntityPath(updateData.avatarUrl);
    }
    
    // Security: Enforce ownership - only allow users to update their own profile
    // Note: req.body uid/userId fields are ignored - we use verified JWT uid
    const profile = await collabFirestore.updateProfile(jwtUser.uid, updateData);
    
    if (!profile) {
      return res.status(404).json({ message: 'Profile not found' });
    }
    
    // Normalize timestamps and ID for API compatibility
    res.json(normalizeProfile(profile));
  } catch (error) {
    res.status(500).json({ message: 'Failed to update profile' });
  }
});

/**
 * POST /profile
 * Create profile for any supported role (Student, Professional, Organisation,
 * plus legacy Club/Community/Company payloads) in Firestore.
 */
router.post('/profile', verifyJWT, async (req: Request, res: Response) => {
  try {
    const jwtUser = (req as any).jwtUser;
    if (!jwtUser.uid || !jwtUser.email) {
      return res.status(401).json({ message: 'Firebase authentication is required' });
    }
    const sqlUserId = await ensureSqlUserId(jwtUser);
    
    // Security: Check if profile already exists to prevent duplicate creation
    const existingProfile = await collabFirestore.getProfileByUid(jwtUser.uid);
    if (existingProfile) {
      return res.status(409).json({ 
        message: 'Profile already exists',
        error: 'PROFILE_EXISTS' 
      });
    }
    
    // Add required fields from JWT to profile data
    const profileData = {
      ...req.body,
      uid: jwtUser.uid, // Ensure UID matches JWT
      userId: sqlUserId, // Include PostgreSQL ID
      email: jwtUser.email, // Ensure email is set from verified JWT
    };
    
    // Normalize avatar URL if present (convert Google Storage URLs to /objects/... format)
    if (profileData.avatarUrl) {
      const { objectStorage } = await import('../objectStorage');
      profileData.avatarUrl = objectStorage.normalizeObjectEntityPath(profileData.avatarUrl);
    }
    
    // Validate profile data using the role-aware Collab contract.
    const validationResult = parseCollabProfilePayload(profileData);
    
    if (!validationResult.success) {
      return res.status(400).json({ 
        message: 'Invalid profile data',
        errors: validationResult.error.errors 
      });
    }
    
    // Create profile in Firestore using validated data
    const profile = await collabFirestore.createProfile(
      jwtUser.uid,
      jwtUser.userId,
      validationResult.data
    );
    
    // Normalize timestamps and ID for API compatibility
    res.status(201).json(normalizeProfile(profile));
  } catch (error) {
    if (error instanceof ProfileAlreadyExistsError || (error as any)?.code === 'PROFILE_EXISTS') {
      return res.status(409).json({ message: 'Profile already exists', error: 'PROFILE_EXISTS' });
    }
    res.status(500).json({ message: 'Failed to create profile' });
  }
});

/**
 * PUT /profile
 * Update profile for any role (Firebase Firestore)
 */
router.put('/profile', verifyJWT, async (req: Request, res: Response) => {
  try {
    const jwtUser = (req as any).jwtUser;
    if (!jwtUser.uid || !jwtUser.email) {
      return res.status(401).json({ message: 'Firebase authentication is required' });
    }
    const sqlUserId = await ensureSqlUserId(jwtUser);
    
    // Get existing profile to preserve role and validate
    const existingProfile = await collabFirestore.getProfileByUid(jwtUser.uid);
    if (!existingProfile) {
      return res.status(404).json({ message: 'Profile not found' });
    }
    
    // Merge update data with existing profile data
    const updateData = {
      ...existingProfile,
      ...req.body,
      uid: jwtUser.uid, // Ensure UID cannot be changed
      userId: existingProfile.userId || sqlUserId, // Ensure userId cannot be changed
      role: existingProfile.role, // SECURITY: never trust role from client body
    };
    
    // Normalize avatar URL if present (convert Google Storage URLs to /objects/... format)
    if (updateData.avatarUrl) {
      const { objectStorage } = await import('../objectStorage');
      updateData.avatarUrl = objectStorage.normalizeObjectEntityPath(updateData.avatarUrl);
    }
    
    // Validate updated profile data using the role-aware Collab contract.
    const validationResult = parseCollabProfilePayload(updateData);
    
    if (!validationResult.success) {
      return res.status(400).json({ 
        message: 'Invalid profile data',
        errors: validationResult.error.errors 
      });
    }
    
    // Update profile in Firestore using validated data
    const profile = await collabFirestore.updateProfile(jwtUser.uid, validationResult.data);
    
    if (!profile) {
      return res.status(404).json({ message: 'Profile not found' });
    }
    
    // Normalize timestamps and ID for API compatibility
    res.json(normalizeProfile(profile));
  } catch (error) {
    res.status(500).json({ message: 'Failed to update profile' });
  }
});

/**
 * GET /connections
 * Get user's connections for collab
 */
router.get('/connections', verifyJWT, async (req: Request, res: Response) => {
  try {
    const jwtUser = (req as any).jwtUser;
    const connections = await storage.getUserConnections(jwtUser.userId);
    
    res.json(connections);
  } catch (error) {
    res.status(500).json({ message: 'Failed to get connections' });
  }
});

/**
 * POST /connections/request
 * Send connection request for collab (uses Firestore ConnectionService)
 */
router.post('/connections/request', verifyJWT, async (req: Request, res: Response) => {
  try {
    const jwtUser = (req as any).jwtUser;
    const { targetUserId } = req.body;
    
    
    if (!targetUserId) {
      return res.status(400).json({ error: 'targetUserId is required' });
    }
    
    // Use the Firestore ConnectionService
    const { ConnectionService } = await import('../connection-service');
    const connectionService = new ConnectionService();
    const result = await connectionService.sendRequest(jwtUser.uid, targetUserId);
    
    
    if (!result.success) {
      return res.status(400).json({ error: result.message });
    }
    
    res.status(201).json({ message: result.message, success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to send connection request' });
  }
});

/**
 * PUT /connections/:id/respond
 * Respond to connection request for collab
 */
router.put('/connections/:id/respond', verifyJWT, async (req: Request, res: Response) => {
  try {
    const jwtUser = (req as any).jwtUser;
    const connectionId = parseInt(req.params.id);
    const { status } = req.body;
    
    // Verify user is the receiver of this connection request
    const connection = await storage.getConnection(connectionId, jwtUser.userId);
    if (!connection || connection.receiverId !== jwtUser.userId) {
      return res.status(403).json({ message: 'Unauthorized' });
    }
    
    const updatedConnection = await storage.updateConnectionStatus(connectionId, status);
    
    if (!updatedConnection) {
      return res.status(404).json({ message: 'Connection not found' });
    }
    
    res.json(updatedConnection);
  } catch (error) {
    res.status(500).json({ message: 'Failed to respond to connection' });
  }
});

/**
 * Object Storage endpoints for profile pictures
 */

// GET upload URL for profile picture
router.post('/profile-picture/upload-url', verifyJWT, async (req: Request, res: Response) => {
  try {
    const uploadURL = '/api/upload-placeholder'; // Simplified for now
    res.json({ uploadURL });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get upload URL' });
  }
});

// Export the router
export default router;