'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useDesignerStore } from '@/stores/designerStore';
import { ProjectListItem } from '@/types';
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
} from 'lucide-react';

const COLUMNS: { key: ProjectListItem['status']; label: string; color: string }[] = [
  { key: 'progress', label: 'In Progress', color: 'bg-blue-500' },
  { key: 'approval', label: 'Approval', color: 'bg-amber-500' },
  { key: 'done', label: 'Done', color: 'bg-green-500' },
];

export default function Home() {
  const router = useRouter();
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

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const filteredProjects = projects.filter((p) =>
    p.name.toLowerCase().includes(searchFilter.toLowerCase())
  );

  const handleCreate = useCallback(() => {
    if (!newProjectName.trim()) return;
    const id = createProject(newProjectName.trim());
    setNewProjectName('');
    setCreateDialogOpen(false);
    router.push(`/project?id=${id}`);
  }, [newProjectName, createProject, router]);

  const handleRename = useCallback(() => {
    if (!renameTarget || !renameTarget.name.trim()) return;
    renameProject(renameTarget.id, renameTarget.name.trim());
    setRenameTarget(null);
    setRenameDialogOpen(false);
  }, [renameTarget, renameProject]);

  const handleDragStart = (e: React.DragEvent, projectId: string) => {
    setDragItem(projectId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, status: ProjectListItem['status']) => {
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
      {/* Header */}
      <header className="border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">Sefbot Designer</h1>
          <div className="flex items-center gap-3">
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
        </div>
      </header>

      {/* Kanban Board */}
      <div className="p-6">
        <div className="grid grid-cols-3 gap-6">
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
                                onClick={() => duplicateProject(project.id)}
                              >
                                <Copy className="h-4 w-4 mr-2" />
                                Duplicate
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => deleteProject(project.id)}
                                className="text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                          <span>Created {formatDate(project.createdAt)}</span>
                          <span>&middot;</span>
                          <span>Updated {formatDate(project.updatedAt)}</span>
                        </div>
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
    </div>
  );
}
