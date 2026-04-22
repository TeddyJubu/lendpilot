export { getStageGroup } from "../../convex/loans/helpers";

/** Calculate days since a timestamp */
export function daysAgo(timestamp: number): number {
  return Math.floor((Date.now() - timestamp) / (1000 * 60 * 60 * 24));
}

/** Format currency */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Format relative time (e.g., "3d ago", "2h ago") */
export function formatRelativeTime(timestamp: number): string {
  const diffMs = Date.now() - timestamp;
  const diffMins = Math.floor(diffMs / (1000 * 60));
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays}d ago`;
  const diffMonths = Math.floor(diffDays / 30);
  return `${diffMonths}mo ago`;
}
