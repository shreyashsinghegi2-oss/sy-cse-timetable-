import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Mail, Lock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useCollabAuth } from "@/hooks/use-collab-auth";
import {
  signInWithEmailAndPassword, signInWithPopup, signInWithRedirect,
  getRedirectResult, GoogleAuthProvider,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";

function isMobileDevice() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    || window.innerWidth < 768;
}

// Login form validation schema
const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormData = z.infer<typeof loginSchema>;

interface CollabLoginFormProps {
  onSuccess?: () => void;
  onSwitchToSignup?: () => void;
}

export default function CollabLoginForm({ onSuccess, onSwitchToSignup }: CollabLoginFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { login } = useCollabAuth();
  const { toast } = useToast();

  // Handle redirect result on mount (mobile Google sign-in flow)
  useEffect(() => {
    getRedirectResult(auth).then(async (result) => {
      if (!result) return;
      setIsGoogleLoading(true);
      try {
        const idToken = await result.user.getIdToken();
        const response = await fetch("/api/collab/auth/smart-login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: result.user.email, firebaseIdToken: idToken }),
        });
        const data = await response.json();
        if (response.ok) {
          await login(data.token, data.user);
          toast({ title: "Welcome!", description: "Successfully signed in with Google" });
          onSuccess?.();
        } else {
          toast({ variant: "destructive", title: "Login failed", description: data.error || "Please try again" });
        }
      } catch {
        toast({ variant: "destructive", title: "Google authentication failed", description: "Please try again." });
      } finally {
        setIsGoogleLoading(false);
      }
    }).catch(() => {});
  }, [login, onSuccess, toast]);

  // Initialize login form
  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  /**
   * Handle Google OAuth sign-in — redirect on mobile, popup on desktop
   */
  const handleGoogleSignIn = async () => {
    try {
      setIsGoogleLoading(true);
      setError(null);

      const provider = new GoogleAuthProvider();

      // Popup-first everywhere: signInWithRedirect silently loses auth state
      // on custom domains (third-party storage partitioning on mobile browsers).
      let result;
      try {
        result = await signInWithPopup(auth, provider);
      } catch (popupError: any) {
        if (popupError?.code === "auth/popup-blocked" || popupError?.code === "auth/internal-error") {
          // Popup truly blocked (e.g. in-app browsers) → last-resort redirect
          await signInWithRedirect(auth, provider);
          return; // page navigates away; getRedirectResult useEffect handles the rest on return
        }
        throw popupError;
      }
      
      const idToken = await result.user.getIdToken();

      const response = await fetch("/api/collab/auth/smart-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: result.user.email,
          firebaseIdToken: idToken,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        await login(data.token, data.user);
        
        toast({
          title: "Welcome!",
          description: "Successfully signed in with Google",
        });
        
        setIsGoogleLoading(false); // CRITICAL: Stop loading state
        onSuccess?.();
      } else {
        console.error("❌ Server returned error:", data.error);
        setIsGoogleLoading(false);
        toast({
          variant: "destructive",
          title: "Login failed",
          description: data.error || "Please try again",
        });
      }
    } catch (error: any) {
      setIsGoogleLoading(false);
      
      console.error("❌ Google Sign-In error:", error);
      console.error("Error code:", error.code);
      console.error("Error message:", error.message);
      
      // Handle specific errors
      if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
        return;
      } else if (error.code === 'auth/unauthorized-domain' || error.message?.includes('unauthorized')) {
        console.error("❌ Domain not authorized:", window.location.hostname);
        toast({
          variant: "destructive",
          title: "Domain not authorized",
          description: `Please contact support to authorize ${window.location.hostname} for Google login.`,
        });
      } else if (error.code === 'auth/popup-blocked') {
        toast({
          variant: "destructive",
          title: "Popup blocked",
          description: "Please allow popups for this site and try again",
        });
      } else if (error.code === 'auth/network-request-failed') {
        toast({
          variant: "destructive",
          title: "Network issue",
          description: "Please check your internet connection and try again",
        });
      } else {
        // Log more details for debugging
        console.error("❌ Unhandled Google Sign-In error:", {
          code: error.code,
          message: error.message,
          stack: error.stack
        });
        toast({
          variant: "destructive",
          title: "Login failed",
          description: error.message || "Please try again. If issue persists, try email login.",
        });
      }
    }
  };

  /**
   * Handle login form submission
   */
  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/collab/auth/smart-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          email: data.email, 
          password: data.password 
        }),
      });

      const result = await response.json();

      if (response.ok) {
        // Use collab auth context to manage authentication
        await login(result.token, result.user);
        onSuccess?.();
      } else {
        // Handle special case for Firebase users - automatically try Firebase auth
        if (result.suggestFirebase) {
          try {
            // Authenticate with Firebase using the same credentials
            const userCredential = await signInWithEmailAndPassword(
              auth,
              data.email,
              data.password
            );

            // Get Firebase ID token
            const idToken = await userCredential.user.getIdToken();

            // Send Firebase token to backend
            const firebaseResponse = await fetch("/api/collab/auth/smart-login", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                email: data.email,
                firebaseIdToken: idToken,
              }),
            });

            const firebaseResult = await firebaseResponse.json();

            if (firebaseResponse.ok) {
              // Success! Log the user in
              await login(firebaseResult.token, firebaseResult.user);
              onSuccess?.();
            } else {
              setError(firebaseResult.error || "Firebase authentication failed");
            }
          } catch (firebaseError: any) {
            if (firebaseError.code === "auth/wrong-password") {
              setError("Incorrect password. Please check your password and try again.");
            } else if (firebaseError.code === "auth/user-not-found") {
              setError("No account found with this email. Please check your email or sign up.");
            } else if (firebaseError.code === "auth/network-request-failed") {
              setError("Network connection issue. Please check your internet and try again.");
            } else if (firebaseError.code === "auth/too-many-requests") {
              setError("Too many login attempts. Please wait a moment and try again.");
            } else if (firebaseError.code === "auth/invalid-credential") {
              setError("Invalid email or password. Please check your credentials.");
            } else {
              setError("Login failed. Please try again.");
            }
          }
        } else {
          setError(result.error || "Login failed");
        }
      }
    } catch (error) {
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold">Sign In to Student Collab</CardTitle>
        <CardDescription>
          Connect with fellow students and collaborate on amazing projects
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Google Sign In Button */}
        <Button
          type="button"
          variant="outline"
          className="w-full relative"
          onClick={handleGoogleSignIn}
          disabled={isGoogleLoading || isLoading}
          data-testid="button-google-signin"
        >
          {isGoogleLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Signing in...
            </>
          ) : (
            <>
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </>
          )}
        </Button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-2 text-gray-500">Or continue with email</span>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Email Field */}
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Email Address
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="email"
                      placeholder="Enter your email address"
                      disabled={isLoading}
                      data-testid="input-email"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Password Field */}
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Lock className="h-4 w-4" />
                    Password
                  </FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        {...field}
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        disabled={isLoading}
                        data-testid="input-password"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                        disabled={isLoading}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
              data-testid="button-login"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing In...
                </>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>
        </Form>

        {/* Switch to Signup */}
        <div className="text-center pt-4 border-t">
          <p className="text-sm text-gray-600">
            Don't have an account?{" "}
            <Button
              variant="link"
              className="p-0 h-auto"
              onClick={onSwitchToSignup}
              data-testid="link-signup"
            >
              Sign up here
            </Button>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}