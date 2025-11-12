import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getCurrentLocation,
  checkLocationPermission,
  watchPosition,
  clearWatch,
} from '../location.service';

// Mock geolocation API
const mockGeolocation = {
  getCurrentPosition: vi.fn(),
  watchPosition: vi.fn(),
  clearWatch: vi.fn(),
};

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

describe('location.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup geolocation mock
    Object.defineProperty(global.navigator, 'geolocation', {
      value: mockGeolocation,
      writable: true,
      configurable: true,
    });

    // Setup localStorage mock
    Object.defineProperty(global, 'localStorage', {
      value: localStorageMock,
      writable: true,
      configurable: true,
    });

    // Reset localStorage mock implementation
    localStorageMock.getItem.mockReturnValue(null);
  });

  describe('getCurrentLocation', () => {
    it('should return location when geolocation succeeds', async () => {
      const mockPosition = {
        coords: {
          latitude: 37.7749,
          longitude: -122.4194,
        },
      };

      mockGeolocation.getCurrentPosition.mockImplementation((success) => {
        success(mockPosition);
      });

      const location = await getCurrentLocation();
      expect(location).toEqual({
        latitude: 37.7749,
        longitude: -122.4194,
      });
      expect(localStorageMock.setItem).toHaveBeenCalled();
    });

    it('should use cached location when available and valid', async () => {
      const cachedData = {
        latitude: 40.7128,
        longitude: -74.0060,
        timestamp: Date.now() - 60000, // 1 minute ago
      };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(cachedData));

      const location = await getCurrentLocation({}, true);
      expect(location).toEqual({
        latitude: 40.7128,
        longitude: -74.0060,
      });
      expect(mockGeolocation.getCurrentPosition).not.toHaveBeenCalled();
    });

    it('should reject when geolocation is not supported', async () => {
      Object.defineProperty(global.navigator, 'geolocation', {
        value: undefined,
        writable: true,
        configurable: true,
      });

      await expect(getCurrentLocation()).rejects.toThrow(
        'Geolocation is not supported by your browser'
      );
    });

    it('should handle permission denied error', async () => {
      const mockError = {
        code: 1, // PERMISSION_DENIED
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3,
      };

      mockGeolocation.getCurrentPosition.mockImplementation((success, error) => {
        error(mockError);
      });

      await expect(getCurrentLocation()).rejects.toThrow(
        'Location permission denied'
      );
    });

    it('should handle timeout error', async () => {
      const mockError = {
        code: 3, // TIMEOUT
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3,
      };

      mockGeolocation.getCurrentPosition.mockImplementation((success, error) => {
        error(mockError);
      });

      await expect(getCurrentLocation()).rejects.toThrow(
        'Location request timed out'
      );
    });

    it('should bypass cache when useCache is false', async () => {
      const cachedData = {
        latitude: 40.7128,
        longitude: -74.0060,
        timestamp: Date.now(),
      };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(cachedData));

      const mockPosition = {
        coords: {
          latitude: 37.7749,
          longitude: -122.4194,
        },
      };

      mockGeolocation.getCurrentPosition.mockImplementation((success) => {
        success(mockPosition);
      });

      const location = await getCurrentLocation({}, false);
      expect(location).toEqual({
        latitude: 37.7749,
        longitude: -122.4194,
      });
      expect(mockGeolocation.getCurrentPosition).toHaveBeenCalled();
    });
  });

  describe('checkLocationPermission', () => {
    it('should return denied when geolocation is not supported', async () => {
      Object.defineProperty(global.navigator, 'geolocation', {
        value: undefined,
        writable: true,
        configurable: true,
      });

      const permission = await checkLocationPermission();
      expect(permission).toBe('denied');
    });

    it('should return granted when permission is granted', async () => {
      const mockPosition = {
        coords: {
          latitude: 37.7749,
          longitude: -122.4194,
        },
      };

      mockGeolocation.getCurrentPosition.mockImplementation((success) => {
        success(mockPosition);
      });

      const permission = await checkLocationPermission();
      expect(permission).toBe('granted');
    });

    it('should return denied when permission is denied', async () => {
      const mockError = {
        code: 1, // PERMISSION_DENIED
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3,
      };

      mockGeolocation.getCurrentPosition.mockImplementation((success, error) => {
        error(mockError);
      });

      const permission = await checkLocationPermission();
      expect(permission).toBe('denied');
    });

    it('should use Permissions API when available', async () => {
      const mockPermissions = {
        query: vi.fn().mockResolvedValue({ state: 'granted' }),
      };

      Object.defineProperty(global.navigator, 'permissions', {
        value: mockPermissions,
        writable: true,
        configurable: true,
      });

      const permission = await checkLocationPermission();
      expect(permission).toBe('granted');
      expect(mockPermissions.query).toHaveBeenCalledWith({
        name: 'geolocation',
      });
    });
  });

  describe('watchPosition', () => {
    it('should return watch ID when geolocation is available', () => {
      mockGeolocation.watchPosition.mockReturnValue(123);

      const callback = vi.fn();
      const watchId = watchPosition(callback);

      expect(watchId).toBe(123);
      expect(mockGeolocation.watchPosition).toHaveBeenCalled();
    });

    it('should return null when geolocation is not supported', () => {
      Object.defineProperty(global.navigator, 'geolocation', {
        value: undefined,
        writable: true,
        configurable: true,
      });

      const callback = vi.fn();
      const watchId = watchPosition(callback);

      expect(watchId).toBeNull();
    });

    it('should cache location when position updates', () => {
      const mockPosition = {
        coords: {
          latitude: 37.7749,
          longitude: -122.4194,
        },
      };

      mockGeolocation.watchPosition.mockImplementation((success) => {
        success(mockPosition);
        return 123;
      });

      const callback = vi.fn();
      watchPosition(callback);

      expect(callback).toHaveBeenCalledWith({
        latitude: 37.7749,
        longitude: -122.4194,
      });
      expect(localStorageMock.setItem).toHaveBeenCalled();
    });
  });

  describe('clearWatch', () => {
    it('should clear watch when geolocation is available', () => {
      clearWatch(123);
      expect(mockGeolocation.clearWatch).toHaveBeenCalledWith(123);
    });

    it('should not throw when geolocation is not available', () => {
      Object.defineProperty(global.navigator, 'geolocation', {
        value: undefined,
        writable: true,
        configurable: true,
      });

      expect(() => clearWatch(123)).not.toThrow();
    });
  });

});

