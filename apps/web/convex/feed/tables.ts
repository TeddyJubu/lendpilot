import { defineTable } from "convex/server";
import { v } from "convex/values";

export const feedItems = defineTable({
  ownerId: v.id("users"),
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
  status: v.union(
    v.literal("active"),
    v.literal("snoozed"),
    v.literal("completed"),
    v.literal("dismissed")
  ),
  snoozedUntil: v.optional(v.number()),
  completedAt: v.optional(v.number()),
  updatedAt: v.number(),
}).index("by_owner_active", ["ownerId", "status", "priority"]);
