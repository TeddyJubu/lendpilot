import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
  rateRowToWire,
  syncContactEnrichmentToConvex,
  syncPropertyEnrichmentToConvex,
  syncRatesToConvex,
  type RateSnapshotWire,
} from "../convex-sync";
import type { Env } from "../../types";

function makeEnv(overrides: Partial<Env> = {}): Env {
  return {
    DB: {} as any,
    STORAGE: {} as any,
    BROWSER: {} as any,
    AI: {} as any,
    CACHE: {} as any,
    ENVIRONMENT: "test",
    CREDIT_BUDGET_MONTHLY: "1000",
    ALERT_WEBHOOK_URL: "",
    ADMIN_API_KEY: "",
    BROKER_WEBHOOK_SECRET: "",
    CONVEX_URL: "https://example.convex.site",
    CONVEX_INGESTION_SECRET: "secret-token",
    ...overrides,
  };
}

function makeWire(overrides: Partial<RateSnapshotWire> = {}): RateSnapshotWire {
  const now = Date.now();
  return {
    lenderId: "uwm",
    lenderName: "United Wholesale Mortgage",
    productType: "30yr_fixed",
    rate: 6.25,
    apr: 6.412,
    points: 0,
    lockPeriodDays: 30,
    ltvMin: 0,
    ltvMax: 80,
    ficoMin: 720,
    ficoMax: 850,
    loanAmountMin: 0,
    loanAmountMax: 1_500_000,
    propertyType: "SFR",
    occupancy: "Primary",
    effectiveDate: now,
    expirationDate: now + 24 * 3600_000,
    crawledAt: now,
    source: "wholesale",
    ...overrides,
  };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("worker / sync / convex-sync", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let fetchSpy: any;

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, "fetch");
    vi.useFakeTimers();
  });

  afterEach(() => {
    fetchSpy.mockRestore();
    vi.useRealTimers();
  });

  describe("syncRatesToConvex", () => {
    test("returns empty result when records list is empty", async () => {
      const result = await syncRatesToConvex(makeEnv(), [], { source: "x" });
      expect(result.success).toBe(true);
      expect(result.batchesSent).toBe(0);
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    test("skips when CONVEX_URL is not configured", async () => {
      const env = makeEnv({ CONVEX_URL: "" });
      const result = await syncRatesToConvex(env, [makeWire()], {
        source: "x",
      });
      expect(result.success).toBe(false);
      expect(result.errors[0]).toMatch(/not configured/);
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    test("POSTs records with Bearer auth and tallies created/skipped", async () => {
      fetchSpy.mockResolvedValue(jsonResponse({ created: 2, skipped: 0 }));

      const result = await syncRatesToConvex(
        makeEnv(),
        [makeWire(), makeWire({ lenderId: "rocket" })],
        { source: "wholesale_rates" }
      );

      expect(result.success).toBe(true);
      expect(result.batchesSent).toBe(1);
      expect(result.recordsCreated).toBe(2);
      expect(fetchSpy).toHaveBeenCalledTimes(1);

      const [url, init] = fetchSpy.mock.calls[0];
      expect(url).toBe("https://example.convex.site/ingestRates");
      expect((init as RequestInit).method).toBe("POST");
      const headers = (init as RequestInit).headers as Record<string, string>;
      expect(headers.Authorization).toBe("Bearer secret-token");
      const body = JSON.parse((init as RequestInit).body as string);
      expect(body.records).toHaveLength(2);
      expect(body.syncMeta.source).toBe("wholesale_rates");
    });

    test("splits payloads exceeding the 100-record batch cap", async () => {
      // Fresh Response per call — Response bodies are single-use.
      fetchSpy.mockImplementation(async () =>
        jsonResponse({ created: 1, skipped: 0 })
      );
      const records = Array.from({ length: 250 }, (_, i) =>
        makeWire({ lenderId: `l-${i}` })
      );

      const result = await syncRatesToConvex(makeEnv(), records, {
        source: "x",
      });

      expect(fetchSpy).toHaveBeenCalledTimes(3);
      expect(result.batchesSent).toBe(3);
      expect(result.recordsSent).toBe(250);
      // Three batch responses of 1 created each.
      expect(result.recordsCreated).toBe(3);
    });

    test("surfaces errors from 4xx responses without retry", async () => {
      fetchSpy.mockResolvedValue(
        jsonResponse({ error: "Missing `records`" }, 400)
      );

      const result = await syncRatesToConvex(makeEnv(), [makeWire()], {
        source: "x",
      });

      expect(result.success).toBe(false);
      expect(result.errors[0]).toMatch(/Missing `records`|HTTP 400/);
      expect(fetchSpy).toHaveBeenCalledTimes(1); // no retry on 4xx
    });

    test("retries on 5xx and eventually succeeds", async () => {
      fetchSpy
        .mockResolvedValueOnce(jsonResponse({ error: "boom" }, 500))
        .mockResolvedValueOnce(jsonResponse({ created: 1, skipped: 0 }));

      const pending = syncRatesToConvex(makeEnv(), [makeWire()], {
        source: "x",
      });
      // Advance past the first backoff (500ms).
      await vi.advanceTimersByTimeAsync(500);
      const result = await pending;

      expect(result.success).toBe(true);
      expect(result.recordsCreated).toBe(1);
      expect(fetchSpy).toHaveBeenCalledTimes(2);
    });

    test("gives up after MAX_RETRIES on persistent 5xx", async () => {
      fetchSpy.mockImplementation(async () =>
        jsonResponse({ error: "boom" }, 503)
      );

      const pending = syncRatesToConvex(makeEnv(), [makeWire()], {
        source: "x",
      });
      // 500 + 1000 + 2000 + 4000 = 7500ms of backoff.
      await vi.advanceTimersByTimeAsync(10_000);
      const result = await pending;

      expect(result.success).toBe(false);
      expect(fetchSpy).toHaveBeenCalledTimes(5); // initial + 4 retries
      expect(result.errors[0]).toMatch(/HTTP 503/);
    });
  });

  describe("syncPropertyEnrichmentToConvex", () => {
    test("sends the payload and reports updated=true", async () => {
      fetchSpy.mockResolvedValue(jsonResponse({ success: true, updated: true }));
      const result = await syncPropertyEnrichmentToConvex(makeEnv(), {
        loanId: "loan-123",
        estimatedValue: 450_000,
      });
      expect(result.success).toBe(true);
      expect(result.recordsSkipped).toBe(0);
      const [url] = fetchSpy.mock.calls[0];
      expect(url).toBe("https://example.convex.site/ingestPropertyEnrichment");
    });

    test("reports skipped when loan id was unknown (updated=false)", async () => {
      fetchSpy.mockResolvedValue(
        jsonResponse({ success: true, updated: false })
      );
      const result = await syncPropertyEnrichmentToConvex(makeEnv(), {
        loanId: "loan-missing",
      });
      expect(result.success).toBe(true);
      expect(result.recordsSkipped).toBe(1);
    });
  });

  describe("syncContactEnrichmentToConvex", () => {
    test("sends the payload to /ingestContactEnrichment", async () => {
      fetchSpy.mockResolvedValue(jsonResponse({ success: true, updated: true }));
      await syncContactEnrichmentToConvex(makeEnv(), {
        contactId: "contact-1",
        jobTitle: "Engineer",
      });
      const [url] = fetchSpy.mock.calls[0];
      expect(url).toBe("https://example.convex.site/ingestContactEnrichment");
    });
  });

  describe("rateRowToWire", () => {
    test("maps a D1 wholesale row to the wire format", () => {
      const wire = rateRowToWire(
        {
          lender_id: "uwm",
          product_type: "30yr_fixed",
          rate: 6.25,
          apr: 6.412,
          points: 0,
          lock_period_days: 30,
          ltv_min: 0,
          ltv_max: 80,
          fico_min: 700,
          fico_max: 850,
          loan_amount_min: 0,
          loan_amount_max: 1_500_000,
          property_type: "SFR",
          occupancy: "Primary",
          comp_to_broker_bps: 125,
          crawled_at: "2026-04-22T10:00:00.000Z",
        },
        "UWM",
        "wholesale"
      );
      expect(wire).not.toBeNull();
      expect(wire!.lenderId).toBe("uwm");
      expect(wire!.lenderName).toBe("UWM");
      expect(wire!.rate).toBe(6.25);
      expect(wire!.source).toBe("wholesale");
      expect(wire!.crawledAt).toBe(
        Date.parse("2026-04-22T10:00:00.000Z")
      );
      // Wholesale TTL is 12h.
      expect(wire!.expirationDate - wire!.crawledAt).toBe(12 * 3600_000);
    });

    test("uses advertised_rate/advertised_apr for retail rows", () => {
      const wire = rateRowToWire(
        {
          lender_id: "chase",
          product_type: "30yr_fixed",
          advertised_rate: 6.75,
          advertised_apr: 6.85,
          points: 0,
          property_type: "SFR",
          occupancy: "Primary",
          crawled_at: Date.now(),
        },
        "Chase",
        "retail"
      );
      expect(wire).not.toBeNull();
      expect(wire!.rate).toBe(6.75);
      expect(wire!.apr).toBe(6.85);
      expect(wire!.source).toBe("retail");
      // Retail TTL is 24h.
      expect(wire!.expirationDate - wire!.crawledAt).toBe(24 * 3600_000);
    });

    test("returns null when rate or APR is unreadable", () => {
      expect(
        rateRowToWire(
          { lender_id: "x", product_type: "30yr_fixed" },
          "X",
          "wholesale"
        )
      ).toBeNull();
    });

    test("fills in sensible defaults for missing optional fields", () => {
      const wire = rateRowToWire(
        {
          lender_id: "x",
          product_type: "30yr_fixed",
          rate: 6.25,
          apr: 6.25,
          crawled_at: Date.now(),
        },
        "X",
        "wholesale"
      );
      expect(wire).not.toBeNull();
      expect(wire!.points).toBe(0);
      expect(wire!.lockPeriodDays).toBe(30);
      expect(wire!.ficoMin).toBe(300);
      expect(wire!.ficoMax).toBe(850);
      expect(wire!.ltvMin).toBe(0);
      expect(wire!.ltvMax).toBe(125);
      expect(wire!.propertyType).toBe("SFR");
      expect(wire!.occupancy).toBe("Primary");
    });
  });
});
