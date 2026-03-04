'use client';

import { useState } from 'react';
import { Zap, AlertTriangle, CheckCircle, XCircle, Info } from 'lucide-react';
import { useDesignerStore } from '@/stores/designerStore';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { TransformWarning } from '@/types';

const WARNING_ICONS: Record<TransformWarning['type'], typeof AlertTriangle> = {
  dead_end: XCircle,
  orphan: AlertTriangle,
  missing_connection: Info,
  loop_detected: AlertTriangle,
};

const WARNING_COLORS: Record<TransformWarning['type'], string> = {
  dead_end: 'text-red-500',
  orphan: 'text-yellow-500',
  missing_connection: 'text-orange-500',
  loop_detected: 'text-blue-500',
};

export function TransformButton() {
  const project = useDesignerStore((s) => s.project);
  const setCanvasMode = useDesignerStore((s) => s.setCanvasMode);
  const loadProject = useDesignerStore((s) => s.loadProject);
  const [showDialog, setShowDialog] = useState(false);
  const [warnings, setWarnings] = useState<TransformWarning[]>([]);
  const [validating, setValidating] = useState(false);
  const [transforming, setTransforming] = useState(false);
  const [stepsCount, setStepsCount] = useState(0);
  const [connectionsCount, setConnectionsCount] = useState(0);
  const [result, setResult] = useState<{ stepsCreated: number; connectionsCreated: number } | null>(null);

  if (!project || project.status !== 'approved') return null;

  const handleValidate = async () => {
    setValidating(true);
    setResult(null);
    try {
      const res = await fetch(`/api/projects/${project.id}/validate`);
      const data = await res.json();
      setWarnings(data.warnings || []);
      setStepsCount(data.stepsCount || 0);
      setConnectionsCount(data.connectionsCount || 0);
      setShowDialog(true);
    } catch (err) {
      console.error('Validation failed:', err);
    } finally {
      setValidating(false);
    }
  };

  const handleTransform = async () => {
    setTransforming(true);
    try {
      const res = await fetch(`/api/projects/${project.id}/transform`, {
        method: 'POST',
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Transform failed');
      }
      const data = await res.json();
      setResult({ stepsCreated: data.stepsCreated, connectionsCreated: data.connectionsCreated });
      setWarnings(data.warnings || []);

      // Reload project to get updated data
      await loadProject(project.id);
      // Switch to development mode
      setCanvasMode('development');
    } catch (err) {
      console.error('Transform failed:', err);
    } finally {
      setTransforming(false);
    }
  };

  return (
    <>
      <Button
        variant="default"
        size="sm"
        onClick={handleValidate}
        disabled={validating}
        className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
      >
        <Zap className="h-4 w-4 mr-2" />
        {validating ? 'Validating...' : 'Transform to Development'}
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-blue-600" />
              Transform to Development
            </DialogTitle>
            <DialogDescription>
              {result
                ? `Transformation complete!`
                : `This will create ${stepsCount} chatbot steps and ${connectionsCount} development connections.`
              }
            </DialogDescription>
          </DialogHeader>

          {result ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg border border-green-200">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-sm font-medium text-green-800">
                    Created {result.stepsCreated} steps and {result.connectionsCreated} connections
                  </p>
                  <p className="text-xs text-green-600">
                    Project is now in Development mode
                  </p>
                </div>
              </div>
              {warnings.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Warnings:</p>
                  {warnings.map((w, i) => {
                    const Icon = WARNING_ICONS[w.type];
                    return (
                      <div key={i} className="flex items-start gap-2 p-2 rounded bg-muted/50 text-xs">
                        <Icon className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${WARNING_COLORS[w.type]}`} />
                        <span>{w.message}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {warnings.length === 0 ? (
                <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg border border-green-200">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <p className="text-sm text-green-800">No warnings found. Ready to transform.</p>
                </div>
              ) : (
                <>
                  <p className="text-xs font-medium text-muted-foreground">
                    {warnings.length} warning{warnings.length !== 1 ? 's' : ''} found:
                  </p>
                  {warnings.map((w, i) => {
                    const Icon = WARNING_ICONS[w.type];
                    return (
                      <div key={i} className="flex items-start gap-2 p-2 rounded bg-muted/50 text-xs">
                        <Icon className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${WARNING_COLORS[w.type]}`} />
                        <span>{w.message}</span>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          )}

          <DialogFooter>
            {result ? (
              <Button onClick={() => setShowDialog(false)}>Done</Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
                <Button onClick={handleTransform} disabled={transforming}>
                  {transforming ? 'Transforming...' : 'Proceed'}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
