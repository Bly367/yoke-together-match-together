# Duo Management Review

## Overview
This document reviews the duo management system, including duo creation, updates, and duo-related operations.

## Files Reviewed
- `src/services/duo.service.ts` - Core duo service functions
- `src/hooks/useDuos.ts` - React hooks for duo operations
- `src/pages/DuoSetup.tsx` - Duo creation UI

---

## 1. Service Layer (`duo.service.ts`)

### Strengths
✅ **Well-structured types** - Clear `Duo` and `DuoWithMembers` interfaces
✅ **Comprehensive queries** - Includes member profiles in queries
✅ **Efficient filtering** - Uses Set for O(1) lookup when filtering swiped duos
✅ **JSDoc comments** - All functions documented

### Issues & Recommendations

#### 1.1 Client-Side Filtering Performance
**Location:** `getActiveDuosForMatching`, lines 136-150
**Issue:** Fetches 100 duos then filters client-side, which could be inefficient at scale
**Recommendation:** Use Supabase query filters or RPC function:
```typescript
// Option 1: Use Supabase .not() with array (if supported)
if (excludeDuoIds.length > 0) {
  query = query.not('id', 'in', `(${excludeDuoIds.join(',')})`);
}

// Option 2: Create RPC function for better performance
// CREATE FUNCTION get_active_duos_for_matching(user_id UUID, exclude_ids UUID[])
```

#### 1.2 Missing Validation
**Location:** `createDuo`, `updateDuo`
**Issue:** No validation for member IDs (e.g., can't create duo with self)
**Recommendation:** Add validation:
```typescript
export async function createDuo(member1Id: string, member2Id: string, data?: {...}): Promise<Duo> {
  if (member1Id === member2Id) {
    throw new Error('Cannot create duo with yourself');
  }
  // ... rest of code
}
```

#### 1.3 No Duo Deactivation
**Location:** Service functions
**Issue:** No function to deactivate/delete a duo
**Recommendation:** Add deactivation function:
```typescript
export async function deactivateDuo(duoId: string): Promise<Duo> {
  return updateDuo(duoId, { is_active: false });
}
```

#### 1.4 Interests Array Handling
**Location:** `createDuo`, `updateDuo`
**Issue:** No validation or normalization of interests array
**Recommendation:** Normalize interests:
```typescript
function normalizeInterests(interests?: string[]): string[] | undefined {
  if (!interests || interests.length === 0) return undefined;
  return interests
    .map(i => i.trim().toLowerCase())
    .filter(i => i.length > 0)
    .slice(0, 10); // Limit to 10 interests
}
```

---

## 2. Hooks Layer (`useDuos.ts`)

### Strengths
✅ **React Query integration** - Proper caching and invalidation
✅ **Memoized query keys** - Consistent caching with sorted excludeIds
✅ **Clear separation** - Separate hooks for different operations

### Issues & Recommendations

#### 2.1 Query Key Consistency
**Location:** `ACTIVE_DUOS_QUERY_KEY`, line 20-21
**Issue:** Sorts excludeIds for consistent caching, but this could mask bugs
**Recommendation:** Document why sorting is needed and consider if it's the right approach:
```typescript
// Sort excludeIds to ensure consistent query key caching
// Note: This means [1,2] and [2,1] will use the same cache
// This is intentional for performance, but ensure excludeIds are set correctly
const ACTIVE_DUOS_QUERY_KEY = (userId: string, excludeIds: string[]) =>
  ['duos', 'active', userId, [...excludeIds].sort().join(',')] as const;
```

#### 2.2 Missing Error Handling
**Location:** All hooks
**Issue:** Errors not easily accessible to components
**Recommendation:** Document error access pattern or expose errors:
```typescript
export function useUserDuos() {
  const { user } = useAuth();
  const query = useQuery({
    queryKey: USER_DUOS_QUERY_KEY(user?.id || ''),
    queryFn: () => getUserDuos(user!.id),
    enabled: !!user,
  });
  
  // Errors available via query.error, but could expose explicitly
  return {
    ...query,
    error: query.error,
  };
}
```

---

## 3. UI Layer (`DuoSetup.tsx`)

### Strengths
✅ **Clean UI** - Well-structured form with good UX
✅ **Two invite methods** - Email and link sharing
✅ **Friend lookup** - Validates friend exists before creating duo
✅ **Loading states** - Proper loading indicators
✅ **Skip option** - Allows users to skip duo creation

### Issues & Recommendations

#### 3.1 Direct Supabase Call
**Location:** `findFriend` function, lines 29-57
**Issue:** Direct Supabase call in component violates architecture (should use service)
**Recommendation:** Extract to service:
```typescript
// In duo.service.ts
export async function findProfileByEmail(email: string): Promise<{ id: string; name: string; email: string } | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, email')
    .eq('email', email)
    .single();
  
  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data;
}

// In component, use hook:
const findFriendMutation = useMutation({
  mutationFn: findProfileByEmail,
});
```

#### 3.2 Email Validation
**Location:** Email input, line 172
**Issue:** Only HTML5 validation, no custom validation
**Recommendation:** Add real-time email validation:
```typescript
const [emailError, setEmailError] = useState('');

const validateEmail = (email: string) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    setEmailError('Please enter a valid email address');
    return false;
  }
  setEmailError('');
  return true;
};
```

#### 3.3 Interests Parsing
**Location:** `handleCreateDuo`, lines 87-90
**Issue:** Simple comma splitting, no deduplication or normalization
**Recommendation:** Improve parsing:
```typescript
const interestsArray = interests
  .split(',')
  .map(i => i.trim().toLowerCase())
  .filter(i => i.length > 0)
  .filter((value, index, self) => self.indexOf(value) === index) // Deduplicate
  .slice(0, 10); // Limit to 10 interests
```

#### 3.4 No Duo Photo Upload
**Location:** Duo setup form
**Issue:** No option to upload duo photo
**Recommendation:** Add photo upload field:
```typescript
const [duoPhotoUrl, setDuoPhotoUrl] = useState("");

// In form:
<PhotoUpload
  currentPhotoUrl={duoPhotoUrl}
  onPhotoUploaded={setDuoPhotoUrl}
  userId={user?.id || ''}
/>
```

#### 3.5 Link Invite Flow
**Location:** Link invite method, lines 71-77
**Issue:** Just copies link, doesn't handle the join flow
**Recommendation:** Create join duo page/route handler:
```typescript
// Need to create /join-duo/:userId route and page
// That page should allow friend to accept invite and create duo
```

#### 3.6 No Duo Editing
**Location:** Component
**Issue:** No way to edit existing duo
**Recommendation:** Add edit functionality or separate edit page

---

## 4. Data Flow

### Current Flow
1. User finds friend by email → Validates friend exists
2. User fills duo details → Creates duo via service
3. Duo created → User redirected to matchmaking

### Issues
- ⚠️ No validation that user doesn't already have an active duo
- ⚠️ No handling for friend already being in a duo
- ⚠️ Link invite doesn't have a proper join flow

---

## 5. Security Considerations

### ✅ Good Practices
- Validates friend exists before creating duo
- Prevents self-duo creation
- Uses RLS policies (should verify in database review)

### ⚠️ Recommendations
1. **Rate Limiting**: Limit how many duos a user can create
2. **Friend Verification**: Consider email verification for friend invites
3. **Duo Limits**: Enforce maximum number of active duos per user
4. **Access Control**: Ensure RLS policies prevent unauthorized duo access

---

## 6. Performance Considerations

### Current State
- ✅ React Query caching for duos
- ✅ Efficient filtering using Set for O(1) lookup
- ⚠️ Client-side filtering could be optimized

### Recommendations
1. **Server-Side Filtering**: Move filtering to database/RPC function
2. **Pagination**: Add pagination for large duo lists
3. **Optimistic Updates**: Consider optimistic updates for duo creation
4. **Prefetching**: Prefetch user duos on app load

---

## 7. Testing Recommendations

### Unit Tests Needed
- [ ] `duo.service.ts` - Test all functions with mocked Supabase
- [ ] `useDuos.ts` - Test hooks with React Query test utilities
- [ ] `DuoSetup.tsx` - Test form validation and submission

### Integration Tests Needed
- [ ] Full duo creation flow
- [ ] Friend lookup flow
- [ ] Duo update flow
- [ ] Duo deactivation flow

---

## Summary

### Critical Issues
1. ⚠️ Direct Supabase call in component (violates architecture)
2. ⚠️ Client-side filtering could be optimized
3. ⚠️ Missing join duo flow for link invites

### High Priority Improvements
1. Extract findFriend to service layer
2. Add email validation
3. Improve interests parsing (deduplication, normalization)
4. Add duo photo upload

### Low Priority Enhancements
1. Add duo editing functionality
2. Add server-side filtering via RPC
3. Add pagination for duo lists
4. Add duo deactivation function

---

## Review Checklist

- [ ] Service layer follows DRY principles
- [x] Hooks properly use React Query
- [ ] Components don't call Supabase directly
- [ ] Input validation is comprehensive
- [x] TypeScript types are properly defined
- [x] Error handling is present
- [x] JSDoc comments are present

