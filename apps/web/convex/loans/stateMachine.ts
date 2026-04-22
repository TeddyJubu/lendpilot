/**
 * @organ loans
 * @tissue stateMachine
 * @description Defines valid stage transitions for the loan pipeline.
 *   Enforced in every stage-change mutation.
 * @depends-on loans/tables.ts (stage type)
 * @depended-by loans/mutations.ts (updateStage calls canTransition)
 */

import type { LoanStage } from "../types";

/**
 * Valid stage transitions map.
 * Key = current stage, Value = array of valid next stages.
 * @ai-caution Changing this map affects the entire pipeline flow.
 *   Every removal must be verified against the UI kanban columns.
 */
export const STAGE_TRANSITIONS: Record<LoanStage, LoanStage[]> = {
  // Intake
  new_lead: ["scored", "contacted", "withdrawn"],
  scored: ["contacted", "withdrawn"],
  contacted: ["pre_qualified", "withdrawn"],
  // Qualification
  pre_qualified: ["application_filed", "withdrawn"],
  application_filed: ["docs_collecting", "withdrawn"],
  docs_collecting: ["submitted_to_lender", "withdrawn"],
  // Processing
  submitted_to_lender: ["in_underwriting", "withdrawn", "denied"],
  in_underwriting: ["conditions", "clear_to_close", "denied"],
  conditions: ["in_underwriting", "clear_to_close", "denied"],
  clear_to_close: ["closing_scheduled"],
  // Closing
  closing_scheduled: ["funded", "withdrawn"],
  // Terminal (can reopen)
  withdrawn: ["new_lead"],
  denied: ["new_lead"],
  funded: [], // true terminal
};

/**
 * Check if a stage transition is valid.
 */
export function canTransition(from: LoanStage, to: LoanStage): boolean {
  const validNextStages = STAGE_TRANSITIONS[from];
  return validNextStages.includes(to);
}

/**
 * Get all valid next stages from the current stage.
 */
export function getNextStages(current: LoanStage): LoanStage[] {
  return STAGE_TRANSITIONS[current];
}

/**
 * Check if a stage is terminal (no further transitions possible).
 */
export function isTerminal(stage: LoanStage): boolean {
  return STAGE_TRANSITIONS[stage].length === 0;
}
