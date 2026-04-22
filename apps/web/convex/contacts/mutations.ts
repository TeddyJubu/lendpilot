/**
 * @organ contacts
 * @tissue mutations
 * @description Write operations for the contacts table.
 *   Creates, updates, and archives contacts with activity logging.
 * @depends-on contacts/validators.ts, contacts/tables.ts, activities/internals.ts
 * @depended-by contacts/queries.ts, feed/internals.ts, UI components
 * @ai-notes
 *   - Every mutation MUST set `updatedAt: Date.now()`.
 *   - Every mutation MUST verify ownerId === authenticated user.
 *   - Creating/archiving a contact MUST log to activities.
 */

import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { createContactArgs, updateContactArgs, archiveContactArgs } from "./validators";

/**
 * Create a new contact.
 */
export const create = mutation({
  args: createContactArgs,
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q: any) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) throw new Error("User not found");

    const contactId = await ctx.db.insert("contacts", {
      ownerId: user._id,
      firstName: args.firstName.trim(),
      lastName: args.lastName.trim(),
      email: args.email,
      phone: args.phone,
      type: args.type,
      source: args.source,
      referredBy: args.referredBy,
      tags: args.tags ?? [],
      notes: args.notes,
      isArchived: false,
      updatedAt: Date.now(),
    });

    // Log activity
    await ctx.db.insert("activities", {
      contactId,
      ownerId: user._id,
      type: "system",
      subject: "Contact created",
      body: `${args.firstName} ${args.lastName} added as ${args.type}`,
      isAiGenerated: false,
      timestamp: Date.now(),
    });

    return contactId;
  },
});

/**
 * Update a contact's fields.
 */
export const update = mutation({
  args: updateContactArgs,
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q: any) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) throw new Error("User not found");

    const contact = await ctx.db.get(args.contactId);
    if (!contact || contact.ownerId !== user._id) {
      throw new Error("Contact not found");
    }

    // Build update object with only provided fields
    const updates: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.firstName !== undefined) updates.firstName = args.firstName.trim();
    if (args.lastName !== undefined) updates.lastName = args.lastName.trim();
    if (args.email !== undefined) updates.email = args.email;
    if (args.phone !== undefined) updates.phone = args.phone;
    if (args.type !== undefined) updates.type = args.type;
    if (args.tags !== undefined) updates.tags = args.tags;
    if (args.notes !== undefined) updates.notes = args.notes;
    if (args.lastContactedAt !== undefined) updates.lastContactedAt = args.lastContactedAt;
    if (args.nextTouchDue !== undefined) updates.nextTouchDue = args.nextTouchDue;

    await ctx.db.patch(args.contactId, updates);

    await ctx.db.insert("activities", {
      contactId: args.contactId,
      ownerId: user._id,
      type: "system" as const,
      subject: "Contact updated",
      body: `${contact.firstName} ${contact.lastName} updated`,
      isAiGenerated: false,
      timestamp: Date.now(),
    });

    return args.contactId;
  },
});

/**
 * Soft-delete (archive) a contact.
 */
export const archive = mutation({
  args: archiveContactArgs,
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q: any) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) throw new Error("User not found");

    const contact = await ctx.db.get(args.contactId);
    if (!contact || contact.ownerId !== user._id) {
      throw new Error("Contact not found");
    }

    await ctx.db.patch(args.contactId, {
      isArchived: true,
      updatedAt: Date.now(),
    });

    // Log activity
    await ctx.db.insert("activities", {
      contactId: args.contactId,
      ownerId: user._id,
      type: "system",
      subject: "Contact archived",
      body: `${contact.firstName} ${contact.lastName} archived`,
      isAiGenerated: false,
      timestamp: Date.now(),
    });

    return args.contactId;
  },
});
