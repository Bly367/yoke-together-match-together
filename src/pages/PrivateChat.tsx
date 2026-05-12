import { useState, useEffect, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Send, User, Loader2, Paperclip, X as XIcon, File, Edit2, LogOut, MoreVertical } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { 
  useAllPrivateMessages, 
  useSendPrivateMessage, 
  useEditPrivateMessage,
  useDeletePrivateMessage,
  useMarkPrivateMessagesAsRead,
  usePrivateMessageSubscription,
  usePrivateTypingIndicator,
  usePrivateConversations,
  usePrivateConversation,
  useRenamePrivateConversation,
  useLeavePrivateConversation
} from "@/hooks/usePrivateMessaging";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useUploadMessageAttachment } from "@/hooks/useStorage";
import { formatTime } from "@/lib/utils";
import { ROUTES } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { OptimizedImage } from "@/components/OptimizedImage";
import { VirtualizedMessageList } from "@/components/VirtualizedMessageList";
import { MessageBubble } from "@/components/MessageBubble";
import { formatDate } from "@/lib/utils";
import { logger } from "@/lib/logger";

const MAX_MESSAGE_LENGTH = 1000;

const PrivateChat = () => {
  const { conversationId } = useParams<{ conversationId: string }>();
  const navigate = useNavigate();
  const [message, setMessage] = useState("");
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);
  const [attachmentPreview, setAttachmentPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messageInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();

  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesScrollRef = useRef<HTMLDivElement>(null);
  const [containerHeight, setContainerHeight] = useState(600);
  const previousMessagesLengthRef = useRef<number>(0);
  const previousConversationIdRef = useRef<string | undefined>(undefined);
  const isUserScrollingRef = useRef<boolean>(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const shouldAutoScrollRef = useRef<boolean>(true);

  const { data: messages = [], isLoading: messagesLoading, isError: messagesError } = 
    useAllPrivateMessages(conversationId || null);
  const sendMessageMutation = useSendPrivateMessage();
  const editMessageMutation = useEditPrivateMessage();
  const deleteMessageMutation = useDeletePrivateMessage();
  const markAsReadMutation = useMarkPrivateMessagesAsRead();
  const uploadAttachmentMutation = useUploadMessageAttachment();
  const renameConversationMutation = useRenamePrivateConversation();
  const leaveConversationMutation = useLeavePrivateConversation();
  const { data: conversations, isLoading: conversationsLoading } = usePrivateConversations(user?.id || null);
  const { data: conversationFromQuery, isLoading: conversationLoading } = usePrivateConversation(
    conversationId || null,
    user?.id || null
  );
  
  // Rename dialog state
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const [renameValue, setRenameValue] = useState("");

  // Subscribe to new messages - only when conversationId exists
  usePrivateMessageSubscription(conversationId || null, !!conversationId);

  // Typing indicators - only when conversationId and user exist
  const { typingUsers, handleTyping } = usePrivateTypingIndicator(
    conversationId || null,
    user?.id || null,
    user?.name || null
  );

  // Mark messages as read when viewing the chat
  useEffect(() => {
    if (conversationId && user?.id && messages.length > 0) {
      // Mark all messages as read when viewing
      markAsReadMutation.mutate({
        conversationId,
        userId: user.id,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, user?.id, messages.length]);

  // Find the conversation - memoized for performance
  // Prefer direct query result, fallback to conversations list
  const conversation = useMemo(() => {
    if (conversationFromQuery) return conversationFromQuery;
    return conversations?.find(c => c.id === conversationId);
  }, [conversationFromQuery, conversations, conversationId]);

  // Get other user info - memoized for performance
  const otherUser = useMemo(() => {
    if (!conversation || !user?.id) return null;
    
    return conversation.user1_id === user.id 
      ? conversation.user2 
      : conversation.user1;
  }, [conversation, user?.id]);

  // Get conversation display name (custom name or other user name)
  const conversationDisplayName = useMemo(() => {
    if (!conversation) return 'Private Chat';
    if (conversation.name) return conversation.name;
    if (!otherUser) return 'Private Chat';
    return otherUser.name || 'Private Chat';
  }, [conversation, otherUser]);

  // Handle rename
  const handleRename = async () => {
    if (!conversationId) return;
    
    try {
      await renameConversationMutation.mutateAsync({
        conversationId,
        name: renameValue.trim(),
      });
      setIsRenameDialogOpen(false);
      setRenameValue("");
      toast.success('Chat renamed successfully');
    } catch (error) {
      logger.error('Error renaming chat', error);
      toast.error(
        error instanceof Error 
          ? error.message 
          : 'Failed to rename chat'
      );
    }
  };

  // Handle leave
  const handleLeave = async () => {
    if (!conversationId || !user?.id) return;
    
    if (!confirm('Are you sure you want to leave this conversation? You can rejoin later.')) {
      return;
    }
    
    try {
      await leaveConversationMutation.mutateAsync(conversationId);
      toast.success('Left conversation');
    } catch (error) {
      logger.error('Error leaving conversation', error);
      toast.error(error instanceof Error ? error.message : 'Failed to leave conversation');
    }
  };

  // Open rename dialog
  const handleOpenRenameDialog = () => {
    setRenameValue(conversationDisplayName);
    setIsRenameDialogOpen(true);
  };

  // Update container height on resize
  useEffect(() => {
    const updateHeight = () => {
      if (messagesContainerRef.current) {
        const height = messagesContainerRef.current.clientHeight;
        if (height > 0) {
          setContainerHeight(height);
        }
      }
    };
    
    updateHeight();
    window.addEventListener('resize', updateHeight);
    
    const observer = new ResizeObserver(updateHeight);
    if (messagesContainerRef.current) {
      observer.observe(messagesContainerRef.current);
    }
    
    return () => {
      window.removeEventListener('resize', updateHeight);
      observer.disconnect();
    };
  }, []);

  // Handle scroll detection
  useEffect(() => {
    const scrollContainer = messagesScrollRef.current;
    if (!scrollContainer || messages.length > 50) return;

    const handleScroll = () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }

      isUserScrollingRef.current = true;
      shouldAutoScrollRef.current = false;

      const isNearBottom = 
        scrollContainer.scrollHeight - scrollContainer.scrollTop - scrollContainer.clientHeight < 100;
      
      if (isNearBottom) {
        shouldAutoScrollRef.current = true;
      }

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

  // Auto-scroll to bottom
  useEffect(() => {
    if (messages.length > 50) return;

    const scrollContainer = messagesScrollRef.current;
    if (!scrollContainer || messages.length === 0) return;

    const isFirstLoad = previousConversationIdRef.current !== conversationId;
    const hasNewMessages = messages.length > previousMessagesLengthRef.current;
    const lastMessage = messages[messages.length - 1];
    const isOwnMessage = lastMessage && lastMessage.sender_id === user?.id;

    if (isFirstLoad || (hasNewMessages && (isOwnMessage || shouldAutoScrollRef.current))) {
      setTimeout(() => {
        scrollContainer.scrollTo({
          top: scrollContainer.scrollHeight,
          behavior: isFirstLoad ? 'auto' : 'smooth',
        });
        shouldAutoScrollRef.current = true;
      }, 100);
    }

    previousMessagesLengthRef.current = messages.length;
    previousConversationIdRef.current = conversationId;
  }, [messages, conversationId, user?.id]);

  // Handle typing indicator
  useEffect(() => {
    if (message.trim()) {
      handleTyping(true);
    } else {
      handleTyping(false);
    }
  }, [message, handleTyping]);

  const handleSend = async () => {
    if (!conversationId || !user?.id || !otherUser?.id) return;
    
    const trimmedMessage = message.trim();
    if (!trimmedMessage && !attachment) return;

    if (trimmedMessage.length > MAX_MESSAGE_LENGTH) {
      toast.error(`Message must be ${MAX_MESSAGE_LENGTH} characters or less`);
      return;
    }

    try {
      let attachmentUrl: string | undefined;
      let attachmentType: string | undefined;
      let attachmentName: string | undefined;
      let attachmentSize: number | undefined;

      if (attachment) {
        const uploadResult = await uploadAttachmentMutation.mutateAsync({
          file: attachment,
          userId: user.id,
          matchId: conversationId,
        });
        attachmentUrl = uploadResult.url;
        attachmentType = attachment.type;
        attachmentName = attachment.name;
        attachmentSize = attachment.size;
      }

      await sendMessageMutation.mutateAsync({
        conversationId,
        senderId: user.id,
        recipientId: otherUser.id,
        content: trimmedMessage || '',
        attachment: attachmentUrl
          ? {
              url: attachmentUrl,
              type: attachmentType || '',
              name: attachmentName || '',
              size: attachmentSize || 0,
            }
          : undefined,
      });

      setMessage("");
      setAttachment(null);
      setAttachmentPreview(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      logger.error('Error sending message', error);
      toast.error(error instanceof Error ? error.message : 'Failed to send message');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB');
      return;
    }

    setAttachment(file);
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAttachmentPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleStartEdit = (messageId: string, content: string) => {
    setEditingMessageId(messageId);
    setEditContent(content);
  };

  const handleSaveEdit = async (messageId?: string) => {
    const idToSave = messageId ?? editingMessageId;
    if (!idToSave || !user?.id) return;

    try {
      await editMessageMutation.mutateAsync({
        messageId: idToSave,
        senderId: user.id,
        newContent: editContent,
      });
      setEditingMessageId(null);
      setEditContent("");
    } catch (error) {
      logger.error('Error editing message', error);
      toast.error('Failed to edit message');
    }
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditContent("");
  };

  const handleDelete = async (messageId: string) => {
    if (!user?.id) return;

    if (!confirm('Are you sure you want to delete this message?')) return;

    try {
      await deleteMessageMutation.mutateAsync({
        messageId,
        senderId: user.id,
      });
    } catch (error) {
      logger.error('Error deleting message', error);
      toast.error('Failed to delete message');
    }
  };

  if (messagesLoading || conversationsLoading || conversationLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!conversationId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-destructive mb-2">No conversation ID provided</p>
          <Button onClick={() => navigate(ROUTES.PRIVATE_MESSAGES)}>
            Back to Messages
          </Button>
        </div>
      </div>
    );
  }

  if (messagesError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-destructive mb-2">Error loading messages</p>
          <Button onClick={() => navigate(ROUTES.PRIVATE_MESSAGES)}>
            Back to Messages
          </Button>
        </div>
      </div>
    );
  }

  if (!conversation || !otherUser) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-muted-foreground mb-2">Loading conversation...</p>
          <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto mb-4" />
          <Button onClick={() => navigate(ROUTES.PRIVATE_MESSAGES)}>
            Back to Messages
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-background via-secondary/20 to-background">
      {/* Header */}
      <div className="bg-card shadow-sm border-b border-border flex-shrink-0">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(ROUTES.PRIVATE_MESSAGES)}>
              <ArrowLeft className="w-6 h-6" />
            </Button>
            
            <div className="flex-1 flex items-center gap-3 min-w-0">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="font-semibold text-foreground truncate">
                    {conversationDisplayName}
                  </h2>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-6 w-6">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={handleOpenRenameDialog}>
                        <Edit2 className="w-4 h-4 mr-2" />
                        Rename Chat
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={handleLeave}
                        className="text-destructive focus:text-destructive"
                      >
                        <LogOut className="w-4 h-4 mr-2" />
                        Leave Chat
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <p className="text-xs text-muted-foreground">
                  {messages.length} {messages.length === 1 ? 'message' : 'messages'}
                  {typingUsers.length > 0 && (
                    <span className="ml-2 text-primary animate-pulse">
                      {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
                    </span>
                  )}
                </p>
              </div>

              {/* Other user avatar - to the right */}
              {otherUser && (
                <div className="flex-shrink-0">
                  <div className={cn(
                    "w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden flex-shrink-0"
                  )}>
                    {otherUser.photo_url ? (
                      <img
                        src={otherUser.photo_url}
                        alt={otherUser.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="w-5 h-5 text-primary" />
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Rename Dialog */}
      <Dialog open={isRenameDialogOpen} onOpenChange={setIsRenameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Private Chat</DialogTitle>
            <DialogDescription>
              Give this private chat a custom name. Leave empty to use the other user's name.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              placeholder="Enter chat name..."
              maxLength={50}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleRename();
                }
              }}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsRenameDialogOpen(false);
                setRenameValue("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleRename}
              disabled={renameConversationMutation.isPending}
            >
              {renameConversationMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Messages */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-hidden max-w-4xl mx-auto w-full min-h-0 flex flex-col"
      >
        {messages.length > 50 ? (
          <VirtualizedMessageList
            messages={messages.map(msg => ({
              ...msg,
              match_id: msg.conversation_id, // MessageBubble expects match_id
            }))}
            currentUserId={user?.id || null}
            editingMessageId={editingMessageId}
            editContent={editContent}
            onEditChange={setEditContent}
            onStartEdit={(msg) => handleStartEdit(msg.id, msg.content)}
            onSaveEdit={(id) => void handleSaveEdit(id)}
            onCancelEdit={handleCancelEdit}
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
                const toBubbleMessage = (m: (typeof messages)[number]) => ({
                  ...m,
                  match_id: m.conversation_id,
                });
                const previousMessage = index > 0 ? toBubbleMessage(messages[index - 1]) : null;
                const nextMessage =
                  index < messages.length - 1 ? toBubbleMessage(messages[index + 1]) : null;
                
                // Show date separator if date changed
                const showDateSeparator = Boolean(
                  previousMessage &&
                  formatDate(previousMessage.created_at) !== formatDate(msg.created_at)
                );
                
                return (
                  <MessageBubble
                    key={msg.id}
                    message={{
                      ...msg,
                      match_id: msg.conversation_id, // MessageBubble expects match_id
                    }}
                    isOwn={isOwn}
                    isEditing={isEditing}
                    editContent={editContent}
                    onEditChange={setEditContent}
                    onStartEdit={() => handleStartEdit(msg.id, msg.content)}
                    onSaveEdit={handleSaveEdit}
                    onCancelEdit={handleCancelEdit}
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

      {/* Message Input */}
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
                onClick={() => {
                  setAttachment(null);
                  setAttachmentPreview(null);
                  if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                  }
                }}
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
                ref={messageInputRef}
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

export default PrivateChat;

