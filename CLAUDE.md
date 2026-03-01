# CLAUDE.md -- Development Notes for Claude Code

## Project Overview

Sefbot Designer is a visual canvas-based chatbot conversation flow designer (Stage 1 only -- no runtime, no backend). Users design chatbot flows by placing nodes on an infinite canvas, editing blocks inside them, and connecting them with edges.

### Tech Stack
- **Next.js 14** (App Router) with static export (`output: 'export'`)
- **React Flow** (`@xyflow/react` v12) for the canvas, nodes, edges, minimap, zoom/pan
- **Zustand v5** for all state management (single store)
- **Tailwind CSS v3** + **shadcn/ui** (Radix-based) for styling and UI primitives
- **TypeScript** throughout
- **LocalStorage** for persistence (no backend)
- **Firebase Hosting** for deployment (static files from `out/`)

---

## Key Architecture Decisions

1. **Single Zustand store** -- All project data, UI state, node positions, and selection state live in `src/stores/designerStore.ts`. React Flow nodes/edges are derived from the store in `DesignerCanvas.tsx` via `useMemo`, not stored as React Flow state directly.

2. **Store-driven React Flow** -- The store is the source of truth. React Flow callbacks (`onNodesChange`, `onConnect`, `onSelectionChange`) write back to the store. This avoids state synchronization issues between React Flow's internal state and application state.

3. **Node positions stored separately** -- The `nodePositions` map in the store tracks `{x, y}` positions for all nodes. This is updated on every drag event via `onNodesChange`.

4. **Blocks inside steps, not separate nodes** -- Steps contain an ordered list of block objects (text, buttons, user-input). Blocks are rendered as React components inside the StepNode component, not as separate React Flow nodes. This keeps the node graph simple.

5. **Button handles use dynamic IDs** -- Each button in a buttons block gets its own React Flow source handle with ID `button-{buttonId}`. Condition branches use `condition-{branchId}`. This enables per-button and per-branch connections.

6. **Static export for deployment** -- `next.config.mjs` sets `output: 'export'` and `images: { unoptimized: true }`. The project page uses query params (`/project?id=...`) instead of dynamic route segments to work with static export.

7. **Auto-save strategy** -- Three layers: debounced 1s after changes, 5-minute interval, and `beforeunload`. All handled by the `useAutoSave` hook.

8. **Lazy-loaded exports** -- PDF and Excel export modules are dynamically imported (`await import(...)`) to avoid bundling html2canvas, jsPDF, and xlsx in the main chunk.

---

## Important File Paths

### Core Application
- `src/stores/designerStore.ts` -- Zustand store, all state and mutations
- `src/types/index.ts` -- All TypeScript types, `STEP_COLORS` constant, React Flow node type definitions
- `src/lib/storage.ts` -- LocalStorage read/write (keys: `sefbot-projects`, `sefbot-project-{id}`)

### Pages
- `src/app/page.tsx` -- Home page with Kanban project board
- `src/app/project/page.tsx` -- Designer page (canvas + sidebar + right panels)
- `src/app/layout.tsx` -- Root layout with Geist fonts

### Canvas
- `src/components/canvas/DesignerCanvas.tsx` -- Main React Flow canvas, node/edge type registration, drag/drop, selection sync
- `src/components/canvas/nodes/StepNode.tsx` -- Step node (header + blocks + handles)
- `src/components/canvas/nodes/ConditionNode.tsx` -- Condition node with branch handles
- `src/components/canvas/nodes/SoftStartNode.tsx` -- Entry point node
- `src/components/canvas/nodes/NoteNode.tsx` -- Sticky note node
- `src/components/canvas/edges/CustomEdge.tsx` -- Custom colored/labeled edge
- `src/components/canvas/blocks/TextBlock.tsx` -- Text block with inline editing
- `src/components/canvas/blocks/ButtonsBlock.tsx` -- Buttons with per-button handles
- `src/components/canvas/blocks/UserInputBlock.tsx` -- User input block

### Panels and Sidebar
- `src/components/sidebar/ElementPalette.tsx` -- Left sidebar (drag sources)
- `src/components/panels/StepEditor.tsx` -- Right panel for step editing
- `src/components/panels/ConnectionEditor.tsx` -- Right panel for edge editing
- `src/components/panels/ColorPicker.tsx` -- 10-color palette
- `src/components/panels/VersionPanel.tsx` -- Version create/restore/delete

### Hooks
- `src/hooks/useAutoSave.ts` -- Auto-save (debounce 1s, interval 5min, beforeunload)
- `src/hooks/useKeyboardShortcuts.ts` -- Delete, Ctrl+D, Ctrl+S, Escape

### Export
- `src/lib/export-pdf.ts` -- html2canvas + jsPDF
- `src/lib/export-excel.ts` -- SheetJS (xlsx)

### Configuration
- `next.config.mjs` -- Static export, unoptimized images
- `firebase.json` -- Hosting config, public dir = `out/`, SPA rewrite
- `.idx/dev.nix` -- Google IDX workspace (Node.js 20, npm install on create/start)
- `tailwind.config.ts` -- Tailwind theme configuration
- `SEFBOT_DESIGNER_INSTRUCTIONS.md` -- Original feature specification and acceptance criteria

---

## Build Commands

```bash
npm run dev        # Start development server (localhost:3000)
npm run build      # Production build (static export to out/)
npm run start      # Start production server (rarely used, static export preferred)
npm run lint       # Run ESLint
firebase deploy    # Deploy out/ to Firebase Hosting
```

---

## Coding Conventions

- **Client components** -- All interactive components use `'use client'` directive at the top.
- **Imports** -- Path alias `@/` maps to `src/`. Example: `import { useDesignerStore } from '@/stores/designerStore'`.
- **Component structure** -- Functional components with hooks. No class components.
- **State access** -- Use selector pattern with Zustand: `useDesignerStore((s) => s.project)` rather than destructuring the entire store, except in the home page which destructures multiple actions.
- **shadcn/ui** -- UI primitives live in `src/components/ui/`. These are Radix-based and follow the shadcn/ui pattern. Do not modify these directly; add custom components in `src/components/shared/` or domain-specific directories.
- **Naming** -- PascalCase for components, camelCase for functions/variables, kebab-case for file names in `lib/` and `hooks/`.
- **React Flow node types** -- Registered as `stepNode`, `conditionNode`, `softStartNode`, `noteNode` (camelCase strings).
- **Edge type** -- Single custom edge type registered as `customEdge`.
- **IDs** -- All entity IDs are generated with `uuid v4` via the `uuid` package.
- **Drag and drop** -- Uses `dataTransfer` with MIME type `application/sefbot-type` for sidebar-to-canvas element creation.
- **No confirmation dialogs for delete** -- Delete operations happen immediately (per spec).

---

## Known Limitations

1. **LocalStorage only** -- All data is stored in the browser's LocalStorage. No server, no database, no sync across devices. Data is lost if the user clears browser data.

2. **No undo/redo** -- There is no undo/redo stack. The versioning feature (manual snapshots) partially compensates for this.

3. **No real-time collaboration** -- Single user, single browser. No locking or conflict resolution.

4. **No authentication** -- No login, no user accounts. Anyone with access to the URL can use the app.

5. **Static export routing** -- The project page uses query parameters (`/project?id=...`) instead of dynamic segments (`/project/[id]`) because `output: 'export'` does not support dynamic routes. The `src/app/project/[id]/` directory may exist from an earlier iteration but the active page is `src/app/project/page.tsx`.

6. **PDF export quality** -- The PDF export captures the visible viewport using html2canvas. Very large canvases or elements outside the viewport may not be fully captured.

7. **No drag reorder for blocks** -- Blocks within a step cannot currently be reordered by dragging. Only buttons within a buttons block support drag reorder.

8. **No anchor UI** -- The `Anchor` type is defined in the types but the full anchor UI (click-to-navigate, anchor menu) is not fully implemented.

9. **Button connection constraints** -- The spec mentions that text blocks should only connect if no buttons/user-input block exists, but this constraint is not fully enforced at the edge creation level.

10. **Edge path adjustment** -- The spec mentions adjustable bezier control points on edges. The current custom edge uses a default path; manual control point adjustment is not implemented.

11. **Version preview** -- The spec mentions previewing a version without restoring. Currently, restoring is the only way to view a version's contents.
