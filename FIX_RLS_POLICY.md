# Fix: RLS Policy Violation on Profile Creation

## 🔍 Problem

You're getting: `new row violates row-level security policy for table "profiles"`

This means the RLS (Row Level Security) policy is blocking the INSERT operation when creating a profile.

## ✅ Solution

### Option 1: Fix RLS Policies (Recommended)

1. **Go to Supabase Dashboard**: https://supabase.com/dashboard/project/vprznvvhsembpvbyhnvk
2. **Go to SQL Editor** in the left sidebar
3. **Click "New Query"**
4. **Open `scripts/fix-rls-policies.sql`** in your project
5. **Copy the entire file** content
6. **Paste into SQL Editor**
7. **Click "Run"** (or press Cmd+Enter / Ctrl+Enter)
8. **Verify no errors**

### Option 2: Temporarily Disable RLS (Not Recommended for Production)

If you want to test quickly, you can temporarily disable RLS:

```sql
-- Temporarily disable RLS on profiles table
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- Remember to re-enable it after testing!
-- ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
```

**⚠️ Warning**: Only do this for testing. Re-enable RLS before going to production!

### Option 3: Check Authentication Context

The issue might be that the user isn't authenticated when the profile is created. Let's verify:

1. **Check if user is authenticated** before creating profile
2. **Verify auth.uid() matches the user ID** being inserted

## 🔧 What Was Fixed

I've created `scripts/fix-rls-policies.sql` that:

1. **Drops existing policies** on profiles table
2. **Recreates policies** with correct permissions
3. **Allows users to insert their own profile** (auth.uid() = id)
4. **Allows users to update their own profile** (auth.uid() = id)
5. **Allows everyone to view profiles** (for matching)

## 🐛 Common Issues

### Issue 1: "RLS policy violation" still occurs
**Solution**: 
- Make sure you ran the fix script
- Check that `auth.uid()` returns the user ID
- Verify the user is authenticated before creating profile

### Issue 2: "User is not authenticated"
**Solution**:
- Make sure the user signed up successfully
- Check that `auth.uid()` is not null
- Verify the Supabase auth session is active

### Issue 3: "Policy doesn't allow INSERT"
**Solution**:
- Check the RLS policies in Supabase Dashboard
- Verify the policy allows INSERT with `auth.uid() = id`
- Make sure the policy is active

## 🔍 Verify RLS Policies

Run this in SQL Editor to check RLS policies:

```sql
-- Check RLS policies on profiles table
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM 
  pg_policies
WHERE 
  schemaname = 'public' 
  AND tablename = 'profiles'
ORDER BY 
  policyname;
```

You should see:
- ✅ `Profiles are viewable by everyone` (SELECT)
- ✅ `Users can update own profile` (UPDATE)
- ✅ `Users can insert own profile` (INSERT)

## 📝 Expected Behavior

After fixing RLS policies:

1. **User signs up** → Auth user is created
2. **Profile is created** → RLS policy allows INSERT (auth.uid() = id)
3. **Profile is saved** → User can see their profile
4. **User can update profile** → RLS policy allows UPDATE (auth.uid() = id)

## 🎯 Next Steps

1. **Run the fix script** (Option 1 above)
2. **Verify policies** are created correctly
3. **Test sign up** - Should work now!
4. **Check Supabase Dashboard** → Table Editor → profiles
5. **Verify profile was created** successfully

## 🆘 Still Having Issues?

1. **Check browser console** - Look for specific error messages
2. **Check Supabase Dashboard** - Look for errors in SQL Editor
3. **Verify RLS is enabled** - Should be enabled on profiles table
4. **Check policies exist** - Run the verification query above
5. **Verify user is authenticated** - Check auth.uid() returns user ID

The fix script should resolve the RLS policy issue! Let me know if you still have problems.

