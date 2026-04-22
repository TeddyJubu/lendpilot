/**
 * @organ documents
 * @tissue queries
 * @description Read operations for documents.
 * @depends-on documents/tables.ts
 * @depended-by Frontend: doc list in loan detail, overdue docs for feed
 */

import { query } from "../_generated/server";
import { v } from "convex/values";

/**
 * List documents for a loan, grouped by category.
 */
export const listByLoan = query({
  args: { loanId: v.id("loans") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q: any) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) return [];

    const docs = await ctx.db
      .query("documents")
      .withIndex("by_loan", (q: any) => q.eq("loanId", args.loanId))
      .take(100);

    return docs.filter((d: any) => d.ownerId === user._id && !d.isArchived);
  },
});

/**
 * List overdue documents for the current user.
 * Used by feed generation rules.
 */
export const listOverdue = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q: any) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) return [];

    const now = Date.now();

    const docs = await ctx.db
      .query("documents")
      .withIndex("by_due", (q: any) =>
        q.eq("ownerId", user._id).eq("status", "requested").lt("dueDate", now)
      )
      .take(100);

    return docs.filter((d: any) => !d.isArchived);
  },
});
