import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { extractStructured, simpleFetch } from "../browser-scraper";
import type { Env } from "../../types";

function makeEnv(aiResponse: unknown): Env {
  const run = vi.fn().mockResolvedValue(aiResponse);
  return {
    DB: {} as any,
    STORAGE: {} as any,
    BROWSER: {} as any,
    AI: { run } as any,
    CACHE: {} as any,
    ENVIRONMENT: "test",
    CREDIT_BUDGET_MONTHLY: "1000",
    ALERT_WEBHOOK_URL: "",
    ADMIN_API_KEY: "",
    BROKER_WEBHOOK_SECRET: "",
    CONVEX_URL: "",
    CONVEX_INGESTION_SECRET: "",
  };
}

describe("worker / utils / browser-scraper", () => {
  describe("extractStructured", () => {
    test("parses well-formed JSON from the AI response", async () => {
      const env = makeEnv({ response: '{"rate": 6.25, "apr": 6.4}' });
      const result = await extractStructured<{ rate: number; apr: number }>(
        "any page content",
        env,
        { prompt: "Extract rate and apr" }
      );
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ rate: 6.25, apr: 6.4 });
    });

    test("recovers JSON even when the model wraps it in prose", async () => {
      const env = makeEnv({
        response:
          'Sure, here are the rates:\n```json\n{"rate": 6.5}\n```\nLet me know.',
      });
      const result = await extractStructured<{ rate: number }>(
        "page",
        env,
        { prompt: "Extract rate" }
      );
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ rate: 6.5 });
    });

    test("returns an error when the response is not JSON at all", async () => {
      const env = makeEnv({
        response: "I do not have that information.",
      });
      const result = await extractStructured("page", env, {
        prompt: "Extract rate",
      });
      expect(result.success).toBe(false);
      expect(result.data).toBeNull();
      expect(result.error).toMatch(/valid JSON/);
    });

    test("returns an error if the AI call throws", async () => {
      const env: Env = {
        ...makeEnv({}),
        AI: { run: vi.fn().mockRejectedValue(new Error("AI down")) } as any,
      };
      const result = await extractStructured("page", env, { prompt: "x" });
      expect(result.success).toBe(false);
      expect(result.error).toBe("AI down");
    });

    test("truncates overlong input before sending to the model", async () => {
      const runMock = vi.fn().mockResolvedValue({ response: "{}" });
      const env: Env = {
        ...makeEnv({}),
        AI: { run: runMock } as any,
      };
      const bigContent = "a".repeat(30_000);
      await extractStructured(bigContent, env, { prompt: "x" });
      const callArgs = runMock.mock.calls[0][1];
      const userMsg = callArgs.messages.find(
        (m: any) => m.role === "user"
      ).content;
      expect(userMsg).toContain("[...truncated]");
      expect(userMsg.length).toBeLessThan(bigContent.length);
    });
  });

  describe("simpleFetch", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let fetchSpy: any;

    beforeEach(() => {
      fetchSpy = vi.spyOn(globalThis, "fetch");
    });
    afterEach(() => {
      fetchSpy.mockRestore();
    });

    test("strips scripts/styles/tags from fetched HTML", async () => {
      fetchSpy.mockResolvedValue(
        new Response(
          `<html><head><title>Hello</title><style>body{color:red}</style></head>
           <body><script>alert('x')</script><p>Visible <b>text</b></p></body></html>`,
          { status: 200, headers: { "Content-Type": "text/html" } }
        )
      );
      const result = await simpleFetch("https://example.com");
      expect(result.statusCode).toBe(200);
      expect(result.title).toBe("Hello");
      expect(result.text).not.toMatch(/alert/);
      expect(result.text).not.toMatch(/color:red/);
      expect(result.text).toMatch(/Visible text/);
    });

    test("returns an error when fetch rejects", async () => {
      fetchSpy.mockRejectedValue(new Error("network unreachable"));
      const result = await simpleFetch("https://example.com");
      expect(result.statusCode).toBe(0);
      expect(result.error).toBe("network unreachable");
    });
  });
});
