import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';
import { retryWithBackoff } from '@/lib/utils';

/**
 * ELO rating system for match outcomes
 * Updates ELO scores based on match success/failure
 */

const INITIAL_ELO = 1500.0;
const K_FACTOR = 32; // Standard K-factor for ELO rating

/**
 * Calculate expected score for ELO calculation
 */
function expectedScore(ratingA: number, ratingB: number): number {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
}

/**
 * Calculate new ELO rating after a match outcome
 * 
 * @param currentRating - Current ELO rating
 * @param opponentRating - Opponent's ELO rating
 * @param actualScore - Actual score (1 for win, 0.5 for draw, 0 for loss)
 * @param kFactor - K-factor (default: 32)
 * @returns New ELO rating
 */
export function calculateNewElo(
  currentRating: number,
  opponentRating: number,
  actualScore: number,
  kFactor: number = K_FACTOR
): number {
  const expected = expectedScore(currentRating, opponentRating);
  const newRating = currentRating + kFactor * (actualScore - expected);
  return Math.max(1000, Math.min(3000, newRating)); // Clamp between 1000-3000
}

/**
 * Update ELO scores for both users after a match
 * 
 * @param user1Id - First user ID
 * @param user2Id - Second user ID
 * @param outcome - Match outcome: 'match' (both win), 'no_match' (both lose), or 'draw'
 * @returns Promise resolving to updated ELO scores
 * @throws Error if update fails
 */
export async function updateEloAfterMatch(
  user1Id: string,
  user2Id: string,
  outcome: 'match' | 'no_match' | 'draw' = 'match'
): Promise<{ user1Elo: number; user2Elo: number }> {
  // Get current ELO scores
  const { data: user1Embedding, error: user1Error } = await supabase
    .from('user_embedding')
    .select('elo_score')
    .eq('user_id', user1Id)
    .single();

  const { data: user2Embedding, error: user2Error } = await supabase
    .from('user_embedding')
    .select('elo_score')
    .eq('user_id', user2Id)
    .single();

  if (user1Error || !user1Embedding) {
    // Create embedding if doesn't exist
    const { error: insertError } = await supabase
      .from('user_embedding')
      .insert({
        user_id: user1Id,
        elo_score: INITIAL_ELO,
      });
    
    if (insertError) {
      logger.error('Failed to create user1 embedding', { error: insertError, user1Id });
      // Continue with INITIAL_ELO if insert fails
    }
  }

  if (user2Error || !user2Embedding) {
    // Create embedding if doesn't exist
    const { error: insertError } = await supabase
      .from('user_embedding')
      .insert({
        user_id: user2Id,
        elo_score: INITIAL_ELO,
      });
    
    if (insertError) {
      logger.error('Failed to create user2 embedding', { error: insertError, user2Id });
      // Continue with INITIAL_ELO if insert fails
    }
  }

  const user1Elo = user1Embedding?.elo_score || INITIAL_ELO;
  const user2Elo = user2Embedding?.elo_score || INITIAL_ELO;

  // Determine actual scores based on outcome
  let user1Score: number;
  let user2Score: number;

  if (outcome === 'match') {
    // Both users "win" (mutual like)
    user1Score = 1.0;
    user2Score = 1.0;
  } else if (outcome === 'no_match') {
    // Both users "lose" (no mutual like)
    user1Score = 0.0;
    user2Score = 0.0;
  } else {
    // Draw (rare case)
    user1Score = 0.5;
    user2Score = 0.5;
  }

  // Calculate new ELO scores
  const newUser1Elo = calculateNewElo(user1Elo, user2Elo, user1Score);
  const newUser2Elo = calculateNewElo(user2Elo, user1Elo, user2Score);

  // Update both users' ELO scores
  const [update1Result, update2Result] = await Promise.all([
    retryWithBackoff(async () => {
      return await supabase
        .from('user_embedding')
        .update({ elo_score: newUser1Elo })
        .eq('user_id', user1Id);
    }),
    retryWithBackoff(async () => {
      return await supabase
        .from('user_embedding')
        .update({ elo_score: newUser2Elo })
        .eq('user_id', user2Id);
    }),
  ]);

  if (update1Result.error) {
    logger.error('Failed to update user1 ELO', { error: update1Result.error, user1Id });
    throw update1Result.error;
  }

  if (update2Result.error) {
    logger.error('Failed to update user2 ELO', { error: update2Result.error, user2Id });
    throw update2Result.error;
  }

  logger.info('ELO scores updated after match', {
    user1Id,
    user2Id,
    user1Elo: { old: user1Elo, new: newUser1Elo },
    user2Elo: { old: user2Elo, new: newUser2Elo },
    outcome,
  });

  return {
    user1Elo: newUser1Elo,
    user2Elo: newUser2Elo,
  };
}

/**
 * Get ELO score for a user
 */
export async function getUserElo(userId: string): Promise<number> {
  const { data, error } = await supabase
    .from('user_embedding')
    .select('elo_score')
    .eq('user_id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // Not found, return initial ELO
      return INITIAL_ELO;
    }
    throw error;
  }

  return data?.elo_score || INITIAL_ELO;
}

