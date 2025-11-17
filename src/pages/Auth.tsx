import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { toast } from "sonner";
import chickMascot from "@/assets/chick-mascot.png";
import { Loader2 } from "lucide-react";
import { useSignUp, useSignIn } from "@/hooks/useAuth";
import { ROUTES } from "@/lib/routes";
import { isValidEmail, getPasswordStrength } from "@/lib/utils";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordStrength, setPasswordStrength] = useState({ score: 0, feedback: "" });
  const navigate = useNavigate();
  const location = useLocation();

  const signUpMutation = useSignUp();
  const signInMutation = useSignIn();

  // Get redirect path from location state, sessionStorage, or default to profile
  const getRedirectPath = (): string => {
    // Check location state first (from ProtectedRoute)
    const stateRedirect = (location.state as { from?: string })?.from;
    if (stateRedirect) return stateRedirect;
    
    // Check sessionStorage as fallback
    const storedRedirect = sessionStorage.getItem('redirectTo');
    if (storedRedirect) {
      sessionStorage.removeItem('redirectTo');
      return storedRedirect;
    }
    
    // Default to profile
    return ROUTES.PROFILE;
  };
  
  const redirectTo = getRedirectPath();

  // Validate email on change
  useEffect(() => {
    if (email && !isLogin) {
      if (!isValidEmail(email)) {
        setEmailError("Please enter a valid email address");
      } else {
        setEmailError("");
      }
    } else {
      setEmailError("");
    }
  }, [email, isLogin]);

  // Calculate password strength on change
  useEffect(() => {
    if (password && !isLogin) {
      setPasswordStrength(getPasswordStrength(password));
    } else {
      setPasswordStrength({ score: 0, feedback: "" });
    }
  }, [password, isLogin]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate email
    if (!isValidEmail(email)) {
      setEmailError("Please enter a valid email address");
      return;
    }

    try {
      if (isLogin) {
        await signInMutation.mutateAsync({ email, password });
        toast.success("Welcome back!");
        navigate(redirectTo);
      } else {
        if (!name.trim()) {
          toast.error("Please enter your name");
          return;
        }
        if (passwordStrength.score < 2) {
          toast.error("Password is too weak. Please choose a stronger password.");
          return;
        }
        await signUpMutation.mutateAsync({ email, password, name });
        toast.success("Account created successfully!");
        navigate(ROUTES.PROFILE_SETUP);
      }
    } catch (error: any) {
      // Extract user-friendly error message
      const errorMessage = error?.message || error?.error?.message || "An error occurred. Please try again.";
      toast.error(errorMessage);
      console.error('Auth error:', error);
    }
  };

  const loading = signUpMutation.isPending || signInMutation.isPending;

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
              {isLogin ? "Welcome Back!" : "Join Yoke"}
            </h1>
            <p className="text-muted-foreground">
              {isLogin ? "Sign in to continue your journey" : "Create an account to get started"}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleAuth} className="space-y-4">
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required={!isLogin}
                  className="rounded-2xl"
                />
              </div>
            )}
            
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
              />
              {emailError && (
                <p className="text-sm text-destructive">{emailError}</p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                {isLogin && (
                  <Link
                    to={ROUTES.FORGOT_PASSWORD}
                    className="text-sm text-primary hover:underline"
                  >
                    Forgot password?
                  </Link>
                )}
              </div>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="rounded-2xl"
              />
              {!isLogin && password && (
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
            </div>

            <Button 
              type="submit" 
              variant="yolk" 
              className="w-full" 
              size="lg"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading...
                </>
              ) : (
                isLogin ? "Sign In" : "Sign Up"
              )}
            </Button>
          </form>

          {/* Toggle */}
          <div className="text-center">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-primary hover:underline text-sm"
            >
              {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
