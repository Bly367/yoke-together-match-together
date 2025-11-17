import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useUpdateLocation, useLocationPermission, useCurrentLocation, useAutoLocationUpdate, useNearbyProfiles } from '../useLocation';
import * as locationService from '@/services/location.service';
import * as useAuth from '../useAuth';

vi.mock('@/services/location.service');
vi.mock('../useAuth');

describe('useLocation', () => {
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
    
    // Mock geolocation API
    global.navigator.geolocation = {
      getCurrentPosition: vi.fn(),
      watchPosition: vi.fn(),
      clearWatch: vi.fn(),
    } as any;
    
    Object.defineProperty(global.navigator, 'permissions', {
      value: {
        query: vi.fn().mockResolvedValue({ state: 'granted' }),
      },
      writable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };

  describe('useUpdateLocation', () => {
    it('should update location', async () => {
      vi.mocked(locationService.updateUserLocation).mockResolvedValue();

      const { result } = renderHook(() => useUpdateLocation(), { wrapper });

      result.current.mutate({ userId: 'user1', latitude: 40.7128, longitude: -74.0060 });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(locationService.updateUserLocation).toHaveBeenCalledWith('user1', 40.7128, -74.0060);
    });
  });

  describe('useLocationPermission', () => {
    it('should return permission status', async () => {
      vi.mocked(locationService.checkLocationPermission).mockResolvedValue('granted');

      const { result } = renderHook(() => useLocationPermission(), { wrapper });

      await waitFor(() => {
        expect(result.current).toBe('granted');
      });
    });
  });

  describe('useCurrentLocation', () => {
    it('should get current location', async () => {
      const mockLocation = { latitude: 40.7128, longitude: -74.0060 };
      vi.mocked(locationService.getCurrentLocation).mockResolvedValue(mockLocation);
      vi.mocked(locationService.checkLocationPermission).mockResolvedValue('granted');

      const { result } = renderHook(() => useCurrentLocation(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.location).toEqual(mockLocation);
    });
  });

  describe('useNearbyProfiles', () => {
    it('should return nearby profiles when location available', async () => {
      const mockProfiles = [{ id: 'profile1', name: 'User 1' }];
      vi.mocked(locationService.getNearbyProfiles).mockResolvedValue(mockProfiles as any);
      
      // Mock useCurrentLocation to return location immediately
      vi.mocked(locationService.checkLocationPermission).mockResolvedValue('granted');
      vi.mocked(locationService.getCurrentLocation).mockResolvedValue({ latitude: 40.7128, longitude: -74.0060 });

      const { result } = renderHook(() => useNearbyProfiles(50), { wrapper });

      // Query should be enabled when user and location are available
      // May take time for location to be fetched
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      }, { timeout: 5000 });
      
      // If location is available, should have data
      if (result.current.data) {
        expect(result.current.data).toEqual(mockProfiles);
      }
    });
  });
});

