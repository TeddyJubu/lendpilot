/**
 * @organ feed
 * @tissue queries
 * @description Read operations for feed items.
 * @depends-on feed/tables.ts
 * @depended-by Frontend: today view
 */

import { query } from "../_generated/server";

/**
 * List active feed items for the current user, sorted by priority.
 */
export const listActive = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q: any) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) return [];

    const items = await ctx.db
      .query("feedItems")
      .withIndex("by_owner_active", (q: any) =>
        q.eq("ownerId", user._id).eq("status", "active")
      )
      .take(50);

    // Sort by priority (urgent first)
    const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
    return items.sort(
      (a: any, b: any) =>
        (priorityOrder[a.priority as keyof typeof priorityOrder] ?? 4) -
        (priorityOrder[b.priority as keyof typeof priorityOrder] ?? 4)
    );
  },
});
