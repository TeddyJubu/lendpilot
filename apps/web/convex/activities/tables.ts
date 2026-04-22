import { defineTable } from "convex/server";
import { v } from "convex/values";

export const activities = defineTable({
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
  isAiGenerated: v.boolean(),
  aiConfidence: v.optional(v.number()),
  timestamp: v.number(),
})
  .index("by_loan", ["loanId", "timestamp"])
  .index("by_contact", ["contactId", "timestamp"])
  .index("by_owner_recent", ["ownerId", "timestamp"]);
