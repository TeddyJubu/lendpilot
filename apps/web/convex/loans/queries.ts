/**
 * @organ loans
 * @tissue queries
 * @description Read operations for loans. All queries filter by ownerId and isArchived.
 * @depends-on loans/tables.ts
 * @depended-by Frontend: pipeline kanban, loan detail, contact detail
 */

import { query } from "../_generated/server";
import { v } from "convex/values";

/**
 * List all non-archived loans for the current user (for pipeline kanban).
 * Groups are done client-side — this returns all loans for the user.
 */
export const listForPipeline = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q: any) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) return [];

    const loans = await ctx.db
      .query("loans")
      .withIndex("by_owner_active", (q: any) =>
        q.eq("ownerId", user._id).eq("isArchived", false)
      )
      .take(500);

    return loans;
  },
});

/**
 * Get a single loan by ID. Verifies ownership.
 */
export const getById = query({
  args: { loanId: v.id("loans") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q: any) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) return null;

    const loan = await ctx.db.get(args.loanId);
    if (!loan || loan.ownerId !== user._id) return null;

    return loan;
  },
});

/**
 * List loans for a specific contact.
 */
export const listByContact = query({
  args: { contactId: v.id("contacts") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q: any) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) return [];

    const loans = await ctx.db
      .query("loans")
      .withIndex("by_contact", (q: any) => q.eq("contactId", args.contactId))
      .take(50);

    // Filter by owner and not archived
    return loans.filter(
      (l: any) => l.ownerId === user._id && !l.isArchived
    );
  },
});
