import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import {
  swipeOnDuo,
  getUserMatches,
  getSwipedDuoIds,
  checkMatch,
  unmatch,
  undoSwipe,
  subscribeToMatches,
  type SwipeAction,
  type Match,
} from '@/services/matching.service';
import { useUserDuos } from './useDuos';
import { useAuth } from './useAuth';

/**
 * Query keys
 */
const MATCHES_QUERY_KEY = (userId: string) => ['matches', userId] as const;
const SWIPED_QUERY_KEY = (duoId: string) => ['swiped', duoId] as const;
const MATCH_QUERY_KEY = (duo1Id: string, duo2Id: string) =>
  ['match', duo1Id, duo2Id] as const;

/**
 * Hook to get user's matches with real-time subscription
 */
export function useMatches() {
  const { user } = useAuth();
  const { data: duos } = useUserDuos();
  const queryClient = useQueryClient();
  const unsubscribeRef = useRef<(() => void) | null>(null);

  const query = useQuery({
    queryKey: MATCHES_QUERY_KEY(user?.id || ''),
    queryFn: () => getUserMatches(user!.id),
    enabled: !!user && !!duos, // Allow query to run even if duos is empty array (will return empty matches)
  });

  // Subscribe to new matches in real-time
  useEffect(() => {
    if (!user?.id || !duos || duos.length === 0) return;

    const unsubscribe = subscribeToMatches(user.id, (newMatch) => {
      // Update the matches query cache with the new match
      queryClient.setQueryData(MATCHES_QUERY_KEY(user.id), (old: Match[] = []) => {
        // Check if match already exists to avoid duplicates
        if (old.some(m => m.id === newMatch.id)) return old;
        // Add new match at the beginning (most recent first)
        return [newMatch, ...old];
      });
    });

    unsubscribeRef.current = unsubscribe;

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [user?.id, duos, queryClient]);

  return query;
}

/**
 * Hook to swipe on a duo with optimistic updates
 */
export function useSwipe() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      swiperDuoId,
      swipedDuoId,
      action,
    }: {
      swiperDuoId: string;
      swipedDuoId: string;
      action: SwipeAction;
    }) => swipeOnDuo(swiperDuoId, swipedDuoId, action),
    onMutate: async (variables) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['swiped'] });
      await queryClient.cancelQueries({ queryKey: ['duos', 'active'] });

      // Snapshot previous values
      const previousSwiped = queryClient.getQueryData(SWIPED_QUERY_KEY(variables.swiperDuoId));
      const previousActiveDuos = queryClient.getQueryData(['duos', 'active']);

      // Optimistically update swiped list
      queryClient.setQueryData(SWIPED_QUERY_KEY(variables.swiperDuoId), (old: string[] = []) => {
        if (old.includes(variables.swipedDuoId)) return old;
        return [...old, variables.swipedDuoId];
      });

      // Optimistically remove from active duos
      queryClient.setQueryData(['duos', 'active'], (old: any[] = []) => {
        return old.filter(duo => duo.id !== variables.swipedDuoId);
      });

      return { previousSwiped, previousActiveDuos };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousSwiped) {
        queryClient.setQueryData(SWIPED_QUERY_KEY(variables.swiperDuoId), context.previousSwiped);
      }
      if (context?.previousActiveDuos) {
        queryClient.setQueryData(['duos', 'active'], context.previousActiveDuos);
      }
    },
    onSuccess: async (swipe, variables) => {
      // Invalidate to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['swiped'] });
      queryClient.invalidateQueries({ queryKey: ['duos', 'active'] });
      // Check for match if liked
      if (variables.action === 'like') {
        const match = await checkMatch(variables.swiperDuoId, variables.swipedDuoId);
        if (match) {
          queryClient.invalidateQueries({ queryKey: ['matches'] });
        }
      }
    },
  });
}

/**
 * Hook to get swiped duo IDs
 */
export function useSwipedDuoIds(duoId: string | null) {
  return useQuery({
    queryKey: SWIPED_QUERY_KEY(duoId || ''),
    queryFn: () => getSwipedDuoIds(duoId!),
    enabled: !!duoId,
  });
}

/**
 * Hook to check if two duos have matched
 */
export function useMatchCheck(duo1Id: string | null, duo2Id: string | null) {
  return useQuery({
    queryKey: MATCH_QUERY_KEY(duo1Id || '', duo2Id || ''),
    queryFn: () => checkMatch(duo1Id!, duo2Id!),
    enabled: !!duo1Id && !!duo2Id,
  });
}

/**
 * Hook to unmatch (deactivate) a match
 */
export function useUnmatch() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (matchId: string) => unmatch(matchId),
    onSuccess: () => {
      // Invalidate matches query to refresh the list
      queryClient.invalidateQueries({ queryKey: ['matches', user?.id] });
    },
  });
}

/**
 * Hook to undo a swipe
 */
export function useUndoSwipe() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      swiperDuoId,
      swipedDuoId,
    }: {
      swiperDuoId: string;
      swipedDuoId: string;
    }) => undoSwipe(swiperDuoId, swipedDuoId),
    onSuccess: (_, variables) => {
      // Invalidate swiped list and active duos to refresh
      queryClient.invalidateQueries({ queryKey: ['swiped'] });
      queryClient.invalidateQueries({ queryKey: ['duos', 'active'] });
    },
  });
}

