# Sefbot — Designer → Development Transformation Spec

## The Big Picture

A project in Sefbot flows through **two main stages** on the canvas:

```
DESIGNER (client-facing)          DEVELOPMENT (internal)
┌─────────────────────┐           ┌─────────────────────────────┐
│  Clean visual flow  │           │  Full wired chatbot builder │
│  No connections     │  ──────►  │  All connections visible    │
│  Client can comment │  transform│  Step logic (output/input/  │
│  Read-only sharing  │           │  jump) editable             │
│  Bubbles + buttons  │           │  Runtime-ready              │
└─────────────────────┘           └─────────────────────────────┘
```

---

## 1. Updated Kanban Stages

Current stages: `Progress → Approval → Done`

New stages (6-column kanban):

| Stage | Who works | What happens |
|---|---|---|
| **Draft** | Designer | New project, work in progress |
| **Design Review** | Designer → Client | Shared with client for comments |
| **Approved** | Client → Team | Client approved the design |
| **Development** | Developer | Transform design into wired chatbot |
| **Testing** | QA / Developer | Chatbot tested via preview |
| **Live** | — | Chatbot deployed to production |

```typescript
enum ProjectStatus {
  DRAFT = 'DRAFT',
  DESIGN_REVIEW = 'DESIGN_REVIEW',
  APPROVED = 'APPROVED',
  DEVELOPMENT = 'DEVELOPMENT',
  TESTING = 'TESTING',
  LIVE = 'LIVE',
}
```

---

## 2. Connection Visibility Layers

The designer canvas has **two layers of connections**:

### Layer 1: Design Connections (always stored, hidden from client)
These are the arrows the designer draws on the canvas to define flow.
- Stored in the database as normal `Connection` objects
- **Visible** to internal team in designer edit mode
- **Hidden** when client views the shared link
- Drawn as light dashed lines (subtle, not dominant)
- Purpose: designer's notes about intended flow

### Layer 2: Development Connections (created during transformation)
These are the fully wired connections with jump logic.
- Created when project moves to DEVELOPMENT stage
- Visible in development mode
- Include jump rules, conditions, variable assignments
- Drawn as solid colored lines with directional arrows
- Purpose: actual chatbot runtime logic

### Connection data model addition:

```typescript
// Add to Connection type
interface Connection {
  id: string;
  sourceBlockId: string;
  sourcePortId: string;      // which button or output
  targetBlockId: string;
  targetPortId: string;
  layer: 'design' | 'development';  // NEW
  jumpRule?: JumpRule;               // NEW — only for development layer
  isHidden?: boolean;                // NEW — manually hide to reduce clutter
}

interface JumpRule {
  type: 'direct' | 'conditional' | 'variable';
  conditions?: JumpCondition[];
  variableAssignments?: VariableAssignment[];
}

interface JumpCondition {
  variable: string;
  operator: 'equals' | 'contains' | 'gt' | 'lt' | 'exists';
  value: string;
  targetBlockId: string;     // where to jump if condition met
}

interface VariableAssignment {
  variableName: string;
  source: 'user_input' | 'static' | 'api_response';
  value?: string;
}
```

### Rendering rules:

| Context | Design connections | Development connections |
|---|---|---|
| Designer (edit mode, internal) | Visible (dashed, gray) | Not shown |
| Client share page | **Hidden** | Not shown |
| Development (edit mode) | Visible (dashed, faint) | Visible (solid, colored) |
| Chatbot runtime | — | Used for step navigation |

---

## 3. Client Sharing & Comments

### 3.1 Share Link

When project status is `DESIGN_REVIEW`, generate a shareable link:

```
https://app.sefbot.cz/share/[shareToken]
```

- `shareToken` is a unique random string (e.g., cuid or nanoid)
- **MANDATORY password** — every share link requires a password to view
- Client must enter the correct password before seeing the canvas
- Password is hashed with bcrypt before storing
- Rate limited: max 5 password attempts per 15 minutes per IP
- Optional: expiration date
- Can be revoked by project owner

### 3.2 Password Gate

Before the client can see anything, they must enter a password:

1. Client opens the share link → sees a **password entry page**
   - Sefbot branded page showing the project name
   - Password input field + Submit button
   - No hints about the canvas content visible

2. Client enters password → `POST /api/share/[token]/verify`
   - Compares bcrypt hash
   - If correct: returns a session cookie/JWT valid for 24 hours
   - If wrong: shows error, max 5 attempts per 15 minutes per IP

3. After successful password → redirected to the read-only canvas view

The designer creates the share link and receives the password (with a "generate random password" option). They send both the link and password to the client via email or other channel.

### 3.3 Shared View — What the Client Sees (after password)

The client sees a **read-only canvas** with:
- All blocks (text, buttons, images, notes) — positioned as designed
- Block names/labels
- **NO connections** (arrows are hidden)
- **NO technical elements** (conditions, anchors, variables)
- Clean, professional appearance
- Sefbot branding in corner

What the client **cannot** do:
- Edit any block content
- Move blocks
- Add new blocks
- See connections or logic
- Access settings or other pages

What the client **can** do:
- View the conversation design
- Click on any block to open a comment panel
- Add comments to specific blocks
- View other comments (threaded)
- Mark comments as resolved (optional)

### 3.4 Comment System

```typescript
// Prisma models
model ProjectShare {
  id          String    @id @default(cuid())
  projectId   String
  project     Project   @relation(fields: [projectId], references: [id], onDelete: Cascade)
  shareToken  String    @unique
  password    String                 // MANDATORY bcrypt hash — every share MUST have a password
  expiresAt   DateTime?
  isActive    Boolean   @default(true)
  createdBy   String
  createdAt   DateTime  @default(now())
}

model BlockComment {
  id          String   @id @default(cuid())
  projectId   String
  project     Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  blockId     String   // which canvas block this comment is on
  parentId    String?  // for threaded replies
  parent      BlockComment? @relation("CommentThread", fields: [parentId], references: [id])
  replies     BlockComment[] @relation("CommentThread")
  authorName  String   // client enters their name (no account needed)
  authorEmail String?  // optional
  authorType  String   // 'client' or 'internal'
  content     String
  isResolved  Boolean  @default(false)
  resolvedBy  String?
  resolvedAt  DateTime?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

### 3.5 Comments → Internal Todos

When a client leaves a comment, the system creates an internal todo:

```typescript
model ProjectTodo {
  id          String    @id @default(cuid())
  projectId   String
  project     Project   @relation(fields: [projectId], references: [id], onDelete: Cascade)
  commentId   String?   // linked to the source comment (null if manual)
  comment     BlockComment? @relation(fields: [commentId], references: [id])
  blockId     String?   // which block this relates to
  title       String    // auto-generated from comment content
  description String?
  status      String    @default("open") // open, in_progress, done
  assigneeId  String?
  assignee    User?     @relation(fields: [assigneeId], references: [id])
  priority    String    @default("normal") // low, normal, high
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
}
```

When resolving a todo, optionally resolve the linked comment too.

### 3.6 API Routes for Sharing & Comments

```
# Sharing
POST   /api/projects/[id]/share          — generate share link
GET    /api/projects/[id]/share          — list active shares
DELETE /api/projects/[id]/share/[token]  — revoke share

# Public share page (password-protected)
POST   /api/share/[token]/verify         — verify password, return session token
GET    /api/share/[token]/content        — get project data for rendering (requires valid session)
GET    /api/share/[token]/comments       — get all comments (requires valid session)
POST   /api/share/[token]/comments       — add a comment (requires valid session)

# Internal comments (auth required)
GET    /api/projects/[id]/comments       — all comments with block info
POST   /api/projects/[id]/comments       — add internal comment
PATCH  /api/projects/[id]/comments/[cid] — resolve/update comment

# Todos
GET    /api/projects/[id]/todos          — list all todos
POST   /api/projects/[id]/todos          — create manual todo
PATCH  /api/projects/[id]/todos/[tid]    — update status/assignee
```

---

## 4. Designer → Development Transformation

### 4.1 When It Happens

When a project moves from `APPROVED` → `DEVELOPMENT` status:

1. System snapshots the current designer canvas as a version (automatic versioning)
2. Transformation engine runs
3. Development connections are created from design connections
4. Steps are generated from blocks
5. Project opens in Development mode

### 4.2 What the Transformation Does

For each **block** on the designer canvas, create a **chatbot step**:

| Designer Block | Chatbot Step Type | Output | Input | Jump |
|---|---|---|---|---|
| Text block | message step | The text content | none (auto-advance) | Next connected block |
| Buttons block | button step | Text above buttons | Button options | Each button → its connected block |
| User input block | answer step | Prompt text | Text field | Next connected block |
| Email input | email step | "Enter your email" | Email field | Next connected block |
| Phone input | phone step | "Enter your phone" | Phone field | Next connected block |
| Condition node | logic step | — | — | Branch based on conditions |
| Image/visual | message step | Image URL/embed | none | Next connected block |

### 4.3 Connection Flattening (Reducing Visual Clutter)

A fully connected flow with 100+ blocks can be a mess of crossing arrows. The transformation should apply these strategies:

**Strategy 1: Sequential chain collapsing**
If blocks A → B → C → D are a linear chain (no branching), show them as a vertical stack with a single flow indicator instead of individual arrows.

```
BEFORE (cluttered):          AFTER (clean):
┌───┐    ┌───┐    ┌───┐     ┌───┐
│ A │───►│ B │───►│ C │     │ A │
└───┘    └───┘    └───┘     │ B │  (collapsed stack)
                             │ C │
                             └───┘
```

**Strategy 2: Smart routing**
Use orthogonal (right-angle) connection routing instead of straight lines. React Flow supports edge types: `smoothstep` and `step` which avoid crossing over nodes.

**Strategy 3: Connection grouping**
If multiple buttons in one block all connect to blocks in the same area, bundle the connections into a single grouped path that splits near the targets.

**Strategy 4: Hide/show toggle**
Let developers toggle connection visibility per block or per connection. A "show all connections" / "show direct only" / "hide all" control.

**Strategy 5: Focus mode**
Click a block → only its incoming and outgoing connections are highlighted, everything else fades to 10% opacity. This is the most practical solution for complex flows.

### 4.4 Transformation Algorithm

```typescript
interface TransformResult {
  chatbotSteps: ChatbotStep[];
  developmentConnections: Connection[];
  warnings: TransformWarning[];
}

interface TransformWarning {
  blockId: string;
  type: 'dead_end' | 'orphan' | 'missing_connection' | 'loop_detected';
  message: string;
}

function transformDesignToDevelopment(
  blocks: Block[],
  designConnections: Connection[],
  startBlockId: string
): TransformResult {

  // 1. Build adjacency graph from design connections
  // 2. Walk from start block using BFS/DFS
  // 3. For each block, create a ChatbotStep:
  //    - Map block type → step type
  //    - Extract output content from block data
  //    - Determine input type from block type
  //    - Create jump rules from outgoing connections
  // 4. Detect warnings:
  //    - Dead ends: blocks with no outgoing connections (except end blocks)
  //    - Orphans: blocks not reachable from start
  //    - Missing connections: buttons with no target
  //    - Loops: circular paths (warning, not error — loops can be intentional)
  // 5. Create development-layer connections with jump rules
  // 6. Apply sequential chain collapsing for clean layout
  // 7. Return steps + connections + warnings

  return { chatbotSteps, developmentConnections, warnings };
}
```

### 4.5 Development Mode UI Additions

When in development mode, the canvas shows:

1. **Step inspector panel** (right side):
   - Output tab: edit what the chatbot says/shows
   - Input tab: configure what the user can do (buttons, text, email, phone, etc.)
   - Jump tab: configure where to go next (per button, on input, fallback)
   - Settings tab: step-level settings (delay, typing indicator, skip logic)

2. **Connection labels**: each connection shows its trigger (button name, condition text)

3. **Validation panel**: shows warnings from transformation
   - Dead ends highlighted in red
   - Orphan blocks grayed out
   - Missing connections shown as red dots

4. **Test path**: click "simulate" to walk through the flow step by step, following the jump logic

---

## 5. Canvas Mode Switcher

Add a mode toggle to the canvas toolbar:

```
[👁 Client View] [✏️ Design] [⚙️ Development]
```

- **Client View**: exactly what the client sees (no connections, no technical blocks, read-only)
- **Design**: internal design mode (design connections visible as dashed lines, full editing)
- **Development**: development mode (all connections visible, step logic editable)

The mode is per-user, not per-project. A designer can be in Design mode while a developer works in Development mode on the same project (with proper locking).

---

## 6. Summary of New Data Structures

### New Prisma models needed:
- `ProjectShare` — share tokens for client access
- `BlockComment` — comments on blocks (client + internal)
- `ProjectTodo` — internal todos derived from comments
- Update `Connection` — add `layer` field (design/development) and `jumpRule` JSON
- Update `ProjectStatus` enum — add DESIGN_REVIEW, DEVELOPMENT, TESTING, LIVE
- `ChatbotStep` — the runtime step (output, input, jump config)

### New pages:
- `/share/[token]` — public client share view
- `/projects/[id]/todos` — internal todo board
- `/projects/[id]/canvas` — updated with mode switcher
- Settings for share management

### New API routes:
- Share management (create, list, revoke)
- Public comment endpoints
- Todo CRUD
- Transform endpoint: `POST /api/projects/[id]/transform`
- Validation endpoint: `GET /api/projects/[id]/validate`
