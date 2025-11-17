-- Migration: Fix Messages RLS Policy - Add Diagnostic and Improve Policy
-- Fixes RLS policy violations for messages by ensuring proper duo membership checks

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Users can send messages to own matches" ON public.messages;

-- Create improved RLS policy with better error handling
-- This policy ensures:
-- 1. The sender_id matches the authenticated user
-- 2. The user is a member of one of the duos in the match
-- 3. The match exists and is active
CREATE POLICY "Users can send messages to own matches" ON public.messages
  FOR INSERT WITH CHECK (
    -- Ensure sender_id matches authenticated user
    auth.uid() = sender_id
    AND auth.uid() IS NOT NULL
    -- Ensure user is a member of one of the duos in the match
    AND EXISTS (
      SELECT 1 
      FROM public.matches m
      WHERE m.id = messages.match_id
        AND m.is_active = true
        AND (
          -- Check if user is in duo1
          EXISTS (
            SELECT 1 
            FROM public.duos d1
            WHERE d1.id = m.duo1_id
              AND d1.is_active = true
              AND (d1.member1_id = auth.uid() OR d1.member2_id = auth.uid())
          )
          OR
          -- Check if user is in duo2
          EXISTS (
            SELECT 1 
            FROM public.duos d2
            WHERE d2.id = m.duo2_id
              AND d2.is_active = true
              AND (d2.member1_id = auth.uid() OR d2.member2_id = auth.uid())
          )
        )
    )
  );

-- Create a diagnostic function to help debug RLS issues
CREATE OR REPLACE FUNCTION public.check_message_permission(
  p_match_id UUID,
  p_sender_id UUID
)
RETURNS TABLE (
  can_send BOOLEAN,
  reason TEXT,
  match_exists BOOLEAN,
  match_active BOOLEAN,
  user_in_duo1 BOOLEAN,
  user_in_duo2 BOOLEAN,
  auth_uid UUID,
  sender_matches_auth BOOLEAN
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_auth_uid UUID;
  v_match_exists BOOLEAN;
  v_match_active BOOLEAN;
  v_user_in_duo1 BOOLEAN;
  v_user_in_duo2 BOOLEAN;
  v_sender_matches_auth BOOLEAN;
BEGIN
  -- Get current authenticated user
  v_auth_uid := auth.uid();
  
  -- Check if sender matches auth
  v_sender_matches_auth := (v_auth_uid = p_sender_id);
  
  -- Check if match exists and is active
  SELECT EXISTS(SELECT 1 FROM public.matches WHERE id = p_match_id),
         COALESCE((SELECT is_active FROM public.matches WHERE id = p_match_id), false)
  INTO v_match_exists, v_match_active;
  
  -- Check if user is in duo1
  SELECT EXISTS(
    SELECT 1 
    FROM public.matches m
    JOIN public.duos d ON d.id = m.duo1_id
    WHERE m.id = p_match_id
      AND (d.member1_id = v_auth_uid OR d.member2_id = v_auth_uid)
      AND d.is_active = true
  ) INTO v_user_in_duo1;
  
  -- Check if user is in duo2
  SELECT EXISTS(
    SELECT 1 
    FROM public.matches m
    JOIN public.duos d ON d.id = m.duo2_id
    WHERE m.id = p_match_id
      AND (d.member1_id = v_auth_uid OR d.member2_id = v_auth_uid)
      AND d.is_active = true
  ) INTO v_user_in_duo2;
  
  -- Determine if user can send
  RETURN QUERY SELECT
    (v_sender_matches_auth 
     AND v_match_exists 
     AND v_match_active 
     AND (v_user_in_duo1 OR v_user_in_duo2)) as can_send,
    CASE
      WHEN v_auth_uid IS NULL THEN 'User not authenticated'
      WHEN NOT v_sender_matches_auth THEN 'sender_id does not match authenticated user'
      WHEN NOT v_match_exists THEN 'Match does not exist'
      WHEN NOT v_match_active THEN 'Match is not active'
      WHEN NOT (v_user_in_duo1 OR v_user_in_duo2) THEN 'User is not a member of either duo in the match'
      ELSE 'Permission granted'
    END as reason,
    v_match_exists as match_exists,
    v_match_active as match_active,
    v_user_in_duo1 as user_in_duo1,
    v_user_in_duo2 as user_in_duo2,
    v_auth_uid as auth_uid,
    v_sender_matches_auth as sender_matches_auth;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.check_message_permission(UUID, UUID) TO authenticated;

