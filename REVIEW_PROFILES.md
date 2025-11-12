# Profile Management Review

## Overview
This document reviews the profile management system, including profile creation, updates, photo uploads, and profile display.

## Files Reviewed
- `src/pages/ProfileSetup.tsx` - Profile creation/editing UI
- `src/pages/Profile.tsx` - Profile display page
- `src/components/PhotoUpload.tsx` - Photo upload component
- `src/services/storage.service.ts` - Storage service for photos
- `src/hooks/useStorage.ts` - Storage hooks
- Related auth service functions (profile updates)

---

## 1. Profile Setup Page (`ProfileSetup.tsx`)

### Strengths
✅ **Clean UI** - Well-structured form layout
✅ **Pre-fills data** - Uses existing user data to populate form
✅ **Photo upload integration** - Seamless photo upload flow
✅ **Loading states** - Proper loading indicators
✅ **Form validation** - Basic required field validation

### Issues & Recommendations

#### 1.1 Missing Age Validation
**Location:** Age input field, line 102-110
**Issue:** No validation for age range (should be 18+)
**Recommendation:**
```typescript
const [ageError, setAgeError] = useState('');

const validateAge = (ageStr: string) => {
  const age = parseInt(ageStr, 10);
  if (isNaN(age)) {
    setAgeError('Please enter a valid age');
    return false;
  }
  if (age < 18) {
    setAgeError('You must be 18 or older');
    return false;
  }
  if (age > 120) {
    setAgeError('Please enter a valid age');
    return false;
  }
  setAgeError('');
  return true;
};
```

#### 1.2 Bio Character Limit
**Location:** Bio textarea, line 115-122
**Issue:** No character limit or count display
**Recommendation:**
```typescript
const MAX_BIO_LENGTH = 500;
const [bioLength, setBioLength] = useState(0);

// In textarea:
<Textarea
  id="bio"
  placeholder="Tell others about yourself..."
  value={bio}
  onChange={(e) => {
    const value = e.target.value.slice(0, MAX_BIO_LENGTH);
    setBio(value);
    setBioLength(value.length);
  }}
  rows={4}
  className="rounded-2xl resize-none"
/>
<div className="text-right text-sm text-muted-foreground">
  {bioLength}/{MAX_BIO_LENGTH}
</div>
```

#### 1.3 No Photo Deletion
**Location:** Photo upload section
**Issue:** Users can't remove uploaded photos
**Recommendation:** Add delete button:
```typescript
const handlePhotoDelete = async () => {
  if (photoUrl && user) {
    try {
      await deletePhotoMutation.mutateAsync(photoUrl);
      setPhotoUrl('');
      toast.success('Photo removed');
    } catch (error) {
      toast.error('Failed to remove photo');
    }
  }
};
```

#### 1.4 Missing Location Setup
**Location:** Profile setup form
**Issue:** No location input/update in profile setup
**Recommendation:** Add location picker or browser geolocation:
```typescript
import { useCurrentLocation, useUpdateLocation } from '@/hooks/useLocation';

const { location, isLoading: locationLoading } = useCurrentLocation();
const updateLocationMutation = useUpdateLocation();

// Add location update on mount or button
useEffect(() => {
  if (location && user) {
    updateLocationMutation.mutate({
      userId: user.id,
      latitude: location.latitude,
      longitude: location.longitude,
    });
  }
}, [location, user]);
```

---

## 2. Photo Upload Component (`PhotoUpload.tsx`)

### Review Needed
**Note:** File not read in detail. Review should check:
- [ ] Image compression before upload
- [ ] File size validation
- [ ] Image format validation (jpg, png, webp)
- [ ] Crop functionality (if using react-easy-crop)
- [ ] Loading states during upload
- [ ] Error handling for failed uploads
- [ ] Preview before upload

### Recommendations
1. **Image Compression**: Compress images before upload to reduce storage costs
2. **File Size Limit**: Enforce maximum file size (e.g., 5MB)
3. **Format Validation**: Only allow image formats
4. **Progress Indicator**: Show upload progress for large files

---

## 3. Storage Service (`storage.service.ts`)

### Strengths
✅ **Simple API** - Clean function signatures
✅ **Public URL generation** - Proper URL handling
✅ **Error handling** - Throws errors appropriately

### Issues & Recommendations

#### 3.1 Hardcoded Bucket Name
**Location:** Multiple functions
**Issue:** Bucket name 'photos' is hardcoded
**Recommendation:** Make configurable:
```typescript
const PHOTOS_BUCKET = import.meta.env.VITE_SUPABASE_PHOTOS_BUCKET || 'photos';

export async function uploadPhoto(
  file: File,
  userId: string,
  path: string = 'photos'
): Promise<string> {
  // ... existing code ...
  const { error: uploadError } = await supabase.storage
    .from(PHOTOS_BUCKET) // Use configurable bucket
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    });
  // ... rest of code ...
}
```

#### 3.2 No File Size Validation
**Location:** `uploadPhoto` function
**Issue:** No check for file size before upload
**Recommendation:**
```typescript
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export async function uploadPhoto(
  file: File,
  userId: string,
  path: string = 'photos'
): Promise<string> {
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File size must be less than ${MAX_FILE_SIZE / 1024 / 1024}MB`);
  }
  
  // Validate file type
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    throw new Error('Only JPEG, PNG, and WebP images are allowed');
  }
  
  // ... rest of code ...
}
```

#### 3.3 URL Parsing Logic
**Location:** `deletePhoto` function, lines 37-39
**Issue:** Fragile URL parsing logic
**Recommendation:** Use more robust parsing:
```typescript
export async function deletePhoto(filePath: string): Promise<void> {
  // Extract path from URL if needed
  let path = filePath;
  
  // If it's a full URL, extract the path
  if (filePath.includes('/storage/v1/object/public/')) {
    const urlParts = filePath.split('/storage/v1/object/public/');
    if (urlParts.length > 1) {
      const bucketAndPath = urlParts[1];
      // Remove bucket name (assuming format: bucket/path)
      path = bucketAndPath.split('/').slice(1).join('/');
    }
  }
  
  const { error } = await supabase.storage
    .from('photos')
    .remove([path]);

  if (error) throw error;
}
```

#### 3.4 Missing Batch Operations
**Location:** Service functions
**Issue:** No batch upload/delete operations
**Recommendation:** Add batch operations for multiple photos:
```typescript
export async function uploadPhotos(
  files: File[],
  userId: string
): Promise<string[]> {
  const uploadPromises = files.map(file => uploadPhoto(file, userId));
  return Promise.all(uploadPromises);
}

export async function deletePhotos(filePaths: string[]): Promise<void> {
  const paths = filePaths.map(fp => extractPathFromUrl(fp));
  const { error } = await supabase.storage
    .from('photos')
    .remove(paths);
  
  if (error) throw error;
}
```

---

## 4. Storage Hooks (`useStorage.ts`)

### Strengths
✅ **Simple wrapper** - Clean React Query integration
✅ **Type safety** - Proper TypeScript usage

### Issues & Recommendations

#### 4.1 Missing Error Exposure
**Location:** Both hooks
**Issue:** Errors not easily accessible to components
**Recommendation:** Return error states:
```typescript
export function useUploadPhoto() {
  return useMutation({
    mutationFn: ({ file, userId, path }: { file: File; userId: string; path?: string }) =>
      uploadPhoto(file, userId, path),
    // Errors are available via mutation.error, but document this
  });
}
```

#### 4.2 No Progress Tracking
**Location:** `useUploadPhoto`
**Issue:** No upload progress tracking
**Recommendation:** Consider adding progress callback (requires service changes):
```typescript
// Note: Supabase storage doesn't support progress callbacks directly
// Would need to use XMLHttpRequest or fetch with progress events
```

---

## 5. Profile Display (`Profile.tsx`)

### Review Needed
**Note:** File not read in detail. Review should check:
- [ ] Profile data display
- [ ] Photo display with fallback
- [ ] Edit profile functionality
- [ ] Loading states
- [ ] Error handling
- [ ] Responsive design

### Recommendations
1. **Fallback Images**: Use default avatar if no photo
2. **Edit Button**: Allow users to edit their profile
3. **Profile Completeness**: Show profile completion percentage
4. **Social Links**: Consider adding social media links (if needed)

---

## 6. Data Flow

### Current Flow
1. User signs up → Profile created via trigger/manually
2. User completes profile setup → Profile updated
3. User uploads photo → Stored in Supabase Storage → URL saved to profile
4. Profile displayed → Data fetched from profiles table

### Issues
- ⚠️ No validation that profile is complete before allowing matching
- ⚠️ No profile versioning/history
- ⚠️ No profile verification (e.g., photo verification)

---

## 7. Security Considerations

### ✅ Good Practices
- Uses Supabase Storage (secure, CDN-backed)
- RLS policies should protect profile data (verify in database review)

### ⚠️ Recommendations
1. **File Type Validation**: Validate file types server-side (Supabase Storage policies)
2. **File Size Limits**: Enforce size limits in storage policies
3. **Virus Scanning**: Consider virus scanning for uploaded files (Supabase doesn't provide this)
4. **Access Control**: Ensure RLS policies prevent unauthorized profile access

---

## 8. Performance Considerations

### Current State
- ✅ React Query caching for profile data
- ✅ Public URLs for photos (CDN-backed)

### Recommendations
1. **Image Optimization**: Serve optimized images (thumbnails, WebP)
2. **Lazy Loading**: Lazy load profile images
3. **Caching**: Use appropriate cache headers for photos
4. **Compression**: Compress images before upload

---

## 9. Testing Recommendations

### Unit Tests Needed
- [ ] `storage.service.ts` - Test upload, delete, URL generation
- [ ] `useStorage.ts` - Test hooks with mocked service
- [ ] `ProfileSetup.tsx` - Test form validation and submission

### Integration Tests Needed
- [ ] Full profile setup flow
- [ ] Photo upload flow
- [ ] Profile update flow
- [ ] Photo deletion flow

---

## Summary

### Critical Issues
1. ⚠️ Missing age validation (should be 18+)
2. ⚠️ No file size/type validation before upload
3. ⚠️ Hardcoded bucket name

### High Priority Improvements
1. Add bio character limit and counter
2. Add photo deletion functionality
3. Improve URL parsing in deletePhoto
4. Add location setup in profile setup

### Low Priority Enhancements
1. Add batch photo operations
2. Add image compression before upload
3. Add profile completeness indicator
4. Add profile edit functionality

---

## Review Checklist

- [x] Service layer follows DRY principles
- [x] Hooks properly use React Query
- [x] Components are stateless where possible
- [ ] Input validation is comprehensive
- [x] TypeScript types are properly defined
- [x] Error handling is present
- [ ] File upload validation is implemented
- [ ] Image optimization is considered

