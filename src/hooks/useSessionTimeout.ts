import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';

/**
 * Session timeout configuration
 */
const SESSION_WARNING_TIME = 5 * 60 * 1000; // 5 minutes before expiry
const SESSION_CHECK_INTERVAL = 60 * 1000; // Check every minute

/**
 * Hook to monitor session timeout and show warnings
 * @param onSessionExpiring - Callback when session is about to expire (5 min warning)
 * @param onSessionExpired - Callback when session has expired
 * @returns Object with session state and refresh function
 */
export function useSessionTimeout(
  onSessionExpiring?: () => void,
  onSessionExpired?: () => void
) {
  const { user } = useAuth();
  const [timeUntilExpiry, setTimeUntilExpiry] = useState<number | null>(null);
  const [isExpiring, setIsExpiring] = useState(false);
  const warningShownRef = useRef(false);
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const checkSession = useCallback(async () => {
    if (!user) {
      setTimeUntilExpiry(null);
      setIsExpiring(false);
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setTimeUntilExpiry(null);
        setIsExpiring(false);
        if (onSessionExpired) {
          onSessionExpired();
        }
        return;
      }

      const expiresAt = session.expires_at ? session.expires_at * 1000 : null;
      if (!expiresAt) {
        setTimeUntilExpiry(null);
        setIsExpiring(false);
        return;
      }

      const now = Date.now();
      const timeUntil = expiresAt - now;
      setTimeUntilExpiry(timeUntil);

      // Check if session is expiring soon
      if (timeUntil > 0 && timeUntil <= SESSION_WARNING_TIME) {
        setIsExpiring(true);
        if (!warningShownRef.current && onSessionExpiring) {
          warningShownRef.current = true;
          onSessionExpiring();
        }
      } else {
        setIsExpiring(false);
        warningShownRef.current = false;
      }

      // Session expired
      if (timeUntil <= 0) {
        setIsExpiring(false);
        if (onSessionExpired) {
          onSessionExpired();
        }
      }
    } catch (error) {
      logger.error('Error checking session', error);
    }
  }, [user, onSessionExpiring, onSessionExpired]);

  const refreshSession = useCallback(async () => {
    try {
      const { data: { session }, error } = await supabase.auth.refreshSession();
      if (error) throw error;
      
      // Reset warning state
      warningShownRef.current = false;
      setIsExpiring(false);
      
      // Recheck session
      await checkSession();
      
      return session;
    } catch (error) {
      logger.error('Error refreshing session', error);
      throw error;
    }
  }, [checkSession]);

  useEffect(() => {
    if (!user) {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
        checkIntervalRef.current = null;
      }
      return;
    }

    // Initial check
    checkSession();

    // Set up interval to check session periodically
    checkIntervalRef.current = setInterval(() => {
      checkSession();
    }, SESSION_CHECK_INTERVAL);

    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
        checkIntervalRef.current = null;
      }
    };
  }, [user, checkSession]);

  return {
    timeUntilExpiry,
    isExpiring,
    refreshSession,
    minutesUntilExpiry: timeUntilExpiry ? Math.ceil(timeUntilExpiry / 60000) : null,
  };
}

