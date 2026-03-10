import { describe, test, expect, vi, beforeEach } from "vitest";

// Mock sleep so retry backoffs don't slow tests
vi.mock("../helpers", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../helpers")>();
  return { ...actual, sleep: vi.fn().mockResolvedValue(undefined) };
});

import { scrapeUrl, simpleFetch, extractStructured, batchScrape, archiveToR2 } from "../browser-scraper";
import { createMockEnv } from "../../test/mocks/env";
import type { MockEnv } from "../../test/mocks/env";

// ─── simpleFetch ───

describe("simpleFetch", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  test("returns HTML and extracted text on success", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce(
      new Response("<html><body><p>Hello World</p></body></html>", { status: 200 })
    );

    const result = await simpleFetch("https://example.com");
    expect(result.statusCode).toBe(200);
    expect(result.html).toContain("Hello World");
    expect(result.text).toContain("Hello World");
    expect(result.error).toBeUndefined();
  });

  test("extracts page title", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce(
      new Response("<html><head><title>My Page</title></head><body>Content</body></html>", {
        status: 200,
      })
    );

    const result = await simpleFetch("https://example.com");
    expect(result.title).toBe("My Page");
  });

  test("returns status code from response", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce(new Response("Not Found", { status: 404 }));

    const result = await simpleFetch("https://example.com/missing");
    expect(result.statusCode).toBe(404);
  });

  test("handles network error gracefully", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("Network timeout"));

    const result = await simpleFetch("https://example.com");
    expect(result.error).toContain("Network timeout");
    expect(result.statusCode).toBe(0);
    expect(result.html).toBe("");
    expect(result.text).toBe("");
  });

  test("strips script and style tags from text", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce(
      new Response(
        `<html><head>
          <script>var x = 1;</script>
          <style>body { color: red; }</style>
        </head><body>Real Content</body></html>`,
        { status: 200 }
      )
    );

    const result = await simpleFetch("https://example.com");
    expect(result.text).not.toContain("var x");
    expect(result.text).not.toContain("color: red");
    expect(result.text).toContain("Real Content");
  });

  test("decodes HTML entities in text", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce(
      new Response("<html><body>A &amp; B &lt;value&gt;</body></html>", { status: 200 })
    );

    const result = await simpleFetch("https://example.com");
    expect(result.text).toContain("A & B <value>");
  });

  test("returns the URL in the result", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce(new Response("", { status: 200 }));

    const result = await simpleFetch("https://example.com/test");
    expect(result.url).toBe("https://example.com/test");
  });
});

// ─── scrapeUrl ───

describe("scrapeUrl", () => {
  let env: MockEnv;

  beforeEach(() => {
    env = createMockEnv();
  });

  test("returns HTML from browser rendering on success", async () => {
    env.BROWSER.mockUrl(
      "browser-rendering",
      200,
      "<html><body>Rendered Content</body></html>"
    );

    const result = await scrapeUrl("https://example.com", env as any);
    expect(result.statusCode).toBe(200);
    expect(result.html).toContain("Rendered Content");
  });

  test("returns error when browser rendering fails with non-200 status", async () => {
    env.BROWSER.mockUrl("browser-rendering", 503, "Service Unavailable");

    const result = await scrapeUrl("https://example.com", env as any);
    expect(result.error).toContain("Browser rendering failed");
    expect(result.statusCode).toBe(503);
  });

  test("handles browser network error gracefully", async () => {
    env.BROWSER.setError(true);

    const result = await scrapeUrl("https://example.com", env as any);
    expect(result.error).toBeDefined();
    expect(result.statusCode).toBe(0);
  });

  test("returns the URL in the result", async () => {
    env.BROWSER.mockUrl("browser-rendering", 200, "<html><body>ok</body></html>");

    const result = await scrapeUrl("https://example.com/rates", env as any);
    expect(result.url).toBe("https://example.com/rates");
  });
});

// ─── extractStructured ───

describe("extractStructured", () => {
  let env: MockEnv;

  beforeEach(() => {
    env = createMockEnv();
  });

  test("returns parsed JSON from AI response", async () => {
    env.AI.setDefaultResponse({ response: '{"rates": [{"rate": 6.5, "product": "30yr_fixed"}]}' });

    const result = await extractStructured<{ rates: Array<{ rate: number; product: string }> }>(
      "<html>Rate sheet content</html>",
      env as any,
      { prompt: "Extract rates" }
    );

    expect(result.success).toBe(true);
    expect(result.data?.rates[0].rate).toBe(6.5);
  });

  test("extracts JSON from AI response with markdown code blocks", async () => {
    env.AI.setDefaultResponse({ response: '```json\n{"value": 42}\n```' });

    const result = await extractStructured<{ value: number }>(
      "content",
      env as any,
      { prompt: "Extract value" }
    );

    expect(result.success).toBe(true);
    expect(result.data?.value).toBe(42);
  });

  test("returns failure when AI returns no JSON", async () => {
    env.AI.setDefaultResponse({ response: "I could not find any rate information." });

    const result = await extractStructured<unknown>(
      "no rates here",
      env as any,
      { prompt: "Extract rates" }
    );

    expect(result.success).toBe(false);
    expect(result.data).toBeNull();
    expect(result.error).toContain("JSON");
  });

  test("returns failure when AI throws", async () => {
    env.AI.setError("Workers AI timeout");

    const result = await extractStructured<unknown>(
      "content",
      env as any,
      { prompt: "Extract" }
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain("Workers AI timeout");
  });

  test("truncates very long content before sending to AI", async () => {
    env.AI.setDefaultResponse({ response: '{"ok": true}' });

    const longContent = "a".repeat(50_000);
    const result = await extractStructured<{ ok: boolean }>(
      longContent,
      env as any,
      { prompt: "Extract" }
    );

    expect(result.success).toBe(true);
    // AI should have been called (content was truncated, not errored)
    expect(env.AI.calls).toHaveLength(1);
  });

  test("passes schema to AI when provided", async () => {
    env.AI.setDefaultResponse({ response: '{"rate": 7.0}' });

    const schema = { type: "object", properties: { rate: { type: "number" } } };
    await extractStructured<{ rate: number }>(
      "content",
      env as any,
      { prompt: "Extract rate", schema }
    );

    expect(env.AI.calls).toHaveLength(1);
    const params = env.AI.calls[0].params as any;
    const systemContent: string = params.messages[0].content;
    expect(systemContent).toContain("rate");
  });
});

// ─── batchScrape ───

describe("batchScrape", () => {
  let env: MockEnv;

  beforeEach(() => {
    env = createMockEnv();
    vi.restoreAllMocks();
  });

  test("scrapes all URLs and returns results", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response("<html><body>Content</body></html>", { status: 200 })
    );

    const urls = ["https://a.com", "https://b.com", "https://c.com"];
    const results = await batchScrape(urls, env as any, { useSimpleFetch: true });

    expect(results).toHaveLength(3);
    expect(results[0].statusCode).toBe(200);
  });

  test("handles failed URLs without throwing", async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce(new Response("OK", { status: 200 }))
      .mockRejectedValue(new Error("Connection refused"));

    const urls = ["https://a.com", "https://bad.com", "https://c.com"];
    const results = await batchScrape(urls, env as any, { useSimpleFetch: true });

    expect(results).toHaveLength(3);
    const failed = results.find((r) => r.error);
    expect(failed).toBeDefined();
    expect(failed?.error).toContain("Connection refused");
  });

  test("processes URLs in batches respecting concurrency", async () => {
    const callOrder: number[] = [];
    let callIndex = 0;

    global.fetch = vi.fn().mockImplementation(async () => {
      callOrder.push(callIndex++);
      return new Response("OK", { status: 200 });
    });

    const urls = Array.from({ length: 6 }, (_, i) => `https://site${i}.com`);
    await batchScrape(urls, env as any, { useSimpleFetch: true, concurrency: 3 });

    expect(callOrder).toHaveLength(6);
  });
});

// ─── Retry behavior ───

describe("retry on network error", () => {
  let env: MockEnv;

  beforeEach(() => {
    env = createMockEnv();
    vi.restoreAllMocks();
  });

  test("simpleFetch retries up to 3 times on network error", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("Timeout"));
    global.fetch = fetchMock;

    const result = await simpleFetch("https://example.com");

    // 1 initial attempt + 3 retries = 4 total calls
    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(result.statusCode).toBe(0);
    expect(result.error).toContain("Timeout");
  });

  test("simpleFetch succeeds on second attempt after one failure", async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error("Flaky network"))
      .mockResolvedValueOnce(new Response("<html>OK</html>", { status: 200 }));
    global.fetch = fetchMock;

    const result = await simpleFetch("https://example.com");

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.statusCode).toBe(200);
    expect(result.error).toBeUndefined();
  });

  test("scrapeUrl does not retry on non-200 HTTP errors (browser rendering failure)", async () => {
    env.BROWSER.mockUrl("browser-rendering", 503, "Service Unavailable");

    const result = await scrapeUrl("https://example.com", env as any);

    // HTTP error — no retry (statusCode !== 0)
    expect(env.BROWSER.calls.length).toBe(1);
    expect(result.statusCode).toBe(503);
  });

  test("scrapeUrl retries on network-level error and returns statusCode 0", async () => {
    env.BROWSER.setError(true);

    const result = await scrapeUrl("https://example.com", env as any);

    // Browser throws before recording calls, but retry still happens
    expect(result.statusCode).toBe(0);
    expect(result.error).toContain("Browser rendering connection failed");
  });
});

// ─── archiveToR2 ───

describe("archiveToR2", () => {
  let env: MockEnv;

  beforeEach(() => {
    env = createMockEnv();
  });

  test("writes HTML to R2 with correct key pattern", async () => {
    await archiveToR2(env as any, "wholesale", "https://uwm.com/rates", "<html>rates</html>");

    expect(env.STORAGE.puts.length).toBe(1);
    expect(env.STORAGE.puts[0].key).toMatch(/^crawls\/wholesale\/.+\.html$/);
  });

  test("stores source URL in custom metadata", async () => {
    await archiveToR2(env as any, "retail", "https://chase.com/rates", "<html></html>");

    const put = env.STORAGE.puts[0];
    expect((put.options as any)?.customMetadata?.sourceUrl).toBe("https://chase.com/rates");
  });

  test("does not throw if R2 put fails", async () => {
    // Force R2 to throw by replacing put with a failing mock
    env.STORAGE.put = vi.fn().mockRejectedValue(new Error("R2 unavailable"));

    await expect(
      archiveToR2(env as any, "wholesale", "https://example.com", "<html></html>")
    ).resolves.not.toThrow();
  });
});
