/**
 * @organ rates
 * @tissue validators
 * @description Validation rules + shared validators for rate snapshots
 *   ingested from the Cloudflare mortgage-data-engine worker.
 * @depends-on rates/tables.ts (schema)
 * @depended-by rates/internals.ts, rates/queries.ts, http.ts
 */

import { v } from "convex/values";

export const rateSourceValidator = v.union(
  v.literal("wholesale"),
  v.literal("retail")
);

/**
 * Wire-format for one rate record pushed by the worker.
 * Mirrors rateSnapshots but arrives with snake_case optional fields
 * resolved to numbers or defaults by the worker before posting.
 */
export const rateSnapshotRecord = v.object({
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
  source: rateSourceValidator,
});

export const batchUpsertRatesArgs = {
  records: v.array(rateSnapshotRecord),
};

// ── Pure validation helpers ───────────────────────────────────────

/** Mortgage rate sanity: between 2% and 15%. */
export function isValidRate(rate: number): boolean {
  return Number.isFinite(rate) && rate >= 2.0 && rate <= 15.0;
}

/** APR must be at least as high as the base rate (points/fees push it up). */
export function isValidApr(rate: number, apr: number): boolean {
  return Number.isFinite(apr) && apr >= rate;
}

/** FICO must fall inside the valid scoring band. */
export function isValidFico(fico: number): boolean {
  return Number.isInteger(fico) && fico >= 300 && fico <= 850;
}

/** LTV is expressed as a percent: 0-125. */
export function isValidLtv(ltv: number): boolean {
  return Number.isFinite(ltv) && ltv >= 0 && ltv <= 125;
}

/** Drop records that fail the basic sanity bar before we write them. */
export function isCleanRateRecord(r: {
  rate: number;
  apr: number;
  ficoMin?: number;
  ficoMax?: number;
  ltvMin?: number;
  ltvMax?: number;
}): boolean {
  if (!isValidRate(r.rate)) return false;
  if (!isValidApr(r.rate, r.apr)) return false;
  if (r.ficoMin !== undefined && !isValidFico(r.ficoMin)) return false;
  if (r.ficoMax !== undefined && !isValidFico(r.ficoMax)) return false;
  if (r.ltvMin !== undefined && !isValidLtv(r.ltvMin)) return false;
  if (r.ltvMax !== undefined && !isValidLtv(r.ltvMax)) return false;
  return true;
}
