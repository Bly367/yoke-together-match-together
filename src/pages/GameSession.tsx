import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useGameSession, useUpdateGameSessionState } from '@/hooks/useGames';
import { GameSessionLobby } from '@/components/games/GameSessionLobby';
import { TwoTruthsAndLie } from '@/components/games/TwoTruthsAndLie';
import { WouldYouRather } from '@/components/games/WouldYouRather';
import { ThisOrThat } from '@/components/games/ThisOrThat';
import { CompatibilityQuiz } from '@/components/games/CompatibilityQuiz';
import { TriviaChallenge } from '@/components/games/TriviaChallenge';
import { GameResults } from '@/components/games/GameResults';
import { useGameResults } from '@/hooks/useGames';
import { ROUTES } from '@/lib/routes';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { BottomNavigation } from '@/components/BottomNavigation';
import { initializeTwoTruthsAndLieState } from '@/services/games/twoTruthsAndLie.service';
import { initializeWouldYouRatherState } from '@/services/games/wouldYouRather.service';
import { initializeThisOrThatState } from '@/services/games/thisOrThat.service';
import { initializeCompatibilityQuizState } from '@/services/games/compatibilityQuiz.service';
import { initializeTriviaChallengeState } from '@/services/games/triviaChallenge.service';

/**
 * Game session page component
 * 
 * Displays a game session with lobby, active game, or results.
 * Currently shows lobby - game-specific components will be added in Phase 4.
 */
export default function GameSession() {
  const { matchId, sessionId } = useParams<{ matchId: string; sessionId: string }>();
  const navigate = useNavigate();
  const { data: session, isLoading, isError } = useGameSession(sessionId || null, !!sessionId);
  const updateSessionMutation = useUpdateGameSessionState();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isError || !session || !matchId || !sessionId) {
    return (
      <div className="container mx-auto p-4">
        <Alert variant="destructive">
          <AlertDescription>Failed to load game session.</AlertDescription>
        </Alert>
        <Button
          onClick={() => navigate(ROUTES.CHAT(matchId || ''))}
          variant="outline"
          className="mt-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Chat
        </Button>
      </div>
    );
  }

  const { data: results } = useGameResults(
    session.status === 'completed' ? sessionId : null,
    session.status === 'completed'
  );

  const handleStart = async () => {
    if (!sessionId || !session) return;
    
    const playerIds = session.players?.filter(p => p.is_active).map(p => p.user_id) || [];
    if (playerIds.length === 0) {
      toast.error('No active players in session');
      return;
    }

    // Initialize game state based on game type
    let initialState: Record<string, unknown> = {};
    const gameName = session.game?.name;

    try {
      switch (gameName) {
        case 'two-truths-and-a-lie':
          initialState = initializeTwoTruthsAndLieState(playerIds) as unknown as Record<string, unknown>;
          break;
        case 'would-you-rather':
          initialState = initializeWouldYouRatherState(playerIds) as unknown as Record<string, unknown>;
          break;
        case 'this-or-that':
          initialState = initializeThisOrThatState(playerIds) as unknown as Record<string, unknown>;
          break;
        case 'compatibility-quiz':
          initialState = initializeCompatibilityQuizState(playerIds) as unknown as Record<string, unknown>;
          break;
        case 'trivia-challenge':
          initialState = initializeTriviaChallengeState(playerIds) as unknown as Record<string, unknown>;
          break;
        default:
          initialState = { round: 1, started: true };
      }

      await updateSessionMutation.mutateAsync({
        sessionId,
        status: 'active',
        gameState: initialState,
      });
      toast.success('Game started!');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to start game');
    }
  };

  // Render game-specific component based on game name
  const renderGameComponent = () => {
    if (!session.game) return null;

    const gameName = session.game.name;
    
    switch (gameName) {
      case 'two-truths-and-a-lie':
        return <TwoTruthsAndLie sessionId={sessionId} />;
      case 'would-you-rather':
        return <WouldYouRather sessionId={sessionId} />;
      case 'this-or-that':
        return <ThisOrThat sessionId={sessionId} />;
      case 'compatibility-quiz':
        return <CompatibilityQuiz sessionId={sessionId} />;
      case 'trivia-challenge':
        return <TriviaChallenge sessionId={sessionId} />;
      default:
        return (
          <Alert>
            <AlertDescription>
              Unknown game type: {gameName}. Please contact support.
            </AlertDescription>
          </Alert>
        );
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background pb-20">
      <div className="container mx-auto p-4 max-w-2xl flex-1">
        <div className="mb-4">
          <Button
            onClick={() => navigate(ROUTES.CHAT(matchId))}
            variant="ghost"
            size="sm"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Chat
          </Button>
        </div>

        {session.status === 'waiting' && (
          <GameSessionLobby sessionId={sessionId} onStart={handleStart} />
        )}

        {session.status === 'active' && renderGameComponent()}

        {session.status === 'completed' && (
          <div className="space-y-4">
            {results && results.length > 0 ? (
              <GameResults results={results} />
            ) : (
              <Alert>
                <AlertDescription>
                  Game completed! Results are being calculated...
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {session.status === 'abandoned' && (
          <Alert variant="destructive">
            <AlertDescription>This game session was abandoned.</AlertDescription>
          </Alert>
        )}
      </div>
      
      <BottomNavigation />
    </div>
  );
}

