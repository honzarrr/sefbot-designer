'use client';

import { useState, useCallback } from 'react';
import { useDesignerStore } from '@/stores/designerStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Plus, RotateCcw, Trash2 } from 'lucide-react';

export function VersionPanel() {
  const project = useDesignerStore((s) => s.project);
  const createVersion = useDesignerStore((s) => s.createVersion);
  const restoreVersion = useDesignerStore((s) => s.restoreVersion);
  const deleteVersion = useDesignerStore((s) => s.deleteVersion);
  const [newVersionName, setNewVersionName] = useState('');

  const handleCreate = useCallback(() => {
    if (!newVersionName.trim()) return;
    createVersion(newVersionName.trim());
    setNewVersionName('');
  }, [newVersionName, createVersion]);

  if (!project) return null;

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="p-4 space-y-4">
      <div>
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Create Version
        </label>
        <div className="flex gap-2 mt-1">
          <Input
            value={newVersionName}
            onChange={(e) => setNewVersionName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            placeholder="Version name..."
            className="flex-1"
          />
          <Button
            size="icon"
            onClick={handleCreate}
            disabled={!newVersionName.trim()}
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <Separator />

      <div>
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Saved Versions
        </label>
        <ScrollArea className="mt-2">
          <div className="space-y-2">
            {project.versions.length === 0 && (
              <p className="text-xs text-muted-foreground py-2">No versions saved yet</p>
            )}
            {[...project.versions].reverse().map((version) => (
              <div
                key={version.id}
                className="rounded border bg-card p-2.5"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium">{version.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatDate(version.date)}
                    </p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => restoreVersion(version.id)}
                      title="Restore"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-red-500 hover:text-red-600"
                      onClick={() => deleteVersion(version.id)}
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
