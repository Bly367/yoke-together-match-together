-- Migration: Chat Customization
-- Adds name field to matches and private_conversations for custom chat names
-- Adds left_at field to track when users leave conversations

-- Add name field to matches table
ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS name TEXT;

-- Add name field to private_conversations table
ALTER TABLE public.private_conversations
  ADD COLUMN IF NOT EXISTS name TEXT;

-- Create match_participants table to track who has left a match
CREATE TABLE IF NOT EXISTS public.match_participants (
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  left_at TIMESTAMP WITH TIME ZONE,
  PRIMARY KEY (match_id, user_id)
);

-- Create private_conversation_participants table to track who has left a private conversation
CREATE TABLE IF NOT EXISTS public.private_conversation_participants (
  conversation_id UUID NOT NULL REFERENCES public.private_conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  left_at TIMESTAMP WITH TIME ZONE,
  PRIMARY KEY (conversation_id, user_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_match_participants_match ON public.match_participants(match_id);
CREATE INDEX IF NOT EXISTS idx_match_participants_user ON public.match_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_private_conversation_participants_conversation ON public.private_conversation_participants(conversation_id);
CREATE INDEX IF NOT EXISTS idx_private_conversation_participants_user ON public.private_conversation_participants(user_id);

-- Enable RLS
ALTER TABLE public.match_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.private_conversation_participants ENABLE ROW LEVEL SECURITY;

-- RLS Policies for match_participants
CREATE POLICY "Users can view participants for their matches" ON public.match_participants
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.matches
      JOIN public.duos ON (duos.id = matches.duo1_id OR duos.id = matches.duo2_id)
      WHERE matches.id = match_participants.match_id
      AND (duos.member1_id = (SELECT id FROM public.profiles WHERE id::text = auth.uid()::text)
           OR duos.member2_id = (SELECT id FROM public.profiles WHERE id::text = auth.uid()::text))
    )
  );

CREATE POLICY "Users can update their own match participation" ON public.match_participants
  FOR ALL
  USING (
    user_id = (SELECT id FROM public.profiles WHERE id::text = auth.uid()::text)
  )
  WITH CHECK (
    user_id = (SELECT id FROM public.profiles WHERE id::text = auth.uid()::text)
  );

-- RLS Policies for private_conversation_participants
CREATE POLICY "Users can view participants for their conversations" ON public.private_conversation_participants
  FOR SELECT
  USING (
    conversation_id IN (
      SELECT id FROM public.private_conversations
      WHERE user1_id = (SELECT id FROM public.profiles WHERE id::text = auth.uid()::text)
         OR user2_id = (SELECT id FROM public.profiles WHERE id::text = auth.uid()::text)
    )
  );

CREATE POLICY "Users can update their own conversation participation" ON public.private_conversation_participants
  FOR ALL
  USING (
    user_id = (SELECT id FROM public.profiles WHERE id::text = auth.uid()::text)
  )
  WITH CHECK (
    user_id = (SELECT id FROM public.profiles WHERE id::text = auth.uid()::text)
  );

-- Add comments
COMMENT ON COLUMN public.matches.name IS 'Custom name for the match/group chat. If null, uses default duo names.';
COMMENT ON COLUMN public.private_conversations.name IS 'Custom name for the private conversation. If null, uses other user name.';
COMMENT ON TABLE public.match_participants IS 'Tracks which users have left a match. Users with left_at IS NULL are active participants.';
COMMENT ON TABLE public.private_conversation_participants IS 'Tracks which users have left a private conversation. Users with left_at IS NULL are active participants.';

