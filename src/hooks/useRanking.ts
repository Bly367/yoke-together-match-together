import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  rankDuosForDiscover,
  cacheRankingScores,
  getCachedRankingScores,
  type RankedDuo,
} from '@/services/ranking.service';
import { logger } from '@/lib/logger';
import type { DuoWithMembers } from '@/services/duo.service';

/**
 * Hook to rank duos for discover feed
 */
export function useRankDuos(
  userId: string | null,
  userDuoId: string | null,
  candidateDuos: DuoWithMembers[],
  enabled: boolean = true
) {
  return useQuery({
    queryKey: ['ranked-duos', userId, userDuoId, candidateDuos.map(d => d.id).sort().join(',')],
    queryFn: async () => {
      if (!userId || !userDuoId) {
        throw new Error('User ID and duo ID are required');
      }
      return rankDuosForDiscover(userId, userDuoId, candidateDuos);
    },
    enabled: enabled && !!userId && !!userDuoId && candidateDuos.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Hook to cache ranking scores
 */
export function useCacheRankingScores() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, rankedDuos }: { userId: string; rankedDuos: RankedDuo[] }) =>
      cacheRankingScores(userId, rankedDuos),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ranked-duos'] });
    },
  });
}

/**
 * Hook to get cached ranking scores
 */
export function useCachedRankingScores(userId: string | null, limit: number = 50) {
  return useQuery({
    queryKey: ['cached-ranking-scores', userId, limit],
    queryFn: () => {
      if (!userId) throw new Error('User ID is required');
      return getCachedRankingScores(userId, limit);
    },
    enabled: !!userId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

