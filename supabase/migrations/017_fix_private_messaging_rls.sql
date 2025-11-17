-- Migration: Fix Private Messaging RLS Policies
-- Date: 2024-12-19
-- Description: Ensures RLS policies exist for private_conversations and private_messages tables
--              Fixes linter warnings about RLS enabled but no policies

-- Drop existing policies if they exist (to recreate with simpler syntax)
DROP POLICY IF EXISTS "Users can view their own private conversations" ON public.private_conversations;
DROP POLICY IF EXISTS "Users can create private conversations" ON public.private_conversations;
DROP POLICY IF EXISTS "Users can update their private conversations" ON public.private_conversations;

DROP POLICY IF EXISTS "Users can view messages from their conversations" ON public.private_messages;
DROP POLICY IF EXISTS "Users can send messages to their conversations" ON public.private_messages;
DROP POLICY IF EXISTS "Users can update their own private messages" ON public.private_messages;

-- RLS Policies for private_conversations
-- Users can only view conversations they're a participant in
-- Wrap auth.uid() in (select auth.uid()) for better performance (consistent with migration 014)
CREATE POLICY "Users can view their own private conversations" 
ON public.private_conversations
FOR SELECT
USING (
  user1_id = (select auth.uid())
  OR user2_id = (select auth.uid())
);

-- Users can create conversations they're a participant in
CREATE POLICY "Users can create private conversations" 
ON public.private_conversations
FOR INSERT
WITH CHECK (
  user1_id = (select auth.uid())
  OR user2_id = (select auth.uid())
);

-- Users can update conversations they're in (for updated_at and last_message_at)
CREATE POLICY "Users can update their private conversations" 
ON public.private_conversations
FOR UPDATE
USING (
  user1_id = (select auth.uid())
  OR user2_id = (select auth.uid())
)
WITH CHECK (
  user1_id = (select auth.uid())
  OR user2_id = (select auth.uid())
);

-- RLS Policies for private_messages
-- Users can only view messages from conversations they're in
CREATE POLICY "Users can view messages from their conversations" 
ON public.private_messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.private_conversations
    WHERE id = private_messages.conversation_id
    AND (user1_id = (select auth.uid()) OR user2_id = (select auth.uid()))
  )
);

-- Users can only send messages to conversations they're in
CREATE POLICY "Users can send messages to their conversations" 
ON public.private_messages
FOR INSERT
WITH CHECK (
  sender_id = (select auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.private_conversations
    WHERE id = private_messages.conversation_id
    AND (user1_id = (select auth.uid()) OR user2_id = (select auth.uid()))
  )
);

-- Users can only edit/delete their own messages
CREATE POLICY "Users can update their own private messages" 
ON public.private_messages
FOR UPDATE
USING (
  sender_id = (select auth.uid())
)
WITH CHECK (
  sender_id = (select auth.uid())
);

-- Verify policies were created
DO $$
DECLARE
  conversation_policy_count INTEGER;
  message_policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO conversation_policy_count
  FROM pg_policies
  WHERE schemaname = 'public' 
  AND tablename = 'private_conversations';
  
  SELECT COUNT(*) INTO message_policy_count
  FROM pg_policies
  WHERE schemaname = 'public' 
  AND tablename = 'private_messages';
  
  IF conversation_policy_count = 0 THEN
    RAISE EXCEPTION 'Failed to create policies for private_conversations';
  END IF;
  
  IF message_policy_count = 0 THEN
    RAISE EXCEPTION 'Failed to create policies for private_messages';
  END IF;
  
  RAISE NOTICE 'Successfully created % policies for private_conversations and % policies for private_messages', 
    conversation_policy_count, message_policy_count;
END $$;

