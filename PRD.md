# Product Requirements Document (PRD)
## Yoke - Two-Man Dating App

**Version:** 1.0  
**Last Updated:** 2024-12-19  
**Status:** Production Ready

---

## 1. Product Overview

### 1.1 Vision
Yoke is a React + TypeScript + Supabase web application that enables two friends to create a "duo" profile and match with other duos for group dating experiences. The app emphasizes real-time communication, location-based matching, and a modern, intuitive user interface.

### 1.2 Core Value Proposition
- **Duo-Based Matching:** Two friends pair up to create a joint profile
- **Swipe-Based Discovery:** Tinder-like swiping interface for discovering potential matches
- **Real-Time Chat:** Instant messaging with read receipts, typing indicators, and file attachments
- **Location-Based:** Find matches nearby with privacy controls
- **Modern UX:** Beautiful, responsive interface built with shadcn/ui and Tailwind CSS

---

## 2. Technical Architecture

### 2.1 Technology Stack
- **Frontend:** React 18 + TypeScript
- **UI Library:** shadcn/ui + Tailwind CSS
- **Backend:** Supabase (PostgreSQL + Realtime + Storage)
- **State Management:** React Query (TanStack Query)
- **Routing:** React Router v6
- **Build Tool:** Vite

### 2.2 Architecture Pattern
**Model → Service → Hook → Component**

- **Components:** Presentational, no business logic
- **Hooks:** Data fetching and state management (React Query)
- **Services:** Supabase operations (auth, database, storage)
- **Lib:** Utility functions (formatting, validation, type guards)

### 2.3 Data Flow
```
Component → Hook → Service → Supabase
```

---

## 3. Core Features & Requirements

### 3.1 Authentication & User Management

#### 3.1.1 User Registration
- **REQ-AUTH-001:** Users can sign up with email and password
- **REQ-AUTH-002:** Email validation (format validation)
- **REQ-AUTH-003:** Password requirements: minimum 8 characters, maximum 128 characters
- **REQ-AUTH-004:** Name validation: minimum 2 characters, maximum 100 characters
- **REQ-AUTH-005:** Automatic profile creation on signup (via database trigger or retry logic)
- **REQ-AUTH-006:** Profile creation uses exponential backoff retry (no setTimeout)

#### 3.1.2 User Login
- **REQ-AUTH-007:** Users can sign in with email and password
- **REQ-AUTH-008:** Email and password validation
- **REQ-AUTH-009:** Automatic profile creation if missing (backward compatibility)

#### 3.1.3 Session Management
- **REQ-AUTH-010:** Session timeout warning component
- **REQ-AUTH-011:** Protected routes require authentication
- **REQ-AUTH-012:** Sign out functionality

#### 3.1.4 Security Requirements
- **REQ-AUTH-013:** Input validation at service layer
- **REQ-AUTH-014:** Error handling with user-friendly messages
- **REQ-AUTH-015:** No sensitive data exposure in errors
- **REQ-AUTH-016:** RLS (Row Level Security) policies enforced

---

### 3.2 Profile Management

#### 3.2.1 Profile Creation
- **REQ-PROF-001:** Users must complete profile setup after signup
- **REQ-PROF-002:** Required fields: name, email, age (18+)
- **REQ-PROF-003:** Optional fields: bio, photo, location
- **REQ-PROF-004:** Age validation: minimum 18 years
- **REQ-PROF-005:** Profile completeness indicator

#### 3.2.2 Profile Updates
- **REQ-PROF-006:** Users can update profile information
- **REQ-PROF-007:** Photo upload with validation (file type, size)
- **REQ-PROF-008:** Location updates with privacy toggle
- **REQ-PROF-009:** Optimistic updates for better UX

#### 3.2.3 Photo Management
- **REQ-PROF-010:** Photo upload to Supabase Storage
- **REQ-PROF-011:** File type validation (images only)
- **REQ-PROF-012:** File size limits enforced
- **REQ-PROF-013:** Optimized image display component
- **REQ-PROF-014:** Photo deletion capability

---

### 3.3 Duo Management

#### 3.3.1 Duo Creation
- **REQ-DUO-001:** Users can create a duo with a friend
- **REQ-DUO-002:** Friend lookup by email
- **REQ-DUO-003:** Duo name and photo required
- **REQ-DUO-004:** Member validation (both members must exist)
- **REQ-DUO-005:** Duo limit validation (prevent multiple active duos)

#### 3.3.2 Duo Updates
- **REQ-DUO-006:** Duo name and photo can be updated
- **REQ-DUO-007:** Member changes (if needed)
- **REQ-DUO-008:** Duo deactivation

#### 3.3.3 Duo Joining
- **REQ-DUO-009:** Users can join a duo via invite link
- **REQ-DUO-010:** Join flow validates user eligibility
- **REQ-DUO-011:** Duo member display with profiles

---

### 3.4 Matching & Swiping System

#### 3.4.1 Swipe Functionality
- **REQ-MATCH-001:** Users swipe on duos (like/pass)
- **REQ-MATCH-002:** Swipe actions: 'like' or 'pass'
- **REQ-MATCH-003:** Rate limiting on swipes (prevent abuse)
- **REQ-MATCH-004:** Swipe undo functionality
- **REQ-MATCH-005:** Swipe animations (touch and mouse drag)

#### 3.4.2 Match Detection
- **REQ-MATCH-006:** Automatic match creation when both duos like each other
- **REQ-MATCH-007:** Match detection uses database trigger
- **REQ-MATCH-008:** Race condition handling with exponential backoff retry
- **REQ-MATCH-009:** Match normalization (canonical order)

#### 3.4.3 Match Retrieval
- **REQ-MATCH-010:** Get all matches for user's duos
- **REQ-MATCH-011:** Optimized query (single OR query, not two separate)
- **REQ-MATCH-012:** Match metadata: last_message_at, unread_count
- **REQ-MATCH-013:** Real-time match subscription
- **REQ-MATCH-014:** Match unmatch functionality

#### 3.4.4 Matchmaking UI
- **REQ-MATCH-015:** Swipeable card interface
- **REQ-MATCH-016:** Location-based filtering (if location available)
- **REQ-MATCH-017:** Exclude already-swiped duos
- **REQ-MATCH-018:** Virtualized list for performance

---

### 3.5 Chat & Messaging

#### 3.5.1 Message Sending
- **REQ-CHAT-001:** Send text messages in matches
- **REQ-CHAT-002:** Message length limit: 1000 characters
- **REQ-CHAT-003:** Content moderation (profanity filtering)
- **REQ-CHAT-004:** Rate limiting on messages
- **REQ-CHAT-005:** File attachments (images/files)
- **REQ-CHAT-006:** Attachment size limits

#### 3.5.2 Message Retrieval
- **REQ-CHAT-007:** Paginated message loading (50 per page)
- **REQ-CHAT-008:** Infinite scroll support
- **REQ-CHAT-009:** Message ordering (oldest first)
- **REQ-CHAT-010:** Exclude deleted messages

#### 3.5.3 Message Management
- **REQ-CHAT-011:** Edit messages (with edited_at timestamp)
- **REQ-CHAT-012:** Delete messages (soft delete)
- **REQ-CHAT-013:** Only sender can edit/delete their messages

#### 3.5.4 Read Receipts
- **REQ-CHAT-014:** Track message reads per user
- **REQ-CHAT-015:** Track match read times
- **REQ-CHAT-016:** Unread message count per match
- **REQ-CHAT-017:** Mark messages as read on view

#### 3.5.5 Real-Time Features
- **REQ-CHAT-018:** Real-time message subscriptions (INSERT, UPDATE)
- **REQ-CHAT-019:** Typing indicators
- **REQ-CHAT-020:** Query key consistency between subscriptions and queries
- **REQ-CHAT-021:** Real-time match list updates

#### 3.5.6 Chat UI
- **REQ-CHAT-022:** Virtualized message list for performance
- **REQ-CHAT-023:** Message bubble component
- **REQ-CHAT-024:** Attachment preview and display
- **REQ-CHAT-025:** Message input with validation

---

### 3.6 Location Services

#### 3.6.1 Location Updates
- **REQ-LOC-001:** Users can update their location
- **REQ-LOC-002:** Location stored as PostGIS POINT
- **REQ-LOC-003:** Location privacy toggle (location_visible)
- **REQ-LOC-004:** Rate limiting on location updates
- **REQ-LOC-005:** Location permission handling

#### 3.6.2 Nearby Profiles
- **REQ-LOC-006:** Query nearby profiles (if RPC function available)
- **REQ-LOC-007:** Client-side filtering fallback
- **REQ-LOC-008:** Distance calculation
- **REQ-LOC-009:** Respect location privacy settings

---

### 3.7 Routing & Navigation

#### 3.7.1 Route Configuration
- **REQ-ROUTE-001:** All routes defined in lib/routes.ts
- **REQ-ROUTE-002:** Protected routes require authentication
- **REQ-ROUTE-003:** Code splitting with lazy loading
- **REQ-ROUTE-004:** Route transitions
- **REQ-ROUTE-005:** 404 handling

#### 3.7.2 Navigation
- **REQ-ROUTE-006:** Bottom navigation component
- **REQ-ROUTE-007:** Keyboard shortcuts support
- **REQ-ROUTE-008:** Deep linking support
- **REQ-ROUTE-009:** Redirect after login

---

### 3.8 UI Components & Styling

#### 3.8.1 Component Library
- **REQ-UI-001:** Use shadcn/ui components
- **REQ-UI-002:** Custom reusable components
- **REQ-UI-003:** Consistent styling with Tailwind CSS
- **REQ-UI-004:** Theme consistency (colors, spacing, typography)

#### 3.8.2 Accessibility
- **REQ-UI-005:** ARIA labels where appropriate
- **REQ-UI-006:** Keyboard navigation support
- **REQ-UI-007:** Screen reader compatibility
- **REQ-UI-008:** Semantic HTML

#### 3.8.3 Responsive Design
- **REQ-UI-009:** Mobile-first design
- **REQ-UI-010:** Responsive layouts
- **REQ-UI-011:** Touch-friendly interactions

---

### 3.9 Database & Integrations

#### 3.9.1 Database Schema
- **REQ-DB-001:** Profiles table with all required fields
- **REQ-DB-002:** Duos table with member relationships
- **REQ-DB-003:** Swipes table with unique constraints
- **REQ-DB-004:** Matches table with trigger for creation
- **REQ-DB-005:** Messages table with soft delete
- **REQ-DB-006:** Read receipts tables (message_reads, match_reads)

#### 3.9.2 RLS Policies
- **REQ-DB-007:** RLS enabled on all tables
- **REQ-DB-008:** Users can only access their own data
- **REQ-DB-009:** Match participants can access match data
- **REQ-DB-010:** Proper policy documentation

#### 3.9.3 Migrations
- **REQ-DB-011:** Idempotent migration scripts
- **REQ-DB-012:** Migration versioning
- **REQ-DB-013:** Rollback support

#### 3.9.4 Type Generation
- **REQ-DB-014:** TypeScript types generated from Supabase schema
- **REQ-DB-015:** Types kept in sync with database

---

### 3.10 Configuration & Build

#### 3.10.1 Build Configuration
- **REQ-CONFIG-001:** Vite configured correctly
- **REQ-CONFIG-002:** TypeScript strict mode enabled
- **REQ-CONFIG-003:** ESLint configured
- **REQ-CONFIG-004:** Environment variables properly managed

#### 3.10.2 Dependencies
- **REQ-CONFIG-005:** Dependencies up to date
- **REQ-CONFIG-006:** No security vulnerabilities
- **REQ-CONFIG-007:** Proper dependency management

---

### 3.11 Testing & Quality

#### 3.11.1 Test Coverage
- **REQ-TEST-001:** Unit tests for services
- **REQ-TEST-002:** Integration tests for hooks
- **REQ-TEST-003:** Test coverage >80% (target)
- **REQ-TEST-004:** Edge cases covered

#### 3.11.2 Code Quality
- **REQ-TEST-005:** No code duplication (DRY)
- **REQ-TEST-006:** Proper error handling
- **REQ-TEST-007:** TypeScript strict mode
- **REQ-TEST-008:** Linter passes

---

### 3.12 Documentation & Developer Experience

#### 3.12.1 Code Documentation
- **REQ-DOC-001:** JSDoc comments on public APIs
- **REQ-DOC-002:** README with setup instructions
- **REQ-DOC-003:** Architecture documentation
- **REQ-DOC-004:** Database schema documentation

#### 3.12.2 Developer Guides
- **REQ-DOC-005:** Setup instructions clear
- **REQ-DOC-006:** Troubleshooting guides
- **REQ-DOC-007:** API documentation
- **REQ-DOC-008:** Contribution guidelines

---

## 4. Non-Functional Requirements

### 4.1 Performance
- **NFR-PERF-001:** Page load time < 2 seconds
- **NFR-PERF-002:** Code splitting for routes
- **NFR-PERF-003:** Virtualized lists for long lists
- **NFR-PERF-004:** Optimized database queries
- **NFR-PERF-005:** Memoization where appropriate

### 4.2 Security
- **NFR-SEC-001:** Input validation at service layer
- **NFR-SEC-002:** RLS policies enforced
- **NFR-SEC-003:** Rate limiting implemented
- **NFR-SEC-004:** Content moderation
- **NFR-SEC-005:** No sensitive data in errors

### 4.3 Reliability
- **NFR-REL-001:** Error handling with retry logic
- **NFR-REL-002:** Graceful degradation
- **NFR-REL-003:** Offline handling (future)
- **NFR-REL-004:** Database transaction safety

### 4.4 Maintainability
- **NFR-MAIN-001:** DRY principle (no duplication)
- **NFR-MAIN-002:** Clear separation of concerns
- **NFR-MAIN-003:** TypeScript strict typing
- **NFR-MAIN-004:** Consistent code style
- **NFR-MAIN-005:** Comprehensive documentation

---

## 5. Architecture Principles

### 5.1 Code Organization
- **ARCH-001:** Service → Hook → Component pattern
- **ARCH-002:** No direct Supabase calls in components
- **ARCH-003:** React Query for all data fetching
- **ARCH-004:** Shared utilities in lib/
- **ARCH-005:** Reusable components in components/

### 5.2 Code Quality
- **ARCH-006:** DRY (Don't Repeat Yourself)
- **ARCH-007:** SOLID principles
- **ARCH-008:** Functional components only
- **ARCH-009:** Proper TypeScript typing
- **ARCH-010:** JSDoc for public APIs

### 5.3 Error Handling
- **ARCH-011:** Centralized error handling
- **ARCH-012:** User-friendly error messages
- **ARCH-013:** Retry logic with exponential backoff
- **ARCH-014:** Proper error logging

---

## 6. Acceptance Criteria

### 6.1 Authentication
- ✅ Users can sign up and sign in
- ✅ Profiles are created automatically
- ✅ Protected routes work correctly
- ✅ Input validation prevents invalid data

### 6.2 Profiles
- ✅ Users can create and update profiles
- ✅ Photo upload works correctly
- ✅ Age validation (18+) enforced
- ✅ Profile completeness tracked

### 6.3 Duos
- ✅ Users can create duos with friends
- ✅ Duo lookup by email works
- ✅ Duo updates work correctly
- ✅ Join flow works via invite link

### 6.4 Matching
- ✅ Swiping works correctly
- ✅ Matches are created automatically
- ✅ Race conditions handled
- ✅ Real-time match updates

### 6.5 Chat
- ✅ Messages send and receive correctly
- ✅ Pagination works
- ✅ Read receipts tracked
- ✅ Real-time updates work
- ✅ Typing indicators work

### 6.6 Location
- ✅ Location updates work
- ✅ Privacy toggle works
- ✅ Nearby profiles query works (if RPC available)

### 6.7 Routing
- ✅ All routes work correctly
- ✅ Code splitting works
- ✅ Protected routes enforce auth
- ✅ 404 handling works

---

## 7. Known Limitations & Future Enhancements

### 7.1 Current Limitations
- Location RPC function may not be available (client-side fallback)
- No push notifications (future enhancement)
- No offline support (future enhancement)
- Limited test coverage (improvement needed)

### 7.2 Future Enhancements
- Push notifications for matches and messages
- Offline message queuing
- Advanced search/filtering
- Video chat integration
- Group events/activities
- Enhanced analytics

---

## 8. Success Metrics

### 8.1 Technical Metrics
- Build success rate: 100%
- TypeScript errors: 0
- Linter warnings: Minimal
- Test coverage: >80% (target)

### 8.2 User Experience Metrics
- Page load time: < 2 seconds
- Message delivery: Real-time
- Match creation: Automatic
- Error rate: < 1%

---

**Document Status:** ✅ Complete  
**Review Status:** Ready for Quality Review  
**Last Reviewed:** 2024-12-19

