# Hooks

This directory contains custom React hooks for data fetching and state management.

## Structure

- `useAuth.ts` - Authentication hooks (useAuth, useSignUp, useSignIn)
- `useMatchmaking.ts` - Matchmaking hooks (useDuos, useSwipe, useMatches)
- `useChat.ts` - Chat hooks (useMessages, useSendMessage, useChatSubscription)
- `useProfile.ts` - Profile hooks (useProfile, useUpdateProfile)

## Usage

Hooks are used by components, not services.

```typescript
// In a component
import { useAuth } from '@/hooks/useAuth';

const { user, isLoading, signOut } = useAuth();
```

## Principles

- All hooks use React Query for data fetching
- All hooks return typed data
- All hooks handle loading and error states
- All hooks are composable and reusable
- All hooks use services, not direct Supabase calls

## React Query

We use React Query for:
- Data fetching and caching
- Background updates
- Optimistic updates
- Error handling
- Loading states

