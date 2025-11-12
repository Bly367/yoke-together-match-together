import { describe, it, expect, beforeEach } from 'vitest';
import {
  checkRateLimit,
  getRateLimitKey,
  clearRateLimit,
  getRateLimitStatus,
  RATE_LIMITS,
} from '../rateLimit.service';

describe('rateLimit.service', () => {
  beforeEach(() => {
    // Clear rate limits before each test
    clearRateLimit(getRateLimitKey('user1', 'swipe'));
    clearRateLimit(getRateLimitKey('user1', 'message'));
    clearRateLimit(getRateLimitKey('user1', 'location'));
  });

  describe('checkRateLimit', () => {
    it('should allow requests within limit', () => {
      const key = getRateLimitKey('user1', 'swipe');
      const config = { maxRequests: 5, windowMs: 60000 };

      for (let i = 0; i < 5; i++) {
        const result = checkRateLimit(key, config);
        expect(result.allowed).toBe(true);
      }
    });

    it('should block requests exceeding limit', () => {
      const key = getRateLimitKey('user1', 'swipe');
      const config = { maxRequests: 3, windowMs: 60000 };

      // Make 3 requests (should all pass)
      for (let i = 0; i < 3; i++) {
        const result = checkRateLimit(key, config);
        expect(result.allowed).toBe(true);
      }

      // 4th request should be blocked
      const result = checkRateLimit(key, config);
      expect(result.allowed).toBe(false);
      expect(result.retryAfter).toBeDefined();
    });

    it('should reset after window expires', async () => {
      const key = getRateLimitKey('user1', 'swipe');
      const config = { maxRequests: 2, windowMs: 100 }; // 100ms window

      // Make 2 requests
      checkRateLimit(key, config);
      checkRateLimit(key, config);

      // 3rd should be blocked
      let result = checkRateLimit(key, config);
      expect(result.allowed).toBe(false);

      // Wait for window to expire
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Should be allowed again
      result = checkRateLimit(key, config);
      expect(result.allowed).toBe(true);
    });
  });

  describe('getRateLimitKey', () => {
    it('should generate unique keys for different users and actions', () => {
      const key1 = getRateLimitKey('user1', 'swipe');
      const key2 = getRateLimitKey('user2', 'swipe');
      const key3 = getRateLimitKey('user1', 'message');

      expect(key1).not.toBe(key2);
      expect(key1).not.toBe(key3);
      expect(key2).not.toBe(key3);
    });
  });

  describe('getRateLimitStatus', () => {
    it('should return correct status', () => {
      const key = getRateLimitKey('user1', 'swipe');
      const config = { maxRequests: 10, windowMs: 60000 };

      // Make some requests
      checkRateLimit(key, config);
      checkRateLimit(key, config);

      const status = getRateLimitStatus(key, config);
      expect(status.remaining).toBe(8);
      expect(status.isBlocked).toBe(false);
    });
  });

  describe('RATE_LIMITS', () => {
    it('should have defined limits for all actions', () => {
      expect(RATE_LIMITS.SWIPES).toBeDefined();
      expect(RATE_LIMITS.MESSAGES).toBeDefined();
      expect(RATE_LIMITS.LOCATION_UPDATES).toBeDefined();
    });
  });
});

