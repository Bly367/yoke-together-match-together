import { describe, it, expect, vi, beforeEach } from 'vitest';
import { signUp, signIn, updateProfile, findProfileByEmail, resetPassword, updatePassword } from '../auth.service';
import { supabase } from '@/integrations/supabase/client';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
      getUser: vi.fn(),
      signOut: vi.fn(),
      resetPasswordForEmail: vi.fn(),
      updateUser: vi.fn(),
    },
    from: vi.fn(),
  },
}));

describe('auth.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('signUp', () => {
    it('should validate email format', async () => {
      await expect(signUp('invalid', 'password123', 'Test User')).rejects.toThrow('Invalid email format');
    });

    it('should validate password length', async () => {
      await expect(signUp('test@example.com', 'short', 'Test User')).rejects.toThrow('Password must be at least 8 characters');
    });

    it('should validate name', async () => {
      await expect(signUp('test@example.com', 'password123', '')).rejects.toThrow('Name is required');
    });
  });

  describe('signIn', () => {
    it('should validate email format', async () => {
      await expect(signIn('invalid', 'password123')).rejects.toThrow('Invalid email format');
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

  describe('findProfileByEmail', () => {
    it('should find profile by email', async () => {
      const mockProfile = { id: 'user1', email: 'test@example.com', name: 'Test User' };
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockProfile, error: null }),
      } as any);

      const result = await findProfileByEmail('test@example.com');
      expect(result).toEqual(mockProfile);
    });

    it('should return null if not found', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
      } as any);

      const result = await findProfileByEmail('notfound@example.com');
      expect(result).toBeNull();
    });
  });

  describe('resetPassword', () => {
    it('should send reset password email', async () => {
      vi.mocked(supabase.auth.resetPasswordForEmail).mockResolvedValue({ error: null });

      await expect(resetPassword('test@example.com')).resolves.not.toThrow();
    });
  });

  describe('updatePassword', () => {
    it('should update password', async () => {
      vi.mocked(supabase.auth.updateUser).mockResolvedValue({ error: null });

      await expect(updatePassword('newpassword123')).resolves.not.toThrow();
    });
  });
});

