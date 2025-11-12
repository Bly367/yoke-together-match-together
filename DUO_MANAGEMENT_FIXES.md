# Duo Management Fixes

## Issues Fixed

1. **RLS Policy Issue**: Users couldn't see their own inactive duos
2. **Delete Policy Missing**: Users couldn't delete their own duos
3. **UI Improvements**: Added delete button and better active duo management

## Steps to Apply Fixes

### 1. Run the Migration

Run the new migration file to add the necessary RLS policies:

```sql
-- Run this in Supabase SQL Editor
-- File: supabase/migrations/007_duo_rls_fixes.sql
```

This adds:
- Policy to allow users to see their own duos (active or inactive)
- Policy to allow users to delete their own duos

### 2. Fix Existing Data (if needed)

If you have multiple active duos for the same user, run:

```sql
-- Run this in Supabase SQL Editor
-- File: scripts/fix-duo-active-status.sql
```

This ensures only one duo per user is active (keeps the most recently created one active).

### 3. Verify the Fix

1. Log in as Alice (test1@yoke.test)
2. Go to Profile page
3. You should see:
   - "Alice & Bob" duo with "Active" badge and "Currently Active" button
   - "Alice & Charlie" duo with "Set as Active" button
   - Delete button on each duo (disabled for active duo)

## What Changed

### Database (Migration 007)
- Added RLS policy: "Users can view own duos" - allows users to see all their duos
- Added RLS policy: "Users can delete own duos" - allows users to delete their own duos

### Profile Page
- Added delete button for each duo
- Delete button is disabled for active duos (must set another as active first)
- "Set as Active" button now clearly shows for inactive duos
- "Currently Active" button shows for active duos
- Duos are sorted: active first, then by creation date

### Service Layer
- Fixed ordering in `getUserDuos()` (removed invalid multiple order calls)

## Testing

1. **View All Duos**: Profile page should show all your duos (active and inactive)
2. **Set Active**: Click "Set as Active" on an inactive duo - it should become active
3. **Delete**: Click "Delete" on an inactive duo - it should be deleted
4. **Delete Active**: Try to delete active duo - button should be disabled with tooltip

## Notes

- Only one duo can be active at a time
- Active duo is used for matching/discover
- Inactive duos are still visible in Profile for management
- Cannot delete active duo - must set another as active first

