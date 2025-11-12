# Generating Supabase Types

This guide explains how to generate TypeScript types from your Supabase database schema.

## Why Generate Types?

- ✅ **Type Safety**: Catch database errors at compile time
- ✅ **Auto-completion**: Get IntelliSense for table and column names
- ✅ **Schema Sync**: Keep types in sync with your database schema
- ✅ **Documentation**: Types serve as documentation of your database structure

## Prerequisites

1. **Supabase CLI installed**:
   ```bash
   npm install -g supabase
   ```

2. **Project linked to Supabase**:
   ```bash
   supabase link --project-ref YOUR_PROJECT_REF
   ```
   
   Or if using remote project:
   ```bash
   supabase link --project-ref YOUR_PROJECT_REF --password YOUR_DB_PASSWORD
   ```

3. **Database schema applied**:
   - Make sure you've run the migration SQL in Supabase SQL Editor
   - See `SETUP_INSTRUCTIONS.md` for details

## Method 1: Using npm Script (Recommended)

```bash
npm run types:generate
```

This will:
1. Check if Supabase CLI is installed
2. Verify project is linked
3. Generate types from database schema
4. Save to `src/integrations/supabase/types.ts`

## Method 2: Using Supabase CLI Directly

```bash
supabase gen types typescript --linked > src/integrations/supabase/types.ts
```

## Method 3: Using Scripts

### Bash (Linux/macOS)
```bash
./scripts/generate-types.sh
```

### PowerShell (Windows)
```powershell
.\scripts\generate-types.ps1
```

### Node.js (Cross-platform)
```bash
node scripts/generate-types.js
```

## Checking if Types are Up to Date

```bash
npm run types:check
```

This will verify if types are in sync with the database schema.

## When to Regenerate Types

Regenerate types when:
- ✅ You modify the database schema
- ✅ You add new tables, columns, or indexes
- ✅ You change table structures
- ✅ You add or modify functions, views, or enums
- ✅ You update RLS policies (types may change)

## Troubleshooting

### Error: "Supabase CLI is not installed"
**Solution**: Install Supabase CLI:
```bash
npm install -g supabase
```

### Error: "Project not linked"
**Solution**: Link your project:
```bash
supabase link --project-ref YOUR_PROJECT_REF
```

You can find your project ref in:
- Supabase Dashboard → Settings → General → Reference ID
- Or in `supabase/config.toml` file

### Error: "Failed to generate types"
**Solutions**:
1. Make sure your database schema is applied
2. Verify you have the correct permissions
3. Check your Supabase project is active
4. Try logging in: `supabase login`

### Types are Empty
**Solution**: This means the database schema hasn't been applied yet. Run the migration SQL:
1. Go to Supabase Dashboard → SQL Editor
2. Copy content from `supabase/migrations/001_initial_schema.sql`
3. Paste and run in SQL Editor
4. Regenerate types: `npm run types:generate`

## Using Generated Types

Once types are generated, you can use them in your services:

```typescript
import { supabase } from '@/integrations/supabase/client';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

// Use generated types for table rows
type Profile = Tables<'profiles'>;
type Duo = Tables<'duos'>;

// Use generated types for inserts
type NewProfile = TablesInsert<'profiles'>;
type NewDuo = TablesInsert<'duos'>;

// Use generated types for updates
type ProfileUpdate = TablesUpdate<'profiles'>;
type DuoUpdate = TablesUpdate<'duos'>;

// Queries are now type-safe!
const { data } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', userId)
  .single();

// data is typed as Profile | null
```

## Integration with CI/CD

Add type generation check to your CI pipeline:

```yaml
# .github/workflows/ci.yml
- name: Check types are up to date
  run: npm run types:check
```

Or generate types automatically:

```yaml
- name: Generate types
  run: npm run types:generate
```

## Next Steps

1. Generate types: `npm run types:generate`
2. Review generated types: `src/integrations/supabase/types.ts`
3. Update services to use generated types (optional but recommended)
4. Add type generation to your development workflow

## See Also

- [Supabase CLI Documentation](https://supabase.com/docs/guides/cli)
- [TypeScript Types Guide](https://supabase.com/docs/guides/api/generating-types)
- [Integration Layer Review](./INTEGRATION_LAYER_REVIEW.md)

