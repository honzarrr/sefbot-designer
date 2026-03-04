# Sefbot Designer — Overnight Autonomous Build Plan

## What This Covers

Three major features to add to the existing Sefbot Designer:

1. **Authentication System** — login, user roles (Admin/Editor), user management
2. **Voiceflow Import (.vf files)** — parse and convert 400+ chatbot projects
3. **Backend Migration** — move from LocalStorage to a real database

---

## VF File Format Analysis (CRITICAL REFERENCE)

The `.vf` file is a JSON export from Voiceflow. Here is the exact structure and mapping to Sefbot:

### Top-Level Structure

```
.vf file (JSON)
├── version          — metadata, settings, version info
├── project          — project name, platform, team info
├── diagrams         — THE MAIN CONTENT: contains all nodes and connections
│   ├── {id}: ROOT (type=TOPIC)     — main conversation flow
│   └── {id}: Template (type=TEMPLATE) — reusable templates
├── responses        — response metadata
├── responseDiscriminators — links responses to messages
├── responseMessages — ACTUAL TEXT CONTENT with rich formatting
├── variables        — project variables
├── flows            — (often empty in chatbot projects)
├── entities / intents / utterances — NLP config (ignore for wireframe)
└── attachments, functions, etc. — advanced features (ignore for now)
```

### Node Types in diagrams → Sefbot Mapping

| VF Node Type | Count (typical) | Sefbot Element | Notes |
|---|---|---|---|
| `block` | ~90 | **Step** (Krok) | Container with name, color, child steps[] |
| `message` | ~90 | **Text Block** | References messageID → responseMessages for content |
| `buttons` | ~45 | **Buttons Block** | Has buttons[] array with name and actions |
| `buttons-v2` | ~25 | **Buttons Block** | Newer format, items[] with label[].text[] |
| `start` | 1 | **Soft Start** | Entry point with label and first connection |
| `markup_text` | ~45 | **Note** (Sticky Note) | Canvas annotations, has coords and content[] |
| `visual` | ~16 | **Note with image ref** | Images on canvas, has image URL |
| `ifV2` | ~3 | **Condition** | Has expressions[] array = condition branches |
| `goToNode` | ~2 | **Anchor** (Kotva) | References another nodeID + diagramID |
| `actions` | ~2 | *(skip)* | API actions, not relevant for wireframe |

### How Text Content Works

The chain is: `block.steps[]` → `message node` → `messageID` → `responseDiscriminators` → `responseMessages.text[]`

The `responseMessages.text` is a rich text array:
```json
[{
  "text": [
    "Plain text ",
    {"text": ["Bold text"], "attributes": {"fontWeight": "700"}},
    " more plain text"
  ]
}]
```

Mapping to HTML: `fontWeight: 700` → `<b>`, `fontStyle: italic` → `<i>`

### How Connections Work

Every node has `portsV2`:
```json
{
  "byKey": { "next": { "target": "nodeID", "id": "portID" } },
  "builtIn": { "next": { "target": "nodeID" }, "else": { "target": "nodeID" } },
  "dynamic": [ { "target": "nodeID", "id": "portID" } ]
}
```

- `byKey.next` — simple "next step" connection
- `builtIn.else` — fallback/else branch
- `dynamic[]` — one per button, maps to button connections
- For `buttons`: `dynamic[0]` = first button output, `dynamic[1]` = second button, etc.
- For `buttons-v2`: `byKey[buttonItemId]` = connection per button

### How Blocks Group Nodes

A `block` node has: `data.steps: ["nodeId1", "nodeId2"]` — ordered list of child nodes.
First child is usually a `message` (text), last child is `buttons` or `buttons-v2`.
This maps directly to Sefbot's Step → Blocks structure.

### Canvas Positions

- `block` nodes have: `coords: [x, y]` — canvas position
- `markup_text` nodes have: `coords: [x, y]` — note position
- `start` node has: `coords: [x, y]` — soft start position
- Connection paths stored in: `portsV2.*.data.points[]` — bezier control points

### Colors

VF uses named colors: `standard`, `blue`, `purple`, `red`, `orange`, `green`, etc.
Map to Sefbot's 10-color palette.

### CSV Export Format (simpler alternative)

```
canvas id | canvas name | block id | block name | block content | block color
```

One row per block. Content is plain text (no formatting). No connection data.
Useful as fallback import when .vf file is not available — imports steps and text only, connections must be recreated manually.

---

## Phase 5: Authentication System

### Tech Stack Addition

| Component | Technology |
|-----------|-----------|
| Auth | **NextAuth.js v5** (Auth.js) |
| Database | **PostgreSQL** via **Prisma ORM** |
| Password hashing | **bcrypt** |
| Email | **Resend** (for invitation emails) |

### Database Schema (Prisma)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id            String    @id @default(cuid())
  email         String    @unique
  firstName     String
  lastName      String
  passwordHash  String?
  role          Role      @default(EDITOR)
  inviteToken   String?   @unique
  inviteExpires DateTime?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  projects      ProjectMember[]
  versions      ProjectVersion[]
  activeLock    ProjectLock?
}

enum Role {
  ADMIN
  EDITOR
}

model Project {
  id          String   @id @default(cuid())
  name        String
  status      ProjectStatus @default(PROGRESS)
  data        Json     // the full project JSON (steps, connections, etc.)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  members     ProjectMember[]
  versions    ProjectVersion[]
  lock        ProjectLock?
  imports     Import[]
}

enum ProjectStatus {
  PROGRESS
  APPROVAL
  DONE
}

model ProjectMember {
  id        String  @id @default(cuid())
  userId    String
  projectId String
  user      User    @relation(fields: [userId], references: [id])
  project   Project @relation(fields: [projectId], references: [id], onDelete: Cascade)

  @@unique([userId, projectId])
}

model ProjectVersion {
  id        String   @id @default(cuid())
  name      String
  snapshot  Json
  projectId String
  createdBy String
  project   Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  creator   User     @relation(fields: [createdBy], references: [id])
  createdAt DateTime @default(now())
}

model ProjectLock {
  id        String   @id @default(cuid())
  projectId String   @unique
  userId    String   @unique
  project   Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  user      User     @relation(fields: [userId], references: [id])
  lockedAt  DateTime @default(now())
}

model Import {
  id        String       @id @default(cuid())
  projectId String
  source    ImportSource
  fileName  String
  status    ImportStatus @default(PENDING)
  log       String?
  project   Project      @relation(fields: [projectId], references: [id])
  createdAt DateTime     @default(now())
}

enum ImportSource {
  VOICEFLOW_VF
  VOICEFLOW_CSV
  VOICEFLOW_PDF
}

enum ImportStatus {
  PENDING
  PROCESSING
  COMPLETED
  FAILED
}
```

### Auth Acceptance Criteria

| # | Feature | Detail |
|---|---------|--------|
| A1 | Login page | Email + password. Clean, branded. |
| A2 | Admin role | Can add/remove users, delete projects, change roles |
| A3 | Editor role | Can create projects, cannot delete projects or manage users |
| A4 | Admin protection | Must always remain at least 1 admin. Admin cannot demote self if last admin. |
| A5 | User invitation | Admin enters name, surname, email → system sends invite email with registration link |
| A6 | Password creation | Invited user clicks link, creates password, gains access |
| A7 | Password reset | Admin can trigger password reset from user management |
| A8 | User list | Admin sees full list with edit/delete. Editor sees read-only list. |
| A9 | Max 30 users | System enforces 30 user limit |
| A10 | Project locking | When user opens project, it's locked. Others see who's editing. Admin can kick editor out. |

### API Routes

```
POST   /api/auth/login          — NextAuth credentials provider
POST   /api/auth/logout
GET    /api/users               — list users (admin: full, editor: read-only)
POST   /api/users               — invite user (admin only)
DELETE /api/users/[id]           — delete user (admin only)
PATCH  /api/users/[id]/role      — change role (admin only)
POST   /api/users/register       — complete registration (with invite token)
POST   /api/users/[id]/reset-password — trigger reset (admin only)

GET    /api/projects             — list all projects
POST   /api/projects             — create project
GET    /api/projects/[id]        — get project with data
PUT    /api/projects/[id]        — save project (auto-save target)
DELETE /api/projects/[id]        — delete (admin only)
POST   /api/projects/[id]/duplicate
PATCH  /api/projects/[id]/status — change kanban status

POST   /api/projects/[id]/lock   — acquire lock
DELETE /api/projects/[id]/lock   — release lock
GET    /api/projects/[id]/lock   — check lock status

GET    /api/projects/[id]/versions
POST   /api/projects/[id]/versions
GET    /api/projects/[id]/versions/[vid]
DELETE /api/projects/[id]/versions/[vid]
POST   /api/projects/[id]/versions/[vid]/restore

POST   /api/import/vf            — upload .vf file, parse, create project
POST   /api/import/csv           — upload .csv file, create project
POST   /api/import/batch         — batch import multiple .vf files
```

---

## Phase 6: Voiceflow Import Engine

### Import Flow

```
User uploads .vf file
  → Parse JSON
  → Extract project name from project.name
  → Find ROOT diagram (type=TOPIC)
  → For each block node:
      → Create Step with name, color, position from coords
      → Resolve steps[] child nodes:
          → message → look up responseMessages chain → create TextBlock with rich text
          → buttons/buttons-v2 → create ButtonsBlock with button labels
      → (no user-input in VF wireframes, skip)
  → For each start node:
      → Create SoftStart with label
  → For each markup_text node:
      → Create StickyNote with content and position
  → For each ifV2 node:
      → Create ConditionNode with branches from expressions[]
  → Resolve connections:
      → Walk all portsV2 across all nodes
      → byKey.next → simple connection
      → dynamic[] → button connections (label from button name)
      → builtIn.else → else/fallback connection
  → Save as new Project
```

### VF Rich Text → HTML Converter

```typescript
// src/lib/import/vf-richtext.ts

interface VFTextSegment {
  text: string[] | string;
  attributes?: {
    fontWeight?: string;   // "700" = bold
    fontStyle?: string;    // "italic"
    __type?: string;
  };
}

function vfRichTextToHtml(textArray: VFTextSegment[]): string {
  return textArray.map(segment => {
    if (typeof segment === 'string') return segment;

    const texts = Array.isArray(segment.text) ? segment.text : [segment.text];
    let result = '';

    for (const item of texts) {
      if (typeof item === 'string') {
        result += item;
      } else {
        // Nested rich text
        let inner = vfRichTextToHtml([item]);
        if (item.attributes?.fontWeight === '700') inner = `<b>${inner}</b>`;
        if (item.attributes?.fontStyle === 'italic') inner = `<i>${inner}</i>`;
        result += inner;
      }
    }

    return result;
  }).join('');
}
```

### VF Color → Sefbot Color Mapping

```typescript
const VF_COLOR_MAP: Record<string, string> = {
  'standard': '#607D8B',  // Grey-blue
  'blue': '#4A90D9',
  'purple': '#7B68EE',
  'red': '#E74C3C',
  'orange': '#F39C12',
  'green': '#27AE60',
  'teal': '#1ABC9C',
  'pink': '#E91E63',
  'brown': '#8D6E63',
  'dark': '#2C3E50',
};
```

### Buttons V1 vs V2 Handling

```typescript
// V1: buttons[].name = label text
// V2: items[].label[].text[] = label text (nested array)

function extractButtonLabel(button: any, version: 'v1' | 'v2'): string {
  if (version === 'v1') return button.name || '';
  // v2
  return button.label?.map((l: any) =>
    l.text?.join('') || ''
  ).join('') || '';
}
```

### Batch Import for 400+ Files

```typescript
// POST /api/import/batch
// Accepts multipart form with multiple .vf files
// Returns: { imported: number, failed: number, results: ImportResult[] }

// Process sequentially to avoid memory issues with large files
// Each .vf file ≈ 500KB-1MB, 400 files = ~200-400MB total
// Process one at a time, stream results
```

### CSV Import (Fallback)

```typescript
// CSV has: canvas id, canvas name, block id, block name, block content, block color
// No connections, no buttons detail, no positions
// Creates steps with text blocks only
// User must manually add buttons and connections after import
```

### PDF Import

The PDF export from Voiceflow is a visual screenshot of the canvas (as we can see from the uploaded files). It's not structured data — it's an image. **PDF import is not feasible for automated conversion.** The recommendation is:

- Primary: `.vf` file import (full fidelity)
- Secondary: `.csv` file import (text only, no connections)
- PDF: Display as reference image alongside the project, not parsed

---

## File Structure Additions

```
src/
├── app/
│   ├── login/
│   │   └── page.tsx                 # Login page
│   ├── register/
│   │   └── page.tsx                 # Complete registration (from invite)
│   ├── admin/
│   │   └── users/
│   │       └── page.tsx             # User management (admin)
│   ├── import/
│   │   └── page.tsx                 # Import UI (upload .vf/.csv)
│   └── api/
│       ├── auth/[...nextauth]/
│       │   └── route.ts
│       ├── users/
│       │   ├── route.ts             # GET, POST
│       │   └── [id]/
│       │       ├── route.ts         # DELETE
│       │       ├── role/route.ts    # PATCH
│       │       └── reset-password/route.ts
│       ├── projects/
│       │   ├── route.ts             # GET, POST
│       │   └── [id]/
│       │       ├── route.ts         # GET, PUT, DELETE
│       │       ├── duplicate/route.ts
│       │       ├── status/route.ts
│       │       ├── lock/route.ts
│       │       └── versions/
│       │           ├── route.ts
│       │           └── [vid]/
│       │               ├── route.ts
│       │               └── restore/route.ts
│       └── import/
│           ├── vf/route.ts          # POST - single .vf import
│           ├── csv/route.ts         # POST - CSV import
│           └── batch/route.ts       # POST - batch .vf import
├── lib/
│   ├── import/
│   │   ├── vf-parser.ts            # Main .vf → Project converter
│   │   ├── vf-richtext.ts          # Rich text → HTML
│   │   ├── vf-connections.ts       # portsV2 → Connection resolver
│   │   ├── vf-colors.ts            # Color mapping
│   │   ├── csv-parser.ts           # CSV → Project converter
│   │   └── types.ts                # VF file type definitions
│   ├── auth.ts                     # NextAuth config
│   └── prisma.ts                   # Prisma client singleton
├── middleware.ts                    # Auth middleware (protect routes)
└── prisma/
    ├── schema.prisma
    └── seed.ts                      # Create initial admin user
```

---

## Overnight Build Script

Save this as `build-overnight.sh` in the project root:

```bash
#!/bin/bash
set -e

echo "=== SEFBOT OVERNIGHT BUILD ==="
echo "Started at: $(date)"
echo "================================"

# -----------------------------------------------
# PHASE 5A: Database & Auth Setup
# -----------------------------------------------
echo ""
echo ">>> PHASE 5A: Database & Auth Setup"
echo ""

claude -p "
You are working on the Sefbot Designer project (Next.js + React Flow + Zustand).

Read SEFBOT_DESIGNER_INSTRUCTIONS.md and OVERNIGHT_BUILD.md in the project root.

DO PHASE 5A — Database & Auth Setup:

1. Install dependencies:
   npm install next-auth@beta @prisma/client prisma bcryptjs
   npm install -D @types/bcryptjs

2. Create prisma/schema.prisma with the EXACT schema from OVERNIGHT_BUILD.md
   Use SQLite for development: provider = 'sqlite', url = 'file:./dev.db'

3. Run: npx prisma generate && npx prisma db push

4. Create src/lib/prisma.ts — Prisma client singleton

5. Create src/lib/auth.ts — NextAuth v5 config with CredentialsProvider:
   - Validate email + password against User table
   - Include user role in session
   - Include user id in session

6. Create src/app/api/auth/[...nextauth]/route.ts

7. Create src/middleware.ts:
   - Protect all routes except /login, /register, /api/auth
   - Redirect unauthenticated users to /login

8. Create prisma/seed.ts:
   - Create default admin: admin@sefbot.cz / admin123
   - Run: npx tsx prisma/seed.ts

9. Run npm run build to verify everything compiles.

DO NOT touch any existing canvas/designer code. Only ADD new files.
" --dangerously-skip-permissions

echo "Phase 5A complete at: $(date)"

# -----------------------------------------------
# PHASE 5B: Login & User Management UI
# -----------------------------------------------
echo ""
echo ">>> PHASE 5B: Login & User Management UI"
echo ""

claude -p "
You are working on the Sefbot Designer project (Next.js + React Flow + Zustand).

Read OVERNIGHT_BUILD.md for the full spec.

DO PHASE 5B — Login & User Management UI:

1. Create src/app/login/page.tsx:
   - Clean login form (email + password)
   - Uses NextAuth signIn('credentials')
   - Redirect to / on success
   - Error messages on failure

2. Create src/app/register/page.tsx:
   - Form: password + confirm password
   - Reads invite token from URL query param
   - Validates token, creates password via API
   - Redirect to /login on success

3. Create API routes for user management:
   - GET  /api/users — list all users
   - POST /api/users — invite new user (admin only): name, surname, email, role
     Generate invite token, store in DB, (skip actual email for now, just return the token/link)
   - DELETE /api/users/[id] — delete user (admin only, cannot delete last admin)
   - PATCH /api/users/[id]/role — toggle admin/editor (admin only, protect last admin)
   - POST /api/users/[id]/reset-password — generate reset token (admin only)

4. Create src/app/admin/users/page.tsx:
   - Table of all users (name, email, role, created date)
   - Admin: add user button, delete button, role toggle
   - Editor: read-only view
   - Enforce max 30 users

5. Create API routes for projects with database:
   - Migrate existing project CRUD from LocalStorage to database API
   - GET/POST /api/projects
   - GET/PUT/DELETE /api/projects/[id]
   - POST /api/projects/[id]/duplicate
   - PATCH /api/projects/[id]/status

6. Create project locking:
   - POST /api/projects/[id]/lock — acquire lock on open
   - DELETE /api/projects/[id]/lock — release lock on close
   - Show lock status on project list (who is editing)
   - Admin can force-release lock

7. Update the main project list page to use database API instead of LocalStorage.
   Update auto-save to PUT to /api/projects/[id] instead of LocalStorage.

8. Run npm run build to verify.

IMPORTANT: Preserve ALL existing canvas/designer functionality. Only change the data layer.
" --dangerously-skip-permissions

echo "Phase 5B complete at: $(date)"

# -----------------------------------------------
# PHASE 6A: VF Import Engine
# -----------------------------------------------
echo ""
echo ">>> PHASE 6A: Voiceflow Import Engine"
echo ""

claude -p "
You are working on the Sefbot Designer project (Next.js + React Flow + Zustand).

Read OVERNIGHT_BUILD.md — it contains the COMPLETE .vf file format analysis with exact node types,
message reference chains, connection structures, and color mappings.

DO PHASE 6A — Voiceflow Import Engine:

1. Create src/lib/import/types.ts — TypeScript types for VF file structure:
   - VFFile (top level)
   - VFDiagram, VFNode, VFBlock, VFMessage, VFButtons, VFButtonsV2
   - VFStart, VFMarkupText, VFVisual, VFIfV2, VFGoToNode
   - VFPortsV2, VFPort
   - VFResponseMessage, VFResponseDiscriminator

2. Create src/lib/import/vf-richtext.ts:
   - Convert VF rich text array to HTML string
   - Handle: plain text, bold (fontWeight 700), italic
   - Handle nested text segments

3. Create src/lib/import/vf-colors.ts:
   - Map VF color names to Sefbot hex colors
   - standard → #607D8B, blue → #4A90D9, purple → #7B68EE, etc.

4. Create src/lib/import/vf-connections.ts:
   - Walk all nodes portsV2 structures
   - Resolve: byKey.next, builtIn.next, builtIn.else, dynamic[]
   - For buttons: map dynamic[index] to button connections
   - For buttons-v2: map byKey[buttonItemId] to button connections
   - Generate Connection objects with labels (from button names)
   - Map edge colors from source block color

5. Create src/lib/import/vf-parser.ts — Main converter:
   - Parse VF JSON
   - Find ROOT diagram (type=TOPIC)
   - Convert block nodes → Steps with child blocks:
     * message → TextBlock (resolve through responseMessages chain)
     * buttons → ButtonsBlock (extract button names)
     * buttons-v2 → ButtonsBlock (extract from items[].label[].text[])
   - Convert start node → SoftStart
   - Convert markup_text → StickyNote
   - Convert ifV2 → ConditionNode
   - Convert goToNode → Anchor
   - Use coords for canvas positions
   - Call vf-connections to resolve all edges
   - Return complete Project object

6. Create src/lib/import/csv-parser.ts:
   - Parse CSV (canvas id, canvas name, block id, block name, block content, block color)
   - Create Steps with single TextBlock each (plain text)
   - No connections (CSV lacks this data)
   - Auto-layout steps in a grid since no position data

7. Run npm run build to verify.

Use the EXACT mapping from OVERNIGHT_BUILD.md. The .vf format analysis there is based on
real files and is accurate.
" --dangerously-skip-permissions

echo "Phase 6A complete at: $(date)"

# -----------------------------------------------
# PHASE 6B: Import UI & Batch Processing
# -----------------------------------------------
echo ""
echo ">>> PHASE 6B: Import UI & Batch Import"
echo ""

claude -p "
You are working on the Sefbot Designer project (Next.js + React Flow + Zustand).

Read OVERNIGHT_BUILD.md for the import spec and API routes.

DO PHASE 6B — Import UI & Batch Processing:

1. Create API routes:
   - POST /api/import/vf — accepts .vf file upload (multipart form)
     Parse with vf-parser, create new Project in database
     Return project ID and summary (step count, connection count)

   - POST /api/import/csv — accepts .csv file upload
     Parse with csv-parser, create new Project
     Return project ID and summary

   - POST /api/import/batch — accepts multiple .vf files
     Process sequentially (memory safety)
     Return array of results: { fileName, projectId, status, stepCount, error? }
     Store import logs in Import table

2. Create src/app/import/page.tsx:
   - File upload zone (drag & drop)
   - Accept .vf and .csv files
   - Single file import: upload, show progress, redirect to project on success
   - Batch import tab: upload multiple .vf files at once
     Show progress bar (3 of 47 imported...)
     Show results table: file name, status (success/failed), step count, link to project
   - Error handling: show parse errors clearly

3. Add Import button to the main project list / navigation

4. Create src/app/import/batch/page.tsx:
   - Dedicated batch import page for migrating 400+ files
   - Large file drop zone
   - Real-time progress updates
   - Summary at end: X imported, Y failed
   - Download error log as CSV

5. Run npm run build to verify.

6. Run npm run dev and verify that:
   - You can log in with admin@sefbot.cz / admin123
   - You can create a project manually
   - The designer canvas still works
   - All new pages render without errors
" --dangerously-skip-permissions

echo "Phase 6B complete at: $(date)"

# -----------------------------------------------
# PHASE 7: Integration Testing & Fixes
# -----------------------------------------------
echo ""
echo ">>> PHASE 7: Integration & Final Fixes"
echo ""

claude -p "
You are working on the Sefbot Designer project (Next.js + React Flow + Zustand).

DO PHASE 7 — Integration Testing & Final Fixes:

1. Test the full flow:
   - npm run build — fix ANY errors
   - Start dev server
   - Test login page renders
   - Test auth middleware redirects unauthenticated users
   - Test project list loads from database
   - Test creating a new project
   - Test opening the designer canvas

2. Add navigation between all pages:
   - Header/navbar: Projects | Import | Users (admin only) | Logout
   - Show current user name and role
   - Consistent layout across all pages

3. Fix any TypeScript errors or missing imports.

4. Fix any Prisma schema issues.

5. Ensure the designer canvas auto-save now uses the API:
   - On blur / 5-min timer → PUT /api/projects/[id]
   - On page load → GET /api/projects/[id]

6. Add proper error boundaries and loading states.

7. Run final npm run build — must succeed with ZERO errors.

8. Print a summary of what was built and any known issues.
" --dangerously-skip-permissions

echo ""
echo "=== BUILD COMPLETE ==="
echo "Finished at: $(date)"
echo "======================"
```

---

## How to Run

```bash
# 1. Make script executable
chmod +x build-overnight.sh

# 2. Run in tmux so it survives terminal close
tmux new -s sefbot-build

# 3. Set environment
export CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1

# 4. Launch
./build-overnight.sh 2>&1 | tee build-log.txt

# 5. Detach from tmux: press Ctrl+B, then D
# 6. Go to sleep

# 7. Next morning, reattach:
tmux attach -s sefbot-build

# 8. Check the log:
cat build-log.txt
```

---

## After the Build — What You Have

| Feature | Status |
|---------|--------|
| Login / Logout | Working with NextAuth |
| Admin user management | Full CRUD with role protection |
| User invitation flow | Token-based (email sending = stub for now) |
| Project CRUD in database | SQLite → can swap to PostgreSQL for production |
| Project locking | Prevents double-editing |
| Designer canvas | All Phase 1-4 features preserved |
| Auto-save to DB | Replaces LocalStorage |
| VF import (single) | Full .vf file parsing with all node types |
| VF import (batch) | Upload 400+ files at once |
| CSV import | Fallback for text-only import |
| PDF import | Not automated (visual only) — shown as reference |

---

## Production Checklist (After Overnight Build)

These are manual follow-ups for after the autonomous build:

1. **Switch to PostgreSQL** — change Prisma provider and DATABASE_URL
2. **Add Resend** for actual invitation emails
3. **Deploy** to Vercel or similar
4. **Test with real .vf files** — run batch import with your 400 files
5. **Review imported projects** — check text, connections, positions look correct
6. **Add PDF reference viewer** — show PDF alongside project for manual verification
