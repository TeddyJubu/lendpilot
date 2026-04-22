#!/usr/bin/env bash
# =============================================================================
# mortgage-data-engine — First-deploy setup
# Run this once from your LOCAL machine (not the sandbox).
# Pre-requisites: Node.js, wrangler installed (npm i -g wrangler), logged in.
# =============================================================================
set -euo pipefail

# ── Config ────────────────────────────────────────────────────────────────────
WORKER_NAME="mortgage-data-engine"
D1_NAME="mortgage-data-engine"
KV_NAME="CACHE"
R2_BUCKET="mortgage-data-storage"

# Pre-generated secret — keep this value; you'll need it for Convex too.
CONVEX_INGESTION_SECRET="d3ed2b052651b87ce52920a11ef29cd109063dc80c65892e75a8640fe93ed3c9"

# ── 0. Auth check ─────────────────────────────────────────────────────────────
echo "🔐  Checking Cloudflare auth..."
wrangler whoami || { echo "Run: wrangler login"; exit 1; }

# ── 1. Create D1 database ─────────────────────────────────────────────────────
echo ""
echo "🗄️  Creating D1 database '$D1_NAME'..."
D1_OUTPUT=$(wrangler d1 create "$D1_NAME" 2>&1)
echo "$D1_OUTPUT"
D1_ID=$(echo "$D1_OUTPUT" | grep -o 'database_id = "[^"]*"' | cut -d'"' -f2)
if [ -z "$D1_ID" ]; then
  # Already exists — fetch the ID
  echo "   (database may already exist — fetching ID)"
  D1_ID=$(wrangler d1 list --json 2>/dev/null | \
    python3 -c "import sys,json; rows=json.load(sys.stdin); \
    match=[r for r in rows if r.get('name')=='$D1_NAME']; \
    print(match[0]['uuid'] if match else '')" 2>/dev/null || true)
fi
echo "   D1 ID: $D1_ID"

# ── 2. Create KV namespace ────────────────────────────────────────────────────
echo ""
echo "🗂️  Creating KV namespace '$KV_NAME'..."
KV_OUTPUT=$(wrangler kv namespace create "$KV_NAME" 2>&1)
echo "$KV_OUTPUT"
KV_ID=$(echo "$KV_OUTPUT" | grep -o 'id = "[^"]*"' | cut -d'"' -f2)
if [ -z "$KV_ID" ]; then
  echo "   (namespace may already exist — fetching ID)"
  KV_ID=$(wrangler kv namespace list --json 2>/dev/null | \
    python3 -c "import sys,json; rows=json.load(sys.stdin); \
    match=[r for r in rows if r.get('title')=='${WORKER_NAME}-${KV_NAME}']; \
    print(match[0]['id'] if match else '')" 2>/dev/null || true)
fi
echo "   KV ID: $KV_ID"

# ── 3. Create R2 bucket ───────────────────────────────────────────────────────
echo ""
echo "🪣  Creating R2 bucket '$R2_BUCKET'..."
wrangler r2 bucket create "$R2_BUCKET" 2>&1 || echo "   (bucket may already exist — continuing)"

# ── 4. Patch wrangler.toml ────────────────────────────────────────────────────
echo ""
echo "📝  Patching wrangler.toml with real IDs..."
if [ -z "$D1_ID" ] || [ -z "$KV_ID" ]; then
  echo "⚠️  Could not auto-detect one or both IDs."
  echo "   Open wrangler.toml and manually replace:"
  echo "     database_id = \"YOUR_D1_DATABASE_ID\"  →  database_id = \"$D1_ID\""
  echo "     id = \"YOUR_KV_NAMESPACE_ID\"            →  id = \"$KV_ID\""
else
  # Use sed to replace the placeholder values inline
  sed -i.bak \
    -e "s/database_id = \"YOUR_D1_DATABASE_ID\"/database_id = \"$D1_ID\"/" \
    -e "s/id = \"YOUR_KV_NAMESPACE_ID\"/id = \"$KV_ID\"/" \
    wrangler.toml
  echo "   ✅  wrangler.toml updated"
fi

# ── 5. Set CONVEX_URL in wrangler.toml ────────────────────────────────────────
echo ""
echo "🔗  What is your Convex deployment URL?"
echo "   Find it at: https://dashboard.convex.dev → your project → Settings → URL"
echo "   It looks like: https://happy-animal-123.convex.site"
echo ""
read -r -p "   CONVEX_URL: " CONVEX_URL_VALUE
if [ -n "$CONVEX_URL_VALUE" ]; then
  sed -i.bak \
    -e "s|CONVEX_URL = \"\"|CONVEX_URL = \"$CONVEX_URL_VALUE\"|" \
    wrangler.toml
  echo "   ✅  CONVEX_URL set in wrangler.toml"
fi

# ── 6. Apply D1 schema + seed data ────────────────────────────────────────────
echo ""
echo "🏗️  Applying D1 schema and seeding 20 lenders..."
wrangler d1 execute "$D1_NAME" --file=src/db/schema.sql --remote
echo "   ✅  Schema applied"

# ── 7. Set secrets ────────────────────────────────────────────────────────────
echo ""
echo "🔑  Setting worker secrets..."

echo "$CONVEX_INGESTION_SECRET" | wrangler secret put CONVEX_INGESTION_SECRET
echo "   ✅  CONVEX_INGESTION_SECRET set"

echo ""
echo "   You need two more secrets. Enter them when prompted."
echo "   (Generate strong random values — they protect your admin endpoints)"
echo ""
echo "   ADMIN_API_KEY — protects manual-trigger endpoints (/crawl, /enrich)"
read -r -p "   ADMIN_API_KEY (or press Enter to generate): " ADMIN_KEY
if [ -z "$ADMIN_KEY" ]; then
  ADMIN_KEY=$(openssl rand -hex 24)
  echo "   Generated: $ADMIN_KEY"
fi
echo "$ADMIN_KEY" | wrangler secret put ADMIN_API_KEY
echo "   ✅  ADMIN_API_KEY set"

echo ""
echo "   BROKER_WEBHOOK_SECRET — validates incoming lead.created webhook signatures"
read -r -p "   BROKER_WEBHOOK_SECRET (or press Enter to generate): " WEBHOOK_SECRET
if [ -z "$WEBHOOK_SECRET" ]; then
  WEBHOOK_SECRET=$(openssl rand -hex 24)
  echo "   Generated: $WEBHOOK_SECRET"
fi
echo "$WEBHOOK_SECRET" | wrangler secret put BROKER_WEBHOOK_SECRET
echo "   ✅  BROKER_WEBHOOK_SECRET set"

# ── 8. Deploy ─────────────────────────────────────────────────────────────────
echo ""
echo "🚀  Deploying worker..."
wrangler deploy
echo ""
echo "   ✅  Worker deployed!"

# ── 9. Convex side ────────────────────────────────────────────────────────────
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  FINAL STEP — Convex environment variable (run from apps/web/)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  cd ../apps/web"
echo "  npx convex env set CONVEX_INGESTION_SECRET $CONVEX_INGESTION_SECRET"
echo ""
echo "  This lets the Convex /ingestRates and /ingestEnrichment HTTP actions"
echo "  authenticate the worker's Bearer token."
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  All done! The worker will start crawling on its next cron trigger."
echo "  Cron schedule:"
echo "    Wholesale rates  — every 4 hours (00:00, 02:00, 06:00, 10:00, 14:00, 18:00, 22:00 UTC)"
echo "    Retail rates     — daily 10:00 UTC (6 AM ET)"
echo "    Regulatory       — daily 11:00 UTC (7 AM ET)"
echo "    DPA programs     — Mondays 12:00 UTC"
echo ""
echo "  To trigger a crawl immediately (after deploy):"
echo "    curl -X POST https://$WORKER_NAME.<your-subdomain>.workers.dev/crawl/wholesale \\"
echo "         -H 'X-Admin-Key: $ADMIN_KEY'"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
