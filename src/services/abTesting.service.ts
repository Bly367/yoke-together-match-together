import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

/**
 * A/B Testing service for ranking algorithm weights
 */

export interface RankingWeights {
  visual: number;
  prompt: number;
  duo: number;
  behavioral: number;
  elo: number;
}

export const DEFAULT_WEIGHTS: RankingWeights = {
  visual: 0.30,
  prompt: 0.25,
  duo: 0.20,
  behavioral: 0.10,
  elo: 0.15,
};

export const AB_TEST_VARIANTS: Record<string, RankingWeights> = {
  default: DEFAULT_WEIGHTS,
  visual_focused: {
    visual: 0.40,
    prompt: 0.20,
    duo: 0.15,
    behavioral: 0.10,
    elo: 0.15,
  },
  prompt_focused: {
    visual: 0.20,
    prompt: 0.35,
    duo: 0.20,
    behavioral: 0.10,
    elo: 0.15,
  },
  behavioral_focused: {
    visual: 0.25,
    prompt: 0.20,
    duo: 0.15,
    behavioral: 0.25,
    elo: 0.15,
  },
  balanced: {
    visual: 0.25,
    prompt: 0.25,
    duo: 0.20,
    behavioral: 0.15,
    elo: 0.15,
  },
};

/**
 * Get A/B test variant for a user
 * Uses consistent hashing to ensure same user gets same variant
 * 
 * @param userId - User ID
 * @returns Variant name
 */
export function getUserAbTestVariant(userId: string): string {
  // Simple hash function for consistent assignment
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    const char = userId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & 0xFFFFFFFF; // Convert to 32-bit integer
  }

  const variants = Object.keys(AB_TEST_VARIANTS);
  const index = Math.abs(hash) % variants.length;
  return variants[index];
}

/**
 * Get ranking weights for a user based on A/B test variant
 * 
 * @param userId - User ID
 * @returns Ranking weights
 */
export function getRankingWeights(userId: string): RankingWeights {
  const variant = getUserAbTestVariant(userId);
  return AB_TEST_VARIANTS[variant] || DEFAULT_WEIGHTS;
}

/**
 * Track A/B test result (match success rate)
 * 
 * @param userId - User ID
 * @param variant - Variant name
 * @param matched - Whether match was successful
 */
export async function trackAbTestResult(
  userId: string,
  variant: string,
  matched: boolean
): Promise<void> {
  // Store in analytics table or log for analysis
  // For now, we'll log it (can be extended to store in database)
  logger.info('A/B test result', {
    userId,
    variant,
    matched,
    timestamp: new Date().toISOString(),
  });
}

