# LifeOS Frontend

The UI for LifeOS: a decision-focused productivity system.

## Why this exists

Most productivity apps help you *capture* tasks. LifeOS helps you *choose* a next action.
The frontend is designed to reduce cognitive load:

- The Today view shows a single recommendation (with reasoning)
- The UX favors calm, editorial clarity over dashboards
- Error/empty states are written to be human and non-alarming

For the broader product philosophy and architecture, start at the repo root: `../README.md`.

## Run locally

Prereqs:

- Backend running at `NEXT_PUBLIC_API_URL` (e.g. `http://127.0.0.1:3001/api`)

```bash
cd frontend
npm install
cp .env.local.example .env.local
npm run dev
```

Open http://127.0.0.1:3000

## Deploy (Vercel)

Set `NEXT_PUBLIC_API_URL` in your Vercel project to your backend base URL **including** `/api`.

Examples:

- Local dev: `http://127.0.0.1:3001/api`
- Railway: `https://<your-railway-service>.up.railway.app/api`

Notes:

- The URL must not have a trailing slash (use `/api`, not `/api/`).
- If you change your Vercel domain/preview URL, the backend CORS allowlist must include the exact origin.

## 5-minute demo

See `../Documentation/DEMO_SCRIPT.md`.

## Troubleshooting

- If you see "Backend is offline": start the backend (`cd ../backend && npm run dev`).
- If requests fail: confirm `NEXT_PUBLIC_API_URL` points to the backend `/api` base.
