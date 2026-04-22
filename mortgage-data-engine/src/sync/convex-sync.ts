/**
 * Convex sync layer.
 *
 * Every crawler writes its canonical records to D1 first (operational
 * store, cache, crawl-job audit trail). After a crawl completes it hands
 * the fresh records to this module, which POSTs them to the Convex
 * ingestion HTTP actions. Convex is the frontend's single source of truth.
 *
 * Design choices:
 *  - Fire-and-retry with exponential backoff. Sync failures do not abort
 *    the crawl — D1 still has the data, a later run will retry.
 *  - Batch size capped at 100 (mirrors the Convex endpoint limit).
 *  - Never throws. Returns a structured result the caller can log.
 */

import type { Env } from "../types";

export interface SyncMeta {
  source: string;
  errors?: string[];
}

export interface SyncResult {
  success: boolean;
  batchesSent: number;
  recordsSent: number;
  recordsCreated: number;
  recordsSkipped: number;
  errors: string[];
}

export interface RateSnapshotWire {
  lenderId: string;
  lenderName: string;
  productType: string;
  rate: number;
  apr: number;
  points: number;
  lockPeriodDays: number;
  ltvMin: number;
  ltvMax: number;
  ficoMin: number;
  ficoMax: number;
  loanAmountMin: number;
  loanAmountMax: number;
  propertyType: string;
  occupancy: string;
  compToBrokerBps?: number;
  effectiveDate: number;
  expirationDate: number;
  crawledAt: number;
  source: "wholesale" | "retail";
}

export interface PropertyEnrichmentWire {
  loanId: string;
  estimatedValue?: number;
  lastSalePrice?: number;
  bedrooms?: number;
  bathrooms?: number;
  sqft?: number;
  yearBuilt?: number;
  taxAnnual?: number;
}

export interface ContactEnrichmentWire {
  contactId: string;
  jobTitle?: string;
  employer?: string;
  estimatedIncomeBracket?: string;
  linkedinUrl?: string;
}

const BATCH_SIZE = 100;
const MAX_RETRIES = 4;
const BASE_BACKOFF_MS = 500;

// ── Public API ───────────────────────────────────────────────────

/** Push rate snapshots to Convex in batches of 100. */
export async function syncRatesToConvex(
  env: Env,
  records: RateSnapshotWire[],
  meta: SyncMeta
): Promise<SyncResult> {
  if (!records.length) return emptyResult();
  if (!isSyncConfigured(env)) return skipResult("Convex sync not configured");

  const out = emptyResult();
  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);
    const response = await postJson(env, "/ingestRates", {
      records: batch,
      syncMeta: meta,
    });
    out.batchesSent++;
    out.recordsSent += batch.length;

    if (!response.ok) {
      out.success = false;
      out.errors.push(
        `batch ${out.batchesSent}: HTTP ${response.status} ${response.error ?? ""}`.trim()
      );
      continue;
    }
    out.recordsCreated += response.body?.created ?? 0;
    out.recordsSkipped += response.body?.skipped ?? 0;
  }
  return out;
}

/** Patch a single loan's property enrichment block. */
export async function syncPropertyEnrichmentToConvex(
  env: Env,
  payload: PropertyEnrichmentWire
): Promise<SyncResult> {
  if (!isSyncConfigured(env)) return skipResult("Convex sync not configured");

  const response = await postJson(env, "/ingestPropertyEnrichment", payload);
  return singleRecordResult(response);
}

/** Patch a single contact's enrichment block. */
export async function syncContactEnrichmentToConvex(
  env: Env,
  payload: ContactEnrichmentWire
): Promise<SyncResult> {
  if (!isSyncConfigured(env)) return skipResult("Convex sync not configured");

  const response = await postJson(env, "/ingestContactEnrichment", payload);
  return singleRecordResult(response);
}

// ── Internals ───────────────────────────────────────────────────

interface PostResult {
  ok: boolean;
  status: number;
  body?: any;
  error?: string;
}

function isSyncConfigured(env: Env): boolean {
  return Boolean(env.CONVEX_URL && env.CONVEX_INGESTION_SECRET);
}

async function postJson(
  env: Env,
  path: string,
  body: unknown
): Promise<PostResult> {
  const url = `${env.CONVEX_URL.replace(/\/+$/, "")}${path}`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${env.CONVEX_INGESTION_SECRET}`,
  };
  const payload = JSON.stringify(body);

  let lastError: string | undefined;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers,
        body: payload,
      });

      // Retry 5xx and 429; fail fast on other 4xx (client error).
      if (response.ok) {
        const parsed = await safeJson(response);
        return { ok: true, status: response.status, body: parsed };
      }
      if (response.status >= 500 || response.status === 429) {
        lastError = `HTTP ${response.status}`;
      } else {
        const parsed = await safeJson(response);
        return {
          ok: false,
          status: response.status,
          body: parsed,
          error: parsed?.error ?? `HTTP ${response.status}`,
        };
      }
    } catch (err) {
      lastError = err instanceof Error ? err.message : "network error";
    }

    if (attempt < MAX_RETRIES) {
      await sleep(BASE_BACKOFF_MS * 2 ** attempt);
    }
  }

  return { ok: false, status: 0, error: lastError ?? "retries exhausted" };
}

async function safeJson(response: Response): Promise<any> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function emptyResult(): SyncResult {
  return {
    success: true,
    batchesSent: 0,
    recordsSent: 0,
    recordsCreated: 0,
    recordsSkipped: 0,
    errors: [],
  };
}

function skipResult(reason: string): SyncResult {
  return {
    success: false,
    batchesSent: 0,
    recordsSent: 0,
    recordsCreated: 0,
    recordsSkipped: 0,
    errors: [reason],
  };
}

function singleRecordResult(response: PostResult): SyncResult {
  if (!response.ok) {
    return {
      success: false,
      batchesSent: 1,
      recordsSent: 1,
      recordsCreated: 0,
      recordsSkipped: 1,
      errors: [response.error ?? `HTTP ${response.status}`],
    };
  }
  const updated = response.body?.updated === true;
  return {
    success: true,
    batchesSent: 1,
    recordsSent: 1,
    recordsCreated: 0,
    recordsSkipped: updated ? 0 : 1,
    errors: [],
  };
}

// ── D1 → wire helpers ───────────────────────────────────────────

/**
 * Convert a wholesale/retail rate row as it sits in D1 into the
 * wire format Convex expects. Callers pass the rows from D1 + the
 * matching lender name + source.
 */
export function rateRowToWire(
  row: Record<string, any>,
  lenderName: string,
  source: "wholesale" | "retail"
): RateSnapshotWire | null {
  const rate = num(row.rate ?? row.advertised_rate);
  const apr = num(row.apr ?? row.advertised_apr);
  if (rate === null || apr === null) return null;

  const crawledAt = toEpochMs(row.crawled_at);
  // Wholesale sheets expire same-day; retail advertised rates get 24h.
  const ttlMs = source === "wholesale" ? 12 * 3600_000 : 24 * 3600_000;

  return {
    lenderId: String(row.lender_id),
    lenderName,
    productType: String(row.product_type),
    rate,
    apr,
    points: num(row.points) ?? 0,
    lockPeriodDays: num(row.lock_period_days) ?? 30,
    ltvMin: num(row.ltv_min) ?? 0,
    ltvMax: num(row.ltv_max) ?? 125,
    ficoMin: num(row.fico_min) ?? 300,
    ficoMax: num(row.fico_max) ?? 850,
    loanAmountMin: num(row.loan_amount_min) ?? 0,
    loanAmountMax: num(row.loan_amount_max) ?? 10_000_000,
    propertyType: String(row.property_type ?? "SFR"),
    occupancy: String(row.occupancy ?? "Primary"),
    compToBrokerBps:
      row.comp_to_broker_bps != null ? num(row.comp_to_broker_bps)! : undefined,
    effectiveDate: crawledAt,
    expirationDate: crawledAt + ttlMs,
    crawledAt,
    source,
  };
}

function num(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function toEpochMs(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return Date.now();
}
