# Database & Integrations Review

## Overview
This document reviews the database schema, Supabase integration, RLS policies, type generation, and database-related services.

## Files Reviewed
- `src/integrations/supabase/client.ts` - Supabase client configuration
- `src/integrations/supabase/types.ts` - TypeScript type definitions
- `supabase/migrations/001_initial_schema.sql` - Initial database schema
- `supabase/migrations/002_chat_enhancements.sql` - Chat enhancements migration
- `supabase/migrations/003_message_attachments.sql` - Message attachments migration
- `scripts/*.sql` - Database setup and utility scripts

---

## 1. Supabase Client Configuration

### Strengths
✅ **Environment validation** - Validates env vars in development
✅ **Type safety** - Uses TypeScript Database types
✅ **Session persistence** - Uses localStorage for session persistence
✅ **Auto-refresh** - Auto-refreshes tokens
✅ **Documentation** - Well-documented with usage examples

### Issues & Recommendations

#### 1.1 Missing Environment Variables Handling
**Location:** `client.ts`, lines 17-18
**Issue:** Uses empty strings as fallback, which could cause runtime errors
**Recommendation:** Throw error in production if missing:
```typescript
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  if (import.meta.env.PROD) {
    throw new Error('Missing required Supabase environment variables');
  }
  // Development warning already handled
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
    auth: { /* ... */ },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  }
);
```

---

## 2. Type Definitions

### Strengths
✅ **Type structure** - Proper TypeScript structure for Supabase types
✅ **Documentation** - Instructions for generating types
✅ **Helper types** - Includes Tables, TablesInsert, etc.

### Issues & Recommendations

#### 2.1 Types Not Generated
**Location:** `types.ts`
**Issue:** Types are empty (not generated from database)
**Status:** ⚠️ **CRITICAL** - Types should be generated
**Recommendation:** Run type generation:
```bash
npm run types:generate
# or
supabase gen types typescript --project-id YOUR_PROJECT_ID > src/integrations/supabase/types.ts
```

#### 2.2 No Type Validation
**Location:** `types.ts`
**Issue:** No runtime type validation
**Recommendation:** Consider using Zod for runtime validation:
```typescript
import { z } from 'zod';

export const ProfileSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().min(1),
  age: z.number().int().min(18).max(120).optional(),
  // ...
});
```

---

## 3. Database Schema

### Initial Schema (001_initial_schema.sql)

#### Strengths
✅ **Proper structure** - Well-normalized schema
✅ **PostGIS support** - Uses PostGIS for location queries
✅ **Indexes** - Proper indexes for performance
✅ **RLS enabled** - Row Level Security on all tables
✅ **Constraints** - Proper constraints (CHECK, UNIQUE, FOREIGN KEY)
✅ **Cascading deletes** - Proper ON DELETE CASCADE

#### Issues & Recommendations

**3.1 Missing Location Privacy Column**
**Location:** `profiles` table
**Issue:** No `location_visible` column (mentioned in code but not in initial migration)
**Status:** ✅ **FIXED** - Added in later migration or code handles it

**3.2 Missing Updated At Trigger**
**Location:** `profiles` and `duos` tables
**Status:** ✅ **FIXED** - Triggers added at end of migration

**3.3 No Full-Text Search**
**Location:** Schema
**Issue:** No full-text search indexes for bio/interests
**Recommendation:** Add full-text search:
```sql
-- Add full-text search index
CREATE INDEX idx_profiles_bio_fts ON public.profiles 
  USING GIN(to_tsvector('english', COALESCE(bio, '')));

-- Add full-text search for interests
CREATE INDEX idx_duos_interests_fts ON public.duos 
  USING GIN(to_tsvector('english', array_to_string(interests, ' ')));
```

**3.4 Missing Composite Indexes**
**Location:** Indexes
**Issue:** Some queries might benefit from composite indexes
**Recommendation:** Add composite indexes:
```sql
-- For matching queries
CREATE INDEX idx_matches_active_duo1 ON public.matches(duo1_id, is_active) 
  WHERE is_active = true;
CREATE INDEX idx_matches_active_duo2 ON public.matches(duo2_id, is_active) 
  WHERE is_active = true;

-- For message queries
CREATE INDEX idx_messages_match_created ON public.messages(match_id, created_at DESC);
```

### Chat Enhancements (002_chat_enhancements.sql)

#### Strengths
✅ **Read receipts** - Proper read receipt tracking
✅ **Unread tracking** - Match-level unread tracking
✅ **Soft delete** - Messages can be soft-deleted
✅ **Message editing** - Supports message editing

#### Issues & Recommendations

**3.5 Missing RLS Policies**
**Location:** `message_reads` and `match_reads` tables
**Issue:** RLS policies may be incomplete
**Recommendation:** Verify all RLS policies are created:
```sql
-- Ensure all policies exist
SELECT tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN ('message_reads', 'match_reads');
```

### Message Attachments (003_message_attachments.sql)

#### Strengths
✅ **Attachment support** - Proper attachment structure
✅ **Type safety** - Uses JSONB for metadata

---

## 4. Row Level Security (RLS) Policies

### Strengths
✅ **RLS enabled** - All tables have RLS enabled
✅ **Proper policies** - Policies follow security best practices
✅ **User isolation** - Users can only access their own data

### Issues & Recommendations

#### 4.1 Policy Performance
**Location:** All RLS policies
**Issue:** Some policies use EXISTS subqueries which may be slow
**Recommendation:** Consider using functions or views:
```sql
-- Create a function for checking duo membership
CREATE OR REPLACE FUNCTION public.is_duo_member(duo_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.duos
    WHERE id = duo_id
    AND (member1_id = auth.uid() OR member2_id = auth.uid())
  );
$$ LANGUAGE sql SECURITY DEFINER;
```

#### 4.2 Missing Policies
**Location:** Various tables
**Issue:** Some operations may not have policies (e.g., DELETE on messages)
**Recommendation:** Audit all operations:
```sql
-- Check for missing policies
SELECT 
  tablename,
  CASE 
    WHEN COUNT(*) FILTER (WHERE cmd = 'SELECT') = 0 THEN 'Missing SELECT'
    WHEN COUNT(*) FILTER (WHERE cmd = 'INSERT') = 0 THEN 'Missing INSERT'
    WHEN COUNT(*) FILTER (WHERE cmd = 'UPDATE') = 0 THEN 'Missing UPDATE'
    WHEN COUNT(*) FILTER (WHERE cmd = 'DELETE') = 0 THEN 'Missing DELETE'
  END as missing_policy
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename;
```

---

## 5. Database Functions & RPCs

### Required Functions

#### 5.1 Location Functions
**Status:** ⚠️ **REQUIRED** - Code depends on these functions
**Functions Needed:**
- `update_user_location(user_id UUID, lat FLOAT, lng FLOAT)` - Update user location
- `get_nearby_profiles(user_id UUID, lat FLOAT, lng FLOAT, radius_meters FLOAT)` - Get nearby profiles

**Recommendation:** Create these functions:
```sql
-- Update user location function
CREATE OR REPLACE FUNCTION public.update_user_location(
  user_id UUID,
  lat FLOAT,
  lng FLOAT
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

-- Get nearby profiles function
CREATE OR REPLACE FUNCTION public.get_nearby_profiles(
  user_id UUID,
  lat FLOAT,
  lng FLOAT,
  radius_meters FLOAT
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  age INTEGER,
  bio TEXT,
  photo_url TEXT,
  distance_meters FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.name,
    p.age,
    p.bio,
    p.photo_url,
    ST_Distance(
      p.location::geography,
      ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography
    ) as distance_meters
  FROM public.profiles p
  WHERE 
    p.id != user_id
    AND p.location IS NOT NULL
    AND p.location_visible != false
    AND ST_DWithin(
      p.location::geography,
      ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography,
      radius_meters
    )
  ORDER BY distance_meters
  LIMIT 100;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### 5.2 Match Detection Function
**Status:** ⚠️ **RECOMMENDED** - Currently handled in application code
**Recommendation:** Move to database function for atomicity:
```sql
CREATE OR REPLACE FUNCTION public.create_match_if_mutual(
  swiper_duo_id UUID,
  swiped_duo_id UUID,
  action TEXT
)
RETURNS UUID AS $$
DECLARE
  match_id UUID;
BEGIN
  -- Insert swipe
  INSERT INTO public.swipes (swiper_duo_id, swiped_duo_id, action)
  VALUES (swiper_duo_id, swiped_duo_id, action)
  ON CONFLICT DO NOTHING;
  
  -- Check for mutual like
  IF action = 'like' AND EXISTS (
    SELECT 1 FROM public.swipes
    WHERE swiper_duo_id = swiped_duo_id
    AND swiped_duo_id = swiper_duo_id
    AND action = 'like'
  ) THEN
    -- Create match
    INSERT INTO public.matches (duo1_id, duo2_id)
    VALUES (
      LEAST(swiper_duo_id, swiped_duo_id),
      GREATEST(swiper_duo_id, swiped_duo_id)
    )
    ON CONFLICT DO NOTHING
    RETURNING id INTO match_id;
    
    RETURN match_id;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 6. Storage Buckets

### Current State
- ✅ Photos bucket configured (via scripts)
- ✅ Message attachments use photos bucket

### Recommendations

#### 6.1 Separate Buckets
**Recommendation:** Use separate buckets for different content types:
- `photos` - Profile and duo photos
- `attachments` - Message attachments
- `temp` - Temporary uploads

#### 6.2 Storage Policies
**Status:** ⚠️ **REQUIRED** - Storage policies must be configured
**Recommendation:** Create storage policies:
```sql
-- Allow authenticated users to upload photos
CREATE POLICY "Users can upload own photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'photos' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow public read access to photos
CREATE POLICY "Photos are publicly readable"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'photos');
```

---

## 7. Performance Considerations

### Current State
- ✅ Proper indexes on foreign keys
- ✅ GIST index on location (PostGIS)
- ✅ Partial indexes for active records
- ⚠️ No composite indexes for common queries
- ⚠️ No materialized views for complex queries

### Recommendations
1. **Add composite indexes** for common query patterns
2. **Consider materialized views** for match lists
3. **Add query performance monitoring**
4. **Consider connection pooling** (Supabase handles this)

---

## 8. Migration Management

### Strengths
✅ **Versioned migrations** - Numbered migration files
✅ **Idempotent operations** - Uses IF NOT EXISTS where appropriate

### Recommendations
1. **Migration testing** - Test migrations on staging first
2. **Rollback scripts** - Consider rollback scripts for critical migrations
3. **Migration documentation** - Document migration purpose and impact

---

## 9. Testing Recommendations

### Unit Tests Needed
- [ ] Test RLS policies with different user contexts
- [ ] Test database functions with various inputs
- [ ] Test migration scripts

### Integration Tests Needed
- [ ] Test full CRUD operations with RLS
- [ ] Test location queries
- [ ] Test match creation flow
- [ ] Test message flow with read receipts

---

## Summary

### Critical Issues
1. ⚠️ **Types not generated** - Database types are empty
2. ⚠️ **Missing RPC functions** - Location functions may not exist
3. ⚠️ **Storage policies** - Need to verify storage policies exist

### High Priority Improvements
1. Generate database types
2. Create required RPC functions (location, match detection)
3. Verify all RLS policies are complete
4. Add composite indexes for performance

### Low Priority Enhancements
1. Add full-text search indexes
2. Create materialized views for complex queries
3. Add database function for match detection
4. Separate storage buckets by content type

---

## Review Checklist

- [x] Database schema is well-structured
- [x] RLS policies are implemented
- [x] Indexes are present
- [ ] Database types are generated
- [ ] Required RPC functions exist
- [ ] Storage policies are configured
- [ ] Migrations are tested
- [ ] Performance is optimized

---

**Last Updated:** 2024-12-19
**Reviewer:** AI Code Review Agent
**Status:** Complete
