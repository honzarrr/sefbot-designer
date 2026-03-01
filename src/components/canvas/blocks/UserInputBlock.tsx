'use client';

import { memo, useState, useCallback } from 'react';
import { useDesignerStore } from '@/stores/designerStore';
import type { UserInputBlock as UserInputBlockType } from '@/types';
import { MessageSquare, Trash2 } from 'lucide-react';

interface UserInputBlockProps {
  stepId: string;
  block: UserInputBlockType;
}

function UserInputBlockComponent({ stepId, block }: UserInputBlockProps) {
  const updateBlock = useDesignerStore((s) => s.updateBlock);
  const deleteBlock = useDesignerStore((s) => s.deleteBlock);
  const [isEditing, setIsEditing] = useState(false);
  const [editPlaceholder, setEditPlaceholder] = useState(block.placeholder || '');
  const [hovered, setHovered] = useState(false);

  const commitEdit = useCallback(() => {
    setIsEditing(false);
    updateBlock(stepId, block.id, { placeholder: editPlaceholder.trim() || undefined });
  }, [stepId, block.id, editPlaceholder, updateBlock]);

  return (
    <div
      className="relative pt-1 border-t border-gray-100 nopan nodrag"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        className="flex items-center gap-2 text-xs text-gray-400 italic bg-gray-50 rounded px-2 py-1.5 border border-dashed border-gray-200 cursor-text"
        onClick={(e) => {
          e.stopPropagation();
          setEditPlaceholder(block.placeholder || '');
          setIsEditing(true);
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <MessageSquare className="w-3 h-3 shrink-0" />
        {isEditing ? (
          <input
            className="flex-1 bg-transparent outline-none text-xs not-italic text-gray-600 border-b border-gray-300 nopan nodrag"
            value={editPlaceholder}
            onChange={(e) => setEditPlaceholder(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === 'Enter') commitEdit();
              if (e.key === 'Escape') setIsEditing(false);
            }}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            placeholder="Placeholder text..."
            autoFocus
          />
        ) : (
          <span>{block.placeholder || 'User types here...'}</span>
        )}
      </div>

      {/* Delete on hover */}
      {hovered && !isEditing && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            deleteBlock(stepId, block.id);
          }}
          onMouseDown={(e) => e.stopPropagation()}
          className="absolute -right-1 top-1 w-5 h-5 rounded bg-white shadow border border-gray-200 text-red-500 flex items-center justify-center hover:bg-red-50"
          title="Delete"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}

export default memo(UserInputBlockComponent);
