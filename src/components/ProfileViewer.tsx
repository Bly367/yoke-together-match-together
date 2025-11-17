import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { UserProfileView } from '@/components/UserProfileView';
import { DuoProfileShowcase } from '@/components/DuoProfileShowcase';
import { Button } from '@/components/ui/button';
import { X, User, Users } from 'lucide-react';
import type { DuoWithMembers } from '@/services/duo.service';

interface ProfileViewerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId?: string;
  userName?: string;
  userAge?: number;
  userBio?: string;
  duo?: DuoWithMembers;
  showActions?: boolean;
  onLike?: () => void;
  onPass?: () => void;
}

/**
 * Aesthetic profile viewer component
 * Can display either a single user profile or a duo profile showcase
 */
export function ProfileViewer({
  open,
  onOpenChange,
  userId,
  userName,
  userAge,
  userBio,
  duo,
  showActions = false,
  onLike,
  onPass,
}: ProfileViewerProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              {duo ? (
                <>
                  <Users className="h-5 w-5" />
                  <span>Duo Profile</span>
                </>
              ) : (
                <>
                  <User className="h-5 w-5" />
                  <span>{userName || 'Profile'}</span>
                </>
              )}
            </DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="px-6 pb-6">
          {duo ? (
            <DuoProfileShowcase
              duo={duo}
              onClose={() => onOpenChange(false)}
              showActions={showActions}
              onLike={onLike}
              onPass={onPass}
            />
          ) : userId ? (
            <UserProfileView
              userId={userId}
              userName={userName || 'User'}
              userAge={userAge}
              userBio={userBio}
              onClose={() => onOpenChange(false)}
              showActions={showActions}
              onLike={onLike}
              onPass={onPass}
            />
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}

