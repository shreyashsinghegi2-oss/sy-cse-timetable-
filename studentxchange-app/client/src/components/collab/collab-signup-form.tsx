import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Mail, Lock, User, UserPlus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { createUserWithEmailAndPassword, updateProfile, signInWithPopup, signInWithRedirect, GoogleAuthProvider, getRedirectResult } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useCollabAuth } from "@/hooks/use-collab-auth";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";

// Signup form validation schema
const signupSchema = z.object({
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username must be less than 30 characters")
    .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores"),
  email: z.string().email("Please enter a valid email address"),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, "Password must contain at least one lowercase letter, one uppercase letter, and one number"),
  confirmPassword: z.string().min(1, "Please confirm your password"),
  acceptTerms: z.boolean().refine((val) => val === true, {
    message: "You must accept the Terms & Conditions and Privacy Policy",
  }),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type SignupFormData = z.infer<typeof signupSchema>;

interface CollabSignupFormProps {
  onSuccess?: () => void;
  onSwitchToLogin?: () => void;
}

export default function CollabSignupForm({ onSuccess, onSwitchToLogin }: CollabSignupFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { login } = useCollabAuth();
  const { toast } = useToast();

  // Handle redirect result on mount
  useEffect(() => {
    const handleRedirectResult = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result) {
          setIsGoogleLoading(true);
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
              description: "Successfully signed up with Google",
            });
            onSuccess?.();
          }
        }
      } catch (error: any) {
        if (error.code !== 'auth/unauthorized-domain') {
          toast({
            variant: "destructive",
            title: "Sign up failed",
            description: error.message || "Please try again",
          });
        }
      } finally {
        setIsGoogleLoading(false);
      }
    };

    handleRedirectResult();
  }, [login, onSuccess, toast]);

  // Initialize signup form
  const form = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
      acceptTerms: false,
    },
  });

  /**
   * Detect if user is on mobile device
   */
  const isMobileDevice = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) 
      || window.innerWidth < 768;
  };

  /**
   * Handle Google OAuth sign-up
   * Uses redirect flow on mobile devices for better compatibility
   */
  const handleGoogleSignUp = async () => {
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
          return; // page navigates away; getRedirectResult useEffect handles the rest
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
          description: "Successfully signed up with Google",
        });
        onSuccess?.();
      } else {
        setIsGoogleLoading(false);
        toast({
          variant: "destructive",
          title: "Sign up failed",
          description: data.error || "Please try again",
        });
      }
    } catch (error: any) {
      setIsGoogleLoading(false);
      
      console.error("❌ Google Sign-Up error:", error);
      console.error("Error code:", error.code);
      console.error("Error message:", error.message);
      
      // Handle specific errors
      if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
        // User cancelled - don't show error
        return;
      } else if (error.code === 'auth/unauthorized-domain') {
        toast({
          variant: "destructive",
          title: "Domain not authorized",
          description: `Current domain (${window.location.hostname}) is not authorized in Firebase. Please contact support.`,
        });
      } else if (error.code === 'auth/popup-blocked') {
        toast({
          variant: "destructive",
          title: "Popup blocked",
          description: "Please allow popups for this site and try again",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Sign up failed",
          description: error.message || "Please try again",
        });
      }
    }
  };

  /**
   * Handle signup form submission
   * Creates Firebase user and syncs with PostgreSQL backend
   */
  const onSubmit = async (data: SignupFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      // Create user with Firebase
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        data.email,
        data.password
      );

      // Update Firebase profile with username
      await updateProfile(userCredential.user, {
        displayName: data.username,
      });

      // Get Firebase ID token
      const idToken = await userCredential.user.getIdToken();

      // Send to backend to create PostgreSQL record and get JWT
      const response = await fetch("/api/collab/auth/smart-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: data.email,
          firebaseIdToken: idToken,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        // Use collab auth context to manage authentication
        await login(result.token, result.user);
        
        onSuccess?.();
      } else {
        setError(result.error || "Registration failed");
        // Clean up Firebase user if backend fails
        await userCredential.user.delete();
      }
    } catch (error: any) {
      if (error.code === "auth/email-already-in-use") {
        setError("An account with this email already exists. Please try signing in instead.");
      } else if (error.code === "auth/weak-password") {
        setError("Password is too weak. Please choose a stronger password.");
      } else if (error.code === "auth/invalid-email") {
        setError("Please enter a valid email address.");
      } else {
        setError(error.message || "Registration failed. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold">Join Student Collab</CardTitle>
        <CardDescription>
          Create your account to start collaborating with fellow students
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Google Sign Up Button */}
        <Button
          type="button"
          variant="outline"
          className="w-full relative"
          onClick={handleGoogleSignUp}
          disabled={isGoogleLoading || isLoading}
          data-testid="button-google-signup"
        >
          {isGoogleLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Signing up...
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
            {/* Username Field */}
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Username
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Choose a username"
                      disabled={isLoading}
                      data-testid="input-username"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                        placeholder="Create a strong password"
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

            {/* Confirm Password Field */}
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Lock className="h-4 w-4" />
                    Confirm Password
                  </FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        {...field}
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="Confirm your password"
                        disabled={isLoading}
                        data-testid="input-confirm-password"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        disabled={isLoading}
                      >
                        {showConfirmPassword ? (
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

            {/* Terms and Conditions */}
            <FormField
              control={form.control}
              name="acceptTerms"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={isLoading}
                      data-testid="checkbox-terms"
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="text-sm">
                      I accept the{" "}
                      <a href="/terms" target="_blank" className="text-blue-600 hover:underline">
                        Terms & Conditions
                      </a>{" "}
                      and{" "}
                      <a href="/privacy-policy" target="_blank" className="text-blue-600 hover:underline">
                        Privacy Policy
                      </a>
                    </FormLabel>
                    <FormMessage />
                  </div>
                </FormItem>
              )}
            />

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
              data-testid="button-signup"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Account...
                </>
              ) : (
                <>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Create Account
                </>
              )}
            </Button>
          </form>
        </Form>

        {/* Switch to Login */}
        <div className="text-center pt-4 border-t">
          <p className="text-sm text-gray-600">
            Already have an account?{" "}
            <Button
              variant="link"
              className="p-0 h-auto"
              onClick={onSwitchToLogin}
              data-testid="link-login"
            >
              Sign in here
            </Button>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}