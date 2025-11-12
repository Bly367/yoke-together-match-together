-- Setup Storage Bucket for Photos
-- Run this in Supabase SQL Editor after creating the database schema

-- Create storage bucket for photos (if it doesn't exist)
INSERT INTO storage.buckets (id, name, public)
VALUES ('photos', 'photos', true)
ON CONFLICT (id) DO NOTHING;

-- Set up storage policies for photos bucket
-- Allow authenticated users to upload photos
CREATE POLICY "Users can upload own photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'photos' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to update their own photos
CREATE POLICY "Users can update own photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'photos' 
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'photos' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to delete their own photos
CREATE POLICY "Users can delete own photos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'photos' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow public read access to photos
CREATE POLICY "Photos are publicly readable"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'photos');

-- Verify bucket was created
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'photos') THEN
    RAISE NOTICE '✅ Storage bucket "photos" created successfully!';
  ELSE
    RAISE NOTICE '❌ Storage bucket "photos" was not created.';
  END IF;
END $$;

