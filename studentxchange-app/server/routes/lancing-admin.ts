import { Router, Request, Response } from "express";
import { getFirebaseAdmin, admin } from "../firebase-admin";
import { LANCING_ADMIN_EMAIL } from "../config/constants";
import {
  listCompetitionSourceHealth,
  refreshLancingSources,
  setCompetitionSourceEnabled,
} from "../utils/lancing-sources";

const router = Router();

const ADMIN_EMAIL = LANCING_ADMIN_EMAIL;

// Admin routes are open — admin identity verified per-route by verifyLancingAdmin.

async function verifyLancingAdmin(req: Request, res: Response, next: Function) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const token = authHeader.split("Bearer ")[1];
    const firebaseApp = getFirebaseAdmin();
    if (!firebaseApp) {
      return res.status(500).json({ error: "Firebase not configured" });
    }

    const decodedToken = await admin.auth().verifyIdToken(token);
    if (decodedToken.email?.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
      return res.status(403).json({ error: "Access denied. Admin only." });
    }

    (req as any).user = decodedToken;
    next();
  } catch (error: any) {
    console.error("[LANCING ADMIN] Auth error:", error);
    return res.status(401).json({ error: "Invalid token" });
  }
}

router.get("/api/lancing/admin/competition-sources", verifyLancingAdmin, async (_req: Request, res: Response) => {
  try {
    return res.json({ sources: await listCompetitionSourceHealth() });
  } catch {
    return res.status(503).json({ error: "Competition source status unavailable" });
  }
});

router.patch("/api/lancing/admin/competition-sources/:id", verifyLancingAdmin, async (req: Request, res: Response) => {
  if (typeof req.body?.enabled !== "boolean") return res.status(400).json({ error: "enabled must be a boolean" });
  try {
    const updated = await setCompetitionSourceEnabled(req.params.id, req.body.enabled);
    return updated ? res.json({ enabled: req.body.enabled }) : res.status(403).json({ error: "Source is not approved for collection" });
  } catch {
    return res.status(503).json({ error: "Source settings unavailable" });
  }
});

router.post("/api/lancing/admin/competition-sources/refresh", verifyLancingAdmin, async (_req: Request, res: Response) => {
  try {
    return res.json(await refreshLancingSources({ category: "competitions", force: true }));
  } catch {
    return res.status(503).json({ error: "Competition refresh unavailable" });
  }
});

router.get("/api/lancing/admin/analytics", verifyLancingAdmin, async (req: Request, res: Response) => {
  try {
    const db = admin.firestore();
    
    const [freelancersSnap, companiesSnap, angelSnap, jobsSnap, microTasksSnap, internshipsSnap] = await Promise.all([
      db.collection("lancing_users").where("role", "==", "freelancer").get(),
      db.collection("lancing_users").where("role", "==", "company").get(),
      db.collection("lancing_users").where("role", "==", "angel").get(),
      db.collection("lancing_jobs").get(),
      db.collection("microTasks").get(),
      db.collection("lancing_internships").get()
    ]);

    res.json({
      freelancers: freelancersSnap.size,
      companies: companiesSnap.size,
      angelRecruiters: angelSnap.size,
      totalJobs: jobsSnap.size + microTasksSnap.size + internshipsSnap.size,
      regularJobs: jobsSnap.size,
      microTasks: microTasksSnap.size,
      internships: internshipsSnap.size
    });
  } catch (error: any) {
    console.error("[LANCING ADMIN] Analytics error:", error);
    res.status(500).json({ error: error.message || "Failed to fetch analytics" });
  }
});

router.get("/api/lancing/admin/jobs", verifyLancingAdmin, async (req: Request, res: Response) => {
  try {
    const db = admin.firestore();
    
    const [jobsSnap, microTasksSnap, internshipsSnap] = await Promise.all([
      db.collection("lancing_jobs").orderBy("createdAt", "desc").limit(100).get(),
      db.collection("microTasks").orderBy("createdAt", "desc").limit(100).get(),
      db.collection("lancing_internships").orderBy("createdAt", "desc").limit(100).get()
    ]);

    const jobs = jobsSnap.docs.map(doc => ({
      id: doc.id,
      type: "job",
      ...doc.data()
    }));

    const microTasks = microTasksSnap.docs.map(doc => ({
      id: doc.id,
      type: "micro_task",
      ...doc.data()
    }));

    const internships = internshipsSnap.docs.map(doc => ({
      id: doc.id,
      type: "internship",
      ...doc.data()
    }));

    const allJobs = [...jobs, ...microTasks, ...internships].sort((a, b) => {
      const getTime = (val: any): number => {
        if (!val) return 0;
        if (val._seconds) return val._seconds * 1000;
        if (typeof val === 'string') return new Date(val).getTime() || 0;
        if (val.toDate) return val.toDate().getTime();
        return new Date(val).getTime() || 0;
      };
      return getTime((b as any).createdAt) - getTime((a as any).createdAt);
    });

    res.json({ jobs: allJobs });
  } catch (error: any) {
    console.error("[LANCING ADMIN] Get jobs error:", error);
    res.status(500).json({ error: error.message || "Failed to fetch jobs" });
  }
});

router.delete("/api/lancing/admin/jobs/:jobId", verifyLancingAdmin, async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;
    const { type } = req.body;
    const db = admin.firestore();

    const collections = [
      { name: "lancing_jobs", type: "job" },
      { name: "microTasks", type: "micro_task" },
      { name: "lancing_internships", type: "internship" }
    ];

    let foundCollection: string | null = null;
    
    for (const col of collections) {
      const doc = await db.collection(col.name).doc(jobId).get();
      if (doc.exists) {
        foundCollection = col.name;
        break;
      }
    }

    if (!foundCollection) {
      return res.status(404).json({ error: "Job not found" });
    }

    const applicationsSnap = await db.collection(foundCollection).doc(jobId).collection("applications").get();
    const batch = db.batch();
    applicationsSnap.docs.forEach(doc => batch.delete(doc.ref));
    batch.delete(db.collection(foundCollection).doc(jobId));
    await batch.commit();

    res.json({ success: true });
  } catch (error: any) {
    console.error("[LANCING ADMIN] Delete job error:", error);
    res.status(500).json({ error: error.message || "Failed to delete job" });
  }
});

router.get("/api/lancing/admin/users", verifyLancingAdmin, async (req: Request, res: Response) => {
  try {
    const db = admin.firestore();
    const usersSnap = await db.collection("lancing_users").limit(200).get();
    
    const users = await Promise.all(usersSnap.docs.map(async (userDoc) => {
      const userData = userDoc.data();
      let profileData: any = {};
      let authEmail = userData.email || "";
      
      try {
        const authUser = await admin.auth().getUser(userDoc.id);
        authEmail = authUser.email || authEmail;
      } catch (e) {
      }
      
      if (userData.role === "freelancer") {
        const profileDoc = await db.collection("lancing_users").doc(userDoc.id).collection("profile").doc("data").get();
        if (profileDoc.exists) profileData = profileDoc.data() || {};
      } else if (userData.role === "company") {
        const profileDoc = await db.collection("lancing_users").doc(userDoc.id).collection("company_profile").doc("data").get();
        if (profileDoc.exists) profileData = profileDoc.data() || {};
      } else if (userData.role === "angel") {
        const profileDoc = await db.collection("lancing_users").doc(userDoc.id).collection("angel_profile").doc("data").get();
        if (profileDoc.exists) profileData = profileDoc.data() || {};
      }

      const displayName = profileData.fullName || profileData.companyName || profileData.name || userData.displayName || "";
      const phoneNumber = profileData.phoneNumber || profileData.phone || userData.phoneNumber || "";

      return {
        id: userDoc.id,
        ...userData,
        email: authEmail,
        displayName: displayName,
        phoneNumber,
        profile: profileData
      };
    }));

    res.json({ users });
  } catch (error: any) {
    console.error("[LANCING ADMIN] Get users error:", error);
    res.status(500).json({ error: error.message || "Failed to fetch users" });
  }
});

router.delete("/api/lancing/admin/users/:userId", verifyLancingAdmin, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const adminUser = (req as any).user;
    
    if (adminUser.uid === userId) {
      return res.status(400).json({ error: "Cannot delete your own admin account" });
    }

    const db = admin.firestore();
    
    const userDoc = await db.collection("lancing_users").doc(userId).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: "User not found" });
    }

    const userData = userDoc.data();
    
    if (userData?.role === "freelancer") {
      const profileRef = db.collection("lancing_users").doc(userId).collection("profile").doc("data");
      const applicationsRef = db.collection("lancing_users").doc(userId).collection("applications");
      const applicationsSnap = await applicationsRef.get();
      
      const batch = db.batch();
      batch.delete(profileRef);
      applicationsSnap.docs.forEach(doc => batch.delete(doc.ref));
      await batch.commit();
    } else if (userData?.role === "company") {
      const profileRef = db.collection("lancing_users").doc(userId).collection("company_profile").doc("data");
      await profileRef.delete();
    } else if (userData?.role === "angel") {
      const profileRef = db.collection("lancing_users").doc(userId).collection("angel_profile").doc("data");
      await profileRef.delete();
    }

    await db.collection("lancing_users").doc(userId).delete();
    
    res.json({ success: true });
  } catch (error: any) {
    console.error("[LANCING ADMIN] Delete user error:", error);
    res.status(500).json({ error: error.message || "Failed to delete user" });
  }
});

router.patch("/api/lancing/admin/users/:userId/disable", verifyLancingAdmin, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { disabled } = req.body;
    const adminUser = (req as any).user;
    
    if (adminUser.uid === userId) {
      return res.status(400).json({ error: "Cannot disable your own admin account" });
    }

    const db = admin.firestore();
    await db.collection("lancing_users").doc(userId).update({
      disabled: disabled === true,
      disabledAt: disabled ? new Date().toISOString() : null
    });

    res.json({ success: true, disabled });
  } catch (error: any) {
    console.error("[LANCING ADMIN] Disable user error:", error);
    res.status(500).json({ error: error.message || "Failed to disable user" });
  }
});

// All applications across all students — admin only
router.get("/api/lancing/admin/all-applications", verifyLancingAdmin, async (req: Request, res: Response) => {
  try {
    const db = admin.firestore();
    const usersSnap = await db.collection("lancing_users").limit(300).get();

    const allApps: any[] = [];
    await Promise.all(
      usersSnap.docs.map(async (userDoc) => {
        try {
          const appsSnap = await db
            .collection("lancing_users")
            .doc(userDoc.id)
            .collection("applications")
            .get();
          const userData = userDoc.data();
          appsSnap.forEach((appDoc) => {
            allApps.push({
              id: appDoc.id,
              studentUid: userDoc.id,
              studentEmail: userData.email || "",
              ...appDoc.data(),
            });
          });
        } catch {
          // skip users with no applications subcollection
        }
      })
    );

    allApps.sort(
      (a, b) =>
        new Date(b.appliedAt || 0).getTime() - new Date(a.appliedAt || 0).getTime()
    );

    res.json({ applications: allApps });
  } catch (error: any) {
    console.error("[LANCING ADMIN] All applications error:", error);
    res.status(500).json({ error: error.message || "Failed to fetch applications" });
  }
});

// Update application status — admin version (no job/applicant validation, just status patch)
router.patch("/api/lancing/admin/applications/:applicationId/status", verifyLancingAdmin, async (req: Request, res: Response) => {
  try {
    const { applicationId } = req.params;
    const { status, studentUid, jobId, type } = req.body;
    if (!status || !studentUid) return res.status(400).json({ error: "Missing fields" });

    const db = admin.firestore();
    // Update freelancer's applications copy
    await db
      .collection("lancing_users")
      .doc(studentUid)
      .collection("applications")
      .doc(applicationId)
      .update({ status, updatedAt: new Date().toISOString() });

    // Best-effort update in the job subcollection
    if (jobId && type) {
      const jobCollection =
        type === "internship" ? "lancing_internships" : type === "micro_task" ? "microTasks" : "lancing_jobs";
      try {
        await db
          .collection(jobCollection)
          .doc(jobId)
          .collection("applications")
          .doc(applicationId)
          .update({ status, updatedAt: new Date().toISOString() });
      } catch {}
    }

    res.json({ success: true, status });
  } catch (error: any) {
    console.error("[LANCING ADMIN] Update application status error:", error);
    res.status(500).json({ error: error.message || "Failed to update" });
  }
});

export default router;
