'use client';

import { DragElementType } from '@/types';
import { Separator } from '@/components/ui/separator';

interface PaletteItem {
  type: DragElementType;
  label: string;
  icon: React.ReactNode;
}

const PALETTE_ITEMS: PaletteItem[] = [
  {
    type: 'soft-start',
    label: 'Soft Start',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5" />
        <polygon points="8,6 15,10 8,14" fill="currentColor" />
      </svg>
    ),
  },
  {
    type: 'step',
    label: 'Step',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="2" y="3" width="16" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <line x1="5" y1="7" x2="15" y2="7" stroke="currentColor" strokeWidth="1.5" />
        <line x1="5" y1="11" x2="12" y2="11" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    ),
  },
  {
    type: 'condition',
    label: 'Condition',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <polygon points="10,2 18,10 10,18 2,10" stroke="currentColor" strokeWidth="1.5" fill="none" />
        <text x="10" y="13" textAnchor="middle" fontSize="9" fill="currentColor">?</text>
      </svg>
    ),
  },
  {
    type: 'note',
    label: 'Note',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="3" y="2" width="14" height="16" rx="1" stroke="currentColor" strokeWidth="1.5" />
        <line x1="6" y1="6" x2="14" y2="6" stroke="currentColor" strokeWidth="1" />
        <line x1="6" y1="9" x2="14" y2="9" stroke="currentColor" strokeWidth="1" />
        <line x1="6" y1="12" x2="11" y2="12" stroke="currentColor" strokeWidth="1" />
      </svg>
    ),
  },
];

export function ElementPalette() {
  const handleDragStart = (e: React.DragEvent, type: DragElementType) => {
    e.dataTransfer.setData('application/sefbot-type', type);
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <aside className="w-56 border-r bg-card shrink-0 flex flex-col">
      <div className="px-4 py-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Elements
        </h2>
      </div>
      <Separator />
      <div className="p-3 flex flex-col gap-1">
        {PALETTE_ITEMS.map((item) => (
          <div
            key={item.type}
            draggable
            onDragStart={(e) => handleDragStart(e, item.type)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-md cursor-grab active:cursor-grabbing hover:bg-accent transition-colors text-sm select-none"
          >
            <span className="text-muted-foreground">{item.icon}</span>
            <span>{item.label}</span>
          </div>
        ))}
      </div>
    </aside>
  );
}
