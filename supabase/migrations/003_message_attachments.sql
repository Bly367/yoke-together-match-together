-- Migration: Message Attachments Support
-- Adds support for file attachments in messages

-- Add attachment columns to messages table
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS attachment_url TEXT,
  ADD COLUMN IF NOT EXISTS attachment_type TEXT,
  ADD COLUMN IF NOT EXISTS attachment_name TEXT,
  ADD COLUMN IF NOT EXISTS attachment_size INTEGER;

-- Add index for attachment queries
CREATE INDEX IF NOT EXISTS idx_messages_attachment ON public.messages(attachment_url) WHERE attachment_url IS NOT NULL;

-- Update RLS policies to allow attachments (already covered by existing message policies)

-- Storage policies for message attachments
-- Note: These policies extend the existing photos bucket to support message attachments
-- Path structure: messages/{matchId}/{userId}/{filename}

-- Allow authenticated users to upload message attachments
-- Drop policy if it exists (for idempotent migrations)
DROP POLICY IF EXISTS "Users can upload message attachments" ON storage.objects;
CREATE POLICY "Users can upload message attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'photos' 
  AND (storage.foldername(name))[1] = 'messages'
  AND (storage.foldername(name))[3] = auth.uid()::text
);

-- Allow authenticated users to update their own message attachments
DROP POLICY IF EXISTS "Users can update own message attachments" ON storage.objects;
CREATE POLICY "Users can update own message attachments"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'photos' 
  AND (storage.foldername(name))[1] = 'messages'
  AND (storage.foldername(name))[3] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'photos' 
  AND (storage.foldername(name))[1] = 'messages'
  AND (storage.foldername(name))[3] = auth.uid()::text
);

-- Allow authenticated users to delete their own message attachments
DROP POLICY IF EXISTS "Users can delete own message attachments" ON storage.objects;
CREATE POLICY "Users can delete own message attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'photos' 
  AND (storage.foldername(name))[1] = 'messages'
  AND (storage.foldername(name))[3] = auth.uid()::text
);

-- Message attachments are publicly readable (already covered by existing "Photos are publicly readable" policy)

