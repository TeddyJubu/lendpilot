import { defineTable } from "convex/server";
import { v } from "convex/values";

export const contacts = defineTable({
  ownerId: v.id("users"),
  firstName: v.string(),
  lastName: v.string(),
  email: v.optional(v.string()),
  phone: v.optional(v.string()),
  type: v.union(
    v.literal("lead"),
    v.literal("borrower"),
    v.literal("referral_partner"),
    v.literal("realtor"),
    v.literal("other")
  ),
  source: v.optional(
    v.union(
      v.literal("website"),
      v.literal("referral"),
      v.literal("zillow"),
      v.literal("realtor_com"),
      v.literal("social"),
      v.literal("manual"),
      v.literal("import")
    )
  ),
  referredBy: v.optional(v.id("contacts")),
  enrichment: v.optional(
    v.object({
      jobTitle: v.optional(v.string()),
      employer: v.optional(v.string()),
      estimatedIncomeBracket: v.optional(v.string()),
      linkedinUrl: v.optional(v.string()),
      enrichedAt: v.number(),
    })
  ),
  leadScore: v.optional(v.number()),
  leadScoreFactors: v.optional(v.string()),
  leadScoredAt: v.optional(v.number()),
  relationshipScore: v.optional(v.number()),
  lastContactedAt: v.optional(v.number()),
  nextTouchDue: v.optional(v.number()),
  tags: v.optional(v.array(v.string())),
  notes: v.optional(v.string()),
  isArchived: v.boolean(),
  updatedAt: v.number(),
})
  .index("by_owner", ["ownerId", "isArchived"])
  .index("by_type", ["ownerId", "type"])
  .index("by_lead_score", ["ownerId", "leadScore"])
  .index("by_next_touch", ["ownerId", "nextTouchDue"])
  .searchIndex("search_name", {
    searchField: "firstName",
    filterFields: ["ownerId", "type"],
  });
