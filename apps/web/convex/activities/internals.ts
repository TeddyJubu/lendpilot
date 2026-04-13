/**
 * @organ activities
 * @tissue internals
 * @description Internal mutation to log activities from other organs.
 * @depends-on activities/tables.ts
 * @depended-by contacts/mutations.ts, loans/mutations.ts, documents/mutations.ts
 */

import { internalMutation } from "../_generated/server";
import { v } from "convex/values";

/**
 * Log an activity. Called internally by other organs on meaningful state changes.
 */
export const logActivity = internalMutation({
  args: {
    loanId: v.optional(v.id("loans")),
    contactId: v.id("contacts"),
    ownerId: v.id("users"),
    type: v.union(
      v.literal("email_sent"),
      v.literal("email_received"),
      v.literal("sms_sent"),
      v.literal("sms_received"),
      v.literal("call_made"),
      v.literal("call_received"),
      v.literal("note"),
      v.literal("stage_change"),
      v.literal("doc_uploaded"),
      v.literal("doc_requested"),
      v.literal("ai_action"),
      v.literal("system")
    ),
    subject: v.optional(v.string()),
    body: v.optional(v.string()),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("activities", {
      ...args,
      isAiGenerated: false,
      timestamp: Date.now(),
    });
  },
});
