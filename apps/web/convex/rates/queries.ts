/**
 * @organ rates
 * @tissue queries
 * @description Read operations for rate snapshots. The main consumer is
 *   the copilot panel, which asks "what's the best rate for this borrower
 *   profile right now?" and also "how does that compare to retail?".
 * @depends-on rates/tables.ts, rates/helpers.ts
 * @depended-by frontend copilot, pipeline loan detail panel
 */

import { query } from "../_generated/server";
import { v } from "convex/values";
import {
  dedupeByLatestSnapshot,
  isActiveRate,
  rateMatchesProfile,
  sortByBestRate,
  wholesaleVsRetailSpread,
  type RateLike,
} from "./helpers";

const profileArgs = {
  fico: v.optional(v.number()),
  ltv: v.optional(v.number()),
  loanAmount: v.optional(v.number()),
  productType: v.optional(v.string()),
  occupancy: v.optional(v.string()),
  propertyType: v.optional(v.string()),
  source: v.optional(v.union(v.literal("wholesale"), v.literal("retail"))),
  limit: v.optional(v.number()),
};

/**
 * List the best active rates matching a borrower profile.
 * Uses by_product_lookup for the hot path (product + occupancy + propertyType).
 */
export const listBestRates = query({
  args: profileArgs,
  handler: async (ctx, args) => {
    const now = Date.now();
    const source = args.source;

    // Pull a reasonably tight slice. Query index if we have the triple;
    // otherwise fall back to a full scan capped at 500.
    const candidates: RateLike[] = [];
    const iter =
      args.productType && args.occupancy && args.propertyType
        ? ctx.db
            .query("rateSnapshots")
            .withIndex("by_product_lookup", (q: any) =>
              q
                .eq("productType", args.productType)
                .eq("occupancy", args.occupancy)
                .eq("propertyType", args.propertyType)
            )
            .order("desc")
        : ctx.db.query("rateSnapshots").order("desc");

    for await (const row of iter) {
      if (candidates.length >= 500) break;
      if (source && row.source !== source) continue;
      candidates.push(row as unknown as RateLike);
    }

    const matches = dedupeByLatestSnapshot(candidates)
      .filter((r) => isActiveRate(r as any, now))
      .filter((r) => rateMatchesProfile(r, args));

    return sortByBestRate(matches).slice(0, args.limit ?? 20);
  },
});

/**
 * Compare the best wholesale rate we have for a profile against the best
 * retail rate — the killer broker selling-point.
 */
export const wholesaleRetailSpread = query({
  args: profileArgs,
  handler: async (ctx, args) => {
    const now = Date.now();
    const rows: RateLike[] = [];

    for await (const row of ctx.db.query("rateSnapshots").order("desc")) {
      if (rows.length >= 500) break;
      rows.push(row as unknown as RateLike);
    }

    const active = dedupeByLatestSnapshot(rows).filter((r) =>
      isActiveRate(r as any, now)
    );
    const matching = active.filter((r) => rateMatchesProfile(r, args));
    return wholesaleVsRetailSpread(matching);
  },
});

/**
 * Most recent sync timestamp per source — used by the admin/settings
 * view to show "rates last refreshed N minutes ago".
 */
export const lastSyncedAt = query({
  args: { source: v.string() },
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("syncLog")
      .withIndex("by_source", (q: any) => q.eq("source", args.source))
      .order("desc")
      .first();
    return row?.syncedAt ?? null;
  },
});
