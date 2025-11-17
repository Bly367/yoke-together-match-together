import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowRight, CheckCircle2, XCircle } from 'lucide-react';
import { useGameSession, useGameActions, useSubmitGameAction, useUpdateGameSessionState, useCompleteGameSession } from '@/hooks/useGames';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';
import type { TriviaChallengeState } from '@/services/games/triviaChallenge.service';
import {
  initializeTriviaChallengeState,
  validateTriviaChallengeAction,
  processTriviaChallengeAction,
  isTriviaChallengeComplete,
  calculateTriviaChallengeResults,
} from '@/services/games/triviaChallenge.service';
import { GameResults } from './GameResults';
import { cn } from '@/lib/utils';

/**
 * Trivia Challenge game component
 * 
 * Multiple choice trivia questions. All players answer simultaneously.
 */
export function TriviaChallenge({ sessionId }: { sessionId: string }) {
  const { user } = useAuth();
  const { data: session } = useGameSession(sessionId, true);
  const { data: actions } = useGameActions(sessionId, undefined, true);
  const submitActionMutation = useSubmitGameAction();
  const updateStateMutation = useUpdateGameSessionState();
  const completeGameMutation = useCompleteGameSession();

  const [selectedOption, setSelectedOption] = useState<number>(-1);

  const gameState = (session?.game_state || {}) as TriviaChallengeState;
  const playerIds = session?.players?.filter(p => p.is_active).map(p => p.user_id) || [];
  const activePlayers = session?.players?.filter(p => p.is_active) || [];

  // Initialize game state if needed (only if session is active and state not initialized)
  useEffect(() => {
    if (session && session.status === 'active' && !gameState.phase && playerIds.length > 0) {
      const initialState = initializeTriviaChallengeState(playerIds);
      updateStateMutation.mutate({
        sessionId,
        gameState: initialState,
      });
    }
  }, [session?.status, gameState.phase, playerIds.length]);

  if (!gameState.phase || !gameState.currentQuestion) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const handleAnswer = async (optionIndex: number) => {
    if (!user?.id) return;

    try {
      await submitActionMutation.mutateAsync({
        sessionId,
        userId: user.id,
        actionType: 'answer',
        actionData: { optionIndex },
        roundNumber: gameState.round,
      });
      setSelectedOption(optionIndex);
      toast.success('Answer submitted!');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to submit answer');
    }
  };

  const handleNextRound = async () => {
    if (!user?.id) return;

    try {
      await submitActionMutation.mutateAsync({
        sessionId,
        userId: user.id,
        actionType: 'next_round',
        actionData: {},
        roundNumber: gameState.round,
      });
      setSelectedOption(-1);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to start next round');
    }
  };

  // Process actions to get current state
  let currentState = gameState;
  if (actions && gameState.phase) {
    actions.forEach(action => {
      try {
        currentState = processTriviaChallengeAction(currentState, action);
      } catch (error) {
        logger.error('Error processing action', error);
      }
    });
    
    // Update game state in database if phase changed (important state transitions)
    if (currentState.phase !== gameState.phase || currentState.round !== gameState.round) {
      updateStateMutation.mutate({
        sessionId,
        gameState: currentState,
      });
    }
  }

  const userAnswer = currentState.answers[user?.id || ''];
  const allAnswered = playerIds.every(id => currentState.answers[id] !== undefined);
  const lastResult = currentState.roundResults[currentState.roundResults.length - 1];
  const userWasCorrect = lastResult && userAnswer !== undefined
    ? lastResult.question.correctAnswer === userAnswer
    : null;

  // Complete game if finished
  useEffect(() => {
    if (isTriviaChallengeComplete(currentState) && session && actions) {
      const results = calculateTriviaChallengeResults(currentState, actions);
      completeGameMutation.mutate({
        sessionId,
        results,
      });
    }
  }, [currentState.round, currentState.phase, session, actions]);

  if (currentState.phase === 'answering') {
    return (
      <Card className="animate-slide-up">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Trivia Challenge</CardTitle>
            <Badge variant="secondary">Round {currentState.round}/10</Badge>
          </div>
          <CardDescription>
            Test your knowledge! Answer the question correctly to earn points.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {userAnswer !== undefined ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">Waiting for other players to answer...</p>
              <div className="flex gap-2 justify-center flex-wrap">
                {playerIds.map((userId) => {
                  const player = activePlayers.find(p => p.user_id === userId);
                  const hasAnswered = currentState.answers[userId] !== undefined;
                  return (
                    <Badge
                      key={userId}
                      variant={hasAnswered ? 'default' : 'outline'}
                      className={cn(hasAnswered && 'bg-primary/20 text-primary')}
                    >
                      {player?.user?.name || 'Player'} {hasAnswered ? '✓' : ''}
                    </Badge>
                  );
                })}
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                <div className="text-center">
                  <Badge variant="outline" className="mb-2">
                    {currentState.currentQuestion.category}
                  </Badge>
                  <h3 className="text-xl font-semibold mt-2">{currentState.currentQuestion.question}</h3>
                </div>

                <div className="space-y-2">
                  {currentState.currentQuestion.options.map((option, index) => (
                    <Button
                      key={index}
                      variant={selectedOption === index ? 'default' : 'outline'}
                      size="lg"
                      onClick={() => handleAnswer(index)}
                      disabled={submitActionMutation.isPending}
                      className={cn(
                        'w-full h-auto py-4 text-left justify-start transition-all',
                        selectedOption === index && 'ring-2 ring-primary shadow-[var(--shadow-soft)]'
                      )}
                    >
                      <span className="flex-1">{String.fromCharCode(65 + index)}. {option}</span>
                    </Button>
                  ))}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    );
  }

  if (currentState.phase === 'results') {
    const isComplete = isTriviaChallengeComplete(currentState);

    if (isComplete) {
      const results = session?.players
        ?.filter(p => p.is_active)
        .map(p => ({
          id: '',
          session_id: sessionId,
          user_id: p.user_id,
          final_score: currentState.scores[p.user_id] || 0,
          rank: 0,
          achievements: [],
          created_at: new Date().toISOString(),
          user: p.user,
        })) || [];

      results.sort((a, b) => b.final_score - a.final_score);
      results.forEach((result, index) => {
        result.rank = index + 1;
      });

      return <GameResults results={results} />;
    }

    return (
      <Card className="animate-slide-up">
        <CardHeader>
          <CardTitle>Round {currentState.round} Results</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {lastResult && (
            <>
              <div className="text-center py-6 space-y-4">
                <div className="flex items-center justify-center gap-2">
                  {userWasCorrect ? (
                    <>
                      <CheckCircle2 className="w-8 h-8 text-primary" />
                      <p className="text-lg font-semibold text-primary">Correct!</p>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-8 h-8 text-destructive" />
                      <p className="text-lg font-semibold text-destructive">Incorrect</p>
                    </>
                  )}
                </div>
                
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Correct answer:</p>
                  <Badge variant="default" className="text-base px-4 py-2">
                    {lastResult.question.options[lastResult.question.correctAnswer]}
                  </Badge>
                </div>

                <div className="space-y-2 mt-4">
                  <p className="text-sm text-muted-foreground">Players who got it right:</p>
                  <div className="flex gap-2 justify-center flex-wrap">
                    {lastResult.correctAnswers.map((userId) => {
                      const player = activePlayers.find(p => p.user_id === userId);
                      return (
                        <Badge key={userId} variant="default" className="bg-primary/20 text-primary">
                          {player?.user?.name || 'Player'}
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              </div>

              <Button
                onClick={handleNextRound}
                className="w-full"
                variant="yolk"
                disabled={submitActionMutation.isPending}
              >
                {submitActionMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    Next Round <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    );
  }

  return null;
}

