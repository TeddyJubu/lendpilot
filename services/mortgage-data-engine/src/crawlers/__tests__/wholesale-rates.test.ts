import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";

vi.mock("../../utils/helpers", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../utils/helpers")>();
  return { ...actual, sleep: vi.fn().mockResolvedValue(undefined) };
});

import { crawlWholesaleRates } from "../wholesale-rates";
import { createMockEnv, setupHealthyCredits, setupLowCredits } from "../../test/mocks/env";
import type { MockEnv } from "../../test/mocks/env";

const MOCK_LENDERS = [
  {
    id: "lender-1",
    name: "UWM",
    type: "wholesale",
    tpo_portal_url: "https://uwm.com/rates",
    crawl_config: JSON.stringify({ requires_auth: false, crawl_priority: 1 }),
  },
  {
    id: "lender-2",
    name: "Rocket TPO",
    type: "wholesale",
    tpo_portal_url: "https://rocket.com/rates",
    crawl_config: JSON.stringify({ requires_auth: false, crawl_priority: 2 }),
  },
];

function setupEnvWithLenders(env: MockEnv, lenders = MOCK_LENDERS) {
  setupHealthyCredits(env);
  env.DB.mockAll("lenders", lenders);
}

function setupAiWithRates(env: MockEnv) {
  env.AI.setDefaultResponse({
    response: JSON.stringify({
      rates: [
        { product_type: "30yr_fixed", rate: 6.5, apr: 6.625, points: 0, lock_period_days: 30, ltv_min: 0, ltv_max: 80, fico_min: 720, fico_max: 850 },
      ],
    }),
  });
}

const HTML_RESPONSE = new Response("<html>Rate sheet</html>", { status: 200 });

describe("crawlWholesaleRates", () => {
  let env: MockEnv;

  beforeEach(() => {
    env = createMockEnv();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test("aborts early when credits are below 100", async () => {
    setupLowCredits(env, 50);
    const result = await crawlWholesaleRates(env as any);
    expect(result.success).toBe(false);
    expect(result.recordsCreated).toBe(0);
    expect(result.errors[0]).toContain("Insufficient credits");
  });

  test("returns empty jobId when credits are too low", async () => {
    setupLowCredits(env, 30);
    const result = await crawlWholesaleRates(env as any);
    expect(result.jobId).toBe("");
  });

  test("returns failure when no lenders found", async () => {
    setupHealthyCredits(env);
    env.DB.mockAll("lenders", []);
    const result = await crawlWholesaleRates(env as any);
    expect(result.success).toBe(false);
    expect(result.errors[0]).toContain("No active wholesale lenders");
  });

  test("creates a crawl job and returns a jobId", async () => {
    setupEnvWithLenders(env);
    setupAiWithRates(env);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("<html>Rate sheet</html>", { status: 200 })));
    const result = await crawlWholesaleRates(env as any);
    expect(result.jobId).toBeTruthy();
    expect(typeof result.jobId).toBe("string");
  });

  test("records are created for valid extracted rates", async () => {
    setupEnvWithLenders(env, [MOCK_LENDERS[0]]);
    setupAiWithRates(env);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("<html>Rate sheet</html>", { status: 200 })));
    const result = await crawlWholesaleRates(env as any);
    expect(result.recordsCreated).toBeGreaterThan(0);
  });

  test("skips rates with invalid rate value (< 2%)", async () => {
    setupEnvWithLenders(env, [MOCK_LENDERS[0]]);
    env.AI.setDefaultResponse({ response: JSON.stringify({ rates: [{ product_type: "30yr_fixed", rate: 1.0, apr: 1.1, points: 0, lock_period_days: 30 }] }) });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("<html>Rate sheet</html>", { status: 200 })));
    const result = await crawlWholesaleRates(env as any);
    expect(result.recordsCreated).toBe(0);
    expect(result.errors.some((e) => e.includes("Invalid rate"))).toBe(true);
  });

  test("skips rates with invalid rate value (> 15%)", async () => {
    setupEnvWithLenders(env, [MOCK_LENDERS[0]]);
    env.AI.setDefaultResponse({ response: JSON.stringify({ rates: [{ product_type: "30yr_fixed", rate: 20.0, apr: 20.5, points: 0, lock_period_days: 30 }] }) });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("<html>Rate sheet</html>", { status: 200 })));
    const result = await crawlWholesaleRates(env as any);
    expect(result.recordsCreated).toBe(0);
  });

  test("skips rates where APR is less than rate", async () => {
    setupEnvWithLenders(env, [MOCK_LENDERS[0]]);
    env.AI.setDefaultResponse({ response: JSON.stringify({ rates: [{ product_type: "30yr_fixed", rate: 6.5, apr: 6.0, points: 0, lock_period_days: 30 }] }) });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("<html>Rate sheet</html>", { status: 200 })));
    const result = await crawlWholesaleRates(env as any);
    expect(result.recordsCreated).toBe(0);
    expect(result.errors.some((e) => e.includes("APR"))).toBe(true);
  });

  test("skips rates with invalid FICO min (< 300)", async () => {
    setupEnvWithLenders(env, [MOCK_LENDERS[0]]);
    env.AI.setDefaultResponse({ response: JSON.stringify({ rates: [{ product_type: "30yr_fixed", rate: 6.5, apr: 6.6, points: 0, lock_period_days: 30, fico_min: 100 }] }) });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("<html>Rate sheet</html>", { status: 200 })));
    const result = await crawlWholesaleRates(env as any);
    expect(result.recordsCreated).toBe(0);
  });

  test("records an error when URL is missing for a lender", async () => {
    const lenderNoUrl = { ...MOCK_LENDERS[0], tpo_portal_url: null };
    setupEnvWithLenders(env, [lenderNoUrl as any]);
    setupHealthyCredits(env);
    const result = await crawlWholesaleRates(env as any);
    expect(result.errors.some((e) => e.includes("No URL"))).toBe(true);
  });

  test("records an error when scrape returns error", async () => {
    setupEnvWithLenders(env, [MOCK_LENDERS[0]]);
    vi.stubGlobal("fetch", vi.fn().mockRejectedValueOnce(new Error("Connection refused")));
    const result = await crawlWholesaleRates(env as any);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  test("records an error when AI extraction fails", async () => {
    setupEnvWithLenders(env, [MOCK_LENDERS[0]]);
    env.AI.setDefaultResponse({ response: "No JSON here" });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("<html>content</html>", { status: 200 })));
    const result = await crawlWholesaleRates(env as any);
    expect(result.errors.some((e) => e.includes("Extraction failed") || e.includes("No rates"))).toBe(true);
  });

  test("returns jobId even when some lenders fail", async () => {
    setupEnvWithLenders(env, MOCK_LENDERS);
    setupAiWithRates(env);
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce(new Response("<html>Rate sheet</html>", { status: 200 }))
      .mockRejectedValueOnce(new Error("Timeout")));
    const result = await crawlWholesaleRates(env as any);
    expect(result.jobId).toBeTruthy();
  });
});
