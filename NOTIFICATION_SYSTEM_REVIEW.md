# Notification System Review

**Review Date:** 2024-12-19  
**Status:** Partially Implemented - Needs Enhancement

---

## Executive Summary

The notification system currently has **basic browser notification support** for duo requests, but is **missing critical notifications** for messages and matches. Toast notifications (via Sonner) are well-implemented throughout the app for user feedback, but browser notifications are underutilized.

---

## 1. Current Implementation

### ✅ **What's Working**

#### 1.1 Browser Notification Infrastructure (`src/lib/notifications.ts`)
- ✅ **Permission Management**: `requestNotificationPermission()` function exists
- ✅ **Permission Checking**: `areNotificationsEnabled()` function exists  
- ✅ **Generic Notification**: `showNotification()` function exists
- ✅ **Duo Request Notification**: `notifyNewDuoRequest()` function exists

**Code Reference:**
```1:67:src/lib/notifications.ts
/**
 * Browser notification utilities
 */

/**
 * Request browser notification permission
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) {
    console.warn('This browser does not support notifications');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
}

/**
 * Check if notifications are enabled
 */
export function areNotificationsEnabled(): boolean {
  if (!('Notification' in window)) return false;
  return Notification.permission === 'granted';
}

/**
 * Show a browser notification
 */
export function showNotification(
  title: string,
  options?: NotificationOptions
): Notification | null {
  if (!areNotificationsEnabled()) {
    return null;
  }

  try {
    return new Notification(title, {
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      ...options,
    });
  } catch (error) {
    console.error('Failed to show notification:', error);
    return null;
  }
}

/**
 * Show notification for new duo request
 */
export function notifyNewDuoRequest(requesterName: string): Notification | null {
  return showNotification('New Duo Request! 🎉', {
    body: `${requesterName} wants to form a duo with you`,
    tag: 'duo-request', // Replace previous notifications with same tag
    requireInteraction: false,
    silent: false,
  });
}
```

#### 1.2 Duo Request Notifications (`src/hooks/useDuoRequests.ts`)
- ✅ **Permission Request**: Automatically requests permission on mount
- ✅ **Real-time Subscription**: Subscribes to new duo requests
- ✅ **Notification Trigger**: Shows browser notification when new request arrives

**Code Reference:**
```52:70:src/hooks/useDuoRequests.ts
  // Request notification permission on mount
  useEffect(() => {
    if (user?.id) {
      requestNotificationPermission().catch(() => {
        // Silently fail if permission denied
      });
    }
  }, [user?.id]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!user?.id) return;

    const unsubscribe = subscribeToDuoRequests(user.id, {
      onNewRequest: (newRequest) => {
        // Show browser notification if enabled
        if (areNotificationsEnabled() && newRequest.requester?.name) {
          notifyNewDuoRequest(newRequest.requester.name);
        }
```

#### 1.3 Toast Notifications (Sonner)
- ✅ **Comprehensive Usage**: Toast notifications used throughout the app
- ✅ **Error Handling**: Error messages shown via toast
- ✅ **Success Feedback**: Success messages shown via toast
- ✅ **Proper Setup**: Sonner toaster component included in App.tsx

---

## 2. Missing Functionality

### ❌ **Critical Missing Features**

#### 2.1 New Message Notifications
**Issue**: No browser notifications when new messages arrive (especially when user is not in the chat)

**Expected Behavior**:
- Show notification when new message arrives in a match
- Only show if user is not currently viewing that chat
- Include sender name and message preview
- Click notification to navigate to chat

**Current State**: 
- Messages are subscribed to in real-time (`useMessageSubscription`, `useAllMatchMessagesSubscription`)
- UI updates happen (unread counts, last message updates)
- **BUT**: No browser notifications are triggered

**Impact**: Users won't know about new messages unless they're actively viewing the app

#### 2.2 New Match Notifications
**Issue**: No browser notifications when a new match is created

**Expected Behavior**:
- Show notification when mutual like creates a match
- Include other duo's name
- Click notification to navigate to matches or chat

**Current State**:
- Matches are subscribed to in real-time (`subscribeToMatches` in `matching.service.ts`)
- UI updates happen (matches list updates)
- **BUT**: No browser notifications are triggered

**Impact**: Users won't know about new matches unless they're actively viewing the app

#### 2.3 Notification Functions Missing
**Issue**: Only `notifyNewDuoRequest()` exists, missing:
- `notifyNewMessage()`
- `notifyNewMatch()`
- Other event-specific notifications

---

## 3. Issues Found

### 3.1 Permission Request Timing
**Location**: `src/hooks/useDuoRequests.ts` line 53-59

**Issue**: Permission is requested automatically when `usePendingRequests` hook is used, but:
- No user consent UI before requesting
- No explanation of why notifications are needed
- Permission might be denied if requested too early

**Recommendation**: 
- Add a user-facing notification settings page
- Request permission with context (e.g., "Enable notifications to know when you receive duo requests?")
- Allow users to enable/disable notifications per type

### 3.2 No Notification Settings/Preferences
**Issue**: No way for users to:
- Enable/disable notifications per type (messages, matches, requests)
- See current notification permission status
- Re-request permission if denied

**Recommendation**: Add notification settings to Profile page

### 3.3 No Focus/Visibility Detection
**Issue**: Notifications are shown even when:
- User is actively viewing the chat (shouldn't notify for messages in current chat)
- User is viewing the app (tab is focused)
- User is on the matches page (shouldn't notify for new matches)

**Recommendation**: 
- Check `document.visibilityState` and `document.hasFocus()`
- Only show notifications when app is in background or tab is not focused
- Track which chat/match user is currently viewing

### 3.4 No Notification Click Handling
**Issue**: Notifications are shown but clicking them doesn't navigate anywhere

**Recommendation**: 
- Add `onclick` handler to notifications
- Navigate to relevant page (chat, matches, duo requests)
- Focus the app window when clicked

### 3.5 Missing Notification Icons
**Issue**: Using generic `/favicon.ico` for all notifications

**Recommendation**: 
- Use specific icons for different notification types
- Consider using sender/match photos as notification icons (if available)

---

## 4. Recommendations

### Priority 1: Critical (Must Have)

#### 4.1 Add New Message Notifications
**File**: `src/lib/notifications.ts`

Add function:
```typescript
/**
 * Show notification for new message
 */
export function notifyNewMessage(
  senderName: string,
  messagePreview: string,
  matchId: string
): Notification | null {
  const notification = showNotification(`New message from ${senderName}`, {
    body: messagePreview,
    tag: `message-${matchId}`,
    requireInteraction: false,
    silent: false,
    data: { matchId, type: 'message' },
  });
  
  // Handle click to navigate to chat
  if (notification) {
    notification.onclick = () => {
      window.focus();
      // Navigate to chat - need to pass route or use router
      window.location.href = `/chat/${matchId}`;
    };
  }
  
  return notification;
}
```

**File**: `src/hooks/useChat.ts`

Modify `useAllMatchMessagesSubscription` to show notifications:
```typescript
export function useAllMatchMessagesSubscription(matchIds: string[], enabled: boolean = true) {
  const { user } = useAuth();
  const navigate = useNavigate(); // Need to add this
  const queryClient = useQueryClient();
  
  // ... existing code ...
  
  const unsubscribe = subscribeToAllMatchMessages(sortedMatchIds, (message) => {
    // Only notify if:
    // 1. Not from current user
    // 2. App is in background or tab not focused
    // 3. User is not currently viewing this chat
    const shouldNotify = 
      message.sender_id !== user?.id &&
      (document.visibilityState === 'hidden' || !document.hasFocus()) &&
      !isCurrentlyViewingChat(message.match_id); // Need to track this
    
    if (shouldNotify && areNotificationsEnabled()) {
      notifyNewMessage(
        message.sender?.name || 'Someone',
        message.content.substring(0, 50),
        message.match_id
      );
    }
    
    // ... existing cache update code ...
  });
}
```

#### 4.2 Add New Match Notifications
**File**: `src/lib/notifications.ts`

Add function:
```typescript
/**
 * Show notification for new match
 */
export function notifyNewMatch(otherDuoName: string): Notification | null {
  const notification = showNotification('New Match! 🎉', {
    body: `You matched with ${otherDuoName}`,
    tag: 'new-match',
    requireInteraction: false,
    silent: false,
    data: { type: 'match' },
  });
  
  if (notification) {
    notification.onclick = () => {
      window.focus();
      window.location.href = '/matches';
    };
  }
  
  return notification;
}
```

**File**: `src/hooks/useMatching.ts`

Modify `useMatches` to show notifications:
```typescript
export function useMatches() {
  // ... existing code ...
  
  useEffect(() => {
    if (!user?.id || !duos || duos.length === 0) return;

    const unsubscribe = subscribeToMatches(user.id, (newMatch) => {
      // Show notification if app is in background
      if (document.visibilityState === 'hidden' || !document.hasFocus()) {
        const otherDuo = getOtherDuo(newMatch, userDuoIdsSet);
        if (otherDuo && areNotificationsEnabled()) {
          const otherDuoName = `${otherDuo.member1?.name} & ${otherDuo.member2?.name}`;
          notifyNewMatch(otherDuoName);
        }
      }
      
      // ... existing cache update code ...
    });
  }, [user?.id, duos, queryClient]);
}
```

### Priority 2: Important (Should Have)

#### 4.3 Add Notification Settings Page
**File**: `src/pages/NotificationSettings.tsx` (new)

Create a settings page where users can:
- See current notification permission status
- Enable/disable notifications per type (messages, matches, requests)
- Re-request permission if denied
- Test notifications

#### 4.4 Add Focus/Visibility Detection
**File**: `src/lib/notifications.ts`

Add helper:
```typescript
/**
 * Check if app should show notifications (app is in background)
 */
export function shouldShowNotification(): boolean {
  return document.visibilityState === 'hidden' || !document.hasFocus();
}
```

Use this in all notification triggers to avoid showing notifications when user is actively using the app.

#### 4.5 Track Currently Viewing Chat/Match
**File**: `src/hooks/useChat.ts` and `src/hooks/useMatching.ts`

Add state to track which chat/match user is currently viewing:
```typescript
// In a context or global state
const [currentChatId, setCurrentChatId] = useState<string | null>(null);
const [currentMatchId, setCurrentMatchId] = useState<string | null>(null);
```

Use this to avoid notifying for messages/matches user is currently viewing.

### Priority 3: Nice to Have

#### 4.6 Notification Icons
- Use specific icons for different notification types
- Consider using user/match photos

#### 4.7 Notification History
- Store notification history (optional)
- Allow users to see recent notifications

#### 4.8 Push Notifications (Future)
- Implement service worker for push notifications
- Support notifications when app is closed
- Requires backend support (Supabase or custom server)

---

## 5. Testing Checklist

### 5.1 Duo Request Notifications
- [ ] Permission request works
- [ ] Notification shows when new request arrives
- [ ] Notification doesn't show when app is focused and viewing duo requests page
- [ ] Clicking notification navigates to duo requests

### 5.2 Message Notifications (After Implementation)
- [ ] Notification shows when new message arrives
- [ ] Notification doesn't show for own messages
- [ ] Notification doesn't show when viewing that chat
- [ ] Notification doesn't show when app tab is focused
- [ ] Clicking notification navigates to chat
- [ ] Message preview is truncated correctly

### 5.3 Match Notifications (After Implementation)
- [ ] Notification shows when new match is created
- [ ] Notification doesn't show when viewing matches page
- [ ] Notification doesn't show when app tab is focused
- [ ] Clicking notification navigates to matches

### 5.4 Edge Cases
- [ ] Permission denied handling
- [ ] Browser doesn't support notifications
- [ ] Multiple notifications (should replace with same tag)
- [ ] Notification when app is closed (requires push notifications)

---

## 6. Implementation Plan

### Phase 1: Add Missing Notification Functions
1. Add `notifyNewMessage()` to `src/lib/notifications.ts`
2. Add `notifyNewMatch()` to `src/lib/notifications.ts`
3. Add `shouldShowNotification()` helper

### Phase 2: Integrate Message Notifications
1. Modify `useAllMatchMessagesSubscription` to show notifications
2. Add logic to track currently viewing chat
3. Add focus/visibility detection

### Phase 3: Integrate Match Notifications
1. Modify `useMatches` to show notifications
2. Add logic to track currently viewing matches page
3. Add focus/visibility detection

### Phase 4: Add Notification Settings
1. Create `NotificationSettings` page
2. Add route to Profile page
3. Implement enable/disable per type
4. Add permission re-request functionality

### Phase 5: Polish & Testing
1. Add notification icons
2. Test all scenarios
3. Handle edge cases
4. Update documentation

---

## 7. Code Quality Notes

### ✅ **Good Practices Found**
- Proper error handling in `showNotification()`
- Permission checking before showing notifications
- Tag-based notification replacement (prevents spam)
- Real-time subscriptions properly set up

### ⚠️ **Areas for Improvement**
- Missing notification functions for messages/matches
- No focus/visibility detection
- No user preferences/settings
- No notification click handling
- Permission requested without user context

---

## 8. Conclusion

The notification system has a **solid foundation** with browser notification infrastructure and duo request notifications working. However, **critical features are missing** for messages and matches, which are core to the app's functionality.

**Recommendation**: Implement Priority 1 items (message and match notifications) as soon as possible, as these are essential for user engagement. Priority 2 items (settings, focus detection) should follow shortly after.

**Estimated Effort**:
- Priority 1: 4-6 hours
- Priority 2: 3-4 hours  
- Priority 3: 2-3 hours
- **Total**: ~10-13 hours

---

**Review Status**: ✅ Complete  
**Next Steps**: Implement Priority 1 recommendations

