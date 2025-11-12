# 🚀 Start Here - Set Up Your Own Supabase Project

Since the previous Supabase project was on Lovable's cloud, you need to create your own Supabase project. Follow these steps:

## ⚡ Quick Setup (5 Minutes)

### Step 1: Create Supabase Account & Project

1. **Go to**: https://supabase.com
2. **Sign up** (with GitHub, Google, or email)
3. **Click**: "New Project"
4. **Fill in**:
   - Name: `yoke-dating-app`
   - Database Password: (create a strong password - **save it!**)
   - Region: (choose closest to you)
   - Plan: Free tier is fine
5. **Click**: "Create new project"
6. **Wait**: 2-3 minutes for project to be created

### Step 2: Get Your Credentials

1. **Go to**: Settings → API (in your Supabase Dashboard)
2. **Copy**:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon/public key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

### Step 3: Update .env File

1. **Open**: `.env` file in your project root
2. **Replace** with your new credentials:
```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Step 4: Apply Database Schema

1. **Go to**: SQL Editor in Supabase Dashboard
2. **Click**: "New Query"
3. **Open**: `scripts/setup-supabase.sql` (or `supabase/migrations/001_initial_schema.sql`)
4. **Copy**: Entire file content
5. **Paste**: Into SQL Editor
6. **Click**: "Run" (or press Cmd+Enter / Ctrl+Enter)
7. **Verify**: No errors

### Step 5: Create Storage Bucket

1. **Go to**: Storage in Supabase Dashboard
2. **Click**: "New bucket"
3. **Name**: `photos`
4. **Check**: "Public bucket"
5. **Click**: "Create bucket"

### Step 6: Test It!

1. **Restart** dev server: `npm run dev`
2. **Go to**: `/auth` page
3. **Try**: Signing up with a test email
4. **Check**: Supabase Dashboard → Table Editor → `profiles` to see your user

## ✅ Verify Setup

Check these in Supabase Dashboard:
- ✅ **Table Editor**: See `profiles`, `duos`, `swipes`, `matches`, `messages` tables
- ✅ **Storage**: See `photos` bucket
- ✅ **Authentication**: Can view users who sign up
- ✅ **SQL Editor**: Can run queries

## 📚 Documentation

- **QUICK_SUPABASE_SETUP.md** - 5-minute quick setup guide
- **SETUP_SUPABASE.md** - Detailed setup instructions
- **SETUP_CHECKLIST.md** - Step-by-step checklist
- **DATABASE_GUIDE.md** - Complete database documentation

## 🐛 Troubleshooting

### "Project doesn't exist" error
- Make sure you created a new project in your own Supabase account
- Verify you're signed into the correct account
- Check that project was created successfully

### "Tables don't exist" error
- Make sure you ran the SQL migration in SQL Editor
- Check SQL Editor for any errors
- Verify migration completed successfully

### "Authentication error"
- Verify `.env` file has correct credentials
- Make sure you're using `anon/public` key, not `service_role` key
- Restart development server after updating `.env`

## 🎉 You're Done!

Once you complete these steps, your app will be using your own Supabase project!

## 📝 Next Steps

1. **Test the app**: Sign up, create profile, test features
2. **Monitor data**: Check Supabase Dashboard to see data as users interact
3. **Configure RLS**: Adjust Row Level Security policies as needed
4. **Set up backups**: Configure database backups in Supabase Dashboard

