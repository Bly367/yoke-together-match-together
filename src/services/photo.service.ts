import { supabase } from '@/integrations/supabase/client';
import { uploadPhoto, getPhotoUrl } from './storage.service';
import { generateVisualEmbedding, type EmbeddingVector } from './embedding.service';
import { logger } from '@/lib/logger';
import { retryWithBackoff } from '@/lib/utils';
import type { PostgrestError } from '@supabase/supabase-js';

/**
 * Ensure photo has a valid URL - regenerate from storage_path if needed
 * Uses the same approach as the old profile photo system
 */
function ensurePhotoUrl(photo: UserPhoto): UserPhoto {
  // If photo_url is missing or invalid, regenerate from storage_path
  if (!photo.photo_url || !photo.photo_url.trim() || !photo.photo_url.startsWith('http')) {
    if (photo.storage_path && photo.storage_path.trim()) {
      // Use getPhotoUrl to generate public URL from storage path (same as old system)
      const regeneratedUrl = getPhotoUrl(photo.storage_path);
      if (regeneratedUrl && regeneratedUrl.trim()) {
        logger.info('Regenerated photo URL from storage_path', { photoId: photo.id, storagePath: photo.storage_path, url: regeneratedUrl });
        return { ...photo, photo_url: regeneratedUrl.trim() };
      }
    }
    // If we still don't have a valid URL, log warning
    logger.warn('Photo missing valid URL', { photoId: photo.id, photo_url: photo.photo_url, storage_path: photo.storage_path });
  }
  return photo;
}

/**
 * User photo with embedding
 */
export interface UserPhoto {
  id: string;
  user_id: string;
  photo_url: string;
  storage_path: string;
  display_order: number;
  visual_embedding: number[] | null;
  embedding_generated_at: string | null;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Create user photo from uploaded file
 * 
 * @param userId - User ID
 * @param file - Photo file to upload
 * @param displayOrder - Display order (0-based)
 * @param isPrimary - Whether this is the primary photo
 * @param generateEmbedding - Whether to generate embedding (default: true)
 * @returns Promise resolving to created UserPhoto
 * @throws Error if upload or creation fails
 * 
 * @example
 * ```typescript
 * const photo = await createUserPhoto(userId, file, 0, true);
 * ```
 */
export async function createUserPhoto(
  userId: string,
  file: File,
  displayOrder: number = 0,
  isPrimary: boolean = false,
  generateEmbedding: boolean = true
): Promise<UserPhoto> {
  // Upload photo to storage - same approach as old profile photo system
  // uploadPhoto returns the public URL directly (e.g., https://...supabase.co/storage/v1/object/public/photos/userId/timestamp.jpg)
  const photoUrl = await uploadPhoto(file, userId);
  
  // Extract storage path from URL for storage_path field
  // Format: https://...supabase.co/storage/v1/object/public/photos/{path}
  const storagePattern = '/storage/v1/object/public/photos/';
  let storagePath: string;
  if (photoUrl.includes(storagePattern)) {
    storagePath = photoUrl.split(storagePattern)[1]?.split('?')[0] || '';
  } else {
    // Fallback: extract path from any storage URL pattern
    const match = photoUrl.match(/\/storage\/v1\/object\/public\/[^/]+\/(.+)$/);
    storagePath = match?.[1]?.split('?')[0] || `${userId}/${Date.now()}.${file.name.split('.').pop()}`;
  }
  
  // Ensure photoUrl is trimmed (same as old system)
  const trimmedPhotoUrl = photoUrl.trim();

  // Generate embedding if requested
  let embedding: EmbeddingVector | null = null;
  let embeddingGeneratedAt: string | null = null;

  if (generateEmbedding) {
    try {
      embedding = await generateVisualEmbedding(trimmedPhotoUrl);
      embeddingGeneratedAt = new Date().toISOString();
    } catch (error) {
      logger.warn('Failed to generate embedding for photo, continuing without it', { error, photoUrl: trimmedPhotoUrl });
      // Continue without embedding - can be generated later
    }
  }

  // Insert photo record - store URL directly (same as old profile photo system)
  const { data, error } = await retryWithBackoff(async () => {
    return await supabase
      .from('user_photos')
      .insert({
        user_id: userId,
        photo_url: trimmedPhotoUrl, // Store URL directly, same as profiles.photo_url
        storage_path: storagePath,
        display_order: displayOrder,
        visual_embedding: embedding,
        embedding_generated_at: embeddingGeneratedAt,
        is_primary: isPrimary,
      })
      .select()
      .single();
  });

  if (error) {
    logger.error('Failed to create user photo', { error, userId });
    throw error;
  }

  return data;
}

/**
 * Get all photos for a user
 * 
 * @param userId - User ID
 * @returns Promise resolving to array of UserPhoto
 * @throws Error if query fails
 */
export async function getUserPhotos(userId: string): Promise<UserPhoto[]> {
  const { data, error } = await supabase
    .from('user_photos')
    .select('*')
    .eq('user_id', userId)
    .order('display_order', { ascending: true });

  if (error) {
    logger.error('Failed to get user photos', { error, userId });
    throw error;
  }

  // Ensure all photos have valid URLs
  return (data || []).map(ensurePhotoUrl);
}

/**
 * Get primary photo for a user
 * 
 * @param userId - User ID
 * @returns Promise resolving to UserPhoto or null
 * @throws Error if query fails
 */
export async function getPrimaryPhoto(userId: string): Promise<UserPhoto | null> {
  const { data, error } = await supabase
    .from('user_photos')
    .select('*')
    .eq('user_id', userId)
    .eq('is_primary', true)
    .single();

  if (error) {
    if ((error as PostgrestError).code === 'PGRST116') {
      // No primary photo found
      return null;
    }
    logger.error('Failed to get primary photo', { error, userId });
    throw error;
  }

  return data ? ensurePhotoUrl(data) : null;
}

/**
 * Update photo display order
 * 
 * @param photoId - Photo ID
 * @param displayOrder - New display order
 * @returns Promise resolving to updated UserPhoto
 * @throws Error if update fails
 */
export async function updatePhotoOrder(photoId: string, displayOrder: number): Promise<UserPhoto> {
  const { data, error } = await supabase
    .from('user_photos')
    .update({ display_order: displayOrder })
    .eq('id', photoId)
    .select()
    .single();

  if (error) {
    logger.error('Failed to update photo order', { error, photoId });
    throw error;
  }

  return data;
}

/**
 * Set photo as primary (and unset others)
 * 
 * @param photoId - Photo ID to set as primary
 * @param userId - User ID (to unset other primary photos)
 * @returns Promise resolving to updated UserPhoto
 * @throws Error if update fails
 */
export async function setPrimaryPhoto(photoId: string, userId: string): Promise<UserPhoto> {
  // First, unset all primary photos for this user
  await supabase
    .from('user_photos')
    .update({ is_primary: false })
    .eq('user_id', userId)
    .eq('is_primary', true);

  // Then set this photo as primary
  const { data, error } = await supabase
    .from('user_photos')
    .update({ is_primary: true })
    .eq('id', photoId)
    .select()
    .single();

  if (error) {
    logger.error('Failed to set primary photo', { error, photoId });
    throw error;
  }

  return data;
}

/**
 * Replace/update an existing photo with a new file
 * 
 * @param photoId - Photo ID to replace
 * @param file - New photo file
 * @param generateEmbedding - Whether to generate embedding (default: true)
 * @returns Promise resolving to updated UserPhoto
 * @throws Error if update fails
 */
export async function replaceUserPhoto(
  photoId: string,
  file: File,
  generateEmbedding: boolean = true
): Promise<UserPhoto> {
  // Get existing photo to preserve metadata
  const { data: existingPhoto, error: fetchError } = await supabase
    .from('user_photos')
    .select('*')
    .eq('id', photoId)
    .single();

  if (fetchError || !existingPhoto) {
    logger.error('Failed to fetch photo for replacement', { error: fetchError, photoId });
    throw fetchError || new Error('Photo not found');
  }

  // Upload new photo to storage
  const photoUrl = await uploadPhoto(file, existingPhoto.user_id);
  
  // Extract storage path from URL
  const storagePattern = '/storage/v1/object/public/photos/';
  let storagePath: string;
  if (photoUrl.includes(storagePattern)) {
    storagePath = photoUrl.split(storagePattern)[1]?.split('?')[0] || '';
  } else {
    const match = photoUrl.match(/\/storage\/v1\/object\/public\/[^/]+\/(.+)$/);
    storagePath = match?.[1]?.split('?')[0] || `${existingPhoto.user_id}/${Date.now()}.${file.name.split('.').pop()}`;
  }

  const trimmedPhotoUrl = photoUrl.trim();

  // Generate embedding if requested
  let embedding: EmbeddingVector | null = null;
  let embeddingGeneratedAt: string | null = null;

  if (generateEmbedding) {
    try {
      embedding = await generateVisualEmbedding(trimmedPhotoUrl);
      embeddingGeneratedAt = new Date().toISOString();
    } catch (error) {
      logger.warn('Failed to generate embedding for replaced photo, continuing without it', { error, photoUrl: trimmedPhotoUrl });
    }
  }

  // Update photo record with new URL and path
  const { data, error } = await retryWithBackoff(async () => {
    return await supabase
      .from('user_photos')
      .update({
        photo_url: trimmedPhotoUrl,
        storage_path: storagePath,
        visual_embedding: embedding,
        embedding_generated_at: embeddingGeneratedAt,
        updated_at: new Date().toISOString(),
      })
      .eq('id', photoId)
      .select()
      .single();
  });

  if (error) {
    logger.error('Failed to replace user photo', { error, photoId });
    throw error;
  }

  return data;
}

/**
 * Delete user photo
 * 
 * @param photoId - Photo ID
 * @returns Promise resolving when deletion completes
 * @throws Error if deletion fails
 */
export async function deleteUserPhoto(photoId: string): Promise<void> {
  const { error } = await supabase
    .from('user_photos')
    .delete()
    .eq('id', photoId);

  if (error) {
    logger.error('Failed to delete user photo', { error, photoId });
    throw error;
  }
}

/**
 * Generate embedding for existing photo (if missing)
 * 
 * @param photoId - Photo ID
 * @returns Promise resolving to updated UserPhoto with embedding
 * @throws Error if generation fails
 */
export async function generatePhotoEmbedding(photoId: string): Promise<UserPhoto> {
  // Get photo
  const { data: photo, error: fetchError } = await supabase
    .from('user_photos')
    .select('*')
    .eq('id', photoId)
    .single();

  if (fetchError) {
    logger.error('Failed to fetch photo for embedding generation', { error: fetchError, photoId });
    throw fetchError;
  }

  if (!photo) {
    throw new Error('Photo not found');
  }

  // Generate embedding
  const embedding = await generateVisualEmbedding(photo.photo_url);
  const embeddingGeneratedAt = new Date().toISOString();

  // Update photo with embedding
  const { data, error } = await supabase
    .from('user_photos')
    .update({
      visual_embedding: embedding,
      embedding_generated_at: embeddingGeneratedAt,
    })
    .eq('id', photoId)
    .select()
    .single();

  if (error) {
    logger.error('Failed to update photo with embedding', { error, photoId });
    throw error;
  }

  return data;
}

/**
 * Get photos for multiple users (for duo profiles)
 * 
 * @param userIds - Array of user IDs
 * @returns Promise resolving to map of userId -> UserPhoto[]
 * @throws Error if query fails
 */
export async function getPhotosForUsers(userIds: string[]): Promise<Map<string, UserPhoto[]>> {
  if (userIds.length === 0) {
    return new Map();
  }

  const { data, error } = await supabase
    .from('user_photos')
    .select('*')
    .in('user_id', userIds)
    .order('display_order', { ascending: true });

  if (error) {
    logger.error('Failed to get photos for users', { error, userIds });
    throw error;
  }

  // Group by user_id and ensure all photos have valid URLs
  const photosByUser = new Map<string, UserPhoto[]>();
  for (const photo of data || []) {
    const photoWithValidUrl = ensurePhotoUrl(photo);
    const existing = photosByUser.get(photo.user_id) || [];
    existing.push(photoWithValidUrl);
    photosByUser.set(photo.user_id, existing);
  }

  // Ensure all userIds have an entry (even if empty)
  for (const userId of userIds) {
    if (!photosByUser.has(userId)) {
      photosByUser.set(userId, []);
    }
  }

  return photosByUser;
}

