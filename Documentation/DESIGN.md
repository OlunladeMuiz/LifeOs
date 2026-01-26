# LifeOS — System Design & Architecture

## Overview

LifeOS is a calm, editorial system that helps users decide what to work on next based on three inputs:
1. **Goals** (max 3 active) — the long-term direction
2. **Tasks** — the work to do
3. **Daily Context** — today's energy, time, obstacles

The system outputs ONE recommended action at a time with human-readable explanation.

---

## PART 1 — DATABASE SCHEMA

### Entity Relationship

```
Users (1) ──→ (N) Goals
Users (1) ──→ (N) Tasks  
Users (1) ──→ (N) DailyContext
Goals (1) ──→ (N) Tasks
```

### Core Entities

#### Users
- `id` (PK): UUID
- `email`: unique, required
- `password_hash`: bcrypt hash
- `created_at`, `updated_at`: timestamps

#### Goals
- `id` (PK): UUID
- `user_id` (FK): references Users
- `title`: required (255 char max)
- `description`: optional
- `status`: enum (active|paused|completed|archived) — default: active
- `priority`: 1-100 integer — higher = more important
- `created_at`, `updated_at`: timestamps
- `completed_at`: timestamp (only set when status changes to completed)
- **Constraint**: Max 3 goals with status='active' per user (enforced at DB + service layer)

#### Tasks
- `id` (PK): UUID
- `user_id` (FK): references Users
- `goal_id` (FK, nullable): references Goals (task can exist without goal)
- `title`: required
- `description`: optional
- `status`: enum (inbox|ready|in_progress|completed|skipped) — default: inbox
- `priority`: 1-100 integer
- `estimated_minutes`: optional integer (helps decision engine)
- `created_at`, `updated_at`: timestamps
- `completed_at`: timestamp (set only on completion)

#### DailyContext
- `id` (PK): UUID
- `user_id` (FK): references Users
- `date`: date (no time component) — grouped by calendar day
- `energy_level`: enum (low|medium|high)
- `available_minutes`: integer (how much time available today)
- `obstacles`: text (blockers to work)
- `notes`: text (general observations)
- `created_at`, `updated_at`: timestamps
- **Constraint**: Unique (user_id, date) — one context per user per day

### Why These Fields

| Field | Rationale |
|-------|-----------|
| `goals.priority` | Decision engine uses to rank which goal's tasks to consider |
| `tasks.estimated_minutes` | Engine filters: only suggest tasks that fit available time |
| `daily_context.date` | Queries today's context without time logic |
| `completed_at` (immutable) | Audit trail for history/trends, never deleted |
| `goal_id` nullable | Support inbox tasks (not tied to any goal yet) |
| Max 3 active goals | Prevents overwhelm; forces prioritization |

---

## PART 2 — BACKEND APIs

### Architecture

**Stack**: Express.js + Node.js + TypeScript + Prisma ORM  
**Database**: PostgreSQL (recommended)  
**Auth**: JWT (access + refresh tokens)  
**Validation**: Zod (schema validation at controller layer)  
**Response Format**: Consistent JSON envelope

### Response Envelope

Every response follows this format:

```json
{
  "ok": true|false,
  "data": { /* response data */ },
  "error": "error_code" /* only if ok=false */
}
```

### Auth Endpoints

#### POST /api/auth/register
**Request**:
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123"
}
```

**Response (201)**:
```json
{
  "ok": true,
  "data": {
    "user": { "id": "uuid", "email": "user@example.com" },
    "accessToken": "jwt_token",
    "refreshToken": "refresh_token"
  }
}
```

**Errors**:
- `email_already_exists` (400)
- `invalid_password` (400) — min 8 chars
- `invalid_email` (400)

#### POST /api/auth/login
**Request**:
```json
{
  "email": "user@example.com",
  "password": "password"
}
```

**Response (200)**:
```json
{
  "ok": true,
  "data": {
    "user": { "id": "uuid", "email": "user@example.com" },
    "accessToken": "jwt_token",
    "refreshToken": "refresh_token"
  }
}
```

**Errors**:
- `invalid_credentials` (401) — both wrong email and wrong password return same error (security)

#### POST /api/auth/refresh
**Request**:
```json
{
  "refreshToken": "refresh_token"
}
```

**Response (200)**:
```json
{
  "ok": true,
  "data": {
    "accessToken": "new_jwt_token"
  }
}
```

**Errors**:
- `missing_token` (400)
- `invalid_token` (401)

---

### Goals Endpoints

All require JWT auth: `Authorization: Bearer <token>`

#### GET /api/goals
Returns all goals for user, ordered by priority DESC.

**Response (200)**:
```json
{
  "ok": true,
  "data": {
    "goals": [
      {
        "id": "uuid",
        "title": "Learn TypeScript",
        "description": "Master advanced types",
        "status": "active",
        "priority": 85,
        "taskCount": 5,
        "createdAt": "2026-01-01T00:00:00Z"
      }
    ]
  }
}
```

#### POST /api/goals
Create new goal. Returns error if max 3 active goals already exist.

**Request**:
```json
{
  "title": "Learn TypeScript",
  "description": "Master advanced types",
  "priority": 85
}
```

**Response (201)**: Created goal object

**Errors**:
- `max_active_goals_reached` (400) — user already has 3 active goals
- `title_required` (400)
- `invalid_priority` (400) — must be 1-100

#### PATCH /api/goals/:id
Update goal. Validate ownership.

**Request**:
```json
{
  "title": "...",
  "priority": 90,
  "status": "paused"
}
```

**Response (200)**: Updated goal object

**Errors**:
- `not_owner` (403)
- `goal_not_found` (404)

#### DELETE /api/goals/:id
Delete goal (soft or hard delete is implementation choice).

**Response (204)**: No content

**Errors**:
- `not_owner` (403)
- `goal_not_found` (404)

---

### Tasks Endpoints

All require JWT auth.

#### GET /api/tasks?status=inbox&goalId=uuid
Get tasks with optional filters.

**Query Parameters**:
- `status`: optional (inbox|ready|in_progress|completed|skipped)
- `goalId`: optional (filter by goal)

**Response (200)**:
```json
{
  "ok": true,
  "data": {
    "tasks": [
      {
        "id": "uuid",
        "title": "Read TypeScript handbook",
        "status": "inbox",
        "priority": 60,
        "estimatedMinutes": 45,
        "goalId": "uuid",
        "createdAt": "2026-01-01T00:00:00Z"
      }
    ]
  }
}
```

#### POST /api/tasks
Create task.

**Request**:
```json
{
  "title": "Read TypeScript handbook",
  "description": "...",
  "priority": 60,
  "estimatedMinutes": 45,
  "goalId": "uuid" /* optional */
}
```

**Response (201)**: Created task object

#### PATCH /api/tasks/:id
Update task. Enforces valid status transitions.

**Request**:
```json
{
  "status": "in_progress",
  "priority": 70,
  "goalId": "uuid"
}
```

**Valid Transitions**:
```
inbox      → ready, in_progress
ready      → in_progress, inbox
in_progress → completed, skipped
completed  → (terminal, no transitions)
skipped    → inbox
```

**Response (200)**: Updated task object

**Errors**:
- `invalid_status_transition` (409) — e.g., completed → inbox
- `not_owner` (403)
- `task_not_found` (404)

#### DELETE /api/tasks/:id
Delete task.

**Response (204)**: No content

---

### Daily Context Endpoints

#### GET /api/context/today
Get today's context (or empty if not set).

**Response (200)**:
```json
{
  "ok": true,
  "data": {
    "date": "2026-01-10",
    "energyLevel": "high",
    "availableMinutes": 120,
    "obstacles": "Back-to-back meetings",
    "notes": "Feel focused"
  }
}
```

If no context exists for today:
```json
{
  "ok": true,
  "data": {
    "date": "2026-01-10",
    "energyLevel": null,
    "availableMinutes": null,
    "obstacles": null,
    "notes": null
  }
}
```

#### POST /api/context
Create or update context for a date.

**Request**:
```json
{
  "date": "2026-01-10",
  "energyLevel": "high",
  "availableMinutes": 120,
  "obstacles": "...",
  "notes": "..."
}
```

**Response (201/200)**: Created/updated context object

---

### Decision Engine Endpoint ⭐

#### GET /api/decision/next

**THIS IS THE CORE OF LIFEOS**

Returns one recommended task with human-readable explanation.

**Response (200 - recommendation found)**:
```json
{
  "ok": true,
  "data": {
    "recommendation": {
      "taskId": "uuid",
      "taskTitle": "Read TypeScript handbook",
      "taskDescription": "...",
      "goalTitle": "Learn TypeScript",
      "estimatedMinutes": 45,
      "reasoning": "You have 120 minutes available with high energy. This task supports your highest priority goal (TypeScript at 85/100). It's estimated at 45 minutes, leaving buffer time."
    }
  }
}
```

**Response (200 - no recommendation)**:
```json
{
  "ok": true,
  "data": {
    "recommendation": null,
    "message": "No tasks available. Consider adding a task or reviewing your goals."
  }
}
```

#### Algorithm

```
1. Get today's date (midnight)
2. Fetch today's DailyContext (energy, available_minutes, obstacles)
3. Fetch all active goals, ordered by priority DESC
4. For each goal (in priority order):
   a. Get tasks with status in [inbox, ready]
   b. Filter tasks where estimated_minutes <= available_minutes
   c. If found, return highest-priority task
5. If no task found in goals, check standalone inbox tasks
6. If still no task, return null + helpful message
7. Build reasoning string (include energy, available time, goal context, obstacles)
```

#### Key Rules

- **Never recommend a task longer than available time** (unless default assumption is made)
- **Always pick task from highest-priority active goal first** (respects user's stated priorities)
- **Reasoning must be human-readable** (no algorithm internals)
- **Handle edge cases**: no context (assume 8 hrs available), no goals, no tasks

---

## PART 3 — FRONTEND INFORMATION ARCHITECTURE

### Five-Screen Model

#### 1. Today (Home Screen) — `/`
**Purpose**: Singular focus; see ONE recommended task.

**Components**:
- Task recommendation card (title, description, estimated time)
- Reasoning box (why this task)
- Action buttons: Start | View Inbox | Skip

**Data Flow**:
- Load: `GET /api/decision/next`
- On Start: `PATCH /api/tasks/:id { status: "in_progress" }`
- On Skip: `PATCH /api/tasks/:id { status: "skipped" }`

**Empty State**: "No tasks available. Go to Goals to create one."

**Error State**: "Unable to load. Try refreshing."

---

#### 2. Inbox — `/inbox`
**Purpose**: Task collection and triage.

**Responsibility**:
- Create tasks
- Assign tasks to goals
- Set priority
- Change status (inbox → ready)
- Delete tasks

**Components**:
- Task list (scrollable)
- Task item (title, goal, priority, status badge)
- Create button (FAB)
- Task modal (create/edit)
- Status filter tabs (All | Inbox | Ready)

**Data Flow**:
- Load: `GET /api/tasks?status=inbox`
- Create: `POST /api/tasks`
- Update: `PATCH /api/tasks/:id`
- Delete: `DELETE /api/tasks/:id`

---

#### 3. Goals — `/goals`
**Purpose**: Define and manage the three active goals.

**Responsibility**:
- Create goals (with max 3 active check)
- Edit priority
- Pause/complete goals
- View tasks per goal

**Components**:
- Goals list
- Goal card (title, priority, status, task count)
- Create button (FAB)
- Goal modal (create/edit)

**Data Flow**:
- Load: `GET /api/goals`
- Create: `POST /api/goals`
- Update: `PATCH /api/goals/:id`
- Delete: `DELETE /api/goals/:id`

---

#### 4. Context — `/context`
**Purpose**: Set today's constraints and energy level.

**Responsibility**:
- Set energy level (low/medium/high)
- Set available minutes
- Note obstacles
- Add general notes
- View recent entries

**Components**:
- Energy picker (3-state button group)
- Available time input (number)
- Obstacles textarea
- Notes textarea
- Recent context list (last 7 days)

**Data Flow**:
- Load: `GET /api/context/today`
- Save: `POST /api/context`

**Design Note**: Minimal form, encourages quick update (<2 min to complete)

---

#### 5. History — `/history`
**Purpose**: Reflect on completed work.

**Responsibility**:
- View completed tasks
- Filter by date range
- View by goal
- Read-only (no editing)

**Components**:
- Completed tasks list
- Date filter (week/month/all-time)
- Goal filter dropdown
- Stats (tasks completed, time spent)

**Data Flow**:
- Load: `GET /api/tasks?status=completed&dateFrom=...&dateTo=...`

---

### Navigation Model

```
Bottom Tab Bar:
┌─────────────────────────────────┐
│ ☀️ Inbox 🎯 Goals ⚙️ Context 📋 │
│ Today   (active)                │
└─────────────────────────────────┘

Current screen highlights.
No deep nesting — each tab is independent.
Modals only for: create/edit goal, create/edit task, confirm delete.
```

---

## PART 4 — MODERN, RECRUITER-LEVEL UI DESIGN

### Typography System

```
Display (Hero)
├─ Font: Inter, system-ui sans-serif
├─ Size: 48px
├─ Weight: 600
├─ Line-height: 1.1
└─ Usage: "What's next?" on Today screen

Large (Section Headers)
├─ Size: 24px
├─ Weight: 600
├─ Line-height: 1.3
└─ Usage: Goal titles, screen headers

Body (Primary)
├─ Size: 16px
├─ Weight: 400
├─ Line-height: 1.6
└─ Usage: Task descriptions, paragraphs

Small (Meta)
├─ Size: 13px
├─ Weight: 500
├─ Line-height: 1.5
└─ Usage: Labels, timestamps, badges

Code (Monospace)
├─ Font: JetBrains Mono or monospace stack
├─ Size: 13px
└─ Usage: Internal IDs (not exposed to users)
```

### Color System

```
Neutral (Grayscale)
├─ bg-primary: #ffffff (light) / #0a0a0a (dark)
├─ bg-secondary: #f5f5f5 (light) / #1a1a1a (dark)
├─ text-primary: #0a0a0a (light) / #ffffff (dark)
├─ text-secondary: #666666 (light) / #999999 (dark)
└─ border: #e0e0e0 (light) / #333333 (dark)

Action (Single Accent)
├─ accent: #0066cc (trustworthy blue)
├─ accent-hover: #0052a3
├─ accent-active: #003d7a
└─ Usage: Primary buttons, links, focus rings

Intent
├─ success: #047857 (green) — completed, archived
├─ warning: #d97706 (amber) — obstacles, paused
├─ danger: #dc2626 (red) — delete, errors
└─ info: #0066cc (same as accent)

Functional
├─ focus-ring: 2px solid #0066cc
├─ shadow-sm: 0 1px 2px rgba(0,0,0,0.05)
└─ shadow-md: 0 4px 6px rgba(0,0,0,0.1)
```

### Layout Principles

1. **Maximum Width**: 600px for content (keeps focus, readable)
2. **Padding**: 24px left/right (generous breathing room)
3. **Spacing Scale**: 4px, 8px, 12px, 16px, 24px, 32px
4. **No Cards**: Use white space and subtle borders instead
5. **Full-Bleed Lists**: Items extend edge-to-edge (swipe-friendly)
6. **Centered Columns**: Content centered, not left-aligned
7. **Vertical Rhythm**: Lines align to 4px grid

### Motion Guidelines

```
Transitions: 200ms ease-in-out
├─ Button state changes
├─ Modal entrance/exit (fade + scale up)
└─ Navigation tab highlight

Animations (Minimal)
├─ No spinners (use skeleton loaders)
├─ No confetti/celebratory effects
├─ No auto-advancing carousels
└─ Subtle opacity changes only

Interactive Targets
├─ Minimum tap size: 44px × 44px
├─ Hover state: +10% opacity change
├─ Active state: scale 0.98x (slight press)
└─ Focus ring: 2px solid --accent
```

### Dark Mode

System automatically detects `prefers-color-scheme: dark`. Adjust colors accordingly (use CSS variables or Tailwind's `dark:` prefix).

---

## PART 5 — FRONTEND IMPLEMENTATION PLAN

### Screen-by-Screen Breakdown

#### Today Screen (`/` → TodayScreen.tsx)

**Components**:
```
TodayScreen
├─ LoadingState (skeleton)
├─ ErrorState (fallback UI)
├─ EmptyState (no recommendation)
└─ TaskRecommendation
   ├─ GoalBadge (optional)
   ├─ TaskTitle (48px heading)
   ├─ TaskDescription (paragraph)
   ├─ TimeEstimate (meta)
   ├─ ReasoningBox (quote-style)
   └─ ActionButtons
      ├─ Start (primary)
      ├─ View Inbox (secondary)
      └─ Skip (ghost)
```

**State**:
```typescript
{
  recommendation: Recommendation | null,
  loading: boolean,
  error: string | null,
  selectedTask: string | null
}
```

**API Calls**:
1. `GET /api/decision/next` (on mount)
2. `PATCH /api/tasks/:id` (on Start/Skip)
3. Refresh recommendation after action

**Loading State**: Spinner + "Finding your next task..."

**Error State**: Retry button, show error code (not raw message)

---

#### Inbox Screen (`/inbox` → InboxScreen.tsx)

**Components**:
```
InboxScreen
├─ Header ("Inbox")
├─ StatusFilter (All | Inbox | Ready)
├─ TaskList
│  └─ TaskItem (repeating)
│     ├─ Title
│     ├─ Goal badge (optional)
│     ├─ Priority indicator
│     └─ Status badge
├─ CreateTaskButton (FAB)
└─ TaskModal
   ├─ Title input
   ├─ Description input
   ├─ Goal selector dropdown
   ├─ Priority slider (1-100)
   ├─ Estimated minutes input
   └─ Save/Cancel buttons
```

**State**:
```typescript
{
  tasks: Task[],
  filter: 'all' | 'inbox' | 'ready',
  selectedTask: Task | null,
  loading: boolean,
  error: string | null
}
```

**API Calls**:
1. `GET /api/tasks?status=...` (on mount, on filter change)
2. `POST /api/tasks` (create)
3. `PATCH /api/tasks/:id` (update)
4. `DELETE /api/tasks/:id` (delete)

---

#### Goals Screen (`/goals` → GoalsScreen.tsx)

**Components**:
```
GoalsScreen
├─ Header ("Goals")
├─ GoalsList (max 3 active shown)
│  └─ GoalCard (repeating)
│     ├─ Title (24px)
│     ├─ Priority bar (visual)
│     ├─ Task count
│     ├─ Status badge
│     └─ Menu (edit/pause/complete/delete)
├─ CreateGoalButton (FAB)
└─ GoalModal
   ├─ Title input
   ├─ Description input
   ├─ Priority slider (1-100)
   └─ Save/Cancel buttons
```

**State**:
```typescript
{
  goals: Goal[],
  selectedGoal: Goal | null,
  loading: boolean,
  error: string | null
}
```

**API Calls**:
1. `GET /api/goals` (on mount)
2. `POST /api/goals` (create, with max 3 check)
3. `PATCH /api/goals/:id` (update)
4. `DELETE /api/goals/:id` (delete)

---

#### Context Screen (`/context` → ContextScreen.tsx)

**Components**:
```
ContextScreen
├─ Header ("Today's Context")
├─ ContextForm
│  ├─ EnergyPicker (Low | Medium | High buttons)
│  ├─ AvailableTimeInput (number field)
│  ├─ ObstaclesTextarea
│  ├─ NotesTextarea
│  └─ SaveButton
├─ ContextHistory
│  └─ ContextItem (repeating, last 7 days)
│     ├─ Date
│     ├─ Energy level badge
│     ├─ Available minutes
│     └─ Read-only
```

**State**:
```typescript
{
  context: DailyContext | null,
  loading: boolean,
  saved: boolean,
  error: string | null
}
```

**API Calls**:
1. `GET /api/context/today` (on mount)
2. `POST /api/context` (save)

**Design Note**: Form should be quick to complete. No validation errors shown unless critical (e.g., negative minutes).

---

#### History Screen (`/history` → HistoryScreen.tsx)

**Components**:
```
HistoryScreen
├─ Header ("History")
├─ Filters
│  ├─ DateRangeFilter (Week | Month | All)
│  └─ GoalFilter (dropdown)
├─ StatsBar (optional)
│  ├─ Tasks completed (count)
│  ├─ Total time (estimate)
│  └─ Streak (optional)
└─ TasksList
   └─ TaskItem (read-only)
      ├─ Title
      ├─ Goal
      ├─ Completed date
      └─ Time spent (if available)
```

**State**:
```typescript
{
  tasks: Task[],
  dateFilter: 'week' | 'month' | 'all',
  goalFilter: string | null,
  loading: boolean,
  error: string | null
}
```

**API Calls**:
1. `GET /api/tasks?status=completed&dateFrom=...&dateTo=...` (on mount, on filter change)

**Design Note**: This is read-only. Celebrate completed work. Consider showing time estimate vs actual if tracked.

---

## PART 6 — STARTER COMPONENT CODE

### Core Files Created

✅ Backend:
- `backend/package.json` — Dependencies
- `backend/prisma/schema.prisma` — Database schema
- `backend/tsconfig.json` — TypeScript config
- `backend/.env.example` — Environment variables template
- `backend/src/index.ts` — Express app entry point
- `backend/src/middleware/auth.ts` — JWT middleware
- `backend/src/middleware/errorHandler.ts` — Error handling
- `backend/src/routes/auth.ts` — Auth endpoints
- `backend/src/routes/goals.ts` — Goals endpoints
- `backend/src/routes/tasks.ts` — Tasks endpoints
- `backend/src/routes/context.ts` — Context endpoints
- `backend/src/routes/decision.ts` — Decision engine

✅ Frontend:
- `frontend/package.json` — Added axios dependency
- `frontend/lib/api.ts` — API client with token management
- `frontend/lib/auth-context.tsx` — Auth provider & hook
- `frontend/components/error-boundary.tsx` — Error boundary
- `frontend/app/(protected)/layout.tsx` — Protected route layout
- `frontend/components/app-layout.tsx` — Bottom tab navigation
- `frontend/components/today-screen.tsx` — Today/home screen
- `frontend/app/page.tsx` — Home page
- `frontend/app/login/page.tsx` — Login/register page
- `frontend/.env.local.example` — Frontend env template

### Key Implementation Details

#### Backend Auth Flow

```typescript
// Register/Login returns both tokens
{
  accessToken: "jwt (1h expiry)",
  refreshToken: "jwt (7d expiry)"
}

// Stored in localStorage on frontend
// Refreshed before expiry

// When 401 on protected route, automatically refresh
```

#### Frontend Protected Routes

```typescript
<ProtectedLayout>
  <AppLayout>
    <TodayScreen />
  </AppLayout>
</ProtectedLayout>

// Checks if user is logged in
// Redirects to /login if not
// Prevents rendering until hydrated (prevents flash)
```

#### Decision Engine in Action

```
User logs in → Navigates to Today → 
GET /api/decision/next →
Backend fetches context, goals, tasks →
Applies algorithm →
Returns single recommendation with explanation →
User clicks "Start" →
PATCH /api/tasks/:id { status: "in_progress" } →
Backend updates → Frontend refreshes recommendation
```

---

## PART 7 — SAFETY & ROBUSTNESS

### Frontend Safety Checklist

- ✅ **Prevent render before auth**: `ProtectedLayout` checks `isLoading && user`
- ✅ **Prevent render before data**: Each screen checks `loading` state before rendering
- ✅ **Handle network errors gracefully**: API client catches and returns `{ ok: false, error }`
- ✅ **Never show raw errors**: All error messages are user-friendly codes/strings
- ✅ **Empty states defined**: Every list/screen has "no items" UI
- ✅ **Hydration safety**: `useEffect` sets mounted flag, prevents SSR/client mismatch
- ✅ **Error boundary**: Catches React errors, shows recovery button
- ✅ **Loading states**: Skeleton loaders, spinners for async operations

### Backend Safety Checklist

- ✅ **Ownership checks**: All endpoints verify `userId` matches request user
- ✅ **Input validation**: Zod schemas validate all POST/PATCH payloads
- ✅ **Business rule enforcement**:
  - Max 3 active goals (checked in POST /goals)
  - Valid status transitions (checked in PATCH /tasks)
  - Only users can see their own data (where clause on all queries)
- ✅ **Auth required**: All non-auth endpoints require JWT
- ✅ **Error messages**: Standardized error codes, no SQL/stack traces exposed
- ✅ **Database constraints**: Unique constraints at DB level (max 3 active goals, one context per day)

### Common Gotchas & Mitigations

| Gotcha | Mitigation |
|--------|-----------|
| Flash of unauth UI | `ProtectedLayout` blocks render until hydrated |
| Race condition on token refresh | API client queues requests during refresh |
| User deletes own goal, tasks orphaned | Set `goalId` to NULL (ON DELETE SET NULL) |
| Context not set, decision fails | Default to 8 hours available, medium energy |
| Empty task list crashes screen | Check `tasks.length > 0` before rendering |
| Status transition not validated | Enforce at both controller and DB level |
| User sees other user's goals | All queries filter by `userId` |

---

## PART 8 — FINAL BUILD CHECKLIST

### Prerequisites
- Node.js 18+ installed
- PostgreSQL database (local or cloud)
- Git (for version control)

### Setup Order

1. **Backend Setup**
   ```bash
   cd backend
   npm install
   # Create .env from .env.example
   cp .env.example .env
   # Edit .env with DATABASE_URL, JWT secrets
   npx prisma migrate deploy  # Create database schema
   npm run dev  # Start server (should run on port 3001)
   ```

2. **Frontend Setup**
   ```bash
   cd ../frontend
   npm install
   # Create .env.local from .env.local.example
   cp .env.local.example .env.local
   npm run dev  # Start dev server (should run on port 3000)
   ```

3. **Verify Integration**
   - Open http://localhost:3000
   - Should see LifeOS login page
   - Click "Create one"
   - Register with test email
   - Should redirect to Today screen
   - Today screen should say "No tasks available"

### Testing the System

#### Test 1: Goal Creation
1. Click Goals tab
2. Click create button
3. Enter "Learn TypeScript"
4. Set priority to 85
5. Click save
6. Should appear in Goals list

#### Test 2: Task Creation
1. Click Inbox tab
2. Click create button
3. Enter "Read TypeScript handbook"
4. Select goal "Learn TypeScript"
5. Set estimated minutes to 45
6. Click save
7. Should appear in Inbox

#### Test 3: Daily Context
1. Click Context tab
2. Set energy to "high"
3. Set available minutes to 120
4. Click save
5. Should show "Saved successfully"

#### Test 4: Decision Engine
1. Click Today tab
2. Should see task recommendation
3. Reasoning box should mention: energy level, available time, goal
4. Click "Start" button
5. Task status should change to "in_progress"
6. New recommendation should load

#### Test 5: History
1. Mark tasks as completed (go back to Inbox, update task status to "completed")
2. Click History tab
3. Should see completed task
4. Should show completion date

### Common Issues & Fixes

| Issue | Fix |
|-------|-----|
| `DATABASE_URL not found` | Ensure `.env` file created and has valid PostgreSQL URL |
| `Port 3001 already in use` | Change PORT in .env, or kill existing process |
| `NEXT_PUBLIC_API_URL not set` | Create `.env.local` with `NEXT_PUBLIC_API_URL=...` |
| `JWT errors on login` | Ensure JWT_SECRET and JWT_REFRESH_SECRET in backend .env |
| `CORS errors` | Backend already has `cors()` middleware, should be OK |
| `Tokens not persisting` | Check localStorage is enabled in browser |
| `API calls return 404` | Ensure backend is running on correct port |

### How to Verify System is Wired Correctly

1. **Check Backend Logs**:
   ```
   You should see: "LifeOS backend running on port 3001"
   ```

2. **Check Frontend Console**:
   - Open DevTools (F12)
   - No TypeScript errors
   - Network tab shows API calls to `http://localhost:3001/api/...`

3. **Test Auth Flow**:
   - Register → should see tokens in localStorage
   - Refresh page → should still be logged in
   - Logout → should redirect to login

4. **Test Decision Engine**:
   - Create 3 goals with different priorities
   - Add tasks to each goal
   - Set daily context
   - `GET /api/decision/next` should return highest-priority goal's task

5. **Test Constraints**:
   - Try to create 4th active goal → should fail with `max_active_goals_reached`
   - Try invalid status transition → should fail with `invalid_status_transition`

---

## FINAL NOTES

### Principles to Remember

1. **One Task at a Time**: Today screen shows ONE recommendation. No lists, no choices.
2. **Explainable**: Every recommendation includes reasoning. No black boxes.
3. **Maximum 3 Goals**: Forces prioritization. Prevents overwhelm.
4. **Calm UI**: Large typography, white space, no productivity gimmicks.
5. **Ownership Validation**: Every endpoint checks user ownership.
6. **Graceful Errors**: No raw error messages shown to users.

### Next Steps (Future Enhancements)

These are OUT OF SCOPE for v1 but good for roadmap:
- Push notifications for task reminders
- Task time tracking (actual minutes spent)
- Weekly reflection prompts
- Recurring tasks
- Collaboration (shared goals)
- Mobile app (native React Native)
- Analytics dashboard (self-viewing only, no external tracking)
- Dark mode refinement
- Keyboard shortcuts

### Recruiter Notes

This system demonstrates:
- **Full-stack architecture**: Clear separation of concerns (auth, endpoints, services, validation)
- **Database design**: Normalized schema, constraints, relationships
- **API design**: Consistent response format, proper HTTP methods, error codes
- **Frontend patterns**: Context API, custom hooks, error boundaries, protected routes
- **Business logic**: Decision algorithm, constraint enforcement (max 3 goals)
- **Security**: JWT auth, ownership checks, input validation
- **UX/Design thinking**: Information architecture, typography system, motion guidelines
- **Code organization**: Modular, typed, extensible
- **Error handling**: Graceful degradation, user-friendly messages

---

**END OF DESIGN DOCUMENT**

Built with senior-level discipline. Ready for production scaffolding.
