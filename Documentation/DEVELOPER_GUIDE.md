# LifeOS Developer Guide

A comprehensive guide for developers working on LifeOS.

---

## Quick Reference

### Start Development

```bash
# Terminal 1: Backend
cd backend
npm install
cp .env.example .env  # Add DATABASE_URL
npx prisma migrate deploy
npm run dev
# → http://127.0.0.1:3001

# Terminal 2: Frontend
cd frontend
npm install
npm run dev
# → http://127.0.0.1:3000
```

### Environment Variables

**Backend (.env)**:
```
DATABASE_URL="file:./dev.db"          # SQLite for dev, PostgreSQL for prod
JWT_SECRET="your-secret-key"
JWT_REFRESH_SECRET="your-refresh-secret"
PORT=3001
NODE_ENV=development
LOG_LEVEL=debug                       # debug | info | warn | error
```

**Frontend (.env.local)**:
```
NEXT_PUBLIC_API_URL=http://127.0.0.1:3001/api
```

For Vercel deployments, set `NEXT_PUBLIC_API_URL` in the Vercel project settings to your backend base URL (e.g. `https://<your-railway-service>.up.railway.app/api`).

- Must include `/api`
- Must not have a trailing slash (`/api`, not `/api/`)

---

## Structured Logging

Both backend and frontend use structured loggers for consistent, filterable output.

### Backend Logger

```typescript
import { logger } from './utils/logger';

// Levels: debug, info, warn, error
logger.debug('Detailed trace info', { userId: '123' });
logger.info('Server started', { port: 3001 });
logger.warn('Rate limit approaching', { remaining: 10 });
logger.error('Database query failed', error, { query: 'findUser' });

// Special contexts
logger.request('GET', '/api/goals', { userId: '123' });
logger.decision('Task selected', { inputs }, { result });
```

**Log Level Control**:
- Set `LOG_LEVEL=debug` in `.env` for verbose output
- Production defaults to `info` level

### Frontend Logger

```typescript
import { logger } from '@/lib/logger';

logger.debug('Component mounted', { props });
logger.info('User action', { action: 'clicked' });
logger.warn('Deprecated API usage');
logger.error('API call failed', error, { endpoint: '/goals' });

// Special contexts
logger.api('POST', '/goals', { status: 201 });
logger.auth('login_success', { userId: '123' });
logger.nav('/login', '/today');
```

**Behavior**:
- Debug/info logs hidden in production
- Warn/error logs always visible

---

## Failure Modes & Recovery

### Backend Failures

| Failure | Symptom | Recovery |
|---------|---------|----------|
| **Database connection** | 500 errors on all requests | Check `DATABASE_URL`, run `npx prisma migrate deploy` |
| **Missing JWT secrets** | Auth routes return 500 | Add `JWT_SECRET` and `JWT_REFRESH_SECRET` to `.env` |
| **Port in use** | "EADDRINUSE" on startup | Kill process on port 3001 or change `PORT` |
| **Prisma client stale** | Type errors after schema change | Run `npx prisma generate` |

### Frontend Failures

| Failure | Symptom | Recovery |
|---------|---------|----------|
| **Backend offline** | "Backend is offline" screen | Start backend on port 3001 |
| **API URL wrong** | Network errors in console | Check `NEXT_PUBLIC_API_URL` |
| **Stale build cache** | TypeScript errors that shouldn't exist | Delete `.next/` folder |
| **Token expired** | Redirected to login unexpectedly | Clear localStorage, re-login |

### Decision Engine Failures

| Failure | Symptom | Cause |
|---------|---------|-------|
| **No recommendation** | "No tasks available" | No active goals, no pending tasks, or time filter too restrictive |
| **Wrong task selected** | Unexpected recommendation | Check goal importance, task effort, available minutes |
| **Missing reasoning** | Empty reasoning text | Backend error in decision route |

---

## API Error Codes

The API returns structured errors with these codes:

### Authentication Errors
| Code | HTTP | Meaning |
|------|------|---------|
| `email_taken` | 400 | Email already registered |
| `invalid_credentials` | 401 | Wrong email or password |
| `unauthorized` | 401 | Missing or invalid token |
| `token_expired` | 401 | JWT expired (auto-refresh should handle) |

### Validation Errors
| Code | HTTP | Meaning |
|------|------|---------|
| `validation_error` | 400 | Input failed Zod schema |
| `max_active_goals_reached` | 400 | Already have 3 active goals |
| `invalid_status_transition` | 400 | Task status change not allowed |

### Resource Errors
| Code | HTTP | Meaning |
|------|------|---------|
| `not_found` | 404 | Goal/task doesn't exist |
| `forbidden` | 403 | Not owner of resource |

### Server Errors
| Code | HTTP | Meaning |
|------|------|---------|
| `internal_error` | 500 | Unexpected server error |
| `internal_server_error` | 500 | Generic fallback error |

---

## Common Development Issues

### "Cannot find module" errors
```bash
# Backend
cd backend && npm install && npx prisma generate

# Frontend
cd frontend && npm install
```

### "Access token expired" loop
```javascript
// Clear all auth state
localStorage.removeItem('accessToken');
localStorage.removeItem('refreshToken');
localStorage.removeItem('user');
// Then refresh page
```

### Database schema out of sync
```bash
cd backend
npx prisma migrate reset  # ⚠️ Deletes data
npx prisma migrate deploy
```

### TypeScript errors after file moves
```bash
# Frontend
rm -rf .next
npm run dev

# Backend (if using ts-node-dev)
# Restart the dev server
```

---

## Testing Checklist

### Manual Smoke Test
1. [ ] Register new user
2. [ ] Login with new user
3. [ ] Create a goal
4. [ ] Create a task linked to goal
5. [ ] Set daily context
6. [ ] View Today screen → see recommendation
7. [ ] Complete task → see next recommendation
8. [ ] Snooze task → see it in inbox as SNOOZED

### Decision Engine Test
1. [ ] No goals → "No active goals" message
2. [ ] No tasks → "No tasks available" message
3. [ ] Available time < all tasks → fallback or warning
4. [ ] Multiple goals → highest importance first
5. [ ] Same goal, multiple tasks → highest impact first

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                     Frontend (Next.js)                   │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────────┐ │
│  │ Today   │  │ Goals   │  │ Inbox   │  │ Context     │ │
│  │ Screen  │  │ Page    │  │ Page    │  │ Page        │ │
│  └────┬────┘  └────┬────┘  └────┬────┘  └──────┬──────┘ │
│       │            │            │               │        │
│  ┌────┴────────────┴────────────┴───────────────┴────┐  │
│  │                  API Client (api.ts)              │  │
│  │    • Error classification • Auto token refresh    │  │
│  └───────────────────────┬───────────────────────────┘  │
└──────────────────────────┼──────────────────────────────┘
                           │ HTTP (REST)
┌──────────────────────────┼──────────────────────────────┐
│                     Backend (Express)                    │
│  ┌───────────────────────┴───────────────────────────┐  │
│  │              Routes (auth, goals, tasks, etc.)    │  │
│  └───────────────────────┬───────────────────────────┘  │
│  ┌───────────────────────┴───────────────────────────┐  │
│  │          Middleware (auth, errorHandler)          │  │
│  └───────────────────────┬───────────────────────────┘  │
│  ┌───────────────────────┴───────────────────────────┐  │
│  │              Prisma ORM → SQLite/PostgreSQL       │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

---

## File Conventions

| Pattern | Location | Purpose |
|---------|----------|---------|
| `*.ts` | `/backend/src/` | Backend TypeScript |
| `*.tsx` | `/frontend/app/`, `/frontend/components/` | React components |
| `page.tsx` | `/frontend/app/**/` | Next.js route pages |
| `layout.tsx` | `/frontend/app/**/` | Next.js layouts |
| `api-types.ts` | `/frontend/lib/` | Shared API type definitions |
| `schema.prisma` | `/backend/prisma/` | Database schema |

---

## Contributing

1. **Branch naming**: `feature/description` or `fix/description`
2. **Commit messages**: Present tense, descriptive ("Add goal validation")
3. **Before PR**: Run `npm run build` in both frontend and backend
4. **Tests**: Add to manual checklist if new feature

---

## Resources

- [API Contract](./Documentation/API_CONTRACT_v1.0.0.md) - Full endpoint documentation
- [Decision Algorithm](./Documentation/ALGORITHM.md) - How task selection works
- [Design Philosophy](./Documentation/DESIGN.md) - Why things are built this way
