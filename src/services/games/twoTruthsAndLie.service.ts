import type { GameSession, GameAction } from '../games.service';

/**
 * Game state for Two Truths and a Lie
 */
export interface TwoTruthsAndLieState {
  phase: 'submitting' | 'guessing' | 'results';
  round: number;
  submissions: Record<string, {
    statements: string[];
    lieIndex: number;
    submitted: boolean;
  }>;
  guesses: Record<string, {
    userId: string;
    guessedLieIndex: number;
  }>;
  scores: Record<string, number>;
}

/**
 * Initialize game state for Two Truths and a Lie
 */
export function initializeTwoTruthsAndLieState(playerIds: string[]): TwoTruthsAndLieState {
  return {
    phase: 'submitting',
    round: 1,
    submissions: Object.fromEntries(
      playerIds.map(id => [id, {
        statements: [],
        lieIndex: -1,
        submitted: false,
      }])
    ),
    guesses: {},
    scores: Object.fromEntries(playerIds.map(id => [id, 0])),
  };
}

/**
 * Validate action for Two Truths and a Lie
 */
export function validateTwoTruthsAndLieAction(
  state: TwoTruthsAndLieState,
  userId: string,
  action: GameAction
): { valid: boolean; error?: string } {
  if (action.action_type === 'submit_statements') {
    if (state.phase !== 'submitting') {
      return { valid: false, error: 'Not in submission phase' };
    }
    if (state.submissions[userId]?.submitted) {
      return { valid: false, error: 'Already submitted' };
    }
    const { statements, lieIndex } = action.action_data as { statements: string[]; lieIndex: number };
    if (!statements || statements.length !== 3) {
      return { valid: false, error: 'Must submit exactly 3 statements' };
    }
    if (lieIndex < 0 || lieIndex > 2) {
      return { valid: false, error: 'Lie index must be 0, 1, or 2' };
    }
    return { valid: true };
  }

  if (action.action_type === 'guess_lie') {
    if (state.phase !== 'guessing') {
      return { valid: false, error: 'Not in guessing phase' };
    }
    if (state.guesses[userId]) {
      return { valid: false, error: 'Already guessed' };
    }
    const { targetUserId, guessedLieIndex } = action.action_data as { targetUserId: string; guessedLieIndex: number };
    if (!state.submissions[targetUserId]?.submitted) {
      return { valid: false, error: 'Target player has not submitted' };
    }
    if (guessedLieIndex < 0 || guessedLieIndex > 2) {
      return { valid: false, error: 'Guessed lie index must be 0, 1, or 2' };
    }
    return { valid: true };
  }

  return { valid: false, error: 'Invalid action type' };
}

/**
 * Process action for Two Truths and a Lie
 */
export function processTwoTruthsAndLieAction(
  state: TwoTruthsAndLieState,
  action: GameAction
): TwoTruthsAndLieState {
  const newState = { ...state };

  if (action.action_type === 'submit_statements') {
    const { statements, lieIndex } = action.action_data as { statements: string[]; lieIndex: number };
    newState.submissions[action.user_id] = {
      statements,
      lieIndex,
      submitted: true,
    };

    // Check if all players have submitted
    const allSubmitted = Object.values(newState.submissions).every(s => s.submitted);
    if (allSubmitted) {
      newState.phase = 'guessing';
    }
  }

  if (action.action_type === 'guess_lie') {
    const { targetUserId, guessedLieIndex } = action.action_data as { targetUserId: string; guessedLieIndex: number };
    newState.guesses[action.user_id] = {
      userId: targetUserId,
      guessedLieIndex,
    };

    // Check if all players have guessed
    const playerIds = Object.keys(newState.submissions);
    const allGuessed = playerIds.every(id => newState.guesses[id]);
    if (allGuessed) {
      newState.phase = 'results';
      // Calculate scores
      playerIds.forEach(guesserId => {
        const guess = newState.guesses[guesserId];
        if (guess) {
          const submission = newState.submissions[guess.userId];
          if (submission && guess.guessedLieIndex === submission.lieIndex) {
            newState.scores[guesserId] = (newState.scores[guesserId] || 0) + 1;
          }
        }
      });
    }
  }

  return newState;
}

/**
 * Check if game is complete
 */
export function isTwoTruthsAndLieComplete(state: TwoTruthsAndLieState): boolean {
  return state.phase === 'results';
}

/**
 * Calculate final results for Two Truths and a Lie
 */
export function calculateTwoTruthsAndLieResults(
  state: TwoTruthsAndLieState,
  actions: GameAction[]
): Array<{ user_id: string; final_score: number; rank: number; achievements: string[] }> {
  const playerIds = Object.keys(state.scores);
  const results = playerIds.map(userId => ({
    user_id: userId,
    final_score: state.scores[userId] || 0,
    rank: 0, // Will be set after sorting
    achievements: [] as string[],
  }));

  // Sort by score (descending)
  results.sort((a, b) => b.final_score - a.final_score);

  // Assign ranks
  results.forEach((result, index) => {
    result.rank = index + 1;
    if (result.final_score === results[0].final_score && results[0].final_score > 0) {
      result.achievements.push('Perfect Detective');
    }
  });

  return results;
}

