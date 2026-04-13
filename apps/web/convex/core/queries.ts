/**
 * @organ core
 * @tissue queries
 * @description Read operations for the users table.
 * @depends-on core/tables.ts
 * @depended-by Frontend: useCurrentUser hook, layout
 */

import { query } from "../_generated/server";
import { v } from "convex/values";

/**
 * Get the currently authenticated user.
 * Returns null if not authenticated or no user record exists.
 */
export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q: any) =>
        q.eq("clerkId", identity.subject)
      )
      .unique();

    return user;
  },
});

/**
 * Get a user by their Convex document ID.
 * Used for displaying user info (e.g., owner name on a contact).
 */
export const getUserById = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId);
  },
});
