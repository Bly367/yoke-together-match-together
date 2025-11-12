import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState, useRef, useCallback } from 'react';
import {
  updateUserLocation,
  getNearbyProfiles,
  getCurrentLocation,
  checkLocationPermission,
  watchPosition,
  clearWatch,
} from '@/services/location.service';
import { useAuth } from './useAuth';

/**
 * Hook to update user location
 */
export function useUpdateLocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      userId,
      latitude,
      longitude,
    }: {
      userId: string;
      latitude: number;
      longitude: number;
    }) => updateUserLocation(userId, latitude, longitude),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
    },
  });
}

/**
 * Hook to check location permission status
 */
export function useLocationPermission() {
  const [permission, setPermission] = useState<'granted' | 'denied' | 'prompt' | 'checking'>('checking');

  useEffect(() => {
    checkLocationPermission()
      .then(setPermission)
      .catch(() => setPermission('prompt'));
  }, []);

  return permission;
}

/**
 * Hook to get user's current location
 * Handles permission denied errors and uses cached location when available
 * Supports auto-updates via watchPosition
 */
export function useCurrentLocation(options?: {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
  useCache?: boolean;
  watch?: boolean; // Enable watchPosition for auto-updates
}) {
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const watchIdRef = useRef<number | null>(null);

  // Check permission first
  const permission = useLocationPermission();

  // Initial location fetch
  useEffect(() => {
    if (permission === 'checking') return;

    setIsLoading(true);
    setError(null);
    setPermissionDenied(permission === 'denied');
    
    if (permission === 'denied') {
      setIsLoading(false);
      setError(new Error('Location permission denied. Please enable location access in your browser settings.'));
      return;
    }

    getCurrentLocation(options, options?.useCache ?? true)
      .then((loc) => {
        setLocation(loc);
        setPermissionDenied(false);
      })
      .catch((err: Error & { code?: number }) => {
        setError(err);
        // Check if it's a permission denied error (code 1)
        if (err.code === 1 || err.message.includes('permission denied')) {
          setPermissionDenied(true);
        }
      })
      .finally(() => setIsLoading(false));
  }, [permission, options?.enableHighAccuracy, options?.timeout, options?.maximumAge, options?.useCache]);

  // Set up watchPosition for auto-updates if enabled
  useEffect(() => {
    if (!options?.watch || permission !== 'granted' || !location) {
      return;
    }

    // Clear existing watch
    if (watchIdRef.current !== null) {
      clearWatch(watchIdRef.current);
    }

    // Start watching position
    const watchId = watchPosition(
      (newLocation) => {
        setLocation(newLocation);
        setError(null);
      },
      options
    );

    if (watchId !== null) {
      watchIdRef.current = watchId;
    }

    return () => {
      if (watchIdRef.current !== null) {
        clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [options?.watch, permission, location, options?.enableHighAccuracy, options?.timeout, options?.maximumAge]);

  return { location, error, isLoading, permissionDenied, permission };
}

/**
 * Hook to automatically update user location in database
 * Updates location periodically or when location changes significantly
 */
export function useAutoLocationUpdate(options?: {
  intervalMinutes?: number; // Update interval in minutes (default: 15)
  minDistanceMeters?: number; // Minimum distance change to trigger update (default: 100m)
  enabled?: boolean; // Enable/disable auto-updates (default: true)
}) {
  const { user } = useAuth();
  const updateLocationMutation = useUpdateLocation();
  const { location } = useCurrentLocation({ watch: options?.enabled ?? true });
  const lastUpdateRef = useRef<{ latitude: number; longitude: number; timestamp: number } | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const minDistance = options?.minDistanceMeters ?? 100;
  const intervalMs = (options?.intervalMinutes ?? 15) * 60 * 1000;

  // Calculate distance between two coordinates in meters
  const calculateDistance = useCallback(
    (lat1: number, lon1: number, lat2: number, lon2: number): number => {
      const R = 6371000; // Earth's radius in meters
      const dLat = ((lat2 - lat1) * Math.PI) / 180;
      const dLon = ((lon2 - lon1) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
          Math.cos((lat2 * Math.PI) / 180) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    },
    []
  );

  // Update location when it changes significantly or on interval
  useEffect(() => {
    if (!(options?.enabled ?? true)) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    if (!user || !location) return;

    const shouldUpdate = () => {
      const now = Date.now();
      const lastUpdate = lastUpdateRef.current;

      // First update
      if (!lastUpdate) {
        return true;
      }

      // Check if enough time has passed
      if (now - lastUpdate.timestamp >= intervalMs) {
        return true;
      }

      // Check if moved enough distance
      const distance = calculateDistance(
        lastUpdate.latitude,
        lastUpdate.longitude,
        location.latitude,
        location.longitude
      );

      return distance >= minDistance;
    };

    if (shouldUpdate()) {
      updateLocationMutation.mutate({
        userId: user.id,
        latitude: location.latitude,
        longitude: location.longitude,
      });

      lastUpdateRef.current = {
        latitude: location.latitude,
        longitude: location.longitude,
        timestamp: Date.now(),
      };
    }
  }, [user, location, updateLocationMutation, intervalMs, minDistance, calculateDistance, options?.enabled]);

  // Set up interval for periodic updates
  useEffect(() => {
    if (!(options?.enabled ?? true)) return;
    if (!user || !location) return;

    intervalRef.current = setInterval(() => {
      if (user && location) {
        updateLocationMutation.mutate({
          userId: user.id,
          latitude: location.latitude,
          longitude: location.longitude,
        });
      }
    }, intervalMs);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [user, location, updateLocationMutation, intervalMs, options?.enabled]);

  return {
    isUpdating: updateLocationMutation.isPending,
    lastUpdate: lastUpdateRef.current,
  };
}

/**
 * Hook to get nearby profiles
 */
export function useNearbyProfiles(radiusKm: number = 50) {
  const { user } = useAuth();
  const { location } = useCurrentLocation();

  return useQuery({
    queryKey: ['profiles', 'nearby', user?.id, location?.latitude, location?.longitude, radiusKm],
    queryFn: () =>
      getNearbyProfiles(user!.id, location!.latitude, location!.longitude, radiusKm),
    enabled: !!user && !!location,
  });
}

