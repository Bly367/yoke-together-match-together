import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';
import { retryWithBackoff } from '@/lib/utils';

/**
 * Preference event types
 */
export type PreferenceEventType =
  | 'like'
  | 'hard_like'
  | 'pass'
  | 'view'
  | 'photo_expand'
  | 'prompt_scroll'
  | 'message_sent'
  | 'match_success'
  | 'ghost_after_match';

/**
 * Preference event metadata
 */
export interface PreferenceEventMetadata {
  dwell_time_ms?: number;
  photo_index?: number;
  prompt_index?: number;
  [key: string]: unknown;
}

/**
 * Preference event record
 */
export interface PreferenceEvent {
  id: string;
  user_id: string;
  event_type: PreferenceEventType;
  target_duo_id: string | null;
  target_user_id: string | null;
  target_photo_id: string | null;
  target_prompt_id: string | null;
  metadata: PreferenceEventMetadata;
  created_at: string;
}

/**
 * Event weights for preference learning
 * Based on PRD section 5.3
 */
export const EVENT_WEIGHTS: Record<PreferenceEventType, number> = {
  like: 1.0,
  hard_like: 1.3,
  pass: -0.8,
  photo_expand: 0.4,
  view: 0.1, // Base view weight
  prompt_scroll: 0.3,
  message_sent: 2.0,
  match_success: 1.5,
  ghost_after_match: -1.0,
};

/**
 * Create a preference event
 * 
 * @param userId - User ID
 * @param eventType - Type of event
 * @param target - Target of the event (duo, user, photo, or prompt)
 * @param metadata - Additional metadata (dwell time, etc.)
 * @returns Promise resolving to created PreferenceEvent
 * @throws Error if creation fails
 * 
 * @example
 * ```typescript
 * await createPreferenceEvent(userId, 'like', { duo_id: duoId });
 * await createPreferenceEvent(userId, 'photo_expand', { photo_id: photoId }, { dwell_time_ms: 5000 });
 * ```
 */
export async function createPreferenceEvent(
  userId: string,
  eventType: PreferenceEventType,
  target: {
    duo_id?: string;
    user_id?: string;
    photo_id?: string;
    prompt_id?: string;
  },
  metadata: PreferenceEventMetadata = {}
): Promise<PreferenceEvent> {
  const eventData: {
    user_id: string;
    event_type: PreferenceEventType;
    target_duo_id?: string | null;
    target_user_id?: string | null;
    target_photo_id?: string | null;
    target_prompt_id?: string | null;
    metadata: PreferenceEventMetadata;
  } = {
    user_id: userId,
    event_type: eventType,
    target_duo_id: target.duo_id || null,
    target_user_id: target.user_id || null,
    target_photo_id: target.photo_id || null,
    target_prompt_id: target.prompt_id || null,
    metadata,
  };

  const { data, error } = await retryWithBackoff(async () => {
    return await supabase
      .from('preference_events')
      .insert(eventData)
      .select()
      .single();
  });

  if (error) {
    logger.error('Failed to create preference event', { error, userId, eventType });
    throw error;
  }

  return data;
}

/**
 * Track a like event
 */
export async function trackLike(userId: string, duoId: string): Promise<PreferenceEvent> {
  return createPreferenceEvent(userId, 'like', { duo_id: duoId });
}

/**
 * Track a hard like event (super like)
 */
export async function trackHardLike(userId: string, duoId: string): Promise<PreferenceEvent> {
  return createPreferenceEvent(userId, 'hard_like', { duo_id: duoId });
}

/**
 * Track a pass event
 */
export async function trackPass(userId: string, duoId: string): Promise<PreferenceEvent> {
  return createPreferenceEvent(userId, 'pass', { duo_id: duoId });
}

/**
 * Track a view event (profile viewed)
 */
export async function trackView(
  userId: string,
  duoId: string,
  dwellTimeMs?: number
): Promise<PreferenceEvent> {
  return createPreferenceEvent(
    userId,
    'view',
    { duo_id: duoId },
    dwellTimeMs ? { dwell_time_ms: dwellTimeMs } : {}
  );
}

/**
 * Track a photo expand event
 */
export async function trackPhotoExpand(
  userId: string,
  photoId: string,
  dwellTimeMs?: number,
  photoIndex?: number
): Promise<PreferenceEvent> {
  return createPreferenceEvent(
    userId,
    'photo_expand',
    { photo_id: photoId },
    {
      dwell_time_ms: dwellTimeMs,
      photo_index: photoIndex,
    }
  );
}

/**
 * Track a prompt scroll event (user read prompt answer)
 */
export async function trackPromptScroll(
  userId: string,
  promptId: string,
  dwellTimeMs?: number,
  promptIndex?: number
): Promise<PreferenceEvent> {
  return createPreferenceEvent(
    userId,
    'prompt_scroll',
    { prompt_id: promptId },
    {
      dwell_time_ms: dwellTimeMs,
      prompt_index: promptIndex,
    }
  );
}

/**
 * Track a message sent event (after match)
 */
export async function trackMessageSent(userId: string, duoId: string): Promise<PreferenceEvent> {
  return createPreferenceEvent(userId, 'message_sent', { duo_id: duoId });
}

/**
 * Track a match success event
 */
export async function trackMatchSuccess(userId: string, duoId: string): Promise<PreferenceEvent> {
  return createPreferenceEvent(userId, 'match_success', { duo_id: duoId });
}

/**
 * Track a ghost after match event (negative signal)
 */
export async function trackGhostAfterMatch(
  userId: string,
  duoId: string
): Promise<PreferenceEvent> {
  return createPreferenceEvent(userId, 'ghost_after_match', { duo_id: duoId });
}

/**
 * Get preference events for a user
 * 
 * @param userId - User ID
 * @param limit - Maximum number of events to return
 * @param eventTypes - Filter by event types (optional)
 * @returns Promise resolving to array of PreferenceEvent
 * @throws Error if query fails
 */
export async function getUserPreferenceEvents(
  userId: string,
  limit: number = 100,
  eventTypes?: PreferenceEventType[]
): Promise<PreferenceEvent[]> {
  let query = supabase
    .from('preference_events')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (eventTypes && eventTypes.length > 0) {
    query = query.in('event_type', eventTypes);
  }

  const { data, error } = await query;

  if (error) {
    logger.error('Failed to get user preference events', { error, userId });
    throw error;
  }

  return data || [];
}

/**
 * Get recent preference events for preference learning
 * 
 * @param userId - User ID
 * @param days - Number of days to look back (default: 30)
 * @returns Promise resolving to array of PreferenceEvent
 * @throws Error if query fails
 */
export async function getRecentPreferenceEvents(
  userId: string,
  days: number = 30
): Promise<PreferenceEvent[]> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  const { data, error } = await supabase
    .from('preference_events')
    .select('*')
    .eq('user_id', userId)
    .gte('created_at', cutoffDate.toISOString())
    .order('created_at', { ascending: false });

  if (error) {
    logger.error('Failed to get recent preference events', { error, userId });
    throw error;
  }

  return data || [];
}

