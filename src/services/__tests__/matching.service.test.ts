import { describe, it, expect, vi, beforeEach } from 'vitest';
import { swipeOnDuo, getUserMatches, getSwipedDuoIds, undoSwipe, checkMatch, unmatch, renameMatch, leaveMatch } from '../matching.service';
import { supabase } from '@/integrations/supabase/client';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

vi.mock('../rateLimit.service', () => ({
  checkRateLimit: vi.fn(() => ({ allowed: true })),
  getRateLimitKey: vi.fn((userId: string) => `${userId}:swipe`),
  RATE_LIMITS: {
    SWIPES: { maxRequests: 100, windowMs: 3600000 },
  },
}));

describe('matching.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('swipeOnDuo', () => {
    it('should create a swipe record', async () => {
      const mockDuo = { member1_id: 'user1', member2_id: 'user2' };
      const mockSwipe = { id: 'swipe1', swiper_duo_id: 'duo1', swiped_duo_id: 'duo2', action: 'like' as const };

      vi.mocked(supabase.from).mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockDuo, error: null }),
      } as any);

      vi.mocked(supabase.from).mockReturnValueOnce({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockSwipe, error: null }),
      } as any);

      const result = await swipeOnDuo('duo1', 'duo2', 'like');
      expect(result).toEqual(mockSwipe);
    });

    it('should handle duplicate swipe by updating', async () => {
      const mockDuo = { member1_id: 'user1', member2_id: 'user2' };
      const mockSwipe = { id: 'swipe1', swiper_duo_id: 'duo1', swiped_duo_id: 'duo2', action: 'pass' as const };

      vi.mocked(supabase.from).mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockDuo, error: null }),
      } as any);

      vi.mocked(supabase.from).mockReturnValueOnce({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ 
          data: null, 
          error: { code: '23505', message: 'duplicate' } 
        }),
      } as any);

      vi.mocked(supabase.from).mockReturnValueOnce({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockSwipe, error: null }),
      } as any);

      const result = await swipeOnDuo('duo1', 'duo2', 'pass');
      expect(result).toEqual(mockSwipe);
    });
  });

  describe('getUserMatches', () => {
    it('should return empty array when user has no duos', async () => {
      vi.mocked(supabase.from).mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: [], error: null }),
      } as any);

      const result = await getUserMatches('user1');
      expect(result).toEqual([]);
    });

    it('should return matches for user duos', async () => {
      const mockDuos = [{ id: 'duo1' }];
      const mockMatches = [{ id: 'match1', duo1_id: 'duo1', duo2_id: 'duo2', is_active: true }];
      const mockMessages: any[] = [];
      const mockReads: any[] = [];

      vi.mocked(supabase.from).mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: mockDuos, error: null }),
      } as any);

      vi.mocked(supabase.from).mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockMatches, error: null }),
      } as any);

      vi.mocked(supabase.from).mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockMessages, error: null }),
      } as any);

      vi.mocked(supabase.from).mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: mockReads, error: null }),
      } as any);

      const result = await getUserMatches('user1');
      expect(result).toBeDefined();
    });
  });

  describe('getSwipedDuoIds', () => {
    it('should return swiped duo IDs', async () => {
      const mockSwipes = [{ swiped_duo_id: 'duo2' }, { swiped_duo_id: 'duo3' }];

      vi.mocked(supabase.from).mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: mockSwipes, error: null }),
      } as any);

      const result = await getSwipedDuoIds('duo1');
      expect(result).toEqual(['duo2', 'duo3']);
    });
  });

  describe('undoSwipe', () => {
    it('should delete swipe record', async () => {
      vi.mocked(supabase.from).mockReturnValueOnce({
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
      } as any);

      await expect(undoSwipe('duo1', 'duo2')).resolves.not.toThrow();
    });
  });

  describe('checkMatch', () => {
    it('should return match if found', async () => {
      const mockMatch = { id: 'match1', duo1_id: 'duo1', duo2_id: 'duo2', is_active: true };

      vi.mocked(supabase.from).mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: mockMatch, error: null }),
      } as any);

      const result = await checkMatch('duo1', 'duo2');
      expect(result).toEqual(mockMatch);
    });

    it('should return null if no match found', async () => {
      vi.mocked(supabase.from).mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
      } as any);

      const result = await checkMatch('duo1', 'duo2', 1, 10);
      expect(result).toBeNull();
    });
  });

  describe('unmatch', () => {
    it('should deactivate match', async () => {
      vi.mocked(supabase.from).mockReturnValueOnce({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      } as any);

      await expect(unmatch('match1')).resolves.not.toThrow();
    });
  });

  describe('renameMatch', () => {
    it('should rename match', async () => {
      const mockMatch = { id: 'match1', name: 'New Name' };

      vi.mocked(supabase.from).mockReturnValueOnce({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockMatch, error: null }),
      } as any);

      const result = await renameMatch('match1', 'New Name');
      expect(result).toEqual(mockMatch);
    });

    it('should reject names longer than 50 characters', async () => {
      const longName = 'A'.repeat(51);
      await expect(renameMatch('match1', longName)).rejects.toThrow('Chat name must be 50 characters or less');
    });
  });

  describe('leaveMatch', () => {
    it('should mark user as having left', async () => {
      const mockDuos = [{ id: 'duo1' }];
      const mockMatch = { duo1_id: 'duo1', duo2_id: 'duo2' };

      vi.mocked(supabase.from).mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: mockDuos, error: null }),
      } as any);

      vi.mocked(supabase.from).mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockMatch, error: null }),
      } as any);

      vi.mocked(supabase.from).mockReturnValueOnce({
        upsert: vi.fn().mockResolvedValue({ error: null }),
      } as any);

      await expect(leaveMatch('match1', 'user1')).resolves.not.toThrow();
    });
  });
});

