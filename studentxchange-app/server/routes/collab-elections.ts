import express, { Request, Response } from 'express';
import { verifyJWT } from './firebase-auth';
import { collabFirestore, type NomineeRole } from '../collab-firestore-service';
import { z } from 'zod';
import multer from 'multer';
import admin from 'firebase-admin';

const router = express.Router();

// Configure multer for memory storage
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// Validation schemas
const createNomineeSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  role: z.enum(['President', 'Secretary', 'Treasurer']),
  club: z.string().min(1, 'Club name is required'),
  bio: z.string().min(1, 'Bio is required'),
  imageUrl: z.string().min(1, 'Image URL is required'),
});

const castVoteSchema = z.object({
  nomineeId: z.string().min(1, 'Nominee ID is required'),
  role: z.enum(['President', 'Secretary', 'Treasurer']),
  club: z.string().min(1, 'Club name is required'),
});

/**
 * GET /nominees
 * Get all nominees
 */
router.get('/nominees', verifyJWT, async (req: Request, res: Response) => {
  try {
    const nominees = await collabFirestore.getAllNominees();
    res.json(nominees);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get nominees' });
  }
});

/**
 * POST /upload-nominee-photo
 * Upload a nominee photo to Firebase Storage (admin only)
 */
router.post('/upload-nominee-photo', verifyJWT, upload.single('photo'), async (req: Request, res: Response) => {
  try {
    const jwtUser = (req as any).jwtUser;
    
    // Admin check
    if (jwtUser.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can upload photos' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Upload to Firebase Storage using Admin SDK
    const bucket = admin.storage().bucket();
    const fileName = `nominees/${Date.now()}_${req.file.originalname}`;
    const file = bucket.file(fileName);

    await file.save(req.file.buffer, {
      metadata: {
        contentType: req.file.mimetype,
      },
    });

    // Make file publicly accessible
    await file.makePublic();

    // Get public URL
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;

    res.json({ url: publicUrl });
  } catch (error) {
    res.status(500).json({ error: 'Failed to upload photo' });
  }
});

/**
 * POST /nominees
 * Create a new nominee (admin only)
 */
router.post('/nominees', verifyJWT, async (req: Request, res: Response) => {
  try {
    const jwtUser = (req as any).jwtUser;
    
    // Admin check - only admins can add nominees
    if (jwtUser.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can add nominees' });
    }
    
    const nomineeData = createNomineeSchema.parse(req.body);
    
    const nominee = await collabFirestore.createNominee({
      name: nomineeData.name,
      role: nomineeData.role,
      club: nomineeData.club,
      bio: nomineeData.bio,
      imageUrl: nomineeData.imageUrl,
      votesCount: 0
    });
    
    res.status(201).json(nominee);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid nominee data', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to create nominee' });
  }
});

/**
 * DELETE /nominees/:id
 * Delete a nominee (admin only)
 */
router.delete('/nominees/:id', verifyJWT, async (req: Request, res: Response) => {
  try {
    const jwtUser = (req as any).jwtUser;
    
    // Admin check - only admins can delete nominees
    if (jwtUser.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can delete nominees' });
    }
    
    const { id } = req.params;
    await collabFirestore.deleteNominee(id);
    res.json({ success: true, message: 'Nominee deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete nominee' });
  }
});

/**
 * POST /vote
 * Cast a vote for a nominee
 */
router.post('/vote', verifyJWT, async (req: Request, res: Response) => {
  try {
    const jwtUser = (req as any).jwtUser;
    const voteData = castVoteSchema.parse(req.body);
    
    const vote = await collabFirestore.castVote(
      jwtUser.uid,
      voteData.nomineeId,
      voteData.role,
      voteData.club
    );
    
    res.json({ success: true, vote });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid vote data', details: error.errors });
    }
    if (error instanceof Error && error.message.includes('already voted')) {
      return res.status(403).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to cast vote' });
  }
});

/**
 * GET /my-votes
 * Get current user's votes
 */
router.get('/my-votes', verifyJWT, async (req: Request, res: Response) => {
  try {
    const jwtUser = (req as any).jwtUser;
    const votes = await collabFirestore.getUserVotes(jwtUser.uid);
    res.json(votes);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get votes' });
  }
});

/**
 * GET /my-voted-club
 * Get the club the user has voted in (null if no votes yet)
 */
router.get('/my-voted-club', verifyJWT, async (req: Request, res: Response) => {
  try {
    const jwtUser = (req as any).jwtUser;
    const votedClub = await collabFirestore.getUserVotedClub(jwtUser.uid);
    res.json({ club: votedClub });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get voted club' });
  }
});

/**
 * GET /vote-status/:role/:club
 * Check if user has voted for a specific role in a club
 */
router.get('/vote-status/:role/:club', verifyJWT, async (req: Request, res: Response) => {
  try {
    const jwtUser = (req as any).jwtUser;
    const { role, club } = req.params;
    
    if (!['President', 'Secretary', 'Treasurer'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }
    
    const vote = await collabFirestore.getUserVoteForRole(
      jwtUser.uid,
      role as NomineeRole,
      decodeURIComponent(club)
    );
    
    res.json({ 
      hasVoted: !!vote,
      vote: vote || null
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to check vote status' });
  }
});

export default router;
