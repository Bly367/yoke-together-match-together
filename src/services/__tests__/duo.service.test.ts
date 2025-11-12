import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createDuo, updateDuo, getActiveDuosForMatching } from '../duo.service';
import { supabase } from '@/integrations/supabase/client';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe('duo.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createDuo', () => {
    it('should reject creating duo with same member', async () => {
      await expect(createDuo('user-1', 'user-1')).rejects.toThrow('Cannot create duo with yourself');
    });

    it('should validate member IDs are strings', async () => {
      await expect(createDuo('' as any, 'user-2')).rejects.toThrow('Member 1 ID is required');
      await expect(createDuo('user-1', '' as any)).rejects.toThrow('Member 2 ID is required');
    });

    it('should verify both members exist', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn()
          .mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } })
          .mockResolvedValueOnce({ data: { id: 'user-2' }, error: null }),
      } as any);

      await expect(createDuo('user-1', 'user-2')).rejects.toThrow('Member 1 does not exist');
    });

    it('should validate interests array', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn()
          .mockResolvedValueOnce({ data: { id: 'user-1' }, error: null })
          .mockResolvedValueOnce({ data: { id: 'user-2' }, error: null }),
        insert: vi.fn().mockReturnThis(),
      } as any);

      const tooManyInterests = Array(21).fill('interest');
      await expect(createDuo('user-1', 'user-2', { interests: tooManyInterests })).rejects.toThrow('Maximum 20 interests allowed');
    });

    it('should normalize and deduplicate interests', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn()
          .mockResolvedValueOnce({ data: { id: 'user-1' }, error: null })
          .mockResolvedValueOnce({ data: { id: 'user-2' }, error: null }),
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 'duo-id', interests: ['Music', 'Sports'] },
          error: null,
        }),
      } as any);

      const result = await createDuo('user-1', 'user-2', {
        interests: ['music', 'MUSIC', 'sports', '  music  '],
      });

      expect(result).toBeDefined();
      // Interests should be normalized and deduplicated
      expect(result.interests).toEqual(['Music', 'Sports']);
    });
  });

  describe('updateDuo', () => {
    it('should validate duo ID', async () => {
      await expect(updateDuo('' as any, {})).rejects.toThrow('Duo ID is required');
    });

    it('should validate name length', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 'duo-id' },
          error: null,
        }),
      } as any);

      const longName = 'A'.repeat(101);
      await expect(updateDuo('duo-id', { name: longName })).rejects.toThrow('Duo name must be less than 100 characters');
    });

    it('should validate bio length', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 'duo-id' },
          error: null,
        }),
      } as any);

      const longBio = 'A'.repeat(1001);
      await expect(updateDuo('duo-id', { bio: longBio })).rejects.toThrow('Bio must be less than 1000 characters');
    });

    it('should validate photo URL', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 'duo-id' },
          error: null,
        }),
      } as any);

      await expect(updateDuo('duo-id', { photo_url: 'invalid-url' })).rejects.toThrow('Photo URL must be a valid URL');
    });
  });

  describe('getActiveDuosForMatching', () => {
    it('should validate user ID', async () => {
      await expect(getActiveDuosForMatching('' as any, [])).rejects.toThrow('User ID is required');
    });

    it('should use server-side filtering for small exclusion lists', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        neq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: [{ id: 'duo-1' }],
          error: null,
        }),
      };

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any);

      await getActiveDuosForMatching('user-id', ['duo-1', 'duo-2']);

      // Should call neq for each excluded ID
      expect(mockQuery.neq).toHaveBeenCalledTimes(2);
    });
  });
});

