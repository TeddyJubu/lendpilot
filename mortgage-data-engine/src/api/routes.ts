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
 * - GET  /api/regulatory/impact   — Impact check for a specific loan type
 * - POST /api/agent/ingest-lenders      — Web-agent posts discovered lenders
 * - POST /api/agent/ingest-regulatory   — Web-agent posts regulatory findings
 * - GET  /api/agent/discovered-lenders  — List lenders pending review
 * - PATCH /api/agent/discovered-lenders/:id — Approve or reject a discovered lender
 * - GET  /api/agent/tasks               — List agent task history
 * - GET  /api/health              — Health check
 */

import { Hono } from "hono";
import type {
  Env,
  RateQuery,
  EnrichmentRequest,
  AgentIngestLendersBody,
  AgentIngestRegulatoryBody,
} from "../types";
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

// ═══════════════════════════════════════
// P2: Web-Agent Integration Endpoints
// ═══════════════════════════════════════

// ─── Ingest: Discovered Lenders (posted by web-agent service) ───
app.post("/api/agent/ingest-lenders", async (c) => {
  const body = await c.req.json<AgentIngestLendersBody>();

  if (!body.task_id || !Array.isArray(body.lenders)) {
    return c.json({ error: "task_id and lenders[] are required" }, 400);
  }

  let created = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const lender of body.lenders) {
    if (!lender.name || typeof lender.confidence_score !== "number") {
      errors.push(`Skipping invalid lender entry: missing name or confidence_score`);
      skipped++;
      continue;
    }

    try {
      // Check for duplicate by name (case-insensitive)
      const existing = await c.env.DB
        .prepare(`SELECT id FROM discovered_lenders WHERE LOWER(name) = LOWER(?) LIMIT 1`)
        .bind(lender.name)
        .first();

      if (existing) {
        skipped++;
        continue;
      }

      // Also skip if already in the main lenders table
      const inRegistry = await c.env.DB
        .prepare(`SELECT id FROM lenders WHERE LOWER(name) = LOWER(?) LIMIT 1`)
        .bind(lender.name)
        .first();

      if (inRegistry) {
        skipped++;
        continue;
      }

      await c.env.DB
        .prepare(
          `INSERT INTO discovered_lenders
           (id, name, type, tpo_portal_url, nmls_id, requires_auth, confidence_score,
            discovery_notes, review_status, agent_task_id, discovered_at)
           VALUES (lower(hex(randomblob(16))), ?, ?, ?, ?, ?, ?, ?, 'pending', ?, datetime('now'))`
        )
        .bind(
          lender.name,
          lender.type ?? "wholesale",
          lender.tpo_portal_url ?? null,
          lender.nmls_id ?? null,
          lender.requires_auth ? 1 : 0,
          lender.confidence_score,
          lender.discovery_notes ?? null,
          body.task_id
        )
        .run();

      created++;
    } catch (err) {
      console.error(`Failed to stage lender "${lender.name}":`, err);
      errors.push(`Failed to stage ${lender.name} — database error`);
    }
  }

  // Record task completion with actual created count (after deduplication)
  await c.env.DB
    .prepare(
      `INSERT INTO agent_tasks (id, task_type, status, triggered_by, records_created, completed_at, created_at)
       VALUES (?, 'lender_discovery', 'completed', 'scheduled', ?, datetime('now'), datetime('now'))
       ON CONFLICT(id) DO UPDATE SET
         status = 'completed', records_created = excluded.records_created, completed_at = excluded.completed_at`
    )
    .bind(body.task_id, created)
    .run();

  return c.json({ success: true, records_created: created, records_skipped: skipped, errors });
});

// ─── Ingest: Agent Regulatory Findings (posted by web-agent service) ───
app.post("/api/agent/ingest-regulatory", async (c) => {
  const body = await c.req.json<AgentIngestRegulatoryBody>();

  if (!body.task_id || !Array.isArray(body.findings)) {
    return c.json({ error: "task_id and findings[] are required" }, 400);
  }

  let created = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const finding of body.findings) {
    if (!finding.title || !finding.published_date || !finding.source) {
      errors.push(`Skipping invalid finding: missing title, source, or published_date`);
      skipped++;
      continue;
    }

    try {
      // Deduplicate by source + title + published_date (unique index)
      const result = await c.env.DB
        .prepare(
          `INSERT OR IGNORE INTO agent_regulatory_findings
           (id, source, document_type, title, summary, published_date, effective_date,
            affects_loan_types, affects_states, url, relevance_score, broker_impact,
            review_status, agent_task_id, discovered_at)
           VALUES (lower(hex(randomblob(16))), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, datetime('now'))`
        )
        .bind(
          finding.source,
          finding.document_type,
          finding.title,
          finding.summary ?? null,
          finding.published_date,
          finding.effective_date ?? null,
          JSON.stringify(finding.affects_loan_types ?? []),
          JSON.stringify(finding.affects_states ?? []),
          finding.url ?? null,
          finding.relevance_score,
          finding.broker_impact ?? null,
          body.task_id
        )
        .run();

      if (result.meta.changes > 0) {
        created++;
        // Auto-promote high-relevance items (score >= 8) to regulatory_updates
        if (finding.relevance_score >= 8) {
          const promoted = await promoteToRegulatoryUpdates(c.env.DB, finding);
          if (promoted) {
            await c.env.DB
              .prepare(
                `UPDATE agent_regulatory_findings SET review_status = 'promoted'
                 WHERE source = ? AND title = ? AND published_date = ?`
              )
              .bind(finding.source, finding.title, finding.published_date)
              .run();
          }
        }
      } else {
        skipped++;
      }
    } catch (err) {
      console.error(`Failed to stage finding "${finding.title}":`, err);
      errors.push(`Failed to stage "${finding.title}" — database error`);
    }
  }

  // Record task completion with actual created count (after deduplication)
  await c.env.DB
    .prepare(
      `INSERT INTO agent_tasks (id, task_type, status, triggered_by, records_created, completed_at, created_at)
       VALUES (?, 'regulatory_scan', 'completed', 'scheduled', ?, datetime('now'), datetime('now'))
       ON CONFLICT(id) DO UPDATE SET
         status = 'completed', records_created = excluded.records_created, completed_at = excluded.completed_at`
    )
    .bind(body.task_id, created)
    .run();

  return c.json({ success: true, records_created: created, records_skipped: skipped, errors });
});

// ─── List: Discovered Lenders Pending Review ───
app.get("/api/agent/discovered-lenders", async (c) => {
  const status = c.req.query("status") ?? "pending";
  const limit = c.req.query("limit") ? parseInt(c.req.query("limit")!) : 50;

  const results = await c.env.DB
    .prepare(
      `SELECT * FROM discovered_lenders WHERE review_status = ? ORDER BY confidence_score DESC LIMIT ?`
    )
    .bind(status, limit)
    .all();

  return c.json({ count: results.results.length, lenders: results.results });
});

// ─── Review: Approve or Reject a Discovered Lender ───
app.patch("/api/agent/discovered-lenders/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json<{ action: "approve" | "reject" }>();

  if (!body.action || !["approve", "reject"].includes(body.action)) {
    return c.json({ error: "action must be 'approve' or 'reject'" }, 400);
  }

  const lender = await c.env.DB
    .prepare(`SELECT * FROM discovered_lenders WHERE id = ?`)
    .bind(id)
    .first<{
      id: string; name: string; type: string; tpo_portal_url: string | null;
      nmls_id: string | null; requires_auth: number; confidence_score: number;
    }>();

  if (!lender) {
    return c.json({ error: "Lender not found" }, 404);
  }

  // On approval: promote to lenders table FIRST, then mark approved only if insert succeeded
  if (body.action === "approve") {
    const lenderId = `lender_${lender.name.toLowerCase().replace(/[^a-z0-9]/g, "_").slice(0, 30)}`;
    const crawlConfig = JSON.stringify({
      requires_auth: lender.requires_auth === 1,
      rate_sheet_url_pattern: lender.tpo_portal_url ?? "",
      extraction_prompt: "Extract all mortgage rate offerings",
      crawl_priority: 3,
    });

    await c.env.DB
      .prepare(
        `INSERT OR IGNORE INTO lenders (id, name, type, tpo_portal_url, nmls_id, is_active, crawl_config, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 1, ?, datetime('now'), datetime('now'))`
      )
      .bind(lenderId, lender.name, lender.type, lender.tpo_portal_url, lender.nmls_id, crawlConfig)
      .run();

    await c.env.DB
      .prepare(`UPDATE discovered_lenders SET review_status = 'approved', reviewed_at = datetime('now') WHERE id = ?`)
      .bind(id)
      .run();

    return c.json({ success: true, id, status: "approved", promoted_to_registry: true });
  } else {
    await c.env.DB
      .prepare(`UPDATE discovered_lenders SET review_status = 'rejected', reviewed_at = datetime('now') WHERE id = ?`)
      .bind(id)
      .run();

    return c.json({ success: true, id, status: "rejected", promoted_to_registry: false });
  }
});

// ─── List: Agent Task History ───
app.get("/api/agent/tasks", async (c) => {
  const taskType = c.req.query("type");
  const limit = c.req.query("limit") ? parseInt(c.req.query("limit")!) : 20;

  let sql = `SELECT * FROM agent_tasks WHERE 1=1`;
  const params: unknown[] = [];

  if (taskType) {
    sql += ` AND task_type = ?`;
    params.push(taskType);
  }

  sql += ` ORDER BY created_at DESC LIMIT ?`;
  params.push(limit);

  const results = await c.env.DB.prepare(sql).bind(...params).all();
  return c.json({ tasks: results.results });
});

// ─── Helper: Promote agent finding to regulatory_updates ───
// Returns true if the row was inserted (false if it already existed).
async function promoteToRegulatoryUpdates(
  db: D1Database,
  finding: {
    source: string; document_type: string; title: string; summary?: string;
    published_date: string; effective_date?: string; affects_loan_types: string[];
    affects_states: string[]; url?: string; relevance_score: number; broker_impact?: string;
  }
): Promise<boolean> {
  // Check if already in regulatory_updates
  const exists = await db
    .prepare(`SELECT id FROM regulatory_updates WHERE source = ? AND title = ? AND published_date = ?`)
    .bind(finding.source, finding.title, finding.published_date)
    .first();

  if (exists) return false;

  await db
    .prepare(
      `INSERT INTO regulatory_updates
       (id, source, document_type, title, summary, full_text, effective_date, published_date,
        affects_loan_types, affects_states, url, relevance_score, broker_impact, crawl_job_id, crawled_at)
       VALUES (lower(hex(randomblob(16))), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, datetime('now'))`
    )
    .bind(
      finding.source,
      finding.document_type,
      finding.title,
      finding.summary ?? null,
      finding.summary ?? null,
      finding.effective_date ?? null,
      finding.published_date,
      JSON.stringify(finding.affects_loan_types),
      JSON.stringify(finding.affects_states),
      finding.url ?? null,
      finding.relevance_score,
      finding.broker_impact ?? null
    )
    .run();

  return true;
}

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
