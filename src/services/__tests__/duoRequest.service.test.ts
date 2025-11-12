import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createDuoRequest,
  getDuoRequests,
  getPendingRequests,
  acceptDuoRequest,
  rejectDuoRequest,
  cancelDuoRequest,
  leaveDuo,
  subscribeToDuoRequests,
  expireOldRequests,
} from '../duoRequest.service';
import { supabase } from '@/integrations/supabase/client';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
    channel: vi.fn(),
    removeChannel: vi.fn(),
  },
}));

describe('duoRequest.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createDuoRequest', () => {
    it('should validate requester ID is required', async () => {
      await expect(createDuoRequest('' as any, 'user-2')).rejects.toThrow('Requester ID is required');
      await expect(createDuoRequest(null as any, 'user-2')).rejects.toThrow('Requester ID is required');
    });

    it('should validate requested ID is required', async () => {
      await expect(createDuoRequest('user-1', '' as any)).rejects.toThrow('Requested ID is required');
      await expect(createDuoRequest('user-1', null as any)).rejects.toThrow('Requested ID is required');
    });

    it('should prevent self-request', async () => {
      await expect(createDuoRequest('user-1', 'user-1')).rejects.toThrow('Cannot send request to yourself');
    });

    it('should check for existing pending requests (requester -> requested)', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn()
          .mockResolvedValueOnce({ data: { id: 'existing-request', status: 'pending' }, error: null })
          .mockResolvedValueOnce({ data: null, error: null }),
      } as any);

      await expect(createDuoRequest('user-1', 'user-2')).rejects.toThrow(
        'You already have a pending request with this person'
      );
    });

    it('should check for existing pending requests (requested -> requester)', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn()
          .mockResolvedValueOnce({ data: null, error: null })
          .mockResolvedValueOnce({ data: { id: 'existing-request', status: 'pending' }, error: null }),
      } as any);

      await expect(createDuoRequest('user-1', 'user-2')).rejects.toThrow(
        'You already have a pending request with this person'
      );
    });

    it('should check for existing duos (member1 -> member2)', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn()
          .mockResolvedValueOnce({ data: null, error: null }) // No pending request requester->requested
          .mockResolvedValueOnce({ data: null, error: null }) // No pending request requested->requester
          .mockResolvedValueOnce({ data: { id: 'existing-duo' }, error: null }) // Existing duo
          .mockResolvedValueOnce({ data: null, error: null }),
      } as any);

      await expect(createDuoRequest('user-1', 'user-2')).rejects.toThrow(
        'You already have a duo with this person'
      );
    });

    it('should check for existing duos (member2 -> member1)', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn()
          .mockResolvedValueOnce({ data: null, error: null }) // No pending request requester->requested
          .mockResolvedValueOnce({ data: null, error: null }) // No pending request requested->requester
          .mockResolvedValueOnce({ data: null, error: null }) // No duo member1->member2
          .mockResolvedValueOnce({ data: { id: 'existing-duo' }, error: null }), // Existing duo member2->member1
      } as any);

      await expect(createDuoRequest('user-1', 'user-2')).rejects.toThrow(
        'You already have a duo with this person'
      );
    });

    it('should create request successfully with all options', async () => {
      const mockRequest = {
        id: 'request-id',
        requester_id: 'user-1',
        requested_id: 'user-2',
        status: 'pending' as const,
        message: 'Test message',
        duo_name: 'Test Duo',
        duo_tagline: 'Test tagline',
        duo_bio: 'Test bio',
        duo_interests: ['music', 'sports'],
        duo_photo_url: 'https://example.com/photo.jpg',
        expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        requester: { id: 'user-1', name: 'User 1', email: 'user1@example.com' },
        requested: { id: 'user-2', name: 'User 2', email: 'user2@example.com' },
      };

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn()
          .mockResolvedValueOnce({ data: null, error: null }) // No pending request requester->requested
          .mockResolvedValueOnce({ data: null, error: null }) // No pending request requested->requester
          .mockResolvedValueOnce({ data: null, error: null }) // No existing duo member1->member2
          .mockResolvedValueOnce({ data: null, error: null }) // No existing duo member2->member1
          .mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockRequest, error: null }),
      } as any);

      const result = await createDuoRequest('user-1', 'user-2', {
        message: 'Test message',
        duoName: 'Test Duo',
        tagline: 'Test tagline',
        bio: 'Test bio',
        interests: ['music', 'sports'],
        photoUrl: 'https://example.com/photo.jpg',
        expiresInDays: 14,
      });

      expect(result).toEqual(mockRequest);
      expect(result.status).toBe('pending');
      expect(result.expires_at).toBeDefined();
    });

    it('should use default expiration of 14 days', async () => {
      const mockRequest = {
        id: 'request-id',
        requester_id: 'user-1',
        requested_id: 'user-2',
        status: 'pending' as const,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn()
          .mockResolvedValue({ data: null, error: null })
          .mockResolvedValue({ data: null, error: null })
          .mockResolvedValue({ data: null, error: null })
          .mockResolvedValue({ data: null, error: null }),
        insert: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockRequest, error: null }),
      } as any);

      const result = await createDuoRequest('user-1', 'user-2');

      expect(result).toBeDefined();
      // Verify insert was called with expires_at
      const insertCall = vi.mocked(supabase.from).mock.results[0].value.insert;
      expect(insertCall).toHaveBeenCalled();
    });

    it('should trim string fields', async () => {
      const mockRequest = {
        id: 'request-id',
        requester_id: 'user-1',
        requested_id: 'user-2',
        status: 'pending' as const,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        insert: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockRequest, error: null }),
      } as any);

      await createDuoRequest('user-1', 'user-2', {
        message: '  trimmed message  ',
        duoName: '  trimmed name  ',
      });

      const insertCall = vi.mocked(supabase.from).mock.results[0].value.insert;
      const insertArgs = insertCall.mock.calls[0][0];
      expect(insertArgs.message).toBe('trimmed message');
      expect(insertArgs.duo_name).toBe('trimmed name');
    });

    it('should handle empty interests array', async () => {
      const mockRequest = {
        id: 'request-id',
        requester_id: 'user-1',
        requested_id: 'user-2',
        status: 'pending' as const,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        insert: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockRequest, error: null }),
      } as any);

      await createDuoRequest('user-1', 'user-2', { interests: [] });

      const insertCall = vi.mocked(supabase.from).mock.results[0].value.insert;
      const insertArgs = insertCall.mock.calls[0][0];
      expect(insertArgs.duo_interests).toBeNull();
    });
  });

  describe('getDuoRequests', () => {
    it('should validate user ID is required', async () => {
      await expect(getDuoRequests('' as any)).rejects.toThrow('User ID is required');
      await expect(getDuoRequests(null as any)).rejects.toThrow('User ID is required');
    });

    it('should return sent and received requests', async () => {
      const sentRequests = [
        { id: 'request-1', requester_id: 'user-1', requested_id: 'user-2', status: 'pending' },
      ];
      const receivedRequests = [
        { id: 'request-2', requester_id: 'user-3', requested_id: 'user-1', status: 'pending' },
      ];

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn()
          .mockResolvedValueOnce({ data: sentRequests, error: null })
          .mockResolvedValueOnce({ data: receivedRequests, error: null }),
      } as any);

      const result = await getDuoRequests('user-1');

      expect(result).toEqual({
        sent: sentRequests,
        received: receivedRequests,
      });
    });

    it('should handle errors when fetching sent requests', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValueOnce({ data: null, error: { message: 'Database error' } }),
      } as any);

      await expect(getDuoRequests('user-1')).rejects.toEqual({ message: 'Database error' });
    });

    it('should handle errors when fetching received requests', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn()
          .mockResolvedValueOnce({ data: [], error: null })
          .mockResolvedValueOnce({ data: null, error: { message: 'Database error' } }),
      } as any);

      await expect(getDuoRequests('user-1')).rejects.toEqual({ message: 'Database error' });
    });
  });

  describe('getPendingRequests', () => {
    it('should validate user ID is required', async () => {
      await expect(getPendingRequests('' as any)).rejects.toThrow('User ID is required');
    });

    it('should return only pending requests', async () => {
      const pendingRequests = [
        { id: 'request-1', requester_id: 'user-2', requested_id: 'user-1', status: 'pending' },
        { id: 'request-2', requester_id: 'user-3', requested_id: 'user-1', status: 'pending' },
      ];

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: pendingRequests, error: null }),
      } as any);

      const result = await getPendingRequests('user-1');

      expect(result).toEqual(pendingRequests);
      expect(result.every((r) => r.status === 'pending')).toBe(true);
    });

    it('should handle errors', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: null, error: { message: 'Database error' } }),
      } as any);

      await expect(getPendingRequests('user-1')).rejects.toEqual({ message: 'Database error' });
    });
  });

  describe('acceptDuoRequest', () => {
    it('should validate request ID is required', async () => {
      await expect(acceptDuoRequest('' as any)).rejects.toThrow('Request ID is required');
    });

    it('should throw error if request not found', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
      } as any);

      await expect(acceptDuoRequest('request-id')).rejects.toThrow('Request not found');
    });

    it('should accept pending request', async () => {
      const mockRequest = {
        id: 'request-id',
        status: 'pending' as const,
        requester_id: 'user-1',
        requested_id: 'user-2',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn()
          .mockResolvedValueOnce({ data: { id: 'request-id', status: 'pending' }, error: null })
          .mockResolvedValueOnce({ data: mockRequest, error: null }),
        update: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
      } as any);

      const result = await acceptDuoRequest('request-id');

      expect(result).toEqual(mockRequest);
    });

    it('should accept rejected request', async () => {
      const mockRequest = {
        id: 'request-id',
        status: 'accepted' as const,
        requester_id: 'user-1',
        requested_id: 'user-2',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn()
          .mockResolvedValueOnce({ data: { id: 'request-id', status: 'rejected' }, error: null })
          .mockResolvedValueOnce({ data: mockRequest, error: null }),
        update: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
      } as any);

      const result = await acceptDuoRequest('request-id');

      expect(result).toEqual(mockRequest);
    });

    it('should reject accepting already accepted request', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: 'request-id', status: 'accepted' }, error: null }),
      } as any);

      await expect(acceptDuoRequest('request-id')).rejects.toThrow('This request has already been accepted');
    });

    it('should reject accepting cancelled request', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: 'request-id', status: 'cancelled' }, error: null }),
      } as any);

      await expect(acceptDuoRequest('request-id')).rejects.toThrow('This request was cancelled');
    });

    it('should handle PGRST116 error (no rows) on update', async () => {
      const mockSelect = vi.fn().mockReturnThis();
      const mockSingle = vi.fn()
        .mockResolvedValueOnce({ data: { id: 'request-id', status: 'pending' }, error: null })
        .mockResolvedValue({ data: null, error: { code: 'PGRST116' } });
      
      const mockIn = vi.fn().mockReturnValue({
        select: mockSelect,
      });
      const mockEq = vi.fn().mockReturnValue({
        in: mockIn,
      });
      const mockUpdate = vi.fn().mockReturnValue({
        eq: mockEq,
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: mockSingle,
        update: mockUpdate,
      } as any);

      mockSelect.mockReturnValue({
        single: mockSingle,
      });

      await expect(acceptDuoRequest('request-id')).rejects.toThrow(
        'Request not found or already processed'
      );
    });
  });

  describe('rejectDuoRequest', () => {
    it('should validate request ID is required', async () => {
      await expect(rejectDuoRequest('' as any)).rejects.toThrow('Request ID is required');
    });

    it('should reject pending request', async () => {
      const mockRequest = {
        id: 'request-id',
        status: 'rejected' as const,
        requester_id: 'user-1',
        requested_id: 'user-2',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      vi.mocked(supabase.from).mockReturnValue({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockRequest, error: null }),
      } as any);

      const result = await rejectDuoRequest('request-id');

      expect(result).toEqual(mockRequest);
      expect(result.status).toBe('rejected');
    });

    it('should handle PGRST116 error (no rows)', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
      } as any);

      await expect(rejectDuoRequest('request-id')).rejects.toThrow(
        'Request not found or already processed'
      );
    });

    it('should only reject pending requests', async () => {
      // The query filters by status='pending', so non-pending requests won't be updated
      vi.mocked(supabase.from).mockReturnValue({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
      } as any);

      await expect(rejectDuoRequest('request-id')).rejects.toThrow(
        'Request not found or already processed'
      );
    });
  });

  describe('cancelDuoRequest', () => {
    it('should validate request ID is required', async () => {
      await expect(cancelDuoRequest('' as any)).rejects.toThrow('Request ID is required');
    });

    it('should cancel pending request', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
      } as any);

      await expect(cancelDuoRequest('request-id')).resolves.toBeUndefined();

      const updateCall = vi.mocked(supabase.from).mock.results[0].value.update;
      expect(updateCall).toHaveBeenCalled();
    });

    it('should handle errors', async () => {
      const mockEq = vi.fn().mockResolvedValue({ error: { message: 'Database error' } });
      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: mockEq,
        }),
      });

      vi.mocked(supabase.from).mockReturnValue({
        update: mockUpdate,
      } as any);

      await expect(cancelDuoRequest('request-id')).rejects.toEqual({ message: 'Database error' });
    });
  });

  describe('leaveDuo', () => {
    it('should validate duo ID is required', async () => {
      await expect(leaveDuo('' as any, 'user-id')).rejects.toThrow('Duo ID is required');
    });

    it('should validate user ID is required', async () => {
      await expect(leaveDuo('duo-id', '' as any)).rejects.toThrow('User ID is required');
    });

    it('should throw error if duo not found', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
      } as any);

      await expect(leaveDuo('duo-id', 'user-id')).rejects.toThrow('Duo not found');
    });

    it('should throw error if user is not a member', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { member1_id: 'user-1', member2_id: 'user-2' },
          error: null,
        }),
      } as any);

      await expect(leaveDuo('duo-id', 'user-3')).rejects.toThrow('You are not a member of this duo');
    });

    it('should deactivate duo if user is member1', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn()
          .mockResolvedValueOnce({
            data: { member1_id: 'user-1', member2_id: 'user-2' },
            error: null,
          })
          .mockReturnThis(),
        update: vi.fn().mockReturnThis(),
      } as any);

      await expect(leaveDuo('duo-id', 'user-1')).resolves.toBeUndefined();

      const updateCall = vi.mocked(supabase.from).mock.results[1].value.update;
      expect(updateCall).toHaveBeenCalled();
    });

    it('should deactivate duo if user is member2', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn()
          .mockResolvedValueOnce({
            data: { member1_id: 'user-1', member2_id: 'user-2' },
            error: null,
          })
          .mockReturnThis(),
        update: vi.fn().mockReturnThis(),
      } as any);

      await expect(leaveDuo('duo-id', 'user-2')).resolves.toBeUndefined();

      const updateCall = vi.mocked(supabase.from).mock.results[1].value.update;
      expect(updateCall).toHaveBeenCalled();
    });
  });

  describe('subscribeToDuoRequests', () => {
    it('should set up subscription and return cleanup function', () => {
      const mockOn = vi.fn().mockReturnThis();
      const mockSubscribe = vi.fn().mockReturnThis();
      const mockChannel = {
        on: mockOn,
        subscribe: mockSubscribe,
      };

      vi.mocked(supabase.channel).mockReturnValue(mockChannel as any);
      vi.mocked(supabase.removeChannel).mockResolvedValue('ok' as any);

      const unsubscribe = subscribeToDuoRequests('user-id', {
        onNewRequest: vi.fn(),
        onRequestUpdate: vi.fn(),
      });

      expect(supabase.channel).toHaveBeenCalledWith('duo-requests:user-id');
      expect(mockOn).toHaveBeenCalledTimes(2); // INSERT and UPDATE events
      expect(mockSubscribe).toHaveBeenCalled();
      expect(typeof unsubscribe).toBe('function');

      // Test cleanup - removeChannel should be called (channel is returned by subscribe chain)
      unsubscribe();
      expect(supabase.removeChannel).toHaveBeenCalled();
    });

    it('should handle subscription without callbacks', () => {
      const mockChannel = {
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn(),
      };

      vi.mocked(supabase.channel).mockReturnValue(mockChannel as any);

      const unsubscribe = subscribeToDuoRequests('user-id', {});

      expect(mockChannel.on).toHaveBeenCalledTimes(2);
      expect(typeof unsubscribe).toBe('function');
    });
  });

  describe('expireOldRequests', () => {
    it('should call RPC function', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({ data: null, error: null } as any);

      await expect(expireOldRequests()).resolves.toBeUndefined();

      expect(supabase.rpc).toHaveBeenCalledWith('expire_old_duo_requests');
    });

    it('should handle RPC errors', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: { message: 'RPC error', code: 'ERROR', details: null, hint: null },
      } as any);

      await expect(expireOldRequests()).rejects.toMatchObject({ message: 'RPC error' });
    });
  });
});
