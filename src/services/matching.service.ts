import { supabase } from '@/integrations/supabase/client';
import type { DuoWithMembers } from './duo.service';

/**
 * Swipe action type
 */
export type SwipeAction = 'like' | 'pass';

/**
 * Swipe record
 */
export interface Swipe {
  id: string;
  swiper_duo_id: string;
  swiped_duo_id: string;
  action: SwipeAction;
  created_at: string;
}

/**
 * Match record
 */
export interface Match {
  id: string;
  duo1_id: string;
  duo2_id: string;
  matched_at: string;
  is_active: boolean;
  last_message_at?: string | null;
  unread_count?: number;
  duo1?: DuoWithMembers;
  duo2?: DuoWithMembers;
}

/**
 * Swipe on a duo with rate limiting
 */
export async function swipeOnDuo(swiperDuoId: string, swipedDuoId: string, action: SwipeAction): Promise<Swipe> {
  // Import rate limiting service (dynamic import to avoid circular dependencies)
  const { checkRateLimit, getRateLimitKey, RATE_LIMITS } = await import('./rateLimit.service');

  // Get user ID from duo (for rate limiting)
  // Note: This is a simplified approach - in production, pass userId directly
  const { data: duo } = await supabase
    .from('duos')
    .select('member1_id, member2_id')
    .eq('id', swiperDuoId)
    .single();

  if (duo) {
    // Use member1_id for rate limiting (could use either member)
    const userId = duo.member1_id;
    const rateLimitKey = getRateLimitKey(userId, 'swipe');
    const rateLimitCheck = checkRateLimit(rateLimitKey, RATE_LIMITS.SWIPES);
    if (!rateLimitCheck.allowed) {
      throw new Error(
        `Rate limit exceeded. Please wait ${rateLimitCheck.retryAfter} seconds before swiping again.`
      );
    }
  }

  const { data, error } = await supabase
    .from('swipes')
    .insert({
      swiper_duo_id: swiperDuoId,
      swiped_duo_id: swipedDuoId,
      action,
    })
    .select()
    .single();

  if (error) {
    // If duplicate swipe, update existing
    if (error.code === '23505') {
      const { data: updated, error: updateError } = await supabase
        .from('swipes')
        .update({ action })
        .eq('swiper_duo_id', swiperDuoId)
        .eq('swiped_duo_id', swipedDuoId)
        .select()
        .single();

      if (updateError) throw updateError;
      return updated;
    }
    throw error;
  }
  return data;
}

/**
 * Get matches for a user's duos
 * Optimized: Single query using OR condition instead of two separate queries
 */
export async function getUserMatches(userId: string): Promise<Match[]> {
  // Get user's duos
  const { data: userDuos, error: duosError } = await supabase
    .from('duos')
    .select('id')
    .or(`member1_id.eq.${userId},member2_id.eq.${userId}`)
    .eq('is_active', true);

  if (duosError) throw duosError;
  if (!userDuos || userDuos.length === 0) return [];

  const duoIds = userDuos.map(d => d.id);

  // Optimized: Single query using OR condition to get matches where user's duo is either duo1 or duo2
  // Build OR filter: duo1_id.in.(id1,id2,...),duo2_id.in.(id1,id2,...)
  const orFilter = duoIds.length > 0 
    ? `duo1_id.in.(${duoIds.join(',')}),duo2_id.in.(${duoIds.join(',')})`
    : 'id.eq.00000000-0000-0000-0000-000000000000'; // Fallback that will return no results

  const selectQuery = `
    *,
    duo1:duos!matches_duo1_id_fkey(
      *,
      member1:profiles!duos_member1_id_fkey(id, name, age, photo_url, gender, preference),
      member2:profiles!duos_member2_id_fkey(id, name, age, photo_url, gender, preference)
    ),
    duo2:duos!matches_duo2_id_fkey(
      *,
      member1:profiles!duos_member1_id_fkey(id, name, age, photo_url, gender, preference),
      member2:profiles!duos_member2_id_fkey(id, name, age, photo_url, gender, preference)
    )
  `;

  // Try single query with OR first
  let { data: matches, error } = await supabase
    .from('matches')
    .select(selectQuery)
    .or(orFilter)
    .eq('is_active', true)
    .order('matched_at', { ascending: false });

  // Fallback to two queries if OR doesn't work (shouldn't happen, but just in case)
  if (error && error.code === 'PGRST100') {
    const { data: matches1, error: error1 } = await supabase
      .from('matches')
      .select(selectQuery)
      .in('duo1_id', duoIds)
      .eq('is_active', true)
      .order('matched_at', { ascending: false });

    const { data: matches2, error: error2 } = await supabase
      .from('matches')
      .select(selectQuery)
      .in('duo2_id', duoIds)
      .eq('is_active', true)
      .order('matched_at', { ascending: false });

    if (error1) throw error1;
    if (error2) throw error2;

    // Combine and deduplicate
    const allMatches = [...(matches1 || []), ...(matches2 || [])];
    matches = allMatches.filter((match, index, self) =>
      index === self.findIndex(m => m.id === match.id)
    );
  } else if (error) {
    throw error;
  }
  if (!matches || matches.length === 0) return [];

  // Get last message and unread count for all matches using read receipts system
  const matchIds = matches.map(m => m.id);
  
  // Get last message for each match
  const { data: messages } = await supabase
    .from('messages')
    .select('match_id, created_at, id, sender_id')
    .in('match_id', matchIds)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  // Get last read time for each match for this user
  const { data: matchReads } = await supabase
    .from('match_reads')
    .select('match_id, last_read_at')
    .in('match_id', matchIds)
    .eq('user_id', userId);

  // Create a map of last read times
  const lastReadMap = new Map<string, string>();
  (matchReads || []).forEach(mr => {
    lastReadMap.set(mr.match_id, mr.last_read_at);
  });

  // Calculate last_message_at and unread_count for each match
  const matchMetadata: Record<string, { last_message_at: string | null; unread_count: number }> = {};
  
  // Initialize all matches with default values
  matchIds.forEach(matchId => {
    matchMetadata[matchId] = {
      last_message_at: null,
      unread_count: 0,
    };
  });

  // Process messages to get last_message_at
  const seenMatches = new Set<string>();
  (messages || []).forEach(msg => {
    if (!matchMetadata[msg.match_id]) {
      matchMetadata[msg.match_id] = {
        last_message_at: null,
        unread_count: 0,
      };
    }
    
    // Set last_message_at on first encounter (since messages are ordered DESC)
    if (!seenMatches.has(msg.match_id)) {
      matchMetadata[msg.match_id].last_message_at = msg.created_at;
      seenMatches.add(msg.match_id);
    }
  });

  // Calculate unread count using read receipts
  // Count messages that:
  // 1. Are not sent by the user
  // 2. Were created after the last read time (or if no last read time, count all)
  (messages || []).forEach(msg => {
    // Skip if message is from the user
    if (msg.sender_id === userId) return;
    
    const matchLastRead = lastReadMap.get(msg.match_id);
    if (!matchLastRead) {
      // No read record, count as unread
      matchMetadata[msg.match_id].unread_count += 1;
    } else {
      // Count if message was created after last read time
      if (new Date(msg.created_at) > new Date(matchLastRead)) {
        matchMetadata[msg.match_id].unread_count += 1;
      }
    }
  });

  // Enrich matches with metadata
  const enrichedMatches = matches.map(match => ({
    ...match,
    last_message_at: matchMetadata[match.id]?.last_message_at || null,
    unread_count: matchMetadata[match.id]?.unread_count || 0,
  }));

  return enrichedMatches as Match[];
}

/**
 * Get swiped duo IDs for a duo
 */
export async function getSwipedDuoIds(duoId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('swipes')
    .select('swiped_duo_id')
    .eq('swiper_duo_id', duoId);

  if (error) throw error;
  return (data || []).map(s => s.swiped_duo_id);
}

/**
 * Undo a swipe (delete the swipe record)
 */
export async function undoSwipe(swiperDuoId: string, swipedDuoId: string): Promise<void> {
  const { error } = await supabase
    .from('swipes')
    .delete()
    .eq('swiper_duo_id', swiperDuoId)
    .eq('swiped_duo_id', swipedDuoId);

  if (error) throw error;
}

/**
 * Check if two duos have matched with retry logic
 * Uses exponential backoff to handle race conditions when match is created by trigger
 */
export async function checkMatch(
  duo1Id: string,
  duo2Id: string,
  maxRetries: number = 5,
  initialDelay: number = 100
): Promise<Match | null> {
  // Normalize duo IDs to canonical order (same as trigger uses)
  const normalizedDuo1Id = duo1Id < duo2Id ? duo1Id : duo2Id;
  const normalizedDuo2Id = duo1Id < duo2Id ? duo2Id : duo1Id;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const { data: match, error } = await supabase
      .from('matches')
      .select(`
        *,
        duo1:duos!matches_duo1_id_fkey(
          *,
          member1:profiles!duos_member1_id_fkey(id, name, age, photo_url, gender, preference),
          member2:profiles!duos_member2_id_fkey(id, name, age, photo_url, gender, preference)
        ),
        duo2:duos!matches_duo2_id_fkey(
          *,
          member1:profiles!duos_member1_id_fkey(id, name, age, photo_url, gender, preference),
          member2:profiles!duos_member2_id_fkey(id, name, age, photo_url, gender, preference)
        )
      `)
      .eq('duo1_id', normalizedDuo1Id)
      .eq('duo2_id', normalizedDuo2Id)
      .eq('is_active', true)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') throw error;
    if (match) return match as Match;

    // If no match found and not the last attempt, wait before retrying
    if (attempt < maxRetries - 1) {
      const delay = initialDelay * Math.pow(2, attempt); // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  return null;
}

/**
 * Unmatch (deactivate) a match
 */
export async function unmatch(matchId: string): Promise<void> {
  const { error } = await supabase
    .from('matches')
    .update({ is_active: false })
    .eq('id', matchId);
  
  if (error) throw error;
}

/**
 * Rename a match/group chat
 * Note: RLS policies ensure only participants can update matches
 */
export async function renameMatch(matchId: string, name: string): Promise<Match> {
  // Validate name length
  const trimmedName = name.trim();
  if (trimmedName.length > 50) {
    throw new Error('Chat name must be 50 characters or less');
  }

  const { data, error } = await supabase
    .from('matches')
    .update({ name: trimmedName || null })
    .eq('id', matchId)
    .select(`
      *,
      duo1:duos!matches_duo1_id_fkey(
        *,
        member1:profiles!duos_member1_id_fkey(id, name, age, photo_url, gender, preference),
        member2:profiles!duos_member2_id_fkey(id, name, age, photo_url, gender, preference)
      ),
      duo2:duos!matches_duo2_id_fkey(
        *,
        member1:profiles!duos_member1_id_fkey(id, name, age, photo_url, gender, preference),
        member2:profiles!duos_member2_id_fkey(id, name, age, photo_url, gender, preference)
      )
    `)
    .single();

  if (error) throw error;
  if (!data) throw new Error('Match not found or you do not have permission to rename it');
  return data as Match;
}

/**
 * Leave a match (mark user as having left)
 */
export async function leaveMatch(matchId: string, userId: string): Promise<void> {
  // Get user's duos to find which duo they're in
  const { data: userDuos } = await supabase
    .from('duos')
    .select('id')
    .or(`member1_id.eq.${userId},member2_id.eq.${userId}`)
    .eq('is_active', true);

  if (!userDuos || userDuos.length === 0) {
    throw new Error('User is not part of any active duo');
  }

  // Get the match to verify user is a participant
  const { data: match } = await supabase
    .from('matches')
    .select('duo1_id, duo2_id')
    .eq('id', matchId)
    .eq('is_active', true)
    .single();

  if (!match) {
    throw new Error('Match not found');
  }

  const userDuoIds = userDuos.map(d => d.id);
  const isParticipant = userDuoIds.includes(match.duo1_id) || userDuoIds.includes(match.duo2_id);

  if (!isParticipant) {
    throw new Error('User is not a participant in this match');
  }

  // Mark user as having left
  const { error } = await supabase
    .from('match_participants')
    .upsert({
      match_id: matchId,
      user_id: userId,
      left_at: new Date().toISOString(),
    }, {
      onConflict: 'match_id,user_id',
    });

  if (error) throw error;
}

/**
 * Subscribe to new matches for a user's duos
 */
export function subscribeToMatches(
  userId: string,
  callback: (match: Match) => void
): () => void {
  const channel = supabase
    .channel(`user-matches:${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'matches',
      },
      async (payload) => {
        const newMatch = payload.new as { id: string; duo1_id: string; duo2_id: string };
        
        // Check if this match involves one of the user's duos
        const { data: userDuos } = await supabase
          .from('duos')
          .select('id')
          .or(`member1_id.eq.${userId},member2_id.eq.${userId}`)
          .eq('is_active', true);

        if (!userDuos || userDuos.length === 0) return;

        const userDuoIds = userDuos.map(d => d.id);
        const isUserMatch = userDuoIds.includes(newMatch.duo1_id) || userDuoIds.includes(newMatch.duo2_id);

        if (isUserMatch) {
          // Fetch the full match with duo details
          const { data: match } = await supabase
            .from('matches')
            .select(`
              *,
              duo1:duos!matches_duo1_id_fkey(
                *,
                member1:profiles!duos_member1_id_fkey(id, name, age, photo_url, gender, preference),
                member2:profiles!duos_member2_id_fkey(id, name, age, photo_url, gender, preference)
              ),
              duo2:duos!matches_duo2_id_fkey(
                *,
                member1:profiles!duos_member1_id_fkey(id, name, age, photo_url, gender, preference),
                member2:profiles!duos_member2_id_fkey(id, name, age, photo_url, gender, preference)
              )
            `)
            .eq('id', newMatch.id)
            .single();

          if (match) callback(match as Match);
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

