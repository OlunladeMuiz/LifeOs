# Decision Engine — Complete Algorithm Specification

## Overview

The Decision Engine is the **core of LifeOS**. It recommends ONE task based on:
1. **Today's context** (energy, available time, obstacles)
2. **Active goals** (max 3, ordered by priority)
3. **Available tasks** (inbox + ready status)

Input: User ID + today's date  
Output: Single task recommendation + human-readable explanation

---

## Algorithm (Pseudocode)

```
FUNCTION getNextTask(userId):
  // Step 1: Get today's context
  context = loadContext(userId, today)
  energyLevel = context?.energyLevel || "medium"
  availableMinutes = context?.availableMinutes || 480  // 8 hours default
  obstacles = context?.obstacles

  // Step 2: Get all active goals, sorted by priority DESC
  goals = loadGoals(userId, status="active")
  sortBy(goals, priority DESC)

  // Step 3: If no goals, check standalone inbox tasks
  IF goals.length == 0:
    inboxTask = loadFirstTask(userId, goalId=NULL, status=["inbox", "ready"])
    IF inboxTask EXISTS:
      RETURN recommend(inboxTask, reasoning="No active goals. This inbox task fits your schedule.")
    ELSE:
      RETURN null with message "No tasks available. Create a goal or add a task."

  // Step 4: For each goal (in priority order), find first matching task
  FOR EACH goal IN goals:
    tasks = loadTasks(userId, goalId=goal.id, status=["inbox", "ready"])
    sortBy(tasks, priority DESC)
    
    FOR EACH task IN tasks:
      estimatedMinutes = task.estimatedMinutes || 30
      
      // Check if task fits in available time
      IF estimatedMinutes <= availableMinutes:
        reasoning = buildReasoning(context, goal, task, energyLevel)
        RETURN recommend(task, reasoning)
    END FOR
  END FOR

  // Step 5: No task in goals, check standalone inbox
  inboxTask = loadFirstTask(userId, goalId=NULL, status=["inbox", "ready"])
  IF inboxTask EXISTS:
    reasoning = "No tasks in active goals fit your schedule. This inbox item fits your available time."
    RETURN recommend(inboxTask, reasoning)

  // Step 6: No task found at all
  RETURN null with message "No tasks available. Add tasks to get recommendations."
END FUNCTION
```

---

## Step-by-Step Walkthrough

### Step 1: Load Today's Context

**Input**: `userId`, today's date (at midnight)

**Query**:
```sql
SELECT * FROM daily_context
WHERE userId = ? AND date = TODAY
```

**Fallback Values**:
```typescript
{
  energyLevel: context?.energyLevel || "medium",
  availableMinutes: context?.availableMinutes || 480,  // 8 hours
  obstacles: context?.obstacles || null
}
```

**Why**: If user hasn't set context, assume average 8-hour day and medium energy.

---

### Step 2: Load Active Goals (Sorted by Priority)

**Input**: `userId`

**Query**:
```sql
SELECT * FROM goals
WHERE userId = ? AND status = 'active'
ORDER BY priority DESC
```

**Result**: Array of goals, highest-priority first

**Example**:
```
Goal 1: "Learn TypeScript" (priority 85)
Goal 2: "Build portfolio" (priority 70)
Goal 3: "Health routine" (priority 50)
```

---

### Step 3: Handle Zero Goals

If no active goals exist, fall back to standalone inbox tasks (tasks with `goalId = NULL`).

**Why**: Users can collect tasks before organizing into goals.

---

### Step 4: For Each Goal, Find First Matching Task

**For Goal 1 (TypeScript, priority 85)**:

```sql
SELECT * FROM tasks
WHERE userId = ? AND goalId = ? AND status IN ('inbox', 'ready')
ORDER BY priority DESC
```

**Example tasks**:
```
Task A: "Read handbook" (45 min, priority 80) ✓ MATCHES
Task B: "Build project" (120 min, priority 60) ✗ TOO LONG
Task C: "Review notes" (20 min, priority 40) ✓ WOULD MATCH BUT A HAS HIGHER PRIORITY
```

**Match Criteria**:
```
task.estimatedMinutes <= availableMinutes
```

- If `task.estimatedMinutes` is NULL, assume 30 min
- If task fits, RETURN it with explanation
- If task doesn't fit, check next task in same goal
- If no tasks match in this goal, try next goal (by priority)

---

### Step 5: Fallback to Standalone Inbox

If no task found in any active goal, check inbox tasks not tied to goals:

```sql
SELECT * FROM tasks
WHERE userId = ? AND goalId IS NULL AND status IN ('inbox', 'ready')
ORDER BY priority DESC
LIMIT 1
```

---

### Step 6: Return Null if No Match

If nothing found, return `null` with helpful message:
```
"No tasks available. Create a goal and add tasks to get recommendations."
```

---

## Reasoning Generation

**Input**: Context, selected goal, selected task

**Template**:
```
"You have {availableMinutes} minutes available with {energyLevel} energy. 
This task supports your goal '{goalTitle}' (priority: {goalPriority}/100).
It's estimated at {estimatedMinutes} minutes, leaving buffer time.
{obstaclesNote}"
```

**Example Reasoning**:
```
"You have 120 minutes available with high energy. This task supports 
your highest priority goal (TypeScript at 85/100). It's estimated at 
45 minutes, leaving buffer time. Note: Back-to-back meetings until 3pm."
```

---

## Edge Cases & Handling

### Case 1: No Context Set
```
Default: 480 min (8 hours), medium energy, no obstacles
→ Normal recommendation flow
```

### Case 2: Available Time Very Low
```
availableMinutes = 15
→ Only recommend tasks with estimatedMinutes <= 15
→ If none exist, return null with: "Not enough time for any tasks today."
```

### Case 3: All Goals Have No Tasks
```
→ Fall back to standalone inbox
→ If inbox empty, return null: "No tasks available."
```

### Case 4: All Goal Tasks Too Long
```
Goal 1 tasks: [60 min, 90 min, 120 min]
availableMinutes = 45
→ Skip to Goal 2
→ If all goals skipped, fall back to inbox
```

### Case 5: Goal Paused/Completed
```
status != 'active'
→ Not included in query
→ Tasks in paused goals never recommended
```

### Case 6: Task Status is "completed" or "skipped"
```
status IN ('completed', 'skipped')
→ Excluded from query (not in ['inbox', 'ready'])
→ Never recommended again
```

---

## Database Optimizations

### Query Plan

**Load context** (indexed by user_id, date):
```sql
CREATE INDEX idx_daily_context_user_date ON daily_context(userId, date);
```

**Load goals** (indexed by user_id, status):
```sql
CREATE INDEX idx_goals_user_status ON goals(userId, status);
```

**Load tasks** (indexed by user_id, goal_id, status):
```sql
CREATE INDEX idx_tasks_user_goal_status ON tasks(userId, goalId, status);
```

**Expected Query Time**: < 50ms (even with 10k tasks)

---

## Algorithm Invariants

**These are always true after running the algorithm**:

1. ✅ Recommended task's `status` is one of: `inbox`, `ready`
2. ✅ Recommended task's `userId` matches request user
3. ✅ Recommended task's `estimatedMinutes` (or default 30) ≤ available time
4. ✅ If task has a `goalId`, that goal's `status` is `active`
5. ✅ If multiple tasks match, the one from highest-priority goal is returned
6. ✅ Within a goal, the highest-priority task is returned

**NOT guaranteed**:
- Task's priority within goal (we just return first match)
- Task's creation date (order doesn't matter if all fit)

---

## Example Walkthrough

### Scenario

**User Context**:
```
energyLevel: "high"
availableMinutes: 120
obstacles: "Meetings until 3pm"
```

**Active Goals**:
```
Goal A: "Learn TypeScript" (priority 85)
  └─ Task 1: "Read handbook" (40 min, priority 80) → status: inbox
  └─ Task 2: "Build project" (180 min, priority 90) → status: inbox
  └─ Task 3: "Review notes" (15 min, priority 50) → status: completed [SKIPPED]

Goal B: "Build portfolio" (priority 70)
  └─ Task 4: "Update GitHub" (30 min, priority 60) → status: inbox

Goal C: "Health" (priority 50)
  └─ Task 5: "Morning run" (45 min, priority 100) → status: inbox
```

### Execution

1. **Load context**: 120 min available, high energy ✓
2. **Load goals**: [Goal A (85), Goal B (70), Goal C (50)] ✓
3. **Check Goal A**:
   - Task 1: 40 min ≤ 120 min? YES → **RETURN Task 1**

### Output

```json
{
  "recommendation": {
    "taskId": "task-1-uuid",
    "taskTitle": "Read handbook",
    "taskDescription": null,
    "goalTitle": "Learn TypeScript",
    "estimatedMinutes": 40,
    "reasoning": "You have 120 minutes available with high energy. This task supports your highest priority goal (TypeScript at 85/100). It's estimated at 40 minutes, leaving buffer time. Note: Meetings until 3pm."
  }
}
```

**Why this task?**
- Goal A has highest priority (85)
- Task 1 is first task in Goal A that fits time (40 ≤ 120)
- Task 2 is skipped (180 > 120)
- Task 3 is skipped (status = completed)

---

## Testing the Algorithm

### Test Case 1: Normal Flow
- Setup: 1 active goal, 1 task that fits
- Expected: Task recommended ✓

### Test Case 2: Multiple Goals
- Setup: 3 active goals, highest has fitting task, lower have no fitting tasks
- Expected: Task from highest-priority goal ✓

### Test Case 3: No Fitting Tasks
- Setup: All tasks exceed available time
- Expected: Null + message ✓

### Test Case 4: No Goals
- Setup: 0 active goals, 1 inbox task
- Expected: Inbox task recommended ✓

### Test Case 5: No Tasks
- Setup: 1 active goal, 0 tasks
- Expected: Null + message ✓

### Test Case 6: Custom Estimated Time
- Setup: Task with estimatedMinutes = 200, available = 150
- Expected: Task filtered out ✓

### Test Case 7: No Estimated Time
- Setup: Task with estimatedMinutes = NULL, available = 100
- Expected: Assume 30 min, recommend ✓

---

## Performance Characteristics

| Operation | Complexity | Time |
|-----------|-----------|------|
| Load context | O(1) | ~5ms |
| Load goals | O(1) per goal * 3 | ~10ms |
| Load tasks per goal | O(N) tasks | ~15ms per goal |
| Total | O(N tasks) | < 50ms |

**N** = number of tasks per user (typically 20-100)

---

## Future Enhancements

1. **Energy Level Matching**: Prefer tasks aligned with current energy
   ```
   lowEnergy → prefer short (<30 min) tasks
   highEnergy → allow longer tasks
   ```

2. **Time Slot Optimization**: Return estimate of when to start
   ```
   "Start this now if you have 40 minutes before meetings"
   ```

3. **Task Dependencies**: Don't recommend task B if task A incomplete
   ```
   Task A → Task B → Task C
   ```

4. **Recency Bias**: Weight recent tasks higher
   ```
   Started yesterday? Recommend continuing
   ```

5. **Success Prediction**: ML-based (high variance, avoid for v1)

---

**END OF ALGORITHM SPECIFICATION**
