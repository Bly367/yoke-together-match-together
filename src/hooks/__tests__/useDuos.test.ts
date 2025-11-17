import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useUserDuos, useDuo, useCreateDuo, useUpdateDuo, useActiveDuosForMatching, useDeactivateDuo, useDeleteDuo, useSetActiveDuo, useActiveDuo } from '../useDuos';
import * as duoService from '@/services/duo.service';
import * as useAuth from '../useAuth';

vi.mock('@/services/duo.service');
vi.mock('../useAuth');

describe('useDuos', () => {
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

  describe('useUserDuos', () => {
    it('should return user duos', async () => {
      const mockDuos = [{ id: 'duo1', member1_id: 'user1', member2_id: 'user2' }];
      vi.mocked(duoService.getUserDuos).mockResolvedValue(mockDuos as any);

      const { result } = renderHook(() => useUserDuos(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
        expect(result.current.data).toBeDefined();
      }, { timeout: 5000 });

      expect(result.current.data).toEqual(mockDuos);
    });
  });

  describe('useDuo', () => {
    it('should return duo', async () => {
      const mockDuo = { id: 'duo1', member1_id: 'user1', member2_id: 'user2' };
      vi.mocked(duoService.getDuo).mockResolvedValue(mockDuo as any);

      const { result } = renderHook(() => useDuo('duo1'), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual(mockDuo);
    });
  });

  describe('useCreateDuo', () => {
    it('should create duo', async () => {
      const mockDuo = { id: 'duo1', member1_id: 'user1', member2_id: 'user2' };
      vi.mocked(duoService.createDuo).mockResolvedValue(mockDuo as any);

      const { result } = renderHook(() => useCreateDuo(), { wrapper });

      result.current.mutate({ member2Id: 'user2' });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(duoService.createDuo).toHaveBeenCalledWith('user1', 'user2', undefined);
    });
  });

  describe('useUpdateDuo', () => {
    it('should update duo', async () => {
      const mockDuo = { id: 'duo1', name: 'Updated Name' };
      vi.mocked(duoService.updateDuo).mockResolvedValue(mockDuo as any);

      const { result } = renderHook(() => useUpdateDuo(), { wrapper });

      result.current.mutate({ duoId: 'duo1', updates: { name: 'Updated Name' } });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(duoService.updateDuo).toHaveBeenCalledWith('duo1', { name: 'Updated Name' });
    });
  });

  describe('useActiveDuosForMatching', () => {
    it('should return active duos for matching', async () => {
      const mockDuos = [{ id: 'duo1' }];
      vi.mocked(duoService.getActiveDuosForMatching).mockResolvedValue(mockDuos as any);

      const { result } = renderHook(() => useActiveDuosForMatching([]), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual(mockDuos);
    });
  });

  describe('useDeactivateDuo', () => {
    it('should deactivate duo', async () => {
      vi.mocked(duoService.deactivateDuo).mockResolvedValue();

      const { result } = renderHook(() => useDeactivateDuo(), { wrapper });

      result.current.mutate('duo1');

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(duoService.deactivateDuo).toHaveBeenCalledWith('duo1');
    });
  });

  describe('useDeleteDuo', () => {
    it('should delete duo', async () => {
      vi.mocked(duoService.deleteDuo).mockResolvedValue();

      const { result } = renderHook(() => useDeleteDuo(), { wrapper });

      result.current.mutate('duo1');

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(duoService.deleteDuo).toHaveBeenCalledWith('duo1');
    });
  });

  describe('useSetActiveDuo', () => {
    it('should set active duo', async () => {
      vi.mocked(duoService.setActiveDuo).mockResolvedValue();

      const { result } = renderHook(() => useSetActiveDuo(), { wrapper });

      result.current.mutate('duo1');

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(duoService.setActiveDuo).toHaveBeenCalledWith('duo1', 'user1');
    });
  });

  describe('useActiveDuo', () => {
    it('should return active duo from user duos', async () => {
      const mockDuos = [
        { id: 'duo1', is_active: true },
        { id: 'duo2', is_active: false },
      ];
      
      // Mock useUserDuos by mocking the service call
      vi.mocked(duoService.getUserDuos).mockResolvedValue(mockDuos as any);

      const { result } = renderHook(() => useActiveDuo(), { wrapper });

      // Wait for data to load
      await waitFor(() => {
        expect(result.current).toEqual(mockDuos[0]);
      }, { timeout: 5000 });
    });
  });
});

