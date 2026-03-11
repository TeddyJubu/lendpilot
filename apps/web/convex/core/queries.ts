/**
 * @organ core
 * @tissue queries
 * @description Read model for the currently authenticated user.
 *   Returns a minimal shape for the app shell (avatar/name, onboarding state).
 * @depends-on
 *   - convex/core/tables.ts (users schema + indexes)
 *   - convex/_generated/server (query wrapper)
 * @depended-by
 *   - UI: src/hooks/useCurrentUser.ts
 */

import { query } from "../_generated/server";

/**
 * Fetch the authenticated user's Convex `users` row.
 *
 * @ai-notes
 *   - Returns `null` when not authenticated or when the row doesn't exist yet.
 *     (The client is responsible for calling `createOrGetUser` on sign-in.)
 */
export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const clerkId = identity.subject;
    if (!clerkId) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q) => q.eq("clerkId", clerkId))
      .unique();

    if (!user) return null;

    return {
      _id: user._id,
      clerkId: user.clerkId,
      email: user.email,
      name: user.name,
      tier: user.tier,
      onboardingCompleted: user.onboardingCompleted,
      onboardingStep: user.onboardingStep,
    };
  },
});
