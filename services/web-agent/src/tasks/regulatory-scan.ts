/**
 * Regulatory Scan Task
 *
 * Runs the web-agent with the scan-regulatory-landscape skill to surface
 * guideline changes and market updates missed by the structured regulatory crawler.
 *
 * Expected runtime: 90-240 seconds (7+ sources, deep reading).
 * Run frequency: weekly (Thursday cron in mortgage-data-engine).
 */

import { z } from "zod";
import { getAgent, SKILLS } from "../agent.js";
import {
  ingestRegulatoryFindings,
  type RegulatoryFinding,
} from "../lib/lendpilot-client.js";

const RegulatoryFindingSchema = z.object({
  title: z.string().min(5),
  source: z.string(),
  document_type: z.string(),
  summary: z.string().min(10),
  published_date: z.string(),
  effective_date: z.string().optional(),
  affects_loan_types: z.array(z.string()).default([]),
  affects_states: z.array(z.string()).default([]),
  url: z.string().optional().catch(undefined),
  relevance_score: z.number().int().min(1).max(10),
  broker_impact: z.string().min(10),
});

const AgentOutputSchema = z.object({
  regulatory_findings: z.array(RegulatoryFindingSchema),
  sources_checked: z.array(z.string()).default([]),
  scan_date: z.string().optional(),
  total_sources_scanned: z.number().default(0),
});

export interface RegulatoryScanResult {
  task_id: string;
  findings_found: number;
  findings_ingested: number;
  high_priority_count: number;
  sources_checked: string[];
  errors: string[];
  duration_ms: number;
}

export async function runRegulatoryScan(
  task_id: string
): Promise<RegulatoryScanResult> {
  const startedAt = Date.now();
  const errors: string[] = [];

  const prompt = buildPrompt();

  let agentOutput: z.infer<typeof AgentOutputSchema>;

  try {
    const agent = getAgent();
    const result = await agent.run({ prompt });

    const raw =
      typeof result === "string"
        ? result
        : (result as any)?.text ?? JSON.stringify(result);

    const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/) ??
      raw.match(/(\{[\s\S]*\})/);

    if (!jsonMatch?.[1]) {
      throw new Error("Agent returned no JSON block");
    }

    const parsed = JSON.parse(jsonMatch[1]);
    agentOutput = AgentOutputSchema.parse(parsed);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    errors.push(`Agent execution failed: ${msg}`);
    return {
      task_id,
      findings_found: 0,
      findings_ingested: 0,
      high_priority_count: 0,
      sources_checked: [],
      errors,
      duration_ms: Date.now() - startedAt,
    };
  }

  // Only ingest items with relevance >= 5 (skill already filters, but double-check)
  const qualifiedFindings: RegulatoryFinding[] =
    agentOutput.regulatory_findings
      .filter((f) => f.relevance_score >= 5)
      .map((f) => ({
        title: f.title,
        source: f.source,
        document_type: f.document_type,
        summary: f.summary,
        published_date: f.published_date,
        effective_date: f.effective_date,
        affects_loan_types: f.affects_loan_types,
        affects_states: f.affects_states,
        url: f.url,
        relevance_score: f.relevance_score,
        broker_impact: f.broker_impact,
      }));

  const highPriorityCount = qualifiedFindings.filter(
    (f) => f.relevance_score >= 8
  ).length;

  let ingested = 0;

  if (qualifiedFindings.length > 0) {
    try {
      const ingestResult = await ingestRegulatoryFindings({
        findings: qualifiedFindings,
        task_id,
        sources_checked: agentOutput.sources_checked,
        total_sources_scanned: agentOutput.total_sources_scanned,
      });
      ingested = ingestResult.records_created;
      if (ingestResult.errors.length > 0) {
        errors.push(...ingestResult.errors);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`Ingest failed: ${msg}`);
    }
  }

  return {
    task_id,
    findings_found: agentOutput.regulatory_findings.length,
    findings_ingested: ingested,
    high_priority_count: highPriorityCount,
    sources_checked: agentOutput.sources_checked,
    errors,
    duration_ms: Date.now() - startedAt,
  };
}

function buildPrompt(): string {
  const today = new Date().toISOString().split("T")[0];
  // Lookback window: 45 days to catch anything the daily crawler missed
  const lookbackDate = new Date(Date.now() - 45 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  return `Today is ${today}. Only include regulatory updates published after ${lookbackDate}.

${SKILLS.scanRegulatoryLandscape}

---

Your task: Execute the "Scan Regulatory Landscape" skill above.

Research all regulatory sources listed in the skill. Find updates published in the last 45 days
that affect mortgage broker operations. Prioritize:
1. Loan limit changes (conforming, FHA, VA)
2. Underwriting guideline updates from Fannie/Freddie/FHA/VA
3. New compliance requirements
4. DPA program changes that affect eligibility

After completing your research, output a JSON block (inside triple backticks) with the exact
structure from the skill's "Output Format" section. Only include items with relevance_score >= 5.
Return an empty array if nothing material was found — do not fabricate findings.`;
}
