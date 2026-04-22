/**
 * HTTP client for posting web-agent results back to the mortgage-data-engine Worker.
 *
 * The Worker API uses X-API-Key auth (same key used for manual crawl triggers).
 */

export interface DiscoveredLender {
  name: string;
  type: "wholesale" | "retail" | "credit_union" | "online";
  tpo_portal_url?: string;
  nmls_id?: string;
  requires_auth: boolean;
  confidence_score: number;
  discovery_notes?: string;
}

export interface RegulatoryFinding {
  title: string;
  source: string;
  document_type: string;
  summary: string;
  published_date: string;
  effective_date?: string;
  affects_loan_types: string[];
  affects_states: string[];
  url?: string;
  relevance_score: number;
  broker_impact: string;
}

export interface IngestLendersPayload {
  lenders: DiscoveredLender[];
  task_id: string;
  sources_checked: string[];
}

export interface IngestRegulatoryPayload {
  findings: RegulatoryFinding[];
  task_id: string;
  sources_checked: string[];
  total_sources_scanned: number;
}

export interface IngestResult {
  success: boolean;
  records_created: number;
  records_skipped: number;
  errors: string[];
}

function workerUrl(path: string): string {
  const base = process.env.LENDPILOT_WORKER_URL?.trim();
  if (!base) {
    throw new Error("Missing required environment variable: LENDPILOT_WORKER_URL");
  }
  return `${base.replace(/\/$/, "")}${path}`;
}

function workerHeaders(): Record<string, string> {
  const apiKey = process.env.LENDPILOT_WORKER_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("Missing required environment variable: LENDPILOT_WORKER_API_KEY");
  }
  return {
    "Content-Type": "application/json",
    "X-API-Key": apiKey,
  };
}

export async function ingestDiscoveredLenders(
  payload: IngestLendersPayload
): Promise<IngestResult> {
  const res = await fetch(workerUrl("/api/agent/ingest-lenders"), {
    method: "POST",
    headers: workerHeaders(),
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`Worker rejected lender ingest: ${res.status} — ${text}`);
  }

  return res.json() as Promise<IngestResult>;
}

export async function ingestRegulatoryFindings(
  payload: IngestRegulatoryPayload
): Promise<IngestResult> {
  const res = await fetch(workerUrl("/api/agent/ingest-regulatory"), {
    method: "POST",
    headers: workerHeaders(),
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(
      `Worker rejected regulatory ingest: ${res.status} — ${text}`
    );
  }

  return res.json() as Promise<IngestResult>;
}
