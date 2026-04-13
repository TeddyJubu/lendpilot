# LoanPilot — Project Status

> Last updated: 2026-04-13
> Active plan: **2-Day MVP Sprint** (see `MVP_PLAN.md`)
> Current block: **Not started** — Block 1 (Scaffolding + Schema) is next

## Quick Summary

The project has comprehensive planning docs (~100KB) and a partially built Cloudflare Workers intelligence layer (~3,100 lines). The Convex backend and Next.js frontend have not been started. The original 34-week/13-phase plan has been replaced with a **2-day MVP sprint** focusing on the core CRM loop: auth, contacts, loans pipeline, document tracking, and rule-based feed.

---

## 2-Day MVP Progress

### Day 1: Foundation + Backend

| Block | Name | Status | Tests |
|-------|------|--------|-------|
| 1 | Scaffolding + Schema | Not Started | — |
| 2 | Core Organ + Auth | Not Started | 0 tests |
| 3 | Contacts Organ | Not Started | 0 tests |
| 4 | Loans + State Machine | Not Started | 0 tests |

### Day 2: Frontend + Feed + Polish

| Block | Name | Status | Tests |
|-------|------|--------|-------|
| 5 | App Shell + Contacts UI | Not Started | manual |
| 6 | Pipeline Kanban UI | Not Started | manual |
| 7 | Documents + Feed + Today | Not Started | 0 tests |
| 8 | Polish + Final Verification | Not Started | full suite |

### What's IN the MVP
Auth (Clerk), Contacts CRUD, Loans CRUD, Pipeline Kanban, Document Tracking, Activity Logging, Today Feed (rule-based), App Shell, Command Bar (navigation only)

### What's OUT (Post-MVP)
Cloudflare sync, AI copilot, Lead/health scoring, Email/SMS sending, File upload, Rate display, LOS integration, Billing, Teams, Onboarding flow, Dark mode, Relationship map

---

## Pre-Existing Code

### Cloudflare Workers — `mortgage-data-engine/` (standalone, no changes in MVP)

| Component | Status |
|-----------|--------|
| Wholesale rate crawler | Built (241 lines) |
| Retail rate crawler | Built (206 lines) |
| DPA program crawler | Built (338 lines) |
| Regulatory update crawler | Built (359 lines) |
| Lead enrichment | Built (384 lines) |
| Hono API (15 endpoints) | Built (472 lines) |
| D1 schema + seed data | Built (186 lines) |
| Tests | None — deferred to post-MVP |

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
2. **Zero tests** — CLAUDE.md mandates tests for every tissue; none exist for the ~3,100 lines of Worker code
3. **No Convex→Worker sync** — Crawlers write to D1 but nothing syncs data back to Convex (the designated source of truth for the frontend)
4. **Missing npm scripts** — No `test`, `lint`, or `type-check` scripts in `mortgage-data-engine/package.json`

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
