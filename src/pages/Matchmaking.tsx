import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Heart, X, Loader2, MessageCircle, User, Filter, RotateCcw, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import chickMascot from "@/assets/chick-mascot.png";
import { useAuth } from "@/hooks/useAuth";
import { useUserDuos, useActiveDuosForMatching, useActiveDuo } from "@/hooks/useDuos";
import { logger } from "@/lib/logger";
import { useSwipe, useSwipedDuoIds, useMatches, useUndoSwipe } from "@/hooks/useMatching";
import { useQueryClient } from "@tanstack/react-query";
import { checkMatch } from "@/services/matching.service";
import { ROUTES } from "@/lib/routes";
import { cn, calculateDistance, extractCoordinatesFromPoint } from "@/lib/utils";
import { BottomNavigation } from "@/components/BottomNavigation";
import { OptimizedImage } from "@/components/OptimizedImage";
import { useCurrentLocation } from "@/hooks/useLocation";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { canDuosMatch, duoMatchesPreferences } from "@/lib/preferences";
import { useUserPreferences } from "@/hooks/usePreferences";
import { useRankDuos } from "@/hooks/useRanking";
import {
  useTrackLike,
  useTrackPass,
  useTrackView,
  useTrackMatchSuccess,
} from "@/hooks/usePreferenceEvents";

interface SwipeState {
  x: number;
  y: number;
  startX: number;
  startY: number;
  isDragging: boolean;
}

/**
 * Matchmaking page component - optimized with React.memo
 * Handles duo swiping and matching functionality
 */
const MatchmakingComponent = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isMatched, setIsMatched] = useState(false);
  const [lastSwipe, setLastSwipe] = useState<{ duoId: string; action: 'like' | 'pass' } | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    minAge: 18,
    maxAge: 100,
    interests: [] as string[],
    maxDistance: 50, // km
  });
  const [swipeState, setSwipeState] = useState<SwipeState>({
    x: 0,
    y: 0,
    startX: 0,
    startY: 0,
    isDragging: false,
  });
  const cardRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { location: userLocation } = useCurrentLocation();

  // Get user's duos and active duo
  const { data: userDuos, isLoading: duosLoading, isError: duosError, error: duosErrorDetails } = useUserDuos();
  const userDuo = useActiveDuo();

  // Get user preferences for advanced filtering
  const { data: userPreferences } = useUserPreferences(user?.id);

  // Get matches for badge count
  const { data: matches } = useMatches();
  const matchesCount = matches?.length || 0;

  // Get swiped duo IDs
  const { data: swipedDuoIds = [], isLoading: swipedLoading } = useSwipedDuoIds(userDuo?.id || null);

  // Get active duos for matching - pass swiped IDs as dependency
  const swipedIds = useMemo(() => swipedDuoIds, [swipedDuoIds]);
  const { data: activeDuos = [], isLoading: activeDuosLoading } = useActiveDuosForMatching(
    swipedIds
  );

  // V2 AI preference tracking - feeds the learning system (see migration 023)
  const trackLikeMutation = useTrackLike();
  const trackPassMutation = useTrackPass();
  const trackViewMutation = useTrackView();
  const trackMatchSuccessMutation = useTrackMatchSuccess();

  // Filter duos using advanced preferences system
  const availableDuos = useMemo(() => {
    if (!activeDuos || !userDuo) return [];
    
    // Get user location coordinates if available
    const userCoords = userLocation || (user?.location ? extractCoordinatesFromPoint(user.location) : undefined);
    
    return activeDuos.filter((duo) => {
      // Basic preference filter - check if duos can match based on gender preferences
      // This ensures both duos are interested in each other
      if (!canDuosMatch(userDuo, duo)) {
        return false;
      }
      
      // Advanced preferences filter (dealbreakers are hard filters)
      const matchResult = duoMatchesPreferences(duo, userPreferences || null, userCoords || undefined);
      if (!matchResult.matches) {
        return false;
      }
      
      // Legacy filter support (for backward compatibility with quick filters)
      // Age filter - check both members
      if (filters.minAge > 18 || filters.maxAge < 100) {
        const member1Age = duo.member1?.age || 0;
        const member2Age = duo.member2?.age || 0;
        const minAge = Math.min(member1Age, member2Age);
        const maxAge = Math.max(member1Age, member2Age);
        
        if (minAge < filters.minAge || maxAge > filters.maxAge) {
          return false;
        }
      }
      
      // Interests filter (legacy quick filter)
      if (filters.interests.length > 0 && duo.interests) {
        const hasMatchingInterest = filters.interests.some(interest =>
          duo.interests?.some(duoInterest =>
            duoInterest.toLowerCase().includes(interest.toLowerCase())
          )
        );
        if (!hasMatchingInterest) return false;
      }
      
      // Location filter (legacy quick filter - only if preferences don't handle it)
      if (!userPreferences?.max_distance_miles && filters.maxDistance < 50 && userCoords) {
        // Check if either member has location data
        const member1Coords = duo.member1?.location 
          ? extractCoordinatesFromPoint(duo.member1.location)
          : null;
        const member2Coords = duo.member2?.location
          ? extractCoordinatesFromPoint(duo.member2.location)
          : null;
        
        // If neither member has location, include the duo (can't filter)
        if (!member1Coords && !member2Coords) return true;
        
        // Calculate distance to closest member
        let minDistance = Infinity;
        if (member1Coords) {
          const distance = calculateDistance(
            userCoords.latitude,
            userCoords.longitude,
            member1Coords.latitude,
            member1Coords.longitude
          );
          minDistance = Math.min(minDistance, distance);
        }
        if (member2Coords) {
          const distance = calculateDistance(
            userCoords.latitude,
            userCoords.longitude,
            member2Coords.latitude,
            member2Coords.longitude
          );
          minDistance = Math.min(minDistance, distance);
        }
        
        // Filter by max distance
        if (minDistance > filters.maxDistance) return false;
      }
      
      return true;
    });
  }, [activeDuos, filters, userDuo, userPreferences, userLocation, user]);

  // V2 AI ranking: reorder available duos by learned compatibility score.
  // Falls back gracefully to filter order when embeddings aren't computed yet.
  const { data: rankedDuos } = useRankDuos(
    user?.id || null,
    userDuo?.id || null,
    availableDuos,
    !!user?.id && !!userDuo?.id && availableDuos.length > 0,
  );

  /**
   * Final ordered list of duos to show — AI-ranked when available,
   * otherwise the filtered list in its existing order.
   */
  const orderedDuos = useMemo(() => {
    if (!rankedDuos || rankedDuos.length === 0) return availableDuos;
    return rankedDuos.map((r) => r.duo);
  }, [rankedDuos, availableDuos]);

  /**
   * Lookup of compatibility scores keyed by duo id for badge rendering.
   */
  const compatibilityScores = useMemo(() => {
    if (!rankedDuos) return new Map<string, number>();
    return new Map(rankedDuos.map((r) => [r.duo.id, r.score] as const));
  }, [rankedDuos]);

  const currentDuo = orderedDuos[currentIndex];
  const currentCompatibility =
    currentDuo ? compatibilityScores.get(currentDuo.id) : undefined;
  const swipeMutation = useSwipe();
  const undoSwipeMutation = useUndoSwipe();

  // Track view event when the visible duo changes (for AI behavioral signal)
  const viewStartRef = useRef<number | null>(null);
  useEffect(() => {
    if (!user?.id || !currentDuo) return;
    viewStartRef.current = Date.now();
    const duoId = currentDuo.id;
    return () => {
      const start = viewStartRef.current;
      if (!start) return;
      const dwell = Date.now() - start;
      // Only track meaningful views to avoid noise
      if (dwell >= 600) {
        trackViewMutation.mutate({ userId: user.id, duoId, dwellTimeMs: dwell });
      }
      viewStartRef.current = null;
    };
  }, [user?.id, currentDuo, trackViewMutation]);

  // Swipe gesture handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    setSwipeState({
      x: 0,
      y: 0,
      startX: touch.clientX,
      startY: touch.clientY,
      isDragging: true,
    });
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!swipeState.isDragging) return;
    const touch = e.touches[0];
    const deltaX = touch.clientX - swipeState.startX;
    const deltaY = touch.clientY - swipeState.startY;
    setSwipeState(prev => ({
      ...prev,
      x: deltaX,
      y: deltaY,
    }));
  };

  const handleTouchEnd = () => {
    if (!swipeState.isDragging) return;
    
    const threshold = 100;
    if (Math.abs(swipeState.x) > threshold) {
      handleSwipe(swipeState.x > 0);
    }
    
    setSwipeState({
      x: 0,
      y: 0,
      startX: 0,
      startY: 0,
      isDragging: false,
    });
  };

  // Mouse handlers for desktop
  const handleMouseDown = (e: React.MouseEvent) => {
    setSwipeState({
      x: 0,
      y: 0,
      startX: e.clientX,
      startY: e.clientY,
      isDragging: true,
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!swipeState.isDragging) return;
    const deltaX = e.clientX - swipeState.startX;
    const deltaY = e.clientY - swipeState.startY;
    setSwipeState(prev => ({
      ...prev,
      x: deltaX,
      y: deltaY,
    }));
  };

  const handleMouseUp = () => {
    if (!swipeState.isDragging) return;
    
    const threshold = 100;
    if (Math.abs(swipeState.x) > threshold) {
      handleSwipe(swipeState.x > 0);
    }
    
    setSwipeState({
      x: 0,
      y: 0,
      startX: 0,
      startY: 0,
      isDragging: false,
    });
  };

  // Reset card position when current duo changes
  useEffect(() => {
    setSwipeState({
      x: 0,
      y: 0,
      startX: 0,
      startY: 0,
      isDragging: false,
    });
  }, [currentIndex]);

  const handleSwipe = useCallback(async (liked: boolean) => {
    if (!userDuo || !currentDuo) {
      toast.error("Please create a duo first!");
      navigate(ROUTES.DUO_SETUP);
      return;
    }

    // Store last swipe for undo
    setLastSwipe({ duoId: currentDuo.id, action: liked ? 'like' : 'pass' });

    // V2 preference learning signal — fire-and-forget so it never blocks UX
    if (user?.id) {
      if (liked) {
        trackLikeMutation.mutate({ userId: user.id, duoId: currentDuo.id });
      } else {
        trackPassMutation.mutate({ userId: user.id, duoId: currentDuo.id });
      }
    }

    try {
      await swipeMutation.mutateAsync({
        swiperDuoId: userDuo.id,
        swipedDuoId: currentDuo.id,
        action: liked ? 'like' : 'pass',
      });

      // Check for match if liked
      if (liked) {
        const match = await checkMatch(userDuo.id, currentDuo.id);
        if (match) {
          // Track positive outcome for AI learning
          if (user?.id) {
            trackMatchSuccessMutation.mutate({ userId: user.id, duoId: currentDuo.id });
          }
          setIsMatched(true);
          toast.success("It's a match! 🎉");
          setTimeout(() => {
            setIsMatched(false);
            queryClient.invalidateQueries({ queryKey: ['matches'] });
            navigate(ROUTES.MATCHES);
          }, 3000);
          return;
        }
      }

      // Move to next duo
      if (currentIndex < orderedDuos.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        toast("No more duos to show", { description: "Check back later!" });
        setCurrentIndex(0);
      }
      
      // Clear undo after 5 seconds
      setTimeout(() => setLastSwipe(null), 5000);
    } catch (error: any) {
      toast.error(error.message || "Failed to swipe");
    }
  }, [
    userDuo,
    currentDuo,
    swipeMutation,
    currentIndex,
    orderedDuos.length,
    queryClient,
    navigate,
    user?.id,
    trackLikeMutation,
    trackPassMutation,
    trackMatchSuccessMutation,
  ]);

  const handleUndo = useCallback(async () => {
    if (!lastSwipe || !userDuo) return;

    try {
      await undoSwipeMutation.mutateAsync({
        swiperDuoId: userDuo.id,
        swipedDuoId: lastSwipe.duoId,
      });
      
      // Go back to previous duo
      if (currentIndex > 0) {
        setCurrentIndex(currentIndex - 1);
      }
      
      setLastSwipe(null);
      toast.success("Swipe undone!");
    } catch (error: any) {
      toast.error(error.message || "Failed to undo swipe");
    }
  }, [lastSwipe, userDuo, undoSwipeMutation, currentIndex]);

  // Keyboard navigation for swiping
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        handleSwipe(false);
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        handleSwipe(true);
      } else if (e.key === 'u' || e.key === 'U') {
        e.preventDefault();
        if (lastSwipe) handleUndo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentDuo, lastSwipe, userDuo, handleSwipe, handleUndo]);

  // Calculate rotation and opacity based on swipe
  const rotation = swipeState.x * 0.1;
  const opacity = 1 - Math.abs(swipeState.x) / 300;

  if (duosLoading || activeDuosLoading || swipedLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Show error state if duos query failed (but allow empty duos - that's not an error)
  if (duosError && userDuos === undefined) {
    // Log error details for debugging
    logger.error('Duos error details', duosErrorDetails, {
      isError: duosErrorDetails instanceof Error,
      message: duosErrorDetails instanceof Error ? duosErrorDetails.message : String(duosErrorDetails),
    });

    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background flex items-center justify-center space-y-4 px-4">
        <div className="text-center space-y-2">
          <p className="text-destructive text-lg font-semibold">Failed to load duos</p>
          {duosErrorDetails && (
            <div className="text-sm text-muted-foreground space-y-1">
              <p>
                {duosErrorDetails instanceof Error 
                  ? duosErrorDetails.message 
                  : typeof duosErrorDetails === 'object' && duosErrorDetails !== null
                    ? JSON.stringify(duosErrorDetails, null, 2)
                    : String(duosErrorDetails)}
              </p>
              {duosErrorDetails instanceof Error && (duosErrorDetails as any).originalError && (
                <p className="text-xs opacity-75">
                  Original error: {JSON.stringify((duosErrorDetails as any).originalError, null, 2)}
                </p>
              )}
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => window.location.reload()}>
            Retry
          </Button>
          <Button variant="outline" onClick={() => navigate(ROUTES.DUO_SETUP)}>
            Create Duo
          </Button>
        </div>
      </div>
    );
  }

  // If user has no duos (empty array, not an error), show create duo message
  if (!userDuo) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background flex items-center justify-center p-4 pb-24">
        <div className="text-center space-y-4">
          <img src={chickMascot} alt="Yoke" className="w-24 h-24 mx-auto animate-bounce-soft" />
          <h2 className="text-2xl font-bold">No Duo Yet</h2>
          <p className="text-muted-foreground">Create a duo to start matching!</p>
          <Button variant="yolk" onClick={() => navigate(ROUTES.DUO_SETUP)}>
            Create Duo
          </Button>
        </div>
        <BottomNavigation />
      </div>
    );
  }

  if (!currentDuo) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <img src={chickMascot} alt="Yoke" className="w-24 h-24 mx-auto animate-bounce-soft opacity-50" />
          <h2 className="text-2xl font-bold">No more duos right now</h2>
          <p className="text-muted-foreground">Check back soon for more matches!</p>
          <Button variant="yolk" onClick={() => navigate(ROUTES.MATCHES)}>
            View Matches
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background p-4 py-8 pb-24">
      {/* Match Overlay */}
      {isMatched && (
        <div 
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center animate-hatch"
          role="dialog"
          aria-modal="true"
          aria-labelledby="match-title"
          aria-describedby="match-description"
        >
          <div className="bg-card rounded-3xl p-12 text-center space-y-4 animate-hatch shadow-2xl">
            <div className="text-6xl" aria-hidden="true">🎉</div>
            <h2 id="match-title" className="text-4xl font-bold text-foreground">It's a Match!</h2>
            <p id="match-description" className="text-muted-foreground">You can now chat with this duo</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="max-w-lg mx-auto mb-6">
        <div className="flex items-center justify-between mb-4">
          <img src={chickMascot} alt="Yoke mascot" className="w-12 h-12" />
          <h1 className="text-2xl font-bold text-foreground">Discover Duos</h1>
          <div className="flex gap-2">
            <Popover open={showFilters} onOpenChange={setShowFilters}>
              <PopoverTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="relative"
                  aria-label="Open filters"
                  aria-expanded={showFilters}
                  aria-haspopup="true"
                >
                  <Filter className="w-5 h-5" aria-hidden="true" />
                  <span className="sr-only">Open filters</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">Filters</h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setFilters({
                          minAge: 18,
                          maxAge: 100,
                          interests: [],
                          maxDistance: 50,
                        });
                      }}
                    >
                      Reset
                    </Button>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Quick Age Range: {filters.minAge} - {filters.maxAge}</Label>
                    <p className="text-xs text-muted-foreground">Override preferences age range</p>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        min="18"
                        max="100"
                        value={filters.minAge}
                        onChange={(e) => setFilters(prev => ({ ...prev, minAge: parseInt(e.target.value) || 18 }))}
                        className="w-20"
                      />
                      <Input
                        type="number"
                        min="18"
                        max="100"
                        value={filters.maxAge}
                        onChange={(e) => setFilters(prev => ({ ...prev, maxAge: parseInt(e.target.value) || 100 }))}
                        className="w-20"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Quick Interests Filter (comma-separated)</Label>
                    <p className="text-xs text-muted-foreground">Override preferences interests</p>
                    <Input
                      placeholder="hiking, coffee, music"
                      value={filters.interests.join(', ')}
                      onChange={(e) => {
                        const interests = e.target.value
                          .split(',')
                          .map(i => i.trim())
                          .filter(i => i.length > 0);
                        setFilters(prev => ({ ...prev, interests }));
                      }}
                    />
                  </div>

                  <div className="pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => navigate(ROUTES.PREFERENCES)}
                    >
                      Manage Advanced Preferences
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
            
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate(ROUTES.MATCHES)}
              className="relative"
              aria-label={`View messages and matches${matchesCount > 0 ? `, ${matchesCount} new` : ''}`}
            >
              <MessageCircle className="w-6 h-6" aria-hidden="true" />
              <span className="sr-only">View messages and matches</span>
              {matchesCount > 0 && (
                <Badge 
                  variant="default" 
                  className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                  aria-label={`${matchesCount} new matches`}
                >
                  {matchesCount > 9 ? '9+' : matchesCount}
                </Badge>
              )}
            </Button>
          </div>
        </div>
        
        {/* Undo Button */}
        {lastSwipe && (
          <div className="flex justify-center mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={handleUndo}
              disabled={undoSwipeMutation.isPending}
              className="gap-2"
              aria-label={`Undo ${lastSwipe.action === 'like' ? 'like' : 'pass'}`}
            >
              <RotateCcw className="w-4 h-4" aria-hidden="true" />
              <span>Undo {lastSwipe.action === 'like' ? 'Like' : 'Pass'}</span>
            </Button>
          </div>
        )}
      </div>

      {/* Duo Card */}
      <div className="max-w-lg mx-auto">
        <div
          ref={cardRef}
          className={cn(
            "bg-card rounded-3xl shadow-[var(--shadow-card)] overflow-hidden transition-all duration-200 cursor-grab active:cursor-grabbing",
            swipeState.isDragging && "shadow-2xl"
          )}
          style={{
            transform: `translateX(${swipeState.x}px) translateY(${swipeState.y}px) rotate(${rotation}deg)`,
            opacity: Math.max(opacity, 0.5),
          }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          role="article"
          aria-label={`Duo card: ${currentDuo.member1.name} and ${currentDuo.member2.name}`}
        >
          {/* Swipe indicators */}
          {swipeState.isDragging && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10" aria-hidden="true">
              {swipeState.x > 50 && (
                <div className="bg-primary/20 rounded-full p-4 border-4 border-primary">
                  <Heart className="w-12 h-12 text-primary" />
                </div>
              )}
              {swipeState.x < -50 && (
                <div className="bg-destructive/20 rounded-full p-4 border-4 border-destructive">
                  <X className="w-12 h-12 text-destructive" />
                </div>
              )}
            </div>
          )}
          
          {/* Photos */}
          <div className="grid grid-cols-2 bg-secondary/30 p-8 gap-4">
            <div className="text-center space-y-2">
              <div className="w-32 h-32 rounded-full bg-primary/20 mx-auto flex items-center justify-center shadow-lg overflow-hidden">
                <OptimizedImage
                  src={currentDuo.member1.photo_url}
                  alt={`${currentDuo.member1.name}${currentDuo.member1.age ? `, age ${currentDuo.member1.age}` : ''}`}
                  className="w-full h-full"
                  fallbackIcon={<User className="w-16 h-16 text-primary" aria-hidden="true" />}
                />
              </div>
              <p className="font-semibold text-lg">
                {currentDuo.member1.name}
                {currentDuo.member1.age && `, ${currentDuo.member1.age}`}
              </p>
            </div>
            <div className="text-center space-y-2">
              <div className="w-32 h-32 rounded-full bg-primary/20 mx-auto flex items-center justify-center shadow-lg overflow-hidden">
                <OptimizedImage
                  src={currentDuo.member2.photo_url}
                  alt={`${currentDuo.member2.name}${currentDuo.member2.age ? `, age ${currentDuo.member2.age}` : ''}`}
                  className="w-full h-full"
                  fallbackIcon={<User className="w-16 h-16 text-primary" aria-hidden="true" />}
                />
              </div>
              <p className="font-semibold text-lg">
                {currentDuo.member2.name}
                {currentDuo.member2.age && `, ${currentDuo.member2.age}`}
              </p>
            </div>
          </div>

          {/* Info */}
          <div className="p-6 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h3 className="text-xl font-bold text-foreground mb-2">
                  {currentDuo.tagline || currentDuo.name || `${currentDuo.member1.name} & ${currentDuo.member2.name}`}
                </h3>
                {currentDuo.bio && (
                  <p className="text-muted-foreground">{currentDuo.bio}</p>
                )}
              </div>
              {typeof currentCompatibility === "number" && (
                <Badge
                  variant="default"
                  className="bg-gradient-to-br from-yolk-yellow to-yolk-peach text-foreground border-transparent shadow-[var(--shadow-soft)] flex items-center gap-1 shrink-0"
                  title="AI-predicted compatibility based on your photos, prompts, and behavior"
                  aria-label={`Compatibility score: ${Math.round(currentCompatibility * 100)} percent`}
                >
                  <Sparkles className="w-3 h-3" aria-hidden="true" />
                  {Math.round(currentCompatibility * 100)}%
                </Badge>
              )}
            </div>

            {currentDuo.interests && currentDuo.interests.length > 0 && (
              <div>
                <p className="font-semibold text-sm text-foreground mb-2">Interests</p>
                <div className="flex flex-wrap gap-2">
                  {currentDuo.interests.map((interest, idx) => (
                    <span 
                      key={idx}
                      className="px-4 py-2 bg-secondary/50 rounded-full text-sm text-foreground"
                    >
                      {interest}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 justify-center mt-8" role="group" aria-label="Swipe actions">
          <Button
            size="lg"
            variant="outline"
            className="w-20 h-20 rounded-full border-2 hover:scale-110 transition-transform"
            onClick={() => handleSwipe(false)}
            disabled={swipeMutation.isPending}
            aria-label="Pass on this duo"
            title="Pass (Left Arrow or A key)"
          >
            <X className="w-8 h-8 text-destructive" aria-hidden="true" />
            <span className="sr-only">Pass</span>
          </Button>
          <Button
            size="lg"
            variant="yolk"
            className="w-24 h-24 rounded-full hover:scale-110 transition-transform"
            onClick={() => handleSwipe(true)}
            disabled={swipeMutation.isPending}
            aria-label="Like this duo"
            title="Like (Right Arrow or D key)"
          >
            {swipeMutation.isPending ? (
              <Loader2 className="w-10 h-10 animate-spin" aria-hidden="true" />
            ) : (
              <Heart className="w-10 h-10" aria-hidden="true" />
            )}
            <span className="sr-only">Like</span>
          </Button>
        </div>

        {/* Progress */}
        <div className="text-center mt-4 text-sm text-muted-foreground" role="status" aria-live="polite">
          <span className="sr-only">Progress: </span>
          {currentIndex + 1} of {orderedDuos.length} duos
        </div>
      </div>

      {/* Bottom Navigation */}
      <BottomNavigation />
    </div>
  );
};

// Memoize component to prevent unnecessary re-renders
MatchmakingComponent.displayName = 'Matchmaking';

const Matchmaking = React.memo(MatchmakingComponent);

export default Matchmaking;
