# Location Services Review

## Overview
This document reviews the location services system, including location updates, nearby profile queries, and geolocation integration.

## Files Reviewed
- `src/services/location.service.ts` - Core location service functions
- `src/hooks/useLocation.ts` - React hooks for location operations

---

## 1. Service Layer (`location.service.ts`)

### Strengths
✅ **PostGIS integration** - Proper use of PostGIS POINT format
✅ **Fallback logic** - Handles missing RPC functions gracefully
✅ **Haversine formula** - Client-side distance calculation fallback
✅ **Browser geolocation** - Proper use of browser geolocation API
✅ **Error handling** - Good error handling for geolocation failures

### Issues & Recommendations

#### 1.1 RPC Function Dependency
**Location:** `updateUserLocation`, lines 7-36
**Issue:** Relies on RPC function that may not exist, falls back to string formatting
**Recommendation:** Document RPC function requirement or always use fallback:
```typescript
// Always use direct update with PostGIS format
// RPC function should be created but not required
export async function updateUserLocation(
  userId: string,
  latitude: number,
  longitude: number
): Promise<void> {
  // Validate coordinates
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    throw new Error('Invalid coordinates');
  }
  
  const { error } = await supabase
    .from('profiles')
    .update({
      location: `POINT(${longitude} ${latitude})`, // PostGIS format: lng lat
      location_updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  if (error) throw error;
}
```

#### 1.2 Client-Side Filtering Performance
**Location:** `getNearbyProfiles`, lines 59-87
**Issue:** Falls back to fetching all profiles and filtering client-side, very inefficient
**Recommendation:** Make RPC function required or use better fallback:
```typescript
// Option 1: Make RPC function required (document in setup)
// Option 2: Use better fallback with bounding box query
export async function getNearbyProfiles(
  userId: string,
  latitude: number,
  longitude: number,
  radiusKm: number = 50
): Promise<any[]> {
  const radiusMeters = radiusKm * 1000;
  
  // Try RPC first
  const { data, error } = await supabase.rpc('get_nearby_profiles', {
    user_id: userId,
    lat: latitude,
    lng: longitude,
    radius_meters: radiusMeters,
  });
  
  if (!error) return data || [];
  
  // Fallback: Use bounding box query (more efficient than fetching all)
  // Calculate bounding box
  const latDelta = radiusKm / 111; // ~111 km per degree latitude
  const lngDelta = radiusKm / (111 * Math.cos(latitude * Math.PI / 180));
  
  const { data: profiles, error: fetchError } = await supabase
    .from('profiles')
    .select('*')
    .neq('id', userId)
    .not('location', 'is', null)
    .gte('latitude', latitude - latDelta) // If you have separate lat/lng columns
    .lte('latitude', latitude + latDelta)
    .gte('longitude', longitude - lngDelta)
    .lte('longitude', longitude + lngDelta)
    .limit(1000);
  
  if (fetchError) throw fetchError;
  
  // Filter by exact distance using haversine
  return (profiles || []).filter(profile => {
    const coords = extractCoordinatesFromPoint(profile.location);
    if (!coords) return false;
    const distance = calculateDistance(latitude, longitude, coords.latitude, coords.longitude);
    return distance <= radiusKm;
  });
}
```

#### 1.3 Coordinate Extraction Logic
**Location:** `extractCoordinatesFromPoint`, lines 99-126
**Issue:** Handles multiple formats but could be more robust
**Recommendation:** Improve parsing:
```typescript
function extractCoordinatesFromPoint(point: any): { latitude: number; longitude: number } | null {
  if (!point) return null;

  // GeoJSON format: { coordinates: [lng, lat] }
  if (typeof point === 'object' && 'coordinates' in point) {
    const [lng, lat] = point.coordinates;
    if (typeof lng === 'number' && typeof lat === 'number') {
      return { longitude: lng, latitude: lat };
    }
  }

  // PostGIS string format: "POINT(lng lat)" or "POINT(lng lat z)" or "SRID=4326;POINT(lng lat)"
  if (typeof point === 'string') {
    // Handle SRID prefix
    const pointStr = point.includes('POINT') 
      ? point.split('POINT')[1] 
      : point;
    
    const match = pointStr.match(/\(([^)]+)\)/);
    if (match) {
      const coords = match[1].trim().split(/\s+/);
      if (coords.length >= 2) {
        const lng = parseFloat(coords[0]);
        const lat = parseFloat(coords[1]);
        if (!isNaN(lng) && !isNaN(lat)) {
          return { longitude: lng, latitude: lat };
        }
      }
    }
  }

  return null;
}
```

#### 1.4 Missing Input Validation
**Location:** All functions
**Issue:** No validation for coordinate ranges
**Recommendation:** Add validation:
```typescript
function validateCoordinates(latitude: number, longitude: number): void {
  if (typeof latitude !== 'number' || typeof longitude !== 'number') {
    throw new Error('Coordinates must be numbers');
  }
  if (latitude < -90 || latitude > 90) {
    throw new Error('Latitude must be between -90 and 90');
  }
  if (longitude < -180 || longitude > 180) {
    throw new Error('Longitude must be between -180 and 180');
  }
}
```

#### 1.5 No Location Caching
**Location:** Service functions
**Issue:** No caching of user location
**Recommendation:** Cache location in localStorage or React Query:
```typescript
const LOCATION_CACHE_KEY = 'user_location';
const LOCATION_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function getCachedLocation(): Promise<{ latitude: number; longitude: number } | null> {
  const cached = localStorage.getItem(LOCATION_CACHE_KEY);
  if (!cached) return null;
  
  const { location, timestamp } = JSON.parse(cached);
  if (Date.now() - timestamp > LOCATION_CACHE_TTL) {
    localStorage.removeItem(LOCATION_CACHE_KEY);
    return null;
  }
  
  return location;
}
```

---

## 2. Hooks Layer (`useLocation.ts`)

### Strengths
✅ **React Query integration** - Proper use of React Query
✅ **Error handling** - Exposes error states
✅ **Loading states** - Proper loading indicators

### Issues & Recommendations

#### 2.1 No Location Permission Handling
**Location:** `useCurrentLocation`, lines 35-48
**Issue:** No handling for denied location permissions
**Recommendation:** Add permission handling:
```typescript
export function useCurrentLocation() {
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [permissionDenied, setPermissionDenied] = useState(false);

  useEffect(() => {
    getCurrentLocation()
      .then(setLocation)
      .catch((err) => {
        if (err.code === 1) { // PERMISSION_DENIED
          setPermissionDenied(true);
        }
        setError(err);
      })
      .finally(() => setIsLoading(false));
  }, []);

  return { location, error, isLoading, permissionDenied };
}
```

#### 2.2 No Location Update Hook
**Location:** Hooks
**Issue:** `useUpdateLocation` exists but could be improved
**Recommendation:** Add automatic location updates:
```typescript
export function useAutoLocationUpdate(intervalMinutes: number = 15) {
  const { user } = useAuth();
  const { location } = useCurrentLocation();
  const updateLocationMutation = useUpdateLocation();

  useEffect(() => {
    if (!user || !location) return;

    const interval = setInterval(() => {
      updateLocationMutation.mutate({
        userId: user.id,
        latitude: location.latitude,
        longitude: location.longitude,
      });
    }, intervalMinutes * 60 * 1000);

    return () => clearInterval(interval);
  }, [user, location, intervalMinutes, updateLocationMutation]);
}
```

#### 2.3 Missing Location Accuracy
**Location:** `useCurrentLocation`
**Issue:** No way to specify location accuracy requirements
**Recommendation:** Add accuracy options:
```typescript
export function useCurrentLocation(options?: {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
}) {
  // Pass options to getCurrentLocation
}
```

---

## 3. Data Flow

### Current Flow
1. User grants location permission → Browser geolocation API
2. Location retrieved → Updated to database
3. Nearby profiles queried → Filtered by distance
4. Results displayed → User sees nearby duos

### Issues
- ⚠️ RPC function may not exist (fallback needed)
- ⚠️ Client-side filtering is inefficient
- ⚠️ No location caching

---

## 4. Security Considerations

### ✅ Good Practices
- Validates coordinates before updating
- Uses RLS policies (should verify in database review)

### ⚠️ Recommendations
1. **Coordinate Validation**: Validate coordinates server-side
2. **Rate Limiting**: Limit location updates per hour
3. **Privacy**: Consider location privacy settings (hide/show location)
4. **Access Control**: Ensure RLS policies prevent unauthorized location access

---

## 5. Performance Considerations

### Current State
- ✅ Efficient PostGIS queries (when RPC exists)
- ⚠️ Inefficient client-side filtering fallback
- ⚠️ No location caching

### Recommendations
1. **RPC Function**: Make RPC function required or improve fallback
2. **Location Caching**: Cache location to reduce API calls
3. **Bounding Box**: Use bounding box queries in fallback
4. **Indexing**: Ensure database has spatial indexes (verify in database review)

---

## 6. Testing Recommendations

### Unit Tests Needed
- [ ] `location.service.ts` - Test all functions with mocked Supabase
- [ ] `useLocation.ts` - Test hooks
- [ ] Coordinate extraction and validation functions

### Integration Tests Needed
- [ ] Location update flow
- [ ] Nearby profiles query flow
- [ ] Browser geolocation flow
- [ ] Permission denied handling

---

## Summary

### Critical Issues
1. ⚠️ Inefficient client-side filtering fallback
2. ⚠️ RPC function dependency not clearly documented
3. ⚠️ No location permission handling

### High Priority Improvements
1. Improve fallback to use bounding box queries
2. Add location permission handling
3. Add coordinate validation
4. Document RPC function requirements

### Low Priority Enhancements
1. Add location caching
2. Add automatic location updates
3. Add location accuracy options
4. Add location privacy settings

---

## Review Checklist

- [x] Service layer follows DRY principles
- [x] Hooks properly use React Query
- [ ] Error handling is comprehensive
- [ ] Input validation is implemented
- [x] TypeScript types are properly defined
- [x] JSDoc comments are present
- [ ] Performance is optimized

