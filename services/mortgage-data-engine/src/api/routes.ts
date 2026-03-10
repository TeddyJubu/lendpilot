/**
 * API Routes — Hono-based HTTP API
 *
 * Endpoints:
 * - GET  /api/rates/wholesale    — Query wholesale rates
 * - GET  /api/rates/retail       — Query retail competitor rates
 * - GET  /api/rates/compare      — Side-by-side wholesale vs retail
 * - POST /api/enrich             — Trigger lead enrichment
 * - POST /api/crawl/:category    — Manually trigger a crawl
 * - GET  /api/jobs               — List recent crawl jobs
 * - GET  /api/credits            — Credit balance and usage
 * - GET  /api/dpa/match           — Find matching DPA programs for a borrower
 * - GET  /api/dpa/programs        — List all active DPA programs by state
 * - GET  /api/regulatory/feed     — Recent regulatory updates feed
 * - GET  /api/regulatory/alerts   — High-priority regulatory alerts
 * - GET  /api/health              — Health check
 */

import { Hono } from "hono";
import type { Env, RateQuery, EnrichmentRequest } from "../types";
import { queryBestWholesaleRates, getCreditsRemaining } from "../db/queries";
import { enrichLead } from "../crawlers/lead-enrichment";
import { crawlWholesaleRates } from "../crawlers/wholesale-rates";
import { crawlRetailRates } from "../crawlers/retail-rates";
import { crawlDPAPrograms } from "../crawlers/dpa-programs";
import { crawlRegulatoryUpdates } from "../crawlers/regulatory-updates";

const app = new Hono<{ Bindings: Env }>();

// ─── Auth Middleware ───
app.use("/api/*", async (c, next) => {
  // Skip auth for health check
  if (c.req.path === "/api/health") return next();

  const apiKey = c.req.header("X-API-Key") ?? c.req.query("api_key");
  if (!apiKey || apiKey !== c.env.ADMIN_API_KEY) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  return next();
});

// ─── KV Rate Limiting (sliding fixed-window counter) ───

/** Returns false when the caller has exceeded the rate limit for the given key. */
async function checkRateLimit(
  kv: KVNamespace,
  key: string,
  limit: number,
  windowSecs: number
): Promise<boolean> {
  const window = Math.floor(Math.floor(Date.now() / 1000) / windowSecs);
  const kvKey = `ratelimit:${key}:${window}`;
  const current = parseInt((await kv.get(kvKey)) ?? "0", 10);
  if (current >= limit) return false;
  await kv.put(kvKey, String(current + 1), { expirationTtl: windowSecs * 2 });
  return true;
}

// Enrich endpoint: max 10 req/min per API key
app.use("/api/enrich", async (c, next) => {
  const apiKey = c.req.header("X-API-Key") ?? c.req.query("api_key") ?? "anon";
  const allowed = await checkRateLimit(c.env.CACHE, `enrich:${apiKey}`, 10, 60);
  if (!allowed) return c.json({ error: "Rate limit exceeded. Max 10 enrichment requests per minute." }, 429);
  return next();
});

// Manual crawl trigger: max 5 req/hour (crawls are expensive)
app.use("/api/crawl/*", async (c, next) => {
  const apiKey = c.req.header("X-API-Key") ?? c.req.query("api_key") ?? "anon";
  const allowed = await checkRateLimit(c.env.CACHE, `crawl:${apiKey}`, 5, 3600);
  if (!allowed) return c.json({ error: "Rate limit exceeded. Max 5 manual crawl triggers per hour." }, 429);
  return next();
});

// ─── Health Check ───
app.get("/api/health", async (c) => {
  const credits = await getCreditsRemaining(c.env.DB);
  return c.json({
    status: "ok",
    credits_remaining: credits,
    timestamp: new Date().toISOString(),
  });
});

// ─── Wholesale Rates Query ───
app.get("/api/rates/wholesale", async (c) => {
  const query: RateQuery = {
    product_type: c.req.query("product_type") as any,
    fico: c.req.query("fico") ? parseInt(c.req.query("fico")!) : undefined,
    ltv: c.req.query("ltv") ? parseFloat(c.req.query("ltv")!) : undefined,
    loan_amount: c.req.query("loan_amount")
      ? parseInt(c.req.query("loan_amount")!)
      : undefined,
    property_type: c.req.query("property_type") as any,
    occupancy: c.req.query("occupancy") as any,
  };

  const results = await queryBestWholesaleRates(c.env.DB, query);
  return c.json({
    count: results.results.length,
    rates: results.results,
  });
});

// ─── Retail Rates Query ───
app.get("/api/rates/retail", async (c) => {
  const productType = c.req.query("product_type");
  const limit = c.req.query("limit") ? parseInt(c.req.query("limit")!) : 20;

  let sql = `SELECT rr.*, l.name as lender_name
    FROM retail_rates rr
    JOIN lenders l ON rr.lender_id = l.id
    WHERE 1=1`;
  const params: unknown[] = [];

  if (productType) {
    sql += ` AND rr.product_type = ?`;
    params.push(productType);
  }

  sql += ` ORDER BY rr.advertised_rate ASC LIMIT ?`;
  params.push(limit);

  const results = await c.env.DB.prepare(sql).bind(...params).all();
  return c.json({ count: results.results.length, rates: results.results });
});

// ─── Rate Comparison: Wholesale vs Retail ───
app.get("/api/rates/compare", async (c) => {
  const productType = c.req.query("product_type") ?? "30yr_fixed";

  // Get best wholesale rates
  const wholesale = await c.env.DB
    .prepare(
      `SELECT wr.rate, wr.apr, wr.points, l.name as lender_name
       FROM wholesale_rates wr
       JOIN lenders l ON wr.lender_id = l.id
       WHERE wr.product_type = ?
       ORDER BY wr.rate ASC LIMIT 5`
    )
    .bind(productType)
    .all();

  // Get retail rates for comparison
  const retail = await c.env.DB
    .prepare(
      `SELECT rr.advertised_rate as rate, rr.advertised_apr as apr,
              rr.points, l.name as lender_name
       FROM retail_rates rr
       JOIN lenders l ON rr.lender_id = l.id
       WHERE rr.product_type = ?
       ORDER BY rr.advertised_rate ASC LIMIT 5`
    )
    .bind(productType)
    .all();

  // Calculate savings
  const bestWholesale = wholesale.results[0] as any;
  const avgRetail = retail.results.length
    ? (retail.results as any[]).reduce((sum, r) => sum + r.rate, 0) /
      retail.results.length
    : null;

  return c.json({
    product_type: productType,
    wholesale: {
      best_rate: bestWholesale?.rate ?? null,
      best_lender: bestWholesale?.lender_name ?? null,
      top_5: wholesale.results,
    },
    retail: {
      average_rate: avgRetail ? Math.round(avgRetail * 1000) / 1000 : null,
      top_5: retail.results,
    },
    savings: {
      rate_difference:
        bestWholesale && avgRetail
          ? Math.round((avgRetail - bestWholesale.rate) * 1000) / 1000
          : null,
      note: "Rate difference in percentage points. Multiply by loan amount for approximate savings.",
    },
  });
});

// ─── Lead Enrichment ───
app.post("/api/enrich", async (c) => {
  const body = await c.req.json<EnrichmentRequest>();

  if (!body.lead_id || !body.full_name) {
    return c.json(
      { error: "lead_id and full_name are required" },
      400
    );
  }

  const result = await enrichLead(c.env, body);
  return c.json(result);
});

// ─── Manual Crawl Trigger ───
app.post("/api/crawl/:category", async (c) => {
  const category = c.req.param("category");

  switch (category) {
    case "wholesale_rates":
    case "wholesale": {
      const result = await crawlWholesaleRates(c.env);
      return c.json(result);
    }
    case "retail_rates":
    case "retail": {
      const result = await crawlRetailRates(c.env);
      return c.json(result);
    }
    case "dpa_programs":
    case "dpa": {
      const result = await crawlDPAPrograms(c.env);
      return c.json(result);
    }
    case "regulatory": {
      const result = await crawlRegulatoryUpdates(c.env);
      return c.json(result);
    }
    default:
      return c.json({ error: `Unknown category: ${category}` }, 400);
  }
});

// ═══════════════════════════════════════
// P1: DPA Program Endpoints
// ═══════════════════════════════════════

// ─── DPA Match: Find programs a borrower qualifies for ───
app.get("/api/dpa/match", async (c) => {
  const state = c.req.query("state");
  const income = c.req.query("income") ? parseInt(c.req.query("income")!) : undefined;
  const fico = c.req.query("fico") ? parseInt(c.req.query("fico")!) : undefined;
  const firstTimeBuyer = c.req.query("first_time_buyer") === "true";
  const loanType = c.req.query("loan_type"); // FHA, VA, Conventional, etc.
  const purchasePrice = c.req.query("purchase_price")
    ? parseInt(c.req.query("purchase_price")!)
    : undefined;

  if (!state) {
    return c.json({ error: "state parameter is required (e.g., CA, TX, FL)" }, 400);
  }

  let sql = `SELECT * FROM dpa_programs WHERE program_status = 'active' AND (state = ? OR state = 'National')`;
  const params: unknown[] = [state.toUpperCase()];

  if (income) {
    sql += ` AND (income_limit IS NULL OR income_limit >= ?)`;
    params.push(income);
  }

  if (fico) {
    sql += ` AND (fico_minimum IS NULL OR fico_minimum <= ?)`;
    params.push(fico);
  }

  if (!firstTimeBuyer) {
    sql += ` AND first_time_buyer_required = 0`;
  }

  if (purchasePrice) {
    sql += ` AND (max_purchase_price IS NULL OR max_purchase_price >= ?)`;
    params.push(purchasePrice);
  }

  sql += ` ORDER BY assistance_amount_max DESC NULLS LAST`;

  const results = await c.env.DB.prepare(sql).bind(...params).all();

  // Filter by loan type compatibility if specified
  let filtered = results.results as any[];
  if (loanType) {
    filtered = filtered.filter((p) => {
      const compatible = JSON.parse(p.loan_types_compatible || "[]");
      return compatible.length === 0 || compatible.some(
        (lt: string) => lt.toLowerCase().includes(loanType.toLowerCase())
      );
    });
  }

  // Generate AI summary of best options
  let aiSummary: string | null = null;
  if (filtered.length > 0) {
    try {
      const topPrograms = filtered.slice(0, 3).map((p) => ({
        name: p.program_name,
        type: p.assistance_type,
        amount: p.assistance_amount_max,
        agency: p.administering_agency,
      }));

      const aiResult = await c.env.AI.run(
        "@cf/meta/llama-3.1-8b-instruct" as any,
        {
          messages: [
            {
              role: "system",
              content: "You're a mortgage broker's AI assistant. Summarize DPA options in 2-3 sentences a broker can share with their client.",
            },
            {
              role: "user",
              content: `Borrower: ${state}, income $${income ?? "unknown"}, FICO ${fico ?? "unknown"}, ${firstTimeBuyer ? "first-time buyer" : "not first-time"}.
Top matching DPA programs: ${JSON.stringify(topPrograms)}
Write a short broker-ready summary.`,
            },
          ],
          max_tokens: 150,
          temperature: 0.3,
        }
      );

      aiSummary =
        typeof aiResult === "string"
          ? aiResult
          : (aiResult as any)?.response ?? null;
    } catch {
      // AI summary is optional
    }
  }

  return c.json({
    state: state.toUpperCase(),
    matching_programs: filtered.length,
    programs: filtered,
    ai_summary: aiSummary,
    search_criteria: { state, income, fico, firstTimeBuyer, loanType, purchasePrice },
  });
});

// ─── DPA Programs by State ───
app.get("/api/dpa/programs", async (c) => {
  const state = c.req.query("state");
  const status = c.req.query("status") ?? "active";

  let sql = `SELECT * FROM dpa_programs WHERE program_status = ?`;
  const params: unknown[] = [status];

  if (state) {
    sql += ` AND (state = ? OR state = 'National')`;
    params.push(state.toUpperCase());
  }

  sql += ` ORDER BY state, assistance_amount_max DESC NULLS LAST`;

  const results = await c.env.DB.prepare(sql).bind(...params).all();
  return c.json({
    count: results.results.length,
    programs: results.results,
  });
});

// ═══════════════════════════════════════
// P1: Regulatory Updates Endpoints
// ═══════════════════════════════════════

// ─── Regulatory Feed: Recent updates ───
app.get("/api/regulatory/feed", async (c) => {
  const source = c.req.query("source"); // CFPB, FHA, VA, etc.
  const days = c.req.query("days") ? parseInt(c.req.query("days")!) : 30;
  const limit = c.req.query("limit") ? parseInt(c.req.query("limit")!) : 50;

  let sql = `SELECT * FROM regulatory_updates WHERE published_date > datetime('now', '-' || ? || ' days')`;
  const params: unknown[] = [days];

  if (source) {
    sql += ` AND source = ?`;
    params.push(source.toUpperCase());
  }

  sql += ` ORDER BY relevance_score DESC, published_date DESC LIMIT ?`;
  params.push(limit);

  const results = await c.env.DB.prepare(sql).bind(...params).all();
  return c.json({
    count: results.results.length,
    period_days: days,
    updates: results.results,
  });
});

// ─── High-Priority Regulatory Alerts ───
app.get("/api/regulatory/alerts", async (c) => {
  const minScore = c.req.query("min_score") ? parseInt(c.req.query("min_score")!) : 7;
  const days = c.req.query("days") ? parseInt(c.req.query("days")!) : 7;

  const results = await c.env.DB
    .prepare(
      `SELECT * FROM regulatory_updates
       WHERE relevance_score >= ?
       AND published_date > datetime('now', '-' || ? || ' days')
       ORDER BY relevance_score DESC, published_date DESC`
    )
    .bind(minScore, days)
    .all();

  return c.json({
    alert_count: results.results.length,
    min_relevance_score: minScore,
    period_days: days,
    alerts: results.results,
  });
});

// ─── Regulatory Impact Check: Does an update affect a specific loan? ───
app.get("/api/regulatory/impact", async (c) => {
  const loanType = c.req.query("loan_type"); // FHA, VA, Conventional
  const state = c.req.query("state");
  const days = c.req.query("days") ? parseInt(c.req.query("days")!) : 30;

  if (!loanType) {
    return c.json({ error: "loan_type parameter required" }, 400);
  }

  // Search for updates that affect this loan type
  const results = await c.env.DB
    .prepare(
      `SELECT * FROM regulatory_updates
       WHERE published_date > datetime('now', '-' || ? || ' days')
       AND (affects_loan_types LIKE '%' || ? || '%' OR affects_loan_types = '[]')
       ORDER BY relevance_score DESC, published_date DESC
       LIMIT 20`
    )
    .bind(days, loanType)
    .all();

  // If state specified, also filter by state
  let filtered = results.results as any[];
  if (state) {
    filtered = filtered.filter((u) => {
      const states = JSON.parse(u.affects_states || "[]");
      return states.length === 0 || states.includes(state.toUpperCase());
    });
  }

  return c.json({
    loan_type: loanType,
    state: state ?? "all",
    period_days: days,
    impacting_updates: filtered.length,
    updates: filtered,
  });
});

// ─── Crawl Jobs ───
app.get("/api/jobs", async (c) => {
  const limit = c.req.query("limit") ? parseInt(c.req.query("limit")!) : 20;
  const category = c.req.query("category");

  let sql = `SELECT * FROM crawl_jobs WHERE 1=1`;
  const params: unknown[] = [];

  if (category) {
    sql += ` AND category = ?`;
    params.push(category);
  }

  sql += ` ORDER BY created_at DESC LIMIT ?`;
  params.push(limit);

  const results = await c.env.DB.prepare(sql).bind(...params).all();
  return c.json({ jobs: results.results });
});

// ─── Credit Balance ───
app.get("/api/credits", async (c) => {
  const remaining = await getCreditsRemaining(c.env.DB);

  // Monthly usage breakdown
  const usage = await c.env.DB
    .prepare(
      `SELECT category, SUM(credits_used) as total
       FROM credit_ledger
       WHERE created_at > datetime('now', '-30 days')
       GROUP BY category`
    )
    .all();

  // Projected exhaustion
  const monthlyBurn = await c.env.DB
    .prepare(
      `SELECT COALESCE(SUM(credits_used), 0) as monthly_total
       FROM credit_ledger
       WHERE created_at > datetime('now', '-30 days')`
    )
    .first<{ monthly_total: number }>();

  const monthlyRate = monthlyBurn?.monthly_total ?? 0;
  const monthsRemaining = monthlyRate > 0 ? remaining / monthlyRate : null;

  return c.json({
    credits_remaining: remaining,
    credits_total: 80_000,
    monthly_burn_rate: monthlyRate,
    months_remaining: monthsRemaining
      ? Math.round(monthsRemaining * 10) / 10
      : "N/A",
    usage_by_category: usage.results,
  });
});

export default app;
