/**
 * @organ feed
 * @tissue mutations
 * @description Write operations for feed items.
 * @depends-on feed/tables.ts
 * @depended-by Frontend: today view feed cards
 * @ai-notes
 *   - Every mutation MUST set `updatedAt: Date.now()`.
 *   - Every mutation MUST verify ownerId === authenticated user.
 */

import { mutation } from "../_generated/server";
import { v } from "convex/values";

/**
 * Create a feed item (used by feed generation rules).
 */
export const create = mutation({
  args: {
    type: v.union(
      v.literal("hot_lead"),
      v.literal("condition_due"),
      v.literal("rate_opportunity"),
      v.literal("doc_follow_up"),
      v.literal("pipeline_update"),
      v.literal("relationship_touch"),
      v.literal("closing_prep"),
      v.literal("ai_insight")
    ),
    priority: v.union(
      v.literal("urgent"),
      v.literal("high"),
      v.literal("medium"),
      v.literal("low")
    ),
    title: v.string(),
    description: v.string(),
    suggestedAction: v.string(),
    suggestedActionType: v.string(),
    reasoning: v.optional(v.string()),
    loanId: v.optional(v.id("loans")),
    contactId: v.optional(v.id("contacts")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q: any) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) throw new Error("User not found");

    if (args.loanId) {
      const loan = await ctx.db.get(args.loanId);
      if (!loan || loan.ownerId !== user._id) throw new Error("Loan not found");
    }
    if (args.contactId) {
      const contact = await ctx.db.get(args.contactId);
      if (!contact || contact.ownerId !== user._id) throw new Error("Contact not found");
    }

    return await ctx.db.insert("feedItems", {
      ownerId: user._id,
      type: args.type,
      priority: args.priority,
      title: args.title,
      description: args.description,
      suggestedAction: args.suggestedAction,
      suggestedActionType: args.suggestedActionType,
      reasoning: args.reasoning,
      loanId: args.loanId,
      contactId: args.contactId,
      status: "active",
      updatedAt: Date.now(),
    });

    return args.feedItemId;
  },
});

/**
 * Complete a feed item.
 */
export const complete = mutation({
  args: { feedItemId: v.id("feedItems") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q: any) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) throw new Error("User not found");

    const item = await ctx.db.get(args.feedItemId);
    if (!item || item.ownerId !== user._id) {
      throw new Error("Feed item not found");
    }

    await ctx.db.patch(args.feedItemId, {
      status: "completed",
      completedAt: Date.now(),
      updatedAt: Date.now(),
    });

    return args.feedItemId;
  },
});

/**
 * Dismiss a feed item.
 */
export const dismiss = mutation({
  args: { feedItemId: v.id("feedItems") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q: any) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) throw new Error("User not found");

    const item = await ctx.db.get(args.feedItemId);
    if (!item || item.ownerId !== user._id) {
      throw new Error("Feed item not found");
    }

    await ctx.db.patch(args.feedItemId, {
      status: "dismissed",
      updatedAt: Date.now(),
    });

    return args.feedItemId;
  },
});

/**
 * Snooze a feed item for a specified duration.
 */
export const snooze = mutation({
  args: {
    feedItemId: v.id("feedItems"),
    snoozeDurationMs: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q: any) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) throw new Error("User not found");

    const item = await ctx.db.get(args.feedItemId);
    if (!item || item.ownerId !== user._id) {
      throw new Error("Feed item not found");
    }

    await ctx.db.patch(args.feedItemId, {
      status: "snoozed",
      snoozedUntil: Date.now() + args.snoozeDurationMs,
      updatedAt: Date.now(),
    });

    return args.feedItemId;
  },
});
