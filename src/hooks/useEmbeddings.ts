import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  computeUserEmbedding,
  getUserEmbedding,
  updateEloScore,
  type UserEmbedding,
} from '@/services/preferenceLearning.service';
import { logger } from '@/lib/logger';

/**
 * Hook to get user embedding
 */
export function useUserEmbedding(userId: string | null) {
  return useQuery({
    queryKey: ['user-embedding', userId],
    queryFn: () => {
      if (!userId) throw new Error('User ID is required');
      return getUserEmbedding(userId);
    },
    enabled: !!userId,
  });
}

/**
 * Hook to compute user embedding
 */
export function useComputeUserEmbedding() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => computeUserEmbedding(userId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['user-embedding', data.user_id] });
      logger.info('User embedding computed successfully', { userId: data.user_id });
    },
    onError: (error) => {
      logger.error('Failed to compute user embedding', { error });
    },
  });
}

/**
 * Hook to update ELO score
 */
export function useUpdateEloScore() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, newEloScore }: { userId: string; newEloScore: number }) =>
      updateEloScore(userId, newEloScore),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['user-embedding', data.user_id] });
    },
  });
}

