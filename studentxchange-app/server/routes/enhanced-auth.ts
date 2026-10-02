import { Router } from "express";
import type { Request, Response } from "express";
import { DatabaseStorage } from "../storage";
import { AuthSyncService } from "../services/auth-sync-service";
import { z } from "zod";
import bcrypt from "bcrypt";
import crypto from "crypto";

const router = Router();
const storage = new DatabaseStorage();
const authSyncService = new AuthSyncService(storage);

// Enhanced login that checks PostgreSQL first, then Firebase fallback
router.post("/auth/smart-login", async (req: Request, res: Response) => {
  try {
    const loginSchema = z.object({
      email: z.string().email(),
      password: z.string().optional(), // Optional for Firebase-only flow
      firebaseIdToken: z.string().optional(), // For Firebase authentication
    });

    const { email, password, firebaseIdToken } = loginSchema.parse(req.body);

    // Step 1: Check if user exists in PostgreSQL
    const existingUser = await storage.getUserByEmail(email);

    if (existingUser && password && existingUser.password) {
      // Existing PostgreSQL user - use traditional authentication
      
      const isValidPassword = await bcrypt.compare(password, existingUser.password);
      if (!isValidPassword) {
        return res.status(401).json({ 
          error: "Invalid credentials",
          loginType: "traditional" 
        });
      }

      // Successful PostgreSQL login
      req.session.userId = existingUser.id;
      
      // Sync to Firebase and get the real Firebase UID
      const firebaseUid = await authSyncService.syncUserToFirebase(existingUser);

      return res.json({
        message: "Login successful",
        loginType: "traditional",
        user: {
          id: existingUser.id,
          username: existingUser.username,
          email: existingUser.email,
          uid: firebaseUid || existingUser.id.toString() // Use real Firebase UID
        }
      });

    } else if (!existingUser && firebaseIdToken) {
      // New user - Firebase authentication path
      
      const result = await authSyncService.verifyFirebaseTokenWithUid(firebaseIdToken);
      if (!result) {
        return res.status(401).json({ 
          error: "Firebase authentication failed",
          loginType: "firebase" 
        });
      }

      // Firebase user already exists in PostgreSQL (created during verification)
      req.session.userId = result.user.id;

      return res.json({
        message: "Login successful via Firebase",
        loginType: "firebase",
        user: {
          id: result.user.id,
          username: result.user.username,
          email: result.user.email,
          uid: result.firebaseUid // Use real Firebase UID from token
        }
      });

    } else if (!existingUser && password) {
      // User doesn't exist, suggest Firebase registration
      return res.status(404).json({
        error: "Account not found. Please register using the Firebase option.",
        loginType: "not_found",
        suggestFirebase: true
      });

    } else {
      return res.status(400).json({
        error: "Invalid login request. Please provide either password for existing account or Firebase token for new account.",
        loginType: "invalid_request"
      });
    }

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid input", details: error.errors });
    }
    return res.status(500).json({ error: "Login failed" });
  }
});

// Firebase registration for new users
router.post("/auth/firebase-register", async (req: Request, res: Response) => {
  try {
    const registerSchema = z.object({
      firebaseIdToken: z.string(),
      username: z.string().min(3).max(50),
      phone: z.string().min(10)
    });

    const { firebaseIdToken, username, phone } = registerSchema.parse(req.body);

    // Verify Firebase token to get user info
    const result = await authSyncService.verifyFirebaseTokenWithUid(firebaseIdToken);
    if (!result) {
      return res.status(401).json({ error: "Invalid Firebase token" });
    }

    // Check if user already exists
    const existingUser = await storage.getUserByEmail(result.user.email);
    if (existingUser) {
      return res.status(409).json({ error: "User already exists. Please use regular login." });
    }

    // Create user in PostgreSQL
    // Hash a random placeholder so the column is never plaintext
    const placeholderHash = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10);
    const newUser = await storage.createUser({
      username,
      email: result.user.email,
      password: placeholderHash,
      phone
    });

    // Sync to Firebase
    await authSyncService.syncUserToFirebase(newUser);

    // Set session
    req.session.userId = newUser.id;

    return res.status(201).json({
      message: "Registration successful",
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        uid: result.firebaseUid // Use real Firebase UID from token
      }
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid input", details: error.errors });
    }
    return res.status(500).json({ error: "Registration failed" });
  }
});

// Check login status and determine authentication type
router.get("/auth/login-status", async (req: Request, res: Response) => {
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

export default router;