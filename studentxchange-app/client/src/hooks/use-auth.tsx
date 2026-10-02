import { createContext, ReactNode, useContext, useEffect, useRef, useState } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { InsertUser, User } from "@shared/schema";
import { getQueryFn, apiRequest, queryClient } from "../lib/queryClient";
import { useSimpleToast } from "@/hooks/use-simple-toast";
import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User as FirebaseUser,
} from "firebase/auth";

import { auth } from "@/lib/firebase";

function isMobileDevice() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    || window.innerWidth < 768;
}

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  firebaseUser: FirebaseUser | null;
  loginMutation: UseMutationResult<User, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<User, Error, InsertUser>;
  googleLoginMutation: UseMutationResult<User, Error, void>;
};

type LoginData = Pick<InsertUser, "username" | "password">;

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useSimpleToast();
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(auth.currentUser);
  // Guard so we only auto-sync once per Firebase user transition.
  const lastSyncedFirebaseUidRef = useRef<string | null>(null);

  const {
    data: user,
    error,
    isLoading,
  } = useQuery<User | undefined, Error>({
    queryKey: ["/api/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    retry: false,
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      return await apiRequest("POST", "/api/login", credentials);
    },
    onSuccess: (user: User & { sessionToken?: string }) => {
      // Store session token for header-based auth fallback (cross-origin
      // iframe / blocked third-party cookies). Token is only used when
      // the cookie is missing on a request.
      if (user.sessionToken) {
        try { localStorage.setItem('marketplaceSessionToken', user.sessionToken); } catch (_) {}
      }
      queryClient.setQueryData(["/api/user"], user);
      toast({
        title: "Login successful",
        description: `Welcome back, ${user.username}!`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (credentials: InsertUser) => {
      return await apiRequest("POST", "/api/register", credentials);
    },
    onSuccess: (user: User & { sessionToken?: string }) => {
      if (user.sessionToken) {
        try { localStorage.setItem('marketplaceSessionToken', user.sessionToken); } catch (_) {}
      }
      queryClient.setQueryData(["/api/user"], user);
      toast({
        title: "Registration successful",
        description: `Welcome to StudentXchange, ${user.username}!`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Registration failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Google Sign-In: reuses the shared Firebase `auth` instance
  // (same one Collab/Lancing already use). After a successful popup, the
  // Firebase ID token is sent to /api/auth/google, which verifies it,
  // upserts the central marketplace user record (deduped by uid/email),
  // and establishes the session cookie.
  const googleLoginMutation = useMutation<User, Error, void>({
    mutationFn: async () => {
      const provider = new GoogleAuthProvider();
      let result;
      try {
        // Popup-first everywhere: signInWithRedirect silently loses auth state
        // on custom domains (third-party storage partitioning on mobile browsers).
        result = await signInWithPopup(auth, provider);
      } catch (popupError: any) {
        if (popupError?.code === "auth/popup-blocked" || popupError?.code === "auth/internal-error") {
          // Popup truly blocked (e.g. in-app browsers) → last-resort redirect.
          // onAuthStateChanged auto-syncs the user to the backend after return.
          await signInWithRedirect(auth, provider);
          return undefined as any; // page navigates away
        }
        throw popupError;
      }
      const idToken = await result.user.getIdToken();
      const synced = await apiRequest("POST", "/api/auth/google", {
        firebaseIdToken: idToken,
      });
      return synced as User;
    },
    onSuccess: (synced: User & { sessionToken?: string }) => {
      lastSyncedFirebaseUidRef.current = auth.currentUser?.uid || null;
      if (synced.sessionToken) {
        try { localStorage.setItem('marketplaceSessionToken', synced.sessionToken); } catch (_) {}
      }
      queryClient.setQueryData(["/api/user"], synced);
      toast({
        title: "Welcome!",
        description: `Signed in with Google as ${synced.username}.`,
      });
    },
    onError: (err: any) => {
      const code = err?.code as string | undefined;
      if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") {
        return; // user cancelled — no toast
      }
      toast({
        title: "Google sign-in failed",
        description: err?.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      // Sign out of the shared Firebase auth instance FIRST so Collab and
      // Lancing also lose their Firebase session — single unified logout.
      try {
        await firebaseSignOut(auth);
      } catch (e) {
        console.warn("[useAuth] Firebase signOut failed", e);
      }
      await apiRequest("POST", "/api/logout");
    },
    onSuccess: () => {
      lastSyncedFirebaseUidRef.current = null;
      queryClient.setQueryData(["/api/user"], null);
      queryClient.clear();

      localStorage.clear();
      sessionStorage.clear();

      setTimeout(() => {
        if ((window as any).forceCompleteRefresh) {
          (window as any).forceCompleteRefresh();
        } else {
          window.location.href = window.location.protocol + '//' + window.location.host + '/?nocache=' + Date.now() + Math.random();
        }
      }, 1000);

      toast({
        title: "Logged out",
        description: "You have been successfully logged out. Refreshing page...",
      });
    },
    onError: (error: Error) => {
      lastSyncedFirebaseUidRef.current = null;
      queryClient.setQueryData(["/api/user"], null);
      queryClient.clear();
      localStorage.clear();
      sessionStorage.clear();

      setTimeout(() => {
        if ((window as any).forceCompleteRefresh) {
          (window as any).forceCompleteRefresh();
        } else {
          window.location.href = window.location.protocol + '//' + window.location.host + '/?nocache=' + Date.now() + Math.random();
        }
      }, 1000);

      toast({
        title: "Logout completed",
        description: "Session cleared. Refreshing page...",
        variant: "destructive",
      });
    },
  });

  // Track Firebase auth state. If a user is already signed in via Google
  // in Collab/Lancing (same shared `auth` instance) but we have no
  // marketplace session, silently sync them so they're recognized here
  // too — no second sign-in required.
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);

      if (!fbUser) return;
      if (user) return; // already authenticated to marketplace
      if (lastSyncedFirebaseUidRef.current === fbUser.uid) return;
      // Skip during an explicit logout in progress
      if (sessionStorage.getItem("just_logged_out") === "true") return;

      try {
        lastSyncedFirebaseUidRef.current = fbUser.uid;
        const idToken = await fbUser.getIdToken();
        const synced = await apiRequest("POST", "/api/auth/google", {
          firebaseIdToken: idToken,
        });
        if (synced?.sessionToken) {
          try { localStorage.setItem('marketplaceSessionToken', synced.sessionToken); } catch (_) {}
        }
        queryClient.setQueryData(["/api/user"], synced);
      } catch (err) {
        // Silent — user can still use the marketplace as a guest.
        lastSyncedFirebaseUidRef.current = null;
      }
    });
    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        error,
        firebaseUser,
        loginMutation,
        logoutMutation,
        registerMutation,
        googleLoginMutation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
