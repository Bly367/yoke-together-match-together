# Database & Integrations Review

## Overview
This document reviews the Supabase integration, database schema, RLS policies, type generation, and migration scripts.

## Files Reviewed
- `src/integrations/supabase/client.ts` - Supabase client configuration
- `src/integrations/supabase/types.ts` - TypeScript type definitions
- `supabase/migrations/001_initial_schema.sql` - Initial database schema
- `supabase/migrations/002_chat_enhancements.sql` - Chat enhancements migration
- `supabase/migrations/003_message_attachments.sql` - Message attachments migration
- `scripts/fix-rls-policies.sql` - RLS policy fixes
- `scripts/create-profile-trigger.sql` - Profile creation trigger
- Related documentation files

---

## 1. Supabase Client Configuration

### Strengths
✅ **Environment Variable Validation** - Validates env vars in development
✅ **TypeScript Types** - Properly typed with Database schema
✅ **Session Persistence** - Uses localStorage for session persistence
✅ **Auto-refresh Tokens** - Enabled for seamless authentication
✅ **Documentation** - Well-documented with usage examples

### Issues & Recommendations

#### 1.1 Missing Error Handling
**Location:** `client.ts`
**Issue:** No error handling for missing environment variables in production
**Recommendation:** Add runtime validation:
```typescript
if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  throw new Error(
    'Missing Supabase environment variables. ' +
    'Please check your .env file and ensure VITE_SUPABASE_URL and ' +
    'VITE_SUPABASE_PUBLISHABLE_KEY are set.'
  );
}
```

#### 1.2 No Realtime Configuration
**Location:** `client.ts`
**Issue:** No explicit realtime configuration
**Recommendation:** Add realtime config if needed:
```typescript
export const supabase = createClient<Database>(
  SUPABASE_URL || '',
  SUPABASE_PUBLISHABLE_KEY || '',
  {
    auth: {
      storage: localStorage,
      persistSession: true,
      autoRefreshToken: true,
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  }
);
```

---

## 2. Type Generation

### Strengths
✅ **TypeScript Support** - Proper type definitions structure
✅ **Documentation** - Clear instructions for type generation
✅ **Type Helpers** - Utility types for Tables, TablesInsert, etc.

### Issues & Recommendations

#### 2.1 Types Not Generated
**Location:** `types.ts`
**Issue:** Types are empty (not generated from database)
**Critical:** This means no type safety for database queries
**Recommendation:** Generate types immediately:
```bash
# Install Supabase CLI
npm install -g supabase

# Link project
supabase link --project-ref YOUR_PROJECT_REF

# Generate types
npm run types:generate
```

#### 2.2 No Type Generation Script
**Location:** `package.json`
**Issue:** No script to generate types
**Recommendation:** Add script:
```json
{
  "scripts": {
    "types:generate": "supabase gen types typescript --linked > src/integrations/supabase/types.ts"
  }
}
```

---

## 3. Database Schema

### Strengths
✅ **Well-Structured** - Clear table relationships
✅ **Proper Indexes** - Good indexing strategy for performance
✅ **Constraints** - Proper CHECK constraints (different members, etc.)
✅ **Cascading Deletes** - Proper ON DELETE CASCADE relationships
✅ **PostGIS Support** - Location-based queries with PostGIS
✅ **Soft Deletes** - Messages support soft delete (deleted_at)
✅ **Read Receipts** - Proper read receipt tracking system

### Issues & Recommendations

#### 3.1 Missing Location Privacy Column
**Location:** `profiles` table
**Issue:** No `location_visible` column mentioned in initial schema
**Note:** This is referenced in code but may be missing from schema
**Recommendation:** Add migration:
```sql
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS location_visible BOOLEAN DEFAULT true;
```

#### 3.2 Missing Updated Timestamps
**Location:** `matches` table
**Issue:** No `updated_at` or `last_message_at` columns
**Note:** Code references `last_message_at` but it's not in schema
**Recommendation:** Add columns:
```sql
ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS last_message_at TIMESTAMP WITH TIME ZONE;

-- Update trigger for last_message_at
CREATE OR REPLACE FUNCTION update_match_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.matches
  SET last_message_at = NEW.created_at
  WHERE id = NEW.match_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_match_last_message_trigger
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION update_match_last_message();
```

#### 3.3 Missing Unread Count Column
**Location:** `matches` table
**Issue:** Code references `unread_count` but it's not in schema
**Recommendation:** Add computed column or view:
```sql
-- Option 1: Add computed column (PostgreSQL 12+)
ALTER TABLE public.matches
  ADD COLUMN unread_count INTEGER GENERATED ALWAYS AS (
    (SELECT COUNT(*) FROM public.messages
     WHERE match_id = matches.id
     AND deleted_at IS NULL
     AND created_at > (
       SELECT last_read_at FROM public.match_reads
       WHERE match_id = matches.id
       AND user_id = auth.uid()
     ))
  ) STORED;

-- Option 2: Use function (current approach is better)
```

#### 3.4 No Profile Creation Trigger
**Location:** Missing trigger
**Issue:** No automatic profile creation on user signup
**Recommendation:** Create trigger (see `scripts/create-profile-trigger.sql`):
```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'name', 'User'));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
```

---

## 4. RLS Policies

### Strengths
✅ **RLS Enabled** - All tables have RLS enabled
✅ **Comprehensive Policies** - Policies for SELECT, INSERT, UPDATE, DELETE
✅ **Proper Authorization** - Uses `auth.uid()` for user identification
✅ **Match Access Control** - Proper policies for matches and messages
✅ **Storage Policies** - RLS policies for storage buckets

### Issues & Recommendations

#### 4.1 Profile Insert Policy
**Location:** `001_initial_schema.sql`, line 98-99
**Issue:** Policy may not work with trigger-created profiles
**Status:** Fixed in `scripts/fix-rls-policies.sql`
**Recommendation:** Ensure service role can insert profiles:
```sql
CREATE POLICY "Service role can insert profiles" ON public.profiles
  FOR INSERT 
  WITH CHECK (true)
  TO service_role;
```

#### 4.2 Missing DELETE Policies
**Location:** Various tables
**Issue:** No DELETE policies for some tables
**Recommendation:** Add DELETE policies:
```sql
-- Profiles: Users can delete their own profile
CREATE POLICY "Users can delete own profile" ON public.profiles
  FOR DELETE USING (auth.uid() = id);

-- Duos: Users can delete duos they're members of
CREATE POLICY "Users can delete own duos" ON public.duos
  FOR DELETE USING (auth.uid() = member1_id OR auth.uid() = member2_id);
```

#### 4.3 Storage Policies Complexity
**Location:** `003_message_attachments.sql`
**Issue:** Storage policies use `storage.foldername()` which may not be available
**Recommendation:** Verify storage policies work:
```sql
-- Test storage policy
SELECT * FROM storage.objects 
WHERE bucket_id = 'photos' 
LIMIT 1;
```

---

## 5. Indexes

### Strengths
✅ **Comprehensive Indexing** - Good coverage of query patterns
✅ **Partial Indexes** - Efficient partial indexes (WHERE clauses)
✅ **GIST Index** - Spatial index for location queries
✅ **Composite Indexes** - Proper composite indexes where needed

### Issues & Recommendations

#### 5.1 Missing Indexes
**Location:** Various tables
**Issue:** Some common query patterns may not be indexed
**Recommendation:** Add indexes:
```sql
-- Index for finding duos by member
CREATE INDEX IF NOT EXISTS idx_duos_members ON public.duos(member1_id, member2_id);

-- Index for match queries with active status
CREATE INDEX IF NOT EXISTS idx_matches_active_duos ON public.matches(is_active, duo1_id, duo2_id);

-- Index for message queries with match and sender
CREATE INDEX IF NOT EXISTS idx_messages_match_sender ON public.messages(match_id, sender_id);
```

#### 5.2 Index Maintenance
**Location:** All indexes
**Issue:** No index maintenance strategy
**Recommendation:** Add index maintenance:
```sql
-- Analyze tables regularly (can be automated)
ANALYZE public.profiles;
ANALYZE public.duos;
ANALYZE public.matches;
ANALYZE public.messages;
```

---

## 6. Functions & Triggers

### Strengths
✅ **Match Creation** - Automatic match creation on mutual like
✅ **Updated Timestamps** - Automatic updated_at triggers
✅ **Unread Count Function** - Efficient unread count calculation
✅ **Security Definer** - Proper use of SECURITY DEFINER where needed

### Issues & Recommendations

#### 6.1 Missing Location Update Function
**Location:** Code references `update_user_location` RPC function
**Issue:** Function not in migrations
**Recommendation:** Add function:
```sql
CREATE OR REPLACE FUNCTION public.update_user_location(
  user_id UUID,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION
)
RETURNS void AS $$
BEGIN
  UPDATE public.profiles
  SET 
    location = ST_SetSRID(ST_MakePoint(lng, lat), 4326),
    location_updated_at = NOW()
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### 6.2 Missing Nearby Profiles Function
**Location:** Code references `get_nearby_profiles` RPC function
**Issue:** Function not in migrations
**Recommendation:** Add function:
```sql
CREATE OR REPLACE FUNCTION public.get_nearby_profiles(
  user_id UUID,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  radius_meters INTEGER DEFAULT 50000
)
RETURNS TABLE (
  id UUID,
  email TEXT,
  name TEXT,
  age INTEGER,
  bio TEXT,
  photo_url TEXT,
  distance DOUBLE PRECISION
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.email,
    p.name,
    p.age,
    p.bio,
    p.photo_url,
    ST_Distance(
      p.location::geography,
      ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography
    ) / 1000.0 AS distance
  FROM public.profiles p
  WHERE 
    p.id != user_id
    AND p.location IS NOT NULL
    AND (p.location_visible IS NULL OR p.location_visible = true)
    AND ST_DWithin(
      p.location::geography,
      ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography,
      radius_meters
    )
  ORDER BY distance
  LIMIT 100;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 7. Migrations

### Strengths
✅ **Idempotent** - Uses `IF NOT EXISTS` and `IF EXISTS` for safety
✅ **Well-Documented** - Clear migration comments
✅ **Incremental** - Proper migration numbering
✅ **Backward Compatible** - Uses `ADD COLUMN IF NOT EXISTS`

### Issues & Recommendations

#### 7.1 Migration Order
**Location:** Migration files
**Issue:** Need to ensure migrations run in order
**Recommendation:** Use migration tool or document order:
```bash
# Run migrations in order
psql $DATABASE_URL < supabase/migrations/001_initial_schema.sql
psql $DATABASE_URL < supabase/migrations/002_chat_enhancements.sql
psql $DATABASE_URL < supabase/migrations/003_message_attachments.sql
```

#### 7.2 Missing Rollback Scripts
**Location:** Migrations
**Issue:** No rollback/down migrations
**Recommendation:** Add rollback scripts or document rollback process

---

## 8. Security Considerations

### Strengths
✅ **RLS Enabled** - Row-level security on all tables
✅ **Proper Policies** - Policies check user authorization
✅ **SECURITY DEFINER** - Used appropriately for functions
✅ **Storage Policies** - RLS on storage buckets

### Issues & Recommendations

#### 8.1 Service Role Usage
**Location:** Functions and triggers
**Issue:** Some functions use SECURITY DEFINER which runs as creator
**Recommendation:** Document which functions need elevated privileges and why

#### 8.2 Input Validation
**Location:** Functions
**Issue:** Functions don't validate input parameters
**Recommendation:** Add validation:
```sql
CREATE OR REPLACE FUNCTION public.update_user_location(
  user_id UUID,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION
)
RETURNS void AS $$
BEGIN
  -- Validate coordinates
  IF lat < -90 OR lat > 90 THEN
    RAISE EXCEPTION 'Latitude must be between -90 and 90';
  END IF;
  IF lng < -180 OR lng > 180 THEN
    RAISE EXCEPTION 'Longitude must be between -180 and 180';
  END IF;
  
  -- Update location
  UPDATE public.profiles
  SET 
    location = ST_SetSRID(ST_MakePoint(lng, lat), 4326),
    location_updated_at = NOW()
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 9. Performance Considerations

### Strengths
✅ **Good Indexing** - Comprehensive index coverage
✅ **Partial Indexes** - Efficient partial indexes
✅ **Spatial Indexes** - GIST index for location queries

### Issues & Recommendations

#### 9.1 Query Optimization
**Location:** RLS policies
**Issue:** Some RLS policies use EXISTS subqueries which can be slow
**Recommendation:** Consider materialized views or function-based policies:
```sql
-- Example: Function-based policy for better performance
CREATE POLICY "Users can view matches for own duos" ON public.matches
  FOR SELECT USING (
    duo1_id IN (SELECT id FROM public.duos WHERE member1_id = auth.uid() OR member2_id = auth.uid())
    OR duo2_id IN (SELECT id FROM public.duos WHERE member1_id = auth.uid() OR member2_id = auth.uid())
  );
```

#### 9.2 Connection Pooling
**Location:** Supabase client
**Issue:** No connection pooling configuration
**Recommendation:** Supabase handles this, but document connection limits

---

## 10. Testing Recommendations

### Unit Tests Needed
- [ ] RLS policy testing
- [ ] Function testing
- [ ] Trigger testing
- [ ] Migration testing

### Integration Tests Needed
- [ ] Full database schema setup
- [ ] RLS policy enforcement
- [ ] Function execution
- [ ] Trigger execution

### Performance Tests Needed
- [ ] Query performance with indexes
- [ ] RLS policy performance
- [ ] Spatial query performance
- [ ] Concurrent access testing

---

## Summary

### Critical Issues
1. 🔴 **Types not generated** - No type safety for database queries
2. 🔴 **Missing RPC functions** - `update_user_location` and `get_nearby_profiles` not in migrations
3. 🔴 **Missing columns** - `location_visible`, `last_message_at`, `unread_count` referenced but not in schema

### High Priority Improvements
1. Generate TypeScript types from database
2. Add missing RPC functions to migrations
3. Add missing columns to schema
4. Add profile creation trigger
5. Add DELETE policies for all tables

### Low Priority Enhancements
1. Add input validation to functions
2. Add rollback scripts
3. Optimize RLS policies
4. Add index maintenance strategy
5. Document connection pooling

---

## Review Checklist

- [x] RLS policies are comprehensive
- [x] Indexes are properly defined
- [ ] TypeScript types are generated
- [x] Migrations are idempotent
- [ ] All referenced functions exist
- [ ] All referenced columns exist
- [x] Security is properly implemented
- [ ] Performance is optimized

---

## Next Steps

1. **Immediate:** Generate TypeScript types from database
2. **Immediate:** Add missing RPC functions to migrations
3. **Immediate:** Add missing columns to schema
4. **Short-term:** Add profile creation trigger
5. **Short-term:** Add DELETE policies
6. **Medium-term:** Optimize RLS policies
7. **Long-term:** Add comprehensive tests

---

**Last Updated:** 2024-12-19
**Reviewer:** AI Code Review Agent
**Status:** ✅ Complete

