-- Migration: Private Messaging (1-on-1)
-- Adds tables for private conversations and messages between individual users

-- Create private_conversations table
CREATE TABLE IF NOT EXISTS public.private_conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user1_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user2_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_message_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(user1_id, user2_id),
  CONSTRAINT different_users CHECK (user1_id != user2_id)
);

-- Create private_messages table
CREATE TABLE IF NOT EXISTS public.private_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES public.private_conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  attachment_url TEXT,
  attachment_type TEXT,
  attachment_name TEXT,
  attachment_size INTEGER,
  edited_at TIMESTAMP WITH TIME ZONE,
  deleted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create private_message_reads table for read receipts
CREATE TABLE IF NOT EXISTS public.private_message_reads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id UUID NOT NULL REFERENCES public.private_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(message_id, user_id)
);

-- Create private_conversation_reads table for tracking last read time per user per conversation
CREATE TABLE IF NOT EXISTS public.private_conversation_reads (
  conversation_id UUID NOT NULL REFERENCES public.private_conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  last_read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (conversation_id, user_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_private_conversations_user1 ON public.private_conversations(user1_id);
CREATE INDEX IF NOT EXISTS idx_private_conversations_user2 ON public.private_conversations(user2_id);
CREATE INDEX IF NOT EXISTS idx_private_conversations_updated ON public.private_conversations(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_private_conversations_last_message ON public.private_conversations(last_message_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_private_messages_conversation ON public.private_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_private_messages_created ON public.private_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_private_messages_sender ON public.private_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_private_messages_recipient ON public.private_messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_private_messages_deleted ON public.private_messages(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_private_message_reads_message ON public.private_message_reads(message_id);
CREATE INDEX IF NOT EXISTS idx_private_message_reads_user ON public.private_message_reads(user_id);
CREATE INDEX IF NOT EXISTS idx_private_conversation_reads_conversation ON public.private_conversation_reads(conversation_id);
CREATE INDEX IF NOT EXISTS idx_private_conversation_reads_user ON public.private_conversation_reads(user_id);

-- Function to update conversation updated_at and last_message_at when a message is created
CREATE OR REPLACE FUNCTION update_private_conversation_on_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.private_conversations
  SET 
    updated_at = NOW(),
    last_message_at = NEW.created_at
  WHERE id = NEW.conversation_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update conversation timestamps on message insert
CREATE TRIGGER update_private_conversation_timestamp
  AFTER INSERT ON public.private_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_private_conversation_on_message();

-- Enable RLS on all tables
ALTER TABLE public.private_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.private_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.private_message_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.private_conversation_reads ENABLE ROW LEVEL SECURITY;

-- RLS Policies for private_conversations
-- Users can only view conversations they're a participant in
CREATE POLICY "Users can view their own private conversations" ON public.private_conversations
  FOR SELECT
  USING (
    user1_id = (SELECT id FROM public.profiles WHERE id::text = auth.uid()::text)
    OR user2_id = (SELECT id FROM public.profiles WHERE id::text = auth.uid()::text)
  );

-- Users can create conversations they're a participant in
CREATE POLICY "Users can create private conversations" ON public.private_conversations
  FOR INSERT
  WITH CHECK (
    user1_id = (SELECT id FROM public.profiles WHERE id::text = auth.uid()::text)
    OR user2_id = (SELECT id FROM public.profiles WHERE id::text = auth.uid()::text)
  );

-- Users can update conversations they're in (for updated_at and last_message_at)
CREATE POLICY "Users can update their private conversations" ON public.private_conversations
  FOR UPDATE
  USING (
    user1_id = (SELECT id FROM public.profiles WHERE id::text = auth.uid()::text)
    OR user2_id = (SELECT id FROM public.profiles WHERE id::text = auth.uid()::text)
  )
  WITH CHECK (
    user1_id = (SELECT id FROM public.profiles WHERE id::text = auth.uid()::text)
    OR user2_id = (SELECT id FROM public.profiles WHERE id::text = auth.uid()::text)
  );

-- RLS Policies for private_messages
-- Users can only view messages from conversations they're in
CREATE POLICY "Users can view messages from their conversations" ON public.private_messages
  FOR SELECT
  USING (
    conversation_id IN (
      SELECT id FROM public.private_conversations
      WHERE user1_id = (SELECT id FROM public.profiles WHERE id::text = auth.uid()::text)
         OR user2_id = (SELECT id FROM public.profiles WHERE id::text = auth.uid()::text)
    )
  );

-- Users can only send messages to conversations they're in
CREATE POLICY "Users can send messages to their conversations" ON public.private_messages
  FOR INSERT
  WITH CHECK (
    sender_id = (SELECT id FROM public.profiles WHERE id::text = auth.uid()::text)
    AND conversation_id IN (
      SELECT id FROM public.private_conversations
      WHERE user1_id = (SELECT id FROM public.profiles WHERE id::text = auth.uid()::text)
         OR user2_id = (SELECT id FROM public.profiles WHERE id::text = auth.uid()::text)
    )
  );

-- Users can only edit/delete their own messages
CREATE POLICY "Users can update their own private messages" ON public.private_messages
  FOR UPDATE
  USING (
    sender_id = (SELECT id FROM public.profiles WHERE id::text = auth.uid()::text)
  )
  WITH CHECK (
    sender_id = (SELECT id FROM public.profiles WHERE id::text = auth.uid()::text)
  );

-- RLS Policies for private_message_reads
-- Users can view read receipts for messages in their conversations
CREATE POLICY "Users can view read receipts for their conversations" ON public.private_message_reads
  FOR SELECT
  USING (
    message_id IN (
      SELECT id FROM public.private_messages
      WHERE conversation_id IN (
        SELECT id FROM public.private_conversations
        WHERE user1_id = (SELECT id FROM public.profiles WHERE id::text = auth.uid()::text)
           OR user2_id = (SELECT id FROM public.profiles WHERE id::text = auth.uid()::text)
      )
    )
  );

-- Users can create read receipts for messages in their conversations
CREATE POLICY "Users can create read receipts for their conversations" ON public.private_message_reads
  FOR INSERT
  WITH CHECK (
    user_id = (SELECT id FROM public.profiles WHERE id::text = auth.uid()::text)
    AND message_id IN (
      SELECT id FROM public.private_messages
      WHERE conversation_id IN (
        SELECT id FROM public.private_conversations
        WHERE user1_id = (SELECT id FROM public.profiles WHERE id::text = auth.uid()::text)
           OR user2_id = (SELECT id FROM public.profiles WHERE id::text = auth.uid()::text)
      )
    )
  );

-- RLS Policies for private_conversation_reads
-- Users can view their own conversation read receipts
CREATE POLICY "Users can view their own conversation read receipts" ON public.private_conversation_reads
  FOR SELECT
  USING (
    user_id = (SELECT id FROM public.profiles WHERE id::text = auth.uid()::text)
    AND conversation_id IN (
      SELECT id FROM public.private_conversations
      WHERE user1_id = (SELECT id FROM public.profiles WHERE id::text = auth.uid()::text)
         OR user2_id = (SELECT id FROM public.profiles WHERE id::text = auth.uid()::text)
    )
  );

-- Users can update their own conversation read receipts
CREATE POLICY "Users can update their own conversation read receipts" ON public.private_conversation_reads
  FOR ALL
  USING (
    user_id = (SELECT id FROM public.profiles WHERE id::text = auth.uid()::text)
  )
  WITH CHECK (
    user_id = (SELECT id FROM public.profiles WHERE id::text = auth.uid()::text)
  );

-- Add comments for documentation
COMMENT ON TABLE public.private_conversations IS '1-on-1 conversations between two users. Uses canonical ordering (user1_id < user2_id) to prevent duplicates.';
COMMENT ON TABLE public.private_messages IS 'Messages in private conversations. Includes attachment support and soft delete.';
COMMENT ON TABLE public.private_message_reads IS 'Read receipts for individual private messages.';
COMMENT ON TABLE public.private_conversation_reads IS 'Tracks last read time per user per conversation for unread count calculation.';

