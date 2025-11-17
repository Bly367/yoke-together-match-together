import { describe, it, expect } from 'vitest';
import { preferenceMatchesGender, canDuosMatch, matchesAgePreference, matchesHeightPreference, matchesArrayPreference, matchesKidsPreference, calculateCompatibilityScore } from '../preferences';

describe('preferences', () => {
  describe('preferenceMatchesGender', () => {
    it('should match "both" preference with any gender', () => {
      expect(preferenceMatchesGender('both', 'man')).toBe(true);
      expect(preferenceMatchesGender('both', 'woman')).toBe(true);
      expect(preferenceMatchesGender('both', 'non-binary')).toBe(true);
    });

    it('should match "men" preference with man', () => {
      expect(preferenceMatchesGender('men', 'man')).toBe(true);
      expect(preferenceMatchesGender('men', 'woman')).toBe(false);
    });

    it('should match "women" preference with woman', () => {
      expect(preferenceMatchesGender('women', 'woman')).toBe(true);
      expect(preferenceMatchesGender('women', 'man')).toBe(false);
    });

    it('should return true if preference or gender is undefined', () => {
      expect(preferenceMatchesGender(undefined, 'man')).toBe(true);
      expect(preferenceMatchesGender('men', undefined)).toBe(true);
    });
  });

  describe('canDuosMatch', () => {
    it('should allow match if preferences match', () => {
      const duoA = {
        member1: { gender: 'man' as const, preference: 'women' as const },
        member2: { gender: 'man' as const, preference: 'women' as const },
      };
      const duoB = {
        member1: { gender: 'woman' as const, preference: 'men' as const },
        member2: { gender: 'woman' as const, preference: 'men' as const },
      };

      expect(canDuosMatch(duoA, duoB)).toBe(true);
    });

    it('should allow match if no preferences set', () => {
      const duoA = {
        member1: {},
        member2: {},
      };
      const duoB = {
        member1: {},
        member2: {},
      };

      expect(canDuosMatch(duoA, duoB)).toBe(true);
    });
  });

  describe('matchesAgePreference', () => {
    it('should match age within range', () => {
      expect(matchesAgePreference(30, 25, 35)).toBe(true);
      expect(matchesAgePreference(20, 25, 35)).toBe(false);
      expect(matchesAgePreference(40, 25, 35)).toBe(false);
    });

    it('should return true if age or preferences undefined', () => {
      expect(matchesAgePreference(undefined, 25, 35)).toBe(true);
      expect(matchesAgePreference(30, undefined, undefined)).toBe(true);
    });
  });

  describe('matchesHeightPreference', () => {
    it('should match height within range', () => {
      expect(matchesHeightPreference(70, 65, 75)).toBe(true);
      expect(matchesHeightPreference(60, 65, 75)).toBe(false);
      expect(matchesHeightPreference(80, 65, 75)).toBe(false);
    });
  });

  describe('matchesArrayPreference', () => {
    it('should match if value in preferences array', () => {
      expect(matchesArrayPreference('bachelor', ['bachelor', 'master'])).toBe(true);
      expect(matchesArrayPreference('phd', ['bachelor', 'master'])).toBe(false);
    });

    it('should return true if value or preferences undefined', () => {
      expect(matchesArrayPreference(undefined, ['bachelor'])).toBe(true);
      expect(matchesArrayPreference('bachelor', undefined)).toBe(true);
    });
  });

  describe('matchesKidsPreference', () => {
    it('should match kids preferences', () => {
      expect(matchesKidsPreference('yes', 'yes', 'yes', undefined)).toBe(true);
      expect(matchesKidsPreference('no', 'yes', 'yes', undefined)).toBe(false);
    });
  });

  describe('calculateCompatibilityScore', () => {
    it('should calculate compatibility score', () => {
      const userProfile = {
        id: 'user1',
        age: 30,
        height_inches: 70,
        education_level: 'bachelor',
      };
      const userInterests = ['hiking', 'reading'];
      const duo = {
        id: 'duo1',
        member1: {
          id: 'm1',
          name: 'Member 1',
          age: 28,
          height_inches: 68,
          education_level: 'bachelor',
        },
        member2: {
          id: 'm2',
          name: 'Member 2',
          age: 32,
        },
      };
      const duoInterests = ['hiking', 'cooking'];
      const preferences = {
        id: '1',
        user_id: 'user1',
        min_age: 25,
        max_age: 35,
        created_at: '',
        updated_at: '',
      };

      const result = calculateCompatibilityScore(userProfile, userInterests, duo, duoInterests, preferences);
      expect(result.total).toBeGreaterThanOrEqual(0);
      expect(result.total).toBeLessThanOrEqual(100);
      expect(result.reasons.length).toBeGreaterThan(0);
    });
  });
});

