'use client';

import { Focus } from 'lucide-react';
import { useDesignerStore } from '@/stores/designerStore';

export function FocusModeToggle() {
  const focusedBlockId = useDesignerStore((s) => s.focusedBlockId);
  const setFocusedBlock = useDesignerStore((s) => s.setFocusedBlock);

  const isActive = focusedBlockId !== null;

  return (
    <button
      onClick={() => setFocusedBlock(null)}
      className={`
        flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border shadow-sm transition-colors
        ${isActive
          ? 'bg-blue-50 border-blue-300 text-blue-700'
          : 'bg-white border-gray-200 text-muted-foreground hover:bg-muted'
        }
      `}
      title={isActive ? 'Click to exit focus mode (or click canvas background)' : 'Click a block in dev mode to focus its connections'}
    >
      <Focus className="h-3.5 w-3.5" />
      <span>Focus</span>
    </button>
  );
}
