import { useState, useEffect, createContext, useContext, useRef } from "react";
import { auth, firestore } from "@/lib/firebase";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  User
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";

function isMobileDevice() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    || window.innerWidth < 768;
}

interface LancingUser {
  uid: string;
  email: string;
  role?: "freelancer" | "company" | "angel" | "placement_cell";
  profileComplete?: boolean;
}

interface LancingAuthContextType {
  user: LancingUser | null;
  firebaseUser: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isLoadingData: boolean;
  dataLoaded: boolean;
  loadError: boolean;
  retryLoad: () => void;
  role: "freelancer" | "company" | "angel" | "placement_cell" | null;
  hasSelectedRole: boolean;
  profileComplete: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  registerWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  selectRole: (role: "freelancer" | "company" | "angel" | "placement_cell") => Promise<void>;
  refreshUser: () => Promise<void>;
}

const LancingAuthContext = createContext<LancingAuthContextType | undefined>(undefined);

export function LancingAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<LancingUser | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [role, setRole] = useState<"freelancer" | "company" | "angel" | "placement_cell" | null>(null);
  const [hasSelectedRole, setHasSelectedRole] = useState(false);
  const [profileComplete, setProfileComplete] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  const loadTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const dataLoadAttemptRef = useRef(0);

  const fetchUserDataInBackground = async (fbUser: User) => {
    setIsLoadingData(true);
    setLoadError(false);
    
    try {
      const userDoc = await getDoc(doc(firestore, "lancing_users", fbUser.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        setRole(data.role || null);
        setHasSelectedRole(!!data.role);
        setProfileComplete(!!data.profileComplete);
        setUser(prev => ({
          uid: fbUser.uid,
          email: fbUser.email || "",
          role: data.role,
          profileComplete: !!data.profileComplete
        }));
        
        // Check profile completeness for freelancers (non-blocking)
        if (data.role === "freelancer") {
          const profileDoc = await getDoc(doc(firestore, "lancing_users", fbUser.uid, "profile", "data"));
          if (profileDoc.exists()) {
            const profile = profileDoc.data();
            const isProfileComplete = !!(
              profile.fullName &&
              profile.phoneNumber &&
              profile.skills?.length > 0 &&
              profile.aboutMe
            );
            setProfileComplete(isProfileComplete);
            setUser(prev => prev ? { ...prev, profileComplete: isProfileComplete } : null);
          }
        }

        // Placement Cell uses a dedicated doc; completeness driven by that flag
        if (data.role === "placement_cell") {
          const pcDoc = await getDoc(doc(firestore, "placement_cells", fbUser.uid));
          setProfileComplete(pcDoc.exists());
          setUser(prev => prev ? { ...prev, profileComplete: pcDoc.exists() } : null);
        }
      } else {
        setUser(prev => ({
          uid: fbUser.uid,
          email: fbUser.email || ""
        }));
        setRole(null);
        setHasSelectedRole(false);
        setProfileComplete(false);
      }
      setIsLoadingData(false);
      setLoadError(false);
      setDataLoaded(true);
    } catch (error) {
      console.warn("[Lancing] Error loading user data");
      setIsLoadingData(false);
      setLoadError(true);
      setDataLoaded(true);
    }
  };

  // Handle redirect result on mount (mobile Google sign-in flow)
  useEffect(() => {
    getRedirectResult(auth).then(async (result) => {
      if (!result) return;
      // For register flow: create Firestore doc if it doesn't exist yet
      const flag = localStorage.getItem("lancing_pending_google_register");
      if (flag) {
        localStorage.removeItem("lancing_pending_google_register");
        const ref = doc(firestore, "lancing_users", result.user.uid);
        const snap = await getDoc(ref);
        if (!snap.exists()) {
          await setDoc(ref, {
            email: result.user.email,
            createdAt: new Date().toISOString(),
            role: null,
            profileComplete: false,
          });
        }
      }
    }).catch(() => {});
  }, []);

  // Auth state change - return immediately, load data async
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (fbUser) => {
      setFirebaseUser(fbUser);
      
      if (fbUser) {
        // Set user immediately with minimal data
        setUser({
          uid: fbUser.uid,
          email: fbUser.email || ""
        });
        // Done with initial auth - don't block
        setIsLoading(false);
      } else {
        // Not authenticated
        setUser(null);
        setRole(null);
        setHasSelectedRole(false);
        setProfileComplete(false);
        setDataLoaded(false);
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Background data loading with timeout
  useEffect(() => {
    if (!firebaseUser) return;

    // Clear any existing timeout
    if (loadTimeoutRef.current) {
      clearTimeout(loadTimeoutRef.current);
    }

    dataLoadAttemptRef.current = 0;
    
    // Load data immediately
    fetchUserDataInBackground(firebaseUser);

    // Set timeout for slow Firebase (8 seconds). CRITICAL: also mark
    // dataLoaded=true, otherwise the login page redirect (which waits for
    // dataLoaded) never fires and an authenticated user is stranded on the
    // login screen forever when Firestore is slow/hanging.
    loadTimeoutRef.current = setTimeout(() => {
      setIsLoadingData(prev => {
        if (prev) {
          setLoadError(true);
          setDataLoaded(true);
        }
        return false;
      });
    }, 8000);

    return () => {
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
      }
    };
  }, [firebaseUser]);

  const retryLoad = async () => {
    if (firebaseUser && dataLoadAttemptRef.current < 3) {
      dataLoadAttemptRef.current++;
      await fetchUserDataInBackground(firebaseUser);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      // Don't wait for fetchUserDataInBackground - it happens in useEffect
    } catch (error: any) {
      console.warn("[Lancing] Login failed:", error.message);
      throw new Error(error.message || "Login failed");
    }
  };

  const register = async (email: string, password: string) => {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      await setDoc(doc(firestore, "lancing_users", result.user.uid), {
        email: result.user.email,
        createdAt: new Date().toISOString(),
        role: null,
        profileComplete: false
      });
      // Don't wait for fetchUserDataInBackground - it happens in useEffect
    } catch (error: any) {
      console.warn("[Lancing] Register failed:", error.message);
      throw new Error(error.message || "Registration failed");
    }
  };

  const loginWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      try {
        // Popup works on both desktop and mobile (COOP is disabled server-side).
        // signInWithRedirect is unreliable on custom domains (third-party
        // storage partitioning silently drops the auth state), so popup first.
        await signInWithPopup(auth, provider);
      } catch (popupError: any) {
        if (popupError.code === "auth/popup-closed-by-user" || popupError.code === "auth/cancelled-popup-request") return;
        // Popup genuinely blocked (e.g. in-app browsers) → last-resort redirect
        if (popupError.code === "auth/popup-blocked" || popupError.code === "auth/internal-error") {
          await signInWithRedirect(auth, provider);
          return;
        }
        throw popupError;
      }
      // Don't wait - useEffect handles it
    } catch (error: any) {
      if (error.code === "auth/popup-closed-by-user" || error.code === "auth/cancelled-popup-request") return;
      console.warn("[Lancing] Google login failed:", error.message);
      throw new Error(error.message || "Google login failed");
    }
  };

  const registerWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      let result;
      try {
        result = await signInWithPopup(auth, provider);
      } catch (popupError: any) {
        if (popupError.code === "auth/popup-closed-by-user" || popupError.code === "auth/cancelled-popup-request") return;
        if (popupError.code === "auth/popup-blocked" || popupError.code === "auth/internal-error") {
          localStorage.setItem("lancing_pending_google_register", "1");
          await signInWithRedirect(auth, provider);
          return; // page navigates away; getRedirectResult useEffect handles Firestore doc on return
        }
        throw popupError;
      }
      // Fire and forget Firestore doc creation
      setDoc(doc(firestore, "lancing_users", result.user.uid), {
        email: result.user.email,
        createdAt: new Date().toISOString(),
        role: null,
        profileComplete: false,
      }).catch(() => {});
      // Don't wait - useEffect handles it
    } catch (error: any) {
      if (error.code === "auth/popup-closed-by-user" || error.code === "auth/cancelled-popup-request") return;
      console.warn("[Lancing] Google register failed:", error.message);
      throw new Error(error.message || "Google registration failed");
    }
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
    setRole(null);
    setHasSelectedRole(false);
    setProfileComplete(false);
  };

  const selectRole = async (selectedRole: "freelancer" | "company" | "angel" | "placement_cell") => {
    if (!firebaseUser) return;
    
    await setDoc(doc(firestore, "lancing_users", firebaseUser.uid), {
      role: selectedRole,
      roleSelectedAt: new Date().toISOString()
    }, { merge: true });
    
    setRole(selectedRole);
    setHasSelectedRole(true);
    if (user) {
      setUser({ ...user, role: selectedRole });
    }
  };

  const refreshUser = async () => {
    if (firebaseUser) {
      await fetchUserDataInBackground(firebaseUser);
    }
  };

  return (
    <LancingAuthContext.Provider
      value={{
        user,
        firebaseUser,
        isAuthenticated: !!user,
        isLoading,
        isLoadingData,
        dataLoaded,
        loadError,
        retryLoad,
        role,
        hasSelectedRole,
        profileComplete,
        login,
        register,
        loginWithGoogle,
        registerWithGoogle,
        logout,
        selectRole,
        refreshUser
      }}
    >
      {children}
    </LancingAuthContext.Provider>
  );
}

export function useLancingAuth() {
  const context = useContext(LancingAuthContext);
  if (context === undefined) {
    throw new Error("useLancingAuth must be used within a LancingAuthProvider");
  }
  return context;
}
