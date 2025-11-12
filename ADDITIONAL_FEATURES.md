# Additional Features to Consider

## High Value Additions

### 1. **Browser Notifications for New Requests** ⭐
**Why**: Users might miss requests if they're not actively checking the app  
**Implementation**: 
- Request browser notification permission
- Show notification when new request arrives via real-time subscription
- Click notification to navigate to requests page

**Impact**: High - Improves user engagement and response time

---

### 2. **Accept Previously Rejected Requests** ⭐
**Why**: People change their minds - if you rejected a request, you should be able to accept it later  
**Current**: Can only resend a new request  
**Better**: Allow changing status from "rejected" to "accepted" directly

**Implementation**:
- Add "Accept" button to rejected received requests
- Update `acceptDuoRequest` to allow accepting rejected requests
- Change status from 'rejected' to 'accepted'

**Impact**: Medium - Better UX, reduces friction

---

### 3. **Resend Expired Requests**
**Why**: Expired requests can't be cancelled/resent currently  
**Implementation**:
- Allow resending expired requests (treat like cancelled)
- Show "Resend" button for expired requests
- Create new request with same details

**Impact**: Medium - Completes the "change your mind" feature

---

## Medium Value Additions

### 4. **Search/Filter Requests by Name**
**Why**: If you have many requests, hard to find specific ones  
**Implementation**:
- Add search input to filter requests by requester/requested name
- Filter in real-time as user types

**Impact**: Low-Medium - Only useful if users have many requests

---

### 5. **Request Activity Timeline**
**Why**: See history of what happened with a request  
**Implementation**:
- Show timeline: Created → (Rejected/Cancelled) → Resent → Accepted
- Display timestamps for each status change

**Impact**: Low - Nice to have, but not essential

---

### 6. **Request Reminders**
**Why**: Remind users about pending requests after X days  
**Implementation**:
- Show reminder toast/notification for requests pending >3 days
- "You have requests waiting for your response"

**Impact**: Medium - Could improve response rates

---

## Nice to Have (Low Priority)

### 7. **Request Templates**
Save common duo details as templates for faster requests

### 8. **Bulk Actions**
Accept/reject multiple requests at once (probably not needed)

### 9. **Request Analytics**
Show stats: acceptance rate, average response time, etc.

---

## Recommended Priority Order

1. **Browser Notifications** - High impact, improves engagement
2. **Accept Rejected Requests** - Better UX, easy to implement
3. **Resend Expired Requests** - Completes the feature set
4. **Request Reminders** - Could improve response rates
5. **Search/Filter** - Only if users have many requests

Would you like me to implement any of these? I'd recommend starting with #1 (Browser Notifications) and #2 (Accept Rejected Requests) as they have the highest impact.

