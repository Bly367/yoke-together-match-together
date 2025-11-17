import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useMessages, useSendMessage, useMarkMessagesAsRead, useUnreadCounts } from '../useChat';
import * as chatService from '@/services/chat.service';
import * as useAuth from '../useAuth';

vi.mock('@/services/chat.service');
vi.mock('../useAuth');
vi.mock('@/contexts/ViewingContext', () => ({
  useViewing: () => ({ currentChatId: null }),
}));
vi.mock('@/lib/notifications', () => ({
  shouldShowNotification: () => false,
  areNotificationsEnabled: () => false,
  notifyNewMessage: vi.fn(),
}));

describe('useChat', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    vi.clearAllMocks();
    vi.mocked(useAuth.useAuth).mockReturnValue({
      user: { id: 'user1' } as any,
      isLoading: false,
      error: null,
      isAuthenticated: true,
      signOut: vi.fn(),
      isSigningOut: false,
      signOutError: null,
    });
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };

  describe('useMessages', () => {
    it('should return messages', async () => {
      const mockMessages = {
        messages: [{ id: 'msg1', content: 'Hello' }],
        hasMore: false,
        total: 1,
      };
      vi.mocked(chatService.getMatchMessages).mockResolvedValue(mockMessages as any);

      const { result } = renderHook(() => useMessages('match1'), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toBeDefined();
    });
  });

  describe('useSendMessage', () => {
    it('should send message', async () => {
      const mockMessage = { id: 'msg1', content: 'Hello', sender_id: 'user1' };
      vi.mocked(chatService.sendMessage).mockResolvedValue(mockMessage as any);

      const { result } = renderHook(() => useSendMessage(), { wrapper });

      result.current.mutate({ matchId: 'match1', senderId: 'user1', content: 'Hello' });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(chatService.sendMessage).toHaveBeenCalledWith('match1', 'user1', 'Hello', undefined);
    });
  });

  describe('useMarkMessagesAsRead', () => {
    it('should mark messages as read', async () => {
      vi.mocked(chatService.markMessagesAsRead).mockResolvedValue();

      const { result } = renderHook(() => useMarkMessagesAsRead(), { wrapper });

      result.current.mutate({ matchId: 'match1', userId: 'user1', messageIds: ['msg1'] });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(chatService.markMessagesAsRead).toHaveBeenCalledWith('match1', 'user1', ['msg1']);
    });
  });

  describe('useUnreadCounts', () => {
    it('should return unread counts', async () => {
      const mockCounts = { match1: 5, match2: 3 };
      vi.mocked(chatService.getUnreadCounts).mockResolvedValue(mockCounts as any);

      const { result } = renderHook(() => useUnreadCounts(['match1', 'match2'], 'user1'), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual(mockCounts);
    });
  });
});

