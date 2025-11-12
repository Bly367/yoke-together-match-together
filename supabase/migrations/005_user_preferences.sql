-- Migration: User Preferences for Matching
-- Adds gender and preference fields to profiles table for filtering matches

-- Add gender column to profiles table
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS gender TEXT CHECK (gender IN ('man', 'woman', 'non-binary', 'prefer-not-to-say'));

-- Add preference column (who they want to match with)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS preference TEXT CHECK (preference IN ('men', 'women', 'both')) DEFAULT 'both';

-- Add indexes for filtering
CREATE INDEX IF NOT EXISTS idx_profiles_gender ON public.profiles(gender) WHERE gender IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_preference ON public.profiles(preference);

-- Add comments for documentation
COMMENT ON COLUMN public.profiles.gender IS 'User gender: man, woman, non-binary, or prefer-not-to-say';
COMMENT ON COLUMN public.profiles.preference IS 'Who user wants to match with: men, women, or both';

