
A visual canvas-based chatbot conversation flow designer built with Next.js, React Flow, and Zustand. Design chatbot flows by placing, editing, and connecting blocks on an infinite canvas -- similar to tools like Voiceflow.

> **Stage 1** -- This is the visual conversation designer only. The chatbot runtime, analytics, and user management are not included.

![Screenshot placeholder](docs/screenshot.png)

---

## Tech Stack

| Layer            | Technology                                           |
| ---------------- | ---------------------------------------------------- |
| Framework        | Next.js 14 (App Router, static export)               |
| Canvas / Flow    | React Flow (`@xyflow/react` v12)                     |
| State Management | Zustand v5                                           |
| Styling          | Tailwind CSS v3 + shadcn/ui (Radix primitives)       |
| Persistence      | LocalStorage (backend integration planned)           |
| Language         | TypeScript throughout                                |
| PDF Export       | html2canvas + jsPDF                                  |
| Excel Export     | SheetJS (xlsx)                                       |
| Icons            | Lucide React                                         |
| IDs              | uuid v13                                             |
| Deployment       | Firebase Hosting (static export to `out/`)           |
| Dev Environment  | Google IDX (Nix-based, Node.js 20)                   |

---

## Features

### Canvas and Navigation
- Infinite pan-and-zoom canvas powered by React Flow
- Drag-and-drop node creation from the left sidebar palette
- Minimap with zoom and pan controls
- Snap-to-grid alignment (16px grid)
- Dot-pattern background
- Selection rectangle with partial intersection mode

### Node Types
- **Soft Start** -- Entry point node with a name and button label. Output handle connects to the first step.
- **Step** -- Container node that holds an ordered list of blocks (text, buttons, user input). Customizable name and color from a 10-color palette.
- **Condition** -- Branching node with multiple condition branches, each with its own labeled output handle. Visually distinct from steps.
- **Sticky Note** -- Yellow note that can be placed anywhere on the canvas for annotations.

### Block Types (inside Steps)
- **Text Block** -- Rich text with inline editing. Supports bold (`Ctrl+B`) and italic (`Ctrl+I`) formatting via `contentEditable`.
- **Buttons Block** -- Up to N buttons, each with its own label and individual output handle for connecting to different steps. Labels auto-populate connection edge labels. Max one per step, must be last.
- **User Input Block** -- Displays a placeholder input field with a single output handle. Max one per step, must be last.

### Connections (Edges)
- Drag from output handles to create connections with magnetic snapping
- Custom colored edges that default to the source step color
- Edge labels (auto-filled from button labels, or editable)
- Right-click context menu on nodes to quickly connect to any existing step
- Click-to-select edges with delete support

### Element Operations
- Delete nodes and edges via Delete/Backspace key or context actions
- Duplicate steps via `Ctrl+D`
- Multi-select with Shift+drag rectangle or Ctrl/Cmd+click
- Bulk operations on multi-select: delete, duplicate, change color
- 10 predefined colors for steps and edges

### Search
- `Ctrl+F` / `Cmd+F` opens a search overlay on the canvas
- Searches step names, text block content, button labels, soft start names, and note content
- Highlights matching nodes in the results

### Auto-Save
- Debounced save 1 second after any change
- Automatic save every 5 minutes
- Saves on `beforeunload` (browser tab close / navigation)

### Versioning
- Create named snapshots of the current project state
- Restore any previous version
- Delete old versions
- Version panel accessible from the toolbar

### Project Management (Home Page)
- Kanban board with three columns: **In Progress**, **Approval**, **Done**
- Drag-and-drop project cards between columns to change status
- Create, rename, duplicate, and delete projects
- Search/filter projects by name
- Each project card shows creation and last-updated dates

### Export
- **PDF** -- Captures the canvas viewport at 2x resolution using html2canvas, outputs via jsPDF
- **Excel** -- Exports steps as rows (step name, text content, button labels) and conditions to a separate sheet using SheetJS

### Keyboard Shortcuts

| Shortcut             | Action                   |
| -------------------- | ------------------------ |
| `Ctrl/Cmd + S`       | Save project             |
| `Ctrl/Cmd + D`       | Duplicate selected       |
| `Ctrl/Cmd + F`       | Open search              |
| `Ctrl/Cmd + B`       | Bold (in text editor)    |
| `Ctrl/Cmd + I`       | Italic (in text editor)  |
| `Delete / Backspace`  | Delete selected          |
| `Escape`             | Clear selection          |
| `Shift + drag`       | Rectangle multi-select   |

---

## Getting Started

### Prerequisites

- **Node.js** 20 or later
- **npm** (included with Node.js)

### Install

```bash
git clone <repository-url>
cd sefbot-designer
npm install
```

### Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build for Production

```bash
npm run build
```

This generates a static export in the `out/` directory (configured via `output: 'export'` in `next.config.mjs`).

### Lint

```bash
npm run lint
```

---

## Project Structure

```
sefbot-designer/
├── public/                          # Static assets
├── src/
│   ├── app/
│   │   ├── layout.tsx               # Root layout (Geist font, metadata)
│   │   ├── page.tsx                 # Home page -- Kanban project board
│   │   ├── globals.css              # Global styles and Tailwind imports
│   │   ├── fonts/                   # Geist Sans and Geist Mono font files
│   │   └── project/
│   │       └── page.tsx             # Designer page -- canvas + sidebar + panels
│   ├── components/
│   │   ├── canvas/
│   │   │   ├── DesignerCanvas.tsx   # React Flow canvas with drag/drop, selection
│   │   │   ├── nodes/
│   │   │   │   ├── StepNode.tsx     # Step node (renders blocks, handles, color)
│   │   │   │   ├── ConditionNode.tsx# Condition branching node
│   │   │   │   ├── SoftStartNode.tsx# Entry point node
│   │   │   │   └── NoteNode.tsx     # Sticky note node
│   │   │   ├── edges/
│   │   │   │   └── CustomEdge.tsx   # Colored, labeled edge
│   │   │   ├── blocks/
│   │   │   │   ├── TextBlock.tsx    # Inline-editable text block
│   │   │   │   ├── ButtonsBlock.tsx # Button list with individual handles
│   │   │   │   └── UserInputBlock.tsx# User input placeholder block
│   │   │   └── controls/
│   │   │       ├── SearchBar.tsx    # Ctrl+F search overlay
│   │   │       └── CanvasContextMenu.tsx # Right-click quick connections
│   │   ├── sidebar/
│   │   │   └── ElementPalette.tsx   # Left sidebar with draggable elements
│   │   ├── panels/
│   │   │   ├── StepEditor.tsx       # Right panel for step properties
│   │   │   ├── ConnectionEditor.tsx # Right panel for edge properties
│   │   │   ├── ColorPicker.tsx      # 10-color palette component
│   │   │   └── VersionPanel.tsx     # Version history management
│   │   ├── shared/
│   │   │   └── InlineTextEditor.tsx # contentEditable with bold/italic
│   │   └── ui/                      # shadcn/ui primitives
│   ├── stores/
│   │   └── designerStore.ts         # Zustand store (single source of truth)
│   ├── types/
│   │   └── index.ts                 # All TypeScript types and constants
│   ├── lib/
│   │   ├── storage.ts               # LocalStorage persistence layer
│   │   ├── export-pdf.ts            # PDF export (html2canvas + jsPDF)
│   │   ├── export-excel.ts          # Excel export (SheetJS)
│   │   └── utils.ts                 # Utility functions (cn helper)
│   └── hooks/
│       ├── useAutoSave.ts           # Debounced + interval + beforeunload save
│       └── useKeyboardShortcuts.ts  # Global keyboard shortcut handler
├── .idx/
│   └── dev.nix                      # Google IDX workspace configuration
├── firebase.json                    # Firebase Hosting config (serves from out/)
├── next.config.mjs                  # Next.js config (static export)
├── tailwind.config.ts               # Tailwind CSS configuration
├── tsconfig.json                    # TypeScript configuration
├── package.json                     # Dependencies and scripts
├── CLAUDE.md                        # Development notes for Claude Code
└── SEFBOT_DESIGNER_INSTRUCTIONS.md  # Original project specification
```

---

## Deploying to Firebase Hosting

The project is configured for static export and Firebase Hosting.

### 1. Build the static site

```bash
npm run build
```

This outputs static HTML/CSS/JS to the `out/` directory.

### 2. Install Firebase CLI (if not installed)

```bash
npm install -g firebase-tools
```

### 3. Login and initialize (first time only)

```bash
firebase login
firebase init hosting
```

When prompted, set the public directory to `out` and configure as a single-page app (rewrite all URLs to `/index.html`).

The `firebase.json` is already configured:

```json
{
  "hosting": {
    "public": "out",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [
      { "source": "**", "destination": "/index.html" }
    ]
  }
}
```

### 4. Deploy

```bash
firebase deploy
```

---

## Architecture Overview

### State Management (Zustand)

The entire application state is managed by a single Zustand store (`src/stores/designerStore.ts`). This store holds:

- **Project data** -- steps, conditions, soft starts, notes, connections, anchors, versions
- **Project list** -- all projects with their names, statuses, and timestamps
- **UI state** -- selected element IDs, search query, search results
- **Node positions** -- canvas positions for all nodes (synced with React Flow)

All mutations go through the store. The store is the single source of truth, and React Flow nodes/edges are derived from it via `useMemo` in the canvas component.

### React Flow Integration

React Flow provides the canvas infrastructure. The integration pattern is:

1. **Store to React Flow** -- The `DesignerCanvas` component reads project data from Zustand and converts it to React Flow nodes and edges using `useMemo`.
2. **React Flow to Store** -- User interactions (node drag, selection change, connection creation) trigger Zustand store updates via callbacks.
3. **Custom Nodes** -- Four custom node types (`stepNode`, `conditionNode`, `softStartNode`, `noteNode`) are registered with React Flow and render project-specific UI.
4. **Custom Edges** -- A single custom edge type (`customEdge`) renders colored, labeled connections.

Node positions are stored separately in the Zustand store's `nodePositions` map, updated on every drag via `onNodesChange`.

### LocalStorage Persistence

Data is persisted to LocalStorage via `src/lib/storage.ts`:

- **Project list** is stored under the key `sefbot-projects` as a JSON array of `ProjectListItem` objects.
- **Individual projects** are stored under `sefbot-project-{id}` as full JSON `Project` objects.

The `useAutoSave` hook triggers saves:
- 1 second after the last change (debounced)
- Every 5 minutes (interval)
- On browser tab close (`beforeunload` event)

### Data Flow Diagram

```
User Interaction
       |
       v
React Flow Callbacks (onNodesChange, onConnect, onSelectionChange)
       |
       v
Zustand Store (designerStore.ts) -- single source of truth
       |
       +---> React Flow Nodes/Edges (derived via useMemo)
       |
       +---> Right Panel Editors (StepEditor, ConnectionEditor)
       |
       +---> LocalStorage (via useAutoSave hook)
```

---

## Color Palette

The application uses 10 predefined colors for steps, edges, and bulk color operations:

| Color      | Hex       |
| ---------- | --------- |
| Blue       | `#4A90D9` |
| Purple     | `#7B68EE` |
| Red        | `#E74C3C` |
| Orange     | `#F39C12` |
| Green      | `#27AE60` |
| Teal       | `#1ABC9C` |
| Pink       | `#E91E63` |
| Brown      | `#8D6E63` |
| Grey-blue  | `#607D8B` |
| Dark navy  | `#2C3E50` |

---

## License

MIT
