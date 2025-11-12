import { describe, it, expect } from 'vitest';
import {
  isValidEmail,
  getPasswordStrength,
  calculateDistance,
  extractCoordinatesFromPoint,
  formatRelativeTime,
  formatTime,
  formatDate,
  parseInterests,
} from '../utils';

describe('utils', () => {
  describe('isValidEmail', () => {
    it('should validate correct email addresses', () => {
      expect(isValidEmail('test@example.com')).toBe(true);
      expect(isValidEmail('user.name@domain.co.uk')).toBe(true);
      expect(isValidEmail('user+tag@example.com')).toBe(true);
    });

    it('should reject invalid email addresses', () => {
      expect(isValidEmail('invalid')).toBe(false);
      expect(isValidEmail('@example.com')).toBe(false);
      expect(isValidEmail('test@')).toBe(false);
      expect(isValidEmail('test..test@example.com')).toBe(false);
      expect(isValidEmail('.test@example.com')).toBe(false);
      expect(isValidEmail('test@example.com.')).toBe(false);
    });

    it('should reject emails longer than 254 characters', () => {
      const longEmail = 'a'.repeat(250) + '@example.com';
      expect(isValidEmail(longEmail)).toBe(false);
    });
  });

  describe('getPasswordStrength', () => {
    it('should score weak passwords correctly', () => {
      const weak = getPasswordStrength('short');
      expect(weak.score).toBeLessThan(2);
    });

    it('should score strong passwords correctly', () => {
      const strong = getPasswordStrength('StrongP@ssw0rd123');
      expect(strong.score).toBeGreaterThanOrEqual(4);
    });

    it('should provide feedback for weak passwords', () => {
      const result = getPasswordStrength('weak');
      expect(result.feedback).toBeTruthy();
    });
  });

  describe('calculateDistance', () => {
    it('should calculate distance between two points', () => {
      // Distance between New York and Los Angeles (approximately 3944 km)
      const distance = calculateDistance(40.7128, -74.0060, 34.0522, -118.2437);
      expect(distance).toBeGreaterThan(3900);
      expect(distance).toBeLessThan(4000);
    });

    it('should return 0 for same coordinates', () => {
      const distance = calculateDistance(40.7128, -74.0060, 40.7128, -74.0060);
      expect(distance).toBe(0);
    });
  });

  describe('extractCoordinatesFromPoint', () => {
    it('should extract coordinates from GeoJSON format', () => {
      const point = { coordinates: [-74.0060, 40.7128] };
      const coords = extractCoordinatesFromPoint(point);
      expect(coords).toEqual({ longitude: -74.0060, latitude: 40.7128 });
    });

    it('should extract coordinates from PostGIS string format', () => {
      const point = 'POINT(-74.0060 40.7128)';
      const coords = extractCoordinatesFromPoint(point);
      expect(coords).toEqual({ longitude: -74.0060, latitude: 40.7128 });
    });

    it('should return null for invalid input', () => {
      expect(extractCoordinatesFromPoint(null)).toBeNull();
      expect(extractCoordinatesFromPoint('invalid')).toBeNull();
      expect(extractCoordinatesFromPoint({})).toBeNull();
    });
  });

  describe('formatRelativeTime', () => {
    it('should format recent times correctly', () => {
      const now = new Date();
      const recent = new Date(now.getTime() - 30 * 1000); // 30 seconds ago
      expect(formatRelativeTime(recent.toISOString())).toBe('just now');
    });

    it('should format minutes ago correctly', () => {
      const now = new Date();
      const minutesAgo = new Date(now.getTime() - 5 * 60 * 1000); // 5 minutes ago
      expect(formatRelativeTime(minutesAgo.toISOString())).toContain('m ago');
    });
  });

  describe('formatTime', () => {
    it('should format time correctly', () => {
      const date = new Date('2024-01-01T14:30:00Z');
      const formatted = formatTime(date.toISOString());
      expect(formatted).toBeTruthy();
      expect(formatted).toMatch(/\d{1,2}:\d{2}/);
    });
  });

  describe('formatDate', () => {
    it('should format date correctly', () => {
      const date = new Date('2024-01-01T14:30:00Z');
      const formatted = formatDate(date.toISOString());
      expect(formatted).toBeTruthy();
    });
  });

  describe('parseInterests', () => {
    it('should parse comma-separated interests', () => {
      const interests = parseInterests('music, sports, reading');
      expect(interests).toEqual(['Music', 'Sports', 'Reading']);
    });

    it('should deduplicate interests', () => {
      const interests = parseInterests('music, Music, MUSIC');
      expect(interests).toEqual(['Music']);
    });

    it('should handle empty strings', () => {
      expect(parseInterests('')).toEqual([]);
      expect(parseInterests('   ')).toEqual([]);
    });

    it('should normalize interests', () => {
      const interests = parseInterests('  MUSIC  ,  SPORTS  ,  READING  ');
      expect(interests).toEqual(['Music', 'Sports', 'Reading']);
    });
  });
});

