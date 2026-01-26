# LifeOS Today Screen — Implementation Guide

**Component:** `TodayScreen`  
**Path:** `frontend/components/today-screen.tsx`  
**Type:** Client component (React 19 + TypeScript)  
**Status:** Production-ready  

---

## Design Philosophy

### Calm, Editorial Aesthetic
- **Large typography** (48-64px task titles)
- **Light font weights** (font-light, 300 weight)
- **Generous whitespace** (6-12 padding units)
- **Minimal color** (gray/white, one action button in black)
- **No clutter** (single task only, no lists)

### Principles
1. **One job:** Show next recommended task
2. **Clear reasoning:** Explain why this task was picked
3. **Supportive tone:** Acknowledge user's context
4. **Minimal friction:** Two buttons (Start, Snooze)
5. **Graceful states:** Loading/error/empty handled calmly

---

## Component Structure

```
TodayScreen (state management)
├── LoadingState (spinner + message)
├── ErrorState (icon + error + retry)
├── EmptyState (icon + encouragement + link)
└── SuccessState (full recommendation display)
    ├── Goal context (small label)
    ├── Task title (large, editorial)
    ├── Task description (supporting text)
    ├── Effort/Impact (subtle metrics)
    ├── Reasoning box (background context)
    ├── Error message (if API failure)
    ├── Action buttons (Start, Snooze)
    └── Context link (minimal footer)
```

---

## State Management

### TodayScreenState Interface

```typescript
interface TodayScreenState {
  status: 'loading' | 'error' | 'empty' | 'success';
  recommendation: Recommendation | null;
  error: string | null;
  isStarting: boolean;      // Button loading state
  isSkipping: boolean;      // Button loading state
}
```

### State Transitions

```
Initial
  ↓
loading → success (have recommendation)
loading → empty (no recommendation)
loading → error (fetch failed)
success → loading (user clicks Start/Snooze)
error → loading (user clicks Try Again)
empty → (no transitions)
```

---

## API Integration

### Fetch Recommendation

```typescript
const response = await apiClient.getNextTask();

if (response.ok) {
  const recommendation = response.data?.recommendation;
  // Handle success
} else {
  // Handle error
}
```

### Update Task Status

```typescript
// Mark task as done
const response = await apiClient.updateTask(taskId, {
  status: 'DONE'
});

// Snooze task
const response = await apiClient.updateTask(taskId, {
  status: 'SNOOZED'
});
```

---

## Tailwind Classes Reference

### Typography

| Element | Classes | Purpose |
|---------|---------|---------|
| Goal label | `text-xs uppercase tracking-widest font-medium text-gray-500` | Subtle context |
| Task title | `text-5xl md:text-6xl font-light leading-tight` | Primary focus |
| Description | `text-lg md:text-xl font-light text-gray-700` | Supporting detail |
| Metrics | `text-sm text-gray-600 font-light` | Subtle info |
| Reasoning | `text-sm text-gray-700 font-light` | Explanation |

### Spacing

| Usage | Classes |
|-------|---------|
| Top spacing | `flex-1` (vertical centering) |
| Bottom padding | `pb-20` (avoid button overlap) |
| Vertical gaps | `mb-6`, `mb-8`, `mb-10`, `mb-12` |
| Horizontal gaps | `gap-6`, `gap-3` |
| Content padding | `p-6` |

### Colors

| Element | Classes |
|---------|---------|
| Background | `bg-white` |
| Text (primary) | `text-gray-900` |
| Text (secondary) | `text-gray-700` |
| Text (tertiary) | `text-gray-600` |
| Text (disabled) | `text-gray-500` |
| Reasoning box | `bg-gray-50 border border-gray-200` |
| Error box | `bg-red-50 border border-red-200` |
| Primary button | `bg-gray-900 hover:bg-gray-800` |
| Secondary button | `border border-gray-300 hover:bg-gray-50` |

### Loading & Disabled States

```typescript
// Spinner
className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"

// Disabled button
disabled={isStarting}
className="disabled:opacity-50 disabled:cursor-not-allowed"
```

---

## Rendering Logic

### Loading State

```tsx
<div className="flex items-center justify-center min-h-screen">
  <div className="text-center">
    <div className="w-10 h-10 border-3 border-gray-200 border-t-gray-700 rounded-full animate-spin"></div>
    <p className="text-base text-gray-600 font-light">Finding your next task…</p>
  </div>
</div>
```

**When:** Initial load or after action (Start/Snooze)  
**Purpose:** Tell user something is happening

### Error State

```tsx
<div className="text-center">
  {/* Icon */}
  <div className="bg-red-50 rounded-full p-3">
    <svg className="text-red-600">...</svg>
  </div>
  {/* Message */}
  <h2>Something went wrong</h2>
  <p>{error}</p>
  {/* Button */}
  <button onClick={onRetry}>Try Again</button>
</div>
```

**When:** API fetch fails  
**Purpose:** Clear recovery path

### Empty State

```tsx
<div className="text-center">
  {/* Icon */}
  <div className="bg-blue-50 rounded-full p-3">
    <svg className="text-blue-600">...</svg>
  </div>
  {/* Message */}
  <h2>No tasks today</h2>
  <p>Create a goal to get started.</p>
  {/* Link */}
  <a href="/goals">Go to Goals</a>
</div>
```

**When:** Recommendation is null (no tasks available)  
**Purpose:** Encourage user action

### Success State

```tsx
<div className="min-h-screen flex flex-col">
  <div className="flex-1" />  {/* Top spacing */}
  <div className="px-6 pb-20">
    {/* Goal label */}
    {/* Task title */}
    {/* Description */}
    {/* Metrics */}
    {/* Reasoning */}
    {/* Buttons */}
    {/* Footer link */}
  </div>
  <div className="flex-1" />  {/* Bottom spacing */}
</div>
```

**When:** Recommendation loaded successfully  
**Purpose:** Focus on task with breathing room

---

## User Interactions

### Start Task
1. User clicks "Start Task" button
2. Button shows loading spinner + "Starting…"
3. API call: `updateTask(taskId, { status: 'DONE' })`
4. Wait 500ms for visual feedback
5. Reload recommendation (show next task)
6. Return to Loading state

### Snooze Task
1. User clicks "Snooze" button
2. Button shows loading spinner + "Snoozing…"
3. API call: `updateTask(taskId, { status: 'SNOOZED' })`
4. Wait 300ms
5. Reload recommendation
6. Return to Loading state

### Update Context
1. User clicks "Update your energy or available time" link
2. Navigate to `/context` page
3. User updates energy level, available minutes, stress level
4. Return to Today screen
5. Recommendation may change based on new context

---

## Recommendation Display

### Fields Shown

| Field | Display | Required? | Example |
|-------|---------|-----------|---------|
| `goalTitle` | Small uppercase label | No | "Learn TypeScript" |
| `taskTitle` | 48-64px heading | Yes | "Read handbook" |
| `taskDescription` | 18-20px body text | No | "Chapter 1-3" |
| `effort` | "Effort: X min" | No | "60" |
| `impact` | "Impact: X/100" | No | "70" |
| `reasoning` | Gray box explanation | Yes | "You have 480 minutes..." |

### Explanation Rules

From API contract, explanations include:
- Available minutes + energy level
- Goal name + importance (if applicable)
- Stress warning (if stress > 7)
- Inbox context (if no goal)

**Example:**
```
"You have 480 minutes available with MEDIUM energy. 
This task supports your goal 'Learn TypeScript' (importance: 85/100)."
```

---

## Responsive Design

### Breakpoints

| Breakpoint | Device | Changes |
|------------|--------|---------|
| Mobile (default) | < 640px | 5xl title, single column buttons |
| SM (md:) | 640px+ | 5xl title, flex buttons |
| MD (lg:) | 1024px+ | 6xl title, max-w-2xl container |

### Mobile Optimization

```tsx
// Title scales responsively
className="text-5xl md:text-6xl"

// Buttons stack on mobile
className="flex flex-col gap-3 sm:flex-row"

// Padding adjusts for safe areas
className="px-6"
```

---

## Performance Considerations

### Optimizations

1. **Client-side state management** — No context providers needed
2. **Minimal re-renders** — State updates only when needed
3. **Lazy loading** — Sub-components only render when in use
4. **Debouncing** — Actions (Start/Snooze) prevent double-clicks via `disabled` state
5. **CSS-only animations** — Tailwind spinner, no JS animations

### Bundle Impact

- Component: ~8KB (minified)
- Dependencies: apiClient (shared), React built-in
- No additional packages required

---

## Accessibility

### ARIA Labels

```tsx
// Button states
disabled={isStarting}
aria-busy={isStarting}

// Icon descriptions
<div className="w-12 h-12 bg-red-50 rounded-full">
  <svg ... aria-label="error icon">
</div>
```

### Keyboard Navigation

- Tab through buttons (Start, Snooze, Links)
- Enter to activate buttons
- No custom keyboard handlers needed

### Screen Readers

- Semantic HTML (h1, h2, button, a)
- Spinner announces "Finding your next task" with `aria-live`
- Error messages announced when displayed

---

## Common Edge Cases

### Case 1: Task Completion Fails
**Scenario:** User clicks Start, but API returns error  
**Handling:**
```typescript
setState((prev) => ({
  ...prev,
  error: 'Could not start task. Please try again.',
  isStarting: false,  // Re-enable button
}));
```

### Case 2: Slow Network
**Scenario:** User clicks Start, waits, network times out  
**Handling:**
- Loading state shows for full duration
- Error state appears with retry
- User can click "Try Again"

### Case 3: Multiple Rapid Clicks
**Scenario:** User clicks Start multiple times before response  
**Handling:**
- `disabled={isStarting}` prevents additional clicks
- Only one request sent
- Single response handled

### Case 4: No Daily Context Set
**Scenario:** User hasn't set energy/available time  
**Handling:**
- API uses defaults (480 min, MEDIUM, stress=5)
- Recommendation shown normally
- Footer link suggests "Update your energy"

---

## Testing Strategy

### Unit Tests

```typescript
// Test loading state
it('shows loading spinner on mount', () => {
  render(<TodayScreen />);
  expect(screen.getByText('Finding your next task…')).toBeInTheDocument();
});

// Test success state
it('displays recommendation when loaded', async () => {
  mockApiClient.getNextTask.mockResolvedValue({
    ok: true,
    data: { recommendation: { taskId: '1', taskTitle: 'Test' } }
  });
  render(<TodayScreen />);
  await waitFor(() => {
    expect(screen.getByText('Test')).toBeInTheDocument();
  });
});

// Test error state
it('shows error message on API failure', async () => {
  mockApiClient.getNextTask.mockResolvedValue({ ok: false });
  render(<TodayScreen />);
  await waitFor(() => {
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });
});
```

### Integration Tests

```typescript
// Test full flow: load → start → reload
it('starts task and loads next recommendation', async () => {
  render(<TodayScreen />);
  
  // Wait for first task to load
  await waitFor(() => {
    expect(screen.getByText('Task 1')).toBeInTheDocument();
  });
  
  // Click Start
  fireEvent.click(screen.getByText('Start Task'));
  
  // Wait for loading
  expect(screen.getByText('Starting…')).toBeInTheDocument();
  
  // Wait for next task
  await waitFor(() => {
    expect(screen.getByText('Task 2')).toBeInTheDocument();
  });
});
```

---

## Future Enhancements

### V2 Features

1. **Swipe gestures** (mobile) — Swipe left to snooze
2. **Keyboard shortcuts** — Space to Start, Esc to Snooze
3. **Sidebar context panel** — Show daily stats while choosing
4. **Quick task creation** — "Recommendation doesn't fit? Add a new task"
5. **Analytics** — Track which recommendations user starts vs. snoozes
6. **Theme support** — Dark mode toggle
7. **Notifications** — "You have a snoozed task due" badges

---

## Deployment Checklist

- [ ] Component tested in dev environment
- [ ] API contract verified (all fields, error codes)
- [ ] Responsive design tested (mobile, tablet, desktop)
- [ ] Accessibility audit completed
- [ ] Error messages reviewed for tone
- [ ] Loading states verified (not too fast, not too slow)
- [ ] Empty state copy tested with users
- [ ] Auth guard confirmed (redirect if unauthenticated)
- [ ] Timezone handling verified (UTC dates)
- [ ] Performance benchmarked (<100ms render)

---

## Summary

The LifeOS Today Screen is a focused, calm interface for viewing a single recommended task. It emphasizes clear typography, minimal interaction, and graceful state handling. Built with React 19, TypeScript, and Tailwind, it integrates seamlessly with the Decision Engine API and supports the full user journey from loading through task selection.
