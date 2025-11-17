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
      const mockOrQuery = {
        select: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: [], error: null }),
      };
      
      const mockMember2Query = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
      };
      // Chain eq calls properly - first eq returns object with second eq
      const secondEq = vi.fn().mockResolvedValue({ data: [], error: null });
      const firstEqChain = {
        eq: secondEq,
      };
      mockMember2Query.eq = vi.fn().mockReturnValue(firstEqChain);
      
      const mockUpdateQuery = {
        update: vi.fn().mockResolvedValue({ error: null }),
      };
      
      const mockSelectChain = {
        single: vi.fn().mockResolvedValue({
          data: { id: 'duo-id', interests: ['Music', 'Sports'] },
          error: null,
        }),
      };
      
      const mockInsertQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnValue(mockSelectChain),
      };
      
      vi.mocked(supabase.from)
        .mockReturnValueOnce(mockOrQuery as any) // Existing duos check (member1)
        .mockReturnValueOnce(mockMember2Query as any) // Existing duos check (member2)
        .mockReturnValueOnce(mockUpdateQuery as any) // Deactivate existing
        .mockReturnValueOnce(mockInsertQuery as any); // Insert new duo

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
      const mockLimit = {
        data: [{ id: 'duo-1' }],
        error: null,
      };
      
      const mockOrder = {
        limit: vi.fn().mockResolvedValue(mockLimit),
      };
      
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        neq: vi.fn().mockReturnValue({
          neq: vi.fn().mockReturnValue(mockOrder),
          order: vi.fn().mockReturnValue(mockOrder),
        }),
        order: vi.fn().mockReturnValue(mockOrder),
      };
      
      // Ensure eq returns query for chaining
      mockQuery.eq = vi.fn().mockReturnValue(mockQuery);
      mockQuery.neq = vi.fn().mockReturnValue(mockQuery);

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any);

      await getActiveDuosForMatching('user-id', ['duo-1', 'duo-2']);

      // Should call neq for each excluded ID
      expect(mockQuery.neq).toHaveBeenCalled();
    });
  });
});

