import { defineTable } from "convex/server";
import { v } from "convex/values";

export const documents = defineTable({
  loanId: v.id("loans"),
  contactId: v.id("contacts"),
  ownerId: v.id("users"),
  name: v.string(),
  category: v.union(
    v.literal("income"),
    v.literal("asset"),
    v.literal("identity"),
    v.literal("property"),
    v.literal("credit"),
    v.literal("closing"),
    v.literal("condition"),
    v.literal("other")
  ),
  status: v.union(
    v.literal("requested"),
    v.literal("uploaded"),
    v.literal("ai_reviewing"),
    v.literal("approved"),
    v.literal("rejected"),
    v.literal("expired")
  ),
  storageId: v.optional(v.id("_storage")),
  r2Key: v.optional(v.string()),
  fileType: v.optional(v.string()),
  fileSize: v.optional(v.number()),
  ocrResult: v.optional(v.string()),
  aiValidation: v.optional(
    v.object({
      isValid: v.boolean(),
      issues: v.optional(v.array(v.string())),
      confidence: v.number(),
      validatedAt: v.number(),
    })
  ),
  requestedAt: v.optional(v.number()),
  uploadedAt: v.optional(v.number()),
  dueDate: v.optional(v.number()),
  remindersSent: v.number(),
  isArchived: v.boolean(),
  updatedAt: v.number(),
})
  .index("by_loan", ["loanId", "category"])
  .index("by_status", ["loanId", "status"])
  .index("by_due", ["ownerId", "status", "dueDate"]);
