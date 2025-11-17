import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { useEffect, useRef, useMemo, useState } from 'react';
import {
  createPrivateConversation,
  getPrivateConversation,
  getPrivateConversations,
  getPrivateMessages,
  sendPrivateMessage,
  editPrivateMessage,
  deletePrivateMessage,
  markPrivateMessagesAsRead,
  getUnreadPrivateMessageCount,
  subscribeToPrivateMessages,
  subscribeToPrivateConversations,
  subscribeToPrivateTypingIndicators,
  broadcastPrivateTypingIndicator,
  renamePrivateConversation,
  leavePrivateConversation,
  type PrivateConversation,
  type PrivateMessage,
  type PrivateMessagePaginationOptions,
} from '@/services/privateMessaging.service';
import { useAuth } from './useAuth';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '@/lib/routes';

/**
 * Query keys
 */
const PRIVATE_CONVERSATIONS_QUERY_KEY = (userId: string) => ['privateConversations', userId] as const;
const PRIVATE_MESSAGES_QUERY_KEY = (conversationId: string) => ['privateMessages', conversationId] as const;
const UNREAD_PRIVATE_COUNT_QUERY_KEY = (conversationId: string, userId: string) => 
  ['unreadPrivateCount', conversationId, userId] as const;

/**
 * Hook to get all private conversations for a user
 */
export function usePrivateConversations(userId: string | null) {
  return useQuery({
    queryKey: PRIVATE_CONVERSATIONS_QUERY_KEY(userId || ''),
    queryFn: () => getPrivateConversations(userId!),
    enabled: !!userId,
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}

/**
 * Hook to get a single private conversation by ID
 */
export function usePrivateConversation(
  conversationId: string | null,
  userId: string | null
) {
  return useQuery({
    queryKey: ['privateConversation', conversationId, userId],
    queryFn: () => getPrivateConversation(conversationId!, userId!),
    enabled: !!conversationId && !!userId,
  });
}

/**
 * Hook to get private messages for a conversation with pagination
 */
export function usePrivateMessages(
  conversationId: string | null,
  options: PrivateMessagePaginationOptions = {}
) {
  return useInfiniteQuery({
    queryKey: [...PRIVATE_MESSAGES_QUERY_KEY(conversationId || ''), options],
    queryFn: ({ pageParam = 0 }) => 
      getPrivateMessages(conversationId!, { ...options, offset: pageParam }),
    enabled: !!conversationId,
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage.hasMore) return undefined;
      return allPages.reduce((acc, page) => acc + page.messages.length, 0);
    },
    initialPageParam: 0,
  });
}

/**
 * Hook to get all private messages for a conversation (flattened, for backward compatibility)
 */
export function useAllPrivateMessages(conversationId: string | null) {
  const query = usePrivateMessages(conversationId, { limit: 50 });
  return {
    ...query,
    data: query.data?.pages.flatMap(page => page.messages) || [],
    isError: query.isError,
    error: query.error,
  };
}

/**
 * Hook to create a private conversation
 */
export function useCreatePrivateConversation() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: ({ user1Id, user2Id }: { user1Id: string; user2Id: string }) =>
      createPrivateConversation(user1Id, user2Id),
    onSuccess: (conversation) => {
      // Invalidate conversations list
      if (user?.id) {
        queryClient.invalidateQueries({ 
          queryKey: PRIVATE_CONVERSATIONS_QUERY_KEY(user.id) 
        });
      }
    },
  });
}

/**
 * Hook to send a private message
 */
export function useSendPrivateMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      conversationId,
      senderId,
      recipientId,
      content,
      attachment,
    }: {
      conversationId: string;
      senderId: string;
      recipientId: string;
      content: string;
      attachment?: {
        url: string;
        type: string;
        name: string;
        size: number;
      };
    }) => sendPrivateMessage(conversationId, senderId, recipientId, content, attachment),
    onSuccess: (message, variables) => {
      // Invalidate messages query to refetch with new message
      queryClient.invalidateQueries({ 
        queryKey: PRIVATE_MESSAGES_QUERY_KEY(variables.conversationId) 
      });
      
      // Invalidate conversations list to update last message
      queryClient.invalidateQueries({ queryKey: ['privateConversations'] });
      
      // Invalidate unread counts
      queryClient.invalidateQueries({ queryKey: ['unreadPrivateCount'] });
    },
  });
}

/**
 * Hook to edit a private message
 */
export function useEditPrivateMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      messageId,
      senderId,
      newContent,
    }: {
      messageId: string;
      senderId: string;
      newContent: string;
    }) => editPrivateMessage(messageId, senderId, newContent),
    onSuccess: (message) => {
      // Invalidate messages query to refetch with updated message
      queryClient.invalidateQueries({ 
        queryKey: PRIVATE_MESSAGES_QUERY_KEY(message.conversation_id) 
      });
      
      // Invalidate conversations list
      queryClient.invalidateQueries({ queryKey: ['privateConversations'] });
    },
  });
}

/**
 * Hook to delete a private message
 */
export function useDeletePrivateMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      messageId,
      senderId,
    }: {
      messageId: string;
      senderId: string;
    }) => deletePrivateMessage(messageId, senderId),
    onSuccess: (message) => {
      // Invalidate messages query to refetch without deleted message
      queryClient.invalidateQueries({ 
        queryKey: PRIVATE_MESSAGES_QUERY_KEY(message.conversation_id) 
      });
      
      // Invalidate conversations list
      queryClient.invalidateQueries({ queryKey: ['privateConversations'] });
    },
  });
}

/**
 * Hook to mark private messages as read
 */
export function useMarkPrivateMessagesAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      conversationId,
      userId,
      messageIds,
    }: {
      conversationId: string;
      userId: string;
      messageIds?: string[];
    }) => markPrivateMessagesAsRead(conversationId, userId, messageIds),
    onSuccess: (_, variables) => {
      // Invalidate unread counts
      queryClient.invalidateQueries({ queryKey: ['unreadPrivateCount'] });
      
      // Invalidate conversations list to update unread counts
      queryClient.invalidateQueries({ queryKey: ['privateConversations'] });
      
      // Optionally invalidate messages to update read receipts
      queryClient.invalidateQueries({ 
        queryKey: PRIVATE_MESSAGES_QUERY_KEY(variables.conversationId) 
      });
    },
  });
}

/**
 * Hook to get unread private message count for a conversation
 */
export function useUnreadPrivateMessageCount(
  conversationId: string | null,
  userId: string | null
) {
  return useQuery({
    queryKey: UNREAD_PRIVATE_COUNT_QUERY_KEY(conversationId || '', userId || ''),
    queryFn: () => getUnreadPrivateMessageCount(conversationId!, userId!),
    enabled: !!conversationId && !!userId,
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}

/**
 * Hook to subscribe to new private messages
 */
export function usePrivateMessageSubscription(
  conversationId: string | null,
  enabled: boolean = true
) {
  const queryClient = useQueryClient();
  const unsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!conversationId || !enabled) return;

    const unsubscribe = subscribeToPrivateMessages(conversationId, (message) => {
      // Invalidate messages query to refetch with new message
      queryClient.invalidateQueries({ 
        queryKey: PRIVATE_MESSAGES_QUERY_KEY(conversationId) 
      });
      
      // Invalidate conversations list to update last message
      queryClient.invalidateQueries({ queryKey: ['privateConversations'] });
      
      // Invalidate unread counts
      queryClient.invalidateQueries({ queryKey: ['unreadPrivateCount'] });
    });

    unsubscribeRef.current = unsubscribe;

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [conversationId, enabled, queryClient]);
}

/**
 * Hook to subscribe to private conversation updates
 * Updates conversation list when conversations are updated
 */
export function usePrivateConversationsSubscription(
  userId: string | null,
  enabled: boolean = true
) {
  const queryClient = useQueryClient();
  const unsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!userId || !enabled) {
      // Clean up subscription if disabled
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
      return;
    }

    const unsubscribe = subscribeToPrivateConversations(userId, (conversation) => {
      // Update conversations cache
      queryClient.setQueryData(
        PRIVATE_CONVERSATIONS_QUERY_KEY(userId),
        (old: PrivateConversation[] = []) => {
          const existingIndex = old.findIndex(c => c.id === conversation.id);
          if (existingIndex >= 0) {
            // Update existing conversation
            const updated = [...old];
            updated[existingIndex] = conversation;
            // Sort by last_message_at DESC
            return updated.sort((a, b) => {
              const aTime = a.last_message_at || a.updated_at;
              const bTime = b.last_message_at || b.updated_at;
              return new Date(bTime).getTime() - new Date(aTime).getTime();
            });
          } else {
            // Add new conversation
            return [conversation, ...old];
          }
        }
      );
      
      // Invalidate unread counts
      queryClient.invalidateQueries({ queryKey: ['unreadPrivateCount'] });
    });

    unsubscribeRef.current = unsubscribe;

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [userId, enabled, queryClient]);
}

/**
 * Hook to subscribe to typing indicators for a private conversation
 */
export function usePrivateTypingIndicator(
  conversationId: string | null,
  userId: string | null,
  userName: string | null
) {
  const [typingUsers, setTypingUsers] = useState<Map<string, { name: string; timeout: NodeJS.Timeout }>>(
    new Map()
  );
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!conversationId || !userId) return;

    const unsubscribe = subscribeToPrivateTypingIndicators(
      conversationId,
      (typingUserId, typingUserName, isTyping) => {
        // Don't show typing indicator for own typing
        if (typingUserId === userId) return;

        setTypingUsers((prev) => {
          const newMap = new Map(prev);

          if (isTyping) {
            // Clear existing timeout if any
            const existing = newMap.get(typingUserId);
            if (existing) {
              clearTimeout(existing.timeout);
            }

            // Set new timeout to remove typing indicator after 3 seconds
            const timeout = setTimeout(() => {
              setTypingUsers((current) => {
                const updated = new Map(current);
                updated.delete(typingUserId);
                return updated;
              });
            }, 3000);

            newMap.set(typingUserId, { name: typingUserName, timeout });
          } else {
            // Remove typing indicator
            const existing = newMap.get(typingUserId);
            if (existing) {
              clearTimeout(existing.timeout);
            }
            newMap.delete(typingUserId);
          }

          return newMap;
        });
      }
    );

    unsubscribeRef.current = unsubscribe;

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
      // Clear broadcast timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      // Clear all typing indicator timeouts
      typingUsers.forEach(({ timeout }) => clearTimeout(timeout));
    };
  }, [conversationId, userId, typingUsers]);

  // Broadcast typing indicator when user types
  const handleTyping = (isTyping: boolean) => {
    if (!conversationId || !userId || !userName) return;

    // Debounce typing indicator broadcasts
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    if (isTyping) {
      broadcastPrivateTypingIndicator(conversationId, userId, userName, true);

      // Stop typing indicator after 2 seconds of no activity
      typingTimeoutRef.current = setTimeout(() => {
        broadcastPrivateTypingIndicator(conversationId, userId, userName, false);
      }, 2000);
    } else {
      broadcastPrivateTypingIndicator(conversationId, userId, userName, false);
    }
  };

  return {
    typingUsers: Array.from(typingUsers.values()).map((u) => u.name),
    handleTyping,
  };
}

/**
 * Hook to get total unread count across all private conversations
 */
export function useTotalUnreadPrivateCount(userId: string | null) {
  const { data: conversations } = usePrivateConversations(userId);

  const totalUnread = useMemo(() => {
    if (!conversations) return 0;
    return conversations.reduce((sum, conv) => sum + (conv.unread_count || 0), 0);
  }, [conversations]);

  return totalUnread;
}

/**
 * Hook to rename a private conversation
 */
export function useRenamePrivateConversation() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: ({ conversationId, name }: { conversationId: string; name: string }) =>
      renamePrivateConversation(conversationId, name),
    onSuccess: (conversation) => {
      // Invalidate conversations query
      if (user?.id) {
        queryClient.invalidateQueries({ queryKey: PRIVATE_CONVERSATIONS_QUERY_KEY(user.id) });
      }
      // Update single conversation query
      queryClient.invalidateQueries({ queryKey: ['privateConversation', conversation.id] });
    },
  });
}

/**
 * Hook to leave a private conversation
 */
export function useLeavePrivateConversation() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (conversationId: string) => {
      if (!user?.id) throw new Error('User not authenticated');
      return leavePrivateConversation(conversationId, user.id);
    },
    onSuccess: () => {
      // Invalidate conversations query
      if (user?.id) {
        queryClient.invalidateQueries({ queryKey: PRIVATE_CONVERSATIONS_QUERY_KEY(user.id) });
      }
      // Navigate back to private messages
      navigate(ROUTES.PRIVATE_MESSAGES);
    },
  });
}

