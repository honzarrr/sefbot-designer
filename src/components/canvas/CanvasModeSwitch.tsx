'use client';

import { Eye, Pencil, Settings } from 'lucide-react';
import { useDesignerStore } from '@/stores/designerStore';
import type { CanvasMode } from '@/types';

const modes: { key: CanvasMode; label: string; icon: typeof Eye; description: string }[] = [
  { key: 'client', label: 'Client View', icon: Eye, description: 'Content only, no connections' },
  { key: 'design', label: 'Design', icon: Pencil, description: 'Design connections, full editing' },
  { key: 'development', label: 'Development', icon: Settings, description: 'All connections visible' },
];

export function CanvasModeSwitch() {
  const canvasMode = useDesignerStore((s) => s.canvasMode);
  const setCanvasMode = useDesignerStore((s) => s.setCanvasMode);
  const project = useDesignerStore((s) => s.project);

  const statusOrder = ['draft', 'design_review', 'approved', 'development', 'testing', 'live'];
  const projectStatusIndex = statusOrder.indexOf(project?.status || 'draft');
  const devAvailable = projectStatusIndex >= statusOrder.indexOf('development');

  return (
    <div className="flex items-center bg-white border rounded-lg shadow-sm p-0.5 gap-0.5">
      {modes.map(({ key, label, icon: Icon }) => {
        const isActive = canvasMode === key;
        const isDisabled = key === 'development' && !devAvailable;

        return (
          <button
            key={key}
            onClick={() => !isDisabled && setCanvasMode(key)}
            disabled={isDisabled}
            className={`
              flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors
              ${isActive
                ? 'bg-primary text-primary-foreground shadow-sm'
                : isDisabled
                  ? 'text-muted-foreground/40 cursor-not-allowed'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }
            `}
            title={isDisabled ? 'Available when project status is Development or later' : label}
          >
            <Icon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
