import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, User, Phone } from "lucide-react";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";

interface FirebaseAuthProps {
  email: string;
  onSuccess: (firebaseIdToken: string) => void;
  onError: (error: string) => void;
  isLoading: boolean;
}

export function FirebaseAuth({ email, onSuccess, onError, isLoading }: FirebaseAuthProps) {
  const [step, setStep] = useState<"signin" | "register">("signin");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // Try to sign in with Firebase first
  const handleFirebaseSignIn = async () => {
    if (!password) return;
    
    try {
      setIsAuthenticating(true);
      onError("");

      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const idToken = await userCredential.user.getIdToken();
      
      onSuccess(idToken);
    } catch (error: any) {
      // If user doesn't exist, switch to registration
      if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
        setStep("register");
        onError("Account not found. Please create a new account below.");
      } else {
        onError(error.message || "Firebase authentication failed");
      }
    } finally {
      setIsAuthenticating(false);
    }
  };

  // Register new user with Firebase
  const handleFirebaseRegister = async () => {
    if (!password || !confirmPassword || !username || !phone) {
      onError("Please fill in all fields");
      return;
    }

    if (password !== confirmPassword) {
      onError("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      onError("Password must be at least 6 characters");
      return;
    }

    try {
      setIsAuthenticating(true);
      onError("");

      // Create Firebase user
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const idToken = await userCredential.user.getIdToken();

      // Register with backend
      const response = await fetch("/api/auth/firebase-register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firebaseIdToken: idToken,
          username,
          phone
        }),
      });

      const data = await response.json();

      if (response.ok) {
        onSuccess(idToken);
      } else {
        onError(data.error || "Registration failed");
      }
    } catch (error: any) {
      onError(error.message || "Registration failed");
    } finally {
      setIsAuthenticating(false);
    }
  };

  if (step === "signin") {
    return (
      <div className="space-y-4">
        <div className="text-center p-3 bg-green-50 rounded-lg border border-green-200">
          <p className="text-sm text-green-800">
            Do you already have a Firebase account with this email?
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="firebase-password">Firebase Password</Label>
          <Input
            id="firebase-password"
            type="password"
            placeholder="Enter your Firebase password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleFirebaseSignIn()}
            data-testid="input-firebase-password"
          />
        </div>

        <Button 
          onClick={handleFirebaseSignIn} 
          disabled={!password || isAuthenticating}
          className="w-full"
          data-testid="button-firebase-signin"
        >
          {isAuthenticating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Signing In...
            </>
          ) : (
            "Sign In with Firebase"
          )}
        </Button>

        <div className="text-center">
          <Button 
            variant="link" 
            onClick={() => setStep("register")}
            className="text-sm"
            data-testid="link-create-account"
          >
            Don't have a Firebase account? Create one
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-center p-3 bg-blue-50 rounded-lg border border-blue-200">
        <p className="text-sm text-blue-800">
          Create your new Student Collab account
        </p>
      </div>

      <div className="space-y-3">
        <div className="space-y-2">
          <Label htmlFor="username">Username</Label>
          <div className="relative">
            <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="username"
              type="text"
              placeholder="Choose a username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="pl-10"
              data-testid="input-username"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Phone Number</Label>
          <div className="relative">
            <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="phone"
              type="tel"
              placeholder="Enter your phone number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="pl-10"
              data-testid="input-phone"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="new-password">Password</Label>
          <Input
            id="new-password"
            type="password"
            placeholder="Create a password (min 6 characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            data-testid="input-new-password"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirm-password">Confirm Password</Label>
          <Input
            id="confirm-password"
            type="password"
            placeholder="Confirm your password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleFirebaseRegister()}
            data-testid="input-confirm-password"
          />
        </div>
      </div>

      <Button 
        onClick={handleFirebaseRegister} 
        disabled={!password || !confirmPassword || !username || !phone || isAuthenticating}
        className="w-full"
        data-testid="button-firebase-register"
      >
        {isAuthenticating ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Creating Account...
          </>
        ) : (
          "Create Account"
        )}
      </Button>

      <div className="text-center">
        <Button 
          variant="link" 
          onClick={() => setStep("signin")}
          className="text-sm"
          data-testid="link-have-account"
        >
          Already have a Firebase account? Sign in
        </Button>
      </div>
    </div>
  );
}