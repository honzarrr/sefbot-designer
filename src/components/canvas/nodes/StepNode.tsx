'use client';

import { memo, useState, useCallback } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { StepNodeType } from '@/types';
import { useDesignerStore } from '@/stores/designerStore';
import TextBlock from '@/components/canvas/blocks/TextBlock';
import ButtonsBlock from '@/components/canvas/blocks/ButtonsBlock';
import UserInputBlock from '@/components/canvas/blocks/UserInputBlock';
import { Plus, Copy, Trash2 } from 'lucide-react';

function StepNodeComponent({ data, id }: NodeProps<StepNodeType>) {
  const { step } = data;
  const updateStep = useDesignerStore((s) => s.updateStep);
  const deleteStep = useDesignerStore((s) => s.deleteStep);
  const duplicateStep = useDesignerStore((s) => s.duplicateStep);
  const addBlock = useDesignerStore((s) => s.addBlock);

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(step.name);
  const [hovered, setHovered] = useState(false);

  const handleDoubleClick = useCallback(() => {
    setEditName(step.name);
    setIsEditing(true);
  }, [step.name]);

  const handleBlur = useCallback(() => {
    setIsEditing(false);
    if (editName.trim() && editName !== step.name) {
      updateStep(id, { name: editName.trim() });
    }
  }, [editName, step.name, id, updateStep]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleBlur();
      } else if (e.key === 'Escape') {
        setIsEditing(false);
        setEditName(step.name);
      }
    },
    [handleBlur, step.name]
  );

  // Check if step has buttons or user-input block (terminal block)
  const hasTerminalBlock = step.blocks.some(
    (b) => b.type === 'buttons' || b.type === 'user-input'
  );

  return (
    <div
      className="relative min-w-[220px] max-w-[300px] rounded-lg bg-white shadow-md border border-gray-200"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-gray-400 !border-2 !border-white"
      />

      {/* Colored Header Bar */}
      <div
        className="rounded-t-lg px-3 py-2 flex items-center justify-between"
        style={{ backgroundColor: step.color }}
        onDoubleClick={handleDoubleClick}
      >
        {isEditing ? (
          <input
            className="bg-transparent text-white text-sm font-semibold outline-none border-b border-white/50 w-full"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            autoFocus
          />
        ) : (
          <span className="text-white text-sm font-semibold truncate">{step.name}</span>
        )}
      </div>

      {/* Block Content Area - using block components */}
      <div className="px-3 py-2 space-y-1">
        {step.blocks.map((block) => {
          if (block.type === 'text') {
            return <TextBlock key={block.id} stepId={id} block={block} />;
          }
          if (block.type === 'buttons') {
            return (
              <div key={block.id}>
                <ButtonsBlock stepId={id} block={block} />
                {/* React Flow Handles for each button - must be in the node component */}
                {block.buttons.map((btn) => (
                  <Handle
                    key={btn.id}
                    type="source"
                    position={Position.Right}
                    id={`button-${btn.id}`}
                    className="!w-2.5 !h-2.5 !bg-blue-400 !border-2 !border-white"
                    style={{ top: 'auto', right: -6 }}
                  />
                ))}
              </div>
            );
          }
          if (block.type === 'user-input') {
            return <UserInputBlock key={block.id} block={block} />;
          }
          return null;
        })}

        {step.blocks.length === 0 && (
          <div className="text-xs text-gray-400 py-2 text-center">No blocks</div>
        )}
      </div>

      {/* Hover Actions */}
      {hovered && (
        <div className="absolute -top-3 right-1 flex gap-1">
          <button
            onClick={() => addBlock(id, 'text')}
            className="w-5 h-5 rounded bg-white shadow border border-gray-200 text-gray-500 text-xs flex items-center justify-center hover:bg-gray-50"
            title="Add block"
          >
            <Plus className="w-3 h-3" />
          </button>
          <button
            onClick={() => duplicateStep(id)}
            className="w-5 h-5 rounded bg-white shadow border border-gray-200 text-gray-500 text-xs flex items-center justify-center hover:bg-gray-50"
            title="Duplicate"
          >
            <Copy className="w-3 h-3" />
          </button>
          <button
            onClick={() => deleteStep(id)}
            className="w-5 h-5 rounded bg-white shadow border border-gray-200 text-red-500 text-xs flex items-center justify-center hover:bg-red-50"
            title="Delete"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Default output handle only when no terminal block (buttons/user-input) */}
      {!hasTerminalBlock && (
        <Handle
          type="source"
          position={Position.Right}
          className="!w-3 !h-3 !bg-blue-400 !border-2 !border-white"
        />
      )}
    </div>
  );
}

export default memo(StepNodeComponent);
