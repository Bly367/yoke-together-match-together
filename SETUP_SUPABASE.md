# Setting Up Your Own Supabase Project

## 🎯 Goal

Create your own Supabase project and set up the database schema for the Yoke app.

## Step 1: Create Supabase Account & Project

### 1.1 Create Account
1. Go to: https://supabase.com
2. Click **Start your project** or **Sign up**
3. Sign up with GitHub, Google, or email

### 1.2 Create New Project
1. After signing in, click **New Project**
2. Fill in the details:
   - **Organization**: Create new or select existing
   - **Name**: `yoke-dating-app` (or any name you prefer)
   - **Database Password**: Create a strong password (save it!)
   - **Region**: Choose closest to you (e.g., `US East`, `EU West`)
   - **Pricing Plan**: Free tier is fine for development

3. Click **Create new project**
4. Wait 2-3 minutes for project to be created

## Step 2: Get Your Supabase Credentials

### 2.1 Get Project URL and API Key
1. In your Supabase Dashboard, go to **Settings** → **API**
2. You'll see:
   - **Project URL**: `https://xxxxxxxxxxxxx.supabase.co`
   - **anon/public key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

3. Copy both values

### 2.2 Update .env File
1. Open `.env` file in your project root
2. Update with your new credentials:
```env
VITE_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Step 3: Apply Database Schema

### 3.1 Open SQL Editor
1. In Supabase Dashboard, click **SQL Editor** in the left sidebar
2. Click **New Query**

### 3.2 Run Migration SQL
1. Open `supabase/migrations/001_initial_schema.sql` in your project
2. Copy the entire SQL file content
3. Paste it into the Supabase SQL Editor
4. Click **Run** (or press Cmd+Enter / Ctrl+Enter)

### 3.3 Verify Tables Were Created
1. Click **Table Editor** in the left sidebar
2. You should see these tables:
   - `profiles`
   - `duos`
   - `swipes`
   - `matches`
   - `messages`

## Step 4: Create Storage Bucket

### 4.1 Create Photos Bucket
1. In Supabase Dashboard, click **Storage** in the left sidebar
2. Click **New bucket**
3. Fill in:
   - **Name**: `photos`
   - **Public bucket**: ✅ Check this (or configure RLS policies later)
4. Click **Create bucket**

### 4.2 Configure Storage Policies (Optional)
1. Click on the `photos` bucket
2. Go to **Policies** tab
3. Add policies as needed for your app

## Step 5: Test the Connection

### 5.1 Restart Development Server
```bash
# Stop the current server (Ctrl+C)
# Restart it
npm run dev
```

### 5.2 Test Sign Up
1. Open your app: http://localhost:8082 (or whatever port)
2. Go to `/auth` page
3. Try signing up with a test email
4. Check Supabase Dashboard → **Authentication** → **Users** to see if user was created
5. Check **Table Editor** → `profiles` to see if profile was created

## Step 6: Verify Everything Works

### 6.1 Check Database
1. Go to **Table Editor** in Supabase Dashboard
2. Verify tables exist and are empty (or have test data)

### 6.2 Check Authentication
1. Go to **Authentication** → **Users**
2. Verify you can see users who sign up

### 6.3 Check Storage
1. Go to **Storage** → **photos** bucket
2. Verify bucket exists and is accessible

## 🎉 You're Done!

Your Supabase project is now set up and ready to use!

## 📝 Next Steps

1. **Test the app**: Sign up, create profile, test features
2. **Monitor data**: Check Supabase Dashboard to see data as users interact
3. **Configure RLS**: Adjust Row Level Security policies as needed
4. **Set up backups**: Configure database backups in Supabase Dashboard

## 🐛 Troubleshooting

### "Project doesn't exist" error
- Make sure you're using the correct Project URL and API key
- Verify you're signed into the correct Supabase account
- Check that the project was created successfully

### "Table doesn't exist" error
- Make sure you ran the migration SQL in SQL Editor
- Check that all tables were created in Table Editor
- Verify the SQL migration ran without errors

### "Storage bucket doesn't exist" error
- Make sure you created the `photos` bucket
- Verify the bucket name is exactly `photos`
- Check bucket permissions

### "Authentication error"
- Verify `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` are correct
- Make sure you're using the `anon/public` key, not the `service_role` key
- Restart the development server after updating .env

## 📚 Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Dashboard](https://supabase.com/dashboard)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)

