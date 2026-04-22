/**
 * Category 3: Lead Enrichment Crawler
 *
 * On-demand enrichment triggered when a new lead enters the CRM.
 * Multi-source crawl: Zillow, Redfin, county records, LinkedIn.
 *
 * Includes aggressive caching:
 * - Property data: 24h for listings, 7d for tax/assessment
 * - Person data: 30d
 * - If two brokers have leads on the same property, reuse cached data
 */

import type { Env, EnrichmentRequest } from "../types";
import { simpleFetch, scrapeUrl, extractStructured } from "../utils/browser-scraper";
import {
  createCrawlJob,
  updateCrawlJob,
  upsertPropertyEnrichment,
  logCredits,
} from "../db/queries";
import { normalizeAddress, isValidPropertyValue, addHours, addDays, now } from "../utils/helpers";
import {
  syncContactEnrichmentToConvex,
  syncPropertyEnrichmentToConvex,
} from "../sync/convex-sync";

// ─── Extraction Schemas ───

const PROPERTY_EXTRACTION_PROMPT = `Extract property details from this real estate listing page.

Capture all available fields:
- address: full street address
- estimated_value: estimated market value (Zestimate, Redfin Estimate, etc.)
- bedrooms: number of bedrooms
- bathrooms: number of bathrooms (can be decimal, e.g., 2.5)
- sqft: square footage
- year_built: year the property was built
- lot_size: lot size (convert to acres if given in sqft)
- property_type: "SFR", "Condo", "Townhouse", or "Multi"
- last_sold_price: last sale price
- last_sold_date: date of last sale
- tax_annual: annual property tax amount
- listing_status: "Active", "Pending", "Sold", or "Off-Market"
- listing_price: current listing price (if active)
- days_on_market: how many days on market (if listed)
- hoa_monthly: monthly HOA fee (if applicable)

Return as JSON. Omit fields not found on the page.`;

const PROPERTY_EXTRACTION_SCHEMA = {
  type: "object",
  properties: {
    address: { type: "string" },
    estimated_value: { type: "integer" },
    bedrooms: { type: "integer" },
    bathrooms: { type: "number" },
    sqft: { type: "integer" },
    year_built: { type: "integer" },
    lot_size: { type: "number" },
    property_type: { type: "string" },
    last_sold_price: { type: "integer" },
    last_sold_date: { type: "string" },
    tax_annual: { type: "integer" },
    listing_status: { type: "string" },
    listing_price: { type: "integer" },
    days_on_market: { type: "integer" },
    hoa_monthly: { type: "integer" },
  },
};

const PERSON_EXTRACTION_PROMPT = `Extract professional information from this person's public profile.

Capture:
- job_title: current job title
- employer: current employer/company
- tenure_years: approximate years at current job
- education: highest education level (e.g., "Bachelor's", "Master's", "MBA")

Based on the job title and employer, estimate an income bracket:
- "under_50k", "50k_100k", "100k_150k", "150k_250k", or "over_250k"

Return as JSON.`;

// ─── Property Enrichment Sources ───

function buildZillowUrl(address: string): string {
  const slug = address
    .replace(/[,#]/g, "")
    .replace(/\s+/g, "-")
    .toLowerCase();
  return `https://www.zillow.com/homes/${encodeURIComponent(slug)}_rb/`;
}

function buildRedfinUrl(address: string): string {
  // Redfin uses different URL patterns; this is a search fallback
  return `https://www.redfin.com/search?searchType=address&q=${encodeURIComponent(address)}`;
}

function buildRealtorUrl(address: string): string {
  const slug = address
    .replace(/[,#]/g, "")
    .replace(/\s+/g, "-")
    .toLowerCase();
  return `https://www.realtor.com/realestateandhomes-detail/${encodeURIComponent(slug)}`;
}

// ─── Cache Check ───

async function getCachedProperty(
  db: D1Database,
  addressNormalized: string
): Promise<any | null> {
  const result = await db
    .prepare(
      `SELECT * FROM property_enrichments
       WHERE address_normalized = ? AND cache_expires_at > ?`
    )
    .bind(addressNormalized, now())
    .first();
  return result;
}

async function getCachedPerson(
  db: D1Database,
  leadId: string
): Promise<any | null> {
  const result = await db
    .prepare(
      `SELECT * FROM person_enrichments
       WHERE lead_id = ? AND cache_expires_at > ?`
    )
    .bind(leadId, now())
    .first();
  return result;
}

// ─── Main Enrichment Function ───

export async function enrichLead(
  env: Env,
  request: EnrichmentRequest
): Promise<{
  jobId: string;
  property: any | null;
  person: any | null;
  fromCache: { property: boolean; person: boolean };
  errors: string[];
}> {
  const errors: string[] = [];
  let propertyData: any = null;
  let personData: any = null;
  const fromCache = { property: false, person: false };

  const jobId = await createCrawlJob(env.DB, "lead_enrichment", "on_demand", 3);
  let urlsCompleted = 0;
  let urlsFailed = 0;
  let recordsCreated = 0;

  // ─── Property Enrichment ───
  if (request.property_address) {
    const normalized = normalizeAddress(request.property_address);

    // Check cache first
    const cached = await getCachedProperty(env.DB, normalized);
    if (cached) {
      propertyData = cached;
      fromCache.property = true;
    } else {
      // Crawl multiple sources and merge
      const sources = [
        { name: "zillow", url: buildZillowUrl(request.property_address) },
        { name: "redfin", url: buildRedfinUrl(request.property_address) },
        { name: "realtor", url: buildRealtorUrl(request.property_address) },
      ];

      const mergedProperty: Record<string, any> = {};
      const dataSources: string[] = [];

      for (const source of sources) {
        try {
          // These sites are JS-heavy, use browser rendering
          const scraped = await scrapeUrl(source.url, env, { timeout: 15_000 });
          if (scraped.error || !scraped.text) {
            errors.push(`${source.name}: ${scraped.error ?? "Empty response"}`);
            urlsFailed++;
            continue;
          }

          const extracted = await extractStructured<Record<string, any>>(
            scraped.text,
            env,
            {
              prompt: PROPERTY_EXTRACTION_PROMPT,
              schema: PROPERTY_EXTRACTION_SCHEMA,
            }
          );

          if (extracted.success && extracted.data) {
            // Merge: first non-null value wins for each field
            for (const [key, value] of Object.entries(extracted.data)) {
              if (value != null && mergedProperty[key] == null) {
                mergedProperty[key] = value;
              }
            }
            dataSources.push(source.name);
            urlsCompleted++;
          } else {
            errors.push(`${source.name} extraction: ${extracted.error}`);
            urlsFailed++;
          }
        } catch (err) {
          errors.push(`${source.name}: ${err instanceof Error ? err.message : "failed"}`);
          urlsFailed++;
        }
      }

      // Save if we got any data
      if (Object.keys(mergedProperty).length > 0) {
        // Validate
        if (
          mergedProperty.estimated_value &&
          !isValidPropertyValue(mergedProperty.estimated_value)
        ) {
          errors.push(
            `Invalid property value: ${mergedProperty.estimated_value}`
          );
          delete mergedProperty.estimated_value;
        }

        // Determine cache TTL based on listing status
        const isActiveListing =
          mergedProperty.listing_status === "Active" ||
          mergedProperty.listing_status === "Pending";
        const cacheExpiry = isActiveListing
          ? addHours(new Date(), 24) // 24h for active listings
          : addDays(new Date(), 7); // 7d for tax/assessment data

        await upsertPropertyEnrichment(env.DB, {
          property_address: request.property_address,
          address_normalized: normalized,
          estimated_value: mergedProperty.estimated_value,
          last_sale_price: mergedProperty.last_sold_price,
          last_sale_date: mergedProperty.last_sold_date,
          tax_annual: mergedProperty.tax_annual,
          tax_assessed_value: mergedProperty.tax_assessed_value,
          bedrooms: mergedProperty.bedrooms,
          bathrooms: mergedProperty.bathrooms,
          sqft: mergedProperty.sqft,
          lot_size_acres: mergedProperty.lot_size,
          year_built: mergedProperty.year_built,
          property_type: mergedProperty.property_type,
          listing_status: mergedProperty.listing_status,
          listing_price: mergedProperty.listing_price,
          days_on_market: mergedProperty.days_on_market,
          hoa_monthly: mergedProperty.hoa_monthly,
          data_sources: dataSources,
          crawl_job_id: jobId,
          cache_expires_at: cacheExpiry,
        });

        propertyData = mergedProperty;
        recordsCreated++;
      }
    }
  }

  // ─── Person Enrichment ───
  if (request.linkedin_url || request.full_name) {
    const cached = await getCachedPerson(env.DB, request.lead_id);
    if (cached) {
      personData = cached;
      fromCache.person = true;
    } else if (request.linkedin_url) {
      try {
        // LinkedIn public profiles often need browser rendering
        const scraped = await scrapeUrl(request.linkedin_url, env, {
          timeout: 15_000,
        });

        if (scraped.text) {
          const extracted = await extractStructured<{
            job_title?: string;
            employer?: string;
            tenure_years?: number;
            education?: string;
            estimated_income_bracket?: string;
          }>(scraped.text, env, { prompt: PERSON_EXTRACTION_PROMPT });

          if (extracted.success && extracted.data) {
            personData = extracted.data;

            // Save to DB
            const { uuid } = await import("../utils/helpers");
            await env.DB
              .prepare(
                `INSERT INTO person_enrichments
                 (id, lead_id, full_name, job_title, employer, employment_tenure_years,
                  estimated_income_bracket, education_level, data_sources,
                  crawl_job_id, crawled_at, cache_expires_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
              )
              .bind(
                uuid(),
                request.lead_id,
                request.full_name,
                extracted.data.job_title ?? null,
                extracted.data.employer ?? null,
                extracted.data.tenure_years ?? null,
                extracted.data.estimated_income_bracket ?? null,
                extracted.data.education ?? null,
                JSON.stringify(["linkedin"]),
                jobId,
                now(),
                addDays(new Date(), 30) // 30-day cache for person data
              )
              .run();

            recordsCreated++;
            urlsCompleted++;
          }
        }
      } catch (err) {
        errors.push(
          `LinkedIn enrichment: ${err instanceof Error ? err.message : "failed"}`
        );
        urlsFailed++;
      }
    }
  }

  // ─── Generate AI Lead Brief (bonus — uses Workers AI) ───
  // This is the "one-paragraph lead brief" from the Cloudflare advantages doc
  let leadBrief: string | null = null;
  if (propertyData || personData) {
    try {
      const briefResponse = await env.AI.run(
        "@cf/meta/llama-3.1-8b-instruct" as any,
        {
          messages: [
            {
              role: "system",
              content:
                "You are a mortgage broker's assistant. Generate a concise 2-3 sentence lead brief summarizing what we know about this potential borrower. Be direct and actionable.",
            },
            {
              role: "user",
              content: `Lead: ${request.full_name}
Property: ${JSON.stringify(propertyData ?? "Unknown")}
Person: ${JSON.stringify(personData ?? "Unknown")}

Generate a brief lead summary for the broker.`,
            },
          ],
          max_tokens: 200,
          temperature: 0.3,
        }
      );

      leadBrief =
        typeof briefResponse === "string"
          ? briefResponse
          : (briefResponse as any)?.response ?? null;
    } catch {
      // Non-critical — lead brief is a bonus feature
    }
  }

  // Finalize job
  const creditsUsed = urlsCompleted + 1; // +1 for the AI brief
  await updateCrawlJob(env.DB, jobId, {
    status: urlsFailed > urlsCompleted ? "partial" : "completed",
    urls_completed: urlsCompleted,
    urls_failed: urlsFailed,
    credits_used: creditsUsed,
    records_created: recordsCreated,
    error_log: errors.length > 0 ? errors.join("\n") : undefined,
  });

  await logCredits(env.DB, jobId, "lead_enrichment", creditsUsed);

  // Push enrichment back to Convex if the caller provided IDs.
  // Missing IDs means the worker was invoked without a CRM context,
  // in which case the D1 cache is the only destination.
  if (propertyData && request.convex_loan_id) {
    const result = await syncPropertyEnrichmentToConvex(env, {
      loanId: request.convex_loan_id,
      estimatedValue: propertyData.estimated_value ?? undefined,
      lastSalePrice: propertyData.last_sold_price ?? undefined,
      bedrooms: propertyData.bedrooms ?? undefined,
      bathrooms: propertyData.bathrooms ?? undefined,
      sqft: propertyData.sqft ?? undefined,
      yearBuilt: propertyData.year_built ?? undefined,
      taxAnnual: propertyData.tax_annual ?? undefined,
    });
    if (!result.success) {
      errors.push(`Convex property sync: ${result.errors.join("; ")}`);
    }
  }
  if (personData && request.convex_contact_id) {
    const result = await syncContactEnrichmentToConvex(env, {
      contactId: request.convex_contact_id,
      jobTitle: personData.job_title ?? undefined,
      employer: personData.employer ?? undefined,
      estimatedIncomeBracket: personData.estimated_income_bracket ?? undefined,
      linkedinUrl: request.linkedin_url,
    });
    if (!result.success) {
      errors.push(`Convex contact sync: ${result.errors.join("; ")}`);
    }
  }

  return {
    jobId,
    property: propertyData,
    person: personData,
    fromCache,
    errors,
  };
}
