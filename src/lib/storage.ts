import { Project, ProjectListItem } from '@/types';

const PROJECTS_KEY = 'sefbot-projects';
const PROJECT_PREFIX = 'sefbot-project-';

export function loadProjectList(): ProjectListItem[] {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem(PROJECTS_KEY);
  return data ? JSON.parse(data) : [];
}

export function saveProjectList(projects: ProjectListItem[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
}

export function loadProject(id: string): Project | null {
  if (typeof window === 'undefined') return null;
  const data = localStorage.getItem(PROJECT_PREFIX + id);
  return data ? JSON.parse(data) : null;
}

export function saveProject(project: Project): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(PROJECT_PREFIX + project.id, JSON.stringify(project));
}

export function deleteProjectData(id: string): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(PROJECT_PREFIX + id);
}
