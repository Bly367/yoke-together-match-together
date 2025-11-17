import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createPreferenceEvent,
  trackLike,
  trackHardLike,
  trackPass,
  trackView,
  trackPhotoExpand,
  trackPromptScroll,
  trackMessageSent,
  trackMatchSuccess,
  trackGhostAfterMatch,
  getUserPreferenceEvents,
  getRecentPreferenceEvents,
  type PreferenceEvent,
  type PreferenceEventType,
} from '@/services/preferenceEvents.service';
import { logger } from '@/lib/logger';

/**
 * Hook to track a like event
 */
export function useTrackLike() {
  return useMutation({
    mutationFn: ({ userId, duoId }: { userId: string; duoId: string }) =>
      trackLike(userId, duoId),
    onError: (error) => {
      logger.error('Failed to track like', { error });
    },
  });
}

/**
 * Hook to track a hard like event
 */
export function useTrackHardLike() {
  return useMutation({
    mutationFn: ({ userId, duoId }: { userId: string; duoId: string }) =>
      trackHardLike(userId, duoId),
    onError: (error) => {
      logger.error('Failed to track hard like', { error });
    },
  });
}

/**
 * Hook to track a pass event
 */
export function useTrackPass() {
  return useMutation({
    mutationFn: ({ userId, duoId }: { userId: string; duoId: string }) =>
      trackPass(userId, duoId),
    onError: (error) => {
      logger.error('Failed to track pass', { error });
    },
  });
}

/**
 * Hook to track a view event
 */
export function useTrackView() {
  return useMutation({
    mutationFn: ({
      userId,
      duoId,
      dwellTimeMs,
    }: {
      userId: string;
      duoId: string;
      dwellTimeMs?: number;
    }) => trackView(userId, duoId, dwellTimeMs),
    onError: (error) => {
      logger.error('Failed to track view', { error });
    },
  });
}

/**
 * Hook to track a photo expand event
 */
export function useTrackPhotoExpand() {
  return useMutation({
    mutationFn: ({
      userId,
      photoId,
      dwellTimeMs,
      photoIndex,
    }: {
      userId: string;
      photoId: string;
      dwellTimeMs?: number;
      photoIndex?: number;
    }) => trackPhotoExpand(userId, photoId, dwellTimeMs, photoIndex),
    onError: (error) => {
      logger.error('Failed to track photo expand', { error });
    },
  });
}

/**
 * Hook to track a prompt scroll event
 */
export function useTrackPromptScroll() {
  return useMutation({
    mutationFn: ({
      userId,
      promptId,
      dwellTimeMs,
      promptIndex,
    }: {
      userId: string;
      promptId: string;
      dwellTimeMs?: number;
      promptIndex?: number;
    }) => trackPromptScroll(userId, promptId, dwellTimeMs, promptIndex),
    onError: (error) => {
      logger.error('Failed to track prompt scroll', { error });
    },
  });
}

/**
 * Hook to track a message sent event
 */
export function useTrackMessageSent() {
  return useMutation({
    mutationFn: ({ userId, duoId }: { userId: string; duoId: string }) =>
      trackMessageSent(userId, duoId),
    onError: (error) => {
      logger.error('Failed to track message sent', { error });
    },
  });
}

/**
 * Hook to track a match success event
 */
export function useTrackMatchSuccess() {
  return useMutation({
    mutationFn: ({ userId, duoId }: { userId: string; duoId: string }) =>
      trackMatchSuccess(userId, duoId),
    onError: (error) => {
      logger.error('Failed to track match success', { error });
    },
  });
}

/**
 * Hook to track a ghost after match event
 */
export function useTrackGhostAfterMatch() {
  return useMutation({
    mutationFn: ({ userId, duoId }: { userId: string; duoId: string }) =>
      trackGhostAfterMatch(userId, duoId),
    onError: (error) => {
      logger.error('Failed to track ghost after match', { error });
    },
  });
}

/**
 * Hook to get user preference events
 */
export function useUserPreferenceEvents(
  userId: string | null,
  limit: number = 100,
  eventTypes?: PreferenceEventType[]
) {
  return useQuery({
    queryKey: ['preference-events', userId, limit, eventTypes?.join(',')],
    queryFn: () => {
      if (!userId) throw new Error('User ID is required');
      return getUserPreferenceEvents(userId, limit, eventTypes);
    },
    enabled: !!userId,
  });
}

/**
 * Hook to get recent preference events
 */
export function useRecentPreferenceEvents(userId: string | null, days: number = 30) {
  return useQuery({
    queryKey: ['recent-preference-events', userId, days],
    queryFn: () => {
      if (!userId) throw new Error('User ID is required');
      return getRecentPreferenceEvents(userId, days);
    },
    enabled: !!userId,
  });
}

