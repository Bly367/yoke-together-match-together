import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { useEffect, useRef, useMemo, useState } from 'react';
import {
  getMatchMessages,
  sendMessage,
  editMessage,
  deleteMessage,
  markMessagesAsRead,
  getUnreadCounts,
  subscribeToMessages,
  subscribeToAllMatchMessages,
  subscribeToTypingIndicators,
  broadcastTypingIndicator,
  type Message,
  type MessagePaginationOptions,
} from '@/services/chat.service';

/**
 * Query keys
 */
const MESSAGES_QUERY_KEY = (matchId: string) => ['messages', matchId] as const;
export const LAST_MESSAGES_QUERY_KEY = (matchIds: string[]) => {
  // Sort matchIds for consistent query key caching
  const sorted = [...matchIds].sort();
  return ['lastMessages', sorted] as const;
};
const UNREAD_COUNTS_QUERY_KEY = (matchIds: string[], userId: string) => ['unreadCounts', matchIds, userId] as const;

/**
 * Hook to get messages for a match with pagination
 */
export function useMessages(matchId: string | null, options: MessagePaginationOptions = {}) {
  return useInfiniteQuery({
    queryKey: [...MESSAGES_QUERY_KEY(matchId || ''), options],
    queryFn: ({ pageParam = 0 }) => getMatchMessages(matchId!, { ...options, offset: pageParam }),
    enabled: !!matchId,
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage.hasMore) return undefined;
      return allPages.reduce((acc, page) => acc + page.messages.length, 0);
    },
    initialPageParam: 0,
  });
}

/**
 * Hook to get all messages for a match (flattened, for backward compatibility)
 */
export function useAllMessages(matchId: string | null) {
  const query = useMessages(matchId, { limit: 50 });
  return {
    ...query,
    data: query.data?.pages.flatMap(page => page.messages) || [],
    // Expose error state for error handling
    isError: query.isError,
    error: query.error,
  };
}

/**
 * Hook to send a message
 */
export function useSendMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      matchId,
      senderId,
      content,
      attachment,
    }: {
      matchId: string;
      senderId: string;
      content: string;
      attachment?: {
        url: string;
        type: string;
        name: string;
        size: number;
      };
    }) => sendMessage(matchId, senderId, content, attachment),
    onSuccess: (message, variables) => {
      // Invalidate messages query to refetch with new message
      queryClient.invalidateQueries({ queryKey: MESSAGES_QUERY_KEY(variables.matchId) });
      
      // Invalidate lastMessages query to update matches list preview
      queryClient.invalidateQueries({ queryKey: ['lastMessages'] });
      
      // Invalidate unread counts
      queryClient.invalidateQueries({ queryKey: ['unreadCounts'] });
    },
  });
}

/**
 * Hook to edit a message
 */
export function useEditMessage() {
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
    }) => editMessage(messageId, senderId, newContent),
    onSuccess: (message) => {
      // Invalidate messages query to refetch with updated message
      queryClient.invalidateQueries({ queryKey: MESSAGES_QUERY_KEY(message.match_id) });
      
      // Invalidate lastMessages query
      queryClient.invalidateQueries({ queryKey: ['lastMessages'] });
    },
  });
}

/**
 * Hook to delete a message
 */
export function useDeleteMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      messageId,
      senderId,
    }: {
      messageId: string;
      senderId: string;
    }) => deleteMessage(messageId, senderId),
    onSuccess: (message) => {
      // Invalidate messages query to refetch without deleted message
      queryClient.invalidateQueries({ queryKey: MESSAGES_QUERY_KEY(message.match_id) });
      
      // Invalidate lastMessages query
      queryClient.invalidateQueries({ queryKey: ['lastMessages'] });
    },
  });
}

/**
 * Hook to mark messages as read
 */
export function useMarkMessagesAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      matchId,
      userId,
      messageIds,
    }: {
      matchId: string;
      userId: string;
      messageIds?: string[];
    }) => markMessagesAsRead(matchId, userId, messageIds),
    onSuccess: (_, variables) => {
      // Invalidate unread counts
      queryClient.invalidateQueries({ queryKey: ['unreadCounts'] });
      
      // Optionally invalidate messages to update read receipts
      queryClient.invalidateQueries({ queryKey: MESSAGES_QUERY_KEY(variables.matchId) });
    },
  });
}

/**
 * Hook to get unread counts for matches
 */
export function useUnreadCounts(matchIds: string[], userId: string | null) {
  return useQuery({
    queryKey: UNREAD_COUNTS_QUERY_KEY(matchIds, userId || ''),
    queryFn: () => getUnreadCounts(matchIds, userId!),
    enabled: !!userId && matchIds.length > 0,
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}

/**
 * Hook to subscribe to new messages
 */
export function useMessageSubscription(matchId: string | null, enabled: boolean = true) {
  const queryClient = useQueryClient();
  const unsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!matchId || !enabled) return;

    const unsubscribe = subscribeToMessages(matchId, (message) => {
      // Invalidate messages query to refetch with new message
      queryClient.invalidateQueries({ queryKey: MESSAGES_QUERY_KEY(matchId) });
      
      // Update lastMessages cache - need to get current matchIds from cache
      // For now, invalidate all lastMessages queries to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['lastMessages'] });
      
      // Invalidate unread counts
      queryClient.invalidateQueries({ queryKey: ['unreadCounts'] });
    });

    unsubscribeRef.current = unsubscribe;

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [matchId, enabled, queryClient]);
}

/**
 * Hook to subscribe to new messages for all user matches
 * Updates lastMessages cache when new messages arrive
 * Useful for the Matches page to show real-time updates
 */
export function useAllMatchMessagesSubscription(matchIds: string[], enabled: boolean = true) {
  const queryClient = useQueryClient();
  const unsubscribeRef = useRef<(() => void) | null>(null);
  
  // Create a stable sorted array for the query key
  const sortedMatchIds = useMemo(() => {
    return [...matchIds].sort();
  }, [matchIds]);

  useEffect(() => {
    if (!enabled || sortedMatchIds.length === 0) {
      // Clean up subscription if disabled or no matches
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
      return;
    }

    const unsubscribe = subscribeToAllMatchMessages(sortedMatchIds, (message) => {
      // Update lastMessages cache using the same query key format as the query
      queryClient.setQueryData(LAST_MESSAGES_QUERY_KEY(sortedMatchIds), (old: Record<string, Message | null> = {}) => {
        const currentLastMessage = old[message.match_id];
        // Update if this is a newer message
        if (!currentLastMessage || new Date(message.created_at) > new Date(currentLastMessage.created_at)) {
          return {
            ...old,
            [message.match_id]: message,
          };
        }
        return old;
      });
      
      // Invalidate unread counts
      queryClient.invalidateQueries({ queryKey: ['unreadCounts'] });
    });

    unsubscribeRef.current = unsubscribe;

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [sortedMatchIds, enabled, queryClient]); // Removed matchIds from deps - sortedMatchIds already depends on it
}

/**
 * Hook to subscribe to typing indicators for a match
 */
export function useTypingIndicator(matchId: string | null, userId: string | null, userName: string | null) {
  const [typingUsers, setTypingUsers] = useState<Map<string, { name: string; timeout: NodeJS.Timeout }>>(new Map());
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!matchId || !userId) return;

    const unsubscribe = subscribeToTypingIndicators(matchId, (typingUserId, typingUserName, isTyping) => {
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
    });

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
  }, [matchId, userId]);

  // Broadcast typing indicator when user types
  const handleTyping = (isTyping: boolean) => {
    if (!matchId || !userId || !userName) return;
    
    // Debounce typing indicator broadcasts
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    if (isTyping) {
      broadcastTypingIndicator(matchId, userId, userName, true);
      
      // Stop typing indicator after 2 seconds of no activity
      typingTimeoutRef.current = setTimeout(() => {
        broadcastTypingIndicator(matchId, userId, userName, false);
      }, 2000);
    } else {
      broadcastTypingIndicator(matchId, userId, userName, false);
    }
  };

  return {
    typingUsers: Array.from(typingUsers.values()).map(u => u.name),
    handleTyping,
  };
}

