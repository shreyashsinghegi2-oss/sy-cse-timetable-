import { Router, Request, Response } from 'express';
import { collabSocial } from '../collab-social-firestore';
import { collabFirestore } from '../collab-firestore-service';
import { verifyJWT } from './firebase-auth';
import { objectStorage } from '../objectStorage';
import { COLLAB_ADMIN_EMAIL, STATETECH_ADMIN_EMAILS } from '../config/constants';

// Centralised admin constants — see server/config/constants.ts to update
const COLLAB_ADMIN = COLLAB_ADMIN_EMAIL;
const STATETECH_ADMINS_LIST = STATETECH_ADMIN_EMAILS;
import { NotificationService } from '../notification-service';
import multer from 'multer';
import { admin } from '../firebase-admin';
import { randomUUID } from 'crypto';

import { rateLimitMiddleware } from '../middleware/rate-limiter';
import { LIMITS, validateFileUpload } from '../middleware/request-validator';
import { strictFileFilter } from '../utils/upload-filter';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { 
    fileSize: 50 * 1024 * 1024,
    files: 5
  },
  fileFilter: strictFileFilter,
});

const router = Router();
let notificationService: NotificationService | null = null;

// Lazy initialization of notification service
function getNotificationService(): NotificationService {
  if (!notificationService) {
    notificationService = new NotificationService();
  }
  return notificationService;
}

// Helper to normalize Firestore timestamps AND media/avatar URLs
function normalizeData(data: any): any {
  if (Array.isArray(data)) {
    return data.map(item => normalizeData(item));
  }
  
  if (data && typeof data === 'object') {
    const normalized: any = {};
    for (const [key, value] of Object.entries(data)) {
      if (value && typeof value === 'object' && 'toISOString' in value && typeof (value as any).toISOString === 'function') {
        // Normalize timestamps
        normalized[key] = (value as any).toISOString();
      } else if ((key === 'avatarUrl' || key === 'mediaUrl') && typeof value === 'string') {
        // Normalize avatar and media URLs to ensure they work across all platforms
        normalized[key] = objectStorage.normalizeObjectEntityPath(value);
      } else if (key === 'profile' && value && typeof value === 'object') {
        // Recursively normalize profile objects (which contain avatarUrl)
        normalized[key] = normalizeData(value);
      } else {
        normalized[key] = value;
      }
    }
    return normalized;
  }
  
  return data;
}

// ========== MEDIA UPLOAD ==========

/**
 * POST /upload-media
 * Server-side upload to Firebase Storage using Admin SDK
 * This bypasses client-side Firebase auth requirements
 */
router.post('/upload-media', verifyJWT, rateLimitMiddleware.upload, upload.single('file'), validateFileUpload, async (req: Request, res: Response) => {
  try {
    const jwtUser = (req as any).jwtUser;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    // Get Firebase Storage bucket
    const bucket = admin.storage().bucket();
    
    // Create unique filename
    const timestamp = Date.now();
    const sanitizedFileName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    const fileName = `posts/${jwtUser.uid}/${timestamp}_${randomUUID()}_${sanitizedFileName}`;
    
    // Create file reference
    const fileRef = bucket.file(fileName);
    
    // Upload file buffer to Firebase Storage with cache headers
    await fileRef.save(file.buffer, {
      metadata: {
        contentType: file.mimetype,
        cacheControl: 'public, max-age=31536000', // Cache for 1 year
      },
      public: true, // Make file publicly accessible
    });
    
    // Make the file publicly readable
    await fileRef.makePublic();
    
    // Get public URL
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
    
    res.json({ 
      mediaUrl: publicUrl,
      fileName,
      contentType: file.mimetype
    });
  } catch (error: any) {
    console.error('Server-side upload error:', error);
    res.status(500).json({ error: 'Failed to upload media' });
  }
});

/**
 * POST /upload-url
 * Get a signed URL for uploading post media to Object Storage
 */
router.post('/upload-url', verifyJWT, async (req: Request, res: Response) => {
  try {
    const jwtUser = (req as any).jwtUser;
    const { fileExtension, contentType } = req.body;

    if (!fileExtension) {
      return res.status(400).json({ error: 'File extension is required' });
    }

    // Get signed upload URL from object storage
    const { uploadUrl, publicUrl, objectPath } = await objectStorage.getPostMediaUploadURL(
      jwtUser.uid,
      fileExtension.startsWith('.') ? fileExtension : `.${fileExtension}`
    );

    res.json({ 
      uploadUrl, 
      publicUrl,
      objectPath,
      contentType: contentType || 'application/octet-stream'
    });
  } catch (error: any) {
    console.error('Error generating upload URL:', error);
    res.status(500).json({ error: 'Failed to generate upload URL' });
  }
});

// ========== POSTS ==========

/**
 * POST /posts
 * Create a new post (direct, group, or event)
 */
router.post('/posts', verifyJWT, rateLimitMiddleware.post, async (req: Request, res: Response) => {
  try {
    const jwtUser = (req as any).jwtUser;
    const { 
      type, title, description, mediaUrl, mediaType, membersRequired, groupName, groupDescription, eventDate, eventTime, eventLink,
      // Arena-specific fields
      category, problemStatement, solution, toolsUsed, challengesFaced, learnings, proofOfWork, documentName
    } = req.body;

    if (!type || (type !== 'direct' && type !== 'group' && type !== 'event' && type !== 'arena')) {
      return res.status(400).json({ error: 'Valid post type (direct, group, event, or arena) is required' });
    }

    if (!description) {
      return res.status(400).json({ error: 'Description is required' });
    }

    if (type === 'group' && !membersRequired) {
      return res.status(400).json({ error: 'Members required is needed for group posts' });
    }

    if (type === 'group' && !groupName) {
      return res.status(400).json({ error: 'Group name is required for group posts' });
    }

    if (type === 'event') {
      if (!title) {
        return res.status(400).json({ error: 'Title is required for event posts' });
      }
      if (!eventDate) {
        return res.status(400).json({ error: 'Event date is required' });
      }
      if (!eventTime) {
        return res.status(400).json({ error: 'Event time is required' });
      }
    }

    // Arena post validation - simplified to work like regular posts
    if (type === 'arena') {
      if (!category || !['creative', 'idea', 'tech'].includes(category)) {
        return res.status(400).json({ error: 'Valid category (creative, idea, tech) is required for arena posts' });
      }
      // Verify user has a confirmed arena registration for this category
      const db = admin.firestore();
      const registrationsSnapshot = await db.collection('arenaRegistrations')
        .where('uid', '==', jwtUser.uid)
        .where('status', '==', 'confirmed')
        .get();
      
      if (registrationsSnapshot.empty) {
        return res.status(403).json({ error: 'You must have a verified arena registration to post' });
      }
      
      // Check if user registered for this category across ALL their confirmed registrations
      const allUserCategories = new Set<string>();
      registrationsSnapshot.docs.forEach(doc => {
        const regData = doc.data();
        const cats = regData.categories || [];
        cats.forEach((c: string) => allUserCategories.add(c));
      });
      
      if (!allUserCategories.has(category)) {
        return res.status(403).json({ error: `You are not registered for the ${category} category. Your registered categories: ${Array.from(allUserCategories).join(', ')}` });
      }
      
      // Require profile for arena posts
      const arenaUserProfile = await collabFirestore.getProfileByUid(jwtUser.uid);
      if (!arenaUserProfile) {
        return res.status(403).json({ 
          error: 'You must create a Student Collab profile before posting in the Arena. Please complete your profile first.',
          needsProfile: true
        });
      }
      // Duplicate check will be done atomically in createArenaPost with deterministic document ID
    }

    // Fetch user profile to include in post
    const userProfile = await collabFirestore.getProfileByUid(jwtUser.uid);
    // Get the display name based on profile type
    const getDisplayName = (profile: any): string => {
      if (!profile) return 'Anonymous';
      switch (profile.role) {
        case 'Club': return profile.clubName || profile.name || 'Club';
        case 'Community': return profile.communityName || profile.name || 'Community';
        case 'Company': return profile.companyName || profile.name || 'Company';
        default: return profile.name || 'Anonymous';
      }
    };
    
    const profileData = userProfile ? {
      username: (userProfile as any).username,
      name: getDisplayName(userProfile),
      avatarUrl: (userProfile as any).avatarUrl ? objectStorage.normalizeObjectEntityPath((userProfile as any).avatarUrl) : undefined,
      role: userProfile.role || 'Student',
    } : {
      name: jwtUser.username || 'Anonymous',
      username: jwtUser.username,
      role: 'Student'
    };

    // Get current month in YYYY-MM format for arena posts
    const getCurrentMonth = () => {
      const now = new Date();
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    };

    // Ensure we have a valid userId (numeric) if needed, though Firestore uses UIDs
    const postData: any = {
      userId: Number(jwtUser.userId) || 0,
      uid: jwtUser.uid,
      type,
      title: type === 'event' || type === 'arena' ? title : undefined,
      description,
      mediaUrl,
      mediaType,
      membersRequired: type === 'group' ? Number(membersRequired) : undefined,
      currentMembers: type === 'group' ? 1 : undefined,
      groupMembers: type === 'group' ? [jwtUser.uid] : undefined,
      groupName: type === 'group' ? groupName : undefined,
      groupDescription: type === 'group' ? groupDescription : undefined,
      eventDate: type === 'event' ? eventDate : undefined,
      eventTime: type === 'event' ? eventTime : undefined,
      eventLink: type === 'event' ? eventLink : undefined,
      // Arena-specific fields
      arenaMonth: type === 'arena' ? getCurrentMonth() : undefined,
      category: type === 'arena' ? category : undefined,
      problemStatement: type === 'arena' ? problemStatement : undefined,
      solution: type === 'arena' ? solution : undefined,
      toolsUsed: type === 'arena' ? toolsUsed : undefined,
      challengesFaced: type === 'arena' ? challengesFaced : undefined,
      learnings: type === 'arena' ? learnings : undefined,
      proofOfWork: type === 'arena' ? (Array.isArray(proofOfWork) ? proofOfWork : proofOfWork ? [proofOfWork] : []) : undefined,
      status: type === 'arena' ? 'submitted' : undefined,
      isWinner: type === 'arena' ? false : undefined,
      documentName: type === 'arena' && documentName ? documentName : undefined,
      profile: profileData,
    };

    // For arena posts, use atomic creation with deterministic document ID
    if (type === 'arena') {
      const arenaResult = await collabSocial.createArenaPost(jwtUser.uid, category!, postData);
      
      if (!arenaResult.success) {
        return res.status(arenaResult.alreadySubmitted ? 409 : 500).json({ 
          error: arenaResult.error || 'Failed to create arena post',
          alreadySubmitted: arenaResult.alreadySubmitted
        });
      }
      
      return res.json(normalizeData(arenaResult.post));
    }

    const post = await collabSocial.createPost(postData);

    res.json(normalizeData(post));
  } catch (error) {
    res.status(500).json({ error: 'Failed to create post' });
  }
});

/**
 * GET /posts
 * Get feed posts
 */
router.get('/posts', verifyJWT, async (req: Request, res: Response) => {
  try {
    const requestedLimit = parseInt(req.query.limit as string) || 20;
    const limit = Math.min(Math.max(1, requestedLimit), 50);
    const posts = await collabSocial.getPosts(limit);
    res.json(normalizeData(posts));
  } catch (error) {
    res.status(500).json({ error: 'Failed to get posts' });
  }
});

/**
 * GET /events
 * Get upcoming events for sidebar
 */
router.get('/events', verifyJWT, async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const posts = await collabSocial.getPosts(100);
    
    // Filter for event posts only and filter out past events
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    
    const upcomingEvents = posts
      .filter((post: any) => post.type === 'event' && post.eventDate)
      .filter((post: any) => post.eventDate >= today)
      .sort((a: any, b: any) => {
        // Sort by date and time
        const dateA = new Date(`${a.eventDate}T${a.eventTime || '00:00'}`);
        const dateB = new Date(`${b.eventDate}T${b.eventTime || '00:00'}`);
        return dateA.getTime() - dateB.getTime();
      })
      .slice(0, limit);
    
    res.json(normalizeData(upcomingEvents));
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ error: 'Failed to get events' });
  }
});

/**
 * GET /arena/posts
 * Get arena posts only
 */
router.get('/arena/posts', verifyJWT, async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const category = req.query.category as string;
    const posts = await collabSocial.getPosts(100);
    
    // Filter for arena posts only
    let arenaPosts = posts.filter((post: any) => post.type === 'arena');
    
    // Filter by category if specified
    if (category && ['creative', 'idea', 'tech'].includes(category)) {
      arenaPosts = arenaPosts.filter((post: any) => post.category === category);
    }
    
    // Sort by newest first
    arenaPosts.sort((a: any, b: any) => {
      const dateA = new Date(a.createdAt);
      const dateB = new Date(b.createdAt);
      return dateB.getTime() - dateA.getTime();
    });
    
    res.json(normalizeData(arenaPosts.slice(0, limit)));
  } catch (error) {
    console.error('Error fetching arena posts:', error);
    res.status(500).json({ error: 'Failed to get arena posts' });
  }
});

/**
 * GET /arena/my-registration
 * Get current user's arena registration status
 */
router.get('/arena/my-registration', verifyJWT, async (req: Request, res: Response) => {
  try {
    const jwtUser = (req as any).jwtUser;
    const db = admin.firestore();
    
    const registrationsSnapshot = await db.collection('arenaRegistrations')
      .where('uid', '==', jwtUser.uid)
      .get();
    
    if (registrationsSnapshot.empty) {
      return res.json({ registered: false, verified: false, categories: [] });
    }
    
    // Aggregate all categories from all registrations and check for any confirmed status
    const allCategories = new Set<string>();
    let hasConfirmed = false;
    let latestStatus = 'pending';
    
    registrationsSnapshot.docs.forEach(doc => {
      const regData = doc.data();
      const cats = regData.categories || [];
      cats.forEach((c: string) => allCategories.add(c));
      if (regData.status === 'confirmed') {
        hasConfirmed = true;
        latestStatus = 'confirmed';
      } else if (!hasConfirmed && regData.status === 'pending') {
        latestStatus = 'pending';
      }
    });
    
    // Calculate post quota: check which categories user has already submitted
    const categoriesArray = Array.from(allCategories);
    const submittedCategories: string[] = [];
    const remainingCategories: string[] = [];
    
    // Count actual arena posts by this user
    const userArenaPosts = await db.collection('posts')
      .where('uid', '==', jwtUser.uid)
      .where('type', '==', 'arena')
      .get();
    
    const submittedPostCount = userArenaPosts.size;
    
    for (const cat of categoriesArray) {
      const arenaDocId = `arena_${jwtUser.uid}_${cat}`;
      const postDoc = await db.collection('posts').doc(arenaDocId).get();
      if (postDoc.exists) {
        submittedCategories.push(cat);
      } else {
        remainingCategories.push(cat);
      }
    }
    
    // allowedPostLimit = number of categories registered (1 post per category)
    const allowedPostLimit = categoriesArray.length;
    const remainingPosts = Math.max(0, allowedPostLimit - submittedPostCount);
    
    res.json({
      registered: true,
      verified: hasConfirmed,
      status: latestStatus,
      categories: categoriesArray,
      registrationId: registrationsSnapshot.docs[0].id,
      // Post quota info - strict: 1 post per registered category
      allowedPostLimit,
      submittedPostCount,
      remainingPosts,
      submittedCategories,
      remainingCategories
    });
  } catch (error) {
    console.error('Error fetching arena registration:', error);
    res.status(500).json({ error: 'Failed to get registration status' });
  }
});

/**
 * DELETE /posts/:postId
 * Delete a post
 */
router.delete('/posts/:postId', verifyJWT, async (req: Request, res: Response) => {
  try {
    const jwtUser = (req as any).jwtUser;
    const { postId } = req.params;

    // Get the post to verify ownership
    const post = await collabSocial.getPost(postId);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Verify that the user owns this post (only the creator can delete)
    if (post.uid !== jwtUser.uid) {
      return res.status(403).json({ error: 'You can only delete your own posts' });
    }

    await collabSocial.deletePost(postId);
    res.json({ message: 'Post deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete post' });
  }
});

/**
 * PUT /posts/:postId
 * Update a post
 */
router.put('/posts/:postId', verifyJWT, async (req: Request, res: Response) => {
  try {
    const jwtUser = (req as any).jwtUser;
    const { postId } = req.params;
    const { description, mediaUrl, mediaType } = req.body;

    // Get the post to verify ownership
    const post = await collabSocial.getPost(postId);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Verify that the user owns this post
    if (post.uid !== jwtUser.uid) {
      return res.status(403).json({ error: 'You can only edit your own posts' });
    }

    await collabSocial.updatePost(postId, {
      description,
      mediaUrl,
      mediaType,
    });

    res.json({ message: 'Post updated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update post' });
  }
});

/**
 * GET /my-group-posts
 * Get current user's group posts
 */
router.get('/my-group-posts', verifyJWT, async (req: Request, res: Response) => {
  try {
    const jwtUser = (req as any).jwtUser;
    const posts = await collabSocial.getPostsByUser(jwtUser.uid);
    res.json(normalizeData(posts));
  } catch (error) {
    res.status(500).json({ error: 'Failed to get user posts' });
  }
});

/**
 * GET /posts/:postId
 * Get single post
 */
router.get('/posts/:postId', verifyJWT, async (req: Request, res: Response) => {
  try {
    const post = await collabSocial.getPost(req.params.postId);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }
    res.json(normalizeData(post));
  } catch (error) {
    res.status(500).json({ error: 'Failed to get post' });
  }
});

/**
 * POST /posts/:postId/join
 * Send join request for a group post
 */
router.post('/posts/:postId/join', verifyJWT, async (req: Request, res: Response) => {
  try {
    const jwtUser = (req as any).jwtUser;
    const result = await collabSocial.createJoinRequest(
      req.params.postId,
      jwtUser.userId,
      jwtUser.uid
    );
    
    if (!result.success) {
      return res.status(400).json({ error: result.message });
    }
    
    // Create notification for post owner about the join request
    if (result.requestId && result.post) {
      await getNotificationService().createNotification({
        recipientUid: result.post.uid,
        senderUid: jwtUser.uid,
        type: 'join_request',
        relatedPostId: req.params.postId,
        relatedJoinRequestId: result.requestId,
      });
    }
    
    res.json({ success: true, message: result.message });
  } catch (error) {
    res.status(500).json({ error: 'Failed to send join request' });
  }
});

/**
 * GET /my-join-requests
 * Get current user's join requests with status
 */
router.get('/my-join-requests', verifyJWT, async (req: Request, res: Response) => {
  try {
    const jwtUser = (req as any).jwtUser;
    const requests = await collabSocial.getUserJoinRequests(jwtUser.uid);
    
    // Return as a map of postId -> status for easy lookup
    const statusMap = requests.reduce((acc: any, req: any) => {
      acc[req.postId] = req.status;
      return acc;
    }, {});
    
    res.json(statusMap);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get join requests' });
  }
});

/**
 * GET /posts/:postId/join-requests
 * Get all join requests for a post with user profiles (leader only)
 */
router.get('/posts/:postId/join-requests', verifyJWT, async (req: Request, res: Response) => {
  try {
    const requests = await collabSocial.getJoinRequestsWithProfiles(req.params.postId);
    res.json(normalizeData(requests));
  } catch (error) {
    res.status(500).json({ error: 'Failed to get join requests' });
  }
});

/**
 * GET /posts/:postId/user-join-request
 * Get current user's join request status for a post
 */
router.get('/posts/:postId/user-join-request', verifyJWT, async (req: Request, res: Response) => {
  try {
    const jwtUser = (req as any).jwtUser;
    const request = await collabSocial.getUserJoinRequest(req.params.postId, jwtUser.uid);
    res.json(normalizeData(request));
  } catch (error) {
    res.status(500).json({ error: 'Failed to get join request' });
  }
});

/**
 * POST /join-requests/:requestId/accept
 * Accept a join request (leader only)
 */
router.post('/join-requests/:requestId/accept', verifyJWT, async (req: Request, res: Response) => {
  try {
    const jwtUser = (req as any).jwtUser;
    const { postId } = req.body;
    if (!postId) {
      return res.status(400).json({ error: 'Post ID is required' });
    }

    const result = await collabSocial.acceptJoinRequest(req.params.requestId, postId);
    
    if (!result.success) {
      return res.status(400).json({ error: result.message });
    }
    
    // Send notifications
    if (result.request && result.post) {
      // Notify requester that their request was accepted
      await getNotificationService().createNotification({
        recipientUid: result.request.uid,
        senderUid: jwtUser.uid,
        type: 'join_request_accepted',
        relatedPostId: postId,
        relatedGroupId: result.groupId,
      });

      // Notify group leader that a new member joined
      if (result.post.uid !== result.request.uid) {
        await getNotificationService().createNotification({
          recipientUid: result.post.uid,
          senderUid: result.request.uid,
          type: 'group_member_joined',
          relatedPostId: postId,
          relatedGroupId: result.groupId,
        });
      }
    }
    
    res.json({ success: true, groupId: result.groupId });
  } catch (error) {
    res.status(500).json({ error: 'Failed to accept join request' });
  }
});

/**
 * POST /join-requests/:requestId/reject
 * Reject a join request (leader only)
 */
router.post('/join-requests/:requestId/reject', verifyJWT, async (req: Request, res: Response) => {
  try {
    const jwtUser = (req as any).jwtUser;
    const result = await collabSocial.rejectJoinRequest(req.params.requestId);
    
    if (!result.success) {
      return res.status(400).json({ error: result.message });
    }
    
    // Send notification to requester that their request was rejected
    if (result.request) {
      await getNotificationService().createNotification({
        recipientUid: result.request.uid,
        senderUid: jwtUser.uid,
        type: 'join_request_rejected',
        relatedPostId: result.request.postId,
      });
    }
    
    res.json({ success: true, message: result.message });
  } catch (error) {
    res.status(500).json({ error: 'Failed to reject join request' });
  }
});

/**
 * GET /post-media-upload-url
 * Get presigned URL for uploading post media
 */
router.get('/post-media-upload-url', verifyJWT, async (req: Request, res: Response) => {
  try {
    const uploadUrl = await objectStorage.getProfilePictureUploadURL(); // Reuse same method
    res.json({ uploadUrl });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get upload URL' });
  }
});

// ========== LIKES ==========

/**
 * POST /posts/:postId/like
 * Like or unlike a post
 */
router.post('/posts/:postId/like', verifyJWT, async (req: Request, res: Response) => {
  try {
    const jwtUser = (req as any).jwtUser;
    const liked = await collabSocial.likePost(
      req.params.postId,
      jwtUser.userId,
      jwtUser.uid
    );
    
    // Create notification if this is a new like
    if (liked) {
      const post = await collabSocial.getPost(req.params.postId);
      if (post && post.uid !== jwtUser.uid) {
        await getNotificationService().createNotification({
          recipientUid: post.uid,
          senderUid: jwtUser.uid,
          type: 'post_like',
          relatedPostId: req.params.postId,
        });
      }
    }
    
    const count = await collabSocial.getLikesCount(req.params.postId);
    res.json({ liked, count });
  } catch (error) {
    res.status(500).json({ error: 'Failed to like post' });
  }
});

/**
 * GET /posts/:postId/likes
 * Get likes count and user's like status
 */
router.get('/posts/:postId/likes', verifyJWT, async (req: Request, res: Response) => {
  try {
    const jwtUser = (req as any).jwtUser;
    const count = await collabSocial.getLikesCount(req.params.postId);
    const liked = await collabSocial.getUserLike(req.params.postId, jwtUser.uid);
    
    res.json({ count, liked });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get likes' });
  }
});

// ========== COMMENTS ==========

/**
 * POST /posts/:postId/comments
 * Add a comment to a post
 */
router.post('/posts/:postId/comments', verifyJWT, async (req: Request, res: Response) => {
  try {
    const jwtUser = (req as any).jwtUser;
    const { text, parentCommentId } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Comment text is required' });
    }

    // Fetch user profile to include in comment
    const userProfile = await collabFirestore.getProfileByUid(jwtUser.uid);
    const profile = userProfile ? {
      username: (userProfile as any).username,
      name: (userProfile as any).name,
      avatarUrl: (userProfile as any).avatarUrl ? objectStorage.normalizeObjectEntityPath((userProfile as any).avatarUrl) : undefined,
      role: userProfile.role || 'Student',
    } : undefined;

    const comment = await collabSocial.createComment({
      postId: req.params.postId,
      userId: jwtUser.userId,
      uid: jwtUser.uid,
      text,
      parentCommentId,
      profile,
    });

    // Create notification
    if (parentCommentId) {
      // Reply to a comment
      const parentComment = await collabSocial.getComment(parentCommentId);
      if (parentComment && parentComment.uid !== jwtUser.uid) {
        await getNotificationService().createNotification({
          recipientUid: parentComment.uid,
          senderUid: jwtUser.uid,
          type: 'comment_reply',
          relatedPostId: req.params.postId,
          relatedCommentId: parentCommentId,
        });
      }
    } else {
      // Comment on a post
      const post = await collabSocial.getPost(req.params.postId);
      if (post && post.uid !== jwtUser.uid) {
        await getNotificationService().createNotification({
          recipientUid: post.uid,
          senderUid: jwtUser.uid,
          type: 'post_comment',
          relatedPostId: req.params.postId,
        });
      }
    }

    res.json(normalizeData(comment));
  } catch (error) {
    res.status(500).json({ error: 'Failed to create comment' });
  }
});

/**
 * GET /posts/:postId/comments
 * Get comments for a post with profile data
 */
router.get('/posts/:postId/comments', verifyJWT, async (req: Request, res: Response) => {
  try {
    const comments = await collabSocial.getComments(req.params.postId);
    
    // Fetch profile data for each comment
    const commentsWithProfiles = await Promise.all(
      comments.map(async (comment) => {
        try {
          const profile = await collabFirestore.getProfileByUid(comment.uid);
          return {
            ...comment,
            profile: profile ? {
              username: (profile as any).username,
              name: (profile as any).name || profile.email || 'User',
              avatarUrl: (profile as any).avatarUrl ? objectStorage.normalizeObjectEntityPath((profile as any).avatarUrl) : undefined,
              role: profile.role || 'Student'
            } : null
          };
        } catch (error) {
          return { ...comment, profile: null };
        }
      })
    );
    
    res.json(normalizeData(commentsWithProfiles));
  } catch (error) {
    res.status(500).json({ error: 'Failed to get comments' });
  }
});

/**
 * DELETE /comments/:commentId
 * Delete a comment
 */
router.delete('/comments/:commentId', verifyJWT, async (req: Request, res: Response) => {
  try {
    await collabSocial.deleteComment(req.params.commentId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete comment' });
  }
});

/**
 * POST /comments/:commentId/react
 * React to a comment
 */
router.post('/comments/:commentId/react', verifyJWT, async (req: Request, res: Response) => {
  try {
    const { reaction } = req.body;
    await collabSocial.reactToComment(req.params.commentId, reaction);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to react to comment' });
  }
});

/**
 * POST /comments/:commentId/like
 * Toggle like on a comment
 */
router.post('/comments/:commentId/like', verifyJWT, async (req: Request, res: Response) => {
  try {
    const jwtUser = (req as any).jwtUser;
    const liked = await collabSocial.toggleCommentLike(
      req.params.commentId,
      jwtUser.userId,
      jwtUser.uid
    );
    
    // Create notification if this is a new like
    if (liked) {
      const comment = await collabSocial.getComment(req.params.commentId);
      if (comment && comment.uid !== jwtUser.uid) {
        await getNotificationService().createNotification({
          recipientUid: comment.uid,
          senderUid: jwtUser.uid,
          type: 'comment_like',
          relatedCommentId: req.params.commentId,
          relatedPostId: comment.postId,
        });
      }
    }
    
    const count = await collabSocial.getCommentLikesCount(req.params.commentId);
    res.json({ liked, count });
  } catch (error) {
    res.status(500).json({ error: 'Failed to like comment' });
  }
});

/**
 * GET /comments/:commentId/likes
 * Get likes for a comment
 */
router.get('/comments/:commentId/likes', verifyJWT, async (req: Request, res: Response) => {
  try {
    const jwtUser = (req as any).jwtUser;
    const count = await collabSocial.getCommentLikesCount(req.params.commentId);
    const liked = await collabSocial.getUserCommentLike(req.params.commentId, jwtUser.uid);
    res.json({ count, liked });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get comment likes' });
  }
});

/**
 * GET /comments/:commentId/replies
 * Get replies for a comment
 */
router.get('/comments/:commentId/replies', verifyJWT, async (req: Request, res: Response) => {
  try {
    const replies = await collabSocial.getReplies(req.params.commentId);
    
    // Fetch profile data for each reply
    const repliesWithProfiles = await Promise.all(
      replies.map(async (reply) => {
        try {
          const profile = await collabFirestore.getProfileByUid(reply.uid);
          return {
            ...reply,
            profile: profile ? {
              username: (profile as any).username,
              name: (profile as any).name || profile.email || 'User',
              avatarUrl: (profile as any).avatarUrl ? objectStorage.normalizeObjectEntityPath((profile as any).avatarUrl) : undefined,
              role: profile.role || 'Student'
            } : null
          };
        } catch (error) {
          return { ...reply, profile: null };
        }
      })
    );
    
    res.json(normalizeData(repliesWithProfiles));
  } catch (error) {
    res.status(500).json({ error: 'Failed to get replies' });
  }
});

// ========== SHARES ==========

/**
 * POST /posts/:postId/share
 * Share a post with a connection
 */
router.post('/posts/:postId/share', verifyJWT, async (req: Request, res: Response) => {
  try {
    const jwtUser = (req as any).jwtUser;
    const { receiverId, receiverUid } = req.body;

    if (!receiverId || !receiverUid) {
      return res.status(400).json({ error: 'Receiver information is required' });
    }

    const share = await collabSocial.sharePost(
      req.params.postId,
      jwtUser.userId,
      jwtUser.uid,
      receiverId,
      receiverUid
    );

    res.json(normalizeData(share));
  } catch (error) {
    res.status(500).json({ error: 'Failed to share post' });
  }
});

// ========== SAVED POSTS ==========

/**
 * POST /posts/:postId/save
 * Toggle save on a post
 */
router.post('/posts/:postId/save', verifyJWT, async (req: Request, res: Response) => {
  try {
    const jwtUser = (req as any).jwtUser;
    const saved = await collabSocial.toggleSavePost(
      req.params.postId,
      jwtUser.uid
    );
    res.json({ saved });
  } catch (error) {
    console.error('Failed to save post:', error);
    res.status(500).json({ error: 'Failed to save post' });
  }
});

/**
 * GET /saved-posts
 * Get user's saved post IDs
 */
router.get('/saved-posts', verifyJWT, async (req: Request, res: Response) => {
  try {
    const jwtUser = (req as any).jwtUser;
    const savedPostIds = await collabSocial.getSavedPostIds(jwtUser.uid);
    res.json(savedPostIds);
  } catch (error) {
    console.error('Failed to get saved posts:', error);
    res.status(500).json({ error: 'Failed to get saved posts' });
  }
});

/**
 * GET /saved-posts/full
 * Get user's saved posts with full post data
 */
router.get('/saved-posts/full', verifyJWT, async (req: Request, res: Response) => {
  try {
    const jwtUser = (req as any).jwtUser;
    const savedPosts = await collabSocial.getSavedPosts(jwtUser.uid);
    res.json(normalizeData(savedPosts));
  } catch (error) {
    console.error('Failed to get saved posts:', error);
    res.status(500).json({ error: 'Failed to get saved posts' });
  }
});

// ========== CONNECTIONS ==========

/**
 * POST /connections/request
 * Send a connection request
 */
router.post('/connections/request', verifyJWT, async (req: Request, res: Response) => {
  try {
    const jwtUser = (req as any).jwtUser;
    const { receiverId, receiverUid } = req.body;

    if (!receiverId || !receiverUid) {
      return res.status(400).json({ error: 'Receiver information is required' });
    }

    const connection = await collabSocial.sendConnectionRequest(
      jwtUser.userId,
      jwtUser.uid,
      receiverId,
      receiverUid
    );

    // Create notification for connection request
    if (connection.status === 'pending') {
      await getNotificationService().createNotification({
        recipientUid: receiverUid,
        senderUid: jwtUser.uid,
        type: 'connection_request',
        relatedConnectionId: connection.id,
      });
    }

    res.json(normalizeData(connection));
  } catch (error) {
    res.status(500).json({ error: 'Failed to send connection request' });
  }
});

/**
 * POST /connections/:connectionId/accept
 * Accept a connection request
 */
router.post('/connections/:connectionId/accept', verifyJWT, async (req: Request, res: Response) => {
  try {
    const jwtUser = (req as any).jwtUser;
    
    // Get connection details before accepting
    const connection = await collabSocial.getConnection(req.params.connectionId);
    if (!connection) {
      return res.status(404).json({ error: 'Connection not found' });
    }

    await collabSocial.acceptConnection(req.params.connectionId);

    // Create notification for connection accepted (notify the requester)
    const requesterId = connection.senderUid === jwtUser.uid ? connection.receiverUid : connection.senderUid;
    await getNotificationService().createNotification({
      recipientUid: requesterId,
      senderUid: jwtUser.uid,
      type: 'connection_accepted',
      relatedConnectionId: connection.id,
    });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to accept connection' });
  }
});

/**
 * DELETE /connections/:connectionId
 * Reject/delete a connection request
 */
router.delete('/connections/:connectionId', verifyJWT, async (req: Request, res: Response) => {
  try {
    const jwtUser = (req as any).jwtUser;
    
    // Get connection details before rejecting
    const connection = await collabSocial.getConnection(req.params.connectionId);
    if (!connection) {
      return res.status(404).json({ error: 'Connection not found' });
    }

    // Verify that the user is the receiver (can only reject if you're the one receiving the request)
    if (connection.receiverUid !== jwtUser.uid) {
      return res.status(403).json({ error: 'You can only reject connection requests sent to you' });
    }

    await collabSocial.rejectConnection(req.params.connectionId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to reject connection' });
  }
});

/**
 * GET /connections/status/:uid
 * Get connection status with another user
 */
router.get('/connections/status/:uid', verifyJWT, async (req: Request, res: Response) => {
  try {
    const jwtUser = (req as any).jwtUser;
    const status = await collabSocial.getConnectionStatus(jwtUser.uid, req.params.uid);
    res.json({ status });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get connection status' });
  }
});

/**
 * GET /connections
 * Get user's connections
 */
router.get('/connections', verifyJWT, async (req: Request, res: Response) => {
  try {
    const jwtUser = (req as any).jwtUser;
    const connections = await collabSocial.getUserConnections(jwtUser.uid);
    res.json(normalizeData(connections));
  } catch (error) {
    res.status(500).json({ error: 'Failed to get connections' });
  }
});

// ========== MESSAGES ==========

/**
 * POST /messages
 * Send a direct message
 */
router.post('/messages', verifyJWT, rateLimitMiddleware.message, async (req: Request, res: Response) => {
  try {
    const jwtUser = (req as any).jwtUser;
    const { receiverId, receiverUid, text } = req.body;

    if (!receiverId || !receiverUid || !text) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const message = await collabSocial.sendMessage({
      senderId: jwtUser.userId,
      senderUid: jwtUser.uid,
      receiverId,
      receiverUid,
      text,
    });

    res.json(normalizeData(message));
  } catch (error) {
    res.status(500).json({ error: 'Failed to send message' });
  }
});

/**
 * PUT /messages/mark-read
 * Mark messages as read from a specific sender
 */
router.put('/messages/mark-read', verifyJWT, async (req: Request, res: Response) => {
  try {
    const jwtUser = (req as any).jwtUser;
    const { senderUid } = req.body;

    if (!senderUid) {
      return res.status(400).json({ error: 'Sender UID is required' });
    }

    await collabSocial.markMessagesAsRead(jwtUser.uid, senderUid);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to mark messages as read' });
  }
});

/**
 * GET /messages/:uid
 * Get messages with another user
 */
router.get('/messages/:uid', verifyJWT, async (req: Request, res: Response) => {
  try {
    const jwtUser = (req as any).jwtUser;
    const messages = await collabSocial.getMessages(jwtUser.uid, req.params.uid);
    res.json(normalizeData(messages));
  } catch (error) {
    res.status(500).json({ error: 'Failed to get messages' });
  }
});

// ========== GROUPS ==========

/**
 * GET /groups/:groupId
 * Get group details
 */
router.get('/groups/:groupId', verifyJWT, async (req: Request, res: Response) => {
  try {
    const group = await collabSocial.getGroup(req.params.groupId);
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }
    res.json(normalizeData(group));
  } catch (error) {
    res.status(500).json({ error: 'Failed to get group' });
  }
});

/**
 * GET /groups
 * Get user's groups
 */
router.get('/groups', verifyJWT, async (req: Request, res: Response) => {
  try {
    const jwtUser = (req as any).jwtUser;
    const groups = await collabSocial.getUserGroups(jwtUser.uid);
    res.json(normalizeData(groups));
  } catch (error) {
    res.status(500).json({ error: 'Failed to get groups' });
  }
});

/**
 * PUT /groups/:groupId
 * Update group details
 */
router.put('/groups/:groupId', verifyJWT, async (req: Request, res: Response) => {
  try {
    const { name, avatarUrl } = req.body;
    await collabSocial.updateGroup(req.params.groupId, { name, avatarUrl });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update group' });
  }
});

/**
 * DELETE /groups/:groupId/members/:memberUid
 * Remove a member from the group (leader only)
 */
router.delete('/groups/:groupId/members/:memberUid', verifyJWT, async (req: Request, res: Response) => {
  try {
    const jwtUser = (req as any).jwtUser;
    const { groupId, memberUid } = req.params;

    // Get group to verify leader
    const group = await collabSocial.getGroup(groupId);
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    // Only leader can remove members
    if (group.leaderUid !== jwtUser.uid) {
      return res.status(403).json({ error: 'Only the group leader can remove members' });
    }

    // Cannot remove yourself
    if (memberUid === jwtUser.uid) {
      return res.status(400).json({ error: 'Cannot remove yourself from the group' });
    }

    // Remove member from the group
    const updatedMembers = group.members.filter(uid => uid !== memberUid);
    await collabSocial.updateGroup(groupId, { members: updatedMembers });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove member' });
  }
});

/**
 * PATCH /groups/:groupId/archive
 * Archive or unarchive a group (leader only)
 */
router.patch('/groups/:groupId/archive', verifyJWT, async (req: Request, res: Response) => {
  try {
    const jwtUser = (req as any).jwtUser;
    const { isArchived } = req.body;

    // Get group to verify leader
    const group = await collabSocial.getGroup(req.params.groupId);
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    // Only leader can archive
    if (group.leaderUid !== jwtUser.uid) {
      return res.status(403).json({ error: 'Only the group leader can archive the group' });
    }

    await collabSocial.updateGroup(req.params.groupId, { isArchived });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to archive group' });
  }
});

/**
 * POST /groups/:groupId/co-leaders
 * Assign a co-leader (leader only)
 */
router.post('/groups/:groupId/co-leaders', verifyJWT, async (req: Request, res: Response) => {
  try {
    const jwtUser = (req as any).jwtUser;
    const { memberUid } = req.body;

    if (!memberUid) {
      return res.status(400).json({ error: 'Member UID is required' });
    }

    // Get group to verify leader
    const group = await collabSocial.getGroup(req.params.groupId);
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    // Only leader can assign co-leaders
    if (group.leaderUid !== jwtUser.uid) {
      return res.status(403).json({ error: 'Only the group leader can assign co-leaders' });
    }

    // Check if member is in the group
    if (!group.members.includes(memberUid)) {
      return res.status(400).json({ error: 'Member is not in the group' });
    }

    // Check if already a co-leader
    const coLeaders = group.coLeaders || [];
    if (coLeaders.includes(memberUid)) {
      return res.status(400).json({ error: 'Member is already a co-leader' });
    }

    // Add co-leader
    await collabSocial.updateGroup(req.params.groupId, { 
      coLeaders: [...coLeaders, memberUid] 
    });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to assign co-leader' });
  }
});

/**
 * DELETE /groups/:groupId/co-leaders/:memberUid
 * Remove a co-leader (leader only)
 */
router.delete('/groups/:groupId/co-leaders/:memberUid', verifyJWT, async (req: Request, res: Response) => {
  try {
    const jwtUser = (req as any).jwtUser;
    const { groupId, memberUid } = req.params;

    // Get group to verify leader
    const group = await collabSocial.getGroup(groupId);
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    // Only leader can remove co-leaders
    if (group.leaderUid !== jwtUser.uid) {
      return res.status(403).json({ error: 'Only the group leader can remove co-leaders' });
    }

    // Remove co-leader
    const coLeaders = group.coLeaders || [];
    const updatedCoLeaders = coLeaders.filter(uid => uid !== memberUid);
    await collabSocial.updateGroup(groupId, { coLeaders: updatedCoLeaders });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove co-leader' });
  }
});

/**
 * POST /groups/:groupId/messages
 * Send a group message
 */
router.post('/groups/:groupId/messages', verifyJWT, async (req: Request, res: Response) => {
  try {
    const jwtUser = (req as any).jwtUser;
    const { text, mediaUrl, mediaType, fileName } = req.body;

    if (!text && !mediaUrl) {
      return res.status(400).json({ error: 'Message text or media is required' });
    }

    const message = await collabSocial.sendGroupMessage({
      groupId: req.params.groupId,
      senderId: jwtUser.userId,
      senderUid: jwtUser.uid,
      text: text || '',
      mediaUrl,
      mediaType,
      fileName,
    });

    res.json(normalizeData(message));
  } catch (error) {
    res.status(500).json({ error: 'Failed to send group message' });
  }
});

/**
 * GET /groups/:groupId/messages
 * Get group messages
 */
router.get('/groups/:groupId/messages', verifyJWT, async (req: Request, res: Response) => {
  try {
    const messages = await collabSocial.getGroupMessages(req.params.groupId);
    res.json(normalizeData(messages));
  } catch (error) {
    res.status(500).json({ error: 'Failed to get group messages' });
  }
});

/**
 * GET /my-groups
 * Get all groups where the current user is a member
 */
router.get('/my-groups', verifyJWT, async (req: Request, res: Response) => {
  try {
    const jwtUser = (req as any).jwtUser;
    const groups = await collabSocial.getUserGroups(jwtUser.uid);
    res.json(normalizeData(groups));
  } catch (error) {
    res.status(500).json({ error: 'Failed to get user groups' });
  }
});

// ========== PROFILES BATCH ==========

/**
 * POST /profiles/batch
 * Get multiple profiles by UIDs
 */
router.post('/profiles/batch', verifyJWT, async (req: Request, res: Response) => {
  try {
    const { uids } = req.body;
    
    if (!uids || !Array.isArray(uids)) {
      return res.status(400).json({ error: 'UIDs array is required' });
    }

    const profiles: { [uid: string]: any } = {};
    
    for (const uid of uids) {
      const profile = await collabFirestore.getProfileByUid(uid);
      if (profile) {
        // Normalize avatarUrl for Object Storage
        let avatarUrl = (profile as any).avatarUrl;
        if (avatarUrl) {
          avatarUrl = objectStorage.normalizeObjectEntityPath(avatarUrl);
        }
        
        profiles[uid] = {
          username: (profile as any).username,
          name: (profile as any).name,
          avatarUrl: avatarUrl,
        };
      }
    }

    res.json(profiles);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch profiles' });
  }
});

/**
 * GET /profiles/search
 * Search all profiles (students, clubs, communities, companies)
 */
router.get('/profiles/search', verifyJWT, async (req: Request, res: Response) => {
  try {
    const query = req.query.q as string;
    
    if (!query || query.length < 1) {
      return res.json([]);
    }
    
    const profiles = await collabFirestore.searchAllProfiles(query);
    
    // Normalize avatarUrl for all profiles
    const normalizedProfiles = profiles.map((profile: any) => {
      if (profile.avatarUrl) {
        profile.avatarUrl = objectStorage.normalizeObjectEntityPath(profile.avatarUrl);
      }
      return profile;
    });
    
    res.json(normalizeData(normalizedProfiles));
  } catch (error) {
    res.status(500).json({ error: 'Failed to search profiles' });
  }
});

/**
 * GET /users/:username
 * Get a public profile by username
 */
router.get('/users/:username', verifyJWT, async (req: Request, res: Response) => {
  try {
    const { username } = req.params;
    const profile = await collabFirestore.getProfileByUsername(username);
    if (!profile) {
      return res.status(404).json({ error: 'User not found' });
    }
    const profileData = { ...profile } as any;
    if (profileData.avatarUrl) {
      profileData.avatarUrl = objectStorage.normalizeObjectEntityPath(profileData.avatarUrl);
    }
    res.json(normalizeData(profileData));
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

/**
 * GET /user-posts/:uid
 * Get posts by a specific user (for profile pages)
 */
router.get('/user-posts/:uid', verifyJWT, async (req: Request, res: Response) => {
  try {
    const { uid } = req.params;
    const posts = await collabSocial.getPostsByUser(uid);
    const postsWithMedia = await Promise.all(
      posts.map(async (post: any) => {
        const postData = { ...post } as any;
        if (postData.mediaUrl) {
          postData.mediaUrl = objectStorage.normalizeObjectEntityPath(postData.mediaUrl);
        }
        if (postData.profile?.avatarUrl) {
          postData.profile.avatarUrl = objectStorage.normalizeObjectEntityPath(postData.profile.avatarUrl);
        }
        return postData;
      })
    );
    res.json(normalizeData(postsWithMedia));
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user posts' });
  }
});

/**
 * GET /profiles/:uid
 * Get a public profile by UID
 */
router.get('/profiles/:uid', verifyJWT, async (req: Request, res: Response) => {
  try {
    const profile = await collabFirestore.getProfileByUid(req.params.uid);
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }
    
    // Normalize avatarUrl for Object Storage (convert path to full URL)
    const profileData = { ...profile } as any;
    if (profileData.avatarUrl) {
      profileData.avatarUrl = objectStorage.normalizeObjectEntityPath(profileData.avatarUrl);
    }
    
    res.json(normalizeData(profileData));
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// ========== NOTIFICATIONS ==========

/**
 * GET /notifications
 * Get all notifications for the logged-in user
 */
router.get('/notifications', verifyJWT, async (req: Request, res: Response) => {
  try {
    const jwtUser = (req as any).jwtUser;
    const notifications = await getNotificationService().getUserNotifications(jwtUser.uid);
    res.json(normalizeData(notifications));
  } catch (error) {
    res.status(500).json({ error: 'Failed to get notifications' });
  }
});

/**
 * GET /notifications/unread-count
 * Get count of unread notifications
 */
router.get('/notifications/unread-count', verifyJWT, async (req: Request, res: Response) => {
  try {
    const jwtUser = (req as any).jwtUser;
    const count = await getNotificationService().getUnreadCount(jwtUser.uid);
    res.json({ count });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get unread count' });
  }
});

/**
 * PUT /notifications/:id/read
 * Mark a notification as read
 */
router.put('/notifications/:id/read', verifyJWT, async (req: Request, res: Response) => {
  try {
    await getNotificationService().markAsRead(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

/**
 * PUT /notifications/mark-all-read
 * Mark all notifications as read
 */
router.put('/notifications/mark-all-read', verifyJWT, async (req: Request, res: Response) => {
  try {
    const jwtUser = (req as any).jwtUser;
    await getNotificationService().markAllAsRead(jwtUser.uid);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to mark all notifications as read' });
  }
});

/**
 * POST /notifications/demo
 * Send a demo notification (for testing)
 */
router.post('/notifications/demo', verifyJWT, async (req: Request, res: Response) => {
  try {
    const jwtUser = (req as any).jwtUser;
    const { admin } = await import('../firebase-admin');
    const { Timestamp } = await import('firebase-admin/firestore');
    
    // Create a demo notification directly in Firestore (bypassing the self-check)
    const notificationRef = admin.firestore().collection('notifications').doc();
    await notificationRef.set({
      recipientUid: jwtUser.uid,
      senderUid: 'demo-system',
      senderName: 'StudentXchange Team',
      senderUsername: 'studentxchange',
      senderAvatarUrl: '',
      type: 'connection_request',
      message: '🎉 Welcome to real-time notifications! This is a demo notification showing instant updates.',
      relatedConnectionId: 'demo-' + Date.now(),
      isRead: false,
      createdAt: Timestamp.now(),
    });
    
    res.json({ success: true, notificationId: notificationRef.id, message: 'Demo notification sent! Check your notifications bell 🔔' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to send demo notification' });
  }
});

/**
 * POST /join-requests/:requestId/accept-and-create-group
 * Accept join request and create a direct chat group between admin and requester
 */
router.post('/join-requests/:requestId/accept-and-create-group', verifyJWT, async (req: Request, res: Response) => {
  try {
    const jwtUser = (req as any).jwtUser;
    const { requestId } = req.params;
    const { notificationId, postId } = req.body;
    
    if (!postId) {
      return res.status(400).json({ error: 'Post ID is required' });
    }
    
    // Get join request
    const { admin: firebaseAdmin } = await import('../firebase-admin');
    const db = firebaseAdmin.firestore();
    const requestRef = db.collection('joinRequests').doc(requestId);
    const requestDoc = await requestRef.get();
    
    if (!requestDoc.exists) {
      return res.status(404).json({ error: 'Join request not found' });
    }
    
    const request = requestDoc.data();
    
    // Check if request is already processed
    if (request!.status !== 'pending') {
      return res.status(400).json({ error: 'Join request already processed' });
    }
    
    // SECURITY: Verify that the provided postId matches the request's postId
    if (request!.postId !== postId) {
      return res.status(400).json({ error: 'Invalid post ID for this join request' });
    }
    
    // Get the post to verify ownership
    const postRef = db.collection('posts').doc(postId);
    const postDoc = await postRef.get();
    
    if (!postDoc.exists) {
      return res.status(404).json({ error: 'Post not found' });
    }
    
    const post = postDoc.data();
    
    // SECURITY: Verify that current user is the post owner
    if (post!.uid !== jwtUser.uid) {
      return res.status(403).json({ error: 'Unauthorized: Only post owner can accept join requests' });
    }
    
    // Check group capacity BEFORE accepting
    const currentMembers = post!.groupMembers || [];
    const membersRequired = post!.membersRequired || 2;
    
    // Group is full if current members (excluding owner) >= (required - 1)
    // The -1 accounts for the post owner who is already in the group
    if (currentMembers.length >= membersRequired - 1) {
      return res.status(400).json({ error: 'Group is full. Maximum number of members already joined.' });
    }
    
    // Get requester profile
    const requesterProfile = await collabFirestore.getProfileByUid(request!.uid);
    const requesterName = (requesterProfile as any)?.name || (requesterProfile as any)?.username || 'Unknown User';
    
    // Create a new group with admin and requester
    const groupRef = db.collection('groups').doc();
    const groupId = groupRef.id;
    
    const groupData = {
      id: groupId,
      name: `Chat with ${requesterName}`,
      members: [jwtUser.uid, request!.uid],
      createdAt: new Date(),
      postId: postId,
      leaderId: jwtUser.userId,
      leaderUid: jwtUser.uid,
      maxMembers: 2,
    };
    
    await groupRef.set(groupData);
    
    // Update join request status
    await requestRef.update({
      status: 'accepted',
      updatedAt: new Date(),
    });
    
    // Update post membership (add requester to group members)
    if (!currentMembers.includes(request!.uid)) {
      await postRef.update({
        groupMembers: [...currentMembers, request!.uid],
        currentMembers: currentMembers.length + 1,
        updatedAt: new Date(),
      });
    }
    
    // Update notification status if notificationId provided
    if (notificationId) {
      const notificationRef = db.collection('notifications').doc(notificationId);
      await notificationRef.update({
        status: 'accepted',
        isRead: true,
      });
    }
    
    // Send notification to requester
    await getNotificationService().createNotification({
      recipientUid: request!.uid,
      senderUid: jwtUser.uid,
      type: 'join_request_accepted',
      relatedGroupId: groupId,
    });
    
    res.json({ 
      success: true, 
      message: 'Join request accepted and group created',
      groupId,
      requesterName,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to accept join request' });
  }
});

/**
 * POST /join-requests/:requestId/reject-with-notification
 * Reject join request and update notification
 */
router.post('/join-requests/:requestId/reject-with-notification', verifyJWT, async (req: Request, res: Response) => {
  try {
    const jwtUser = (req as any).jwtUser;
    const { requestId } = req.params;
    const { notificationId, postId } = req.body;
    
    if (!postId) {
      return res.status(400).json({ error: 'Post ID is required' });
    }
    
    // Get join request
    const { admin: firebaseAdmin } = await import('../firebase-admin');
    const db = firebaseAdmin.firestore();
    const requestRef = db.collection('joinRequests').doc(requestId);
    const requestDoc = await requestRef.get();
    
    if (!requestDoc.exists) {
      return res.status(404).json({ error: 'Join request not found' });
    }
    
    const request = requestDoc.data();
    
    // Check if request is already processed
    if (request!.status !== 'pending') {
      return res.status(400).json({ error: 'Join request already processed' });
    }
    
    // SECURITY: Verify that the provided postId matches the request's postId
    if (request!.postId !== postId) {
      return res.status(400).json({ error: 'Invalid post ID for this join request' });
    }
    
    // Get the post to verify ownership
    const postRef = db.collection('posts').doc(postId);
    const postDoc = await postRef.get();
    
    if (!postDoc.exists) {
      return res.status(404).json({ error: 'Post not found' });
    }
    
    const post = postDoc.data();
    
    // SECURITY: Verify that current user is the post owner
    if (post!.uid !== jwtUser.uid) {
      return res.status(403).json({ error: 'Unauthorized: Only post owner can reject join requests' });
    }
    
    // Update join request status
    await requestRef.update({
      status: 'rejected',
      updatedAt: new Date(),
    });
    
    // Update notification status if notificationId provided
    if (notificationId) {
      const notificationRef = db.collection('notifications').doc(notificationId);
      await notificationRef.update({
        status: 'rejected',
        isRead: true,
      });
    }
    
    // Send notification to requester
    await getNotificationService().createNotification({
      recipientUid: request!.uid,
      senderUid: jwtUser.uid,
      type: 'join_request_rejected',
      relatedPostId: request!.postId,
    });
    
    res.json({ 
      success: true, 
      message: 'Join request rejected',
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to reject join request' });
  }
});

// ========== COLLAB ARENA ROUTES ==========

/**
 * GET /arena/posts
 * Get arena posts for a specific month
 */
router.get('/arena/posts', verifyJWT, async (req: Request, res: Response) => {
  try {
    const month = req.query.month as string;
    const category = req.query.category as string;
    const limit = parseInt(req.query.limit as string) || 50;

    // Get current month if not specified
    const getCurrentMonth = () => {
      const now = new Date();
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    };
    const targetMonth = month || getCurrentMonth();

    // Get all posts and filter for arena type
    const allPosts = await collabSocial.getPosts(200);
    let arenaPosts = allPosts.filter((post: any) => post.type === 'arena' && post.arenaMonth === targetMonth);

    // Filter by category if specified
    if (category && category !== 'all') {
      arenaPosts = arenaPosts.filter((post: any) => post.category === category);
    }

    // Sort winners to top during last 2 days of month
    const now = new Date();
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const isLastTwoDays = now.getDate() >= lastDayOfMonth - 1;
    
    if (isLastTwoDays && targetMonth === getCurrentMonth()) {
      arenaPosts.sort((a: any, b: any) => {
        if (a.isWinner && !b.isWinner) return -1;
        if (!a.isWinner && b.isWinner) return 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
    }

    res.json(normalizeData(arenaPosts.slice(0, limit)));
  } catch (error) {
    console.error('Error fetching arena posts:', error);
    res.status(500).json({ error: 'Failed to get arena posts' });
  }
});

/**
 * GET /arena/months
 * Get list of months that have arena posts
 */
router.get('/arena/months', verifyJWT, async (req: Request, res: Response) => {
  try {
    const allPosts = await collabSocial.getPosts(500);
    const arenaPosts = allPosts.filter((post: any) => post.type === 'arena');
    
    // Get unique months
    const monthsSet = new Set(arenaPosts.map((post: any) => post.arenaMonth).filter(Boolean));
    const months = Array.from(monthsSet) as string[];
    months.sort((a, b) => b.localeCompare(a)); // Most recent first

    res.json(months);
  } catch (error) {
    console.error('Error fetching arena months:', error);
    res.status(500).json({ error: 'Failed to get arena months' });
  }
});

/**
 * PATCH /arena/posts/:postId/verify
 * Verify an arena project (admin only)
 */
router.patch('/arena/posts/:postId/verify', verifyJWT, async (req: Request, res: Response) => {
  try {
    const jwtUser = (req as any).jwtUser;
    const { postId } = req.params;

    // Check if user is admin
    const db = admin.firestore();
    const profileRef = db.collection('studentProfiles').doc(jwtUser.uid);
    const profileDoc = await profileRef.get();
    
    if (!profileDoc.exists || profileDoc.data()?.email !== COLLAB_ADMIN) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Update post status
    const postRef = db.collection('posts').doc(postId);
    await postRef.update({
      status: 'verified',
      verifiedAt: new Date(),
      verifiedBy: jwtUser.uid,
    });

    res.json({ success: true, message: 'Project verified' });
  } catch (error) {
    console.error('Error verifying arena post:', error);
    res.status(500).json({ error: 'Failed to verify project' });
  }
});

/**
 * PATCH /arena/posts/:postId/winner
 * Mark arena project as winner (admin only)
 */
router.patch('/arena/posts/:postId/winner', verifyJWT, async (req: Request, res: Response) => {
  try {
    const jwtUser = (req as any).jwtUser;
    const { postId } = req.params;
    const { isWinner } = req.body;

    // Check if user is admin
    const db = admin.firestore();
    const profileRef = db.collection('studentProfiles').doc(jwtUser.uid);
    const profileDoc = await profileRef.get();
    
    if (!profileDoc.exists || profileDoc.data()?.email !== COLLAB_ADMIN) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Get current month
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // Update post
    const postRef = db.collection('posts').doc(postId);
    await postRef.update({
      isWinner: isWinner !== false,
      winnerMonth: isWinner !== false ? currentMonth : null,
    });

    res.json({ success: true, message: isWinner !== false ? 'Project marked as winner' : 'Winner status removed' });
  } catch (error) {
    console.error('Error updating winner status:', error);
    res.status(500).json({ error: 'Failed to update winner status' });
  }
});

/**
 * GET /arena/winners
 * Get winner projects for a specific month
 */
router.get('/arena/winners', verifyJWT, async (req: Request, res: Response) => {
  try {
    const month = req.query.month as string;
    
    const getCurrentMonth = () => {
      const now = new Date();
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    };
    const targetMonth = month || getCurrentMonth();

    const allPosts = await collabSocial.getPosts(200);
    const winners = allPosts.filter((post: any) => 
      post.type === 'arena' && 
      post.isWinner === true && 
      post.winnerMonth === targetMonth
    );

    res.json(normalizeData(winners));
  } catch (error) {
    console.error('Error fetching arena winners:', error);
    res.status(500).json({ error: 'Failed to get winners' });
  }
});

// ========== ARENA REGISTRATION SYSTEM ==========

/**
 * POST /arena/register
 * Submit arena registration with payment proof
 */
router.post('/arena/register', verifyJWT, async (req: Request, res: Response) => {
  try {
    const jwtUser = (req as any).jwtUser;
    const { 
      fullName, email, mobile, college, courseYear,
      categories, projectTitle, amountPaid, transactionId, paymentScreenshotUrl 
    } = req.body;

    if (!fullName || !email || !categories || !Array.isArray(categories) || categories.length === 0 || !transactionId || !paymentScreenshotUrl) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const PRICE_PER_CATEGORY = 50;
    const expectedAmount = categories.length * PRICE_PER_CATEGORY;
    
    if (amountPaid !== expectedAmount) {
      return res.status(400).json({ 
        error: `Amount mismatch: expected ₹${expectedAmount} for ${categories.length} categories, received ₹${amountPaid}` 
      });
    }

    const db = admin.firestore();
    const registrationRef = db.collection('arenaRegistrations').doc();

    await registrationRef.set({
      id: registrationRef.id,
      uid: jwtUser.uid,
      fullName,
      email,
      mobile: mobile || '',
      college: college || '',
      courseYear: courseYear || '',
      categories,
      projectTitle: projectTitle || '',
      amountPaid,
      transactionId,
      paymentScreenshotUrl,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    res.json({ 
      success: true, 
      id: registrationRef.id,
      message: 'Registration submitted successfully. Payment verification pending.' 
    });
  } catch (error) {
    console.error('Error creating arena registration:', error);
    res.status(500).json({ error: 'Failed to submit registration' });
  }
});

/**
 * GET /arena/registrations
 * Get current user's arena registrations
 */
router.get('/arena/registrations', verifyJWT, async (req: Request, res: Response) => {
  try {
    const jwtUser = (req as any).jwtUser;
    const db = admin.firestore();

    const snapshot = await db.collection('arenaRegistrations')
      .where('uid', '==', jwtUser.uid)
      .orderBy('createdAt', 'desc')
      .get();

    const registrations = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || new Date().toISOString()
    }));

    res.json(registrations);
  } catch (error) {
    console.error('Error fetching arena registrations:', error);
    res.status(500).json({ error: 'Failed to get registrations' });
  }
});

/**
 * GET /arena/admin/registrations
 * Get all arena registrations (admin only)
 */
router.get('/arena/admin/registrations', verifyJWT, async (req: Request, res: Response) => {
  try {
    const jwtUser = (req as any).jwtUser;
    const db = admin.firestore();

    const profileRef = db.collection('studentProfiles').doc(jwtUser.uid);
    const profileDoc = await profileRef.get();
    
    if (!profileDoc.exists || profileDoc.data()?.email !== COLLAB_ADMIN) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const snapshot = await db.collection('arenaRegistrations')
      .orderBy('createdAt', 'desc')
      .get();

    const registrations = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        paymentScreenshotUrl: data.paymentScreenshotUrl ? objectStorage.normalizeObjectEntityPath(data.paymentScreenshotUrl) : undefined,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString()
      };
    });

    res.json(registrations);
  } catch (error) {
    console.error('Error fetching all arena registrations:', error);
    res.status(500).json({ error: 'Failed to get registrations' });
  }
});

/**
 * PATCH /arena/admin/registrations/:id/verify
 * Verify a registration payment (admin only)
 */
router.patch('/arena/admin/registrations/:id/verify', verifyJWT, async (req: Request, res: Response) => {
  try {
    const jwtUser = (req as any).jwtUser;
    const { id } = req.params;
    const { status } = req.body;

    if (!['confirmed', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Status must be confirmed or rejected' });
    }

    const db = admin.firestore();

    const profileRef = db.collection('studentProfiles').doc(jwtUser.uid);
    const profileDoc = await profileRef.get();
    
    if (!profileDoc.exists || profileDoc.data()?.email !== COLLAB_ADMIN) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    await db.collection('arenaRegistrations').doc(id).update({
      status,
      verifiedAt: new Date(),
      verifiedBy: jwtUser.uid,
      updatedAt: new Date()
    });

    res.json({ success: true, message: `Registration ${status}` });
  } catch (error) {
    console.error('Error verifying arena registration:', error);
    res.status(500).json({ error: 'Failed to verify registration' });
  }
});

/**
 * DELETE /arena/admin/registrations/:id
 * Delete an arena registration and its associated posts (admin only)
 */
router.delete('/arena/admin/registrations/:id', verifyJWT, async (req: Request, res: Response) => {
  try {
    const jwtUser = (req as any).jwtUser;
    const { id } = req.params;

    const db = admin.firestore();

    // Admin check
    const profileRef = db.collection('studentProfiles').doc(jwtUser.uid);
    const profileDoc = await profileRef.get();
    
    if (!profileDoc.exists || profileDoc.data()?.email !== COLLAB_ADMIN) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Get the registration to find the user's uid and categories
    const regDoc = await db.collection('arenaRegistrations').doc(id).get();
    if (!regDoc.exists) {
      return res.status(404).json({ error: 'Registration not found' });
    }

    const regData = regDoc.data();
    const userUid = regData?.uid;
    // Handle both legacy single category and new categories array
    let categories = regData?.categories || [];
    if (regData?.category && !categories.includes(regData.category)) {
      categories = [...categories, regData.category];
    }

    // Delete associated arena posts (arena_{uid}_{category})
    for (const category of categories) {
      const postDocId = `arena_${userUid}_${category}`;
      const postRef = db.collection('posts').doc(postDocId);
      const postDoc = await postRef.get();
      if (postDoc.exists) {
        await postRef.delete();
      }
    }

    // Also query and delete ALL arena posts by this user (catches any orphaned posts)
    if (userUid) {
      const arenaPosts = await db.collection('posts')
        .where('uid', '==', userUid)
        .where('type', '==', 'arena')
        .get();
      
      for (const postDoc of arenaPosts.docs) {
        await postDoc.ref.delete();
      }
    }

    // Delete the registration
    await db.collection('arenaRegistrations').doc(id).delete();

    res.json({ success: true, message: 'Registration and associated posts deleted' });
  } catch (error) {
    console.error('Error deleting arena registration:', error);
    res.status(500).json({ error: 'Failed to delete registration' });
  }
});

/**
 * DELETE /arena/admin/posts/:postId
 * Delete an orphaned arena post (admin only)
 */
router.delete('/arena/admin/posts/:postId', verifyJWT, async (req: Request, res: Response) => {
  try {
    const jwtUser = (req as any).jwtUser;
    const { postId } = req.params;

    const db = admin.firestore();

    // Admin check
    const profileRef = db.collection('studentProfiles').doc(jwtUser.uid);
    const profileDoc = await profileRef.get();
    
    if (!profileDoc.exists || profileDoc.data()?.email !== COLLAB_ADMIN) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const postRef = db.collection('posts').doc(postId);
    const postDoc = await postRef.get();
    
    if (!postDoc.exists) {
      return res.status(404).json({ error: 'Post not found' });
    }

    await postRef.delete();
    res.json({ success: true, message: 'Arena post deleted' });
  } catch (error) {
    console.error('Error deleting arena post:', error);
    res.status(500).json({ error: 'Failed to delete post' });
  }
});

/**
 * GET /arena/admin/orphaned-posts
 * Get arena posts that don't have associated registrations (admin only)
 */
router.get('/arena/admin/orphaned-posts', verifyJWT, async (req: Request, res: Response) => {
  try {
    const jwtUser = (req as any).jwtUser;
    const db = admin.firestore();

    // Admin check
    const profileRef = db.collection('studentProfiles').doc(jwtUser.uid);
    const profileDoc = await profileRef.get();
    
    if (!profileDoc.exists || profileDoc.data()?.email !== COLLAB_ADMIN) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Get all arena posts
    const arenaPosts = await db.collection('posts')
      .where('type', '==', 'arena')
      .get();
    
    // Get all arena registrations
    const registrations = await db.collection('arenaRegistrations').get();
    const registeredUids = new Set(registrations.docs.map(doc => doc.data().uid));

    // Find orphaned posts (posts without registration)
    const orphanedPosts = arenaPosts.docs
      .filter(doc => !registeredUids.has(doc.data().uid))
      .map(doc => ({
        id: doc.id,
        uid: doc.data().uid,
        title: doc.data().title,
        category: doc.data().category,
        createdAt: doc.data().createdAt,
        profile: doc.data().profile
      }));

    res.json(orphanedPosts);
  } catch (error) {
    console.error('Error getting orphaned posts:', error);
    res.status(500).json({ error: 'Failed to get orphaned posts' });
  }
});

/**
 * POST /statetech/register
 * Submit a STATETECH registration
 * Also auto-creates a Student Collab profile if one doesn't exist
 */
router.post('/statetech/register', verifyJWT, async (req: Request, res: Response) => {
  try {
    const jwtUser = (req as any).jwtUser;
    
    if (!jwtUser) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }
    
    // CRITICAL: Validate that we have a valid uid for the document ID
    // If uid is empty/undefined, generate a fallback UUID based on email or random
    let docId = jwtUser.uid;
    if (!docId || typeof docId !== 'string' || docId.trim() === '') {
      // Try to use email-based ID as fallback
      if (jwtUser.email && typeof jwtUser.email === 'string') {
        docId = `email_${jwtUser.email.replace(/[^a-zA-Z0-9]/g, '_')}`;
      } else {
        // Generate random UUID as last resort
        docId = `reg_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
      }
    }
    
    const db = admin.firestore();
    
    const {
      collegeName,
      branch,
      degree,
      year,
      category,
      leadName,
      leadEmail,
      leadPhone,
      teamMembers,
      proposalUrl,
      proposalFileName,
      paymentRequired,
      paymentStatus,
      transactionId,
      paymentScreenshot,
      registrationFee
    } = req.body || {};

    if (!collegeName || !category || !leadName || !leadEmail || !leadPhone) {
      return res.status(400).json({ success: false, error: 'Missing required fields: collegeName, category, leadName, leadEmail, or leadPhone' });
    }

    const existingProfile = jwtUser.uid ? await collabFirestore.getProfileByUid(jwtUser.uid) : null;
    
    let profileCreated = false;
    let profileIncomplete = true;
    let incompleteFields: string[] = [];

    if (!existingProfile) {
      const baseUsername = leadName.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 15);
      const randomSuffix = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
      const username = `${baseUsername}${randomSuffix}`;

      const newProfile = {
        role: 'Student',
        name: leadName,
        username,
        email: leadEmail,
        phone: leadPhone,
        college: collegeName,
        career: branch || 'Not specified',
        currentCourse: degree === '12th' ? '12th Science' : `${degree} - ${branch || 'Engineering'}`,
        skills: [],
        interests: [],
        bio: '',
        avatarUrl: '',
        isAvailableForCollab: true,
        createdFromStatetech: true,
      };

      try {
        await collabFirestore.createProfile(jwtUser.uid, undefined, newProfile);
        profileCreated = true;
      } catch (profileErr) {
        console.error('[STATETECH-SERVER] Error creating profile:', profileErr);
      }
      incompleteFields = ['bio', 'skills', 'interests', 'avatarUrl', 'primaryStream'];
    } else {
      const profile = existingProfile as any;
      incompleteFields = [];
      if (!profile.bio) incompleteFields.push('bio');
      if (!profile.skills || profile.skills.length === 0) incompleteFields.push('skills');
      if (!profile.interests || profile.interests.length === 0) incompleteFields.push('interests');
      if (!profile.avatarUrl) incompleteFields.push('avatarUrl');
      if (!profile.primaryStream) incompleteFields.push('primaryStream');
      profileIncomplete = incompleteFields.length > 0;
    }

    const registration = {
      uid: docId, // Use validated docId instead of potentially empty jwtUser.uid
      email: jwtUser.email || leadEmail, // Store email for reference
      collegeName,
      branch,
      degree,
      year: year || '',
      category,
      leadName,
      leadEmail,
      leadPhone,
      teamMembers: teamMembers || [],
      proposalUrl: proposalUrl || '',
      proposalFileName: proposalFileName || '',
      paymentRequired: paymentRequired !== false,
      paymentStatus: paymentStatus || 'pending',
      transactionId: transactionId || '',
      paymentScreenshot: paymentScreenshot || '',
      verificationStatus: 'submitted',
      registrationFee: registrationFee || 5000,
      profileLinked: !!existingProfile || profileCreated,
      verificationPriority: (!!existingProfile || profileCreated) ? 'high' : 'normal',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    // Use validated docId - this will never be empty/undefined
    await db.collection('statetech_registrations').doc(docId).set(registration);

    res.json({ 
      success: true, 
      message: 'Registration submitted successfully',
      profileCreated,
      profileIncomplete,
      incompleteFields
    });
  } catch (error: any) {
    console.error('[STATETECH-SERVER] ERROR:', error);
    console.error('[STATETECH-SERVER] Error stack:', error?.stack);
    res.status(500).json({ success: false, error: error?.message || 'Failed to submit registration' });
  }
});

/**
 * GET /statetech/registration
 * Get user's own STATETECH registration
 */
router.get('/statetech/registration', verifyJWT, async (req: Request, res: Response) => {
  try {
    const jwtUser = (req as any).jwtUser;
    const db = admin.firestore();
    
    // Handle potentially empty uid - use same fallback logic as registration
    let docId = jwtUser?.uid;
    if (!docId || typeof docId !== 'string' || docId.trim() === '') {
      if (jwtUser?.email && typeof jwtUser.email === 'string') {
        docId = `email_${jwtUser.email.replace(/[^a-zA-Z0-9]/g, '_')}`;
      } else {
        return res.json({ registration: null });
      }
    }
    
    const regDoc = await db.collection('statetech_registrations').doc(docId).get();
    
    if (!regDoc.exists) {
      return res.json({ registration: null });
    }

    res.json({ 
      registration: {
        id: regDoc.id,
        ...regDoc.data(),
        createdAt: regDoc.data()?.createdAt?.toDate?.()?.toISOString() || null
      }
    });
  } catch (error) {
    console.error('Error getting STATETECH registration:', error);
    res.status(500).json({ error: 'Failed to get registration' });
  }
});

/**
 * POST /statetech/link-profile
 * Link user's Student Collab profile to their STATETECH registration for priority verification
 */
router.post('/statetech/link-profile', verifyJWT, async (req: Request, res: Response) => {
  try {
    const jwtUser = (req as any).jwtUser;
    const db = admin.firestore();
    
    const regRef = db.collection('statetech_registrations').doc(jwtUser.uid);
    const regDoc = await regRef.get();
    
    if (!regDoc.exists) {
      return res.status(404).json({ error: 'Registration not found' });
    }

    const profileRef = db.collection('collab_profiles').doc(jwtUser.uid);
    const profileDoc = await profileRef.get();
    
    if (!profileDoc.exists) {
      return res.status(404).json({ error: 'Profile not found. Please create a profile first.' });
    }

    await regRef.update({
      profileLinked: true,
      profileLinkedAt: admin.firestore.FieldValue.serverTimestamp(),
      verificationPriority: 'high',
      linkedProfileId: jwtUser.uid,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    res.json({ 
      success: true, 
      message: 'Profile linked successfully. Your registration now has priority verification status.' 
    });
  } catch (error) {
    console.error('Error linking profile to STATETECH registration:', error);
    res.status(500).json({ error: 'Failed to link profile' });
  }
});

/**
 * GET /statetech/admin/registrations
 * Get all STATETECH registrations (admin only)
 */
router.get('/statetech/admin/registrations', verifyJWT, async (req: Request, res: Response) => {
  try {
    const jwtUser = (req as any).jwtUser;
    const db = admin.firestore();

    const STATETECH_ADMINS = STATETECH_ADMINS_LIST;
    const userEmail = jwtUser.email?.toLowerCase();
    if (!userEmail || !STATETECH_ADMINS.includes(userEmail)) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const registrationsSnapshot = await db.collection('statetech_registrations')
      .orderBy('createdAt', 'desc')
      .get();

    const registrations = registrationsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || null
    }));

    res.json(registrations);
  } catch (error) {
    console.error('Error getting STATETECH registrations:', error);
    res.status(500).json({ error: 'Failed to get registrations' });
  }
});

/**
 * PATCH /statetech/admin/registrations/:id/verify
 * Verify or reject a STATETECH registration (admin only)
 */
router.patch('/statetech/admin/registrations/:id/verify', verifyJWT, async (req: Request, res: Response) => {
  try {
    const jwtUser = (req as any).jwtUser;
    const { id } = req.params;
    const { status } = req.body;

    if (!['verified', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const db = admin.firestore();

    const STATETECH_ADMINS = STATETECH_ADMINS_LIST;
    const userEmail = jwtUser.email?.toLowerCase();
    if (!userEmail || !STATETECH_ADMINS.includes(userEmail)) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const regRef = db.collection('statetech_registrations').doc(id);
    await regRef.update({
      verificationStatus: status,
      verifiedAt: new Date(),
      verifiedBy: jwtUser.uid
    });

    res.json({ success: true, message: `Registration ${status}` });
  } catch (error) {
    console.error('Error verifying STATETECH registration:', error);
    res.status(500).json({ error: 'Failed to update registration' });
  }
});

/**
 * DELETE /statetech/admin/registrations/:id
 * Delete a STATETECH registration (admin only)
 */
router.delete('/statetech/admin/registrations/:id', verifyJWT, async (req: Request, res: Response) => {
  try {
    const jwtUser = (req as any).jwtUser;
    const { id } = req.params;

    const db = admin.firestore();

    const STATETECH_ADMINS = STATETECH_ADMINS_LIST;
    const userEmail = jwtUser.email?.toLowerCase();
    if (!userEmail || !STATETECH_ADMINS.includes(userEmail)) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    await db.collection('statetech_registrations').doc(id).delete();

    res.json({ success: true, message: 'Registration deleted' });
  } catch (error) {
    console.error('Error deleting STATETECH registration:', error);
    res.status(500).json({ error: 'Failed to delete registration' });
  }
});

/**
 * DELETE /statetech/admin/registrations
 * Clear all STATETECH registrations (admin only)
 */
router.delete('/statetech/admin/registrations', verifyJWT, async (req: Request, res: Response) => {
  try {
    const jwtUser = (req as any).jwtUser;
    const db = admin.firestore();

    const STATETECH_ADMINS = STATETECH_ADMINS_LIST;
    const userEmail = jwtUser.email?.toLowerCase();
    if (!userEmail || !STATETECH_ADMINS.includes(userEmail)) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const snapshot = await db.collection('statetech_registrations').get();
    const batch = db.batch();
    snapshot.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();

    res.json({ success: true, message: `Deleted ${snapshot.size} registrations` });
  } catch (error) {
    console.error('Error clearing STATETECH registrations:', error);
    res.status(500).json({ error: 'Failed to clear registrations' });
  }
});

export default router;
