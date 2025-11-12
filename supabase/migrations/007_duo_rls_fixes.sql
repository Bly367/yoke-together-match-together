-- Migration: Fix RLS policies for duos to support multiple duos
-- Allows users to see their own duos (active or inactive) and delete their own duos

-- Add policy to allow users to see their own duos regardless of active status
-- This is needed for the Profile page to show all user's duos
CREATE POLICY "Users can view own duos" ON public.duos
  FOR SELECT USING (auth.uid() = member1_id OR auth.uid() = member2_id);

-- Add policy to allow users to delete their own duos
CREATE POLICY "Users can delete own duos" ON public.duos
  FOR DELETE USING (auth.uid() = member1_id OR auth.uid() = member2_id);

