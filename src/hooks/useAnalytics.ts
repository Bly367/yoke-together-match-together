import { useQuery } from '@tanstack/react-query';
import { getPreferenceAnalytics, getUserPreferenceAnalytics } from '@/services/analytics.service';

/**
 * React Query hook for getting preference analytics
 */
export function usePreferenceAnalytics(days: number = 30) {
  return useQuery({
    queryKey: ['preferenceAnalytics', days],
    queryFn: () => getPreferenceAnalytics(undefined, days),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * React Query hook for getting user-specific preference analytics
 */
export function useUserPreferenceAnalytics(userId: string | null, days: number = 30) {
  return useQuery({
    queryKey: ['userPreferenceAnalytics', userId, days],
    queryFn: () => {
      if (!userId) throw new Error('User ID is required');
      return getUserPreferenceAnalytics(userId, days);
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

