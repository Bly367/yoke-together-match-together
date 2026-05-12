import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowRight } from 'lucide-react';
import { useGameSession, useGameActions, useSubmitGameAction, useUpdateGameSessionState, useCompleteGameSession } from '@/hooks/useGames';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';
import type { WouldYouRatherState } from '@/services/games/wouldYouRather.service';
import {
  initializeWouldYouRatherState,
  processWouldYouRatherAction,
  isWouldYouRatherComplete,
  calculateWouldYouRatherResults,
} from '@/services/games/wouldYouRather.service';
import { GameResults } from './GameResults';
import { cn } from '@/lib/utils';

/**
 * Would You Rather game component
 * 
 * Players vote on "Would You Rather" questions and see results.
 */
export function WouldYouRather({ sessionId }: { sessionId: string }) {
  const { user } = useAuth();
  const { data: session } = useGameSession(sessionId, true);
  const { data: actions } = useGameActions(sessionId, undefined, true);
  const submitActionMutation = useSubmitGameAction();
  const updateStateMutation = useUpdateGameSessionState();
  const completeGameMutation = useCompleteGameSession();

  const [selectedChoice, setSelectedChoice] = useState<'A' | 'B' | null>(null);

  const gameState = (session?.game_state ?? {}) as unknown as WouldYouRatherState;
  const playerIds = session?.players?.filter(p => p.is_active).map(p => p.user_id) || [];
  const activePlayers = session?.players?.filter(p => p.is_active) || [];

  // Initialize game state if needed (only if session is active and state not initialized)
  useEffect(() => {
    if (session && session.status === 'active' && !gameState.phase && playerIds.length > 0) {
      const initialState = initializeWouldYouRatherState(playerIds);
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

  const handleVote = async (choice: 'A' | 'B') => {
    if (!user?.id) return;

    try {
      await submitActionMutation.mutateAsync({
        sessionId,
        userId: user.id,
        actionType: 'vote',
        actionData: { choice },
        roundNumber: gameState.round,
      });
      setSelectedChoice(choice);
      toast.success('Vote submitted!');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to submit vote');
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
        currentState = processWouldYouRatherAction(currentState, action);
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

  const userVote = currentState.votes[user?.id || ''];

  // Complete game if finished
  useEffect(() => {
    if (isWouldYouRatherComplete(currentState) && session && actions) {
      const results = calculateWouldYouRatherResults(currentState, actions);
      completeGameMutation.mutate({
        sessionId,
        results,
      });
    }
  }, [currentState.round, currentState.phase, session, actions]);

  if (currentState.phase === 'voting') {
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
            <CardTitle>Would You Rather</CardTitle>
            <Badge variant="secondary">Round {currentState.round}/5</Badge>
          </div>
          <CardDescription>
            Choose your preference and see what others think!
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {userVote ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">Waiting for other players to vote...</p>
              <div className="flex gap-2 justify-center">
                {playerIds.map((userId) => {
                  const player = activePlayers.find(p => p.user_id === userId);
                  const hasVoted = currentState.votes[userId];
                  return (
                    <Badge
                      key={userId}
                      variant={hasVoted ? 'default' : 'outline'}
                      className={cn(hasVoted && 'bg-primary/20 text-primary')}
                    >
                      {player?.user?.name || 'Player'} {hasVoted ? '✓' : ''}
                    </Badge>
                  );
                })}
              </div>
            </div>
          ) : (
            <>
              <div className="text-center py-6">
                <h3 className="text-xl font-semibold mb-6">{question.optionA}</h3>
                <div className="text-muted-foreground mb-6">OR</div>
                <h3 className="text-xl font-semibold">{question.optionB}</h3>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Button
                  variant={selectedChoice === 'A' ? 'default' : 'outline'}
                  size="lg"
                  onClick={() => handleVote('A')}
                  disabled={submitActionMutation.isPending}
                  className={cn(
                    'h-24 text-base font-semibold transition-all',
                    selectedChoice === 'A' && 'ring-2 ring-primary shadow-[var(--shadow-soft)]'
                  )}
                >
                  Option A
                </Button>
                <Button
                  variant={selectedChoice === 'B' ? 'default' : 'outline'}
                  size="lg"
                  onClick={() => handleVote('B')}
                  disabled={submitActionMutation.isPending}
                  className={cn(
                    'h-24 text-base font-semibold transition-all',
                    selectedChoice === 'B' && 'ring-2 ring-primary shadow-[var(--shadow-soft)]'
                  )}
                >
                  Option B
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
    const isComplete = isWouldYouRatherComplete(currentState);

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
              <div className="text-center py-4 space-y-4">
                <div className="space-y-2">
                  <p className="text-lg font-semibold">{lastResult.question.optionA}</p>
                  <Badge variant="default" className="text-lg px-4 py-2">
                    {lastResult.votesA} {lastResult.votesA === 1 ? 'vote' : 'votes'}
                  </Badge>
                </div>
                <div className="text-muted-foreground">OR</div>
                <div className="space-y-2">
                  <p className="text-lg font-semibold">{lastResult.question.optionB}</p>
                  <Badge variant="default" className="text-lg px-4 py-2">
                    {lastResult.votesB} {lastResult.votesB === 1 ? 'vote' : 'votes'}
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

