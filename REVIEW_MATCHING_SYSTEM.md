# Matching System Review

## Overview
This document reviews the matching/swiping system, including swipe operations, match detection, and match retrieval.

## Files Reviewed
- `src/services/matching.service.ts` - Core matching service functions
- `src/hooks/useMatching.ts` - React hooks for matching operations
- `src/pages/Matchmaking.tsx` - Swiping UI page
- `src/pages/Matches.tsx` - Matches list page

---

## 1. Service Layer (`matching.service.ts`)

### Strengths
✅ **Comprehensive match queries** - Includes full duo and member data
✅ **Duplicate swipe handling** - Updates existing swipe if duplicate
✅ **Bidirectional match checking** - Checks both duo1/duo2 combinations
✅ **Deduplication logic** - Properly deduplicates matches from both queries

### Issues & Recommendations

#### 1.1 Duplicate Query Logic
**Location:** `getUserMatches`, lines 83-133
**Issue:** Two separate queries for duo1_id and duo2_id, then manual deduplication
**Recommendation:** Use single query with OR condition or RPC function:
```typescript
// Option 1: Single query (if Supabase supports complex OR)
const { data: matches, error } = await supabase
  .from('matches')
  .select(`
    *,
    duo1:duos!matches_duo1_id_fkey(...),
    duo2:duos!matches_duo2_id_fkey(...)
  `)
  .or(`duo1_id.in.(${duoIds.join(',')}),duo2_id.in.(${duoIds.join(',')})`)
  .eq('is_active', true);

// Option 2: Create RPC function for better performance
// CREATE FUNCTION get_user_matches(user_id UUID) RETURNS TABLE(...)
```

#### 1.2 Race Condition in Match Check
**Location:** `checkMatch`, lines 152-200
**Issue:** Checks both combinations sequentially, could have race condition
**Recommendation:** Use single query with OR:
```typescript
export async function checkMatch(duo1Id: string, duo2Id: string): Promise<Match | null> {
  const { data, error } = await supabase
    .from('matches')
    .select(`
      *,
      duo1:duos!matches_duo1_id_fkey(...),
      duo2:duos!matches_duo2_id_fkey(...)
    `)
    .or(`and(duo1_id.eq.${duo1Id},duo2_id.eq.${duo2Id}),and(duo1_id.eq.${duo2Id},duo2_id.eq.${duo1Id})`)
    .eq('is_active', true)
    .maybeSingle();
  
  if (error && error.code !== 'PGRST116') throw error;
  return data as Match | null;
}
```

#### 1.3 No Match Deactivation
**Location:** Service functions
**Issue:** No function to unmatch/deactivate a match
**Recommendation:** Add unmatch function:
```typescript
export async function unmatch(matchId: string): Promise<void> {
  const { error } = await supabase
    .from('matches')
    .update({ is_active: false })
    .eq('id', matchId);
  
  if (error) throw error;
}
```

#### 1.4 Swipe Update Logic
**Location:** `swipeOnDuo`, lines 36-64
**Issue:** Updates existing swipe on duplicate, but doesn't check if match should be created/removed
**Recommendation:** Handle match creation/removal on swipe update:
```typescript
export async function swipeOnDuo(swiperDuoId: string, swipedDuoId: string, action: SwipeAction): Promise<Swipe> {
  // ... existing insert/update logic ...
  
  // After update, check if match should be created/removed
  if (action === 'like') {
    // Check if mutual like exists
    const mutualSwipe = await checkMutualLike(swiperDuoId, swipedDuoId);
    if (mutualSwipe && !existingMatch) {
      // Create match (or let trigger handle it)
    }
  } else if (action === 'pass') {
    // Remove match if exists
    const existingMatch = await checkMatch(swiperDuoId, swipedDuoId);
    if (existingMatch) {
      await unmatch(existingMatch.id);
    }
  }
  
  return swipe;
}
```

#### 1.5 Missing Match Metadata
**Location:** Match interface, lines 23-31
**Issue:** No metadata like last_message_at, unread_count
**Recommendation:** Add useful metadata:
```typescript
export interface Match {
  id: string;
  duo1_id: string;
  duo2_id: string;
  matched_at: string;
  is_active: boolean;
  last_message_at?: string; // For sorting matches
  unread_count?: number; // For badge display
  duo1?: DuoWithMembers;
  duo2?: DuoWithMembers;
}
```

---

## 2. Hooks Layer (`useMatching.ts`)

### Strengths
✅ **React Query integration** - Proper caching and invalidation
✅ **Match check hook** - Useful for checking matches after swipe
✅ **Query invalidation** - Properly invalidates related queries

### Issues & Recommendations

#### 2.1 Match Check After Swipe
**Location:** `useSwipe`, lines 51-62
**Issue:** Checks match after swipe, but uses setTimeout which is unreliable
**Recommendation:** Use retry logic or better approach:
```typescript
onSuccess: async (swipe, variables) => {
  queryClient.invalidateQueries({ queryKey: ['swiped'] });
  queryClient.invalidateQueries({ queryKey: ['duos', 'active'] });
  
  if (variables.action === 'like') {
    // Retry match check with exponential backoff
    let match = null;
    for (let i = 0; i < 5; i++) {
      await new Promise(resolve => setTimeout(resolve, 100 * Math.pow(2, i)));
      match = await checkMatch(variables.swiperDuoId, variables.swipedDuoId);
      if (match) break;
    }
    
    if (match) {
      queryClient.invalidateQueries({ queryKey: ['matches'] });
    }
  }
},
```

#### 2.2 Missing Match Subscription
**Location:** Hooks
**Issue:** No real-time subscription for new matches
**Recommendation:** Add match subscription hook:
```typescript
export function useMatchSubscription(userId: string | null, enabled: boolean = true) {
  const queryClient = useQueryClient();
  
  useEffect(() => {
    if (!userId || !enabled) return;
    
    const channel = supabase
      .channel(`user-matches:${userId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'matches',
        filter: `or(duo1_id.in.(${userDuoIds.join(',')}),duo2_id.in.(${userDuoIds.join(',')}))`,
      }, (payload) => {
        queryClient.invalidateQueries({ queryKey: ['matches'] });
      })
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, enabled, queryClient]);
}
```

---

## 3. UI Layer (`Matchmaking.tsx`)

### Strengths
✅ **Clean swipe UI** - Intuitive card-based interface
✅ **Match overlay** - Nice visual feedback on match
✅ **Loading states** - Proper loading indicators
✅ **Empty states** - Good handling of no duos/matches
✅ **Progress indicator** - Shows current position in stack

### Issues & Recommendations

#### 3.1 Race Condition in Match Check
**Location:** `handleSwipe`, lines 66-82
**Issue:** Uses setTimeout(500) to wait for trigger, unreliable
**Recommendation:** Use retry logic (see hook recommendation above)

#### 3.2 Missing Import
**Location:** Line 163
**Issue:** `MessageCircle` and `User` icons imported but not shown in imports
**Recommendation:** Add missing imports:
```typescript
import { Heart, X, Loader2, MessageCircle, User } from "lucide-react";
```

#### 3.3 No Swipe Animation
**Location:** Swipe buttons
**Issue:** No visual feedback when swiping (card animation)
**Recommendation:** Add swipe gesture support or card animation:
```typescript
// Consider using react-swipeable or similar library
import { useSwipeable } from 'react-swipeable';

const handlers = useSwipeable({
  onSwipedLeft: () => handleSwipe(false),
  onSwipedRight: () => handleSwipe(true),
});
```

#### 3.4 No Undo Swipe
**Location:** Swipe functionality
**Issue:** Can't undo accidental swipe
**Recommendation:** Add undo button or gesture:
```typescript
const [lastSwipe, setLastSwipe] = useState<{ duoId: string; action: SwipeAction } | null>(null);

// After swipe:
setLastSwipe({ duoId: currentDuo.id, action: liked ? 'like' : 'pass' });

// Add undo button that appears briefly
```

#### 3.5 No Filtering Options
**Location:** Matchmaking page
**Issue:** No way to filter duos by interests, age, location
**Recommendation:** Add filter UI:
```typescript
const [filters, setFilters] = useState({
  minAge: 18,
  maxAge: 100,
  interests: [] as string[],
  maxDistance: 50,
});
```

---

## 4. Data Flow

### Current Flow
1. User swipes on duo → Swipe recorded in database
2. If like, check for mutual like → Match created (via trigger or manual check)
3. Match appears in matches list → User can start chatting

### Issues
- ⚠️ Race condition between swipe and match creation
- ⚠️ No real-time match notifications
- ⚠️ Match check uses unreliable setTimeout

---

## 5. Security Considerations

### ✅ Good Practices
- Validates user owns duo before swiping
- Uses RLS policies (should verify in database review)

### ⚠️ Recommendations
1. **Rate Limiting**: Limit swipes per day/hour
2. **Swipe Validation**: Ensure user can't swipe on own duo
3. **Match Access**: Ensure RLS policies prevent unauthorized match access

---

## 6. Performance Considerations

### Current State
- ✅ React Query caching for matches
- ✅ Efficient match queries with joins
- ⚠️ Duplicate queries could be optimized

### Recommendations
1. **Single Query**: Combine duo1/duo2 queries into one
2. **Pagination**: Add pagination for large match lists
3. **Optimistic Updates**: Consider optimistic updates for swipes
4. **Prefetching**: Prefetch matches on app load

---

## 7. Testing Recommendations

### Unit Tests Needed
- [ ] `matching.service.ts` - Test all functions with mocked Supabase
- [ ] `useMatching.ts` - Test hooks with React Query test utilities
- [ ] `Matchmaking.tsx` - Test swipe logic and match detection

### Integration Tests Needed
- [ ] Full swipe flow
- [ ] Match creation flow
- [ ] Match retrieval flow
- [ ] Unmatch flow

---

## Summary

### Critical Issues
1. ⚠️ Race condition in match check (uses setTimeout)
2. ⚠️ Duplicate queries for matches (could be optimized)
3. ⚠️ Missing real-time match subscription

### High Priority Improvements
1. Fix match check race condition (use retry logic)
2. Combine duplicate match queries
3. Add real-time match subscription
4. Add missing icon imports

### Low Priority Enhancements
1. Add swipe animations
2. Add undo swipe functionality
3. Add filtering options
4. Add match metadata (last_message_at, unread_count)

---

## Review Checklist

- [x] Service layer follows DRY principles
- [x] Hooks properly use React Query
- [x] Components are stateless where possible
- [ ] Race conditions are handled properly
- [x] TypeScript types are properly defined
- [x] Error handling is present
- [x] JSDoc comments are present

