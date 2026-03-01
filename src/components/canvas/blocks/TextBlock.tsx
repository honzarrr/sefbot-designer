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
        <div className="relative">
          <InlineTextEditor
            value={block.content}
            onChange={handleChange}
            placeholder="Enter text..."
            className="text-xs text-gray-700 px-2 rounded bg-blue-50 border border-blue-200 py-1.5 min-h-[2em]"
          />
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsEditing(false);
            }}
            className="absolute -top-2 -right-2 w-4 h-4 rounded-full bg-gray-500 text-white flex items-center justify-center text-[8px] hover:bg-gray-700 z-10"
            title="Done editing"
          >
            ✓
          </button>
        </div>
      ) : (
        <div
          className="text-xs text-gray-600 py-1.5 px-2 cursor-text rounded hover:bg-gray-50 transition-colors min-h-[1.5em]"
          onClick={(e) => {
            e.stopPropagation();
            setIsEditing(true);
          }}
          dangerouslySetInnerHTML={{
            __html: block.content || '<span class="text-gray-400 italic">Click to add text...</span>',
          }}
        />
      )}

      {/* Hover actions */}
      {hovered && !isEditing && (
        <div className="absolute -right-1 top-0 flex gap-0.5">
          <button
            onClick={(e) => {
              e.stopPropagation();
              duplicateBlock(stepId, block.id);
            }}
            className="w-5 h-5 rounded bg-white shadow border border-gray-200 text-gray-500 flex items-center justify-center hover:bg-gray-50"
            title="Duplicate"
          >
            <Copy className="w-3 h-3" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              deleteBlock(stepId, block.id);
            }}
            className="w-5 h-5 rounded bg-white shadow border border-gray-200 text-red-500 flex items-center justify-center hover:bg-red-50"
            title="Delete"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
}

export default memo(TextBlockComponent);
