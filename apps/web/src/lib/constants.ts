import type { LoanStage, StageGroup } from "../../convex/types";

/** Map a loan stage to its kanban stage group */
export function getStageGroup(stage: LoanStage): StageGroup {
  switch (stage) {
    case "new_lead":
    case "scored":
    case "contacted":
      return "intake";
    case "pre_qualified":
    case "application_filed":
    case "docs_collecting":
      return "qualification";
    case "submitted_to_lender":
    case "in_underwriting":
    case "conditions":
    case "clear_to_close":
      return "processing";
    case "closing_scheduled":
    case "funded":
      return "closing";
    case "withdrawn":
    case "denied":
      return "terminal";
  }
}

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
