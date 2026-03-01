import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import {
  Project,
  ProjectListItem,
  Step,
  Block,
  BlockType,
  TextBlock,
  ButtonsBlock,
  UserInputBlock,
  Connection,
  ConditionNode,
  SoftStart,
  StickyNote,
  STEP_COLORS,
} from '@/types';
import {
  loadProjectList,
  saveProjectList,
  loadProject as loadProjectFromStorage,
  saveProject as saveProjectToStorage,
  deleteProjectData,
} from '@/lib/storage';

interface DesignerStore {
  // Project
  project: Project | null;
  projects: ProjectListItem[];
  loadProjects: () => void;
  loadProject: (id: string) => void;
  saveProject: () => void;
  createProject: (name: string) => string;
  deleteProject: (id: string) => void;
  duplicateProject: (id: string) => void;
  renameProject: (id: string, name: string) => void;
  updateProjectStatus: (id: string, status: 'progress' | 'approval' | 'done') => void;

  // Steps
  addStep: (position: { x: number; y: number }) => string;
  deleteStep: (id: string) => void;
  duplicateStep: (id: string) => void;
  updateStep: (id: string, updates: Partial<Step>) => void;

  // Blocks within steps
  addBlock: (stepId: string, type: BlockType) => void;
  deleteBlock: (stepId: string, blockId: string) => void;
  updateBlock: (stepId: string, blockId: string, updates: Partial<Block>) => void;
  duplicateBlock: (stepId: string, blockId: string) => void;
  addButton: (stepId: string, blockId: string) => void;
  deleteButton: (stepId: string, blockId: string, buttonId: string) => void;
  updateButtonLabel: (stepId: string, blockId: string, buttonId: string, label: string) => void;
  reorderButtons: (stepId: string, blockId: string, buttonIds: string[]) => void;

  // Connections
  addConnection: (conn: Omit<Connection, 'id'>) => void;
  deleteConnection: (id: string) => void;
  updateConnectionColor: (id: string, color: string) => void;
  updateConnectionLabel: (id: string, label: string) => void;

  // Conditions
  addCondition: (position: { x: number; y: number }) => string;
  addConditionBranch: (conditionId: string) => void;
  deleteConditionBranch: (conditionId: string, branchId: string) => void;
  updateConditionBranchLabel: (conditionId: string, branchId: string, label: string) => void;

  // Soft Start
  addSoftStart: (position: { x: number; y: number }) => string;
  updateSoftStart: (id: string, updates: Partial<SoftStart>) => void;

  // Notes
  addNote: (position: { x: number; y: number }) => string;
  updateNote: (id: string, content: string) => void;
  deleteNote: (id: string) => void;

  // Selection
  selectedIds: string[];
  selectElements: (ids: string[]) => void;
  clearSelection: () => void;
  deleteSelected: () => void;
  duplicateSelected: () => void;
  colorSelected: (color: string) => void;

  // Search
  searchQuery: string;
  searchResults: string[];
  setSearchQuery: (query: string) => void;

  // Versions
  createVersion: (name: string) => void;
  restoreVersion: (versionId: string) => void;
  deleteVersion: (versionId: string) => void;

  // Node positions (React Flow integration)
  nodePositions: Record<string, { x: number; y: number }>;
  updateNodePosition: (id: string, position: { x: number; y: number }) => void;
}

export const useDesignerStore = create<DesignerStore>((set, get) => ({
  // === Project State ===
  project: null,
  projects: [],

  loadProjects: () => {
    const projects = loadProjectList();
    set({ projects });
  },

  loadProject: (id: string) => {
    const project = loadProjectFromStorage(id);
    if (project) {
      // Rebuild node positions from project data
      const nodePositions: Record<string, { x: number; y: number }> = {};
      project.notes.forEach((note) => {
        nodePositions[note.id] = note.position;
      });
      set({ project, nodePositions });
    }
  },

  saveProject: () => {
    const { project, projects } = get();
    if (!project) return;
    const now = new Date().toISOString();
    const updated = { ...project, updatedAt: now };
    saveProjectToStorage(updated);
    const updatedList = projects.map((p) =>
      p.id === project.id ? { ...p, updatedAt: now, name: project.name, status: project.status } : p
    );
    saveProjectList(updatedList);
    set({ project: updated, projects: updatedList });
  },

  createProject: (name: string) => {
    const id = uuidv4();
    const now = new Date().toISOString();
    const project: Project = {
      id,
      name,
      status: 'progress',
      steps: [],
      conditions: [],
      softStarts: [],
      notes: [],
      connections: [],
      anchors: [],
      versions: [],
      createdAt: now,
      updatedAt: now,
    };
    saveProjectToStorage(project);
    const listItem: ProjectListItem = { id, name, status: 'progress', createdAt: now, updatedAt: now };
    const projects = [...get().projects, listItem];
    saveProjectList(projects);
    set({ projects });
    return id;
  },

  deleteProject: (id: string) => {
    deleteProjectData(id);
    const projects = get().projects.filter((p) => p.id !== id);
    saveProjectList(projects);
    const project = get().project?.id === id ? null : get().project;
    set({ projects, project });
  },

  duplicateProject: (id: string) => {
    const source = loadProjectFromStorage(id);
    if (!source) return;
    const newId = uuidv4();
    const now = new Date().toISOString();
    const duplicate: Project = {
      ...source,
      id: newId,
      name: `${source.name} (copy)`,
      createdAt: now,
      updatedAt: now,
      versions: [],
    };
    saveProjectToStorage(duplicate);
    const listItem: ProjectListItem = {
      id: newId,
      name: duplicate.name,
      status: duplicate.status,
      createdAt: now,
      updatedAt: now,
    };
    const projects = [...get().projects, listItem];
    saveProjectList(projects);
    set({ projects });
  },

  renameProject: (id: string, name: string) => {
    const projects = get().projects.map((p) => (p.id === id ? { ...p, name } : p));
    saveProjectList(projects);
    const project = get().project;
    if (project?.id === id) {
      const updated = { ...project, name };
      saveProjectToStorage(updated);
      set({ project: updated, projects });
    } else {
      const stored = loadProjectFromStorage(id);
      if (stored) {
        saveProjectToStorage({ ...stored, name });
      }
      set({ projects });
    }
  },

  updateProjectStatus: (id: string, status: 'progress' | 'approval' | 'done') => {
    const projects = get().projects.map((p) => (p.id === id ? { ...p, status } : p));
    saveProjectList(projects);
    const project = get().project;
    if (project?.id === id) {
      const updated = { ...project, status };
      saveProjectToStorage(updated);
      set({ project: updated, projects });
    } else {
      const stored = loadProjectFromStorage(id);
      if (stored) {
        saveProjectToStorage({ ...stored, status });
      }
      set({ projects });
    }
  },

  // === Steps ===
  addStep: (position: { x: number; y: number }) => {
    const { project, nodePositions } = get();
    if (!project) return '';
    const id = uuidv4();
    const step: Step = {
      id,
      name: 'New Step',
      color: STEP_COLORS[0],
      blocks: [{ id: uuidv4(), type: 'text', content: 'Enter text...' }],
    };
    set({
      project: { ...project, steps: [...project.steps, step] },
      nodePositions: { ...nodePositions, [id]: position },
    });
    return id;
  },

  deleteStep: (id: string) => {
    const { project } = get();
    if (!project) return;
    set({
      project: {
        ...project,
        steps: project.steps.filter((s) => s.id !== id),
        connections: project.connections.filter((c) => c.sourceId !== id && c.targetId !== id),
      },
    });
  },

  duplicateStep: (id: string) => {
    const { project, nodePositions } = get();
    if (!project) return;
    const step = project.steps.find((s) => s.id === id);
    if (!step) return;
    const newId = uuidv4();
    const pos = nodePositions[id] || { x: 100, y: 100 };
    const duplicate: Step = {
      ...step,
      id: newId,
      name: `${step.name} (copy)`,
      blocks: step.blocks.map((b) => ({ ...b, id: uuidv4() })),
    };
    set({
      project: { ...project, steps: [...project.steps, duplicate] },
      nodePositions: { ...nodePositions, [newId]: { x: pos.x + 50, y: pos.y + 50 } },
    });
  },

  updateStep: (id: string, updates: Partial<Step>) => {
    const { project } = get();
    if (!project) return;
    set({
      project: {
        ...project,
        steps: project.steps.map((s) => (s.id === id ? { ...s, ...updates } : s)),
      },
    });
  },

  // === Blocks ===
  addBlock: (stepId: string, type: BlockType) => {
    const { project } = get();
    if (!project) return;
    const step = project.steps.find((s) => s.id === stepId);
    if (!step) return;

    // Check constraints: only 1 buttons or user-input block, must be last
    if (type === 'buttons' || type === 'user-input') {
      const hasTerminal = step.blocks.some((b) => b.type === 'buttons' || b.type === 'user-input');
      if (hasTerminal) return; // already has a terminal block
    }

    let block: Block;
    if (type === 'text') {
      block = { id: uuidv4(), type: 'text', content: '' } as TextBlock;
    } else if (type === 'buttons') {
      block = {
        id: uuidv4(),
        type: 'buttons',
        buttons: [{ id: uuidv4(), label: 'Button 1' }],
      } as ButtonsBlock;
    } else {
      block = { id: uuidv4(), type: 'user-input', placeholder: 'Type here...' } as UserInputBlock;
    }

    // Terminal blocks must be at the end
    const blocks = type === 'text'
      ? [...step.blocks.filter((b) => b.type === 'text'), block, ...step.blocks.filter((b) => b.type !== 'text')]
      : [...step.blocks, block];

    set({
      project: {
        ...project,
        steps: project.steps.map((s) => (s.id === stepId ? { ...s, blocks } : s)),
      },
    });
  },

  deleteBlock: (stepId: string, blockId: string) => {
    const { project } = get();
    if (!project) return;
    set({
      project: {
        ...project,
        steps: project.steps.map((s) =>
          s.id === stepId ? { ...s, blocks: s.blocks.filter((b) => b.id !== blockId) } : s
        ),
      },
    });
  },

  updateBlock: (stepId: string, blockId: string, updates: Partial<Block>) => {
    const { project } = get();
    if (!project) return;
    set({
      project: {
        ...project,
        steps: project.steps.map((s) =>
          s.id === stepId
            ? { ...s, blocks: s.blocks.map((b) => (b.id === blockId ? { ...b, ...updates } as Block : b)) }
            : s
        ),
      },
    });
  },

  duplicateBlock: (stepId: string, blockId: string) => {
    const { project } = get();
    if (!project) return;
    const step = project.steps.find((s) => s.id === stepId);
    if (!step) return;
    const block = step.blocks.find((b) => b.id === blockId);
    if (!block || block.type !== 'text') return; // only text blocks can be duplicated
    const duplicate = { ...block, id: uuidv4() };
    const idx = step.blocks.indexOf(block);
    const blocks = [...step.blocks];
    blocks.splice(idx + 1, 0, duplicate);
    set({
      project: {
        ...project,
        steps: project.steps.map((s) => (s.id === stepId ? { ...s, blocks } : s)),
      },
    });
  },

  addButton: (stepId: string, blockId: string) => {
    const { project } = get();
    if (!project) return;
    set({
      project: {
        ...project,
        steps: project.steps.map((s) =>
          s.id === stepId
            ? {
                ...s,
                blocks: s.blocks.map((b) =>
                  b.id === blockId && b.type === 'buttons'
                    ? { ...b, buttons: [...b.buttons, { id: uuidv4(), label: `Button ${b.buttons.length + 1}` }] }
                    : b
                ),
              }
            : s
        ),
      },
    });
  },

  deleteButton: (stepId: string, blockId: string, buttonId: string) => {
    const { project } = get();
    if (!project) return;
    set({
      project: {
        ...project,
        steps: project.steps.map((s) =>
          s.id === stepId
            ? {
                ...s,
                blocks: s.blocks.map((b) =>
                  b.id === blockId && b.type === 'buttons'
                    ? { ...b, buttons: b.buttons.filter((btn) => btn.id !== buttonId) }
                    : b
                ),
              }
            : s
        ),
        connections: project.connections.filter((c) => c.sourceHandleId !== `button-${buttonId}`),
      },
    });
  },

  updateButtonLabel: (stepId: string, blockId: string, buttonId: string, label: string) => {
    const { project } = get();
    if (!project) return;
    set({
      project: {
        ...project,
        steps: project.steps.map((s) =>
          s.id === stepId
            ? {
                ...s,
                blocks: s.blocks.map((b) =>
                  b.id === blockId && b.type === 'buttons'
                    ? { ...b, buttons: b.buttons.map((btn) => (btn.id === buttonId ? { ...btn, label } : btn)) }
                    : b
                ),
              }
            : s
        ),
      },
    });
  },

  reorderButtons: (stepId: string, blockId: string, buttonIds: string[]) => {
    const { project } = get();
    if (!project) return;
    set({
      project: {
        ...project,
        steps: project.steps.map((s) =>
          s.id === stepId
            ? {
                ...s,
                blocks: s.blocks.map((b) => {
                  if (b.id !== blockId || b.type !== 'buttons') return b;
                  const ordered = buttonIds
                    .map((id) => b.buttons.find((btn) => btn.id === id))
                    .filter(Boolean) as typeof b.buttons;
                  return { ...b, buttons: ordered };
                }),
              }
            : s
        ),
      },
    });
  },

  // === Connections ===
  addConnection: (conn: Omit<Connection, 'id'>) => {
    const { project } = get();
    if (!project) return;
    const connection: Connection = { ...conn, id: uuidv4() };
    set({ project: { ...project, connections: [...project.connections, connection] } });
  },

  deleteConnection: (id: string) => {
    const { project } = get();
    if (!project) return;
    set({ project: { ...project, connections: project.connections.filter((c) => c.id !== id) } });
  },

  updateConnectionColor: (id: string, color: string) => {
    const { project } = get();
    if (!project) return;
    set({
      project: {
        ...project,
        connections: project.connections.map((c) => (c.id === id ? { ...c, color } : c)),
      },
    });
  },

  updateConnectionLabel: (id: string, label: string) => {
    const { project } = get();
    if (!project) return;
    set({
      project: {
        ...project,
        connections: project.connections.map((c) => (c.id === id ? { ...c, label } : c)),
      },
    });
  },

  // === Conditions ===
  addCondition: (position: { x: number; y: number }) => {
    const { project, nodePositions } = get();
    if (!project) return '';
    const id = uuidv4();
    const condition: ConditionNode = {
      id,
      conditions: [
        { id: uuidv4(), label: 'If true' },
        { id: uuidv4(), label: 'Else' },
      ],
    };
    set({
      project: { ...project, conditions: [...project.conditions, condition] },
      nodePositions: { ...nodePositions, [id]: position },
    });
    return id;
  },

  addConditionBranch: (conditionId: string) => {
    const { project } = get();
    if (!project) return;
    set({
      project: {
        ...project,
        conditions: project.conditions.map((c) =>
          c.id === conditionId
            ? { ...c, conditions: [...c.conditions, { id: uuidv4(), label: `Condition ${c.conditions.length + 1}` }] }
            : c
        ),
      },
    });
  },

  deleteConditionBranch: (conditionId: string, branchId: string) => {
    const { project } = get();
    if (!project) return;
    set({
      project: {
        ...project,
        conditions: project.conditions.map((c) =>
          c.id === conditionId
            ? { ...c, conditions: c.conditions.filter((b) => b.id !== branchId) }
            : c
        ),
        connections: project.connections.filter((conn) => conn.sourceHandleId !== `condition-${branchId}`),
      },
    });
  },

  updateConditionBranchLabel: (conditionId: string, branchId: string, label: string) => {
    const { project } = get();
    if (!project) return;
    set({
      project: {
        ...project,
        conditions: project.conditions.map((c) =>
          c.id === conditionId
            ? { ...c, conditions: c.conditions.map((b) => (b.id === branchId ? { ...b, label } : b)) }
            : c
        ),
      },
    });
  },

  // === Soft Start ===
  addSoftStart: (position: { x: number; y: number }) => {
    const { project, nodePositions } = get();
    if (!project) return '';
    const id = uuidv4();
    const softStart: SoftStart = { id, name: 'Start', buttonLabel: 'Get Started' };
    set({
      project: { ...project, softStarts: [...project.softStarts, softStart] },
      nodePositions: { ...nodePositions, [id]: position },
    });
    return id;
  },

  updateSoftStart: (id: string, updates: Partial<SoftStart>) => {
    const { project } = get();
    if (!project) return;
    set({
      project: {
        ...project,
        softStarts: project.softStarts.map((s) => (s.id === id ? { ...s, ...updates } : s)),
      },
    });
  },

  // === Notes ===
  addNote: (position: { x: number; y: number }) => {
    const { project, nodePositions } = get();
    if (!project) return '';
    const id = uuidv4();
    const note: StickyNote = { id, content: 'New note...', position };
    set({
      project: { ...project, notes: [...project.notes, note] },
      nodePositions: { ...nodePositions, [id]: position },
    });
    return id;
  },

  updateNote: (id: string, content: string) => {
    const { project } = get();
    if (!project) return;
    set({
      project: {
        ...project,
        notes: project.notes.map((n) => (n.id === id ? { ...n, content } : n)),
      },
    });
  },

  deleteNote: (id: string) => {
    const { project } = get();
    if (!project) return;
    set({
      project: { ...project, notes: project.notes.filter((n) => n.id !== id) },
    });
  },

  // === Selection ===
  selectedIds: [],

  selectElements: (ids: string[]) => set({ selectedIds: ids }),
  clearSelection: () => set({ selectedIds: [] }),

  deleteSelected: () => {
    const { project, selectedIds } = get();
    if (!project || selectedIds.length === 0) return;
    set({
      project: {
        ...project,
        steps: project.steps.filter((s) => !selectedIds.includes(s.id)),
        conditions: project.conditions.filter((c) => !selectedIds.includes(c.id)),
        softStarts: project.softStarts.filter((s) => !selectedIds.includes(s.id)),
        notes: project.notes.filter((n) => !selectedIds.includes(n.id)),
        connections: project.connections.filter(
          (c) =>
            !selectedIds.includes(c.id) &&
            !selectedIds.includes(c.sourceId) &&
            !selectedIds.includes(c.targetId)
        ),
      },
      selectedIds: [],
    });
  },

  duplicateSelected: () => {
    const { selectedIds } = get();
    selectedIds.forEach((id) => {
      const { project } = get();
      if (!project) return;
      if (project.steps.find((s) => s.id === id)) get().duplicateStep(id);
    });
  },

  colorSelected: (color: string) => {
    const { project, selectedIds } = get();
    if (!project) return;
    set({
      project: {
        ...project,
        steps: project.steps.map((s) => (selectedIds.includes(s.id) ? { ...s, color } : s)),
      },
    });
  },

  // === Search ===
  searchQuery: '',
  searchResults: [],

  setSearchQuery: (query: string) => {
    const { project } = get();
    if (!project || !query.trim()) {
      set({ searchQuery: query, searchResults: [] });
      return;
    }
    const q = query.toLowerCase();
    const results: string[] = [];

    project.steps.forEach((step) => {
      if (step.name.toLowerCase().includes(q)) results.push(step.id);
      step.blocks.forEach((block) => {
        if (block.type === 'text' && block.content.toLowerCase().includes(q)) results.push(step.id);
        if (block.type === 'buttons') {
          block.buttons.forEach((btn) => {
            if (btn.label.toLowerCase().includes(q)) results.push(step.id);
          });
        }
      });
    });

    project.softStarts.forEach((s) => {
      if (s.name.toLowerCase().includes(q) || s.buttonLabel.toLowerCase().includes(q)) results.push(s.id);
    });

    project.notes.forEach((n) => {
      if (n.content.toLowerCase().includes(q)) results.push(n.id);
    });

    set({ searchQuery: query, searchResults: Array.from(new Set(results)) });
  },

  // === Versions ===
  createVersion: (name: string) => {
    const { project } = get();
    if (!project) return;
    const version = {
      id: uuidv4(),
      name,
      date: new Date().toISOString(),
      snapshot: JSON.stringify({ ...project, versions: [] }),
    };
    set({ project: { ...project, versions: [...project.versions, version] } });
  },

  restoreVersion: (versionId: string) => {
    const { project } = get();
    if (!project) return;
    const version = project.versions.find((v) => v.id === versionId);
    if (!version) return;
    const restored = JSON.parse(version.snapshot) as Project;
    set({
      project: { ...restored, id: project.id, versions: project.versions },
    });
  },

  deleteVersion: (versionId: string) => {
    const { project } = get();
    if (!project) return;
    set({
      project: {
        ...project,
        versions: project.versions.filter((v) => v.id !== versionId),
      },
    });
  },

  // === Node Positions ===
  nodePositions: {},
  updateNodePosition: (id: string, position: { x: number; y: number }) => {
    set((state) => ({
      nodePositions: { ...state.nodePositions, [id]: position },
    }));
  },
}));
