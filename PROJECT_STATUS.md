# LoanPilot — Project Status

> Last updated: 2026-04-22
> Active plan: **2-Day MVP Sprint** (see `MVP_PLAN.md`)
> Current block: **Block 8 COMPLETE** + data-engine sync layer landed

## Quick Summary

The MVP is built. 8 blocks completed autonomously with a validator agent approving each one. 83 tests pass, TypeScript compiles clean, all anti-pattern checks pass. The app has: Clerk auth, contacts CRUD with search/filter, loans pipeline kanban with state machine enforcement, document tracking, rule-based feed generation (4 rules), and a Today action view.

---

## 2-Day MVP Progress

### Day 1: Foundation + Backend

| Block | Name | Status | Tests |
|-------|------|--------|-------|
| 1 | Scaffolding + Schema | COMPLETE | 24 (state machine) |
| 2 | Core Organ + Auth | COMPLETE | +10 (validators, helpers) |
| 3 | Contacts Organ | COMPLETE | +17 (validators, helpers) |
| 4 | Loans + State Machine | COMPLETE | +20 (validators, helpers, stage groups) |

### Day 2: Frontend + Feed + Polish

| Block | Name | Status | Tests |
|-------|------|--------|-------|
| 5 | App Shell + Contacts UI | COMPLETE | manual verification |
| 6 | Pipeline Kanban UI | COMPLETE | manual verification |
| 7 | Documents + Feed + Today | COMPLETE | +12 (feed rules) |
| 8 | Polish + Final Verification | COMPLETE | 83 total, all pass |

### What's IN the MVP
Auth (Clerk), Contacts CRUD, Loans CRUD, Pipeline Kanban, Document Tracking, Activity Logging, Today Feed (rule-based), App Shell, Command Bar (navigation only)

### What's OUT (Post-MVP)
Cloudflare sync, AI copilot, Lead/health scoring, Email/SMS sending, File upload, Rate display, LOS integration, Billing, Teams, Onboarding flow, Dark mode, Relationship map

---

## Pre-Existing Code

### Cloudflare Workers — `mortgage-data-engine/`

| Component | Status |
|-----------|--------|
| Wholesale rate crawler | Built + Convex sync wired |
| Retail rate crawler | Built + Convex sync wired |
| DPA program crawler | Built (D1-only, surfaced via Hono) |
| Regulatory update crawler | Built (D1-only, surfaced via Hono) |
| Lead enrichment | Built + Convex sync (when caller passes IDs) |
| Convex sync layer | `src/sync/convex-sync.ts` — batching, retry, auth |
| Hono API (15 endpoints) | Built (472 lines) |
| D1 schema + seed data | Built (186 lines) |
| Tests | **35 passing** (helpers, sync, browser-scraper) |
| `type-check` + `test` npm scripts | Added |

---

## What Exists Today

### Documentation (Complete)

| File | Size | Purpose |
|------|------|---------|
| `CLAUDE.md` | 30KB | Architecture, organ-tissue pattern, schema, rules |
| `IMPLEMENTATION.md` | 33KB | Tissue lifecycle, AI comment standard, process |
| `DESIGN_SYSTEM.md` | 37KB | Color tokens, typography, component specs |
| `docs/PRD.md` | 5KB | Product requirements |

### Cloudflare Workers — `mortgage-data-engine/` (~3,100 lines)

**Entry point:** `src/index.ts` — Hono router + cron dispatch + webhook handler

**Crawlers (5 implemented):**
- `src/crawlers/wholesale-rates.ts` — 4-hourly wholesale rate scraping (241 lines)
- `src/crawlers/retail-rates.ts` — Daily retail competitor rates (206 lines)
- `src/crawlers/dpa-programs.ts` — Weekly DPA program discovery (338 lines)
- `src/crawlers/regulatory-updates.ts` — Daily regulatory monitoring (359 lines)
- `src/crawlers/lead-enrichment.ts` — On-demand property + person enrichment (384 lines)

**API:** `src/api/routes.ts` — 15+ Hono endpoints for rates, enrichment, DPA, jobs (472 lines)

**Database:** `src/db/schema.sql` — D1 schema with 7 tables, proper indexes, seed data for 20 lenders

**Infrastructure:**
- `src/db/queries.ts` — D1 query helpers (328 lines)
- `src/utils/browser-scraper.ts` — Cloudflare Browser Rendering wrapper (257 lines)
- `src/utils/helpers.ts` — Validation (rate, FICO, APR), address normalization (73 lines)
- `src/types/index.ts` — TypeScript interfaces (200 lines)
- `wrangler.toml` — Cron triggers, D1/R2/KV/AI/Browser bindings

**Dependencies:** hono 4.4.0, @cloudflare/puppeteer 0.0.14, wrangler 3.60.0, TypeScript 5.5.0

### What Does NOT Exist

- `apps/web/` — No Next.js app scaffolded
- `convex/` — No Convex backend (0 of 8 planned organs)
- `src/` — No frontend components
- `__tests__/` — Zero test files anywhere
- `.github/workflows/` — No CI/CD
- `.eslintrc.*` / `.prettierrc` — No linting
- `services/` — Worker is at root, not under `services/` as documented

---

## Structural Issues

1. **Monorepo mismatch** — Docs specify `apps/web/` + `services/mortgage-data-engine/` but actual structure is flat with `mortgage-data-engine/` at root
2. ~~Zero tests~~ — Worker now has 35 Vitest tests (helpers, sync, scraper). Full crawler integration tests still deferred.
3. ~~No Convex→Worker sync~~ — Sync layer landed (`src/sync/convex-sync.ts`); rates + enrichment crawlers push to Convex HTTP actions after each run
4. ~~Missing npm scripts~~ — `test`, `test:watch`, `type-check` added to worker `package.json`
5. **D1 + KV still placeholders** — `wrangler.toml` has `YOUR_D1_DATABASE_ID` / `YOUR_KV_NAMESPACE_ID`; blocks deploy until real IDs set
6. **Secrets not set** — `CONVEX_INGESTION_SECRET`, `CONVEX_URL`, `ADMIN_API_KEY`, `BROKER_WEBHOOK_SECRET` all need `wrangler secret put` before first deploy

---

## Git History

```
8e4ae2d  Add implementation guide and update architecture for monorepo
5842065  Initial commit local
9c7ca15  Add comprehensive design system guide for LoanPilot
6dc3af2  Initial commit
```

4 total commits. All documentation and Worker scaffolding. Branch: `main`.

---

## Immediate Next Step

**Start Block 1 of MVP_PLAN.md** — scaffold `apps/web/` with Next.js 15 + Convex, deploy all 8 organ schemas, install shadcn + Clerk. See `MVP_PLAN.md` for full task breakdown.
