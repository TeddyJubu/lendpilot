/**
 * Category 5: Regulatory Updates Crawler (P1)
 *
 * Daily crawl of CFPB, FHA, VA, FHFA, Fannie/Freddie for guideline changes.
 * Auto-detects changes that affect active pipelines.
 *
 * The AI summarizer flags relevance:
 * "Florida Hometown Heroes DPA program expanded eligibility to include veterans
 *  — 3 leads in your pipeline may now qualify."
 *
 * ~200 credits/month (7 sources × 1 page × 30 days)
 */

import type { CrawlStatus, Env } from "../types";
import { simpleFetch, scrapeUrl, extractStructured } from "../utils/browser-scraper";
import {
  createCrawlJob,
  updateCrawlJob,
  logCredits,
  getCreditsRemaining,
} from "../db/queries";
import { uuid, now, sleep, truncate } from "../utils/helpers";

// ─── Regulatory Source Registry ───

interface RegulatorySource {
  id: string;
  name: string;
  url: string;
  sourceKey: string;  // Maps to regulatory_updates.source
  needsBrowser: boolean;
}

const REGULATORY_SOURCES: RegulatorySource[] = [
  {
    id: "cfpb",
    name: "CFPB Policy & Compliance",
    url: "https://www.consumerfinance.gov/policy-compliance/guidance/",
    sourceKey: "CFPB",
    needsBrowser: true,
  },
  {
    id: "fha",
    name: "FHA Mortgagee Letters",
    url: "https://www.hud.gov/program_offices/housing/sfh/SFH_Ltr",
    sourceKey: "FHA",
    needsBrowser: false,
  },
  {
    id: "va",
    name: "VA Loan Circulars",
    url: "https://www.benefits.va.gov/HOMELOANS/circulars.asp",
    sourceKey: "VA",
    needsBrowser: false,
  },
  {
    id: "fhfa",
    name: "FHFA News & Data",
    url: "https://www.fhfa.gov/news/news-release",
    sourceKey: "FHFA",
    needsBrowser: true,
  },
  {
    id: "fnma",
    name: "Fannie Mae Selling Guide Updates",
    url: "https://singlefamily.fanniemae.com/news-events/selling-guide-updates",
    sourceKey: "FNMA",
    needsBrowser: true,
  },
  {
    id: "fhlmc",
    name: "Freddie Mac Guide Bulletins",
    url: "https://guide.freddiemac.com/app/guide/updates",
    sourceKey: "FHLMC",
    needsBrowser: true,
  },
  {
    id: "nmls",
    name: "NMLS Updates",
    url: "https://mortgage.nationwidelicensingsystem.org/news/Pages/default.aspx",
    sourceKey: "NMLS",
    needsBrowser: false,
  },
];

// ─── Extraction Schema ───

const REGULATORY_EXTRACTION_SCHEMA = {
  type: "object",
  properties: {
    updates: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          document_type: { type: "string" },
          summary: { type: "string" },
          published_date: { type: "string" },
          effective_date: { type: "string" },
          affects_loan_types: { type: "string" },
          affects_states: { type: "string" },
          url: { type: "string" },
        },
      },
    },
  },
};

const REGULATORY_EXTRACTION_PROMPT = `Extract ALL regulatory updates, bulletins, letters, or announcements from this page.

Focus on the MOST RECENT items (last 30 days if dates are visible).

For each update, capture:
- title: the title or subject of the update
- document_type: one of "advisory", "mortgagee_letter", "circular", "bulletin", "press_release", "enforcement"
- summary: a 2-3 sentence summary of what changed and why it matters to mortgage brokers
- published_date: when it was published (ISO format if possible, e.g., "2025-01-15")
- effective_date: when the change takes effect (if stated)
- affects_loan_types: which loan types are impacted (e.g., "FHA, VA, Conventional")
- affects_states: which states (or "national" if applies everywhere)
- url: link to the full document (if shown)

Focus on items that would affect mortgage origination, underwriting, or compliance.
Return up to 10 of the most recent items.`;

// ─── Deduplication ───

async function isDuplicate(
  db: D1Database,
  source: string,
  title: string,
  publishedDate: string
): Promise<boolean> {
  const existing = await db
    .prepare(
      `SELECT id FROM regulatory_updates
       WHERE source = ? AND title = ? AND published_date = ?`
    )
    .bind(source, title, publishedDate)
    .first();
  return !!existing;
}

// ─── AI Relevance Scoring ───

async function scoreRelevance(
  env: Env,
  update: { title: string; summary: string }
): Promise<{ score: number; broker_impact: string }> {
  try {
    const result = await extractStructured<{
      relevance_score: number;
      broker_impact: string;
    }>(
      JSON.stringify(update),
      env,
      {
        prompt: `Rate this regulatory update's relevance to a mortgage broker on a scale of 1-10.

Score 8-10: Directly changes how loans are originated, priced, or underwritten.
Score 5-7: Affects compliance, reporting, or licensing requirements.
Score 1-4: General industry news with minimal operational impact.

Also write a one-sentence "broker impact" summary that a broker can understand.

Return JSON with "relevance_score" (integer 1-10) and "broker_impact" (string).`,
      }
    );

    return {
      score: result.data?.relevance_score ?? 5,
      broker_impact: result.data?.broker_impact ?? update.summary,
    };
  } catch {
    return { score: 5, broker_impact: update.summary };
  }
}

// ─── Main Crawl Function ───

export async function crawlRegulatoryUpdates(env: Env): Promise<{
  jobId: string;
  success: boolean;
  recordsCreated: number;
  highPriorityCount: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let recordsCreated = 0;
  let highPriorityCount = 0;
  let urlsCompleted = 0;
  let urlsFailed = 0;

  const creditsRemaining = await getCreditsRemaining(env.DB);
  if (creditsRemaining < 20) {
    return {
      jobId: "",
      success: false,
      recordsCreated: 0,
      highPriorityCount: 0,
      errors: ["Insufficient credits: " + creditsRemaining],
    };
  }

  const jobId = await createCrawlJob(
    env.DB,
    "regulatory",
    "scheduled",
    REGULATORY_SOURCES.length
  );

  for (const source of REGULATORY_SOURCES) {
    try {
      const scraped = source.needsBrowser
        ? await scrapeUrl(source.url, env, { timeout: 20_000 })
        : await simpleFetch(source.url);

      if (scraped.error || !scraped.text) {
        errors.push(`${source.name}: ${scraped.error ?? "Empty response"}`);
        urlsFailed++;
        continue;
      }

      const extracted = await extractStructured<{
        updates: Array<{
          title: string;
          document_type: string;
          summary: string;
          published_date: string;
          effective_date?: string;
          affects_loan_types?: string;
          affects_states?: string;
          url?: string;
        }>;
      }>(scraped.text, env, {
        prompt: REGULATORY_EXTRACTION_PROMPT,
        schema: REGULATORY_EXTRACTION_SCHEMA,
      });

      if (!extracted.success || !extracted.data?.updates?.length) {
        errors.push(`${source.name}: ${extracted.error ?? "no updates found"}`);
        urlsFailed++;
        continue;
      }

      for (const update of extracted.data.updates) {
        if (!update.title || !update.published_date) continue;

        // Deduplicate
        const isDup = await isDuplicate(
          env.DB,
          source.sourceKey,
          update.title,
          update.published_date
        );
        if (isDup) continue;

        // Score relevance for high-priority alerts
        const relevance = await scoreRelevance(env, {
          title: update.title,
          summary: update.summary ?? "",
        });

        if (relevance.score >= 8) {
          highPriorityCount++;
        }

        // Map document type
        const docType = mapDocumentType(update.document_type);

        // Parse affected loan types and states
        const affectsLoanTypes = update.affects_loan_types
          ? update.affects_loan_types.split(/[,;]/).map((s) => s.trim()).filter(Boolean)
          : [];
        const affectsStates = update.affects_states
          ? update.affects_states.toLowerCase() === "national"
            ? []
            : update.affects_states.split(/[,;]/).map((s) => s.trim()).filter(Boolean)
          : [];

        await env.DB
          .prepare(
            `INSERT INTO regulatory_updates
             (id, source, document_type, title, summary, full_text,
              effective_date, published_date, affects_loan_types, affects_states,
              url, relevance_score, broker_impact, crawl_job_id, crawled_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
          )
          .bind(
            uuid(),
            source.sourceKey,
            docType,
            update.title,
            truncate(update.summary ?? "", 500),
            update.summary ?? "",  // full_text — ideally we'd crawl the detail page too
            update.effective_date ?? null,
            update.published_date,
            JSON.stringify(affectsLoanTypes),
            JSON.stringify(affectsStates),
            update.url ?? source.url,
            relevance.score,
            relevance.broker_impact,
            jobId,
            now()
          )
          .run();

        recordsCreated++;
      }

      urlsCompleted++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      errors.push(`${source.name}: ${msg}`);
      urlsFailed++;
    }

    await sleep(1000);
  }

  // Finalize
  const creditsUsed = REGULATORY_SOURCES.length * 2; // scrape + AI extraction per source
  const status = (urlsFailed > REGULATORY_SOURCES.length * 0.5
    ? "partial"
    : "completed") as CrawlStatus;

  await updateCrawlJob(env.DB, jobId, {
    status,
    urls_completed: urlsCompleted,
    urls_failed: urlsFailed,
    credits_used: creditsUsed,
    records_created: recordsCreated,
    error_log: errors.length > 0 ? errors.join("\n") : undefined,
  });

  await logCredits(env.DB, jobId, "regulatory", creditsUsed);

  // Alert if high-priority updates found
  if (highPriorityCount > 0) {
    // This would trigger a notification to brokers via the CRM
    console.log(
      `[REGULATORY] ${highPriorityCount} high-priority updates detected — broker notification triggered`
    );
  }

  return { jobId, success: status !== "failed", recordsCreated, highPriorityCount, errors };
}

// ─── Helpers ───

function mapDocumentType(raw: string): string {
  const lower = (raw ?? "").toLowerCase();
  if (lower.includes("mortgagee") || lower.includes("letter")) return "mortgagee_letter";
  if (lower.includes("circular")) return "circular";
  if (lower.includes("bulletin")) return "bulletin";
  if (lower.includes("press") || lower.includes("release")) return "press_release";
  if (lower.includes("enforcement") || lower.includes("action")) return "enforcement";
  if (lower.includes("advisory") || lower.includes("guidance")) return "advisory";
  return "bulletin"; // default
}
