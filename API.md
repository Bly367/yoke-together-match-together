# API Documentation

**Last Updated:** 2024-12-19  
**Version:** 1.0

This document provides comprehensive API documentation for all service functions in the Yoke application. All APIs follow the Service → Hook → Component architecture pattern.

---

## Table of Contents

1. [Authentication Service](#authentication-service)
2. [Profile Service](#profile-service)
3. [Duo Service](#duo-service)
4. [Matching Service](#matching-service)
5. [Chat Service](#chat-service)
6. [Location Service](#location-service)
7. [Storage Service](#storage-service)
8. [Moderation Service](#moderation-service)
9. [Rate Limit Service](#rate-limit-service)

---

## Authentication Service

**File:** `src/services/auth.service.ts`

### `signUp(email: string, password: string, name: string): Promise<UserProfile>`

Creates a new user account and profile.

**Parameters:**
- `email` (string): Valid email address
- `password` (string): Password (8-128 characters)
- `name` (string): User's name (2-100 characters)

**Returns:** `Promise<UserProfile>` - The created user profile

**Throws:**
- `Error` - If email is invalid, password is too short/long, name is invalid, or profile creation fails

**Example:**
```typescript
import { signUp } from '@/services/auth.service';

const profile = await signUp('user@example.com', 'password123', 'John Doe');
```

---

### `signIn(email: string, password: string): Promise<UserProfile>`

Signs in an existing user.

**Parameters:**
- `email` (string): Valid email address
- `password` (string): User's password

**Returns:** `Promise<UserProfile>` - The user's profile

**Throws:**
- `Error` - If email is invalid, password is empty, authentication fails, or profile doesn't exist

**Example:**
```typescript
import { signIn } from '@/services/auth.service';

const profile = await signIn('user@example.com', 'password123');
```

---

### `signOut(): Promise<void>`

Signs out the current user.

**Returns:** `Promise<void>`

**Throws:**
- `Error` - If sign out fails

**Example:**
```typescript
import { signOut } from '@/services/auth.service';

await signOut();
```

---

### `getCurrentUser(): Promise<UserProfile | null>`

Gets the current authenticated user's profile.

**Returns:** `Promise<UserProfile | null>` - The user's profile, or null if not authenticated or profile doesn't exist

**Throws:**
- `Error` - If there's an error fetching the profile (except when profile doesn't exist)

**Example:**
```typescript
import { getCurrentUser } from '@/services/auth.service';

const user = await getCurrentUser();
if (user) {
  console.log('Logged in as:', user.name);
}
```

---

### `updateProfile(profile: Partial<UserProfile>): Promise<UserProfile>`

Updates the current user's profile.

**Parameters:**
- `profile` (Partial<UserProfile>): Partial profile object with fields to update

**Returns:** `Promise<UserProfile>` - The updated profile

**Throws:**
- `Error` - If not authenticated or update fails

**Example:**
```typescript
import { updateProfile } from '@/services/auth.service';

const updated = await updateProfile({
  bio: 'New bio text',
  age: 25,
});
```

---

### `findProfileByEmail(email: string): Promise<Pick<UserProfile, 'id' | 'name' | 'email'> | null>`

Finds a profile by email address.

**Parameters:**
- `email` (string): Valid email address

**Returns:** `Promise<Pick<UserProfile, 'id' | 'name' | 'email'> | null>` - Profile with id, name, and email, or null if not found

**Throws:**
- `Error` - If email is invalid or there's an error fetching

**Example:**
```typescript
import { findProfileByEmail } from '@/services/auth.service';

const profile = await findProfileByEmail('friend@example.com');
if (profile) {
  console.log('Found:', profile.name);
}
```

---

## Duo Service

**File:** `src/services/duo.service.ts`

### `createDuo(member1Id: string, member2Id: string, data: Partial<Duo>): Promise<DuoWithMembers>`

Creates a new duo between two users.

**Parameters:**
- `member1Id` (string): ID of first member
- `member2Id` (string): ID of second member
- `data` (Partial<Duo>): Duo data (name, photo_url, bio, tagline, interests)

**Returns:** `Promise<DuoWithMembers>` - The created duo with member profiles

**Throws:**
- `Error` - If validation fails or creation fails

**Example:**
```typescript
import { createDuo } from '@/services/duo.service';

const duo = await createDuo(userId1, userId2, {
  name: 'Best Friends',
  bio: 'We love hiking!',
});
```

---

### `getUserDuos(userId: string): Promise<DuoWithMembers[]>`

Gets all active duos for a user.

**Parameters:**
- `userId` (string): User ID

**Returns:** `Promise<DuoWithMembers[]>` - Array of duos with member profiles

**Throws:**
- `Error` - If fetch fails

**Example:**
```typescript
import { getUserDuos } from '@/services/duo.service';

const duos = await getUserDuos(userId);
```

---

### `updateDuo(duoId: string, data: Partial<Duo>): Promise<DuoWithMembers>`

Updates a duo's information.

**Parameters:**
- `duoId` (string): Duo ID
- `data` (Partial<Duo>): Fields to update

**Returns:** `Promise<DuoWithMembers>` - Updated duo

**Throws:**
- `Error` - If update fails

**Example:**
```typescript
import { updateDuo } from '@/services/duo.service';

const updated = await updateDuo(duoId, {
  name: 'Updated Name',
  tagline: 'New tagline',
});
```

---

## Matching Service

**File:** `src/services/matching.service.ts`

### `swipeOnDuo(swiperDuoId: string, swipedDuoId: string, action: SwipeAction): Promise<Swipe>`

Records a swipe action (like or pass) on a duo.

**Parameters:**
- `swiperDuoId` (string): ID of the duo doing the swipe
- `swipedDuoId` (string): ID of the duo being swiped
- `action` (SwipeAction): 'like' or 'pass'

**Returns:** `Promise<Swipe>` - The swipe record

**Throws:**
- `Error` - If rate limit exceeded or swipe fails

**Example:**
```typescript
import { swipeOnDuo } from '@/services/matching.service';

const swipe = await swipeOnDuo(myDuoId, otherDuoId, 'like');
```

---

### `getUserMatches(userId: string): Promise<Match[]>`

Gets all matches for a user's duos.

**Parameters:**
- `userId` (string): User ID

**Returns:** `Promise<Match[]>` - Array of matches with metadata (last_message_at, unread_count)

**Throws:**
- `Error` - If fetch fails

**Example:**
```typescript
import { getUserMatches } from '@/services/matching.service';

const matches = await getUserMatches(userId);
```

---

### `checkMatch(duo1Id: string, duo2Id: string, maxRetries?: number, initialDelay?: number): Promise<Match | null>`

Checks if two duos have matched (with retry logic for race conditions).

**Parameters:**
- `duo1Id` (string): First duo ID
- `duo2Id` (string): Second duo ID
- `maxRetries` (number, optional): Maximum retry attempts (default: 5)
- `initialDelay` (number, optional): Initial delay in ms (default: 100)

**Returns:** `Promise<Match | null>` - Match if found, null otherwise

**Throws:**
- `Error` - If check fails (after retries)

**Example:**
```typescript
import { checkMatch } from '@/services/matching.service';

const match = await checkMatch(duo1Id, duo2Id);
if (match) {
  console.log('Matched!');
}
```

---

### `unmatch(matchId: string): Promise<void>`

Deactivates a match.

**Parameters:**
- `matchId` (string): Match ID

**Returns:** `Promise<void>`

**Throws:**
- `Error` - If unmatch fails

**Example:**
```typescript
import { unmatch } from '@/services/matching.service';

await unmatch(matchId);
```

---

## Chat Service

**File:** `src/services/chat.service.ts`

### `sendMessage(matchId: string, senderId: string, content: string, attachment?: Attachment): Promise<Message>`

Sends a message in a match.

**Parameters:**
- `matchId` (string): Match ID
- `senderId` (string): Sender's user ID
- `content` (string): Message content (max 1000 characters, validated and sanitized)
- `attachment` (Attachment, optional): File attachment

**Returns:** `Promise<Message>` - The sent message

**Throws:**
- `Error` - If content validation fails, rate limit exceeded, or send fails

**Example:**
```typescript
import { sendMessage } from '@/services/chat.service';

const message = await sendMessage(matchId, userId, 'Hello!');
```

---

### `getMatchMessages(matchId: string, options?: MessagePaginationOptions): Promise<PaginatedMessages>`

Gets messages for a match with pagination.

**Parameters:**
- `matchId` (string): Match ID
- `options` (MessagePaginationOptions, optional): Pagination options
  - `limit` (number, optional): Messages per page (default: 50)
  - `offset` (number, optional): Offset for pagination (default: 0)

**Returns:** `Promise<PaginatedMessages>` - Paginated messages with hasMore flag

**Throws:**
- `Error` - If fetch fails

**Example:**
```typescript
import { getMatchMessages } from '@/services/chat.service';

const result = await getMatchMessages(matchId, { limit: 50, offset: 0 });
console.log(`Loaded ${result.messages.length} messages, hasMore: ${result.hasMore}`);
```

---

### `editMessage(messageId: string, senderId: string, newContent: string): Promise<Message>`

Edits a message.

**Parameters:**
- `messageId` (string): Message ID
- `senderId` (string): Sender's user ID (for authorization)
- `newContent` (string): New message content

**Returns:** `Promise<Message>` - Updated message

**Throws:**
- `Error` - If not authorized or edit fails

**Example:**
```typescript
import { editMessage } from '@/services/chat.service';

const updated = await editMessage(messageId, userId, 'Updated message');
```

---

### `deleteMessage(messageId: string, senderId: string): Promise<Message>`

Soft deletes a message.

**Parameters:**
- `messageId` (string): Message ID
- `senderId` (string): Sender's user ID (for authorization)

**Returns:** `Promise<Message>` - Deleted message

**Throws:**
- `Error` - If not authorized or delete fails

**Example:**
```typescript
import { deleteMessage } from '@/services/chat.service';

const deleted = await deleteMessage(messageId, userId);
```

---

### `markMessagesAsRead(matchId: string, userId: string, messageIds?: string[]): Promise<void>`

Marks messages as read for a user.

**Parameters:**
- `matchId` (string): Match ID
- `userId` (string): User ID
- `messageIds` (string[], optional): Specific message IDs to mark as read (if not provided, marks all unread)

**Returns:** `Promise<void>`

**Throws:**
- `Error` - If marking as read fails

**Example:**
```typescript
import { markMessagesAsRead } from '@/services/chat.service';

await markMessagesAsRead(matchId, userId);
```

---

## Location Service

**File:** `src/services/location.service.ts`

### `updateUserLocation(userId: string, latitude: number, longitude: number): Promise<void>`

Updates a user's location.

**Parameters:**
- `userId` (string): User ID
- `latitude` (number): Latitude (-90 to 90)
- `longitude` (number): Longitude (-180 to 180)

**Returns:** `Promise<void>`

**Throws:**
- `Error` - If coordinates are invalid, rate limit exceeded, or update fails

**Example:**
```typescript
import { updateUserLocation } from '@/services/location.service';

await updateUserLocation(userId, 37.7749, -122.4194);
```

---

### `getNearbyProfiles(userId: string, latitude: number, longitude: number, radiusKm?: number): Promise<any[]>`

Gets nearby profiles within a radius.

**Parameters:**
- `userId` (string): User ID (to exclude from results)
- `latitude` (number): Center latitude
- `longitude` (number): Center longitude
- `radiusKm` (number, optional): Radius in kilometers (default: 50, max: 1000)

**Returns:** `Promise<any[]>` - Array of nearby profiles with distance

**Throws:**
- `Error` - If coordinates are invalid, radius is invalid, or fetch fails

**Example:**
```typescript
import { getNearbyProfiles } from '@/services/location.service';

const nearby = await getNearbyProfiles(userId, 37.7749, -122.4194, 25);
```

---

### `getCurrentLocation(options?: GeolocationOptions, useCache?: boolean): Promise<{ latitude: number; longitude: number }>`

Gets the user's current location from the browser.

**Parameters:**
- `options` (GeolocationOptions, optional): Geolocation API options
  - `enableHighAccuracy` (boolean, optional): Use high accuracy (default: true)
  - `timeout` (number, optional): Timeout in ms (default: 10000)
  - `maximumAge` (number, optional): Maximum age of cached location in ms (default: 0)
- `useCache` (boolean, optional): Use cached location if available (default: true)

**Returns:** `Promise<{ latitude: number; longitude: number }>` - Location coordinates

**Throws:**
- `Error` - If geolocation is not supported, permission denied, or location unavailable

**Example:**
```typescript
import { getCurrentLocation } from '@/services/location.service';

const location = await getCurrentLocation({ enableHighAccuracy: true });
```

---

### `clearLocationCache(): void`

Clears the cached location data.

**Example:**
```typescript
import { clearLocationCache } from '@/services/location.service';

clearLocationCache();
```

---

## Storage Service

**File:** `src/services/storage.service.ts`

### `uploadPhoto(userId: string, file: File, bucket?: string): Promise<string>`

Uploads a photo to Supabase Storage.

**Parameters:**
- `userId` (string): User ID
- `file` (File): File to upload
- `bucket` (string, optional): Storage bucket name (default: 'photos')

**Returns:** `Promise<string>` - Public URL of uploaded photo

**Throws:**
- `Error` - If file is invalid, upload fails, or bucket doesn't exist

**Example:**
```typescript
import { uploadPhoto } from '@/services/storage.service';

const url = await uploadPhoto(userId, file);
```

---

### `deletePhoto(url: string, bucket?: string): Promise<void>`

Deletes a photo from Supabase Storage.

**Parameters:**
- `url` (string): Public URL of the photo
- `bucket` (string, optional): Storage bucket name (default: 'photos')

**Returns:** `Promise<void>`

**Throws:**
- `Error` - If delete fails

**Example:**
```typescript
import { deletePhoto } from '@/services/storage.service';

await deletePhoto(photoUrl);
```

---

## Moderation Service

**File:** `src/services/moderation.service.ts`

### `validateMessage(content: string): ValidationResult`

Validates and sanitizes message content.

**Parameters:**
- `content` (string): Message content

**Returns:** `ValidationResult` - Validation result with isValid flag and sanitized content

**Example:**
```typescript
import { validateMessage } from '@/services/moderation.service';

const result = validateMessage('Hello!');
if (result.isValid) {
  console.log('Sanitized:', result.sanitized);
}
```

---

## Rate Limit Service

**File:** `src/services/rateLimit.service.ts`

### `checkRateLimit(key: string, limit: RateLimit): RateLimitResult`

Checks if a rate limit has been exceeded.

**Parameters:**
- `key` (string): Rate limit key (usually userId + action type)
- `limit` (RateLimit): Rate limit configuration

**Returns:** `RateLimitResult` - Result with allowed flag and retryAfter seconds

**Example:**
```typescript
import { checkRateLimit, getRateLimitKey, RATE_LIMITS } from '@/services/rateLimit.service';

const key = getRateLimitKey(userId, 'message');
const result = checkRateLimit(key, RATE_LIMITS.MESSAGES);
if (!result.allowed) {
  throw new Error(`Rate limit exceeded. Retry after ${result.retryAfter} seconds.`);
}
```

---

## Type Definitions

### UserProfile
```typescript
interface UserProfile {
  id: string;
  email: string;
  name: string;
  age?: number;
  bio?: string;
  photo_url?: string;
  location?: string | { coordinates: [number, number] };
  location_updated_at?: string;
  location_visible?: boolean;
  created_at: string;
  updated_at: string;
}
```

### SwipeAction
```typescript
type SwipeAction = 'like' | 'pass';
```

### Message
```typescript
interface Message {
  id: string;
  match_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  edited_at?: string;
  deleted_at?: string;
  attachment_url?: string;
  attachment_type?: string;
  attachment_name?: string;
  attachment_size?: number;
  sender?: {
    id: string;
    name: string;
    photo_url?: string;
  };
  read_by?: string[];
}
```

---

## Error Handling

All service functions throw `Error` objects with descriptive messages. Common error scenarios:

- **Validation Errors:** Invalid input parameters
- **Authentication Errors:** User not authenticated or unauthorized
- **Rate Limit Errors:** Too many requests
- **Network Errors:** Supabase connection issues
- **Not Found Errors:** Resource doesn't exist

Always wrap service calls in try-catch blocks:

```typescript
try {
  const result = await someServiceFunction(params);
} catch (error) {
  console.error('Service error:', error.message);
  // Handle error appropriately
}
```

---

## Best Practices

1. **Always validate input** before calling service functions
2. **Handle errors gracefully** with user-friendly messages
3. **Use React Query hooks** instead of calling services directly from components
4. **Respect rate limits** - check rate limits before making requests
5. **Cache results** - Use React Query for automatic caching
6. **Optimistic updates** - Update UI optimistically for better UX

---

**Last Updated:** 2024-12-19  
**Maintained By:** Yoke Development Team

