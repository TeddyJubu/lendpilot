/**
 * @organ documents
 * @tissue validators
 * @description Input validation for document operations.
 * @depends-on documents/tables.ts
 * @depended-by documents/mutations.ts
 */

import { v } from "convex/values";

const categoryValidator = v.union(
  v.literal("income"),
  v.literal("asset"),
  v.literal("identity"),
  v.literal("property"),
  v.literal("credit"),
  v.literal("closing"),
  v.literal("condition"),
  v.literal("other")
);

export const requestDocArgs = {
  loanId: v.id("loans"),
  contactId: v.id("contacts"),
  name: v.string(),
  category: categoryValidator,
  dueDate: v.optional(v.number()),
};

export const markUploadedArgs = {
  documentId: v.id("documents"),
};

export const updateStatusArgs = {
  documentId: v.id("documents"),
  status: v.union(
    v.literal("uploaded"),
    v.literal("approved"),
    v.literal("rejected"),
    v.literal("expired")
  ),
};

/** Document categories with labels */
export const DOCUMENT_CATEGORIES = [
  { value: "income", label: "Income" },
  { value: "asset", label: "Asset" },
  { value: "identity", label: "Identity" },
  { value: "property", label: "Property" },
  { value: "credit", label: "Credit" },
  { value: "closing", label: "Closing" },
  { value: "condition", label: "Condition" },
  { value: "other", label: "Other" },
] as const;
