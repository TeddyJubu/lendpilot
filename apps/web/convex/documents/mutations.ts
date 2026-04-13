/**
 * @organ documents
 * @tissue mutations
 * @description Write operations for document tracking.
 * @depends-on documents/validators.ts, documents/tables.ts
 * @depended-by Frontend: document list, document request dialog
 * @ai-notes
 *   - Every mutation MUST set `updatedAt: Date.now()`.
 *   - Every mutation MUST verify ownerId === authenticated user.
 */

import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { requestDocArgs, markUploadedArgs, updateStatusArgs } from "./validators";

/**
 * Request a document for a loan.
 */
export const requestDoc = mutation({
  args: requestDocArgs,
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q: any) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) throw new Error("User not found");

    // Verify loan belongs to user
    const loan = await ctx.db.get(args.loanId);
    if (!loan || loan.ownerId !== user._id) {
      throw new Error("Loan not found");
    }

    const now = Date.now();

    const docId = await ctx.db.insert("documents", {
      loanId: args.loanId,
      contactId: args.contactId,
      ownerId: user._id,
      name: args.name,
      category: args.category,
      status: "requested",
      requestedAt: now,
      dueDate: args.dueDate,
      remindersSent: 0,
      isArchived: false,
      updatedAt: now,
    });

    // Log activity
    await ctx.db.insert("activities", {
      loanId: args.loanId,
      contactId: args.contactId,
      ownerId: user._id,
      type: "doc_requested",
      subject: `Document requested: ${args.name}`,
      isAiGenerated: false,
      timestamp: now,
    });

    return docId;
  },
});

/**
 * Mark a document as uploaded.
 */
export const markUploaded = mutation({
  args: markUploadedArgs,
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q: any) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) throw new Error("User not found");

    const doc = await ctx.db.get(args.documentId);
    if (!doc || doc.ownerId !== user._id) {
      throw new Error("Document not found");
    }

    const now = Date.now();

    await ctx.db.patch(args.documentId, {
      status: "uploaded",
      uploadedAt: now,
      updatedAt: now,
    });

    // Log activity
    await ctx.db.insert("activities", {
      loanId: doc.loanId,
      contactId: doc.contactId,
      ownerId: user._id,
      type: "doc_uploaded",
      subject: `Document uploaded: ${doc.name}`,
      isAiGenerated: false,
      timestamp: now,
    });

    return args.documentId;
  },
});

/**
 * Update a document's status.
 */
export const updateStatus = mutation({
  args: updateStatusArgs,
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q: any) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) throw new Error("User not found");

    const doc = await ctx.db.get(args.documentId);
    if (!doc || doc.ownerId !== user._id) {
      throw new Error("Document not found");
    }

    await ctx.db.patch(args.documentId, {
      status: args.status,
      updatedAt: Date.now(),
    });

    return args.documentId;
  },
});
