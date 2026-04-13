# LoanPilot — Plan Review & Critique

> Reviewed: 2026-04-13
> Documents analyzed: CLAUDE.md, IMPLEMENTATION.md, DESIGN_SYSTEM.md, docs/PRD.md, mortgage-data-engine/ source code
> **Resolution:** Original 34-week plan replaced with 2-day MVP sprint. See `MVP_PLAN.md`.

---

## Executive Summary

LoanPilot's planning documentation is architecturally sound — the organ-tissue pattern, gate criteria, and schema design are all high quality. However, the original 34-week/13-phase timeline was over-engineered for an MVP. Critical gaps included missing team/billing schemas, undefined AI algorithms, no migration strategy, and zero tests on 3,100 lines of existing code. The plan has been compressed to a **2-day MVP sprint** (see `MVP_PLAN.md`) that delivers the core CRM loop — auth, contacts, loans pipeline, document tracking, and rule-based feed — with TDD on all business logic. Deferred features (AI, comms, billing, teams) have clear post-MVP timelines.

---

## Strengths (Preserve These)

### 1. Organ-Tissue Architecture
The domain decomposition is excellent. Each organ owns one feature area end-to-end, communicates only through IDs, and can be swapped independently. This prevents the "big ball of mud" that kills CRM projects.

### 2. Tissue Lifecycle (SPEC-to-DOCUMENT)
The 7-step process (SPEC → SCAFFOLD → CONTRACT → TEST → IMPLEMENT → VERIFY → DOCUMENT) enforces discipline. Writing tests before implementation catches design issues early.

### 3. Gate Criteria
Every phase has specific, testable gates. "User A cannot see User B's contacts" is verifiable. "All tests pass" is binary. This prevents scope creep and premature advancement.

### 4. Schema Design
Tables have proper indexes for real query patterns (e.g., `by_owner_stage`, `by_next_touch`). The loan state machine codifies real mortgage workflow stages with valid transitions.

### 5. Separation: Convex=State, Cloudflare=Intelligence
Clean architectural boundary. Frontend reads only from Convex (real-time WebSocket). AI inference runs on Cloudflare Workers. Workers write back via authenticated HTTP actions. No confusion about where data lives.

### 6. AI Comment Standard
The `@organ`, `@tissue`, `@ai-modify`, `@ai-caution` annotations make the codebase navigable by AI agents. This is forward-thinking for a codebase that will be maintained with AI assistance.

### 7. Design System First
Defining color tokens (OKLCH), typography scale, and component specs before writing code prevents design debt. The monochrome-foundation aesthetic is coherent and professional.

---

## Critical Issues (Must Address)

### 1. Missing Team & Billing Schema
**Impact: Phase 12 will require retroactive schema design**

Phase 12 requires team features (invite members, shared pipeline, roles) and Stripe billing (subscriptions, tier enforcement). No `teams`, `roles`, `teamMembers`, `subscriptions`, or `invoices` tables exist in the schema section of CLAUDE.md.

**Recommendation:** Design these schemas now, even if implementation is deferred. Schema changes become expensive once data exists.

### 2. State Machine References Unavailable Capabilities
**Impact: Phase 2 gate ambiguity**

The loan state machine allows `new_lead → scored`, but lead scoring is an AI feature in Phase 6. During Phase 2, how does a loan enter `scored` state? Options:
- (a) Manual scoring by broker (score field is optional, transition is allowed without it)
- (b) Remove `scored` from Phase 2 transitions, add it in Phase 6
- (c) Implement a placeholder rule-based scoring in Phase 2

**Recommendation:** Option (a) — allow the transition but make `leadScore` optional. The broker manually moves leads to `scored` in Phase 2. AI auto-scoring supplements this in Phase 6.

### 3. Zero Test Coverage on Existing Code
**Impact: Violates the plan's own TDD mandate**

`mortgage-data-engine/` has ~3,100 lines of TypeScript across 5 crawlers, API routes, and database queries. Not a single test file exists. `package.json` doesn't even include vitest as a dependency.

**Specific untested code paths:**
- Rate validation (`helpers.ts:45-57`) — `isValidRate()`, `isValidApr()`, `isValidFico()`
- Address normalization (`helpers.ts:26-42`) — regex-heavy, edge-case-prone
- Credit tracking (`db/queries.ts`) — `getCreditsRemaining()` calculation
- API parameter handling (`api/routes.ts`) — SQL query building with dynamic filters
- Webhook HMAC verification (`index.ts:122-138`)

**Recommendation:** Add vitest + miniflare to `mortgage-data-engine/`, write tests for helpers and queries before proceeding with any new code.

### 4. No Convex-Cloudflare Sync Layer
**Impact: Data silo — crawled data unreachable by frontend**

The architecture states "Cloudflare writes back to Convex via authenticated HTTP actions" and "Frontend reads only from Convex." Currently, crawlers write to D1 (Cloudflare's SQLite) but nothing syncs this data to Convex. The frontend has no way to access scraped rates or enrichment data.

**Recommendation:** Design the sync HTTP actions in `convex/http.ts` during Phase 0. Implement the actual sync in the Worker during Phase 7, but the Convex ingestion endpoints should exist early.

### 5. 100KB+ Documentation Creates Cognitive Overload
**Impact: AI agents and new developers cannot hold full context**

CLAUDE.md (30KB) + IMPLEMENTATION.md (33KB) + DESIGN_SYSTEM.md (37KB) = 100KB of mandatory reading. An AI agent with 200K context can technically read it all, but effective reasoning degrades with context length. Human developers will skim and miss rules.

**Recommendation:** Keep the detailed docs as reference but create PROJECT_STATUS.md (this file's companion) for quick orientation. Consider splitting CLAUDE.md into `CLAUDE.md` (rules only, <10KB) and `SCHEMA.md` (schema definitions).

### 6. No CI/CD Pipeline
**Impact: Gates are unenforceable**

Phase gates require "all tests pass" but there's no GitHub Actions, no pre-commit hooks, no automated type checking. Nothing prevents merging code that breaks tests or violates TypeScript strict mode.

**Recommendation:** Create `.github/workflows/ci.yml` during Phase 0.1 with: TypeScript type-check, vitest, ESLint. Add husky pre-commit hook for lint + type-check.

### 7. No Database Migration Strategy
**Impact: Schema changes on live Convex deployment will cause downtime or data loss**

Convex handles schema evolution differently from traditional databases. The docs don't address:
- How to add required fields to existing tables (need defaults)
- How to rename/remove fields without breaking queries
- How to handle the transition from `v.optional()` to required
- Rollback strategy if a migration breaks

**Recommendation:** Document a migration playbook before Phase 1, covering: additive changes (safe), field removal (requires two-step deploy), type changes (requires migration mutation).

### 8. Missing Algorithm Specifications
**Impact: Phases 5-7 will require ad-hoc design during implementation**

The following are referenced in the plan but never specified:
- **Lead scoring** (0-100) — What factors? What weights? What data is available?
- **Health scoring** (0-100) — What makes a loan "healthy" vs "at risk"?
- **Rate comparison** — How to match a borrower's profile to best available rates?
- **Relationship scoring** — How is relationship strength calculated?
- **Feed item priority** — Beyond the 4 basic rules in Phase 5 gate criteria

**Recommendation:** Write algorithm specs (even rough ones) in a `docs/algorithms.md` before Phase 5. Include inputs, outputs, and 3-5 test cases for each.

---

## Moderate Concerns

### 9. `metadata: v.any()` Breaks Strict Typing
The `activities` table uses `metadata: v.optional(v.any())`, which contradicts the "no `any`" rule in CLAUDE.md. This will accumulate untyped data that's impossible to query reliably.

**Recommendation:** Define a union of metadata shapes per activity type:
```ts
metadata: v.optional(v.union(
  v.object({ fromStage: v.string(), toStage: v.string() }),  // stage_change
  v.object({ templateId: v.optional(v.id("templates")) }),   // email/sms
  v.object({ documentId: v.id("documents") }),               // doc events
  // ...
))
```

### 10. Rate Snapshots Grow Unbounded
`rateSnapshots` table has no TTL, cleanup cron, or retention policy. With 6 crawls/day across 20 lenders and multiple products, this table will grow by ~1,000+ rows/day.

**Recommendation:** Add a weekly cleanup cron that archives snapshots older than 90 days. Or add an `expiresAt` field and filter in queries.

### 11. Email/SMS Webhook Architecture Undefined
Phase 4 gate requires "Webhook receives inbound messages" but no Worker or Convex HTTP action is designed for handling SendGrid/Twilio inbound webhooks.

**Recommendation:** Design the webhook handler before Phase 4: which service receives the webhook (Convex HTTP action or Cloudflare Worker?), how messages are matched to contacts, how activities are created.

### 12. Browser Scraper Lacks Resilience
`mortgage-data-engine/src/utils/browser-scraper.ts` has no retry logic, no rate limiting between requests, and no timeout handling. Wholesale lender sites frequently return 503s or CAPTCHAs.

**Recommendation:** Add exponential backoff retry (3 attempts), request throttling (1-2 second delays between requests), and structured error reporting per URL.

### 13. Document Status Machine Not Fully Specified
Loans have a complete state machine with valid transitions. Documents have status values (`requested → uploaded → ai_reviewing → approved → rejected → expired`) but no transition rules are defined.

**Recommendation:** Add a `documents/stateMachine.ts` design analogous to loans — define valid transitions (e.g., `uploaded` cannot go directly to `expired`, `rejected` can go back to `uploaded`).

### 14. Monorepo Structure Mismatch
Docs specify `services/mortgage-data-engine/` but the Worker lives at root level `mortgage-data-engine/`. This will cause confusion when `apps/web/` is created.

**Recommendation:** Move to `services/mortgage-data-engine/` during Phase 0.1 scaffolding. Update all path references.

### 15. Over-Engineering Risk
34 weeks across 13 phases for an MVP is ambitious. Phases 8 (Doc Intelligence), 9 (Refi Monitor), and 10 (LOS Integration) could be deferred post-launch without affecting core CRM value.

**Recommendation:** Consider a "Launch MVP" gate after Phase 7. Phases 8-10 become post-launch features. This gets the product to users faster and generates real feedback.

---

## Minor Issues

### 16. Phase Naming Inconsistency
CLAUDE.md uses "Phase 0, 1, 2..." but IMPLEMENTATION.md breaks Phase 0 into "0.1, 0.2, 0.3". Both are correct but newcomers may be confused about which document is authoritative.

### 17. No `.env.example` Files
No example environment variable files exist. Developers won't know what secrets are needed (Clerk keys, Convex URL, Cloudflare API tokens) until they hit runtime errors.

### 18. Credit Budget Configuration
`wrangler.toml` sets `CREDIT_BUDGET_MONTHLY = "13350"` as a string env var. The code in `index.ts:62` checks `creditsRemaining < 50` (a separate threshold). The relationship between monthly budget and the low-credit threshold isn't documented.

### 19. Copilot Bypasses Real-Time
The Copilot panel calls Cloudflare directly via HTTP, bypassing Convex's real-time layer. This means copilot responses won't benefit from optimistic updates or real-time subscription patterns. This is an intentional design choice but has UX implications (stale data in AI context).

### 20. KV Key Naming Undefined
LOS credentials and AI prompt templates reference Cloudflare KV storage, but no key naming convention is documented. Example: is it `los:encompass:credential:{userId}` or `credentials/los/encompass/{userId}`?

---

## Risk Register

| # | Risk | Likelihood | Impact | Mitigation |
|---|------|-----------|--------|------------|
| 1 | No tests → regressions in Worker code | High | High | Add vitest immediately |
| 2 | Schema changes break live deployment | Medium | High | Document migration playbook |
| 3 | Rate data silo (D1 only, no Convex sync) | High | Medium | Design sync endpoints in Phase 0 |
| 4 | Team/billing schema designed too late | Medium | Medium | Draft schemas now |
| 5 | AI algorithms undefined → ad-hoc implementation | High | Medium | Write algorithm specs before Phase 5 |
| 6 | 34-week timeline → product never launches | Medium | Critical | Set MVP gate after Phase 7 |
| 7 | Monorepo restructure causes path breakage | Low | Low | Fix in Phase 0.1 |
| 8 | Lender sites block scraper (CAPTCHA/rate limit) | High | Medium | Add retry + rate limiting |

---

## Recommendations — Revised for 2-Day MVP

### Resolved by MVP Plan
- ~~Over-engineering risk~~ -> Compressed to 2-day sprint (`MVP_PLAN.md`)
- ~~State machine gap~~ -> `new_lead → scored` allowed; broker manually advances. AI scoring added post-MVP
- ~~No CI/CD~~ -> Deferred to Week 2. MVP uses `pnpm test` + `tsc --noEmit` as local gates
- ~~Missing algorithm specs~~ -> AI features deferred. Rule-based feed uses 4 simple rules (see Block 7)
- ~~Email/SMS webhooks~~ -> Cut from MVP entirely. Templates table has schema but no send functions

### Addressed During MVP (Block 1)
1. Deploy ALL 8 organ schemas upfront — prevents migration pain even for unimplemented organs
2. Install vitest + convex-test from the start — TDD from Block 2 onward

### Deferred to Post-MVP (Week 2)
3. Worker tests (vitest + miniflare for `mortgage-data-engine/`)
4. Cloudflare → Convex sync layer
5. CI/CD pipeline (`.github/workflows/ci.yml`)
6. `.env.example` files and setup documentation
7. Move `mortgage-data-engine/` to `services/` directory

### Deferred to Post-MVP (Month 2+)
8. Team/billing schema + implementation
9. Algorithm specs for AI scoring (lead, health, relationship, rate comparison)
10. LOS integration, Durable Objects, doc intelligence
11. API versioning, KV key naming, data retention policy

### Open Questions for Post-MVP
- How should `metadata: v.any()` on activities be typed? (union of per-type shapes recommended)
- What's the rate snapshot retention policy? (suggest 90-day TTL with weekly cleanup cron)
- When does monorepo restructure happen? (recommend before adding second developer)
