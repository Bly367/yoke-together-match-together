import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { GamesList } from './GamesList';
import { useGameSessionsForMatch, useCreateGameSession } from '@/hooks/useGames';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '@/lib/routes';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

/**
 * Games dialog component
 * 
 * Shows available games and active game sessions for a match.
 * Allows users to start new games or join existing sessions.
 */
export function GamesDialog({
  matchId,
  open,
  onOpenChange,
}: {
  matchId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: sessions, isLoading: sessionsLoading } = useGameSessionsForMatch(matchId, false, open);
  const createSessionMutation = useCreateGameSession();

  const handleGameSelect = async (gameId: string) => {
    if (!user?.id) {
      toast.error('You must be logged in to start a game');
      return;
    }

    try {
      const session = await createSessionMutation.mutateAsync({
        matchId,
        gameId,
        createdBy: user.id,
      });
      onOpenChange(false);
      navigate(ROUTES.GAME_SESSION(matchId, session.id));
      toast.success('Game session created!');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create game session');
    }
  };

  const handleSessionClick = (sessionId: string) => {
    navigate(ROUTES.GAME_SESSION(matchId, sessionId));
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Games</DialogTitle>
          <DialogDescription>
            Play interactive games with your match. Choose a game to start or join an active session.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Active Sessions */}
          {sessionsLoading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : sessions && sessions.length > 0 ? (
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Active Games</h3>
              <div className="space-y-2">
                {sessions.map((session) => (
                  <Card
                    key={session.id}
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => handleSessionClick(session.id)}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-base">{session.game?.name || 'Unknown Game'}</CardTitle>
                        <Badge variant={session.status === 'active' ? 'default' : 'secondary'}>
                          {session.status}
                        </Badge>
                      </div>
                      <CardDescription>
                        {session.players?.filter(p => p.is_active).length || 0} / {session.game?.max_players || 4} players
                      </CardDescription>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            </div>
          ) : null}

          {/* Available Games */}
          <GamesList matchId={matchId} onGameSelect={handleGameSelect} />
        </div>
      </DialogContent>
    </Dialog>
  );
}

