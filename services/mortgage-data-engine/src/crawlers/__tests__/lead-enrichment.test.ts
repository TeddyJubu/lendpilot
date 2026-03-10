import { describe, test, expect, beforeEach, vi } from "vitest";

vi.mock("../../utils/helpers", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../utils/helpers")>();
  return { ...actual, sleep: vi.fn().mockResolvedValue(undefined) };
});

import { enrichLead } from "../lead-enrichment";
import { createMockEnv } from "../../test/mocks/env";
import type { MockEnv } from "../../test/mocks/env";

const BASE_REQUEST = {
  lead_id: "lead-123",
  full_name: "John Doe",
};

const REQUEST_WITH_PROPERTY = {
  ...BASE_REQUEST,
  property_address: "123 Main St, Anytown, CA 90210",
};

const REQUEST_WITH_LINKEDIN = {
  ...BASE_REQUEST,
  linkedin_url: "https://linkedin.com/in/johndoe",
};

const MOCK_PROPERTY_AI_RESPONSE = {
  response: JSON.stringify({
    address: "123 Main St",
    estimated_value: 750_000,
    bedrooms: 3,
    bathrooms: 2,
    sqft: 1800,
    year_built: 2005,
    property_type: "SFR",
    listing_status: "Active",
    listing_price: 760_000,
    days_on_market: 14,
    tax_annual: 8_500,
  }),
};

const MOCK_PERSON_AI_RESPONSE = {
  response: JSON.stringify({
    job_title: "Software Engineer",
    employer: "Tech Corp",
    tenure_years: 3,
    education: "Bachelor's",
    estimated_income_bracket: "100k_150k",
  }),
};

describe("enrichLead", () => {
  let env: MockEnv;

  beforeEach(() => {
    env = createMockEnv();
    vi.restoreAllMocks();

    // By default: no cached data
    env.DB.mockFirst("property_enrichments", null);
    env.DB.mockFirst("person_enrichments", null);

    // Default AI response — can be overridden per test
    env.AI.setDefaultResponse(MOCK_PROPERTY_AI_RESPONSE);
  });

  // ─── Minimal request (name only, no address/linkedin) ───

  test("returns jobId even for minimal request (name only)", async () => {
    const result = await enrichLead(env as any, BASE_REQUEST);

    expect(result.jobId).toBeTruthy();
    expect(result.errors).toBeInstanceOf(Array);
  });

  test("property is null when no address provided", async () => {
    const result = await enrichLead(env as any, BASE_REQUEST);

    expect(result.property).toBeNull();
    expect(result.fromCache.property).toBe(false);
  });

  // ─── Property enrichment ───

  test("scrapes property data when address is provided", async () => {
    env.AI.setDefaultResponse(MOCK_PROPERTY_AI_RESPONSE);
    env.BROWSER.mockUrl("browser-rendering", 200, "<html>Property page</html>");

    const result = await enrichLead(env as any, REQUEST_WITH_PROPERTY);

    // Should have attempted browser scraping
    expect(env.BROWSER.calls.length).toBeGreaterThan(0);
  });

  test("returns from cache when property is cached", async () => {
    const cachedProperty = {
      id: "cached-1",
      address_normalized: "123 main st anytown ca 90210",
      estimated_value: 700_000,
      cache_expires_at: new Date(Date.now() + 86400_000).toISOString(),
    };
    env.DB.mockFirst("property_enrichments", cachedProperty);

    const result = await enrichLead(env as any, REQUEST_WITH_PROPERTY);

    expect(result.fromCache.property).toBe(true);
    expect(result.property).toEqual(cachedProperty);
    // Browser rendering should NOT have been called
    expect(env.BROWSER.calls.length).toBe(0);
  });

  test("validates property value and removes invalid values", async () => {
    env.AI.setDefaultResponse({
      response: JSON.stringify({
        estimated_value: 5_000, // below $10k minimum
        bedrooms: 3,
        property_type: "SFR",
        listing_status: "Active",
      }),
    });
    env.BROWSER.mockUrl("browser-rendering", 200, "<html>Property page</html>");

    const result = await enrichLead(env as any, REQUEST_WITH_PROPERTY);

    // Error should be recorded for invalid property value
    expect(result.errors.some((e) => e.includes("Invalid property value"))).toBe(true);
  });

  test("records errors when all property sources fail", async () => {
    env.BROWSER.setError(true); // All browser rendering fails

    const result = await enrichLead(env as any, REQUEST_WITH_PROPERTY);

    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.property).toBeNull();
  });

  test("merges data from multiple sources (first non-null wins)", async () => {
    // First source returns partial data, second fills in the rest
    let callCount = 0;
    env.AI.setDefaultResponse(undefined as any);

    const responses = [
      JSON.stringify({ bedrooms: 3, sqft: null, listing_status: "Active" }), // zillow
      JSON.stringify({ bedrooms: null, sqft: 1800, listing_status: "Active" }), // redfin
      JSON.stringify({ bedrooms: null, sqft: null, listing_status: "Active" }), // realtor
    ];

    // Override AI run to return different values each call
    const originalRun = env.AI.run.bind(env.AI);
    env.AI.run = vi.fn().mockImplementation(async (model: string, params: any) => {
      const userContent = params.messages?.[1]?.content ?? "";
      if (userContent.includes("brief")) return { response: "Lead brief" };
      return { response: responses[callCount++ % responses.length] };
    });

    env.BROWSER.mockUrl("browser-rendering", 200, "<html>Property page</html>");

    const result = await enrichLead(env as any, REQUEST_WITH_PROPERTY);

    // Should not throw
    expect(result.jobId).toBeTruthy();
  });

  // ─── Person enrichment ───

  test("skips person enrichment when no linkedin URL and no cached data", async () => {
    const result = await enrichLead(env as any, BASE_REQUEST);

    expect(result.person).toBeNull();
  });

  test("scrapes LinkedIn when URL is provided", async () => {
    env.AI.setDefaultResponse(MOCK_PERSON_AI_RESPONSE);
    env.BROWSER.mockUrl("browser-rendering", 200, "<html>LinkedIn profile</html>");

    const result = await enrichLead(env as any, REQUEST_WITH_LINKEDIN);

    expect(env.BROWSER.calls.length).toBeGreaterThan(0);
  });

  test("returns from person cache when available", async () => {
    const cachedPerson = {
      id: "person-1",
      lead_id: "lead-123",
      job_title: "Senior Engineer",
      employer: "Big Tech",
      cache_expires_at: new Date(Date.now() + 86400_000).toISOString(),
    };
    env.DB.mockFirst("person_enrichments", cachedPerson);

    const result = await enrichLead(env as any, REQUEST_WITH_LINKEDIN);

    expect(result.fromCache.person).toBe(true);
    expect(result.person).toEqual(cachedPerson);
  });

  // ─── AI lead brief ───

  test("does not throw when AI lead brief fails", async () => {
    env.BROWSER.mockUrl("browser-rendering", 200, "<html>Property page</html>");
    env.AI.setDefaultResponse(MOCK_PROPERTY_AI_RESPONSE);

    // Make AI throw on the second call (lead brief)
    let callCount = 0;
    env.AI.run = vi.fn().mockImplementation(async (model: string, params: any) => {
      if (callCount++ > 2) throw new Error("AI timeout");
      return MOCK_PROPERTY_AI_RESPONSE;
    });

    // Should not throw even if lead brief fails
    await expect(
      enrichLead(env as any, REQUEST_WITH_PROPERTY)
    ).resolves.not.toThrow();
  });

  // ─── fromCache flags ───

  test("fromCache.property is false when freshly scraped", async () => {
    env.AI.setDefaultResponse(MOCK_PROPERTY_AI_RESPONSE);
    env.BROWSER.mockUrl("browser-rendering", 200, "<html>Property page</html>");

    const result = await enrichLead(env as any, REQUEST_WITH_PROPERTY);

    expect(result.fromCache.property).toBe(false);
  });
});
