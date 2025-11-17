# Build Checklist - Preventing Missing Files

## Problem
Build failures can occur when files that are imported by other files are not tracked in git. Vercel (and other CI/CD systems) only have access to files that are committed to the repository.

## Solution

### Pre-Commit Checklist
Before committing changes that might affect the build:

1. **Check for untracked files:**
   ```bash
   git status
   ```

2. **Run the build check script:**
   ```bash
   ./.git-check-build-files.sh
   ```

3. **Verify all imports resolve:**
   ```bash
   npm run build
   ```

### Files That Must Be Tracked

#### Critical Directories
- `src/services/*.ts` - All service files
- `src/components/*.tsx` - All component files  
- `src/hooks/*.ts` - All hook files
- `src/pages/*.tsx` - All page files
- `supabase/migrations/*.sql` - All database migrations
- `supabase/functions/**/*.ts` - All Edge Functions

#### Common Issues

**Issue:** Build fails with "Could not resolve" error
**Cause:** File exists locally but isn't tracked in git
**Fix:** 
```bash
git add <missing-file>
git commit -m "Add missing file for build"
git push
```

**Issue:** Import works locally but fails on Vercel
**Cause:** File not in repository
**Fix:** Check `git status` and add any untracked files

### Automated Check

The `.git-check-build-files.sh` script checks for untracked files in critical directories. Run it before pushing:

```bash
./.git-check-build-files.sh
```

If it finds untracked files, review them and add them if they're needed for the build.

### Best Practices

1. **Always test builds locally** before pushing:
   ```bash
   npm run build
   ```

2. **Check git status** before committing:
   ```bash
   git status
   ```

3. **Add related files together** - If you create a new service, also add:
   - The service file
   - Any hooks that use it
   - Any components that use those hooks
   - Any migrations if database changes are needed

4. **Review imports** - When adding a new import, verify the file exists and is tracked:
   ```bash
   git ls-files | grep <filename>
   ```

### Quick Reference

```bash
# Check for untracked files in critical directories
find src/services src/components src/hooks -name "*.ts" -o -name "*.tsx" | \
  xargs -I {} sh -c 'git ls-files --error-unmatch {} >/dev/null 2>&1 || echo "UNTRACKED: {}"'

# Add all untracked TypeScript/TSX files
git add src/**/*.ts src/**/*.tsx

# Verify build works
npm run build
```

