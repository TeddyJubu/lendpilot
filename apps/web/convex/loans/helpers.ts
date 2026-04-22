/**
 * @organ loans
 * @tissue helpers
 * @description Pure helper functions for loans. No Convex ctx.
 * @depends-on loans/stateMachine.ts, types.ts
 * @depended-by loans/mutations.ts, loans/queries.ts, frontend
 */

import type { LoanStage, StageGroup } from "../types";

/** Map a stage to its stage group for kanban columns */
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

/** Calculate days in current stage */
export function daysInStage(stageEnteredAt: number): number {
  return Math.floor((Date.now() - stageEnteredAt) / (1000 * 60 * 60 * 24));
}

/** Get urgency color class based on days in stage */
export function getDaysInStageColor(days: number): "default" | "warning" | "danger" {
  if (days <= 3) return "default";
  if (days <= 7) return "warning";
  return "danger";
}

/** Format a loan stage for display */
export function formatStageName(stage: LoanStage): string {
  return stage
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/** Get stage group label */
export function getStageGroupLabel(group: StageGroup): string {
  const labels: Record<StageGroup, string> = {
    intake: "Intake",
    qualification: "Qualification",
    processing: "Processing",
    closing: "Closing",
    terminal: "Terminal",
  };
  return labels[group];
}
