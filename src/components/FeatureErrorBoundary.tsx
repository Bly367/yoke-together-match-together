/**
 * Feature-specific error boundary component
 * 
 * Provides granular error handling for individual features/sections.
 * Prevents entire app crashes when a single feature fails.
 * 
 * @example
 * ```tsx
 * <FeatureErrorBoundary featureName="Chat">
 *   <Chat />
 * </FeatureErrorBoundary>
 * ```
 */

import React, { ErrorInfo, ReactNode } from 'react';
import { logger } from '@/lib/logger';
import { Button } from './ui/button';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface FeatureErrorBoundaryProps {
  children: ReactNode;
  featureName: string;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

/**
 * Fallback UI component for feature errors
 */
function FeatureErrorFallback({ 
  feature, 
  onRetry 
}: { 
  feature: string; 
  onRetry?: () => void;
}) {
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center p-8 text-center">
      <AlertCircle className="mb-4 h-12 w-12 text-destructive" />
      <h2 className="mb-2 text-xl font-semibold">Something went wrong</h2>
      <p className="mb-4 text-muted-foreground">
        We encountered an error in the {feature} feature. Don't worry, the rest of the app is still working.
      </p>
      {onRetry && (
        <Button onClick={onRetry} variant="outline" className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Try Again
        </Button>
      )}
    </div>
  );
}

/**
 * Feature-specific error boundary wrapper
 * 
 * Wraps the ErrorBoundary component with feature-specific context
 * and provides a custom fallback UI. Reuses the existing ErrorBoundary
 * component to avoid code duplication.
 * 
 * @example
 * ```tsx
 * <FeatureErrorBoundary featureName="Chat">
 *   <Chat />
 * </FeatureErrorBoundary>
 * ```
 */
export function FeatureErrorBoundary({
  children,
  featureName,
  fallback,
  onError,
}: FeatureErrorBoundaryProps) {
  const handleError = (error: Error, errorInfo: ErrorInfo) => {
    logger.error(`Error in ${featureName} feature`, error, {
      feature: featureName,
      componentStack: errorInfo.componentStack,
    });

    // Call custom error handler if provided
    if (onError) {
      onError(error, errorInfo);
    }

    // In production, send to error tracking service
    // Example: Sentry.captureException(error, { tags: { feature: featureName } });
  };

  const defaultFallback = (
    <FeatureErrorFallback 
      feature={featureName}
      onRetry={() => window.location.reload()}
    />
  );

  // Use error boundary with feature-specific error handling
  return (
    <ErrorBoundaryWithHandler
      fallback={fallback || defaultFallback}
      onError={handleError}
    >
      {children}
    </ErrorBoundaryWithHandler>
  );
}

/**
 * Error boundary wrapper that adds onError callback support
 * Extends React error boundary pattern with feature-specific error handling
 */
class ErrorBoundaryWithHandler extends React.Component<{
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}, {
  hasError: boolean;
  error: Error | null;
}> {
  constructor(props: {
    children: ReactNode;
    fallback?: ReactNode;
    onError?: (error: Error, errorInfo: ErrorInfo) => void;
  }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      // Render fallback UI directly
      if (this.props.fallback) {
        return this.props.fallback;
      }
      // Default fallback (shouldn't happen since we always provide fallback)
      return <FeatureErrorFallback feature="Feature" onRetry={this.handleReset} />;
    }
    return this.props.children;
  }
}

