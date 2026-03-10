import { describe, test, expect, beforeEach, vi } from "vitest";

// Mock crawlers before importing the Worker entry point
vi.mock("../crawlers/wholesale-rates", () => ({
  crawlWholesaleRates: vi.fn().mockResolvedValue({
    success: true,
    jobId: "ws-job",
    recordsCreated: 3,
    errors: [],
  }),
}));

vi.mock("../crawlers/retail-rates", () => ({
  crawlRetailRates: vi.fn().mockResolvedValue({
    success: true,
    jobId: "ret-job",
    recordsCreated: 2,
    errors: [],
  }),
}));

vi.mock("../crawlers/dpa-programs", () => ({
  crawlDPAPrograms: vi.fn().mockResolvedValue({
    success: true,
    jobId: "dpa-job",
    recordsCreated: 1,
    recordsUpdated: 0,
    errors: [],
  }),
}));

vi.mock("../crawlers/regulatory-updates", () => ({
  crawlRegulatoryUpdates: vi.fn().mockResolvedValue({
    success: true,
    jobId: "reg-job",
    recordsCreated: 5,
    highPriorityCount: 0,
    errors: [],
  }),
}));

vi.mock("../crawlers/lead-enrichment", () => ({
  enrichLead: vi.fn().mockResolvedValue({
    success: true,
    leadId: "lead-1",
    propertyEnriched: true,
    personEnriched: false,
    errors: [],
    fromCache: false,
  }),
}));

import worker from "../index";
import { createMockEnv, setupHealthyCredits, setupLowCredits } from "../test/mocks/env";
import type { MockEnv } from "../test/mocks/env";
import { crawlWholesaleRates } from "../crawlers/wholesale-rates";
import { crawlRetailRates } from "../crawlers/retail-rates";
import { crawlDPAPrograms } from "../crawlers/dpa-programs";
import { crawlRegulatoryUpdates } from "../crawlers/regulatory-updates";
import { enrichLead } from "../crawlers/lead-enrichment";

/** Build a mock ExecutionContext that collects waitUntil promises */
function makeCtx(): { ctx: ExecutionContext; promises: Promise<unknown>[] } {
  const promises: Promise<unknown>[] = [];
  const ctx = { waitUntil: (p: Promise<unknown>) => promises.push(p) } as unknown as ExecutionContext;
  return { ctx, promises };
}

/** Build a ScheduledEvent-like object for a given UTC hour and day-of-week */
function makeScheduledEvent(hour: number, dayOfWeek = 0): ScheduledEvent {
  // dayOfWeek: 0 = Sunday … 6 = Saturday
  const now = new Date();
  // Construct a date at the requested UTC hour on a specific weekday
  const d = new Date(Date.UTC(2025, 0, 5 + dayOfWeek, hour, 0, 0)); // Jan 5 2025 = Sunday
  return { scheduledTime: d.getTime(), cron: "0 * * * *", noRetry: () => {} } as unknown as ScheduledEvent;
}

/**
 * Generate a valid HMAC-SHA256 hex signature for the given payload
 * using the test secret "test-webhook-secret".
 */
async function signPayload(payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode("test-webhook-secret"),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// ─────────────────────────────────────────────
// Scheduled handler tests
// ─────────────────────────────────────────────

describe("scheduled handler", () => {
  let env: MockEnv;

  beforeEach(() => {
    env = createMockEnv();
    vi.clearAllMocks();
  });

  test("skips all crawls when credits are critically low (< 50)", async () => {
    setupLowCredits(env, 30);
    const { ctx, promises } = makeCtx();
    await worker.scheduled(makeScheduledEvent(2), env as any, ctx);
    expect(promises).toHaveLength(0);
    expect(crawlWholesaleRates).not.toHaveBeenCalled();
  });

  test("dispatches wholesale crawl at hour 2", async () => {
    setupHealthyCredits(env);
    const { ctx, promises } = makeCtx();
    await worker.scheduled(makeScheduledEvent(2), env as any, ctx);
    expect(promises.length).toBeGreaterThan(0);
    await Promise.all(promises);
    expect(crawlWholesaleRates).toHaveBeenCalledWith(env);
  });

  test("dispatches wholesale crawl at hours 6, 10, 14, 18, 22", async () => {
    for (const hour of [6, 10, 14, 18, 22]) {
      vi.clearAllMocks();
      setupHealthyCredits(env);
      const { ctx, promises } = makeCtx();
      await worker.scheduled(makeScheduledEvent(hour), env as any, ctx);
      await Promise.all(promises);
      expect(crawlWholesaleRates).toHaveBeenCalled();
    }
  });

  test("dispatches retail crawl at hour 10", async () => {
    setupHealthyCredits(env);
    const { ctx, promises } = makeCtx();
    await worker.scheduled(makeScheduledEvent(10), env as any, ctx);
    await Promise.all(promises);
    expect(crawlRetailRates).toHaveBeenCalledWith(env);
  });

  test("does NOT dispatch retail crawl at hour 2", async () => {
    setupHealthyCredits(env);
    const { ctx, promises } = makeCtx();
    await worker.scheduled(makeScheduledEvent(2), env as any, ctx);
    await Promise.all(promises);
    expect(crawlRetailRates).not.toHaveBeenCalled();
  });

  test("dispatches regulatory crawl at hour 11", async () => {
    setupHealthyCredits(env);
    const { ctx, promises } = makeCtx();
    await worker.scheduled(makeScheduledEvent(11), env as any, ctx);
    await Promise.all(promises);
    expect(crawlRegulatoryUpdates).toHaveBeenCalledWith(env);
  });

  test("dispatches DPA crawl on Monday at hour 12 (dayOfWeek=1)", async () => {
    setupHealthyCredits(env);
    const { ctx, promises } = makeCtx();
    // dayOfWeek=1 → Monday (Jan 6, 2025 = Monday)
    await worker.scheduled(makeScheduledEvent(12, 1), env as any, ctx);
    await Promise.all(promises);
    expect(crawlDPAPrograms).toHaveBeenCalledWith(env);
  });

  test("does NOT dispatch DPA crawl on non-Monday at hour 12", async () => {
    setupHealthyCredits(env);
    const { ctx, promises } = makeCtx();
    // dayOfWeek=3 → Wednesday
    await worker.scheduled(makeScheduledEvent(12, 3), env as any, ctx);
    await Promise.all(promises);
    expect(crawlDPAPrograms).not.toHaveBeenCalled();
  });

  test("does NOT dispatch DPA crawl on Monday at wrong hour", async () => {
    setupHealthyCredits(env);
    const { ctx, promises } = makeCtx();
    // Monday but hour=2 (wholesale only)
    await worker.scheduled(makeScheduledEvent(2, 1), env as any, ctx);
    await Promise.all(promises);
    expect(crawlDPAPrograms).not.toHaveBeenCalled();
  });

  test("dispatches multiple crawls when hour matches multiple triggers (hour 10 = wholesale + retail)", async () => {
    setupHealthyCredits(env);
    const { ctx, promises } = makeCtx();
    await worker.scheduled(makeScheduledEvent(10), env as any, ctx);
    await Promise.all(promises);
    expect(crawlWholesaleRates).toHaveBeenCalled();
    expect(crawlRetailRates).toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────
// Fetch handler routing tests
// ─────────────────────────────────────────────

describe("fetch handler", () => {
  let env: MockEnv;

  beforeEach(() => {
    env = createMockEnv();
    setupHealthyCredits(env);
    vi.clearAllMocks();
  });

  test("routes /api/health to Hono API (no auth needed)", async () => {
    const { ctx } = makeCtx();
    const req = new Request("http://localhost/api/health");
    const res = await worker.fetch(req, env as any, ctx);
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.status).toBe("ok");
  });

  test("routes /api/* requests through auth middleware (rejects missing key)", async () => {
    const { ctx } = makeCtx();
    const req = new Request("http://localhost/api/credits");
    const res = await worker.fetch(req, env as any, ctx);
    expect(res.status).toBe(401);
  });

  test("routes webhook path to webhook handler (rejects missing signature)", async () => {
    const { ctx } = makeCtx();
    const req = new Request("http://localhost/webhook/lead-created", {
      method: "POST",
      body: JSON.stringify({ lead_id: "l1", full_name: "Jane" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await worker.fetch(req, env as any, ctx);
    expect(res.status).toBe(401);
    const body = await res.json() as any;
    expect(body.error).toContain("signature");
  });

  test("GET to webhook path goes to Hono (404 from Hono)", async () => {
    const { ctx } = makeCtx();
    const req = new Request("http://localhost/webhook/lead-created", { method: "GET" });
    const res = await worker.fetch(req, env as any, ctx);
    // Hono returns 404 for unregistered routes
    expect(res.status).toBe(404);
  });
});

// ─────────────────────────────────────────────
// Webhook handler tests
// ─────────────────────────────────────────────

describe("webhook /webhook/lead-created", () => {
  let env: MockEnv;

  beforeEach(() => {
    env = createMockEnv();
    vi.clearAllMocks();
  });

  test("returns 401 when signature header is missing", async () => {
    const { ctx } = makeCtx();
    const req = new Request("http://localhost/webhook/lead-created", {
      method: "POST",
      body: JSON.stringify({ lead_id: "l1", full_name: "Jane" }),
    });
    const res = await worker.fetch(req, env as any, ctx);
    expect(res.status).toBe(401);
  });

  test("returns 401 when signature is invalid", async () => {
    const { ctx } = makeCtx();
    const req = new Request("http://localhost/webhook/lead-created", {
      method: "POST",
      body: JSON.stringify({ lead_id: "l1", full_name: "Jane" }),
      headers: { "X-Webhook-Signature": "deadbeefdeadbeef" },
    });
    const res = await worker.fetch(req, env as any, ctx);
    expect(res.status).toBe(401);
    const body = await res.json() as any;
    expect(body.error).toContain("Invalid signature");
  });

  test("returns 202 and queues enrichment when signature is valid", async () => {
    const payload = JSON.stringify({
      lead_id: "lead-abc",
      full_name: "John Borrower",
      property_address: "123 Main St",
    });
    const sig = await signPayload(payload);

    const { ctx, promises } = makeCtx();
    const req = new Request("http://localhost/webhook/lead-created", {
      method: "POST",
      body: payload,
      headers: { "X-Webhook-Signature": sig, "Content-Type": "application/json" },
    });

    const res = await worker.fetch(req, env as any, ctx);
    expect(res.status).toBe(202);
    const body = await res.json() as any;
    expect(body.accepted).toBe(true);
    expect(body.message).toContain("queued");
  });

  test("background enrichment is queued via ctx.waitUntil", async () => {
    const payload = JSON.stringify({ lead_id: "lead-xyz", full_name: "Alice B" });
    const sig = await signPayload(payload);

    const { ctx, promises } = makeCtx();
    const req = new Request("http://localhost/webhook/lead-created", {
      method: "POST",
      body: payload,
      headers: { "X-Webhook-Signature": sig },
    });

    await worker.fetch(req, env as any, ctx);

    // waitUntil should have captured the enrichment promise
    expect(promises.length).toBeGreaterThan(0);

    // Resolve the background work
    await Promise.all(promises);
    expect(enrichLead).toHaveBeenCalled();
  });
});
