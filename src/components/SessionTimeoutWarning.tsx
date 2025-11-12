import { useEffect, useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { useSessionTimeout } from '@/hooks/useSessionTimeout';
import { toast } from 'sonner';

/**
 * Component that displays a warning when the session is about to expire
 * Shows a dismissible alert with option to refresh session
 */
export function SessionTimeoutWarning() {
  const [isVisible, setIsVisible] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const { isExpiring, minutesUntilExpiry, refreshSession } = useSessionTimeout(
    () => {
      // Show warning when session is expiring
      setIsVisible(true);
    },
    () => {
      // Handle session expired
      toast.error('Your session has expired. Please sign in again.');
      setIsVisible(false);
    }
  );

  useEffect(() => {
    setIsVisible(isExpiring);
  }, [isExpiring]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshSession();
      toast.success('Session refreshed successfully');
      setIsVisible(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to refresh session');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 max-w-md w-full px-4">
      <Alert className="border-warning bg-warning/10">
        <AlertTriangle className="h-4 w-4 text-warning" />
        <AlertTitle>Session Expiring Soon</AlertTitle>
        <AlertDescription className="mt-2">
          <p className="mb-3">
            Your session will expire in {minutesUntilExpiry} {minutesUntilExpiry === 1 ? 'minute' : 'minutes'}.
            Refresh your session to stay signed in.
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex-1"
            >
              {isRefreshing ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Refreshing...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh Session
                </>
              )}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleDismiss}
              disabled={isRefreshing}
            >
              Dismiss
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
}

