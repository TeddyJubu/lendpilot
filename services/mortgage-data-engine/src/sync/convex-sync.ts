/**
 * Convex Sync Layer — Write-back interface from D1 → Convex HTTP actions
 *
 * Status: STUB — not yet implemented (Phase 6-7 dependency)
 *
 * After each crawl, the Cloudflare Worker writes aggregated results back to
 * Convex so the frontend (useQuery hooks) sees live data in real-time.
 *
 * Auth: Bearer token via CONVEX_SITE_URL + INGESTION_SECRET env vars.
 * Convex validates the token in every HTTP action before accepting a batch.
 *
 * Batch format (max 100 records per request):
 * POST /api/ingest/<resource>
 * Authorization: Bearer <INGESTION_SECRET>
 * { records: [...], source: "<crawler-name>" }
 *
 * Convex responds:
 * { success: true, created: N, updated: N, errors: string[] }
 */

// ─── Shared Types ───

export interface SyncResult {
  success: boolean;
  created: number;
  updated: number;
  errors: string[];
}

export interface SyncBatch<T> {
  records: T[];
  source: string;
  crawledAt: number;
}

// ─── Rate Snapshot (wholesale + retail) ───

export interface RateSnapshotRecord {
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
  source: "wholesale" | "retail";
  crawledAt: number;
}

// ─── Regulatory Update ───

export interface RegulatoryUpdateRecord {
  externalId: string; // source + title + date (dedup key)
  source: string;     // "CFPB", "FHA", "VA", etc.
  documentType: string;
  title: string;
  summary: string;
  publishedDate: string;
  effectiveDate?: string;
  affectsLoanTypes: string[];
  affectsStates: string[];
  url: string;
  relevanceScore: number;
  brokerImpact: string;
}

// ─── DPA Program ───

export interface DpaProgramRecord {
  externalId: string; // Dedup key from D1
  programName: string;
  state: string;
  administeredBy: string;
  assistanceType: string;
  assistanceAmountMax?: number;
  firstTimeBuyerRequired: boolean;
  incomeLimitMax?: number;
  ficoMin?: number;
  loanTypesCompatible: string[];
  programStatus: "active" | "inactive" | "expired";
}

// ─── Lead Enrichment ───

export interface LeadEnrichmentRecord {
  leadId: string;  // Convex contact ID
  propertyEnrichment?: {
    estimatedValue?: number;
    lastSalePrice?: number;
    bedrooms?: number;
    bathrooms?: number;
    sqft?: number;
    yearBuilt?: number;
    taxAnnual?: number;
  };
  personEnrichment?: {
    jobTitle?: string;
    employer?: string;
    estimatedIncomeBracket?: string;
    linkedinUrl?: string;
  };
  enrichedAt: number;
}

// ─── Sync Functions (stubs — implement in Phase 6) ───

/**
 * Sync crawled rate snapshots to Convex rates table.
 *
 * @stub Implement after Convex HTTP action `POST /api/ingest/rates` exists.
 */
export async function syncRates(
  _convexSiteUrl: string,
  _ingestionSecret: string,
  _batch: SyncBatch<RateSnapshotRecord>
): Promise<SyncResult> {
  // TODO Phase 6: POST to Convex HTTP action
  // const res = await fetch(`${convexSiteUrl}/api/ingest/rates`, {
  //   method: "POST",
  //   headers: { "Authorization": `Bearer ${ingestionSecret}`, "Content-Type": "application/json" },
  //   body: JSON.stringify(batch),
  // });
  // return res.json();
  return { success: false, created: 0, updated: 0, errors: ["Not implemented — Phase 6"] };
}

/**
 * Sync regulatory updates to Convex.
 *
 * @stub Implement after Convex HTTP action `POST /api/ingest/regulatory` exists.
 */
export async function syncRegulatoryUpdates(
  _convexSiteUrl: string,
  _ingestionSecret: string,
  _batch: SyncBatch<RegulatoryUpdateRecord>
): Promise<SyncResult> {
  return { success: false, created: 0, updated: 0, errors: ["Not implemented — Phase 6"] };
}

/**
 * Sync DPA programs to Convex.
 *
 * @stub Implement after Convex HTTP action `POST /api/ingest/dpa` exists.
 */
export async function syncDpaPrograms(
  _convexSiteUrl: string,
  _ingestionSecret: string,
  _batch: SyncBatch<DpaProgramRecord>
): Promise<SyncResult> {
  return { success: false, created: 0, updated: 0, errors: ["Not implemented — Phase 6"] };
}

/**
 * Write lead enrichment data back to a specific Convex contact.
 *
 * @stub Implement after Convex HTTP action `POST /api/ingest/enrichment` exists.
 */
export async function syncLeadEnrichment(
  _convexSiteUrl: string,
  _ingestionSecret: string,
  _record: LeadEnrichmentRecord
): Promise<SyncResult> {
  return { success: false, created: 0, updated: 0, errors: ["Not implemented — Phase 6"] };
}
