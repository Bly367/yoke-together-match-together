import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { SessionTimeoutWarning } from "@/components/SessionTimeoutWarning";
import { RouteTransition } from "@/components/RouteTransition";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ViewingProvider } from "@/contexts/ViewingContext";
import { useDefaultKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useExpireDuoRequests } from "@/hooks/useExpireDuoRequests";
import { ROUTES } from "@/lib/routes";
import { Loader2 } from "lucide-react";

// Lazy load pages for code splitting
const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const ProfileSetup = lazy(() => import("./pages/ProfileSetup"));
const DuoSetup = lazy(() => import("./pages/DuoSetup"));
const DuoRequests = lazy(() => import("./pages/DuoRequests"));
const JoinDuo = lazy(() => import("./pages/JoinDuo"));
const Matchmaking = lazy(() => import("./pages/Matchmaking"));
const Matches = lazy(() => import("./pages/Matches"));
const Messages = lazy(() => import("./pages/Messages"));
const Chat = lazy(() => import("./pages/Chat"));
const Profile = lazy(() => import("./pages/Profile"));
const NotificationSettings = lazy(() => import("./pages/NotificationSettings"));
const NotFound = lazy(() => import("./pages/NotFound"));

/**
 * Loading fallback component for Suspense
 */
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background">
    <Loader2 className="w-8 h-8 animate-spin text-primary" />
  </div>
);

const queryClient = new QueryClient();

/**
 * App content component with route transitions and keyboard shortcuts
 */
const AppContent = () => {
  // Enable default keyboard shortcuts
  useDefaultKeyboardShortcuts();
  
  // Automatically expire old duo requests periodically
  useExpireDuoRequests();

  return (
    <RouteTransition>
      <Suspense fallback={<PageLoader />}>
        <Routes>
            <Route path={ROUTES.INDEX} element={<Index />} />
            <Route path={ROUTES.AUTH} element={<Auth />} />
            <Route path={ROUTES.FORGOT_PASSWORD} element={<ForgotPassword />} />
            <Route path={ROUTES.RESET_PASSWORD} element={<ResetPassword />} />
            <Route
              path={ROUTES.PROFILE_SETUP}
              element={
                <ProtectedRoute>
                  <ProfileSetup />
                </ProtectedRoute>
              }
            />
            <Route
              path={ROUTES.DUO_SETUP}
              element={
                <ProtectedRoute>
                  <DuoSetup />
                </ProtectedRoute>
              }
            />
            <Route
              path={ROUTES.DUO_REQUESTS}
              element={
                <ProtectedRoute>
                  <DuoRequests />
                </ProtectedRoute>
              }
            />
            <Route
              path={`${ROUTES.JOIN_DUO_BASE}/:userId`}
              element={
                <ProtectedRoute>
                  <JoinDuo />
                </ProtectedRoute>
              }
            />
            <Route
              path={ROUTES.MATCHMAKING}
              element={
                <ProtectedRoute>
                  <Matchmaking />
                </ProtectedRoute>
              }
            />
            <Route
              path={ROUTES.MATCHES}
              element={
                <ProtectedRoute>
                  <Matches />
                </ProtectedRoute>
              }
            />
            <Route
              path={ROUTES.MESSAGES}
              element={
                <ProtectedRoute>
                  <Messages />
                </ProtectedRoute>
              }
            />
            <Route
              path={`${ROUTES.CHAT_BASE}/:matchId`}
              element={
                <ProtectedRoute>
                  <Chat />
                </ProtectedRoute>
              }
            />
            <Route
              path={ROUTES.PROFILE}
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />
            <Route
              path={ROUTES.NOTIFICATION_SETTINGS}
              element={
                <ProtectedRoute>
                  <NotificationSettings />
                </ProtectedRoute>
              }
            />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path={ROUTES.NOT_FOUND} element={<NotFound />} />
        </Routes>
      </Suspense>
    </RouteTransition>
  );
};

const App = () => (
  <ErrorBoundary>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <QueryClientProvider client={queryClient}>
        <ViewingProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <SessionTimeoutWarning />
            <BrowserRouter>
              <AppContent />
            </BrowserRouter>
          </TooltipProvider>
        </ViewingProvider>
      </QueryClientProvider>
    </ThemeProvider>
  </ErrorBoundary>
);

export default App;
