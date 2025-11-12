# Services

This directory contains service functions for Supabase operations.

## Structure

- `auth.service.ts` - Authentication operations (sign up, sign in, sign out)
- `matching.service.ts` - Matching operations (create duo, swipe, get matches)
- `chat.service.ts` - Chat operations (send message, get messages, subscribe)
- `storage.service.ts` - Storage operations (upload photo, delete photo, get URL)
- `profile.service.ts` - Profile operations (get profile, update profile)

## Usage

Services are used by hooks, not directly by components.

```typescript
// In a hook
import { signUp } from '@/services/auth.service';

const { mutate } = useMutation({
  mutationFn: signUp,
  onSuccess: (data) => {
    // Handle success
  },
});
```

## Principles

- All services return typed data
- All services handle errors (throw or return error objects)
- All services are pure functions (no side effects except API calls)
- All services use the Supabase client from `@/integrations/supabase/client`

