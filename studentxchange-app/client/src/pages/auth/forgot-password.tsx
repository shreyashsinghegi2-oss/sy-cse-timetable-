import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link } from "wouter";
import { Mail, ArrowLeft, Loader2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/lib/firebase";

// Reset password form validation schema
const resetSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

type ResetFormData = z.infer<typeof resetSchema>;

interface ForgotPasswordPageProps {
  onSuccess?: () => void;
}

export default function ForgotPasswordPage(props: ForgotPasswordPageProps & Record<string, any> = {}) {
  const { onSuccess } = props;
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isEmailSent, setIsEmailSent] = useState(false);

  // Initialize reset form
  const form = useForm<ResetFormData>({
    resolver: zodResolver(resetSchema),
    defaultValues: {
      email: "",
    },
  });

  /**
   * Handle password reset form submission
   * Sends password reset email using Firebase Auth
   */
  const onSubmit = async (data: ResetFormData) => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Send password reset email using Firebase
      await sendPasswordResetEmail(auth, data.email);
      
      setSuccess(`Password reset email sent to ${data.email}`);
      setIsEmailSent(true);

      // Clear form
      form.reset();

    } catch (error: any) {
      console.error("❌ Password reset error:", error);

      // Handle Firebase password reset errors with user-friendly messages
      let errorMessage = "Failed to send password reset email. Please try again.";

      if (error.code === 'auth/user-not-found') {
        errorMessage = "No account found with this email address. Please check your email or sign up.";
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = "Please enter a valid email address.";
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = "Too many password reset requests. Please wait a moment before trying again.";
      }

      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Success state - show confirmation message
  if (isEmailSent && success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-lg border-0">
          <CardHeader className="text-center pb-6">
            <div className="mx-auto mb-4 w-20 h-20 bg-gradient-to-r from-green-500 to-green-600 rounded-full flex items-center justify-center">
              <CheckCircle className="h-10 w-10 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900">Check Your Email</CardTitle>
            <CardDescription className="text-gray-600">
              We've sent password reset instructions to your email
            </CardDescription>
          </CardHeader>

          <CardContent className="text-center">
            <div className="space-y-4">
              <Alert className="border-green-200 bg-green-50">
                <AlertDescription className="text-green-800">
                  {success}
                </AlertDescription>
              </Alert>

              <div className="text-sm text-gray-600 space-y-2">
                <p>Please check your email inbox and spam folder for the password reset link.</p>
                <p>The link will expire in 1 hour for security purposes.</p>
              </div>

              <div className="space-y-3 pt-4">
                <Button
                  onClick={() => {
                    setIsEmailSent(false);
                    setSuccess(null);
                  }}
                  variant="outline"
                  className="w-full"
                  data-testid="button-send-another"
                >
                  Send Another Email
                </Button>

                <Link href="/auth/login" className="block">
                  <Button
                    variant="ghost"
                    className="w-full text-blue-600 hover:text-blue-700"
                    data-testid="button-back-to-login"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Sign In
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Main form state
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg border-0">
        <CardHeader className="text-center pb-6">
          <div className="mx-auto mb-4 w-20 h-20 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full flex items-center justify-center">
            <Mail className="h-10 w-10 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">Reset Your Password</CardTitle>
          <CardDescription className="text-gray-600">
            Enter your email address and we'll send you a password reset link
          </CardDescription>
        </CardHeader>

        <CardContent>
          {/* Error Alert */}
          {error && (
            <Alert className="mb-4 border-red-200 bg-red-50">
              <AlertDescription className="text-red-800">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {/* Reset Form */}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* Email Field */}
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-700">Email Address</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          {...field}
                          type="email"
                          placeholder="Enter your email address"
                          className="pl-10"
                          data-testid="input-email"
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                disabled={isLoading}
                data-testid="button-send-reset"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending Reset Email...
                  </>
                ) : (
                  "Send Reset Email"
                )}
              </Button>
            </form>
          </Form>

          {/* Navigation Links */}
          <div className="mt-6 space-y-3">
            <div className="text-center">
              <Link
                href="/auth/login"
                className="inline-flex items-center text-sm text-blue-600 hover:text-blue-700 hover:underline"
                data-testid="link-back-to-login"
              >
                <ArrowLeft className="mr-1 h-4 w-4" />
                Back to Sign In
              </Link>
            </div>

            <div className="text-center">
              <p className="text-sm text-gray-600">
                Don't have an account?{" "}
                <Link
                  href="/auth/signup"
                  className="text-blue-600 hover:text-blue-700 font-medium hover:underline"
                  data-testid="link-signup"
                >
                  Sign up here
                </Link>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}