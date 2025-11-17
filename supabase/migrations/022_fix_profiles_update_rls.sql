-- Migration: Fix profiles UPDATE RLS policy
-- Adds WITH CHECK clause to UPDATE policy to prevent 406 errors
-- The 406 error occurs when UPDATE policy doesn't have WITH CHECK clause

-- Drop existing UPDATE policy
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- Recreate UPDATE policy with both USING and WITH CHECK clauses
-- USING: checks if user can see the row to update
-- WITH CHECK: checks if the updated row values are allowed
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE 
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

