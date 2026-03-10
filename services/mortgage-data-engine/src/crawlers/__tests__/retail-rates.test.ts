import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";

vi.mock("../../utils/helpers", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../utils/helpers")>();
  return { ...actual, sleep: vi.fn().mockResolvedValue(undefined) };
});

import { crawlRetailRates } from "../retail-rates";
import { createMockEnv, setupHealthyCredits, setupLowCredits } from "../../test/mocks/env";
import type { MockEnv } from "../../test/mocks/env";

const MOCK_RETAIL_LENDERS = [
  {
    id: "chase",
    name: "Chase",
    type: "retail",
    retail_rates_url: "https://chase.com/mortgage/rates",
    crawl_config: JSON.stringify({ requires_auth: false }),
  },
  {
    id: "wells",
    name: "Wells Fargo",
    type: "retail",
    retail_rates_url: "https://wellsfargo.com/mortgage/rates",
    crawl_config: JSON.stringify({ requires_auth: false }),
  },
  {
    id: "better",
    name: "Better.com",
    type: "online",
    retail_rates_url: "https://better.com/mortgage/rates",
    crawl_config: JSON.stringify({ requires_auth: false }),
  },
];

const MOCK_VALID_AI_RESPONSE = {
  response: JSON.stringify({
    lender_name: "Chase",
    rates: [
      {
        product_type: "30yr_fixed",
        rate: 7.25,
        apr: 7.4,
        points: 0,
        assumptions_fico: 740,
        assumptions_ltv: 80,
        assumptions_loan_amount: 350_000,
      },
    ],
    last_updated: "2024-01-15",
  }),
};

function setupEnvWithRetailLenders(env: MockEnv, lenders = MOCK_RETAIL_LENDERS) {
  setupHealthyCredits(env);
  env.DB.mockAll("lenders", lenders);
}

describe("crawlRetailRates", () => {
  let env: MockEnv;

  beforeEach(() => {
    env = createMockEnv();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // ─── Credit check ───

  test("aborts early when credits are below 50", async () => {
    setupLowCredits(env, 30);

    const result = await crawlRetailRates(env as any);

    expect(result.success).toBe(false);
    expect(result.errors[0]).toContain("Insufficient credits");
  });

  // ─── No lenders ───

  test("returns failure when no retail lenders found", async () => {
    setupHealthyCredits(env);
    env.DB.mockAll("lenders", []);

    const result = await crawlRetailRates(env as any);

    expect(result.success).toBe(false);
    expect(result.errors[0]).toContain("No retail lenders");
  });

  test("filters to only retail/online/credit_union lenders", async () => {
    setupHealthyCredits(env);
    // Mix wholesale + retail lenders; only retail should be crawled
    env.DB.mockAll("lenders", [
      { id: "uwm", name: "UWM", type: "wholesale", retail_rates_url: null },
      ...MOCK_RETAIL_LENDERS,
    ]);
    env.AI.setDefaultResponse(MOCK_VALID_AI_RESPONSE);
    global.fetch = vi.fn().mockResolvedValue(
      new Response("<html>rates</html>", { status: 200 })
    );

    const result = await crawlRetailRates(env as any);

    // Should succeed without crashing on the wholesale lender (no retail URL)
    expect(result.jobId).toBeTruthy();
  });

  // ─── Happy path ───

  test("returns a jobId on success", async () => {
    setupEnvWithRetailLenders(env, [MOCK_RETAIL_LENDERS[0]]);
    env.AI.setDefaultResponse(MOCK_VALID_AI_RESPONSE);
    global.fetch = vi.fn().mockResolvedValue(
      new Response("<html>rates</html>", { status: 200 })
    );

    const result = await crawlRetailRates(env as any);

    expect(result.jobId).toBeTruthy();
  });

  test("creates records for valid extracted rates", async () => {
    setupEnvWithRetailLenders(env, [MOCK_RETAIL_LENDERS[0]]);
    env.AI.setDefaultResponse(MOCK_VALID_AI_RESPONSE);
    global.fetch = vi.fn().mockResolvedValue(
      new Response("<html>rates</html>", { status: 200 })
    );

    const result = await crawlRetailRates(env as any);

    expect(result.recordsCreated).toBeGreaterThan(0);
  });

  // ─── JS-heavy site detection ───

  test("uses browser rendering for better.com (JS-heavy site)", async () => {
    setupEnvWithRetailLenders(env, [MOCK_RETAIL_LENDERS[2]]); // better.com
    setupHealthyCredits(env);
    env.AI.setDefaultResponse(MOCK_VALID_AI_RESPONSE);

    // Browser rendering mock
    env.BROWSER.mockUrl("browser-rendering", 200, "<html>rates</html>");

    const result = await crawlRetailRates(env as any);

    // Browser should have been called (not global fetch)
    expect(env.BROWSER.calls.length).toBeGreaterThan(0);
  });

  test("uses simple fetch for non-JS-heavy sites", async () => {
    setupEnvWithRetailLenders(env, [MOCK_RETAIL_LENDERS[0]]); // chase.com
    env.AI.setDefaultResponse(MOCK_VALID_AI_RESPONSE);
    let fetchCalled = false;
    global.fetch = vi.fn().mockImplementation(async () => {
      fetchCalled = true;
      return new Response("<html>rates</html>", { status: 200 });
    });

    await crawlRetailRates(env as any);

    expect(fetchCalled).toBe(true);
  });

  // ─── Validation ───

  test("skips rates with invalid rate value", async () => {
    setupEnvWithRetailLenders(env, [MOCK_RETAIL_LENDERS[0]]);
    env.AI.setDefaultResponse({
      response: JSON.stringify({
        lender_name: "Chase",
        rates: [{ product_type: "30yr_fixed", rate: 1.0, apr: 1.1, points: 0 }],
      }),
    });
    global.fetch = vi.fn().mockResolvedValue(
      new Response("<html>rates</html>", { status: 200 })
    );

    const result = await crawlRetailRates(env as any);
    expect(result.recordsCreated).toBe(0);
    expect(result.errors.some((e) => e.includes("Invalid rate"))).toBe(true);
  });

  // ─── Error handling ───

  test("records an error for lender missing retail URL", async () => {
    const noUrlLender = { ...MOCK_RETAIL_LENDERS[0], retail_rates_url: null };
    setupEnvWithRetailLenders(env, [noUrlLender as any]);

    const result = await crawlRetailRates(env as any);
    expect(result.errors.some((e) => e.includes("No retail URL"))).toBe(true);
  });

  test("continues crawling other lenders when one fails", async () => {
    setupEnvWithRetailLenders(env, MOCK_RETAIL_LENDERS.slice(0, 2));
    env.AI.setDefaultResponse(MOCK_VALID_AI_RESPONSE);
    global.fetch = vi.fn()
      .mockRejectedValueOnce(new Error("Timeout"))
      .mockResolvedValueOnce(new Response("<html>rates</html>", { status: 200 }));

    const result = await crawlRetailRates(env as any);

    // Second lender should still succeed even if first fails
    expect(result.jobId).toBeTruthy();
    expect(result.errors.length).toBeGreaterThan(0); // first lender error
  });
});
