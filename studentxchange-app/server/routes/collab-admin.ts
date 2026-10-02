import express, { Request, Response, NextFunction } from 'express';
import { admin } from '../firebase-admin';
import { verifyJWT } from './firebase-auth';
import { COLLAB_ADMIN_EMAIL } from '../config/constants';

const router = express.Router();

const ADMIN_EMAIL = COLLAB_ADMIN_EMAIL;

const verifyAdmin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const jwtUser = (req as any).jwtUser;
    
    if (!jwtUser || !jwtUser.email) {
      return res.status(401).json({ error: 'Unauthorized - no user info' });
    }
    
    if (jwtUser.email.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
      return res.status(403).json({ error: 'Access denied - admin only' });
    }
    
    next();
  } catch (error) {
    console.error('Admin verification error:', error);
    return res.status(500).json({ error: 'Admin verification failed' });
  }
};

router.get('/verify', verifyJWT, verifyAdmin, async (req: Request, res: Response) => {
  res.json({ isAdmin: true, email: (req as any).jwtUser.email });
});

router.get('/analytics', verifyJWT, verifyAdmin, async (req: Request, res: Response) => {
  try {
    const db = admin.firestore();
    
    const [profilesSnapshot, postsSnapshot] = await Promise.all([
      db.collection('studentProfiles').get(),
      db.collection('posts').get()
    ]);
    
    const totalProfiles = profilesSnapshot.size;
    const totalPosts = postsSnapshot.size;
    
    let studentCount = 0, clubCount = 0, communityCount = 0, companyCount = 0;
    let justSignedUp = 0, partialProfile = 0, completeProfile = 0;
    
    profilesSnapshot.docs.forEach(doc => {
      const data = doc.data();
      switch (data.role) {
        case 'Student': studentCount++; break;
        case 'Club': clubCount++; break;
        case 'Community': communityCount++; break;
        case 'Company': companyCount++; break;
      }
      const hasName = !!(data.name || data.username || data.clubName || data.communityName || data.companyName);
      const hasPhone = !!(data.phone || data.phoneNumber);
      const hasBio = !!(data.bio);
      const hasRole = !!(data.role);
      const hasEmail = !!(data.email);
      if (!hasName) { justSignedUp++; }
      else if (hasName && hasEmail && hasPhone && hasRole && hasBio) { completeProfile++; }
      else { partialProfile++; }
    });
    
    let directPosts = 0, groupPosts = 0, eventPosts = 0;
    postsSnapshot.docs.forEach(doc => {
      const data = doc.data();
      switch (data.type) {
        case 'direct': directPosts++; break;
        case 'group': groupPosts++; break;
        case 'event': eventPosts++; break;
      }
    });
    
    res.json({
      totalProfiles,
      totalPosts,
      profilesByRole: { student: studentCount, club: clubCount, community: communityCount, company: companyCount },
      postsByType: { direct: directPosts, group: groupPosts, event: eventPosts },
      profileCompletion: { justSignedUp, partialProfile, completeProfile }
    });
  } catch (error) {
    console.error('Failed to get admin analytics:', error);
    res.status(500).json({ error: 'Failed to get analytics' });
  }
});

router.get('/posts', verifyJWT, verifyAdmin, async (req: Request, res: Response) => {
  try {
    const db = admin.firestore();
    const snapshot = await db.collection('posts')
      .orderBy('createdAt', 'desc')
      .limit(100)
      .get();
    
    const posts = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.() || data.createdAt
      };
    });
    
    res.json(posts);
  } catch (error) {
    console.error('Failed to get posts:', error);
    res.status(500).json({ error: 'Failed to get posts' });
  }
});

router.delete('/posts/:postId', verifyJWT, verifyAdmin, async (req: Request, res: Response) => {
  try {
    const { postId } = req.params;
    const db = admin.firestore();
    
    const postRef = db.collection('posts').doc(postId);
    const postDoc = await postRef.get();
    
    if (!postDoc.exists) {
      return res.status(404).json({ error: 'Post not found' });
    }
    
    await postRef.delete();
    
    res.json({ success: true, message: 'Post deleted successfully' });
  } catch (error) {
    console.error('Failed to delete post:', error);
    res.status(500).json({ error: 'Failed to delete post' });
  }
});

router.get('/profiles', verifyJWT, verifyAdmin, async (req: Request, res: Response) => {
  try {
    const db = admin.firestore();
    const snapshot = await db.collection('studentProfiles')
      .orderBy('createdAt', 'desc')
      .limit(500)
      .get();
    
    const profiles = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.() || data.createdAt
      };
    });
    
    res.json(profiles);
  } catch (error) {
    console.error('Failed to get profiles:', error);
    res.status(500).json({ error: 'Failed to get profiles' });
  }
});

router.delete('/profiles/:profileId', verifyJWT, verifyAdmin, async (req: Request, res: Response) => {
  try {
    const { profileId } = req.params;
    const jwtUser = (req as any).jwtUser;
    const db = admin.firestore();
    
    const profileRef = db.collection('studentProfiles').doc(profileId);
    const profileDoc = await profileRef.get();
    
    if (!profileDoc.exists) {
      return res.status(404).json({ error: 'Profile not found' });
    }
    
    const profileData = profileDoc.data();
    
    if (profileData?.uid === jwtUser.uid || profileData?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
      return res.status(400).json({ error: 'Cannot delete your own admin profile' });
    }
    
    await profileRef.delete();
    
    res.json({ success: true, message: 'Profile deleted successfully' });
  } catch (error) {
    console.error('Failed to delete profile:', error);
    res.status(500).json({ error: 'Failed to delete profile' });
  }
});

router.patch('/profiles/:profileId/disable', verifyJWT, verifyAdmin, async (req: Request, res: Response) => {
  try {
    const { profileId } = req.params;
    const { disabled } = req.body;
    const jwtUser = (req as any).jwtUser;
    const db = admin.firestore();
    
    const profileRef = db.collection('studentProfiles').doc(profileId);
    const profileDoc = await profileRef.get();
    
    if (!profileDoc.exists) {
      return res.status(404).json({ error: 'Profile not found' });
    }
    
    const profileData = profileDoc.data();
    
    if (profileData?.uid === jwtUser.uid || profileData?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
      return res.status(400).json({ error: 'Cannot disable your own admin profile' });
    }
    
    await profileRef.update({ 
      disabled: disabled === true,
      updatedAt: new Date()
    });
    
    res.json({ success: true, message: disabled ? 'Profile disabled' : 'Profile enabled' });
  } catch (error) {
    console.error('Failed to update profile status:', error);
    res.status(500).json({ error: 'Failed to update profile status' });
  }
});

export default router;
