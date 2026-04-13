# LoanPilot — Project Status

> Last updated: 2026-04-13
> Current phase: **Pre-Phase 0 (Planning + Intelligence Layer Scaffolding)**

## Quick Summary

The project has comprehensive planning documentation (~100KB across 4 files) and a partially implemented Cloudflare Workers intelligence layer. The Convex backend and Next.js frontend have not been started. Zero tests exist.

---

## Phase Completion Matrix

### Chapter 1: Foundation

| Phase | Name | Status | Notes |
|-------|------|--------|-------|
| 0.1 | Project Scaffolding | Not Started | No monorepo, no Next.js, no Convex init |
| 0.2 | Design System Base | Not Started | Tokens defined in DESIGN_SYSTEM.md, not in code |
| 0.3 | App Shell + Auth | Not Started | No Clerk, no users table, no shell |

### Chapter 2: Core CRM

| Phase | Name | Status | Notes |
|-------|------|--------|-------|
| 1 | Contacts Organ | Not Started | Schema designed in CLAUDE.md only |
| 2 | Loans + Pipeline | Not Started | State machine designed, not coded |
| 3 | Documents | Not Started | |
| 4 | Templates + Comms | Not Started | |

### Chapter 3: Intelligence Layer

| Phase | Name | Status | Notes |
|-------|------|--------|-------|
| 5 | Feed (Rule-Based) | Not Started | |
| 6 | AI Integration | Not Started | ai-gateway, copilot, scoring not built |
| 7 | Enrichment Live | Partial (~40%) | Crawlers built, no Convex sync |

### Chapter 4: Advanced

| Phase | Name | Status | Notes |
|-------|------|--------|-------|
| 8 | Doc Intelligence | Not Started | |
| 9 | Refi Monitor | Not Started | |
| 10 | LOS Integration | Not Started | |

### Chapter 5: Launch

| Phase | Name | Status | Notes |
|-------|------|--------|-------|
| 11 | Onboarding | Not Started | |
| 12 | Billing + Team | Not Started | Schema not designed |
| 13 | Production Hardening | Not Started | |

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

## Immediate Next Steps

1. **Phase 0.1** — Scaffold monorepo: create `apps/web/` (Next.js 15 + Convex), move `mortgage-data-engine/` to `services/`
2. **Add tests** — vitest + miniflare for existing Worker crawlers (unblocks gate compliance)
3. **Phase 0.2** — Implement design tokens in Tailwind config + shadcn primitives
4. **Phase 0.3** — Clerk auth, core/users organ, app shell with 3 views
