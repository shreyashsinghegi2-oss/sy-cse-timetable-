import express, { Request, Response } from 'express';
import { verifyJWT } from './firebase-auth';
import { connectionService } from '../connection-service';
import { cacheService } from '../cache-service';
import { z } from 'zod';
import { PLATFORM_OWNER_UID, SEED_CONNECTION_UIDS } from '../config/constants';


// Auto-fix connections data after Firebase initializes
setTimeout(async () => {
  try {
    const admin = await import('firebase-admin');
    const db = admin.default.firestore();
    
    const profileRef = db.collection('studentProfiles').doc(PLATFORM_OWNER_UID);
    const profileDoc = await profileRef.get();
    
    if (profileDoc.exists) {
      const data = profileDoc.data();
      const currentConnections = data?.connections || [];
      
      // Add missing connections
      const shouldHave = SEED_CONNECTION_UIDS;
      const missing = shouldHave.filter(uid => !currentConnections.includes(uid));
      
      if (missing.length > 0) {
        await profileRef.update({
          connections: [...currentConnections, ...missing]
        });
        
        // Clear cache
        cacheService.invalidate(`connections:${hrishikeshUid}`);
      } else {
      }
    }
  } catch (error) {
  }
}, 5000); // Wait 5 seconds for Firebase to initialize

const router = express.Router();

// Validation schemas
const sendRequestSchema = z.object({
  targetUserId: z.string().min(1)
});

const acceptRejectSchema = z.object({
  requesterId: z.string().min(1)
});

/**
 * POST /request
 * Send a connection request
 */
router.post('/request', verifyJWT, async (req: Request, res: Response) => {
  try {
    const jwtUser = (req as any).jwtUser;
    const { targetUserId } = sendRequestSchema.parse(req.body);

    const result = await connectionService.sendRequest(jwtUser.uid, targetUserId);

    if (result.success) {
      res.json({ success: true, message: result.message });
    } else {
      res.status(400).json({ success: false, error: result.message });
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request data' });
    }
    res.status(500).json({ error: 'Failed to send connection request' });
  }
});

/**
 * POST /accept
 * Accept a connection request
 */
router.post('/accept', verifyJWT, async (req: Request, res: Response) => {
  try {
    const jwtUser = (req as any).jwtUser;
    const { requesterId } = acceptRejectSchema.parse(req.body);

    const result = await connectionService.acceptRequest(jwtUser.uid, requesterId);

    if (result.success) {
      res.json({ success: true, message: result.message });
    } else {
      res.status(400).json({ success: false, error: result.message });
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request data' });
    }
    res.status(500).json({ error: 'Failed to accept connection request' });
  }
});

/**
 * POST /reject
 * Reject a connection request
 */
router.post('/reject', verifyJWT, async (req: Request, res: Response) => {
  try {
    const jwtUser = (req as any).jwtUser;
    const { requesterId } = acceptRejectSchema.parse(req.body);

    const result = await connectionService.rejectRequest(jwtUser.uid, requesterId);

    if (result.success) {
      res.json({ success: true, message: result.message });
    } else {
      res.status(400).json({ success: false, error: result.message });
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request data' });
    }
    res.status(500).json({ error: 'Failed to reject connection request' });
  }
});

/**
 * GET /status/:targetUserId
 * Get connection status with a specific user
 */
router.get('/status/:targetUserId', verifyJWT, async (req: Request, res: Response) => {
  try {
    const jwtUser = (req as any).jwtUser;
    const { targetUserId } = req.params;

    const status = await connectionService.getConnectionStatus(jwtUser.uid, targetUserId);
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get connection status' });
  }
});

/**
 * GET /requests
 * Get all pending connection requests (incoming)
 */
router.get('/requests', verifyJWT, async (req: Request, res: Response) => {
  try {
    const jwtUser = (req as any).jwtUser;
    
    const requests = await connectionService.getPendingRequests(jwtUser.uid);
    res.json({ requests });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get pending requests' });
  }
});

/**
 * GET /:userId
 * Get all connections for a user (optional userId, defaults to current user)
 */
router.get('/:userId?', verifyJWT, async (req: Request, res: Response) => {
  const jwtUser = (req as any).jwtUser;
  // SECURITY: always use the authenticated user's own UID.
  // Accepting an arbitrary userId from the URL would allow any logged-in user
  // to enumerate any other user's social graph (IDOR).
  const userId = jwtUser.uid;
  if (req.params.userId && req.params.userId !== userId) {
    return res.status(403).json({ error: 'You can only view your own connections.' });
  }
  
  const cacheKey = `connections:${userId}`;
  const cached = cacheService.get(cacheKey);
  
  if (cached) {
    return res.json(cached);
  }
  
  try {
    const admin = await import('firebase-admin');
    const db = admin.default.firestore();
    
    const userDoc = await db.collection('studentProfiles').doc(userId).get();
    
    
    if (!userDoc.exists) {
      return res.json({ connections: [], count: 0 });
    }
    
    const userData = userDoc.data();
    const connectionIds = userData?.connections || [];
    
    
    if (connectionIds.length === 0) {
      const result = { connections: [], count: 0 };
      cacheService.set(cacheKey, result, 30000);
      return res.json(result);
    }
    
    const connectionProfiles = await Promise.all(
      connectionIds.map(async (connectionId: string) => {
        const profileCacheKey = `profile:${connectionId}`;
        const cachedProfile = cacheService.get(profileCacheKey);
        
        if (cachedProfile) {
          return cachedProfile;
        }
        
        const profileDoc = await db.collection('studentProfiles').doc(connectionId).get();
        if (profileDoc.exists) {
          const profile = {
            uid: connectionId,
            ...profileDoc.data()
          };
          cacheService.set(profileCacheKey, profile, 120000);
          return profile;
        }
        return null;
      })
    );
    
    const validConnections = connectionProfiles.filter(p => p !== null);
    const result = { connections: validConnections, count: validConnections.length };
    
    cacheService.set(cacheKey, result, 30000);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get connections' });
  }
});

/**
 * GET /mutual/:targetUserId
 * Get mutual connections with another user
 */
router.get('/mutual/:targetUserId', verifyJWT, async (req: Request, res: Response) => {
  try {
    const jwtUser = (req as any).jwtUser;
    const { targetUserId } = req.params;

    const mutualConnections = await connectionService.getMutualConnections(jwtUser.uid, targetUserId);
    res.json({ mutualConnections, count: mutualConnections.length });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get mutual connections' });
  }
});

// TEMP: Fix connections data inconsistency
router.post('/fix-my-connections', verifyJWT, async (req: Request, res: Response) => {
  try {
    const jwtUser = (req as any).jwtUser;
    const admin = await import('firebase-admin');
    const db = admin.default.firestore();
    
    // Get user's profile
    const userRef = db.collection('studentProfiles').doc(jwtUser.uid);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'Profile not found' });
    }
    
    const userData = userDoc.data();
    const currentConnections = userData?.connections || [];
    
    
    // Find all users who have this user in their connections
    const allProfilesSnapshot = await db.collection('studentProfiles').get();
    const shouldBeConnectedTo: string[] = [];
    
    allProfilesSnapshot.docs.forEach((doc) => {
      if (doc.id !== jwtUser.uid) {
        const data = doc.data();
        const theirConnections = data.connections || [];
        if (theirConnections.includes(jwtUser.uid)) {
          shouldBeConnectedTo.push(doc.id);
        }
      }
    });
    
    
    // Update connections array with missing connections
    if (shouldBeConnectedTo.length > 0) {
      await userRef.update({
        connections: Array.from(new Set([...currentConnections, ...shouldBeConnectedTo]))
      });
      
      // Invalidate cache
      cacheService.invalidate(`connections:${jwtUser.uid}`);
      
      return res.json({ 
        success: true, 
        message: 'Connections fixed', 
        added: shouldBeConnectedTo.filter(uid => !currentConnections.includes(uid))
      });
    }
    
    res.json({ success: true, message: 'No fixes needed' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fix connections' });
  }
});

export default router;
