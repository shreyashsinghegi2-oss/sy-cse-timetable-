import { Router, Request, Response, NextFunction } from "express";
import { createHash } from "node:crypto";
import { getFirebaseAdmin, admin } from "../firebase-admin";
import { rateLimitMiddleware } from "../middleware/rate-limiter";
import { LANCING_ADMIN_EMAIL } from "../config/constants";

const router = Router();

// StudentLancing is now open to all users — no dev-mode gate.

const externalApplicationTypes = ["job", "internship", "micro_task", "competition"] as const;

async function getVerifiedLancingUid(req: Request): Promise<string | null> {
  const user = await getVerifiedLancingUser(req);
  return user?.uid || null;
}

async function getVerifiedLancingUser(req: Request): Promise<any | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) return null;

  try {
    return await admin.auth().verifyIdToken(authHeader.slice("Bearer ".length));
  } catch {
    return null;
  }
}

function isLancingPlatformAdmin(user: any): boolean {
  return typeof user?.email === "string" &&
    user.email.toLowerCase() === LANCING_ADMIN_EMAIL.toLowerCase();
}

function applicationCollectionFromRequest(type: unknown, sourceCollection?: unknown): string | null {
  if (sourceCollection !== undefined) {
    return sourceCollection === "opportunities" ? "opportunities" : null;
  }
  if (type === undefined || type === null || type === "" || type === "job") return "lancing_jobs";
  if (type === "internship") return "lancing_internships";
  if (type === "micro_task") return "microTasks";
  return "lancing_jobs";
}

async function canAccessListing(
  db: any,
  collection: string,
  listingId: string,
  user: any,
): Promise<{ exists: boolean; allowed: boolean; data?: any }> {
  const snapshot = await db.collection(collection).doc(listingId).get();
  if (!snapshot.exists) return { exists: false, allowed: false };
  const data = snapshot.data() || {};
  return {
    exists: true,
    allowed: isLancingPlatformAdmin(user) || data.companyId === user.uid || data.recruiterId === user.uid,
    data,
  };
}

async function canViewApplicantProfile(db: any, applicantId: string, user: any): Promise<boolean> {
  if (isLancingPlatformAdmin(user) || user.uid === applicantId) return true;
  for (const collection of ["lancing_jobs", "lancing_internships", "microTasks", "opportunities"]) {
    for (const ownerField of ["companyId", "recruiterId"]) {
      const postings = await db.collection(collection).where(ownerField, "==", user.uid).get();
      for (const posting of postings.docs) {
        const application = await db.collection(collection).doc(posting.id)
          .collection("applications").where("applicantId", "==", applicantId).limit(1).get();
        if (!application.empty) return true;
      }
    }
  }
  return false;
}

router.post(
  "/api/lancing/external-applications/mark-applied",
  rateLimitMiddleware.sensitive,
  async (req: Request, res: Response) => {
    try {
      if (!getFirebaseAdmin()) {
        return res.status(500).json({ error: "Firebase not configured" });
      }

      const uid = await getVerifiedLancingUid(req);
      if (!uid) return res.status(401).json({ error: "Invalid or missing authentication token" });

      const { opportunityId, title, company, category, source, externalUrl } = req.body || {};
      if (
        typeof title !== "string" || title.trim().length === 0 || title.trim().length > 200 ||
        typeof company !== "string" || company.trim().length === 0 || company.trim().length > 200 ||
        typeof source !== "string" || source.trim().length === 0 || source.trim().length > 100
      ) {
        return res.status(400).json({ error: "Title, company, and source are required and must be within allowed lengths" });
      }
      if (typeof category !== "string" || !externalApplicationTypes.includes(category as typeof externalApplicationTypes[number])) {
        return res.status(400).json({ error: "Invalid category" });
      }
      if (opportunityId !== undefined && (typeof opportunityId !== "string" || opportunityId.length > 500)) {
        return res.status(400).json({ error: "Invalid opportunityId" });
      }
      if (typeof externalUrl !== "string" || externalUrl.length > 2048 || /^\s*internal:/i.test(externalUrl)) {
        return res.status(400).json({ error: "A valid HTTPS external URL is required" });
      }

      let canonicalUrl: string;
      try {
        const parsedUrl = new URL(externalUrl);
        if (
          parsedUrl.protocol !== "https:" ||
          !parsedUrl.hostname ||
          parsedUrl.username !== "" ||
          parsedUrl.password !== ""
        ) {
          return res.status(400).json({ error: "A valid HTTPS external URL without credentials is required" });
        }
        parsedUrl.hash = "";
        parsedUrl.searchParams.sort();
        canonicalUrl = parsedUrl.href;
      } catch {
        return res.status(400).json({ error: "A valid HTTPS external URL is required" });
      }

      const applicationId = `ext_${createHash("sha256")
        .update(`${category}\n${canonicalUrl}`)
        .digest("hex")}`;
      const db = admin.firestore();
      const applicationRef = db.collection("lancing_users").doc(uid)
        .collection("applications").doc(applicationId);
      const appliedAt = new Date().toISOString();

      const existing = await db.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(applicationRef);
        if (snapshot.exists) return true;

        transaction.create(applicationRef, {
          application_type: "EXTERNAL",
          status: "under_process",
          appliedAt,
          type: category,
          externalUrl: canonicalUrl,
          jobTitle: title.trim(),
          companyName: company.trim(),
          source: source.trim(),
        });
        return false;
      });

      return res.json({ applicationId, existing });
    } catch (error: any) {
      console.error("[LANCING API] Mark external application error:", error);
      return res.status(500).json({ error: "Failed to record external application" });
    }
  },
);

router.get("/api/lancing/my-applications", async (req: Request, res: Response) => {
  try {
    if (!getFirebaseAdmin()) {
      return res.status(500).json({ error: "Firebase not configured" });
    }

    const uid = await getVerifiedLancingUid(req);
    if (!uid) return res.status(401).json({ error: "Invalid or missing authentication token" });

    const snapshot = await admin.firestore()
      .collection("lancing_users").doc(uid)
      .collection("applications")
      .limit(500)
      .get();
    const applications = snapshot.docs
      .map((doc) => ({ ...doc.data(), id: doc.id } as Record<string, any>))
      .sort((a, b) => {
        const timestamp = (value: any): number => {
          if (!value) return 0;
          if (typeof value.toDate === "function") return value.toDate().getTime();
          const parsed = value instanceof Date ? value.getTime() : Date.parse(String(value));
          return Number.isFinite(parsed) ? parsed : 0;
        };
        const aTime = timestamp(a.appliedAt) || timestamp(a.createdAt);
        const bTime = timestamp(b.appliedAt) || timestamp(b.createdAt);
        return bTime - aTime;
      })
      .slice(0, 200);
    return res.json({ applications });
  } catch (error: any) {
    console.error("[LANCING API] Get my applications error:", error);
    return res.status(500).json({ error: "Failed to fetch applications" });
  }
});

router.post("/api/lancing/apply", async (req: Request, res: Response) => {
  try {
    const firebaseApp = getFirebaseAdmin();
    if (!firebaseApp) {
      return res.status(500).json({ error: "Firebase not configured" });
    }

    // T005 SECURITY: Require auth — derive applicantId from verified token, not body.
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Authentication required to apply" });
    }
    let verifiedUid: string;
    let verifiedEmail: string | undefined;
    try {
      const decoded = await admin.auth().verifyIdToken(authHeader.split("Bearer ")[1]);
      verifiedUid = decoded.uid;
      verifiedEmail = decoded.email;
    } catch {
      return res.status(401).json({ error: "Invalid authentication token" });
    }

    const { jobId, jobTitle, companyName, companyLogo, applicantName, applicantEmail, applicantPhone: bodyPhone, applicantProfileImage, applicantSkills, message, type, sourceCollection } = req.body;
    const applicantId = verifiedUid; // never trust body

    if (!jobId || !applicantName) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const requestedCollection = applicationCollectionFromRequest(type, sourceCollection);
    if (!requestedCollection) {
      return res.status(400).json({ error: "Invalid sourceCollection or opportunity type" });
    }
    if (sourceCollection !== undefined && !["job", "internship", "micro_task"].includes(type)) {
      return res.status(400).json({ error: "A valid opportunity type is required" });
    }
    if (sourceCollection === "opportunities") {
      const postingSnapshot = await admin.firestore().collection("opportunities").doc(jobId).get();
      const posting = postingSnapshot.data();
      if (!postingSnapshot.exists || posting?.status !== "open") {
        return res.status(404).json({ error: "Opportunity is not open or does not exist" });
      }
      if (posting.type !== type) {
        return res.status(400).json({ error: "Opportunity type does not match the requested type" });
      }
    }

    // T005 GATE: Server-side readiness check — block if < 70%.
    try {
      const db0 = admin.firestore();
      const profileSnap = await db0.collection("placement_profiles").doc(applicantId).get();
      if (profileSnap.exists) {
        const prof = profileSnap.data() || {};
        const selected: string[] = prof.selected_skills || [];
        if (selected.length > 0) {
          const skillsSnap = await db0.collection("skill_progress").doc(applicantId).collection("skills").get();
          const byKey: Record<string, any> = {};
          skillsSnap.forEach(d => { byKey[d.id] = d.data(); });
          const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
          let learning = 0, passed = 0;
          for (const s of selected) {
            const p = byKey[norm(s)] || {};
            if (p.status === "self_completed" || p.status === "coe_verified") learning++;
            if (p.levels?.level_1?.passed) passed++;
          }
          const skillsScore = Math.round((learning / selected.length) * 35);
          const activityScore = Math.min(25, Math.min(10, skillsSnap.size) + Math.min(10, passed * 2) + (prof.last_updated ? 5 : 0));
          let profileScore = 0;
          if (prof.degree) profileScore += 2.5;
          if (prof.target_role) profileScore += 2.5;
          if (selected.length >= 3) profileScore += 2.5;
          if (prof.year) profileScore += 2.5;
          const cgpaScore = Math.min(10, Math.round(((prof.verified_cgpa || prof.self_reported_cgpa || 0) / 10) * 10));
          const total = skillsScore + activityScore + Math.round(profileScore) + cgpaScore;
          if (total < 70) {
            return res.status(403).json({
              error: "Placement readiness gate not met",
              readiness_score: total,
              threshold: 70,
              hint: "Improve your placement readiness in the Portal before applying.",
            });
          }
        }
      }
    } catch (gateErr: any) {
      console.warn("[LANCING APPLY] readiness gate skipped:", gateErr?.message);
    }

    // Resolve applicant phone — prefer body, else fall back to the freelancer's profile
    let applicantPhone = bodyPhone || "";
    if (!applicantPhone) {
      try {
        const userDoc = await admin.firestore().collection("lancing_users").doc(applicantId).get();
        applicantPhone = userDoc.data()?.phoneNumber || "";
      } catch {}
    }

    const db = admin.firestore();

    // Preserve legacy routing unless the caller explicitly targets a generic opportunity.
    const jobCollection = requestedCollection;

    // Use a deterministic ID to prevent race condition duplicates
    const applicationId = `${jobId}_${applicantId}`;
    
    // Check if the user has already applied to this job (prevent duplicates)
    const existingApplicationDoc = await db.collection(jobCollection)
      .doc(jobId)
      .collection("applications")
      .doc(applicationId)
      .get();

    if (existingApplicationDoc.exists) {
      return res.status(400).json({ 
        error: "You have already applied to this opportunity",
        alreadyApplied: true 
      });
    }

    const appliedAt = new Date().toISOString();

    // Save to company's job applications subcollection
    await db.collection(jobCollection).doc(jobId).collection("applications").doc(applicationId).set({
      applicantId,
      applicantName,
      applicantEmail: applicantEmail || "",
      applicantPhone,
      applicantProfileImage: applicantProfileImage || "",
      applicantSkills: applicantSkills || [],
      message: message || "",
      status: "under_process",
      appliedAt
    });

    // Save to freelancer's applications
    await db.collection("lancing_users").doc(applicantId).collection("applications").doc(applicationId).set({
      jobId,
      jobTitle,
      companyName,
      companyLogo: companyLogo || "",
      type: type || "job",
      ...(sourceCollection === "opportunities" ? { sourceCollection } : {}),
      status: "under_process",
      appliedAt,
      applicantPhone,
      message: message || ""
    });

    res.json({ 
      success: true, 
      applicationId,
      appliedAt
    });
  } catch (error: any) {
    console.error("[LANCING API] Apply error:", error);
    res.status(500).json({ error: error.message || "Failed to submit application" });
  }
});

// Get applications for a specific job
router.get("/api/lancing/jobs/:jobId/applications", async (req: Request, res: Response) => {
  try {
    const firebaseApp = getFirebaseAdmin();
    if (!firebaseApp) {
      return res.status(500).json({ error: "Firebase not configured" });
    }

    const user = await getVerifiedLancingUser(req);
    if (!user) return res.status(401).json({ error: "Invalid or missing authentication token" });

    const { jobId } = req.params;
    const { type } = req.query; // job, internship, micro_task
    const jobCollection = applicationCollectionFromRequest(type, req.query.sourceCollection);
    if (!jobCollection) return res.status(400).json({ error: "Invalid sourceCollection or opportunity type" });

    const db = admin.firestore();
    const access = await canAccessListing(db, jobCollection, jobId, user);
    if (!access.exists) return res.status(404).json({ error: "Listing not found" });
    if (!access.allowed) return res.status(403).json({ error: "Forbidden" });
    const applicationsSnapshot = await db.collection(jobCollection).doc(jobId).collection("applications").get();
    
    const applications = applicationsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.json({ applications });
  } catch (error: any) {
    console.error("[LANCING API] Get applications error:", error);
    res.status(500).json({ error: error.message || "Failed to fetch applications" });
  }
});

// Update application status (Accept/Reject)
router.patch("/api/lancing/applications/:applicationId/status", async (req: Request, res: Response) => {
  try {
    const firebaseApp = getFirebaseAdmin();
    if (!firebaseApp) {
      return res.status(500).json({ error: "Firebase not configured" });
    }

    const user = await getVerifiedLancingUser(req);
    if (!user) return res.status(401).json({ error: "Invalid or missing authentication token" });

    const { applicationId } = req.params;
    const { status, jobId, applicantId, type, sourceCollection } = req.body;

    if (!status || !jobId || !applicantId) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    if (!["accepted", "rejected", "under_process", "shortlisted", "hired"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const jobCollection = applicationCollectionFromRequest(type, sourceCollection);
    if (!jobCollection) return res.status(400).json({ error: "Invalid sourceCollection or opportunity type" });

    const db = admin.firestore();
    const access = await canAccessListing(db, jobCollection, jobId, user);
    if (!access.exists) return res.status(404).json({ error: "Listing not found" });
    if (!access.allowed) return res.status(403).json({ error: "Forbidden" });
    const applicationRef = db.collection(jobCollection).doc(jobId).collection("applications").doc(applicationId);
    const applicationSnapshot = await applicationRef.get();
    if (!applicationSnapshot.exists) return res.status(404).json({ error: "Application not found" });
    if (applicationSnapshot.data()?.applicantId !== applicantId) {
      return res.status(403).json({ error: "Application does not match the applicant" });
    }
    
    // Update in job's applications subcollection
    await applicationRef.update({
      status,
      updatedAt: new Date().toISOString()
    });

    // Update in freelancer's applications
    await db.collection("lancing_users").doc(applicantId).collection("applications").doc(applicationId).update({
      status,
      updatedAt: new Date().toISOString()
    });

    res.json({ success: true, status });
  } catch (error: any) {
    console.error("[LANCING API] Update status error:", error);
    res.status(500).json({ error: error.message || "Failed to update status" });
  }
});

// Get all jobs for a company with their applications
router.get("/api/lancing/company/:companyId/jobs", async (req: Request, res: Response) => {
  try {
    const firebaseApp = getFirebaseAdmin();
    if (!firebaseApp) {
      return res.status(500).json({ error: "Firebase not configured" });
    }

    const user = await getVerifiedLancingUser(req);
    if (!user) return res.status(401).json({ error: "Invalid or missing authentication token" });
    const { companyId } = req.params;
    if (user.uid !== companyId && !isLancingPlatformAdmin(user)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    const db = admin.firestore();

    // Get all jobs for this company
    const jobsSnapshot = await db.collection("lancing_jobs").where("companyId", "==", companyId).get();
    
    const jobs = await Promise.all(jobsSnapshot.docs.map(async (jobDoc) => {
      const applicationsSnapshot = await db.collection("lancing_jobs").doc(jobDoc.id).collection("applications").get();
      const applications = applicationsSnapshot.docs.map(appDoc => ({
        id: appDoc.id,
        ...appDoc.data()
      }));
      
      return {
        id: jobDoc.id,
        ...jobDoc.data(),
        type: "job",
        applications,
        applicationsCount: applications.length
      };
    }));

    // Also get internships for this company
    const internshipsSnapshot = await db.collection("lancing_internships").where("companyId", "==", companyId).get();
    const internships = await Promise.all(internshipsSnapshot.docs.map(async (doc) => {
      const applicationsSnapshot = await db.collection("lancing_internships").doc(doc.id).collection("applications").get();
      const applications = applicationsSnapshot.docs.map(appDoc => ({
        id: appDoc.id,
        ...appDoc.data()
      }));
      return {
        id: doc.id,
        ...doc.data(),
        type: "internship",
        applications,
        applicationsCount: applications.length
      };
    }));

    // Also get micro tasks for this company
    const microTasksSnapshot = await db.collection("microTasks").where("companyId", "==", companyId).get();
    const microTasks = await Promise.all(microTasksSnapshot.docs.map(async (doc) => {
      const applicationsSnapshot = await db.collection("microTasks").doc(doc.id).collection("applications").get();
      const applications = applicationsSnapshot.docs.map(appDoc => ({
        id: appDoc.id,
        ...appDoc.data()
      }));
      return {
        id: doc.id,
        ...doc.data(),
        type: "microtask",
        applications,
        applicationsCount: applications.length
      };
    }));

    const opportunitiesSnapshot = await db.collection("opportunities").where("companyId", "==", companyId).get();
    const opportunities = await Promise.all(opportunitiesSnapshot.docs.map(async (doc) => {
      const applicationsSnapshot = await db.collection("opportunities").doc(doc.id).collection("applications").get();
      const applications = applicationsSnapshot.docs.map(appDoc => ({
        id: appDoc.id,
        ...appDoc.data()
      }));
      return {
        id: doc.id,
        ...doc.data(),
        type: doc.data()?.type || "job",
        sourceCollection: "opportunities",
        applications,
        applicationsCount: applications.length
      };
    }));

    res.json({ jobs, internships, microTasks, opportunities });
  } catch (error: any) {
    console.error("[LANCING API] Get company jobs error:", error);
    res.status(500).json({ error: error.message || "Failed to fetch jobs" });
  }
});

// Get all posts for an angel recruiter with their applications
router.get("/api/lancing/angel/:recruiterId/posts", async (req: Request, res: Response) => {
  try {
    const firebaseApp = getFirebaseAdmin();
    if (!firebaseApp) {
      return res.status(500).json({ error: "Firebase not configured" });
    }

    const user = await getVerifiedLancingUser(req);
    if (!user) return res.status(401).json({ error: "Invalid or missing authentication token" });
    const { recruiterId } = req.params;
    if (user.uid !== recruiterId && !isLancingPlatformAdmin(user)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    const db = admin.firestore();

    // Get jobs for this angel recruiter
    const jobsSnapshot = await db.collection("lancing_jobs").where("recruiterId", "==", recruiterId).get();
    const jobs = await Promise.all(jobsSnapshot.docs.map(async (jobDoc) => {
      const applicationsSnapshot = await db.collection("lancing_jobs").doc(jobDoc.id).collection("applications").get();
      const applications = applicationsSnapshot.docs.map(appDoc => ({
        id: appDoc.id,
        ...appDoc.data()
      }));
      return {
        id: jobDoc.id,
        ...jobDoc.data(),
        type: "job",
        applications,
        applicationsCount: applications.length
      };
    }));

    // Get internships for this angel recruiter
    const internshipsSnapshot = await db.collection("lancing_internships").where("recruiterId", "==", recruiterId).get();
    const internships = await Promise.all(internshipsSnapshot.docs.map(async (doc) => {
      const applicationsSnapshot = await db.collection("lancing_internships").doc(doc.id).collection("applications").get();
      const applications = applicationsSnapshot.docs.map(appDoc => ({
        id: appDoc.id,
        ...appDoc.data()
      }));
      return {
        id: doc.id,
        ...doc.data(),
        type: "internship",
        applications,
        applicationsCount: applications.length
      };
    }));

    // Get micro tasks for this angel recruiter
    const microTasksSnapshot = await db.collection("microTasks").where("recruiterId", "==", recruiterId).get();
    const microTasks = await Promise.all(microTasksSnapshot.docs.map(async (doc) => {
      const applicationsSnapshot = await db.collection("microTasks").doc(doc.id).collection("applications").get();
      const applications = applicationsSnapshot.docs.map(appDoc => ({
        id: appDoc.id,
        ...appDoc.data()
      }));
      return {
        id: doc.id,
        ...doc.data(),
        type: "microtask",
        applications,
        applicationsCount: applications.length
      };
    }));

    res.json({ jobs, internships, microTasks });
  } catch (error: any) {
    console.error("[LANCING API] Get angel posts error:", error);
    res.status(500).json({ error: error.message || "Failed to fetch posts" });
  }
});

// Get applicant profile (limited info for recruiters)
router.get("/api/lancing/applicant/:applicantId/profile", async (req: Request, res: Response) => {
  try {
    const firebaseApp = getFirebaseAdmin();
    if (!firebaseApp) {
      return res.status(500).json({ error: "Firebase not configured" });
    }

    const user = await getVerifiedLancingUser(req);
    if (!user) return res.status(401).json({ error: "Invalid or missing authentication token" });
    const { applicantId } = req.params;
    const db = admin.firestore();
    if (!(await canViewApplicantProfile(db, applicantId, user))) {
      return res.status(403).json({ error: "Forbidden" });
    }

    // Get applicant profile data
    const profileDoc = await db.collection("lancing_users").doc(applicantId).collection("profile").doc("data").get();
    
    if (!profileDoc.exists) {
      return res.status(404).json({ error: "Profile not found" });
    }

    const profileData = profileDoc.data();

    // Return only recruiter-relevant information
    const limitedProfile = {
      fullName: profileData?.fullName || "",
      skills: profileData?.skills || [],
      aboutMe: profileData?.aboutMe || "",
      experience: profileData?.experience || profileData?.aboutMe || "",
      resumeUrl: profileData?.resumeUrl || null,
      certificateUrl: profileData?.certificateUrl || null,
      profileImageUrl: profileData?.profileImageUrl || null
    };

    res.json({ profile: limitedProfile });
  } catch (error: any) {
    console.error("[LANCING API] Get applicant profile error:", error);
    res.status(500).json({ error: error.message || "Failed to fetch profile" });
  }
});

// Delete file (resume or certificate) for freelancer
router.post("/api/lancing/delete-file", async (req: Request, res: Response) => {
  try {
    const firebaseApp = getFirebaseAdmin();
    if (!firebaseApp) {
      return res.status(500).json({ error: "Firebase not configured" });
    }

    // Verify the user from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const token = authHeader.split("Bearer ")[1];
    const decodedToken = await admin.auth().verifyIdToken(token);
    const userId = decodedToken.uid;

    const { fileType } = req.body;
    
    if (!fileType || !["resume", "certificate"].includes(fileType)) {
      return res.status(400).json({ error: "Invalid file type. Must be 'resume' or 'certificate'" });
    }

    const db = admin.firestore();
    
    // Get current profile to find the file URL
    const profileRef = db.collection("lancing_users").doc(userId).collection("profile").doc("data");
    const profileDoc = await profileRef.get();
    
    if (!profileDoc.exists) {
      return res.status(404).json({ error: "Profile not found" });
    }

    const profileData = profileDoc.data();
    const fieldName = fileType === "resume" ? "resumeUrl" : "certificateUrl";
    const fileUrl = profileData?.[fieldName];

    if (fileUrl) {
      // Try to delete the file from Firebase Storage
      try {
        const bucket = admin.storage().bucket();
        
        // Extract the file path from the URL
        // URLs look like: https://storage.googleapis.com/bucket-name/path/to/file
        // or: https://firebasestorage.googleapis.com/v0/b/bucket-name/o/path%2Fto%2Ffile?alt=media...
        let filePath = "";
        
        if (fileUrl.includes("firebasestorage.googleapis.com")) {
          // Firebase Storage URL format
          const match = fileUrl.match(/\/o\/(.+?)\?/);
          if (match) {
            filePath = decodeURIComponent(match[1]);
          }
        } else if (fileUrl.includes("storage.googleapis.com")) {
          // Direct GCS URL format
          const urlParts = new URL(fileUrl);
          filePath = urlParts.pathname.split("/").slice(2).join("/");
        }
        
        if (filePath) {
          await bucket.file(filePath).delete();
        }
      } catch (storageError: any) {
        // Log but don't fail if file deletion fails (file might already be gone)
        console.warn(`[LANCING API] Could not delete file from storage: ${storageError.message}`);
      }
    }

    // Update profile to remove the URL
    const updateData: any = {};
    updateData[fieldName] = admin.firestore.FieldValue.delete();
    
    await profileRef.update(updateData);

    res.json({ success: true, message: `${fileType} deleted successfully` });
  } catch (error: any) {
    console.error("[LANCING API] Delete file error:", error);
    res.status(500).json({ error: error.message || "Failed to delete file" });
  }
});

// Hire applicant - updates status and creates notification
router.post("/api/lancing/applications/:applicationId/hire", async (req: Request, res: Response) => {
  try {
    const firebaseApp = getFirebaseAdmin();
    if (!firebaseApp) {
      return res.status(500).json({ error: "Firebase not configured" });
    }

    const user = await getVerifiedLancingUser(req);
    if (!user) return res.status(401).json({ error: "Invalid or missing authentication token" });

    const { applicationId } = req.params;
    const { jobId, jobTitle, applicantId, recruiterName, companyName, type, sourceCollection, hiringMessage: customMessage, paymentAmount } = req.body;

    if (!jobId || !jobTitle || !applicantId) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const jobCollection = applicationCollectionFromRequest(type, sourceCollection);
    if (!jobCollection) return res.status(400).json({ error: "Invalid sourceCollection or opportunity type" });

    const db = admin.firestore();
    const access = await canAccessListing(db, jobCollection, jobId, user);
    if (!access.exists) return res.status(404).json({ error: "Listing not found" });
    if (!access.allowed) return res.status(403).json({ error: "Forbidden" });
    const applicationRef = db.collection(jobCollection).doc(jobId).collection("applications").doc(applicationId);
    const applicationSnapshot = await applicationRef.get();
    if (!applicationSnapshot.exists) return res.status(404).json({ error: "Application not found" });
    if (applicationSnapshot.data()?.applicantId !== applicantId) {
      return res.status(403).json({ error: "Application does not match the applicant" });
    }
    const recruiterId = user.uid;
    const hiredAt = new Date().toISOString();
    
    // Update application status to "hired" in job's applications subcollection with escrow info
    await applicationRef.update({
      status: "hired",
      hiredAt,
      hiredBy: recruiterId,
      updatedAt: hiredAt,
      escrowStatus: "pending",
      escrowAmount: paymentAmount || 0
    });

    // Update in freelancer's applications
    await db.collection("lancing_users").doc(applicantId).collection("applications").doc(applicationId).update({
      status: "hired",
      hiredAt,
      hiredBy: recruiterId,
      updatedAt: hiredAt,
      escrowStatus: "pending",
      escrowAmount: paymentAmount || 0
    });

    // Create notification for the student
    const notificationId = `notif_${Date.now()}`;
    await db.collection("lancing_users").doc(applicantId).collection("notifications").doc(notificationId).set({
      type: "hired",
      title: "Congratulations! You're Hired! 🎉",
      message: `You are hired for the ${type === "internship" ? "internship" : type === "micro_task" ? "micro task" : "job"}: ${jobTitle}`,
      jobId,
      jobTitle,
      jobType: type || "job",
      applicationId,
      recruiterId,
      recruiterName: recruiterName || "Recruiter",
      requiresContactSubmission: true,
      contactSubmitted: false,
      createdAt: hiredAt,
      read: false,
      escrowAmount: paymentAmount || 0
    });

    // Create a message in the messaging system with the custom hiring message
    const messageId = `msg_${Date.now()}`;
    const finalMessage = customMessage || `Congratulations! 🎉 You've been hired for the ${type === "internship" ? "internship" : type === "micro_task" ? "micro task" : "job"}: ${jobTitle}\n\nPlease submit your contact details (email and phone number) so we can reach you.`;
    
    await db.collection("lancing_messages").doc(messageId).set({
      senderUid: recruiterId,
      receiverUid: applicantId,
      text: finalMessage,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      isRead: false,
      type: "hiring",
      jobId,
      jobTitle,
      jobType: type || "job",
      applicationId,
      recruiterName: recruiterName || "Recruiter",
      companyName: companyName || "Company",
      escrowAmount: paymentAmount || 0
    });

    res.json({ 
      success: true, 
      status: "hired",
      notificationId,
      messageId,
      hiredAt,
      escrowStatus: "pending",
      escrowAmount: paymentAmount || 0
    });
  } catch (error: any) {
    console.error("[LANCING API] Hire applicant error:", error);
    res.status(500).json({ error: error.message || "Failed to hire applicant" });
  }
});

// Submit contact details after being hired
router.post("/api/lancing/applications/:applicationId/contact", async (req: Request, res: Response) => {
  try {
    const firebaseApp = getFirebaseAdmin();
    if (!firebaseApp) {
      return res.status(500).json({ error: "Firebase not configured" });
    }

    const user = await getVerifiedLancingUser(req);
    if (!user) return res.status(401).json({ error: "Invalid or missing authentication token" });

    const { applicationId } = req.params;
    const { applicantId, jobId, email, phoneNumber, type, sourceCollection } = req.body;

    if (!applicantId || !jobId || !email || !phoneNumber) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    if (user.uid !== applicantId) return res.status(403).json({ error: "Forbidden" });

    const jobCollection = applicationCollectionFromRequest(type, sourceCollection);
    if (!jobCollection) return res.status(400).json({ error: "Invalid sourceCollection or opportunity type" });

    const db = admin.firestore();
    const submittedAt = new Date().toISOString();
    const applicationRef = db.collection(jobCollection).doc(jobId).collection("applications").doc(applicationId);
    const applicationSnapshot = await applicationRef.get();
    if (!applicationSnapshot.exists) return res.status(404).json({ error: "Application not found" });
    if (applicationSnapshot.data()?.applicantId !== applicantId || applicationSnapshot.data()?.status !== "hired") {
      return res.status(403).json({ error: "Contact details can only be submitted for your hired application" });
    }

    // Store contact details in the application (job's subcollection)
    await applicationRef.update({
      hiredContactEmail: email,
      hiredContactPhone: phoneNumber,
      contactSubmittedAt: submittedAt
    });

    // Mark contact as submitted in freelancer's applications
    await db.collection("lancing_users").doc(applicantId).collection("applications").doc(applicationId).update({
      contactSubmitted: true,
      contactSubmittedAt: submittedAt
    });

    // Update all related notifications to mark contact as submitted
    const notificationsSnapshot = await db.collection("lancing_users").doc(applicantId)
      .collection("notifications")
      .where("applicationId", "==", applicationId)
      .get();

    // Get the freelancer's name for the message
    const freelancerProfile = await db.collection("lancing_users").doc(applicantId).collection("profile").doc("data").get();
    const freelancerName = freelancerProfile.data()?.fullName || "Applicant";

    // Use the verified application loaded above to find the recruiter.
    const applicationData = applicationSnapshot.data();
    const hiredBy = applicationData?.hiredBy;

    const batch = db.batch();
    notificationsSnapshot.docs.forEach(doc => {
      batch.update(doc.ref, { contactSubmitted: true });
    });
    await batch.commit();

    // Create a message to the recruiter with the contact details
    if (hiredBy) {
      const messageId = `msg_${Date.now()}`;
      const contactMessage = `${freelancerName} has submitted their contact details!\n\n📧 Email: ${email}\n📱 Phone: ${phoneNumber}`;
      
      // Get escrow data from application
      const escrowAmount = applicationData?.escrowAmount || 0;
      const escrowStatus = applicationData?.escrowStatus || "pending";
      const jobTitle = applicationData?.jobTitle || "";
      
      await db.collection("lancing_messages").doc(messageId).set({
        senderUid: applicantId,
        receiverUid: hiredBy,
        text: contactMessage,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        isRead: false,
        type: "contact_submission",
        freelancerName,
        contactEmail: email,
        contactPhone: phoneNumber,
        // Include escrow payment data for the recruiter to process payment
        applicationId,
        jobId,
        jobType: type || "job",
        escrowAmount,
        escrowStatus,
        jobTitle
      });
    }

    res.json({ 
      success: true, 
      contactSubmittedAt: submittedAt 
    });
  } catch (error: any) {
    console.error("[LANCING API] Submit contact error:", error);
    res.status(500).json({ error: error.message || "Failed to submit contact" });
  }
});

// Get notifications for a freelancer
router.get("/api/lancing/freelancer/:userId/notifications", async (req: Request, res: Response) => {
  try {
    const firebaseApp = getFirebaseAdmin();
    if (!firebaseApp) {
      return res.status(500).json({ error: "Firebase not configured" });
    }

    const { userId } = req.params;
    const db = admin.firestore();

    const notificationsSnapshot = await db.collection("lancing_users").doc(userId)
      .collection("notifications")
      .orderBy("createdAt", "desc")
      .limit(50)
      .get();

    const notifications = notificationsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.json({ notifications });
  } catch (error: any) {
    console.error("[LANCING API] Get notifications error:", error);
    res.status(500).json({ error: error.message || "Failed to fetch notifications" });
  }
});

// Mark notification as read
router.patch("/api/lancing/notifications/:notificationId/read", async (req: Request, res: Response) => {
  try {
    const firebaseApp = getFirebaseAdmin();
    if (!firebaseApp) {
      return res.status(500).json({ error: "Firebase not configured" });
    }

    const { notificationId } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: "Missing userId" });
    }

    const db = admin.firestore();
    await db.collection("lancing_users").doc(userId).collection("notifications").doc(notificationId).update({
      read: true
    });

    res.json({ success: true });
  } catch (error: any) {
    console.error("[LANCING API] Mark notification read error:", error);
    res.status(500).json({ error: error.message || "Failed to update notification" });
  }
});

// Get messages for a freelancer (hiring messages and contact submissions)
router.get("/api/lancing/freelancer/:userId/messages", async (req: Request, res: Response) => {
  try {
    const firebaseApp = getFirebaseAdmin();
    if (!firebaseApp) {
      return res.status(500).json({ error: "Firebase not configured" });
    }

    const { userId } = req.params;
    const authHeader = req.headers.authorization;
    
    // Basic authorization check - require auth header with matching userId
    if (!authHeader || authHeader !== `Bearer ${userId}`) {
      return res.status(403).json({ error: "Unauthorized access" });
    }

    const db = admin.firestore();

    // Get messages where user is the receiver (hiring messages from recruiters)
    // Note: We don't use orderBy to avoid needing a composite index
    const receivedMessagesSnapshot = await db.collection("lancing_messages")
      .where("receiverUid", "==", userId)
      .limit(50)
      .get();

    const messages = receivedMessagesSnapshot.docs.map(doc => {
      const data = doc.data();
      // Properly convert Firestore timestamp to ISO string
      let createdAtTimestamp = Date.now();
      let createdAtStr = new Date().toISOString();
      if (data.createdAt) {
        if (typeof data.createdAt.toDate === 'function') {
          const date = data.createdAt.toDate();
          createdAtStr = date.toISOString();
          createdAtTimestamp = date.getTime();
        } else if (data.createdAt._seconds) {
          const date = new Date(data.createdAt._seconds * 1000);
          createdAtStr = date.toISOString();
          createdAtTimestamp = date.getTime();
        }
      }
      
      return {
        id: doc.id,
        senderUid: data.senderUid || "",
        receiverUid: data.receiverUid || "",
        text: data.text || "",
        type: data.type || "message",
        isRead: data.isRead || false,
        jobId: data.jobId || "",
        jobTitle: data.jobTitle || "",
        jobType: data.jobType || "job",
        applicationId: data.applicationId || "",
        recruiterName: data.recruiterName || "Recruiter",
        createdAt: createdAtStr,
        createdAtTimestamp
      };
    });

    // Sort by createdAt descending (newest first) in code
    messages.sort((a, b) => b.createdAtTimestamp - a.createdAtTimestamp);

    res.json({ messages });
  } catch (error: any) {
    console.error("[LANCING API] Get messages error:", error);
    res.status(500).json({ error: error.message || "Failed to fetch messages" });
  }
});

// Get messages for a recruiter (contact submissions from freelancers)
router.get("/api/lancing/recruiter/:userId/messages", async (req: Request, res: Response) => {
  try {
    const firebaseApp = getFirebaseAdmin();
    if (!firebaseApp) {
      return res.status(500).json({ error: "Firebase not configured" });
    }

    const { userId } = req.params;
    const authHeader = req.headers.authorization;
    
    // Basic authorization check - require auth header with matching userId
    if (!authHeader || authHeader !== `Bearer ${userId}`) {
      return res.status(403).json({ error: "Unauthorized access" });
    }

    const db = admin.firestore();

    // Get messages where recruiter is the receiver (contact submissions)
    // Note: We don't use orderBy to avoid needing a composite index
    const receivedMessagesSnapshot = await db.collection("lancing_messages")
      .where("receiverUid", "==", userId)
      .limit(50)
      .get();

    const messages = receivedMessagesSnapshot.docs.map(doc => {
      const data = doc.data();
      // Properly convert Firestore timestamp to ISO string
      let createdAtTimestamp = Date.now();
      let createdAtStr = new Date().toISOString();
      if (data.createdAt) {
        if (typeof data.createdAt.toDate === 'function') {
          const date = data.createdAt.toDate();
          createdAtStr = date.toISOString();
          createdAtTimestamp = date.getTime();
        } else if (data.createdAt._seconds) {
          const date = new Date(data.createdAt._seconds * 1000);
          createdAtStr = date.toISOString();
          createdAtTimestamp = date.getTime();
        }
      }
      
      return {
        id: doc.id,
        senderUid: data.senderUid || "",
        receiverUid: data.receiverUid || "",
        text: data.text || "",
        type: data.type || "message",
        isRead: data.isRead || false,
        freelancerName: data.freelancerName || "",
        contactEmail: data.contactEmail || "",
        contactPhone: data.contactPhone || "",
        createdAt: createdAtStr,
        createdAtTimestamp,
        // Include escrow payment data for contact submissions
        applicationId: data.applicationId || "",
        jobId: data.jobId || "",
        jobType: data.jobType || "job",
        escrowAmount: data.escrowAmount || 0,
        escrowStatus: data.escrowStatus || "pending",
        jobTitle: data.jobTitle || ""
      };
    });

    // Sort by createdAt descending (newest first) in code
    messages.sort((a, b) => b.createdAtTimestamp - a.createdAtTimestamp);

    res.json({ messages });
  } catch (error: any) {
    console.error("[LANCING API] Get recruiter messages error:", error);
    res.status(500).json({ error: error.message || "Failed to fetch messages" });
  }
});

// Fund escrow - marks payment as funded after Razorpay verification
router.post("/api/lancing/escrow/:applicationId/fund", async (req: Request, res: Response) => {
  try {
    const firebaseApp = getFirebaseAdmin();
    if (!firebaseApp) {
      return res.status(500).json({ error: "Firebase not configured" });
    }

    const { applicationId } = req.params;
    const { jobId, applicantId, amount, razorpayOrderId, razorpayPaymentId, razorpaySignature, type, recruiterId } = req.body;

    if (!jobId || !applicantId || !amount || !razorpayPaymentId || !razorpaySignature || !recruiterId) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Verify Razorpay payment signature
    const crypto = require("crypto");
    const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;
    const RAZORPAY_KEY_ID     = process.env.RAZORPAY_KEY_ID;
    if (!RAZORPAY_KEY_SECRET || !RAZORPAY_KEY_ID) {
      return res.status(500).json({ error: "Payment verification not configured" });
    }

    const body = razorpayOrderId + "|" + razorpayPaymentId;
    const expectedSignature = crypto
      .createHmac("sha256", RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest("hex");

    if (expectedSignature !== razorpaySignature) {
      console.error("[ESCROW] Payment signature verification failed");
      return res.status(400).json({ error: "Payment verification failed" });
    }

    // SECURITY: after HMAC verification, cross-check the order amount server-side
    // against Razorpay's API — never trust the client-supplied amount.
    if (razorpayOrderId) {
      try {
        const rzpAuth = Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString("base64");
        const orderRes = await fetch(`https://api.razorpay.com/v1/orders/${razorpayOrderId}`, {
          headers: { Authorization: `Basic ${rzpAuth}` },
        });
        if (orderRes.ok) {
          const orderData: any = await orderRes.json();
          // Razorpay returns amount in paise; convert to rupees
          const rzpAmountRupees = orderData.amount / 100;
          const clientAmountRupees = parseFloat(amount);
          if (Math.abs(rzpAmountRupees - clientAmountRupees) > 1) {
            console.error(`[ESCROW] Amount mismatch — Razorpay: ₹${rzpAmountRupees}, Client claimed: ₹${clientAmountRupees}`);
            return res.status(400).json({ error: "Payment amount mismatch. Please contact support." });
          }
        } else {
          console.warn("[ESCROW] Could not fetch Razorpay order for cross-check:", orderRes.status);
        }
      } catch (rzpErr: any) {
        // Log but don't block on network errors — HMAC is already verified
        console.warn("[ESCROW] Razorpay order cross-check failed:", rzpErr?.message);
      }
    }

    let jobCollection = "lancing_jobs";
    if (type === "internship") {
      jobCollection = "lancing_internships";
    } else if (type === "micro_task") {
      jobCollection = "microTasks";
    }

    const db = admin.firestore();

    // Verify the recruiter is authorized (they must be the one who hired the applicant)
    const applicationDoc = await db.collection(jobCollection).doc(jobId).collection("applications").doc(applicationId).get();
    const appData = applicationDoc.data();
    
    if (!appData || appData.hiredBy !== recruiterId) {
      return res.status(403).json({ error: "Unauthorized - only the hiring recruiter can fund escrow" });
    }

    const fundedAt = new Date().toISOString();
    const escrowAmount = amount;

    // Update escrow status in job's applications subcollection
    await db.collection(jobCollection).doc(jobId).collection("applications").doc(applicationId).update({
      escrowStatus: "funded",
      escrowAmount: escrowAmount,
      razorpayOrderId,
      razorpayPaymentId,
      escrowFundedAt: fundedAt,
      updatedAt: fundedAt
    });

    // Update in freelancer's applications
    await db.collection("lancing_users").doc(applicantId).collection("applications").doc(applicationId).update({
      escrowStatus: "funded",
      escrowAmount: escrowAmount,
      escrowFundedAt: fundedAt,
      updatedAt: fundedAt
    });

    // Create escrow transaction record
    const transactionId = `escrow_${Date.now()}`;
    await db.collection("lancing_escrow_transactions").doc(transactionId).set({
      applicationId,
      jobId,
      applicantId,
      amount,
      razorpayOrderId,
      razorpayPaymentId,
      status: "funded",
      fundedAt,
      createdAt: fundedAt
    });

    // Notify freelancer that escrow has been funded
    const messageId = `msg_${Date.now()}`;
    await db.collection("lancing_messages").doc(messageId).set({
      senderUid: "system",
      receiverUid: applicantId,
      text: `Great news! 💰 The payment of ₹${amount} has been secured in escrow. You can start working on the task. Once the recruiter confirms work completion, the payment will be released to you.`,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      isRead: false,
      type: "escrow_funded",
      jobId,
      applicationId,
      escrowAmount: amount
    });

    res.json({ 
      success: true, 
      escrowStatus: "funded",
      transactionId,
      fundedAt
    });
  } catch (error: any) {
    console.error("[LANCING API] Fund escrow error:", error);
    res.status(500).json({ error: error.message || "Failed to fund escrow" });
  }
});

// Release escrow - releases payment to freelancer after work completion
router.post("/api/lancing/escrow/:applicationId/release", async (req: Request, res: Response) => {
  try {
    const firebaseApp = getFirebaseAdmin();
    if (!firebaseApp) {
      return res.status(500).json({ error: "Firebase not configured" });
    }

    const { applicationId } = req.params;
    const { jobId, applicantId, type, recruiterId } = req.body;

    if (!jobId || !applicantId || !recruiterId) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    let jobCollection = "lancing_jobs";
    if (type === "internship") {
      jobCollection = "lancing_internships";
    } else if (type === "micro_task") {
      jobCollection = "microTasks";
    }

    const db = admin.firestore();

    // Get the application to verify recruiter and get escrow amount
    const applicationDoc = await db.collection(jobCollection).doc(jobId).collection("applications").doc(applicationId).get();
    const appData = applicationDoc.data();
    
    if (!appData) {
      return res.status(404).json({ error: "Application not found" });
    }

    // Verify the recruiter is authorized
    if (appData.hiredBy !== recruiterId) {
      return res.status(403).json({ error: "Unauthorized - only the hiring recruiter can release escrow" });
    }

    // Verify escrow is funded before releasing
    if (appData.escrowStatus !== "funded") {
      return res.status(400).json({ error: "Escrow must be funded before release" });
    }

    const releasedAt = new Date().toISOString();
    const escrowAmount = appData.escrowAmount || 0;

    // Update escrow status in job's applications subcollection
    await db.collection(jobCollection).doc(jobId).collection("applications").doc(applicationId).update({
      escrowStatus: "released",
      workApproved: true,
      workApprovedAt: releasedAt,
      escrowReleasedAt: releasedAt,
      updatedAt: releasedAt
    });

    // Update in freelancer's applications
    await db.collection("lancing_users").doc(applicantId).collection("applications").doc(applicationId).update({
      escrowStatus: "released",
      workApproved: true,
      workApprovedAt: releasedAt,
      escrowReleasedAt: releasedAt,
      updatedAt: releasedAt
    });

    // Update escrow transaction record
    const transactionsSnapshot = await db.collection("lancing_escrow_transactions")
      .where("applicationId", "==", applicationId)
      .limit(1)
      .get();

    if (!transactionsSnapshot.empty) {
      const transactionDoc = transactionsSnapshot.docs[0];
      await transactionDoc.ref.update({
        status: "released",
        releasedAt,
        updatedAt: releasedAt
      });
    }

    // Notify freelancer that payment has been released
    const messageId = `msg_${Date.now()}`;
    await db.collection("lancing_messages").doc(messageId).set({
      senderUid: "system",
      receiverUid: applicantId,
      text: `🎉 Congratulations! The payment of ₹${escrowAmount} has been released! The recruiter has confirmed that the work is complete. Thank you for your great work!`,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      isRead: false,
      type: "escrow_released",
      jobId,
      applicationId,
      escrowAmount
    });

    res.json({ 
      success: true, 
      escrowStatus: "released",
      releasedAt,
      amount: escrowAmount
    });
  } catch (error: any) {
    console.error("[LANCING API] Release escrow error:", error);
    res.status(500).json({ error: error.message || "Failed to release escrow" });
  }
});

export default router;
