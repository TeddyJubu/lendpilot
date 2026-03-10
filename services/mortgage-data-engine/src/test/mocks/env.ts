/**
 * Factory for creating a complete mock Env for tests.
 */
import { MockD1Database, createMockD1 } from "./d1";
import { MockKVNamespace, createMockKV } from "./kv";
import { MockR2Bucket, createMockR2 } from "./r2";
import { MockAi, createMockAi } from "./ai";
import { MockBrowserFetcher, createMockBrowser } from "./browser";

export interface MockEnv {
  DB: MockD1Database;
  STORAGE: MockR2Bucket;
  BROWSER: MockBrowserFetcher;
  AI: MockAi;
  CACHE: MockKVNamespace;
  ENVIRONMENT: string;
  CREDIT_BUDGET_MONTHLY: string;
  ALERT_WEBHOOK_URL: string;
  ADMIN_API_KEY: string;
  BROKER_WEBHOOK_SECRET: string;
}

export function createMockEnv(overrides?: Partial<MockEnv>): MockEnv {
  return {
    DB: createMockD1(),
    STORAGE: createMockR2(),
    BROWSER: createMockBrowser(),
    AI: createMockAi(),
    CACHE: createMockKV(),
    ENVIRONMENT: "test",
    CREDIT_BUDGET_MONTHLY: "80000",
    ALERT_WEBHOOK_URL: "",
    ADMIN_API_KEY: "test-admin-key",
    BROKER_WEBHOOK_SECRET: "test-webhook-secret",
    ...overrides,
  };
}

/** Pre-configure DB with enough credits (80000 - 0 used = 80000 remaining) */
export function setupHealthyCredits(env: MockEnv): void {
  env.DB.mockFirst("SUM(credits_used)", { total_used: 0 });
}

/** Pre-configure DB with dangerously low credits */
export function setupLowCredits(env: MockEnv, remaining: number): void {
  const used = 80_000 - remaining;
  env.DB.mockFirst("SUM(credits_used)", { total_used: used });
}

export { MockD1Database, MockKVNamespace, MockR2Bucket, MockAi, MockBrowserFetcher };
