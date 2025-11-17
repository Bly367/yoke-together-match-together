# Deployment Checklist

Use this checklist before deploying to production.

## Pre-Deployment

### Code & Build
- [ ] All code is committed and pushed to GitHub
- [ ] Build succeeds locally (`npm run build`)
- [ ] Production build preview works (`npm run preview`)
- [ ] No console errors in production build
- [ ] All tests pass (if applicable)

### Database
- [ ] All migrations are applied to Supabase production database
- [ ] Database schema matches `supabase/migrations/` files
- [ ] RLS (Row Level Security) policies are configured
- [ ] Storage bucket `photos` exists and is configured
- [ ] Storage bucket has appropriate RLS policies

### Environment Variables
- [ ] `VITE_SUPABASE_URL` - Your Supabase project URL
- [ ] `VITE_SUPABASE_PUBLISHABLE_KEY` - Your Supabase anon/public key
- [ ] Environment variables are set in deployment platform (Vercel/Netlify/etc.)

### Supabase Configuration
- [ ] Supabase project is active (not paused)
- [ ] API keys are correct
- [ ] CORS is configured (add deployment URL to allowed origins)
- [ ] Email templates are configured (if using email auth)
- [ ] Auth providers are configured (if using OAuth)

### Security
- [ ] `.env` file is in `.gitignore` (never commit secrets)
- [ ] Only anon/public key is used in frontend (never service role key)
- [ ] RLS policies are properly configured
- [ ] No hardcoded secrets in code

## Deployment Platform Setup

### Vercel
- [ ] Project imported from GitHub
- [ ] Build command: `npm run build`
- [ ] Output directory: `dist`
- [ ] Framework preset: Vite
- [ ] Environment variables added
- [ ] Custom domain configured (optional)

### Netlify
- [ ] Project imported from GitHub
- [ ] `netlify.toml` is present
- [ ] Environment variables added
- [ ] Custom domain configured (optional)

## Post-Deployment

### Verification
- [ ] App loads at deployment URL
- [ ] Authentication flow works (sign up/sign in)
- [ ] Profile creation works
- [ ] Duo creation works
- [ ] Matching system works
- [ ] Chat/messaging works
- [ ] Images upload and display correctly
- [ ] No console errors in browser
- [ ] Mobile responsive design works

### Monitoring
- [ ] Error tracking is set up (optional)
- [ ] Analytics is configured (optional)
- [ ] Supabase dashboard shows activity
- [ ] Deployment logs show no errors

### Documentation
- [ ] Deployment URL is documented
- [ ] Team members have access
- [ ] Environment variables are documented (without values)

## Quick Deploy Commands

```bash
# 1. Build locally to test
npm run build

# 2. Preview production build
npm run preview

# 3. Commit and push
git add .
git commit -m "Prepare for deployment"
git push origin main

# 4. Deploy (automatic if using Vercel/Netlify with GitHub integration)
# Or manually deploy via platform dashboard
```

## Troubleshooting

If deployment fails:
1. Check build logs in deployment platform
2. Verify environment variables are set correctly
3. Check Supabase project is active
4. Review browser console for errors
5. Check Supabase logs for database errors

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed instructions.

