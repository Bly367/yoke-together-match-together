# Post-Deployment Verification Guide

Congratulations on deploying your Yoke app to Vercel! 🎉

Follow this checklist to ensure everything is working correctly.

## ✅ Critical Steps (Do These First!)

### 1. Verify Environment Variables in Vercel

Your app needs these environment variables to work:

1. Go to your Vercel project dashboard
2. Click **Settings** → **Environment Variables**
3. Verify these are set:
   - ✅ `VITE_SUPABASE_URL` - Your Supabase project URL
   - ✅ `VITE_SUPABASE_PUBLISHABLE_KEY` - Your Supabase anon/public key

**If missing:**
- Add them now
- Redeploy (or wait for automatic redeploy)

### 2. Configure Supabase CORS

**This is critical!** Without this, your app won't be able to connect to Supabase.

1. Go to your **Supabase Dashboard**
2. Navigate to **Settings** → **API**
3. Scroll down to **"Allowed Origins"** or **"CORS"** section
4. Add your Vercel deployment URL:
   ```
   https://your-project.vercel.app
   ```
5. Also add your custom domain if you have one
6. Click **Save**

**Your Vercel URL format:**
- `https://your-project-name.vercel.app`
- Or your custom domain if configured

### 3. Test Your Deployment

Visit your Vercel URL and test these features:

#### Authentication
- [ ] App loads without errors
- [ ] Sign up page works
- [ ] Can create a new account
- [ ] Sign in works
- [ ] Sign out works

#### Core Features
- [ ] Profile creation/edit works
- [ ] Photo upload works
- [ ] Duo creation works
- [ ] Matching/swiping works
- [ ] Chat/messaging works
- [ ] No console errors in browser DevTools

#### Browser Console Check
1. Open browser DevTools (F12)
2. Go to **Console** tab
3. Look for any red errors
4. Common issues:
   - ❌ CORS errors → Add URL to Supabase allowed origins
   - ❌ "Missing environment variables" → Add env vars in Vercel
   - ❌ Network errors → Check Supabase project is active

## 🔍 Troubleshooting Common Issues

### Issue: "Missing required Supabase environment variables"

**Solution:**
1. Go to Vercel → Settings → Environment Variables
2. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`
3. Redeploy (or wait for auto-redeploy)

### Issue: CORS Errors in Browser Console

**Error looks like:**
```
Access to fetch at 'https://xxx.supabase.co/...' from origin 'https://your-app.vercel.app' 
has been blocked by CORS policy
```

**Solution:**
1. Go to Supabase Dashboard → Settings → API
2. Add your Vercel URL to "Allowed Origins"
3. Format: `https://your-project.vercel.app` (no trailing slash)
4. Save and wait a few minutes for changes to propagate

### Issue: App Loads But Shows Errors

**Check:**
1. Browser console for specific errors
2. Vercel deployment logs (Vercel Dashboard → Deployments → Click deployment → Logs)
3. Supabase logs (Supabase Dashboard → Logs)

### Issue: Database Connection Fails

**Verify:**
1. Supabase project is active (not paused)
2. Environment variables are correct in Vercel
3. Database migrations are applied (Supabase Dashboard → Table Editor)

### Issue: Images Not Loading

**Check:**
1. Storage bucket `photos` exists in Supabase
2. Bucket is set to public
3. RLS policies allow read access

## 📊 Monitoring Your Deployment

### Vercel Dashboard
- **Deployments**: View all deployments and their status
- **Analytics**: View traffic and performance (if enabled)
- **Logs**: View real-time logs from your app
- **Settings**: Configure domains, environment variables, etc.

### Supabase Dashboard
- **Table Editor**: View your database tables and data
- **Authentication**: View registered users
- **Storage**: View uploaded files
- **Logs**: View API requests and errors
- **Database**: Monitor database performance

## 🚀 Next Steps

### 1. Set Up Custom Domain (Optional)
1. In Vercel → Settings → Domains
2. Add your custom domain
3. Follow DNS configuration instructions
4. Update Supabase CORS with your custom domain

### 2. Enable Analytics (Optional)
1. Vercel → Settings → Analytics
2. Enable Web Analytics (free tier available)
3. Monitor user behavior and performance

### 3. Set Up Error Tracking (Recommended)
Consider adding error tracking:
- **Sentry** - Error monitoring
- **LogRocket** - Session replay
- **Vercel Analytics** - Built-in analytics

### 4. Configure Email (If Using Email Auth)
1. Supabase Dashboard → Authentication → Email Templates
2. Customize email templates
3. Configure SMTP settings (if using custom email)

### 5. Set Up Monitoring
- Monitor Supabase usage and quotas
- Set up alerts for errors
- Track deployment success rates

## ✅ Deployment Checklist

Use this checklist to verify everything:

### Pre-Deployment ✅
- [x] Code pushed to GitHub
- [x] Build succeeds locally
- [x] Environment variables documented

### Deployment ✅
- [x] Project deployed to Vercel
- [x] Build completed successfully
- [x] Deployment URL accessible

### Post-Deployment ✅
- [ ] Environment variables set in Vercel
- [ ] Supabase CORS configured
- [ ] App loads without errors
- [ ] Authentication works
- [ ] Core features work
- [ ] No console errors
- [ ] Images load correctly
- [ ] Database connection works

## 🎯 Quick Test Script

Run through these tests on your deployed app:

1. **Homepage**: Does it load?
2. **Sign Up**: Create a test account
3. **Profile**: Complete profile setup
4. **Upload**: Upload a profile photo
5. **Duo**: Create or join a duo
6. **Match**: Test matching/swiping
7. **Chat**: Send a message
8. **Sign Out**: Log out and sign back in

If all these work, your deployment is successful! 🎉

## 📞 Need Help?

If you encounter issues:
1. Check browser console for errors
2. Check Vercel deployment logs
3. Check Supabase logs
4. Review [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
5. Review [DEPLOYMENT.md](./DEPLOYMENT.md)

---

**Your app is now live!** Share your Vercel URL with users to start using the app. 🚀

