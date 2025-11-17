import type { GameSession, GameAction } from '../games.service';

/**
 * Trivia question
 */
export interface TriviaQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  category: string;
}

/**
 * Predefined trivia questions
 */
const QUESTIONS: TriviaQuestion[] = [
  {
    id: '1',
    question: 'What is the capital of France?',
    options: ['London', 'Berlin', 'Paris', 'Madrid'],
    correctAnswer: 2,
    category: 'Geography',
  },
  {
    id: '2',
    question: 'Who painted the Mona Lisa?',
    options: ['Van Gogh', 'Picasso', 'Da Vinci', 'Monet'],
    correctAnswer: 2,
    category: 'Art',
  },
  {
    id: '3',
    question: 'What is the largest planet in our solar system?',
    options: ['Earth', 'Saturn', 'Jupiter', 'Neptune'],
    correctAnswer: 2,
    category: 'Science',
  },
  {
    id: '4',
    question: 'In which year did World War II end?',
    options: ['1943', '1944', '1945', '1946'],
    correctAnswer: 2,
    category: 'History',
  },
  {
    id: '5',
    question: 'What is the chemical symbol for gold?',
    options: ['Go', 'Gd', 'Au', 'Ag'],
    correctAnswer: 2,
    category: 'Science',
  },
  {
    id: '6',
    question: 'Who wrote "Romeo and Juliet"?',
    options: ['Charles Dickens', 'William Shakespeare', 'Jane Austen', 'Mark Twain'],
    correctAnswer: 1,
    category: 'Literature',
  },
  {
    id: '7',
    question: 'What is the smallest prime number?',
    options: ['0', '1', '2', '3'],
    correctAnswer: 2,
    category: 'Math',
  },
  {
    id: '8',
    question: 'Which ocean is the largest?',
    options: ['Atlantic', 'Indian', 'Arctic', 'Pacific'],
    correctAnswer: 3,
    category: 'Geography',
  },
  {
    id: '9',
    question: 'What is the speed of light?',
    options: ['300,000 km/s', '150,000 km/s', '450,000 km/s', '600,000 km/s'],
    correctAnswer: 0,
    category: 'Science',
  },
  {
    id: '10',
    question: 'In which continent is the Sahara Desert?',
    options: ['Asia', 'Africa', 'Australia', 'South America'],
    correctAnswer: 1,
    category: 'Geography',
  },
];

/**
 * Game state for Trivia Challenge
 */
export interface TriviaChallengeState {
  phase: 'answering' | 'results';
  round: number;
  currentQuestion: TriviaQuestion | null;
  answers: Record<string, number>; // userId -> optionIndex
  roundResults: Array<{
    question: TriviaQuestion;
    correctAnswers: string[];
  }>;
  scores: Record<string, number>;
}

/**
 * Initialize game state for Trivia Challenge
 */
export function initializeTriviaChallengeState(playerIds: string[]): TriviaChallengeState {
  const randomQuestion = QUESTIONS[Math.floor(Math.random() * QUESTIONS.length)];
  return {
    phase: 'answering',
    round: 1,
    currentQuestion: randomQuestion,
    answers: {},
    roundResults: [],
    scores: Object.fromEntries(playerIds.map(id => [id, 0])),
  };
}

/**
 * Get random question (excluding used ones)
 */
export function getRandomTriviaQuestion(usedQuestionIds: string[]): TriviaQuestion {
  const available = QUESTIONS.filter(q => !usedQuestionIds.includes(q.id));
  if (available.length === 0) {
    return QUESTIONS[Math.floor(Math.random() * QUESTIONS.length)];
  }
  return available[Math.floor(Math.random() * available.length)];
}

/**
 * Validate action for Trivia Challenge
 */
export function validateTriviaChallengeAction(
  state: TriviaChallengeState,
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
    if (state.answers[userId] !== undefined) {
      return { valid: false, error: 'Already answered' };
    }
    const { optionIndex } = action.action_data as { optionIndex: number };
    if (optionIndex < 0 || optionIndex >= state.currentQuestion.options.length) {
      return { valid: false, error: 'Invalid option index' };
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
 * Process action for Trivia Challenge
 */
export function processTriviaChallengeAction(
  state: TriviaChallengeState,
  action: GameAction
): TriviaChallengeState {
  const newState = { ...state };

  if (action.action_type === 'answer') {
    if (!state.currentQuestion) return newState;
    
    const { optionIndex } = action.action_data as { optionIndex: number };
    newState.answers[action.user_id] = optionIndex;

    // Check if all players have answered
    const playerIds = Object.keys(newState.scores);
    const allAnswered = playerIds.every(id => newState.answers[id] !== undefined);

    if (allAnswered && state.currentQuestion) {
      // Calculate round results
      const correctAnswers = playerIds.filter(id => 
        newState.answers[id] === state.currentQuestion!.correctAnswer
      );
      
      newState.roundResults.push({
        question: state.currentQuestion,
        correctAnswers,
      });

      // Award points for correct answers
      correctAnswers.forEach(userId => {
        newState.scores[userId] = (newState.scores[userId] || 0) + 1;
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
    const nextQuestion = getRandomTriviaQuestion(usedQuestionIds);
    
    newState.round = newState.round + 1;
    newState.phase = 'answering';
    newState.currentQuestion = nextQuestion;
    newState.answers = {};
  }

  return newState;
}

/**
 * Check if game is complete
 */
export function isTriviaChallengeComplete(state: TriviaChallengeState): boolean {
  return state.round >= 10 && state.phase === 'results';
}

/**
 * Calculate final results for Trivia Challenge
 */
export function calculateTriviaChallengeResults(
  state: TriviaChallengeState,
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
      result.achievements.push('Trivia Master');
    }
    if (result.final_score >= 8) {
      result.achievements.push('Brainiac');
    }
  });

  return results;
}

