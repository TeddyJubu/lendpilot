/**
 * @organ core
 * @tissue mutations
 * @description Write operations for the users table.
 *   Called on first Clerk auth to create/fetch user record.
 * @depends-on core/validators.ts, core/tables.ts
 * @depended-by Frontend: useCurrentUser hook
 */

import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { createUserArgs, updateUserArgs } from "./validators";

/**
 * Create a user record if one doesn't exist for this Clerk ID,
 * or return the existing one. Called on every sign-in.
 */
export const createOrGetUser = mutation({
  args: createUserArgs,
  handler: async (ctx, args) => {
    // Check if user already exists by clerkId
    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q: any) => q.eq("clerkId", args.clerkId))
      .unique();

    if (existing) {
      return existing._id;
    }

    // Create new user with trial tier
    const userId = await ctx.db.insert("users", {
      clerkId: args.clerkId,
      email: args.email,
      name: args.name,
      tier: "trial",
      onboardingCompleted: false,
      updatedAt: Date.now(),
    });

    return userId;
  },
});

/**
 * Update the current user's profile fields.
 */
export const updateProfile = mutation({
  args: updateUserArgs,
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q: any) =>
        q.eq("clerkId", identity.subject)
      )
      .unique();

    if (!user) throw new Error("User not found");

    // Build update object with only provided fields
    const updates: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.nmlsId !== undefined) updates.nmlsId = args.nmlsId;
    if (args.companyName !== undefined) updates.companyName = args.companyName;
    if (args.phone !== undefined) updates.phone = args.phone;
    if (args.defaultStates !== undefined) updates.defaultStates = args.defaultStates;
    if (args.preferredLenders !== undefined) updates.preferredLenders = args.preferredLenders;
    if (args.onboardingStep !== undefined) updates.onboardingStep = args.onboardingStep;

    await ctx.db.patch(user._id, updates);
    return user._id;
  },
});

/**
 * Mark onboarding as completed.
 */
export const completeOnboarding = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q: any) =>
        q.eq("clerkId", identity.subject)
      )
      .unique();

    if (!user) throw new Error("User not found");

    await ctx.db.patch(user._id, {
      onboardingCompleted: true,
      updatedAt: Date.now(),
    });

    return user._id;
  },
});
