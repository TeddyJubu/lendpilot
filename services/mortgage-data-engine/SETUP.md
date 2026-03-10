# Mortgage Data Engine — Setup Guide

## Architecture

This system replaces Firecrawl with **self-hosted scraping on Cloudflare**:

| Component | Cloudflare Service | Purpose |
|-----------|-------------------|---------|
| Scraping | Browser Rendering | Headless Chromium at the edge (replaces Firecrawl scrape) |
| Extraction | Workers AI (Llama 3.1) | Structured data extraction (replaces Firecrawl extract) |
| Orchestration | Workers + Cron Triggers | Scheduled crawls, API endpoints |
| Database | D1 (SQLite) | Rate storage, crawl tracking, credit ledger |
| Cache | KV | Property/person enrichment cache |
| Storage | R2 | Rate sheet archives, crawl logs |

**Cost: $0/month** while Cloudflare credits last (100K credits).
After credits: ~$5-15/month for Workers + D1 + Browser Rendering.

---

## Prerequisites

1. [Cloudflare account](https://dash.cloudflare.com) with Workers paid plan ($5/mo)
2. Node.js 18+ installed
3. Wrangler CLI: `npm install -g wrangler`
4. Browser Rendering enabled (Dashboard → Workers → Browser Rendering → Enable)

---

## Step-by-Step Setup

### 1. Install Dependencies

```bash
cd mortgage-data-engine
npm install
```

### 2. Authenticate Wrangler

```bash
wrangler login
```

### 3. Create Cloudflare Resources

```bash
# Create D1 database
wrangler d1 create mortgage-data-engine
# Copy the database_id into wrangler.toml

# Create KV namespace
wrangler kv namespace create CACHE
# Copy the id into wrangler.toml

# Create R2 bucket
wrangler r2 bucket create mortgage-data-storage
```

### 4. Update wrangler.toml

Replace the placeholder IDs:
- `YOUR_D1_DATABASE_ID` → from step 3
- `YOUR_KV_NAMESPACE_ID` → from step 3

### 5. Run Database Migration

```bash
# Local development
wrangler d1 execute mortgage-data-engine --local --file=./src/db/schema.sql

# Production
wrangler d1 execute mortgage-data-engine --file=./src/db/schema.sql
```

### 6. Set Secrets

```bash
wrangler secret put ADMIN_API_KEY
# Enter a strong API key for admin endpoints

wrangler secret put BROKER_WEBHOOK_SECRET
# Enter a secret for CRM webhook signature verification
```

### 7. Deploy

```bash
# Local development
wrangler dev

# Production
wrangler deploy
```

---

## API Endpoints

All endpoints require `X-API-Key` header (except /api/health).

### Query Rates

```bash
# Best wholesale rates for a borrower profile
curl "https://your-worker.workers.dev/api/rates/wholesale?product_type=30yr_fixed&fico=740&ltv=80" \
  -H "X-API-Key: YOUR_KEY"

# Retail competitor rates
curl "https://your-worker.workers.dev/api/rates/retail?product_type=30yr_fixed" \
  -H "X-API-Key: YOUR_KEY"

# Side-by-side comparison (the killer feature)
curl "https://your-worker.workers.dev/api/rates/compare?product_type=30yr_fixed" \
  -H "X-API-Key: YOUR_KEY"
```

### Lead Enrichment

```bash
# On-demand enrichment
curl -X POST "https://your-worker.workers.dev/api/enrich" \
  -H "X-API-Key: YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "lead_id": "lead_123",
    "full_name": "John Smith",
    "property_address": "123 Main St, Austin, TX 78701",
    "linkedin_url": "https://linkedin.com/in/johnsmith"
  }'
```

### Manual Crawl Trigger

```bash
# Trigger wholesale rate crawl
curl -X POST "https://your-worker.workers.dev/api/crawl/wholesale" \
  -H "X-API-Key: YOUR_KEY"

# Trigger retail rate crawl
curl -X POST "https://your-worker.workers.dev/api/crawl/retail" \
  -H "X-API-Key: YOUR_KEY"
```

### Monitoring

```bash
# Credit balance
curl "https://your-worker.workers.dev/api/credits" \
  -H "X-API-Key: YOUR_KEY"

# Recent crawl jobs
curl "https://your-worker.workers.dev/api/jobs?limit=10" \
  -H "X-API-Key: YOUR_KEY"
```

### CRM Webhook (Lead Created)

Configure your CRM to POST to `/webhook/lead-created` with HMAC-SHA256 signature:

```
POST /webhook/lead-created
X-Webhook-Signature: <hmac-sha256-hex>
Content-Type: application/json

{
  "lead_id": "lead_456",
  "full_name": "Jane Doe",
  "property_address": "456 Oak Ave, Miami, FL 33101"
}
```

---

## Cron Schedule

| Schedule | Category | UTC Time | ET Time |
|----------|----------|----------|---------|
| Every 4h | Wholesale rates | 02,06,10,14,18,22 | 10PM,2AM,6AM,10AM,2PM,6PM |
| Daily | Retail rates | 10:00 | 6:00 AM |
| Daily | Regulatory (P1) | 11:00 | 7:00 AM |
| Monday | DPA programs (P1) | 12:00 | 8:00 AM |
| Wednesday | Realtor profiles (P2) | 12:00 | 8:00 AM |

---

## Self-Hosting vs Firecrawl: Cost Comparison

| | Firecrawl (Hosted) | Self-Hosted on Cloudflare |
|---|---|---|
| Scraping | 80K credits (~6 months) | Unlimited (Browser Rendering) |
| AI Extraction | Included in Firecrawl | Workers AI (100K credits, then ~$0.01/1K) |
| Database | You provide | D1 included (5GB free) |
| Scheduling | You build | Cron Triggers included |
| Monthly cost after credits | ~$200+/mo for credits | ~$5-15/mo |
| Control | API-dependent | Full source code ownership |
