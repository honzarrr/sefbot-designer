'use client';

import { EyeOff } from 'lucide-react';
import { useDesignerStore } from '@/stores/designerStore';

export function ShowHiddenToggle() {
  const showHidden = useDesignerStore((s) => s.showHidden);
  const setShowHidden = useDesignerStore((s) => s.setShowHidden);
  const project = useDesignerStore((s) => s.project);

  const hasHidden = project?.connections.some((c) => c.isHidden) ?? false;
  if (!hasHidden) return null;

  return (
    <button
      onClick={() => setShowHidden(!showHidden)}
      className={`
        flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border shadow-sm transition-colors
        ${showHidden
          ? 'bg-amber-50 border-amber-300 text-amber-700'
          : 'bg-white border-gray-200 text-muted-foreground hover:bg-muted'
        }
      `}
      title={showHidden ? 'Hide hidden connections' : 'Show hidden connections'}
    >
      <EyeOff className="h-3.5 w-3.5" />
      <span>{showHidden ? 'Showing Hidden' : 'Show Hidden'}</span>
    </button>
  );
}
