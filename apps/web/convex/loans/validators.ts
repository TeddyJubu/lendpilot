/**
 * @organ loans
 * @tissue validators
 * @description Input validation for loan operations.
 * @depends-on loans/tables.ts
 * @depended-by loans/mutations.ts
 */

import { v } from "convex/values";
import { loanStageValidator } from "./tables";

const propertyTypeValidator = v.optional(
  v.union(
    v.literal("SFR"),
    v.literal("Condo"),
    v.literal("Townhouse"),
    v.literal("Multi_2_4"),
    v.literal("Manufactured")
  )
);

const occupancyValidator = v.optional(
  v.union(
    v.literal("Primary"),
    v.literal("Second_Home"),
    v.literal("Investment")
  )
);

const loanTypeValidator = v.optional(
  v.union(
    v.literal("Conventional"),
    v.literal("FHA"),
    v.literal("VA"),
    v.literal("USDA"),
    v.literal("Jumbo"),
    v.literal("Non_QM"),
    v.literal("DSCR")
  )
);

export const createLoanArgs = {
  contactId: v.id("contacts"),
  loanAmount: v.optional(v.number()),
  propertyAddress: v.optional(v.string()),
  propertyType: propertyTypeValidator,
  occupancy: occupancyValidator,
  loanType: loanTypeValidator,
  fico: v.optional(v.number()),
  ltv: v.optional(v.number()),
  dti: v.optional(v.number()),
};

export const updateLoanArgs = {
  loanId: v.id("loans"),
  loanAmount: v.optional(v.number()),
  propertyAddress: v.optional(v.string()),
  propertyType: propertyTypeValidator,
  occupancy: occupancyValidator,
  loanType: loanTypeValidator,
  fico: v.optional(v.number()),
  ltv: v.optional(v.number()),
  dti: v.optional(v.number()),
  lockedRate: v.optional(v.number()),
  lockedLender: v.optional(v.string()),
  lockExpiration: v.optional(v.number()),
  estimatedCloseDate: v.optional(v.number()),
  loanValue: v.optional(v.number()),
};

export const updateStageArgs = {
  loanId: v.id("loans"),
  stage: loanStageValidator,
};

export const archiveLoanArgs = {
  loanId: v.id("loans"),
};

/** Validate FICO score range */
export function isValidFico(fico: number): boolean {
  return Number.isInteger(fico) && fico >= 300 && fico <= 850;
}

/** Validate LTV percentage */
export function isValidLtv(ltv: number): boolean {
  return ltv > 0 && ltv <= 100;
}

/** Validate DTI percentage */
export function isValidDti(dti: number): boolean {
  return dti > 0 && dti <= 100;
}

/** Validate loan amount */
export function isValidLoanAmount(amount: number): boolean {
  return amount > 0 && amount <= 50_000_000;
}

/** Validate interest rate */
export function isValidRate(rate: number): boolean {
  return rate >= 0 && rate <= 20;
}
