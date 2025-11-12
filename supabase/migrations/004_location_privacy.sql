-- Migration: Location Privacy Setting
-- Adds location_visible column to profiles table for privacy control

-- Add location_visible column to profiles table
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS location_visible BOOLEAN DEFAULT true;

-- Add index for location visibility queries
CREATE INDEX IF NOT EXISTS idx_profiles_location_visible ON public.profiles(location_visible) WHERE location_visible = true;

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.location_visible IS 'Privacy setting: hide/show location (defaults to true for backward compatibility)';

