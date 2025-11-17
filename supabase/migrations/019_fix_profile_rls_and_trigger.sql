-- Migration: Fix Profile RLS Policies and Create Trigger
-- This ensures profiles can be created both via trigger (automatic) and manually (when needed)
-- Run this migration to fix RLS policy violations when creating profiles

-- Step 1: Ensure RLS policies allow users to insert their own profiles
-- Drop existing policy if it exists (for idempotent migrations)
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

-- Recreate the INSERT policy with proper permissions
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT 
  WITH CHECK (auth.uid() = id);

-- Step 2: Create or replace the profile creation trigger function
-- This trigger automatically creates a profile when a user signs up
-- It uses SECURITY DEFINER to bypass RLS, so it always works
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert a new profile for the new user
  INSERT INTO public.profiles (id, email, name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', 'User')
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Step 3: Create or replace the trigger
-- Drop existing trigger if it exists (for idempotent migrations)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create the trigger that fires when a new user is created
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Step 4: Verify the setup
-- Check that the trigger exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.triggers
    WHERE trigger_name = 'on_auth_user_created'
    AND event_object_table = 'users'
  ) THEN
    RAISE NOTICE '✅ Profile creation trigger created successfully!';
  ELSE
    RAISE WARNING '❌ Profile creation trigger was not created.';
  END IF;
END $$;

-- Check that the INSERT policy exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'profiles'
    AND policyname = 'Users can insert own profile'
  ) THEN
    RAISE NOTICE '✅ Profile INSERT policy created successfully!';
  ELSE
    RAISE WARNING '❌ Profile INSERT policy was not created.';
  END IF;
END $$;

