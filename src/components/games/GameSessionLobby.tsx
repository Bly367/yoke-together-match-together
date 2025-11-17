import { useGameSession, useJoinGameSession, useLeaveGameSession } from '@/hooks/useGames';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, Users, Play, LogOut } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { OptimizedImage } from '@/components/OptimizedImage';
import { toast } from 'sonner';

/**
 * Game session lobby component
 * 
 * Shows waiting/joining screen for a game session.
 * Displays active players and allows joining/leaving.
 */
export function GameSessionLobby({
  sessionId,
  onStart,
}: {
  sessionId: string;
  onStart?: () => void;
}) {
  const { user } = useAuth();
  const { data: session, isLoading, isError } = useGameSession(sessionId, true);
  const joinMutation = useJoinGameSession();
  const leaveMutation = useLeaveGameSession();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (isError || !session) {
    return (
      <Alert variant="destructive">
        <AlertDescription>Failed to load game session.</AlertDescription>
      </Alert>
    );
  }

  const game = session.game;
  if (!game) {
    return (
      <Alert variant="destructive">
        <AlertDescription>Game information not found.</AlertDescription>
      </Alert>
    );
  }

  const activePlayers = session.players?.filter(p => p.is_active) || [];
  const isUserJoined = activePlayers.some(p => p.user_id === user?.id);
  const canStart = session.status === 'waiting' && activePlayers.length >= game.min_players;
  const isCreator = session.created_by === user?.id;

  const handleJoin = async () => {
    if (!user?.id) return;
    try {
      await joinMutation.mutateAsync({ sessionId, userId: user.id });
      toast.success('Joined game session');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to join game');
    }
  };

  const handleLeave = async () => {
    if (!user?.id) return;
    try {
      await leaveMutation.mutateAsync({ sessionId, userId: user.id });
      toast.success('Left game session');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to leave game');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{game.name}</CardTitle>
        <CardDescription>{game.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="w-4 h-4" />
          <span>
            {activePlayers.length} / {game.max_players} players
          </span>
        </div>

        <div className="space-y-2">
          <h4 className="text-sm font-medium">Players</h4>
          <div className="flex flex-wrap gap-2">
            {activePlayers.map((player) => (
              <div key={player.user_id} className="flex items-center gap-2">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={player.user?.photo_url} alt={player.user?.name} />
                  <AvatarFallback>
                    {player.user?.name?.charAt(0).toUpperCase() || '?'}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm">{player.user?.name || 'Unknown'}</span>
              </div>
            ))}
          </div>
        </div>

        {session.status === 'waiting' && (
          <div className="space-y-2">
            {!isUserJoined ? (
              <Button onClick={handleJoin} className="w-full" disabled={joinMutation.isPending}>
                {joinMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Joining...
                  </>
                ) : (
                  'Join Game'
                )}
              </Button>
            ) : (
              <div className="flex gap-2">
                {isCreator && canStart && onStart && (
                  <Button onClick={onStart} className="flex-1">
                    <Play className="w-4 h-4 mr-2" />
                    Start Game
                  </Button>
                )}
                <Button
                  onClick={handleLeave}
                  variant="outline"
                  className="flex-1"
                  disabled={leaveMutation.isPending}
                >
                  {leaveMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Leaving...
                    </>
                  ) : (
                    <>
                      <LogOut className="w-4 h-4 mr-2" />
                      Leave
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        )}

        {session.status === 'active' && (
          <Alert>
            <AlertDescription>Game is in progress!</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

