import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Mail, Lock, UserPlus } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useCollabAuth } from "@/hooks/use-collab-auth";
import { FirebaseAuth } from "@/components/auth/firebase-auth";

interface SmartLoginFormProps {
  onSuccess?: () => void;
  onSwitchToRegister?: () => void;
}

type LoginStep = "email" | "password" | "firebase" | "register";

export function SmartLoginForm({ onSuccess, onSwitchToRegister }: SmartLoginFormProps) {
  const [step, setStep] = useState<LoginStep>("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isChecking, setIsChecking] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [error, setError] = useState("");
  const [authType, setAuthType] = useState<"traditional" | "firebase" | null>(null);

  const { loginMutation } = useAuth();
  const { login: collabLogin } = useCollabAuth();

  // Check if user exists in PostgreSQL
  const checkUserExists = async () => {
    if (!email) return;
    
    try {
      setIsChecking(true);
      setError("");
      
      const response = await fetch(`/api/collab/auth/login-status?email=${encodeURIComponent(email)}`);
      const data = await response.json();
      
      if (response.ok) {
        setAuthType(data.authType);
        if (data.userExists) {
          setStep("password");
        } else {
          setStep("firebase");
        }
      } else {
        setError(data.error || "Failed to check user status");
      }
    } catch (error) {
      setError("Network error. Please try again.");
    } finally {
      setIsChecking(false);
    }
  };

  // Handle traditional password login
  const handlePasswordLogin = async () => {
    if (!email || !password) return;
    
    try {
      setIsLoggingIn(true);
      setError("");

      const response = await fetch("/api/collab/auth/smart-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        // Use collab auth context to manage authentication
        await collabLogin(data.token, data.user);
        onSuccess?.();
      } else {
        setError(data.error || "Login failed");
      }
    } catch (error) {
      setError("Network error. Please try again.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Handle Firebase authentication success
  const handleFirebaseSuccess = async (firebaseIdToken: string) => {
    try {
      setIsLoggingIn(true);
      setError("");

      const response = await fetch("/api/collab/auth/smart-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, firebaseIdToken }),
      });

      const data = await response.json();

      if (response.ok) {
        // Use collab auth context to manage authentication
        await collabLogin(data.token, data.user);
        onSuccess?.();
      } else {
        setError(data.error || "Firebase login failed");
      }
    } catch (error) {
      setError("Network error. Please try again.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const resetForm = () => {
    setStep("email");
    setEmail("");
    setPassword("");
    setError("");
    setAuthType(null);
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold">Student Collab Login</CardTitle>
        <CardDescription>
          {step === "email" && "Enter your email to get started"}
          {step === "password" && "Welcome back! Enter your password"}
          {step === "firebase" && "New user? Let's set up your account"}
          {step === "register" && "Complete your registration"}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Step 1: Email Input */}
        {step === "email" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  onKeyDown={(e) => e.key === "Enter" && checkUserExists()}
                  data-testid="input-email"
                />
              </div>
            </div>
            
            <Button 
              onClick={checkUserExists} 
              disabled={!email || isChecking}
              className="w-full"
              data-testid="button-check-email"
            >
              {isChecking ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Checking...
                </>
              ) : (
                "Continue"
              )}
            </Button>
          </div>
        )}

        {/* Step 2: Password Input (Existing Users) */}
        {step === "password" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                  onKeyDown={(e) => e.key === "Enter" && handlePasswordLogin()}
                  data-testid="input-password"
                />
              </div>
            </div>
            
            <Button 
              onClick={handlePasswordLogin} 
              disabled={!password || isLoggingIn}
              className="w-full"
              data-testid="button-login"
            >
              {isLoggingIn ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing In...
                </>
              ) : (
                "Sign In"
              )}
            </Button>

            <Button 
              variant="outline" 
              onClick={resetForm}
              className="w-full"
              data-testid="button-back"
            >
              Back
            </Button>
          </div>
        )}

        {/* Step 3: Firebase Authentication (New Users) */}
        {step === "firebase" && (
          <div className="space-y-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
              <UserPlus className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <p className="text-sm text-blue-800">
                New user detected! We'll set up your account using secure Firebase authentication.
              </p>
            </div>

            <FirebaseAuth
              email={email}
              onSuccess={handleFirebaseSuccess}
              onError={setError}
              isLoading={isLoggingIn}
            />

            <Button 
              variant="outline" 
              onClick={resetForm}
              className="w-full"
              data-testid="button-back-firebase"
            >
              Back
            </Button>
          </div>
        )}

        {/* Alternative Actions */}
        <div className="text-center pt-4 border-t">
          <p className="text-sm text-muted-foreground">
            Need help?{" "}
            <Button 
              variant="link" 
              className="p-0 h-auto font-normal text-sm"
              onClick={() => setError("Please contact support for assistance.")}
              data-testid="link-help"
            >
              Contact Support
            </Button>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}