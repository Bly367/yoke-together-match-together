# Deployment Guide

This guide will help you deploy the Yoke dating app to production so it's accessible to users worldwide.

## Quick Deploy Options

### Option 1: Deploy to Vercel (Recommended)

Vercel is the easiest and fastest way to deploy a Vite + React app.

#### Prerequisites
- GitHub account
- Vercel account (free tier available)
- Supabase project set up

#### Steps

1. **Push your code to GitHub** (if not already done)
   ```bash
   git add .
   git commit -m "Prepare for deployment"
   git push origin main
   ```

2. **Sign up for Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Sign up with your GitHub account

3. **Import your project**
   - Click "Add New Project"
   - Import your GitHub repository
   - Vercel will auto-detect Vite configuration

4. **Configure environment variables**
   - In the Vercel project settings, go to "Environment Variables"
   - Add the following:
     ```
     VITE_SUPABASE_URL=your_supabase_project_url
     VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
     ```
   - Make sure to add them for **Production**, **Preview**, and **Development** environments

5. **Deploy**
   - Click "Deploy"
   - Wait for the build to complete (usually 1-2 minutes)
   - Your app will be live at `https://your-project.vercel.app`

6. **Set up custom domain (optional)**
   - In Vercel project settings → Domains
   - Add your custom domain
   - Follow DNS configuration instructions

#### Automatic Deployments
- Every push to `main` branch → Production deployment
- Every pull request → Preview deployment
- Automatic HTTPS and CDN included

---

### Option 2: Deploy to Netlify

Netlify is another excellent option for static site hosting.

#### Steps

1. **Create `netlify.toml`** (already created in this project)
   ```toml
   [build]
     command = "npm run build"
     publish = "dist"

   [[redirects]]
     from = "/*"
     to = "/index.html"
     status = 200
   ```

2. **Sign up for Netlify**
   - Go to [netlify.com](https://netlify.com)
   - Sign up with GitHub

3. **Import and deploy**
   - Click "Add new site" → "Import an existing project"
   - Connect your GitHub repository
   - Build settings are auto-detected from `netlify.toml`

4. **Add environment variables**
   - Site settings → Environment variables
   - Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`

5. **Deploy**
   - Click "Deploy site"
   - Your app will be live at `https://your-project.netlify.app`

---

### Option 3: Deploy to Other Platforms

#### Cloudflare Pages
1. Connect GitHub repository
2. Build command: `npm run build`
3. Output directory: `dist`
4. Add environment variables in settings

#### AWS Amplify
1. Connect repository
2. Build settings: Auto-detect or use:
   - Build command: `npm run build`
   - Output directory: `dist`
3. Add environment variables

#### GitHub Pages
1. Install `gh-pages`: `npm install --save-dev gh-pages`
2. Add to `package.json`:
   ```json
   "scripts": {
     "deploy": "npm run build && gh-pages -d dist"
   }
   ```
3. Run `npm run deploy`
4. Configure in GitHub repo settings → Pages

---

## Pre-Deployment Checklist

Before deploying, ensure:

- [ ] **Database schema is applied**
  - Run all migrations in `supabase/migrations/`
  - Verify tables exist in Supabase Dashboard

- [ ] **Storage bucket is created**
  - Create `photos` bucket in Supabase Storage
  - Set appropriate RLS policies

- [ ] **Environment variables are set**
  - `VITE_SUPABASE_URL` - Your Supabase project URL
  - `VITE_SUPABASE_PUBLISHABLE_KEY` - Your Supabase anon key

- [ ] **Build succeeds locally**
  ```bash
  npm run build
  ```
  - Check for any build errors
  - Test the production build locally:
    ```bash
    npm run preview
    ```

- [ ] **Supabase RLS policies are configured**
  - Verify Row Level Security is enabled
  - Test policies allow appropriate access

- [ ] **CORS is configured** (if needed)
  - Add your deployment URL to Supabase allowed origins
  - Supabase Dashboard → Settings → API → Allowed Origins

---

## Post-Deployment Steps

### 1. Verify Deployment
- Visit your deployment URL
- Test authentication flow
- Test core features (profile creation, matching, chat)

### 2. Configure Supabase
- Add your production URL to Supabase allowed origins:
  - Supabase Dashboard → Settings → API
  - Add `https://your-app.vercel.app` to "Allowed Origins"

### 3. Set up Monitoring (Optional)
- Enable Vercel Analytics (if using Vercel)
- Set up error tracking (Sentry, LogRocket, etc.)
- Monitor Supabase usage and quotas

### 4. Test Production Build Locally
```bash
# Build production version
npm run build

# Preview production build
npm run preview
```

---

## Environment Variables Reference

### Required Variables
| Variable | Description | Where to Get It |
|----------|-------------|-----------------|
| `VITE_SUPABASE_URL` | Your Supabase project URL | Supabase Dashboard → Settings → API → Project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Your Supabase anon/public key | Supabase Dashboard → Settings → API → anon public key |

### Optional Variables
| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_SUPABASE_PHOTOS_BUCKET` | Storage bucket name for photos | `photos` |
| `VITE_ENV` | Environment identifier | `development` |

---

## Troubleshooting

### Build Fails
- Check build logs for specific errors
- Ensure all dependencies are in `package.json`
- Verify Node.js version matches `.nvmrc` (if present)

### Environment Variables Not Working
- Ensure variables are prefixed with `VITE_` (required for Vite)
- Restart deployment after adding variables
- Check variable names match exactly (case-sensitive)

### CORS Errors
- Add your deployment URL to Supabase allowed origins
- Check browser console for specific CORS error messages

### Database Connection Issues
- Verify Supabase URL and key are correct
- Check Supabase project is active (not paused)
- Verify RLS policies allow necessary operations

### Assets Not Loading
- Check `vite.config.ts` base path configuration
- Verify asset paths are relative (not absolute)
- Check CDN/caching settings

---

## Continuous Deployment

### Automatic Deployments
Most platforms support automatic deployments:
- **Vercel**: Automatic on push to `main` branch
- **Netlify**: Automatic on push to `main` branch
- **Cloudflare Pages**: Automatic on push to `main` branch

### Branch Deployments
- Create preview deployments for pull requests
- Test changes before merging to production

### Deployment Workflow
```
1. Make changes locally
2. Test locally (`npm run dev`)
3. Commit and push to GitHub
4. Automatic deployment triggers
5. Preview deployment created (for PRs)
6. Merge to main → Production deployment
```

---

## Security Considerations

### Environment Variables
- ✅ Never commit `.env` files to git
- ✅ Use platform environment variable settings
- ✅ Rotate keys periodically
- ✅ Use different keys for dev/staging/production

### Supabase Security
- ✅ Enable Row Level Security (RLS) on all tables
- ✅ Use service role key only on server-side (never in frontend)
- ✅ Regularly review RLS policies
- ✅ Monitor Supabase logs for suspicious activity

### API Security
- ✅ Use HTTPS only (enforced by most platforms)
- ✅ Validate all user inputs
- ✅ Implement rate limiting (Supabase handles this)
- ✅ Use Supabase Auth for authentication (never roll your own)

---

## Performance Optimization

### Build Optimization
- Code splitting is automatic with Vite
- Assets are automatically optimized
- Tree shaking removes unused code

### Runtime Optimization
- React Query caches API responses
- Images are served from Supabase Storage CDN
- Static assets are cached by CDN

### Monitoring
- Use Vercel Analytics for performance metrics
- Monitor Supabase usage and response times
- Set up alerts for errors and downtime

---

## Support

If you encounter issues:
1. Check the [Troubleshooting Guide](./TROUBLESHOOTING.md)
2. Review deployment platform logs
3. Check Supabase Dashboard for errors
4. Review browser console for client-side errors

---

## Next Steps

After deployment:
1. Share your app URL with users
2. Monitor usage and performance
3. Gather user feedback
4. Iterate and improve based on feedback
5. Scale Supabase plan if needed

Happy deploying! 🚀

