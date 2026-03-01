'use client';

import { memo, useState, useCallback, useRef, useEffect } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { StepNodeType, BlockType } from '@/types';
import { STEP_COLORS } from '@/types';
import { useDesignerStore } from '@/stores/designerStore';
import TextBlock from '@/components/canvas/blocks/TextBlock';
import ButtonsBlock from '@/components/canvas/blocks/ButtonsBlock';
import UserInputBlock from '@/components/canvas/blocks/UserInputBlock';
import {
  Plus,
  Copy,
  Trash2,
  Type,
  MousePointerClick,
  MessageSquare,
  Palette,
  ChevronDown,
} from 'lucide-react';

function StepNodeComponent({ id }: NodeProps<StepNodeType>) {
  // Read step directly from store so we always get fresh data
  const step = useDesignerStore((s) => s.project?.steps.find((st) => st.id === id));
  const updateStep = useDesignerStore((s) => s.updateStep);
  const deleteStep = useDesignerStore((s) => s.deleteStep);
  const duplicateStep = useDesignerStore((s) => s.duplicateStep);
  const addBlock = useDesignerStore((s) => s.addBlock);

  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState(step?.name || '');
  const [hovered, setHovered] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showAddBlock, setShowAddBlock] = useState(false);
  const colorPickerRef = useRef<HTMLDivElement>(null);
  const addBlockRef = useRef<HTMLDivElement>(null);

  // Sync editName when step name changes externally
  useEffect(() => {
    if (step && !isEditingName) {
      setEditName(step.name);
    }
  }, [step, isEditingName]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (colorPickerRef.current && !colorPickerRef.current.contains(e.target as Node)) {
        setShowColorPicker(false);
      }
      if (addBlockRef.current && !addBlockRef.current.contains(e.target as Node)) {
        setShowAddBlock(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleDoubleClickName = useCallback(() => {
    if (!step) return;
    setEditName(step.name);
    setIsEditingName(true);
  }, [step]);

  const handleNameBlur = useCallback(() => {
    setIsEditingName(false);
    if (step && editName.trim() && editName !== step.name) {
      updateStep(id, { name: editName.trim() });
    }
  }, [editName, step, id, updateStep]);

  const handleNameKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      e.stopPropagation();
      if (e.key === 'Enter') {
        handleNameBlur();
      } else if (e.key === 'Escape') {
        setIsEditingName(false);
        if (step) setEditName(step.name);
      }
    },
    [handleNameBlur, step]
  );

  const handleColorChange = useCallback(
    (color: string) => {
      updateStep(id, { color });
      setShowColorPicker(false);
    },
    [id, updateStep]
  );

  const handleAddBlock = useCallback(
    (type: BlockType) => {
      addBlock(id, type);
      setShowAddBlock(false);
    },
    [id, addBlock]
  );

  if (!step) return null;

  const hasTerminalBlock = step.blocks.some(
    (b) => b.type === 'buttons' || b.type === 'user-input'
  );

  return (
    <div
      className="relative min-w-[240px] max-w-[320px] rounded-lg bg-white shadow-md border border-gray-200"
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
        className="rounded-t-lg px-3 py-2 flex items-center gap-2"
        style={{ backgroundColor: step.color }}
      >
        {isEditingName ? (
          <input
            className="bg-transparent text-white text-sm font-semibold outline-none border-b border-white/50 w-full nopan nodrag"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={handleNameBlur}
            onKeyDown={handleNameKeyDown}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            autoFocus
          />
        ) : (
          <span
            className="text-white text-sm font-semibold truncate flex-1 cursor-text"
            onDoubleClick={handleDoubleClickName}
          >
            {step.name}
          </span>
        )}

        {/* Color picker toggle in header */}
        <div className="relative" ref={colorPickerRef}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowColorPicker(!showColorPicker);
            }}
            onMouseDown={(e) => e.stopPropagation()}
            className="w-5 h-5 rounded flex items-center justify-center text-white/70 hover:text-white hover:bg-white/20 transition-colors nopan nodrag"
            title="Change color"
          >
            <Palette className="w-3.5 h-3.5" />
          </button>
          {showColorPicker && (
            <div
              className="absolute right-0 top-7 z-50 bg-white rounded-lg shadow-lg border border-gray-200 p-2 w-[140px]"
              onMouseDown={(e) => e.stopPropagation()}
            >
              <div className="flex flex-wrap gap-1.5">
                {STEP_COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleColorChange(color);
                    }}
                    className="w-5 h-5 rounded-full border-2 transition-transform hover:scale-110"
                    style={{
                      backgroundColor: color,
                      borderColor: step.color === color ? '#000' : 'transparent',
                    }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Block Content Area */}
      <div className="px-3 py-2 space-y-1 nodrag nopan">
        {step.blocks.map((block) => {
          if (block.type === 'text') {
            return <TextBlock key={block.id} stepId={id} block={block} />;
          }
          if (block.type === 'buttons') {
            return (
              <div key={block.id}>
                <ButtonsBlock stepId={id} block={block} />
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
            return <UserInputBlock key={block.id} stepId={id} block={block} />;
          }
          return null;
        })}

        {step.blocks.length === 0 && (
          <div className="text-xs text-gray-400 py-2 text-center">
            Click &quot;Add block&quot; below
          </div>
        )}
      </div>

      {/* Inline Add Block Bar */}
      <div className="px-3 pb-2 nodrag nopan" ref={addBlockRef}>
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowAddBlock(!showAddBlock);
            }}
            onMouseDown={(e) => e.stopPropagation()}
            className="w-full flex items-center justify-center gap-1 text-xs text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded py-1 transition-colors border border-dashed border-gray-200 hover:border-gray-300"
          >
            <Plus className="w-3 h-3" />
            Add block
            <ChevronDown className="w-3 h-3" />
          </button>
          {showAddBlock && (
            <div
              className="absolute left-0 right-0 bottom-full mb-1 z-50 bg-white rounded-lg shadow-lg border border-gray-200 py-1"
              onMouseDown={(e) => e.stopPropagation()}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleAddBlock('text');
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Type className="w-3.5 h-3.5 text-gray-500" />
                Text
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleAddBlock('buttons');
                }}
                disabled={hasTerminalBlock}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <MousePointerClick className="w-3.5 h-3.5 text-gray-500" />
                Buttons
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleAddBlock('user-input');
                }}
                disabled={hasTerminalBlock}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <MessageSquare className="w-3.5 h-3.5 text-gray-500" />
                User Input
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Hover Actions - top right corner */}
      {hovered && (
        <div className="absolute -top-3 right-1 flex gap-1 nopan nodrag">
          <button
            onClick={(e) => {
              e.stopPropagation();
              duplicateStep(id);
            }}
            onMouseDown={(e) => e.stopPropagation()}
            className="w-5 h-5 rounded bg-white shadow border border-gray-200 text-gray-500 text-xs flex items-center justify-center hover:bg-gray-50"
            title="Duplicate"
          >
            <Copy className="w-3 h-3" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              deleteStep(id);
            }}
            onMouseDown={(e) => e.stopPropagation()}
            className="w-5 h-5 rounded bg-white shadow border border-gray-200 text-red-500 text-xs flex items-center justify-center hover:bg-red-50"
            title="Delete"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Default output handle only when no terminal block */}
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
