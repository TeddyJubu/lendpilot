/**
 * Category 4: Down Payment Assistance Programs Crawler (P1)
 *
 * Weekly crawl of 50 state HFA sites + HUD directory.
 * Turns "sorry, you need more down payment" into
 * "actually, you qualify for this program."
 *
 * ~250 credits/month (55 sites × ~2 pages × 4 weeks)
 */

import type { CrawlStatus, Env } from "../types";
import { simpleFetch, scrapeUrl, extractStructured } from "../utils/browser-scraper";
import {
  createCrawlJob,
  updateCrawlJob,
  logCredits,
  getCreditsRemaining,
} from "../db/queries";
import { uuid, now, sleep } from "../utils/helpers";

// ─── DPA Source Registry ───

interface DPASource {
  state: string;
  agency: string;
  url: string;
  needsBrowser: boolean;
}

const DPA_SOURCES: DPASource[] = [
  // National
  { state: "National", agency: "HUD", url: "https://www.hud.gov/topics/buying_a_home", needsBrowser: false },
  { state: "National", agency: "Down Payment Resource", url: "https://downpaymentresource.com/resources/", needsBrowser: true },
  { state: "National", agency: "FHA.com", url: "https://fha.com/grants", needsBrowser: false },

  // Top 20 states by mortgage origination volume
  { state: "CA", agency: "CalHFA", url: "https://www.calhfa.ca.gov/homebuyer/programs/index.htm", needsBrowser: false },
  { state: "TX", agency: "TDHCA", url: "https://www.tdhca.state.tx.us/homeownership/first-time-home-buyer/index.htm", needsBrowser: false },
  { state: "FL", agency: "Florida Housing", url: "https://www.floridahousing.org/programs/homebuyer-overview", needsBrowser: true },
  { state: "NY", agency: "SONYMA", url: "https://hcr.ny.gov/sonyma", needsBrowser: false },
  { state: "PA", agency: "PHFA", url: "https://www.phfa.org/programs/homebuyers.aspx", needsBrowser: false },
  { state: "IL", agency: "IHDA", url: "https://www.ihda.org/my-home/getting-an-ihda-mortgage/", needsBrowser: false },
  { state: "OH", agency: "OHFA", url: "https://ohiohome.org/homebuyer/default.aspx", needsBrowser: false },
  { state: "GA", agency: "Georgia Dream", url: "https://www.dca.ga.gov/safe-affordable-housing/homeownership/georgia-dream", needsBrowser: false },
  { state: "NC", agency: "NCHFA", url: "https://www.nchfa.com/home-buyers", needsBrowser: false },
  { state: "MI", agency: "MSHDA", url: "https://www.michigan.gov/mshda/homeownership", needsBrowser: false },
  { state: "NJ", agency: "NJHMFA", url: "https://www.nj.gov/dca/hmfa/homeownership/buyers/", needsBrowser: false },
  { state: "VA", agency: "VHDA", url: "https://www.vhda.com/Homebuyers/Pages/default.aspx", needsBrowser: false },
  { state: "WA", agency: "WSHFC", url: "https://www.wshfc.org/buyers/", needsBrowser: false },
  { state: "AZ", agency: "Arizona IDA", url: "https://www.azida.gov/housing/home-plus", needsBrowser: false },
  { state: "MA", agency: "MassHousing", url: "https://www.masshousing.com/home-ownership/homebuyers", needsBrowser: true },
  { state: "TN", agency: "THDA", url: "https://thda.org/homebuyers", needsBrowser: false },
  { state: "MD", agency: "Maryland Mortgage", url: "https://mmp.maryland.gov/Pages/default.aspx", needsBrowser: false },
  { state: "CO", agency: "CHFA", url: "https://www.chfainfo.com/homeownership", needsBrowser: false },
  { state: "MN", agency: "Minnesota Housing", url: "https://www.mnhousing.gov/homebuyers.html", needsBrowser: false },
  { state: "WI", agency: "WHEDA", url: "https://www.wheda.com/homeownership", needsBrowser: false },
  { state: "IN", agency: "IHCDA", url: "https://www.in.gov/ihcda/homeowners-and-renters/homebuyers/", needsBrowser: false },
  { state: "SC", agency: "SC Housing", url: "https://www.schousing.com/Home/Homebuyers", needsBrowser: false },
  { state: "OR", agency: "Oregon Housing", url: "https://www.oregon.gov/ohcs/homeownership/pages/default.aspx", needsBrowser: false },
  { state: "MO", agency: "MHDC", url: "https://www.mhdc.com/homes/homebuyers", needsBrowser: false },
];

// ─── Extraction Schema ───

const DPA_EXTRACTION_SCHEMA = {
  type: "object",
  properties: {
    programs: {
      type: "array",
      items: {
        type: "object",
        properties: {
          program_name: { type: "string" },
          assistance_type: { type: "string" },
          max_amount: { type: "string" },
          max_percentage: { type: "string" },
          income_limit: { type: "string" },
          income_limit_type: { type: "string" },
          first_time_buyer_only: { type: "boolean" },
          fico_minimum: { type: "integer" },
          eligible_counties: { type: "string" },
          compatible_loans: { type: "string" },
          status: { type: "string" },
          application_url: { type: "string" },
        },
      },
    },
  },
};

const DPA_EXTRACTION_PROMPT = `Extract ALL down payment assistance (DPA) programs from this page.

For each program, capture:
- program_name: official program name
- assistance_type: one of "grant", "forgivable_loan", "deferred_loan", "matched_savings", "second_mortgage"
- max_amount: maximum dollar amount of assistance (e.g., "$10,000")
- max_percentage: max percentage if applicable (e.g., "5%")
- income_limit: income limit (e.g., "$95,000" or "120% AMI")
- income_limit_type: "household", "individual", or "ami_percentage"
- first_time_buyer_only: true or false
- fico_minimum: minimum credit score required
- eligible_counties: which counties/areas (or "statewide")
- compatible_loans: which loan types work (FHA, VA, Conventional, USDA)
- status: "active", "funds_exhausted", "closed", or "upcoming"
- application_url: link to apply (if shown)

Extract every distinct program on the page. If a single page lists multiple programs, return all of them.`;

// ─── Helper: Parse DPA amounts ───

function parseDollarAmount(str: string | undefined): number | null {
  if (!str) return null;
  const match = str.replace(/,/g, "").match(/\$?([\d.]+)/);
  return match ? Math.round(parseFloat(match[1])) : null;
}

function parsePercentage(str: string | undefined): number | null {
  if (!str) return null;
  const match = str.match(/([\d.]+)%/);
  return match ? parseFloat(match[1]) / 100 : null;
}

function parseAssistanceType(raw: string): string {
  const lower = raw.toLowerCase();
  if (lower.includes("grant")) return "grant";
  if (lower.includes("forgivable")) return "forgivable_loan";
  if (lower.includes("deferred")) return "deferred_loan";
  if (lower.includes("matched") || lower.includes("savings")) return "matched_savings";
  if (lower.includes("second") || lower.includes("subordinate")) return "second_mortgage";
  return "grant"; // default
}

// ─── Main Crawl Function ───

export async function crawlDPAPrograms(env: Env): Promise<{
  jobId: string;
  success: boolean;
  recordsCreated: number;
  recordsUpdated: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let recordsCreated = 0;
  let recordsUpdated = 0;
  let urlsCompleted = 0;
  let urlsFailed = 0;

  // Credit check
  const creditsRemaining = await getCreditsRemaining(env.DB);
  if (creditsRemaining < 60) {
    return {
      jobId: "",
      success: false,
      recordsCreated: 0,
      recordsUpdated: 0,
      errors: ["Insufficient credits: " + creditsRemaining],
    };
  }

  const jobId = await createCrawlJob(
    env.DB,
    "dpa_programs",
    "scheduled",
    DPA_SOURCES.length
  );

  for (const source of DPA_SOURCES) {
    try {
      const scraped = source.needsBrowser
        ? await scrapeUrl(source.url, env, { timeout: 20_000 })
        : await simpleFetch(source.url);

      if (scraped.error || !scraped.text) {
        errors.push(`${source.state} (${source.agency}): ${scraped.error ?? "Empty"}`);
        urlsFailed++;
        continue;
      }

      const extracted = await extractStructured<{
        programs: Array<{
          program_name: string;
          assistance_type: string;
          max_amount?: string;
          max_percentage?: string;
          income_limit?: string;
          income_limit_type?: string;
          first_time_buyer_only?: boolean;
          fico_minimum?: number;
          eligible_counties?: string;
          compatible_loans?: string;
          status?: string;
          application_url?: string;
        }>;
      }>(scraped.text, env, {
        prompt: DPA_EXTRACTION_PROMPT,
        schema: DPA_EXTRACTION_SCHEMA,
      });

      if (!extracted.success || !extracted.data?.programs?.length) {
        errors.push(
          `${source.state}: extraction failed — ${extracted.error ?? "no programs found"}`
        );
        urlsFailed++;
        continue;
      }

      // Upsert each program
      for (const program of extracted.data.programs) {
        if (!program.program_name) continue;

        const programId = `dpa_${source.state.toLowerCase()}_${program.program_name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "_")
          .slice(0, 50)}`;

        // Check if program already exists
        const existing = await env.DB
          .prepare(`SELECT id FROM dpa_programs WHERE id = ?`)
          .bind(programId)
          .first();

        const compatibleLoans = program.compatible_loans
          ? program.compatible_loans.split(/[,;/]/).map((s) => s.trim())
          : [];

        const eligibleCounties = program.eligible_counties
          ? program.eligible_counties.toLowerCase().includes("statewide")
            ? []
            : program.eligible_counties.split(/[,;]/).map((s) => s.trim())
          : [];

        if (existing) {
          // Update existing program
          await env.DB
            .prepare(
              `UPDATE dpa_programs SET
                assistance_amount_max = ?,
                assistance_percentage_max = ?,
                income_limit = ?,
                income_limit_type = ?,
                first_time_buyer_required = ?,
                fico_minimum = ?,
                counties_eligible = ?,
                loan_types_compatible = ?,
                program_status = ?,
                application_url = ?,
                last_verified = ?,
                source_url = ?,
                crawl_job_id = ?
              WHERE id = ?`
            )
            .bind(
              parseDollarAmount(program.max_amount),
              parsePercentage(program.max_percentage),
              parseDollarAmount(program.income_limit),
              program.income_limit_type ?? "household",
              program.first_time_buyer_only ? 1 : 0,
              program.fico_minimum ?? null,
              JSON.stringify(eligibleCounties),
              JSON.stringify(compatibleLoans),
              program.status ?? "active",
              program.application_url ?? null,
              now(),
              source.url,
              jobId,
              programId
            )
            .run();
          recordsUpdated++;
        } else {
          // Insert new program
          await env.DB
            .prepare(
              `INSERT INTO dpa_programs
               (id, program_name, state, administering_agency, assistance_type,
                assistance_amount_max, assistance_percentage_max, income_limit,
                income_limit_type, first_time_buyer_required, property_types_eligible,
                counties_eligible, fico_minimum, max_purchase_price,
                loan_types_compatible, application_url, program_status,
                last_verified, source_url, crawl_job_id)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
            )
            .bind(
              programId,
              program.program_name,
              source.state,
              source.agency,
              parseAssistanceType(program.assistance_type),
              parseDollarAmount(program.max_amount),
              parsePercentage(program.max_percentage),
              parseDollarAmount(program.income_limit),
              program.income_limit_type ?? "household",
              program.first_time_buyer_only ? 1 : 0,
              JSON.stringify([]),  // property_types_eligible — future enhancement
              JSON.stringify(eligibleCounties),
              program.fico_minimum ?? null,
              null, // max_purchase_price — varies
              JSON.stringify(compatibleLoans),
              program.application_url ?? null,
              program.status ?? "active",
              now(),
              source.url,
              jobId
            )
            .run();
          recordsCreated++;
        }
      }

      urlsCompleted++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      errors.push(`${source.state} (${source.agency}): ${msg}`);
      urlsFailed++;
    }

    // Polite delay between requests
    await sleep(1500);
  }

  // Finalize
  const creditsUsed = DPA_SOURCES.length;
  const status = (urlsFailed > DPA_SOURCES.length * 0.3
    ? "partial"
    : "completed") as CrawlStatus;

  await updateCrawlJob(env.DB, jobId, {
    status,
    urls_completed: urlsCompleted,
    urls_failed: urlsFailed,
    credits_used: creditsUsed,
    records_created: recordsCreated,
    records_updated: recordsUpdated,
    error_log: errors.length > 0 ? errors.join("\n") : undefined,
  });

  await logCredits(env.DB, jobId, "dpa_programs", creditsUsed);

  return { jobId, success: status !== "failed", recordsCreated, recordsUpdated, errors };
}
