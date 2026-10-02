import { Router } from "express";
import type { Request, Response } from "express";
import { DatabaseStorage } from "../storage";
import { AuthSyncService } from "../services/auth-sync-service";
import { z } from "zod";

const router = Router();
const storage = new DatabaseStorage();
const authSyncService = new AuthSyncService(storage);

// Firebase token login - authenticate with Firebase, get PostgreSQL user
router.post("/auth/firebase-login", async (req: Request, res: Response) => {
  try {
    const { idToken } = req.body;
    
    if (!idToken) {
      return res.status(400).json({ error: "Firebase ID token required" });
    }

    // Verify Firebase token and get PostgreSQL user
    const user = await authSyncService.verifyFirebaseToken(idToken);
    
    if (!user) {
      return res.status(401).json({ error: "Invalid token or user not found" });
    }

    // Set session
    req.session.userId = user.id;
    
    return res.json({ 
      message: "Login successful", 
      user: { 
        id: user.id, 
        username: user.username, 
        email: user.email 
      } 
    });
    
  } catch (error) {
    return res.status(500).json({ error: "Login failed" });
  }
});

// Register new user - create in PostgreSQL and sync to Firebase
router.post("/auth/register-and-sync", async (req: Request, res: Response) => {
  try {
    const registerSchema = z.object({
      username: z.string().min(3).max(50),
      email: z.string().email(),
      password: z.string().min(6),
      phone: z.string().min(10)
    });

    const { username, email, password, phone } = registerSchema.parse(req.body);

    // Check if user already exists
    const existingUser = await storage.getUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({ error: "User already exists" });
    }

    // Create user in PostgreSQL first (source of truth)
    const newUser = await storage.createUser({
      username,
      email,
      password,
      phone
    });

    // Sync user to Firebase
    const firebaseUid = await authSyncService.syncUserToFirebase(newUser);
    
    if (firebaseUid) {
    }

    // Create custom token for immediate login
    const customToken = await authSyncService.createCustomTokenForUser(newUser);

    return res.status(201).json({
      message: "User created successfully",
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email
      },
      firebaseCustomToken: customToken
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid input", details: error.errors });
    }
    return res.status(500).json({ error: "Registration failed" });
  }
});

// Sync existing PostgreSQL user to Firebase
router.post("/auth/sync-to-firebase", async (req: Request, res: Response) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const user = await storage.getUser(req.session.userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Sync to Firebase and get custom token
    const firebaseUid = await authSyncService.syncUserToFirebase(user);
    const customToken = await authSyncService.createCustomTokenForUser(user);

    return res.json({
      message: "User synced to Firebase",
      firebaseUid,
      firebaseCustomToken: customToken
    });

  } catch (error) {
    return res.status(500).json({ error: "Sync failed" });
  }
});

export default router;