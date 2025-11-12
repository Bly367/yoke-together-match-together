# Preferences & Matching System Review

**Review Date:** 2024-12-19  
**Status:** ✅ Review Complete - Issues Found & Recommendations Provided

---

## Executive Summary

The preferences and matching system is **mostly functional** with some improvements made:

1. ✅ **Working Well:** Preference matching logic is implemented and used correctly in discover flow
2. ✅ **Fixed:** "prefer-not-to-say" gender now explicitly handled (matches with "both" preference)
3. ✅ **Fixed:** React hook dependency array issue resolved
4. ⚠️ **Performance Issue:** Client-side filtering instead of database-level filtering (optimization opportunity)
5. ⚠️ **Design Decision:** Undefined preferences default to allowing matches (backward compatibility)

---

## 1. Preferences Storage & Schema

### Database Schema ✅
- **Location:** `supabase/migrations/005_user_preferences.sql`
- **Fields:**
  - `gender`: `'man' | 'woman' | 'non-binary' | 'prefer-not-to-say'`
  - `preference`: `'men' | 'women' | 'both'` (defaults to `'both'`)
- **Indexes:** Properly indexed for filtering performance

### Profile Setup ✅
- **Location:** `src/pages/ProfileSetup.tsx`
- Users can set gender and preference during profile setup
- Validation ensures gender is set if preference is not "both"
- Default preference is "both" (inclusive)

**Status:** ✅ **Good** - Schema and UI are properly set up

---

## 2. Preference Matching Logic

### Core Functions

#### `preferenceMatchesGender()` - ⚠️ **Has Edge Case Issues**

**Location:** `src/lib/preferences.ts:9-17`

```typescript
export function preferenceMatchesGender(preference: Preference | undefined, gender: Gender | undefined): boolean {
  if (!preference || !gender) return true; // ⚠️ ISSUE: Too permissive
  if (preference === 'both') return true;
  if (preference === 'men' && gender === 'man') return true;
  if (preference === 'women' && gender === 'woman') return true;
  // Non-binary matches 'both' preference
  if (gender === 'non-binary' && preference === 'both') return true;
  return false;
}
```

**Issues Found:**

1. **"prefer-not-to-say" Gender Not Handled**
   - When gender is `'prefer-not-to-say'`, the function doesn't explicitly handle it
   - Currently falls through to `return false`, which might be too restrictive
   - **Recommendation:** Decide on behavior:
     - Option A: Treat as "both" (most inclusive)
     - Option B: Only match with "both" preference (current behavior, but should be explicit)
     - Option C: Don't match unless preference is "both"

2. **Undefined Values Return True**
   - Line 10: `if (!preference || !gender) return true;`
   - This means users without preferences/gender match with everyone
   - **Issue:** This is too permissive - should probably require explicit preferences for matching
   - **Recommendation:** Consider requiring preferences to be set, or at least log a warning

#### `canDuosMatch()` - ✅ **Logic is Sound**

**Location:** `src/lib/preferences.ts:30-62`

**Logic:**
- At least one person in duo A must be interested in at least one person in duo B
- At least one person in duo B must be interested in at least one person in duo A
- Both conditions must be true

**Status:** ✅ **Correct** - The bidirectional matching logic is sound

**Edge Cases:**
- Handles missing preferences (allows match for backward compatibility)
- Handles missing genders (allows match)
- Non-binary people can match with "both" preference

---

## 3. Matching Flow Integration

### Discover/Matchmaking Flow ✅ **Correctly Integrated**

**Location:** `src/pages/Matchmaking.tsx:81-156`

**Flow:**
1. Fetches active duos via `useActiveDuosForMatching()`
2. Filters client-side using `canDuosMatch(userDuo, duo)`
3. Applies additional filters (age, interests, location)

**Status:** ✅ **Correct** - Preferences are properly checked before showing duos

### Database Query - ⚠️ **Performance Issue**

**Location:** `src/services/duo.service.ts:439-484`

**Current Implementation:**
```typescript
export async function getActiveDuosForMatching(userId: string, excludeDuoIds: string[] = []): Promise<DuoWithMembers[]> {
  // Fetches ALL active duos (excluding user's duos and swiped duos)
  // Does NOT filter by preferences at database level
  // Preferences filtering happens client-side in Matchmaking.tsx
}
```

**Issue:**
- Fetches potentially incompatible duos from database
- Client-side filtering means unnecessary data transfer
- Could be optimized with database-level filtering or RPC function

**Recommendation:**
- Consider creating a database RPC function that filters by preferences
- Or at least add a WHERE clause to exclude duos with incompatible preferences
- This would reduce data transfer and improve performance

---

## 4. Issues Found

### Issue 1: Missing React Hook Dependency ✅ **FIXED**

**Location:** `src/pages/Matchmaking.tsx:156`

**Problem:**
```typescript
const availableDuos = useMemo(() => {
  // Uses userLocation and user inside the function
  // ...
}, [activeDuos, filters, userDuo]); // ⚠️ Missing: userLocation, user
```

**Impact:** Stale closures - if `userLocation` or `user` changes, the memoized value won't update

**Fix Applied:**
```typescript
}, [activeDuos, filters, userDuo, userLocation, user]);
```

**Status:** ✅ **Fixed** - Dependencies now correctly included

### Issue 2: "prefer-not-to-say" Gender Handling ✅ **FIXED**

**Location:** `src/lib/preferences.ts:9-19`

**Problem:** Not explicitly handled - falls through to `return false`

**Fix Applied:** Added explicit handling - "prefer-not-to-say" matches with "both" preference (most inclusive approach):
```typescript
// "prefer-not-to-say" matches with "both" preference (most inclusive approach)
if (gender === 'prefer-not-to-say' && preference === 'both') return true;
```

**Status:** ✅ **Fixed** - "prefer-not-to-say" now explicitly handled

### Issue 3: Undefined Preferences Too Permissive ⚠️

**Location:** `src/lib/preferences.ts:10`

**Problem:** Returns `true` if preference or gender is undefined

**Recommendation:** Consider requiring explicit preferences:
```typescript
// Option 1: Require preferences (strict)
if (!preference || !gender) return false;

// Option 2: Log warning but allow (current behavior)
if (!preference || !gender) {
  console.warn('Matching without explicit preferences/gender');
  return true;
}
```

### Issue 4: No Database-Level Preference Filtering ⚠️

**Location:** `src/services/duo.service.ts:439-484`

**Problem:** Fetches all duos, filters client-side

**Recommendation:** Add database-level filtering or RPC function

---

## 5. Recommendations

### High Priority ✅ **COMPLETED**

1. ✅ **Fix React Hook Dependency** - **DONE**
   - Added `userLocation` and `user` to `useMemo` dependency array in `Matchmaking.tsx`

2. ✅ **Clarify "prefer-not-to-say" Behavior** - **DONE**
   - Decided on matching behavior: matches with "both" preference (most inclusive)
   - Updated `preferenceMatchesGender()` to handle explicitly

### Medium Priority

3. **Optimize Database Queries**
   - Consider adding preference filtering at database level
   - Create RPC function for efficient preference-based matching

4. **Require Explicit Preferences**
   - Consider requiring users to set preferences before matching
   - Or at least log warnings when matching without preferences

### Low Priority

5. **Add Preference Validation**
   - Validate that duo members have compatible preferences when creating a duo
   - Warn users if their duo partner has incompatible preferences

6. **Add Preference Tests**
   - Write unit tests for `preferenceMatchesGender()` and `canDuosMatch()`
   - Test edge cases: undefined values, "prefer-not-to-say", non-binary, etc.

---

## 6. Test Cases to Verify

### Test Case 1: Basic Matching
- **Setup:** User A (man, preference: women) + User B (woman, preference: men)
- **Expected:** ✅ Should match

### Test Case 2: Non-Binary Matching
- **Setup:** User A (non-binary, preference: both) + User B (man, preference: both)
- **Expected:** ✅ Should match

### Test Case 3: "prefer-not-to-say" Matching ✅ **FIXED**
- **Setup:** User A (prefer-not-to-say, preference: both) + User B (man, preference: both)
- **Expected:** ✅ **Should match** - Now explicitly handled to match with "both" preference

### Test Case 4: Undefined Preferences
- **Setup:** User A (no gender/preference) + User B (man, preference: women)
- **Expected:** ⚠️ **Currently matches** - Should it?

### Test Case 5: Bidirectional Matching
- **Setup:** 
  - Duo A: Member1 (man, preference: women), Member2 (woman, preference: men)
  - Duo B: Member1 (man, preference: women), Member2 (woman, preference: men)
- **Expected:** ✅ Should match (both duos interested in each other)

### Test Case 6: One-Way Interest
- **Setup:**
  - Duo A: Member1 (man, preference: women), Member2 (woman, preference: men)
  - Duo B: Member1 (man, preference: men), Member2 (man, preference: men)
- **Expected:** ❌ Should NOT match (Duo B not interested in Duo A)

---

## 7. Summary

### ✅ What's Working Well

1. **Schema & Storage:** Preferences are properly stored and indexed
2. **UI Integration:** Profile setup allows users to set preferences
3. **Matching Logic:** Core bidirectional matching logic is sound
4. **Discover Flow:** Preferences are checked before showing duos

### ⚠️ What Needs Improvement

1. ✅ **Edge Cases:** "prefer-not-to-say" gender - **FIXED** (now explicitly handled)
2. ✅ **React Hooks:** Missing dependencies in `useMemo` - **FIXED**
3. **Performance:** Client-side filtering instead of database-level (optimization opportunity)
4. **Undefined Values:** Too permissive when preferences/gender are undefined (design decision for backward compatibility)

### 🎯 Recommended Actions

1. ✅ **Immediate:** Fix React hook dependency issue - **COMPLETED**
2. ✅ **Short-term:** Clarify and fix "prefer-not-to-say" handling - **COMPLETED**
3. **Medium-term:** Optimize database queries for preference filtering (optional performance improvement)
4. **Long-term:** Add comprehensive test coverage for preference matching logic

---

## 8. Code Quality Assessment

**Overall:** ✅ **Good** - The system works correctly for the common cases, but edge cases need attention.

**Architecture Compliance:** ✅ **Compliant** - Follows Service → Hook → Component pattern

**DRY Principle:** ✅ **Compliant** - Preference logic is centralized in `lib/preferences.ts`

**Type Safety:** ✅ **Good** - Proper TypeScript types throughout

---

**Review Completed:** 2024-12-19

