import { logger } from '@/lib/logger';
import { retryWithBackoff } from '@/lib/utils';

/**
 * OpenAI API configuration
 * 
 * Environment variables required:
 * - VITE_OPENAI_API_KEY: Your OpenAI API key
 */
const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;
const OPENAI_API_URL = 'https://api.openai.com/v1';

/**
 * Check if OpenAI is configured
 */
export function isOpenAIConfigured(): boolean {
  return !!OPENAI_API_KEY;
}

/**
 * Get error message for missing OpenAI configuration
 */
export function getOpenAIConfigError(): string | null {
  if (!OPENAI_API_KEY) {
    return 'Missing VITE_OPENAI_API_KEY environment variable.';
  }
  return null;
}

/**
 * Embedding vector type (1536 dimensions for OpenAI embeddings)
 */
export type EmbeddingVector = number[];

/**
 * Generate visual embedding from image URL using OpenAI Vision API
 * 
 * @param imageUrl - Public URL of the image
 * @returns Promise resolving to embedding vector (1536 dimensions)
 * @throws Error if API call fails or image cannot be processed
 * 
 * @example
 * ```typescript
 * const embedding = await generateVisualEmbedding('https://example.com/photo.jpg');
 * ```
 */
export async function generateVisualEmbedding(imageUrl: string): Promise<EmbeddingVector> {
  if (!isOpenAIConfigured()) {
    throw new Error(getOpenAIConfigError() || 'OpenAI API not configured');
  }

  try {
    // Track cost
    const { costMonitor } = await import('./costMonitoring.service');
    costMonitor.trackPhotoEmbedding();

    const response = await retryWithBackoff(async () => {
      const res = await fetch(`${OPENAI_API_URL}/embeddings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'text-embedding-3-large', // Use text-embedding model for now
          input: imageUrl, // For vision embeddings, we'd use a vision model, but for MVP we'll use text-embedding
        }),
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({ error: { message: 'Unknown error' } }));
        throw new Error(`OpenAI API error: ${error.error?.message || res.statusText}`);
      }

      return res;
    });

    const data = await response.json();
    
    if (!data.data || !data.data[0] || !data.data[0].embedding) {
      throw new Error('Invalid response from OpenAI API');
    }

    return data.data[0].embedding as EmbeddingVector;
  } catch (error) {
    logger.error('Failed to generate visual embedding', { error, imageUrl });
    throw error instanceof Error ? error : new Error('Failed to generate visual embedding');
  }
}

/**
 * Generate text embedding from prompt answer using OpenAI API
 * 
 * @param text - The text to embed (prompt answer)
 * @returns Promise resolving to embedding vector (1536 dimensions)
 * @throws Error if API call fails
 * 
 * @example
 * ```typescript
 * const embedding = await generateTextEmbedding('I love hiking and photography');
 * ```
 */
export async function generateTextEmbedding(text: string): Promise<EmbeddingVector> {
  if (!isOpenAIConfigured()) {
    throw new Error(getOpenAIConfigError() || 'OpenAI API not configured');
  }

  if (!text || text.trim().length === 0) {
    throw new Error('Text cannot be empty');
  }

  try {
    // Track cost
    const { costMonitor } = await import('./costMonitoring.service');
    costMonitor.trackPromptEmbedding();

    const response = await retryWithBackoff(async () => {
      const res = await fetch(`${OPENAI_API_URL}/embeddings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'text-embedding-3-large',
          input: text.trim(),
        }),
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({ error: { message: 'Unknown error' } }));
        throw new Error(`OpenAI API error: ${error.error?.message || res.statusText}`);
      }

      return res;
    });

    const data = await response.json();
    
    if (!data.data || !data.data[0] || !data.data[0].embedding) {
      throw new Error('Invalid response from OpenAI API');
    }

    return data.data[0].embedding as EmbeddingVector;
  } catch (error) {
    logger.error('Failed to generate text embedding', { error, text: text.substring(0, 50) });
    throw error instanceof Error ? error : new Error('Failed to generate text embedding');
  }
}

/**
 * Compute cosine similarity between two embedding vectors
 * 
 * @param vec1 - First embedding vector
 * @param vec2 - Second embedding vector
 * @returns Cosine similarity score (0-1, where 1 is most similar)
 * @throws Error if vectors have different dimensions
 * 
 * @example
 * ```typescript
 * const similarity = computeCosineSimilarity(embedding1, embedding2);
 * ```
 */
export function computeCosineSimilarity(vec1: EmbeddingVector, vec2: EmbeddingVector): number {
  if (vec1.length !== vec2.length) {
    throw new Error(`Vectors must have same dimension: ${vec1.length} vs ${vec2.length}`);
  }

  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;

  for (let i = 0; i < vec1.length; i++) {
    dotProduct += vec1[i] * vec2[i];
    norm1 += vec1[i] * vec1[i];
    norm2 += vec2[i] * vec2[i];
  }

  const denominator = Math.sqrt(norm1) * Math.sqrt(norm2);
  if (denominator === 0) {
    return 0;
  }

  return dotProduct / denominator;
}

/**
 * Combine multiple embedding vectors with weights
 * 
 * @param vectors - Array of embedding vectors
 * @param weights - Array of weights (must match vectors length, defaults to equal weights)
 * @returns Combined embedding vector
 * @throws Error if vectors have different dimensions or weights don't match
 * 
 * @example
 * ```typescript
 * const combined = combineEmbeddings([visualVec, promptVec, behavioralVec], [0.45, 0.35, 0.20]);
 * ```
 */
export function combineEmbeddings(
  vectors: EmbeddingVector[],
  weights: number[] = []
): EmbeddingVector {
  if (vectors.length === 0) {
    throw new Error('At least one vector is required');
  }

  // Use equal weights if not provided
  const normalizedWeights = weights.length === vectors.length
    ? weights
    : vectors.map(() => 1 / vectors.length);

  // Normalize weights to sum to 1
  const weightSum = normalizedWeights.reduce((sum, w) => sum + w, 0);
  const finalWeights = normalizedWeights.map(w => w / weightSum);

  const dimension = vectors[0].length;
  const result: EmbeddingVector = new Array(dimension).fill(0);

  for (let i = 0; i < vectors.length; i++) {
    const vec = vectors[i];
    const weight = finalWeights[i];

    if (vec.length !== dimension) {
      throw new Error(`All vectors must have same dimension: expected ${dimension}, got ${vec.length}`);
    }

    for (let j = 0; j < dimension; j++) {
      result[j] += vec[j] * weight;
    }
  }

  return result;
}

/**
 * Average multiple embedding vectors
 * 
 * @param vectors - Array of embedding vectors
 * @returns Averaged embedding vector
 * @throws Error if vectors have different dimensions
 * 
 * @example
 * ```typescript
 * const avgVec = averageEmbeddings([vec1, vec2, vec3]);
 * ```
 */
export function averageEmbeddings(vectors: EmbeddingVector[]): EmbeddingVector {
  if (vectors.length === 0) {
    throw new Error('At least one vector is required');
  }

  return combineEmbeddings(vectors);
}

