import { describe, it, expect, vi, beforeEach } from 'vitest';
import { signUp, signIn, updateProfile, validateEmail, validatePassword, validateName } from '../auth.service';
import { supabase } from '@/integrations/supabase/client';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
      getUser: vi.fn(),
      signOut: vi.fn(),
    },
    from: vi.fn(),
  },
}));

describe('auth.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('validateEmail', () => {
    it('should validate correct email addresses', () => {
      expect(() => validateEmail('test@example.com')).not.toThrow();
      expect(() => validateEmail('user.name@domain.co.uk')).not.toThrow();
    });

    it('should reject invalid email addresses', () => {
      expect(() => validateEmail('invalid')).toThrow('Invalid email format');
      expect(() => validateEmail('@example.com')).toThrow('Invalid email format');
      expect(() => validateEmail('test@')).toThrow('Invalid email format');
    });
  });

  describe('validatePassword', () => {
    it('should validate passwords with at least 8 characters', () => {
      expect(() => validatePassword('password123')).not.toThrow();
    });

    it('should reject passwords shorter than 8 characters', () => {
      expect(() => validatePassword('short')).toThrow('Password must be at least 8 characters long');
    });

    it('should reject passwords longer than 128 characters', () => {
      const longPassword = 'a'.repeat(129);
      expect(() => validatePassword(longPassword)).toThrow('Password must be less than 128 characters');
    });
  });

  describe('validateName', () => {
    it('should validate names with at least 2 characters', () => {
      expect(() => validateName('John')).not.toThrow();
    });

    it('should reject empty names', () => {
      expect(() => validateName('')).toThrow('Name is required');
      expect(() => validateName('   ')).toThrow('Name is required');
    });

    it('should reject names shorter than 2 characters', () => {
      expect(() => validateName('A')).toThrow('Name must be at least 2 characters long');
    });

    it('should reject names longer than 100 characters', () => {
      const longName = 'A'.repeat(101);
      expect(() => validateName(longName)).toThrow('Name must be less than 100 characters');
    });
  });

  describe('updateProfile', () => {
    it('should validate age range', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-id' } },
        error: null,
      });

      vi.mocked(supabase.from).mockReturnValue({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 'user-id', age: 25 },
          error: null,
        }),
      } as any);

      // Valid age
      await expect(updateProfile({ age: 25 })).resolves.toBeDefined();

      // Invalid age - too young
      await expect(updateProfile({ age: 17 })).rejects.toThrow('Age must be between 18 and 120');

      // Invalid age - too old
      await expect(updateProfile({ age: 121 })).rejects.toThrow('Age must be between 18 and 120');
    });

    it('should validate bio length', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-id' } },
        error: null,
      });

      const longBio = 'A'.repeat(501);
      await expect(updateProfile({ bio: longBio })).rejects.toThrow('Bio must be less than 500 characters');
    });

    it('should validate gender', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-id' } },
        error: null,
      });

      await expect(updateProfile({ gender: 'invalid' as any })).rejects.toThrow('Gender must be one of');
    });

    it('should validate preference', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-id' } },
        error: null,
      });

      await expect(updateProfile({ preference: 'invalid' as any })).rejects.toThrow('Preference must be one of');
    });
  });
});

