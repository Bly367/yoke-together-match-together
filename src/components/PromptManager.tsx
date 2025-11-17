import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUserPrompts, useCreatePrompt, useDeletePrompt, useUpdatePrompt, PROMPT_TEMPLATES } from '@/hooks/usePrompts';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, Plus, X, Edit2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { UserPrompt } from '@/services/prompt.service';

interface PromptManagerProps {
  userId: string;
  maxPrompts?: number;
  minPrompts?: number;
  className?: string;
}

/**
 * Prompt manager component for managing user prompts
 * Supports 3 prompts with predefined templates
 */
export function PromptManager({
  userId,
  maxPrompts = 3,
  minPrompts = 3,
  className,
}: PromptManagerProps) {
  const { user } = useAuth();
  const { data: prompts = [], isLoading } = useUserPrompts(userId);
  const createPrompt = useCreatePrompt();
  const updatePrompt = useUpdatePrompt();
  const deletePrompt = useDeletePrompt();

  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingPromptId, setEditingPromptId] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [answerText, setAnswerText] = useState('');

  const sortedPrompts = [...prompts].sort((a, b) => a.display_order - b.display_order);
  const canAddMore = sortedPrompts.length < maxPrompts;
  const availableTemplates = PROMPT_TEMPLATES.filter(
    template => !sortedPrompts.some(p => p.prompt_text === template)
  );

  const handleCreatePrompt = async () => {
    if (!user || !selectedTemplate || !answerText.trim()) {
      toast.error('Please select a prompt and provide an answer');
      return;
    }

    try {
      await createPrompt.mutateAsync({
        userId: user.id,
        promptText: selectedTemplate,
        answerText: answerText.trim(),
        displayOrder: sortedPrompts.length,
        generateEmbedding: true,
      });
      toast.success('Prompt added!');
      
      // Only clear form if we've reached max prompts, otherwise keep template selected
      // so user can easily add another prompt
      if (sortedPrompts.length + 1 >= maxPrompts) {
        setSelectedTemplate('');
        setAnswerText('');
      } else {
        // Keep template selected, but clear answer so they can add another prompt
        setAnswerText('');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to add prompt');
    }
  };

  const handleUpdatePrompt = async (promptId: string, newPromptText?: string, newAnswer?: string) => {
    if (newAnswer !== undefined && !newAnswer.trim()) {
      toast.error('Answer cannot be empty');
      return;
    }

    try {
      const updates: {
        prompt_text?: string;
        answer_text?: string;
      } = {};
      
      if (newPromptText !== undefined) {
        updates.prompt_text = newPromptText.trim();
      }
      if (newAnswer !== undefined) {
        updates.answer_text = newAnswer.trim();
      }

      await updatePrompt.mutateAsync({
        promptId,
        updates,
      });
      toast.success('Prompt updated!');
      setEditingIndex(null);
      setEditingPromptId(null);
      setSelectedTemplate('');
      setAnswerText('');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update prompt');
    }
  };

  const handleDeletePrompt = async (promptId: string) => {
    if (!confirm('Are you sure you want to delete this prompt?')) {
      return;
    }

    try {
      await deletePrompt.mutateAsync(promptId);
      toast.success('Prompt deleted');
      
      // Show warning if below minimum
      const remainingCount = sortedPrompts.length - 1;
      if (remainingCount < minPrompts) {
        toast.warning(`You have ${remainingCount} prompt${remainingCount !== 1 ? 's' : ''}. Please add at least ${minPrompts} prompts.`);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete prompt');
    }
  };

  if (isLoading) {
    return (
      <div className={cn('flex items-center justify-center p-8', className)}>
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Prompts</h3>
          <p className="text-sm text-muted-foreground">
            Add {minPrompts} prompts ({sortedPrompts.length}/{maxPrompts})
          </p>
        </div>
      </div>

      {/* Warning if below minimum */}
      {sortedPrompts.length < minPrompts && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-4">
          <p className="text-sm text-yellow-600 dark:text-yellow-400 font-medium">
            ⚠️ You have {sortedPrompts.length} prompt{sortedPrompts.length !== 1 ? 's' : ''}. Please add at least {minPrompts} prompts.
          </p>
        </div>
      )}

      {/* Existing Prompts */}
      <div className="space-y-4">
        {sortedPrompts.map((prompt, index) => (
          <Card key={prompt.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <CardTitle className="text-base font-semibold">
                  {prompt.prompt_text}
                </CardTitle>
                <div className="flex gap-2">
                  {editingIndex === index ? (
                    <>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (selectedTemplate && selectedTemplate !== prompt.prompt_text) {
                            handleUpdatePrompt(prompt.id, selectedTemplate, answerText);
                          } else {
                            handleUpdatePrompt(prompt.id, undefined, answerText);
                          }
                        }}
                        disabled={!answerText.trim()}
                      >
                        Save
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingIndex(null);
                          setEditingPromptId(null);
                          setSelectedTemplate('');
                          setAnswerText('');
                        }}
                      >
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingIndex(index);
                          setEditingPromptId(prompt.id);
                          setSelectedTemplate(prompt.prompt_text);
                          setAnswerText(prompt.answer_text);
                        }}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeletePrompt(prompt.id)}
                        title="Delete prompt"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {editingIndex === index ? (
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Prompt Template</Label>
                    <Select 
                      value={selectedTemplate} 
                      onValueChange={setSelectedTemplate}
                    >
                      <SelectTrigger className="rounded-2xl">
                        <SelectValue placeholder="Select a prompt template" />
                      </SelectTrigger>
                      <SelectContent>
                        {PROMPT_TEMPLATES.map((template) => (
                          <SelectItem 
                            key={template} 
                            value={template}
                            disabled={sortedPrompts.some(p => p.prompt_text === template && p.id !== prompt.id)}
                          >
                            {template}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Your Answer</Label>
                    <Textarea
                      value={answerText}
                      onChange={(e) => setAnswerText(e.target.value)}
                      placeholder="Your answer..."
                      rows={3}
                      className="rounded-2xl"
                      autoFocus
                    />
                  </div>
                </div>
              ) : (
                <p className="text-foreground">{prompt.answer_text}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Add New Prompt */}
      {canAddMore && (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="text-base">
              {selectedTemplate ? 'Add Another Prompt' : 'Add a Prompt'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                <SelectTrigger className="rounded-2xl">
                  <SelectValue placeholder="Select a prompt template" />
                </SelectTrigger>
                <SelectContent>
                  {availableTemplates.map((template) => (
                    <SelectItem key={template} value={template}>
                      {template}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedTemplate && (
              <>
                <Textarea
                  value={answerText}
                  onChange={(e) => setAnswerText(e.target.value)}
                  placeholder="Your answer..."
                  rows={3}
                  className="rounded-2xl"
                  autoFocus
                />
                <div className="flex gap-2">
                  <Button
                    type="button"
                    onClick={handleCreatePrompt}
                    disabled={!answerText.trim() || createPrompt.isPending}
                    className="flex-1"
                  >
                    {createPrompt.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Adding...
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Prompt
                      </>
                    )}
                  </Button>
                  {sortedPrompts.length > 0 && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setSelectedTemplate('');
                        setAnswerText('');
                      }}
                      disabled={createPrompt.isPending}
                    >
                      Clear
                    </Button>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {sortedPrompts.length < minPrompts && (
        <p className="text-sm text-destructive">
          Please add at least {minPrompts} prompts
        </p>
      )}
    </div>
  );
}

