import { Router, Request, Response } from "express";
import { storage } from "../storage";
import { collabSocial } from "../collab-social-firestore";
import { verifyJWT } from "./firebase-auth";
import * as admin from 'firebase-admin';
import { db } from "../db";
import { posts, reports, announcements, users } from "@shared/schema";
import { eq, desc, sql, and } from "drizzle-orm";

const router = Router();

// Middleware to check if user is admin
const requireAdmin = async (req: Request, res: Response, next: any) => {
  try {
    const jwtUser = (req as any).jwtUser;
    if (!jwtUser) {
      return res.status(401).json({ error: "Authentication required" });
    }

    // Check if user is admin
    const user = await storage.getUser(jwtUser.userId);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: "Admin access required" });
    }

    next();
  } catch (error) {
    res.status(500).json({ error: "Failed to verify admin access" });
  }
};

// Get all orders with enhanced details for admin dashboard
router.get("/orders", async (req: Request, res: Response) => {
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

// Get all users for admin management
router.get("/users", async (req: Request, res: Response) => {
  try {
    const users = await storage.getAllUsers();
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch users" });
  }
});

// ========== STUDENT COLLAB ADMIN FEATURES ==========

// ===== POST MANAGEMENT =====

// Get all Student Collab posts
router.get("/collab/posts", verifyJWT, requireAdmin, async (req: Request, res: Response) => {
  try {
    const allPosts = await collabSocial.getAllPostsForAdmin();
    res.json(allPosts);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch posts" });
  }
});

// Delete a post
router.delete("/collab/posts/:postId", verifyJWT, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { postId } = req.params;
    await collabSocial.deletePost(postId);
    res.json({ success: true, message: "Post deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete post" });
  }
});

// Feature a post (mark as Top of the Month)
router.post("/collab/posts/:postId/feature", verifyJWT, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { postId } = req.params;
    await collabSocial.featurePost(postId);
    res.json({ success: true, message: "Post featured successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to feature post" });
  }
});

// Unfeature a post
router.post("/collab/posts/:postId/unfeature", verifyJWT, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { postId } = req.params;
    await collabSocial.unfeaturePost(postId);
    res.json({ success: true, message: "Post unfeatured successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to unfeature post" });
  }
});

// Get featured posts
router.get("/collab/posts/featured", verifyJWT, requireAdmin, async (req: Request, res: Response) => {
  try {
    const featuredPosts = await collabSocial.getFeaturedPosts();
    res.json(featuredPosts);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch featured posts" });
  }
});

// ===== REPORTS & FEEDBACK =====

// Get all reports
router.get("/collab/reports", verifyJWT, requireAdmin, async (req: Request, res: Response) => {
  try {
    const allReports = await db.select().from(reports).orderBy(desc(reports.createdAt));
    
    // Enhance with reporter and reported user details
    const enhancedReports = await Promise.all(
      allReports.map(async (report) => {
        const reporter = await storage.getUser(report.reporterId);
        let reportedItem = null;
        
        if (report.reportedType === 'user') {
          reportedItem = await storage.getUser(report.reportedId);
        } else if (report.reportedType === 'post') {
          // Get post from Firestore
          try {
            const postDoc = await admin.firestore().collection('posts').doc(report.reportedId.toString()).get();
            if (postDoc.exists) {
              reportedItem = postDoc.data();
            }
          } catch (err) {
          }
        }
        
        return {
          ...report,
          reporter: reporter ? {
            id: reporter.id,
            username: reporter.username,
            email: reporter.email
          } : null,
          reportedItem
        };
      })
    );
    
    res.json(enhancedReports);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch reports" });
  }
});

// Take action on a report
router.post("/collab/reports/:reportId/action", verifyJWT, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { reportId } = req.params;
    const { action, actionTaken } = req.body;
    const jwtUser = (req as any).jwtUser;
    
    await db.update(reports)
      .set({
        status: action,
        actionTaken: actionTaken,
        reviewedBy: jwtUser.userId,
        reviewedAt: new Date()
      })
      .where(eq(reports.id, parseInt(reportId)));
    
    res.json({ success: true, message: "Action taken successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to take action" });
  }
});

// ===== ELECTION MANAGEMENT =====

// Get all elections
router.get("/collab/elections", verifyJWT, requireAdmin, async (req: Request, res: Response) => {
  try {
    const electionsSnapshot = await admin.firestore().collection('elections').get();
    const elections = electionsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    res.json(elections);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch elections" });
  }
});

// Create new election
router.post("/collab/elections", verifyJWT, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { title, startDate, endDate, clubs } = req.body;
    
    const electionRef = await admin.firestore().collection('elections').add({
      title,
      startDate: admin.firestore.Timestamp.fromDate(new Date(startDate)),
      endDate: admin.firestore.Timestamp.fromDate(new Date(endDate)),
      clubs: clubs || [],
      isActive: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    res.json({ success: true, electionId: electionRef.id });
  } catch (error) {
    res.status(500).json({ error: "Failed to create election" });
  }
});

// Add club to election
router.post("/collab/elections/:electionId/clubs", verifyJWT, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { electionId } = req.params;
    const { clubName, clubId } = req.body;
    
    const electionRef = admin.firestore().collection('elections').doc(electionId);
    await electionRef.update({
      clubs: admin.firestore.FieldValue.arrayUnion({ clubName, clubId, nominees: [] })
    });
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to add club" });
  }
});

// Add candidate to club
router.post("/collab/elections/:electionId/clubs/:clubId/candidates", verifyJWT, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { electionId, clubId } = req.params;
    const { name, post, manifesto, photoUrl } = req.body;
    
    const electionDoc = await admin.firestore().collection('elections').doc(electionId).get();
    const electionData = electionDoc.data();
    
    if (electionData && electionData.clubs) {
      const clubs = electionData.clubs.map((club: any) => {
        if (club.clubId === clubId) {
          return {
            ...club,
            nominees: [...(club.nominees || []), {
              id: `${clubId}_${Date.now()}`,
              name,
              post,
              manifesto,
              photoUrl
            }]
          };
        }
        return club;
      });
      
      await admin.firestore().collection('elections').doc(electionId).update({ clubs });
    }
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to add candidate" });
  }
});

// Get election results
router.get("/collab/elections/:electionId/results", verifyJWT, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { electionId } = req.params;
    
    // Get all votes
    const votesSnapshot = await admin.firestore().collection('club_votes').get();
    const votes = votesSnapshot.docs.map(doc => doc.data());
    
    // Count votes per nominee
    const voteCount: Record<string, number> = {};
    votes.forEach((vote: any) => {
      if (vote.nomineeId) {
        voteCount[vote.nomineeId] = (voteCount[vote.nomineeId] || 0) + 1;
      }
    });
    
    res.json({ voteCount, totalVotes: votes.length });
  } catch (error) {
    res.status(500).json({ error: "Failed to get election results" });
  }
});

// Lock/unlock election
router.post("/collab/elections/:electionId/lock", verifyJWT, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { electionId } = req.params;
    const { isLocked } = req.body;
    
    await admin.firestore().collection('elections').doc(electionId).update({
      isLocked: isLocked,
      lockedAt: isLocked ? admin.firestore.FieldValue.serverTimestamp() : null
    });
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to update election status" });
  }
});

// ===== ANALYTICS =====

// Get admin analytics
router.get("/collab/analytics", verifyJWT, requireAdmin, async (req: Request, res: Response) => {
  try {
    // Get total users count
    const allUsers = await storage.getAllUsers();
    const totalUsers = allUsers.length;
    const studentUsers = allUsers.filter(u => u.role === 'student').length;
    const adminUsers = allUsers.filter(u => u.role === 'admin').length;
    
    // Get total posts from Firestore
    const postsSnapshot = await admin.firestore().collection('posts').get();
    const totalPosts = postsSnapshot.size;
    
    // Get total organization profiles
    const orgProfilesSnapshot = await admin.firestore().collection('profiles')
      .where('role', 'in', ['Club', 'Community', 'Startup']).get();
    const totalOrgProfiles = orgProfilesSnapshot.size;
    
    // Get election participation
    const votesSnapshot = await admin.firestore().collection('club_votes').get();
    const electionParticipation = votesSnapshot.size;
    
    // Get daily active users from last 30 days (mock data for now)
    const last30Days = Array.from({ length: 30 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (29 - i));
      return {
        date: date.toISOString().split('T')[0],
        users: Math.floor(Math.random() * 50) + 10 // Mock data
      };
    });
    
    res.json({
      totalUsers,
      studentUsers,
      adminUsers,
      totalPosts,
      totalOrgProfiles,
      electionParticipation,
      dailyActiveUsers: last30Days
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch analytics" });
  }
});

// ===== ANNOUNCEMENTS =====

// Get all announcements
router.get("/collab/announcements", verifyJWT, requireAdmin, async (req: Request, res: Response) => {
  try {
    const allAnnouncements = await db.select().from(announcements).orderBy(desc(announcements.createdAt));
    res.json(allAnnouncements);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch announcements" });
  }
});

// Create announcement
router.post("/collab/announcements", verifyJWT, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { title, content, type, expiresAt } = req.body;
    const jwtUser = (req as any).jwtUser;
    
    const [announcement] = await db.insert(announcements).values({
      title,
      content,
      type: type || 'general',
      isActive: true,
      createdBy: jwtUser.userId,
      expiresAt: expiresAt ? new Date(expiresAt) : null
    }).returning();
    
    res.json(announcement);
  } catch (error) {
    res.status(500).json({ error: "Failed to create announcement" });
  }
});

// Toggle announcement active status
router.patch("/collab/announcements/:id/toggle", verifyJWT, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;
    
    await db.update(announcements)
      .set({ isActive })
      .where(eq(announcements.id, parseInt(id)));
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to toggle announcement" });
  }
});

// Delete announcement
router.delete("/collab/announcements/:id", verifyJWT, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    await db.delete(announcements).where(eq(announcements.id, parseInt(id)));
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete announcement" });
  }
});

// ===== ADMIN SETTINGS =====

// Get all admins
router.get("/collab/admins", verifyJWT, requireAdmin, async (req: Request, res: Response) => {
  try {
    const admins = await db.select().from(users).where(eq(users.role, 'admin'));
    res.json(admins);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch admins" });
  }
});

// Promote user to admin
router.post("/collab/admins/:userId/promote", verifyJWT, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    
    await db.update(users)
      .set({ role: 'admin' })
      .where(eq(users.id, parseInt(userId)));
    
    res.json({ success: true, message: "User promoted to admin" });
  } catch (error) {
    res.status(500).json({ error: "Failed to promote user" });
  }
});

// Demote admin to student
router.post("/collab/admins/:userId/demote", verifyJWT, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    
    await db.update(users)
      .set({ role: 'student' })
      .where(eq(users.id, parseInt(userId)));
    
    res.json({ success: true, message: "Admin demoted to student" });
  } catch (error) {
    res.status(500).json({ error: "Failed to demote admin" });
  }
});

export default router;