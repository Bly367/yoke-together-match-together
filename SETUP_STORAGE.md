# Setup Storage Bucket for Photos

## Overview
This guide explains how to set up the Supabase storage bucket for photo uploads in the Yoke app.

## Steps

### 1. Run the Storage Bucket Setup SQL
1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Open the file `scripts/setup-storage-bucket.sql`
4. Copy the entire contents and paste it into the SQL Editor
5. Click **Run** to execute the script

### 2. Verify Storage Bucket
1. Go to **Storage** in your Supabase dashboard
2. You should see a bucket named `photos`
3. The bucket should be marked as **Public**

### 3. Verify Storage Policies
1. In the **Storage** section, click on the `photos` bucket
2. Go to **Policies** tab
3. You should see the following policies:
   - **Users can upload own photos** (INSERT)
   - **Users can update own photos** (UPDATE)
   - **Users can delete own photos** (DELETE)
   - **Photos are publicly readable** (SELECT)

## Troubleshooting

### Bucket not created
- Make sure you ran the SQL script successfully
- Check the Supabase dashboard for any error messages
- Verify that you have the necessary permissions in your Supabase project

### Photos not uploading
- Check that the bucket name is exactly `photos`
- Verify that the storage policies are correctly set up
- Check browser console for any error messages
- Ensure the user is authenticated before uploading

### Photos not displaying
- Verify that the bucket is set to **Public**
- Check that the photo URLs are correct
- Verify that the storage policies allow public read access

## Testing
1. Sign up or sign in to the app
2. Go to **Profile Setup**
3. Upload a photo
4. Verify that the photo appears in your profile
5. Check the Supabase Storage dashboard to see the uploaded file

## File Structure
Photos are stored in the following structure:
```
photos/
  {userId}/
    {timestamp}.{extension}
```

Example:
```
photos/
  abc123-def456-ghi789/
    1704067200000.jpg
```

## Security Notes
- Users can only upload, update, and delete their own photos
- Photos are stored in folders named after the user's ID
- All photos are publicly readable (for profile display)
- Storage policies ensure users cannot access other users' photos

