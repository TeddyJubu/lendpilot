/**
 * @organ loans
 * @tissue mutations
 * @description Write operations for the loans table.
 *   Enforces state machine transitions and logs stage changes.
 * @depends-on loans/validators.ts, loans/stateMachine.ts, activities/internals.ts
 * @depended-by Frontend: pipeline kanban, loan detail
 * @ai-notes
 *   - Every mutation MUST set `updatedAt: Date.now()`.
 *   - Every mutation MUST verify ownerId === authenticated user.
 *   - Stage changes MUST go through canTransition() validation.
 *   - Stage changes MUST update stageHistory.
 */

import { mutation } from "../_generated/server";
import { v } from "convex/values";
import {
  createLoanArgs, updateLoanArgs, updateStageArgs, archiveLoanArgs,
  isValidFico, isValidLtv, isValidDti, isValidLoanAmount, isValidRate,
} from "./validators";
import { canTransition } from "./stateMachine";

/**
 * Create a new loan linked to a contact.
 */
export const create = mutation({
  args: createLoanArgs,
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q: any) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) throw new Error("User not found");

    // Verify contact belongs to this user
    const contact = await ctx.db.get(args.contactId);
    if (!contact || contact.ownerId !== user._id) {
      throw new Error("Contact not found");
    }

    if (args.loanAmount !== undefined && !isValidLoanAmount(args.loanAmount)) throw new Error("Invalid loan amount");
    if (args.fico !== undefined && !isValidFico(args.fico)) throw new Error("Invalid FICO score");
    if (args.ltv !== undefined && !isValidLtv(args.ltv)) throw new Error("Invalid LTV");
    if (args.dti !== undefined && !isValidDti(args.dti)) throw new Error("Invalid DTI");

    const now = Date.now();

    const loanId = await ctx.db.insert("loans", {
      contactId: args.contactId,
      ownerId: user._id,
      loanAmount: args.loanAmount,
      propertyAddress: args.propertyAddress,
      propertyType: args.propertyType,
      occupancy: args.occupancy,
      loanType: args.loanType,
      fico: args.fico,
      ltv: args.ltv,
      dti: args.dti,
      stage: "new_lead",
      stageEnteredAt: now,
      stageHistory: [{ stage: "new_lead", enteredAt: now }],
      isArchived: false,
      updatedAt: now,
    });

    // Log activity
    await ctx.db.insert("activities", {
      loanId,
      contactId: args.contactId,
      ownerId: user._id,
      type: "system",
      subject: "Loan created",
      body: args.loanAmount
        ? `New loan for $${args.loanAmount.toLocaleString()}`
        : "New loan created",
      isAiGenerated: false,
      timestamp: now,
    });

    return loanId;
  },
});

/**
 * Update loan fields (not stage — use updateStage for that).
 */
export const update = mutation({
  args: updateLoanArgs,
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q: any) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) throw new Error("User not found");

    const loan = await ctx.db.get(args.loanId);
    if (!loan || loan.ownerId !== user._id || loan.isArchived) {
      throw new Error("Loan not found");
    }

    if (args.loanAmount !== undefined && !isValidLoanAmount(args.loanAmount)) throw new Error("Invalid loan amount");
    if (args.fico !== undefined && !isValidFico(args.fico)) throw new Error("Invalid FICO score");
    if (args.ltv !== undefined && !isValidLtv(args.ltv)) throw new Error("Invalid LTV");
    if (args.dti !== undefined && !isValidDti(args.dti)) throw new Error("Invalid DTI");
    if (args.lockedRate !== undefined && !isValidRate(args.lockedRate)) throw new Error("Invalid locked rate");

    const now = Date.now();
    const updates: Record<string, unknown> = { updatedAt: now };
    if (args.loanAmount !== undefined) updates.loanAmount = args.loanAmount;
    if (args.propertyAddress !== undefined) updates.propertyAddress = args.propertyAddress;
    if (args.propertyType !== undefined) updates.propertyType = args.propertyType;
    if (args.occupancy !== undefined) updates.occupancy = args.occupancy;
    if (args.loanType !== undefined) updates.loanType = args.loanType;
    if (args.fico !== undefined) updates.fico = args.fico;
    if (args.ltv !== undefined) updates.ltv = args.ltv;
    if (args.dti !== undefined) updates.dti = args.dti;
    if (args.lockedRate !== undefined) updates.lockedRate = args.lockedRate;
    if (args.lockedLender !== undefined) updates.lockedLender = args.lockedLender;
    if (args.lockExpiration !== undefined) updates.lockExpiration = args.lockExpiration;
    if (args.estimatedCloseDate !== undefined) updates.estimatedCloseDate = args.estimatedCloseDate;
    if (args.loanValue !== undefined) updates.loanValue = args.loanValue;

    await ctx.db.patch(args.loanId, updates);

    await ctx.db.insert("activities", {
      loanId: args.loanId,
      contactId: loan.contactId,
      ownerId: user._id,
      type: "system",
      subject: "Loan updated",
      isAiGenerated: false,
      timestamp: now,
    });

    return args.loanId;
  },
});

/**
 * Transition a loan to a new stage.
 * Validates the transition against the state machine.
 * Updates stage history with timestamps.
 */
export const updateStage = mutation({
  args: updateStageArgs,
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q: any) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) throw new Error("User not found");

    const loan = await ctx.db.get(args.loanId);
    if (!loan || loan.ownerId !== user._id) {
      throw new Error("Loan not found");
    }

    if (loan.isArchived) {
      throw new Error("Loan not found");
    }

    // Validate transition
    if (!canTransition(loan.stage, args.stage)) {
      throw new Error(
        `Invalid stage transition: ${loan.stage} → ${args.stage}`
      );
    }

    const now = Date.now();

    // Update stage history: close the current stage, open the new one
    const updatedHistory = loan.stageHistory.map((entry: any) => {
      if (entry.stage === loan.stage && !entry.exitedAt) {
        return { ...entry, exitedAt: now };
      }
      return entry;
    });
    updatedHistory.push({ stage: args.stage, enteredAt: now });

    await ctx.db.patch(args.loanId, {
      stage: args.stage,
      stageEnteredAt: now,
      stageHistory: updatedHistory,
      updatedAt: now,
    });

    // Log activity
    await ctx.db.insert("activities", {
      loanId: args.loanId,
      contactId: loan.contactId,
      ownerId: user._id,
      type: "stage_change",
      subject: `Stage: ${loan.stage} → ${args.stage}`,
      metadata: { fromStage: loan.stage, toStage: args.stage },
      isAiGenerated: false,
      timestamp: now,
    });

    return args.loanId;
  },
});

/**
 * Soft-delete (archive) a loan.
 */
export const archive = mutation({
  args: archiveLoanArgs,
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q: any) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) throw new Error("User not found");

    const loan = await ctx.db.get(args.loanId);
    if (!loan || loan.ownerId !== user._id) {
      throw new Error("Loan not found");
    }

    await ctx.db.patch(args.loanId, {
      isArchived: true,
      updatedAt: Date.now(),
    });

    return args.loanId;
  },
});
