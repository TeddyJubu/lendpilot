/**
 * @organ contacts
 * @tissue queries
 * @description Read operations for contacts. All queries filter by ownerId and isArchived.
 * @depends-on contacts/tables.ts
 * @depended-by Frontend: contacts list, contact detail, loan form (select contact)
 */

import { query } from "../_generated/server";
import { v } from "convex/values";

/**
 * List contacts for the current user, paginated.
 * Filters out archived contacts by default.
 */
export const list = query({
  args: {
    paginationOpts: v.any(),
    type: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return { page: [], isDone: true, continueCursor: "" };

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q: any) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) return { page: [], isDone: true, continueCursor: "" };

    let contactsQuery = ctx.db
      .query("contacts")
      .withIndex("by_owner", (q: any) =>
        q.eq("ownerId", user._id).eq("isArchived", false)
      );

    const results = await contactsQuery.paginate(args.paginationOpts);

    // Client-side type filter (Convex compound indexes are limited)
    if (args.type) {
      return {
        ...results,
        page: results.page.filter((c: any) => c.type === args.type),
      };
    }

    return results;
  },
});

/**
 * Get a single contact by ID. Verifies ownership.
 */
export const getById = query({
  args: { contactId: v.id("contacts") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q: any) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) return null;

    const contact = await ctx.db.get(args.contactId);
    if (!contact || contact.ownerId !== user._id) return null;

    return contact;
  },
});

/**
 * Search contacts by first name using the search index.
 */
export const search = query({
  args: {
    query: v.string(),
    type: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q: any) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) return [];

    if (!args.query.trim()) return [];

    let searchQuery = ctx.db
      .query("contacts")
      .withSearchIndex("search_name", (q: any) => {
        let sq = q.search("firstName", args.query).eq("ownerId", user._id);
        if (args.type) sq = sq.eq("type", args.type);
        return sq;
      });

    const results = await searchQuery.take(20);

    // Filter out archived
    return results.filter((c: any) => !c.isArchived);
  },
});

/**
 * List all non-archived contacts for the current user (for dropdowns).
 * Returns only id, firstName, lastName, type — no full documents.
 */
export const listForSelect = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q: any) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) return [];

    const contacts = await ctx.db
      .query("contacts")
      .withIndex("by_owner", (q: any) =>
        q.eq("ownerId", user._id).eq("isArchived", false)
      )
      .take(500);

    return contacts.map((c: any) => ({
      _id: c._id,
      firstName: c.firstName,
      lastName: c.lastName,
      type: c.type,
    }));
  },
});
