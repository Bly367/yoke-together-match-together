# Quick Fix: Database Schema Not Applied

## 🚨 Problem

You're getting: `public.profiles is not in the Supabase schema`

## ✅ Solution (5 Minutes)

### Step 1: Go to Supabase Dashboard

1. Open: https://supabase.com/dashboard/project/vprznvvhsembpvbyhnvk
2. Click **SQL Editor** in the left sidebar
3. Click **New Query**

### Step 2: Apply Database Schema

1. Open `scripts/setup-supabase-fixed.sql` in your project
2. **Copy the entire file** (select all and copy)
3. **Paste into SQL Editor** in Supabase Dashboard
4. **Click "Run"** (or press Cmd+Enter / Ctrl+Enter)
5. **Wait for completion** - Should show success messages

### Step 3: Verify Tables Were Created

1. Click **Table Editor** in the left sidebar
2. You should see these tables:
   - ✅ `profiles`
   - ✅ `duos`
   - ✅ `swipes`
   - ✅ `matches`
   - ✅ `messages`

If you see the tables, it worked! ✅

### Step 4: Restart Dev Server

```bash
# Stop the current server (Ctrl+C)
npm run dev
```

### Step 5: Test

1. Go to `/auth` page
2. Sign up with a test email
3. Check Supabase Dashboard → **Table Editor** → `profiles`
4. You should see your profile!

## 🔧 What Changed

I created a **fixed version** of the SQL script (`setup-supabase-fixed.sql`) that:

1. ✅ **Drops existing tables first** (for clean setup)
2. ✅ **Uses BEGIN/COMMIT** (transaction safety)
3. ✅ **Removes IF NOT EXISTS** (forces recreation)
4. ✅ **Includes all indexes, policies, triggers**
5. ✅ **Includes error handling**

## 🐛 If It Still Doesn't Work

### Check 1: Did the script run successfully?
- Look at SQL Editor - any error messages?
- Check Table Editor - do you see the tables?

### Check 2: Are you in the right project?
- Verify project ID: `vprznvvhsembpvbyhnvk`
- Verify URL: `https://vprznvvhsembpvbyhnvk.supabase.co`

### Check 3: Check for errors
- In SQL Editor, look for red error messages
- Check the bottom of the output for errors

### Check 4: Verify RLS is enabled
- Go to Table Editor → `profiles` table
- Click on the table
- Check if RLS is enabled (should be enabled)

## 📝 Verification Query

Run this in SQL Editor to verify:

```sql
-- Check if tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('profiles', 'duos', 'swipes', 'matches', 'messages');
```

Should return 5 rows (one for each table).

## ✅ Expected Result

After running the fixed script:
- ✅ 5 tables created: `profiles`, `duos`, `swipes`, `matches`, `messages`
- ✅ RLS policies enabled on all tables
- ✅ Triggers created for auto-matching
- ✅ Indexes created for performance
- ✅ Functions created for match handling

## 🎯 Next Steps

1. **Apply the schema** (Step 2 above)
2. **Verify tables** (Step 3 above)
3. **Restart dev server** (Step 4 above)
4. **Test sign up** (Step 5 above)

## 🆘 Still Having Issues?

1. **Check SQL Editor** - Look for error messages
2. **Check Table Editor** - Verify tables exist
3. **Check browser console** - Look for connection errors
4. **Verify .env file** - Make sure credentials are correct (I've already updated it)
5. **Restart dev server** - After any changes

The fixed script should work! If you still have issues, let me know what error you're seeing.

