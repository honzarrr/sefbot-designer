'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle, XCircle, Info, ChevronDown, ChevronUp } from 'lucide-react';
import { useDesignerStore } from '@/stores/designerStore';
import type { TransformWarning } from '@/types';

const WARNING_ICONS: Record<TransformWarning['type'], typeof AlertTriangle> = {
  dead_end: XCircle,
  orphan: AlertTriangle,
  missing_connection: Info,
  loop_detected: AlertTriangle,
};

const WARNING_COLORS: Record<TransformWarning['type'], string> = {
  dead_end: 'text-red-500 bg-red-50',
  orphan: 'text-yellow-600 bg-yellow-50',
  missing_connection: 'text-orange-500 bg-orange-50',
  loop_detected: 'text-blue-500 bg-blue-50',
};

export function WarningsPanel() {
  const project = useDesignerStore((s) => s.project);
  const canvasMode = useDesignerStore((s) => s.canvasMode);
  const setFocusedBlock = useDesignerStore((s) => s.setFocusedBlock);
  const [warnings, setWarnings] = useState<TransformWarning[]>([]);
  const [collapsed, setCollapsed] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!project || canvasMode !== 'development') {
      setWarnings([]);
      return;
    }

    const loadWarnings = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/projects/${project.id}/validate`);
        if (res.ok) {
          const data = await res.json();
          setWarnings(data.warnings || []);
        }
      } catch (err) {
        console.error('Failed to load warnings:', err);
      } finally {
        setLoading(false);
      }
    };

    loadWarnings();
  }, [project, canvasMode]);

  if (canvasMode !== 'development' || warnings.length === 0) return null;

  return (
    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 w-[500px] max-w-[90vw]">
      <div className="bg-white border rounded-lg shadow-lg overflow-hidden">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-between px-4 py-2 text-xs font-medium text-muted-foreground hover:bg-muted/50 transition-colors"
        >
          <span className="flex items-center gap-2">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
            {warnings.length} Warning{warnings.length !== 1 ? 's' : ''}
          </span>
          {collapsed ? (
            <ChevronUp className="h-3.5 w-3.5" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" />
          )}
        </button>

        {!collapsed && (
          <div className="border-t max-h-40 overflow-y-auto">
            {loading ? (
              <div className="p-3 text-xs text-muted-foreground">Loading...</div>
            ) : (
              warnings.map((w, i) => {
                const Icon = WARNING_ICONS[w.type];
                const colorClass = WARNING_COLORS[w.type];
                return (
                  <button
                    key={i}
                    onClick={() => {
                      if (w.blockId) {
                        setFocusedBlock(w.blockId);
                      }
                    }}
                    className={`w-full flex items-start gap-2 px-4 py-2 text-xs text-left hover:bg-muted/30 transition-colors border-b last:border-b-0 ${colorClass.split(' ')[1]}`}
                  >
                    <Icon className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${colorClass.split(' ')[0]}`} />
                    <span className="text-gray-700">{w.message}</span>
                  </button>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}
