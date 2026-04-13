import { defineTable } from "convex/server";
import { v } from "convex/values";

export const loanStageValidator = v.union(
  v.literal("new_lead"),
  v.literal("scored"),
  v.literal("contacted"),
  v.literal("pre_qualified"),
  v.literal("application_filed"),
  v.literal("docs_collecting"),
  v.literal("submitted_to_lender"),
  v.literal("in_underwriting"),
  v.literal("conditions"),
  v.literal("clear_to_close"),
  v.literal("closing_scheduled"),
  v.literal("funded"),
  v.literal("withdrawn"),
  v.literal("denied")
);

export const loans = defineTable({
  contactId: v.id("contacts"),
  ownerId: v.id("users"),
  loanAmount: v.optional(v.number()),
  propertyAddress: v.optional(v.string()),
  propertyType: v.optional(
    v.union(
      v.literal("SFR"),
      v.literal("Condo"),
      v.literal("Townhouse"),
      v.literal("Multi_2_4"),
      v.literal("Manufactured")
    )
  ),
  occupancy: v.optional(
    v.union(
      v.literal("Primary"),
      v.literal("Second_Home"),
      v.literal("Investment")
    )
  ),
  loanType: v.optional(
    v.union(
      v.literal("Conventional"),
      v.literal("FHA"),
      v.literal("VA"),
      v.literal("USDA"),
      v.literal("Jumbo"),
      v.literal("Non_QM"),
      v.literal("DSCR")
    )
  ),
  fico: v.optional(v.number()),
  ltv: v.optional(v.number()),
  dti: v.optional(v.number()),
  stage: loanStageValidator,
  stageEnteredAt: v.number(),
  stageHistory: v.array(
    v.object({
      stage: v.string(),
      enteredAt: v.number(),
      exitedAt: v.optional(v.number()),
    })
  ),
  lockedRate: v.optional(v.number()),
  lockedLender: v.optional(v.string()),
  lockExpiration: v.optional(v.number()),
  losId: v.optional(v.string()),
  losProvider: v.optional(
    v.union(v.literal("encompass"), v.literal("lending_pad"))
  ),
  lastLosSyncAt: v.optional(v.number()),
  propertyEnrichment: v.optional(
    v.object({
      estimatedValue: v.optional(v.number()),
      lastSalePrice: v.optional(v.number()),
      bedrooms: v.optional(v.number()),
      bathrooms: v.optional(v.number()),
      sqft: v.optional(v.number()),
      yearBuilt: v.optional(v.number()),
      taxAnnual: v.optional(v.number()),
      enrichedAt: v.number(),
    })
  ),
  healthScore: v.optional(v.number()),
  nextAction: v.optional(v.string()),
  nextActionType: v.optional(v.string()),
  aiSummary: v.optional(v.string()),
  estimatedCloseDate: v.optional(v.number()),
  actualCloseDate: v.optional(v.number()),
  loanValue: v.optional(v.number()),
  isArchived: v.boolean(),
  updatedAt: v.number(),
})
  .index("by_owner_stage", ["ownerId", "stage", "isArchived"])
  .index("by_contact", ["contactId"])
  .index("by_stage_entered", ["ownerId", "stage", "stageEnteredAt"])
  .index("by_health", ["ownerId", "healthScore"])
  .index("by_los", ["losProvider", "losId"]);
