# LifeOS — 5‑Minute Demo Script

Goal: show that LifeOS is a *decision system*, not a task list.

## Setup (30s)

- Start backend: `cd backend && npm run dev`
- Start frontend: `cd frontend && npm run dev`
- Open: http://127.0.0.1:3000

If the UI shows “Backend is offline”, you can say:
- “The UI fails calmly and tells you exactly what to do: start the API server.”

## 0:00–0:45 — The problem

- “Most apps optimize for capture. The hard part is choosing what to do when you’re tired and the list is long.”
- “LifeOS makes that decision once, based on your goals, tasks, and current context.”

## 0:45–1:45 — Create a goal (Goals)

1. Go to **Goals**
2. Create goal: “Learn TypeScript” (Importance: High)

Narration:
- “Goals are the long‑term ‘why’. We intentionally cap active goals so focus doesn’t fragment.”

## 1:45–2:45 — Add tasks (Inbox)

1. Go to **Inbox**
2. Add task: “Read TypeScript handbook” (Effort: 60 min, Impact: Medium, link to goal)
3. Add task: “Refactor API client types” (Effort: 30 min, Impact: High, link to goal)

Narration:
- “Tasks are just candidates. The system will pick what fits the moment.”

## 2:45–3:30 — Set context (Context)

1. Go to **Context**
2. Set: Energy = MEDIUM, Available minutes = 45 (Stress optional)

Narration:
- “This is the key input most apps ignore: your capacity today.”

## 3:30–4:30 — Get the recommendation (Today)

1. Go to **Today**
2. Click **Compute** if needed
3. Point at the reasoning text

Narration:
- “Same context + same data = same recommendation. No hidden ML. You can audit why this is the next best task.”

## 4:30–5:00 — Close

- “LifeOS is designed to reduce cognitive load. It doesn’t ask you to be a perfect planner at execution time.”
- “Next steps are expanding the UI while keeping the same deterministic engine and calm UX.”

## Optional fallback paths

- If there are no tasks: show the empty state and explain the Quick Start.
- If the backend is down: show the offline screen and restart the backend live.
