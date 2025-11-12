# Quick Supabase Setup Guide

## 🚀 5-Minute Setup

### Step 1: Create Supabase Project (2 minutes)
1. Go to: https://supabase.com
2. Sign up / Sign in
3. Click **New Project**
4. Fill in:
   - Name: `yoke-dating-app`
   - Database Password: (create a strong password)
   - Region: (choose closest to you)
5. Click **Create new project**
6. Wait for project to be created

### Step 2: Get Credentials (1 minute)
1. Go to **Settings** → **API**
2. Copy:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon/public key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

### Step 3: Update .env File (30 seconds)
Open `.env` and update:
```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Step 4: Apply Database Schema (1 minute)
1. Go to **SQL Editor** in Supabase Dashboard
2. Click **New Query**
3. Open `supabase/migrations/001_initial_schema.sql`
4. Copy entire file content
5. Paste into SQL Editor
6. Click **Run**

### Step 5: Create Storage Bucket (30 seconds)
1. Go to **Storage** in Supabase Dashboard
2. Click **New bucket**
3. Name: `photos`
4. Check **Public bucket**
5. Click **Create bucket**

### Step 6: Test (30 seconds)
1. Restart dev server: `npm run dev`
2. Go to `/auth` page
3. Try signing up
4. Check Supabase Dashboard → **Table Editor** → `profiles` to see your user

## ✅ Done!

Your Supabase project is now set up!

## 🔍 Verify Setup

Check these in Supabase Dashboard:
- ✅ **Table Editor**: See `profiles`, `duos`, `swipes`, `matches`, `messages` tables
- ✅ **Storage**: See `photos` bucket
- ✅ **Authentication**: Can view users who sign up
- ✅ **SQL Editor**: Can run queries

## 📝 Full Guide

See `SETUP_SUPABASE.md` for detailed instructions.

