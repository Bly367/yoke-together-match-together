import React, { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { SessionTimeoutWarning } from "@/components/SessionTimeoutWarning";
import { RouteTransition } from "@/components/RouteTransition";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { FeatureErrorBoundary } from "@/components/FeatureErrorBoundary";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ViewingProvider } from "@/contexts/ViewingContext";
import { ConfigError } from "@/components/ConfigError";
import { useDefaultKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useExpireDuoRequests } from "@/hooks/useExpireDuoRequests";
import { ROUTES } from "@/lib/routes";
import { Loader2 } from "lucide-react";
import { initErrorTracking, trackWebVitals } from "@/lib/monitoring";
import { logger } from "@/lib/logger";
import { registerSW } from "virtual:pwa-register";
import { isSupabaseConfigured } from "@/integrations/supabase/client";

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
const PrivateMessages = lazy(() => import("./pages/PrivateMessages"));
const PrivateChat = lazy(() => import("./pages/PrivateChat"));
const GameSession = lazy(() => import("./pages/GameSession"));
const Profile = lazy(() => import("./pages/Profile"));
const Preferences = lazy(() => import("./pages/Preferences"));
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

/**
 * React Query client with optimized configuration for production
 * 
 * Configuration:
 * - staleTime: 5 minutes - data considered fresh for 5 min (reduces refetches)
 * - gcTime: 10 minutes - cache garbage collection time
 * - Smart retry logic - retries network errors, not client errors (4xx)
 * - Exponential backoff - prevents server overload
 * - refetchOnWindowFocus: false - better UX, prevents unnecessary refetches
 * - refetchOnReconnect: true - refetch when network reconnects
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes - data fresh for 5 min
      gcTime: 10 * 60 * 1000, // 10 minutes - cache garbage collection (formerly cacheTime)
      retry: (failureCount, error: any) => {
        // Don't retry on 4xx errors (client errors like validation, auth, etc.)
        if (error?.status >= 400 && error?.status < 500) {
          return false;
        }
        // Retry up to 3 times for network/server errors (5xx, network failures)
        return failureCount < 3;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff: 1s, 2s, 4s, max 30s
      refetchOnWindowFocus: false, // Don't refetch on window focus (better UX, reduces API calls)
      refetchOnReconnect: true, // Refetch when network reconnects (good for offline support)
      refetchOnMount: true, // Refetch when component mounts (ensures fresh data)
    },
    mutations: {
      retry: 1, // Retry mutations once on failure (network errors only)
      retryDelay: 1000,
    },
  },
});

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
                  <FeatureErrorBoundary featureName="Matchmaking">
                    <Matchmaking />
                  </FeatureErrorBoundary>
                </ProtectedRoute>
              }
            />
            <Route
              path={ROUTES.MATCHES}
              element={
                <ProtectedRoute>
                  <FeatureErrorBoundary featureName="Matches">
                    <Matches />
                  </FeatureErrorBoundary>
                </ProtectedRoute>
              }
            />
            <Route
              path={ROUTES.MESSAGES}
              element={
                <ProtectedRoute>
                  <FeatureErrorBoundary featureName="Messages">
                    <Messages />
                  </FeatureErrorBoundary>
                </ProtectedRoute>
              }
            />
            <Route
              path={`${ROUTES.CHAT_BASE}/:matchId`}
              element={
                <ProtectedRoute>
                  <FeatureErrorBoundary featureName="Chat">
                    <Chat />
                  </FeatureErrorBoundary>
                </ProtectedRoute>
              }
            />
            <Route
              path={ROUTES.PRIVATE_MESSAGES}
              element={
                <ProtectedRoute>
                  <FeatureErrorBoundary featureName="Private Messages">
                    <PrivateMessages />
                  </FeatureErrorBoundary>
                </ProtectedRoute>
              }
            />
            <Route
              path={`${ROUTES.PRIVATE_CHAT_BASE}/:conversationId`}
              element={
                <ProtectedRoute>
                  <FeatureErrorBoundary featureName="Private Chat">
                    <PrivateChat />
                  </FeatureErrorBoundary>
                </ProtectedRoute>
              }
            />
            <Route
              path={`/match/:matchId/game/:sessionId`}
              element={
                <ProtectedRoute>
                  <FeatureErrorBoundary featureName="Game Session">
                    <GameSession />
                  </FeatureErrorBoundary>
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
              path={ROUTES.PREFERENCES}
              element={
                <ProtectedRoute>
                  <Preferences />
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

/**
 * Main App component
 * Initializes monitoring and error tracking on mount
 */
const App = () => {
  // Check if Supabase is configured - show error screen if not
  if (!isSupabaseConfigured()) {
    return (
      <ErrorBoundary>
        <ConfigError />
      </ErrorBoundary>
    );
  }

  // Initialize error tracking and performance monitoring
  React.useEffect(() => {
    initErrorTracking();
    trackWebVitals();
    
    // Add global error handlers to catch unhandled errors
    const handleError = (event: ErrorEvent) => {
      logger.error('Unhandled error', event.error, { 
        message: event.message, 
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno 
      });
    };
    
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      logger.error('Unhandled promise rejection', event.reason, {
        type: typeof event.reason,
      });
      // Prevent default browser error handling
      event.preventDefault();
    };
    
    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    
    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  // Register service worker for PWA functionality
  React.useEffect(() => {
    registerSW({
      immediate: true,
      onRegistered(r: unknown) {
        logger.info('Service Worker Registered', r);
      },
      onRegisterError(error: Error) {
        logger.error('Service Worker registration error', error);
      },
    });
  }, []);

  return (
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
};

export default App;
