import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";

vi.mock("../../utils/helpers", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../utils/helpers")>();
  return { ...actual, sleep: vi.fn().mockResolvedValue(undefined) };
});

import { crawlDPAPrograms } from "../dpa-programs";
import { createMockEnv, setupHealthyCredits, setupLowCredits } from "../../test/mocks/env";
import type { MockEnv } from "../../test/mocks/env";

// DPA credit threshold is < 60
const CREDIT_THRESHOLD = 60;

const MOCK_DPA_AI_RESPONSE = {
  response: JSON.stringify({
    programs: [
      {
        program_name: "CalHFA My Home Assistance",
        assistance_type: "deferred_loan",
        max_amount: "$10,000",
        max_percentage: "3.5%",
        income_limit: "$150,000",
        first_time_buyer_only: true,
        fico_minimum: 640,
        compatible_loans: "FHA, Conventional",
        program_status: "active",
        application_url: "https://calhfa.ca.gov/apply",
      },
    ],
  }),
};

describe("crawlDPAPrograms", () => {
  let env: MockEnv;

  beforeEach(() => {
    env = createMockEnv();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test("aborts early when credits are below the threshold", async () => {
    setupLowCredits(env, CREDIT_THRESHOLD - 10);
    const result = await crawlDPAPrograms(env as any);
    expect(result.success).toBe(false);
    expect(result.errors[0]).toContain("Insufficient credits");
  });

  test("returns a jobId on successful crawl", async () => {
    setupHealthyCredits(env);
    env.AI.setDefaultResponse(MOCK_DPA_AI_RESPONSE);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("<html>DPA</html>", { status: 200 })));
    env.BROWSER.mockUrl("browser-rendering", 200, "<html>DPA</html>");
    const result = await crawlDPAPrograms(env as any);
    expect(result.jobId).toBeTruthy();
  });

  test("issues SQL against dpa_programs table for valid programs", async () => {
    setupHealthyCredits(env);
    env.AI.setDefaultResponse(MOCK_DPA_AI_RESPONSE);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("<html>DPA</html>", { status: 200 })));
    env.BROWSER.mockUrl("browser-rendering", 200, "<html>DPA</html>");
    const result = await crawlDPAPrograms(env as any);
    expect(env.DB.preparedSqls.some((s) => s.includes("dpa_programs"))).toBe(true);
    expect(result.jobId).toBeTruthy();
  });

  test("records are created or updated for valid DPA programs", async () => {
    setupHealthyCredits(env);
    env.AI.setDefaultResponse(MOCK_DPA_AI_RESPONSE);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("<html>DPA</html>", { status: 200 })));
    env.BROWSER.mockUrl("browser-rendering", 200, "<html>DPA</html>");
    const result = await crawlDPAPrograms(env as any);
    expect(result.recordsCreated + result.recordsUpdated).toBeGreaterThan(0);
  });

  test("records errors for failed sources but continues crawl", async () => {
    setupHealthyCredits(env);
    env.AI.setDefaultResponse(MOCK_DPA_AI_RESPONSE);
    vi.stubGlobal("fetch", vi.fn()
      .mockRejectedValueOnce(new Error("Network error"))
      .mockResolvedValue(new Response("<html>DPA</html>", { status: 200 })));
    env.BROWSER.mockUrl("browser-rendering", 200, "<html>DPA</html>");
    const result = await crawlDPAPrograms(env as any);
    expect(result.jobId).toBeTruthy();
    expect(result.errors.length).toBeGreaterThan(0);
  });

  test("crawl does not crash when AI extraction fails for a source", async () => {
    setupHealthyCredits(env);
    env.AI.setDefaultResponse({ response: "Not valid JSON output" });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("<html>DPA</html>", { status: 200 })));
    env.BROWSER.mockUrl("browser-rendering", 200, "<html>DPA</html>");
    const result = await crawlDPAPrograms(env as any);
    expect(result.jobId).toBeTruthy();
  });
});
