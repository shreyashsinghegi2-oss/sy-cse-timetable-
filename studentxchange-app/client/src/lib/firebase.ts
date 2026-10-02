import { initializeApp } from 'firebase/app';
import { getDatabase, Database } from 'firebase/database';
import {
  getAuth,
  Auth,
  setPersistence,
  browserLocalPersistence,
  indexedDBLocalPersistence,
  inMemoryPersistence,
  onAuthStateChanged,
} from 'firebase/auth';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import { getFirestore, Firestore } from 'firebase/firestore';
import {
  getStoredCollabToken,
  isUsableJwt,
  saveCollabSession,
} from './collab-auth-session';
import {
  CollabAuthenticationError,
  createCollabFetch,
} from './collab-auth-transport';

export { CollabAuthenticationError };

// Firebase configuration using environment variables
// Use environment variable for authDomain if available, otherwise use current domain
// (original setup — the user's Firebase domain config, unchanged; no Google
// Cloud console changes required)
const authDomain = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || window.location.hostname;

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: authDomain,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};


// Initialize Firebase
export const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const db: Database = getDatabase(app);
export const firestore: Firestore = getFirestore(app);
export const auth: Auth = getAuth(app);
export const storage: FirebaseStorage = getStorage(app);

// Set auth persistence with Safari-compatible fallback chain
// Safari has strict ITP policies that can affect localStorage/indexedDB
const initAuthPersistence = async () => {
  try {
    // Try indexedDB first (most reliable for Safari)
    await setPersistence(auth, indexedDBLocalPersistence);
  } catch (e1) {
    try {
      await setPersistence(auth, browserLocalPersistence);
    } catch (e2) {
      try {
        await setPersistence(auth, inMemoryPersistence);
      } catch (e3) {
        console.warn('[Firebase] Auth persistence unavailable');
      }
    }
  }
};

/**
 * Firebase restores its persisted user asynchronously. Consumers must wait for
 * this promise instead of reading `auth.currentUser` during that restoration
 * window (which was the source of intermittent false "Not authenticated"
 * states after redirect/login).
 */
export const authReady: Promise<void> = (async () => {
  await initAuthPersistence();
  await new Promise<void>((resolve) => {
    let unsubscribe: (() => void) | undefined;
    let settled = false;
    const settle = () => {
      settled = true;
      unsubscribe?.();
      resolve();
    };
    unsubscribe = onAuthStateChanged(
      auth,
      settle,
      () => {
        // Auth errors are surfaced when a token is requested. Resolving here
        // still lets a valid server-only Collab session be restored.
        settle();
      },
    );
    if (settled) unsubscribe();
  });
})();

const REFRESH_ENDPOINT = '/api/collab/auth/refresh-token';

async function refreshStoredServerToken(token: string): Promise<string | null> {
  try {
    const response = await fetch(REFRESH_ENDPOINT, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      credentials: 'include',
    });
    if (!response.ok) return null;

    const body: unknown = await response.json();
    const refreshedToken = body && typeof body === 'object' ? (body as { token?: unknown }).token : null;
    if (typeof refreshedToken !== 'string' || !isUsableJwt(refreshedToken, 0)) return null;

    // Retain the established profile metadata, but never store Firebase ID
    // tokens in Collab's server-JWT storage keys.
    try {
      const storedUser = localStorage.getItem('collab_user');
      if (storedUser) {
        const user = JSON.parse(storedUser);
        saveCollabSession(refreshedToken, user);
      }
    } catch {
      // A refreshed token remains usable even where browser storage is blocked.
    }
    return refreshedToken;
  } catch {
    return null;
  }
}

/**
 * Resolve a usable credential for Student Collab API calls.
 *
 * A live Firebase credential has precedence over storage. Server JWTs are
 * retained only for password/server-only sessions and must be unexpired; a
 * near-expiry server JWT is refreshed by the server before it is returned.
 */
export const getAuthToken = async (): Promise<string | null> => {
  await authReady;

  const user = auth.currentUser;
  if (user) {
    try {
      return await user.getIdToken();
    } catch {
      // Do not fall through to a potentially unrelated saved server session
      // while Firebase reports an active user whose credential cannot refresh.
      return null;
    }
  }

  const storedToken = getStoredCollabToken();
  if (storedToken) return storedToken;

  // A still-valid, but almost-expired, server JWT can only be used after the
  // server verifies it and issues a new one. Expired values are never sent.
  const renewableToken = getStoredCollabToken(0);
  return renewableToken ? refreshStoredServerToken(renewableToken) : null;
};

/**
 * Obtain a demonstrably new credential after a 401.
 *
 * Firebase sessions force a token refresh. Server-only sessions call the
 * refresh endpoint, which is itself protected by `verifyJWT`; this prevents a
 * stale local JWT from being replayed as a "refresh".
 */
export const refreshAuthToken = async (): Promise<string | null> => {
  await authReady;

  const user = auth.currentUser;
  if (user) {
    try {
      return await user.getIdToken(true);
    } catch {
      return null;
    }
  }

  const renewableToken = getStoredCollabToken(0);
  return renewableToken ? refreshStoredServerToken(renewableToken) : null;
};

/**
 * Authenticated fetch for Student Collab endpoints.
 *
 * It waits for Firebase persistence restoration, always replaces a caller's
 * Authorization header with the currently selected credential, and retries a
 * 401 exactly once only after forcing a valid provider refresh. Stream bodies
 * are not retried because they cannot be safely replayed.
 */
export const collabFetch = createCollabFetch({
  getToken: getAuthToken,
  refreshToken: refreshAuthToken,
});

/**
 * @deprecated Use `collabFetch` for Collab API calls. Kept as a narrow token
 * accessor for existing callers while they migrate.
 */
export const legacyGetAuthToken = getAuthToken;

/**
 * Refresh the authentication token.
 * @deprecated Prefer `collabFetch`, which refreshes only after a 401.
 */
export const legacyRefreshAuthToken = refreshAuthToken;

export default app;