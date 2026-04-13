import { defineTable } from "convex/server";
import { v } from "convex/values";

export const rateSnapshots = defineTable({
  lenderId: v.string(),
  lenderName: v.string(),
  productType: v.string(),
  rate: v.number(),
  apr: v.number(),
  points: v.number(),
  lockPeriodDays: v.number(),
  ltvMin: v.number(),
  ltvMax: v.number(),
  ficoMin: v.number(),
  ficoMax: v.number(),
  loanAmountMin: v.number(),
  loanAmountMax: v.number(),
  propertyType: v.string(),
  occupancy: v.string(),
  compToBrokerBps: v.optional(v.number()),
  effectiveDate: v.number(),
  expirationDate: v.number(),
  crawledAt: v.number(),
  source: v.union(v.literal("wholesale"), v.literal("retail")),
})
  .index("by_product_lookup", [
    "productType",
    "occupancy",
    "propertyType",
    "crawledAt",
  ])
  .index("by_lender", ["lenderId", "crawledAt"])
  .index("by_fico_range", ["ficoMin", "ficoMax"]);
