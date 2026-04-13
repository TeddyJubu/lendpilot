import { describe, test, expect } from "vitest";
import {
  getStageGroup,
  daysInStage,
  getDaysInStageColor,
  formatStageName,
  getStageGroupLabel,
} from "../helpers";

describe("loans / helpers tissue", () => {
  // ─── Stage Groups ───
  test("maps intake stages correctly", () => {
    expect(getStageGroup("new_lead")).toBe("intake");
    expect(getStageGroup("scored")).toBe("intake");
    expect(getStageGroup("contacted")).toBe("intake");
  });

  test("maps qualification stages correctly", () => {
    expect(getStageGroup("pre_qualified")).toBe("qualification");
    expect(getStageGroup("application_filed")).toBe("qualification");
    expect(getStageGroup("docs_collecting")).toBe("qualification");
  });

  test("maps processing stages correctly", () => {
    expect(getStageGroup("submitted_to_lender")).toBe("processing");
    expect(getStageGroup("in_underwriting")).toBe("processing");
    expect(getStageGroup("conditions")).toBe("processing");
    expect(getStageGroup("clear_to_close")).toBe("processing");
  });

  test("maps closing stages correctly", () => {
    expect(getStageGroup("closing_scheduled")).toBe("closing");
    expect(getStageGroup("funded")).toBe("closing");
  });

  test("maps terminal stages correctly", () => {
    expect(getStageGroup("withdrawn")).toBe("terminal");
    expect(getStageGroup("denied")).toBe("terminal");
  });

  // ─── Days in Stage ───
  test("daysInStage calculates correctly", () => {
    const twoDaysAgo = Date.now() - 2 * 24 * 60 * 60 * 1000;
    expect(daysInStage(twoDaysAgo)).toBe(2);
  });

  test("daysInStage returns 0 for today", () => {
    expect(daysInStage(Date.now())).toBe(0);
  });

  // ─── Days Color ───
  test("getDaysInStageColor returns correct urgency", () => {
    expect(getDaysInStageColor(0)).toBe("default");
    expect(getDaysInStageColor(3)).toBe("default");
    expect(getDaysInStageColor(4)).toBe("warning");
    expect(getDaysInStageColor(7)).toBe("warning");
    expect(getDaysInStageColor(8)).toBe("danger");
    expect(getDaysInStageColor(30)).toBe("danger");
  });

  // ─── Format Stage Name ───
  test("formatStageName converts underscores to title case", () => {
    expect(formatStageName("new_lead")).toBe("New Lead");
    expect(formatStageName("clear_to_close")).toBe("Clear To Close");
    expect(formatStageName("funded")).toBe("Funded");
    expect(formatStageName("in_underwriting")).toBe("In Underwriting");
  });

  // ─── Stage Group Labels ───
  test("getStageGroupLabel returns correct labels", () => {
    expect(getStageGroupLabel("intake")).toBe("Intake");
    expect(getStageGroupLabel("qualification")).toBe("Qualification");
    expect(getStageGroupLabel("processing")).toBe("Processing");
    expect(getStageGroupLabel("closing")).toBe("Closing");
    expect(getStageGroupLabel("terminal")).toBe("Terminal");
  });
});
