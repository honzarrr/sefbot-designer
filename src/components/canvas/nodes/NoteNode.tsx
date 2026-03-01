'use client';

import { memo, useState, useCallback } from 'react';
import { type NodeProps } from '@xyflow/react';
import type { NoteNodeType } from '@/types';
import { useDesignerStore } from '@/stores/designerStore';
import { Trash2 } from 'lucide-react';

function NoteNodeComponent({ data, id }: NodeProps<NoteNodeType>) {
  const { note } = data;
  const updateNote = useDesignerStore((s) => s.updateNote);
  const deleteNote = useDesignerStore((s) => s.deleteNote);

  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(note.content);
  const [hovered, setHovered] = useState(false);

  const handleDoubleClick = useCallback(() => {
    setEditContent(note.content);
    setIsEditing(true);
  }, [note.content]);

  const handleBlur = useCallback(() => {
    setIsEditing(false);
    if (editContent !== note.content) {
      updateNote(id, editContent);
    }
  }, [editContent, note.content, id, updateNote]);

  return (
    <div
      className="relative min-w-[150px] max-w-[250px] rounded-sm shadow-md"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onDoubleClick={handleDoubleClick}
      style={{
        background: 'linear-gradient(135deg, #FEF9C3 0%, #FDE68A 100%)',
        borderLeft: '3px solid #F59E0B',
      }}
    >
      {/* Folded corner effect */}
      <div
        className="absolute top-0 right-0 w-4 h-4"
        style={{
          background: 'linear-gradient(225deg, #f5f5f4 50%, #FDE68A 50%)',
        }}
      />

      <div className="p-3 pt-2">
        {/* No handles - notes don't connect */}

        {isEditing ? (
          <textarea
            className="w-full bg-transparent text-xs text-amber-900 outline-none resize-none min-h-[40px] placeholder:text-amber-400"
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setIsEditing(false);
                setEditContent(note.content);
              }
            }}
            placeholder="Write a note..."
            autoFocus
            rows={3}
          />
        ) : (
          <div className="text-xs text-amber-900 whitespace-pre-wrap min-h-[20px]">
            {note.content || <span className="text-amber-400 italic">Empty note...</span>}
          </div>
        )}
      </div>

      {hovered && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            deleteNote(id);
          }}
          className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-white shadow border border-gray-200 text-red-500 flex items-center justify-center hover:bg-red-50"
          title="Delete note"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}

export default memo(NoteNodeComponent);
