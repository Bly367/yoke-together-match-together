-- Setup Storage Policies for Message Attachments
-- Run this in Supabase SQL Editor after running the message attachments migration
-- This extends the existing photos bucket policies to support message attachments

-- Allow authenticated users to upload message attachments
-- Path structure: messages/{matchId}/{userId}/{filename}
CREATE POLICY "Users can upload message attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'photos' 
  AND (storage.foldername(name))[1] = 'messages'
  AND (storage.foldername(name))[3] = auth.uid()::text
);

-- Allow authenticated users to update their own message attachments
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
CREATE POLICY "Users can delete own message attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'photos' 
  AND (storage.foldername(name))[1] = 'messages'
  AND (storage.foldername(name))[3] = auth.uid()::text
);

-- Message attachments are publicly readable (already covered by existing "Photos are publicly readable" policy)
-- No additional policy needed since the existing SELECT policy covers all photos bucket objects

-- Verify policies were created
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Users can upload message attachments'
  ) THEN
    RAISE NOTICE '✅ Message attachment storage policies created successfully!';
  ELSE
    RAISE NOTICE '❌ Message attachment storage policies were not created.';
  END IF;
END $$;

