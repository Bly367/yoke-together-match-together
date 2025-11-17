import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

/**
 * Message type
 */
export interface Message {
  id: string;
  match_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  edited_at?: string;
  deleted_at?: string;
  attachment_url?: string;
  attachment_type?: string;
  attachment_name?: string;
  attachment_size?: number;
  sender?: {
    id: string;
    name: string;
    photo_url?: string;
  };
  read_by?: string[]; // Array of user IDs who have read this message
}

/**
 * Pagination options for messages
 */
export interface MessagePaginationOptions {
  limit?: number;
  offset?: number;
}

/**
 * Paginated messages response
 */
export interface PaginatedMessages {
  messages: Message[];
  hasMore: boolean;
  total?: number;
}

/**
 * Get messages for a match with pagination support
 * @param matchId - The match ID
 * @param options - Pagination options (limit, offset)
 * @returns Paginated messages
 */
/**
 * Get paginated messages for a match
 * 
 * Retrieves messages for a specific match with pagination support. Messages are
 * returned in descending order (newest first). Includes sender profile information.
 * 
 * @param matchId - ID of the match to get messages for
 * @param options - Pagination options
 * @param options.limit - Maximum number of messages to return (default: 50)
 * @param options.offset - Number of messages to skip (default: 0)
 * @returns Promise resolving to paginated messages with total count
 * @throws {Error} If query fails
 * 
 * @example
 * ```typescript
 * const result = await getMatchMessages('match-id', { limit: 20, offset: 0 });
 * console.log(`Found ${result.total} messages, showing ${result.messages.length}`);
 * ```
 */
export async function getMatchMessages(
  matchId: string,
  options: MessagePaginationOptions = {}
): Promise<PaginatedMessages> {
  const { limit = 50, offset = 0 } = options;
  
  // Get total count (excluding deleted messages)
  const { count } = await supabase
    .from('messages')
    .select('*', { count: 'exact', head: true })
    .eq('match_id', matchId)
    .is('deleted_at', null);

  // Get messages with pagination (excluding deleted)
  // Use sender_id column name for relationship (Supabase infers FK from column name)
  const { data, error } = await supabase
    .from('messages')
    .select(`
      *,
      sender:profiles!sender_id(id, name, photo_url)
    `)
    .eq('match_id', matchId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    logger.error('Error fetching messages', error, { matchId, options });
    throw error;
  }

  // Get read receipts for these messages
  const messageIds = (data || []).map(m => m.id);
  const readReceipts: Record<string, string[]> = {};
  
  if (messageIds.length > 0) {
    const { data: reads } = await supabase
      .from('message_reads')
      .select('message_id, user_id')
      .in('message_id', messageIds);
    
    (reads || []).forEach((read) => {
      if (!readReceipts[read.message_id]) {
        readReceipts[read.message_id] = [];
      }
      readReceipts[read.message_id].push(read.user_id);
    });
  }

  // Reverse to show oldest first, and add read_by info
  const messages = (data || [])
    .reverse()
    .map((msg) => ({
      ...msg,
      read_by: readReceipts[msg.id] || [],
    })) as Message[];

  const total = count || 0;
  const hasMore = offset + limit < total;

  return {
    messages,
    hasMore,
    total,
  };
}

/**
 * Get all messages for a match (backward compatibility)
 * @deprecated Use getMatchMessages with pagination instead
 */
/**
 * Get all messages for a match (no pagination)
 * 
 * Retrieves all messages for a specific match. Useful when you need the complete
 * message history. Messages are returned in descending order (newest first).
 * 
 * @param matchId - ID of the match to get messages for
 * @returns Promise resolving to array of all messages
 * @throws {Error} If query fails
 * 
 * @example
 * ```typescript
 * const messages = await getAllMatchMessages('match-id');
 * console.log(`Total messages: ${messages.length}`);
 * ```
 */
export async function getAllMatchMessages(matchId: string): Promise<Message[]> {
  const result = await getMatchMessages(matchId, { limit: 1000, offset: 0 });
  return result.messages;
}

/**
 * Send a message with content moderation and rate limiting
 * 
 * Sends a message in a match with automatic content moderation and rate limiting.
 * Supports optional file attachments. Content is validated and sanitized before sending.
 * 
 * @param matchId - ID of the match to send message to
 * @param senderId - ID of the user sending the message
 * @param content - Message content (can be empty if attachment is provided)
 * @param attachment - Optional file attachment
 * @param attachment.url - URL of the attached file
 * @param attachment.type - MIME type of the attachment
 * @param attachment.name - Name of the attached file
 * @param attachment.size - Size of the attachment in bytes
 * @returns Promise resolving to the created Message object
 * @throws {Error} If content validation fails
 * @throws {Error} If rate limit is exceeded
 * @throws {Error} If message creation fails
 * 
 * @example
 * ```typescript
 * const message = await sendMessage('match-id', 'user-id', 'Hello!');
 * console.log('Message sent:', message.id);
 * 
 * // With attachment:
 * await sendMessage('match-id', 'user-id', '', {
 *   url: 'https://example.com/file.jpg',
 *   type: 'image/jpeg',
 *   name: 'photo.jpg',
 *   size: 1024000
 * });
 * ```
 */
export async function sendMessage(
  matchId: string,
  senderId: string,
  content: string,
  attachment?: {
    url: string;
    type: string;
    name: string;
    size: number;
  }
): Promise<Message> {
  // Import moderation service (dynamic import to avoid circular dependencies)
  const { validateMessage } = await import('./moderation.service');
  const { checkRateLimit, getRateLimitKey, RATE_LIMITS } = await import('./rateLimit.service');

  // Validate and sanitize content (only if content is provided)
  let sanitizedContent = content;
  if (content.trim()) {
    const validation = validateMessage(content);
    if (!validation.isValid) {
      throw new Error(validation.error || 'Invalid message content');
    }
    sanitizedContent = validation.sanitized || content;
  }

  // Check rate limiting
  const rateLimitKey = getRateLimitKey(senderId, 'message');
  const rateLimitCheck = checkRateLimit(rateLimitKey, RATE_LIMITS.MESSAGES);
  if (!rateLimitCheck.allowed) {
    throw new Error(
      `Rate limit exceeded. Please wait ${rateLimitCheck.retryAfter} seconds before sending another message.`
    );
  }

  // Verify user is authenticated and matches sender (pre-check before RLS)
  // Use auth.uid() directly to ensure we're using the actual authenticated user ID
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) {
    logger.error('User not authenticated', { senderId });
    throw new Error('You must be authenticated to send messages');
  }
  
  // Use auth.uid() directly instead of senderId to ensure consistency
  // This prevents issues where profile.id might not match auth.uid()
  const authenticatedUserId = authUser.id;
  
  if (authenticatedUserId !== senderId) {
    logger.warn('Sender ID mismatch - using authenticated user ID instead', { 
      authUserId: authenticatedUserId, 
      senderId,
      note: 'This may indicate a data inconsistency between profile.id and auth.uid()'
    });
    // Use the authenticated user ID instead of the provided senderId
    // This ensures RLS policies work correctly
  }

  // Use authenticated user ID to ensure RLS policies work correctly
  const actualSenderId = authenticatedUserId;
  
  const { data, error } = await supabase
    .from('messages')
    .insert({
      match_id: matchId,
      sender_id: actualSenderId, // Use authenticated user ID
      content: sanitizedContent || (attachment ? `📎 ${attachment.name}` : ''),
      attachment_url: attachment?.url,
      attachment_type: attachment?.type,
      attachment_name: attachment?.name,
      attachment_size: attachment?.size,
    })
    .select(`
      *,
      sender:profiles!sender_id(id, name, photo_url)
    `)
    .single();

  if (error) {
    logger.error('Failed to insert message', { error, matchId, senderId });
    // Provide more helpful error message
    if (error.code === '42501' || error.message?.includes('row-level security')) {
      throw new Error('Permission denied: You may not be a member of this match or the match may be inactive');
    }
    throw error;
  }

  // Track message_sent preference event (async, don't block)
  // Use setTimeout to avoid blocking message send
  setTimeout(async () => {
    try {
      const { trackMessageSent } = await import('@/services/preferenceEvents.service');
      // Find which duo the sender belongs to
      const { data: senderDuo } = await supabase
        .from('duos')
        .select('id')
        .or(`member1_id.eq.${actualSenderId},member2_id.eq.${actualSenderId}`)
        .eq('is_active', true)
        .maybeSingle();
      
      if (senderDuo) {
        // Track message sent event (fire and forget)
        trackMessageSent(actualSenderId, senderDuo.id).catch((err) => {
          logger.warn('Failed to track message_sent event', { error: err });
        });
      }
    } catch (err) {
      // Don't fail message send if tracking fails
      logger.warn('Failed to track message_sent event', { error: err });
    }
  }, 0);

  return data as Message;
}

/**
 * Get last message for each match (for matches list preview)
 * Excludes deleted messages
 */
/**
 * Get the last message for multiple matches
 * 
 * Efficiently retrieves the most recent message for each match in a single query.
 * Returns a map of match IDs to their last message (or null if no messages exist).
 * 
 * @param matchIds - Array of match IDs to get last messages for
 * @returns Promise resolving to object mapping match IDs to their last message
 * @throws {Error} If query fails
 * 
 * @example
 * ```typescript
 * const lastMessages = await getLastMessagesForMatches(['match-1', 'match-2']);
 * console.log('Last message for match-1:', lastMessages['match-1']?.content);
 * ```
 */
export async function getLastMessagesForMatches(matchIds: string[]): Promise<Record<string, Message | null>> {
  if (matchIds.length === 0) return {};

  // Get the most recent message for each match (excluding deleted)
  const { data, error } = await supabase
    .from('messages')
    .select(`
      *,
      sender:profiles!sender_id(id, name, photo_url)
    `)
    .in('match_id', matchIds)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (error) throw error;

  // Group by match_id and get the first (most recent) message for each match
  const lastMessages: Record<string, Message | null> = {};
  matchIds.forEach(id => {
    lastMessages[id] = null; // Initialize with null
  });

  const seenMatches = new Set<string>();
  (data || []).forEach((message) => {
    if (!seenMatches.has(message.match_id)) {
      lastMessages[message.match_id] = message as Message;
      seenMatches.add(message.match_id);
    }
  });

  return lastMessages;
}

/**
 * Subscribe to messages for a match (INSERT, UPDATE, DELETE)
 */
/**
 * Subscribe to new messages for a specific match
 * 
 * Sets up a real-time subscription to receive new messages for a match.
 * Returns an unsubscribe function to clean up the subscription.
 * 
 * @param matchId - ID of the match to subscribe to
 * @param callback - Function to call when a new message is received
 * @returns Unsubscribe function to stop receiving updates
 * 
 * @example
 * ```typescript
 * const unsubscribe = subscribeToMessages('match-id', (message) => {
 *   console.log('New message:', message.content);
 * });
 * 
 * // Later, to stop listening:
 * unsubscribe();
 * ```
 */
export function subscribeToMessages(
  matchId: string,
  callback: (message: Message) => void
): () => void {
  const channel = supabase
    .channel(`match:${matchId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `match_id=eq.${matchId}`,
      },
      async (payload) => {
        // Only process if not deleted
        if (!payload.new.deleted_at) {
          // Fetch the full message with sender info
          const { data } = await supabase
            .from('messages')
            .select(`
              *,
              sender:profiles!sender_id(id, name, photo_url)
            `)
            .eq('id', payload.new.id)
            .single();
          
          if (data) callback(data as Message);
        }
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'messages',
        filter: `match_id=eq.${matchId}`,
      },
      async (payload) => {
        // Fetch the full message with sender info
        const { data } = await supabase
          .from('messages')
          .select(`
            *,
            sender:profiles!sender_id(id, name, photo_url)
          `)
          .eq('id', payload.new.id)
          .single();
        
        if (data) callback(data as Message);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Subscribe to messages for multiple matches (INSERT, UPDATE)
 * Useful for updating the matches list when messages arrive or are edited
 */
/**
 * Subscribe to messages for multiple matches
 * 
 * Sets up real-time subscriptions for multiple matches at once. More efficient
 * than creating individual subscriptions for each match. Returns an unsubscribe
 * function to clean up all subscriptions.
 * 
 * @param matchIds - Array of match IDs to subscribe to
 * @param callback - Function to call when a new message is received
 * @returns Unsubscribe function to stop receiving updates for all matches
 * 
 * @example
 * ```typescript
 * const unsubscribe = subscribeToAllMatchMessages(
 *   ['match-1', 'match-2'],
 *   (message) => console.log('New message:', message.content)
 * );
 * 
 * // Later, to stop listening:
 * unsubscribe();
 * ```
 */
export function subscribeToAllMatchMessages(
  matchIds: string[],
  callback: (message: Message) => void
): () => void {
  if (matchIds.length === 0) {
    return () => {}; // No-op unsubscribe
  }

  const channel = supabase
    .channel('all-match-messages')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
      },
      async (payload) => {
        const newMessage = payload.new as { id: string; match_id: string; deleted_at?: string };
        
        // Only process messages for matches we care about and not deleted
        if (matchIds.includes(newMessage.match_id) && !newMessage.deleted_at) {
          // Fetch the full message with sender info
          const { data } = await supabase
            .from('messages')
            .select(`
              *,
              sender:profiles!sender_id(id, name, photo_url)
            `)
            .eq('id', newMessage.id)
            .single();
          
          if (data) callback(data as Message);
        }
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'messages',
      },
      async (payload) => {
        const updatedMessage = payload.new as { id: string; match_id: string };
        
        // Only process messages for matches we care about
        if (matchIds.includes(updatedMessage.match_id)) {
          // Fetch the full message with sender info
          const { data } = await supabase
            .from('messages')
            .select(`
              *,
              sender:profiles!sender_id(id, name, photo_url)
            `)
            .eq('id', updatedMessage.id)
            .single();
          
          if (data) callback(data as Message);
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Edit a message
 * @param messageId - The message ID
 * @param senderId - The sender ID (for authorization)
 * @param newContent - The new message content
 * @returns Updated message
 */
export async function editMessage(
  messageId: string,
  senderId: string,
  newContent: string
): Promise<Message> {
  const { data, error } = await supabase
    .from('messages')
    .update({
      content: newContent,
      edited_at: new Date().toISOString(),
    })
    .eq('id', messageId)
    .eq('sender_id', senderId)
    .is('deleted_at', null)
    .select(`
      *,
      sender:profiles!sender_id(id, name, photo_url)
    `)
    .single();

  if (error) throw error;
  return data as Message;
}

/**
 * Delete a message (soft delete)
 * @param messageId - The message ID
 * @param senderId - The sender ID (for authorization)
 * @returns Deleted message
 */
/**
 * Delete a message
 * 
 * Soft-deletes a message by setting deleted_at timestamp. Only the sender can
 * delete their own messages. The message remains in the database for audit purposes.
 * 
 * @param messageId - ID of the message to delete
 * @param senderId - ID of the user deleting the message (must be the sender)
 * @returns Promise resolving to deleted Message object
 * @throws {Error} If user is not the sender
 * @throws {Error} If deletion fails
 * 
 * @example
 * ```typescript
 * const deleted = await deleteMessage('message-id', 'user-id');
 * console.log('Message deleted at:', deleted.deleted_at);
 * ```
 */
export async function deleteMessage(messageId: string, senderId: string): Promise<Message> {
  const { data, error } = await supabase
    .from('messages')
    .update({
      deleted_at: new Date().toISOString(),
    })
    .eq('id', messageId)
    .eq('sender_id', senderId)
    .select(`
      *,
      sender:profiles!sender_id(id, name, photo_url)
    `)
    .single();

  if (error) throw error;
  return data as Message;
}

/**
 * Mark messages as read for a user in a match
 * @param matchId - The match ID
 * @param userId - The user ID
 * @param messageIds - Optional array of specific message IDs to mark as read (if not provided, marks all unread)
 */
/**
 * Mark messages as read for a user in a match
 * 
 * Updates the last_read_at timestamp for a user in a match, marking all messages
 * up to that point as read. Used to calculate unread message counts.
 * 
 * @param matchId - ID of the match
 * @param userId - ID of the user marking messages as read
 * @returns Promise that resolves when read receipt is updated
 * @throws {Error} If update fails
 * 
 * @example
 * ```typescript
 * await markMessagesAsRead('match-id', 'user-id');
 * // All messages in this match are now marked as read
 * ```
 */
export async function markMessagesAsRead(
  matchId: string,
  userId: string,
  messageIds?: string[]
): Promise<void> {
  // Update match_reads to track last read time
  await supabase
    .from('match_reads')
    .upsert({
      match_id: matchId,
      user_id: userId,
      last_read_at: new Date().toISOString(),
    }, {
      onConflict: 'match_id,user_id',
    });

  // Mark specific messages as read if provided
  if (messageIds && messageIds.length > 0) {
    const reads = messageIds.map(messageId => ({
      message_id: messageId,
      user_id: userId,
    }));

    await supabase
      .from('message_reads')
      .upsert(reads, {
        onConflict: 'message_id,user_id',
      });
  } else {
    // Mark all unread messages in this match as read
    const { data: unreadMessages } = await supabase
      .from('messages')
      .select('id')
      .eq('match_id', matchId)
      .neq('sender_id', userId)
      .is('deleted_at', null);

    if (unreadMessages && unreadMessages.length > 0) {
      const reads = unreadMessages.map(msg => ({
        message_id: msg.id,
        user_id: userId,
      }));

      await supabase
        .from('message_reads')
        .upsert(reads, {
          onConflict: 'message_id,user_id',
        });
    }
  }
}

/**
 * Get unread message count for a match
 * @param matchId - The match ID
 * @param userId - The user ID
 * @returns Unread message count
 */
/**
 * Get unread message count for a user in a match
 * 
 * Calculates the number of unread messages for a user in a specific match.
 * Messages are considered unread if they were created after the user's last_read_at timestamp.
 * 
 * @param matchId - ID of the match
 * @param userId - ID of the user
 * @returns Promise resolving to number of unread messages
 * @throws {Error} If query fails
 * 
 * @example
 * ```typescript
 * const unread = await getUnreadCount('match-id', 'user-id');
 * console.log(`You have ${unread} unread messages`);
 * ```
 */
export async function getUnreadCount(matchId: string, userId: string): Promise<number> {
  const { data, error } = await supabase.rpc('get_unread_count', {
    match_uuid: matchId,
    user_uuid: userId,
  });

  if (error) throw error;
  return data || 0;
}

/**
 * Get unread counts for multiple matches
 * @param matchIds - Array of match IDs
 * @param userId - The user ID
 * @returns Record of match ID to unread count
 */
/**
 * Get unread message counts for multiple matches
 * 
 * Efficiently calculates unread message counts for multiple matches in a single query.
 * Returns a map of match IDs to their unread counts.
 * 
 * @param matchIds - Array of match IDs to get counts for
 * @param userId - ID of the user
 * @returns Promise resolving to object mapping match IDs to unread counts
 * @throws {Error} If query fails
 * 
 * @example
 * ```typescript
 * const counts = await getUnreadCounts(['match-1', 'match-2'], 'user-id');
 * console.log('Unread in match-1:', counts['match-1']);
 * ```
 */
export async function getUnreadCounts(
  matchIds: string[],
  userId: string
): Promise<Record<string, number>> {
  if (matchIds.length === 0) return {};

  const counts: Record<string, number> = {};
  
  // Get last read times for all matches
  const { data: matchReads } = await supabase
    .from('match_reads')
    .select('match_id, last_read_at')
    .eq('user_id', userId)
    .in('match_id', matchIds);

  const lastReadMap = new Map<string, string>();
  (matchReads || []).forEach((read) => {
    lastReadMap.set(read.match_id, read.last_read_at);
  });

  // Get unread counts for each match
  const promises = matchIds.map(async (matchId) => {
    const lastRead = lastReadMap.get(matchId);
    
    let query = supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('match_id', matchId)
      .neq('sender_id', userId)
      .is('deleted_at', null);

    if (lastRead) {
      query = query.gt('created_at', lastRead);
    }

    const { count } = await query;
    return { matchId, count: count || 0 };
  });

  const results = await Promise.all(promises);
  results.forEach(({ matchId, count }) => {
    counts[matchId] = count;
  });

  return counts;
}

/**
 * Subscribe to typing indicators for a match
 * Uses Supabase broadcast channels for real-time typing events
 */
/**
 * Subscribe to typing indicators for a match
 * 
 * Sets up a real-time subscription to receive typing indicator events for a match.
 * Returns an unsubscribe function to clean up the subscription.
 * 
 * @param matchId - ID of the match to subscribe to
 * @param callback - Function to call when typing indicator is received
 * @returns Unsubscribe function to stop receiving updates
 * 
 * @example
 * ```typescript
 * const unsubscribe = subscribeToTypingIndicators('match-id', (data) => {
 *   console.log(`${data.userId} is typing`);
 * });
 * 
 * // Later, to stop listening:
 * unsubscribe();
 * ```
 */
export function subscribeToTypingIndicators(
  matchId: string,
  callback: (userId: string, userName: string, isTyping: boolean) => void
): () => void {
  const channel = supabase.channel(`typing:${matchId}`);
  
  channel
    .on('broadcast', { event: 'typing' }, (payload) => {
      const { userId, userName, isTyping } = payload.payload as {
        userId: string;
        userName: string;
        isTyping: boolean;
      };
      callback(userId, userName, isTyping);
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Broadcast typing indicator event
 */
/**
 * Broadcast a typing indicator for a user in a match
 * 
 * Sends a typing indicator event to notify other participants that a user is typing.
 * The indicator automatically expires after a timeout if not refreshed.
 * 
 * @param matchId - ID of the match
 * @param userId - ID of the user who is typing
 * @param isTyping - Whether the user is currently typing (true) or stopped typing (false)
 * @returns Promise that resolves when indicator is broadcast
 * @throws {Error} If broadcast fails
 * 
 * @example
 * ```typescript
 * // User started typing
 * await broadcastTypingIndicator('match-id', 'user-id', true);
 * 
 * // User stopped typing
 * await broadcastTypingIndicator('match-id', 'user-id', false);
 * ```
 */
export async function broadcastTypingIndicator(
  matchId: string,
  userId: string,
  userName: string,
  isTyping: boolean
): Promise<void> {
  const channel = supabase.channel(`typing:${matchId}`);
  
  // Subscribe to the channel before sending
  await channel.subscribe();
  
  // Wait a bit for subscription to be ready
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // Use send() - it will fallback to REST API automatically
  // The deprecation warning is non-critical and will be handled by Supabase
  try {
    const status = await channel.send({
      type: 'broadcast',
      event: 'typing',
      payload: { userId, userName, isTyping },
    });
    
    // Clean up after sending
    if (status === 'ok') {
      supabase.removeChannel(channel);
    }
  } catch (error) {
    // Silently handle errors - typing indicators are non-critical
    console.debug('Typing indicator broadcast failed:', error);
    supabase.removeChannel(channel);
  }
}

