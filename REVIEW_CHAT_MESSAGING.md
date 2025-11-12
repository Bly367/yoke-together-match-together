# Chat & Messaging Review

## Overview
This document reviews the chat and messaging system, including message sending, real-time subscriptions, and chat UI.

## Files Reviewed
- `src/services/chat.service.ts` - Core chat service functions
- `src/hooks/useChat.ts` - React hooks for chat operations
- `src/pages/Chat.tsx` - Individual chat UI
- `src/pages/Messages.tsx` - Messages list UI
- `src/pages/Matches.tsx` - Matches list UI

---

## 1. Service Layer (`chat.service.ts`)

### Strengths
✅ **Real-time subscriptions** - Proper Supabase real-time integration
✅ **Message queries** - Includes sender profile data
✅ **Last message retrieval** - Efficient batch query for match previews
✅ **Subscription cleanup** - Proper unsubscribe functions
✅ **JSDoc comments** - Well-documented functions

### Issues & Recommendations

#### 1.1 Subscription Performance
**Location:** `subscribeToAllMatchMessages`, lines 134-175
**Issue:** Subscribes to ALL message inserts, then filters client-side
**Recommendation:** Use multiple subscriptions or RPC function:
```typescript
// Option 1: Create separate subscriptions for each match (if matchIds.length < 10)
// Option 2: Use RPC function with match_ids array filter
// Option 3: Use Supabase filters if supported
const channel = supabase
  .channel('all-match-messages')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'messages',
    filter: `match_id=in.(${matchIds.join(',')})`, // If supported
  }, ...)
```

#### 1.2 Missing Message Pagination
**Location:** `getMatchMessages`, lines 22-34
**Issue:** Fetches all messages at once, could be slow for long conversations
**Recommendation:** Add pagination:
```typescript
export async function getMatchMessages(
  matchId: string,
  limit: number = 50,
  offset: number = 0
): Promise<Message[]> {
  const { data, error } = await supabase
    .from('messages')
    .select(`...`)
    .eq('match_id', matchId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
  
  if (error) throw error;
  return (data || []).reverse() as Message[]; // Reverse to show oldest first
}
```

#### 1.3 No Message Deletion
**Location:** Service functions
**Issue:** No function to delete messages
**Recommendation:** Add delete function:
```typescript
export async function deleteMessage(messageId: string, senderId: string): Promise<void> {
  const { error } = await supabase
    .from('messages')
    .delete()
    .eq('id', messageId)
    .eq('sender_id', senderId); // Ensure user can only delete own messages
  
  if (error) throw error;
}
```

#### 1.4 No Message Editing
**Location:** Service functions
**Issue:** No function to edit messages
**Recommendation:** Add edit function:
```typescript
export async function editMessage(
  messageId: string,
  senderId: string,
  newContent: string
): Promise<Message> {
  const { data, error } = await supabase
    .from('messages')
    .update({ content: newContent, edited_at: new Date().toISOString() })
    .eq('id', messageId)
    .eq('sender_id', senderId)
    .select(`...`)
    .single();
  
  if (error) throw error;
  return data as Message;
}
```

#### 1.5 Missing Read Receipts
**Location:** Message interface and functions
**Issue:** No read receipt tracking
**Recommendation:** Add read receipts:
```typescript
export interface Message {
  // ... existing fields ...
  read_at?: string;
  read_by?: string[]; // Array of user IDs who read the message
}

export async function markMessageAsRead(messageId: string, userId: string): Promise<void> {
  // Update message read_by array or create read_receipts table
}
```

---

## 2. Hooks Layer (`useChat.ts`)

### Strengths
✅ **React Query integration** - Proper caching and invalidation
✅ **Real-time subscriptions** - Well-implemented subscription hooks
✅ **Duplicate prevention** - Checks for duplicate messages before adding
✅ **Cache updates** - Updates both messages and lastMessages cache

### Issues & Recommendations

#### 2.1 Subscription Query Key Mismatch
**Location:** `useAllMatchMessagesSubscription`, lines 127-137
**Issue:** Uses `['lastMessages', matchIds]` but Matches page uses `['lastMessages']`
**Recommendation:** Use consistent query key:
```typescript
// In useChat.ts
queryClient.setQueryData(['lastMessages', matchIds], ...);

// In Matches.tsx and Messages.tsx
const { data: lastMessages = {} } = useQuery({
  queryKey: ['lastMessages', matchIds], // Match the subscription key
  queryFn: () => getLastMessagesForMatches(matchIds),
  enabled: matchIds.length > 0,
});
```

#### 2.2 Missing Error Handling in Subscriptions
**Location:** Both subscription hooks
**Issue:** No error handling for subscription failures
**Recommendation:** Add error handling:
```typescript
useEffect(() => {
  if (!matchId || !enabled) return;

  const unsubscribe = subscribeToMessages(matchId, (message) => {
    // ... existing code ...
  }, (error) => {
    console.error('Subscription error:', error);
    // Optionally retry or show error to user
  });

  return () => {
    if (unsubscribe) unsubscribe();
  };
}, [matchId, enabled, queryClient]);
```

#### 2.3 No Message Pagination Hook
**Location:** Hooks
**Issue:** No hook for paginated message loading
**Recommendation:** Add pagination hook:
```typescript
export function useMessagesPaginated(matchId: string | null, pageSize: number = 50) {
  const [page, setPage] = useState(0);
  
  const query = useInfiniteQuery({
    queryKey: ['messages', matchId, 'paginated'],
    queryFn: ({ pageParam = 0 }) => 
      getMatchMessages(matchId!, pageSize, pageParam * pageSize),
    getNextPageParam: (lastPage, allPages) => 
      lastPage.length === pageSize ? allPages.length : undefined,
    enabled: !!matchId,
  });
  
  return {
    ...query,
    loadMore: () => query.fetchNextPage(),
  };
}
```

---

## 3. UI Layer

### Chat.tsx

#### Strengths
✅ **Clean UI** - Well-structured chat interface
✅ **Auto-scroll** - Scrolls to bottom on new messages
✅ **Message grouping** - Shows sender info for other users
✅ **Loading states** - Proper loading indicators
✅ **Memoization** - Efficient use of useMemo for performance

#### Issues & Recommendations

**3.1 Missing Import**
**Location:** Line 5
**Issue:** `MessageCircle` imported but not used
**Recommendation:** Remove unused import

**3.2 No Message Input Validation**
**Location:** `handleSend`, line 62
**Issue:** Only checks for empty string, no length limit
**Recommendation:** Add validation:
```typescript
const MAX_MESSAGE_LENGTH = 1000;

const handleSend = async () => {
  if (!message.trim() || !matchId || !user) return;
  if (message.length > MAX_MESSAGE_LENGTH) {
    toast.error(`Message must be less than ${MAX_MESSAGE_LENGTH} characters`);
    return;
  }
  // ... rest of code
};
```

**3.3 No Image/File Support**
**Location:** Message input
**Issue:** Only text messages supported
**Recommendation:** Add image/file upload support:
```typescript
const [attachments, setAttachments] = useState<File[]>([]);

// Add file input and upload logic
```

**3.4 No Typing Indicators**
**Location:** Chat UI
**Issue:** No typing indicators
**Recommendation:** Add typing indicator subscription:
```typescript
// Subscribe to typing events
useTypingIndicator(matchId, user?.id);
```

### Messages.tsx & Matches.tsx

#### Strengths
✅ **Real-time updates** - Subscriptions update list in real-time
✅ **Efficient sorting** - Sorts by last message time
✅ **Memoization** - Good use of useMemo and useCallback
✅ **Empty states** - Good handling of no matches

#### Issues & Recommendations

**3.5 Duplicate Code**
**Location:** Both files
**Issue:** `getOtherDuo` and `getMatchName` functions duplicated
**Recommendation:** Extract to shared utility:
```typescript
// In lib/utils.ts or lib/match-utils.ts
export function getOtherDuo(match: Match, userDuoIds: Set<string>) {
  // ... shared logic
}

export function getMatchName(match: Match, userDuoIds: Set<string>) {
  // ... shared logic
}
```

**3.6 No Unread Count**
**Location:** Both files
**Issue:** `hasUnread` is hardcoded to false (line 126 in Messages.tsx)
**Recommendation:** Implement unread tracking:
```typescript
// Add unread_count to Match interface
// Track read messages per match
const unreadCounts = useUnreadCounts(matchIds);
```

**3.7 No Search/Filter**
**Location:** Messages list
**Issue:** No way to search or filter matches
**Recommendation:** Add search functionality:
```typescript
const [searchQuery, setSearchQuery] = useState('');

const filteredMatches = useMemo(() => {
  if (!searchQuery) return sortedMatches;
  return sortedMatches.filter(match => {
    const name = getMatchName(match);
    return name.toLowerCase().includes(searchQuery.toLowerCase());
  });
}, [sortedMatches, searchQuery]);
```

---

## 4. Data Flow

### Current Flow
1. User sends message → Message inserted to database
2. Subscription receives new message → Updates cache
3. UI updates → Shows new message
4. Last message updated → Updates matches list

### Issues
- ⚠️ Query key mismatch between subscription and query
- ⚠️ No pagination for long conversations
- ⚠️ No read receipts or unread tracking

---

## 5. Security Considerations

### ✅ Good Practices
- Validates sender_id matches authenticated user (should verify in RLS)
- Uses RLS policies (should verify in database review)

### ⚠️ Recommendations
1. **Message Validation**: Validate message content server-side
2. **Rate Limiting**: Limit messages per minute/hour
3. **Content Moderation**: Consider content moderation for messages
4. **Access Control**: Ensure RLS policies prevent unauthorized message access

---

## 6. Performance Considerations

### Current State
- ✅ React Query caching for messages
- ✅ Real-time subscriptions for instant updates
- ✅ Memoization for performance
- ⚠️ No pagination could cause performance issues with long conversations

### Recommendations
1. **Pagination**: Implement message pagination
2. **Virtual Scrolling**: Use virtual scrolling for long message lists
3. **Image Optimization**: Optimize images in messages
4. **Debouncing**: Debounce message input for better performance

---

## 7. Testing Recommendations

### Unit Tests Needed
- [ ] `chat.service.ts` - Test all functions with mocked Supabase
- [ ] `useChat.ts` - Test hooks with React Query test utilities
- [ ] `Chat.tsx` - Test message sending and display

### Integration Tests Needed
- [ ] Full message send flow
- [ ] Real-time subscription flow
- [ ] Message pagination flow
- [ ] Last message updates

---

## Summary

### Critical Issues
1. ⚠️ Query key mismatch between subscription and query
2. ⚠️ No pagination for messages (could cause performance issues)
3. ⚠️ Duplicate code in Messages.tsx and Matches.tsx

### High Priority Improvements
1. Fix query key consistency
2. Add message pagination
3. Extract shared match utility functions
4. Implement unread message tracking

### Low Priority Enhancements
1. Add message editing/deletion
2. Add image/file support
3. Add typing indicators
4. Add search/filter functionality

---

## Review Checklist

- [ ] Service layer follows DRY principles
- [x] Hooks properly use React Query
- [x] Components are stateless where possible
- [ ] Duplicate code is extracted to shared utilities
- [x] TypeScript types are properly defined
- [x] Error handling is present
- [x] Real-time subscriptions are properly cleaned up

