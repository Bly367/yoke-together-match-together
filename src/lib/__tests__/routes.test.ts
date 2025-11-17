import { describe, it, expect } from 'vitest';
import { ROUTES, STATIC_ROUTES } from '../routes';

describe('routes', () => {
  describe('ROUTES', () => {
    it('should have all static routes defined', () => {
      expect(ROUTES.INDEX).toBe('/');
      expect(ROUTES.AUTH).toBe('/auth');
      expect(ROUTES.FORGOT_PASSWORD).toBe('/forgot-password');
      expect(ROUTES.RESET_PASSWORD).toBe('/reset-password');
      expect(ROUTES.PROFILE_SETUP).toBe('/profile-setup');
      expect(ROUTES.DUO_SETUP).toBe('/duo-setup');
      expect(ROUTES.DUO_REQUESTS).toBe('/duo-requests');
      expect(ROUTES.MATCHMAKING).toBe('/matchmaking');
      expect(ROUTES.MATCHES).toBe('/matches');
      expect(ROUTES.MESSAGES).toBe('/messages');
      expect(ROUTES.PROFILE).toBe('/profile');
      expect(ROUTES.PREFERENCES).toBe('/preferences');
      expect(ROUTES.NOTIFICATION_SETTINGS).toBe('/notification-settings');
      expect(ROUTES.NOT_FOUND).toBe('*');
    });

    it('should generate chat route correctly', () => {
      expect(ROUTES.CHAT('match123')).toBe('/chat/match123');
    });

    it('should throw error for invalid chat matchId', () => {
      expect(() => ROUTES.CHAT('')).toThrow('matchId must be a non-empty string');
      expect(() => ROUTES.CHAT(null as any)).toThrow();
    });

    it('should generate join duo route correctly', () => {
      expect(ROUTES.JOIN_DUO('user123')).toBe('/join-duo/user123');
    });

    it('should throw error for invalid join duo userId', () => {
      expect(() => ROUTES.JOIN_DUO('')).toThrow('userId must be a non-empty string');
      expect(() => ROUTES.JOIN_DUO(null as any)).toThrow();
    });

    it('should generate private chat route correctly', () => {
      expect(ROUTES.PRIVATE_CHAT('conv123')).toBe('/private-chat/conv123');
    });

    it('should throw error for invalid private chat conversationId', () => {
      expect(() => ROUTES.PRIVATE_CHAT('')).toThrow('conversationId must be a non-empty string');
      expect(() => ROUTES.PRIVATE_CHAT(null as any)).toThrow();
    });
  });

  describe('STATIC_ROUTES', () => {
    it('should contain all static routes', () => {
      expect(STATIC_ROUTES).toContain(ROUTES.INDEX);
      expect(STATIC_ROUTES).toContain(ROUTES.AUTH);
      expect(STATIC_ROUTES).toContain(ROUTES.MATCHMAKING);
    });
  });
});

