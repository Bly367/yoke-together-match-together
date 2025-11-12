import { useState, useEffect, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Send, User, Loader2, Paperclip, X as XIcon, File } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { 
  useAllMessages, 
  useSendMessage, 
  useEditMessage,
  useDeleteMessage,
  useMarkMessagesAsRead,
  useMessageSubscription,
  useTypingIndicator
} from "@/hooks/useChat";
import { useMatches } from "@/hooks/useMatching";
import { useUserDuos } from "@/hooks/useDuos";
import { useUploadMessageAttachment } from "@/hooks/useStorage";
import { formatTime } from "@/lib/utils";
import { ROUTES } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { OptimizedImage } from "@/components/OptimizedImage";
import { VirtualizedMessageList } from "@/components/VirtualizedMessageList";
import { MessageBubble } from "@/components/MessageBubble";
import { formatDate } from "@/lib/utils";

const MAX_MESSAGE_LENGTH = 1000;

const Chat = () => {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();
  const [message, setMessage] = useState("");
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);
  const [attachmentPreview, setAttachmentPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesScrollRef = useRef<HTMLDivElement>(null);
  const [containerHeight, setContainerHeight] = useState(600);
  const previousMessagesLengthRef = useRef<number>(0);
  const previousMatchIdRef = useRef<string | undefined>(undefined);
  const isUserScrollingRef = useRef<boolean>(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const shouldAutoScrollRef = useRef<boolean>(true);

  const { data: messages = [], isLoading: messagesLoading, isError: messagesError, error: messagesErrorDetails } = useAllMessages(matchId || null);
  const sendMessageMutation = useSendMessage();
  const editMessageMutation = useEditMessage();
  const deleteMessageMutation = useDeleteMessage();
  const markAsReadMutation = useMarkMessagesAsRead();
  const uploadAttachmentMutation = useUploadMessageAttachment();
  const { data: matches, isLoading: matchesLoading, isError: matchesError } = useMatches();
  const { data: userDuos, isLoading: userDuosLoading, isError: userDuosError } = useUserDuos();

  // Subscribe to new messages
  useMessageSubscription(matchId || null, true);

  // Typing indicators
  const { typingUsers, handleTyping } = useTypingIndicator(
    matchId || null,
    user?.id || null,
    user?.name || null
  );

  // Mark messages as read when viewing the chat
  useEffect(() => {
    if (matchId && user?.id && messages.length > 0) {
      // Mark all messages as read when viewing
      markAsReadMutation.mutate({
        matchId,
        userId: user.id,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId, user?.id, messages.length]);

  // Find the match - memoized for performance
  const match = useMemo(() => {
    return matches?.find(m => m.id === matchId);
  }, [matches, matchId]);

  // Memoize user duo IDs for O(1) lookup
  const userDuoIdsSet = useMemo(() => {
    if (!userDuos || userDuos.length === 0) return new Set<string>();
    return new Set(userDuos.map(d => d.id));
  }, [userDuos]);

  // Get other duo info - memoized for performance
  const otherDuo = useMemo(() => {
    if (!match || !match.duo1 || !match.duo2 || userDuoIdsSet.size === 0) return null;
    
    // Find which duo is the user's duo using Set for O(1) lookup
    const isDuo1UserDuo = userDuoIdsSet.has(match.duo1_id);
    const isDuo2UserDuo = userDuoIdsSet.has(match.duo2_id);
    
    // Return the duo that's NOT the user's duo
    if (isDuo1UserDuo) return match.duo2;
    if (isDuo2UserDuo) return match.duo1;
    
    // Fallback to duo2 if we can't determine
    return match.duo2;
  }, [match, userDuoIdsSet]);

  // Update container height on resize and when messages container is available
  useEffect(() => {
    const updateHeight = () => {
      if (messagesContainerRef.current) {
        const height = messagesContainerRef.current.clientHeight;
        if (height > 0) {
          setContainerHeight(height);
        }
      }
    };
    
    // Initial update
    updateHeight();
    
    // Update on resize
    window.addEventListener('resize', updateHeight);
    
    // Also update when container becomes available
    const observer = new ResizeObserver(updateHeight);
    if (messagesContainerRef.current) {
      observer.observe(messagesContainerRef.current);
    }
    
    return () => {
      window.removeEventListener('resize', updateHeight);
      observer.disconnect();
    };
  }, []);

  // Handle scroll detection - track if user is manually scrolling
  useEffect(() => {
    const scrollContainer = messagesScrollRef.current;
    if (!scrollContainer || messages.length > 50) return; // Only for non-virtualized list

    const handleScroll = () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }

      isUserScrollingRef.current = true;
      shouldAutoScrollRef.current = false;

      // Check if user scrolled to bottom (within 100px)
      const isNearBottom = 
        scrollContainer.scrollHeight - scrollContainer.scrollTop - scrollContainer.clientHeight < 100;
      
      if (isNearBottom) {
        shouldAutoScrollRef.current = true;
      }

      // Reset scrolling flag after 1 second of no scrolling
      scrollTimeoutRef.current = setTimeout(() => {
        isUserScrollingRef.current = false;
      }, 1000);
    };

    scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      scrollContainer.removeEventListener('scroll', handleScroll);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [messages.length]);

  // Smooth auto-scroll to bottom when:
  // 1. Chat is first opened (matchId changes) - always scroll to latest message
  // 2. New messages arrive (especially when sent by current user)
  useEffect(() => {
    // Only scroll for non-virtualized list (messages.length <= 50)
    if (messages.length > 50) return;

    const scrollContainer = messagesScrollRef.current;
    if (!scrollContainer || messages.length === 0) return;

    const isFirstLoad = previousMatchIdRef.current !== matchId;
    const hasNewMessages = messages.length > previousMessagesLengthRef.current;
    const lastMessage = messages[messages.length - 1];
    const isOwnMessage = lastMessage && lastMessage.sender_id === user?.id;

    // Always scroll on first load (entering chat)
    // Also scroll when new messages arrive if:
    // - User sent the message, OR
    // - User is already at bottom (shouldAutoScrollRef)
    if (isFirstLoad || (hasNewMessages && (isOwnMessage || shouldAutoScrollRef.current))) {
      // Use multiple requestAnimationFrame calls to ensure DOM is fully updated and container has height
      const scrollToBottom = () => {
        if (scrollContainer) {
          const maxScroll = scrollContainer.scrollHeight - scrollContainer.clientHeight;
          if (maxScroll > 0) {
            scrollContainer.scrollTop = scrollContainer.scrollHeight;
          }
        }
      };
      
      // Try multiple times to ensure it works even if container height isn't ready yet
      requestAnimationFrame(() => {
        scrollToBottom();
        requestAnimationFrame(() => {
          scrollToBottom();
          setTimeout(scrollToBottom, 100);
        });
      });
    }

    previousMessagesLengthRef.current = messages.length;
    previousMatchIdRef.current = matchId;
  }, [messages, matchId, user?.id]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (10MB)
    const MAX_FILE_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      toast.error('File size must be less than 10MB');
      return;
    }

    setAttachment(file);

    // Create preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAttachmentPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setAttachmentPreview(null);
    }
  };

  const handleRemoveAttachment = () => {
    setAttachment(null);
    setAttachmentPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSend = async () => {
    if ((!message.trim() && !attachment) || !matchId || !user) return;
    
    if (message.length > MAX_MESSAGE_LENGTH) {
      toast.error(`Message must be less than ${MAX_MESSAGE_LENGTH} characters`);
      return;
    }

    try {
      let attachmentData = undefined;

      // Upload attachment if present
      if (attachment) {
        const uploaded = await uploadAttachmentMutation.mutateAsync({
          file: attachment,
          userId: user.id,
          matchId,
        });
        attachmentData = {
          url: uploaded.url,
          type: uploaded.type,
          name: uploaded.name,
          size: uploaded.size,
        };
      }

      await sendMessageMutation.mutateAsync({
        matchId,
        senderId: user.id,
        content: message.trim() || (attachment ? `📎 ${attachment.name}` : ''),
        attachment: attachmentData,
      });
      
      setMessage("");
      setAttachment(null);
      setAttachmentPreview(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      // Scroll to bottom after sending message
      // The useEffect hooks will handle scrolling automatically when messages update
      // For non-virtualized list, scroll immediately as a fallback
      if (messages.length <= 50) {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            if (messagesScrollRef.current) {
              messagesScrollRef.current.scrollTop = messagesScrollRef.current.scrollHeight;
            }
          });
        });
      }
    } catch (error: any) {
      console.error('Failed to send message:', error);
      toast.error(error.message || 'Failed to send message');
    }
  };

  const handleEdit = async (messageId: string) => {
    if (!editContent.trim() || !user) return;
    
    if (editContent.length > MAX_MESSAGE_LENGTH) {
      toast.error(`Message must be less than ${MAX_MESSAGE_LENGTH} characters`);
      return;
    }

    try {
      await editMessageMutation.mutateAsync({
        messageId,
        senderId: user.id,
        newContent: editContent.trim(),
      });
      setEditingMessageId(null);
      setEditContent("");
    } catch (error: any) {
      console.error('Failed to edit message:', error);
      toast.error(error.message || 'Failed to edit message');
    }
  };

  const handleDelete = async (messageId: string) => {
    if (!user) return;

    if (window.confirm('Are you sure you want to delete this message?')) {
      try {
        await deleteMessageMutation.mutateAsync({
          messageId,
          senderId: user.id,
        });
      } catch (error: any) {
        console.error('Failed to delete message:', error);
      }
    }
  };

  const startEditing = (msg: any) => {
    setEditingMessageId(msg.id);
    setEditContent(msg.content);
  };


  // Show loading state while essential data is loading
  if (messagesLoading || matchesLoading || userDuosLoading) {
    return (
      <div className="flex flex-col h-screen bg-gradient-to-br from-background via-secondary/20 to-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-muted-foreground mt-4">Loading chat...</p>
      </div>
    );
  }

  // Show error state if queries failed
  if (messagesError || matchesError || userDuosError) {
    // Extract error message properly
    const getErrorMessage = (error: unknown): string => {
      if (!error) return 'Unknown error';
      if (error instanceof Error) return error.message;
      if (typeof error === 'object' && 'message' in error) {
        return String(error.message);
      }
      if (typeof error === 'object' && 'code' in error) {
        return `Error code: ${error.code}`;
      }
      return String(error);
    };

    return (
      <div className="flex flex-col h-screen bg-gradient-to-br from-background via-secondary/20 to-background flex items-center justify-center space-y-4 px-4">
        <p className="text-destructive text-lg font-semibold">Failed to load chat</p>
        <div className="text-sm text-muted-foreground max-w-md text-center space-y-2">
          {messagesError && (
            <p>
              <strong>Messages error:</strong> {getErrorMessage(messagesErrorDetails)}
            </p>
          )}
          {matchesError && (
            <p>
              <strong>Matches error:</strong> {getErrorMessage(matchesError)}
            </p>
          )}
          {userDuosError && (
            <p>
              <strong>Duos error:</strong> {getErrorMessage(userDuosError)}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate(ROUTES.MESSAGES)}>
            Back to Messages
          </Button>
          <Button variant="outline" onClick={() => window.location.reload()}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  // Check if match exists after data is loaded
  if (!matchId) {
    return (
      <div className="flex flex-col h-screen bg-gradient-to-br from-background via-secondary/20 to-background flex items-center justify-center space-y-4">
        <p className="text-muted-foreground">No match ID provided</p>
        <Button variant="outline" onClick={() => navigate(ROUTES.MESSAGES)}>
          Back to Messages
        </Button>
      </div>
    );
  }

  if (!match) {
    return (
      <div className="flex flex-col h-screen bg-gradient-to-br from-background via-secondary/20 to-background flex items-center justify-center space-y-4">
        <p className="text-muted-foreground">Match not found</p>
        <p className="text-sm text-muted-foreground">Match ID: {matchId}</p>
        <Button variant="outline" onClick={() => navigate(ROUTES.MESSAGES)}>
          Back to Messages
        </Button>
      </div>
    );
  }

  if (!otherDuo) {
    return (
      <div className="flex flex-col h-screen bg-gradient-to-br from-background via-secondary/20 to-background flex items-center justify-center space-y-4">
        <p className="text-muted-foreground">Unable to load match details</p>
        <p className="text-sm text-muted-foreground">This might happen if you're not part of this match.</p>
        <Button variant="outline" onClick={() => navigate(ROUTES.MESSAGES)}>
          Back to Messages
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-background via-secondary/20 to-background">
      {/* Header */}
      <div className="bg-card shadow-sm border-b border-border flex-shrink-0">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(ROUTES.MESSAGES)}>
            <ArrowLeft className="w-6 h-6" />
          </Button>
          
          <div className="relative flex-shrink-0">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden">
              <OptimizedImage
                src={otherDuo.member1?.photo_url}
                alt={otherDuo.member1?.name || 'Member 1'}
                className="w-full h-full"
                fallbackIcon={<User className="w-6 h-6 text-primary" />}
              />
            </div>
            <div className="w-10 h-10 rounded-full bg-secondary/30 flex items-center justify-center absolute -right-3 top-0 border-2 border-card overflow-hidden">
              <OptimizedImage
                src={otherDuo.member2?.photo_url}
                alt={otherDuo.member2?.name || 'Member 2'}
                className="w-full h-full"
                fallbackIcon={<User className="w-6 h-6 text-primary" />}
              />
            </div>
          </div>

          <div className="flex-1 ml-2">
            <h2 className="font-semibold text-foreground">
              {otherDuo.member1?.name} & {otherDuo.member2?.name}
            </h2>
            <p className="text-xs text-muted-foreground">
              Group chat • {messages.length} {messages.length === 1 ? 'message' : 'messages'}
              {typingUsers.length > 0 && (
                <span className="ml-2 text-primary animate-pulse">
                  {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
                </span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-hidden max-w-4xl mx-auto w-full min-h-0 flex flex-col"
      >
        {messages.length > 50 ? (
          <VirtualizedMessageList
            messages={messages}
            currentUserId={user?.id || null}
            editingMessageId={editingMessageId}
            editContent={editContent}
            onEditChange={setEditContent}
            onStartEdit={startEditing}
            onSaveEdit={handleEdit}
            onCancelEdit={() => {
              setEditingMessageId(null);
              setEditContent("");
            }}
            onDelete={handleDelete}
            isEditingPending={editMessageMutation.isPending}
            containerHeight={containerHeight}
          />
        ) : (
          <div 
            ref={messagesScrollRef} 
            className="flex-1 min-h-0 w-full overflow-y-auto overflow-x-hidden px-4 py-2"
            style={{ 
              scrollBehavior: 'smooth',
              WebkitOverflowScrolling: 'touch'
            }}
          >
            {messages.length === 0 ? (
              <div className="text-center py-20 text-muted-foreground">
                <p>No messages yet. Start the conversation!</p>
              </div>
            ) : (
              messages.map((msg, index) => {
                const isOwn = msg.sender_id === user?.id;
                const isEditing = editingMessageId === msg.id;
                const previousMessage = index > 0 ? messages[index - 1] : null;
                const nextMessage = index < messages.length - 1 ? messages[index + 1] : null;
                
                // Show date separator if date changed
                const showDateSeparator = previousMessage && 
                  formatDate(previousMessage.created_at) !== formatDate(msg.created_at);
                
                return (
                  <MessageBubble
                    key={msg.id}
                    message={msg}
                    isOwn={isOwn}
                    isEditing={isEditing}
                    editContent={editContent}
                    onEditChange={setEditContent}
                    onStartEdit={() => startEditing(msg)}
                    onSaveEdit={() => handleEdit(msg.id)}
                    onCancelEdit={() => {
                      setEditingMessageId(null);
                      setEditContent("");
                    }}
                    onDelete={() => handleDelete(msg.id)}
                    isEditingPending={editMessageMutation.isPending}
                    showAvatar={!isOwn}
                    showSenderName={!isOwn}
                    showTimestamp={true}
                    showDateSeparator={showDateSeparator}
                    senderName={msg.sender?.name}
                    senderPhotoUrl={msg.sender?.photo_url}
                    previousMessage={previousMessage}
                    nextMessage={nextMessage}
                  />
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Input */}
      <div className="bg-card border-t border-border p-4 flex-shrink-0">
        <div className="max-w-4xl mx-auto space-y-2">
          {/* Attachment Preview */}
          {attachment && (
            <div className="flex items-center gap-2 p-2 bg-secondary rounded-lg">
              {attachmentPreview ? (
                <OptimizedImage
                  src={attachmentPreview}
                  alt="Preview"
                  className="w-16 h-16 object-cover rounded"
                  lazy={false}
                />
              ) : (
                <File className="w-8 h-8 text-muted-foreground" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{attachment.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(attachment.size / 1024).toFixed(1)} KB
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleRemoveAttachment}
              >
                <XIcon className="w-4 h-4" />
              </Button>
            </div>
          )}
          
          <div className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept="image/*,application/pdf,text/plain,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={handleFileSelect}
            />
            <Button
              variant="outline"
              size="icon"
              className="rounded-full w-12 h-12 flex-shrink-0"
              onClick={() => fileInputRef.current?.click()}
              disabled={sendMessageMutation.isPending || uploadAttachmentMutation.isPending}
              title="Attach file"
            >
              {uploadAttachmentMutation.isPending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Paperclip className="w-5 h-5" />
              )}
            </Button>
            
            <div className="flex-1 relative">
              <Input
                value={message}
                onChange={(e) => {
                  if (e.target.value.length <= MAX_MESSAGE_LENGTH) {
                    setMessage(e.target.value);
                    // Broadcast typing indicator
                    handleTyping(e.target.value.length > 0);
                  }
                }}
                onKeyPress={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    handleTyping(false); // Stop typing indicator
                    handleSend();
                  }
                }}
                onBlur={() => handleTyping(false)} // Stop typing indicator when input loses focus
                placeholder="Type a message..."
                className="rounded-full flex-1 pr-16"
                disabled={sendMessageMutation.isPending || uploadAttachmentMutation.isPending}
                maxLength={MAX_MESSAGE_LENGTH}
              />
              {message.length > MAX_MESSAGE_LENGTH * 0.9 && (
                <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-muted-foreground">
                  {message.length}/{MAX_MESSAGE_LENGTH}
                </span>
              )}
            </div>
            
            <Button
              variant="yolk"
              size="icon"
              className="rounded-full w-12 h-12 flex-shrink-0"
              onClick={handleSend}
              disabled={
                sendMessageMutation.isPending ||
                uploadAttachmentMutation.isPending ||
                (!message.trim() && !attachment)
              }
            >
              {sendMessageMutation.isPending || uploadAttachmentMutation.isPending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chat;
