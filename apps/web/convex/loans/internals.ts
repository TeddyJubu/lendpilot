/**
 * @organ loans
 * @tissue internals
 * @description Internal mutations/queries not callable from the client.
 *   Used by http.ts (property enrichment ingestion) and potentially
 *   other organs that need to mutate loans without an auth identity
 *   (e.g. LOS sync workers in Phase 8).
 * @depends-on loans/tables.ts, rates/validators.ts
 * @depended-by convex/http.ts (ingestPropertyEnrichment)
 */

import { internalMutation, internalQuery } from "../_generated/server";
import { v } from "convex/values";

const patchPropertyEnrichmentArgs = {
  loanId: v.id("loans"),
  estimatedValue: v.optional(v.number()),
  lastSalePrice: v.optional(v.number()),
  bedrooms: v.optional(v.number()),
  bathrooms: v.optional(v.number()),
  sqft: v.optional(v.number()),
  yearBuilt: v.optional(v.number()),
  taxAnnual: v.optional(v.number()),
};

/**
 * Internal: Get loan by ID without auth check (caller must verify).
 */
export const getLoanInternal = internalQuery({
  args: { loanId: v.id("loans") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.loanId);
  },
});

/**
 * Internal: Patch a loan's AI-derived property enrichment block.
 * Called from /ingestPropertyEnrichment after the lead-enricher worker
 * scrapes Zillow/Redfin/Realtor.
 *
 * Merge semantics: provided fields overwrite, unprovided fields stay.
 * enrichedAt is always refreshed.
 */
export const patchPropertyEnrichment = internalMutation({
  args: patchPropertyEnrichmentArgs,
  handler: async (ctx, args) => {
    const loan = await ctx.db.get(args.loanId);
    if (!loan) return { updated: false };

    const prev = loan.propertyEnrichment ?? {};
    await ctx.db.patch(args.loanId, {
      propertyEnrichment: {
        estimatedValue: args.estimatedValue ?? prev.estimatedValue,
        lastSalePrice: args.lastSalePrice ?? prev.lastSalePrice,
        bedrooms: args.bedrooms ?? prev.bedrooms,
        bathrooms: args.bathrooms ?? prev.bathrooms,
        sqft: args.sqft ?? prev.sqft,
        yearBuilt: args.yearBuilt ?? prev.yearBuilt,
        taxAnnual: args.taxAnnual ?? prev.taxAnnual,
        enrichedAt: Date.now(),
      },
      updatedAt: Date.now(),
    });
    return { updated: true };
  },
});
