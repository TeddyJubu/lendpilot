/**
 * @organ core
 * @tissue tables
 * @description Core Convex tables for authentication/bootstrap and cross-system sync logging.
 * @depends-on
 *   - convex/values (schema validators)
 * @depended-by
 *   - convex/schema.ts
 *   - Future core queries/mutations (Phase 0.3)
 * @ai-notes
 *   - These tables are foundational; avoid adding app-specific fields here.
 */

import { defineTable } from "convex/server";
import { v } from "convex/values";

export const coreTables = {
  users: defineTable({
    clerkId: v.string(),
    email: v.string(),
    name: v.string(),
    nmlsId: v.optional(v.string()),
    companyName: v.optional(v.string()),
    phone: v.optional(v.string()),
    tier: v.union(
      v.literal("trial"),
      v.literal("solo"),
      v.literal("team"),
      v.literal("enterprise"),
    ),
    stripeCustomerId: v.optional(v.string()),
    trialEndsAt: v.optional(v.number()),
    losProvider: v.optional(v.string()),
    losCredentialRef: v.optional(v.string()),
    defaultStates: v.optional(v.array(v.string())),
    preferredLenders: v.optional(v.array(v.string())),
    notificationPrefs: v.optional(v.any()),
    onboardingCompleted: v.boolean(),
    onboardingStep: v.optional(v.string()),
    updatedAt: v.number(),
  })
    .index("by_clerk", ["clerkId"])
    .index("by_email", ["email"]),

  syncLog: defineTable({
    source: v.string(),
    syncedAt: v.number(),
    recordsProcessed: v.number(),
    recordsCreated: v.number(),
    recordsUpdated: v.number(),
    recordsSkipped: v.number(),
    errors: v.array(v.string()),
    durationMs: v.number(),
  }).index("by_source", ["source", "syncedAt"]),
};
