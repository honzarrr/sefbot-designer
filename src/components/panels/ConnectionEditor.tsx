'use client';

import { useState, useCallback } from 'react';
import { useDesignerStore } from '@/stores/designerStore';
import type { Connection } from '@/types';
import ColorPicker from './ColorPicker';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';

interface ConnectionEditorProps {
  connection: Connection;
}

export function ConnectionEditor({ connection }: ConnectionEditorProps) {
  const updateConnectionLabel = useDesignerStore((s) => s.updateConnectionLabel);
  const updateConnectionColor = useDesignerStore((s) => s.updateConnectionColor);
  const [label, setLabel] = useState(connection.label ?? '');

  const handleLabelBlur = useCallback(() => {
    if (label !== (connection.label ?? '')) {
      updateConnectionLabel(connection.id, label);
    }
  }, [label, connection.id, connection.label, updateConnectionLabel]);

  const handleColorChange = useCallback(
    (color: string) => {
      updateConnectionColor(connection.id, color);
    },
    [connection.id, updateConnectionColor]
  );

  return (
    <div className="p-4 space-y-4">
      <div>
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Connection Label
        </label>
        <Input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onBlur={handleLabelBlur}
          onKeyDown={(e) => e.key === 'Enter' && handleLabelBlur()}
          placeholder="Optional label..."
          className="mt-1"
        />
      </div>

      <Separator />

      <div>
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Color
        </label>
        <div className="mt-2">
          <ColorPicker
            value={connection.color ?? '#4A90D9'}
            onChange={handleColorChange}
          />
        </div>
      </div>
    </div>
  );
}
