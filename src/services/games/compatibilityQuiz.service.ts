import type { GameSession, GameAction } from '../games.service';

/**
 * Question for Compatibility Quiz
 */
export interface CompatibilityQuestion {
  id: string;
  question: string;
  options: string[];
}

/**
 * Predefined questions for Compatibility Quiz
 */
const QUESTIONS: CompatibilityQuestion[] = [
  {
    id: '1',
    question: 'What\'s your ideal weekend?',
    options: ['Adventure and exploration', 'Relaxing at home', 'Socializing with friends', 'Trying new restaurants'],
  },
  {
    id: '2',
    question: 'How do you handle conflict?',
    options: ['Talk it out immediately', 'Need time to process', 'Avoid confrontation', 'Find a compromise'],
  },
  {
    id: '3',
    question: 'What\'s most important in a relationship?',
    options: ['Communication', 'Trust', 'Shared interests', 'Independence'],
  },
  {
    id: '4',
    question: 'Your love language is:',
    options: ['Words of affirmation', 'Quality time', 'Physical touch', 'Acts of service'],
  },
  {
    id: '5',
    question: 'How do you recharge?',
    options: ['Alone time', 'With close friends', 'Outdoor activities', 'Creative projects'],
  },
];

/**
 * Game state for Compatibility Quiz
 */
export interface CompatibilityQuizState {
  phase: 'answering' | 'results';
  round: number;
  currentQuestion: CompatibilityQuestion | null;
  answers: Record<string, Record<string, number>>; // userId -> questionId -> optionIndex
  scores: Record<string, number>;
  compatibilityMatrix: Record<string, Record<string, number>>; // userId -> userId -> percentage
}

/**
 * Initialize game state for Compatibility Quiz
 */
export function initializeCompatibilityQuizState(playerIds: string[]): CompatibilityQuizState {
  return {
    phase: 'answering',
    round: 1,
    currentQuestion: QUESTIONS[0],
    answers: Object.fromEntries(playerIds.map(id => [id, {}])),
    scores: Object.fromEntries(playerIds.map(id => [id, 0])),
    compatibilityMatrix: {},
  };
}

/**
 * Validate action for Compatibility Quiz
 */
export function validateCompatibilityQuizAction(
  state: CompatibilityQuizState,
  userId: string,
  action: GameAction
): { valid: boolean; error?: string } {
  if (action.action_type === 'answer') {
    if (state.phase !== 'answering') {
      return { valid: false, error: 'Not in answering phase' };
    }
    if (!state.currentQuestion) {
      return { valid: false, error: 'No current question' };
    }
    const { optionIndex } = action.action_data as { optionIndex: number };
    if (optionIndex < 0 || optionIndex >= state.currentQuestion.options.length) {
      return { valid: false, error: 'Invalid option index' };
    }
    if (state.answers[userId]?.[state.currentQuestion.id] !== undefined) {
      return { valid: false, error: 'Already answered this question' };
    }
    return { valid: true };
  }

  if (action.action_type === 'next_question') {
    if (state.phase !== 'results') {
      return { valid: false, error: 'Not in results phase' };
    }
    return { valid: true };
  }

  return { valid: false, error: 'Invalid action type' };
}

/**
 * Process action for Compatibility Quiz
 */
export function processCompatibilityQuizAction(
  state: CompatibilityQuizState,
  action: GameAction
): CompatibilityQuizState {
  const newState = { ...state };

  if (action.action_type === 'answer') {
    if (!state.currentQuestion) return newState;
    
    const { optionIndex } = action.action_data as { optionIndex: number };
    if (!newState.answers[action.user_id]) {
      newState.answers[action.user_id] = {};
    }
    newState.answers[action.user_id][state.currentQuestion.id] = optionIndex;

    // Check if all players have answered
    const playerIds = Object.keys(newState.answers);
    const allAnswered = playerIds.every(id => 
      newState.answers[id]?.[state.currentQuestion!.id] !== undefined
    );

    if (allAnswered) {
      // Award points
      playerIds.forEach(id => {
        newState.scores[id] = (newState.scores[id] || 0) + 1;
      });

      // Calculate compatibility for this question
      playerIds.forEach(id1 => {
        if (!newState.compatibilityMatrix[id1]) {
          newState.compatibilityMatrix[id1] = {};
        }
        playerIds.forEach(id2 => {
          if (id1 !== id2) {
            const answer1 = newState.answers[id1][state.currentQuestion!.id];
            const answer2 = newState.answers[id2][state.currentQuestion!.id];
            if (answer1 === answer2) {
              if (!newState.compatibilityMatrix[id1][id2]) {
                newState.compatibilityMatrix[id1][id2] = 0;
              }
              newState.compatibilityMatrix[id1][id2] += 20; // 20% per matching answer
            }
          }
        });
      });

      newState.phase = 'results';
    }
  }

  if (action.action_type === 'next_question') {
    if (newState.round >= QUESTIONS.length) {
      // Game complete
      return newState;
    }
    
    // Start next question
    newState.round = newState.round + 1;
    newState.phase = 'answering';
    newState.currentQuestion = QUESTIONS[newState.round - 1];
  }

  return newState;
}

/**
 * Check if game is complete
 */
export function isCompatibilityQuizComplete(state: CompatibilityQuizState): boolean {
  return state.round >= QUESTIONS.length && state.phase === 'results';
}

/**
 * Calculate final results for Compatibility Quiz
 */
export function calculateCompatibilityQuizResults(
  state: CompatibilityQuizState,
  actions: GameAction[]
): Array<{ user_id: string; final_score: number; rank: number; achievements: string[] }> {
  const playerIds = Object.keys(state.scores);
  const results = playerIds.map(userId => ({
    user_id: userId,
    final_score: state.scores[userId] || 0,
    rank: 0,
    achievements: [] as string[],
  }));

  // Sort by score (descending)
  results.sort((a, b) => b.final_score - a.final_score);

  // Assign ranks
  results.forEach((result, index) => {
    result.rank = index + 1;
    if (result.final_score === results[0].final_score && results[0].final_score > 0) {
      result.achievements.push('Compatibility Expert');
    }
  });

  return results;
}

/**
 * Get compatibility percentage between two users
 */
export function getCompatibilityPercentage(
  state: CompatibilityQuizState,
  userId1: string,
  userId2: string
): number {
  return state.compatibilityMatrix[userId1]?.[userId2] || 0;
}

