import { admin } from './firebase-admin';
import type { InsertStudentProfile } from '@shared/schema';
import type { Firestore } from 'firebase-admin/firestore';

// Firestore collection names
const PROFILES_COLLECTION = 'studentProfiles';
const NOMINEES_COLLECTION = 'clubNominees';
const VOTES_COLLECTION = 'clubVotes';

// Stable namespace for Collab profiles belonging to SQL-only password
// sessions. Firebase UIDs are never generated in this namespace.
export const SQL_ONLY_COLLAB_UID_PREFIX = 'sql-session:';

export function getSqlOnlyCollabUid(userId: number): string {
  if (!Number.isInteger(userId) || userId <= 0) {
    throw new Error('A positive SQL user id is required for a Collab session');
  }
  return `${SQL_ONLY_COLLAB_UID_PREFIX}${userId}`;
}

export function isSqlOnlyCollabUid(uid: unknown): uid is string {
  return typeof uid === 'string' && uid.startsWith(SQL_ONLY_COLLAB_UID_PREFIX);
}

/**
 * Normalize the owner claim in a server-issued SQL session. Old JWTs omitted
 * uid, so derive the same stable owner key used by new password logins.
 * A reserved-prefix claim is only valid when it names the token's SQL user.
 */
export function normalizeSqlOnlyCollabUidClaim(userId: number, uid: unknown): string {
  const expectedUid = getSqlOnlyCollabUid(userId);
  if (uid === undefined || uid === null || uid === '') return expectedUid;
  if (typeof uid !== 'string') {
    throw new Error('Collab identity must be a string');
  }
  if (isSqlOnlyCollabUid(uid) && uid !== expectedUid) {
    throw new Error('SQL Collab identity does not match the JWT userId');
  }
  return uid;
}

// Profile role types
export type ProfileRole =
  | 'Student'
  | 'Club'
  | 'Community'
  | 'Company'
  // These are the role names used by the current Collab profile contract.
  // Keep the legacy role names above readable so existing documents continue
  // to work while new clients can use the canonical names below.
  | 'Professional'
  | 'Organisation'
  | 'Organization';

// Election nominee role types
export type NomineeRole = 'President' | 'Secretary' | 'Treasurer';

// Nominee interface
export interface ClubNominee {
  id: string;
  name: string;
  role: NomineeRole;
  club: string;
  bio: string;
  imageUrl: string;
  votesCount: number;
  createdAt: Date;
}

// Vote interface
export interface ClubVote {
  id: string;
  userId: string; // Firebase UID
  nomineeId: string;
  role: NomineeRole;
  club: string;
  createdAt: Date;
}

// Base profile fields common to all roles
interface BaseProfile {
  id: string; // Firebase UID
  uid: string;
  userId?: number; // Keep for compatibility with PostgreSQL
  role: ProfileRole;
  email: string;
  createdAt: Date;
  updatedAt: Date;
}

// Student Profile
export interface FirebaseStudentProfile extends BaseProfile {
  role: 'Student';
  name: string;
  username: string;
  phone?: string;
  college: string;
  career: string;
  primaryStream?: string | null;
  subStreams?: string[];
  specialties?: string[];
  skills: string[];
  currentCourse: string;
  interests: string[];
  passions?: string[];
  studentLifeActivities?: string[];
  openToCrossStreamCollab?: boolean;
  preferredCollabTypes?: string[];
  bio?: string;
  avatarUrl?: string;
  isAvailableForCollab?: boolean;
}

// Club Profile
export interface FirebaseClubProfile extends BaseProfile {
  role: 'Club';
  clubName: string;
  category: 'Technical' | 'Cultural' | 'Sports' | 'Social' | 'Departmental';
  foundedYear: number;
  aboutClub: string;
  facultyCoordinatorName: string;
  studentHeadName: string;
  contactEmail: string;
  socialMediaLinks?: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
    linkedin?: string;
    website?: string;
  };
}

// Community Profile
export interface FirebaseCommunityProfile extends BaseProfile {
  role: 'Community';
  communityName: string;
  missionVision: string;
  category: 'Tech' | 'Research' | 'Social' | 'Cultural';
  contactPerson: string;
  contactEmail: string;
  websiteJoinLink?: string;
  socialLinks?: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
    linkedin?: string;
    discord?: string;
  };
}

// Company/Recruiter Profile
export interface FirebaseCompanyProfile extends BaseProfile {
  role: 'Company';
  companyName: string;
  industryType: string;
  aboutCompany: string;
  recruiterName: string;
  designation: string;
  contactEmail: string;
  websiteCareersPage?: string;
  linkedinProfile?: string;
}

/**
 * Professional and organisation profiles are intentionally open-ended.
 * Unlike the original Club/Community/Company forms, these roles are supplied
 * by the newer Collab profile builder and may gain fields independently.
 * The route validates their common identity fields before they reach here.
 */
export interface FirebaseProfessionalProfile extends BaseProfile {
  role: 'Professional';
  [key: string]: unknown;
}

export interface FirebaseOrganisationProfile extends BaseProfile {
  role: 'Organisation' | 'Organization';
  [key: string]: unknown;
}

// Union type for all profiles
export type FirebaseProfile = 
  | FirebaseStudentProfile 
  | FirebaseClubProfile 
  | FirebaseCommunityProfile 
  | FirebaseCompanyProfile
  | FirebaseProfessionalProfile
  | FirebaseOrganisationProfile;

export class ProfileAlreadyExistsError extends Error {
  readonly code = 'PROFILE_EXISTS';

  constructor(uid: string) {
    super(`A Collab profile already exists for Firebase user ${uid}`);
    this.name = 'ProfileAlreadyExistsError';
  }
}

function removeUndefinedValues(value: any): any {
  if (Array.isArray(value)) {
    return value
      .filter(item => item !== undefined)
      .map(item => removeUndefinedValues(item));
  }

  if (value && typeof value === 'object' && !(value instanceof Date)) {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, item]) => item !== undefined)
        .map(([key, item]) => [key, removeUndefinedValues(item)])
    );
  }

  return value;
}

/**
 * CollabFirestoreService - Handles Student Collab profile operations in Firebase Firestore
 * Uses Firebase UID as document ID for seamless integration with Firebase Auth
 */
export class CollabFirestoreService {
  constructor(private readonly firestoreOverride?: Firestore) {}

  private get db() {
    return this.firestoreOverride || admin.firestore();
  }

  /**
   * Get profile by Firebase UID (supports all profile types)
   */
  async getProfileByUid(uid: string): Promise<FirebaseProfile | null> {
    try {
      const docRef = this.db.collection(PROFILES_COLLECTION).doc(uid);
      const doc = await docRef.get();
      
      if (!doc.exists) {
        return null;
      }
      
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
      } as FirebaseProfile;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get profile by username (Student profiles only)
   */
  async getProfileByUsername(username: string): Promise<FirebaseProfile | null> {
    try {
      const snapshot = await this.db.collection(PROFILES_COLLECTION)
        .where('username', '==', username)
        .limit(1)
        .get();
      if (snapshot.empty) {
        return null;
      }
      const doc = snapshot.docs[0];
      return { id: doc.id, ...doc.data() } as FirebaseProfile;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Create new profile (supports all profile types)
   * Uses Firebase UID as document ID
   * Note: userId may be undefined for users authenticated via Firebase token fallback
   */
  async createProfile(uid: string, userId: number | undefined, profileData: any): Promise<FirebaseProfile> {
    if (!uid || typeof uid !== 'string') {
      throw new Error('A Firebase UID is required to create a profile');
    }

    const docRef = this.db.collection(PROFILES_COLLECTION).doc(uid);
    const now = new Date();
    const profileDataWithoutIdentity = { ...(profileData || {}) };
    // Identity is owned by the verified token and the method arguments, never
    // by a request body passed by a caller.
    delete profileDataWithoutIdentity.uid;
    delete profileDataWithoutIdentity.id;
    delete profileDataWithoutIdentity.userId;

    const profile: any = {
      ...profileDataWithoutIdentity,
      uid,
      ...(userId !== undefined ? { userId } : {}),
      createdAt: now,
      updatedAt: now,
    };
    const cleanProfile = removeUndefinedValues(profile);

    // The route-level existence check is only an optimization.  A transaction
    // is required here because two POSTs can otherwise both observe an empty
    // document and overwrite one another.
    await this.db.runTransaction(async (transaction: any) => {
      const existing = await transaction.get(docRef);
      if (existing.exists) {
        throw new ProfileAlreadyExistsError(uid);
      }
      transaction.create(docRef, cleanProfile);
    });

    return {
      id: uid,
      ...cleanProfile,
    } as FirebaseProfile;
  }

  /**
   * Update profile (supports all profile types)
   */
  async updateProfile(uid: string, profileData: any): Promise<FirebaseProfile | null> {
    if (!uid || typeof uid !== 'string') {
      throw new Error('A Firebase UID is required to update a profile');
    }

    const docRef = this.db.collection(PROFILES_COLLECTION).doc(uid);
    const updates = { ...(profileData || {}) };
    // A profile's document id and Firebase identity are immutable.  In
    // particular, don't send undefined through to Firestore, which rejects it
    // unless ignoreUndefinedProperties is enabled.
    delete updates.id;
    delete updates.createdAt;
    delete updates.uid;
    delete updates.userId;
    updates.updatedAt = new Date();

    const cleanUpdates = removeUndefinedValues(updates);
    const updated = await this.db.runTransaction(async (transaction: any) => {
      const doc = await transaction.get(docRef);
      if (!doc.exists) {
        return null;
      }
      transaction.update(docRef, cleanUpdates);
      return {
        id: doc.id,
        ...doc.data(),
        ...cleanUpdates,
      };
    });

    return updated as FirebaseProfile | null;
  }

  /**
   * Delete student profile
   */
  async deleteProfile(uid: string): Promise<boolean> {
    try {
      const docRef = this.db.collection(PROFILES_COLLECTION).doc(uid);
      await docRef.delete();
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get all profiles (supports all profile types: Student, Club, Community, Company)
   */
  async getAllProfiles(): Promise<FirebaseProfile[]> {
    try {
      const snapshot = await this.db.collection(PROFILES_COLLECTION)
        .orderBy('createdAt', 'desc')
        .get();
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as FirebaseProfile[];
    } catch (error) {
      throw error;
    }
  }

  /**
   * Search profiles by college
   */
  async searchByCollege(college: string): Promise<FirebaseStudentProfile[]> {
    try {
      const snapshot = await this.db.collection(PROFILES_COLLECTION)
        .where('college', '==', college)
        .get();
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as FirebaseStudentProfile[];
    } catch (error) {
      throw error;
    }
  }

  /**
   * Search profiles by skills (contains any)
   */
  async searchBySkills(skills: string[]): Promise<FirebaseStudentProfile[]> {
    try {
      if (skills.length === 0) return [];
      
      const snapshot = await this.db.collection(PROFILES_COLLECTION)
        .where('skills', 'array-contains-any', skills.slice(0, 10)) // Firestore limit: max 10 items
        .get();
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as FirebaseStudentProfile[];
    } catch (error) {
      throw error;
    }
  }

  /**
   * Search profiles by primary stream
   */
  async searchByStream(primaryStream: string): Promise<FirebaseStudentProfile[]> {
    try {
      const snapshot = await this.db.collection(PROFILES_COLLECTION)
        .where('primaryStream', '==', primaryStream)
        .get();
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as FirebaseStudentProfile[];
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get potential matches for collaboration
   * Fetches profiles with similar interests, skills, or cross-stream collaboration enabled
   */
  async getPotentialMatches(uid: string, limit: number = 20): Promise<FirebaseStudentProfile[]> {
    try {
      const currentProfile = await this.getProfileByUid(uid);
      if (!currentProfile) {
        return [];
      }
      
      // Get profiles available for collaboration (excluding self)
      const snapshot = await this.db.collection(PROFILES_COLLECTION)
        .where('isAvailableForCollab', '==', true)
        .limit(limit * 2) // Fetch more to filter out self and compute matches
        .get();
      
      const profiles = snapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data(),
        } as FirebaseStudentProfile))
        .filter(profile => profile.uid !== uid); // Exclude self
      
      // Simple matching: prioritize shared skills, interests, or same stream
      return profiles.slice(0, limit);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Search profiles with text query (college or skills) - Students only
   */
  async searchProfiles(query: string): Promise<FirebaseStudentProfile[]> {
    try {
      const lowerQuery = query.toLowerCase();
      
      // Fetch all profiles and filter client-side (Firestore doesn't support full-text search)
      const snapshot = await this.db.collection(PROFILES_COLLECTION)
        .limit(100)
        .get();
      
      const profiles = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as FirebaseStudentProfile[];
      
      // Filter by college, skills, or interests containing query
      return profiles.filter(profile => 
        profile.college?.toLowerCase().includes(lowerQuery) ||
        profile.skills?.some(skill => skill.toLowerCase().includes(lowerQuery)) ||
        profile.interests?.some(interest => interest.toLowerCase().includes(lowerQuery)) ||
        profile.currentCourse?.toLowerCase().includes(lowerQuery)
      );
    } catch (error) {
      throw error;
    }
  }

  /**
   * Search all profiles (students, clubs, communities, companies) with text query
   */
  async searchAllProfiles(query: string): Promise<FirebaseProfile[]> {
    try {
      const lowerQuery = query.toLowerCase().trim();
      
      // Fetch all profiles and filter client-side (Firestore doesn't support full-text search)
      const snapshot = await this.db.collection(PROFILES_COLLECTION)
        .limit(100)
        .get();
      
      const profiles = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
        };
      }) as FirebaseProfile[];
      
      // Filter based on profile type
      return profiles.filter(profile => {
        // Search by name and username (common to all profiles)
        const profileName = (profile as any).name?.toLowerCase().trim() || '';
        const profileUsername = (profile as any).username?.toLowerCase().trim() || '';
        
        const nameMatch = profileName.includes(lowerQuery);
        const usernameMatch = profileUsername.includes(lowerQuery);
        
        if (nameMatch || usernameMatch) {
          return true;
        }
        
        // Type-specific search
        switch (profile.role) {
          case 'Student':
            const studentProfile = profile as FirebaseStudentProfile;
            return (
              studentProfile.college?.toLowerCase().includes(lowerQuery) ||
              studentProfile.skills?.some(skill => skill.toLowerCase().includes(lowerQuery)) ||
              studentProfile.interests?.some(interest => interest.toLowerCase().includes(lowerQuery)) ||
              studentProfile.currentCourse?.toLowerCase().includes(lowerQuery)
            );
          
          case 'Club':
            const clubProfile = profile as FirebaseClubProfile;
            return (
              clubProfile.clubName?.toLowerCase().includes(lowerQuery) ||
              clubProfile.category?.toLowerCase().includes(lowerQuery) ||
              clubProfile.aboutClub?.toLowerCase().includes(lowerQuery)
            );
          
          case 'Community':
            const communityProfile = profile as FirebaseCommunityProfile;
            return (
              communityProfile.communityName?.toLowerCase().includes(lowerQuery) ||
              communityProfile.category?.toLowerCase().includes(lowerQuery) ||
              communityProfile.missionVision?.toLowerCase().includes(lowerQuery)
            );
          
          case 'Company':
            const companyProfile = profile as FirebaseCompanyProfile;
            return (
              companyProfile.companyName?.toLowerCase().includes(lowerQuery) ||
              companyProfile.industryType?.toLowerCase().includes(lowerQuery) ||
              companyProfile.aboutCompany?.toLowerCase().includes(lowerQuery)
            );

          case 'Professional': {
            const professionalProfile = profile as FirebaseProfessionalProfile;
            return [
              professionalProfile.profession,
              professionalProfile.title,
              professionalProfile.companyName,
              professionalProfile.industry,
              professionalProfile.bio,
            ].some(value => typeof value === 'string' && value.toLowerCase().includes(lowerQuery));
          }

          case 'Organisation':
          case 'Organization': {
            const organisationProfile = profile as FirebaseOrganisationProfile;
            return [
              organisationProfile.organisationName,
              organisationProfile.organizationName,
              organisationProfile.companyName,
              organisationProfile.description,
              organisationProfile.bio,
            ].some(value => typeof value === 'string' && value.toLowerCase().includes(lowerQuery));
          }
          
          default:
            return false;
        }
      });
    } catch (error) {
      throw error;
    }
  }

  // ============ CLUB ELECTIONS METHODS ============

  /**
   * Create a new nominee
   */
  async createNominee(nomineeData: Omit<ClubNominee, 'id' | 'createdAt'>): Promise<ClubNominee> {
    try {
      const docRef = this.db.collection(NOMINEES_COLLECTION).doc();
      const nominee: ClubNominee = {
        id: docRef.id,
        ...nomineeData,
        createdAt: new Date()
      };
      
      await docRef.set({
        ...nominee,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      return nominee;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get all nominees (sorted in memory to avoid index requirements)
   */
  async getAllNominees(): Promise<ClubNominee[]> {
    try {
      const snapshot = await this.db.collection(NOMINEES_COLLECTION).get();
      
      const nominees = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date()
      } as ClubNominee));

      // Sort in memory by club then role to avoid Firestore index requirements
      return nominees.sort((a, b) => {
        if (a.club !== b.club) return a.club.localeCompare(b.club);
        return a.role.localeCompare(b.role);
      });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Delete a nominee
   */
  async deleteNominee(nomineeId: string): Promise<void> {
    try {
      await this.db.collection(NOMINEES_COLLECTION).doc(nomineeId).delete();
    } catch (error) {
      throw error;
    }
  }

  /**
   * Cast a vote for a nominee
   * Enforces one-club-only rule: user can only vote in one club for all roles
   */
  async castVote(userId: string, nomineeId: string, role: NomineeRole, club: string): Promise<ClubVote> {
    try {
      // Check if user has already voted in any club
      const userVotes = await this.getUserVotes(userId);
      
      if (userVotes.length > 0) {
        // User has voted before - ensure they're voting in the same club
        const votedClub = userVotes[0].club;
        if (votedClub !== club) {
          throw new Error(`You can only vote in one club. You have already voted in ${votedClub}`);
        }
        
        // Check if user already voted for this specific role
        const existingVoteForRole = userVotes.find(v => v.role === role);
        if (existingVoteForRole) {
          throw new Error(`You have already voted for ${role} in ${club}`);
        }
      }

      const docRef = this.db.collection(VOTES_COLLECTION).doc();
      const vote: ClubVote = {
        id: docRef.id,
        userId,
        nomineeId,
        role,
        club,
        createdAt: new Date()
      };
      
      await docRef.set({
        ...vote,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // Increment nominee vote count
      await this.db.collection(NOMINEES_COLLECTION).doc(nomineeId).update({
        votesCount: admin.firestore.FieldValue.increment(1)
      });
      
      return vote;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get user's vote for a specific role and club
   */
  async getUserVoteForRole(userId: string, role: NomineeRole, club: string): Promise<ClubVote | null> {
    try {
      const snapshot = await this.db.collection(VOTES_COLLECTION)
        .where('userId', '==', userId)
        .where('role', '==', role)
        .where('club', '==', club)
        .limit(1)
        .get();
      
      if (snapshot.empty) {
        return null;
      }
      
      const doc = snapshot.docs[0];
      return {
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date()
      } as ClubVote;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get all votes by a user
   */
  async getUserVotes(userId: string): Promise<ClubVote[]> {
    try {
      const snapshot = await this.db.collection(VOTES_COLLECTION)
        .where('userId', '==', userId)
        .get();
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date()
      } as ClubVote));
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get the club a user has voted in (returns null if no votes yet)
   */
  async getUserVotedClub(userId: string): Promise<string | null> {
    try {
      const votes = await this.getUserVotes(userId);
      return votes.length > 0 ? votes[0].club : null;
    } catch (error) {
      throw error;
    }
  }
}

// Export singleton instance
export const collabFirestore = new CollabFirestoreService();
