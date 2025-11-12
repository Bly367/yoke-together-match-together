# Architecture Documentation

**Last Updated:** 2024-12-19  
**Version:** 1.0

This document describes the architecture of the Yoke application, including system design, data flow, component structure, and architectural decisions.

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Architecture Pattern](#architecture-pattern)
3. [Data Flow](#data-flow)
4. [Component Structure](#component-structure)
5. [Technology Stack](#technology-stack)
6. [Key Architectural Decisions](#key-architectural-decisions)

---

## System Overview

Yoke is a React-based single-page application (SPA) that connects to Supabase for backend services. The application follows a layered architecture with clear separation of concerns.

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (React)                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐             │
│  │ Pages    │  │ Hooks    │  │ Services │             │
│  │ (UI)     │→ │ (State)  │→ │ (API)    │             │
│  └──────────┘  └──────────┘  └──────────┘             │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ↓
┌─────────────────────────────────────────────────────────┐
│              Supabase Backend Services                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐             │
│  │ Auth     │  │ Database │  │ Storage  │             │
│  │          │  │ (PG)     │  │          │             │
│  └──────────┘  └──────────┘  └──────────┘             │
│  ┌──────────┐                                         │
│  │ Realtime │                                         │
│  │ (WS)     │                                         │
│  └──────────┘                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Architecture Pattern

### Service → Hook → Component Pattern

The application follows a strict three-layer architecture:

1. **Service Layer** (`src/services/`): Pure functions that interact with Supabase
2. **Hook Layer** (`src/hooks/`): React hooks that wrap services with React Query
3. **Component Layer** (`src/pages/`, `src/components/`): UI components that use hooks

### Why This Pattern?

- **Separation of Concerns**: Each layer has a single responsibility
- **Testability**: Services can be tested independently
- **Reusability**: Services and hooks can be reused across components
- **Type Safety**: TypeScript ensures type safety across layers
- **Caching**: React Query provides automatic caching and synchronization

---

## Data Flow

### Request Flow (User Action → API)

```
User Action (Click, Form Submit)
    ↓
Component Event Handler
    ↓
Hook Mutation/Query
    ↓
Service Function
    ↓
Supabase Client
    ↓
Supabase Backend (Auth/Database/Storage)
```

### Response Flow (API → UI Update)

```
Supabase Backend Response
    ↓
Service Function Returns Data
    ↓
React Query Updates Cache
    ↓
Hook Returns Data/State
    ↓
Component Re-renders with New Data
    ↓
UI Updates
```

### Real-Time Updates Flow

```
Supabase Realtime Event
    ↓
Supabase Client Subscription
    ↓
Service Subscription Callback
    ↓
React Query Cache Invalidation/Update
    ↓
Hook Returns Updated Data
    ↓
Component Re-renders
    ↓
UI Updates Automatically
```

---

## Component Structure

### Directory Structure

```
src/
├── components/          # Reusable UI components
│   ├── ui/             # shadcn/ui components (48 components)
│   ├── BottomNavigation.tsx
│   ├── PhotoUpload.tsx
│   ├── MessageBubble.tsx
│   └── ...
├── hooks/              # Custom React hooks
│   ├── useAuth.ts
│   ├── useChat.ts
│   ├── useMatching.ts
│   └── ...
├── services/           # Service functions
│   ├── auth.service.ts
│   ├── chat.service.ts
│   ├── matching.service.ts
│   └── ...
├── lib/                # Utility functions
│   ├── utils.ts
│   ├── routes.ts
│   └── profileCompleteness.ts
├── pages/              # Page components
│   ├── Auth.tsx
│   ├── Matchmaking.tsx
│   ├── Chat.tsx
│   └── ...
└── integrations/       # External integrations
    └── supabase/
        ├── client.ts
        └── types.ts
```

### Component Hierarchy

```
App
├── QueryClientProvider
├── BrowserRouter
│   └── Routes
│       ├── Index (Landing)
│       ├── Auth
│       ├── ProfileSetup (Protected)
│       ├── DuoSetup (Protected)
│       ├── Matchmaking (Protected)
│       ├── Matches (Protected)
│       ├── Messages (Protected)
│       ├── Chat/:matchId (Protected)
│       └── Profile (Protected)
└── BottomNavigation (on protected routes)
```

---

## Technology Stack

### Frontend

- **React 18**: UI library
- **TypeScript**: Type safety
- **React Router v6**: Routing
- **React Query (TanStack Query)**: Data fetching and caching
- **Tailwind CSS**: Styling
- **shadcn/ui**: UI component library
- **Vite**: Build tool

### Backend (Supabase)

- **PostgreSQL**: Database
- **Supabase Auth**: Authentication
- **Supabase Storage**: File storage
- **Supabase Realtime**: WebSocket subscriptions
- **PostGIS**: Location services (optional)

---

## Key Architectural Decisions

### 1. No Direct Supabase Calls in Components

**Decision**: Components never call Supabase directly. All data operations go through services.

**Rationale**: 
- Easier to test
- Consistent error handling
- Centralized data logic
- Better type safety

**Example:**
```typescript
// ❌ Bad: Direct Supabase call in component
const { data } = await supabase.from('profiles').select();

// ✅ Good: Use service
const profile = await getCurrentUser();
```

### 2. React Query for All Data Fetching

**Decision**: All data fetching uses React Query hooks.

**Rationale**:
- Automatic caching
- Background refetching
- Optimistic updates
- Loading/error states

**Example:**
```typescript
// Service
export async function getUserMatches(userId: string) { ... }

// Hook
export function useMatches() {
  return useQuery({
    queryKey: ['matches', userId],
    queryFn: () => getUserMatches(userId),
  });
}

// Component
const { data: matches, isLoading } = useMatches();
```

### 3. Lazy Loading for Routes

**Decision**: All page components are lazy-loaded.

**Rationale**:
- Smaller initial bundle
- Faster initial load
- Better code splitting

**Example:**
```typescript
const Matchmaking = lazy(() => import('./pages/Matchmaking'));
```

### 4. Centralized Route Constants

**Decision**: All routes defined in `lib/routes.ts`.

**Rationale**:
- Single source of truth
- Easy refactoring
- Type safety
- No magic strings

### 5. Service Functions Are Pure

**Decision**: Service functions are pure functions (no side effects except API calls).

**Rationale**:
- Easier to test
- Predictable behavior
- No hidden dependencies

### 6. Error Handling at Service Layer

**Decision**: Services throw errors, hooks handle them, components display them.

**Rationale**:
- Consistent error handling
- User-friendly error messages
- Proper error propagation

---

## Data Models

### Core Entities

1. **User/Profile**: User account and profile information
2. **Duo**: Pair of users who create a joint profile
3. **Swipe**: Like/pass action on a duo
4. **Match**: Mutual like between two duos
5. **Message**: Chat message in a match

### Relationships

```
User (1) ──< (2) Duo
Duo (1) ──< (*) Swipe
Duo (2) ──< (1) Match
Match (1) ──< (*) Message
```

---

## Security Architecture

### Authentication Flow

1. User signs up/signs in via `auth.service.ts`
2. Supabase Auth creates session
3. Session stored in browser (httpOnly cookie)
4. Protected routes check session via `useAuth` hook
5. API calls include session token automatically

### Authorization

- **Row Level Security (RLS)**: Database-level security policies
- **Service-Level Validation**: Services validate user permissions
- **Component-Level Guards**: ProtectedRoute component

### Data Privacy

- Location privacy toggle (`location_visible`)
- Profile visibility controls
- Message read receipts
- Soft deletes for messages

---

## Performance Optimizations

### Code Splitting

- Route-based code splitting (lazy loading)
- Component-level splitting for large components

### Caching

- React Query automatic caching
- Location caching (localStorage)
- Route prefetching on hover

### Optimization Techniques

- Virtualized lists for long lists
- Memoization for expensive computations
- Optimistic updates for better UX
- Batch processing for location filtering

---

## Real-Time Architecture

### WebSocket Subscriptions

- **Matches**: Real-time match notifications
- **Messages**: Real-time message delivery
- **Typing Indicators**: Real-time typing status

### Subscription Pattern

```typescript
// Service creates subscription
const unsubscribe = subscribeToMessages(matchId, (message) => {
  // Update React Query cache
  queryClient.setQueryData(['messages', matchId], (old) => [...old, message]);
});

// Cleanup on unmount
useEffect(() => {
  return () => unsubscribe();
}, []);
```

---

## Testing Strategy

### Unit Tests

- Service functions (pure functions, easy to test)
- Utility functions
- Type guards and validators

### Integration Tests

- Hook behavior with React Query
- Component rendering with hooks
- API integration

### E2E Tests

- User flows (sign up, create duo, match, chat)
- Error scenarios
- Edge cases

---

## Deployment Architecture

### Build Process

1. TypeScript compilation
2. Vite bundling
3. Code splitting
4. Asset optimization
5. Static file generation

### Environment Variables

- `VITE_SUPABASE_URL`: Supabase project URL
- `VITE_SUPABASE_PUBLISHABLE_KEY`: Supabase anonymous key

### Hosting

- Static files can be hosted on any CDN
- No server required (Supabase handles backend)
- Environment variables injected at build time

---

## Future Architecture Considerations

### Potential Improvements

1. **Service Workers**: Offline support, caching
2. **Web Workers**: Heavy computations (location filtering)
3. **GraphQL**: If API complexity grows
4. **Microservices**: If backend needs to scale
5. **CDN**: For static assets and images

### Scalability

- Current architecture scales horizontally (stateless frontend)
- Supabase handles backend scaling
- Database can be optimized with indexes
- Caching reduces database load

---

**Last Updated:** 2024-12-19  
**Maintained By:** Yoke Development Team

