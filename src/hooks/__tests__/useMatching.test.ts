import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useMatches, useSwipe, useSwipedDuoIds, useMatchCheck, useUnmatch, useRenameMatch, useLeaveMatch, useUndoSwipe } from '../useMatching';
import * as matchingService from '@/services/matching.service';
import * as useDuos from '../useDuos';
import * as useAuth from '../useAuth';

vi.mock('@/services/matching.service');
vi.mock('../useDuos');
vi.mock('../useAuth');
vi.mock('@/contexts/ViewingContext', () => ({
  useViewing: () => ({ currentMatchId: null }),
}));
vi.mock('@/lib/notifications', () => ({
  shouldShowNotification: () => false,
  areNotificationsEnabled: () => false,
  notifyNewMatch: vi.fn(),
}));
vi.mock('@/lib/utils', () => ({
  getOtherDuo: vi.fn(),
  getMatchName: vi.fn(() => 'Test Duo'),
}));
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}));

describe('useMatching', () => {
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
    vi.mocked(useDuos.useUserDuos).mockReturnValue({
      data: [{ id: 'duo1' }] as any,
      isLoading: false,
    } as any);
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };

  describe('useMatches', () => {
    it('should return matches', async () => {
      const mockMatches = [{ id: 'match1', duo1_id: 'duo1', duo2_id: 'duo2' }];
      vi.mocked(matchingService.getUserMatches).mockResolvedValue(mockMatches as any);

      const { result } = renderHook(() => useMatches(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual(mockMatches);
    });
  });

  describe('useSwipe', () => {
    it('should swipe on duo', async () => {
      const mockSwipe = { id: 'swipe1', action: 'like' as const };
      vi.mocked(matchingService.swipeOnDuo).mockResolvedValue(mockSwipe as any);

      const { result } = renderHook(() => useSwipe(), { wrapper });

      result.current.mutate({ swiperDuoId: 'duo1', swipedDuoId: 'duo2', action: 'like' });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(matchingService.swipeOnDuo).toHaveBeenCalledWith('duo1', 'duo2', 'like');
    });
  });

  describe('useSwipedDuoIds', () => {
    it('should return swiped duo IDs', async () => {
      const mockIds = ['duo2', 'duo3'];
      vi.mocked(matchingService.getSwipedDuoIds).mockResolvedValue(mockIds);

      const { result } = renderHook(() => useSwipedDuoIds('duo1'), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual(mockIds);
    });
  });

  describe('useMatchCheck', () => {
    it('should check for match', async () => {
      const mockMatch = { id: 'match1', duo1_id: 'duo1', duo2_id: 'duo2' };
      vi.mocked(matchingService.checkMatch).mockResolvedValue(mockMatch as any);

      const { result } = renderHook(() => useMatchCheck('duo1', 'duo2'), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual(mockMatch);
    });
  });

  describe('useUnmatch', () => {
    it('should unmatch', async () => {
      vi.mocked(matchingService.unmatch).mockResolvedValue();

      const { result } = renderHook(() => useUnmatch(), { wrapper });

      result.current.mutate('match1');

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(matchingService.unmatch).toHaveBeenCalledWith('match1');
    });
  });

  describe('useRenameMatch', () => {
    it('should rename match', async () => {
      const mockMatch = { id: 'match1', name: 'New Name' };
      vi.mocked(matchingService.renameMatch).mockResolvedValue(mockMatch as any);

      const { result } = renderHook(() => useRenameMatch(), { wrapper });

      result.current.mutate({ matchId: 'match1', name: 'New Name' });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(matchingService.renameMatch).toHaveBeenCalledWith('match1', 'New Name');
    });
  });

  describe('useUndoSwipe', () => {
    it('should undo swipe', async () => {
      vi.mocked(matchingService.undoSwipe).mockResolvedValue();

      const { result } = renderHook(() => useUndoSwipe(), { wrapper });

      result.current.mutate({ swiperDuoId: 'duo1', swipedDuoId: 'duo2' });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(matchingService.undoSwipe).toHaveBeenCalledWith('duo1', 'duo2');
    });
  });
});

