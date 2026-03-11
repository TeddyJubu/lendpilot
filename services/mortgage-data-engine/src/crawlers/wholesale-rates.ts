/**
 * Category 1: Wholesale Rate Sheet Crawler
 *
 * Crawls wholesale lender rate sheets every 4 hours.
 * Uses Cloudflare Browser Rendering + Workers AI to replace Firecrawl.
 *
 * Flow:
 * 1. Fetch active wholesale lenders from DB
 * 2. For each lender, scrape their rate sheet page
 * 3. Use Workers AI to extract structured rate data
 * 4. Validate and insert into wholesale_rates table
 * 5. Track credits and report results
 */

import type { Env, CrawlStatus } from "../types";
import { scrapeUrl, simpleFetch, extractStructured } from "../utils/browser-scraper";
import {
  createCrawlJob,
  updateCrawlJob,
  getActiveLenders,
  insertWholesaleRate,
  logCredits,
  getCreditsRemaining,
} from "../db/queries";
import { isValidRate, isValidApr, isValidFico, sleep } from "../utils/helpers";

/** The extraction schema for wholesale rates — sent to Workers AI */
const WHOLESALE_EXTRACTION_SCHEMA = {
  type: "object",
  properties: {
    rates: {
      type: "array",
      items: {
        type: "object",
        properties: {
          product_type: { type: "string" },
          rate: { type: "number" },
          apr: { type: "number" },
          points: { type: "number" },
          lock_period_days: { type: "integer" },
          ltv_min: { type: "number" },
          ltv_max: { type: "number" },
          fico_min: { type: "integer" },
          fico_max: { type: "integer" },
          loan_amount_min: { type: "integer" },
          loan_amount_max: { type: "integer" },
          property_type: { type: "string" },
          occupancy: { type: "string" },
          comp_to_broker_bps: { type: "integer" },
        },
      },
    },
  },
};

const EXTRACTION_PROMPT = `Extract ALL mortgage rate offerings from this rate sheet page.

For each rate row, capture:
- product_type: one of "30yr_fixed", "15yr_fixed", "20yr_fixed", "ARM_5_1", "ARM_7_1", "ARM_10_1", "FHA_30yr", "VA_30yr", "USDA_30yr", "Jumbo_30yr"
- rate: the interest rate as a decimal (e.g., 6.250)
- apr: the APR as a decimal (e.g., 6.412)
- points: discount points or rebate (negative = rebate, e.g., -1.0)
- lock_period_days: 15, 30, 45, or 60
- ltv_min/ltv_max: LTV range (e.g., 0 to 80)
- fico_min/fico_max: FICO score range (e.g., 720 to 850)
- loan_amount_min/loan_amount_max: loan amount range
- property_type: "SFR", "Condo", "Multi_2_4", or "Manufactured"
- occupancy: "Primary", "Second_Home", or "Investment"
- comp_to_broker_bps: broker compensation in basis points

If a field is not shown on the page, omit it. Return as many rates as you can find.`;

export async function crawlWholesaleRates(env: Env): Promise<{
  jobId: string;
  success: boolean;
  recordsCreated: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let recordsCreated = 0;
  let urlsCompleted = 0;
  let urlsFailed = 0;

  // 1. Check credit budget
  const creditsRemaining = await getCreditsRemaining(env.DB);
  if (creditsRemaining < 100) {
    return {
      jobId: "",
      success: false,
      recordsCreated: 0,
      errors: ["Insufficient credits remaining: " + creditsRemaining],
    };
  }

  // 2. Get active wholesale lenders
  const lenders = await getActiveLenders(env.DB, "wholesale");
  if (!lenders.length) {
    return {
      jobId: "",
      success: false,
      recordsCreated: 0,
      errors: ["No active wholesale lenders found"],
    };
  }

  // 3. Create crawl job
  const jobId = await createCrawlJob(
    env.DB,
    "wholesale_rates",
    "scheduled",
    lenders.length
  );

  // 4. Crawl each lender
  for (const lender of lenders) {
    const lenderData = lender as any;
    const config = JSON.parse(lenderData.crawl_config || "{}");
    const url = lenderData.tpo_portal_url;

    if (!url) {
      errors.push(`No URL for lender ${lenderData.name}`);
      urlsFailed++;
      continue;
    }

    try {
      // Scrape the page — use simple fetch for public pages,
      // browser rendering for JS-heavy sites
      const scraped = config.requires_auth
        ? await scrapeUrl(url, env) // Browser rendering for auth-required sites
        : await simpleFetch(url); // Simple fetch for public rate aggregators

      if (scraped.error || !scraped.text) {
        errors.push(`Scrape failed for ${lenderData.name}: ${scraped.error}`);
        urlsFailed++;
        continue;
      }

      // Extract structured rates using Workers AI
      const extracted = await extractStructured<{
        rates: Array<{
          product_type: string;
          rate: number;
          apr: number;
          points: number;
          lock_period_days: number;
          ltv_min?: number;
          ltv_max?: number;
          fico_min?: number;
          fico_max?: number;
          loan_amount_min?: number;
          loan_amount_max?: number;
          property_type?: string;
          occupancy?: string;
          comp_to_broker_bps?: number;
        }>;
      }>(scraped.text, env, {
        prompt: EXTRACTION_PROMPT,
        schema: WHOLESALE_EXTRACTION_SCHEMA,
      });

      if (!extracted.success || !extracted.data?.rates?.length) {
        errors.push(
          `Extraction failed for ${lenderData.name}: ${extracted.error ?? "No rates found"}`
        );
        urlsFailed++;
        continue;
      }

      // Insert valid rates
      for (const rate of extracted.data.rates) {
        // Data quality checks
        if (!isValidRate(rate.rate)) {
          errors.push(
            `Invalid rate ${rate.rate} from ${lenderData.name} — skipped`
          );
          continue;
        }
        if (rate.apr && !isValidApr(rate.rate, rate.apr)) {
          errors.push(
            `APR ${rate.apr} < rate ${rate.rate} from ${lenderData.name} — skipped`
          );
          continue;
        }
        if (rate.fico_min && !isValidFico(rate.fico_min)) continue;
        if (rate.fico_max && !isValidFico(rate.fico_max)) continue;

        await insertWholesaleRate(env.DB, {
          lender_id: lenderData.id,
          product_type: rate.product_type,
          rate: rate.rate,
          apr: rate.apr ?? rate.rate,
          points: rate.points ?? 0,
          lock_period_days: rate.lock_period_days ?? 30,
          ltv_min: rate.ltv_min,
          ltv_max: rate.ltv_max,
          fico_min: rate.fico_min,
          fico_max: rate.fico_max,
          loan_amount_min: rate.loan_amount_min,
          loan_amount_max: rate.loan_amount_max,
          property_type: rate.property_type,
          occupancy: rate.occupancy,
          comp_to_broker_bps: rate.comp_to_broker_bps,
          crawl_job_id: jobId,
        });
        recordsCreated++;
      }

      urlsCompleted++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      errors.push(`Error crawling ${lenderData.name}: ${msg}`);
      urlsFailed++;
    }

    // Rate limit: small delay between lenders
    await sleep(500);
  }

  // 5. Finalize job
  const creditsUsed = lenders.length; // 1 credit per lender (approximate)
  const status: CrawlStatus =
    urlsFailed === 0
      ? "completed"
      : urlsFailed > lenders.length * 0.2
        ? "partial"
        : "completed";

  await updateCrawlJob(env.DB, jobId, {
    status,
    urls_completed: urlsCompleted,
    urls_failed: urlsFailed,
    credits_used: creditsUsed,
    records_created: recordsCreated,
    error_log: errors.length > 0 ? errors.join("\n") : undefined,
  });

  await logCredits(env.DB, jobId, "wholesale_rates", creditsUsed);

  return {
    jobId,
    // `status` is currently computed as completed|partial, but keep the success predicate
    // future-proof for when the crawler can mark the job as failed.
    success: status === "completed" || status === "partial",
    recordsCreated,
    errors,
  };
}
