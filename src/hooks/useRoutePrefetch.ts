import { useCallback } from 'react';
import { ROUTES } from '@/lib/routes';

/**
 * Route component imports - map paths to their lazy-loaded components
 * This allows us to preload components before navigation
 */
const routeComponents: Record<string, () => Promise<any>> = {
  [ROUTES.MATCHMAKING]: () => import('@/pages/Matchmaking'),
  [ROUTES.MESSAGES]: () => import('@/pages/Messages'),
  [ROUTES.MATCHES]: () => import('@/pages/Matches'),
  [ROUTES.PROFILE]: () => import('@/pages/Profile'),
  [ROUTES.PROFILE_SETUP]: () => import('@/pages/ProfileSetup'),
  [ROUTES.DUO_SETUP]: () => import('@/pages/DuoSetup'),
  [ROUTES.CHAT_BASE]: () => import('@/pages/Chat'),
  [ROUTES.INDEX]: () => import('@/pages/Index'),
};

/**
 * Route prefetching hook
 * Prefetches route components on hover/focus for faster navigation
 * Actually preloads React components, not just static assets
 */
export function useRoutePrefetch() {
  /**
   * Prefetch a route by preloading its React component
   */
  const prefetchRoute = useCallback((path: string) => {
    // Find matching route component
    const routeKey = Object.keys(routeComponents).find(key => {
      if (key === ROUTES.CHAT_BASE) {
        // Chat routes have dynamic matchId, so match base path
        return path.startsWith(ROUTES.CHAT_BASE);
      }
      return path === key;
    });

    if (routeKey && routeComponents[routeKey]) {
      // Preload the component module
      routeComponents[routeKey]().catch(() => {
        // Silently fail if prefetch fails (component will load on navigation)
      });
    }
  }, []);

  /**
   * Prefetch route on hover/focus
   */
  const handlePrefetch = useCallback((path: string) => {
    prefetchRoute(path);
  }, [prefetchRoute]);

  return { prefetchRoute, handlePrefetch };
}

/**
 * Hook to prefetch routes on navigation link hover
 */
export function usePrefetchOnHover(path: string) {
  const { handlePrefetch } = useRoutePrefetch();

  const handleMouseEnter = useCallback(() => {
    handlePrefetch(path);
  }, [path, handlePrefetch]);

  const handleFocus = useCallback(() => {
    handlePrefetch(path);
  }, [path, handlePrefetch]);

  return { handleMouseEnter, handleFocus };
}

