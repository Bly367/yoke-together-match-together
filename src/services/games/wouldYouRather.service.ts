import type { GameAction } from '../games.service';

/**
 * Question for Would You Rather
 */
export interface WouldYouRatherQuestion {
  id: string;
  optionA: string;
  optionB: string;
}

/**
 * Predefined questions for Would You Rather
 */
const QUESTIONS: WouldYouRatherQuestion[] = [
  { id: '1', optionA: 'Always be 10 minutes late', optionB: 'Always be 20 minutes early' },
  { id: '2', optionA: 'Have super strength', optionB: 'Have super speed' },
  { id: '3', optionA: 'Be able to fly', optionB: 'Be able to breathe underwater' },
  { id: '4', optionA: 'Have perfect memory', optionB: 'Be able to forget anything' },
  { id: '5', optionA: 'Live in a world without music', optionB: 'Live in a world without colors' },
  { id: '6', optionA: 'Have unlimited money', optionB: 'Have unlimited time' },
  { id: '7', optionA: 'Be famous', optionB: 'Be rich' },
  { id: '8', optionA: 'Never use social media again', optionB: 'Never watch TV again' },
  { id: '9', optionA: 'Always speak your thoughts', optionB: 'Never speak again' },
  { id: '10', optionA: 'Have the ability to time travel', optionB: 'Have the ability to read minds' },
];

/**
 * Game state for Would You Rather
 */
export interface WouldYouRatherState {
  phase: 'voting' | 'results';
  round: number;
  currentQuestion: WouldYouRatherQuestion | null;
  votes: Record<string, 'A' | 'B'>;
  roundResults: Array<{
    question: WouldYouRatherQuestion;
    votesA: number;
    votesB: number;
  }>;
  scores: Record<string, number>;
}

/**
 * Initialize game state for Would You Rather
 */
export function initializeWouldYouRatherState(playerIds: string[]): WouldYouRatherState {
  const randomQuestion = QUESTIONS[Math.floor(Math.random() * QUESTIONS.length)];
  return {
    phase: 'voting',
    round: 1,
    currentQuestion: randomQuestion,
    votes: {},
    roundResults: [],
    scores: Object.fromEntries(playerIds.map(id => [id, 0])),
  };
}

/**
 * Get random question (excluding used ones)
 */
export function getRandomQuestion(usedQuestionIds: string[]): WouldYouRatherQuestion {
  const available = QUESTIONS.filter(q => !usedQuestionIds.includes(q.id));
  if (available.length === 0) {
    // If all questions used, reset
    return QUESTIONS[Math.floor(Math.random() * QUESTIONS.length)];
  }
  return available[Math.floor(Math.random() * available.length)];
}

/**
 * Validate action for Would You Rather
 */
export function validateWouldYouRatherAction(
  state: WouldYouRatherState,
  userId: string,
  action: GameAction
): { valid: boolean; error?: string } {
  if (action.action_type === 'vote') {
    if (state.phase !== 'voting') {
      return { valid: false, error: 'Not in voting phase' };
    }
    if (state.votes[userId]) {
      return { valid: false, error: 'Already voted' };
    }
    const { choice } = action.action_data as { choice: 'A' | 'B' };
    if (choice !== 'A' && choice !== 'B') {
      return { valid: false, error: 'Choice must be A or B' };
    }
    return { valid: true };
  }

  if (action.action_type === 'next_round') {
    if (state.phase !== 'results') {
      return { valid: false, error: 'Not in results phase' };
    }
    return { valid: true };
  }

  return { valid: false, error: 'Invalid action type' };
}

/**
 * Process action for Would You Rather
 */
export function processWouldYouRatherAction(
  state: WouldYouRatherState,
  action: GameAction
): WouldYouRatherState {
  const newState = { ...state };

  if (action.action_type === 'vote') {
    const { choice } = action.action_data as { choice: 'A' | 'B' };
    newState.votes[action.user_id] = choice;

    // Check if all players have voted
    const playerIds = Object.keys(newState.scores);
    const allVoted = playerIds.every(id => newState.votes[id]);
    if (allVoted && state.currentQuestion) {
      // Calculate round results
      const votesA = Object.values(newState.votes).filter(v => v === 'A').length;
      const votesB = Object.values(newState.votes).filter(v => v === 'B').length;
      
      newState.roundResults.push({
        question: state.currentQuestion,
        votesA,
        votesB,
      });

      // Award points (everyone gets 1 point for participating)
      playerIds.forEach(id => {
        newState.scores[id] = (newState.scores[id] || 0) + 1;
      });

      newState.phase = 'results';
    }
  }

  if (action.action_type === 'next_round') {
    if (newState.round >= 5) {
      // Game complete
      return newState;
    }
    
    // Start next round
    const usedQuestionIds = newState.roundResults.map(r => r.question.id);
    const nextQuestion = getRandomQuestion(usedQuestionIds);
    
    newState.round = newState.round + 1;
    newState.phase = 'voting';
    newState.currentQuestion = nextQuestion;
    newState.votes = {};
  }

  return newState;
}

/**
 * Check if game is complete
 */
export function isWouldYouRatherComplete(state: WouldYouRatherState): boolean {
  return state.round >= 5 && state.phase === 'results';
}

/**
 * Calculate final results for Would You Rather
 */
export function calculateWouldYouRatherResults(
  state: WouldYouRatherState,
  _actions: GameAction[]
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
      result.achievements.push('Decision Master');
    }
  });

  return results;
}

