-- Migration: Fix message_reads upsert RLS policy
-- Adds UPDATE policy to allow upsert operations on message_reads table

-- Drop existing INSERT policy if it exists (we'll recreate it)
DROP POLICY IF EXISTS "Users can mark messages as read" ON public.message_reads;

-- Create INSERT policy for message_reads
CREATE POLICY "Users can mark messages as read" ON public.message_reads
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.messages
      JOIN public.matches ON matches.id = messages.match_id
      JOIN public.duos ON (duos.id = matches.duo1_id OR duos.id = matches.duo2_id)
      WHERE messages.id = message_reads.message_id
      AND (duos.member1_id = auth.uid() OR duos.member2_id = auth.uid())
    )
  );

-- Create UPDATE policy for message_reads (needed for upsert operations)
CREATE POLICY "Users can update their read receipts" ON public.message_reads
  FOR UPDATE USING (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.messages
      JOIN public.matches ON matches.id = messages.match_id
      JOIN public.duos ON (duos.id = matches.duo1_id OR duos.id = matches.duo2_id)
      WHERE messages.id = message_reads.message_id
      AND (duos.member1_id = auth.uid() OR duos.member2_id = auth.uid())
    )
  )
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.messages
      JOIN public.matches ON matches.id = messages.match_id
      JOIN public.duos ON (duos.id = matches.duo1_id OR duos.id = matches.duo2_id)
      WHERE messages.id = message_reads.message_id
      AND (duos.member1_id = auth.uid() OR duos.member2_id = auth.uid())
    )
  );

