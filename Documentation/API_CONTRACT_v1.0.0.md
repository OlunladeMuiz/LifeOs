# LifeOS API Contract v1.0.0
**Frozen Release Date:** January 10, 2026  
**Status:** STABLE - Breaking changes require major version bump  
**Base URL:** `http://localhost:3001/api` (dev) | `https://api.lifeos.io` (prod)  

---

## Table of Contents
1. [Global Conventions](#global-conventions)
2. [Authentication](#authentication)
3. [Auth Endpoints](#auth-endpoints)
4. [Goals Endpoints](#goals-endpoints)
5. [Tasks Endpoints](#tasks-endpoints)
6. [DailyContext Endpoints](#dailycontext-endpoints)
7. [Decision Engine Endpoint](#decision-engine-endpoint)
8. [Error Codes](#error-codes)
9. [Rate Limiting](#rate-limiting)

---

## Global Conventions

### Response Format
All responses use this envelope:

**Success (2xx):**
```json
{
  "ok": true,
  "data": { /* endpoint-specific payload */ }
}
```

**Error (4xx, 5xx):**
```json
{
  "ok": false,
  "error": "error_code_in_snake_case",
  "message": "Human-readable error message"
}
```

### Headers
```
Content-Type: application/json
Authorization: Bearer {accessToken}  // Required for all endpoints except /auth/register, /auth/login
```

### Date Format
- All dates: ISO 8601 (`2025-01-10T14:30:00Z`)
- All times: UTC
- DailyContext.date: Date only (`2025-01-10`, no time component)

### Pagination (Reserved for v2)
Currently not implemented. All list endpoints return full results.

---

## Authentication

### Token Management
- **Access Token:** JWT, expires 1 hour, used for all API calls
- **Refresh Token:** JWT, expires 7 days, used to get new access token
- **Token Storage:** localStorage (frontend), httpOnly cookie (optional)

### Auth Header Format
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 401 Handling
When access token expires, frontend should:
1. Catch 401 response
2. Send refresh token to `/auth/refresh`
3. Store new access token
4. Retry original request

---

## Auth Endpoints

### POST /auth/register
Create a new user account.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!!"
}
```

**Validation:**
- `email`: Valid email format, max 255 chars
- `password`: Min 8 chars, no max limit
- Email must be unique in system

**Response (201 Created):**
```json
{
  "ok": true,
  "data": {
    "user": {
      "id": "uuid-or-cuid-string",
      "email": "user@example.com"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Errors:**
| Code | Status | Message |
|------|--------|---------|
| `email_already_exists` | 400 | Email already registered |
| `validation_error` | 400 | Invalid request (bad format) |
| `internal_error` | 500 | Server error during signup |

---

### POST /auth/login
Authenticate user and return tokens.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!!"
}
```

**Validation:**
- Both fields required
- Email format validation

**Response (200 OK):**
```json
{
  "ok": true,
  "data": {
    "user": {
      "id": "uuid-or-cuid",
      "email": "user@example.com"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Errors:**
| Code | Status | Message |
|------|--------|---------|
| `invalid_credentials` | 401 | Invalid email or password |
| `validation_error` | 400 | Missing required fields |
| `internal_error` | 500 | Server error during login |

---

### POST /auth/refresh
Get a new access token using refresh token.

**Request:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (200 OK):**
```json
{
  "ok": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Errors:**
| Code | Status | Message |
|------|--------|---------|
| `missing_token` | 400 | Refresh token required |
| `invalid_token` | 401 | Invalid or expired refresh token |

**Note:** Refresh token is single-use. On successful refresh, frontend must immediately store new tokens.

---

## Goals Endpoints

### GET /goals
List all goals for authenticated user.

**Query Parameters:** None (v1)

**Authentication:** Required

**Response (200 OK):**
```json
{
  "ok": true,
  "data": {
    "goals": [
      {
        "id": "goal-uuid-1",
        "title": "Learn TypeScript",
        "description": "Master advanced TypeScript for work",
        "importance": 85,
        "status": "ACTIVE",
        "createdAt": "2025-01-05T10:00:00Z",
        "taskCount": 7
      },
      {
        "id": "goal-uuid-2",
        "title": "Fitness",
        "description": null,
        "importance": 60,
        "status": "INACTIVE",
        "createdAt": "2025-01-01T08:30:00Z",
        "taskCount": 3
      }
    ]
  }
}
```

**Errors:**
| Code | Status | Message |
|------|--------|---------|
| `internal_error` | 500 | Failed to fetch goals |

---

### POST /goals
Create a new goal.

**Request:**
```json
{
  "title": "Learn TypeScript",
  "description": "Master advanced TypeScript for work",
  "importance": 85
}
```

**Validation:**
- `title`: Required, min 1 char, max 255 chars, unique per user
- `description`: Optional, max 2000 chars
- `importance`: Required, min 1, max 100 (integer)

**Rules:**
- Max 3 ACTIVE goals per user (enforced)
- Goal status defaults to ACTIVE

**Response (201 Created):**
```json
{
  "ok": true,
  "data": {
    "id": "goal-uuid-new",
    "title": "Learn TypeScript",
    "description": "Master advanced TypeScript for work",
    "importance": 85,
    "status": "ACTIVE"
  }
}
```

**Errors:**
| Code | Status | Message |
|------|--------|---------|
| `max_active_goals_reached` | 400 | Maximum 3 active goals allowed |
| `duplicate_title` | 400 | Goal with this title already exists (per user) |
| `validation_error` | 400 | Invalid request |
| `internal_error` | 500 | Failed to create goal |

---

### PATCH /goals/{id}
Update a goal.

**Path Parameters:**
- `id` (string): Goal UUID

**Request:**
```json
{
  "title": "Master TypeScript",
  "importance": 90,
  "status": "INACTIVE"
}
```

**Validation:**
- All fields optional
- `title`: Must be unique per user if provided
- `importance`: Min 1, max 100
- `status`: Must be "ACTIVE" or "INACTIVE"

**Response (200 OK):**
```json
{
  "ok": true,
  "data": {
    "id": "goal-uuid",
    "title": "Master TypeScript",
    "importance": 90,
    "status": "INACTIVE"
  }
}
```

**Errors:**
| Code | Status | Message |
|------|--------|---------|
| `goal_not_found` | 404 | Goal not found |
| `not_owner` | 403 | Not authorized to update this goal |
| `duplicate_title` | 400 | Goal with this title already exists |
| `validation_error` | 400 | Invalid request |
| `internal_error` | 500 | Failed to update goal |

**Ownership Check:** Endpoint verifies req.userId matches goal.userId

---

### DELETE /goals/{id}
Delete a goal (soft delete via deletedAt).

**Path Parameters:**
- `id` (string): Goal UUID

**Authentication:** Required

**Response (204 No Content)**
```
(empty body)
```

**Errors:**
| Code | Status | Message |
|------|--------|---------|
| `goal_not_found` | 404 | Goal not found |
| `not_owner` | 403 | Not authorized to delete this goal |
| `internal_error` | 500 | Failed to delete goal |

**Note:** Deletion is soft (sets deletedAt). Associated tasks remain but goalId becomes null.

---

## Tasks Endpoints

### GET /tasks
List tasks for authenticated user with optional filtering.

**Query Parameters:**
- `status` (optional): Filter by status (PENDING, DONE, SNOOZED)
- `goalId` (optional): Filter by goal

**Example:** `GET /tasks?status=PENDING&goalId=goal-uuid`

**Authentication:** Required

**Response (200 OK):**
```json
{
  "ok": true,
  "data": {
    "tasks": [
      {
        "id": "task-uuid-1",
        "title": "Read TypeScript handbook",
        "description": "Chapter 1-3",
        "effort": 60,
        "impact": 70,
        "status": "PENDING",
        "goalId": "goal-uuid-1",
        "createdAt": "2025-01-08T14:00:00Z",
        "completedAt": null,
        "deletedAt": null
      },
      {
        "id": "task-uuid-2",
        "title": "Build todo app",
        "description": null,
        "effort": 180,
        "impact": 85,
        "status": "DONE",
        "goalId": "goal-uuid-1",
        "createdAt": "2025-01-05T09:00:00Z",
        "completedAt": "2025-01-08T16:30:00Z",
        "deletedAt": null
      }
    ]
  }
}
```

**Errors:**
| Code | Status | Message |
|------|--------|---------|
| `internal_error` | 500 | Failed to fetch tasks |

---

### POST /tasks
Create a new task.

**Request:**
```json
{
  "title": "Read TypeScript handbook",
  "description": "Chapter 1-3",
  "effort": 60,
  "impact": 70,
  "goalId": "goal-uuid-1"
}
```

**Validation:**
- `title`: Required, min 1 char, max 255 chars
- `description`: Optional, max 2000 chars
- `effort`: Required, min 1, max 480 (effort in minutes equivalent)
- `impact`: Required, min 1, max 100 (impact on goal progress)
- `goalId`: Optional UUID (null = inbox task)

**Defaults:**
- `status`: PENDING

**Response (201 Created):**
```json
{
  "ok": true,
  "data": {
    "id": "task-uuid-new",
    "title": "Read TypeScript handbook",
    "description": "Chapter 1-3",
    "effort": 60,
    "impact": 70,
    "status": "PENDING",
    "goalId": "goal-uuid-1",
    "createdAt": "2025-01-10T10:00:00Z",
    "completedAt": null,
    "deletedAt": null
  }
}
```

**Errors:**
| Code | Status | Message |
|------|--------|---------|
| `validation_error` | 400 | Invalid request |
| `goal_not_found` | 404 | Goal does not exist (if goalId provided) |
| `not_owner` | 403 | Not authorized for this goal |
| `internal_error` | 500 | Failed to create task |

---

### PATCH /tasks/{id}
Update a task.

**Path Parameters:**
- `id` (string): Task UUID

**Request:**
```json
{
  "title": "Read TypeScript handbook + exercises",
  "status": "DONE",
  "effort": 90,
  "impact": 75,
  "goalId": "goal-uuid-2"
}
```

**Validation:**
- All fields optional
- `title`: Max 255 chars
- `status`: One of: PENDING, DONE, SNOOZED
- `effort`: Min 1, max 480
- `impact`: Min 1, max 100
- `goalId`: Optional UUID or null (remove goal association)

**Status Transition Rules:**
```
PENDING  → DONE, SNOOZED
DONE     → (no transitions)
SNOOZED  → PENDING
```

**Automatic Fields:**
- If `status` changes to `DONE`: Set `completedAt` to current timestamp
- If `status` changes from `DONE` to anything: Clear `completedAt` (null)

**Response (200 OK):**
```json
{
  "ok": true,
  "data": {
    "id": "task-uuid",
    "title": "Read TypeScript handbook + exercises",
    "effort": 90,
    "impact": 75,
    "status": "DONE",
    "goalId": "goal-uuid-2",
    "completedAt": "2025-01-10T14:30:00Z"
  }
}
```

**Errors:**
| Code | Status | Message |
|------|--------|---------|
| `task_not_found` | 404 | Task not found |
| `not_owner` | 403 | Not authorized to update this task |
| `invalid_status_transition` | 400 | Cannot transition from {current} to {requested} |
| `goal_not_found` | 404 | Goal does not exist (if goalId provided) |
| `validation_error` | 400 | Invalid request |
| `internal_error` | 500 | Failed to update task |

**Ownership Check:** Endpoint verifies req.userId matches task.userId

---

### DELETE /tasks/{id}
Delete a task (soft delete via deletedAt).

**Path Parameters:**
- `id` (string): Task UUID

**Authentication:** Required

**Response (204 No Content)**
```
(empty body)
```

**Errors:**
| Code | Status | Message |
|------|--------|---------|
| `task_not_found` | 404 | Task not found |
| `not_owner` | 403 | Not authorized to delete this task |
| `internal_error` | 500 | Failed to delete task |

---

## DailyContext Endpoints

### GET /context/today
Get today's daily context (energy, available time, stress).

**Authentication:** Required

**Response (200 OK):**
```json
{
  "ok": true,
  "data": {
    "date": "2025-01-10",
    "energyLevel": "MEDIUM",
    "availableMinutes": 480,
    "stressLevel": 5
  }
}
```

**Default Response (if no context set):**
```json
{
  "ok": true,
  "data": {
    "date": "2025-01-10",
    "energyLevel": null,
    "availableMinutes": null,
    "stressLevel": null
  }
}
```

**Errors:**
| Code | Status | Message |
|------|--------|---------|
| `internal_error` | 500 | Failed to fetch context |

---

### POST /context
Create or update today's daily context.

**Request:**
```json
{
  "date": "2025-01-10",
  "energyLevel": "MEDIUM",
  "availableMinutes": 480,
  "stressLevel": 5
}
```

**Validation:**
- `date`: Required, ISO format or YYYY-MM-DD
- `energyLevel`: Required, must be one of: LOW, MEDIUM, HIGH
- `availableMinutes`: Required, min 0, max 1440 (24 hours)
- `stressLevel`: Optional, min 0, max 10

**Rules:**
- One context per user per day (upsert)
- `stressLevel` defaults to 5 if not provided

**Response (201 Created / 200 OK):**
```json
{
  "ok": true,
  "data": {
    "date": "2025-01-10",
    "energyLevel": "MEDIUM",
    "availableMinutes": 480,
    "stressLevel": 5
  }
}
```

**Errors:**
| Code | Status | Message |
|------|--------|---------|
| `validation_error` | 400 | Invalid request |
| `invalid_energy_level` | 400 | Must be one of: LOW, MEDIUM, HIGH |
| `invalid_time_range` | 400 | availableMinutes must be 0-1440 |
| `internal_error` | 500 | Failed to save context |

---

## Decision Engine Endpoint

### GET /decision/next
Get the next recommended task based on daily context and priorities.

**Authentication:** Required

**Query Parameters:** None

**Response (200 OK):**
```json
{
  "ok": true,
  "data": {
    "recommendation": {
      "taskId": "task-uuid-123",
      "taskTitle": "Read TypeScript handbook",
      "taskDescription": "Chapter 1-3",
      "goalTitle": "Learn TypeScript",
      "effort": 60,
      "impact": 70,
      "reasoning": "You have 480 minutes available with MEDIUM energy. This task supports your goal 'Learn TypeScript' (importance: 85/100)."
    }
  }
}
```

**Empty Recommendation (graceful):**
```json
{
  "ok": true,
  "data": {
    "recommendation": null,
    "message": "No tasks available. Add tasks to get recommendations."
  }
}
```

**Algorithm:**
1. Load today's DailyContext (or use defaults: 480 min, MEDIUM energy, stress=5)
2. Load all ACTIVE goals ordered by importance DESC
3. For each goal: find PENDING tasks where effort ≤ availableMinutes
4. Return first match (highest effort within constraints)
5. If no goal tasks: check inbox tasks (goalId=null, PENDING)
6. If no tasks found: return null with helpful message

**Explanation Rules:**
- Always include: available minutes + energy level
- If associated with goal: include goal name + importance
- If stress > 7: Add warning: "Stress is high, consider a lighter task."
- If no goal: "This inbox task fits your schedule."

**Errors:**
| Code | Status | Message |
|------|--------|---------|
| `internal_error` | 500 | Failed to generate recommendation |

**Notes:**
- Request does NOT accept any query parameters
- Response is deterministic given same context + tasks
- Frontend should call this when user opens app or clicks "Get recommendation"
- Recommendation is advisory; user can pick any PENDING task

---

## Error Codes

### Standard HTTP Status Codes

| Status | Usage |
|--------|-------|
| 200 | Successful GET, PATCH, POST (idempotent) |
| 201 | Resource created (POST) |
| 204 | Successful DELETE or empty response |
| 400 | Bad request (validation, duplicate, invalid transition) |
| 401 | Unauthorized (missing/invalid token) |
| 403 | Forbidden (not owner/resource not authorized) |
| 404 | Resource not found |
| 500 | Server error |

### Error Code Reference

| Code | Status | Context |
|------|--------|---------|
| `email_already_exists` | 400 | Register: email taken |
| `invalid_credentials` | 401 | Login: wrong password or email |
| `missing_token` | 400 | Refresh: no token provided |
| `invalid_token` | 401 | Refresh: expired or malformed |
| `validation_error` | 400 | Request body fails schema |
| `not_owner` | 403 | User doesn't own resource |
| `goal_not_found` | 404 | Goal UUID doesn't exist |
| `task_not_found` | 404 | Task UUID doesn't exist |
| `max_active_goals_reached` | 400 | User has 3+ ACTIVE goals |
| `duplicate_title` | 400 | Goal/task title already exists for user |
| `invalid_status_transition` | 400 | Task status change not allowed |
| `invalid_energy_level` | 400 | energyLevel not LOW/MEDIUM/HIGH |
| `invalid_time_range` | 400 | availableMinutes out of range |
| `internal_error` | 500 | Server error (log & report) |

---

## Rate Limiting

**Current Policy:** None enforced in v1.0

**Recommended for v1.1:**
- 100 requests/minute per user
- 10 decision/next calls/minute per user
- Header: `X-RateLimit-Remaining`, `X-RateLimit-Reset`

---

## Backwards Compatibility Policy

**Version:** 1.0.0 (released 2025-01-10)

**Breaking Changes Require:**
- Major version bump (2.0.0)
- 30-day deprecation notice
- Migration guide for all endpoints affected

**Safe Changes (no version bump):**
- Adding new optional fields to response
- Adding new optional query parameters
- Deprecating fields (with warning period)

**Frozen Fields (cannot change meaning):**
- `taskId`, `taskTitle`, `effort`, `impact`, `status` (task fields)
- `goalTitle`, `importance`, `status` (goal fields)
- `energyLevel`, `availableMinutes` (context fields)
- All error codes

---

## Example Integration Flow

### 1. Register
```bash
POST /auth/register
{
  "email": "newuser@example.com",
  "password": "SecurePass123!!"
}
→ 201 {user, accessToken, refreshToken}
```

### 2. Create Goal
```bash
POST /goals
Authorization: Bearer {accessToken}
{
  "title": "Learn TypeScript",
  "importance": 85
}
→ 201 {goal}
```

### 3. Create Tasks
```bash
POST /tasks
Authorization: Bearer {accessToken}
{
  "title": "Read handbook",
  "effort": 60,
  "impact": 70,
  "goalId": "{goal.id}"
}
→ 201 {task}
```

### 4. Set Daily Context
```bash
POST /context
Authorization: Bearer {accessToken}
{
  "date": "2025-01-10",
  "energyLevel": "MEDIUM",
  "availableMinutes": 480,
  "stressLevel": 5
}
→ 201 {context}
```

### 5. Get Recommendation
```bash
GET /decision/next
Authorization: Bearer {accessToken}
→ 200 {recommendation}
```

---

## Support & Contact

**For API issues:** dev-support@lifeos.io  
**For bug reports:** github.com/lifeos/api/issues  
**For feature requests:** features@lifeos.io  

---

**Contract Frozen:** January 10, 2026  
**Next Review:** April 10, 2026  
**Maintainer:** Backend Team
