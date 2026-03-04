import { describe, it, expect, beforeEach } from 'vitest';
import { loadProjectList, saveProjectList, loadProject, saveProject, deleteProjectData } from '../storage';
import type { Project, ProjectListItem } from '@/types';

describe('storage utilities', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('loadProjectList', () => {
    it('returns empty array when no data exists', () => {
      expect(loadProjectList()).toEqual([]);
    });

    it('loads project list from localStorage', () => {
      const projects: ProjectListItem[] = [
        { id: '1', name: 'Test', status: 'draft', createdAt: '2024-01-01', updatedAt: '2024-01-01' },
      ];
      localStorage.setItem('sefbot-projects', JSON.stringify(projects));

      const result = loadProjectList();
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Test');
    });
  });

  describe('saveProjectList', () => {
    it('saves project list to localStorage', () => {
      const projects: ProjectListItem[] = [
        { id: '1', name: 'Test', status: 'draft', createdAt: '2024-01-01', updatedAt: '2024-01-01' },
      ];
      saveProjectList(projects);

      const stored = JSON.parse(localStorage.getItem('sefbot-projects')!);
      expect(stored).toHaveLength(1);
      expect(stored[0].id).toBe('1');
    });
  });

  describe('loadProject', () => {
    it('returns null when project does not exist', () => {
      expect(loadProject('nonexistent')).toBeNull();
    });

    it('loads project by id', () => {
      const project = { id: 'p1', name: 'My Project' };
      localStorage.setItem('sefbot-project-p1', JSON.stringify(project));

      const result = loadProject('p1');
      expect(result).not.toBeNull();
      expect(result!.name).toBe('My Project');
    });
  });

  describe('saveProject', () => {
    it('saves project to localStorage with correct key', () => {
      const project = {
        id: 'p1',
        name: 'Test',
        status: 'draft',
        steps: [],
        conditions: [],
        softStarts: [],
        notes: [],
        connections: [],
        anchors: [],
        versions: [],
        nodePositions: {},
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      } as Project;

      saveProject(project);

      const stored = JSON.parse(localStorage.getItem('sefbot-project-p1')!);
      expect(stored.name).toBe('Test');
    });
  });

  describe('deleteProjectData', () => {
    it('removes project from localStorage', () => {
      localStorage.setItem('sefbot-project-p1', '{}');
      deleteProjectData('p1');

      expect(localStorage.getItem('sefbot-project-p1')).toBeNull();
    });
  });
});
