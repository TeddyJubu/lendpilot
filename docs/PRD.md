# LoanPilot — AI-Native Mortgage Broker CRM
## Complete Product & Technical Architecture

(This file is the full PRD reference. The implementation guide is in CLAUDE.md at project root.)

---

## 1. UX Philosophy: The Anti-CRM

### Why Every CRM Fails

Traditional CRMs are database browsers with forms on top. They expose raw data models to users — tables, fields, records, pipelines. The mental model they impose: "Find the right screen, fill the right fields, remember to check back."

This creates three killers:
- Cognitive overload — 15+ sidebar items, each with sub-tabs
- Data entry burden — Users spend more time feeding the CRM than closing loans
- Navigation friction — "Where do I go to do X?" is the most common question

### Core Principle

The AI handles the data model. The broker handles decisions.

### Three Pillars

| Pillar | Inspiration | How It Manifests |
|--------|------------|-----------------|
| Command-First | Raycast, Linear | Cmd+K command bar is the primary interaction |
| AI-Curated Feed | Claude, ChatGPT | "Today" view is a prioritized action feed |
| Progressive Disclosure | Apple, Figma | 3 core views. Complexity reveals itself only when needed |

### Design Manifesto
1. No empty screens
2. Conversations over forms
3. One primary action per screen
4. AI suggests, broker confirms
5. Real-time everything
6. Zero mandatory fields

---

## 2. Navigation Model: 3 Views + Command Bar

- Today = "What should I do right now?"
- Pipeline = "Where are all my loans?"
- Contacts = "Who am I working with?"
- Cmd+K = power user interface + new user safety net

### Today View — AI Action Feed
Feed item types: hot_lead, condition_due, rate_opportunity, doc_follow_up, pipeline_update, relationship_touch, closing_prep, ai_insight

### Pipeline View — Horizontal Kanban
4 columns: Intake | Qualification | Processing | Closing
Card shows: borrower, amount, next action badge, days in stage, health score

### Contacts View — Relationship Hub
List mode + Relationship map
AI-enriched profiles with communication timeline

### Command Bar (Cmd+K)
Categories: Navigate, Create, Search, Ask AI
Built on cmdk (shadcn Command component)

### AI Copilot Panel
Persistent collapsible right panel, context-aware, proactive suggestions

---

## 3. System Architecture

Convex owns state. Cloudflare owns intelligence.

Frontend: Next.js + React + Convex React Client (WebSocket)
Backend: Convex (DB, auth, real-time, mutations, file storage)
Intelligence: Cloudflare (Workers AI, Durable Objects, R2, KV, Vectorize, Firecrawl)
External: Encompass, LendingPad, Twilio, SendGrid, Stripe

Communication patterns:
1. Frontend -> Convex: Real-time via WebSocket (useQuery, useMutation)
2. Frontend -> Cloudflare: Direct HTTP for AI requests
3. Cloudflare -> Convex: HTTP Actions for writing enriched data back
4. Convex -> Cloudflare: Scheduled functions trigger Workers via HTTP

---

## 4. Schema Tables

Core tables: users, contacts, loans, activities, documents, feedItems, rateSnapshots, templates

Key relationships:
- contacts --< loans --< documents
- contacts --< activities
- loans --< activities
- loans --< feedItems
- contacts --< feedItems
- users --< contacts, loans, templates

---

## 5. Cloudflare Workers

1. ai-gateway — command parsing, copilot chat, email drafting, lead scoring, summarization
2. rate-scraper — wholesale (4h), retail (daily), DPA (weekly) via Firecrawl
3. lead-enricher — event-driven enrichment on contact.created
4. los-sync — Durable Object for Encompass/LendingPad bidirectional sync
5. doc-intel — OCR + AI validation for uploaded documents
6. refi-monitor — post-close refinance opportunity detection

Storage: KV (rate cache, prompts), R2 (large docs), Vectorize (embeddings), D1 (scraping logs)

---

## 6. AI Model Strategy (Workers AI)

- Command intent parsing: Llama 3.1 8B (<200ms)
- Email/SMS drafting: Llama 3.1 70B (<2s)
- Lead scoring: Llama 3.1 8B + embeddings (<500ms)
- Document OCR: Llama 3.1 70B vision (<3s)
- Copilot: Llama 3.1 70B (<2s)
- Rate comparison: Llama 3.1 8B (<300ms)

---

## 7. Build Phases

Phase 0 (Weeks 1-3): Foundation — schema, auth, frontend shell, basic CRUD
Phase 1 (Weeks 4-8): Core CRM — pipeline, contacts, docs, email/SMS, templates
Phase 2 (Weeks 9-14): AI Layer — AI gateway, enrichment, scoring, copilot, doc intel
Phase 3 (Weeks 15-18): Data Moat — rate scraper, comparison, DPA
Phase 4 (Weeks 19-24): The Moat — LOS integration, refi monitoring
Phase 5 (Weeks 25+): Scale — team features, analytics, API, mobile

---

## 8. Pricing

Solo: $199/mo | Team: $349/mo | Enterprise: $499/mo + per seat
Break-even at 2-3 paying brokers. Infrastructure ~$330-450/mo at 100 brokers.

---

## 9. Success Metrics

- Time to first value: < 5 minutes
- Speed to contact: < 5 minutes
- Lead conversion: 2x baseline
- Docs-to-complete: < 5 business days
- Repeat/referral: 30%+
- DAU: 80%+ subscribers
- NPS: 60+
- Churn: < 3%/month
