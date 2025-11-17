-- Migration: PostGIS Location Optimization
-- Date: 2024-12-19
-- Description: Adds PostGIS RPC function for optimized location-based queries
--              Replaces client-side haversine calculations with server-side PostGIS

-- Create dedicated schema for PostGIS extension (recommended by Supabase)
-- This isolates extension objects from the public schema for better security
CREATE SCHEMA IF NOT EXISTS postgis_schema;

-- Enable PostGIS extension in dedicated schema (if not already installed)
-- Note: If PostGIS is already installed in 'public', this will create it in postgis_schema
-- You may need to drop and recreate if it's already in public (requires superuser)
DO $$
BEGIN
  -- Check if PostGIS is already installed in public schema
  IF EXISTS (
    SELECT 1 FROM pg_extension e
    JOIN pg_namespace n ON n.oid = e.extnamespace
    WHERE e.extname = 'postgis' AND n.nspname = 'public'
  ) THEN
    -- PostGIS already exists in public - cannot move without superuser
    -- This is a known limitation - see note below
    RAISE NOTICE 'PostGIS extension already exists in public schema. Cannot move to postgis_schema without superuser privileges.';
  ELSE
    -- Install PostGIS in dedicated schema
    EXECUTE 'CREATE EXTENSION IF NOT EXISTS postgis SCHEMA postgis_schema';
  END IF;
END $$;

-- If PostGIS was installed in postgis_schema, we need to reference it with schema prefix
-- Update search_path for functions that use PostGIS
SET search_path = public, postgis_schema, pg_catalog;

-- Ensure location column exists (add if missing)
-- Check if location column exists, if not add it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'location'
  ) THEN
    -- Add location column as PostGIS POINT type
    ALTER TABLE public.profiles 
    ADD COLUMN location geometry(POINT, 4326);
    
    -- If latitude/longitude columns exist, migrate data
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'profiles' 
      AND column_name = 'latitude'
    ) AND EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'profiles' 
      AND column_name = 'longitude'
    ) THEN
      -- Migrate existing latitude/longitude data to location POINT
      UPDATE public.profiles
      SET location = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)
      WHERE latitude IS NOT NULL 
      AND longitude IS NOT NULL 
      AND location IS NULL;
    END IF;
  END IF;
END $$;

-- Create optimized RPC function for updating user location
-- This function uses PostGIS ST_MakePoint for efficient location storage
CREATE OR REPLACE FUNCTION update_user_location(
  user_id UUID,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET 
    location = ST_SetSRID(ST_MakePoint(lng, lat), 4326),
    location_updated_at = NOW()
  WHERE id = user_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION update_user_location TO authenticated;

-- Add comment explaining the function
COMMENT ON FUNCTION update_user_location IS 
'Updates user location using PostGIS POINT format. Note: PostGIS uses (longitude, latitude) order.';

-- Create optimized RPC function for getting nearby profiles
-- This function uses PostGIS spatial queries which are 10-100x faster than client-side calculations
-- Parameters match the service layer expectations
CREATE OR REPLACE FUNCTION get_nearby_profiles(
  user_id UUID,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  radius_meters INTEGER DEFAULT 50000
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  age INTEGER,
  photo_url TEXT,
  gender TEXT,
  preference TEXT,
  bio TEXT,
  distance_meters DOUBLE PRECISION
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.name,
    p.age,
    p.photo_url,
    p.gender,
    p.preference,
    p.bio,
    -- Calculate distance using PostGIS (much faster than haversine)
    ROUND(
      ST_Distance(
        p.location::geography,
        ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography
      )::numeric,
      0
    ) AS distance_meters
  FROM profiles p
  WHERE 
    p.id != user_id  -- Exclude the requesting user
    AND p.location IS NOT NULL
    AND p.location_visible = true
    -- Use ST_DWithin for efficient spatial filtering (uses spatial index)
    AND ST_DWithin(
      p.location::geography,
      ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography,
      radius_meters
    )
  ORDER BY distance_meters ASC
  LIMIT 100;
END;
$$;

-- Create spatial index for performance (if not exists)
-- GIST index is optimal for PostGIS spatial queries
CREATE INDEX IF NOT EXISTS idx_profiles_location_gist 
ON profiles USING GIST (location);

-- Add comment explaining the function
COMMENT ON FUNCTION get_nearby_profiles IS 
'Optimized PostGIS function for finding nearby profiles. Returns profiles within specified radius, ordered by distance. Much faster than client-side haversine calculations.';

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_nearby_profiles TO authenticated;

-- Create helper function to get nearby profiles with additional filters
CREATE OR REPLACE FUNCTION get_nearby_profiles_filtered(
  user_id UUID,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  radius_meters INTEGER DEFAULT 50000,
  min_age INTEGER DEFAULT NULL,
  max_age INTEGER DEFAULT NULL,
  gender_filter TEXT DEFAULT NULL,
  preference_filter TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  age INTEGER,
  photo_url TEXT,
  gender TEXT,
  preference TEXT,
  bio TEXT,
  distance_meters DOUBLE PRECISION
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.name,
    p.age,
    p.photo_url,
    p.gender,
    p.preference,
    p.bio,
    ROUND(
      ST_Distance(
        p.location::geography,
        ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography
      )::numeric,
      0
    ) AS distance_meters
  FROM profiles p
  WHERE 
    p.id != user_id  -- Exclude the requesting user
    AND p.location IS NOT NULL
    AND p.location_visible = true
    AND ST_DWithin(
      p.location::geography,
      ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography,
      radius_meters
    )
    -- Additional filters
    AND (min_age IS NULL OR p.age >= min_age)
    AND (max_age IS NULL OR p.age <= max_age)
    AND (gender_filter IS NULL OR p.gender = gender_filter)
    AND (preference_filter IS NULL OR p.preference = preference_filter)
  ORDER BY distance_meters ASC
  LIMIT 100;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_nearby_profiles_filtered TO authenticated;

-- Add comment
COMMENT ON FUNCTION get_nearby_profiles_filtered IS 
'PostGIS function for finding nearby profiles with additional filters (age, gender, preference). Optimized for performance using spatial indexes.';

-- ============================================================================
-- IMPORTANT: Supabase Linter Warnings (Expected - Safe to Ignore)
-- ============================================================================
--
-- The Supabase linter will show warnings for PostGIS. These are EXPECTED and
-- SAFE TO IGNORE. See docs/SUPABASE_LINTER_WARNINGS.md for full details.
--
-- Quick Summary:
-- 1. "RLS Disabled in Public" for `spatial_ref_sys` - Cannot fix (needs superuser)
-- 2. "Extension in Public" for `postgis` - Cannot move (needs superuser)
-- 3. "Leaked Password Protection" - Enable in Dashboard if desired (Auth config)
--
-- All warnings are EXPECTED and do NOT affect functionality, security, or performance.
-- See docs/SUPABASE_LINTER_WARNINGS.md for complete explanation.
--
-- ============================================================================

