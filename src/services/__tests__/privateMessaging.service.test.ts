import { describe, it, expect, vi, beforeEach } from 'vitest';
import { haveUsersMatched, createPrivateConversation, getPrivateConversation, getPrivateConversations, getPrivateMessages, sendPrivateMessage, editPrivateMessage, deletePrivateMessage, markPrivateMessagesAsRead, getUnreadPrivateMessageCount } from '../privateMessaging.service';
import { supabase } from '@/integrations/supabase/client';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    channel: vi.fn(),
    removeChannel: vi.fn(),
  },
}));

vi.mock('../moderation.service', () => ({
  validateMessage: vi.fn((content: string) => ({
    isValid: true,
    sanitized: content,
  })),
}));

vi.mock('../rateLimit.service', () => ({
  checkRateLimit: vi.fn(() => ({ allowed: true })),
  getRateLimitKey: vi.fn((userId: string) => `${userId}:message`),
  RATE_LIMITS: {
    MESSAGES: { maxRequests: 50, windowMs: 60000 },
  },
}));

describe('privateMessaging.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('haveUsersMatched', () => {
    it('should return true if users have matched', async () => {
      const mockDuos1 = [{ id: 'duo1' }];
      const mockDuos2 = [{ id: 'duo2' }];
      const mockMatches = [{ id: 'match1', duo1_id: 'duo1', duo2_id: 'duo2' }];

      vi.mocked(supabase.from).mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: mockDuos1, error: null }),
      } as any);

      vi.mocked(supabase.from).mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: mockDuos2, error: null }),
      } as any);

      const mockMatchQuery = {
        select: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: mockMatches, error: null }),
      };
      
      vi.mocked(supabase.from)
        .mockReturnValueOnce(mockMatchQuery as any) // First match query
        .mockReturnValueOnce(mockMatchQuery as any); // Second match query

      const result = await haveUsersMatched('user1', 'user2');
      expect(result).toBe(true);
    });

    it('should return false if users have not matched', async () => {
      const mockDuos1 = [{ id: 'duo1' }];
      const mockDuos2 = [{ id: 'duo2' }];

      vi.mocked(supabase.from).mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: mockDuos1, error: null }),
      } as any);

      vi.mocked(supabase.from).mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: mockDuos2, error: null }),
      } as any);

      const mockEmptyMatchQuery = {
        select: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: [], error: null }),
      };
      
      vi.mocked(supabase.from).mockReturnValueOnce(mockEmptyMatchQuery as any);

      const result = await haveUsersMatched('user1', 'user2');
      expect(result).toBe(false);
    });
  });

  describe('createPrivateConversation', () => {
    it('should create conversation if users have matched', async () => {
      const mockConversation = { id: 'conv1', user1_id: 'user1', user2_id: 'user2' };

      // Mock haveUsersMatched check
      vi.mocked(supabase.from).mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: [{ id: 'duo1' }], error: null }),
      } as any);

      vi.mocked(supabase.from).mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: [{ id: 'duo2' }], error: null }),
      } as any);

      const mockMatchQuery1 = {
        select: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: [{ id: 'match1' }], error: null }),
      };
      
      const mockMatchQuery2 = {
        select: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: [{ id: 'match1', duo1_id: 'duo1', duo2_id: 'duo2' }], error: null }),
      };
      
      vi.mocked(supabase.from)
        .mockReturnValueOnce(mockMatchQuery1 as any) // First match query
        .mockReturnValueOnce(mockMatchQuery2 as any); // Second match query

      // Mock existing conversation check
      vi.mocked(supabase.from).mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      } as any);

      // Mock conversation creation
      vi.mocked(supabase.from).mockReturnValueOnce({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockConversation, error: null }),
      } as any);

      const result = await createPrivateConversation('user1', 'user2');
      expect(result).toEqual(mockConversation);
    });

    it('should throw error if users have not matched', async () => {
      vi.mocked(supabase.from).mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: [], error: null }),
      } as any);

      await expect(createPrivateConversation('user1', 'user2')).rejects.toThrow('Users must have matched');
    });
  });

  describe('getPrivateConversation', () => {
    it('should return conversation with metadata', async () => {
      const mockConversation = { id: 'conv1', user1_id: 'user1', user2_id: 'user2' };
      const mockLastMessage = { id: 'msg1', content: 'Hello' };
      const mockRead = { last_read_at: new Date().toISOString() };

      vi.mocked(supabase.from).mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: mockConversation, error: null }),
      } as any);

      vi.mocked(supabase.from).mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: mockLastMessage, error: null }),
      } as any);

      vi.mocked(supabase.from).mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: mockRead, error: null }),
      } as any);

      vi.mocked(supabase.from).mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        neq: vi.fn().mockReturnThis(),
        is: vi.fn().mockResolvedValue({ count: 0 }),
      } as any);

      const result = await getPrivateConversation('conv1', 'user1');
      expect(result).toBeDefined();
    });
  });

  describe('sendPrivateMessage', () => {
    it('should send message with validation', async () => {
      const mockMessage = { id: 'msg1', content: 'Hello', sender_id: 'user1' };

      const mockQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockMessage, error: null }),
      };

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any);

      const result = await sendPrivateMessage('conv1', 'user1', 'user2', 'Hello');
      expect(result).toEqual(mockMessage);
    });
  });

  describe('editPrivateMessage', () => {
    it('should edit message', async () => {
      const mockMessage = { id: 'msg1', content: 'Updated', sender_id: 'user1' };

      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockMessage, error: null }),
      };

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any);

      const result = await editPrivateMessage('msg1', 'user1', 'Updated');
      expect(result).toEqual(mockMessage);
    });
  });

  describe('deletePrivateMessage', () => {
    it('should soft delete message', async () => {
      const mockMessage = { id: 'msg1', content: 'Deleted', deleted_at: new Date().toISOString() };

      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockMessage, error: null }),
      };

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any);

      const result = await deletePrivateMessage('msg1', 'user1');
      expect(result).toEqual(mockMessage);
    });
  });

  describe('markPrivateMessagesAsRead', () => {
    it('should mark messages as read', async () => {
      const mockUpsertQuery = {
        upsert: vi.fn().mockResolvedValue({ error: null }),
      };

      const mockSelectQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        neq: vi.fn().mockReturnThis(),
        is: vi.fn().mockResolvedValue({ data: [{ id: 'msg1' }], error: null }),
      };

      vi.mocked(supabase.from)
        .mockReturnValueOnce(mockUpsertQuery as any) // conversation_reads
        .mockReturnValueOnce(mockSelectQuery as any) // private_messages
        .mockReturnValueOnce(mockUpsertQuery as any); // private_message_reads

      await expect(markPrivateMessagesAsRead('conv1', 'user1')).resolves.not.toThrow();
    });
  });

  describe('getUnreadPrivateMessageCount', () => {
    it('should return unread count', async () => {
      const mockReadQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      };

      const mockCountQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        neq: vi.fn().mockReturnThis(),
        is: vi.fn().mockResolvedValue({ count: 5 }),
      };

      vi.mocked(supabase.from)
        .mockReturnValueOnce(mockReadQuery as any) // conversation_reads
        .mockReturnValueOnce(mockCountQuery as any); // private_messages

      const result = await getUnreadPrivateMessageCount('conv1', 'user1');
      expect(result).toBe(5);
    });
  });
});

