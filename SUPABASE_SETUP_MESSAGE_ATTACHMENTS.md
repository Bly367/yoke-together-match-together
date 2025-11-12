# Supabase Setup for Message Attachments

## Overview
This guide explains what you need to add to Supabase to support message attachments in chat.

## Required Steps

### 1. Run the Message Attachments Migration
1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Open the file `supabase/migrations/003_message_attachments.sql`
4. Copy the entire contents and paste it into the SQL Editor
5. Click **Run** to execute the script

This migration will:
- ✅ Add attachment columns to the `messages` table (`attachment_url`, `attachment_type`, `attachment_name`, `attachment_size`)
- ✅ Create an index for attachment queries
- ✅ Add storage policies to allow message attachments in the `photos` bucket

### 2. Verify Database Changes
After running the migration, verify the changes:

```sql
-- Check that attachment columns were added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'messages' 
AND column_name LIKE 'attachment%';

-- Should return:
-- attachment_url (text)
-- attachment_type (text)
-- attachment_name (text)
-- attachment_size (integer)
```

### 3. Verify Storage Policies
1. Go to **Storage** in your Supabase dashboard
2. Click on the `photos` bucket
3. Go to **Policies** tab
4. You should see these new policies:
   - **Users can upload message attachments** (INSERT)
   - **Users can update own message attachments** (UPDATE)
   - **Users can delete own message attachments** (DELETE)

### 4. Storage Bucket Structure
Message attachments are stored in the `photos` bucket with this structure:
```
photos/
  messages/
    {matchId}/
      {userId}/
        {timestamp}.{extension}
```

Example:
```
photos/
  messages/
    abc123-match-id/
      def456-user-id/
        1704067200000.jpg
```

## What's Already Covered

✅ **Public Read Access** - The existing "Photos are publicly readable" policy already covers message attachments, so they can be viewed by anyone with the URL.

✅ **RLS Policies** - The existing message RLS policies already cover attachments since they're part of the message record.

## Troubleshooting

### Migration Fails
- Make sure you've run the previous migrations (`001_initial_schema.sql` and `002_chat_enhancements.sql`)
- Check for any error messages in the SQL Editor
- Verify you have the necessary permissions

### Storage Policies Not Working
- Verify the policies were created successfully
- Check that the bucket name is exactly `photos`
- Ensure users are authenticated before uploading
- Check browser console for detailed error messages

### Attachments Not Uploading
- Verify storage policies are correctly set up
- Check that the path structure matches: `messages/{matchId}/{userId}/`
- Ensure the user ID in the path matches the authenticated user's ID
- Check file size (max 10MB) and file type restrictions

## Testing

1. Sign in to the app
2. Navigate to a chat/match
3. Click the paperclip icon to attach a file
4. Select an image or file
5. Verify the preview appears
6. Send the message
7. Verify the attachment displays correctly in the chat
8. Check Supabase Storage dashboard to see the uploaded file

## Security Notes

- Users can only upload attachments to their own user folder (`messages/{matchId}/{userId}/`)
- Users can only delete their own attachments
- All attachments are publicly readable (for chat display)
- File size is limited to 10MB
- File types are restricted to: images, PDF, text, Word documents

