import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, Users } from 'lucide-react';
import type { Game } from '@/services/games.service';

/**
 * Game card component
 * 
 * Displays a game with its details and a button to start playing.
 */
export function GameCard({ game, onSelect }: { game: Game; onSelect: () => void }) {
  const categoryColors: Record<string, string> = {
    'ice-breaker': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    'trivia': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    'comparison': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    'quiz': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
    'other': 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
  };

  const categoryColor = categoryColors[game.category || 'other'] || categoryColors.other;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <CardTitle className="text-lg">{game.name}</CardTitle>
          {game.category && (
            <Badge className={categoryColor}>{game.category}</Badge>
          )}
        </div>
        <CardDescription className="mt-2">{game.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            <span>
              {game.min_players === game.max_players
                ? `${game.min_players} players`
                : `${game.min_players}-${game.max_players} players`}
            </span>
          </div>
          {game.estimated_duration_minutes && (
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>~{game.estimated_duration_minutes} minutes</span>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter>
        <Button onClick={onSelect} className="w-full">
          Play Game
        </Button>
      </CardFooter>
    </Card>
  );
}

