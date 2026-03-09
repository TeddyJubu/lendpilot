/**
 * Utility helpers for the Mortgage Data Engine
 */

/** Generate a UUID v4 */
export function uuid(): string {
  return crypto.randomUUID();
}

/** ISO timestamp string */
export function now(): string {
  return new Date().toISOString();
}

/** Add hours to a date and return ISO string */
export function addHours(date: Date, hours: number): string {
  return new Date(date.getTime() + hours * 3600_000).toISOString();
}

/** Add days to a date and return ISO string */
export function addDays(date: Date, days: number): string {
  return new Date(date.getTime() + days * 86400_000).toISOString();
}

/** Normalize a street address for deduplication */
export function normalizeAddress(address: string): string {
  return address
    .toLowerCase()
    .replace(/\./g, "")
    .replace(/,/g, "")
    .replace(/\s+/g, " ")
    .replace(/\b(street|st)\b/g, "st")
    .replace(/\b(avenue|ave)\b/g, "ave")
    .replace(/\b(boulevard|blvd)\b/g, "blvd")
    .replace(/\b(drive|dr)\b/g, "dr")
    .replace(/\b(road|rd)\b/g, "rd")
    .replace(/\b(lane|ln)\b/g, "ln")
    .replace(/\b(court|ct)\b/g, "ct")
    .replace(/\b(apartment|apt)\b/g, "apt")
    .replace(/\b(suite|ste)\b/g, "ste")
    .trim();
}

/** Data quality: validate a mortgage rate */
export function isValidRate(rate: number): boolean {
  return rate >= 2.0 && rate <= 15.0;
}

/** Data quality: validate APR > rate */
export function isValidApr(rate: number, apr: number): boolean {
  return apr >= rate;
}

/** Data quality: validate FICO score */
export function isValidFico(fico: number): boolean {
  return fico >= 300 && fico <= 850;
}

/** Data quality: validate property value */
export function isValidPropertyValue(value: number): boolean {
  return value >= 10_000 && value <= 50_000_000;
}

/** Sleep helper */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Truncate text to max length */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + "...";
}
