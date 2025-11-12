import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Search, MessageCircle, Users, User } from "lucide-react";
import { ROUTES } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { usePrefetchOnHover } from "@/hooks/useRoutePrefetch";

/**
 * Bottom Navigation Component
 * 
 * Consistent navigation bar across all pages with 4 tabs:
 * - Discover (Matchmaking)
 * - Messages
 * - Matches
 * - Profile
 * 
 * Features:
 * - Route prefetching on hover for faster navigation
 */
export const BottomNavigation = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const isDiscover = location.pathname === ROUTES.MATCHMAKING;
  const isMessages = location.pathname === ROUTES.MESSAGES;
  const isMatches = location.pathname === ROUTES.MATCHES;
  const isProfile = location.pathname === ROUTES.PROFILE;

  // Prefetch routes on hover
  const discoverPrefetch = usePrefetchOnHover(ROUTES.MATCHMAKING);
  const messagesPrefetch = usePrefetchOnHover(ROUTES.MESSAGES);
  const matchesPrefetch = usePrefetchOnHover(ROUTES.MATCHES);
  const profilePrefetch = usePrefetchOnHover(ROUTES.PROFILE);

  return (
    <div className="fixed bottom-0 inset-x-0 bg-card border-t border-border shadow-lg z-40">
      <div className="max-w-4xl mx-auto px-4 py-4 flex justify-around">
        <Button
          variant="ghost"
          onClick={() => navigate(ROUTES.MATCHMAKING)}
          onMouseEnter={discoverPrefetch.handleMouseEnter}
          onFocus={discoverPrefetch.handleFocus}
          className={cn("flex flex-col gap-1", isDiscover && "text-primary")}
        >
          <Search className={cn("w-6 h-6", isDiscover && "text-primary")} />
          <span className={cn("text-xs", isDiscover && "text-primary")}>Discover</span>
        </Button>
        <Button
          variant="ghost"
          onClick={() => navigate(ROUTES.MESSAGES)}
          onMouseEnter={messagesPrefetch.handleMouseEnter}
          onFocus={messagesPrefetch.handleFocus}
          className={cn("flex flex-col gap-1", isMessages && "text-primary")}
        >
          <MessageCircle className={cn("w-6 h-6", isMessages && "text-primary")} />
          <span className={cn("text-xs", isMessages && "text-primary")}>Messages</span>
        </Button>
        <Button
          variant="ghost"
          onClick={() => navigate(ROUTES.MATCHES)}
          onMouseEnter={matchesPrefetch.handleMouseEnter}
          onFocus={matchesPrefetch.handleFocus}
          className={cn("flex flex-col gap-1", isMatches && "text-primary")}
        >
          <Users className={cn("w-6 h-6", isMatches && "text-primary")} />
          <span className={cn("text-xs", isMatches && "text-primary")}>Matches</span>
        </Button>
        <Button
          variant="ghost"
          onClick={() => navigate(ROUTES.PROFILE)}
          onMouseEnter={profilePrefetch.handleMouseEnter}
          onFocus={profilePrefetch.handleFocus}
          className={cn("flex flex-col gap-1", isProfile && "text-primary")}
        >
          <User className={cn("w-6 h-6", isProfile && "text-primary")} />
          <span className={cn("text-xs", isProfile && "text-primary")}>Profile</span>
        </Button>
      </div>
    </div>
  );
};

