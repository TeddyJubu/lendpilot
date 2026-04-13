/**
 * @organ core
 * @tissue helpers
 * @description Pure helper functions for the core organ. No Convex ctx.
 * @depends-on nothing
 * @depended-by core/mutations.ts, core/queries.ts
 */

/** Format a user's display name from their name field */
export function formatDisplayName(name: string): string {
  return name.trim();
}

/** Get initials from a name (max 2 chars) */
export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}
