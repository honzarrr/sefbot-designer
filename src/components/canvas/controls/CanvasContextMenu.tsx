'use client';

import { useEffect, useRef } from 'react';
import { useDesignerStore } from '@/stores/designerStore';

interface CanvasContextMenuProps {
  x: number;
  y: number;
  sourceNodeId: string;
  onConnect: (targetId: string) => void;
  onClose: () => void;
}

export default function CanvasContextMenu({
  x,
  y,
  sourceNodeId,
  onConnect,
  onClose,
}: CanvasContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const project = useDesignerStore((s) => s.project);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [onClose]);

  if (!project) return null;

  // Build list of connectable targets (steps, conditions, soft starts - excluding self)
  const targets: { id: string; name: string; type: string }[] = [];

  project.steps.forEach((step) => {
    if (step.id !== sourceNodeId) {
      targets.push({ id: step.id, name: step.name, type: 'Step' });
    }
  });

  project.conditions.forEach((cond) => {
    if (cond.id !== sourceNodeId) {
      targets.push({ id: cond.id, name: 'Condition', type: 'Condition' });
    }
  });

  project.softStarts.forEach((ss) => {
    if (ss.id !== sourceNodeId) {
      targets.push({ id: ss.id, name: ss.name, type: 'Soft Start' });
    }
  });

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[180px] max-h-[300px] overflow-y-auto"
      style={{ left: x, top: y }}
    >
      <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-gray-400 font-semibold">
        Connect to...
      </div>
      {targets.length === 0 ? (
        <div className="px-3 py-2 text-xs text-gray-400">No available targets</div>
      ) : (
        targets.map((target) => (
          <button
            key={target.id}
            onClick={() => onConnect(target.id)}
            className="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-100 flex items-center gap-2"
          >
            <span className="text-[10px] text-gray-400 uppercase">{target.type}</span>
            <span className="truncate">{target.name}</span>
          </button>
        ))
      )}
    </div>
  );
}
