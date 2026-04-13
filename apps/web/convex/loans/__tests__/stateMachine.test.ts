import { describe, test, expect } from "vitest";
import {
  canTransition,
  getNextStages,
  isTerminal,
  STAGE_TRANSITIONS,
} from "../stateMachine";
import type { LoanStage } from "../../types";

describe("loans / stateMachine tissue", () => {
  // ─── Valid Transitions ───

  test("new_lead can transition to scored, contacted, withdrawn", () => {
    expect(canTransition("new_lead", "scored")).toBe(true);
    expect(canTransition("new_lead", "contacted")).toBe(true);
    expect(canTransition("new_lead", "withdrawn")).toBe(true);
  });

  test("scored can transition to contacted, withdrawn", () => {
    expect(canTransition("scored", "contacted")).toBe(true);
    expect(canTransition("scored", "withdrawn")).toBe(true);
  });

  test("contacted can transition to pre_qualified, withdrawn", () => {
    expect(canTransition("contacted", "pre_qualified")).toBe(true);
    expect(canTransition("contacted", "withdrawn")).toBe(true);
  });

  test("pre_qualified can transition to application_filed, withdrawn", () => {
    expect(canTransition("pre_qualified", "application_filed")).toBe(true);
    expect(canTransition("pre_qualified", "withdrawn")).toBe(true);
  });

  test("application_filed can transition to docs_collecting, withdrawn", () => {
    expect(canTransition("application_filed", "docs_collecting")).toBe(true);
    expect(canTransition("application_filed", "withdrawn")).toBe(true);
  });

  test("docs_collecting can transition to submitted_to_lender, withdrawn", () => {
    expect(canTransition("docs_collecting", "submitted_to_lender")).toBe(true);
    expect(canTransition("docs_collecting", "withdrawn")).toBe(true);
  });

  test("submitted_to_lender can transition to in_underwriting, withdrawn, denied", () => {
    expect(canTransition("submitted_to_lender", "in_underwriting")).toBe(true);
    expect(canTransition("submitted_to_lender", "withdrawn")).toBe(true);
    expect(canTransition("submitted_to_lender", "denied")).toBe(true);
  });

  test("in_underwriting can transition to conditions, clear_to_close, denied", () => {
    expect(canTransition("in_underwriting", "conditions")).toBe(true);
    expect(canTransition("in_underwriting", "clear_to_close")).toBe(true);
    expect(canTransition("in_underwriting", "denied")).toBe(true);
  });

  test("conditions can transition back to in_underwriting, clear_to_close, denied", () => {
    expect(canTransition("conditions", "in_underwriting")).toBe(true);
    expect(canTransition("conditions", "clear_to_close")).toBe(true);
    expect(canTransition("conditions", "denied")).toBe(true);
  });

  test("clear_to_close can only transition to closing_scheduled", () => {
    expect(canTransition("clear_to_close", "closing_scheduled")).toBe(true);
    expect(getNextStages("clear_to_close")).toEqual(["closing_scheduled"]);
  });

  test("closing_scheduled can transition to funded, withdrawn", () => {
    expect(canTransition("closing_scheduled", "funded")).toBe(true);
    expect(canTransition("closing_scheduled", "withdrawn")).toBe(true);
  });

  test("withdrawn can reopen to new_lead", () => {
    expect(canTransition("withdrawn", "new_lead")).toBe(true);
  });

  test("denied can reopen to new_lead", () => {
    expect(canTransition("denied", "new_lead")).toBe(true);
  });

  // ─── Invalid Transitions ───

  test("rejects skipping from new_lead to funded", () => {
    expect(canTransition("new_lead", "funded")).toBe(false);
  });

  test("rejects skipping from new_lead to clear_to_close", () => {
    expect(canTransition("new_lead", "clear_to_close")).toBe(false);
  });

  test("rejects backward transition from pre_qualified to new_lead", () => {
    expect(canTransition("pre_qualified", "new_lead")).toBe(false);
  });

  test("rejects transition from contacted to funded", () => {
    expect(canTransition("contacted", "funded")).toBe(false);
  });

  test("rejects same-stage transition", () => {
    expect(canTransition("new_lead", "new_lead")).toBe(false);
    expect(canTransition("in_underwriting", "in_underwriting")).toBe(false);
  });

  // ─── Terminal States ───

  test("funded is terminal — no transitions possible", () => {
    expect(isTerminal("funded")).toBe(true);
    expect(getNextStages("funded")).toEqual([]);
  });

  test("withdrawn is not terminal — can reopen", () => {
    expect(isTerminal("withdrawn")).toBe(false);
  });

  test("denied is not terminal — can reopen", () => {
    expect(isTerminal("denied")).toBe(false);
  });

  test("new_lead is not terminal", () => {
    expect(isTerminal("new_lead")).toBe(false);
  });

  // ─── Completeness ───

  test("every stage has an entry in STAGE_TRANSITIONS", () => {
    const allStages: LoanStage[] = [
      "new_lead", "scored", "contacted", "pre_qualified",
      "application_filed", "docs_collecting", "submitted_to_lender",
      "in_underwriting", "conditions", "clear_to_close",
      "closing_scheduled", "funded", "withdrawn", "denied",
    ];
    for (const stage of allStages) {
      expect(STAGE_TRANSITIONS).toHaveProperty(stage);
      expect(Array.isArray(STAGE_TRANSITIONS[stage])).toBe(true);
    }
  });

  test("all transition targets are valid stages", () => {
    const allStages = new Set(Object.keys(STAGE_TRANSITIONS));
    for (const [, targets] of Object.entries(STAGE_TRANSITIONS)) {
      for (const target of targets) {
        expect(allStages.has(target)).toBe(true);
      }
    }
  });
});
