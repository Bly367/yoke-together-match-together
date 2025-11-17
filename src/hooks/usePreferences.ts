import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getUserPreferences,
  updateUserPreferences,
  getUserInterests,
  addUserInterest,
  removeUserInterest,
  getInterestCategories,
  getPredefinedInterests,
  getMatchCountEstimate,
  getUserDemographics,
  updateUserDemographics,
  type UserPreferences,
  type UserInterest,
  type InterestCategory,
  type PredefinedInterest,
  type ProfileDemographics,
} from '@/services/preferences.service';
import { CURRENT_USER_KEY } from './useAuth';

/**
 * Query keys for preferences
 */
export const USER_PREFERENCES_KEY = (userId: string) => ['preferences', userId] as const;
export const USER_INTERESTS_KEY = (userId: string) => ['interests', userId] as const;
export const INTEREST_CATEGORIES_KEY = ['interest-categories'] as const;
export const PREDEFINED_INTERESTS_KEY = (categoryId?: string) => 
  categoryId ? ['predefined-interests', categoryId] : ['predefined-interests'] as const;
export const MATCH_COUNT_ESTIMATE_KEY = (userId: string, preferences?: Partial<UserPreferences>) =>
  ['match-count-estimate', userId, preferences] as const;

/**
 * Hook to get user preferences
 */
export function useUserPreferences(userId: string | null | undefined) {
  return useQuery({
    queryKey: userId ? USER_PREFERENCES_KEY(userId) : ['preferences', 'null'],
    queryFn: () => {
      if (!userId) throw new Error('User ID is required');
      return getUserPreferences(userId);
    },
    enabled: !!userId,
  });
}

/**
 * Hook to update user preferences
 */
export function useUpdatePreferences() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, preferences }: { userId: string; preferences: Partial<UserPreferences> }) =>
      updateUserPreferences(userId, preferences),
    onSuccess: (data, variables) => {
      // Invalidate preferences query
      queryClient.invalidateQueries({ queryKey: USER_PREFERENCES_KEY(variables.userId) });
      // Invalidate match count estimate
      queryClient.invalidateQueries({ queryKey: ['match-count-estimate'] });
      // Invalidate matching queries to refresh filtered results
      queryClient.invalidateQueries({ queryKey: ['duos', 'active'] });
    },
  });
}

/**
 * Hook to get user interests
 */
export function useUserInterests(userId: string | null | undefined) {
  return useQuery({
    queryKey: userId ? USER_INTERESTS_KEY(userId) : ['interests', 'null'],
    queryFn: () => {
      if (!userId) throw new Error('User ID is required');
      return getUserInterests(userId);
    },
    enabled: !!userId,
  });
}

/**
 * Hook to add user interest
 */
export function useAddInterest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, interest }: { userId: string; interest: string }) =>
      addUserInterest(userId, interest),
    onSuccess: (data, variables) => {
      // Invalidate interests query
      queryClient.invalidateQueries({ queryKey: USER_INTERESTS_KEY(variables.userId) });
      // Invalidate matching queries
      queryClient.invalidateQueries({ queryKey: ['duos', 'active'] });
    },
  });
}

/**
 * Hook to remove user interest
 */
export function useRemoveInterest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, interest }: { userId: string; interest: string }) =>
      removeUserInterest(userId, interest),
    onSuccess: (data, variables) => {
      // Invalidate interests query
      queryClient.invalidateQueries({ queryKey: USER_INTERESTS_KEY(variables.userId) });
      // Invalidate matching queries
      queryClient.invalidateQueries({ queryKey: ['duos', 'active'] });
    },
  });
}

/**
 * Hook to get interest categories
 */
export function useInterestCategories() {
  return useQuery({
    queryKey: INTEREST_CATEGORIES_KEY,
    queryFn: getInterestCategories,
    staleTime: 1000 * 60 * 60, // Cache for 1 hour (categories don't change often)
  });
}

/**
 * Hook to get predefined interests
 */
export function usePredefinedInterests(categoryId?: string) {
  return useQuery({
    queryKey: PREDEFINED_INTERESTS_KEY(categoryId),
    queryFn: () => getPredefinedInterests(categoryId),
    staleTime: 1000 * 60 * 60, // Cache for 1 hour
  });
}

/**
 * Hook to get match count estimate
 */
export function useMatchCountEstimate(
  userId: string | null | undefined,
  preferences?: Partial<UserPreferences>
) {
  return useQuery({
    queryKey: userId ? MATCH_COUNT_ESTIMATE_KEY(userId, preferences) : ['match-count-estimate', 'null'],
    queryFn: () => {
      if (!userId) throw new Error('User ID is required');
      return getMatchCountEstimate(userId, preferences);
    },
    enabled: !!userId,
  });
}

/**
 * Hook to get user demographics
 */
export function useUserDemographics(userId: string | null | undefined) {
  return useQuery({
    queryKey: userId ? ['demographics', userId] : ['demographics', 'null'],
    queryFn: () => {
      if (!userId) throw new Error('User ID is required');
      return getUserDemographics(userId);
    },
    enabled: !!userId,
  });
}

/**
 * Hook to update user demographics
 */
export function useUpdateDemographics() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, demographics }: { userId: string; demographics: Partial<ProfileDemographics> }) =>
      updateUserDemographics(userId, demographics),
    onSuccess: (data, variables) => {
      // Invalidate current user query
      queryClient.invalidateQueries({ queryKey: CURRENT_USER_KEY });
      // Invalidate demographics query
      queryClient.invalidateQueries({ queryKey: ['demographics', variables.userId] });
      // Invalidate matching queries
      queryClient.invalidateQueries({ queryKey: ['duos', 'active'] });
    },
  });
}

