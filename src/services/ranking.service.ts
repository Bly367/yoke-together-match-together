import { supabase } from '@/integrations/supabase/client';
import { getUserEmbedding, type UserEmbedding } from './preferenceLearning.service';
import { computeCosineSimilarity, type EmbeddingVector } from './embedding.service';
import { getRankingWeights, type RankingWeights } from './abTesting.service';
import { logger } from '@/lib/logger';
import type { DuoWithMembers } from './duo.service';

/**
 * Ranking score components
 */
export interface RankingScoreComponents {
  visual_similarity: number;
  prompt_similarity: number;
  duo_compatibility: number;
  behavioral_alignment: number;
  elo_component: number;
  final_score: number;
}

/**
 * Ranked duo with score
 */
export interface RankedDuo {
  duo: DuoWithMembers;
  score: number;
  components: RankingScoreComponents;
}

/**
 * Compute visual similarity between user and target duo
 * 
 * @param userEmbedding - User's embedding
 * @param targetDuoEmbedding - Target duo's embedding
 * @returns Visual similarity score (0-1)
 */
function computeVisualSimilarity(
  userEmbedding: UserEmbedding | null,
  targetDuoEmbedding: EmbeddingVector | null
): number {
  if (!userEmbedding?.visual_preference_vector || !targetDuoEmbedding) {
    return 0;
  }

  try {
    return computeCosineSimilarity(userEmbedding.visual_preference_vector, targetDuoEmbedding);
  } catch (error) {
    logger.warn('Failed to compute visual similarity', { error });
    return 0;
  }
}

/**
 * Compute prompt similarity between user and target duo
 * 
 * @param userEmbedding - User's embedding
 * @param targetDuoEmbedding - Target duo's embedding
 * @returns Prompt similarity score (0-1)
 */
function computePromptSimilarity(
  userEmbedding: UserEmbedding | null,
  targetDuoEmbedding: EmbeddingVector | null
): number {
  if (!userEmbedding?.prompt_semantic_vector || !targetDuoEmbedding) {
    return 0;
  }

  try {
    return computeCosineSimilarity(userEmbedding.prompt_semantic_vector, targetDuoEmbedding);
  } catch (error) {
    logger.warn('Failed to compute prompt similarity', { error });
    return 0;
  }
}

/**
 * Compute duo-level compatibility
 * Formula: mean(user1 → targetMember1, user1 → targetMember2, user2 → targetMember1, user2 → targetMember2)
 * 
 * @param userEmbedding - User's embedding
 * @param userDuoMemberIds - IDs of user's duo members
 * @param targetDuoMemberIds - IDs of target duo members
 * @returns Duo compatibility score (0-1)
 */
async function computeDuoCompatibility(
  userEmbedding: UserEmbedding | null,
  userDuoMemberIds: [string, string],
  targetDuoMemberIds: [string, string]
): Promise<number> {
  if (!userEmbedding?.unified_preference_vector) {
    return 0;
  }

  // Get embeddings for all members
  const memberIds = [...userDuoMemberIds, ...targetDuoMemberIds];
  const { data: memberEmbeddings } = await supabase
    .from('user_embedding')
    .select('user_id, unified_preference_vector')
    .in('user_id', memberIds)
    .not('unified_preference_vector', 'is', null);

  if (!memberEmbeddings || memberEmbeddings.length < 2) {
    return 0;
  }

  // Create map for quick lookup
  const embeddingMap = new Map<string, EmbeddingVector>();
  for (const emb of memberEmbeddings) {
    if (emb.unified_preference_vector) {
      embeddingMap.set(emb.user_id, emb.unified_preference_vector);
    }
  }

  // Get user duo member embeddings
  const userMember1Embedding = embeddingMap.get(userDuoMemberIds[0]);
  const userMember2Embedding = embeddingMap.get(userDuoMemberIds[1]);
  const targetMember1Embedding = embeddingMap.get(targetDuoMemberIds[0]);
  const targetMember2Embedding = embeddingMap.get(targetDuoMemberIds[1]);

  if (!userMember1Embedding || !userMember2Embedding || !targetMember1Embedding || !targetMember2Embedding) {
    return 0;
  }

  // Compute all four compatibility scores
  const scores: number[] = [];

  try {
    scores.push(computeCosineSimilarity(userMember1Embedding, targetMember1Embedding));
    scores.push(computeCosineSimilarity(userMember1Embedding, targetMember2Embedding));
    scores.push(computeCosineSimilarity(userMember2Embedding, targetMember1Embedding));
    scores.push(computeCosineSimilarity(userMember2Embedding, targetMember2Embedding));
  } catch (error) {
    logger.warn('Failed to compute duo compatibility', { error });
    return 0;
  }

  // Return mean
  return scores.reduce((sum, score) => sum + score, 0) / scores.length;
}

/**
 * Compute behavioral preference alignment
 * Simplified: based on recent preference events
 * 
 * @param userId - User ID
 * @param targetDuoId - Target duo ID
 * @returns Behavioral alignment score (0-1)
 */
async function computeBehavioralAlignment(userId: string, targetDuoId: string): Promise<number> {
  // Get recent events for this target duo
  const { data: events } = await supabase
    .from('preference_events')
    .select('event_type')
    .eq('user_id', userId)
    .eq('target_duo_id', targetDuoId)
    .order('created_at', { ascending: false })
    .limit(10);

  if (!events || events.length === 0) {
    return 0.5; // Neutral if no events
  }

  // Weight recent events
  let score = 0;
  let totalWeight = 0;

  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    const weight = 1 / (i + 1); // More recent = higher weight
    const eventWeight = event.event_type === 'like' || event.event_type === 'hard_like' ? 1 : -0.5;
    
    score += eventWeight * weight;
    totalWeight += weight;
  }

  // Normalize to 0-1 range
  const normalizedScore = (score / totalWeight + 1) / 2;
  return Math.max(0, Math.min(1, normalizedScore));
}

/**
 * Compute ELO component for ranking
 * Normalizes ELO score to 0-1 range
 * 
 * @param eloScore - ELO score
 * @returns ELO component (0-1)
 */
function computeEloComponent(eloScore: number): number {
  // Normalize ELO (assuming range 1000-2000) to 0-1
  const minElo = 1000;
  const maxElo = 2000;
  const normalized = (eloScore - minElo) / (maxElo - minElo);
  return Math.max(0, Math.min(1, normalized));
}

/**
 * Compute ranking score for a duo
 * Uses A/B testing to determine weights
 * 
 * @param userId - User ID
 * @param userDuoId - User's duo ID
 * @param targetDuo - Target duo
 * @returns Ranking score components
 * @throws Error if computation fails
 */
export async function computeRankingScore(
  userId: string,
  userDuoId: string,
  targetDuo: DuoWithMembers
): Promise<RankingScoreComponents> {
  // Get A/B test weights for this user
  const weights = getRankingWeights(userId);
  // Get user embedding
  const userEmbedding = await getUserEmbedding(userId);
  if (!userEmbedding) {
    // Return neutral scores if no embedding
    return {
      visual_similarity: 0.5,
      prompt_similarity: 0.5,
      duo_compatibility: 0.5,
      behavioral_alignment: 0.5,
      elo_component: 0.5,
      final_score: 0.5,
    };
  }

  // Get target duo embedding
  const { data: duoEmbedding } = await supabase
    .from('duo_embedding')
    .select('unified_embedding')
    .eq('duo_id', targetDuo.id)
    .single();

  const targetDuoEmbedding = duoEmbedding?.unified_embedding || null;

  // Get user duo (we need to fetch it)
  const { data: userDuo } = await supabase
    .from('duos')
    .select('member1_id, member2_id')
    .eq('id', userDuoId)
    .single();

  if (!userDuo) {
    throw new Error('User duo not found');
  }

  const userDuoMemberIds: [string, string] = [
    userDuo.member1_id,
    userDuo.member2_id,
  ];

  // Get target duo members
  const targetDuoMemberIds: [string, string] = [
    targetDuo.member1.id,
    targetDuo.member2.id,
  ];

  // Compute all components
  const [visualSim, promptSim, duoCompat, behavioralAlign] = await Promise.all([
    Promise.resolve(computeVisualSimilarity(userEmbedding, targetDuoEmbedding)),
    Promise.resolve(computePromptSimilarity(userEmbedding, targetDuoEmbedding)),
    computeDuoCompatibility(userEmbedding, userDuoMemberIds, targetDuoMemberIds),
    computeBehavioralAlignment(userId, targetDuo.id),
  ]);

  const eloComp = computeEloComponent(userEmbedding.elo_score);

  // Compute final score using A/B test weights
  const finalScore =
    weights.visual * visualSim +
    weights.prompt * promptSim +
    weights.duo * duoCompat +
    weights.behavioral * behavioralAlign +
    weights.elo * eloComp;

  return {
    visual_similarity: visualSim,
    prompt_similarity: promptSim,
    duo_compatibility: duoCompat,
    behavioral_alignment: behavioralAlign,
    elo_component: eloComp,
    final_score: finalScore,
  };
}

/**
 * Rank duos for discover feed
 * 
 * @param userId - User ID
 * @param userDuoId - User's duo ID
 * @param candidateDuos - Array of candidate duos to rank
 * @param limit - Maximum number of results (default: 50)
 * @returns Promise resolving to array of RankedDuo sorted by score
 * @throws Error if ranking fails
 * 
 * @example
 * ```typescript
 * const ranked = await rankDuosForDiscover(userId, userDuoId, candidateDuos, 20);
 * ```
 */
export async function rankDuosForDiscover(
  userId: string,
  userDuoId: string,
  candidateDuos: DuoWithMembers[],
  limit: number = 50
): Promise<RankedDuo[]> {
  logger.info('Ranking duos for discover feed', { userId, userDuoId, candidateCount: candidateDuos.length });

  // Compute scores for all candidates
  const rankedDuos: RankedDuo[] = [];

  for (const duo of candidateDuos) {
    try {
      const components = await computeRankingScore(userId, userDuoId, duo);
      rankedDuos.push({
        duo,
        score: components.final_score,
        components,
      });
    } catch (error) {
      logger.warn('Failed to compute ranking score for duo', { error, duoId: duo.id });
      // Skip this duo if ranking fails
    }
  }

  // Sort by score (descending)
  rankedDuos.sort((a, b) => b.score - a.score);

  // Return top N
  return rankedDuos.slice(0, limit);
}

/**
 * Cache ranking scores for a user's discover feed
 * 
 * @param userId - User ID
 * @param rankedDuos - Array of ranked duos
 * @returns Promise resolving when caching completes
 * @throws Error if caching fails
 */
export async function cacheRankingScores(
  userId: string,
  rankedDuos: RankedDuo[]
): Promise<void> {
  if (rankedDuos.length === 0) {
    return;
  }

  // Delete old cache entries
  await supabase
    .from('discover_feed_rank_cache')
    .delete()
    .eq('user_id', userId);

  // Insert new cache entries
  const cacheEntries = rankedDuos.map(ranked => ({
    user_id: userId,
    duo_id: ranked.duo.id,
    rank_score: ranked.score,
    visual_similarity: ranked.components.visual_similarity,
    prompt_similarity: ranked.components.prompt_similarity,
    duo_compatibility: ranked.components.duo_compatibility,
    behavioral_alignment: ranked.components.behavioral_alignment,
    elo_component: ranked.components.elo_component,
  }));

  const { error } = await supabase
    .from('discover_feed_rank_cache')
    .insert(cacheEntries);

  if (error) {
    logger.error('Failed to cache ranking scores', { error, userId });
    throw error;
  }
}

/**
 * Get cached ranking scores for a user
 * 
 * @param userId - User ID
 * @param limit - Maximum number of results
 * @returns Promise resolving to array of cached scores
 * @throws Error if query fails
 */
export async function getCachedRankingScores(
  userId: string,
  limit: number = 50
): Promise<Array<{ duo_id: string; rank_score: number }>> {
  const { data, error } = await supabase
    .from('discover_feed_rank_cache')
    .select('duo_id, rank_score')
    .eq('user_id', userId)
    .order('rank_score', { ascending: false })
    .limit(limit);

  if (error) {
    logger.error('Failed to get cached ranking scores', { error, userId });
    throw error;
  }

  return data || [];
}

