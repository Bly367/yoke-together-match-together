import { User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatTime } from '@/lib/utils';
import type { PrivateConversation } from '@/services/privateMessaging.service';

interface PrivateConversationItemProps {
  conversation: PrivateConversation;
  currentUserId: string;
  onClick: () => void;
}

/**
 * Component to display a private conversation item in the conversation list
 * Shows the other user's avatar, name, last message preview, timestamp, and unread count
 */
export function PrivateConversationItem({
  conversation,
  currentUserId,
  onClick,
}: PrivateConversationItemProps) {
  // Get the other user (not the current user)
  const otherUser = 
    conversation.user1_id === currentUserId 
      ? conversation.user2 
      : conversation.user1;

  const hasUnread = (conversation.unread_count || 0) > 0;
  const lastMessage = conversation.last_message;

  if (!otherUser) return null;

  return (
    <div
      onClick={onClick}
      className="bg-card rounded-3xl p-4 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-soft)] transition-all cursor-pointer animate-slide-up group"
    >
      <div className="flex items-center gap-4">
        {/* User Avatar */}
        <div className="relative flex-shrink-0">
          <div className={cn(
            "w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center shadow-md overflow-hidden ring-2 transition-all",
            hasUnread ? "ring-primary/40" : "ring-transparent group-hover:ring-primary/20"
          )}>
            {otherUser.photo_url ? (
              <img
                src={otherUser.photo_url}
                alt={otherUser.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <User className="w-7 h-7 text-primary" />
            )}
          </div>
          {hasUnread && (
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full border-2 border-card" />
          )}
        </div>

        {/* Conversation Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <h3 className={cn(
              "font-semibold text-base truncate",
              hasUnread ? "text-foreground" : "text-foreground/80"
            )}>
              {otherUser.name}
            </h3>
            {lastMessage && (
              <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                {formatTime(lastMessage.created_at)}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <p className={cn(
              "text-sm truncate flex-1",
              hasUnread ? "text-foreground font-medium" : "text-muted-foreground"
            )}>
              {lastMessage 
                ? (lastMessage.content || (lastMessage.attachment_name ? `📎 ${lastMessage.attachment_name}` : ''))
                : 'No messages yet'}
            </p>
            {hasUnread && (
              <span className="bg-primary text-primary-foreground text-xs font-semibold rounded-full px-2 py-0.5 flex-shrink-0 min-w-[1.5rem] text-center">
                {conversation.unread_count}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

