import { cn } from "@/lib/utils";
import { formatTime, formatDate } from "@/lib/utils";
import { Check, CheckCheck, Edit2, Trash2, File } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { OptimizedImage } from "@/components/OptimizedImage";
import { User } from "lucide-react";
import type { Message } from "@/services/chat.service";

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  isEditing: boolean;
  editContent: string;
  onEditChange: (content: string) => void;
  onStartEdit: () => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onDelete: () => void;
  isEditingPending: boolean;
  showAvatar: boolean;
  showSenderName: boolean;
  showTimestamp: boolean;
  showDateSeparator: boolean;
  senderName?: string;
  senderPhotoUrl?: string;
  previousMessage?: Message | null;
  nextMessage?: Message | null;
}

/**
 * Modern message bubble component with grouping support
 * Similar to iMessage/WhatsApp style messaging
 */
export function MessageBubble({
  message,
  isOwn,
  isEditing,
  editContent,
  onEditChange,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onDelete,
  isEditingPending,
  showAvatar,
  showSenderName,
  showTimestamp,
  showDateSeparator,
  senderName,
  senderPhotoUrl,
  previousMessage,
  nextMessage,
}: MessageBubbleProps) {
  const isDeleted = !!message.deleted_at;
  const isEdited = !!message.edited_at;
  const readBy = message.read_by || [];
  const isRead = isOwn && readBy.length > 0;

  // Determine if this is the last message in a group (for tail styling)
  const isLastInGroup = !nextMessage || 
    nextMessage.sender_id !== message.sender_id ||
    (new Date(nextMessage.created_at).getTime() - new Date(message.created_at).getTime()) > 300000; // 5 minutes gap

  // Determine if this is the first message in a group (for spacing)
  const isFirstInGroup = !previousMessage || 
    previousMessage.sender_id !== message.sender_id ||
    (new Date(message.created_at).getTime() - new Date(previousMessage.created_at).getTime()) > 300000; // 5 minutes gap

  // Check if we need to show a date separator
  const shouldShowDateSeparator = showDateSeparator && previousMessage && 
    formatDate(previousMessage.created_at) !== formatDate(message.created_at);

  return (
    <>
      {/* Date Separator */}
      {shouldShowDateSeparator && (
        <div className="flex items-center justify-center my-4">
          <div className="px-3 py-1 bg-secondary/50 rounded-full text-xs text-muted-foreground">
            {formatDate(message.created_at)}
          </div>
        </div>
      )}

      <div
        className={cn(
          "flex w-full group",
          isOwn ? "justify-end" : "justify-start",
          isFirstInGroup ? "mt-4" : "mt-1"
        )}
      >
        <div className={cn(
          "flex items-end gap-2 max-w-[75%] sm:max-w-[70%]",
          isOwn ? "flex-row-reverse" : "flex-row"
        )}>
          {/* Avatar - only show for first message in group from other users */}
          {!isOwn && showAvatar && isFirstInGroup && (
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 overflow-hidden mb-1">
              {senderPhotoUrl ? (
                <OptimizedImage
                  src={senderPhotoUrl}
                  alt={senderName || "User"}
                  className="w-full h-full object-cover"
                  fallbackIcon={<User className="w-5 h-5 text-primary" />}
                />
              ) : (
                <User className="w-5 h-5 text-primary" />
              )}
            </div>
          )}
          
          {/* Spacer for alignment when no avatar */}
          {(!showAvatar || !isFirstInGroup || isOwn) && (
            <div className="w-8 flex-shrink-0" />
          )}

          <div className="flex flex-col min-w-0">
            {/* Sender name - only show for first message in group from other users */}
            {!isOwn && showSenderName && isFirstInGroup && senderName && (
              <p className="text-xs text-muted-foreground mb-1 px-2">
                {senderName}
              </p>
            )}

            {/* Message bubble */}
            {isEditing ? (
              <div className="flex gap-2 items-center">
                <Input
                  value={editContent}
                  onChange={(e) => {
                    if (e.target.value.length <= 1000) {
                      onEditChange(e.target.value);
                    }
                  }}
                  onKeyPress={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      onSaveEdit();
                    }
                    if (e.key === "Escape") {
                      onCancelEdit();
                    }
                  }}
                  className="flex-1"
                  autoFocus
                  maxLength={1000}
                />
                <Button
                  size="sm"
                  onClick={onSaveEdit}
                  disabled={isEditingPending}
                >
                  Save
                </Button>
                <Button size="sm" variant="outline" onClick={onCancelEdit}>
                  Cancel
                </Button>
              </div>
            ) : (
              <div className="relative">
                <div
                  className={cn(
                    "rounded-2xl px-4 py-2 shadow-sm transition-all",
                    // Tail styling for last message in group
                    isLastInGroup && (isOwn 
                      ? "rounded-br-sm" 
                      : "rounded-bl-sm"
                    ),
                    // Background colors
                    isDeleted
                      ? "bg-muted/50 text-muted-foreground italic"
                      : isOwn
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground",
                    // Hover effect for own messages
                    isOwn && !isDeleted && "hover:shadow-md"
                  )}
                >
                  {isDeleted ? (
                    <p className="text-sm">This message was deleted</p>
                  ) : (
                    <>
                      {/* Attachment */}
                      {message.attachment_url && (() => {
                        // Determine if attachment is an image
                        // Check attachment_type first, then infer from URL extension
                        const isImage = message.attachment_type?.startsWith('image/') ||
                          /\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)(\?.*)?$/i.test(message.attachment_url);
                        
                        return (
                          <div className={cn("mb-2", message.content && "mb-2")}>
                            {isImage ? (
                              <a
                                href={message.attachment_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block rounded-lg overflow-hidden max-w-sm"
                              >
                                <OptimizedImage
                                  src={message.attachment_url}
                                  alt={message.attachment_name || 'Image attachment'}
                                  className="max-w-full h-auto rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                                  lazy={false}
                                />
                              </a>
                            ) : (
                            <a
                              href={message.attachment_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={cn(
                                "flex items-center gap-2 p-3 rounded-lg border-2 hover:bg-opacity-80 transition-colors",
                                isOwn
                                  ? "bg-primary-foreground/20 border-primary-foreground/30"
                                  : "bg-secondary border-border"
                              )}
                            >
                              <File className="w-5 h-5 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">
                                  {message.attachment_name || 'Attachment'}
                                </p>
                                {message.attachment_size && (
                                  <p className="text-xs opacity-70">
                                    {(message.attachment_size / 1024).toFixed(1)} KB
                                  </p>
                                )}
                              </div>
                            </a>
                            )}
                          </div>
                        );
                      })()}
                      {/* Message content */}
                      {message.content && (
                        <p className="text-sm whitespace-pre-wrap break-words">
                          {message.content}
                        </p>
                      )}
                    </>
                  )}
                </div>

                {/* Edit/Delete menu for own messages */}
                {isOwn && !isDeleted && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute -right-2 top-0 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Edit2 className="w-3 h-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align={isOwn ? "end" : "start"}>
                      <DropdownMenuItem onClick={onStartEdit}>
                        <Edit2 className="w-4 h-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={onDelete}
                        className="text-destructive"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            )}

            {/* Timestamp and read receipt */}
            {showTimestamp && (
              <div className={cn(
                "flex items-center gap-1 mt-1 px-2",
                isOwn ? "justify-end" : "justify-start"
              )}>
                <p className="text-xs text-muted-foreground">
                  {formatTime(message.created_at)}
                </p>
                {isEdited && !isDeleted && (
                  <span className="text-xs text-muted-foreground">(edited)</span>
                )}
                {isOwn && !isDeleted && (
                  <div className="flex items-center ml-1">
                    {isRead ? (
                      <CheckCheck className="w-3.5 h-3.5 text-primary" />
                    ) : (
                      <Check className="w-3.5 h-3.5 text-muted-foreground" />
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

