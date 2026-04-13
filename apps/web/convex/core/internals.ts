/**
 * @organ core
 * @tissue internals
 * @description Internal mutations/queries not callable from the client.
 * @depends-on core/tables.ts
 * @depended-by Other organs that need to look up users internally
 */

import { internalQuery } from "../_generated/server";
import { v } from "convex/values";

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
