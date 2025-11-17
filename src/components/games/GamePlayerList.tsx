import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import type { GameSessionPlayer } from '@/services/games.service';
import { cn } from '@/lib/utils';

/**
 * Game player list component
 * 
 * Displays active players in a game session with their scores and turn indicators.
 * Uses Yoke aesthetic with rounded corners and soft shadows.
 */
export function GamePlayerList({
  players,
  currentTurnUserId,
  showScores = false,
}: {
  players: GameSessionPlayer[];
  currentTurnUserId?: string | null;
  showScores?: boolean;
}) {
  const activePlayers = players.filter(p => p.is_active);

  if (activePlayers.length === 0) {
    return null;
  }

  return (
    <Card className="bg-secondary/30 border-primary/20">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 flex-wrap justify-center">
          {activePlayers.map((player) => {
            const isCurrentTurn = currentTurnUserId === player.user_id;
            return (
              <div
                key={player.user_id}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-lg transition-all',
                  isCurrentTurn && 'bg-primary/20 ring-2 ring-primary shadow-[var(--shadow-soft)]'
                )}
              >
                <Avatar className={cn(
                  'w-8 h-8 transition-all',
                  isCurrentTurn && 'ring-2 ring-primary'
                )}>
                  <AvatarImage src={player.user?.photo_url} alt={player.user?.name} />
                  <AvatarFallback className="bg-primary/20 text-primary">
                    {player.user?.name?.charAt(0).toUpperCase() || '?'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{player.user?.name || 'Player'}</span>
                  {showScores && (
                    <span className="text-xs text-muted-foreground">
                      {player.score} {player.score === 1 ? 'point' : 'points'}
                    </span>
                  )}
                </div>
                {isCurrentTurn && (
                  <Badge variant="default" className="ml-1 text-xs">
                    Turn
                  </Badge>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

