# Sefbot Conversational Designer - Claude Code Agent Teams Instructions

## Project Overview

Build a **Conversational Designer** (wireframe editor) for the Sefbot platform. This is a visual canvas-based tool where users design chatbot conversation flows by placing, editing, and connecting blocks — similar to [Voiceflow's designer](https://www.voiceflow.com/solutions/conversation-design).

**This is Stage 1 only** — we are NOT building the chatbot runtime, analytics, notifications, or user management. Only the visual conversation designer.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | **Next.js 14+ (App Router)** |
| Canvas/Flow | **React Flow (xyflow)** — the de facto library for node-based UIs |
| State Management | **Zustand** — lightweight, works great with React Flow |
| Styling | **Tailwind CSS** + **shadcn/ui** for components |
| Persistence | **LocalStorage** for now (backend will come later) |
| Language | **TypeScript** throughout |

---

## Agent Team Structure

### Team Lead (Project Manager)

You coordinate the two developers. Your responsibilities:

1. **Break down work into parallel tasks** using the shared task list
2. **Define interfaces first** — before developers start coding, ensure shared TypeScript types are agreed upon
3. **Review integration points** — when Developer A's canvas connects to Developer B's panel, verify the contract
4. **Run the build** after each integration milestone to catch issues early
5. **Manage task dependencies** — mark blocking tasks clearly

### Developer A — Canvas & Flow Engine

Owns: `src/components/canvas/`, `src/stores/`, `src/types/`, `src/lib/`

Responsible for:
- React Flow canvas setup
- All custom node types (Step, Condition, SoftStart)
- Edge/connection logic
- Drag & drop from sidebar onto canvas
- Selection, multi-select, delete, duplicate
- Canvas zoom, pan, minimap
- Auto-save logic
- Search/find functionality (Ctrl+F)

### Developer B — UI Panels, Block Editing & Export

Owns: `src/components/sidebar/`, `src/components/panels/`, `src/components/shared/`, `src/app/`

Responsible for:
- Left sidebar (element palette)
- Right panel (block editor — text editing, button management)
- Inline editing within nodes
- Text formatting (bold, italic via Ctrl+B, Ctrl+I)
- Color palette for steps and edges
- Notes/sticky notes
- PDF and Excel export
- Project management UI (create, rename, delete, duplicate projects)

---

## Shared Contract (Define FIRST before any coding)

```typescript
// src/types/index.ts — BOTH developers must agree on this before starting

// === BLOCK TYPES ===
type BlockType = 'text' | 'buttons' | 'user-input';

interface TextBlock {
  id: string;
  type: 'text';
  content: string; // supports basic HTML: <b>, <i>
}

interface ButtonItem {
  id: string;
  label: string;
}

interface ButtonsBlock {
  id: string;
  type: 'buttons';
  buttons: ButtonItem[];
}

interface UserInputBlock {
  id: string;
  type: 'user-input';
  placeholder?: string;
}

type Block = TextBlock | ButtonsBlock | UserInputBlock;

// === STEP (a node on the canvas) ===
interface Step {
  id: string;
  name: string;
  color: string; // one of 10 predefined colors
  blocks: Block[]; // ordered list — buttons/user-input must be last, max 1
}

// === CONDITION NODE ===
interface ConditionBranch {
  id: string;
  label: string;
}

interface ConditionNode {
  id: string;
  conditions: ConditionBranch[];
}

// === SOFT START NODE ===
interface SoftStart {
  id: string;
  name: string;
  buttonLabel: string;
}

// === NOTE (sticky note on canvas) ===
interface StickyNote {
  id: string;
  content: string;
  position: { x: number; y: number };
}

// === ANCHOR (kotva) ===
interface Anchor {
  id: string;
  targetElementId: string; // references any element
  label?: string;
}

// === CONNECTION (edge) ===
interface Connection {
  id: string;
  sourceId: string;
  sourceHandleId?: string; // for button-specific connections
  targetId: string;
  label?: string; // auto-filled from button label if from button
  color?: string; // defaults to source step color
}

// === PROJECT ===
interface Project {
  id: string;
  name: string;
  status: 'progress' | 'approval' | 'done';
  steps: Step[];
  conditions: ConditionNode[];
  softStarts: SoftStart[];
  notes: StickyNote[];
  connections: Connection[];
  anchors: Anchor[];
  versions: ProjectVersion[];
  createdAt: string;
  updatedAt: string;
}

interface ProjectVersion {
  id: string;
  name: string;
  date: string;
  snapshot: string; // JSON stringified project state
}

// === ZUSTAND STORE INTERFACE ===
interface DesignerStore {
  // Project
  project: Project | null;
  projects: ProjectListItem[];
  loadProject: (id: string) => void;
  saveProject: () => void;
  createProject: (name: string) => void;
  deleteProject: (id: string) => void;
  duplicateProject: (id: string) => void;
  renameProject: (id: string, name: string) => void;

  // Steps
  addStep: (position: { x: number; y: number }) => void;
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

  // Connections
  addConnection: (conn: Omit<Connection, 'id'>) => void;
  deleteConnection: (id: string) => void;
  updateConnectionColor: (id: string, color: string) => void;

  // Conditions
  addCondition: (position: { x: number; y: number }) => void;
  addConditionBranch: (conditionId: string) => void;
  deleteConditionBranch: (conditionId: string, branchId: string) => void;

  // Soft Start
  addSoftStart: (position: { x: number; y: number }) => void;

  // Notes
  addNote: (position: { x: number; y: number }) => void;
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
}
```

---

## Detailed Acceptance Criteria (Designer Scope Only)

### 1. Canvas & Navigation

| # | Feature | Acceptance Criteria |
|---|---------|-------------------|
| 1.1 | Infinite canvas | Pan with mouse drag or two-finger trackpad. Zoom with scroll wheel or +/- keys. |
| 1.2 | Minimap | Small overview in corner showing all elements |
| 1.3 | Left sidebar menu | Shows draggable element types: Soft Start, Text Step, Buttons Step, User Input Step, Condition |
| 1.4 | Drag & drop | Elements from sidebar can be dragged onto canvas to create new nodes |

### 2. Elements — Soft Start

| # | Feature | Acceptance Criteria |
|---|---------|-------------------|
| 2.1 | Create | Has a name and a button label. Visually distinct (entry point). |
| 2.2 | Connect | Has output handle on right side to connect to first step |

### 3. Elements — Steps (Kroky)

| # | Feature | Acceptance Criteria |
|---|---------|-------------------|
| 3.1 | Step = container | A step holds ordered blocks. Has a visible name/title. |
| 3.2 | Block types | Text (unlimited), Buttons (max 1, must be last), User Input (max 1, must be last) |
| 3.3 | Add block | Hover on step shows "+" button at bottom → choose block type to add |
| 3.4 | Step limit | Up to 500 steps per project |
| 3.5 | Step name | Editable by double-click on the step header |

### 4. Elements — Text Block

| # | Feature | Acceptance Criteria |
|---|---------|-------------------|
| 4.1 | Inline editing | Double-click on text to enter edit mode, cursor blinks, changes show immediately |
| 4.2 | Formatting | Bold (Ctrl+B / Cmd+B), Italic (Ctrl+I / Cmd+I) |

### 5. Elements — Buttons Block

| # | Feature | Acceptance Criteria |
|---|---------|-------------------|
| 5.1 | Add button | Hover shows "+" under the buttons block, click adds a new button |
| 5.2 | Remove button | Each button has a delete option |
| 5.3 | Reorder buttons | Drag to reorder buttons within the block |
| 5.4 | Button label | Editable by double-click |
| 5.5 | Individual connection | Each button has its own output handle (right side dot) to connect to different steps |

### 6. Elements — User Input Block

| # | Feature | Acceptance Criteria |
|---|---------|-------------------|
| 6.1 | Display | Shows as a distinct input field placeholder |
| 6.2 | Connection | Has one output handle for the "after input" connection |

### 7. Elements — Conditions

| # | Feature | Acceptance Criteria |
|---|---------|-------------------|
| 7.1 | Visual distinction | Must look visually different from steps (different shape/color) |
| 7.2 | Branches | Can add multiple condition branches, each with its own output handle |
| 7.3 | Add branch | Hover shows "+" to add new condition branch |

### 8. Connections (Edges/Arrows)

| # | Feature | Acceptance Criteria |
|---|---------|-------------------|
| 8.1 | Create | Drag from right-side dot of element to another element. Magnetic snap to target. |
| 8.2 | From text block | Only connects if no buttons/user-input block exists in the step |
| 8.3 | From buttons | Each button connects individually. Label auto-fills with button text. |
| 8.4 | From user input | Magnetic snap connection |
| 8.5 | Label | Shown on edge. From buttons = auto button label. Otherwise editable. Can reposition along edge. |
| 8.6 | Color | Defaults to source step color. Can be manually changed (10-color palette). |
| 8.7 | Shape | Edge path can be adjusted on X and Y axes (bezier control points) |
| 8.8 | Delete | Click edge → delete button or Delete key |
| 8.9 | Right-click shortcut | Right-click on output dot → shows list of all existing steps by name → click to connect |

### 9. Anchors (Kotvy)

| # | Feature | Acceptance Criteria |
|---|---------|-------------------|
| 9.1 | Add anchor | Any element can have an anchor as output (alternative to arrow) |
| 9.2 | Anchor menu | Shows all existing elements as possible targets |
| 9.3 | Anchor note | Displays a note with link to target element |
| 9.4 | Click anchor | Clicking an anchor navigates/scrolls to the referenced element |

### 10. Notes (Sticky Notes)

| # | Feature | Acceptance Criteria |
|---|---------|-------------------|
| 10.1 | Create | Can place anywhere on canvas. Looks like a yellow sticky note. |
| 10.2 | Edit | Double-click to edit content |
| 10.3 | Delete | Delete key or icon |
| 10.4 | Duplicate | Duplicate icon on hover |

### 11. Element Operations

| # | Feature | Acceptance Criteria |
|---|---------|-------------------|
| 11.1 | Delete | Hover shows trash icon on left side of element. Also Delete key. No confirmation needed. |
| 11.2 | Duplicate | Hover shows duplicate icon on left side |
| 11.3 | Multi-select | Shift + drag rectangle selection. Also Ctrl/Cmd + click. |
| 11.4 | Bulk operations | On multi-select: Duplicate, Delete, Move (drag), Change color |
| 11.5 | Colors | 10 predefined colors. Apply to steps. Multi-select can color all at once. |

### 12. Saving

| # | Feature | Acceptance Criteria |
|---|---------|-------------------|
| 12.1 | Auto-save | Saves when user leaves/changes an element (on blur) |
| 12.2 | Auto-save timer | Also saves every 5 minutes automatically |
| 12.3 | Auto-save on exit | Saves when leaving the project |

### 13. Search

| # | Feature | Acceptance Criteria |
|---|---------|-------------------|
| 13.1 | Trigger | Ctrl+F / Cmd+F opens search bar |
| 13.2 | Scope | Searches step names, text content, button labels — everything |
| 13.3 | Results | Highlights matching elements. Navigate between results. |

### 14. Versioning

| # | Feature | Acceptance Criteria |
|---|---------|-------------------|
| 14.1 | Create version | Manual, with custom name + auto date |
| 14.2 | Preview | View a version without restoring |
| 14.3 | Restore | Restore project to a saved version |
| 14.4 | Delete version | Remove a version |

### 15. Project Management

| # | Feature | Acceptance Criteria |
|---|---------|-------------------|
| 15.1 | Create | New project with name |
| 15.2 | Rename | Editable project name |
| 15.3 | Delete | Remove project |
| 15.4 | Duplicate | Copy entire project |
| 15.5 | Search projects | Fulltext by project name |
| 15.6 | Kanban view | Three columns: Progress, Approval, Done. Drag to change status. |

### 16. Export

| # | Feature | Acceptance Criteria |
|---|---------|-------------------|
| 16.1 | PDF | 1:1 visual export of what's visible on canvas (no hover-only UI) |
| 16.2 | Excel/CSV | Column A = step name, Column B = text, Columns C+ = button labels. One row per step. |

---

## Color Palette (10 predefined colors)

```typescript
const STEP_COLORS = [
  '#4A90D9', // Blue
  '#7B68EE', // Purple
  '#E74C3C', // Red
  '#F39C12', // Orange
  '#27AE60', // Green
  '#1ABC9C', // Teal
  '#E91E63', // Pink
  '#8D6E63', // Brown
  '#607D8B', // Grey-blue
  '#2C3E50', // Dark navy
] as const;
```

---

## Folder Structure

```
src/
├── app/
│   ├── layout.tsx
│   ├── page.tsx                    # Project list / Kanban
│   └── project/[id]/
│       └── page.tsx                # Designer canvas view
├── components/
│   ├── canvas/
│   │   ├── DesignerCanvas.tsx      # Main React Flow canvas
│   │   ├── nodes/
│   │   │   ├── StepNode.tsx        # Step node (contains blocks)
│   │   │   ├── ConditionNode.tsx   # Condition node
│   │   │   ├── SoftStartNode.tsx   # Soft start node
│   │   │   └── NoteNode.tsx        # Sticky note node
│   │   ├── edges/
│   │   │   └── CustomEdge.tsx      # Labeled, colored, editable edge
│   │   ├── blocks/
│   │   │   ├── TextBlock.tsx       # Text block inside step
│   │   │   ├── ButtonsBlock.tsx    # Buttons block inside step
│   │   │   └── UserInputBlock.tsx  # User input block inside step
│   │   └── controls/
│   │       ├── SearchBar.tsx       # Ctrl+F search overlay
│   │       └── Toolbar.tsx         # Zoom, undo, etc.
│   ├── sidebar/
│   │   ├── ElementPalette.tsx      # Left sidebar with draggable elements
│   │   └── ProjectSidebar.tsx      # Project list sidebar
│   ├── panels/
│   │   ├── StepEditor.tsx          # Right panel for editing selected step
│   │   ├── ConnectionEditor.tsx    # Right panel for editing selected edge
│   │   ├── ColorPicker.tsx         # 10-color palette
│   │   └── VersionPanel.tsx        # Version history panel
│   └── shared/
│       ├── InlineTextEditor.tsx    # Double-click-to-edit with bold/italic
│       └── ConfirmDialog.tsx
├── stores/
│   └── designerStore.ts           # Zustand store (single source of truth)
├── types/
│   └── index.ts                   # All shared types (contract above)
├── lib/
│   ├── export-pdf.ts              # PDF export using html2canvas or similar
│   ├── export-excel.ts            # Excel export using SheetJS
│   ├── storage.ts                 # LocalStorage persistence layer
│   └── utils.ts                   # ID generation, color helpers
└── hooks/
    ├── useAutoSave.ts             # Auto-save hook (on blur + 5min timer)
    ├── useKeyboardShortcuts.ts    # Ctrl+F, Delete, Ctrl+B, etc.
    └── useSearch.ts               # Search logic
```

---

## Implementation Phases (for Team Lead to orchestrate)

### Phase 1 — Foundation (Day 1)
**Both developers work in parallel:**

- **Dev A**: Set up Next.js project, install React Flow + Zustand + Tailwind + shadcn. Create the `DesignerCanvas.tsx` with basic pan/zoom. Implement the Zustand store skeleton with all type definitions.
- **Dev B**: Create the project list page with create/rename/delete/duplicate. Build the left sidebar `ElementPalette.tsx` with the 5 draggable element types.

**Integration checkpoint**: Dev A's canvas accepts drag events, Dev B's sidebar emits them.

### Phase 2 — Core Nodes (Day 2-3)
**Both developers work in parallel:**

- **Dev A**: Build all 4 custom node types (`StepNode`, `ConditionNode`, `SoftStartNode`, `NoteNode`). Implement connection logic — handles, magnetic snapping, edge creation. Implement `CustomEdge` with labels and colors.
- **Dev B**: Build block components (`TextBlock`, `ButtonsBlock`, `UserInputBlock`) with inline editing. Build `InlineTextEditor` with bold/italic formatting. Build the "+" add-block button logic inside steps.

**Integration checkpoint**: Nodes render blocks from Dev B inside Dev A's canvas nodes.

### Phase 3 — Interactions (Day 4-5)
**Both developers work in parallel:**

- **Dev A**: Implement selection (click, multi-select with Shift+drag, Ctrl+click). Implement delete/duplicate for selected elements. Implement right-click context menu on output handles (list all steps). Implement anchors system.
- **Dev B**: Build right panel editors (`StepEditor`, `ConnectionEditor`). Build `ColorPicker` with 10 colors for steps and edges. Build `VersionPanel` with create/preview/restore/delete. Build Kanban view for project list page.

**Integration checkpoint**: Selecting a node on canvas opens the right editor panel.

### Phase 4 — Polish (Day 6-7)
**Both developers work in parallel:**

- **Dev A**: Implement search (Ctrl+F) with highlighting. Implement auto-save hooks. Edge path adjustment (bezier control points). Minimap. Keyboard shortcuts integration.
- **Dev B**: PDF export (html2canvas or dom-to-image → jsPDF). Excel/CSV export (SheetJS). Notes (sticky note styling and editing). Final UI polish and responsive layout.

**Final integration**: Full end-to-end test of all features.

---

## What is OUT OF SCOPE (do NOT build)

- User authentication / login / user management
- Chatbot runtime / preview / execution
- Bot settings (design, colors, smart start, avatars)
- Notifications (email, JSON webhooks)
- Analytics / reporting / logs
- Carousel, email, phone, location, calendar, stars, file input types
- Variables / scripting
- Real backend / database (use LocalStorage for now)
- Multi-user collaboration / locking
- Import from Voiceflow

---

## How to Run This in Claude Code IDX

```bash
# 1. Open your IDX terminal
# 2. Set the agent teams flag
export CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1

# 3. Start Claude Code and paste this prompt:
```

### Startup Prompt for Claude Code:

> I need you to act as **Team Lead** for building a Conversational Designer app. Read the file `SEFBOT_DESIGNER_INSTRUCTIONS.md` in the project root — it contains:
>
> - Full acceptance criteria extracted from our platform spec
> - Tech stack decisions (Next.js, React Flow, Zustand, Tailwind, shadcn/ui)
> - Shared TypeScript types that MUST be defined first
> - Folder structure
> - 4 implementation phases with parallel tasks for 2 developers
>
> **Your first action**: Create the shared types file (`src/types/index.ts`) and the Zustand store interface. Then spawn two teammates — Developer A (canvas & flow engine) and Developer B (UI panels & editing). Assign Phase 1 tasks to each. Coordinate using the shared task list with dependencies.
>
> Work through all 4 phases. After each phase, run `npm run build` to verify no errors before proceeding.

---

## Key Design Decisions & Notes

1. **React Flow** is the right choice — it handles canvas, nodes, edges, minimap, selection, zoom/pan out of the box. Don't reinvent it.
2. **Zustand** over Redux — simpler, less boilerplate, works well with React Flow's `useNodesState` / `useEdgesState`.
3. **Inline editing** — use `contentEditable` divs inside node components for the double-click-to-edit UX.
4. **Blocks inside steps** — this is a custom React Flow node that internally renders an ordered list of block components. Not separate React Flow nodes.
5. **Button connections** — each button needs its own React Flow handle (source handle). Use dynamic handle IDs like `button-{buttonId}`.
6. **Auto-save** — debounce at 1 second after last change, plus 5-minute interval, plus `beforeunload` event.
7. **Export PDF** — use `html2canvas` to capture the canvas viewport, then convert to PDF with `jsPDF`.
8. **Export Excel** — use `xlsx` (SheetJS) library. Iterate steps, flatten to rows.
