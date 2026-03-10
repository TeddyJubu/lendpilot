/**
 * Mortgage Data Engine — Main Worker Entry Point
 *
 * Architecture: Cloudflare Workers + D1 + Browser Rendering + Workers AI
 * Replaces Firecrawl with self-hosted scraping on Cloudflare's platform.
 *
 * Handles:
 * - HTTP API requests (via Hono router)
 * - Cron-triggered scheduled crawls
 * - Webhook-triggered lead enrichment
 */

import type { Env } from "./types";
import api from "./api/routes";
import { crawlWholesaleRates } from "./crawlers/wholesale-rates";
import { crawlRetailRates } from "./crawlers/retail-rates";
import { crawlDPAPrograms } from "./crawlers/dpa-programs";
import { crawlRegulatoryUpdates } from "./crawlers/regulatory-updates";
import { getCreditsRemaining } from "./db/queries";

export default {
  /**
   * HTTP request handler — routes to Hono API
   */
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    // Handle CRM webhook for lead enrichment
    if (
      request.method === "POST" &&
      new URL(request.url).pathname === "/webhook/lead-created"
    ) {
      return handleLeadWebhook(request, env, ctx);
    }

    // Route all other requests to Hono API
    return api.fetch(request, env, ctx);
  },

  /**
   * Cron trigger handler — scheduled crawls
   *
   * Cron schedule (from wrangler.toml):
   * - Every 4h: Wholesale rates
   * - Daily 6AM ET: Retail rates
   * - Daily 7AM ET: Regulatory updates (P1)
   * - Weekly Mon: DPA programs (P1)
   * - Weekly Wed: Realtor profiles (future P2)
   */
  async scheduled(
    event: ScheduledEvent,
    env: Env,
    ctx: ExecutionContext
  ): Promise<void> {
    const hour = new Date(event.scheduledTime).getUTCHours();
    const dayOfWeek = new Date(event.scheduledTime).getUTCDay();

    // Credit check — skip all crawls if credits are critically low
    const creditsRemaining = await getCreditsRemaining(env.DB);
    if (creditsRemaining < 50) {
      await sendAlert(env, {
        level: "critical",
        message: `Credits critically low: ${creditsRemaining} remaining. All scheduled crawls paused.`,
      });
      return;
    }

    // Determine which crawl to run based on the cron trigger time
    // Every 4 hours: wholesale rates (hours 2, 6, 10, 14, 18, 22 UTC)
    if ([2, 6, 10, 14, 18, 22].includes(hour)) {
      ctx.waitUntil(runWithAlerts(env, "wholesale_rates", crawlWholesaleRates(env)));
    }

    // Daily at 10 UTC (6 AM ET): retail rates
    if (hour === 10) {
      ctx.waitUntil(runWithAlerts(env, "retail_rates", crawlRetailRates(env)));
    }

    // Daily at 11 UTC (7 AM ET): regulatory updates (P1)
    if (hour === 11) {
      ctx.waitUntil(runWithAlerts(env, "regulatory", crawlRegulatoryUpdates(env)));
    }

    // Monday at 12 UTC (8 AM ET): DPA programs (P1)
    if (hour === 12 && dayOfWeek === 1) {
      ctx.waitUntil(runWithAlerts(env, "dpa_programs", crawlDPAPrograms(env)));
    }

    // Future P2 triggers:
    // if (hour === 12 && dayOfWeek === 3) { /* realtor profiles */ }
  },
};

/**
 * Handle CRM webhook for new lead enrichment.
 *
 * Expected POST body:
 * {
 *   lead_id: string,
 *   full_name: string,
 *   property_address?: string,
 *   linkedin_url?: string
 * }
 */
async function handleLeadWebhook(
  request: Request,
  env: Env,
  ctx: ExecutionContext
): Promise<Response> {
  // Verify webhook signature
  const signature = request.headers.get("X-Webhook-Signature");
  if (!signature) {
    return new Response(JSON.stringify({ error: "Missing signature" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Simple HMAC verification
  const body = await request.text();
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(env.BROKER_WEBHOOK_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"]
  );

  const signatureBytes = hexToBytes(signature);
  const isValid = await crypto.subtle.verify(
    "HMAC",
    key,
    signatureBytes,
    encoder.encode(body)
  );

  if (!isValid) {
    return new Response(JSON.stringify({ error: "Invalid signature" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Parse and enrich
  const leadData = JSON.parse(body);
  const { enrichLead } = await import("./crawlers/lead-enrichment");

  // Run enrichment in background (don't block webhook response)
  ctx.waitUntil(
    enrichLead(env, leadData).then(async (result) => {
      if (result.errors.length > 0) {
        await sendAlert(env, {
          level: "warning",
          message: `Lead enrichment for ${leadData.full_name}: ${result.errors.join("; ")}`,
        });
      }
    })
  );

  return new Response(
    JSON.stringify({ accepted: true, message: "Enrichment queued" }),
    { status: 202, headers: { "Content-Type": "application/json" } }
  );
}

/**
 * Run a crawl and send alerts on failure/partial completion.
 */
async function runWithAlerts(
  env: Env,
  category: string,
  crawlPromise: Promise<{ success: boolean; errors: string[]; recordsCreated: number }>
): Promise<void> {
  try {
    const result = await crawlPromise;

    if (!result.success) {
      await sendAlert(env, {
        level: "error",
        message: `${category} crawl failed. Errors: ${result.errors.slice(0, 3).join("; ")}`,
      });
    } else if (result.errors.length > 0) {
      await sendAlert(env, {
        level: "warning",
        message: `${category} crawl completed with ${result.errors.length} warnings. Records: ${result.recordsCreated}`,
      });
    }
  } catch (err) {
    await sendAlert(env, {
      level: "critical",
      message: `${category} crawl threw exception: ${err instanceof Error ? err.message : "Unknown"}`,
    });
  }
}

/**
 * Send alert to configured webhook (Slack/Discord).
 */
async function sendAlert(
  env: Env,
  alert: { level: "info" | "warning" | "error" | "critical"; message: string }
): Promise<void> {
  if (!env.ALERT_WEBHOOK_URL) return;

  const emoji =
    alert.level === "critical"
      ? "🔴"
      : alert.level === "error"
        ? "🟠"
        : alert.level === "warning"
          ? "🟡"
          : "🔵";

  try {
    await fetch(env.ALERT_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: `${emoji} **Mortgage Data Engine** [${alert.level.toUpperCase()}]\n${alert.message}`,
        // Discord format
        content: `${emoji} **Mortgage Data Engine** [${alert.level.toUpperCase()}]\n${alert.message}`,
      }),
    });
  } catch {
    // Alert delivery failure — can't do much about it
  }
}

/**
 * Convert hex string to Uint8Array
 */
function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}
