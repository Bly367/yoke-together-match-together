import { useState, useEffect, useRef } from 'react';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious, type CarouselApi } from '@/components/ui/carousel';
import { Card, CardContent } from '@/components/ui/card';
import { OptimizedImage } from '@/components/OptimizedImage';
import { useUserPhotos } from '@/hooks/usePhotos';
import { useUserPrompts } from '@/hooks/usePrompts';
import { useTrackPhotoExpand, useTrackPromptScroll } from '@/hooks/usePreferenceEvents';
import { useAuth } from '@/hooks/useAuth';
import { User, Loader2, Heart, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { UserPhoto } from '@/services/photo.service';
import type { UserPrompt } from '@/services/prompt.service';

interface UserProfileViewProps {
  userId: string;
  userName: string;
  userAge?: number;
  userBio?: string;
  onClose?: () => void;
  showActions?: boolean;
  onLike?: () => void;
  onPass?: () => void;
  className?: string;
}

/**
 * Hinge-style profile view component
 * Displays user photos in a carousel and prompts with answers
 */
export function UserProfileView({
  userId,
  userName,
  userAge,
  userBio,
  onClose,
  showActions = false,
  onLike,
  onPass,
  className,
}: UserProfileViewProps) {
  const { user: currentUser } = useAuth();
  const { data: photos = [], isLoading: photosLoading } = useUserPhotos(userId);
  const { data: prompts = [], isLoading: promptsLoading } = useUserPrompts(userId);
  const trackPhotoExpand = useTrackPhotoExpand();
  const trackPromptScroll = useTrackPromptScroll();

  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [expandedPhotoId, setExpandedPhotoId] = useState<string | null>(null);
  const [viewedPromptIds, setViewedPromptIds] = useState<Set<string>>(new Set());
  const [api, setApi] = useState<CarouselApi>();
  const photoDwellStartRef = useRef<number | null>(null);
  const promptDwellStartRef = useRef<{ promptId: string; startTime: number } | null>(null);

  // Track carousel index changes
  useEffect(() => {
    if (!api) return;

    const onSelect = () => {
      setCurrentPhotoIndex(api.selectedScrollSnap());
    };

    api.on('select', onSelect);
    onSelect(); // Initial call

    return () => {
      api.off('select', onSelect);
    };
  }, [api]);

  // Track photo expand with dwell time
  useEffect(() => {
    if (expandedPhotoId && currentPhotoIndex < photos.length && currentUser) {
      const photo = photos[currentPhotoIndex];
      if (photo && photo.id === expandedPhotoId && !photoDwellStartRef.current) {
        photoDwellStartRef.current = Date.now();
      }
    } else {
      if (photoDwellStartRef.current && expandedPhotoId && currentUser) {
        const dwellTime = Date.now() - photoDwellStartRef.current;
        if (dwellTime > 1000) {
          // Only track if viewed for more than 1 second
          trackPhotoExpand.mutate({
            userId: currentUser.id,
            photoId: expandedPhotoId,
            dwellTimeMs: dwellTime,
            photoIndex: currentPhotoIndex,
          });
        }
        photoDwellStartRef.current = null;
      }
    }
  }, [expandedPhotoId, currentPhotoIndex, photos, trackPhotoExpand, currentUser]);

  // Track prompt scroll/view
  useEffect(() => {
    if (!currentUser) return;

    prompts.forEach((prompt) => {
      if (!viewedPromptIds.has(prompt.id)) {
        // Mark as viewed and track
        setViewedPromptIds((prev) => new Set(prev).add(prompt.id));
        const startTime = Date.now();

        // Track after a delay (user is reading)
        const timer = setTimeout(() => {
          const dwellTime = Date.now() - startTime;
          trackPromptScroll.mutate({
            userId: currentUser.id,
            promptId: prompt.id,
            dwellTimeMs: dwellTime,
            promptIndex: prompts.indexOf(prompt),
          });
        }, 2000); // Track after 2 seconds of viewing

        return () => clearTimeout(timer);
      }
    });
  }, [prompts, viewedPromptIds, trackPromptScroll, currentUser]);

  const sortedPhotos = [...photos].sort((a, b) => a.display_order - b.display_order);
  const sortedPrompts = [...prompts].sort((a, b) => a.display_order - b.display_order);

  if (photosLoading || promptsLoading) {
    return (
      <div className={cn('flex items-center justify-center p-8', className)}>
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className={cn('w-full max-w-md mx-auto bg-background', className)}>
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-3 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">{userName}</h2>
          {userAge && <p className="text-sm text-muted-foreground">{userAge} years old</p>}
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-2 hover:bg-secondary rounded-full transition-colors"
            aria-label="Close profile"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Photo Carousel */}
      <div className="relative">
        {sortedPhotos.length > 0 ? (
          <Carousel className="w-full" setApi={setApi}>
            <CarouselContent>
              {sortedPhotos.map((photo, index) => (
                <CarouselItem key={photo.id}>
                  <div
                    className="relative aspect-[3/4] w-full bg-secondary rounded-lg overflow-hidden"
                    onClick={() => {
                      if (expandedPhotoId === photo.id) {
                        setExpandedPhotoId(null);
                      } else {
                        setExpandedPhotoId(photo.id);
                      }
                    }}
                  >
                    <img
                      src={photo.photo_url}
                      alt={`${userName} - Photo ${index + 1}`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        console.error('Failed to load photo:', photo.photo_url, photo);
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                    {index === 0 && photo.is_primary && (
                      <div className="absolute top-2 left-2 bg-primary text-primary-foreground px-2 py-1 rounded-full text-xs font-semibold">
                        Main
                      </div>
                    )}
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            {sortedPhotos.length > 1 && (
              <>
                <CarouselPrevious className="left-2" />
                <CarouselNext className="right-2" />
              </>
            )}
          </Carousel>
        ) : (
          <div className="aspect-[3/4] w-full bg-secondary rounded-lg flex items-center justify-center">
            <User className="w-24 h-24 text-muted-foreground" />
          </div>
        )}

        {/* Photo counter */}
        {sortedPhotos.length > 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
            {currentPhotoIndex + 1} / {sortedPhotos.length}
          </div>
        )}
      </div>

      {/* Bio */}
      {userBio && (
        <Card className="m-4">
          <CardContent className="pt-6">
            <p className="text-foreground">{userBio}</p>
          </CardContent>
        </Card>
      )}

      {/* Prompts */}
      <div className="px-4 pb-4 space-y-4">
        {sortedPrompts.map((prompt, index) => (
          <PromptCard key={prompt.id} prompt={prompt} index={index} />
        ))}
        {sortedPrompts.length === 0 && (
          <Card>
            <CardContent className="pt-6 text-center text-muted-foreground">
              <p>No prompts yet</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Action Buttons */}
      {showActions && (
        <div className="sticky bottom-0 bg-background/95 backdrop-blur-sm border-t border-border p-4 flex gap-3">
          <button
            onClick={onPass}
            className="flex-1 bg-secondary hover:bg-secondary/80 text-foreground px-6 py-3 rounded-full font-semibold transition-colors flex items-center justify-center gap-2"
          >
            <X className="w-5 h-5" />
            Pass
          </button>
          <button
            onClick={onLike}
            className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-3 rounded-full font-semibold transition-colors flex items-center justify-center gap-2"
          >
            <Heart className="w-5 h-5" />
            Like
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Prompt card component
 */
function PromptCard({ prompt, index }: { prompt: UserPrompt; index: number }) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-6">
        <div className="space-y-2">
          <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            {prompt.prompt_text}
          </p>
          <p className="text-lg text-foreground leading-relaxed">{prompt.answer_text}</p>
        </div>
      </CardContent>
    </Card>
  );
}

