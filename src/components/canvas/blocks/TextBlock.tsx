'use client';

import { memo, useState, useCallback } from 'react';
import { useDesignerStore } from '@/stores/designerStore';
import { InlineTextEditor } from '@/components/shared/InlineTextEditor';
import type { TextBlock as TextBlockType } from '@/types';
import { Trash2, Copy } from 'lucide-react';

interface TextBlockProps {
  stepId: string;
  block: TextBlockType;
}

function TextBlockComponent({ stepId, block }: TextBlockProps) {
  const updateBlock = useDesignerStore((s) => s.updateBlock);
  const deleteBlock = useDesignerStore((s) => s.deleteBlock);
  const duplicateBlock = useDesignerStore((s) => s.duplicateBlock);
  const [isEditing, setIsEditing] = useState(false);
  const [hovered, setHovered] = useState(false);

  const handleChange = useCallback(
    (content: string) => {
      updateBlock(stepId, block.id, { content });
    },
    [stepId, block.id, updateBlock]
  );

  return (
    <div
      className="relative group py-1"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {isEditing ? (
        <InlineTextEditor
          value={block.content}
          onChange={handleChange}
          placeholder="Enter text..."
          className="text-xs text-gray-700 px-1 rounded bg-gray-50 border border-gray-200 py-1"
        />
      ) : (
        <div
          className="text-xs text-gray-600 py-1 cursor-text"
          onDoubleClick={() => setIsEditing(true)}
          dangerouslySetInnerHTML={{
            __html: block.content || '<span class="text-gray-400">Empty text...</span>',
          }}
        />
      )}

      {/* Hover actions */}
      {hovered && !isEditing && (
        <div className="absolute -right-1 top-0 flex gap-0.5">
          <button
            onClick={() => duplicateBlock(stepId, block.id)}
            className="w-5 h-5 rounded bg-white shadow border border-gray-200 text-gray-500 flex items-center justify-center hover:bg-gray-50"
            title="Duplicate"
          >
            <Copy className="w-3 h-3" />
          </button>
          <button
            onClick={() => deleteBlock(stepId, block.id)}
            className="w-5 h-5 rounded bg-white shadow border border-gray-200 text-red-500 flex items-center justify-center hover:bg-red-50"
            title="Delete"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Click outside to stop editing */}
      {isEditing && (
        <div
          className="fixed inset-0 z-[-1]"
          onClick={() => setIsEditing(false)}
        />
      )}
    </div>
  );
}

export default memo(TextBlockComponent);
