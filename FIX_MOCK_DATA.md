# Fixing Mock Data Issue

## 🔍 Problem

The app is showing mock data (like "Alex Johnson", "25 years old") instead of real user data because:

1. **Database schema not applied** - The Supabase types show no tables exist
2. **Using old Supabase project** - Still connected to Lovable's project
3. **Mock data in pages** - Pages are using hardcoded data instead of real Supabase data

## ✅ Solution

### Step 1: Create Your Own Supabase Project

1. Go to: https://supabase.com/dashboard
2. Sign up / Sign in
3. Click **"New Project"**
4. Fill in:
   - Name: `yoke-dating-app`
   - Database Password: (create a strong password)
   - Region: (choose closest to you)
5. Click **"Create new project"**
6. Wait 2-3 minutes

### Step 2: Get Your Credentials

1. In Supabase Dashboard → **Settings** → **API**
2. Copy:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon/public key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

### Step 3: Update .env File

1. Open `.env` file in your project root
2. Replace with your new credentials:
```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Step 4: Apply Database Schema

1. Go to **SQL Editor** in Supabase Dashboard
2. Click **"New Query"**
3. Open `scripts/setup-supabase-simple.sql` (recommended - no PostGIS)
4. Copy entire file content
5. Paste into SQL Editor
6. Click **"Run"** (or Cmd+Enter / Ctrl+Enter)
7. Verify no errors

### Step 5: Create Storage Bucket

1. Go to **Storage** in Supabase Dashboard
2. Click **"New bucket"**
3. Name: `photos`
4. Check **"Public bucket"**
5. Click **"Create bucket"**

### Step 6: Restart Dev Server

```bash
# Stop the current server (Ctrl+C)
npm run dev
```

### Step 7: Test Sign Up

1. Go to `/auth` page
2. Sign up with a test email
3. Check Supabase Dashboard → **Table Editor** → `profiles`
4. You should see your user profile!

### Step 8: Verify Profile Page

1. After signing up, go to `/profile` page
2. You should see YOUR actual data, not "Alex Johnson"
3. If you see your data, it's working!

## 🔧 Code Changes Made

I've updated the code to use real Supabase data:

1. **Auth.tsx** - Now uses `useSignUp` and `useSignIn` hooks that create profiles
2. **Profile.tsx** - Now uses `useAuth` hook to display real user data
3. **ProfileSetup.tsx** - Now uses `useUpdateProfile` hook to save profile data

## 🐛 If It Still Shows Mock Data

### Check 1: Database Schema Applied?
- Go to Supabase Dashboard → **Table Editor**
- Do you see `profiles`, `duos`, `swipes`, `matches`, `messages` tables?
- If no, apply the schema (Step 4 above)

### Check 2: .env File Updated?
- Verify `.env` has your new Supabase URL and key
- Restart dev server after updating `.env`

### Check 3: User Created in Database?
- Go to Supabase Dashboard → **Table Editor** → `profiles`
- Do you see your user profile?
- If no, the profile creation failed (check browser console for errors)

### Check 4: Browser Console Errors?
- Open browser DevTools (F12)
- Check Console tab for errors
- Look for Supabase connection errors or database errors

## 📝 Next Steps

After fixing the database connection:

1. **Test sign up** - Should create profile in database
2. **Test profile page** - Should show your real data
3. **Test profile setup** - Should save profile updates
4. **Check Supabase Dashboard** - Should see your data in tables

## 🎯 Expected Behavior

After setup:
- Sign up creates a user in `auth.users` AND `profiles` table
- Profile page shows YOUR name, age, bio (not "Alex Johnson")
- Profile setup saves YOUR data to database
- You can see your data in Supabase Dashboard

## 💡 Important Notes

1. **Database schema must be applied first** - Without it, profiles can't be created
2. **Use your own Supabase project** - Don't use Lovable's project
3. **Restart dev server** - After updating `.env` file
4. **Check browser console** - For any errors

If you're still seeing mock data after these steps, check the browser console for errors!

