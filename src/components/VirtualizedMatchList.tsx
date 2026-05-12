import { useEffect, useRef, useMemo, useCallback, memo } from 'react';
import { VariableSizeList } from 'react-window';
import { formatTime, formatRelativeTime, getOtherDuo, getMatchName } from '@/lib/utils';
import { User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { OptimizedImage } from '@/components/OptimizedImage';
import type { Match } from '@/services/matching.service';
import type { Message } from '@/services/chat.service';

interface MatchItem {
  match: Match;
  otherDuo: ReturnType<typeof getOtherDuo>;
  lastMessage?: Message;
  unreadCount: number;
  matchName: string;
}

interface VirtualizedMatchListProps {
  matches: MatchItem[];
  currentUserId: string | null;
  onMatchClick: (matchId: string) => void;
  containerHeight: number;
}

interface MatchRowProps {
  index: number;
  style: React.CSSProperties;
  data: {
    matches: MatchItem[];
    currentUserId: string | null;
    onMatchClick: (matchId: string) => void;
    getItemSize: (index: number) => number;
    setItemSize: (index: number, size: number) => void;
  };
}

// Separate row component to allow hooks
const MatchRow = memo(({ index, style, data }: MatchRowProps) => {
  const { matches, currentUserId, onMatchClick, getItemSize, setItemSize } = data;
  const matchItem = matches[index];
  const rowRef = useRef<HTMLDivElement>(null);

  // Measure and update height
  useEffect(() => {
    if (rowRef.current) {
      const height = rowRef.current.getBoundingClientRect().height;
      if (height !== getItemSize(index)) {
        setItemSize(index, height);
      }
    }
  }, [index, matchItem?.lastMessage, getItemSize, setItemSize]);

  if (!matchItem || !matchItem.otherDuo) return null;

  const { match, otherDuo, lastMessage, unreadCount, matchName } = matchItem;
  const hasUnread = unreadCount > 0;

  return (
    <div style={style} className="px-4 pb-3">
      <div
        ref={rowRef}
        onClick={() => onMatchClick(match.id)}
        className="bg-card rounded-3xl p-4 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-soft)] transition-all cursor-pointer animate-slide-up group"
      >
        <div className="flex items-center gap-4">
          {/* Duo Avatars */}
          <div className="relative flex-shrink-0">
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center shadow-md overflow-hidden ring-2 ring-transparent group-hover:ring-primary/20 transition-all">
              <OptimizedImage
                key={`${match.id}-member1-${otherDuo.member1?.photo_url || 'no-photo'}`}
                src={otherDuo.member1?.photo_url}
                alt={otherDuo.member1?.name || 'Member 1'}
                className="w-full h-full"
                fallbackIcon={<User className="w-6 h-6 text-primary" />}
              />
            </div>
            <div className="w-12 h-12 rounded-full bg-secondary/30 flex items-center justify-center absolute -right-3 top-0 shadow-md border-2 border-card overflow-hidden ring-2 ring-transparent group-hover:ring-primary/20 transition-all">
              <OptimizedImage
                key={`${match.id}-member2-${otherDuo.member2?.photo_url || 'no-photo'}`}
                src={otherDuo.member2?.photo_url}
                alt={otherDuo.member2?.name || 'Member 2'}
                className="w-full h-full"
                fallbackIcon={<User className="w-6 h-6 text-primary" />}
              />
            </div>
          </div>

          {/* Match Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-semibold text-base text-foreground truncate">
                {matchName}
              </h3>
              {lastMessage && (
                <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                  {formatTime(lastMessage.created_at)}
                </span>
              )}
            </div>
            {lastMessage ? (
              <div className="flex items-center gap-2">
                <p className={cn(
                  "text-sm truncate flex-1",
                  hasUnread ? "text-foreground font-medium" : "text-muted-foreground"
                )}>
                  {lastMessage.sender?.id === currentUserId ? (
                    <span className="text-muted-foreground">You: </span>
                  ) : (
                    <span className="text-muted-foreground">{lastMessage.sender?.name || 'Someone'}: </span>
                  )}
                  {lastMessage.content}
                </p>
                {hasUnread && (
                  <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic truncate">
                No messages yet • Matched {formatRelativeTime(match.matched_at)}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

MatchRow.displayName = 'MatchRow';

/**
 * Virtualized match list component for efficient rendering of long match lists
 * Only renders visible matches, improving performance for users with 50+ matches
 */
export function VirtualizedMatchList({
  matches,
  currentUserId,
  onMatchClick,
  containerHeight,
}: VirtualizedMatchListProps) {
  const listRef = useRef<VariableSizeList>(null);
  const itemHeightsRef = useRef<Map<number, number>>(new Map());

  // Estimate item height (will be adjusted based on actual rendered height)
  const getItemSize = useCallback(
    (index: number) => {
      const cachedHeight = itemHeightsRef.current.get(index);
      if (cachedHeight) return cachedHeight;
      
      // Base height for match card (approximately 100px)
      return 100;
    },
    []
  );

  // Store actual item height after render
  const setItemSize = useCallback((index: number, size: number) => {
    itemHeightsRef.current.set(index, size);
    if (listRef.current) {
      listRef.current.resetAfterIndex(index);
    }
  }, []);

  // Prepare row data
  const rowData = useMemo(() => ({
    matches,
    currentUserId,
    onMatchClick,
    getItemSize,
    setItemSize,
  }), [matches, currentUserId, onMatchClick, getItemSize, setItemSize]);

  if (matches.length === 0) {
    return null;
  }

  return (
    <VariableSizeList
      ref={listRef}
      height={containerHeight}
      itemCount={matches.length}
      itemSize={getItemSize}
      itemData={rowData}
      width="100%"
      overscanCount={5}
    >
      {MatchRow}
    </VariableSizeList>
  );
}

