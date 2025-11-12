import { supabase } from '@/integrations/supabase/client';

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
    // Log error for debugging
    console.error('Error fetching messages:', error);
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
export async function getAllMatchMessages(matchId: string): Promise<Message[]> {
  const result = await getMatchMessages(matchId, { limit: 1000, offset: 0 });
  return result.messages;
}

/**
 * Send a message with content moderation and rate limiting
 * Supports optional file attachments
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

  const { data, error } = await supabase
    .from('messages')
    .insert({
      match_id: matchId,
      sender_id: senderId,
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

  if (error) throw error;
  return data as Message;
}

/**
 * Get last message for each match (for matches list preview)
 * Excludes deleted messages
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
  
  const status = await channel.send({
    type: 'broadcast',
    event: 'typing',
    payload: { userId, userName, isTyping },
  });
  
  // Clean up after sending
  if (status === 'ok') {
    supabase.removeChannel(channel);
  }
}

