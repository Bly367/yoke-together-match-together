-- RPC Functions for optimized queries
-- These functions provide server-side optimizations for common operations

-- Function to update user location using PostGIS
-- This function handles the PostGIS POINT format correctly
CREATE OR REPLACE FUNCTION update_user_location(
  user_id UUID,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Validate coordinates
  IF lat < -90 OR lat > 90 THEN
    RAISE EXCEPTION 'Latitude must be between -90 and 90';
  END IF;
  
  IF lng < -180 OR lng > 180 THEN
    RAISE EXCEPTION 'Longitude must be between -180 and 180';
  END IF;
  
  -- Update profile with PostGIS POINT (longitude, latitude)
  UPDATE public.profiles
  SET 
    location = ST_SetSRID(ST_MakePoint(lng, lat), 4326),
    location_updated_at = NOW()
  WHERE id = user_id;
END;
$$;

-- Function to get nearby profiles using PostGIS
-- Returns profiles within radius_meters of the given location
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
  location_visible BOOLEAN,
  distance_meters DOUBLE PRECISION
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Validate coordinates
  IF lat < -90 OR lat > 90 THEN
    RAISE EXCEPTION 'Latitude must be between -90 and 90';
  END IF;
  
  IF lng < -180 OR lng > 180 THEN
    RAISE EXCEPTION 'Longitude must be between -180 and 180';
  END IF;
  
  -- Validate radius
  IF radius_meters <= 0 OR radius_meters > 1000000 THEN
    RAISE EXCEPTION 'Radius must be between 1 and 1000000 meters';
  END IF;
  
  RETURN QUERY
  SELECT 
    p.id,
    p.name,
    p.age,
    p.photo_url,
    COALESCE(p.location_visible, true) as location_visible,
    ST_Distance(
      ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography,
      p.location::geography
    ) as distance_meters
  FROM public.profiles p
  WHERE 
    p.id != user_id
    AND p.location IS NOT NULL
    AND ST_DWithin(
      ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography,
      p.location::geography,
      radius_meters
    )
  ORDER BY distance_meters ASC
  LIMIT 200;
END;
$$;

-- Note: get_unread_count function already exists in 002_chat_enhancements.sql
-- This migration only adds location-related RPC functions

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION update_user_location(UUID, DOUBLE PRECISION, DOUBLE PRECISION) TO authenticated;
GRANT EXECUTE ON FUNCTION get_nearby_profiles(UUID, DOUBLE PRECISION, DOUBLE PRECISION, INTEGER) TO authenticated;

