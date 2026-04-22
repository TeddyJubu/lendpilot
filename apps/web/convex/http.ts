/**
 * Ingestion endpoints for the Cloudflare mortgage-data-engine worker.
 *
 * Auth: every request must include `Authorization: Bearer <secret>`
 *   matching CONVEX_INGESTION_SECRET (set via `npx convex env set`).
 *
 * Endpoints:
 *   POST /ingestRates                — batch upsert of rate snapshots
 *   POST /ingestPropertyEnrichment   — patch a loan's propertyEnrichment
 *   POST /ingestContactEnrichment    — patch a contact's enrichment
 *
 * Each endpoint also accepts an optional `syncMeta` block so the worker
 * can report per-batch stats that land in the syncLog table in a single
 * round-trip.
 */

import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

const http = httpRouter();

// ── Auth helper ──────────────────────────────────────────────────

function checkAuth(request: Request): Response | null {
  const expected = process.env.CONVEX_INGESTION_SECRET;
  if (!expected) {
    return jsonResponse({ error: "Ingestion secret not configured" }, 500);
  }
  const auth = request.headers.get("Authorization") ?? "";
  if (auth !== `Bearer ${expected}`) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }
  return null;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const MAX_RECORDS_PER_BATCH = 100;

// ── Rates ingestion ─────────────────────────────────────────────

http.route({
  path: "/ingestRates",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const authError = checkAuth(request);
    if (authError) return authError;

    const startedAt = Date.now();
    let payload: any;
    try {
      payload = await request.json();
    } catch {
      return jsonResponse({ error: "Invalid JSON" }, 400);
    }

    const records = Array.isArray(payload?.records) ? payload.records : null;
    if (!records) {
      return jsonResponse({ error: "Missing `records` array" }, 400);
    }
    if (records.length > MAX_RECORDS_PER_BATCH) {
      return jsonResponse(
        { error: `Batch too large (max ${MAX_RECORDS_PER_BATCH})` },
        413
      );
    }

    const result = await ctx.runMutation(
      internal.rates.internals.batchUpsertRates,
      { records }
    );

    const source = payload.syncMeta?.source ?? "rates";
    await ctx.runMutation(internal.core.internals.recordSyncBatch, {
      source,
      recordsProcessed: records.length,
      recordsCreated: result.created,
      recordsUpdated: 0,
      recordsSkipped: result.skipped,
      errors: payload.syncMeta?.errors ?? [],
      durationMs: Date.now() - startedAt,
    });

    return jsonResponse({
      success: true,
      created: result.created,
      skipped: result.skipped,
    });
  }),
});

// ── Property enrichment ingestion ───────────────────────────────

http.route({
  path: "/ingestPropertyEnrichment",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const authError = checkAuth(request);
    if (authError) return authError;

    const startedAt = Date.now();
    let payload: any;
    try {
      payload = await request.json();
    } catch {
      return jsonResponse({ error: "Invalid JSON" }, 400);
    }

    if (typeof payload?.loanId !== "string") {
      return jsonResponse({ error: "Missing `loanId`" }, 400);
    }

    const result = await ctx.runMutation(
      internal.loans.internals.patchPropertyEnrichment,
      {
        loanId: payload.loanId,
        estimatedValue: payload.estimatedValue,
        lastSalePrice: payload.lastSalePrice,
        bedrooms: payload.bedrooms,
        bathrooms: payload.bathrooms,
        sqft: payload.sqft,
        yearBuilt: payload.yearBuilt,
        taxAnnual: payload.taxAnnual,
      }
    );

    await ctx.runMutation(internal.core.internals.recordSyncBatch, {
      source: "property_enrichment",
      recordsProcessed: 1,
      recordsCreated: 0,
      recordsUpdated: result.updated ? 1 : 0,
      recordsSkipped: result.updated ? 0 : 1,
      errors: [],
      durationMs: Date.now() - startedAt,
    });

    return jsonResponse({ success: true, updated: result.updated });
  }),
});

// ── Contact enrichment ingestion ────────────────────────────────

http.route({
  path: "/ingestContactEnrichment",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const authError = checkAuth(request);
    if (authError) return authError;

    const startedAt = Date.now();
    let payload: any;
    try {
      payload = await request.json();
    } catch {
      return jsonResponse({ error: "Invalid JSON" }, 400);
    }

    if (typeof payload?.contactId !== "string") {
      return jsonResponse({ error: "Missing `contactId`" }, 400);
    }

    const result = await ctx.runMutation(
      internal.contacts.internals.patchEnrichment,
      {
        contactId: payload.contactId,
        jobTitle: payload.jobTitle,
        employer: payload.employer,
        estimatedIncomeBracket: payload.estimatedIncomeBracket,
        linkedinUrl: payload.linkedinUrl,
      }
    );

    await ctx.runMutation(internal.core.internals.recordSyncBatch, {
      source: "contact_enrichment",
      recordsProcessed: 1,
      recordsCreated: 0,
      recordsUpdated: result.updated ? 1 : 0,
      recordsSkipped: result.updated ? 0 : 1,
      errors: [],
      durationMs: Date.now() - startedAt,
    });

    return jsonResponse({ success: true, updated: result.updated });
  }),
});

export default http;
