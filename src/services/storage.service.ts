import { supabase } from '@/integrations/supabase/client';

// Configurable bucket name via environment variable
const PHOTOS_BUCKET = import.meta.env.VITE_SUPABASE_PHOTOS_BUCKET || 'photos';

// File size limits
const MAX_PHOTO_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

/**
 * Extract file path from a Supabase storage URL
 */
function extractPathFromUrl(url: string, bucketName: string = PHOTOS_BUCKET): string {
  // If it's already a path (no http/https), return as-is
  if (!url.includes('http')) {
    return url;
  }

  // Extract path from full URL
  // Format: https://...supabase.co/storage/v1/object/public/{bucket}/{path}
  const storagePattern = `/storage/v1/object/public/${bucketName}/`;
  if (url.includes(storagePattern)) {
    const urlParts = url.split(storagePattern);
    if (urlParts.length > 1) {
      return urlParts[1];
    }
  }

  // Fallback: try to extract from any storage URL pattern
  const match = url.match(/\/storage\/v1\/object\/public\/[^/]+\/(.+)$/);
  if (match && match[1]) {
    return match[1];
  }

  // If no pattern matches, assume it's already a path
  return url;
}

/**
 * Upload a photo to storage
 * @throws Error if file validation fails or upload fails
 */
export async function uploadPhoto(
  file: File,
  userId: string,
  path: string = 'photos'
): Promise<string> {
  // Validate file size
  if (file.size > MAX_PHOTO_SIZE) {
    throw new Error(`File size must be less than ${MAX_PHOTO_SIZE / 1024 / 1024}MB`);
  }

  // Validate file type
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    throw new Error('Only JPEG, PNG, WebP, and GIF images are allowed');
  }

  const fileExt = file.name.split('.').pop();
  const fileName = `${userId}/${Date.now()}.${fileExt}`;
  const filePath = fileName;

  const { error: uploadError } = await supabase.storage
    .from(PHOTOS_BUCKET)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (uploadError) throw uploadError;

  // Get public URL
  const { data } = supabase.storage
    .from(PHOTOS_BUCKET)
    .getPublicUrl(filePath);

  return data.publicUrl;
}

/**
 * Delete a photo from storage
 */
export async function deletePhoto(filePath: string): Promise<void> {
  const path = extractPathFromUrl(filePath, PHOTOS_BUCKET);

  const { error } = await supabase.storage
    .from(PHOTOS_BUCKET)
    .remove([path]);

  if (error) throw error;
}

/**
 * Get public URL for a photo
 */
export function getPhotoUrl(filePath: string): string {
  const { data } = supabase.storage
    .from(PHOTOS_BUCKET)
    .getPublicUrl(filePath);

  return data.publicUrl;
}

/**
 * Upload a file attachment for messages
 * Supports images and other file types
 */
export async function uploadMessageAttachment(
  file: File,
  userId: string,
  matchId: string
): Promise<{ url: string; type: string; name: string; size: number }> {
  // Validate file size (max 10MB)
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File size must be less than ${MAX_FILE_SIZE / 1024 / 1024}MB`);
  }

  // Validate file type
  const allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  const allowedFileTypes = [
    ...allowedImageTypes,
    'application/pdf',
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];
  
  if (!allowedFileTypes.includes(file.type)) {
    throw new Error('File type not supported. Allowed: images, PDF, text, Word documents');
  }

  const fileExt = file.name.split('.').pop();
  const fileName = `messages/${matchId}/${userId}/${Date.now()}.${fileExt}`;
  const filePath = fileName;

  const { error: uploadError } = await supabase.storage
    .from(PHOTOS_BUCKET) // Reuse photos bucket for now, or create a separate 'attachments' bucket
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (uploadError) throw uploadError;

  // Get public URL
  const { data } = supabase.storage
    .from(PHOTOS_BUCKET)
    .getPublicUrl(filePath);

  return {
    url: data.publicUrl,
    type: file.type,
    name: file.name,
    size: file.size,
  };
}

/**
 * Delete a message attachment from storage
 */
export async function deleteMessageAttachment(filePath: string): Promise<void> {
  const path = extractPathFromUrl(filePath, PHOTOS_BUCKET);

  const { error } = await supabase.storage
    .from(PHOTOS_BUCKET)
    .remove([path]);

  if (error) throw error;
}
