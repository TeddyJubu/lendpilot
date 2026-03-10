/**
 * Browser Scraper — Cloudflare Browser Rendering wrapper
 *
 * This replaces Firecrawl's scrape/extract functionality using
 * Cloudflare's built-in Browser Rendering + Workers AI.
 *
 * Flow:
 * 1. Launch headless browser via Cloudflare Browser Rendering
 * 2. Navigate to URL, wait for content
 * 3. Extract page HTML/text
 * 4. Pass to Workers AI for structured extraction
 */

import type { Env } from "../types";
import { sleep } from "./helpers";

/** Exponential backoff delays (ms) for network-error retries */
const RETRY_DELAYS = [2_000, 4_000, 8_000];

/**
 * Retry a scrape function up to RETRY_DELAYS.length additional times.
 * Only retries on network errors (statusCode === 0). HTTP errors are returned as-is.
 */
async function retryOnNetworkError<T extends { statusCode: number }>(
  fn: () => Promise<T>
): Promise<T> {
  let result = await fn();
  for (let i = 0; i < RETRY_DELAYS.length && result.statusCode === 0; i++) {
    await sleep(RETRY_DELAYS[i]);
    result = await fn();
  }
  return result;
}

export interface ScrapeResult {
  url: string;
  html: string;
  text: string;
  title: string;
  statusCode: number;
  error?: string;
}

export interface ExtractOptions {
  /** The prompt telling the AI what to extract */
  prompt: string;
  /** Optional JSON schema for structured output */
  schema?: Record<string, unknown>;
  /** Which AI model to use — defaults to llama for cost efficiency */
  model?: string;
}

/**
 * Scrape a URL using Cloudflare Browser Rendering.
 *
 * Uses the Browser Rendering REST API (no puppeteer dependency needed
 * for basic page fetches — puppeteer is available for complex interactions).
 * Retries up to 3 times on network errors with exponential backoff (2s, 4s, 8s).
 */
export async function scrapeUrl(
  url: string,
  env: Env,
  options?: { waitForSelector?: string; timeout?: number }
): Promise<ScrapeResult> {
  const timeout = options?.timeout ?? 30_000;

  return retryOnNetworkError(async () => {
    try {
      // Cloudflare Browser Rendering REST API endpoint
      // Docs: https://developers.cloudflare.com/browser-rendering/rest-api/
      const endpoint = `https://browser-rendering.cloudflare.com/content`;

      const response = await env.BROWSER.fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url,
          // Return both rendered HTML and extracted text
          rewriteLinksAbsoluteUrl: true,
          waitUntil: "networkidle0",
          ...(options?.waitForSelector && {
            gotoOptions: { waitUntil: "networkidle0", timeout },
          }),
        }),
      });

      if (!response.ok) {
        return {
          url,
          html: "",
          text: "",
          title: "",
          statusCode: response.status,
          error: `Browser rendering failed: ${response.status} ${response.statusText}`,
        };
      }

      const html = await response.text();

      // Extract text content from HTML (simple extraction)
      const text = htmlToText(html);
      const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i);
      const title = titleMatch ? titleMatch[1].trim() : "";

      return { url, html, text, title, statusCode: 200 };
    } catch (error) {
      return {
        url,
        html: "",
        text: "",
        title: "",
        statusCode: 0,
        error: error instanceof Error ? error.message : "Unknown scrape error",
      };
    }
  });
}

/**
 * Scrape a URL using a simple fetch (for sites that don't need JS rendering).
 * Much cheaper — no browser rendering credits used.
 * Retries up to 3 times on network errors with exponential backoff (2s, 4s, 8s).
 */
export async function simpleFetch(url: string): Promise<ScrapeResult> {
  return retryOnNetworkError(async () => {
    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
        },
      });

      const html = await response.text();
      const text = htmlToText(html);
      const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i);
      const title = titleMatch ? titleMatch[1].trim() : "";

      return { url, html, text, title, statusCode: response.status };
    } catch (error) {
      return {
        url,
        html: "",
        text: "",
        title: "",
        statusCode: 0,
        error: error instanceof Error ? error.message : "Fetch failed",
      };
    }
  });
}

/**
 * Extract structured data from HTML/text using Workers AI.
 *
 * This replaces Firecrawl's `extract` endpoint.
 * Uses Llama 3.1 8B for cost efficiency (covered by Cloudflare credits).
 */
export async function extractStructured<T>(
  content: string,
  env: Env,
  options: ExtractOptions
): Promise<{ success: boolean; data: T | null; error?: string }> {
  const model = options.model ?? "@cf/meta/llama-3.1-8b-instruct";

  // Truncate content to fit context window (~6K tokens for safety)
  const maxChars = 24_000;
  const truncatedContent =
    content.length > maxChars ? content.slice(0, maxChars) + "\n[...truncated]" : content;

  const systemPrompt = options.schema
    ? `You are a data extraction assistant. Extract the requested information and return it as valid JSON matching this schema:\n${JSON.stringify(options.schema, null, 2)}\n\nReturn ONLY valid JSON. No explanations, no markdown code blocks.`
    : `You are a data extraction assistant. Extract the requested information and return it as valid JSON. Return ONLY valid JSON. No explanations, no markdown code blocks.`;

  try {
    const response = await env.AI.run(model as any, {
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `${options.prompt}\n\n--- PAGE CONTENT ---\n${truncatedContent}`,
        },
      ],
      max_tokens: 4096,
      temperature: 0.1, // Low temp for extraction accuracy
    });

    // Parse the AI response
    const responseText =
      typeof response === "string"
        ? response
        : (response as any)?.response ?? JSON.stringify(response);

    // Try to extract JSON from the response
    const jsonMatch = responseText.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    if (!jsonMatch) {
      return {
        success: false,
        data: null,
        error: "AI response did not contain valid JSON",
      };
    }

    const parsed = JSON.parse(jsonMatch[0]) as T;
    return { success: true, data: parsed };
  } catch (error) {
    return {
      success: false,
      data: null,
      error: error instanceof Error ? error.message : "Extraction failed",
    };
  }
}

/**
 * Archive raw scraped HTML to R2 for audit trail and historical comparison.
 * Key format: `crawls/{category}/{YYYY-MM-DD}/{url-slug}.html`
 */
export async function archiveToR2(
  env: Env,
  category: string,
  url: string,
  html: string
): Promise<void> {
  try {
    const date = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const slug = url.replace(/[^a-z0-9]/gi, "-").slice(0, 80);
    const key = `crawls/${category}/${date}/${slug}.html`;
    await env.STORAGE.put(key, html, {
      httpMetadata: { contentType: "text/html" },
      customMetadata: { sourceUrl: url, crawledAt: new Date().toISOString() },
    });
  } catch {
    // Archival is best-effort — never block the crawl
  }
}

/**
 * Batch scrape multiple URLs with concurrency control.
 * Returns results as they complete.
 */
export async function batchScrape(
  urls: string[],
  env: Env,
  options?: { concurrency?: number; useSimpleFetch?: boolean }
): Promise<ScrapeResult[]> {
  const concurrency = options?.concurrency ?? 3;
  const results: ScrapeResult[] = [];

  for (let i = 0; i < urls.length; i += concurrency) {
    const batch = urls.slice(i, i + concurrency);
    const batchResults = await Promise.allSettled(
      batch.map((url) =>
        options?.useSimpleFetch ? simpleFetch(url) : scrapeUrl(url, env)
      )
    );

    for (const result of batchResults) {
      if (result.status === "fulfilled") {
        results.push(result.value);
      } else {
        results.push({
          url: batch[batchResults.indexOf(result)] ?? "unknown",
          html: "",
          text: "",
          title: "",
          statusCode: 0,
          error: result.reason?.message ?? "Request failed",
        });
      }
    }

    // Small delay between batches to avoid rate limiting
    if (i + concurrency < urls.length) {
      await sleep(1000);
    }
  }

  return results;
}

/** Strip HTML tags and extract plain text */
function htmlToText(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}
