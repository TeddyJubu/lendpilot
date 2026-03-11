/**
 * @organ core
 * @tissue mutations
 * @description Creates/ensures the authenticated Clerk user exists in Convex.
 *   This is the Phase 0.3 bootstrap path: sign-in → upsert `users` record.
 * @depends-on
 *   - convex/core/tables.ts (users schema + indexes)
 *   - convex/_generated/server (mutation wrapper)
 * @depended-by
 *   - core/queries.ts (reads the record this creates)
 *   - UI: src/hooks/useCurrentUser.ts (bootstraps on sign-in)
 * @ai-notes
 *   - Must be idempotent by `clerkId`.
 *   - Never trust client for identity: `clerkId` always comes from `ctx.auth.getUserIdentity()`.
 *   - Always set `updatedAt: Date.now()` on write.
 */

import { ConvexError, v } from "convex/values";

import { mutation } from "../_generated/server";

/**
 * Ensure the current authenticated user has a corresponding Convex `users` row.
 *
 * @ai-modify To add a new persisted field on the user:
 *   1. Add field to `convex/core/tables.ts`.
 *   2. Add the field to the insert + patch payload below.
 *   3. Update return shape in `core/queries.ts` if the UI needs it.
 *   4. Update/extend tests in `core/__tests__/mutations.test.ts`.
 *
 * @ai-caution
 *   - Do not change the `clerkId` source (identity.subject). It's the multi-tenant boundary.
 *   - Keep lookup by `by_clerk` index for performance.
 */
export const createOrGetUser = mutation({
  args: {
    // These are used to populate the row and can be refreshed on subsequent sign-ins.
    // Identity is still authoritative for which row is affected.
    email: v.string(),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("Not authenticated.");

    const clerkId = identity.subject;
    if (!clerkId) throw new ConvexError("Missing identity subject.");

    const email = args.email.trim();
    const name = args.name.trim();

    if (!email) throw new ConvexError("Email is required.");
    if (!name) throw new ConvexError("Name is required.");

    const now = Date.now();

    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q) => q.eq("clerkId", clerkId))
      .unique();

    if (existing) {
      // Keep the row fresh (email/name can change in Clerk).
      await ctx.db.patch(existing._id, {
        email,
        name,
        updatedAt: now,
      });
      return existing._id;
    }

    const userId = await ctx.db.insert("users", {
      clerkId,
      email,
      name,

      // Defaults (Phase 0.3)
      tier: "trial",
      onboardingCompleted: false,
      updatedAt: now,
    });

    return userId;
  },
});
