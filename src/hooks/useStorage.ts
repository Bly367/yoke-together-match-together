import { useMutation } from '@tanstack/react-query';
import { uploadPhoto, deletePhoto, uploadMessageAttachment, deleteMessageAttachment, type getPhotoUrl } from '@/services/storage.service';

/**
 * Hook to upload a photo
 */
export function useUploadPhoto() {
  return useMutation({
    mutationFn: ({ file, userId, path }: { file: File; userId: string; path?: string }) =>
      uploadPhoto(file, userId, path),
  });
}

/**
 * Hook to delete a photo
 */
export function useDeletePhoto() {
  return useMutation({
    mutationFn: (filePath: string) => deletePhoto(filePath),
  });
}

/**
 * Hook to upload a message attachment
 */
export function useUploadMessageAttachment() {
  return useMutation({
    mutationFn: ({ file, userId, matchId }: { file: File; userId: string; matchId: string }) =>
      uploadMessageAttachment(file, userId, matchId),
  });
}

/**
 * Hook to delete a message attachment
 */
export function useDeleteMessageAttachment() {
  return useMutation({
    mutationFn: (filePath: string) => deleteMessageAttachment(filePath),
  });
}

