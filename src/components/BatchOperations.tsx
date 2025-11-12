import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Trash2, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export interface BatchOperationItem {
  id: string;
  [key: string]: any;
}

interface BatchOperationsProps<T extends BatchOperationItem> {
  items: T[];
  onBatchDelete?: (ids: string[]) => Promise<void>;
  onBatchAction?: (ids: string[], action: string) => Promise<void>;
  renderItem: (item: T, isSelected: boolean, onToggle: () => void) => React.ReactNode;
  getItemId: (item: T) => string;
  batchActions?: Array<{
    label: string;
    action: string;
    icon?: React.ReactNode;
    variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  }>;
  className?: string;
}

/**
 * Batch Operations Component
 * Provides selection UI and batch actions for lists of items
 */
export function BatchOperations<T extends BatchOperationItem>({
  items,
  onBatchDelete,
  onBatchAction,
  renderItem,
  getItemId,
  batchActions = [],
  className,
}: BatchOperationsProps<T>) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);

  const toggleSelection = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    if (selectedIds.size === items.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map(getItemId)));
    }
  }, [items, selectedIds.size, getItemId]);

  const handleBatchDelete = useCallback(async () => {
    if (!onBatchDelete || selectedIds.size === 0) return;
    
    if (!confirm(`Are you sure you want to delete ${selectedIds.size} item(s)? This cannot be undone.`)) {
      return;
    }

    setIsProcessing(true);
    try {
      await onBatchDelete(Array.from(selectedIds));
      setSelectedIds(new Set());
      toast.success(`Deleted ${selectedIds.size} item(s)`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete items');
    } finally {
      setIsProcessing(false);
    }
  }, [selectedIds, onBatchDelete]);

  const handleBatchAction = useCallback(async (action: string) => {
    if (!onBatchAction || selectedIds.size === 0) return;

    setIsProcessing(true);
    try {
      await onBatchAction(Array.from(selectedIds), action);
      setSelectedIds(new Set());
      toast.success(`Action completed for ${selectedIds.size} item(s)`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to perform action');
    } finally {
      setIsProcessing(false);
    }
  }, [selectedIds, onBatchAction]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const isSelectionMode = selectedIds.size > 0;

  return (
    <div className={cn('space-y-4', className)}>
      {/* Batch Actions Bar */}
      {isSelectionMode && (
        <div className="sticky top-0 z-10 bg-card border-b border-border p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{selectedIds.size} selected</Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearSelection}
                disabled={isProcessing}
              >
                <X className="w-4 h-4 mr-1" />
                Clear
              </Button>
            </div>
            <div className="flex items-center gap-2">
              {onBatchDelete && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleBatchDelete}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4 mr-2" />
                  )}
                  Delete ({selectedIds.size})
                </Button>
              )}
              {batchActions.map((batchAction) => (
                <Button
                  key={batchAction.action}
                  variant={batchAction.variant || 'outline'}
                  size="sm"
                  onClick={() => handleBatchAction(batchAction.action)}
                  disabled={isProcessing}
                >
                  {batchAction.icon && <span className="mr-2">{batchAction.icon}</span>}
                  {batchAction.label}
                </Button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Select All Toggle */}
      {items.length > 0 && (
        <div className="flex items-center gap-2 px-2">
          <Checkbox
            checked={selectedIds.size === items.length && items.length > 0}
            onCheckedChange={toggleAll}
            disabled={isProcessing}
          />
          <span className="text-sm text-muted-foreground">
            Select all ({items.length})
          </span>
        </div>
      )}

      {/* Items List */}
      <div className="space-y-2">
        {items.map((item) => {
          const id = getItemId(item);
          const isSelected = selectedIds.has(id);
          return (
            <div key={id}>
              {renderItem(item, isSelected, () => toggleSelection(id))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

