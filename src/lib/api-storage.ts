import { Project, ProjectListItem } from '@/types';

export interface ProjectListItemWithLock extends ProjectListItem {
  lockedBy: {
    userId: string;
    name: string;
    lockedAt: string;
  } | null;
}

export async function fetchProjectList(): Promise<ProjectListItemWithLock[]> {
  const res = await fetch('/api/projects');
  if (!res.ok) throw new Error('Failed to load projects');
  return res.json();
}

export async function fetchProject(id: string): Promise<Project | null> {
  const res = await fetch(`/api/projects/${id}`);
  if (!res.ok) return null;
  const data = await res.json();
  // Reconstruct full Project shape from API response
  return {
    id: data.id,
    name: data.name,
    status: data.status,
    steps: data.steps || [],
    conditions: data.conditions || [],
    softStarts: data.softStarts || [],
    notes: data.notes || [],
    connections: data.connections || [],
    anchors: data.anchors || [],
    versions: data.versions || [],
    nodePositions: data.nodePositions || {},
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

export async function createProjectApi(name: string): Promise<ProjectListItem> {
  const res = await fetch('/api/projects', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error('Failed to create project');
  return res.json();
}

export async function saveProjectApi(project: Project): Promise<void> {
  const { id, ...data } = project;
  const res = await fetch(`/api/projects/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to save project');
}

export async function deleteProjectApi(id: string): Promise<void> {
  const res = await fetch(`/api/projects/${id}`, { method: 'DELETE' });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || 'Failed to delete project');
  }
}

export async function duplicateProjectApi(id: string): Promise<ProjectListItem> {
  const res = await fetch(`/api/projects/${id}/duplicate`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to duplicate project');
  return res.json();
}

export async function updateProjectStatusApi(
  id: string,
  status: 'progress' | 'approval' | 'done'
): Promise<void> {
  const res = await fetch(`/api/projects/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error('Failed to update status');
}

export async function acquireLock(id: string): Promise<{ locked: boolean; error?: string; lockedBy?: { name: string } }> {
  const res = await fetch(`/api/projects/${id}/lock`, { method: 'POST' });
  return res.json();
}

export async function releaseLock(id: string): Promise<void> {
  await fetch(`/api/projects/${id}/lock`, { method: 'DELETE' });
}
