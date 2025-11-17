import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

/**
 * Analytics service for preference learning metrics
 */

export interface PreferenceAnalytics {
  totalEvents: number;
  eventsByType: Record<string, number>;
  averageDwellTime: number;
  topLikedPhotos: Array<{ photoId: string; likeCount: number }>;
  topLikedPrompts: Array<{ promptId: string; likeCount: number }>;
  embeddingCoverage: {
    photosWithEmbeddings: number;
    promptsWithEmbeddings: number;
    totalPhotos: number;
    totalPrompts: number;
  };
  userEngagement: {
    activeUsers: number;
    averageEventsPerUser: number;
  };
}

/**
 * Get analytics for preference learning system
 * 
 * @param userId - Optional user ID to get user-specific analytics
 * @param days - Number of days to look back (default: 30)
 * @returns Promise resolving to PreferenceAnalytics
 */
export async function getPreferenceAnalytics(
  userId?: string,
  days: number = 30
): Promise<PreferenceAnalytics> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  // Get total events
  let eventsQuery = supabase
    .from('preference_events')
    .select('event_type, metadata, created_at')
    .gte('created_at', cutoffDate.toISOString());

  if (userId) {
    eventsQuery = eventsQuery.eq('user_id', userId);
  }

  const { data: events = [], error: eventsError } = await eventsQuery;
  
  if (eventsError) {
    logger.error('Failed to fetch preference events', { error: eventsError });
    // Return empty analytics on error
    return {
      totalEvents: 0,
      eventsByType: {},
      averageDwellTime: 0,
      topLikedPhotos: [],
      topLikedPrompts: [],
      embeddingCoverage: {
        photosWithEmbeddings: 0,
        promptsWithEmbeddings: 0,
        totalPhotos: 0,
        totalPrompts: 0,
      },
      userEngagement: {
        activeUsers: 0,
        averageEventsPerUser: 0,
      },
    };
  }

  // Count events by type
  const eventsByType: Record<string, number> = {};
  let totalDwellTime = 0;
  let dwellTimeCount = 0;

  events.forEach((event) => {
    eventsByType[event.event_type] = (eventsByType[event.event_type] || 0) + 1;
    
    const dwellTime = (event.metadata as { dwell_time_ms?: number })?.dwell_time_ms;
    if (dwellTime) {
      totalDwellTime += dwellTime;
      dwellTimeCount++;
    }
  });

  // Get photo like counts
  const { data: photoLikes = [], error: photoLikesError } = await supabase
    .from('preference_events')
    .select('target_photo_id')
    .eq('event_type', 'like')
    .not('target_photo_id', 'is', null)
    .gte('created_at', cutoffDate.toISOString());

  if (photoLikesError) {
    logger.error('Failed to fetch photo likes', { error: photoLikesError });
  }

  const photoLikeCounts: Record<string, number> = {};
  photoLikes.forEach((like) => {
    if (like.target_photo_id) {
      photoLikeCounts[like.target_photo_id] = (photoLikeCounts[like.target_photo_id] || 0) + 1;
    }
  });

  const topLikedPhotos = Object.entries(photoLikeCounts)
    .map(([photoId, likeCount]) => ({ photoId, likeCount }))
    .sort((a, b) => b.likeCount - a.likeCount)
    .slice(0, 10);

  // Get prompt like counts
  const { data: promptLikes = [], error: promptLikesError } = await supabase
    .from('preference_events')
    .select('target_prompt_id')
    .eq('event_type', 'like')
    .not('target_prompt_id', 'is', null)
    .gte('created_at', cutoffDate.toISOString());

  if (promptLikesError) {
    logger.error('Failed to fetch prompt likes', { error: promptLikesError });
  }

  const promptLikeCounts: Record<string, number> = {};
  promptLikes.forEach((like) => {
    if (like.target_prompt_id) {
      promptLikeCounts[like.target_prompt_id] = (promptLikeCounts[like.target_prompt_id] || 0) + 1;
    }
  });

  const topLikedPrompts = Object.entries(promptLikeCounts)
    .map(([promptId, likeCount]) => ({ promptId, likeCount }))
    .sort((a, b) => b.likeCount - a.likeCount)
    .slice(0, 10);

  // Get embedding coverage
  const { data: photos, error: photosError } = await supabase
    .from('user_photos')
    .select('visual_embedding');

  if (photosError) {
    logger.error('Failed to fetch photos', { error: photosError });
  }

  const { data: prompts, error: promptsError } = await supabase
    .from('user_prompts')
    .select('text_embedding');

  if (promptsError) {
    logger.error('Failed to fetch prompts', { error: promptsError });
  }

  const photosWithEmbeddings = photos?.filter(p => p.visual_embedding !== null).length || 0;
  const promptsWithEmbeddings = prompts?.filter(p => p.text_embedding !== null).length || 0;

  // Get user engagement
  const { data: userEvents, error: userEventsError } = await supabase
    .from('preference_events')
    .select('user_id')
    .gte('created_at', cutoffDate.toISOString());

  if (userEventsError) {
    logger.error('Failed to fetch user events', { error: userEventsError });
  }

  const uniqueUsers = new Set(userEvents?.map(e => e.user_id) || []);
  const averageEventsPerUser = uniqueUsers.size > 0
    ? (events.length / uniqueUsers.size)
    : 0;

  return {
    totalEvents: events.length,
    eventsByType,
    averageDwellTime: dwellTimeCount > 0 ? totalDwellTime / dwellTimeCount : 0,
    topLikedPhotos,
    topLikedPrompts,
    embeddingCoverage: {
      photosWithEmbeddings,
      promptsWithEmbeddings,
      totalPhotos: photos?.length || 0,
      totalPrompts: prompts?.length || 0,
    },
    userEngagement: {
      activeUsers: uniqueUsers.size,
      averageEventsPerUser,
    },
  };
}

/**
 * Get user-specific analytics
 */
export async function getUserPreferenceAnalytics(
  userId: string,
  days: number = 30
): Promise<PreferenceAnalytics> {
  return getPreferenceAnalytics(userId, days);
}

