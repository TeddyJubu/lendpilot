# LoanPilot — AI-Native Mortgage Broker CRM

## Product Vision
An AI-first CRM where the broker handles decisions and the AI handles everything else.
3 views (Today, Pipeline, Contacts) + Cmd+K command bar + AI Copilot panel.
Full PRD: `docs/PRD.md`

## Stack
- **Frontend:** Next.js 15 (App Router) + TypeScript + Tailwind CSS + shadcn/ui + cmdk
- **Backend:** Convex (real-time DB, serverless functions, file storage, cron triggers)
- **Intelligence:** Cloudflare Workers AI + Durable Objects + R2 + KV + Vectorize
- **Auth:** Clerk (Convex integration)
- **Comms:** SendGrid (email) + Twilio (SMS/voice)
- **Payments:** Stripe
- **Testing:** Vitest + convex-test
- **Hosting:** Cloudflare Pages (frontend) or Vercel

---

## Architecture: Organ-Tissue Pattern

### Principles
- An **Organ** is a self-contained domain module owning one feature area end-to-end.
- A **Tissue** is a single-responsibility unit inside an organ — one job, fully testable alone.
- Organs NEVER reach into each other's internals. They communicate only through IDs and defined interfaces.
- If something breaks: identify the organ → inspect its tissues → fix or swap the failing tissue.
- A tissue can be swapped without touching other tissues. An organ can be swapped without touching other organs.

### Rule: Convex Owns State. Cloudflare Owns Intelligence.
All persistent data lives in Convex. All AI inference, external scraping, and heavy computation runs on Cloudflare Workers. Cloudflare writes back to Convex via authenticated HTTP actions. The frontend reads only from Convex (real-time via WebSocket).

---

## Organ Map

### Convex Organs (State Layer)
```
core        — users, auth (Clerk), permissions, onboarding, syncLog
contacts    — people, lead source tracking, enrichment fields, relationship metadata
loans       — pipeline, stages, state machine, rate locks, LOS references, health scores
documents   — upload tracking, categories, validation status, OCR results
activities  — communication log, stage changes, system events, AI actions
feed        — AI action feed items (Today view), priority, suggestions
templates   — email/SMS/condition-response templates, variables
rates       — rate snapshots from scraper, product lookups
```

### Cloudflare Workers (Intelligence Layer — separate repo/deployment)
```
ai-gateway      — Cmd+K intent parsing, copilot chat, email drafting, lead scoring, summarization
rate-scraper    — wholesale (4h) + retail (daily) + DPA (weekly) via Firecrawl → Convex HTTP action
lead-enricher   — triggered on contact.created → Zillow/Redfin/LinkedIn → enrichment write-back
los-sync        — Durable Object for Encompass/LendingPad bidirectional sync
doc-intel       — OCR via Workers AI, validation, classification → update document record
refi-monitor    — compare funded loans vs current rates → create feed items for opportunities
```

### Frontend Organs (UI Layer)
```
shell       — layout, sidebar nav, Cmd+K command bar
today       — AI feed view (feedItems organ)
pipeline    — horizontal kanban (loans organ)
contacts    — list + relationship map (contacts organ)
copilot     — AI sidebar panel (calls Cloudflare ai-gateway)
settings    — user preferences, integrations, onboarding
```

---

## Tissue Anatomy (same in every Convex organ)

```
convex/<organ>/
  tables.ts         tissue: defineTable() + indexes (imported by schema.ts)
  validators.ts     tissue: input validation rules (pure functions — easiest to test)
  queries.ts        tissue: all read operations (exported for client use)
  mutations.ts      tissue: all write operations (exported for client use)
  internals.ts      tissue: internal mutations/queries (not callable from client)
  helpers.ts        tissue: pure business logic (no Convex ctx, no side effects)
  __tests__/
    validators.test.ts
    helpers.test.ts
    mutations.test.ts
    queries.test.ts
```

Additional tissues where applicable:
- `stateMachine.ts` — valid state transitions (loans, documents)
- `scoring.ts` — scoring logic for helpers (contacts)

---

## Schema

All tables are defined in organ-level `tables.ts` files and composed in `convex/schema.ts`.

### Standard Fields (every table)
```ts
updatedAt: v.number(),       // Date.now() — set on every write
isArchived: v.boolean(),     // false default — soft delete for CRM
// _creationTime is automatic in Convex — no explicit createdAt needed
```

### core/tables.ts — Users + SyncLog
```ts
users: defineTable({
  clerkId: v.string(),
  email: v.string(),
  name: v.string(),
  nmlsId: v.optional(v.string()),
  companyName: v.optional(v.string()),
  phone: v.optional(v.string()),
  tier: v.union(v.literal("trial"), v.literal("solo"), v.literal("team"), v.literal("enterprise")),
  stripeCustomerId: v.optional(v.string()),
  trialEndsAt: v.optional(v.number()),
  losProvider: v.optional(v.string()),
  losCredentialRef: v.optional(v.string()),  // encrypted ref in CF KV — never the actual creds
  defaultStates: v.optional(v.array(v.string())),
  preferredLenders: v.optional(v.array(v.string())),
  notificationPrefs: v.optional(v.any()),
  onboardingCompleted: v.boolean(),
  onboardingStep: v.optional(v.string()),
  updatedAt: v.number(),
})
  .index("by_clerk", ["clerkId"])
  .index("by_email", ["email"]),

syncLog: defineTable({
  source: v.string(),          // "rate-scraper", "lead-enricher", "los-sync"
  syncedAt: v.number(),
  recordsProcessed: v.number(),
  recordsCreated: v.number(),
  recordsUpdated: v.number(),
  recordsSkipped: v.number(),
  errors: v.array(v.string()),
  durationMs: v.number(),
})
  .index("by_source", ["source", "syncedAt"]),
```

### contacts/tables.ts
```ts
contacts: defineTable({
  ownerId: v.id("users"),
  firstName: v.string(),
  lastName: v.string(),
  email: v.optional(v.string()),
  phone: v.optional(v.string()),
  type: v.union(
    v.literal("lead"), v.literal("borrower"), v.literal("referral_partner"),
    v.literal("realtor"), v.literal("other")
  ),
  source: v.optional(v.union(
    v.literal("website"), v.literal("referral"), v.literal("zillow"),
    v.literal("realtor_com"), v.literal("social"), v.literal("manual"), v.literal("import")
  )),
  referredBy: v.optional(v.id("contacts")),
  // AI enrichment (written by lead-enricher Worker)
  enrichment: v.optional(v.object({
    jobTitle: v.optional(v.string()),
    employer: v.optional(v.string()),
    estimatedIncomeBracket: v.optional(v.string()),
    linkedinUrl: v.optional(v.string()),
    enrichedAt: v.number(),
  })),
  leadScore: v.optional(v.number()),           // 0-100
  leadScoreFactors: v.optional(v.string()),    // AI explanation
  leadScoredAt: v.optional(v.number()),
  relationshipScore: v.optional(v.number()),   // AI-computed
  lastContactedAt: v.optional(v.number()),
  nextTouchDue: v.optional(v.number()),
  tags: v.optional(v.array(v.string())),
  notes: v.optional(v.string()),
  isArchived: v.boolean(),
  updatedAt: v.number(),
})
  .index("by_owner", ["ownerId", "isArchived"])
  .index("by_type", ["ownerId", "type"])
  .index("by_lead_score", ["ownerId", "leadScore"])
  .index("by_next_touch", ["ownerId", "nextTouchDue"])
  .searchIndex("search_name", { searchField: "firstName", filterFields: ["ownerId", "type"] }),
```

### loans/tables.ts
```ts
loans: defineTable({
  contactId: v.id("contacts"),
  ownerId: v.id("users"),
  loanAmount: v.optional(v.number()),
  propertyAddress: v.optional(v.string()),
  propertyType: v.optional(v.union(
    v.literal("SFR"), v.literal("Condo"), v.literal("Townhouse"),
    v.literal("Multi_2_4"), v.literal("Manufactured")
  )),
  occupancy: v.optional(v.union(
    v.literal("Primary"), v.literal("Second_Home"), v.literal("Investment")
  )),
  loanType: v.optional(v.union(
    v.literal("Conventional"), v.literal("FHA"), v.literal("VA"),
    v.literal("USDA"), v.literal("Jumbo"), v.literal("Non_QM"), v.literal("DSCR")
  )),
  fico: v.optional(v.number()),
  ltv: v.optional(v.number()),
  dti: v.optional(v.number()),
  // Pipeline
  stage: v.union(
    v.literal("new_lead"), v.literal("scored"), v.literal("contacted"),
    v.literal("pre_qualified"), v.literal("application_filed"), v.literal("docs_collecting"),
    v.literal("submitted_to_lender"), v.literal("in_underwriting"),
    v.literal("conditions"), v.literal("clear_to_close"),
    v.literal("closing_scheduled"), v.literal("funded"),
    v.literal("withdrawn"), v.literal("denied")
  ),
  stageEnteredAt: v.number(),
  stageHistory: v.array(v.object({
    stage: v.string(),
    enteredAt: v.number(),
    exitedAt: v.optional(v.number()),
  })),
  // Rate lock
  lockedRate: v.optional(v.number()),
  lockedLender: v.optional(v.string()),
  lockExpiration: v.optional(v.number()),
  // LOS
  losId: v.optional(v.string()),
  losProvider: v.optional(v.union(v.literal("encompass"), v.literal("lending_pad"))),
  lastLosSyncAt: v.optional(v.number()),
  // Property enrichment (written by lead-enricher Worker)
  propertyEnrichment: v.optional(v.object({
    estimatedValue: v.optional(v.number()),
    lastSalePrice: v.optional(v.number()),
    bedrooms: v.optional(v.number()),
    bathrooms: v.optional(v.number()),
    sqft: v.optional(v.number()),
    yearBuilt: v.optional(v.number()),
    taxAnnual: v.optional(v.number()),
    enrichedAt: v.number(),
  })),
  // AI fields
  healthScore: v.optional(v.number()),         // 0-100
  nextAction: v.optional(v.string()),
  nextActionType: v.optional(v.string()),      // "call", "email", "chase_doc", etc.
  aiSummary: v.optional(v.string()),
  estimatedCloseDate: v.optional(v.number()),
  actualCloseDate: v.optional(v.number()),
  loanValue: v.optional(v.number()),           // commission value
  isArchived: v.boolean(),
  updatedAt: v.number(),
})
  .index("by_owner_stage", ["ownerId", "stage", "isArchived"])
  .index("by_contact", ["contactId"])
  .index("by_stage_entered", ["ownerId", "stage", "stageEnteredAt"])
  .index("by_health", ["ownerId", "healthScore"])
  .index("by_los", ["losProvider", "losId"]),
```

### Loan Stage State Machine (loans/stateMachine.ts)
```ts
// Valid transitions — enforce in every stage-change mutation
const STAGE_TRANSITIONS: Record<string, string[]> = {
  // Intake
  new_lead:             ["scored", "contacted", "withdrawn"],
  scored:               ["contacted", "withdrawn"],
  contacted:            ["pre_qualified", "withdrawn"],
  // Qualification
  pre_qualified:        ["application_filed", "withdrawn"],
  application_filed:    ["docs_collecting", "withdrawn"],
  docs_collecting:      ["submitted_to_lender", "withdrawn"],
  // Processing
  submitted_to_lender:  ["in_underwriting", "withdrawn", "denied"],
  in_underwriting:      ["conditions", "clear_to_close", "denied"],
  conditions:           ["in_underwriting", "clear_to_close", "denied"],
  clear_to_close:       ["closing_scheduled"],
  // Closing
  closing_scheduled:    ["funded", "withdrawn"],
  // Terminal (can reopen)
  withdrawn:            ["new_lead"],
  denied:               ["new_lead"],
  funded:               [],   // true terminal
};
```

### documents/tables.ts
```ts
documents: defineTable({
  loanId: v.id("loans"),
  contactId: v.id("contacts"),
  ownerId: v.id("users"),
  name: v.string(),
  category: v.union(
    v.literal("income"), v.literal("asset"), v.literal("identity"),
    v.literal("property"), v.literal("credit"), v.literal("closing"),
    v.literal("condition"), v.literal("other")
  ),
  status: v.union(
    v.literal("requested"), v.literal("uploaded"), v.literal("ai_reviewing"),
    v.literal("approved"), v.literal("rejected"), v.literal("expired")
  ),
  storageId: v.optional(v.id("_storage")),
  r2Key: v.optional(v.string()),
  fileType: v.optional(v.string()),
  fileSize: v.optional(v.number()),
  ocrResult: v.optional(v.string()),
  aiValidation: v.optional(v.object({
    isValid: v.boolean(),
    issues: v.optional(v.array(v.string())),
    confidence: v.number(),
    validatedAt: v.number(),
  })),
  requestedAt: v.optional(v.number()),
  uploadedAt: v.optional(v.number()),
  dueDate: v.optional(v.number()),
  remindersSent: v.number(),
  isArchived: v.boolean(),
  updatedAt: v.number(),
})
  .index("by_loan", ["loanId", "category"])
  .index("by_status", ["loanId", "status"])
  .index("by_due", ["ownerId", "status", "dueDate"]),
```

### activities/tables.ts
```ts
activities: defineTable({
  loanId: v.optional(v.id("loans")),
  contactId: v.id("contacts"),
  ownerId: v.id("users"),
  type: v.union(
    v.literal("email_sent"), v.literal("email_received"),
    v.literal("sms_sent"), v.literal("sms_received"),
    v.literal("call_made"), v.literal("call_received"),
    v.literal("note"), v.literal("stage_change"),
    v.literal("doc_uploaded"), v.literal("doc_requested"),
    v.literal("ai_action"), v.literal("system")
  ),
  subject: v.optional(v.string()),
  body: v.optional(v.string()),
  metadata: v.optional(v.any()),
  isAiGenerated: v.boolean(),
  aiConfidence: v.optional(v.number()),
  timestamp: v.number(),
})
  .index("by_loan", ["loanId", "timestamp"])
  .index("by_contact", ["contactId", "timestamp"])
  .index("by_owner_recent", ["ownerId", "timestamp"]),
```

### feed/tables.ts
```ts
feedItems: defineTable({
  ownerId: v.id("users"),
  type: v.union(
    v.literal("hot_lead"), v.literal("condition_due"), v.literal("rate_opportunity"),
    v.literal("doc_follow_up"), v.literal("pipeline_update"),
    v.literal("relationship_touch"), v.literal("closing_prep"), v.literal("ai_insight")
  ),
  priority: v.union(v.literal("urgent"), v.literal("high"), v.literal("medium"), v.literal("low")),
  title: v.string(),
  description: v.string(),
  suggestedAction: v.string(),
  suggestedActionType: v.string(),
  reasoning: v.optional(v.string()),
  loanId: v.optional(v.id("loans")),
  contactId: v.optional(v.id("contacts")),
  status: v.union(v.literal("active"), v.literal("snoozed"), v.literal("completed"), v.literal("dismissed")),
  snoozedUntil: v.optional(v.number()),
  completedAt: v.optional(v.number()),
  updatedAt: v.number(),
})
  .index("by_owner_active", ["ownerId", "status", "priority"]),
```

### templates/tables.ts
```ts
templates: defineTable({
  ownerId: v.id("users"),
  name: v.string(),
  type: v.union(
    v.literal("email"), v.literal("sms"),
    v.literal("condition_response"), v.literal("pre_approval")
  ),
  subject: v.optional(v.string()),
  body: v.string(),
  variables: v.array(v.string()),
  isAiGenerated: v.boolean(),
  usageCount: v.number(),
  isArchived: v.boolean(),
  updatedAt: v.number(),
})
  .index("by_owner_type", ["ownerId", "type"]),
```

### rates/tables.ts
```ts
rateSnapshots: defineTable({
  lenderId: v.string(),
  lenderName: v.string(),
  productType: v.string(),
  rate: v.number(),
  apr: v.number(),
  points: v.number(),
  lockPeriodDays: v.number(),
  ltvMin: v.number(),
  ltvMax: v.number(),
  ficoMin: v.number(),
  ficoMax: v.number(),
  loanAmountMin: v.number(),
  loanAmountMax: v.number(),
  propertyType: v.string(),
  occupancy: v.string(),
  compToBrokerBps: v.optional(v.number()),
  effectiveDate: v.number(),
  expirationDate: v.number(),
  crawledAt: v.number(),
  source: v.union(v.literal("wholesale"), v.literal("retail")),
})
  .index("by_product_lookup", ["productType", "occupancy", "propertyType", "crawledAt"])
  .index("by_lender", ["lenderId", "crawledAt"])
  .index("by_fico_range", ["ficoMin", "ficoMax"]),
```

---

## Convex Function Rules

### Queries
- Every list query MUST paginate via `paginationOptsValidator` — no `.collect()` on user-facing lists.
- Always filter `isArchived === false` unless explicitly fetching archived records.
- Never return full documents when the UI needs a subset — select specific fields.
- Every query checks `ownerId === ctx.auth.userId` for multi-tenant isolation.

### Mutations
- Validate all inputs server-side in the mutation — never trust client data.
- Always set `updatedAt: Date.now()` on every write.
- Return the created/updated document `_id` at minimum.
- Log to `activities` table for meaningful state changes (stage transitions, doc events, contact updates).
- Convex mutations are transactional — keep multi-step operations in one mutation.

### Actions (external calls only)
- Use actions ONLY for calling Cloudflare Workers or external APIs.
- Actions are NOT transactional — handle partial failure explicitly.
- Always persist data via `ctx.runMutation()` — never write DB directly in an action.

### HTTP Actions (Cloudflare → Convex ingestion)
- Validate `Authorization: Bearer <secret>` — reject without it.
- Accept batches (max 100 records per request).
- Return structured JSON: `{ success: true, created: N, updated: N, errors: [] }`.
- Idempotent: upserting same record twice = identical state.
- Write to `syncLog` after every batch.

```ts
// convex/http.ts — route pattern
export const ingestRates = httpAction(async (ctx, request) => {
  if (request.headers.get("Authorization") !== `Bearer ${process.env.INGESTION_SECRET}`)
    return new Response("Unauthorized", { status: 401 });
  const { records } = await request.json();
  const result = await ctx.runMutation(internal.rates.internals.batchUpsert, { records });
  return Response.json(result);
});
```

---

## Cloudflare Worker Rules

- Workers are a **separate deployment** from the Convex app. Different repo or monorepo workspace.
- Every Worker that writes to Convex uses the same HTTP action auth pattern (Bearer token).
- Workers AI model selection: 8B for fast classification (<200ms), 70B for quality generation (<2s).
- All Workers log to `syncLog` via Convex HTTP action after completing a job.
- Rate scraper validates before sending to Convex: rate 2-15%, APR > rate, FICO 300-850, no duplicates.
- Lead enricher caches: 24h for property data, 30d for person data.
- LOS sync uses Durable Objects for persistent WebSocket + conflict resolution.

---

## Frontend Rules

- All DB reads use Convex `useQuery()` — no `fetch`/`useEffect` for Convex data.
- Every query hook handles: loading state, error state, empty state. Not just happy path.
- Pagination is a reusable component — build once in `shared/`, use in every list view.
- Forms validate client-side (UX) AND server-side in Convex mutation (security).
- Use optimistic updates for CRM actions (completing feed items, updating stages).
- Command bar built on `cmdk` (shadcn Command). Natural language → Cloudflare ai-gateway for intent classification.
- Copilot panel calls Cloudflare ai-gateway directly via HTTP — NOT through Convex.
- Component structure mirrors organs: `components/pipeline/`, `components/contacts/`, etc.

---

## Error Handling

```ts
import { ConvexError } from "convex/values";
// User-facing — shown in UI toast
throw new ConvexError("A contact with this email already exists.");
// Internal — logged, generic message shown to user
throw new Error(`Invalid stage transition: ${from} → ${to}`);
```

- HTTP actions return JSON errors with status codes, never HTML.
- Frontend: `ConvexError` → show `.data` message. `Error` → show "Something went wrong."

---

## TypeScript Rules

- `strict: true` always, no exceptions.
- No `any` unless wrapping untyped external API response that you immediately validate.
- Use Convex generated types from `_generated/` — never hand-write document types.
- Shared types go in `convex/types.ts` (used by both backend and frontend).

---

## Testing Rules

- Every tissue has its own test file. No tissue ships without tests.
- Test runner: Vitest. Convex functions: `convex-test` (in-memory Convex runtime).
- Test order: validators → helpers → stateMachine → mutations → queries.
- Every test: **Arrange → Act → Assert** — no exceptions.
- Cover: happy path, invalid input, edge cases, auth (wrong user can't access).
- A phase gate is not passed until ALL tissues in that phase have green tests.

```ts
import { convexTest } from "convex-test";
import { expect, test, describe } from "vitest";
import { api, internal } from "../_generated/api";
import schema from "../schema";

describe("loans / stateMachine tissue", () => {
  test("rejects invalid stage transition", async () => {
    const t = convexTest(schema);
    // ... setup user + contact + loan in "new_lead" stage
    await expect(
      t.mutation(api.loans.mutations.updateStage, {
        loanId, stage: "funded"  // can't jump from new_lead to funded
      })
    ).rejects.toThrow();
  });
});
```

---

## Development Phases (Gate-Based TDD)

Do NOT advance to the next phase until all tests pass and behavior is manually verified.

### Phase 0 — Foundation
**Build:** Project init, Convex setup, Clerk auth, users table, frontend shell (3 empty views + sidebar + Cmd+K skeleton).
**Organs:** core (users tissue only)
**Gate:** User can sign up via Clerk, session persists, user record created in Convex. Shell renders 3 views. All core tests pass.

### Phase 1 — Contacts Organ
**Build:** Full contacts CRUD, list/search/filter, contact detail panel, activity log on write.
**Organs:** contacts, activities (contact-scoped tissues only)
**Gate:** Create/read/update/archive contacts. Search by name. Filter by type. Activity log entry on every mutation. Pagination works. Multi-tenant isolation (user A can't see user B's contacts). All tests pass.

### Phase 2 — Loans Organ + Pipeline View
**Build:** Loan CRUD, stage state machine, pipeline kanban view, loan detail slide-out, stage history tracking.
**Organs:** loans, activities (loan-scoped tissues)
**Gate:** Create loan linked to contact. Move through valid stages only — invalid transitions rejected. Stage history recorded. Kanban renders by stage. Drag-and-drop moves stage. Days-in-stage shown. All tests pass.

### Phase 3 — Documents Organ
**Build:** Document requests, uploads (Convex file storage), tracking, category management, due date reminders.
**Organs:** documents
**Gate:** Request doc for a loan. Upload file. Track status (requested → uploaded). List docs by loan. Filter by category/status. Due date visible. All tests pass.

### Phase 4 — Templates + Communication
**Build:** Email/SMS templates with variables, SendGrid/Twilio integration, activity auto-logging for sent/received messages.
**Organs:** templates, activities (comms tissues)
**Gate:** Create template with variables. Send email via template — variables interpolated. Activity auto-logged. SMS works. Received messages logged via webhook. All tests pass.

### Phase 5 — Feed Organ (Today View)
**Build:** Feed items CRUD, priority sorting, snooze/complete/dismiss, rule-based feed generation (no AI yet).
**Organs:** feed
**Gate:** Feed items display by priority. One-click actions work (complete, snooze, dismiss). Rule-based items generated on events (e.g., doc overdue → feed item). Cleared items don't reappear. All tests pass.

### Phase 6 — AI Layer (Cloudflare Workers)
**Build:** ai-gateway Worker, Cmd+K intent parsing, copilot panel, lead scoring, email drafting, AI feed generation.
**Organs:** Cloudflare Workers (ai-gateway), frontend copilot
**Gate:** Cmd+K natural language → correct action dispatched. Copilot responds contextually. Lead scores computed. AI-drafted emails are coherent. Feed items generated by AI with reasoning. All Workers have tests (Vitest + Miniflare).

### Phase 7 — Rate Scraper + Enrichment
**Build:** rate-scraper Worker, lead-enricher Worker, rate comparison in UI, property enrichment display.
**Organs:** rates, Cloudflare Workers (rate-scraper, lead-enricher)
**Gate:** Rates ingested and stored. Data validation rejects bad data. Rate lookup works by loan parameters. Enrichment fires on contact creation. Enriched data visible in contact profile. syncLog accurate.

### Phase 8 — LOS Integration + Refi Monitor
**Build:** los-sync Durable Object, doc-intel Worker, refi-monitor Worker.
**Organs:** Cloudflare Workers (los-sync, doc-intel, refi-monitor)
**Gate:** Bidirectional sync with test LOS. Document OCR extracts text. Refi alerts generated when rates drop. Conflict resolution works.

### Phase 9 — Onboarding + Polish
**Build:** Onboarding flow, demo data, empty states, Stripe billing, team features.
**Organs:** core (onboarding tissues), all organs (empty states)
**Gate:** New user completes onboarding in <5 minutes. Demo pipeline populated. Stripe subscription works. Team member can be invited.

---

## File Structure

```
convex/
  schema.ts                 # imports all organ tables, single defineSchema()
  types.ts                  # shared TypeScript types
  http.ts                   # HTTP action routes (ingestion endpoints)
  crons.ts                  # scheduled function triggers
  core/
    tables.ts               # users + syncLog table definitions
    validators.ts
    queries.ts
    mutations.ts
    internals.ts
    helpers.ts
    __tests__/
  contacts/
    tables.ts
    validators.ts
    queries.ts
    mutations.ts
    internals.ts
    helpers.ts
    __tests__/
  loans/
    tables.ts
    validators.ts
    queries.ts
    mutations.ts
    internals.ts
    helpers.ts
    stateMachine.ts
    __tests__/
  documents/
    tables.ts
    validators.ts
    queries.ts
    mutations.ts
    internals.ts
    helpers.ts
    stateMachine.ts          # requested → uploaded → approved flow
    __tests__/
  activities/
    tables.ts
    validators.ts
    queries.ts
    mutations.ts
    internals.ts
    __tests__/
  feed/
    tables.ts
    validators.ts
    queries.ts
    mutations.ts
    internals.ts
    helpers.ts
    __tests__/
  templates/
    tables.ts
    validators.ts
    queries.ts
    mutations.ts
    __tests__/
  rates/
    tables.ts
    validators.ts
    queries.ts
    internals.ts             # batchUpsert (called by HTTP action)
    helpers.ts               # rate comparison logic
    __tests__/

src/
  app/
    layout.tsx               # shell: sidebar + command bar + copilot panel
    page.tsx                 # redirects to /today
    today/page.tsx
    pipeline/page.tsx
    contacts/page.tsx
    settings/page.tsx
  components/
    ui/                      # shadcn — never modify generated files
    shell/                   # Sidebar, CommandBar, CopilotPanel
    today/                   # FeedCard, FeedList, ActionButton
    pipeline/                # KanbanBoard, LoanCard, StageColumn, LoanDetail
    contacts/                # ContactList, ContactCard, ContactDetail, RelationshipMap
    documents/               # DocList, DocUpload, DocRequest
    shared/                  # Pagination, LoadingState, ErrorState, EmptyState, ConfirmDialog
  hooks/
    useCurrentUser.ts
    useContacts.ts
    useLoan.ts
    usePipeline.ts
    useFeed.ts
    useCommandBar.ts
  lib/
    utils.ts
    constants.ts
    cloudflare.ts            # HTTP client for Cloudflare Workers (AI requests)
  types/                     # frontend-only types
```

---

## What NOT to Do

- Never `.collect()` without pagination on any list query.
- Never store secrets in code or schema — use Convex environment variables (actions only) or Cloudflare KV.
- Never call external APIs from Convex queries or mutations — only from actions.
- Never skip indexes because "the table is small now."
- Never write functions before the schema for that organ is designed.
- Never reach into another organ's `internals.ts` — use its exported queries/mutations.
- Never duplicate logic across organs — shared logic goes in `core/helpers.ts`.
- Never ship a tissue without a test file.
- Never advance to the next phase until the current phase's gate is green.
- Never let user A access user B's data — enforce `ownerId` check in EVERY query and mutation.
- Never hard-delete CRM records — use `isArchived: true`.
- Never show raw errors to users — `ConvexError` for user-facing, generic message for internal errors.
- Never put AI inference in Convex — all LLM calls go to Cloudflare Workers.
- Never store LOS credentials in Convex — only encrypted references in Cloudflare KV.

---

## Before Writing Any Feature

1. Which organ does this belong to?
2. Which tissue inside that organ handles it?
3. What schema changes are needed? (design + migrate first)
4. What are the read patterns? (list / search / single / aggregate)
5. What are the write patterns? (create / update / stage change / archive)
6. Does this mutation need an activity log entry?
7. What are the failure modes — and how does each tissue handle them?
8. Write the test BEFORE writing the tissue.

**Build order always:** Schema (tables.ts) → Validators → Helpers/StateMachine → Tests → Mutations → Queries → UI
