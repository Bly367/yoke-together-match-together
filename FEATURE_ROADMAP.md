# Feature Roadmap - Missing Features & Enhancements

**Last Updated:** 2024-12-19  
**Status:** Recommendations for Future Development

This document lists valuable features and enhancements that haven't been implemented yet but would significantly improve the Yoke application.

---

## 🔴 High Priority - Essential Features

### 1. Password Reset / Forgot Password
**Priority:** 🔴 Critical  
**Impact:** High - Essential for user experience  
**Effort:** Medium

**What's Missing:**
- No password reset functionality
- Users who forget passwords cannot recover accounts

**Implementation:**
- Add "Forgot Password" link on Auth page
- Create password reset service function using Supabase `resetPasswordForEmail`
- Create password reset page/flow
- Email template for reset link

**Files to Create:**
- `src/services/auth.service.ts` - Add `resetPassword` and `updatePassword` functions
- `src/pages/ForgotPassword.tsx` - Forgot password page
- `src/pages/ResetPassword.tsx` - Reset password page with token

---

### 2. Email Verification
**Priority:** 🔴 Critical  
**Impact:** High - Security and spam prevention  
**Effort:** Low-Medium

**What's Missing:**
- No email verification flow
- Users can sign up without verifying email

**Implementation:**
- Enable email verification in Supabase Auth settings
- Add email verification check in `useAuth` hook
- Create email verification page
- Show verification status in profile

**Files to Create:**
- `src/pages/VerifyEmail.tsx` - Email verification page
- `src/services/auth.service.ts` - Add `resendVerificationEmail` function

---

### 3. Error Boundary Component
**Priority:** 🔴 Critical  
**Impact:** High - Better error handling and UX  
**Effort:** Low

**What's Missing:**
- No React Error Boundary to catch component errors
- Unhandled errors can crash the entire app

**Implementation:**
- Create ErrorBoundary component using React error boundary API
- Wrap App component with ErrorBoundary
- Show user-friendly error page with retry option
- Log errors to error tracking service (future)

**Files to Create:**
- `src/components/ErrorBoundary.tsx` - Error boundary component

---

### 4. User Blocking & Reporting
**Priority:** 🔴 Critical  
**Impact:** High - Safety feature  
**Effort:** Medium

**What's Missing:**
- No way to block users
- No reporting system for inappropriate behavior
- Safety concerns for dating app

**Implementation:**
- Create `blocked_users` table in database
- Add block/report service functions
- Add block/report UI in chat and profile pages
- Filter blocked users from matches and messages
- Admin panel for reviewing reports (future)

**Files to Create:**
- `src/services/safety.service.ts` - Block/report functions
- `src/hooks/useSafety.ts` - Safety hooks
- `supabase/migrations/005_user_safety.sql` - Database migration

---

### 5. Image Compression Before Upload
**Priority:** 🔴 High  
**Impact:** High - Performance and storage costs  
**Effort:** Low-Medium

**What's Missing:**
- Images uploaded without compression
- Large file sizes waste storage and bandwidth
- Slow uploads on mobile

**Implementation:**
- Add image compression library (e.g., `browser-image-compression`)
- Compress images in PhotoUpload component before upload
- Set max dimensions and quality
- Show compression progress

**Files to Modify:**
- `src/components/PhotoUpload.tsx` - Add compression before upload

---

## 🟡 Medium Priority - Quality of Life

### 6. Skeleton Loaders
**Priority:** 🟡 Medium  
**Impact:** Medium - Better perceived performance  
**Effort:** Low

**What's Missing:**
- Loading states show spinners only
- Skeleton loaders provide better UX

**Implementation:**
- Create Skeleton component (shadcn/ui has one)
- Replace spinners with skeleton loaders in:
  - Matchmaking page (card skeletons)
  - Messages page (list skeletons)
  - Chat page (message skeletons)
  - Profile page

**Files to Create/Modify:**
- Use existing `src/components/ui/skeleton.tsx`
- Update pages to use skeletons

---

### 7. Search Functionality for Profiles/Matches
**Priority:** 🟡 Medium  
**Impact:** Medium - User convenience  
**Effort:** Medium

**What's Missing:**
- No search in matches list
- No search in messages
- Hard to find specific matches/messages

**Implementation:**
- Add search input to Matches page
- Add search input to Messages page
- Filter matches/messages by name
- Highlight search terms

**Files to Modify:**
- `src/pages/Matches.tsx` - Add search
- `src/pages/Messages.tsx` - Add search (already has some search)

---

### 8. Advanced Filtering in Matchmaking
**Priority:** 🟡 Medium  
**Impact:** Medium - Better matching  
**Effort:** Medium

**What's Missing:**
- Only basic location filtering
- No age range filter
- No distance filter
- No interest-based filtering

**Implementation:**
- Add filter UI to Matchmaking page
- Age range slider
- Distance slider
- Interest tags filter
- Apply filters to nearby profiles query

**Files to Modify:**
- `src/pages/Matchmaking.tsx` - Add filter UI
- `src/services/location.service.ts` - Add filter parameters

---

### 9. Social Login (OAuth)
**Priority:** 🟡 Medium  
**Impact:** Medium - Easier sign-up  
**Effort:** Medium-High

**What's Missing:**
- Only email/password authentication
- Users must create new account

**Implementation:**
- Configure OAuth providers in Supabase (Google, Apple, etc.)
- Add OAuth buttons to Auth page
- Handle OAuth callback
- Create profile from OAuth user data

**Files to Modify:**
- `src/pages/Auth.tsx` - Add OAuth buttons
- `src/services/auth.service.ts` - Add OAuth functions

---

### 10. Push Notifications
**Priority:** 🟡 Medium  
**Impact:** High - User engagement  
**Effort:** High

**What's Missing:**
- No push notifications for matches/messages
- Users must check app manually

**Implementation:**
- Set up service worker
- Request notification permission
- Subscribe to push notifications via Supabase
- Send notifications for:
  - New matches
  - New messages
  - Message read receipts

**Files to Create:**
- `public/sw.js` - Service worker
- `src/hooks/useNotifications.ts` - Notification hook
- `src/services/notifications.service.ts` - Notification service

---

## 🟢 Low Priority - Nice to Have

### 11. Offline Support
**Priority:** 🟢 Low  
**Impact:** Medium - Better UX  
**Effort:** High

**What's Missing:**
- No offline message queuing
- App doesn't work without internet

**Implementation:**
- Use service worker for offline caching
- Queue messages when offline
- Sync when back online
- Show offline indicator

---

### 12. Analytics & Error Tracking
**Priority:** 🟢 Low  
**Impact:** Medium - Monitoring and debugging  
**Effort:** Medium

**What's Missing:**
- No error tracking (Sentry, LogRocket)
- No analytics (Google Analytics, Mixpanel)
- Hard to debug production issues

**Implementation:**
- Integrate Sentry for error tracking
- Add Google Analytics or Mixpanel
- Track key events (signups, matches, messages)
- Monitor performance metrics

**Files to Create:**
- `src/lib/analytics.ts` - Analytics helper
- `src/lib/errorTracking.ts` - Error tracking helper

---

### 13. Admin Panel
**Priority:** 🟢 Low  
**Impact:** Low - Admin convenience  
**Effort:** High

**What's Missing:**
- No admin interface
- Must use Supabase dashboard for admin tasks

**Implementation:**
- Create admin role in database
- Admin routes and pages
- User management
- Report review
- Analytics dashboard

---

### 14. Video Chat Integration
**Priority:** 🟢 Low  
**Impact:** High - Feature enhancement  
**Effort:** Very High

**What's Missing:**
- No video chat capability
- Users can only text chat

**Implementation:**
- Integrate WebRTC or video service (Twilio, Agora)
- Add video call button in chat
- Handle video call UI
- Record calls (optional, with consent)

---

### 15. Enhanced Profile Features
**Priority:** 🟢 Low  
**Impact:** Medium - Better profiles  
**Effort:** Medium

**What's Missing:**
- Basic profile fields only
- No interests/hobbies system
- No photo albums (only single photo)

**Implementation:**
- Multiple photos per profile/duo
- Interests/hobbies tags
- Profile prompts/questions
- Verification badges

**Files to Modify:**
- `src/pages/Profile.tsx` - Enhanced profile UI
- `src/pages/ProfileSetup.tsx` - More fields
- Database migration for new fields

---

### 16. Group Events/Activities
**Priority:** 🟢 Low  
**Impact:** Medium - Social features  
**Effort:** High

**What's Missing:**
- No way to organize group activities
- Matches can only chat

**Implementation:**
- Events/activities system
- Create events for matched duos
- RSVP functionality
- Event discovery

---

### 17. Message Reactions
**Priority:** 🟢 Low  
**Impact:** Low - Nice to have  
**Effort:** Low

**What's Missing:**
- No emoji reactions to messages
- Limited expressiveness

**Implementation:**
- Add reactions table
- Reaction picker UI
- Show reactions on messages

---

### 18. Dark Mode Toggle
**Priority:** 🟢 Low  
**Impact:** Low - User preference  
**Effort:** Low

**What's Missing:**
- No dark mode toggle (though next-themes is installed)
- Theme not exposed to users

**Implementation:**
- Add theme toggle to profile/settings
- Use next-themes (already installed)
- Persist theme preference

**Files to Modify:**
- `src/pages/Profile.tsx` - Add theme toggle
- `src/App.tsx` - Wrap with ThemeProvider

---

### 19. Export Data / Account Deletion
**Priority:** 🟢 Low  
**Impact:** Medium - Privacy compliance  
**Effort:** Medium

**What's Missing:**
- No way to export user data (GDPR requirement)
- No account deletion option

**Implementation:**
- Add "Export Data" button
- Generate JSON export of user data
- Add "Delete Account" option
- Soft delete or hard delete with confirmation

**Files to Create:**
- `src/services/dataExport.service.ts` - Export functions
- `src/services/account.service.ts` - Account deletion

---

### 20. Testing Infrastructure
**Priority:** 🟡 Medium  
**Impact:** High - Code quality  
**Effort:** High

**What's Missing:**
- Very limited test coverage (~4 test files)
- No integration tests
- No E2E tests

**Implementation:**
- Write unit tests for all services
- Write integration tests for hooks
- Set up E2E tests (Playwright/Cypress)
- Add test coverage reporting
- CI/CD integration

**Target:** 80%+ test coverage

---

## 📊 Implementation Priority Matrix

| Feature | Priority | Impact | Effort | Value Score |
|---------|----------|--------|--------|-------------|
| Password Reset | 🔴 Critical | High | Medium | ⭐⭐⭐⭐⭐ |
| Email Verification | 🔴 Critical | High | Low-Medium | ⭐⭐⭐⭐⭐ |
| Error Boundary | 🔴 Critical | High | Low | ⭐⭐⭐⭐⭐ |
| User Blocking | 🔴 Critical | High | Medium | ⭐⭐⭐⭐⭐ |
| Image Compression | 🔴 High | High | Low-Medium | ⭐⭐⭐⭐ |
| Skeleton Loaders | 🟡 Medium | Medium | Low | ⭐⭐⭐ |
| Search Functionality | 🟡 Medium | Medium | Medium | ⭐⭐⭐ |
| Advanced Filtering | 🟡 Medium | Medium | Medium | ⭐⭐⭐ |
| Social Login | 🟡 Medium | Medium | Medium-High | ⭐⭐⭐ |
| Push Notifications | 🟡 Medium | High | High | ⭐⭐⭐⭐ |
| Testing Infrastructure | 🟡 Medium | High | High | ⭐⭐⭐⭐⭐ |
| Offline Support | 🟢 Low | Medium | High | ⭐⭐ |
| Analytics | 🟢 Low | Medium | Medium | ⭐⭐⭐ |
| Admin Panel | 🟢 Low | Low | High | ⭐⭐ |
| Video Chat | 🟢 Low | High | Very High | ⭐⭐ |

---

## Recommended Implementation Order

### Phase 1: Critical Features (Week 1-2)
1. ✅ Error Boundary
2. ✅ Password Reset
3. ✅ Email Verification
4. ✅ User Blocking & Reporting

### Phase 2: High-Value Improvements (Week 3-4)
5. ✅ Image Compression
6. ✅ Skeleton Loaders
7. ✅ Search Functionality
8. ✅ Advanced Filtering

### Phase 3: Quality & Engagement (Week 5-6)
9. ✅ Social Login
10. ✅ Push Notifications
11. ✅ Testing Infrastructure

### Phase 4: Nice-to-Haves (Future)
12. Offline Support
13. Analytics
14. Admin Panel
15. Video Chat
16. Enhanced Profiles
17. Group Events

---

## Quick Wins (Low Effort, High Impact)

These can be implemented quickly:

1. **Error Boundary** - 1-2 hours
2. **Skeleton Loaders** - 2-3 hours
3. **Image Compression** - 3-4 hours
4. **Dark Mode Toggle** - 1-2 hours
5. **Message Reactions** - 4-6 hours

---

## Notes

- All features should follow the existing architecture (Service → Hook → Component)
- Consider user privacy and safety for all features
- Test thoroughly before deploying
- Update documentation as features are added

---

**Last Updated:** 2024-12-19  
**Next Review:** After implementing Phase 1 features

