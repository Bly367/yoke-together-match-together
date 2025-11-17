import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Award } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { GameResult } from '@/services/games.service';
import { cn } from '@/lib/utils';

/**
 * Game results display component
 * 
 * Shows final scores, ranks, and achievements with Yoke aesthetic.
 */
export function GameResults({ results }: { results: GameResult[] }) {
  const sortedResults = [...results].sort((a, b) => (a.rank || 0) - (b.rank || 0));

  return (
    <div className="space-y-4 animate-slide-up">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-foreground mb-2">Game Results</h2>
        <p className="text-muted-foreground">Final scores and achievements</p>
      </div>

      <div className="space-y-3">
        {sortedResults.map((result, index) => {
          const isWinner = result.rank === 1;
          const medalColors = {
            1: 'bg-gradient-to-r from-primary to-secondary text-primary-foreground',
            2: 'bg-secondary text-secondary-foreground',
            3: 'bg-muted text-muted-foreground',
          };

          return (
            <Card
              key={result.user_id}
              className={cn(
                'transition-all hover:shadow-lg',
                isWinner && 'ring-2 ring-primary shadow-[var(--shadow-soft)]'
              )}
            >
              <CardHeader>
                <div className="flex items-center gap-4">
                  <div className={cn(
                    'w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg shadow-[var(--shadow-soft)]',
                    medalColors[result.rank as keyof typeof medalColors] || 'bg-muted'
                  )}>
                    {isWinner ? (
                      <Trophy className="w-6 h-6" />
                    ) : (
                      <span>#{result.rank}</span>
                    )}
                  </div>
                  
                  <div className="flex-1 flex items-center gap-3">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={result.user?.photo_url} alt={result.user?.name} />
                      <AvatarFallback className="bg-primary/20 text-primary">
                        {result.user?.name?.charAt(0).toUpperCase() || '?'}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1">
                      <CardTitle className="text-lg">{result.user?.name || 'Unknown'}</CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-sm font-semibold text-primary">
                          {result.final_score} {result.final_score === 1 ? 'point' : 'points'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardHeader>

              {result.achievements && result.achievements.length > 0 && (
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {result.achievements.map((achievement, idx) => (
                      <Badge
                        key={idx}
                        className="bg-primary/20 text-primary border-primary/30"
                      >
                        <Award className="w-3 h-3 mr-1" />
                        {achievement}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

