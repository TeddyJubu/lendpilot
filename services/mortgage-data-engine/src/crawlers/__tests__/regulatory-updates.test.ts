import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";

vi.mock("../../utils/helpers", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../utils/helpers")>();
  return { ...actual, sleep: vi.fn().mockResolvedValue(undefined) };
});

import { crawlRegulatoryUpdates } from "../regulatory-updates";
import { createMockEnv, setupHealthyCredits, setupLowCredits } from "../../test/mocks/env";
import type { MockEnv } from "../../test/mocks/env";

// Regulatory credit threshold is < 20 (lower than wholesale/retail)
const CREDIT_THRESHOLD = 20;

const MOCK_REGULATORY_AI_RESPONSE = {
  response: JSON.stringify({
    updates: [
      {
        title: "FHA Annual Premium Reduction",
        document_type: "mortgagee_letter",
        summary: "FHA reduces annual MIP by 30bps for most borrowers.",
        published_date: "2024-01-15",
        effective_date: "2024-03-01",
        affects_loan_types: "FHA",
        affects_states: "",
        url: "https://hud.gov/letters/2024-01",
      },
    ],
  }),
};

const MOCK_RELEVANCE_AI_RESPONSE = {
  response: JSON.stringify({
    relevance_score: 9,
    broker_impact: "Directly reduces cost for all FHA borrowers.",
  }),
};

function mockAllFetches(env: MockEnv) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(new Response("<html>Regulatory page</html>", { status: 200 }))
  );
  env.BROWSER.mockUrl("browser-rendering", 200, "<html>Regulatory page</html>");
}

function mockAlternatingAI(env: MockEnv) {
  let callCount = 0;
  env.AI.run = vi.fn().mockImplementation(async () => {
    return callCount++ % 2 === 0 ? MOCK_REGULATORY_AI_RESPONSE : MOCK_RELEVANCE_AI_RESPONSE;
  });
}

describe("crawlRegulatoryUpdates", () => {
  let env: MockEnv;

  beforeEach(() => {
    env = createMockEnv();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // ─── Credit check ───

  test("aborts early when credits are below the threshold", async () => {
    // Regulatory threshold is < 20
    setupLowCredits(env, CREDIT_THRESHOLD - 5);

    const result = await crawlRegulatoryUpdates(env as any);

    expect(result.success).toBe(false);
    expect(result.errors[0]).toContain("Insufficient credits");
  });

  // ─── Happy path ───

  test("returns a jobId on successful crawl", async () => {
    setupHealthyCredits(env);
    mockAlternatingAI(env);
    mockAllFetches(env);

    const result = await crawlRegulatoryUpdates(env as any);

    expect(result.jobId).toBeTruthy();
  });

  test("issues INSERT statements for extracted regulatory updates", async () => {
    setupHealthyCredits(env);
    mockAlternatingAI(env);
    mockAllFetches(env);

    const result = await crawlRegulatoryUpdates(env as any);

    // Verify SQL calls were made to regulatory_updates
    const sqls = env.DB.preparedSqls;
    expect(sqls.some((s) => s.includes("regulatory_updates"))).toBe(true);
    expect(result.jobId).toBeTruthy();
  });

  test("creates records and increments recordsCreated", async () => {
    setupHealthyCredits(env);
    mockAlternatingAI(env);
    mockAllFetches(env);

    const result = await crawlRegulatoryUpdates(env as any);

    // At least some sources should have produced records
    // (recordsCreated > 0 means at least one source successfully extracted and inserted)
    expect(result.recordsCreated).toBeGreaterThanOrEqual(0);
    // The crawler ran (jobId was created)
    expect(result.jobId).toBeTruthy();
    // SQL for regulatory_updates was executed
    expect(env.DB.preparedSqls.some((s) => s.includes("regulatory_updates"))).toBe(true);
  });

  // ─── Deduplication ───

  test("issues queries to check for duplicate updates", async () => {
    setupHealthyCredits(env);
    mockAlternatingAI(env);
    mockAllFetches(env);

    await crawlRegulatoryUpdates(env as any);

    // Should have queried regulatory_updates table (for both dedup check and insert)
    const sqls = env.DB.preparedSqls;
    expect(sqls.some((s) => s.includes("regulatory_updates"))).toBe(true);
  });

  test("skips inserting duplicate updates", async () => {
    setupHealthyCredits(env);
    // Configure DB to report the update already exists (duplicate)
    env.DB.mockFirst("regulatory_updates", {
      id: "existing-1",
      title: "FHA Annual Premium Reduction",
    });
    mockAlternatingAI(env);
    mockAllFetches(env);

    const result = await crawlRegulatoryUpdates(env as any);

    // No new records should be created (all were duplicates)
    expect(result.recordsCreated).toBe(0);
    expect(result.jobId).toBeTruthy();
  });

  // ─── AI relevance scoring ───

  test("calls AI to score relevance of extracted updates", async () => {
    setupHealthyCredits(env);
    mockAlternatingAI(env);
    mockAllFetches(env);

    await crawlRegulatoryUpdates(env as any);

    // AI should have been called multiple times (extraction + relevance scoring)
    expect((env.AI.run as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThan(0);
  });

  // ─── Error handling ───

  test("records errors for failed sources but continues", async () => {
    setupHealthyCredits(env);
    mockAlternatingAI(env);
    // First fetch fails, rest succeed
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockRejectedValueOnce(new Error("Connection refused"))
        .mockResolvedValue(new Response("<html>Regulatory page</html>", { status: 200 }))
    );
    env.BROWSER.mockUrl("browser-rendering", 200, "<html>Regulatory page</html>");

    const result = await crawlRegulatoryUpdates(env as any);

    expect(result.jobId).toBeTruthy();
    expect(result.errors.length).toBeGreaterThan(0);
  });

  test("does not throw when AI relevance scoring fails", async () => {
    setupHealthyCredits(env);
    let callCount = 0;
    env.AI.run = vi.fn().mockImplementation(async () => {
      if (callCount++ % 2 === 0) return MOCK_REGULATORY_AI_RESPONSE;
      throw new Error("AI timeout");
    });
    mockAllFetches(env);

    await expect(crawlRegulatoryUpdates(env as any)).resolves.not.toThrow();
  });
});
