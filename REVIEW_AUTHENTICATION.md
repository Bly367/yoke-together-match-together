# Authentication & Authorization Review

## Overview
This document reviews the authentication and authorization system of the Yoke application, including user sign-up, sign-in, profile management, and route protection.

## Files Reviewed
- `src/services/auth.service.ts` - Core authentication service functions
- `src/hooks/useAuth.ts` - React hooks for authentication
- `src/pages/Auth.tsx` - Authentication UI page
- `src/components/ProtectedRoute.tsx` - Route protection component

---

## 1. Service Layer (`auth.service.ts`)

### Strengths
✅ **Comprehensive error handling** - Provides helpful error messages for common issues (missing schema, RLS violations)
✅ **Profile creation logic** - Handles both trigger-based and manual profile creation
✅ **Type safety** - Well-defined `UserProfile` interface
✅ **JSDoc comments** - All public functions are documented

### Issues & Recommendations

#### 1.1 Profile Creation Race Condition
**Location:** Lines 36-96
**Issue:** Uses `setTimeout(500)` to wait for database trigger, which is unreliable
**Recommendation:**
```typescript
// Instead of setTimeout, use retry logic with exponential backoff
async function waitForProfile(userId: string, maxRetries = 5): Promise<UserProfile | null> {
  for (let i = 0; i < maxRetries; i++) {
    const { data, error } = await supabase
      .from('profiles')
      .select()
      .eq('id', userId)
      .single();
    
    if (data && !error) return data;
    if (error?.code !== 'PGRST116') throw error;
    
    await new Promise(resolve => setTimeout(resolve, 100 * Math.pow(2, i)));
  }
  return null;
}
```

#### 1.2 Duplicate Error Handling
**Location:** Multiple functions (signUp, signIn, getCurrentUser)
**Issue:** Same error handling code repeated across functions
**Recommendation:** Extract to shared helper:
```typescript
function handleProfileError(error: PostgrestError): never {
  if (error.code === '42P01' || error.message.includes('does not exist')) {
    throw new Error('Database schema not applied. Please apply the database schema in Supabase SQL Editor. See SETUP_INSTRUCTIONS.md for details.');
  }
  if (error.code === '42501' || error.message.includes('row-level security')) {
    throw new Error('RLS policy violation. Please run scripts/create-profile-trigger.sql to automatically create profiles, or run scripts/fix-rls-policies.sql to fix RLS policies.');
  }
  throw error;
}
```

#### 1.3 Missing Input Validation
**Location:** `signUp`, `signIn`, `updateProfile`
**Issue:** No validation for email format, password strength, or age range
**Recommendation:** Add validation using Zod or similar:
```typescript
import { z } from 'zod';

const emailSchema = z.string().email();
const passwordSchema = z.string().min(8);
const ageSchema = z.number().int().min(18).max(120);
```

---

## 2. Hooks Layer (`useAuth.ts`)

### Strengths
✅ **React Query integration** - Proper use of React Query for caching and state management
✅ **Clear separation** - Separate hooks for sign-up, sign-in, and profile updates
✅ **Query invalidation** - Proper cache invalidation on mutations

### Issues & Recommendations

#### 2.1 Missing Error Handling in Hooks
**Location:** All hooks
**Issue:** Errors are not exposed to components, making error handling difficult
**Recommendation:** Expose error states:
```typescript
export function useAuth() {
  // ... existing code ...
  return {
    user,
    isLoading,
    error, // Already exposed, but ensure components use it
    isAuthenticated: !!user,
    signOut: signOutMutation.mutate,
    isSigningOut: signOutMutation.isPending,
    signOutError: signOutMutation.error, // Add this
  };
}
```

#### 2.2 No Retry Logic
**Location:** `useAuth` hook, line 18
**Issue:** `retry: false` means failed auth checks won't retry
**Recommendation:** Consider retry with exponential backoff for network errors:
```typescript
const { data: user, isLoading, error } = useQuery({
  queryKey: CURRENT_USER_KEY,
  queryFn: getCurrentUser,
  retry: (failureCount, error) => {
    // Don't retry on auth errors (401, 403)
    if (error?.message?.includes('Not authenticated')) return false;
    return failureCount < 3;
  },
  retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
});
```

---

## 3. UI Layer (`Auth.tsx`)

### Strengths
✅ **Clean UI** - Well-structured form with good UX
✅ **Loading states** - Proper loading indicators
✅ **Toast notifications** - User feedback for actions
✅ **Form validation** - Basic validation for required fields

### Issues & Recommendations

#### 3.1 Password Strength Indicator
**Location:** Password input field
**Issue:** No password strength feedback
**Recommendation:** Add password strength meter:
```typescript
const [passwordStrength, setPasswordStrength] = useState(0);

useEffect(() => {
  // Calculate password strength
  let strength = 0;
  if (password.length >= 8) strength++;
  if (/[A-Z]/.test(password)) strength++;
  if (/[a-z]/.test(password)) strength++;
  if (/[0-9]/.test(password)) strength++;
  if (/[^A-Za-z0-9]/.test(password)) strength++;
  setPasswordStrength(strength);
}, [password]);
```

#### 3.2 Email Validation
**Location:** Email input field
**Issue:** Only HTML5 validation, no custom validation feedback
**Recommendation:** Add real-time email validation:
```typescript
const [emailError, setEmailError] = useState('');

const validateEmail = (email: string) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    setEmailError('Please enter a valid email address');
  } else {
    setEmailError('');
  }
};
```

#### 3.3 Error Display
**Location:** Error handling in `handleAuth`
**Issue:** Generic error messages, no field-specific errors
**Recommendation:** Display field-specific errors:
```typescript
const [errors, setErrors] = useState<Record<string, string>>({});

// In catch block:
if (error.message.includes('email')) {
  setErrors({ email: 'This email is already registered' });
} else if (error.message.includes('password')) {
  setErrors({ password: 'Invalid password' });
}
```

---

## 4. Route Protection (`ProtectedRoute.tsx`)

### Strengths
✅ **Simple and effective** - Clear redirect logic
✅ **Loading state** - Shows loading while checking auth
✅ **Configurable redirect** - Allows custom redirect path

### Issues & Recommendations

#### 4.1 Flash of Unauthenticated Content
**Location:** Component render logic
**Issue:** Brief flash before redirect
**Recommendation:** Already handled well with loading state, but could add:
```typescript
if (!user && !isLoading) {
  return null; // Prevents flash
}
```

#### 4.2 No Redirect Back After Auth
**Location:** Redirect logic
**Issue:** After login, user doesn't return to originally requested page
**Recommendation:** Store intended destination:
```typescript
useEffect(() => {
  if (!isLoading && !user) {
    // Store current location for redirect after login
    sessionStorage.setItem('redirectAfterAuth', window.location.pathname);
    navigate(redirectTo);
  }
}, [user, isLoading, navigate, redirectTo]);
```

---

## 5. Security Considerations

### ✅ Good Practices
- Uses Supabase Auth (secure, industry-standard)
- Protected routes prevent unauthorized access
- Session persistence handled by Supabase

### ⚠️ Recommendations
1. **Password Requirements**: Enforce minimum password strength
2. **Rate Limiting**: Consider rate limiting for auth endpoints (handled by Supabase)
3. **Session Management**: Consider adding session timeout warnings
4. **CSRF Protection**: Ensure Supabase handles CSRF (it does by default)

---

## 6. Testing Recommendations

### Unit Tests Needed
- [ ] `auth.service.ts` - Test all functions with mocked Supabase
- [ ] `useAuth.ts` - Test hooks with React Query test utilities
- [ ] `ProtectedRoute.tsx` - Test redirect logic

### Integration Tests Needed
- [ ] Full sign-up flow
- [ ] Sign-in flow
- [ ] Profile update flow
- [ ] Route protection

---

## 7. Performance Considerations

### Current State
- ✅ React Query caching reduces unnecessary API calls
- ✅ Query invalidation keeps data fresh

### Recommendations
1. **Optimistic Updates**: Consider optimistic updates for profile changes
2. **Prefetching**: Prefetch user profile on app load
3. **Debouncing**: Debounce profile update mutations

---

## Summary

### Critical Issues
1. ⚠️ Race condition in profile creation (use retry logic instead of setTimeout)
2. ⚠️ Duplicate error handling code (extract to shared helper)
3. ⚠️ Missing input validation (add Zod schemas)

### High Priority Improvements
1. Add password strength indicator
2. Improve error messages (field-specific)
3. Add redirect back after login

### Low Priority Enhancements
1. Add retry logic for auth queries
2. Add optimistic updates for profile changes
3. Add session timeout warnings

---

## Review Checklist

- [x] Service layer follows DRY principles
- [x] Hooks properly use React Query
- [x] Components are stateless where possible
- [x] Error handling is comprehensive
- [ ] Input validation is implemented
- [x] TypeScript types are properly defined
- [x] JSDoc comments are present
- [ ] Tests are written (not reviewed, assume needed)

