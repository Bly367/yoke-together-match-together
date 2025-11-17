# Rate Limiting Documentation

## Overview

Rate limiting is implemented at **two levels** to ensure both user experience and security:

1. **Client-Side Rate Limiting** - For UX and preventing accidental abuse
2. **Server-Side Rate Limiting** - **REQUIRED** for actual security and abuse prevention

---

## ⚠️ IMPORTANT: Server-Side Rate Limiting is REQUIRED

**Client-side rate limiting is for UX only.** It can be bypassed by:
- Disabling JavaScript
- Modifying client code
- Using API clients directly
- Browser extensions

**Server-side rate limiting MUST be implemented** in one of the following ways:

### Option 1: Supabase Edge Functions (Recommended)
Implement rate limiting in Supabase Edge Functions that wrap your database operations.

### Option 2: Database Triggers
Use PostgreSQL triggers to enforce rate limits at the database level.

### Option 3: Reverse Proxy/CDN
Configure rate limiting at the infrastructure level (e.g., Cloudflare, AWS API Gateway).

---

## Current Client-Side Limits

The following rate limits are enforced client-side via `src/services/rateLimit.service.ts`:

| Action | Limit | Window | Purpose |
|--------|-------|--------|---------|
| **Swipes** | 100 | 1 minute | Prevent accidental spam swiping |
| **Messages** | 30 | 1 minute | Prevent message spam |
| **Location Updates** | 10 | 1 minute | Prevent excessive location tracking |

### Rate Limit Configuration

```typescript
// src/services/rateLimit.service.ts
export const RATE_LIMITS = {
  SWIPES: { maxRequests: 100, windowMs: 60 * 1000 },      // 100 per minute
  MESSAGES: { maxRequests: 30, windowMs: 60 * 1000 },    // 30 per minute
  LOCATION_UPDATES: { maxRequests: 10, windowMs: 60 * 1000 }, // 10 per minute
};
```

---

## Implementation Details

### Client-Side Rate Limiting

**Location:** `src/services/rateLimit.service.ts`

**How it works:**
1. Tracks request timestamps in memory (Map-based store)
2. Checks if action is allowed based on time window
3. Returns `{ allowed: boolean, retryAfter?: number }`

**Usage:**
```typescript
import { checkRateLimit, getRateLimitKey, RATE_LIMITS } from '@/services/rateLimit.service';

const rateLimitKey = getRateLimitKey(userId, 'swipe');
const check = checkRateLimit(rateLimitKey, RATE_LIMITS.SWIPES);

if (!check.allowed) {
  throw new Error(`Rate limit exceeded. Please wait ${check.retryAfter} seconds.`);
}
```

**Limitations:**
- ✅ Prevents accidental abuse
- ✅ Improves UX (prevents spam)
- ❌ **NOT SECURE** - Can be bypassed
- ❌ Resets on page refresh
- ❌ Not shared across devices/sessions

---

## Server-Side Implementation Guide

### Recommended: Supabase Edge Functions

Create an Edge Function that wraps database operations:

```typescript
// supabase/functions/rate-limited-action/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RATE_LIMITS = {
  swipes: { max: 100, window: 60 },      // 100 per minute
  messages: { max: 30, window: 60 },    // 30 per minute
  location: { max: 10, window: 60 },    // 10 per minute
};

serve(async (req) => {
  const { userId, action } = await req.json();
  
  // Check rate limit in Redis or database
  const count = await getActionCount(userId, action, RATE_LIMITS[action].window);
  
  if (count >= RATE_LIMITS[action].max) {
    return new Response(
      JSON.stringify({ error: 'Rate limit exceeded' }),
      { status: 429, headers: { 'Retry-After': '60' } }
    );
  }
  
  // Increment counter
  await incrementActionCount(userId, action);
  
  // Proceed with action
  // ...
});
```

### Alternative: Database-Level Rate Limiting

Use PostgreSQL functions with rate limiting:

```sql
-- Example: Rate-limited swipe function
CREATE OR REPLACE FUNCTION rate_limited_swipe(
  swiper_duo_id UUID,
  swiped_duo_id UUID,
  action TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  swipe_count INTEGER;
  window_start TIMESTAMP;
BEGIN
  -- Check rate limit (last 60 seconds)
  window_start := NOW() - INTERVAL '60 seconds';
  
  SELECT COUNT(*) INTO swipe_count
  FROM swipes
  WHERE swiper_duo_id = rate_limited_swipe.swiper_duo_id
    AND created_at > window_start;
  
  IF swipe_count >= 100 THEN
    RETURN jsonb_build_object(
      'error', 'Rate limit exceeded',
      'retry_after', 60
    );
  END IF;
  
  -- Proceed with swipe
  -- ...
END;
$$;
```

---

## Rate Limit Headers

When implementing server-side rate limiting, include these HTTP headers:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
Retry-After: 60
```

---

## Exponential Backoff

For client-side retries, implement exponential backoff:

```typescript
async function retryWithBackoff(fn: () => Promise<any>, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (error.status === 429) {
        const delay = Math.min(1000 * 2 ** i, 30000); // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
}
```

---

## Monitoring & Alerts

**Recommended:** Set up monitoring for rate limit violations:

1. **Alert on high violation rates** - May indicate abuse or misconfiguration
2. **Track rate limit metrics** - Monitor usage patterns
3. **Adjust limits based on data** - Optimize for actual usage

---

## Best Practices

1. ✅ **Always implement server-side rate limiting**
2. ✅ **Use client-side limits for UX only**
3. ✅ **Return clear error messages** with retry-after times
4. ✅ **Log rate limit violations** for security monitoring
5. ✅ **Adjust limits based on actual usage patterns**
6. ✅ **Consider different limits for authenticated vs anonymous users**
7. ✅ **Implement exponential backoff** for retries

---

## References

- [OWASP Rate Limiting Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Rate_Limiting_Cheat_Sheet.html)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [PostgreSQL Rate Limiting Patterns](https://www.postgresql.org/docs/current/functions-admin.html)

---

**Last Updated:** 2024-12-19  
**Status:** Client-side implemented ✅ | Server-side **REQUIRED** ⚠️

