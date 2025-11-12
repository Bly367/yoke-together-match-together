import { useMemo, useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, User, MessageCircle, MoreVertical, Trash2, Search } from "lucide-react";
import chickMascot from "@/assets/chick-mascot.png";
import { useAuth } from "@/hooks/useAuth";
import { useMatches, useUnmatch } from "@/hooks/useMatching";
import { useUserDuos } from "@/hooks/useDuos";
import { useAllMatchMessagesSubscription } from "@/hooks/useChat";
import { formatRelativeTime, getOtherDuo, getMatchName } from "@/lib/utils";
import { ROUTES } from "@/lib/routes";
import { useQuery } from "@tanstack/react-query";
import { getLastMessagesForMatches } from "@/services/chat.service";
import { LAST_MESSAGES_QUERY_KEY } from "@/hooks/useChat";
import { BottomNavigation } from "@/components/BottomNavigation";
import { OptimizedImage } from "@/components/OptimizedImage";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const Matches = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: matches, isLoading, isError: matchesError, error: matchesErrorDetails } = useMatches();
  const { data: userDuos, isError: userDuosError, error: userDuosErrorDetails } = useUserDuos();
  const unmatchMutation = useUnmatch();
  const [unmatchingId, setUnmatchingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMatchIds, setSelectedMatchIds] = useState<Set<string>>(new Set());
  const [isBatchMode, setIsBatchMode] = useState(false);

  // Get last messages for all matches
  const matchIds = useMemo(() => matches?.map(m => m.id) || [], [matches]);
  const { data: lastMessages = {} } = useQuery({
    queryKey: LAST_MESSAGES_QUERY_KEY(matchIds),
    queryFn: () => getLastMessagesForMatches(matchIds),
    enabled: matchIds.length > 0,
  });

  // Subscribe to new messages for all matches to update previews in real-time
  useAllMatchMessagesSubscription(matchIds, matchIds.length > 0);

  // Memoize user duo IDs for O(1) lookup
  const userDuoIdsSet = useMemo(() => {
    if (!userDuos || userDuos.length === 0) return new Set<string>();
    return new Set(userDuos.map(d => d.id));
  }, [userDuos]);

  // Filter matches by search query
  const filteredMatches = useMemo(() => {
    if (!matches) return [];
    if (!searchQuery.trim()) return matches;
    
    const query = searchQuery.toLowerCase();
    return matches.filter((match) => {
      const otherDuo = getOtherDuo(match, userDuoIdsSet);
      if (!otherDuo) return false;
      
      const matchName = getMatchName(match, userDuoIdsSet).toLowerCase();
      const lastMessage = lastMessages[match.id];
      const messageContent = lastMessage?.content.toLowerCase() || '';
      
      return matchName.includes(query) || messageContent.includes(query);
    });
  }, [matches, searchQuery, lastMessages, userDuoIdsSet]);

  const handleUnmatch = useCallback(async (matchId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent navigation when clicking unmatch
    if (!confirm("Are you sure you want to unmatch? This cannot be undone.")) return;
    
    setUnmatchingId(matchId);
    try {
      await unmatchMutation.mutateAsync(matchId);
      toast.success("Match removed");
      setSelectedMatchIds((prev) => {
        const next = new Set(prev);
        next.delete(matchId);
        return next;
      });
    } catch (error: any) {
      toast.error(error.message || "Failed to unmatch");
    } finally {
      setUnmatchingId(null);
    }
  }, [unmatchMutation]);

  const handleBatchUnmatch = useCallback(async () => {
    if (selectedMatchIds.size === 0) return;
    if (!confirm(`Are you sure you want to unmatch ${selectedMatchIds.size} match(es)? This cannot be undone.`)) return;

    const ids = Array.from(selectedMatchIds);
    setUnmatchingId('batch');
    try {
      await Promise.all(ids.map(id => unmatchMutation.mutateAsync(id)));
      toast.success(`Removed ${ids.length} match(es)`);
      setSelectedMatchIds(new Set());
      setIsBatchMode(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to unmatch some matches");
    } finally {
      setUnmatchingId(null);
    }
  }, [selectedMatchIds, unmatchMutation]);

  const toggleMatchSelection = useCallback((matchId: string) => {
    setSelectedMatchIds((prev) => {
      const next = new Set(prev);
      if (next.has(matchId)) {
        next.delete(matchId);
      } else {
        next.add(matchId);
      }
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (!matches) return;
    if (selectedMatchIds.size === matches.length) {
      setSelectedMatchIds(new Set());
    } else {
      setSelectedMatchIds(new Set(matches.map(m => m.id)));
    }
  }, [matches, selectedMatchIds.size]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Show error state if queries failed (but allow empty duos - that's not an error)
  if (matchesError || (userDuosError && userDuos === undefined)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background flex items-center justify-center space-y-4 px-4">
        <div className="text-center space-y-2">
          <p className="text-destructive text-lg font-semibold">Failed to load matches</p>
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
            <Button variant="ghost" size="icon" onClick={() => navigate(ROUTES.MATCHMAKING)}>
              <ArrowLeft className="w-6 h-6" />
            </Button>
            <h1 className="text-2xl font-bold text-foreground">Matches</h1>
            <div className="flex items-center gap-2">
              {matches && matches.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setIsBatchMode(!isBatchMode);
                    setSelectedMatchIds(new Set());
                  }}
                >
                  {isBatchMode ? 'Cancel' : 'Select'}
                </Button>
              )}
              <img src={chickMascot} alt="Yoke" className="w-10 h-10" />
            </div>
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

      {/* Batch Actions Bar */}
      {isBatchMode && selectedMatchIds.size > 0 && (
        <div className="sticky top-0 z-10 bg-card border-b border-border p-4 shadow-sm">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <Badge variant="secondary">{selectedMatchIds.size} selected</Badge>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleBatchUnmatch}
              disabled={unmatchingId === 'batch'}
            >
              {unmatchingId === 'batch' ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4 mr-2" />
              )}
              Delete ({selectedMatchIds.size})
            </Button>
          </div>
        </div>
      )}

      {/* Matches List */}
      <div className="max-w-4xl mx-auto p-4 space-y-4 pb-24">
        {isBatchMode && matches && matches.length > 0 && (
          <div className="flex items-center gap-2 px-2 pb-2">
            <Checkbox
              checked={selectedMatchIds.size === matches.length && matches.length > 0}
              onCheckedChange={toggleSelectAll}
            />
            <span className="text-sm text-muted-foreground">
              Select all ({matches.length})
            </span>
          </div>
        )}
        {!matches || matches.length === 0 ? (
          <div className="text-center py-20 space-y-4">
            <img src={chickMascot} alt="No matches" className="w-24 h-24 mx-auto animate-bounce-soft opacity-50" />
            <h2 className="text-xl font-semibold text-foreground">No matches yet</h2>
            <p className="text-muted-foreground">Start swiping to find your duo matches!</p>
            <Button variant="yolk" onClick={() => navigate(ROUTES.MATCHMAKING)}>
              Start Swiping
            </Button>
          </div>
        ) : filteredMatches.length === 0 ? (
          <div className="text-center py-20 space-y-4">
            <img src={chickMascot} alt="No results" className="w-24 h-24 mx-auto animate-bounce-soft opacity-50" />
            <h2 className="text-xl font-semibold text-foreground">No matches found</h2>
            <p className="text-muted-foreground">Try adjusting your search query</p>
          </div>
        ) : (
          filteredMatches.map((match) => {
            const otherDuo = getOtherDuo(match, userDuoIdsSet);
            if (!otherDuo) return null;

            const isSelected = selectedMatchIds.has(match.id);
            return (
              <div
                key={match.id}
                onClick={() => {
                  if (isBatchMode) {
                    toggleMatchSelection(match.id);
                  } else {
                    navigate(ROUTES.CHAT(match.id));
                  }
                }}
                className={cn(
                  "bg-card rounded-3xl p-6 shadow-[var(--shadow-card)] transition-all animate-slide-up",
                  isBatchMode ? "cursor-pointer" : "hover:shadow-[var(--shadow-soft)] cursor-pointer",
                  isSelected && "ring-2 ring-primary"
                )}
              >
                <div className="flex items-center gap-4">
                  {/* Selection Checkbox */}
                  {isBatchMode && (
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleMatchSelection(match.id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  )}
                  {/* Duo Avatars */}
                  <div className="relative flex-shrink-0">
                    <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center shadow-md overflow-hidden">
                      <OptimizedImage
                        src={otherDuo.member1?.photo_url}
                        alt={otherDuo.member1?.name || 'Member 1'}
                        className="w-full h-full"
                        fallbackIcon={<User className="w-8 h-8 text-primary" />}
                      />
                    </div>
                    <div className="w-14 h-14 rounded-full bg-secondary/30 flex items-center justify-center absolute -right-4 top-0 shadow-md border-2 border-card overflow-hidden">
                      <OptimizedImage
                        src={otherDuo.member2?.photo_url}
                        alt={otherDuo.member2?.name || 'Member 2'}
                        className="w-full h-full"
                        fallbackIcon={<User className="w-8 h-8 text-primary" />}
                      />
                    </div>
                  </div>

                  {/* Match Info */}
                  <div className="flex-1 min-w-0 ml-4">
                    <h3 className="font-semibold text-lg text-foreground truncate">
                      {getMatchName(match, userDuoIdsSet)}
                    </h3>
                    {lastMessages[match.id] ? (
                      <p className="text-sm text-foreground truncate mt-1">
                        {lastMessages[match.id]!.content}
                      </p>
                    ) : (
                      <p className="text-sm text-muted-foreground italic truncate mt-1">
                        No messages yet
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground truncate mt-1">
                      {match.last_message_at 
                        ? `Last message ${formatRelativeTime(match.last_message_at)}`
                        : `Matched ${formatRelativeTime(match.matched_at)}`
                      }
                    </p>
                  </div>

                  {/* Meta */}
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <div className="flex items-center gap-2">
                      {match.unread_count && match.unread_count > 0 && (
                        <Badge 
                          variant="default" 
                          className="h-5 min-w-5 flex items-center justify-center px-1.5 text-xs"
                        >
                          {match.unread_count > 9 ? '9+' : match.unread_count}
                        </Badge>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={(e) => handleUnmatch(match.id, e)}
                            disabled={unmatchingId === match.id}
                            className="text-destructive focus:text-destructive"
                          >
                            {unmatchingId === match.id ? (
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4 mr-2" />
                            )}
                            Unmatch
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <MessageCircle className="w-5 h-5 text-primary" />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Bottom Navigation */}
      <BottomNavigation />
    </div>
  );
};

export default Matches;
