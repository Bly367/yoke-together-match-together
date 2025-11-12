# Test Accounts Script Review

## ✅ Script Review Complete

I've reviewed and improved the `scripts/create-test-accounts.sql` script. Here's what was fixed:

## Issues Fixed

### 1. **User Validation**
- ✅ Added check to ensure all 4 test users exist before proceeding
- ✅ Provides clear error message if users are missing
- ✅ Shows notice when users are found

### 2. **Duo Creation**
- ✅ Fixed CROSS JOIN issue (was creating cartesian product)
- ✅ Changed to proper JOIN with specific email matching
- ✅ Added NOT EXISTS check to prevent duplicate duos (handles both orderings: A-B and B-A)
- ✅ Prevents creating the same duo multiple times

### 3. **Match Creation**
- ✅ Simplified complex JOIN query
- ✅ Uses EXISTS clauses for cleaner logic
- ✅ Properly checks for existing matches before creating
- ✅ Uses LEAST/GREATEST for canonical ordering (matches database constraint)

### 4. **Message Creation**
- ✅ Fixed CROSS JOIN that could create duplicates
- ✅ Added NOT EXISTS check to prevent duplicate messages
- ✅ Checks by match_id, sender_id, and content to avoid duplicates
- ✅ Properly structured with CTEs for readability

### 5. **Summary Display**
- ✅ Added DO block with RAISE NOTICE for better visibility
- ✅ Enhanced final query to show message counts per user
- ✅ Improved match status check to verify active matches
- ✅ Better formatting and status indicators

## Script Features

### ✅ Idempotent
- Safe to run multiple times
- Won't create duplicates
- Updates existing data where appropriate

### ✅ Error Handling
- Validates users exist before proceeding
- Clear error messages
- Informative notices

### ✅ Data Integrity
- Checks for existing records before inserting
- Handles both orderings for duos (A-B and B-A)
- Prevents duplicate messages

### ✅ Useful Output
- Summary statistics
- Per-account status
- Message counts

## Usage

1. **Create auth users first** (through app or Supabase Dashboard):
   - test1@yoke.test / password123 (Alice)
   - test2@yoke.test / password123 (Bob)
   - test3@yoke.test / password123 (Charlie)
   - test4@yoke.test / password123 (Diana)

2. **Run the script** in Supabase SQL Editor

3. **Verify output** - Should show:
   - 4 test users
   - 2 active duos
   - 1 active match
   - 10 sample messages

## Testing Checklist

After running the script:
- [ ] Sign in as test1@yoke.test
- [ ] Verify you see a match with "Charlie & Diana"
- [ ] Open the chat and see 10 sample messages
- [ ] Send a new message
- [ ] Sign in as test3@yoke.test and verify you see the match and messages
- [ ] Test file attachments by uploading an image
- [ ] Test typing indicators
- [ ] Test search/filter functionality

## Potential RLS Issues

**Note:** If you encounter RLS policy errors when running this script, you may need to:

1. **Temporarily disable RLS** (for setup only):
```sql
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.duos DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages DISABLE ROW LEVEL SECURITY;

-- Run the script here

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.duos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
```

2. **Or run as service role** (if you have access to service role key)

3. **Or create users through the app** - The app's signup flow will create profiles automatically via trigger, then you can run the script to create duos and matches.

## Summary

The script is now production-ready with:
- ✅ Proper error handling
- ✅ Duplicate prevention
- ✅ Idempotent operations
- ✅ Clear output and feedback
- ✅ Data integrity checks

