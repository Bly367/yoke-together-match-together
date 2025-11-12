import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
import chickMascot from "@/assets/chick-mascot.png";
import { Loader2 } from "lucide-react";
import { useResetPassword } from "@/hooks/useAuth";
import { ROUTES } from "@/lib/routes";
import { isValidEmail } from "@/lib/utils";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const navigate = useNavigate();

  const resetPasswordMutation = useResetPassword();

  // Validate email on change
  useEffect(() => {
    if (email) {
      if (!isValidEmail(email)) {
        setEmailError("Please enter a valid email address");
      } else {
        setEmailError("");
      }
    } else {
      setEmailError("");
    }
  }, [email]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate email
    if (!isValidEmail(email)) {
      setEmailError("Please enter a valid email address");
      return;
    }

    try {
      await resetPasswordMutation.mutateAsync({ email });
      setIsSubmitted(true);
      toast.success("Password reset email sent! Check your inbox.");
    } catch (error: any) {
      toast.error(error.message || "Failed to send reset email");
    }
  };

  const loading = resetPasswordMutation.isPending;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-card rounded-3xl shadow-[var(--shadow-card)] p-8 space-y-6 animate-slide-up">
          {/* Mascot */}
          <div className="flex justify-center">
            <img 
              src={chickMascot} 
              alt="Yoke" 
              className="w-24 h-24 animate-bounce-soft"
            />
          </div>

          {/* Header */}
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold text-foreground">
              Forgot Password?
            </h1>
            <p className="text-muted-foreground">
              {isSubmitted 
                ? "We've sent you a password reset link. Please check your email."
                : "Enter your email address and we'll send you a link to reset your password."}
            </p>
          </div>

          {/* Form */}
          {!isSubmitted ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className={`rounded-2xl ${emailError ? "border-destructive" : ""}`}
                  disabled={loading}
                />
                {emailError && (
                  <p className="text-sm text-destructive">{emailError}</p>
                )}
              </div>

              <Button 
                type="submit" 
                variant="yolk" 
                className="w-full" 
                size="lg"
                disabled={loading || !!emailError}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  "Send Reset Link"
                )}
              </Button>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-2xl text-sm text-muted-foreground">
                <p className="font-medium mb-2">What's next?</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Check your email inbox (and spam folder)</li>
                  <li>Click the reset link in the email</li>
                  <li>Enter your new password</li>
                </ol>
              </div>
              <Button 
                onClick={() => navigate(ROUTES.AUTH)}
                variant="outline" 
                className="w-full" 
                size="lg"
              >
                Back to Sign In
              </Button>
            </div>
          )}

          {/* Back to Sign In Link */}
          {!isSubmitted && (
            <div className="text-center">
              <Link
                to={ROUTES.AUTH}
                className="text-primary hover:underline text-sm"
              >
                Remember your password? Sign in
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;

