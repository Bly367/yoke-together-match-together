import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import chickMascot from "@/assets/chick-mascot.png";
import { Loader2 } from "lucide-react";
import { useUpdatePassword } from "@/hooks/useAuth";
import { ROUTES } from "@/lib/routes";
import { getPasswordStrength } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordStrength, setPasswordStrength] = useState({ score: 0, feedback: "" });
  const [passwordError, setPasswordError] = useState("");
  const [confirmPasswordError, setConfirmPasswordError] = useState("");
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [hasValidSession, setHasValidSession] = useState(false);
  const navigate = useNavigate();

  const updatePasswordMutation = useUpdatePassword();

  // Check for valid session on mount (Supabase handles token from URL hash automatically)
  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setHasValidSession(true);
        } else {
          // If no session, try to get user (might be processing token)
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            setHasValidSession(true);
          } else {
            toast.error("Invalid or expired reset link. Please request a new one.");
            setTimeout(() => navigate(ROUTES.FORGOT_PASSWORD), 2000);
          }
        }
      } catch (error) {
        console.error("Error checking session:", error);
        toast.error("Invalid or expired reset link. Please request a new one.");
        setTimeout(() => navigate(ROUTES.FORGOT_PASSWORD), 2000);
      } finally {
        setIsCheckingSession(false);
      }
    };

    checkSession();
  }, [navigate]);

  // Calculate password strength on change
  useEffect(() => {
    if (password) {
      setPasswordStrength(getPasswordStrength(password));
    } else {
      setPasswordStrength({ score: 0, feedback: "" });
    }
  }, [password]);

  // Validate password match on confirm password change
  useEffect(() => {
    if (confirmPassword && password) {
      if (confirmPassword !== password) {
        setConfirmPasswordError("Passwords do not match");
      } else {
        setConfirmPasswordError("");
      }
    } else {
      setConfirmPasswordError("");
    }
  }, [password, confirmPassword]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate password strength
    if (passwordStrength.score < 2) {
      setPasswordError("Password is too weak. Please choose a stronger password.");
      return;
    }

    // Validate password match
    if (password !== confirmPassword) {
      setConfirmPasswordError("Passwords do not match");
      return;
    }

    try {
      await updatePasswordMutation.mutateAsync(password);
      toast.success("Password updated successfully!");
      navigate(ROUTES.AUTH);
    } catch (error: any) {
      toast.error(error.message || "Failed to update password");
    }
  };

  const loading = updatePasswordMutation.isPending;
  const canSubmit = passwordStrength.score >= 2 && password === confirmPassword && !loading;

  if (isCheckingSession) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-card rounded-3xl shadow-[var(--shadow-card)] p-8 space-y-6 animate-slide-up">
            <div className="flex flex-col items-center space-y-4">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-muted-foreground">Verifying reset link...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!hasValidSession) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-card rounded-3xl shadow-[var(--shadow-card)] p-8 space-y-6 animate-slide-up">
            <div className="flex justify-center">
              <img 
                src={chickMascot} 
                alt="Yoke" 
                className="w-24 h-24 animate-bounce-soft"
              />
            </div>
            <div className="text-center space-y-4">
              <h1 className="text-3xl font-bold text-foreground">
                Invalid Reset Link
              </h1>
              <p className="text-muted-foreground">
                This password reset link is invalid or has expired. Please request a new one.
              </p>
              <Button 
                onClick={() => navigate(ROUTES.FORGOT_PASSWORD)}
                variant="yolk" 
                className="w-full" 
                size="lg"
              >
                Request New Reset Link
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
              Reset Password
            </h1>
            <p className="text-muted-foreground">
              Enter your new password below
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">New Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setPasswordError("");
                }}
                required
                className={`rounded-2xl ${passwordError ? "border-destructive" : ""}`}
                disabled={loading}
              />
              {password && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Progress 
                      value={(passwordStrength.score / 4) * 100} 
                      className="h-1.5 flex-1"
                    />
                    <span className={`text-xs font-medium ${
                      passwordStrength.score === 0 ? "text-muted-foreground" :
                      passwordStrength.score === 1 ? "text-destructive" :
                      passwordStrength.score === 2 ? "text-yellow-500" :
                      passwordStrength.score === 3 ? "text-blue-500" :
                      "text-green-500"
                    }`}>
                      {passwordStrength.score === 0 ? "Very Weak" :
                       passwordStrength.score === 1 ? "Weak" :
                       passwordStrength.score === 2 ? "Fair" :
                       passwordStrength.score === 3 ? "Good" :
                       "Strong"}
                    </span>
                  </div>
                  {passwordStrength.feedback && (
                    <p className={`text-xs ${
                      passwordStrength.score < 2 ? "text-destructive" : "text-muted-foreground"
                    }`}>
                      {passwordStrength.feedback}
                    </p>
                  )}
                </div>
              )}
              {passwordError && (
                <p className="text-sm text-destructive">{passwordError}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setConfirmPasswordError("");
                }}
                required
                className={`rounded-2xl ${confirmPasswordError ? "border-destructive" : ""}`}
                disabled={loading}
              />
              {confirmPasswordError && (
                <p className="text-sm text-destructive">{confirmPasswordError}</p>
              )}
            </div>

            <Button 
              type="submit" 
              variant="yolk" 
              className="w-full" 
              size="lg"
              disabled={!canSubmit}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update Password"
              )}
            </Button>
          </form>

          {/* Back to Sign In Link */}
          <div className="text-center">
            <button
              onClick={() => navigate(ROUTES.AUTH)}
              className="text-primary hover:underline text-sm"
            >
              Back to Sign In
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;

