import type { GameAction } from '../games.service';

/**
 * Question for This or That
 */
export interface ThisOrThatQuestion {
  id: string;
  optionA: string;
  optionB: string;
}

/**
 * Predefined questions for This or That
 */
const QUESTIONS: ThisOrThatQuestion[] = [
  { id: '1', optionA: 'Pizza', optionB: 'Burger' },
  { id: '2', optionA: 'Coffee', optionB: 'Tea' },
  { id: '3', optionA: 'Beach', optionB: 'Mountains' },
  { id: '4', optionA: 'Summer', optionB: 'Winter' },
  { id: '5', optionA: 'Movies', optionB: 'Books' },
  { id: '6', optionA: 'City', optionB: 'Countryside' },
  { id: '7', optionA: 'Dogs', optionB: 'Cats' },
  { id: '8', optionA: 'Morning', optionB: 'Night' },
  { id: '9', optionA: 'Sweet', optionB: 'Savory' },
  { id: '10', optionA: 'Adventure', optionB: 'Comfort' },
  { id: '11', optionA: 'Text', optionB: 'Call' },
  { id: '12', optionA: 'Indoor', optionB: 'Outdoor' },
];

/**
 * Game state for This or That
 */
export interface ThisOrThatState {
  phase: 'choosing' | 'results';
  round: number;
  currentQuestion: ThisOrThatQuestion | null;
  choices: Record<string, 'A' | 'B'>;
  roundResults: Array<{
    question: ThisOrThatQuestion;
    choicesA: number;
    choicesB: number;
  }>;
  scores: Record<string, number>;
}

/**
 * Initialize game state for This or That
 */
export function initializeThisOrThatState(playerIds: string[]): ThisOrThatState {
  const randomQuestion = QUESTIONS[Math.floor(Math.random() * QUESTIONS.length)];
  return {
    phase: 'choosing',
    round: 1,
    currentQuestion: randomQuestion,
    choices: {},
    roundResults: [],
    scores: Object.fromEntries(playerIds.map(id => [id, 0])),
  };
}

/**
 * Get random question (excluding used ones)
 */
export function getRandomThisOrThatQuestion(usedQuestionIds: string[]): ThisOrThatQuestion {
  const available = QUESTIONS.filter(q => !usedQuestionIds.includes(q.id));
  if (available.length === 0) {
    return QUESTIONS[Math.floor(Math.random() * QUESTIONS.length)];
  }
  return available[Math.floor(Math.random() * available.length)];
}

/**
 * Validate action for This or That
 */
export function validateThisOrThatAction(
  state: ThisOrThatState,
  userId: string,
  action: GameAction
): { valid: boolean; error?: string } {
  if (action.action_type === 'choose') {
    if (state.phase !== 'choosing') {
      return { valid: false, error: 'Not in choosing phase' };
    }
    if (state.choices[userId]) {
      return { valid: false, error: 'Already chosen' };
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
 * Process action for This or That
 */
export function processThisOrThatAction(
  state: ThisOrThatState,
  action: GameAction
): ThisOrThatState {
  const newState = { ...state };

  if (action.action_type === 'choose') {
    const { choice } = action.action_data as { choice: 'A' | 'B' };
    newState.choices[action.user_id] = choice;

    // Check if all players have chosen
    const playerIds = Object.keys(newState.scores);
    const allChosen = playerIds.every(id => newState.choices[id]);
    if (allChosen && state.currentQuestion) {
      // Calculate round results
      const choicesA = Object.values(newState.choices).filter(c => c === 'A').length;
      const choicesB = Object.values(newState.choices).filter(c => c === 'B').length;
      
      newState.roundResults.push({
        question: state.currentQuestion,
        choicesA,
        choicesB,
      });

      // Award points (everyone gets 1 point)
      playerIds.forEach(id => {
        newState.scores[id] = (newState.scores[id] || 0) + 1;
      });

      newState.phase = 'results';
    }
  }

  if (action.action_type === 'next_round') {
    if (newState.round >= 10) {
      // Game complete
      return newState;
    }
    
    // Start next round
    const usedQuestionIds = newState.roundResults.map(r => r.question.id);
    const nextQuestion = getRandomThisOrThatQuestion(usedQuestionIds);
    
    newState.round = newState.round + 1;
    newState.phase = 'choosing';
    newState.currentQuestion = nextQuestion;
    newState.choices = {};
  }

  return newState;
}

/**
 * Check if game is complete
 */
export function isThisOrThatComplete(state: ThisOrThatState): boolean {
  return state.round >= 10 && state.phase === 'results';
}

/**
 * Calculate final results for This or That
 */
export function calculateThisOrThatResults(
  state: ThisOrThatState,
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
      result.achievements.push('Choice Champion');
    }
  });

  return results;
}

