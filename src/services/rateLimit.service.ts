/**
 * Rate limiting service for client-side throttling
 * Note: This provides client-side rate limiting. Server-side rate limiting should be implemented
 * in Supabase Edge Functions or database triggers for production security.
 */

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

interface RateLimitState {
  requests: number[];
  blockedUntil?: number;
}

const rateLimitStore = new Map<string, RateLimitState>();

/**
 * Default rate limit configurations
 */
export const RATE_LIMITS = {
  SWIPES: { maxRequests: 100, windowMs: 60 * 60 * 1000 }, // 100 swipes per hour
  MESSAGES: { maxRequests: 50, windowMs: 60 * 1000 }, // 50 messages per minute
  LOCATION_UPDATES: { maxRequests: 10, windowMs: 60 * 1000 }, // 10 updates per minute
} as const;

/**
 * Check if an action is rate limited
 * @param key - Unique identifier for the rate limit (e.g., userId + action type)
 * @param config - Rate limit configuration
 * @returns Object with allowed status and time until next request is allowed
 */
export function checkRateLimit(
  key: string,
  config: RateLimitConfig
): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const state = rateLimitStore.get(key) || { requests: [] };

  // Check if currently blocked
  if (state.blockedUntil && now < state.blockedUntil) {
    return {
      allowed: false,
      retryAfter: Math.ceil((state.blockedUntil - now) / 1000), // seconds
    };
  }

  // Clear old requests outside the window
  const windowStart = now - config.windowMs;
  const recentRequests = state.requests.filter((time) => time > windowStart);

  // Check if limit exceeded
  if (recentRequests.length >= config.maxRequests) {
    // Block for the remainder of the window
    const oldestRequest = Math.min(...recentRequests);
    const blockUntil = oldestRequest + config.windowMs;
    
    rateLimitStore.set(key, {
      requests: recentRequests,
      blockedUntil: blockUntil,
    });

    return {
      allowed: false,
      retryAfter: Math.ceil((blockUntil - now) / 1000), // seconds
    };
  }

  // Add current request
  recentRequests.push(now);
  rateLimitStore.set(key, {
    requests: recentRequests,
  });

  return { allowed: true };
}

/**
 * Get rate limit key for a user action
 */
export function getRateLimitKey(userId: string, action: 'swipe' | 'message' | 'location'): string {
  return `${userId}:${action}`;
}

/**
 * Clear rate limit for a key (useful for testing or manual reset)
 */
export function clearRateLimit(key: string): void {
  rateLimitStore.delete(key);
}

/**
 * Get current rate limit status
 */
export function getRateLimitStatus(
  key: string,
  config: RateLimitConfig
): {
  remaining: number;
  resetAt: number;
  isBlocked: boolean;
} {
  const now = Date.now();
  const state = rateLimitStore.get(key) || { requests: [] };
  const windowStart = now - config.windowMs;
  const recentRequests = state.requests.filter((time) => time > windowStart);

  const remaining = Math.max(0, config.maxRequests - recentRequests.length);
  const oldestRequest = recentRequests.length > 0 ? Math.min(...recentRequests) : now;
  const resetAt = oldestRequest + config.windowMs;

  return {
    remaining,
    resetAt,
    isBlocked: !!(state.blockedUntil && now < state.blockedUntil),
  };
}

