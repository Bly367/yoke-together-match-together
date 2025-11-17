import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getUserPrompts,
  createUserPrompt,
  updateUserPrompt,
  deleteUserPrompt,
  generatePromptEmbedding,
  getPromptsForUsers,
  type UserPrompt,
  type PromptTemplate,
  PROMPT_TEMPLATES,
} from '@/services/prompt.service';
import { logger } from '@/lib/logger';

/**
 * Hook to get all prompts for a user
 */
export function useUserPrompts(userId: string | null) {
  return useQuery({
    queryKey: ['user-prompts', userId],
    queryFn: () => {
      if (!userId) throw new Error('User ID is required');
      return getUserPrompts(userId);
    },
    enabled: !!userId,
  });
}

/**
 * Hook to create a user prompt
 */
export function useCreatePrompt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      userId,
      promptText,
      answerText,
      displayOrder,
      generateEmbedding,
    }: {
      userId: string;
      promptText: string;
      answerText: string;
      displayOrder?: number;
      generateEmbedding?: boolean;
    }) => createUserPrompt(userId, promptText, answerText, displayOrder, generateEmbedding),
    onSuccess: async (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['user-prompts', variables.userId] });
      logger.info('Prompt created successfully', { promptId: data.id });
      
      // Automatically compute user embedding after prompt is added (async)
      try {
        const { computeUserEmbedding } = await import('@/services/preferenceLearning.service');
        computeUserEmbedding(variables.userId).catch((err) => {
          logger.warn('Failed to compute user embedding after prompt creation', { error: err });
        });
      } catch (err) {
        // Ignore errors in embedding computation
      }
    },
    onError: (error) => {
      logger.error('Failed to create prompt', { error });
    },
  });
}

/**
 * Hook to update a prompt
 */
export function useUpdatePrompt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      promptId,
      updates,
    }: {
      promptId: string;
      updates: {
        prompt_text?: string;
        answer_text?: string;
        display_order?: number;
      };
    }) => updateUserPrompt(promptId, updates),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['user-prompts', data.user_id] });
    },
  });
}

/**
 * Hook to delete a prompt
 */
export function useDeletePrompt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (promptId: string) => deleteUserPrompt(promptId),
    onSuccess: (_, promptId) => {
      queryClient.invalidateQueries({ queryKey: ['user-prompts'] });
      logger.info('Prompt deleted successfully', { promptId });
    },
  });
}

/**
 * Hook to generate embedding for a prompt
 */
export function useGeneratePromptEmbedding() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (promptId: string) => generatePromptEmbedding(promptId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['user-prompts', data.user_id] });
    },
  });
}

/**
 * Hook to get prompts for multiple users (for duo profiles)
 */
export function usePromptsForUsers(userIds: string[]) {
  return useQuery({
    queryKey: ['prompts-for-users', userIds.sort().join(',')],
    queryFn: () => getPromptsForUsers(userIds),
    enabled: userIds.length > 0,
  });
}

/**
 * Export prompt templates for use in components
 */
export { PROMPT_TEMPLATES, type PromptTemplate };

