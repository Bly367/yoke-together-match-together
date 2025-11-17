import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getUserPhotos,
  getPrimaryPhoto,
  createUserPhoto,
  updatePhotoOrder,
  setPrimaryPhoto,
  deleteUserPhoto,
  replaceUserPhoto,
  generatePhotoEmbedding,
  getPhotosForUsers,
  type UserPhoto,
} from '@/services/photo.service';
import { logger } from '@/lib/logger';

/**
 * Hook to get all photos for a user
 */
export function useUserPhotos(userId: string | null) {
  return useQuery({
    queryKey: ['user-photos', userId],
    queryFn: () => {
      if (!userId) throw new Error('User ID is required');
      return getUserPhotos(userId);
    },
    enabled: !!userId,
  });
}

/**
 * Hook to get primary photo for a user
 */
export function usePrimaryPhoto(userId: string | null) {
  return useQuery({
    queryKey: ['primary-photo', userId],
    queryFn: () => {
      if (!userId) throw new Error('User ID is required');
      return getPrimaryPhoto(userId);
    },
    enabled: !!userId,
  });
}

/**
 * Hook to create a user photo
 */
export function useCreatePhoto() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      userId,
      file,
      displayOrder,
      isPrimary,
      generateEmbedding,
    }: {
      userId: string;
      file: File;
      displayOrder?: number;
      isPrimary?: boolean;
      generateEmbedding?: boolean;
    }) => createUserPhoto(userId, file, displayOrder, isPrimary, generateEmbedding),
    onSuccess: async (data, variables) => {
      // Invalidate user photos query
      queryClient.invalidateQueries({ queryKey: ['user-photos', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['primary-photo', variables.userId] });
      logger.info('Photo created successfully', { photoId: data.id });
      
      // Automatically compute user embedding after photo is added (async)
      try {
        const { computeUserEmbedding } = await import('@/services/preferenceLearning.service');
        computeUserEmbedding(variables.userId).catch((err) => {
          logger.warn('Failed to compute user embedding after photo upload', { error: err });
        });
      } catch (err) {
        // Ignore errors in embedding computation
      }
    },
    onError: (error) => {
      logger.error('Failed to create photo', { error });
    },
  });
}

/**
 * Hook to update photo display order
 */
export function useUpdatePhotoOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ photoId, displayOrder }: { photoId: string; displayOrder: number }) =>
      updatePhotoOrder(photoId, displayOrder),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['user-photos', data.user_id] });
    },
  });
}

/**
 * Hook to set primary photo
 */
export function useSetPrimaryPhoto() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ photoId, userId }: { photoId: string; userId: string }) =>
      setPrimaryPhoto(photoId, userId),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['user-photos', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['primary-photo', variables.userId] });
    },
  });
}

/**
 * Hook to replace/update an existing photo
 */
export function useReplacePhoto() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      photoId,
      file,
      generateEmbedding,
    }: {
      photoId: string;
      file: File;
      generateEmbedding?: boolean;
    }) => replaceUserPhoto(photoId, file, generateEmbedding),
    onSuccess: async (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['user-photos', data.user_id] });
      queryClient.invalidateQueries({ queryKey: ['primary-photo', data.user_id] });
      logger.info('Photo replaced successfully', { photoId: variables.photoId });
      
      // Automatically compute user embedding after photo is replaced (async)
      try {
        const { computeUserEmbedding } = await import('@/services/preferenceLearning.service');
        computeUserEmbedding(data.user_id).catch((err) => {
          logger.warn('Failed to compute user embedding after photo replacement', { error: err });
        });
      } catch (err) {
        // Ignore errors in embedding computation
      }
    },
    onError: (error) => {
      logger.error('Failed to replace photo', { error });
    },
  });
}

/**
 * Hook to delete a photo
 */
export function useDeletePhoto() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (photoId: string) => deleteUserPhoto(photoId),
    onSuccess: (_, photoId) => {
      // Invalidate all photo queries (we don't know userId here)
      queryClient.invalidateQueries({ queryKey: ['user-photos'] });
      queryClient.invalidateQueries({ queryKey: ['primary-photo'] });
      logger.info('Photo deleted successfully', { photoId });
    },
  });
}

/**
 * Hook to generate embedding for a photo
 */
export function useGeneratePhotoEmbedding() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (photoId: string) => generatePhotoEmbedding(photoId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['user-photos', data.user_id] });
    },
  });
}

/**
 * Hook to get photos for multiple users (for duo profiles)
 */
export function usePhotosForUsers(userIds: string[]) {
  return useQuery({
    queryKey: ['photos-for-users', userIds.sort().join(',')],
    queryFn: () => getPhotosForUsers(userIds),
    enabled: userIds.length > 0,
  });
}

