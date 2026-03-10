import { describe, test, expect, beforeEach } from "vitest";
import {
  createCrawlJob,
  updateCrawlJob,
  getCreditsRemaining,
  logCredits,
  getActiveLenders,
  insertWholesaleRate,
  insertRetailRate,
  upsertPropertyEnrichment,
  queryBestWholesaleRates,
} from "../queries";
import { createMockD1, MockD1Database } from "../../test/mocks/d1";

let db: MockD1Database;

beforeEach(() => {
  db = createMockD1();
});

// ─── createCrawlJob ───

describe("createCrawlJob", () => {
  test("inserts a crawl job and returns an ID string", async () => {
    const id = await createCrawlJob(db as any, "wholesale_rates", "scheduled", 10);

    expect(typeof id).toBe("string");
    expect(id.length).toBeGreaterThan(0);
  });

  test("issues an INSERT statement against crawl_jobs", async () => {
    await createCrawlJob(db as any, "retail_rates", "manual", 5);

    const sqls = db.preparedSqls;
    expect(sqls.some((sql) => sql.includes("crawl_jobs"))).toBe(true);
    expect(sqls.some((sql) => sql.toLowerCase().includes("insert"))).toBe(true);
  });

  test("passes category to the statement", async () => {
    await createCrawlJob(db as any, "dpa_programs", "scheduled", 3);

    const stmt = db.preparedStatements.find((s) =>
      s.sql.includes("crawl_jobs")
    );
    const params = stmt?.statement.capturedParams.flat();
    expect(params).toContain("dpa_programs");
  });

  test("passes trigger_type to the statement", async () => {
    await createCrawlJob(db as any, "wholesale_rates", "on_demand", 1);

    const stmt = db.preparedStatements.find((s) =>
      s.sql.includes("crawl_jobs")
    );
    const params = stmt?.statement.capturedParams.flat();
    expect(params).toContain("on_demand");
  });
});

// ─── updateCrawlJob ───

describe("updateCrawlJob", () => {
  test("issues an UPDATE statement against crawl_jobs", async () => {
    await updateCrawlJob(db as any, "job-123", { status: "completed" });

    const sqls = db.preparedSqls;
    expect(sqls.some((sql) => sql.includes("UPDATE crawl_jobs"))).toBe(true);
  });

  test("passes the job ID to the statement", async () => {
    await updateCrawlJob(db as any, "job-abc", { urls_completed: 5 });

    const stmt = db.preparedStatements.find((s) =>
      s.sql.includes("UPDATE crawl_jobs")
    );
    const params = stmt?.statement.capturedParams.flat();
    expect(params).toContain("job-abc");
  });

  test("includes completed_at when status is 'completed'", async () => {
    await updateCrawlJob(db as any, "job-1", { status: "completed" });

    const stmt = db.preparedStatements.find((s) =>
      s.sql.includes("UPDATE crawl_jobs")
    );
    expect(stmt?.sql).toContain("completed_at");
  });

  test("includes completed_at when status is 'failed'", async () => {
    await updateCrawlJob(db as any, "job-2", { status: "failed" });

    const stmt = db.preparedStatements.find((s) =>
      s.sql.includes("UPDATE crawl_jobs")
    );
    expect(stmt?.sql).toContain("completed_at");
  });

  test("does not include completed_at when status is 'running'", async () => {
    await updateCrawlJob(db as any, "job-3", { status: "running" });

    const stmt = db.preparedStatements.find((s) =>
      s.sql.includes("UPDATE crawl_jobs")
    );
    expect(stmt?.sql).not.toContain("completed_at");
  });

  test("handles multiple fields in one update", async () => {
    await updateCrawlJob(db as any, "job-4", {
      status: "completed",
      urls_completed: 10,
      credits_used: 5,
      records_created: 50,
    });

    const stmt = db.preparedStatements.find((s) =>
      s.sql.includes("UPDATE crawl_jobs")
    );
    const sql = stmt?.sql ?? "";
    expect(sql).toContain("urls_completed");
    expect(sql).toContain("credits_used");
    expect(sql).toContain("records_created");
  });
});

// ─── getCreditsRemaining ───

describe("getCreditsRemaining", () => {
  test("returns 80000 when no credits have been used", async () => {
    db.mockFirst("SUM(credits_used)", { total_used: 0 });

    const remaining = await getCreditsRemaining(db as any);
    expect(remaining).toBe(80_000);
  });

  test("subtracts used credits from 80000 budget", async () => {
    db.mockFirst("SUM(credits_used)", { total_used: 1000 });

    const remaining = await getCreditsRemaining(db as any);
    expect(remaining).toBe(79_000);
  });

  test("returns 80000 when no ledger entries exist (null result)", async () => {
    db.mockFirst("SUM(credits_used)", null);

    const remaining = await getCreditsRemaining(db as any);
    expect(remaining).toBe(80_000);
  });

  test("queries the credit_ledger table", async () => {
    db.mockFirst("SUM(credits_used)", { total_used: 0 });
    await getCreditsRemaining(db as any);

    expect(db.preparedSqls.some((sql) => sql.includes("credit_ledger"))).toBe(true);
  });
});

// ─── logCredits ───

describe("logCredits", () => {
  test("inserts into credit_ledger", async () => {
    db.mockFirst("SUM(credits_used)", { total_used: 5_000 });

    await logCredits(db as any, "job-1", "wholesale_rates", 10);

    const sqls = db.preparedSqls;
    expect(sqls.some((sql) => sql.includes("credit_ledger"))).toBe(true);
    expect(
      sqls.some((sql) => sql.toLowerCase().includes("insert") && sql.includes("credit_ledger"))
    ).toBe(true);
  });

  test("calculates balance_after correctly", async () => {
    db.mockFirst("SUM(credits_used)", { total_used: 10_000 });
    // remaining = 70_000, creditsUsed = 500 → balance_after = 69_500

    await logCredits(db as any, "job-1", "retail_rates", 500);

    const stmt = db.preparedStatements.find((s) =>
      s.sql.includes("credit_ledger") && s.sql.toLowerCase().includes("insert")
    );
    const params = stmt?.statement.capturedParams.flat();
    expect(params).toContain(69_500);
  });

  test("passes category to the ledger entry", async () => {
    db.mockFirst("SUM(credits_used)", { total_used: 0 });

    await logCredits(db as any, "job-2", "dpa_programs", 20);

    const stmt = db.preparedStatements.find((s) =>
      s.sql.includes("credit_ledger") && s.sql.toLowerCase().includes("insert")
    );
    const params = stmt?.statement.capturedParams.flat();
    expect(params).toContain("dpa_programs");
  });
});

// ─── getActiveLenders ───

describe("getActiveLenders", () => {
  test("queries lenders table for active records", async () => {
    db.mockAll("lenders", []);
    await getActiveLenders(db as any);

    expect(db.preparedSqls.some((sql) => sql.includes("lenders"))).toBe(true);
    expect(
      db.preparedSqls.some((sql) => sql.includes("is_active"))
    ).toBe(true);
  });

  test("filters by type when provided", async () => {
    db.mockAll("lenders", []);
    await getActiveLenders(db as any, "wholesale");

    const stmt = db.preparedStatements.find((s) => s.sql.includes("lenders"));
    const params = stmt?.statement.capturedParams.flat();
    expect(params).toContain("wholesale");
  });

  test("does not filter by type when omitted", async () => {
    db.mockAll("lenders", []);
    await getActiveLenders(db as any);

    const stmt = db.preparedStatements.find((s) => s.sql.includes("lenders"));
    const params = stmt?.statement.capturedParams.flat();
    expect(params).not.toContain("wholesale");
  });

  test("returns results array", async () => {
    const mockLenders = [
      { id: "1", name: "UWM", type: "wholesale" },
      { id: "2", name: "Rocket TPO", type: "wholesale" },
    ];
    db.mockAll("lenders", mockLenders);

    const result = await getActiveLenders(db as any, "wholesale");
    expect(result).toEqual(mockLenders);
  });
});

// ─── insertWholesaleRate ───

describe("insertWholesaleRate", () => {
  test("inserts into wholesale_rates table", async () => {
    await insertWholesaleRate(db as any, {
      lender_id: "lender-1",
      product_type: "30yr_fixed",
      rate: 6.5,
      apr: 6.625,
      points: 0,
      lock_period_days: 30,
      crawl_job_id: "job-1",
    });

    expect(
      db.preparedSqls.some((sql) => sql.includes("wholesale_rates"))
    ).toBe(true);
    expect(
      db.preparedSqls.some(
        (sql) => sql.toLowerCase().includes("insert") && sql.includes("wholesale_rates")
      )
    ).toBe(true);
  });

  test("passes rate and APR to statement", async () => {
    await insertWholesaleRate(db as any, {
      lender_id: "lender-1",
      product_type: "30yr_fixed",
      rate: 6.75,
      apr: 6.9,
      points: 0.5,
      lock_period_days: 30,
      crawl_job_id: "job-2",
    });

    const stmt = db.preparedStatements.find((s) =>
      s.sql.includes("wholesale_rates")
    );
    const params = stmt?.statement.capturedParams.flat();
    expect(params).toContain(6.75);
    expect(params).toContain(6.9);
  });

  test("uses null for optional fields when not provided", async () => {
    await insertWholesaleRate(db as any, {
      lender_id: "lender-1",
      product_type: "30yr_fixed",
      rate: 7.0,
      apr: 7.1,
      points: 0,
      lock_period_days: 30,
      crawl_job_id: "job-3",
      // no ltv_min, fico_min, etc.
    });

    const stmt = db.preparedStatements.find((s) =>
      s.sql.includes("wholesale_rates")
    );
    const params = stmt?.statement.capturedParams.flat();
    // Nulls should be present for omitted fields
    expect(params).toContain(null);
  });
});

// ─── insertRetailRate ───

describe("insertRetailRate", () => {
  test("inserts into retail_rates table", async () => {
    await insertRetailRate(db as any, {
      lender_id: "chase",
      lender_type: "bank",
      product_type: "30yr_fixed",
      advertised_rate: 7.25,
      advertised_apr: 7.4,
      points: 0,
      source_url: "https://chase.com/mortgage/rates",
      crawl_job_id: "job-1",
    });

    expect(
      db.preparedSqls.some(
        (sql) => sql.toLowerCase().includes("insert") && sql.includes("retail_rates")
      )
    ).toBe(true);
  });

  test("passes advertised_rate to statement", async () => {
    await insertRetailRate(db as any, {
      lender_id: "wells",
      lender_type: "bank",
      product_type: "15yr_fixed",
      advertised_rate: 6.875,
      advertised_apr: 7.0,
      points: 0.25,
      source_url: "https://wellsfargo.com/rates",
      crawl_job_id: "job-2",
    });

    const stmt = db.preparedStatements.find((s) =>
      s.sql.includes("retail_rates")
    );
    const params = stmt?.statement.capturedParams.flat();
    expect(params).toContain(6.875);
  });
});

// ─── upsertPropertyEnrichment ───

describe("upsertPropertyEnrichment", () => {
  test("issues an INSERT OR REPLACE / UPSERT statement", async () => {
    await upsertPropertyEnrichment(db as any, {
      property_address: "123 Main St, Anytown, CA 90210",
      address_normalized: "123 main st anytown ca 90210",
      data_sources: ["zillow", "redfin"],
      crawl_job_id: "job-1",
      cache_expires_at: new Date(Date.now() + 86400_000).toISOString(),
    });

    expect(
      db.preparedSqls.some((sql) => sql.includes("property_enrichments"))
    ).toBe(true);
  });

  test("includes ON CONFLICT clause for deduplication", async () => {
    await upsertPropertyEnrichment(db as any, {
      property_address: "456 Oak Ave",
      address_normalized: "456 oak ave",
      data_sources: ["zillow"],
      crawl_job_id: "job-2",
      cache_expires_at: new Date().toISOString(),
    });

    const stmt = db.preparedStatements.find((s) =>
      s.sql.includes("property_enrichments")
    );
    expect(stmt?.sql).toContain("ON CONFLICT");
  });

  test("serializes data_sources as JSON string", async () => {
    await upsertPropertyEnrichment(db as any, {
      property_address: "789 Elm Dr",
      address_normalized: "789 elm dr",
      data_sources: ["zillow", "redfin", "realtor"],
      crawl_job_id: "job-3",
      cache_expires_at: new Date().toISOString(),
    });

    const stmt = db.preparedStatements.find((s) =>
      s.sql.includes("property_enrichments")
    );
    const params = stmt?.statement.capturedParams.flat();
    expect(params).toContain(JSON.stringify(["zillow", "redfin", "realtor"]));
  });
});

// ─── queryBestWholesaleRates ───

describe("queryBestWholesaleRates", () => {
  test("queries wholesale_rates table joined with lenders", async () => {
    db.mockAll("wholesale_rates", []);
    await queryBestWholesaleRates(db as any, {});

    const sqls = db.preparedSqls;
    expect(sqls.some((sql) => sql.includes("wholesale_rates"))).toBe(true);
    expect(sqls.some((sql) => sql.includes("lenders"))).toBe(true);
  });

  test("orders by rate ASC", async () => {
    db.mockAll("wholesale_rates", []);
    await queryBestWholesaleRates(db as any, {});

    const stmt = db.preparedStatements.find((s) =>
      s.sql.includes("wholesale_rates")
    );
    expect(stmt?.sql).toContain("ORDER BY wr.rate ASC");
  });

  test("filters by product_type when provided", async () => {
    db.mockAll("wholesale_rates", []);
    await queryBestWholesaleRates(db as any, { product_type: "30yr_fixed" });

    const stmt = db.preparedStatements.find((s) =>
      s.sql.includes("wholesale_rates")
    );
    const params = stmt?.statement.capturedParams.flat();
    expect(params).toContain("30yr_fixed");
  });

  test("filters by FICO range when provided", async () => {
    db.mockAll("wholesale_rates", []);
    await queryBestWholesaleRates(db as any, { fico: 720 });

    const stmt = db.preparedStatements.find((s) =>
      s.sql.includes("wholesale_rates")
    );
    const params = stmt?.statement.capturedParams.flat();
    expect(params).toContain(720);
    expect(stmt?.sql).toContain("fico_min");
    expect(stmt?.sql).toContain("fico_max");
  });

  test("filters by LTV range when provided", async () => {
    db.mockAll("wholesale_rates", []);
    await queryBestWholesaleRates(db as any, { ltv: 80 });

    const stmt = db.preparedStatements.find((s) =>
      s.sql.includes("wholesale_rates")
    );
    const params = stmt?.statement.capturedParams.flat();
    expect(params).toContain(80);
  });

  test("filters by loan_amount when provided", async () => {
    db.mockAll("wholesale_rates", []);
    await queryBestWholesaleRates(db as any, { loan_amount: 500_000 });

    const stmt = db.preparedStatements.find((s) =>
      s.sql.includes("wholesale_rates")
    );
    const params = stmt?.statement.capturedParams.flat();
    expect(params).toContain(500_000);
  });

  test("applies default limit of 20", async () => {
    db.mockAll("wholesale_rates", []);
    await queryBestWholesaleRates(db as any, {});

    const stmt = db.preparedStatements.find((s) =>
      s.sql.includes("wholesale_rates")
    );
    const params = stmt?.statement.capturedParams.flat();
    expect(params).toContain(20);
  });

  test("respects custom limit", async () => {
    db.mockAll("wholesale_rates", []);
    await queryBestWholesaleRates(db as any, { limit: 5 });

    const stmt = db.preparedStatements.find((s) =>
      s.sql.includes("wholesale_rates")
    );
    const params = stmt?.statement.capturedParams.flat();
    expect(params).toContain(5);
  });
});
