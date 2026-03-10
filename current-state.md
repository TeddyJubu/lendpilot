# LoanPilot — Current State for Future Agents

**Last updated:** 2026-03-10
**Branch:** `claude/create-iphone-branch-8q3CW` (pushed, up to date with remote)
**Repo root:** `/home/user/lendpilot`

---

## What exists today

### Committed files (everything is on `claude/create-iphone-branch-8q3CW`)

```
lendpilot/
├── CLAUDE.md                        # Architecture rules — READ THIS FIRST
├── IMPLEMENTATION.md                # Step-by-step process + tissue lifecycle
├── DESIGN_SYSTEM.md                 # UI rules — read before any frontend work
├── docs/PRD.md                      # Full product spec
├── .gitignore                       # node_modules/ excluded
│
├── apps/                            # ← DOES NOT EXIST YET (Phase 0 work remaining)
│
└── services/
    └── mortgage-data-engine/        # Cloudflare Worker — intelligence layer
        ├── package.json             # Hono, Vitest 2.x, @vitest/coverage-v8
        ├── tsconfig.json
        ├── vitest.config.ts         # globals:true, environment:"node", testTimeout:30000
        ├── wrangler.toml            # Cloudflare deployment config
        ├── SETUP.md                 # Deployment instructions
        └── src/
            ├── index.ts             # Worker entry: fetch + scheduled handlers
            ├── types/index.ts       # Env, RateQuery, EnrichmentRequest types
            ├── api/
            │   ├── routes.ts        # Hono router — 12 endpoints + auth + rate limiting
            │   └── __tests__/
            │       └── routes.test.ts
            ├── crawlers/
            │   ├── wholesale-rates.ts
            │   ├── retail-rates.ts
            │   ├── dpa-programs.ts
            │   ├── regulatory-updates.ts
            │   ├── lead-enrichment.ts
            │   └── __tests__/      # one test file per crawler
            ├── db/
            │   ├── schema.sql
            │   ├── migration-p1.sql
            │   ├── queries.ts       # All D1 query helpers
            │   └── __tests__/
            │       └── queries.test.ts
            ├── utils/
            │   ├── helpers.ts       # uuid, now, sleep, normalizeAddress, validators…
            │   ├── browser-scraper.ts  # scrapeUrl, simpleFetch, extractStructured,
            │   │                       # batchScrape, archiveToR2
            │   └── __tests__/
            │       ├── helpers.test.ts
            │       └── browser-scraper.test.ts
            ├── sync/
            │   └── convex-sync.ts   # STUB — Phase 6 write-back to Convex
            └── test/
                └── mocks/
                    ├── d1.ts        # MockD1Database
                    ├── kv.ts        # MockKVNamespace
                    ├── r2.ts        # MockR2Bucket
                    ├── ai.ts        # MockAi
                    ├── browser.ts   # MockBrowserFetcher
                    └── env.ts       # createMockEnv(), setupHealthyCredits(), setupLowCredits()
```

---

## Test suite

```
npm test   # run from services/mortgage-data-engine/
```

**229 tests, 10 files, ~1.3s** — all passing.

| File | Tests |
|------|-------|
| src/utils/__tests__/helpers.test.ts | 57 |
| src/db/__tests__/queries.test.ts | 37 |
| src/api/__tests__/routes.test.ts | 40 |
| src/utils/__tests__/browser-scraper.test.ts | 27 |
| src/__tests__/index.test.ts | 18 |
| src/crawlers/__tests__/lead-enrichment.test.ts | 12 |
| src/crawlers/__tests__/wholesale-rates.test.ts | 13 |
| src/crawlers/__tests__/retail-rates.test.ts | 10 |
| src/crawlers/__tests__/regulatory-updates.test.ts | 9 |
| src/crawlers/__tests__/dpa-programs.test.ts | 6 |

---

## Architecture decisions that must not change

### 1. Mock system pattern (test/mocks/)
- **MockD1Database** uses substring pattern matching on SQL text to return configurable per-query responses. Configure with `env.DB.mockFirst("substring", row)` and `env.DB.mockAll("substring", rows[])`.
- **MockKVNamespace** is a plain in-memory Map — pre-seed it to test rate limiting.
- **MockR2Bucket** tracks `.puts[]` and `.deletes[]` arrays for assertions.
- **MockAi** tracks `.calls[]`; use `.setDefaultResponse(obj)` or `.setModelResponse(model, obj)`.
- **MockBrowserFetcher** matches by URL substring; use `.mockUrl(substring, status, body)` and `.setError(true)` for network failures.
- **`createMockEnv()`** in `test/mocks/env.ts` composes all mocks. Always use this in `beforeEach`.
- **`setupHealthyCredits(env)`** → DB returns `total_used: 0` (80000 credits remaining).
- **`setupLowCredits(env, remaining)`** → sets `total_used = 80000 - remaining`.

### 2. Sleep mocking — REQUIRED in every crawler test
Every crawler calls `sleep(500–1000ms)` between sources, and `browser-scraper.ts` now calls `sleep()` for retry backoffs too. Without mocking sleep, tests time out.

**Always add this at the top of any test file that imports a crawler or browser-scraper:**
```typescript
vi.mock("../../utils/helpers", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../utils/helpers")>();
  return { ...actual, sleep: vi.fn().mockResolvedValue(undefined) };
});
```
The path `../../utils/helpers` works regardless of nesting depth because vi.mock resolves to the absolute path.

### 3. fetch mocking — use vi.stubGlobal, NOT global.fetch =
In ESM + Node.js, `global.fetch = vi.fn()` is unreliable. The mock doesn't intercept fetch calls inside modules loaded via ESM.

**Always use:**
```typescript
vi.stubGlobal("fetch", vi.fn().mockResolvedValue(...));
afterEach(() => vi.unstubAllGlobals());
```

### 4. Credit thresholds (crawler-specific — don't mix these up)
| Crawler | Aborts when credits < |
|---------|----------------------|
| wholesale-rates | 100 |
| retail-rates | 50 |
| dpa-programs | 60 |
| regulatory-updates | 20 |
| index.ts scheduled handler | 50 (global circuit breaker) |

### 5. Rate limiting KV key format
`ratelimit:{endpoint}:{apiKey}:{window}`
where `window = Math.floor(Math.floor(Date.now() / 1000) / windowSecs)`.

For tests, pre-seed like this:
```typescript
const window = Math.floor(Math.floor(Date.now() / 1000) / 60); // 60s window for enrich
await env.CACHE.put(`ratelimit:enrich:${API_KEY}:${window}`, "10");
```

### 6. Cron dispatch schedule (index.ts `scheduled` handler)
| UTC hours | Crawl |
|-----------|-------|
| 2, 6, 10, 14, 18, 22 | wholesale rates (every 4h) |
| 10 | retail rates (daily) |
| 11 | regulatory updates (daily) |
| 12, Monday only (dayOfWeek=1) | DPA programs (weekly) |

### 7. Retry logic in browser-scraper
`scrapeUrl` and `simpleFetch` both call `retryOnNetworkError()` internally.
- Retries up to 3 additional times (4 total) when `statusCode === 0`
- Backoff delays: 2000ms → 4000ms → 8000ms (via `sleep()`)
- HTTP errors (statusCode ≠ 0) are NOT retried

### 8. R2 archival
`archiveToR2(env, category, url, html)` in `browser-scraper.ts`:
- Key format: `crawls/{category}/{YYYY-MM-DD}/{url-slug}.html`
- Best-effort: silently swallows errors — never throws
- Currently exported but NOT automatically called by crawlers — must be called explicitly

### 9. Convex sync is a stub
`src/sync/convex-sync.ts` has full TypeScript types and function signatures but all functions return `{ success: false, errors: ["Not implemented — Phase 6"] }`. Do not try to use it for real data until Phase 6 Convex HTTP actions exist.

---

## What has NOT been built yet (per CLAUDE.md phases)

### Phase 0 — Foundation (not started)
- `apps/web/` directory doesn't exist
- Next.js 15 app with App Router
- Convex setup + Clerk auth
- `convex/core/` organ (users table, mutations, queries)
- Frontend shell: sidebar, 3 empty views (Today / Pipeline / Contacts), Cmd+K skeleton

### Phase 1 — Contacts Organ (not started)
- `convex/contacts/` all tissues (tables, validators, queries, mutations, internals, helpers, tests)
- `convex/activities/` contact-scoped tissues
- Frontend: ContactList, ContactCard, ContactDetail, RelationshipMap

### Phase 2 — Loans Organ + Pipeline View (not started)
- `convex/loans/` all tissues including stateMachine.ts
- Frontend: KanbanBoard, LoanCard, StageColumn, LoanDetail, drag-and-drop

### Phase 3 — Documents Organ (not started)

### Phase 4 — Templates + Communication (not started)
- SendGrid + Twilio integration not yet wired

### Phase 5 — Feed Organ / Today View (not started)

### Phase 6 — AI Layer (not started)
- `ai-gateway` Cloudflare Worker (Cmd+K intent, copilot panel, email drafting, lead scoring)
- `convex-sync.ts` stub needs implementation after Convex HTTP actions exist
- Convex HTTP actions for rate, regulatory, DPA, enrichment ingestion

### Phase 7 — Rate Scraper + Enrichment (partial)
- `services/mortgage-data-engine/` is fully implemented and tested (intelligence layer)
- Convex `rates/` organ and UI rate display: NOT done
- Wiring crawlers to actually call `archiveToR2` + `syncRates`: NOT done

### Phase 8–9 (not started)
- `los-sync` Durable Object
- `doc-intel` Worker (OCR)
- `refi-monitor` Worker
- Onboarding flow, Stripe billing, team features

---

## How to continue

### Starting Phase 0 (recommended next step)
```bash
cd /home/user/lendpilot
mkdir -p apps/web
cd apps/web
npx create-next-app@latest . --typescript --tailwind --app --no-src-dir
npx convex dev  # or: npm install convex && npx convex init
npm install @clerk/nextjs
```

Then follow the tissue lifecycle from IMPLEMENTATION.md:
1. `convex/core/tables.ts` → schema.ts
2. `convex/core/validators.ts`
3. `convex/core/helpers.ts`
4. Tests first (`convex/core/__tests__/`)
5. `convex/core/mutations.ts` (createUser, updateUser)
6. `convex/core/queries.ts` (getCurrentUser)
7. Clerk webhook handler to sync user on sign-up

### Running the Cloudflare Worker locally
```bash
cd services/mortgage-data-engine
npm run dev        # wrangler dev (requires Cloudflare account + bindings)
npm test           # runs 229 Vitest tests without Cloudflare
npm run test:coverage
```

### Git workflow
- Development branch: `claude/create-iphone-branch-8q3CW`
- Never push to `master` without explicit permission
- Branch naming: must start with `claude/` and end with the session ID suffix

---

## Known issues / gotchas

1. **`scrapeUrl` network error call count** — MockBrowserFetcher throws BEFORE recording to `.calls[]`, so `env.BROWSER.calls.length` stays 0 even after retries. Test for `result.statusCode === 0` and `result.error` content instead.

2. **`vi.mock` path resolution** — always use relative paths from the TEST FILE location, not from the source file. e.g., in `src/crawlers/__tests__/foo.test.ts`, the path to mock helpers is `"../../utils/helpers"`.

3. **R2 `options` type is `unknown`** in MockR2Bucket's `puts[]` array. Cast to `any` in tests: `(put.options as any)?.customMetadata?.sourceUrl`.

4. **vitest.config.ts testTimeout is 30,000ms** — needed because some crawlers have many sources. Individual tests that still time out need sleep mocked.

5. **`convex-test` is NOT installed** — the Convex test library is not yet set up. It will be needed once `apps/web/convex/` organs are built (Phase 0+).

6. **wrangler.toml bindings** — the Worker uses `DB` (D1), `STORAGE` (R2), `BROWSER` (Browser Rendering), `AI` (Workers AI), `CACHE` (KV). These must exist in a real Cloudflare account before `wrangler deploy` works.
