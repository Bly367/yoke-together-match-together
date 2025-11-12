import { useEffect, useRef, useCallback } from 'react';
import { List } from 'react-window';
import { formatDate } from '@/lib/utils';
import { MessageBubble } from '@/components/MessageBubble';
import type { Message } from '@/services/chat.service';

interface VirtualizedMessageListProps {
  messages: Message[];
  currentUserId: string | null;
  editingMessageId: string | null;
  editContent: string;
  onEditChange: (content: string) => void;
  onStartEdit: (message: Message) => void;
  onSaveEdit: (messageId: string) => void;
  onCancelEdit: () => void;
  onDelete: (messageId: string) => void;
  isEditingPending: boolean;
  containerHeight: number;
}

/**
 * Virtualized message list component for efficient rendering of long message lists
 * Only renders visible messages, improving performance for chats with 100+ messages
 */
export function VirtualizedMessageList({
  messages,
  currentUserId,
  editingMessageId,
  editContent,
  onEditChange,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onDelete,
  isEditingPending,
  containerHeight,
}: VirtualizedMessageListProps) {
  const listRef = useRef<List>(null);
  const itemHeightsRef = useRef<Map<number, number>>(new Map());
  const previousMessagesLengthRef = useRef<number>(0);
  const previousLastMessageIdRef = useRef<string | null>(null);
  const previousFirstMessageIdRef = useRef<string | null>(null);
  const isInitialMountRef = useRef<boolean>(true);

  // Scroll to bottom when:
  // 1. Component first mounts (entering chat) - always scroll to latest message
  // 2. Chat changes (first message ID changes) - scroll to latest message
  // 3. New messages arrive (especially if sent by current user)
  useEffect(() => {
    if (!listRef.current || messages.length === 0) return;

    const firstMessage = messages[0];
    const lastMessage = messages[messages.length - 1];
    const isFirstLoad = isInitialMountRef.current;
    const chatChanged = firstMessage.id !== previousFirstMessageIdRef.current;
    const hasNewMessages = messages.length > previousMessagesLengthRef.current;
    const isNewMessage = lastMessage.id !== previousLastMessageIdRef.current;
    const isOwnMessage = lastMessage.sender_id === currentUserId;

    // Reset initial mount flag if chat changed
    if (chatChanged && !isFirstLoad) {
      isInitialMountRef.current = true;
    }

    // Always scroll on first load or when chat changes (entering chat)
    // Also scroll when new messages arrive, especially if sent by current user
    if (isFirstLoad || chatChanged || (hasNewMessages && isNewMessage && isOwnMessage)) {
      // Use requestAnimationFrame with double RAF for smooth scrolling
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (listRef.current) {
            listRef.current.scrollToItem(messages.length - 1, 'end');
          }
        });
      });
    }

    previousMessagesLengthRef.current = messages.length;
    previousLastMessageIdRef.current = lastMessage.id;
    previousFirstMessageIdRef.current = firstMessage.id;
    isInitialMountRef.current = false;
  }, [messages, currentUserId]);

  // Estimate item height (will be adjusted based on actual rendered height)
  const getItemSize = useCallback(
    (index: number) => {
      const cachedHeight = itemHeightsRef.current.get(index);
      if (cachedHeight) return cachedHeight;
      
      const message = messages[index];
      const isEditing = editingMessageId === message.id;
      
      // Estimate height based on content length, attachments, and editing state
      const baseHeight = 60; // Base height for message bubble
      const contentHeight = Math.ceil(message.content.length / 50) * 20; // Rough estimate
      const attachmentHeight = message.attachment_url 
        ? (message.attachment_type?.startsWith('image/') ? 200 : 60) 
        : 0;
      const editingHeight = isEditing ? 80 : 0;
      
      return baseHeight + contentHeight + attachmentHeight + editingHeight;
    },
    [messages, editingMessageId]
  );

  // Store actual item height after render
  const setItemSize = useCallback((index: number, size: number) => {
    itemHeightsRef.current.set(index, size);
    if (listRef.current) {
      listRef.current.resetAfterIndex(index);
    }
  }, []);

  // Row component (separate component to allow hooks)
  const MessageRow = useCallback(
    ({ index, style }: { index: number; style: React.CSSProperties }) => {
      const msg = messages[index];
      const rowRef = useRef<HTMLDivElement>(null);
      const previousMessage = index > 0 ? messages[index - 1] : null;
      const nextMessage = index < messages.length - 1 ? messages[index + 1] : null;

      // Measure and update height after render
      useEffect(() => {
        if (rowRef.current) {
          const height = rowRef.current.getBoundingClientRect().height;
          setItemSize(index, height);
        }
      }, [index, editingMessageId === msg.id, msg.content, msg.attachment_url]);

      const isOwn = msg.sender_id === currentUserId;
      const isEditing = editingMessageId === msg.id;
      
      // Show date separator if date changed
      const showDateSeparator = previousMessage && 
        formatDate(previousMessage.created_at) !== formatDate(msg.created_at);

      return (
        <div style={style} ref={rowRef}>
          <MessageBubble
            message={msg}
            isOwn={isOwn}
            isEditing={isEditing}
            editContent={editContent}
            onEditChange={onEditChange}
            onStartEdit={() => onStartEdit(msg)}
            onSaveEdit={() => onSaveEdit(msg.id)}
            onCancelEdit={onCancelEdit}
            onDelete={() => onDelete(msg.id)}
            isEditingPending={isEditingPending}
            showAvatar={!isOwn}
            showSenderName={!isOwn}
            showTimestamp={true}
            showDateSeparator={showDateSeparator}
            senderName={msg.sender?.name}
            senderPhotoUrl={msg.sender?.photo_url}
            previousMessage={previousMessage}
            nextMessage={nextMessage}
          />
        </div>
      );
    },
    [
      messages,
      currentUserId,
      editingMessageId,
      editContent,
      onEditChange,
      onStartEdit,
      onSaveEdit,
      onCancelEdit,
      onDelete,
      isEditingPending,
      setItemSize,
    ]
  );

  const Row = MessageRow;

  if (messages.length === 0) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        <p>No messages yet. Start the conversation!</p>
      </div>
    );
  }

  return (
    <List
      ref={listRef}
      height={containerHeight}
      itemCount={messages.length}
      itemSize={getItemSize}
      width="100%"
      overscanCount={5}
    >
      {Row}
    </List>
  );
}

