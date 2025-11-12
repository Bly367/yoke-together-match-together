# Supabase Setup Checklist

## ✅ Step-by-Step Checklist

### 1. Create Supabase Account
- [ ] Go to https://supabase.com
- [ ] Sign up / Sign in
- [ ] Verify email (if required)

### 2. Create New Project
- [ ] Click **New Project**
- [ ] Enter project name: `yoke-dating-app`
- [ ] Create database password (save it!)
- [ ] Select region (closest to you)
- [ ] Click **Create new project**
- [ ] Wait for project to be created (2-3 minutes)

### 3. Get Credentials
- [ ] Go to **Settings** → **API**
- [ ] Copy **Project URL**: `https://xxxxx.supabase.co`
- [ ] Copy **anon/public key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

### 4. Update .env File
- [ ] Open `.env` file in project root
- [ ] Update `VITE_SUPABASE_URL` with your Project URL
- [ ] Update `VITE_SUPABASE_PUBLISHABLE_KEY` with your anon key
- [ ] Save the file

### 5. Apply Database Schema
- [ ] Go to **SQL Editor** in Supabase Dashboard
- [ ] Click **New Query**
- [ ] Open `scripts/setup-supabase.sql` or `supabase/migrations/001_initial_schema.sql`
- [ ] Copy entire file content
- [ ] Paste into SQL Editor
- [ ] Click **Run** (or Cmd+Enter / Ctrl+Enter)
- [ ] Verify no errors

### 6. Verify Tables Created
- [ ] Go to **Table Editor** in Supabase Dashboard
- [ ] Verify these tables exist:
  - [ ] `profiles`
  - [ ] `duos`
  - [ ] `swipes`
  - [ ] `matches`
  - [ ] `messages`

### 7. Create Storage Bucket
- [ ] Go to **Storage** in Supabase Dashboard
- [ ] Click **New bucket**
- [ ] Enter name: `photos`
- [ ] Check **Public bucket** (or configure RLS later)
- [ ] Click **Create bucket**
- [ ] Verify bucket exists

### 8. Test Connection
- [ ] Stop development server (Ctrl+C)
- [ ] Restart: `npm run dev`
- [ ] Verify server starts without errors
- [ ] Open app in browser

### 9. Test Sign Up
- [ ] Go to `/auth` page
- [ ] Try signing up with test email
- [ ] Verify sign up succeeds
- [ ] Check Supabase Dashboard → **Authentication** → **Users**
- [ ] Verify user was created
- [ ] Check **Table Editor** → `profiles`
- [ ] Verify profile was created

### 10. Verify Everything Works
- [ ] Check **Table Editor**: Can see tables and data
- [ ] Check **Authentication**: Can see users
- [ ] Check **Storage**: Can see `photos` bucket
- [ ] Check **SQL Editor**: Can run queries
- [ ] Test app features: Sign up, create profile, etc.

## 🎉 Done!

If all checkboxes are checked, your Supabase project is set up correctly!

## 🐛 Troubleshooting

### Project doesn't exist
- Verify you're signed into the correct Supabase account
- Check that project was created successfully
- Verify Project URL is correct

### Tables don't exist
- Make sure you ran the SQL migration
- Check SQL Editor for errors
- Verify migration completed successfully

### Storage bucket doesn't exist
- Make sure you created the `photos` bucket
- Verify bucket name is exactly `photos`
- Check bucket permissions

### Authentication errors
- Verify `.env` file has correct credentials
- Make sure you're using `anon/public` key, not `service_role` key
- Restart development server after updating `.env`

## 📚 Resources

- **Quick Setup**: See `QUICK_SUPABASE_SETUP.md`
- **Detailed Setup**: See `SETUP_SUPABASE.md`
- **Database Guide**: See `DATABASE_GUIDE.md`

