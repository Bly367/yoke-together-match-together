import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useSessionTimeout } from '../useSessionTimeout';
import { supabase } from '@/integrations/supabase/client';
import * as useAuth from '../useAuth';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      refreshSession: vi.fn(),
    },
  },
}));

vi.mock('../useAuth');

describe('useSessionTimeout', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    vi.clearAllMocks();
    vi.mocked(useAuth.useAuth).mockReturnValue({
      user: { id: 'user1' } as any,
      isLoading: false,
      error: null,
      isAuthenticated: true,
      signOut: vi.fn(),
      isSigningOut: false,
      signOutError: null,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };

  describe('useSessionTimeout', () => {
    it('should monitor session expiry', async () => {
      const futureTime = Math.floor((Date.now() + 3600000) / 1000); // 1 hour from now
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: {
          session: {
            expires_at: futureTime,
            access_token: 'token',
            refresh_token: 'refresh',
          },
        },
        error: null,
      } as any);

      const { result } = renderHook(() => useSessionTimeout(), { wrapper });

      await waitFor(() => {
        expect(result.current.timeUntilExpiry).toBeGreaterThan(0);
      });

      expect(result.current.isExpiring).toBe(false);
    });

    it('should show warning when session is expiring', async () => {
      const nearExpiryTime = Math.floor((Date.now() + 4 * 60 * 1000) / 1000); // 4 minutes from now
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: {
          session: {
            expires_at: nearExpiryTime,
            access_token: 'token',
            refresh_token: 'refresh',
          },
        },
        error: null,
      } as any);

      const onSessionExpiring = vi.fn();
      const { result } = renderHook(() => useSessionTimeout(onSessionExpiring), { wrapper });

      await waitFor(() => {
        expect(result.current.isExpiring).toBe(true);
      });

      expect(onSessionExpiring).toHaveBeenCalled();
    });

    it('should refresh session', async () => {
      const futureTime = Math.floor((Date.now() + 3600000) / 1000);
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: {
          session: {
            expires_at: futureTime,
            access_token: 'token',
            refresh_token: 'refresh',
          },
        },
        error: null,
      } as any);

      vi.mocked(supabase.auth.refreshSession).mockResolvedValue({
        data: {
          session: {
            expires_at: futureTime,
            access_token: 'new-token',
            refresh_token: 'new-refresh',
          },
        },
        error: null,
      } as any);

      const { result } = renderHook(() => useSessionTimeout(), { wrapper });

      await waitFor(() => {
        expect(result.current.refreshSession).toBeDefined();
      });

      if (result.current.refreshSession) {
        await act(async () => {
          await result.current.refreshSession!();
        });
        expect(supabase.auth.refreshSession).toHaveBeenCalled();
      }
    });
  });
});

