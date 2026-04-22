/**
 * @organ contacts
 * @tissue internals
 * @description Internal queries/mutations for contacts, used by other organs.
 * @depends-on contacts/tables.ts
 * @depended-by loans/mutations.ts (to verify contact exists and belongs to user)
 */

import { internalQuery } from "../_generated/server";
import { v } from "convex/values";

/**
 * Internal: Get contact by ID without auth check (caller must verify).
 */
export const getContactInternal = internalQuery({
  args: { contactId: v.id("contacts") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.contactId);
  },
});
