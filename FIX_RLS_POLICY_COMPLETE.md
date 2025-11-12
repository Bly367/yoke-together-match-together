# Complete Fix: RLS Policy Violation on Profile Creation

## 🔍 Problem

You're getting: `new row violates row-level security policy for table "profiles"`

This happens because RLS (Row Level Security) is blocking the INSERT operation when creating a profile during sign up.

## ✅ Solution: Use Database Trigger (Recommended)

The **best solution** is to use a database trigger that automatically creates a profile when a user signs up. This bypasses RLS because triggers run with `SECURITY DEFINER` privileges.

### Step 1: Create Database Trigger

1. **Go to Supabase Dashboard**: https://supabase.com/dashboard/project/vprznvvhsembpvbyhnvk
2. **Go to SQL Editor** in the left sidebar
3. **Click "New Query"**
4. **Open `scripts/create-profile-trigger.sql`** in your project
5. **Copy the entire file** content
6. **Paste into SQL Editor**
7. **Click "Run"** (or press Cmd+Enter / Ctrl+Enter)
8. **Verify no errors**

### Step 2: Test Sign Up

1. **Go to `/auth` page** in your app
2. **Sign up with a test email**
3. **Check Supabase Dashboard** → **Table Editor** → `profiles`
4. **You should see your profile automatically created!**

### Step 3: Verify Trigger Works

1. **Go to Supabase Dashboard** → **Database** → **Triggers**
2. **You should see**: `on_auth_user_created` trigger
3. **Or run this query**:
```sql
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM 
  information_schema.triggers
WHERE 
  trigger_name = 'on_auth_user_created';
```

## ✅ Alternative Solution: Fix RLS Policies

If you prefer not to use a trigger, you can fix the RLS policies instead.

### Step 1: Fix RLS Policies

1. **Go to Supabase Dashboard** → **SQL Editor**
2. **Open `scripts/fix-rls-policies.sql`** in your project
3. **Copy and paste into SQL Editor**
4. **Click "Run"**
5. **Verify no errors**

### Step 2: Test Sign Up

1. **Go to `/auth` page** in your app
2. **Sign up with a test email**
3. **Check Supabase Dashboard** → **Table Editor** → `profiles`
4. **You should see your profile!**

## 🎯 Recommended: Use Database Trigger

**Why use a database trigger?**
- ✅ **Automatic** - Profile is created automatically when user signs up
- ✅ **Reliable** - No RLS issues because trigger runs with SECURITY DEFINER
- ✅ **Consistent** - Profile is always created, even if client code fails
- ✅ **Secure** - Trigger runs on the server, not the client

## 🔧 What Was Fixed

I've updated the code to:

1. **Check if profile exists first** (in case trigger created it)
2. **Wait for trigger to fire** (500ms delay)
3. **Create profile manually if trigger doesn't exist**
4. **Provide helpful error messages** for RLS violations

## 🐛 Common Issues

### Issue 1: "Trigger doesn't exist" error
**Solution**: Run `scripts/create-profile-trigger.sql` in Supabase SQL Editor

### Issue 2: "RLS policy violation" still occurs
**Solution**: 
- Use the database trigger (recommended)
- Or run `scripts/fix-rls-policies.sql` to fix RLS policies

### Issue 3: "Profile not created" after sign up
**Solution**:
- Check if trigger exists: Run verification query above
- Check browser console for errors
- Check Supabase Dashboard → Table Editor → profiles

## 🔍 Verify Setup

### Check 1: Trigger Exists
```sql
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM 
  information_schema.triggers
WHERE 
  trigger_name = 'on_auth_user_created';
```

Should return 1 row with trigger details.

### Check 2: RLS Policies Exist
```sql
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  with_check
FROM 
  pg_policies
WHERE 
  schemaname = 'public' 
  AND tablename = 'profiles'
ORDER BY 
  policyname;
```

Should return at least 3 policies:
- ✅ `Profiles are viewable by everyone` (SELECT)
- ✅ `Users can update own profile` (UPDATE)
- ✅ `Users can insert own profile` (INSERT)

### Check 3: Profile Created After Sign Up
1. **Sign up with a test email**
2. **Check Supabase Dashboard** → **Table Editor** → `profiles`
3. **You should see your profile!**

## 📝 Expected Behavior

After setting up the trigger:

1. **User signs up** → Auth user is created
2. **Trigger fires** → Profile is automatically created
3. **Profile is saved** → User can see their profile
4. **User can update profile** → RLS policy allows UPDATE

## 🎯 Next Steps

1. **Run the trigger script** (Step 1 above) - **RECOMMENDED**
2. **Or fix RLS policies** (Alternative Solution above)
3. **Test sign up** - Should work now!
4. **Check Supabase Dashboard** → Table Editor → profiles
5. **Verify profile was created** successfully

## 🆘 Still Having Issues?

1. **Check browser console** - Look for specific error messages
2. **Check Supabase Dashboard** - Look for errors in SQL Editor
3. **Verify trigger exists** - Run verification query above
4. **Check RLS policies** - Run verification query above
5. **Verify user is authenticated** - Check auth.uid() returns user ID

## 💡 Recommendation

**Use the database trigger** (`scripts/create-profile-trigger.sql`) - it's the most reliable solution and will prevent RLS issues in the future!

The trigger automatically creates a profile when a user signs up, so you don't need to worry about RLS policies blocking profile creation.

