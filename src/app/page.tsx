'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { useDesignerStore } from '@/stores/designerStore';
import { ProjectStatus } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Plus,
  Search,
  MoreHorizontal,
  Copy,
  Trash2,
  Pencil,
  FolderOpen,
  FolderPlus,
  Lock,
} from 'lucide-react';
import { BuildInfo } from '@/components/shared/BuildInfo';
import { AppHeader } from '@/components/shared/AppHeader';

const COLUMNS: { key: ProjectStatus; label: string; color: string }[] = [
  { key: 'draft', label: 'Draft', color: 'bg-slate-500' },
  { key: 'design_review', label: 'Design Review', color: 'bg-amber-500' },
  { key: 'approved', label: 'Approved', color: 'bg-blue-500' },
  { key: 'development', label: 'Development', color: 'bg-purple-500' },
  { key: 'testing', label: 'Testing', color: 'bg-orange-500' },
  { key: 'live', label: 'Live', color: 'bg-green-500' },
];

export default function Home() {
  const router = useRouter();
  const { data: session } = useSession();
  const {
    projects,
    loadProjects,
    createProject,
    deleteProject,
    duplicateProject,
    renameProject,
    updateProjectStatus,
  } = useDesignerStore();

  const [searchFilter, setSearchFilter] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<{ id: string; name: string } | null>(null);
  const [dragItem, setDragItem] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const isAdmin = session?.user?.role === 'ADMIN';

  useEffect(() => {
    loadProjects().finally(() => setLoading(false));
  }, [loadProjects]);

  const filteredProjects = projects.filter((p) =>
    p.name.toLowerCase().includes(searchFilter.toLowerCase())
  );

  const handleCreate = useCallback(async () => {
    if (!newProjectName.trim()) return;
    const id = await createProject(newProjectName.trim());
    setNewProjectName('');
    setCreateDialogOpen(false);
    if (id) {
      router.push(`/project?id=${id}`);
    }
    toast.success('Project created.');
  }, [newProjectName, createProject, router]);

  const handleRename = useCallback(() => {
    if (!renameTarget || !renameTarget.name.trim()) return;
    renameProject(renameTarget.id, renameTarget.name.trim());
    setRenameTarget(null);
    setRenameDialogOpen(false);
    toast.success('Project renamed.');
  }, [renameTarget, renameProject]);

  const handleDragStart = (e: React.DragEvent, projectId: string) => {
    setDragItem(projectId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, status: ProjectStatus) => {
    e.preventDefault();
    if (dragItem) {
      updateProjectStatus(dragItem, status);
      setDragItem(null);
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      {/* Toolbar */}
      <div className="border-b px-6 py-3 flex items-center gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search projects..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="pl-9 w-64"
          />
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Project
        </Button>
      </div>

      {/* Kanban Board */}
      <div className="p-6">
        {loading && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-sm text-muted-foreground">Loading projects...</p>
          </div>
        )}
        {!loading && projects.length === 0 && (
          <div className="text-center py-20">
            <FolderPlus className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-lg font-semibold mb-2">Create your first project</h2>
            <p className="text-sm text-muted-foreground mb-4">Design chatbot conversation flows visually on a canvas.</p>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Project
            </Button>
          </div>
        )}
        <div className="grid grid-cols-6 gap-4">
          {COLUMNS.map((col) => {
            const colProjects = filteredProjects.filter((p) => p.status === col.key);
            return (
              <div
                key={col.key}
                className="flex flex-col rounded-lg border bg-muted/30"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, col.key)}
              >
                {/* Column Header */}
                <div className="flex items-center gap-2 p-4 pb-3">
                  <div className={`h-3 w-3 rounded-full ${col.color}`} />
                  <h2 className="font-semibold text-sm">{col.label}</h2>
                  <Badge variant="secondary" className="ml-auto text-xs">
                    {colProjects.length}
                  </Badge>
                </div>

                {/* Cards */}
                <ScrollArea className="flex-1 px-3 pb-3">
                  <div className="flex flex-col gap-2">
                    {colProjects.map((project) => (
                      <div
                        key={project.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, project.id)}
                        onClick={() => router.push(`/project?id=${project.id}`)}
                        className="group rounded-md border bg-card p-3 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-start justify-between">
                          <span
                            className="text-sm font-medium text-left hover:underline truncate flex-1"
                          >
                            {project.name}
                          </span>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => router.push(`/project?id=${project.id}`)}
                              >
                                <FolderOpen className="h-4 w-4 mr-2" />
                                Open
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  setRenameTarget({ id: project.id, name: project.name });
                                  setRenameDialogOpen(true);
                                }}
                              >
                                <Pencil className="h-4 w-4 mr-2" />
                                Rename
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  duplicateProject(project.id);
                                  toast.success('Project duplicated.');
                                }}
                              >
                                <Copy className="h-4 w-4 mr-2" />
                                Duplicate
                              </DropdownMenuItem>
                              {isAdmin && (
                                <DropdownMenuItem
                                  onClick={() => {
                                    deleteProject(project.id);
                                    toast.success('Project deleted.');
                                  }}
                                  className="text-destructive"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                          <span>Created {formatDate(project.createdAt)}</span>
                          <span>&middot;</span>
                          <span>Updated {formatDate(project.updatedAt)}</span>
                        </div>
                        {project.lockedBy && (
                          <div className="flex items-center gap-1 mt-1.5 text-xs text-amber-600">
                            <Lock className="h-3 w-3" />
                            <span>Editing: {project.lockedBy.name}</span>
                            {isAdmin && project.lockedBy.userId !== session?.user?.id && (
                              <button
                                className="ml-auto text-xs underline hover:text-amber-700"
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  await fetch(`/api/projects/${project.id}/lock`, { method: 'DELETE' });
                                  loadProjects();
                                }}
                              >
                                Force unlock
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                    {colProjects.length === 0 && (
                      <div className="text-center text-xs text-muted-foreground py-8">
                        No projects
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>
            );
          })}
        </div>
      </div>

      {/* Create Project Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="Project name"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={!newProjectName.trim()}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Dialog */}
      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Project</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="Project name"
              value={renameTarget?.name ?? ''}
              onChange={(e) =>
                setRenameTarget((prev) => (prev ? { ...prev, name: e.target.value } : null))
              }
              onKeyDown={(e) => e.key === 'Enter' && handleRename()}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRename} disabled={!renameTarget?.name.trim()}>
              Rename
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BuildInfo />
    </div>
  );
}
