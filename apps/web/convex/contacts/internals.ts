/**
 * @organ contacts
 * @tissue internals
 * @description Internal queries/mutations for contacts, used by other organs.
 * @depends-on contacts/tables.ts
 * @depended-by loans/mutations.ts, convex/http.ts (enrichment ingestion)
 */

import { internalMutation, internalQuery } from "../_generated/server";
import { v } from "convex/values";

const patchContactEnrichmentArgs = {
  contactId: v.id("contacts"),
  jobTitle: v.optional(v.string()),
  employer: v.optional(v.string()),
  estimatedIncomeBracket: v.optional(v.string()),
  linkedinUrl: v.optional(v.string()),
};

/**
 * Internal: Get contact by ID without auth check (caller must verify).
 */
export const getContactInternal = internalQuery({
  args: { contactId: v.id("contacts") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.contactId);
  },
});

/**
 * Internal: Patch a contact's AI-enrichment fields. Called from the
 * /ingestContactEnrichment HTTP action after the lead-enricher worker
 * finishes scraping LinkedIn.
 *
 * Merge semantics: any provided field overwrites the existing value,
 * unprovided fields are left alone. enrichedAt is always refreshed.
 */
export const patchEnrichment = internalMutation({
  args: patchContactEnrichmentArgs,
  handler: async (ctx, args) => {
    const contact = await ctx.db.get(args.contactId);
    if (!contact) return { updated: false };

    const prev = contact.enrichment ?? {};
    await ctx.db.patch(args.contactId, {
      enrichment: {
        jobTitle: args.jobTitle ?? prev.jobTitle,
        employer: args.employer ?? prev.employer,
        estimatedIncomeBracket:
          args.estimatedIncomeBracket ?? prev.estimatedIncomeBracket,
        linkedinUrl: args.linkedinUrl ?? prev.linkedinUrl,
        enrichedAt: Date.now(),
      },
      updatedAt: Date.now(),
    });
    return { updated: true };
  },
});
