import { useEffect, useRef, useCallback, useMemo, memo } from 'react';
import { VariableSizeList } from 'react-window';
import type { ListChildComponentProps } from 'react-window';
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

export type VirtualizedMessageListItemData = {
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
  setItemSize: (index: number, size: number) => void;
};

const MessageListRow = memo(function MessageListRow({
  index,
  style,
  data,
}: ListChildComponentProps<VirtualizedMessageListItemData>) {
  const {
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
  } = data;

  const msg = messages[index];
  const rowRef = useRef<HTMLDivElement>(null);
  const previousMessage = index > 0 ? messages[index - 1] : null;
  const nextMessage = index < messages.length - 1 ? messages[index + 1] : null;

  useEffect(() => {
    if (rowRef.current) {
      const height = rowRef.current.getBoundingClientRect().height;
      setItemSize(index, height);
    }
  }, [index, editingMessageId, msg.content, msg.attachment_url, msg.id, setItemSize]);

  const isOwn = msg.sender_id === currentUserId;
  const isEditing = editingMessageId === msg.id;

  const showDateSeparator = Boolean(
    previousMessage && formatDate(previousMessage.created_at) !== formatDate(msg.created_at)
  );

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
});

MessageListRow.displayName = 'MessageListRow';

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
  const listRef = useRef<VariableSizeList>(null);
  const itemHeightsRef = useRef<Map<number, number>>(new Map());
  const previousMessagesLengthRef = useRef<number>(0);
  const previousLastMessageIdRef = useRef<string | null>(null);
  const previousFirstMessageIdRef = useRef<string | null>(null);
  const isInitialMountRef = useRef<boolean>(true);

  useEffect(() => {
    if (!listRef.current || messages.length === 0) return;

    const firstMessage = messages[0];
    const lastMessage = messages[messages.length - 1];
    const isFirstLoad = isInitialMountRef.current;
    const chatChanged = firstMessage.id !== previousFirstMessageIdRef.current;
    const hasNewMessages = messages.length > previousMessagesLengthRef.current;
    const isNewMessage = lastMessage.id !== previousLastMessageIdRef.current;
    const isOwnMessage = lastMessage.sender_id === currentUserId;

    if (chatChanged && !isFirstLoad) {
      isInitialMountRef.current = true;
    }

    if (isFirstLoad || chatChanged || (hasNewMessages && isNewMessage && isOwnMessage)) {
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

  const getItemSize = useCallback(
    (index: number) => {
      const cachedHeight = itemHeightsRef.current.get(index);
      if (cachedHeight) return cachedHeight;

      const message = messages[index];
      const isEditing = editingMessageId === message.id;

      const baseHeight = 60;
      const contentHeight = Math.ceil(message.content.length / 50) * 20;
      const attachmentHeight = message.attachment_url
        ? message.attachment_type?.startsWith('image/')
          ? 200
          : 60
        : 0;
      const editingHeight = isEditing ? 80 : 0;

      return baseHeight + contentHeight + attachmentHeight + editingHeight;
    },
    [messages, editingMessageId]
  );

  const setItemSize = useCallback((index: number, size: number) => {
    itemHeightsRef.current.set(index, size);
    if (listRef.current) {
      listRef.current.resetAfterIndex(index);
    }
  }, []);

  const itemData: VirtualizedMessageListItemData = useMemo(
    () => ({
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
    }),
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

  if (messages.length === 0) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        <p>No messages yet. Start the conversation!</p>
      </div>
    );
  }

  return (
    <VariableSizeList
      ref={listRef}
      height={containerHeight}
      itemCount={messages.length}
      itemSize={getItemSize}
      itemData={itemData}
      width="100%"
      overscanCount={5}
    >
      {MessageListRow}
    </VariableSizeList>
  );
}
