import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowRight } from 'lucide-react';
import { useGameSession, useGameActions, useSubmitGameAction, useUpdateGameSessionState, useCompleteGameSession } from '@/hooks/useGames';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';
import type { ThisOrThatState } from '@/services/games/thisOrThat.service';
import {
  initializeThisOrThatState,
  validateThisOrThatAction,
  processThisOrThatAction,
  isThisOrThatComplete,
  calculateThisOrThatResults,
} from '@/services/games/thisOrThat.service';
import { GameResults } from './GameResults';
import { cn } from '@/lib/utils';

/**
 * This or That game component
 * 
 * Quick-fire comparison questions. Players choose between two options.
 */
export function ThisOrThat({ sessionId }: { sessionId: string }) {
  const { user } = useAuth();
  const { data: session } = useGameSession(sessionId, true);
  const { data: actions } = useGameActions(sessionId, undefined, true);
  const submitActionMutation = useSubmitGameAction();
  const updateStateMutation = useUpdateGameSessionState();
  const completeGameMutation = useCompleteGameSession();

  const [selectedChoice, setSelectedChoice] = useState<'A' | 'B' | null>(null);

  const gameState = (session?.game_state || {}) as ThisOrThatState;
  const playerIds = session?.players?.filter(p => p.is_active).map(p => p.user_id) || [];
  const activePlayers = session?.players?.filter(p => p.is_active) || [];

  // Initialize game state if needed (only if session is active and state not initialized)
  useEffect(() => {
    if (session && session.status === 'active' && !gameState.phase && playerIds.length > 0) {
      const initialState = initializeThisOrThatState(playerIds);
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

  const handleChoose = async (choice: 'A' | 'B') => {
    if (!user?.id) return;

    try {
      await submitActionMutation.mutateAsync({
        sessionId,
        userId: user.id,
        actionType: 'choose',
        actionData: { choice },
        roundNumber: gameState.round,
      });
      setSelectedChoice(choice);
      toast.success('Choice submitted!');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to submit choice');
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
      setSelectedChoice(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to start next round');
    }
  };

  // Process actions to get current state
  let currentState = gameState;
  if (actions && gameState.phase) {
    actions.forEach(action => {
      try {
        currentState = processThisOrThatAction(currentState, action);
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

  const userChoice = currentState.choices[user?.id || ''];
  const allChosen = playerIds.every(id => currentState.choices[id]);

  // Complete game if finished
  useEffect(() => {
    if (isThisOrThatComplete(currentState) && session && actions) {
      const results = calculateThisOrThatResults(currentState, actions);
      completeGameMutation.mutate({
        sessionId,
        results,
      });
    }
  }, [currentState.round, currentState.phase, session, actions]);

  if (currentState.phase === 'choosing') {
    return (
      <Card className="animate-slide-up">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>This or That</CardTitle>
            <Badge variant="secondary">Round {currentState.round}/10</Badge>
          </div>
          <CardDescription>
            Quick choice! Pick your preference.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {userChoice ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">Waiting for other players...</p>
              <div className="flex gap-2 justify-center flex-wrap">
                {playerIds.map((userId) => {
                  const player = activePlayers.find(p => p.user_id === userId);
                  const hasChosen = currentState.choices[userId];
                  return (
                    <Badge
                      key={userId}
                      variant={hasChosen ? 'default' : 'outline'}
                      className={cn(hasChosen && 'bg-primary/20 text-primary')}
                    >
                      {player?.user?.name || 'Player'} {hasChosen ? '✓' : ''}
                    </Badge>
                  );
                })}
              </div>
            </div>
          ) : (
            <>
              <div className="text-center py-8 space-y-6">
                <div className={cn(
                  'text-3xl font-bold transition-all',
                  selectedChoice === 'A' && 'text-primary scale-110'
                )}>
                  {currentState.currentQuestion.optionA}
                </div>
                <div className="text-2xl text-muted-foreground">VS</div>
                <div className={cn(
                  'text-3xl font-bold transition-all',
                  selectedChoice === 'B' && 'text-primary scale-110'
                )}>
                  {currentState.currentQuestion.optionB}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Button
                  variant={selectedChoice === 'A' ? 'default' : 'outline'}
                  size="lg"
                  onClick={() => handleChoose('A')}
                  disabled={submitActionMutation.isPending}
                  className={cn(
                    'h-20 text-lg font-bold transition-all',
                    selectedChoice === 'A' && 'ring-2 ring-primary shadow-[var(--shadow-soft)] scale-105'
                  )}
                >
                  This
                </Button>
                <Button
                  variant={selectedChoice === 'B' ? 'default' : 'outline'}
                  size="lg"
                  onClick={() => handleChoose('B')}
                  disabled={submitActionMutation.isPending}
                  className={cn(
                    'h-20 text-lg font-bold transition-all',
                    selectedChoice === 'B' && 'ring-2 ring-primary shadow-[var(--shadow-soft)] scale-105'
                  )}
                >
                  That
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    );
  }

  if (currentState.phase === 'results') {
    const lastResult = currentState.roundResults[currentState.roundResults.length - 1];
    const isComplete = isThisOrThatComplete(currentState);

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
                <div className="space-y-2">
                  <p className="text-xl font-semibold">{lastResult.question.optionA}</p>
                  <Badge variant="default" className="text-lg px-4 py-2">
                    {lastResult.choicesA} {lastResult.choicesA === 1 ? 'choice' : 'choices'}
                  </Badge>
                </div>
                <div className="text-muted-foreground text-lg">VS</div>
                <div className="space-y-2">
                  <p className="text-xl font-semibold">{lastResult.question.optionB}</p>
                  <Badge variant="default" className="text-lg px-4 py-2">
                    {lastResult.choicesB} {lastResult.choicesB === 1 ? 'choice' : 'choices'}
                  </Badge>
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

