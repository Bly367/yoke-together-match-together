import { useMemo, useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { User, Loader2, Search } from "lucide-react";
import chickMascot from "@/assets/chick-mascot.png";
import { useAuth } from "@/hooks/useAuth";
import { useMatches } from "@/hooks/useMatching";
import { useUserDuos } from "@/hooks/useDuos";
import { useAllMatchMessagesSubscription, useUnreadCounts } from "@/hooks/useChat";
import { formatRelativeTime, formatTime, getOtherDuo, getMatchName } from "@/lib/utils";
import { ROUTES } from "@/lib/routes";
import { useQuery } from "@tanstack/react-query";
import { getLastMessagesForMatches } from "@/services/chat.service";
import { LAST_MESSAGES_QUERY_KEY } from "@/hooks/useChat";
import { cn } from "@/lib/utils";
import { BottomNavigation } from "@/components/BottomNavigation";
import { VirtualizedMatchList } from "@/components/VirtualizedMatchList";

/**
 * Messages Page - ChatListView from PRD
 * 
 * Displays all matches with their last messages, sorted by most recent activity.
 * Optimized for messaging with real-time updates.
 */
const Messages = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: matches, isLoading: matchesLoading, isError: matchesError, error: matchesErrorDetails } = useMatches();
  const { data: userDuos, isLoading: userDuosLoading, isError: userDuosError, error: userDuosErrorDetails } = useUserDuos();
  const messagesListRef = useRef<HTMLDivElement>(null);
  const [containerHeight, setContainerHeight] = useState(600);

  // Get last messages for all matches
  const matchIds = useMemo(() => {
    if (!matches || !Array.isArray(matches)) return [];
    const ids = matches.map(m => m.id);
    return [...ids].sort(); // Sort for consistent query key
  }, [matches]);
  
  const { data: lastMessages = {} } = useQuery({
    queryKey: LAST_MESSAGES_QUERY_KEY(matchIds),
    queryFn: () => getLastMessagesForMatches(matchIds),
    enabled: matchIds.length > 0,
  });

  // Get unread counts for all matches
  const { data: unreadCounts = {} } = useUnreadCounts(matchIds, user?.id || null);

  // Subscribe to new messages for all matches to update previews in real-time
  useAllMatchMessagesSubscription(matchIds, matchIds.length > 0);

  // Search/filter state
  const [searchQuery, setSearchQuery] = useState("");

  // Memoize user duo IDs for O(1) lookup
  const userDuoIdsSet = useMemo(() => {
    if (!userDuos || userDuos.length === 0) return new Set<string>();
    return new Set(userDuos.map(d => d.id));
  }, [userDuos]);

  // Sort and filter matches by last message time (most recent first)
  const sortedMatches = useMemo(() => {
    if (!matches || !Array.isArray(matches)) return [];
    
    let filtered = [...matches];
    
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((match) => {
        try {
          const otherDuo = getOtherDuo(match, userDuoIdsSet);
          if (!otherDuo) return false;
          
          const matchName = getMatchName(match, userDuoIdsSet).toLowerCase();
          const lastMessage = lastMessages[match.id];
          const messageContent = lastMessage?.content?.toLowerCase() || '';
          
          return matchName.includes(query) || messageContent.includes(query);
        } catch (error) {
          console.error('Error filtering match:', error);
          return false;
        }
      });
    }
    
    // Sort by last message time (most recent first)
    return filtered.sort((a, b) => {
      try {
        const aLastMessage = lastMessages[a.id];
        const bLastMessage = lastMessages[b.id];
        
        // If both have messages, sort by message time
        if (aLastMessage && bLastMessage) {
          return new Date(bLastMessage.created_at).getTime() - new Date(aLastMessage.created_at).getTime();
        }
        
        // If only one has a message, prioritize it
        if (aLastMessage && !bLastMessage) return -1;
        if (!aLastMessage && bLastMessage) return 1;
        
        // If neither has messages, sort by match time
        return new Date(b.matched_at).getTime() - new Date(a.matched_at).getTime();
      } catch (error) {
        console.error('Error sorting matches:', error);
        return 0;
      }
    });
  }, [matches, lastMessages, searchQuery, userDuoIdsSet]);

  // Prepare match items for virtualized list
  const matchItems = useMemo(() => {
    if (!sortedMatches || !Array.isArray(sortedMatches)) return [];
    
    return sortedMatches
      .map((match) => {
        try {
          const otherDuo = getOtherDuo(match, userDuoIdsSet);
          if (!otherDuo) return null;

          return {
            match,
            otherDuo,
            lastMessage: lastMessages[match.id],
            unreadCount: unreadCounts[match.id] || 0,
            matchName: getMatchName(match, userDuoIdsSet),
          };
        } catch (error) {
          console.error('Error processing match:', error, match);
          return null;
        }
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);
  }, [sortedMatches, lastMessages, unreadCounts, userDuoIdsSet]);

  // Update container height on resize
  useEffect(() => {
    const updateHeight = () => {
      if (messagesListRef.current) {
        const rect = messagesListRef.current.getBoundingClientRect();
        setContainerHeight(window.innerHeight - rect.top - 100); // Account for header and bottom nav
      }
    };
    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, []);

  // Debug: Log current state (must be before any conditional returns)
  useEffect(() => {
    console.log('Messages page state:', {
      matches: matches?.length || 0,
      userDuos: userDuos?.length || 0,
      matchItems: matchItems.length,
      matchesLoading,
      userDuosLoading,
      matchesError,
      userDuosError,
    });
  }, [matches, userDuos, matchItems.length, matchesLoading, userDuosLoading, matchesError, userDuosError]);

  // Show loading state while essential data is loading
  if (matchesLoading || userDuosLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-muted-foreground mt-4">Loading messages...</p>
      </div>
    );
  }

  // Check if user is authenticated
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background flex items-center justify-center space-y-4">
        <p className="text-muted-foreground">Please sign in to view messages</p>
        <Button variant="outline" onClick={() => navigate(ROUTES.AUTH)}>
          Sign In
        </Button>
      </div>
    );
  }

  // If user has no duos, they can't have matches
  if (userDuos && userDuos.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background">
        <div className="bg-card shadow-sm border-b border-border">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <h1 className="text-2xl font-bold text-foreground">Messages</h1>
          </div>
        </div>
        <div className="max-w-4xl mx-auto px-4 py-20 text-center space-y-4">
          <img src={chickMascot} alt="No duos" className="w-24 h-24 mx-auto animate-bounce-soft opacity-50" />
          <h2 className="text-xl font-semibold text-foreground">No duos yet</h2>
          <p className="text-muted-foreground">Create or join a duo to start matching!</p>
          <Button variant="yolk" onClick={() => navigate(ROUTES.DUO_SETUP)}>
            Create Duo
          </Button>
        </div>
        <BottomNavigation />
      </div>
    );
  }

  // Show error state if queries failed (but allow empty duos - that's not an error)
  if (matchesError || (userDuosError && userDuos === undefined)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background flex items-center justify-center space-y-4 px-4">
        <div className="text-center space-y-2">
          <p className="text-destructive text-lg font-semibold">Failed to load messages</p>
          {matchesErrorDetails && (
            <p className="text-sm text-muted-foreground">
              Matches error: {matchesErrorDetails instanceof Error ? matchesErrorDetails.message : 'Unknown error'}
            </p>
          )}
          {userDuosErrorDetails && userDuos === undefined && (
            <p className="text-sm text-muted-foreground">
              Duos error: {userDuosErrorDetails instanceof Error ? userDuosErrorDetails.message : 'Unknown error'}
            </p>
          )}
        </div>
        <Button variant="outline" onClick={() => window.location.reload()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background">
      {/* Header */}
      <div className="bg-card shadow-sm border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-4 space-y-3">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-foreground">Messages</h1>
            <img src={chickMascot} alt="Yoke" className="w-10 h-10" />
          </div>
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search matches or messages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 rounded-full"
            />
          </div>
        </div>
      </div>

      {/* Messages List */}
      <div 
        ref={messagesListRef}
        className="max-w-4xl mx-auto pb-24 overflow-hidden"
      >
        {!matches || matches.length === 0 ? (
          <div className="text-center py-20 space-y-4 px-4">
            <img src={chickMascot} alt="No messages" className="w-24 h-24 mx-auto animate-bounce-soft opacity-50" />
            <h2 className="text-xl font-semibold text-foreground">No matches yet</h2>
            <p className="text-muted-foreground">Start swiping to find your duo matches!</p>
            <Button variant="yolk" onClick={() => navigate(ROUTES.MATCHMAKING)}>
              Start Swiping
            </Button>
          </div>
        ) : matchItems.length > 30 ? (
          // Use virtual scrolling for long lists
          <VirtualizedMatchList
            matches={matchItems}
            currentUserId={user?.id || null}
            onMatchClick={(matchId) => navigate(ROUTES.CHAT(matchId))}
            containerHeight={containerHeight}
          />
        ) : (
          // Regular rendering for shorter lists
          <div className="p-4 space-y-3">
            {matchItems.map((matchItem) => {
              const { match, otherDuo, lastMessage, unreadCount } = matchItem;
              const hasUnread = unreadCount > 0;

              return (
                <div
                  key={match.id}
                  onClick={() => navigate(ROUTES.CHAT(match.id))}
                  className="bg-card rounded-3xl p-4 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-soft)] transition-all cursor-pointer animate-slide-up group"
                >
                  <div className="flex items-center gap-4">
                    {/* Duo Avatars */}
                    <div className="relative flex-shrink-0">
                      <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center shadow-md overflow-hidden ring-2 ring-transparent group-hover:ring-primary/20 transition-all">
                        {otherDuo.member1?.photo_url ? (
                          <img
                            src={otherDuo.member1.photo_url}
                            alt={otherDuo.member1.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <User className="w-6 h-6 text-primary" />
                        )}
                      </div>
                      <div className="w-12 h-12 rounded-full bg-secondary/30 flex items-center justify-center absolute -right-3 top-0 shadow-md border-2 border-card overflow-hidden ring-2 ring-transparent group-hover:ring-primary/20 transition-all">
                        {otherDuo.member2?.photo_url ? (
                          <img
                            src={otherDuo.member2.photo_url}
                            alt={otherDuo.member2.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <User className="w-6 h-6 text-primary" />
                        )}
                      </div>
                    </div>

                    {/* Match Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-semibold text-base text-foreground truncate">
                          {matchItem.matchName}
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
                            {lastMessage.sender?.id === user?.id ? (
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
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <BottomNavigation />
    </div>
  );
};

export default Messages;

