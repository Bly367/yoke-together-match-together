import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  createDuo,
  getDuo,
  getUserDuos,
  updateDuo,
  getActiveDuosForMatching,
  deactivateDuo,
  deleteDuo,
  setActiveDuo,
  getActiveDuo,
  type Duo,
  type DuoWithMembers,
} from '@/services/duo.service';
import { useAuth } from './useAuth';
import { logger } from '@/lib/logger';

/**
 * Query keys
 */
const DUOS_QUERY_KEY = ['duos'] as const;
const DUO_QUERY_KEY = (id: string) => ['duos', id] as const;
const USER_DUOS_QUERY_KEY = (userId: string) => ['duos', 'user', userId] as const;
// Sort excludeIds for consistent query key caching
const ACTIVE_DUOS_QUERY_KEY = (userId: string, excludeIds: string[]) =>
  ['duos', 'active', userId, [...excludeIds].sort().join(',')] as const;

/**
 * Hook to get user's duos
 */
export function useUserDuos() {
  const { user } = useAuth();

  return useQuery({
    queryKey: USER_DUOS_QUERY_KEY(user?.id || ''),
    queryFn: async () => {
      try {
        return await getUserDuos(user!.id);
      } catch (error) {
        // Log error for debugging
        logger.error('Error in useUserDuos queryFn', error);
        throw error;
      }
    },
    enabled: !!user,
    // Return empty array as default data instead of undefined
    placeholderData: [],
    // Don't treat empty results as errors
    retry: (failureCount, error) => {
      // Don't retry on "no rows" errors (PGRST116) - empty duos is valid
      if (error && typeof error === 'object' && 'code' in error && error.code === 'PGRST116') {
        return false;
      }
      // Don't retry on RLS policy violations - these won't be fixed by retrying
      if (error && typeof error === 'object' && 'code' in error && error.code === '42501') {
        return false;
      }
      // Retry up to 2 times for other errors
      return failureCount < 2;
    },
  });
}

/**
 * Hook to get a specific duo
 */
export function useDuo(duoId: string | null) {
  return useQuery({
    queryKey: DUO_QUERY_KEY(duoId || ''),
    queryFn: () => getDuo(duoId!),
    enabled: !!duoId,
  });
}

/**
 * Hook to create a duo
 */
export function useCreateDuo() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: ({ member2Id, data }: { member2Id: string; data?: Parameters<typeof createDuo>[2] }) =>
      createDuo(user!.id, member2Id, data),
    onSuccess: (duo) => {
      queryClient.invalidateQueries({ queryKey: USER_DUOS_QUERY_KEY(user!.id) });
      queryClient.setQueryData(DUO_QUERY_KEY(duo.id), duo);
    },
  });
}

/**
 * Hook to update a duo
 */
export function useUpdateDuo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ duoId, updates }: { duoId: string; updates: Partial<Duo> }) =>
      updateDuo(duoId, updates),
    onSuccess: (duo) => {
      queryClient.invalidateQueries({ queryKey: ['duos'] });
      queryClient.setQueryData(DUO_QUERY_KEY(duo.id), duo);
    },
  });
}

/**
 * Hook to get active duos for matching
 */
export function useActiveDuosForMatching(excludeDuoIds: string[] = []) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ACTIVE_DUOS_QUERY_KEY(user?.id || '', excludeDuoIds),
    queryFn: () => getActiveDuosForMatching(user!.id, excludeDuoIds),
    enabled: !!user,
  });
}

/**
 * Hook to deactivate a duo
 */
export function useDeactivateDuo() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (duoId: string) => deactivateDuo(duoId),
    onSuccess: () => {
      if (user) {
        queryClient.invalidateQueries({ queryKey: USER_DUOS_QUERY_KEY(user.id) });
      }
      queryClient.invalidateQueries({ queryKey: ['duos'] });
    },
  });
}

/**
 * Hook to delete a duo
 */
export function useDeleteDuo() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (duoId: string) => deleteDuo(duoId),
    onSuccess: () => {
      if (user) {
        queryClient.invalidateQueries({ queryKey: USER_DUOS_QUERY_KEY(user.id) });
      }
      queryClient.invalidateQueries({ queryKey: ['duos'] });
    },
  });
}

/**
 * Hook to set a duo as active (deactivates all other duos for the user)
 */
export function useSetActiveDuo() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (duoId: string) => {
      if (!user) throw new Error('User must be authenticated');
      return setActiveDuo(duoId, user.id);
    },
    onSuccess: () => {
      if (user) {
        queryClient.invalidateQueries({ queryKey: USER_DUOS_QUERY_KEY(user.id) });
      }
      queryClient.invalidateQueries({ queryKey: ['duos'] });
    },
  });
}

/**
 * Hook to get the active duo from user's duos
 */
export function useActiveDuo() {
  const { data: userDuos } = useUserDuos();
  return userDuos ? getActiveDuo(userDuos) : null;
}

