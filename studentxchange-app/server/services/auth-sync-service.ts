import { getFirebaseAdmin, admin } from '../firebase-admin';
import { DatabaseStorage } from '../storage';
import type { User } from '@shared/schema';

export class AuthSyncService {
  private storage: DatabaseStorage;

  constructor(storage: DatabaseStorage) {
    this.storage = storage;
  }

  /**
   * Creates or syncs a user with Firebase Auth using Admin SDK
   */
  async syncUserToFirebase(user: User): Promise<string | null> {
    const firebaseAdmin = getFirebaseAdmin();
    
    if (!firebaseAdmin) {
      return null;
    }

    try {
      // Check if user already exists in Firebase
      let firebaseUser;
      try {
        firebaseUser = await admin.auth().getUserByEmail(user.email);
        return firebaseUser.uid;
      } catch (error: any) {
        if (error.code === 'auth/user-not-found') {
          // User doesn't exist in Firebase, create them
          
          firebaseUser = await admin.auth().createUser({
            uid: user.id.toString(), // Use PostgreSQL ID as Firebase UID
            email: user.email,
            displayName: user.username,
            emailVerified: true, // Mark as verified since they're from our PostgreSQL
          });

          return firebaseUser.uid;
        } else {
          throw error;
        }
      }
    } catch (error) {
      return null;
    }
  }

  /**
   * Verifies a Firebase ID token and returns the associated PostgreSQL user
   */
  async verifyFirebaseToken(idToken: string): Promise<User | null> {
    const firebaseAdmin = getFirebaseAdmin();
    
    if (!firebaseAdmin) {
      return null;
    }

    try {
      // Verify the Firebase ID token
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      
      // Get the PostgreSQL user by ID (Firebase UID matches PostgreSQL ID)
      const user = await this.storage.getUser(parseInt(decodedToken.uid));
      
      if (!user) {
        return null;
      }

      return user;
    } catch (error) {
      return null;
    }
  }

  /**
   * Verifies a Firebase ID token and returns both the user and the real Firebase UID
   */
  async verifyFirebaseTokenWithUid(idToken: string): Promise<{ user: User; firebaseUid: string } | null> {
    const firebaseAdmin = getFirebaseAdmin();
    
    if (!firebaseAdmin) {
      return null;
    }

    try {
      // Verify the Firebase ID token
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      
      // Get the PostgreSQL user by ID (Firebase UID matches PostgreSQL ID)
      const user = await this.storage.getUser(parseInt(decodedToken.uid));
      
      if (!user) {
        return null;
      }

      return { user, firebaseUid: decodedToken.uid };
    } catch (error) {
      return null;
    }
  }

  /**
   * Creates a custom Firebase token for a PostgreSQL user
   */
  async createCustomTokenForUser(user: User): Promise<string | null> {
    const firebaseAdmin = getFirebaseAdmin();
    
    if (!firebaseAdmin) {
      return null;
    }

    try {
      // Ensure user exists in Firebase first
      await this.syncUserToFirebase(user);
      
      // Create custom token with additional claims
      const customToken = await admin.auth().createCustomToken(user.id.toString(), {
        email: user.email,
        username: user.username,
      });

      return customToken;
    } catch (error) {
      return null;
    }
  }
}