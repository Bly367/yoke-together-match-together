import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import {
  getAvailableGames,
  getGameById,
  createGameSession,
  joinGameSession,
  leaveGameSession,
  getGameSession,
  getGameSessionsForMatch,
  submitGameAction,
  getGameActions,
  updateGameSessionState,
  completeGameSession,
  getGameResults,
  subscribeToGameSession,
  subscribeToGameActions,
  subscribeToGameSessionPlayers,
  type Game,
  type GameSession,
  type GameSessionPlayer,
  type GameAction,
  type GameResult,
} from '@/services/games.service';
import { useEffect, useRef } from 'react';
import { logger } from '@/lib/logger';

/**
 * Query keys for games
 */
export const GAMES_QUERY_KEYS = {
  all: ['games'] as const,
  available: () => [...GAMES_QUERY_KEYS.all, 'available'] as const,
  game: (gameId: string) => [...GAMES_QUERY_KEYS.all, 'game', gameId] as const,
  sessions: (matchId: string) => [...GAMES_QUERY_KEYS.all, 'sessions', matchId] as const,
  session: (sessionId: string) => [...GAMES_QUERY_KEYS.all, 'session', sessionId] as const,
  actions: (sessionId: string) => [...GAMES_QUERY_KEYS.all, 'actions', sessionId] as const,
  results: (sessionId: string) => [...GAMES_QUERY_KEYS.all, 'results', sessionId] as const,
};

/**
 * Hook to get all available games
 * 
 * @returns Query result with available games
 */
export function useAvailableGames() {
  return useQuery({
    queryKey: GAMES_QUERY_KEYS.available(),
    queryFn: getAvailableGames,
    staleTime: 5 * 60 * 1000, // 5 minutes - games don't change often
  });
}

/**
 * Hook to get a game by ID
 * 
 * @param gameId - ID of the game
 * @param enabled - Whether the query should run (default: true)
 * @returns Query result with game or null
 */
export function useGame(gameId: string | null, enabled: boolean = true) {
  return useQuery({
    queryKey: gameId ? GAMES_QUERY_KEYS.game(gameId) : ['games', 'game', null],
    queryFn: () => {
      if (!gameId) return null;
      return getGameById(gameId);
    },
    enabled: enabled && !!gameId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to get game sessions for a match
 * 
 * @param matchId - ID of the match
 * @param includeCompleted - Whether to include completed sessions
 * @param enabled - Whether the query should run (default: true)
 * @returns Query result with game sessions
 */
export function useGameSessionsForMatch(
  matchId: string | null,
  includeCompleted: boolean = false,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: matchId ? [...GAMES_QUERY_KEYS.sessions(matchId), includeCompleted] : ['games', 'sessions', null],
    queryFn: () => {
      if (!matchId) return [];
      return getGameSessionsForMatch(matchId, includeCompleted);
    },
    enabled: enabled && !!matchId,
    staleTime: 30 * 1000, // 30 seconds - sessions change frequently
  });
}

/**
 * Hook to get a game session by ID with real-time updates
 * 
 * @param sessionId - ID of the session
 * @param enabled - Whether the query should run (default: true)
 * @returns Query result with game session
 */
export function useGameSession(sessionId: string | null, enabled: boolean = true) {
  const queryClient = useQueryClient();
  const unsubscribeRef = useRef<(() => void) | null>(null);

  const query = useQuery({
    queryKey: sessionId ? GAMES_QUERY_KEYS.session(sessionId) : ['games', 'session', null],
    queryFn: () => {
      if (!sessionId) return null;
      return getGameSession(sessionId);
    },
    enabled: enabled && !!sessionId,
    staleTime: 10 * 1000, // 10 seconds - session state changes frequently
  });

  // Set up real-time subscription
  useEffect(() => {
    if (!sessionId || !enabled) {
      return;
    }

    // Subscribe to session updates
    const unsubscribeSession = subscribeToGameSession(sessionId, (session) => {
      queryClient.setQueryData(GAMES_QUERY_KEYS.session(sessionId), session);
    });

    // Subscribe to player updates
    const unsubscribePlayers = subscribeToGameSessionPlayers(sessionId, (player) => {
      queryClient.setQueryData<GameSession | null>(
        GAMES_QUERY_KEYS.session(sessionId),
        (old) => {
          if (!old) return old;
          const existingPlayerIndex = old.players?.findIndex(p => p.user_id === player.user_id) ?? -1;
          if (existingPlayerIndex >= 0 && old.players) {
            const updatedPlayers = [...old.players];
            updatedPlayers[existingPlayerIndex] = player;
            return { ...old, players: updatedPlayers };
          }
          return { ...old, players: [...(old.players || []), player] };
        }
      );
    });

    unsubscribeRef.current = () => {
      unsubscribeSession();
      unsubscribePlayers();
    };

    return () => {
      unsubscribeSession();
      unsubscribePlayers();
    };
  }, [sessionId, enabled, queryClient]);

  return query;
}

/**
 * Hook to get game actions for a session with real-time updates
 * 
 * @param sessionId - ID of the session
 * @param roundNumber - Optional round number filter
 * @param enabled - Whether the query should run (default: true)
 * @returns Query result with game actions
 */
export function useGameActions(
  sessionId: string | null,
  roundNumber?: number,
  enabled: boolean = true
) {
  const queryClient = useQueryClient();
  const unsubscribeRef = useRef<(() => void) | null>(null);

  const query = useQuery({
    queryKey: sessionId
      ? [...GAMES_QUERY_KEYS.actions(sessionId), roundNumber]
      : ['games', 'actions', null],
    queryFn: () => {
      if (!sessionId) return [];
      return getGameActions(sessionId, roundNumber);
    },
    enabled: enabled && !!sessionId,
    staleTime: 5 * 1000, // 5 seconds - actions come in frequently
  });

  // Set up real-time subscription
  useEffect(() => {
    if (!sessionId || !enabled) {
      return;
    }

    const unsubscribe = subscribeToGameActions(sessionId, (action) => {
      queryClient.setQueryData<GameAction[]>(
        [...GAMES_QUERY_KEYS.actions(sessionId), roundNumber],
        (old) => {
          const existing = old || [];
          // Check if action already exists
          if (existing.some(a => a.id === action.id)) {
            return existing.map(a => (a.id === action.id ? action : a));
          }
          return [...existing, action];
        }
      );
    });

    unsubscribeRef.current = unsubscribe;

    return unsubscribe;
  }, [sessionId, roundNumber, enabled, queryClient]);

  return query;
}

/**
 * Hook to get game results for a session
 * 
 * @param sessionId - ID of the session
 * @param enabled - Whether the query should run (default: true)
 * @returns Query result with game results
 */
export function useGameResults(sessionId: string | null, enabled: boolean = true) {
  return useQuery({
    queryKey: sessionId ? GAMES_QUERY_KEYS.results(sessionId) : ['games', 'results', null],
    queryFn: () => {
      if (!sessionId) return [];
      return getGameResults(sessionId);
    },
    enabled: enabled && !!sessionId,
    staleTime: 5 * 60 * 1000, // 5 minutes - results don't change after completion
  });
}

/**
 * Hook to create a game session
 * 
 * @returns Mutation for creating a game session
 */
export function useCreateGameSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      matchId,
      gameId,
      createdBy,
      initialGameState,
    }: {
      matchId: string;
      gameId: string;
      createdBy: string;
      initialGameState?: Record<string, unknown>;
    }) => createGameSession(matchId, gameId, createdBy, initialGameState),
    onSuccess: (session) => {
      // Invalidate sessions list for the match
      queryClient.invalidateQueries({
        queryKey: GAMES_QUERY_KEYS.sessions(session.match_id),
      });
      // Set the new session in cache
      queryClient.setQueryData(GAMES_QUERY_KEYS.session(session.id), session);
    },
    onError: (error) => {
      logger.error('Error creating game session', error);
    },
  });
}

/**
 * Hook to join a game session
 * 
 * @returns Mutation for joining a game session
 */
export function useJoinGameSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ sessionId, userId }: { sessionId: string; userId: string }) =>
      joinGameSession(sessionId, userId),
    onSuccess: (player, variables) => {
      // Invalidate session to refetch with updated players
      queryClient.invalidateQueries({
        queryKey: GAMES_QUERY_KEYS.session(variables.sessionId),
      });
      // Invalidate sessions list for the match
      queryClient.invalidateQueries({
        queryKey: GAMES_QUERY_KEYS.all,
      });
    },
    onError: (error) => {
      logger.error('Error joining game session', error);
    },
  });
}

/**
 * Hook to leave a game session
 * 
 * @returns Mutation for leaving a game session
 */
export function useLeaveGameSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ sessionId, userId }: { sessionId: string; userId: string }) =>
      leaveGameSession(sessionId, userId),
    onSuccess: (_, variables) => {
      // Invalidate session to refetch with updated players
      queryClient.invalidateQueries({
        queryKey: GAMES_QUERY_KEYS.session(variables.sessionId),
      });
      // Invalidate sessions list for the match
      queryClient.invalidateQueries({
        queryKey: GAMES_QUERY_KEYS.all,
      });
    },
    onError: (error) => {
      logger.error('Error leaving game session', error);
    },
  });
}

/**
 * Hook to submit a game action
 * 
 * @returns Mutation for submitting a game action
 */
export function useSubmitGameAction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      sessionId,
      userId,
      actionType,
      actionData,
      roundNumber,
    }: {
      sessionId: string;
      userId: string;
      actionType: string;
      actionData: Record<string, unknown>;
      roundNumber?: number;
    }) => submitGameAction(sessionId, userId, actionType, actionData, roundNumber),
    onSuccess: (action, variables) => {
      // Optimistically add action to cache
      queryClient.setQueryData<GameAction[]>(
        [...GAMES_QUERY_KEYS.actions(variables.sessionId), variables.roundNumber],
        (old) => {
          const existing = old || [];
          // Check if already exists (from real-time subscription)
          if (existing.some(a => a.id === action.id)) {
            return existing;
          }
          return [...existing, action];
        }
      );
      // Invalidate session to refetch with updated state
      queryClient.invalidateQueries({
        queryKey: GAMES_QUERY_KEYS.session(variables.sessionId),
      });
    },
    onError: (error) => {
      logger.error('Error submitting game action', error);
    },
  });
}

/**
 * Hook to update game session state
 * 
 * @returns Mutation for updating game session state
 */
export function useUpdateGameSessionState() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      sessionId,
      gameState,
      status,
      currentTurnUserId,
    }: {
      sessionId: string;
      gameState?: Record<string, unknown>;
      status?: 'waiting' | 'active' | 'completed' | 'abandoned';
      currentTurnUserId?: string | null;
    }) => updateGameSessionState(sessionId, gameState, status, currentTurnUserId),
    onSuccess: (session) => {
      // Update session in cache
      queryClient.setQueryData(GAMES_QUERY_KEYS.session(session.id), session);
      // Invalidate sessions list for the match
      queryClient.invalidateQueries({
        queryKey: GAMES_QUERY_KEYS.sessions(session.match_id),
      });
    },
    onError: (error) => {
      logger.error('Error updating game session state', error);
    },
  });
}

/**
 * Hook to complete a game session
 * 
 * @returns Mutation for completing a game session
 */
export function useCompleteGameSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      sessionId,
      results,
    }: {
      sessionId: string;
      results: Array<{
        user_id: string;
        final_score: number;
        rank: number;
        achievements?: string[];
      }>;
    }) => completeGameSession(sessionId, results),
    onSuccess: (_, variables) => {
      // Invalidate session to refetch with completed status
      queryClient.invalidateQueries({
        queryKey: GAMES_QUERY_KEYS.session(variables.sessionId),
      });
      // Invalidate results
      queryClient.invalidateQueries({
        queryKey: GAMES_QUERY_KEYS.results(variables.sessionId),
      });
      // Invalidate sessions list for the match
      queryClient.invalidateQueries({
        queryKey: GAMES_QUERY_KEYS.all,
      });
    },
    onError: (error) => {
      logger.error('Error completing game session', error);
    },
  });
}

