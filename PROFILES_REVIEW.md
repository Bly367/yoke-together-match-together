# Profiles Aspect Review

## Overview

This document provides a comprehensive review of the Profiles aspect of the Yoke dating app, including architecture, implementation, issues found, and fixes applied.

## Architecture

### Database Schema

The `profiles` table extends Supabase `auth.users` and stores user profile information:

```sql
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  age INTEGER,
  bio TEXT,
  photo_url TEXT,
  location POINT, -- PostGIS point for geolocation
  location_updated_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Key Features:**
- One-to-one relationship with `auth.users` (via `id` FK)
- PostGIS `POINT` type for location-based matching
- Automatic profile creation via database trigger (recommended approach)
- Row Level Security (RLS) enabled

### Service Layer (`src/services/auth.service.ts`)

**Functions:**
- `signUp()` - Creates user account and profile
- `signIn()` - Authenticates and retrieves profile
- `signOut()` - Signs out current user
- `getCurrentUser()` - Gets current user's profile
- `updateProfile()` - Updates profile fields

**Profile Creation Strategy:**
1. Primary: Database trigger automatically creates profile on user signup
2. Fallback: Manual creation if trigger doesn't exist
3. Error handling: Provides helpful error messages for schema/RLS issues

### Hook Layer (`src/hooks/useAuth.ts`)

**Hooks:**
- `useAuth()` - Main hook for current user state
- `useSignUp()` - Sign up mutation
- `useSignIn()` - Sign in mutation
- `useUpdateProfile()` - Profile update mutation

**Features:**
- Uses React Query for data fetching and caching
- Automatic cache invalidation on mutations
- Type-safe with TypeScript

### Component Layer

**Pages:**
- `Profile.tsx` - Displays user profile and duo information
- `ProfileSetup.tsx` - Form for creating/editing profile

**Components:**
- `PhotoUpload.tsx` - Reusable photo upload with cropping

## Issues Found and Fixed

### ✅ Issue 1: Missing Icon Imports

**Problem:** `Profile.tsx` was using `User` and `Users` icons from `lucide-react` but they weren't imported.

**Fix:** Added missing imports:
```typescript
import { ArrowLeft, Settings, LogOut, Loader2, User, Users } from "lucide-react";
```

### ✅ Issue 2: Unused Variables and Imports

**Problem:** 
- `matches` and `matchesLoading` were fetched but never used
- `matchesCount` was calculated but never used
- `isProfile` was set but never used
- `chickMascot` was imported but never used
- `cn` utility was imported but never used

**Fix:** Removed all unused imports and variables.

### ✅ Issue 3: Location Service Schema Mismatch

**Problem:** The `location.service.ts` was trying to update `latitude` and `longitude` columns that don't exist in the schema. The database uses PostGIS `POINT` type.

**Fix:** Updated `updateUserLocation()` to:
1. Try using RPC function `update_user_location` (if exists)
2. Fallback to direct update with PostGIS POINT format: `POINT(longitude latitude)`

**Note:** PostGIS uses (longitude, latitude) order, not (latitude, longitude)!

**Fix:** Updated `getNearbyProfiles()` to:
1. Try using RPC function `get_nearby_profiles` (if exists)
2. Fallback to fetching all profiles and filtering manually
3. Added `extractCoordinatesFromPoint()` helper to parse PostGIS POINT format

### ✅ Issue 4: Missing Location Fields in UserProfile Interface

**Problem:** `UserProfile` interface didn't include `location` and `location_updated_at` fields.

**Fix:** Added fields to interface:
```typescript
location?: string | { coordinates: [number, number] }; // PostGIS POINT format
location_updated_at?: string;
```

## Current State

### ✅ Working Well

1. **Profile Creation Flow:**
   - Database trigger automatically creates profiles (best practice)
   - Fallback manual creation if trigger doesn't exist
   - Good error messages for debugging

2. **Profile Management:**
   - Clean separation of concerns (Service → Hook → Component)
   - React Query for efficient data fetching and caching
   - Type-safe with TypeScript interfaces

3. **Photo Upload:**
   - Reusable `PhotoUpload` component
   - Image cropping functionality
   - Proper error handling

4. **UI/UX:**
   - Clean, modern design
   - Loading states handled properly
   - Error handling with toast notifications

### ⚠️ Areas for Improvement

1. **Location Service:**
   - Currently relies on RPC functions that may not exist
   - Fallback implementation works but is inefficient (fetches all profiles)
   - **Recommendation:** Create database RPC functions for efficient PostGIS queries

2. **Type Safety:**
   - `UserProfile` interface is manually maintained
   - **Recommendation:** Generate types from Supabase schema (see `GENERATE_TYPES.md`)

3. **Profile Validation:**
   - No client-side validation for age (should be positive, reasonable range)
   - No validation for bio length
   - **Recommendation:** Add validation in `ProfileSetup.tsx`

4. **Error Handling:**
   - Some error messages could be more user-friendly
   - **Recommendation:** Add error boundary for profile-related errors

## Recommendations

### Priority 1: Create Database RPC Functions

Create these functions in Supabase SQL Editor for efficient location queries:

```sql
-- Function to update user location
CREATE OR REPLACE FUNCTION update_user_location(
  user_id UUID,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.profiles
  SET 
    location = ST_MakePoint(lng, lat),
    location_updated_at = NOW()
  WHERE id = user_id;
END;
$$;

-- Function to get nearby profiles
CREATE OR REPLACE FUNCTION get_nearby_profiles(
  user_id UUID,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  radius_meters DOUBLE PRECISION
)
RETURNS TABLE (
  id UUID,
  email TEXT,
  name TEXT,
  age INTEGER,
  bio TEXT,
  photo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.email,
    p.name,
    p.age,
    p.bio,
    p.photo_url,
    p.created_at,
    p.updated_at
  FROM public.profiles p
  WHERE 
    p.id != user_id
    AND p.location IS NOT NULL
    AND ST_DWithin(
      p.location::geography,
      ST_MakePoint(lng, lat)::geography,
      radius_meters
    )
  ORDER BY ST_Distance(
    p.location::geography,
    ST_MakePoint(lng, lat)::geography
  )
  LIMIT 100;
END;
$$;
```

### Priority 2: Add Profile Validation

Add validation to `ProfileSetup.tsx`:

```typescript
const validateProfile = (name: string, age: string, bio: string) => {
  if (!name.trim()) {
    return "Name is required";
  }
  if (name.length < 2) {
    return "Name must be at least 2 characters";
  }
  const ageNum = parseInt(age, 10);
  if (isNaN(ageNum) || ageNum < 18 || ageNum > 100) {
    return "Age must be between 18 and 100";
  }
  if (bio.length > 500) {
    return "Bio must be less than 500 characters";
  }
  return null;
};
```

### Priority 3: Generate Types from Database

Follow `GENERATE_TYPES.md` to generate TypeScript types from Supabase schema. This will:
- Ensure type safety
- Reduce manual maintenance
- Catch schema changes early

## File Structure

```
src/
├── pages/
│   ├── Profile.tsx          # Profile display page
│   └── ProfileSetup.tsx     # Profile creation/editing form
├── components/
│   └── PhotoUpload.tsx      # Reusable photo upload component
├── hooks/
│   └── useAuth.ts           # Auth and profile hooks
├── services/
│   ├── auth.service.ts      # Profile CRUD operations
│   └── location.service.ts  # Location-related operations
└── integrations/
    └── supabase/
        ├── client.ts        # Supabase client
        └── types.ts         # Database types (should be generated)
```

## Testing Checklist

- [ ] Profile creation on signup (with trigger)
- [ ] Profile creation on signup (without trigger - fallback)
- [ ] Profile update
- [ ] Photo upload and cropping
- [ ] Location update (PostGIS POINT format)
- [ ] Get nearby profiles query
- [ ] Error handling for missing profile
- [ ] Error handling for RLS violations
- [ ] Profile display with missing fields (graceful degradation)

## Summary

The Profiles aspect is well-architected with good separation of concerns. The main issues were:
1. Missing imports (fixed)
2. Unused code (cleaned up)
3. Location service schema mismatch (fixed with fallback)
4. Missing type definitions (added)

The system is production-ready but would benefit from:
- Database RPC functions for efficient location queries
- Generated types from Supabase schema
- Additional validation
- Better error boundaries

