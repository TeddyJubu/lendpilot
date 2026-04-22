/**
 * @organ contacts
 * @tissue helpers
 * @description Pure helper functions for contacts. No Convex ctx.
 * @depends-on nothing
 * @depended-by contacts/mutations.ts, contacts/queries.ts, frontend
 */

import type { ContactType } from "../types";

/** Get display label for a contact type */
export function getContactTypeLabel(type: ContactType): string {
  const labels: Record<ContactType, string> = {
    lead: "Lead",
    borrower: "Borrower",
    referral_partner: "Referral Partner",
    realtor: "Realtor",
    other: "Other",
  };
  return labels[type];
}

/** Get initials from a contact's name */
export function getContactInitials(firstName: string, lastName: string): string {
  const f = firstName.trim().charAt(0).toUpperCase();
  const l = lastName.trim().charAt(0).toUpperCase();
  return `${f}${l}`;
}

/** Sort contacts by last name, then first name */
export function sortContactsByName<T extends { firstName: string; lastName: string }>(
  contacts: T[]
): T[] {
  return [...contacts].sort((a, b) => {
    const lastCmp = a.lastName.localeCompare(b.lastName);
    if (lastCmp !== 0) return lastCmp;
    return a.firstName.localeCompare(b.firstName);
  });
}

/** Check if a contact was recently contacted (within given days) */
export function wasRecentlyContacted(
  lastContactedAt: number | undefined,
  withinDays: number
): boolean {
  if (!lastContactedAt) return false;
  const cutoff = Date.now() - withinDays * 24 * 60 * 60 * 1000;
  return lastContactedAt > cutoff;
}

/** Check if a contact's next touch is overdue */
export function isTouchOverdue(nextTouchDue: number | undefined): boolean {
  if (!nextTouchDue) return false;
  return nextTouchDue < Date.now();
}
