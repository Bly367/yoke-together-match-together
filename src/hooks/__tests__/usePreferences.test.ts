import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useUserPreferences, useUpdatePreferences, useUserInterests, useAddInterest, useRemoveInterest, useInterestCategories, usePredefinedInterests, useUserDemographics, useUpdateDemographics, useMatchCountEstimate } from '../usePreferences';
import * as preferencesService from '@/services/preferences.service';
import * as useAuth from '../useAuth';

vi.mock('@/services/preferences.service');
vi.mock('../useAuth');

describe('usePreferences', () => {
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

  describe('useUserPreferences', () => {
    it('should return user preferences', async () => {
      const mockPrefs = { id: '1', user_id: 'user1', min_age: 25, max_age: 35 };
      vi.mocked(preferencesService.getUserPreferences).mockResolvedValue(mockPrefs as any);

      const { result } = renderHook(() => useUserPreferences('user1'), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual(mockPrefs);
    });
  });

  describe('useUpdatePreferences', () => {
    it('should update preferences', async () => {
      const mockPrefs = { id: '1', user_id: 'user1', min_age: 25, max_age: 35 };
      vi.mocked(preferencesService.updateUserPreferences).mockResolvedValue(mockPrefs as any);

      const { result } = renderHook(() => useUpdatePreferences(), { wrapper });

      result.current.mutate({ userId: 'user1', preferences: { min_age: 25, max_age: 35 } });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(preferencesService.updateUserPreferences).toHaveBeenCalledWith('user1', { min_age: 25, max_age: 35 });
    });
  });

  describe('useUserInterests', () => {
    it('should return user interests', async () => {
      const mockInterests = [{ id: '1', user_id: 'user1', interest: 'hiking' }];
      vi.mocked(preferencesService.getUserInterests).mockResolvedValue(mockInterests as any);

      const { result } = renderHook(() => useUserInterests('user1'), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual(mockInterests);
    });
  });

  describe('useAddInterest', () => {
    it('should add interest', async () => {
      const mockInterest = { id: '1', user_id: 'user1', interest: 'hiking' };
      vi.mocked(preferencesService.addUserInterest).mockResolvedValue(mockInterest as any);

      const { result } = renderHook(() => useAddInterest(), { wrapper });

      result.current.mutate({ userId: 'user1', interest: 'hiking' });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(preferencesService.addUserInterest).toHaveBeenCalledWith('user1', 'hiking');
    });
  });

  describe('useRemoveInterest', () => {
    it('should remove interest', async () => {
      vi.mocked(preferencesService.removeUserInterest).mockResolvedValue();

      const { result } = renderHook(() => useRemoveInterest(), { wrapper });

      result.current.mutate({ userId: 'user1', interest: 'hiking' });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(preferencesService.removeUserInterest).toHaveBeenCalledWith('user1', 'hiking');
    });
  });

  describe('useInterestCategories', () => {
    it('should return interest categories', async () => {
      const mockCategories = [{ id: '1', name: 'sports', display_name: 'Sports' }];
      vi.mocked(preferencesService.getInterestCategories).mockResolvedValue(mockCategories as any);

      const { result } = renderHook(() => useInterestCategories(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual(mockCategories);
    });
  });

  describe('usePredefinedInterests', () => {
    it('should return predefined interests', async () => {
      const mockInterests = [{ id: '1', name: 'hiking', display_name: 'Hiking' }];
      vi.mocked(preferencesService.getPredefinedInterests).mockResolvedValue(mockInterests as any);

      const { result } = renderHook(() => usePredefinedInterests('category1'), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual(mockInterests);
    });
  });

  describe('useUserDemographics', () => {
    it('should return user demographics', async () => {
      const mockDemographics = { height_inches: 70, education_level: 'bachelor' };
      vi.mocked(preferencesService.getUserDemographics).mockResolvedValue(mockDemographics as any);

      const { result } = renderHook(() => useUserDemographics('user1'), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual(mockDemographics);
    });
  });

  describe('useUpdateDemographics', () => {
    it('should update demographics', async () => {
      vi.mocked(preferencesService.updateUserDemographics).mockResolvedValue();

      const { result } = renderHook(() => useUpdateDemographics(), { wrapper });

      result.current.mutate({ userId: 'user1', demographics: { height_inches: 70 } });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(preferencesService.updateUserDemographics).toHaveBeenCalledWith('user1', { height_inches: 70 });
    });
  });

  describe('useMatchCountEstimate', () => {
    it('should return match count estimate', async () => {
      vi.mocked(preferencesService.getMatchCountEstimate).mockResolvedValue(10);

      const { result } = renderHook(() => useMatchCountEstimate('user1'), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toBe(10);
    });
  });
});

