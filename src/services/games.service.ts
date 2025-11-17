import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

/**
 * Game definition
 */
export interface Game {
  id: string;
  name: string;
  description: string;
  rules: string;
  min_players: number;
  max_players: number;
  estimated_duration_minutes?: number;
  category?: 'ice-breaker' | 'trivia' | 'comparison' | 'quiz' | 'other';
  is_active: boolean;
  created_at: string;
}

/**
 * Game session status
 */
export type GameSessionStatus = 'waiting' | 'active' | 'completed' | 'abandoned';

/**
 * Game session with related data
 */
export interface GameSession {
  id: string;
  match_id: string;
  game_id: string;
  created_by: string;
  status: GameSessionStatus;
  current_turn_user_id?: string | null;
  game_state: Record<string, unknown>; // JSONB parsed as object
  started_at?: string | null;
  completed_at?: string | null;
  created_at: string;
  updated_at: string;
  game?: Game;
  players?: GameSessionPlayer[];
  match?: {
    id: string;
    duo1_id: string;
    duo2_id: string;
  };
}

/**
 * Game session player
 */
export interface GameSessionPlayer {
  session_id: string;
  user_id: string;
  joined_at: string;
  left_at?: string | null;
  score: number;
  is_active: boolean;
  user?: {
    id: string;
    name: string;
    photo_url?: string;
  };
}

/**
 * Game action
 */
export interface GameAction {
  id: string;
  session_id: string;
  user_id: string;
  action_type: string;
  action_data: Record<string, unknown>; // JSONB parsed as object
  round_number: number;
  created_at: string;
  user?: {
    id: string;
    name: string;
    photo_url?: string;
  };
}

/**
 * Game result
 */
export interface GameResult {
  id: string;
  session_id: string;
  user_id: string;
  final_score: number;
  rank?: number | null;
  achievements: string[];
  created_at: string;
  user?: {
    id: string;
    name: string;
    photo_url?: string;
  };
}

/**
 * Get all available games
 * 
 * Retrieves all active games that users can play. Games are filtered by
 * is_active flag and ordered by category and name.
 * 
 * @returns Promise resolving to array of active games
 * @throws {Error} If query fails
 * 
 * @example
 * ```typescript
 * const games = await getAvailableGames();
 * console.log(`Found ${games.length} games available`);
 * ```
 */
export async function getAvailableGames(): Promise<Game[]> {
  const { data, error } = await supabase
    .from('games')
    .select('*')
    .eq('is_active', true)
    .order('category', { ascending: true })
    .order('name', { ascending: true });

  if (error) {
    logger.error('Error fetching available games', error);
    throw error;
  }

  return (data || []) as Game[];
}

/**
 * Get a game by ID
 * 
 * @param gameId - ID of the game to retrieve
 * @returns Promise resolving to game or null if not found
 * @throws {Error} If query fails
 */
export async function getGameById(gameId: string): Promise<Game | null> {
  const { data, error } = await supabase
    .from('games')
    .select('*')
    .eq('id', gameId)
    .eq('is_active', true)
    .maybeSingle();

  if (error) {
    logger.error('Error fetching game by ID', error, { gameId });
    throw error;
  }

  return (data || null) as Game | null;
}

/**
 * Create a new game session
 * 
 * Creates a game session for a match. Validates that the match exists,
 * the game exists, and the user is a participant in the match. Initializes
 * the session with 'waiting' status and adds the creator as the first player.
 * 
 * @param matchId - ID of the match to create session for
 * @param gameId - ID of the game to play
 * @param createdBy - ID of the user creating the session
 * @param initialGameState - Optional initial game state (JSONB)
 * @returns Promise resolving to the created game session
 * @throws {Error} If match doesn't exist or user is not a participant
 * @throws {Error} If game doesn't exist or is not active
 * @throws {Error} If session creation fails
 * 
 * @example
 * ```typescript
 * const session = await createGameSession('match-id', 'game-id', 'user-id');
 * console.log('Session created:', session.id);
 * ```
 */
export async function createGameSession(
  matchId: string,
  gameId: string,
  createdBy: string,
  initialGameState?: Record<string, unknown>
): Promise<GameSession> {
  // Validate match exists and user is a participant
  const { data: match, error: matchError } = await supabase
    .from('matches')
    .select('id, duo1_id, duo2_id')
    .eq('id', matchId)
    .eq('is_active', true)
    .maybeSingle();

  if (matchError) {
    logger.error('Error validating match', matchError, { matchId });
    throw matchError;
  }

  if (!match) {
    throw new Error('Match not found or is not active');
  }

  // Verify user is in one of the duos
  const { data: userDuos, error: duosError } = await supabase
    .from('duos')
    .select('id')
    .or(`member1_id.eq.${createdBy},member2_id.eq.${createdBy}`)
    .in('id', [match.duo1_id, match.duo2_id])
    .eq('is_active', true);

  if (duosError) {
    logger.error('Error validating user duos', duosError, { matchId, createdBy });
    throw duosError;
  }

  if (!userDuos || userDuos.length === 0) {
    throw new Error('User is not a participant in this match');
  }

  // Validate game exists and is active
  const game = await getGameById(gameId);
  if (!game) {
    throw new Error('Game not found or is not active');
  }

  // Create session
  const { data: session, error: sessionError } = await supabase
    .from('game_sessions')
    .insert({
      match_id: matchId,
      game_id: gameId,
      created_by: createdBy,
      status: 'waiting',
      game_state: initialGameState || {},
    })
    .select(`
      *,
      game:games(*)
    `)
    .single();

  if (sessionError) {
    logger.error('Error creating game session', sessionError, { matchId, gameId, createdBy });
    throw sessionError;
  }

  // Add creator as first player
  await joinGameSession(session.id, createdBy);

  return session as GameSession;
}

/**
 * Join a game session
 * 
 * Adds a user to a game session. Validates that the session exists,
 * the user is a participant in the match, and the session hasn't reached
 * max players. Updates session status to 'active' if min players reached.
 * 
 * @param sessionId - ID of the session to join
 * @param userId - ID of the user joining
 * @returns Promise resolving to the updated player record
 * @throws {Error} If session doesn't exist or is not joinable
 * @throws {Error} If user is not a participant in the match
 * @throws {Error} If session has reached max players
 * 
 * @example
 * ```typescript
 * await joinGameSession('session-id', 'user-id');
 * console.log('Joined game session');
 * ```
 */
export async function joinGameSession(sessionId: string, userId: string): Promise<GameSessionPlayer> {
  // Get session with game info
  const { data: session, error: sessionError } = await supabase
    .from('game_sessions')
    .select(`
      *,
      game:games(*)
    `)
    .eq('id', sessionId)
    .maybeSingle();

  if (sessionError) {
    logger.error('Error fetching session', sessionError, { sessionId });
    throw sessionError;
  }

  if (!session) {
    throw new Error('Game session not found');
  }

  if (session.status !== 'waiting' && session.status !== 'active') {
    throw new Error(`Cannot join session with status: ${session.status}`);
  }

  // Validate user is in the match
  const { data: match, error: matchError } = await supabase
    .from('matches')
    .select('duo1_id, duo2_id')
    .eq('id', session.match_id)
    .eq('is_active', true)
    .maybeSingle();

  if (matchError) {
    logger.error('Error validating match', matchError, { sessionId });
    throw matchError;
  }

  if (!match) {
    throw new Error('Match not found');
  }

  // Verify user is in one of the duos
  const { data: userDuos, error: duosError } = await supabase
    .from('duos')
    .select('id')
    .or(`member1_id.eq.${userId},member2_id.eq.${userId}`)
    .in('id', [match.duo1_id, match.duo2_id])
    .eq('is_active', true);

  if (duosError) {
    logger.error('Error validating user duos', duosError, { sessionId, userId });
    throw duosError;
  }

  if (!userDuos || userDuos.length === 0) {
    throw new Error('User is not a participant in this match');
  }

  // Check current player count
  const { data: currentPlayers, error: playersError } = await supabase
    .from('game_session_players')
    .select('user_id')
    .eq('session_id', sessionId)
    .eq('is_active', true);

  if (playersError) {
    logger.error('Error checking current players', playersError, { sessionId });
    throw playersError;
  }

  const currentPlayerCount = (currentPlayers || []).length;
  const game = session.game as Game;

  if (currentPlayerCount >= game.max_players) {
    throw new Error('Game session has reached maximum players');
  }

  // Check if user is already a player
  const { data: existingPlayer } = await supabase
    .from('game_session_players')
    .select('*')
    .eq('session_id', sessionId)
    .eq('user_id', userId)
    .maybeSingle();

  if (existingPlayer) {
    // Re-join if they left
    if (!existingPlayer.is_active) {
      const { data: updated, error: updateError } = await supabase
        .from('game_session_players')
        .update({
          is_active: true,
          left_at: null,
        })
        .eq('session_id', sessionId)
        .eq('user_id', userId)
        .select(`
          *,
          user:profiles!game_session_players_user_id_fkey(id, name, photo_url)
        `)
        .single();

      if (updateError) {
        logger.error('Error re-joining session', updateError, { sessionId, userId });
        throw updateError;
      }

      // Update session status if needed
      if (currentPlayerCount + 1 >= game.min_players && session.status === 'waiting') {
        await supabase
          .from('game_sessions')
          .update({ status: 'active', started_at: new Date().toISOString() })
          .eq('id', sessionId);
      }

      return updated as GameSessionPlayer;
    }
    return existingPlayer as GameSessionPlayer;
  }

  // Add new player
  const { data: player, error: playerError } = await supabase
    .from('game_session_players')
    .insert({
      session_id: sessionId,
      user_id: userId,
      is_active: true,
    })
    .select(`
      *,
      user:profiles!game_session_players_user_id_fkey(id, name, photo_url)
    `)
    .single();

  if (playerError) {
    logger.error('Error joining session', playerError, { sessionId, userId });
    throw playerError;
  }

  // Update session status if min players reached
  if (currentPlayerCount + 1 >= game.min_players && session.status === 'waiting') {
    await supabase
      .from('game_sessions')
      .update({ status: 'active', started_at: new Date().toISOString() })
      .eq('id', sessionId);
  }

  return player as GameSessionPlayer;
}

/**
 * Leave a game session
 * 
 * Marks a player as inactive in a game session. If active players drop
 * below min_players, the session status is set to 'abandoned'.
 * 
 * @param sessionId - ID of the session to leave
 * @param userId - ID of the user leaving
 * @returns Promise resolving when complete
 * @throws {Error} If session or player not found
 * 
 * @example
 * ```typescript
 * await leaveGameSession('session-id', 'user-id');
 * console.log('Left game session');
 * ```
 */
export async function leaveGameSession(sessionId: string, userId: string): Promise<void> {
  // Get session with game info
  const { data: session, error: sessionError } = await supabase
    .from('game_sessions')
    .select(`
      *,
      game:games(*)
    `)
    .eq('id', sessionId)
    .maybeSingle();

  if (sessionError) {
    logger.error('Error fetching session', sessionError, { sessionId });
    throw sessionError;
  }

  if (!session) {
    throw new Error('Game session not found');
  }

  // Mark player as inactive
  const { error: updateError } = await supabase
    .from('game_session_players')
    .update({
      is_active: false,
      left_at: new Date().toISOString(),
    })
    .eq('session_id', sessionId)
    .eq('user_id', userId);

  if (updateError) {
    logger.error('Error leaving session', updateError, { sessionId, userId });
    throw updateError;
  }

  // Check if active players < min_players
  const { data: activePlayers, error: playersError } = await supabase
    .from('game_session_players')
    .select('user_id', { count: 'exact', head: true })
    .eq('session_id', sessionId)
    .eq('is_active', true);

  if (playersError) {
    logger.error('Error checking active players', playersError, { sessionId });
    throw playersError;
  }

  const activePlayerCount = activePlayers || 0;
  const game = session.game as Game;

  if (activePlayerCount < game.min_players && session.status === 'active') {
    await supabase
      .from('game_sessions')
      .update({ status: 'abandoned' })
      .eq('id', sessionId);
  }
}

/**
 * Get a game session by ID with all related data
 * 
 * @param sessionId - ID of the session to retrieve
 * @returns Promise resolving to game session or null if not found
 * @throws {Error} If query fails
 */
export async function getGameSession(sessionId: string): Promise<GameSession | null> {
  const { data: session, error } = await supabase
    .from('game_sessions')
    .select(`
      *,
      game:games(*),
      players:game_session_players(
        *,
        user:profiles!game_session_players_user_id_fkey(id, name, photo_url)
      ),
      match:matches(id, duo1_id, duo2_id)
    `)
    .eq('id', sessionId)
    .maybeSingle();

  if (error) {
    logger.error('Error fetching game session', error, { sessionId });
    throw error;
  }

  if (!session) return null;

  return session as GameSession;
}

/**
 * Get all game sessions for a match
 * 
 * @param matchId - ID of the match
 * @param includeCompleted - Whether to include completed sessions (default: false)
 * @returns Promise resolving to array of game sessions
 * @throws {Error} If query fails
 */
export async function getGameSessionsForMatch(
  matchId: string,
  includeCompleted: boolean = false
): Promise<GameSession[]> {
  let query = supabase
    .from('game_sessions')
    .select(`
      *,
      game:games(*),
      players:game_session_players(
        *,
        user:profiles!game_session_players_user_id_fkey(id, name, photo_url)
      )
    `)
    .eq('match_id', matchId)
    .order('created_at', { ascending: false });

  if (!includeCompleted) {
    query = query.neq('status', 'completed').neq('status', 'abandoned');
  }

  const { data, error } = await query;

  if (error) {
    logger.error('Error fetching game sessions for match', error, { matchId });
    throw error;
  }

  return (data || []) as GameSession[];
}

/**
 * Submit a game action
 * 
 * Records a player action in a game session. Validates that the session
 * is active, the user is an active player, and updates the game state.
 * 
 * @param sessionId - ID of the session
 * @param userId - ID of the user submitting the action
 * @param actionType - Type of action (e.g., 'submit_answer', 'vote', 'guess')
 * @param actionData - Action-specific data (will be stored as JSONB)
 * @param roundNumber - Optional round number (default: 1)
 * @returns Promise resolving to the created action
 * @throws {Error} If session is not active or user is not a player
 * @throws {Error} If action creation fails
 * 
 * @example
 * ```typescript
 * const action = await submitGameAction('session-id', 'user-id', 'vote', {
 *   choice: 'option-a',
 *   question_id: 'q1'
 * });
 * console.log('Action submitted:', action.id);
 * ```
 */
export async function submitGameAction(
  sessionId: string,
  userId: string,
  actionType: string,
  actionData: Record<string, unknown>,
  roundNumber: number = 1
): Promise<GameAction> {
  // Validate session exists and is active
  const { data: session, error: sessionError } = await supabase
    .from('game_sessions')
    .select('status')
    .eq('id', sessionId)
    .maybeSingle();

  if (sessionError) {
    logger.error('Error fetching session', sessionError, { sessionId });
    throw sessionError;
  }

  if (!session) {
    throw new Error('Game session not found');
  }

  if (session.status !== 'active') {
    throw new Error(`Cannot submit action to session with status: ${session.status}`);
  }

  // Validate user is an active player
  const { data: player, error: playerError } = await supabase
    .from('game_session_players')
    .select('user_id')
    .eq('session_id', sessionId)
    .eq('user_id', userId)
    .eq('is_active', true)
    .maybeSingle();

  if (playerError) {
    logger.error('Error validating player', playerError, { sessionId, userId });
    throw playerError;
  }

  if (!player) {
    throw new Error('User is not an active player in this session');
  }

  // Create action
  const { data: action, error: actionError } = await supabase
    .from('game_actions')
    .insert({
      session_id: sessionId,
      user_id: userId,
      action_type: actionType,
      action_data: actionData,
      round_number: roundNumber,
    })
    .select(`
      *,
      user:profiles!game_actions_user_id_fkey(id, name, photo_url)
    `)
    .single();

  if (actionError) {
    logger.error('Error submitting game action', actionError, { sessionId, userId, actionType });
    throw actionError;
  }

  return action as GameAction;
}

/**
 * Get game actions for a session
 * 
 * @param sessionId - ID of the session
 * @param roundNumber - Optional round number filter
 * @returns Promise resolving to array of actions
 * @throws {Error} If query fails
 */
export async function getGameActions(
  sessionId: string,
  roundNumber?: number
): Promise<GameAction[]> {
  let query = supabase
    .from('game_actions')
    .select(`
      *,
      user:profiles!game_actions_user_id_fkey(id, name, photo_url)
    `)
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true });

  if (roundNumber !== undefined) {
    query = query.eq('round_number', roundNumber);
  }

  const { data, error } = await query;

  if (error) {
    logger.error('Error fetching game actions', error, { sessionId });
    throw error;
  }

  return (data || []) as GameAction[];
}

/**
 * Update game session state
 * 
 * Updates the game_state JSONB field and optionally the status.
 * 
 * @param sessionId - ID of the session
 * @param gameState - New game state (will be merged with existing)
 * @param status - Optional new status
 * @param currentTurnUserId - Optional current turn user ID
 * @returns Promise resolving to updated session
 * @throws {Error} If update fails
 */
export async function updateGameSessionState(
  sessionId: string,
  gameState?: Record<string, unknown>,
  status?: GameSessionStatus,
  currentTurnUserId?: string | null
): Promise<GameSession> {
  const updates: Record<string, unknown> = {};

  if (gameState !== undefined) {
    // Get current state and merge
    const { data: currentSession } = await supabase
      .from('game_sessions')
      .select('game_state')
      .eq('id', sessionId)
      .maybeSingle();

    const currentState = (currentSession?.game_state as Record<string, unknown>) || {};
    updates.game_state = { ...currentState, ...gameState };
  }

  if (status !== undefined) {
    updates.status = status;
  }

  if (currentTurnUserId !== undefined) {
    updates.current_turn_user_id = currentTurnUserId;
  }

  if (status === 'completed') {
    updates.completed_at = new Date().toISOString();
  }

  const { data: session, error } = await supabase
    .from('game_sessions')
    .update(updates)
    .eq('id', sessionId)
    .select(`
      *,
      game:games(*),
      players:game_session_players(
        *,
        user:profiles!game_session_players_user_id_fkey(id, name, photo_url)
      )
    `)
    .single();

  if (error) {
    logger.error('Error updating game session state', error, { sessionId });
    throw error;
  }

  return session as GameSession;
}

/**
 * Complete a game session
 * 
 * Marks a session as completed and creates game results for all players.
 * 
 * @param sessionId - ID of the session
 * @param results - Array of results with user_id, final_score, rank, and achievements
 * @returns Promise resolving when complete
 * @throws {Error} If completion fails
 */
export async function completeGameSession(
  sessionId: string,
  results: Array<{
    user_id: string;
    final_score: number;
    rank: number;
    achievements?: string[];
  }>
): Promise<void> {
  // Update session status
  await supabase
    .from('game_sessions')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
    })
    .eq('id', sessionId);

  // Create results
  const resultsToInsert = results.map(r => ({
    session_id: sessionId,
    user_id: r.user_id,
    final_score: r.final_score,
    rank: r.rank,
    achievements: r.achievements || [],
  }));

  const { error: resultsError } = await supabase
    .from('game_results')
    .insert(resultsToInsert);

  if (resultsError) {
    logger.error('Error creating game results', resultsError, { sessionId });
    throw resultsError;
  }
}

/**
 * Get game results for a session
 * 
 * @param sessionId - ID of the session
 * @returns Promise resolving to array of results
 * @throws {Error} If query fails
 */
export async function getGameResults(sessionId: string): Promise<GameResult[]> {
  const { data, error } = await supabase
    .from('game_results')
    .select(`
      *,
      user:profiles!game_results_user_id_fkey(id, name, photo_url)
    `)
    .eq('session_id', sessionId)
    .order('rank', { ascending: true });

  if (error) {
    logger.error('Error fetching game results', error, { sessionId });
    throw error;
  }

  return (data || []) as GameResult[];
}

/**
 * Subscribe to game session updates
 * 
 * Sets up a real-time subscription for changes to a game session.
 * 
 * @param sessionId - ID of the session to subscribe to
 * @param callback - Callback function called on updates
 * @returns Unsubscribe function
 */
export function subscribeToGameSession(
  sessionId: string,
  callback: (session: GameSession) => void
): () => void {
  const channel = supabase
    .channel(`game_session:${sessionId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'game_sessions',
        filter: `id=eq.${sessionId}`,
      },
      async (payload) => {
        // Fetch full session with related data
        const session = await getGameSession(sessionId);
        if (session) {
          callback(session);
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Subscribe to game actions for a session
 * 
 * Sets up a real-time subscription for new actions in a game session.
 * 
 * @param sessionId - ID of the session to subscribe to
 * @param callback - Callback function called on new actions
 * @returns Unsubscribe function
 */
export function subscribeToGameActions(
  sessionId: string,
  callback: (action: GameAction) => void
): () => void {
  const channel = supabase
    .channel(`game_actions:${sessionId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'game_actions',
        filter: `session_id=eq.${sessionId}`,
      },
      async (payload) => {
        // Fetch full action with user info
        const { data } = await supabase
          .from('game_actions')
          .select(`
            *,
            user:profiles!game_actions_user_id_fkey(id, name, photo_url)
          `)
          .eq('id', payload.new.id)
          .single();

        if (data) {
          callback(data as GameAction);
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Subscribe to game session players updates
 * 
 * Sets up a real-time subscription for player changes in a game session.
 * 
 * @param sessionId - ID of the session to subscribe to
 * @param callback - Callback function called on player updates
 * @returns Unsubscribe function
 */
export function subscribeToGameSessionPlayers(
  sessionId: string,
  callback: (player: GameSessionPlayer) => void
): () => void {
  const channel = supabase
    .channel(`game_session_players:${sessionId}`)
    .on(
      'postgres_changes',
      {
        event: '*', // INSERT, UPDATE, DELETE
        schema: 'public',
        table: 'game_session_players',
        filter: `session_id=eq.${sessionId}`,
      },
      async (payload) => {
        if (payload.eventType === 'DELETE') {
          // Handle delete (player left)
          return;
        }

        // Fetch full player with user info
        const { data } = await supabase
          .from('game_session_players')
          .select(`
            *,
            user:profiles!game_session_players_user_id_fkey(id, name, photo_url)
          `)
          .eq('session_id', sessionId)
          .eq('user_id', payload.new.user_id)
          .single();

        if (data) {
          callback(data as GameSessionPlayer);
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

