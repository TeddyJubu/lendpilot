/**
 * @organ activities
 * @tissue mutations
 * @description Client-callable activity mutations (e.g., adding notes).
 * @depends-on activities/tables.ts
 * @depended-by Frontend: contact detail, loan detail
 */

import { mutation } from "../_generated/server";
import { v } from "convex/values";

/**
 * Add a manual note to a contact/loan.
 */
export const addNote = mutation({
  args: {
    contactId: v.id("contacts"),
    loanId: v.optional(v.id("loans")),
    body: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q: any) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) throw new Error("User not found");

    // Verify contact belongs to this user
    const contact = await ctx.db.get(args.contactId);
    if (!contact || contact.ownerId !== user._id) {
      throw new Error("Contact not found");
    }

    return await ctx.db.insert("activities", {
      contactId: args.contactId,
      loanId: args.loanId,
      ownerId: user._id,
      type: "note",
      body: args.body,
      isAiGenerated: false,
      timestamp: Date.now(),
    });
  },
});
