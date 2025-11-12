# Fix: Database Schema Not Applied

## 🔍 Problem

You're getting an error that `public.profiles` is not in the Supabase schema, even though you ran the setup script.

## ✅ Solution

### Step 1: Verify Current State

1. Go to **Supabase Dashboard**: https://supabase.com/dashboard/project/vprznvvhsembpvbyhnvk
2. Go to **SQL Editor**
3. Run this query to check if tables exist:

```sql
SELECT 
    table_name
FROM 
    information_schema.tables
WHERE 
    table_schema = 'public'
    AND table_name IN ('profiles', 'duos', 'swipes', 'matches', 'messages')
ORDER BY 
    table_name;
```

### Step 2: Apply Database Schema (Fixed Version)

1. Go to **SQL Editor** in Supabase Dashboard
2. Click **"New Query"**
3. Open `scripts/setup-supabase-fixed.sql` in your project
4. Copy the **entire file** content
5. Paste into SQL Editor
6. Click **"Run"** (or press Cmd+Enter / Ctrl+Enter)
7. Wait for it to complete (should show success messages)

### Step 3: Verify Tables Were Created

1. Go to **Table Editor** in Supabase Dashboard
2. You should see these tables:
   - ✅ `profiles`
   - ✅ `duos`
   - ✅ `swipes`
   - ✅ `matches`
   - ✅ `messages`

### Step 4: Update .env File

I've already updated your `.env` file with your Supabase credentials:
- URL: `https://vprznvvhsembpvbyhnvk.supabase.co`
- API Key: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

### Step 5: Restart Dev Server

```bash
# Stop the current server (Ctrl+C)
npm run dev
```

### Step 6: Test

1. Go to `/auth` page
2. Sign up with a test email
3. Check Supabase Dashboard → **Table Editor** → `profiles`
4. You should see your profile!

## 🔧 What Was Fixed

The new `setup-supabase-fixed.sql` script:

1. **Drops existing tables first** (for clean setup)
2. **Uses BEGIN/COMMIT** (transaction safety)
3. **Removes IF NOT EXISTS** (for clean recreation)
4. **Includes all indexes and policies**
5. **Includes all triggers and functions**

## 🐛 Common Issues

### Issue 1: "Table already exists" error
**Solution**: The fixed script drops tables first, so this shouldn't happen. If it does, run the verification query first.

### Issue 2: "Permission denied" error
**Solution**: Make sure you're running the script in the SQL Editor (not via API). The SQL Editor has full permissions.

### Issue 3: "RLS policy already exists" error
**Solution**: The fixed script uses `CREATE POLICY` without `IF NOT EXISTS`, so it will fail if policies exist. Drop the policies first or use the verification script.

### Issue 4: Still seeing "profiles table does not exist"
**Solution**:
1. Check Supabase Dashboard → **Table Editor** - do you see the tables?
2. If yes, the issue might be with RLS policies
3. If no, the script didn't run successfully - check for errors in SQL Editor

## 🔍 Verify Schema

Run this in SQL Editor to verify:

```sql
-- Check tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('profiles', 'duos', 'swipes', 'matches', 'messages');

-- Check RLS
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('profiles', 'duos', 'swipes', 'matches', 'messages');
```

## 📝 Next Steps

After applying the schema:

1. **Test sign up** - Should create profile in database
2. **Test profile page** - Should show your real data
3. **Check Supabase Dashboard** - Should see your data in tables

## 🆘 Still Having Issues?

1. **Check SQL Editor** - Look for any error messages
2. **Check Table Editor** - Verify tables exist
3. **Check browser console** - Look for connection errors
4. **Verify .env file** - Make sure credentials are correct
5. **Restart dev server** - After updating .env

The fixed script should work! Let me know if you still have issues.

