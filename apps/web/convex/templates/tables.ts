import { defineTable } from "convex/server";
import { v } from "convex/values";

export const templates = defineTable({
  ownerId: v.id("users"),
  name: v.string(),
  type: v.union(
    v.literal("email"),
    v.literal("sms"),
    v.literal("condition_response"),
    v.literal("pre_approval")
  ),
  subject: v.optional(v.string()),
  body: v.string(),
  variables: v.array(v.string()),
  isAiGenerated: v.boolean(),
  usageCount: v.number(),
  isArchived: v.boolean(),
  updatedAt: v.number(),
}).index("by_owner_type", ["ownerId", "type"]);
