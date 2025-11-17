# Fresh Vercel Deployment Guide

This guide will help you completely remove your current Vercel deployment and set up a fresh one.

## Step 1: Remove Project from Vercel Dashboard

1. **Go to Vercel Dashboard**: https://vercel.com/dashboard
2. **Find your project** (`yoke-together-match-together`)
3. **Click on the project** to open it
4. **Go to Settings** (top right)
5. **Scroll down to "Danger Zone"**
6. **Click "Delete Project"**
7. **Confirm deletion** (type the project name)

⚠️ **Note**: This will delete all deployments, but your GitHub repository remains untouched.

## Step 2: Clean Up Local Vercel Cache (Optional)

If you have Vercel CLI installed locally, clean the cache:

```bash
# Remove .vercel folder if it exists
rm -rf .vercel

# If you have Vercel CLI installed
vercel logout
vercel login
```

## Step 3: Verify Environment Variables

Before redeploying, make sure you have your Supabase credentials ready:

1. **Go to Supabase Dashboard**: https://supabase.com/dashboard
2. **Select your project**
3. **Go to Settings → API**
4. **Copy these values**:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

## Step 4: Fresh Deployment on Vercel

1. **Go to Vercel Dashboard**: https://vercel.com/dashboard
2. **Click "Add New Project"**
3. **Import your GitHub repository**:
   - Select `Bly367/yoke-together-match-together`
   - Click "Import"
4. **Configure Project**:
   - **Framework Preset**: Vite (should auto-detect)
   - **Root Directory**: `./` (leave as default)
   - **Build Command**: `npm run build` (should auto-detect)
   - **Output Directory**: `dist` (should auto-detect)
   - **Install Command**: `npm install` (should auto-detect)
5. **DO NOT CLICK DEPLOY YET** - First add environment variables!

## Step 5: Add Environment Variables (CRITICAL)

**Before deploying**, add your environment variables:

1. **In the project configuration page**, scroll down to **"Environment Variables"**
2. **Click "Add New"** for each variable:

   **Variable 1:**
   - **Key**: `VITE_SUPABASE_URL`
   - **Value**: Your Supabase project URL (e.g., `https://xxxxx.supabase.co`)
   - **Environment**: Select **Production**, **Preview**, and **Development** (or click "All Environments")
   - Click **"Save"**

   **Variable 2:**
   - **Key**: `VITE_SUPABASE_PUBLISHABLE_KEY`
   - **Value**: Your Supabase anon/public key
   - **Environment**: Select **Production**, **Preview**, and **Development** (or click "All Environments")
   - Click **"Save"**

3. **Verify both variables are listed** before proceeding

## Step 6: Deploy

1. **Click "Deploy"** button
2. **Wait for build to complete** (usually 1-2 minutes)
3. **Check build logs** for any errors

## Step 7: Verify Deployment

1. **Visit your deployment URL** (e.g., `https://your-project.vercel.app`)
2. **Open browser console** (F12) to check for errors
3. **Expected behavior**:
   - If env vars are missing: You'll see a configuration error screen
   - If env vars are set correctly: App should load normally

## Step 8: Configure Supabase CORS (If Needed)

1. **Go to Supabase Dashboard** → Settings → API
2. **Scroll to "Allowed Origins"**
3. **Add your Vercel URL**: `https://your-project.vercel.app`
4. **Click "Save"**

## Troubleshooting

### Build Fails
- Check build logs in Vercel dashboard
- Ensure Node.js version is compatible (Vercel auto-detects)
- Verify all dependencies are in `package.json`

### White Screen After Deployment
1. **Check browser console** (F12) for errors
2. **Verify environment variables** are set correctly:
   - Go to Vercel → Project → Settings → Environment Variables
   - Ensure both variables are present
   - Ensure they're set for "Production" environment
3. **Redeploy** after adding/fixing variables:
   - Go to Deployments → Latest → "..." → "Redeploy"

### Environment Variables Not Working
- Variables must start with `VITE_` (required for Vite)
- No quotes around values in Vercel
- Case-sensitive: `VITE_SUPABASE_URL` not `vite_supabase_url`
- Must redeploy after adding variables

### Still Having Issues?

1. **Check Vercel build logs** for specific errors
2. **Check browser console** (F12) for runtime errors
3. **Verify Supabase project is active** (not paused)
4. **Test locally first**:
   ```bash
   npm run build
   npm run preview
   ```

## Quick Checklist

- [ ] Deleted old Vercel project
- [ ] Created new Vercel project
- [ ] Added `VITE_SUPABASE_URL` environment variable
- [ ] Added `VITE_SUPABASE_PUBLISHABLE_KEY` environment variable
- [ ] Set variables for Production, Preview, and Development
- [ ] Deployed successfully
- [ ] Verified app loads (not white screen)
- [ ] Added Vercel URL to Supabase allowed origins

## Alternative: Use Vercel CLI

If you prefer using the CLI:

```bash
# Install Vercel CLI (if not installed)
npm i -g vercel

# Login
vercel login

# Link to project (will create new project)
vercel

# Set environment variables
vercel env add VITE_SUPABASE_URL production
vercel env add VITE_SUPABASE_PUBLISHABLE_KEY production

# Deploy
vercel --prod
```

---

**Need Help?** Check the main [DEPLOYMENT.md](./DEPLOYMENT.md) for more detailed information.

