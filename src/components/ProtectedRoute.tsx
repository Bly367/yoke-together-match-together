import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { ROUTES } from "@/lib/routes";

interface ProtectedRouteProps {
  children: React.ReactNode;
  redirectTo?: string;
}

/**
 * Protected route wrapper that redirects unauthenticated users to auth page
 * Displays loading state while checking authentication
 * Stores the originally requested page so user can be redirected back after login
 */
export function ProtectedRoute({ 
  children, 
  redirectTo = ROUTES.AUTH 
}: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!isLoading && !user) {
      // Store the current location so we can redirect back after login
      // Use both state and sessionStorage for reliability
      const redirectPath = location.pathname + location.search;
      sessionStorage.setItem('redirectTo', redirectPath);
      navigate(redirectTo, { 
        state: { from: redirectPath } 
      });
    }
  }, [user, isLoading, navigate, redirectTo, location]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect to auth
  }

  return <>{children}</>;
}

