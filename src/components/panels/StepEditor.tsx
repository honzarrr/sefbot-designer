'use client';

import { useState, useCallback } from 'react';
import { useDesignerStore } from '@/stores/designerStore';
import type { Step, BlockType } from '@/types';
import ColorPicker from './ColorPicker';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Plus, Trash2, Type, MousePointerClick, MessageSquare } from 'lucide-react';

interface StepEditorProps {
  step: Step;
}

export function StepEditor({ step }: StepEditorProps) {
  const updateStep = useDesignerStore((s) => s.updateStep);
  const addBlock = useDesignerStore((s) => s.addBlock);
  const deleteBlock = useDesignerStore((s) => s.deleteBlock);
  const [name, setName] = useState(step.name);

  const handleNameBlur = useCallback(() => {
    if (name.trim() && name !== step.name) {
      updateStep(step.id, { name: name.trim() });
    }
  }, [name, step.id, step.name, updateStep]);

  const handleColorChange = useCallback(
    (color: string) => {
      updateStep(step.id, { color });
    },
    [step.id, updateStep]
  );

  const hasTerminalBlock = step.blocks.some(
    (b) => b.type === 'buttons' || b.type === 'user-input'
  );

  const blockTypeItems: { type: BlockType; label: string; icon: React.ReactNode; disabled?: boolean }[] = [
    { type: 'text', label: 'Text', icon: <Type className="w-4 h-4" /> },
    {
      type: 'buttons',
      label: 'Buttons',
      icon: <MousePointerClick className="w-4 h-4" />,
      disabled: hasTerminalBlock,
    },
    {
      type: 'user-input',
      label: 'User Input',
      icon: <MessageSquare className="w-4 h-4" />,
      disabled: hasTerminalBlock,
    },
  ];

  return (
    <div className="p-4 space-y-4">
      <div>
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Step Name
        </label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={handleNameBlur}
          onKeyDown={(e) => e.key === 'Enter' && handleNameBlur()}
          className="mt-1"
        />
      </div>

      <div>
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Color
        </label>
        <div className="mt-2">
          <ColorPicker value={step.color} onChange={handleColorChange} />
        </div>
      </div>

      <Separator />

      <div>
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Blocks
          </label>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6">
                <Plus className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {blockTypeItems.map((item) => (
                <DropdownMenuItem
                  key={item.type}
                  onClick={() => addBlock(step.id, item.type)}
                  disabled={item.disabled}
                >
                  {item.icon}
                  <span className="ml-2">{item.label}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="mt-2 space-y-1">
          {step.blocks.length === 0 && (
            <p className="text-xs text-muted-foreground py-2">No blocks yet</p>
          )}
          {step.blocks.map((block) => (
            <div
              key={block.id}
              className="flex items-center justify-between text-sm px-2 py-1.5 rounded border bg-card"
            >
              <div className="flex items-center gap-2 truncate">
                {block.type === 'text' && <Type className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
                {block.type === 'buttons' && <MousePointerClick className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
                {block.type === 'user-input' && <MessageSquare className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
                <span className="text-xs truncate">
                  {block.type === 'text'
                    ? block.content.replace(/<[^>]*>/g, '').slice(0, 30) || 'Empty text'
                    : block.type === 'buttons'
                    ? `${block.buttons.length} button(s)`
                    : 'User input'}
                </span>
              </div>
              <button
                onClick={() => deleteBlock(step.id, block.id)}
                className="text-muted-foreground hover:text-red-500 transition-colors shrink-0"
                title="Delete block"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
