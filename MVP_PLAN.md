# LoanPilot — 2-Day MVP Sprint Plan

> Created: 2026-04-13
> Goal: Shippable CRM with auth, contacts, loans pipeline, documents, and today feed in 2 days
> Method: TDD on business logic, manual verification on UI, ruthless scope cuts

---

## Scope Decision: What's IN vs OUT

### IN (Core CRM Loop)
| Feature | Why it's essential |
|---------|-------------------|
| Clerk auth + users table | Can't have multi-tenant CRM without auth |
| Contacts CRUD + search | Primary entity — every loan needs a borrower |
| Loans CRUD + state machine | Core value prop — pipeline management |
| Pipeline kanban view | Visual loan tracking is the #1 broker workflow |
| Document tracking | Brokers need to know what docs are missing |
| Activity logging | Audit trail on every mutation |
| Today feed (rule-based) | The "what should I do now" differentiator |
| App shell + navigation | 3 views + sidebar |
| Command bar skeleton | Cmd+K opens, navigates — no AI parsing |

### OUT (Deferred Post-MVP)
| Feature | Why it's cut | When to add |
|---------|-------------|-------------|
| Cloudflare Workers sync | Existing crawlers work standalone; sync adds complexity | Week 2 |
| AI copilot panel | Needs ai-gateway Worker not yet built | Week 2 |
| AI lead/health scoring | Needs Cloudflare Workers AI integration | Week 2 |
| Email/SMS (SendGrid/Twilio) | External API integration; templates can exist without sending | Week 2 |
| File upload (Convex storage) | Doc tracking works without actual files | Week 2 |
| Rate display/comparison | Data exists in D1 but no sync to Convex yet | Week 3 |
| LOS integration | Separate Worker with Durable Objects — heavy lift | Month 2 |
| Stripe billing | No payment wall for MVP testing | Month 2 |
| Team features | Solo broker is the MVP user | Month 2 |
| Onboarding flow | Demo data seed is faster to build | Week 2 |
| Relationship map | Nice-to-have viz, not core workflow | Week 3 |
| Dark mode | shadcn supports it; toggle it on later | Week 2 |

---

## Risk Mitigation Strategy

| Risk | Mitigation |
|------|-----------|
| Bugs in state machine break pipeline | TDD: write transition tests BEFORE implementation |
| Multi-tenant data leak | TDD: write ownerId isolation tests for every query/mutation |
| Schema changes later break everything | Design ALL 8 organ schemas upfront (Day 1 Block 1), even if only 6 are implemented |
| No tests on business logic | Test validators + helpers + state machine first (pure functions, fast) |
| UI bugs slip through | Manual verification checklist at end of each block |
| Convex schema drift from CLAUDE.md | Use CLAUDE.md schema definitions verbatim — single source of truth |
| Scope creep during implementation | This document is the scope. If it's not listed, it doesn't exist |

---

## Quality Gates (Non-Negotiable)

Every block must pass its gate before the next block starts:

1. **All tests pass** (`pnpm test` green)
2. **TypeScript compiles** (`tsc --noEmit` clean)
3. **No `.collect()` without pagination** on list queries
4. **Every mutation checks `ownerId`** for multi-tenant isolation
5. **Every mutation sets `updatedAt: Date.now()`**
6. **Every write mutation logs to `activities`** (stage changes, creates, archives)
7. **`isArchived` filtered** in every list query

---

## Day 1: Foundation + Backend

### Block 1 — Scaffolding + Schema (2-3h)
**Goal:** Monorepo structure, all dependencies installed, Convex schema deployed, Clerk auth working.

**Tasks:**
1. Create `apps/web/` — Next.js 15 (App Router) + TypeScript + Tailwind CSS v4
2. Init Convex inside `apps/web/` (`npx convex dev`)
3. Install dependencies: shadcn/ui, cmdk, @dnd-kit/core, lucide-react, convex, clerk
4. Set up Clerk (install @clerk/nextjs, configure middleware, env vars)
5. Configure Tailwind with design system tokens from DESIGN_SYSTEM.md (globals.css)
6. Init shadcn (`pnpm dlx shadcn@latest init` — Zinc base, CSS variables)
7. Add shadcn components: button, input, card, badge, dialog, command, select, table, scroll-area, separator, dropdown-menu, sheet, avatar, tooltip, skeleton, tabs
8. Create ALL organ schemas (deploy schema even for organs built later):
   - `convex/schema.ts` — composed from all organ table files
   - `convex/core/tables.ts` — users + syncLog
   - `convex/contacts/tables.ts` — contacts
   - `convex/loans/tables.ts` — loans
   - `convex/documents/tables.ts` — documents
   - `convex/activities/tables.ts` — activities
   - `convex/feed/tables.ts` — feedItems
   - `convex/templates/tables.ts` — templates (schema only, no functions yet)
   - `convex/rates/tables.ts` — rateSnapshots (schema only, no functions yet)
9. Set up vitest (`vitest.config.ts`, `convex-test` dependency)
10. Create `convex/types.ts` — shared TypeScript types

**Gate:** `npx convex dev` deploys schema successfully. `pnpm test` runs (even if no tests yet). Clerk auth redirects to sign-in. TypeScript compiles clean.

**Files created:**
```
apps/web/
  package.json, next.config.ts, tsconfig.json, tailwind.config.ts
  src/app/globals.css (design tokens)
  convex/
    schema.ts
    types.ts
    core/tables.ts
    contacts/tables.ts
    loans/tables.ts
    documents/tables.ts
    activities/tables.ts
    feed/tables.ts
    templates/tables.ts
    rates/tables.ts
  vitest.config.ts
```

---

### Block 2 — Core Organ + Auth (1-2h)
**Goal:** User signs up via Clerk, user record created in Convex, session persists.

**Tasks (TDD order):**
1. `convex/core/validators.ts` — input validation for user creation/update
2. `convex/core/helpers.ts` — pure helper functions (if any)
3. **Tests:** `convex/core/__tests__/validators.test.ts`
4. `convex/core/mutations.ts` — `createOrGetUser` (called on first auth)
5. `convex/core/queries.ts` — `getCurrentUser`, `getUserById`
6. `convex/core/internals.ts` — internal queries/mutations
7. **Tests:** `convex/core/__tests__/mutations.test.ts` — user creation, duplicate handling
8. **Tests:** `convex/core/__tests__/queries.test.ts` — user fetch, missing user

**Gate:** Tests pass. User record created in Convex on Clerk sign-in. `getCurrentUser` returns the authenticated user.

---

### Block 3 — Contacts Organ (2-3h)
**Goal:** Full contacts CRUD with search, filtering, pagination, activity logging.

**Tasks (TDD order):**
1. `convex/contacts/validators.ts` — input validators (create, update, archive)
2. `convex/contacts/helpers.ts` — pure functions (formatting, search helpers)
3. **Tests:** `convex/contacts/__tests__/validators.test.ts` — valid/invalid inputs
4. **Tests:** `convex/contacts/__tests__/helpers.test.ts`
5. `convex/activities/mutations.ts` — `logActivity` internal mutation (needed by contacts)
6. `convex/activities/queries.ts` — `listByContact`, `listByLoan`
7. `convex/contacts/mutations.ts` — `create`, `update`, `archive` (each logs activity)
8. `convex/contacts/queries.ts` — `list` (paginated), `getById`, `search`
9. `convex/contacts/internals.ts` — internal helpers
10. **Tests:** `convex/contacts/__tests__/mutations.test.ts` — CRUD + ownerId isolation
11. **Tests:** `convex/contacts/__tests__/queries.test.ts` — pagination, search, archive filtering

**Gate:** All tests pass. Create/read/update/archive contacts. Search by name. Filter by type. Activity logged on every write. User A cannot see User B's contacts.

---

### Block 4 — Loans Organ + State Machine (2-3h)
**Goal:** Loan CRUD, stage transitions enforced, stage history tracked.

**Tasks (TDD order):**
1. `convex/loans/validators.ts` — input validators
2. `convex/loans/stateMachine.ts` — `STAGE_TRANSITIONS` map + `canTransition()` + `getNextStages()`
3. `convex/loans/helpers.ts` — `daysInStage()`, `getStageGroup()`, stage display helpers
4. **Tests:** `convex/loans/__tests__/stateMachine.test.ts` — ALL valid transitions, ALL invalid transitions, terminal states
5. **Tests:** `convex/loans/__tests__/validators.test.ts`
6. **Tests:** `convex/loans/__tests__/helpers.test.ts`
7. `convex/loans/mutations.ts` — `create`, `update`, `updateStage`, `archive`
8. `convex/loans/queries.ts` — `listByStage` (for kanban), `getById`, `listByContact`
9. **Tests:** `convex/loans/__tests__/mutations.test.ts` — CRUD, stage transition enforcement, ownerId isolation, stage history recording
10. **Tests:** `convex/loans/__tests__/queries.test.ts` — stage filtering, pagination

**Gate:** All tests pass. Create loan linked to contact. Move through valid stages — invalid transitions throw. Stage history recorded with timestamps. ownerId enforced.

---

## Day 2: Frontend + Feed + Polish

### Block 5 — App Shell + Contacts UI (2-3h)
**Goal:** Working app shell with sidebar navigation, contacts list with create/edit/search.

**Tasks:**
1. `src/app/layout.tsx` — root layout with Clerk provider + Convex provider
2. `src/components/shell/sidebar.tsx` — 3-view nav (Today, Pipeline, Contacts) + user menu
3. `src/components/shell/command-bar.tsx` — Cmd+K opens, basic navigation commands
4. `src/app/today/page.tsx` — placeholder (built in Block 7)
5. `src/app/pipeline/page.tsx` — placeholder (built in Block 6)
6. `src/app/contacts/page.tsx` — contacts list
7. `src/hooks/useCurrentUser.ts` — wraps Convex query + Clerk
8. `src/components/shared/loading-state.tsx` — skeleton loader
9. `src/components/shared/empty-state.tsx` — empty state component
10. `src/components/shared/pagination.tsx` — reusable pagination
11. `src/components/contacts/contact-list.tsx` — paginated table with search + type filter
12. `src/components/contacts/contact-form.tsx` — create/edit form (dialog)
13. `src/components/contacts/contact-detail.tsx` — detail panel (sheet) with activity timeline

**Gate:** App renders. Sidebar navigates between 3 views. Cmd+K opens. Contacts: create, list, search, filter, view detail. Loading/empty states render. Manual verification: create 3 contacts, search, filter, view detail.

---

### Block 6 — Pipeline Kanban UI (2-3h)
**Goal:** Visual pipeline with drag-and-drop stage transitions.

**Tasks:**
1. `src/hooks/usePipeline.ts` — query loans grouped by stage group (Intake, Qualification, Processing, Closing)
2. `src/components/pipeline/kanban-board.tsx` — horizontal scroll layout with 4+ columns
3. `src/components/pipeline/stage-column.tsx` — column with stage header + loan cards
4. `src/components/pipeline/loan-card.tsx` — borrower name, amount, days-in-stage badge, stage pill
5. `src/components/pipeline/loan-form.tsx` — create loan (select contact, loan details)
6. `src/components/pipeline/loan-detail.tsx` — slide-out sheet with full loan info, stage history, linked docs, activities
7. `src/app/pipeline/page.tsx` — full pipeline view with "Add Loan" button
8. Drag-and-drop: @dnd-kit to move cards between valid stages (validate transitions client-side, enforce server-side)

**Gate:** Pipeline renders loans in correct columns. Drag card to valid stage — updates server + UI. Drag to invalid stage — rejected with toast. Create loan from pipeline view. Loan detail shows stage history. Manual verification: create 5 loans across stages, drag between stages, verify history.

---

### Block 7 — Documents + Feed + Today View (2-3h)
**Goal:** Document tracking per loan, rule-based feed items, Today view.

**Tasks:**
1. `convex/documents/validators.ts` + `convex/documents/mutations.ts` — `requestDoc`, `markUploaded`, `updateStatus`
2. `convex/documents/queries.ts` — `listByLoan`, `listOverdue`
3. **Tests:** `convex/documents/__tests__/mutations.test.ts` — status transitions, ownerId
4. `convex/feed/helpers.ts` — rule-based feed generation logic:
   - Doc overdue 3+ days -> `doc_follow_up` (high priority)
   - Loan in stage 7+ days -> `pipeline_update` (medium)
   - Contact untouched 14+ days -> `relationship_touch` (low)
   - Lock expires in 3 days -> `condition_due` (urgent)
5. `convex/feed/mutations.ts` — `create`, `complete`, `snooze`, `dismiss`
6. `convex/feed/queries.ts` — `listActive` (by priority)
7. **Tests:** `convex/feed/__tests__/helpers.test.ts` — each rule generates correct item type + priority
8. `src/components/today/feed-list.tsx` — priority-sorted feed cards
9. `src/components/today/feed-card.tsx` — title, description, action button, dismiss
10. `src/app/today/page.tsx` — Today view with feed list
11. `src/components/documents/doc-list.tsx` — document checklist per loan (in loan detail)
12. `src/components/documents/doc-request.tsx` — request document dialog

**Gate:** Documents: request, mark uploaded, list by loan. Feed: items generated by rules, complete/snooze/dismiss work, sorted by priority. Today view renders feed. Manual verification: create overdue docs, verify feed items appear.

---

### Block 8 — Polish + Final Verification (1-2h)
**Goal:** Everything works end-to-end, all tests pass, no broken states.

**Tasks:**
1. Run full test suite — fix any failures
2. TypeScript strict check — fix any errors
3. Empty states on all views (no contacts, no loans, no feed items)
4. Loading skeletons on all data-fetching views
5. Error boundaries on all pages
6. Responsive check (sidebar collapses on mobile)
7. Seed demo data script (optional: `convex/seed.ts` for demo)

**End-to-end verification checklist:**
- [ ] Sign up with Clerk -> user created in Convex
- [ ] Create 3 contacts (lead, borrower, realtor)
- [ ] Search contacts by name
- [ ] Filter contacts by type
- [ ] Create 2 loans linked to contacts
- [ ] Move loans through pipeline stages (drag + detail panel)
- [ ] Verify invalid transitions are rejected
- [ ] Request docs for a loan
- [ ] Mark docs as uploaded
- [ ] Feed items appear for overdue/stale items
- [ ] Complete/dismiss feed items
- [ ] Activity timeline shows all actions
- [ ] User A cannot see User B's data (test with 2 accounts)
- [ ] Cmd+K opens and navigates between views

---

## Test Coverage Strategy

### Must Test (Business Logic — TDD)
| File | What to test | Min tests |
|------|-------------|-----------|
| `loans/stateMachine.ts` | All 13 stages, valid + invalid transitions, terminal states | 15+ |
| `contacts/validators.ts` | Valid inputs, missing required fields, invalid types | 5+ |
| `loans/validators.ts` | Valid inputs, invalid loan types, bad FICO/LTV ranges | 5+ |
| `contacts/mutations.ts` | CRUD, ownerId isolation, activity logging | 6+ |
| `loans/mutations.ts` | CRUD, stage transitions, history recording, ownerId | 8+ |
| `documents/mutations.ts` | Status transitions, ownerId | 4+ |
| `feed/helpers.ts` | Each rule generates correct feed item type + priority | 4+ |
| `core/mutations.ts` | User creation, duplicate handling | 3+ |
| `*/queries.ts` | Pagination, archive filtering, ownerId isolation | 3+ per organ |

### Skip Tests (Manual Verification)
- UI components (verify visually)
- Drag-and-drop interactions
- Clerk auth flow (integration test, not unit)
- CSS/styling

**Target: ~60+ tests covering all backend business logic**

---

## File Structure (Final)

```
apps/web/
  convex/
    schema.ts                    # Composed from all organ tables
    types.ts                     # Shared types
    core/
      tables.ts, validators.ts, helpers.ts, mutations.ts, queries.ts, internals.ts
      __tests__/ (validators, mutations, queries)
    contacts/
      tables.ts, validators.ts, helpers.ts, mutations.ts, queries.ts, internals.ts
      __tests__/ (validators, helpers, mutations, queries)
    loans/
      tables.ts, validators.ts, helpers.ts, stateMachine.ts, mutations.ts, queries.ts, internals.ts
      __tests__/ (stateMachine, validators, helpers, mutations, queries)
    documents/
      tables.ts, validators.ts, mutations.ts, queries.ts
      __tests__/ (mutations, queries)
    activities/
      tables.ts, mutations.ts, queries.ts, internals.ts
      __tests__/ (mutations)
    feed/
      tables.ts, helpers.ts, mutations.ts, queries.ts
      __tests__/ (helpers, mutations)
    templates/
      tables.ts                  # Schema only — no functions in MVP
    rates/
      tables.ts                  # Schema only — no functions in MVP
  src/
    app/
      layout.tsx                 # Shell: Clerk + Convex providers
      page.tsx                   # Redirect to /today
      today/page.tsx             # Feed view
      pipeline/page.tsx          # Kanban view
      contacts/page.tsx          # Contacts list
    components/
      shell/
        sidebar.tsx, command-bar.tsx
      shared/
        loading-state.tsx, empty-state.tsx, pagination.tsx
      contacts/
        contact-list.tsx, contact-form.tsx, contact-detail.tsx
      pipeline/
        kanban-board.tsx, stage-column.tsx, loan-card.tsx, loan-form.tsx, loan-detail.tsx
      documents/
        doc-list.tsx, doc-request.tsx
      today/
        feed-list.tsx, feed-card.tsx
    hooks/
      useCurrentUser.ts, usePipeline.ts
    lib/
      utils.ts, constants.ts
  vitest.config.ts
  package.json
```

---

## Key Architecture Decisions for Speed

1. **All schemas deployed upfront** — even organs not implemented yet. Prevents schema migration pain later.
2. **shadcn defaults** — use Zinc theme out of the box. Custom tokens from DESIGN_SYSTEM.md globals.css only.
3. **No Cloudflare integration** — Worker code stays as-is at `mortgage-data-engine/`. Sync built post-MVP.
4. **No file upload** — documents are tracked (requested/uploaded status) but no actual file storage in MVP.
5. **No email/SMS** — templates table has schema but no send functions.
6. **Command bar = navigation only** — Cmd+K opens, type to navigate. No AI intent parsing.
7. **Feed rules are simple** — 4 rules hardcoded in helpers. No AI generation. Cron or manual trigger.
8. **Optimistic updates** on stage transitions and feed actions for snappy UX.
9. **Single Convex deployment** — no staging/prod split for MVP.
