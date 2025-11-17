import { logger } from '@/lib/logger';

/**
 * Cost monitoring service for OpenAI API usage
 */

export interface ApiCostMetrics {
  totalRequests: number;
  totalTokens: number;
  estimatedCost: number;
  requestsByType: {
    photo: number;
    prompt: number;
  };
  averageTokensPerRequest: number;
}

// Cost per 1M tokens (text-embedding-3-large)
const COST_PER_MILLION_TOKENS = 0.13; // $0.13 per 1M tokens

// Average tokens per embedding request (approximate)
const AVG_TOKENS_PER_PHOTO = 1000; // Approximate
const AVG_TOKENS_PER_PROMPT = 500; // Approximate

/**
 * Track API usage for cost monitoring
 */
class CostMonitor {
  private metrics: ApiCostMetrics = {
    totalRequests: 0,
    totalTokens: 0,
    estimatedCost: 0,
    requestsByType: {
      photo: 0,
      prompt: 0,
    },
    averageTokensPerRequest: 0,
  };

  /**
   * Track a photo embedding request
   */
  trackPhotoEmbedding(): void {
    this.metrics.totalRequests++;
    this.metrics.requestsByType.photo++;
    this.metrics.totalTokens += AVG_TOKENS_PER_PHOTO;
    this.updateCost();
    this.logMetrics();
  }

  /**
   * Track a prompt embedding request
   */
  trackPromptEmbedding(): void {
    this.metrics.totalRequests++;
    this.metrics.requestsByType.prompt++;
    this.metrics.totalTokens += AVG_TOKENS_PER_PROMPT;
    this.updateCost();
    this.logMetrics();
  }

  /**
   * Update estimated cost
   */
  private updateCost(): void {
    const tokensInMillions = this.metrics.totalTokens / 1_000_000;
    this.metrics.estimatedCost = tokensInMillions * COST_PER_MILLION_TOKENS;
    this.metrics.averageTokensPerRequest = this.metrics.totalRequests > 0
      ? this.metrics.totalTokens / this.metrics.totalRequests
      : 0;
  }

  /**
   * Log metrics (can be extended to send to analytics service)
   */
  private logMetrics(): void {
    logger.info('OpenAI API Cost Metrics', {
      ...this.metrics,
      estimatedCostUSD: `$${this.metrics.estimatedCost.toFixed(4)}`,
    });
  }

  /**
   * Get current metrics
   */
  getMetrics(): ApiCostMetrics {
    return { ...this.metrics };
  }

  /**
   * Reset metrics (for testing or periodic resets)
   */
  reset(): void {
    this.metrics = {
      totalRequests: 0,
      totalTokens: 0,
      estimatedCost: 0,
      requestsByType: {
        photo: 0,
        prompt: 0,
      },
      averageTokensPerRequest: 0,
    };
  }
}

// Singleton instance
export const costMonitor = new CostMonitor();

/**
 * Get cost metrics
 */
export function getCostMetrics(): ApiCostMetrics {
  return costMonitor.getMetrics();
}

/**
 * Format cost for display
 */
export function formatCost(cost: number): string {
  if (cost < 0.01) {
    return `$${(cost * 1000).toFixed(2)}¢`;
  }
  return `$${cost.toFixed(2)}`;
}

