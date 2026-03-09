/**
 * Category 2: Retail Competitor Rate Crawler
 *
 * Crawls retail bank/lender websites daily for their advertised consumer rates.
 * Enables the killer feature: "Chase charges 6.75%, I can get you 6.25%."
 *
 * These are public pages — no auth needed, so we use simple fetch + AI extraction.
 */

import type { Env } from "../types";
import { simpleFetch, scrapeUrl, extractStructured } from "../utils/browser-scraper";
import {
  createCrawlJob,
  updateCrawlJob,
  getActiveLenders,
  insertRetailRate,
  logCredits,
  getCreditsRemaining,
} from "../db/queries";
import { isValidRate, sleep } from "../utils/helpers";

const RETAIL_EXTRACTION_SCHEMA = {
  type: "object",
  properties: {
    lender_name: { type: "string" },
    rates: {
      type: "array",
      items: {
        type: "object",
        properties: {
          product_type: { type: "string" },
          rate: { type: "number" },
          apr: { type: "number" },
          points: { type: "number" },
          assumptions_fico: { type: "integer" },
          assumptions_ltv: { type: "number" },
          assumptions_loan_amount: { type: "integer" },
        },
      },
    },
    last_updated: { type: "string" },
  },
};

const EXTRACTION_PROMPT = `Extract the lender name and ALL advertised mortgage rates from this page.

For each rate, capture:
- product_type: one of "30yr_fixed", "15yr_fixed", "20yr_fixed", "ARM_5_1", "ARM_7_1", "FHA_30yr", "VA_30yr", "Jumbo_30yr"
- rate: the interest rate (e.g., 6.750)
- apr: the APR (e.g., 6.892)
- points: discount points if shown
- assumptions_fico: the FICO score used in their example (if stated)
- assumptions_ltv: the LTV assumed (if stated)
- assumptions_loan_amount: the loan amount assumed (if stated)

Also extract the date these rates were last updated if shown on the page.
Return the lender_name as shown on the page.`;

/** Sites that need JS rendering (React/Angular SPAs) */
const JS_HEAVY_SITES = ["better.com", "sofi.com", "rate.com", "loandepot.com"];

function needsBrowserRendering(url: string): boolean {
  return JS_HEAVY_SITES.some((site) => url.includes(site));
}

export async function crawlRetailRates(env: Env): Promise<{
  jobId: string;
  success: boolean;
  recordsCreated: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let recordsCreated = 0;
  let urlsCompleted = 0;
  let urlsFailed = 0;

  // Credit check
  const creditsRemaining = await getCreditsRemaining(env.DB);
  if (creditsRemaining < 50) {
    return {
      jobId: "",
      success: false,
      recordsCreated: 0,
      errors: ["Insufficient credits: " + creditsRemaining],
    };
  }

  // Get retail lenders (type = retail, online, credit_union)
  const allLenders = await getActiveLenders(env.DB);
  const retailLenders = (allLenders as any[]).filter(
    (l) => l.type === "retail" || l.type === "online" || l.type === "credit_union"
  );

  if (!retailLenders.length) {
    return {
      jobId: "",
      success: false,
      recordsCreated: 0,
      errors: ["No retail lenders configured"],
    };
  }

  const jobId = await createCrawlJob(
    env.DB,
    "retail_rates",
    "scheduled",
    retailLenders.length
  );

  for (const lender of retailLenders) {
    const url = lender.retail_rates_url;
    if (!url) {
      urlsFailed++;
      errors.push(`No retail URL for ${lender.name}`);
      continue;
    }

    try {
      // Choose scraping method based on site
      const scraped = needsBrowserRendering(url)
        ? await scrapeUrl(url, env, { timeout: 15_000 })
        : await simpleFetch(url);

      if (scraped.error || !scraped.text) {
        errors.push(`Scrape failed for ${lender.name}: ${scraped.error}`);
        urlsFailed++;
        continue;
      }

      // Extract with Workers AI
      const extracted = await extractStructured<{
        lender_name: string;
        rates: Array<{
          product_type: string;
          rate: number;
          apr: number;
          points: number;
          assumptions_fico?: number;
          assumptions_ltv?: number;
          assumptions_loan_amount?: number;
        }>;
        last_updated?: string;
      }>(scraped.text, env, {
        prompt: EXTRACTION_PROMPT,
        schema: RETAIL_EXTRACTION_SCHEMA,
      });

      if (!extracted.success || !extracted.data?.rates?.length) {
        errors.push(
          `Extraction failed for ${lender.name}: ${extracted.error ?? "No rates found"}`
        );
        urlsFailed++;
        continue;
      }

      // Insert valid rates
      for (const rate of extracted.data.rates) {
        if (!isValidRate(rate.rate)) {
          errors.push(`Invalid rate ${rate.rate} from ${lender.name}`);
          continue;
        }

        await insertRetailRate(env.DB, {
          lender_id: lender.id,
          lender_type: lender.type,
          product_type: rate.product_type,
          advertised_rate: rate.rate,
          advertised_apr: rate.apr ?? rate.rate,
          points: rate.points ?? 0,
          estimated_fees: undefined,
          assumptions_fico: rate.assumptions_fico,
          assumptions_ltv: rate.assumptions_ltv,
          assumptions_loan_amount: rate.assumptions_loan_amount,
          source_url: url,
          crawl_job_id: jobId,
        });
        recordsCreated++;
      }

      urlsCompleted++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      errors.push(`Error crawling ${lender.name}: ${msg}`);
      urlsFailed++;
    }

    await sleep(1000); // Be polite to retail sites
  }

  // Finalize
  const creditsUsed = retailLenders.length;
  const status = urlsFailed > retailLenders.length * 0.5 ? "partial" : "completed";

  await updateCrawlJob(env.DB, jobId, {
    status,
    urls_completed: urlsCompleted,
    urls_failed: urlsFailed,
    credits_used: creditsUsed,
    records_created: recordsCreated,
    error_log: errors.length > 0 ? errors.join("\n") : undefined,
  });

  await logCredits(env.DB, jobId, "retail_rates", creditsUsed);

  return { jobId, success: true, recordsCreated, errors };
}
