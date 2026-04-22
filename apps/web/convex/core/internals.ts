/**
 * @organ core
 * @tissue internals
 * @description Internal mutations/queries not callable from the client.
 * @depends-on core/tables.ts
 * @depended-by Other organs that need to look up users internally;
 *   convex/http.ts (recordSyncBatch after ingestion).
 */

import { internalMutation, internalQuery } from "../_generated/server";
import { v } from "convex/values";

const recordSyncBatchArgs = {
  source: v.string(),
  recordsProcessed: v.number(),
  recordsCreated: v.number(),
  recordsUpdated: v.number(),
  recordsSkipped: v.number(),
  errors: v.array(v.string()),
  durationMs: v.number(),
};

/**
 * Internal: Get user by clerk ID.
 * Used by other organs to resolve the current user.
 */
export const getUserByClerkId = internalQuery({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_clerk", (q: any) => q.eq("clerkId", args.clerkId))
      .unique();
  },
});

/**
 * Internal: Record a single sync batch from a Cloudflare worker.
 * Called by every /ingest* HTTP action at the end of a batch so the
 * syncLog table has one row per worker run per category. Powers the
 * settings view "rates last refreshed N minutes ago".
 */
export const recordSyncBatch = internalMutation({
  args: recordSyncBatchArgs,
  handler: async (ctx, args) => {
    return await ctx.db.insert("syncLog", {
      source: args.source,
      syncedAt: Date.now(),
      recordsProcessed: args.recordsProcessed,
      recordsCreated: args.recordsCreated,
      recordsUpdated: args.recordsUpdated,
      recordsSkipped: args.recordsSkipped,
      errors: args.errors,
      durationMs: args.durationMs,
    });
  },
});
