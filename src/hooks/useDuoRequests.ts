import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import {
  createDuoRequest,
  getDuoRequests,
  getPendingRequests,
  acceptDuoRequest,
  rejectDuoRequest,
  cancelDuoRequest,
  leaveDuo,
  subscribeToDuoRequests,
  type DuoRequest,
} from '@/services/duoRequest.service';
import { useAuth } from './useAuth';
import { requestNotificationPermission, notifyNewDuoRequest, areNotificationsEnabled } from '@/lib/notifications';

/**
 * Query keys
 */
const DUO_REQUESTS_QUERY_KEY = (userId: string) => ['duo-requests', userId] as const;
const PENDING_REQUESTS_QUERY_KEY = (userId: string) => ['duo-requests', 'pending', userId] as const;

/**
 * Hook to get all duo requests (sent and received)
 */
export function useDuoRequests() {
  const { user } = useAuth();

  return useQuery({
    queryKey: DUO_REQUESTS_QUERY_KEY(user?.id || ''),
    queryFn: () => getDuoRequests(user!.id),
    enabled: !!user,
    placeholderData: { sent: [], received: [] },
  });
}

/**
 * Hook to get pending requests received by the user with real-time updates
 */
export function usePendingRequests() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const unsubscribeRef = useRef<(() => void) | null>(null);

  const query = useQuery({
    queryKey: PENDING_REQUESTS_QUERY_KEY(user?.id || ''),
    queryFn: () => getPendingRequests(user!.id),
    enabled: !!user,
    placeholderData: [],
  });

  // Request notification permission on mount
  useEffect(() => {
    if (user?.id) {
      requestNotificationPermission().catch(() => {
        // Silently fail if permission denied
      });
    }
  }, [user?.id]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!user?.id) return;

    const unsubscribe = subscribeToDuoRequests(user.id, {
      onNewRequest: (newRequest) => {
        // Show browser notification if enabled
        if (areNotificationsEnabled() && newRequest.requester?.name) {
          notifyNewDuoRequest(newRequest.requester.name);
        }

        // Add new request to cache
        queryClient.setQueryData(
          PENDING_REQUESTS_QUERY_KEY(user.id),
          (old: DuoRequest[] = []) => {
            // Check if request already exists to avoid duplicates
            if (old.some(r => r.id === newRequest.id)) return old;
            // Add new request at the beginning (most recent first)
            return [newRequest, ...old];
          }
        );
        // Also invalidate all requests query
        queryClient.invalidateQueries({ queryKey: DUO_REQUESTS_QUERY_KEY(user.id) });
      },
      onRequestUpdate: (updatedRequest) => {
        // Update cache if request status changed
        queryClient.setQueryData(
          PENDING_REQUESTS_QUERY_KEY(user.id),
          (old: DuoRequest[] = []) => {
            if (updatedRequest.status === 'pending') {
              // Update existing or add new
              const index = old.findIndex(r => r.id === updatedRequest.id);
              if (index >= 0) {
                const updated = [...old];
                updated[index] = updatedRequest;
                return updated;
              }
              return [updatedRequest, ...old];
            } else {
              // Remove if no longer pending
              return old.filter(r => r.id !== updatedRequest.id);
            }
          }
        );
        // Invalidate all requests query
        queryClient.invalidateQueries({ queryKey: DUO_REQUESTS_QUERY_KEY(user.id) });
      },
    });

    unsubscribeRef.current = unsubscribe;

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [user?.id, queryClient]);

  return query;
}

/**
 * Hook to create a duo request
 */
export function useCreateDuoRequest() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: ({
      requestedId,
      message,
      duoName,
      tagline,
      bio,
      interests,
      photoUrl,
      expiresInDays,
    }: {
      requestedId: string;
      message?: string;
      duoName?: string;
      tagline?: string;
      bio?: string;
      interests?: string[];
      photoUrl?: string;
      expiresInDays?: number;
    }) => {
      if (!user) throw new Error('User must be authenticated');
      return createDuoRequest(user.id, requestedId, {
        message,
        duoName,
        tagline,
        bio,
        interests,
        photoUrl,
        expiresInDays,
      });
    },
    onSuccess: () => {
      if (user) {
        queryClient.invalidateQueries({ queryKey: DUO_REQUESTS_QUERY_KEY(user.id) });
        queryClient.invalidateQueries({ queryKey: PENDING_REQUESTS_QUERY_KEY(user.id) });
      }
    },
  });
}

/**
 * Hook to accept a duo request
 */
export function useAcceptDuoRequest() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (requestId: string) => acceptDuoRequest(requestId),
    onSuccess: () => {
      if (user) {
        queryClient.invalidateQueries({ queryKey: ['duo-requests'] });
        queryClient.invalidateQueries({ queryKey: ['duos'] });
        queryClient.invalidateQueries({ queryKey: PENDING_REQUESTS_QUERY_KEY(user.id) });
      }
    },
  });
}

/**
 * Hook to reject a duo request
 */
export function useRejectDuoRequest() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (requestId: string) => rejectDuoRequest(requestId),
    onSuccess: () => {
      if (user) {
        queryClient.invalidateQueries({ queryKey: ['duo-requests'] });
        queryClient.invalidateQueries({ queryKey: PENDING_REQUESTS_QUERY_KEY(user.id) });
      }
    },
  });
}

/**
 * Hook to cancel a duo request
 */
export function useCancelDuoRequest() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (requestId: string) => cancelDuoRequest(requestId),
    onSuccess: () => {
      if (user) {
        queryClient.invalidateQueries({ queryKey: ['duo-requests'] });
        queryClient.invalidateQueries({ queryKey: PENDING_REQUESTS_QUERY_KEY(user.id) });
      }
    },
  });
}

/**
 * Hook to leave a duo
 */
export function useLeaveDuo() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (duoId: string) => {
      if (!user) throw new Error('User must be authenticated');
      return leaveDuo(duoId, user.id);
    },
    onSuccess: () => {
      if (user) {
        queryClient.invalidateQueries({ queryKey: ['duos'] });
        queryClient.invalidateQueries({ queryKey: USER_DUOS_QUERY_KEY(user.id) });
      }
    },
  });
}

// Import USER_DUOS_QUERY_KEY - need to export it from useDuos
// For now, define it here to avoid circular dependency
const USER_DUOS_QUERY_KEY = (userId: string) => ['duos', 'user', userId] as const;

