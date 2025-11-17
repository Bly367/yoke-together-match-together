-- Migration: Fix RLS Performance Warnings
-- Fixes auth RLS initialization plan warnings and consolidates multiple permissive policies
-- Also removes duplicate indexes

-- ============================================================================
-- 1. Fix Auth RLS Initialization Plan Warnings
-- Wrap auth.uid() calls in (select auth.uid()) for better performance
-- ============================================================================

-- Fix private_conversation_reads policies
-- Wrap auth.uid() in (select auth.uid()) to avoid re-evaluation per row
DROP POLICY IF EXISTS "Users can view their own conversation read receipts" ON public.private_conversation_reads;
CREATE POLICY "Users can view their own conversation read receipts" ON public.private_conversation_reads
  FOR SELECT
  USING (
    user_id = (select auth.uid())
    AND conversation_id IN (
      SELECT id FROM public.private_conversations
      WHERE user1_id = (select auth.uid())
         OR user2_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update their own conversation read receipts" ON public.private_conversation_reads;
CREATE POLICY "Users can update their own conversation read receipts" ON public.private_conversation_reads
  FOR ALL
  USING (
    user_id = (select auth.uid())
  )
  WITH CHECK (
    user_id = (select auth.uid())
  );

-- Fix user_preferences policies
DROP POLICY IF EXISTS "Users can view their own preferences" ON public.user_preferences;
CREATE POLICY "Users can view their own preferences"
  ON public.user_preferences FOR SELECT
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert their own preferences" ON public.user_preferences;
CREATE POLICY "Users can insert their own preferences"
  ON public.user_preferences FOR INSERT
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete their own preferences" ON public.user_preferences;
CREATE POLICY "Users can delete their own preferences"
  ON public.user_preferences FOR DELETE
  USING ((select auth.uid()) = user_id);

-- Note: Update policy already uses auth.uid() correctly, but we'll wrap it for consistency
DROP POLICY IF EXISTS "Users can update their own preferences" ON public.user_preferences;
CREATE POLICY "Users can update their own preferences"
  ON public.user_preferences FOR UPDATE
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- ============================================================================
-- 2. Consolidate Multiple Permissive Policies
-- Combine multiple policies for the same role/action into single policies
-- ============================================================================

-- Fix duo_requests: Merge two UPDATE policies into one
DROP POLICY IF EXISTS "Users can update received requests" ON public.duo_requests;
DROP POLICY IF EXISTS "Users can cancel sent requests" ON public.duo_requests;
CREATE POLICY "Users can update their own requests" ON public.duo_requests
  FOR UPDATE USING (
    -- Users can update requests they received (to accept/reject)
    (select auth.uid()) = requested_id
    -- OR users can update requests they sent (to cancel, but only if pending)
    OR ((select auth.uid()) = requester_id AND status = 'pending')
  );

-- Fix duos: Merge two SELECT policies into one
DROP POLICY IF EXISTS "Active duos are viewable by everyone" ON public.duos;
DROP POLICY IF EXISTS "Users can view own duos" ON public.duos;
CREATE POLICY "Users can view duos" ON public.duos
  FOR SELECT USING (
    -- Users can view active duos (for matching)
    is_active = true
    -- OR users can view their own duos (regardless of active status)
    OR (select auth.uid()) = member1_id 
    OR (select auth.uid()) = member2_id
  );

-- Fix match_participants: Consolidate multiple policies
-- The warning indicates duplicate policies. We have:
-- "Users can view participants for their matches" (SELECT)
-- "Users can update their own match participation" (ALL which includes SELECT)
-- FOR ALL includes SELECT, so SELECT is covered twice. We need to separate them.
DROP POLICY IF EXISTS "Users can update their match participation" ON public.match_participants;
DROP POLICY IF EXISTS "Users can view participants for their matches" ON public.match_participants;
DROP POLICY IF EXISTS "Users can update their own match participation" ON public.match_participants;
-- Create a single SELECT policy
CREATE POLICY "Users can view participants for their matches" ON public.match_participants
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.matches
      JOIN public.duos ON (duos.id = matches.duo1_id OR duos.id = matches.duo2_id)
      WHERE matches.id = match_participants.match_id
      AND (duos.member1_id = (select auth.uid()) OR duos.member2_id = (select auth.uid()))
    )
  );
-- Create separate policies for INSERT, UPDATE, DELETE (not SELECT)
-- Note: We need separate policies because PostgreSQL doesn't support comma-separated operations
CREATE POLICY "Users can insert their own match participation" ON public.match_participants
  FOR INSERT
  WITH CHECK (
    user_id = (select auth.uid())
  );

CREATE POLICY "Users can update their own match participation" ON public.match_participants
  FOR UPDATE
  USING (
    user_id = (select auth.uid())
  )
  WITH CHECK (
    user_id = (select auth.uid())
  );

CREATE POLICY "Users can delete their own match participation" ON public.match_participants
  FOR DELETE
  USING (
    user_id = (select auth.uid())
  );

-- Fix match_reads: Merge two SELECT policies into one
-- The warning says there are multiple SELECT policies
-- The original "Users can update their match read status" uses FOR ALL which includes SELECT
-- We'll create separate SELECT and INSERT/UPDATE/DELETE policies
DROP POLICY IF EXISTS "Users can view match read status for their matches" ON public.match_reads;
DROP POLICY IF EXISTS "Users can update their match read status" ON public.match_reads;
-- Create a single SELECT policy
CREATE POLICY "Users can view match read status for their matches" ON public.match_reads
  FOR SELECT USING (
    (select auth.uid()) = user_id
    OR EXISTS (
      SELECT 1 FROM public.matches
      JOIN public.duos ON (duos.id = matches.duo1_id OR duos.id = matches.duo2_id)
      WHERE matches.id = match_reads.match_id
      AND (duos.member1_id = (select auth.uid()) OR duos.member2_id = (select auth.uid()))
    )
  );
-- Create separate policies for INSERT, UPDATE, DELETE (not SELECT)
CREATE POLICY "Users can insert their match read status" ON public.match_reads
  FOR INSERT
  WITH CHECK (
    (select auth.uid()) = user_id
    AND EXISTS (
      SELECT 1 FROM public.matches
      JOIN public.duos ON (duos.id = matches.duo1_id OR duos.id = matches.duo2_id)
      WHERE matches.id = match_reads.match_id
      AND (duos.member1_id = (select auth.uid()) OR duos.member2_id = (select auth.uid()))
    )
  );

CREATE POLICY "Users can update their match read status" ON public.match_reads
  FOR UPDATE
  USING (
    (select auth.uid()) = user_id
    AND EXISTS (
      SELECT 1 FROM public.matches
      JOIN public.duos ON (duos.id = matches.duo1_id OR duos.id = matches.duo2_id)
      WHERE matches.id = match_reads.match_id
      AND (duos.member1_id = (select auth.uid()) OR duos.member2_id = (select auth.uid()))
    )
  )
  WITH CHECK (
    (select auth.uid()) = user_id
    AND EXISTS (
      SELECT 1 FROM public.matches
      JOIN public.duos ON (duos.id = matches.duo1_id OR duos.id = matches.duo2_id)
      WHERE matches.id = match_reads.match_id
      AND (duos.member1_id = (select auth.uid()) OR duos.member2_id = (select auth.uid()))
    )
  );

CREATE POLICY "Users can delete their match read status" ON public.match_reads
  FOR DELETE
  USING (
    (select auth.uid()) = user_id
    AND EXISTS (
      SELECT 1 FROM public.matches
      JOIN public.duos ON (duos.id = matches.duo1_id OR duos.id = matches.duo2_id)
      WHERE matches.id = match_reads.match_id
      AND (duos.member1_id = (select auth.uid()) OR duos.member2_id = (select auth.uid()))
    )
  );

-- Fix private_conversation_participants: Merge two SELECT policies into one
-- The warning says there are multiple SELECT policies
DROP POLICY IF EXISTS "Users can view participants for their conversations" ON public.private_conversation_participants;
DROP POLICY IF EXISTS "Users can update their own conversation participation" ON public.private_conversation_participants;
-- Create a single SELECT policy
CREATE POLICY "Users can view participants for their conversations" ON public.private_conversation_participants
  FOR SELECT USING (
    conversation_id IN (
      SELECT id FROM public.private_conversations
      WHERE user1_id = (select auth.uid())
         OR user2_id = (select auth.uid())
    )
  );
-- Create separate policies for INSERT, UPDATE, DELETE (not SELECT)
CREATE POLICY "Users can insert their own conversation participation" ON public.private_conversation_participants
  FOR INSERT
  WITH CHECK (
    user_id = (select auth.uid())
    AND conversation_id IN (
      SELECT id FROM public.private_conversations
      WHERE user1_id = (select auth.uid())
         OR user2_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can update their own conversation participation" ON public.private_conversation_participants
  FOR UPDATE
  USING (
    user_id = (select auth.uid())
    AND conversation_id IN (
      SELECT id FROM public.private_conversations
      WHERE user1_id = (select auth.uid())
         OR user2_id = (select auth.uid())
    )
  )
  WITH CHECK (
    user_id = (select auth.uid())
    AND conversation_id IN (
      SELECT id FROM public.private_conversations
      WHERE user1_id = (select auth.uid())
         OR user2_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can delete their own conversation participation" ON public.private_conversation_participants
  FOR DELETE
  USING (
    user_id = (select auth.uid())
    AND conversation_id IN (
      SELECT id FROM public.private_conversations
      WHERE user1_id = (select auth.uid())
         OR user2_id = (select auth.uid())
    )
  );

-- Fix private_conversation_reads: The warning says there are multiple SELECT policies
-- We have "Users can view their own conversation read receipts" (SELECT) 
-- and "Users can update their own conversation read receipts" (ALL which includes SELECT)
-- FOR ALL includes SELECT, so SELECT is covered by both policies. We need to separate them.
-- We'll keep the SELECT policy and change the ALL policy to only cover INSERT/UPDATE/DELETE
-- Actually, we already recreated the ALL policy above, but we also recreated the SELECT policy.
-- The issue is that FOR ALL includes SELECT, so we have two SELECT policies.
-- Solution: Change the ALL policy to only cover INSERT, UPDATE, DELETE (not SELECT)
DROP POLICY IF EXISTS "Users can update their own conversation read receipts" ON public.private_conversation_reads;
-- Create separate policies for INSERT, UPDATE, DELETE (not SELECT)
CREATE POLICY "Users can insert their own conversation read receipts" ON public.private_conversation_reads
  FOR INSERT
  WITH CHECK (
    user_id = (select auth.uid())
  );

CREATE POLICY "Users can update their own conversation read receipts" ON public.private_conversation_reads
  FOR UPDATE
  USING (
    user_id = (select auth.uid())
  )
  WITH CHECK (
    user_id = (select auth.uid())
  );

CREATE POLICY "Users can delete their own conversation read receipts" ON public.private_conversation_reads
  FOR DELETE
  USING (
    user_id = (select auth.uid())
  );
-- The SELECT policy we created above handles SELECT operations

-- ============================================================================
-- 3. Remove Duplicate Index
-- ============================================================================

-- Drop the duplicate index (keep idx_match_participants_user, drop idx_match_participants_user_id if it exists)
DROP INDEX IF EXISTS public.idx_match_participants_user_id;

