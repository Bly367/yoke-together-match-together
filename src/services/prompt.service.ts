import { supabase } from '@/integrations/supabase/client';
import { generateTextEmbedding, type EmbeddingVector } from './embedding.service';
import { logger } from '@/lib/logger';
import { retryWithBackoff } from '@/lib/utils';
import type { PostgrestError } from '@supabase/supabase-js';

/**
 * User prompt with embedding
 */
export interface UserPrompt {
  id: string;
  user_id: string;
  prompt_text: string;
  answer_text: string;
  display_order: number;
  text_embedding: number[] | null;
  embedding_generated_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Predefined prompt templates
 */
export const PROMPT_TEMPLATES = [
  'Two truths and a lie',
  'I\'m looking for',
  'My simple pleasures',
  'I geek out on',
  'My most irrational fear',
  'I\'m weirdly attracted to',
  'We\'ll get along if',
  'The way to my heart is',
  'I\'ll fall for you if',
  'My love language is',
] as const;

export type PromptTemplate = typeof PROMPT_TEMPLATES[number];

/**
 * Create user prompt
 * 
 * @param userId - User ID
 * @param promptText - The prompt question
 * @param answerText - User's answer
 * @param displayOrder - Display order (0-based)
 * @param generateEmbedding - Whether to generate embedding (default: true)
 * @returns Promise resolving to created UserPrompt
 * @throws Error if creation fails
 * 
 * @example
 * ```typescript
 * const prompt = await createUserPrompt(userId, 'Two truths and a lie', 'I love hiking...', 0);
 * ```
 */
export async function createUserPrompt(
  userId: string,
  promptText: string,
  answerText: string,
  displayOrder: number = 0,
  generateEmbedding: boolean = true
): Promise<UserPrompt> {
  // Validate inputs
  if (!promptText || !promptText.trim()) {
    throw new Error('Prompt text is required');
  }
  if (!answerText || !answerText.trim()) {
    throw new Error('Answer text is required');
  }

  // Generate embedding if requested
  let embedding: EmbeddingVector | null = null;
  let embeddingGeneratedAt: string | null = null;

  if (generateEmbedding) {
    try {
      // Combine prompt and answer for better semantic matching
      const combinedText = `${promptText}: ${answerText}`;
      embedding = await generateTextEmbedding(combinedText);
      embeddingGeneratedAt = new Date().toISOString();
    } catch (error) {
      logger.warn('Failed to generate embedding for prompt, continuing without it', { error });
      // Continue without embedding - can be generated later
    }
  }

  // Insert prompt record
  const { data, error } = await retryWithBackoff(async () => {
    return await supabase
      .from('user_prompts')
      .insert({
        user_id: userId,
        prompt_text: promptText.trim(),
        answer_text: answerText.trim(),
        display_order: displayOrder,
        text_embedding: embedding,
        embedding_generated_at: embeddingGeneratedAt,
      })
      .select()
      .single();
  });

  if (error) {
    logger.error('Failed to create user prompt', { error, userId });
    throw error;
  }

  return data;
}

/**
 * Get all prompts for a user
 * 
 * @param userId - User ID
 * @returns Promise resolving to array of UserPrompt
 * @throws Error if query fails
 */
export async function getUserPrompts(userId: string): Promise<UserPrompt[]> {
  const { data, error } = await supabase
    .from('user_prompts')
    .select('*')
    .eq('user_id', userId)
    .order('display_order', { ascending: true });

  if (error) {
    logger.error('Failed to get user prompts', { error, userId });
    throw error;
  }

  return data || [];
}

/**
 * Update prompt
 * 
 * @param promptId - Prompt ID
 * @param updates - Fields to update
 * @returns Promise resolving to updated UserPrompt
 * @throws Error if update fails
 */
export async function updateUserPrompt(
  promptId: string,
  updates: {
    prompt_text?: string;
    answer_text?: string;
    display_order?: number;
  }
): Promise<UserPrompt> {
  const updateData: Record<string, unknown> = {};

  if (updates.prompt_text !== undefined) {
    updateData.prompt_text = updates.prompt_text.trim();
  }
  if (updates.answer_text !== undefined) {
    updateData.answer_text = updates.answer_text.trim();
  }
  if (updates.display_order !== undefined) {
    updateData.display_order = updates.display_order;
  }

  // Regenerate embedding if text changed
  if (updates.prompt_text || updates.answer_text) {
    const { data: currentPrompt } = await supabase
      .from('user_prompts')
      .select('prompt_text, answer_text')
      .eq('id', promptId)
      .single();

    if (currentPrompt) {
      const promptText = updates.prompt_text ?? currentPrompt.prompt_text;
      const answerText = updates.answer_text ?? currentPrompt.answer_text;
      const combinedText = `${promptText}: ${answerText}`;

      try {
        const embedding = await generateTextEmbedding(combinedText);
        updateData.text_embedding = embedding;
        updateData.embedding_generated_at = new Date().toISOString();
      } catch (error) {
        logger.warn('Failed to regenerate embedding for updated prompt', { error });
      }
    }
  }

  const { data, error } = await supabase
    .from('user_prompts')
    .update(updateData)
    .eq('id', promptId)
    .select()
    .single();

  if (error) {
    logger.error('Failed to update user prompt', { error, promptId });
    throw error;
  }

  return data;
}

/**
 * Delete user prompt
 * 
 * @param promptId - Prompt ID
 * @returns Promise resolving when deletion completes
 * @throws Error if deletion fails
 */
export async function deleteUserPrompt(promptId: string): Promise<void> {
  const { error } = await supabase
    .from('user_prompts')
    .delete()
    .eq('id', promptId);

  if (error) {
    logger.error('Failed to delete user prompt', { error, promptId });
    throw error;
  }
}

/**
 * Generate embedding for existing prompt (if missing)
 * 
 * @param promptId - Prompt ID
 * @returns Promise resolving to updated UserPrompt with embedding
 * @throws Error if generation fails
 */
export async function generatePromptEmbedding(promptId: string): Promise<UserPrompt> {
  // Get prompt
  const { data: prompt, error: fetchError } = await supabase
    .from('user_prompts')
    .select('*')
    .eq('id', promptId)
    .single();

  if (fetchError) {
    logger.error('Failed to fetch prompt for embedding generation', { error: fetchError, promptId });
    throw fetchError;
  }

  if (!prompt) {
    throw new Error('Prompt not found');
  }

  // Generate embedding
  const combinedText = `${prompt.prompt_text}: ${prompt.answer_text}`;
  const embedding = await generateTextEmbedding(combinedText);
  const embeddingGeneratedAt = new Date().toISOString();

  // Update prompt with embedding
  const { data, error } = await supabase
    .from('user_prompts')
    .update({
      text_embedding: embedding,
      embedding_generated_at: embeddingGeneratedAt,
    })
    .eq('id', promptId)
    .select()
    .single();

  if (error) {
    logger.error('Failed to update prompt with embedding', { error, promptId });
    throw error;
  }

  return data;
}

/**
 * Get prompts for multiple users (for duo profiles)
 * 
 * @param userIds - Array of user IDs
 * @returns Promise resolving to map of userId -> UserPrompt[]
 * @throws Error if query fails
 */
export async function getPromptsForUsers(userIds: string[]): Promise<Map<string, UserPrompt[]>> {
  if (userIds.length === 0) {
    return new Map();
  }

  const { data, error } = await supabase
    .from('user_prompts')
    .select('*')
    .in('user_id', userIds)
    .order('display_order', { ascending: true });

  if (error) {
    logger.error('Failed to get prompts for users', { error, userIds });
    throw error;
  }

  // Group by user_id
  const promptsByUser = new Map<string, UserPrompt[]>();
  for (const prompt of data || []) {
    const existing = promptsByUser.get(prompt.user_id) || [];
    existing.push(prompt);
    promptsByUser.set(prompt.user_id, existing);
  }

  // Ensure all userIds have an entry (even if empty)
  for (const userId of userIds) {
    if (!promptsByUser.has(userId)) {
      promptsByUser.set(userId, []);
    }
  }

  return promptsByUser;
}

