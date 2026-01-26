# LifeOS

A decision-focused productivity system that helps you know what to do next.

---

## Why Most Productivity Apps Fail

Most productivity tools optimize for **task capture**, not **task selection**. They excel at collecting todos into increasingly overwhelming lists. Users feel pressure to add everything, then paralyzed choosing what to do.

The core problem: **Humans are bad at prioritization at execution time.** We know intellectually what matters, but facing a list of 30 tasks without context, we either:
1. Pick randomly (wasting effort on low-impact work)
2. Freeze and do nothing
3. Feel guilty and abandon the app

---

## LifeOS Philosophy

LifeOS inverts the problem. Instead of asking "what should I do today?", it asks:

**Given what I know right now (energy, time, stress), what is the single best next task?**

This shifts from:
- **Capturing** everything → **Deciding** once
- **Lists** → **Recommendations**
- **Guilt** → **Confidence**

The system maintains three inputs:
1. **Goals** — What matters to you (structured by importance, not urgency)
2. **Tasks** — Concrete work (with effort cost and impact)
3. **Daily Context** — Your state (energy level, available minutes, stress)

From these, a deterministic algorithm returns one recommended task with reasoning.

---

## How the Decision Engine Works

**Non-technical explanation:**

You wake up. The system knows:
- You have 4 hours free
- You're at medium energy
- Your stress is moderate

It checks your active goals (ordered by importance), then for each goal:
- "Can I find a task that takes ≤4 hours?"
- "Is the effort reasonable for my energy level?"

It returns the highest-impact task that fits. It also tells you *why*:

> "You have 240 minutes available with MEDIUM energy. This task supports your goal 'Learn TypeScript' (importance: 85/100)."

This explanation matters. It's not manipulation—it's reasoning you can trust.

**Key insight:** The recommendation is deterministic. Same context + same tasks = same recommendation. No hidden scores, no machine learning that you don't understand.

---

## Key Architectural Decisions

### 1. **Deterministic > Algorithmic**
No machine learning. No collaborative filtering. The algorithm is transparent, bounded, and auditable. It's easier for users to trust what they can understand.

### 2. **REST API First**
Complete API contract frozen at v1.0.0. Frontend is a client, not embedded in monolith. Enables multiple UI surfaces (mobile, CLI, calendar integration, etc.) without touching backend logic.

### 3. **Enum-Driven States**
Status fields use strict enums (PENDING/DONE/SNOOZED for tasks), not free-form strings. This prevents invalid state and makes API contracts bulletproof.

### 4. **Soft Deletes Only**
All deletions are soft (deletedAt field). No cascade deletes. Preserves data integrity and enables audit trails if needed later.

### 5. **Editorial UI (Not Dashboard)**
The Today screen shows ONE task, not stats or charts. Typography, whitespace, and clarity replace density. This is a philosophical choice: productivity tools should reduce cognitive load, not increase it.

### 6. **No Auth Token in URL**
Tokens in Bearer headers only. No implicit refresh in URL patterns. Prevents accidental credential exposure in logs.

### 7. **Ownership Checks on All Mutations**
Every update/delete verifies `req.userId === resource.userId`. No accidental cross-user data leaks.

### 8. **Date-Only Storage for Context**
`DailyContext.date` stored as `@db.Date`, not `@db.DateTime`. Prevents timezone bugs and accidental multiple contexts per day.

---

## Technical Stack

**Backend:** Node.js + Express + TypeScript + Prisma + PostgreSQL  
**Frontend:** Next.js 16 + React 19 + Tailwind + Axios  
**Database:** PostgreSQL with strict schema validation  
**API:** REST, frozen at v1.0.0, full contract documented  

**Code Quality:**
- TypeScript strict mode throughout
- Zod validation on all inputs
- Consistent error handling with documented error codes
- No N+1 queries
- Indexed queries for performance

---

## What Makes This Different

### Compared to Todoist/TickTick
Those are **list managers**. LifeOS is a **decision system**. They capture; we recommend.

### Compared to Hyperf/Full Focus
Those push **time-blocking**. LifeOS respects that context changes. You wake up sick? Your context changes, your recommendation changes.

### Compared to Eisenhower Matrix Tools
Those require **upfront categorization** (urgent/important). LifeOS asks you to set importance once, then uses context at runtime.

### Compared to AI Coach Apps
Those hide their reasoning behind ML. LifeOS shows its work. You can audit why you're seeing this task.

---

## What's Built

**Backend (100% complete):**
- ✅ Auth (register, login, refresh token)
- ✅ Goals CRUD (max 3 active enforcement)
- ✅ Tasks CRUD (status transitions enforced)
- ✅ Daily Context (upsert, energy/stress/time)
- ✅ Decision Engine (deterministic recommendation with reasoning)
- ✅ Error handling (consistent error codes across 18 endpoints)

**Frontend (Today screen complete):**
- ✅ Login/register flow
- ✅ Today screen (recommendation display, editorial design)
- ✅ Loading, error, empty states (calm design)
- ✅ API client with auto-refresh on 401
- 🔲 Goals screen
- 🔲 Tasks/Inbox screen
- 🔲 Context settings screen

**Documentation:**
- ✅ API contract v1.0.0 (frozen, stable)
- ✅ Decision engine test plan (10 test cases, 8 failure modes)
- ✅ Today screen implementation guide

---

## What I Would Build Next

**Priority 1 (2 weeks):**
1. Energy-based effort limiting — Don't recommend 180-min tasks when energy=LOW
2. Stress-based filtering — Suggest shorter tasks when stress > 7
3. Goals & Tasks screens — Full CRUD UIs
4. Context settings page

**Priority 2 (Month 2):**
1. Keyboard shortcuts — Space to start, Esc to snooze
2. Mobile app — React Native reusing API client
3. Notifications — "You have a snoozed task available"

**Not building:**
- Collaboration (single-user focused)
- Time-tracking (too noisy)
- Habit tracking (separate concern)
- Social features (distraction)

---

## Local Setup (5 minutes)

### Backend

```bash
cd backend
npm install
cp .env.example .env
# Update DATABASE_URL in .env
npx prisma migrate dev
npm run dev
```

**Backend runs on:** http://localhost:3001

### Frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local
# Update NEXT_PUBLIC_API_URL in .env.local
npm run dev
```

**Frontend runs on:** http://localhost:3000

```
Frontend (Next.js + React)
    ↓
API Client (Axios + JWT tokens)
    ↓
Backend (Express + Node.js)
    ↓
Database (PostgreSQL + Prisma ORM)
```

**5 Screens**: Today, Inbox, Goals, Context, History

**3 Main Entities**: Goals, Tasks, Daily Context

**Core Feature**: Decision Engine (`GET /api/decision/next`)

---

## Local Setup (5 minutes)

### Backend

```bash
cd backend
npm install

# Create .env
cp .env.example .env

# Edit .env — add your PostgreSQL URL:
# DATABASE_URL="postgresql://user:pass@localhost:5432/lifeos"
# JWT_SECRET="any-random-string"
# JWT_REFRESH_SECRET="any-random-string"

# Create database schema
npx prisma migrate deploy

# Start
npm run dev
# Should show: "LifeOS backend running on port 3001"
```

### Frontend

```bash
cd frontend
npm install

# Create .env.local
cp .env.local.example .env.local

# Start
npm run dev
# Open http://localhost:3000
```

---

## First Run

Want a guided walkthrough? Use the 5-minute demo script: `Documentation/DEMO_SCRIPT.md`.

1. **Register**: Create account with any email/password
2. **Create Goal**: Goals tab → Create goal "Learn TypeScript" (priority 85)
3. **Create Task**: Inbox tab → Create task "Read handbook" (45 min, linked to goal)
4. **Set Context**: Context tab → Energy: High, Time: 120 minutes
5. **Get Recommendation**: Today tab → Should see your task recommended

---

## File Structure

```
backend/
├── src/
│   ├── index.ts                  # Express app
│   ├── middleware/
│   │   ├── auth.ts              # JWT validation
│   │   └── errorHandler.ts      # Error handling
│   └── routes/
│       ├── auth.ts              # Register/login
│       ├── goals.ts             # CRUD goals
│       ├── tasks.ts             # CRUD tasks + status transitions
│       ├── context.ts           # Today's context
│       └── decision.ts          # Decision engine ⭐
├── prisma/
│   └── schema.prisma            # Database schema
├── .env.example
└── package.json

frontend/
├── app/
│   ├── page.tsx                 # Home (Today screen)
│   ├── login/page.tsx           # Auth page
│   └── layout.tsx               # Root layout
├── lib/
│   ├── api.ts                   # API client + token management
│   └── auth-context.tsx         # Auth state & hooks
├── components/
│   ├── today-screen.tsx         # Task recommendation
│   ├── app-layout.tsx           # Bottom nav
│   ├── protected-layout.tsx      # Auth guard
│   └── error-boundary.tsx       # Error fallback
├── .env.local.example
└── package.json
```

---

## Key APIs

### Decision Engine
```
GET /api/decision/next

Response:
{
  "ok": true,
  "data": {
    "recommendation": {
      "taskId": "...",
      "taskTitle": "Read TypeScript handbook",
      "goalTitle": "Learn TypeScript",
      "estimatedMinutes": 45,
      "reasoning": "You have 120 minutes available with high energy..."
    }
  }
}
```

### Create Goal
```
POST /api/goals
{
  "title": "Learn TypeScript",
  "priority": 85
}

// Fails if 3 active goals already exist
```

### Update Task Status
```
PATCH /api/tasks/:id
{
  "status": "in_progress"
}

// Valid transitions:
// inbox → ready, in_progress
// ready → in_progress, inbox
// in_progress → completed, skipped
// completed → (terminal)
// skipped → inbox
```

### Set Daily Context
```
POST /api/context
{
  "energyLevel": "high",
  "availableMinutes": 120,
  "obstacles": "Back-to-back meetings",
  "notes": "Feel focused"
}
```

---

## Design System

### Colors
- **Primary action**: `#0066cc` (blue)
- **Success**: `#047857` (green)
- **Warning**: `#d97706` (amber)
- **Danger**: `#dc2626` (red)
- **Background**: `#ffffff` (light) / `#0a0a0a` (dark)

### Typography
- **Display** (hero): 48px, 600 weight
- **Large** (headers): 24px, 600 weight
- **Body**: 16px, 400 weight
- **Small** (meta): 13px, 500 weight

### Layout
- Max width: 600px
- Padding: 24px
- No cards, just white space + subtle borders

---

## Testing Checklist

- [ ] Register user → redirects to Today
- [ ] Create goal (goal count < 3)
- [ ] Create 4th goal → should fail
- [ ] Create task → appears in Inbox
- [ ] Set context → appears on Context screen
- [ ] Get recommendation → decision engine returns task
- [ ] Click "Start" → task status becomes "in_progress"
- [ ] Pause goal → not recommended anymore
- [ ] Mark task completed → appears in History

---

## Common Issues

**Port 3001 taken**:
```bash
# Windows: Find and kill process
netstat -ano | findstr :3001
taskkill /PID <PID> /F

# Or change PORT in backend .env
```

**PostgreSQL connection fails**:
```bash
# Check DATABASE_URL format:
# postgresql://[user]:[password]@[host]:[port]/[dbname]

# Or use local SQLite (not recommended for prod):
# Update .env: DATABASE_URL="file:./dev.db"
```

**Tokens not persisting**:
- Check browser localStorage is enabled
- Check browser console for errors
- Clear localStorage and retry login

**API returns 404**:
- Ensure backend running: `npm run dev` in backend folder
- Check NEXT_PUBLIC_API_URL in frontend .env.local

---

## What's NOT in v1

- Push notifications
- Time tracking (actual minutes)
- Recurring tasks
- Task dependencies
- Collaboration
- Mobile app
- Analytics

---

## Next Steps

1. **Complete remaining screens**:
   - InboxScreen (list all tasks with filters)
   - GoalsScreen (list all goals with lifecycle management)
   - HistoryScreen (show completed tasks)

2. **Polish**:
   - Add loading skeletons
   - Refine error messages
   - Add form validation feedback
   - Smooth transitions

3. **Testing**:
   - Unit tests for decision algorithm
   - E2E tests (Cypress)
   - Load testing on API

4. **Deployment**:
   - Set up CI/CD (GitHub Actions)
   - Deploy backend (Render, Railway, Heroku)
   - Deploy frontend (Vercel)

---

## Questions?

Refer to `DESIGN.md` for complete system documentation.
