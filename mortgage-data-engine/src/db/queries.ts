/**
 * Database query helpers for D1
 */

import type { Env, CrawlCategory, CrawlTrigger, CrawlStatus } from "../types";
import { uuid, now } from "../utils/helpers";

// ─── Crawl Jobs ───

export async function createCrawlJob(
  db: D1Database,
  category: CrawlCategory,
  trigger: CrawlTrigger,
  urlsTargeted: number
): Promise<string> {
  const id = uuid();
  await db
    .prepare(
      `INSERT INTO crawl_jobs (id, category, status, trigger_type, urls_targeted, started_at, created_at)
       VALUES (?, ?, 'running', ?, ?, ?, ?)`
    )
    .bind(id, category, trigger, urlsTargeted, now(), now())
    .run();
  return id;
}

export async function updateCrawlJob(
  db: D1Database,
  jobId: string,
  updates: {
    status?: CrawlStatus;
    urls_completed?: number;
    urls_failed?: number;
    credits_used?: number;
    records_created?: number;
    records_updated?: number;
    error_log?: string;
  }
) {
  const sets: string[] = [];
  const values: unknown[] = [];

  for (const [key, value] of Object.entries(updates)) {
    if (value !== undefined) {
      sets.push(`${key} = ?`);
      values.push(value);
    }
  }

  if (updates.status === "completed" || updates.status === "failed" || updates.status === "partial") {
    sets.push("completed_at = ?");
    values.push(now());
  }

  values.push(jobId);
  await db
    .prepare(`UPDATE crawl_jobs SET ${sets.join(", ")} WHERE id = ?`)
    .bind(...values)
    .run();
}

// ─── Credit Ledger ───

export async function getCreditsRemaining(db: D1Database): Promise<number> {
  const result = await db
    .prepare(
      `SELECT COALESCE(SUM(credits_used), 0) as total_used FROM credit_ledger`
    )
    .first<{ total_used: number }>();
  const totalBudget = 80_000; // From spec
  return totalBudget - (result?.total_used ?? 0);
}

export async function logCredits(
  db: D1Database,
  jobId: string,
  category: CrawlCategory,
  creditsUsed: number
) {
  const remaining = await getCreditsRemaining(db);
  const balanceAfter = remaining - creditsUsed;
  await db
    .prepare(
      `INSERT INTO credit_ledger (id, crawl_job_id, category, credits_used, balance_after, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .bind(uuid(), jobId, category, creditsUsed, balanceAfter, now())
    .run();
}

// ─── Lenders ───

export async function getActiveLenders(
  db: D1Database,
  type?: "wholesale" | "retail" | "credit_union" | "online"
) {
  const query = type
    ? `SELECT * FROM lenders WHERE is_active = 1 AND type = ? ORDER BY json_extract(crawl_config, '$.crawl_priority') ASC`
    : `SELECT * FROM lenders WHERE is_active = 1 ORDER BY type, json_extract(crawl_config, '$.crawl_priority') ASC`;

  const params = type ? [type] : [];
  const result = await db.prepare(query).bind(...params).all();
  return result.results;
}

// ─── Wholesale Rates ───

export async function insertWholesaleRate(
  db: D1Database,
  rate: {
    lender_id: string;
    product_type: string;
    rate: number;
    apr: number;
    points: number;
    lock_period_days: number;
    ltv_min?: number;
    ltv_max?: number;
    fico_min?: number;
    fico_max?: number;
    loan_amount_min?: number;
    loan_amount_max?: number;
    property_type?: string;
    occupancy?: string;
    comp_to_broker_bps?: number;
    crawl_job_id: string;
  }
) {
  await db
    .prepare(
      `INSERT INTO wholesale_rates
       (id, lender_id, product_type, rate, apr, points, lock_period_days,
        ltv_min, ltv_max, fico_min, fico_max, loan_amount_min, loan_amount_max,
        property_type, occupancy, comp_to_broker_bps, crawl_job_id, crawled_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      uuid(),
      rate.lender_id,
      rate.product_type,
      rate.rate,
      rate.apr,
      rate.points,
      rate.lock_period_days,
      rate.ltv_min ?? null,
      rate.ltv_max ?? null,
      rate.fico_min ?? null,
      rate.fico_max ?? null,
      rate.loan_amount_min ?? null,
      rate.loan_amount_max ?? null,
      rate.property_type ?? null,
      rate.occupancy ?? null,
      rate.comp_to_broker_bps ?? null,
      rate.crawl_job_id,
      now()
    )
    .run();
}

// ─── Retail Rates ───

export async function insertRetailRate(
  db: D1Database,
  rate: {
    lender_id: string;
    lender_type: string;
    product_type: string;
    advertised_rate: number;
    advertised_apr: number;
    points: number;
    estimated_fees?: number;
    assumptions_fico?: number;
    assumptions_ltv?: number;
    assumptions_loan_amount?: number;
    source_url: string;
    crawl_job_id: string;
  }
) {
  await db
    .prepare(
      `INSERT INTO retail_rates
       (id, lender_id, lender_type, product_type, advertised_rate, advertised_apr,
        points, estimated_fees, assumptions_fico, assumptions_ltv, assumptions_loan_amount,
        source_url, crawl_job_id, crawled_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      uuid(),
      rate.lender_id,
      rate.lender_type,
      rate.product_type,
      rate.advertised_rate,
      rate.advertised_apr,
      rate.points,
      rate.estimated_fees ?? null,
      rate.assumptions_fico ?? null,
      rate.assumptions_ltv ?? null,
      rate.assumptions_loan_amount ?? null,
      rate.source_url,
      rate.crawl_job_id,
      now()
    )
    .run();
}

// ─── Property Enrichment ───

export async function upsertPropertyEnrichment(
  db: D1Database,
  data: {
    property_address: string;
    address_normalized: string;
    estimated_value?: number;
    last_sale_price?: number;
    last_sale_date?: string;
    tax_annual?: number;
    tax_assessed_value?: number;
    bedrooms?: number;
    bathrooms?: number;
    sqft?: number;
    lot_size_acres?: number;
    year_built?: number;
    property_type?: string;
    listing_status?: string;
    listing_price?: number;
    days_on_market?: number;
    hoa_monthly?: number;
    data_sources: string[];
    crawl_job_id: string;
    cache_expires_at: string;
  }
) {
  await db
    .prepare(
      `INSERT INTO property_enrichments
       (id, property_address, address_normalized, estimated_value, last_sale_price,
        last_sale_date, tax_annual, tax_assessed_value, bedrooms, bathrooms, sqft,
        lot_size_acres, year_built, property_type, listing_status, listing_price,
        days_on_market, hoa_monthly, data_sources, crawl_job_id, crawled_at, cache_expires_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(address_normalized) DO UPDATE SET
         estimated_value = excluded.estimated_value,
         last_sale_price = excluded.last_sale_price,
         listing_status = excluded.listing_status,
         listing_price = excluded.listing_price,
         days_on_market = excluded.days_on_market,
         data_sources = excluded.data_sources,
         crawl_job_id = excluded.crawl_job_id,
         crawled_at = excluded.crawled_at,
         cache_expires_at = excluded.cache_expires_at`
    )
    .bind(
      uuid(),
      data.property_address,
      data.address_normalized,
      data.estimated_value ?? null,
      data.last_sale_price ?? null,
      data.last_sale_date ?? null,
      data.tax_annual ?? null,
      data.tax_assessed_value ?? null,
      data.bedrooms ?? null,
      data.bathrooms ?? null,
      data.sqft ?? null,
      data.lot_size_acres ?? null,
      data.year_built ?? null,
      data.property_type ?? null,
      data.listing_status ?? null,
      data.listing_price ?? null,
      data.days_on_market ?? null,
      data.hoa_monthly ?? null,
      JSON.stringify(data.data_sources),
      data.crawl_job_id,
      now(),
      data.cache_expires_at
    )
    .run();
}

// ─── Query: Best wholesale rate for borrower profile ───

export async function queryBestWholesaleRates(
  db: D1Database,
  query: {
    product_type?: string;
    fico?: number;
    ltv?: number;
    loan_amount?: number;
    property_type?: string;
    occupancy?: string;
    limit?: number;
  }
) {
  let sql = `SELECT wr.*, l.name as lender_name
    FROM wholesale_rates wr
    JOIN lenders l ON wr.lender_id = l.id
    WHERE 1=1`;
  const params: unknown[] = [];

  if (query.product_type) {
    sql += ` AND wr.product_type = ?`;
    params.push(query.product_type);
  }
  if (query.fico) {
    sql += ` AND wr.fico_min <= ? AND wr.fico_max >= ?`;
    params.push(query.fico, query.fico);
  }
  if (query.ltv) {
    sql += ` AND wr.ltv_min <= ? AND wr.ltv_max >= ?`;
    params.push(query.ltv, query.ltv);
  }
  if (query.loan_amount) {
    sql += ` AND wr.loan_amount_min <= ? AND wr.loan_amount_max >= ?`;
    params.push(query.loan_amount, query.loan_amount);
  }
  if (query.property_type) {
    sql += ` AND wr.property_type = ?`;
    params.push(query.property_type);
  }
  if (query.occupancy) {
    sql += ` AND wr.occupancy = ?`;
    params.push(query.occupancy);
  }

  sql += ` ORDER BY wr.rate ASC LIMIT ?`;
  params.push(query.limit ?? 20);

  return db.prepare(sql).bind(...params).all();
}
