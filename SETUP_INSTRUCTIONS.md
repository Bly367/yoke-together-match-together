# 📋 Complete Setup Instructions

## 🎯 Goal

Create your own Supabase project and set up the database for the Yoke dating app.

## ⚡ Quick Steps

### 1. Create Supabase Project (2 minutes)

1. Go to: https://supabase.com
2. Sign up / Sign in
3. Click **"New Project"**
4. Fill in:
   - **Name**: `yoke-dating-app`
   - **Database Password**: Create a strong password (save it!)
   - **Region**: Choose closest to you
   - **Plan**: Free tier is fine
5. Click **"Create new project"**
6. Wait 2-3 minutes for project to be created

### 2. Get Your Credentials (1 minute)

1. In Supabase Dashboard, go to **Settings** → **API**
2. Copy these two values:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon/public key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

### 3. Update .env File (30 seconds)

1. Open `.env` file in your project root
2. Replace with your new credentials:
```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```
3. Save the file

### 4. Apply Database Schema (2 minutes)

**Option A: Simple Version (Recommended - No PostGIS)**
1. Go to **SQL Editor** in Supabase Dashboard
2. Click **"New Query"**
3. Open `scripts/setup-supabase-simple.sql`
4. Copy entire file content
5. Paste into SQL Editor
6. Click **"Run"** (or press Cmd+Enter / Ctrl+Enter)
7. Verify no errors

**Option B: Full Version (With PostGIS)**
1. Same as above, but use `scripts/setup-supabase.sql`
2. Note: PostGIS may not be available on all Supabase plans

### 5. Create Storage Bucket (30 seconds)

1. Go to **Storage** in Supabase Dashboard
2. Click **"New bucket"**
3. Enter name: `photos`
4. Check **"Public bucket"**
5. Click **"Create bucket"**

### 6. Test It! (1 minute)

1. Restart dev server: `npm run dev`
2. Go to `/auth` page in your app
3. Try signing up with a test email
4. Check Supabase Dashboard → **Table Editor** → `profiles` to see your user

## ✅ Verify Setup

Check these in Supabase Dashboard:
- ✅ **Table Editor**: See `profiles`, `duos`, `swipes`, `matches`, `messages` tables
- ✅ **Storage**: See `photos` bucket
- ✅ **Authentication**: Can view users who sign up
- ✅ **SQL Editor**: Can run queries

## 📊 Database Tables Created

1. **profiles** - User profiles (name, email, age, bio, photo)
2. **duos** - Duo pairs (two users matched together)
3. **swipes** - Swipe actions (likes/passes)
4. **matches** - Matches (mutual likes between duos)
5. **messages** - Chat messages (group chat messages)

## 🐛 Troubleshooting

### "Project doesn't exist" error
- Make sure you created a new project in your own Supabase account
- Verify you're signed into the correct account
- Check that project was created successfully

### "Tables don't exist" error
- Make sure you ran the SQL migration in SQL Editor
- Check SQL Editor for any errors
- Verify migration completed successfully
- Try using `setup-supabase-simple.sql` if PostGIS causes issues

### "Storage bucket doesn't exist" error
- Make sure you created the `photos` bucket
- Verify bucket name is exactly `photos`
- Check bucket permissions

### "Authentication error"
- Verify `.env` file has correct credentials
- Make sure you're using `anon/public` key, not `service_role` key
- Restart development server after updating `.env`

### "PostGIS extension not available" error
- Use `setup-supabase-simple.sql` instead (no PostGIS required)
- This version uses latitude/longitude columns instead of POINT type

## 📚 Files to Use

- **`scripts/setup-supabase-simple.sql`** - Recommended (no PostGIS)
- **`scripts/setup-supabase.sql`** - Full version (with PostGIS)
- **`supabase/migrations/001_initial_schema.sql`** - Original migration

## 🎉 You're Done!

Once you complete these steps, your app will be using your own Supabase project!

## 📝 Next Steps

1. **Test the app**: Sign up, create profile, test features
2. **Monitor data**: Check Supabase Dashboard to see data as users interact
3. **Configure RLS**: Adjust Row Level Security policies as needed
4. **Set up backups**: Configure database backups in Supabase Dashboard

## 🔗 Quick Links

- **Supabase Dashboard**: https://supabase.com/dashboard
- **Create Project**: https://supabase.com/dashboard/new
- **SQL Editor**: (In your project dashboard)
- **Table Editor**: (In your project dashboard)
- **Storage**: (In your project dashboard)

## 💡 Tips

1. **Save your database password** - You'll need it for direct database access
2. **Use the simple SQL file** - If PostGIS causes issues, use `setup-supabase-simple.sql`
3. **Test after each step** - Verify each step works before moving to the next
4. **Check the dashboard** - Use Supabase Dashboard to verify everything is set up correctly

