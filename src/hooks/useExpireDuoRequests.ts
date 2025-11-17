import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from './useAuth';
import { expireOldRequests } from '@/services/duoRequest.service';
import { logger } from '@/lib/logger';

/**
 * Configuration for duo request expiration checks
 */
const EXPIRATION_CHECK_INTERVAL = 60 * 60 * 1000; // Check every hour
const INITIAL_CHECK_DELAY = 5 * 60 * 1000; // Wait 5 minutes after mount before first check

/**
 * Hook to periodically expire old duo requests
 * Runs the expiration check on an interval when user is authenticated
 * 
 * @param enabled - Whether expiration checks are enabled (default: true)
 * @param intervalMs - Custom check interval in milliseconds (default: 1 hour)
 * @returns Object with expiration state and manual trigger function
 */
export function useExpireDuoRequests(
  enabled: boolean = true,
  intervalMs: number = EXPIRATION_CHECK_INTERVAL
) {
  const { user } = useAuth();
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const initialCheckTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isCheckingRef = useRef(false);

  const expireRequests = useCallback(async () => {
    // Prevent concurrent expiration checks
    if (isCheckingRef.current || !user) {
      return;
    }

    isCheckingRef.current = true;
    try {
      await expireOldRequests();
    } catch (error) {
      // Silently handle errors - expiration is a background task
      // Log to console for debugging but don't disrupt user experience
      logger.error('Error expiring duo requests', error);
    } finally {
      isCheckingRef.current = false;
    }
  }, [user]);

  useEffect(() => {
    if (!enabled || !user) {
      // Clean up intervals if disabled or user logged out
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
        checkIntervalRef.current = null;
      }
      if (initialCheckTimeoutRef.current) {
        clearTimeout(initialCheckTimeoutRef.current);
        initialCheckTimeoutRef.current = null;
      }
      return;
    }

    // Schedule initial check after a delay (to avoid immediate check on mount)
    initialCheckTimeoutRef.current = setTimeout(() => {
      expireRequests();
    }, INITIAL_CHECK_DELAY);

    // Set up interval for periodic checks
    checkIntervalRef.current = setInterval(() => {
      expireRequests();
    }, intervalMs);

    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
        checkIntervalRef.current = null;
      }
      if (initialCheckTimeoutRef.current) {
        clearTimeout(initialCheckTimeoutRef.current);
        initialCheckTimeoutRef.current = null;
      }
    };
  }, [enabled, user, intervalMs, expireRequests]);

  return {
    /**
     * Manually trigger expiration check
     */
    triggerExpiration: expireRequests,
  };
}

