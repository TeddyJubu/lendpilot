/**
 * Lender Discovery Task
 *
 * Runs the web-agent with the discover-rate-sources skill to autonomously find
 * new wholesale TPO portals. Results are validated with Zod and posted to the
 * mortgage-data-engine Worker for review.
 *
 * Expected runtime: 60-180 seconds (multiple searches + site visits).
 * Run frequency: weekly (Wednesday cron in mortgage-data-engine).
 */

import { z } from "zod";
import { getAgent, SKILLS } from "../agent.js";
import {
  ingestDiscoveredLenders,
  type DiscoveredLender,
} from "../lib/lendpilot-client.js";

const DiscoveredLenderSchema = z.object({
  name: z.string().min(2),
  type: z.enum(["wholesale", "retail", "credit_union", "online"]).default("wholesale"),
  tpo_portal_url: z.string().url().optional().catch(undefined),
  nmls_id: z.string().optional(),
  requires_auth: z.boolean().default(false),
  confidence_score: z.number().min(0).max(1),
  discovery_notes: z.string().optional(),
});

const AgentOutputSchema = z.object({
  discovered_lenders: z.array(DiscoveredLenderSchema),
  sources_checked: z.array(z.string()).default([]),
  search_date: z.string().optional(),
});

export interface LenderDiscoveryResult {
  task_id: string;
  lenders_found: number;
  lenders_ingested: number;
  sources_checked: string[];
  errors: string[];
  duration_ms: number;
}

export async function runLenderDiscovery(
  task_id: string
): Promise<LenderDiscoveryResult> {
  const startedAt = Date.now();
  const errors: string[] = [];

  const prompt = buildPrompt();

  let agentOutput: z.infer<typeof AgentOutputSchema>;

  try {
    const agent = getAgent();
    const result = await agent.run({ prompt });

    // Agent returns free-form text — extract the JSON block
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
      lenders_found: 0,
      lenders_ingested: 0,
      sources_checked: [],
      errors,
      duration_ms: Date.now() - startedAt,
    };
  }

  // Filter: wholesale only (skill target) and above confidence threshold
  const qualifiedLenders: DiscoveredLender[] = agentOutput.discovered_lenders
    .filter((l) => l.type === "wholesale" && l.confidence_score >= 0.5)
    .map((l) => ({
      name: l.name,
      type: l.type,
      tpo_portal_url: l.tpo_portal_url,
      nmls_id: l.nmls_id,
      requires_auth: l.requires_auth,
      confidence_score: l.confidence_score,
      discovery_notes: l.discovery_notes,
    }));

  let ingested = 0;

  if (qualifiedLenders.length > 0) {
    try {
      const ingestResult = await ingestDiscoveredLenders({
        lenders: qualifiedLenders,
        task_id,
        sources_checked: agentOutput.sources_checked,
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
    lenders_found: agentOutput.discovered_lenders.length,
    lenders_ingested: ingested,
    sources_checked: agentOutput.sources_checked,
    errors,
    duration_ms: Date.now() - startedAt,
  };
}

function buildPrompt(): string {
  const today = new Date().toISOString().split("T")[0];
  return `Today is ${today}.

${SKILLS.discoverRateSources}

---

Your task: Execute the "Discover Wholesale Mortgage Rate Sources" skill above.

Search for new wholesale mortgage lenders with TPO/broker programs that launched or expanded
in the past 6 months. Focus on lenders NOT already in the LendPilot registry (listed in the
skill under "Check for existing lenders to skip").

After completing your research, output a JSON block (inside triple backticks) with the exact
structure specified in the skill's "Output Format" section. Include all discovered lenders with
confidence >= 0.5. Return an empty array if nothing new was found — do not fabricate results.`;
}
