# Troubleshooting Guide

This document contains solutions to common issues and errors encountered during development.

---

## Table of Contents

1. [Database & Supabase Issues](#database--supabase-issues)
2. [React Hooks Errors](#react-hooks-errors)
3. [Query & Data Fetching Issues](#query--data-fetching-issues)
4. [Authentication Issues](#authentication-issues)
5. [Performance Issues](#performance-issues)

---

## Database & Supabase Issues

### Error: "column profiles_1.location does not exist" (Code: 42703)

**Symptoms:**
- Error when fetching duos or matches with member profiles
- Error message: `column profiles_1.location does not exist` or similar
- Queries fail when trying to select location through foreign key relationships

**Root Cause:**
PostGIS POINT type columns cannot be directly selected in Supabase relationship queries. When using foreign key relationships (e.g., `member1:profiles!duos_member1_id_fkey(...)`), Supabase's PostgREST cannot handle PostGIS spatial types like POINT.

**Solution:**
Remove `location` from relationship queries. Location can be fetched separately if needed.

**Example Fix:**

```typescript
// ❌ BAD - This will fail with PostGIS POINT type
const { data } = await supabase
  .from('duos')
  .select(`
    *,
    member1:profiles!duos_member1_id_fkey(id, name, age, photo_url, gender, preference, location),
    member2:profiles!duos_member2_id_fkey(id, name, age, photo_url, gender, preference, location)
  `);

// ✅ GOOD - Remove location from relationship query
const { data } = await supabase
  .from('duos')
  .select(`
    *,
    member1:profiles!duos_member1_id_fkey(id, name, age, photo_url, gender, preference),
    member2:profiles!duos_member2_id_fkey(id, name, age, photo_url, gender, preference)
  `);
```

**Alternative Solutions:**
1. **Fetch location separately** if needed:
   ```typescript
   // First get duos without location
   const duos = await getUserDuos(userId);
   
   // Then fetch locations separately if needed
   const profileIds = [...new Set(duos.flatMap(d => [d.member1_id, d.member2_id]))];
   const { data: profiles } = await supabase
     .from('profiles')
     .select('id, location')
     .in('id', profileIds);
   ```

2. **Use RPC functions** for location-based queries:
   ```typescript
   // Use the get_nearby_profiles RPC function instead
   const { data } = await supabase.rpc('get_nearby_profiles', {
     user_id: userId,
     lat: latitude,
     lng: longitude,
     radius_meters: 50000
   });
   ```

**Files Affected:**
- `src/services/duo.service.ts` - All queries that select member profiles
- `src/services/matching.service.ts` - Match queries with duo relationships

**Related Error Codes:**
- `42703` - Column does not exist (when PostGIS type is involved)
- `PGRST202` - Foreign key relationship error

---

### Error: "RLS policy violation" (Code: 42501)

**Symptoms:**
- Queries fail with permission denied errors
- Error code: `42501`
- Error message mentions "row-level security" or "permission denied"

**Root Cause:**
Row Level Security (RLS) policies are blocking the query. This can happen if:
- RLS policies are not properly configured
- User is not authenticated
- Policy conditions don't match the query

**Solution:**
1. Verify RLS policies are created in migrations
2. Check that user is authenticated (`auth.uid()` is not null)
3. Review policy conditions to ensure they allow the query

**Example Fix:**
```sql
-- Ensure RLS is enabled
ALTER TABLE public.duos ENABLE ROW LEVEL SECURITY;

-- Create policy that allows reading active duos
CREATE POLICY "Active duos are viewable by everyone" ON public.duos
  FOR SELECT USING (is_active = true);
```

**Files to Check:**
- `supabase/migrations/001_initial_schema.sql` - RLS policies
- `supabase/migrations/002_chat_enhancements.sql` - Additional RLS policies

---

### Error: "no rows returned" (Code: PGRST116)

**Symptoms:**
- Query returns error instead of empty array
- Error code: `PGRST116`
- Happens when querying for data that doesn't exist

**Solution:**
Handle `PGRST116` as a valid empty result, not an error:

```typescript
if (error) {
  // PGRST116 is "no rows returned" - this is fine, return empty array
  if (error.code === 'PGRST116') {
    return [];
  }
  throw error;
}
```

**When to Use:**
- When querying for user's duos (user might have none)
- When querying for matches (user might have none)
- Any query where empty results are valid, not an error

---

## React Hooks Errors

### Error: "Rendered more hooks than during the previous render"

**Symptoms:**
- React error: "Rendered more hooks than during the previous render"
- Component crashes when navigating between pages
- Error occurs in component stack trace

**Root Cause:**
Hooks are being called conditionally or after early returns, violating React's Rules of Hooks. All hooks must be called in the same order on every render.

**Solution:**
Move all hooks before any conditional returns:

```typescript
// ❌ BAD - Hook called after conditional return
const MyComponent = () => {
  if (loading) return <Loader />;
  
  useEffect(() => { // ERROR: Hook after return!
    // ...
  }, []);
  
  return <div>Content</div>;
};

// ✅ GOOD - All hooks before returns
const MyComponent = () => {
  useEffect(() => { // Hook before any returns
    // ...
  }, []);
  
  if (loading) return <Loader />;
  
  return <div>Content</div>;
};
```

**Files Fixed:**
- `src/pages/Messages.tsx` - Moved debug useEffect before conditional returns
- Always ensure hooks are called in consistent order

**Best Practice:**
1. Call all hooks at the top of component
2. Use conditional returns after all hooks
3. Use `enabled` option in React Query instead of conditional hook calls

---

### Error: "Failed to load duos" / "Failed to load messages"

**Symptoms:**
- Error message shows "Failed to load duos" or "Failed to load messages"
- Error details show "Unknown error"
- Happens when user has no duos

**Root Cause:**
Empty results are being treated as errors instead of valid empty states.

**Solution:**
1. **Service Layer:** Handle empty results gracefully:
   ```typescript
   if (error) {
     // PGRST116 is "no rows returned" - this is fine
     if (error.code === 'PGRST116') {
       return [];
     }
     throw error;
   }
   return (data || []);
   ```

2. **Hook Layer:** Use `placeholderData` and proper retry logic:
   ```typescript
   return useQuery({
     queryKey: ['duos', userId],
     queryFn: () => getUserDuos(userId),
     placeholderData: [], // Return empty array instead of undefined
     retry: (failureCount, error) => {
       // Don't retry on "no rows" errors
       if (error?.code === 'PGRST116') return false;
       return failureCount < 2;
     },
   });
   ```

3. **Component Layer:** Distinguish between errors and empty data:
   ```typescript
   // Show error only if data is undefined (actual error)
   if (error && data === undefined) {
     return <ErrorState />;
   }
   
   // Show empty state if data is empty array (valid state)
   if (data && data.length === 0) {
     return <EmptyState />;
   }
   ```

**Files Fixed:**
- `src/services/duo.service.ts` - Handle PGRST116 as empty array
- `src/hooks/useDuos.ts` - Added placeholderData and retry logic
- `src/pages/Messages.tsx` - Check for `data === undefined` vs empty array
- `src/pages/Matchmaking.tsx` - Check for `data === undefined` vs empty array

---

## Query & Data Fetching Issues

### Error: Query returns stale or incorrect data

**Symptoms:**
- Data doesn't update after mutations
- Shows old data after creating/updating records
- Cache seems out of sync

**Solution:**
Invalidate React Query cache after mutations:

```typescript
const mutation = useMutation({
  mutationFn: updateData,
  onSuccess: () => {
    // Invalidate related queries
    queryClient.invalidateQueries({ queryKey: ['data'] });
  },
});
```

**Best Practices:**
- Always invalidate queries after mutations
- Use optimistic updates for better UX
- Use `queryClient.setQueryData` for immediate updates

---

## Authentication Issues

### Error: "Not authenticated" when user is logged in

**Symptoms:**
- User appears logged in but gets "Not authenticated" errors
- Session seems to expire immediately

**Solution:**
1. Check session is properly stored:
   ```typescript
   const { data: { session } } = await supabase.auth.getSession();
   ```

2. Verify auth state listener is set up:
   ```typescript
   supabase.auth.onAuthStateChange((event, session) => {
     // Handle auth state changes
   });
   ```

3. Check RLS policies allow authenticated users:
   ```sql
   CREATE POLICY "policy_name" ON table_name
     FOR SELECT USING (auth.uid() IS NOT NULL);
   ```

---

## Performance Issues

### Slow queries or timeouts

**Symptoms:**
- Queries take too long
- Timeout errors
- App feels sluggish

**Solutions:**

1. **Add indexes:**
   ```sql
   CREATE INDEX idx_table_column ON table_name(column_name);
   ```

2. **Use pagination:**
   ```typescript
   const { data } = await supabase
     .from('table')
     .select('*')
     .range(0, 49); // Limit results
   ```

3. **Optimize queries:**
   - Use `.select()` to only fetch needed columns
   - Avoid N+1 queries
   - Use server-side filtering instead of client-side

4. **Use RPC functions for complex queries:**
   ```typescript
   // Instead of complex client-side filtering
   const { data } = await supabase.rpc('optimized_function', params);
   ```

---

## Common Error Codes Reference

| Code | Meaning | Solution |
|------|---------|----------|
| `PGRST116` | No rows returned | Return empty array, not error |
| `42501` | RLS policy violation | Check/update RLS policies |
| `42703` | Column does not exist | Check column name, may be PostGIS type issue |
| `PGRST202` | Foreign key relationship error | Check relationship query syntax |
| `42P01` | Table does not exist | Run migrations to create table |

---

## Debugging Tips

### 1. Check Browser Console
Always check the browser console (F12) for detailed error messages and stack traces.

### 2. Check Network Tab
Inspect network requests to see:
- Request/response payloads
- HTTP status codes
- Error responses from Supabase

### 3. Check Supabase Logs
- Go to Supabase Dashboard → Logs
- Check API logs for errors
- Check database logs for query issues

### 4. Enable Debug Logging
Add console.log statements in service functions:
```typescript
console.error('Error details:', {
  code: error.code,
  message: error.message,
  details: error.details,
});
```

### 5. Test Queries Directly
Test queries in Supabase SQL Editor to isolate issues:
```sql
-- Test the exact query that's failing
SELECT * FROM duos
WHERE member1_id = 'user-id' OR member2_id = 'user-id';
```

---

## Getting Help

If you encounter an issue not covered here:

1. Check the browser console for detailed error messages
2. Check Supabase dashboard logs
3. Review the error code in this guide
4. Check related service/hook files for similar patterns
5. Search the codebase for similar error handling

---

**Last Updated:** 2024-12-19
