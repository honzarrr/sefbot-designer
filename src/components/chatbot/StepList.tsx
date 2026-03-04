'use client';

import { useState, useCallback } from 'react';
import { ChatbotStepData } from '@/types/chatbot';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Plus,
  GripVertical,
  MoreHorizontal,
  Copy,
  Trash2,
  Check,
  Palette,
  ChevronDown,
} from 'lucide-react';

const STEP_TYPE_LABELS: Record<string, string> = {
  button: 'Button',
  carousel: 'Carousel',
  email: 'Email',
  phone: 'Phone',
  location: 'Location',
  answer: 'Answer',
  logic: 'Logic',
  calendar: 'Calendar',
  stars: 'Stars',
  file: 'File',
};

interface StepListProps {
  steps: ChatbotStepData[];
  selectedStepId: string | null;
  selectedStepIds: Set<string>;
  onSelectStep: (id: string) => void;
  onToggleSelect: (id: string) => void;
  onAddStep: (type: string) => void;
  onDuplicateStep: (id: string) => void;
  onDeleteStep: (id: string) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
  onBulkColor: (color: string) => void;
  onBulkDuplicate: () => void;
  onBulkDelete: () => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
}

export function StepList({
  steps,
  selectedStepId,
  selectedStepIds,
  onSelectStep,
  onToggleSelect,
  onAddStep,
  onDuplicateStep,
  onDeleteStep,
  onReorder,
  onBulkColor,
  onBulkDuplicate,
  onBulkDelete,
  onSelectAll,
  onDeselectAll,
}: StepListProps) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [addMenuOpen, setAddMenuOpen] = useState(false);

  const handleDragStart = useCallback((e: React.DragEvent, index: number) => {
    setDragIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, targetIndex: number) => {
      e.preventDefault();
      if (dragIndex !== null && dragIndex !== targetIndex) {
        onReorder(dragIndex, targetIndex);
      }
      setDragIndex(null);
    },
    [dragIndex, onReorder]
  );

  const COLORS = [
    '#F44336', '#E91E63', '#9C27B0', '#673AB7', '#3F51B5',
    '#2196F3', '#009688', '#4CAF50', '#FF9800', '#607D8B',
  ];

  return (
    <div className="w-64 border-r flex flex-col bg-background">
      {/* Header */}
      <div className="p-3 border-b flex items-center justify-between">
        <span className="font-semibold text-sm">Steps</span>
        <DropdownMenu open={addMenuOpen} onOpenChange={setAddMenuOpen}>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="outline" className="h-7 gap-1">
              <Plus className="h-3 w-3" />
              Add
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {Object.entries(STEP_TYPE_LABELS).map(([key, label]) => (
              <DropdownMenuItem
                key={key}
                onClick={() => {
                  onAddStep(key);
                  setAddMenuOpen(false);
                }}
              >
                {label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Bulk ops bar */}
      {selectedStepIds.size > 0 && (
        <div className="px-3 py-2 border-b bg-blue-50 dark:bg-blue-900/20 flex items-center gap-1 flex-wrap">
          <span className="text-xs font-medium mr-1">
            <button className="underline" onClick={onSelectAll}>{selectedStepIds.size}</button> selected
          </span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline" className="h-6 text-xs gap-1">
                <Palette className="h-3 w-3" />
                Color
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <div className="grid grid-cols-5 gap-1 p-2">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    className="h-6 w-6 rounded-full border-2 border-transparent hover:border-foreground"
                    style={{ backgroundColor: c }}
                    onClick={() => onBulkColor(c)}
                  />
                ))}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button size="sm" variant="outline" className="h-6 text-xs" onClick={onBulkDuplicate}>
            <Copy className="h-3 w-3" />
          </Button>
          <Button size="sm" variant="outline" className="h-6 text-xs text-destructive" onClick={onBulkDelete}>
            <Trash2 className="h-3 w-3" />
          </Button>
          <Button size="sm" variant="ghost" className="h-6 text-xs ml-auto" onClick={onDeselectAll}>
            Clear
          </Button>
        </div>
      )}

      {/* Step list */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-0.5">
          {steps.map((step, index) => {
            const isSelected = selectedStepId === step.id;
            const isChecked = selectedStepIds.has(step.id);

            return (
              <div
                key={step.id}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, index)}
                className={`
                  flex items-center gap-1.5 px-2 py-1.5 rounded text-sm cursor-pointer group
                  ${isSelected ? 'bg-primary/10 ring-1 ring-primary/30' : 'hover:bg-muted'}
                  ${dragIndex === index ? 'opacity-50' : ''}
                `}
              >
                {/* Checkbox */}
                <button
                  className={`h-4 w-4 rounded border flex items-center justify-center shrink-0
                    ${isChecked ? 'bg-primary border-primary text-primary-foreground' : 'border-muted-foreground/30'}
                  `}
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleSelect(step.id);
                  }}
                >
                  {isChecked && <Check className="h-3 w-3" />}
                </button>

                {/* Drag handle */}
                <GripVertical className="h-3 w-3 text-muted-foreground/50 shrink-0 cursor-grab" />

                {/* Color dot */}
                <div
                  className="h-3 w-3 rounded-full shrink-0"
                  style={{ backgroundColor: step.color }}
                />

                {/* Step info */}
                <div
                  className="flex-1 min-w-0"
                  onClick={() => onSelectStep(step.id)}
                >
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-muted-foreground font-mono">
                      {step.number}.
                    </span>
                    <span className="truncate font-medium">{step.name}</span>
                  </div>
                </div>

                {/* Actions */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className="h-5 w-5 flex items-center justify-center rounded opacity-0 group-hover:opacity-100 hover:bg-muted-foreground/10"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreHorizontal className="h-3 w-3" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onDuplicateStep(step.id)}>
                      <Copy className="h-4 w-4 mr-2" />
                      Duplicate
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => onDeleteStep(step.id)}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            );
          })}

          {steps.length === 0 && (
            <div className="text-center text-xs text-muted-foreground py-8">
              No steps yet. Click Add to create one.
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
