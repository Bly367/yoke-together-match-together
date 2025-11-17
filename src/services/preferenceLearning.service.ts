import { supabase } from '@/integrations/supabase/client';
import { getUserPhotos } from './photo.service';
import { getUserPrompts } from './prompt.service';
import { getRecentPreferenceEvents, EVENT_WEIGHTS, type PreferenceEventType } from './preferenceEvents.service';
import { combineEmbeddings, averageEmbeddings, computeCosineSimilarity, type EmbeddingVector } from './embedding.service';
import { logger } from '@/lib/logger';
import { retryWithBackoff } from '@/lib/utils';

/**
 * User embedding record
 */
export interface UserEmbedding {
  id: string;
  user_id: string;
  visual_preference_vector: number[] | null;
  prompt_semantic_vector: number[] | null;
  behavioral_preference_vector: number[] | null;
  unified_preference_vector: number[] | null;
  elo_score: number;
  last_updated_at: string;
  created_at: string;
}

/**
 * Compute visual preference vector from user's liked photos
 * 
 * @param userId - User ID
 * @returns Promise resolving to visual preference vector or null
 * @throws Error if computation fails
 */
async function computeVisualPreferenceVector(userId: string): Promise<EmbeddingVector | null> {
  // Get user's photos (their own photos represent their visual identity)
  const userPhotos = await getUserPhotos(userId);
  const photosWithEmbeddings = userPhotos.filter(p => p.visual_embedding !== null);

  if (photosWithEmbeddings.length === 0) {
    return null;
  }

  // Average of user's own photo embeddings
  const embeddings = photosWithEmbeddings.map(p => p.visual_embedding!);
  return averageEmbeddings(embeddings);
}

/**
 * Compute prompt semantic preference vector from user's liked prompts
 * 
 * @param userId - User ID
 * @returns Promise resolving to prompt semantic vector or null
 * @throws Error if computation fails
 */
async function computePromptSemanticVector(userId: string): Promise<EmbeddingVector | null> {
  // Get user's prompts (their own prompts represent their personality)
  const userPrompts = await getUserPrompts(userId);
  const promptsWithEmbeddings = userPrompts.filter(p => p.text_embedding !== null);

  if (promptsWithEmbeddings.length === 0) {
    return null;
  }

  // Average of user's own prompt embeddings
  const embeddings = promptsWithEmbeddings.map(p => p.text_embedding!);
  return averageEmbeddings(embeddings);
}

/**
 * Compute behavioral preference vector from preference events
 * 
 * @param userId - User ID
 * @returns Promise resolving to behavioral preference vector or null
 * @throws Error if computation fails
 */
async function computeBehavioralPreferenceVector(userId: string): Promise<EmbeddingVector | null> {
  // Get recent preference events
  const events = await getRecentPreferenceEvents(userId, 30);

  if (events.length === 0) {
    return null;
  }

  // Get embeddings from liked targets
  const likedDuos = new Set<string>();
  const likedPhotos = new Set<string>();
  const likedPrompts = new Set<string>();

  for (const event of events) {
    const weight = EVENT_WEIGHTS[event.event_type];
    if (weight > 0) {
      // Positive signal - add to liked sets
      if (event.target_duo_id) {
        likedDuos.add(event.target_duo_id);
      }
      if (event.target_photo_id) {
        likedPhotos.add(event.target_photo_id);
      }
      if (event.target_prompt_id) {
        likedPrompts.add(event.target_prompt_id);
      }
    }
  }

  // Collect embeddings from liked targets
  const embeddings: EmbeddingVector[] = [];

  // Get photo embeddings
  if (likedPhotos.size > 0) {
    const { data: photos } = await supabase
      .from('user_photos')
      .select('visual_embedding')
      .in('id', Array.from(likedPhotos))
      .not('visual_embedding', 'is', null);

    if (photos) {
      for (const photo of photos) {
        if (photo.visual_embedding) {
          embeddings.push(photo.visual_embedding);
        }
      }
    }
  }

  // Get prompt embeddings
  if (likedPrompts.size > 0) {
    const { data: prompts } = await supabase
      .from('user_prompts')
      .select('text_embedding')
      .in('id', Array.from(likedPrompts))
      .not('text_embedding', 'is', null);

    if (prompts) {
      for (const prompt of prompts) {
        if (prompt.text_embedding) {
          embeddings.push(prompt.text_embedding);
        }
      }
    }
  }

  // Get duo embeddings (if available)
  if (likedDuos.size > 0) {
    const { data: duos } = await supabase
      .from('duo_embedding')
      .select('unified_embedding')
      .in('duo_id', Array.from(likedDuos))
      .not('unified_embedding', 'is', null);

    if (duos) {
      for (const duo of duos) {
        if (duo.unified_embedding) {
          embeddings.push(duo.unified_embedding);
        }
      }
    }
  }

  if (embeddings.length === 0) {
    return null;
  }

  // Average of liked target embeddings
  return averageEmbeddings(embeddings);
}

/**
 * Compute unified preference vector
 * Formula: 0.45 * visual + 0.35 * prompt + 0.20 * behavioral
 * 
 * @param visualVec - Visual preference vector
 * @param promptVec - Prompt semantic vector
 * @param behavioralVec - Behavioral preference vector
 * @returns Unified preference vector
 */
function computeUnifiedVector(
  visualVec: EmbeddingVector | null,
  promptVec: EmbeddingVector | null,
  behavioralVec: EmbeddingVector | null
): EmbeddingVector | null {
  const vectors: EmbeddingVector[] = [];
  const weights: number[] = [];

  if (visualVec) {
    vectors.push(visualVec);
    weights.push(0.45);
  }
  if (promptVec) {
    vectors.push(promptVec);
    weights.push(0.35);
  }
  if (behavioralVec) {
    vectors.push(behavioralVec);
    weights.push(0.20);
  }

  if (vectors.length === 0) {
    return null;
  }

  // Normalize weights if not all vectors are present
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  const normalizedWeights = weights.map(w => w / totalWeight);

  return combineEmbeddings(vectors, normalizedWeights);
}

/**
 * Compute and update user embedding
 * 
 * @param userId - User ID
 * @returns Promise resolving to updated UserEmbedding
 * @throws Error if computation fails
 * 
 * @example
 * ```typescript
 * const embedding = await computeUserEmbedding(userId);
 * ```
 */
export async function computeUserEmbedding(userId: string): Promise<UserEmbedding> {
  logger.info('Computing user embedding', { userId });

  // Compute all three vectors
  const [visualVec, promptVec, behavioralVec] = await Promise.all([
    computeVisualPreferenceVector(userId),
    computePromptSemanticVector(userId),
    computeBehavioralPreferenceVector(userId),
  ]);

  // Compute unified vector
  const unifiedVec = computeUnifiedVector(visualVec, promptVec, behavioralVec);

  // Get or create user embedding record
  const { data: existing } = await supabase
    .from('user_embedding')
    .select('*')
    .eq('user_id', userId)
    .single();

  const embeddingData = {
    user_id: userId,
    visual_preference_vector: visualVec,
    prompt_semantic_vector: promptVec,
    behavioral_preference_vector: behavioralVec,
    unified_preference_vector: unifiedVec,
    last_updated_at: new Date().toISOString(),
  };

  let data: UserEmbedding;
  let error;

  if (existing) {
    // Update existing
    const result = await retryWithBackoff(async () => {
      return await supabase
        .from('user_embedding')
        .update(embeddingData)
        .eq('user_id', userId)
        .select()
        .single();
    });
    data = result.data!;
    error = result.error;
  } else {
    // Create new
    const result = await retryWithBackoff(async () => {
      return await supabase
        .from('user_embedding')
        .insert({
          ...embeddingData,
          elo_score: 1500.0,
        })
        .select()
        .single();
    });
    data = result.data!;
    error = result.error;
  }

  if (error) {
    logger.error('Failed to save user embedding', { error, userId });
    throw error;
  }

  logger.info('User embedding computed successfully', { userId });
  return data;
}

/**
 * Get user embedding
 * 
 * @param userId - User ID
 * @returns Promise resolving to UserEmbedding or null
 * @throws Error if query fails
 */
export async function getUserEmbedding(userId: string): Promise<UserEmbedding | null> {
  const { data, error } = await supabase
    .from('user_embedding')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // Not found
      return null;
    }
    logger.error('Failed to get user embedding', { error, userId });
    throw error;
  }

  return data;
}

/**
 * Update ELO score for a user
 * 
 * @param userId - User ID
 * @param newEloScore - New ELO score
 * @returns Promise resolving to updated UserEmbedding
 * @throws Error if update fails
 */
export async function updateEloScore(userId: string, newEloScore: number): Promise<UserEmbedding> {
  const { data, error } = await supabase
    .from('user_embedding')
    .update({ elo_score: newEloScore })
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    logger.error('Failed to update ELO score', { error, userId });
    throw error;
  }

  return data;
}

