import { useQuery } from '@tanstack/react-query';
import { getCostMetrics } from '@/services/costMonitoring.service';

/**
 * React Query hook for getting cost metrics
 */
export function useCostMetrics() {
  return useQuery({
    queryKey: ['costMetrics'],
    queryFn: () => getCostMetrics(),
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Refetch every minute
  });
}

