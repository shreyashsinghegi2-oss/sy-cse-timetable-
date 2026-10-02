import { useState, useEffect, createContext, useContext, useCallback, useMemo, useRef } from "react";
import { onIdTokenChanged, User as FirebaseUser } from "firebase/auth";
import { auth, authReady, refreshAuthToken } from "@/lib/firebase";
import { queryClient } from "@/lib/queryClient";
import {
  clearCollabSession,
  getJwtExpiryMs,
  getStoredCollabSession,
  saveCollabSession,
} from "@/lib/collab-auth-session";

interface CollabUser {
  id: number;
  username: string;
  email: string;
  uid?: string;
}

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

interface CollabAuthContextType {
  user: CollabUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isCheckingRedirect: boolean;
  status: AuthStatus;
  login: (token: string, user: CollabUser) => Promise<void>;
  logout: () => void;
}

interface VerifiedUser {
  userId?: unknown;
  id?: unknown;
  username?: unknown;
  email?: unknown;
  uid?: unknown;
}

interface TokenVerification {
  valid?: unknown;
  user?: VerifiedUser;
}

interface SmartLoginResponse {
  token?: unknown;
  user?: VerifiedUser;
}

export const CollabAuthContext = createContext<CollabAuthContextType | undefined>(undefined);

const VERIFY_TOKEN_ENDPOINT = "/api/collab/auth/verify-token";
const SMART_LOGIN_ENDPOINT = "/api/collab/auth/smart-login";

function isFiniteId(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function toCollabUser(source: VerifiedUser | undefined, fallback: Pick<CollabUser, "email" | "uid" | "username">): CollabUser {
  const id = isFiniteId(source?.userId) ? source.userId
    : isFiniteId(source?.id) ? source.id
      : 0;
  return {
    id,
    email: typeof source?.email === "string" && source.email ? source.email : fallback.email,
    username: typeof source?.username === "string" && source.username
      ? source.username
      : fallback.username,
    uid: typeof source?.uid === "string" && source.uid ? source.uid : fallback.uid,
  };
}

function isSameFirebaseIdentity(user: CollabUser, firebaseUser: FirebaseUser): boolean {
  return user.email.toLowerCase() === (firebaseUser.email || "").toLowerCase()
    && (!user.uid || user.uid === firebaseUser.uid);
}

function isSameCollabIdentity(left: CollabUser | null, right: CollabUser | null): boolean {
  if (!left || !right) return false;
  return left.email.toLowerCase() === right.email.toLowerCase()
    && (!left.uid || !right.uid || left.uid === right.uid);
}

function clearCollabQueryCache(): void {
  queryClient.removeQueries({
    predicate: (query) => {
      const firstKey = query.queryKey[0];
      return typeof firstKey === "string" && firstKey.startsWith("/api/collab");
    },
  });
}

async function verifyWithServer(token: string): Promise<TokenVerification | null> {
  try {
    const response = await fetch(VERIFY_TOKEN_ENDPOINT, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      credentials: "include",
    });
    if (!response.ok) return null;
    const data: unknown = await response.json();
    return data && typeof data === "object" ? data as TokenVerification : null;
  } catch {
    return null;
  }
}

async function syncFirebaseUser(firebaseUser: FirebaseUser, firebaseIdToken: string): Promise<SmartLoginResponse | null> {
  if (!firebaseUser.email) return null;
  try {
    const response = await fetch(SMART_LOGIN_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        // The server verifies firebaseIdToken. This email is only routing
        // metadata and must never be used by a server as proof of identity.
        email: firebaseUser.email,
        firebaseIdToken,
      }),
    });
    if (!response.ok) return null;
    const data: unknown = await response.json();
    return data && typeof data === "object" ? data as SmartLoginResponse : null;
  } catch {
    return null;
  }
}

export function CollabAuthProvider({ children }: { children: React.ReactNode }) {
  // Never initialise authentication from localStorage alone: it is attacker
  // controlled and a saved JWT may have expired/revoked since the last visit.
  const [user, setUser] = useState<CollabUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");
  const generationRef = useRef(0);
  const activeUserRef = useRef<CollabUser | null>(null);

  const setAuthenticated = useCallback((nextToken: string, nextUser: CollabUser) => {
    activeUserRef.current = nextUser;
    setToken(nextToken);
    setUser(nextUser);
    setStatus("authenticated");
  }, []);

  const login = useCallback(async (newToken: string, newUser: CollabUser) => {
    if (!newToken || !newUser?.email) {
      throw new Error("The login response did not include a valid session.");
    }
    generationRef.current += 1;
    const firebaseUser = auth.currentUser;
    const needsFirebaseSignOut = !!firebaseUser && !isSameFirebaseIdentity(newUser, firebaseUser);

    if (!isSameCollabIdentity(activeUserRef.current, newUser) || needsFirebaseSignOut) {
      clearCollabSession();
      clearCollabQueryCache();
    }

    if (needsFirebaseSignOut) {
      // Do not publish the newly authenticated server identity until the
      // previous Firebase account is actually gone. Otherwise collabFetch
      // would still prefer that previous Firebase token in this small window.
      activeUserRef.current = null;
      setToken(null);
      setUser(null);
      setStatus("loading");
      try {
        await auth.signOut();
      } catch {
        setStatus("unauthenticated");
        throw new Error("Could not end the previous Firebase session. Please try again.");
      }
      if (auth.currentUser) {
        setStatus("unauthenticated");
        throw new Error("The previous Firebase session is still active. Please try again.");
      }
    }

    // A server token is retained only after basic expiry/identity validation.
    // The server remains the cryptographic authority and validates it again on
    // every protected request.
    if (!saveCollabSession(newToken, newUser)) {
      setStatus("unauthenticated");
      throw new Error("The login response included an invalid session.");
    }
    setAuthenticated(newToken, newUser);
  }, [setAuthenticated]);

  const logout = useCallback(() => {
    generationRef.current += 1;
    activeUserRef.current = null;
    clearCollabSession();
    clearCollabQueryCache();
    setToken(null);
    setUser(null);
    setStatus("unauthenticated");
    void auth.signOut().catch(() => {
      // Local state/storage must still be cleared even when Firebase is offline.
    });
  }, []);

  useEffect(() => {
    let mounted = true;
    let unsubscribe: (() => void) | undefined;

    const applyUnauthenticated = (generation: number) => {
      if (!mounted || generation !== generationRef.current) return;
      activeUserRef.current = null;
      clearCollabQueryCache();
      setToken(null);
      setUser(null);
      setStatus("unauthenticated");
    };

    const resolveServerOnlySession = async (generation: number) => {
      const stored = getStoredCollabSession();
      if (!stored) {
        applyUnauthenticated(generation);
        return;
      }

      // Local JWTs have no browser-verifiable signature. Confirm with the
      // verifyJWT-protected endpoint before restoring authenticated UI state.
      const verification = await verifyWithServer(stored.token);
      if (!verification?.valid || !mounted || generation !== generationRef.current) {
        clearCollabSession();
        applyUnauthenticated(generation);
        return;
      }

      const restoredUser = toCollabUser(verification.user, stored.user);
      if (!isSameCollabIdentity(activeUserRef.current, restoredUser)) clearCollabQueryCache();
      setAuthenticated(stored.token, restoredUser);
    };

    const resolveFirebaseSession = async (firebaseUser: FirebaseUser, generation: number) => {
      let firebaseIdToken: string;
      try {
        firebaseIdToken = await firebaseUser.getIdToken();
      } catch {
        applyUnauthenticated(generation);
        return;
      }
      if (!mounted || generation !== generationRef.current) return;

      const fallback = {
        email: firebaseUser.email || "",
        uid: firebaseUser.uid,
        username: firebaseUser.displayName || firebaseUser.email?.split("@")[0] || "student",
      };
      if (!fallback.email) {
        applyUnauthenticated(generation);
        return;
      }

      // A Firebase sign-in is authoritative over any browser-restored server
      // session. Remove another person's cached JWT before it could later be
      // revived after this Firebase account signs out.
      const existingStoredSession = getStoredCollabSession(0);
      if (existingStoredSession && !isSameFirebaseIdentity(existingStoredSession.user, firebaseUser)) {
        clearCollabSession();
        clearCollabQueryCache();
      }

      const smartLogin = await syncFirebaseUser(firebaseUser, firebaseIdToken);
      if (!mounted || generation !== generationRef.current) return;

      if (typeof smartLogin?.token === "string" && smartLogin.user) {
        const serverUser = toCollabUser(smartLogin.user, fallback);
        // Persist only the server JWT. The in-memory context intentionally
        // holds Firebase's currently valid ID token, so consumers using context
        // cannot be left with the server JWT after it expires.
        saveCollabSession(smartLogin.token, serverUser);
        if (!isSameCollabIdentity(activeUserRef.current, serverUser)) clearCollabQueryCache();
        setAuthenticated(firebaseIdToken, serverUser);
        return;
      }

      // Smart login creates/updates the Collab record, but a transient failure
      // there must not incorrectly sign out an already authenticated Firebase
      // user. Verify the Firebase credential with the same server verifier
      // before using any persisted profile metadata.
      const verification = await verifyWithServer(firebaseIdToken);
      if (!mounted || generation !== generationRef.current) return;
      const stored = getStoredCollabSession(0);
      const storedUser = stored && isSameFirebaseIdentity(stored.user, firebaseUser)
        ? stored.user
        : undefined;
      const verifiedUser = verification?.valid
        ? toCollabUser(verification.user, fallback)
        : storedUser || toCollabUser(undefined, fallback);

      // Firebase's SDK owns the signed-in identity. API requests still submit
      // this ID token to server-side verifyJWT; no unverified local JWT is used.
      if (!isSameCollabIdentity(activeUserRef.current, verifiedUser)) clearCollabQueryCache();
      setAuthenticated(firebaseIdToken, verifiedUser);
    };

    void authReady.then(() => {
      if (!mounted) return;
      unsubscribe = onIdTokenChanged(auth, (firebaseUser) => {
        const generation = ++generationRef.current;
        if (firebaseUser) {
          void resolveFirebaseSession(firebaseUser, generation);
        } else {
          void resolveServerOnlySession(generation);
        }
      }, () => {
        const generation = ++generationRef.current;
        applyUnauthenticated(generation);
      });
    }).catch(() => {
      const generation = ++generationRef.current;
      applyUnauthenticated(generation);
    });

    return () => {
      mounted = false;
      unsubscribe?.();
    };
  }, [setAuthenticated]);

  useEffect(() => {
    // Firebase refreshes ID tokens and emits onIdTokenChanged itself. A
    // server-only password session needs an explicit, server-verified renewal
    // so the UI never remains "authenticated" with an expired JWT.
    if (!token || auth.currentUser) return;
    const expiresAt = getJwtExpiryMs(token);
    if (!expiresAt) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const renew = async () => {
      const refreshedToken = await refreshAuthToken();
      if (cancelled) return;
      if (refreshedToken) {
        setToken(refreshedToken);
        return;
      }

      if (Date.now() >= expiresAt) {
        clearCollabSession();
        setToken(null);
        setUser(null);
        setStatus("unauthenticated");
        return;
      }

      // A network outage before expiry should not log the person out early.
      timer = setTimeout(renew, Math.min(30_000, expiresAt - Date.now()));
    };

    timer = setTimeout(renew, Math.max(0, expiresAt - Date.now() - 60_000));
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [token]);

  const isLoading = status === "loading";
  const isAuthenticated = status === "authenticated" && !!user && !!token;
  const isCheckingRedirect = isLoading;

  const contextValue = useMemo(() => ({
    user,
    token,
    isAuthenticated,
    isLoading,
    isCheckingRedirect,
    status,
    login,
    logout,
  }), [user, token, isAuthenticated, isLoading, isCheckingRedirect, status, login, logout]);

  return (
    <CollabAuthContext.Provider value={contextValue}>
      {children}
    </CollabAuthContext.Provider>
  );
}

export function useCollabAuth() {
  const context = useContext(CollabAuthContext);
  if (context === undefined) {
    throw new Error("useCollabAuth must be used within a CollabAuthProvider");
  }
  return context;
}