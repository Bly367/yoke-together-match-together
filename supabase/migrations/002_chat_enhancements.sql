-- Migration: Chat & Messaging Enhancements
-- Adds: read receipts, unread tracking, message editing, soft delete, and pagination support

-- Add edited_at and deleted_at to messages table
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS edited_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

-- Create message_reads table for read receipts
CREATE TABLE IF NOT EXISTS public.message_reads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(message_id, user_id)
);

-- Create match_reads table for tracking last read time per user per match (for unread counts)
CREATE TABLE IF NOT EXISTS public.match_reads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  last_read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(match_id, user_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_message_reads_message ON public.message_reads(message_id);
CREATE INDEX IF NOT EXISTS idx_message_reads_user ON public.message_reads(user_id);
CREATE INDEX IF NOT EXISTS idx_match_reads_match ON public.match_reads(match_id);
CREATE INDEX IF NOT EXISTS idx_match_reads_user ON public.match_reads(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_deleted ON public.messages(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_messages_edited ON public.messages(edited_at) WHERE edited_at IS NOT NULL;

-- RLS Policies for message_reads
ALTER TABLE public.message_reads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view read receipts for their matches" ON public.message_reads
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.messages
      JOIN public.matches ON matches.id = messages.match_id
      JOIN public.duos ON (duos.id = matches.duo1_id OR duos.id = matches.duo2_id)
      WHERE messages.id = message_reads.message_id
      AND (duos.member1_id = auth.uid() OR duos.member2_id = auth.uid())
    )
  );

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

-- RLS Policies for match_reads
ALTER TABLE public.match_reads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view match read status for their matches" ON public.match_reads
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.matches
      JOIN public.duos ON (duos.id = matches.duo1_id OR duos.id = matches.duo2_id)
      WHERE matches.id = match_reads.match_id
      AND (duos.member1_id = auth.uid() OR duos.member2_id = auth.uid())
    )
  );

CREATE POLICY "Users can update their match read status" ON public.match_reads
  FOR ALL USING (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.matches
      JOIN public.duos ON (duos.id = matches.duo1_id OR duos.id = matches.duo2_id)
      WHERE matches.id = match_reads.match_id
      AND (duos.member1_id = auth.uid() OR duos.member2_id = auth.uid())
    )
  );

-- Update messages RLS to allow updates for editing and soft delete
CREATE POLICY "Users can update own messages" ON public.messages
  FOR UPDATE USING (
    auth.uid() = sender_id
    AND deleted_at IS NULL
  );

-- Function to get unread message count for a match
CREATE OR REPLACE FUNCTION public.get_unread_count(match_uuid UUID, user_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
  last_read TIMESTAMP WITH TIME ZONE;
  unread_count INTEGER;
BEGIN
  -- Get last read time for this user in this match
  SELECT last_read_at INTO last_read
  FROM public.match_reads
  WHERE match_id = match_uuid AND user_id = user_uuid;
  
  -- Count messages created after last read (or all if never read)
  SELECT COUNT(*) INTO unread_count
  FROM public.messages
  WHERE match_id = match_uuid
    AND sender_id != user_uuid
    AND deleted_at IS NULL
    AND (last_read IS NULL OR created_at > last_read);
  
  RETURN COALESCE(unread_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

