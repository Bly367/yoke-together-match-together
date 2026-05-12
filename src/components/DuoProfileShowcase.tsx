import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserProfileView } from '@/components/UserProfileView';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { usePhotosForUsers } from '@/hooks/usePhotos';
import { usePromptsForUsers } from '@/hooks/usePrompts';
import { useTrackView } from '@/hooks/usePreferenceEvents';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, Users, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DuoWithMembers } from '@/services/duo.service';
import { useEffect, useRef } from 'react';

interface DuoProfileShowcaseProps {
  duo: DuoWithMembers;
  onClose?: () => void;
  showActions?: boolean;
  onLike?: () => void;
  onPass?: () => void;
  className?: string;
}

/**
 * Duo Profile Showcase component
 * Merges both members' profiles in a seamless swipeable interface
 */
export function DuoProfileShowcase({
  duo,
  onClose,
  showActions = false,
  onLike,
  onPass,
  className,
}: DuoProfileShowcaseProps) {
  const { user } = useAuth();
  const [activeMember, setActiveMember] = useState<'member1' | 'member2'>('member1');
  const trackView = useTrackView();
  const viewStartTimeRef = useRef<number | null>(null);

  const member1Id = duo.member1.id;
  const member2Id = duo.member2.id;
  const userIds = [member1Id, member2Id];

  const { isLoading: photosLoading } = usePhotosForUsers(userIds);
  const { isLoading: promptsLoading } = usePromptsForUsers(userIds);

  // Track view event
  useEffect(() => {
    if (user && duo.id) {
      viewStartTimeRef.current = Date.now();

      // Track view after 1 second
      const timer = setTimeout(() => {
        if (viewStartTimeRef.current) {
          const dwellTime = Date.now() - viewStartTimeRef.current;
          trackView.mutate({
            userId: user.id,
            duoId: duo.id,
            dwellTimeMs: dwellTime,
          });
        }
      }, 1000);

      return () => {
        clearTimeout(timer);
        if (viewStartTimeRef.current) {
          const dwellTime = Date.now() - viewStartTimeRef.current;
          if (dwellTime > 500) {
            // Track final dwell time if user viewed for more than 500ms
            trackView.mutate({
              userId: user.id,
              duoId: duo.id,
              dwellTimeMs: dwellTime,
            });
          }
        }
      };
    }
  }, [user, duo.id, trackView]);

  const member1 = duo.member1;
  const member2 = duo.member2;

  const currentMember = activeMember === 'member1' ? member1 : member2;
  const currentMemberId = activeMember === 'member1' ? member1Id : member2Id;

  if (photosLoading || promptsLoading) {
    return (
      <div className={cn('flex items-center justify-center p-8', className)}>
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className={cn('w-full max-w-md mx-auto bg-background min-h-screen', className)}>
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="px-4 py-3 flex items-center justify-between">
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-secondary rounded-full transition-colors"
              aria-label="Close profile"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div className="flex-1 flex items-center justify-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold text-foreground">
              {duo.name || `${member1.name} & ${member2.name}`}
            </h2>
          </div>
          <div className="w-10" /> {/* Spacer for centering */}
        </div>

        {/* Member Tabs */}
        <Tabs value={activeMember} onValueChange={(v) => setActiveMember(v as 'member1' | 'member2')}>
          <TabsList className="w-full rounded-none border-b-0">
            <TabsTrigger value="member1" className="flex-1">
              {member1.name.split(' ')[0]}
            </TabsTrigger>
            <TabsTrigger value="member2" className="flex-1">
              {member2.name.split(' ')[0]}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Duo Info Card */}
      {(duo.tagline || duo.bio || duo.interests) && (
        <Card className="m-4">
          <CardContent className="pt-6">
            {duo.tagline && (
              <p className="text-lg font-semibold text-foreground mb-2">{duo.tagline}</p>
            )}
            {duo.bio && <p className="text-foreground mb-3">{duo.bio}</p>}
            {duo.interests && duo.interests.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {duo.interests.map((interest, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium"
                  >
                    {interest}
                  </span>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Member Profile View */}
      <div className="pb-20">
        <UserProfileView
          userId={currentMemberId}
          userName={currentMember.name}
          userAge={currentMember.age}
          userBio={currentMember.id === member1Id ? member1.bio : member2.bio}
          showActions={false} // Actions handled at duo level
          className="pb-4"
        />
      </div>

      {/* Action Buttons */}
      {showActions && (
        <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-border p-4 flex gap-3 max-w-md mx-auto">
          <Button
            variant="outline"
            onClick={onPass}
            className="flex-1"
            size="lg"
          >
            Pass
          </Button>
          <Button
            onClick={onLike}
            className="flex-1"
            size="lg"
          >
            Like
          </Button>
        </div>
      )}
    </div>
  );
}

