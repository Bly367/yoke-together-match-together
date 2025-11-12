import { useState, useMemo, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Heart, X, Loader2, MessageCircle, User, Filter, RotateCcw, X as XIcon } from "lucide-react";
import { toast } from "sonner";
import { useNavigate, useLocation } from "react-router-dom";
import chickMascot from "@/assets/chick-mascot.png";
import { useAuth } from "@/hooks/useAuth";
import { useUserDuos, useActiveDuosForMatching, useActiveDuo } from "@/hooks/useDuos";
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
import { Slider } from "@/components/ui/slider";
import { canDuosMatch } from "@/lib/preferences";

interface SwipeState {
  x: number;
  y: number;
  startX: number;
  startY: number;
  isDragging: boolean;
}

const Matchmaking = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isMatched, setIsMatched] = useState(false);
  const [matchedDuoId, setMatchedDuoId] = useState<string | null>(null);
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
  const location = useLocation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { location: userLocation } = useCurrentLocation();
  
  const isDiscover = location.pathname === ROUTES.MATCHMAKING;

  // Get user's duos and active duo
  const { data: userDuos, isLoading: duosLoading, isError: duosError, error: duosErrorDetails } = useUserDuos();
  const userDuo = useActiveDuo();

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

  // Filter duos by age, interests, location, and preferences
  const availableDuos = useMemo(() => {
    if (!activeDuos || !userDuo) return [];
    
    return activeDuos.filter((duo) => {
      // Preference filter - check if duos can match based on preferences
      // This ensures both duos are interested in each other
      if (!canDuosMatch(userDuo, duo)) {
        return false;
      }
      
      // Age filter - check both members
      const member1Age = duo.member1?.age || 0;
      const member2Age = duo.member2?.age || 0;
      const minAge = Math.min(member1Age, member2Age);
      const maxAge = Math.max(member1Age, member2Age);
      
      if (minAge < filters.minAge || maxAge > filters.maxAge) {
        return false;
      }
      
      // Interests filter
      if (filters.interests.length > 0 && duo.interests) {
        const hasMatchingInterest = filters.interests.some(interest =>
          duo.interests?.some(duoInterest =>
            duoInterest.toLowerCase().includes(interest.toLowerCase())
          )
        );
        if (!hasMatchingInterest) return false;
      }
      
      // Location filter (if location data is available)
      if (filters.maxDistance < 50 && userLocation && user?.location) {
        // Extract user's location coordinates
        const userCoords = extractCoordinatesFromPoint(user.location);
        if (!userCoords) return true; // Skip location filter if can't parse user location
        
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
  }, [activeDuos, filters, userDuo, userLocation, user]);

  const currentDuo = availableDuos[currentIndex];
  const swipeMutation = useSwipe();
  const undoSwipeMutation = useUndoSwipe();

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

  const handleSwipe = async (liked: boolean) => {
    if (!userDuo || !currentDuo) {
      toast.error("Please create a duo first!");
      navigate(ROUTES.DUO_SETUP);
      return;
    }

    // Store last swipe for undo
    setLastSwipe({ duoId: currentDuo.id, action: liked ? 'like' : 'pass' });

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
          setIsMatched(true);
          setMatchedDuoId(currentDuo.id);
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
      if (currentIndex < availableDuos.length - 1) {
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
  };

  const handleUndo = async () => {
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
  };

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
    console.error('Duos error details:', {
      error: duosErrorDetails,
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
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center animate-hatch">
          <div className="bg-card rounded-3xl p-12 text-center space-y-4 animate-hatch shadow-2xl">
            <div className="text-6xl">🎉</div>
            <h2 className="text-4xl font-bold text-foreground">It's a Match!</h2>
            <p className="text-muted-foreground">You can now chat with this duo</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="max-w-lg mx-auto mb-6">
        <div className="flex items-center justify-between mb-4">
          <img src={chickMascot} alt="Yoke" className="w-12 h-12" />
          <h1 className="text-2xl font-bold text-foreground">Discover Duos</h1>
          <div className="flex gap-2">
            <Popover open={showFilters} onOpenChange={setShowFilters}>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  <Filter className="w-5 h-5" />
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
                    <Label>Age Range: {filters.minAge} - {filters.maxAge}</Label>
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
                    <Label>Interests (comma-separated)</Label>
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
                </div>
              </PopoverContent>
            </Popover>
            
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate(ROUTES.MATCHES)}
              className="relative"
              title="View Messages & Matches"
            >
              <MessageCircle className="w-6 h-6" />
              {matchesCount > 0 && (
                <Badge 
                  variant="default" 
                  className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
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
            >
              <RotateCcw className="w-4 h-4" />
              Undo {lastSwipe.action === 'like' ? 'Like' : 'Pass'}
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
        >
          {/* Swipe indicators */}
          {swipeState.isDragging && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
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
                  alt={currentDuo.member1.name}
                  className="w-full h-full"
                  fallbackIcon={<User className="w-16 h-16 text-primary" />}
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
                  alt={currentDuo.member2.name}
                  className="w-full h-full"
                  fallbackIcon={<User className="w-16 h-16 text-primary" />}
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
            <div>
              <h3 className="text-xl font-bold text-foreground mb-2">
                {currentDuo.tagline || currentDuo.name || `${currentDuo.member1.name} & ${currentDuo.member2.name}`}
              </h3>
              {currentDuo.bio && (
                <p className="text-muted-foreground">{currentDuo.bio}</p>
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
        <div className="flex gap-4 justify-center mt-8">
          <Button
            size="lg"
            variant="outline"
            className="w-20 h-20 rounded-full border-2 hover:scale-110 transition-transform"
            onClick={() => handleSwipe(false)}
            disabled={swipeMutation.isPending}
          >
            <X className="w-8 h-8 text-destructive" />
          </Button>
          <Button
            size="lg"
            variant="yolk"
            className="w-24 h-24 rounded-full hover:scale-110 transition-transform"
            onClick={() => handleSwipe(true)}
            disabled={swipeMutation.isPending}
          >
            {swipeMutation.isPending ? (
              <Loader2 className="w-10 h-10 animate-spin" />
            ) : (
              <Heart className="w-10 h-10" />
            )}
          </Button>
        </div>

        {/* Progress */}
        <div className="text-center mt-4 text-sm text-muted-foreground">
          {currentIndex + 1} of {availableDuos.length} duos
        </div>
      </div>

      {/* Bottom Navigation */}
      <BottomNavigation />
    </div>
  );
};

export default Matchmaking;
