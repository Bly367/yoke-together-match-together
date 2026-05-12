import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { useGameSession, useGameActions, useSubmitGameAction, useUpdateGameSessionState, useCompleteGameSession } from '@/hooks/useGames';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';
import type { TwoTruthsAndLieState } from '@/services/games/twoTruthsAndLie.service';
import {
  initializeTwoTruthsAndLieState,
  validateTwoTruthsAndLieAction,
  processTwoTruthsAndLieAction,
  isTwoTruthsAndLieComplete,
  calculateTwoTruthsAndLieResults,
} from '@/services/games/twoTruthsAndLie.service';
import { GameResults } from './GameResults';
import { cn } from '@/lib/utils';

/**
 * Two Truths and a Lie game component
 * 
 * Players submit 3 statements (2 true, 1 false), then others guess which is the lie.
 */
export function TwoTruthsAndLie({ sessionId }: { sessionId: string }) {
  const { user } = useAuth();
  const { data: session } = useGameSession(sessionId, true);
  const { data: actions } = useGameActions(sessionId, undefined, true);
  const submitActionMutation = useSubmitGameAction();
  const updateStateMutation = useUpdateGameSessionState();
  const completeGameMutation = useCompleteGameSession();

  const [statements, setStatements] = useState(['', '', '']);
  const [lieIndex, setLieIndex] = useState<number>(-1);
  const [targetUserId, setTargetUserId] = useState<string | null>(null);
  const [guessedLieIndex, setGuessedLieIndex] = useState<number>(-1);

  const gameState = (session?.game_state ?? {}) as unknown as TwoTruthsAndLieState;
  const playerIds = session?.players?.filter(p => p.is_active).map(p => p.user_id) || [];
  const activePlayers = session?.players?.filter(p => p.is_active) || [];

  // Initialize game state if needed (only if session is active and state not initialized)
  useEffect(() => {
    if (session && session.status === 'active' && !gameState.phase && playerIds.length > 0) {
      const initialState = initializeTwoTruthsAndLieState(playerIds);
      updateStateMutation.mutate({
        sessionId,
        gameState: initialState,
      });
    }
  }, [session?.status, gameState.phase, playerIds.length]);

  if (!gameState.phase) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const handleSubmitStatements = async () => {
    if (!user?.id) return;
    if (statements.some(s => !s.trim()) || lieIndex < 0) {
      toast.error('Please fill in all statements and select which one is the lie');
      return;
    }

    try {
      const action = {
        sessionId,
        userId: user.id,
        actionType: 'submit_statements',
        actionData: { statements, lieIndex },
        roundNumber: gameState.round,
      };

      const validation = validateTwoTruthsAndLieAction(gameState, user.id, {
        id: '',
        session_id: sessionId,
        user_id: user.id,
        action_type: 'submit_statements',
        action_data: { statements, lieIndex },
        round_number: gameState.round,
        created_at: new Date().toISOString(),
      } as any);

      if (!validation.valid) {
        toast.error(validation.error);
        return;
      }

      await submitActionMutation.mutateAsync(action);
      toast.success('Statements submitted!');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to submit statements');
    }
  };

  const handleGuess = async () => {
    if (!user?.id || !targetUserId || guessedLieIndex < 0) return;

    try {
      await submitActionMutation.mutateAsync({
        sessionId,
        userId: user.id,
        actionType: 'guess_lie',
        actionData: { targetUserId, guessedLieIndex },
        roundNumber: gameState.round,
      });
      toast.success('Guess submitted!');
      setTargetUserId(null);
      setGuessedLieIndex(-1);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to submit guess');
    }
  };

  // Process actions to get current state
  let currentState = gameState;
  if (actions && gameState.phase) {
    // Only process if we have a valid initial state
    actions.forEach(action => {
      try {
        currentState = processTwoTruthsAndLieAction(currentState, action);
      } catch (error) {
        logger.error('Error processing action', error);
      }
    });
    
    // Update game state in database if phase changed (important state transitions)
    if (currentState.phase !== gameState.phase) {
      updateStateMutation.mutate({
        sessionId,
        gameState: currentState,
      });
    }
  }

  const userSubmission = currentState.submissions[user?.id || ''];
  const allSubmissions = Object.entries(currentState.submissions).filter(([_, sub]) => sub.submitted);

  // Complete game if finished
  useEffect(() => {
    if (isTwoTruthsAndLieComplete(currentState) && session && actions) {
      const results = calculateTwoTruthsAndLieResults(currentState, actions);
      completeGameMutation.mutate({
        sessionId,
        results,
      });
    }
  }, [currentState.phase, session, actions]);

  if (currentState.phase === 'submitting') {
    return (
      <Card className="animate-slide-up">
        <CardHeader>
          <CardTitle>Two Truths and a Lie</CardTitle>
          <CardDescription>
            Submit 3 statements about yourself: 2 true, 1 false. Others will guess which is the lie!
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {userSubmission?.submitted ? (
            <div className="text-center py-8">
              <CheckCircle2 className="w-12 h-12 text-primary mx-auto mb-4" />
              <p className="text-muted-foreground">Waiting for other players to submit...</p>
              <div className="mt-4 flex gap-2 justify-center">
                {allSubmissions.map(([userId]) => {
                  const player = activePlayers.find(p => p.user_id === userId);
                  return (
                    <Badge key={userId} variant="secondary">
                      {player?.user?.name || 'Player'}
                    </Badge>
                  );
                })}
              </div>
            </div>
          ) : (
            <>
              {[0, 1, 2].map((index) => (
                <div key={index} className="space-y-2">
                  <Label>Statement {index + 1}</Label>
                  <Input
                    value={statements[index]}
                    onChange={(e) => {
                      const newStatements = [...statements];
                      newStatements[index] = e.target.value;
                      setStatements(newStatements);
                    }}
                    placeholder={`Enter statement ${index + 1}...`}
                    className="rounded-lg"
                  />
                </div>
              ))}
              
              <div className="space-y-2">
                <Label>Which statement is the lie?</Label>
                <div className="flex gap-2">
                  {[0, 1, 2].map((index) => (
                    <Button
                      key={index}
                      variant={lieIndex === index ? 'default' : 'outline'}
                      onClick={() => setLieIndex(index)}
                      className="flex-1"
                    >
                      Statement {index + 1}
                    </Button>
                  ))}
                </div>
              </div>

              <Button
                onClick={handleSubmitStatements}
                className="w-full"
                variant="yolk"
                disabled={submitActionMutation.isPending}
              >
                {submitActionMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit Statements'
                )}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    );
  }

  if (currentState.phase === 'guessing') {
    const otherSubmissions = allSubmissions.filter(([userId]) => userId !== user?.id);
    const selectedSubmission = targetUserId ? currentState.submissions[targetUserId] : null;

    return (
      <Card className="animate-slide-up">
        <CardHeader>
          <CardTitle>Guess the Lie</CardTitle>
          <CardDescription>
            Read each player's statements and guess which one is the lie!
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!targetUserId ? (
            <div className="space-y-2">
              <Label>Select a player to guess:</Label>
              <div className="grid grid-cols-2 gap-2">
                {otherSubmissions.map(([userId]) => {
                  const player = activePlayers.find(p => p.user_id === userId);
                  const hasGuessed = currentState.guesses[user?.id || '']?.userId === userId;
                  return (
                    <Button
                      key={userId}
                      variant={hasGuessed ? 'secondary' : 'outline'}
                      onClick={() => setTargetUserId(userId)}
                      disabled={hasGuessed}
                      className="h-auto py-3"
                    >
                      <div className="text-center">
                        <div className="font-semibold">{player?.user?.name || 'Player'}</div>
                        {hasGuessed && (
                          <div className="text-xs text-muted-foreground mt-1">Already guessed</div>
                        )}
                      </div>
                    </Button>
                  );
                })}
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>
                    {activePlayers.find(p => p.user_id === targetUserId)?.user?.name || 'Player'}'s Statements:
                  </Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setTargetUserId(null);
                      setGuessedLieIndex(-1);
                    }}
                  >
                    Change Player
                  </Button>
                </div>
                
                {selectedSubmission?.statements.map((statement, index) => (
                  <Card
                    key={index}
                    className={cn(
                      'cursor-pointer transition-all hover:shadow-md',
                      guessedLieIndex === index && 'ring-2 ring-primary shadow-[var(--shadow-soft)]'
                    )}
                    onClick={() => setGuessedLieIndex(index)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          'w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold',
                          guessedLieIndex === index
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground'
                        )}>
                          {index + 1}
                        </div>
                        <p className="flex-1">{statement}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Button
                onClick={handleGuess}
                className="w-full"
                variant="yolk"
                disabled={guessedLieIndex < 0 || submitActionMutation.isPending}
              >
                {submitActionMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit Guess'
                )}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    );
  }

  if (currentState.phase === 'results') {
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

    // Calculate ranks
    results.sort((a, b) => b.final_score - a.final_score);
    results.forEach((result, index) => {
      result.rank = index + 1;
    });

    return <GameResults results={results} />;
  }

  return null;
}

