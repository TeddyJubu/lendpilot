import { describe, test, expect, beforeEach, vi } from "vitest";

// Mock crawlers before importing routes (hoisted by vitest)
vi.mock("../../crawlers/wholesale-rates", () => ({
  crawlWholesaleRates: vi.fn().mockResolvedValue({
    success: true,
    jobId: "job-ws-1",
    recordsCreated: 5,
    errors: [],
  }),
}));

vi.mock("../../crawlers/retail-rates", () => ({
  crawlRetailRates: vi.fn().mockResolvedValue({
    success: true,
    jobId: "job-ret-1",
    recordsCreated: 3,
    errors: [],
  }),
}));

vi.mock("../../crawlers/dpa-programs", () => ({
  crawlDPAPrograms: vi.fn().mockResolvedValue({
    success: true,
    jobId: "job-dpa-1",
    recordsCreated: 2,
    recordsUpdated: 1,
    errors: [],
  }),
}));

vi.mock("../../crawlers/regulatory-updates", () => ({
  crawlRegulatoryUpdates: vi.fn().mockResolvedValue({
    success: true,
    jobId: "job-reg-1",
    recordsCreated: 4,
    highPriorityCount: 1,
    errors: [],
  }),
}));

vi.mock("../../crawlers/lead-enrichment", () => ({
  enrichLead: vi.fn().mockResolvedValue({
    success: true,
    leadId: "lead-1",
    propertyEnriched: true,
    personEnriched: false,
    errors: [],
    fromCache: false,
  }),
}));

import app from "../routes";
import { createMockEnv, setupHealthyCredits } from "../../test/mocks/env";
import type { MockEnv } from "../../test/mocks/env";

const API_KEY = "test-admin-key";

function makeRequest(path: string, opts?: RequestInit): Request {
  return new Request(`http://localhost${path}`, opts);
}

function withAuth(opts?: RequestInit): RequestInit {
  return {
    ...opts,
    headers: { "X-API-Key": API_KEY, ...(opts?.headers as Record<string, string> | undefined) },
  };
}

describe("API Routes", () => {
  let env: MockEnv;

  beforeEach(() => {
    env = createMockEnv();
    setupHealthyCredits(env);
  });

  // ─── Auth Middleware ───

  describe("auth middleware", () => {
    test("returns 401 when no API key provided", async () => {
      const res = await app.fetch(makeRequest("/api/rates/wholesale"), env as any, {} as any);
      expect(res.status).toBe(401);
      const body = await res.json() as any;
      expect(body.error).toBe("Unauthorized");
    });

    test("returns 401 when wrong API key provided", async () => {
      const res = await app.fetch(
        makeRequest("/api/rates/wholesale", { headers: { "X-API-Key": "wrong-key" } }),
        env as any,
        {} as any
      );
      expect(res.status).toBe(401);
    });

    test("accepts API key via query param", async () => {
      env.DB.mockAll("wholesale_rates", []);
      const res = await app.fetch(
        makeRequest(`/api/rates/wholesale?api_key=${API_KEY}`),
        env as any,
        {} as any
      );
      expect(res.status).toBe(200);
    });

    test("accepts API key via X-API-Key header", async () => {
      env.DB.mockAll("wholesale_rates", []);
      const res = await app.fetch(
        makeRequest("/api/rates/wholesale", { headers: { "X-API-Key": API_KEY } }),
        env as any,
        {} as any
      );
      expect(res.status).toBe(200);
    });
  });

  // ─── Health Check ───

  describe("GET /api/health", () => {
    test("returns 200 without auth", async () => {
      const res = await app.fetch(makeRequest("/api/health"), env as any, {} as any);
      expect(res.status).toBe(200);
    });

    test("returns status ok and credits_remaining", async () => {
      const res = await app.fetch(makeRequest("/api/health"), env as any, {} as any);
      const body = await res.json() as any;
      expect(body.status).toBe("ok");
      expect(typeof body.credits_remaining).toBe("number");
      expect(body.timestamp).toBeDefined();
    });
  });

  // ─── Wholesale Rates ───

  describe("GET /api/rates/wholesale", () => {
    test("returns rates array with count", async () => {
      env.DB.mockAll("wholesale_rates", [
        { id: "1", lender_id: "uwm", product_type: "30yr_fixed", rate: 6.5, apr: 6.625 },
      ]);
      const res = await app.fetch(makeRequest("/api/rates/wholesale", withAuth()), env as any, {} as any);
      expect(res.status).toBe(200);
      const body = await res.json() as any;
      expect(typeof body.count).toBe("number");
      expect(Array.isArray(body.rates)).toBe(true);
    });

    test("accepts fico and ltv query params", async () => {
      env.DB.mockAll("wholesale_rates", []);
      const res = await app.fetch(
        makeRequest("/api/rates/wholesale?fico=720&ltv=80", withAuth()),
        env as any,
        {} as any
      );
      expect(res.status).toBe(200);
    });
  });

  // ─── Retail Rates ───

  describe("GET /api/rates/retail", () => {
    test("returns rates array with count", async () => {
      env.DB.mockAll("retail_rates", [
        { id: "1", lender_id: "chase", product_type: "30yr_fixed", advertised_rate: 7.25 },
      ]);
      const res = await app.fetch(makeRequest("/api/rates/retail", withAuth()), env as any, {} as any);
      expect(res.status).toBe(200);
      const body = await res.json() as any;
      expect(typeof body.count).toBe("number");
      expect(Array.isArray(body.rates)).toBe(true);
    });

    test("accepts product_type filter", async () => {
      env.DB.mockAll("retail_rates", []);
      const res = await app.fetch(
        makeRequest("/api/rates/retail?product_type=15yr_fixed", withAuth()),
        env as any,
        {} as any
      );
      expect(res.status).toBe(200);
    });
  });

  // ─── Rate Comparison ───

  describe("GET /api/rates/compare", () => {
    test("returns comparison object with wholesale and retail sections", async () => {
      env.DB.mockAll("wholesale_rates", [
        { rate: 6.5, apr: 6.625, points: 0, lender_name: "UWM" },
      ]);
      env.DB.mockAll("retail_rates", [
        { rate: 7.25, apr: 7.4, points: 0, lender_name: "Chase" },
      ]);
      const res = await app.fetch(makeRequest("/api/rates/compare", withAuth()), env as any, {} as any);
      expect(res.status).toBe(200);
      const body = await res.json() as any;
      expect(body.product_type).toBe("30yr_fixed");
      expect(body.wholesale).toBeDefined();
      expect(body.retail).toBeDefined();
      expect(body.savings).toBeDefined();
    });

    test("accepts product_type query param", async () => {
      env.DB.mockAll("wholesale_rates", []);
      env.DB.mockAll("retail_rates", []);
      const res = await app.fetch(
        makeRequest("/api/rates/compare?product_type=15yr_fixed", withAuth()),
        env as any,
        {} as any
      );
      expect(res.status).toBe(200);
      const body = await res.json() as any;
      expect(body.product_type).toBe("15yr_fixed");
    });
  });

  // ─── Lead Enrichment ───

  describe("POST /api/enrich", () => {
    test("returns 400 when lead_id is missing", async () => {
      const res = await app.fetch(
        makeRequest("/api/enrich", {
          ...withAuth({ method: "POST" }),
          body: JSON.stringify({ full_name: "John Doe" }),
        }),
        env as any,
        {} as any
      );
      expect(res.status).toBe(400);
      const body = await res.json() as any;
      expect(body.error).toContain("lead_id");
    });

    test("returns 400 when full_name is missing", async () => {
      const res = await app.fetch(
        makeRequest("/api/enrich", {
          ...withAuth({ method: "POST" }),
          body: JSON.stringify({ lead_id: "lead-1" }),
        }),
        env as any,
        {} as any
      );
      expect(res.status).toBe(400);
    });

    test("returns enrichment result on success", async () => {
      const res = await app.fetch(
        makeRequest("/api/enrich", {
          ...withAuth({ method: "POST" }),
          body: JSON.stringify({ lead_id: "lead-1", full_name: "Jane Smith" }),
        }),
        env as any,
        {} as any
      );
      expect(res.status).toBe(200);
      const body = await res.json() as any;
      expect(body.success).toBe(true);
    });
  });

  // ─── Manual Crawl Trigger ───

  describe("POST /api/crawl/:category", () => {
    test("triggers wholesale crawl", async () => {
      const res = await app.fetch(
        makeRequest("/api/crawl/wholesale", withAuth({ method: "POST" })),
        env as any,
        {} as any
      );
      expect(res.status).toBe(200);
      const body = await res.json() as any;
      expect(body.jobId).toBe("job-ws-1");
    });

    test("triggers retail crawl via 'retail_rates' alias", async () => {
      const res = await app.fetch(
        makeRequest("/api/crawl/retail_rates", withAuth({ method: "POST" })),
        env as any,
        {} as any
      );
      expect(res.status).toBe(200);
      const body = await res.json() as any;
      expect(body.jobId).toBe("job-ret-1");
    });

    test("triggers dpa crawl via 'dpa' alias", async () => {
      const res = await app.fetch(
        makeRequest("/api/crawl/dpa", withAuth({ method: "POST" })),
        env as any,
        {} as any
      );
      expect(res.status).toBe(200);
      const body = await res.json() as any;
      expect(body.jobId).toBe("job-dpa-1");
    });

    test("triggers regulatory crawl", async () => {
      const res = await app.fetch(
        makeRequest("/api/crawl/regulatory", withAuth({ method: "POST" })),
        env as any,
        {} as any
      );
      expect(res.status).toBe(200);
      const body = await res.json() as any;
      expect(body.jobId).toBe("job-reg-1");
    });

    test("returns 400 for unknown category", async () => {
      const res = await app.fetch(
        makeRequest("/api/crawl/unknown_thing", withAuth({ method: "POST" })),
        env as any,
        {} as any
      );
      expect(res.status).toBe(400);
      const body = await res.json() as any;
      expect(body.error).toContain("unknown_thing");
    });
  });

  // ─── DPA Match ───

  describe("GET /api/dpa/match", () => {
    test("returns 400 when state param is missing", async () => {
      const res = await app.fetch(makeRequest("/api/dpa/match", withAuth()), env as any, {} as any);
      expect(res.status).toBe(400);
      const body = await res.json() as any;
      expect(body.error).toContain("state");
    });

    test("returns matching programs for a state", async () => {
      env.DB.mockAll("dpa_programs", [
        {
          id: "p1",
          program_name: "FL First",
          state: "FL",
          assistance_type: "grant",
          assistance_amount_max: 15000,
          loan_types_compatible: "[]",
        },
      ]);
      env.AI.setDefaultResponse({ response: "You qualify for FL First down payment assistance." });
      const res = await app.fetch(
        makeRequest("/api/dpa/match?state=FL&fico=700&income=80000&first_time_buyer=true", withAuth()),
        env as any,
        {} as any
      );
      expect(res.status).toBe(200);
      const body = await res.json() as any;
      expect(body.state).toBe("FL");
      expect(typeof body.matching_programs).toBe("number");
      expect(Array.isArray(body.programs)).toBe(true);
    });

    test("filters programs by loan_type compatibility", async () => {
      env.DB.mockAll("dpa_programs", [
        { id: "p1", program_name: "FHA Only", state: "CA", loan_types_compatible: '["FHA"]', assistance_amount_max: 10000 },
        { id: "p2", program_name: "All Types", state: "CA", loan_types_compatible: "[]", assistance_amount_max: 5000 },
      ]);
      env.AI.setDefaultResponse({ response: "Summary here" });
      const res = await app.fetch(
        makeRequest("/api/dpa/match?state=CA&loan_type=Conventional", withAuth()),
        env as any,
        {} as any
      );
      expect(res.status).toBe(200);
      const body = await res.json() as any;
      // Only "All Types" should match Conventional
      expect(body.matching_programs).toBe(1);
    });

    test("returns search criteria in response", async () => {
      env.DB.mockAll("dpa_programs", []);
      const res = await app.fetch(
        makeRequest("/api/dpa/match?state=TX&fico=720", withAuth()),
        env as any,
        {} as any
      );
      const body = await res.json() as any;
      expect(body.search_criteria.state).toBe("TX");
      expect(body.search_criteria.fico).toBe(720);
    });
  });

  // ─── DPA Programs List ───

  describe("GET /api/dpa/programs", () => {
    test("returns all active programs", async () => {
      env.DB.mockAll("dpa_programs", [
        { id: "p1", state: "CA", program_name: "CalHFA", program_status: "active" },
        { id: "p2", state: "TX", program_name: "TDHCA", program_status: "active" },
      ]);
      const res = await app.fetch(makeRequest("/api/dpa/programs", withAuth()), env as any, {} as any);
      expect(res.status).toBe(200);
      const body = await res.json() as any;
      expect(body.count).toBe(2);
      expect(body.programs).toHaveLength(2);
    });

    test("filters by state when provided", async () => {
      env.DB.mockAll("dpa_programs", [
        { id: "p1", state: "FL", program_name: "FL First", program_status: "active" },
      ]);
      const res = await app.fetch(
        makeRequest("/api/dpa/programs?state=FL", withAuth()),
        env as any,
        {} as any
      );
      expect(res.status).toBe(200);
    });
  });

  // ─── Regulatory Feed ───

  describe("GET /api/regulatory/feed", () => {
    test("returns updates array with count and period", async () => {
      env.DB.mockAll("regulatory_updates", [
        { id: "r1", source: "CFPB", title: "New HMDA rule", relevance_score: 8 },
      ]);
      const res = await app.fetch(makeRequest("/api/regulatory/feed", withAuth()), env as any, {} as any);
      expect(res.status).toBe(200);
      const body = await res.json() as any;
      expect(typeof body.count).toBe("number");
      expect(typeof body.period_days).toBe("number");
      expect(Array.isArray(body.updates)).toBe(true);
    });

    test("accepts source filter", async () => {
      env.DB.mockAll("regulatory_updates", []);
      const res = await app.fetch(
        makeRequest("/api/regulatory/feed?source=FHA&days=7", withAuth()),
        env as any,
        {} as any
      );
      expect(res.status).toBe(200);
      const body = await res.json() as any;
      expect(body.period_days).toBe(7);
    });
  });

  // ─── Regulatory Alerts ───

  describe("GET /api/regulatory/alerts", () => {
    test("returns high-priority alerts", async () => {
      env.DB.mockAll("regulatory_updates", [
        { id: "r1", source: "FHFA", relevance_score: 9, title: "Loan limit increase" },
      ]);
      const res = await app.fetch(makeRequest("/api/regulatory/alerts", withAuth()), env as any, {} as any);
      expect(res.status).toBe(200);
      const body = await res.json() as any;
      expect(typeof body.alert_count).toBe("number");
      expect(body.min_relevance_score).toBe(7); // default
    });

    test("accepts custom min_score", async () => {
      env.DB.mockAll("regulatory_updates", []);
      const res = await app.fetch(
        makeRequest("/api/regulatory/alerts?min_score=9", withAuth()),
        env as any,
        {} as any
      );
      expect(res.status).toBe(200);
      const body = await res.json() as any;
      expect(body.min_relevance_score).toBe(9);
    });
  });

  // ─── Regulatory Impact ───

  describe("GET /api/regulatory/impact", () => {
    test("returns 400 when loan_type is missing", async () => {
      const res = await app.fetch(makeRequest("/api/regulatory/impact", withAuth()), env as any, {} as any);
      expect(res.status).toBe(400);
      const body = await res.json() as any;
      expect(body.error).toContain("loan_type");
    });

    test("returns impacting updates for a loan type", async () => {
      env.DB.mockAll("regulatory_updates", [
        { id: "r1", affects_loan_types: '["FHA"]', affects_states: "[]", title: "FHA update" },
      ]);
      const res = await app.fetch(
        makeRequest("/api/regulatory/impact?loan_type=FHA", withAuth()),
        env as any,
        {} as any
      );
      expect(res.status).toBe(200);
      const body = await res.json() as any;
      expect(body.loan_type).toBe("FHA");
      expect(typeof body.impacting_updates).toBe("number");
    });

    test("filters by state when provided", async () => {
      env.DB.mockAll("regulatory_updates", [
        { id: "r1", affects_loan_types: "[]", affects_states: '["CA"]', title: "CA only" },
        { id: "r2", affects_loan_types: "[]", affects_states: "[]", title: "National" },
      ]);
      const res = await app.fetch(
        makeRequest("/api/regulatory/impact?loan_type=Conventional&state=TX", withAuth()),
        env as any,
        {} as any
      );
      expect(res.status).toBe(200);
      const body = await res.json() as any;
      // CA-only should be filtered out, national should remain
      expect(body.impacting_updates).toBe(1);
    });
  });

  // ─── Crawl Jobs ───

  describe("GET /api/jobs", () => {
    test("returns jobs list", async () => {
      env.DB.mockAll("crawl_jobs", [
        { id: "job-1", category: "wholesale", status: "completed", created_at: "2025-01-01" },
      ]);
      const res = await app.fetch(makeRequest("/api/jobs", withAuth()), env as any, {} as any);
      expect(res.status).toBe(200);
      const body = await res.json() as any;
      expect(Array.isArray(body.jobs)).toBe(true);
    });

    test("accepts category filter", async () => {
      env.DB.mockAll("crawl_jobs", []);
      const res = await app.fetch(
        makeRequest("/api/jobs?category=wholesale&limit=5", withAuth()),
        env as any,
        {} as any
      );
      expect(res.status).toBe(200);
    });
  });

  // ─── Credits ───

  describe("GET /api/credits", () => {
    test("returns credit balance information", async () => {
      env.DB.mockAll("credit_ledger", [
        { category: "wholesale", total: 500 },
        { category: "retail", total: 200 },
      ]);
      env.DB.mockFirst("monthly_total", { monthly_total: 700 });
      const res = await app.fetch(makeRequest("/api/credits", withAuth()), env as any, {} as any);
      expect(res.status).toBe(200);
      const body = await res.json() as any;
      expect(typeof body.credits_remaining).toBe("number");
      expect(body.credits_total).toBe(80_000);
      expect(Array.isArray(body.usage_by_category)).toBe(true);
    });

    test("returns N/A for months_remaining when no burn rate", async () => {
      env.DB.mockAll("credit_ledger", []);
      env.DB.mockFirst("monthly_total", { monthly_total: 0 });
      const res = await app.fetch(makeRequest("/api/credits", withAuth()), env as any, {} as any);
      const body = await res.json() as any;
      expect(body.months_remaining).toBe("N/A");
    });
  });

  // ─── Rate Limiting ───

  describe("rate limiting", () => {
    test("returns 429 when enrich rate limit is exceeded", async () => {
      // Pre-seed KV with counter at limit (10)
      const window = Math.floor(Math.floor(Date.now() / 1000) / 60);
      await env.CACHE.put(`ratelimit:enrich:${API_KEY}:${window}`, "10");

      const res = await app.fetch(
        makeRequest("/api/enrich", {
          ...withAuth({ method: "POST" }),
          body: JSON.stringify({ lead_id: "l1", full_name: "Jane" }),
        }),
        env as any,
        {} as any
      );
      expect(res.status).toBe(429);
      const body = await res.json() as any;
      expect(body.error).toContain("Rate limit");
    });

    test("allows enrich request when under limit", async () => {
      // KV is empty → counter starts at 0 → first request should pass (validation error, not 429)
      const res = await app.fetch(
        makeRequest("/api/enrich", {
          ...withAuth({ method: "POST" }),
          body: JSON.stringify({ lead_id: "l1", full_name: "Jane" }),
        }),
        env as any,
        {} as any
      );
      // Should hit the handler (200 success from mock), not a 429
      expect(res.status).not.toBe(429);
    });

    test("returns 429 when crawl rate limit is exceeded", async () => {
      // Pre-seed KV with crawl counter at limit (5 per hour)
      const window = Math.floor(Math.floor(Date.now() / 1000) / 3600);
      await env.CACHE.put(`ratelimit:crawl:${API_KEY}:${window}`, "5");

      const res = await app.fetch(
        makeRequest("/api/crawl/wholesale", withAuth({ method: "POST" })),
        env as any,
        {} as any
      );
      expect(res.status).toBe(429);
      const body = await res.json() as any;
      expect(body.error).toContain("Rate limit");
    });
  });
});
