import { useAvailableGames } from '@/hooks/useGames';
import { GameCard } from './GameCard';
import { Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

/**
 * Games list component
 * 
 * Displays all available games that can be played in a match.
 * Shows loading state and error handling.
 */
export function GamesList({ matchId, onGameSelect }: { matchId: string; onGameSelect: (gameId: string) => void }) {
  const { data: games, isLoading, isError, error } = useAvailableGames();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Failed to load games. {error instanceof Error ? error.message : 'Unknown error'}
        </AlertDescription>
      </Alert>
    );
  }

  if (!games || games.length === 0) {
    return (
      <Alert>
        <AlertDescription>No games available at the moment.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Available Games</h3>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {games.map((game) => (
          <GameCard
            key={game.id}
            game={game}
            onSelect={() => onGameSelect(game.id)}
          />
        ))}
      </div>
    </div>
  );
}

