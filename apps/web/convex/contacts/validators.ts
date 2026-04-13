/**
 * @organ contacts
 * @tissue validators
 * @description Input validation rules for contact operations.
 * @depends-on contacts/tables.ts (schema)
 * @depended-by contacts/mutations.ts
 */

import { v } from "convex/values";

const contactTypeValidator = v.union(
  v.literal("lead"),
  v.literal("borrower"),
  v.literal("referral_partner"),
  v.literal("realtor"),
  v.literal("other")
);

const sourceValidator = v.optional(
  v.union(
    v.literal("website"),
    v.literal("referral"),
    v.literal("zillow"),
    v.literal("realtor_com"),
    v.literal("social"),
    v.literal("manual"),
    v.literal("import")
  )
);

export const createContactArgs = {
  firstName: v.string(),
  lastName: v.string(),
  email: v.optional(v.string()),
  phone: v.optional(v.string()),
  type: contactTypeValidator,
  source: sourceValidator,
  referredBy: v.optional(v.id("contacts")),
  tags: v.optional(v.array(v.string())),
  notes: v.optional(v.string()),
};

export const updateContactArgs = {
  contactId: v.id("contacts"),
  firstName: v.optional(v.string()),
  lastName: v.optional(v.string()),
  email: v.optional(v.string()),
  phone: v.optional(v.string()),
  type: v.optional(contactTypeValidator),
  tags: v.optional(v.array(v.string())),
  notes: v.optional(v.string()),
  lastContactedAt: v.optional(v.number()),
  nextTouchDue: v.optional(v.number()),
};

export const listContactsArgs = {
  paginationOpts: v.any(),
  type: v.optional(contactTypeValidator),
};

export const archiveContactArgs = {
  contactId: v.id("contacts"),
};

export const searchContactsArgs = {
  query: v.string(),
  type: v.optional(contactTypeValidator),
};

/** Validate a contact name is not empty */
export function isValidContactName(firstName: string, lastName: string): boolean {
  return firstName.trim().length > 0 && lastName.trim().length > 0;
}

/** Get full name from parts */
export function getFullName(firstName: string, lastName: string): string {
  return `${firstName.trim()} ${lastName.trim()}`;
}

/** Valid contact types */
export const CONTACT_TYPES = ["lead", "borrower", "referral_partner", "realtor", "other"] as const;

/** Valid source values */
export const CONTACT_SOURCES = ["website", "referral", "zillow", "realtor_com", "social", "manual", "import"] as const;
