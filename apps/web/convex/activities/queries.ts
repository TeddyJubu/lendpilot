/**
 * @organ activities
 * @tissue queries
 * @description Read operations for activities.
 * @depends-on activities/tables.ts
 * @depended-by Frontend: contact detail, loan detail activity timelines
 */

import { query } from "../_generated/server";
import { v } from "convex/values";

/**
 * List activities for a contact, most recent first.
 */
export const listByContact = query({
  args: {
    contactId: v.id("contacts"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const limit = args.limit ?? 50;

    const activities = await ctx.db
      .query("activities")
      .withIndex("by_contact", (q: any) => q.eq("contactId", args.contactId))
      .order("desc")
      .take(limit);

    return activities;
  },
});

/**
 * List activities for a loan, most recent first.
 */
export const listByLoan = query({
  args: {
    loanId: v.id("loans"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const limit = args.limit ?? 50;

    const activities = await ctx.db
      .query("activities")
      .withIndex("by_loan", (q: any) => q.eq("loanId", args.loanId))
      .order("desc")
      .take(limit);

    return activities;
  },
});
