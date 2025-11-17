import { supabase } from '@/integrations/supabase/client';

/**
 * Private conversation type
 */
export interface PrivateConversation {
  id: string;
  user1_id: string;
  user2_id: string;
  created_at: string;
  updated_at: string;
  last_message_at?: string | null;
  user1?: {
    id: string;
    name: string;
    photo_url?: string;
  };
  user2?: {
    id: string;
    name: string;
    photo_url?: string;
  };
  last_message?: PrivateMessage | null;
  unread_count?: number;
}

/**
 * Private message type
 */
export interface PrivateMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  attachment_url?: string;
  attachment_type?: string;
  attachment_name?: string;
  attachment_size?: number;
  edited_at?: string;
  deleted_at?: string;
  created_at: string;
  sender?: {
    id: string;
    name: string;
    photo_url?: string;
  };
  read_by?: string[]; // Array of user IDs who have read this message
}

/**
 * Pagination options for private messages
 */
export interface PrivateMessagePaginationOptions {
  limit?: number;
  offset?: number;
}

/**
 * Paginated private messages response
 */
export interface PaginatedPrivateMessages {
  messages: PrivateMessage[];
  hasMore: boolean;
  total?: number;
}

/**
 * Check if two users have matched (through any match)
 * Users can only message people they've matched with
 */
export async function haveUsersMatched(user1Id: string, user2Id: string): Promise<boolean> {
  // Get all active duos for user1
  const { data: user1Duos, error: user1Error } = await supabase
    .from('duos')
    .select('id')
    .or(`member1_id.eq.${user1Id},member2_id.eq.${user1Id}`)
    .eq('is_active', true);

  if (user1Error) throw user1Error;
  if (!user1Duos || user1Duos.length === 0) return false;

  // Get all active duos for user2
  const { data: user2Duos, error: user2Error } = await supabase
    .from('duos')
    .select('id')
    .or(`member1_id.eq.${user2Id},member2_id.eq.${user2Id}`)
    .eq('is_active', true);

  if (user2Error) throw user2Error;
  if (!user2Duos || user2Duos.length === 0) return false;

  const user1DuoIds = user1Duos.map(d => d.id);
  const user2DuoIds = user2Duos.map(d => d.id);

  // Check if any of user1's duos have matched with any of user2's duos
  // A match exists if:
  // - duo1_id is in user1DuoIds AND duo2_id is in user2DuoIds, OR
  // - duo1_id is in user2DuoIds AND duo2_id is in user1DuoIds
  const { data: matches, error: matchesError } = await supabase
    .from('matches')
    .select('id')
    .or(`duo1_id.in.(${user1DuoIds.join(',')}),duo2_id.in.(${user1DuoIds.join(',')})`)
    .or(`duo1_id.in.(${user2DuoIds.join(',')}),duo2_id.in.(${user2DuoIds.join(',')})`)
    .eq('is_active', true)
    .limit(1);

  if (matchesError) throw matchesError;

  // If we found matches, verify they actually connect user1 and user2's duos
  if (!matches || matches.length === 0) return false;

  // Get the full match to verify it connects both users' duos
  const { data: fullMatches, error: fullMatchesError } = await supabase
    .from('matches')
    .select('duo1_id, duo2_id')
    .or(`duo1_id.in.(${user1DuoIds.join(',')}),duo2_id.in.(${user1DuoIds.join(',')})`)
    .or(`duo1_id.in.(${user2DuoIds.join(',')}),duo2_id.in.(${user2DuoIds.join(',')})`)
    .eq('is_active', true);

  if (fullMatchesError) throw fullMatchesError;

  // Check if any match has one duo from user1 and one duo from user2
  return (fullMatches || []).some(match => {
    const duo1FromUser1 = user1DuoIds.includes(match.duo1_id);
    const duo2FromUser1 = user1DuoIds.includes(match.duo2_id);
    const duo1FromUser2 = user2DuoIds.includes(match.duo1_id);
    const duo2FromUser2 = user2DuoIds.includes(match.duo2_id);
    
    return (duo1FromUser1 && duo2FromUser2) || (duo1FromUser2 && duo2FromUser1);
  });
}

/**
 * Create or get a private conversation between two users
 * Uses canonical ordering (user1_id < user2_id) to prevent duplicates
 * Validates that both users have matched
 */
export async function createPrivateConversation(
  user1Id: string,
  user2Id: string
): Promise<PrivateConversation> {
  // Validate that users have matched
  const matched = await haveUsersMatched(user1Id, user2Id);
  if (!matched) {
    throw new Error('Users must have matched before starting a private conversation');
  }

  // Canonical ordering: user1_id < user2_id
  const [canonicalUser1Id, canonicalUser2Id] = user1Id < user2Id 
    ? [user1Id, user2Id] 
    : [user2Id, user1Id];

  // Check if conversation already exists
  const { data: existing, error: checkError } = await supabase
    .from('private_conversations')
    .select(`
      *,
      user1:profiles!private_conversations_user1_id_fkey(id, name, photo_url),
      user2:profiles!private_conversations_user2_id_fkey(id, name, photo_url)
    `)
    .eq('user1_id', canonicalUser1Id)
    .eq('user2_id', canonicalUser2Id)
    .maybeSingle();

  if (checkError) throw checkError;
  if (existing) return existing as PrivateConversation;

  // Create new conversation
  const { data: conversation, error: createError } = await supabase
    .from('private_conversations')
    .insert({
      user1_id: canonicalUser1Id,
      user2_id: canonicalUser2Id,
    })
    .select(`
      *,
      user1:profiles!private_conversations_user1_id_fkey(id, name, photo_url),
      user2:profiles!private_conversations_user2_id_fkey(id, name, photo_url)
    `)
    .single();

  if (createError) throw createError;
  return conversation as PrivateConversation;
}

/**
 * Get a single private conversation by ID
 */
export async function getPrivateConversation(
  conversationId: string,
  userId: string
): Promise<PrivateConversation | null> {
  const { data: conversation, error } = await supabase
    .from('private_conversations')
    .select(`
      *,
      user1:profiles!private_conversations_user1_id_fkey(id, name, photo_url),
      user2:profiles!private_conversations_user2_id_fkey(id, name, photo_url)
    `)
    .eq('id', conversationId)
    .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
    .maybeSingle();

  if (error) throw error;
  if (!conversation) return null;

  // Get last message
  const { data: lastMessage } = await supabase
    .from('private_messages')
    .select(`
      *,
      sender:profiles!private_messages_sender_id_fkey(id, name, photo_url)
    `)
    .eq('conversation_id', conversationId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  // Get unread count
  const { data: conversationRead } = await supabase
    .from('private_conversation_reads')
    .select('last_read_at')
    .eq('conversation_id', conversationId)
    .eq('user_id', userId)
    .maybeSingle();

  const lastRead = conversationRead?.last_read_at;

  let query = supabase
    .from('private_messages')
    .select('id', { count: 'exact', head: true })
    .eq('conversation_id', conversationId)
    .neq('sender_id', userId)
    .is('deleted_at', null);

  if (lastRead) {
    query = query.gt('created_at', lastRead);
  }

  const { count } = await query;
  const unreadCount = count || 0;

  return {
    ...conversation,
    last_message: lastMessage as PrivateMessage | null,
    unread_count: unreadCount,
  } as PrivateConversation;
}

/**
 * Get all private conversations for a user
 * Sorted by last_message_at DESC (most recent first)
 */
export async function getPrivateConversations(userId: string): Promise<PrivateConversation[]> {
  const { data: conversations, error } = await supabase
    .from('private_conversations')
    .select(`
      *,
      user1:profiles!private_conversations_user1_id_fkey(id, name, photo_url),
      user2:profiles!private_conversations_user2_id_fkey(id, name, photo_url)
    `)
    .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
    .order('last_message_at', { ascending: false, nullsFirst: false })
    .order('updated_at', { ascending: false });

  if (error) throw error;

  // Get last message for each conversation
  const conversationIds = (conversations || []).map(c => c.id);
  const lastMessages: Record<string, PrivateMessage | null> = {};

  if (conversationIds.length > 0) {
    const { data: messages } = await supabase
      .from('private_messages')
      .select(`
        *,
        sender:profiles!private_messages_sender_id_fkey(id, name, photo_url)
      `)
      .in('conversation_id', conversationIds)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    // Group by conversation_id and get the first (most recent) message for each
    const seenConversations = new Set<string>();
    (messages || []).forEach((message) => {
      if (!seenConversations.has(message.conversation_id)) {
        lastMessages[message.conversation_id] = message as PrivateMessage;
        seenConversations.add(message.conversation_id);
      }
    });
  }

  // Get unread counts for each conversation
  const { data: conversationReads } = await supabase
    .from('private_conversation_reads')
    .select('conversation_id, last_read_at')
    .eq('user_id', userId)
    .in('conversation_id', conversationIds);

  const lastReadMap = new Map<string, string>();
  (conversationReads || []).forEach(cr => {
    lastReadMap.set(cr.conversation_id, cr.last_read_at);
  });

  // Calculate unread counts
  const unreadCounts: Record<string, number> = {};
  for (const conversationId of conversationIds) {
    const lastRead = lastReadMap.get(conversationId);
    
    let query = supabase
      .from('private_messages')
      .select('id', { count: 'exact', head: true })
      .eq('conversation_id', conversationId)
      .neq('sender_id', userId)
      .is('deleted_at', null);

    if (lastRead) {
      query = query.gt('created_at', lastRead);
    }

    const { count } = await query;
    unreadCounts[conversationId] = count || 0;
  }

  // Add last message and unread count to each conversation
  return (conversations || []).map(conv => ({
    ...conv,
    last_message: lastMessages[conv.id] || null,
    unread_count: unreadCounts[conv.id] || 0,
  })) as PrivateConversation[];
}

/**
 * Get private messages for a conversation with pagination
 */
export async function getPrivateMessages(
  conversationId: string,
  options: PrivateMessagePaginationOptions = {}
): Promise<PaginatedPrivateMessages> {
  const { limit = 50, offset = 0 } = options;

  // Get total count (excluding deleted messages)
  const { count } = await supabase
    .from('private_messages')
    .select('*', { count: 'exact', head: true })
    .eq('conversation_id', conversationId)
    .is('deleted_at', null);

  // Get messages with pagination (excluding deleted)
  const { data, error } = await supabase
    .from('private_messages')
    .select(`
      *,
      sender:profiles!private_messages_sender_id_fkey(id, name, photo_url)
    `)
    .eq('conversation_id', conversationId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;

  // Get read receipts for these messages
  const messageIds = (data || []).map(m => m.id);
  const readReceipts: Record<string, string[]> = {};

  if (messageIds.length > 0) {
    const { data: reads } = await supabase
      .from('private_message_reads')
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
    })) as PrivateMessage[];

  const total = count || 0;
  const hasMore = offset + limit < total;

  return {
    messages,
    hasMore,
    total,
  };
}

/**
 * Send a private message with content moderation and rate limiting
 */
export async function sendPrivateMessage(
  conversationId: string,
  senderId: string,
  recipientId: string,
  content: string,
  attachment?: {
    url: string;
    type: string;
    name: string;
    size: number;
  }
): Promise<PrivateMessage> {
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
    .from('private_messages')
    .insert({
      conversation_id: conversationId,
      sender_id: senderId,
      recipient_id: recipientId,
      content: sanitizedContent || (attachment ? `📎 ${attachment.name}` : ''),
      attachment_url: attachment?.url,
      attachment_type: attachment?.type,
      attachment_name: attachment?.name,
      attachment_size: attachment?.size,
    })
    .select(`
      *,
      sender:profiles!private_messages_sender_id_fkey(id, name, photo_url)
    `)
    .single();

  if (error) throw error;
  return data as PrivateMessage;
}

/**
 * Edit a private message
 */
export async function editPrivateMessage(
  messageId: string,
  senderId: string,
  newContent: string
): Promise<PrivateMessage> {
  const { data, error } = await supabase
    .from('private_messages')
    .update({
      content: newContent,
      edited_at: new Date().toISOString(),
    })
    .eq('id', messageId)
    .eq('sender_id', senderId)
    .is('deleted_at', null)
    .select(`
      *,
      sender:profiles!private_messages_sender_id_fkey(id, name, photo_url)
    `)
    .single();

  if (error) throw error;
  return data as PrivateMessage;
}

/**
 * Delete a private message (soft delete)
 */
export async function deletePrivateMessage(
  messageId: string,
  senderId: string
): Promise<PrivateMessage> {
  const { data, error } = await supabase
    .from('private_messages')
    .update({
      deleted_at: new Date().toISOString(),
    })
    .eq('id', messageId)
    .eq('sender_id', senderId)
    .select(`
      *,
      sender:profiles!private_messages_sender_id_fkey(id, name, photo_url)
    `)
    .single();

  if (error) throw error;
  return data as PrivateMessage;
}

/**
 * Mark private messages as read for a user in a conversation
 */
export async function markPrivateMessagesAsRead(
  conversationId: string,
  userId: string,
  messageIds?: string[]
): Promise<void> {
  // Update conversation_reads to track last read time
  await supabase
    .from('private_conversation_reads')
    .upsert({
      conversation_id: conversationId,
      user_id: userId,
      last_read_at: new Date().toISOString(),
    }, {
      onConflict: 'conversation_id,user_id',
    });

  // Mark specific messages as read if provided
  if (messageIds && messageIds.length > 0) {
    const reads = messageIds.map(messageId => ({
      message_id: messageId,
      user_id: userId,
    }));

    await supabase
      .from('private_message_reads')
      .upsert(reads, {
        onConflict: 'message_id,user_id',
      });
  } else {
    // Mark all unread messages in this conversation as read
    const { data: unreadMessages } = await supabase
      .from('private_messages')
      .select('id')
      .eq('conversation_id', conversationId)
      .neq('sender_id', userId)
      .is('deleted_at', null);

    if (unreadMessages && unreadMessages.length > 0) {
      const reads = unreadMessages.map(msg => ({
        message_id: msg.id,
        user_id: userId,
      }));

      await supabase
        .from('private_message_reads')
        .upsert(reads, {
          onConflict: 'message_id,user_id',
        });
    }
  }
}

/**
 * Get unread private message count for a conversation
 */
export async function getUnreadPrivateMessageCount(
  conversationId: string,
  userId: string
): Promise<number> {
  // Get last read time for this conversation
  const { data: conversationRead } = await supabase
    .from('private_conversation_reads')
    .select('last_read_at')
    .eq('conversation_id', conversationId)
    .eq('user_id', userId)
    .maybeSingle();

  const lastRead = conversationRead?.last_read_at;

  let query = supabase
    .from('private_messages')
    .select('id', { count: 'exact', head: true })
    .eq('conversation_id', conversationId)
    .neq('sender_id', userId)
    .is('deleted_at', null);

  if (lastRead) {
    query = query.gt('created_at', lastRead);
  }

  const { count } = await query;
  return count || 0;
}

/**
 * Subscribe to private messages for a conversation (INSERT, UPDATE)
 */
export function subscribeToPrivateMessages(
  conversationId: string,
  callback: (message: PrivateMessage) => void
): () => void {
  const channel = supabase
    .channel(`private_conversation:${conversationId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'private_messages',
        filter: `conversation_id=eq.${conversationId}`,
      },
      async (payload) => {
        // Only process if not deleted
        if (!payload.new.deleted_at) {
          // Fetch the full message with sender info
          const { data } = await supabase
            .from('private_messages')
            .select(`
              *,
              sender:profiles!private_messages_sender_id_fkey(id, name, photo_url)
            `)
            .eq('id', payload.new.id)
            .single();

          if (data) callback(data as PrivateMessage);
        }
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'private_messages',
        filter: `conversation_id=eq.${conversationId}`,
      },
      async (payload) => {
        // Fetch the full message with sender info
        const { data } = await supabase
          .from('private_messages')
          .select(`
            *,
            sender:profiles!private_messages_sender_id_fkey(id, name, photo_url)
          `)
          .eq('id', payload.new.id)
          .single();

        if (data) callback(data as PrivateMessage);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Subscribe to private conversations for a user (for conversation list updates)
 */
export function subscribeToPrivateConversations(
  userId: string,
  callback: (conversation: PrivateConversation) => void
): () => void {
  const channel = supabase
    .channel(`private_conversations:${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'private_conversations',
      },
      async (payload) => {
        const conversation = payload.new as { user1_id: string; user2_id: string };
        
        // Only process if user is a participant
        if (conversation.user1_id === userId || conversation.user2_id === userId) {
          // Fetch the full conversation with user info
          const { data } = await supabase
            .from('private_conversations')
            .select(`
              *,
              user1:profiles!private_conversations_user1_id_fkey(id, name, photo_url),
              user2:profiles!private_conversations_user2_id_fkey(id, name, photo_url)
            `)
            .eq('id', payload.new.id)
            .single();

          if (data) callback(data as PrivateConversation);
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Broadcast typing indicator for a private conversation
 */
export async function broadcastPrivateTypingIndicator(
  conversationId: string,
  userId: string,
  userName: string,
  isTyping: boolean
): Promise<void> {
  const channel = supabase.channel(`private_typing:${conversationId}`);

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

/**
 * Rename a private conversation
 * Note: RLS policies ensure only participants can update conversations
 */
export async function renamePrivateConversation(
  conversationId: string,
  name: string
): Promise<PrivateConversation> {
  // Validate name length
  const trimmedName = name.trim();
  if (trimmedName.length > 50) {
    throw new Error('Chat name must be 50 characters or less');
  }

  const { data, error } = await supabase
    .from('private_conversations')
    .update({ name: trimmedName || null })
    .eq('id', conversationId)
    .select(`
      *,
      user1:profiles!private_conversations_user1_id_fkey(id, name, photo_url),
      user2:profiles!private_conversations_user2_id_fkey(id, name, photo_url)
    `)
    .single();

  if (error) throw error;
  if (!data) throw new Error('Conversation not found or you do not have permission to rename it');
  return data as PrivateConversation;
}

/**
 * Leave a private conversation (mark user as having left)
 */
export async function leavePrivateConversation(
  conversationId: string,
  userId: string
): Promise<void> {
  // Verify user is a participant
  const { data: conversation } = await supabase
    .from('private_conversations')
    .select('user1_id, user2_id')
    .eq('id', conversationId)
    .single();

  if (!conversation) {
    throw new Error('Conversation not found');
  }

  if (conversation.user1_id !== userId && conversation.user2_id !== userId) {
    throw new Error('User is not a participant in this conversation');
  }

  // Mark user as having left
  const { error } = await supabase
    .from('private_conversation_participants')
    .upsert({
      conversation_id: conversationId,
      user_id: userId,
      left_at: new Date().toISOString(),
    }, {
      onConflict: 'conversation_id,user_id',
    });

  if (error) throw error;
}

/**
 * Subscribe to typing indicators for a private conversation
 */
export function subscribeToPrivateTypingIndicators(
  conversationId: string,
  callback: (userId: string, userName: string, isTyping: boolean) => void
): () => void {
  const channel = supabase.channel(`private_typing:${conversationId}`);

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

