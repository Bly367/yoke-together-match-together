import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowRight, Heart } from 'lucide-react';
import { useGameSession, useGameActions, useSubmitGameAction, useUpdateGameSessionState, useCompleteGameSession } from '@/hooks/useGames';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';
import type { CompatibilityQuizState } from '@/services/games/compatibilityQuiz.service';
import {
  initializeCompatibilityQuizState,
  processCompatibilityQuizAction,
  isCompatibilityQuizComplete,
  calculateCompatibilityQuizResults,
  getCompatibilityPercentage,
} from '@/services/games/compatibilityQuiz.service';
import { GameResults } from './GameResults';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

/**
 * Compatibility Quiz game component
 * 
 * Players answer questions about preferences and values, then see compatibility percentages.
 */
export function CompatibilityQuiz({ sessionId }: { sessionId: string }) {
  const { user } = useAuth();
  const { data: session } = useGameSession(sessionId, true);
  const { data: actions } = useGameActions(sessionId, undefined, true);
  const submitActionMutation = useSubmitGameAction();
  const updateStateMutation = useUpdateGameSessionState();
  const completeGameMutation = useCompleteGameSession();

  const [selectedOption, setSelectedOption] = useState<number>(-1);

  const gameState = (session?.game_state ?? {}) as unknown as CompatibilityQuizState;
  const playerIds = session?.players?.filter(p => p.is_active).map(p => p.user_id) || [];
  const activePlayers = session?.players?.filter(p => p.is_active) || [];

  // Initialize game state if needed (only if session is active and state not initialized)
  useEffect(() => {
    if (session && session.status === 'active' && !gameState.phase && playerIds.length > 0) {
      const initialState = initializeCompatibilityQuizState(playerIds);
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

  const handleNextQuestion = async () => {
    if (!user?.id) return;

    try {
      await submitActionMutation.mutateAsync({
        sessionId,
        userId: user.id,
        actionType: 'next_question',
        actionData: {},
        roundNumber: gameState.round,
      });
      setSelectedOption(-1);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to start next question');
    }
  };

  // Process actions to get current state
  let currentState = gameState;
  if (actions && gameState.phase) {
    actions.forEach(action => {
      try {
        currentState = processCompatibilityQuizAction(currentState, action);
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

  const userAnswer = currentState.answers[user?.id || '']?.[currentState.currentQuestion?.id || ''];

  // Complete game if finished
  useEffect(() => {
    if (isCompatibilityQuizComplete(currentState) && session && actions) {
      const results = calculateCompatibilityQuizResults(currentState, actions);
      completeGameMutation.mutate({
        sessionId,
        results,
      });
    }
  }, [currentState.round, currentState.phase, session, actions]);

  if (currentState.phase === 'answering') {
    const question = currentState.currentQuestion;
    if (!question) {
      return (
        <div className="flex items-center justify-center p-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      );
    }
    return (
      <Card className="animate-slide-up">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Compatibility Quiz</CardTitle>
            <Badge variant="secondary">Question {currentState.round}/5</Badge>
          </div>
          <CardDescription>
            Answer honestly to discover your compatibility with others!
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {userAnswer !== undefined ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">Waiting for other players to answer...</p>
              <div className="flex gap-2 justify-center flex-wrap">
                {playerIds.map((userId) => {
                  const player = activePlayers.find(p => p.user_id === userId);
                  const hasAnswered = currentState.answers[userId]?.[question.id] !== undefined;
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
              <div className="text-center py-4">
                <h3 className="text-xl font-semibold mb-6">{question.question}</h3>
              </div>

              <div className="space-y-2">
                {question.options.map((option, index) => (
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
                    <span className="flex-1">{option}</span>
                  </Button>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    );
  }

  if (currentState.phase === 'results') {
    const isComplete = isCompatibilityQuizComplete(currentState);

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

      // Show compatibility matrix
      return (
        <div className="space-y-6 animate-slide-up">
          <GameResults results={results} />
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="w-5 h-5 text-primary" />
                Compatibility Matrix
              </CardTitle>
              <CardDescription>
                See how compatible you are with each other!
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                {activePlayers.map((player1) => (
                  activePlayers
                    .filter(p => p.user_id !== player1.user_id)
                    .map((player2) => {
                      const compatibility = getCompatibilityPercentage(
                        currentState,
                        player1.user_id,
                        player2.user_id
                      );
                      return (
                        <Card key={`${player1.user_id}-${player2.user_id}`} className="p-4">
                          <div className="flex items-center gap-3 mb-2">
                            <Avatar className="w-8 h-8">
                              <AvatarImage src={player1.user?.photo_url} alt={player1.user?.name} />
                              <AvatarFallback>{player1.user?.name?.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <span className="text-sm font-medium">{player1.user?.name}</span>
                          </div>
                          <div className="flex items-center gap-3 mb-3">
                            <Avatar className="w-8 h-8">
                              <AvatarImage src={player2.user?.photo_url} alt={player2.user?.name} />
                              <AvatarFallback>{player2.user?.name?.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <span className="text-sm font-medium">{player2.user?.name}</span>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-primary">{compatibility}%</div>
                            <div className="text-xs text-muted-foreground">Compatible</div>
                          </div>
                        </Card>
                      );
                    })
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return (
      <Card className="animate-slide-up">
        <CardHeader>
          <CardTitle>Question {currentState.round} Results</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center py-4">
            <p className="text-muted-foreground mb-4">All players have answered!</p>
            <p className="text-sm text-muted-foreground">
              Compatibility percentages are being calculated...
            </p>
          </div>

          <Button
            onClick={handleNextQuestion}
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
                Next Question <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return null;
}

