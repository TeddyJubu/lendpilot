/**
 * @organ core
 * @tissue validators
 * @description Input validation rules for user operations.
 * @depends-on core/tables.ts (schema)
 * @depended-by core/mutations.ts (validates inputs before writing)
 */

import { v } from "convex/values";

export const createUserArgs = {
  clerkId: v.string(),
  email: v.string(),
  name: v.string(),
};

export const updateUserArgs = {
  nmlsId: v.optional(v.string()),
  companyName: v.optional(v.string()),
  phone: v.optional(v.string()),
  defaultStates: v.optional(v.array(v.string())),
  preferredLenders: v.optional(v.array(v.string())),
  onboardingStep: v.optional(v.string()),
};

/** Validate an email address (basic check) */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/** Validate an NMLS ID (5-12 digits) */
export function isValidNmlsId(nmlsId: string): boolean {
  return /^\d{5,12}$/.test(nmlsId);
}

/** Validate a phone number (basic E.164 or US format) */
export function isValidPhone(phone: string): boolean {
  const cleaned = phone.replace(/[\s\-\(\)\.]/g, "");
  return /^\+?\d{10,15}$/.test(cleaned);
}
