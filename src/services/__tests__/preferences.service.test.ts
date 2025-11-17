import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getUserPreferences, updateUserPreferences, getUserInterests, addUserInterest, removeUserInterest, getInterestCategories, getPredefinedInterests, getUserDemographics, updateUserDemographics, getMatchCountEstimate } from '../preferences.service';
import { supabase } from '@/integrations/supabase/client';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe('preferences.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getUserPreferences', () => {
    it('should return user preferences', async () => {
      const mockPrefs = { id: '1', user_id: 'user1', min_age: 25, max_age: 35 };

      vi.mocked(supabase.from).mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockPrefs, error: null }),
      } as any);

      const result = await getUserPreferences('user1');
      expect(result).toEqual(mockPrefs);
    });

    it('should return null if no preferences found', async () => {
      vi.mocked(supabase.from).mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
      } as any);

      const result = await getUserPreferences('user1');
      expect(result).toBeNull();
    });
  });

  describe('updateUserPreferences', () => {
    it('should update user preferences', async () => {
      const mockPrefs = { id: '1', user_id: 'user1', min_age: 25, max_age: 35 };

      vi.mocked(supabase.from).mockReturnValueOnce({
        upsert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockPrefs, error: null }),
      } as any);

      const result = await updateUserPreferences('user1', { min_age: 25, max_age: 35 });
      expect(result).toEqual(mockPrefs);
    });

    it('should reject invalid age range', async () => {
      await expect(updateUserPreferences('user1', { min_age: 35, max_age: 25 })).rejects.toThrow('Minimum age must be less than or equal to maximum age');
    });

    it('should reject invalid height range', async () => {
      await expect(updateUserPreferences('user1', { min_height_inches: 72, max_height_inches: 60 })).rejects.toThrow('Minimum height must be less than or equal to maximum height');
    });

    it('should reject invalid distance', async () => {
      await expect(updateUserPreferences('user1', { max_distance_miles: 0 })).rejects.toThrow('Maximum distance must be greater than 0');
    });
  });

  describe('getUserInterests', () => {
    it('should return user interests', async () => {
      const mockInterests = [{ id: '1', user_id: 'user1', interest: 'hiking' }];

      vi.mocked(supabase.from).mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockInterests, error: null }),
      } as any);

      const result = await getUserInterests('user1');
      expect(result).toEqual(mockInterests);
    });
  });

  describe('addUserInterest', () => {
    it('should add user interest', async () => {
      const mockInterest = { id: '1', user_id: 'user1', interest: 'hiking' };

      vi.mocked(supabase.from).mockReturnValueOnce({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockInterest, error: null }),
      } as any);

      const result = await addUserInterest('user1', 'hiking');
      expect(result).toEqual(mockInterest);
    });

    it('should reject duplicate interest', async () => {
      vi.mocked(supabase.from).mockReturnValueOnce({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: { code: '23505' } }),
      } as any);

      await expect(addUserInterest('user1', 'hiking')).rejects.toThrow('Interest already added');
    });
  });

  describe('removeUserInterest', () => {
    it('should remove user interest', async () => {
      vi.mocked(supabase.from).mockReturnValueOnce({
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
      } as any);

      await expect(removeUserInterest('user1', 'hiking')).resolves.not.toThrow();
    });
  });

  describe('getInterestCategories', () => {
    it('should return interest categories', async () => {
      const mockCategories = [{ id: '1', name: 'sports', display_name: 'Sports' }];

      vi.mocked(supabase.from).mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockCategories, error: null }),
      } as any);

      const result = await getInterestCategories();
      expect(result).toEqual(mockCategories);
    });
  });

  describe('getPredefinedInterests', () => {
    it('should return predefined interests', async () => {
      const mockInterests = [{ id: '1', name: 'hiking', display_name: 'Hiking' }];

      const mockOrder = {
        data: mockInterests,
        error: null,
      };
      
      const mockEq = {
        order: vi.fn().mockResolvedValue(mockOrder),
      };
      
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnValue(mockEq),
        order: vi.fn().mockResolvedValue(mockOrder),
      };

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any);

      const result = await getPredefinedInterests('category1');
      expect(result).toEqual(mockInterests);
      expect(mockQuery.eq).toHaveBeenCalledWith('category_id', 'category1');
    });

    it('should return all predefined interests if no category', async () => {
      const mockInterests = [{ id: '1', name: 'hiking', display_name: 'Hiking' }];

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockInterests, error: null }),
      };

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any);

      const result = await getPredefinedInterests();
      expect(result).toEqual(mockInterests);
    });
  });

  describe('getUserDemographics', () => {
    it('should return user demographics', async () => {
      const mockDemographics = { height_inches: 70, education_level: 'bachelor' };

      vi.mocked(supabase.from).mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockDemographics, error: null }),
      } as any);

      const result = await getUserDemographics('user1');
      expect(result).toEqual(mockDemographics);
    });

    it('should return null if not found', async () => {
      vi.mocked(supabase.from).mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
      } as any);

      const result = await getUserDemographics('user1');
      expect(result).toBeNull();
    });
  });

  describe('updateUserDemographics', () => {
    it('should update user demographics', async () => {
      vi.mocked(supabase.from).mockReturnValueOnce({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      } as any);

      await expect(updateUserDemographics('user1', { height_inches: 70 })).resolves.not.toThrow();
    });
  });

  describe('getMatchCountEstimate', () => {
    it('should return match count estimate', async () => {
      const mockPrefs = { id: '1', user_id: 'user1', min_age: 25, max_age: 35 };
      
      // Mock getUserPreferences call
      const mockPrefsQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockPrefs, error: null }),
      };

      // Mock the count query - chain methods properly
      const mockIn = {
        count: 10,
        error: null,
      };
      
      const mockLte = {
        in: vi.fn().mockResolvedValue(mockIn),
      };
      
      const mockGte = {
        lte: vi.fn().mockReturnValue(mockLte),
        in: vi.fn().mockResolvedValue(mockIn),
      };
      
      const mockCountQuery = {
        select: vi.fn().mockReturnThis(),
        neq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnValue(mockGte),
        lte: vi.fn().mockReturnValue(mockLte),
        in: vi.fn().mockResolvedValue(mockIn),
      };
      
      // Ensure chaining works
      mockCountQuery.neq = vi.fn().mockReturnValue(mockCountQuery);
      
      vi.mocked(supabase.from)
        .mockReturnValueOnce(mockPrefsQuery as any) // getUserPreferences
        .mockReturnValueOnce(mockCountQuery as any); // Count query

      const result = await getMatchCountEstimate('user1');
      expect(result).toBe(10);
    });

    it('should return 0 if no preferences', async () => {
      // Mock getUserPreferences to return null
      vi.mocked(supabase.from).mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
      } as any);

      const result = await getMatchCountEstimate('user1');
      expect(result).toBe(0);
    });
  });
});

