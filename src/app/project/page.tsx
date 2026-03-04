'use client';

import { Suspense, useEffect, useState, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useDesignerStore } from '@/stores/designerStore';
import { useAutoSave } from '@/hooks/useAutoSave';
import { acquireLock, releaseLock } from '@/lib/api-storage';
import { ElementPalette } from '@/components/sidebar/ElementPalette';
import DesignerCanvas from '@/components/canvas/DesignerCanvas';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { ConnectionEditor } from '@/components/panels/ConnectionEditor';
import { VersionPanel } from '@/components/panels/VersionPanel';
import { SharePanel } from '@/components/panels/SharePanel';
import { CommentsPanel } from '@/components/panels/CommentsPanel';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ArrowLeft,
  Save,
  Download,
  FileSpreadsheet,
  FileText,
  History,
  Share2,
  MessageCircle,
  ListTodo,
  X,
} from 'lucide-react';
import { BuildInfo } from '@/components/shared/BuildInfo';
import { TransformButton } from '@/components/canvas/TransformButton';
import { StepInspector } from '@/components/canvas/StepInspector';

type RightPanel = 'connection' | 'versions' | 'share' | 'comments' | 'stepInspector' | null;

export default function ProjectPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen text-muted-foreground">Loading...</div>}>
      <ProjectPageInner />
    </Suspense>
  );
}

function ProjectPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = searchParams?.get('id') || '';
  const { project, loadProject, saveProject, selectedIds } = useDesignerStore();
  const canvasMode = useDesignerStore((s) => s.canvasMode);
  const [rightPanel, setRightPanel] = useState<RightPanel>(null);
  const [exporting, setExporting] = useState(false);
  const [lockError, setLockError] = useState<string | null>(null);
  const lockAcquiredRef = useRef(false);

  // Auto-save hook
  useAutoSave();

  // Load project and acquire lock
  useEffect(() => {
    if (!id) {
      router.replace('/');
      return;
    }

    const init = async () => {
      // Try to acquire lock
      try {
        const lockResult = await acquireLock(id);
        if (lockResult.error) {
          setLockError(`Project is locked by ${lockResult.lockedBy?.name || 'another user'}`);
        } else {
          lockAcquiredRef.current = true;
        }
      } catch {
        // Lock failed but still load project for viewing
      }
      await loadProject(id);
    };

    init();

    // Release lock on unmount
    return () => {
      if (lockAcquiredRef.current) {
        releaseLock(id);
        lockAcquiredRef.current = false;
      }
    };
  }, [id, loadProject, router]);

  // Release lock on beforeunload
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (lockAcquiredRef.current && id) {
        // Use fetch with keepalive for reliability during page unload
        fetch(`/api/projects/${id}/lock`, { method: 'DELETE', keepalive: true });
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [id]);

  useEffect(() => {
    if (!project || selectedIds.length === 0) {
      if (rightPanel === 'connection') {
        setRightPanel(null);
      }
      return;
    }

    const selectedId = selectedIds[0];
    const conn = project.connections.find((c) => c.id === selectedId);
    if (conn) {
      setRightPanel('connection');
    } else if (canvasMode === 'development' && project.steps.some((s) => s.id === selectedId)) {
      setRightPanel('stepInspector');
    } else if (rightPanel === 'connection' || rightPanel === 'stepInspector') {
      setRightPanel(null);
    }
  }, [selectedIds, project, rightPanel, canvasMode]);

  const handleExportPDF = useCallback(async () => {
    if (!project) return;
    setExporting(true);
    try {
      const { exportCanvasToPDF } = await import('@/lib/export-pdf');
      await exportCanvasToPDF(project.name);
    } catch (err) {
      console.error('PDF export failed:', err);
    } finally {
      setExporting(false);
    }
  }, [project]);

  const handleExportExcel = useCallback(async () => {
    if (!project) return;
    setExporting(true);
    try {
      const { exportProjectToExcel } = await import('@/lib/export-excel');
      exportProjectToExcel(project);
    } catch (err) {
      console.error('Excel export failed:', err);
    } finally {
      setExporting(false);
    }
  }, [project]);

  if (!project) {
    return (
      <div className="flex items-center justify-center h-screen text-muted-foreground">
        Loading project...
      </div>
    );
  }

  const selectedConnection = selectedIds.length === 1
    ? project.connections.find((c) => c.id === selectedIds[0])
    : undefined;

  return (
    <div className="h-screen flex flex-col">
      {lockError && (
        <div className="bg-amber-500/10 border-b border-amber-500/30 px-4 py-2 text-sm text-amber-700 text-center">
          {lockError} — project is read-only
        </div>
      )}
      <header className="border-b px-4 py-2 flex items-center gap-3 shrink-0">
        <Button variant="ghost" size="icon" onClick={() => router.push('/')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-sm font-semibold truncate">{project.name}</h1>
        <BuildInfo />
        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setRightPanel(rightPanel === 'comments' ? null : 'comments')}
          >
            <MessageCircle className="h-4 w-4 mr-2" />
            Comments
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setRightPanel(rightPanel === 'share' ? null : 'share')}
          >
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/projects/${id}/todos`)}
          >
            <ListTodo className="h-4 w-4 mr-2" />
            Todos
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setRightPanel(rightPanel === 'versions' ? null : 'versions')}
          >
            <History className="h-4 w-4 mr-2" />
            Versions
          </Button>
          <TransformButton />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" disabled={exporting}>
                <Download className="h-4 w-4 mr-2" />
                {exporting ? 'Exporting...' : 'Export'}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleExportPDF}>
                <FileText className="h-4 w-4 mr-2" />
                Export as PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportExcel}>
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Export as Excel
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline" size="sm" onClick={saveProject}>
            <Save className="h-4 w-4 mr-2" />
            Save
          </Button>
        </div>
      </header>
      <div className="flex flex-1 overflow-hidden">
        <ElementPalette />
        <div className="flex-1 relative">
          <ErrorBoundary>
            <DesignerCanvas />
          </ErrorBoundary>
        </div>
        {rightPanel && (
          <aside className="w-72 border-l bg-card shrink-0 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {rightPanel === 'connection' && 'Connection'}
                {rightPanel === 'versions' && 'Versions'}
                {rightPanel === 'share' && 'Share'}
                {rightPanel === 'comments' && 'Comments'}
                {rightPanel === 'stepInspector' && 'Step Inspector'}
              </h2>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setRightPanel(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <Separator />
            <div className="flex-1 overflow-y-auto">
              {rightPanel === 'connection' && selectedConnection && <ConnectionEditor key={selectedConnection.id} connection={selectedConnection} />}
              {rightPanel === 'versions' && <VersionPanel />}
              {rightPanel === 'share' && <SharePanel />}
              {rightPanel === 'comments' && <CommentsPanel />}
              {rightPanel === 'stepInspector' && <StepInspector />}
              {rightPanel === 'connection' && !selectedConnection && <div className="p-4 text-sm text-muted-foreground">Select a connection to edit</div>}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
