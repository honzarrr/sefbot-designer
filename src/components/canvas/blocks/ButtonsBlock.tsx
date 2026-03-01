'use client';

import { memo, useState, useCallback } from 'react';
import { useDesignerStore } from '@/stores/designerStore';
import type { ButtonsBlock as ButtonsBlockType } from '@/types';
import { Plus, Trash2, GripVertical } from 'lucide-react';

interface ButtonsBlockProps {
  stepId: string;
  block: ButtonsBlockType;
}

function ButtonsBlockComponent({ stepId, block }: ButtonsBlockProps) {
  const addButton = useDesignerStore((s) => s.addButton);
  const deleteButton = useDesignerStore((s) => s.deleteButton);
  const updateButtonLabel = useDesignerStore((s) => s.updateButtonLabel);
  const deleteBlock = useDesignerStore((s) => s.deleteBlock);
  const reorderButtons = useDesignerStore((s) => s.reorderButtons);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [hovered, setHovered] = useState(false);

  const startEdit = useCallback((btnId: string, label: string) => {
    setEditingId(btnId);
    setEditLabel(label);
  }, []);

  const commitEdit = useCallback(() => {
    if (editingId && editLabel.trim()) {
      updateButtonLabel(stepId, block.id, editingId, editLabel.trim());
    }
    setEditingId(null);
  }, [editingId, editLabel, stepId, block.id, updateButtonLabel]);

  const handleDragStart = useCallback((e: React.DragEvent, idx: number) => {
    setDragIdx(idx);
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, targetIdx: number) => {
      e.preventDefault();
      e.stopPropagation();
      if (dragIdx === null || dragIdx === targetIdx) return;
      const ids = block.buttons.map((b) => b.id);
      const [moved] = ids.splice(dragIdx, 1);
      ids.splice(targetIdx, 0, moved);
      reorderButtons(stepId, block.id, ids);
      setDragIdx(null);
    },
    [dragIdx, block.buttons, block.id, stepId, reorderButtons]
  );

  return (
    <div
      className="relative space-y-1 pt-1 border-t border-gray-100"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {block.buttons.map((btn, idx) => (
        <div
          key={btn.id}
          className="relative flex items-center gap-1 text-xs bg-gray-50 rounded px-1 py-1 text-gray-700 border border-gray-200 group"
          draggable
          onDragStart={(e) => handleDragStart(e, idx)}
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onDrop={(e) => handleDrop(e, idx)}
        >
          <GripVertical className="w-3 h-3 text-gray-300 cursor-grab shrink-0" />

          {editingId === btn.id ? (
            <input
              className="flex-1 bg-transparent outline-none text-xs border-b border-gray-300"
              value={editLabel}
              onChange={(e) => setEditLabel(e.target.value)}
              onBlur={commitEdit}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === 'Enter') commitEdit();
                if (e.key === 'Escape') setEditingId(null);
              }}
              onClick={(e) => e.stopPropagation()}
              autoFocus
            />
          ) : (
            <span
              className="flex-1 truncate cursor-text"
              onClick={(e) => {
                e.stopPropagation();
                startEdit(btn.id, btn.label);
              }}
            >
              {btn.label}
            </span>
          )}

          {/* Small dot - visual indicator for where Handle goes */}
          <div className="w-2 h-2 rounded-full bg-blue-400 shrink-0" />

          {/* Delete button on hover */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              deleteButton(stepId, block.id, btn.id);
            }}
            className="w-4 h-4 rounded text-red-400 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
            title="Delete button"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      ))}

      <div className="flex items-center gap-1">
        <button
          onClick={(e) => {
            e.stopPropagation();
            addButton(stepId, block.id);
          }}
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors px-1 py-0.5"
        >
          <Plus className="w-3 h-3" />
          Add button
        </button>
      </div>

      {/* Delete block on hover */}
      {hovered && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            deleteBlock(stepId, block.id);
          }}
          className="absolute -right-1 -top-1 w-5 h-5 rounded bg-white shadow border border-gray-200 text-red-500 flex items-center justify-center hover:bg-red-50"
          title="Delete buttons block"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}

export default memo(ButtonsBlockComponent);
