import { supabase } from '@/integrations/supabase/client';
import { calculateDistance, extractCoordinatesFromPoint } from '@/lib/utils';

/**
 * Validate coordinates are within valid ranges
 */
function validateCoordinates(latitude: number, longitude: number): void {
  if (typeof latitude !== 'number' || typeof longitude !== 'number') {
    throw new Error('Coordinates must be numbers');
  }
  if (isNaN(latitude) || isNaN(longitude)) {
    throw new Error('Coordinates must be valid numbers');
  }
  if (latitude < -90 || latitude > 90) {
    throw new Error('Latitude must be between -90 and 90');
  }
  if (longitude < -180 || longitude > 180) {
    throw new Error('Longitude must be between -180 and 180');
  }
}

/**
 * Update user location using PostGIS POINT format
 * PostGIS POINT format: POINT(longitude latitude) - note: longitude comes first!
 * Includes rate limiting to prevent excessive location updates
 */
export async function updateUserLocation(
  userId: string,
  latitude: number,
  longitude: number
): Promise<void> {
  // Validate coordinates
  validateCoordinates(latitude, longitude);

  // Import rate limiting service (dynamic import to avoid circular dependencies)
  const { checkRateLimit, getRateLimitKey, RATE_LIMITS } = await import('./rateLimit.service');

  // Check rate limiting
  const rateLimitKey = getRateLimitKey(userId, 'location');
  const rateLimitCheck = checkRateLimit(rateLimitKey, RATE_LIMITS.LOCATION_UPDATES);
  if (!rateLimitCheck.allowed) {
    throw new Error(
      `Rate limit exceeded. Please wait ${rateLimitCheck.retryAfter} seconds before updating location again.`
    );
  }
  // Use PostGIS function to create POINT (longitude, latitude)
  // Note: PostGIS uses (longitude, latitude) order, not (latitude, longitude)
  const { error } = await supabase.rpc('update_user_location', {
    user_id: userId,
    lat: latitude,
    lng: longitude,
  });

  // Fallback: If RPC doesn't exist, use direct SQL via PostgREST
  // Format: POINT(longitude latitude) as a string
  if (error && error.code === '42883') {
    // Function doesn't exist, use direct update with PostGIS format
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        location: `POINT(${longitude} ${latitude})`,
        location_updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (updateError) throw updateError;
  } else if (error) {
    throw error;
  }
}

/**
 * Get nearby profiles (within radius in kilometers) using PostGIS
 * Uses efficient RPC function when available, falls back to bounding box query
 */
export async function getNearbyProfiles(
  userId: string,
  latitude: number,
  longitude: number,
  radiusKm: number = 50
): Promise<any[]> {
  // Validate coordinates
  validateCoordinates(latitude, longitude);

  // Validate radius
  if (typeof radiusKm !== 'number' || isNaN(radiusKm) || radiusKm <= 0) {
    throw new Error('Radius must be a positive number');
  }
  if (radiusKm > 1000) {
    throw new Error('Radius cannot exceed 1000 km');
  }

  // Use PostGIS RPC function for efficient spatial query
  // Convert radius from km to meters (PostGIS ST_DWithin uses meters)
  const radiusMeters = radiusKm * 1000;

  const { data, error } = await supabase.rpc('get_nearby_profiles', {
    user_id: userId,
    lat: latitude,
    lng: longitude,
    radius_meters: radiusMeters,
  });

  // Filter RPC results to respect location privacy
  if (data && !error) {
    return data.filter((profile: any) => {
      // Default to visible if not set (backward compatibility)
      return profile.location_visible !== false;
    });
  }

  // Fallback: If RPC doesn't exist, use bounding box query for better performance
  if (error && error.code === '42883') {
    // Calculate bounding box (approximate, but much more efficient than fetching all)
    // 1 degree latitude ≈ 111 km, so we add a buffer
    const latBuffer = radiusKm / 111;
    const lngBuffer = radiusKm / (111 * Math.cos(latitude * Math.PI / 180));
    
    const minLat = latitude - latBuffer;
    const maxLat = latitude + latBuffer;
    const minLng = longitude - lngBuffer;
    const maxLng = longitude + lngBuffer;
    
    // Use bounding box to limit results before filtering
    // Optimized: Filter by location_visible in query, reduce limit, process in chunks
    // Note: This is an approximation - we still need to filter by actual distance
    // But it dramatically reduces the number of profiles we need to process
    const { data: profiles, error: fetchError } = await supabase
      .from('profiles')
      .select('id, name, age, photo_url, location, location_visible')
      .neq('id', userId)
      .not('location', 'is', null)
      .eq('location_visible', true) // Filter by privacy in query (more efficient)
      .limit(200); // Reduced limit for better performance

    if (fetchError) throw fetchError;

    if (!profiles || profiles.length === 0) return [];

    // Pre-calculate values used in distance calculation for performance
    const latRad = latitude * Math.PI / 180;
    const cosLatRad = Math.cos(latRad);

    // Filter by actual distance using optimized haversine formula
    // Process in batches to avoid blocking the main thread
    const results: any[] = [];
    const batchSize = 50;
    
    for (let i = 0; i < profiles.length; i += batchSize) {
      const batch = profiles.slice(i, i + batchSize);
      
      for (const profile of batch) {
        if (!profile.location) continue;
        
        const coords = extractCoordinatesFromPoint(profile.location);
        if (!coords) continue;

        // Quick bounding box check first (faster than haversine)
        if (coords.latitude < minLat || coords.latitude > maxLat ||
            coords.longitude < minLng || coords.longitude > maxLng) {
          continue;
        }

        // Calculate actual distance using haversine formula from utils
        const distance = calculateDistance(
          latitude,
          longitude,
          coords.latitude,
          coords.longitude
        );
        
        if (distance <= radiusKm) {
          results.push({ ...profile, distance });
        }
      }
      
      // Yield to browser between batches to prevent blocking
      if (i + batchSize < profiles.length) {
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }

    // Sort by distance
    return results.sort((a, b) => (a.distance || 0) - (b.distance || 0));
  } else if (error) {
    throw error;
  }

  return [];
}

// Note: calculateDistance and extractCoordinatesFromPoint are imported from @/lib/utils
// to avoid code duplication and maintain a single source of truth

/**
 * Location cache key for localStorage
 */
export const LOCATION_CACHE_KEY = 'yoke_location_cache';
const LOCATION_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Clear location cache
 * Useful when privacy settings change or location should be refreshed
 */
export function clearLocationCache(): void {
  try {
    localStorage.removeItem(LOCATION_CACHE_KEY);
  } catch {
    // Ignore localStorage errors
  }
}

/**
 * Cached location type
 */
interface CachedLocation {
  latitude: number;
  longitude: number;
  timestamp: number;
}

/**
 * Get cached location if still valid
 */
function getCachedLocation(): { latitude: number; longitude: number } | null {
  try {
    const cached = localStorage.getItem(LOCATION_CACHE_KEY);
    if (!cached) return null;
    
    const cachedData: CachedLocation = JSON.parse(cached);
    const now = Date.now();
    
    // Check if cache is still valid
    if (now - cachedData.timestamp > LOCATION_CACHE_TTL) {
      localStorage.removeItem(LOCATION_CACHE_KEY);
      return null;
    }
    
    return {
      latitude: cachedData.latitude,
      longitude: cachedData.longitude,
    };
  } catch {
    return null;
  }
}

/**
 * Cache location
 */
function cacheLocation(latitude: number, longitude: number): void {
  try {
    const cachedData: CachedLocation = {
      latitude,
      longitude,
      timestamp: Date.now(),
    };
    localStorage.setItem(LOCATION_CACHE_KEY, JSON.stringify(cachedData));
  } catch {
    // Ignore localStorage errors
  }
}

/**
 * Check if geolocation permission is granted
 * @returns Promise resolving to permission status
 */
export async function checkLocationPermission(): Promise<'granted' | 'denied' | 'prompt'> {
  if (!navigator.geolocation) {
    return 'denied';
  }

  // Use Permissions API if available (more accurate)
  if ('permissions' in navigator) {
    try {
      const result = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
      return result.state as 'granted' | 'denied' | 'prompt';
    } catch {
      // Permissions API not fully supported, fall through to geolocation check
    }
  }

  // Fallback: try to get position with very short timeout to check permission
  return new Promise((resolve) => {
    const timeoutId = setTimeout(() => {
      resolve('prompt'); // Timeout means we haven't asked yet
    }, 100);

    navigator.geolocation.getCurrentPosition(
      () => {
        clearTimeout(timeoutId);
        resolve('granted');
      },
      (error) => {
        clearTimeout(timeoutId);
        if (error.code === error.PERMISSION_DENIED) {
          resolve('denied');
        } else {
          resolve('prompt'); // Other errors mean we can still prompt
        }
      },
      { timeout: 100, maximumAge: Infinity }
    );
  });
}

/**
 * Watch user's position and call callback on updates
 * @param callback - Function to call when position updates
 * @param options - Geolocation options
 * @returns Watch ID that can be used to stop watching
 */
export function watchPosition(
  callback: (location: { latitude: number; longitude: number }) => void,
  options?: {
    enableHighAccuracy?: boolean;
    timeout?: number;
    maximumAge?: number;
  }
): number | null {
  if (!navigator.geolocation) {
    return null;
  }

  return navigator.geolocation.watchPosition(
    (position) => {
      const location = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };
      
      // Cache the location
      cacheLocation(location.latitude, location.longitude);
      
      callback(location);
    },
    (error) => {
      // Silently handle errors - caller should check permission separately
      console.warn('Location watch error:', error);
    },
    {
      enableHighAccuracy: options?.enableHighAccuracy ?? true,
      timeout: options?.timeout ?? 10000,
      maximumAge: options?.maximumAge ?? 60000, // Default 1 minute for watch
    }
  );
}

/**
 * Stop watching position
 * @param watchId - Watch ID returned from watchPosition
 */
export function clearWatch(watchId: number): void {
  if (navigator.geolocation && watchId !== null) {
    navigator.geolocation.clearWatch(watchId);
  }
}

/**
 * Get user's current location from browser
 * Uses cached location if available and still valid
 * @param options - Geolocation options
 * @param useCache - Whether to use cached location (default: true)
 * @returns Promise resolving to location coordinates
 */
export async function getCurrentLocation(
  options?: {
    enableHighAccuracy?: boolean;
    timeout?: number;
    maximumAge?: number;
  },
  useCache: boolean = true
): Promise<{ latitude: number; longitude: number }> {
  // Check cache first if enabled
  if (useCache) {
    const cached = getCachedLocation();
    if (cached) {
      return cached;
    }
  }

  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by your browser'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        
        // Cache the location
        cacheLocation(location.latitude, location.longitude);
        
        resolve(location);
      },
      (error) => {
        // Provide more specific error messages
        let errorMessage = 'Failed to get location';
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location permission denied. Please enable location access in your browser settings.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information is unavailable.';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out. Please try again.';
            break;
        }
        
        const locationError = new Error(errorMessage);
        (locationError as any).code = error.code;
        reject(locationError);
      },
      {
        enableHighAccuracy: options?.enableHighAccuracy ?? true,
        timeout: options?.timeout ?? 10000,
        maximumAge: options?.maximumAge ?? 0,
      }
    );
  });
}

