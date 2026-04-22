/**
 * @organ rates
 * @tissue internals
 * @description Internal mutation used by convex/http.ts to batch-upsert
 *   rate snapshots coming from the Cloudflare mortgage-data-engine worker.
 *   Not callable from the client.
 * @depends-on rates/tables.ts, rates/validators.ts
 * @depended-by convex/http.ts (ingestRates action)
 */

import { internalMutation } from "../_generated/server";
import { batchUpsertRatesArgs, isCleanRateRecord } from "./validators";

/**
 * Insert a batch of rate snapshots. Each ingest is idempotent at the
 * (lenderId, productType, crawledAt) level — a new crawl produces a
 * fresh row, which is what the query layer expects (we always read
 * the latest snapshot per lender).
 *
 * Invalid rows (bad rate, APR < rate, out-of-range FICO/LTV) are
 * silently skipped — the worker pre-filters but we defend again here.
 */
export const batchUpsertRates = internalMutation({
  args: batchUpsertRatesArgs,
  handler: async (ctx, { records }) => {
    let created = 0;
    let skipped = 0;

    for (const record of records) {
      if (!isCleanRateRecord(record)) {
        skipped++;
        continue;
      }
      await ctx.db.insert("rateSnapshots", record);
      created++;
    }

    return { created, skipped };
  },
});
