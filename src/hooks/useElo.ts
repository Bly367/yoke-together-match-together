import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getUserElo, updateEloAfterMatch } from '@/services/elo.service';
import { logger } from '@/lib/logger';

/**
 * React Query hook for getting user ELO score
 */
export function useUserElo(userId: string | null) {
  return useQuery({
    queryKey: ['userElo', userId],
    queryFn: () => {
      if (!userId) throw new Error('User ID is required');
      return getUserElo(userId);
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * React Query hook for updating ELO after match
 */
export function useUpdateEloAfterMatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      user1Id,
      user2Id,
      outcome,
    }: {
      user1Id: string;
      user2Id: string;
      outcome?: 'match' | 'no_match' | 'draw';
    }) => {
      return updateEloAfterMatch(user1Id, user2Id, outcome);
    },
    onSuccess: (_, variables) => {
      // Invalidate ELO queries for both users
      queryClient.invalidateQueries({ queryKey: ['userElo', variables.user1Id] });
      queryClient.invalidateQueries({ queryKey: ['userElo', variables.user2Id] });
      logger.info('ELO updated after match', { user1Id: variables.user1Id, user2Id: variables.user2Id });
    },
    onError: (error) => {
      logger.error('Failed to update ELO after match', { error });
    },
  });
}

