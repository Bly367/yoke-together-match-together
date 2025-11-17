import { describe, it, expect } from 'vitest';
import { calculateProfileCompleteness, getCompletenessColor, getCompletenessVariant } from '../profileCompleteness';
import type { UserProfile } from '@/services/auth.service';

describe('profileCompleteness', () => {
  describe('calculateProfileCompleteness', () => {
    it('should return 0% for null profile', () => {
      const result = calculateProfileCompleteness(null);
      expect(result.percentage).toBe(0);
      expect(result.missingFields.length).toBeGreaterThan(0);
    });

    it('should return 100% for complete profile', () => {
      const profile: UserProfile = {
        id: 'user1',
        email: 'test@example.com',
        name: 'Test User',
        age: 30,
        bio: 'Test bio',
        photo_url: 'https://example.com/photo.jpg',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const result = calculateProfileCompleteness(profile);
      expect(result.percentage).toBe(100);
      expect(result.missingFields.length).toBe(0);
    });

    it('should calculate partial completeness', () => {
      const profile: UserProfile = {
        id: 'user1',
        email: 'test@example.com',
        name: 'Test User',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const result = calculateProfileCompleteness(profile);
      expect(result.percentage).toBeGreaterThan(0);
      expect(result.percentage).toBeLessThan(100);
      expect(result.missingFields.length).toBeGreaterThan(0);
    });

    it('should handle empty string values', () => {
      const profile: UserProfile = {
        id: 'user1',
        email: 'test@example.com',
        name: 'Test User',
        bio: '',
        photo_url: '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const result = calculateProfileCompleteness(profile);
      expect(result.missingFields).toContain('bio');
      expect(result.missingFields).toContain('photo_url');
    });
  });

  describe('getCompletenessColor', () => {
    it('should return green for 80%+', () => {
      expect(getCompletenessColor(80)).toBe('text-green-500');
      expect(getCompletenessColor(100)).toBe('text-green-500');
    });

    it('should return yellow for 60-79%', () => {
      expect(getCompletenessColor(60)).toBe('text-yellow-500');
      expect(getCompletenessColor(79)).toBe('text-yellow-500');
    });

    it('should return orange for 40-59%', () => {
      expect(getCompletenessColor(40)).toBe('text-orange-500');
      expect(getCompletenessColor(59)).toBe('text-orange-500');
    });

    it('should return red for <40%', () => {
      expect(getCompletenessColor(0)).toBe('text-red-500');
      expect(getCompletenessColor(39)).toBe('text-red-500');
    });
  });

  describe('getCompletenessVariant', () => {
    it('should return correct variant for percentage', () => {
      expect(getCompletenessVariant(80)).toBe('default');
      expect(getCompletenessVariant(60)).toBe('secondary');
      expect(getCompletenessVariant(40)).toBe('outline');
      expect(getCompletenessVariant(0)).toBe('destructive');
    });
  });
});

