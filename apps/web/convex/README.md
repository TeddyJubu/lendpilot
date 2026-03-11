Convex backend lives here (co-located with the Next.js app).

## Status
Baseline Convex scaffold is in place for Phase 0.1 / Milestone 0 tooling.

## Local dev
From repo root:
- `pnpm convex:dev` (runs `convex dev` within `apps/web`)

This will prompt for GitHub login + project creation the first time, and writes
`CONVEX_DEPLOYMENT` + `NEXT_PUBLIC_CONVEX_URL` to `apps/web/.env.local`.
