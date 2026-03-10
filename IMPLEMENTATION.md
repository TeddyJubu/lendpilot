# LoanPilot — Implementation Guide

> **READ THIS FIRST.** Before writing any code, any agent must read this file completely.
> This document defines HOW to implement, not WHAT to implement.
> WHAT is in `CLAUDE.md` (architecture) and `DESIGN_SYSTEM.md` (UI).

---

## Part 1: The Implementation Process

Every line of code in LoanPilot follows the same process. No exceptions.

### 1.1 The Tissue Lifecycle

A tissue is the smallest unit of work. Every tissue goes through these 7 steps in order:

```
SPEC → SCAFFOLD → CONTRACT → TEST → IMPLEMENT → VERIFY → DOCUMENT
```

**Step 1: SPEC** — Before writing code, write a 3-5 line comment block at the top of the file describing:
- What this tissue does (one sentence)
- What organ it belongs to
- What it depends on (other tissues, external APIs)
- What depends on it

**Step 2: SCAFFOLD** — Create the file with its exports defined but not implemented. Functions return `TODO` throws. This validates the file structure and imports.

**Step 3: CONTRACT** — Define the TypeScript interfaces, input validators, and return types. These are the tissue's contract with the outside world. They must be complete before implementation.

**Step 4: TEST** — Write tests BEFORE implementation. Tests define the expected behavior. Use:
- `convex-test` + `vitest` for Convex tissues
- `vitest` + `miniflare` for Cloudflare Worker tissues
- `vitest` + `@testing-library/react` for UI tissues (component tests)

Minimum test coverage per tissue:
- 1 happy path test
- 1 invalid input test
- 1 edge case test
- 1 auth/permission test (for Convex query/mutation tissues)

**Step 5: IMPLEMENT** — Write the actual logic. Run tests after every meaningful change.

**Step 6: VERIFY** — All tests pass. Manual verification if the tissue has UI. Light mode AND dark mode if visual.

**Step 7: DOCUMENT** — Add inline comments following the AI Agent Comment Standard (Section 1.3).

### 1.2 The Organ Lifecycle

An organ is complete when ALL its tissues pass the lifecycle above, plus:

```
DESIGN → TISSUES → INTEGRATION → GATE
```

**Step 1: DESIGN** — Before writing any tissue:
- Define/update the schema in `<organ>/tables.ts`
- List all tissues needed for this organ
- Identify cross-organ dependencies
- Write the design as a comment block at the top of the organ's directory index

**Step 2: TISSUES** — Implement each tissue through its full lifecycle (Section 1.1), in this order:
```
tables.ts → validators.ts → helpers.ts → stateMachine.ts → internals.ts → mutations.ts → queries.ts → UI components
```

**Step 3: INTEGRATION** — After all tissues pass individually:
- Run the full organ test suite together
- Test cross-tissue interactions (mutation writes → query reads correctly)
- Test with real Convex dev deployment (not just in-memory)

**Step 4: GATE** — The organ's phase gate (defined in CLAUDE.md) must pass. Every gate condition verified. Only then proceed to the next organ.

### 1.3 AI Agent Comment Standard

Every file must have comments that help future AI agents understand and modify the code safely.

#### File Header (required on every file)

```ts
/**
 * @organ contacts
 * @tissue mutations
 * @description Handles all write operations for the contacts table.
 *   Creates, updates, and archives contacts with activity logging.
 * @depends-on
 *   - contacts/validators.ts (input validation)
 *   - contacts/tables.ts (schema)
 *   - activities/internals.ts (activity log writes)
 * @depended-by
 *   - contacts/queries.ts (reads data this writes)
 *   - feed/internals.ts (generates feed items on contact events)
 *   - UI: components/contacts/contact-detail-panel.tsx
 * @ai-notes
 *   - Every mutation MUST update `updatedAt` field.
 *   - Every mutation MUST check ownerId === authenticated user.
 *   - Creating/archiving a contact MUST log to activities via logActivity().
 *   - Do NOT call external APIs here. Use actions for that.
 */
```

#### Function Comments (required on exported functions)

```ts
/**
 * Creates a new contact and logs the creation activity.
 *
 * @ai-modify To add a new field:
 *   1. Add the field to contacts/tables.ts schema
 *   2. Add validation in contacts/validators.ts
 *   3. Add the field to the args validator below
 *   4. Add it to the db.insert() call
 *   5. Add a test case in __tests__/mutations.test.ts
 *   6. Update contacts/queries.ts if the field should be returned
 *
 * @ai-caution
 *   - The logActivity() call must remain INSIDE the mutation (transactional).
 *   - Do not remove the ownerId check — it's the multi-tenant boundary.
 */
export const create = mutation({ ... });
```

#### Section Comments (for complex logic blocks)

```ts
// --- Stage Transition Validation ---
// Uses the state machine in loans/stateMachine.ts.
// If you need to add a new stage:
//   1. Add the literal to the stage union in loans/tables.ts
//   2. Add transitions in loans/stateMachine.ts STAGE_TRANSITIONS
//   3. Add the stage to the STAGE_GROUPS mapping for pipeline column assignment
//   4. Add a test for the new transitions
//   5. Update the StagePill component in components/primitives/stage-pill.tsx
```

#### Comment Rules
- **No obvious comments.** Don't comment `// increment counter` above `counter++`.
- **Comment the WHY, not the WHAT.** The code shows what. Comments explain why.
- **@ai-modify blocks are mandatory** on any function an agent might change. They're step-by-step instructions for safe modification.
- **@ai-caution blocks** for anything that breaks silently if changed wrong (auth checks, transactional boundaries, ordering dependencies).
- **@depends-on and @depended-by** in file headers create a dependency graph. An agent modifying a file MUST check all `@depended-by` references for breakage.

---

## Part 2: Project Structure

### 2.1 Monorepo Layout

```
loanpilot/
├── CLAUDE.md                    # Architecture + rules (read first)
├── DESIGN_SYSTEM.md             # Design system guide (read for UI work)
├── IMPLEMENTATION.md            # This file (read for process)
├── docs/
│   └── PRD.md                   # Product requirements (reference)
│
├── apps/
│   └── web/                     # Next.js frontend app
│       ├── package.json
│       ├── next.config.ts
│       ├── tailwind.config.ts   # (if needed beyond globals.css)
│       ├── src/
│       │   ├── app/             # Next.js App Router
│       │   ├── components/      # UI layers (ui/ → primitives/ → features/)
│       │   ├── hooks/           # Custom React hooks
│       │   ├── lib/             # Utilities, constants, Cloudflare client
│       │   ├── styles/
│       │   │   └── globals.css  # All design tokens
│       │   └── types/           # Frontend-only types
│       └── convex/              # Convex backend (co-located with frontend)
│           ├── schema.ts        # Master schema (imports all organ tables)
│           ├── types.ts         # Shared types
│           ├── http.ts          # HTTP action routes
│           ├── crons.ts         # Scheduled function triggers
│           ├── core/            # Core organ
│           ├── contacts/        # Contacts organ
│           ├── loans/           # Loans organ
│           ├── documents/       # Documents organ
│           ├── activities/      # Activities organ
│           ├── feed/            # Feed organ
│           ├── templates/       # Templates organ
│           └── rates/           # Rates organ
│
├── services/
│   └── mortgage-data-engine/    # Cloudflare Worker (intelligence layer)
│       ├── package.json
│       ├── wrangler.toml
│       ├── tsconfig.json
│       ├── vitest.config.ts
│       ├── src/
│       │   ├── index.ts         # Worker entry point + cron dispatch
│       │   ├── types/           # TypeScript interfaces
│       │   ├── api/             # Hono API routes
│       │   ├── crawlers/        # Scraping modules
│       │   ├── db/              # D1 schema + queries
│       │   └── utils/           # Helpers, browser scraper
│       └── __tests__/           # Worker tests (vitest + miniflare)
│
└── packages/                    # Shared packages (if needed later)
    └── shared-types/            # Types shared between web + services
```

### 2.2 Where mortgage-data-engine Fits

The `mortgage-data-engine` Worker lives at `services/mortgage-data-engine/` (migrated from the repo root). It is the **Cloudflare intelligence layer** — one of the two backend pillars alongside Convex.

**Current state:** Contains rate-scraper, lead-enricher, DPA, and regulatory crawlers. All working, using D1 for storage.

**Needed evolution:**
1. Add a **Convex sync layer** — after crawling, write results to Convex via HTTP actions (the source of truth for the frontend). D1 remains as the engine's operational store and cache.
2. Add the **ai-gateway** routes — copilot, command parsing, email drafting, lead scoring. These are new API routes on the same Worker (or a separate Worker if CPU limits require it).
3. Add **doc-intel** routes — document OCR and validation. New API routes.
4. Add **refi-monitor** logic — scheduled comparison of funded loans vs current rates. New cron handler.
5. **los-sync** will be a separate Worker with Durable Objects when ready (Phase 8).

---

## Part 3: Implementation Chapters

The entire LoanPilot build is divided into 5 chapters. Each chapter has phases. Each phase has organs. Each organ has tissues. Tests gate every level.

---

### Chapter 1: Foundation
*Get the app running with auth, navigation, and the design system.*

#### Phase 0.1 — Project Scaffolding
**Goal:** Monorepo initialized, all configs in place, app runs locally.

| Task | Output | Verify |
|------|--------|--------|
| Init Next.js 15 app in `apps/web/` | `next.config.ts`, `package.json` | `pnpm dev` starts without errors |
| Init Convex in `apps/web/` | `convex/` directory, `convex.json` | `npx convex dev` connects |
| Ensure worker is at `services/mortgage-data-engine/` | Folder relocated | `cd services/mortgage-data-engine && npm install` works |
| Set up Tailwind v4 with `globals.css` | All tokens from DESIGN_SYSTEM.md Section 3 | Tokens resolve: `bg-primary` renders correct color |
| Install Geist fonts | Font loaded in layout.tsx | Text renders in Geist |
| Configure `tsconfig.json` strict mode | `strict: true` in all packages | No implicit any allowed |
| Set up Vitest | `vitest.config.ts` in both `apps/web/` and `services/` | `pnpm test` runs (0 tests, 0 failures) |
| Add `.gitignore` for node_modules, .env, etc. | `.gitignore` at root | No secrets committed |

**Gate:** App starts. Convex connects. Worker installs. Test runner works. Tokens render.

#### Phase 0.2 — Design System Base
**Goal:** Layer 1 (shadcn) and Layer 2 (primitives) components built and verified.

| Task | Output | Verify |
|------|--------|--------|
| Install shadcn Phase 0 components | `components/ui/` populated | All render in a test page |
| Build `StatusBadge` primitive | `components/primitives/status-badge.tsx` | All 5 variants render, light + dark |
| Build `PriorityIndicator` primitive | `components/primitives/priority-indicator.tsx` | All 4 levels render with correct colors |
| Build `StagePill` primitive | `components/primitives/stage-pill.tsx` | All stages map to correct group color |
| Build `UserAvatar` primitive | `components/primitives/user-avatar.tsx` | Image + fallback initials both work |
| Build `EmptyState` primitive | `components/primitives/empty-state.tsx` | Renders with icon, title, description, CTA |
| Build `AIContent` primitive | `components/primitives/ai-content.tsx` | Pending (60% opacity), approved (100%), controls work |
| Build `TimeAgo` primitive | `components/primitives/time-ago.tsx` | Shows relative time correctly |
| Build `KeyboardShortcut` primitive | `components/primitives/keyboard-shortcut.tsx` | Renders Cmd+K style badges |
| Build `LoadingState` primitive | `components/primitives/loading-state.tsx` | All variants (list, card, kanban, detail, feed) |
| Build `MetricCard` primitive | `components/primitives/metric-card.tsx` | Number, label, trend renders |
| Build `DetailPanel` primitive | `components/primitives/detail-panel.tsx` | Sheet slides in, tabs work, Esc closes |
| Build `ConfirmDialog` primitive | `components/primitives/confirm-dialog.tsx` | Default + destructive variants |
| Dark mode toggle | `next-themes` integrated | Every primitive correct in both modes |

**Gate:** All 12 primitives render correctly in light + dark mode. Component test file for each.

#### Phase 0.3 — App Shell + Auth
**Goal:** Authenticated shell with 3 views, sidebar, command bar, copilot panel skeleton.

| Task | Output | Verify |
|------|--------|--------|
| Set up Clerk auth | Clerk provider in layout.tsx | Sign up / sign in flow works |
| Build `core/tables.ts` (users + syncLog) | Convex schema fragment | `npx convex dev` pushes schema |
| Build `core/mutations.ts` (createOrGetUser) | User upsert on auth | Sign in creates user record in Convex |
| Build `core/queries.ts` (getCurrentUser) | Query current user | Hook returns user data |
| Build `core/__tests__/` | Test files | All core tests pass |
| Build `AppSidebar` | `components/shell/app-sidebar.tsx` | 3 nav items + settings + avatar, Cmd+B toggles |
| Build `CommandBar` skeleton | `components/shell/command-bar.tsx` | Cmd+K opens, groups render, Esc closes |
| Build `CopilotPanel` skeleton | `components/shell/copilot-panel.tsx` | Cmd+/ toggles, chat UI renders |
| Build `layout.tsx` shell | Sidebar + main + copilot assembled | Full shell renders responsively |
| Build 3 empty view pages | `today/page.tsx`, `pipeline/page.tsx`, `contacts/page.tsx` | Each renders EmptyState, navigation works |
| Wire keyboard shortcuts | Global shortcut handler | 1/2/3 navigate, Cmd+K/B// toggle panels |

**Gate:** User signs up → user record in Convex → shell renders → 3 views navigate → command bar opens → copilot toggles → keyboard shortcuts work → all core organ tests pass.

---

### Chapter 2: Core CRM
*Build the data organs that power the CRM — contacts, loans, pipeline, documents.*

#### Phase 1 — Contacts Organ
**Goal:** Full contacts CRUD with search, filtering, and activity logging.

**Convex tissues (build in order):**
1. `contacts/tables.ts` — Schema from CLAUDE.md
2. `contacts/validators.ts` — Input validation (name required, email format, type enum)
3. `contacts/helpers.ts` — Pure functions (formatContactName, computeInitials)
4. `contacts/__tests__/validators.test.ts` — Validator tests
5. `contacts/__tests__/helpers.test.ts` — Helper tests
6. `contacts/mutations.ts` — create, update, archive, unarchive
7. `contacts/queries.ts` — list (paginated), getById, search
8. `contacts/internals.ts` — Internal mutations for enrichment write-back
9. `contacts/__tests__/mutations.test.ts` — Mutation tests (CRUD + auth isolation)
10. `contacts/__tests__/queries.test.ts` — Query tests (pagination, filters, multi-tenant)
11. `activities/tables.ts` — Schema
12. `activities/mutations.ts` — logActivity internal mutation
13. `activities/queries.ts` — getByContact (paginated timeline)
14. Wire `logActivity` into contacts mutations

**UI tissues:**
15. Install shadcn Phase 1 components (badge, table, dropdown-menu, etc.)
16. `components/contacts/contact-list.tsx` — Master list with search + filter
17. `components/contacts/contact-list-item.tsx` — Individual row
18. `components/contacts/contact-detail-panel.tsx` — DetailPanel with tabs
19. `components/contacts/contact-search.tsx` — Search input with debounce
20. `contacts/page.tsx` — Assemble list + detail layout

**Gate:** Create/read/update/archive contacts. Search by name. Filter by type. Activity log on every mutation. Pagination. User A can't see User B's contacts. All tests green.

#### Phase 2 — Loans Organ + Pipeline
**Goal:** Loan lifecycle management with kanban pipeline view.

**Convex tissues:**
1. `loans/tables.ts` — Schema from CLAUDE.md
2. `loans/validators.ts` — Input validation (stage enum, amount > 0, FICO 300-850)
3. `loans/stateMachine.ts` — STAGE_TRANSITIONS map + `assertValidTransition()` + `getStageGroup()`
4. `loans/helpers.ts` — `daysInStage()`, `computeStageGroup()`, `formatLoanSummary()`
5. Tests for validators, stateMachine, helpers
6. `loans/mutations.ts` — create, update, updateStage (enforces state machine), archive
7. `loans/queries.ts` — listByStage (for pipeline), getById, listByContact
8. `loans/internals.ts` — Internal mutations for LOS sync, AI field updates
9. Tests for mutations (valid + invalid transitions, auth), queries (pipeline grouping)
10. Wire activity logging for stage changes

**UI tissues:**
11. `components/pipeline/kanban-board.tsx` — 4-column layout with dnd-kit
12. `components/pipeline/stage-column.tsx` — Column with header (name, count, total)
13. `components/pipeline/loan-card.tsx` — Compact card with key metrics
14. `components/pipeline/loan-detail-panel.tsx` — DetailPanel with overview, docs, activity, rate tabs
15. `components/pipeline/stage-progress-bar.tsx` — Linear stage indicator
16. `pipeline/page.tsx` — Assemble kanban

**Gate:** Create loan linked to contact. Valid stage transitions only. Invalid transitions throw. Stage history tracked. Kanban renders grouped by stage. Drag-and-drop moves stage (with confirmation on critical transitions). Days-in-stage color coded. All tests green.

#### Phase 3 — Documents Organ
**Goal:** Document lifecycle — request, upload, track, categorize.

**Convex tissues:**
1. `documents/tables.ts` — Schema
2. `documents/validators.ts` — Category/status enums, file size limits
3. `documents/stateMachine.ts` — Status transitions (requested → uploaded → approved)
4. `documents/helpers.ts` — `isOverdue()`, `getReminderCount()`
5. Tests for all above
6. `documents/mutations.ts` — request, upload, updateStatus, setDueDate
7. `documents/queries.ts` — listByLoan, listOverdue, countByStatus
8. Tests for mutations and queries

**UI tissues:**
9. `components/documents/doc-list.tsx` — Table with status badges and due dates
10. `components/documents/doc-upload.tsx` — File upload with drag zone
11. `components/documents/doc-request-card.tsx` — Request form

**Gate:** Request doc for loan. Upload file to Convex storage. Track status flow. List by loan. Filter by category/status. Due dates shown. Overdue docs flagged. All tests green.

#### Phase 4 — Templates + Communication
**Goal:** Email/SMS templates and SendGrid/Twilio integration with auto-logging.

**Convex tissues:**
1. `templates/tables.ts` — Schema
2. `templates/validators.ts` — Template variables extraction
3. `templates/mutations.ts` — create, update, archive, incrementUsage
4. `templates/queries.ts` — listByType, getById
5. Tests
6. Activities comms tissues — extend mutations for email_sent, sms_sent, etc.
7. HTTP actions for webhook ingestion (received emails/SMS → activities)

**Integration:** Cloudflare Worker routes for SendGrid/Twilio (or direct from Convex actions).

**Gate:** Create template with variables. Send email — variables interpolated correctly. Activity auto-logged. SMS works. Webhook receives inbound messages. All tests green.

---

### Chapter 3: Intelligence Layer
*The AI feed, command bar, copilot, and data pipeline.*

#### Phase 5 — Feed Organ (Rule-Based)
**Goal:** Today view with rule-based feed item generation. No AI yet.

**Convex tissues:**
1. `feed/tables.ts` — Schema
2. `feed/validators.ts` — Priority/type/status enums
3. `feed/helpers.ts` — `prioritySortOrder()`, `isExpired()`
4. `feed/mutations.ts` — create, complete, snooze, dismiss
5. `feed/queries.ts` — listActive (sorted by priority), countActive
6. `feed/internals.ts` — `generateFeedItems()` — rule-based triggers:
   - Document overdue 3+ days → `doc_follow_up` (high)
   - Loan in same stage 7+ days → `pipeline_update` (medium)
   - Contact not touched 30+ days → `relationship_touch` (low)
   - Rate lock expiring in 3 days → `condition_due` (urgent)
7. Convex cron that runs `generateFeedItems()` daily
8. Tests for all tissues + feed generation rules

**UI tissues:**
9. `components/today/feed-list.tsx` — Grouped by priority
10. `components/today/feed-card.tsx` — Card with one-click action
11. `components/today/feed-empty-state.tsx` — "All caught up"
12. `today/page.tsx` — Assemble feed view

**Gate:** Feed items generated by rules. Display by priority. Complete/snooze/dismiss work. Dismissed items don't reappear. Badge count on sidebar. All tests green.

#### Phase 6 — AI Integration
**Goal:** Connect mortgage-data-engine intelligence to the CRM.

**Cloudflare Worker additions to `services/mortgage-data-engine/`:**
1. **Convex sync tissue** — New module `src/sync/convex-writer.ts`:
   - Authenticated HTTP calls to Convex HTTP actions
   - Batch rate snapshot writes
   - Enrichment result writes
   - syncLog writes
2. **ai-gateway routes** — New routes in `src/api/ai-routes.ts`:
   - `POST /api/ai/command` — Cmd+K intent parsing (Llama 8B)
   - `POST /api/ai/copilot` — Contextual chat (Llama 70B)
   - `POST /api/ai/draft` — Email/SMS drafting (Llama 70B)
   - `POST /api/ai/score` — Lead scoring (Llama 8B + enrichment data)
3. **Cron update** — After rate crawls, sync to Convex
4. Tests for sync layer + AI routes (vitest + miniflare)

**Convex additions:**
5. `rates/tables.ts` — Schema
6. `rates/internals.ts` — `batchUpsert` for rate ingestion
7. `rates/queries.ts` — Rate lookup by borrower profile
8. `rates/helpers.ts` — Rate comparison, savings calculation
9. `http.ts` — HTTP action routes for Worker → Convex writes
10. Tests

**Frontend additions:**
11. Wire `CommandBar` to ai-gateway `/command` endpoint
12. Wire `CopilotPanel` to ai-gateway `/copilot` endpoint
13. Add rate display in loan detail panel

**Gate:** Cmd+K natural language → correct action dispatched. Copilot responds contextually. Rates ingested from Worker → visible in Convex → displayed in UI. Lead scoring works. syncLog accurate. All tests green.

#### Phase 7 — Enrichment Pipeline Live
**Goal:** Lead enrichment and rate scraping running in production, writing to Convex.

| Task | Verify |
|------|--------|
| Deploy mortgage-data-engine to Cloudflare | `wrangler deploy` succeeds |
| Configure Convex HTTP action secrets | Worker can authenticate to Convex |
| Run wholesale rate crawl manually | Rates appear in Convex `rateSnapshots` table |
| Trigger lead enrichment via webhook | Contact record updated with enrichment data |
| Verify cron schedules fire | Check crawl_jobs table in D1 + syncLog in Convex |
| Rate comparison in UI | Loan detail shows current rates for borrower profile |
| Enrichment display | Contact detail shows enriched data with AIContent wrapper |

**Gate:** Rates flow: D1 → Convex → UI. Enrichment flows: Webhook → D1 → Convex → UI. DPA lookup works. Regulatory feed works. All syncs logged. All tests green.

---

### Chapter 4: Advanced Features
*LOS integration, document intelligence, refi monitoring, onboarding.*

#### Phase 8 — Document Intelligence
**Goal:** OCR and AI validation for uploaded documents.

**Cloudflare Worker additions:**
1. `POST /api/doc/analyze` — Upload → OCR via Workers AI → classification → validation
2. Writes validation result back to Convex `documents` table

**Convex additions:**
3. Update document mutations to handle AI validation results
4. Feed item generation: "All docs complete → ready to submit"

**Gate:** Upload PDF → OCR extracts text → category classified correctly → validation result written → feed item generated if all docs complete.

#### Phase 9 — Refi Monitor
**Goal:** Detect refinance opportunities for funded loans.

**Cloudflare Worker additions:**
1. New cron handler: compare funded loans (fetched from Convex) vs current rates in D1
2. If savings > threshold → create feed item via Convex HTTP action

**Gate:** Rates drop → matching funded loans identified → feed items created with savings calculation → broker sees opportunity in Today view.

#### Phase 10 — LOS Integration (Separate Worker)
**Goal:** Bidirectional sync with Encompass/LendingPad.

This is a **separate Cloudflare Worker** using Durable Objects:
1. `services/los-sync/` — New Worker
2. Durable Object for persistent connection state
3. Webhook handlers for LOS events
4. Convex HTTP actions for writing sync results
5. Conflict resolution: last-write-wins with broker notification

**Gate:** Stage change in CRM → reflected in LOS. Status change in LOS → reflected in CRM. Conflicts create feed items for broker review.

---

### Chapter 5: Launch Preparation
*Onboarding, billing, polish, and production readiness.*

#### Phase 11 — Onboarding + Empty States
1. Onboarding flow (5 steps: welcome → identity → LOS connect → import/demo → first win)
2. Demo data generation (realistic loans, contacts, feed items)
3. Empty state components for every view
4. Guided first experience

**Gate:** New user completes onboarding in <5 minutes. Demo data populates all views. Every view has a useful empty state.

#### Phase 12 — Billing + Team
1. Stripe integration (subscription management)
2. Tier enforcement (solo, team, enterprise)
3. Team features: invite member, role-based access, shared pipeline

**Gate:** Subscription creation works. Tier limits enforced. Team members see shared data correctly.

#### Phase 13 — Production Hardening
1. Error tracking (Sentry or equivalent)
2. Rate limiting on all API endpoints
3. Security audit: no XSS, no injection, secrets management
4. Performance audit: no N+1 queries, pagination enforced, bundle size
5. Accessibility audit: keyboard navigation, screen reader, color contrast
6. End-to-end tests for critical flows (sign up → create contact → create loan → move through pipeline)

**Gate:** All audits pass. E2E tests green. Ready for beta users.

---

## Part 4: Verification Protocol

### 4.1 Test Pyramid

```
                    ┌─────────┐
                    │  E2E    │  3-5 critical flow tests (Playwright)
                   ┌┴─────────┴┐
                   │Integration │  Per-organ integration tests (convex-test)
                  ┌┴───────────┴┐
                  │  Unit Tests  │  Per-tissue tests (vitest)
                 ┌┴─────────────┴┐
                 │  Type Checking  │  TypeScript strict (zero errors)
                ┌┴───────────────┴┐
                │     Linting       │  ESLint (zero warnings in CI)
                └───────────────────┘
```

### 4.2 Per-Tissue Test Requirements

| Tissue Type | Test Tool | Minimum Tests |
|---|---|---|
| `validators.ts` | vitest (pure functions) | 1 valid input, 2 invalid inputs, 1 edge case |
| `helpers.ts` | vitest (pure functions) | 1 per function + edge cases |
| `stateMachine.ts` | vitest (pure functions) | 1 valid transition per state, 1 invalid per state |
| `mutations.ts` | convex-test | 1 happy path, 1 invalid input, 1 auth check per mutation |
| `queries.ts` | convex-test | 1 happy path, 1 empty result, 1 pagination, 1 auth check per query |
| `internals.ts` | convex-test | 1 per internal function |
| UI components | @testing-library/react | 1 renders correctly, 1 interaction, 1 loading/error state |
| Worker routes | vitest + miniflare | 1 success, 1 auth failure, 1 invalid input per route |

### 4.3 Phase Gate Verification Checklist

Before declaring any phase complete, run through this checklist:

```
□ All tissue test files exist
□ All tests pass (`pnpm test`)
□ TypeScript compiles with zero errors (`pnpm typecheck`)
□ No unresolved TODOs in phase code (grep -r "TODO" in organ directories)
□ All @ai-notes and @ai-modify comments are present in new files
□ File headers have @organ, @tissue, @depends-on, @depended-by
□ Manual verification of the phase gate conditions (listed in CLAUDE.md)
□ Dark mode verified for all new UI components
□ Keyboard navigation works for all new interactive elements
□ No console errors in browser dev tools
```

### 4.4 Cross-Organ Dependency Check

When modifying a tissue, always:
1. Read the `@depended-by` list in the file header
2. Run tests for all dependent tissues
3. If a dependent tissue's tests fail, fix the breakage before committing
4. Update `@depends-on` / `@depended-by` in all affected file headers

---

## Part 5: Development Workflow

### 5.1 Git Branching

```
main                    production-ready code only
├── chapter-1/phase-0   foundation work
├── chapter-2/phase-1   contacts organ
├── chapter-2/phase-2   loans + pipeline
├── ...
```

Each phase is a branch. Merge to main only after the phase gate passes. No partial merges.

### 5.2 Commit Convention

```
<organ>(<tissue>): <description>

Examples:
contacts(mutations): add create and update mutations with activity logging
loans(stateMachine): define stage transitions and validation
shell(command-bar): wire Cmd+K to navigation and create actions
pipeline(kanban-board): implement drag-and-drop with stage confirmation
```

### 5.3 Working on a Phase

```bash
# 1. Start a phase branch
git checkout -b chapter-2/phase-1

# 2. Work through tissues in order (tables → validators → helpers → tests → mutations → queries → UI)

# 3. After each tissue: run tests
pnpm test --filter=contacts

# 4. After all tissues: run full organ integration
pnpm test

# 5. Manual verification of gate conditions

# 6. Merge to main
git checkout main
git merge chapter-2/phase-1
```

### 5.4 When Something Breaks

```
1. Identify: which view/feature is broken?
2. Locate organ: which organ owns this feature?
3. Locate tissue: which tissue within the organ failed?
   - Check test output for the failing test
   - Check @depends-on to trace the dependency
4. Fix the tissue
5. Run the tissue's tests
6. Run the organ's full test suite
7. Check @depended-by — run tests for dependent tissues
8. If all green: commit the fix
```

This is the organ-tissue debugging protocol. You never have to search the whole codebase.

---

## Part 6: AI Agent Operating Manual

### 6.1 For Any Agent Starting Work

Before writing ANY code:
1. Read `CLAUDE.md` — understand the architecture and rules
2. Read this file (`IMPLEMENTATION.md`) — understand the process
3. Read `DESIGN_SYSTEM.md` — if doing UI work
4. Identify which Chapter/Phase/Organ/Tissue you're working on
5. Read the existing file headers in that organ to understand dependencies
6. Check if there are existing tests — run them first to confirm green baseline

### 6.2 For Any Agent Modifying Existing Code

1. Read the file's `@ai-notes` and `@ai-caution` blocks
2. Read the `@ai-modify` instructions on the function you're changing
3. Check `@depended-by` — understand what might break
4. Make the change
5. Run the tissue's tests
6. Run dependent tissues' tests
7. Update `@depends-on` / `@depended-by` if dependencies changed
8. Update `@ai-modify` instructions if the modification process changed

### 6.3 For Any Agent Adding a New Feature

1. Determine which organ this belongs to (or if a new organ is needed)
2. Follow the Organ Lifecycle (Part 1, Section 1.2)
3. Follow the Tissue Lifecycle for each new tissue (Part 1, Section 1.1)
4. Ensure all file headers and function comments follow the AI Agent Comment Standard
5. Do not create new organs without updating `CLAUDE.md`'s organ map

### 6.4 Forbidden Actions

- **Never skip tests.** Every tissue ships with tests.
- **Never modify `components/ui/` files.** Wrap in `primitives/` or `features/`.
- **Never hardcode colors.** Use design tokens only.
- **Never bypass auth checks.** Every query/mutation validates ownerId.
- **Never advance phases.** Complete current phase gate before starting next.
- **Never delete `@ai-notes` or `@ai-modify` comments.** They're there for a reason.
- **Never create files without the standard file header.**
